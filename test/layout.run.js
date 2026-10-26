// Layout check: every golfer screen at small, normal and large-text phone sizes.
// Fails on text that overflows or is cut off, anything off the edge of the screen, and touch targets under 40px.
// Typography (issue #1, DECIDED; widened by the owner on 21 October): the display serif is allowed only on
// .hero.home .now-name, .rp-name, screen titles (h1.title except a person's name, h1.big) and the
// hole header words .entl small, .entr > b, .entr > b + span, title subtitles, the Home date line and section labels
// (and text inside them). Every screen checks the computed font of each allowed title and fails on serif
// anywhere else. The long fixture round title (owner's decision A, 20 October) must never be cut off or end in an
// ellipsis, in either look: at most 2 lines at 360px and 390px, at most 3 lines with 135% text. Titles keep growing with
// text size. There is one look since 21 October 2026, so the display serif is always expected on the allowed titles.
// Linux Chromium has no New York: this proves the font stack and the layout, not how New York looks on an iPhone.
// Run: python3 -m http.server 8765 -d dist & NODE_PATH=/opt/npm-tools/node_modules node test/layout.run.js
// Opt-in stricter audit: MIN_TARGET=44 node test/layout.run.js checks width and height against 44px, names controls
// by aria-label, text or data-act, and prints every small control as a TARGET line. Without it nothing changes.
const { chromium } = require('playwright');
const sizes = [['small 360', 360, 740, 1], ['normal 390', 390, 844, 1], ['large text 390', 390, 844, 1.35]];
const URL = process.env.LAYOUT_URL || 'http://localhost:8765/preview.html';
const STRICT = !!process.env.MIN_TARGET; const MIN = STRICT ? Number(process.env.MIN_TARGET) : 40;
if (STRICT && !(MIN > 0)) { console.log('MIN_TARGET must be a number of pixels, e.g. MIN_TARGET=44'); process.exit(2); }
const home = async p => { await p.evaluate(() => { const n = window.__ncgs; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); }); await p.waitForTimeout(150); };
// The fixture's long round title belongs to a finished round, which has no display title. Lend it, in memory only,
// to the rounds not yet finished so the Home round card and the round page show it. The checked-in fixture is unchanged.
// The whole title must show: no cut-off, no ellipsis, inside the screen, at most 2 lines (3 with 135% text), in both
// looks. Line count is printed as TITLE lines. See docs/TYPOGRAPHY.md.
const LONG = 'Cabopino, the long-named second day of the trip';
const longTitle = async (p, v) => { const ok = await p.evaluate(({ v, long }) => { const n = window.__ncgs;
  const r = n.D.round('fx-r2'); if (!r || r.name !== long || !n.D.round('fx-r3')) return false;
  n.D.rounds().filter(x => x.status !== 'final').forEach(x => { x.name = long; });
  n.UI.stack = v === 'home' ? [{ v: 'home', p: {} }] : [{ v: 'home', p: {} }, { v: 'round', p: { rid: 'fx-r3' } }]; n.render(); return true; }, { v, long: LONG });
  await p.waitForTimeout(150); if (!ok || !await p.$(v === 'home' ? '.hero.home .now-name' : '.rp-name')) throw new Error('long round title not shown'); };
const clickAny = async (p, sel) => { await p.click(sel, { timeout: 3000 }); await p.waitForTimeout(200); };
const scenarios = [
  ['home', async p => {}],
  ['who', async p => { await clickAny(p, '[data-act="who"]'); }],
  ['rounds', async p => { await clickAny(p, '[data-act="rounds"]'); }],
  ['round-past', async p => { await clickAny(p, '[data-act="rounds"]'); await clickAny(p, '[data-act="round"][data-rid]'); }],
  ['round-long-title', async p => { await longTitle(p, 'round'); }],
  ['home-long-title', async p => { await longTitle(p, 'home'); }],
  ['round-players', async p => { await clickAny(p, '.now [data-act="round"]'); }],
  ['round-groups', async p => { await clickAny(p, '.now [data-act="round"]'); await clickAny(p, '[data-act="rtab"][data-t="groups"]'); }],
  ['round-group-open', async p => { await clickAny(p, '.now [data-act="round"]'); await clickAny(p, '[data-act="rtab"][data-t="groups"]'); await clickAny(p, '.rg'); }],
  ['round-kb', async p => { await clickAny(p, '.now [data-act="round"]'); await clickAny(p, '[data-act="rtab"][data-t="kb"]'); }],
  ['round-weather', async p => { await clickAny(p, '.now [data-act="round"]'); await clickAny(p, '[data-act="rtab"][data-t="weather"]'); }],
  ['round-course', async p => { await clickAny(p, '.now [data-act="round"]'); await clickAny(p, '[data-act="rtab"][data-t="course"]'); }],
  ['goy', async p => { await clickAny(p, '[data-act="goy"]'); }],
  ['player', async p => { await clickAny(p, '[data-act="goy"]'); await clickAny(p, '[data-act="player"]'); }],
  ['players', async p => { await clickAny(p, '[data-act="players"]'); }],
  ['stats', async p => { await clickAny(p, '[data-act="stats"]'); }],
  ['trip', async p => { await clickAny(p, '[data-act="trip"]'); }],
  ['board-scores', async p => { await clickAny(p, '[data-act="tab"][data-tab="board"]').catch(async () => clickAny(p, '#tabs .tab:nth-child(3)')); }],
  ['board-bw', async p => { await clickAny(p, '#tabs .tab:nth-child(3)'); await clickAny(p, '[data-act="respill"][data-p="bw"]'); }],
  ['board-ct', async p => { await clickAny(p, '#tabs .tab:nth-child(3)'); await clickAny(p, '[data-act="respill"][data-p="ct"]'); }],
  ['board-st', async p => { await clickAny(p, '#tabs .tab:nth-child(3)'); await clickAny(p, '[data-act="respill"][data-p="st"]'); }],
  ['rules', async p => { await clickAny(p, '#tabs .tab:nth-child(4)'); }],
  ['hole-pick', async p => { await clickAny(p, '#tabs .tab:nth-child(2)'); }],
  ['hole-intro', async p => { await clickAny(p, '#tabs .tab:nth-child(2)'); await clickAny(p, '[data-act="pick"]'); await p.waitForTimeout(200); }],
  ['hole-tee', async p => { await clickAny(p, '#tabs .tab:nth-child(2)'); await clickAny(p, '[data-act="pick"]'); await clickAny(p, '[data-act="intro-go"]').catch(() => {}); }],
  ['entry', async p => { await clickAny(p, '#tabs .tab:nth-child(2)'); await clickAny(p, '[data-act="pick"]'); await clickAny(p, '[data-act="intro-go"]').catch(() => {}); }],
  ['entry-100', async p => { await clickAny(p, '#tabs .tab:nth-child(2)'); await clickAny(p, '[data-act="pick"]'); await clickAny(p, '[data-act="intro-go"]').catch(() => {}); 
     for (const pid of await p.$$eval('[data-act="set"][data-dir="up"]', e => e.map(x => x.dataset.pid))) { for (let i = 0; i < 6; i++) await p.click(`[data-act="set"][data-dir="up"][data-pid="${pid}"]`, { timeout: 2000 }).catch(() => {}); } await p.waitForTimeout(150); }],
  ['ask', async p => { await clickAny(p, '#tabs .tab:nth-child(2)'); await clickAny(p, '[data-act="pick"]'); await clickAny(p, '[data-act="intro-go"]').catch(() => {}); 
     for (const pid of await p.$$eval('[data-act="set"][data-dir="up"]', e => e.map(x => x.dataset.pid))) await p.click(`[data-act="set"][data-dir="up"][data-pid="${pid}"]`); await clickAny(p, '[data-act="save"]'); await p.waitForTimeout(300); await clickAny(p, '.askrow:nth-child(2)'); await p.waitForTimeout(150); }],
  ['after', async p => { await clickAny(p, '#tabs .tab:nth-child(2)'); await clickAny(p, '[data-act="pick"]'); await clickAny(p, '[data-act="intro-go"]').catch(() => {}); 
     for (const pid of await p.$$eval('[data-act="set"][data-dir="up"]', e => e.map(x => x.dataset.pid))) await p.click(`[data-act="set"][data-dir="up"][data-pid="${pid}"]`); await clickAny(p, '[data-act="save"]'); await p.waitForTimeout(300); await clickAny(p, '.askrow:nth-child(2)'); await clickAny(p, '[data-act="ask-confirm"]'); await p.waitForTimeout(300); }],
];
const metrics = ({ min, strict }) => {
  const app = document.getElementById('app'); const out = { hover: [], clip: [], wide: [], small: [], fonts: {} };
  const vw = window.innerWidth;
  if (app.scrollWidth > app.clientWidth + 1) out.hover.push(app.scrollWidth + '>' + app.clientWidth);
  const all = [...app.querySelectorAll('*')];
  for (const e of all) {
    const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(e);
    const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    const t = (e.textContent || '').trim().slice(0, 30);
    if (own) { const k = Math.round(parseFloat(cs.fontSize) * 10) / 10 + '/' + cs.fontWeight; out.fonts[k] = (out.fonts[k] || 0) + 1;
      if (e.scrollWidth > e.clientWidth + 1 && cs.display !== 'inline') out.clip.push(t + ' [' + e.className + '] ' + e.scrollWidth + '>' + e.clientWidth);
      if (cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth) out.clip.push('ELLIPSIS ' + t); }
    if ((r.right > vw + 1 || r.left < -1) && !e.closest('.sc-wrap')) out.wide.push(t + ' [' + e.className + '] ' + Math.round(r.left) + '..' + Math.round(r.right));
    if (!strict && (e.tagName === 'BUTTON' || e.dataset.act) && r.width > 4 && r.height < min && r.width > 0 && cs.display !== 'inline') out.small.push(t + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  }
  // Strict audit: every visible control on the page (tab bar included, inline links too), width and height.
  if (strict) for (const e of document.body.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,[role=button],[role=tab],[data-act]')) {
    const r = e.getBoundingClientRect(); if (r.width <= 4 || !r.height) continue;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || e.closest('[hidden]')) continue;
    if (r.height >= min && r.width >= min) continue;
    const label = (e.getAttribute('aria-label') || '').trim() || (e.textContent || '').trim() || e.getAttribute('title') || e.getAttribute('placeholder') || '[data-act=' + (e.dataset.act || e.tagName.toLowerCase()) + ']';
    out.small.push(label.replace(/\s+/g, ' ').slice(0, 40) + (cs.display === 'inline' ? ' (inline)' : '') + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  }
  return out;
};
// Fonts. Allowed display titles; anything inside them inherits on purpose. The Ruling "i" (official rule wording)
// button is a serif italic info glyph in the standard look since 135a8c9; it is reported, not hidden (see TYPE lines).
const DISPLAY = ['.hero.home .now-name', '.rp-name', 'h1.title:not(.is-name)', 'h1.big', '.entl small', '.entr > b', '.entr > b + span', 'header.hero:not(:has(.is-name)) > p.sub:not(.names)', '.greet', '.sec-label > .sub', '.ah-txt small', '.ah-txt b', '.ah-txt > span', '.sitlab'];
const GLYPH = ['.rbtn.rinfo'];
const fontsCheck = ({ display, glyph }) => {
  const fam = s => s.split(',').map(x => x.trim().replace(/^["']|["']$/g, '').toLowerCase());
  const SERIF = new Set(['serif', 'ui-serif', 'new york', 'iowan old style', 'georgia', 'times', 'times new roman', 'palatino', 'charter', 'baskerville']);
  const isSerif = s => fam(s).some(f => SERIF.has(f));
  // The look comes from the build's explicit mark. Cross-check it against the display font token, so a mark without
  // the editorial styles (or the styles without the mark) fails instead of checking the wrong rules.
  const editorial = true;   // one look since 21 October 2026 (Option 2): the display serif is always on
  const token = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim();
  const sans = getComputedStyle(document.body).fontFamily;
  const out = { editorial, bad: [], seen: [], glyph: [] };
  if (editorial !== (fam(token)[0] === 'ui-serif')) out.bad.push('look mark (' + (editorial ? 'editorial' : 'standard') + ') does not match --font-display: ' + token);
  if (isSerif(sans)) out.bad.push('page font is serif: ' + sans);
  const roots = [...document.querySelectorAll(display.join(','))];
  for (const r of roots) {
    const cs = getComputedStyle(r); const f = fam(cs.fontFamily)[0]; const label = r.className + ' "' + r.textContent.trim().slice(0, 24) + '"';
    out.seen.push(r.className + '=' + f);
    if (editorial ? f !== 'ui-serif' : cs.fontFamily !== sans) out.bad.push('title font ' + label + ': ' + cs.fontFamily);
    if (editorial && !/lining-nums/.test(cs.fontVariantNumeric)) out.bad.push('title numerals not lining ' + label + ': ' + cs.fontVariantNumeric);
    if (/oldstyle-nums/.test(cs.fontVariantNumeric)) out.bad.push('old-style numerals ' + label);
    for (const c of r.querySelectorAll('*')) if (getComputedStyle(c).fontFamily !== cs.fontFamily) out.bad.push('text inside ' + label + ' does not inherit: ' + getComputedStyle(c).fontFamily);
  }
  for (const e of document.body.querySelectorAll('*')) {
    if (roots.some(r => r.contains(e)) || ['STYLE', 'SCRIPT'].includes(e.tagName)) continue;
    const t = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
    if (!t) continue; const rc = e.getBoundingClientRect(); if (!rc.width || !rc.height) continue;
    const cs = getComputedStyle(e); if (!isSerif(cs.fontFamily)) continue;
    const item = '[' + (e.getAttribute('class') || e.tagName.toLowerCase()) + '] "' + t.slice(0, 24) + '" ' + cs.fontFamily;
    if (glyph.some(g => e.matches(g))) out.glyph.push(item); else out.bad.push('serif outside the allowed titles: ' + item);
  }
  return out;
};
// The whole long round title: at most max lines, nothing hidden, no ellipsis, inside the screen.
const titleCheck = ({ sel, want, max }) => {
  const e = document.querySelector(sel); if (!e) return { bad: ['no ' + sel] };
  const cs = getComputedStyle(e), bad = [];
  if (e.textContent.trim() !== want) bad.push('title text is "' + e.textContent.trim() + '"');
  const rg = document.createRange(); rg.selectNodeContents(e);
  const tops = new Set([...rg.getClientRects()].filter(r => r.width > 0).map(r => Math.round(r.top)));
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2, lines = Math.round(e.clientHeight / lh);
  if (tops.size > max || lines > max) bad.push('title takes ' + Math.max(tops.size, lines) + ' lines');
  if (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1) bad.push('title cut off ' + e.scrollWidth + 'x' + e.scrollHeight + ' in ' + e.clientWidth + 'x' + e.clientHeight);
  if (cs.textOverflow === 'ellipsis' || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none')) bad.push('title has ellipsis or line clamp');
  const r = e.getBoundingClientRect();
  for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
    if (getComputedStyle(a).overflow === 'visible') continue; const ar = a.getBoundingClientRect();
    if (r.left < ar.left - 1 || r.right > ar.right + 1 || r.top < ar.top - 1 || r.bottom > ar.bottom + 1) bad.push('title clipped by [' + a.className + ']');
  }
  if (r.left < 0 || r.right > window.innerWidth) bad.push('title off screen ' + Math.round(r.left) + '..' + Math.round(r.right));
  return { bad, lines: Math.max(tops.size, lines), font: cs.fontFamily.split(',')[0], size: cs.fontSize };
};
(async () => {
  const b = await chromium.launch(); let fails = 0;
  for (const [sn, w, h, scale] of sizes) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
    const p = await ctx.newPage();
    for (const [name, fn] of scenarios) {
      await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.brand');
      if (scale !== 1) await p.addStyleTag({ content: `html{font-size:${scale * 100}% !important}` });
      try { await fn(p); } catch (e) { fails++; console.log('FAIL  ' + sn + ' / ' + name + ' could not be opened: ' + e.message.split('\n')[0]); continue; }
      await p.waitForTimeout(150);
      const m = await p.evaluate(metrics, { min: MIN, strict: STRICT });
      if (STRICT) m.small.forEach(x => console.log('TARGET  ' + sn + ' | ' + name + ' | ' + x));
      const f = await p.evaluate(fontsCheck, { display: DISPLAY, glyph: GLYPH });
      f.glyph.forEach(x => console.log('TYPE  ' + sn + ' | ' + name + ' | info glyph (known, reported): ' + x));
      if (name === 'home' && !f.seen.some(x => /greet/.test(x))) f.bad.push('home greeting not found');
      if (name === 'round-long-title' && !f.seen.some(x => /rp-name/.test(x))) f.bad.push('round title not found');
      const bad = [...f.bad.map(x => 'type: ' + x), ...m.hover.map(x => 'page wider than screen ' + x), ...m.clip.filter(x => !/Pick up|\[vh\]/.test(x)).map(x => 'cut off: ' + x), ...m.wide.map(x => 'off screen: ' + x), ...m.small.filter(x => !/^\s*\d+x\d+$/.test(x)).map(x => 'small target: ' + x)];
      if (bad.length) { fails++; console.log('FAIL  ' + sn + ' / ' + name); bad.slice(0, 6).forEach(x => console.log('      ' + x)); }
      else console.log('PASS  ' + sn + ' / ' + name);
    }
    await ctx.close();
  }
  const titleSizes = [['small 360', 360, 740, 1, 2], ['small 360 large text', 360, 740, 1.35, 3], ['normal 390', 390, 844, 1, 2], ['large text 390', 390, 844, 1.35, 3]];
  for (const [sn, w, h, scale, max] of titleSizes) for (const [v, sel] of [['round', '.rp-name'], ['home', '.hero.home .now-name']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true }); const p = await ctx.newPage();
    await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.brand');
    if (scale !== 1) await p.addStyleTag({ content: `html{font-size:${scale * 100}% !important}` });
    const look = await p.evaluate(() => document.documentElement.dataset.design || 'standard');
    const t = await longTitle(p, v).then(() => p.evaluate(titleCheck, { sel, want: LONG, max }), e => ({ bad: [e.message] }));
    if (t.bad.length) { fails++; console.log('FAIL  ' + sn + ' / long round title ' + sel); t.bad.forEach(x => console.log('      ' + x)); }
    else console.log('PASS  ' + sn + ' / long round title ' + sel + ' shows in full');
    if (t.lines) console.log('TITLE  ' + look + ' look | ' + sn + ' | ' + sel + ' | ' + t.lines + ' lines (limit ' + max + ') | ' + t.font + ' ' + t.size);
    await ctx.close();
  }
  await b.close(); if (fails) { console.log('SOME FAILED'); process.exit(1); }
  // Keep the Home claim-state regression in the existing CI entry point. All layout assertions above
  // remain intact; a failure in this additional suite also fails the layout job.
  // The follow-on suites check the same preview address as the layout run.
  const subEnv = { ...process.env, NCGS_TEST_URL: process.env.NCGS_TEST_URL || process.env.LAYOUT_URL || 'http://localhost:8765/preview.html' };
  const home = require('child_process').spawnSync(process.execPath,
    [...process.execArgv, require('path').join(__dirname, 'home-states.run.js')], { stdio: 'inherit', env: subEnv });
  if (home.error) console.error(home.error);
  if (home.status !== 0) process.exit(home.status || 1);
  // Undated rounds and season context on player pages (owner decisions, 23 October).
  const season = require('child_process').spawnSync(process.execPath,
    [...process.execArgv, require('path').join(__dirname, 'season-context.run.js')], { stdio: 'inherit', env: subEnv });
  if (season.error) console.error(season.error);
  if (season.status !== 0) process.exit(season.status || 1);
  // The organiser's season switch (owner, 24 October).
  const sw = require('child_process').spawnSync(process.execPath,
    [...process.execArgv, require('path').join(__dirname, 'season-switch.run.js')], { stdio: 'inherit', env: subEnv });
  if (sw.error) console.error(sw.error);
  if (sw.status !== 0) process.exit(sw.status || 1);
  // The preview's test scenarios (owner, 24 October).
  const sc = require('child_process').spawnSync(process.execPath,
    [...process.execArgv, require('path').join(__dirname, 'scenarios.run.js')], { stdio: 'inherit', env: subEnv });
  if (sc.error) console.error(sc.error);
  if (sc.status !== 0) process.exit(sc.status || 1);
  // The Westport scramble (owner brief §6; Codex's invariants, 24 October).
  const scr = require('child_process').spawnSync(process.execPath,
    [...process.execArgv, require('path').join(__dirname, 'scramble.run.js')], { stdio: 'inherit', env: subEnv });
  if (scr.error) console.error(scr.error);
  if (scr.status !== 0) process.exit(scr.status || 1);
  // Contest claims in playing order, through Home (owner rule; Codex's counterexample, 24 October).
  const co = require('child_process').spawnSync(process.execPath,
    [...process.execArgv, require('path').join(__dirname, 'contest-order.run.js')], { stdio: 'inherit', env: subEnv });
  if (co.error) console.error(co.error);
  if (co.status !== 0) process.exit(co.status || 1);
  // The breakfast draw (owner brief §7; Codex's review, 26 October): members' pots, the stage, short pots, every size.
  const dr = require('child_process').spawnSync(process.execPath,
    [...process.execArgv, require('path').join(__dirname, 'draw.run.js')], { stdio: 'inherit', env: subEnv });
  if (dr.error) console.error(dr.error);
  if (dr.status !== 0) process.exit(dr.status || 1);
  // One Groups screen for every round (owner, 26 October): move, swap, add, replace, take out, order, withdraw.
  const gr = require('child_process').spawnSync(process.execPath,
    [...process.execArgv, require('path').join(__dirname, 'groups.run.js')], { stdio: 'inherit', env: subEnv });
  if (gr.error) console.error(gr.error);
  if (gr.status !== 0) process.exit(gr.status || 1);
  // Home tells you your day: your tee time and group, and today's result once it's final (plan batch B, 26 October).
  const hd = require('child_process').spawnSync(process.execPath,
    [...process.execArgv, require('path').join(__dirname, 'home-day.run.js')], { stdio: 'inherit', env: subEnv });
  if (hd.error) console.error(hd.error);
  if (hd.status !== 0) process.exit(hd.status || 1);
})();
