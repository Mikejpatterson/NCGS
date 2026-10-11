/* ================= Actions ================= */
const dataOf = el => el.dataset;
const ACT = {
  back: () => back(),
  home: () => { UI.org = false; UI.stack = [{ v: 'home', p: {} }]; UI.scrollTop = true; render(); },
  round: el => go('round', { rid: el.dataset.rid }),
  player: el => go('player', { pid: el.dataset.pid }),
  card: el => go('card', { rid: el.dataset.rid, pid: el.dataset.pid }),
  goy: () => go('goy'),
  players: () => go('players'),
  rounds: () => go('rounds'),
  who: () => go('who', { then: null }),
  pick: el => {
    DB.prefs.me = el.dataset.id;
    savePrefs();
    const then = cur().p.then;
    if (then) { UI.stack.pop(); ACT.play({ dataset: { rid: then } }); } else back();
  },
  play: el => {
    const rid = el.dataset.rid;
    if (!DB.prefs.me || !myGroup(rid)) { go('who', { then: rid }); return; }
    UI.edit = false;
    UI.after = null;
    if (backTo(e => ['tee', 'match', 'board', 'finish'].includes(e.v))) { UI.playRid = rid; replaceTop(playHomeView(rid), { rid }); return; }
    UI.playRid = rid;
    go(playHomeView(rid), { rid });
  },
  leaderboard: el => { UI.playRid = el.dataset.rid; UI.board = el.dataset.rid; go('board', { rid: el.dataset.rid }); },
  toggle: el => { UI.open[el.dataset.key] = !UI.open[el.dataset.key]; render(); },
  hcp: el => go('hcp', { pid: el.dataset.pid, rid: el.dataset.rid }),
  tab: el => {
    UI.contestSheet = false;
    const t = el.dataset.tab;
    const rid = playRid();
    while (UI.stack.length > 1 && !['tee', 'match', 'board', 'finish', 'after', 'entry', 'check'].includes(cur().v)) UI.stack.pop();
    if (t === 'hole') { UI.edit = false; UI.after = null; replaceTop(playHomeView(rid), { rid }); }
    else if (t === 'match') { replaceTop('match', { rid }); UI.scrollCur = true; render(); }
    else replaceTop('board', { rid });
  },
  enter: () => { UI.edit = false; go('entry', { rid: playRid() }); },
  set: el => setScore(el.dataset.pid, el.dataset.v),
  'contest-open': () => { UI.contestSheet = true; render(); },
  'contest-close': () => { UI.contestSheet = false; render(); },
  'contest-scrim': (el, e) => { if (e.target !== el) return; UI.contestSheet = false; render(); },
  claim: el => { const ctx = entryCtx(); ensureDraft(ctx)._claim = el.dataset.pid || null; UI.contestSheet = false; savePrefs(); render(); },
  save: () => saveHole(),
  'entry-back': () => { UI.contestSheet = false; UI.edit = false; back(); },
  undo: () => undoSave(),
  next: () => { UI.after = null; replaceTop('tee', { rid: playRid() }); },
  'to-finish': () => { UI.after = null; replaceTop('finish', { rid: playRid() }); },
  conflict: el => { UI.hole = Number(el.dataset.n); UI.edit = true; const ctx = entryCtx(); clearDraft(ctx); go('entry', { rid: playRid() }); },
  submit: () => {
    const rid = playRid();
    const g = myGroup(rid);
    const unchecked = ['front', 'back'].filter(sg => { const c = D.check(rid, g.id, sg); return !c || !c.resolved; });
    put('cards', [{ round: rid, grp: g.id, at: new Date().toISOString(), by: byMe(), note: unchecked.length ? 'Not checked against the card: ' + unchecked.map(nineName).join(' and ') : 'Checked against the card' }],
      { by: byMe(), action: 'Card submitted', detail: `${roundName(D.round(rid))} · group ${g.n}${unchecked.length ? ` · not checked against the card: ${unchecked.map(nineName).join(' and ')}` : ' · checked against the card'}` });
    tick();
    render();
  },
  mgroup: el => { UI.matchGroup = el.dataset.gid; UI.scrollCur = true; render(); },
  'fix-hole': el => { UI.playRid = el.dataset.rid; UI.hole = Number(el.dataset.n); UI.edit = true; go('entry', { rid: el.dataset.rid }); },
  'edit-hole': el => { UI.hole = Number(el.dataset.n); UI.edit = true; go('entry', { rid: playRid() }); },
  board: el => { UI.board = el.dataset.id; render(); },
  results: el => go('results', { rid: el.dataset.rid }),
  'share-card': el => shareCard(el.dataset.rid),
  'share-close': () => { UI.shareImg = null; render(); },
  'open-check': el => { UI.checkSeg = el.dataset.seg; go('check', { rid: playRid() }); },
  decide: el => { updateCheck(UI.checkSeg, d => { if (!d.resolved) d.decisions[el.dataset.k] = el.dataset.v; }); render(); },
  'check-done': el => applyCheck(el.dataset.seg),
  'manual-check': el => { updateCheck(el.dataset.seg, d => { d.status = 'manual'; }); render(); },
  'manual-ok': el => {
    const g = myGroup(playRid());
    updateCheck(el.dataset.seg, d => { d.resolved = true; d.changes = 0; });
    logEntry('Card check', `${roundName(D.round(playRid()))} · group ${g.n} · ${nineName(el.dataset.seg)}: checked by eye`);
    tick(); render();
  },
  'retry-check': el => {
    const rid = playRid();
    const g = myGroup(rid);
    const c = D.check(rid, g.id, el.dataset.seg);
    const src = photoSrc(c);
    if (!c || !src) { toast('The photo is not on this phone. Take another.'); return; }
    updateCheck(el.dataset.seg, d => { d.status = 'reading'; });
    render();
    runReader(rid, g.id, el.dataset.seg, dataUrlToBlob(src), c.fixture);
  },
  'photo-full': el => {
    const c = el.dataset.gid ? D.check(el.dataset.rid, el.dataset.gid, el.dataset.seg) : D.check(playRid(), myGroup(playRid()).id, UI.checkSeg);
    const src = photoSrc(c);
    if (src) { UI.photoFull = src; render(); } else toast('Loading the photo');
  },
  'photo-close': () => { UI.photoFull = null; render(); },
  'test-card': el => { UI.testSheet = el.dataset.seg; render(); },
  'test-card-pick': el => startCheck(el.dataset.seg, { fixture: el.dataset.key }),
  'sheet-close': (el, e) => { if (e && e.target !== el && !el.classList.contains('link')) return; UI.testSheet = null; render(); },
  copy: el => {
    const ta = document.getElementById(el.dataset.target);
    try { navigator.clipboard.writeText(ta.value).then(() => toast('Copied'), () => { ta.select(); toast('Selected. Use Copy from the menu.'); }); } catch (e) { ta.select(); toast('Selected. Use Copy from the menu.'); }
  },

  /* organiser */
  org: () => { UI.org = true; UI.orgStack = [{ v: UI.orgUnlocked ? 'home' : 'lock', p: {} }]; UI.pinError = false; UI.scrollTop = true; render(); },
  'org-exit': () => { UI.org = false; UI.confirm = null; UI.scrollTop = true; render(); },
  'org-go': el => {
    const d = el.dataset;
    UI.formState = null;
    if (d.v === 'correct') { UI.edit = true; }
    go(d.v, { rid: d.rid, gid: d.gid, n: d.n ? Number(d.n) : undefined, pid: d.pid, cid: d.cid });
  },
  'org-new-round': () => { UI.formState = null; go('details', {}); },
  'org-toggle-player': el => { const d = UI.draft; const i = d.ids.indexOf(el.dataset.pid); if (i >= 0) d.ids.splice(i, 1); else d.ids.push(el.dataset.pid); render(); },
  'org-draw': el => {
    const r = D.round(cur().p.rid);
    const d = draftFor(r);
    const kind = el.dataset.kind;
    if (kind === 'players') { d.groups = null; d.sel = null; render(); return; }
    const prior = priorTripGroups(r);
    let res;
    if (kind === 'standings' || (kind === 'again' && d.kind === 'standings')) {
      const done = D.rounds().filter(x => x.trip === r.trip && x.season === r.season && x.status === 'final' && x.id !== r.id && (x.trip_day || 0) < (r.trip_day || 99));
      const pts = done.map(x => pointsOf(x.id));
      const standings = E.rankRows(d.ids.map(pid => ({ id: pid, name: D.nameOf(pid), total: pts.reduce((s, p) => s + (p[pid] || 0), 0) })), 'total', 'desc');
      res = E.proposeDraw(standings, prior, []);
      d.kind = 'standings';
    } else {
      d.seed = (d.seed || Date.now() % 100000) + 17;
      res = E.randomDraw(d.ids, [], d.seed, prior);
      d.kind = 'random';
    }
    d.groups = res.groups;
    d.repeats = res.repeats;
    d.sel = null;
    render();
  },
  'org-swap': el => {
    const d = UI.draft;
    const pid = el.dataset.pid;
    if (!d.sel) { d.sel = pid; render(); return; }
    if (d.sel === pid) { d.sel = null; render(); return; }
    const a = d.sel, b = pid;
    d.groups.forEach(g => g.teams.forEach(t => t.forEach((x, i) => { if (x === a) t[i] = b; else if (x === b) t[i] = a; })));
    d.sel = null;
    d.repeats = E.repeatedPartners([...priorTripGroups(D.round(d.rid)), { rid: d.rid, groups: d.groups }]).filter(x => x.rounds.includes(d.rid));
    render();
  },
  'org-save-groups': () => {
    const r = D.round(cur().p.rid);
    const d = draftFor(r);
    const times = E.teeTimesFrom(r.first_tee || '', r.interval || 8, d.groups.length);
    const groups = d.groups.map((g, i) => ({ id: 'g' + (i + 1), n: i + 1, teeTime: times[i] || '', startHole: 1, teams: g.teams }));
    const ids = new Set(groups.flatMap(g => g.teams.flat()));
    const kb = r.kb && r.kb.every(pr => pr.every(pid => ids.has(pid))) ? r.kb : null;
    put('rounds', [Object.assign({}, r, { groups, kb })], { action: 'Groups saved', detail: `${roundName(r)}: ${groups.map(g => `${g.teeTime} ${g.teams.map(t => t.map(D.nameOf).join(' & ')).join(' v ')}`).join('; ')}` });
    UI.draft = null;
    back();
    toast('Groups saved');
  },
  'org-kb-make': () => { const r = D.round(cur().p.rid); const res = E.kbPairsFor(r.groups, (Date.now() % 100000) + 3); UI.kbDraft = { rid: r.id, pairs: res.pairs, sel: null }; render(); },
  'org-kb-swap': el => {
    const d = UI.kbDraft;
    const pid = el.dataset.pid;
    if (!d.sel || d.sel === pid) { d.sel = d.sel === pid ? null : pid; render(); return; }
    const a = d.sel;
    d.pairs.forEach(pr => pr.forEach((x, i) => { if (x === a) pr[i] = pid; else if (x === pid) pr[i] = a; }));
    d.sel = null;
    render();
  },
  'org-kb-save': () => { const r = D.round(cur().p.rid); put('rounds', [Object.assign({}, r, { kb: UI.kbDraft.pairs })], { action: 'KBs saved', detail: `${roundName(r)}: ${UI.kbDraft.pairs.map(pr => pr.map(D.nameOf).join(' & ')).join('; ')}` }); UI.kbDraft = null; back(); toast('KBs saved'); },
  'org-kb-clear': () => { const r = D.round(cur().p.rid); put('rounds', [Object.assign({}, r, { kb: null })], { action: 'KBs removed', detail: roundName(r) }); UI.kbDraft = null; back(); },
  'org-win': el => {
    const n = Number(el.dataset.n);
    put('winners', [{ round: el.dataset.rid, hole: n, player: el.dataset.pid }], { action: 'Contest winner confirmed', detail: `${roundName(D.round(el.dataset.rid))} · ${CONTEST[contestOn(el.dataset.rid, n).type]} on ${n}: ${D.nameOf(el.dataset.pid)}` });
    tick(); render();
  },
  'org-unwin': el => { removeRows('winners', [{ round: el.dataset.rid, hole: Number(el.dataset.n) }], { action: 'Contest winner cleared', detail: `${roundName(D.round(el.dataset.rid))} · hole ${el.dataset.n}` }); render(); },
  'start-round': el => {
    const r = D.round(el.dataset.rid);
    if (!r.groups || !r.groups.length) { toast('Draw the groups first'); return; }
    if (!canScore(r)) { toast('The course needs its par, index and tees first'); return; }
    if (liveRid()) { toast('Finalise the live round first'); return; }
    put('rounds', [Object.assign({}, r, { status: 'live' })], { action: 'Round started', detail: roundName(r) });
    toast(`${roundName(r)} is live`);
  },
  finalise: el => {
    const r = D.round(el.dataset.rid);
    const reasons = finaliseBlockers(r);
    if (reasons.length) { toast(`Not yet: ${reasons.join(', ')}`); return; }
    const comp = computeR(r.id);
    put('rounds', [Object.assign({}, r, { status: 'final', ph: Object.fromEntries(Object.values(comp.players).map(p => [p.id, p.ph])), allowance: allowanceOf(r) })], { action: 'Round finalised', detail: `${roundName(r)}: results and handicaps fixed` });
    tick();
    toast(`${roundName(r)} is final`);
  },
  reopen: el => {
    const r = D.round(el.dataset.rid || (UI.org ? cur().p.rid : playRid()));
    put('rounds', [Object.assign({}, r, { status: 'live' })], { action: 'Round reopened', detail: `${roundName(r)} reopened for corrections` });
    toast(`${roundName(r)} reopened`);
  },
  'delete-round': el => {
    const r = D.round(el.dataset.rid);
    if (UI.confirm !== 'del-' + r.id) { UI.confirm = 'del-' + r.id; render(); return; }
    removeRows('rounds', [{ id: r.id }], { action: 'Round deleted', detail: `${roundName(r)}${r.date ? ' ' + r.date : ''}` });
    UI.confirm = null;
    back();
  },
  'demo-fill': () => demoFill(),
  'reset-preview': () => {
    if (UI.confirm !== 'reset') { UI.confirm = 'reset'; render(); return; }
    Object.values(KEY).forEach(k => LS.del(k));
    location.reload();
  }
};

const FORMS = {
  pin: () => {
    const v = val('pin');
    call({ op: 'checkPin', pin: v }).then(res => {
      if (res.ok) { ORGPIN.pin = v; UI.orgUnlocked = true; UI.pinError = false; replaceTop('home'); }
      else { UI.pinError = 'That PIN did not match.'; render(); const el = document.getElementById('pin'); if (el) el.focus(); }
    }).catch(() => { UI.pinError = 'The organiser needs signal to unlock.'; render(); });
  },
  details: () => {
    const p = cur().p;
    const r = p.rid ? D.round(p.rid) : null;
    const course = val('f-course');
    const tee = val('f-tee') || null;
    const date = val('f-date') || null;
    const firstTee = val('f-tee-time') || null;
    const interval = num('f-interval') || 8;
    const holesList = s => s.split(/[^0-9]+/).filter(Boolean).map(Number).filter(n => n >= 1 && n <= 18);
    const contests = holesList(val('f-ntp')).map(h => ({ type: 'ntp', hole: h })).concat(holesList(val('f-ld')).map(h => ({ type: 'ld', hole: h }))).sort((a, b) => a.hole - b.hole);
    if (new Set(contests.map(c => c.hole)).size !== contests.length) { UI.formError = 'One contest per hole.'; render(); return; }
    const season = date ? Number(date.slice(0, 4)) : (r ? r.season : new Date().getFullYear());
    const seq = r && r.season === season ? r.seq : Math.max(0, ...D.rounds().filter(x => x.season === season).map(x => x.seq || 0)) + 1;
    const base = r || { id: `${season}-${slug((D.course(course) || {}).name)}-${date || Date.now().toString(36)}`, status: 'upcoming', source: 'app', groups: null, kb: null };
    if (!r && D.round(base.id)) base.id += '-' + Date.now().toString(36).slice(-3);
    const row = Object.assign({}, base, {
      season, seq, date, course, tee, first_tee: firstTee, interval, trip: val('f-trip') || null, trip_day: num('f-day'), contests, name: null
    });
    if (r && r.groups && firstTee && firstTee !== r.first_tee) {
      const times = E.teeTimesFrom(firstTee, interval, r.groups.length);
      row.groups = r.groups.map((g, i) => Object.assign({}, g, { teeTime: times[i] }));
    }
    put('rounds', [row], { action: r ? 'Round details changed' : 'Round added', detail: `${(D.course(course) || {}).name || course}${date ? ' · ' + date : ''}` });
    UI.formState = null;
    if (r) back(); else replaceTop('round', { rid: row.id });
  },
  member: () => {
    const p = cur().p;
    const m = p.pid ? D.member(p.pid) : null;
    const name = val('m-name');
    const raw = val('m-index').replace(',', '.');
    const plus = raw.startsWith('+');
    const n = Number(raw.replace('+', ''));
    if (!name) { UI.formError = 'Enter a name.'; render(); return; }
    if (raw === '' || !isFinite(n)) { UI.formError = 'Enter the WHS index, like 12.4 or +1.2.'; render(); return; }
    const index = Math.round((plus ? -n : n) * 10) / 10;
    if (index < -10 || index > 54) { UI.formError = 'WHS indexes run from +10.0 to 54.0.'; render(); return; }
    if (D.members().some(x => x.name.toLowerCase() === name.toLowerCase() && (!m || x.id !== m.id))) { UI.formError = 'Someone already has that name.'; render(); return; }
    let id = m ? m.id : slug(name);
    if (!m) while (D.member(id)) id += '-2';
    const row = { id, name, full: val('m-full') || null, index, active: m ? val('m-active') !== 'no' : true };
    const what = !m ? 'Member added' : m.index !== index ? 'Handicap index changed' : 'Member changed';
    put('members', [row], { action: what, detail: m && m.index !== index ? `${name}: ${fmtIndex(m.index)} → ${fmtIndex(index)}` : name });
    toast(m && m.index !== index ? `${name} now ${fmtIndex(index)}` : 'Saved');
    back();
  },
  course: () => {
    const p = cur().p;
    const c = p.cid ? D.course(p.cid) : null;
    const name = val('c-name');
    if (!name) { UI.formError = 'Enter the course name.'; render(); return; }
    const tees = {};
    for (let i = 0; document.getElementById(`t-name-${i}`); i++) {
      const tn = val(`t-name-${i}`);
      if (!tn) continue;
      const slope = num(`t-slope-${i}`), rating = num(`t-rating-${i}`);
      if (!(slope >= 55 && slope <= 155) || !(rating >= 50 && rating <= 85)) { UI.formError = `${tn} tees need a slope (55 to 155) and a rating (like 70.5).`; render(); return; }
      const key = document.getElementById(`t-name-${i}`).dataset.key || slug(tn);
      tees[key] = { name: tn, slope, rating };
    }
    const holes = [];
    let any = false;
    for (let i = 0; i < 18; i++) {
      const par = num(`h-par-${i}`), si = num(`h-si-${i}`), m = num(`h-m-${i}`);
      if (par || si || m) any = true;
      holes.push({ n: i + 1, par, si, m });
    }
    let holeData = null;
    if (any) {
      if (holes.some(h => !h.par || !h.si)) { UI.formError = 'Every hole needs a par and an index.'; render(); return; }
      const sis = holes.map(h => h.si).sort((a, b) => a - b);
      if (sis.some((s, i) => s !== i + 1)) { UI.formError = 'Each index from 1 to 18 is used once.'; render(); return; }
      holeData = holes.map(h => ({ n: h.n, par: h.par, si: h.si, m: h.m || null }));
    }
    const par = holeData ? holeData.reduce((s, h) => s + h.par, 0) : null;
    Object.values(tees).forEach(t => { if (par) t.par = par; });
    const id = c ? c.id : (D.course(slug(name)) ? slug(name) + '-' + Date.now().toString(36).slice(-3) : slug(name));
    put('courses', [{ id, name, area: val('c-area') || null, about: val('c-about') || null, lat: num('c-lat'), lon: num('c-lon'), tees, holes: holeData }], { action: c ? 'Course changed' : 'Course added', detail: name });
    toast('Saved');
    back();
  },
  settings: () => {
    const best = num('s-best'), allow = num('s-allow');
    if (!(best >= 1 && best <= 20)) { UI.formError = 'Scores that count: 1 to 20.'; render(); return; }
    if (!(allow >= 50 && allow <= 100)) { UI.formError = 'Allowance: 50 to 100%.'; render(); return; }
    put('settings', [{ key: 'society', value: val('s-name') || 'NCGS' }, { key: 'goy_best', value: String(best) }, { key: 'allowance', value: String(allow / 100) }], { action: 'Settings changed', detail: `Best ${best} count · allowance ${allow}%` });
    toast('Saved');
    back();
  },
  newpin: () => {
    const np = val('s-pin');
    if (!/^\d{4,8}$/.test(np)) { toast('Use 4 to 8 digits'); return; }
    call({ op: 'setPin', pin: ORGPIN.pin, newPin: np }).then(res => {
      if (res.ok) { ORGPIN.pin = np; toast('PIN changed'); sync(); } else toast(res.message || 'PIN not changed');
    }).catch(() => toast('Needs signal to change the PIN'));
  }
};

/* ================= Render ================= */
const app = document.getElementById('app');
const tabs = document.getElementById('tabs');

function render() {
  if (!DB.loaded && !view().members.length) {
    app.innerHTML = `<div class="loading"><span class="badge">NCGS</span><p class="sub">${DB.online ? 'Loading' : 'No signal. The app will load when there is.'}</p></div>`;
    tabs.hidden = true;
    return;
  }
  const e = cur();
  let out;
  try {
    out = UI.org ? (UI.orgUnlocked || e.v === 'lock' ? (ORG[e.v] || ORG.home)(e.p || {}) : ORG.lock()) : (VIEWS[e.v] || VIEWS.home)(e.p || {});
  } catch (err) {
    console.error(err);
    UI.stack = [{ v: 'home', p: {} }];
    UI.org = false;
    out = VIEWS.home({});
  }
  let overlay = '';
  if (UI.testSheet) {
    const list = Object.entries(FIX.cards).filter(([, c]) => c.nine === UI.testSheet);
    overlay += `<div class="scrim" data-act="sheet-close"><div class="sheet" role="dialog" aria-label="Test cards">
      <div class="nav"><span class="b">Test cards</span><button class="link" data-act="sheet-close">Cancel</button></div>
      ${cardOf(list.map(([k, c]) => `<button class="row" data-act="test-card-pick" data-seg="${UI.testSheet}" data-key="${k}"><span>${esc(c.label)}</span>${chev}</button>`).join(''))}</div></div>`;
  }
  if (UI.photoFull) overlay += `<div class="full" data-act="photo-close" role="dialog" aria-label="Card photo"><img src="${UI.photoFull}" alt="Card photo"><button class="link full-close" data-act="photo-close">Close</button></div>`;
  if (UI.shareImg) overlay += `<div class="full" role="dialog" aria-label="Results image"><img src="${UI.shareImg}" alt="Results"><a class="btn dl" href="${UI.shareImg}" download="results.png">Save image</a><button class="link full-close" data-act="share-close">Close</button></div>`;
  const active = document.activeElement;
  const keepFocus = active && active.id && app.contains(active) && /INPUT|TEXTAREA|SELECT/.test(active.tagName) ? active.id : null;
  app.innerHTML = out.html + overlay;
  if (keepFocus) { const el = document.getElementById(keepFocus); if (el) el.focus(); }
  const showTabs = !UI.org && !!out.tabs;
  app.classList.toggle('no-tabs', !showTabs);
  tabs.hidden = !showTabs;
  tabs.querySelectorAll('.tab').forEach(b => {
    const on = b.dataset.tab === out.tabs;
    b.classList.toggle('on', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  if (UI.scrollCur) { UI.scrollCur = false; const c = document.getElementById('cur'); if (c) c.scrollIntoView({ block: 'center' }); else window.scrollTo(0, 0); }
  else if (UI.scrollTop) { UI.scrollTop = false; window.scrollTo(0, 0); }
  renderToast();
}
function renderToast() {
  let el = document.getElementById('toast');
  if (!UI.toast) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = UI.toast;
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
  UI.formError = null;
  const fn = FORMS[f.dataset.form];
  if (fn) fn();
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset && t.dataset.change === 'details-course') { UI.formState = Object.assign({}, UI.formState, { course: t.value }); render(); return; }
  const el = t.closest && t.closest('input[data-photo]');
  if (!el || !el.files || !el.files[0]) return;
  const f = el.files[0];
  el.value = '';
  startCheck(el.dataset.photo, { file: f });
});
window.addEventListener('storage', e => { if (e.key === KEY.local && BOOT.mode !== 'live') sync(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { flush(); sync(); } });
window.addEventListener('online', () => { flush(); sync(); });

/* Fresh data every 15 seconds while a round is live, every minute otherwise. */
setInterval(() => {
  if (document.hidden) return;
  const every = liveRid() ? 15000 : 60000;
  if (Date.now() - DB.lastSync >= every) sync();
  if (DB.outbox.length && DB.online) flush();
}, 5000);

if (window.claude && typeof window.claude.use === 'function') {
  window.claude.use('sample').then(async fn => {
    sampleFn = fn;
    if (fn) { const lim = await fn.limits().catch(() => null); canReadImages = !!(lim && lim.images); }
  }).catch(() => {});
  window.claude.use('downloads').then(d => { downloads = d; }).catch(() => {});
}

/* Open where the phone left off: in the round if one is live and this phone is playing. */
(function start() {
  const rid = liveRid();
  if (rid && DB.prefs.me && myGroup(rid)) { UI.playRid = rid; UI.stack = [{ v: 'home', p: {} }, { v: 'round', p: { rid } }, { v: playHomeView(rid), p: { rid } }]; }
  render();
  sync().then(() => flush());
})();
if ('serviceWorker' in navigator && BOOT.mode === 'live' && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
window.__ncgs = { DB, UI, D, view, sync, flush, render };
