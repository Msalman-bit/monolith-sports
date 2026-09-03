/* Populates the RFQ product list and preselects ?product= from a detail page. */

import { PRODUCTS, CATEGORIES, categoryName } from "../data.js";

const select = document.querySelector("[data-quote-products]");
if (select) {
  const groups = CATEGORIES.map((cat) => {
    const options = PRODUCTS.filter((p) => p.category === cat.id)
      .map((p) => `<option value="${p.id}">${p.name} — ${p.sku}</option>`)
      .join("");
    return `<optgroup label="${cat.name}">${options}</optgroup>`;
  }).join("");

  select.innerHTML = `
    <option value="" disabled selected>Select a product line…</option>
    ${groups}
    <option value="custom">Something not in the catalogue</option>`;

  const requested = new URLSearchParams(window.location.search).get("product");
  if (requested && select.querySelector(`option[value="${CSS.escape(requested)}"]`)) {
    select.value = requested;

    const note = document.querySelector("[data-quote-note]");
    const product = PRODUCTS.find((p) => p.id === requested);
    if (note && product) {
      note.innerHTML = `Pre-filled from <strong>${product.name}</strong> (${product.sku},
        ${categoryName(product.category)}). Minimum order ${product.moq} units,
        indicative lead time ${product.leadTime}.`;
      note.style.display = "";
    }
  }
}
