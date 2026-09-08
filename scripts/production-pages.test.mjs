/**
 * Production-bundle regressions.
 *
 * Page modules import data.js. Vite puts that shared chunk in the same file as
 * site.js, so a synchronous boot() would run before products.js / product.js
 * finish injecting DOM. These checks must run against `vite preview` of a
 * production build — `vite dev` keeps the scripts separate and hides the bug.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const PORT = Number(process.env.PREVIEW_PORT || 4177);
const BASE = process.env.PREVIEW_URL || `http://127.0.0.1:${PORT}`;

let preview;
let browser;

function waitForPreview(child) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("preview did not start"));
    }, 20000);
    const onData = (buf) => {
      const text = String(buf);
      if (text.includes("Local:") || text.includes(`http://127.0.0.1:${PORT}`) || text.includes(`http://localhost:${PORT}`)) {
        cleanup();
        resolve();
      }
    };
    const onExit = (code) => {
      cleanup();
      reject(new Error(`preview exited ${code}`));
    };
    const cleanup = () => {
      clearTimeout(timer);
      child.stdout?.off("data", onData);
      child.stderr?.off("data", onData);
      child.off("exit", onExit);
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.once("exit", onExit);
  });
}

before(async () => {
  if (!process.env.PREVIEW_URL) {
    preview = spawn("npx", ["vite", "preview", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    await waitForPreview(preview);
  }

  const args = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
  browser = await chromium.launch({ args });
});

after(async () => {
  await browser?.close().catch(() => {});
  if (preview?.pid) {
    preview.stdout?.destroy();
    preview.stderr?.destroy();
    preview.kill("SIGKILL");
  }
});

test("catalogue filters hide sections after a production boot", async () => {
  const page = await browser.newPage();
  await page.goto(`${BASE}/products.html`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-filter]:not([data-filter='all'])");

  const before = await page.locator("[data-category-sections] > [data-category]").evaluateAll((els) =>
    els.map((el) => ({ id: el.dataset.category, display: getComputedStyle(el).display }))
  );
  assert.ok(before.length > 1, "expected injected category sections");
  assert.ok(
    before.every((row) => row.display !== "none"),
    "all categories should start visible"
  );

  await page.locator('[data-filter="combat"]').click();
  const after = await page.locator("[data-category-sections] > [data-category]").evaluateAll((els) =>
    els.map((el) => ({ id: el.dataset.category, display: getComputedStyle(el).display }))
  );
  const combat = after.find((row) => row.id === "combat");
  const team = after.find((row) => row.id === "team");
  assert.notEqual(combat?.display, "none");
  assert.equal(team?.display, "none");
  await page.close();
});

test("products.html#combat lands on the injected category section", async () => {
  const page = await browser.newPage();
  await page.goto(`${BASE}/products.html#combat`, { waitUntil: "networkidle" });
  await page.waitForSelector("#combat");
  const inView = await page.evaluate(() => {
    const el = document.getElementById("combat");
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  });
  assert.equal(inView, true);
  await page.close();
});

test("product detail mounts a viewer after a production boot", async () => {
  const page = await browser.newPage();
  await page.goto(`${BASE}/product.html?id=heritage-32`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("[data-header]"));

  const viewer = page.locator("[data-viewer-mount][data-viewer]");
  await assert.doesNotReject(() => viewer.waitFor({ state: "attached", timeout: 5000 }));
  const model = await viewer.getAttribute("data-viewer");
  assert.equal(model, "ballClassic");

  const stage = page.locator("[data-viewer-mount] canvas, [data-viewer-mount] .gl-fallback");
  await assert.doesNotReject(() => stage.waitFor({ state: "attached", timeout: 15000 }));
  await page.close();
});

test("quote form still binds submit after a deferred boot", async () => {
  const page = await browser.newPage();
  let posted = false;
  await page.route("https://formsubmit.co/**", async (route) => {
    posted = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });
  await page.goto(`${BASE}/quote.html`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-form]");
  const options = await page.locator("[data-quote-products] option").count();
  assert.ok(options > 2, "product list should be populated");
  await page.locator("#product").selectOption("heritage-32");
  await page.locator("#quantity").fill("5000");
  await page.locator("#destination").fill("Rotterdam");
  await page.locator("#name").fill("Test Buyer");
  await page.locator("#company").fill("Test Co");
  await page.locator("#email").fill("buyer@example.com");
  await page.locator("[name=consent]").check();
  await page.locator('form[data-form] [type="submit"]').click();
  await page.waitForFunction(() => document.querySelector(".form-status.is-visible"), {
    timeout: 8000,
  });
  assert.equal(posted, true, "submit handler should POST to FormSubmit instead of a native GET");
  await page.close();
});
