/* ==========================================================================
   MONOLITH SPORTS — site chrome and behaviour
   Header and footer are injected from data.js so you edit them in one place.
   ========================================================================== */

import { COMPANY, NAV, CATEGORIES, PRODUCTS } from "./data.js";

/* ------------------------------------------------------------------ Utils */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const currentPage = () => {
  const path = window.location.pathname.split("/").pop();
  return path === "" || path === undefined ? "index.html" : path;
};

const isActive = (href) => {
  const page = currentPage();
  const target = href.split("#")[0];
  return target === page;
};

const ARROW = `<svg class="btn__arrow" width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true"><path d="M9 1l4 4-4 4M13 5H1" stroke="currentColor" stroke-width="1.4" stroke-linecap="square"/></svg>`;

const CARET = `<svg class="nav__caret" viewBox="0 0 10 6" fill="none" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.3"/></svg>`;

/* ----------------------------------------------------------------- Header */
function buildHeader() {
  const navItems = NAV.map((item) => {
    if (!item.children) {
      return `<li class="nav__item">
        <a class="nav__link${isActive(item.href) ? " is-active" : ""}" href="${item.href}">${item.label}</a>
      </li>`;
    }

    const subs = item.children
      .map(
        (child) => `<a class="nav__sub" href="${child.href}">
          <span class="nav__sub-title">${child.label} <span>${child.code}</span></span>
          <span class="nav__sub-desc">${child.desc}</span>
        </a>`
      )
      .join("");

    const foot = item.mega
      ? `<div class="nav__panel-foot">
           <span class="mono muted">${CATEGORIES.length} categories · ${PRODUCTS.length} product lines</span>
           <a class="link-arrow" href="products.html">Full catalogue ${ARROW}</a>
         </div>`
      : "";

    const activeChild = item.children.some((c) => isActive(c.href)) || isActive(item.href);

    return `<li class="nav__item">
      <a class="nav__link${activeChild ? " is-active" : ""}" href="${item.href}" aria-haspopup="true">
        ${item.label}${CARET}
      </a>
      <div class="nav__panel${item.mega ? " nav__panel--wide" : ""}">${subs}${foot}</div>
    </li>`;
  }).join("");

  return `
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="scroll-progress" data-progress></div>
  <header class="header" data-header>
    <div class="header__inner">
      <a class="brand" href="index.html" aria-label="${COMPANY.name} home">
        <span class="brand__mark" aria-hidden="true"></span>
        <span class="brand__text">
          <span class="brand__name">${COMPANY.name}</span>
        </span>
      </a>

      <nav class="nav" aria-label="Primary">
        <ul style="display:flex;align-items:center;gap:.2rem">${navItems}</ul>
      </nav>

      <div class="header__actions">
        <button class="icon-btn" data-theme-toggle aria-label="Switch between black and white theme" title="Switch theme">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6.4" stroke="currentColor" stroke-width="1.3"/>
            <path d="M8 1.6A6.4 6.4 0 018 14.4z" fill="currentColor"/>
          </svg>
        </button>
        <a class="btn btn--sm header__cta" href="quote.html">Request a quote ${ARROW}</a>
        <button class="icon-btn burger" data-burger aria-label="Open menu" aria-expanded="false">
          <span class="burger__lines" aria-hidden="true"><i></i><i></i><i></i></span>
        </button>
      </div>
    </div>
  </header>

  <div class="drawer" data-drawer>
    ${NAV.map((item) => {
      if (!item.children) {
        return `<div class="drawer__group">
          <a class="drawer__toggle" href="${item.href}">${item.label}</a>
        </div>`;
      }
      return `<div class="drawer__group">
        <button class="drawer__toggle" data-drawer-toggle>${item.label}<i>+</i></button>
        <div class="drawer__panel">
          ${item.children.map((c) => `<a href="${c.href}">${c.label}</a>`).join("")}
        </div>
      </div>`;
    }).join("")}
    <div class="drawer__foot">
      <a class="btn btn--block" href="quote.html">Request a quote ${ARROW}</a>
      <a class="btn btn--ghost btn--block" href="contact.html">Contact us</a>
      <p class="mono muted" style="margin-top:.6rem">${COMPANY.phone} · ${COMPANY.email}</p>
    </div>
  </div>`;
}

/* ----------------------------------------------------------------- Footer */
function buildFooter() {
  const productLinks = CATEGORIES.map(
    (c) => `<a href="products.html#${c.id}">${c.name}</a>`
  ).join("");

  return `
  <footer class="footer">
    <div class="shell">
      <div class="footer__top">
        <div class="footer__col">
          <a class="brand" href="index.html" style="margin-bottom:.6rem">
            <span class="brand__mark" aria-hidden="true"></span>
            <span class="brand__text">
              <span class="brand__name">${COMPANY.name}</span>
              <span class="brand__sub">Est. ${COMPANY.founded}</span>
            </span>
          </a>
          <p class="card__text" style="max-width:38ch">
            Sports goods manufactured in Sialkot, Pakistan and shipped to buyers,
            distributors and brands across the European Union.
          </p>
          <address class="footer__addr" style="margin-top:.6rem">
            ${COMPANY.address.line1}<br>
            ${COMPANY.address.line2}<br>
            ${COMPANY.address.region}
          </address>
          <div class="socials" style="margin-top:.8rem">
            <a href="#" aria-label="LinkedIn"><svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3.4 5.3H.9V15h2.5V5.3zM2.1 1a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM15 9.5c0-2.6-1.4-3.8-3.2-3.8-1.5 0-2.2.8-2.5 1.4V5.3H6.8V15h2.5V9.6c0-1.2.5-1.9 1.5-1.9s1.6.7 1.6 1.9V15H15V9.5z"/></svg></a>
            <a href="#" aria-label="Instagram"><svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1.4" y="1.4" width="13.2" height="13.2" rx="3.6" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8" r="3.1" stroke="currentColor" stroke-width="1.3"/><circle cx="12.1" cy="3.9" r="0.9" fill="currentColor"/></svg></a>
            <a href="#" aria-label="YouTube"><svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M15.4 4.8s-.15-1.06-.6-1.53c-.58-.6-1.23-.61-1.53-.65C11.13 2.47 8 2.47 8 2.47h-.01s-3.12 0-5.26.15c-.3.04-.95.05-1.53.65-.46.47-.6 1.53-.6 1.53S.45 6.04.45 7.29v1.17c0 1.25.15 2.49.15 2.49s.15 1.06.6 1.53c.58.6 1.34.58 1.68.65 1.22.11 5.19.15 5.19.15s3.13 0 5.27-.16c.3-.04.95-.05 1.53-.65.46-.47.6-1.53.6-1.53s.15-1.24.15-2.49V7.29c0-1.25-.15-2.49-.15-2.49zM6.5 10.2V5.85l4.06 2.18-4.06 2.17z"/></svg></a>
          </div>
        </div>

        <div class="footer__col">
          <span class="footer__heading">Products</span>
          ${productLinks}
          <a href="products.html">All products</a>
        </div>

        <div class="footer__col">
          <span class="footer__heading">Company</span>
          <a href="about.html">About us</a>
          <a href="manufacturing.html">Manufacturing</a>
          <a href="quality.html">Quality &amp; certification</a>
          <a href="sustainability.html">Sustainability</a>
          <a href="oem.html">OEM &amp; private label</a>
          <a href="insights.html">Insights</a>
          <a href="careers.html">Careers</a>
        </div>

        <div class="footer__col">
          <span class="footer__heading">Trade</span>
          <a href="export.html">Export to the EU</a>
          <a href="quote.html">Request a quote</a>
          <a href="contact.html">Contact</a>
          <a href="faq.html">Buyer FAQ</a>
          <span class="footer__heading" style="margin-top:1rem">Direct</span>
          <a href="tel:${COMPANY.phoneHref}">${COMPANY.phone}</a>
          <a href="mailto:${COMPANY.email}">${COMPANY.email}</a>
        </div>
      </div>

      <div class="footer__mid">
        <div>
          <span class="footer__heading">Trade bulletin</span>
          <p class="card__text" style="max-width:44ch;margin-top:.4rem">
            Quarterly notes on EU regulation, freight rates and Sialkot capacity.
            No marketing, unsubscribe in one click.
          </p>
        </div>
        <form class="newsletter" data-newsletter novalidate>
          <label class="sr-only" for="nl-email">Email address</label>
          <input id="nl-email" type="email" name="email" placeholder="you@company.eu" required>
          <button class="btn" type="submit">Subscribe</button>
        </form>
      </div>

      <div class="footer__wordmark" aria-hidden="true">${COMPANY.name}</div>

      <div class="footer__bottom">
        <span>© <span data-year></span> ${COMPANY.legalName}. All rights reserved.</span>
        <nav class="footer__legal" aria-label="Legal">
          <a href="privacy.html">Privacy</a>
          <a href="terms.html">Terms</a>
          <a href="export.html#compliance">Compliance</a>
          <span>NTN ${COMPANY.registration.ntn}</span>
          <span>EORI ${COMPANY.registration.eori}</span>
        </nav>
      </div>
    </div>
  </footer>`;
}

/* ------------------------------------------------------- Liquid glass */
/** Rounded-rect / pill SDF → RG displacement map (Apple-style rim refraction). */
function glassMap(width, height, depth, corner) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(width, height);
  const hw = width / 2;
  const hh = height / 2;
  const rad = Math.min(corner ?? Math.min(hw, hh), hw, hh);
  const eps = 1.25;

  const sd = (px, py) => {
    const dx = Math.abs(px) - (hw - rad);
    const dy = Math.abs(py) - (hh - rad);
    const ox = Math.max(dx, 0);
    const oy = Math.max(dy, 0);
    return Math.hypot(ox, oy) + Math.min(Math.max(dx, dy), 0) - rad;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x + 0.5 - hw;
      const py = y + 0.5 - hh;
      const d = sd(px, py);
      const i = (y * width + x) * 4;
      if (d > 0.5) {
        img.data[i] = 128;
        img.data[i + 1] = 128;
        img.data[i + 2] = 128;
        img.data[i + 3] = 0;
        continue;
      }
      const inside = -d;
      if (inside < depth) {
        const t = Math.max(0, Math.min(1, inside / depth));
        const slope = Math.cos((t * Math.PI) / 2);
        const gx = (sd(px + eps, py) - sd(px - eps, py)) / (2 * eps);
        const gy = (sd(px, py + eps) - sd(px, py - eps)) / (2 * eps);
        const len = Math.hypot(gx, gy) || 1;
        img.data[i] = 128 - (gx / len) * slope * 127;
        img.data[i + 1] = 128 - (gy / len) * slope * 127;
        img.data[i + 2] = 128;
        img.data[i + 3] = 255;
      } else {
        img.data[i] = 128;
        img.data[i + 1] = 128;
        img.data[i + 2] = 128;
        img.data[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL("image/png");
}

function glassFilter(id, href, scale, liquid) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ripple =
    liquid && !reduce
      ? `<feTurbulence type="fractalNoise" baseFrequency="0.018 0.03" numOctaves="2" seed="3" result="t">
           <animate attributeName="baseFrequency" dur="2.2s" repeatCount="indefinite" values="0.018 0.03;0.03 0.016;0.018 0.03"/>
         </feTurbulence>
         <feDisplacementMap in="map" in2="t" scale="10" result="wmap" xChannelSelector="R" yChannelSelector="G"/>
         <feDisplacementMap in="SourceGraphic" in2="wmap" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/>`
      : `<feDisplacementMap in="SourceGraphic" in2="map" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/>`;

  return `<filter id="${id}" x="-8%" y="-20%" width="116%" height="140%" color-interpolation-filters="sRGB">
    <feImage href="${href}" result="map" preserveAspectRatio="none"/>
    ${ripple}
  </filter>`;
}

function liquidGlassDefs() {
  const pill = glassMap(360, 72, 16);
  const round = glassMap(96, 96, 18);
  const wide = glassMap(800, 72, 16);
  const tile = glassMap(260, 170, 18, 28);
  const card = glassMap(280, 440, 20, 28);
  const sheet = glassMap(380, 520, 22, 36);
  return `<svg class="lg-defs" aria-hidden="true" focusable="false">
    ${glassFilter("lg-pill", pill, 48, false)}
    ${glassFilter("lg-pill-liq", pill, 78, true)}
    ${glassFilter("lg-round", round, 42, false)}
    ${glassFilter("lg-round-liq", round, 70, true)}
    ${glassFilter("lg-wide", wide, 52, false)}
    ${glassFilter("lg-wide-liq", wide, 86, true)}
    ${glassFilter("lg-tile", tile, 36, false)}
    ${glassFilter("lg-tile-liq", tile, 58, true)}
    ${glassFilter("lg-card", card, 32, false)}
    ${glassFilter("lg-card-liq", card, 52, true)}
    ${glassFilter("lg-sheet", sheet, 34, false)}
    ${glassFilter("lg-sheet-liq", sheet, 56, true)}
  </svg>`;
}

const GLASS_SEL =
  ".btn, .nav__link, .filter, .icon-btn, .chip span, .nav__sub, .socials a, .marquee, .stat, .pcard, .scrollstep__card, .newsletter, .tag, .pcard__badge, .acc__head, .route, .cta, .card:not(.card--bare), .badge, .header, .hero__title, .hero__meta .lead";

function unwrapLegacyGlass(el) {
  const fx = el.querySelector(":scope > .lg-fx");
  const label = el.querySelector(":scope > .lg-label");
  if (fx) fx.remove();
  if (label) {
    while (label.firstChild) el.insertBefore(label.firstChild, label);
    label.remove();
  }
}

function initLiquidGlass() {
  $$(GLASS_SEL).forEach(unwrapLegacyGlass);

  document.addEventListener(
    "pointermove",
    (e) => {
      const el = e.target.closest(GLASS_SEL);
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      el.style.setProperty("--lg-x", `${((e.clientX - r.left) / r.width) * 100}%`);
      el.style.setProperty("--lg-y", `${((e.clientY - r.top) / r.height) * 100}%`);
    },
    { passive: true }
  );

  document.addEventListener(
    "pointerover",
    (e) => {
      const el = e.target.closest(GLASS_SEL);
      if (el) el.classList.add("is-liquid");
    },
    { passive: true }
  );

  document.addEventListener(
    "pointerout",
    (e) => {
      const el = e.target.closest(GLASS_SEL);
      if (!el) return;
      if (e.relatedTarget && el.contains(e.relatedTarget)) return;
      el.classList.remove("is-liquid");
    },
    { passive: true }
  );
}

/* -------------------------------------------------------------- Injection */
function injectChrome() {
  if (!$(".lg-defs")) {
    document.body.insertAdjacentHTML("afterbegin", liquidGlassDefs());
  }

  const headerSlot = $("[data-site-header]");
  const footerSlot = $("[data-site-footer]");

  if (headerSlot) headerSlot.outerHTML = buildHeader();
  else document.body.insertAdjacentHTML("afterbegin", buildHeader());

  if (footerSlot) footerSlot.outerHTML = buildFooter();
  else document.body.insertAdjacentHTML("beforeend", buildFooter());

  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
}

/* ------------------------------------------------------------------ Theme */
function initTheme() {
  const root = document.documentElement;
  const toggle = $("[data-theme-toggle]");
  toggle?.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("ms-theme", next);
    } catch {
      /* storage blocked — the choice just will not persist */
    }
  });
}

/* --------------------------------------------------------------- Nav logic */
function initNav() {
  const burger = $("[data-burger]");
  const drawer = $("[data-drawer]");

  burger?.addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    document.body.classList.toggle("is-locked", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });

  $$("[data-drawer-toggle]", drawer || document).forEach((btn) => {
    btn.addEventListener("click", () => btn.parentElement.classList.toggle("is-open"));
  });

  $$("a", drawer || document).forEach((link) => {
    link.addEventListener("click", () => {
      document.body.classList.remove("menu-open", "is-locked");
      burger?.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("menu-open")) {
      document.body.classList.remove("menu-open", "is-locked");
      burger?.setAttribute("aria-expanded", "false");
    }
  });

  // Header shrink / hide, plus the reading progress bar.
  const header = $("[data-header]");
  const progress = $("[data-progress]");
  let lastY = window.scrollY;

  const onScroll = () => {
    const y = window.scrollY;
    header?.classList.toggle("is-stuck", y > 12);

    const goingDown = y > lastY && y > 320;
    if (!document.body.classList.contains("menu-open")) {
      header?.classList.toggle("is-hidden", goingDown);
    }
    lastY = y;

    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

/* ---------------------------------------------------------------- Reveals */
function initReveals() {
  const items = $$("[data-reveal]");
  if (!items.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );

  items.forEach((el) => {
    // Stagger siblings that share a container.
    const group = el.dataset.revealGroup;
    if (group) {
      const siblings = $$(`[data-reveal-group="${group}"]`);
      el.style.setProperty("--reveal-delay", `${siblings.indexOf(el) * 0.07}s`);
    }
    observer.observe(el);
  });

  // Line-by-line headline reveals. These are observed in their own right —
  // a .split-line inside a heading that carries no [data-reveal] would
  // otherwise never be told to slide in, and would stay hidden for good.
  const lines = $$(".split-line");
  if (lines.length) {
    const lineObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          lineObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -5% 0px", threshold: 0.05 }
    );
    lines.forEach((line, i) => {
      line.style.setProperty("--line-delay", `${i * 0.08}s`);
      lineObserver.observe(line);
    });
  }
}

/* --------------------------------------------------------------- Counters */
function initCounters() {
  const counters = $$("[data-count]");
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        observer.unobserve(el);

        const target = parseFloat(el.dataset.count);
        const decimals = parseInt(el.dataset.decimals || "0", 10);
        const duration = 1500;
        const start = performance.now();

        const step = (now) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = (target * eased).toLocaleString("en-GB", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          });
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    },
    { threshold: 0.4 }
  );

  counters.forEach((el) => observer.observe(el));
}

/* -------------------------------------------------------------- Accordions */
function initAccordions() {
  $$(".acc__head").forEach((head) => {
    head.setAttribute("aria-expanded", "false");
    head.addEventListener("click", () => {
      const item = head.closest(".acc");
      const open = item.classList.toggle("is-open");
      head.setAttribute("aria-expanded", String(open));
    });
  });
}

/* ------------------------------------------------------------- Marquees */
function initMarquees() {
  $$(".marquee__track").forEach((track) => {
    if (track.dataset.cloned === "true") return;
    track.dataset.cloned = "true";
    track.innerHTML += track.innerHTML;
  });
}

/* ----------------------------------------------------------------- Filters */
function initFilters() {
  const groups = $$("[data-filter-group]");
  groups.forEach((group) => {
    const buttons = $$("[data-filter]", group);
    const container = $(group.dataset.filterTarget);
    if (!container) return;
    const items = $$(":scope > [data-category]", container);
    const empty = $("[data-empty]");

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const value = btn.dataset.filter;
        buttons.forEach((b) => b.classList.toggle("is-active", b === btn));

        let shown = 0;
        items.forEach((item) => {
          const match = value === "all" || item.dataset.category === value;
          item.style.display = match ? "" : "none";
          if (match) shown++;
        });
        if (empty) empty.style.display = shown === 0 ? "" : "none";
      });
    });
  });
}

/* ------------------------------------------------------------------ Forms */
function showStatus(form, message) {
  let status = form.querySelector(".form-status");
  if (!status) {
    status = document.createElement("div");
    status.className = "form-status";
    form.appendChild(status);
  }
  status.innerHTML = `<span class="form-status__mark" aria-hidden="true">✓</span><span>${message}</span>`;
  status.classList.add("is-visible");
  status.scrollIntoView({ behavior: "smooth", block: "center" });
}

function initForms() {
  $$("form[data-form]").forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      let valid = true;
      $$("[required]", form).forEach((input) => {
        const field = input.closest(".field") || input.closest(".check");
        const ok =
          input.type === "checkbox" ? input.checked : input.value.trim() !== "" && input.checkValidity();
        field?.classList.toggle("has-error", !ok);
        if (!ok && valid) {
          input.focus();
          valid = false;
        }
      });
      if (!valid) return;

      const button = form.querySelector('[type="submit"]');
      const original = button?.textContent;
      if (button) {
        button.disabled = true;
        button.textContent = "Sending…";
      }

      const endpoint = form.dataset.endpoint;
      try {
        if (endpoint) {
          await fetch(endpoint, {
            method: "POST",
            body: new FormData(form),
            headers: { Accept: "application/json" },
          });
        } else {
          // No endpoint configured yet — see README for wiring this up.
          await new Promise((r) => setTimeout(r, 700));
        }
        form.reset();
        showStatus(
          form,
          form.dataset.success ||
            `Thank you. Your enquiry reference has been logged and our export desk replies within one working day. For anything urgent call ${COMPANY.phone}.`
        );
      } catch {
        showStatus(
          form,
          `We could not submit that automatically. Please email ${COMPANY.email} and we will pick it up straight away.`
        );
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = original;
        }
      }
    });

    $$("input, select, textarea", form).forEach((input) => {
      input.addEventListener("input", () => {
        input.closest(".field")?.classList.remove("has-error");
        input.closest(".check")?.classList.remove("has-error");
      });
    });
  });

  $$("[data-newsletter]").forEach((form) => {
    const input = form.querySelector("input");
    const button = form.querySelector("button");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const band = form.closest(".footer__mid") || form;
    let holdTimer = 0;

    const setCenter = () => {
      if (!button || form.classList.contains("is-docked")) return;
      button.style.setProperty("transform", "none", "important");
      void button.offsetWidth;
      const dest = button.getBoundingClientRect();
      button.style.removeProperty("transform");
      if (!dest.width) return;
      const dx = window.innerWidth / 2 - (dest.left + dest.width / 2);
      button.style.setProperty("--nl-center", `${Math.round(dx)}px`);
    };

    const engaged = () =>
      form.contains(document.activeElement) || Boolean(input?.value.trim());

    const showCenter = () => {
      setCenter();
      form.classList.add("is-ready");
    };

    const dock = () => {
      showCenter();
      if (form.classList.contains("is-docked")) return;
      window.clearTimeout(holdTimer);
      holdTimer = window.setTimeout(() => form.classList.add("is-docked"), reduce ? 0 : 320);
    };

    const undock = () => {
      window.clearTimeout(holdTimer);
      form.classList.remove("is-docked");
      form.classList.add("is-ready");
    };

    const hide = () => {
      window.clearTimeout(holdTimer);
      form.classList.remove("is-docked", "is-ready");
    };

    const sync = () => {
      if (engaged()) {
        dock();
        return;
      }
      const r = band.getBoundingClientRect();
      const vh = window.innerHeight;
      const away = r.bottom < 0 || r.top > vh;
      const open = form.classList.contains("is-docked");

      if (away) {
        hide();
        return;
      }
      if (open && (r.top > vh * 0.84 || r.bottom < 56)) {
        undock();
        return;
      }
      if (!open && r.top < vh * 0.7 && r.bottom > 90) {
        dock();
      }
    };

    setCenter();
    window.addEventListener("resize", () => {
      setCenter();
      sync();
    }, { passive: true });

    if (reduce) {
      form.classList.add("is-ready", "is-docked");
    } else {
      const io = new IntersectionObserver(sync, { threshold: [0, 0.15, 0.4, 0.7] });
      io.observe(band);
      window.addEventListener("scroll", sync, { passive: true });
      requestAnimationFrame(sync);
    }

    button?.addEventListener("click", dock);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      dock();
      if (!input.value.trim() || !input.checkValidity()) {
        input.focus();
        return;
      }
      button.textContent = "Subscribed";
      input.value = "";
      setTimeout(() => (button.textContent = "Subscribe"), 2600);
    });
  });
}

/* ------------------------------------------- Catalogue heading dock */
function initCatDock() {
  $$("[data-catdock]").forEach((el) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const section = el.closest("section") || el;
    let holdTimer = 0;

    const dock = () => {
      el.classList.add("is-ready");
      if (el.classList.contains("is-docked")) return;
      window.clearTimeout(holdTimer);
      holdTimer = window.setTimeout(() => el.classList.add("is-docked"), reduce ? 0 : 280);
    };

    const undock = () => {
      window.clearTimeout(holdTimer);
      el.classList.remove("is-docked");
      el.classList.add("is-ready");
    };

    const hide = () => {
      window.clearTimeout(holdTimer);
      el.classList.remove("is-docked", "is-ready");
    };

    const sync = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const away = r.bottom < 0 || r.top > vh;
      const open = el.classList.contains("is-docked");

      if (away) {
        hide();
        return;
      }
      if (open && (r.top > vh * 0.82 || r.bottom < 40)) {
        undock();
        return;
      }
      if (!open && r.top < vh * 0.72 && r.bottom > 48) {
        dock();
      }
    };

    if (reduce) {
      el.classList.add("is-ready", "is-docked");
      return;
    }

    const io = new IntersectionObserver(sync, { threshold: [0, 0.2, 0.5, 0.8] });
    io.observe(section);
    window.addEventListener("scroll", sync, { passive: true });
    requestAnimationFrame(sync);
  });
}

/* ------------------------------------------------------------- Side index */
function initSideIndex() {
  const index = $(".sideindex");
  if (!index) return;
  const links = $$("a", index);
  const sections = links
    .map((link) => document.getElementById(link.getAttribute("href").slice(1)))
    .filter(Boolean);
  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) =>
          link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`)
        );
      });
    },
    { rootMargin: "-20% 0px -70% 0px" }
  );
  sections.forEach((section) => observer.observe(section));
}

/* -------------------------------------------------------------- Preloader */
function initPreloader() {
  const pre = $("[data-preloader]");
  if (!pre) {
    document.body.classList.add("is-loaded");
    return;
  }
  const bar = $("i", pre);
  const pct = $("[data-pct]", pre);
  let value = 0;

  const advance = () => {
    value = Math.min(100, value + Math.random() * 18 + 6);
    if (bar) bar.style.width = `${value}%`;
    if (pct) pct.textContent = `${Math.round(value)}%`;
    if (value < 100) setTimeout(advance, 90 + Math.random() * 110);
    else setTimeout(() => document.body.classList.add("is-loaded"), 240);
  };
  setTimeout(advance, 120);

  // Never trap the visitor behind the loader.
  setTimeout(() => document.body.classList.add("is-loaded"), 4500);
}

/* -------------------------------------------------------------------- 3D */
async function initGraphics() {
  const needsTiles = document.querySelector(".pcard__stage[data-model]");
  const heroMount = $("[data-hero-canvas]");
  const showcase = $("[data-scrollscene]");
  const viewerMount = $("[data-viewer]");

  if (!needsTiles && !heroMount && !showcase && !viewerMount) return;

  try {
    const { preloadModels } = await import("./lib/models.js");
    await preloadModels();

    if (heroMount) {
      const { initHero } = await import("./scenes/hero.js");
      initHero(heroMount);
    }
    if (showcase) {
      const { initShowcase } = await import("./scenes/showcase.js");
      initShowcase(showcase);
    }
    if (viewerMount) {
      const { initViewer } = await import("./scenes/viewer.js");
      const viewer = initViewer(viewerMount, viewerMount.dataset.viewer, {
        distance: parseFloat(viewerMount.dataset.distance || "4.6"),
      });
      $("[data-viewer-reset]")?.addEventListener("click", () => viewer?.reset());
      $("[data-viewer-spin]")?.addEventListener("click", (e) => {
        const spinning = viewer?.toggleSpin();
        e.currentTarget.setAttribute("aria-pressed", String(spinning));
      });
    }
    if (needsTiles) {
      const { mountProductTiles } = await import("./scenes/tiles.js");
      mountProductTiles();
    }
  } catch (err) {
    console.error("3D initialisation failed", err);
  }
}

/* ------------------------------------------------------------------- Boot */
function boot() {
  injectChrome();
  initLiquidGlass();
  initTheme();
  initNav();
  initReveals();
  initCounters();
  initAccordions();
  initMarquees();
  initFilters();
  initForms();
  initCatDock();
  initSideIndex();
  initPreloader();
  initGraphics();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
