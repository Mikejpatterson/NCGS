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
function pastRow(r) {
  const res = resultsOf(r.id);
  const top = res && res.rows ? res.rows.filter(x => x.pos === 1) : [];
  const d = r.date ? parseDay(r.date) : null;
  const when = d ? `<span class="dchip"><b>${d.getDate()}</b><small>${MONTHS[d.getMonth()].slice(0, 3)}</small></span>` : `<span class="dchip none">${sized(ICON.flagpin, 22)}</span>`;
  const sub = [[r.trip, r.course_name].filter(Boolean)[0], top.length ? top.map(x => x.name).join(', ') : ''].filter(Boolean).join(' \u00b7 ');
  const win = top.length ? `<span class="wn">${avStack(top.slice(0, 2).map(x => x.id))}<span class="chipn scorechip">${top[0].total}</span></span>` : '';
  return `<button class="row tall prow" data-act="round" data-rid="${r.id}">${when}<span class="two"><span class="b">${esc(roundName(r))}</span>${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</span><span class="right">${win}${chev}</span></button>`;
}
const statusPill = r => {
  if (isDemo(r)) return '<span class="pill w">Demo</span>';
  if (r.status === 'live') { const c = computeR(r.id); const thru = c ? Math.min(...c.groups.map(g => g.holesDone)) : 0; return `<span class="pill w">${thru ? 'Thru ' + thru : 'Live'}</span>`; }
  if (r.status === 'final') return '<span class="pill g">Final</span>';
  return '';
};

/* ----- Front page: what is on now, what is next, then the past ----- */
/* The NCGS crest (docs/design/assets/ncgs-crest.svg, owner-approved 21 October). A hidden "NCGS" beside it names it for screen readers. */
const CREST_SVG = '<svg viewBox="98 98 828 828" aria-hidden="true" focusable="false"><circle cx="512" cy="512" r="412" fill="#0B3D2E"/> <circle cx="512" cy="512" r="404" fill="none" stroke="#D4B483" stroke-width="16"/> <circle cx="512" cy="512" r="379" fill="none" stroke="#D4B483" stroke-width="6"/> <path fill="#FAF8F3" stroke="#FAF8F3" stroke-width="5" stroke-linejoin="round" d="M376.24120603015075 393.35966499162475H319.4179229480737V401.8882998324958C328.93132328308207 401.8882998324958 334.58793969849245 402.71365159128976 336.38777219430483 404.3643551088777C341.2730318257956 409.31646566164153 343.5871021775544 416.46951423785595 343.5871021775544 425.8235008375209V535.0450502512563L258.48073701842543 393.35966499162475H207.05695142378556V401.8882998324958H221.45561139028473C226.08375209380233 401.8882998324958 228.6549413735343 404.0892378559464 229.1691792294807 408.21599664991624V550.7267336683417C229.1691792294807 560.355837520938 226.8551088777219 567.5088860971524 221.96984924623112 571.9107621440536C220.17001675041874 573.5614656616416 214.51340033500836 574.3868174204355 204.99999999999997 574.3868174204355V582.9154522613065H261.823283082077V574.3868174204355C251.79564489112227 574.3868174204355 246.13902847571188 573.5614656616416 244.33919597989947 571.6356448911223C239.96817420435508 567.2337688442211 237.9112227805695 560.355837520938 237.9112227805695 550.7267336683417V408.21599664991624L346.6725293132328 587.592445561139H352.58626465661644L352.07202680066996 425.8235008375209C352.07202680066996 416.46951423785595 354.38609715242876 409.31646566164153 358.7571189279732 404.639472361809C360.55695142378556 402.71365159128976 366.213567839196 401.8882998324958 376.24120603015075 401.8882998324958Z M527.4271356783919 547.7004438860971C517.3994974874372 558.4300167504188 508.4003350083751 565.8581825795645 499.9154103852596 569.9849413735343C489.6306532663316 575.2121691792295 477.28894472361804 577.6882244556114 462.8902847571189 577.4131072026801C448.23450586264653 577.1379899497488 436.6641541038525 568.6093551088777 427.92211055276374 552.3774371859297C419.4371859296482 535.8704020100503 415.0661641541038 514.4112562814071 415.0661641541038 488.2751172529313C415.0661641541038 429.1249078726968 431.77889447236174 398.86201005025123 464.9472361809045 397.2113065326633C495.8015075376884 395.83572026800664 507.6289782244555 410.4169346733668 509.9430485762143 442.055418760469H517.6566164154103V398.86201005025123C508.9145728643216 395.28548576214405 502.7437185929648 393.08454773869346 498.8869346733668 392.25919597989946C490.144891122278 390.3333752093802 478.57453936348406 389.2329061976549 464.1758793969849 389.2329061976549C442.0636515912897 389.2329061976549 423.5510887772194 398.03665829145723 408.6381909547738 415.91927973199324C393.21105527638184 434.35213567839196 385.4974874371859 458.5624539363484 385.24036850921266 488.2751172529313C384.9832495812395 515.5117252931324 392.6968174204355 538.8966917922949 408.1239530988274 558.4300167504188C423.5510887772194 577.6882244556114 442.3207705192629 587.3173283082077 464.1758793969849 587.3173283082077C479.34589614740366 587.3173283082077 491.6876046901172 584.8412730318258 501.4581239530988 580.1642797319934C512.2571189279731 574.9370519262982 522.0276381909547 565.5830653266331 531.0268006700167 552.1023199329983Z M691.4690117252932 508.3586767169179H631.8174204355109V517.1624288107203H660.8718592964824V549.9013819095477C660.8718592964824 554.8534924623116 660.6147403685093 558.70513400335 659.5862646566164 560.9060720268006C658.8149078726968 563.9323618090452 653.9296482412061 567.5088860971524 644.9304857621441 570.8102931323283C635.1599664991625 574.9370519262982 625.9036850921274 577.1379899497488 616.9045226130654 576.8628726968175C602.248743718593 576.5877554438861 590.678391959799 568.3342378559464 581.9363484087103 552.1023199329983C573.1943048576214 535.595284757119 568.8232830820771 514.4112562814071 568.8232830820771 488.0C568.8232830820771 430.2253768844221 585.536013400335 399.9624790619765 618.961474036851 397.76154103852593C648.7872696817421 396.110837520938 661.3860971524289 411.24228643216077 663.7001675041877 442.6056532663316H671.4137353433837V399.4122445561139C661.643216080402 395.28548576214405 655.2152428810721 393.08454773869346 652.3869346733669 392.53431323283075C643.9020100502513 390.3333752093802 632.3316582914573 389.2329061976549 617.675879396985 389.2329061976549C595.8207705192631 389.2329061976549 577.5653266331659 398.03665829145723 562.3953098827471 415.91927973199324C547.2252931323284 434.62725293132326 539.5117252931324 458.28733668341704 539.2546063651591 488.0C538.997487437186 515.236608040201 546.4539363484088 538.6215745393635 561.6239530988275 558.1548994974875C577.5653266331659 577.1379899497488 595.8207705192631 586.767093802345 617.675879396985 586.767093802345C632.8458961474038 586.767093802345 645.4447236180905 585.1163902847571 655.9865996649917 582.365217755444C664.9857621440536 579.3389279731994 673.7278056951425 576.0375209380235 682.7269681742044 573.2863484087102V517.1624288107203H691.4690117252932Z M819.0 522.3896566164154C819.0 493.2272278056951 799.7160804020101 476.4450753768844 761.6624790619766 472.0431993299832C734.4078726968174 469.0169095477387 720.7805695142379 456.91175041876045 720.5234505862646 436.00283919597985C720.2663316582915 412.61787269681736 732.3509212730319 400.51271356783917 757.2914572864322 399.9624790619765C782.7462311557789 399.6873618090452 795.3450586264656 410.6920519262982 797.6591289782244 438.20377721943044H805.3726968174204V388.9577889447236H798.1733668341709C797.4020100502513 391.70896147403687 795.6021775544389 393.08454773869346 793.0309882747069 393.08454773869346C787.6314907872697 393.08454773869346 776.3182579564489 388.407554438861 763.2051926298158 388.407554438861C746.2353433835846 388.407554438861 731.8366834170854 392.8094304857621 720.0092127303183 401.61318257956447C706.1247906197655 411.7925209380235 699.1825795644891 426.9239698492462 699.1825795644891 445.9070603015075C699.1825795644891 473.9690201005025 717.4380234505862 490.2009380234506 753.9489112227806 494.87793132328306C767.319095477387 496.528634840871 777.8609715242881 500.38027638190954 785.5745393634841 507.2582077051926C793.8023450586265 514.9614907872697 797.9162479061977 524.590594639866 797.9162479061977 536.6957537688443C797.6591289782244 547.9755611390285 793.2881072026801 557.0544304857622 784.2889447236181 563.9323618090452C775.5469011725294 570.2600586264657 765.0050251256282 573.8365829145729 753.177554438861 574.1117001675042C742.892797319933 574.3868174204355 728.2370184254606 569.709824120603 721.5519262981575 563.9323618090452C714.6097152428811 557.6046649916248 710.4958123953099 547.4253266331658 709.4673366834171 532.5689949748744H701.7537688442211L701.4966499162479 576.3126381909548C717.1809045226131 582.6403350083752 731.322445561139 585.6666247906197 743.4070351758794 585.6666247906197C764.2336683417086 585.6666247906197 781.4606365159129 580.714514237856 795.0879396984925 571.0854103852596C811.0293132328309 559.8056030150753 819.0 543.5736850921273 819.0 522.3896566164154Z"/> <path d="M 413 695 H 611" stroke="#FAF8F3" stroke-width="8" stroke-linecap="round"/></svg>';
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
  return `<div class="mini num">${show.map(x => `<div class="mr${x.id === DB.prefs.me ? ' me' : ''}"><span class="mp">${esc(x.posLabel)}</span><span class="mn">${esc(x.name)}</span><span class="mt">${x.total}</span></div>`).join('')}</div>`;
}
/* The friendly line at the top of Home (owner, 21 October). It follows the clock and what is on, never standings or
   results, and stays the same for the same moment rather than changing at random.
   Order: round day, then early or late, then a trip coming up within 14 days, then plain time of day. */
/* The back link names the screen it goes back to ("Home", "Players", "Results"), never "NCGS" or a bare "Back"
   (design review, 22 October). If the screen behind can't be named, "Back" is the fallback. */
function backLabel() {
  const st = typeof stackOf === 'function' ? stackOf() : UI.stack;
  const prev = st && st.length > 1 ? st[st.length - 2] : null;
  if (!prev) return 'Home';
  const names = { home: 'Home', players: 'Players', rounds: 'Past rounds', goy: 'Golfer of the Year', trip: 'Trip standings', stats: 'Stats', board: 'Results', rules: 'Ruling', who: 'Home' };
  if (names[prev.v]) return names[prev.v];
  if (prev.v === 'round' && prev.p && prev.p.rid && D.round(prev.p.rid)) return roundName(D.round(prev.p.rid));
  if (prev.v === 'player' && prev.p && prev.p.pid) return D.nameOf(prev.p.pid);
  return 'Back';
}

function greeting(me, now = new Date()) {
  const name = me ? ', ' + me.name.split(' ')[0] : '';
  const hr = now.getHours(), pad = n => String(n).padStart(2, '0');
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const clock = `${pad(hr)}:${pad(now.getMinutes())}`;
  const rounds = D.rounds().filter(r => r.status !== 'final' && r.date);
  const todays = rounds.find(r => r.date === today);
  if (todays) return (todays.first_tee && clock < todays.first_tee ? `First tee at ${todays.first_tee}` : 'Round day') + name;
  if (hr < 7) return 'Early start' + name;
  if (hr >= 22) return 'Late one' + name;
  const soon = rounds.filter(r => r.trip && r.date > today && (new Date(r.date + 'T12:00:00') - now) / 864e5 <= 14).sort((a, b) => a.date < b.date ? -1 : 1)[0];
  if (soon) return `${soon.trip}${/s$/i.test(soon.trip) ? "'" : "'s"} nearly here` + name;
  return (hr < 12 ? 'Morning' : hr < 17 ? 'Good afternoon' : 'Evening') + name;
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
// The round name's length, for the CSS that makes a long name smaller (styles.css, --t-display-fit)
const lenStyle = s => `style="--len:${[...s].length}"`;
/* The round card's buttons. During a live round that you're playing, the main button takes you back to scoring
   ("Continue · Hole 7"), and Players · Groups · KBs becomes a quieter link underneath (design review, 22 October). */
function nowActs(r, live) {
  const groups = `<button class="go" data-act="round" data-rid="${r.id}" data-tab="players">${live ? 'Players · Groups · KBs' : 'View round details'}</button>`;
  let next = null;
  try { const mine = live && myGroup(r.id); const gc = mine && computeR(r.id).groups.find(g => g.id === mine.id); next = gc ? gc.nextHole : null; } catch (e) { next = null; }
  if (!next) return `<div class="now-acts one">${groups}</div>`;
  return `<div class="now-acts one"><button class="go" data-act="tab" data-tab="hole">Continue \u00b7 Hole ${next}</button>
    <button class="go-link" data-act="round" data-rid="${r.id}" data-tab="players">Players \u00b7 Groups \u00b7 KBs</button></div>`;
}

function nowCard(r) {
  const live = r.status === 'live';
  const playable = canScore(r) && (live || !r.date || daysFromToday(r.date) <= 0);
  const kind = live ? 'Today' : r.date && daysFromToday(r.date) === 0 ? 'Today' : 'Next round';
  const days = r.date ? daysFromToday(r.date) : null;
  const when = r.date && !live ? (days > 0 ? `${fmtDate(r.date, true)} · ${days === 1 ? 'tomorrow' : 'in ' + plural(days, 'day')}` : fmtDate(r.date, true)) : '';
  const line2 = when || (!live && !r.date ? 'Date to be confirmed' : '');
  const date = !live && r.date ? parseDay(r.date) : null;
  const mine = live && myGroup(r.id);
  const group = mine && computeR(r.id) && computeR(r.id).groups.find(g => g.id === mine.id);
  const thisContest = group && group.nextHole ? contestOn(r.id, group.nextHole) : null;
  return `<div class="now ${live ? 'home-live-ticket' : 'home-announcement'}">
    <button class="now-main" data-act="round" data-rid="${r.id}">
      <span class="now-top"><span class="now-kind">${kind}</span>${statusPill(r)}</span>
      <span class="now-name" ${lenStyle(roundName(r))}>${esc(roundName(r))}</span>
      ${date ? `<span class="home-date" aria-hidden="true"><small>${MONTHS[date.getMonth()].slice(0, 3)}</small><b>${date.getDate()}</b></span>` : ''}
      ${line2 ? `<span class="now-line">${esc(line2)}</span>` : ''}
      <span class="now-line">${esc(heroFacts(r))}</span>
      ${thisContest ? `<span class="home-this-hole">${CONTEST[thisContest.type]} · Hole ${thisContest.hole}</span>` : ''}
    </button>
    ${nowActs(r, live)}
  </div>`;
}

/* Home borrows the existing result/claim state. It never awards a contest or writes scores. */
function homeMatchday(r) {
  const res = resultsOf(r.id);
  if (!res) return '';
  const board = miniBoard(r);
  let html = board ? `<section class="sec home-live-board"><div class="sec-label"><span class="sub">On the leaderboard</span><button class="link" data-act="leaderboard" data-rid="${r.id}">Full field ${chev}</button></div>${board}</section>` : '';
  if (res.contests.length) {
    html += `<section class="sec home-contests"><div class="sec-label">${label('Out on the course')}</div><div class="home-contest-list">${res.contests.map(c => {
      const who = c.winner || (c.lead && c.lead.pid);
      const confirmed = c.status && c.status.confirmed;
      const answered = c.status && c.status.answered;
      const state = confirmed ? 'Confirmed' : who || answered ? 'To be confirmed' : 'Not yet played';
      const name = who ? D.nameOf(who) : confirmed ? 'Nobody' : answered ? 'Nobody yet' : 'No claim yet';
      return `<div class="home-contest"><span class="hs-ic" aria-hidden="true">${sized(ICON.flagpin, 20)}</span><span class="home-contest-copy"><span class="b">${CONTEST[c.type]}${c.hole ? ` <span class="sub">· ${c.hole}</span>` : ''}</span><span class="sub">${esc(name)}</span></span><span class="home-contest-state">${state}</span></div>`;
    }).join('')}</div></section>`;
  }
  return html;
}

function homeSeasonIntro(season, played) {
  return `<section class="home-season-intro"><p class="home-season-label">The season ahead</p><div class="home-year"><span>${season}</span><i aria-hidden="true"></i></div><p class="home-quiet-title">${played.length ? 'Between rounds.' : 'A fresh scorecard.'}</p><p class="sub">No round booked yet.<br>The next date will appear here when it’s set.</p></section>`;
}
VIEWS.home = () => {
  const season = seasonOf();
  const played = seasonRounds(season).filter(r => r.status === 'final');
  const live = D.rounds().filter(r => r.status === 'live');
  const next = upcoming();
  const feature = live[0] || next[0] || null;
  const more = [...live.slice(1), ...next.slice(live[0] ? 0 : 1)];
  const me = DB.prefs.me ? D.member(DB.prefs.me) : null;
  const hello = greeting(me);
  const homeState = feature && feature.status === 'live' ? 'matchday' : feature ? 'upcoming' : 'quiet';
  let html = `<header class="hero home home-${homeState}"><div class="brand"><span class="badge crest">${CREST_SVG}</span><span class="vh">${esc(D.society())}</span><p class="greet${hello.length > 22 ? ' long' : ''}">${esc(hello)}</p>
    <button class="who-chip${me ? ' only-av' : ''}" data-act="who" aria-label="${me ? 'You are ' + esc(me.name) + '. Change' : 'Who are you?'}">${me ? `<span class="who-av">${esc(initialsOf(me))}</span>` : 'Who are you?'}</button></div>
    <h1 class="vh">${esc(homeHeadline(feature))}</h1>
    ${homeState === 'upcoming' ? `<p class="home-season-label">The ${season} season</p><p class="home-quiet-title">Next on the card.</p>` : ''}
    ${feature ? nowCard(feature) : homeSeasonIntro(season, played)}</header>`;
  if (homeState === 'matchday') html += homeMatchday(feature);
  const table = goy(season);
  const lead = table[0];
  const pastAll = D.rounds().filter(r => r.status === 'final').reverse();
  const tripFor = feature && feature.trip ? feature : (D.rounds().filter(r => r.trip).slice(-1)[0] || null);
  const tripList = tripFor ? tripRounds(tripFor) : [];
  const goyHidden = lead ? `<span class="vh">Golfer of the Year ${esc(lead.name)} leads on ${lead.total}</span>` : '';
  const inPlay = D.rounds().some(r => r.status === 'live' || (r.status === 'upcoming' && r.date && daysFromToday(r.date) === 0));
  const lastRound = pastAll.find(r => !isDemo(r));
  /* The season block under the round card (owner chose option C, 22 October): one list headed "The season", each row
     with an icon and a useful second line (who leads, how many rounds played). */
  const second = table[1];
  const goyLine = lead ? (second && lead.total > second.total ? `${esc(lead.name)} leads by ${lead.total - second.total}` : `${esc(lead.name)} leads`) : `Best ${D.goyBest()} scores count`;
  const tRows = tripList.length > 1 ? tripRows(tripList) : [];
  const tLead = tRows[0] && tRows[0].total ? tRows[0] : null;
  const tripLine = tripFor && tripList.length > 1 ? (tLead ? `${esc(tripFor.trip)} \u00b7 ${esc(tLead.name)} leads` : esc(tripFor.trip)) : '';
  const ic = k => `<span class="hs-ic" aria-hidden="true">${sized(ICON[k], 20)}</span>`;
  const rrow = (act, k, t, sub, rid) => `<button class="row hs-row" data-act="${act}"${rid ? ` data-rid="${rid}"` : ''}>${ic(k)}<span class="hs-txt"><span class="hs-t">${t}</span><span class="hs-s">${sub}</span></span>${chev}</button>`;
  html += `${goyHidden}${sec(label('The season'), cardOf([
    !inPlay && lastRound ? rrow('round', 'flagpin', 'Last round', esc(roundName(lastRound)), lastRound.id) : '',
    rrow('goy', 'trophy', 'Golfer of the Year', goyLine),
    tripList.length > 1 ? rrow('trip', 'course', 'Trip standings', tripLine, tripFor.id) : '',
    rrow('rounds', 'history', 'Past rounds', played.length ? `${plural(played.length, 'round')} played` : 'None played yet'),
    rrow('stats', 'bars', 'Stats', 'KBs, birdies, averages'),
    rrow('players', 'users', 'Players', plural(D.regulars().length, 'golfer'))].join('')), true)}`;
  if (more.length) html += sec(label('Also on'), cardOf(more.map(r => roundRow(r, statusPill(r) || (r.first_tee ? `<span class="sub">${esc(r.first_tee)}</span>` : ''))).join('')));
  html += '<p class="foot"><button class="link" data-act="org">Organiser</button></p>';
  return { html, tabs: 'home' };
};

VIEWS.rounds = () => {
  const yr = yearOn();
  const past = D.rounds().filter(r => r.status === 'final' && !isDemo(r) && (r.season || seasonOf()) === yr).reverse();
  return {
    html: `<header class="hero s">${navBack(backLabel())}<div class="head"><h1 class="title">Past rounds</h1></div><p class="sub">Tap a round for the scorecards</p>${yearPicker()}</header>
      ${past.length ? sec('', cardOf(past.map(pastRow).join('')), false) : sec('', '<div class="prose">No rounds played yet.</div>', false)}`
  };
};

VIEWS.players = () => {
  const season = seasonOf();
  const table = goy(season);
  const pos = Object.fromEntries(table.map(x => [x.id, x.posLabel]));
  return {
    html: `<header class="hero s">${navBack(backLabel())}<div class="head"><h1 class="title">Players</h1></div><p class="sub">Tap a name for their cards</p></header>
      ${sec('', cardOf(D.regulars().map(m => `<button class="row tall prow" data-act="player" data-pid="${m.id}">${avBadge(m.id, 'lg')}<span class="two"><span class="b">${esc(m.name)}</span><span class="sub">${esc(m.full && m.full !== m.name ? m.full : 'Index ' + fmtIndex(m.index))}</span></span><span class="right"><span class="idx" title="Handicap index"><small>Index</small>${esc(fmtIndex(m.index))}</span>${pos[m.id] ? `<span class="posp p${/^\d+$/.test(pos[m.id]) && Number(pos[m.id]) <= 3 ? pos[m.id] : ''}">${posWord(pos[m.id])}</span>` : ''}${chev}</span></button>`).join('')), false)}`
  };
};

function goyRow(x) {
  return `<button class="lrow goy" data-act="player" data-pid="${x.id}"><span class="sub">${x.posLabel}</span>${avName(x, `<span class="chips">${x.counting.map(c => `<i class="chipn">${c.pts}</i>`).join('')}</span>`, false, true)}<span class="b r tot">${x.total}</span></button>`;
}

VIEWS.goy = () => {
  const season = yearOn();
  const table = goy(season);
  return {
    html: `<header class="hero s">${navBack(backLabel())}<div class="head"><h1 class="title">Golfer of the Year</h1></div>
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
function forecast(r, bare) {
  const wrap = body => (bare ? body : sec(label('Forecast'), body));
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
  if (st.state === 'loading') return wrap('<div class="wx wx-skel" aria-busy="true"><div class="wx-top"><span class="sk sk-ic"></span><div class="wx-main"><span class="sk sk-a"></span><span class="sk sk-b"></span></div></div><p class="wx-line">Getting the forecast…</p></div>');
  if (st.state === 'failed') return wrap(`<button class="wx wx-fail" data-act="wx-retry" data-cid="${c.id}"><span class="wx-name">Forecast not available right now</span><span class="wx-line">Tap to try again</span></button>`);
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
  return wrap(`<div class="wx wx-${kind}">
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
    const inner = `<span class="sub">${x.posLabel}</span>${avName(x, lbSub(res.rows, x, r), x.pos === 1)}<span class="r"><span class="b">${x.total}</span>${app ? dropChev : ''}</span>`;
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
    html += sec(label('Contests'), cardOf(contests.map(c => `<div class="row"><span>${CONTEST[c.type]}${c.hole ? ` <span class="sub">${c.hole}</span>` : ''}</span>${c.winner ? `<span class="b ct-won">${esc(D.nameOf(c.winner))}${CUP}</span>` : '<span class="sub">Not awarded</span>'}</div>`).join('')));
  }
  return html;
}

/* The page for a finished round: the winner first, then the table, then one small card for KBs and contests. */
function finishedCard(r, res) {
  const top = res.rows.filter(x => x.pos === 1);
  const names = top.map(x => D.nameOf(x.id)).join(' & ');
  const sub = [roundName(r), r.date ? fmtDate(r.date, true) : ''].filter(Boolean).join(' · ');
  return `<div class="fincard"><div class="finrow"><span class="fink">${top.length > 1 ? 'WINNERS' : 'WINNER'}</span><span class="finfinal">Final</span></div>
    <div class="finwin"><div class="finwho"><b class="finname">${esc(names)}${CUP}</b><h1 class="finsub">${esc(sub)}</h1></div><b class="finpts">${top[0].total}</b></div></div>`;
}
function finishedBody(r, res) {
  const app = res.source === 'app';
  const all = !!UI.open['all-' + r.id], many = res.rows.length > 8;
  const shown = all || !many ? res.rows : res.rows.slice(0, 8);
  let html = sec(label('Stableford'), cardOf(shown.map(x => {
    const inner = `<span class="sub">${x.posLabel}</span>${avName(x, lbSub(res.rows, x, r), x.pos === 1)}<span class="r"><span class="b">${x.total}</span>${app ? dropChev : ''}</span>`;
    return app ? dropRow(r.id, x, inner) : `<button class="lrow" data-act="player" data-pid="${x.id}">${inner}</button>`;
  }).join('') + (many ? `<button class="row finmore" data-act="toggle" data-key="all-${r.id}" aria-expanded="${all}">${all ? 'Show fewer' : `Show all ${res.rows.length}`}</button>` : '')) +
    ((all || !many) && res.source === 'recorded' ? '<p class="cap note">Order as recorded at the time</p>' : (all || !many) && res.source === 'sheet' ? '<p class="cap note">From the society sheet</p>' : ''));
  const rows = [];
  if (res.kb.length) {
    // The KBs are the last-placed pair (E.kbLowest), the same pair the round's results highlight.
    const low = E.kbLowest(res.kb);
    const open = !!UI.open['kb-' + r.id];
    rows.push(`<button class="row" data-act="toggle" data-key="kb-${r.id}" aria-expanded="${open}"><span>KBs</span><span class="right">${low.length ? `<b>${esc(low.map(k => k.name).join(', '))} · ${low[0].total}</b>` : ''}<span class="chev dn${open ? ' up' : ''}">${chev}</span></span></button>`);
    if (open) rows.push(res.kb.map(k => `<div class="lrow${low.includes(k) ? ' low' : ''}"><span class="sub">${k.posLabel}</span><span>${esc(k.name)}</span><span class="b r">${k.total}</span></div>`).join(''));
  }
  res.contests.filter(c => c.winner !== undefined).forEach(c => rows.push(`<div class="row"><span>${CONTEST[c.type]}${c.hole ? ` <span class="sub">${c.hole}</span>` : ''}</span>${c.winner ? `<span class="b ct-won">${esc(D.nameOf(c.winner))}${CUP}</span>` : '<span class="sub">Not awarded</span>'}</div>`));
  if (rows.length) html += sec(label('KBs and contests'), cardOf(rows.join('')));
  if (app && res.comp) {
    const two = res.comp.groups.filter(g => g.teams.length === 2 && g.teams.every(t => t.length === 2));
    if (two.length) html += sec(label('Buggy Wars'), two.map(gc => cardOf(
      `<div class="row"><span class="sub">${esc(gc.labels[0].long)} v ${esc(gc.labels[1].long)}</span></div>` +
      ['front', 'back', 'overall'].map(sg => `<div class="row"><span>${segName(sg)}</span>${statusPills(gc.matches[sg].status)}</div>`).join(''))).join('<div style="height:8px"></div>'));
  }
  if (r.groups && r.groups.length) {
    const open = !!UI.open['grp-' + r.id];
    html += sec('', cardOf(`<button class="row" data-act="toggle" data-key="grp-${r.id}" aria-expanded="${open}"><span>Groups</span><span class="chev dn${open ? ' up' : ''}">${chev}</span></button>`), true);
    if (open) html += groupsBlock(r, false);
  }
  return html + `<button class="btn" data-act="results" data-rid="${r.id}">Share results</button>`;
}

VIEWS.round = p => {
  const r = D.round(p.rid);
  if (!r) return { html: `${navBack(backLabel())}<div class="head"><h1 class="title">Round not found</h1></div>` };
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
    const res = resultsOf(r.id);
    if (res && res.rows.length) {
      const back = html.slice(0, html.indexOf('<div class="head">')) + '</header>';
      return { html: `<div class="fin">${back}${finishedCard(r, res)}${finishedBody(r, res)}</div>` };
    }
    html += resultsBlock(r);
    if (r.groups && r.groups.length) html += groupsBlock(r, false);
    return { html };
  }
  /* Coming up or live: a pine card with this player's day first, then Groups, KBs, Weather and Course. */
  const live = r.status === 'live';
  const days = r.date ? daysFromToday(r.date) : null;
  const kind = live ? 'Live' : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : days > 1 ? `In ${plural(days, 'day')}` : 'Next round';
  const line = [r.date ? fmtDate(r.date, true) : 'Date to be confirmed', tee ? `${tee.name} tees` : '', tee ? `Par ${tee.par}` : ''].filter(Boolean).join(' · ');
  const me = DB.prefs.me;
  const mine = myGroup(r.id);
  let you = '';
  if (mine) {
    const myTeam = mine.teams.find(t => t.includes(me)) || [];
    const other = mine.teams.length > 1 ? mine.teams.find(t => t !== myTeam) : null;
    const partner = myTeam.filter(pid => pid !== me);
    const kbPair = (r.kb || []).find(pr => pr.includes(me));
    const kbWith = kbPair ? kbPair.filter(pid => pid !== me) : [];
    const names = pairNames;
    const dl = [
      partner.length ? `<dt>With</dt><dd>${names(partner)}</dd>` : '',
      other ? `<dt>Against</dt><dd>${names(other)}</dd>` : (!partner.length ? `<dt>With</dt><dd>${names(mine.teams.flat().filter(pid => pid !== me))}</dd>` : ''),
      kbWith.length ? `<dt>KB with</dt><dd>${names(kbWith)}</dd>` : ''
    ].join('');
    const t = mine.teeTime || r.first_tee || '';
    you = `<div class="rp-you"><div class="rp-time">${t ? `<b>${esc(t)}</b><span>${live ? 'Tee time' : 'You’re off'}</span>` : `<b>${mine.n}</b><span>Group</span>`}</div><dl>${dl}</dl></div>`;
  }
  const playable = canScore(r) && (live || (r.status === 'upcoming' && (!r.date || daysFromToday(r.date) <= 0)));
  let go = '';
  if (playable) {
    let lbl = 'Play now';
    if (me && mine) { const gc = computeR(r.id).groups.find(g => g.id === mine.id); lbl = inPlay || gc.holesDone ? (gc.nextHole ? `Hole ${gc.nextHole}` : 'Group card') : 'Play now'; }
    go = `<button class="go" data-act="play" data-rid="${r.id}">${lbl}</button>`;
  } else if (live) go = `<button class="go" data-act="leaderboard" data-rid="${r.id}">Leaderboard</button>`;
  html = `<header class="hero pine rp-card"><div class="rp-top"><span class="rp-kind">${esc(kind)}</span><span class="rp-fmt">Stableford</span></div>
    <h1 class="rp-name" ${lenStyle(roundName(r))}>${esc(roundName(r))}</h1><p class="rp-line">${esc(line)}</p>${you}${go ? `<div class="rp-go">${go}</div>` : ''}</header>`;
  if (playable && me && !mine) html += `<p class="cap" style="text-align:center;margin-top:8px">${esc(D.nameOf(me))} is not in a group · <button class="link sm" data-act="who">Change</button></p>`;

  const tabsAvail = ['players', 'groups', 'kb', 'weather', 'course'];
  const rt = tabsAvail.includes(UI.rtab) ? UI.rtab : 'players';
  const tabName = { players: 'Players', groups: 'Groups', kb: 'KBs', weather: 'Weather', course: 'Course' };
  html += `<div class="seg pills rtabs" role="tablist">${tabsAvail.map(k => `<button class="${rt === k ? 'on' : ''}" role="tab" data-act="rtab" data-t="${k}" aria-selected="${rt === k}">${tabName[k]}</button>`).join('')}</div>`;
  const quiet = t => cardOf(`<div class="row"><span class="sub">${t}</span></div>`);
  if (rt === 'players') html += roundPlayers(r);
  else if (rt === 'groups') html += roundGroups(r);
  else if (rt === 'kb') html += r.kb && r.kb.length ? `<div class="card rp-kbs">${r.kb.map(pr => `<span class="pk${pr.includes(me) ? ' me' : ''}">${pairNames(pr)}</span>`).join('')}</div>` : quiet(E.kbOff(r) ? 'No KBs in this round' : 'KB pairs are not drawn yet');
  else if (rt === 'weather') html += forecast(r, true) || quiet(r.date ? 'The forecast appears in the 9 days before the round.' : 'The forecast appears once the round has a date.');
  else html += roundCourse(r, c, tee, holes);
  return { html, tabs: 'home' };
};

/* Names joined so the "&" stays with the name before it. A long name may wrap, so it is never cut off. */
const pairNames = list => list.map(pid => esc(D.nameOf(pid))).join('\u00a0& ');

/* Groups on the round page: one row per tee time, the two buggies in equal blue and red pills. A row opens to the handicaps. */
function roundGroups(r) {
  if (!r.groups || !r.groups.length) return cardOf('<div class="row"><span class="sub">Groups are not drawn yet</span></div>');
  const comp = computeR(r.id), tee = teeOf(r);
  const live = r.status === 'live' ? comp : null;
  const phOf = pid => (r.ph && r.ph[pid] !== undefined ? r.ph[pid] : comp ? comp.players[pid].ph : tee && D.member(pid) ? E.playingHandicap(D.member(pid).index, tee, allowanceOf(r)) : null);
  const cols = '<div class="hrow cols"><span></span><span class="r cap">Index</span><span class="r cap">Playing</span><span></span></div>';
  const prow = g => g.teams.map((t, i) => t.map(pid => {
    const ph = phOf(pid), m = D.member(pid), can = tee && m;
    return `<${can ? 'button' : 'div'} class="hrow"${can ? ` data-act="hcp" data-pid="${pid}" data-rid="${r.id}"` : ''}><span class="nm">${g.teams.length > 1 ? dot(i) : ''}<span class="${pid === DB.prefs.me ? 'b' : ''}">${esc(D.nameOf(pid))}</span></span><span class="r sub">${m ? fmtIndex(m.index) : ''}</span><span class="r b">${ph === null ? '' : ph}</span>${can ? chev : '<span></span>'}</${can ? 'button' : 'div'}>`;
  }).join('')).join('');
  const mine = myGroup(r.id);
  return `<div class="card rp-groups">${r.groups.map(g => {
    const key = 'rg' + r.id + g.id, open = !!UI.open[key];
    const gc = live ? live.groups.find(x => x.id === g.id) : null;
    const prog = gc ? (gc.complete ? 'Finished' : gc.holesDone ? 'Thru ' + gc.holesDone : '') : '';
    const pills = g.teams.length === 2
      ? g.teams.map((t, i) => `<span class="${i ? 'pr' : 'pb'}">${pairNames(t)}</span>`).join('')
      : `<span class="pk wide">${esc(g.teams.flat().map(D.nameOf).join(', '))}</span>`;
    return `<button class="rg${mine && mine.id === g.id ? ' me' : ''}" data-act="toggle" data-key="${key}" aria-expanded="${open}" aria-label="Group ${g.n}${g.teeTime ? ', ' + esc(g.teeTime) : ''}"><span class="rg-t"><b>${esc(g.teeTime || 'G' + g.n)}</b>${prog ? `<small>${prog}</small>` : ''}</span>${pills}<span class="chev dn${open ? ' up' : ''}">${chev}</span></button>${open ? `<div class="rg-open">${cols}${prow(g)}</div>` : ''}`;
  }).join('')}</div>`;
}

/* Players on the round page: everyone playing, with index and playing handicap for the day. Tap one for the working. */
function roundPlayers(r) {
  if (!r.groups || !r.groups.length) return cardOf('<div class="row"><span class="sub">Players are not drawn yet</span></div>');
  const comp = computeR(r.id), tee = teeOf(r);
  const phOf = pid => (r.ph && r.ph[pid] !== undefined ? r.ph[pid] : comp ? comp.players[pid].ph : tee && D.member(pid) ? E.playingHandicap(D.member(pid).index, tee, allowanceOf(r)) : null);
  const ids = r.groups.flatMap(g => g.teams.flat().map(pid => ({ pid, g })));
  ids.sort((a, b) => D.nameOf(a.pid).localeCompare(D.nameOf(b.pid)));
  const cols = '<div class="pl-row cols"><span></span><span></span><span class="r cap">Index</span><span class="r cap">Playing</span><span></span></div>';
  return `<div class="card rp-players">${cols}${ids.map(({ pid, g }) => {
    const m = D.member(pid), ph = phOf(pid), can = tee && m;
    const inner = `${avBadge(pid)}<span class="pl-n"><span class="${pid === DB.prefs.me ? 'b' : ''}">${esc(D.nameOf(pid))}</span><span class="cap">${esc(g.teeTime ? g.teeTime : 'Group ' + g.n)}</span></span><span class="r sub num">${m ? fmtIndex(m.index) : ''}</span><span class="r b num">${ph === null ? '' : ph}</span>${can ? chev : '<span></span>'}`;
    return can ? `<button class="pl-row${pid === DB.prefs.me ? ' me' : ''}" data-act="hcp" data-pid="${pid}" data-rid="${r.id}">${inner}</button>` : `<div class="pl-row">${inner}</div>`;
  }).join('')}</div>`;
}

/* Course on the round page: the numbers, then the organiser's write-up. */
function roundCourse(r, c, tee, holes) {
  if (!c) return cardOf('<div class="row"><span class="sub">No course set for this round</span></div>');
  const row = (k, v) => (v === '' || v === null || v === undefined ? '' : `<div class="row"><span>${k}</span><span class="b num">${esc(String(v))}</span></div>`);
  const len = holes && holes.every(h => h.m) ? `${holes.reduce((s, h) => s + h.m, 0).toLocaleString('en-IE')} m` : '';
  const p3 = holes ? holes.filter(h => h.par === 3).length : 0, p5 = holes ? holes.filter(h => h.par === 5).length : 0;
  let html = cardOf([
    row('Tees', tee ? tee.name : ''),
    row('Par', tee ? tee.par : ''),
    row('Slope', tee ? tee.slope : ''),
    row('Course rating', tee ? tee.rating : ''),
    row('Length', len),
    holes ? row('Par 3s and par 5s', `${p3} and ${p5}`) : '',
    row('Handicap allowance', `${Math.round(allowanceOf(r) * 100)}%`)
  ].join(''));
  html += sec('', c.about ? `<p class="prose rp-about">${esc(c.about)}</p>` : '<p class="prose sub">No course notes yet.</p>', true);
  return html;
}

/* ----- A player ----- */

/* ----- Stats: one golfer, and the whole society ----- */
const fmt1 = v => v === null || v === undefined ? '–' : (Math.round(v * 10) / 10).toLocaleString('en-IE', { minimumFractionDigits: Number.isInteger(Math.round(v * 10) / 10) ? 0 : 1 });
function scoreChart(entries, avg) {
  const W = 340, H = 168, padL = 28, padB = 24, padT = 24, n = entries.length;
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
const shortRound = e => { if (e.date) return new Date(e.date + 'T12:00:00').toLocaleDateString('en-IE', { day: 'numeric', month: 'short' }); return shortRoundName(e); };   // dates tell rounds at the same course apart
const shortRoundName = e => { const w = String(e.name || '').replace(/\b(GC|Golf Club|Golf Links|Golf)\b/g, '').trim().split(/\s+/)[0] || ''; return w.slice(0, 3); };
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
  const statBoard = (title, icon, list, disp, sub) => {
    if (!list.length) return '';
    const max = Math.max(...list.map(x => x.v)) || 1;
    let rank = 0, prev = null;
    return sec(sh(title, icon, sub), cardOf(list.map((x, i) => {
      if (x.v !== prev) { rank = i + 1; prev = x.v; }
      return `<button class="srow${rank === 1 ? ' top' : ''}" data-act="player" data-pid="${x.id}"><span class="rk r${rank <= 3 ? rank : 0}">${rank}</span>${avBadge(x.id)}<span class="sn"><span class="n">${esc(x.name)}</span><span class="bar"><i style="width:${Math.max(4, Math.round(x.v / max * 100))}%"></i></span></span><span class="sv">${disp(x)}</span></button>`;
    }).join('')));
  };
  const board = (title, icon, key, unit, min, sub) => statBoard(title, icon,
    all.filter(x => x.st[key] > (min || 0)).sort((a, b) => b.st[key] - a.st[key] || a.name.localeCompare(b.name)).map(x => ({ id: x.id, name: x.name, v: x.st[key] })),
    x => `${x.v}${unit || ''}`, sub);
  const avg = all.filter(x => x.st.rounds >= 1).sort((a, b) => b.st.average - a.st.average || a.name.localeCompare(b.name)).map(x => ({ id: x.id, name: x.name, v: x.st.average }));
  let html = `<header class="hero s">${navBack(backLabel())}<div class="head"><h1 class="title">Stats</h1></div><p class="sub">Tap a name for their own numbers</p>${yearPicker()}</header>`;
  if (!all.length) return { html: html + sec('', '<div class="prose">Stats appear once a round has been played.</div>') };
  const bestRound = all.slice().sort((a, b) => (b.st.best || 0) - (a.st.best || 0))[0];
  const nRounds = seasonRounds(yr).filter(r => r.status === 'final').length;
  html += `<div class="sumtiles"><div class="st-a"><span class="cap">Rounds played</span><b>${nRounds}</b></div><div class="st-b"><span class="cap">Best round</span><b>${bestRound.st.best}</b><span class="cap">${esc(bestRound.name)}</span></div><div class="st-c"><span class="cap">Top average</span><b>${fmt1(avg[0].v)}</b><span class="cap">${esc(avg[0].name)}</span></div></div>`;
  html += board('KBs', ICON.users, 'kbs');
  html += board('Round wins', ICON.trophy, 'wins');
  html += board('Birdies', ICON.flagpin, 'birdies');
  html += statBoard('Average points', ICON.bars, avg, x => fmt1(x.v));
  return { html };
};

VIEWS.player = p => {
  const m = D.member(p.pid);
  if (!m) return { html: `${navBack(backLabel())}<div class="head"><h1 class="title">Not found</h1></div>` };
  const season = seasonOf();
  const table = goy(season);
  const row = table.find(x => x.id === m.id);
  const counting = row ? row.countingRids.slice() : [];
  let html = '<header class="hero s">' + navBack(backLabel());
  html += `<div class="head"><h1 class="title is-name">${esc(m.name)}</h1></div><p class="sub">${esc([m.full, 'Index ' + fmtIndex(m.index)].filter(Boolean).join(' · '))}</p>`;
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
function markKey() {
  const k = (c, t, l) => `<span class="ski"><span class="mk ${c}">${t}</span>${l}</span>`;
  return `<div class="sckey" aria-label="Key to the marks">${k('birdie', '3', 'Birdie')}${k('eagle', '2', 'Eagle')}${k('bogey', '5', 'Bogey')}${k('double', '6', 'Double or worse')}<span class="ski"><span class="sd">●</span>You get a shot</span></div>`;
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
  if (!r || !pl) return { html: `${navBack(backLabel())}<div class="head"><h1 class="title">No card</h1></div>` };
  const tee = teeOf(r);
  const res = resultsOf(r.id);
  const me = res.rows.find(x => x.id === p.pid);
  const { F, B, table } = cardParts(r, pl);
  const sub = [r.date ? fmtDate(r.date, true) : roundWhenShort(r), tee ? `${tee.name} · Par ${tee.par}` : '', `Playing hcp ${pl.ph}`].filter(Boolean).join(' · ');
  const html = `<header class="hero s">${navBack(backLabel())}
    <div class="head"><h1 class="title is-name">${esc(pl.name)}</h1>${me && r.status === 'final' ? `<span class="sub">${posWord(me.posLabel)}</span>` : ''}</div>
    <p class="sub"><button class="link inline cardlink" data-act="round" data-rid="${r.id}">${esc(roundName(r))}</button> · ${esc(sub)}</p>
    ${isDemo(r) ? '<div class="note"><span class="pill w">Demo scores</span></div>' : ''}
    <div class="tiles"><div class="tile flag"><span class="cap">Points</span><span class="bignum">${pl.total}</span></div><div class="tile"><span class="cap">Out</span><span class="bignum">${F.pts}</span></div><div class="tile"><span class="cap">In</span><span class="bignum">${B.pts}</span></div></div></header>
    <div class="card sc-wrap">${table}</div>${markKey()}`;
  return { html };
};

/* ----- Who are you ----- */
VIEWS.who = p => {
  const list = D.regulars();
  return {
    html: `<header class="hero s">${UI.stack.length > 1 ? navBack(backLabel()) : '<div class="nav"></div>'}<div class="head"><h1 class="title">Who are you?</h1></div><p class="sub">So your scores and card are yours.</p></header>
      ${sec('', cardOf(list.map(m => `<button class="row" data-act="pick" data-id="${m.id}"><span class="lname${m.id === DB.prefs.me ? ' b' : ''}">${avBadge(m.id, m.id === DB.prefs.me ? 'is-me' : '')}<span class="ln"><span class="n">${esc(m.name)}</span>${m.full && m.full !== m.name ? `<span class="cap">${esc(m.full)}</span>` : ''}</span></span>${m.id === DB.prefs.me ? `<span class="c-g">${sized(ICON.check, 20)}</span>` : chev}</button>`).join('')), false)}`
  };
};
