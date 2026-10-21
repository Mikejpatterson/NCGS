// Navigation check: the floating tab bar on every screen that shows it, in each look, at 360/390px and 135% text.
// Written for the Option 2 light-pill work (issue #1, 21 October 2026) so any restyle of .tabs is judged on what
// a golfer sees, not on the CSS. It fails when:
//   1. a tab is smaller than 44 x 44, its label wraps to a second line, is cut off, or the bar leaves the screen;
//   2. scrolled to the very end, the bar still covers a control (Save, the last row, the ask bar...);
//   3. a tab label is below 4.5:1 contrast against what is actually behind it. The background is read from the
//      rendered pixels with the labels made transparent, so blur, translucency and shadows all count. It is checked
//      twice: over the plain page, and over a pine band placed under the bar, standing in for a pine card that has
//      scrolled underneath. The worst pixel behind each label decides.
// The Hole tab is checked with its longest label, "Hole 18".
// Linux Chromium is not an iPhone: real backdrop blur and Home Screen mode still need the phone check.
// Run: python3 -m http.server 8765 -d dist & node test/nav.run.js [standard.html editorial.html]
const { chromium } = require('playwright');
const BASE = process.env.NAV_URL || 'http://localhost:8765/';
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['standard.html', 'editorial.html'];
const sizes = [['360', 360, 740, 1], ['360 large text', 360, 740, 1.35], ['390', 390, 844, 1], ['390 large text', 390, 844, 1.35]];
const MIN = 44, CONTRAST = 4.5;
const click = async (p, sel) => { await p.click(sel, { timeout: 3000 }); await p.waitForTimeout(200); };
const toEntry = async p => { await click(p, '#tabs .tab:nth-child(2)'); await click(p, '[data-act="pick"]'); await click(p, '[data-act="intro-go"]').catch(() => {}); };
const screens = [
  ['home', async () => {}],
  ['hole entry', toEntry],
  ['results', async p => { await click(p, '#tabs .tab:nth-child(3)'); }],
  ['results buggy wars', async p => { await click(p, '#tabs .tab:nth-child(3)'); await click(p, '[data-act="respill"][data-p="bw"]'); }],
  ['ruling', async p => { await click(p, '#tabs .tab:nth-child(4)'); }],
];

// 1. Size, one line, nothing cut off, on screen.
const shape = ({ min }) => {
  const bad = [], nav = document.getElementById('tabs');
  if (!nav || nav.hidden) return { bad: ['tab bar not shown'] };
  const span = nav.querySelector('.tab[data-tab="hole"] span'); if (span) span.textContent = 'Hole 18';
  const nr = nav.getBoundingClientRect();
  if (nr.left < 0 || nr.right > innerWidth || nr.bottom > innerHeight) bad.push('bar off screen ' + [nr.left, nr.right, nr.bottom].map(Math.round));
  const tabs = [...nav.querySelectorAll('.tab')];
  if (tabs.length !== 4) bad.push(tabs.length + ' tabs, expected 4');
  for (const t of tabs) {
    const r = t.getBoundingClientRect(), name = (t.textContent || '').trim();
    if (r.width < min || r.height < min) bad.push(`"${name}" is ${Math.round(r.width)}x${Math.round(r.height)}`);
    const lab = t.querySelector('span') || t;
    const rg = document.createRange(); rg.selectNodeContents(lab);
    const lines = new Set([...rg.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top))).size;
    if (lines > 1) bad.push(`"${name}" wraps to ${lines} lines`);
    if (lab.scrollWidth > lab.clientWidth + 1 && getComputedStyle(lab).display !== 'inline') bad.push(`"${name}" cut off`);
    const lr = rg.getBoundingClientRect();
    if (lr.left < r.left - 1 || lr.right > r.right + 1) bad.push(`"${name}" label spills out of its tab`);
  }
  return { bad, height: Math.round(nr.height) };
};

// 2. Scrolled to the end, nothing tappable sits under the bar.
const covered = () => {
  const nav = document.getElementById('tabs'), app = document.getElementById('app');
  app.scrollTop = app.scrollHeight; window.scrollTo(0, document.body.scrollHeight);
  const n = nav.getBoundingClientRect(), bad = [];
  const sel = 'button, a[href], input:not([type=hidden]), select, textarea, [role=button], [data-act]';
  for (const e of document.querySelectorAll(sel)) {
    if (nav.contains(e) || e.closest('[hidden]')) continue;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const overlapY = Math.min(r.bottom, n.bottom) - Math.max(r.top, n.top), overlapX = Math.min(r.right, n.right) - Math.max(r.left, n.left);
    if (overlapY > 1 && overlapX > 1) bad.push(((e.getAttribute('aria-label') || e.textContent || e.dataset.act || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 30)) + ` under the bar by ${Math.round(overlapY)}px`);
  }
  return bad;
};

const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };

// 3. Contrast of each label against the rendered pixels behind it.
async function contrast(p, backdrop) {
  const tabs = await p.evaluate(() => [...document.querySelectorAll('#tabs .tab')].map(t => {
    const lab = t.querySelector('span') || t, rg = document.createRange(); rg.selectNodeContents(lab);
    const r = rg.getBoundingClientRect(), c = getComputedStyle(lab).color.match(/[\d.]+/g).map(Number);
    return { name: t.textContent.trim(), on: t.classList.contains('on'), color: c, box: { x: r.left, y: r.top, width: r.width, height: r.height } };
  }));
  const id = 'nav-check-hide';
  await p.addStyleTag({ content: `#tabs .tab, #tabs .tab * { color: transparent !important; text-shadow: none !important; } #tabs .tab svg { visibility: hidden !important; }` }).then(h => h.evaluate((e, id) => { e.id = id; }, id));
  if (backdrop === 'pine') await p.evaluate(() => { const nav = document.getElementById('tabs').getBoundingClientRect(); const d = document.createElement('div'); d.id = 'nav-check-pine';
    d.style.cssText = `position:fixed;left:0;right:0;top:${nav.top - 40}px;height:${nav.height + 80}px;background:var(--pine);z-index:5;pointer-events:none`; document.body.appendChild(d); });
  await p.waitForTimeout(250);
  const out = [];
  for (const t of tabs) {
    const box = { x: Math.max(0, Math.floor(t.box.x)), y: Math.max(0, Math.floor(t.box.y)), width: Math.max(1, Math.ceil(t.box.width)), height: Math.max(1, Math.ceil(t.box.height)) };
    const png = (await p.screenshot({ clip: box })).toString('base64');
    const px = await p.evaluate(async b64 => { const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
      const c = new OffscreenCanvas(bmp.width, bmp.height), x = c.getContext('2d'); x.drawImage(bmp, 0, 0); return [...x.getImageData(0, 0, bmp.width, bmp.height).data]; }, png);
    const fg = t.color.slice(0, 3), alpha = t.color.length > 3 ? t.color[3] : 1;
    let worst = Infinity;
    for (let i = 0; i < px.length; i += 4) { const bg = [px[i], px[i + 1], px[i + 2]];
      const shown = fg.map((v, k) => v * alpha + bg[k] * (1 - alpha)); worst = Math.min(worst, ratio(shown, bg)); }
    out.push({ name: t.name, on: t.on, worst });
  }
  await p.evaluate(id => { document.getElementById(id)?.remove(); document.getElementById('nav-check-pine')?.remove(); }, id);
  return out;
}

(async () => {
  const b = await chromium.launch(); let fails = 0;
  for (const page of pages) for (const [sn, w, h, scale] of sizes) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true }); const p = await ctx.newPage();
    for (const [name, open] of screens) {
      const tag = `${page.replace('.html', '')} | ${sn} | ${name}`;
      await p.goto(BASE + page); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.brand');
      if (scale !== 1) await p.addStyleTag({ content: `html{font-size:${scale * 100}% !important}` });
      try { await open(p); } catch (e) { fails++; console.log(`FAIL  ${tag}: could not open (${e.message.split('\n')[0]})`); continue; }
      await p.waitForTimeout(150);
      const s = await p.evaluate(shape, { min: MIN });
      const bad = [...s.bad];
      if (!s.bad.includes('tab bar not shown')) {
        bad.push(...await p.evaluate(covered));
        for (const bd of ['page', 'pine']) for (const c of await contrast(p, bd))
          if (c.worst < CONTRAST) bad.push(`"${c.name}"${c.on ? ' (selected)' : ''} label contrast ${c.worst.toFixed(2)}:1 over ${bd === 'pine' ? 'a pine card' : 'the page'}`);
          else console.log(`CONTRAST  ${tag} | ${bd} | "${c.name}"${c.on ? ' selected' : ''} | ${c.worst.toFixed(2)}:1`);
      }
      if (bad.length) { fails++; console.log(`FAIL  ${tag}`); bad.slice(0, 10).forEach(x => console.log('      ' + x)); }
      else console.log(`PASS  ${tag} (bar ${s.height}px)`);
    }
    await ctx.close();
  }
  await b.close(); if (fails) { console.log(`SOME FAILED (${fails})`); process.exit(1); }
  console.log('ALL PASSED');
})();
