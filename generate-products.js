#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
//  generate-products.js
//  Reads products/products-data.json + products/_product-template.html
//  and writes:
//    - products/<slug>/index.html   for every active product
//    - the PRODUCT_GRID block inside products.html (catalog cards)
//
//  Run this after editing products-data.json (or let the dashboard sync
//  do it for you). Does NOT touch bookonline.html, index.html, or dist/ —
//  copy the generated files into dist/ yourself afterward (or ask Claude).
// ══════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA_PATH = path.join(ROOT, 'products', 'products-data.json');
const TEMPLATE_PATH = path.join(ROOT, 'products', '_product-template.html');
const PRODUCTS_HTML_PATH = path.join(ROOT, 'products.html');

function fmtMoney(n) {
  return '$' + Number(n).toFixed(2).replace(/\.00$/, '.00');
}

// Builds the JSON blob embedded in each product page as `const PRODUCT = ...;`.
// Shape matches what pricing.js's calcPrice (via price-display.js) expects —
// sizes/customSize/options/packages/quantityDiscounts pass straight through
// with no translation layer — plus a few page-only fields (label, links).
function buildProductJSON(product) {
  const p = product.pricing;
  return JSON.stringify({
    slug: product.slug,
    label: product.productLabel || product.panelHeading,
    stripeLink: product.stripeLink,
    netlifyForm: product.netlifyForm,
    markup: p.markup != null ? p.markup : 1,
    designFee: p.designFee || 0,
    minQty: p.minQty || 1,
    qtyStep: p.qtyStep || 1,
    sizes: p.sizes,
    customSize: p.customSize || null,
    options: p.options || null,
    packages: p.packages || null,
    quantityDiscounts: p.quantityDiscounts || [],
  });
}

function escAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// The image block that sits directly under the product's H1. Renders the
// real photo once one's set in the dashboard (imageUrl); until then, an
// honest placeholder — same pattern the main site already uses elsewhere
// instead of stock photography (see yard-signs/corrugated-signs in the
// SEO tracker) — rather than a broken image or an empty gap.
function buildProductImageBlock(product) {
  if (product.imageUrl) {
    const imgs = [product.imageUrl].concat((product.extraImages || []).filter(Boolean)).slice(0, 3);
    const alt = escAttr(product.panelHeading);
    const main = `<img class="pp-main" id="pp-main" src="${escAttr(imgs[0])}" alt="${alt}" width="1200" height="1200">`;
    if (imgs.length === 1) return main;
    const thumbs = imgs.map((u, i) =>
      `<button type="button" class="pp-thumb${i === 0 ? ' sel' : ''}" onclick="ppShow(this)" data-src="${escAttr(u)}" aria-label="Show photo ${i + 1} of ${imgs.length}"><img src="${escAttr(u)}" alt="${alt} — photo ${i + 1}" loading="lazy" width="200" height="200"></button>`
    ).join('');
    return `${main}<div class="pp-thumbs">${thumbs}</div>`;
  }
  return [
    '<div class="product-photo-placeholder">',
    '  <span class="ph-icon">📷</span>',
    '  <p>Photo coming soon</p>',
    '</div>',
  ].join('\n        ');
}

function renderProductPage(template, product) {
  let out = template;
  const replacements = {
    '{{SEO_TITLE}}': product.seo.title,
    '{{SEO_DESCRIPTION}}': product.seo.description,
    '{{PANEL_HEADING}}': product.panelHeading,
    '{{PRODUCT_IMAGE}}': buildProductImageBlock(product),
    '{{PRODUCT_JSON}}': buildProductJSON(product),
  };
  for (const [token, value] of Object.entries(replacements)) {
    if (out.indexOf(token) === -1) {
      throw new Error(`Template missing expected token: ${token}`);
    }
    out = out.split(token).join(value);
  }
  const leftover = out.match(/\{\{[A-Z_]+\}\}/);
  if (leftover) throw new Error(`Unreplaced placeholder left in output: ${leftover[0]}`);
  return out;
}

function renderProductCard(product) {
  const priceFrom = fmtMoney(product.catalogCard.priceFrom);
  return [
    `          <a class="product-card" href="/products/${product.slug}/">`,
    ...(product.imageUrl ? [`            <div class="product-card-img"><img src="${product.imageUrl.replace(/^https?:\/\/[^/]+/, '')}" alt="${product.panelHeading} — Fly Visuals" loading="lazy" width="600" height="600"></div>`] : []),
    `            <div class="product-card-title">${product.panelHeading}</div>`,
    `            <div class="product-card-desc">${product.catalogCard.desc}</div>`,
    `            <div class="product-card-price">From ${priceFrom}<span> / each</span></div>`,
    `            <div class="product-card-cta">${product.catalogCard.cta}</div>`,
    `          </a>`,
  ].join('\n');
}

// ── Category tabs ───────────────────────────────────────────────────────
// Order controls both the tab-bar button order and which category is shown
// active by default (the first one that has at least one active product).
const CATEGORY_ORDER = [
  'Banners',
  'Banner Stands',
  'Custom Signs',
  'Trade Show Displays',
  'Outdoor Displays',
  'Stickers and Decals',
];

function categorySlug(cat) {
  return cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function renderTabBar(categories) {
  const buttons = categories.map((cat, i) => {
    const slug = categorySlug(cat);
    const activeClass = i === 0 ? ' active' : '';
    return `          <button type="button" class="tab-btn${activeClass}" data-category="${slug}" onclick="showCategory('${slug}')">${cat}</button>`;
  });
  return ['        <div id="tab-bar">', ...buttons, '        </div>'].join('\n');
}

function renderCategorySection(cat, productsInCat, isFirst) {
  const slug = categorySlug(cat);
  const cards = productsInCat.map(renderProductCard).join('\n');
  return [
    `        <section id="cat-${slug}" class="tab-content${isFirst ? ' active' : ''}" data-category="${slug}">`,
    '          <div class="product-grid">',
    cards,
    '          </div>',
    '        </section>',
  ].join('\n');
}

function main() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

  const products = [...data.products].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const active = products.filter(p => p.active !== false);

  // ── 1. Write each product's page ──────────────────────────────────────
  for (const product of active) {
    const html = renderProductPage(template, product);
    const outDir = path.join(ROOT, 'products', product.slug);
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'index.html');
    fs.writeFileSync(outPath, html, 'utf-8');
    console.log(`  wrote products/${product.slug}/index.html`);
  }

  // ── 2. Rebuild the PRODUCT_GRID block inside products.html ───────────
  // Group active products by category, in CATEGORY_ORDER, and emit a
  // tab-bar button + its own .tab-content section per category that has
  // at least one active product. The first populated category is shown
  // active by default.
  const byCategory = new Map();
  for (const cat of CATEGORY_ORDER) byCategory.set(cat, []);
  for (const product of active) {
    if (!product.category || !byCategory.has(product.category)) {
      throw new Error(`Product "${product.slug}" has a missing or unrecognized category: ${JSON.stringify(product.category)}`);
    }
    byCategory.get(product.category).push(product);
  }
  const presentCategories = CATEGORY_ORDER.filter(cat => byCategory.get(cat).length > 0);
  if (presentCategories.length === 0) {
    throw new Error('No active products with a recognized category — refusing to blank out the catalog page.');
  }
  const tabBarHtml = renderTabBar(presentCategories);
  const sectionsHtml = presentCategories
    .map((cat, i) => renderCategorySection(cat, byCategory.get(cat), i === 0))
    .join('\n\n');
  const blockHtml = tabBarHtml + '\n\n' + sectionsHtml;

  let catalogSrc = fs.readFileSync(PRODUCTS_HTML_PATH, 'utf-8');
  const startMarker = '<!-- PRODUCT_GRID:START (auto-generated by generate-products.js — do not hand-edit) -->';
  const endMarker = '<!-- PRODUCT_GRID:END -->';
  const startIdx = catalogSrc.indexOf(startMarker);
  const endIdx = catalogSrc.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('PRODUCT_GRID markers not found in products.html — run the one-time marker setup first.');
  }
  const before = catalogSrc.slice(0, startIdx + startMarker.length);
  const after = catalogSrc.slice(endIdx);
  catalogSrc = before + '\n' + blockHtml + '\n        ' + after;
  fs.writeFileSync(PRODUCTS_HTML_PATH, catalogSrc, 'utf-8');
  console.log(`  updated products.html catalog grid (${presentCategories.length} categories: ${presentCategories.join(', ')})`);

  console.log(`\nDone. ${active.length} active product page(s) generated.`);
  console.log('Remember: copy the changed files into dist/ before deploying.');
}

main();
