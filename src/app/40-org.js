/* ================= ORGANISER ================= */
const ORG = {};
const orgTop = () => `<header class="hero s"><div class="nav"><span class="sub" style="display:inline-flex;align-items:center;gap:6px;margin:0">${sized(ICON.lock, 16)} PIN protected</span><button class="link" data-act="org-exit">Done</button></div><div class="head"><h1 class="title">Organiser</h1></div></header>`;
const field = (id, lbl, value, attrs = '') => `<div class="fld"><label class="sub" for="${id}">${lbl}</label><input id="${id}" class="field" value="${esc(value === null || value === undefined ? '' : value)}" ${attrs}></div>`;
const formErr = () => (UI.formError ? `<p class="err">${esc(UI.formError)}</p>` : '');
const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
const val = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
const num = id => { const v = val(id).replace(',', '.'); return v === '' ? null : Number(v); };

ORG.lock = () => ({
  html: `<header class="hero s"><div class="nav"><button class="link" data-act="org-exit">${ICON.back}Back</button></div>
    <div class="head"><h1 class="title">Organiser</h1></div></header>
    <form data-form="pin" autocomplete="off" class="sec near">
      <input id="pin" class="field" type="password" inputmode="numeric" maxlength="8" placeholder="PIN" aria-label="Organiser PIN">
      ${UI.pinError ? `<p class="err">${esc(UI.pinError)}</p>` : ''}
      <button class="btn" type="submit">Unlock</button>
    </form>
    ${BOOT.mode === 'live' ? '' : '<p class="cap" style="margin-top:16px;text-align:center">Preview PIN: 1234</p>'}`
});

function roundSummary(r) {
  const bits = [r.date ? fmtDate(r.date, true) : '', r.first_tee || ''].filter(Boolean).join(' · ');
  const st = isDemo(r) ? '<span class="pill w">Demo</span>' : r.status === 'live' ? '<span class="pill w">Live</span>' : r.status === 'final' ? '' : '<span class="pill n">Not started</span>';
  return `<button class="row tall" data-act="org-go" data-v="round" data-rid="${r.id}"><span class="two"><span>${esc(roundName(r))}</span><span class="sub">${esc(bits || roundWhenShort(r) || ' ')}</span></span><span class="right">${st}${chev}</span></button>`;
}


/* What still needs doing before the next round: each line opens the screen where it is done. */
function nextChecklist(r) {
  if (!r || r.status === 'final' || r.source === 'imported') return '';
  const tee = teeOf(r), c = courseOf(r);
  const items = [
    { ok: !!r.date, t: r.date ? 'Date' : 'Date: members see the round once it has one', go: ['details', r.id], need: true },
    { ok: !!(c && c.holes && tee), t: 'Course and tees', go: ['details', r.id], need: true },
    // A scramble's teams come from the breakfast draw, and it has no KB pairs to set up (UX review F01).
    isScramble(r)
      ? { ok: !!(r.groups && r.groups.length), t: !hasPots(r.id) ? 'Breakfast draw: set the pots' : r.groups && r.groups.length ? 'Teams drawn' : 'Breakfast draw', go: ['drawhome', r.id], need: true }
      : { ok: !!(r.groups && r.groups.length), t: 'Players and groups', go: ['groups', r.id], need: true },
    { ok: !!r.first_tee, t: 'First tee time', go: ['details', r.id], need: true },
    { ok: !!(r.contests && r.contests.length), t: 'Contests', go: ['details', r.id], need: false }
  ].concat(isScramble(r) ? [] : [{ ok: !!(E.kbOff(r) || (r.kb && r.kb.length)), t: 'KBs', go: ['kb', r.id], need: false }]);
  const left = items.filter(i => i.need && !i.ok).length;
  const head = `<span class="two"><span>${esc(roundName(r))}</span><span class="sub">${left ? `${plural(left, 'thing')} to do` : 'Ready to go'}</span></span>`;
  return sec(label('Next up'), cardOf(`<div class="row tall">${head}<span class="pill ${left ? 'w' : 'g'}">${left ? 'To do' : 'Ready'}</span></div>` +
    items.map(i => `<button class="row" data-act="org-go" data-v="${i.go[0]}" data-rid="${i.go[1]}"><span style="display:flex;align-items:center;gap:10px"><span class="chk${i.ok ? ' on' : ''}" aria-hidden="true">${i.ok ? sized(ICON.check, 16) : ''}</span>${i.t}${i.need ? '' : ' <span class="sub">optional</span>'}</span>${chev}</button>`).join('')), true);
}

ORG.home = () => {
  const active = D.rounds().filter(r => r.status !== 'final');
  const past = D.rounds().filter(r => r.status === 'final').reverse();
  const item = (v, icon, color, lbl) => `<button class="row" data-act="org-go" data-v="${v}"><span style="display:flex;align-items:center;gap:12px"><span class="ic" style="background:${color}">${icon}</span>${lbl}</span>${chev}</button>`;
  let html = orgTop();
  if (ORGPIN.weak) html += `<button class="banner warn" data-act="org-go" data-v="settings"><b>Change the organiser PIN.</b> It is still the starting one, and anyone who knows it can change scores. Tap to open Settings.</button>`;
  if (serverStale()) html += `<button class="banner warn" data-act="org-go" data-v="settings"><b>The server is out of date.</b> Upload the newest server.js to Drive so it matches this app. Tap for details.</button>`;
  if (D.testing()) html += `<button class="banner note" data-act="org-go" data-v="settings"><b>Testing mode is on.</b> Any round can be deleted. Turn it off in Settings before real rounds.</button>`;
  html += nextChecklist(active.find(r => r.status === 'upcoming' && !isDemo(r)));
  html += sec(label('Rounds'), cardOf(active.map(roundSummary).join('') + `<button class="row" data-act="org-new-round"><span class="c-g" style="display:inline-flex;align-items:center;gap:8px">${sized(ICON.plus, 20)}New round</span></button>`), true);
  html += sec(label('Manage'), cardOf(`${item('members', ICON.users, '#0A60C9', 'Members and handicaps')}${item('courses', ICON.course, '#1E7A3D', 'Courses')}${item('settings', ICON.gear, '#8E8E93', 'Settings')}${item('log', ICON.history, '#8E8E93', 'Change log')}${item('export', ICON.download, '#8E8E93', 'Export')}`));
  if (past.length) {
    const open = !!UI.open['org-past'];
    html += sec(label('Past rounds'), cardOf(`<button class="row" data-act="toggle" data-key="org-past" aria-expanded="${open}"><span>${plural(past.length, 'round')}</span>${chev}</button>${open ? past.map(roundSummary).join('') : ''}`));
  }
  if (BOOT.mode !== 'live') {
    html += sec(label('Preview'), cardOf(`${liveRid() ? '<button class="row" data-act="demo-fill"><span>Finish other groups with demo scores</span>' + chev + '</button>' : ''}<button class="row" data-act="reset-preview"><span class="c-b">${UI.confirm === 'reset' ? 'Tap again to start the preview again' : 'Start the preview again'}</span></button>`));
  }
  return { html };
};

function finaliseBlockers(r) {
  const comp = progressOf(r.id);
  if (!comp) return ['no scores'];
  const open = comp.groups.filter(g => !g.complete).length;
  const claims = D.claims(r.id);
  const wins = D.winners(r.id);
  const toConfirm = (r.contests || []).filter(c => (claims[c.hole] || []).length && !wins[c.hole]).length;
  const reasons = [];
  if (open) reasons.push(`${plural(open, isScramble(r) ? 'team' : 'group')} still playing`);
  if (toConfirm) reasons.push(`${plural(toConfirm, 'contest')} to confirm`);
  return reasons;
}

ORG.round = p => {
  const r = D.round(p.rid);
  if (!r) return { html: `${navBack('Organiser')}<p class="sub">Round deleted</p>` };
  const c = courseOf(r);
  const tee = teeOf(r);
  let html = `<header class="hero s">${navBack('Organiser')}<div class="head"><h1 class="title">${esc(roundName(r))}</h1>${statusPill(r)}</div>${roundWhen(r) ? `<p class="sub">${esc(roundWhen(r))}</p>` : ''}</header>`;
  if (r.source === 'imported') {
    html += sec('', cardOf(`<div class="row tall"><span class="sub">${esc(r.note || 'Imported results')}</span></div>`), true);
    return { html };
  }
  const nPlayers = (r.groups || []).reduce((s, g) => s + g.teams.flat().length, 0);
  const details = [c ? c.name : 'No course', tee ? tee.name : '', r.date ? fmtDate(r.date, true) : '', r.first_tee || ''].filter(Boolean).join(' · ');
  const locked = r.status !== 'upcoming';
  // The breakfast draw sits just above Groups: it is how a scramble's groups get made.
  // Once play starts the draw is history, so the row goes (UX review F16).
  const drawRow = r.status === 'upcoming' && (isScramble(r) || hasPots(r.id)) ? `<button class="row tall" data-act="org-go" data-v="drawhome" data-rid="${r.id}"><span class="two"><span>Breakfast draw</span><span class="sub">${!hasPots(r.id) ? 'Set the pots, then draw the teams' : drawMade(r) ? 'Done' : drawOf(r.id).st.started ? 'Under way' : 'Pots set'}</span></span>${chev}</button>` : '';
  html += sec('', cardOf(`
    <button class="row tall" data-act="org-go" data-v="details" data-rid="${r.id}"><span class="two"><span>Details</span><span class="sub">${esc(details)}</span></span>${chev}</button>
    ${drawRow}<button class="row tall" data-act="org-go" data-v="${r.status === 'final' ? 'groupsview' : 'groups'}" data-rid="${r.id}"><span class="two"><span>Groups</span><span class="sub">${r.groups && r.groups.length ? `${plural(nPlayers, 'player')} · ${plural(r.groups.length, isScramble(r) ? 'team' : 'group')}${locked && r.status !== 'final' ? isScramble(r) ? ' · teams fixed' : ' · withdraw only now' : ''}` : isScramble(r) || hasPots(r.id) ? 'Teams not drawn yet' : 'Not drawn'}</span></span>${chev}</button>
    <button class="row tall" data-act="org-format" data-rid="${r.id}"><span class="two"><span>Format</span><span class="sub">${isScramble(r) ? 'Scramble: one team score per group, drives recorded' : 'Individual Stableford'}</span></span><span class="pill ${isScramble(r) ? 'g' : 'n'}">${isScramble(r) ? 'Scramble' : 'Stableford'}</span></button>
    ${isScramble(r) ? `<button class="row tall" data-act="org-go" data-v="teamshots" data-rid="${r.id}"><span class="two"><span>Team shots</span><span class="sub">${(r.groups || []).map(g => `Team ${g.n}: ${teamShotsOf(r)[g.id] || 0}`).join(' · ') || 'Draw the teams first'}</span></span>${chev}</button>` : ''}
    ${r.trip ? `<button class="row tall" data-act="org-tripboard" data-rid="${r.id}"><span class="two"><span>Trip leaderboard</span><span class="sub">${tripBoardOn(r) ? `${esc(r.trip)} adds up the days` : `No combined board for ${esc(r.trip)}: each day has its own results`}</span></span><span class="pill ${tripBoardOn(r) ? 'g' : 'n'}">${tripBoardOn(r) ? 'On' : 'Off'}</span></button>` : ''}
    ${isScramble(r) ? '' : `<button class="row tall" data-act="org-go" data-v="kb" data-rid="${r.id}"><span class="two"><span>KBs</span><span class="sub">${E.kbOff(r) ? 'Off' : r.kb && r.kb.length ? plural(r.kb.length, 'pair') : 'None'}</span></span>${chev}</button>`}`), true);
  // Scores a phone sent after this round was final (or otherwise refused): they never reached the scores (review H1).
  const refused = D.log().filter(l => String(l.id).startsWith(`rej:${r.id}:`));
  if (refused.length) html += `<div class="banner warn"><b>${plural(refused.length, 'score')} sent by a phone ${refused.length === 1 ? 'was' : 'were'} not saved.</b>${refused.map(l => `<br>${esc(l.by)}: ${esc(l.detail)}`).join('')}<br>Correct the card here if they should count.</div>`;
  if (c && (!c.holes || !tee)) html += `<div class="banner note">${esc(c.name)} needs ${!c.holes ? 'its par and stroke index for each hole' : 'tee details'} before scores can be entered. <button class="link inline" data-act="org-go" data-v="course" data-cid="${c.id}">Add them</button></div>`;
  const comp = progressOf(r.id);
  if (comp && r.status !== 'upcoming') {
    html += sec(label(isScramble(r) ? 'Teams' : 'Groups'), cardOf(comp.groups.map(gc => {
      const sub = D.card(r.id, gc.id);
      const prog = gc.complete ? (sub ? 'Submitted' : 'Finished') : gc.holesDone ? `Thru ${gc.holesDone}` : 'Not started';
      return `<button class="row" data-act="org-go" data-v="group" data-rid="${r.id}" data-gid="${gc.id}"><span>${isScramble(r) ? 'Team' : 'Group'} ${gc.n}</span><span class="right sub nowrap"><span class="bar"><i style="width:${Math.round(gc.holesDone / 18 * 100)}%"></i></span>${prog}${chev}</span></button>`;
    }).join('')));
    const contests = r.contests || [];
    if (contests.length) {
      const claims = D.claims(r.id);
      const wins = D.winners(r.id);
      html += sec(label('Contests'), cardOf(contests.map(ct => {
        const cl = claims[ct.hole] || [];
        const win = wins[ct.hole];
        const right = win ? `<span class="b">${esc(D.nameOf(win))}</span>` : cl.length ? '<span class="pill w">Confirm</span>' : '<span class="sub">–</span>';
        return `<button class="row" data-act="org-go" data-v="contest" data-rid="${r.id}" data-n="${ct.hole}"><span>${CONTEST[ct.type]} <span class="sub">${ct.hole}</span></span><span class="right">${right}${chev}</span></button>`;
      }).join('')));
    }
  }
  if (r.status === 'live') {
    const reasons = finaliseBlockers(r);
    html += reasons.length ? `<div class="fin-wait"><p class="b">Before you can finalise</p><ul>${reasons.map(x => `<li>${esc(x.charAt(0).toUpperCase() + x.slice(1))}</li>`).join('')}</ul></div><button class="btn quiet" data-act="finalise" data-rid="${r.id}" aria-disabled="true">Finalise</button>`
      : `<button class="btn" data-act="finalise" data-rid="${r.id}">Finalise</button>`;
  } else if (r.status === 'final') {
    html += `<button class="btn quiet" data-act="reopen" data-rid="${r.id}">Reopen round</button>`;
  } else if (canScore(r)) {
    html += `<p class="cap" style="text-align:center">Goes live with the first score</p>`;   // the server starts it (server.js saveHole)
  }
  if (r.status === 'upcoming' || isDemo(r) || D.testing()) {
    const sc = Object.values(D.scores(r.id)).reduce((n, byHole) => n + Object.keys(byHole).length, 0);
    const warn = sc ? ` and its ${plural(sc, 'score')}` : '';
    html += `<div style="text-align:center;margin-top:8px"><button class="link c-b" data-act="delete-round" data-rid="${r.id}">${UI.confirm === 'del-' + r.id ? `Tap again to delete the round${warn}` : 'Delete round'}</button></div>`;
  }
  return { html };
};

/* ----- Round details ----- */
ORG.details = p => {
  const r = p.rid ? D.round(p.rid) : null;
  const st = UI.formState || (UI.formState = { course: r ? r.course : (D.courses().find(c => c.holes) || D.courses()[0] || {}).id });
  const c = D.course(st.course);
  const tees = c && c.tees ? Object.entries(c.tees) : [];
  const ntp = r && r.contests ? r.contests.filter(x => x.type === 'ntp').map(x => x.hole).join(', ') : '';
  const ld = r && r.contests ? r.contests.filter(x => x.type === 'ld').map(x => x.hole).join(', ') : '';
  return {
    html: `<header class="hero s">${navBack(r ? roundName(r) : 'Organiser')}<div class="head"><h1 class="title">${r ? 'Details' : 'New round'}</h1></div></header>
    <form data-form="details" autocomplete="off" class="sec near">
      <div class="fld"><label class="sub" for="f-course">Course</label><select id="f-course" class="field" data-change="details-course">${D.courses().map(x => `<option value="${x.id}"${x.id === st.course ? ' selected' : ''}>${esc(x.name)}${x.holes ? '' : ' (no card yet)'}</option>`).join('')}</select></div>
      <div class="fld"><label class="sub" for="f-tee">Tees</label><select id="f-tee" class="field">${tees.length ? tees.map(([k, t]) => `<option value="${k}"${r && r.tee === k ? ' selected' : ''}>${esc(t.name)} · ${t.slope} / ${t.rating}</option>`).join('') : '<option value="">Add tees to the course first</option>'}</select></div>
      ${field('f-date', 'Date', r ? r.date : '', 'type="date"')}
      <div class="two-col">${field('f-tee-time', 'First tee', r ? r.first_tee : '10:00', 'type="time"')}${field('f-interval', 'Minutes apart', r && r.interval ? r.interval : 8, 'inputmode="numeric"')}</div>
      <div class="two-col">${field('f-trip', 'Trip', r ? r.trip : '', 'placeholder="None"')}${field('f-day', 'Day', r ? r.trip_day : '', 'inputmode="numeric"')}</div>
      <div class="two-col">${field('f-ntp', 'Nearest the pin holes', ntp, 'inputmode="numeric" placeholder="7, 15"')}${field('f-ld', 'Longest drive holes', ld, 'inputmode="numeric" placeholder="12"')}</div>
      ${formErr()}
      <button class="btn" type="submit">Save</button>
    </form>`
  };
};

/* ----- Who is playing, and the draw ----- */
function draftFor(r) {
  if (!UI.draft || UI.draft.rid !== r.id) {
    UI.draft = { rid: r.id, ids: [] };
  }
  return UI.draft;
}
function priorTripGroups(r) {
  if (!r.trip) return [];
  return D.rounds().filter(x => x.trip === r.trip && x.season === r.season && x.id !== r.id && x.groups && (x.trip_day || 0) < (r.trip_day || 99)).map(x => ({ rid: x.id, groups: x.groups }));
}
ORG.playing = p => {
  // Nobody drawn yet: tick who's playing, then draw. The draw saves at once and this becomes the Groups screen.
  const r = D.round(p.rid);
  const d = draftFor(r);
  let html = `<header class="hero s">${navBack(roundName(r))}<div class="head"><h1 class="title">Groups</h1></div><p class="sub">Tick who's playing, then draw</p></header>`;
  html += sec(label(`Playing · ${d.ids.length}`), cardOf(D.active().map(m => {
    const on = d.ids.includes(m.id);
    return `<button class="row" data-act="org-toggle-player" data-pid="${m.id}" aria-pressed="${on}"><span>${esc(m.name)}${isGuest(m) ? ' <span class="pill n">Guest</span>' : ''}</span>${on ? `<span class="c-g">${sized(ICON.check, 20)}</span>` : ''}</button>`;
  }).join('') + `<button class="row" data-act="org-go" data-v="guest" data-rid="${r.id}"><span class="c-g" style="display:inline-flex;align-items:center;gap:8px">${sized(ICON.plus, 20)}Add a guest</span></button>`), true);
  if (d.ids.length >= 2) {
    html += `<button class="btn" data-act="org-draw" data-kind="random">Draw ${isScramble(r) ? 'teams' : 'groups'}</button>`;
    if (priorFinalDays(r).length) html += `<button class="btn quiet" style="margin-top:8px" data-act="org-draw" data-kind="standings">Leaders out last</button>`;
  }
  return { html };
};
function priorFinalDays(r) {
  return r.trip ? D.rounds().filter(x => x.trip === r.trip && x.season === r.season && x.id !== r.id && x.status === 'final' && (x.trip_day || 0) < (r.trip_day || 99)) : [];
}
/* Save a fresh draw as the round's groups, with tee times and KB pairs, in one write. */
function saveDraw(r, drawn, said) {
  const times = E.teeTimesFrom(r.first_tee || '', r.interval || 8, drawn.length);
  const allOff = E.kbOff(r);   // KBs switched off for the whole round stays off if the groups are redrawn
  const groups = drawn.map((g, i) => Object.assign({ id: 'g' + (i + 1), n: i + 1, teeTime: times[i] || '', startHole: 1, teams: g.teams }, allOff ? { noKb: true } : {}));
  let kb = null;
  const kg = E.kbGroups(Object.assign({}, r, { groups }));
  if (kg.length > 1 && !isScramble(r)) { const res = E.kbPairsFor(kg, (Date.now() % 100000) + 3, priorKbPairs(r.id)); kb = res.pairs.length ? res.pairs : null; }   // every drawn round gets KB pairs, no repeat partners
  put('rounds', [Object.assign({}, r, { groups, kb })], { action: said, detail: `${roundName(r)}: ${groups.map(g => `${g.teeTime} ${g.teams.map(t => t.map(D.nameOf).join(' & ')).join(' v ')}`).join('; ')}` });
}
ORG.groupsview = p => {
  const r = D.round(p.rid);
  return { html: `<header class="hero s">${navBack(roundName(r))}<div class="head"><h1 class="title">Groups</h1></div></header>${groupsBlock(r, false)}` };
};

/* Every KB pair from the other rounds (rounds scored in the app, and imported ones), so a new draw can avoid repeat partners */
function priorKbPairs(rid) {
  return D.rounds().filter(x => x.id !== rid).flatMap(x => (x.kb && x.kb.length ? x.kb : ((x.results && x.results.kb) || []).map(k => [k[0], k[1]])));
}
ORG.kb = p => {
  const r = D.round(p.rid);
  const d = UI.kbDraft && UI.kbDraft.rid === r.id ? UI.kbDraft : (UI.kbDraft = { rid: r.id, pairs: r.kb ? clone(r.kb) : [], sel: null });
  let html = `<header class="hero s">${navBack(roundName(r))}<div class="head"><h1 class="title">KBs</h1></div></header>`;
  if (!r.groups || !r.groups.length) return { html: html + sec('', cardOf('<div class="row sub">Draw the groups first</div>'), true) };
  if (E.kbOff(r)) return { html: html + sec('', cardOf('<div class="row"><span class="sub">KBs are off for this round. No pairs, no KBs on the results.</span></div>'), true) + `<button class="btn" data-act="org-kb-on">Turn KBs back on</button>` };
    const kg = E.kbGroups(r);
  if (r.groups.length > 1) html += sec('Groups in the KBs', cardOf(r.groups.map(g => `<button class="row tall" data-act="org-kb-group" data-gid="${g.id}"><span class="two"><span>Group ${g.n}</span><span class="sub">${esc(g.teams.flat().map(D.nameOf).join(', '))}</span></span><span class="b">${g.noKb ? 'Left out' : 'In'}</span></button>`).join('')), true);
  if (kg.length < 2) return { html: html + sec('', cardOf('<div class="row"><span class="sub">KBs need two groups or more. Put another group back in.</span></div>'), true) + `<div class="foot"><button class="link c-b" data-act="org-kb-clear">Turn KBs off for the round</button></div>` };
  if (!d.pairs.length && !r.kb) { const res = E.kbPairsFor(kg, (Date.now() % 100000) + 3, priorKbPairs(r.id)); d.pairs = res.pairs; }   // start from a fresh draw: just check it and save
  if (!d.pairs.length) return { html: html + `<button class="btn" data-act="org-kb-make">Make KB pairs</button>` };
  const seenKb = new Set(priorKbPairs(r.id).map(pr => [pr[0], pr[1]].sort().join('+')));
  const again = d.pairs.filter(pr => seenKb.has([pr[0], pr[1]].sort().join('+')));
  if (again.length) html += `<p class="cap note">${again.map(pr => esc(pr.map(D.nameOf).join(' & '))).join(', ')} ${again.length === 1 ? 'have' : 'have'} been KB partners before.</p>`;
  else html += '<p class="cap note">No repeat partners.</p>';
  html += sec('', cardOf(d.pairs.map(pr => `<div class="row kb-pair">${pr.map(pid => `<button class="chip${d.sel === pid ? ' on' : ''}" data-act="org-kb-swap" data-pid="${pid}">${esc(D.nameOf(pid))}</button>`).join('<span class="sub">&</span>')}</div>`).join('')), true);
  html += `<button class="btn" data-act="org-kb-save">Save KBs</button><div class="foot"><button class="link" data-act="org-kb-make">Shuffle</button><button class="link c-b" data-act="org-kb-clear">Turn KBs off for the round</button></div>`;
  return { html };
};

/* ----- Corrections and contests ----- */
ORG.group = p => {
  if (isScramble(D.round(p.rid))) {
    const s = scrambleOf(p.rid), gc = s && s.groups.find(g => g.id === p.gid);
    if (!gc) return { html: '' };
    const rows = E.playOrder(gc.teams && D.round(p.rid).groups.find(g => g.id === gc.id).startHole).map(n => {
      const h = gc.scramble[n], dbl = gc.holes[n].double;
      return `<button class="row" data-act="org-go" data-v="correct" data-rid="${p.rid}" data-gid="${gc.id}" data-n="${n}" aria-label="Correct hole ${n}"><span class="b num">${n}</span><span class="right">${dbl ? '<span class="pill w">Two drives</span>' : h.driver ? `<span class="sub">${esc(D.nameOf(h.driver))}</span><span class="b num">${h.gross === 'P' ? '–' : h.gross}<sup>${h.points}</sup></span>` : '<span class="sub">–</span>'}${chev}</span></button>`;
    }).join('');
    return { html: `<header class="hero s">${navBack('Round')}<div class="head"><h1 class="title">${esc(gc.name)}</h1></div><p class="sub">${esc(gc.team.map(D.nameOf).join(', '))} · ${gc.total} pts</p></header>${sec(label('Holes'), cardOf(rows))}` };
  }
  const comp = computeR(p.rid);
  const gc = comp.groups.find(g => g.id === p.gid);
  const pids = gc.teams.flat();
  const head = `<div class="orow"><span class="cap">Hole</span>${pids.map((pid, i) => `<span class="cap b ${i < 2 ? 'c-a' : 'c-b'}" title="${esc(D.nameOf(pid))}" aria-label="${esc(D.nameOf(pid))}">${esc(initialsOf(D.member(pid)) || D.nameOf(pid).slice(0, 2))}</span>`).join('')}</div>`;
  const rows = gc.order.map(n => `<button class="orow" data-act="org-go" data-v="correct" data-rid="${p.rid}" data-gid="${p.gid}" data-n="${n}" aria-label="Correct hole ${n}"><span class="b">${n}</span>${pids.map(pid => {
    const hp = comp.players[pid].holes[n];
    return `<span>${hp.gross === null ? '<span class="sub">–</span>' : `${hp.gross === 'P' ? '–' : hp.gross}<sup>${hp.points}</sup>`}</span>`;
  }).join('')}</button>`).join('');
  const checks = ['front', 'back'].map(sg => {
    const c = D.check(p.rid, gc.id, sg);
    const st = !c ? 'Not checked' : c.resolved ? `Checked${c.changes ? ` · ${plural(c.changes, 'change')}` : ''}` : c.status === 'reading' ? 'Reading' : 'Open';
    return `<${c ? 'button' : 'div'} class="row"${c ? ` data-act="photo-full" data-rid="${p.rid}" data-gid="${gc.id}" data-seg="${sg}"` : ''}><span>${segName(sg)}</span><span class="right ${c && c.resolved ? 'c-g' : 'sub'}">${st}${c ? chev : ''}</span></${c ? 'button' : 'div'}>`;
  }).join('');
  return {
    html: `<header class="hero s">${navBack(roundName(D.round(p.rid)))}<div class="head"><h1 class="title">Group ${gc.n}</h1></div><p class="sub names">${esc(gc.labels.map(l => l.long).join(' v '))}</p></header>
    ${sec(label('Card check'), cardOf(checks), true)}
    ${sec('', cardOf(head + rows), true)}`
  };
};
ORG.correct = () => VIEWS.entry();
// Team shots for a scramble (owner brief §6): normally 0; the committee may give some teams 2 or 3 to balance the field.
ORG.teamshots = p => {
  const r = D.round(p.rid), cur0 = teamShotsOf(r);
  return { html: `<header class="hero s">${navBack(esc(roundName(r)))}<div class="head"><h1 class="title">Team shots</h1></div><p class="sub">Shots each team gets, given by stroke index. Usually 0.</p></header>
    <form data-form="teamshots" autocomplete="off" class="sec near">${(r.groups || []).map(g => field('ts-' + g.id, `Team ${g.n} · ${g.teams.flat().map(D.nameOf).join(', ')}`, String(cur0[g.id] || 0), 'inputmode="numeric"')).join('')}
    ${formErr()}<button class="btn" type="submit">Save</button></form>` };
};
ORG.contest = p => {
  const n = Number(p.n);
  const c = contestOn(p.rid, n);
  const claims = (D.claims(p.rid)[n] || []).slice().reverse();
  const win = D.winners(p.rid)[n];
  const fmtT = iso => { try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  return {
    html: `<header class="hero s">${navBack(roundName(D.round(p.rid)))}<div class="head"><h1 class="title">${CONTEST[c.type]} · ${n}</h1></div><p class="sub">Latest claim first</p></header>
    ${sec('', cardOf(claims.length ? claims.map(cl => `<div class="row"><span>${esc(D.nameOf(cl.pid))} <span class="sub">· group ${groupNo(p.rid, cl.gid)} · ${fmtT(cl.at)}</span></span>
      ${win === cl.pid ? `<button class="link" data-act="org-unwin" data-rid="${p.rid}" data-n="${n}">Winner ${sized(ICON.check, 18)}</button>` : `<button class="link" data-act="org-win" data-rid="${p.rid}" data-n="${n}" data-pid="${cl.pid}">Confirm</button>`}</div>`).join('') : '<div class="row sub">No claims yet</div>'), true)}`
  };
};


/* ----- A guest, for one round ----- */
ORG.guest = p => ({
  html: `<header class="hero s">${navBack('Players')}<div class="head"><h1 class="title">Add a guest</h1></div><p class="sub">Guests play the round but are not members: they do not count for Golfer of the Year.</p></header>
  <form data-form="guest" autocomplete="off" class="sec near">
    ${field('g-name', 'Name', '', 'placeholder="Name"')}
    ${field('g-index', 'WHS index', '', 'inputmode="decimal" placeholder="e.g. 18.4"')}
    ${formErr()}
    <button class="btn" type="submit">Add guest</button>
  </form>`
});

/* ----- A change of player after the groups are saved ----- */
function scoresFor(rid, pid) { const sc = D.scores(rid)[pid]; return sc ? Object.keys(sc).length : 0; }
/* A scramble's team scores sit in the rows of whoever drove, so once any team has a score the teams are fixed for the
   whole round: swapping or removing anyone, even a teammate with no rows, could hide a team's hole and its drive
   (Codex review of #41). Before the first score, teams can change as usual. */
const rosterLocked = r => isScramble(r) && Object.values(D.scores(r.id)).some(h => Object.values(h || {}).some(v => v !== null && v !== undefined));
ORG.late = p => {
  const r = D.round(p.rid);
  const sel = UI.late && UI.late.rid === r.id ? UI.late.pid : null;
  let html = `<header class="hero s">${navBack(roundName(r))}<div class="head"><h1 class="title">Change a player</h1></div><p class="sub names">${sel ? esc(D.nameOf(sel)) : 'Tap the player who is changing'}</p></header>`;
  const inRound = new Set((r.groups || []).flatMap(g => g.teams.flat()));
  if (rosterLocked(r)) return { html: html + sec('', cardOf(`<div class="row tall"><span class="sub">The teams have started scoring, so players can't be swapped or taken out of this scramble: a team's holes are saved under whoever drove. Correct a hole on the team's screen instead.</span></div>`)) };
  if (!sel) {
    html += (r.groups || []).map((g, gi) => sec(label(`Group ${gi + 1}`), cardOf(g.teams.flat().map(pid => `<button class="row" data-act="late-pick" data-rid="${r.id}" data-pid="${pid}"><span>${esc(D.nameOf(pid))}</span>${scoresFor(r.id, pid) ? `<span class="sub">${plural(scoresFor(r.id, pid), 'score')}</span>` : chev}</button>`).join('')), gi === 0)).join('');
    return { html };
  }
  const n = scoresFor(r.id, sel);
  if (n) return { html: html + sec('', cardOf(`<div class="row tall"><span class="sub">${esc(D.nameOf(sel))} already has ${plural(n, 'score')} in this round, so they cannot be swapped or removed. Correct their scores on the group screen instead.</span></div>`), true) + `<button class="btn quiet" data-act="late-cancel">Back</button>` };
  const free = D.active().filter(m => !inRound.has(m.id));
  html += sec(label('Swap in'), cardOf(free.length ? free.map(m => `<button class="row" data-act="late-replace" data-rid="${r.id}" data-pid="${sel}" data-new="${m.id}"><span>${esc(m.name)}${isGuest(m) ? ' <span class="pill n">Guest</span>' : ''}</span><span class="sub">${fmtIndex(m.index)}</span></button>`).join('') : '<div class="row"><span class="sub">Everyone is already playing</span></div>') + `<button class="row" data-act="org-go" data-v="guest" data-rid="${r.id}"><span class="c-g" style="display:inline-flex;align-items:center;gap:8px">${sized(ICON.plus, 20)}Add a guest</span></button>`, true);
  html += sec('', cardOf(`<button class="row" data-act="late-drop" data-rid="${r.id}" data-pid="${sel}"><span class="c-b">${UI.confirm === 'drop-' + sel ? 'Tap again to take them out' : 'Takes no further part'}</span></button>`));
  html += `<button class="btn quiet" data-act="late-cancel">Cancel</button>`;
  return { html };
};
/* The round with one player swapped for another (or removed). KBs and handicap fixes follow the swap. */
function withPlayerChanged(r, pid, newPid) {
  const groups = r.groups.map(g => Object.assign({}, g, { teams: g.teams.map(t => t.map(x => x === pid ? newPid : x).filter(Boolean)).filter(t => t.length) })).filter(g => g.teams.length);
  const kb = r.kb ? r.kb.map(pr => pr.map(x => x === pid ? newPid : x)).filter(pr => pr.length === 2 && pr.every(Boolean)) : r.kb;
  const ph = r.ph ? Object.fromEntries(Object.entries(r.ph).filter(([k]) => k !== pid)) : r.ph;
  return Object.assign({}, r, { groups, kb: kb && kb.length ? kb : null, ph: ph && Object.keys(ph).length ? ph : null });
}

/* ----- Members ----- */
ORG.members = () => {
  const all = D.members();
  const row = m => `<button class="hrow" data-act="org-go" data-v="member" data-pid="${m.id}"><span class="nm lname">${avBadge(m.id)}<span class="ln"><span class="n">${esc(m.name)}</span></span></span><span></span><span class="r b num">${fmtIndex(m.index)}</span>${chev}</button>`;
  const former = all.filter(m => m.active === false && !isGuest(m));
  return {
    html: `<header class="hero s">${navBack('Organiser')}<div class="head"><h1 class="title">Members</h1></div></header>
    ${sec('', cardOf(`<div class="hrow cols"><span></span><span></span><span class="r cap">Index</span><span></span></div>${all.filter(m => m.active !== false && !isGuest(m)).map(row).join('')}<button class="row" data-act="org-go" data-v="member" data-pid=""><span class="c-g" style="display:inline-flex;align-items:center;gap:8px">${sized(ICON.plus, 20)}Add member</span></button>`), true)}
    ${former.length ? sec(label('Former members'), cardOf(former.map(row).join(''))) : ''}`
  };
};
ORG.member = p => {
  const m = p.pid ? D.member(p.pid) : null;
  return {
    html: `<header class="hero s">${navBack('Members')}<div class="head"><h1 class="title${m ? ' is-name' : ''}" ${m ? lenStyle(m.name) : ''}>${m ? esc(m.name) : 'New member'}</h1></div></header>
    <form data-form="member" autocomplete="off" class="sec near">
      ${field('m-name', 'Name on the leaderboard', m ? m.name : '', 'placeholder="Mike P"')}
      ${field('m-full', 'Full name', m ? m.full : '')}
      ${field('m-index', 'WHS index', m ? fmtIndex(m.index) : '', 'inputmode="decimal"')}
      ${m ? `<div class="fld"><label class="sub" for="m-active">Member</label><select id="m-active" class="field"><option value="yes"${m.active !== false ? ' selected' : ''}>Current member</option><option value="no"${m.active === false ? ' selected' : ''}>Former member</option></select></div>` : ''}
      ${formErr()}
      <button class="btn" type="submit">Save</button>
    </form>
    ${m ? '<p class="cap" style="margin-top:16px">Finished rounds keep the handicap they were played off.</p>' : ''}`
  };
};

/* ----- Courses ----- */
ORG.courses = () => ({
  html: `<header class="hero s">${navBack('Organiser')}<div class="head"><h1 class="title">Courses</h1></div></header>
  ${sec('', cardOf(D.courses().map(c => `<button class="row tall" data-act="org-go" data-v="course" data-cid="${c.id}"><span class="two"><span>${esc(c.name)}</span><span class="sub">${esc([c.area, c.holes ? 'Par ' + c.holes.reduce((s, h) => s + h.par, 0) : 'No card yet'].filter(Boolean).join(' · '))}</span></span>${chev}</button>`).join('') +
    `<button class="row" data-act="org-go" data-v="course" data-cid=""><span class="c-g" style="display:inline-flex;align-items:center;gap:8px">${sized(ICON.plus, 20)}Add course</span></button>`), true)}
  ${(() => { const ready = COURSE_LIBRARY.filter(x => !D.courses().some(c => libraryFor(c.name) === x));
    return ready.length ? sec(label('Ready to add'), cardOf(ready.map(x => `<button class="row tall" data-act="course-add-lib" data-name="${esc(x.name)}"><span class="two"><span>${esc(x.name)}</span><span class="sub">${esc(x.area)} · par ${x.holes.reduce((t, h) => t + h.par, 0)} · ${Object.values(x.tees).map(t => t.name).join(', ')} tees${x.check ? `<br>${esc(x.check)}` : ''}</span></span><span class="c-g">${sized(ICON.plus, 20)}</span></button>`).join(''))) : ''; })()}`
});
ORG.course = p => {
  const c = p.cid ? D.course(p.cid) : null;
  const tees = c && c.tees ? Object.entries(c.tees) : [];
  const teeRows = tees.concat([['', { name: '', slope: '', rating: '' }]]).map(([k, t], i) => `<div class="three-col">${field(`t-name-${i}`, i ? '' : 'Tees', t.name, `placeholder="${k ? '' : 'Add tees'}" data-key="${k}"`)}${field(`t-slope-${i}`, i ? '' : 'Slope', t.slope, 'inputmode="numeric"')}${field(`t-rating-${i}`, i ? '' : 'Rating', t.rating, 'inputmode="decimal"')}</div>`).join('');
  const holes = Array.from({ length: 18 }, (_, i) => (c && c.holes ? c.holes[i] : { n: i + 1, par: null, si: null, m: null }));
  const holeRows = holes.map((h, i) => `<div class="hole-row"><span class="b">${i + 1}</span>
    <select id="h-par-${i}" class="field sm" aria-label="Par hole ${i + 1}"><option value=""></option>${[3, 4, 5].map(v => `<option${h.par === v ? ' selected' : ''}>${v}</option>`).join('')}</select>
    <input id="h-si-${i}" class="field sm" inputmode="numeric" value="${h.si || ''}" aria-label="Index hole ${i + 1}">
    <input id="h-m-${i}" class="field sm" inputmode="numeric" value="${h.m || ''}" aria-label="Metres hole ${i + 1}"></div>`).join('');
  // A course with no card yet whose card is ready-made: fill it in with one tap (owner, 27 October).
  const lib = c && (!c.holes || !c.tees || !Object.keys(c.tees).length) ? libraryFor(c.name) : null;
  const fill = lib ? `<button class="btn" data-act="course-fill" data-cid="${c.id}">Fill in the ${esc(lib.name)} card</button><p class="cap" style="margin:8px 0 0">Par and stroke index for all 18 holes, and the slope and rating of the ${Object.values(lib.tees).map(t => t.name).join(', ')} tees. You can change any of it afterwards.</p>${lib.check ? `<p class="cap" style="margin:6px 0 0"><b>${esc(lib.check)}</b></p>` : ''}` : '';
  return {
    html: `<header class="hero s">${navBack('Courses')}<div class="head"><h1 class="title">${c ? esc(c.name) : 'New course'}</h1></div></header>${fill ? `<section class="sec near">${fill}</section>` : ''}
    <form data-form="course" autocomplete="off" class="sec near">
      ${field('c-name', 'Name', c ? c.name : '')}
      ${field('c-area', 'Area', c ? c.area : '', 'placeholder="Mayo"')}
      <div class="fld"><label class="sub" for="c-about">About the course</label><textarea id="c-about" class="field area" rows="3">${esc(c ? c.about : '')}</textarea></div>
      <div class="two-col">${field('c-lat', 'Latitude', c ? c.lat : '', 'inputmode="decimal" placeholder="53.81"')}${field('c-lon', 'Longitude', c ? c.lon : '', 'inputmode="decimal" placeholder="-9.57"')}</div>
      <div class="sec near">${teeRows}</div>
      <div class="sec"><div class="hole-row cols"><span class="cap">Hole</span><span class="cap">Par</span><span class="cap">Index</span><span class="cap">Metres</span></div>${holeRows}</div>
      ${formErr()}
      <div class="savebar"><button class="btn" type="submit">Save</button></div>
    </form>`
  };
};

/* ----- Settings, log, export ----- */
/* Season (owner, 24 October): the organiser starts each new season by hand, usually in January once the first round's
   date is set. Golfer of the Year then starts fresh; earlier seasons stay in Past rounds and the year picker. */
function seasonSection() {
  const cur = seasonOf(), next = cur + 1, set = !!Number(D.setting('season', 0));
  const live = !!liveRid();
  const start = live
    ? `<div class="row tall"><span class="two"><span>Start the ${next} season</span><span class="sub">After today's round is finished</span></span></div>`
    : `<button class="row tall" data-act="season-next"><span class="two"><span class="${UI.confirm === 'season-next' ? 'c-b' : ''}">${UI.confirm === 'season-next' ? `Tap again to start the ${next} season` : `Start the ${next} season`}</span><span class="sub">Golfer of the Year starts fresh. ${cur} stays in Past rounds.</span></span>${chev}</button>`;
  const undo = set && !live && seasonsList().includes(cur - 1)
    ? `<button class="row" data-act="season-back"><span class="${UI.confirm === 'season-back' ? 'c-b' : 'sub'}">${UI.confirm === 'season-back' ? `Tap again to go back to ${cur - 1}` : `Go back to ${cur - 1}`}</span></button>` : '';
  return sec(label('Season'), cardOf(`<div class="row"><span>Current season</span><span class="b num">${cur}</span></div>${start}${undo}`));
}

ORG.settings = () => ({
  html: `<header class="hero s">${navBack('Organiser')}<div class="head"><h1 class="title">Settings</h1></div></header>
  <form data-form="settings" autocomplete="off" class="sec near">
    ${field('s-name', 'Society', D.society())}
    <div class="two-col">${field('s-best', 'Golfer of the Year: scores that count', D.goyBest(), 'inputmode="numeric"')}${field('s-allow', 'Handicap allowance %', Math.round(D.allowance() * 100), 'inputmode="numeric"')}</div>
    ${formErr()}
    <button class="btn" type="submit">Save</button>
  </form>
  ${seasonSection()}
  ${sec(label('About'), cardOf(`<div class="row"><span>App</span><span class="sub num">${esc(String(BOOT.version || 'preview'))}</span></div><div class="row"><span>Server</span><span class="${serverStale() ? 'c-b b' : 'sub'} num">${BOOT.mode !== 'live' ? 'In this preview' : !DB.lastSync ? 'Not checked yet' : DB.serverBuild === 'old' ? 'Old version' : serverStale() ? 'Out of date' : 'Up to date'}</span></div>`))}
  ${sec(label('Testing'), cardOf(`<button class="row tall" data-act="testing-toggle" role="switch" aria-checked="${D.testing()}"><span class="two"><span>Testing mode</span><span class="sub">${D.testing() ? 'On: any round can be deleted, even one with scores. Turn this off before real rounds.' : 'Off: only rounds that have not started can be deleted.'}</span></span><span class="switch${D.testing() ? ' on' : ''}" aria-hidden="true"><i></i></span></button>`))}
  <form data-form="newpin" autocomplete="off" class="sec">
    ${field('s-pin', 'New organiser PIN', '', 'type="password" inputmode="numeric" maxlength="8"')}
    <button class="btn quiet" type="submit">Change PIN</button>
  </form>`
});
ORG.log = () => ({
  html: `<header class="hero s">${navBack('Organiser')}<div class="head"><h1 class="title">Change log</h1></div></header>
  ${sec('', cardOf(D.log().slice(0, 300).map(e => `<div class="logrow"><div class="b">${esc(e.action)}</div><div class="sub">${esc(e.detail)}</div>
    <div class="cap" style="margin-top:4px">${esc(e.by)} · ${e.at ? new Date(e.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</div></div>`).join('') || '<div class="row sub">Nothing yet</div>'), true)}`
});
function exportData() {
  const t = clone(view());
  delete t.deleted;
  return { exportedAt: new Date().toISOString(), society: D.society(), handicapRule: { allowance: D.allowance(), method: 'WHS: index × slope ÷ 113 + (rating − par), × allowance, rounded once' }, tables: t };
}
function exportCsv() {
  const lines = ['season,round,date,course,group,hole,par,stroke_index,player,playing_handicap,shots,strokes,points'];
  D.rounds().filter(r => hasCards(r) && !isDemo(r)).forEach(r => {
    const comp = computeR(r.id);
    const holes = holesOf(r);
    comp.groups.forEach(gc => gc.order.forEach(n => gc.teams.flat().forEach(pid => {
      const pl = comp.players[pid];
      const hp = pl.holes[n];
      if (hp.gross === null) return;
      lines.push([r.season, `"${roundName(r)}"`, r.date || '', `"${(courseOf(r) || {}).name || ''}"`, gc.n, n, holes[n - 1].par, holes[n - 1].si, `"${pl.name}"`, pl.ph, hp.shots, hp.gross === 'P' ? 'picked up' : hp.gross, hp.points].join(','));
    })));
  });
  return lines.join('\n');
}
ORG.export = () => ({
  html: `<header class="hero s">${navBack('Organiser')}<div class="head"><h1 class="title">Backup and export</h1></div></header>
  ${sec(label('Backup'), cardOf(`<button class="row tall" data-act="backup-now"><span class="two"><span>Back up now</span><span class="sub">${BOOT.mode === 'live' ? 'Saves a copy of the whole sheet in Drive' : 'Preview: nothing is saved to Drive'}</span></span>${chev}</button>`), true)}
  ${sec(label('Restore'), `<p class="cap note">Paste an export below to put back anything that has gone missing. Anything that is there now is left alone, so no newer score can be lost.</p><textarea class="export" id="restorejson" placeholder="Paste the export here" aria-label="Export to restore from"></textarea><button class="btn quiet" data-act="restore">${UI.confirm === 'restore' ? 'Tap again to restore' : 'Restore missing data'}</button>`)}
  ${sec(label('Everything (JSON)'), `<textarea class="export" id="exjson" readonly aria-label="All data as JSON">${esc(JSON.stringify(exportData(), null, 1))}</textarea>
    <button class="btn quiet" data-act="copy" data-target="exjson">Copy</button>`, true)}
  ${sec(label('Hole-by-hole scores (CSV)'), `<textarea class="export" id="excsv" readonly aria-label="Scores as CSV">${esc(exportCsv())}</textarea>
    <button class="btn quiet" data-act="copy" data-target="excsv">Copy</button>`)}`
});

/* ----- Preview only: finish the other groups ----- */
function demoFill() {
  const rid = liveRid();
  if (!rid) return;
  const comp = computeR(rid);
  if (!comp) { toast('Demo scores are for individual rounds only'); return; }
  const mine = myGroup(rid);
  let seed = 7 + view().log.length;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const filled = [];
  comp.groups.forEach(gc => {
    if (mine && gc.id === mine.id) return;
    let any = false;
    gc.order.forEach(n => {
      const scores = {};
      gc.teams.flat().forEach(pid => {
        if (comp.players[pid].holes[n].gross !== null) return;
        const h = holeOf(rid, n);
        const x = rnd();
        const dlt = x < 0.18 ? -1 : x < 0.62 ? 0 : x < 0.9 ? 1 : 2;
        scores[pid] = { v: Math.max(1, h.par + comp.players[pid].holes[n].shots + dlt), base: null };
      });
      if (Object.keys(scores).length) { any = true; send({ op: 'saveHole', round: rid, grp: gc.id, hole: n, scores, by: 'Demo' }); }
    });
    if (any) filled.push(gc.n);
  });
  toast(filled.length ? `Group${filled.length > 1 ? 's' : ''} ${filled.join(' and ')} finished` : 'Other groups are already finished');
}
