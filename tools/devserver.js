// A local copy of the live setup, for testing with several simulated phones:
// the real src/server.js running on an in-memory store, plus the built live app.
//   node tools/devserver.js [port]      (needs a build first: node build.js)
// Control while running:  POST /__fault {"mode":"none|down|slow|drop|error"}   GET /__state   POST /__reset
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const srcText = fs.readFileSync(path.join(__dirname, '..', 'src', 'server.js'), 'utf8');
// the same build fingerprint that build.js stamps, so the app sees a current server
const N = new Function(srcText.replace(/__BUILD__/g, crypto.createHash('sha1').update(srcText).digest('hex').slice(0, 8)) + '\nreturn NCGS;')();

const root = path.join(__dirname, '..');
const site = path.join(root, 'dist', 'site');
const port = Number(process.argv[2] || 8766);
const seedFile = path.join(root, 'data', 'seed.json');
const seedData = fs.existsSync(seedFile) ? JSON.parse(fs.readFileSync(seedFile, 'utf8')) : {};
let store, srv, fault = 'none', calls = 0;
function reset() {
  store = N.memoryStore();
  srv = N.createServer(store);
  srv.api({ op: 'seed', data: seedData, note: 'dev' });
  fault = 'none'; calls = 0;
}
reset();
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/json', '.png': 'image/png' };
http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const body = () => new Promise(r => { let b = ''; req.on('data', c => { b += c; }); req.on('end', () => r(b)); });
  if (url === '/api' && req.method === 'POST') {
    body().then(b => {
      calls++;
      const answer = () => { let q = {}; try { q = JSON.parse(b); } catch (e) { /* bad json */ } res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(srv.api(q))); };
      if (fault === 'down') { res.writeHead(503); res.end('down'); return; }
      if (fault === 'drop') { req.socket.destroy(); return; }
      if (fault === 'error') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'server', message: 'Service error' })); return; }
      if (fault === 'slow') { setTimeout(answer, 3000); return; }
      answer();
    });
    return;
  }
  if (url === '/__fault') { body().then(b => { fault = JSON.parse(b).mode; res.end('ok'); }); return; }
  if (url === '/__reset') { reset(); res.end('ok'); return; }
  if (url === '/__state') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ver: store.getVer(), tables: store.dump().tables, calls })); return; }
  let f = url === '/' ? '/index.html' : url;
  f = path.join(site, path.normalize(f).replace(/^(\.\.[/\\])+/, ''));
  if (!f.startsWith(site) || !fs.existsSync(f)) { res.writeHead(404); res.end('not found'); return; }
  let data = fs.readFileSync(f);
  if (f.endsWith('index.html')) data = Buffer.from(data.toString().replace(/"api":"[^"]*"/, '"api":"/api"'));
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(data);
}).listen(port, () => console.log('dev server on ' + port));
