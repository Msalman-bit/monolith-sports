/* Populates the product detail page from ?id= before site.js boots. */

import { getProduct, PRODUCTS, categoryName, TRADE, COMPANY } from "../data.js";

const escape = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const params = new URLSearchParams(window.location.search);
const product = getProduct(params.get("id")) || PRODUCTS[0];

const set = (sel, html) => {
  const el = document.querySelector(sel);
  if (el) el.innerHTML = html;
};

document.title = `${product.name} — ${COMPANY.name}`;
document
  .querySelector('meta[name="description"]')
  ?.setAttribute("content", `${product.name}. ${product.blurb} MOQ ${product.moq}, lead time ${product.leadTime}, HS code ${product.hsCode}. Manufactured in Sialkot and exported to the EU.`);

/* Viewer mount */
const viewer = document.querySelector("[data-viewer-mount]");
if (viewer) {
  viewer.setAttribute("data-viewer", product.model);
  viewer.setAttribute("data-distance", "4.6");
}

/* Header */
set("[data-p-breadcrumb]", `
  <a href="index.html">Home</a><span>/</span>
  <a href="products.html">Products</a><span>/</span>
  <a href="products.html#${product.category}">${escape(categoryName(product.category))}</a><span>/</span>
  <span style="opacity:1;color:var(--fg)">${escape(product.name)}</span>`);

set("[data-p-eyebrow]", `${escape(product.sku)} — ${escape(categoryName(product.category))}`);
set("[data-p-name]", escape(product.name));
set("[data-p-blurb]", escape(product.blurb));
set("[data-p-badge]", escape(product.badge));

set("[data-p-tags]", product.tags.map((t) => `<span class="tag">${escape(t)}</span>`).join(""));

/* Commercial block */
set("[data-p-commercial]", `
  <div class="spec-list">
    <div class="spec-list__row"><dt>Indicative price</dt><dd>${escape(product.price)}</dd></div>
    <div class="spec-list__row"><dt>Minimum order</dt><dd>${product.moq} units</dd></div>
    <div class="spec-list__row"><dt>Lead time</dt><dd>${escape(product.leadTime)}</dd></div>
    <div class="spec-list__row"><dt>HS code</dt><dd>${escape(product.hsCode)}</dd></div>
    <div class="spec-list__row"><dt>Incoterms</dt><dd>${TRADE.incoterms.slice(0, 5).join(" · ")}</dd></div>
    <div class="spec-list__row"><dt>Payment</dt><dd>${escape(TRADE.payment[0])}, or ${escape(TRADE.payment[1])}</dd></div>
  </div>`);

/* Description + features */
set("[data-p-description]", `<p>${escape(product.description)}</p>`);

set("[data-p-features]", product.features
  .map(
    (f, i) => `<div class="feat">
      <span class="feat__mark">${String(i + 1).padStart(2, "0")}</span>
      <span class="feat__title">${escape(f)}</span>
    </div>`
  )
  .join(""));

/* Full specification table */
set("[data-p-specs]", Object.entries(product.specs)
  .map(
    ([key, value]) =>
      `<div class="spec-list__row"><dt>${escape(key)}</dt><dd>${escape(value)}</dd></div>`
  )
  .join(""));

/* Quote deep link */
document.querySelectorAll("[data-p-quote]").forEach((a) => {
  a.setAttribute("href", `quote.html?product=${product.id}`);
});

/* Related products from the same category */
const related = PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 3);
const fallback = PRODUCTS.filter((p) => p.id !== product.id).slice(0, 3);
set("[data-p-related]", (related.length ? related : fallback)
  .map(
    (p) => `
    <article class="pcard" data-reveal data-reveal-group="rel">
      <div class="pcard__stage" data-model="${p.model}" data-distance="4.4">
        <span class="pcard__badge">${escape(p.badge)}</span>
      </div>
      <div class="pcard__body">
        <span class="pcard__cat">${escape(p.sku)}</span>
        <h3 class="pcard__name">${escape(p.name)}</h3>
        <p class="pcard__desc">${escape(p.blurb)}</p>
        <div class="pcard__foot">
          <span>MOQ ${p.moq}</span>
          <a class="pcard__link" href="product.html?id=${p.id}">Detail →</a>
        </div>
      </div>
    </article>`
  )
  .join(""));

/* Structured data helps the listing surface properly in search results. */
const ld = document.createElement("script");
ld.type = "application/ld+json";
ld.textContent = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Product",
  name: product.name,
  sku: product.sku,
  description: product.blurb,
  category: categoryName(product.category),
  brand: { "@type": "Brand", name: COMPANY.name },
  manufacturer: { "@type": "Organization", name: COMPANY.legalName },
});
document.head.appendChild(ld);
