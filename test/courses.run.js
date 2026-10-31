// Ready-made courses (owner, 27 October): Athenry's card is filled in with one tap, or added from the Courses list,
// instead of typing 18 pars and indexes and the tee ratings by hand.
const { chromium } = require('playwright');
const URL = process.env.NCGS_TEST_URL || 'http://localhost:8765/preview.html';
let ok = true; const errs = [];
const check = (n, c, extra) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (!c && extra ? '   [' + extra + ']' : '')); if (!c) ok = false; };
(async () => {
  const b = await chromium.launch();
  try {
    const pg = await (await b.newContext({ viewport: { width: 360, height: 780 }, hasTouch: true })).newPage();
    pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(URL); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForSelector('.brand');
    const org = (v, p) => pg.evaluate(([v, p]) => { const n = window.__ncgs; n.ORGPIN.pin = '1234'; n.UI.org = true; n.UI.orgUnlocked = true; n.UI.formState = null; n.UI.orgStack = [{ v: 'home', p: {} }, { v: 'courses', p: {} }].concat(v === 'courses' ? [] : [{ v, p }]); n.render(); }, [v, p]);
    const text = () => pg.locator('main').innerText();
    const sync = () => pg.evaluate(() => window.__ncgs.flush().then(() => window.__ncgs.sync()));

    // 1. Not yet a course: offered on the Courses list, added in one tap.
    await org('courses', {});
    check('Courses offers Athenry under Ready to add', /Ready to add/.test(await text()) && /Athenry/.test(await text()));
    await pg.click('[data-act="course-add-lib"][data-name="Athenry"]'); await pg.waitForTimeout(200); await sync();
    let c = await pg.evaluate(() => window.__ncgs.D.courses().find(x => x.name === 'Athenry'));
    const good = c => c && c.holes && c.holes.length === 18 && c.holes.reduce((t, h) => t + h.par, 0) === 70
      && c.holes.map(h => h.si).sort((a, b) => a - b).join() === Array.from({ length: 18 }, (_, i) => i + 1).join()
      && c.holes[6].si === 1 && c.holes[9].si === 18 && c.tees.white.slope === 124 && c.tees.white.rating === 71.2 && c.tees.green.slope === 117 && c.tees.green.rating === 69.2;
    check('the added course has par 70, every index once (7th is 1, 10th is 18) and both tees rated', good(c), JSON.stringify(c && c.tees));
    check('once added it is no longer offered', !(await pg.$('[data-act="course-add-lib"][data-name="Athenry"]')));

    // 2. Already made by hand with no card (as on the owner's phone): one tap fills it in, keeping its id.
    await pg.evaluate(() => { const n = window.__ncgs; const a = n.D.courses().find(x => x.name === 'Athenry'); n.send({ op: 'remove', table: 'courses', rows: [{ id: a.id }], pin: '1234' }); n.put('courses', [{ id: 'athenry-hand', name: 'Athenry', area: '', about: '', tees: null, holes: null }]); });
    await sync();
    await org('course', { cid: 'athenry-hand' });
    check('a card-less Athenry offers "Fill in the Athenry card"', !!(await pg.$('[data-act="course-fill"]')));
    const over = await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    check('the course screen fits a 360px phone', !over);
    await pg.click('[data-act="course-fill"]'); await pg.waitForTimeout(200); await sync();
    c = await pg.evaluate(() => window.__ncgs.D.course('athenry-hand'));
    check('one tap fills in the card on the same course', good(c), JSON.stringify(c && c.tees));
    check('and the fill-in button goes once the card is there', !(await pg.$('[data-act="course-fill"]')));
    check('the change is in the log', await pg.evaluate(() => window.__ncgs.DB.server.tables.log.some(l => l.action === 'Course card filled in')));
    // a round at Athenry can now pick its tees
    await pg.evaluate(() => { const n = window.__ncgs; n.UI.formState = { course: 'athenry-hand' }; n.UI.orgStack = [{ v: 'home', p: {} }, { v: 'details', p: {} }]; n.render(); });
    await pg.waitForTimeout(150);
    const tees = await pg.$$eval('#f-tee option', o => o.map(x => x.textContent));
    check('a new round at Athenry offers White and Green with their ratings', tees.some(t => /White · 124 \/ 71.2/.test(t)) && tees.some(t => /Green · 117 \/ 69.2/.test(t)), tees.join(' | '));

    // 3. All five society venues are ready-made, each a complete card; Rosses Point is found by the name the owner uses.
    await org('courses', {});
    for (const name of ['Westport', 'Ballinrobe', 'Rosses Point', 'Strandhill']) {
      check(`${name} is offered ready-made`, !!(await pg.$(`[data-act="course-add-lib"][data-name="${name}"]`)));
    }
    const pars = { Westport: 73, Ballinrobe: 73, 'Rosses Point': 71, Strandhill: 70 };
    for (const name of Object.keys(pars)) {
      await pg.click(`[data-act="course-add-lib"][data-name="${name}"]`); await pg.waitForTimeout(150);
    }
    await sync();
    const cards = await pg.evaluate(names => names.map(n => window.__ncgs.D.courses().find(c => c.name === n)), Object.keys(pars));
    for (const c of cards) {
      const ok = c && c.holes.length === 18 && c.holes.reduce((t, h) => t + h.par, 0) === pars[c.name]
        && c.holes.map(h => h.si).sort((a, b) => a - b).join() === Array.from({ length: 18 }, (_, i) => i + 1).join()
        && Object.values(c.tees).every(t => t.slope >= 55 && t.slope <= 155 && t.rating > 60 && t.rating < 80 && t.par === pars[c.name])
        && !('check' in c) && !('aliases' in c);
      check(`${c ? c.name : '?'}: par ${c ? pars[c.name] : '?'}, every index once, rated tees, nothing extra stored`, ok);
    }
    check('nothing left to add once all are in', !/Ready to add/.test(await text()));
    // a hand-made course called "Ross's Point" is recognised and can be filled in
    await pg.evaluate(() => { const n = window.__ncgs; const a = n.D.courses().find(x => x.name === 'Rosses Point'); n.send({ op: 'remove', table: 'courses', rows: [{ id: a.id }], pin: '1234' }); n.put('courses', [{ id: 'rp-hand', name: "Ross's Point", area: '', about: '', tees: null, holes: null }]); });
    await sync();
    await org('course', { cid: 'rp-hand' });
    check("a course typed as \"Ross's Point\" offers the Rosses Point card", /Fill in the Rosses Point card/.test(await text()));

    // 4. Owner, 30 October: no tapping at all. Entering the organiser PIN puts every ready-made card in place.
    await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForSelector('.brand');
    await pg.evaluate(() => { const n = window.__ncgs; n.ORGPIN.pin = '1234'; n.put('courses', [{ id: 'wp-hand', name: 'Westport', area: 'Mayo', about: '', tees: null, holes: null }, { id: 'sh-hand', name: 'Strand Hill', area: '', about: '', tees: null, holes: null }]); n.ORGPIN.pin = null; });
    await sync();
    const before = await pg.evaluate(() => window.__ncgs.D.courses().filter(c => c.holes && c.tees).map(c => JSON.stringify(c)));
    const unlock = async () => {
      await pg.evaluate(() => { const n = window.__ncgs; n.UI.org = true; n.UI.orgUnlocked = false; n.ORGPIN.pin = null; n.UI.orgStack = [{ v: 'home', p: {} }]; n.render(); });
      await pg.fill('#pin', '1234'); await pg.press('#pin', 'Enter'); await pg.waitForTimeout(900); await sync();
    };
    await unlock();
    const all = await pg.evaluate(() => window.__ncgs.D.courses());
    for (const [name, par] of Object.entries({ Athenry: 70, Westport: 73, Ballinrobe: 73, 'Rosses Point': 71, 'Strand Hill': 70 })) {
      const mine = all.filter(c => c.name === name);
      const c = mine[0];
      check(`after the PIN, ${name} is there once with its full card`, mine.length === 1 && c.holes && c.holes.length === 18 && c.holes.reduce((t, h) => t + h.par, 0) === par && Object.keys(c.tees).length >= 2 && !('check' in c), String(mine.length));
    }
    check('the card-less Westport was filled in on the same course', all.some(c => c.id === 'wp-hand' && c.holes && c.tees && c.area === 'Mayo'));
    check('"Strand Hill", typed with a space as on the owner\'s phone, was filled in, not added twice', all.some(c => c.id === 'sh-hand' && c.holes && c.tees) && !all.some(c => c.name === 'Strandhill'));
    check('courses that already had a card are unchanged', before.every(b => all.some(c => JSON.stringify(c) === b)));
    const n1 = all.length; await unlock();
    check('unlocking again adds nothing more', (await pg.evaluate(() => window.__ncgs.D.courses().length)) === n1);
    await pg.evaluate(() => { const n = window.__ncgs; n.UI.formState = { course: n.D.courses().find(c => c.name === 'Strand Hill').id }; n.UI.orgStack = [{ v: 'home', p: {} }, { v: 'details', p: {} }]; n.render(); });
    await pg.waitForTimeout(150);
    const st = await pg.$$eval('#f-tee option', o => o.map(x => x.textContent));
    check('a new round at Strandhill offers its rated tees straight away', st.some(t => /White · 125 \/ 70.7/.test(t)), st.join(' | '));

    // 5. Reviewer: the Strand Hill card's stroke index is not confirmed, so its check note shows while the card is as supplied.
    await org('courses', {});
    check('the Courses list shows the Strand Hill check note', /Stroke index NOT confirmed/.test(await text()));
    await org('course', { cid: 'sh-hand' });
    check('the Strand Hill screen says to check the printed card', !!(await pg.$('[data-check-note]')) && /NOT confirmed/.test(await text()));
    await pg.evaluate(() => { const n = window.__ncgs; n.ORGPIN.pin = '1234'; const c = n.D.course('sh-hand'); const holes = c.holes.map(h => Object.assign({}, h)); const a = holes[0].si; holes[0].si = holes[1].si; holes[1].si = a; n.put('courses', [Object.assign({}, c, { holes })]); });
    await sync(); await org('course', { cid: 'sh-hand' });
    check('once the organiser has corrected the card, the note goes', !(await pg.$('[data-check-note]')));

    // 6. Reviewer: a phone with an old copy syncs before filling in, so a course another phone added isn't doubled.
    await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForSelector('.brand'); await sync();
    await pg.evaluate(() => window.__ncgs.localServer().api({ op: 'put', table: 'courses', pin: '1234', rows: [{ id: 'other-phone', name: 'Strand Hill', area: '', about: '', tees: null, holes: null }] }));
    check('this phone has not yet seen the course the other phone added', await pg.evaluate(() => !window.__ncgs.D.course('other-phone')));
    await unlock();
    const sh = await pg.evaluate(() => window.__ncgs.D.courses().filter(c => /^strand\s*hill$/i.test(c.name)));
    check('after the PIN there is one Strand Hill, the other phone\'s, now with its card', sh.length === 1 && sh[0].id === 'other-phone' && !!sh[0].holes, sh.map(c => c.id).join());
    check('no script errors', errs.length === 0, errs.join(' | '));
  } catch (e) { console.error(e); ok = false; } finally { await b.close(); }
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
