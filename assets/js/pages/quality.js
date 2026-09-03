/* Renders the certification grid and register from data.js. */

import { CERTIFICATIONS } from "../data.js";

const escape = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const badges = document.querySelector("[data-cert-badges]");
if (badges) {
  badges.innerHTML = CERTIFICATIONS.map(
    (c) => `<div class="badge">
      <span class="badge__name">${escape(c.name)}</span>
      <span class="badge__sub">${escape(c.sub)}</span>
    </div>`
  ).join("");
}

const table = document.querySelector("[data-cert-table]");
if (table) {
  table.innerHTML = CERTIFICATIONS.map(
    (c) => `<tr>
      <td>${escape(c.name)}</td>
      <td>${escape(c.sub)}</td>
      <td>${escape(c.body)}</td>
      <td>${escape(c.scope)}</td>
      <td>${c.since}</td>
    </tr>`
  ).join("");
}
