// Packages the phone preview for the release review (docs/RELEASE-REVIEW.md): invented data only, both looks.
// node tools/phone-preview-pack.js [outdir]          (default dist/phone-preview)
// Builds the fixture preview twice (standard, editorial) with build.js and copies them, with the synthetic test card
// photos, into one folder that any plain static host can serve as it is:
//   index.html      a short page linking the two looks
//   standard.html   NCGS_FIXTURE=1 node build.js
//   editorial.html  NCGS_FIXTURE=1 NCGS_DESIGN=editorial node build.js
//   cards/          the synthetic scorecard photos the preview's card check uses
//   PACKAGE.json    source commit, file sizes and content fingerprints, and the result of every check below
// It does not publish anything. Checks (any failure exits 1 and says why):
//   - each preview embeds exactly data/fixture-seed.json, and runs in "local" mode (data stays in the phone's browser)
//   - no data-service address: no "api" in the boot settings, no Apps Script address anywhere
//   - no offline worker: no sw.js or manifest in the folder, and the app only registers its worker in "live" mode,
//     so the preview cannot take over (or be taken over by) the live app's offline cache when hosted on its own address
//   - no key-like strings (Anthropic, OpenAI, GitHub tokens, private keys)
//   - if the real data happens to be on this computer (data/seed.json or data/ncgs-2026.json, never committed),
//     none of its member names appear in the package
// The fingerprint ignores the build time stamp (NCGS_BOOT.version), so two runs on the same commit give the same one.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'dist', 'phone-preview'));
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const git = (...a) => { try { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch (e) { return ''; } };
const fails = [], notes = [];
const check = (ok, what) => { (ok ? notes : fails).push((ok ? 'ok    ' : 'FAIL  ') + what); };

const build = design => {
  const env = { ...process.env, NCGS_FIXTURE: '1' };
  delete env.NCGS_DESIGN;
  if (design) env.NCGS_DESIGN = design;
  execFileSync(process.execPath, ['build.js'], { cwd: ROOT, env, stdio: ['ignore', 'ignore', 'inherit'] });
  return fs.readFileSync(path.join(ROOT, 'dist', 'preview.html'), 'utf8');
};
const looks = { standard: build(''), editorial: build('editorial') };

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'cards'), { recursive: true });
for (const f of fs.readdirSync(path.join(ROOT, 'dist', 'cards'))) fs.copyFileSync(path.join(ROOT, 'dist', 'cards', f), path.join(OUT, 'cards', f));
for (const [k, html] of Object.entries(looks)) fs.writeFileSync(path.join(OUT, k + '.html'), html);
fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><html lang="en-IE"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>NCGS preview</title><style>body{font:17px/1.45 -apple-system,system-ui,sans-serif;margin:0;padding:24px;background:#FAF8F3;color:#14231B}
a{display:block;margin:12px 0;padding:14px 20px;min-height:44px;box-sizing:border-box;border-radius:999px;background:#0B3D2E;color:#fff;text-decoration:none;font-weight:700;text-align:center}</style></head>
<body><h1>NCGS design preview</h1><p>Made-up golfers and scores. Nothing you enter leaves this phone, and it is not the real app.</p>
<a href="standard.html">Current look</a><a href="editorial.html">Editorial look</a></body></html>
`);

// Checks
const seedJson = fs.readFileSync(path.join(ROOT, 'data', 'fixture-seed.json'), 'utf8');
const safe = s => s.replace(/<\/(script)/gi, '<\\/$1');
const fixture = safe(JSON.stringify(JSON.parse(seedJson)));
const boot = html => { const m = /window\.NCGS_BOOT = (\{.*?\});<\/script>/.exec(html); return m ? JSON.parse(m[1]) : null; };
const files = [];
const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : files.push(p); });
walk(OUT);
const rel = p => path.relative(OUT, p).split(path.sep).join('/');
const text = files.filter(f => /\.(html|json)$/.test(f)).map(f => [rel(f), fs.readFileSync(f, 'utf8')]);

for (const [k, html] of Object.entries(looks)) {
  const b = boot(html);
  check(html.includes(`window.NCGS_SEED = ${fixture};`), `${k}: embeds exactly data/fixture-seed.json`);
  check(b && b.mode === 'local', `${k}: runs in "local" mode (data stays in the phone's browser)`);
  check(b && !('api' in b), `${k}: no data-service address in the boot settings`);
  check(/serviceWorker' in navigator && BOOT\.mode === 'live'/.test(html), `${k}: offline worker is registered only in "live" mode`);
  check((html.includes('data-design="editorial"')) === (k === 'editorial'), `${k}: look marker matches`);
}
check(!files.some(f => /(^|\/)(sw\.js|manifest\.webmanifest)$/.test(rel(f))), 'no offline worker or install manifest in the folder');
const deploy = fs.existsSync(path.join(ROOT, 'deploy.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'deploy.json'), 'utf8')) : {};
const banned = [
  ['Apps Script address', /script\.google(usercontent)?\.com/],
  ['Anthropic key', /sk-ant-[A-Za-z0-9_-]{8,}/],
  ['OpenAI key', /\bsk-(proj-)?[A-Za-z0-9]{20,}/],
  ['GitHub token', /\b(ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}/],
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/]
];
if (deploy.api) banned.push(['the live data-service address from deploy.json', new RegExp(deploy.api.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))]);
for (const [what, re] of banned) {
  const hit = text.find(([, s]) => re.test(s));
  check(!hit, `no ${what}${hit ? ' (found in ' + hit[0] + ')' : ''}`);
}
const real = ['data/seed.json', 'data/ncgs-2026.json'].filter(f => fs.existsSync(path.join(ROOT, f)));
if (real.length) {
  const names = new Set();
  for (const f of real) {
    const d = JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
    (d.members || []).forEach(m => [m.name, m.full].forEach(n => { if (n && n.length > 2) names.add(n); }));
  }
  const fx = new Set(JSON.parse(seedJson).members.flatMap(m => [m.name, m.full]));
  const hits = [...names].filter(n => !fx.has(n) && text.some(([, s]) => s.includes(JSON.stringify(n))));
  check(!hits.length, `no real member name from ${real.join(', ')} (${names.size} checked)${hits.length ? ': found ' + hits.length : ''}`);
} else notes.push(`skip  real-name check: no real data on this computer (expected; it is never committed)`);

// Fingerprints ignore the build time stamp, so the same commit always gives the same ones.
const stamp = s => s.replace(/"version":"\d{12}"/g, '"version":"-"');
const manifest = {
  note: 'NCGS phone preview package: invented data only. Built by tools/phone-preview-pack.js. Not published by this tool.',
  commit: git('rev-parse', 'HEAD'),
  uncommitted: git('status', '--porcelain', '--', 'src', 'build.js', 'data/fixture-seed.json', 'data/demo.json', 'data/card-fixtures.json') !== '',
  built: new Date().toISOString(),
  files: files.filter(f => rel(f) !== 'PACKAGE.json').sort().map(f => {
    const buf = fs.readFileSync(f);
    return { file: rel(f), bytes: buf.length, sha256: sha(/\.html$/.test(f) ? stamp(buf.toString('utf8')) : buf) };
  }),
  checks: [...notes, ...fails]
};
manifest.fingerprint = sha(manifest.files.map(f => f.file + ' ' + f.sha256).join('\n'));
fs.writeFileSync(path.join(OUT, 'PACKAGE.json'), JSON.stringify(manifest, null, 1) + '\n');

console.log(`Phone preview package: ${path.relative(ROOT, OUT) || OUT}`);
console.log(`commit ${manifest.commit}${manifest.uncommitted ? ' plus uncommitted app changes' : ''}`);
manifest.files.forEach(f => console.log(`  ${f.file.padEnd(44)} ${String(f.bytes).padStart(8)}  ${f.sha256.slice(0, 16)}`));
console.log(`fingerprint ${manifest.fingerprint}`);
[...notes, ...fails].forEach(l => console.log(l));
console.log(fails.length ? `${fails.length} check(s) FAILED` : 'ALL CHECKS PASSED (packaged only: not published)');
process.exit(fails.length ? 1 : 0);
