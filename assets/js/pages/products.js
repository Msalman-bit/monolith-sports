/* Renders the catalogue from data.js before site.js boots. */

import { PRODUCTS, CATEGORIES, productsByCategory } from "../data.js";

const escape = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const FEATURED = [
  "heritage-32",
  "ace-tour-racket",
  "guardian-batting-pad",
  "apex-lite-shin",
  "bastion-shin-guard",
];

const SHOTS = import.meta.glob("../../img/products/*.jpg", {
  eager: true,
  query: "?url",
  import: "default",
});

const shot = (id) =>
  SHOTS[`../../img/products/${id}.jpg`] || `assets/img/products/${id}.jpg`;

function stage(product, { eager = false } = {}) {
  return `
    <div class="pcard__stage" data-shot>
      <img class="pcard__shot" src="${shot(product.id)}" alt="${escape(product.name)}" width="1400" height="1050" ${eager ? 'fetchpriority="high"' : ""} loading="${eager ? "eager" : "lazy"}" decoding="async">
    </div>`;
}

function card(product, { featured = false, eager = false } = {}) {
  const cat = CATEGORIES.find((c) => c.id === product.category);
  const kicker = featured ? cat?.name || product.sku : product.sku;

  return `
  <article class="pcard pcard--photo">
    ${stage(product, { eager })}
    <div class="pcard__body">
      <div class="pcard__meta">
        <span class="pcard__cat">${escape(kicker)}</span>
        <span class="pcard__badge">${escape(product.badge)}</span>
      </div>
      <h3 class="pcard__name">${escape(product.name)}</h3>
      <p class="pcard__desc">${escape(product.blurb)}</p>
      <div class="pcard__foot">
        <span>MOQ ${product.moq}${featured ? "" : ` · ${escape(product.leadTime)}`}</span>
        <a class="pcard__link" href="product.html?id=${product.id}">View spec</a>
      </div>
    </div>
  </article>`;
}

const featuredMount = document.querySelector("[data-featured]");
if (featuredMount) {
  featuredMount.innerHTML = FEATURED.map((id) => PRODUCTS.find((p) => p.id === id))
    .filter(Boolean)
    .map((p, i) => card(p, { featured: true, eager: i === 0 }))
    .join("");
}

const filterMount = document.querySelector("[data-filters]");
if (filterMount) {
  filterMount.innerHTML = `
    <button class="filter is-active" data-filter="all">All <i>${PRODUCTS.length}</i></button>
    ${CATEGORIES.map(
      (c) =>
        `<button class="filter" data-filter="${c.id}">${escape(c.name)} <i>${
          productsByCategory(c.id).length
        }</i></button>`
    ).join("")}`;
}

// One anchored section per category. Filtering shows and hides whole sections,
// so a product only ever appears once on the page.
const sections = document.querySelector("[data-category-sections]");
if (sections) {
  sections.innerHTML = CATEGORIES.map(
    (c, i) => `
    <section class="section section--tight${i > 0 ? " section--line" : ""}${
      i % 2 === 1 ? " section--alt" : ""
    }" id="${c.id}" data-category="${c.id}">
      <div class="shell">
        <div class="section-head section-head--split">
          <div class="section-head__title">
            <p class="eyebrow" data-reveal="fade">${c.code} — ${productsByCategory(c.id).length} lines</p>
            <h2 data-reveal>${escape(c.name)}</h2>
          </div>
          <p class="body-lg" data-reveal>${escape(c.blurb)}</p>
        </div>
        <div class="grid grid-3">
          ${productsByCategory(c.id).map((p) => card(p)).join("")}
        </div>
      </div>
    </section>`
  ).join("");
}
