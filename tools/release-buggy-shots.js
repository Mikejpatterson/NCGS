// Buggy Wars screenshots, measurements and parity for the release evidence (docs/RELEASE-BUGGY.md). Fixture builds only.
// node tools/release-buggy-shots.js <preview.html> <std|ed> <outdir> [--cvd]
// node tools/release-buggy-shots.js --compare <a-parity.json> <b-parity.json>
// States (invented fixture data; the preview's demo round is live at hole 15, the fixture's past rounds are final):
//   live-open      Results > Buggy Wars, demo round, Group 1: the back nine being played, open (navy leads 1 up)
//   live-decided   the same, Front nine opened and Back nine closed: a decided nine ("Won 2 up") with its holes
//   live-halved    the same, Group 2: a halved front nine (grey pill) beside a navy-led back nine
//   final-decided  a finished round's Buggy Wars (fx-r2, Group 3): every nine decided, crimson wins the front nine and
//                  the overall, navy the back nine; Front nine opened. Reached with the real Leaderboard action of
//                  that round (a trip day's row), tapped through a button added for the test, then real taps
//   results        the finished round's page (fx-r2), scrolled to its Buggy Wars results: "Buggy 1/2" pills and scores
//   nobug-results  no buggies: the demo round's groups lent, in memory only, as one team of four each (a draw with no
//                  buggy pairs; the fixture has none). Results tab: no Buggy Wars pill
//   nobug-hole     the same draw, Hole tab: the score entry with no team-coloured buggy cards
// Sizes 360x740, 390x844, and 390x844 with root text at 135%. Per screenshot it prints:
//   pills     each Buggy Wars result pill: its words, colour class (a navy/blue, b crimson/red, n grey) and the
//             screen-reader label. Fails if a pill's words name the leader (a name, initials, "Buggy" or "&"), or if a
//             led pill's screen-reader label does not name the pair ("Won 3&2", the closed-match score, is not a name). This checks the owner's colour-only decision is
//             kept, not broadened or reversed
//   order     Buggy 1 initials badges before Buggy 2, and in the hole board Buggy 1's row above Buggy 2's
//   contrast  every team-coloured text or shape, via tools/team-colour-audit.js (WCAG 2 ratio, text 4.5:1)
//   cut       text wider than its own box, ellipsis, anything off the side of the screen
//   44px      any button or tappable row under 44px high (as test/layout.run.js)
// and writes <outdir>/<tag>-parity.json: every control (data-act, its data, labels, pressed/expanded/selected,
// disabled) and every word on each screen, for --compare between two builds (before/after, standard/editorial).
// With --cvd it also writes each screen as original | simulated deuteranopia | simulated protanopia (Machado et al.
// 2009, severity 1.0). Simulations are not a real-phone or sunlight test. Linux Chromium is not an iPhone.
// Exits 1 on any failed check, or (with --compare) if controls or words differ.
const path = require('path'), fs = require('fs');
const argv = process.argv.slice(2);
if (argv[0] === '--compare') {
  const [a, b] = argv.slice(1).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
  let diff = 0;
  for (const k of Object.keys(a)) {
    if (!b[k]) { console.log(`MISSING ${k}`); diff++; continue; }
    const c = JSON.stringify(a[k].controls) === JSON.stringify(b[k].controls), t = a[k].text === b[k].text;
    if (!c || !t) diff++;
    console.log(`${c && t ? 'same' : 'DIFF'}  ${k}  controls ${c ? 'same' : 'differ'} (${a[k].controls.length}/${b[k].controls.length}), words ${t ? 'same' : 'differ'}`);
  }
  for (const k of Object.keys(b)) if (!a[k]) { console.log(`MISSING ${k}`); diff++; }
  console.log(diff ? `${diff} screen(s) differ` : `all ${Object.keys(a).length} screens: same controls and same words`);
  process.exit(diff ? 1 : 0);
}
const { chromium } = require('playwright');
const { measure, triptych, ratio, toHex } = require('./team-colour-audit.js');
const [F, TAG, OUT] = argv.filter(a => !a.startsWith('--'));
const CVD = argv.includes('--cvd');
if (!F || !TAG || !OUT) { console.log('usage: node tools/release-buggy-shots.js <preview.html> <std|ed> <outdir> [--cvd]'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const sizes = [['360', 360, 740, 1], ['390', 390, 844, 1], ['390-135', 390, 844, 1.35]];
const click = async (p, sel) => { await p.click(sel, { timeout: 3000 }); await p.waitForTimeout(150); };
const toBW = async p => { await click(p, '#tabs .tab:nth-child(3)'); await click(p, '[data-act="respill"][data-p="bw"]'); };
const seg = (p, s) => click(p, `[data-act="bwseg"][data-key$="-${s}"]`);
// Every group of the demo round as one team of four: no buggy pairs. In memory only, never saved.
const noBuggies = p => p.evaluate(() => { const n = window.__ncgs; const r = n.DB.server.tables.rounds.find(x => x.status === 'live');
  r.groups.forEach(g => { g.teams = [g.teams.flat()]; }); n.DB._view = null; n.DB._memo = {}; n.render(); });
const states = [
  ['live-open', toBW, '.bw-card'],
  ['live-decided', async p => { await toBW(p); await seg(p, 'front'); await seg(p, 'back'); }, '.bw-card'],
  ['live-halved', async p => { await toBW(p); await click(p, '[data-act="mgroup"]:nth-child(2)'); }, '.bw-card'],
  ['final-decided', async p => {
    await click(p, '#tabs .tab:nth-child(3)');
    await p.evaluate(() => { const b = document.createElement('button'); b.dataset.act = 'leaderboard'; b.dataset.rid = 'fx-r2'; b.id = 'test-lb'; b.textContent = 'test'; document.getElementById('app').prepend(b); });
    await click(p, '#test-lb'); await click(p, '[data-act="respill"][data-p="bw"]');
    await click(p, '[data-act="mgroup"]:nth-child(3)'); await seg(p, 'front');
  }, '.bw-card'],
  ['results', async p => { await click(p, '[data-act="rounds"]'); await click(p, '[data-act="round"][data-rid="fx-r2"]'); }, 'BUGGY'],
  ['nobug-results', async p => { await noBuggies(p); await click(p, '#tabs .tab:nth-child(3)'); }, null],
  ['nobug-hole', async p => { await noBuggies(p); await click(p, '#tabs .tab:nth-child(2)'); await click(p, '[data-act="pick"]').catch(() => {}); await click(p, '[data-act="intro-go"]').catch(() => {}); if (await p.$('[data-act="enter"]')) await click(p, '[data-act="enter"]'); }, null],
];

// In the page: Buggy Wars pills, order, cut/44px, and the parity signature.
const inspect = () => {
  const app = document.getElementById('app'), vw = window.innerWidth, out = { pills: [], order: [], bad: [], small: [] };
  const members = (window.__ncgs.DB.server.tables.members || []).map(m => m.name).filter(Boolean);
  for (const e of app.querySelectorAll('.bw-res')) {
    const txt = e.textContent.trim(), aria = e.getAttribute('aria-label') || '', cls = e.className.replace('bw-res', '').trim();
    out.pills.push({ txt, cls, aria });
    if (/Buggy| & |\b[A-Z]{2}\b/.test(txt) || members.some(n => txt.includes(n))) out.bad.push(`pill names the leader: "${txt}"`);
    if (!/^(Not started|Halved|Won \d+ up|Won \d+&\d+|(AS|\d+ up), \d+ to play)$/.test(txt)) out.bad.push(`pill words not as before: "${txt}"`);
    if (cls === 'n' ? aria !== txt : !(aria.endsWith(' ' + txt) && aria.includes(' & '))) out.bad.push(`pill screen-reader label "${aria}" for "${txt}"`);
  }
  const pairs = [...app.querySelectorAll('.bw-vs .bw-pair')];
  if (pairs.length) {
    const side = pairs.map(x => [...x.querySelectorAll('.bw-bd')].map(b => (b.classList.contains('a') ? 'a' : b.classList.contains('b') ? 'b' : '?') + ':' + b.textContent.trim() + '(' + b.getAttribute('aria-label') + ')'));
    out.order.push('badges ' + side.map(s => s.join(' ')).join(' v '));
    if (!side[0].every(s => s.startsWith('a:')) || !side[1].every(s => s.startsWith('b:'))) out.bad.push('Buggy 1 badges not first');
  }
  // Each column is: hole number, Buggy 1's cell, Buggy 2's cell (the totals column: "Holes", Buggy 1, Buggy 2).
  for (const col of app.querySelectorAll('.bw-board .bw-col')) {
    const [, x, y] = col.children;
    if (col.classList.contains('bw-tot') ? !(x.classList.contains('a') && y.classList.contains('b')) : (x.classList.contains('wb') || y.classList.contains('wa'))) out.bad.push('board row order');
  }
  const boards = app.querySelectorAll('.bw-board').length;
  if (boards) out.order.push(`${boards} hole board(s): Buggy 1 row above Buggy 2 in every column`);
  const sp = [...app.querySelectorAll('.pill.a, .pill.b')].filter(e => !e.classList.contains('soft')).map(e => e.textContent.trim());
  if (sp.length) out.order.push('result pills ' + [...new Set(sp)].join(', '));
  for (const e of app.querySelectorAll('*')) {
    const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(e), t = (e.textContent || '').trim().slice(0, 30);
    if ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) {
      if (e.scrollWidth > e.clientWidth + 1 && cs.display !== 'inline') out.bad.push(`cut: "${t}" ${e.scrollWidth}>${e.clientWidth}`);
      if (cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth) out.bad.push(`ellipsis: "${t}"`);
    }
    if ((r.right > vw + 1 || r.left < -1) && !e.closest('.sc-wrap')) out.bad.push(`off screen: "${t}" ${Math.round(r.left)}..${Math.round(r.right)}`);
    if ((e.tagName === 'BUTTON' || e.dataset.act) && r.width > 4 && r.height < 44 && cs.display !== 'inline') out.small.push(`"${t}" ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  if (app.scrollWidth > app.clientWidth + 1) out.bad.push(`page wider than screen ${app.scrollWidth}>${app.clientWidth}`);
  const controls = [...document.querySelectorAll('#app [data-act], #tabs [data-act], #tabs button')].map(e => {
    const d = Object.assign({}, e.dataset); return [e.tagName, d, e.getAttribute('aria-label'), e.getAttribute('aria-pressed'), e.getAttribute('aria-expanded'), e.getAttribute('aria-selected'), e.disabled || null];
  });
  const labels = [...app.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label'));
  return Object.assign(out, { controls, labels, text: app.innerText.replace(/\s+/g, ' ').trim() });
};

(async () => {
  const b = await chromium.launch(); const parity = {}; let fails = 0;
  for (const [sn, w, h, sc] of sizes) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, timezoneId: 'Europe/Dublin' });
    await ctx.addInitScript(() => { const f = new Date('2026-10-18T09:30:00Z').getTime(); const D = Date; window.Date = class extends D { constructor(...a) { super(...(a.length ? a : [f])); } static now() { return f; } }; });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    for (const [name, fn, target] of states) {
      const id = `${name}-${TAG}-${sn}`;
      await p.goto('file://' + path.resolve(F)); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.brand');
      if (sc !== 1) await p.addStyleTag({ content: `html{font-size:${sc * 100}% !important}` });
      await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
      try { await fn(p); } catch (e) { console.log(`FAIL  ${id}: ${e.message.split('\n')[0]}`); fails++; continue; }
      await p.waitForTimeout(250);
      const team = await p.evaluate(() => { const cs = getComputedStyle(document.documentElement); const h = s => { s = cs.getPropertyValue(s).trim(); return [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); }; return { a: h('--team-a'), b: h('--team-b') }; });
      const r = await p.evaluate(inspect);
      const { rows } = await p.evaluate(measure, team);
      const bad = r.bad.slice();
      if (errs.length) bad.push('page error: ' + errs.splice(0).join('; '));
      if (r.small.length) bad.push('under 44px: ' + r.small.join(', '));
      const text = rows.filter(x => x.kind === 'text').map(x => ({ x, cr: ratio(x.fg.slice(0, 3), x.bg.slice(0, 3)) }));
      const shapes = rows.filter(x => x.kind !== 'text').map(x => ({ x, cr: ratio(x.fg.slice(0, 3), x.bg.slice(0, 3)) }));
      text.filter(t => t.cr < 4.5).forEach(t => bad.push(`text contrast ${t.x.sel} "${t.x.text}" ${t.cr.toFixed(2)}:1`));
      if (name.startsWith('nobug') && rows.length) bad.push(`team colour on a no-buggies screen: ${[...new Set(rows.map(x => x.sel))].join(' ')}`);
      if (name === 'nobug-results' && /Buggy Wars/.test(r.text)) bad.push('Buggy Wars shown with no buggies');
      if (name.startsWith('live') || name === 'final-decided') { if (!r.pills.length) bad.push('no result pills'); }
      parity[`${name}-${sn}`] = { controls: r.controls, labels: r.labels, text: r.text };
      // Screenshot: the first screen, or scrolled so the Buggy Wars part sits clear of the tab bar.
      const box = await p.evaluate(t => { const app = document.getElementById('app'); let e = t === 'BUGGY' ? [...app.querySelectorAll('.sec')].find(s => /^Buggy Wars/.test(s.innerText)) : t ? app.querySelector(t) : null; if (!e) return null; const r = e.getBoundingClientRect(); return [r.top + app.scrollTop, r.bottom + app.scrollTop]; }, target);
      if (target && !box) bad.push('target not on page: ' + target);
      if (box && box[1] + 100 > h) await p.evaluate(y => { document.getElementById('app').scrollTop = y; }, Math.max(0, box[0] - 24));
      await p.waitForTimeout(100);
      const png = await p.screenshot();
      fs.writeFileSync(path.join(OUT, `${id}.png`), png);
      if (CVD) await triptych(p, png, path.join(OUT, `${id}-cvd.png`), `${name} · ${TAG === 'ed' ? 'editorial' : 'standard'} look · ${sn}`);
      const minT = text.length ? Math.min(...text.map(t => t.cr)) : null, minS = shapes.length ? Math.min(...shapes.map(t => t.cr)) : null;
      console.log(`${bad.length ? 'FAIL' : 'ok  '}  ${id}`);
      r.pills.forEach(x => console.log(`      pill ${x.cls} "${x.txt}"  label "${x.aria}"`));
      r.order.forEach(x => console.log(`      ${x}`));
      const pairs = [...new Map(text.map(t => [`${t.x.sel} ${toHex(t.x.fg.slice(0, 3))} on ${toHex(t.x.bg.slice(0, 3))}`, t.cr])).entries()];
      pairs.forEach(([k, v]) => console.log(`      text ${k} ${v.toFixed(2)}:1`));
      console.log(`      contrast: ${text.length} team text item(s)${minT ? `, lowest ${minT.toFixed(2)}:1` : ''}; ${shapes.length} team shape(s)${minS ? `, lowest ${minS.toFixed(2)}:1` : ''}; 44px: ${r.small.length ? r.small.length + ' under' : 'all buttons 44px or more'}`);
      bad.forEach(x => console.log(`      ! ${x}`));
      if (bad.length) fails++;
    }
    await ctx.close();
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, `${TAG}-parity.json`), JSON.stringify(parity, null, 1) + '\n');
  console.log(fails ? `${fails} screen(s) failed` : `ALL PASSED (${states.length * sizes.length} screens)`);
  process.exitCode = fails ? 1 : 0;
})();
