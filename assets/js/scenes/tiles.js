/* ==========================================================================
   Tile engine
   A grid of product cards would need one WebGL context each, and browsers
   cap that around sixteen. Instead one renderer draws every visible tile in
   turn and blits the result into each card's own 2D canvas.
   ========================================================================== */

import * as THREE from "three";
import {
  createStudioEnvironment,
  ticker,
  damp,
  hasWebGL,
  addGlint,
  REDUCED_MOTION,
} from "../lib/gl.js";
import { createModel } from "../lib/models.js";

const MAX_TILE_PX = 760;

class TileEngine {
  constructor() {
    this.tiles = [];
    this.ready = false;
    this.maxW = 0;
    this.maxH = 0;
  }

  init() {
    if (this.ready) return;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
      stencil: false,
    });
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(1); // we manage device pixels ourselves
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.autoClear = false;
    this.renderer.setClearColor(0x000000, 0);
    this.env = createStudioEnvironment(this.renderer);
    this.glCanvas = this.renderer.domElement;
    this.ready = true;
    ticker.add((dt, t) => this.render(dt, t));
  }

  /**
   * @param {HTMLElement} mount   element the 2D canvas is appended to
   * @param {string} modelKey     key from the model registry
   */
  addTile(mount, modelKey, options = {}) {
    this.init();

    const {
      spin = 0.35,
      tilt = 0.18,
      bob = 0.05,
      fov = 32,
      distance = 4.4,
      radius = 1,
      rotation = [0.2, 0.5, 0],
    } = options;

    const canvas = document.createElement("canvas");
    canvas.style.cssText = "display:block;width:100%;height:100%;";
    mount.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.environment = this.env;
    scene.environmentIntensity = 1.05;
    const glint = addGlint(scene, { intensity: 22, radius: 4.2, height: 2.4 });

    const pivot = new THREE.Group();
    const model = createModel(modelKey, radius);
    model.rotation.set(...rotation);
    pivot.add(model);
    scene.add(pivot);

    const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 60);
    camera.position.set(0, 0.25, distance);
    camera.lookAt(0, 0, 0);

    const tile = {
      mount,
      canvas,
      ctx: canvas.getContext("2d"),
      scene,
      camera,
      pivot,
      model,
      glint,
      spin,
      tilt,
      bob,
      visible: false,
      hovered: false,
      hoverBlend: 0,
      w: 0,
      h: 0,
      seed: Math.random() * Math.PI * 2,
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        tile.visible = entry.isIntersecting;
      },
      { rootMargin: "120px 0px" }
    );
    io.observe(mount);

    const ro = new ResizeObserver(() => this.measure(tile));
    ro.observe(mount);
    this.measure(tile);

    mount.addEventListener("pointerenter", () => (tile.hovered = true));
    mount.addEventListener("pointerleave", () => (tile.hovered = false));

    this.tiles.push(tile);
    return tile;
  }

  measure(tile) {
    const rect = tile.mount.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));
    const scale = Math.min(this.dpr, MAX_TILE_PX / Math.max(cssW, cssH), 2);
    const w = Math.max(1, Math.round(cssW * scale));
    const h = Math.max(1, Math.round(cssH * scale));
    if (w === tile.w && h === tile.h) return;
    tile.w = w;
    tile.h = h;
    tile.canvas.width = w;
    tile.canvas.height = h;
    tile.camera.aspect = w / h;
    tile.camera.updateProjectionMatrix();

    this.maxW = Math.max(this.maxW, w);
    this.maxH = Math.max(this.maxH, h);
    this.renderer.setSize(this.maxW, this.maxH, false);
  }

  render(dt, t) {
    if (!this.ready) return;
    const active = this.tiles.filter((tile) => tile.visible && tile.w > 0);
    if (!active.length) return;

    const H = this.maxH;

    for (const tile of active) {
      tile.hoverBlend = damp(tile.hoverBlend, tile.hovered ? 1 : 0, 6, dt);
      tile.glint(t);

      if (!REDUCED_MOTION) {
        const speed = tile.spin * (1 + tile.hoverBlend * 2.2);
        tile.pivot.rotation.y += speed * dt;
        tile.pivot.rotation.x = Math.sin(t * 0.5 + tile.seed) * tile.tilt * 0.4;
        tile.pivot.position.y = Math.sin(t * 0.9 + tile.seed) * tile.bob;
      }
      tile.pivot.scale.setScalar(1 + tile.hoverBlend * 0.07);

      // Render this tile into the top-left corner of the shared GL canvas.
      this.renderer.setViewport(0, H - tile.h, tile.w, tile.h);
      this.renderer.setScissor(0, H - tile.h, tile.w, tile.h);
      this.renderer.setScissorTest(true);
      this.renderer.clear(true, true, false);
      this.renderer.render(tile.scene, tile.camera);

      tile.ctx.clearRect(0, 0, tile.w, tile.h);
      tile.ctx.drawImage(this.glCanvas, 0, 0, tile.w, tile.h, 0, 0, tile.w, tile.h);
    }
  }
}

let engine = null;

export function tileEngine() {
  if (!engine) engine = new TileEngine();
  return engine;
}

/** Mounts a spinning product into every catalogue stage. Scroll-scene steps
 *  also carry data-model for the pinned WebGL showcase — those must not get
 *  a second full-viewport tile or the model sits on top of the glass card. */
export function mountProductTiles(root = document) {
  const mounts = root.querySelectorAll(".pcard__stage[data-model]");
  if (!mounts.length) return;

  if (!hasWebGL()) {
    mounts.forEach(showFallback);
    return;
  }

  const eng = tileEngine();
  mounts.forEach((mount) => {
    if (mount.dataset.mounted === "true") return;
    mount.dataset.mounted = "true";
    try {
      eng.addTile(mount, mount.dataset.model, {
        spin: parseFloat(mount.dataset.spin || "0.35"),
        distance: parseFloat(mount.dataset.distance || "4.4"),
        fov: parseFloat(mount.dataset.fov || "32"),
        radius: parseFloat(mount.dataset.radius || "1"),
      });
    } catch (err) {
      console.error("Tile failed", mount.dataset.model, err);
      showFallback(mount);
    }
  });
}

export function showFallback(mount) {
  if (mount.querySelector(".gl-fallback")) return;
  const el = document.createElement("div");
  el.className = "gl-fallback";
  el.innerHTML =
    '<div class="gl-fallback__ring"></div><span class="mono muted">3D preview unavailable</span>';
  mount.appendChild(el);
}
