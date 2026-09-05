import { chromium } from "playwright";

const BASE = process.env.AUDIT_URL || "http://localhost:5173";
const pages = [
  "/",
  "/products.html",
  "/product.html?id=heritage-32",
  "/quote.html",
  "/about.html",
  "/contact.html",
  "/export.html",
  "/oem.html",
];
const viewports = [
  { name: "phone-se", width: 375, height: 667 },
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "desktop", width: 1440, height: 900 },
];

const issues = [];

function overlap(a, b) {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

async function audit(page, label) {
  const result = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const overflowX = Math.max(doc.scrollWidth, body.scrollWidth) - doc.clientWidth;
    const header = document.querySelector("[data-header]");
    const headerBox = header?.getBoundingClientRect();
    const brand = document.querySelector(".brand")?.getBoundingClientRect();
    const nav = document.querySelector(".nav")?.getBoundingClientRect();
    const actions = document.querySelector(".header__actions")?.getBoundingClientRect();
    const cta = document.querySelector(".header__cta")?.getBoundingClientRect();

    const clashes = [];
    const boxes = [
      ["brand", brand],
      ["nav", nav],
      ["actions", actions],
      ["cta", cta],
    ].filter(([, b]) => b && b.width > 1 && b.height > 1);

    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const [an, a] = boxes[i];
        const [bn, b] = boxes[j];
        if (an === "nav" && bn === "cta") continue;
        if (an === "cta" && bn === "nav") continue;
        const hit = !(a.right <= b.left + 1 || a.left >= b.right - 1 || a.bottom <= b.top + 1 || a.top >= b.bottom - 1);
        if (hit) clashes.push(`${an} ∩ ${bn}`);
      }
    }

    const overflowing = [];
    document.querySelectorAll("main *, .header, .footer").forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX === "visible") {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && el.scrollWidth > document.documentElement.clientWidth + 8) {
          overflowing.push(el.className || el.tagName);
        }
      }
    });

    return {
      overflowX,
      headerHeight: headerBox?.height || 0,
      clashes,
      overflowing: overflowing.slice(0, 8),
    };
  });

  if (result.overflowX > 2) issues.push(`${label}: page overflow-x ${result.overflowX}px`);
  result.clashes.forEach((c) => issues.push(`${label}: overlap ${c}`));
  result.overflowing.forEach((c) => issues.push(`${label}: child overflow ${c}`));
}

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

for (const vp of viewports) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  for (const path of pages) {
    const label = `${vp.name} ${path}`;
    try {
      await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(250);
      await audit(page, label);

      if (path === "/") {
        const more = page.locator(".nav__more").first();
        if (await more.count()) {
          await more.click();
          await page.waitForTimeout(200);
          const panel = await page.locator(".nav__panel").first().boundingBox();
          if (panel) {
            if (panel.x < -2) issues.push(`${label}: nav panel off left ${panel.x}`);
            if (panel.x + panel.width > vp.width + 2) {
              issues.push(`${label}: nav panel off right ${panel.x + panel.width - vp.width}`);
            }
          }
          await page.keyboard.press("Escape");
        }
      }
    } catch (err) {
      issues.push(`${label}: ${err.message}`);
    }
  }
}

await browser.close();

if (issues.length) {
  console.log(`FOUND ${issues.length} ISSUES`);
  for (const issue of issues) console.log(" -", issue);
  process.exitCode = 1;
} else {
  console.log("No overflow or header overlap found across audited pages.");
}
