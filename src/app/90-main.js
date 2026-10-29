/* ================= Actions ================= */
const dataOf = el => el.dataset;
const ACT = {
  back: () => back(),
  home: () => { UI.org = false; UI.stack = [{ v: 'home', p: {} }]; UI.scrollTop = true; render(); },
  round: el => { if (el.dataset.tab) UI.rtab = el.dataset.tab; go('round', { rid: el.dataset.rid }); },
  player: el => go('player', { pid: el.dataset.pid, year: el.dataset.year ? Number(el.dataset.year) : null }),
  card: el => go('card', { rid: el.dataset.rid, pid: el.dataset.pid }),
  goy: () => go('goy'),
  stats: () => go('stats'),
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
    UI.teeHole = null;
    if (backTo(e => ['tee', 'match', 'board', 'rules', 'finish'].includes(e.v))) { UI.playRid = rid; replaceTop(playHomeView(rid), { rid }); return; }
    UI.playRid = rid;
    go(playHomeView(rid), { rid });
  },
  leaderboard: el => { UI.playRid = el.dataset.rid; UI.board = el.dataset.rid; UI.res = 'lb'; go('board', { rid: el.dataset.rid }); },
  'wx-retry': el => { delete UI.wx[el.dataset.cid]; render(); },
  trip: el => go('trip', { rid: el.dataset.rid }),
  rtab: el => { UI.rtab = el.dataset.t; UI.rtabPicked = true; render(); },
  bwseg: el => { UI.open[el.dataset.key] = el.dataset.open !== '1'; render(); },
  respill: el => { UI.res = el.dataset.p; UI.scrollTop = true; render(); },
  toggle: el => { UI.open[el.dataset.key] = !UI.open[el.dataset.key]; render(); },
  hcp: el => go('hcp', { pid: el.dataset.pid, rid: el.dataset.rid }),
  tab: el => {
    ruleClose();
    UI.contestSheet = false;
    const t = el.dataset.tab;
    if (t === 'home') { ACT.home(); return; }
    const rid = playRid() || liveRid() || (announced()[0] || {}).id || ((D.rounds().filter(r => r.status === 'final').slice(-1)[0]) || {}).id;
    if (!rid) { toast('No round yet'); return; }
    if (cur().v === 'home' && t === 'hole') { ACT.play({ dataset: { rid } }); return; }
    while (UI.stack.length > 1 && !['tee', 'match', 'board', 'rules', 'finish', 'after', 'entry', 'check'].includes(cur().v)) UI.stack.pop();
    if (t === 'hole') { UI.edit = false; UI.after = null; UI.teeHole = null; replaceTop(playHomeView(rid), { rid }); }
    else if (t === 'rules') { replaceTop('rules', { rid }); }
    else if (t === 'match') { UI.board = null; UI.res = 'bw'; UI.scrollTop = true; replaceTop('board', { rid }); }
    else { UI.board = null; UI.res = UI.res === 'bw' || UI.res === 'ct' ? UI.res : 'lb'; replaceTop('board', { rid }); }
  },
  enter: () => { UI.edit = false; go('entry', { rid: playRid() }); },
  set: el => setScore(el.dataset.pid, el.dataset.v),
  clear: el => clearScore(el.dataset.pid),
  'ask-mic': () => askListen(),
  'ask-stop': () => askStop(),
  'ask-cancel': () => askCancel(),
  'ask-idea': el => askQuestion(el.dataset.q),
  'ask-read': el => askRead(Number(el.dataset.i)),
  'ask-info': el => askInfo(Number(el.dataset.i)),
  'rule-open': el => ruleOpen(el.dataset.rule, Number(el.dataset.i)),
  'rule-close': (el, e) => { if (e && e.target !== el && !el.classList.contains('link')) return; ruleClose(); },
  'ask-more': () => askKeyboard(),
  'ask-clear': () => { ruleClose(); UI.chat = []; UI.chatInfo = {}; UI.chatBusy = false; UI.askDraft = ''; render(); },
  'ask-pick': el => { UI.askPick = { key: el.dataset.key, v: el.dataset.v }; render(); },
  'ask-confirm': () => {
    const rid = playRid(), g = myGroup(rid), comp = progressOf(rid);
    if (!g || !comp) return;
    const gc = comp.groups.find(x => x.id === g.id), c = askPending(rid, gc, g.id);
    const key = c && contestKey(rid, g.id, c.hole);
    if (!c || !UI.askPick || UI.askPick.key !== key) return;
    // A separate small save, so an answer can never hold up a score. The local note keeps the question closed even if the server has not been updated yet.
    send({ op: 'saveHole', round: rid, grp: g.id, hole: c.hole, scores: {}, claim: UI.askPick.v, by: byMe(), label: `${roundName(D.round(rid))} · Group ${gc.n} · ${CONTEST[c.type]}` });
    (DB.prefs.askDone = DB.prefs.askDone || {})[key] = true;
    UI.askPick = null;
    savePrefs(); tick(); render();
  },
  'intro-go': el => { const rid = playRid(), g = myGroup(rid); (DB.prefs.intro = DB.prefs.intro || {})[contestKey(rid, g.id, Number(el.dataset.n))] = true; savePrefs(); render(); },
  'intro-scrim': () => {},
  save: () => saveHole(),
  'scr-score': el => scrScore(el.dataset.dir),
  'scr-pickup': () => scrPickup(),
  'scr-clear': () => scrClear(),
  'scr-driver': el => scrDriver(el.dataset.pid),
  'scr-save': () => scrSave(),
  'org-format': el => {
    const r = D.round(el.dataset.rid);
    if (!r) return;
    if (Object.values(D.scores(r.id)).some(h => Object.values(h || {}).some(E.isEntered))) { toast('Scores are in, so the format can\'t change now.'); return; }
    const on = !isScramble(r);
    put('settings', [{ key: 'format:' + r.id, value: on ? 'scramble' : '' }], { action: 'Round format', detail: `${roundName(r)}: ${on ? 'scramble (team score)' : 'individual Stableford'}` });
    toast(on ? 'Scramble: one team score per group' : 'Individual Stableford');
  },
  'org-tripboard': el => {
    const r = D.round(el.dataset.rid);
    if (!r || !r.trip) return;
    const off = tripBoardOn(r);
    put('settings', [{ key: `tripboard:${r.season}:${r.trip}`, value: off ? 'off' : '' }], { action: 'Trip leaderboard', detail: `${r.trip} ${r.season}: ${off ? 'off' : 'on'}` });
    toast(off ? 'No combined trip leaderboard' : 'Trip leaderboard on');
  },
  'entry-back': () => {
    const ctx = entryCtx(), d = (draftsFor(ctx) || {})[ctx.n];
    if (ctx.mode === 'player' && !ctx.edit && d && Object.keys(d).some(k => k[0] !== '_')) toast('Scores kept. Pick up where you left off.');
    UI.contestSheet = false; UI.edit = false; back();
  },
  year: el => { UI.year = Number(el.dataset.y); UI.scrollTop = false; render(); },
  holes: () => { UI.holeSheet = true; render(); },
  'holes-close': () => { UI.holeSheet = false; render(); },
  'holes-scrim': (el, e) => { if (e.target !== el) return; UI.holeSheet = false; render(); },
  'goto-hole': el => {
    const rid = playRid(), g = myGroup(rid), comp = progressOf(rid);
    UI.holeSheet = false;
    if (!g || !comp) { render(); return; }
    const gc = comp.groups.find(x => x.id === g.id), n = Number(el.dataset.n);
    if (cur().v === 'tee' && n === gc.nextHole) { render(); return; }
    UI.hole = n; UI.edit = !!gc.holes[n].complete; UI.after = null; UI.contestSheet = false;
    if (cur().v === 'entry') replaceTop('entry', { rid }); else go('entry', { rid });
  },
  undo: () => undoSave(),
  next: () => { UI.after = null; UI.teeHole = null; replaceTop('tee', { rid: playRid() }); },
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
  'fix-hole': el => {
    const rid = el.dataset.rid, pid = el.dataset.pid, n = Number(el.dataset.n);
    const cur = (D.scores(rid)[pid] || {})[n];
    UI.fix = { rid, pid, n, v: E.isEntered(cur) ? cur : null, base: cur === undefined ? null : cur };
    render();
  },
  'fix-step': el => {
    const f = UI.fix; if (!f) return;
    const d = Number(el.dataset.d);
    // From a pick-up, plus and minus move from the strokes it is shown as, not from par.
    const from = Number.isInteger(f.v) ? f.v : E.pickupStrokes(holeOf(f.rid, f.n).par, fixShots(f));
    f.v = Math.max(1, from + d);
    refreshFix();
  },
  'fix-pu': () => { const f = UI.fix; if (!f) return; f.v = f.v === 'P' ? (Number.isInteger(f.base) ? f.base : holeOf(f.rid, f.n).par) : 'P'; refreshFix(); },
  'fix-save': () => { if (UI.fix && UI.fix.v !== UI.fix.base) fixSave(); },
  'fix-cancel': () => { UI.fix = null; render(); },
  'fix-scrim': (el, e) => { if (e.target !== el) return; UI.fix = null; render(); },
  'edit-hole': el => { UI.hole = Number(el.dataset.n); UI.edit = true; go('entry', { rid: playRid() }); },
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
    // Draws and saves at once; the Groups screen then shows the groups to change. "again" redraws the same players.
    const r = D.round(cur().p.rid);
    const kind = el.dataset.kind;
    const again = kind === 'again';
    if (again) {
      if (grStarted(r) || drawMade(r) || (r.groups || []).some(g => g.teams.flat().some(pid => scoresFor(r.id, pid)))) { toast('These groups can no longer be redrawn.'); return; }
      if (UI.confirm !== 'redraw-' + r.id) { UI.confirm = 'redraw-' + r.id; render(); return; }
      UI.confirm = null;
    }
    const ids = again ? r.groups.flatMap(g => g.teams.flat()) : draftFor(r).ids;
    const prior = priorTripGroups(r);
    let res;
    if (kind === 'standings') {
      const pts = priorFinalDays(r).map(x => pointsOf(x.id));
      const standings = E.rankRows(ids.map(pid => ({ id: pid, name: D.nameOf(pid), total: pts.reduce((s, p) => s + (p[pid] || 0), 0) })), 'total', 'desc');
      res = E.proposeDraw(standings, prior, []);
    } else {
      res = E.randomDraw(ids, [], (Date.now() % 100000) + 17, prior);
    }
    saveDraw(r, res.groups, again ? 'Groups redrawn' : 'Groups drawn');
    UI.draft = null; UI.gsel = null;
    render();
    toast(isScramble(r) ? 'Teams drawn' : 'Groups drawn, KB pairs made');
  },
  'org-kb-make': () => { const r = D.round(cur().p.rid); const res = E.kbPairsFor(E.kbGroups(r), (Date.now() % 100000) + 3, priorKbPairs(r.id)); UI.kbDraft = { rid: r.id, pairs: res.pairs, sel: null }; render(); },
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
  'org-kb-clear': () => { const r = D.round(cur().p.rid); put('rounds', [Object.assign({}, r, { kb: null, groups: r.groups.map(g => Object.assign({}, g, { noKb: true })) })], { action: 'KBs turned off', detail: roundName(r) }); UI.kbDraft = null; render(); toast('KBs are off for this round'); },
  'org-kb-on': () => { const r = D.round(cur().p.rid); put('rounds', [Object.assign({}, r, { kb: null, groups: r.groups.map(g => Object.assign({}, g, { noKb: false })) })], { action: 'KBs turned on', detail: roundName(r) }); UI.kbDraft = null; render(); toast('KBs are on, pairs drawn'); },
  'org-kb-group': el => {
    const r = D.round(cur().p.rid), gid = el.dataset.gid;
    const groups = r.groups.map(g => g.id === gid ? Object.assign({}, g, { noKb: !g.noKb }) : g);
    put('rounds', [Object.assign({}, r, { kb: null, groups })], { action: 'KB groups changed', detail: `${roundName(r)}: ${groups.filter(g => g.noKb).map(g => 'Group ' + g.n).join(', ') || 'all groups in'}${groups.some(g => g.noKb) ? ' left out' : ''}` });
    UI.kbDraft = null; render();
  },
  'org-win': el => {
    const n = Number(el.dataset.n);
    put('winners', [{ round: el.dataset.rid, hole: n, player: el.dataset.pid }], { action: 'Contest winner confirmed', detail: `${roundName(D.round(el.dataset.rid))} · ${CONTEST[contestOn(el.dataset.rid, n).type]} on ${n}: ${D.nameOf(el.dataset.pid)}` });
    tick(); render();
  },
  'org-unwin': el => { removeRows('winners', [{ round: el.dataset.rid, hole: Number(el.dataset.n) }], { action: 'Contest winner cleared', detail: `${roundName(D.round(el.dataset.rid))} · hole ${el.dataset.n}` }); render(); },
  finalise: el => {
    const r = D.round(el.dataset.rid);
    const reasons = finaliseBlockers(r);
    if (reasons.length) { toast(`Not yet: ${reasons.join(', ')}`); return; }
    const comp = computeR(r.id);   // null for a scramble: no individual playing handicaps to keep
    const snapHoles = (holesOf(r) || []).map(h => { const o = Object.assign({}, h); delete o.yards; return o; });
    put('rounds', [Object.assign({}, r, { status: 'final', ph: comp ? Object.fromEntries(Object.values(comp.players).map(p => [p.id, p.ph])) : (r.ph || null), allowance: allowanceOf(r), results: snapHoles.length === 18 && teeOf(r) ? { snap: { holes: snapHoles, tee: teeOf(r) } } : r.results || null })], { action: 'Round finalised', detail: `${roundName(r)}: results, handicaps and the course card fixed` });
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
    // The second tap was on "Tap again to delete the round and its N scores", so the scores go too (the server
    // refuses to delete a round with scores unless told: structural review M4).
    const withScores = Object.values(D.scores(r.id)).some(h => Object.keys(h || {}).length);
    removeRows('rounds', [{ id: r.id }], { action: 'Round deleted', detail: `${roundName(r)}${r.date ? ' ' + r.date : ''}${withScores ? ' with its scores' : ''}` }, withScores ? { withScores: true } : null);
    UI.confirm = null;
    back();
  },
  scenarios: () => go('scenarios'),
  'scenario-pick': el => { if (window.NCGS_SCENARIOS) window.NCGS_SCENARIOS.choose(el.dataset.id); },
  'season-next': () => {
    if (liveRid()) return;
    if (UI.confirm !== 'season-next') { UI.confirm = 'season-next'; render(); return; }
    const next = seasonOf() + 1;
    UI.confirm = null; UI.year = null;
    put('settings', [{ key: 'season', value: String(next) }], { action: 'Season started', detail: String(next) });
    toast(`The ${next} season has started`);
  },
  'season-back': () => {
    if (liveRid()) return;
    if (UI.confirm !== 'season-back') { UI.confirm = 'season-back'; render(); return; }
    const prev = seasonOf() - 1;
    UI.confirm = null; UI.year = null;
    put('settings', [{ key: 'season', value: String(prev) }], { action: 'Season changed back', detail: String(prev) });
    toast(`Back to the ${prev} season`);
  },
  'testing-toggle': () => {
    const on = !D.testing();
    put('settings', [{ key: 'testing', value: on ? '1' : '0' }], { action: 'Testing mode ' + (on ? 'on' : 'off'), detail: on ? 'Any round can be deleted' : 'Only rounds that have not started can be deleted' });
    toast(on ? 'Testing mode on' : 'Testing mode off');
  },
  'demo-fill': () => demoFill(),
  'reset-preview': () => {
    if (UI.confirm !== 'reset') { UI.confirm = 'reset'; render(); return; }
    Object.values(KEY).forEach(k => LS.del(k));
    location.reload();
  },
  'late-pick': el => { UI.late = { rid: el.dataset.rid, pid: el.dataset.pid }; UI.confirm = null; render(); },
  'late-cancel': () => { UI.late = null; UI.confirm = null; render(); },
  'late-replace': el => {
    const r = D.round(el.dataset.rid), pid = el.dataset.pid, np = el.dataset.new;
    if (rosterLocked(r)) { toast('The teams have scores, so they are fixed now'); return; }
    if (scoresFor(r.id, pid)) { toast('That player already has scores'); return; }
    put('rounds', [withPlayerChanged(r, pid, np)], { action: 'Player swapped', detail: `${roundName(r)}: ${D.nameOf(np)} in for ${D.nameOf(pid)}` });
    UI.late = null; toast(`${D.nameOf(np)} is in`); back();
  },
  'late-drop': el => {
    const r = D.round(el.dataset.rid), pid = el.dataset.pid;
    if (rosterLocked(r)) { toast('The teams have scores, so they are fixed now'); return; }
    if (scoresFor(r.id, pid)) { toast('That player already has scores'); return; }
    if (UI.confirm !== 'drop-' + pid) { UI.confirm = 'drop-' + pid; render(); return; }
    put('rounds', [withPlayerChanged(r, pid, null)], { action: 'Player dropped out', detail: `${roundName(r)}: ${D.nameOf(pid)}` });
    UI.late = null; UI.confirm = null; toast(`${D.nameOf(pid)} is out`); back();
  },
  'backup-now': () => {
    call({ op: 'backupNow', pin: ORGPIN.pin }).then(res => toast(res.ok ? 'Backup saved' : (res.message || 'Backup failed'))).catch(() => toast('Needs signal to back up'));
  },
  restore: () => {
    let data;
    try { data = JSON.parse(val('restorejson')); } catch (e) { toast('That does not look like an export'); return; }
    if (!data || !data.tables) { toast('That does not look like an export'); return; }
    if (UI.confirm !== 'restore') { UI.confirm = 'restore'; UI.restoreText = val('restorejson'); render(); const el = document.getElementById('restorejson'); if (el) el.value = UI.restoreText; return; }
    UI.confirm = null;
    call({ op: 'restore', pin: ORGPIN.pin, data }).then(res => {
      if (res.ok) { toast(res.restored ? `Put back ${res.restored} ${res.restored === 1 ? 'item' : 'items'}` : 'Nothing was missing'); sync(); } else toast(res.message || 'Not restored');
      render();
    }).catch(() => toast('Needs signal to restore'));
  }
};
ACT['course-fill'] = el => {
  const c = D.course(el.dataset.cid), lib = c && libraryFor(c.name);
  if (!lib) return;
  put('courses', [Object.assign({}, c, { tees: lib.tees, holes: lib.holes, area: c.area || lib.area, about: c.about || lib.about })], { action: 'Course card filled in', detail: `${c.name}: par ${lib.holes.reduce((t, h) => t + h.par, 0)}, ${Object.values(lib.tees).map(t => `${t.name} ${t.slope}/${t.rating}`).join(', ')}` });
  UI.formState = null; render(); toast(`${c.name} card filled in`);
};
ACT['course-add-lib'] = el => {
  const lib = libraryFor(el.dataset.name);
  if (!lib || D.courses().some(c => c.name.toLowerCase() === lib.name.toLowerCase())) return;
  const id = D.course(lib.id) ? lib.id + '-' + Date.now().toString(36).slice(-3) : lib.id;
  put('courses', [Object.assign({}, lib, { id })], { action: 'Course added', detail: `${lib.name} (ready-made card)` });
  render(); toast(`${lib.name} added`);
};
ACT.rejected = () => go('rejected');
ACT['rejected-clear'] = () => { if (UI.confirm !== 'rej-clear') { UI.confirm = 'rej-clear'; render(); return; } UI.confirm = null; clearRejected(); render(); toast('Cleared'); };
Object.assign(ACT, DRAW_ACT, GROUP_ACT);

const FORMS = {
  ask: () => { const i = document.getElementById('askin'); askQuestion(i ? i.value : UI.askDraft); },
  pin: () => {
    const v = val('pin');
    call({ op: 'checkPin', pin: v }).then(res => {
      if (res.ok) { ORGPIN.pin = v; ORGPIN.weak = v === '1234'; UI.orgUnlocked = true; UI.pinError = false; replaceTop('home'); }
      else { UI.pinError = res.locked ? 'Too many wrong PINs. Wait ten minutes and try again.' : 'That PIN did not match.'; render(); const el = document.getElementById('pin'); if (el) el.focus(); }
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
  teamshots: () => {
    const r = D.round(cur().p.rid);
    const out = {};
    for (const g of r.groups || []) {
      const v = val('ts-' + g.id);
      const k = v === '' ? 0 : Number(v);
      if (!(Number.isInteger(k) && k >= 0 && k <= 36)) { UI.formError = `Team ${g.n}: a whole number of shots, 0 to 36.`; render(); return; }
      out[g.id] = k;
    }
    put('settings', [{ key: 'teamshots:' + r.id, value: JSON.stringify(out) }], { action: 'Team shots', detail: `${roundName(r)}: ${(r.groups || []).map(g => `Team ${g.n} ${out[g.id]}`).join(', ')}` });
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
  guest: () => {
    const name = val('g-name');
    const raw = val('g-index').replace(',', '.');
    const plus = raw.startsWith('+');
    const n = Number(raw.replace('+', ''));
    if (!name) { UI.formError = 'Enter a name.'; render(); return; }
    if (raw === '' || !isFinite(n)) { UI.formError = 'Enter their WHS index, like 18.4 or +1.2.'; render(); return; }
    const index = Math.round((plus ? -n : n) * 10) / 10;
    if (index < -10 || index > 54) { UI.formError = 'WHS indexes run from +10.0 to 54.0.'; render(); return; }
    if (D.members().some(x => x.name.toLowerCase() === name.toLowerCase())) { UI.formError = 'Someone already has that name.'; render(); return; }
    const id = 'guest-' + slug(name) + '-' + Date.now().toString(36);
    put('members', [{ id, name, full: 'Guest', index, active: true }], { action: 'Guest added', detail: `${name} (${fmtIndex(index)})` });
    if (UI.draft && !UI.draft.groups && !UI.draft.ids.includes(id)) UI.draft.ids.push(id);
    toast(`${name} added`);
    back();
  },
  newpin: () => {
    const np = val('s-pin');
    if (!/^\d{4,8}$/.test(np)) { toast('Use 4 to 8 digits'); return; }
    call({ op: 'setPin', pin: ORGPIN.pin, newPin: np }).then(res => {
      if (res.ok) { ORGPIN.pin = np; ORGPIN.weak = false; toast('PIN changed'); sync(); } else toast(res.message || 'PIN not changed');
    }).catch(() => toast('Needs signal to change the PIN'));
  }
};

/* ================= Render ================= */
const app = document.getElementById('app');
const tabs = document.getElementById('tabs');

let renderGuard = 0;
function render() {
  if (!DB.loaded && !view().members.length) {
    app.innerHTML = `<div class="loading"><span class="badge crest loading-crest">${CREST_SVG}</span><span class="vh">NCGS</span><p class="sub">${DB.online ? 'Loading' : 'No signal. The app will load when there is.'}</p></div>`;
    tabs.hidden = true;
    return;
  }
  const e = cur();
  let out;
  try {
    out = UI.org ? (UI.orgUnlocked || e.v === 'lock' ? (ORG[e.v] || ORG.home)(e.p || {}) : ORG.lock()) : (VIEWS[e.v] || VIEWS.home)(e.p || {});
  } catch (err) {
    // A screen that cannot be drawn (its round was deleted, the player was moved) steps back one level instead of breaking the app.
    console.warn(err);
    DB.renderFaults = (DB.renderFaults || 0) + 1;
    (DB.faultLog = DB.faultLog || []).push((UI.org ? 'org:' : '') + e.v + ' ' + JSON.stringify(e.p || {}).slice(0, 40) + ' ' + String(err && err.message).slice(0, 80));
    const st = stackOf();
    if (st.length > 1) st.pop(); else { UI.stack = [{ v: 'home', p: {} }]; UI.org = false; }
    UI.confirm = null; UI.holeSheet = false;
    if ((renderGuard || 0) < 4) {
      renderGuard = (renderGuard || 0) + 1;
      try { toast('That screen is not available any more'); render(); } finally { renderGuard -= 1; }
      return;
    }
    UI.stack = [{ v: 'home', p: {} }]; UI.org = false;
    out = VIEWS.home({});
  }
  let overlay = '';
  if (UI.testSheet) {
    const list = Object.entries(FIX.cards).filter(([, c]) => c.nine === UI.testSheet);
    overlay += `<div class="scrim" data-act="sheet-close"><div class="sheet" role="dialog" aria-label="Test cards">
      <div class="nav"><span class="b">Test cards</span><button class="link" data-act="sheet-close">Cancel</button></div>
      ${cardOf(list.map(([k, c]) => `<button class="row" data-act="test-card-pick" data-seg="${UI.testSheet}" data-key="${k}"><span>${esc(c.label)}</span>${chev}</button>`).join(''))}</div></div>`;
  }
  if (UI.fix) overlay += fixSheet();
  if (UI.photoFull) overlay += `<div class="full" data-act="photo-close" role="dialog" aria-label="Card photo"><img src="${UI.photoFull}" alt="Card photo"><button class="link full-close" data-act="photo-close">Close</button></div>`;
  if (UI.shareImg) overlay += `<div class="full" role="dialog" aria-label="Results image"><img src="${UI.shareImg}" alt="Results"><a class="btn dl" href="${UI.shareImg}" download="results.png">Save image</a><button class="link full-close" data-act="share-close">Close</button></div>`;
  const active = document.activeElement;
  const keepFocus = active && active.id && app.contains(active) && /INPUT|TEXTAREA|SELECT/.test(active.tagName) ? active.id : null;
  /* Keep the reader's place when a screen redraws in place (a + or - on the hole screen). Some phones (iOS Safari, and
     the app shown inside another page) can jump to the top when the whole screen's content is swapped, so the scroll
     position is put back unless this redraw asked to go to the top or to the current hole. */
  if (document.activeElement && document.activeElement.tagName === 'BUTTON' && app.contains(document.activeElement)) document.activeElement.blur();   // a focused button that disappears can make iOS scroll
  const sc = scroller(), keepY = !UI.scrollTop && !UI.scrollCur ? sc.scrollTop : null, keepDocY = window.scrollY;
  // Presentation context only: member/organiser surfaces share one identity without changing navigation.
  app.dataset.view = cur().v;
  app.dataset.context = UI.org ? 'organiser' : 'member';
  app.innerHTML = out.html + overlay;
  if (keepY !== null) {
    if (sc.scrollTop !== keepY) sc.scrollTop = keepY;
    if (window.scrollY !== keepDocY) window.scrollTo(0, keepDocY);
    /* iOS can also jump a moment later, when the button that was tapped has gone from the page, so check again
       on the next frame and shortly after. Only if nothing has scrolled since. */
    const back = () => { if (Math.abs(sc.scrollTop - keepY) > 1 && !UI.userScrolled) sc.scrollTop = keepY; };
    UI.userScrolled = false;
    requestAnimationFrame(back); setTimeout(back, 60); setTimeout(back, 250);
  }
  if (keepFocus) { const el = document.getElementById(keepFocus); if (el) el.focus(); }
  /* The tab bar only shows while a round is in play (live, or booked for today). The rest of the time Home is the hub. */
  const inPlay = D.rounds().some(r => r.status === 'live' || (r.status === 'upcoming' && r.date && daysFromToday(r.date) === 0));
  const showTabs = !UI.org && !!out.tabs && inPlay;
  // A finalisation/sync can remove the bar while a tab is still open. Keep a way out without
  // changing the route, draft, queue or rejected saves. Existing page/dialog returns stay in charge.
  if (!showTabs && !UI.org && cur().v !== 'home' &&
      !app.querySelector('[data-act="back"], [data-act="entry-back"], [data-act="home"], .scrim, .full')) {
    app.insertAdjacentHTML('afterbegin', `<div class="context-return">${navBack(backLabel())}</div>`);
  }
  app.classList.toggle('no-tabs', !showTabs);
  tabs.hidden = !showTabs;
  tabs.classList.toggle('under', !!app.querySelector('.scrim, .full'));
  if (showTabs) document.documentElement.style.setProperty('--tabh', (tabs.offsetHeight + parseFloat(getComputedStyle(tabs).bottom || 0) || tabs.offsetHeight) + 'px');
  sizeAsk();
  fitNames();
  /* The Hole tab names the hole this player's group is on: "Hole 3", or "Card" once all 18 are in. */
  if (showTabs) {
    let lbl = 'Hole';
    try {
      const rid = playRid() || liveRid(), mine = rid && myGroup(rid), comp = mine && progressOf(rid);
      const gc = comp && comp.groups.find(g => g.id === mine.id);
      if (gc) lbl = gc.nextHole ? `Hole ${gc.nextHole}` : isScramble(D.round(rid)) ? 'Team' : 'Card';
    } catch (e) { /* keep "Hole" */ }
    const span = tabs.querySelector('.tab[data-tab="hole"] span');
    if (span && span.textContent !== lbl) span.textContent = lbl;
  }
  tabs.querySelectorAll('.tab').forEach(b => {
    const on = b.dataset.tab === out.tabs;
    b.classList.toggle('on', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  if (UI.scrollCur) { UI.scrollCur = false; const c = document.getElementById('cur'); if (c) c.scrollIntoView({ block: 'center' }); else scroller().scrollTop = 0; }
  else if (UI.scrollTop) { UI.scrollTop = false; scroller().scrollTop = 0; }
  renderToast();
  syncHistory();
}

/* The phone's own Back (swipe from the left edge on iPhone, the back button on Android) steps back one screen, like the Back buttons do.
   The browser history is kept the same depth as the screens we have open. */
let histDepth = 0, histBusy = false;
const navDepth = () => (UI.stack.length - 1) + (UI.org ? UI.orgStack.length : 0);
function syncHistory() {
  try {
    const d = navDepth();
    if (d > histDepth) { while (histDepth < d) { histDepth++; history.pushState({ d: histDepth }, ''); } }
    else if (d < histDepth) { const n = histDepth - d; histDepth = d; histBusy = true; setTimeout(() => { histBusy = false; }, 500); history.go(-n); }
  } catch (e) { /* history not available: the Back buttons still work */ }
}
window.addEventListener('popstate', e => {
  if (histBusy) { histBusy = false; return; }
  const d = e.state && typeof e.state.d === 'number' ? e.state.d : 0;
  histDepth = d;
  while (navDepth() > d) {
    if (UI.org) { if (UI.orgStack.length > 1) UI.orgStack.pop(); else UI.org = false; }
    else if (UI.stack.length > 1) UI.stack.pop();
    else break;
  }
  UI.contestSheet = false; UI.holeSheet = false; UI.confirm = null; UI.formError = null; UI.scrollTop = true;
  render();
});
try { history.replaceState({ d: 0 }, ''); } catch (e) { /* ignore */ }
function renderToast() {
  let el = document.getElementById('toast');
  if (!UI.toast) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = UI.toast;
}

tabs.innerHTML = [['home', 'Home'], ['hole', 'Hole'], ['board', 'Results'], ['rules', 'Ruling']]
  .map(([k, l]) => `<button class="tab" data-act="tab" data-tab="${k}">${TABICON[k]}<span>${l}</span></button>`).join('');

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'FORM') return;
  // a plain link inside a tappable area (the official rule page in the rule pop-up) opens as a link
  const a = e.target.closest('a[href]'); if (a && el.contains(a) && !a.dataset.act) return;
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
document.addEventListener('input', e => { if (e.target && e.target.id === 'askin') { UI.askDraft = e.target.value; growAsk(e.target); } });
// In the question box, Return sends; Shift+Return is a new line.
document.addEventListener('keydown', e => { if (e.target && e.target.id === 'askin' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); askQuestion(e.target.value); } });
// While typing a question the tab bar steps aside and the ask bar rides above the keyboard.
function placeAskBar() {
  const vv = window.visualViewport;
  const kb = vv ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0;
  document.documentElement.style.setProperty('--kb', kb + 'px');
}
document.addEventListener('focusin', e => { if (e.target && e.target.id === 'askin') { document.body.classList.add('typing'); placeAskBar(); setTimeout(() => { const s = scroller(); s.scrollTop = s.scrollHeight; }, 250); } });
document.addEventListener('focusout', e => {
  if (!e.target || e.target.id !== 'askin') return;
  setTimeout(() => { if (document.activeElement && document.activeElement.id === 'askin') return; document.body.classList.remove('typing'); document.documentElement.style.setProperty('--kb', '0px'); }, 150);
});
// With a mouse, clicking Send or the microphone must not take focus from the box. (Never on touch: stopping touchstart would swallow the tap on a phone.)
document.addEventListener('mousedown', e => { if (e.target.closest && e.target.closest('.askbar .send, .askbar .mic, .askbar .stop, .askbar .x')) e.preventDefault(); });
if (window.visualViewport) { window.visualViewport.addEventListener('resize', placeAskBar); window.visualViewport.addEventListener('scroll', placeAskBar); }
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset && t.dataset.change === 'grp-start') { grStart(t.dataset.rid, Number(t.dataset.gi), Number(t.value)); return; }
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
  const every = liveRid() ? 15000 : drawLive() ? 8000 : 60000;
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

/* Pull down to refresh. A phone's home-screen app has no built-in pull-to-refresh, so this one fetches the latest scores,
   sends anything waiting to go, and reloads if a newer version of the app has been published.
   The page slides down to show "Pull to refresh" in the gap, the way a native list does. */
(function pullToRefresh() {
  const standalone = window.navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.NCGS_FORCE_PTR;
  if (!standalone) return;   // in the browser the browser does it
  const ind = document.createElement('div');
  ind.id = 'ptr'; ind.setAttribute('aria-hidden', 'true');
  ind.innerHTML = '<span class="ptr-ring"></span><span class="ptr-txt">Pull to refresh</span>';
  document.body.appendChild(ind);
  const ring = ind.firstChild, txt = ind.lastChild, page = document.getElementById('app');
  const GO = 70, HOLD = 64;
  let y0 = null, p = 0, busy = false;
  const blocked = t => UI.fix || UI.contestSheet || UI.testSheet || UI.photoFull || UI.shareImg || (t && t.closest && t.closest('input,textarea,select'));
  const lay = (dist, animate) => {
    page.style.transition = animate ? 'transform .25s ease-out' : 'none';
    page.style.transform = dist > 0 ? `translateY(${dist}px)` : '';
    ind.style.display = dist > 0 || busy ? 'flex' : 'none';
    ind.style.opacity = String(Math.min(1, dist / 36));
    if (!busy) { ring.style.transform = `rotate(${dist * 6}deg)`; txt.textContent = dist >= GO ? 'Release to refresh' : 'Pull to refresh'; }
  };
  document.addEventListener('touchstart', e => {
    if (busy || e.touches.length !== 1 || scroller().scrollTop > 0 || blocked(e.target)) { y0 = null; return; }
    y0 = e.touches[0].clientY; p = 0;
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (y0 === null) return;
    const dy = e.touches[0].clientY - y0;
    if (scroller().scrollTop > 0 || dy <= 0) { if (p) { p = 0; lay(0, false); } if (dy <= 0) y0 = e.touches[0].clientY; return; }
    p = Math.min(110, dy * 0.55);
    if (e.cancelable) e.preventDefault();   // no native bounce while we show the gap
    lay(p, false);
  }, { passive: false });
  const done = () => { busy = false; ind.classList.remove('spin'); lay(0, true); setTimeout(() => { if (!busy) ind.style.display = 'none'; }, 260); };
  const end = () => {
    if (y0 === null) return;
    y0 = null;
    if (p < GO) { p = 0; lay(0, true); return; }
    p = 0; busy = true; ind.classList.add('spin'); txt.textContent = 'Refreshing'; ring.style.transform = '';
    lay(HOLD, true);
    const minimum = new Promise(r => setTimeout(r, 800));
    Promise.all([flush().then(() => sync()).catch(() => {}), minimum]).then(async () => {
      let newer = false;
      if (BOOT.mode === 'live' && BOOT.version) {
        try { const t = await (await fetch('sw.js?' + Date.now(), { cache: 'no-store' })).text(); const m = /ncgs-(\d+)/.exec(t); newer = !!(m && m[1] !== BOOT.version); } catch (x) { /* offline */ }
      }
      if (newer) { location.reload(); return; }
      done();
      toast(DB.online ? 'Up to date' : 'No signal. Showing the last scores this phone saw.');
    });
  };
  document.addEventListener('touchend', end, { passive: true });
  document.addEventListener('touchcancel', () => { if (!busy) { y0 = null; p = 0; lay(0, true); } }, { passive: true });
})();

/* Open where the phone left off: in the round if one is live and this phone is playing. */
(function start() {
  const rid = liveRid();
  if (rid && DB.prefs.me && myGroup(rid)) { UI.playRid = rid; UI.stack = [{ v: 'home', p: {} }, { v: 'round', p: { rid } }, { v: playHomeView(rid), p: { rid } }]; }
  render();
  sync().then(() => flush());
})();
if ('serviceWorker' in navigator && BOOT.mode === 'live' && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
window.__ncgs = { DB, UI, D, view, sync, flush, render, put, ORGPIN, resultsOf, goy, seasonOf, fmtDate, daysFromToday, todayIso, send, holeOf, computeR, myGroup, liveRid, refreshThread };

/* A finger or wheel scroll after a redraw means the reader moved on purpose, so render() stops putting the old position back. */
['touchmove', 'wheel'].forEach(t => app.addEventListener(t, () => { UI.userScrolled = true; }, { passive: true }));
