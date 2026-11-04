#!/usr/bin/env node
/**
 * post-deploy.js — Fly Visuals
 *
 * Run AFTER `node generate.js` and AFTER deploying dist/ to Netlify, to:
 *   1. Submit every URL in dist/sitemap.xml to IndexNow (Bing + Yandex)
 *   2. Print next-step instructions for Google Search Console
 *
 * Place this file in /Users/brianradomski/Downloads/fly/ alongside generate.js.
 *
 * Usage:   node post-deploy.js
 * No npm dependencies — uses only Node built-ins.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const HOST = 'flyvisualsfl.com';
const SITE = `https://${HOST}`;
const DIST = path.resolve(__dirname, 'dist');
const KEY_STORE = path.resolve(__dirname, '.indexnow-key');

function loadOrCreateKey() {
  if (fs.existsSync(KEY_STORE)) {
    return fs.readFileSync(KEY_STORE, 'utf8').trim();
  }
  const key = crypto.randomBytes(16).toString('hex'); // 32 hex chars (IndexNow allows 8-128 alphanumeric)
  fs.writeFileSync(KEY_STORE, key + '\n', { mode: 0o600 });
  console.log(`Generated new IndexNow key: ${key}`);
  console.log(`Saved to ${KEY_STORE} — add this filename to .gitignore.`);
  return key;
}

function ensureKeyFile(key) {
  if (!fs.existsSync(DIST)) {
    console.error(`Error: dist/ not found at ${DIST}`);
    console.error('Run `node generate.js` first.');
    process.exit(1);
  }
  const target = path.join(DIST, `${key}.txt`);
  fs.writeFileSync(target, key);
  console.log(`Wrote keyfile to dist/: ${path.basename(target)}`);
  console.log(`  → must be deployed and reachable at ${SITE}/${key}.txt`);
}

function parseSitemap() {
  const sitemapPath = path.join(DIST, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    console.error(`Error: sitemap.xml not found at ${sitemapPath}`);
    process.exit(1);
  }
  const xml = fs.readFileSync(sitemapPath, 'utf8');
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(m => m[1]);
}

function postIndexNow(key, urls) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      host: HOST,
      key,
      keyLocation: `${SITE}/${key}.txt`,
      urlList: urls,
    });
    const req = https.request(
      {
        hostname: 'api.indexnow.org',
        path: '/indexnow',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('Fly Visuals — post-deploy');
  console.log('---');

  const key = loadOrCreateKey();
  ensureKeyFile(key);

  const urls = parseSitemap();
  console.log(`Found ${urls.length} URLs in sitemap.xml`);
  console.log('');

  // IndexNow accepts up to 10,000 URLs per request
  const BATCH = 10000;
  for (let i = 0; i < urls.length; i += BATCH) {
    const batch = urls.slice(i, i + BATCH);
    const n = Math.floor(i / BATCH) + 1;
    console.log(`Submitting batch ${n} (${batch.length} URLs) to IndexNow…`);
    try {
      const r = await postIndexNow(key, batch);
      console.log(`  HTTP ${r.status}${r.body ? ' — ' + r.body.trim() : ''}`);
      if (r.status === 200 || r.status === 202) {
        console.log('  Accepted (Bing, Yandex will recrawl).');
      } else if (r.status === 422) {
        console.log(`  422 — keyfile not reachable. Confirm ${SITE}/${key}.txt returns 200.`);
        console.log('  Did you deploy dist/ before running this script?');
      } else if (r.status === 400) {
        console.log('  400 — bad request body or invalid URL in batch.');
      } else if (r.status === 429) {
        console.log('  429 — rate limited. Try again later.');
      } else {
        console.log('  Unexpected status — see body above.');
      }
    } catch (err) {
      console.error('  Network error:', err.message);
    }
  }

  console.log('');
  console.log('Google Search Console — manual steps');
  console.log('---');
  console.log('Google retired their sitemap-ping endpoint in 2023. Submit once:');
  console.log('  1. Open https://search.google.com/search-console');
  console.log(`  2. Property: ${SITE}`);
  console.log('  3. Sitemaps → enter "sitemap.xml" → Submit');
  console.log('  (Google will re-fetch on its own schedule after that.)');
  console.log('');
  console.log('For per-URL push to Google, set up the Indexing API:');
  console.log('  https://developers.google.com/search/apis/indexing-api/v3/quickstart');
  console.log('');
  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
