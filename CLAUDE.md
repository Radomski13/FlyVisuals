# Fly Visuals — Claude Project File

## What This Project Is
Fly Visuals is a vehicle wrap, custom sign, and window tinting studio based in New Port Richey, FL. This repo contains the full website and static site generator. The goal is to automate and build everything for the business after the website is published.

**Live domain:** https://flyvisualsfl.com  
**Full business/brand reference:** `FLYVISUALS_PROJECT.md` (read this for complete context on services, pricing, brand voice, SEO, etc.)

---

## Key Files

| File | Purpose |
|---|---|
| `index.html` | The entire website — one SPA file, all CSS/JS/HTML |
| `generate.js` | Static site generator — splits SPA into 370 individual HTML files |
| `bookonline.html` | Booking page — window tinting appointments + vinyl wrap deposits + graphic design orders (Stripe + Netlify Forms). Uses the full main-site navbar (ported from `index.html`, converted to real `/<slug>/` links since it's outside the SPA). |
| `products.html` | Product catalog — links to each product page (no ordering logic itself). Uses the full main-site navbar, same as `bookonline.html`. |
| `products/yard-signs/index.html` | Yard Signs order page — /products/yard-signs/ (Stripe + Netlify Forms). Uses the full main-site navbar, "Products" marked active. **Auto-generated — do not hand-edit, see "Product Manager dashboard" below.** |
| `products/vinyl-banners/index.html` | Vinyl Banners order page — /products/vinyl-banners/ (Stripe + Netlify Forms). Same as above — **auto-generated, do not hand-edit.** |
| `products/products-data.json` | Source data for every product (pricing, sizes, meta, SEO, hero copy). Edit this (or the dashboard) — not the generated pages directly. |
| `products/_product-template.html` | The shared page template every product is rendered from. Edit this only to change something ALL products share (layout, styling) — never product-specific content. |
| `generate-products.js` | Reads `products/products-data.json` + `_product-template.html`, writes each `products/<slug>/index.html` and rebuilds the `products.html` catalog grid. Run with `node generate-products.js`. |
| `sync-and-publish.js` | Takes a JSON export of the Product Manager dashboard's `products` collection, converts it to `products-data.json`, runs `generate-products.js`, and copies everything into `dist/`. Usage: `node sync-and-publish.js <export.json>`. |
| `generate-merchant-feed.js` | Reads `products/products-data.json`, writes `dist/google-merchant-feed.xml` (the Google Shopping feed). Run automatically by `sync-and-publish.js`; run alone with `node generate-merchant-feed.js`. |
| `generate-policy-pages.js` | Builds the store policy pages Google Merchant Center requires: `/return-policy/`, `/shipping-policy/`, `/privacy-policy/`, `/terms/` (writes to repo root + `dist/`). Policy text lives in this file. Run by `sync-and-publish.js`; run alone with `node generate-policy-pages.js`. Footer links to these are in `products.html`, and `products/_product-template.html` (not bookonline.html). Policies cover online-store products only, not wraps/tint/installed services. Policy decisions (2026-10-13): custom items final sale, defects/our errors reprinted or refunded if reported within 7 days; free local pickup + US shipping (lower 48). |
| `dist/` | Generated static site — **deploy this folder to Netlify** |
| `sitemap.xml` | Auto-generated inside `dist/` — submit to Google Search Console |
| `FLYVISUALS_PROJECT.md` | Full business context, services, pricing, brand, SEO, todos |
| `FLY_VISUALS_BRAND_CONTEXT.md` | Brand voice, tone, do-not-use list, preferred phrasing |

---

## Product Manager dashboard

Brian manages the product catalog (add products, edit pricing/sizes/meta) through a web dashboard instead of hand-editing HTML: **https://claude.ai/code/artifact/1a0d6b68-b3b4-43a8-8308-2ad649a6fd14**

It's a Cowork Artifact with its own database (a `products` collection, one doc per slug, plus a `meta/status` doc tracking the last publish time). Edits there save instantly to that database, but **do NOT touch the live site by themselves** — the dashboard has no access to this repo or to Netlify. Going live is a separate step:

1. Pull the current `products` collection with the Artifact tool's `read_db` action (`db_op: "list"`, `collection: "products"`).
2. Save it as a JSON array of the flat docs (drop the `id`/`version`/wrapper, keep just `data`) to a local file.
3. Run `node sync-and-publish.js <that-file>` — it rewrites `products/products-data.json`, regenerates every product page + the catalog grid via `generate-products.js`, regenerates `dist/google-merchant-feed.xml` via `generate-merchant-feed.js`, and copies everything into `dist/`.
4. Deploy `dist/` to Netlify (drag the whole folder).
5. Write the new `lastPublishedAt` (ISO timestamp) to the dashboard's `meta/status` doc via `write_db` so the dashboard reflects that the sync happened.

Do this whenever Brian says "publish" (or similar) after editing in the dashboard — that's the agreed workflow (chosen over full auto-deploy, since the site isn't on git-connected Netlify continuous deployment). A brand-new product (a new slug that doesn't exist in `products/`) is created automatically by this same flow — `generate-products.js` makes the folder if it doesn't exist.

The dashboard's per-product fields map onto `products-data.json` like this: `name` → both `panelHeading` and `productLabel`; `seoTitle`/`seoDescription` → `seo.title`/`seo.description`; `heroEyebrow`/`heroH1`/`heroSub` → `hero.*`; `catalogDesc`/`catalogCta`/`priceFrom` → `catalogCard.*`; `designFee`/`minQty`/`qtyStep`/`volumeDiscounts`/`sizes` → `pricing.*`; `imageUrl` → top-level `imageUrl` (also drives the Google Merchant feed — see below). `sync-and-publish.js` does this conversion — see `flatToNested()` in that file if the mapping ever needs to change.

## Pickup / shipping on product pages
The product template's Order Summary has an In-Store Pickup (free, default) vs Ship to Me choice (`renderFulfillment()` / `STORE` object in `products/_product-template.html`). Pickup shows the Port Richey store, address, phone, hours, and pickup timing from `pickupInfo()` in Eastern time: Mon–Fri 9 AM–5 PM ET → "now"; before 9 AM → "today at 9 AM"; after 5 PM / weekends → "9 AM" next business day. Re-checks every minute. A green "Available for pickup" badge also sits under each product photo. On mobile the chooser renders above Your Info (summary panel is hidden there). Ship to Me collects an address; shipping cost is quoted by email (no shipping charge in checkout yet). Netlify `signs-order` form gets `fulfillment`, `pickup-date`, `shipping-address`. Feed `g:pickup_sla` = same day.

## Google Merchant Center feed

`generate-merchant-feed.js` builds `dist/google-merchant-feed.xml` from `products/products-data.json` — an RSS 2.0 + `g:` namespace feed for Google Shopping. Point Merchant Center's **scheduled fetch** at:

**https://flyvisualsfl.com/google-merchant-feed.xml**

(This only works once the site is actually deployed to Netlify — see "Current Status". Until then the URL 404s.)

Modeling decisions:
- **One listing per size**, not one per product — Google's pricing-accuracy policy wants the feed price to match what a customer actually pays, and each size has a different price. All sizes of one product share `g:item_group_id` (the product slug) so Google groups them as variants.
- **A product is skipped entirely if it has no `imageUrl`** — Google requires a real photo (500×500px+) and disapproves generic/placeholder images. Neither Yard Signs nor Vinyl Banners has a photo yet as of 2026-09-05, so the feed is currently empty (valid XML, 0 `<item>`s) until Brian adds photo URLs via the dashboard's "Photo URL" field.
- **"Custom Size" options are excluded** (`isCustom: true`) — they have no fixed price/dimension to list.
- **Feed price is the raw base-tier unit price** for that size, with no volume-discount math applied — the description text mentions that volume discounts exist, but `g:price` itself is the un-discounted per-unit price. Worth revisiting if this causes a pricing-mismatch flag in Merchant Center once real orders start coming through their checkout comparison.
- `g:identifier_exists` is set to `no` (custom-made signage, no GTIN/MPN/brand-registered identifier) and `g:condition` to `new`.
- `g:google_product_category` is currently hardcoded to `Business & Industrial > Advertising & Marketing > Signage` — a reasonable guess, not verified against Google's official taxonomy ID list. Consider letting Merchant Center auto-categorize instead, or confirm the ID at https://support.google.com/merchants/answer/6324436.

**Product photos** live in `dist/product-photos/` with lowercase, hyphenated filenames (no spaces). The dashboard's Photo URL must be `https://flyvisualsfl.com/product-photos/<file>`. As of 2026-10-13 only Vinyl Banners has a photo (7 feed listings).

**Local inventory feed:** the same script also writes `dist/google-local-inventory.tsv` (store_code, id, availability, pickup_method, pickup_sla — pickup_cost was removed, Merchant Center flagged it as unrecognized) — a second Merchant Center data source at https://flyvisualsfl.com/google-local-inventory.tsv that fixes "Missing local inventory data". `STORE_CODE` in the script must exactly match the Google Business Profile store code (case-sensitive); it is FLY8132 (changed 2026-10-25 from FLYVISUALS-PR; NOT the 20-digit Business Profile ID, which Google rejects).

Regenerate manually with `node generate-merchant-feed.js`, or just run `sync-and-publish.js` — it's included in that pipeline automatically.

---

## Wrap pages SEO + Fleet Wraps removal (2026-10-14)
- Brian rewrote meta titles/descriptions/H1s for the main wrap pages (source of truth: his edited sheet; applied to the meta map in `index.html` AND directly to `dist/<slug>/index.html`). New titles drop the "| Fly Visuals" suffix by his choice. Trailer + Bus H1s now say PORT RICHEY, FL; /wraps/ H1 is VINYL WRAPS PORT RICHEY, FL.
- `/fleet-wraps/` + its 9 city pages were deleted (consolidated into `/vehicle-wraps/` = Commercial Vehicle Wraps), same pattern as the earlier /business-wraps/ removal: page-section, nav links, meta entry and city-service entry removed from `index.html`; nav/footer/related links stripped from all dist pages; sitemap entries removed; old files moved to `_removed/fleet-wraps-2026-10-14/`; `_redirects` sends /fleet-wraps/<city>/ -> /vehicle-wraps/<city>/ (301!). Leftover `'fleet-wraps'` keys in index.html JS data maps are inert.

## Heading hierarchy (2026-10-17)
Fixed skipped heading levels sitewide: footer column titles are now `<h2>` (was h4; CSS/JS use `.footer-col h2`), homepage why-items are `<h3>` (was h4), and info-card / contact-info headings that sit directly under the H1 are `<h2>` (CSS covers both h2 and h3). Keep headings descending one level at a time when adding sections.

## Hero proof badges (2026-10-17)
Every service + city page hero has: a "4.8 Rated" badge with Google/Facebook/Yelp icons ABOVE the H1 (links to the Google reviews share link), and a full-width "Financing Available — Up to 12 months · Interest free" badge directly above the Book Online / call buttons (same width and height as the button row). Rating stays 4.8 (Brian's real Google rating — don't show 5.0). Financing is through Snap Financing, but Brian chose no fine print and no apply link on the badge. Markup/CSS snippets live in `_hero-proof/`; `index.html` has the CSS in <head> plus a JS block ("Hero proof") that injects them on rebuild; skipped on home, about, contact, gallery, wrap-visualizer, guides. Trust checkmarks under the buttons now use `.hero-trust` (3 items, evenly spaced). The 5 hand-built boat-wraps city pages (crystal-river, madeira-beach, redington-shores, st-pete-beach, weeki-wachee) were patched directly in dist with a full-width quote button.

## Nav bar parity (bookonline.html / products.html)
As of 2026-09-03, `bookonline.html` and `products.html` got the same navbar as `index.html` (logo, Services mega-menu, Wrap Visualizer/Gallery/Contact Us, mobile hamburger + bottom bar, mobile accordion menu) instead of their old minimal `#site-header`. Since these pages live outside the SPA, every `onclick="showPage('id')"` link was converted to a real `href="/id/"` (the site's clean-URL convention), with `home` -> `/`. The current page's own nav item ("Book Online" or "Products") gets `.active`.

The navbar CSS relies on `index.html`'s own `:root` variable names (`--white`, `--black`, `--dark`, `--dark2`, `--red-bright`, `--grey`, `--grey-light`, `--grey-dark`, `--font-display`, `--font-body`) which are a *different* namespace than these pages' own `:root` (`--bg`, `--text`, `--muted`, `--border`, etc). Those extra variables were added into each page's own `:root` block. One real name collision: index.html's `--red-dark` (#8b0000) differs from these pages' existing `--red-dark` (#aa1010, used elsewhere in the booking/checkout UI) — the ported navbar CSS uses a renamed `--nav-red-dark` for that one rule instead of overwriting the page's existing `--red-dark`.

`#navbar` is `position: fixed`, so each page's hero section (`#store-hero`) got extra top padding (+72px desktop / +52px mobile) to clear it.

`bookonline.html` already has its own mobile sticky price bar (`#mpb`, fixed to the bottom on mobile — the real "Book & Pay" CTA). The new mobile bottom-nav (`#bottom-nav`, needed for hamburger access on mobile since the top hamburger is hidden there) is also fixed to the bottom, so on mobile `#mpb` was pushed up to `bottom: 60px` (above `#bottom-nav`) and `#store-main`'s bottom padding increased to `160px` so nothing is hidden. `products.html` has no `#mpb` element (dead CSS only), so no equivalent fix was needed there.

As of 2026-09-03 this was also extended to `products/yard-signs/index.html` and `products/vinyl-banners/index.html` (same navbar, same `#mpb`/`#bottom-nav` stacking fix, same hero top-padding fix). "Products" is marked `.active` on both since they're sub-pages of the Products section, even though the page itself isn't `products.html`.

---

## Workflow

### Making changes to the website
1. Edit `index.html`
2. Run `node generate.js` — regenerates all 370 pages in `dist/`
3. Deploy `dist/` to Netlify

### Domain/email find-and-replace
```bash
node fix-domain.js          # dry-run: shows all hits
node fix-domain.js --apply  # writes changes
```
Replaces: `flyvisuals.com` → `flyvisualsfl.com` and `info@flyvisuals.com` → `flyvisualsfl@gmail.com`

---

## Architecture — Critical to Understand

### Single-File SPA
`index.html` is ~9,500 lines. Every page is a `div.page-section` toggled via `showPage('page-id')`. No framework, no build tools — pure HTML/CSS/JS.

### Static Generator
`generate.js` uses `jsdom` (Node 14 compatible — do NOT use Puppeteer or Node 18+ APIs) to run the SPA, extract each rendered page, and write standalone HTML files with correct SEO meta, schemas, nav, and footer.

### CSS Variables — INVERTED NAMING (critical)
```css
--dark:  #ffffff   /* WHITE */
--white: #1a1a1a   /* NEAR BLACK */
--black: #f0f0f0   /* LIGHT GRAY */
```
Always check `:root` before using color variables. Never assume by name.

### Static Mode Guard
Every generated file sets `window._staticMode = true`. The second `DOMContentLoaded` handler in `index.html` checks this and returns early — preventing duplicate DOM injection when static pages load in the browser. **Do not remove this guard.**

### URL Structure
```
/                          → dist/index.html
/vehicle-wraps/            → dist/vehicle-wraps/index.html
/vehicle-wraps/trinity/    → dist/vehicle-wraps/trinity/index.html
```

### Image Paths
All image `src` and CSS `url()` paths are rewritten to root-absolute (`/image.png`) by the generator. Never use relative paths in `index.html` — they break on nested city pages.

---

## Business Info (quick reference)

| Field | Value |
|---|---|
| Business | Fly Visuals |
| Address | 8132 Cormel St, Port Richey, FL 34668 |
| Phone | (727) 494-6162 |
| Email | flyvisualsfl@gmail.com |
| Hours | Mon–Fri 8am–6pm |
| Google | https://share.google/dWQZxFT9i4BADpbBI |
| Rating | 5.0 ★ · 10 Google reviews (do NOT publish a review count in schema or visible text — self-serving + was previously inflated to 120) |

**Services:** Vehicle wraps, car/truck/van/fleet/boat/trailer/bus/wall wraps, signs (indoor, outdoor, business, banners, yard, acrylic, aluminum, corrugated), window tinting (auto, residential, commercial), graphics (vehicle, fleet, floor, window, boat, logo design)

**Service area:** New Port Richey, Port Richey, Trinity, Holiday, Odessa, Spring Hill, Wesley Chapel, Land O' Lakes, Zephyrhills, Hudson/Bayonet Point, Tarpon Springs, Clearwater, Dunedin, St. Petersburg — Pasco, Hillsborough, Pinellas counties

**Differentiators:** 3M & Avery Dennison certified · Madico & LLumar certified · In-house design · Most jobs done in 3–5 days · Price match guarantee (beat any quote by 10%)

---

## SEO Status

- 370 pages generated with unique title + description + canonical per page
- JSON-LD schemas: `LocalBusiness`, `Organization`, `WebSite`, `Service`, `BreadcrumbList`, `FAQPage`
- Sitemap at `dist/sitemap.xml` — submitted to Google Search Console
- Known GSC errors fixed: review snippet invalid type, breadcrumb missing `item` field
- Homepage meta:
  - **Title:** `Tampa Bay Sign Company | Signs, Wraps & Tint | Fly Visuals` (2026-10-17)
  - **Description:** `Custom signs, vehicle wraps, window tint & graphics for Tampa Bay. Designed, printed & installed in-house in Port Richey, FL. Get a free quote.`
  - **H1 (hero):** `The #1 Sign Company in Tampa Bay` — hero = photo slideshow + 4.8 rating badge, H1, sub line, blue financing badge, Get a Free Quote + Gallery buttons, "3M, Avery & Madico Certified Installers" line

---

## Brand Voice (short version)

- Bold, direct, local — not corporate
- Short sentences. No fluff.
- **Never use:** "seamless," "we strive to," "state-of-the-art," "solutions," "passionate about," "workmanship guarantee"
- **Always use:** "get a free quote" not "contact us today" · "most jobs done in 3–5 days" not "fast turnaround" · "3M and Avery Dennison cast vinyl" not "high quality"

---

## Current Status

### Done ✅
- Full SPA website with all service + city pages
- 370-page static site in `dist/` with correct SEO, schemas, nav, sitemap
- City area tags are clickable links to city landing pages
- All image paths root-absolute, nav fully functional (desktop + mobile)
- Domain updated to `flyvisualsfl.com` across all files
- GSC schema errors fixed (review snippet, breadcrumb `item`)

### Owner is still editing ⚠️
Pages are not final — content, copy, and images are still being reviewed and updated manually in `dist/` and `index.html`.

### Needs Stripe links before store goes live
`bookonline.html` (tinting + wraps + graphics) and each file under `products/<slug>/index.html` (one per product) have placeholder pricing. The Vinyl Wraps tab (added 2026-09-03) is different from the other two: wrap cost is too variable for a fixed price, so it collects a deposit against a "starting from" estimate (3 categories — Vehicle / Boat / Wall & Floor — × 3 coverage tiers each = 9 Stripe Payment Links needed, one per tier, priced to match that tier'''s deposit amount) rather than charging the full job upfront like tinting and the products pages do. Each has its own `CONFIG` object at the top needing real Stripe Payment Links before deployment — see `STORE_SETUP_GUIDE.html`. As of 2026-09-03, the old single `store.html` was split: `products.html` is now just a catalog page linking out, and each product (yard signs, vinyl banners) is its own standalone page/URL under `products/<slug>/`. Adding a new product is now done through the Product Manager dashboard (see above) — not by duplicating folders by hand.

---

## Automation Goals (post-launch)

- Google Business Profile auto-posts after new jobs
- Review request SMS/email after job completion
- Lead notification (SMS/push) when Netlify form submits
- Quote follow-up email sequence
- Social media auto-post (Instagram + Facebook) after jobs
- Sitemap ping to Google/Bing on each deploy
- Monthly GSC SEO report
- Blog content generation for long-tail keywords

---

*See `FLYVISUALS_PROJECT.md` for full detail on everything above.*
