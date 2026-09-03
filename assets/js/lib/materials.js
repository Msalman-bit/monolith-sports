/* ==========================================================================
   Procedural product materials
   The site chrome is strictly black and white — the products are not.
   Every texture is drawn on a <canvas> at runtime, so no image assets ship.
   ========================================================================== */

import * as THREE from "three";

/* ------------------------------------------------------------- Palette */
export const PALETTE = {
  pitchWhite: 0xf4f4f0,
  chalk: 0xe4e4de,
  jetBlack: 0x131313,
  graphite: 0x2a2a2e,
  slate: 0x5a5f66,

  electricBlue: 0x1462ff,
  deepNavy: 0x11224a,
  cyan: 0x00b8d4,
  teal: 0x0f8a7e,

  volt: 0xcaff2b,
  sulphur: 0xf2d024,
  signalOrange: 0xff5a1f,
  basketTan: 0xc2662d,

  crimson: 0xc8102e,
  cricketRed: 0x8e1B18,
  wine: 0x6d1220,
  magenta: 0xd6006e,
  purple: 0x6b3fa0,
  emerald: 0x159a52,

  gold: 0xc79a3b,
  willowCream: 0xe9dcbc,
  willowShade: 0xc9b489,
};

const hexToRGB = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];

const cache = new Map();

function cached(key, factory) {
  if (!cache.has(key)) cache.set(key, factory());
  return cache.get(key);
}

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function toTexture(canvas, { srgb = false, repeat = [1, 1], aniso = 8 } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = aniso;
  tex.needsUpdate = true;
  return tex;
}

/* ------------------------------------------------------------ Noise field */
function valueNoise(seed = 1) {
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = base[i & 255];

  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (hash, x, y) => {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  };

  return (x, y) => {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const aa = perm[perm[xi] + yi];
    const ab = perm[perm[xi] + yi + 1];
    const ba = perm[perm[xi + 1] + yi];
    const bb = perm[perm[xi + 1] + yi + 1];
    const x1 = grad(aa, xf, yf) * (1 - u) + grad(ba, xf - 1, yf) * u;
    const x2 = grad(ab, xf, yf - 1) * (1 - u) + grad(bb, xf - 1, yf - 1) * u;
    return (x1 * (1 - v) + x2 * v) * 0.5 + 0.5;
  };
}

function fbm(noise, x, y, octaves = 4) {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    value += noise(x * freq, y * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return value / norm;
}

/* ------------------------------------------------- Sphere panel geometry */
function normalize(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function icosahedronVertices() {
  const t = (1 + Math.sqrt(5)) / 2;
  const raw = [];
  for (const a of [-1, 1]) {
    for (const b of [-1, 1]) {
      raw.push([0, a, b * t], [a, b * t, 0], [a * t, 0, b]);
    }
  }
  return raw.map(normalize);
}

/** The 32 Voronoi seeds whose cells form a truncated icosahedron (a football). */
function truncatedIcosahedronSeeds() {
  const verts = icosahedronVertices();
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  let minEdge = Infinity;
  for (let i = 0; i < verts.length; i++) {
    for (let j = i + 1; j < verts.length; j++) {
      minEdge = Math.min(minEdge, dist(verts[i], verts[j]));
    }
  }

  const faces = [];
  const eps = minEdge * 1.08;
  for (let i = 0; i < verts.length; i++) {
    for (let j = i + 1; j < verts.length; j++) {
      if (dist(verts[i], verts[j]) > eps) continue;
      for (let k = j + 1; k < verts.length; k++) {
        if (dist(verts[j], verts[k]) > eps || dist(verts[i], verts[k]) > eps) continue;
        faces.push(
          normalize([
            verts[i][0] + verts[j][0] + verts[k][0],
            verts[i][1] + verts[j][1] + verts[k][1],
            verts[i][2] + verts[j][2] + verts[k][2],
          ])
        );
      }
    }
  }

  // Pentagons sit on the icosahedron vertices, hexagons on its face centres.
  return { seeds: [...verts, ...faces], pentagonCount: verts.length };
}

/**
 * Renders a spherical Voronoi panel layout into an equirectangular texture,
 * which is exactly the UV layout THREE.SphereGeometry expects.
 */
function panelMaps({
  seeds,
  panelColor,
  size = 1024,
  seamWidth = 0.04,
  seamColor = 0x0d0d0d,
  grain = 0.05,
  seed = 7,
  overlay = null,
}) {
  const w = size;
  const h = size / 2;
  const colorCanvas = makeCanvas(w, h);
  const bumpCanvas = makeCanvas(w, h);
  const cctx = colorCanvas.getContext("2d");
  const bctx = bumpCanvas.getContext("2d");
  const cimg = cctx.createImageData(w, h);
  const bimg = bctx.createImageData(w, h);
  const noise = valueNoise(seed);
  const seamRGB = hexToRGB(seamColor);

  const n = seeds.length;
  const sx = new Float32Array(n);
  const sy = new Float32Array(n);
  const sz = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    sx[i] = seeds[i][0];
    sy[i] = seeds[i][1];
    sz[i] = seeds[i][2];
  }

  const panelRGB = [];
  for (let i = 0; i < n; i++) panelRGB.push(hexToRGB(panelColor(i)));

  for (let y = 0; y < h; y++) {
    const phi = ((y + 0.5) / h) * Math.PI;
    const cy = Math.cos(phi);
    const sr = Math.sin(phi);
    for (let x = 0; x < w; x++) {
      const theta = ((x + 0.5) / w) * Math.PI * 2;
      const dx = sr * Math.sin(theta);
      const dz = sr * Math.cos(theta);

      let best = -2;
      let second = -2;
      let bestIdx = 0;
      for (let i = 0; i < n; i++) {
        const d = dx * sx[i] + cy * sy[i] + dz * sz[i];
        if (d > best) {
          second = best;
          best = d;
          bestIdx = i;
        } else if (d > second) {
          second = d;
        }
      }

      // Distance to the nearest cell boundary. `gap` is negative inside a
      // panel and reaches zero exactly on the boundary, so the seam is drawn
      // where -gap is small.
      const gap = Math.acos(Math.min(1, best)) - Math.acos(Math.min(1, second));
      const seamT = Math.max(0, Math.min(1, -gap / seamWidth));

      const g = (fbm(noise, x * 0.09, y * 0.09, 3) - 0.5) * grain * 255;
      const base = panelRGB[bestIdx];
      let r = base[0] + g;
      let gg = base[1] + g;
      let b = base[2] + g;
      let bump = 190 + g * 2;

      if (seamT < 1) {
        const k = 1 - seamT;
        r = r * (1 - k) + seamRGB[0] * k;
        gg = gg * (1 - k) + seamRGB[1] * k;
        b = b * (1 - k) + seamRGB[2] * k;
        bump = bump * (1 - k) + 40 * k;
      }

      const idx = (y * w + x) * 4;
      cimg.data[idx] = Math.max(0, Math.min(255, r));
      cimg.data[idx + 1] = Math.max(0, Math.min(255, gg));
      cimg.data[idx + 2] = Math.max(0, Math.min(255, b));
      cimg.data[idx + 3] = 255;

      const bv = Math.max(0, Math.min(255, bump));
      bimg.data[idx] = bv;
      bimg.data[idx + 1] = bv;
      bimg.data[idx + 2] = bv;
      bimg.data[idx + 3] = 255;
    }
  }

  cctx.putImageData(cimg, 0, 0);
  bctx.putImageData(bimg, 0, 0);
  if (overlay) overlay(cctx, w, h);

  return { colorCanvas, bumpCanvas };
}

/* --------------------------------------------------------- Ball textures */

/** Apex Pro: white 12-panel match ball with printed blue and orange graphics. */
export function thermoBallMaps() {
  return cached("ball-thermo", () => {
    const seeds = icosahedronVertices();
    const { colorCanvas, bumpCanvas } = panelMaps({
      seeds,
      panelColor: () => PALETTE.pitchWhite,
      seamWidth: 0.05,
      seamColor: 0x1a1a1a,
      grain: 0.04,
      seed: 12,
      overlay: (ctx, w, h) => {
        ctx.lineCap = "round";
        const arcs = [
          { color: "#1462ff", width: h * 0.075, phase: 0.0, amp: 0.2 },
          { color: "#0b3fae", width: h * 0.03, phase: 0.16, amp: 0.2 },
          { color: "#ff5a1f", width: h * 0.045, phase: 0.55, amp: -0.24 },
          { color: "#1462ff", width: h * 0.025, phase: 0.72, amp: -0.24 },
        ];
        for (const a of arcs) {
          ctx.strokeStyle = a.color;
          ctx.lineWidth = a.width;
          ctx.beginPath();
          for (let x = 0; x <= w; x += 3) {
            const t = x / w;
            const y = h * (0.5 + a.amp * Math.sin((t + a.phase) * Math.PI * 2));
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      },
    });
    return { map: toTexture(colorCanvas, { srgb: true }), bumpMap: toTexture(bumpCanvas) };
  });
}

/** Heritage 32: the classic black-and-white hand-stitched football. */
export function classicBallMaps() {
  return cached("ball-classic", () => {
    const { seeds, pentagonCount } = truncatedIcosahedronSeeds();
    const { colorCanvas, bumpCanvas } = panelMaps({
      seeds,
      panelColor: (i) => (i < pentagonCount ? PALETTE.jetBlack : PALETTE.pitchWhite),
      seamWidth: 0.055,
      seamColor: 0x111111,
      grain: 0.05,
    });
    return { map: toTexture(colorCanvas, { srgb: true }), bumpMap: toTexture(bumpCanvas) };
  });
}

/** Vector Futsal: volt yellow with navy accent panels. */
export function futsalBallMaps() {
  return cached("ball-futsal", () => {
    const { seeds, pentagonCount } = truncatedIcosahedronSeeds();
    const { colorCanvas, bumpCanvas } = panelMaps({
      seeds,
      panelColor: (i) => {
        if (i < pentagonCount) return PALETTE.deepNavy;
        return i % 3 === 0 ? PALETTE.signalOrange : PALETTE.volt;
      },
      seamWidth: 0.04,
      seamColor: 0x101828,
      grain: 0.08,
      seed: 21,
    });
    return { map: toTexture(colorCanvas, { srgb: true }), bumpMap: toTexture(bumpCanvas) };
  });
}

/** Court Series volleyball: white, royal blue and yellow strip clusters. */
export function volleyballMaps() {
  return cached("ball-volley", () => {
    const size = 1024;
    const w = size;
    const h = size / 2;
    const colorCanvas = makeCanvas(w, h);
    const bumpCanvas = makeCanvas(w, h);
    const cctx = colorCanvas.getContext("2d");
    const bctx = bumpCanvas.getContext("2d");
    const noise = valueNoise(31);

    cctx.fillStyle = "#f2f2ec";
    cctx.fillRect(0, 0, w, h);
    bctx.fillStyle = "#c0c0c0";
    bctx.fillRect(0, 0, w, h);

    const stripColors = ["#f2f2ec", "#1b45a8", "#f2c400"];
    for (let group = 0; group < 3; group++) {
      const x0 = (group / 3) * w;
      const gw = w / 3;
      for (let strip = 0; strip < 3; strip++) {
        const sh = h / 3;
        const y0 = group % 2 === 0 ? strip * sh : h - strip * sh - sh;
        cctx.fillStyle = stripColors[(strip + group) % 3];
        cctx.fillRect(x0, y0, gw, sh);
        bctx.fillStyle = strip % 2 === 0 ? "#b4b4b4" : "#cccccc";
        bctx.fillRect(x0, y0, gw, sh);
      }
    }

    for (const [ctx, style] of [
      [cctx, "#20242c"],
      [bctx, "#3a3a3a"],
    ]) {
      ctx.strokeStyle = style;
      ctx.lineWidth = Math.max(2, w * 0.0035);
      for (let group = 0; group <= 3; group++) {
        const x = (group / 3) * w;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let strip = 1; strip < 3; strip++) {
        const y = (strip / 3) * h;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }

    const img = cctx.getImageData(0, 0, w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const g = (fbm(noise, x * 0.14, y * 0.14, 3) - 0.5) * 16;
        img.data[i] = Math.max(0, Math.min(255, img.data[i] + g));
        img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + g));
        img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + g));
      }
    }
    cctx.putImageData(img, 0, 0);

    return { map: toTexture(colorCanvas, { srgb: true }), bumpMap: toTexture(bumpCanvas) };
  });
}

/** Basketball: tan-orange composite with pebble grain and black seams. */
export function basketballMaps() {
  return cached("ball-basket", () => {
    const size = 1024;
    const w = size;
    const h = size / 2;
    const colorCanvas = makeCanvas(w, h);
    const bumpCanvas = makeCanvas(w, h);
    const cctx = colorCanvas.getContext("2d");
    const bctx = bumpCanvas.getContext("2d");
    const noise = valueNoise(44);
    const base = hexToRGB(PALETTE.basketTan);

    const img = cctx.createImageData(w, h);
    const bimg = bctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const dots =
          Math.sin(x * 1.15) * Math.sin(y * 1.15) * 0.5 + (fbm(noise, x * 0.35, y * 0.35, 2) - 0.5);
        const v = dots * 26;
        img.data[i] = Math.max(0, Math.min(255, base[0] + v));
        img.data[i + 1] = Math.max(0, Math.min(255, base[1] + v));
        img.data[i + 2] = Math.max(0, Math.min(255, base[2] + v));
        img.data[i + 3] = 255;
        const b = Math.max(0, Math.min(255, 140 + dots * 90));
        bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = b;
        bimg.data[i + 3] = 255;
      }
    }
    cctx.putImageData(img, 0, 0);
    bctx.putImageData(bimg, 0, 0);

    const seam = (ctx, style, width) => {
      ctx.strokeStyle = style;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      for (const offset of [0.25, 0.75]) {
        ctx.beginPath();
        ctx.moveTo(offset * w, 0);
        ctx.lineTo(offset * w, h);
        ctx.stroke();
      }
      for (const phase of [0, Math.PI]) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 4) {
          const t = (x / w) * Math.PI * 2 + phase;
          const y = h / 2 + Math.sin(t) * h * 0.34;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    };

    seam(cctx, "#141414", Math.max(4, w * 0.008));
    seam(bctx, "#2a2a2a", Math.max(5, w * 0.01));

    return { map: toTexture(colorCanvas, { srgb: true }), bumpMap: toTexture(bumpCanvas) };
  });
}

/* --------------------------------------------------- Surface grain maps */
export function leatherBump(scaleSeed = 3) {
  return cached(`leather-${scaleSeed}`, () => {
    const size = 512;
    const canvas = makeCanvas(size, size);
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(size, size);
    const noise = valueNoise(scaleSeed);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const cell = fbm(noise, x * 0.08, y * 0.08, 4);
        const fine = fbm(noise, x * 0.55, y * 0.55, 2);
        const v = Math.max(0, Math.min(255, 128 + (cell - 0.5) * 150 + (fine - 0.5) * 60));
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTexture(canvas, { repeat: [3, 3] });
  });
}

/** Tennis-ball felt: dense short fibres. */
export function feltBump() {
  return cached("felt", () => {
    const size = 512;
    const canvas = makeCanvas(size, size);
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(size, size);
    const noise = valueNoise(63);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const fuzz = fbm(noise, x * 0.9, y * 0.9, 2);
        const clump = fbm(noise, x * 0.14, y * 0.14, 3);
        const v = Math.max(0, Math.min(255, 128 + (fuzz - 0.5) * 190 + (clump - 0.5) * 70));
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTexture(canvas, { repeat: [4, 2] });
  });
}

/** Raised pimple grip, as used on rugby balls and glove backhands. */
export function pimpleBump() {
  return cached("pimple", () => {
    const size = 256;
    const canvas = makeCanvas(size, size);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#3c3c3c";
    ctx.fillRect(0, 0, size, size);
    const step = 16;
    for (let y = 0; y < size; y += step) {
      for (let x = 0; x < size; x += step) {
        const ox = (y / step) % 2 === 0 ? 0 : step / 2;
        const grad = ctx.createRadialGradient(x + ox, y, 0, x + ox, y, step * 0.42);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(1, "#3c3c3c");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x + ox, y, step * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return toTexture(canvas, { repeat: [7, 4] });
  });
}

export function knurlBump() {
  return cached("knurl", () => {
    const size = 256;
    const canvas = makeCanvas(size, size);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#8a8a8a";
    ctx.fillRect(0, 0, size, size);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ffffff";
    for (let i = -size; i < size * 2; i += 12) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.stroke();
    }
    ctx.strokeStyle = "#141414";
    for (let i = -size; i < size * 2; i += 12) {
      ctx.beginPath();
      ctx.moveTo(i + size, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
    }
    return toTexture(canvas, { repeat: [10, 2] });
  });
}

export function carbonWeave() {
  return cached("carbon", () => {
    const size = 256;
    const canvas = makeCanvas(size, size);
    const ctx = canvas.getContext("2d");
    const cell = 32;
    for (let y = 0; y < size / cell; y++) {
      for (let x = 0; x < size / cell; x++) {
        const flip = (x + y) % 2 === 0;
        const grad = ctx.createLinearGradient(
          x * cell,
          y * cell,
          flip ? (x + 1) * cell : x * cell,
          flip ? y * cell : (y + 1) * cell
        );
        grad.addColorStop(0, "#232326");
        grad.addColorStop(0.5, "#5c5c66");
        grad.addColorStop(1, "#1c1c1f");
        ctx.fillStyle = grad;
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
    return toTexture(canvas, { srgb: true, repeat: [6, 3] });
  });
}

/** English willow: cream face with straight darker grain lines. */
export function willowGrain() {
  return cached("willow", () => {
    const w = 256;
    const h = 512;
    const canvas = makeCanvas(w, h);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#e9dcbc";
    ctx.fillRect(0, 0, w, h);
    const noise = valueNoise(17);
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 10; i++) {
      const base = (i / 10) * w + 8;
      const shade = 150 + Math.floor(noise(i * 3.1, 0.5) * 50);
      ctx.strokeStyle = `rgba(${shade},${shade - 24},${shade - 62},0.75)`;
      ctx.beginPath();
      for (let y = 0; y <= h; y += 8) {
        const x = base + (fbm(noise, i * 2.3, y * 0.012, 3) - 0.5) * 8;
        if (y === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    return toTexture(canvas, { srgb: true });
  });
}

export function meshFabric() {
  return cached("mesh", () => {
    const size = 128;
    const canvas = makeCanvas(size, size);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#32343a";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#0e0e11";
    for (let y = 0; y < size; y += 8) {
      for (let x = 0; x < size; x += 8) ctx.fillRect(x + 2, y + 2, 4, 4);
    }
    return toTexture(canvas, { srgb: true, repeat: [6, 6] });
  });
}

/* ------------------------------------------- Derived normal / roughness */

/**
 * Sobel-differentiates a greyscale height canvas into a tangent-space normal
 * map. Wrapping the sample coordinates keeps tiled surfaces seamless.
 */
function heightToNormal(src, strength = 2) {
  const w = src.width;
  const h = src.height;
  const data = src.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const out = makeCanvas(w, h);
  const ctx = out.getContext("2d");
  const img = ctx.createImageData(w, h);

  const at = (x, y) => data[((((y % h) + h) % h) * w + (((x % w) + w) % w)) * 4] / 255;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx =
        (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1) -
          at(x + 1, y - 1) - 2 * at(x + 1, y) - at(x + 1, y + 1)) * strength;
      const dy =
        (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1) -
          at(x - 1, y + 1) - 2 * at(x, y + 1) - at(x + 1, y + 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      img.data[i] = ((dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = (1 / len) * 0.5 * 255 + 127.5;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

/** Remaps a height canvas into a roughness range, so peaks and pits scatter differently. */
function heightToRoughness(src, min = 0.25, max = 0.7) {
  const w = src.width;
  const h = src.height;
  const ctx0 = src.getContext("2d", { willReadFrequently: true });
  const data = ctx0.getImageData(0, 0, w, h).data;
  const out = makeCanvas(w, h);
  const ctx = out.getContext("2d");
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.round((min + (data[i] / 255) * (max - min)) * 255);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

/** Builds normal + roughness maps from an existing bump texture's canvas. */
function surfaceFrom(key, bumpTexture, opts = {}) {
  return cached(`surface-${key}`, () => {
    const { strength = 2, roughMin = 0.25, roughMax = 0.7 } = opts;
    const src = bumpTexture.image;
    const repeat = opts.repeat || [bumpTexture.repeat.x, bumpTexture.repeat.y];
    return {
      normalMap: toTexture(heightToNormal(src, strength), { repeat }),
      roughnessMap: toTexture(heightToRoughness(src, roughMin, roughMax), { repeat }),
    };
  });
}

/** Injection-moulded plastic never comes out dead flat — this is orange peel. */
export function orangePeelBump() {
  return cached("orange-peel", () => {
    const size = 256;
    const canvas = makeCanvas(size, size);
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(size, size);
    const noise = valueNoise(87);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const peel = fbm(noise, x * 0.13, y * 0.13, 3);
        const micro = fbm(noise, x * 0.7, y * 0.7, 2);
        const v = Math.max(0, Math.min(255, 128 + (peel - 0.5) * 78 + (micro - 0.5) * 26));
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTexture(canvas, { repeat: [4, 4] });
  });
}

/** Open-cell EVA foam. */
export function poreBump() {
  return cached("pores", () => {
    const size = 256;
    const canvas = makeCanvas(size, size);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#b4b4b4";
    ctx.fillRect(0, 0, size, size);
    let seed = 4;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 900; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const r = 1.4 + rnd() * 3.6;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, "#3c3c3c");
      grad.addColorStop(1, "rgba(180,180,180,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    return toTexture(canvas, { repeat: [3, 3] });
  });
}

/** Sand-cast iron: shallow pitting and a granular skin. */
export function castPitBump() {
  return cached("cast-pit", () => {
    const size = 256;
    const canvas = makeCanvas(size, size);
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(size, size);
    const noise = valueNoise(29);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const grain = fbm(noise, x * 0.42, y * 0.42, 3);
        const v = Math.max(0, Math.min(255, 140 + (grain - 0.5) * 120));
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    let seed = 11;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 260; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const r = 0.8 + rnd() * 2.6;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, "#2a2a2a");
      grad.addColorStop(1, "rgba(140,140,140,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    return toTexture(canvas, { repeat: [3, 3] });
  });
}

/**
 * Very low-frequency ripple used only on the clearcoat layer. It is what makes
 * reflections drift and wobble like a poured liquid coat rather than sitting
 * flat like sprayed plastic.
 */
export function liquidRippleNormal() {
  return cached("liquid-ripple", () => {
    const size = 256;
    const canvas = makeCanvas(size, size);
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(size, size);
    const noise = valueNoise(151);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const flow = fbm(noise, x * 0.022, y * 0.022, 4);
        const swirl = Math.sin(flow * Math.PI * 3.1) * 0.5 + 0.5;
        const v = Math.max(0, Math.min(255, 128 + (swirl - 0.5) * 110));
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTexture(heightToNormal(canvas, 1.4), { repeat: [2, 2] });
  });
}

/* ------------------------------------------------------- Liquid glass coat */

/**
 * Finish levels. Everything gets a clear coat so the whole catalogue shares one
 * showroom look, but soft goods get a thinner one — a felt tennis ball lacquered
 * like a piano would stop reading as felt.
 */
const GLAZE = {
  glass: { clearcoat: 1, clearcoatRoughness: 0.04, iridescence: 0.22, envMapIntensity: 1.45, specularIntensity: 1, ripple: 0.09 },
  gloss: { clearcoat: 0.92, clearcoatRoughness: 0.09, iridescence: 0.16, envMapIntensity: 1.3, specularIntensity: 0.95, ripple: 0.07 },
  satin: { clearcoat: 0.7, clearcoatRoughness: 0.2, iridescence: 0.1, envMapIntensity: 1.15, specularIntensity: 0.8, ripple: 0.05 },
  soft: { clearcoat: 0.38, clearcoatRoughness: 0.38, iridescence: 0.05, envMapIntensity: 1, specularIntensity: 0.6, ripple: 0.03 },
};

/**
 * Picks a finish from the old numeric clearcoat hint the model factories pass,
 * so a matte grip wrap stays matte instead of being lacquered like a bat face.
 */
function levelFor(clearcoat, fallback) {
  if (clearcoat === undefined) return fallback;
  if (clearcoat >= 0.7) return "glass";
  if (clearcoat >= 0.4) return "gloss";
  if (clearcoat >= 0.15) return "satin";
  return "soft";
}

/** Applies the shared liquid-glass coat to a physical material, in place. */
export function glaze(material, level = "gloss") {
  const g = GLAZE[level] || GLAZE.gloss;
  material.clearcoat = g.clearcoat;
  material.clearcoatRoughness = g.clearcoatRoughness;
  material.clearcoatNormalMap = liquidRippleNormal();
  material.clearcoatNormalScale = new THREE.Vector2(g.ripple, g.ripple);
  material.iridescence = g.iridescence;
  material.iridescenceIOR = 1.28;
  material.iridescenceThicknessRange = [120, 420];
  material.specularIntensity = g.specularIntensity;
  material.envMapIntensity = g.envMapIntensity;
  material.ior = 1.5;
  return material;
}

/* ------------------------------------------------------ Material presets */
const M = THREE.MeshPhysicalMaterial;

/** Dyed sporting leather: pebbled grain under a lacquer coat. */
export function leather(color, { roughness = 0.52, seed = 3, clearcoat, level } = {}) {
  const finish = level || levelFor(clearcoat, "gloss");
  return cached(`leather-mat-${color}-${roughness}-${seed}-${finish}`, () => {
    const bump = leatherBump(seed);
    const surface = surfaceFrom(`leather-${seed}`, bump, {
      strength: 2.4,
      roughMin: 0.34,
      roughMax: 0.74,
    });
    return glaze(
      new M({
        color,
        roughness,
        metalness: 0.02,
        normalMap: surface.normalMap,
        normalScale: new THREE.Vector2(0.85, 0.85),
        roughnessMap: surface.roughnessMap,
        sheen: 0.18,
        sheenRoughness: 0.7,
      }),
      finish
    );
  });
}

/**
 * Leather that takes its colour from per-vertex data instead of a single
 * value, so one continuous blended mesh can carry a red shell, a black cuff
 * and a white knuckle bar without being cut into separate pieces.
 */
export function leatherVertexColour({ roughness = 0.46, seed = 3, level = "gloss" } = {}) {
  return cached(`leather-vc-${roughness}-${seed}-${level}`, () => {
    const surface = surfaceFrom(`leather-${seed}`, leatherBump(seed), {
      strength: 2.4,
      roughMin: 0.34,
      roughMax: 0.74,
    });
    return glaze(
      new M({
        color: 0xffffff,
        vertexColors: true,
        roughness,
        metalness: 0.02,
        normalMap: surface.normalMap,
        normalScale: new THREE.Vector2(0.85, 0.85),
        roughnessMap: surface.roughnessMap,
        sheen: 0.18,
        sheenRoughness: 0.7,
      }),
      level
    );
  });
}

/** Hard PE/PP shell with vertex colour — football shin guards, moulded plates. */
export function polymerVertexColour({ roughness = 0.22, level = "glass" } = {}) {
  return cached(`polymer-vc-${roughness}-${level}`, () => {
    const surface = surfaceFrom("orange-peel", orangePeelBump(), {
      strength: 1.1,
      roughMin: 0.16,
      roughMax: 0.44,
    });
    return glaze(
      new M({
        color: 0xffffff,
        vertexColors: true,
        roughness,
        metalness: 0.04,
        normalMap: surface.normalMap,
        normalScale: new THREE.Vector2(0.35, 0.35),
        roughnessMap: surface.roughnessMap,
      }),
      level
    );
  });
}

/** Moulded polymer / plastics, with the orange peel real mouldings have. */
export function polymer(color, { roughness = 0.3, clearcoat, level } = {}) {
  const finish = level || levelFor(clearcoat, "glass");
  return cached(`polymer-${color}-${roughness}-${finish}`, () => {
    const surface = surfaceFrom("orange-peel", orangePeelBump(), {
      strength: 1.1,
      roughMin: 0.16,
      roughMax: 0.44,
    });
    return glaze(
      new M({
        color,
        roughness,
        metalness: 0.02,
        normalMap: surface.normalMap,
        normalScale: new THREE.Vector2(0.35, 0.35),
        roughnessMap: surface.roughnessMap,
      }),
      finish
    );
  });
}

/** Matte vulcanised rubber — grippy, but still wearing a thin coat. */
export function rubber(color) {
  return cached(`rubber-${color}`, () => {
    const surface = surfaceFrom("rubber-grain", leatherBump(9), {
      strength: 2.8,
      roughMin: 0.72,
      roughMax: 0.96,
    });
    return glaze(
      new M({
        color,
        roughness: 0.9,
        metalness: 0,
        normalMap: surface.normalMap,
        normalScale: new THREE.Vector2(1.1, 1.1),
        roughnessMap: surface.roughnessMap,
      }),
      "satin"
    );
  });
}

/** Foam padding — open cell, light-absorbing. */
export function foam(color) {
  return cached(`foam-${color}`, () => {
    const surface = surfaceFrom("foam-pores", poreBump(), {
      strength: 2.2,
      roughMin: 0.78,
      roughMax: 0.99,
    });
    return glaze(
      new M({
        color,
        roughness: 0.95,
        metalness: 0,
        normalMap: surface.normalMap,
        normalScale: new THREE.Vector2(0.9, 0.9),
        roughnessMap: surface.roughnessMap,
      }),
      "soft"
    );
  });
}

/** Goalkeeper latex — soft, tacky, faintly waxy. */
export function latex(color) {
  return cached(`latex-${color}`, () => {
    const surface = surfaceFrom("latex-grain", pimpleBump(), {
      strength: 1.6,
      roughMin: 0.62,
      roughMax: 0.9,
    });
    return glaze(
      new M({
        color,
        roughness: 0.82,
        metalness: 0,
        normalMap: surface.normalMap,
        normalScale: new THREE.Vector2(0.5, 0.5),
        roughnessMap: surface.roughnessMap,
        sheen: 0.5,
        sheenRoughness: 0.85,
      }),
      "satin"
    );
  });
}

export const materials = {
  get chrome() {
    return cached("m-chrome", () =>
      new M({
        color: 0xd8d8dc,
        roughness: 0.11,
        metalness: 1,
        envMapIntensity: 1.75,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        clearcoatNormalMap: liquidRippleNormal(),
        clearcoatNormalScale: new THREE.Vector2(0.05, 0.05),
      })
    );
  },
  get brushedSteel() {
    return cached("m-brushedSteel", () => {
      const surface = surfaceFrom("steel-brush", knurlBump(), {
        strength: 0.7,
        roughMin: 0.26,
        roughMax: 0.46,
      });
      return new M({
        color: 0xacacb2,
        roughness: 0.34,
        metalness: 1,
        envMapIntensity: 1.4,
        roughnessMap: surface.roughnessMap,
        clearcoat: 0.8,
        clearcoatRoughness: 0.12,
      });
    });
  },
  get castIron() {
    // Lifted off pure black so the silhouette still reads on a black page.
    return cached("m-castIron", () => {
      const surface = surfaceFrom("iron-pit", castPitBump(), {
        strength: 2.6,
        roughMin: 0.5,
        roughMax: 0.82,
      });
      return glaze(
        new M({
          color: 0x35353a,
          roughness: 0.66,
          metalness: 0.45,
          normalMap: surface.normalMap,
          normalScale: new THREE.Vector2(0.95, 0.95),
          roughnessMap: surface.roughnessMap,
        }),
        "satin"
      );
    });
  },
  get urethane() {
    return cached("m-urethane", () => {
      const surface = surfaceFrom("orange-peel", orangePeelBump(), {
        strength: 1.1,
        roughMin: 0.16,
        roughMax: 0.44,
      });
      return glaze(
        new M({
          color: 0x141416,
          roughness: 0.38,
          metalness: 0.02,
          normalMap: surface.normalMap,
          normalScale: new THREE.Vector2(0.45, 0.45),
        }),
        "gloss"
      );
    });
  },
  get mesh() {
    return cached("m-mesh", () => {
      const surface = surfaceFrom("mesh-weave", meshFabric(), {
        strength: 1.8,
        roughMin: 0.66,
        roughMax: 0.94,
      });
      return glaze(
        new M({
          map: meshFabric(),
          roughness: 0.82,
          metalness: 0,
          normalMap: surface.normalMap,
          normalScale: new THREE.Vector2(0.7, 0.7),
          roughnessMap: surface.roughnessMap,
        }),
        "soft"
      );
    });
  },
  get willow() {
    return cached("m-willow", () => {
      const surface = surfaceFrom("willow-grain", willowGrain(), {
        strength: 1.2,
        roughMin: 0.22,
        roughMax: 0.5,
      });
      return glaze(
        new M({
          map: willowGrain(),
          roughness: 0.42,
          metalness: 0.02,
          normalMap: surface.normalMap,
          normalScale: new THREE.Vector2(0.4, 0.4),
          roughnessMap: surface.roughnessMap,
        }),
        "glass"
      );
    });
  },
  get carbon() {
    return cached("m-carbon", () => {
      const surface = surfaceFrom("carbon-weave", carbonWeave(), {
        strength: 1.5,
        roughMin: 0.14,
        roughMax: 0.4,
      });
      return glaze(
        new M({
          map: carbonWeave(),
          roughness: 0.26,
          metalness: 0.22,
          normalMap: surface.normalMap,
          normalScale: new THREE.Vector2(0.6, 0.6),
          roughnessMap: surface.roughnessMap,
        }),
        "glass"
      );
    });
  },
  get pimpledRubber() {
    return cached("m-pimpled", () => {
      const surface = surfaceFrom("pimple-grip", pimpleBump(), {
        strength: 3,
        roughMin: 0.5,
        roughMax: 0.86,
      });
      return glaze(
        new M({
          color: PALETTE.pitchWhite,
          roughness: 0.74,
          metalness: 0.02,
          normalMap: surface.normalMap,
          // Kept low: a strong regular dot pattern on a lathed surface stops
          // reading as grip and starts reading as netting.
          normalScale: new THREE.Vector2(0.26, 0.26),
          roughnessMap: surface.roughnessMap,
        }),
        "satin"
      );
    });
  },
  get tennisFelt() {
    return cached("m-felt", () => {
      const surface = surfaceFrom("felt-fibre", feltBump(), {
        strength: 2.4,
        roughMin: 0.84,
        roughMax: 1,
      });
      return glaze(
        new M({
          color: 0xd7e34c,
          roughness: 0.96,
          metalness: 0,
          normalMap: surface.normalMap,
          normalScale: new THREE.Vector2(1.15, 1.15),
          roughnessMap: surface.roughnessMap,
          sheen: 0.7,
          sheenRoughness: 1,
          sheenColor: new THREE.Color(0xe9f28a),
        }),
        "soft"
      );
    });
  },
  get knurledSteel() {
    return cached("m-knurled", () => {
      const surface = surfaceFrom("knurl-cut", knurlBump(), {
        strength: 2.2,
        roughMin: 0.3,
        roughMax: 0.58,
      });
      return new M({
        color: 0xb8b8be,
        roughness: 0.4,
        metalness: 1,
        normalMap: surface.normalMap,
        normalScale: new THREE.Vector2(1.2, 1.2),
        roughnessMap: surface.roughnessMap,
        envMapIntensity: 1.25,
        clearcoat: 0.7,
        clearcoatRoughness: 0.16,
      });
    });
  },
};

/** Ball surface built from the generated panel maps, under a lacquer coat. */
export function ballMaterial(kind) {
  return cached(`m-ball-${kind}`, () => {
    const maps = {
      classic: classicBallMaps,
      thermo: thermoBallMaps,
      futsal: futsalBallMaps,
      volley: volleyballMaps,
      basket: basketballMaps,
    }[kind]();

    // CanvasTexture keeps its source canvas on .image, so the panel relief can
    // be re-derived into proper normal and roughness maps without repainting.
    const surface = surfaceFrom(
      `ball-${kind}`,
      maps.bumpMap,
      kind === "basket"
        ? { strength: 3.4, roughMin: 0.68, roughMax: 0.94 }
        : { strength: 2.6, roughMin: 0.26, roughMax: 0.6 }
    );

    return glaze(
      new M({
        map: maps.map,
        normalMap: surface.normalMap,
        normalScale: new THREE.Vector2(kind === "basket" ? 1.25 : 0.9, kind === "basket" ? 1.25 : 0.9),
        roughnessMap: surface.roughnessMap,
        roughness: kind === "basket" ? 0.8 : 0.36,
        metalness: 0.02,
      }),
      kind === "basket" ? "satin" : "glass"
    );
  });
}

export function disposeMaterialCache() {
  for (const value of cache.values()) {
    if (value?.dispose) value.dispose();
  }
  cache.clear();
}
