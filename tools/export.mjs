// Static export of the ChildCare (Little Nest) WordPress site.
// Crawls every internal page as a logged-out visitor, downloads the CSS/JS/fonts/images they use,
// and rewrites absolute URLs to the deploy base path.
//
// Usage: node tools/export.mjs <source-origin> <base-path> <out-dir>
//   e.g. node tools/export.mjs http://localhost:10076 /childcare-static/ site
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const [, , ORIGIN = 'http://localhost:10076', BASE = '/', OUT = 'site'] = process.argv;
const host = new URL(ORIGIN).host;

const SKIP = /\/(wp-admin|wp-login\.php|wp-json|xmlrpc\.php|feed|comments\/feed|wp-cron\.php)|[?&](replytocom|s)=|\/author\//;
const pages = new Set();
const assets = new Set();
const queue = ['/'];

const abs = (u, from) => {
  try {
    const url = new URL(u.replace(/&amp;/g, '&').replace(/&#038;/g, '&'), ORIGIN + from);
    return url.host === host ? url : null;
  } catch { return null; }
};

const isPage = (url) => !/\.[a-z0-9]{2,5}$/i.test(url.pathname) && !SKIP.test(url.pathname + url.search);

// Everything that points at the source origin becomes BASE-relative.
function rewrite(text) {
  const esc = ORIGIN.replace(/\//g, '\\/');
  return text
    .split(ORIGIN + '/').join(BASE)
    .split(esc + '\\/').join(BASE.replace(/\//g, '\\/'))
    .split(ORIGIN).join(BASE.replace(/\/$/, '') || '/')
    .split('//' + host + '/').join(BASE);
}

function outPath(url) {
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  else if (!/\.[a-z0-9]{2,5}$/i.test(p)) p += '/index.html';
  return join(OUT, p);
}

function collect(text, from, inCss) {
  const found = [];
  const re = inCss
    ? /url\(\s*['"]?([^'")]+)['"]?\s*\)/g
    : /(?:src|href|data-src|poster)=["']([^"']+)["']|srcset=["']([^"']+)["']|url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
  for (const m of text.matchAll(re)) {
    const vals = inCss ? [m[1]] : m[2] ? m[2].split(',').map((s) => s.trim().split(/\s+/)[0]) : [m[1] || m[3]];
    for (const v of vals) if (v && !v.startsWith('data:') && !v.startsWith('#') && !v.startsWith('mailto:') && !v.startsWith('tel:')) found.push(v);
  }
  return found;
}

async function save(path, body) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body);
}

// 1) Crawl pages.
while (queue.length) {
  const path = queue.shift();
  if (pages.has(path)) continue;
  pages.add(path);
  const res = await fetch(ORIGIN + path, { redirect: 'follow' });
  if (!res.ok || !(res.headers.get('content-type') || '').includes('text/html')) { console.log('skip', res.status, path); continue; }
  const html = await res.text();
  for (const ref of collect(html, path, false)) {
    const url = abs(ref, path);
    if (!url || SKIP.test(url.pathname + url.search)) continue;
    if (isPage(url)) { const p = url.pathname; if (!pages.has(p) && !queue.includes(p)) queue.push(p); }
    else assets.add(url.pathname);
  }
  // Static hosting has no server: point the forms at a notice instead of admin-post.php.
  const out = rewrite(html)
    .replace(/action="[^"]*admin-post\.php"/g, 'action="#" data-static-form')
    .replace(/<link rel=["'](?:EditURI|wlwmanifest|alternate|https:\/\/api\.w\.org\/|shortlink)["'][^>]*>\s*/g, '');
  await save(outPath(new URL(ORIGIN + path)), out);
  console.log('page ', path);
}

// 2) Download assets (and assets referenced from CSS).
const done = new Set();
const assetQueue = [...assets];
while (assetQueue.length) {
  const p = assetQueue.shift();
  if (done.has(p)) continue;
  done.add(p);
  const res = await fetch(ORIGIN + p);
  if (!res.ok) { console.log('miss ', res.status, p); continue; }
  const type = res.headers.get('content-type') || '';
  if (/css|javascript|json|svg/.test(type) || /\.(css|js|svg)$/.test(p)) {
    let text = await res.text();
    if (/\.css$/.test(p) || type.includes('css')) {
      for (const ref of collect(text, p, true)) { const url = abs(ref, p); if (url && !done.has(url.pathname)) assetQueue.push(url.pathname); }
    }
    await save(join(OUT, decodeURIComponent(p)), rewrite(text));
  } else {
    await save(join(OUT, decodeURIComponent(p)), Buffer.from(await res.arrayBuffer()));
  }
}

// 3) Static-hosting extras.
await save(join(OUT, '.nojekyll'), '');
const notFound = await fetch(ORIGIN + '/this-page-does-not-exist/');
await save(join(OUT, '404.html'), rewrite(await notFound.text()));
console.log(`\n${pages.size} pages, ${done.size} assets -> ${OUT}`);
