const V = 'ncgs-202610291753';
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(['./', 'index.html', 'manifest.webmanifest', 'icon-192.png'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// Opening the app: try the network, but if it hasn't answered in 2 s use the saved copy, so a weak signal on the
// course never holds the app up (structural review H3). The network answer still refreshes the saved copy when it
// arrives. With a good signal the network wins, so a reload after a release gets the new version.
const WAIT = 2000;
const saved = req => caches.match(req).then(r => r || caches.match('index.html'));
const keep = (req, r) => { if (r && r.ok) { const copy = r.clone(); return caches.open(V).then(c => c.put(req, copy)); } };
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  const net = fetch(e.request);
  e.waitUntil(net.then(r => keep(e.request, r)).catch(() => {}));   // registered first, so the copy is taken before the page reads it
  if (e.request.mode !== 'navigate') { e.respondWith(net.catch(() => saved(e.request))); return; }
  e.respondWith(new Promise(resolve => {
    let done = false;
    const give = r => { if (!done && r) { done = true; resolve(r); } };
    const t = setTimeout(() => saved(e.request).then(give), WAIT);
    net.then(r => { clearTimeout(t); give(r); }, () => { clearTimeout(t); saved(e.request).then(r => { if (r) give(r); else { done = true; resolve(Response.error()); } }); });
  }));
});
