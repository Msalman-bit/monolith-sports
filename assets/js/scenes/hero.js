/* ==========================================================================
   Home hero
   A flagship product on a slow turntable, ringed by orbiting satellites.
   Scrolling dollies the camera through the ring and opens it outwards.
   ========================================================================== */

import * as THREE from "three";
import { Stage, pointer, clamp, damp, hasWebGL, REDUCED_MOTION } from "../lib/gl.js";
import { createModel } from "../lib/models.js";
import { showFallback } from "./tiles.js";

// Flagship football in the centre, ringed by the five catalogue lines.
const SATELLITES = [
  { key: "boxingGlove", radius: 0.52, angle: 0.0, y: 1.1, spin: 0.32 },
  { key: "boxingGlove", radius: 0.4, angle: 0.58, y: -0.65, spin: -0.28 },
  { key: "ballClassic", radius: 0.42, angle: 0.95, y: 0.85, spin: 0.3 },
  { key: "tennisRacket", radius: 0.48, angle: 1.256, y: -1.0, spin: 0.22 },
  { key: "tennisRacket", radius: 0.38, angle: 1.52, y: 0.35, spin: -0.2 },
  { key: "tennisBall", radius: 0.26, angle: 1.82, y: 1.05, spin: 0.62 },
  { key: "footballShinGuard", radius: 0.62, angle: 2.513, y: 0.75, spin: -0.26 },
  { key: "ballClassic", radius: 0.36, angle: 2.85, y: -0.95, spin: -0.28 },
  { key: "boxingGlove", radius: 0.38, angle: 3.15, y: 1.2, spin: 0.26 },
  { key: "tennisRacket", radius: 0.36, angle: 3.45, y: -0.2, spin: 0.18 },
  { key: "cricketPad", radius: 0.55, angle: 3.77, y: -0.85, spin: 0.24 },
  { key: "tennisBall", radius: 0.24, angle: 4.4, y: -0.35, spin: -0.48 },
  { key: "tennisBall", radius: 0.3, angle: 5.027, y: 0.55, spin: 0.55 },
];

export function initHero(mount) {
  if (!mount) return null;
  if (!hasWebGL()) {
    showFallback(mount);
    return null;
  }

  let stage;
  try {
    stage = new Stage(mount, {
      alpha: true,
      fov: 38,
      cameraPos: [0, 0, 7.6],
      exposure: 1.12,
      envIntensity: 1.15,
      far: 200,
    });
  } catch (err) {
    console.error("Hero scene failed", err);
    showFallback(mount);
    return null;
  }

  const world = new THREE.Group();
  stage.scene.add(world);

  const ring = new THREE.Group();
  // Sat back from the camera so the near arc of the ring cannot swing into
  // the header or loom over the headline.
  ring.position.z = -2.1;
  world.add(ring);

  // Centrepiece.
  const heroPivot = new THREE.Group();
  const heroModel = createModel("ballClassic", 1.05 * 2);
  heroPivot.add(heroModel);
  world.add(heroPivot);

  // Orbiting products.
  const satellites = SATELLITES.map((cfg) => {
    const holder = new THREE.Group();
    const model = createModel(cfg.key, cfg.radius * 2);
    model.rotation.set(Math.random() * 0.6, Math.random() * Math.PI * 2, Math.random() * 0.4);
    holder.add(model);
    ring.add(holder);
    return { ...cfg, holder, model, wobble: Math.random() * Math.PI * 2 };
  });

  let progress = 0;
  let ringRadius = 4.5;

  stage.onUpdate((dt, t) => {
    const vh = window.innerHeight || 1;
    const target = clamp(window.scrollY / vh, 0, 1);
    progress = damp(progress, target, 8, dt);

    const spinScale = REDUCED_MOTION ? 0 : 1;

    // Camera pushes in and lifts as the page scrolls away from the hero.
    stage.camera.position.z = 7.6 - progress * 3.0;
    stage.camera.position.y = progress * 1.5;
    stage.camera.lookAt(0, progress * 0.35, 0);

    // Mouse parallax.
    world.rotation.y = damp(world.rotation.y, pointer.sx * 0.16 + progress * 0.7, 3, dt);
    world.rotation.x = damp(world.rotation.x, -pointer.sy * 0.1 + progress * 0.18, 3, dt);

    heroPivot.rotation.y += dt * 0.24 * spinScale + progress * dt * 1.1;
    heroPivot.rotation.z = Math.sin(t * 0.4) * 0.05 * spinScale;
    heroPivot.position.y = Math.sin(t * 0.6) * 0.09 * spinScale - progress * 0.5;
    heroPivot.scale.setScalar(1 - progress * 0.22);

    // The ring opens outward and tilts as you scroll.
    ringRadius = damp(ringRadius, 4.5 + progress * 2.2, 4, dt);
    ring.rotation.y += dt * 0.055 * spinScale;
    ring.rotation.x = damp(ring.rotation.x, -0.12 - progress * 0.3, 3, dt);

    satellites.forEach((sat, i) => {
      const a = sat.angle;
      sat.holder.position.set(
        Math.cos(a) * ringRadius,
        sat.y + Math.sin(t * 0.7 + sat.wobble) * 0.14 * spinScale,
        Math.sin(a) * ringRadius
      );
      sat.holder.rotation.y += dt * sat.spin * spinScale;
      sat.holder.rotation.x = Math.sin(t * 0.45 + i) * 0.16 * spinScale;
    });
  });

  return stage;
}
