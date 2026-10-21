// Score-entry screenshots and measurements for the release evidence (docs/RELEASE-HOLE.md). Fixture builds only.
// node tools/release-hole-shots.js <preview.html> <std|ed> <outdir>
// Opens the preview's demo round on the Hole tab (first group, hole as the preview opens it) and shows each state:
//   empty     nothing entered yet
//   partial   two of the four players entered (par, and par + 1); Save says how many are still to go
//   complete  all four entered (par); Save says "Save hole N"
//   pickup    all four entered, then Pick up on the second player (shows the pick-up strokes and "Scratch")
//   two       a width test: two-digit strokes (10, 11, 12, 13) put straight into this phone's unsaved draft
//   three     a width test: three-digit strokes (100, 104, 108, 111), the same way. The + button stops at the
//             pick-up, so taps never reach these on the demo hole (a par 3); a score typed elsewhere (the organiser's
//             sheet) has no upper limit and would show here when the hole is corrected. This only checks the room.
// Each state is taken with the fixture's normal names and again with invented long names lent to the group's four
// players (in memory only). Everything is driven by taps on the real buttons except the long names and the
// three-digit draft. Nothing is saved: the Save button is measured, never pressed.
// Per screenshot it prints one line per player row (one line or own line for the name, row height, where the name
// ends and the first control beside it starts) and the checks:
//   overlap   a name's letters or arrow running into its own Pick up, -, score or +
//   cut       text wider or taller than its own box, ellipsis, line clamp, or text off the screen
//   44px      any button under 44px (visible width or height)
//   save      the Save pill: label, size, whether it is on the first screen above the tab bar, and whether a tap at its
//             centre lands on it once the screen is scrolled to the end (nothing on top of it)
//   figures   whether the score numbers use tabular figures
// Exits 1 if any overlap, cut, 44px or save failure is found.
// Linux Chromium has no San Francisco: this shows layout and computed styles, not iPhone typography.
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const [F, TAG, OUT] = process.argv.slice(2);
if (!F || !TAG || !OUT) { console.log('usage: node tools/release-hole-shots.js <preview.html> <std|ed> <outdir>'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const sizes = [['360', 360, 740, 1], ['390', 390, 844, 1], ['390-135', 390, 844, 1.35]];
const STATES = ['empty', 'partial', 'complete', 'pickup', 'two', 'three'];
// Invented, the same long names as docs/LONG-NAMES.md.
const LONG = ['Bartholomew Featherstonehaugh', 'Maximilian Montgomery-Smythe', 'Christopher Fitzwilliam-Harrington', 'Fionnuala Ní Mhaonaigh'];
const click = async (p, sel) => { await p.click(sel, { timeout: 3000 }); await p.waitForTimeout(150); };
const settle = p => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 150)))));
const toEntry = async p => { await click(p, '#tabs .tab:nth-child(2)'); await click(p, '[data-act="pick"]').catch(() => {}); await click(p, '[data-act="intro-go"]').catch(() => {}); if (await p.$('[data-act="enter"]')) await click(p, '[data-act="enter"]'); };
const pidsOf = p => p.$$eval('.entry [data-act="set"][data-dir="up"]', e => [...new Set(e.map(x => x.dataset.pid))]);
const up = (p, pid) => click(p, `.entry [data-act="set"][data-dir="up"][data-pid="${pid}"]`);
const lend = (p, names) => p.evaluate(names => { const n = window.__ncgs; const pids = [...new Set([...document.querySelectorAll('.entry [data-act="set"][data-pid]')].map(e => e.dataset.pid))];
  pids.forEach((pid, i) => { const m = n.DB.server.tables.members.find(x => x.id === pid); m.name = m.full = names[i % names.length]; }); n.DB._view = null; n.DB._memo = {}; n.render(); }, names);
// Three-digit strokes in this phone's unsaved draft for the hole on screen (the draft is where taps go before Save).
const digits = (p, vals) => p.evaluate(vals => { const n = window.__ncgs; const pids = [...new Set([...document.querySelectorAll('.entry [data-act="set"][data-pid]')].map(e => e.dataset.pid))];
  const drafts = n.DB.prefs.drafts;
  for (const rid of Object.keys(drafts)) for (const g of Object.keys(drafts[rid])) { const d = drafts[rid][g][n.UI.hole]; if (d) pids.forEach((pid, i) => { d[pid] = vals[i % vals.length]; }); }
  n.render(); }, vals);
const states = {
  empty: async () => {},
  partial: async (p, pids) => { await up(p, pids[0]); await up(p, pids[1]); await up(p, pids[1]); },
  complete: async (p, pids) => { for (const pid of pids) await up(p, pid); },
  pickup: async (p, pids) => { for (const pid of pids) await up(p, pid); await click(p, `.entry .pu[data-pid="${pids[1]}"]`); },
  two: async (p, pids) => { await up(p, pids[0]); await digits(p, [10, 11, 12, 13]); },
  three: async (p, pids) => { await up(p, pids[0]); await digits(p, [100, 104, 108, 111]); },
};
const measure = () => {
  const vw = window.innerWidth, vh = window.innerHeight, out = { rows: [], bad: [] };
  const glyphs = e => { const g = []; const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); while (w.nextNode()) { const r = document.createRange(); r.selectNodeContents(w.currentNode); g.push(...[...r.getClientRects()].filter(x => x.width > .5)); } e.querySelectorAll('svg path').forEach(s => g.push(s.getBoundingClientRect())); return g; };
  const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
  for (const t of document.querySelectorAll('.entry .bugs .ptile')) {
    const nm = t.querySelector('.nm'), g = glyphs(nm.querySelector('.nmrow') || nm), nb = nm.getBoundingClientRect();
    const ctl = [...t.querySelectorAll('.pu, .st, .stv')].filter(c => c.getBoundingClientRect().width > 1);
    const ctlName = c => c.classList.contains('pu') ? 'Pick up' : c.classList.contains('stv') ? 'score' : c.dataset.dir === 'up' ? '+' : '-';
    for (const c of ctl) if (g.some(x => hit(x, c.getBoundingClientRect()))) out.bad.push(`overlap: ${nm.textContent.trim()} runs into ${ctlName(c)}`);
    // The score's digits (and points) against the - and + buttons beside it, glyph height only (line box trimmed).
    const sv = t.querySelector('.stv b');
    let room = null;
    if (sv) { const fz = parseFloat(getComputedStyle(sv).fontSize), dg = glyphs(sv).map(r => ({ left: r.left, right: r.right, top: r.top + 0.22 * fz, bottom: r.bottom - 0.12 * fz }));
      for (const c of t.querySelectorAll('.st')) { const cr = c.getBoundingClientRect(); const gap = c.dataset.dir === 'up' ? cr.left - Math.max(...dg.map(r => r.right)) : Math.min(...dg.map(r => r.left)) - cr.right;
        room = room === null ? gap : Math.min(room, gap);
        if (dg.some(x => hit(x, cr))) out.bad.push(`overlap: score ${sv.firstChild.textContent} (with its points) runs into ${ctlName(c)} by ${Math.round(-gap)}px`); } }
    const beside = ctl.map(c => c.getBoundingClientRect()).filter(r => r.left > nb.left && r.top < nb.bottom && r.bottom > nb.top);
    const v = t.querySelector('.stv'), vb = v && v.querySelector('b');
    out.rows.push({ name: nm.querySelector('.nmrow span').textContent.trim(), long: t.classList.contains('long'), h: Math.round(t.getBoundingClientRect().height),
      end: g.length ? Math.round(Math.max(...g.map(x => x.right))) : 0, next: beside.length ? Math.round(Math.min(...beside.map(r => r.left))) : null,
      score: !v ? '' : vb ? `${vb.firstChild.textContent} (${vb.querySelector('sup').textContent} pts) ${(v.querySelector('small') || {}).textContent || ''}`.trim() : v.textContent.trim(), pu: t.querySelector('.pu.on') ? 'on' : 'off',
      tab: vb ? getComputedStyle(vb).fontVariantNumeric : '', room: room === null ? null : Math.round(room) });
  }
  for (const e of document.body.querySelectorAll('*')) {
    if (['STYLE', 'SCRIPT', 'TITLE'].includes(e.tagName) || e.closest('svg') || e.closest('.vh,[aria-hidden="true"]')) continue;
    const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden') continue;
    const name = '.' + String(e.getAttribute('class') || e.tagName.toLowerCase()).split(' ')[0];
    const own = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
    if (own && cs.display !== 'inline' && (e.scrollWidth > e.clientWidth + 1 || (cs.overflowY !== 'visible' && e.scrollHeight > e.clientHeight + 1))) out.bad.push(`cut ${name} "${own.slice(0, 24)}" ${e.scrollWidth}x${e.scrollHeight} in ${e.clientWidth}x${e.clientHeight}`);
    if (own && cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth) out.bad.push('ellipsis ' + name);
    if (own && cs.webkitLineClamp && cs.webkitLineClamp !== 'none') out.bad.push('line clamp ' + name);
    if (own && (r.left < -1 || r.right > vw + 1)) out.bad.push(`off screen ${name} "${own.slice(0, 24)}"`);
    if (e.matches('button, a, [data-act]') && !e.disabled && (r.width < 44 || r.height < 44) && !e.closest('#tabs')) out.bad.push(`under 44px ${name} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  const s = document.querySelector('.entry [data-act="save"]'), sr = s.getBoundingClientRect(), tabs = document.querySelector('#tabs');
  const tt = tabs && !tabs.hidden ? tabs.getBoundingClientRect().top : vh;
  out.save = { label: s.textContent.trim(), w: Math.round(sr.width), h: Math.round(sr.height), radius: getComputedStyle(s).borderRadius, first: sr.bottom <= tt && sr.top >= 0, bottom: Math.round(sr.bottom), tabTop: Math.round(tt) };
  const tb = tabs && !tabs.hidden ? [...tabs.querySelectorAll('button,a')].filter(e => e.getBoundingClientRect().width) : [];
  out.tabs = tb.length ? `${tb.length} tabs [${tb.map(e => e.textContent.trim()).join(', ')}], smallest ${Math.round(Math.min(...tb.map(e => e.getBoundingClientRect().height)))}px` : 'hidden';
  out.root = getComputedStyle(document.documentElement).fontSize;
  return out;
};
// Scroll #app (the screen scrolls inside it, not the page) to the end and tap-test the Save pill's centre.
const reach = p => p.evaluate(() => { const a = document.getElementById('app'); const d = a.scrollHeight - a.clientHeight; a.scrollTop = d;
  const s = document.querySelector('.entry [data-act="save"]'), r = s.getBoundingClientRect(), tabs = document.querySelector('#tabs');
  const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  const tt = tabs && !tabs.hidden ? tabs.getBoundingClientRect().top : window.innerHeight;
  return { scroll: d, hit: !!at && (at === s || s.contains(at)), clear: r.bottom <= tt, gap: Math.round(tt - r.bottom) }; });
(async () => {
  const b = await chromium.launch(); let fails = 0;
  for (const names of ['normal', 'long']) for (const state of STATES) for (const [sn, w, h, sc] of sizes) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, timezoneId: 'Europe/Dublin' });
    await ctx.addInitScript(() => { const f = new Date('2026-10-18T09:30:00Z').getTime(); const D = Date; window.Date = class extends D { constructor(...a) { super(...(a.length ? a : [f])); } static now() { return f; } }; });
    const p = await ctx.newPage();
    await p.goto('file://' + path.resolve(F)); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.brand');
    if (sc !== 1) await p.addStyleTag({ content: `html{font-size:${sc * 100}% !important}` });
    await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
    await toEntry(p);
    if (names === 'long') await lend(p, LONG);
    await states[state](p, await pidsOf(p)); await settle(p);
    const id = `${state}-${names}-${TAG}-${sn}`, m = await p.evaluate(measure);
    await p.screenshot({ path: path.join(OUT, id + '.png') });
    const r = await reach(p); await settle(p);
    if (r.scroll > 0) await p.screenshot({ path: path.join(OUT, id + '-end.png') });
    if (!r.hit || !r.clear) m.bad.push(`save not reachable (tap lands on it: ${r.hit}, above tab bar: ${r.clear})`);
    // Normal names (up to 7 letters: Aidan, Bartley, Cathal) must keep the compact row. "Donnacha" is the recorded
    // borderline case: at 390px it gets its own line by design (docs/LONG-NAMES.md), so it is reported, not failed.
    if (names === 'normal') for (const row of m.rows) if (row.long && row.name.length <= 7) m.bad.push(`normal name ${row.name} not compact`);
    if (m.bad.length) fails++;
    console.log(`${m.bad.length ? 'FAIL' : 'PASS'}  ${id}  root ${m.root}  tabs ${m.tabs}`);
    for (const row of m.rows) console.log(`      ${row.name.padEnd(34)} ${row.long ? (names === 'normal' && row.name.length > 7 ? 'own line (borderline, by design)' : 'own line') : 'one line'} row ${String(row.h).padStart(3)}px  name ends ${String(row.end).padStart(3)}px, ${row.next === null ? 'no control beside it' : `next control at ${row.next}px`}  score "${row.score}" pick-up ${row.pu}${row.tab ? '  figures ' + row.tab : ''}${row.room === null ? '' : `, ${row.room}px to the nearer of - and +`}`);
    console.log(`      save "${m.save.label}" ${m.save.w}x${m.save.h} radius ${m.save.radius}, ${m.save.first ? 'on first screen' : `below first screen (ends ${m.save.bottom}px, tab bar at ${m.save.tabTop}px)`}; scrolled to end (${r.scroll}px): tap lands on it ${r.hit ? 'yes' : 'NO'}, ${r.gap}px above tab bar`);
    for (const x of m.bad) console.log('      <- ' + x);
    await ctx.close();
  }
  await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
