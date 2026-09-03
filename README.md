# Monolith Sports — Export Website

A corporate website for a Sialkot-based sports goods manufacturer selling into the
European Union. Black-and-white interface, full-colour 3D products, scroll-driven
animation throughout.

Built with plain HTML, CSS and JavaScript modules, bundled by [Vite](https://vite.dev),
with 3D rendered by [Three.js](https://threejs.org). Every product model and texture is
generated in code at runtime — the site ships with **no image or model files at all**.

---

## Running it

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install     # once
npm run dev     # http://localhost:5173
```

To produce the deployable site:

```bash
npm run build     # writes ./dist
npm run preview   # serve ./dist locally to check it
```

Everything in `dist/` is static. Upload it to Netlify, Vercel, Cloudflare Pages,
GitHub Pages, or any shared cPanel host. The build uses relative paths, so it also
works from a sub-folder.

---

## Pages

| File | Purpose |
| --- | --- |
| `index.html` | Home — 3D hero, scroll showcase, credentials, route to market |
| `products.html` | Catalogue, filterable, one anchored section per category |
| `product.html` | Product detail; reads `?id=` and renders from the catalogue data |
| `about.html` | Company story, timeline, values, leadership |
| `manufacturing.html` | Facilities, capacity, scroll-driven production sequence, lab tests |
| `quality.html` | Certification register, conformity pack, standards matrix |
| `sustainability.html` | Atlanta Agreement, labour, environment, emissions |
| `export.html` | GSP+, GPSR, EUDR, Incoterms, HS codes, transit times, payment |
| `oem.html` | OEM and private label, customisation, IP protection |
| `insights.html` | Long-form buyer articles |
| `careers.html` | Open roles and benefits |
| `contact.html` | Contact routes and message form |
| `quote.html` | Request-for-quotation form |
| `faq.html` | Buyer FAQ |
| `privacy.html`, `terms.html` | Legal templates |
| `404.html` | Not found |

New pages are picked up automatically — drop a `.html` file in the project root and
Vite adds it to the build.

---

## Editing content

### Company details, navigation, products

Almost everything lives in **`assets/js/data.js`**:

- `COMPANY` — name, addresses, phone, email, registration numbers
- `NAV` — the header menu and its dropdowns
- `CATEGORIES` — product categories
- `PRODUCTS` — the full catalogue
- `CERTIFICATIONS` — the register shown on the quality page
- `TRADE` — incoterms, ports, payment terms

Change a phone number there and it updates on every page, because the header and
footer are built from this file by `assets/js/site.js`.

### Adding a product

Append an object to `PRODUCTS` in `data.js`. The catalogue page, category sections,
detail page, quote dropdown and related-products list all pick it up with no other
edits. The `model` field must be one of the keys in `MODEL_FACTORIES`
(see `assets/js/lib/models.js`) — for example `ballThermo`, `boxingGlove`,
`cricketBat`, `kettlebell`.

### Page copy

Headings and body text sit directly in the `.html` files. They are ordinary HTML,
so you can edit them without touching JavaScript.

---

## Making the forms actually send

The contact and quote forms validate and show a success state, but they do not yet
deliver anywhere. Pick a service and add one attribute:

```html
<form class="form" data-form data-endpoint="https://formspree.io/f/YOUR_ID">
```

Any endpoint accepting a `POST` of `FormData` works — Formspree, Web3Forms, Getform,
Basin, or a Netlify function. On Netlify you can instead add `netlify` and
`name="contact"` to the `<form>` tag and let Netlify Forms capture it.

Handling lives in `initForms()` in `assets/js/site.js`.

---

## How the 3D works

There are no `.glb` or `.fbx` files. Products are assembled from Three.js primitives
and finished with textures painted onto a `<canvas>` at load time.

```
assets/js/lib/gl.js          Renderer, studio lighting, shared rAF ticker, scroll maths
assets/js/lib/materials.js   Canvas-generated textures and material presets
assets/js/lib/models.js      One factory function per product
assets/js/scenes/hero.js     Home hero: centrepiece plus orbiting satellites
assets/js/scenes/showcase.js Pinned section where scrolling drives the carousel
assets/js/scenes/viewer.js   Drag-to-orbit viewer on product pages
assets/js/scenes/tiles.js    Every product card, from a single WebGL context
```

Three details worth knowing if you extend it:

- **Football panels are real geometry, not a photo.** The classic 32-panel pattern is
  computed as a spherical Voronoi diagram over the 12 vertices and 20 face centres of
  an icosahedron, which is exactly a truncated icosahedron. That gets painted into an
  equirectangular texture, which is the UV layout `THREE.SphereGeometry` expects.
- **A product grid uses one WebGL context, not one per card.** Browsers cap contexts
  at roughly sixteen. `tiles.js` renders each visible card in turn into one shared
  canvas and blits the result into each card's own 2D canvas.
- **Off-screen scenes stop rendering.** Every stage watches an `IntersectionObserver`
  and one shared `requestAnimationFrame` loop drives the whole page.

`prefers-reduced-motion` disables spin, bob and scroll-linked movement. If WebGL is
unavailable the canvases degrade to a static placeholder rather than breaking.

---

## Theme

The interface is deliberately monochrome. Products are the only colour on the page.

Black is the default. The circle button in the header switches to the white theme and
the choice is remembered in `localStorage`. To remove the switch entirely, delete the
`[data-theme-toggle]` button from `buildHeader()` in `site.js`.

Design tokens are at the top of `assets/css/main.css` — the neutral ramp, type scale,
spacing, and the corner radii (`--r-sm` through `--r-2xl`, plus `--r-pill`).

---

## Before you go live

The site is fully built but the company in it is fictional. Replace:

- [ ] `COMPANY` in `data.js` — name, addresses, phone, email, NTN, EORI
- [ ] All `@monolithsports.example` email addresses
- [ ] The `PRODUCTS` catalogue with your real lines, MOQs, lead times and pricing
- [ ] `CERTIFICATIONS` with certificates you actually hold — **delete any you do not**
- [ ] Statistics and claims throughout the page copy (capacity, headcount, audit results)
- [ ] `public/sitemap.xml` and `public/robots.txt` — swap in your real domain
- [ ] The `<link rel="canonical">` and `og:` tags in each page's `<head>`
- [ ] `privacy.html` and `terms.html` — templates only, have a lawyer review them
- [ ] Form endpoint, as described above
- [ ] The team names and photos placeholder initials on `about.html`

The regulatory references (GPSR, PPE Regulation, REACH, EUDR, GSP+, HS codes) are
written to be accurate as general guidance, but duty rates and legal obligations change.
Verify anything you rely on commercially against current official sources.

---

## Browser support

Modern evergreen browsers. Requires WebGL2 for 3D, ES modules, CSS custom properties,
`color-mix()` and container-friendly `clamp()` sizing. Degrades gracefully without WebGL.
