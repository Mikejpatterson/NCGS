// Warning v team colour audit (evidence for docs/WARNING-TOKENS.md). Fixture builds only; nothing here changes the app.
// node tools/warning-token-audit.js <std.html> <ed.html> <outdir>
// Opens every screen where `.c-b` (Buggy 2's text colour) marks a warning or destructive action, plus one team use
// for comparison, at 360px, 390px and 390px with 135% text. For every `.c-a`/`.c-b` element (and the existing
// warning styles `.banner.warn` and `.err` where present) it reads the colour the browser really computed, the
// colour really behind it (see-through backgrounds blended down), the WCAG 2 contrast ratio, and the colour the
// same element would have WITHOUT the `.c-b` class (so it shows whether `.c-b` actually wins the cascade).
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const [STD, ED, OUT] = process.argv.slice(2);
if (!STD || !ED || !OUT) { console.log('usage: node tools/warning-token-audit.js <std.html> <ed.html> <outdir>'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const looks = [['standard', STD], ['editorial', ED]];
const sizes = [['360', 360, 740, 1], ['390', 390, 844, 1], ['390-135', 390, 844, 1.35]];

const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const toHex = c => '#' + c.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();

// An upcoming organiser round with two groups and no scores, so Delete round, KBs and Change a player all show.
const setup = () => {
  const n = window.__ncgs; n.ORGPIN.pin = '1234';
  const base = n.D.round('demo-cabopino');
  n.put('rounds', [Object.assign({}, base, { id: 'wta-1', source: 'organiser', status: 'upcoming', name: 'Warning check', date: '2026-10-25', season: 2026, contests: null, kb: null })]);
  n.UI.org = true; n.UI.orgUnlocked = true;
};
const go = stack => { const n = window.__ncgs; n.UI.orgStack = stack; n.render(); };
// BOOT in the app is this same object; DB is exposed on window.__ncgs.
const stale = () => { const B = window.NCGS_BOOT; B.mode = 'live'; B.server = 'app-build'; const D = window.__ncgs.DB; D.lastSync = Date.now(); D.serverBuild = 'older-build'; };
const home = { v: 'home', p: {} }, round = { v: 'round', p: { rid: 'wta-1' } };
const tap = async (p, s) => { await p.click(s, { timeout: 3000 }); await p.waitForTimeout(250); };
// [name, what it shows, target selector, steps]
const cases = [
  ['delete-round', 'Round page: "Delete round" link', '[data-act="delete-round"]', async p => { await p.evaluate(go, [home, round]); }],
  ['delete-round-confirm', 'Round page: after one tap, "Tap again to delete the round"', '[data-act="delete-round"]', async p => { await p.evaluate(go, [home, round]); await tap(p, '[data-act="delete-round"]'); }],
  ['kb-off', 'KBs page: "Turn KBs off for the round" link', '[data-act="org-kb-clear"]', async p => { await p.evaluate(go, [home, round, { v: 'kb', p: { rid: 'wta-1' } }]); }],
  ['late-drop', 'Change a player: "Takes no further part" row', '[data-act="late-drop"]', async p => {
    await p.evaluate(go, [home, round, { v: 'late', p: { rid: 'wta-1' } }]); await tap(p, '[data-act="late-pick"]'); }],
  ['reset-preview', 'Organiser home (preview builds only): "Start the preview again" row', '[data-act="reset-preview"]', async p => { await p.evaluate(go, [home]); }],
  // The live app would say "Out of date" only when it has synced with a server whose build differs from the app's.
  // Simulated here by setting those values in the page; nothing is sent anywhere (file:// page, no server).
  ['out-of-date', 'Settings, About: Server "Out of date" (simulated stale server)', '.row .num.c-b', async p => {
    await p.evaluate(stale); await p.evaluate(go, [home, { v: 'settings', p: {} }]); }],
  ['out-of-date-banner', 'Organiser home with the same stale server: existing red warning banner, for comparison', '.banner.warn', async p => {
    await p.evaluate(stale); await p.evaluate(go, [home]); }],
  ['team-scorecard', 'Group scorecard (team use, for comparison): Buggy 2 names in the header', '.orow .cap.c-b', async p => {
    await p.evaluate(() => { const n = window.__ncgs; const r = n.D.round('wta-1'); n.put('rounds', [Object.assign({}, r, { status: 'live' })]); n.render(); });
    const gid = await p.evaluate(() => window.__ncgs.D.round('wta-1').groups[0].id);
    await p.evaluate(([g]) => window.__ncgs.UI.orgStack = [{ v: 'home', p: {} }, { v: 'round', p: { rid: 'wta-1' } }, { v: 'group', p: { rid: 'wta-1', gid: g } }], [gid]);
    await p.evaluate(() => window.__ncgs.render()); }],
];

function measure() {
  const parse = s => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [v[0], v[1], v[2], v[3] === undefined ? 1 : v[3]]; };
  const over = (top, under) => [0, 1, 2].map(i => Math.round(top[i] * top[3] + under[i] * (1 - top[3]))).concat(1);
  const behind = e => {
    const layers = [];
    for (let a = e; a; a = a.parentElement) { const c = parse(getComputedStyle(a).backgroundColor); if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; } }
    let base = [255, 255, 255, 1]; for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return base;
  };
  const shown = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  const sel = e => e.tagName.toLowerCase() + '.' + String(e.getAttribute('class') || '').trim().split(/\s+/).join('.');
  const out = [];
  for (const e of document.querySelectorAll('#app .c-a, #app .c-b, #app .banner.warn, #app .err')) {
    if (!shown(e)) continue;
    const cs = getComputedStyle(e), bg = behind(e), fg = parse(cs.color);
    let without = null;
    for (const k of ['c-a', 'c-b']) if (e.classList.contains(k)) { e.classList.remove(k); without = parse(getComputedStyle(e).color); e.classList.add(k); }
    const parent = e.parentElement, ctl = e.closest('button, a');
    out.push({ sel: sel(e), in: parent ? sel(parent) : '', act: ctl ? ctl.getAttribute('data-act') || '' : '', text: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 70),
      fg: fg[3] < 1 ? over(fg, bg) : fg, bg, without, fz: parseFloat(cs.fontSize), fw: +cs.fontWeight, h: Math.round(ctl ? ctl.getBoundingClientRect().height : e.getBoundingClientRect().height) });
  }
  return out;
}

(async () => {
  const b = await chromium.launch(); const all = [];
  for (const [look, F] of looks) {
    for (const [sn, w, h, sc] of sizes) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, timezoneId: 'Europe/Dublin' });
      await ctx.addInitScript(() => { const f = new Date('2026-10-18T09:30:00Z').getTime(); const D = Date; window.Date = class extends D { constructor(...a) { super(...(a.length ? a : [f])); } static now() { return f; } }; });
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      for (const [name, what, target, fn] of cases) {
        await p.goto('file://' + path.resolve(F)); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.brand');
        if (sc !== 1) await p.addStyleTag({ content: `html{font-size:${sc * 100}% !important}` });
        await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
        try { await p.evaluate(setup); await p.waitForTimeout(150); await fn(p); await p.waitForTimeout(250); await p.waitForSelector('#app ' + target, { timeout: 3000 }); }
        catch (e) { console.log(`FAIL  ${look} ${sn} ${name}: ${e.message.split('\n')[0]}`); process.exitCode = 1; continue; }
        const team = await p.evaluate(() => { const cs = getComputedStyle(document.documentElement); return ['--team-a', '--team-b', '--red', '--green', '--sub'].map(k => cs.getPropertyValue(k).trim()); });
        const rows = await p.evaluate(measure);
        rows.forEach(r => all.push(Object.assign({ look, size: sn, screen: name, target, team }, r)));
        await p.evaluate(s => { const e = document.querySelector('#app ' + s); const app = document.getElementById('app'); const r = e.getBoundingClientRect(); app.scrollTop += r.top - app.clientHeight / 2; }, target);
        await p.waitForTimeout(100);
        await p.screenshot({ path: path.join(OUT, `${name}-${look}-${sn}.png`) });
      }
      if (errs.length) { console.log(`FAIL  ${look} ${sn}: page errors ${errs.join(' | ')}`); process.exitCode = 1; }
      await ctx.close();
    }
  }
  await b.close();

  const lines = [], say = s => { lines.push(s); console.log(s); };
  say('# Every .c-a / .c-b / .banner.warn / .err element on the audited screens (WCAG 2 contrast, sRGB relative luminance)');
  say('# "without class" = the colour the element would get if its .c-a/.c-b class were removed (same as shown => the class has no visible effect)');
  say('look | screen | sizes | element | inside | data-act | text | font | control height | colour | behind | ratio | without class | tokens team-a team-b red green sub');
  const seen = new Map();
  for (const r of all) {
    const k = [r.look, r.screen, r.sel, r.text, toHex(r.fg), toHex(r.bg)].join('|');
    if (seen.has(k)) { const s = seen.get(k); s.sizes.push(r.size); s.hs.push(r.h); continue; }
    seen.set(k, Object.assign({ sizes: [r.size], hs: [r.h] }, r));
  }
  for (const r of seen.values()) {
    const wo = r.without ? toHex(r.without) + (toHex(r.without) === toHex(r.fg) ? ' (same: class has no effect)' : '') : '-';
    say(`${r.look} | ${r.screen} | ${r.sizes.join(' ')} | ${r.sel} | ${r.in} | ${r.act} | ${JSON.stringify(r.text)} | ${r.fz}px/${r.fw} | ${r.hs.join('/')}px | ${toHex(r.fg)} | ${toHex(r.bg)} | ${ratio(r.fg, r.bg).toFixed(2)}:1 | ${wo} | ${r.team.join(' ')}`);
  }
  fs.writeFileSync(path.join(OUT, 'measurements.txt'), lines.join('\n') + '\n');
})();
