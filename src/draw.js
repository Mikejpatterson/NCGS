/* Breakfast draw (owner brief §7): one player from each pot per team, drawn without replacement.
 * Pure functions only, so every rule can be tested in Node. The app stores the draw in the settings table:
 *   pots:<rid>                         {"pots":[[pid…],…],"show":true}   the committee's pots (names only, never handicaps)
 *   drawdev:<rid>                      {"dev","at","keep":[slot…]}       the one device running the draw
 *   drawepoch:<rid>                    "2"                                bumped by a logged restart; older picks are ignored
 *   draw:<rid>:<epoch>:<t>:<p>:<dev>   {"pid","at"}                       one row per pick, per device
 * A pick's key includes the device, so two devices can never overwrite each other's pick: both rows survive and the
 * slot shows as a conflict that blocks making the groups. The draw never silently chooses a winner. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Draw = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const POTS = 'ABCDEFGH';
  const potName = p => POTS[p] || String(p + 1);
  const slotKey = (t, p) => t + ':' + p;

  /** How many teams: the size of the biggest pot. A team gets nobody from a pot that has run out. */
  const teamCount = pots => pots.reduce((m, x) => Math.max(m, x.length), 0);

  /** Read the picks for one round and epoch from settings rows. Returns { 't:p': [{pid, dev, at}] } (several rows = conflict). */
  function picksFrom(rows, rid, epoch) {
    const pre = `draw:${rid}:${epoch}:`, out = {};
    (rows || []).forEach(r => {
      if (!r || typeof r.key !== 'string' || r.key.indexOf(pre) !== 0) return;
      const [t, p, ...dev] = r.key.slice(pre.length).split(':');
      let v; try { v = JSON.parse(r.value); } catch (e) { return; }
      if (!v || !v.pid) return;
      (out[slotKey(Number(t), Number(p))] = out[slotKey(Number(t), Number(p))] || []).push({ pid: v.pid, dev: dev.join(':'), at: v.at || '' });
    });
    return out;
  }

  /** The draw as it stands: teams, who is left in each pot, the next slots, conflicts and duplicates. */
  /* opts.holder: the device now running the draw; opts.keep: slots ('t:p') already confirmed when it took over.
     After a handover, a pick by any other device for a slot that was not kept is a conflict, never a quiet result. */
  function state(pots, picks, opts) {
    const o = opts || {}, keep = new Set(o.keep || []);
    const foreign = (t, p, rows) => !!o.holder && rows.some(x => x.dev !== o.holder) && !keep.has(slotKey(t, p));
    pots = (pots || []).map(x => (x || []).slice());
    const T = teamCount(pots), used = {}, dup = [], conflicts = [], stray = [];
    const teams = Array.from({ length: T }, (_, t) => ({ n: t + 1, slots: pots.map((_, p) => {
      const rows = (picks || {})[slotKey(t, p)] || [];
      const pids = [...new Set(rows.map(x => x.pid))];
      const clash = pids.length > 1 || new Set(rows.map(x => x.dev)).size > 1 || foreign(t, p, rows);
      if (clash) conflicts.push({ t, p, rows });
      const pid = pids.length === 1 && !clash ? pids[0] : null;
      if (pid && pots[p].indexOf(pid) < 0) stray.push({ t, p, pid });
      if (pid) { if (used[pid]) dup.push(pid); used[pid] = (used[pid] || 0) + 1; }
      return { p, pid, conflict: clash };
    }) }));
    const left = pots.map(x => x.filter(pid => !used[pid]));
    // A slot is open while its pot still has someone in it; an empty pot means "nobody from this pot".
    let open = [];
    teams.forEach(tm => tm.slots.forEach(s => { if (!s.pid && !s.conflict && left[s.p].length) open.push({ t: tm.n - 1, p: s.p }); }));
    // The last team is not drawn: it is whoever is left in each pot (owner, 26 October). Worked out from the saved
    // picks, so nothing extra is stored and every device agrees. Not while there is a clash to sort out.
    if (open.length && !conflicts.length && open.every(x => x.t === T - 1 && left[x.p].length === 1)) {
      open.forEach(x => { const sl = teams[x.t].slots[x.p]; sl.pid = left[x.p][0]; sl.auto = true; left[x.p] = []; });
      open = [];
    }
    // Fill team by team: the current team is the first one with an open slot; slots in pot order.
    const current = open.length ? open[0].t : -1;
    const next = open.filter(s => s.t === current);
    const short = teams.filter(tm => tm.slots.some(s => !s.pid)).map(tm => tm.n);
    return {
      pots, teams, left, next, current, conflicts, dup: [...new Set(dup)], stray,
      done: !open.length && !conflicts.length,
      started: teams.some(tm => tm.slots.some(s => s.pid || s.conflict)),
      short: open.length ? [] : short
    };
  }

  /** Unbiased whole number in [0, n) from a source of 32-bit random numbers (rejection sampling, no modulo bias). */
  function pickIndex(n, rand32) {
    if (!(n >= 1)) throw new Error('nothing to pick from');
    const lim = Math.floor(0x100000000 / n) * n;
    for (let i = 0; i < 1000; i++) { const x = rand32() >>> 0; if (x < lim) return x % n; }
    throw new Error('random source is not random');
  }

  /** Draw the given slots (one, or the whole team for "all four together"): one name each from what is left. */
  function draw(st, slots, rand32) {
    const taken = new Set();
    return slots.map(s => {
      const pool = st.left[s.p].filter(pid => !taken.has(pid));
      const pid = pool[pickIndex(pool.length, rand32)];
      taken.add(pid);
      return { t: s.t, p: s.p, pid };
    });
  }

  /** Can the groups be made? Every reason that blocks it, in plain words. shortOk: team numbers the committee agreed play short. */
  function blockers(st, opts) {
    const o = opts || {}, why = [];
    if (!st.started) why.push('Nobody has been drawn yet.');
    if (st.next.length) why.push('The draw is not finished.');
    if (st.conflicts.length) why.push(`Two devices drew ${st.conflicts.length === 1 ? 'the same place' : st.conflicts.length + ' of the same places'}. Restart the draw.`);
    if (st.dup.length || st.stray.length) why.push('Someone was drawn twice or from the wrong pot. Restart the draw.');
    if (o.pending) why.push('Some picks are not saved to the server yet.');
    const notAgreed = st.short.filter(n => (o.shortOk || []).indexOf(n) < 0);
    if (notAgreed.length) why.push(`Team ${notAgreed.join(', ')} ${notAgreed.length === 1 ? 'is' : 'are'} short: the committee decides how ${notAgreed.length === 1 ? 'it plays' : 'they play'}.`);
    return why;
  }

  /** Playing groups from the drawn teams, in draw order. The inner split (A+B / C+D) is only the storage shape. */
  function groupsFrom(st, firstTee, interval, addMinutes) {
    return st.teams.map((tm, i) => {
      const ids = tm.slots.map(s => s.pid).filter(Boolean);
      const half = Math.ceil(ids.length / 2);
      const teeTime = firstTee ? addMinutes(firstTee, i * (Number(interval) || 0)) : '';
      return { id: 'g' + (i + 1), n: i + 1, teeTime, startHole: 1, teams: [ids.slice(0, half), ids.slice(half)].filter(x => x.length) };
    });
  }

  /** Pots must not share a player, and a pot needs at least one name. */
  function potProblems(pots) {
    const seen = {}, why = [];
    if (!pots || pots.length < 2) why.push('At least two pots are needed.');
    (pots || []).forEach((x, p) => { if (!x.length) why.push(`Pot ${potName(p)} is empty.`); x.forEach(pid => { if (seen[pid] !== undefined) why.push(`Someone is in pot ${potName(seen[pid])} and pot ${potName(p)}.`); seen[pid] = p; }); });
    return why;
  }

  return { POTS, potName, slotKey, teamCount, picksFrom, state, pickIndex, draw, blockers, groupsFrom, potProblems };
});
