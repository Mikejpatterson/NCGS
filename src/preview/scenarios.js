/* Test scenarios for the private preview only (owner, 24 October): put the app into one situation (pre-season,
   an announced round, a round in progress...) with invented data, so it can be looked at on a phone.
   build.js inlines this file only in the local preview, never in the live app. It runs before the app: when a
   scenario is chosen it clears the preview's own saved data and hands the app a changed copy of the invented
   starting data, so everything after that goes through the real server code as usual.
   Choose one from Home ("Test scenarios") or open app.html#scenario=<id>. */
(function () {
  var FLAG = 'ncgs-preview-scenario';
  var KEYS = ['ncgs-preview-cache-v1', 'ncgs-preview-outbox-v1', 'ncgs-preview-prefs-v1', 'ncgs-preview-server-v1'];
  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private window */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* private window */ } }
  };
  var clone = function (x) { return JSON.parse(JSON.stringify(x)); };
  var day = function (n) { var d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var thisYear = new Date().getFullYear();
  var finals = function (seed) { return seed.rounds.filter(function (r) { return r.status === 'final'; }); };
  var next = function (seed) { return seed.rounds.filter(function (r) { return r.status === 'upcoming'; })[0]; };
  var ME = 'john-w';   // the invented golfer you are in every scenario

  var LIST = [
    { id: 'today', title: 'Round in progress', note: 'A demo round on the course: Continue, the leaderboard and contests.',
      make: function (seed, demo) { return { seed: seed, demo: demo, me: demo.rounds[0].groups[0].teams[0][0] }; } },
    { id: 'between', title: 'Between rounds', note: 'This season played, nothing booked yet.',
      make: function (seed) { seed.rounds = finals(seed); return { seed: seed }; } },
    { id: 'undated', title: 'Round planned, no date yet', note: 'Members don’t see it yet. Open Organiser to see the reminder to set a date.',
      make: function (seed) { var r = next(seed); r.date = ''; r.groups = []; r.kb = null; r.name = 'Autumn outing'; return { seed: seed }; } },
    { id: 'announced', title: 'Next round announced', note: 'Date and course set; groups not drawn yet.',
      make: function (seed) { var r = next(seed); r.date = day(23); r.groups = []; r.kb = null; r.name = 'Autumn outing'; return { seed: seed }; } },
    { id: 'ready', title: 'Next round, groups ready', note: 'In three days, with groups, tee times and KB pairs.',
      make: function (seed) { var r = next(seed); r.date = day(3); r.name = 'Autumn outing'; return { seed: seed }; } },
    { id: 'eventday', title: 'Round day, before tee-off', note: 'Today, groups out, no scores yet.',
      make: function (seed) { var r = next(seed); r.date = day(0); r.name = 'Autumn outing'; return { seed: seed }; } },
    { id: 'preseason', title: 'New season opened, nothing booked', note: 'The organiser has started next season; last season is in the archive.',
      make: function (seed) {
        seed.rounds = finals(seed).concat([Object.assign(clone(next(seed)), { id: 'fx-next1', season: thisYear + 1, date: '', groups: [], kb: null, name: 'Athenry', trip: null, trip_day: null })]);
        seed.settings = [{ key: 'season', value: String(thisYear + 1) }];
        return { seed: seed };
      } },
    { id: 'preseason-announced', title: 'New season, first round announced', note: 'Next season open and its first round dated.',
      make: function (seed) {
        seed.rounds = finals(seed).concat([Object.assign(clone(next(seed)), { id: 'fx-next1', season: thisYear + 1, date: (thisYear + 1) + '-03-28', groups: [], kb: null, name: 'Athenry', trip: null, trip_day: null })]);
        seed.settings = [{ key: 'season', value: String(thisYear + 1) }];
        return { seed: seed };
      } },
    { id: 'westport', title: 'Westport trip: scramble day', note: 'Day one at Ballinrobe played; the Westport scramble under way, 4 teams of 4. Your team is short of drives.',
      make: function (seed) {
        var r1 = finals(seed)[0], y = r1.season;
        // Sixteen golfers: the twelve regulars plus four more invented ones.
        seed.members = seed.members.concat([
          { id: 'fx-p13', name: 'Malachy', full: 'Malachy Fixture', index: 18.4, active: true },
          { id: 'fx-p14', name: 'Niall', full: 'Niall Fixture', index: 9.6, active: true },
          { id: 'fx-p15', name: 'Oisín', full: 'Oisín Fixture', index: 23.1, active: true },
          { id: 'fx-p16', name: 'Pádraig', full: 'Pádraig Fixture', index: 27.9, active: true }]);
        var players = seed.members.filter(function (m) { return m.id.indexOf('guest') !== 0; }).sort(function (a, b) { return a.index - b.index; }).map(function (m) { return m.id; });
        players.splice(players.indexOf(ME), 1); players.unshift(ME);   // you lead pot A, so you're in Team 1
        // Pots A to D by handicap; each team takes one from each pot.
        var pots = [0, 1, 2, 3].map(function (k) { return players.slice(k * 4, k * 4 + 4); });
        var groups = [0, 1, 2, 3].map(function (t) {
          return { id: 'g' + (t + 1), n: t + 1, teeTime: '10:' + String(t * 10).padStart(2, '0'), startHole: 1, teams: [[pots[0][t], pots[1][t]], [pots[2][t], pots[3][t]]] };
        });
        var day1 = Object.assign(clone(r1), { id: 'fx-wp1', name: 'Ballinrobe', trip: 'Westport', trip_day: 1, date: day(-1), season: y });
        var day2 = Object.assign(clone(r1), { id: 'fx-wp2', name: 'Westport', trip: 'Westport', trip_day: 2, date: day(0), season: y, status: 'live', groups: groups, kb: null, ph: null, results: null, contests: [{ type: 'ntp', hole: 7 }, { type: 'ld', hole: 12 }] });
        seed.rounds = finals(seed).filter(function (r) { return r.trip !== 'Westport'; }).concat([day1, day2]);
        seed.scores = seed.scores.concat(seed.scores.filter(function (x) { return x.round === r1.id; }).map(function (x) { return Object.assign({}, x, { round: 'fx-wp1' }); }));
        // Team scores, each saved under the player whose drive was used. Team 1 (yours) has leaned on two drivers.
        var thru = [14, 7, 6, 5], strokes = [4, 5, 3, 4, 4, 5, 3, 4, 4, 4, 5, 3, 4, 4, 5, 3, 4, 4];
        groups.forEach(function (g, t) {
          var team = g.teams[0].concat(g.teams[1]);
          for (var n = 1; n <= thru[t]; n++) {
            var driver = t === 0 ? team[n % 3 === 0 ? 1 : 0] : team[(n + t) % 4];
            seed.scores.push({ round: 'fx-wp2', player: driver, hole: n, strokes: strokes[(n + t) % 18], by: 'Fixture', at: day(0) + 'T1' + t + ':00:00Z' });
          }
        });
        seed.claims = [{ round: 'fx-wp2', hole: 7, grp: 'g1', player: groups[0].teams[0][0], at: day(0) + 'T11:00:00Z' },
          { round: 'fx-wp2', hole: 7, grp: 'g2', player: '_nobody', at: day(0) + 'T11:10:00Z' }];
        seed.settings = [{ key: 'format:fx-wp2', value: 'scramble' }, { key: 'teamshots:fx-wp2', value: JSON.stringify({ g1: 0, g2: 2, g3: 0, g4: 3 }) },
          { key: 'tripboard:' + y + ':Westport', value: 'off' }];
        return { seed: seed };
      } },
    { id: 'draw', title: 'Westport trip: breakfast draw', note: 'Saturday breakfast before the scramble. The pots are set and members can see them; the organiser draws the four teams.',
      make: function (seed) {
        var r1 = finals(seed)[0], y = r1.season;
        seed.members = seed.members.concat([
          { id: 'fx-p13', name: 'Malachy', full: 'Malachy Fixture', index: 18.4, active: true },
          { id: 'fx-p14', name: 'Niall', full: 'Niall Fixture', index: 9.6, active: true },
          { id: 'fx-p15', name: 'Oisín', full: 'Oisín Fixture', index: 23.1, active: true },
          { id: 'fx-p16', name: 'Pádraig', full: 'Pádraig Fixture', index: 27.9, active: true }]);
        var players = seed.members.filter(function (m) { return m.id.indexOf('guest') !== 0; }).sort(function (a, b) { return a.index - b.index; }).map(function (m) { return m.id; });
        var pots = [0, 1, 2, 3].map(function (k) { return players.slice(k * 4, k * 4 + 4); });
        var day1 = Object.assign(clone(r1), { id: 'fx-wp1', name: 'Ballinrobe', trip: 'Westport', trip_day: 1, date: day(-1), season: y });
        var day2 = Object.assign(clone(r1), { id: 'fx-wp2', name: 'Westport', trip: 'Westport', trip_day: 2, date: day(0), season: y, status: 'upcoming', first_tee: '10:00', interval: 10, groups: [], kb: null, ph: null, results: null, contests: [{ type: 'ntp', hole: 7 }, { type: 'ld', hole: 12 }] });
        seed.rounds = finals(seed).filter(function (r) { return r.trip !== 'Westport'; }).concat([day1, day2]);
        seed.scores = seed.scores.concat(seed.scores.filter(function (x) { return x.round === r1.id; }).map(function (x) { return Object.assign({}, x, { round: 'fx-wp1' }); }));
        seed.settings = [{ key: 'format:fx-wp2', value: 'scramble' }, { key: 'tripboard:' + y + ':Westport', value: 'off' },
          { key: 'pots:fx-wp2', value: JSON.stringify({ pots: pots, show: true }) }];
        return { seed: seed };
      } }
  ];
  var find = function (id) { for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id && !LIST[i].soon) return LIST[i]; return null; };
  var start = function (id) { LS.set(FLAG, id); KEYS.forEach(LS.del); };

  // app.html#scenario=<id> starts that scenario straight away.
  var m = /scenario=([\w-]+)/.exec(location.hash || '');
  if (m && find(m[1])) { start(m[1]); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ } }

  // Changing only the #scenario part of the address doesn't reload the page, so do it here.
  window.addEventListener('hashchange', function () {
    var h = /scenario=([\w-]+)/.exec(location.hash || '');
    if (h && find(h[1])) { start(h[1]); location.replace(location.pathname + location.search); }
  });

  var cur = find(LS.get(FLAG)) || find('today');
  window.NCGS_SCENARIOS = {
    list: LIST.map(function (s) { return { id: s.id, title: s.title, note: s.note, soon: !!s.soon }; }),
    current: cur.id,
    choose: function (id) { if (!find(id)) return; start(id); location.reload(); }
  };
  // Until a scenario has been picked, the preview starts exactly as it always has (the tests rely on that).
  if (!find(LS.get(FLAG))) return;
  if (LS.get('ncgs-preview-server-v1')) return;   // already set up: keep whatever has been tapped since
  var out = cur.make(clone(window.NCGS_SEED), window.NCGS_DEMO ? clone(window.NCGS_DEMO) : null);
  window.NCGS_SEED = out.seed;
  window.NCGS_DEMO = out.demo || null;
  LS.set('ncgs-preview-prefs-v1', JSON.stringify({ me: out.me || ME, drafts: {} }));
})();
