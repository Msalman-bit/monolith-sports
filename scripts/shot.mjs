import { chromium } from "playwright";

const url = process.argv[2] || "http://localhost:5173/_modelcheck.html";
const out = process.argv[3] || "shot.png";
const wait = Number(process.argv[4] || 6000);

// Uses the Edge/Chrome already on the machine so no browser download is needed.
const args = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
let browser;
for (const channel of ["msedge", "chrome", undefined]) {
  try {
    browser = await chromium.launch(channel ? { channel, args } : { args });
    break;
  } catch (e) {
    if (channel === undefined) throw e;
  }
}
const page = await browser.newPage({
  viewport: { width: 1500, height: 1400 },
  deviceScaleFactor: 1,
});
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") console.log(m.type().toUpperCase() + ":", m.text());
});
page.on("requestfailed", (req) => {
  console.log("REQ FAIL:", req.url(), req.failure()?.errorText);
});
page.on("response", (res) => {
  if (res.status() >= 400) console.log("HTTP", res.status(), res.url());
});
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(wait);
await page.screenshot({ path: out, fullPage: false });
await browser.close();
console.log("saved", out);
