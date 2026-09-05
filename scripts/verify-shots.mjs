import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:5173";
const OUT = join(process.cwd(), "scripts", "shots");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

async function ready(path, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForFunction(() => document.body.classList.contains("is-loaded"), {
    timeout: 8000,
  });
  await page.waitForTimeout(400);
}

async function pinShowcase() {
  await page.evaluate(() => {
    const section = document.querySelector(".scrollscene");
    if (!section) return;
    const y = section.getBoundingClientRect().top + window.scrollY + 120;
    window.scrollTo(0, y);
  });
  await page.waitForTimeout(800);
}

await ready("/", 390, 844);
await page.screenshot({ path: join(OUT, "phone-home.png") });
await page.locator(".nav__more").first().click();
await page.waitForTimeout(350);
await page.screenshot({ path: join(OUT, "phone-home-nav.png") });
await page.keyboard.press("Escape");
await pinShowcase();
await page.screenshot({ path: join(OUT, "phone-showcase.png") });

await ready("/", 1440, 900);
await pinShowcase();
await page.screenshot({ path: join(OUT, "desktop-showcase.png") });

await browser.close();
console.log("done");
