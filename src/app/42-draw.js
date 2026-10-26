/* ----- Breakfast draw (owner brief §7; design agreed with Codex on issue #1, 26 October) -----
   The committee sets four pots; at breakfast one device draws one name from each pot per team, without replacement.
   The drawn team is the playing group. Rules and checks live in src/draw.js (window.Draw); storage is the settings table:
     pots:<rid>  drawdev:<rid>  drawepoch:<rid>  draw:<rid>:<epoch>:<team>:<pot>:<device>  drawshort:<rid>:<epoch>  drawpace:<rid>
   The draw is finished when the round's own groups carry the draw's mark (group.draw = epoch): the groups and "finished"
   are one row written in one request, so no phone can ever see one without the other (Codex review of #45, 26 October).
   Guarantees:
   - One device runs the draw. Becoming that device needs the server to confirm it (online); once confirmed it may carry
     on offline (each pick waits in the outbox, stored on the device). The server has no compare-and-set, so two phones
     claiming at the same moment can both briefly be confirmed: online, each pick first checks the server again, which
     narrows that to a moment, and if both still draw, their picks are a visible clash that blocks the groups.
   - Each pick is saved before its wheel turns, so a reload replays the result and never redraws.
   - Each pick's key includes the device, so nothing is overwritten: a clash shows and blocks the groups.
   - No undo: a mistake means a logged restart, only before the groups are made and before any score.
   - The groups wait until every pick is confirmed by the server, and the committee has agreed how any short team plays. */
const DR = window.Draw;
const SPIN_MS = 2600, SPIN_GAP = 350;

const drawDev = () => {
  if (!DB.prefs.dev) { DB.prefs.dev = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); savePrefs(); }
  return DB.prefs.dev;
};
const jsonSetting = (k, d) => { try { const v = JSON.parse(D.setting(k, '')); return v && typeof v === 'object' ? v : d; } catch (e) { return d; } };
const serverSetting = k => { const s = (DB.server.tables.settings || []).find(x => x.key === k); return s ? s.value : null; };
/* Settings keys this device has written that the server has not yet confirmed in a sync. */
function pendingSettingKeys() {
  const ks = new Set();
  [...DB.outbox, ...(DB.sent || [])].forEach(i => { const q = i.req; if (q && q.op === 'put' && q.table === 'settings') (q.rows || []).forEach(r => ks.add(r.key)); });
  return ks;
}
const drawMade = r => !!r && (r.groups || []).some(g => g && g.draw);
const hasScores = rid => Object.values(D.scores(rid) || {}).some(h => Object.values(h || {}).some(E.isEntered));
const potsOf = rid => { const v = jsonSetting('pots:' + rid, null); const ps = v && Array.isArray(v.pots) ? v.pots : []; return { pots: [0, 1, 2, 3].map(i => (Array.isArray(ps[i]) ? ps[i] : [])), show: !!(v && v.show) }; };
const hasPots = rid => potsOf(rid).pots.some(x => x.length);

function drawOf(rid) {
  const { pots, show } = potsOf(rid);
  const ep = Number(D.setting('drawepoch:' + rid, 1)) || 1;
  const holder = jsonSetting('drawdev:' + rid, null);
  const keep = holder && holder.keep && Number(holder.keep.ep) === ep ? holder.keep.slots || [] : [];
  const st = DR.state(pots, DR.picksFrom(view().settings, rid, ep), { holder: holder && holder.dev, keep });
  const pend = pendingSettingKeys();
  const pending = [...pend].some(k => k.indexOf(`draw:${rid}:`) === 0 || k === 'drawdev:' + rid || k === 'drawepoch:' + rid);
  let onServer = null; try { onServer = JSON.parse(serverSetting('drawdev:' + rid) || 'null'); } catch (e) { /* not set */ }
  // This device may draw only once the server has confirmed it as the draw device.
  const mine = !!holder && holder.dev === drawDev() && !!onServer && onServer.dev === drawDev() && !pend.has('drawdev:' + rid);
  const shortOk = (jsonSetting(`drawshort:${rid}:${ep}`, { teams: [] }).teams || []).map(Number);
  return { rid, pots, show, ep, holder, mine, st, pending, shortOk,
    made: drawMade(D.round(rid)), pace: D.setting('drawpace:' + rid, 'one') === 'all' ? 'all' : 'one' };
}
/* A draw in progress: phones check for news more often so people further away can follow it. */
const drawLive = () => D.rounds().some(r => r.status !== 'final' && hasPots(r.id) && (() => { const d = drawOf(r.id); return d.st.started && !d.made; })());

/* The wheel turning for the picks just saved. Kept in prefs, so a reload mid-spin finishes the same spin. */
const spinOf = rid => { const s = DB.prefs.drawSpin; return s && s.rid === rid && Date.now() - s.at < spinTotal(s) ? s : null; };
const spinTotal = s => SPIN_MS + (s.slots.length - 1) * SPIN_GAP;
/* Ask the server again shortly, so "saved" turns into "confirmed" without waiting for the next minute's check. */
let drawCheck = null;
function drawConfirmSoon() {
  if (drawCheck) return;
  drawCheck = setTimeout(() => { drawCheck = null; if (DB.outbox.length) { flush(); drawConfirmSoon(); return; } sync().then(render); }, 700);
}
const shortName = pid => { const m = D.member(pid); return (m && m.name) || pid; };

function wheelSvg(names, pick, spin, i) {
  const n = Math.max(1, names.length), seg = 360 / n, R = 100;
  const shades = ['#0B3D2E', '#14523F', '#0F4636', '#1B5E49'];
  const at = a => [R + R * Math.sin(a * Math.PI / 180), R - R * Math.cos(a * Math.PI / 180)];
  const parts = names.map((pid, k) => {
    const a0 = k * seg, a1 = (k + 1) * seg, [x0, y0] = at(a0), [x1, y1] = at(a1), mid = a0 + seg / 2;
    const path = n === 1 ? `<circle cx="${R}" cy="${R}" r="${R}" fill="${shades[0]}"/>` : `<path d="M${R},${R} L${x0.toFixed(2)},${y0.toFixed(2)} A${R},${R} 0 ${seg > 180 ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z" fill="${shades[k % (n % 2 && n > 1 ? 3 : 4)]}" stroke="#FAF8F3" stroke-width="1.5"/>`;
    const nm = shortName(pid), fs = Math.max(9, Math.min(17, 150 / Math.max(6, nm.length)));
    const flip = mid > 90 && mid < 270;
    return `${path}<text transform="rotate(${mid.toFixed(2)} ${R} ${R})${flip ? ` rotate(180 ${R} ${R - 58})` : ''}" x="${R}" y="${R - 58}" text-anchor="middle" dominant-baseline="middle" font-size="${fs.toFixed(1)}" fill="#FAF8F3" font-weight="650" font-family="-apple-system,system-ui,sans-serif">${esc(nm)}</text>`;
  }).join('');
  let style = '';
  if (spin && pick) {
    const k = names.indexOf(pick), to = 360 * 5 - (k + 0.5) * seg;
    const dur = SPIN_MS + i * SPIN_GAP, gone = Math.min(dur, Date.now() - spin.at);
    style = ` style="--to:${to.toFixed(2)}deg;animation:drw-spin ${dur}ms cubic-bezier(.12,.62,.1,1) ${-gone}ms forwards"`;
  }
  return `<div class="drw-wheel" aria-hidden="true"><i class="drw-ptr"></i><svg viewBox="-4 -4 208 208"><g class="drw-rot"${style}>${parts}</g><circle cx="${R}" cy="${R}" r="14" fill="#FAF8F3"/></svg></div>`;
}

/* One pot's place in the team on the stage: a name, a turning wheel, a still wheel, or nobody left. */
function stageCell(d, team, p, spin) {
  const s = team.slots[p], spinning = spin && spin.slots.findIndex(x => x.t === team.n - 1 && x.p === p);
  const head = `<span class="drw-pot">Pot ${DR.potName(p)}</span>`;
  if (s.conflict) return `<div class="drw-cell warn">${head}<b class="drw-none">Two devices drew here</b></div>`;
  if (s.pid && spin && spinning > -1) {
    const pool = d.pots[p].filter(pid => pid === s.pid || d.st.left[p].includes(pid));
    return `<div class="drw-cell spin" data-act="draw-skip">${head}${wheelSvg(pool, s.pid, spin, spinning)}</div>`;
  }
  if (s.pid) return `<div class="drw-cell got">${head}<b class="drw-name" style="--len:${Math.max(6, shortName(s.pid).length)}">${esc(shortName(s.pid))}</b></div>`;
  if (!d.st.left[p].length) return `<div class="drw-cell">${head}<b class="drw-none">No one left in pot ${DR.potName(p)}</b></div>`;
  return `<div class="drw-cell wait">${head}${wheelSvg(d.st.left[p], null, null, 0)}</div>`;
}

const drawBanner = d => [
  d.st.conflicts.length ? `<div class="banner warn">Two devices drew the same place, so this draw can't make the groups. Restart it from the draw page.</div>` : '',
  d.st.dup.length || d.st.stray.length ? '<div class="banner warn">Someone was drawn twice or from the wrong pot. Restart the draw.</div>' : ''
].join('');

/* The organiser's page for the draw: pots, who can see them, pacing, and the way in. */
ORG.drawhome = p => {
  const r = D.round(p.rid), d = drawOf(p.rid);
  const counts = d.pots.map((x, i) => `${DR.potName(i)} ${x.length}`).join(' · ');
  const uneven = new Set(d.pots.filter(x => x.length).map(x => x.length)).size > 1;
  if (d.made) return { html: `<header class="hero s">${navBack(roundName(r))}<div class="head"><h1 class="title">Breakfast draw</h1></div><p class="sub">Done. The teams are the groups.</p></header>
    <button class="btn" data-act="org-go" data-v="drawlineup" data-rid="${r.id}">Line-up</button>` };
  const elsewhere = d.holder && d.holder.dev !== drawDev();
  let html = `<header class="hero s">${navBack(roundName(r))}<div class="head"><h1 class="title">Breakfast draw</h1></div><p class="sub">${esc(counts)}${uneven ? ' · pots are uneven' : ''}</p></header>${drawBanner(d)}`;
  html += sec('', cardOf(`
    <button class="row tall" data-act="org-go" data-v="pots" data-rid="${r.id}"><span class="two"><span>Pots</span><span class="sub">${d.st.started ? 'Fixed now the draw has started' : 'Put each player in pot A, B, C or D'}</span></span>${chev}</button>
    <button class="row tall" data-act="draw-show" data-rid="${r.id}"><span class="two"><span>Members can see the pots</span><span class="sub">On the round page, names only</span></span><span class="pill ${d.show ? 'g' : 'n'}">${d.show ? 'On' : 'Off'}</span></button>
    <div class="row tall"><span class="two"><span>Pace</span><span class="sub">${d.pace === 'all' ? 'All four pots together' : 'One pot at a time'}</span></span><span class="seg sm drw-pace"><button class="${d.pace === 'one' ? 'on' : ''}" data-act="draw-pace" data-rid="${r.id}" data-v="one" aria-pressed="${d.pace === 'one'}">One</button><button class="${d.pace === 'all' ? 'on' : ''}" data-act="draw-pace" data-rid="${r.id}" data-v="all" aria-pressed="${d.pace === 'all'}">All four</button></span></div>${elsewhere ? '\n    <div class="row tall"><span class="sub">Another device is running the draw</span></div>' : ''}`), true);
  html += `<button class="btn" data-act="org-go" data-v="draw" data-rid="${r.id}">${d.st.started ? 'Back to the draw' : 'Open the draw'}</button>`;
  if (d.st.started) html += `<button class="btn quiet" data-act="org-go" data-v="drawlineup" data-rid="${r.id}">Line-up</button>`;
  if (d.st.started && !d.made && !hasScores(r.id)) html += `<div class="foot"><button class="link c-b" data-act="draw-restart" data-rid="${r.id}">${UI.confirm === 'drestart-' + r.id ? 'Tap again to restart: everyone goes back in their pots' : 'Restart the draw'}</button></div>`;
  return { html };
};

/* Pots: tap A, B, C or D beside each name. Fixed once the first name is drawn. */
ORG.pots = p => {
  const r = D.round(p.rid), d = drawOf(p.rid), at = {};
  d.pots.forEach((x, i) => x.forEach(pid => { at[pid] = i; }));
  const probs = d.pots.some(x => x.length) ? DR.potProblems(d.pots.filter(x => x.length)) : [];
  const people = D.members().filter(m => m.active !== false || at[m.id] !== undefined);
  const rows = people.map(m => `<div class="row drw-prow"><span class="drw-pn">${esc(m.name)}</span><span class="drw-pb" role="group" aria-label="Pot for ${esc(m.name)}">${[0, 1, 2, 3].map(i => `<button class="${at[m.id] === i ? 'on' : ''}" data-act="draw-pot" data-rid="${r.id}" data-pid="${m.id}" data-p="${i}" aria-pressed="${at[m.id] === i}"${d.st.started ? ' disabled' : ''}>${DR.potName(i)}</button>`).join('')}</span></div>`).join('');
  return { html: `<header class="hero s">${navBack('Breakfast draw')}<div class="head"><h1 class="title">Pots</h1></div><p class="sub">${d.pots.map((x, i) => `${DR.potName(i)} ${x.length}`).join(' · ')}</p></header>
    ${d.st.started ? '<div class="banner note">The draw has started, so the pots are fixed.</div>' : ''}${probs.map(w => `<div class="banner warn">${esc(w)}</div>`).join('')}
    ${sec('', cardOf(rows), true)}` };
};

/* The stage: only the team being drawn, its four pots as big wheels, then the name. */
ORG.draw = p => {
  const r = D.round(p.rid), d = drawOf(p.rid), spin = spinOf(p.rid);
  const T = d.st.teams.length;
  const hold = UI.drawHold && UI.drawHold.rid === p.rid ? UI.drawHold.t : -1;
  const ti = spin ? spin.slots[0].t : hold > -1 ? hold : d.st.current;
  const top = `<header class="hero s drw-top">${navBack('Breakfast draw', 'back')}</header>`;
  if (!T) return { html: top + cardOf('<div class="row"><span class="sub">Set the pots first.</span></div>') };
  if (ti < 0) {
    if (d.pending) drawConfirmSoon();
    else if (d.mine && !d.made && !(r.groups && r.groups.length) && !DR.blockers(d.st, { shortOk: d.shortOk }).length) drawAutoSoon(r.id);
    return { html: `${top}<div class="drw-stage done"><p class="drw-kicker">Breakfast draw</p><h1 class="drw-team">${d.made ? 'These are the groups' : `All ${T} teams drawn`}</h1>${drawBanner(d)}
      <button class="btn" data-act="org-go" data-v="drawlineup" data-rid="${r.id}">See the line-up</button></div>` };
  }
  const team = d.st.teams[ti];
  const cells = team.slots.map((_, i) => stageCell(d, team, i, spin)).join('');
  const teamOpen = d.st.next.length && d.st.current === ti;
  let act = '';
  if (d.pending) drawConfirmSoon();
  if (!d.mine && d.holder && d.holder.dev === drawDev()) act = '<p class="drw-watch">Waiting for the server to confirm this device…</p>';
  else if (!d.mine) {
    const online = DB.online && !DB.outbox.length;
    act = `${d.holder ? '<p class="drw-watch">The draw is running on another device.</p>' : ''}
      ${online ? (d.holder ? `<button class="btn quiet" data-act="draw-claim" data-rid="${r.id}">${UI.confirm === 'dclaim-' + r.id ? 'Tap again to take over the draw here' : 'Take over the draw here'}</button>` : `<button class="btn drw-go" data-act="draw-claim" data-rid="${r.id}">Start the draw</button>`) : '<p class="drw-watch">Connect to the internet to run the draw here.</p>'}`;
  } else if (spin) act = '<p class="drw-watch">Tap a wheel to stop it</p>';
  else if (DB.prefs.drawBusy && DB.prefs.drawBusy.rid === r.id && Date.now() - DB.prefs.drawBusy.at < 8000) act = '<button class="btn drw-go" disabled>Checking…</button>';
  else if (teamOpen) act = `<button class="btn drw-go" data-act="draw-go" data-rid="${r.id}">${d.pace === 'all' ? `Draw team ${ti + 1}` : `Draw pot ${DR.potName(d.st.next[0].p)}`}</button>`;
  else if (d.st.current > -1) act = `<button class="btn drw-go" data-act="draw-next" data-rid="${r.id}">Next team</button>`;
  else act = `<button class="btn drw-go" data-act="draw-next" data-rid="${r.id}">See the line-up</button>`;
  return { html: `${top}<div class="drw-stage"><p class="drw-kicker">Breakfast draw · ${T} teams</p><h1 class="drw-team">Team ${ti + 1}</h1>${drawBanner(d)}
    <div class="drw-cells">${cells}</div><div class="drw-act">${act}</div>${d.pending ? '<p class="drw-sync">Saving to the server…</p>' : ''}</div>` };
};

/* After the draw: everyone, names first, team numbers as quiet labels. Then the groups. */
/* The line-up: a pine card, names first. Once the groups are made it shows the saved groups (with tee times), so a later
   tee-time swap shows here too; before that, the drawn teams. */
function drawLineup(d, r) {
  const teams = r && drawMade(r)
    ? r.groups.map(g => ({ label: `${g.teeTime ? esc(g.teeTime) + ' · ' : ''}Team ${g.n}`, names: g.teams.flat().map(pid => esc(shortName(pid))) }))
    : d.st.teams.map(tm => ({ label: `Team ${tm.n}`, names: tm.slots.map(s => s.pid ? esc(shortName(s.pid)) : `<span class="drw-gap">${s.conflict ? 'Two devices drew here' : `No one from pot ${DR.potName(s.p)}`}</span>`) }));
  return `<div class="drw-lineup">${teams.map(t => `<section class="drw-lt"><span class="drw-ln">${t.label}</span><ul>${t.names.map(n => `<li>${n}</li>`).join('')}</ul></section>`).join('')}</div>`;
}
ORG.drawlineup = p => {
  const r = D.round(p.rid), d = drawOf(p.rid);
  const why = DR.blockers(d.st, { pending: d.pending, shortOk: d.shortOk });
  const scored = hasScores(r.id);
  let html = `<header class="hero s">${navBack('Breakfast draw')}<div class="head"><h1 class="title">${d.made ? 'The groups' : 'Line-up'}</h1></div><p class="sub">${esc(roundName(r))}</p></header>${drawBanner(d)}${drawLineup(d, r)}`;
  if (d.st.short.length) html += sec(label('Short teams'), cardOf(d.st.short.map(n => `<button class="row tall" data-act="draw-short" data-rid="${r.id}" data-n="${n}"><span class="two"><span>Team ${n} plays short</span><span class="sub">Tick once the committee has agreed how</span></span><span class="pill ${d.shortOk.includes(n) ? 'g' : 'n'}">${d.shortOk.includes(n) ? 'Agreed' : 'Not yet'}</span></button>`).join('')), true);
  if (d.made) { /* the title says it */ }
  else if (scored) html += '<div class="banner note">Scores are in, so the groups can\'t change now.</div>';
  else if (why.length) html += why.filter(w => !/not saved to the server/.test(w) || !d.mine).map(w => `<p class="cap note">${esc(w)}</p>`).join('') + (d.pending ? '<p class="cap note">Saving to the server…</p>' : '');
  else if (!d.mine) html += '<p class="cap note">The device running the draw saves these as the groups.</p>';
  else if (r.groups && r.groups.length) html += `<button class="btn" data-act="draw-make" data-rid="${r.id}">${UI.confirm === 'dmake-' + r.id ? 'Tap again: these replace the current groups' : 'Make these the groups'}</button>`;
  else drawAutoSoon(r.id);
  if (d.pending) drawConfirmSoon();
  return { html };
};

/* Members: the pots before the draw, then the teams as they are drawn (names first). */
function drawMemberView(r) {
  const d = drawOf(r.id);
  if (d.st.started) return `<p class="cap" style="margin:4px 4px 10px">${d.made ? 'The draw is done.' : d.st.current > -1 ? `Drawing team ${d.st.current + 1}…` : 'All teams drawn.'}</p>${drawLineup(d, r)}`;
  return `<div class="drw-potlist">${d.pots.map((x, i) => x.length ? `<section class="card drw-mpot"><div class="drw-mh">Pot ${DR.potName(i)}</div>${x.map(pid => `<div class="row"><span>${esc(D.nameOf(pid))}</span></div>`).join('')}</section>` : '').join('')}</div>`;
}
/* Once the draw has made the groups, members just see Groups (owner, 26 October). */
const drawTabOn = r => !!r && r.status !== 'final' && hasPots(r.id) && !drawMade(r) && (potsOf(r.id).show || drawOf(r.id).st.started);

/* ----- Actions ----- */
/* Online, a pick first checks the server (is this still the draw device? has anything changed?); offline it goes ahead.
   The check is marked in prefs, so a double tap while it runs draws nothing. */
function drawPick(rid) {
  const busy = DB.prefs.drawBusy;
  if (busy && busy.rid === rid && Date.now() - busy.at < 8000) return;
  const d0 = drawOf(rid);
  if (!d0.mine || spinOf(rid)) return;
  if (!DB.online || DB.outbox.length) { drawPickNow(rid); return; }
  DB.prefs.drawBusy = { rid, at: Date.now() }; savePrefs(); render();
  sync().catch(() => {}).then(() => { DB.prefs.drawBusy = null; savePrefs(); drawPickNow(rid); });
}
function drawPickNow(rid) {
  const d = drawOf(rid);
  if (!d.mine || spinOf(rid) || !d.st.next.length || d.made || hasScores(rid) || d.st.conflicts.length) { render(); return; }
  const slots = d.pace === 'all' ? d.st.next : d.st.next.slice(0, 1);
  const rand = () => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0]; };
  const picks = DR.draw(d.st, slots, rand), dev = drawDev(), at = new Date().toISOString();
  // Saved (queued on this device) before the wheel turns: a reload replays these names, it never draws again.
  DB.prefs.drawSpin = { rid, slots: picks, at: Date.now() }; savePrefs();
  put('settings', picks.map(x => ({ key: `draw:${rid}:${d.ep}:${x.t}:${x.p}:${dev}`, value: JSON.stringify({ pid: x.pid, at }) })),
    { action: 'Breakfast draw', detail: picks.map(x => `Team ${x.t + 1} pot ${DR.potName(x.p)}: ${D.nameOf(x.pid)}`).join(' · ') });
  UI.drawHold = { rid, t: picks[0].t };
  render();
  drawConfirmSoon();
  setTimeout(render, spinTotal(DB.prefs.drawSpin) + 30);
}
const DRAW_ACT = {
  'draw-pot': el => {
    const rid = el.dataset.rid, pid = el.dataset.pid, p = Number(el.dataset.p), d = drawOf(rid);
    if (d.st.started) { toast('The draw has started, so the pots are fixed.'); return; }
    const pots = d.pots.map(x => x.filter(id => id !== pid));
    if (!(d.pots[p] || []).includes(pid)) pots[p].push(pid);
    put('settings', [{ key: 'pots:' + rid, value: JSON.stringify({ pots, show: d.show }) }]);
    render();
  },
  'draw-show': el => {
    const rid = el.dataset.rid, d = drawOf(rid);
    put('settings', [{ key: 'pots:' + rid, value: JSON.stringify({ pots: d.pots, show: !d.show }) }], { action: 'Breakfast draw', detail: d.show ? 'Pots hidden from members' : 'Pots shown to members' });
    render();
  },
  'draw-pace': el => { put('settings', [{ key: 'drawpace:' + el.dataset.rid, value: el.dataset.v === 'all' ? 'all' : 'one' }]); render(); },
  'draw-claim': el => {
    const rid = el.dataset.rid, d = drawOf(rid);
    if (!DB.online || DB.outbox.length) { toast('Connect to the internet first.'); return; }
    if (d.made || hasScores(rid)) { toast('The groups are made, so the draw is closed.'); return; }
    // Starting the draw is one tap; taking it over from another device is two.
    if (d.holder && UI.confirm !== 'dclaim-' + rid) { UI.confirm = 'dclaim-' + rid; render(); return; }
    UI.confirm = null;
    // Check with the server first: a device that has been asleep must not take over a draw that is already finished.
    sync().then(() => {
      const d2 = drawOf(rid);
      if (!DB.online || DB.outbox.length) { toast('Connect to the internet first.'); render(); return; }
      if (d2.made || hasScores(rid)) { toast('The groups are made, so the draw is closed.'); render(); return; }
      // Keep the picks the server already has; anything the old device draws after this point shows as a clash.
      const kept = Object.keys(DR.picksFrom(DB.server.tables.settings, rid, d2.ep));
      put('settings', [{ key: 'drawdev:' + rid, value: JSON.stringify({ dev: drawDev(), at: new Date().toISOString(), keep: { ep: d2.ep, slots: kept } }) }],
        { action: 'Breakfast draw', detail: d2.holder ? 'Draw taken over by another device' : 'Draw device chosen' });
      drawConfirmSoon();
      render();
    });
    render();
  },
  'draw-go': el => drawPick(el.dataset.rid),
  'draw-skip': el => { const s = DB.prefs.drawSpin; if (s) { s.at = 0; savePrefs(); } render(); },
  'draw-next': el => { UI.drawHold = null; const d = drawOf(el.dataset.rid); if (d.st.current < 0) go('drawlineup', { rid: el.dataset.rid }); else render(); },
  'draw-restart': el => {
    const rid = el.dataset.rid, d = drawOf(rid);
    if (d.made || hasScores(rid)) { toast('The groups are made, so the draw can\'t restart.'); return; }
    if (d.holder && !d.mine) { toast('Only the device running the draw can restart it.'); return; }
    if (UI.confirm !== 'drestart-' + rid) { UI.confirm = 'drestart-' + rid; render(); return; }
    UI.confirm = null; UI.drawHold = null;
    if (!DB.online) { toast('Connect to the internet to restart the draw.'); render(); return; }
    // Check with the server first, so a device that missed the groups being made can't reopen the draw.
    sync().then(() => {
      const d2 = drawOf(rid);
      if (d2.made || hasScores(rid) || (d2.holder && !d2.mine)) { toast('The draw can\'t restart now.'); render(); return; }
      const ep = d2.ep + 1;
      put('settings', [{ key: 'drawepoch:' + rid, value: String(ep) }].concat(d2.holder ? [{ key: 'drawdev:' + rid, value: JSON.stringify({ dev: d2.holder.dev, at: new Date().toISOString(), keep: { ep, slots: [] } }) }] : []),
        { action: 'Breakfast draw', detail: 'Draw restarted' });
      toast('Everyone is back in their pots');
      drawConfirmSoon();
      render();
    });
    render();
  },
  'draw-short': el => {
    const rid = el.dataset.rid, n = Number(el.dataset.n), d = drawOf(rid);
    if (d.made) return;
    const teams = d.shortOk.includes(n) ? d.shortOk.filter(x => x !== n) : d.shortOk.concat([n]);
    put('settings', [{ key: `drawshort:${rid}:${d.ep}`, value: JSON.stringify({ teams }) }], { action: 'Breakfast draw', detail: `Team ${n} plays short: ${teams.includes(n) ? 'agreed by the committee' : 'not agreed'}` });
    render();
  },
  // Only needed when the round already had groups made another way: replacing them takes two taps.
  'draw-make': el => {
    const rid = el.dataset.rid;
    if (UI.confirm !== 'dmake-' + rid) { UI.confirm = 'dmake-' + rid; render(); return; }
    UI.confirm = null;
    drawMakeGroups(rid, true);
  }
};
/* The drawn teams are the groups (owner, 26 October): as soon as the draw is finished and every pick is confirmed by the
   server, the draw device saves them. One request: the groups and the draw's "finished" mark travel in the same round row. */
function drawMakeGroups(rid, replace) {
  const r = D.round(rid), d = drawOf(rid);
  if (!r || !d.mine || d.made || hasScores(rid)) return false;
  if (DR.blockers(d.st, { pending: d.pending, shortOk: d.shortOk }).length) return false;
  if (r.groups && r.groups.length && !replace) return false;   // groups made by hand: the organiser chooses
  const groups = DR.groupsFrom(d.st, r.first_tee || '', r.interval || 10, E.addMinutes);
  put('rounds', [Object.assign({}, r, { groups: groups.map(g => Object.assign(g, { draw: d.ep })), kb: null })], { action: 'Groups saved', detail: `${roundName(r)}: ${plural(groups.length, 'team')} from the breakfast draw` });
  toast('The teams are the groups');
  render();
  return true;
}
let drawAutoT = null;
const drawAutoSoon = rid => { if (drawAutoT) return; drawAutoT = setTimeout(() => { drawAutoT = null; drawMakeGroups(rid, false); }, 0); };
