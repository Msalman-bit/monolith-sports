/**
 * Converts a heavy printable STL into a light web-ready GLB.
 *
 *   node scripts/stl2glb.mjs <input.stl> <output.glb> [targetTriangles]
 *
 * STLs meant for 3D printing carry far more detail than a web page can
 * afford — often over a million triangles with no vertex sharing, no normals
 * worth keeping and no UVs at all. This rebuilds the mesh:
 *
 *   1. parse the binary STL into raw triangles
 *   2. decimate by vertex clustering (snap to a grid, weld, drop degenerates)
 *   3. recompute smooth normals and generate spherical UVs
 *   4. normalise scale and centre on the origin
 *   5. write a minimal GLB
 *
 * Vertex clustering is used rather than quadric edge collapse because it runs
 * in one linear pass. On a million-triangle organic shape a JS quadric
 * simplifier takes minutes; this takes about a second and the silhouette
 * difference is invisible at web sizes.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const [, , inPath, outPath, targetArg] = process.argv;
if (!inPath || !outPath) {
  console.error("usage: node scripts/stl2glb.mjs <input.stl> <output.glb> [targetTriangles]");
  process.exit(1);
}
const TARGET = Number(targetArg || 9000);

/* ------------------------------------------------------------- Parse STL */
function parseBinarySTL(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const count = dv.getUint32(80, true);
  const out = new Float32Array(count * 9);
  let o = 84;
  let p = 0;
  for (let i = 0; i < count; i++) {
    o += 12; // face normal, recomputed later
    for (let v = 0; v < 3; v++) {
      out[p++] = dv.getFloat32(o, true);
      out[p++] = dv.getFloat32(o + 4, true);
      out[p++] = dv.getFloat32(o + 8, true);
      o += 12;
    }
    o += 2; // attribute byte count
  }
  return out;
}

/* ------------------------------------------------------------- Decimate */
function cluster(raw, gridN) {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < raw.length; i += 3) {
    if (raw[i] < minX) minX = raw[i];
    if (raw[i] > maxX) maxX = raw[i];
    if (raw[i + 1] < minY) minY = raw[i + 1];
    if (raw[i + 1] > maxY) maxY = raw[i + 1];
    if (raw[i + 2] < minZ) minZ = raw[i + 2];
    if (raw[i + 2] > maxZ) maxZ = raw[i + 2];
  }
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const spanZ = maxZ - minZ || 1;
  const span = Math.max(spanX, spanY, spanZ);
  const cell = span / gridN;

  const nx = Math.max(1, Math.ceil(spanX / cell) + 1);
  const ny = Math.max(1, Math.ceil(spanY / cell) + 1);

  const sums = new Map(); // cellKey -> [sx, sy, sz, n, outIndex]
  const cellOf = (x, y, z) => {
    const ix = Math.floor((x - minX) / cell);
    const iy = Math.floor((y - minY) / cell);
    const iz = Math.floor((z - minZ) / cell);
    return ix + iy * nx + iz * nx * ny;
  };

  const triCells = new Int32Array(raw.length / 3);
  for (let i = 0, t = 0; i < raw.length; i += 3, t++) {
    const key = cellOf(raw[i], raw[i + 1], raw[i + 2]);
    triCells[t] = key;
    let acc = sums.get(key);
    if (!acc) {
      acc = [0, 0, 0, 0, -1];
      sums.set(key, acc);
    }
    acc[0] += raw[i];
    acc[1] += raw[i + 1];
    acc[2] += raw[i + 2];
    acc[3]++;
  }

  const positions = [];
  let next = 0;
  for (const acc of sums.values()) {
    acc[4] = next++;
    positions.push(acc[0] / acc[3], acc[1] / acc[3], acc[2] / acc[3]);
  }

  const indices = [];
  for (let t = 0; t < triCells.length; t += 3) {
    const a = sums.get(triCells[t])[4];
    const b = sums.get(triCells[t + 1])[4];
    const c = sums.get(triCells[t + 2])[4];
    if (a === b || b === c || a === c) continue; // collapsed to a sliver
    indices.push(a, b, c);
  }

  return { positions: Float32Array.from(positions), indices };
}

/* ------------------------------------------------- Normals, UVs, framing */
function smoothNormals(positions, indices) {
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3;
    const b = indices[i + 1] * 3;
    const c = indices[i + 2] * 3;
    const ux = positions[b] - positions[a];
    const uy = positions[b + 1] - positions[a + 1];
    const uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a];
    const vy = positions[c + 1] - positions[a + 1];
    const vz = positions[c + 2] - positions[a + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const o of [a, b, c]) {
      normals[o] += nx;
      normals[o + 1] += ny;
      normals[o + 2] += nz;
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const l = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= l;
    normals[i + 1] /= l;
    normals[i + 2] /= l;
  }
  return normals;
}

/** Centres on the origin and scales so the longest axis spans `size`. */
function frame(positions, size = 2) {
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      if (positions[i + k] < min[k]) min[k] = positions[i + k];
      if (positions[i + k] > max[k]) max[k] = positions[i + k];
    }
  }
  const centre = [0, 1, 2].map((k) => (min[k] + max[k]) / 2);
  const span = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) || 1;
  const s = size / span;
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) positions[i + k] = (positions[i + k] - centre[k]) * s;
  }
  return { dims: [0, 1, 2].map((k) => (max[k] - min[k]) * s) };
}

/** Spherical UVs — good enough for a tiling grain, and cheap. */
function sphericalUVs(positions) {
  const uvs = new Float32Array((positions.length / 3) * 2);
  for (let i = 0, u = 0; i < positions.length; i += 3, u += 2) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    const r = Math.hypot(x, y, z) || 1;
    uvs[u] = 0.5 + Math.atan2(z, x) / (2 * Math.PI);
    uvs[u + 1] = 0.5 - Math.asin(Math.max(-1, Math.min(1, y / r))) / Math.PI;
  }
  return uvs;
}

/* ----------------------------------------------------------- Write GLB */
function pad4(n) {
  return (4 - (n % 4)) % 4;
}

function writeGLB(path, { positions, normals, uvs, indices }) {
  const useShort = positions.length / 3 <= 65535;
  const idx = useShort ? Uint16Array.from(indices) : Uint32Array.from(indices);

  const parts = [
    { data: Buffer.from(positions.buffer, positions.byteOffset, positions.byteLength) },
    { data: Buffer.from(normals.buffer, normals.byteOffset, normals.byteLength) },
    { data: Buffer.from(uvs.buffer, uvs.byteOffset, uvs.byteLength) },
    { data: Buffer.from(idx.buffer, idx.byteOffset, idx.byteLength) },
  ];

  const views = [];
  const chunks = [];
  let offset = 0;
  for (const part of parts) {
    views.push({ buffer: 0, byteOffset: offset, byteLength: part.data.length });
    chunks.push(part.data);
    const p = pad4(part.data.length);
    if (p) chunks.push(Buffer.alloc(p));
    offset += part.data.length + p;
  }
  const bin = Buffer.concat(chunks);

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      if (positions[i + k] < min[k]) min[k] = positions[i + k];
      if (positions[i + k] > max[k]) max[k] = positions[i + k];
    }
  }

  const json = {
    asset: { version: "2.0", generator: "monolith stl2glb" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 },
            indices: 3,
            mode: 4,
          },
        ],
      },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: positions.length / 3, type: "VEC3", min, max },
      { bufferView: 1, componentType: 5126, count: normals.length / 3, type: "VEC3" },
      { bufferView: 2, componentType: 5126, count: uvs.length / 2, type: "VEC2" },
      { bufferView: 3, componentType: useShort ? 5123 : 5125, count: idx.length, type: "SCALAR" },
    ],
    bufferViews: views.map((v, i) => ({ ...v, target: i === 3 ? 34963 : 34962 })),
    buffers: [{ byteLength: bin.length }],
  };

  let jsonBuf = Buffer.from(JSON.stringify(json), "utf8");
  const jp = pad4(jsonBuf.length);
  if (jp) jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(jp, 0x20)]);

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // "glTF"
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + bin.length, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBuf.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4); // "JSON"

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(bin.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4); // "BIN"

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.concat([header, jsonHeader, jsonBuf, binHeader, bin]));
}

/* ------------------------------------------------------------------ Run */
const file = readFileSync(inPath);
const raw = parseBinarySTL(file);
console.log(`source: ${(file.length / 1048576).toFixed(1)} MB, ${raw.length / 9} triangles`);

// Binary search the grid resolution that lands nearest the triangle budget.
let lo = 12;
let hi = 260;
let best = null;
for (let step = 0; step < 10; step++) {
  const grid = Math.round((lo + hi) / 2);
  const r = cluster(raw, grid);
  const tris = r.indices.length / 3;
  if (!best || Math.abs(tris - TARGET) < Math.abs(best.tris - TARGET)) {
    best = { ...r, tris, grid };
  }
  if (tris > TARGET) hi = grid;
  else lo = grid;
  if (hi - lo <= 1) break;
}

const { positions, indices, tris, grid } = best;
const { dims } = frame(positions, 2);
const normals = smoothNormals(positions, indices);
const uvs = sphericalUVs(positions);

writeGLB(outPath, { positions, normals, uvs, indices });

const size = readFileSync(outPath).length;
console.log(`grid ${grid} -> ${tris} triangles, ${positions.length / 3} vertices`);
console.log(`bounds after framing: ${dims.map((d) => d.toFixed(2)).join(" x ")} (x y z)`);
console.log(`wrote ${outPath} — ${(size / 1024).toFixed(0)} KB`);
