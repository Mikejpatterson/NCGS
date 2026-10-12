// Testing mode: while on (default) the organiser can delete a finished round with scores; switched off, only unstarted rounds.
// Run: python3 -m http.server 8765 -d dist & NODE_PATH=/opt/npm-tools/node_modules node test/testing.run.js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  let ok = true; const errs = [];
  const check = (n, c) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n); if (!c) ok = false; };
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:8765/preview.html'); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForSelector('.brand');
  const text = () => pg.textContent('#app');
  const tap = async s => { await pg.click(s); await pg.waitForTimeout(150); };
  const open = async rid => pg.evaluate(rid => { const n = window.__ncgs; n.ORGPIN.pin = '1234'; n.UI.org = true; n.UI.orgUnlocked = true; n.UI.confirm = null; n.UI.orgStack = [{ v: 'home', p: {} }, { v: 'round', p: { rid } }]; n.render(); }, rid);
  // an organiser-made round that is finished and has scores (imported rounds are never deletable)
  const fin = await pg.evaluate(() => {
    const n = window.__ncgs; n.ORGPIN.pin = '1234';
    const base = n.D.rounds().find(r => r.id === 'demo-cabopino');
    n.put('rounds', [Object.assign({}, base, { id: 'test-final', source: 'organiser', status: 'final', name: 'Test final' })]);
    const pid = n.D.members()[0].id; n.put('scores', [1, 2, 3].map(h => ({ round: 'test-final', player: pid, hole: h, strokes: 5, by: 'test', at: '' })));
    return n.flush().then(() => n.sync()).then(() => 'test-final');
  });
  await pg.waitForTimeout(300);
  const scoresOf = id => pg.evaluate(id => Object.values(window.__ncgs.D.scores(id)).reduce((n, h) => n + Object.keys(h).length, 0), id);
  const n0 = await scoresOf(fin);
  await open(fin);
  check('testing is on by default and a finished round with scores shows Delete round', await pg.evaluate(() => window.__ncgs.D.testing()) && /Delete round/.test(await text()));
  await tap('[data-act="delete-round"]');
  check('first tap asks to confirm and names the scores', /Tap again to delete the round/.test(await text()) && (n0 === 0 || /scores?/.test(await text())));
  await open(fin);
  // switch testing off in Settings
  await pg.evaluate(() => { window.__ncgs.UI.orgStack = [{ v: 'home', p: {} }, { v: 'settings', p: {} }]; window.__ncgs.render(); });
  check('Settings has a Testing mode switch showing on', /Testing mode/.test(await text()) && await pg.$('.switch.on'));
  await tap('[data-act="testing-toggle"]');
  check('toggling turns testing off', !(await pg.evaluate(() => window.__ncgs.D.testing())) && !(await pg.$('.switch.on')) && /Off: only rounds/.test(await text()));
  await open(fin);
  check('with testing off a finished round cannot be deleted', !/Delete round/.test(await text()) && !(await pg.$('[data-act="delete-round"]')));
  await pg.evaluate(() => { window.__ncgs.UI.orgStack = [{ v: 'home', p: {} }, { v: 'settings', p: {} }]; window.__ncgs.render(); });
  await tap('[data-act="testing-toggle"]');
  check('and toggling back on restores it', await pg.evaluate(() => window.__ncgs.D.testing()));
  await open(fin);
  await tap('[data-act="delete-round"]'); await tap('[data-act="delete-round"]');
  await pg.evaluate(() => window.__ncgs.flush().then(() => window.__ncgs.sync())); await pg.waitForTimeout(300);
  check('two taps delete the round and its scores', !(await pg.evaluate(f => !!window.__ncgs.D.round(f), fin)) && (await scoresOf(fin)) === 0);
  check('no script errors', errs.length === 0);
  if (errs.length) console.log(errs);
  await b.close();
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
