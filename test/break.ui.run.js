// Break the screens: hostile text, silly numbers, empty and bogus data, every screen, other time zones and sizes.
const { chromium } = require('playwright');
const URL = 'http://localhost:8765/preview.html';
let ok = true;
const check = (n, c, extra) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (!c && extra ? '   [' + extra + ']' : '')); if (!c) ok = false; };
const VIEWS = ['home', 'rounds', 'players', 'goy', 'stats', 'round', 'player', 'card', 'who', 'tee', 'entry', 'after', 'check', 'finish', 'hcp', 'board', 'trip', 'results', 'rules'];
const ORGS = ['lock', 'home', 'round', 'details', 'playing', 'groupsview', 'kb', 'group', 'correct', 'contest', 'members', 'member', 'courses', 'course', 'settings', 'log', 'export', 'guest', 'late'];
(async () => {
  const b = await chromium.launch();
  const open = async (opts = {}) => {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 390, height: 844 }, hasTouch: true }, opts));
    const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', e => errs.push(e.message));
    pg.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await pg.goto(URL); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForSelector('.brand');
    pg.errs = errs; return pg;
  };
  const show = (pg, v, p, org) => pg.evaluate(([v, p, org]) => { const n = window.__ncgs; n.ORGPIN.pin = '1234'; n.UI.org = !!org; n.UI.orgUnlocked = true; const s = [{ v: 'home', p: {} }, { v, p }]; if (org) n.UI.orgStack = s; else n.UI.stack = s; n.UI.confirm = null; n.render(); }, [v, p || {}, !!org]);

  /* 1. hostile text never becomes markup */
  let pg = await open();
  const evil = '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script>"\'&amp;';
  await pg.evaluate(evil => {
    const n = window.__ncgs; n.ORGPIN.pin = '1234';
    const base = n.D.round('demo-cabopino');
    const m = n.D.members()[0];
    n.put('members', [Object.assign({}, m, { name: evil, full: evil })]);
    n.put('rounds', [Object.assign({}, base, { id: 'evil-1', name: evil, source: 'organiser', status: 'upcoming', note: evil })]);
    n.put('settings', [{ key: 'society', value: evil }]);
    const c = n.D.course('cabopino'); n.put('courses', [Object.assign({}, c, { name: evil, area: evil, about: evil })]);
  }, evil);
  await pg.waitForTimeout(400);
  await pg.evaluate(() => { window.__ncgs.DB.renderFaults = 0; window.__ncgs.DB.faultLog = []; });
  for (const v of VIEWS.filter(v => !['tee', 'entry', 'after', 'check', 'finish', 'hcp'].includes(v))) { await show(pg, v, { rid: 'evil-1', pid: (await pg.evaluate(() => window.__ncgs.D.members()[0].id)), cid: 'cabopino' }); }
  for (const v of ORGS.filter(v => !['group', 'correct', 'contest', 'lock'].includes(v))) { await show(pg, v, { rid: 'evil-1', pid: (await pg.evaluate(() => window.__ncgs.D.members()[0].id)), cid: 'cabopino' }, true); }
  check('hostile names and notes never run as script', (await pg.evaluate(() => window.__xss)) === undefined);
  await show(pg, 'players');
  check('they are shown as plain text', !(await pg.$('#app img[src="x"]')) && /<img/.test(await pg.textContent('#app')));
  check('no screen failed to draw with hostile text', (await pg.evaluate(() => window.__ncgs.DB.renderFaults || 0)) === 0, await pg.evaluate(() => (window.__ncgs.DB.faultLog || []).slice(0, 8).join(' ; ')));
  check('no script errors rendering with hostile text', pg.errs.length === 0, pg.errs.slice(0, 2).join(' | '));
  await pg.context().close();

  /* 2. member form: silly numbers and names */
  pg = await open();
  await pg.evaluate(() => { const n = window.__ncgs; n.ORGPIN.pin = '1234'; n.UI.org = true; n.UI.orgUnlocked = true; n.UI.orgStack = [{ v: 'home', p: {} }]; n.render(); });
  const addMember = async (name, idx) => {
    await pg.evaluate(() => { const n = window.__ncgs; n.UI.org = true; n.UI.formState = null; n.UI.formError = null; n.UI.orgStack = [{ v: 'home', p: {} }, { v: 'members', p: {} }, { v: 'member', p: { pid: '' } }]; n.render(); });
    await pg.fill('#m-name', name); await pg.fill('#m-index', idx);
    await pg.click('form[data-form="member"] button[type="submit"]'); await pg.waitForTimeout(200);
    return pg.evaluate(() => ({ err: (document.querySelector('.err') || {}).textContent || '', n: window.__ncgs.D.members().length }));
  };
  const n0 = await pg.evaluate(() => window.__ncgs.D.members().length);
  for (const [name, idx, label] of [['', '12', 'no name'], ['Tester', '', 'no index'], ['Tester', 'abc', 'letters'], ['Tester', '99', 'too high'], ['Tester', '-20', 'too low'], ['Tester', '54.1', 'just over'], ['  ', '10', 'blank name'], ['Tester', '1e2', 'exponent'], ['Tester', 'NaN', 'NaN'], ['Tester', 'Infinity', 'Infinity']]) {
    const r = await addMember(name, idx);
    check(`member form refuses ${label}`, r.n === n0 && r.err.length > 0, `members ${r.n}, error "${r.err}"`);
  }
  for (const [name, idx, want, label] of [['Plus Man', '+3.4', -3.4, 'plus handicap'], ['Comma Man', '12,6', 12.6, 'comma decimal'], ['Max Man', '54', 54, 'index 54'], ['Spacey', '  18.2  ', 18.2, 'spaces round the number']]) {
    const r = await addMember(name, idx);
    const got = await pg.evaluate(nm => (window.__ncgs.D.members().find(m => m.name === nm) || {}).index, name);
    check(`member form accepts ${label}`, got === want, `got ${got}`);
  }
  const dup = await addMember('plus man', '10');
  check('duplicate names are refused whatever the capitals', /already/.test(dup.err));
  const long = 'W'.repeat(120);
  await addMember(long, '10');
  await show(pg, 'players'); await show(pg, 'goy'); await show(pg, 'stats');
  check('a very long name does not push a screen sideways', await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  const emoji = await addMember('Seán Ó Briain ⛳🏌️', '15');
  check('accents and emoji are fine', (await pg.evaluate(() => window.__ncgs.D.members().some(m => m.name.includes('⛳')))));
  check('no script errors in the forms', pg.errs.length === 0, pg.errs.slice(0, 2).join(' | '));
  await pg.context().close();

  /* 3. every screen with bogus ids and with no data at all */
  pg = await open();
  for (const v of VIEWS) await show(pg, v, { rid: 'nope', pid: 'nobody', cid: 'nowhere', gid: 'g9', n: 99 });
  for (const v of ORGS) await show(pg, v, { rid: 'nope', pid: 'nobody', cid: 'nowhere', gid: 'g9', n: 99 }, true);
  check('bogus ids never throw out of the app', pg.errs.filter(e => !/Failed to load resource/.test(e)).length === 0, pg.errs.slice(0, 3).join(' | '));
  await pg.evaluate(() => { const n = window.__ncgs; Object.keys(n.DB.server.tables).forEach(t => { n.DB.server.tables[t] = []; }); n.DB._view = null; n.DB._memo = {}; });
  for (const v of VIEWS) await show(pg, v, {});
  for (const v of ORGS) await show(pg, v, {}, true);
  check('every screen copes with a completely empty database', pg.errs.filter(e => !/Failed to load resource/.test(e)).length === 0, pg.errs.slice(0, 3).join(' | '));
  await pg.context().close();

  /* 4. odd rounds: no date, bad date, no groups, one player, three players */
  pg = await open();
  await pg.evaluate(() => {
    const n = window.__ncgs; n.ORGPIN.pin = '1234'; const base = n.D.round('demo-cabopino');
    const mk = (id, over) => n.put('rounds', [Object.assign({}, base, { id, name: id, source: 'organiser', status: 'upcoming', season: 2026 }, over)]);
    mk('odd-nodate', { date: null }); mk('odd-baddate', { date: '2026-13-45' }); mk('odd-future', { date: '2031-01-01' }); mk('odd-nogroups', { groups: null });
    mk('odd-one', { groups: [{ id: 'g1', n: 1, teeTime: '10:00', startHole: 1, teams: [[base.groups[0].teams[0][0]]] }] });
    mk('odd-three', { groups: [{ id: 'g1', n: 1, teeTime: '10:00', startHole: 1, teams: [base.groups[0].teams[0], [base.groups[0].teams[1][0]]] }] });
    mk('odd-nocourse', { course: 'nowhere' }); mk('odd-notee', { tee: 'nope' });
  });
  await pg.evaluate(() => window.__ncgs.flush().then(() => window.__ncgs.sync())); await pg.waitForTimeout(300);
  for (const rid of ['odd-nodate', 'odd-baddate', 'odd-future', 'odd-nogroups', 'odd-one', 'odd-three', 'odd-nocourse', 'odd-notee']) {
    for (const v of ['round', 'board', 'trip', 'results']) { await pg.evaluate(rid => { window.__ncgs.UI.board = rid; }, rid); await show(pg, v, { rid, pid: 'mike-p' }); }
    for (const v of ['round', 'details', 'playing', 'groupsview', 'kb', 'late']) await show(pg, v, { rid }, true);
  }
  check('odd rounds (no date, bad date, no groups, one player, no course) never throw', pg.errs.filter(e => !/Failed to load resource/.test(e)).length === 0, pg.errs.slice(0, 3).join(' | '));
  check('and every screen that takes a round id could be drawn', (await pg.evaluate(() => window.__ncgs.DB.renderFaults || 0)) === 0, (await pg.evaluate(() => (window.__ncgs.DB.faultLog || []).slice(0, 8).join(' ; '))));
  await pg.evaluate(() => { const n = window.__ncgs; n.UI.org = false; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); });
  check('a round with a bad date does not print "NaN" or "undefined" on the home page', !/NaN|undefined|Invalid/.test(await pg.textContent('#app')));
  await pg.context().close();

  /* 5. time zones: a date is the same day everywhere */
  for (const tz of ['Europe/Dublin', 'America/Los_Angeles', 'Pacific/Auckland', 'Asia/Kolkata', 'UTC']) {
    pg = await open({ timezoneId: tz });
    await pg.evaluate(() => { const n = window.__ncgs; n.ORGPIN.pin = '1234'; const base = n.D.round('demo-cabopino'); n.put('rounds', [Object.assign({}, base, { id: 'tz-1', name: 'TZ round', source: 'organiser', status: 'upcoming', date: '2026-10-20', season: 2026 })]); });
    await pg.waitForTimeout(300);
    const shown = await pg.evaluate(() => { const n = window.__ncgs; return n.fmtDate('2026-10-20', true) + '|' + n.fmtDate('2026-03-29') + '|' + n.daysFromToday(n.todayIso()); });
    check(`dates read the same in ${tz}`, shown === 'Tue 20 Oct|Sunday 29 March|0', shown);
    await pg.context().close();
  }

  /* 6. screen sizes */
  for (const [w, h] of [[320, 568], [375, 667], [414, 896], [768, 1024], [1280, 800]]) {
    pg = await open({ viewport: { width: w, height: h } });
    const bad = [];
    for (const v of ['home', 'rounds', 'players', 'goy', 'stats', 'board', 'rules']) {
      await show(pg, v);
      const over = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (over > 1) bad.push(v + '+' + over);
    }
    await show(pg, 'home', {}, true);
    check(`nothing runs off the side at ${w}px wide`, bad.length === 0, bad.join(','));
    check(`no script errors at ${w}px`, pg.errs.length === 0, pg.errs.slice(0, 2).join(' | '));
    await pg.context().close();
  }

  /* 7. touch targets: every button people press is big enough */
  pg = await open();
  const small = [];
  for (const v of ['home', 'rounds', 'players', 'goy', 'stats', 'board', 'round', 'tee', 'entry']) {
    await show(pg, v, { rid: 'demo-cabopino', pid: 'mike-p' });
    const r = await pg.evaluate(v => [...document.querySelectorAll('#app button, #app a, #tabs button')].filter(e => e.offsetParent !== null).map(e => { const r = e.getBoundingClientRect(); return { v, t: (e.textContent || e.getAttribute('aria-label') || e.className).trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height) }; }).filter(x => x.h < 40 || x.w < 40), v);
    small.push(...r);
  }
  const uniq = [...new Map(small.map(x => [x.v + x.t, x])).values()];
  check('every button is at least 40px each way (the small ones are listed)', uniq.length === 0, uniq.slice(0, 8).map(x => `${x.v}:"${x.t}" ${x.w}x${x.h}`).join('; '));
  await pg.context().close();

  /* 8. a big society: 12 players, 25 finished rounds */
  pg = await open();
  const t = await pg.evaluate(() => {
    const n = window.__ncgs; n.ORGPIN.pin = '1234';
    const base = n.D.rounds().find(r => r.source === 'imported'); const rows = [];
    for (let i = 0; i < 25; i++) rows.push(Object.assign({}, base, { id: 'big-' + i, name: 'Big ' + i, date: '2025-' + String((i % 12) + 1).padStart(2, '0') + '-10', season: 2025 - (i % 3), seq: i + 1 }));
    n.put('rounds', rows);
    const t0 = performance.now();
    for (const v of ['home', 'rounds', 'players', 'goy', 'stats']) { n.UI.org = false; n.UI.stack = [{ v, p: {} }]; n.render(); }
    return Math.round(performance.now() - t0);
  });
  check('five main screens render quickly with 25 more rounds', t < 1500, t + ' ms');
  check('no script errors with a big society', pg.errs.length === 0, pg.errs.slice(0, 2).join(' | '));
  await pg.context().close();

  await b.close();
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
