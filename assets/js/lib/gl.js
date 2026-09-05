/* ==========================================================================
   WebGL engine layer
   A single requestAnimationFrame ticker drives every scene on the page.
   Stages pause themselves when scrolled out of view.
   ========================================================================== */

import * as THREE from "three";

export const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------- Capability */
let webglOk = null;

export function hasWebGL() {
  if (webglOk !== null) return webglOk;
  try {
    const canvas = document.createElement("canvas");
    webglOk = !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    webglOk = false;
  }
  return webglOk;
}

/* ----------------------------------------------------------------- Ticker */
class Ticker {
  constructor() {
    this.subs = new Set();
    this.clock = new THREE.Clock();
    this.running = false;
    this.frame = 0;
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.stop();
      else this.start();
    });
  }

  add(fn) {
    this.subs.add(fn);
    this.start();
    return () => this.subs.delete(fn);
  }

  start() {
    if (this.running || this.subs.size === 0) return;
    this.running = true;
    this.clock.getDelta();
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
  }

  loop = () => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    // Clamped so a backgrounded tab does not produce a huge jump on return.
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    this.frame++;
    for (const fn of this.subs) fn(dt, t, this.frame);
  };
}

export const ticker = new Ticker();

/* ------------------------------------------------------------ Environment */
/**
 * Builds a greyscale studio lighting environment in memory and pre-filters it
 * into an environment map. No HDR files to download, and the result stays
 * strictly monochrome so nothing tints the models.
 */
export function createStudioEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const scene = new THREE.Scene();
  const plane = new THREE.PlaneGeometry(1, 1);
  const disposables = [];

  const room = new THREE.Mesh(
    new THREE.BoxGeometry(24, 14, 24),
    new THREE.MeshBasicMaterial({ side: THREE.BackSide })
  );
  room.material.color.setRGB(0.055, 0.055, 0.055);
  scene.add(room);
  disposables.push(room.geometry, room.material);

  const softbox = (w, h, luminance, position, rotation) => {
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    mat.color.setRGB(luminance, luminance, luminance);
    const mesh = new THREE.Mesh(plane, mat);
    mesh.scale.set(w, h, 1);
    mesh.position.set(...position);
    if (rotation) mesh.rotation.set(...rotation);
    else mesh.lookAt(0, 0, 0);
    scene.add(mesh);
    disposables.push(mat);
  };

  softbox(14, 10, 5.2, [0, 9, 1.5]); // key, overhead
  softbox(10, 11, 1.15, [-9, 1.5, 4]); // left fill
  softbox(7, 11, 3.6, [8, 3, -5]); // right rim
  softbox(14, 8, 0.42, [0, -7, 0]); // floor bounce
  softbox(9, 9, 0.95, [0, 0.5, 10]); // frontal wash

  const target = pmrem.fromScene(scene, 0.035);
  pmrem.dispose();
  plane.dispose();
  disposables.forEach((d) => d.dispose());

  return target.texture;
}

/* ------------------------------------------------------------ Liquid shine */

/**
 * The travelling highlight that sells the glass coat. Two things move: the
 * environment map slowly rotates so reflections drift across every surface,
 * and a small bright light orbits the product to throw a specular streak.
 *
 * Both run off an irrational-ratio pair of speeds and a random phase, so the
 * shine never lands on a visible loop and neighbouring products never flash
 * together.
 *
 * @returns {(t:number)=>void} call once per frame with the shared clock time
 */
export function addGlint(scene, opts = {}) {
  const {
    intensity = 26,
    radius = 4.6,
    height = 2.6,
    speed = 0.34,
    envSpeed = 0.055,
  } = opts;

  const phase = Math.random() * Math.PI * 2;
  const light = new THREE.PointLight(0xffffff, intensity, 0, 2);
  scene.add(light);

  if (REDUCED_MOTION) {
    light.position.set(radius * 0.6, height, radius * 0.6);
    return () => {};
  }

  return (t) => {
    const a = t * speed + phase;
    light.position.set(
      Math.cos(a) * radius,
      height + Math.sin(a * 0.618) * radius * 0.35,
      Math.sin(a) * radius
    );
    scene.environmentRotation.y = t * envSpeed + phase * 0.35;
  };
}

/* ------------------------------------------------------------------ Stage */
export class Stage {
  /**
   * @param {HTMLElement} mount  element the canvas is appended to
   * @param {object} opts
   */
  constructor(mount, opts = {}) {
    const {
      alpha = true,
      fov = 34,
      near = 0.1,
      far = 120,
      cameraPos = [0, 0, 7],
      exposure = 1.05,
      dprCap = 2,
      env = true,
      antialias = true,
    } = opts;

    this.mount = mount;
    this.opts = opts;
    this.dprCap = dprCap;
    this.visible = false;
    this.destroyed = false;
    this.updaters = [];
    this.postRenders = [];

    this.renderer = new THREE.WebGLRenderer({
      alpha,
      antialias,
      powerPreference: "high-performance",
      stencil: false,
      preserveDrawingBuffer: !!opts.preserveDrawingBuffer,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    // Neutral keeps product colours saturated; ACES would wash them out.
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = exposure;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    if (!alpha) this.renderer.setClearColor(0x000000, 1);

    this.canvas = this.renderer.domElement;
    this.canvas.style.display = "block";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    mount.appendChild(this.canvas);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(fov, 1, near, far);
    this.camera.position.set(...cameraPos);
    this.camera.lookAt(0, 0, 0);

    if (env) {
      this.scene.environment = createStudioEnvironment(this.renderer);
      this.scene.environmentIntensity = opts.envIntensity ?? 1;
      this.glint = addGlint(this.scene, opts.glint);
    }

    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(mount);

    this.io = new IntersectionObserver(
      ([entry]) => {
        this.visible = entry.isIntersecting;
      },
      { rootMargin: opts.rootMargin || "160px 0px" }
    );
    this.io.observe(mount);

    this.unsubscribe = ticker.add((dt, t, frame) => this.tick(dt, t, frame));
  }

  onUpdate(fn) {
    this.updaters.push(fn);
    return this;
  }

  onAfterRender(fn) {
    this.postRenders.push(fn);
    return this;
  }

  resize() {
    const w = this.mount.clientWidth || 1;
    const h = this.mount.clientHeight || 1;
    if (w === this.w && h === this.h) return;
    this.w = w;
    this.h = h;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.dprCap));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.opts.onResize) this.opts.onResize(w, h, this);
  }

  tick(dt, t, frame) {
    if (!this.visible || this.destroyed) return;
    this.glint?.(t);
    for (const fn of this.updaters) fn(dt, t, frame);
    this.renderer.render(this.scene, this.camera);
    for (const fn of this.postRenders) fn(dt, t, frame);
  }

  destroy() {
    this.destroyed = true;
    this.unsubscribe?.();
    this.ro?.disconnect();
    this.io?.disconnect();
    disposeObject(this.scene);
    this.renderer.dispose();
    this.canvas.remove();
  }
}

/* ------------------------------------------------------------- Scroll math */

/**
 * Progress of an element travelling through the viewport.
 * 0 when its top hits the bottom of the screen, 1 when its bottom leaves the top.
 */
export function throughViewport(el) {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight || 1;
  return clamp((vh - r.top) / (vh + r.height), 0, 1);
}

/** Progress of a sticky section: 0 when it starts pinning, 1 when it unpins. */
export function pinProgress(el) {
  const r = el.getBoundingClientRect();
  const scrollable = r.height - (window.innerHeight || 1);
  if (scrollable <= 0) return 0;
  return clamp(-r.top / scrollable, 0, 1);
}

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export const lerp = (a, b, t) => a + (b - a) * t;

/** Frame-rate independent smoothing. */
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

/**
 * Critically-damped follow (Unity SmoothDamp).
 * Tracks fast flicks and settles without the rigid feel of a fixed lerp.
 * Returns [value, velocity].
 */
export function smoothDamp(current, target, velocity, smoothTime, dt, maxSpeed = Infinity) {
  const st = Math.max(0.0001, smoothTime);
  const omega = 2 / st;
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  let change = current - target;
  const original = target;
  const maxChange = maxSpeed * st;
  change = Math.max(-maxChange, Math.min(maxChange, change));
  target = current - change;
  const temp = (velocity + omega * change) * dt;
  velocity = (velocity - omega * temp) * exp;
  let output = target + (change + temp) * exp;
  if (original - current > 0 === output > original) {
    output = original;
    velocity = (output - original) / (dt || 1e-4);
  }
  return [output, velocity];
}

/** Maps v from [inMin,inMax] to [outMin,outMax], clamped. */
export function mapRange(v, inMin, inMax, outMin, outMax) {
  const t = clamp((v - inMin) / (inMax - inMin || 1), 0, 1);
  return outMin + (outMax - outMin) * t;
}

export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** A smoothed mirror of window.scrollY, shared by every scene. */
class ScrollTracker {
  constructor() {
    this.y = window.scrollY;
    this.smooth = this.y;
    this.velocity = 0;
    this._smoothVel = 0;
    this._prevY = this.y;
    window.addEventListener(
      "scroll",
      () => {
        this.y = window.scrollY;
      },
      { passive: true }
    );
    ticker.add((dt) => {
      const step = dt || 0.016;
      this.velocity = (this.y - this._prevY) / step;
      this._prevY = this.y;
      const [next, vel] = smoothDamp(this.smooth, this.y, this._smoothVel, 0.08, step);
      this.smooth = next;
      this._smoothVel = vel;
    });
  }
}

export const scrollTracker = new ScrollTracker();

/* ---------------------------------------------------------------- Pointer */
class PointerTracker {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.sx = 0;
    this.sy = 0;
    window.addEventListener(
      "pointermove",
      (e) => {
        this.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.y = -((e.clientY / window.innerHeight) * 2 - 1);
      },
      { passive: true }
    );
    ticker.add((dt) => {
      this.sx = damp(this.sx, this.x, 4, dt);
      this.sy = damp(this.sy, this.y, 4, dt);
    });
  }
}

export const pointer = new PointerTracker();

/* -------------------------------------------------------------- Disposal */
export function disposeObject(root) {
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
    for (const m of mats) {
      for (const key of Object.keys(m)) {
        const val = m[key];
        if (val && val.isTexture) val.dispose();
      }
      m.dispose();
    }
  });
}

/** Fits an object into a target radius and centres it on the origin. */
export function normalizeObject(object, targetRadius = 1) {
  const box = new THREE.Box3().setFromObject(object);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  if (sphere.radius === 0) return object;
  const scale = targetRadius / sphere.radius;
  object.scale.multiplyScalar(scale);
  const center = sphere.center.multiplyScalar(scale);
  object.position.sub(center);
  return object;
}

/** Wraps an object so it can be scaled/positioned without touching its own transform. */
export function pivot(object) {
  const group = new THREE.Group();
  group.add(object);
  return group;
}
