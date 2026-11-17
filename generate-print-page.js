#!/usr/bin/env node
/**
 * generate-print-page.js
 *
 * Builds the "Custom Print" page at /custom-print/ (dist/custom-print/index.html):
 * the customer uploads an image, picks a material, types the size they need,
 * sees the price instantly, and pays through Stripe Checkout.
 *
 *  - Materials = every active product in products/products-data.json that has
 *    custom-size pricing (pricing.customSize). Prices come from the same
 *    pricing.js + price-display.js the product pages use, so a 4' x 2' vinyl
 *    banner costs the same here as on /products/vinyl-banners/.
 *  - Page chrome (head CSS, navbar, trust bar, footer, mobile-menu JS) is taken
 *    from products/_product-template.html so it always matches the product pages.
 *  - Artwork + order details are saved to the Netlify form "custom-print-order"
 *    (file upload, 8 MB max), then netlify/functions/create-checkout.js recomputes
 *    the price on the server and opens a Stripe Checkout Session.
 *
 * Run: node generate-print-page.js   (sync-and-publish.js runs it automatically)
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'products', 'products-data.json'), 'utf8'));
const TPL = fs.readFileSync(path.join(ROOT, 'products', '_product-template.html'), 'utf8');
const OUT_DIR = path.join(ROOT, 'dist', 'custom-print');

const CATEGORY_ORDER = ['Banners', 'Custom Signs', 'Stickers and Decals', 'Outdoor Displays', 'Trade Show Displays', 'Banner Stands'];

const materials = DATA.products
  .filter((p) => p.active !== false && p.pricing && p.pricing.customSize)
  .map((p) => ({
    slug: p.slug,
    label: p.productLabel || p.panelHeading,
    category: p.category || 'Other',
    desc: (p.catalogCard && p.catalogCard.desc) || '',
    image: p.imageUrl ? p.imageUrl.replace(/^https?:\/\/[^/]+/, '') : '',
    markup: p.pricing.markup != null ? p.pricing.markup : 1,
    sizes: [],
    customSize: p.pricing.customSize,
    options: p.pricing.options || null,
    quantityDiscounts: p.pricing.quantityDiscounts || [],
  }))
  .sort((a, b) => {
    const ca = CATEGORY_ORDER.indexOf(a.category), cb = CATEGORY_ORDER.indexOf(b.category);
    return (ca < 0 ? 99 : ca) - (cb < 0 ? 99 : cb) || (a.slug === 'vinyl-banners' ? -1 : b.slug === 'vinyl-banners' ? 1 : a.label.localeCompare(b.label));
  });

function between(s, startMarker, endMarker) {
  const a = s.indexOf(startMarker), b = s.indexOf(endMarker, a + 1);
  if (a < 0 || b < 0) throw new Error(`Template marker not found: ${startMarker} / ${endMarker}`);
  return s.slice(a, b);
}

const TITLE = 'Custom Print Upload | Upload Your Image, Get a Price | Fly Visuals';
const DESC = 'Upload your image, enter the size you need and get an instant price on custom banners, signs and decals. Pay securely online. Pickup in Port Richey, FL or we ship.';

let head = TPL.slice(0, TPL.indexOf('  <!-- ── NETLIFY FORM DECLARATIONS'))
  .replace('{{SEO_TITLE}}', TITLE)
  .replace('{{SEO_DESCRIPTION}}', DESC)
  .replace('<meta name="robots" content="index, follow">',
    '<meta name="robots" content="index, follow">\n  <link rel="canonical" href="https://flyvisualsfl.com/custom-print/">\n' +
    `  <meta property="og:title" content="Custom Print Upload | Fly Visuals">\n  <meta property="og:description" content="${DESC}">\n  <meta property="og:url" content="https://flyvisualsfl.com/custom-print/">`);
if (head.includes('{{')) throw new Error('Unreplaced placeholder in template head');

const EXTRA_CSS = `
    /* ── Custom Print page ── */
    .signs-layout > * { min-width: 0; }
    .cp-block select, .cp-block input, .cp-block textarea { max-width: 100%; min-width: 0; width: 100%; }
    .cp-dims > *, .cp-contact > * { min-width: 0; }
    .cp-intro { color: var(--muted); font-size: 15px; font-weight: 300; margin: -14px 0 26px; max-width: 620px; }
    .cp-step { display: flex; align-items: center; gap: 10px; margin: 6px 0 12px; }
    .cp-step b { width: 26px; height: 26px; border-radius: 50%; background: var(--red); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; }
    .cp-step span { font-family: var(--font-d); font-size: 22px; letter-spacing: .04em; }
    .cp-block { border: 1px solid var(--border); border-radius: var(--r); padding: 18px; margin-bottom: 26px; background: var(--bg); }
    .cp-drop { border: 2px dashed var(--border-hi); border-radius: var(--r); padding: 28px 16px; text-align: center; cursor: pointer; background: var(--bg2); transition: border-color .15s, background .15s; }
    .cp-drop:hover, .cp-drop.drag { border-color: var(--red); background: rgba(204,20,20,0.04); }
    .cp-drop strong { display: block; font-size: 15px; margin-bottom: 4px; }
    .cp-drop small { color: var(--muted); font-size: 12.5px; }
    .cp-file { display: none; grid-template-columns: 110px 1fr; gap: 14px; align-items: center; }
    .cp-file.show { display: grid; }
    .cp-thumb { width: 110px; height: 110px; border: 1px solid var(--border); border-radius: var(--r); background: #fff center/contain no-repeat; display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--muted); font-size: 13px; }
    .cp-fname { font-weight: 600; font-size: 14px; word-break: break-all; }
    .cp-fmeta { color: var(--muted); font-size: 12.5px; margin: 3px 0 8px; }
    .cp-link { background: none; border: 0; color: var(--red); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; padding: 0; }
    .cp-dims { display: grid; grid-template-columns: 1fr 1fr 110px; gap: 12px; align-items: end; }
    .cp-unit { display: flex; border: 1px solid var(--border-hi); border-radius: var(--r); overflow: hidden; height: 44px; }
    .cp-unit button { flex: 1; border: 0; background: var(--bg); font: inherit; font-weight: 600; font-size: 13px; cursor: pointer; color: var(--muted); }
    .cp-unit button.sel { background: var(--text); color: #fff; }
    .cp-lock { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--muted); margin-top: 12px; cursor: pointer; }
    .cp-lock input { width: 16px; height: 16px; accent-color: var(--red); }
    .cp-res { margin-top: 14px; padding: 10px 12px; border-radius: var(--r); font-size: 13px; display: none; }
    .cp-res.good { display: block; background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.35); color: #15803d; }
    .cp-res.fair { display: block; background: rgba(234,179,8,0.10); border: 1px solid rgba(234,179,8,0.45); color: #854d0e; }
    .cp-res.low  { display: block; background: rgba(204,20,20,0.08); border: 1px solid rgba(204,20,20,0.35); color: #a01111; }
    .cp-mat { display: grid; grid-template-columns: 64px 1fr; gap: 12px; align-items: center; margin-top: 12px; }
    .cp-mat img { width: 64px; height: 64px; object-fit: contain; background: #fff; border: 1px solid var(--border); border-radius: var(--r); }
    .cp-mat p { color: var(--muted); font-size: 13px; line-height: 1.45; }
    .cp-max { color: var(--dim); font-size: 12px; margin-top: 6px; }
    .cp-contact { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .cp-contact .full { grid-column: 1 / -1; }
    .cp-done { text-align: center; padding: 40px 20px; border: 1px solid var(--border); border-radius: var(--r); background: var(--bg2); margin-bottom: 30px; }
    .cp-done h2 { font-family: var(--font-d); font-size: 34px; letter-spacing: .03em; margin-bottom: 8px; }
    .cp-done p { color: var(--muted); max-width: 520px; margin: 0 auto 6px; }
    @media (max-width: 768px) {
      .cp-dims { grid-template-columns: 1fr 1fr; }
      .cp-dims .cp-unit-wrap { grid-column: 1 / -1; }
      .cp-contact { grid-template-columns: 1fr; }
    }
`;
head = head.replace(/\n  <\/style>/, EXTRA_CSS + '\n  </style>');

const FORM_DECL = `  <!-- ── NETLIFY FORM DECLARATION (custom print orders, with file upload) ── -->
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
const trustAndFooter = between(TPL, '  <!-- ── TRUST BAR', '  <!-- ── MOBILE PRICE BAR');
const navJs = TPL.slice(TPL.indexOf('    function toggleMobile()'), TPL.lastIndexOf('  </script>'));
if (!navJs.includes('toggleMobAccordion')) throw new Error('Nav JS not found in template');

const MAIN = `  <!-- ── MAIN CONTENT ───────────────────────────────────────────── -->
  <main id="store-main">
    <section class="tab-content active">

      <div id="cp-done" class="cp-done" style="display:none"></div>

      <div class="signs-layout" id="cp-form">
        <div class="signs-options">

          <div class="sec-head"><h1>Custom Print Upload</h1></div>
          <p class="cp-intro">Upload your image, choose what to print it on and type the size you need. Your price updates instantly. Pay securely online, then pick up in Port Richey or have it shipped.</p>

          <!-- 1. Upload -->
          <div class="cp-step"><b>1</b><span>Upload Your Image</span></div>
          <div class="cp-block">
            <label class="cp-drop" id="cp-drop" for="cp-input">
              <strong>Drag &amp; drop your image here, or tap to choose a file</strong>
              <small>JPG, PNG, WEBP, PDF, SVG, AI or EPS · max 8 MB</small>
            </label>
            <input type="file" id="cp-input" accept="image/*,.pdf,.ai,.eps,.svg,.tif,.tiff" style="display:none">
            <div class="cp-file" id="cp-file">
              <div class="cp-thumb" id="cp-thumb"></div>
              <div>
                <div class="cp-fname" id="cp-fname"></div>
                <div class="cp-fmeta" id="cp-fmeta"></div>
                <button type="button" class="cp-link" onclick="clearFile()">Change file</button>
              </div>
            </div>
          </div>

          <!-- 2. Material -->
          <div class="cp-step"><b>2</b><span>Choose What to Print On</span></div>
          <div class="cp-block">
            <div class="fg">
              <label for="cp-material">Material / Product</label>
              <select id="cp-material" onchange="onMaterial()"></select>
            </div>
            <div class="cp-mat" id="cp-mat"></div>
            <div id="option-groups" style="margin-top:18px"></div>
          </div>

          <!-- 3. Size -->
          <div class="cp-step"><b>3</b><span>Enter Your Size</span></div>
          <div class="cp-block">
            <div class="cp-dims">
              <div class="fg"><label for="cp-w">Width</label><input type="number" id="cp-w" min="0.1" step="0.1" inputmode="decimal" placeholder="e.g. 48" oninput="onDim('w')"></div>
              <div class="fg"><label for="cp-h">Height</label><input type="number" id="cp-h" min="0.1" step="0.1" inputmode="decimal" placeholder="e.g. 24" oninput="onDim('h')"></div>
              <div class="fg cp-unit-wrap"><label>Units</label>
                <div class="cp-unit"><button type="button" id="u-in" onclick="setUnit('in')">in</button><button type="button" id="u-ft" onclick="setUnit('ft')">ft</button></div>
              </div>
            </div>
            <label class="cp-lock"><input type="checkbox" id="cp-lock" checked onchange="onDim('w')"> Keep my image's proportions</label>
            <div class="cp-max" id="cp-max"></div>
            <div class="cp-res" id="cp-res"></div>
          </div>

          <!-- 4. Quantity -->
          <span class="field-label">Quantity</span>
          <div class="qty-wrap">
            <div class="qty-stepper">
              <button class="qty-btn" type="button" onclick="changeQty(-1)">−</button>
              <div class="qty-display" id="qty-display">1</div>
              <button class="qty-btn" type="button" onclick="changeQty(1)">+</button>
            </div>
          </div>
          <div id="vol-tiers" class="vol-tiers"></div>

          <span class="field-label">Pickup or Shipping</span>
          <div class="ful-choices" style="margin-bottom:24px"></div>

          <!-- 5. Contact -->
          <div class="cp-step"><b>4</b><span>Your Contact Info</span></div>
          <div class="cp-block">
            <p style="color:var(--muted);font-size:13px;margin-bottom:12px">We'll email you a proof before we print.</p>
            <div class="cp-contact">
              <div class="fg"><label for="cp-name">Full Name *</label><input type="text" id="cp-name" autocomplete="name"></div>
              <div class="fg"><label for="cp-phone">Phone *</label><input type="tel" id="cp-phone" autocomplete="tel"></div>
              <div class="fg full"><label for="cp-email">Email *</label><input type="email" id="cp-email" autocomplete="email"></div>
              <div class="fg full"><label for="cp-notes">Notes (optional)</label><textarea id="cp-notes" placeholder="Deadline, cropping, finishing details..."></textarea></div>
            </div>
          </div>

          <div id="cp-error" class="alert alert-err"></div>
          <div style="margin-top:20px">
            <button class="btn-primary" id="cp-submit" type="button" onclick="submitOrder()">Pay Securely with Stripe</button>
          </div>
        </div>

        <!-- Summary -->
        <div class="signs-panel">
          <div style="font-family:var(--font-d);font-size:22px;margin-bottom:20px;letter-spacing:0.04em">ORDER SUMMARY</div>
          <div class="sum-row"><span class="sr-lbl">Material</span><span class="sr-val" id="sp-mat">—</span></div>
          <div class="sum-row"><span class="sr-lbl">Size</span><span class="sr-val" id="sp-size">—</span></div>
          <div class="sum-row"><span class="sr-lbl">Area</span><span class="sr-val" id="sp-area">—</span></div>
          <div id="sp-opts"></div>
          <div class="sum-row"><span class="sr-lbl">Quantity</span><span class="sr-val" id="sp-qty">1</span></div>
          <div class="sum-row"><span class="sr-lbl">Price Each</span><span class="sr-val" id="sp-each">—</span></div>
          <div class="sum-row"><span class="sr-lbl">Quantity Discount</span><span class="sr-val" id="sp-disc">None</span></div>
          <div class="sum-row"><span class="sr-lbl">Image</span><span class="sr-val" id="sp-img">Not uploaded</span></div>
          <div class="sum-row"><span class="sr-lbl" id="sp-ful-lbl">Pickup</span><span class="sr-val" id="sp-ful">Free</span></div>
          <div class="sum-total"><span class="st-lbl">Total</span><span class="st-price" id="sp-total">—</span></div>
          <button class="btn-primary" type="button" onclick="submitOrder()" style="margin-top:24px;max-width:100%">Pay Securely</button>
          <p style="color:var(--dim);font-size:12px;margin-top:12px;text-align:center">Secure checkout by Stripe</p>
        </div>
      </div>

    </section>
  </main>

`;

const MPB = `  <div id="mpb">
    <div class="mpb-left">
      <span class="mpb-lbl">Your Total</span>
      <span class="mpb-price" id="mpb-price">—</span>
    </div>
    <button class="mpb-cta" type="button" onclick="submitOrder()">Pay Now</button>
  </div>

`;

const SCRIPT = `  <script src="/products/pricing.js"></script>
  <script src="/products/price-display.js"></script>
  <script>
    // Materials: written by generate-print-page.js from products/products-data.json.
    const MATERIALS = ${JSON.stringify(materials)};
    const MAX_BYTES = 8 * 1024 * 1024;
    const STORE = { name: 'Fly Visuals — Port Richey, FL store', address: '8132 Cormel St, Port Richey, FL 34668', phone: '(727) 494-6162', phoneHref: 'tel:7274946162' };

    const $ = id => document.getElementById(id);
    const fmt = n => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const r2 = n => Math.round(n * 100) / 100;
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    const S = { mat: null, options: {}, unit: 'in', qty: 1, fulfill: 'pickup', file: null, imgW: 0, imgH: 0 };

    // ── Materials ──
    function buildMaterialSelect() {
      const groups = {};
      MATERIALS.forEach(m => { (groups[m.category] = groups[m.category] || []).push(m); });
      $('cp-material').innerHTML = Object.keys(groups).map(cat =>
        '<optgroup label="' + esc(cat) + '">' + groups[cat].map(m => '<option value="' + m.slug + '">' + esc(m.label) + '</option>').join('') + '</optgroup>'
      ).join('');
      const want = new URLSearchParams(location.search).get('material');
      $('cp-material').value = MATERIALS.some(m => m.slug === want) ? want : 'vinyl-banners';
      if (!$('cp-material').value) $('cp-material').selectedIndex = 0;
    }

    function onMaterial() {
      S.mat = MATERIALS.find(m => m.slug === $('cp-material').value) || MATERIALS[0];
      S.options = {};
      (S.mat.options || []).forEach(g => { const d = g.choices.find(c => c.default) || g.choices[0]; if (d) S.options[g.code] = d.code; });
      $('cp-mat').innerHTML = (S.mat.image ? '<img src="' + S.mat.image + '" alt="">' : '<span></span>') +
        '<p>' + esc(S.mat.desc) + ' <a href="/products/' + S.mat.slug + '/" target="_blank" rel="noopener">See product</a></p>';
      const cs = S.mat.customSize;
      $('cp-max').textContent = 'Max size for ' + S.mat.label + ': ' + cs.maxWidth + ' x ' + cs.maxHeight + ' ' + cs.unit + (cs.unit === 'ft' ? ' (' + cs.maxWidth * 12 + ' x ' + cs.maxHeight * 12 + ' in)' : '') + '.';
      buildOptions();
      refresh();
    }

    function buildOptions() {
      const groups = S.mat.options || [];
      $('option-groups').innerHTML = groups.map(g => {
        const chips = g.choices.map(c => {
          let add = 'included';
          if (c.priceType === 'percent' && c.value) add = '+' + c.value + '%';
          else if (c.priceType === 'flat' && c.value) add = '+' + fmt(c.value * (S.mat.markup || 1));
          return '<div class="choice-chip ' + (S.options[g.code] === c.code ? 'sel' : '') + '" onclick="selectOption(\\'' + g.code + '\\',\\'' + c.code + '\\')"><span class="ch-lbl">' + esc(c.label) + '</span><span class="ch-price">' + add + '</span></div>';
        }).join('');
        return '<div class="opt-group"><span class="field-label">' + esc(g.name) + '</span><div class="choice-row">' + chips + '</div></div>';
      }).join('');
    }
    function selectOption(g, c) { S.options[g] = c; buildOptions(); refresh(); }

    // ── Size ──
    function setUnit(u) {
      const w = parseFloat($('cp-w').value), h = parseFloat($('cp-h').value);
      if (u !== S.unit) {
        const f = u === 'ft' ? 1 / 12 : 12;
        if (w > 0) $('cp-w').value = r2(w * f);
        if (h > 0) $('cp-h').value = r2(h * f);
      }
      S.unit = u;
      $('u-in').classList.toggle('sel', u === 'in');
      $('u-ft').classList.toggle('sel', u === 'ft');
      refresh();
    }
    function onDim(which) {
      if ($('cp-lock').checked && S.imgW && S.imgH) {
        const ratio = S.imgH / S.imgW;
        const w = parseFloat($('cp-w').value), h = parseFloat($('cp-h').value);
        if (which === 'w' && w > 0) $('cp-h').value = r2(w * ratio);
        if (which === 'h' && h > 0) $('cp-w').value = r2(h / ratio);
      }
      refresh();
    }
    // Size in inches as typed
    function sizeIn() {
      const w = parseFloat($('cp-w').value), h = parseFloat($('cp-h').value);
      if (!(w > 0 && h > 0)) return null;
      const f = S.unit === 'ft' ? 12 : 1;
      return { w: w * f, h: h * f };
    }
    // Size in the material's own pricing unit
    function sizeInMatUnit() {
      const s = sizeIn(); if (!s) return null;
      const f = S.mat.customSize.unit === 'ft' ? 1 / 12 : 1;
      return { width: r2(s.w * f), height: r2(s.h * f) };
    }
    function niceSize(s) {
      const ft = v => r2(v / 12);
      return r2(s.w) + '" x ' + r2(s.h) + '"' + (s.w >= 24 || s.h >= 24 ? ' (' + ft(s.w) + "' x " + ft(s.h) + "')" : '');
    }

    // ── Quantity ──
    function changeQty(d) { S.qty = Math.max(1, Math.min(1000, S.qty + d)); refresh(); }

    // ── Pickup / shipping ──
    function setFulfill(v) { S.fulfill = v; renderFulfillment(); refresh(); }
    function renderFulfillment() {
      const html =
        '<button type="button" class="ful-opt' + (S.fulfill === 'pickup' ? ' sel' : '') + '" onclick="setFulfill(\\'pickup\\')">' +
          '<div class="ful-head"><span class="ful-radio"></span>In-Store Pickup<span class="ful-price">FREE</span></div>' +
          '<div class="ful-detail"><strong>' + STORE.name + '</strong><br>' + STORE.address + '<br><a href="' + STORE.phoneHref + '" onclick="event.stopPropagation()">' + STORE.phone + '</a><br>We\\'ll text or email you when it\\'s ready.</div>' +
        '</button>' +
        '<button type="button" class="ful-opt' + (S.fulfill === 'ship' ? ' sel' : '') + '" onclick="setFulfill(\\'ship\\')">' +
          '<div class="ful-head"><span class="ful-radio"></span>Ship to Me<span class="ful-price">QUOTED</span></div>' +
          '<div class="ful-detail">Lower 48 only. You\\'ll enter your address at checkout, and we\\'ll email your shipping cost to approve before it ships. <a href="/shipping-policy/" onclick="event.stopPropagation()">Shipping policy</a></div>' +
        '</button>';
      document.querySelectorAll('.ful-choices').forEach(el => { el.innerHTML = html; });
    }

    // ── Upload ──
    function setupDrop() {
      const drop = $('cp-drop'), input = $('cp-input');
      input.addEventListener('change', () => { if (input.files[0]) takeFile(input.files[0]); });
      ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
      ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
      drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) takeFile(f); });
    }
    function takeFile(f) {
      showErr('');
      if (f.size > MAX_BYTES) { showErr('That file is ' + (f.size / 1048576).toFixed(1) + ' MB. The limit is 8 MB. Save a smaller JPG or PNG, or email the file to flyvisualsfl@gmail.com after you order.'); return; }
      S.file = f; S.imgW = 0; S.imgH = 0;
      $('cp-fname').textContent = f.name;
      $('cp-fmeta').textContent = (f.size / 1048576).toFixed(2) + ' MB';
      $('cp-thumb').style.backgroundImage = ''; $('cp-thumb').textContent = (f.name.split('.').pop() || '').toUpperCase();
      $('cp-drop').style.display = 'none'; $('cp-file').classList.add('show');
      if (/^image\\/(jpeg|png|webp|gif|svg\\+xml|bmp)$/.test(f.type)) {
        const url = URL.createObjectURL(f), img = new Image();
        img.onload = () => {
          S.imgW = img.naturalWidth; S.imgH = img.naturalHeight;
          $('cp-thumb').style.backgroundImage = 'url(' + url + ')'; $('cp-thumb').textContent = '';
          $('cp-fmeta').textContent = (f.size / 1048576).toFixed(2) + ' MB · ' + S.imgW + ' x ' + S.imgH + ' px';
          if (!sizeIn()) { // suggest a starting size: long side 24", same shape as the image
            const long = Math.max(S.imgW, S.imgH), k = 24 / long;
            setUnit('in'); $('cp-w').value = r2(S.imgW * k); $('cp-h').value = r2(S.imgH * k);
          } else onDim('w');
          refresh();
        };
        img.src = url;
      }
      refresh();
    }
    function clearFile() {
      S.file = null; S.imgW = S.imgH = 0; $('cp-input').value = '';
      $('cp-file').classList.remove('show'); $('cp-drop').style.display = '';
      refresh();
    }
    // Effective print resolution = image pixels / print inches
    function resolution() {
      const s = sizeIn();
      if (!s || !S.imgW) return null;
      return Math.round(Math.min(S.imgW / s.w, S.imgH / s.h));
    }

    // ── Price ──
    function priceNow() {
      const sz = sizeInMatUnit(); if (!sz) return { err: null, p: null };
      const cs = S.mat.customSize;
      if (sz.width > cs.maxWidth || sz.height > cs.maxHeight) return { err: 'Too big for ' + S.mat.label + '. Max is ' + cs.maxWidth + ' x ' + cs.maxHeight + ' ' + cs.unit + '. Try a smaller size or a different material.', p: null };
      try { return { err: null, p: calcDisplayPrice(S.mat, { custom: sz, options: S.options, qty: S.qty }) }; }
      catch (e) { return { err: e.message, p: null }; }
    }

    function refresh() {
      if (!S.mat) return;
      const s = sizeIn(), pr = priceNow(), p = pr.p;
      $('qty-display').textContent = S.qty;
      $('sp-mat').textContent = S.mat.label;
      $('sp-size').textContent = s ? niceSize(s) : '—';
      $('sp-area').textContent = s ? r2(s.w * s.h / 144) + ' sq ft' : '—';
      $('sp-opts').innerHTML = (S.mat.options || []).map(g => {
        const c = g.choices.find(x => x.code === S.options[g.code]);
        return c ? '<div class="sum-row"><span class="sr-lbl">' + esc(g.name) + '</span><span class="sr-val">' + esc(c.label) + '</span></div>' : '';
      }).join('');
      $('sp-qty').textContent = S.qty;
      $('sp-each').textContent = p ? fmt(p.each) : '—';
      $('sp-disc').textContent = p && p.qtyDiscountPct ? p.qtyDiscountPct + '% off' : 'None';
      $('sp-img').textContent = S.file ? 'Uploaded' : 'Not uploaded';
      $('sp-ful-lbl').textContent = S.fulfill === 'ship' ? 'Shipping' : 'Pickup';
      $('sp-ful').textContent = S.fulfill === 'ship' ? 'Quoted by email' : 'Free';
      $('sp-total').textContent = p ? fmt(p.subtotal) : '—';
      $('mpb-price').textContent = p ? fmt(p.subtotal) : '—';
      if (pr.err) showErr(pr.err); else if ($('cp-error').dataset.kind === 'size') showErr('');
      if (pr.err) $('cp-error').dataset.kind = 'size';

      // Volume tiers
      const tiers = S.mat.quantityDiscounts || [];
      const act = tiers.slice().reverse().find(t => S.qty >= t.minQty);
      $('vol-tiers').innerHTML = tiers.map(t => '<div class="vol-badge' + (act === t ? ' active' : '') + '">' + t.minQty + '+ (' + t.percentOff + '% off)</div>').join('');

      // Resolution check
      const dpi = resolution(), el = $('cp-res');
      el.className = 'cp-res';
      if (dpi) {
        if (dpi >= 100) { el.classList.add('good'); el.textContent = 'Image quality looks great at this size (' + dpi + ' pixels per inch).'; }
        else if (dpi >= 50) { el.classList.add('fair'); el.textContent = 'Image quality is OK at this size (' + dpi + ' pixels per inch). Fine for banners seen from a few feet away; may look soft up close.'; }
        else { el.classList.add('low'); el.textContent = 'Low resolution at this size (' + dpi + ' pixels per inch). It will likely print blurry. Upload a larger image or pick a smaller size, and we\\'ll check it before printing.'; }
      }
    }

    // ── Submit ──
    function showErr(msg) { const el = $('cp-error'); el.textContent = msg; el.style.display = msg ? 'block' : 'none'; el.dataset.kind = ''; }
    function orderId() {
      const d = new Date(), pad = n => String(n).padStart(2, '0');
      return 'FV-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    }

    async function submitOrder() {
      const name = $('cp-name').value.trim(), email = $('cp-email').value.trim(), phone = $('cp-phone').value.trim();
      const pr = priceNow(), s = sizeIn(), sz = sizeInMatUnit();
      if (!S.file) { showErr('Please upload your image first.'); $('cp-drop').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      if (!s) { showErr('Please enter the width and height you need.'); $('cp-w').focus(); return; }
      if (pr.err || !pr.p) { showErr(pr.err || 'Could not price that size. Call (727) 494-6162.'); return; }
      if (!name || !phone || !/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email)) { showErr('Please fill in your name, phone and a valid email.'); $('cp-name').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      showErr('');

      const id = orderId();
      const optText = (S.mat.options || []).map(g => { const c = g.choices.find(x => x.code === S.options[g.code]); return c ? g.name + ': ' + c.label : ''; }).filter(Boolean).join('; ');
      const btns = document.querySelectorAll('#cp-submit, .signs-panel .btn-primary, .mpb-cta');
      const setBtns = (t, dis) => btns.forEach(b => { b.disabled = dis; b.textContent = t; });
      setBtns('Uploading your image...', true);

      try {
        const fd = new FormData();
        fd.append('form-name', 'custom-print-order');
        fd.append('order-id', id);
        fd.append('name', name); fd.append('email', email); fd.append('phone', phone);
        fd.append('material', S.mat.label);
        fd.append('size', niceSize(s) + ' [priced as ' + sz.width + ' x ' + sz.height + ' ' + S.mat.customSize.unit + ']');
        fd.append('options', optText);
        fd.append('quantity', String(S.qty));
        fd.append('image-resolution', resolution() ? resolution() + ' ppi at print size (' + S.imgW + 'x' + S.imgH + ' px)' : 'n/a (not a previewable image)');
        fd.append('total', fmt(pr.p.subtotal) + (S.fulfill === 'ship' ? ' + shipping (quoted)' : ''));
        fd.append('fulfillment', S.fulfill === 'ship' ? 'Ship to customer (quote shipping by email)' : 'In-store pickup, Port Richey');
        fd.append('notes', $('cp-notes').value.trim());
        fd.append('artwork', S.file, S.file.name);
        const up = await fetch('/', { method: 'POST', body: fd });
        if (!up.ok) throw new Error('upload');
      } catch (e) {
        setBtns('Pay Securely with Stripe', false);
        showErr('We couldn\\'t upload your image. Check your connection and try again, or call (727) 494-6162.');
        return;
      }

      setBtns('Opening secure checkout...', true);
      try {
        const r = await fetch('/.netlify/functions/create-checkout', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: id, slug: S.mat.slug, width: sz.width, height: sz.height, qty: S.qty, options: S.options, fulfillment: S.fulfill, email: email }),
        });
        const out = await r.json().catch(() => ({}));
        if (out.url) { window.location.href = out.url; return; }
        showDone(id, false);
      } catch (e) {
        showDone(id, false);
      }
    }

    function showDone(id, paid) {
      const box = $('cp-done');
      box.innerHTML = paid
        ? '<h2>Payment Received. Thank You!</h2><p>Your order number is <strong>' + esc(id) + '</strong>.</p><p>We\\'ll email you a proof within 1 business day. Questions? Call <a href="tel:7274946162">(727) 494-6162</a>.</p>'
        : '<h2>We Got Your Order</h2><p>Your order number is <strong>' + esc(id) + '</strong> and your image was uploaded.</p><p>Online payment isn\\'t available right this minute, so we\\'ll call or email you within 1 business day to confirm and take payment. Questions? Call <a href="tel:7274946162">(727) 494-6162</a>.</p>';
      box.style.display = 'block';
      $('cp-form').style.display = 'none';
      if ($('mpb')) $('mpb').style.display = 'none';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function init() {
      buildMaterialSelect();
      setupDrop();
      setUnit('in');
      renderFulfillment();
      onMaterial();
      const q = new URLSearchParams(location.search);
      if (q.get('paid') === '1') showDone(q.get('order') || '', true);
      else if (q.get('canceled') === '1') showErr('Checkout was canceled, so you have not been charged. Your image is saved with order ' + (q.get('order') || '') + '. Fill in the form again to pay, or call (727) 494-6162.');
    }
    document.addEventListener('DOMContentLoaded', init);

${navJs}  </script>
</body>
</html>
`;

const html = head + FORM_DECL + nav + MAIN + trustAndFooter + MPB + SCRIPT;
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html, 'utf8');
console.log(`Wrote dist/custom-print/index.html (${materials.length} materials)`);
