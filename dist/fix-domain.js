#!/usr/bin/env node
/**
 * fix-domain.js — Fly Visuals
 *
 * Sweeps the source files for the old `flyvisuals.com` domain and the old
 * `info@flyvisuals.com` email, shows every hit in context, and (with --apply)
 * patches them in one pass.
 *
 * Place this file in /Users/brianradomski/Downloads/fly/ next to index.html.
 *
 * Usage:
 *   node fix-domain.js              # dry-run: shows every hit, no changes
 *   node fix-domain.js --apply      # rewrites files; saves .bak alongside each
 *   node fix-domain.js --apply --no-backup   # skip the .bak files
 *
 * Replacement rules (applied in this order, so email is caught first):
 *   1.  info@flyvisuals.com    →  flyvisualsfl@gmail.com
 *   2.  flyvisuals.com         →  flyvisualsfl.com
 *
 * Files scanned: index.html, store.html, generate.js, plus any other top-level
 * .html / .js in the project root. The dist/ folder is skipped (regenerated
 * from index.html anyway), as are node_modules and *.bak.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const APPLY = process.argv.includes('--apply');
const NO_BACKUP = process.argv.includes('--no-backup');
const SELF = path.basename(__filename);  // never patch this script itself

const RULES = [
  { from: 'info@flyvisuals.com', to: 'flyvisualsfl@gmail.com' },
  { from: 'flyvisuals.com', to: 'flyvisualsfl.com' },
];

const SKIP_DIRS = new Set(['dist', 'node_modules', '.git']);
const SCAN_EXT = new Set(['.html', '.js', '.json', '.md', '.xml', '.txt', '.css']);

function listFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      // Only scan top-level; comment the next line out to recurse:
      continue;
    }
    if (!entry.isFile()) continue;
    if (entry.name === SELF) continue;  // don't scan ourselves — RULES contain the search strings
    if (entry.name.endsWith('.bak')) continue;
    if (!SCAN_EXT.has(path.extname(entry.name))) continue;
    out.push(full);
  }
  return out.sort();
}

function findHits(content, needle) {
  const hits = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let col = 0;
    let line = lines[i];
    while (true) {
      const idx = line.indexOf(needle, col);
      if (idx === -1) break;
      hits.push({ line: i + 1, col: idx + 1, text: lines[i] });
      col = idx + needle.length;
    }
  }
  return hits;
}

function highlight(text, needle, replacement) {
  // ANSI red strike-through old, green new (degrades gracefully if no tty)
  const tty = process.stdout.isTTY;
  if (!tty) return text.replaceAll(needle, `[${needle} → ${replacement}]`);
  return text.replaceAll(needle, `\x1b[31m${needle}\x1b[0m\x1b[32m(→${replacement})\x1b[0m`);
}

function trimLine(line, max = 140) {
  if (line.length <= max) return line;
  return line.slice(0, max - 1) + '…';
}

function processFile(file) {
  const rel = path.relative(ROOT, file);
  const original = fs.readFileSync(file, 'utf8');
  let working = original;
  const fileHits = [];

  for (const rule of RULES) {
    const hits = findHits(working, rule.from);
    for (const h of hits) fileHits.push({ ...h, rule });
    working = working.split(rule.from).join(rule.to);
  }

  if (fileHits.length === 0) return { rel, changed: 0, original, working };

  console.log(`\n\x1b[1m${rel}\x1b[0m  (${fileHits.length} hit${fileHits.length === 1 ? '' : 's'})`);
  for (const h of fileHits) {
    const line = trimLine(h.text);
    console.log(`  L${h.line}:${h.col}  ${highlight(line, h.rule.from, h.rule.to)}`);
  }

  return { rel, changed: fileHits.length, original, working };
}

function main() {
  const files = listFiles(ROOT);
  if (files.length === 0) {
    console.error(`No scannable files found in ${ROOT}`);
    process.exit(1);
  }

  console.log(`Scanning ${files.length} file(s) in ${ROOT}`);
  console.log(`Mode: ${APPLY ? '\x1b[33mAPPLY (will write changes)\x1b[0m' : '\x1b[36mdry-run (no changes)\x1b[0m'}`);

  const results = files.map(processFile);
  const total = results.reduce((n, r) => n + r.changed, 0);
  const filesWithHits = results.filter(r => r.changed > 0);

  console.log(`\n\x1b[1mSummary\x1b[0m`);
  console.log(`  Files scanned:   ${results.length}`);
  console.log(`  Files with hits: ${filesWithHits.length}`);
  console.log(`  Total hits:      ${total}`);

  if (total === 0) {
    console.log('\nNothing to fix. 👍');
    return;
  }

  if (!APPLY) {
    console.log('\nDry-run only — re-run with --apply to write changes.');
    return;
  }

  for (const r of filesWithHits) {
    const full = path.join(ROOT, r.rel);
    if (!NO_BACKUP) {
      fs.writeFileSync(full + '.bak', r.original);
    }
    fs.writeFileSync(full, r.working);
    console.log(`  wrote ${r.rel}${NO_BACKUP ? '' : ' (backup → ' + r.rel + '.bak)'}`);
  }
  console.log(`\nDone. Now regenerate the static site:\n  node generate.js`);
}

main();
