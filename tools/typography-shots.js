// Screenshots of the display titles (evidence for docs/TYPOGRAPHY.md). Fixture builds only.
// node tools/typography-shots.js <preview.html> <tag> <outdir>
// Home as built, then Home and the round page with the fixture's long round title lent (in memory) to the open rounds.
// Prints the computed font and line count of each title. Linux Chromium has no New York: it shows a fallback serif.
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const [F, TAG, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const LONG = 'Cabopino, the long-named second day of the trip';
const sizes = [['360', 360, 740, 1], ['360-135', 360, 740, 1.35], ['390', 390, 844, 1], ['390-135', 390, 844, 1.35]];
(async () => {
  const b = await chromium.launch();
  for (const [sn, w, h, sc] of sizes) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
    const p = await ctx.newPage();
    await p.goto('file://' + path.resolve(F)); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.brand');
    if (sc !== 1) await p.addStyleTag({ content: `html{font-size:${sc * 100}% !important}` });
    await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, `home-${TAG}-${sn}.png`) });
    for (const v of ['home', 'round']) {
      await p.evaluate(({ v, long }) => { const n = window.__ncgs; n.D.rounds().filter(x => x.status !== 'final').forEach(x => { x.name = long; });
        n.UI.stack = v === 'home' ? [{ v: 'home', p: {} }] : [{ v: 'home', p: {} }, { v: 'round', p: { rid: 'fx-r3' } }]; n.render(); }, { v, long: LONG });
      await p.waitForTimeout(300);
      const sel = v === 'home' ? '.hero.home .now-name' : '.rp-name';
      const m = await p.$eval(sel, e => { const cs = getComputedStyle(e); const rg = document.createRange(); rg.selectNodeContents(e);
        return [cs.fontFamily.split(',')[0], cs.fontVariantNumeric, new Set([...rg.getClientRects()].filter(r => r.width).map(r => Math.round(r.top))).size]; });
      console.log(`${TAG} ${sn} ${sel}: ${m[0]}, numerals ${m[1]}, long title ${m[2]} lines`);
      await p.screenshot({ path: path.join(OUT, `long-${v}-${TAG}-${sn}.png`) });
    }
    await ctx.close();
  }
  await b.close();
})();
