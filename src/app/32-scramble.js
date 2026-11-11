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

/* A player's drives as dots that fill in (owner, 25 October: visible for every team, few words). Red empty dots when
   the team is running out of holes for them. */
function scrDots(k, min, warn) {
  return `<span class="scr-dots${warn ? ' warn' : ''}" aria-hidden="true">${Array.from({ length: min }, (_, i) => `<i class="${i < k ? 'on' : ''}"></i>`).join('')}</span>`;
}
function scrDriveChips(t) {
  const tight = t.atRisk || t.impossible || t.failed;
  return `<span class="scr-chips">${t.team.map(pid => {
    const k = t.drives[pid] || 0;
    return `<span class="scr-pd" aria-label="${esc(D.nameOf(pid))}: ${plural(k, 'drive')}"><b>${esc(D.nameOf(pid))}</b>${scrDots(k, t.minDrives, tight && k < t.minDrives)}</span>`;
  }).join('')}</span>`;
}
const scrOwed = t => t.team.reduce((s, pid) => s + Math.max(0, t.minDrives - (t.drives[pid] || 0)), 0);

/* The team results, best first. The KBs are marked; there is no winners' presentation (owner: avoiding last place is
   the drama). Drives under the minimum and holes with two drives saved are shown plainly. */
/* A team's card: strokes on each hole (birdies circled, as on a player's card), whose drive, and the totals against par. */
function scrTeamCard(r, t) {
  const holes = holesOf(r), front = holes.slice(0, 9), back = holes.slice(9);
  const hs = t.scramble || t.holes;   // a team's per-hole strokes (scrambleOf keeps them under `scramble`)
  const ini = pid => esc(initialsOf(D.member(pid) || { name: D.nameOf(pid) }));
  const cell = h => { const x = hs[h.n] || {}; return `<td class="hn">${h.n}${x.shots ? ` <span class="sd">${x.shots > 0 ? '\u25CF'.repeat(x.shots) : '\u25CB'.repeat(-x.shots)}</span>` : ''}</td><td class="par">${h.par}</td><td>${Number.isInteger(x.gross) ? markCell(x.gross, h.par, 0) : ''}</td><td class="sub drv">${x.driver && Number.isInteger(x.gross) ? ini(x.driver) : ''}</td>`; };
  const tot = list => { const g = list.filter(h => hs[h.n] && Number.isInteger(hs[h.n].gross)); return { par: list.reduce((a, h) => a + h.par, 0), strokes: g.length ? g.reduce((a, h) => a + hs[h.n].gross, 0) : '\u2013' }; };
  const F = tot(front), B = tot(back);
  const table = `<table class="sc scr-sc"><thead><tr><th class="hn">Hole</th><th>Par</th><th>Score</th><th aria-label="Whose drive">By</th><th class="gap"></th><th class="hn">Hole</th><th>Par</th><th>Score</th><th aria-label="Whose drive">By</th></tr></thead>
    <tbody>${front.map((h, i) => `<tr>${cell(h)}<td class="gap"></td>${back[i] ? cell(back[i]) : '<td></td><td></td><td></td><td></td>'}</tr>`).join('')}
    <tr class="tot"><td class="hn">Out</td><td>${F.par}</td><td>${F.strokes}</td><td></td><td class="gap"></td><td class="hn">In</td><td>${B.par}</td><td>${B.strokes}</td><td></td></tr></tbody></table>`;
  const sum = [t.played ? `${t.strokes} strokes` : 'No holes yet', t.teamShots ? (t.teamShots > 0 ? `${t.teamShots} team ${t.teamShots === 1 ? 'shot' : 'shots'} off` : `${-t.teamShots} added`) : '', E.toParLabel(t.toPar)].filter(Boolean).join(' \u00B7 ');
  return table + `<p class="cap scr-sum">${sum}</p>`;
}
function scrambleTable(r, res) {
  const teams = res.teams || [];
  if (!teams.length) return sec(label('Teams'), cardOf('<div class="row"><span class="sub">Teams are not drawn yet</span></div>'));
  const rows = teams.map(t => {
    const thru = t.complete ? 'finished' : t.played ? `thru ${t.played}` : '';
    const flag = t.doubles.length ? ` <span class="pill w" title="Two drives saved">Check ${t.doubles.join(', ')}</span>` : '';
    // Tap a team for its hole-by-hole card (owner, 2 November).
    const key = `scr-${r.id}-${t.id}`, open = !!UI.open[key];
    return `<button class="lrow scr-row drop${open ? ' open' : ''}${t.kb ? ' low' : ''}" data-act="toggle" data-key="${key}" aria-expanded="${open}"><span class="sub scr-pos">${esc(t.posLabel)}</span><span class="scr-name"><b>${esc(t.name)}</b> <small>${esc(thru)}</small><span class="chev dn scr-chev">${chev}</span>${t.kb ? ' <span class="pill w">KBs</span>' : ''}${flag}</span><b class="scr-pts num" aria-label="${esc(t.toPar === 0 ? 'level par' : E.toParLabel(t.toPar))}">${E.toParLabel(t.toPar)}</b>${scrDriveChips(t)}</button>${open ? `<div class="dropcard">${scrTeamCard(r, t)}</div>` : ''}`;
  }).join('');
  return `<div class="scr-standings">${sec(label('Teams') + `<span class="scr-legend">Drives · ${teams[0].minDrives} each</span>`, cardOf(rows))}</div>`;
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
  const st = scrStored(rid, gc, n);
  let html = '<div class="entry scr">';
  if (ctx.mode === 'org') html += `<div class="entnav"><button class="entback" data-act="entry-back" aria-label="Back">${ICON.back}<span>Back</span></button><span class="entgrp">Correcting ${esc(gc.name)}</span></div>`;
  html += `<header class="hero c pine entcard"><div class="entrow"><div class="entl"><small>HOLE</small>${ctx.mode === 'org' ? `<b class="entn">${n}</b>` : `<button class="holebtn" data-act="holes" aria-label="Go to a hole. Now on hole ${n}"><b class="entn">${n}</b><span class="hdown">${ICON.down}</span></button>`}</div><div class="entr"><b>Par ${h.par}</b><span>Index ${h.si}${h.yards ? ` · ${h.yards} yds` : ''}</span></div></div><div class="prog" role="img" aria-label="Hole ${n} of 18">${Array.from({ length: 18 }, (_, i) => i + 1).map(k => `<i class="${k === n ? 'cur' : gc.holes[k].complete ? 'done' : ''}"></i>`).join('')}</div></header>`;
  if (final) html += `<div class="banner" style="margin-top:12px">This round is final.</div>${ctx.mode === 'org' ? '<button class="btn quiet" data-act="reopen">Reopen round</button>' : ''}`;
  if (st.filled.length > 1) html += `<div class="banner warn" style="margin-top:12px"><b>Two drives saved:</b> ${st.filled.map(pid => `${esc(D.nameOf(pid))} ${fmtGross(st.values[pid])}`).join(' · ')}. Pick one and save.</div>`;
  const clash = DB.conflicts.filter(c => c.round === rid && c.grp === gc.id && c.hole === n);
  if (clash.length && st.filled.length <= 1) html += `<div class="banner" style="margin-top:12px">Another phone saved ${clash.map(c => `${esc(D.nameOf(c.player))} ${fmtGross(c.server)}`).join(', ')}</div>`;

  /* In the order it happens (owner, 25 October): whose drive is picked walking off the tee, the score added on holing out.
     The drive choice is kept on this phone (it survives closing the app) until the score is saved with it. */
  const left = gc.left, tight = gc.atRisk || gc.impossible;
  // Preview the selected hole once: remove its stored contribution before adding the draft choice.
  // Official counts, minimum-drive warnings and saves still use the unchanged stored scores.
  const savedDriver = gc.scramble[n] && gc.scramble[n].driver;
  html += sec(label('Drive'), `<div class="scr-drives" role="radiogroup" aria-label="Whose drive was used">${gc.team.map(pid => {
    const on = d.driver === pid, stored = gc.drives[pid] || 0;
    const k = !final && d.driver ? stored - (savedDriver === pid ? 1 : 0) + (on ? 1 : 0) : stored;
    const note = on && k > 0 ? ctx.edit || final || gc.holes[n].complete ? plural(k, 'drive') : `${ordinal(k)} drive` : '';
    return `<button class="scr-drv${on ? ' on' : ''}" role="radio" aria-checked="${on}" data-act="scr-driver" data-pid="${pid}" aria-label="${esc(D.nameOf(pid))}, ${plural(k, 'drive')}${!final && d.driver ? ' after this selection' : ''}"${final ? ' disabled' : ''}><span class="scr-dn">${esc(D.nameOf(pid))}</span><span class="scr-drive-progress">${scrDots(k, gc.minDrives, tight && k < gc.minDrives)}${note ? `<span class="scr-drive-order">${note}</span>` : ''}</span></button>`;
  }).join('')}</div>`);
  // Say who still needs drives (UX review F13): amber while it can still be done, red once it can't.
  if (tight) {
    const by = {};
    gc.short.forEach(pid => { const k = gc.minDrives - gc.drives[pid]; (by[k] = by[k] || []).push(D.nameOf(pid)); });
    const and = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : a[0];
    const who = Object.keys(by).sort((a, b) => b - a).map(k => `${esc(and(by[k]))} ${by[k].length > 1 ? 'need' : 'needs'} ${plural(Number(k), 'more drive')}${by[k].length > 1 ? ' each' : ''}`).join('; ');
    html += gc.impossible
      ? `<p class="scr-warn bad">Not enough holes left for ${gc.minDrives} drives each: the team will be KBs.</p>`
      : `<p class="scr-warn">${who} · ${plural(left, 'hole')} left</p>`;
  }

  const v = d.score;
  // Stroke play (owner, 2 November): the team's strokes against par, no points and no pick-up.
  const num = Number.isInteger(v);
  const scoreWord = num ? E.scoreName(v, h.par) : '';
  html += sec(label('Score'), `<div class="bugs b0 scr-score" aria-label="Team score"><div class="pr ptile">
    <div class="pr-top"><span class="nm"><span class="nmrow">${esc(gc.name)}</span></span></div><span class="scr-topar num">${E.toParLabel(gc.toPar)}${gc.played ? ` thru ${gc.played}` : ''}</span>
    <div class="stepper" role="group" aria-label="Team strokes">
    ${num ? `<button class="stv" data-act="scr-clear" aria-label="Team score ${v} strokes, ${esc(scoreWord)}. Tap to clear"${final ? ' disabled' : ''}><b><span class="scr-val">${v}</span></b><small>${scoreWord}</small></button>` : `<div class="stv none">Par ${h.par}</div>`}
    <button class="st" data-act="scr-score" data-dir="down" aria-label="One less for the team"${final ? ' disabled' : ''}>−</button>
    <button class="st" data-act="scr-score" data-dir="up" aria-label="One more for the team"${final ? ' disabled' : ''}>+</button></div>
    </div></div>`);

  const ready = Number.isInteger(d.score) && d.driver;
  const lbl = ctx.mode === 'org' ? 'Save correction' : ctx.edit || gc.holes[n].complete ? 'Save changes' : `Save hole ${n}`;
  html += `<div class="savebar">${final && ctx.mode === 'player' ? `<button class="btn" data-act="leaderboard" data-rid="${rid}">See the results</button>` : `<button class="btn ${ready ? '' : 'quiet'}" data-act="scr-save"${final ? ' disabled' : ''}>${lbl}</button>`}${saveWarning()}</div></div>`;
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
const scrClear = () => scrEdit(({ d }) => { delete d.score; });
const scrDriver = pid => scrEdit(({ d }) => { d.driver = d.driver === pid ? undefined : pid; });

function scrSave() {
  const x = scrCtx();
  if (!x) return;
  const { ctx, gc, d } = x;
  const r = D.round(ctx.rid);
  // Stroke play: only a number of strokes is saved, never a pick-up (a draft from before 2 November may still hold one).
  if (!Number.isInteger(d.score) || !d.driver) { toast(Number.isInteger(d.score) ? 'Pick whose drive was used' : 'Set the team score first'); return; }
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
  const html = `<div class="after scr-finish"><header class="hero c pine entcard"><div class="entrow"><div class="entl"><small>${esc(gc.name.toUpperCase())}</small><b class="entn num">${E.toParLabel(t.toPar)}</b></div><div class="entr"><b>Finished</b><span>${t.strokes} strokes${t.teamShots ? ` · ${t.teamShots > 0 ? t.teamShots + ' shots off' : -t.teamShots + ' added'}` : ''}</span></div></div></header>
    ${gc.failed ? `<div class="banner warn" style="margin-top:12px">Not everyone has ${gc.minDrives} drives, so the team is KBs whatever its score.</div>` : ''}
    ${sec(label('Drives used'), cardOf(drives))}
    <button class="btn" data-act="leaderboard" data-rid="${rid}">See the teams</button></div>`;
  return { html, tabs: 'hole' };
};

