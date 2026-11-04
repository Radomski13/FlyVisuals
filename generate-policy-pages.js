// generate-policy-pages.js
//
// Builds the store policy pages Google Merchant Center requires:
//   /return-policy/   /shipping-policy/   /privacy-policy/   /terms/
//
// Each page reuses products.html's <head> styles + full navbar so it matches
// the store. Output goes to <slug>/index.html at the repo root AND to
// dist/<slug>/index.html. Edit the POLICIES text below, then run:
//   node generate-policy-pages.js
// (sync-and-publish.js runs this automatically.)

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE = 'https://flyvisualsfl.com';
const UPDATED = 'October 13, 2026';
const EMAIL = 'flyvisualsfl@gmail.com';
const PHONE = '(727) 494-6162';
const PHONE_HREF = 'tel:7274946162';
const ADDRESS = '8132 Cormel St, Port Richey, FL 34668';

const contactBlock = `
<h2>Questions?</h2>
<p>Call or text <a href="${PHONE_HREF}">${PHONE}</a>, email <a href="mailto:${EMAIL}">${EMAIL}</a>, or stop by the shop at ${ADDRESS}.</p>`;

const POLICIES = [
  {
    slug: 'return-policy',
    title: 'Return & Refund Policy',
    seoTitle: 'Return & Refund Policy | Fly Visuals',
    seoDesc: 'Return and refund policy for Fly Visuals products: custom signs, banners, decals, and displays ordered online. If we made a mistake or it arrived damaged, we reprint it free or refund you.',
    sub: 'Everything we print is made to order. If we got it wrong, we make it right.',
    body: `
<div class="policy-summary">
  <strong>The short version:</strong> Custom items can't be returned for change of mind. If your order is defective, damaged in shipping, or not what you approved, tell us within <strong>7 days</strong> and we'll reprint it free or give you a full refund.
</div>

<p>This policy covers products ordered from the <a href="/products.html">Fly Visuals online store</a>.</p>

<h2>Custom products are final sale</h2>
<p>Signs, banners, decals, displays, and other printed products are made just for you, with your design, size, and text. We can't resell them, so we don't accept returns or exchanges because you changed your mind, ordered the wrong size, or no longer need the item.</p>

<h2>When we'll reprint or refund</h2>
<p>We'll reprint your order at no cost, or refund you in full, if:</p>
<ul>
  <li>The item has a printing or material defect (peeling, smearing, wrong material, bad cuts).</li>
  <li>The item arrived damaged in shipping.</li>
  <li>We made an error: wrong size, wrong quantity, or the print doesn't match the proof you approved.</li>
  <li>You received someone else's order.</li>
</ul>
<p>You choose a reprint or a refund.</p>

<h2>How to report a problem</h2>
<ol>
  <li>Contact us within <strong>7 days</strong> of delivery or pickup.</li>
  <li>Send your order name or number and clear photos of the problem. For shipping damage, include photos of the box too.</li>
  <li>We'll reply within 1 business day.</li>
</ol>
<p>If we need the item back, we'll send you a prepaid return label. You never pay return shipping for our mistakes.</p>

<h2>Refunds</h2>
<p>Approved refunds go back to your original payment method within <strong>5–10 business days</strong>. How fast it shows up depends on your bank or card company.</p>

<h2>Cancellations</h2>
<ul>
  <li><strong>Before production starts</strong> (before you approve your proof): cancel for a full refund.</li>
  <li><strong>After production starts:</strong> the order can't be canceled, because the materials are already cut and printed for you.</li>
  <li>If you paid a design fee and we've already started your artwork, the design fee isn't refundable.</li>
</ul>

<h2>Things we can't cover</h2>
<ul>
  <li>Spelling, grammar, phone numbers, or layout errors in a proof you approved. Please check your proof carefully.</li>
  <li>Low-quality images or files you supplied after we warned you they may print blurry.</li>
  <li>Small color differences between your screen and the printed product. Every monitor shows color differently.</li>
  <li>Damage from improper installation, misuse, or normal wear and weather after delivery.</li>
</ul>

${contactBlock}`,
  },
  {
    slug: 'shipping-policy',
    title: 'Shipping & Pickup Policy',
    seoTitle: 'Shipping & Pickup Policy | Fly Visuals',
    seoDesc: 'How Fly Visuals ships online orders of custom signs, banners, and displays across the US, plus free local pickup at our Port Richey, FL shop. Production times, shipping times, and tracking.',
    sub: 'Free pickup at our Port Richey shop, or we ship it anywhere in the US.',
    body: `
<div class="policy-summary">
  <strong>The short version:</strong> Pick up free at our Port Richey shop. Order before 5 PM ET on a weekday and pick up the same day. Shipped orders are made in <strong>2–3 business days</strong> after you approve your proof, then ship anywhere in the contiguous US in about <strong>1–5 business days</strong>.
</div>

<p>This policy covers products ordered from the <a href="/products.html">Fly Visuals online store</a>.</p>

<h2>Production time</h2>
<p>Production starts once you approve your proof and payment clears. Most orders are made in <strong>2–3 business days</strong>. Large or high-quantity orders can take longer, and we'll tell you up front if yours will. Need it faster? Ask about rush service.</p>
<p>Business days are Monday–Friday, not counting holidays. Orders approved after 12 PM Eastern start the next business day.</p>

<h2>Free local pickup</h2>
<p>Choose In-Store Pickup at checkout and get your order free from our shop. Order Monday–Friday before 5 PM Eastern and pick up the same day. After 5 PM or on weekends, pickup starts at 9 AM the next business day. The product page shows when your order will be ready.</p>
<p><strong>${ADDRESS}</strong><br>Monday–Friday, 9 AM–5 PM</p>
<p>We'll call, text, or email when it's ready. We hold orders for 30 days.</p>

<h2>Shipping in the US</h2>
<ul>
  <li>We ship to addresses in the contiguous United States (the lower 48 states). For Alaska, Hawaii, or US territories, contact us for a quote.</li>
  <li>Orders ship by UPS, FedEx, or USPS, depending on size and destination.</li>
  <li>Transit time is usually <strong>1–5 business days</strong> after the order ships.</li>
  <li>Shipping cost depends on the size, weight, and destination of your order. After you order, we email you the exact shipping cost to approve before your order ships.</li>
  <li>You'll get a tracking number by email when your order ships.</li>
</ul>
<p><strong>Total delivery time</strong> is production time plus transit time, usually <strong>3–8 business days</strong>.</p>

<h2>Delivery problems</h2>
<ul>
  <li><strong>Damaged in shipping:</strong> photograph the box and the item, and contact us within 7 days. We'll reprint or refund. See our <a href="/return-policy/">Return &amp; Refund Policy</a>.</li>
  <li><strong>Lost or late:</strong> if tracking hasn't updated in 5 business days, contact us and we'll open a claim with the carrier.</li>
  <li><strong>Wrong address:</strong> please double-check your address at checkout. If a package is returned because of an address error, we'll reship it, but re-shipping costs are on the buyer.</li>
</ul>

<h2>International orders</h2>
<p>We don't ship outside the United States right now.</p>
${contactBlock}`,
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    seoTitle: 'Privacy Policy | Fly Visuals',
    seoDesc: 'How Fly Visuals collects, uses, and protects your information when you order products from our online store.',
    sub: 'What we collect, why we collect it, and what we do with it.',
    body: `
<div class="policy-summary">
  <strong>The short version:</strong> We only collect what we need to make and deliver your order. We never sell your information.
</div>

<h2>Who we are</h2>
<p>Fly Visuals, ${ADDRESS}. This policy covers products ordered from our <a href="/products.html">online store</a>.</p>

<h2>What we collect</h2>
<ul>
  <li><strong>Contact details:</strong> name, email, phone number, and business name.</li>
  <li><strong>Order details:</strong> products, sizes, quantities, text, and the artwork, logos, or photos you upload.</li>
  <li><strong>Shipping details:</strong> your delivery address, if you choose shipping.</li>
  <li><strong>Basic technical data:</strong> like your browser type and IP address, which our website host and services collect automatically.</li>
</ul>

<h2>Payments</h2>
<p>Payments are processed by <a href="https://stripe.com/privacy" rel="noopener" target="_blank">Stripe</a>. Your card number goes directly to Stripe. We never see or store it.</p>

<h2>How we use it</h2>
<ul>
  <li>To make, ship, and deliver your order.</li>
  <li>To send proofs, order updates, and answers to your questions.</li>
  <li>To send occasional offers, only if you agree. You can opt out any time.</li>
  <li>To prevent fraud and keep our records as required by law.</li>
</ul>

<h2>Text messages</h2>
<p>If you give us your phone number, we may text you about your order. Message and data rates may apply. Reply STOP to opt out at any time.</p>

<h2>Who we share it with</h2>
<p>We don't sell or rent your information. We only share it with the services that help us run the business:</p>
<ul>
  <li>Our payment processor (Stripe).</li>
  <li>Our website host and form provider (Netlify).</li>
  <li>Our customer management and messaging tools.</li>
  <li>Shipping carriers, to deliver your order.</li>
  <li>Authorities, if required by law.</li>
</ul>

<h2>Your artwork</h2>
<p>Files you upload are used only to make your order. We don't use your logos or designs for anything else without your permission. We may photograph finished work for our portfolio. If you'd rather we didn't, just tell us.</p>

<h2>Cookies</h2>
<p>Our site uses only basic cookies and similar technology needed for the site, forms, and checkout to work. Our fonts load from Google Fonts, which may log your IP address.</p>

<h2>How long we keep it</h2>
<p>We keep order records as long as needed for business, tax, and warranty purposes, then delete them.</p>

<h2>Your choices</h2>
<p>You can ask us to see, correct, or delete your personal information at any time. Email <a href="mailto:${EMAIL}">${EMAIL}</a> and we'll respond within 30 days.</p>

<h2>Children</h2>
<p>Our site is not meant for children under 13, and we don't knowingly collect their information.</p>

<h2>Changes</h2>
<p>If we change this policy, we'll update the date at the top of this page.</p>
${contactBlock}`,
  },
  {
    slug: 'terms',
    title: 'Terms of Service',
    seoTitle: 'Terms of Service | Fly Visuals',
    seoDesc: 'Terms for ordering custom signs, banners, decals, and displays from the Fly Visuals online store.',
    sub: 'The rules for ordering products from Fly Visuals, in plain language.',
    body: `
<p>These terms apply to products ordered from the <a href="/products.html">Fly Visuals online store</a> (Fly Visuals, ${ADDRESS}). By placing an order, you agree to them.</p>

<h2>Orders and pricing</h2>
<ul>
  <li>Prices are in US dollars and shown on each product page before you pay. Sales tax is added where required.</li>
  <li>Volume discounts apply automatically at the quantities listed on the product page.</li>
  <li>If a price is listed wrong by mistake, we'll contact you before making your order. You can pay the correct price or cancel for a full refund.</li>
  <li>We can refuse or cancel any order. If we do, you get a full refund.</li>
</ul>

<h2>Proofs</h2>
<p>For most custom orders, we send a digital proof before printing. Please check it carefully: spelling, phone numbers, sizes, and layout. Once you approve the proof, we print exactly what's on it. Errors in an approved proof are not covered by our <a href="/return-policy/">Return &amp; Refund Policy</a>.</p>

<h2>Your artwork</h2>
<ul>
  <li>You must own or have permission to use any logos, images, and text you send us.</li>
  <li>You're responsible for any claims that your artwork infringes someone else's rights.</li>
  <li>We can refuse to print anything that's illegal, hateful, or infringes a trademark or copyright.</li>
  <li>Artwork we create for you is yours to use once the order is paid in full.</li>
</ul>

<h2>Colors and materials</h2>
<p>Printed colors may look slightly different from your screen. Sizes may vary slightly due to cutting tolerances. These small differences aren't defects.</p>

<h2>Shipping, pickup, returns</h2>
<p>See our <a href="/shipping-policy/">Shipping &amp; Pickup Policy</a> and <a href="/return-policy/">Return &amp; Refund Policy</a>.</p>

<h2>Limit of liability</h2>
<p>Our total responsibility for any order is limited to the amount you paid for it. We're not responsible for indirect losses, like lost business or missed event dates, caused by delays or defects. We're also not responsible for delays caused by carriers or events outside our control.</p>

<h2>Governing law</h2>
<p>These terms are governed by the laws of the State of Florida. Any dispute will be handled in the courts of Pasco County, Florida.</p>

<h2>Changes</h2>
<p>We may update these terms. The version posted on this page when you place your order applies to that order.</p>
${contactBlock}`,
  },
];

// Shared footer policy-links line (also used in products.html, the product
// template, and bookonline.html footers).
const POLICY_LINKS = POLICIES.map(p => `<a href="/${p.slug}/">${p.title.replace('&', '&amp;')}</a>`).join(' · ');

const POLICY_CSS = `
    /* ── POLICY PAGES ─────────────────────────────────────────── */
    #policy-main { max-width: 760px; margin: 0 auto; padding: 44px 20px 80px; }
    .policy-updated { font-size: 13px; color: var(--dim); margin-bottom: 28px; }
    .policy-summary {
      background: var(--bg2); border-left: 4px solid var(--red);
      padding: 18px 20px; border-radius: var(--r); margin-bottom: 32px;
      font-size: 16px; line-height: 1.6;
    }
    #policy-main h2 { font-size: 28px; margin: 36px 0 10px; }
    #policy-main p, #policy-main li { font-size: 16px; line-height: 1.7; color: var(--text); }
    #policy-main p { margin-bottom: 14px; }
    #policy-main ul, #policy-main ol { padding-left: 22px; margin-bottom: 14px; }
    #policy-main li { margin-bottom: 6px; }
    #policy-main a { color: var(--red); }
    .policy-nav { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 8px; }
    #policy-main .policy-nav a {
      font-size: 13px; padding: 7px 14px; border: 1px solid var(--border-hi);
      border-radius: 999px; color: var(--text); text-decoration: none;
    }
    #policy-main .policy-nav a.current { background: var(--red); border-color: var(--red); color: #fff; }
`;

function build() {
  const src = fs.readFileSync(path.join(ROOT, 'products.html'), 'utf-8');
  const heroIdx = src.indexOf('<!-- ── HERO');
  const scriptIdx = src.indexOf('<script>', src.indexOf('<footer id="store-footer">'));
  const endIdx = src.indexOf('</script>', scriptIdx);
  if (heroIdx < 0 || scriptIdx < 0) throw new Error('Could not find HERO / footer script markers in products.html');

  let shell = src.slice(0, heroIdx)
    .replace('<a class="nav-link active" href="/products.html">', '<a class="nav-link" href="/products.html">')
    .replace('</style>', POLICY_CSS + '  </style>');
  // Navbar script, minus the catalog-only showCategory() function
  let script = src.slice(scriptIdx, endIdx + '</script>'.length)
    .replace(/function showCategory[\s\S]*?\n    }\n/, '');

  for (const p of POLICIES) {
    const url = `${SITE}/${p.slug}/`;
    let head = shell
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${p.seoTitle.replace('&', '&amp;')}</title>`)
      .replace(/<meta name="description" content="[^"]*">/,
        `<meta name="description" content="${p.seoDesc}">\n  <link rel="canonical" href="${url}">`);

    const nav = POLICIES.map(q =>
      `<a href="/${q.slug}/"${q.slug === p.slug ? ' class="current"' : ''}>${q.title.replace('&', '&amp;')}</a>`).join('\n      ');

    const html = `${head}<!-- ── HERO ───────────────────────────────────────────────────── -->
  <section id="store-hero">
    <h1>${p.title.toUpperCase().replace('&', '&amp;')}</h1>
    <p class="hero-sub">${p.sub}</p>
  </section>

  <main id="policy-main">
    <nav class="policy-nav" aria-label="Store policies">
      ${nav}
    </nav>
    <p class="policy-updated">Last updated: ${UPDATED}</p>
${p.body}
  </main>

  <!-- ── FOOTER ──────────────────────────────────────────────────── -->
  <footer id="store-footer">
    <div class="footer-logo">FLY <span>VISUALS</span></div>
    <div class="footer-info">
      ${ADDRESS}<br>
      <a href="${PHONE_HREF}">${PHONE}</a> · <a href="mailto:${EMAIL}">${EMAIL}</a> · Mon–Fri 9AM–5PM<br>
      ${POLICY_LINKS}<br>
      <a href="/products.html">← All Products</a> · <a href="/">Back to main site</a>
    </div>
  </footer>

  ${script}
</body>
</html>
`;
    for (const base of [ROOT, path.join(ROOT, 'dist')]) {
      const dir = path.join(base, p.slug);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf-8');
    }
    console.log(`  wrote ${p.slug}/index.html (+ dist/)`);
  }
}

module.exports = { POLICY_LINKS };
if (require.main === module) build();
