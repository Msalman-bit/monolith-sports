/* Renders the catalogue from data.js before site.js boots. */

import { PRODUCTS, CATEGORIES, productsByCategory } from "../data.js";

const escape = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function card(product) {
  const specs = Object.entries(product.specs)
    .slice(0, 2)
    .map(([, value]) => `<span class="tag">${escape(value)}</span>`)
    .join("");

  return `
  <article class="pcard" data-reveal data-reveal-group="cat-${product.category}">
    <div class="pcard__stage" data-model="${product.model}" data-distance="${product.model === "footballShinGuard" ? "3.8" : "4.4"}" data-radius="${product.model === "footballShinGuard" ? "1.15" : "1"}">
      <span class="pcard__badge">${escape(product.badge)}</span>
      <span class="pcard__spin">Hover to spin</span>
    </div>
    <div class="pcard__body">
      <span class="pcard__cat">${escape(product.sku)}</span>
      <h3 class="pcard__name">${escape(product.name)}</h3>
      <p class="pcard__desc">${escape(product.blurb)}</p>
      <div class="pcard__specs">${specs}</div>
      <div class="pcard__foot">
        <span>MOQ ${product.moq} · ${escape(product.leadTime)}</span>
        <a class="pcard__link" href="product.html?id=${product.id}">Detail →</a>
      </div>
    </div>
  </article>`;
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
          ${productsByCategory(c.id).map(card).join("")}
        </div>
      </div>
    </section>`
  ).join("");
}
