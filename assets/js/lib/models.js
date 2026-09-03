/* ==========================================================================
   Procedural sports product models
   Each factory returns a THREE.Group built from primitives, normalised to
   fit a unit sphere so every scene can treat them identically.
   Products are finished in realistic sporting colours — only the site
   chrome around them stays black and white.
   ========================================================================== */

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  PALETTE,
  materials,
  ballMaterial,
  leather,
  leatherVertexColour,
  polymer,
  polymerVertexColour,
  rubber,
  foam,
  latex,
} from "./materials.js";
import { normalizeObject } from "./gl.js";
import gloveUrl from "../../models/boxing-glove.glb?url";
import shinUrl from "../../models/football-shin-guard.glb?url";

const add = (parent, geometry, material, position, rotation, scale) => {
  const mesh = new THREE.Mesh(geometry, material);
  if (position) mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  if (scale) mesh.scale.set(...scale);
  parent.add(mesh);
  return mesh;
};

/* ------------------------------------------------------------------ Balls */
function inflatedBall(kind) {
  const group = new THREE.Group();
  add(group, new THREE.SphereGeometry(1, 96, 64), ballMaterial(kind));

  const valve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.04, 20),
    polymer(PALETTE.graphite, { roughness: 0.5 })
  );
  valve.position.set(0, 0.995, 0);
  group.add(valve);

  return group;
}

export const ballThermo = () => inflatedBall("thermo");
export const ballClassic = () => inflatedBall("classic");
export const ballFutsal = () => inflatedBall("futsal");
export const ballVolley = () => inflatedBall("volley");
export const ballBasket = () => inflatedBall("basket");

/* ------------------------------------------------------------ Rugby ball */
export function rugby() {
  const group = new THREE.Group();
  const half = 1.0;
  const maxR = 0.58;
  const radiusAt = (y) => maxR * Math.pow(Math.max(0, 1 - (y / half) ** 2), 0.6);

  const profile = [];
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const y = -half + (2 * half * i) / steps;
    profile.push(new THREE.Vector2(Math.max(0.0012, radiusAt(y)), y));
  }

  const body = add(group, new THREE.LatheGeometry(profile, 72), materials.pimpledRubber);
  body.rotation.z = Math.PI / 2;

  // Four panel seams running pole to pole.
  const seamMat = polymer(PALETTE.deepNavy, { roughness: 0.6, clearcoat: 0.3 });
  for (let s = 0; s < 4; s++) {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const y = -half * 0.985 + 2 * half * 0.985 * (i / 40);
      pts.push(new THREE.Vector3(y, radiusAt(y) + 0.008, 0));
    }
    const seam = add(
      group,
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.016, 8, false),
      seamMat
    );
    seam.rotation.x = (s * Math.PI) / 2;
  }

  // Contrast bands either side of the lacing.
  for (const x of [-0.42, 0.42]) {
    add(
      group,
      new THREE.TorusGeometry(radiusAt(x) + 0.004, 0.03, 12, 60),
      polymer(PALETTE.crimson, { roughness: 0.5 }),
      [x, 0, 0],
      [0, 0, Math.PI / 2]
    );
  }

  // Lacing panel.
  add(
    group,
    new THREE.BoxGeometry(0.72, 0.02, 0.15),
    polymer(PALETTE.deepNavy, { roughness: 0.65 }),
    [0, maxR + 0.002, 0]
  );
  for (let i = 0; i < 5; i++) {
    const x = -0.26 + i * 0.13;
    add(
      group,
      new THREE.CapsuleGeometry(0.022, 0.11, 4, 10),
      polymer(PALETTE.pitchWhite, { roughness: 0.55 }),
      [x, radiusAt(x) + 0.014, 0],
      [Math.PI / 2, 0, 0]
    );
  }

  return group;
}

/* ---------------------------------------------------------- Cricket ball */
export function cricketBall() {
  const group = new THREE.Group();
  const r = 1;

  add(
    group,
    new THREE.SphereGeometry(r, 80, 56),
    leather(PALETTE.cricketRed, { roughness: 0.3, clearcoat: 0.75, seed: 4 })
  );

  // Raised six-row seam.
  add(
    group,
    new THREE.TorusGeometry(r * 0.998, 0.045, 16, 96),
    leather(PALETTE.wine, { roughness: 0.45, clearcoat: 0.4, seed: 4 }),
    null,
    [Math.PI / 2, 0, 0]
  );

  const stitchMat = polymer(0xf0ead6, { roughness: 0.6, clearcoat: 0.15 });
  const stitchGeo = new THREE.CapsuleGeometry(0.014, 0.055, 3, 6);
  for (const rowY of [-0.075, -0.045, -0.015, 0.015, 0.045, 0.075]) {
    const ringR = Math.sqrt(Math.max(0.01, r * r - rowY * rowY)) + 0.012;
    const count = 34;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const stitch = new THREE.Mesh(stitchGeo, stitchMat);
      stitch.position.set(Math.cos(a) * ringR, rowY, Math.sin(a) * ringR);
      stitch.rotation.set(0, -a, Math.PI / 2 + (rowY > 0 ? 0.5 : -0.5));
      group.add(stitch);
    }
  }

  return group;
}

/* ------------------------------------------------------------ Cricket bat */
export function cricketBat() {
  const group = new THREE.Group();

  const bladeL = 1.55;
  const bladeW = 0.34;
  const bladeD = 0.1;
  const hw = bladeW / 2;

  const shape = new THREE.Shape();
  const toeR = 0.05;
  shape.moveTo(-hw, toeR);
  shape.quadraticCurveTo(-hw, 0, -hw + toeR, 0);
  shape.lineTo(hw - toeR, 0);
  shape.quadraticCurveTo(hw, 0, hw, toeR);
  shape.lineTo(hw, bladeL - 0.1);
  shape.quadraticCurveTo(hw, bladeL, hw - 0.06, bladeL);
  shape.lineTo(-hw + 0.06, bladeL);
  shape.quadraticCurveTo(-hw, bladeL, -hw, bladeL - 0.1);
  shape.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(shape, {
    depth: bladeD,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.016,
    bevelSegments: 4,
    curveSegments: 12,
  });

  // Push the back face out into the swell that gives a bat its drive.
  const pos = bladeGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (z > bladeD * 0.45) continue;
    const along = THREE.MathUtils.clamp(y / bladeL, 0, 1);
    const spine = Math.exp(-((along - 0.34) ** 2) / 0.055);
    const across = Math.cos(THREE.MathUtils.clamp(x / hw, -1, 1) * Math.PI * 0.5) ** 1.4;
    pos.setZ(i, z - spine * across * 0.13);
  }
  bladeGeo.computeVertexNormals();

  add(group, bladeGeo, materials.willow, [0, 0, -bladeD / 2]);

  // Splice wedge and cane handle.
  add(
    group,
    new THREE.CylinderGeometry(0.055, 0.075, 0.34, 16),
    polymer(PALETTE.willowShade, { roughness: 0.55, clearcoat: 0.25 }),
    [0, bladeL - 0.14, -0.02]
  );
  add(
    group,
    new THREE.CylinderGeometry(0.052, 0.056, 0.68, 20),
    polymer(PALETTE.willowCream, { roughness: 0.5, clearcoat: 0.25 }),
    [0, bladeL + 0.28, -0.02]
  );

  // Rubber grip with ribbed rings.
  add(
    group,
    new THREE.CylinderGeometry(0.062, 0.06, 0.56, 24),
    rubber(PALETTE.jetBlack),
    [0, bladeL + 0.34, -0.02]
  );
  for (let i = 0; i < 11; i++) {
    add(
      group,
      new THREE.TorusGeometry(0.062, 0.006, 8, 28),
      i % 3 === 0 ? rubber(PALETTE.crimson) : rubber(0x2c2c2c),
      [0, bladeL + 0.1 + i * 0.05, -0.02],
      [Math.PI / 2, 0, 0]
    );
  }

  // Anti-scuff face sheet and toe guard.
  add(
    group,
    new THREE.BoxGeometry(bladeW - 0.02, 0.5, 0.006),
    polymer(PALETTE.electricBlue, { roughness: 0.25, clearcoat: 0.8 }),
    [0, bladeL * 0.62, bladeD / 2 + 0.026]
  );
  add(
    group,
    new THREE.BoxGeometry(bladeW + 0.01, 0.05, bladeD + 0.06),
    rubber(PALETTE.jetBlack),
    [0, 0.024, -0.03]
  );

  group.position.y = -bladeL / 2;
  return group;
}

/* ----------------------------------------------------------- Hockey stick */
export function hockeyStick() {
  const group = new THREE.Group();

  const spine = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, 1.15, 0),
    new THREE.Vector3(0.0, 0.35, 0),
    new THREE.Vector3(-0.01, -0.25, 0),
    new THREE.Vector3(-0.06, -0.66, 0),
    new THREE.Vector3(-0.22, -0.92, 0),
    new THREE.Vector3(-0.48, -1.0, 0),
    new THREE.Vector3(-0.66, -0.94, 0),
  ]);

  const samples = 90;
  const left = [];
  const right = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const p = spine.getPoint(t);
    const tan = spine.getTangent(t);
    const normal = new THREE.Vector2(-tan.y, tan.x).normalize();
    const width = THREE.MathUtils.lerp(0.062, 0.105, THREE.MathUtils.smoothstep(t, 0.55, 1));
    left.push(new THREE.Vector2(p.x + normal.x * width, p.y + normal.y * width));
    right.push(new THREE.Vector2(p.x - normal.x * width, p.y - normal.y * width));
  }

  const shape = new THREE.Shape();
  shape.moveTo(left[0].x, left[0].y);
  for (const pt of left) shape.lineTo(pt.x, pt.y);
  for (let i = right.length - 1; i >= 0; i--) shape.lineTo(right[i].x, right[i].y);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.13,
    bevelEnabled: true,
    bevelThickness: 0.022,
    bevelSize: 0.02,
    bevelSegments: 4,
    curveSegments: 8,
  });
  geo.center();
  add(group, geo, materials.carbon);

  // Accent flashes along the shaft.
  for (let i = 0; i < 3; i++) {
    add(
      group,
      new THREE.BoxGeometry(0.135, 0.05, 0.176),
      polymer(i === 1 ? PALETTE.volt : PALETTE.teal, { roughness: 0.28, clearcoat: 0.85 }),
      [0.0, 0.34 - i * 0.13, 0],
      [0, 0, 0.08]
    );
  }

  // Chamois grip wrap, spiralled down the shaft.
  const gripPts = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const a = t * Math.PI * 9;
    gripPts.push(new THREE.Vector3(Math.cos(a) * 0.035, 1.1 - t * 0.72, Math.sin(a) * 0.082));
  }
  const grip = add(
    group,
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(gripPts), 120, 0.026, 8, false),
    polymer(PALETTE.graphite, { roughness: 0.72, clearcoat: 0.1 })
  );
  grip.position.y = -0.06;

  add(
    group,
    new THREE.CylinderGeometry(0.07, 0.062, 0.05, 20),
    polymer(PALETTE.volt, { roughness: 0.35 }),
    [0, 1.06, 0]
  );

  return group;
}

/* ------------------------------------------------------- Blended volumes */

const blobCache = new Map();

/** Polynomial smooth minimum — blends two distance fields without a crease. */
function smin(a, b, k) {
  const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (b - a)) / k));
  return b * (1 - h) + a * h - k * h * (1 - h);
}

/**
 * Builds a smooth organic surface from a skeleton of overlapping capsules.
 *
 * Padded sports gear is not a box with spheres stuck on it — it is several
 * stuffed volumes that merge into one continuous skin. This evaluates the
 * smooth union of those volumes and ray-marches outward from an interior
 * point to find the surface, giving a single seamless mesh.
 *
 * @param {Array} bones  [x1,y1,z1, x2,y2,z2, radius] per capsule
 */
function blob(key, bones, opts = {}) {
  if (blobCache.has(key)) return blobCache.get(key);

  const {
    segX = 112,
    segY = 84,
    origin = [0, 0, 0],
    smoothness = 0.34,
    reach = 3.4,
    march = 54,
    refine = 14,
    squash = [1, 1, 1],
  } = opts;

  const o = new THREE.Vector3(...origin);
  const pa = new THREE.Vector3();
  const ba = new THREE.Vector3();
  const p = new THREE.Vector3();

  const field = (point) => {
    let d = Infinity;
    for (let i = 0; i < bones.length; i++) {
      const b = bones[i];
      pa.set(point.x - b[0], point.y - b[1], point.z - b[2]);
      ba.set(b[3] - b[0], b[4] - b[1], b[5] - b[2]);
      const len2 = ba.lengthSq() || 1e-6;
      const h = Math.max(0, Math.min(1, pa.dot(ba) / len2));
      const dx = pa.x - ba.x * h;
      const dy = pa.y - ba.y * h;
      const dz = pa.z - ba.z * h;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) - b[6];
      d = i === 0 ? dist : smin(d, dist, smoothness);
    }
    return d;
  };

  const positions = new Float32Array((segX + 1) * (segY + 1) * 3);
  const uvs = new Float32Array((segX + 1) * (segY + 1) * 2);
  let v = 0;
  let u = 0;

  for (let iy = 0; iy <= segY; iy++) {
    const phi = (iy / segY) * Math.PI;
    const sy = Math.cos(phi);
    const sr = Math.sin(phi);
    for (let ix = 0; ix <= segX; ix++) {
      const theta = (ix / segX) * Math.PI * 2;
      const dx = sr * Math.sin(theta);
      const dz = sr * Math.cos(theta);

      // Walk inward from the far end and stop at the outermost crossing, so
      // mild concavities do not get clipped away.
      let hit = 0;
      let prev = reach;
      for (let s = march; s >= 0; s--) {
        const t = (s / march) * reach;
        p.set(o.x + dx * t, o.y + sy * t, o.z + dz * t);
        if (field(p) < 0) {
          let lo = t;
          let hi = prev;
          for (let r = 0; r < refine; r++) {
            const mid = (lo + hi) * 0.5;
            p.set(o.x + dx * mid, o.y + sy * mid, o.z + dz * mid);
            if (field(p) < 0) lo = mid;
            else hi = mid;
          }
          hit = (lo + hi) * 0.5;
          break;
        }
        prev = t;
      }

      positions[v++] = (o.x + dx * hit) * squash[0];
      positions[v++] = (o.y + sy * hit) * squash[1];
      positions[v++] = (o.z + dz * hit) * squash[2];
      uvs[u++] = ix / segX;
      uvs[u++] = 1 - iy / segY;
    }
  }

  const indices = [];
  const row = segX + 1;
  for (let iy = 0; iy < segY; iy++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iy * row + ix;
      const b = a + row;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  blobCache.set(key, geo);
  return geo;
}

/**
 * Paints per-vertex colour onto a blob so one seamless mesh can carry the
 * red shell, black cuff and white knuckle bar of a real glove.
 */
function paintBlob(geo, painter) {
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    painter(c, pos.getX(i), pos.getY(i), pos.getZ(i));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geo;
}

const mixTo = (c, hex, amount) => {
  if (amount <= 0) return;
  c.lerp(scratchColor.setHex(hex), Math.min(1, amount));
};
const scratchColor = new THREE.Color();
const band = (v, edge0, edge1) => {
  const t = THREE.MathUtils.clamp((v - edge0) / (edge1 - edge0 || 1), 0, 1);
  return t * t * (3 - 2 * t);
};

/* ----------------------------------------------------------- Boxing glove */
// Decimated from the printable STL (1.37M tris / 65 MB → ~9k tris / 147 KB).
// Preloaded once, then cloned. The procedural stand-in is only used if the
// mesh fails to fetch — the silhouette is similar enough that a missing
// file does not leave a hole in the catalogue.
let gloveTemplate = null;
let shinTemplate = null;
let assetsLoad = null;

async function loadDressedGlove() {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(gloveUrl);
  gltf.scene.updateMatrixWorld(true);

  let src = null;
  gltf.scene.traverse((obj) => {
    if (obj.isMesh && !src) src = obj;
  });
  if (!src) throw new Error("boxing-glove.glb has no mesh");

  const geo = src.geometry.clone();
  geo.applyMatrix4(src.matrixWorld);
  // Source lies along Z with the cuff at −Z. Stand it up so the cuff is −Y.
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();

  paintBlob(geo, (c, x, y) => {
    c.setHex(PALETTE.crimson);
    mixTo(c, PALETTE.jetBlack, 1 - band(y, -0.72, -0.38));
    mixTo(c, PALETTE.pitchWhite, band(y, -0.48, -0.36) * (1 - band(y, -0.18, -0.06)));
    const knuckle = Math.hypot(x / 0.3, (y - 0.52) / 0.3);
    mixTo(c, PALETTE.pitchWhite, (1 - band(knuckle, 0.55, 1)) * 0.9);
  });

  const group = new THREE.Group();
  group.add(new THREE.Mesh(geo, leatherVertexColour({ roughness: 0.44, level: "gloss" })));
  group.rotation.set(0.08, 0.55, 0.06);
  group.userData.source = "stl";
  return group;
}

async function loadDressedFootballShin() {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(shinUrl);
  gltf.scene.updateMatrixWorld(true);

  let src = null;
  gltf.scene.traverse((obj) => {
    if (obj.isMesh && !src) src = obj;
  });
  if (!src) throw new Error("football-shin-guard.glb has no mesh");

  const geo = src.geometry.clone();
  geo.applyMatrix4(src.matrixWorld);
  geo.computeVertexNormals();

  paintBlob(geo, (c, x, y) => {
    c.setHex(PALETTE.pitchWhite);
    mixTo(c, PALETTE.jetBlack, band(x, -0.02, 0.1));
    const onShell = 1 - band(x, -0.02, 0.1);
    mixTo(c, PALETTE.electricBlue, (1 - band(Math.abs(y), 0.04, 0.16)) * onShell);
  });
  geo.rotateY(Math.PI / 2);
  geo.rotateZ(-Math.PI / 2);

  const mat = polymerVertexColour({ roughness: 0.32, level: "gloss" }).clone();
  mat.side = THREE.DoubleSide;
  mat.metalness = 0;

  const right = new THREE.Mesh(geo, mat);
  right.position.x = 0.7;
  const leftGeo = geo.clone();
  leftGeo.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1));
  leftGeo.computeVertexNormals();
  const left = new THREE.Mesh(leftGeo, mat);
  left.position.x = -0.7;

  const group = new THREE.Group();
  group.add(left, right);
  group.userData.source = "stl";
  return group;
}

export function preloadModels() {
  if (assetsLoad) return assetsLoad;
  assetsLoad = Promise.all([
    loadDressedGlove()
      .then((tpl) => {
        gloveTemplate = tpl;
      })
      .catch((err) => {
        console.warn("Boxing glove mesh failed to load; using procedural stand-in.", err);
      }),
    loadDressedFootballShin()
      .then((tpl) => {
        shinTemplate = tpl;
      })
      .catch((err) => {
        console.warn("Football shin guard mesh failed to load; using procedural stand-in.", err);
      }),
  ]);
  return assetsLoad;
}

function boxingGloveProcedural() {
  const group = new THREE.Group();

  // Skeleton of the stuffed compartments: cuff tube, back of hand, the
  // knuckle mass, the fingers curling under, and the thumb alongside.
  const geo = blob(
    "boxing-glove",
    [
      [0, -2.05, 0, 0, -1.35, 0, 0.36], // cuff bottom
      [0, -1.4, 0, 0.02, -0.75, 0, 0.42], // cuff top / wrist
      [0.02, -0.8, 0, 0.1, -0.05, 0, 0.54], // back of hand
      [0.08, -0.1, 0, 0.42, 0.42, 0, 0.62], // knuckle mass
      [0.42, 0.42, 0, 0.8, 0.32, 0, 0.56], // striking face
      [0.76, 0.28, 0, 0.72, -0.18, 0, 0.44], // fingers curled under
      [0.0, -0.62, 0.34, 0.55, -0.05, 0.46, 0.24], // thumb
    ],
    {
      origin: [0.12, -0.4, 0],
      smoothness: 0.24,
      reach: 3.4,
      squash: [1, 1, 1.04],
    }
  );

  paintBlob(geo, (c, x, y) => {
    c.setHex(PALETTE.crimson);
    // Black cuff at the bottom, fading up into the red shell.
    mixTo(c, PALETTE.jetBlack, 1 - band(y, -1.32, -1.06));
    // White wrist strap.
    mixTo(c, PALETTE.pitchWhite, band(y, -1.12, -1.04) * (1 - band(y, -0.94, -0.86)));
    // Knuckle bar: an ellipse in the vertical plane, so it wraps the full
    // width of the striking face instead of sitting on it like a decal.
    const d = Math.hypot((x - 0.8) / 0.26, (y - 0.34) / 0.34);
    mixTo(c, PALETTE.pitchWhite, (1 - band(d, 0.62, 1)) * 0.92);
  });

  group.add(new THREE.Mesh(geo, leatherVertexColour({ roughness: 0.44, level: "gloss" })));

  // Steel strap loop and the mesh vent in the cuff opening.
  add(group, new THREE.BoxGeometry(0.08, 0.19, 0.12), materials.brushedSteel, [
    0.28, -1.0, 0.32,
  ]);
  add(
    group,
    new THREE.CircleGeometry(0.32, 32),
    materials.mesh,
    [0, -2.03, 0],
    [Math.PI / 2, 0, 0]
  );

  // Three-quarter view, which is how a glove is always photographed.
  group.rotation.set(0.05, 0.6, 0.08);
  return group;
}

export function boxingGlove() {
  if (gloveTemplate) return gloveTemplate.clone(true);
  return boxingGloveProcedural();
}

/* -------------------------------------------------------------- MMA glove */
export function mmaGlove() {
  const group = new THREE.Group();

  // An MMA glove is a padded knuckle bar carried on a wrist cuff, with the
  // palm left open. The padded parts blend into one piece; the finger loops
  // and the open palm are what make it read as MMA rather than boxing.
  const geo = blob(
    "mma-glove",
    [
      [-0.3, 0.26, 0.05, 0.3, 0.26, 0.05, 0.24], // knuckle pad
      [-0.26, -0.02, 0.0, 0.26, -0.02, 0.0, 0.2], // back of hand
      [-0.26, -0.4, -0.02, 0.26, -0.4, -0.02, 0.19], // wrist cuff
      [-0.42, -0.06, 0.12, -0.5, 0.2, 0.18, 0.13], // thumb pad
    ],
    {
      origin: [0, -0.05, 0],
      smoothness: 0.17,
      reach: 2.2,
      squash: [1, 1, 0.78],
    }
  );

  paintBlob(geo, (c, x, y) => {
    c.setHex(PALETTE.jetBlack);
    mixTo(c, PALETTE.crimson, band(y, 0.08, 0.2));
    mixTo(c, PALETTE.crimson, 1 - band(y, -0.52, -0.4));
  });

  group.add(new THREE.Mesh(geo, leatherVertexColour({ roughness: 0.46, seed: 5, level: "gloss" })));

  // The four finger holes are what separate an MMA glove from a boxing glove,
  // so they sit clear of the pad rather than being buried in it.
  const loop = leather(PALETTE.jetBlack, { roughness: 0.5, clearcoat: 0.4, seed: 5 });
  for (let i = 0; i < 4; i++) {
    const x = -0.225 + i * 0.15;
    add(
      group,
      new THREE.TorusGeometry(0.088, 0.045, 14, 30),
      loop,
      [x, 0.53, 0.03],
      [Math.PI / 2, 0, 0],
      [1, 1, 0.8]
    );
  }

  // Thumb loop.
  add(
    group,
    new THREE.TorusGeometry(0.082, 0.042, 12, 26),
    loop,
    [-0.53, 0.3, 0.19],
    [Math.PI / 2, 0.5, 0.4],
    [1, 1, 0.8]
  );

  // Open palm — a mesh bar bridging the hand rather than a closed shell.
  add(
    group,
    new RoundedBoxGeometry(0.44, 0.34, 0.05, 3, 0.02),
    materials.mesh,
    [0, 0.0, -0.2]
  );

  add(group, new THREE.BoxGeometry(0.14, 0.16, 0.05), materials.brushedSteel, [
    0.26, -0.46, 0.17,
  ]);

  group.rotation.set(0.12, 0.42, 0);
  return group;
}

/* ------------------------------------------------------- Goalkeeper glove */
export function gkGlove() {
  const group = new THREE.Group();
  const back = polymer(PALETTE.volt, { roughness: 0.62, clearcoat: 0.2 });
  const palm = latex(PALETTE.graphite);
  const trim = polymer(PALETTE.jetBlack, { roughness: 0.6, clearcoat: 0.15 });

  add(group, new RoundedBoxGeometry(0.86, 1.0, 0.2, 6, 0.09), back, [0, 0.1, 0]);
  add(group, new RoundedBoxGeometry(0.84, 0.98, 0.08, 6, 0.035), palm, [0, 0.1, 0.14]);

  const fingerLengths = [0.62, 0.7, 0.66, 0.54];
  fingerLengths.forEach((len, i) => {
    const x = -0.3 + i * 0.2;
    add(group, new THREE.CapsuleGeometry(0.098, len - 0.2, 6, 18), back, [
      x,
      0.62 + len / 2 - 0.1,
      0,
    ]);
    add(group, new THREE.CapsuleGeometry(0.075, len - 0.24, 5, 14), palm, [
      x,
      0.62 + len / 2 - 0.1,
      0.1,
    ]);
  });

  add(
    group,
    new THREE.CapsuleGeometry(0.11, 0.34, 6, 18),
    back,
    [-0.48, 0.34, 0.02],
    [0, 0, 0.62]
  );
  add(
    group,
    new THREE.CapsuleGeometry(0.085, 0.3, 5, 14),
    palm,
    [-0.5, 0.32, 0.11],
    [0, 0, 0.62]
  );

  // Wrap cuff and closure strap.
  add(group, new RoundedBoxGeometry(0.9, 0.44, 0.26, 5, 0.1), trim, [0, -0.55, 0]);
  add(group, new RoundedBoxGeometry(0.94, 0.16, 0.3, 4, 0.06), back, [0, -0.46, 0]);
  add(group, new THREE.BoxGeometry(0.26, 0.15, 0.07), materials.brushedSteel, [0.42, -0.46, 0.16]);

  // Punch-zone knuckle bars.
  for (let i = 0; i < 4; i++) {
    add(
      group,
      new THREE.CapsuleGeometry(0.045, 0.16, 4, 10),
      trim,
      [-0.3 + i * 0.2, 0.5, -0.1],
      [0, 0, Math.PI / 2]
    );
  }

  return group;
}

/* --------------------------------------------------------------- Heavy bag */
export function punchBag() {
  const group = new THREE.Group();

  const h = 1.9;
  const r = 0.46;
  const profile = [new THREE.Vector2(0.001, -h / 2)];
  for (let i = 0; i <= 12; i++) {
    const a = ((i / 12) * Math.PI) / 2;
    profile.push(new THREE.Vector2(Math.sin(a) * r, -h / 2 + (1 - Math.cos(a)) * r * 0.85));
  }
  profile.push(new THREE.Vector2(r, h / 2 - r * 0.5));
  for (let i = 0; i <= 8; i++) {
    const a = ((i / 8) * Math.PI) / 2;
    profile.push(
      new THREE.Vector2(r * Math.cos(a) * 0.92 + r * 0.08, h / 2 - r * 0.5 + Math.sin(a) * r * 0.42)
    );
  }

  add(group, new THREE.LatheGeometry(profile, 56), leather(PALETTE.jetBlack, { roughness: 0.5 }));

  // Contrast band and seam ribs.
  add(
    group,
    new THREE.CylinderGeometry(r + 0.006, r + 0.006, 0.26, 56, 1, true),
    leather(PALETTE.crimson, { roughness: 0.46, seed: 5 }),
    [0, 0.2, 0]
  );
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    add(
      group,
      new THREE.BoxGeometry(0.02, h * 0.86, 0.03),
      leather(PALETTE.graphite, { roughness: 0.55, seed: 5 }),
      [Math.cos(a) * (r + 0.012), -0.04, Math.sin(a) * (r + 0.012)]
    );
  }

  // Top plate and hanging hardware.
  add(group, new THREE.CylinderGeometry(0.3, 0.34, 0.06, 32), materials.brushedSteel, [
    0, h / 2 - 0.03, 0,
  ]);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.cos(a) * 0.26;
    const z = Math.sin(a) * 0.26;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, h / 2, z),
      new THREE.Vector3(x * 0.55, h / 2 + 0.3, z * 0.55),
      new THREE.Vector3(0, h / 2 + 0.52, 0),
    ]);
    add(group, new THREE.TubeGeometry(curve, 24, 0.017, 6, false), materials.chrome);
  }
  add(group, new THREE.TorusGeometry(0.09, 0.022, 12, 30), materials.chrome, [0, h / 2 + 0.6, 0]);
  add(group, new THREE.CylinderGeometry(0.05, 0.05, 0.1, 16), materials.brushedSteel, [
    0, h / 2 + 0.52, 0,
  ]);

  return group;
}

/* -------------------------------------------------------------- Shin guard */
function oneShinGuard(flip = 1) {
  const g = new THREE.Group();
  const plate = polymer(PALETTE.pitchWhite, { roughness: 0.24, clearcoat: 0.85 });
  const stripe = polymer(PALETTE.electricBlue, { roughness: 0.22, clearcoat: 0.9 });
  const pad = foam(PALETTE.chalk);
  const strap = polymer(PALETTE.jetBlack, { roughness: 0.7, clearcoat: 0.1 });

  // Broad anatomical shield: widest across the calf, rounded at both ends.
  // Kept deliberately wide and shallow — a narrow, deeply curved plate reads
  // as a rocket nose rather than a guard.
  const outline = new THREE.Shape();
  outline.moveTo(-0.4, -0.62);
  outline.lineTo(-0.46, 0.2);
  outline.quadraticCurveTo(-0.44, 0.78, 0, 0.94);
  outline.quadraticCurveTo(0.44, 0.78, 0.46, 0.2);
  outline.lineTo(0.4, -0.62);
  outline.quadraticCurveTo(0.36, -0.92, 0, -0.98);
  outline.quadraticCurveTo(-0.36, -0.92, -0.4, -0.62);

  const plateGeo = new THREE.ExtrudeGeometry(outline, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.035,
    bevelSegments: 4,
    curveSegments: 12,
  });
  plateGeo.translate(0, 0, -0.04);

  // Curve the plate around the shin (bend in Z with X).
  const pos = plateGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setZ(i, z - x * x * 1.15);
  }
  plateGeo.computeVertexNormals();
  add(g, plateGeo, plate);

  // Centre stripe.
  const stripeShape = new THREE.Shape();
  stripeShape.moveTo(-0.07, -0.72);
  stripeShape.lineTo(-0.08, 0.2);
  stripeShape.quadraticCurveTo(-0.08, 0.62, 0, 0.78);
  stripeShape.quadraticCurveTo(0.08, 0.62, 0.08, 0.2);
  stripeShape.lineTo(0.07, -0.72);
  stripeShape.closePath();
  const stripeGeo = new THREE.ExtrudeGeometry(stripeShape, {
    depth: 0.02,
    bevelEnabled: false,
    curveSegments: 8,
  });
  stripeGeo.translate(0, 0, 0.06);
  const sp = stripeGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i);
    const z = sp.getZ(i);
    sp.setZ(i, z - x * x * 1.15);
  }
  stripeGeo.computeVertexNormals();
  add(g, stripeGeo, stripe);

  // EVA backing, slightly smaller.
  const back = outline.clone();
  const backGeo = new THREE.ExtrudeGeometry(back, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  backGeo.translate(0, 0, -0.16);
  add(g, backGeo, pad);

  // Two wrap straps.
  for (const y of [0.28, -0.38]) {
    add(
      g,
      new THREE.TorusGeometry(0.32, 0.035, 8, 28, Math.PI * 1.15),
      strap,
      [0, y, -0.08],
      [Math.PI / 2, 0, -Math.PI * 0.1]
    );
  }

  g.scale.x = flip;
  return g;
}

/* --------------------------------------------------------- Cricket pad */

function oneCricketPad(hand = 1) {
  const g = new THREE.Group();
  const face = polymer(0xf4f2ea, { roughness: 0.4, level: "gloss" });
  const trim = polymer(PALETTE.deepNavy, { roughness: 0.38, level: "gloss" });
  const accent = polymer(PALETTE.electricBlue, { roughness: 0.32, level: "gloss" });
  const strap = polymer(PALETTE.pitchWhite, { roughness: 0.52, level: "satin" });
  const inner = foam(PALETTE.chalk);
  const wrap = (x) => Math.abs(x) * 0.35;

  const xs = [-0.4, -0.26, -0.13, 0, 0.13, 0.26, 0.4];
  const ws = [0.18, 0.14, 0.135, 0.15, 0.135, 0.14, 0.18];
  xs.forEach((x, i) => {
    add(g, new RoundedBoxGeometry(ws[i], 1.42, 0.32, 5, 0.07), face, [x * hand, -0.58, wrap(x)]);
  });

  for (const [i, y] of [0.22, 0.46, 0.7].entries()) {
    add(
      g,
      new THREE.CapsuleGeometry(0.2 - i * 0.012, 0.84, 8, 20),
      face,
      [0, y, 0.18],
      [0, 0, Math.PI / 2],
      [1, 1, 0.95]
    );
  }

  for (const [x, w] of [
    [-0.3, 0.22],
    [-0.14, 0.18],
    [0, 0.2],
    [0.14, 0.18],
    [0.3, 0.22],
  ]) {
    add(g, new RoundedBoxGeometry(w, 0.7, 0.26, 4, 0.08), face, [x * hand, 1.08, wrap(x) * 0.7]);
  }
  add(g, new RoundedBoxGeometry(0.72, 0.22, 0.24, 4, 0.1), face, [0, 1.42, 0.02]);

  add(g, new RoundedBoxGeometry(0.055, 2.55, 0.34, 3, 0.02), trim, [-0.5 * hand, 0.02, 0.02]);
  add(g, new RoundedBoxGeometry(0.055, 2.35, 0.34, 3, 0.02), trim, [0.5 * hand, -0.08, 0.02]);
  add(g, new RoundedBoxGeometry(0.78, 0.3, 0.24, 4, 0.09), face, [0, -1.38, 0.04], [0.38, 0, 0]);
  add(g, new RoundedBoxGeometry(0.22, 0.1, 0.05, 2, 0.02), accent, [0, -1.22, 0.18]);
  add(g, new RoundedBoxGeometry(0.72, 2.15, 0.1, 4, 0.05), inner, [0, 0.02, -0.2]);

  for (const y of [0.52, -0.22, -0.92]) {
    add(g, new RoundedBoxGeometry(1.18, 0.11, 0.05, 3, 0.02), strap, [0.04 * hand, y, -0.3]);
    add(g, new RoundedBoxGeometry(0.42, 0.035, 0.02, 2, 0.005), accent, [0.04 * hand, y, -0.33]);
    add(g, new RoundedBoxGeometry(0.09, 0.12, 0.06, 2, 0.02), trim, [0.55 * hand, y, -0.3]);
  }
  return g;
}

export function cricketPad() {
  const group = new THREE.Group();
  const left = oneCricketPad(-1);
  left.position.set(-0.62, 0.04, 0);
  left.rotation.y = 0.34;
  const right = oneCricketPad(1);
  right.position.set(0.62, 0.04, 0);
  right.rotation.y = -0.34;
  group.add(left, right);
  return group;
}

export function footballShinGuard() {
  if (shinTemplate) return shinTemplate.clone(true);
  return shinGuard();
}

export function shinGuard() {
  const group = new THREE.Group();
  const left = oneShinGuard(-1);
  left.position.set(-0.48, 0.08, 0);
  left.rotation.y = 0.28;
  const right = oneShinGuard(1);
  right.position.set(0.48, 0.08, 0);
  right.rotation.y = -0.28;
  group.add(left, right);
  return group;
}

/* --------------------------------------------------------------- Dumbbell */
export function dumbbell() {
  const group = new THREE.Group();

  add(
    group,
    new THREE.CylinderGeometry(0.115, 0.115, 1.1, 28),
    materials.chrome,
    [0, 0, 0],
    [0, 0, Math.PI / 2]
  );
  add(
    group,
    new THREE.CylinderGeometry(0.125, 0.125, 0.66, 40),
    materials.knurledSteel,
    [0, 0, 0],
    [0, 0, Math.PI / 2]
  );

  const headProfile = [
    new THREE.Vector2(0.001, -0.24),
    new THREE.Vector2(0.24, -0.24),
    new THREE.Vector2(0.42, -0.17),
    new THREE.Vector2(0.46, -0.06),
    new THREE.Vector2(0.46, 0.06),
    new THREE.Vector2(0.42, 0.17),
    new THREE.Vector2(0.24, 0.24),
    new THREE.Vector2(0.001, 0.24),
  ];

  for (const dir of [-1, 1]) {
    add(
      group,
      new THREE.LatheGeometry(headProfile, 12),
      materials.urethane,
      [dir * 0.72, 0, 0],
      [0, dir > 0 ? 0 : Math.PI, Math.PI / 2]
    );
    // Weight-marking ring.
    add(
      group,
      new THREE.TorusGeometry(0.44, 0.022, 10, 12),
      polymer(PALETTE.signalOrange, { roughness: 0.3, clearcoat: 0.7 }),
      [dir * 0.72, 0, 0],
      [0, 0, Math.PI / 2]
    );
    add(
      group,
      new THREE.CylinderGeometry(0.17, 0.2, 0.1, 20),
      materials.brushedSteel,
      [dir * 0.53, 0, 0],
      [0, 0, Math.PI / 2]
    );
  }

  return group;
}

/* ------------------------------------------------------------- Kettlebell */
export function kettlebell() {
  const group = new THREE.Group();

  const profile = [
    new THREE.Vector2(0.001, -0.78),
    new THREE.Vector2(0.42, -0.78),
    new THREE.Vector2(0.46, -0.74),
  ];
  for (let i = 0; i <= 22; i++) {
    const a = -Math.PI * 0.42 + (i / 22) * Math.PI * 0.86;
    profile.push(new THREE.Vector2(Math.cos(a) * 0.62 + 0.02, Math.sin(a) * 0.6 - 0.18));
  }
  profile.push(new THREE.Vector2(0.3, 0.28), new THREE.Vector2(0.24, 0.34), new THREE.Vector2(0.001, 0.34));

  add(group, new THREE.LatheGeometry(profile, 56), materials.castIron);

  // Handle arch, squared at the top the way competition bells are.
  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.29, 0.24, 0),
    new THREE.Vector3(-0.33, 0.52, 0),
    new THREE.Vector3(-0.3, 0.78, 0),
    new THREE.Vector3(-0.14, 0.9, 0),
    new THREE.Vector3(0.14, 0.9, 0),
    new THREE.Vector3(0.3, 0.78, 0),
    new THREE.Vector3(0.33, 0.52, 0),
    new THREE.Vector3(0.29, 0.24, 0),
  ]);
  add(group, new THREE.TubeGeometry(handleCurve, 72, 0.085, 20, false), materials.castIron);

  // Competition weight band — green is the 24 kg code.
  add(
    group,
    new THREE.TorusGeometry(0.6, 0.03, 12, 60),
    polymer(PALETTE.emerald, { roughness: 0.35, clearcoat: 0.6 }),
    [0, -0.2, 0],
    [Math.PI / 2, 0, 0]
  );

  return group;
}

/* -------------------------------------------------------- Agility hardware */
export function cone() {
  const group = new THREE.Group();

  const coneMat = polymer(PALETTE.signalOrange, { roughness: 0.45, clearcoat: 0.35 });
  add(group, new THREE.ConeGeometry(0.34, 0.9, 28, 4, true), coneMat, [0, 0.05, 0]);
  add(group, new THREE.BoxGeometry(0.86, 0.05, 0.86), coneMat, [0, -0.38, 0]);
  add(
    group,
    new THREE.TorusGeometry(0.22, 0.02, 8, 28),
    polymer(PALETTE.pitchWhite, { roughness: 0.4 }),
    [0, 0.02, 0],
    [Math.PI / 2, 0, 0]
  );

  const hurdleMat = polymer(PALETTE.volt, { roughness: 0.4, clearcoat: 0.4 });
  const hurdle = new THREE.Group();
  for (const dir of [-1, 1]) {
    add(hurdle, new THREE.BoxGeometry(0.05, 0.5, 0.05), hurdleMat, [dir * 0.42, 0.05, 0]);
    add(hurdle, new THREE.BoxGeometry(0.06, 0.04, 0.34), hurdleMat, [dir * 0.42, -0.19, 0]);
  }
  add(hurdle, new THREE.BoxGeometry(0.92, 0.05, 0.05), hurdleMat, [0, 0.28, 0]);
  hurdle.position.set(0.05, -0.2, -0.75);
  group.add(hurdle);

  for (let i = 0; i < 3; i++) {
    add(
      group,
      new THREE.CylinderGeometry(0.16, 0.17, 0.02, 24),
      polymer(PALETTE.sulphur, { roughness: 0.45 }),
      [-0.75 + i * 0.16, -0.4, 0.6 - i * 0.28]
    );
  }

  return group;
}

/* --------------------------------------------------------- Tennis racket */
export function tennisRacket() {
  const group = new THREE.Group();
  const frameMat = polymer(PALETTE.graphite, { roughness: 0.28, clearcoat: 0.85 });
  const accentMat = polymer(PALETTE.volt, { roughness: 0.3, clearcoat: 0.8 });
  const stringMat = polymer(0xf2f2f2, { roughness: 0.45, clearcoat: 0.3 });
  const gripMat = polymer(PALETTE.jetBlack, { roughness: 0.75, clearcoat: 0.1 });

  const a = 0.62; // head half-width
  const b = 0.82; // head half-height
  const cy = 0.72; // head centre height

  // Elliptical frame.
  const framePts = [];
  for (let i = 0; i < 96; i++) {
    const t = (i / 96) * Math.PI * 2;
    framePts.push(new THREE.Vector3(Math.sin(t) * a, cy + Math.cos(t) * b, 0));
  }
  add(
    group,
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(framePts, true), 220, 0.046, 14, true),
    frameMat
  );

  // Bumper guard across the crown.
  const bumper = [];
  for (let i = 0; i <= 30; i++) {
    const t = -0.55 + (i / 30) * 1.1;
    bumper.push(new THREE.Vector3(Math.sin(t) * a, cy + Math.cos(t) * b, 0));
  }
  add(
    group,
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bumper), 60, 0.054, 12, false),
    accentMat
  );

  // String bed. Length of each string is set by the ellipse it has to span.
  const inset = 0.05;
  const ai = a - inset;
  const bi = b - inset;
  const sr = 0.0075;

  for (let i = 1; i < 16; i++) {
    const x = -ai + 2 * ai * (i / 16);
    const h = 2 * bi * Math.sqrt(Math.max(0, 1 - (x / ai) ** 2));
    if (h < 0.05) continue;
    add(group, new THREE.CylinderGeometry(sr, sr, h, 6), stringMat, [x, cy, -0.008]);
  }
  for (let i = 1; i < 19; i++) {
    const y = -bi + 2 * bi * (i / 19);
    const w = 2 * ai * Math.sqrt(Math.max(0, 1 - (y / bi) ** 2));
    if (w < 0.05) continue;
    add(
      group,
      new THREE.CylinderGeometry(sr, sr, w, 6),
      stringMat,
      [0, cy + y, 0.008],
      [0, 0, Math.PI / 2]
    );
  }

  // Throat struts running from the head shoulders into the shaft.
  for (const dir of [-1, 1]) {
    const strut = new THREE.CatmullRomCurve3([
      new THREE.Vector3(dir * a * 0.55, cy - b * 0.835, 0),
      new THREE.Vector3(dir * 0.3, -0.12, 0),
      new THREE.Vector3(dir * 0.075, -0.34, 0),
    ]);
    add(group, new THREE.TubeGeometry(strut, 40, 0.044, 12, false), frameMat);
  }

  // Shaft, octagonal grip and butt cap.
  add(group, new THREE.CylinderGeometry(0.078, 0.086, 0.42, 18), frameMat, [0, -0.5, 0]);
  add(group, new THREE.CylinderGeometry(0.104, 0.098, 0.74, 8), gripMat, [0, -0.9, 0]);

  // Overgrip spiral.
  const wrap = [];
  for (let i = 0; i <= 80; i++) {
    const t = i / 80;
    const ang = t * Math.PI * 7;
    wrap.push(new THREE.Vector3(Math.cos(ang) * 0.101, -0.55 - t * 0.66, Math.sin(ang) * 0.101));
  }
  add(
    group,
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wrap), 160, 0.014, 6, false),
    polymer(PALETTE.graphite, { roughness: 0.8, clearcoat: 0.05 })
  );

  add(group, new THREE.CylinderGeometry(0.122, 0.114, 0.07, 8), accentMat, [0, -1.3, 0]);

  group.rotation.set(0.2, 0.55, -0.15);
  return group;
}

/* ----------------------------------------------------------- Tennis ball */
export function tennisBall() {
  const group = new THREE.Group();

  add(group, new THREE.SphereGeometry(1, 72, 48), materials.tennisFelt);

  // The classic two-panel seam is a closed curve that lies exactly on the
  // unit sphere, so it wraps the ball without any fitting.
  const seam = [];
  const steps = 220;
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    seam.push(
      new THREE.Vector3(
        (0.75 * Math.cos(t) + 0.25 * Math.cos(3 * t)) * 1.004,
        (0.75 * Math.sin(t) - 0.25 * Math.sin(3 * t)) * 1.004,
        (Math.sqrt(3) / 2) * Math.sin(2 * t) * 1.004
      )
    );
  }
  add(
    group,
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(seam, true), 400, 0.036, 10, true),
    polymer(0xf6f6f2, { roughness: 0.85, clearcoat: 0.05 })
  );

  return group;
}

/* ------------------------------------------------------------- Registry */
export const MODEL_FACTORIES = {
  ballThermo,
  ballClassic,
  ballFutsal,
  ballVolley,
  ballBasket,
  rugby,
  cricketBall,
  cricketBat,
  hockeyStick,
  boxingGlove,
  mmaGlove,
  gkGlove,
  punchBag,
  shinGuard,
  footballShinGuard,
  cricketPad,
  dumbbell,
  kettlebell,
  cone,
  tennisRacket,
  tennisBall,
};

export const MODEL_KEYS = Object.keys(MODEL_FACTORIES);

/**
 * Builds a model by key, centred on the origin and scaled to `radius`.
 * Falls back to the flagship match ball if the key is unknown.
 */
export function createModel(key, radius = 1) {
  const factory = MODEL_FACTORIES[key] || ballThermo;
  const model = factory();
  normalizeObject(model, radius);
  return model;
}
