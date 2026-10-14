// Layout check for the round, card, handicap, finish, photo-check and organiser screens at a normal and a large-text phone size.
// Run: python3 -m http.server 8765 -d dist & NODE_PATH=/opt/npm-tools/node_modules node test/layout2.run.js
const { chromium } = require('playwright');
const sizes = [['normal 390', 390, 844, 1], ['large text 390', 390, 844, 1.35]];
const URL = 'http://localhost:8765/preview.html';
const setup = async p => { await p.evaluate(() => { const n = window.__ncgs; n.ORGPIN.pin = '1234'; const base = n.D.round('demo-cabopino');
  n.put('rounds', [Object.assign({}, base, { id: 'next-1', source: 'organiser', status: 'upcoming', name: 'Rio Real 2', date: '2026-10-20', season: 2026, first_tee: '', contests: null, kb: null })]); }); };
const golfer = (v, pf) => async p => { await p.evaluate(({ v, pf }) => { const n = window.__ncgs; const base = { v, p: pf ? pf(n) : {} }; n.UI.stack = [{ v: 'home', p: {} }, base]; n.render(); }, { v, pf: null }); };
const gv = (v, params) => async p => { await p.evaluate(({ v, params }) => { const n = window.__ncgs; n.DB.prefs.me = 'mike-p'; n.UI.stack = [{ v: 'home', p: {} }, { v, p: params }]; n.render(); }, { v, params }); await p.waitForTimeout(200); };
const ov = (v, params) => async p => { await setup(p); await p.evaluate(({ v, params }) => { const n = window.__ncgs; n.UI.org = true; n.UI.orgUnlocked = true; n.UI.orgStack = [{ v: 'home', p: {} }].concat(v === 'home' ? [] : [{ v, p: params || {} }]); n.render(); }, { v, params }); await p.waitForTimeout(200); };
const scenarios = [
  ['g-round-live', gv('round', { rid: 'demo-cabopino' })],
  ['g-round-final', gv('round', { rid: '2026-rio-real' })],
  ['g-card', gv('card', { rid: 'demo-cabopino', pid: 'mike-p' })],
  ['g-hcp', gv('hcp', { rid: 'demo-cabopino', pid: 'mike-p' })],
  ['g-finish', gv('finish', {})],
  ['g-check', gv('check', { rid: 'demo-cabopino', gid: 'g1', seg: 'front' })],
  ['o-lock', async p => { await p.evaluate(() => { const n = window.__ncgs; n.UI.org = true; n.UI.orgUnlocked = false; n.UI.orgStack = [{ v: 'lock', p: {} }]; n.render(); }); }],
  ['o-home', ov('home')],
  ['o-round', ov('round', { rid: 'next-1' })],
  ['o-details', ov('details', { rid: 'next-1' })],
  ['o-playing', ov('playing', { rid: 'next-1' })],
  ['o-group', ov('group', { rid: 'demo-cabopino', gid: 'g1' })],
  ['o-guest', ov('guest', { rid: 'next-1' })],
  ['o-late', ov('late', { rid: 'next-1' })],
  ['o-members', ov('members')],
  ['o-member', ov('member', { pid: 'mike-p' })],
  ['o-courses', ov('courses')],
  ['o-course', ov('course', { cid: null })],
  ['o-settings', ov('settings')],
  ['o-log', ov('log')],
  ['o-export', ov('export')],
];
const metrics = () => {
  const app = document.getElementById('app'); const out = { hover: [], clip: [], wide: [], small: [] }; const vw = window.innerWidth;
  if (app.scrollWidth > app.clientWidth + 1) out.hover.push(app.scrollWidth + '>' + app.clientWidth);
  for (const e of app.querySelectorAll('*')) { const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue; const cs = getComputedStyle(e);
    const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); const t = (e.textContent || '').trim().slice(0, 30);
    if (own && e.scrollWidth > e.clientWidth + 1 && cs.display !== 'inline' && !/vh|pu/.test(e.className)) out.clip.push(t + ' [' + e.className + ']');
    if ((r.right > vw + 1 || r.left < -1) && !e.closest('.sc-wrap')) out.wide.push(t + ' [' + e.className + ']');
    if ((e.tagName === 'BUTTON' || e.tagName === 'INPUT' || e.tagName === 'SELECT') && r.width > 4 && r.height < 40 && cs.display !== 'inline') out.small.push(t + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
  return out; };
(async () => { const b = await chromium.launch(); let fails = 0;
  for (const [sn, w, h, scale] of sizes) { const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    for (const [name, fn] of scenarios) { await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.brand');
      if (scale !== 1) await p.addStyleTag({ content: `html{font-size:${scale * 100}% !important}` });
      errs.length = 0;
      try { await fn(p); } catch (e) { fails++; console.log('FAIL  ' + sn + ' / ' + name + ' could not be opened: ' + e.message.split('\n')[0]); continue; }
      await p.waitForTimeout(250);
      const m = await p.evaluate(metrics); const text = (await p.textContent('#app')).trim();
      const bad = [...errs.map(x => 'script error: ' + x), ...m.hover.map(x => 'page wider than screen ' + x), ...m.clip.map(x => 'cut off: ' + x), ...m.wide.map(x => 'off screen: ' + x), ...m.small.map(x => 'small target: ' + x)];
      if (!text) bad.push('screen is empty');
      if (bad.length) { fails++; console.log('FAIL  ' + sn + ' / ' + name); bad.slice(0, 6).forEach(x => console.log('      ' + x)); } else console.log('PASS  ' + sn + ' / ' + name); }
    await ctx.close(); }
  await b.close(); if (fails) { console.log('SOME FAILED'); process.exit(1); } })();
