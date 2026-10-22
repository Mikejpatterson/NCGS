// Evidence for docs/ACTION-COLOUR.md (flag-yellow retired, pine actions). Fixture builds only.
// node tools/action-colour-shots.js <before.html> <after.html> <std|ed> <outdir>
// Screenshots Home, Hole entry, Results, Buggy Wars and Ruling at 360px, 390px and 390px with 135% text, before and
// after. On the after build it also opens the round page, the hole picker and the screen after saving, and for every
// element whose colour changed role it prints the colour the browser computed, the solid colour really behind it,
// and the WCAG 2 contrast ratio. It also lists any element still painted flag-yellow (#F6C515) or the cup's yellow.
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const [BEFORE, AFTER, TAG, OUT] = process.argv.slice(2);
if (!BEFORE || !AFTER || !TAG || !OUT) { console.log('usage: node tools/action-colour-shots.js <before.html> <after.html> <std|ed> <outdir>'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

const sizes = [['360', 360, 740, 1], ['390', 390, 844, 1], ['390-135', 390, 844, 1.35]];
const click = async (p, sel) => { await p.click(sel, { timeout: 3000 }); await p.waitForTimeout(200); };
const toEntry = async p => { await click(p, '#tabs .tab:nth-child(2)'); await click(p, '[data-act="pick"]'); await click(p, '[data-act="intro-go"]').catch(() => {}); if (await p.$('[data-act="enter"]')) await click(p, '[data-act="enter"]'); };
const shots = [
  ['home', async () => {}],
  ['hole-entry', toEntry],
  ['results', async p => { await click(p, '#tabs .tab:nth-child(3)'); }],
  ['buggy-wars', async p => { await click(p, '#tabs .tab:nth-child(3)'); await click(p, '[data-act="respill"][data-p="bw"]'); }],
  ['ruling', async p => { await click(p, '#tabs .tab:nth-child(4)'); }],
];
const extra = [
  ['round-page', async p => { await click(p, '.now [data-act="round"]'); }],
  ['hole-picker', async p => { await toEntry(p); await click(p, '[data-act="holes"]'); }],
  ['after-save', async p => { await toEntry(p); const ids = await p.$$eval('[data-act="set"][data-dir="up"]', e => [...new Set(e.map(x => x.dataset.pid))]); for (const id of ids) await p.click(`[data-act="set"][data-dir="up"][data-pid="${id}"]`).catch(() => {}); await click(p, '[data-act="save"]'); await p.waitForTimeout(300); }],
];

// The roles that changed. Text roles are checked at 4.5:1 (3:1 when large); marker roles at 3:1.
const ROLES = [
  ['.go', 'text'], ['.now-kind', 'text'], ['.hero .pill.w', 'text'], ['.badge:not(.crest)', 'mark'], ['.rulechip', 'text'], ['.hs-tag', 'text'],
  ['.entl small', 'text'], ['.holebtn .hdown', 'mark'], ['.prog i.cur', 'mark'], ['.savebar .btn:not(.quiet)', 'text'],
  ['.av.is-lead', 'text'], ['.posp.p1', 'text'], ['.rk.r1', 'text'], ['.lc-k', 'text'], ['.mr .mn small', 'text'],
  ['.rp-kind', 'text'], ['.rp-time b', 'text'], ['.ah-txt small', 'text'], ['.ah-mic', 'mark'], ['.mgk', 'text'],
  ['.after .btn:not(.quiet)', 'text'], ['.introkind', 'text'], ['.fin .fink', 'text'], ['.fin .finpts', 'text'], ['.sbm', 'mark'],
  ['.mk.eagle', 'text'], ['.hs.nxt', 'ring'], ['.hs-k.nxt', 'ring'], ['.lrow.low', 'text'], ['.tile.flag .bignum', 'text'],
  ['.tile.flag .cap', 'text'], ['.bw-n.cur', 'text'], ['.lrow:has(.av.is-lead) .n', 'text'], ['.rg.me .rg-t b', 'text'], ['.pk.me', 'text'],
  ['.pl-row.me .b', 'text'], ['.hero.s ~ .btn:not(.quiet)', 'text'], ['.rp-go .go', 'text'],
];

const measure = roles => {
  const rgb = s => { const m = s.match(/[\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 1]; };
  const lum = c => { const [r, g, b] = c.slice(0, 3).map(v => v / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * r + .7152 * g + .0722 * b; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const hex = c => '#' + c.slice(0, 3).map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  const mix = (top, under) => { const a = top[3] === undefined ? 1 : top[3]; return [0, 1, 2].map(i => top[i] * a + under[i] * (1 - a)); };
  // The solid colour behind an element: its own background (for chips) or the nearest ancestor's, blending see-through layers.
  const behind = (e, own) => { const layers = []; for (let n = own ? e : e.parentElement; n; n = n.parentElement) { const c = rgb(getComputedStyle(n).backgroundColor); if (c[3] !== 0 && getComputedStyle(n).backgroundColor !== 'rgba(0, 0, 0, 0)') { layers.push(c); if (c[3] === undefined || c[3] === 1) break; } } let base = [250, 248, 243]; for (let i = layers.length - 1; i >= 0; i--) base = mix(layers[i], base); return base; };
  const out = [];
  for (const [sel, kind] of roles) {
    for (const e of document.querySelectorAll(sel)) {
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const cs = getComputedStyle(e);
      if (kind === 'text') {
        const bg = behind(e, true), fg = mix(rgb(cs.color), bg), px = parseFloat(cs.fontSize), w = Number(cs.fontWeight);
        const large = px >= 24 || (px >= 18.66 && w >= 700);
        out.push({ sel, kind: large ? 'large text' : 'text', fg: hex(fg), bg: hex(bg), ratio: ratio(fg, bg), need: large ? 3 : 4.5, px: Math.round(px), h: Math.round(r.height) });
      } else if (kind === 'ring') {
        const ring = rgb((cs.boxShadow.match(/rgba?\([^)]+\)/) || ['rgb(0,0,0)'])[0]), bg = behind(e, true);
        out.push({ sel, kind: 'ring', fg: hex(ring), bg: hex(bg), ratio: ratio(ring, bg), need: 3, h: Math.round(r.height) });
      } else {
        const own = rgb(cs.backgroundColor), bg = behind(e, false);
        const fg = own[3] === 0 ? mix(rgb(cs.color), bg) : mix(own, bg);
        out.push({ sel, kind: 'marker', fg: hex(fg), bg: hex(bg), ratio: ratio(fg, bg), need: 3, h: Math.round(r.height) });
      }
    }
  }
  // flag-yellow #F6C515, and the cup's yellow #F0C63F
  const yellow = [...document.querySelectorAll('*')].filter(e => { const cs = getComputedStyle(e); return [cs.color, cs.backgroundColor, cs.borderLeftColor, cs.fill, cs.outlineColor].some(c => c === 'rgb(246, 197, 21)' || c === 'rgb(240, 198, 63)'); }).map(e => e.tagName.toLowerCase() + '.' + String(e.getAttribute('class') || '').split(' ').join('.'));
  return { out, yellow: [...new Set(yellow)] };
};

(async () => {
  const b = await chromium.launch();
  let fails = 0;
  const seen = new Map();
  for (const [sn, w, h, sc] of sizes) {
    for (const [state, file] of [['before', BEFORE], ['after', AFTER]]) {
      for (const [name, open] of [...shots, ...(state === 'after' ? extra : [])]) {
        const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, timezoneId: 'Europe/Dublin' });
        await ctx.addInitScript(() => { const fixed = new Date('2026-10-18T09:30:00Z').getTime(); const D = Date; window.Date = class extends D { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } }; });
        const p = await ctx.newPage();
        await p.goto('file://' + path.resolve(file)); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.brand');
        if (sc !== 1) await p.addStyleTag({ content: `html{font-size:${sc * 100}% !important}` });
        await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
        await p.waitForTimeout(200);
        try { await open(p); } catch (e) { console.log(`FAIL ${TAG} ${sn} ${state} ${name}: could not open (${e.message.split('\n')[0]})`); fails++; await ctx.close(); continue; }
        await p.waitForTimeout(300);
        if (shots.some(s => s[0] === name)) await p.screenshot({ path: path.join(OUT, `${TAG}-${name}-${sn}-${state}.png`) });
        if (state === 'after') {
          const m = await p.evaluate(measure, ROLES);
          if (m.yellow.length) { console.log(`FAIL ${TAG} ${sn} ${name}: still flag-yellow: ${m.yellow.join(' ')}`); fails++; }
          for (const x of m.out) {
            const ok = x.ratio + 1e-9 >= x.need;
            if (!ok) fails++;
            const key = `${x.sel} | ${x.kind} | ${x.fg} on ${x.bg}`;
            const prev = seen.get(key) || { ratio: x.ratio, need: x.need, where: new Set(), ok };
            prev.where.add(name); seen.set(key, prev);
            if (!ok) console.log(`FAIL ${TAG} ${sn} ${name}: ${key} ${x.ratio.toFixed(2)} < ${x.need}`);
          }
        }
        await ctx.close();
      }
    }
  }
  await b.close();
  console.log(`\n${TAG}: rendered pairs on the after build (all sizes)`);
  for (const [k, v] of [...seen.entries()].sort()) console.log(`${v.ok ? 'ok  ' : 'FAIL'} ${k} ${v.ratio.toFixed(2)}:1 (needs ${v.need}) on ${[...v.where].join(', ')}`);
  console.log(fails ? `\n${fails} problem(s)` : '\nall measured pairs pass; no flag-yellow left on screen');
  process.exit(fails ? 1 : 0);
})();
