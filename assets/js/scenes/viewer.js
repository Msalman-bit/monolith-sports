/* ==========================================================================
   Product viewer
   Drag-to-orbit inspection of a single product, with a turntable that stops
   the moment the visitor takes control.
   ========================================================================== */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Stage, hasWebGL, REDUCED_MOTION } from "../lib/gl.js";
import { createModel } from "../lib/models.js";
import { showFallback } from "./tiles.js";

export function initViewer(mount, modelKey, options = {}) {
  if (!mount) return null;
  if (!hasWebGL()) {
    showFallback(mount);
    return null;
  }

  const { distance = 4.6, radius = 1.35 } = options;

  let stage;
  try {
    stage = new Stage(mount, {
      alpha: true,
      fov: 32,
      cameraPos: [0.8, 0.7, distance],
      exposure: 1.12,
      envIntensity: 1.15,
    });
  } catch (err) {
    console.error("Viewer failed", err);
    showFallback(mount);
    return null;
  }

  const pivot = new THREE.Group();
  const model = createModel(modelKey, radius);
  pivot.add(model);
  stage.scene.add(pivot);

  const controls = new OrbitControls(stage.camera, stage.renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.minDistance = distance * 0.6;
  controls.maxDistance = distance * 1.9;
  controls.rotateSpeed = 0.85;
  controls.zoomSpeed = 0.7;
  controls.autoRotate = !REDUCED_MOTION;
  controls.autoRotateSpeed = 1.15;

  let idleTimer = null;
  const pauseSpin = () => {
    controls.autoRotate = false;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!REDUCED_MOTION) controls.autoRotate = true;
    }, 3200);
  };
  controls.addEventListener("start", pauseSpin);
  controls.addEventListener("change", pauseSpin);

  stage.onUpdate(() => controls.update());

  return {
    stage,
    controls,
    model,
    reset() {
      stage.camera.position.set(0.8, 0.7, distance);
      controls.target.set(0, 0, 0);
      controls.update();
    },
    toggleSpin() {
      controls.autoRotate = !controls.autoRotate;
      return controls.autoRotate;
    },
    swap(nextKey) {
      pivot.clear();
      pivot.add(createModel(nextKey, radius));
    },
  };
}
