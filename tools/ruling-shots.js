// Screenshot + measure the Ruling question box (evidence for docs/TOUCH-TARGETS.md). Fixture builds only.
// node tools/ruling-shots.js <preview.html> <tag> <outdir>   (prints one line per size: width × height of #askin)
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const [F, TAG, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const sizes = [['360', 360, 740, 1], ['390', 390, 844, 1], ['390-135', 390, 844, 1.35]];
(async () => {
  const b = await chromium.launch();
  for (const [sn, w, h, sc] of sizes) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
    const p = await ctx.newPage();
    await p.goto('file://' + path.resolve(F)); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.brand');
    if (sc !== 1) await p.addStyleTag({ content: `html{font-size:${sc * 100}% !important}` });
    await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
    await p.click('#tabs .tab:nth-child(4)'); await p.waitForTimeout(400);
    const r = await p.$eval('#askin', e => { const b = e.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; });
    await p.screenshot({ path: path.join(OUT, `ruling-${TAG}-${sn}.png`) });
    // Two-line question: checks the box still grows with the text.
    await p.fill('#askin', 'My ball came to rest against a fence post on the boundary of the course. Do I get relief?');
    await p.waitForTimeout(300);
    const g = await p.$eval('#askin', e => Math.round(e.getBoundingClientRect().height));
    console.log(`${TAG} ${sn}: empty box ${r[0]} × ${r[1]}, with a long question ${g} tall`);
    await ctx.close();
  }
  await b.close();
})();
