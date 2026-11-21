// Netlify Function: POST /.netlify/functions/shop-checkout
//
// Online shop checkout. The browser sends the product slug and the customer's
// choices (size, options, package, quantity, pickup/ship). The price is
// recomputed HERE from data/shop-data.json (the same data and math the
// product page uses), so a customer can't change the price in their browser.
// Then a Stripe Checkout Session is created and its URL returned.
//
// Needs STRIPE_SECRET_KEY in Netlify environment variables. Without it this
// returns 503 {error:"not_configured"} and the page sends the order to the
// "shop-order" Netlify form instead, so no order is lost.

const D = require('./data/shop-data.json');

const json = (status, body) => ({ statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const psych = (n) => (n > 0 ? Math.round((n + 0.01) * 2) / 2 - 0.01 : 0);
const r2 = (n) => Math.round(n * 100) / 100;

function quote(slug, sel) {
  const p = D[slug];
  if (!p) throw new Error('unknown product');
  sel = sel || {};
  const pkgList = p.k.length ? p.k : [['complete', 'Complete']];
  const pkgIdx = Math.max(0, Math.min(parseInt(sel.pkg, 10) || 0, pkgList.length - 1));
  const pkg = pkgList[pkgIdx][0];
  const cs = p.cs; const custom = !!(sel.custom && cs);
  let graphic = 0, hardware = 0, sizeText;
  if (custom) {
    const w = +sel.cw || 0, h = +sel.ch || 0;
    if (!(w > 0 && h > 0)) throw new Error('enter a custom size');
    if (cs[1] && w > cs[1]) throw new Error('max width is ' + cs[1] + ' ' + cs[0]);
    if (cs[2] && h > cs[2]) throw new Error('max height is ' + cs[2] + ' ' + cs[0]);
    const sqft = (w * h) / (cs[0] === 'in' ? 144 : 1);
    let rate = cs[4].length ? cs[4][0][1] : 0;
    cs[4].forEach((b) => { if (sqft >= b[0]) rate = b[1]; });
    graphic = Math.max(cs[3], sqft * rate);
    sizeText = w + ' x ' + h + ' ' + cs[0] + ' (custom)';
  } else {
    const sz = p.s[Math.max(0, Math.min(parseInt(sel.size, 10) || 0, p.s.length - 1))];
    graphic = sz[1]; hardware = sz[2] || 0; sizeText = sz[0];
  }
  if (pkg === 'hardware_only') graphic = 0;
  if (pkg === 'graphic_only') hardware = 0;
  let optTotal = 0; const optText = [];
  const opts = sel.opts || {};
  p.o.forEach((g) => {
    const defIdx = Math.max(0, g[2].findIndex((c) => c[3]));
    const i = opts[g[1]] != null ? parseInt(opts[g[1]], 10) : defIdx;
    const c = g[2][i] || g[2][defIdx];
    if (c && pkg !== 'hardware_only') { if (c[1] === 1) optTotal += c[2]; else if (c[1] === 2) optTotal += (graphic * c[2]) / 100; }
    if (c) optText.push(g[0] + ': ' + c[0]);
  });
  if (p.k.length > 1) optText.unshift('Package: ' + p.k[pkgIdx][1]);
  const unit = psych((graphic + hardware + optTotal) * p.m);
  const qty = Math.max(1, Math.min(10000, parseInt(sel.qty, 10) || 1));
  let pct = 0; p.q.forEach((t) => { if (qty >= t[0]) pct = t[1]; });
  const each = r2(unit * (1 - pct / 100));
  return { name: p.n, sizeText, optText, qty, each, pct, total: r2(each * qty) };
}

exports.quote = quote;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });
  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'bad_json' }); }
  let q; try { q = quote(String(body.slug || ''), body); } catch (e) { return json(400, { error: e.message }); }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return json(503, { error: 'not_configured', quote: q });
  const site = (process.env.URL || ('https://' + (event.headers.host || 'flyvisualsfl.com'))).replace(/\/$/, '');
  const ship = !!body.ship;
  const orderId = 'FV-' + Date.now().toString(36).toUpperCase();
  const desc = [q.sizeText].concat(q.optText).join(' · ') + (q.pct ? ' · ' + q.pct + '% volume discount' : '');
  const f = new URLSearchParams();
  f.append('mode', 'payment');
  f.append('line_items[0][quantity]', String(q.qty));
  f.append('line_items[0][price_data][currency]', 'usd');
  f.append('line_items[0][price_data][unit_amount]', String(Math.round(q.each * 100)));
  f.append('line_items[0][price_data][product_data][name]', q.name);
  f.append('line_items[0][price_data][product_data][description]', (desc + ' | ' + (ship ? 'Ship to me (shipping billed separately)' : 'Free pickup, Port Richey FL') + ' | Order ' + orderId).slice(0, 500));
  f.append('client_reference_id', orderId);
  f.append('metadata[order_id]', orderId);
  f.append('metadata[product]', String(body.slug).slice(0, 100));
  f.append('metadata[size]', q.sizeText.slice(0, 450));
  f.append('metadata[options]', q.optText.join('; ').slice(0, 450) || 'none');
  f.append('metadata[qty]', String(q.qty));
  f.append('metadata[fulfillment]', ship ? 'ship' : 'pickup');
  f.append('payment_intent_data[metadata][order_id]', orderId);
  f.append('payment_intent_data[description]', (orderId + ': ' + q.name + ' x' + q.qty).slice(0, 500));
  f.append('phone_number_collection[enabled]', 'true');
  if (ship) f.append('shipping_address_collection[allowed_countries][0]', 'US');
  f.append('success_url', site + '/order-complete/?order=' + encodeURIComponent(orderId));
  const page = (D[body.slug].file || '').replace(/^Shop-/, '').replace(/\.dc\.html$/, '').toLowerCase();
  f.append('cancel_url', site + '/products/' + (page || encodeURIComponent(body.slug)) + '/');
  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/x-www-form-urlencoded' }, body: f.toString() });
    const out = await r.json();
    if (!r.ok || !out.url) return json(502, { error: 'stripe_error', detail: (out.error && out.error.message) || 'unknown' });
    return json(200, { url: out.url, orderId, quote: q });
  } catch (e) { return json(502, { error: 'stripe_unreachable' }); }
};
