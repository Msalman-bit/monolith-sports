/**
 * OBJ → framed web GLB.
 *
 *   node scripts/obj2glb.mjs <input.obj> <output.glb>
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error("usage: node scripts/obj2glb.mjs <input.obj> <output.glb>");
  process.exit(1);
}

const skip = /plane|vray|ground|basket/i;
const loader = new OBJLoader();
const root = loader.parse(readFileSync(inPath, "utf8"));
root.updateMatrixWorld(true);

const geos = [];
root.traverse((obj) => {
  if (!obj.isMesh) return;
  const name = `${obj.name} ${obj.parent?.name || ""}`;
  if (skip.test(name)) {
    console.log("skip", name);
    return;
  }
  const g = obj.geometry.clone();
  g.applyMatrix4(obj.matrixWorld);
  if (!g.index) g.toNonIndexed();
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  g.deleteAttribute("uv2");
  geos.push(g);
  g.computeBoundingBox();
  const s = g.boundingBox.getSize(new THREE.Vector3());
  console.log(
    "mesh",
    name.trim() || "(unnamed)",
    "verts",
    g.attributes.position.count,
    "size",
    [s.x, s.y, s.z].map((n) => n.toFixed(1)).join(" x ")
  );
});

if (!geos.length) {
  console.error("no meshes");
  process.exit(1);
}

const merged = mergeGeometries(geos, false);
merged.computeVertexNormals();

const pos = merged.attributes.position;
const positions = pos.array.slice ? pos.array.slice() : Float32Array.from(pos.array);

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
const scale = 2 / span;
for (let i = 0; i < positions.length; i += 3) {
  for (let k = 0; k < 3; k++) positions[i + k] = (positions[i + k] - centre[k]) * scale;
}
const dims = [0, 1, 2].map((k) => (max[k] - min[k]) * scale);

const idxAttr = merged.index;
const indices = idxAttr
  ? Array.from(idxAttr.array)
  : Array.from({ length: positions.length / 3 }, (_, i) => i);

const normals = new Float32Array(positions.length);
for (let t = 0; t < indices.length; t += 3) {
  const a = indices[t] * 3;
  const b = indices[t + 1] * 3;
  const c = indices[t + 2] * 3;
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

const uvs = new Float32Array((positions.length / 3) * 2);
for (let i = 0, u = 0; i < positions.length; i += 3, u += 2) {
  const x = positions[i];
  const y = positions[i + 1];
  const z = positions[i + 2];
  const r = Math.hypot(x, y, z) || 1;
  uvs[u] = 0.5 + Math.atan2(z, x) / (2 * Math.PI);
  uvs[u + 1] = 0.5 - Math.asin(Math.max(-1, Math.min(1, y / r))) / Math.PI;
}

function pad4(n) {
  return (4 - (n % 4)) % 4;
}

const useShort = positions.length / 3 <= 65535;
const idx = useShort ? Uint16Array.from(indices) : Uint32Array.from(indices);
const parts = [
  Buffer.from(positions.buffer, positions.byteOffset, positions.byteLength),
  Buffer.from(normals.buffer, normals.byteOffset, normals.byteLength),
  Buffer.from(uvs.buffer, uvs.byteOffset, uvs.byteLength),
  Buffer.from(idx.buffer, idx.byteOffset, idx.byteLength),
];
const views = [];
const chunks = [];
let offset = 0;
for (const data of parts) {
  views.push({ buffer: 0, byteOffset: offset, byteLength: data.length });
  chunks.push(data);
  const p = pad4(data.length);
  if (p) chunks.push(Buffer.alloc(p));
  offset += data.length + p;
}
const bin = Buffer.concat(chunks);

const omin = [Infinity, Infinity, Infinity];
const omax = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < positions.length; i += 3) {
  for (let k = 0; k < 3; k++) {
    if (positions[i + k] < omin[k]) omin[k] = positions[i + k];
    if (positions[i + k] > omax[k]) omax[k] = positions[i + k];
  }
}

const json = {
  asset: { version: "2.0", generator: "monolith obj2glb" },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, mode: 4 }] }],
  accessors: [
    { bufferView: 0, componentType: 5126, count: positions.length / 3, type: "VEC3", min: omin, max: omax },
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
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + bin.length, 8);
const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(jsonBuf.length, 0);
jsonHeader.writeUInt32LE(0x4e4f534a, 4);
const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(bin.length, 0);
binHeader.writeUInt32LE(0x004e4942, 4);

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, Buffer.concat([header, jsonHeader, jsonBuf, binHeader, bin]));
console.log(`meshes ${geos.length}, tris ${indices.length / 3}, verts ${positions.length / 3}`);
console.log(`bounds ${dims.map((d) => d.toFixed(2)).join(" x ")} (x y z)`);
console.log(`wrote ${outPath} — ${(readFileSync(outPath).length / 1024).toFixed(0)} KB`);
