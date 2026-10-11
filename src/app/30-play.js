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
  return comp.groups.find(x => x.id === g.id).nextHole ? 'tee' : 'finish';
}
function myConflicts(rid, gid) { return DB.conflicts.filter(c => c.round === rid && c.grp === gid); }

VIEWS.tee = () => {
  const rid = playRid();
  const r = D.round(rid);
  const comp = computeR(rid);
  const g = myGroup(rid);
  if (!comp || !g) return VIEWS.round({ rid });
  const gc = comp.groups.find(x => x.id === g.id);
  const n = gc.nextHole;
  if (!n) return VIEWS.finish();
  UI.hole = n;
  const h = holeOf(rid, n);
  const seg = n <= 9 ? 'front' : 'back';
  const m = gc.matches[seg].status;
  const mShow = m.state === 'pending' ? { text: 'All square', leader: null } : m;
  const d = (((DB.prefs.drafts[rid] || {})[g.id]) || {})[n];
  const hasDraft = d && Object.keys(d).some(k => k[0] !== '_');
  const contest = contestOn(rid, n);
  const buggies = gc.teams.length === 2;
  const teams = gc.teams.map((t, i) => sec(buggies ? pill(i) : '', cardOf(t.map(pid => dropRow(rid, { id: pid }, `<span>${esc(D.nameOf(pid))}</span><span class="right">${dots(comp.players[pid].holes[n].shots)}${dropChev}</span>`, 'row')).join('')), i === 1)).join('');
  const checkRows = ['front', 'back'].filter(sg => nineComplete(gc, sg)).map(sg => {
    const c = D.check(rid, g.id, sg);
    return c && c.resolved ? '' : checkRow(sg, c);
  }).join('');
  const clash = myConflicts(rid, g.id);
  const clashRows = [...new Set(clash.map(c => c.hole))].map(hn => `<button class="row" data-act="conflict" data-n="${hn}"><span>Hole ${hn}</span><span class="right"><span class="pill w">Saved on two phones</span>${chev}</span></button>`).join('');
  return {
    tabs: 'hole',
    html: `<header class="hero c"><div class="hrow2"><h1 class="big"><small>Hole</small>${n}</h1>${isDemo(r) ? '<span class="pill w2">Demo</span>' : ''}<button class="link" data-act="round" data-rid="${rid}">Groups</button></div>
      <div class="pills2"><span class="fact">Par<b>${h.par}</b></span><span class="fact">Index<b>${h.si}</b></span>${h.yards ? `<span class="fact">${h.yards}<b>yds</b></span>` : ''}${contest ? `<span class="pill flag">${CONTEST[contest.type]}</span>` : ''}</div></header>
      ${clashRows ? sec('', cardOf(clashRows), true) : ''}
      ${teams}
      ${buggies || checkRows ? sec('', cardOf(`${buggies ? `<button class="row" data-act="tab" data-tab="match"><span class="sub">${segName(seg)}</span>${status(mShow)}</button>` : ''}${checkRows}`)) : ''}
      <button class="btn" data-act="enter"${checkRows ? ' style="margin-top:16px"' : ''}>${hasDraft ? 'Continue scores' : 'Enter scores'}</button>
      ${saveWarning()}`
  };
};
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
    const mine = (D.claims(ctx.rid)[ctx.n] || []).find(c => c.gid === ctx.gid);
    if (mine) d._claim = mine.pid;
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
  let score = '';
  if (val === 'P') score = `<span class="sub">Picked up</span>`;
  else if (E.isEntered(val)) score = `<span class="sub">${E.scoreName(val, par)}</span><span class="s">${val}<sup>${E.stablefordPoints(val, par, shots)}</sup></span>`;
  const flash = UI.flash && !E.isEntered(val) ? ' flash' : '';
  // The first tap on either button lands on par, then the buttons move one stroke at a time.
  const num = Number.isInteger(val);
  const up = num ? val + 1 : par, down = num ? Math.max(1, val - 1) : par;
  const atOne = num && val <= 1;
  return `<div class="pr${flash}">
    <div class="pr-top"><button class="nm drop${dopen ? ' open' : ''}" data-act="toggle" data-key="${dkey}" aria-expanded="${dopen}"><span>${name}</span>${dots(shots, true)}${dpl ? dropChev : ''}</button><div class="pr-score">${score}</div></div>
    ${dopen && dpl ? `<div class="dropcard in">${cardParts(D.round(rid), dpl, D.round(rid).status === 'live' && !!myGroup(rid) && myGroup(rid).teams.flat().includes(pid)).table}<p class="cap sc-note">Tap a score to change it</p></div>` : ''}
    <div class="stepper" role="group" aria-label="Strokes for ${name}">
      <button class="st" data-act="set" data-dir="down" data-pid="${pid}" data-v="${down}" aria-label="One fewer stroke for ${name}"${atOne ? ' disabled' : ''}>\u2212</button>
      <div class="stv${num ? '' : ' none'}" data-pid="${pid}" aria-live="polite">${num ? val : (val === 'P' ? 'Out' : 'Par ' + par)}</div>
      <button class="st" data-act="set" data-dir="up" data-pid="${pid}" data-v="${up}" aria-label="One more stroke for ${name}">+</button>
      <button class="pu ${val === 'P' ? 'on' : ''}" data-act="set" data-pid="${pid}" data-v="P" aria-pressed="${val === 'P'}">Pick up</button>
    </div></div>`;
}

VIEWS.entry = () => {
  const ctx = entryCtx();
  const comp = computeR(ctx.rid);
  const gc = comp.groups.find(x => x.id === ctx.gid);
  const h = holeOf(ctx.rid, ctx.n);
  const d = ensureDraft(ctx);
  const pids = gc.teams.flat();
  const missing = pids.filter(pid => !E.isEntered(d[pid]));
  const final = D.round(ctx.rid).status === 'final';
  const buggies = gc.teams.length === 2;
  let html = '<div class="entry">';
  if (ctx.mode === 'org') html += `<p class="cap">Correcting group ${gc.n}</p>`;
  html += `<header class="hero c"><div class="hrow2"><button class="back-icon" data-act="entry-back" aria-label="Back">${ICON.back}</button><h1 class="big"><small>Hole</small>${ctx.n}</h1><span class="facts"><span class="fact">Par<b>${h.par}</b></span><span class="fact">Index<b>${h.si}</b></span></span></div></header>`;
  if (final) html += `<div class="banner" style="margin-top:12px">This round is final.</div>${ctx.mode === 'org' ? '<button class="btn quiet" data-act="reopen">Reopen round</button>' : ''}`;
  const clash = DB.conflicts.filter(c => c.round === ctx.rid && c.grp === ctx.gid && c.hole === ctx.n);
  if (clash.length) html += `<div class="banner" style="margin-top:12px">Another phone saved ${clash.map(c => `${esc(D.nameOf(c.player))} ${fmtGross(c.server)}`).join(', ')}</div>`;
  html += gc.teams.map((t, i) => sec(buggies ? pill(i) : '', cardOf(t.map(pid => entryRow(pid, d[pid], comp.players[pid].holes[ctx.n].shots, h.par, ctx.rid)).join('')))).join('');
  const contest = contestOn(ctx.rid, ctx.n);
  if (contest) {
    const lead = claimLeader(ctx.rid, ctx.n, ctx.gid);
    const right = d._claim ? `<span class="b">${esc(D.nameOf(d._claim))}</span>` : `<span class="sub">${lead ? `${esc(D.nameOf(lead.pid))} leads` : 'Add'}</span>`;
    html += sec('', `<button class="card row" data-act="contest-open"><span>${CONTEST[contest.type]}</span><span class="right">${right}${chev}</span></button>`);
  }
  const who = missing.length && missing.length <= 2 ? ' · ' + missing.map(D.nameOf).join(', ') : '';
  const lbl = missing.length ? `${plural(missing.length, 'score')} to go${esc(who)}` : ctx.mode === 'org' ? 'Save correction' : ctx.edit ? 'Save changes' : `Save hole ${ctx.n}`;
  html += `<div class="savebar"><button class="btn ${missing.length ? 'quiet' : ''}" data-act="save">${lbl}</button></div></div>`;
  if (UI.contestSheet && contest) {
    const lead = claimLeader(ctx.rid, ctx.n, ctx.gid);
    const tickMark = `<span class="c-g">${sized(ICON.check, 20)}</span>`;
    html += `<div class="scrim" data-act="contest-scrim"><div class="sheet" role="dialog" aria-label="${CONTEST[contest.type]}">
      <div class="nav"><span class="b">${CONTEST[contest.type]}</span><button class="link" data-act="contest-close">Done</button></div>
      ${lead ? `<p class="sub" style="margin-bottom:8px">${esc(D.nameOf(lead.pid))} (group ${groupNo(ctx.rid, lead.gid)}) leads</p>` : ''}
      ${cardOf(pids.map(pid => `<button class="row" data-act="claim" data-pid="${pid}"><span>${esc(D.nameOf(pid))}</span>${d._claim === pid ? tickMark : ''}</button>`).join('') +
        `<button class="row" data-act="claim" data-pid=""><span>${lead ? 'Nobody closer' : 'Nobody'}</span>${!d._claim ? tickMark : ''}</button>`)}
    </div></div>`;
  }
  return { html };
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
  ['front', 'back', 'overall'].forEach(s => { before[s] = gc.matches[s].status.text; });
  const prev = {};
  const scores = {};
  pids.forEach(pid => {
    const cur = (D.scores(ctx.rid)[pid] || {})[ctx.n];
    prev[pid] = cur === undefined ? null : cur;
    const clash = DB.conflicts.find(c => c.round === ctx.rid && c.grp === ctx.gid && c.hole === ctx.n && c.player === pid);
    const seen = d._base && pid in d._base ? d._base[pid] : prev[pid];
    scores[pid] = { v: d[pid], base: clash ? clash.server : seen };
  });
  const claimsBefore = (D.claims(ctx.rid)[ctx.n] || []).find(c => c.gid === ctx.gid);
  const req = {
    op: 'saveHole', round: ctx.rid, grp: ctx.gid, hole: ctx.n, scores, by: ctx.mode === 'org' ? 'Organiser' : byMe(),
    names: Object.fromEntries(pids.map(pid => [pid, D.nameOf(pid)])), label: `${roundName(r)} · Group ${gc.n} · Hole ${ctx.n}`
  };
  if (ctx.mode === 'org') req.pin = ORGPIN.pin;
  if (contestOn(ctx.rid, ctx.n)) req.claim = d._claim || null;
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
  UI.after = { rid: ctx.rid, gid: ctx.gid, n: ctx.n, before, prev, claimBefore: claimsBefore ? claimsBefore.pid : null, hadClaim: req.claim !== undefined, draft: draftCopy, wasEdit: ctx.edit };
  UI.edit = false;
  replaceTop('after', { rid: ctx.rid });
}

function undoSave() {
  const a = UI.after;
  if (!a) return;
  const scores = {};
  Object.keys(a.prev).forEach(pid => { scores[pid] = { v: a.prev[pid], base: a.draft[pid] }; });
  const req = { op: 'saveHole', round: a.rid, grp: a.gid, hole: a.n, scores, by: byMe(), names: Object.fromEntries(Object.keys(a.prev).map(pid => [pid, D.nameOf(pid)])), label: `Undo · Hole ${a.n}` };
  if (a.hadClaim) req.claim = a.claimBefore;
  send(req);
  const byRound = DB.prefs.drafts[a.rid] || (DB.prefs.drafts[a.rid] = {});
  (byRound[a.gid] || (byRound[a.gid] = {}))[a.n] = a.draft;
  savePrefs();
  UI.hole = a.n;
  UI.edit = a.wasEdit;
  UI.after = null;
  replaceTop('entry', { rid: a.rid });
}

VIEWS.after = () => {
  const a = UI.after;
  if (!a) return VIEWS[playHomeView(playRid())]({ rid: playRid() });
  const comp = computeR(a.rid);
  const gc = comp.groups.find(x => x.id === a.gid);
  const hr = gc.holes[a.n];
  const L = gc.labels;
  const who = list => list.map(D.nameOf).join(' and ');
  const buggies = gc.teams.length === 2;
  let title, cls = '', sub = '';
  if (!buggies) { title = `Hole ${a.n} saved`; }
  else if (hr.result === 'H') { title = `Hole ${a.n} halved`; sub = `Both buggies scored ${plural(hr.best[0], 'point')}`; }
  else {
    const w = hr.result === 'A' ? 0 : 1;
    title = `${L[w].long} win ${a.n}`;
    cls = w ? 'c-b' : 'c-a';
    sub = `${who(hr.counting[w])}'s ${plural(hr.best[w], 'point')} beat ${hr.best[1 - w]}`;
  }
  const rows = buggies ? [a.n <= 9 ? 'front' : 'back', 'overall'].map(s => {
    const m = gc.matches[s];
    const now = m.status.text;
    const was = a.before[s];
    const changedNow = was !== now && was !== 'Not started';
    return `<div class="row tall chg"><span><div>${segName(s)}</div><div class="cap">${m.remaining ? `${m.remaining} to play` : 'Finished'}</div></span>
      <span class="right">${changedNow ? `<s>${esc(was)}</s>` : ''}<span class="b ${sideCls(m.status.leader)} ${was !== now ? 'new' : ''}">${esc(now)}</span></span></div>`;
  }).join('') : gc.teams.flat().map(pid => `<div class="row"><span>${esc(D.nameOf(pid))}</span><span class="b num">${comp.players[pid].total}</span></div>`).join('');
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
    html: `<div class="nav"><span class="sub c-g" style="display:inline-flex;align-items:center;gap:4px">${sized(ICON.check, 18)} Saved</span><button class="link" data-act="undo">Undo</button></div>
      <h1 class="result ${cls}">${esc(title)}</h1>
      ${sub ? `<p class="sub head-sub">${esc(sub)}</p>` : ''}
      ${sec('', cardOf(rows))}
      ${next}${saveWarning()}`
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
  const bw = buggies ? ['front', 'back', 'overall'].map(s => `<div class="row"><span class="sub">${segName(s)}</span>${status(gc.matches[s].status)}</div>`).join('') : '';
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
      ${action}${saveWarning()}`
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
      <div class="head"><h1 class="title">${esc(m.name)}</h1><span class="bignum">${frozen !== null ? frozen : w.playing}</span></div>
      <p class="sub">Playing handicap · ${esc(tee.name)} tees</p>
      ${sec('', cardOf(`${row('WHS index', fmtIndex(m.index))}${row(`× slope ${tee.slope} ÷ 113`, f2(w.slopePart))}${row(`+ rating ${tee.rating} − par ${tee.par}`, f2(w.ratingPart))}${row('Course handicap', f2(w.courseHandicap), true)}${pct !== 100 ? row(`× ${pct}%`, f2(w.beforeRounding)) : ''}${row('Playing handicap', frozen !== null ? frozen : w.playing, true)}`))}`
  };
};

/* ----- Buggy Wars board ----- */
VIEWS.match = () => {
  const rid = playRid();
  const r = D.round(rid);
  const comp = computeR(rid);
  if (!comp) return { tabs: 'match', html: `<div class="head"><h1 class="title">Buggy Wars</h1></div>${sec('', cardOf('<div class="row sub">Groups to be drawn</div>'))}` };
  const groups = comp.groups.filter(g => g.teams.length === 2);
  if (!groups.length) return { tabs: 'match', html: `<div class="head"><h1 class="title">Buggy Wars</h1></div>${sec('', cardOf('<div class="row sub">No buggy matches today</div>'))}` };
  const mine = myGroup(rid);
  const gid = UI.matchGroup && groups.find(g => g.id === UI.matchGroup) ? UI.matchGroup : (mine && groups.find(g => g.id === mine.id) ? mine.id : groups[0].id);
  const gc = comp.groups.find(g => g.id === gid);
  const L = gc.labels;
  const canEdit = mine && mine.id === gid && r.status === 'live';
  const summary = ['front', 'back', 'overall'].map(s => `<div class="row"><span class="sub">${segName(s)}</span>${status(gc.matches[s].status)}</div>`).join('');
  let rows = '';
  gc.order.forEach((n, idx) => {
    const hr = gc.holes[n];
    const isNow = n === gc.nextHole && r.status === 'live';
    let a = '', b = '', m = '';
    if (hr.complete) {
      const [pa, pb] = hr.best;
      a = `<span class="ppts ${hr.result === 'A' ? 'a' : hr.result === 'B' ? 'lose' : ''}">${pa}</span>`;
      b = `<span class="ppts ${hr.result === 'B' ? 'b' : hr.result === 'A' ? 'lose' : ''}">${pb}</span>`;
      const lead = hr.segLead;
      m = lead === 0 ? '<span class="pill n">AS</span>' : `<span class="pill ${lead > 0 ? 'a' : 'b'}">${esc(lead > 0 ? L[0].short : L[1].short)} ${Math.abs(lead)} up</span>`;
    } else if (isNow) m = '<span class="b c-g">Now</span>';
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
    tabs: 'match',
    html: `<div class="head"><h1 class="title">Buggy Wars</h1></div>
      ${groups.length > 1 ? `<div class="seg" style="margin-top:8px">${groups.map(g => `<button class="${g.id === gid ? 'on' : ''}" data-act="mgroup" data-gid="${g.id}" aria-pressed="${g.id === gid}">Group ${g.n}</button>`).join('')}</div>` : ''}
      ${sec(`${pill(0)}<span class="sub" style="flex:1">${esc(L[0].long)}</span>`, '', true)}
      <div class="sec-label" style="margin-top:-4px">${pill(1)}<span class="sub" style="flex:1">${esc(L[1].long)}</span></div>
      ${cardOf(summary)}
      ${sec('', cardOf(`<div class="mrow cols"><span class="cap">Hole</span><span class="p">${pill(0)}</span><span class="p">${pill(1)}</span><span></span></div>${rows}`), true)}`
  };
};

/* ----- Leaderboard ----- */
function tripRounds(r) { return r && r.trip ? D.rounds().filter(x => x.trip === r.trip && x.season === r.season && !isDemo(x) === !isDemo(r)).sort((a, b) => (a.trip_day || 0) - (b.trip_day || 0)) : [r]; }
VIEWS.board = () => {
  const base = D.round(playRid());
  const list = tripRounds(base);
  const sel = UI.board && (UI.board === 'trip' || list.find(x => x.id === UI.board)) ? UI.board : base.id;
  let html = `<header class="hero c"><div class="hrow2"><h1 class="big" style="font-size:1.9rem">Leaderboard</h1></div></header>`;
  if (list.length > 1) {
    html += `<div class="seg" style="margin-top:8px">${list.map(x => `<button class="${sel === x.id ? 'on' : ''}" data-act="board" data-id="${x.id}" aria-pressed="${sel === x.id}">Day ${x.trip_day || x.seq}</button>`).join('')}<button class="${sel === 'trip' ? 'on' : ''}" data-act="board" data-id="trip" aria-pressed="${sel === 'trip'}">${esc(base.trip)}</button></div>`;
  }
  if (sel === 'trip') return { tabs: 'board', html: html + tripTable(list) };
  const r = D.round(sel);
  if (r.status === 'upcoming') {
    html += sec(label(esc(roundWhen(r) || roundName(r))), r.groups ? cardOf(r.groups.map(g => `<div class="grow"><span class="b num">${esc(g.teeTime || '')}</span><span class="teams">${g.teams.map((t, i) => `<span>${dot(i)}${esc(t.map(D.nameOf).join(' & '))}</span>`).join('')}</span><span></span></div>`).join('')) : cardOf('<div class="row sub">Groups to be drawn</div>'), true);
    return { tabs: 'board', html };
  }
  const res = resultsOf(sel);
  const comp = res.comp;
  const pillTxt = r.status === 'final' ? '<span class="pill g">Final</span>' : statusPill(r);
  html += sec(`${label(esc(roundName(r)))}${pillTxt}`, cardOf(res.rows.map(x => {
    const inner = `<span class="sub">${x.posLabel}</span><span class="${x.id === DB.prefs.me ? 'b' : ''}">${esc(x.name)}</span><span class="r"><span class="b">${x.total}</span>${res.source === 'app' ? dropChev : ''}</span>`;
    return res.source === 'app' ? dropRow(sel, x, inner) : `<button class="lrow" data-act="player" data-pid="${x.id}">${inner}</button>`;
  }).join('')), true);
  if (res.kb.length) html += sec(label('KBs'), cardOf(res.kb.map(k => `<div class="lrow"><span class="sub">${k.posLabel}</span><span>${esc(k.name)}</span><span class="b r">${k.total}</span></div>`).join('')));
  if (comp && comp.groups.some(g => g.teams.length === 2)) {
    const final = r.status === 'final';
    const lowCount = comp.pairs.filter(p => p.lowest).length;
    html += sec(label('First round of drinks'), cardOf(comp.pairs.map(p => {
      const tag = p.lowest ? `<span class="pill w">${lowCount > 1 ? 'Level' : final ? 'Buying' : 'Buying so far'}</span>` : '';
      return `<div class="row"><span>${esc(p.label)}</span><span class="right">${tag}<span class="b num">${p.total}</span></span></div>`;
    }).join('')));
  }
  if (res.contests.length) {
    html += sec(label('Contests'), cardOf(res.contests.map(c => {
      const right = c.winner ? `<span class="b">${esc(D.nameOf(c.winner))}</span>` : c.lead ? `<span class="right"><span class="pill n">To confirm</span>${esc(D.nameOf(c.lead.pid))}</span>` : '<span class="sub">–</span>';
      return `<div class="row"><span>${CONTEST[c.type]}${c.hole ? ` <span class="sub">${c.hole}</span>` : ''}</span>${right}</div>`;
    }).join('')));
  }
  html += `<button class="btn quiet" data-act="results" data-rid="${sel}">Share results</button>`;
  html += `<div class="foot"><button class="link" data-act="home">${esc(D.society())}</button><button class="link" data-act="org">Organiser</button></div>`;
  return { tabs: 'board', html };
};

function tripTable(list) {
  const ids = new Set();
  list.forEach(r => (r.groups || []).forEach(g => g.teams.flat().forEach(pid => ids.add(pid))));
  const pts = list.map(r => (r.status === 'upcoming' ? {} : pointsOf(r.id)));
  const rows = E.rankRows([...ids].map(pid => {
    const per = pts.map(p => (p[pid] === undefined ? null : p[pid]));
    return { id: pid, name: D.nameOf(pid), per, total: per.reduce((s, v) => s + (v || 0), 0) };
  }), 'total', 'desc');
  const allFinal = list.every(r => r.status === 'final');
  const cols = `grid-template-columns:36px minmax(0,1fr) repeat(${list.length},32px) 40px`;
  return sec(`${label(`All ${list.length} rounds count`)}${allFinal ? '<span class="pill g">Final</span>' : '<span class="pill w">In progress</span>'}`,
    cardOf(`<div class="lrow" style="${cols};min-height:36px"><span></span><span></span>${list.map(r => `<span class="cap r">D${r.trip_day || r.seq}</span>`).join('')}<span class="cap r">Total</span></div>
    ${rows.map(row => `<button class="lrow" style="${cols}" data-act="player" data-pid="${row.id}"><span class="sub">${row.posLabel}</span><span class="${row.id === DB.prefs.me ? 'b' : ''}">${esc(row.name)}</span>${row.per.map(v => `<span class="r sub">${v === null ? '–' : v}</span>`).join('')}<span class="r b">${row.total}</span></button>`).join('')}`), true);
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
  let moneyRows = '', drinks = '';
  if (res.comp) {
    const money = {};
    res.comp.groups.filter(g => g.teams.length === 2).forEach(gc => ['front', 'back', 'overall'].forEach(s => {
      const w = gc.matches[s].winner;
      if (w) { const k = gc.labels[w === 'A' ? 0 : 1].long; money[k] = (money[k] || 0) + 5; }
    }));
    moneyRows = Object.keys(money).sort((a, b) => money[b] - money[a]).map(k => `<div class="ln"><span>${esc(k)}</span><span class="b">€${money[k]}</span></div>`).join('');
    const lows = res.comp.pairs.filter(pp => pp.lowest);
    if (lows.length && res.comp.groups.some(g => g.teams.length === 2)) drinks = `<div class="blk drinks"><div class="cap">First round${final ? '' : ' so far'}</div><div class="ln"><span class="b">${esc(lows.map(pp => pp.label).join(' and '))}</span><span>${lows[0].total}</span></div></div>`;
  }
  const minThru = res.comp ? Math.min(...res.comp.groups.map(g => g.holesDone)) : 18;
  const contests = res.contests.map(c => `<div class="ln"><span class="sub">${CONTEST[c.type]}${c.hole ? ' ' + c.hole : ''}</span><span>${c.winner ? esc(D.nameOf(c.winner)) : c.lead ? `${esc(D.nameOf(c.lead.pid))} <span class="sub">to confirm</span>` : '–'}</span></div>`).join('');
  const kb = res.kb.length ? `<div class="blk"><div class="cap">KBs</div>${res.kb.filter(k => k.posLabel === '1' || k.posLabel === 'T1').map(k => `<div class="ln"><span>${esc(k.name)}</span><span class="b">${k.total}</span></div>`).join('')}</div>` : '';
  const card = `<div class="rcard" id="rcard">
    <div class="top"><div class="cap">${esc(D.society())} · ${esc(roundName(r))}${r.date ? ' · ' + esc(fmtDate(r.date, true)) : ''} · ${final ? 'Final' : `Thru ${minThru}`}</div><div class="title">${esc(headline)}</div></div>
    <div class="blk">${lb.filter(x => x.pos <= 5).map(x => `<div class="ln"><span><span class="sub" style="display:inline-block;width:32px">${x.posLabel}</span>${esc(x.name)}</span><span class="b">${x.total}</span></div>`).join('')}</div>
    ${kb}
    ${moneyRows ? `<div class="blk"><div class="cap">Buggy Wars</div>${moneyRows}</div>` : ''}
    ${drinks}
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
