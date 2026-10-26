/* ----- Groups: one screen for every round, any day (owner, 26 October) -----
   Only the organiser. Before play starts, anything goes: move, swap, add, replace or take out a player, and change a
   group's tee time. Buggy pairs, KB pairs and tee times follow automatically (rules in src/groups.js). Each change is
   saved at once as one round row and logged. Once play starts, the only change is a withdrawal: from that hole on the
   player's scores are pick-ups (scratch), entered through the group's normal save. Nobody with scores is moved. */
const GR = window.Groups;
const grStarted = r => !!r && r.status !== 'upcoming';
const wdOf = (rid, pid) => { const v = Number(D.setting(`wd:${rid}:${pid}`, 0)); return v > 0 ? v : 0; };
const grSel = rid => (UI.gsel && UI.gsel.rid === rid ? UI.gsel : null);

/* Apply one change, tidy, repair KBs, save the round in one write, and say what happened. */
function grChange(rid, op, said) {
  const r = D.round(rid);
  if (!r || grStarted(r)) { toast('Play has started: the only change now is a withdrawal.'); return false; }
  const touched = [op.pid, op.with].filter(Boolean).filter(pid => scoresFor(rid, pid));
  if (touched.length) { toast(`${D.nameOf(touched[0])} already has scores, so they stay where they are.`); return false; }
  let groups;
  try {
    const ids = (r.groups || []).map(g => g.id);
    const newId = 'g' + (ids.reduce((m, id) => Math.max(m, Number(String(id).replace(/\D/g, '')) || 0), 0) + 1);
    groups = GR.tidy(GR.apply(r.groups || [], op, newId), r.first_tee || '', r.interval || 8, E.addMinutes);
  } catch (e) { toast(e.message); return false; }
  const out = new Set((r.groups || []).flatMap(g => g.teams.flat()));
  groups.forEach(g => g.teams.flat().forEach(pid => out.delete(pid)));
  let kb = r.kb, kbNote = '';
  if (!isScramble(r) && !E.kbOff(Object.assign({}, r, { groups }))) {
    const kg = groups.filter(g => !g.noKb);
    if (kg.length > 1) {
      const res = GR.repairKb(kg, r.kb, priorKbPairs(rid), E.shuffle, (Date.now() % 100000) + 3);
      kb = res.kb && res.kb.length ? res.kb : null;
      if (res.changed && res.changed.length) kbNote = ` New KB pairs: ${res.changed.map(p => p.map(D.nameOf).join(' & ')).join(', ')}.`;
    } else kb = null;
  } else if (isScramble(r)) kb = null;
  const ph = r.ph ? Object.fromEntries(Object.entries(r.ph).filter(([k]) => !out.has(k))) : r.ph;
  put('rounds', [Object.assign({}, r, { groups, kb, ph: ph && Object.keys(ph).length ? ph : null })], { action: 'Groups changed', detail: `${roundName(r)}: ${said}.${kbNote}` });
  UI.gsel = null; UI.confirm = null;
  toast(said + (kbNote ? ' KB pairs updated.' : ''));
  render();
  return true;
}

ORG.groups = p => {
  const r = D.round(p.rid);
  if (!r) return ORG.home();
  if (!r.groups || !r.groups.length) return ORG.playing(p);   // nobody drawn yet: pick players, then draw
  const scr = isScramble(r), live = grStarted(r), sel = grSel(r.id);
  const n = r.groups.reduce((s, g) => s + g.teams.flat().length, 0);
  // A scramble in play: teams are fixed and there's nothing to tap (UX review F18).
  const fixed = live && scr;
  const sub = fixed ? 'Play has started: the teams are fixed' : live ? 'Play has started: tap a player to withdraw them' : `${plural(n, 'player')} · tap a name or a group to change it`;
  let html = `<header class="hero s">${navBack(roundName(r))}<div class="head"><h1 class="title">Groups</h1></div><p class="sub">${esc(sub)}</p></header>`;
  if (sel && sel.mode === 'swap') html += `<div class="grp-swapbar"><span>${sel.only !== undefined ? `${esc(grName(r, sel.only))} is full. Tap who ${esc(D.nameOf(sel.pid))} swaps with.` : `Tap who ${esc(D.nameOf(sel.pid))} swaps with.`}</span><button class="link" data-act="grp-cancel">Cancel</button></div>`;
  r.groups.forEach((g, gi) => {
    const gOpen = sel && sel.gi === gi && !sel.pid;
    const head = `<button class="row tall grp-head${gOpen ? ' picked' : ''}" data-act="grp-group" data-rid="${r.id}" data-gi="${gi}" aria-expanded="${gOpen}"${live ? ' disabled' : ''}><span class="two"><b class="num">${esc(g.teeTime || '')}</b><span class="sub">${scr ? 'Team' : 'Group'} ${g.n}${g.teams.flat().length !== GR.MAX ? ` · ${plural(g.teams.flat().length, 'player')}` : ''}${g.startHole && g.startHole !== 1 ? ` · starts hole ${g.startHole}` : ''}</span></span></button>`;
    const rows = g.teams.map((t, i) => t.map(pid => {
      const on = sel && sel.pid === pid, wd = wdOf(r.id, pid), sc = scoresFor(r.id, pid);
      const note = wd ? `<span class="pill n">Withdrawn · hole ${wd}</span>` : sc && !live ? '<span class="sub">Has scores</span>' : !scr && g.teams.length > 1 ? `<span class="cap">Buggy ${i + 1}</span>` : '';
      const inner = `<span style="display:flex;align-items:center;gap:8px">${!scr && g.teams.length > 1 ? dot(i) : ''}${esc(D.nameOf(pid))}</span>${note}`;
      const row = fixed ? `<div class="row">${inner}</div>` : `<button class="row${on ? ' picked' : ''}" data-act="grp-pick" data-rid="${r.id}" data-pid="${pid}" aria-expanded="${!!on}">${inner}</button>`;
      return row + (on && sel.mode !== 'swap' ? grPlayerPanel(r, pid, gi) : '');
    }).join('')).join('');
    html += `<section class="sec near grp${sel && sel.only !== undefined && sel.only !== gi ? ' grp-dim' : ''}" id="grp-${gi}"><div class="card">${head}${gOpen ? grGroupPanel(r, gi) : ''}${rows}</div></section>`;
  });
  // A trip: say if anyone shares a buggy again with someone from an earlier day.
  const repeats = live || scr ? [] : E.repeatedPartners([...priorTripGroups(r), { rid: r.id, groups: r.groups }]).filter(x => x.rounds.includes(r.id));
  if (repeats.length) html = html.replace('</header>', `</header><div class="banner note">${repeats.map(x => `${esc(x.pair.map(D.nameOf).join(' & '))} shared a buggy before`).join('<br>')}</div>`);
  const anyScores = r.groups.some(g => g.teams.flat().some(pid => scoresFor(r.id, pid)));
  if (!live && !drawMade(r) && !anyScores) html += `<div class="foot"><button class="link" data-act="org-draw" data-kind="again">${UI.confirm === 'redraw-' + r.id ? 'Tap again: new groups from the same players' : `Draw ${scr ? 'teams' : 'groups'} again`}</button></div>`;
  return { html };
};

const grName = (r, gi) => { const g = r.groups[gi]; return `${isScramble(r) ? 'Team' : 'Group'} ${g.n}${g.teeTime ? ' (' + g.teeTime + ')' : ''}`; };
/* What can happen to a player: before play, move / swap / replace / take out; once play has started, withdraw. */
function grPlayerPanel(r, pid, gi) {
  const name = esc(D.nameOf(pid));
  if (grStarted(r)) {
    if (isScramble(r)) return `<div class="grp-panel"><p class="cap">A scramble team plays on as a team: no one needs withdrawing.</p></div>`;
    const wd = wdOf(r.id, pid);
    if (wd) return `<div class="grp-panel"><p class="cap">${name} picks up on every hole from ${wd}.</p><button class="btn quiet" data-act="grp-unwithdraw" data-rid="${r.id}" data-pid="${pid}">${UI.confirm === 'unwd-' + pid ? 'Tap again: back in' : 'Undo the withdrawal'}</button></div>`;
    const from = grNextHole(r, pid);
    return `<div class="grp-panel"><p class="cap">${name} picks up (scratch) on every hole from ${from}.</p><button class="btn" data-act="grp-withdraw" data-rid="${r.id}" data-pid="${pid}" data-from="${from}">${UI.confirm === 'wd-' + pid ? `Tap again to withdraw ${name}` : `Withdraw ${name} from hole ${from}`}</button></div>`;
  }
  if (scoresFor(r.id, pid)) return `<div class="grp-panel"><p class="cap">${name} already has scores in this round, so they stay where they are.</p></div>`;
  // A full group still takes them: tapping it asks who in that group they swap with.
  const moves = r.groups.map((g, j) => j === gi ? '' : `<button class="chipb" data-act="grp-move" data-rid="${r.id}" data-pid="${pid}" data-to="${j}">${esc(g.teeTime || (isScramble(r) ? 'Team ' : 'Group ') + g.n)}</button>`).join('');
  if (UI.gsel && UI.gsel.mode === 'replace') return `<div class="grp-panel"><p class="cap b">Who plays instead of ${name}?</p>${grPeople(r, 'grp-replace-with', `data-pid="${pid}"`)}<button class="btn quiet" data-act="grp-replace" data-rid="${r.id}" data-pid="${pid}">Cancel</button></div>`;
  return `<div class="grp-panel">
    <p class="cap">Move ${name} to</p><div class="chips">${moves}<button class="chipb" data-act="grp-move" data-rid="${r.id}" data-pid="${pid}" data-to="${r.groups.length}">New group</button></div>
    <div class="grp-acts"><button class="btn quiet" data-act="grp-swap" data-rid="${r.id}" data-pid="${pid}">Swap with…</button><button class="btn quiet" data-act="grp-replace" data-rid="${r.id}" data-pid="${pid}">Replace with…</button></div>
    <div class="grp-outzone"><button class="link c-b grp-out" data-act="grp-remove" data-rid="${r.id}" data-pid="${pid}">${UI.confirm === 'out-' + pid ? `Tap again to take ${name} out` : `Take ${name} out of the round`}</button></div></div>`;
}
/* What can happen to a group: add a player, go out earlier or later. */
function grGroupPanel(r, gi) {
  const g = r.groups[gi], full = g.teams.flat().length >= GR.MAX, last = r.groups.length - 1;
  return `<div class="grp-panel">
    <div class="grp-acts">${gi > 0 ? `<button class="btn quiet" data-act="grp-order" data-rid="${r.id}" data-gi="${gi}" data-to="${gi - 1}">Earlier</button>` : ''}${gi < last ? `<button class="btn quiet" data-act="grp-order" data-rid="${r.id}" data-gi="${gi}" data-to="${gi + 1}">Later</button>` : ''}${gi < last - 1 ? `<button class="btn quiet" data-act="grp-order" data-rid="${r.id}" data-gi="${gi}" data-to="${last}">Out last</button>` : ''}${gi > 1 ? `<button class="btn quiet" data-act="grp-order" data-rid="${r.id}" data-gi="${gi}" data-to="0">Out first</button>` : ''}</div>
    ${full ? `<p class="cap">This ${isScramble(r) ? 'team' : 'group'} has ${GR.MAX}.</p>` : `<p class="cap">Add a player</p>${grPeople(r, 'grp-add', `data-to="${gi}"`)}`}
    ${grStartRow(r, gi)}</div>`;
}
/* Starting hole lives in the group's options: shotgun starts are rare (journeys 2/13). */
function grStartRow(r, gi) {
  const sh = r.groups[gi].startHole || 1, n = (holesOf(r) || []).length || 18;
  return `<div class="grp-start"><label class="cap" for="sh-${gi}">Starts on hole</label><select id="sh-${gi}" class="field short" data-change="grp-start" data-rid="${r.id}" data-gi="${gi}">${Array.from({ length: n }, (_, k) => `<option value="${k + 1}"${sh === k + 1 ? ' selected' : ''}>${k + 1}</option>`).join('')}</select></div>`;
}
function grStart(rid, gi, hole) {
  const r = D.round(rid);
  if (!r || grStarted(r) || !r.groups[gi]) return;
  const groups = r.groups.map((g, i) => i === gi ? Object.assign({}, g, { startHole: hole }) : g);
  put('rounds', [Object.assign({}, r, { groups })], { action: 'Groups changed', detail: `${roundName(r)}: ${r.groups[gi].teeTime || 'Group ' + r.groups[gi].n} starts on hole ${hole}` });
  toast(`${r.groups[gi].teeTime || 'Group ' + r.groups[gi].n} starts on hole ${hole}`);
  render();
}
/* Members not playing (and guests), plus a way to add a new guest. */
function grPeople(r, act, extra) {
  const playing = new Set(r.groups.flatMap(g => g.teams.flat()));
  const free = D.active().filter(m => !playing.has(m.id));
  return `<div class="card grp-people">${free.map(m => `<button class="row" data-act="${act}" data-rid="${r.id}" ${extra} data-new="${m.id}"><span>${esc(m.name)}${isGuest(m) ? ' <span class="pill n">Guest</span>' : ''}</span><span class="sub num">${fmtIndex(m.index)}</span></button>`).join('') || '<div class="row"><span class="sub">Everyone is already playing</span></div>'}
    <button class="row" data-act="org-go" data-v="guest" data-rid="${r.id}"><span class="c-g" style="display:inline-flex;align-items:center;gap:8px">${sized(ICON.plus, 20)}New guest</span></button></div>`;
}
/* The first hole this player's group hasn't saved yet: a withdrawal starts there. */
function grNextHole(r, pid) {
  const gc = progressOf(r.id).groups.find(g => g.teams.flat().includes(pid));
  return (gc && gc.nextHole) || 1;
}

const GROUP_ACT = {
  'grp-pick': el => {
    const rid = el.dataset.rid, pid = el.dataset.pid, sel = grSel(rid);
    if (sel && sel.mode === 'swap' && sel.pid !== pid) { grChange(rid, { type: 'swap', pid: sel.pid, with: pid }, `${D.nameOf(sel.pid)} and ${D.nameOf(pid)} swapped`); return; }
    UI.gsel = sel && sel.pid === pid ? null : { rid, pid }; UI.confirm = null; render();
  },
  'grp-group': el => { const rid = el.dataset.rid, gi = Number(el.dataset.gi), sel = grSel(rid); UI.gsel = sel && !sel.pid && sel.gi === gi ? null : { rid, gi }; UI.confirm = null; render(); },
  'grp-cancel': () => { UI.gsel = null; render(); },
  'grp-move': el => { const r = D.round(el.dataset.rid), to = Number(el.dataset.to), g = r.groups[to];
    if (g && g.teams.flat().length >= GR.MAX) { UI.gsel = { rid: r.id, pid: el.dataset.pid, mode: 'swap', only: to }; render(); const t = document.getElementById('grp-' + to); if (t && t.scrollIntoView) t.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    grChange(r.id, { type: 'move', pid: el.dataset.pid, to }, `${D.nameOf(el.dataset.pid)} moved to ${g ? (g.teeTime || 'group ' + g.n) : 'a new group at the end'}`); },
  'grp-swap': el => { UI.gsel = { rid: el.dataset.rid, pid: el.dataset.pid, mode: 'swap' }; render(); },
  'grp-replace': el => { const s = grSel(el.dataset.rid); UI.gsel = { rid: el.dataset.rid, pid: el.dataset.pid, mode: s && s.mode === 'replace' ? null : 'replace' }; render(); },
  'grp-replace-with': el => grChange(el.dataset.rid, { type: 'replace', pid: el.dataset.pid, add: el.dataset.new }, `${D.nameOf(el.dataset.new)} in for ${D.nameOf(el.dataset.pid)}`),
  'grp-remove': el => {
    const pid = el.dataset.pid;
    if (UI.confirm !== 'out-' + pid) { UI.confirm = 'out-' + pid; render(); return; }
    grChange(el.dataset.rid, { type: 'remove', pid }, `${D.nameOf(pid)} taken out`);
  },
  'grp-add': el => grChange(el.dataset.rid, { type: 'add', add: el.dataset.new, to: Number(el.dataset.to) }, `${D.nameOf(el.dataset.new)} added`),
  'grp-order': el => { const r = D.round(el.dataset.rid), from = Number(el.dataset.gi), to = Number(el.dataset.to); if (to < 0 || to >= r.groups.length) return; grChange(r.id, { type: 'order', from, to }, `${r.groups[from].teeTime || 'Group ' + r.groups[from].n} group now goes out ${to === r.groups.length - 1 ? 'last' : 'at ' + (r.groups[to].teeTime || 'position ' + (to + 1))}`); },
  'grp-withdraw': el => {
    const rid = el.dataset.rid, pid = el.dataset.pid, from = Number(el.dataset.from) || 1;
    if (UI.confirm !== 'wd-' + pid) { UI.confirm = 'wd-' + pid; render(); return; }
    put('settings', [{ key: `wd:${rid}:${pid}`, value: String(from) }], { action: 'Player withdrew', detail: `${roundName(D.round(rid))}: ${D.nameOf(pid)}, pick-ups from hole ${from}` });
    UI.gsel = null; UI.confirm = null; toast(`${D.nameOf(pid)} withdrawn: pick-ups from hole ${from}`); render();
  },
  'grp-unwithdraw': el => {
    const rid = el.dataset.rid, pid = el.dataset.pid;
    if (UI.confirm !== 'unwd-' + pid) { UI.confirm = 'unwd-' + pid; render(); return; }
    put('settings', [{ key: `wd:${rid}:${pid}`, value: '' }], { action: 'Withdrawal undone', detail: `${roundName(D.round(rid))}: ${D.nameOf(pid)}` });
    UI.gsel = null; UI.confirm = null; render();
  }
};
