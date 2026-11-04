#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
//  merge-catalog.js
//
//  One-time import: merges BestOfSigns' catalog.json (58 products, richer
//  pricing: sizes w/ graphic+hardware split, custom-size sq-ft brackets,
//  option groups, Complete/Graphic-Only packages, quantity discount tiers)
//  into products-data.json, replacing the old flat per-size pricing while
//  KEEPING this site's existing slugs, SEO copy, hero copy, catalog-card
//  copy, imageUrl, stripeLink and netlifyForm (per Brian's decision:
//  "replace pricing, keep my slugs").
//
//  Special case: the site had two separate products, yard-signs and
//  yard-signs-with-stakes, that both match BestOfSigns' single "Yard
//  Signs with Stakes" product. Per Brian's decision, these are merged
//  into one product at slug "yard-signs"; yard-signs-with-stakes is
//  dropped (generate-products.js leaves a redirect stub in its place).
//
//  pricing.js (BestOfSigns' calcPrice) and catalog.json are used AS-IS,
//  unmodified, exactly as Brian required. This script does not bake a
//  markup or .99/.49 rounding into stored prices — those are applied at
//  calculation time (see products/price-display.js), so pricing.js's own
//  test suite (test_pricing.js) keeps passing against raw BestOfSigns
//  figures untouched by this import.
//
//  Usage: node merge-catalog.js
// ══════════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

const DEFAULT_MARKUP = 0.9; // 10% under BestOfSigns list price — Brian's choice

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf-8')).products;
const existingData = JSON.parse(fs.readFileSync(path.join(ROOT, 'products-data.json'), 'utf-8'));
const existing = existingData.products;

function slugifyKey(label) {
  return String(label).toLowerCase().trim().replace(/['"]/g, '').replace(/\s+/g, '').replace(/[^a-z0-9.x]/g, '');
}

const catBySlug = new Map(catalog.map(p => [p.slug, p]));
const catByTitle = new Map(catalog.map(p => [p.title.toLowerCase(), p]));

function findCatalogMatch(p) {
  const slug = p.slug || '';
  const title = (p.panelHeading || p.productLabel || '').toLowerCase();
  return catBySlug.get(slug) || catByTitle.get(title) || null;
}

// ── 1. Merge the yard-signs duplicate before anything else ─────────────
const ys = existing.find(p => p.slug === 'yard-signs');
const ysStakes = existing.find(p => p.slug === 'yard-signs-with-stakes');
const dropped = [];
let merged = existing.filter(p => p.slug !== 'yard-signs-with-stakes');
if (ys && ysStakes) {
  dropped.push({ droppedSlug: 'yard-signs-with-stakes', keptSlug: 'yard-signs', redirectTo: '/products/yard-signs/' });
}

// ── 2. Build each product's new pricing block from the catalog match ───
const unmatched = [];
const usedCatalogSlugs = new Set();

function buildSizes(cat) {
  return cat.sizes.map(s => ({
    key: slugifyKey(s.label),
    label: s.label,
    price: s.price,
    salePrice: s.salePrice != null ? s.salePrice : null,
    graphicPrice: s.graphicPrice != null ? s.graphicPrice : s.price,
    hardwarePrice: s.hardwarePrice || 0,
    isCustom: false,
  }));
}

const out = merged.map(p => {
  const cat = findCatalogMatch(p);
  if (!cat) { unmatched.push(p.slug); return p; }
  usedCatalogSlugs.add(cat.slug);

  const sizes = buildSizes(cat);
  const newPricing = {
    markup: DEFAULT_MARKUP,
    designFee: 0, // BestOfSigns pricing has no flat design fee (dropped — flagged for Brian's review)
    minQty: 1,
    qtyStep: 1,
    // Same field name/shape as catalog.json/pricing.js (quantityDiscounts: [{minQty, percentOff}])
    // so product.pricing can be passed straight into calcPrice with no translation layer.
    quantityDiscounts: cat.quantityDiscounts || [],
    sizes,
    customSize: cat.customSize ? {
      unit: cat.customSize.unit,
      maxWidth: cat.customSize.maxWidth,
      maxHeight: cat.customSize.maxHeight,
      minimumPrice: cat.customSize.minimumPrice,
      brackets: cat.customSize.brackets,
    } : undefined,
    options: cat.options && cat.options.length ? cat.options : undefined,
    packages: cat.packages && cat.packages.length ? cat.packages : undefined,
  };

  // "From" price for the catalog card: cheapest standard size, markup applied, no options, complete package
  const { calcDisplayPrice } = require('./price-display.js');
  let cheapest = Infinity;
  for (const s of sizes) {
    const r = calcDisplayPrice(newPricing, { size: s.label });
    if (r.unit < cheapest) cheapest = r.unit;
  }

  return {
    ...p,
    category: cat.category,
    catalogCard: { ...p.catalogCard, priceFrom: Math.round(cheapest * 100) / 100 },
    pricing: newPricing,
    bosSourceSlug: cat.slug, // internal only — never rendered publicly
  };
});

fs.writeFileSync(path.join(ROOT, 'products-data.json'), JSON.stringify({ products: out }, null, 2), 'utf-8');

console.log(`Wrote products-data.json with ${out.length} product(s).`);
console.log(`Catalog products matched: ${usedCatalogSlugs.size} / ${catalog.length}`);
if (unmatched.length) console.log('Existing products with NO catalog match (pricing left untouched):', unmatched.join(', '));
const unusedCatalog = catalog.filter(c => !usedCatalogSlugs.has(c.slug)).map(c => c.slug);
if (unusedCatalog.length) console.log('Catalog products not used (no existing match):', unusedCatalog.join(', '));
console.log('Dropped as duplicate:', JSON.stringify(dropped));
