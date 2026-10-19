// Layout check: every golfer screen at small, normal and large-text phone sizes.
// Fails on text that overflows or is cut off, anything off the edge of the screen, and touch targets under 40px.
// Run: python3 -m http.server 8765 -d dist & NODE_PATH=/opt/npm-tools/node_modules node test/layout.run.js
// Opt-in stricter audit: MIN_TARGET=44 node test/layout.run.js checks width and height against 44px, names controls
// by aria-label, text or data-act, and prints every small control as a TARGET line. Without it nothing changes.
// Type check (both looks, every screen): the display font is used only on .hero.home .wordmark, .hero.home .now-name and
// .rp-name (and what they contain), from the computed font-family of every piece of visible text, not from the CSS source.
// In the editorial look those three must be the --font-display serif stack with lining numerals; everywhere else no serif
// family may appear. In the standard look the three stay in the system font. The editorial file must only set :root tokens.
// Linux Chromium has no New York: this proves the configured font stack and the layout, not how New York looks on an iPhone.
// Long title: the fixture's longest round name is put (in memory only) on the Home round and round page at 360px and 360px
// with 135% text; it must not be cut off or end in "...". Its line count is printed; MAX_TITLE_LINES=2 makes more a failure.
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
  ['rules-answer', async p => { await clickAny(p, '#tabs .tab:nth-child(4)'); await p.evaluate(() => { const n = window.__ncgs;
     n.UI.chat = [{ role: 'user', text: 'My ball is in a penalty area. What can I do?' }, { role: 'ai', text: 'Rule 17 gives you options.', sources: [{ title: 'Rule 17', url: 'https://www.randa.org/' }],
       card: { type: 'ruling', topic: 'Penalty area', rule: 'Rule 17.1d', verdict: 'Play it as it lies, or take relief for **one stroke**.', intro: 'Your options:', steps: ['Stroke and distance.', 'Back-on-the-line relief.'], note: 'Red stakes also allow lateral relief.', quote: 'If a ball is in a penalty area, the player may take relief for one penalty stroke.' } }];
     n.render(); }); await clickAny(p, '[data-act="ask-info"]'); }],
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
const DISPLAY = '.hero.home .wordmark, .hero.home .now-name, .rp-name';
// Computed font-family of every visible piece of text (and ::before/::after text), checked against the serif rule.
const typeCheck = ({ display, editorial }) => {
  const SERIF = ['serif', 'ui-serif', 'new york', 'iowan old style', 'georgia', 'times', 'times new roman', 'palatino', 'palatino linotype', 'baskerville', 'garamond', 'charter', 'didot', 'hoefler text', 'cambria', 'book antiqua'];
  const fams = ff => ff.split(',').map(x => x.trim().replace(/^["']|["']$/g, '').toLowerCase()).filter(Boolean);
  const norm = ff => fams(ff).join(',');
  const serif = ff => fams(ff).some(f => SERIF.includes(f));
  const token = norm(getComputedStyle(document.documentElement).getPropertyValue('--font-display'));
  const sans = norm(getComputedStyle(document.body).fontFamily);
  const out = { bad: [], display: [] };
  const label = e => (e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '')) + ' "' + (e.getAttribute('aria-label') || e.textContent || e.value || e.placeholder || '').trim().replace(/\s+/g, ' ').slice(0, 30) + '"';
  for (const e of document.body.querySelectorAll('*')) {
    if (e.closest('script,style,svg,[hidden]')) continue;
    const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName);
    const shown = [cs].concat(['::before', '::after'].map(ps => getComputedStyle(e, ps)).filter(s => /^["'].*\S.*["']$/.test(s.content)));
    const allowed = !!e.closest(display);
    if (e.matches(display)) out.display.push({ sel: e.matches('.wordmark') ? 'wordmark' : e.matches('.now-name') ? 'now-name' : 'rp-name', ff: cs.fontFamily, nums: cs.fontVariantNumeric, text: e.textContent.trim().slice(0, 40) });
    if (!own && shown.length === 1) continue;
    for (const s of (own ? shown : shown.slice(1))) {
      if (allowed) {
        if (editorial && (norm(s.fontFamily) !== token || fams(s.fontFamily)[0] !== 'ui-serif')) out.bad.push('display title not in the --font-display serif: ' + label(e) + ' ' + s.fontFamily);
        if (!editorial && norm(s.fontFamily) !== sans) out.bad.push('display title not in the system font (standard look): ' + label(e) + ' ' + s.fontFamily);
        if (editorial && !/lining-nums/.test(s.fontVariantNumeric)) out.bad.push('display title without lining numerals: ' + label(e) + ' ' + s.fontVariantNumeric);
        if (/oldstyle-nums/.test(s.fontVariantNumeric)) out.bad.push('display title with old-style numerals: ' + label(e));
      } else if (serif(s.fontFamily) && !(!editorial && e.matches('.rbtn.rinfo'))) out.bad.push('serif outside the display titles: ' + label(e) + ' ' + s.fontFamily);
    }
  }
  return out;
};
// The long round title in a display element: whole text shown, nothing cut off, no "...", and how many lines it takes.
const titleCheck = ({ sel, name }) => {
  const e = document.querySelector(sel); if (!e) return { err: sel + ' not on screen' };
  const cs = getComputedStyle(e), r = e.getBoundingClientRect(), bad = [];
  if (e.textContent.trim() !== name) bad.push('shows "' + e.textContent.trim() + '"');
  if (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1) bad.push('cut off ' + e.scrollWidth + 'x' + e.scrollHeight + ' in ' + e.clientWidth + 'x' + e.clientHeight);
  if (cs.textOverflow === 'ellipsis' || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none')) bad.push('ellipsis or line clamp');
  for (let a = e; a && a !== document.body; a = a.parentElement) { const ar = a.getBoundingClientRect(), acs = getComputedStyle(a);
    if (acs.overflow !== 'visible' && (r.left < ar.left - 1 || r.right > ar.right + 1 || r.top < ar.top - 1 || r.bottom > ar.bottom + 1)) bad.push('clipped by ' + a.className); }
  if (r.left < -1 || r.right > innerWidth + 1) bad.push('off screen ' + Math.round(r.left) + '..' + Math.round(r.right));
  return { bad, lines: Math.round(r.height / parseFloat(cs.lineHeight)), size: cs.fontSize, ff: cs.fontFamily.split(',')[0] };
};
// Which display titles each screen shows; every other screen shows none.
const ROUND_PAGE = ['round-players', 'round-groups', 'round-group-open', 'round-kb', 'round-weather', 'round-course'];
const DISPLAY_ON = Object.assign({ home: ['wordmark', 'now-name'] }, ...ROUND_PAGE.map(s => ({ [s]: ['rp-name'] })));
const SHOTS = process.env.TYPE_SHOTS || ''; const SHOT_OF = { home: 1, 'round-players': 1, 'round-past': 1, entry: 1, 'rules-answer': 1, 'board-bw': 1 };
const MAX_LINES = Number(process.env.MAX_TITLE_LINES) || 0;
let editorial = false, look = '';
// What Chromium actually drew the display titles with (on Linux this is a fallback, never New York).
const usedFonts = async (p, sn) => {
  const cdp = await p.context().newCDPSession(p);
  try {
    await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
    const out = [];
    for (const sel of ['.hero.home .wordmark', '.hero.home .now-name']) {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel }); if (!nodeId) continue;
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      out.push(sel.replace('.hero.home ', '') + ': ' + (fonts.map(f => f.familyName).join(', ') || '(none)'));
    }
    console.log('FONT  ' + look + ' ' + sn + ' | drawn with ' + out.join(' | '));
  } catch (e) { console.log('FONT  ' + sn + ' | could not read the drawn fonts: ' + e.message.split('\n')[0]); }
  await cdp.detach().catch(() => {});
};
(async () => {
  const b = await chromium.launch(); let fails = 0;
  if (SHOTS) require('fs').mkdirSync(SHOTS, { recursive: true });
  for (const [sn, w, h, scale] of sizes) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
    const p = await ctx.newPage();
    if (!look) {
      await p.goto(URL); await p.waitForSelector('.brand');
      const css = await p.evaluate(() => [...document.querySelectorAll('style')].map(s => s.textContent).join('\n'));
      const at = css.indexOf('/* NCGS editorial prototype */'); editorial = at >= 0; look = editorial ? 'editorial' : 'standard';
      console.log('LOOK  ' + look);
      if (editorial) {
        const rules = css.slice(at).replace(/\/\*[\s\S]*?\*\//g, '');
        const sels = [...rules.matchAll(/([^{}]*)\{[^{}]*\}/g)].map(x => x[1].trim());
        const other = sels.filter(s => s !== ':root');
        if (!sels.length || other.length || /@/.test(rules)) { fails++; console.log('FAIL  editorial file restyles selectors (tokens on :root only): ' + (other.join(' | ') || 'no :root rule')); }
        else console.log('PASS  editorial file only sets :root tokens');
      }
    }
    for (const [name, fn] of scenarios) {
      await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.brand');
      if (scale !== 1) await p.addStyleTag({ content: `html{font-size:${scale * 100}% !important}` });
      try { await fn(p); } catch (e) { fails++; console.log('FAIL  ' + sn + ' / ' + name + ' could not be opened: ' + e.message.split('\n')[0]); continue; }
      await p.waitForTimeout(150);
      const m = await p.evaluate(metrics, { min: MIN, strict: STRICT });
      if (STRICT) m.small.forEach(x => console.log('TARGET  ' + sn + ' | ' + name + ' | ' + x));
      const bad = [...m.hover.map(x => 'page wider than screen ' + x), ...m.clip.filter(x => !/Pick up|\[vh\]/.test(x)).map(x => 'cut off: ' + x), ...m.wide.map(x => 'off screen: ' + x), ...m.small.filter(x => !/^\s*\d+x\d+$/.test(x)).map(x => 'small target: ' + x)];
      const t = await p.evaluate(typeCheck, { display: DISPLAY, editorial });
      const want = (DISPLAY_ON[name] || []).join(','), got = [...new Set(t.display.map(x => x.sel))].join(',');
      if (got !== want) bad.push('display titles on screen: ' + (got || 'none') + ', expected ' + (want || 'none'));
      bad.push(...t.bad.map(x => 'type: ' + x));
      if (SHOTS && SHOT_OF[name]) await p.screenshot({ path: `${SHOTS}/${look}-${w}${scale !== 1 ? '-135' : ''}-${name}.png` });
      if (name === 'home') await usedFonts(p, sn);
      if (bad.length) { fails++; console.log('FAIL  ' + sn + ' / ' + name); bad.slice(0, 6).forEach(x => console.log('      ' + x)); }
      else console.log('PASS  ' + sn + ' / ' + name);
    }
    await ctx.close();
  }
  // The fixture's longest round name (a past round) shown in the two places a round name is a display title.
  for (const [sn, w, h, scale] of [['small 360', 360, 740, 1], ['large text 360', 360, 740, 1.35]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
    const p = await ctx.newPage();
    await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.brand');
    if (scale !== 1) await p.addStyleTag({ content: `html{font-size:${scale * 100}% !important}` });
    const name = await p.evaluate(() => { const n = window.__ncgs; const long = n.D.rounds().map(r => r.name || '').sort((a, b) => b.length - a.length)[0];
      n.D.round(document.querySelector('.now [data-act="round"]').dataset.rid).name = long; n.render(); return long; });
    await p.waitForTimeout(150);
    for (const [where, sel, go] of [['Home', '.hero.home .now-name', null], ['round page', '.rp-name', '.now [data-act="round"]']]) {
      if (go) await clickAny(p, go);
      const r = await p.evaluate(titleCheck, { sel, name });
      if (SHOTS) await p.screenshot({ path: `${SHOTS}/${look}-${w}${scale !== 1 ? '-135' : ''}-long-title-${go ? 'round' : 'home'}.png` });
      const bad = r.err ? [r.err] : r.bad.slice();
      if (!r.err && MAX_LINES && r.lines > MAX_LINES) bad.push(r.lines + ' lines, more than ' + MAX_LINES);
      console.log((bad.length ? 'FAIL  ' : 'PASS  ') + sn + ' / long title on ' + where + ': "' + name + '" ' + (r.err ? '' : r.lines + ' lines at ' + r.size + ' ' + r.ff + (MAX_LINES ? '' : ' (two-line goal not enforced: MAX_TITLE_LINES unset)')));
      bad.forEach(x => console.log('      ' + x)); if (bad.length) fails++;
    }
    await ctx.close();
  }
  await b.close(); if (fails) { console.log('SOME FAILED'); process.exit(1); }
})();
