// Long player names (evidence for docs/LONG-NAMES.md). Fixture builds only.
// node tools/long-names-shots.js <preview.html> <std|ed> [outdir] [normal]
// Lends invented long names (in memory only; the checked-in fixture keeps its names) to every member, opens each golfer
// screen at 360px, 390px and 390px with 135% text, and checks inside cards and controls, not only the page width:
//   cut off   text wider or taller than its own box, or outside a box that hides overflow; any ellipsis or line clamp
//   overlap   a name, word, icon or initials badge running into another one, or into a control it does not belong to
//   score     on score entry, each name sits in the same row as its own -, + and Pick up controls
//   reach     Pick up, the save button and the tab bar can be tapped (nothing on top of them)
// Prints one PASS/FAIL line per screen and size and exits 1 on any failure. With an outdir it saves a screenshot of
// every screen. Add "normal" to run with the fixture's own short names instead (same checks).
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const [F, TAG, OUT, MODE] = process.argv.slice(2);
if (!F || !TAG) { console.log('usage: node tools/long-names-shots.js <preview.html> <std|ed> [outdir] [normal]'); process.exit(2); }
if (OUT) fs.mkdirSync(OUT, { recursive: true });
const NORMAL = MODE === 'normal';
const sizes = [['360', 360, 740, 1], ['390', 390, 844, 1], ['390-135', 390, 844, 1.35]];
// Invented; deliberately long single words and long double-barrelled surnames.
const LONG = ['Bartholomew Featherstonehaugh', 'Maximilian Montgomery-Smythe', 'Christopher Fitzwilliam-Harrington',
  'Fionnuala Ní Mhaonaigh', 'Alexander Cholmondeley', 'Seraphina Wolstenholme', 'Bartholomew Featherstonehaugh-Jones',
  'Konstantinos Papadopoulos', 'Gwendolyn Postlethwaite', 'Theodore Worthington-Brown', 'Evangeline Braithwaite',
  'Sebastian Marjoribanks', 'Ultan Featherstonehaugh'];
const lend = (names) => { const n = window.__ncgs; const ms = n.DB.server.tables.members.slice().sort((a, b) => a.id.localeCompare(b.id));
  ms.forEach((m, i) => { m.name = names[i % names.length]; m.full = names[i % names.length]; }); n.DB._view = null; n.DB._memo = {}; n.render(); };
const click = async (p, sel) => { await p.click(sel, { timeout: 3000 }); await p.waitForTimeout(200); };
const tab = i => `#tabs .tab:nth-child(${i})`;
const toEntry = async p => { await click(p, tab(2)); await click(p, '[data-act="pick"]'); await click(p, '[data-act="intro-go"]').catch(() => {}); if (await p.$('[data-act="enter"]')) await click(p, '[data-act="enter"]'); };
const upAll = async (p, n) => { for (const pid of await p.$$eval('[data-act="set"][data-dir="up"]', e => [...new Set(e.map(x => x.dataset.pid))])) for (let i = 0; i < n; i++) await p.click(`[data-act="set"][data-dir="up"][data-pid="${pid}"]`, { timeout: 2000 }).catch(() => {}); };
const saved = async p => { await upAll(p, 1); await click(p, '[data-act="save"]'); await p.waitForTimeout(300); };
const scenarios = [
  ['home', async p => {}],
  ['who', async p => { await click(p, '[data-act="who"]'); }],
  ['round-past', async p => { await click(p, '[data-act="rounds"]'); await click(p, '[data-act="round"][data-rid]'); }],
  ['round-players', async p => { await click(p, '.now [data-act="round"]'); }],
  ['round-groups', async p => { await click(p, '.now [data-act="round"]'); await click(p, '[data-act="rtab"][data-t="groups"]'); }],
  ['round-group-open', async p => { await click(p, '.now [data-act="round"]'); await click(p, '[data-act="rtab"][data-t="groups"]'); await click(p, '.rg'); }],
  ['round-kb', async p => { await click(p, '.now [data-act="round"]'); await click(p, '[data-act="rtab"][data-t="kb"]'); }],
  ['goy', async p => { await click(p, '[data-act="goy"]'); }],
  ['player', async p => { await click(p, '[data-act="goy"]'); await click(p, '[data-act="player"]'); }],
  ['players', async p => { await click(p, '[data-act="players"]'); }],
  ['stats', async p => { await click(p, '[data-act="stats"]'); }],
  ['trip', async p => { await click(p, '[data-act="trip"]'); }],
  ['board-scores', async p => { await click(p, tab(3)); }],
  ['board-bw', async p => { await click(p, tab(3)); await click(p, '[data-act="respill"][data-p="bw"]'); }],
  ['board-ct', async p => { await click(p, tab(3)); await click(p, '[data-act="respill"][data-p="ct"]'); }],
  ['board-st', async p => { await click(p, tab(3)); await click(p, '[data-act="respill"][data-p="st"]'); }],
  ['hole-pick', async p => { await click(p, tab(2)); }],
  ['hole-intro', async p => { await click(p, tab(2)); await click(p, '[data-act="pick"]'); }],
  ['entry', async p => { await toEntry(p); }],
  ['entry-100', async p => { await toEntry(p); await upAll(p, 6); }],
  ['ask', async p => { await toEntry(p); await saved(p); await click(p, '.askrow:nth-child(2)'); }],
  ['after', async p => { await toEntry(p); await saved(p); if (await p.$('.askrow')) { await click(p, '.askrow:nth-child(2)'); await click(p, '[data-act="ask-confirm"]').catch(() => {}); } await p.waitForTimeout(200); }],
];
const audit = () => {
  const out = { clip: [], overlap: [], score: [], reach: [] };
  const shown = e => { for (let a = e; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden' || a.hidden || +cs.opacity === 0) return false; } return true; };
  const hiddenText = e => e.closest('.vh,[aria-hidden="true"]:not(.av):not(svg)') && getComputedStyle(e.closest('.vh,[aria-hidden="true"]:not(.av):not(svg)')).position === 'absolute';
  const fixedOf = e => { for (let a = e; a && a !== document.body; a = a.parentElement) if (['fixed', 'sticky'].includes(getComputedStyle(a).position)) return a; return null; };
  const label = e => '[' + ((e.getAttribute && e.getAttribute('class')) || e.tagName.toLowerCase()) + '] "' + (e.textContent || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 28) + '"';
  const rectsOf = e => { const rs = []; for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(n); rs.push(...[...rg.getClientRects()].filter(r => r.width > 0.5 && r.height > 0.5)); } return rs; };
  const items = [];
  for (const e of document.body.querySelectorAll('*')) {
    if (['STYLE', 'SCRIPT', 'TITLE'].includes(e.tagName) || e.closest('svg') && e.tagName !== 'svg') continue;
    if (!shown(e) || hiddenText(e)) continue;
    const own = rectsOf(e);
    if (own.length) {
      const cs = getComputedStyle(e), fz = parseFloat(cs.fontSize);
      // For overlaps, the glyphs rather than the line box: trim the empty space above capitals and below descenders.
      items.push({ e, rs: own.map(r => ({ left: r.left, right: r.right, top: r.top + 0.22 * fz, bottom: r.bottom - 0.12 * fz })), kind: 'text' });
      if (cs.display !== 'inline' && (e.scrollWidth > e.clientWidth + 1 || (cs.overflowY !== 'visible' && e.scrollHeight > e.clientHeight + 1))) out.clip.push(label(e) + ' ' + e.scrollWidth + 'x' + e.scrollHeight + ' in ' + e.clientWidth + 'x' + e.clientHeight);
      if (cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth) out.clip.push('ellipsis ' + label(e));
      if (cs.webkitLineClamp && cs.webkitLineClamp !== 'none') out.clip.push('line clamp ' + label(e));
      // Text pushed outside an ancestor that hides overflow (card, pill, row).
      for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
        const acs = getComputedStyle(a), cx = /hidden|clip/.test(acs.overflowX), cy = /hidden|clip/.test(acs.overflowY);
        if (/auto|scroll/.test(acs.overflowX)) break; if (!cx && !cy) continue;
        const ar = a.getBoundingClientRect();
        if (own.some(r => (cx && (r.left < ar.left - 1 || r.right > ar.right + 1)) || (cy && (r.top < ar.top - 1 || r.bottom > ar.bottom + 1)))) { out.clip.push(label(e) + ' hidden by ' + label(a)); break; }
      }
    } else if (e.tagName === 'svg' || e.classList.contains('av')) { const r = e.getBoundingClientRect(); if (r.width > 1 && r.height > 1) items.push({ e, rs: [r], kind: e.tagName === 'svg' ? 'icon' : 'badge' }); }
  }
  const ctrls = [...document.body.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,[role=button],[data-act]')].filter(shown).map(e => ({ e, rs: [e.getBoundingClientRect()] }));
  const hit = (a, b) => a.some(r => b.some(s => Math.min(r.right, s.right) - Math.max(r.left, s.left) > 1 && Math.min(r.bottom, s.bottom) - Math.max(r.top, s.top) > 1));
  const related = (a, b) => a === b || a.contains(b) || b.contains(a) || (a.closest('.stack') && a.closest('.stack') === b.closest('.stack'));
  for (let i = 0; i < items.length; i++) {
    const A = items[i], fa = fixedOf(A.e);
    for (let j = i + 1; j < items.length; j++) { const B = items[j]; if (related(A.e, B.e) || fa !== fixedOf(B.e)) continue; if (hit(A.rs, B.rs)) out.overlap.push(label(A.e) + ' runs into ' + label(B.e)); }
    for (const C of ctrls) { if (related(A.e, C.e) || fa !== fixedOf(C.e)) continue; if (C.rs[0].width < 2) continue; if (hit(A.rs, C.rs)) out.overlap.push(label(A.e) + ' runs into control ' + label(C.e)); }
  }
  // Score entry: the - / + / Pick up for a player sit in the same row as that player's name.
  const sets = [...document.querySelectorAll('[data-act="set"][data-pid]')];
  const pids = [...new Set(sets.map(e => e.dataset.pid))];
  for (const pid of pids) {
    const name = (window.__ncgs.D.member(pid) || {}).name; const ctl = sets.filter(e => e.dataset.pid === pid);
    let row = ctl[0]; while (row && !ctl.every(c => row.contains(c)) || (row && !(row.textContent || '').includes(name))) row = row.parentElement;
    if (!row || row === document.body) { out.score.push('no row holds ' + name + ' and its controls'); continue; }
    const others = pids.filter(q => q !== pid && row.querySelector(`[data-act="set"][data-pid="${q}"]`)); if (others.length) out.score.push(name + ' shares a row with other players\' controls');
  }
  // Reachable: the centre of each key control is the control itself, nothing on top.
  // Not while a sheet (the hole intro) deliberately covers the screen.
  const key = [...document.querySelectorAll('.scrim')].some(shown) ? [] : [...document.querySelectorAll('[data-act="set"][data-v="P"],[data-act="save"],#tabs .tab')].filter(shown);
  for (const k of key) { k.scrollIntoView({ block: 'center' }); const r = k.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (!t || !(k === t || k.contains(t))) out.reach.push(label(k) + ' covered by ' + (t ? label(t) : 'nothing')); if (r.width < 44 || r.height < 44) out.reach.push(label(k) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
  window.scrollTo(0, 0);
  return out;
};
(async () => {
  const b = await chromium.launch(); let fails = 0;
  for (const [sn, w, h, sc] of sizes) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, timezoneId: 'Europe/Dublin' });
    await ctx.addInitScript(() => { const f = new Date('2026-10-18T09:30:00Z').getTime(); const D = Date; window.Date = class extends D { constructor(...a) { super(...(a.length ? a : [f])); } static now() { return f; } }; });
    const p = await ctx.newPage();
    for (const [name, fn] of scenarios) {
      await p.goto('file://' + path.resolve(F)); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.brand');
      if (sc !== 1) await p.addStyleTag({ content: `html{font-size:${sc * 100}% !important}` });
      await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
      if (!NORMAL) await p.evaluate(lend, LONG);
      try { await fn(p); } catch (e) { fails++; console.log(`FAIL  ${TAG} ${sn} / ${name} could not be opened: ${e.message.split('\n')[0]}`); continue; }
      await p.waitForTimeout(250);
      const m = await p.evaluate(audit);
      if (OUT) await p.screenshot({ path: path.join(OUT, `${name}-${TAG}-${sn}.png`), fullPage: true });
      const bad = [...m.clip.map(x => 'cut off: ' + x), ...m.overlap.map(x => 'overlap: ' + x), ...m.score.map(x => 'score: ' + x), ...m.reach.map(x => 'reach: ' + x)];
      if (bad.length) { fails++; console.log(`FAIL  ${TAG} ${sn} / ${name}`); [...new Set(bad)].slice(0, 12).forEach(x => console.log('      ' + x)); }
      else console.log(`PASS  ${TAG} ${sn} / ${name}`);
    }
    await ctx.close();
  }
  await b.close(); console.log(fails ? `${fails} FAILED (${NORMAL ? 'normal' : 'long'} names)` : `ALL PASSED (${NORMAL ? 'normal' : 'long'} names)`); process.exit(fails ? 1 : 0);
})();
