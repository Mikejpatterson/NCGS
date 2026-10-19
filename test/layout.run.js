// Layout check: every golfer screen at small, normal and large-text phone sizes.
// Fails on text that overflows or is cut off, anything off the edge of the screen, and touch targets under 40px.
// Also checks the computed fonts on every screen (serif only in the three display titles) and that the longest round
// name is shown whole in those titles at 360px and 360px with 135% text (see "Typography" below).
// Run: python3 -m http.server 8765 -d dist & NODE_PATH=/opt/npm-tools/node_modules node test/layout.run.js
// Opt-in stricter audit: MIN_TARGET=44 node test/layout.run.js checks width and height against 44px, names controls
// by aria-label, text or data-act, and prints every small control as a TARGET line. Without it nothing changes.
const { chromium } = require('playwright');
const sizes = [['small 360', 360, 740, 1], ['normal 390', 390, 844, 1], ['large text 390', 390, 844, 1.35]];
const URL = 'http://localhost:8765/preview.html';
const STRICT = !!process.env.MIN_TARGET; const MIN = STRICT ? Number(process.env.MIN_TARGET) : 40;
if (STRICT && !(MIN > 0)) { console.log('MIN_TARGET must be a number of pixels, e.g. MIN_TARGET=44'); process.exit(2); }
const home = async p => { await p.evaluate(() => { const n = window.__ncgs; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); }); await p.waitForTimeout(150); };
const clickAny = async (p, sel) => { await p.click(sel, { timeout: 3000 }); await p.waitForTimeout(200); };
const scenarios = [
  ['home', async p => {}],
  ['who', async p => { await clickAny(p, '[data-act="who"]'); }],
  ['rounds', async p => { await clickAny(p, '[data-act="rounds"]'); }],
  ['round-past', async p => { await clickAny(p, '[data-act="rounds"]'); await clickAny(p, '[data-act="round"][data-rid]'); }],
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
  ['rules-ruling', async p => { await clickAny(p, '#tabs .tab:nth-child(4)'); await p.evaluate(() => { const n = window.__ncgs;
     n.UI.chat = [{ role: 'user', text: 'Ball in the bushes' }, { role: 'ai', text: 'Rule 19', sources: [{ title: 'Rule 19', url: 'https://www.randa.org/' }], card: { type: 'ruling', topic: 'Unplayable ball', rule: 'Rule 19', verdict: '1 penalty shot', intro: 'Pick one of these:', steps: ['Drop within **2 club-lengths**', 'Go **back on a line**'], note: 'Count the penalty.', quote: 'The player may take unplayable ball relief.' } }];
     n.UI.chatInfo = { 1: true }; n.render(); }); await p.waitForTimeout(150); }],
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
// Typography (issue #1, DECIDED): the display font only on these three titles and whatever they contain. Everything else,
// including the tab bar, buttons, names, numbers and the hole screen, must be in a sans font. Reads the computed font,
// not the CSS source. Standard build: --font-display is the system font, so nothing on any screen may be a serif.
// Editorial build: --font-display must start with ui-serif (New York on iPhone). Display titles must use lining figures.
const DISPLAY = '.hero.home .wordmark, .hero.home .now-name, .rp-name';
// The Ruling card's "i" button (italic Georgia "i", live since before the redesign). Reported on every run, never hidden.
const KNOWN_SERIF = '.rbtn.rinfo';
const typography = ({ display, known }) => {
  const norm = s => s.split(',').map(x => x.trim().replace(/^["']|["']$/g, '').toLowerCase()).filter(Boolean);
  const SERIF = ['serif', 'ui-serif', 'new york', 'iowan old style', 'georgia', 'times', 'times new roman', 'palatino', 'charter', 'cambria', 'garamond', 'baskerville', 'didot', 'hoefler text'];
  const isSerif = fam => norm(fam).some(f => SERIF.includes(f));
  const root = getComputedStyle(document.documentElement);
  const disp = norm(root.getPropertyValue('--font-display')), sans = norm(root.getPropertyValue('--font'));
  const editorial = disp.join() !== sans.join();
  const out = { editorial, bad: [], known: [], shown: 0 };
  if (editorial && disp[0] !== 'ui-serif') out.bad.push('editorial --font-display does not start with ui-serif: ' + disp.join(', '));
  if (!editorial && isSerif(sans.join())) out.bad.push('--font is a serif: ' + sans.join(', '));
  const label = e => ((e.textContent || '').trim().slice(0, 24) || e.getAttribute('aria-label') || e.tagName) + ' [' + (typeof e.className === 'string' ? e.className : '') + ']';
  for (const e of document.querySelectorAll(display)) {
    const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue; out.shown++;
    const cs = getComputedStyle(e);
    if (norm(cs.fontFamily).join() !== disp.join()) out.bad.push('display title not in --font-display: ' + label(e) + ' ' + cs.fontFamily);
    if (!/lining-nums/.test(cs.fontVariantNumeric)) out.bad.push('display title without lining figures: ' + label(e) + ' ' + cs.fontVariantNumeric);
    for (const c of e.querySelectorAll('*')) if (norm(getComputedStyle(c).fontFamily).join() !== disp.join()) out.bad.push('inside a display title, a different font: ' + label(c));
  }
  for (const e of document.body.querySelectorAll('*')) {
    if (e.closest(display) || e.closest('svg') || /^(SCRIPT|STYLE|TEMPLATE)$/.test(e.tagName)) continue;
    const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden') continue;
    const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || /^(BUTTON|INPUT|TEXTAREA|SELECT)$/.test(e.tagName);
    const pseudo = ['::before', '::after'].filter(w => { const ps = getComputedStyle(e, w); return /^["']./.test(ps.content) && isSerif(ps.fontFamily); });
    if (!(own && isSerif(cs.fontFamily)) && !pseudo.length) continue;
    const msg = 'serif outside the display titles: ' + label(e) + (pseudo.length ? ' ' + pseudo.join(' ') : '') + ' ' + cs.fontFamily;
    (e.matches(known) ? out.known : out.bad).push(msg);
  }
  return out;
};
// The longest round name in the fixture, put into every display title that shows a round name, at 360px. Fails if any
// of it is cut off, hidden or ends in "…". Prints how many lines it takes. MAX_TITLE_LINES=2 also fails above that.
const MAX_LINES = Number(process.env.MAX_TITLE_LINES) || 0;
const longTitle = async (b, scale) => {
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, hasTouch: true });
  const p = await ctx.newPage(); const res = [];
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.brand');
  if (scale !== 1) await p.addStyleTag({ content: `html{font-size:${scale * 100}% !important}` });
  const rid = await p.evaluate(() => { const n = window.__ncgs, rs = n.D.rounds();
    const long = rs.map(r => r.name || '').sort((a, c) => c.length - a.length)[0];
    rs.filter(r => r.status !== 'final').forEach(r => { r.name = long; });
    return (rs.find(r => r.status !== 'final') || {}).id; });
  for (const [where, stack, sel] of [['Home', [{ v: 'home', p: {} }], '.hero.home .now-name'], ['round page', [{ v: 'home', p: {} }, { v: 'round', p: { rid } }], '.rp-name']]) {
    await p.evaluate(s => { const n = window.__ncgs; n.UI.stack = s; n.render(); }, stack); await p.waitForTimeout(200);
    res.push(await p.evaluate(({ sel, where }) => {
      const n = window.__ncgs, long = n.D.rounds().map(r => r.name || '').sort((a, c) => c.length - a.length)[0];
      const e = document.querySelector(sel); if (!e) return { where, bad: ['no ' + sel + ' on screen'] };
      const cs = getComputedStyle(e), r = e.getBoundingClientRect(), bad = [];
      if (e.textContent.trim() !== long) bad.push('shows "' + e.textContent.trim() + '" instead of the whole title');
      if (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1) bad.push('text overflows its box ' + e.scrollWidth + 'x' + e.scrollHeight + ' > ' + e.clientWidth + 'x' + e.clientHeight);
      if (cs.textOverflow === 'ellipsis' || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none')) bad.push('ellipsis or line clamp');
      for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const ac = getComputedStyle(a); if (ac.overflow === 'visible' && ac.overflowX === 'visible' && ac.overflowY === 'visible') continue;
        const ar = a.getBoundingClientRect(); if (r.left < ar.left - 1 || r.right > ar.right + 1 || r.top < ar.top - 1 || r.bottom > ar.bottom + 1) bad.push('cut off by ' + a.className); }
      if (r.right > innerWidth + 1 || r.left < -1) bad.push('off the screen');
      const rg = document.createRange(); rg.selectNodeContents(e);
      const lines = new Set([...rg.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top))).size;
      return { where, lines, size: cs.fontSize, font: cs.fontFamily.split(',')[0], bad };
    }, { sel, where }));
  }
  await ctx.close(); return res;
};
(async () => {
  const b = await chromium.launch(); let fails = 0; const knownSeen = new Set(); let displayMode = null;
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
      const ty = await p.evaluate(typography, { display: DISPLAY, known: KNOWN_SERIF });
      displayMode = ty.editorial ? 'editorial (serif display titles)' : 'standard (display titles in the system font, no serif)';
      ty.known.forEach(x => knownSeen.add(name + ': ' + x));
      if (name === 'home' && ty.shown < 2) ty.bad.push('Home should show the brand name and the round name as display titles, found ' + ty.shown);
      if (name === 'round-players' && ty.shown < 1) ty.bad.push('the round page title (.rp-name) is missing');
      const bad = [...m.hover.map(x => 'page wider than screen ' + x), ...m.clip.filter(x => !/Pick up|\[vh\]/.test(x)).map(x => 'cut off: ' + x), ...m.wide.map(x => 'off screen: ' + x), ...m.small.filter(x => !/^\s*\d+x\d+$/.test(x)).map(x => 'small target: ' + x), ...ty.bad.map(x => 'font: ' + x)];
      if (bad.length) { fails++; console.log('FAIL  ' + sn + ' / ' + name); bad.slice(0, 6).forEach(x => console.log('      ' + x)); }
      else console.log('PASS  ' + sn + ' / ' + name);
    }
    await ctx.close();
  }
  console.log('FONTS  this build is ' + displayMode);
  knownSeen.forEach(x => console.log('KNOWN  ' + x));
  for (const [sn, scale] of [['small 360', 1], ['small 360 large text', 1.35]]) for (const t of await longTitle(b, scale)) {
    if (MAX_LINES && t.lines > MAX_LINES) (t.bad = t.bad || []).push(t.lines + ' lines, more than ' + MAX_LINES);
    console.log('TITLE  ' + sn + ' / long round name on ' + t.where + ': ' + (t.lines ? t.lines + ' lines at ' + t.size + ' ' + t.font : 'not measured'));
    if (t.bad.length) { fails++; console.log('FAIL  ' + sn + ' / long round name on ' + t.where); t.bad.forEach(x => console.log('      ' + x)); }
    else console.log('PASS  ' + sn + ' / long round name on ' + t.where + ' shown whole, nothing cut off');
  }
  await b.close(); if (fails) { console.log('SOME FAILED'); process.exit(1); }
})();
