/* ================= PLAYING A ROUND ================= */
const playRid = () => (cur().p && cur().p.rid) || UI.playRid || liveRid();
const holeOf = (rid, n) => holesOf(D.round(rid))[n - 1];
const FIX = window.TRIP_CARD_FIXTURES || { cards: {} };
let sampleFn = null;
let canReadImages = false;
let downloads = null;

function playHomeView(rid) {
  const g = myGroup(rid);
  const comp = computeR(rid);
  if (!g || !comp) return 'round';
  const gc = comp.groups.find(x => x.id === g.id);
  return gc.nextHole || askPending(rid, gc, g.id) ? 'tee' : 'finish';
}

/* ----- Contests: nearest the pin and longest drive -----
   Once a group has scored a contest hole it must say who got it, or Nobody, before it can play on. */
const contestKey = (rid, gid, n) => `${rid}|${gid}|${n}`;
function askPending(rid, gc, gid) {
  const r = D.round(rid);
  if (!r || r.status !== 'live' || !gc) return null;
  const done = DB.prefs.askDone || {};
  for (const c of (r.contests || []).slice().sort((a, b) => a.hole - b.hole)) {
    if (!gc.holes[c.hole] || !gc.holes[c.hole].complete) continue;
    if ((D.claims(rid)[c.hole] || []).some(x => x.gid === gid) || done[contestKey(rid, gid, c.hole)]) continue;
    return c;
  }
  return null;
}
const contestVerb = c => (c.type === 'ld' ? 'drive further than' : 'get closer than');
function contestBoardLine(rid, c, gid) {
  const lead = claimLeader(rid, c.hole, gid);
  return lead ? `${D.nameOf(lead.pid)} from Group ${groupNo(rid, lead.gid)} is on the board.` : 'Nobody is on the board yet.';
}
VIEWS.ask = (rid, gc, c) => {
  const lead = claimLeader(rid, c.hole, gc.id);
  const key = contestKey(rid, gc.id, c.hole);
  const pick = UI.askPick && UI.askPick.key === key ? UI.askPick.v : null;
  const q = lead ? `Did anyone ${contestVerb(c)} ${esc(D.nameOf(lead.pid))}?` : c.type === 'ld' ? 'Who hit the longest drive?' : 'Who got closest?';
  const opts = gc.teams.flat().map(pid => [pid, D.nameOf(pid)]).concat([[E.NOBODY, 'Nobody']]);
  return {
    tabs: 'hole',
    html: `<div class="after ask"><header class="hero c pine entcard"><div class="entrow"><div class="entl"><small>HOLE</small><b class="entn">${c.hole}</b></div><div class="entr"><span class="savedchip">${sized(ICON.check, 18)} Scores saved</span></div></div></header>
      <p class="askkind">${CONTEST[c.type].toUpperCase()}</p>
      <h2 class="askq">${q}</h2>
      <p class="sub asksub">${lead ? `${esc(contestBoardLine(rid, c, gc.id))} Pick who in your group ${c.type === 'ld' ? 'went further' : 'beat it'}, or Nobody.` : 'Pick who in your group got it, or Nobody.'}</p>
      <div class="askrows" role="radiogroup" aria-label="${CONTEST[c.type]}">${opts.map(([v, nm]) => `<button class="askrow${pick === v ? ' on' : ''}" role="radio" aria-checked="${pick === v}" data-act="ask-pick" data-v="${esc(v)}" data-key="${esc(key)}"><span>${esc(nm)}</span><i class="askdot"></i></button>`).join('')}</div>
      <button class="btn" data-act="ask-confirm" data-n="${c.hole}"${pick ? '' : ' disabled'}>Confirm</button>${saveWarning()}</div>`
  };
};
function contestTag(rid, gc, n) {
  const c = contestOn(rid, n);
  if (!c) return '';
  const done = (D.claims(rid)[n] || []).some(x => x.gid === gc.id);
  return `<span class="hs-tag${done ? ' ok' : ''}">${c.type === 'ld' ? 'Drive' : 'Pin'}${done ? ' ✓' : ''}</span>`;
}
function contestIntro(rid, gc, n) {
  const c = contestOn(rid, n);
  const seen = DB.prefs.intro || {};
  if (!c || seen[contestKey(rid, gc.id, n)]) return '';
  const h = holeOf(rid, n);
  const ld = c.type === 'ld';
  const lead = claimLeader(rid, n, gc.id);
  /* Fade in once. Later redraws (a sync from another phone) must not replay the fade, or the card flickers. */
  const key = contestKey(rid, gc.id, n), first = UI.introShown !== key; UI.introShown = key;
  return `<div class="scrim intro${first ? '' : ' still'}" data-act="intro-scrim"><div class="sheet introcard${first ? '' : ' still'}" role="dialog" aria-label="${CONTEST[c.type]}, hole ${n}">
    <span class="introflag">${sized(ICON.flagpin, 34)}</span>
    <div class="introkind">${CONTEST[c.type].toUpperCase()}</div>
    <div class="introhole">Hole ${n}</div>
    <p class="introrule">Par ${h.par}${h.yards ? ` · ${h.yards} yds` : ''}. ${ld ? 'Longest drive wins.' : 'Closest to the pin wins.'}</p>
    <p class="introboard">${lead ? `${esc(contestBoardLine(rid, c, gc.id))}<br>${ld ? 'Go further to take it.' : 'Get closer to take it.'}` : 'Nobody is on the board yet.<br>Be the first.'}</p>
    <button class="btn" data-act="intro-go" data-n="${n}">Let's play</button></div></div>`;
}
function myConflicts(rid, gid) { return DB.conflicts.filter(c => c.round === rid && c.grp === gid); }

/* The Hole tab goes straight to entering the scores for the next hole. Anything that needs attention (a card photo to check,
   a hole saved on two phones) shows under the players on that screen. */
VIEWS.tee = () => {
  const rid = playRid();
  const comp = computeR(rid);
  const g = myGroup(rid);
  if (!comp || !g) return VIEWS.round({ rid });
  const gc = comp.groups.find(x => x.id === g.id);
  const ask0 = askPending(rid, gc, g.id);
  if (ask0) return VIEWS.ask(rid, gc, ask0);
  if (!gc.nextHole) return VIEWS.finish();
  // Stay on the hole being scored while this phone is still working on it, even if another phone saved it meanwhile
  const t = UI.teeHole, dr = ((DB.prefs.drafts[rid] || {})[g.id] || {})[t];
  const mine = t && gc.holes[t] && (!gc.holes[t].complete || (dr && Object.keys(dr).some(k => k[0] !== '_')));
  UI.hole = UI.teeHole = mine ? t : gc.nextHole;
  UI.edit = false;
  return VIEWS.entry();
};
function needsAttention(rid, gc, gid) {
  const checkRows = ['front', 'back'].filter(sg => nineComplete(gc, sg)).map(sg => {
    const c = D.check(rid, gid, sg);
    return c && c.resolved ? '' : checkRow(sg, c);
  }).join('');
  const clash = myConflicts(rid, gid);
  const clashRows = [...new Set(clash.map(c => c.hole))].map(hn => `<button class="row" data-act="conflict" data-n="${hn}"><span>Hole ${hn}</span><span class="right"><span class="pill w">Saved on two phones</span>${chev}</span></button>`).join('');
  return (clashRows ? sec('', cardOf(clashRows), true) : '') + (checkRows ? sec(label('Scorecard'), cardOf(checkRows)) : '');
}
// "Go to hole": every hole at once. Scored holes are filled, the next one to play is ringed, the one on screen is outlined.
function holesSheet(rid, gc, here) {
  if (!UI.holeSheet) return '';
  const seg = (name, list) => `<div class="hs-lab">${name}</div><div class="hs-grid">${list.map(n => {
    const hr = gc.holes[n], next = n === gc.nextHole;
    return `<button class="hs${hr.complete ? ' done' : ''}${next ? ' nxt' : ''}${n === here ? ' here' : ''}" data-act="goto-hole" data-n="${n}" aria-label="Hole ${n}${contestOn(rid, n) ? ', ' + CONTEST[contestOn(rid, n).type].toLowerCase() : ''}${hr.complete ? ', scored. Tap to change it' : next ? ', next to play' : ''}">${n}${contestTag(rid, gc, n)}</button>`;
  }).join('')}</div>`;
  return `<div class="scrim" data-act="holes-scrim"><div class="sheet hs-sheet" role="dialog" aria-label="Go to a hole">
    <div class="nav"><span class="b">Go to hole</span><button class="link" data-act="holes-close">Done</button></div>
    ${seg('Front nine', E.SEGMENTS.front)}${seg('Back nine', E.SEGMENTS.back)}
    <div class="cap hs-key"><span class="hs-ki"><i class="hs-k done"></i>Scored</span><span class="hs-ki"><i class="hs-k nxt"></i>Next to play</span>${(D.round(rid).contests || []).length ? '<span class="hs-ki"><b class="hs-tag">Pin</b><b class="hs-tag">Drive</b>Contest hole</span>' : ''}<span class="hs-tip">Tap a scored hole to change it.</span></div></div></div>`;
}
function saveWarning() {
  if (!DB.saveOk) return '<p class="err" style="text-align:center">This phone is not saving. Keep this screen open.</p>';
  if (DB.outbox.length && !DB.online) return `<p class="cap" style="text-align:center;margin-top:12px">No signal · ${plural(DB.outbox.filter(i => i.req.op === 'saveHole').length || DB.outbox.length, 'save')} waiting on this phone</p>`;
  return '';
}

/* ----- Score entry (also used by the organiser to correct a hole) ----- */
function entryCtx() {
  if (UI.org) { const p = cur().p; return { rid: p.rid, gid: p.gid, n: p.n, mode: 'org', edit: true, dkey: 'org-' + p.gid }; }
  const rid = playRid();
  const g = myGroup(rid);
  return { rid, gid: g.id, n: UI.hole, mode: 'player', edit: UI.edit, dkey: g.id };
}
function draftsFor(ctx) {
  const byRound = DB.prefs.drafts[ctx.rid] || (DB.prefs.drafts[ctx.rid] = {});
  return byRound[ctx.dkey] || (byRound[ctx.dkey] = {});
}
function ensureDraft(ctx) {
  const byGroup = draftsFor(ctx);
  if (!byGroup[ctx.n]) {
    const d = {};
    const gc = computeR(ctx.rid).groups.find(x => x.id === ctx.gid);
    if (ctx.edit) {
      gc.teams.flat().forEach(pid => {
        const v = (D.scores(ctx.rid)[pid] || {})[ctx.n];
        if (E.isEntered(v)) d[pid] = v;
      });
    }
    d._base = Object.fromEntries(gc.teams.flat().map(pid => { const v = (D.scores(ctx.rid)[pid] || {})[ctx.n]; return [pid, v === undefined ? null : v]; }));
    byGroup[ctx.n] = d;
  }
  return byGroup[ctx.n];
}
function clearDraft(ctx) { const byGroup = draftsFor(ctx); delete byGroup[ctx.n]; }

function entryRow(pid, val, shots, par, rid) {
  const name = esc(D.nameOf(pid));
  const dkey = `bd-${rid}-${pid}`, dopen = !!UI.open[dkey];
  const dcomp = computeR(rid), dpl = dcomp && dcomp.players[pid];
  const puN = E.pickupStrokes(par, shots);
  const flash = UI.flash && !E.isEntered(val) ? ' flash' : '';
  const num = Number.isInteger(val);
  const pts = val === 'P' ? 0 : num ? E.stablefordPoints(val, par, shots) : null;
  const scratch = pts === 0;
  const shown = val === 'P' ? puN : val;
  const word = scratch ? 'Scratch' : num ? E.scoreName(val, par) : '';
  // The first tap on either button lands on par, then the buttons move one stroke at a time. Reaching 0 points is a pick-up, and + stops there.
  const base = Number.isInteger(shown) ? shown : null;
  const up = base === null ? par : (base + 1 >= puN ? 'P' : base + 1), down = base === null ? par : Math.max(1, base - 1);
  const atOne = base !== null && base <= 1;
  const mid = base === null
    ? `<div class="stv none" data-pid="${pid}" data-n="" aria-live="polite">Par ${par}</div>`
    : `<button class="stv${scratch ? ' out' : ''}" data-act="clear" data-pid="${pid}" data-n="${base}" aria-label="${name}: ${base} strokes. Tap to clear and start again from par"><b${base > 99 ? ' class="wide"' : ''}>${base}<sup>${pts}</sup></b><small>${word}</small></button>`;
  const drop = dopen && dpl ? `<div class="dropcard in"><p class="cap dropwho">${name}</p>${cardParts(D.round(rid), dpl, D.round(rid).status === 'live' && !!myGroup(rid) && myGroup(rid).teams.flat().includes(pid), pid).table}<p class="cap sc-note">Tap a score to change it</p></div>` : '';
  const tile = `<div class="pr ptile${flash}">
    <div class="pr-top"><button class="nm drop${dopen ? ' open' : ''}" data-act="toggle" data-key="${dkey}" aria-expanded="${dopen}"><span class="nmrow"><span>${name}</span>${dpl ? dropChev : ''}</span><span class="pr-dots" role="img" aria-label="${shots} ${shots === 1 ? 'shot' : 'shots'}">${dots(shots, true)}</span></button>
      <button class="pu ${scratch ? 'on' : ''}" data-act="set" data-pid="${pid}" data-v="P" aria-pressed="${scratch}">Pick up</button></div>
    <div class="stepper" role="group" aria-label="Strokes for ${name}">
      ${mid}
      <button class="st" data-act="set" data-dir="down" data-pid="${pid}" data-v="${down}" aria-label="One fewer stroke for ${name}"${atOne ? ' disabled' : ''}>\u2212</button>
      <button class="st" data-act="set" data-dir="up" data-pid="${pid}" data-v="${up}" aria-label="One more stroke for ${name}"${scratch ? ' disabled' : ''}>+</button>
    </div></div>`;
  return { tile, drop };
}

/* A name that does not fit beside Pick up and the buttons gets a line of its own, with the buttons below it.
   Every row is first laid out the usual way, then only the ones whose name or arrow would reach a button beside it
   are marked "long". */
function fitNames() {
  const tiles = [...document.querySelectorAll('.entry .bugs .ptile')];
  if (!tiles.length) return;
  tiles.forEach(t => t.classList.remove('long'));
  const runsOver = t => {
    const nm = t.querySelector('.nm'); if (!nm) return false;
    const box = nm.getBoundingClientRect();
    const end = Math.max(...[...nm.querySelectorAll('.nmrow > *')].map(e => e.getBoundingClientRect().right));
    return [...t.querySelectorAll('.pu, .st, .stv')].some(c => { const r = c.getBoundingClientRect(); return r.left > box.left && r.top < box.bottom && r.bottom > box.top && end > r.left; });
  };
  tiles.filter(runsOver).forEach(t => t.classList.add('long'));
}
window.addEventListener('resize', fitNames);
/* A text size change does not always send "resize" (docs/NAME-RESIZE.md), so an invisible 1rem × 1em box is watched
   instead: when it changes size, the text size changed, and the rows are measured again at once. fitNames() never
   changes this box, so it cannot loop. */
if (window.ResizeObserver) {
  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:fixed;top:0;left:0;width:1rem;height:1em;visibility:hidden;pointer-events:none;';
  document.body.appendChild(probe);
  let last = '';
  new ResizeObserver(() => {
    const size = probe.offsetWidth + 'x' + probe.offsetHeight;
    if (size !== last) { const first = !last; last = size; if (!first) fitNames(); }
  }).observe(probe);
}

VIEWS.entry = () => {
  const ctx = entryCtx();
  const comp = computeR(ctx.rid);
  const gc = comp.groups.find(x => x.id === ctx.gid);
  const h = holeOf(ctx.rid, ctx.n);
  const d = ensureDraft(ctx);
  const pids = gc.teams.flat();
  if (ctx.mode === 'player' && !ctx.edit) { const ask = askPending(ctx.rid, gc, ctx.gid); if (ask) return VIEWS.ask(ctx.rid, gc, ask); }
  const missing = pids.filter(pid => !E.isEntered(d[pid]));
  const final = D.round(ctx.rid).status === 'final';
  const buggies = gc.teams.length === 2;
  let html = '<div class="entry">';
  if (ctx.mode === 'org') html += `<p class="cap">Correcting group ${gc.n}</p>`;
  const tt = ((D.round(ctx.rid).groups || []).find(x => x.id === ctx.gid) || {}).teeTime;
  if (ctx.mode === 'org') html += `<div class="entnav"><button class="entback" data-act="entry-back" aria-label="Back">${ICON.back}<span>Back</span></button>${tt ? `<span class="entgrp">${esc(tt)} group</span>` : ''}</div>`;
  html += `<header class="hero c pine entcard"><div class="entrow"><div class="entl"><small>HOLE</small>${ctx.mode === 'org' ? `<b class="entn">${ctx.n}</b>` : `<button class="holebtn" data-act="holes" aria-label="Go to a hole. Now on hole ${ctx.n}"><b class="entn">${ctx.n}</b><span class="hdown">${ICON.down}</span></button>`}</div><div class="entr"><b>Par ${h.par}</b><span>Index ${h.si}${h.yards ? ` · ${h.yards} yds` : ''}</span></div></div><div class="prog" role="img" aria-label="Hole ${ctx.n} of 18">${Array.from({ length: 18 }, (_, i) => i + 1).map(n => `<i class="${n === ctx.n ? 'cur' : n < ctx.n ? 'done' : ''}"></i>`).join('')}</div></header>`;
  if (final) html += `<div class="banner" style="margin-top:12px">This round is final.</div>${ctx.mode === 'org' ? '<button class="btn quiet" data-act="reopen">Reopen round</button>' : ''}`;
  const clash = DB.conflicts.filter(c => c.round === ctx.rid && c.grp === ctx.gid && c.hole === ctx.n);
  if (clash.length) html += `<div class="banner" style="margin-top:12px">Another phone saved ${clash.map(c => `${esc(D.nameOf(c.player))} ${fmtGross(c.server)}`).join(', ')}</div>`;
  html += gc.teams.map((t, i) => {
    const rows = t.map(pid => entryRow(pid, d[pid], comp.players[pid].holes[ctx.n].shots, h.par, ctx.rid));
    return `<div class="bugs ${buggies ? 'b' + (i + 1) : 'b0'}"${buggies ? ` role="group" aria-label="Buggy ${i + 1}"` : ''}>${rows.map(r => r.tile + r.drop).join('')}</div>`;
  }).join('');
  if (ctx.mode === 'player' && !ctx.edit) html += needsAttention(ctx.rid, gc, ctx.gid);
  const who = missing.length && missing.length <= 2 ? ' · ' + missing.map(D.nameOf).join(', ') : '';
  const lbl = missing.length ? `${plural(missing.length, 'score')} to go${esc(who)}` : ctx.mode === 'org' ? 'Save correction' : ctx.edit ? 'Save changes' : `Save hole ${ctx.n}`;
  html += `<div class="savebar"><button class="btn ${missing.length ? 'quiet' : ''}" data-act="save">${lbl}</button></div></div>`;
  if (ctx.mode === 'player') html += holesSheet(ctx.rid, gc, ctx.n);
  if (ctx.mode === 'player' && !ctx.edit && !UI.holeSheet && !gc.holes[ctx.n].complete && D.round(ctx.rid).status === 'live') html += contestIntro(ctx.rid, gc, ctx.n);
  return ctx.mode === 'player' ? { html, tabs: 'hole' } : { html };
};

function setScore(pid, v) {
  const ctx = entryCtx();
  if (D.round(ctx.rid).status === 'final') { toast('This round is final. Reopen it to change scores.'); return; }
  const d = ensureDraft(ctx);
  const val = v === 'P' ? 'P' : Number(v);
  if (d[pid] === val) delete d[pid]; else d[pid] = val;
  savePrefs();
  render();
}

// Tap the big number to wipe an entry and go back to "Par n".
function clearScore(pid) {
  const ctx = entryCtx();
  if (D.round(ctx.rid).status === 'final') return;
  delete ensureDraft(ctx)[pid];
  savePrefs();
  render();
}

function saveHole() {
  const ctx = entryCtx();
  const r = D.round(ctx.rid);
  const comp = computeR(ctx.rid);
  const gc = comp.groups.find(x => x.id === ctx.gid);
  const d = ensureDraft(ctx);
  const pids = gc.teams.flat();
  const missing = pids.filter(pid => !E.isEntered(d[pid]));
  if (missing.length) { UI.flash = true; render(); setTimeout(() => { UI.flash = false; }, 1300); return; }
  if (r.status === 'final') { toast('This round is final. Reopen it to change scores.'); return; }
  const before = {};
  ['front', 'back', 'overall'].forEach(s => { before[s] = { text: gc.matches[s].status.text, leader: gc.matches[s].status.leader }; });
  const prev = {};
  const scores = {};
  pids.forEach(pid => {
    const cur = (D.scores(ctx.rid)[pid] || {})[ctx.n];
    prev[pid] = cur === undefined ? null : cur;
    const clash = DB.conflicts.find(c => c.round === ctx.rid && c.grp === ctx.gid && c.hole === ctx.n && c.player === pid);
    const seen = d._base && pid in d._base ? d._base[pid] : prev[pid];
    scores[pid] = { v: d[pid], base: clash ? clash.server : seen };
  });
  const req = {
    op: 'saveHole', round: ctx.rid, grp: ctx.gid, hole: ctx.n, scores, by: ctx.mode === 'org' ? 'Organiser' : byMe(),
    names: Object.fromEntries(pids.map(pid => [pid, D.nameOf(pid)])), label: `${roundName(r)} · Group ${gc.n} · Hole ${ctx.n}`
  };
  if (ctx.mode === 'org') req.pin = ORGPIN.pin;
  DB.conflicts = DB.conflicts.filter(c => !(c.round === ctx.rid && c.grp === ctx.gid && c.hole === ctx.n));
  const draftCopy = clone(d);
  clearDraft(ctx);
  savePrefs();
  send(req);
  tick();
  if (ctx.mode === 'org') { back(); toast(`Hole ${ctx.n} saved`); return; }
  if (ctx.edit) {
    // A past hole was corrected: straight back to the hole being played.
    UI.edit = false; UI.after = null;
    replaceTop('tee', { rid: ctx.rid });
    toast(`Hole ${ctx.n} changed`);
    return;
  }
  UI.after = { rid: ctx.rid, gid: ctx.gid, n: ctx.n, before, prev, draft: draftCopy, wasEdit: ctx.edit };
  UI.edit = false;
  replaceTop('after', { rid: ctx.rid });
}

function undoSave() {
  const a = UI.after;
  if (!a) return;
  const scores = {};
  Object.keys(a.prev).forEach(pid => { scores[pid] = { v: a.prev[pid], base: a.draft[pid] }; });
  const req = { op: 'saveHole', round: a.rid, grp: a.gid, hole: a.n, scores, by: byMe(), names: Object.fromEntries(Object.keys(a.prev).map(pid => [pid, D.nameOf(pid)])), label: `Undo · Hole ${a.n}` };
  send(req);
  const byRound = DB.prefs.drafts[a.rid] || (DB.prefs.drafts[a.rid] = {});
  (byRound[a.gid] || (byRound[a.gid] = {}))[a.n] = a.draft;
  savePrefs();
  UI.hole = a.n;
  UI.edit = a.wasEdit;
  UI.after = null;
  replaceTop('entry', { rid: a.rid });
}

/* One Buggy Wars result pill: the leader's colour, golf wording, "3 up, 4 to play" while it is being played.
   Shared by the Buggy Wars results and the screen after saving a hole, so the two look the same. */
function bwPill(gc, m) {
  const st = m.status;
  let txt;
  if (st.state === 'pending') txt = 'Not started';
  else if (st.state === 'halved') txt = 'Halved';
  else if (st.state === 'won') txt = m.closed && m.closed.toPlay > 0 ? `Won ${m.closed.up}&${m.closed.toPlay}` : `Won ${Math.abs(m.lead)} up`;
  else txt = `${m.lead === 0 ? 'AS' : Math.abs(m.lead) + ' up'}, ${st.toPlay} to play`;
  const cls = st.leader === 'A' ? 'a' : st.leader === 'B' ? 'b' : 'n';
  const who = st.leader ? `${gc.labels[st.leader === 'A' ? 0 : 1].long} ` : '';
  return `<span class="bw-res ${cls}" aria-label="${esc(who + txt)}">${txt}</span>`;
}
/* A nine's holes as a small grid: one column per hole, each buggy's best points, the hole winner's filled in their
   colour, then holes won. Shared by the Buggy Wars results and the card after saving a hole. */
function bwBoard(gc, seg, live, canEdit) {
  const order = gc.matches[seg].order;
  let wa = 0, wb = 0;
  const cols = order.map(n => {
    const hr = gc.holes[n];
    const isNow = n === gc.nextHole && live;
    let a = '<span class="bw-c e"></span>', b = '<span class="bw-c e"></span>';
    if (hr.complete) {
      const [pa, pb] = hr.best;
      if (hr.result === 'A') wa++; else if (hr.result === 'B') wb++;
      a = `<span class="bw-c${hr.result === 'A' ? ' wa' : ''}">${pa}</span>`;
      b = `<span class="bw-c${hr.result === 'B' ? ' wb' : ''}">${pb}</span>`;
    }
    const inner = `<span class="bw-n${isNow ? ' cur' : ''}">${n}</span>${a}${b}`;
    return canEdit && hr.complete ? `<button class="bw-col" data-act="edit-hole" data-n="${n}" aria-label="Change hole ${n}">${inner}</button>` : `<div class="bw-col">${inner}</div>`;
  }).join('');
  return `<div class="bw-board">${cols}<div class="bw-col bw-tot"><span class="bw-n">Holes</span><span class="bw-t a">${wa}</span><span class="bw-t b">${wb}</span></div></div>`;
}
/* The two pairs as initials badges, blue v red. */
const bwBadges = (t, i) => `<span class="bw-pair">${t.map(pid => `<span class="bw-bd ${i ? 'b' : 'a'}" aria-label="${esc(D.nameOf(pid))}">${esc(initialsOf(D.member(pid)) || D.nameOf(pid).slice(0, 2))}</span>`).join('')}</span>`;

VIEWS.after = () => {
  const a = UI.after;
  if (!a) return VIEWS[playHomeView(playRid())]({ rid: playRid() });
  const comp = computeR(a.rid);
  const gc = comp.groups.find(x => x.id === a.gid);
  const ask1 = askPending(a.rid, gc, a.gid);
  if (ask1) return VIEWS.ask(a.rid, gc, ask1);
  const hr = gc.holes[a.n];
  const L = gc.labels;
  const who = list => list.map(D.nameOf).join(' and ');
  const buggies = gc.teams.length === 2;
  let head, sub = '';
  if (!buggies) head = `<span class="res-t">Hole ${a.n} saved</span>`;
  else if (hr.result === 'H') { head = `<span class="bw-res n">Halved</span>`; sub = `Both buggies scored ${plural(hr.best[0], 'point')}`; }
  else {
    const w = hr.result === 'A' ? 0 : 1;
    head = `<span class="bw-res ${w ? 'b' : 'a'}" aria-label="${esc(L[w].long)} won the hole">Buggy ${w + 1} won</span>`;
    sub = `${who(hr.counting[w])}'s ${plural(hr.best[w], 'point')} beat ${hr.best[1 - w]}`;
  }
  // One line per match, in the Buggy Wars style: the label on the left, the same result pill as the results page on the
  // right. A note under the label only when something changed hands: someone takes the lead, or it comes back to all square.
  const rows = buggies ? [a.n <= 9 ? 'front' : 'back', 'overall'].map(s => {
    const m = gc.matches[s];
    const was = a.before[s];
    const turned = was.text !== 'Not started' && was.leader !== m.status.leader;
    const note = !turned ? '' : m.status.leader ? `Buggy ${m.status.leader === 'A' ? 1 : 2} ${was.leader ? 'take the lead' : 'go ahead'}` : 'Back to all square';
    const label = `<span class="bw-l afl">${segName(s)}${note ? `<small class="afnote">${esc(note)}</small>` : ''}</span>${bwPill(gc, m)}`;
    if (s === 'overall') return `<div class="bw-row">${label}<span></span></div>`;
    // The nine opens to its holes, as on the results page. Closed to begin with, so the card stays short.
    const key = `bwa-${a.rid}-${a.gid}-${s}`, open = !!UI.open[key];
    return `<button class="bw-row" data-act="bwseg" data-key="${key}" data-open="${open ? 1 : 0}" aria-expanded="${open}">${label}<span class="chev dn${open ? ' up' : ''}">${chev}</span></button>${open ? bwBoard(gc, s, D.round(a.rid).status === 'live', false) : ''}`;
  }).join('') : gc.teams.flat().map(pid => `<div class="afrow"><span><b>${esc(D.nameOf(pid))}</b></span><span class="afst"><span class="b num">${comp.players[pid].total}</span></span></div>`).join('');
  let next;
  const nine = a.n <= 9 ? 'front' : 'back';
  if (D.round(a.rid).status === 'live' && nineComplete(gc, nine) && !D.check(a.rid, a.gid, nine)) {
    next = `${photoBtn(nine, true)}<button class="btn quiet" style="margin-top:8px" data-act="${gc.nextHole ? 'next' : 'to-finish'}">Later</button>${testCardLink(nine)}`;
  } else if (gc.nextHole) {
    const nh = holeOf(a.rid, gc.nextHole);
    next = `<button class="btn" data-act="next">Hole ${gc.nextHole}<small>Par ${nh.par} · Index ${nh.si}${nh.yards ? ` · ${nh.yards} yds` : ''}</small></button>`;
  } else next = `<button class="btn" data-act="to-finish">See the card</button>`;
  return {
    tabs: 'hole',
    html: `<div class="after"><header class="hero c pine entcard"><div class="entrow"><div class="entl"><small>HOLE</small><b class="entn">${a.n}</b></div><div class="entr"><span class="savedchip">${sized(ICON.check, 18)} Saved</span><button class="undochip" data-act="undo">Undo</button></div></div><div class="prog" role="img" aria-label="Hole ${a.n} of 18">${Array.from({ length: 18 }, (_, i) => i + 1).map(k => `<i class="${k === a.n ? 'cur' : k < a.n ? 'done' : ''}"></i>`).join('')}</div></header>
      ${buggies ? `<div class="sec-label afbw"><span class="sub">Buggy Wars</span></div><div class="bw-vs afvs">${bwBadges(gc.teams[0], 0)}<span class="sub">v</span>${bwBadges(gc.teams[1], 1)}</div>
      <div class="card bw-card aftercard"><div class="bw-row afres"><span class="bw-l afl">Hole ${a.n}</span>${head}<span></span>${sub ? `<small class="afres-sub">${esc(sub)}</small>` : ''}</div>${rows}</div>` : `<div class="aftercard"><div class="afhead"><div class="res">${head}</div>${sub ? `<p class="sub res-sub">${esc(sub)}</p>` : ''}</div>${rows}</div>`}
      ${next}${saveWarning()}</div>`
  };
};

/* ----- Scorecard photo check ----- */
const nineName = seg => (seg === 'front' ? 'front nine' : 'back nine');
const showV = v => (v === 'P' ? 'Picked up' : v === null || v === undefined ? '?' : String(v));
function putCheck(rid, gid, seg, data, photo) {
  const cur = view().checks.find(x => x.round === rid && x.grp === gid && x.nine === seg);
  put('checks', [{ round: rid, grp: gid, nine: seg, data, photo: photo !== undefined ? photo : (cur ? cur.photo : null) }]);
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
  if (BOOT.mode === 'live') return '';
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
function photoSrc(chk) {
  if (!chk || !chk.photo) return null;
  if (String(chk.photo).startsWith('data:')) return chk.photo;
  if (UI.photos[chk.photo]) return UI.photos[chk.photo];
  const local = (DB.prefs.photos || {})[chk.photo];
  if (local) return local;
  if (!UI.photos['loading:' + chk.photo]) {
    UI.photos['loading:' + chk.photo] = true;
    call({ op: 'photoGet', id: chk.photo }).then(r => { if (r.dataUrl) { UI.photos[chk.photo] = r.dataUrl; render(); } }).catch(() => { delete UI.photos['loading:' + chk.photo]; });
  }
  return null;
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
    const sendBlob = await new Promise(r => draw(1600).toBlob(r, 'image/jpeg', 0.85));
    const small = draw(1200).toDataURL('image/jpeg', 0.72);
    return { send: sendBlob, small };
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
  const who = gc.teams.flat().map(pid => `${D.nameOf(pid)} (handicap index ${fmtIndex((D.member(pid) || {}).index)}, plays off ${comp.players[pid].ph})`).join('; ');
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
  const rid = playRid();
  const g = myGroup(rid);
  if (!g) return;
  UI.testSheet = null;
  let blob = source.file || null;
  try {
    if (source.fixture) blob = await (await fetch('cards/' + source.fixture)).blob();
    const { send: sendBlob, small } = await prepImage(blob);
    const localId = 'local-' + Date.now();
    DB.prefs.photos = DB.prefs.photos || {};
    DB.prefs.photos[localId] = small;
    savePrefs();
    putCheck(rid, g.id, seg, { status: 'reading', fixture: source.fixture || null, at: new Date().toISOString(), decisions: {} }, localId);
    UI.checkSeg = seg;
    go('check', { rid });
    call({ op: 'photoPut', dataUrl: small }).then(res => {
      if (!res.id) return;
      DB.prefs.photos[res.id] = small;
      delete DB.prefs.photos[localId];
      savePrefs();
      const c = view().checks.find(x => x.round === rid && x.grp === g.id && x.nine === seg);
      if (c) putCheck(rid, g.id, seg, c.data, res.id);
    }).catch(() => { /* photo stays on this phone */ });
    runReader(rid, g.id, seg, sendBlob, source.fixture || null);
  } catch (e) {
    toast('That photo could not be opened. Try another.');
  }
}

const PERMANENT = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed', 'images_unavailable'];
async function runReader(rid, gid, seg, sendBlob, fixtureKey) {
  const finish = patch => {
    const c = D.check(rid, gid, seg);
    if (!c) return;
    const data = Object.assign({}, c);
    delete data.photo;
    Object.assign(data, patch);
    putCheck(rid, gid, seg, data);
    const here = !UI.org && cur().v === 'check' && UI.checkSeg === seg;
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
  const pls = gc.teams.flat().map(pid => ({ id: pid, name: D.nameOf(pid) }));
  const r = E.compareCard(reading, pls, D.scores(rid), holesOf(D.round(rid)), E.SEGMENTS[seg]);
  if (!r.checked) { finish({ status: 'failed', reason: 'nomatch' }); return; }
  finish({ status: 'done', source: src, result: { checked: r.checked, matched: r.matched, issues: r.issues, problems: reading.problems || [] }, decisions: {}, resolved: r.issues.length === 0 });
}

VIEWS.check = () => {
  const rid = playRid();
  const g = myGroup(rid);
  const seg = UI.checkSeg || 'front';
  const gc = computeR(rid).groups.find(x => x.id === g.id);
  const chk = D.check(rid, g.id, seg);
  const backLbl = gc.nextHole ? `Hole ${gc.nextHole}` : 'Card';
  let html = `${navBack(backLbl)}<div class="head"><h1 class="title">${segName(seg)} card</h1></div>`;
  if (!chk) return { tabs: 'hole', html: html + photoBtn(seg, true) + testCardLink(seg) };
  const src = photoSrc(chk);
  const thumb = `<button class="thumb" data-act="photo-full" aria-label="See the photo full size">${src ? `<img src="${src}" alt="Photo of the ${nineName(seg)} card">` : ''}</button>
    ${chk.fixture ? `<p class="cap note">Test card${chk.source === 'recorded' ? ' · recorded reading' : ''}</p>` : ''}`;
  if (chk.status === 'reading') {
    html += `<p class="sub head-sub"><span class="pulse"></span> Reading the card</p>${thumb}<button class="btn quiet" data-act="back">${gc.nextHole ? `Carry on to hole ${gc.nextHole}` : 'Back to the card'}</button>`;
  } else if (chk.status === 'failed') {
    html += `<p class="sub head-sub">${chk.reason === 'nomatch' ? 'The rows on the card could not be matched to the players.' : 'The card could not be read.'}</p>${thumb}
      <button class="btn" data-act="retry-check" data-seg="${seg}">Try again</button>${photoBtn(seg, false)}
      <div style="text-align:center"><button class="link sm" data-act="manual-check" data-seg="${seg}">Check it by eye</button></div>`;
  } else if (chk.status === 'manual') {
    const comp = computeR(rid);
    const pids = gc.teams.flat();
    const rows = E.SEGMENTS[seg].map(n => `<button class="orow" data-act="edit-hole" data-n="${n}" aria-label="Change hole ${n}"><span class="b">${n}</span>${pids.map(pid => { const v = comp.players[pid].holes[n].gross; return `<span>${v === null ? '–' : v === 'P' ? 'P' : v}</span>`; }).join('')}</button>`).join('');
    html += `<p class="sub head-sub">Compare the app with the photo</p>${thumb}
      ${sec('', cardOf(`<div class="orow"><span class="cap">Hole</span>${pids.map((pid, i) => `<span class="cap b ${i < 2 ? 'c-a' : 'c-b'}">${esc(D.nameOf(pid))}</span>`).join('')}</div>${rows}`), true)}
      ${chk.resolved ? `<p class="sub c-g" style="text-align:center;margin-top:24px">Checked</p>` : `<button class="btn" data-act="manual-ok" data-seg="${seg}">All correct</button>`}`;
  } else {
    const r = chk.result;
    const issues = r.issues;
    if (!issues.length) {
      html += `<p class="sub head-sub">${r.matched} of ${r.checked} scores match</p>${thumb}
        ${sec('', cardOf(`<div class="row tall"><span class="b c-g" style="display:inline-flex;align-items:center;gap:8px">${sized(ICON.check, 22)} The card matches the app</span></div>`))}
        <button class="btn" data-act="back">Done</button>`;
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
        return sec(`<span class="b">Hole ${i.hole} · ${esc(D.nameOf(i.pid))}</span>${tag}`, body, true);
      }).join('');
      const left = openIssues(chk);
      html += `<p class="sub head-sub">${r.matched} of ${r.checked} scores match</p>${thumb}${blocks}
        ${chk.resolved ? `<p class="sub c-g" style="text-align:center;margin-top:24px">Checked${chk.changes ? ` · ${plural(chk.changes, 'score')} changed` : ''}</p>`
          : `<div class="savebar" style="margin-top:24px"><button class="btn ${left ? 'quiet' : ''}" data-act="check-done" data-seg="${seg}">${left ? `${left} to decide` : changes ? `Done · ${plural(changes, 'score')} changed` : 'Done'}</button></div>`}`;
    }
  }
  return { tabs: 'hole', html };
};

function updateCheck(seg, fn) {
  const rid = playRid();
  const g = myGroup(rid);
  const c = D.check(rid, g.id, seg);
  if (!c) return null;
  const data = Object.assign({}, c);
  delete data.photo;
  fn(data);
  putCheck(rid, g.id, seg, data);
  return data;
}
function applyCheck(seg) {
  const rid = playRid();
  const g = myGroup(rid);
  const chk = D.check(rid, g.id, seg);
  if (!chk || chk.status !== 'done') return;
  if (openIssues(chk)) { toast(`Pick card or app for ${plural(openIssues(chk), 'score')}`); return; }
  if (D.round(rid).status === 'final') { toast('This round is final. Reopen it to change scores.'); return; }
  const changedList = [];
  const byHole = {};
  chk.result.issues.forEach(i => {
    if (chk.decisions[`${i.hole}:${i.pid}`] !== 'card' || i.card === null) return;
    const was = (D.scores(rid)[i.pid] || {})[i.hole];
    (byHole[i.hole] = byHole[i.hole] || {})[i.pid] = { v: i.card, base: was === undefined ? null : was };
    changedList.push(`${D.nameOf(i.pid)} hole ${i.hole} ${fmtGross(was)} → ${fmtGross(i.card)}`);
  });
  Object.keys(byHole).forEach(n => send({ op: 'saveHole', round: rid, grp: g.id, hole: Number(n), scores: byHole[n], by: byMe(), names: Object.fromEntries(Object.keys(byHole[n]).map(pid => [pid, D.nameOf(pid)])), label: `Card check · Hole ${n}` }));
  updateCheck(seg, d => { d.resolved = true; d.changes = changedList.length; });
  logEntry('Card check', `${roundName(D.round(rid))} · group ${g.n} · ${nineName(seg)}: ${changedList.length ? 'changed from the card photo: ' + changedList.join(', ') : 'checked, no changes'}`);
  tick();
  render();
  toast(changedList.length ? `${plural(changedList.length, 'score')} changed. Results updated.` : `${segName(seg)} card checked`);
}

/* ----- End of the round for a group ----- */
VIEWS.finish = () => {
  const rid = playRid();
  const comp = computeR(rid);
  const g = myGroup(rid);
  const gc = comp.groups.find(x => x.id === g.id);
  const submitted = D.card(rid, g.id);
  const buggies = gc.teams.length === 2;
  const players = gc.teams.map((t, i) => t.map(pid => dropRow(rid, { id: pid }, `<span style="display:flex;align-items:center;gap:8px">${buggies ? dot(i) : ''}${esc(D.nameOf(pid))}</span><span class="right"><span class="b num">${comp.players[pid].total}</span>${dropChev}</span>`, 'row')).join('')).join('');
  const bw = buggies ? ['front', 'back', 'overall'].map(s => `<div class="row"><span>${segName(s)}</span>${statusPills(gc.matches[s].status)}</div>`).join('') : '';
  const missing = 18 - gc.holesDone;
  const checks = ['front', 'back'].map(sg => checkRow(sg, D.check(rid, g.id, sg))).join('');
  const pending = ['front', 'back'].find(sg => { const c = D.check(rid, g.id, sg); return !c || !c.resolved; });
  let action;
  if (submitted) action = `<p class="sub c-g" style="margin-top:24px;text-align:center">Card submitted</p><button class="btn quiet" data-act="tab" data-tab="board">Leaderboard</button>`;
  else if (missing) action = `<button class="btn quiet" data-act="tab" data-tab="hole">${plural(missing, 'hole')} to enter</button>`;
  else if (pending) {
    const c = D.check(rid, g.id, pending);
    action = (c ? `<button class="btn" data-act="open-check" data-seg="${pending}">Check the ${nineName(pending)} card</button>` : photoBtn(pending, true) + testCardLink(pending))
      + `<button class="btn quiet" style="margin-top:8px" data-act="submit">Submit without checking</button>`;
  } else action = `<button class="btn" data-act="submit">Submit card</button>`;
  return {
    tabs: 'hole',
    html: `<div class="head"><h1 class="title">Group ${gc.n} card</h1><button class="link" data-act="round" data-rid="${rid}">Groups</button></div>
      <p class="sub">${esc(roundName(D.round(rid)))} · Stableford points</p>
      ${sec('', cardOf(players), true)}
      ${buggies ? sec(label('Buggy Wars'), cardOf(bw)) : ''}
      ${missing ? '' : sec(label('Card check'), cardOf(checks))}
      ${action}${saveWarning()}
      <div class="foot"><button class="link" data-act="home">Back to the front page</button></div>`
  };
};

/* ----- Handicap working ----- */
VIEWS.hcp = p => {
  const r = D.round(p.rid);
  const tee = teeOf(r);
  const m = D.member(p.pid);
  const w = E.handicapWorking(m.index, tee, allowanceOf(r));
  const frozen = r.ph && r.ph[p.pid] !== undefined ? r.ph[p.pid] : null;
  const f2 = x => x.toFixed(2).replace('-', '−');
  const pct = Math.round(allowanceOf(r) * 100);
  const row = (k, v, strong) => `<div class="row num"><span class="${strong ? 'b' : 'sub'}">${k}</span><span class="${strong ? 'b' : ''}">${v}</span></div>`;
  return {
    html: `${navBack(roundName(r))}
      <div class="head"><h1 class="title is-name">${esc(m.name)}</h1><span class="bignum">${frozen !== null ? frozen : w.playing}</span></div>
      <p class="sub">Playing handicap · ${esc(tee.name)} tees</p>
      ${sec('', cardOf(`${row('WHS index', fmtIndex(m.index))}${row(`× slope ${tee.slope} ÷ 113`, f2(w.slopePart))}${row(`+ rating ${tee.rating} − par ${tee.par}`, f2(w.ratingPart))}${row('Course handicap', f2(w.courseHandicap), true)}${pct !== 100 ? row(`× ${pct}%`, f2(w.beforeRounding)) : ''}${row('Playing handicap', frozen !== null ? frozen : w.playing, true)}`))}`
  };
};

/* ----- Buggy Wars board ----- */
function buggyView(rid) {
  const r = D.round(rid);
  const comp = computeR(rid);
  if (!comp) return { html: `${sec('', cardOf('<div class="row sub">Groups to be drawn</div>'))}` };
  const groups = comp.groups.filter(g => g.teams.length === 2);
  if (!groups.length) return { html: `${sec('', cardOf('<div class="row sub">No buggy matches today</div>'))}` };
  const mine = myGroup(rid);
  const inMatch = !!(mine && groups.find(g => g.id === mine.id));
  const gid = inMatch ? mine.id : (UI.matchGroup && groups.find(g => g.id === UI.matchGroup) ? UI.matchGroup : groups[0].id);
  const gc = comp.groups.find(g => g.id === gid);
  const canEdit = mine && mine.id === gid && r.status === 'live';
  const live = r.status === 'live';
  const badges = bwBadges;
  const pillOf = m => bwPill(gc, m);
  /* A nine's holes: each hole is one column, the winner's best points filled in their colour, then holes won. */
  const board = seg => bwBoard(gc, seg, live, canEdit);
  /* Front and back open to their holes. The nine being played starts open. */
  const segOf = n => (gc.matches.front.order.includes(n) ? 'front' : 'back');
  const openDefault = live && gc.nextHole ? segOf(gc.nextHole) : null;
  const row = seg => {
    const m = gc.matches[seg];
    /* A trophy beside a match once it is won. */
    const name = `${segName(seg)}${m.status.state === 'won' ? CUP : ''}`;
    if (seg === 'overall') return `<div class="bw-row"><span class="bw-l">${name}</span>${pillOf(m)}<span></span></div>`;
    const key = `bw-${rid}-${gid}-${seg}`;
    const open = UI.open[key] === undefined ? openDefault === seg : !!UI.open[key];
    return `<button class="bw-row" data-act="bwseg" data-key="${key}" data-open="${open ? 1 : 0}" aria-expanded="${open}"><span class="bw-l">${name}</span>${pillOf(m)}<span class="chev dn${open ? ' up' : ''}">${chev}</span></button>${open ? board(seg) : ''}`;
  };
  return {
    html: `      ${!inMatch && groups.length > 1 ? `<div class="seg pills grp">${groups.map(g => `<button class="${g.id === gid ? 'on' : ''}" data-act="mgroup" data-gid="${g.id}" aria-pressed="${g.id === gid}">Group ${g.n}</button>`).join('')}</div>` : ''}
      <div class="bw-vs">${badges(gc.teams[0], 0)}<span class="sub">v</span>${badges(gc.teams[1], 1)}</div>
      <div class="card bw-card">${['front', 'back', 'overall'].map(row).join('')}</div>`
  };
}

/* ----- Leaderboard ----- */
function tripRounds(r) { return r && r.trip ? D.rounds().filter(x => x.trip === r.trip && x.season === r.season && !isDemo(x) === !isDemo(r)).sort((a, b) => (a.trip_day || 0) - (b.trip_day || 0)) : [r]; }

/* ----- Fun facts from the hole-by-hole scores ----- */
function statsOf(rid) {
  return memo('stats:' + rid, () => {
    const r = D.round(rid), res = resultsOf(rid), holes = r && holesOf(r);
    if (!res || !res.comp || !holes) return null;
    const s = E.roundStats(res.comp, holes);
    const any = s.birdies.length || s.scratches.length || s.streak || s.hardest.length || s.bestNine.length || s.comeback.length || s.fade.length || s.steady.length || s.blowup.length;
    return any ? s : null;
  });
}
/* The round in numbers: one pine medal per stat with a champagne line icon, drawn like the app's other icons. */
const BADGE = inner => `<span class="sbm" aria-hidden="true"><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${inner}</svg></span>`;
const STAT_BADGE = {
  birdie: '<path d="M8 21V9"/><path d="M8 11h9l-2.2 2.8L17 16.6H8z"/><path d="M5 21h6"/><path d="M3 6.8c0-2.6 2-4.6 4.6-4.6 1.5 0 2.7.6 3.5 1.7l2.5.5-2.1 1.3c-.3 2.3-2.2 4-4.5 4H3.5z"/><circle cx="9.2" cy="4.4" r=".7" fill="currentColor" stroke="none"/><path d="M4.8 7.4c1.3.2 2.7-.3 3.4-1.4"/>',
  streak: '<path d="M12 2c1.2 3.8 6 5.6 6 11.4a6 6 0 0 1-12 0c0-2.5 1.2-4 2.5-5 .3 1.7 1.2 2.6 2.4 2.6-1-3.4 0-6.2 1.1-9z"/><path d="M12 13c.6 1.6 2.5 2.4 2.5 4.6a2.5 2.5 0 0 1-5 0c0-1 .5-1.7 1-2.1"/>',
  nine: '<path d="M7 21V3"/><path d="M7 3.5h11l-2.8 3.8L18 11H7z"/><path d="M4 21h6"/>',
  comeback: '<path d="M3 19l5.5-5.5 4 3L21 8"/><path d="M15.5 8H21v5.5"/>',
  steady: '<path d="M12 5v14"/><path d="M8.5 20h7"/><path d="M4.5 7.5h15"/><circle cx="12" cy="5" r="1.2" fill="currentColor"/><path d="M4.5 7.5l-2.2 6M4.5 7.5l2.2 6M19.5 7.5l-2.2 6M19.5 7.5l2.2 6"/><path d="M2 13.5h5a2.5 2.5 0 0 1-5 0zM17 13.5h5a2.5 2.5 0 0 1-5 0z"/>',
  fade: '<rect x="2.5" y="8" width="16.5" height="9" rx="2.2"/><path d="M21.5 11v3"/><rect x="4.5" y="10" width="3" height="5" rx="1" stroke="none"/>',
  big: '<path d="M3.2 9.8c-.6-2.2.9-4.3 3-4.5.6-2 2.5-3.3 4.6-3 1-.9 2.6-1 3.8-.2 2.1-.2 4 1.3 4.3 3.4 2 .4 3.2 2.4 2.6 4.4-.5 1.6-2 2.4-3.6 2.2-1 .9-2.4 1.2-3.7.8H10c-1.3.4-2.7.1-3.7-.8-1.5.2-2.7-.6-3.1-2.3z"/><path d="M8.6 15.2c1-.7 2.1-1 3.4-1s2.4.3 3.4 1"/><path d="M10.6 12.8l-.6 6.2M13.4 12.8l.6 6.2"/><path d="M2.5 21.5c.4-1.9 2.6-2.8 4.6-2.6.9-.9 2.7-1.4 4.9-1.4s4 .5 4.9 1.4c2-.2 4.2.7 4.6 2.6z"/>',
  scratch: '<path d="M3 20h18"/><path d="M8.5 20c0-1.4 1.6-2 3.5-2s3.5.6 3.5 2"/><circle cx="12" cy="7" r="3.2"/><path d="M12 15.5v-3.8M10.2 13.3l1.8-1.7 1.8 1.7"/>',
  tough: '<path d="M1.5 20l7.5-14 5 7.8 2.8-3.9 5.7 10.1z"/><path d="M7.2 9.3L9 6l1.9 3"/>',
  easy: '<path d="M2.5 19c0-2 4.3-3.2 9.5-3.2s9.5 1.2 9.5 3.2-4.3 2.5-9.5 2.5-9.5-.5-9.5-2.5z"/><path d="M9 18.5V6.5"/><path d="M9 6.8h6l-1.6 2 1.6 2H9z"/><circle cx="18" cy="5.5" r="2.4"/><path d="M18 1.8v.8M21.7 5.5h-.8M20.6 2.9l-.6.6"/>'
};
function statsView(s) {
  /* Each player once, even when they qualify twice (two blow-up holes, say). */
  const uniq = a => a.filter((x, i) => a.findIndex(y => y.id === x.id) === i);
  const names = a => { const u = uniq(a); return u.length > 3 ? `${u.length} players tied` : u.map(x => esc(x.name)).join(' & '); };
  const holesTxt = a => `${a.length > 1 ? 'Holes' : 'Hole'} ${a.map(h => h.n).join(', ')}`;
  const pts1 = v => (Math.round(v * 10) / 10).toLocaleString('en-IE');
  const badge = (key, title, who, note) => `<div class="sbd">${BADGE(STAT_BADGE[key])}<span class="sbt">${title}</span><b class="sbw">${who}</b>${note ? `<span class="sbn">${note}</span>` : ''}</div>`;
  const t = [];
  if (s.birdies.length) t.push(badge('birdie', 'Most birdies', names(s.birdies), plural(s.birdies[0].count, 'birdie')));
  if (s.streak) t.push(badge('streak', 'Hot streak', esc(s.streak.name), `${s.streak.len} in a row, holes ${s.streak.from} to ${s.streak.to}`));
  if (s.bestNine.length) { const b = s.bestNine[0]; t.push(badge('nine', 'Best nine', names(s.bestNine), `${b.pts} points on the ${b.seg}`)); }
  if (s.comeback.length) { const c = s.comeback[0]; t.push(badge('comeback', 'Comeback', names(s.comeback), `${c.front} out, ${c.back} back`)); }
  if (s.steady.length) { const c = s.steady[0]; t.push(badge('steady', 'Steady', names(s.steady), `${c.front} out, ${c.back} back`)); }
  if (s.fade.length) { const c = s.fade[0]; t.push(badge('fade', 'Ran out of steam', names(s.fade), `${c.front} out, ${c.back} back`)); }
  if (s.blowup.length) { const w = s.blowup[0]; t.push(badge('big', 'Blow\u2011up hole', names(s.blowup), `${w.gross} on the ${ordinal(w.n)}, a par ${w.gross - w.over}`)); }
  if (s.scratches.length) t.push(badge('scratch', 'Most pick\u2011ups', names(s.scratches), `${plural(s.scratches[0].count, 'hole')} picked up`));
  if (s.hardest.length) t.push(badge('tough', 'Toughest hole', holesTxt(s.hardest), `${pts1(s.hardest[0].avgPts)} points a player`));
  if (s.easiest.length) t.push(badge('easy', 'Friendliest', holesTxt(s.easiest), `${pts1(s.easiest[0].avgPts)} points a player`));
  return sec(label('The round in numbers'), `<div class="card sbadges">${t.join('')}</div>`, true);
}

VIEWS.board = () => {
  const sel = UI.board && D.round(UI.board) ? UI.board : playRid();
  const r = D.round(sel);
  const res0 = r.status === 'upcoming' ? null : resultsOf(sel);
  const hasBuggy = !!(res0 && res0.comp && res0.comp.groups.some(g => g.teams.length === 2));
  const hasContests = !!(res0 && res0.contests.length);
  const stats = res0 && res0.comp && res0.source === 'app' ? statsOf(sel) : null;
  const avail = ['lb', hasBuggy && 'bw', hasContests && 'ct', stats && 'st'].filter(Boolean);
  const pillSel = avail.includes(UI.res) ? UI.res : 'lb';
  const live0 = r.status === 'live';
  const thru0 = live0 && res0 && res0.rows.length ? Math.max(...res0.rows.map(x => x.thru || 0)) : 0;
  let html = `<header class="hero c lbhead">${live0 ? `<p class="eyebrow"><span class="pulse"></span>LIVE${thru0 ? ' \u00b7 THRU ' + thru0 : ''}</p>` : ''}<div class="hrow2"><h1 class="big">Leaderboard</h1></div><p class="sub">${esc(roundName(r))} \u00b7 Stableford</p></header>`;
  if (avail.length > 1) {
    const names = { lb: 'Scores', bw: 'Buggy Wars', ct: 'Contests', st: 'Stats' };
    html += `<div class="seg pills${avail.length > 3 ? ' four' : ''}" role="tablist">${avail.map(k => `<button class="${pillSel === k ? 'on' : ''}" role="tab" data-act="respill" data-p="${k}" aria-selected="${pillSel === k}">${names[k]}</button>`).join('')}</div>`;
  }
  if (pillSel === 'bw') return { tabs: 'board', html: html + buggyView(sel).html };
  if (pillSel === 'st') return { tabs: 'board', html: html + statsView(stats) };
  if (r.status === 'upcoming') {
    html += sec(label(esc(roundWhen(r) || roundName(r))), r.groups ? cardOf(r.groups.map(g => `<div class="grow"><span class="b num">${esc(g.teeTime || '')}</span><span class="teams">${g.teams.map((t, i) => `<span>${dot(i)}${esc(t.map(D.nameOf).join(' & '))}</span>`).join('')}</span><span></span></div>`).join('')) : cardOf('<div class="row sub">Groups to be drawn</div>'), true);
    return { tabs: 'board', html };
  }
  const res = res0;
  const comp = res.comp;
  if (pillSel === 'ct') {
    html += sec(label('Contests'), cardOf(res.contests.map(c => {
      const st = c.status, tag = !st ? '' : st.confirmed ? '<span class="pill g">Confirmed</span>' : '<span class="pill n">To be confirmed</span>';
      const who = c.winner || (c.lead && c.lead.pid);
      const right = who ? (st && st.confirmed ? `<span class="b ct-won">${esc(D.nameOf(who))}${CUP}</span>` : `<span class="b">${esc(D.nameOf(who))}</span>${tag}`) : st && st.confirmed ? `<span class="sub">Nobody</span>${tag}` : `<span class="sub">${st && st.answered ? 'Nobody yet' : 'Not yet played'}</span>${tag}`;
      return `<div class="row crow"><span class="ct-l"><span>${CONTEST[c.type]}</span>${c.hole ? `<span class="sub">Hole ${c.hole}</span>` : ''}</span><span class="ct-r">${right}</span></div>`;
    }).join('')));
    return { tabs: 'board', html };
  }

  const pillTxt = r.status === 'final' ? '<span class="pill g">Final</span>' : statusPill(r);
  html += sec(`${label(esc(roundName(r)))}${pillTxt}`, cardOf(res.rows.map(x => {
    const inner = `<span class="sub">${x.posLabel}</span>${avName(x, lbSub(res.rows, x, r), x.pos === 1)}<span class="r"><span class="b">${x.total}</span>${res.source === 'app' ? dropChev : ''}</span>`;
    return res.source === 'app' ? dropRow(sel, x, inner) : `<button class="lrow" data-act="player" data-pid="${x.id}">${inner}</button>`;
  }).join('')), true);
  if (res.kb.length) { const low = E.kbLowest(res.kb); html += sec(label('KBs'), cardOf(res.kb.map(k => `<div class="lrow${low.includes(k) ? ' low' : ''}"><span class="sub">${k.posLabel}</span><span>${esc(k.name)}</span><span class="b r">${k.total}</span></div>`).join(''))); }
  html += `<button class="btn quiet" data-act="results" data-rid="${sel}">Share results</button>`;
  return { tabs: 'board', html };
};

VIEWS.trip = p => {
  const list = tripRounds(D.round(p.rid));
  const r0 = D.round(p.rid);
  let html = `${navBack('Back')}<header class="hero c"><div class="hrow2"><h1 class="big" style="font-size:1.9rem">${esc(r0.trip || 'Trip standings')}</h1></div></header>`;
  html += tripTable(list);
  html += sec(label('Each day'), cardOf(list.map(x => `<button class="row" data-act="leaderboard" data-rid="${x.id}"><span>Day ${x.trip_day || x.seq}</span><span class="right">${x.status === 'upcoming' ? '<span class="sub">Not played</span>' : ''}${chev}</span></button>`).join('')));
  return { html };
};

/* The trip's golfers ranked on total points across its rounds (also used for the trip line on Home). */
function tripRows(list) {
  const ids = new Set();
  list.forEach(r => (r.groups || []).forEach(g => g.teams.flat().forEach(pid => ids.add(pid))));
  const pts = list.map(r => (r.status === 'upcoming' ? {} : pointsOf(r.id)));
  return E.rankRows([...ids].map(pid => {
    const per = pts.map(p => (p[pid] === undefined ? null : p[pid]));
    return { id: pid, name: D.nameOf(pid), per, total: per.reduce((s, v) => s + (v || 0), 0) };
  }), 'total', 'desc');
}
function tripTable(list) {
  const rows = tripRows(list);
  const allFinal = list.every(r => r.status === 'final');
  /* One row per golfer, like the round leaderboard: place, initials and name, total on the right. Each day's points sit
     on a small line under the name ("D1 26 · D2 41 · D3 39"), so names never get squeezed by a column per day
     (owner, 22 October). A trip is at most three rounds. */
  const dayLine = row => row.per.map((v, i) => `D${list[i].trip_day || list[i].seq} ${v === null ? '–' : v}`).join(' \u00b7 ');
  return sec(`${label(`All ${list.length} rounds count`)}${allFinal ? '<span class="pill g">Final</span>' : '<span class="pill w">In progress</span>'}`,
    cardOf(rows.map(row => `<button class="lrow trip2" data-act="player" data-pid="${row.id}"><span class="sub">${row.posLabel}</span>${avName(row, dayLine(row), row.pos === 1)}<span class="r"><span class="b">${row.total}</span></span></button>`).join('')), true);
}

/* ----- Results card ----- */
VIEWS.results = p => {
  const r = D.round(p.rid);
  const res = resultsOf(p.rid);
  const lb = res.rows;
  if (!lb.length) return { html: `${navBack('Back')}<p class="sub">No results yet</p>` };
  const top = lb[0];
  const leaders = lb.filter(x => x.pos === 1);
  const final = r.status === 'final';
  const names = leaders.map(x => x.name).join(' and ');
  const headline = final ? (leaders.length > 1 ? `${names} tie on ${top.total}` : `${top.name} wins with ${top.total}`) : (leaders.length > 1 ? `${names} lead on ${top.total}` : `${top.name} leads on ${top.total}`);
  let moneyRows = '';
  if (res.comp) {
    const money = {};
    res.comp.groups.filter(g => g.teams.length === 2).forEach(gc => ['front', 'back', 'overall'].forEach(s => {
      const w = gc.matches[s].winner;
      if (w) { const k = gc.labels[w === 'A' ? 0 : 1].long; money[k] = (money[k] || 0) + 5; }
    }));
    moneyRows = Object.keys(money).sort((a, b) => money[b] - money[a]).map(k => `<div class="ln"><span>${esc(k)}</span><span class="b">€${money[k]}</span></div>`).join('');
  }
  const minThru = res.comp ? Math.min(...res.comp.groups.map(g => g.holesDone)) : 18;
  const contests = res.contests.map(c => `<div class="ln"><span class="sub">${CONTEST[c.type]}${c.hole ? ' ' + c.hole : ''}</span><span>${c.winner ? esc(D.nameOf(c.winner)) + ' ' + CUP : c.lead ? `${esc(D.nameOf(c.lead.pid))} <span class="sub">${c.status && c.status.confirmed ? 'confirmed' : 'to be confirmed'}</span>` : c.status && c.status.confirmed ? 'Nobody' : '–'}</span></div>`).join('');
  const kb = E.kbLowest(res.kb).length ? `<div class="blk"><div class="cap">KBs</div>${E.kbLowest(res.kb).map(k => `<div class="ln"><span>${esc(k.name)}</span><span class="b">${k.total}</span></div>`).join('')}</div>` : '';
  const card = `<div class="rcard" id="rcard">
    <div class="top"><div class="cap">${esc(D.society())} · ${esc(roundName(r))}${r.date ? ' · ' + esc(fmtDate(r.date, true)) : ''} · ${final ? 'Final' : `Thru ${minThru}`}</div><div class="title">${esc(headline)}</div></div>
    <div class="blk">${lb.filter(x => x.pos <= 5).map(x => `<div class="ln"><span><span class="sub" style="display:inline-block;width:32px">${x.posLabel}</span>${esc(x.name)}</span><span class="b">${x.total}</span></div>`).join('')}</div>
    ${kb}
    ${moneyRows ? `<div class="blk"><div class="cap">Buggy Wars</div>${moneyRows}</div>` : ''}
    ${contests ? `<div class="blk">${contests}</div>` : ''}
    ${isDemo(r) ? '<div class="blk cap">Demo scores</div>' : ''}
  </div>`;
  return {
    html: `${navBack('Back')}<div style="margin-top:8px">${card}</div><button class="btn" data-act="share-card" data-rid="${r.id}">${sized(ICON.share, 20)}<span>Share</span></button>`
  };
};

function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}
async function shareCard(rid) {
  try {
    if (!window.html2canvas) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    const canvas = await window.html2canvas(document.getElementById('rcard'), { scale: 3, backgroundColor: '#F2F2F7' });
    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    const name = `${D.society()}-${roundName(D.round(rid))}-results.png`.replace(/\s+/g, '-').toLowerCase();
    const file = new File([blob], name, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
    if (downloads) { await downloads.save({ filename: name, data: blob }); return; }
    UI.shareImg = URL.createObjectURL(blob);
    render();
  } catch (e) {
    if (e && (e.name === 'AbortError' || e.code === 'declined')) return;
    toast('The image could not be made. Take a screenshot instead.');
  }
}


/* ----- Change one past score: a small sheet over whatever screen you are on ----- */
function fixShots(f) {
  const comp = computeR(f.rid), pl = comp && comp.players[f.pid];
  return pl ? (pl.holes[f.n].shots || 0) : 0;
}
/* What the sheet shows for the current choice. A pick-up shows the strokes that net no points. */
function fixBody() {
  const f = UI.fix;
  const r = D.round(f.rid), comp = computeR(f.rid), pl = comp && comp.players[f.pid];
  if (!r || !pl) return '';
  const h = holeOf(f.rid, f.n), shots = pl.holes[f.n].shots || 0;
  const num = Number.isInteger(f.v);
  const big = num ? f.v : E.pickupStrokes(h.par, shots);
  const pts = E.stablefordPoints(f.v, h.par, shots);
  const name = f.v === 'P' ? 'Picked up' : E.scoreName(f.v, h.par);
  const same = f.v === f.base;
  return `<div class="grab"></div>
    <div class="fx-head"><span class="b">${esc(pl.name)}</span><span class="sub">Hole ${f.n} \u00b7 Par ${h.par} \u00b7 Index ${h.si}${shots ? ` \u00b7 ${shots > 0 ? plural(shots, 'shot') : 'gives ' + plural(-shots, 'shot')}` : ''}</span></div>
    <div class="fx-step">
      <button class="st round" data-act="fix-step" data-d="-1" aria-label="One fewer stroke"${num && f.v <= 1 ? ' disabled' : ''}>\u2212</button>
      <div class="fx-val${f.v === 'P' ? ' pu' : ''}" aria-live="polite">${big}${f.v === 'P' ? '<sup>p</sup>' : ''}</div>
      <button class="st round" data-act="fix-step" data-d="1" aria-label="One more stroke">+</button>
    </div>
    <p class="fx-line"><span class="b">${esc(name)}</span> \u00b7 ${plural(pts, 'point')}</p>
    <button class="fx-pu${f.v === 'P' ? ' on' : ''}" data-act="fix-pu" aria-pressed="${f.v === 'P'}">Pick up</button>
    <button class="btn" data-act="fix-save"${same ? ' disabled' : ''}>Save</button>
    <button class="link fx-cancel" data-act="fix-cancel">Cancel</button>`;
}
function fixSheet() {
  const first = !UI.fix.shown; UI.fix.shown = true;   // slide in once; later redraws (sync, tick) stay still
  return `<div class="scrim${first ? '' : ' still'}" data-act="fix-scrim"><div class="sheet fixs${first ? '' : ' still'}" role="dialog" aria-label="Change score">${fixBody()}</div></div>`;
}
/* Plus, minus and Pick up redraw only the sheet, so nothing behind it flickers or jumps. */
function refreshFix() {
  const box = document.querySelector('.sheet.fixs');
  if (!box) { render(); return; }
  box.innerHTML = fixBody();
}
function fixSave() {
  const f = UI.fix;
  const r = D.round(f.rid);
  if (r.status === 'final') { UI.fix = null; toast('This round is final. Reopen it to change scores.'); return; }
  const g = (r.groups || []).find(x => x.teams.flat().includes(f.pid));
  if (!g) { UI.fix = null; render(); return; }
  send({
    op: 'saveHole', round: f.rid, grp: g.id, hole: f.n, scores: { [f.pid]: { v: f.v, base: f.base } }, by: byMe(),
    names: { [f.pid]: D.nameOf(f.pid) }, label: `${roundName(r)} \u00b7 Group ${g.n} \u00b7 Hole ${f.n}`
  });
  UI.fix = null;
  tick();
  render();
  toast(`${D.nameOf(f.pid)}, hole ${f.n}: ${f.v === 'P' ? 'picked up' : f.v}`);
}
