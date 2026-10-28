// The app opens straight away on a weak signal (structural review H3), and still picks up a new release.
// Serves the built live site (dist/site) from a local server whose index.html can be slowed down, so the service
// worker's saved copy is tested against a network that is alive but slow, as on a golf course.
// Run after a full build: node test/sw-open.run.js
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'dist', 'site');
const PORT = 8781;
const st = { delay: 0, mark: '' };
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  const isIndex = p === '/index.html';
  const send = () => {
    let body = fs.readFileSync(file);
    // Never let the test reach the live data service: blank the API address in what we serve.
    if (isIndex) body = Buffer.from(body.toString().replace(/"api":"[^"]*"/, '"api":""').replace('</title>', `</title><!--MARK:${st.mark}-->`));
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(body); };
  if (isIndex && st.delay) setTimeout(send, st.delay); else send();
});

let ok = true;
const check = (n, c, extra) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (!c && extra ? '   [' + extra + ']' : '')); if (!c) ok = false; };

(async () => {
  if (!fs.existsSync(path.join(ROOT, 'sw.js'))) { console.log('FAIL  dist/site is missing: run a full build first'); process.exit(1); }
  await new Promise(r => server.listen(PORT, r));
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    const URL = `http://localhost:${PORT}/`;

    // First visit with a good signal: the service worker installs and saves a copy.
    st.mark = 'v1';
    await page.goto(URL);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();   // now the page is controlled by the worker
    const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
    const savedCopy = await page.evaluate(async () => !!(await caches.match('index.html')));
    check('the service worker controls the page and has a saved copy', controlled && savedCopy);

    // Weak signal: index.html takes 20 s to arrive. The app must open from the saved copy in under 3 s.
    st.delay = 20000;
    const t0 = Date.now();
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => document.querySelector('#app') && document.querySelector('#app').children.length > 0, null, { timeout: 5000 });
    const took = Date.now() - t0;
    check(`opens in under 3 s when the network takes 20 s (took ${(took / 1000).toFixed(1)} s)`, took < 3000, `${took} ms`);
    check('and it opened the saved copy', (await page.content()).includes('<!--MARK:v1-->'));

    // Good signal again, new release on the server: a reload gets the new version (pull-to-refresh reloads the page).
    // Chrome makes a second request for the same address wait behind one still in flight, so let the slow one finish.
    st.delay = 0; st.mark = 'v2';
    await page.waitForTimeout(20500);
    await page.reload();
    check('with a good signal a reload gets the new release', (await page.content()).includes('<!--MARK:v2-->'));

    // The slow answer from earlier refreshed the saved copy in the background, so the next weak-signal open is current.
    st.delay = 20000;
    const t1 = Date.now();
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    check(`a second weak-signal open is also quick (took ${((Date.now() - t1) / 1000).toFixed(1)} s)`, Date.now() - t1 < 3000);
    check('and shows the newest saved copy', (await page.content()).includes('<!--MARK:v2-->'));
    check('no script errors', errs.length === 0, errs.join(' | '));
  } catch (e) { console.error(e); ok = false; } finally { await b.close(); server.close(); }
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
