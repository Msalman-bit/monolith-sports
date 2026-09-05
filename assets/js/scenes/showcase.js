/* ==========================================================================
   Scroll-driven showcase
   A pinned canvas holds a row of products. Vertical scrolling slides the row
   sideways, spins each product through a full turn and swaps the copy panel.
   ========================================================================== */

import * as THREE from "three";
import {
  Stage,
  pointer,
  clamp,
  damp,
  lerp,
  hasWebGL,
  REDUCED_MOTION,
} from "../lib/gl.js";
import { createModel } from "../lib/models.js";
import { showFallback } from "./tiles.js";

const SPACING = 5.2;

export function initShowcase(section) {
  if (!section) return null;

  const mount = section.querySelector("[data-scene-canvas]");
  const sticky = section.querySelector(".scrollscene__sticky");
  const steps = Array.from(section.querySelectorAll(".scrollstep[data-model]"));
  const bar = section.querySelector(".scrollscene__bar i");
  const counter = section.querySelector("[data-scene-counter]");
  if (!mount || steps.length === 0) return null;

  const cards = pinCards(sticky, steps);

  const entries = steps.map((step) => ({
    el: step,
    key: step.dataset.model || "ballThermo",
    radius: parseFloat(step.dataset.radius || "1.35"),
  }));

  if (!hasWebGL()) {
    showFallback(mount);
    cards[0]?.classList.add("is-active");
    return null;
  }

  let stage;
  try {
    stage = new Stage(mount, {
      alpha: true,
      fov: 34,
      cameraPos: [0, 0, 8],
      exposure: 1.1,
      envIntensity: 1.1,
      preserveDrawingBuffer: true,
      rootMargin: "100% 0px",
    });
  } catch (err) {
    console.error("Showcase scene failed", err);
    showFallback(mount);
    cards[0]?.classList.add("is-active");
    return null;
  }

  stage.visible = true;

  const rail = new THREE.Group();
  stage.scene.add(rail);

  const blit = attachBlit(stage, mount);

  const items = entries.map((entry, i) => {
    const holder = new THREE.Group();
    holder.position.x = i * SPACING;
    const model = createModel(entry.key, entry.radius * 1.5);
    holder.add(model);
    rail.add(holder);
    return { ...entry, holder, model };
  });

  const maxRadius = items.reduce((m, item) => Math.max(m, item.radius), 1.35);
  const fitRail = () => {
    const vFov = (stage.camera.fov * Math.PI) / 180;
    const dist = Math.abs(stage.camera.position.z) || 8;
    const viewH = 2 * Math.tan(vFov / 2) * dist;
    rail.scale.setScalar(Math.min(1, (viewH * 0.66) / (maxRadius * 2)));
  };
  fitRail();
  stage.opts.onResize = fitRail;

  const offsetFor = () => (window.innerWidth >= 1000 ? 1.55 : 0);
  const lastIdx = Math.max(1, items.length - 1);
  const targetOf = (progress) => progress * (lastIdx + 1.5) - 1;
  let smoothIndex = targetOf(showcaseTravel(section));
  if (!Number.isFinite(smoothIndex)) smoothIndex = -1;
  let activeIndex = -1;

  const setActive = (index) => {
    steps.forEach((step, i) => step.classList.toggle("is-active", i === index));
    cards.forEach((card, i) => {
      const on = i === index;
      card.classList.toggle("is-active", on);
      card.toggleAttribute("inert", !on);
    });
    if (counter) {
      counter.textContent = `${String(index + 1).padStart(2, "0")} / ${String(
        items.length
      ).padStart(2, "0")}`;
    }
  };

  stage.onUpdate((dt, t) => {
    stage.visible = true;
    const travel = showcaseTravel(section);
    const progress = clamp(travel, 0, 1);
    const target = Number.isFinite(travel) ? targetOf(travel) : -1;
    smoothIndex = damp(smoothIndex, target, 8, dt);
    if (!Number.isFinite(smoothIndex)) smoothIndex = target;

    rail.position.x = -smoothIndex * SPACING + offsetFor();
    rail.position.y = Math.sin(t * 0.5) * 0.06;

    stage.camera.position.x = pointer.sx * 0.35;
    stage.camera.position.y = 0.2 + pointer.sy * 0.25;
    stage.camera.lookAt(offsetFor() * 0.35, 0, 0);

    items.forEach((item, i) => {
      const distance = i - smoothIndex;
      const focus = clamp(1 - Math.abs(distance), 0, 1);
      const enter = clamp(distance, 0, 1.15);
      const leave = clamp(-distance, 0, 1.15);
      item.holder.visible = distance < 1.45 && distance > -1.45;

      item.holder.rotation.y = REDUCED_MOTION
        ? 0.6
        : -distance * Math.PI * 1.2 + t * 0.12 + 0.4;
      item.holder.rotation.x = lerp(0.18, 0.02, focus) * Math.sign(distance || 1);
      item.holder.position.x = i * SPACING + enter * 1.55;
      item.holder.position.y =
        enter * 1.15 - leave * 0.18 + Math.sin(t * 0.8 + i) * 0.04;
      item.holder.position.z = enter * 1.5 - leave * 1.2;
      item.holder.scale.setScalar(1 + enter * 0.55 - leave * 0.38);
    });

    const index = clamp(Math.round(target), 0, lastIdx);
    if (index !== activeIndex) {
      activeIndex = index;
      setActive(index);
    }
    if (bar) bar.style.width = `${progress * 100}%`;
  });

  setActive(clamp(Math.round(smoothIndex), 0, lastIdx));
  stage.onAfterRender(() => blit());

  return stage;
}

/** 0 when the section peeks in from the bottom (first item starts entering).
 *  1 when the pin releases. >1 as the last item continues off the left. */
function showcaseTravel(section) {
  const r = section.getBoundingClientRect();
  const vh = window.innerHeight || 1;
  const scrollable = r.height - vh;
  if (scrollable <= 0) return 0;
  return (vh - r.top) / (vh + scrollable);
}

function pinCards(sticky, steps) {
  const cards = steps
    .map((step) => step.querySelector(".scrollstep__card"))
    .filter(Boolean);
  if (!sticky) return cards;
  cards.forEach((card) => sticky.appendChild(card));
  const syncHeight = () => equalizeCardHeights(cards);
  syncHeight();
  window.addEventListener("resize", syncHeight, { passive: true });
  return cards;
}

function equalizeCardHeights(cards) {
  if (!cards.length) return;
  cards.forEach((card) => {
    card.style.minHeight = "";
    card.style.opacity = "0";
    card.style.visibility = "hidden";
  });
  const height = Math.max(...cards.map((card) => card.offsetHeight), 0);
  cards.forEach((card) => {
    card.style.opacity = "";
    card.style.visibility = "";
    if (height) card.style.minHeight = `${height}px`;
  });
}

function attachBlit(stage, mount) {
  const blit = document.createElement("canvas");
  blit.setAttribute("aria-hidden", "true");
  blit.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;";
  mount.appendChild(blit);
  const ctx = blit.getContext("2d");
  stage.canvas.style.position = "absolute";
  stage.canvas.style.inset = "0";
  stage.canvas.style.opacity = "0";
  stage.canvas.style.pointerEvents = "none";

  return () => {
    const w = stage.canvas.width;
    const h = stage.canvas.height;
    if (!w || !h) return;
    if (blit.width !== w || blit.height !== h) {
      blit.width = w;
      blit.height = h;
    }
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(stage.canvas, 0, 0);
  };
}
