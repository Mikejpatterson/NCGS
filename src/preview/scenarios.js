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
    { id: 'westport', title: 'Westport trip', note: 'Coming with the scramble scoring and the breakfast draw.', soon: true }
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
