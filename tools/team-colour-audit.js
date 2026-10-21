// Team colour audit (evidence for docs/TEAM-COLOURS.md). Fixture builds only; nothing here changes the app.
// node tools/team-colour-audit.js <std.html> <ed.html> <outdir> [<trial.html> trial]
// For the hole screen, the result after Save, Buggy Wars and the round page's groups, at 360px, 390px and 390px with
// 135% text, it:
//   1. finds every element painted in a team colour (text, background, border, ring, dot) in the real page, works out
//      the colour actually behind it (see-through backgrounds blended down to the opaque one) and the WCAG 2 contrast
//   2. saves one phone-sized picture per screen and size: the original, then simulated deuteranopia and protanopia
// It also prints the colour distance between the two teams, and between navy and the pine selected states, with and
// without the simulations. Simulation: Machado, Oliveira & Fernandes (2009), severity 1.0, applied in linear RGB.
// Distance: CIEDE2000 (ΔE00). Neither is an accessibility pass; they are evidence for people to judge.
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
// tools/release-buggy-shots.js reuses the measuring and simulation below through require(); the audit itself only
// runs when this file is started directly.
const MAIN = require.main === module;
const [STD, ED, OUT, TRIAL, TRIAL_TAG = 'trial'] = MAIN ? process.argv.slice(2) : [];
if (MAIN && (!STD || !ED || !OUT)) { console.log('usage: node tools/team-colour-audit.js <std.html> <ed.html> <outdir> [<trial.html> [tag]]'); process.exit(2); }
if (MAIN) fs.mkdirSync(OUT, { recursive: true });
const looks = [['standard', STD], ['editorial', ED]].concat(TRIAL ? [[TRIAL_TAG, TRIAL]] : []);
const sizes = [['360', 360, 740, 1], ['390', 390, 844, 1], ['390-135', 390, 844, 1.35]];

// ---- colour maths (shared with the page through toString) ----
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const unlin = v => { v = Math.max(0, Math.min(1, v)); return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)); };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const M = {
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
};
const sim = (rgb, m) => { const l = rgb.map(lin); return m.map(row => unlin(row[0] * l[0] + row[1] * l[1] + row[2] * l[2])); };
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const toHex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
const lab = rgb => {
  const [r, g, b] = rgb.map(lin);
  const f = t => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047, Y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b, Z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883;
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
};
const de2000 = (c1, c2) => {
  const [L1, a1, b1] = lab(c1), [L2, a2, b2] = lab(c2), rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cm = (C1 + C2) / 2, G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const ap1 = a1 * (1 + G), ap2 = a2 * (1 + G), Cp1 = Math.hypot(ap1, b1), Cp2 = Math.hypot(ap2, b2);
  const h = (b, a) => { const v = Math.atan2(b, a) / rad; return v < 0 ? v + 360 : v; };
  const hp1 = h(b1, ap1), hp2 = h(b2, ap2), dL = L2 - L1, dC = Cp2 - Cp1;
  let dh = hp2 - hp1; if (Cp1 * Cp2 === 0) dh = 0; else if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin(dh * rad / 2), Lm = (L1 + L2) / 2, Cpm = (Cp1 + Cp2) / 2;
  let hm = hp1 + hp2; if (Cp1 * Cp2 !== 0) hm = Math.abs(hp1 - hp2) > 180 ? (hp1 + hp2 + (hp1 + hp2 < 360 ? 360 : -360)) / 2 : (hp1 + hp2) / 2;
  const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.20 * Math.cos((4 * hm - 63) * rad);
  const SL = 1 + 0.015 * (Lm - 50) ** 2 / Math.sqrt(20 + (Lm - 50) ** 2), SC = 1 + 0.045 * Cpm, SH = 1 + 0.015 * Cpm * T;
  const RT = -2 * Math.sqrt(Cpm ** 7 / (Cpm ** 7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hm - 275) / 25) ** 2)) * rad);
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
};

// ---- screens ----
const click = async (p, s) => { await p.click(s, { timeout: 3000 }); await p.waitForTimeout(200); };
const toEntry = async p => { await click(p, '#tabs .tab:nth-child(2)'); await click(p, '[data-act="pick"]'); await click(p, '[data-act="intro-go"]').catch(() => {}); if (await p.$('[data-act="enter"]')) await click(p, '[data-act="enter"]'); };
const scenarios = [
  ['hole', toEntry],
  ['after', async p => { await toEntry(p); for (const pid of await p.$$eval('[data-act="set"][data-dir="up"]', e => [...new Set(e.map(x => x.dataset.pid))])) await p.click(`[data-act="set"][data-dir="up"][data-pid="${pid}"]`); await click(p, '[data-act="save"]'); await p.waitForTimeout(300); if (await p.$('.askrow')) { await click(p, '.askrow:nth-child(2)'); await click(p, '[data-act="ask-confirm"]').catch(() => {}); } await p.waitForTimeout(200); }],
  ['buggy-wars', async p => { await click(p, '#tabs .tab:nth-child(3)'); await click(p, '[data-act="respill"][data-p="bw"]'); }],
  ['round-groups', async p => { await click(p, '.now [data-act="round"]'); await click(p, '[data-act="rtab"][data-t="groups"]'); await click(p, '.rg'); }],
  ['round-results', async p => { await click(p, '[data-act="rounds"]'); await click(p, '[data-act="round"][data-rid]'); }],
];

// In the page: every element that uses a team colour, with the colour really behind it.
function measure(team) {
  const parse = s => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [v[0], v[1], v[2], v[3] === undefined ? 1 : v[3]]; };
  const over = (top, under) => [0, 1, 2].map(i => Math.round(top[i] * top[3] + under[i] * (1 - top[3]))).concat(1);
  const isTeam = c => { if (!c) return null; for (const k of Object.keys(team)) { const t = team[k]; if (Math.abs(c[0] - t[0]) < 2 && Math.abs(c[1] - t[1]) < 2 && Math.abs(c[2] - t[2]) < 2) return k; } return null; };
  // The opaque colour under an element: its own background and every ancestor's, blended from the page upward.
  const behind = (e, includeSelf) => {
    const layers = []; let grad = '';
    for (let a = includeSelf ? e : e.parentElement; a; a = a.parentElement) {
      const cs = getComputedStyle(a); if (cs.backgroundImage !== 'none' && !grad) grad = a.className || a.tagName;
      const c = parse(cs.backgroundColor); if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; }
    }
    let base = [255, 255, 255, 1]; for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return { c: base, grad };
  };
  const shown = e => { for (let a = e; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden') return false; } const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const label = e => '.' + String(e.getAttribute('class') || e.tagName.toLowerCase()).trim().split(/\s+/).join('.');
  const rows = [], boxes = [];
  for (const e of document.querySelectorAll('#app *')) {
    if (!shown(e)) continue;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    const text = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
    const fg = parse(cs.color), bg = parse(cs.backgroundColor);
    const bw = parseFloat(cs.borderTopWidth), bc = bw > 0 && cs.borderTopStyle !== 'none' ? parse(cs.borderTopColor) : null;
    const sh = cs.boxShadow !== 'none' ? parse(cs.boxShadow) : null;
    const tFg = isTeam(fg), tBg = bg && bg[3] > 0 ? isTeam(bg) : null, tBd = isTeam(bc), tSh = isTeam(sh);
    const mark = { fz: parseFloat(cs.fontSize), fw: +cs.fontWeight, sel: label(e), text: text.slice(0, 24) };
    if (!(tFg && text) && !tBg && !tBd && !tSh) continue;
    const st = document.getElementById('app').scrollTop; boxes.push([r.left, r.top + st, r.right, r.bottom + st]); // #app is the scroller
    const under = behind(e, true), outside = behind(e, false);
    // Text in a team colour, or any text on a team-coloured background.
    if (text && (tFg || tBg)) rows.push(Object.assign({ kind: 'text', team: tFg || tBg, fg: fg[3] < 1 ? over(fg, under.c) : fg, bg: under.c, grad: under.grad }, mark));
    // The coloured shape itself against what is around it (WCAG 1.4.11 asks 3:1 for parts needed to understand it).
    if (tBg) rows.push(Object.assign({ kind: bg[3] < 1 ? 'soft fill' : 'fill', team: tBg, fg: under.c, bg: outside.c, grad: outside.grad }, mark));
    if (tBd) rows.push(Object.assign({ kind: 'border ' + bw + 'px', team: tBd, fg: bc, bg: outside.c, grad: outside.grad, inner: under.c }, mark));
    if (tSh) rows.push(Object.assign({ kind: 'ring', team: tSh, fg: sh, bg: under.c, grad: under.grad }, mark));
  }
  return { rows, boxes };
}

// In the page: draw the screenshot three times (original, deuteranopia, protanopia) with labels on top.
async function triptych(page, png, file, title) {
  const data = 'data:image/png;base64,' + png.toString('base64');
  const out = await page.evaluate(async ([src, Mx, title]) => {
    const img = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const w = img.width, h = img.height, head = 30, gap = 12;
    const c = document.createElement('canvas'); c.width = w * 3 + gap * 2; c.height = h + head + 26;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(img, 0, head); const src0 = x.getImageData(0, head, w, h);
    const L = new Float32Array(256); for (let i = 0; i < 256; i++) { const v = i / 255; L[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    const U = v => { v = v < 0 ? 0 : v > 1 ? 1 : v; return 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055); };
    ['deuteranopia', 'protanopia'].forEach((k, j) => {
      const m = Mx[k], d = new ImageData(new Uint8ClampedArray(src0.data), w, h), p = d.data;
      for (let i = 0; i < p.length; i += 4) { const r = L[p[i]], g = L[p[i + 1]], b = L[p[i + 2]]; p[i] = U(m[0][0] * r + m[0][1] * g + m[0][2] * b); p[i + 1] = U(m[1][0] * r + m[1][1] * g + m[1][2] * b); p[i + 2] = U(m[2][0] * r + m[2][1] * g + m[2][2] * b); }
      x.putImageData(d, (w + gap) * (j + 1), head);
    });
    x.fillStyle = '#000'; x.font = 'bold 15px sans-serif';
    ['ORIGINAL', 'SIMULATED DEUTERANOPIA', 'SIMULATED PROTANOPIA'].forEach((t, j) => x.fillText(t, (w + gap) * j + 6, 20));
    x.font = '12px sans-serif'; x.fillStyle = '#444';
    x.fillText(title + '  ·  simulation: Machado et al. 2009, severity 1.0, linear RGB. Not a real-phone or sunlight test.', 6, h + head + 18);
    return c.toDataURL('image/png').split(',')[1];
  }, [data, M, title]);
  fs.writeFileSync(file, Buffer.from(out, 'base64'));
}

module.exports = { measure, triptych, M, sim, ratio, toHex, hex, de2000 };
if (MAIN) (async () => {
  const b = await chromium.launch(); const all = [];
  const tokens = {};
  for (const [look, F] of looks) {
    for (const [sn, w, h, sc] of sizes) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, timezoneId: 'Europe/Dublin' });
      await ctx.addInitScript(() => { const f = new Date('2026-10-18T09:30:00Z').getTime(); const D = Date; window.Date = class extends D { constructor(...a) { super(...(a.length ? a : [f])); } static now() { return f; } }; });
      const p = await ctx.newPage();
      for (const [name, fn] of scenarios) {
        await p.goto('file://' + path.resolve(F)); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.brand');
        if (sc !== 1) await p.addStyleTag({ content: `html{font-size:${sc * 100}% !important}` });
        await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
        const team = await p.evaluate(() => { const cs = getComputedStyle(document.documentElement); const h = s => { s = cs.getPropertyValue(s).trim(); return [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); }; return { a: h('--team-a'), b: h('--team-b'), pine: h('--pine'), flag: h('--flag'), bg: h('--bg') }; });
        tokens[look] = team;
        try { await fn(p); } catch (e) { console.log(`FAIL  ${look} ${sn} ${name}: ${e.message.split('\n')[0]}`); process.exitCode = 1; continue; }
        await p.waitForTimeout(250);
        const { rows, boxes } = await p.evaluate(measure, { a: team.a, b: team.b });
        rows.forEach(r => all.push(Object.assign({ look, size: sn, screen: name }, r)));
        if (!boxes.length) { console.log(`note  ${look} ${sn} ${name}: no team colour on screen`); continue; }
        // A phone-sized picture. Scrolled only when the team colours would sit under the tab bar (about 100px).
        const y0 = Math.min(...boxes.map(x => x[1])), y1 = Math.max(...boxes.map(x => x[3]));
        await p.evaluate(t => { document.getElementById('app').scrollTop = t; }, y1 + 100 <= h ? 0 : Math.max(0, y0 - 24));
        await p.waitForTimeout(100);
        const png = await p.screenshot();
        await triptych(p, png, path.join(OUT, `${name}-${look}-${sn}-cvd.png`), `${name} · ${look} look · ${sn}`);
      }
      await ctx.close();
    }
  }
  await b.close();

  // ---- report ----
  const lines = [];
  const say = s => { lines.push(s); console.log(s); };
  say('# Measured team colour pairs (WCAG 2 contrast ratio, sRGB relative luminance)');
  say('look | screen | sizes | element | kind | team | text | colour | behind | ratio | needs | result');
  const seen = new Map();
  for (const r of all) {
    const k = [r.look, r.screen, r.sel, r.kind, r.team, toHex(r.fg.slice(0, 3)), toHex(r.bg.slice(0, 3))].join('|');
    if (seen.has(k)) { seen.get(k).sizes.add(r.size); continue; }
    seen.set(k, Object.assign({ sizes: new Set([r.size]) }, r));
  }
  let textFails = 0;
  for (const r of seen.values()) {
    const cr = ratio(r.fg.slice(0, 3), r.bg.slice(0, 3)), need = r.kind === 'text' ? 4.5 : 3;
    const ok = cr >= need; if (r.kind === 'text' && !ok) textFails++;
    say(`${r.look} | ${r.screen} | ${[...r.sizes].join(' ')} | ${r.sel} | ${r.kind} | ${r.team} | ${r.kind === 'text' ? JSON.stringify(r.text) + ' ' + r.fz + 'px/' + r.fw : ''} | ${toHex(r.fg.slice(0, 3))} | ${toHex(r.bg.slice(0, 3))}${r.grad ? ' (gradient: ' + r.grad + ')' : ''} | ${cr.toFixed(2)}:1 | ${need}:1 | ${ok ? 'pass' : (r.kind === 'text' ? 'FAIL' : 'below')}`);
  }
  say('');
  say('# Colour distance (CIEDE2000 ΔE00; bigger is more different). Normal / simulated deuteranopia / simulated protanopia');
  say('look | pair | colours | ΔE00 normal | ΔE00 deuteranopia | ΔE00 protanopia | lightness contrast normal / deut / prot');
  for (const [look, t] of Object.entries(tokens)) {
    const pairs = [['Buggy 1 v Buggy 2', t.a, t.b], ['Buggy 1 v pine (selected / + button / header)', t.a, t.pine], ['Buggy 2 v pine', t.b, t.pine], ['Buggy 1 v pick-up on (#167A41)', t.a, hex('#167A41')], ['Buggy 2 v error red (#CF2A2A)', t.b, hex('#CF2A2A')]];
    for (const [n, x, y] of pairs) say(`${look} | ${n} | ${toHex(x)} ${toHex(y)} | ${de2000(x, y).toFixed(1)} | ${de2000(sim(x, M.deuteranopia), sim(y, M.deuteranopia)).toFixed(1)} | ${de2000(sim(x, M.protanopia), sim(y, M.protanopia)).toFixed(1)} | ${ratio(x, y).toFixed(2)} / ${ratio(sim(x, M.deuteranopia), sim(y, M.deuteranopia)).toFixed(2)} / ${ratio(sim(x, M.protanopia), sim(y, M.protanopia)).toFixed(2)}`);
    say(`${look} | simulated colours | Buggy 1 ${toHex(t.a)} -> deut ${toHex(sim(t.a, M.deuteranopia))}, prot ${toHex(sim(t.a, M.protanopia))}; Buggy 2 ${toHex(t.b)} -> deut ${toHex(sim(t.b, M.deuteranopia))}, prot ${toHex(sim(t.b, M.protanopia))}; pine ${toHex(t.pine)} -> deut ${toHex(sim(t.pine, M.deuteranopia))}, prot ${toHex(sim(t.pine, M.protanopia))}`);
  }
  say('');
  say(textFails ? `${textFails} text pair(s) below 4.5:1` : 'every text pair in a team colour, or on one, is at least 4.5:1');
  fs.writeFileSync(path.join(OUT, 'measurements.txt'), lines.join('\n') + '\n');
})();
