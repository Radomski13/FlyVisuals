#!/usr/bin/env node
/**
 * generate-print-page.js
 *
 * Builds the private "Printed Vinyl" order page at /logan/ (dist/logan/index.html,
 * noindex, not linked anywhere, not in the sitemap).
 *
 * Deliberately simple: upload an image -> type width x height in inches ->
 * quantity -> pickup or ship -> name/phone/email -> pay with Stripe.
 *
 *  - Pricing = the "wall-decals" product in products/products-data.json
 *    (printed white adhesive vinyl, per-sq-ft brackets) with its default options,
 *    via the same pricing.js + price-display.js the product pages use.
 *    Change PRICE_SOURCE below to price from a different product.
 *  - Page chrome (head CSS, navbar, footer, mobile-menu JS) is copied from
 *    products/_product-template.html so it matches the product pages.
 *  - The image + order details go to the Netlify form "custom-print-order"
 *    (8 MB max), then netlify/functions/create-checkout.js re-prices it on the
 *    server (product "printed-vinyl") and opens Stripe Checkout.
 *
 * Run: node generate-print-page.js   (sync-and-publish.js runs it automatically)
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PRICE_SOURCE = 'wall-decals'; // keep in sync with ALIASES in netlify/functions/create-checkout.js
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'products', 'products-data.json'), 'utf8'));
const TPL = fs.readFileSync(path.join(ROOT, 'products', '_product-template.html'), 'utf8');
const OUT_DIR = path.join(ROOT, 'dist', 'logan');

const src = DATA.products.find((p) => p.slug === PRICE_SOURCE);
if (!src || !src.pricing.customSize) throw new Error(`Price source "${PRICE_SOURCE}" missing or has no customSize`);
const PRODUCT = {
  key: 'printed-vinyl',
  label: 'Printed Vinyl',
  markup: src.pricing.markup != null ? src.pricing.markup : 1,
  sizes: [],
  customSize: src.pricing.customSize, // unit: in
  options: src.pricing.options || null, // defaults are used; customer doesn't pick
  quantityDiscounts: src.pricing.quantityDiscounts || [],
};

function between(s, a, b) {
  const i = s.indexOf(a), j = s.indexOf(b, i + 1);
  if (i < 0 || j < 0) throw new Error(`Template marker not found: ${a} / ${b}`);
  return s.slice(i, j);
}

let head = TPL.slice(0, TPL.indexOf('  <!-- ── NETLIFY FORM DECLARATIONS'))
  .replace('{{SEO_TITLE}}', 'Printed Vinyl Order | Fly Visuals')
  .replace('{{SEO_DESCRIPTION}}', 'Upload your image, enter your size and pay online for printed vinyl from Fly Visuals in Port Richey, FL.')
  .replace('<meta name="robots" content="index, follow">', '<meta name="robots" content="noindex, nofollow">');
if (head.includes('{{')) throw new Error('Unreplaced placeholder in template head');

head = head.replace(/\n  <\/style>/, `
    /* ── Printed Vinyl order page (/logan/) ── */
    .pv-wrap { max-width: 560px; margin: 0 auto; }
    .pv-wrap h1 { font-size: 40px; margin-bottom: 6px; }
    .pv-sub { color: var(--muted); font-size: 15px; font-weight: 300; margin-bottom: 26px; }
    .pv-card { border: 1px solid var(--border); border-radius: var(--r); padding: 20px; margin-bottom: 18px; background: var(--bg); }
    .pv-card > .field-label { margin-bottom: 10px; }
    .pv-drop { display: block; border: 2px dashed var(--border-hi); border-radius: var(--r); padding: 30px 16px; text-align: center; cursor: pointer; background: var(--bg2); }
    .pv-drop:hover, .pv-drop.drag { border-color: var(--red); background: rgba(204,20,20,0.04); }
    .pv-drop strong { display: block; font-size: 15px; margin-bottom: 4px; }
    .pv-drop small { color: var(--muted); font-size: 12.5px; }
    .pv-file { display: none; gap: 14px; align-items: center; }
    .pv-file.show { display: flex; }
    .pv-thumb { flex: 0 0 84px; height: 84px; border: 1px solid var(--border); border-radius: var(--r); background: #fff center/contain no-repeat; display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--muted); font-size: 12px; }
    .pv-file div { min-width: 0; }
    .pv-fname { font-weight: 600; font-size: 14px; word-break: break-all; }
    .pv-link { background: none; border: 0; color: var(--red); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; padding: 0; margin-top: 4px; }
    .pv-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .pv-row > * { min-width: 0; }
    .pv-row input { width: 100%; }
    .pv-hint { color: var(--dim); font-size: 12.5px; margin-top: 8px; }
    .pv-warn { display: none; margin-top: 10px; padding: 9px 12px; border-radius: var(--r); font-size: 13px; background: rgba(234,179,8,0.10); border: 1px solid rgba(234,179,8,0.45); color: #854d0e; }
    .pv-pills { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .pv-pill { border: 1.5px solid var(--border-hi); border-radius: var(--r); background: var(--bg); padding: 12px; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; text-align: left; }
    .pv-pill small { display: block; font-weight: 400; color: var(--muted); font-size: 12px; margin-top: 2px; }
    .pv-pill.sel { border-color: var(--red); background: rgba(204,20,20,0.04); }
    .pv-total { display: flex; justify-content: space-between; align-items: baseline; padding: 4px 2px 16px; }
    .pv-total span { color: var(--muted); font-size: 14px; }
    .pv-total strong { font-family: var(--font-d); font-size: 44px; letter-spacing: .02em; }
    .pv-each { color: var(--muted); font-size: 13px; text-align: right; margin-top: -12px; margin-bottom: 14px; min-height: 18px; }
    .pv-wrap .btn-primary { width: 100%; max-width: 100%; }
    .pv-done { text-align: center; padding: 40px 20px; border: 1px solid var(--border); border-radius: var(--r); background: var(--bg2); }
    .pv-done h2 { font-family: var(--font-d); font-size: 34px; letter-spacing: .03em; margin-bottom: 8px; }
    .pv-done p { color: var(--muted); margin: 0 auto 6px; }
  </style>`);

const FORM_DECL = `  <!-- ── NETLIFY FORM DECLARATION (printed vinyl orders, with file upload) ── -->
  <form name="custom-print-order" netlify netlify-honeypot="bot-field" enctype="multipart/form-data" hidden>
    <input type="text" name="order-id">
    <input type="text" name="name">
    <input type="email" name="email">
    <input type="tel" name="phone">
    <input type="text" name="material">
    <input type="text" name="size">
    <input type="text" name="options">
    <input type="text" name="quantity">
    <input type="text" name="image-resolution">
    <input type="text" name="total">
    <input type="text" name="fulfillment">
    <input type="text" name="notes">
    <input type="file" name="artwork">
    <input type="text" name="bot-field">
  </form>

`;

const nav = between(TPL, '  <!-- ── HEADER', '  <!-- ── MAIN CONTENT');
const footer = between(TPL, '  <!-- ── FOOTER', '  <!-- ── MOBILE PRICE BAR');
const navJs = TPL.slice(TPL.indexOf('    function toggleMobile()'), TPL.lastIndexOf('  </script>'));
if (!navJs.includes('toggleMobAccordion')) throw new Error('Nav JS not found in template');

const MAIN = `  <main id="store-main">
    <div class="pv-wrap">

      <div id="pv-done" class="pv-done" style="display:none"></div>

      <div id="pv-form">
        <h1>Printed Vinyl</h1>
        <p class="pv-sub">Upload your image, enter your size, pay. We'll email a proof before we print.</p>

        <div class="pv-card">
          <span class="field-label">1. Your Image</span>
          <label class="pv-drop" id="pv-drop" for="pv-input">
            <strong>Tap to upload or drag your image here</strong>
            <small>JPG, PNG, PDF or SVG · up to 8 MB</small>
          </label>
          <input type="file" id="pv-input" accept="image/*,.pdf,.ai,.eps,.svg" style="display:none">
          <div class="pv-file" id="pv-file">
            <div class="pv-thumb" id="pv-thumb"></div>
            <div><div class="pv-fname" id="pv-fname"></div><button type="button" class="pv-link" onclick="clearFile()">Change image</button></div>
          </div>
        </div>

        <div class="pv-card">
          <span class="field-label">2. Size (inches)</span>
          <div class="pv-row">
            <div class="fg"><label for="pv-w">Width</label><input type="number" id="pv-w" min="1" step="0.25" inputmode="decimal" placeholder="24" oninput="refresh()"></div>
            <div class="fg"><label for="pv-h">Height</label><input type="number" id="pv-h" min="1" step="0.25" inputmode="decimal" placeholder="12" oninput="refresh()"></div>
          </div>
          <div class="pv-hint" id="pv-hint"></div>
          <div class="pv-warn" id="pv-warn"></div>
        </div>

        <div class="pv-card">
          <span class="field-label">3. Quantity</span>
          <div class="qty-stepper">
            <button class="qty-btn" type="button" onclick="changeQty(-1)">−</button>
            <div class="qty-display" id="qty-display">1</div>
            <button class="qty-btn" type="button" onclick="changeQty(1)">+</button>
          </div>
        </div>

        <div class="pv-card">
          <span class="field-label">4. Pickup or Ship</span>
          <div class="pv-pills">
            <button type="button" class="pv-pill sel" id="f-pickup" onclick="setFulfill('pickup')">Pickup<small>Free · Port Richey, FL</small></button>
            <button type="button" class="pv-pill" id="f-ship" onclick="setFulfill('ship')">Ship to Me<small>Cost emailed to you</small></button>
          </div>
        </div>

        <div class="pv-card">
          <span class="field-label">5. Your Info</span>
          <div class="fg" style="margin-bottom:12px"><label for="pv-name">Name</label><input type="text" id="pv-name" autocomplete="name"></div>
          <div class="pv-row">
            <div class="fg"><label for="pv-phone">Phone</label><input type="tel" id="pv-phone" autocomplete="tel"></div>
            <div class="fg"><label for="pv-email">Email</label><input type="email" id="pv-email" autocomplete="email"></div>
          </div>
        </div>

        <div class="pv-total"><span>Total</span><strong id="pv-total">—</strong></div>
        <div class="pv-each" id="pv-each"></div>

        <div id="pv-error" class="alert alert-err" style="margin:0 0 14px"></div>
        <button class="btn-primary" id="pv-submit" type="button" onclick="submitOrder()">Pay with Card</button>
        <p style="color:var(--dim);font-size:12px;margin-top:10px;text-align:center">Secure checkout by Stripe</p>
      </div>

    </div>
  </main>

`;

const SCRIPT = `  <script src="/products/pricing.js"></script>
  <script src="/products/price-display.js"></script>
  <script>
    // Pricing: written by generate-print-page.js (printed vinyl, priced like "${PRICE_SOURCE}").
    const PRODUCT = ${JSON.stringify(PRODUCT)};
    const MAX_BYTES = 8 * 1024 * 1024;
    const $ = id => document.getElementById(id);
    const fmt = n => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const r2 = n => Math.round(n * 100) / 100;
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const S = { qty: 1, fulfill: 'pickup', file: null, imgW: 0, imgH: 0 };
    const MAX = PRODUCT.customSize.maxWidth;

    function size() {
      const w = parseFloat($('pv-w').value), h = parseFloat($('pv-h').value);
      return w > 0 && h > 0 ? { width: r2(w), height: r2(h) } : null;
    }
    function price() {
      const s = size(); if (!s) return null;
      if (s.width > PRODUCT.customSize.maxWidth || s.height > PRODUCT.customSize.maxHeight) return { err: 'Max size is ' + MAX + ' x ' + PRODUCT.customSize.maxHeight + ' inches.' };
      try { return calcDisplayPrice(PRODUCT, { custom: s, qty: S.qty }); } catch (e) { return { err: e.message }; }
    }

    function refresh() {
      const s = size(), p = price();
      $('qty-display').textContent = S.qty;
      $('pv-hint').textContent = s ? r2(s.width * s.height / 144) + ' sq ft' + (s.width >= 24 || s.height >= 24 ? ' · ' + r2(s.width / 12) + "' x " + r2(s.height / 12) + "'" : '') : 'Max ' + MAX + ' inches each way.';
      $('pv-total').textContent = p && !p.err ? fmt(p.subtotal) : '—';
      $('pv-each').textContent = p && !p.err && S.qty > 1 ? fmt(p.each) + ' each' + (p.qtyDiscountPct ? ' · ' + p.qtyDiscountPct + '% bulk discount' : '') : '';
      showErr(p && p.err ? p.err : ($('pv-error').dataset.keep ? $('pv-error').textContent : ''));
      // Only warn when the image will clearly print blurry.
      const dpi = s && S.imgW ? Math.round(Math.min(S.imgW / s.width, S.imgH / s.height)) : 0;
      $('pv-warn').style.display = dpi && dpi < 50 ? 'block' : 'none';
      if (dpi && dpi < 50) $('pv-warn').textContent = 'Your image is small for this size and may print blurry. We\\'ll check it and contact you before printing.';
    }

    function changeQty(d) { S.qty = Math.max(1, Math.min(1000, S.qty + d)); refresh(); }
    function setFulfill(v) { S.fulfill = v; $('f-pickup').classList.toggle('sel', v === 'pickup'); $('f-ship').classList.toggle('sel', v === 'ship'); }

    function takeFile(f) {
      if (f.size > MAX_BYTES) { showErr('That file is ' + (f.size / 1048576).toFixed(1) + ' MB. Max is 8 MB.', true); return; }
      showErr('');
      S.file = f; S.imgW = S.imgH = 0;
      $('pv-fname').textContent = f.name;
      $('pv-thumb').style.backgroundImage = ''; $('pv-thumb').textContent = (f.name.split('.').pop() || '').toUpperCase();
      $('pv-drop').style.display = 'none'; $('pv-file').classList.add('show');
      if (/^image\\/(jpeg|png|webp|gif|svg\\+xml|bmp)$/.test(f.type)) {
        const url = URL.createObjectURL(f), img = new Image();
        img.onload = () => {
          S.imgW = img.naturalWidth; S.imgH = img.naturalHeight;
          $('pv-thumb').style.backgroundImage = 'url(' + url + ')'; $('pv-thumb').textContent = '';
          if (!size()) { // start them at 24" on the long side, same shape as the image
            const k = 24 / Math.max(S.imgW, S.imgH);
            $('pv-w').value = r2(S.imgW * k); $('pv-h').value = r2(S.imgH * k);
          }
          refresh();
        };
        img.src = url;
      }
      refresh();
    }
    function clearFile() { S.file = null; S.imgW = S.imgH = 0; $('pv-input').value = ''; $('pv-file').classList.remove('show'); $('pv-drop').style.display = ''; refresh(); }

    function showErr(msg, keep) { const el = $('pv-error'); el.textContent = msg; el.style.display = msg ? 'block' : 'none'; el.dataset.keep = keep ? '1' : ''; }
    function orderId() {
      const d = new Date(), pad = n => String(n).padStart(2, '0');
      return 'FV-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    }

    async function submitOrder() {
      const name = $('pv-name').value.trim(), phone = $('pv-phone').value.trim(), email = $('pv-email').value.trim();
      const s = size(), p = price();
      if (!S.file) return showErr('Please upload your image.', true);
      if (!s) return showErr('Please enter your width and height.', true);
      if (!p || p.err) return showErr((p && p.err) || 'Please check your size.', true);
      if (!name || !phone || !/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email)) return showErr('Please enter your name, phone and email.', true);
      showErr('');
      const id = orderId(), btn = $('pv-submit');
      btn.disabled = true; btn.textContent = 'Uploading...';
      try {
        const fd = new FormData();
        fd.append('form-name', 'custom-print-order');
        fd.append('order-id', id);
        fd.append('name', name); fd.append('email', email); fd.append('phone', phone);
        fd.append('material', 'Printed Vinyl');
        fd.append('size', s.width + '" x ' + s.height + '"');
        fd.append('options', '');
        fd.append('quantity', String(S.qty));
        fd.append('image-resolution', S.imgW ? Math.round(Math.min(S.imgW / s.width, S.imgH / s.height)) + ' ppi (' + S.imgW + 'x' + S.imgH + ' px)' : 'n/a');
        fd.append('total', fmt(p.subtotal) + (S.fulfill === 'ship' ? ' + shipping (quoted)' : ''));
        fd.append('fulfillment', S.fulfill === 'ship' ? 'Ship (quote shipping by email)' : 'Pickup, Port Richey');
        fd.append('notes', '');
        fd.append('artwork', S.file, S.file.name);
        const up = await fetch('/', { method: 'POST', body: fd });
        if (!up.ok) throw new Error('upload');
      } catch (e) {
        btn.disabled = false; btn.textContent = 'Pay with Card';
        return showErr('Upload failed. Please try again or call (727) 494-6162.', true);
      }
      btn.textContent = 'Opening checkout...';
      try {
        const r = await fetch('/.netlify/functions/create-checkout', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: id, product: 'printed-vinyl', width: s.width, height: s.height, qty: S.qty, fulfillment: S.fulfill, email: email }),
        });
        const out = await r.json().catch(() => ({}));
        if (out.url) { location.href = out.url; return; }
      } catch (e) {}
      showDone(id, false);
    }

    function showDone(id, paid) {
      $('pv-done').innerHTML = paid
        ? '<h2>Thank You!</h2><p>Payment received for order <strong>' + esc(id) + '</strong>.</p><p>We\\'ll email your proof within 1 business day.</p>'
        : '<h2>Order Received</h2><p>Order <strong>' + esc(id) + '</strong> and your image are saved.</p><p>We\\'ll call or email you within 1 business day to take payment.</p>';
      $('pv-done').style.display = 'block'; $('pv-form').style.display = 'none';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    document.addEventListener('DOMContentLoaded', () => {
      const input = $('pv-input'), drop = $('pv-drop');
      input.addEventListener('change', () => { if (input.files[0]) takeFile(input.files[0]); });
      ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
      ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
      drop.addEventListener('drop', e => { if (e.dataTransfer.files[0]) takeFile(e.dataTransfer.files[0]); });
      refresh();
      const q = new URLSearchParams(location.search);
      if (q.get('paid') === '1') showDone(q.get('order') || '', true);
      else if (q.get('canceled') === '1') showErr('Checkout canceled. You were not charged.', true);
    });

${navJs}  </script>
</body>
</html>
`;

const html = head + FORM_DECL + nav + MAIN + footer + SCRIPT;
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html, 'utf8');
console.log('Wrote dist/logan/index.html (Printed Vinyl, priced like ' + PRICE_SOURCE + ')');
