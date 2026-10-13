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
/* The top three of a live round, and you if you are lower down. Taken from the same leaderboard as the Results tab. */
function miniBoard(r) {
  const res = resultsOf(r.id);
  const rows = res && res.rows ? res.rows : [];
  if (!rows.length) return '';
  let show = rows.slice(0, 3);
  const mine = DB.prefs.me ? rows.find(x => x.id === DB.prefs.me) : null;
  if (mine && !show.includes(mine)) show = [show[0], show[1], mine];
  return `<div class="mini num">${show.map(x => `<div class="mr${x.id === DB.prefs.me ? ' me' : ''}"><span class="mp">${esc(x.posLabel)}</span><span class="mn">${esc(x.name)}${x.id === DB.prefs.me ? ' <small>YOU</small>' : ''}</span><span class="mt">${x.total}</span></div>`).join('')}</div>`;
}
function homeHeadline(feature) {
  if (!feature) return 'No round booked yet';
  const nm = roundName(feature);
  if (feature.status === 'live') {
    const res = resultsOf(feature.id);
    const rows = res && res.rows ? res.rows : [];
    if (rows.length > 1 && rows[0].total > rows[1].total) { const d = rows[0].total - rows[1].total; return `${rows[0].name} leads ${nm} by ${d === 1 ? 'one' : d === 2 ? 'two' : d}`; }
    if (rows.length > 1) return `${nm} is all square at the top`;
    return `${nm} is under way`;
  }
  const days = feature.date ? daysFromToday(feature.date) : null;
  if (days === 0) return `${nm} is on today`;
  if (days === 1) return `${nm} is tomorrow`;
  if (days > 1) return `${nm} is in ${days} days`;
  return nm;
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
    ${live ? miniBoard(r) : ''}
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
  const myRow = me ? goy(season).find(x => x.id === me.id) : null;
  const standLine = myRow ? `<button class="hsub me-line" data-act="player" data-pid="${me.id}">${posWord(myRow.posLabel)} in Golfer of the Year${sized(ICON.chev, 14)}</button>` : '';
  const hr = new Date().getHours();
  const dateLine = new Date().toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' }) + (me ? ` · ${hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'}, ${esc(me.name.split(' ')[0])}` : '');
  let html = `<header class="hero home"><div class="brand"><span class="badge">${FLAG_SVG}</span><span class="two"><span class="wordmark">${esc(D.society())}</span>${standLine}</span>
    <button class="who-chip" data-act="who" aria-label="${me ? 'You are ' + esc(me.name) + '. Change' : 'Who are you?'}">${me ? esc(me.name) + `<span class="who-av">${esc(initialsOf(me))}</span>` : 'Who are you?'}</button></div>
    <p class="greet">${dateLine}</p><h1 class="headline">${esc(homeHeadline(feature))}</h1>
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
    ${tile('rounds', ICON.history, 'Past rounds', played.length ? `${played.length} played` : 'None played yet')}
    ${tile('goy', ICON.trophy, 'Golfer of the Year', lead ? `${esc(lead.name)} leads on ${lead.total}` : 'Best ' + D.goyBest() + ' scores count')}
    ${tile('stats', ICON.history, 'Stats', 'KBs, birdies, averages')}
    ${tile('players', ICON.users, 'Players', plural(D.regulars().length, 'golfer'))}
  </div>`;
  if (more.length) html += sec(label('Also on'), cardOf(more.map(r => roundRow(r, statusPill(r) || (r.first_tee ? `<span class="sub">${esc(r.first_tee)}</span>` : ''))).join('')));
  html += '<p class="foot"><button class="link" data-act="org">Organiser</button></p>';
  return { html, tabs: 'home' };
};

VIEWS.rounds = () => {
  const yr = yearOn();
  const past = D.rounds().filter(r => r.status === 'final' && !isDemo(r) && (r.season || seasonOf()) === yr).reverse();
  return {
    html: `<header class="hero s">${navBack(D.society())}<div class="head"><h1 class="title">Past rounds</h1></div><p class="sub">Tap a round for the scorecards</p>${yearPicker()}</header>
      ${past.length ? sec('', cardOf(past.map(r => roundRow(r, winnerText(r))).join('')), false) : sec('', '<div class="prose">No rounds played yet.</div>', false)}`
  };
};

VIEWS.players = () => {
  const season = seasonOf();
  const table = goy(season);
  const pos = Object.fromEntries(table.map(x => [x.id, x.posLabel]));
  return {
    html: `<header class="hero s">${navBack(D.society())}<div class="head"><h1 class="title">Players</h1></div><p class="sub">Tap a name for their cards</p></header>
      ${sec('', cardOf(D.regulars().map(m => `<button class="row tall" data-act="player" data-pid="${m.id}"><span class="two"><span>${esc(m.name)}</span><span class="sub">${esc([m.full && m.full !== m.name ? m.full : '', 'Index ' + fmtIndex(m.index)].filter(Boolean).join(' · '))}</span></span><span class="right">${pos[m.id] ? `<span class="sub">${posWord(pos[m.id])}</span>` : ''}${chev}</span></button>`).join('')), false)}`
  };
};

function goyRow(x) {
  return `<button class="lrow goy" data-act="player" data-pid="${x.id}"><span class="sub">${x.posLabel}</span>${avName(x)}<span class="chips">${x.counting.map(c => `<i class="chipn">${c.pts}</i>`).join('')}</span><span class="b r">${x.total}</span></button>`;
}

VIEWS.goy = () => {
  const season = yearOn();
  const table = goy(season);
  return {
    html: `<header class="hero s">${navBack(D.society())}<div class="head"><h1 class="title">Golfer of the Year</h1></div>
      <p class="sub">${season} · best ${D.goyBest()} scores count</p>${yearPicker()}</header>
      ${table[0] ? `<div class="leadcard"><span class="lc-k">LEADING</span><span class="lc-row"><span class="lc-n">${esc(table[0].name)}</span><span class="lc-p"><b>${table[0].total}</b> pts</span></span>${table[1] ? `<span class="lc-s">${table[0].total - table[1].total === 0 ? 'Level with' : (table[0].total - table[1].total) + ' point' + (table[0].total - table[1].total === 1 ? '' : 's') + ' clear of'} ${esc(table[1].name)}</span>` : ''}</div>` : ''}
      ${sec('', cardOf(table.map(goyRow).join('')), false)}`
  };
};

/* ----- A round ----- */
const WX = { 0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Cloudy', 45: 'Fog', 48: 'Fog', 51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle', 56: 'Freezing drizzle', 57: 'Freezing drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow', 80: 'Showers', 81: 'Showers', 82: 'Heavy showers', 85: 'Snow showers', 86: 'Snow showers', 95: 'Thunderstorms', 96: 'Thunderstorms', 99: 'Thunderstorms' };
/* Weather: one picture per kind of weather, drawn here so it works offline and always matches the app. */
function wxKind(code) {
  const c = Number(code);
  if (c === 0) return 'sun';
  if (c === 1 || c === 2) return 'part';
  if (c === 3) return 'cloud';
  if (c === 45 || c === 48) return 'fog';
  if (c >= 51 && c <= 57) return 'drizzle';
  if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return 'rain';
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
  if (c >= 95) return 'storm';
  return 'cloud';
}
function wxIcon(kind, size) {
  const sun = (x, y, r, rays) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFD23F"/>${rays ? [0, 45, 90, 135, 180, 225, 270, 315].map(a => `<line x1="${x}" y1="${y - r - 3}" x2="${x}" y2="${y - r - 7}" stroke="#FFD23F" stroke-width="3" stroke-linecap="round" transform="rotate(${a} ${x} ${y})"/>`).join('') : ''}`;
  const cloud = (fill, dx, dy) => `<path transform="translate(${dx || 0} ${dy || 0})" d="M14 36h21a8.5 8.5 0 0 0 1-16.9A11 11 0 0 0 15 21.5 7.3 7.3 0 0 0 14 36z" fill="${fill || '#fff'}"/>`;
  const drops = (n, col) => [17, 25, 33].slice(0, n).map(x => `<line x1="${x}" y1="39" x2="${x - 2}" y2="45" stroke="${col || '#8FD0FF'}" stroke-width="3" stroke-linecap="round"/>`).join('');
  let g = '';
  if (kind === 'sun') g = sun(24, 24, 9, true);
  else if (kind === 'part') g = sun(18, 17, 7, true) + cloud('#fff', 2, 2);
  else if (kind === 'cloud') g = cloud('#fff', 0, -2);
  else if (kind === 'fog') g = cloud('#E3EAF2', 0, -4) + [38, 43].map((y, i) => `<line x1="${11 + i * 3}" y1="${y}" x2="${37 - i * 3}" y2="${y}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`).join('');
  else if (kind === 'drizzle') g = cloud('#EEF3F9', 0, -4) + drops(2, '#B7E1FF');
  else if (kind === 'rain') g = cloud('#DCE6F2', 0, -4) + drops(3);
  else if (kind === 'snow') g = cloud('#F4F8FC', 0, -4) + [[17, 41], [25, 44], [33, 41]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="#fff"/>`).join('');
  else if (kind === 'storm') g = cloud('#B9C4D3', 0, -5) + '<path d="M26 28l-7 11h5l-2 9 10-13h-6l3-7z" fill="#FFD23F"/>';
  return `<svg class="wxi" viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true">${g}</svg>`;
}
/* One plain sentence about the day, from the numbers only. */
function wxLine(kind, rain, wind) {
  if (kind === 'storm') return 'Thunder about. Keep an eye on it before you go out.';
  if (kind === 'snow') return 'Snow about. Check the course is open.';
  const wet = rain >= 60 ? 'A wet one: waterproofs.' : rain >= 30 ? 'Showers possible: bring a waterproof.' : 'Looks dry.';
  const wind2 = wind >= 40 ? ' Very windy.' : wind >= 25 ? ' Breezy.' : wind >= 12 ? ' A light breeze.' : ' Hardly any wind.';
  return wet + wind2;
}
/* Fetch the forecast. The first call to the server can be slow, so one quiet retry before giving up. */
function wxFetch(c, attempt) {
  const keep = () => UI.wx[c.id] && UI.wx[c.id].state === 'done' && UI.wx[c.id].data && UI.wx[c.id].data.days;
  const fail = () => {
    if (attempt < 2) { setTimeout(() => wxFetch(c, attempt + 1), 2000); return; }
    if (!keep()) UI.wx[c.id] = { state: 'failed' };
    render();
  };
  call({ op: 'weather', lat: c.lat, lon: c.lon }, 15000).then(res => {
    if (!(res && res.days)) { fail(); return; }
    UI.wx[c.id] = { state: 'done', data: res };
    const m = LS.get('ncgs-wx', {}) || {}; m[c.id] = { at: Date.now(), data: res }; LS.set('ncgs-wx', m);
    render();
  }).catch(fail);
}
function forecast(r) {
  const c = courseOf(r);
  const away = daysFromToday(r.date);
  if (!c || c.lat === null || c.lon === null || c.lat === undefined || away === null || away < 0 || away > 9) return '';
  /* The last forecast is kept on the phone, so it shows at once; a fresh one is fetched in the background when it is getting old. */
  if (!UI.wx[c.id]) {
    const saved = (LS.get('ncgs-wx', {}) || {})[c.id];
    const age = saved ? Date.now() - saved.at : Infinity;
    if (saved && saved.data && saved.data.days && age < 3 * 3600e3) { UI.wx[c.id] = { state: 'done', data: saved.data }; if (age > 30 * 60e3) wxFetch(c, 1); }
    else { UI.wx[c.id] = { state: 'loading' }; wxFetch(c, 1); }
  }
  const st = UI.wx[c.id];
  if (st.state === 'loading') return sec(label('Forecast'), '<div class="wx wx-skel" aria-busy="true"><div class="wx-top"><span class="sk sk-ic"></span><div class="wx-main"><span class="sk sk-a"></span><span class="sk sk-b"></span></div></div><p class="wx-line">Getting the forecast…</p></div>');
  if (st.state === 'failed') return sec(label('Forecast'), `<button class="wx wx-fail" data-act="wx-retry" data-cid="${c.id}"><span class="wx-name">Forecast not available right now</span><span class="wx-line">Tap to try again</span></button>`);
  if (st.state !== 'done' || !st.data || !st.data.days) return '';
  const d = st.data.days;
  const i = d.time.indexOf(r.date);
  if (i < 0) return '';
  const kind = wxKind(d.weather_code[i]);
  const rain = Number(d.precipitation_probability_max[i]) || 0, wind = Math.round(Number(d.wind_speed_10m_max[i]) || 0);
  let hours = '';
  const h = st.data.hours;
  const start = Number(String(r.first_tee || '10:00').split(':')[0]);
  if (h && h.time) {
    const cells = [];
    for (let k = 0; k < 5; k++) {
      const stamp = `${r.date}T${String(start + k).padStart(2, '0')}:00`;
      const j = h.time.indexOf(stamp);
      if (j >= 0) {
        const pr = h.precipitation_probability[j];
        cells.push(`<span><span class="wx-t">${String(start + k).padStart(2, '0')}:00</span>${wxIcon(wxKind(h.weather_code ? h.weather_code[j] : d.weather_code[i]), 30)}<span class="wx-d">${Math.round(h.temperature_2m[j])}°</span><span class="wx-r">${pr !== null && pr !== undefined ? pr + '%' : ''}</span></span>`);
      }
    }
    if (cells.length) hours = `<div class="wx-hours" aria-label="Hour by hour from the first tee time">${cells.join('')}</div>`;
  }
  return sec(label('Forecast'), `<div class="wx wx-${kind}">
    <div class="wx-top">${wxIcon(kind, 72)}<div class="wx-main"><div class="wx-name">${WX[d.weather_code[i]] || 'Mixed'}</div><div class="wx-temp">${Math.round(d.temperature_2m_max[i])}°<span> ${Math.round(d.temperature_2m_min[i])}°</span></div></div></div>
    <div class="wx-chips"><span class="wx-chip"><b>${rain}%</b> chance of rain</span><span class="wx-chip"><b>${wind}</b> km/h wind</span></div>
    <p class="wx-line">${wxLine(kind, rain, wind)}</p>${hours}</div>`);
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
    const inner = `<span class="sub">${x.posLabel}</span>${avName(x, lbSub(res.rows, x, r), x.pos === 1 && r.status === 'live')}<span class="r"><span class="b">${x.total}</span>${app ? dropChev : ''}</span>`;
    return app ? dropRow(r.id, x, inner) : `<button class="lrow" data-act="player" data-pid="${x.id}">${inner}</button>`;
  }).join('')) + (res.source === 'recorded' ? '<p class="cap note">Order as recorded at the time</p>' : res.source === 'sheet' ? '<p class="cap note">From the society sheet</p>' : ''));
  if (res.kb.length) {
    { const low = E.kbLowest(res.kb); html += sec(label('KBs'), cardOf(res.kb.map(k => `<div class="lrow${low.includes(k) ? ' low' : ''}"><span class="sub">${k.posLabel}</span><span>${esc(k.name)}</span><span class="b r">${k.total}</span></div>`).join(''))); }
  }
  if (app && res.comp) {
    const comp = res.comp;
    const twoBuggies = comp.groups.filter(g => g.teams.length === 2 && g.teams.every(t => t.length === 2));
    if (twoBuggies.length) {
      html += sec(label('Buggy Wars'), twoBuggies.map(gc => cardOf(
        `<div class="row"><span class="sub">${esc(gc.labels[0].long)} v ${esc(gc.labels[1].long)}</span></div>` +
        ['front', 'back', 'overall'].map(s => `<div class="row"><span>${segName(s)}</span>${statusPills(gc.matches[s].status)}</div>`).join('')
      )).join('<div style="height:8px"></div>'));
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

/* ----- Stats: one golfer, and the whole society ----- */
const fmt1 = v => v === null || v === undefined ? '–' : (Math.round(v * 10) / 10).toLocaleString('en-IE', { minimumFractionDigits: Number.isInteger(Math.round(v * 10) / 10) ? 0 : 1 });
function scoreChart(entries, avg) {
  const W = 340, H = 150, padL = 26, padB = 22, padT = 10, n = entries.length;
  const max = Math.max(36, ...entries.map(e => e.total)), step = n > 1 ? (W - padL) / n : W - padL, bw = Math.min(34, step * 0.62);
  const y = v => padT + (H - padT - padB) * (1 - v / max);
  const bars = entries.map((e, i) => {
    const x = padL + step * i + (step - bw) / 2;
    return `<rect class="cbar${e.total === Math.max(...entries.map(z => z.total)) ? ' top' : ''}" x="${x.toFixed(1)}" y="${y(e.total).toFixed(1)}" width="${bw.toFixed(1)}" height="${(H - padB - y(e.total)).toFixed(1)}" rx="4"/><text class="v" x="${(x + bw / 2).toFixed(1)}" y="${(y(e.total) - 4).toFixed(1)}" text-anchor="middle">${e.total}</text><text class="l" x="${(x + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(shortRound(e))}</text>`;
  }).join('');
  const grid = [0, 18, 36].filter(v => v <= max).map(v => `<line class="g" x1="${padL}" x2="${W}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="a" x="${padL - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${v}</text>`).join('');
  const aveLine = avg === null ? '' : `<line class="avg" x1="${padL}" x2="${W}" y1="${y(avg).toFixed(1)}" y2="${y(avg).toFixed(1)}"/>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Stableford points in each round, average ${fmt1(avg)}">${grid}${bars}${aveLine}</svg>`;
}
const shortRound = e => { const w = String(e.name || '').replace(/\b(GC|Golf Club|Golf Links|Golf)\b/g, '').trim().split(/\s+/)[0] || ''; return w.length > 6 ? w.slice(0, 5) + '.' : w; };
function statRow(label, value, sub) { return `<div class="row"><span>${label}${sub ? `<span class="sub"> ${sub}</span>` : ''}</span><span class="b num">${value}</span></div>`; }
function playerStatsBlock(pid) {
  const entries = playerEntries(pid);
  if (!entries.length) return '';
  const st = E.playerSummary(entries);
  let html = sec(label('Scores'), `<div class="card chartcard">${scoreChart(entries, st.average)}<p class="cap note">Stableford points in each round. The dashed line is the average, ${fmt1(st.average)}.</p></div>`);
  const rows = [statRow('Rounds played', st.rounds), statRow('Average', fmt1(st.average)), statRow('Best round', st.best), statRow('Lowest round', st.worst), statRow('Wins', st.wins), statRow('KBs', st.kbs)];
  html += sec(label('Numbers'), cardOf(rows.join('')));
  if (st.scored) {
    const holeRows = [statRow('Eagles', st.eagles), statRow('Birdies', st.birdies), statRow('Pars', st.pars), statRow('Bogeys', st.bogeys), statRow('Double bogey or worse', st.doubles), statRow('Holes picked up', st.scratches)];
    const par = [3, 4, 5].filter(k => st.byPar[k] !== null).map(k => statRow(`Par ${k}s`, fmt1(st.byPar[k]), 'avg points'));
    html += sec(label(`Hole by hole · ${plural(st.scored, 'round')}`), cardOf(holeRows.concat(par).join('')));
  }
  return html;
}
VIEWS.stats = () => {
  const yr = yearOn();
  const members = D.regulars();
  const all = members.map(m => ({ id: m.id, name: m.name, st: E.playerSummary(playerEntries(m.id, yr)) })).filter(x => x.st.rounds);
  const board = (title, key, unit, min) => {
    const rows = all.filter(x => x.st[key] > (min || 0)).sort((a, b) => b.st[key] - a.st[key] || a.name.localeCompare(b.name));
    if (!rows.length) return '';
    return sec(label(title), cardOf(rows.map(x => `<button class="lrow" data-act="player" data-pid="${x.id}"><span></span><span>${esc(x.name)}</span><span class="b r">${x.st[key]}${unit || ''}</span></button>`).join('')));
  };
  const avg = all.filter(x => x.st.rounds >= 1).sort((a, b) => b.st.average - a.st.average || a.name.localeCompare(b.name));
  let html = `<header class="hero s">${navBack(D.society())}<div class="head"><h1 class="title">Stats</h1></div><p class="sub">Tap a name for their own numbers</p>${yearPicker()}</header>`;
  if (!all.length) return { html: html + sec('', '<div class="prose">Stats appear once a round has been played.</div>') };
  html += board('KBs', 'kbs');
  html += board('Round wins', 'wins');
  html += board('Birdies', 'birdies');
  html += sec(label('Average points'), cardOf(avg.map(x => `<button class="lrow" data-act="player" data-pid="${x.id}"><span></span><span>${esc(x.name)}</span><span class="b r">${fmt1(x.st.average)}</span></button>`).join('')));
  return { html };
};

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
  const rowsFor = yr => seasonRounds(yr).filter(r => r.status === 'final' || r.status === 'live').reverse().map(r => {
    const res = resultsOf(r.id);
    const me = res ? res.rows.find(x => x.id === m.id) : null;
    if (!me) return '';
    const live = r.status === 'live';
    const sub = [roundWhenShort(r), live ? 'In progress' : posWord(me.posLabel)].filter(Boolean).join(' · ');
    const act = hasCards(r) ? `data-act="card" data-rid="${r.id}" data-pid="${m.id}"` : `data-act="round" data-rid="${r.id}"`;
    const tag = yr === season && counting.includes(r.id) ? '<span class="pill g">Counts</span>' : '';
    return `<button class="row tall" ${act}><span class="two"><span>${esc(roundName(r))}</span><span class="sub">${esc(sub)}</span></span><span class="right">${tag}<span class="b num">${me.total}</span>${chev}</span></button>`;
  }).filter(Boolean);
  html += playerStatsBlock(m.id);
  const years = [season, ...seasonsList().filter(y => y !== season)];
  years.forEach(yr => {
    const rows = rowsFor(yr);
    if (yr === season || rows.length) html += sec(label(`${yr} rounds`), cardOf(rows.length ? rows.join('') : '<div class="row"><span class="sub">No rounds yet</span></div>'));
  });
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
  const list = D.regulars();
  return {
    html: `<header class="hero s">${UI.stack.length > 1 ? navBack('Back') : '<div class="nav"></div>'}<div class="head"><h1 class="title">Who are you?</h1></div><p class="sub">So your scores and card are yours.</p></header>
      ${sec('', cardOf(list.map(m => `<button class="row" data-act="pick" data-id="${m.id}"><span class="${m.id === DB.prefs.me ? 'b' : ''}">${esc(m.name)}</span>${m.id === DB.prefs.me ? `<span class="c-g">${sized(ICON.check, 20)}</span>` : chev}</button>`).join('')), false)}`
  };
};
