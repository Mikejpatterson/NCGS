/* Golf trip app: screens and interaction. All golf maths lives in engine.js.
   Rule for every screen: nothing should need explaining. If a screen needs a hint, change the screen. */
(function () {
  'use strict';
  const E = window.Engine;
  const CFG = window.TRIP_CONFIG;
  const SEED = window.TRIP_SEED;
  const KEY = 'golf-trip-test-v2';
  const PIN = '1234';
  const clone = o => JSON.parse(JSON.stringify(o));
  CFG.course.holes.forEach(h => { h.yards = E.metresToYards(h.metres); });

  /* ---------- Icons ---------- */
  const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const ICON = {
    back: svg('<path d="M15 5l-7 7 7 7"/>'),
    chev: svg('<path d="M9 5l7 7-7 7"/>'),
    check: svg('<path d="M5 12.5l4.5 4.5L19 7"/>'),
    lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    users: svg('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6"/><path d="M16 5.2a3 3 0 0 1 0 5.6M18 14.6c1.4.6 2.3 2 2.6 4.4"/>'),
    buggy: svg('<path d="M4 15h15l-1.5-6H9L7 4H4"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>'),
    history: svg('<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/><path d="M12 8v4l3 2"/>'),
    download: svg('<path d="M12 4v11"/><path d="M7.5 10.5L12 15l4.5-4.5"/><path d="M5 20h14"/>'),
    camera: svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
    course: svg('<path d="M7 21V5"/><path d="M7 5l9 3.5L7 12"/><ellipse cx="12" cy="20" rx="8" ry="1.6"/>')
  };
  const sized = (icon, n) => icon.replace('<svg', `<svg width="${n}" height="${n}"`);
  const TABICON = {
    hole: svg('<path d="M6 21V4"/><path d="M6 4h12l-2.5 4L18 12H6"/>'),
    match: svg('<path d="M4 8h14"/><path d="M15 5l3 3-3 3"/><path d="M20 16H6"/><path d="M9 13l-3 3 3 3"/>'),
    board: svg('<path d="M10 6h10M10 12h10M10 18h10"/><path d="M4.5 6h1.5M4.5 12h1.5M4.5 18h1.5"/>')
  };
  const CONTEST = { ntp: 'Nearest the pin', ld: 'Longest drive' };

  /* ---------- Saved state (this phone only in the test version) ---------- */
  let storageOk = true;
  function freshState() {
    return {
      v: 2,
      me: null,
      players: CFG.players.map(p => ({ id: p.id, name: p.name, index: p.index })),
      allowance: CFG.allowance,
      status: Object.fromEntries(CFG.rounds.map(r => [r.id, r.status])),
      groups: {},
      ph: {},
      scores: clone(SEED.scores),
      drafts: {},
      claims: clone(SEED.claims),
      winners: {},
      submitted: {},
      checks: {},
      log: clone(SEED.log || [])
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.v === 2) {
          s.checks = s.checks || {};
          Object.values(s.checks).forEach(byG => Object.values(byG).forEach(bySeg => Object.values(bySeg).forEach(c => {
            if (c.status === 'reading') { c.status = 'failed'; c.reason = 'interrupted'; }
          })));
          return s;
        }
      }
    } catch (e) { storageOk = false; }
    return freshState();
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); storageOk = true; } catch (e) { storageOk = false; }
  }
  let S = load();

  /* ---------- Screen state ---------- */
  const ui = {
    view: null, hole: null, edit: false, after: null, sheet: null, sheetBack: null, contestSheet: false,
    matchGroup: null, board: null, open: {}, flash: false, scrollCur: false, scrollTop: false, resultsRid: null,
    org: false, orgUnlocked: false, orgView: 'home', orgRid: null, orgGroup: null, orgHole: null, orgPid: null,
    draw: null, checkSeg: null, testSheet: null, photoFull: null, confirmReset: false, toast: null, pinError: false, indexError: null
  };
  let downloads = null;
  let sampleFn = null;
  let canReadImages = false;
  const FIX = window.TRIP_CARD_FIXTURES || { cards: {} };

  /* ---------- Helpers ---------- */
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const holeOf = n => CFG.course.holes[n - 1];
  const player = id => S.players.find(p => p.id === id);
  const nameOf = id => (player(id) || { name: id }).name;
  const roundOf = rid => CFG.rounds.find(r => r.id === rid);
  const groupsOf = rid => S.groups[rid] || roundOf(rid).groups || null;
  const teeOf = rid => CFG.course.tees[roundOf(rid).tee];
  const contestOn = (rid, n) => (roundOf(rid).contests || []).find(c => c.hole === n) || null;
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const fmtIndex = i => (i < 0 ? '+' + (-i).toFixed(1) : i.toFixed(1));
  const fmtGross = v => (v === 'P' ? 'picked up' : String(v));
  const segName = s => ({ front: 'Front nine', back: 'Back nine', overall: 'Overall' }[s]);
  const sideCls = l => (l === 'A' ? 'c-a' : l === 'B' ? 'c-b' : '');
  const chev = `<span class="chev">${ICON.chev}</span>`;
  const pill = i => `<span class="pill ${i ? 'b' : 'a'}">Buggy ${i + 1}</span>`;
  const dot = i => `<span class="dot ${i ? 'b' : 'a'}"></span>`;

  let cache = {};
  function computeR(rid) {
    if (cache[rid]) return cache[rid];
    const groups = groupsOf(rid);
    if (!groups) return null;
    const players = Object.fromEntries(S.players.map(p => [p.id, p]));
    cache[rid] = E.computeRound({
      groups, holes: CFG.course.holes, tee: teeOf(rid), allowance: S.allowance,
      players, scores: S.scores[rid] || {}, phOverride: S.ph[rid]
    });
    return cache[rid];
  }
  function liveRid() {
    const live = CFG.rounds.find(r => S.status[r.id] === 'live');
    if (live) return live.id;
    const next = CFG.rounds.find(r => S.status[r.id] === 'upcoming');
    return next ? next.id : CFG.rounds[CFG.rounds.length - 1].id;
  }
  function myGroup(rid) {
    return (groupsOf(rid) || []).find(g => g.teams.flat().includes(S.me)) || null;
  }
  function groupNo(rid, gid) { const g = (groupsOf(rid) || []).find(x => x.id === gid); return g ? g.n : '?'; }
  function claimLeader(rid, n, exceptGid) {
    const list = ((S.claims[rid] || {})[n] || []).filter(c => c.gid !== exceptGid);
    return list.length ? list[list.length - 1] : null;
  }
  function logIt(action, detail) {
    S.log.push({ at: new Date().toISOString(), by: ui.org ? 'Organiser' : nameOf(S.me), action, detail });
  }
  function tick() { try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) { /* not supported */ } }
  function toast(msg) {
    ui.toast = msg;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { ui.toast = null; renderToast(); }, 2600);
    renderToast();
  }
  function dots(shots, small) {
    const cls = `dots${small ? ' s' : ''}`;
    if (shots > 0) return `<span class="${cls}" role="img" aria-label="${plural(shots, 'shot')}">${'<i></i>'.repeat(shots)}</span>`;
    if (shots < 0) return `<span class="${cls} give" role="img" aria-label="gives back ${plural(-shots, 'shot')}">${'<i></i>'.repeat(-shots)}</span>`;
    return `<span class="${cls}" role="img" aria-label="no shots"></span>`;
  }
  const status = st => `<span class="b ${sideCls(st.leader)}">${esc(st.text)}</span>`;
  const sec = (label, body, near) => `<section class="sec${near ? ' near' : ''}">${label ? `<div class="sec-label">${label}</div>` : ''}${body}</section>`;

  function homeView() {
    const rid = liveRid();
    if (S.status[rid] !== 'live') return 'today';
    const g = myGroup(rid);
    if (!g) return 'today';
    const gc = computeR(rid).groups.find(x => x.id === g.id);
    return gc.nextHole ? 'tee' : 'card';
  }

  /* ================= PLAYER SCREENS ================= */

  function vWho() {
    const list = S.players.slice().sort((a, b) => a.name.localeCompare(b.name));
    return {
      tabs: false,
      html: `<div class="head"><h1 class="title">Who are you?</h1></div>
      <div class="card" style="margin-top:16px">${list.map(p => `<button class="row" data-act="pick" data-id="${p.id}"><span>${esc(p.name)}</span>${chev}</button>`).join('')}</div>
      <p class="cap" style="margin-top:16px;text-align:center">Test version · demo players and scores · saved on this phone</p>
      <div style="text-align:center"><button class="link" data-act="org">Organiser</button></div>`
    };
  }

  function vTee() {
    const rid = liveRid();
    const comp = computeR(rid);
    const g = myGroup(rid);
    const gc = comp.groups.find(x => x.id === g.id);
    const n = gc.nextHole;
    ui.hole = n;
    const h = holeOf(n);
    const seg = n <= 9 ? 'front' : 'back';
    const m = gc.matches[seg].status;
    const mShow = m.state === 'pending' ? { text: 'All square', leader: null } : m;
    const d = ((S.drafts[rid] || {})[g.id] || {})[n];
    const hasDraft = d && Object.keys(d).some(k => k[0] !== '_');
    const contest = contestOn(rid, n);
    const teams = gc.teams.map((t, i) => sec(pill(i), `<div class="card">${t.map(pid => `<div class="row"><span>${esc(nameOf(pid))}</span>${dots(comp.players[pid].holes[n].shots)}</div>`).join('')}</div>`, i === 1)).join('');
    const checkRows = ['front', 'back'].filter(sg => nineComplete(gc, sg)).map(sg => {
      const c = checkOf(rid, g.id, sg);
      return c && c.resolved ? '' : checkRow(sg, c);
    }).join('');
    return {
      tabs: true, tab: 'hole',
      html: `<div class="head"><h1 class="title">Hole ${n}</h1><button class="link" data-act="go" data-view="today">Groups</button></div>
      <p class="sub num">Par ${h.par} · Index ${h.si} · ${h.yards} yds</p>
      ${contest ? `<div class="note"><span class="pill n">${CONTEST[contest.type]}</span></div>` : ''}
      ${teams}
      ${sec('', `<div class="card"><button class="row" data-act="tab" data-tab="match"><span class="sub">${segName(seg)}</span>${status(mShow)}</button>${checkRows}</div>`)}
      <button class="btn" data-act="enter"${checkRows ? ' style="margin-top:16px"' : ''}>${hasDraft ? 'Continue scores' : 'Enter scores'}</button>
      ${storageOk ? '' : '<p class="err" style="text-align:center">This phone is not saving. Keep this screen open.</p>'}`
    };
  }

  /* ----- Score entry (also used by the organiser to correct a hole) ----- */
  function entryCtx() {
    if (ui.org) return { rid: ui.orgRid, gid: ui.orgGroup, n: ui.orgHole, mode: 'org', edit: true, dkey: 'org-' + ui.orgGroup };
    const rid = liveRid();
    const g = myGroup(rid);
    return { rid, gid: g.id, n: ui.hole, mode: 'player', edit: ui.edit, dkey: g.id };
  }
  function ensureDraft(ctx) {
    const byRound = S.drafts[ctx.rid] || (S.drafts[ctx.rid] = {});
    const byGroup = byRound[ctx.dkey] || (byRound[ctx.dkey] = {});
    if (!byGroup[ctx.n]) {
      const d = {};
      const gc = computeR(ctx.rid).groups.find(x => x.id === ctx.gid);
      if (ctx.edit) {
        gc.teams.flat().forEach(pid => {
          const v = ((S.scores[ctx.rid] || {})[pid] || {})[ctx.n];
          if (E.isEntered(v)) d[pid] = v;
        });
      }
      const mine = ((S.claims[ctx.rid] || {})[ctx.n] || []).find(c => c.gid === ctx.gid);
      if (mine) d._claim = mine.pid;
      byGroup[ctx.n] = d;
    }
    return byGroup[ctx.n];
  }
  function clearDraft(ctx) {
    const byGroup = (S.drafts[ctx.rid] || {})[ctx.dkey];
    if (byGroup) delete byGroup[ctx.n];
  }

  function entryRow(pid, val, shots, par) {
    const name = esc(nameOf(pid));
    const nums = [];
    for (let v = Math.max(1, par - 2); v <= par + 4; v++) nums.push(v);
    if (Number.isInteger(val) && !nums.includes(val)) { nums.push(val); nums.sort((a, b) => a - b); }
    let score = '';
    if (val === 'P') score = `<span class="sub">Picked up</span>`;
    else if (E.isEntered(val)) score = `<span class="sub">${E.scoreName(val, par)}</span><span class="s">${val}<sup>${E.stablefordPoints(val, par, shots)}</sup></span>`;
    const flash = ui.flash && !E.isEntered(val) ? ' flash' : '';
    return `<div class="pr${flash}">
      <div class="pr-top"><div><div>${name}</div>${dots(shots, true)}</div><div class="pr-score">${score}</div></div>
      <div class="picker" role="group" aria-label="Strokes for ${name}">
        ${nums.map(v => `<button class="${val === v ? 'on' : ''}" data-act="set" data-pid="${pid}" data-v="${v}" aria-pressed="${val === v}">${v}</button>`).join('')}
        <button class="pu ${val === 'P' ? 'on' : ''}" data-act="set" data-pid="${pid}" data-v="P" aria-pressed="${val === 'P'}">Pick up</button>
      </div></div>`;
  }

  function vEntry() {
    const ctx = entryCtx();
    const comp = computeR(ctx.rid);
    const gc = comp.groups.find(x => x.id === ctx.gid);
    const h = holeOf(ctx.n);
    const d = ensureDraft(ctx);
    const pids = gc.teams.flat();
    const missing = pids.filter(pid => !E.isEntered(d[pid]));
    const final = S.status[ctx.rid] === 'final';
    let html = '<div class="entry">';
    if (ctx.mode === 'org') html += `<p class="cap">Correcting group ${gc.n}</p>`;
    html += `<div class="entry-head"><button class="back-icon" data-act="entry-back" aria-label="Back">${ICON.back}</button><h1 class="title">Hole ${ctx.n}</h1><span class="sub num">Par ${h.par} · Index ${h.si}</span></div>`;
    if (final) html += `<div class="banner" style="margin-top:12px">Round ${roundOf(ctx.rid).n} is final.</div><button class="btn quiet" data-act="reopen">Reopen round</button>`;
    html += gc.teams.map((t, i) => sec(pill(i), `<div class="card">${t.map(pid => entryRow(pid, d[pid], comp.players[pid].holes[ctx.n].shots, h.par)).join('')}</div>`)).join('');
    const contest = contestOn(ctx.rid, ctx.n);
    if (contest) {
      const lead = claimLeader(ctx.rid, ctx.n, ctx.gid);
      const right = d._claim ? `<span class="b">${esc(nameOf(d._claim))}</span>` : `<span class="sub">${lead ? `${esc(nameOf(lead.pid))} leads` : 'Add'}</span>`;
      html += sec('', `<button class="card row" data-act="contest-open"><span>${CONTEST[contest.type]}</span><span class="right">${right}${chev}</span></button>`);
    }
    const who = missing.length && missing.length <= 2 ? ' · ' + missing.map(nameOf).join(', ') : '';
    const label = missing.length ? `${plural(missing.length, 'score')} to go${esc(who)}` : ctx.mode === 'org' ? 'Save correction' : ctx.edit ? 'Save changes' : `Save hole ${ctx.n}`;
    html += `<div class="savebar"><button class="btn ${missing.length ? 'quiet' : ''}" data-act="save">${label}</button></div></div>`;
    if (ui.contestSheet && contest) {
      const lead = claimLeader(ctx.rid, ctx.n, ctx.gid);
      const tickMark = `<span class="c-g">${sized(ICON.check, 20)}</span>`;
      html += `<div class="scrim" data-act="contest-scrim"><div class="sheet" role="dialog" aria-label="${CONTEST[contest.type]}">
        <div class="nav"><span class="b">${CONTEST[contest.type]}</span><button class="link" data-act="contest-close">Done</button></div>
        ${lead ? `<p class="sub" style="margin-bottom:8px">${esc(nameOf(lead.pid))} (group ${groupNo(ctx.rid, lead.gid)}) leads</p>` : ''}
        <div class="card">${pids.map(pid => `<button class="row" data-act="claim" data-pid="${pid}"><span>${esc(nameOf(pid))}</span>${d._claim === pid ? tickMark : ''}</button>`).join('')}
        <button class="row" data-act="claim" data-pid=""><span>${lead ? 'Nobody closer' : 'Nobody'}</span>${!d._claim ? tickMark : ''}</button></div>
      </div></div>`;
    }
    return { tabs: false, html };
  }

  function setScore(pid, v) {
    const ctx = entryCtx();
    if (S.status[ctx.rid] === 'final') { toast('This round is final. Reopen it to change scores.'); return; }
    const d = ensureDraft(ctx);
    const val = v === 'P' ? 'P' : Number(v);
    if (d[pid] === val) delete d[pid]; else d[pid] = val;
    persist();
    render();
  }

  function saveHole() {
    const ctx = entryCtx();
    const comp = computeR(ctx.rid);
    const gc = comp.groups.find(x => x.id === ctx.gid);
    const d = ensureDraft(ctx);
    const pids = gc.teams.flat();
    const missing = pids.filter(pid => !E.isEntered(d[pid]));
    if (missing.length) {
      ui.flash = true;
      render();
      setTimeout(() => { ui.flash = false; }, 1300);
      return;
    }
    if (S.status[ctx.rid] === 'final') { toast('This round is final. Reopen it to change scores.'); return; }
    const before = {};
    ['front', 'back', 'overall'].forEach(s => { before[s] = gc.matches[s].status.text; });
    const sc = S.scores[ctx.rid] || (S.scores[ctx.rid] = {});
    const prev = {};
    const changes = [];
    pids.forEach(pid => {
      const card = sc[pid] || (sc[pid] = {});
      prev[pid] = card[ctx.n];
      if (card[ctx.n] !== undefined && card[ctx.n] !== d[pid]) changes.push(`${nameOf(pid)} ${fmtGross(card[ctx.n])} → ${fmtGross(d[pid])}`);
      card[ctx.n] = d[pid];
    });
    const claimsBefore = clone(((S.claims[ctx.rid] || {})[ctx.n]) || []);
    if (contestOn(ctx.rid, ctx.n)) {
      const cl = S.claims[ctx.rid] || (S.claims[ctx.rid] = {});
      const list = cl[ctx.n] || [];
      const mine = list.find(c => c.gid === ctx.gid);
      const want = d._claim || null;
      if ((mine ? mine.pid : null) !== want) {
        const rest = list.filter(c => c.gid !== ctx.gid);
        if (want) rest.push({ pid: want, gid: ctx.gid, at: new Date().toISOString() });
        cl[ctx.n] = rest;
      }
    }
    if (changes.length) logIt(ctx.mode === 'org' ? 'Score corrected' : 'Score changed', `Round ${roundOf(ctx.rid).n} · Group ${gc.n} · Hole ${ctx.n}: ${changes.join(', ')}`);
    const draftCopy = clone(d);
    clearDraft(ctx);
    persist();
    tick();
    if (ctx.mode === 'org') {
      ui.orgView = 'group';
      render();
      toast(changes.length ? `Hole ${ctx.n} corrected` : 'No scores changed');
      return;
    }
    ui.after = { rid: ctx.rid, gid: ctx.gid, n: ctx.n, before, prev, claimsBefore, draft: draftCopy, wasEdit: ctx.edit, logged: changes.length > 0 };
    ui.edit = false;
    go('after');
  }

  function undoSave() {
    const a = ui.after;
    if (!a) return;
    const sc = S.scores[a.rid];
    Object.keys(a.prev).forEach(pid => {
      if (a.prev[pid] === undefined) delete sc[pid][a.n];
      else sc[pid][a.n] = a.prev[pid];
    });
    (S.claims[a.rid] || (S.claims[a.rid] = {}))[a.n] = a.claimsBefore;
    const byRound = S.drafts[a.rid] || (S.drafts[a.rid] = {});
    (byRound[a.gid] || (byRound[a.gid] = {}))[a.n] = a.draft;
    if (a.logged) logIt('Change undone', `Round ${roundOf(a.rid).n} · Hole ${a.n}`);
    ui.hole = a.n;
    ui.edit = a.wasEdit;
    ui.after = null;
    persist();
    go('entry');
  }

  function vAfter() {
    const a = ui.after;
    if (!a) { ui.view = homeView(); return VIEWS[ui.view](); }
    const comp = computeR(a.rid);
    const gc = comp.groups.find(x => x.id === a.gid);
    const hr = gc.holes[a.n];
    const L = gc.labels;
    const who = list => list.map(nameOf).join(' and ');
    let title, cls, sub;
    if (hr.result === 'H') {
      title = `Hole ${a.n} halved`;
      cls = '';
      sub = `Both buggies scored ${plural(hr.best[0], 'point')}`;
    } else {
      const w = hr.result === 'A' ? 0 : 1;
      const l = 1 - w;
      title = `${L[w].long} win ${a.n}`;
      cls = w ? 'c-b' : 'c-a';
      sub = `${who(hr.counting[w])}'s ${plural(hr.best[w], 'point')} beat ${hr.best[l]}`;
    }
    const segs = [a.n <= 9 ? 'front' : 'back', 'overall'];
    const rows = segs.map(s => {
      const m = gc.matches[s];
      const now = m.status.text;
      const was = a.before[s];
      const changed = was !== now && was !== 'Not started';
      return `<div class="row tall chg"><span><div>${segName(s)}</div><div class="cap">${m.remaining ? `${m.remaining} to play` : 'Finished'}</div></span>
        <span class="right">${changed ? `<s>${esc(was)}</s>` : ''}<span class="b ${sideCls(m.status.leader)} ${was !== now ? 'new' : ''}">${esc(now)}</span></span></div>`;
    }).join('');
    let next;
    const nine = a.n <= 9 ? 'front' : 'back';
    if (S.status[a.rid] === 'live' && nineComplete(gc, nine) && !checkOf(a.rid, a.gid, nine)) {
      next = `${photoBtn(nine, true)}<button class="btn quiet" style="margin-top:8px" data-act="${gc.nextHole ? 'next' : 'go'}"${gc.nextHole ? '' : ' data-view="card"'}>Later</button>${testCardLink(nine)}`;
    } else if (gc.nextHole) {
      const nh = holeOf(gc.nextHole);
      next = `<button class="btn" data-act="next">Hole ${gc.nextHole}<small>Par ${nh.par} · Index ${nh.si} · ${nh.yards} yds</small></button>`;
    } else {
      next = `<button class="btn" data-act="go" data-view="card">See the card</button>`;
    }
    return {
      tabs: true, tab: 'hole',
      html: `<div class="nav"><span class="sub c-g" style="display:inline-flex;align-items:center;gap:4px">${sized(ICON.check, 18)} Saved</span><button class="link" data-act="undo">Undo</button></div>
      <h1 class="result ${cls}">${esc(title)}</h1>
      <p class="sub head-sub">${esc(sub)}</p>
      ${sec('', `<div class="card">${rows}</div>`)}
      ${next}`
    };
  }


  /* ----- Scorecard photo check ----- */
  const nineName = seg => (seg === 'front' ? 'front nine' : 'back nine');
  const showV = v => (v === 'P' ? 'Picked up' : v === null || v === undefined ? '?' : String(v));
  function checkOf(rid, gid, seg) { return ((S.checks[rid] || {})[gid] || {})[seg] || null; }
  function putCheck(rid, gid, seg, obj) {
    const byR = S.checks[rid] || (S.checks[rid] = {});
    (byR[gid] || (byR[gid] = {}))[seg] = obj;
    persist();
  }
  function nineComplete(gc, seg) { return E.SEGMENTS[seg].every(n => gc.holes[n].complete); }
  function openIssues(chk) {
    if (!chk || chk.status !== 'done' || chk.resolved) return 0;
    return chk.result.issues.filter(i => !chk.decisions[`${i.hole}:${i.pid}`]).length;
  }
  function photoBtn(seg, primary) {
    return `<label class="btn ${primary ? '' : 'quiet'}" for="photo-${seg}">${sized(ICON.camera, 20)}<span style="margin-left:8px">Photo of the ${nineName(seg)}</span></label>
      <input class="vh" type="file" accept="image/*" capture="environment" id="photo-${seg}" data-photo="${seg}">`;
  }
  function testCardLink(seg) {
    const any = Object.values(FIX.cards).some(c => c.nine === seg);
    return any ? `<div style="text-align:center"><button class="link sm" data-act="test-card" data-seg="${seg}">Use a test card</button></div>` : '';
  }
  function checkRow(seg, chk) {
    let right;
    if (!chk) right = '<span class="sub">Add photo</span>';
    else if (chk.status === 'reading') right = '<span class="pill n">Reading</span>';
    else if (chk.status === 'failed') right = '<span class="pill w">Try again</span>';
    else if (chk.status === 'manual' && !chk.resolved) right = '<span class="pill w">Check by eye</span>';
    else if (chk.status === 'done' && !chk.resolved) right = `<span class="pill w">${openIssues(chk) || 'All'} to check</span>`;
    else right = `<span class="c-g" style="display:inline-flex">${sized(ICON.check, 18)}</span>`;
    return `<button class="row" data-act="open-check" data-seg="${seg}"><span>${segName(seg)} card</span><span class="right">${right}${chev}</span></button>`;
  }

  async function prepImage(blob) {
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const draw = max => {
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k);
        c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        return c;
      };
      const send = await new Promise(r => draw(1600).toBlob(r, 'image/jpeg', 0.85));
      const small = draw(900).toDataURL('image/jpeg', 0.7);
      return { send, small };
    } finally { URL.revokeObjectURL(url); }
  }
  function dataUrlToBlob(d) {
    const [head, b64] = d.split(',');
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: (head.match(/data:([^;]+)/) || [])[1] || 'image/jpeg' });
  }

  function readerPrompt(rid, gc, seg) {
    const comp = computeR(rid);
    const hs = E.SEGMENTS[seg];
    const who = gc.teams.flat().map(pid => `${nameOf(pid)} (handicap index ${fmtIndex(player(pid).index)}, plays off ${comp.players[pid].ph})`).join('; ');
    return [
      'You are reading a photo of a handwritten golf scorecard for a scoring app. Transcribe it exactly. Never guess.',
      `It should show holes ${hs[0]} to ${hs[hs.length - 1]} for one group of four: ${who}.`,
      'Cards are filled in by hand, usually in pencil. Players are named in a key at the top (Player A/B/C/D or Jugador A/B/C/D, with a handicap); the score grid uses only the letters A B C D. Holes may run down the card or across it. Read the printed hole numbers and report scores by physical hole number.',
      '- Report gross STROKES per hole. If strokes have points written small beside or below them (a big 4 with a small 2), report only the big number.',
      '- A pick-up or no score is often written as X, a dash, a slash, P or NR: report "P".',
      '- If a number was rubbed out or crossed out and another written, report the final number and say so in note.',
      "- Ignore printed numbers (metres, yards, par, stroke index) and empty columns such as marker's score or W/L/H.",
      '- If you cannot read a cell confidently (glare, blur, or a digit that could be another, such as 4/9, 1/7, 3/8, 5/6), give your best reading with confidence "low" and say why in note. If you cannot read it at all, use value null.',
      `Reply with only a JSON object: {"holes":[${hs.join(',')}],"players":[{"letter":"A","name":"...","handicap":12,"scores":{"${hs[0]}":{"value":4,"confidence":"high","note":""}}}],"problems":["..."]}`
    ].join('\n');
  }

  async function startCheck(seg, source) {
    const rid = liveRid();
    const g = myGroup(rid);
    if (!g) return;
    ui.testSheet = null;
    let blob = source.file || null;
    try {
      if (source.fixture) blob = await (await fetch('cards/' + source.fixture)).blob();
      const { send, small } = await prepImage(blob);
      putCheck(rid, g.id, seg, { status: 'reading', photo: small, fixture: source.fixture || null, at: new Date().toISOString(), decisions: {} });
      ui.checkSeg = seg;
      go('check');
      runReader(rid, g.id, seg, send, source.fixture || null);
    } catch (e) {
      toast('That photo could not be opened. Try another.');
    }
  }

  const PERMANENT = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed', 'images_unavailable'];
  async function runReader(rid, gid, seg, sendBlob, fixtureKey) {
    const finish = patch => {
      const c = checkOf(rid, gid, seg);
      if (!c) return;
      Object.assign(c, patch);
      persist();
      const here = !ui.org && ui.view === 'check' && ui.checkSeg === seg;
      if (patch.status === 'done' && patch.resolved) toast(`${segName(seg)} card matches`);
      else if (patch.status === 'done') { tick(); if (!here) toast(`${segName(seg)} card: ${plural(patch.result.issues.length, 'score')} to check`); }
      render();
    };
    let reading = null;
    let src = 'live';
    try {
      if (sampleFn && canReadImages) {
        const gc = computeR(rid).groups.find(x => x.id === gid);
        reading = await sampleFn.json(readerPrompt(rid, gc, seg), { images: [sendBlob], cache: false });
      } else if (fixtureKey) {
        await new Promise(r => setTimeout(r, 900));
        reading = FIX.cards[fixtureKey].reading;
        src = 'recorded';
      } else { finish({ status: 'manual', reason: 'unavailable' }); return; }
    } catch (e) {
      const code = e && e.code;
      if (fixtureKey && PERMANENT.includes(code)) { reading = FIX.cards[fixtureKey].reading; src = 'recorded'; }
      else { finish({ status: PERMANENT.includes(code) ? 'manual' : 'failed', reason: code || 'error' }); return; }
    }
    if (!reading || !Array.isArray(reading.players)) { finish({ status: 'failed', reason: 'invalid' }); return; }
    const gc = computeR(rid).groups.find(x => x.id === gid);
    const pls = gc.teams.flat().map(pid => ({ id: pid, name: nameOf(pid) }));
    const r = E.compareCard(reading, pls, S.scores[rid] || {}, CFG.course.holes, E.SEGMENTS[seg]);
    if (!r.checked) { finish({ status: 'failed', reason: 'nomatch' }); return; }
    finish({ status: 'done', source: src, result: { checked: r.checked, matched: r.matched, issues: r.issues, problems: reading.problems || [] }, decisions: {}, resolved: r.issues.length === 0 });
  }

  function vCheck() {
    const rid = liveRid();
    const g = myGroup(rid);
    const seg = ui.checkSeg || 'front';
    const gc = computeR(rid).groups.find(x => x.id === g.id);
    const chk = checkOf(rid, g.id, seg);
    const back = gc.nextHole ? `Hole ${gc.nextHole}` : 'Card';
    let html = `<div class="nav"><button class="link" data-act="tab" data-tab="hole">${ICON.back}${back}</button></div>
      <div class="head"><h1 class="title">${segName(seg)} card</h1></div>`;
    if (!chk) {
      html += `${photoBtn(seg, true)}${testCardLink(seg)}`;
      return { tabs: true, tab: 'hole', html };
    }
    const thumb = `<button class="thumb" data-act="photo-full" aria-label="See the photo full size"><img src="${chk.photo}" alt="Photo of the ${nineName(seg)} card"></button>
      ${chk.fixture ? `<p class="cap note">Test card${chk.source === 'recorded' ? ' · recorded reading' : ''}</p>` : ''}`;
    if (chk.status === 'reading') {
      html += `<p class="sub head-sub"><span class="pulse"></span> Reading the card</p>${thumb}
        <button class="btn quiet" data-act="tab" data-tab="hole">${gc.nextHole ? `Carry on to hole ${gc.nextHole}` : 'Back to the card'}</button>`;
    } else if (chk.status === 'failed') {
      html += `<p class="sub head-sub">${chk.reason === 'nomatch' ? 'The rows on the card could not be matched to the players.' : 'The card could not be read.'}</p>${thumb}
        <button class="btn" data-act="retry-check" data-seg="${seg}">Try again</button>${photoBtn(seg, false)}
        <div style="text-align:center"><button class="link sm" data-act="manual-check" data-seg="${seg}">Check it by eye</button></div>`;
    } else if (chk.status === 'manual') {
      const comp = computeR(rid);
      const pids = gc.teams.flat();
      const rows = E.SEGMENTS[seg].map(n => `<button class="orow" data-act="edit-hole" data-n="${n}" aria-label="Change hole ${n}"><span class="b">${n}</span>${pids.map(pid => { const v = comp.players[pid].holes[n].gross; return `<span>${v === null ? '–' : v === 'P' ? 'P' : v}</span>`; }).join('')}</button>`).join('');
      html += `<p class="sub head-sub">Compare the app with the photo</p>${thumb}
        ${sec('', `<div class="card"><div class="orow"><span class="cap">Hole</span>${pids.map((pid, i) => `<span class="cap b ${i < 2 ? 'c-a' : 'c-b'}">${esc(nameOf(pid))}</span>`).join('')}</div>${rows}</div>`, true)}
        ${chk.resolved ? `<p class="sub c-g" style="text-align:center;margin-top:24px">Checked</p>` : '<button class="btn" data-act="manual-ok" data-seg="' + seg + '">All correct</button>'}`;
    } else {
      const r = chk.result;
      const issues = r.issues;
      if (!issues.length) {
        html += `<p class="sub head-sub">${r.matched} of ${r.checked} scores match</p>${thumb}
          ${sec('', `<div class="card"><div class="row tall"><span class="b c-g" style="display:inline-flex;align-items:center;gap:8px">${sized(ICON.check, 22)} The card matches the app</span></div></div>`)}
          <button class="btn" data-act="tab" data-tab="hole">Done</button>`;
      } else {
        const comp = computeR(rid);
        const live = (pid, n) => comp.players[pid].holes[n].gross;
        let changes = 0;
        const blocks = issues.map(i => {
          const k = `${i.hole}:${i.pid}`;
          const d = chk.decisions[k];
          if (d === 'card' && i.card !== null) changes += 1;
          const appNow = live(i.pid, i.hole);
          const tag = i.kind === 'differs' ? '' : '<span class="pill w">Hard to read</span>';
          const body = i.card === null
            ? `<div class="choices"><button class="choice ${d === 'app' ? 'on' : ''}" data-act="decide" data-k="${k}" data-v="app">App: ${showV(appNow)} is right</button><button class="choice" data-act="edit-hole" data-n="${i.hole}">Change it</button></div>`
            : `<div class="choices"><button class="choice ${d === 'card' ? 'on' : ''}" data-act="decide" data-k="${k}" data-v="card" aria-pressed="${d === 'card'}">Card: ${showV(i.card)}</button><button class="choice ${d === 'app' ? 'on' : ''}" data-act="decide" data-k="${k}" data-v="app" aria-pressed="${d === 'app'}">App: ${showV(appNow)}</button></div>`;
          return sec(`<span class="b">Hole ${i.hole} · ${esc(nameOf(i.pid))}</span>${tag}`, body, true);
        }).join('');
        const left = openIssues(chk);
        html += `<p class="sub head-sub">${r.matched} of ${r.checked} scores match</p>${thumb}${blocks}
          ${chk.resolved ? `<p class="sub c-g" style="text-align:center;margin-top:24px">Checked${chk.changes ? ` · ${plural(chk.changes, 'score')} changed` : ''}</p>`
            : `<div class="savebar" style="margin-top:24px"><button class="btn ${left ? 'quiet' : ''}" data-act="check-done" data-seg="${seg}">${left ? `${left} to decide` : changes ? `Done · ${plural(changes, 'score')} changed` : 'Done'}</button></div>`}`;
      }
    }
    return { tabs: true, tab: 'hole', html };
  }

  function applyCheck(seg) {
    const rid = liveRid();
    const g = myGroup(rid);
    const chk = checkOf(rid, g.id, seg);
    if (!chk || chk.status !== 'done') return;
    if (openIssues(chk)) { toast(`Pick card or app for ${plural(openIssues(chk), 'score')}`); return; }
    if (S.status[rid] === 'final') { toast('This round is final. Reopen it to change scores.'); return; }
    const changed = [];
    chk.result.issues.forEach(i => {
      if (chk.decisions[`${i.hole}:${i.pid}`] !== 'card' || i.card === null) return;
      const card = (S.scores[rid][i.pid] || (S.scores[rid][i.pid] = {}));
      const was = card[i.hole];
      card[i.hole] = i.card;
      changed.push(`${nameOf(i.pid)} hole ${i.hole} ${fmtGross(was)} → ${fmtGross(i.card)}`);
    });
    chk.resolved = true;
    chk.changes = changed.length;
    logIt('Card check', `Round ${roundOf(rid).n} · group ${g.n} · ${nineName(seg)}: ${changed.length ? 'changed from the card photo: ' + changed.join(', ') : 'checked, no changes'}`);
    persist();
    tick();
    render();
    toast(changed.length ? `${plural(changed.length, 'score')} changed. Results updated.` : `${segName(seg)} card checked`);
  }

  function vCard() {
    const rid = liveRid();
    const comp = computeR(rid);
    const g = myGroup(rid);
    const gc = comp.groups.find(x => x.id === g.id);
    const submitted = (S.submitted[rid] || {})[g.id];
    const players = gc.teams.map((t, i) => t.map(pid => `<div class="row"><span style="display:flex;align-items:center;gap:8px">${dot(i)}${esc(nameOf(pid))}</span><span class="b num">${comp.players[pid].total}</span></div>`).join('')).join('');
    const bw = ['front', 'back', 'overall'].map(s => `<div class="row"><span class="sub">${segName(s)}</span>${status(gc.matches[s].status)}</div>`).join('');
    const missing = 18 - gc.holesDone;
    const checks = ['front', 'back'].map(sg => checkRow(sg, checkOf(rid, g.id, sg))).join('');
    const pending = ['front', 'back'].find(sg => { const c = checkOf(rid, g.id, sg); return !c || !c.resolved; });
    let action;
    if (submitted) action = `<p class="sub c-g" style="margin-top:24px;text-align:center">Card submitted</p><button class="btn quiet" data-act="tab" data-tab="board">Leaderboard</button>`;
    else if (missing) action = `<button class="btn quiet" data-act="tab" data-tab="hole">${plural(missing, 'hole')} to enter</button>`;
    else if (pending) {
      const c = checkOf(rid, g.id, pending);
      action = (c ? `<button class="btn" data-act="open-check" data-seg="${pending}">Check the ${nineName(pending)} card</button>` : photoBtn(pending, true) + testCardLink(pending))
        + `<button class="btn quiet" style="margin-top:8px" data-act="submit">Submit without checking</button>`;
    } else action = `<button class="btn" data-act="submit">Submit card</button>`;
    return {
      tabs: true, tab: 'hole',
      html: `<div class="head"><h1 class="title">Group ${gc.n} card</h1></div>
      <p class="sub">Round ${roundOf(rid).n} · Stableford points</p>
      ${sec('', `<div class="card">${players}</div>`, true)}
      ${sec('<span class="sub">Buggy Wars</span>', `<div class="card">${bw}</div>`)}
      ${missing ? '' : sec('<span class="sub">Card check</span>', `<div class="card">${checks}</div>`)}
      ${action}`
    };
  }

  /* ----- Groups and handicaps ----- */
  function vToday() {
    const rid = liveRid();
    const r = roundOf(rid);
    const groups = groupsOf(rid);
    const st = S.status[rid];
    const mineLive = st === 'live' && myGroup(rid);
    const back = mineLive ? computeR(rid).groups.find(x => x.id === mineLive.id).nextHole : null;
    let html = back ? `<div class="nav"><button class="link" data-act="tab" data-tab="hole">${ICON.back}Hole ${back}</button></div>` : '';
    html += `<div class="head"><h1 class="title">Round ${r.n}</h1></div>
      <p class="sub">${esc(r.dateLabel)} · ${esc(CFG.course.name)}</p>`;
    if (!groups) {
      html += sec('', '<div class="card"><div class="row sub">Groups to be drawn</div></div>');
      return { tabs: true, tab: 'hole', html };
    }
    const comp = computeR(rid);
    const tee = teeOf(rid);
    const mine = myGroup(rid);
    const prow = g => g.teams.map((t, i) => t.map(pid => `<button class="hrow" data-act="hcp" data-pid="${pid}" data-rid="${rid}">
        <span class="nm">${dot(i)}<span class="${pid === S.me ? 'b' : ''}">${esc(nameOf(pid))}</span></span>
        <span class="r sub">${fmtIndex(player(pid).index)}</span><span class="r b">${comp.players[pid].ph}</span>${chev}</button>`).join('')).join('');
    const cols = '<div class="hrow cols"><span></span><span class="r cap">Index</span><span class="r cap">Playing</span><span></span></div>';
    if (mine) {
      html += sec(`<span class="bignum">${esc(mine.teeTime)}</span><span class="sub">Group ${mine.n}</span>`, `<div class="card">${cols}${prow(mine)}</div>
        <p class="cap note">${esc(tee.name)} tees · Slope ${tee.slope} · Rating ${tee.rating} · Par ${tee.par} · ${Math.round(S.allowance * 100)}%</p>`);
    }
    const others = groups.filter(g => !mine || g.id !== mine.id);
    html += sec(`<span class="sub">${mine ? 'Other groups' : 'Groups'}</span>`, `<div class="card">${others.map(g => {
      const key = rid + g.id;
      const open = !!ui.open[key];
      return `<button class="grow" data-act="toggle" data-key="${key}" aria-expanded="${open}"><span class="b num">${esc(g.teeTime)}</span>
        <span class="teams">${g.teams.map((t, i) => `<span>${dot(i)}${esc(t.map(nameOf).join(' & '))}</span>`).join('')}</span>${chev}</button>${open ? cols + prow(g) : ''}`;
    }).join('')}</div>`);
    html += `<div style="text-align:center;margin-top:16px"><button class="link" data-act="who">Not ${esc(nameOf(S.me))}?</button></div>`;
    return { tabs: true, tab: 'hole', html };
  }

  function vHcp() {
    const { pid, rid } = ui.sheet;
    const tee = teeOf(rid);
    const p = player(pid);
    const w = E.handicapWorking(p.index, tee, S.allowance);
    const frozen = S.ph[rid] && S.ph[rid][pid] !== undefined ? S.ph[rid][pid] : null;
    const f2 = x => x.toFixed(2).replace('-', '−');
    const pct = Math.round(S.allowance * 100);
    const row = (k, v, strong) => `<div class="row num"><span class="${strong ? 'b' : 'sub'}">${k}</span><span class="${strong ? 'b' : ''}">${v}</span></div>`;
    return {
      tabs: false,
      html: `<div class="nav"><button class="link" data-act="sheet-done">${ICON.back}Round ${roundOf(rid).n}</button></div>
      <div class="head"><h1 class="title">${esc(p.name)}</h1><span class="bignum">${frozen !== null ? frozen : w.playing}</span></div>
      <p class="sub">Playing handicap · ${esc(tee.name)} tees</p>
      ${sec('', `<div class="card">
        ${row('WHS index', fmtIndex(p.index))}
        ${row(`× slope ${tee.slope} ÷ 113`, f2(w.slopePart))}
        ${row(`+ rating ${tee.rating} − par ${tee.par}`, f2(w.ratingPart))}
        ${row('Course handicap', f2(w.courseHandicap), true)}
        ${row(`× ${pct}%`, f2(w.beforeRounding))}
        ${row('Playing handicap', frozen !== null ? frozen : w.playing, true)}
      </div>`)}`
    };
  }

  /* ----- Buggy Wars board ----- */
  function vMatch() {
    const rid = liveRid();
    const groups = groupsOf(rid);
    if (!groups) return { tabs: true, tab: 'match', html: `<div class="head"><h1 class="title">Buggy Wars</h1></div>${sec('', '<div class="card"><div class="row sub">Groups to be drawn</div></div>')}` };
    const comp = computeR(rid);
    const mine = myGroup(rid);
    const gid = ui.matchGroup && groups.find(g => g.id === ui.matchGroup) ? ui.matchGroup : (mine ? mine.id : groups[0].id);
    const gc = comp.groups.find(g => g.id === gid);
    const L = gc.labels;
    const canEdit = mine && mine.id === gid && S.status[rid] === 'live';
    const summary = ['front', 'back', 'overall'].map(s => `<div class="row"><span class="sub">${segName(s)}</span>${status(gc.matches[s].status)}</div>`).join('');
    let rows = '';
    gc.order.forEach((n, idx) => {
      const hr = gc.holes[n];
      const isNow = n === gc.nextHole && S.status[rid] === 'live';
      let a = '', b = '', m = '';
      if (hr.complete) {
        const [pa, pb] = hr.best;
        a = `<span class="ppts ${hr.result === 'A' ? 'a' : hr.result === 'B' ? 'lose' : ''}">${pa}</span>`;
        b = `<span class="ppts ${hr.result === 'B' ? 'b' : hr.result === 'A' ? 'lose' : ''}">${pb}</span>`;
        const lead = hr.segLead;
        m = lead === 0 ? '<span class="pill n">AS</span>' : `<span class="pill ${lead > 0 ? 'a' : 'b'}">${esc(lead > 0 ? L[0].short : L[1].short)} ${Math.abs(lead)} up</span>`;
      } else if (isNow) {
        m = '<span class="b c-g">Now</span>';
      }
      const tag = canEdit && hr.complete ? 'button' : 'div';
      const attrs = tag === 'button' ? ` data-act="edit-hole" data-n="${n}" aria-label="Change hole ${n}"` : '';
      rows += `<${tag} class="mrow${isNow ? ' now' : ''}${!hr.complete && !isNow ? ' later' : ''}"${isNow ? ' id="cur"' : ''}${attrs}><span class="b">${n}</span><span class="p">${a}</span><span class="p">${b}</span><span class="m">${m}</span></${tag}>`;
      const nextN = gc.order[idx + 1];
      if (nextN !== undefined && (nextN <= 9) !== (n <= 9)) {
        const seg = n <= 9 ? 'front' : 'back';
        rows += `<div class="row" style="background:var(--bg)"><span class="sub">${segName(seg)}</span>${status(gc.matches[seg].status)}</div>`;
      }
    });
    return {
      tabs: true, tab: 'match',
      html: `<div class="head"><h1 class="title">Buggy Wars</h1></div>
      ${groups.length > 1 ? `<div class="seg" style="margin-top:8px">${comp.groups.map(g => `<button class="${g.id === gid ? 'on' : ''}" data-act="mgroup" data-gid="${g.id}" aria-pressed="${g.id === gid}">Group ${g.n}</button>`).join('')}</div>` : ''}
      ${sec(`${pill(0)}<span class="sub" style="flex:1">${esc(L[0].long)}</span>`, '', true)}
      <div class="sec-label" style="margin-top:-4px">${pill(1)}<span class="sub" style="flex:1">${esc(L[1].long)}</span></div>
      <div class="card">${summary}</div>
      ${sec('', `<div class="card"><div class="mrow cols"><span class="cap">Hole</span><span class="p">${pill(0)}</span><span class="p">${pill(1)}</span><span></span></div>${rows}</div>`, true)}`
    };
  }

  /* ----- Leaderboard ----- */
  function statusPill(rid, comp) {
    const st = S.status[rid];
    if (st === 'final') return '<span class="pill g">Final</span>';
    if (st === 'live') {
      const thru = comp ? Math.min(...comp.groups.map(g => g.holesDone)) : 0;
      return `<span class="pill w">Thru ${thru}</span>`;
    }
    return '<span class="pill n">Not started</span>';
  }

  function vBoard() {
    const sel = ui.board || liveRid();
    const segBtns = CFG.rounds.map(r => `<button class="${sel === r.id ? 'on' : ''}" data-act="board" data-id="${r.id}" aria-pressed="${sel === r.id}">Round ${r.n}</button>`).join('')
      + `<button class="${sel === 'trip' ? 'on' : ''}" data-act="board" data-id="trip" aria-pressed="${sel === 'trip'}">Trip</button>`;
    let html = `<div class="head"><h1 class="title">Leaderboard</h1></div><div class="seg" style="margin-top:8px">${segBtns}</div>`;
    const orgLink = '<div style="text-align:center;margin-top:16px"><button class="link" data-act="org">Organiser</button></div>';
    if (sel === 'trip') return { tabs: true, tab: 'board', html: html + tripTable() + orgLink };
    const r = roundOf(sel);
    const st = S.status[sel];
    const groups = groupsOf(sel);
    if (!groups) return { tabs: true, tab: 'board', html: html + sec('', '<div class="card"><div class="row sub">Groups to be drawn</div></div>', true) + orgLink };
    if (st === 'upcoming') {
      html += sec(`<span class="sub">${esc(r.dateLabel)}</span>${statusPill(sel, null)}`, `<div class="card">${groups.map(g => `<div class="grow"><span class="b num">${esc(g.teeTime)}</span><span class="teams">${g.teams.map((t, i) => `<span>${dot(i)}${esc(t.map(nameOf).join(' & '))}</span>`).join('')}</span><span></span></div>`).join('')}</div>`, true);
      return { tabs: true, tab: 'board', html: html + orgLink };
    }
    const comp = computeR(sel);
    html += sec(`<span class="sub">Stableford points</span>${statusPill(sel, comp)}`, `<div class="card">${comp.leaderboard.map(row => `<div class="lrow"><span class="sub">${row.posLabel}</span><span class="${row.id === S.me ? 'b' : ''}">${esc(row.name)}</span><span class="b r">${row.total}</span></div>`).join('')}</div>`, true);
    const final = st === 'final';
    const lowCount = comp.pairs.filter(p => p.lowest).length;
    html += sec('<span class="sub">First round of drinks</span>', `<div class="card">${comp.pairs.map(p => {
      const tag = p.lowest ? `<span class="pill w">${lowCount > 1 ? 'Level' : final ? 'Buying' : 'Buying so far'}</span>` : '';
      return `<div class="row"><span>${esc(p.label)}</span><span class="right">${tag}<span class="b num">${p.total}</span></span></div>`;
    }).join('')}</div>`);
    const contests = r.contests || [];
    if (contests.length) {
      html += sec('<span class="sub">Contests</span>', `<div class="card">${contests.map(c => {
        const win = (S.winners[sel] || {})[c.hole];
        const lead = claimLeader(sel, c.hole, null);
        const right = win ? `<span class="b">${esc(nameOf(win))}</span>` : lead ? `<span class="right"><span class="pill n">To confirm</span>${esc(nameOf(lead.pid))}</span>` : '<span class="sub">–</span>';
        return `<div class="row"><span>${CONTEST[c.type]} <span class="sub">${c.hole}</span></span>${right}</div>`;
      }).join('')}</div>`);
    }
    html += `<button class="btn quiet" data-act="results" data-id="${sel}">Share results</button>`;
    return { tabs: true, tab: 'board', html: html + orgLink };
  }

  function tripTable() {
    const res = CFG.rounds.map(r => (groupsOf(r.id) && S.status[r.id] !== 'upcoming' ? computeR(r.id) : null));
    const rows = E.tripStandings(res, S.players);
    const allFinal = CFG.rounds.every(r => S.status[r.id] === 'final');
    return sec(`<span class="sub">All three rounds count</span>${allFinal ? '<span class="pill g">Final</span>' : '<span class="pill w">In progress</span>'}`,
      `<div class="card"><div class="lrow trip" style="min-height:36px"><span></span><span></span>${CFG.rounds.map(r => `<span class="cap r">R${r.n}</span>`).join('')}<span class="cap r">Total</span></div>
      ${rows.map(row => `<div class="lrow trip"><span class="sub">${row.posLabel}</span><span class="${row.id === S.me ? 'b' : ''}">${esc(row.name)}</span>${row.per.map(v => `<span class="r sub">${v === null ? '–' : v}</span>`).join('')}<span class="r b">${row.total}</span></div>`).join('')}</div>`, true);
  }

  /* ----- Results card ----- */
  function vResults() {
    const rid = ui.resultsRid || liveRid();
    const r = roundOf(rid);
    const comp = computeR(rid);
    const st = S.status[rid];
    const lb = comp.leaderboard;
    const top = lb[0];
    const leaders = lb.filter(x => x.total === top.total);
    const minThru = Math.min(...comp.groups.map(g => g.holesDone));
    const names = leaders.map(x => x.name).join(' and ');
    const headline = st === 'final'
      ? (leaders.length > 1 ? `${names} tie on ${top.total}` : `${top.name} wins with ${top.total}`)
      : (leaders.length > 1 ? `${names} lead on ${top.total}` : `${top.name} leads on ${top.total}`);
    const money = {};
    comp.groups.forEach(gc => ['front', 'back', 'overall'].forEach(s => {
      const w = gc.matches[s].winner;
      if (w) { const k = gc.labels[w === 'A' ? 0 : 1].long; money[k] = (money[k] || 0) + 5; }
    }));
    const moneyRows = Object.keys(money).sort((a, b) => money[b] - money[a])
      .map(k => `<div class="ln"><span>${esc(k)}</span><span class="b">€${money[k]}</span></div>`).join('') || '<div class="ln sub">No matches decided yet</div>';
    const lows = comp.pairs.filter(p => p.lowest);
    const contests = (r.contests || []).map(c => {
      const win = (S.winners[rid] || {})[c.hole];
      const lead = claimLeader(rid, c.hole, null);
      const who = win ? esc(nameOf(win)) : lead ? `${esc(nameOf(lead.pid))} <span class="sub">to confirm</span>` : '–';
      return `<div class="ln"><span class="sub">${CONTEST[c.type]} ${c.hole}</span><span>${who}</span></div>`;
    }).join('');
    const card = `<div class="rcard" id="rcard">
      <div class="top"><div class="cap">${esc(CFG.course.name)} · Round ${r.n} · ${st === 'final' ? 'Final' : `Thru ${minThru}`}</div><div class="title">${esc(headline)}</div></div>
      <div class="blk">${lb.filter(x => x.pos <= 5).map(x => `<div class="ln"><span><span class="sub" style="display:inline-block;width:32px">${x.posLabel}</span>${esc(x.name)}</span><span class="b">${x.total}</span></div>`).join('')}</div>
      <div class="blk"><div class="cap">Buggy Wars</div>${moneyRows}</div>
      <div class="blk drinks"><div class="cap">First round${st === 'final' ? '' : ' so far'}</div><div class="ln"><span class="b">${esc(lows.map(p => p.label).join(' and '))}</span><span>${lows[0].total}</span></div></div>
      ${contests ? `<div class="blk">${contests}</div>` : ''}
      <div class="blk cap">Demo scores</div>
    </div>`;
    return {
      tabs: false,
      html: `<div class="nav"><button class="link" data-act="results-done">${ICON.back}Leaderboard</button></div>
      <div style="margin-top:8px">${card}</div>
      ${downloads ? '<button class="btn" data-act="save-card">Save image</button>' : ''}`
    };
  }

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  async function saveCard() {
    try {
      if (!window.html2canvas) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      const canvas = await window.html2canvas(document.getElementById('rcard'), { scale: 3, backgroundColor: '#F2F2F7' });
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      await downloads.save({ filename: `round-${roundOf(ui.resultsRid || liveRid()).n}-results.png`, data: blob });
    } catch (e) {
      if (e && e.code === 'declined') return;
      toast('The image could not be saved. Take a screenshot instead.');
    }
  }

  /* ================= ORGANISER ================= */

  const ORG = {};
  const orgNav = (back, label) => `<div class="nav">${back
    ? `<button class="link" data-act="org-go" data-v="${back}">${ICON.back}${esc(label)}</button>`
    : `<span class="sub" style="display:inline-flex;align-items:center;gap:4px">${sized(ICON.lock, 16)} Organiser</span><button class="link" data-act="org-exit">Done</button>`}</div>`;

  ORG.lock = () => ({
    tabs: false,
    html: `<div class="nav"><button class="link" data-act="org-exit">${ICON.back}Back</button></div>
      <div class="head"><h1 class="title">Organiser</h1></div>
      <form data-form="pin" autocomplete="off" class="sec near">
        <input id="pin" class="field" type="password" inputmode="numeric" maxlength="8" placeholder="PIN" aria-label="Organiser PIN">
        ${ui.pinError ? '<p class="err">That PIN did not match.</p>' : ''}
        <button class="btn" type="submit">Unlock</button>
      </form>
      <p class="cap" style="margin-top:16px;text-align:center">Test PIN: 1234</p>`
  });

  function finaliseBlockers(rid) {
    const comp = computeR(rid);
    const open = comp.groups.filter(g => !g.complete).length;
    const toConfirm = (roundOf(rid).contests || []).filter(c => ((S.claims[rid] || {})[c.hole] || []).length && !(S.winners[rid] || {})[c.hole]).length;
    const reasons = [];
    if (open) reasons.push(`${plural(open, 'card')} open`);
    if (toConfirm) reasons.push(`${plural(toConfirm, 'contest')} to confirm`);
    return reasons;
  }

  ORG.home = () => {
    const rid = ui.orgRid || (ui.orgRid = liveRid());
    const r = roundOf(rid);
    const st = S.status[rid];
    const groups = groupsOf(rid);
    const stPill = { live: '<span class="pill w">In progress</span>', final: '<span class="pill g">Final</span>', upcoming: '<span class="pill n">Not started</span>' }[st];
    let html = `${orgNav()}<div class="seg" style="margin-top:8px">${CFG.rounds.map(x => `<button class="${x.id === rid ? 'on' : ''}" data-act="org-round" data-id="${x.id}">Round ${x.n}</button>`).join('')}</div>`;
    if (groups) {
      const comp = computeR(rid);
      html += sec(`<span class="sub">Groups</span>${stPill}`, `<div class="card">${comp.groups.map(gc => {
        const sub = (S.submitted[rid] || {})[gc.id];
        const prog = gc.complete ? (sub ? 'Submitted' : 'Finished') : gc.holesDone ? `Thru ${gc.holesDone}` : 'Not started';
        return `<button class="row" data-act="org-group" data-gid="${gc.id}"><span>Group ${gc.n}</span><span class="right sub"><span class="bar"><i style="width:${Math.round(gc.holesDone / 18 * 100)}%"></i></span>${prog}${chev}</span></button>`;
      }).join('')}</div>`, true);
      const contests = r.contests || [];
      if (contests.length) {
        html += sec('<span class="sub">Contests</span>', `<div class="card">${contests.map(c => {
          const claims = (S.claims[rid] || {})[c.hole] || [];
          const win = (S.winners[rid] || {})[c.hole];
          const right = win ? `<span class="b">${esc(nameOf(win))}</span>` : claims.length ? '<span class="pill w">Confirm</span>' : '<span class="sub">–</span>';
          return `<button class="row" data-act="org-contest" data-n="${c.hole}"><span>${CONTEST[c.type]} <span class="sub">${c.hole}</span></span><span class="right">${right}${chev}</span></button>`;
        }).join('')}</div>`);
      }
    } else {
      html += sec(`<span class="sub">Groups</span>${stPill}`, `<div class="card"><button class="row" data-act="org-go" data-v="groups"><span>Make the draw</span>${chev}</button></div>`, true);
    }
    const item = (v, icon, color, label) => `<button class="row" data-act="org-go" data-v="${v}"><span style="display:flex;align-items:center;gap:12px"><span class="ic" style="background:${color}">${icon}</span>${label}</span>${chev}</button>`;
    html += sec('<span class="sub">Manage</span>', `<div class="card">
      ${item('players', ICON.users, '#0A60C9', 'Players and handicaps')}
      ${item('groups', ICON.buggy, '#C62828', 'Groups and buggies')}
      ${item('course', ICON.course, '#1E7A3D', 'Course')}
      ${item('log', ICON.history, '#8E8E93', 'Change log')}
      ${item('export', ICON.download, '#8E8E93', 'Export')}
    </div>`);
    if (st === 'live') {
      const reasons = finaliseBlockers(rid);
      html += reasons.length
        ? `<button class="btn quiet" data-act="finalise">Finalise round ${r.n}<small style="color:var(--sub)">${esc(reasons.join(' · '))}</small></button>`
        : `<button class="btn" data-act="finalise">Finalise round ${r.n}</button>`;
    } else if (st === 'final') {
      html += `<button class="btn quiet" data-act="reopen">Reopen round ${r.n}</button>`;
    } else {
      const prev = CFG.rounds.find(x => x.n === r.n - 1);
      const otherLive = CFG.rounds.find(x => S.status[x.id] === 'live');
      const reason = !groups ? 'Make the draw first' : otherLive ? `Finalise round ${roundOf(otherLive.id).n} first` : prev && S.status[prev.id] !== 'final' ? `Finalise round ${prev.n} first` : '';
      html += `<button class="btn ${reason ? 'quiet' : ''}" data-act="start-round">Start round ${r.n}${reason ? `<small style="color:var(--sub)">${esc(reason)}</small>` : ''}</button>`;
    }
    html += sec('<span class="sub">Test tools</span>', `<div class="card">
      <button class="row" data-act="demo-fill"><span>Finish other groups with demo scores</span>${chev}</button>
      <button class="row" data-act="reset"><span class="c-b">${ui.confirmReset ? 'Tap again to erase all changes' : 'Reset test data'}</span></button>
    </div>`);
    return { tabs: false, html };
  };

  ORG.group = () => {
    const rid = ui.orgRid;
    const comp = computeR(rid);
    const gc = comp.groups.find(g => g.id === ui.orgGroup);
    const pids = gc.teams.flat();
    const head = `<div class="orow"><span class="cap">Hole</span>${pids.map((pid, i) => `<span class="cap b ${i < 2 ? 'c-a' : 'c-b'}">${esc(nameOf(pid))}</span>`).join('')}</div>`;
    const rows = gc.order.map(n => {
      const cells = pids.map(pid => {
        const hp = comp.players[pid].holes[n];
        return `<span>${hp.gross === null ? '<span class="sub">–</span>' : `${hp.gross === 'P' ? '–' : hp.gross}<sup>${hp.points}</sup>`}</span>`;
      }).join('');
      return `<button class="orow" data-act="org-hole" data-n="${n}" aria-label="Correct hole ${n}"><span class="b">${n}</span>${cells}</button>`;
    }).join('');
    return {
      tabs: false,
      html: `${orgNav('home', 'Organiser')}<div class="head"><h1 class="title">Group ${gc.n}</h1></div>
      <p class="sub">${esc(gc.labels[0].long)} v ${esc(gc.labels[1].long)}</p>
      ${sec('<span class="sub">Card check</span>', `<div class="card">${['front', 'back'].map(sg => {
        const c = checkOf(rid, gc.id, sg);
        const st = !c ? 'Not checked' : c.resolved ? `Checked${c.changes ? ` · ${plural(c.changes, 'change')}` : ''}` : c.status === 'reading' ? 'Reading' : 'Open';
        return `<${c ? 'button' : 'div'} class="row"${c ? ` data-act="photo-full" data-rid="${rid}" data-gid="${gc.id}" data-seg="${sg}"` : ''}><span>${segName(sg)}</span><span class="right ${c && c.resolved ? 'c-g' : 'sub'}">${st}${c ? chev : ''}</span></${c ? 'button' : 'div'}>`;
      }).join('')}</div>`, true)}
      ${sec('', `<div class="card">${head}${rows}</div>`, true)}`
    };
  };

  ORG.correct = () => vEntry();

  ORG.contest = () => {
    const rid = ui.orgRid;
    const n = ui.orgHole;
    const c = contestOn(rid, n);
    const claims = ((S.claims[rid] || {})[n] || []).slice().reverse();
    const win = (S.winners[rid] || {})[n];
    const fmtT = iso => { try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
    return {
      tabs: false,
      html: `${orgNav('home', 'Organiser')}<div class="head"><h1 class="title">${CONTEST[c.type]} · ${n}</h1></div>
      <p class="sub">Latest claim first</p>
      ${sec('', `<div class="card">${claims.length ? claims.map(cl => `<div class="row"><span>${esc(nameOf(cl.pid))} <span class="sub">· group ${groupNo(rid, cl.gid)} · ${fmtT(cl.at)}</span></span>
        ${win === cl.pid ? `<button class="link" data-act="org-unwin" data-n="${n}">Winner ${sized(ICON.check, 18)}</button>` : `<button class="link" data-act="org-win" data-n="${n}" data-pid="${cl.pid}">Confirm</button>`}</div>`).join('') : '<div class="row sub">No claims yet</div>'}</div>`, true)}`
    };
  };

  ORG.players = () => {
    const rid = ui.orgRid;
    const tee = teeOf(rid);
    const list = S.players.slice().sort((a, b) => a.name.localeCompare(b.name));
    return {
      tabs: false,
      html: `${orgNav('home', 'Organiser')}<div class="head"><h1 class="title">Handicaps</h1></div>
      <p class="sub">Round ${roundOf(rid).n} · ${esc(tee.name)} tees · ${Math.round(S.allowance * 100)}%</p>
      ${sec('', `<div class="card"><div class="hrow cols"><span></span><span class="r cap">Index</span><span class="r cap">Playing</span><span></span></div>
      ${list.map(p => {
        const frozen = S.ph[rid] && S.ph[rid][p.id] !== undefined ? S.ph[rid][p.id] : null;
        const ph = frozen !== null ? frozen : E.playingHandicap(p.index, tee, S.allowance);
        return `<button class="hrow" data-act="org-player" data-pid="${p.id}"><span class="nm">${esc(p.name)}</span><span class="r sub">${fmtIndex(p.index)}</span><span class="r b">${ph}</span>${chev}</button>`;
      }).join('')}</div>`, true)}`
    };
  };

  ORG.player = () => {
    const p = player(ui.orgPid);
    const rid = ui.orgRid;
    return {
      tabs: false,
      html: `${orgNav('players', 'Handicaps')}<div class="head"><h1 class="title">${esc(p.name)}</h1></div>
      <form data-form="index" autocomplete="off" class="sec near">
        <div class="sec-label"><label class="sub" for="idx">WHS index</label></div>
        <input id="idx" class="field" inputmode="decimal" value="${fmtIndex(p.index)}">
        ${ui.indexError ? `<p class="err">${esc(ui.indexError)}</p>` : ''}
        <button class="btn" type="submit">Save</button>
      </form>
      <p class="cap" style="margin-top:16px">Plays off ${E.playingHandicap(p.index, teeOf(rid), S.allowance)} at ${esc(CFG.course.name)}. Finalised rounds keep the handicap they were played off.</p>`
    };
  };

  ORG.groups = () => {
    const published = CFG.rounds.filter(r => groupsOf(r.id)).map(r => ({ rid: r.id, groups: groupsOf(r.id) }));
    const repeats = E.repeatedPartners(published);
    const listRows = gs => gs.map(g => `<div class="grow"><span class="b num">${esc(g.teeTime)}</span><span class="teams">${g.teams.map((t, i) => `<span>${dot(i)}${esc(t.map(nameOf).join(' & '))}</span>`).join('')}</span><span></span></div>`).join('');
    let html = `${orgNav('home', 'Organiser')}<div class="head"><h1 class="title">Groups and buggies</h1></div>`;
    if (repeats.length) html += `<div class="banner" style="margin-top:16px">${repeats.map(x => `${esc(x.pair.map(nameOf).join(' & '))} share a buggy in rounds ${x.rounds.map(id => roundOf(id).n).join(' and ')}`).join('<br>')}</div>`;
    CFG.rounds.forEach(r => {
      const gs = groupsOf(r.id);
      const drafting = !gs && ui.draw && ui.draw.rid === r.id;
      let body;
      if (gs) body = `<div class="card">${listRows(gs)}</div>`;
      else if (drafting) {
        body = `<div class="card">${listRows(ui.draw.groups)}</div><p class="cap note">Lowest totals off first, leaders last. 1st and 4th v 2nd and 3rd.</p>`;
        if (ui.draw.repeats.length) body += `<div class="banner note">${ui.draw.repeats.map(x => `${esc(x.pair.map(nameOf).join(' & '))} shared a buggy in round ${x.rounds.map(id => roundOf(id).n).join(' and ')}`).join('<br>')}</div>`;
        body += `<button class="btn" data-act="draw-approve">Publish draw</button><div style="text-align:center"><button class="link" data-act="draw-discard">Discard</button></div>`;
      } else body = `<div class="card"><button class="row" data-act="draw-preview" data-id="${r.id}"><span>Preview the draw</span>${chev}</button></div>`;
      html += sec(`<span class="sub">Round ${r.n} · ${esc(r.dateLabel)}</span>${drafting ? '<span class="pill w">Preview</span>' : ''}`, body);
    });
    return { tabs: false, html };
  };

  ORG.course = () => {
    const c = CFG.course;
    const t = Object.values(c.tees)[0];
    return {
      tabs: false,
      html: `${orgNav('home', 'Organiser')}<div class="head"><h1 class="title">${esc(c.name)}</h1></div>
      <p class="sub">${esc(t.name)} tees · Slope ${t.slope} · Rating ${t.rating} · Par ${t.par}</p>
      ${t.verified ? '' : '<div class="banner note">Slope and rating not yet checked with the club</div>'}
      ${sec('', `<div class="card"><div class="lrow" style="grid-template-columns:40px 1fr 1fr 1fr;min-height:36px"><span class="cap">Hole</span><span class="cap r">Par</span><span class="cap r">Index</span><span class="cap r">Yards</span></div>
        ${c.holes.map(h => `<div class="lrow" style="grid-template-columns:40px 1fr 1fr 1fr;min-height:40px"><span class="b">${h.n}</span><span class="r">${h.par}</span><span class="r">${h.si}</span><span class="r">${h.yards}</span></div>`).join('')}</div>`, true)}
      <p class="cap note">${esc(CFG.notes.course)}</p>`
    };
  };

  ORG.log = () => ({
    tabs: false,
    html: `${orgNav('home', 'Organiser')}<div class="head"><h1 class="title">Change log</h1></div>
      ${sec('', `<div class="card">${S.log.slice().reverse().map(e => `<div class="logrow"><div class="b">${esc(e.action)}</div><div class="sub">${esc(e.detail)}</div>
        <div class="cap" style="margin-top:4px">${esc(e.by)} · ${new Date(e.at).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</div></div>`).join('')}</div>`, true)}`
  });

  function exportData() {
    const rounds = CFG.rounds.map(r => {
      const comp = groupsOf(r.id) ? computeR(r.id) : null;
      return {
        id: r.id, number: r.n, date: r.date, tee: r.tee, status: S.status[r.id], contests: r.contests,
        groups: groupsOf(r.id),
        playingHandicaps: comp ? Object.fromEntries(Object.values(comp.players).map(p => [p.id, p.ph])) : null,
        scores: S.scores[r.id] || {},
        contestClaims: S.claims[r.id] || {}, contestWinners: S.winners[r.id] || {}
      };
    });
    return {
      exportedAt: new Date().toISOString(), trip: CFG.tripName, dataNote: 'Test version: demo players and scores.',
      handicapRule: { allowance: S.allowance, method: 'WHS: index × slope ÷ 113 + (rating − par), × allowance, rounded once' },
      course: CFG.course, players: S.players, rounds, changeLog: S.log
    };
  }
  function exportCsv() {
    const lines = ['round,group,hole,par,stroke_index,player,playing_handicap,shots,strokes,points'];
    CFG.rounds.forEach(r => {
      const comp = groupsOf(r.id) ? computeR(r.id) : null;
      if (!comp) return;
      comp.groups.forEach(gc => gc.order.forEach(n => gc.teams.flat().forEach(pid => {
        const p = comp.players[pid];
        const hp = p.holes[n];
        if (hp.gross === null) return;
        lines.push([r.n, gc.n, n, holeOf(n).par, holeOf(n).si, `"${p.name}"`, p.ph, hp.shots, hp.gross === 'P' ? 'picked up' : hp.gross, hp.points].join(','));
      })));
    });
    return lines.join('\n');
  }
  ORG.export = () => ({
    tabs: false,
    html: `${orgNav('home', 'Organiser')}<div class="head"><h1 class="title">Export</h1></div>
      ${sec('<span class="sub">Everything (JSON)</span>', `<textarea class="export" id="exjson" readonly aria-label="All data as JSON">${esc(JSON.stringify(exportData(), null, 1))}</textarea>
        <button class="btn quiet" data-act="${downloads ? 'save-file' : 'copy'}" data-kind="json" data-target="exjson">${downloads ? 'Save file' : 'Copy'}</button>`, true)}
      ${sec('<span class="sub">Scores for Excel (CSV)</span>', `<textarea class="export" id="excsv" readonly aria-label="Scores as CSV">${esc(exportCsv())}</textarea>
        <button class="btn quiet" data-act="${downloads ? 'save-file' : 'copy'}" data-kind="csv" data-target="excsv">${downloads ? 'Save file' : 'Copy'}</button>`)}`
  });

  function demoFill() {
    const rid = ui.orgRid;
    if (S.status[rid] !== 'live') { toast('Start the round first'); return; }
    const comp = computeR(rid);
    const mine = myGroup(rid);
    let seed = 7 + S.log.length;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const filled = [];
    comp.groups.forEach(gc => {
      if (mine && gc.id === mine.id) return;
      let any = false;
      gc.order.forEach(n => gc.teams.flat().forEach(pid => {
        const card = (S.scores[rid] || (S.scores[rid] = {}))[pid] || (S.scores[rid][pid] = {});
        if (E.isEntered(card[n])) return;
        const h = holeOf(n);
        const r = rnd();
        const dlt = r < 0.18 ? -1 : r < 0.62 ? 0 : r < 0.9 ? 1 : 2;
        card[n] = Math.max(1, h.par + comp.players[pid].holes[n].shots + dlt);
        any = true;
      }));
      if (any) filled.push(gc.n);
    });
    if (!filled.length) { toast('Other groups are already finished'); return; }
    logIt('Test: demo scores added', `Round ${roundOf(rid).n} · group${filled.length > 1 ? 's' : ''} ${filled.join(' and ')}`);
    persist();
    toast(`Group${filled.length > 1 ? 's' : ''} ${filled.join(' and ')} finished`);
    render();
  }

  /* ================= Actions ================= */

  function go(view) { ui.view = view; ui.scrollTop = true; render(); }
  function orgGo(v) { ui.orgView = v; ui.scrollTop = true; render(); }

  const ACT = {
    pick: el => { S.me = el.dataset.id; persist(); ui.view = homeView(); ui.scrollTop = true; render(); },
    who: () => go('who'),
    go: el => go(el.dataset.view),
    tab: el => {
      ui.org = false;
      ui.contestSheet = false;
      const t = el.dataset.tab;
      if (t === 'hole') { ui.edit = false; go(homeView()); }
      else if (t === 'match') { ui.view = 'match'; ui.scrollCur = true; render(); }
      else go('board');
    },
    toggle: el => { ui.open[el.dataset.key] = !ui.open[el.dataset.key]; render(); },
    hcp: el => { ui.sheet = { pid: el.dataset.pid, rid: el.dataset.rid }; ui.sheetBack = ui.view; go('hcp'); },
    'sheet-done': () => go(ui.sheetBack || 'today'),
    enter: () => { ui.edit = false; go('entry'); },
    set: el => setScore(el.dataset.pid, el.dataset.v),
    'contest-open': () => { ui.contestSheet = true; render(); },
    'contest-close': () => { ui.contestSheet = false; render(); },
    'contest-scrim': (el, e) => { if (e.target !== el) return; ui.contestSheet = false; render(); },
    claim: el => {
      const ctx = entryCtx();
      const d = ensureDraft(ctx);
      d._claim = el.dataset.pid || null;
      ui.contestSheet = false;
      persist();
      render();
    },
    save: () => saveHole(),
    'entry-back': () => {
      ui.contestSheet = false;
      if (ui.org) { orgGo('group'); return; }
      if (ui.edit) { ui.edit = false; ui.view = 'match'; ui.scrollCur = true; render(); return; }
      go('tee');
    },
    undo: () => undoSave(),
    next: () => { ui.after = null; go('tee'); },
    submit: () => {
      const rid = liveRid();
      const g = myGroup(rid);
      (S.submitted[rid] || (S.submitted[rid] = {}))[g.id] = true;
      const unchecked = ['front', 'back'].filter(sg => { const c = checkOf(rid, g.id, sg); return !c || !c.resolved; });
      logIt('Card submitted', `Round ${roundOf(rid).n} · group ${g.n}${unchecked.length ? ` · not checked against the card: ${unchecked.map(nineName).join(' and ')}` : ' · checked against the card'}`);
      persist();
      tick();
      render();
    },
    mgroup: el => { ui.matchGroup = el.dataset.gid; ui.scrollCur = true; render(); },
    'edit-hole': el => { ui.hole = Number(el.dataset.n); ui.edit = true; go('entry'); },
    board: el => { ui.board = el.dataset.id; render(); },
    results: el => { ui.resultsRid = el.dataset.id; go('results'); },
    'results-done': () => go('board'),
    'save-card': () => saveCard(),
    'open-check': el => { ui.checkSeg = el.dataset.seg; go('check'); },
    decide: el => {
      const rid = liveRid();
      const chk = checkOf(rid, myGroup(rid).id, ui.checkSeg);
      if (!chk || chk.resolved) return;
      chk.decisions[el.dataset.k] = el.dataset.v;
      persist();
      render();
    },
    'check-done': el => applyCheck(el.dataset.seg),
    'manual-check': el => {
      const rid = liveRid();
      const chk = checkOf(rid, myGroup(rid).id, el.dataset.seg);
      if (chk) { chk.status = 'manual'; persist(); render(); }
    },
    'manual-ok': el => {
      const rid = liveRid();
      const g = myGroup(rid);
      const chk = checkOf(rid, g.id, el.dataset.seg);
      if (!chk) return;
      chk.resolved = true;
      chk.changes = 0;
      logIt('Card check', `Round ${roundOf(rid).n} · group ${g.n} · ${nineName(el.dataset.seg)}: checked by eye`);
      persist(); tick(); render();
    },
    'retry-check': el => {
      const rid = liveRid();
      const g = myGroup(rid);
      const chk = checkOf(rid, g.id, el.dataset.seg);
      if (!chk) return;
      chk.status = 'reading';
      persist(); render();
      runReader(rid, g.id, el.dataset.seg, dataUrlToBlob(chk.photo), chk.fixture);
    },
    'photo-full': el => {
      let c;
      if (el.dataset.gid) c = checkOf(el.dataset.rid, el.dataset.gid, el.dataset.seg);
      else { const rid = liveRid(); c = checkOf(rid, myGroup(rid).id, ui.checkSeg); }
      if (c && c.photo) { ui.photoFull = c.photo; render(); }
    },
    'photo-close': () => { ui.photoFull = null; render(); },
    'test-card': el => { ui.testSheet = el.dataset.seg; render(); },
    'test-card-pick': el => startCheck(el.dataset.seg, { fixture: el.dataset.key }),
    'sheet-close': (el, e) => { if (e && e.target !== el && !el.classList.contains('link')) return; ui.testSheet = null; render(); },

    org: () => { ui.org = true; ui.orgView = ui.orgUnlocked ? 'home' : 'lock'; ui.orgRid = liveRid(); ui.pinError = false; ui.scrollTop = true; render(); },
    'org-exit': () => { ui.org = false; ui.confirmReset = false; go(S.me ? homeView() : 'who'); },
    'org-go': el => { ui.confirmReset = false; ui.contestSheet = false; orgGo(el.dataset.v); },
    'org-round': el => { ui.orgRid = el.dataset.id; ui.confirmReset = false; render(); },
    'org-group': el => { ui.orgGroup = el.dataset.gid; orgGo('group'); },
    'org-hole': el => { ui.orgHole = Number(el.dataset.n); orgGo('correct'); },
    'org-contest': el => { ui.orgHole = Number(el.dataset.n); orgGo('contest'); },
    'org-win': el => {
      const n = Number(el.dataset.n);
      (S.winners[ui.orgRid] || (S.winners[ui.orgRid] = {}))[n] = el.dataset.pid;
      const c = contestOn(ui.orgRid, n);
      logIt('Contest winner confirmed', `Round ${roundOf(ui.orgRid).n} · ${CONTEST[c.type]} on ${n}: ${nameOf(el.dataset.pid)}`);
      persist(); tick(); render();
    },
    'org-unwin': el => {
      const n = Number(el.dataset.n);
      delete (S.winners[ui.orgRid] || {})[n];
      logIt('Contest winner cleared', `Round ${roundOf(ui.orgRid).n} · hole ${n}`);
      persist(); render();
    },
    'org-player': el => { ui.orgPid = el.dataset.pid; ui.indexError = null; orgGo('player'); },
    finalise: () => {
      const rid = ui.orgRid;
      const reasons = finaliseBlockers(rid);
      if (reasons.length) { toast(`Not yet: ${reasons.join(', ')}`); return; }
      const comp = computeR(rid);
      S.ph[rid] = Object.fromEntries(Object.values(comp.players).map(p => [p.id, p.ph]));
      S.status[rid] = 'final';
      logIt('Round finalised', `Round ${roundOf(rid).n} results and handicaps fixed`);
      persist(); tick(); render();
      toast(`Round ${roundOf(rid).n} is final`);
    },
    reopen: () => {
      const rid = ui.org ? ui.orgRid : entryCtx().rid;
      S.status[rid] = 'live';
      logIt('Round reopened', `Round ${roundOf(rid).n} reopened for corrections`);
      persist(); render();
      toast(`Round ${roundOf(rid).n} reopened`);
    },
    'start-round': () => {
      const rid = ui.orgRid;
      const r = roundOf(rid);
      const prev = CFG.rounds.find(x => x.n === r.n - 1);
      const otherLive = CFG.rounds.find(x => S.status[x.id] === 'live');
      if (!groupsOf(rid)) { toast('Make the draw first'); return; }
      if (otherLive) { toast(`Finalise round ${roundOf(otherLive.id).n} first`); return; }
      if (prev && S.status[prev.id] !== 'final') { toast(`Finalise round ${prev.n} first`); return; }
      S.status[rid] = 'live';
      logIt('Round started', `Round ${r.n} is live`);
      persist(); render();
      toast(`Round ${r.n} is live`);
    },
    'draw-preview': el => {
      const rid = el.dataset.id;
      const r = roundOf(rid);
      const prior = CFG.rounds.filter(x => x.n < r.n);
      const res = prior.map(x => (groupsOf(x.id) && S.status[x.id] !== 'upcoming' ? computeR(x.id) : null));
      const standings = E.tripStandings(res, S.players);
      const d = E.proposeDraw(standings, prior.filter(x => groupsOf(x.id)).map(x => ({ rid: x.id, groups: groupsOf(x.id) })), r.teeTimes || []);
      ui.draw = { rid, groups: d.groups, repeats: d.repeats };
      render();
    },
    'draw-approve': () => {
      const d = ui.draw;
      S.groups[d.rid] = d.groups;
      logIt('Draw published', `Round ${roundOf(d.rid).n}: ${d.groups.map(g => `${g.teeTime} ${g.teams.map(t => t.map(nameOf).join(' & ')).join(' v ')}`).join('; ')}`);
      ui.draw = null;
      persist(); render();
      toast(`Round ${roundOf(d.rid).n} draw published`);
    },
    'draw-discard': () => { ui.draw = null; render(); },
    'demo-fill': () => demoFill(),
    reset: () => {
      if (!ui.confirmReset) { ui.confirmReset = true; render(); return; }
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
      S = freshState();
      Object.assign(ui, { view: 'who', org: false, orgUnlocked: false, confirmReset: false, after: null, draw: null, board: null, matchGroup: null });
      persist(); render();
      toast('Test data reset');
    },
    copy: el => {
      const ta = document.getElementById(el.dataset.target);
      try {
        navigator.clipboard.writeText(ta.value).then(() => toast('Copied'), () => { ta.select(); toast('Selected. Use Copy from the menu.'); });
      } catch (e) { ta.select(); toast('Selected. Use Copy from the menu.'); }
    },
    'save-file': async el => {
      const json = el.dataset.kind === 'json';
      try {
        await downloads.save({ filename: json ? 'golf-trip-data.json' : 'golf-trip-scores.csv', data: json ? JSON.stringify(exportData(), null, 1) : exportCsv() });
      } catch (e) { if (!e || e.code !== 'declined') toast('The file could not be saved.'); }
    }
  };

  const FORMS = {
    pin: () => {
      const v = document.getElementById('pin').value.trim();
      if (v === PIN) { ui.orgUnlocked = true; ui.pinError = false; orgGo('home'); }
      else { ui.pinError = true; render(); const el = document.getElementById('pin'); if (el) el.focus(); }
    },
    index: () => {
      const raw = document.getElementById('idx').value.trim().replace(',', '.');
      const plus = raw.startsWith('+');
      const num = Number(raw.replace('+', ''));
      if (raw === '' || !isFinite(num)) { ui.indexError = 'Enter a number, like 12.4 or +1.2.'; render(); return; }
      const val = Math.round((plus ? -num : num) * 10) / 10;
      if (val < -10 || val > 54) { ui.indexError = 'WHS indexes run from +10.0 to 54.0.'; render(); return; }
      const p = player(ui.orgPid);
      if (val !== p.index) {
        logIt('Handicap index changed', `${p.name}: ${fmtIndex(p.index)} → ${fmtIndex(val)}`);
        p.index = val;
        persist();
        toast(`${p.name} now ${fmtIndex(val)}`);
      }
      ui.indexError = null;
      orgGo('players');
    }
  };

  /* ================= Render ================= */

  const VIEWS = { who: vWho, today: vToday, hcp: vHcp, tee: vTee, entry: vEntry, after: vAfter, card: vCard, match: vMatch, board: vBoard, results: vResults, check: vCheck };
  const app = document.getElementById('app');
  const tabs = document.getElementById('tabs');

  function render() {
    cache = {};
    let out;
    if (ui.org) {
      if (!ui.orgUnlocked) ui.orgView = 'lock';
      out = (ORG[ui.orgView] || ORG.home)();
    } else {
      if (!S.me) ui.view = 'who';
      if (!ui.view) ui.view = homeView();
      if (ui.view === 'tee' && homeView() !== 'tee') ui.view = homeView();
      out = (VIEWS[ui.view] || VIEWS.tee)();
    }
    let overlay = '';
    if (ui.testSheet) {
      const list = Object.entries(FIX.cards).filter(([, c]) => c.nine === ui.testSheet);
      overlay += `<div class="scrim" data-act="sheet-close"><div class="sheet" role="dialog" aria-label="Test cards">
        <div class="nav"><span class="b">Test cards</span><button class="link" data-act="sheet-close">Cancel</button></div>
        <div class="card">${list.map(([k, c]) => `<button class="row" data-act="test-card-pick" data-seg="${ui.testSheet}" data-key="${k}"><span>${esc(c.label)}</span>${chev}</button>`).join('')}</div></div></div>`;
    }
    if (ui.photoFull) overlay += `<div class="full" data-act="photo-close" role="dialog" aria-label="Card photo"><img src="${ui.photoFull}" alt="Card photo"><button class="link full-close" data-act="photo-close">Close</button></div>`;
    app.innerHTML = out.html + overlay;
    app.classList.toggle('no-tabs', !out.tabs);
    tabs.hidden = !out.tabs;
    tabs.querySelectorAll('.tab').forEach(b => {
      const on = b.dataset.tab === out.tab;
      b.classList.toggle('on', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    if (ui.scrollCur) {
      ui.scrollCur = false;
      const c = document.getElementById('cur');
      if (c) c.scrollIntoView({ block: 'center' }); else window.scrollTo(0, 0);
    } else if (ui.scrollTop) {
      ui.scrollTop = false;
      window.scrollTo(0, 0);
    }
    renderToast();
  }

  function renderToast() {
    let el = document.getElementById('toast');
    if (!ui.toast) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = ui.toast;
  }

  tabs.innerHTML = [['hole', 'Hole'], ['match', 'Buggy Wars'], ['board', 'Leaderboard']]
    .map(([k, l]) => `<button class="tab" data-act="tab" data-tab="${k}">${TABICON[k]}<span>${l}</span></button>`).join('');

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el || el.tagName === 'FORM') return;
    const fn = ACT[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('submit', e => {
    const f = e.target.closest('form[data-form]');
    if (!f) return;
    e.preventDefault();
    const fn = FORMS[f.dataset.form];
    if (fn) fn();
  });
  document.addEventListener('change', e => {
    const el = e.target.closest && e.target.closest('input[data-photo]');
    if (!el || !el.files || !el.files[0]) return;
    const f = el.files[0];
    el.value = '';
    startCheck(el.dataset.photo, { file: f });
  });
  window.addEventListener('storage', e => { if (e.key === KEY) { S = load(); render(); } });

  if (window.claude && typeof window.claude.use === 'function') {
    window.claude.use('sample').then(async fn => {
      sampleFn = fn;
      if (fn) { const lim = await fn.limits().catch(() => null); canReadImages = !!(lim && lim.images); }
    }).catch(() => {});
    window.claude.use('downloads').then(d => { downloads = d; if (ui.view === 'results' || ui.orgView === 'export') render(); }).catch(() => {});
  }

  if (S.me) ui.view = homeView();
  render();

  window.__golfTrip = { state: () => S, ui };
})();
