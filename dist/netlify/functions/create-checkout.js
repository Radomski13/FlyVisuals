// Netlify Function: POST /.netlify/functions/create-checkout
//
// Used by the Custom Print page (/logan/). Recomputes the price on the
// server from products/products-data.json with the same pricing code the
// product pages use (so a customer can't edit the price in their browser),
// then creates a Stripe Checkout Session for that exact amount and returns
// its URL.
//
// Needs one Netlify environment variable: STRIPE_SECRET_KEY (sk_live_... or
// sk_test_...). Until it's set this returns 503 {error:"not_configured"} and
// the page tells the customer we'll contact them to take payment (their
// order + artwork are already saved in Netlify Forms by then).
//
// No npm dependencies: talks to the Stripe REST API with fetch.

const DATA = require('./data/products-data.json');
const { calcDisplayPrice } = require('./data/price-display.js');
const { printedVinylPrice, PV } = require('./data/printed-vinyl-pricing.js');

const json = (status, body) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

function productFor(slug) {
  const p = (DATA.products || []).find((x) => x.slug === slug && x.active !== false);
  if (!p) return null;
  const pr = p.pricing || {};
  if (!pr.customSize) return null;
  return {
    slug: p.slug,
    label: p.productLabel || p.panelHeading,
    markup: pr.markup != null ? pr.markup : 1,
    sizes: pr.sizes || [],
    customSize: pr.customSize,
    options: pr.options || null,
    packages: pr.packages || null,
    quantityDiscounts: pr.quantityDiscounts || [],
  };
}

// Stripe Checkout Session for a single line item (used by Printed Vinyl).
async function createSession(key, o) {
  const f = new URLSearchParams();
  f.append('mode', 'payment');
  f.append('line_items[0][quantity]', String(o.qty));
  f.append('line_items[0][price_data][currency]', 'usd');
  f.append('line_items[0][price_data][unit_amount]', String(o.unitCents));
  f.append('line_items[0][price_data][product_data][name]', o.name);
  f.append('line_items[0][price_data][product_data][description]', [o.description, o.ship ? 'Ship to me' : 'In-store pickup, Port Richey FL', `Order ${o.orderId}`].join(' | ').slice(0, 500));
  (o.extras || []).forEach((x, i) => {
    const n = i + 1;
    f.append(`line_items[${n}][quantity]`, '1');
    f.append(`line_items[${n}][price_data][currency]`, 'usd');
    f.append(`line_items[${n}][price_data][unit_amount]`, String(x.cents));
    f.append(`line_items[${n}][price_data][product_data][name]`, x.name);
  });
  f.append('client_reference_id', o.orderId);
  f.append('metadata[order_id]', o.orderId);
  f.append('metadata[material]', o.material);
  f.append('metadata[extras]', (o.extras || []).map((x) => x.name).join(', ') || 'none');
  f.append('metadata[size]', o.sizeText);
  f.append('metadata[qty]', String(o.qty));
  f.append('metadata[fulfillment]', o.ship ? 'ship' : 'pickup');
  f.append('payment_intent_data[metadata][order_id]', o.orderId);
  f.append('payment_intent_data[description]', `${o.orderId}: ${o.name} x${o.qty}`);
  f.append('phone_number_collection[enabled]', 'true');
  if (o.ship) f.append('shipping_address_collection[allowed_countries][0]', 'US');
  const email = String(o.email || '').trim();
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) f.append('customer_email', email);
  f.append('success_url', `${o.site}/logan/?paid=1&order=${encodeURIComponent(o.orderId)}`);
  f.append('cancel_url', `${o.site}/logan/?canceled=1&order=${encodeURIComponent(o.orderId)}`);
  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: f.toString(),
    });
    const out = await r.json();
    if (!r.ok || !out.url) return json(502, { error: 'stripe_error', message: (out.error && out.error.message) || 'Stripe error' });
    return json(200, { url: out.url, total: o.total, orderId: o.orderId });
  } catch (e) {
    return json(502, { error: 'stripe_unreachable' });
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });

  let req;
  try { req = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'bad_json' }); }

  const key = process.env.STRIPE_SECRET_KEY;
  const site = process.env.URL || 'https://flyvisualsfl.com';
  const orderId = String(req.orderId || '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 40) || ('FV-' + Date.now());
  const ship = req.fulfillment === 'ship';

  // ── Printed Vinyl (/logan/): $6/sq ft at the full 52" roll width x length ──
  if (req.product === 'printed-vinyl') {
    const pv = printedVinylPrice(req.width, req.height, req.qty, { vectorize: !!req.vectorize, design: !!req.design });
    if (pv.err) return json(400, { error: 'bad_size', message: pv.err });
    if (!key) return json(503, { error: 'not_configured', total: pv.subtotal });
    const w = Number(req.width), l = Number(req.height);
    const sizeText = `${w}" W x ${l}" L`;
    return createSession(key, {
      orderId, ship, site, email: req.email, qty: pv.qty, unitCents: Math.round(pv.each * 100),
      name: `Printed Vinyl (${sizeText})`,
      description: `Billed ${PV.ROLL_WIDTH_IN}" roll width x ${l}" = ${pv.billedSqft} sq ft @ $${PV.RATE_PER_SQFT}/sq ft`,
      material: 'Printed Vinyl', sizeText, total: pv.subtotal,
      extras: [
        pv.vectorizeFee ? { name: 'Vectorizing (redraw artwork)', cents: Math.round(pv.vectorizeFee * 100) } : null,
        pv.designFee ? { name: 'Design fee (no artwork provided)', cents: Math.round(pv.designFee * 100) } : null,
      ].filter(Boolean),
    });
  }

  const product = productFor(String(req.slug || ''));
  if (!product) return json(400, { error: 'unknown_material' });

  const cs = product.customSize;
  const width = Number(req.width), height = Number(req.height);
  const qty = Math.max(1, Math.min(1000, parseInt(req.qty, 10) || 1));
  if (!(width > 0 && height > 0)) return json(400, { error: 'bad_size' });
  if ((cs.maxWidth && width > cs.maxWidth) || (cs.maxHeight && height > cs.maxHeight)) {
    return json(400, { error: 'too_big', message: `Max size is ${cs.maxWidth} x ${cs.maxHeight} ${cs.unit}` });
  }

  // Only accept option codes/choices that actually exist for this product.
  const options = {};
  for (const grp of product.options || []) {
    const want = req.options && req.options[grp.code];
    if (want && grp.choices.some((c) => c.code === want)) options[grp.code] = want;
  }

  let price;
  try {
    price = calcDisplayPrice(product, { custom: { width, height }, options, qty });
  } catch (e) {
    return json(400, { error: 'price_error', message: e.message });
  }

  if (!key) return json(503, { error: 'not_configured', total: price.subtotal });

  const optLabels = (product.options || []).map((grp) => {
    const ch = grp.choices.find((c) => c.code === options[grp.code]) || grp.choices.find((c) => c.default) || grp.choices[0];
    return ch ? `${grp.name}: ${ch.label}` : null;
  }).filter(Boolean);
  const sizeText = `${width} x ${height} ${cs.unit}`;

  const f = new URLSearchParams();
  f.append('mode', 'payment');
  f.append('line_items[0][quantity]', String(qty));
  f.append('line_items[0][price_data][currency]', 'usd');
  f.append('line_items[0][price_data][unit_amount]', String(Math.round(price.each * 100)));
  f.append('line_items[0][price_data][product_data][name]', `Custom Print: ${product.label} (${sizeText})`);
  f.append('line_items[0][price_data][product_data][description]',
    [optLabels.join(' · '), ship ? 'Ship to me' : 'In-store pickup, Port Richey FL', `Order ${orderId}`].filter(Boolean).join(' | ').slice(0, 500));
  f.append('client_reference_id', orderId);
  f.append('metadata[order_id]', orderId);
  f.append('metadata[material]', product.label);
  f.append('metadata[size]', sizeText);
  f.append('metadata[qty]', String(qty));
  f.append('metadata[fulfillment]', ship ? 'ship' : 'pickup');
  f.append('payment_intent_data[metadata][order_id]', orderId);
  f.append('payment_intent_data[description]', `Custom Print ${orderId}: ${product.label} ${sizeText} x${qty}`);
  f.append('phone_number_collection[enabled]', 'true');
  if (ship) f.append('shipping_address_collection[allowed_countries][0]', 'US');
  const email = String(req.email || '').trim();
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) f.append('customer_email', email);
  f.append('success_url', `${site}/logan/?paid=1&order=${encodeURIComponent(orderId)}`);
  f.append('cancel_url', `${site}/logan/?canceled=1&order=${encodeURIComponent(orderId)}`);

  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: f.toString(),
    });
    const out = await r.json();
    if (!r.ok || !out.url) return json(502, { error: 'stripe_error', message: (out.error && out.error.message) || 'Stripe error' });
    return json(200, { url: out.url, total: price.subtotal, orderId });
  } catch (e) {
    return json(502, { error: 'stripe_unreachable' });
  }
};
