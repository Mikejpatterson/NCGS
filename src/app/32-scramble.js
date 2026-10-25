/* ----- Scramble (Westport day two, owner brief §6) -----
   One team score per hole, saved in the row of the player whose drive was used (see scrambleOf in 10-data.js).
   Each save sends every team member: the driver gets the team's strokes, everyone else is cleared, each with the value
   this phone last saw. The server checks each row on its own, so if two phones disagree both rows can survive: the hole
   then shows "two drives saved" and counts for nothing until someone picks one. Nothing is ever chosen silently. */

const scrDriveWord = k => (k === 1 ? '1 drive' : `${k} drives`);
const scrNames = g => g.team.map(D.nameOf).join(', ');

// What the team score and driver are on this hole now, from the stored rows.
function scrStored(rid, gc, n) {
  const sc = D.scores(rid);
  const filled = gc.team.filter(pid => E.isEntered((sc[pid] || {})[n]));
  return { filled, values: Object.fromEntries(gc.team.map(pid => { const v = (sc[pid] || {})[n]; return [pid, v === undefined ? null : v]; })) };
}
function scrDraft(ctx, gc) {
  const byGroup = draftsFor(ctx);
  if (!byGroup[ctx.n]) {
    const st = scrStored(ctx.rid, gc, ctx.n);
    const d = { _base: st.values };
    if (st.filled.length === 1) { d.driver = st.filled[0]; d.score = st.values[st.filled[0]]; }
    byGroup[ctx.n] = d;
  }
  return byGroup[ctx.n];
}

/* Every player's drives so far, for any team (owner, 25 October: "awesome to know that a group in the lead might still
   have yet to get 3 tee shots from their weakest player"). A tick once they've done the minimum; red when the team is
   running out of holes for them. */
function scrDriveChips(t) {
  const tight = t.atRisk || t.impossible || t.failed;
  return `<span class="scr-chips">${t.team.map(pid => {
    const k = t.drives[pid] || 0, done = k >= t.minDrives;
    return `<span class="scr-chip${done ? ' ok' : tight ? ' warn' : ''}" aria-label="${esc(D.nameOf(pid))}: ${plural(k, 'drive')}${done ? ', done' : ` of ${t.minDrives}`}">${esc(D.nameOf(pid))} <b class="num">${done ? `${k}\u2713` : `${k}/${t.minDrives}`}</b></span>`;
  }).join('')}</span>`;
}
const scrOwed = t => t.team.reduce((s, pid) => s + Math.max(0, t.minDrives - (t.drives[pid] || 0)), 0);

/* The team results, best first. The KBs are marked; there is no winners' presentation (owner: avoiding last place is
   the drama). Drives under the minimum and holes with two drives saved are shown plainly. */
function scrambleTable(r, res) {
  const teams = res.teams || [];
  if (!teams.length) return sec(label('Teams'), cardOf('<div class="row"><span class="sub">Teams are not drawn yet</span></div>'));
  const rows = teams.map(t => {
    const notes = [];
    if (t.doubles.length) notes.push(`Two drives saved on ${t.doubles.join(', ')}`);
    if (t.failed) notes.push(`Short of drives: ${t.short.map(D.nameOf).join(', ')}`);
    else if (t.impossible) notes.push(`Not enough holes left for everyone's drives: KBs once finished`);
    else if (t.atRisk) notes.push(`Every drive from here has to come from someone short`);
    const thru = t.complete ? 'Finished' : t.played ? `Thru ${t.played}` : 'Not started';
    return `<div class="lrow scr-row${t.kb ? ' low' : ''}"><span class="sub">${esc(t.posLabel)}</span><span class="scr-team"><span class="b">${esc(t.name)}${t.kb ? ' <span class="pill w">KBs</span>' : ''}</span><span class="scr-thru">${esc(thru)}</span>${scrDriveChips(t)}${notes.length ? `<span class="scr-note">${esc(notes.join(' · '))}</span>` : ''}</span><span class="b r num">${t.total}</span></div>`;
  }).join('');
  return sec(label('Teams'), cardOf(rows) + `<p class="cap note">Team Stableford. Every player needs ${teams[0].minDrives} drives; a team that finishes short is KBs whatever its points.</p>`);
}

VIEWS.scramble = () => {
  let ctx = entryCtx();
  const rid = ctx.rid, r = D.round(rid), s = scrambleOf(rid);
  const gc = s && s.groups.find(g => g.id === ctx.gid);
  if (!gc) return VIEWS.round({ rid });
  if (ctx.mode === 'player' && cur().v === 'tee') {
    const ask0 = askPending(rid, gc, gc.id);
    if (ask0) return VIEWS.ask(rid, gc, ask0);
    if (!gc.nextHole) return VIEWS.scrambleFinish();
    const t = UI.teeHole, dr = ((DB.prefs.drafts[rid] || {})[gc.id] || {})[t];
    const working = t && gc.holes[t] && (!gc.holes[t].complete || (dr && (dr.score !== undefined || dr.driver)));
    UI.hole = UI.teeHole = working ? t : gc.nextHole;
    UI.edit = false;
    ctx = entryCtx();
  } else if (ctx.mode === 'player' && !ctx.edit) {
    const ask = askPending(rid, gc, gc.id);
    if (ask) return VIEWS.ask(rid, gc, ask);
  }
  const n = ctx.n, h = holeOf(rid, n), d = scrDraft(ctx, gc);
  const final = r.status === 'final';
  const shots = gc.scramble[n] ? gc.scramble[n].shots : 0;
  const st = scrStored(rid, gc, n);
  let html = '<div class="entry scr">';
  if (ctx.mode === 'org') html += `<div class="entnav"><button class="entback" data-act="entry-back" aria-label="Back">${ICON.back}<span>Back</span></button><span class="entgrp">Correcting ${esc(gc.name)}</span></div>`;
  html += `<header class="hero c pine entcard"><div class="entrow"><div class="entl"><small>HOLE</small>${ctx.mode === 'org' ? `<b class="entn">${n}</b>` : `<button class="holebtn" data-act="holes" aria-label="Go to a hole. Now on hole ${n}"><b class="entn">${n}</b><span class="hdown">${ICON.down}</span></button>`}</div><div class="entr"><b>Par ${h.par}</b><span>Index ${h.si}${h.yards ? ` · ${h.yards} yds` : ''}</span></div></div><div class="prog" role="img" aria-label="Hole ${n} of 18">${Array.from({ length: 18 }, (_, i) => i + 1).map(k => `<i class="${k === n ? 'cur' : gc.holes[k].complete ? 'done' : ''}"></i>`).join('')}</div></header>`;
  if (final) html += `<div class="banner" style="margin-top:12px">This round is final.</div>${ctx.mode === 'org' ? '<button class="btn quiet" data-act="reopen">Reopen round</button>' : ''}`;
  if (st.filled.length > 1) html += `<div class="banner warn" style="margin-top:12px"><b>Two drives saved for this hole:</b> ${st.filled.map(pid => `${esc(D.nameOf(pid))} ${fmtGross(st.values[pid])}`).join(', ')}. Pick the right drive and score, then save. Until then the hole doesn't count.</div>`;
  const clash = DB.conflicts.filter(c => c.round === rid && c.grp === gc.id && c.hole === n);
  if (clash.length && st.filled.length <= 1) html += `<div class="banner" style="margin-top:12px">Another phone saved ${clash.map(c => `${esc(D.nameOf(c.player))} ${fmtGross(c.server)}`).join(', ')}</div>`;

  /* In the order it happens (owner, 25 October): whose drive is picked walking off the tee, the score added on holing out.
     The drive choice is kept on this phone (it survives closing the app) until the score is saved with it. */
  html += `<div class="scr-team-head"><span class="b">${esc(gc.name)}</span><span class="sub">${esc(scrNames(gc))}</span></div>`;
  const left = gc.left;
  html += sec(label('Off the tee: whose drive?'), `<div class="scr-drives" role="radiogroup" aria-label="Whose drive was used">${gc.team.map(pid => {
    const on = d.driver === pid, k = gc.drives[pid] || 0;
    const need = Math.max(0, gc.minDrives - k);
    return `<button class="scr-drv${on ? ' on' : ''}${need && gc.atRisk ? ' need' : ''}" role="radio" aria-checked="${on}" data-act="scr-driver" data-pid="${pid}"><span class="av" aria-hidden="true">${esc(initialsOf(D.member(pid)))}</span><span class="scr-dn">${esc(D.nameOf(pid))}</span><span class="scr-dc">${scrDriveWord(k)}${need ? ` · needs ${need}` : ''}</span></button>`;
  }).join('')}</div>`);
  const owed = gc.short.reduce((t, pid) => t + gc.minDrives - gc.drives[pid], 0);
  const who = esc(gc.short.map(D.nameOf).join(' and '));
  if (gc.impossible) html += `<p class="scr-warn">${who} need ${owed} more drives with ${plural(left, 'hole')} left, so the team will be KBs.</p>`;
  else if (gc.atRisk) html += `<p class="scr-warn">${who} need ${owed} more drives with ${plural(left, 'hole')} left: every drive from here has to be theirs.</p>`;

  // The team score, on holing out
  const v = d.score;
  const pts = E.isEntered(v) ? E.stablefordPoints(v, h.par, shots) : null;
  html += sec(label('On the green: team score'), `<div class="scr-score card" aria-label="Team score">
    <div class="scr-step"><button class="scr-st" data-act="scr-score" data-dir="down" aria-label="One less for the team">−</button>
    <button class="scr-val num" data-act="scr-clear" aria-label="Team score ${E.isEntered(v) ? (v === 'P' ? 'picked up' : v) : 'not set'}">${E.isEntered(v) ? (v === 'P' ? '–' : v) : `<small>Par ${h.par}</small>`}</button>
    <button class="scr-st" data-act="scr-score" data-dir="up" aria-label="One more for the team">+</button></div>
    <div class="scr-meta"><span class="sub">${shots ? `${plural(shots, 'shot')} here` : 'No shots here'}${pts !== null ? ` · ${pts} pts` : ''}</span><button class="link" data-act="scr-pickup">${v === 'P' ? 'Picked up' : 'Pick up'}</button></div></div>`);

  const ready = E.isEntered(d.score) && d.driver;
  const lbl = !ready ? (!d.driver ? 'Pick whose drive' : 'Add the score when you hole out') : ctx.mode === 'org' ? 'Save correction' : ctx.edit || gc.holes[n].complete ? 'Save changes' : `Save hole ${n}`;
  html += `<div class="savebar"><button class="btn ${ready ? '' : 'quiet'}" data-act="scr-save">${lbl}</button>${saveWarning()}</div></div>`;
  if (ctx.mode === 'player') html += holesSheet(rid, gc, n);
  if (ctx.mode === 'player' && !ctx.edit && !UI.holeSheet && !gc.holes[n].complete && r.status === 'live') html += contestIntro(rid, gc, n);
  return ctx.mode === 'player' ? { html, tabs: 'hole' } : { html };
};

function scrCtx() {
  const ctx = entryCtx(), s = scrambleOf(ctx.rid), gc = s && s.groups.find(g => g.id === ctx.gid);
  return gc ? { ctx, gc, d: scrDraft(ctx, gc), h: holeOf(ctx.rid, ctx.n) } : null;
}
function scrEdit(fn) {
  const x = scrCtx();
  if (!x) return;
  if (D.round(x.ctx.rid).status === 'final') { toast('This round is final. Reopen it to change scores.'); return; }
  fn(x);
  savePrefs();
  render();
}
const scrScore = dir => scrEdit(({ d, h }) => {
  if (!E.isEntered(d.score) || d.score === 'P') { d.score = h.par; return; }
  d.score = Math.max(1, Math.min(15, d.score + (dir === 'up' ? 1 : -1)));
});
const scrPickup = () => scrEdit(({ d }) => { d.score = d.score === 'P' ? undefined : 'P'; });
const scrClear = () => scrEdit(({ d }) => { delete d.score; });
const scrDriver = pid => scrEdit(({ d }) => { d.driver = d.driver === pid ? undefined : pid; });

function scrSave() {
  const x = scrCtx();
  if (!x) return;
  const { ctx, gc, d } = x;
  const r = D.round(ctx.rid);
  if (!E.isEntered(d.score) || !d.driver) { toast(E.isEntered(d.score) ? 'Pick whose drive was used' : 'Set the team score first'); return; }
  if (r.status === 'final') { toast('This round is final. Reopen it to change scores.'); return; }
  const st = scrStored(ctx.rid, gc, ctx.n);
  const scores = {};
  gc.team.forEach(pid => {
    const clash = DB.conflicts.find(c => c.round === ctx.rid && c.grp === gc.id && c.hole === ctx.n && c.player === pid);
    const seen = d._base && pid in d._base ? d._base[pid] : st.values[pid];
    scores[pid] = { v: pid === d.driver ? d.score : null, base: clash ? clash.server : seen };
  });
  const req = { op: 'saveHole', round: ctx.rid, grp: gc.id, hole: ctx.n, scores, by: ctx.mode === 'org' ? 'Organiser' : byMe(),
    names: Object.fromEntries(gc.team.map(pid => [pid, D.nameOf(pid)])), label: `${roundName(r)} · ${gc.name} · Hole ${ctx.n} (drive: ${D.nameOf(d.driver)})` };
  if (ctx.mode === 'org') req.pin = ORGPIN.pin;
  DB.conflicts = DB.conflicts.filter(c => !(c.round === ctx.rid && c.grp === gc.id && c.hole === ctx.n));
  clearDraft(ctx);
  savePrefs();
  send(req);
  tick();
  if (ctx.mode === 'org') { back(); toast(`Hole ${ctx.n} saved`); return; }
  UI.edit = false; UI.after = null; UI.teeHole = null;
  replaceTop('tee', { rid: ctx.rid });
  toast(`Hole ${ctx.n} saved · ${D.nameOf(d.driver)}'s drive`);
}

VIEWS.scrambleFinish = () => {
  const rid = playRid(), s = scrambleOf(rid), g = myGroup(rid);
  const gc = s && g && s.groups.find(x => x.id === g.id);
  if (!gc) return VIEWS.round({ rid });
  const t = s.standings.find(x => x.id === gc.id) || gc;
  const drives = gc.team.map(pid => `<div class="row"><span>${esc(D.nameOf(pid))}</span><span class="right"><span class="b num">${gc.drives[pid]}</span>${gc.drives[pid] < gc.minDrives ? '<span class="pill w">Short</span>' : ''}</span></div>`).join('');
  const html = `<div class="after"><header class="hero c pine entcard"><div class="entrow"><div class="entl"><small>${esc(gc.name.toUpperCase())}</small><b class="entn">${t.total}</b></div><div class="entr"><b>Finished</b><span>Team Stableford</span></div></div></header>
    ${gc.failed ? `<div class="banner warn" style="margin-top:12px">Not everyone has ${gc.minDrives} drives, so the team is KBs whatever its points.</div>` : ''}
    ${sec(label('Drives used'), cardOf(drives))}
    <button class="btn" data-act="leaderboard" data-rid="${rid}">See the teams</button></div>`;
  return { html, tabs: 'hole' };
};
