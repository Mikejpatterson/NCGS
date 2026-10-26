/* Group changes (owner, 26 October): one set of rules for every round, any day. The organiser moves, swaps, adds,
 * replaces or takes out players and reorders groups; buggy pairs, KB pairs and tee times follow automatically.
 * Pure functions only, so each rule can be tested in Node. Group ids stay stable (contest claims and card checks are
 * keyed by them); the number and tee time follow the order. A group holds at most four. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Groups = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const MAX = 4;
  const clone = x => JSON.parse(JSON.stringify(x));
  const idsOf = g => g.teams.flat();
  const where = (groups, pid) => groups.findIndex(g => idsOf(g).includes(pid));

  /* Buggies inside a group after its players change: pairs that are still whole stay together, a newcomer fills the
     gap left by whoever went, and only odd shapes fall back to the plain split (first two, then the rest). */
  function rebuggy(teams, ids) {
    let t = teams.map(x => x.filter(pid => ids.includes(pid))).filter(x => x.length);
    ids.filter(pid => !t.flat().includes(pid)).forEach(pid => {
      const gap = t.find(x => x.length < 2);
      if (gap && t.length <= 2) gap.push(pid); else t.push([pid]);
    });
    t = t.filter(x => x.length);
    const flat = t.flat();
    const ok = (t.length === 2 && t.every(x => x.length <= 2)) || (t.length === 1 && flat.length <= 2);
    if (ok) return flat.length === 2 && t.length === 1 ? [[flat[0]], [flat[1]]] : t;
    if (flat.length >= 4) return [flat.slice(0, 2), flat.slice(2, 4)];
    if (flat.length === 3) return [flat.slice(0, 2), flat.slice(2)];
    if (flat.length === 2) return [[flat[0]], [flat[1]]];
    return [flat];
  }
  const setIds = (g, ids) => Object.assign(g, { teams: rebuggy(g.teams, ids) });

  /** Numbers and tee times follow the order; empty groups go. */
  function tidy(groups, firstTee, interval, addMinutes) {
    const out = groups.filter(g => idsOf(g).length);
    const step = Number(interval) > 0 ? Number(interval) : 8;
    out.forEach((g, i) => { g.n = i + 1; g.teeTime = firstTee && addMinutes ? addMinutes(firstTee, i * step) : g.teeTime || ''; });
    return out;
  }

  /** Why a change can't be made, or '' if it can. */
  function refuse(groups, op) {
    const gi = op.pid ? where(groups, op.pid) : -1;
    if (op.pid && gi < 0) return 'That player isn\'t in a group.';
    if (op.type === 'move' && op.to !== groups.length) { if (op.to === gi) return 'Already in that group.'; if (!groups[op.to]) return 'No such group.'; if (idsOf(groups[op.to]).length >= MAX) return `Group ${op.to + 1} already has ${MAX}.`; }
    if (op.type === 'add') { if (where(groups, op.add) >= 0) return 'Already playing.'; if (!groups[op.to] && op.to !== groups.length) return 'No such group.'; if (groups[op.to] && idsOf(groups[op.to]).length >= MAX) return `Group ${op.to + 1} already has ${MAX}.`; }
    if (op.type === 'replace' && where(groups, op.add) >= 0) return 'Already playing.';
    if (op.type === 'swap' && where(groups, op.with) < 0) return 'That player isn\'t in a group.';
    return '';
  }

  /** Apply one change. ops: move {pid,to} (to = groups.length starts a new group) · swap {pid,with} · remove {pid} · add {add,to} (to = groups.length makes a new
      group) · replace {pid,add} · order {from,to}. Returns new groups; throws with a plain reason if refused. */
  function apply(groups, op, newId) {
    const why = refuse(groups, op);
    if (why) throw new Error(why);
    const g = clone(groups);
    const gi = op.pid ? where(g, op.pid) : -1;
    if (op.type === 'move') {
      setIds(g[gi], idsOf(g[gi]).filter(x => x !== op.pid));
      if (op.to === g.length) g.push({ id: newId || 'g' + (g.length + 1), n: g.length + 1, teeTime: '', startHole: 1, teams: [[op.pid]] });   // a new group at the end
      else setIds(g[op.to], idsOf(g[op.to]).concat([op.pid]));
    }
    else if (op.type === 'swap') {
      const gj = where(g, op.with);
      if (gi === gj) g[gi].teams = g[gi].teams.map(t => t.map(x => x === op.pid ? op.with : x === op.with ? op.pid : x));
      else { g[gi].teams = g[gi].teams.map(t => t.map(x => x === op.pid ? op.with : x)); g[gj].teams = g[gj].teams.map(t => t.map(x => x === op.with ? op.pid : x)); }
    }
    else if (op.type === 'remove') setIds(g[gi], idsOf(g[gi]).filter(x => x !== op.pid));
    else if (op.type === 'replace') g[gi].teams = g[gi].teams.map(t => t.map(x => x === op.pid ? op.add : x));
    else if (op.type === 'add') {
      if (op.to === g.length) g.push({ id: newId || 'g' + (g.length + 1), n: g.length + 1, teeTime: '', startHole: 1, teams: [[op.add]] });
      else setIds(g[op.to], idsOf(g[op.to]).concat([op.add]));
    }
    else if (op.type === 'order') { const [x] = g.splice(op.from, 1); g.splice(op.to, 0, x); }
    else throw new Error('Unknown change');
    return g;
  }

  /* KB pairs after a change: pairs that still work (both playing, in different KB groups) stay; only the broken ones
     are re-paired, across groups and avoiding past partners where possible. Returns { kb, changed }. */
  function repairKb(kbGroups, kb, history, shuffle, seed) {
    const groupOf = {};
    kbGroups.forEach(g => idsOf(g).forEach(pid => { groupOf[pid] = g.id; }));
    const used = new Set(), keep = [];
    (kb || []).forEach(pr => {
      if (pr && pr.length === 2 && groupOf[pr[0]] && groupOf[pr[1]] && groupOf[pr[0]] !== groupOf[pr[1]] && !used.has(pr[0]) && !used.has(pr[1])) { keep.push(pr.slice()); used.add(pr[0]); used.add(pr[1]); }
    });
    const seen = new Set((history || []).filter(p => p && p.length === 2).map(p => [p[0], p[1]].sort().join('|')));
    const pairUp = left => {
      let best = null;
      for (let a = 0; a < 300; a++) {
        const pool = shuffle(left, (seed || 1) + a * 7919), pairs = [];
        let ok = true, repeats = 0;
        while (pool.length > 1) {
          const x = pool.shift(), k = pool.findIndex(y => groupOf[y] !== groupOf[x]);
          if (k < 0) { ok = false; break; }
          const y = pool.splice(k, 1)[0];
          if (seen.has([x, y].sort().join('|'))) repeats++;
          pairs.push([x, y]);
        }
        if (ok && (!best || repeats < best.repeats)) best = { pairs, repeats };
        if (best && !best.repeats) break;
      }
      return best && best.pairs;
    };
    // Re-pair only the broken pairs; if that can't work (say both leftovers are now in one group), free up as few
    // working pairs as possible: every single pair first, then every two, then three; then start afresh.
    const left0 = Object.keys(groupOf).filter(pid => !used.has(pid));
    if (!left0.length) return { kb: keep, changed: [] };
    const subsets = (arr, k, from = 0, cur = [], out = []) => { if (cur.length === k) { out.push(cur.slice()); return out; } for (let i = from; i < arr.length; i++) { cur.push(i); subsets(arr, k, i + 1, cur, out); cur.pop(); } return out; };
    for (let r = 0; r <= Math.min(3, keep.length); r++) {
      for (const idx of subsets(keep, r)) {
        const pairs = pairUp(left0.concat(idx.flatMap(i => keep[i])));
        if (pairs) return { kb: keep.filter((_, i) => !idx.includes(i)).concat(pairs), changed: pairs };
      }
    }
    const all = pairUp(Object.keys(groupOf));
    if (all) return { kb: all, changed: all };
    return { kb: null, changed: null };
  }

  return { MAX, idsOf, where, rebuggy, tidy, refuse, apply, repairKb };
});
