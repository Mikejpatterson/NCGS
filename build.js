// Builds every version of the app from the same source.
//   dist/site/            the live app for GitHub Pages: index.html, manifest, icons, offline worker
//   dist/server.js        the data service for Google Apps Script (with the 2026 starting data)
//   dist/bootstrap.gs     the one line pasted into Apps Script, which loads server.js from Drive
//   dist/preview.html     the app with an in-browser copy of the data, for tests and review
//   dist/golf-trip.html   the same preview as page content for publishing as an artifact
// NCGS_FIXTURE=1 builds only the two previews, from invented data (data/fixture-seed.json), never the live app or server.
// NCGS_DESIGN=editorial adds the editorial trial styles to the two previews only; the live app is never built with them.
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const safe = s => s.replace(/<\/(script)/gi, '<\\/$1');
const out = (f, s) => { fs.mkdirSync(path.dirname(path.join(__dirname, 'dist', f)), { recursive: true }); fs.writeFileSync(path.join(__dirname, 'dist', f), s); };

const deploy = fs.existsSync(path.join(__dirname, 'deploy.json')) ? JSON.parse(read('deploy.json')) : {};
const FIXTURE = process.env.NCGS_FIXTURE === '1';
if (!FIXTURE && !fs.existsSync(path.join(__dirname, 'data/seed.json'))) {
  console.error('No data/seed.json here (the real data is never committed). For a preview with invented data: NCGS_FIXTURE=1 node build.js');
  process.exit(1);
}
const seed = JSON.parse(read(FIXTURE ? 'data/fixture-seed.json' : 'data/seed.json'));
const demo = JSON.parse(read('data/demo.json'));
const fixtures = JSON.parse(read('data/card-fixtures.json'));
const version = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');

const appFiles = fs.readdirSync(path.join(__dirname, 'src/app')).filter(f => f.endsWith('.js')).sort();
const appJs = `(function () {\n'use strict';\n${appFiles.map(f => `/* ---- ${f} ---- */\n${read('src/app/' + f)}`).join('\n')}\n})();`;
const css = read('src/styles.css');
const previewCss = css + (process.env.NCGS_DESIGN === 'editorial' ? '\n/* NCGS editorial prototype */\n' + read('src/editorial-prototype.css') : '');
const engine = read('src/engine.js');
const serverBuild = require('crypto').createHash('sha1').update(read('src/server.js')).digest('hex').slice(0, 8);
const server = read('src/server.js').replace(/__BUILD__/g, serverBuild);

const body = boot => `<main id="app" aria-live="polite"></main>
<nav id="tabs" class="tabs" aria-label="Sections" hidden></nav>
<script>window.NCGS_BOOT = ${safe(JSON.stringify(boot))};</script>
${boot.mode === 'local' ? `<script>window.NCGS_SEED = ${safe(JSON.stringify(seed))};
window.NCGS_DEMO = ${safe(JSON.stringify(demo))};
window.TRIP_CARD_FIXTURES = ${safe(JSON.stringify(fixtures))};</script>` : ''}
<script>${safe(engine)}</script>
<script>${safe(server)}</script>
<script>${safe(appJs)}</script>`;

// Preview (in-browser data)
const previewBody = `<title>NCGS</title>\n<style>\n${previewCss}\n</style>\n${body({ mode: 'local', version, server: serverBuild })}\n`;
out('golf-trip.html', previewBody);
const head = (extra, attrs) => `<!doctype html><html lang="en-IE"${attrs || ''}><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#FAF8F3">
${extra || ''}<style>:root{color-scheme:light}[hidden]{display:none!important}</style>`;
// data-design marks the editorial preview, so tests know which look they are checking
out('preview.html', `${head('', process.env.NCGS_DESIGN === 'editorial' ? ' data-design="editorial"' : '')}<title>NCGS</title><style>${previewCss}</style></head><body>${body({ mode: 'local', version, server: serverBuild })}</body></html>`);

// Test card photos next to the preview
fs.mkdirSync(path.join(__dirname, 'dist', 'cards'), { recursive: true });
Object.keys(fixtures.cards).forEach(f => {
  const src = path.join(__dirname, 'test', 'cards', f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(__dirname, 'dist', 'cards', f));
});
if (FIXTURE) {
  console.log(`Built ${version} preview only, from invented fixture data${process.env.NCGS_DESIGN === 'editorial' ? ', editorial styles' : ''}: ${(previewBody.length / 1024).toFixed(0)} KB`);
  process.exit(0);
}

// Live site
const live = { mode: 'live', api: deploy.api || '', version, server: serverBuild };
out('site/index.html', `${head(`<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<meta name="apple-mobile-web-app-title" content="NCGS">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
`)}<title>NCGS</title><style>${css}</style></head><body>${body(live)}</body></html>`);
out('site/manifest.webmanifest', JSON.stringify({
  name: 'NCGS', short_name: 'NCGS', start_url: './', scope: './', display: 'standalone',
  background_color: '#FAF8F3', theme_color: '#FAF8F3',
  icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }]
}, null, 1));
// Offline: the app shell is cached, data always comes from the network (and the phone's own copy).
out('site/sw.js', `const V = 'ncgs-${version}';
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(['./', 'index.html', 'manifest.webmanifest', 'icon-192.png'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(V).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
`);
out('site/.nojekyll', '');
['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'].forEach(f => {
  const src = path.join(__dirname, 'assets', f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(__dirname, 'dist', 'site', f));
});

// Data service for Apps Script
out('server.js', `${server}\nvar NCGS_SEED = ${JSON.stringify(seed)};\n`);
out('bootstrap.gs', fs.existsSync(path.join(__dirname, 'tools', 'bootstrap.gs')) ? read('tools/bootstrap.gs') : '');

console.log(`Built ${version}: preview ${(previewBody.length / 1024).toFixed(0)} KB, site ${(fs.statSync(path.join(__dirname, 'dist/site/index.html')).size / 1024).toFixed(0)} KB, api ${deploy.api ? 'set' : 'not set yet'}`);
