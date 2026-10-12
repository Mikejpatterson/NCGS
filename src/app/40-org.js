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

ORG.home = () => {
  const active = D.rounds().filter(r => r.status !== 'final');
  const past = D.rounds().filter(r => r.status === 'final').reverse();
  const item = (v, icon, color, lbl) => `<button class="row" data-act="org-go" data-v="${v}"><span style="display:flex;align-items:center;gap:12px"><span class="ic" style="background:${color}">${icon}</span>${lbl}</span>${chev}</button>`;
  let html = orgTop();
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
  const comp = computeR(r.id);
  if (!comp) return ['no scores'];
  const open = comp.groups.filter(g => !g.complete).length;
  const claims = D.claims(r.id);
  const wins = D.winners(r.id);
  const toConfirm = (r.contests || []).filter(c => (claims[c.hole] || []).length && !wins[c.hole]).length;
  const reasons = [];
  if (open) reasons.push(`${plural(open, 'card')} open`);
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
  html += sec('', cardOf(`
    <button class="row tall" data-act="org-go" data-v="details" data-rid="${r.id}"><span class="two"><span>Details</span><span class="sub">${esc(details)}</span></span>${chev}</button>
    <button class="row tall" data-act="org-go" data-v="${locked ? 'groupsview' : 'playing'}" data-rid="${r.id}"><span class="two"><span>Groups and buggies</span><span class="sub">${r.groups && r.groups.length ? `${plural(nPlayers, 'player')} · ${plural(r.groups.length, 'group')}` : 'Not drawn'}</span></span>${chev}</button>
    <button class="row tall" data-act="org-go" data-v="kb" data-rid="${r.id}"><span class="two"><span>KBs</span><span class="sub">${r.kb && r.kb.length ? plural(r.kb.length, 'pair') : 'None'}</span></span>${chev}</button>`), true);
  if (c && (!c.holes || !tee)) html += `<div class="banner note">${esc(c.name)} needs ${!c.holes ? 'its par and stroke index for each hole' : 'tee details'} before scores can be entered. <button class="link inline" data-act="org-go" data-v="course" data-cid="${c.id}">Add them</button></div>`;
  const comp = computeR(r.id);
  if (comp && r.status !== 'upcoming') {
    html += sec(label('Groups'), cardOf(comp.groups.map(gc => {
      const sub = D.card(r.id, gc.id);
      const prog = gc.complete ? (sub ? 'Submitted' : 'Finished') : gc.holesDone ? `Thru ${gc.holesDone}` : 'Not started';
      return `<button class="row" data-act="org-go" data-v="group" data-rid="${r.id}" data-gid="${gc.id}"><span>Group ${gc.n}</span><span class="right sub"><span class="bar"><i style="width:${Math.round(gc.holesDone / 18 * 100)}%"></i></span>${prog}${chev}</span></button>`;
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
    html += reasons.length ? `<button class="btn quiet" data-act="finalise" data-rid="${r.id}">Finalise<small style="color:var(--sub)">${esc(reasons.join(' · '))}</small></button>`
      : `<button class="btn" data-act="finalise" data-rid="${r.id}">Finalise</button>`;
  } else if (r.status === 'final') {
    html += `<button class="btn quiet" data-act="reopen" data-rid="${r.id}">Reopen round</button>`;
  } else {
    const why = !canScore(r) ? (r.groups && r.groups.length ? 'Course details needed' : 'Draw the groups first') : liveRid() ? 'Another round is live' : '';
    html += `<button class="btn ${why ? 'quiet' : ''}" data-act="start-round" data-rid="${r.id}">Start round${why ? `<small style="color:var(--sub)">${esc(why)}</small>` : ''}</button>`;
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
      <div class="two-col">${field('f-tee-time', 'First tee', r ? r.first_tee : '', 'type="time"')}${field('f-interval', 'Minutes between groups', r && r.interval ? r.interval : 8, 'inputmode="numeric"')}</div>
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
    UI.draft = { rid: r.id, ids: r.groups ? r.groups.flatMap(g => g.teams.flat()) : [], groups: r.groups ? clone(r.groups) : null, repeats: [], sel: null };
  }
  return UI.draft;
}
function priorTripGroups(r) {
  if (!r.trip) return [];
  return D.rounds().filter(x => x.trip === r.trip && x.season === r.season && x.id !== r.id && x.groups && (x.trip_day || 0) < (r.trip_day || 99)).map(x => ({ rid: x.id, groups: x.groups }));
}
ORG.playing = p => {
  const r = D.round(p.rid);
  const d = draftFor(r);
  let html = `<header class="hero s">${navBack(roundName(r))}<div class="head"><h1 class="title">Groups and buggies</h1></div></header>`;
  if (!d.groups) {
    html += sec(label(`Playing · ${d.ids.length}`), cardOf(D.active().map(m => {
      const on = d.ids.includes(m.id);
      return `<button class="row" data-act="org-toggle-player" data-pid="${m.id}" aria-pressed="${on}"><span>${esc(m.name)}</span>${on ? `<span class="c-g">${sized(ICON.check, 20)}</span>` : ''}</button>`;
    }).join('')), true);
    const priorFinal = r.trip ? D.rounds().filter(x => x.trip === r.trip && x.season === r.season && x.id !== r.id && x.status === 'final' && (x.trip_day || 0) < (r.trip_day || 99)) : [];
    if (d.ids.length >= 2) {
      html += `<button class="btn" data-act="org-draw" data-kind="random">Draw groups</button>`;
      if (priorFinal.length) html += `<button class="btn quiet" style="margin-top:8px" data-act="org-draw" data-kind="standings">Leaders out last</button>`;
    }
    return { html };
  }
  const sel = d.sel;
  html = html.replace('</header>', `<p class="sub head-sub">${plural(d.ids.length, 'player')} · first tee ${esc(r.first_tee || 'not set')}</p></header>`);
  if (d.repeats.length) html += `<div class="banner note">${d.repeats.map(x => `${esc(x.pair.map(D.nameOf).join(' & '))} shared a buggy before`).join('<br>')}</div>`;
  const times = E.teeTimesFrom(r.first_tee || '', r.interval || 8, d.groups.length);
  d.groups.forEach((g, gi) => {
    html += sec(`<span class="b">Group ${gi + 1}</span><span class="sub">${esc(times[gi] || '')}</span>`, cardOf(g.teams.map((t, i) => t.map(pid =>
      `<button class="row${sel === pid ? ' picked' : ''}" data-act="org-swap" data-pid="${pid}"><span style="display:flex;align-items:center;gap:8px">${g.teams.length > 1 ? dot(i) : ''}${esc(D.nameOf(pid))}</span>${g.teams.length > 1 ? `<span class="cap">Buggy ${i + 1}</span>` : ''}</button>`).join('')).join('')), true);
  });
  html += `<button class="btn" data-act="org-save-groups">Save groups</button>
    <div class="foot"><button class="link" data-act="org-draw" data-kind="again">Draw again</button><button class="link" data-act="org-draw" data-kind="players">Change players</button></div>`;
  return { html };
};
ORG.groupsview = p => {
  const r = D.round(p.rid);
  return { html: `<header class="hero s">${navBack(roundName(r))}<div class="head"><h1 class="title">Groups and buggies</h1></div></header>${groupsBlock(r, false)}` };
};

ORG.kb = p => {
  const r = D.round(p.rid);
  const d = UI.kbDraft && UI.kbDraft.rid === r.id ? UI.kbDraft : (UI.kbDraft = { rid: r.id, pairs: r.kb ? clone(r.kb) : [], sel: null });
  let html = `<header class="hero s">${navBack(roundName(r))}<div class="head"><h1 class="title">KBs</h1></div></header>`;
  if (!r.groups || !r.groups.length) return { html: html + sec('', cardOf('<div class="row sub">Draw the groups first</div>'), true) };
  if (!d.pairs.length) return { html: html + `<button class="btn" data-act="org-kb-make">Make KB pairs</button>` };
  html += sec('', cardOf(d.pairs.map(pr => `<div class="row">${pr.map(pid => `<button class="chip${d.sel === pid ? ' on' : ''}" data-act="org-kb-swap" data-pid="${pid}">${esc(D.nameOf(pid))}</button>`).join('<span class="sub">&</span>')}</div>`).join('')), true);
  html += `<button class="btn" data-act="org-kb-save">Save KBs</button><div class="foot"><button class="link" data-act="org-kb-make">Shuffle</button><button class="link c-b" data-act="org-kb-clear">No KBs</button></div>`;
  return { html };
};

/* ----- Corrections and contests ----- */
ORG.group = p => {
  const comp = computeR(p.rid);
  const gc = comp.groups.find(g => g.id === p.gid);
  const pids = gc.teams.flat();
  const head = `<div class="orow"><span class="cap">Hole</span>${pids.map((pid, i) => `<span class="cap b ${i < 2 ? 'c-a' : 'c-b'}">${esc(D.nameOf(pid))}</span>`).join('')}</div>`;
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
    html: `<header class="hero s">${navBack(roundName(D.round(p.rid)))}<div class="head"><h1 class="title">Group ${gc.n}</h1></div><p class="sub">${esc(gc.labels.map(l => l.long).join(' v '))}</p></header>
    ${sec(label('Card check'), cardOf(checks), true)}
    ${sec('', cardOf(head + rows), true)}`
  };
};
ORG.correct = () => VIEWS.entry();
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

/* ----- Members ----- */
ORG.members = () => {
  const all = D.members();
  const row = m => `<button class="hrow" data-act="org-go" data-v="member" data-pid="${m.id}"><span class="nm">${esc(m.name)}</span><span></span><span class="r b num">${fmtIndex(m.index)}</span>${chev}</button>`;
  const former = all.filter(m => m.active === false);
  return {
    html: `<header class="hero s">${navBack('Organiser')}<div class="head"><h1 class="title">Members</h1></div></header>
    ${sec('', cardOf(`<div class="hrow cols"><span></span><span></span><span class="r cap">Index</span><span></span></div>${all.filter(m => m.active !== false).map(row).join('')}<button class="row" data-act="org-go" data-v="member" data-pid=""><span class="c-g" style="display:inline-flex;align-items:center;gap:8px">${sized(ICON.plus, 20)}Add member</span></button>`), true)}
    ${former.length ? sec(label('Former members'), cardOf(former.map(row).join(''))) : ''}`
  };
};
ORG.member = p => {
  const m = p.pid ? D.member(p.pid) : null;
  return {
    html: `<header class="hero s">${navBack('Members')}<div class="head"><h1 class="title">${m ? esc(m.name) : 'New member'}</h1></div></header>
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
    `<button class="row" data-act="org-go" data-v="course" data-cid=""><span class="c-g" style="display:inline-flex;align-items:center;gap:8px">${sized(ICON.plus, 20)}Add course</span></button>`), true)}`
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
  return {
    html: `<header class="hero s">${navBack('Courses')}<div class="head"><h1 class="title">${c ? esc(c.name) : 'New course'}</h1></div></header>
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
ORG.settings = () => ({
  html: `<header class="hero s">${navBack('Organiser')}<div class="head"><h1 class="title">Settings</h1></div></header>
  <form data-form="settings" autocomplete="off" class="sec near">
    ${field('s-name', 'Society', D.society())}
    <div class="two-col">${field('s-best', 'Golfer of the Year: scores that count', D.goyBest(), 'inputmode="numeric"')}${field('s-allow', 'Handicap allowance %', Math.round(D.allowance() * 100), 'inputmode="numeric"')}</div>
    ${formErr()}
    <button class="btn" type="submit">Save</button>
  </form>
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
  html: `<header class="hero s">${navBack('Organiser')}<div class="head"><h1 class="title">Export</h1></div></header>
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
