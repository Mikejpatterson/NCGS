// Rehearsal: 20 pretend phones play a whole round against a data service, then check that every score arrived intact.
// It talks to the server the way the app does (load, since, saveHole), with the app's polling rhythm, retries and clashes.
//
//   Local copy (safe, default):    node tools/devserver.js 8766 &   then   node tools/rehearsal.js
//   A COPY of the Apps Script setup:   node tools/rehearsal.js --api <copy's web app URL> --pin <copy's PIN> --minutes 120 --speed 1
//
// Never point it at the live app: it creates a round called "Rehearsal …" and deletes it again at the end (--keep to leave it).
// --speed compresses time: --minutes 120 --speed 60 plays a two-hour round in two minutes (same number of requests per hole).
const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, all) => (x.startsWith('--') ? a.concat([[x.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]]) : a), []));
const API = args.api || 'http://localhost:8766/api';
const PIN = String(args.pin || '1234');
const PHONES = Number(args.phones || 20);
const MINUTES = Number(args.minutes || 120);
const SPEED = Number(args.speed || 60);
const POLL = 15000 / SPEED;                  // the app polls every 15 s during a live round (src/app/90-main.js)
const HOLE = (MINUTES * 60000 / 18) / SPEED;  // time between holes for a group
const sleep = ms => new Promise(r => setTimeout(r, ms));

const stats = { requests: 0, byOp: {}, errors: {}, lat: [], conflicts: 0, expectedConflicts: 0, retries: 0 };
async function call(req) {
  const t0 = Date.now();
  stats.requests++; stats.byOp[req.op] = (stats.byOp[req.op] || 0) + 1;
  try {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(req), redirect: 'follow', signal: AbortSignal.timeout(25000) });
    if (!r.ok) throw new Error('http ' + r.status);
    const j = await r.json();
    stats.lat.push(Date.now() - t0);
    if (j.error) stats.errors[j.error] = (stats.errors[j.error] || 0) + 1;
    return j;
  } catch (e) {
    stats.errors.network = (stats.errors.network || 0) + 1;
    return null;
  }
}
// Like the app's outbox: retry network and "server" errors until the server has it.
async function deliver(req) {
  for (let i = 0; ; i++) {
    const r = await call(req);
    if (r && (!r.error || r.error !== 'server')) return r;
    stats.retries++;
    await sleep(Math.min(30000, 4000 * (1 + i)) / SPEED);
  }
}

(async () => {
  const data = await call({ op: 'load' });
  if (!data || !data.tables) { console.log('FAIL  could not load from ' + API); process.exit(1); }
  const members = data.tables.members.filter(m => m.active !== false && !String(m.id).startsWith('guest-'));
  const course = data.tables.courses.find(c => c.holes && c.holes.length === 18 && c.tees && Object.keys(c.tees).length);
  if (!course) { console.log('FAIL  no course with a full card'); process.exit(1); }
  // Twenty players: the members, reused with suffixes if the data has fewer (only ids matter to the server).
  const ids = Array.from({ length: PHONES }, (_, i) => members[i % members.length].id + (i < members.length ? '' : '~' + i));
  const groups = [];
  for (let g = 0; g * 4 < ids.length; g++) {
    const four = ids.slice(g * 4, g * 4 + 4);
    groups.push({ id: 'g' + (g + 1), n: g + 1, teeTime: '10:' + String(g * 8).padStart(2, '0'), startHole: 1, teams: [four.slice(0, 2), four.slice(2)].filter(t => t.length) });
  }
  const rid = 'rehearsal-' + Date.now().toString(36);
  const round = { id: rid, season: 1999, seq: 99, date: '1999-01-01', name: 'Rehearsal ' + new Date().toISOString().slice(0, 16), course: course.id, tee: Object.keys(course.tees)[0], status: 'upcoming', source: 'rehearsal', groups, kb: null, contests: [] };
  const made = await deliver({ op: 'put', table: 'rounds', rows: [round], pin: PIN, log: { by: 'Rehearsal', action: 'Rehearsal round added', detail: rid } });
  if (!made || made.error) { console.log('FAIL  could not create the rehearsal round: ' + JSON.stringify(made)); process.exit(1); }
  console.log(`Rehearsal ${rid}: ${PHONES} phones, ${groups.length} groups, ${MINUTES} min round at ${SPEED}x (poll every ${POLL.toFixed(0)} ms, a hole every ${(HOLE / 1000).toFixed(1)} s)`);

  const want = {};   // what the scorer in each group meant to save: want[pid][hole]
  let playing = true;
  // Every phone polls like the app does while the screen is on.
  const pollers = ids.map(async (pid, i) => {
    let ver = data.ver;
    await sleep((i * POLL) / PHONES);   // phones don't all poll in the same instant
    while (playing) {
      const r = await call({ op: 'since', v: ver });
      if (r && !r.error) ver = r.ver;
      await sleep(POLL);
    }
  });
  // In each group, phone 1 scores every hole. Phone 2 sometimes saves the same hole too: usually the same numbers
  // (must be a no-op), sometimes different numbers from a stale screen (must come back as a clash, first score kept).
  const scorers = groups.map(async (g, gi) => {
    const pids = g.teams.flat();
    await sleep(gi * 8 * 60000 / SPEED);   // 8 minutes between tee times
    for (let h = 1; h <= 18; h++) {
      const scores = {};
      pids.forEach(p => {
        const v = Math.random() < 0.05 ? 'P' : 3 + Math.floor(Math.random() * 4);
        (want[p] = want[p] || {})[h] = v;
        scores[p] = { v, base: null };
      });
      const sent = deliver({ op: 'saveHole', round: rid, grp: g.id, hole: h, scores, by: 'Rehearsal' });
      if (h % 6 === 0) {        // the second phone repeats the same scores: nothing should change
        await sent;
        const dup = await deliver({ op: 'saveHole', round: rid, grp: g.id, hole: h, scores, by: 'Rehearsal 2' });
        if (dup.changed) stats.errors.duplicateWrote = (stats.errors.duplicateWrote || 0) + 1;
      }
      if (h % 7 === 0) {        // the second phone saves different numbers from a stale screen: must be refused
        await sent;
        const other = Object.fromEntries(pids.map(p => [p, { v: want[p][h] === 'P' ? 4 : want[p][h] + 1, base: null }]));
        const clash = await deliver({ op: 'saveHole', round: rid, grp: g.id, hole: h, scores: other, by: 'Rehearsal 2' });
        stats.expectedConflicts += pids.length;
        stats.conflicts += (clash.conflicts || []).length;
      }
      await sent;
      await sleep(HOLE);
    }
  });
  // --outage (local dev server only): the server goes down for two holes' worth of time mid-round.
  if (args.outage) {
    const ctl = API.replace(/\/api$/, '/__fault');
    (async () => {
      await sleep(HOLE * 8);
      await fetch(ctl, { method: 'POST', body: JSON.stringify({ mode: 'down' }) });
      console.log('      server down');
      await sleep(HOLE * 2);
      await fetch(ctl, { method: 'POST', body: JSON.stringify({ mode: 'none' }) });
      console.log('      server back');
    })();
  }
  await Promise.all(scorers);
  playing = false;
  await Promise.all(pollers);

  // Check: every intended score is on the server, exactly once, unchanged.
  const end = await deliver({ op: 'load' });
  const got = end.tables.scores.filter(s => s.round === rid);
  let missing = 0, wrong = 0;
  ids.forEach(p => { for (let h = 1; h <= 18; h++) { const s = got.filter(x => x.player === p && x.hole === h); if (!s.length) missing++; else if (s.length > 1 || s[0].strokes !== want[p][h]) wrong++; } });
  const r = end.tables.rounds.find(x => x.id === rid);
  if (!args.keep) await deliver({ op: 'remove', table: 'rounds', rows: [{ id: rid }], pin: PIN, log: { by: 'Rehearsal', action: 'Rehearsal round removed', detail: rid } });

  const lat = stats.lat.slice().sort((a, b) => a - b), q = f => lat.length ? lat[Math.min(lat.length - 1, Math.floor(f * lat.length))] : 0;
  let ok = true; const check = (n, c, x) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (x ? '   [' + x + ']' : '')); if (!c) ok = false; };
  check('every score arrived', missing === 0, missing + ' missing of ' + ids.length * 18);
  check('no score was changed or doubled', wrong === 0, wrong + ' wrong');
  check('every stale clash was refused, first score kept', stats.conflicts === stats.expectedConflicts, stats.conflicts + ' of ' + stats.expectedConflicts);
  check('repeated saves wrote nothing', !stats.errors.duplicateWrote);
  check('the round went live with the first score', r && r.status === 'live', r && r.status);
  console.log(`requests ${stats.requests} (${Object.entries(stats.byOp).map(([k, v]) => k + ' ' + v).join(', ')}), retries ${stats.retries}`);
  console.log(`response time ms: median ${q(0.5)}, 95% ${q(0.95)}, slowest ${lat[lat.length - 1] || 0}`);
  console.log(`errors: ${JSON.stringify(stats.errors)}`);
  console.log(`Script Properties reads at today's 2 per request: about ${stats.requests * 2} (Google's daily limit on a Gmail account: 50,000)`);
  process.exit(ok ? 0 : 1);
})();
