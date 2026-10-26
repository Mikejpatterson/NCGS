// Breakfast draw on two devices against a local copy of the real server (owner brief §7; Codex's review on issue #1,
// 26 October): one device runs the draw once the server confirms it; a spectator can't draw; a reload mid-spin replays
// the saved pick; a double tap draws once; pots fixed after the first pick; an offline pick flushes later; a handover
// while the old device is offline turns its late pick into a visible clash that blocks the groups; restart; groups made.
// Run: node tools/devserver.js 8766 & node test/draw-phones.run.js   (needs a full build with the fixture as seed)
const { chromium } = require('playwright');
const BASE = 'http://localhost:8766';
let ok = true; const errs = [];
const check = (n, c, extra) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (!c && extra ? '   [' + extra + ']' : '')); if (!c) ok = false; };
const api = async req => (await fetch(BASE + '/api', { method: 'POST', body: JSON.stringify(req) })).json();
const state = async () => (await fetch(BASE + '/__state')).json();
const setting = async k => { const s = (await state()).tables.settings.find(x => x.key === k); return s ? s.value : null; };
const pickRows = async (ep = 1) => (await state()).tables.settings.filter(x => x.key.indexOf(`draw:drw:${ep}:`) === 0);
let browser;

async function device(name, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, serviceWorkers: 'block' });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errs.push(name + ': ' + e.message));
  await pg.goto(BASE + '/'); await pg.waitForSelector('.brand');
  const d = { ctx, pg, name };
  d.sync = () => pg.evaluate(() => window.__ncgs.flush().then(() => window.__ncgs.sync())).catch(() => {});
  d.open = async (v = 'draw', rid = 'drw') => { await pg.evaluate(([v, rid]) => { const x = window.__ncgs; x.UI.org = true; x.UI.orgUnlocked = true; x.ORGPIN.pin = '1234'; x.UI.orgStack = [{ v: 'home', p: {} }, { v: 'round', p: { rid } }, { v, p: { rid } }]; x.render(); }, [v, rid]); await pg.waitForTimeout(150); };
  d.has = sel => pg.locator(sel).count().then(n => n > 0);
  d.text = () => pg.locator('main').innerText();
  d.act = (act, data) => pg.evaluate(([act, data]) => { const b = document.createElement('button'); b.dataset.act = act; Object.assign(b.dataset, data); document.body.appendChild(b); b.click(); b.remove(); }, [act, data || {}]);
  d.tap = async sel => { await pg.click(sel, { timeout: 3000 }); await pg.waitForTimeout(120); };
  d.skip = () => pg.click('[data-act="draw-skip"]', { timeout: 800 }).catch(() => {});
  // Starting the draw is one tap; taking over from another device asks for a second.
  d.claim = async () => { await d.tap('[data-act="draw-claim"]'); if (/Tap again/.test(await pg.locator('[data-act="draw-claim"]').innerText().catch(() => ''))) await d.tap('[data-act="draw-claim"]');
    await pg.waitForTimeout(1500); await d.sync(); await pg.waitForTimeout(200); };
  d.dev = () => pg.evaluate(() => window.__ncgs.DB.prefs.dev);
  return d;
}

(async () => {
  browser = await chromium.launch();
  try {
    await fetch(BASE + '/__reset', { method: 'POST' });
    const st0 = await state();
    const extra = [13, 14, 15, 16].map(i => ({ id: 'dp' + i, name: 'Extra' + i, full: 'Extra' + i + ' Fixture', index: 10 + i, active: true }));
    await api({ op: 'put', table: 'members', rows: extra, pin: '1234' });
    const ids = st0.tables.members.filter(m => m.id.indexOf('guest') !== 0).map(m => m.id).concat(extra.map(m => m.id)).slice(0, 16);
    const pots = [0, 1, 2, 3].map(k => ids.slice(k * 4, k * 4 + 4));
    const c = st0.tables.courses.find(x => x.holes && x.tees);
    const r = { id: 'drw', season: 2026, seq: 97, date: '2026-10-31', name: 'Draw test', course: c.id, tee: Object.keys(c.tees)[0], first_tee: '10:00', interval: 10, status: 'upcoming', source: 'organiser', groups: [], contests: [], kb: null };
    await api({ op: 'put', table: 'rounds', rows: [r], pin: '1234' });
    await api({ op: 'put', table: 'settings', rows: [{ key: 'format:drw', value: 'scramble' }, { key: 'pots:drw', value: JSON.stringify({ pots, show: true }) }], pin: '1234' });

    const A = await device('iPad', 1024, 1366), B = await device('phone', 390, 844);
    await A.sync(); await B.sync();

    // 1. Choosing the draw device needs the server to confirm it.
    await A.open();
    check('1. before a device is chosen there is no Draw button', !(await A.has('[data-act="draw-go"]')) && await A.has('[data-act="draw-claim"]'));
    await A.claim();
    check('   the iPad becomes the draw device once the server confirms it', JSON.parse(await setting('drawdev:drw')).dev === await A.dev() && await A.has('[data-act="draw-go"]'));

    // 2. A spectator can't draw, even through the action itself.
    await B.sync(); await B.open();
    check('2. the phone watches: no Draw button, it says another device is drawing', !(await B.has('[data-act="draw-go"]')) && /another device/.test(await B.text()));
    await B.act('draw-go', { rid: 'drw' }); await B.sync();
    check('   the draw action on the phone draws nothing', (await pickRows()).length === 0);

    // 3. A pick is saved before the wheel turns; a reload mid-spin replays it and never draws again.
    await A.tap('[data-act="draw-go"]'); await A.pg.waitForSelector('.drw-cell.spin', { timeout: 5000 }).catch(() => {});
    const queued = await A.pg.evaluate(() => window.__ncgs.view().settings.filter(s => s.key.indexOf('draw:drw:1:') === 0).map(s => s.key + '=' + s.value));
    const spinning = await A.has('.drw-cell.spin');
    check('3. the pick is saved on the device before its wheel turns', queued.length === 1 && spinning);
    await A.pg.reload(); await A.pg.waitForSelector('.brand'); await A.sync(); await A.open();
    const afterReload = await pickRows();
    check('   a reload mid-spin keeps the same pick and draws nobody new', afterReload.length === 1 && afterReload[0].key + '=' + afterReload[0].value === queued[0]);
    await A.skip(); await A.pg.waitForTimeout(100);
    const firstPid = JSON.parse(afterReload[0].value).pid;
    check('   the name shows after the reload', (await A.text()).includes((st0.tables.members.concat(extra).find(m => m.id === firstPid) || {}).name));

    // 4. A double tap draws once.
    await A.pg.evaluate(() => { const b = document.querySelector('[data-act="draw-go"]'); b.click(); b.click(); document.querySelector('[data-act="draw-go"]') && document.querySelector('[data-act="draw-go"]').click(); });
    await A.pg.waitForTimeout(1500); await A.sync();
    check('4. a double tap draws one name, not two', (await pickRows()).length === 2);
    await A.skip();

    // 5. Pots are fixed once the draw has started (the action refuses, not just the screen).
    const potsBefore = await setting('pots:drw');
    await A.act('draw-pot', { rid: 'drw', pid: pots[0][0], p: '3' }); await A.sync();
    check('5. the pots cannot change once a name is drawn', (await setting('pots:drw')) === potsBefore);

    // 6. The spectator follows the draw.
    await B.sync(); await B.open();
    const bText = await B.text();
    check('6. the phone shows the names drawn so far', (await pickRows()).every(rw => bText.includes((st0.tables.members.concat(extra).find(m => m.id === JSON.parse(rw.value).pid) || {}).name)));

    // 7. Offline: the draw device carries on; the pick waits on the device and reaches the server later.
    await A.ctx.setOffline(true);
    await A.tap('[data-act="draw-go"]'); await A.pg.waitForTimeout(800); await A.skip();
    check('7. offline, the iPad still draws (the pick waits on the device)', (await pickRows()).length === 2 && await A.pg.evaluate(() => window.__ncgs.DB.outbox.length) === 1);
    await A.ctx.setOffline(false); await A.sync(); await A.pg.waitForTimeout(300);
    check('   back online, the pick reaches the server', (await pickRows()).length === 3);

    // 8. Handover while the old device is offline: its late pick is a visible clash, and the groups wait.
    await A.ctx.setOffline(true);
    await B.sync(); await B.open(); await B.claim();
    check('8. the phone takes over online; the server confirms it', JSON.parse(await setting('drawdev:drw')).dev === await B.dev() && await B.has('[data-act="draw-go"]'));
    check('   the takeover is in the change log', (await state()).tables.log.some(l => /taken over/.test(l.detail || '')));
    await A.tap('[data-act="draw-go"]'); await A.pg.waitForTimeout(800); await A.skip();   // the iPad still thinks it is the draw device
    await A.ctx.setOffline(false); await A.sync(); await A.pg.waitForTimeout(300);
    await B.sync(); await B.open();
    check('   the iPad\'s late pick reaches the server but shows as a clash, not a result', (await pickRows()).length === 4 && /Two devices drew/.test(await B.text()));
    await A.open();
    check('   the iPad now only watches', !(await A.has('[data-act="draw-go"]')));
    await B.open('drawlineup'); await B.act('draw-make', { rid: 'drw' }); await B.act('draw-make', { rid: 'drw' }); await B.sync();
    check('   the groups cannot be made while there is a clash', !((await state()).tables.rounds.find(x => x.id === 'drw').groups || []).length);

    // 9. Restart: a logged fresh draw (epoch 2); everyone back in their pots.
    await B.open('drawhome'); await B.tap('[data-act="draw-restart"]'); await B.tap('[data-act="draw-restart"]'); await B.sync();
    check('9. a restart starts a fresh draw and is logged', (await setting('drawepoch:drw')) === '2' && (await state()).tables.log.some(l => /Draw restarted/.test(l.detail || '')));
    await B.open();
    check('   back to team 1 with nobody drawn', /Team 1/.test(await B.text()) && !(await B.has('.drw-cell.got')));

    // 10. All four together, to the end; then the groups.
    await B.tap('[data-act="org-go"][data-v="draw"]').catch(() => {});
    await B.pg.evaluate(() => { const b = document.createElement('button'); b.dataset.act = 'draw-pace'; b.dataset.rid = 'drw'; b.dataset.v = 'all'; document.body.appendChild(b); b.click(); b.remove(); });
    await B.sync(); await B.open();
    for (let i = 0; i < 30; i++) {
      const what = await B.pg.evaluate(() => { const n = document.querySelector('[data-act="draw-next"]'); return n ? 'next:' + n.innerText : document.querySelector('[data-act="draw-go"]') ? 'go' : 'wait'; });
      if (what.startsWith('next:See')) { await B.tap('[data-act="draw-next"]'); break; }
      if (what.startsWith('next')) await B.tap('[data-act="draw-next"]');
      else if (what === 'go') { await B.tap('[data-act="draw-go"]'); await B.pg.waitForTimeout(400); await B.skip(); }
      else await B.pg.waitForTimeout(400);
    }
    await B.sync(); await B.pg.waitForTimeout(200); await B.open('drawlineup');
    await B.pg.waitForTimeout(1500); await B.sync(); await B.open('drawlineup'); await B.pg.waitForTimeout(800); await B.sync();
    check('10. twelve drawn four at a time; the last team is whoever is left, not drawn', (await pickRows(2)).length === 12);
    const groups = (await state()).tables.rounds.find(x => x.id === 'drw').groups || [];
    const all = groups.flatMap(g => g.teams.flat());
    check('   the teams become the groups by themselves: four of four, everyone once, one from each pot, tee times in draw order',
      groups.length === 4 && groups.every(g => g.teams.flat().length === 4) && new Set(all).size === 16
      && groups.every(g => pots.every(pt => g.teams.flat().filter(pid => pt.includes(pid)).length === 1))
      && groups.map(g => g.teeTime).join(',') === '10:00,10:10,10:20,10:30', JSON.stringify(groups.map(g => g.teams)));

    // 10b. Finishing is one write: the groups carry the draw's mark, so no phone sees groups with the draw still open.
    check('   the groups and "finished" are one row: every group carries the draw\'s mark', groups.every(g => g.draw === 2));
    await A.sync(); await A.open('drawhome');
    check('   the other device sees the draw finished, with no restart offered', !(await A.has('[data-act="draw-restart"]')) && await A.pg.evaluate(() => (window.__ncgs.D.round('drw').groups || []).length === 4));
    const savedBefore = (await state()).tables.log.filter(l => /from the breakfast draw/.test(l.detail || '')).length;
    await B.open('drawlineup'); await B.act('draw-make', { rid: 'drw' }); await B.act('draw-make', { rid: 'drw' }); await B.sync();
    check('   making the groups again is refused (one "Groups saved")', savedBefore === 1 && (await state()).tables.log.filter(l => /from the breakfast draw/.test(l.detail || '')).length === 1);

    // 11. Once the groups are made the draw is closed.
    await B.act('draw-restart', { rid: 'drw' }); await B.act('draw-restart', { rid: 'drw' });
    await A.act('draw-claim', { rid: 'drw' }); await A.act('draw-claim', { rid: 'drw' }); await A.pg.waitForTimeout(800); await A.sync(); await B.sync();
    check('11. after the groups are made, no restart and no takeover', (await setting('drawepoch:drw')) === '2' && JSON.parse(await setting('drawdev:drw')).dev === await B.dev());

    // 12. Two devices claim the draw at the same moment. The server has no compare-and-set, so both may briefly be
    //     confirmed; each pick checks the server first, and anything both still draw is a visible clash, never a result.
    const r2 = Object.assign({}, r, { id: 'drw2', name: 'Draw test 2', groups: [] });
    await api({ op: 'put', table: 'rounds', rows: [r2], pin: '1234' });
    await api({ op: 'put', table: 'settings', rows: [{ key: 'format:drw2', value: 'scramble' }, { key: 'pots:drw2', value: JSON.stringify({ pots, show: false }) }], pin: '1234' });
    await A.sync(); await B.sync(); await A.open('draw', 'drw2'); await B.open('draw', 'drw2');
    await Promise.all([A.pg.click('[data-act="draw-claim"]'), B.pg.click('[data-act="draw-claim"]')]);
    await A.pg.waitForTimeout(1800); await A.sync(); await B.sync(); await A.open('draw', 'drw2'); await B.open('draw', 'drw2');
    await Promise.all([A.pg.click('[data-act="draw-go"]', { timeout: 1500 }).catch(() => {}), B.pg.click('[data-act="draw-go"]', { timeout: 1500 }).catch(() => {})]);
    await A.pg.waitForTimeout(1500); await A.sync(); await B.sync(); await A.sync();
    const holder = JSON.parse(await setting('drawdev:drw2')).dev, devs = [await A.dev(), await B.dev()];
    const rows2 = (await state()).tables.settings.filter(x => x.key.indexOf('draw:drw2:1:') === 0);
    const fromDevs = new Set(rows2.map(x => x.key.split(':').slice(5).join(':')));
    const H = holder === devs[0] ? A : B, O = holder === devs[0] ? B : A;
    await H.open('draw', 'drw2'); await O.open('draw', 'drw2');
    check('12. two devices claiming at once: one holder on the server; the other only watches', devs.includes(holder) && !(await O.has('[data-act="draw-go"]')));
    const clashShown = /Two devices drew/.test(await H.text());
    check('   any picks are from one device, or both show as a clash that blocks the groups', fromDevs.size <= 1 || clashShown, `${rows2.length} rows from ${fromDevs.size} devices`);
    console.log('      (this run: ' + rows2.length + ' pick(s) from ' + fromDevs.size + ' device(s))');

    await A.ctx.close(); await B.ctx.close();
    check('no script errors', errs.length === 0, errs.join(' | '));
  } catch (e) { console.error(e); ok = false; } finally { await browser.close(); }
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
