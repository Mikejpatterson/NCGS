/* ================= SOCIETY SCREENS ================= */
const VIEWS = {};

function roundRow(r, right) {
  const sub = roundWhenShort(r);
  return `<button class="row tall" data-act="round" data-rid="${r.id}"><span class="two"><span>${esc(roundName(r))}</span>${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</span><span class="right">${right || ''}${chev}</span></button>`;
}
function winnerText(r) {
  const res = resultsOf(r.id);
  if (!res || !res.rows.length) return '';
  const top = res.rows.filter(x => x.pos === 1);
  return `<span class="sub">${esc(top.map(x => x.name).join(', '))} ${top[0].total}</span>`;
}
const statusPill = r => {
  if (isDemo(r)) return '<span class="pill w">Demo</span>';
  if (r.status === 'live') { const c = computeR(r.id); const thru = c ? Math.min(...c.groups.map(g => g.holesDone)) : 0; return `<span class="pill w">${thru ? 'Thru ' + thru : 'Live'}</span>`; }
  if (r.status === 'final') return '<span class="pill g">Final</span>';
  return '';
};

/* ----- Front page: what is on now, what is next, then the past ----- */
const FLAG_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 21V3"/><path d="M7 4l11 4-11 5z" fill="currentColor"/><ellipse cx="7" cy="21" rx="4" ry="1.2"/></svg>';
function heroFacts(r) {
  const tee = teeOf(r);
  const bits = [r.trip];
  if (tee) bits.push(`${tee.name} tees`, `Par ${tee.par}`);
  if (r.first_tee) bits.push(`First tee ${r.first_tee}`);
  return bits.filter(Boolean).join(' · ');
}
function playLabel(r) {
  const mine = myGroup(r.id);
  if (!DB.prefs.me || !mine) return 'Play now';
  const gc = computeR(r.id).groups.find(g => g.id === mine.id);
  return gc.holesDone ? (gc.nextHole ? `Hole ${gc.nextHole}` : 'Group card') : 'Play now';
}
function nowCard(r) {
  const live = r.status === 'live';
  const playable = canScore(r) && (live || !r.date || daysFromToday(r.date) <= 0);
  const kind = live ? 'Today' : r.date && daysFromToday(r.date) === 0 ? 'Today' : 'Next round';
  const days = r.date ? daysFromToday(r.date) : null;
  const when = r.date && !live ? (days > 0 ? `${fmtDate(r.date, true)} · ${days === 1 ? 'tomorrow' : 'in ' + plural(days, 'day')}` : fmtDate(r.date, true)) : '';
  const line2 = when || (!live && !r.date ? 'Date to be confirmed' : '');
  return `<div class="now">
    <button class="now-main" data-act="round" data-rid="${r.id}">
      <span class="now-top"><span class="now-kind">${kind}</span>${statusPill(r)}</span>
      <span class="now-name">${esc(roundName(r))}</span>
      ${line2 ? `<span class="now-line">${esc(line2)}</span>` : ''}
      <span class="now-line">${esc(heroFacts(r))}</span>
    </button>
    <div class="now-acts${playable || live ? '' : ' one'}">
      ${playable ? `<button class="go" data-act="play" data-rid="${r.id}">${playLabel(r)}</button>` : `<button class="go" data-act="round" data-rid="${r.id}">Course, groups and forecast</button>`}
      ${live ? `<button class="go alt" data-act="leaderboard" data-rid="${r.id}">Leaderboard</button>` : playable ? `<button class="go alt" data-act="round" data-rid="${r.id}">Groups</button>` : ''}
    </div>
  </div>`;
}
VIEWS.home = () => {
  const season = seasonOf();
  const played = seasonRounds(season).filter(r => r.status === 'final');
  const live = D.rounds().filter(r => r.status === 'live');
  const next = upcoming();
  const feature = live[0] || next[0] || null;
  const more = [...live.slice(1), ...next.slice(live[0] ? 0 : 1)];
  const me = DB.prefs.me ? D.member(DB.prefs.me) : null;
  let html = `<header class="hero home"><div class="brand"><span class="badge">${FLAG_SVG}</span><span class="two"><span class="wordmark">${esc(D.society())}</span><span class="hsub">${season} season</span></span>
    <button class="who-chip" data-act="who">${me ? esc(me.name) : 'Who are you?'}</button></div>
    ${feature ? nowCard(feature) : '<div class="now"><div class="now-main"><span class="now-name">No round booked</span><span class="now-line">The organiser adds the next one.</span></div></div>'}</header>`;
  const table = goy(season);
  const lead = table[0];
  const pastAll = D.rounds().filter(r => r.status === 'final').reverse();
  const tile = (act, icon, t, s2) => `<button class="lnk" data-act="${act}"><span class="lnk-ic">${sized(icon, 24)}</span><span class="lnk-t">${t}</span><span class="lnk-s">${s2}</span></button>`;
  const tripFor = feature && feature.trip ? feature : (D.rounds().filter(r => r.trip).slice(-1)[0] || null);
  const tripList = tripFor ? tripRounds(tripFor) : [];
  const tripTile = tripList.length > 1 ? `<button class="lnk" data-act="trip" data-rid="${tripFor.id}"><span class="lnk-ic">${sized(ICON.trophy, 24)}</span><span class="lnk-t">Trip standings</span><span class="lnk-s">${esc(tripFor.trip)}</span></button>` : '';
  html += `<div class="links">
    ${tripTile}
    ${tile('rounds', ICON.history, 'Past rounds', pastAll.length ? `${pastAll.length} played` : 'None played yet')}
    ${tile('goy', ICON.trophy, 'Standings', lead ? `${esc(lead.name)} leads on ${lead.total}` : 'Golfer of the Year')}
    ${tile('players', ICON.users, 'Players', plural(D.active().length, 'golfer'))}
    ${tile('org', ICON.lock, 'Organiser', 'PIN needed')}
  </div>`;
  if (more.length) html += sec(label('Also on'), cardOf(more.map(r => roundRow(r, statusPill(r) || (r.first_tee ? `<span class="sub">${esc(r.first_tee)}</span>` : ''))).join('')));
  return { html };
};

VIEWS.rounds = () => {
  const season = seasonOf();
  const past = D.rounds().filter(r => r.status === 'final').reverse();
  return {
    html: `<header class="hero s">${navBack(D.society())}<div class="head"><h1 class="title">Past rounds</h1></div><p class="sub">${season} season · tap a round for the scorecards</p></header>
      ${past.length ? sec('', cardOf(past.map(r => roundRow(r, winnerText(r))).join('')), false) : sec('', '<div class="prose">No rounds played yet.</div>', false)}`
  };
};

VIEWS.players = () => {
  const season = seasonOf();
  const table = goy(season);
  const pos = Object.fromEntries(table.map(x => [x.id, x.posLabel]));
  return {
    html: `<header class="hero s">${navBack(D.society())}<div class="head"><h1 class="title">Players</h1></div><p class="sub">Tap a name for their cards</p></header>
      ${sec('', cardOf(D.active().map(m => `<button class="row tall" data-act="player" data-pid="${m.id}"><span class="two"><span>${esc(m.name)}</span><span class="sub">${esc([m.full && m.full !== m.name ? m.full : '', 'Index ' + fmtIndex(m.index)].filter(Boolean).join(' · '))}</span></span><span class="right">${pos[m.id] ? `<span class="sub">${posWord(pos[m.id])}</span>` : ''}${chev}</span></button>`).join('')), false)}`
  };
};

function goyRow(x) {
  return `<button class="lrow goy" data-act="player" data-pid="${x.id}"><span class="sub">${x.posLabel}</span><span class="${x.id === DB.prefs.me ? 'b' : ''}">${esc(x.name)}</span><span class="cap num">${x.counting.map(c => c.pts).join(' ')}</span><span class="b r">${x.total}</span></button>`;
}

VIEWS.goy = () => {
  const season = seasonOf();
  const table = goy(season);
  return {
    html: `<header class="hero s">${navBack(D.society())}<div class="head"><h1 class="title">Golfer of the Year</h1></div>
      <p class="sub">${season} · best ${D.goyBest()} scores count</p></header>
      ${sec('', cardOf(table.map(goyRow).join('')), false)}`
  };
};

/* ----- A round ----- */
const WX = { 0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Cloudy', 45: 'Fog', 48: 'Fog', 51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle', 56: 'Freezing drizzle', 57: 'Freezing drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow', 80: 'Showers', 81: 'Showers', 82: 'Heavy showers', 85: 'Snow showers', 86: 'Snow showers', 95: 'Thunderstorms', 96: 'Thunderstorms', 99: 'Thunderstorms' };
function forecast(r) {
  const c = courseOf(r);
  const away = daysFromToday(r.date);
  if (!c || c.lat === null || c.lon === null || c.lat === undefined || away === null || away < 0 || away > 9) return '';
  const st = UI.wx[c.id];
  if (!st) {
    UI.wx[c.id] = { state: 'loading' };
    call({ op: 'weather', lat: c.lat, lon: c.lon }).then(res => { UI.wx[c.id] = { state: 'done', data: res }; render(); })
      .catch(() => { UI.wx[c.id] = { state: 'failed' }; });
    return '';
  }
  if (st.state !== 'done' || !st.data || !st.data.days) return '';
  const d = st.data.days;
  const i = d.time.indexOf(r.date);
  if (i < 0) return '';
  let hours = '';
  const h = st.data.hours;
  const start = Number(String(r.first_tee || '10:00').split(':')[0]);
  if (h && h.time) {
    const cells = [];
    for (let k = 0; k < 5; k++) {
      const stamp = `${r.date}T${String(start + k).padStart(2, '0')}:00`;
      const j = h.time.indexOf(stamp);
      if (j >= 0) cells.push(`<span><span class="cap">${String(start + k).padStart(2, '0')}:00</span><span class="b">${Math.round(h.temperature_2m[j])}°</span><span class="cap">${h.precipitation_probability[j] !== null ? h.precipitation_probability[j] + '%' : ''}</span></span>`);
    }
    if (cells.length) hours = `<div class="hours">${cells.join('')}</div>`;
  }
  return sec(label('Forecast'), cardOf(`<div class="row tall"><span class="two"><span>${WX[d.weather_code[i]] || 'Mixed'}</span><span class="sub">Rain ${d.precipitation_probability_max[i]}% · Wind ${Math.round(d.wind_speed_10m_max[i])} km/h</span></span><span class="bignum">${Math.round(d.temperature_2m_max[i])}°<span class="sub"> ${Math.round(d.temperature_2m_min[i])}°</span></span></div>${hours}`));
}

function groupsBlock(r, interactive) {
  if (!r.groups || !r.groups.length) return sec(label('Groups'), cardOf('<div class="row"><span class="sub">To be drawn</span></div>'));
  const comp = computeR(r.id);
  const tee = teeOf(r);
  const phOf = pid => (r.ph && r.ph[pid] !== undefined ? r.ph[pid] : comp ? comp.players[pid].ph : tee && D.member(pid) ? E.playingHandicap(D.member(pid).index, tee, allowanceOf(r)) : null);
  const prow = g => g.teams.map((t, i) => t.map(pid => {
    const ph = phOf(pid);
    const m = D.member(pid);
    const can = interactive && tee && m;
    return `<${can ? 'button' : 'div'} class="hrow"${can ? ` data-act="hcp" data-pid="${pid}" data-rid="${r.id}"` : ''}>
      <span class="nm">${g.teams.length > 1 ? dot(i) : ''}<span class="${pid === DB.prefs.me ? 'b' : ''}">${esc(D.nameOf(pid))}</span></span>
      <span class="r sub">${m && r.status !== 'final' ? fmtIndex(m.index) : ''}</span><span class="r b">${ph === null ? '' : ph}</span>${can ? chev : '<span></span>'}</${can ? 'button' : 'div'}>`;
  }).join('')).join('');
  const cols = `<div class="hrow cols"><span></span><span class="r cap">${r.status !== 'final' ? 'Index' : ''}</span><span class="r cap">Playing</span><span></span></div>`;
  const mine = r.status !== 'final' ? myGroup(r.id) : null;
  let html = '';
  if (mine) {
    html += sec(`<span class="bignum">${esc(mine.teeTime || r.first_tee || '')}</span><span class="sub">Group ${mine.n}</span>`, cardOf(cols + prow(mine)) +
      (tee ? `<p class="cap note">${esc(tee.name)} tees · Slope ${tee.slope} · Rating ${tee.rating} · Par ${tee.par} · ${Math.round(allowanceOf(r) * 100)}%</p>` : ''));
  }
  const others = r.groups.filter(g => !mine || g.id !== mine.id);
  const live = r.status === 'live' ? computeR(r.id) : null;
  html += sec(label(mine ? 'Other groups' : 'Groups'), cardOf(others.map(g => {
    const key = r.id + g.id;
    const open = !!UI.open[key];
    const gc = live ? live.groups.find(x => x.id === g.id) : null;
    const prog = gc ? `<span class="cap">${gc.complete ? 'Finished' : gc.holesDone ? 'Thru ' + gc.holesDone : ''}</span>` : '';
    return `<button class="grow" data-act="toggle" data-key="${key}" aria-expanded="${open}"><span class="b num">${esc(g.teeTime || '')}</span>
      <span class="teams">${g.teams.map((t, i) => `<span>${g.teams.length > 1 ? dot(i) : ''}${esc(t.map(D.nameOf).join(' & '))}</span>`).join('')}${prog}</span>${chev}</button>${open ? cols + prow(g) : ''}`;
  }).join('')));
  return html;
}

/* A leaderboard row that drops the player's card down underneath it when tapped. */
function dropRow(rid, x, inner, cls = 'lrow') {
  const r = D.round(rid), comp = computeR(rid), pl = comp && comp.players[x.id];
  if (!r || !pl) return `<button class="${cls}" data-act="player" data-pid="${x.id}">${inner}</button>`;
  const key = `bd-${rid}-${x.id}`, open = !!UI.open[key];
  const mine = myGroup(rid);
  const fix = r.status === 'live' && !!mine && mine.teams.flat().includes(x.id);
  return `<button class="${cls} drop${open ? ' open' : ''}" data-act="toggle" data-key="${key}" aria-expanded="${open}">${inner}</button>${open ? `<div class="dropcard">${cardParts(r, pl, fix, x.id).table}${fix ? '<p class="cap sc-note">Tap a score to change it</p>' : ''}</div>` : ''}`;
}
const dropChev = `<span class="chev dn">${chev}</span>`;

function resultsBlock(r) {
  const res = resultsOf(r.id);
  if (!res) return '';
  const app = res.source === 'app';
  let html = sec(label('Stableford'), cardOf(res.rows.map(x => {
    const inner = `<span class="sub">${x.posLabel}</span><span class="${x.id === DB.prefs.me ? 'b' : ''}">${esc(x.name)}</span><span class="r"><span class="b">${x.total}</span>${app ? dropChev : ''}</span>`;
    return app ? dropRow(r.id, x, inner) : `<button class="lrow" data-act="player" data-pid="${x.id}">${inner}</button>`;
  }).join('')) + (res.source === 'recorded' ? '<p class="cap note">Order as recorded at the time</p>' : res.source === 'sheet' ? '<p class="cap note">From the 2026 sheet</p>' : ''));
  if (res.kb.length) {
    html += sec(label('KBs'), cardOf(res.kb.map(k => `<div class="lrow"><span class="sub">${k.posLabel}</span><span>${esc(k.name)}</span><span class="b r">${k.total}</span></div>`).join('')));
  }
  if (app && res.comp) {
    const comp = res.comp;
    const twoBuggies = comp.groups.filter(g => g.teams.length === 2 && g.teams.every(t => t.length === 2));
    if (twoBuggies.length) {
      html += sec(label('Buggy Wars'), twoBuggies.map(gc => cardOf(
        `<div class="row"><span class="sub">${esc(gc.labels[0].long)} v ${esc(gc.labels[1].long)}</span></div>` +
        ['front', 'back', 'overall'].map(s => `<div class="row"><span class="sub">${segName(s)}</span>${statusPills(gc.matches[s].status)}</div>`).join('')
      )).join('<div style="height:8px"></div>'));
      const lows = comp.pairs.filter(p => p.lowest);
      if (lows.length) html += sec(label('First round of drinks'), cardOf(lows.map(p => `<div class="row"><span>${esc(p.label)}</span><span class="right"><span class="pill w">Buying</span><span class="b num">${p.total}</span></span></div>`).join('')));
    }
  }
  const contests = res.contests.filter(c => c.winner !== undefined);
  if (contests.length) {
    html += sec(label('Contests'), cardOf(contests.map(c => `<div class="row"><span>${CONTEST[c.type]}${c.hole ? ` <span class="sub">${c.hole}</span>` : ''}</span>${c.winner ? `<span class="b">${esc(D.nameOf(c.winner))}</span>` : '<span class="sub">Not awarded</span>'}</div>`).join('')));
  }
  return html;
}

VIEWS.round = p => {
  const r = D.round(p.rid);
  if (!r) return { html: `${navBack(D.society())}<div class="head"><h1 class="title">Round not found</h1></div>` };
  const c = courseOf(r);
  const tee = teeOf(r);
  const holes = holesOf(r);
  const inPlay = UI.stack.some(e => ['tee', 'match', 'board', 'rules'].includes(e.v));
  const prev = UI.stack[UI.stack.length - 2];
  let html = '<header class="hero s">' + navBack(prev && prev.v === 'tee' ? `Hole ${UI.hole || ''}`.trim() : prev && prev.v === 'player' ? D.nameOf(prev.p.pid) : prev && prev.v === 'card' ? 'Card' : D.society());
  html += `<div class="head"><h1 class="title">${esc(roundName(r))}</h1>${statusPill(r)}</div>`;
  const when = roundWhen(r);
  if (when) html += `<p class="sub">${esc(when)}</p>`;
  const meta = [];
  if (tee) meta.push(`${tee.name} tees`, `Par ${tee.par}`);
  if (holes && holes.every(h => h.m)) meta.push(`${holes.reduce((s, h) => s + h.m, 0).toLocaleString('en-IE')} m`);
  if (r.status !== 'final' && r.first_tee) meta.push(`First tee ${r.first_tee}`);
  if (meta.length) html += `<p class="sub">${esc(meta.join(' · '))}</p>`;
  html += '</header>';

  if (r.status === 'final') {
    html += resultsBlock(r);
    if (r.groups && r.groups.length) html += groupsBlock(r, false);
    if (r.source !== 'imported' || (resultsOf(r.id) || { rows: [] }).rows.length) html += `<button class="btn quiet" data-act="results" data-rid="${r.id}">Share results</button>`;
    return { html };
  }
  html += forecast(r);
  if (c && c.about) html += sec(label('The course'), `<p class="prose">${esc(c.about)}</p>`);
  html += groupsBlock(r, true);
  if (r.kb && r.kb.length) html += sec(label('KBs'), cardOf(r.kb.map(pr => `<div class="row"><span>${esc(pr.map(D.nameOf).join(' & '))}</span></div>`).join('')));
  const mine = myGroup(r.id);
  const playable = canScore(r) && (r.status === 'live' || (r.status === 'upcoming' && (!r.date || daysFromToday(r.date) <= 0)));
  if (playable) {
    if (!DB.prefs.me || !mine) html += `<button class="btn" data-act="play" data-rid="${r.id}">Play now</button>`;
    else {
      const gc = computeR(r.id).groups.find(g => g.id === mine.id);
      html += `<button class="btn" data-act="play" data-rid="${r.id}">${inPlay || gc.holesDone ? (gc.nextHole ? `Hole ${gc.nextHole}` : 'Group card') : 'Play now'}</button>`;
    }
    if (DB.prefs.me && !mine) html += `<p class="cap" style="text-align:center;margin-top:8px">${esc(D.nameOf(DB.prefs.me))} is not in a group · <button class="link sm" data-act="who">Change</button></p>`;
  }
  if (r.status === 'live') html += `<button class="btn quiet" data-act="leaderboard" data-rid="${r.id}">Leaderboard</button>`;
  return { html };
};

/* ----- A player ----- */
VIEWS.player = p => {
  const m = D.member(p.pid);
  if (!m) return { html: `${navBack('Back')}<div class="head"><h1 class="title">Not found</h1></div>` };
  const season = seasonOf();
  const table = goy(season);
  const row = table.find(x => x.id === m.id);
  const counting = row ? row.countingRids.slice() : [];
  let html = '<header class="hero s">' + navBack('Back');
  html += `<div class="head"><h1 class="title">${esc(m.name)}</h1></div><p class="sub">${esc([m.full, 'Index ' + fmtIndex(m.index)].filter(Boolean).join(' · '))}</p>`;
  html += `<div class="tiles"><div class="tile flag"><span class="cap">GOY</span><span class="bignum">${row ? posWord(row.posLabel) : '–'}</span></div>
    <div class="tile"><span class="cap">Best ${D.goyBest()}</span><span class="bignum">${row ? row.total : '–'}</span></div>
    <div class="tile"><span class="cap">To beat</span><span class="bignum">${row && row.toBeat ? row.toBeat : '–'}</span></div></div></header>`;
  const rounds = seasonRounds(season).filter(r => r.status === 'final' || r.status === 'live').reverse();
  const rows = rounds.map(r => {
    const res = resultsOf(r.id);
    const me = res ? res.rows.find(x => x.id === m.id) : null;
    if (!me) return '';
    const live = r.status === 'live';
    const sub = [roundWhenShort(r), live ? 'In progress' : posWord(me.posLabel)].filter(Boolean).join(' · ');
    const act = hasCards(r) ? `data-act="card" data-rid="${r.id}" data-pid="${m.id}"` : `data-act="round" data-rid="${r.id}"`;
    const tag = counting.includes(r.id) ? '<span class="pill g">Counts</span>' : '';
    return `<button class="row tall" ${act}><span class="two"><span>${esc(roundName(r))}</span><span class="sub">${esc(sub)}</span></span><span class="right">${tag}<span class="b num">${me.total}</span>${chev}</span></button>`;
  }).filter(Boolean);
  html += sec(label(`${season} rounds`), cardOf(rows.length ? rows.join('') : '<div class="row"><span class="sub">No rounds yet</span></div>'));
  return { html };
};

/* ----- A player's card for one round ----- */
function markCell(gross, par, shots) {
  if (gross === null || gross === undefined) return '<span class="mk"></span>';
  // A pick-up shows the strokes that net no points, so the card still adds up.
  if (gross === 'P') return `<span class="mk pu" title="Picked up">${E.pickupStrokes(par, shots || 0)}<sup>p</sup></span>`;
  return `<span class="mk ${E.scoreMark(gross, par)}">${gross}</span>`;
}
function cardParts(r, pl, fix, pid) {
  const holes = holesOf(r);
  const half = hs => {
    // Running total of the strokes entered so far, the same way points run. A pick-up counts as the strokes that net 0 points.
    const g = hs.map(h => { const hp = pl.holes[h.n]; return hp.gross === 'P' ? E.pickupStrokes(h.par, hp.shots || 0) : hp.gross; }).filter(v => typeof v === 'number');
    const grossTot = g.length ? g.reduce((s, v) => s + v, 0) : '–';
    const pts = hs.reduce((s, h) => s + (pl.holes[h.n].points || 0), 0);
    return { grossTot, pts, par: hs.reduce((s, h) => s + h.par, 0) };
  };
  const front = holes.slice(0, 9), backNine = holes.slice(9);
  const F = half(front), B = half(backNine);
  const line = (a, b) => {
    const cell = h => {
      const hp = pl.holes[h.n];
      return `<td class="hn">${h.n}${hp.shots ? ` <span class="sd">${hp.shots > 0 ? '●'.repeat(hp.shots) : '○'.repeat(-hp.shots)}</span>` : ''}</td><td class="par">${h.par}</td><td>${fix && hp.gross !== null && hp.gross !== undefined ? `<button class="fixcell" data-act="fix-hole" data-rid="${r.id}" data-pid="${pid}" data-n="${h.n}" aria-label="Change hole ${h.n}">${markCell(hp.gross, h.par, hp.shots)}</button>` : markCell(hp.gross, h.par, hp.shots)}</td><td class="pts">${hp.points === null ? '' : `<span class="pp p${Math.min(hp.points, 4)}">${hp.points}</span>`}</td>`;
    };
    return `<tr>${cell(a)}<td class="gap"></td>${cell(b)}</tr>`;
  };
  const table = `<table class="sc"><thead><tr><th class="hn">Hole</th><th>Par</th><th>Score</th><th>Pts</th><th class="gap"></th><th class="hn">Hole</th><th>Par</th><th>Score</th><th>Pts</th></tr></thead>
    <tbody>${front.map((h, i) => line(h, backNine[i])).join('')}
    <tr class="tot"><td class="hn">Out</td><td>${F.par}</td><td>${F.grossTot}</td><td>${F.pts}</td><td class="gap"></td><td class="hn">In</td><td>${B.par}</td><td>${B.grossTot}</td><td>${B.pts}</td></tr></tbody></table>`;
  return { F, B, table };
}
VIEWS.card = p => {
  const r = D.round(p.rid);
  const comp = computeR(p.rid);
  const pl = comp ? comp.players[p.pid] : null;
  if (!r || !pl) return { html: `${navBack('Back')}<div class="head"><h1 class="title">No card</h1></div>` };
  const tee = teeOf(r);
  const res = resultsOf(r.id);
  const me = res.rows.find(x => x.id === p.pid);
  const { F, B, table } = cardParts(r, pl);
  const sub = [r.date ? fmtDate(r.date, true) : roundWhenShort(r), tee ? `${tee.name} · Par ${tee.par}` : '', `Playing hcp ${pl.ph}`].filter(Boolean).join(' · ');
  const html = `<header class="hero s">${navBack('Back')}
    <div class="head"><h1 class="title">${esc(pl.name)}</h1>${me && r.status === 'final' ? `<span class="sub">${posWord(me.posLabel)}</span>` : ''}</div>
    <p class="sub"><button class="link inline" data-act="round" data-rid="${r.id}">${esc(roundName(r))}</button> · ${esc(sub)}</p>
    ${isDemo(r) ? '<div class="note"><span class="pill w">Demo scores</span></div>' : ''}
    <div class="tiles"><div class="tile flag"><span class="cap">Points</span><span class="bignum">${pl.total}</span></div><div class="tile"><span class="cap">Out</span><span class="bignum">${F.pts}</span></div><div class="tile"><span class="cap">In</span><span class="bignum">${B.pts}</span></div></div></header>
    <div class="card sc-wrap">${table}</div>`;
  return { html };
};

/* ----- Who are you ----- */
VIEWS.who = p => {
  const list = D.active();
  return {
    html: `<header class="hero s">${UI.stack.length > 1 ? navBack('Back') : '<div class="nav"></div>'}<div class="head"><h1 class="title">Who are you?</h1></div><p class="sub">So your scores and card are yours.</p></header>
      ${sec('', cardOf(list.map(m => `<button class="row" data-act="pick" data-id="${m.id}"><span class="${m.id === DB.prefs.me ? 'b' : ''}">${esc(m.name)}</span>${m.id === DB.prefs.me ? `<span class="c-g">${sized(ICON.check, 20)}</span>` : chev}</button>`).join('')), false)}`
  };
};
