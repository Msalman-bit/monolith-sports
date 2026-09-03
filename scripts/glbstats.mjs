/** Prints the cross-section profile of a GLB along an axis, to work out orientation. */
import { readFileSync } from "node:fs";

const path = process.argv[2];
const axis = (process.argv[3] || "z").toLowerCase();
const buf = readFileSync(path);

const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
const binStart = 20 + jsonLen + 8;

const posAcc = json.accessors[json.meshes[0].primitives[0].attributes.POSITION];
const view = json.bufferViews[posAcc.bufferView];
const start = binStart + (view.byteOffset || 0);
const pos = new Float32Array(buf.buffer.slice(buf.byteOffset + start, buf.byteOffset + start + view.byteLength));

const a = { x: 0, y: 1, z: 2 }[axis];
const o1 = (a + 1) % 3;
const o2 = (a + 2) % 3;

let min = Infinity;
let max = -Infinity;
for (let i = a; i < pos.length; i += 3) {
  if (pos[i] < min) min = pos[i];
  if (pos[i] > max) max = pos[i];
}

const BINS = 16;
const sum = new Float64Array(BINS);
const count = new Float64Array(BINS);
for (let i = 0; i < pos.length; i += 3) {
  const t = (pos[i + a] - min) / (max - min || 1);
  const b = Math.min(BINS - 1, Math.floor(t * BINS));
  sum[b] += Math.hypot(pos[i + o1], pos[i + o2]);
  count[b]++;
}

console.log(`axis ${axis}: ${min.toFixed(2)} .. ${max.toFixed(2)}   (${pos.length / 3} verts)`);
for (let b = 0; b < BINS; b++) {
  const r = count[b] ? sum[b] / count[b] : 0;
  const at = (min + ((b + 0.5) / BINS) * (max - min)).toFixed(2);
  console.log(
    `${String(b).padStart(2)}  ${axis}=${at.padStart(6)}  meanRadius=${r.toFixed(3)}  ${"#".repeat(Math.round(r * 60))}`
  );
}
