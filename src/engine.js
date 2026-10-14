/* Golf trip scoring engine.
 * Pure functions only: no screen code and no storage, so every rule can be tested on its own.
 * Used by the app in the browser and by the tests in Node. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Engine = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ALL = Array.from({ length: 18 }, (_, i) => i + 1);
  const SEGMENTS = { front: ALL.slice(0, 9), back: ALL.slice(9), overall: ALL };

  /* ---------- Handicaps (WHS) ---------- */

  /** Nearest whole number, .5 rounded away from zero. */
  function roundHandicap(x) {
    const e = 1e-9;
    return (x >= 0 ? Math.floor(x + 0.5 + e) : -Math.floor(-x + 0.5 + e)) + 0;
  }

  /** Every step of the playing-handicap sum, so players can check it.
   *  WHS since April 2024: course handicap is kept unrounded, the allowance
   *  is applied, and the result is rounded once. */
  function handicapWorking(index, tee, allowance) {
    const slopePart = index * tee.slope / 113;
    const ratingPart = tee.rating - tee.par;
    const courseHandicap = slopePart + ratingPart;
    const beforeRounding = courseHandicap * allowance;
    return {
      index, slope: tee.slope, rating: tee.rating, par: tee.par, allowance,
      slopePart, ratingPart, courseHandicap, beforeRounding,
      playing: roundHandicap(beforeRounding)
    };
  }

  function playingHandicap(index, tee, allowance) {
    return handicapWorking(index, tee, allowance).playing;
  }

  /** Shots received on a hole. Negative means a plus handicapper gives shots back. */
  function shotsOnHole(ph, si) {
    if (ph >= 0) return Math.floor(ph / 18) + (si <= ph % 18 ? 1 : 0);
    const plus = -ph;
    const back = Math.floor(plus / 18) + (si > 18 - (plus % 18) ? 1 : 0);
    return back === 0 ? 0 : -back;
  }

  /* ---------- Scores ---------- */

  /** A hole score is a whole number of strokes, or 'P' for picked up. */
  function isEntered(v) {
    return v === 'P' || (Number.isInteger(v) && v >= 1);
  }

  function stablefordPoints(gross, par, shots) {
    if (!isEntered(gross)) return null;
    if (gross === 'P') return 0;
    return Math.max(0, par + shots - gross + 2);
  }

  /** The strokes that make a pick-up worth nothing: the first score that earns 0 points. Display only; a pick-up still scores 0. */
  function pickupStrokes(par, shots) { return par + shots + 2; }

  /** What golfers call the gross score: Par, Bogey, Double... */
  function scoreName(gross, par) {
    if (gross === 'P') return 'Picked up';
    if (!isEntered(gross)) return '';
    if (gross === 1) return 'Hole in one';
    const d = gross - par;
    const names = { '-3': 'Albatross', '-2': 'Eagle', '-1': 'Birdie', '0': 'Par', '1': 'Bogey', '2': 'Double', '3': 'Triple' };
    return names[String(d)] || (d > 0 ? '+' + d : String(d));
  }

  function metresToYards(m) {
    return Math.round(m * 1.0936133);
  }

  /** Physical hole numbers in the order a group plays them. */
  function playOrder(startHole) {
    const s = startHole || 1;
    return ALL.slice(s - 1).concat(ALL.slice(0, s - 1));
  }

  function teamLabels(team, nameOf) {
    return {
      long: team.map(nameOf).join(' & '),
      short: team.map(id => nameOf(id).charAt(0)).join('&')
    };
  }

  /* ---------- Buggy Wars (match play on best Stableford score) ---------- */

  /** results: 'A' | 'B' | 'H' | null for each hole of one match, in playing order. */
  function matchProgress(results) {
    let lead = 0, played = 0, closed = null;
    const total = results.length;
    const after = [];
    for (const r of results) {
      if (!r) { after.push(null); continue; }
      played += 1;
      if (r === 'A') lead += 1; else if (r === 'B') lead -= 1;
      const remaining = total - played;
      if (!closed && Math.abs(lead) > remaining) {
        closed = { leader: lead > 0 ? 'A' : 'B', up: Math.abs(lead), toPlay: remaining };
      }
      after.push(lead);
    }
    return { lead, played, total, remaining: total - played, closed, after };
  }

  function matchWinner(m) {
    return m.closed ? m.closed.leader : null;
  }

  /** Match status in golf language: "Pat & Dermot 2 up", "All square", "won 3 & 2". */
  function describeMatch(m, labels, useShort) {
    const nm = s => (useShort ? labels[s === 'A' ? 0 : 1].short : labels[s === 'A' ? 0 : 1].long);
    if (m.played === 0) return { text: 'Not started', leader: null, state: 'pending', toPlay: m.remaining };
    if (m.closed && m.closed.toPlay > 0) {
      return { text: `${nm(m.closed.leader)} won ${m.closed.up} & ${m.closed.toPlay}`, leader: m.closed.leader, state: 'won', toPlay: m.remaining };
    }
    if (m.remaining === 0) {
      if (m.lead === 0) return { text: 'Halved', leader: null, state: 'halved', toPlay: 0 };
      const L = m.lead > 0 ? 'A' : 'B';
      return { text: `${nm(L)} won ${Math.abs(m.lead)} up`, leader: L, state: 'won', toPlay: 0 };
    }
    if (m.lead === 0) return { text: 'All square', leader: null, state: 'live', toPlay: m.remaining };
    const L = m.lead > 0 ? 'A' : 'B';
    const dormie = Math.abs(m.lead) === m.remaining;
    return { text: `${nm(L)} ${Math.abs(m.lead)} up${dormie ? ' · dormie' : ''}`, leader: L, state: 'live', toPlay: m.remaining, dormie };
  }

  /* ---------- Rankings ---------- */

  /** Sort and label positions. Equal values share a position (T7). No countback is applied. */
  function rankRows(rows, key, dir) {
    const sign = dir === 'asc' ? 1 : -1;
    const label = r => String(r.name || r.label || '');
    const sorted = rows.slice().sort((a, b) => sign * (a[key] - b[key]) || label(a).localeCompare(label(b)));
    return sorted.map(r => {
      const better = sorted.filter(o => sign * (o[key] - r[key]) < 0).length;
      const same = sorted.filter(o => o[key] === r[key]).length;
      return Object.assign({}, r, { pos: better + 1, posLabel: (same > 1 ? 'T' : '') + (better + 1), tied: same > 1 });
    });
  }

  /* ---------- A whole round ---------- */

  /**
   * input: {
   *   groups: [{ id, n, teeTime, startHole, teams: [[pid, pid], [pid, pid]] }],
   *   holes: [{ n, par, si }], tee: { slope, rating, par }, allowance,
   *   players: { pid: { name, index } }, scores: { pid: { hole: strokes | 'P' } },
   *   phOverride: { pid: playingHandicap }   // handicaps frozen when a round is finalised
   * }
   */
  function computeRound(input) {
    const { groups, holes, tee, allowance, players, scores, phOverride } = input;
    const holeBy = {};
    holes.forEach(h => { holeBy[h.n] = h; });
    const nameOf = id => (players[id] ? players[id].name : id);
    const byPlayer = {};

    groups.forEach(grp => grp.teams.flat().forEach(pid => {
      const p = players[pid];
      const ph = phOverride && phOverride[pid] !== undefined ? phOverride[pid] : playingHandicap(p.index, tee, allowance);
      const card = (scores && scores[pid]) || {};
      const rows = {};
      let total = 0, thru = 0, gross = 0;
      const pickups = [];
      ALL.forEach(n => {
        const h = holeBy[n];
        const shots = shotsOnHole(ph, h.si);
        const g = card[n];
        const points = stablefordPoints(g, h.par, shots);
        rows[n] = { gross: isEntered(g) ? g : null, shots, points };
        if (points !== null) {
          total += points; thru += 1;
          if (g === 'P') pickups.push(n); else gross += g;
        }
      });
      byPlayer[pid] = { id: pid, name: nameOf(pid), ph, holes: rows, total, thru, gross, pickups, groupId: grp.id };
    }));

    const groupOut = groups.map(grp => {
      const labels = grp.teams.map(t => teamLabels(t, nameOf));
      const order = playOrder(grp.startHole);
      const hs = {};
      order.forEach(n => {
        const pts = grp.teams.map(t => t.map(pid => byPlayer[pid].holes[n].points));
        const complete = pts.flat().every(v => v !== null);
        const entry = { n, complete, pts, best: null, counting: null, result: null, segLead: null, overallLead: null };
        if (complete) {
          entry.best = pts.map(a => Math.max(...a));
          entry.counting = grp.teams.map((t, i) => t.filter((pid, j) => pts[i][j] === entry.best[i]));
          entry.result = entry.best[0] > entry.best[1] ? 'A' : entry.best[1] > entry.best[0] ? 'B' : 'H';
        }
        hs[n] = entry;
      });
      const matches = {};
      Object.keys(SEGMENTS).forEach(seg => {
        const segOrder = order.filter(n => SEGMENTS[seg].includes(n));
        const prog = matchProgress(segOrder.map(n => hs[n].result));
        segOrder.forEach((n, i) => {
          if (seg === 'overall') hs[n].overallLead = prog.after[i];
          else hs[n].segLead = prog.after[i];
        });
        matches[seg] = Object.assign(prog, {
          order: segOrder,
          status: describeMatch(prog, labels, false),
          short: describeMatch(prog, labels, true),
          winner: matchWinner(prog)
        });
      });
      const done = order.filter(n => hs[n].complete).length;
      return {
        id: grp.id, n: grp.n, teeTime: grp.teeTime, startHole: grp.startHole || 1,
        teams: grp.teams, labels, order, holes: hs, matches,
        nextHole: order.find(n => !hs[n].complete) || null,
        holesDone: done, complete: done === 18
      };
    });

    const leaderboard = rankRows(Object.values(byPlayer).map(p => ({ id: p.id, name: p.name, total: p.total, thru: p.thru })), 'total', 'desc');

    const pairs = [];
    groupOut.forEach(go => go.teams.forEach((t, i) => pairs.push({
      groupId: go.id, team: t, label: go.labels[i].long,
      total: t.reduce((s, pid) => s + byPlayer[pid].total, 0),
      thru: Math.min(...t.map(pid => byPlayer[pid].thru))
    })));
    const ranked = rankRows(pairs, 'total', 'desc');
    const lowest = Math.min(...pairs.map(p => p.total));
    ranked.forEach(p => { p.lowest = p.total === lowest; });

    return { players: byPlayer, groups: groupOut, leaderboard, pairs: ranked };
  }

  /** Trip totals across rounds. All rounds count. */
  function tripStandings(roundResults, playerList) {
    const rows = playerList.map(p => {
      const per = roundResults.map(rr => (rr && rr.players[p.id] ? rr.players[p.id].total : null));
      const thru = roundResults.reduce((s, rr) => s + (rr && rr.players[p.id] ? rr.players[p.id].thru : 0), 0);
      return { id: p.id, name: p.name, per, thru, total: per.reduce((s, v) => s + (v || 0), 0) };
    });
    return rankRows(rows, 'total', 'desc');
  }

  /* ---------- Pairings and the draw ---------- */

  const pairKey = (a, b) => [a, b].sort().join('+');

  /** roundsGroups: [{ rid, groups }]. Returns { 'pat+dermot': ['r1', 'r2'] }. */
  function partnerHistory(roundsGroups) {
    const map = {};
    roundsGroups.forEach(({ rid, groups }) => (groups || []).forEach(g => g.teams.forEach(t => {
      if (t.length !== 2) return;
      const k = pairKey(t[0], t[1]);
      (map[k] = map[k] || []).push(rid);
    })));
    return map;
  }

  function repeatedPartners(roundsGroups) {
    const map = partnerHistory(roundsGroups);
    return Object.keys(map).filter(k => map[k].length > 1).map(k => ({ pair: k.split('+'), rounds: map[k] }));
  }

  /* ---------- Scorecard photo check ---------- */

  const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');

  /** Normalise one cell of a card reading: strokes, 'P' for a pick-up, or null if unreadable. */
  function cardValue(cell) {
    const v = cell && typeof cell === 'object' ? cell.value : cell;
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'string') {
      const t = v.trim().toUpperCase();
      if (['P', 'X', '-', '–', '/', 'NR', 'NS'].includes(t)) return 'P';
      const n = Number(t);
      return Number.isInteger(n) && n >= 1 ? n : null;
    }
    return Number.isInteger(v) && v >= 1 ? v : null;
  }

  /**
   * Work out which card row (A, B, C, D) belongs to which player.
   * First by the names written in the key (accents and short forms allowed: "Derm" is Dermot),
   * then by whichever assignment agrees with the most scores already in the app.
   * cardPlayers: [{ letter, name, scores: { hole: cell } }]; players: [{ id, name }]; app: { pid: { hole: v } }.
   */
  function matchCardRows(cardPlayers, players, app) {
    const map = {};
    const used = new Set();
    cardPlayers.forEach(cp => {
      const n = fold(cp.name);
      if (n.length < 2) return;
      const hits = players.filter(p => !used.has(p.id) && (fold(p.name).startsWith(n) || n.startsWith(fold(p.name))));
      if (hits.length === 1) { map[cp.letter] = hits[0].id; used.add(hits[0].id); }
    });
    const rest = cardPlayers.filter(cp => !map[cp.letter]);
    const free = players.filter(p => !used.has(p.id));
    if (rest.length && free.length) {
      const agree = (cp, pid) => Object.keys(cp.scores || {}).filter(h => {
        const c = cardValue(cp.scores[h]);
        return c !== null && app[pid] && app[pid][h] === c;
      }).length;
      let best = null;
      const permute = (i, chosen, score) => {
        if (i === rest.length) { if (!best || score > best.score) best = { score, chosen: chosen.slice() }; return; }
        free.forEach(p => {
          if (chosen.includes(p.id)) return;
          chosen.push(p.id);
          permute(i + 1, chosen, score + agree(rest[i], p.id));
          chosen.pop();
        });
        if (rest.length > free.length) permute(i + 1, chosen.concat([null]), score);
      };
      permute(0, [], 0);
      if (best) rest.forEach((cp, i) => { if (best.chosen[i]) map[cp.letter] = best.chosen[i]; });
    }
    return map;
  }

  /**
   * Compare a card reading with the app for one nine.
   * Only differences need a person: the app never changes a score on its own.
   * A reading counts as unclear when the reader said so, or when it would be an
   * implausible score for the hole (more than par + 4), so a misread 4-as-9 is
   * shown as "please check", never as a confident difference.
   * Returns { checked, matched, issues: [{ hole, pid, card, app, kind: 'differs'|'unclear'|'unreadable', note }], unmatchedRows }.
   */
  function compareCard(reading, players, app, holes, segHoles) {
    const parOf = {};
    holes.forEach(h => { parOf[h.n] = h.par; });
    const map = matchCardRows(reading.players || [], players, app);
    const issues = [];
    let checked = 0, matched = 0;
    (reading.players || []).forEach(cp => {
      const pid = map[cp.letter];
      if (!pid) return;
      segHoles.forEach(h => {
        const appV = app[pid] ? app[pid][h] : undefined;
        if (appV === undefined || appV === null) return;
        checked += 1;
        const cell = (cp.scores || {})[h];
        const c = cardValue(cell);
        const low = cell && typeof cell === 'object' && cell.confidence === 'low';
        const note = cell && typeof cell === 'object' ? (cell.note || '') : '';
        if (c === null) { issues.push({ hole: h, pid, card: null, app: appV, kind: 'unreadable', note }); return; }
        if (c === appV) { matched += 1; return; }
        const implausible = Number.isInteger(c) && c > parOf[h] + 4;
        issues.push({ hole: h, pid, card: c, app: appV, kind: low || implausible ? 'unclear' : 'differs', note });
      });
    });
    issues.sort((a, b) => a.hole - b.hole);
    const unmatchedRows = (reading.players || []).filter(cp => !map[cp.letter]).map(cp => cp.letter);
    return { checked, matched, issues, map, unmatchedRows };
  }

  /** Split four players into two buggies. Prefers 1st & 4th v 2nd & 3rd,
   *  but avoids pairs who already shared a buggy when another split can. */
  function bestSplit(ids, history) {
    if (ids.length === 4) {
      const splits = [[[0, 3], [1, 2]], [[0, 2], [1, 3]], [[0, 1], [2, 3]]]
        .map(s => s.map(t => t.map(i => ids[i])));
      const repeats = s => s.filter(t => history[pairKey(t[0], t[1])]).length;
      return splits.reduce((best, s) => (repeats(s) < repeats(best) ? s : best), splits[0]);
    }
    return teamsFor(ids);
  }

  /** Buggies for a group of any size: 4 is two pairs, 3 is a pair and a single. */
  function teamsFor(ids) {
    if (ids.length >= 4) return [ids.slice(0, 2), ids.slice(2, 4)];
    if (ids.length === 3) return [ids.slice(0, 2), ids.slice(2)];
    if (ids.length === 2) return [[ids[0]], [ids[1]]];
    return [ids.slice()];
  }

  /** Group sizes for n players: fours, with threes where it does not divide. */
  function groupSizes(n) {
    if (n <= 0) return [];
    if (n <= 4) return [n];
    const g = Math.ceil(n / 4);
    const sizes = Array(g).fill(Math.floor(n / g));
    for (let i = 0; i < n % g; i++) sizes[i] += 1;
    return sizes.sort((a, b) => b - a);
  }

  /** "10:00" plus minutes, as "10:08". */
  function addMinutes(hhmm, mins) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
    if (!m) return '';
    if (Number(m[1]) > 23 || Number(m[2]) > 59) return '';
    const step = Number.isFinite(mins) ? Math.round(mins) : 0;
    const t = (((Number(m[1]) * 60 + Number(m[2]) + step) % 1440) + 1440) % 1440;
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  }

  function teeTimesFrom(first, interval, count) {
    const step = Number(interval) > 0 ? Number(interval) : 8;
    return Array.from({ length: count }, (_, i) => addMinutes(first, i * step));
  }

  function makeGroups(orderedIds, teeTimes, history) {
    const sizes = groupSizes(orderedIds.length);
    const groups = [];
    let k = 0;
    sizes.forEach((size, i) => {
      const ids = orderedIds.slice(k, k + size);
      k += size;
      groups.push({ id: 'g' + (i + 1), n: i + 1, teeTime: (teeTimes || [])[i] || '', startHole: 1, teams: history ? bestSplit(ids, history) : teamsFor(ids) });
    });
    return groups;
  }

  function flagRepeats(groups, priorRoundsGroups) {
    const history = partnerHistory(priorRoundsGroups);
    const repeats = [];
    groups.forEach(g => g.teams.forEach(t => {
      if (t.length === 2 && history[pairKey(t[0], t[1])]) repeats.push({ pair: t, rounds: history[pairKey(t[0], t[1])] });
    }));
    return repeats;
  }

  /** Reverse-standings draw: lowest scores off first, leaders last.
   *  Within a group, buggies avoid repeated partners where possible. Repeats left are flagged, not hidden. */
  function proposeDraw(standings, priorRoundsGroups, teeTimes) {
    const history = partnerHistory(priorRoundsGroups);
    const worstFirst = standings.slice().reverse().map(r => r.id);
    const sizes = groupSizes(worstFirst.length);
    const groups = [];
    let k = 0;
    sizes.forEach((size, i) => {
      const bestFirst = worstFirst.slice(k, k + size).reverse();
      k += size;
      groups.push({ id: 'g' + (i + 1), n: i + 1, teeTime: (teeTimes || [])[i] || '', startHole: 1, teams: bestSplit(bestFirst, history) });
    });
    return { groups, repeats: flagRepeats(groups, priorRoundsGroups) };
  }

  /** A seeded shuffle, so a draw can be repeated in tests. */
  function shuffle(list, seed) {
    const a = list.slice();
    let s = (seed >>> 0) || 1;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function randomDraw(ids, teeTimes, seed, priorRoundsGroups) {
    const history = partnerHistory(priorRoundsGroups || []);
    const groups = makeGroups(shuffle(ids, seed), teeTimes, history);
    return { groups, repeats: flagRepeats(groups, priorRoundsGroups || []) };
  }

  /** KB pairs: partners always in different groups, and (when it can be done) nobody paired with someone
   *  they have already been paired with. history: earlier KB pairs, [[a, b], ...]. Returns the draw with the
   *  fewest repeats found; repeats lists any pair that could not be avoided. */
  function kbPairsFor(groups, seed, history) {
    const groupOf = {};
    groups.forEach(g => g.teams.flat().forEach(pid => { groupOf[pid] = g.id; }));
    const ids = Object.keys(groupOf);
    const seen = new Set((history || []).filter(pr => pr && pr.length === 2).map(pr => pairKey(pr[0], pr[1])));
    let best = null;
    for (let attempt = 0; attempt < 400; attempt++) {
      const pool = shuffle(ids, (seed || 1) + attempt * 7919);
      const pairs = [];
      let ok = true;
      while (pool.length > 1 && ok) {
        const a = pool.shift();
        let j = pool.findIndex(b => groupOf[b] !== groupOf[a] && !seen.has(pairKey(a, b)));
        if (j < 0) j = pool.findIndex(b => groupOf[b] !== groupOf[a]);
        if (j < 0) { ok = false; break; }
        pairs.push([a, pool.splice(j, 1)[0]]);
      }
      if (!ok) continue;
      const repeats = pairs.filter(pr => seen.has(pairKey(pr[0], pr[1])));
      if (!best || repeats.length < best.repeats.length) best = { pairs, spare: pool, repeats };
      if (!repeats.length) break;
    }
    return best || { pairs: [], spare: ids, repeats: [] };
  }

  /** A KB list is only good if it matches the groups: pairs of two, in different groups, nobody twice, everyone paired bar one. */
  function kbValid(groups, kb) {
    if (!Array.isArray(kb) || !kb.length || !Array.isArray(groups) || groups.length < 2) return false;
    const groupOf = {};
    groups.forEach(g => g.teams.flat().forEach(pid => { groupOf[pid] = g.id; }));
    const n = Object.keys(groupOf).length, seen = new Set();
    for (const pr of kb) {
      if (!Array.isArray(pr) || pr.length !== 2) return false;
      const [a, b] = pr;
      if (!groupOf[a] || !groupOf[b] || groupOf[a] === groupOf[b] || seen.has(a) || seen.has(b)) return false;
      seen.add(a); seen.add(b);
    }
    return seen.size >= n - 1;
  }

  /** The KB pairs a round should have. Groups and KB pairs go together: if the saved pairs are missing or no longer fit the groups,
   *  work them out from the groups. The same groups and history always give the same answer, so every phone agrees. */
  function kbEffective(round, others) {
    if (!round || !round.groups || round.groups.length < 2) return round ? round.kb || null : null;
    if (kbValid(round.groups, round.kb)) return round.kb;
    const history = (others || []).slice().sort((x, y) => String(x.id).localeCompare(String(y.id)))
      .flatMap(x => (x.kb && x.kb.length ? x.kb : ((x.results && x.results.kb) || []).map(k => [k[0], k[1]])));
    let h = 7;
    for (const ch of String(round.id)) h = (h * 31 + ch.charCodeAt(0)) % 99991;
    const res = kbPairsFor(round.groups, h + 1, history);
    return res.pairs.length ? res.pairs : null;
  }

  /* ---------- Countback and season tables ---------- */

  /** Countback as the society uses it: back 9, back 6, back 3, then the 18th, 17th and backwards.
   *  points: { hole: points | null } on physical hole numbers. */
  function countbackKey(points) {
    const p = n => (points && points[n]) || 0;
    const sum = (a, b) => { let s = 0; for (let n = a; n <= b; n++) s += p(n); return s; };
    const key = [sum(10, 18), sum(13, 18), sum(16, 18)];
    for (let n = 18; n >= 1; n--) key.push(p(n));
    return key;
  }

  function compareKeys(a, b) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const x = a[i] === undefined ? -1 : a[i];
      const y = b[i] === undefined ? -1 : b[i];
      if (x !== y) return y - x;
    }
    return 0;
  }

  /** Rank by total, then by key (best first). Only identical keys share a position. */
  function rankByKey(rows) {
    const sorted = rows.slice().sort((a, b) => (b.total - a.total) || compareKeys(a.key, b.key) || String(a.name || '').localeCompare(String(b.name || '')));
    return sorted.map((r, i) => {
      const same = sorted.filter(o => o.total === r.total && compareKeys(o.key, r.key) === 0);
      const pos = sorted.findIndex(o => o.total === r.total && compareKeys(o.key, r.key) === 0) + 1;
      const level = sorted.filter(o => o.total === r.total).length > 1;
      return Object.assign({}, r, { pos, posLabel: (same.length > 1 ? 'T' : '') + pos, tied: same.length > 1, countback: level && same.length === 1 });
    });
  }

  /** Final order for a round scored in the app: points, then countback. */
  function finalOrder(comp) {
    return rankByKey(Object.values(comp.players).map(p => ({
      id: p.id, name: p.name, total: p.total,
      key: countbackKey(Object.fromEntries(Object.entries(p.holes).map(([n, h]) => [n, h.points])))
    })));
  }

  /** KB pairs for a round scored in the app: both players' points added, then pair countback. */
  function kbStandings(comp, kbPairs) {
    const rows = (kbPairs || []).filter(pr => pr.every(pid => comp.players[pid])).map(pr => {
      const pts = {};
      for (let n = 1; n <= 18; n++) pts[n] = pr.reduce((s, pid) => s + (comp.players[pid].holes[n].points || 0), 0);
      return {
        pair: pr, name: pr.map(pid => comp.players[pid].name).join(' & '),
        total: pr.reduce((s, pid) => s + comp.players[pid].total, 0),
        thru: Math.min(...pr.map(pid => comp.players[pid].thru)),
        key: countbackKey(pts)
      };
    });
    return rankByKey(rows);
  }

  /** Golfer of the Year: best N scores count. Ties compare the counting scores best to worst,
   *  then the next best scores in turn. Only identical full records stay tied.
   *  results: [{ rid, scores: { pid: points } }]. */
  function goyStandings(members, results, bestN) {
    const n = bestN || 3;
    const rows = [];
    members.forEach(m => {
      const played = [];
      results.forEach(r => { if (r.scores[m.id] !== undefined && r.scores[m.id] !== null) played.push({ rid: r.rid, pts: r.scores[m.id] }); });
      if (!played.length) return;
      const sorted = played.slice().sort((a, b) => b.pts - a.pts);
      const counting = sorted.slice(0, n);
      rows.push({
        id: m.id, name: m.name, played: played.length,
        counting, countingRids: counting.map(c => c.rid),
        total: counting.reduce((s, c) => s + c.pts, 0),
        toBeat: counting.length < n ? 0 : counting[n - 1].pts,
        key: sorted.map(c => c.pts)
      });
    });
    return rankByKey(rows).map(r => Object.assign(r, { countback: false }));
  }

  /** How a gross score is marked on a card. */
  function scoreMark(gross, par) {
    if (gross === 'P') return 'pu';
    if (!isEntered(gross)) return '';
    const d = gross - par;
    if (d <= -2) return 'eagle';
    if (d === -1) return 'birdie';
    if (d === 0) return 'par';
    if (d === 1) return 'bogey';
    return 'double';
  }


  /**
   * Fun facts from the hole-by-hole scores of one round. Pure: takes the computed round and the course holes.
   * Only holes that have been entered count; anything with nothing to say is left out.
   */
  function roundStats(comp, holes) {
    const par = {}; holes.forEach(h => { par[h.n] = h.par; });
    const ps = Object.values(comp.players);
    const entered = p => ALL.filter(n => p.holes[n].gross !== null);
    const by = (key, dir) => rows => rows.slice().sort((a, b) => dir * (b[key] - a[key]) || a.name.localeCompare(b.name));
    const top = (rows, key) => rows.length && rows[0][key] > 0 ? rows.filter(r => r[key] === rows[0][key]) : [];

    const hole = {};
    ALL.forEach(n => {
      const cards = ps.filter(p => p.holes[n].points !== null);
      if (cards.length >= 2) hole[n] = { n, par: par[n], cards: cards.length, avgPts: cards.reduce((s, p) => s + p.holes[n].points, 0) / cards.length };
    });
    const hl = Object.values(hole);
    const lo = hl.length ? Math.min(...hl.map(h => h.avgPts)) : null, hi = hl.length ? Math.max(...hl.map(h => h.avgPts)) : null;
    const hardest = lo !== null && hi > lo ? hl.filter(h => h.avgPts === lo) : [];
    const easiest = lo !== null && hi > lo ? hl.filter(h => h.avgPts === hi) : [];

    const counts = (marks) => by('count', 1)(ps.map(p => ({ id: p.id, name: p.name, count: entered(p).filter(n => marks.includes(scoreMark(p.holes[n].gross, par[n]))).length })));
    const birdies = top(counts(['birdie', 'eagle']), 'count');
    const scratches = top(by('count', 1)(ps.map(p => ({ id: p.id, name: p.name, count: p.pickups.length }))), 'count');

    let streak = null;
    ps.forEach(p => {
      const order = (comp.groups.find(g => g.id === p.groupId) || { order: ALL }).order;
      let run = 0, from = null;
      order.forEach(n => {
        const pts = p.holes[n].points;
        if (pts !== null && pts >= 2) { if (!run) from = n; run++; if (run >= 3 && (!streak || run > streak.len)) streak = { id: p.id, name: p.name, len: run, from, to: n }; }
        else run = 0;
      });
    });

    const nine = (p, a, b) => { let t = 0, d = 0; for (let n = a; n <= b; n++) { if (p.holes[n].points !== null) { t += p.holes[n].points; d++; } } return d === 9 ? t : null; };
    const nines = [];
    ps.forEach(p => { const f = nine(p, 1, 9), b = nine(p, 10, 18); if (f !== null) nines.push({ id: p.id, name: p.name, seg: 'front', pts: f, other: b }); if (b !== null) nines.push({ id: p.id, name: p.name, seg: 'back', pts: b, other: f }); });
    const bestNine = nines.length ? nines.filter(x => x.pts === Math.max(...nines.map(y => y.pts))) : [];
    const swings = nines.filter(x => x.seg === 'back' && x.other !== null).map(x => ({ id: x.id, name: x.name, swing: x.pts - x.other, front: x.other, back: x.pts }));
    const up = swings.length ? Math.max(...swings.map(x => x.swing)) : 0;
    const comeback = up >= 5 ? swings.filter(x => x.swing === up) : [];
    const down = swings.length ? Math.min(...swings.map(x => x.swing)) : 0;
    const fade = down <= -5 ? swings.filter(x => x.swing === down) : [];
    const level = swings.length > 1 ? Math.min(...swings.map(x => Math.abs(x.swing))) : null;
    const steady = level !== null && level <= 1 ? swings.filter(x => Math.abs(x.swing) === level) : [];

    const worst = [];
    ps.forEach(p => entered(p).forEach(n => { const g = p.holes[n].gross; if (g !== 'P') worst.push({ id: p.id, name: p.name, n, over: g - par[n], gross: g }); }));
    const wo = worst.length ? Math.max(...worst.map(x => x.over)) : 0;
    const blowup = wo >= 3 ? worst.filter(x => x.over === wo) : [];

    return { hole, hardest, easiest, birdies, scratches, streak, bestNine, comeback, fade, steady, blowup };
  }

  /**
   * One golfer's numbers across rounds. entries: [{ total, pos, kb, holes }], where holes is
   * [{ par, gross, points }] for rounds scored hole by hole and null for imported totals.
   */
  function playerSummary(entries) {
    const totals = entries.map(e => e.total);
    const out = {
      rounds: entries.length,
      average: totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : null,
      best: totals.length ? Math.max(...totals) : null,
      worst: totals.length ? Math.min(...totals) : null,
      wins: entries.filter(e => e.pos === 1).length,
      kbs: entries.filter(e => e.kb).length,
      scored: 0, eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubles: 0, scratches: 0,
      byPar: { 3: null, 4: null, 5: null }
    };
    const acc = { 3: [0, 0], 4: [0, 0], 5: [0, 0] };
    entries.forEach(e => {
      if (!e.holes) return;
      out.scored += 1;
      e.holes.forEach(h => {
        if (h.gross === null || h.gross === undefined) return;
        const m = scoreMark(h.gross, h.par);
        if (m === 'eagle') out.eagles++; else if (m === 'birdie') out.birdies++; else if (m === 'par') out.pars++;
        else if (m === 'bogey') out.bogeys++; else if (m === 'double') out.doubles++; else if (m === 'pu') out.scratches++;
        if (acc[h.par] && h.points !== null) { acc[h.par][0] += h.points; acc[h.par][1] += 1; }
      });
    });
    [3, 4, 5].forEach(k => { if (acc[k][1]) out.byPar[k] = acc[k][0] / acc[k][1]; });
    return out;
  }

  /** The KBs of a round: the last-placed row of the KB table, plus anyone level with it. */
  function kbLowest(rows) {
    if (!rows || rows.length < 2) return [];
    const last = rows[rows.length - 1];
    return last.pos !== undefined ? rows.filter(r => r.pos === last.pos) : [last];
  }

  return {
    SEGMENTS, roundStats, playerSummary, kbLowest, roundHandicap, handicapWorking, playingHandicap, shotsOnHole,
    isEntered, stablefordPoints, scoreName, metresToYards, playOrder, teamLabels,
    matchProgress, matchWinner, describeMatch, rankRows, computeRound, tripStandings,
    partnerHistory, repeatedPartners, proposeDraw, cardValue, matchCardRows, compareCard,
    kbValid, kbEffective, teamsFor, groupSizes, addMinutes, teeTimesFrom, makeGroups, randomDraw, shuffle, kbPairsFor,
    countbackKey, compareKeys, rankByKey, finalOrder, kbStandings, goyStandings, scoreMark, pickupStrokes
  };
});
