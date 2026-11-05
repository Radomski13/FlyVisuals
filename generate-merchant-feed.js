#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
//  generate-merchant-feed.js
//
//  Reads products/products-data.json and writes a Google Merchant Center
//  product feed (XML, RSS 2.0 + g: namespace) to dist/google-merchant-feed.xml.
//  Point Merchant Center's "scheduled fetch" at:
//    https://flyvisualsfl.com/google-merchant-feed.xml
//
//  ONE LISTING PER SIZE, not per product — Merchant Center wants one fixed
//  price per listing, and each size has its own price. All sizes of one
//  product share an item_group_id so Google groups them as variants.
//
//  A product/size is INCLUDED only if:
//    - the product is active
//    - the product has a real imageUrl set (Google requires a real photo,
//      min 500×500px — no generic/placeholder images)
//    - the size is not a "Custom Size" (isCustom: true) — those have no
//      fixed price/dimension, so they aren't shoppable listings
//
//  Run with: node generate-merchant-feed.js
// ══════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const { calcDisplayPrice } = require(path.join(ROOT, 'products', 'price-display.js'));
const DATA_PATH = path.join(ROOT, 'products', 'products-data.json');
const OUT_PATH = path.join(ROOT, 'dist', 'google-merchant-feed.xml');
// Local inventory feed (separate Merchant Center data source) — fixes the
// "Missing local inventory data" issue for free local listings / pickup.
//   https://flyvisualsfl.com/google-local-inventory.tsv
const LOCAL_OUT_PATH = path.join(ROOT, 'dist', 'google-local-inventory.tsv');

const SITE = 'https://flyvisualsfl.com';
const BRAND = 'Fly Visuals';
const CURRENCY = 'USD';
// Best-guess Google product taxonomy path — double-check / let Merchant
// Center's own category suggestion override this if it disagrees.
const GOOGLE_CATEGORY = 'Business & Industrial > Advertising & Marketing > Signage';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cdata(s) {
  return `<![CDATA[${String(s == null ? '' : s).replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

// Local pickup ("Buy online, pick up in store") — Brian confirmed every
// product is ready for same-day pickup when ordered before 5 PM ET Mon–Fri (product pages show 'Available for pickup now') at the Port Richey shop. This alone
// lights up the pickup badge only once the Business Profile for that same
// address is linked inside Merchant Center (Growth > Manage programs >
// "Local products" / "Pickup later" — a one-time Merchant Center setup
// step, not something this feed file can do on its own). STORE_CODE must
// match the store code Merchant Center assigns that linked location; until
// it's known this is left as the single-location default ("1"), which
// matches Merchant Center's own default code for a single linked location.
const PICKUP_METHOD = 'buy';
const PICKUP_SLA = 'same day';
const STORE_CODE = 'FLY8132';

function buildItem(product, size, unitPrice) {
  const id = `${product.slug}-${size.key}`;
  const title = `${product.panelHeading} — ${size.label}`;
  const description = product.catalogCard.desc +
    ` Volume discounts applied automatically at checkout.`;
  const link = `${SITE}/products/${product.slug}/`;
  const price = `${Number(unitPrice).toFixed(2)} ${CURRENCY}`;

  return [
    '    <item>',
    `      <g:id>${esc(id)}</g:id>`,
    `      <title>${esc(title)}</title>`,
    `      <description>${cdata(description)}</description>`,
    `      <link>${esc(link)}</link>`,
    `      <g:image_link>${esc(product.imageUrl)}</g:image_link>`,
    ...(product.extraImages || []).filter(Boolean).slice(0, 2).map(u => `      <g:additional_image_link>${esc(u)}</g:additional_image_link>`),
    `      <g:availability>in_stock</g:availability>`,
    `      <g:price>${price}</g:price>`,
    `      <g:brand>${esc(BRAND)}</g:brand>`,
    `      <g:condition>new</g:condition>`,
    `      <g:identifier_exists>no</g:identifier_exists>`,
    `      <g:google_product_category>${esc(GOOGLE_CATEGORY)}</g:google_product_category>`,
    `      <g:item_group_id>${esc(product.slug)}</g:item_group_id>`,
    `      <g:size>${esc(size.label)}</g:size>`,
    `      <g:pickup_method>${esc(PICKUP_METHOD)}</g:pickup_method>`,
    `      <g:pickup_sla>${esc(PICKUP_SLA)}</g:pickup_sla>`,
    `      <g:store_code>${esc(STORE_CODE)}</g:store_code>`,
    '    </item>',
  ].join('\n');
}

function main() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  const items = [];
  const localRows = [];
  const skipped = [];

  for (const product of data.products) {
    if (product.active === false) {
      skipped.push(`${product.slug}: product is hidden (active: false)`);
      continue;
    }
    if (!product.imageUrl) {
      skipped.push(`${product.slug}: no imageUrl set — add one in the dashboard`);
      continue;
    }
    const fixedSizes = (product.pricing.sizes || []).filter(s => !s.isCustom);
    if (fixedSizes.length === 0) {
      skipped.push(`${product.slug}: no fixed-price sizes to list (only "Custom Size" defined)`);
      continue;
    }
    for (const size of fixedSizes) {
      let unitPrice;
      try {
        unitPrice = calcDisplayPrice(product.pricing, { size: size.label, qty: 1 }).unit;
      } catch (e) {
        skipped.push(`${product.slug} / ${size.label}: could not price this size (${e.message}) — skipped`);
        continue;
      }
      items.push(buildItem(product, size, unitPrice));
      localRows.push([STORE_CODE, `${product.slug}-${size.key}`, 'in_stock', PICKUP_METHOD, PICKUP_SLA]);
    }
    const customCount = (product.pricing.sizes || []).length - fixedSizes.length;
    if (customCount > 0) {
      skipped.push(`${product.slug}: skipped ${customCount} "Custom Size" option(s) — not shoppable listings`);
    }
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '  <channel>',
    '    <title>Fly Visuals Products</title>',
    `    <link>${SITE}/products.html</link>`,
    '    <description>Fly Visuals product feed for Google Merchant Center</description>',
    items.join('\n'),
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, xml, 'utf-8');

  console.log(`Wrote ${items.length} listing(s) to dist/google-merchant-feed.xml`);

  // Local inventory: one row per listing at the Port Richey store.
  // Made to order, so no quantity column — availability = in_stock.
  const tsv = [['store_code', 'id', 'availability', 'pickup_method', 'pickup_sla']]
    .concat(localRows).map(r => r.join('\t')).join('\n') + '\n';
  fs.writeFileSync(LOCAL_OUT_PATH, tsv, 'utf-8');
  console.log(`Wrote ${localRows.length} row(s) to dist/google-local-inventory.tsv (store_code "${STORE_CODE}")`);
  if (skipped.length) {
    console.log('\nSkipped:');
    skipped.forEach(s => console.log('  - ' + s));
  }
  if (items.length === 0) {
    console.log('\nNo listings were included — the feed file exists but is empty. Add product photos in the dashboard to start including items.');
  }
}

main();
