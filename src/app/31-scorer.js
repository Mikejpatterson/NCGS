/* ----- Who keeps the score (owner, 1 November: option A from the reviewer's stress test) -----
   One phone per group keeps the score. The first time a phone whose player is in a group opens Hole in a round, it asks
   once. Yes: the scoring screens as before. No: a read-only view of the group (where it is, its card, Buggy Wars), with
   no scoring controls and no contest card, and a plain link to switch. The answer is kept on this phone only, per round. */
const scorerAnswer = rid => (DB.prefs.scorer || {})[rid];
const followingOnly = rid => !!rid && scorerAnswer(rid) === false;
function setScorer(rid, yes) {
  DB.prefs.scorer = Object.assign({}, DB.prefs.scorer, { [rid]: !!yes });
  savePrefs();
}

VIEWS.scorer = () => {
  const rid = playRid(), g = myGroup(rid);
  if (!g) return VIEWS.round({ rid });
  const r = D.round(rid);
  const what = isScramble(r) ? 'team' : 'group';
  return {
    tabs: 'hole',
    html: `<header class="hero s">${navBack('Home', 'home')}<div class="head"><h1 class="title">Are you keeping the score for Group ${g.n}?</h1></div><p class="sub">One phone per ${what} keeps the score. Everyone else can follow along.</p></header>
      <section class="sec near scorer-q">
        <button class="btn" data-act="scorer-yes" data-rid="${rid}">Yes, I'm keeping score</button>
        <button class="btn quiet" data-act="scorer-no" data-rid="${rid}">No, just following</button>
      </section>`
  };
};

VIEWS.follow = () => {
  const rid = playRid(), r = D.round(rid), g = myGroup(rid);
  if (!r || !g) return VIEWS.round({ rid });
  const switchLink = `<div class="foot follow-switch"><p class="cap">One phone per group keeps the score.</p><button class="link" data-act="scorer-yes" data-rid="${rid}">I'm keeping score</button></div>`;
  const results = `<button class="btn" data-act="tab" data-tab="board">Results</button>`;
  if (isScramble(r)) {
    const s = scrambleOf(rid), t = s && s.standings.find(x => x.id === g.id);
    if (!t) return VIEWS.round({ rid });
    const where = t.complete ? 'Finished' : t.played ? `Thru ${t.played}` : 'Not started';
    return {
      tabs: 'hole',
      html: `<header class="hero c pine entcard follow-top"><div class="entrow"><div class="entl"><small>${esc(t.name.toUpperCase())}</small><b class="entn num">${t.total}</b></div><div class="entr"><b>${where}</b><span>Team Stableford</span></div></div></header>
        <p class="sub" style="margin:12px 0 0">You're following. The team's scorer puts in the scores.</p>
        ${results}${switchLink}`
    };
  }
  const comp = computeR(rid);
  const gc = comp && comp.groups.find(x => x.id === g.id);
  if (!gc) return VIEWS.round({ rid });
  const where = !gc.holesDone ? 'Not started' : gc.nextHole ? `Thru ${gc.holesDone}` : 'Finished';
  const next = gc.nextHole && gc.holesDone ? `Next: hole ${gc.nextHole}` : gc.nextHole ? `Starts on hole ${gc.nextHole}` : 'All 18 holes in';
  const buggies = gc.teams.length === 2;
  const players = gc.teams.map((t, i) => t.map(pid => dropRow(rid, { id: pid }, `<span style="display:flex;align-items:center;gap:8px">${buggies ? dot(i) : ''}${esc(D.nameOf(pid))}</span><span class="right"><span class="b num">${comp.players[pid].total}</span>${dropChev}</span>`, 'row')).join('')).join('');
  const bw = buggies ? ['front', 'back', 'overall'].map(s => `<div class="row"><span>${segName(s)}</span>${statusPills(gc.matches[s].status)}</div>`).join('') : '';
  return {
    tabs: 'hole',
    html: `<header class="hero c pine entcard follow-top"><div class="entrow"><div class="entl"><small>GROUP</small><b class="entn num">${gc.n}</b></div><div class="entr"><b>${where}</b><span>${next}</span></div></div></header>
      <p class="sub" style="margin:12px 0 0">You're following. Your group's scorer puts in the scores. Tap a name for their card.</p>
      ${sec(label('Stableford points'), cardOf(players), true)}
      ${buggies ? sec(label('Buggy Wars'), cardOf(bw)) : ''}
      ${results}${switchLink}`
  };
};

const SCORER_ACT = {
  'scorer-yes': el => {
    const rid = el.dataset.rid || playRid();
    setScorer(rid, true);
    UI.playRid = rid; UI.edit = false; UI.after = null; UI.teeHole = null;
    replaceTop(playHomeView(rid), { rid });
  },
  'scorer-no': el => {
    const rid = el.dataset.rid || playRid();
    setScorer(rid, false);
    UI.playRid = rid; UI.contestSheet = false;
    replaceTop('follow', { rid });
  }
};
