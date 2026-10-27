// Westport long-names check (#42): invented long names on the teams table and the hole screen at 360px and 390px/135%.
// Fails if a name overflows its box or splits mid-word (a break after a hyphen is fine).
// node tools/westport-long-names.js <preview url> <outdir for screenshots>
const { chromium } = require('playwright');
const [URL, OUT] = process.argv.slice(2);
const LONG = ['Bartholomew Featherstonehaugh', 'Maximilian Montgomery-Smythe', 'Christopher Fitzwilliam-Harrington',
  'Fionnuala Ní Mhaonaigh', 'Alexander Cholmondeley', 'Seraphina Wolstenholme', 'Bartholomew Featherstonehaugh-Jones',
  'Konstantinos Papadopoulos', 'Gwendolyn Postlethwaite', 'Theodore Worthington-Brown', 'Evangeline Braithwaite',
  'Sebastian Marjoribanks', 'Ultan Featherstonehaugh'];
(async () => {
  const b = await chromium.launch(); let bad = 0;
  for (const [tag, w, h, z] of [['360', 360, 740, 1], ['390-135', 390, 844, 1.35]]) {
    const p = await (await b.newContext({ viewport: { width: w, height: h }, hasTouch: true })).newPage();
    await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.goto('about:blank'); await p.goto(URL + '#scenario=westport');
    await p.waitForFunction(() => window.__ncgs && window.__ncgs.D.round('fx-wp2'));
    if (z !== 1) await p.addStyleTag({ content: `html{font-size:${z * 100}%}` });
    for (const view of ['board', 'tee']) {
      const r = await p.evaluate(([L, view]) => { const n = window.__ncgs; const ms = n.DB.server.tables.members.slice().sort((a, b) => a.id.localeCompare(b.id));
        ms.forEach((m, i) => { m.name = L[i % L.length]; m.full = L[i % L.length]; }); n.DB._view = null; n.DB._memo = {};
        if (view === 'board') { n.UI.board = 'fx-wp2'; n.UI.res = 'lb'; n.UI.stack = [{ v: 'home', p: {} }, { v: 'board', p: {} }]; }
        else n.UI.stack = [{ v: 'home', p: {} }, { v: 'tee', p: { rid: 'fx-wp2' } }];
        n.render(); window.scrollTo(0, 0);
        const out = [];
        for (const e of document.querySelectorAll('.scr-pd b, .scr-drv .scr-dn, .scr-name > b')) {
          const box = e.getBoundingClientRect();
          if (e.scrollWidth > e.clientWidth + 1) out.push('overflow: ' + e.textContent);
          // a word split across lines shows up as one word giving more than one line box
          const t = e.firstChild; if (!t || t.nodeType !== 3) continue;
          const s = t.textContent; let i = 0;
          for (const word of s.split(/(\s+|(?<=-))/).filter(x => x !== undefined)) { if (word.trim()) { const rg = document.createRange(); rg.setStart(t, i); rg.setEnd(t, i + word.length);
            const tops = new Set([...rg.getClientRects()].filter(q => q.width > 0.5).map(q => Math.round(q.top))); if (tops.size > 1) out.push('split: "' + word + '" in ' + e.className + e.parentElement.className); } i += word.length; }
        }
        return out; }, [LONG, view]);
      await p.waitForTimeout(150);
      await p.screenshot({ path: `${OUT}/${view}-${tag}.png`, fullPage: true });
      console.log((r.length ? 'FAIL ' : 'PASS ') + view + ' ' + tag + (r.length ? '\n  ' + [...new Set(r)].join('\n  ') : '')); bad += r.length;
    }
  }
  await b.close(); process.exit(bad ? 1 : 0);
})();
