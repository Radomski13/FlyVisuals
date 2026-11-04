# Fly Visuals — Brand Context File
> Load this file at the start of any Claude Code session to establish full brand, service, and language context.

---

## Company Overview

**Business Name:** Fly Visuals  
**Type:** Vehicle wrap, custom sign, and window tinting studio  
**Location:** 8132 Cormel St, Port Richey, FL 34668  
**Phone:** (727) 494-6162  
**Hours:** Monday–Friday 8:00 AM – 6:00 PM | Saturday–Sunday Closed  
**Google Business:** https://share.google/dWQZxFT9i4BADpbBI  
**Primary Service Area:** New Port Richey, Port Richey, Trinity, Holiday, Zephyrhills, Land O Lakes, Hudson, Tarpon Springs — Pasco County, FL and greater Tampa Bay area

---

## Brand Identity

### Personality
- Bold, direct, confident — never corporate or stuffy
- Local and proud — Pasco County roots matter
- Skilled craftspeople, not salespeople
- Straight-talking: no filler, no fluff, no hollow promises

### Tone of Voice
- Speak to the customer like a knowledgeable local who's done this a thousand times
- Use short sentences. Be decisive.
- Avoid: "we strive to," "we are committed to," "solutions," "seamless," "state-of-the-art"
- Prefer: specific over vague — say "most wraps done in 3–5 days" not "fast turnaround"
- Florida context matters — mention Gulf Coast climate, UV exposure, salt air, heat when relevant
- Speak to business owners and individuals equally — both are valid customers

### Visual Identity
- **Primary color:** Red `#cc1414` (bold, aggressive, action-driven)
- **Background:** Near-black `#0f0f0f` / `#111` / `#1a1a1a` — dark, premium feel
- **Text:** White `#ffffff` on dark, near-black `#1a1a1a` on light
- **Accent:** Red left border strips, red top bar on hover, red glow effects
- **Typography:** Bebas Neue (display/headings) + Barlow (body, 300–700 weight)
- **Design feel:** Industrial dark theme, sharp edges, no rounded corners on key elements, red accents, dot-grid textures, carbon fiber patterns
- **CSS Variables (inverted naming — important):**
  - `--dark: #ffffff` (white — confusingly named)
  - `--dark2: #e4e4e4` (light gray)
  - `--black: #f0f0f0` (light gray)
  - `--white: #1a1a1a` (near black)
  - `--grey-light: #333333` (dark gray)
  - `--grey: #666666` (medium gray)
  - `--grey-dark: #cccccc` (light gray)
  - `--red: #cc1414`

---

## Services

### Wraps
- **Vehicle Wraps** — Full wraps, partial wraps, color change, business advertising. Cars, trucks, SUVs, vans.
- **Fleet Wraps** — Consistent branding across multiple vehicles. Volume pricing.
- **Boat Wraps** — Marine-grade UV/saltwater-resistant vinyl. Hull wraps, tournament graphics, pontoons, center consoles, bass boats.
- **Car Wraps** — Matte, satin, gloss, chrome, color change.
- **Truck Wraps** — Pickup, work trucks, box trucks.
- **Van Wraps** — Ford Transit, Mercedes Sprinter, Ram ProMaster, Chevy Express.
- **Trailer Wraps** — Utility, enclosed, semi trailers.
- **Bus Wraps** — School, charter, transit, shuttles.
- **Wall Wraps** — Interior/exterior brand murals, gym wraps, retail.
- **Business Wraps** — Advertising wraps for contractors, trades, service companies.
- **Vehicle Decals & Lettering** — Cut vinyl, printed decals, professional lettering.
- **Vehicle Window Film** — Perforated/one-way vision graphics.
- **Vehicle Magnets** — Removable magnetic signs.

### Signs
- **Outdoor Signs** — Monument signs, channel letters, post & panel.
- **Indoor Signs** — Lobby signs, wall graphics, dimensional letters, wayfinding, ADA.
- **Business Signs** — Storefront, window lettering, complete sign packages.
- **Vinyl Banners** — Events, grand openings, promotions.
- **Yard Signs** — Real estate, contractors, events. 2–3 day turnaround.
- **Corrugated Plastic Signs** — Coroplast for job sites, real estate, events.
- **Aluminum Signs** — Durable outdoor aluminum sign faces and frames.
- **Acrylic Signs** — Premium interior signage for offices, lobbies, retail.
- **NPR Signs** — New Port Richey specific sign work.

### Window Tinting
- **Auto Window Tinting** — All shade levels, ceramic film preferred.
- **Residential Window Tinting** — Heat rejection, UV blocking, energy savings.
- **Commercial Window Tinting** — Glare reduction, HVAC savings, comfort.
- **Ceramic Film** — Top tier: best heat rejection, UV protection, clarity. No signal interference.
- **Films Used:** Madico, LLumar, 3M window films.

### Graphics
- **Vehicle Graphics** — Partial designs, logos, custom artwork on vehicles.
- **Floor Graphics** — Durable, slip-resistant, full-color for retail/events/commercial.
- **Logo Design** — In-house design from concept to print-ready files.
- **Window Graphics** — Storefront graphics, one-way vision.
- **Fleet Graphics** — Unified branding across all company vehicles.
- **Boat Graphics** — Registration numbers, hull lettering, sponsor decals, transom.

---

## Key Differentiators

1. **3M & Avery Dennison Certified** — Cast vinyl only. No cheap calendered film.
2. **Madico & LLumar Certified** — For window tinting.
3. **Full In-House Design** — Don't have artwork? They handle it start to finish.
4. **Fast Turnaround** — Most vehicle wraps and sign orders done in days, not weeks.
5. **Local Expertise** — Florida heat, Gulf Coast UV, salt air — they spec materials for it.
6. **500+ Projects Completed** — Wraps and signs across Pasco County.
7. **5.0 Google Rating** — 120+ reviews.

---

## Materials & Technical Language

- Use **cast vinyl**, never "calendered film" — cast conforms around compound curves, calendered shrinks and peels
- **3M and Avery Dennison** for wraps — "certified cast vinyl" is the key phrase
- **Madico and LLumar** for window film — ceramic is the premium tier
- Wraps protect factory paint — "remove cleanly without damaging paint" is a real selling point
- Florida-specific: "Gulf Coast UV," "salt air," "humidity," "Florida heat" — these are legitimate material concerns, not just marketing
- Boat wraps specifically need "marine-grade" vinyl — standard wrap vinyl fails on saltwater

---

## Target Customers

- **Local businesses** — contractors, trades, service companies wanting vehicle advertising
- **Fleet operators** — need consistency across multiple vehicles
- **Car enthusiasts** — color change wraps, custom designs
- **Boaters** — Gulf Coast, Pasco County fishing community
- **Homeowners** — residential window tinting for heat/privacy
- **Commercial property owners** — storefront signs, window graphics
- **Real estate / events** — yard signs, banners, corrugated signs
- Geographic focus: Pasco County FL, Tampa Bay area

---

## Website / Technical Context

The main website is a **single-file SPA** (`index.html`) located at:
`/Users/brianradomski/Downloads/fly/index.html`

**Architecture:**
- All pages are `div.page-section` elements, hidden by default (`display: none`)
- Shown/hidden via `showPage('page-id')` JavaScript function
- Single HTML file — all CSS, JS, and HTML in one document
- No build tools, no framework — vanilla HTML/CSS/JS

**Key JS functions:**
- `showPage(id)` — navigate to a page
- `ssMove(id, dir)` — slideshow navigation
- `ssInit(id, images)` — initializes a slideshow from an array of filenames
- `toggleMobile()` — opens/closes mobile menu
- `buildTrustBar()` — generates trust badge bar (injected before CTA on service pages)
- `buildReviewsBlock(startIdx, count)` — generates review carousel
- `toggleFaq(btn)` — FAQ accordion
- `toggleFooterCol(h4)` — footer accordion on mobile

**Slideshow images object:** `slideshowImages` — keyed by page id, value is array of image filenames

**Image files** live in the same directory as `index.html`:
`/Users/brianradomski/Downloads/fly/`

**Mobile navigation:**
- Top navbar: logo centered, overhanging (position: fixed, z-index 1002)
- Bottom navbar: call button (left) + hamburger (right), fixed at bottom
- Mobile menu slides up from bottom nav

**CSS notes:**
- CSS variables use INVERTED naming (`--dark` = white, `--white` = near-black) — always check `:root` before assuming
- Dark theme sections use hardcoded hex values (`#0f0f0f`, `#111`, `#1a1a1a`) rather than variables for reliability
- `@media (max-width: 768px)` is the primary mobile breakpoint

---

## Reviews (Real Google Reviews to use)

Pull from the `allReviews` array in the JS. Current reviewers include:
- Mike T. (5★) — vehicle wrap, New Port Richey
- Sarah K. (5★) — fleet wraps, Holiday
- James R. (5★) — boat wrap, Hudson
- Carlos M. (5★) — business wrap, Trinity
- Lisa B. (5★) — window tinting, Port Richey
- David W. (5★) — sign work, Land O Lakes
- Rachel P. (5★) — color change wrap, Zephyrhills
- Tom H. (5★) — fleet graphics, New Port Richey

---

## Do Not Use / Avoid

- "Seamless experience"
- "We strive to exceed expectations"
- "State-of-the-art facility"
- "Solutions" (as a standalone noun)
- "Passionate about"
- Exclamation points in body copy (sparingly in CTAs only)
- Vague superlatives without specifics ("the best," "world-class")
- "Workmanship Guarantee" (removed — do not re-add)

---

## Preferred Phrasing

| Instead of | Use |
|---|---|
| "fast turnaround" | "most jobs done in 3–5 days" |
| "high quality" | "3M and Avery Dennison cast vinyl" |
| "serve the Tampa Bay area" | "New Port Richey, Pasco County, and the greater Tampa Bay area" |
| "our team" | "we" or specific role |
| "contact us today" | "get a free quote" |
| "competitive pricing" | "free quotes, no surprises" |

---

*Last updated: May 2026 | Fly Visuals, Port Richey FL*
