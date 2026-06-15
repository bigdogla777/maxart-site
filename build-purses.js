#!/usr/bin/env node
/*
 * build-purses.js — regenerate the purse listings on every page from ONE source.
 *
 * Single source of truth:  purses.json
 * Run after editing it:     node build-purses.js
 * Then:                     git add -A && git commit && git push   (Vercel auto-deploys)
 *
 * It rewrites three machine-owned regions, leaving everything else untouched:
 *   index.html      <!-- PURSES:FEATURE:START --> ... :END   (the featured hero purse)
 *   index.html      <!-- PURSES:GRID:START --> ... :END       (the homepage purse grid)
 *   atelier-3d.html <script id="purses-data"> ... </script>   (the 3D atelier data island)
 *
 * Each purse in purses.json: { img, title, detail, status, featured?, blurb? }
 *   status "Sold" renders the sold badge; any other value (e.g. "$850") renders as a price.
 *   exactly one purse should have "featured": true — it becomes the homepage hero.
 *   "blurb" is raw HTML (entities allowed) shown under the featured purse; optional.
 */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

const purses = JSON.parse(fs.readFileSync(path.join(ROOT, 'purses.json'), 'utf8'));

// --- validation -------------------------------------------------------------
const errs = [];
purses.forEach((p, i) => {
  ['img', 'title', 'detail', 'status'].forEach(k => {
    if (!p[k] || typeof p[k] !== 'string') errs.push(`purse #${i} (${p.title || '?'}) missing/invalid "${k}"`);
  });
});
const featured = purses.filter(p => p.featured);
if (featured.length !== 1) errs.push(`expected exactly 1 "featured":true purse, found ${featured.length}`);
if (errs.length) { console.error('purses.json validation failed:\n  - ' + errs.join('\n  - ')); process.exit(1); }

// --- helpers ----------------------------------------------------------------
const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const escText = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const isSold = p => p.status.trim().toLowerCase() === 'sold';

function gridCard(p) {
  const meta = `${p.detail} · ${p.status}`;
  const tagClass = isSold(p) ? 'tag sold' : 'tag';
  return `
      <article class="work reveal">
        <a href="#" class="lb-trigger" data-title="${escAttr(p.title)}" data-meta="${escAttr(meta)}">
          <img src="${escAttr(p.img)}" alt="${escAttr(p.title)}" loading="lazy" decoding="async"/></a>
        <div class="work-info"><h3>${escText(p.title)}</h3><p class="meta">${escText(p.detail)}</p><span class="${tagClass}">${escText(p.status)}</span></div>
      </article>`;
}

function featureBlock(p) {
  const meta = `${p.detail} · ${p.status}`;
  const priceClass = isSold(p) ? 'price sold' : 'price';
  const blurb = p.blurb ? `\n        <p style="margin-top:1.4rem; color:var(--cream-dim); max-width:46ch;">${p.blurb}</p>` : '';
  return `
    <div class="atelier-lede reveal">
      <div class="feature-art">
        <a href="#" class="lb-trigger" data-title="${escAttr(p.title)}" data-meta="${escAttr(meta)}">
          <img src="${escAttr(p.img)}" alt="${escAttr(p.title)}" loading="lazy" decoding="async"/>
        </a>
      </div>
      <div class="feature-text">
        <span class="feature-num">&#10022;</span>
        <h3>${escText(p.title)}</h3>
        <p class="meta">${escText(p.detail)}</p>
        <span class="${priceClass}">${escText(p.status)}</span>${blurb}
        <div class="rule-l"></div>
      </div>
    </div>
`;
}

function replaceRegion(src, startRe, endMarker, replacement, label) {
  const start = src.match(startRe);
  if (!start) throw new Error(`marker not found: ${label} start`);
  const startIdx = start.index + start[0].length;
  const endIdx = src.indexOf(endMarker, startIdx);
  if (endIdx === -1) throw new Error(`marker not found: ${label} end`);
  return src.slice(0, startIdx) + replacement + src.slice(endIdx);
}

// --- index.html: feature + grid --------------------------------------------
let idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
idx = replaceRegion(idx, /<!-- PURSES:FEATURE:START[\s\S]*?-->/, '<!-- PURSES:FEATURE:END -->',
  featureBlock(featured[0]) + '    ', 'FEATURE');
const gridCards = purses.filter(p => !p.featured).map(gridCard).join('\n') + '\n';
idx = replaceRegion(idx, /<!-- PURSES:GRID:START[\s\S]*?-->/, '<!-- PURSES:GRID:END -->',
  '\n' + gridCards + '      ', 'GRID');
fs.writeFileSync(path.join(ROOT, 'index.html'), idx);

// --- atelier-3d.html: JSON data island -------------------------------------
let atl = fs.readFileSync(path.join(ROOT, 'atelier-3d.html'), 'utf8');
const islandJson = '\n' + purses.map(p =>
  ' ' + JSON.stringify({ img: p.img, title: p.title, detail: p.detail, status: p.status })
).join(',\n') + '\n';
atl = replaceRegion(atl, /id="purses-data">/, '</script>', '\n[' + islandJson + ']\n', 'ISLAND');
fs.writeFileSync(path.join(ROOT, 'atelier-3d.html'), atl);

const sold = purses.filter(isSold).length;
console.log(`build-purses.js: wrote ${purses.length} purses (${sold} sold, ${purses.length - sold} available) to index.html + atelier-3d.html`);
console.log(`  featured: ${featured[0].title}`);
