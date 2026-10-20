// Text size changed while score entry is open (evidence for docs/NAME-RESIZE.md). Fixture builds only.
// node tools/name-resize-check.js <preview.html> <std|ed> [outdir]
// Opens one group's score entry with invented normal, borderline and long names (in memory only), then, on the same
// open screen and without any tap, changes the text size (100% -> 135%, and back 135% -> 100%) and measures every
// row three times: as drawn, straight after the text size change, and after the next tap (+ on the first player).
// A row fails if its name or arrow runs into its own Pick up, -, score or +, if the name is cut off, or if the row is
// wider than its card. It also counts the window "resize" events the change produced, because fitNames() in
// src/app/30-play.js only re-measures rows on a redraw or a resize. Prints PASS/FAIL per state, exits 1 on any FAIL.
// This is Chromium with a CSS text-size change, not an iPhone: see docs/NAME-RESIZE.md for what that does not prove.
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const [F, TAG, OUT] = process.argv.slice(2);
if (!F || !TAG) { console.log('usage: node tools/name-resize-check.js <preview.html> <std|ed> [outdir]'); process.exit(2); }
if (OUT) fs.mkdirSync(OUT, { recursive: true });
// Invented. Normal: the fixture's own kind of name. Borderline: fits beside Pick up at 100% text in at least one
// width, but not at 135%. Long: never fits on one line.
const NAMES = [['normal', 'Aidan'], ['borderline', 'Donnacha'], ['borderline', 'Fiachra Óg'], ['long', 'Bartholomew Featherstonehaugh']];
const widths = [[360, 740], [390, 844]];
const runs = [['up', 1, 1.35], ['down', 1.35, 1]];
const click = async (p, sel) => { await p.click(sel, { timeout: 3000 }); await p.waitForTimeout(200); };
const toEntry = async p => { await click(p, '#tabs .tab:nth-child(2)'); await click(p, '[data-act="pick"]'); await click(p, '[data-act="intro-go"]').catch(() => {}); if (await p.$('[data-act="enter"]')) await click(p, '[data-act="enter"]'); };
const setSize = (p, sc) => p.evaluate(sc => { let s = document.getElementById('nrc-size'); if (!s) { s = document.createElement('style'); s.id = 'nrc-size'; document.head.appendChild(s); } s.textContent = sc === 1 ? '' : `html{font-size:${sc * 100}% !important}`; }, sc);
const settle = p => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 150)))));
// Lend the names to the players in the open group, by row order, and draw the screen once (as opening it would).
const lend = (p, names) => p.evaluate(names => { const n = window.__ncgs; const pids = [...new Set([...document.querySelectorAll('.entry [data-act="set"][data-pid]')].map(e => e.dataset.pid))];
  pids.forEach((pid, i) => { const m = n.DB.server.tables.members.find(x => x.id === pid); m.name = m.full = names[i % names.length]; }); n.DB._view = null; n.DB._memo = {}; n.render(); }, names);
const measure = p => p.evaluate(() => {
  const r1 = r => ({ l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) });
  const glyphs = e => { const out = []; const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); while (w.nextNode()) { const g = document.createRange(); g.selectNodeContents(w.currentNode); out.push(...[...g.getClientRects()].filter(r => r.width > .5)); } e.querySelectorAll('svg path').forEach(s => out.push(s.getBoundingClientRect())); return out; };
  const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
  return [...document.querySelectorAll('.entry .bugs .ptile')].map(t => {
    const nm = t.querySelector('.nm');
    const ctl = [...t.querySelectorAll('.pu, .st, .stv')].filter(c => c.getBoundingClientRect().width > 1);
    const g = glyphs(nm), bad = [];
    for (const c of ctl) { const cr = c.getBoundingClientRect(); if (g.some(x => hit(x, cr))) bad.push('name runs into ' + (c.classList.contains('pu') ? 'Pick up' : c.classList.contains('stv') ? 'score' : c.dataset.dir === 'up' ? '+' : '-')); }
    // Visible letters and arrow only: the arrow's 16px icon box has empty margin that may poke 2px past the name button.
    const tr = t.getBoundingClientRect(), out = g.filter(x => x.left < tr.left - 1 || x.right > tr.right + 1);
    if (out.length) bad.push(`name outside its row (ends ${Math.round(Math.max(...out.map(x => x.right)))}px, row ends ${Math.round(tr.right)}px)`);
    if (t.scrollWidth > t.clientWidth + 1) bad.push(`row wider than card (${t.scrollWidth}px in ${t.clientWidth}px)`);
    // The first control on the name's own line (what fitNames() checks the name against).
    const nb = nm.getBoundingClientRect();
    const beside = ctl.map(c => c.getBoundingClientRect()).filter(r => r.left > nb.left && r.top < nb.bottom && r.bottom > nb.top);
    const small = ctl.filter(c => { const r = c.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).map(c => c.className.split(' ')[0]);
    if (small.length) bad.push('control under 44px: ' + small.join(', '));
    const end = g.length ? Math.round(Math.max(...g.map(x => x.right))) : 0;
    return { name: (nm.textContent || '').trim(), long: t.classList.contains('long'), h: Math.round(t.getBoundingClientRect().height), nameEnd: end, next: beside.length ? Math.round(Math.min(...beside.map(r => r.left))) : null, bad };
  });
});
(async () => {
  const b = await chromium.launch(); let fails = 0;
  for (const [w, h] of widths) for (const [dir, from, to] of runs) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, timezoneId: 'Europe/Dublin' });
    await ctx.addInitScript(() => { const f = new Date('2026-10-18T09:30:00Z').getTime(); const D = Date; window.Date = class extends D { constructor(...a) { super(...(a.length ? a : [f])); } static now() { return f; } }; });
    const p = await ctx.newPage();
    await p.goto('file://' + path.resolve(F)); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.brand');
    await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
    await setSize(p, from); await toEntry(p); await lend(p, NAMES.map(x => x[1])); await settle(p);
    await p.evaluate(() => { window.__nrcResize = 0; window.addEventListener('resize', () => window.__nrcResize++); });
    const id = `${TAG}-${w}-${dir}`, pct = s => Math.round(s * 100) + '%';
    const states = [], snap = n => OUT && p.screenshot({ path: path.join(OUT, `${id}-${n}.png`), fullPage: true });
    states.push([`drawn at ${pct(from)}`, await measure(p), 'a-drawn']); await snap('a-drawn');
    await setSize(p, to); await settle(p); await p.waitForTimeout(500);
    const resizes = await p.evaluate(() => window.__nrcResize);
    states.push([`${pct(from)} -> ${pct(to)}, before any tap`, await measure(p), 'b-changed']); await snap('b-changed');
    // The next tap: + on the first player (any tap redraws the screen, and a redraw re-measures the rows).
    await p.click('.entry [data-act="set"][data-dir="up"]', { timeout: 3000 }); await settle(p);
    states.push([`${pct(to)}, after the next tap`, await measure(p), 'c-tapped']); await snap('c-tapped');
    for (const [label, m, file] of states) {
      const bad = m.flatMap(r => r.bad.map(x => `${r.name}: ${x}`));
      if (bad.length) fails++;
      console.log(`${bad.length ? 'FAIL' : 'PASS'}  ${id}  ${label}${file === 'b-changed' ? `  (resize events: ${resizes})` : ''}`);
      for (const r of m) console.log(`      ${r.name.padEnd(30)} ${r.long ? 'long ' : 'one-line'} row ${String(r.h).padStart(3)}px  name ends at ${String(r.nameEnd).padStart(3)}px, ${r.next === null ? 'no control beside it' : `first control beside it starts at ${r.next}px`}${r.bad.length ? '  <- ' + r.bad.join('; ') : ''}`);
    }
    await ctx.close();
  }
  await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
