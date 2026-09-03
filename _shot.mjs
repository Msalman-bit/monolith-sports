// Temporary dev script: screenshots pages from the running Vite server.
import { chromium } from "playwright";

const url = process.argv[2] || "http://localhost:5173/_modelcheck.html";
const out = process.argv[3] || "_shot.png";
const width = parseInt(process.argv[4] || "1500", 10);
const height = parseInt(process.argv[5] || "2000", 10);

const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });

const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
// Canvas textures and several animation frames need time to settle.
await page.waitForTimeout(6000);
await page.screenshot({ path: out });
await browser.close();

console.log("saved " + out);
if (errors.length) console.log("CONSOLE ERRORS:\n" + errors.join("\n"));
else console.log("no console errors");
