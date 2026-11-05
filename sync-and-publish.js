#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
//  sync-and-publish.js
//
//  Takes a raw export of the Product Manager dashboard's "products"
//  collection (an array of flat docs, as Claude pulls via the Artifact
//  tool's read_db action) and:
//    1. Converts it into products/products-data.json (the shape
//       generate-products.js expects)
//    2. Runs generate-products.js to rebuild products.html and every
//       products/<slug>/index.html
//    3. Runs generate-merchant-feed.js to rebuild dist/google-merchant-feed.xml
//       (the Google Shopping feed — only includes sizes for products that
//       have a real imageUrl set)
//    4. Copies the changed files into dist/, including brand-new
//       product folders that don't exist there yet
//
//  Usage:  node sync-and-publish.js <path-to-dashboard-export.json>
//
//  The export file should be a JSON array of the flat docs exactly as
//  stored by the dashboard (fields: slug, active, sortOrder, category,
//  name, seoTitle, seoDescription, heroEyebrow, heroH1, heroSub,
//  catalogDesc, catalogCta, priceFrom, imageUrl, markup, minQty, qtyStep,
//  quantityDiscounts, sizes, hasCustomSize, customSize, optionGroups,
//  packageCodes, stripeLink, netlifyForm). This is the richer,
//  BestOfSigns-style schema added October 2026 — size rows carry a
//  graphic/hardware price split, plus optional custom-size sq-ft
//  brackets, option groups and Complete/Graphic-Only packages. The
//  dashboard's own `name`/`label` text is turned into stable `code`
//  values here (never typed by hand in the dashboard) so pricing.js's
//  calcPrice can look choices up the same way every time it's synced.
// ══════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
// Extra product photos live in products/product-images.json (not the dashboard) so dashboard edits can't drop them.
const EXTRA_IMAGES = (() => { try { return JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'products', 'product-images.json'), 'utf-8')).extras || {}; } catch (e) { return {}; } })();
const { execSync } = require('child_process');

const ROOT = __dirname;

const PACKAGE_LABELS = {
  complete: 'Complete (Graphic + Hardware)',
  graphic_only: 'Replacement Graphic Only',
  hardware_only: 'Hardware Only',
};

function slugCode(s) {
  return String(s || '').toLowerCase().trim().replace(/['"]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
function sizeKey(label) {
  return String(label || '').toLowerCase().trim().replace(/['"]/g, '').replace(/\s+/g, '').replace(/[^a-z0-9.x]/g, '');
}

function flatToNested(doc) {
  const sizes = (doc.sizes || []).map(s => ({
    key: sizeKey(s.label),
    label: s.label,
    price: (s.graphicPrice || 0) + (s.hardwarePrice || 0),
    salePrice: null,
    graphicPrice: s.graphicPrice != null ? s.graphicPrice : 0,
    hardwarePrice: s.hardwarePrice || 0,
    isCustom: false,
  }));

  const customSize = doc.hasCustomSize && doc.customSize ? {
    unit: doc.customSize.unit,
    maxWidth: doc.customSize.maxWidth,
    maxHeight: doc.customSize.maxHeight,
    minimumPrice: doc.customSize.minimumPrice,
    brackets: (doc.customSize.brackets || []).map(b => ({ fromSqft: b.fromSqft, toSqft: b.toSqft, ratePerSqft: b.ratePerSqft })),
  } : undefined;

  const options = (doc.optionGroups || []).length ? doc.optionGroups.map(grp => ({
    code: slugCode(grp.name),
    name: grp.name,
    choices: grp.choices.map(c => ({
      code: slugCode(c.label),
      label: c.label,
      priceType: c.priceType,
      value: c.value || 0,
      default: !!c.default,
    })),
  })) : undefined;

  const packages = (doc.packageCodes || []).length
    ? doc.packageCodes.map(code => ({ code, label: PACKAGE_LABELS[code] || code }))
    : undefined;

  return {
    slug: doc.slug,
    active: doc.active !== false,
    sortOrder: doc.sortOrder || 0,
    category: doc.category || null,
    seo: { title: doc.seoTitle || '', description: doc.seoDescription || '' },
    hero: { eyebrow: doc.heroEyebrow || '', h1: doc.heroH1 || '', sub: doc.heroSub || '' },
    panelHeading: doc.name,
    productLabel: doc.name,
    catalogCard: {
      desc: doc.catalogDesc || '',
      priceFrom: doc.priceFrom || 0,
      cta: doc.catalogCta || `Shop ${doc.name} →`,
    },
    pricing: {
      markup: doc.markup != null ? doc.markup : 1,
      designFee: 0,
      minQty: doc.minQty || 1,
      qtyStep: doc.qtyStep || 1,
      quantityDiscounts: doc.quantityDiscounts || [],
      sizes,
      customSize,
      options,
      packages,
    },
    stripeLink: doc.stripeLink || '#',
    netlifyForm: doc.netlifyForm || 'signs-order',
    imageUrl: doc.imageUrl || '',
    extraImages: (EXTRA_IMAGES[doc.slug] || (Array.isArray(doc.extraImages) ? doc.extraImages : [])).filter(Boolean).slice(0, 2),
  };
}

function main() {
  const exportPath = process.argv[2];
  if (!exportPath) {
    console.error('Usage: node sync-and-publish.js <dashboard-export.json>');
    process.exit(1);
  }
  const docs = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
  if (!Array.isArray(docs)) {
    throw new Error('Expected the export file to contain a JSON array of product docs.');
  }

  const missingSlug = docs.find(d => !d.slug);
  if (missingSlug) throw new Error('A product doc is missing its slug: ' + JSON.stringify(missingSlug));

  const nested = docs.map(flatToNested);
  const dataPath = path.join(ROOT, 'products', 'products-data.json');

  // Preserve any product currently in products-data.json but absent from
  // this export (defensive — shouldn't normally happen since the export
  // should be a full collection dump).
  const existing = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const existingSlugs = new Set(existing.products.map(p => p.slug));
  const newSlugs = new Set(nested.map(p => p.slug));
  const missing = existing.products.filter(p => !newSlugs.has(p.slug));
  if (missing.length) {
    console.warn('Warning: these products exist in products-data.json but were not in the export (kept as-is):',
      missing.map(p => p.slug).join(', '));
  }

  const finalProducts = [...nested, ...missing];
  fs.writeFileSync(dataPath, JSON.stringify({ products: finalProducts }, null, 2), 'utf-8');
  console.log(`Wrote products-data.json with ${finalProducts.length} product(s).`);

  console.log('\nRunning generate-products.js...');
  execSync('node generate-products.js', { cwd: ROOT, stdio: 'inherit' });

  console.log('\nRunning generate-merchant-feed.js...');
  execSync('node generate-merchant-feed.js', { cwd: ROOT, stdio: 'inherit' });

  console.log('\nRunning generate-policy-pages.js...');
  execSync('node generate-policy-pages.js', { cwd: ROOT, stdio: 'inherit' });

  console.log('\nSyncing into dist/...');
  const distProductsDir = path.join(ROOT, 'dist', 'products');
  fs.mkdirSync(distProductsDir, { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'products.html'), path.join(ROOT, 'dist', 'products.html'));
  console.log('  copied products.html -> dist/products.html');

  // Use finalProducts (not just nested) so a product preserved above
  // because it was missing from a partial export still gets copied to dist/.
  const active = finalProducts.filter(p => p.active !== false);
  for (const p of active) {
    const srcDir = path.join(ROOT, 'products', p.slug);
    const outDir = path.join(distProductsDir, p.slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.copyFileSync(path.join(srcDir, 'index.html'), path.join(outDir, 'index.html'));
    console.log(`  copied products/${p.slug}/index.html -> dist/products/${p.slug}/index.html`);
  }

  console.log('\nDone. Remember to deploy dist/ to Netlify (drag the whole folder).');
}

main();
