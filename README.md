# dist/ Quick Wins — Fly Visuals

Three pre-launch chores from the master project file, done.

## What's here

| File | Goes to | Why |
|---|---|---|
| `robots.txt` | `dist/robots.txt` | Allows all crawlers, points to sitemap, blocks tracking-param URLs |
| `favicon.svg` | `dist/favicon.svg` | Vector favicon — bold red F on near-black, scales infinitely |
| `favicon.ico` | `dist/favicon.ico` | Multi-size ICO (16, 32, 48) for legacy browser tabs |
| `favicon-16.png` | `dist/favicon-16.png` | PNG fallback |
| `favicon-32.png` | `dist/favicon-32.png` | PNG fallback |
| `favicon-48.png` | `dist/favicon-48.png` | Extra size some bookmarks managers like |
| `apple-touch-icon.png` | `dist/apple-touch-icon.png` | iOS home-screen icon (180×180) |
| `icon-192.png` | `dist/icon-192.png` | PWA / Android |
| `icon-512.png` | `dist/icon-512.png` | PWA / Android splash |
| `site.webmanifest` | `dist/site.webmanifest` | PWA manifest — lets the site be added to home screens |
| `head-snippet.html` | paste into `index.html` `<head>` | Wires the favicons into every generated page |
| `post-deploy.js` | `/Users/brianradomski/Downloads/fly/post-deploy.js` | Submits sitemap URLs to IndexNow + prints GSC steps |

There's also a stray empty `_tmp48.png` from icon generation — safe to delete.

## How to install (5 minutes)

### 1. Copy the icons + manifest + robots.txt into `dist/`

From the project folder, copy these files into `/Users/brianradomski/Downloads/fly/dist/`:

```
robots.txt
favicon.svg
favicon.ico
favicon-16.png
favicon-32.png
favicon-48.png
apple-touch-icon.png
icon-192.png
icon-512.png
site.webmanifest
```

> Also copy them into `/Users/brianradomski/Downloads/fly/` (next to `index.html`) so `generate.js` carries them on the next rebuild — otherwise the next `node generate.js` won't include them in `dist/`.

### 2. Paste the head snippet into `index.html`

Open `head-snippet.html`, copy everything inside, and paste it into the `<head>` of `/Users/brianradomski/Downloads/fly/index.html` — anywhere near the existing `<link rel="canonical">` and meta tags is fine.

Then regenerate:

```bash
cd /Users/brianradomski/Downloads/fly
node generate.js
```

That bakes the favicon links into all 370 static pages.

### 3. Drop `post-deploy.js` into the project root

Copy `post-deploy.js` into `/Users/brianradomski/Downloads/fly/` next to `generate.js`. Run it **after** you've deployed `dist/` to Netlify:

```bash
node post-deploy.js
```

The first run will:
- Generate a 32-char IndexNow key and save it to `.indexnow-key` (gitignore this)
- Write the keyfile (`<key>.txt`) into `dist/` — re-deploy after this so it's reachable
- POST every sitemap URL to IndexNow (Bing + Yandex pick up immediately)
- Print the Google Search Console steps (Google killed their auto-ping endpoint in 2023, so this part stays manual)

> First-run gotcha: if IndexNow returns 422, your keyfile isn't reachable yet. Deploy `dist/` again so `https://flyvisualsfl.com/<key>.txt` returns 200, then re-run.

## What got skipped (and why)

- **Per-service OG images** — separate task, takes longer; left on the TODO list.
- **Auto-submit to Google Indexing API** — requires OAuth/Service Account setup; documented in `post-deploy.js` as a next step rather than wired up.
- **Favicon `maskable` icons** — current icons work fine; add maskable variants later if you ship a real PWA install prompt.

## After the install

Open `https://flyvisualsfl.com/robots.txt` and `https://flyvisualsfl.com/favicon.ico` in a browser after deploy — both should return 200. Then verify the tab icon shows the red F.
