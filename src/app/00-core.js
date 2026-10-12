/* NCGS app: shared helpers. All golf maths lives in engine.js; all data rules in server.js.
   Rule for every screen: nothing should need explaining. If a screen needs a hint, change the screen. */
const E = window.Engine;
const BOOT = window.NCGS_BOOT || { mode: 'local' };
const clone = o => JSON.parse(JSON.stringify(o));
const esc = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Icons ---------- */
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICON = {
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
  chev: svg('<path d="M9 5l7 7-7 7"/>'),
  send: svg('<path d="M12 19V5"/><path d="M5.5 11.5L12 5l6.5 6.5"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  users: svg('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6"/><path d="M16 5.2a3 3 0 0 1 0 5.6M18 14.6c1.4.6 2.3 2 2.6 4.4"/>'),
  buggy: svg('<path d="M4 15h15l-1.5-6H9L7 4H4"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>'),
  history: svg('<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/><path d="M12 8v4l3 2"/>'),
  download: svg('<path d="M12 4v11"/><path d="M7.5 10.5L12 15l4.5-4.5"/><path d="M5 20h14"/>'),
  camera: svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  course: svg('<path d="M7 21V5"/><path d="M7 5l9 3.5L7 12"/><ellipse cx="12" cy="20" rx="8" ry="1.6"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  trophy: svg('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5v1.5A3 3 0 0 0 8 10.5"/><path d="M16 6h3v1.5a3 3 0 0 1-3 3"/><path d="M12 13v4"/><path d="M8.5 20h7"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  share: svg('<path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>')
};
const sized = (icon, n) => icon.replace('<svg', `<svg width="${n}" height="${n}"`);
const TABICON = {
  hole: svg('<path d="M6 21V4"/><path d="M6 4h12l-2.5 4L18 12H6"/>'),
  match: svg('<path d="M4 8h14"/><path d="M15 5l3 3-3 3"/><path d="M20 16H6"/><path d="M9 13l-3 3 3 3"/>'),
  rules: svg('<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/><path d="M11.2 8.2a1.8 1.8 0 1 1 2.4 1.7c-.6.3-.9.6-.9 1.3"/><path d="M12.7 13.6v.2"/>'),
  board: svg('<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3"/><path d="M17 6h3v1a3 3 0 0 1-3 3"/>')
};
const CONTEST = { ntp: 'Nearest the pin', ld: 'Longest drive' };

/* ---------- Small helpers ---------- */
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const fmtIndex = i => (i === null || i === undefined ? '–' : i < 0 ? '+' + (-i).toFixed(1) : Number(i).toFixed(1));
const fmtGross = v => (v === 'P' ? 'picked up' : String(v));
const segName = s => ({ front: 'Front nine', back: 'Back nine', overall: 'Overall' }[s]);
const sideCls = l => (l === 'A' ? 'c-a' : l === 'B' ? 'c-b' : '');
const chev = `<span class="chev">${ICON.chev}</span>`;
const pill = i => `<span class="pill ${i ? 'b' : 'a'}">Buggy ${i + 1}</span>`;
const dot = i => `<span class="dot ${i ? 'b' : 'a'}"></span>`;
const ordinal = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const posWord = label => (String(label).startsWith('T') ? 'T' + ordinal(Number(String(label).slice(1))) : ordinal(Number(label)));
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function parseDay(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null; }
function fmtDate(iso, short) {
  const d = parseDay(iso);
  if (!d) return '';
  return short ? `${DAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}` : `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
function todayIso() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function daysFromToday(iso) { const d = parseDay(iso); if (!d) return null; const t = parseDay(todayIso()); return Math.round((d - t) / 86400000); }
function tick() { try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) { /* not supported */ } }
function dots(shots, small) {
  const cls = `dots${small ? ' s' : ''}`;
  if (shots > 0) return `<span class="${cls}" role="img" aria-label="${plural(shots, 'shot')}">${'<i></i>'.repeat(shots)}</span>`;
  if (shots < 0) return `<span class="${cls} give" role="img" aria-label="gives back ${plural(-shots, 'shot')}">${'<i></i>'.repeat(-shots)}</span>`;
  return `<span class="${cls}" role="img" aria-label="no shots"></span>`;
}
// A buggy match result as two small pills in the buggy's colour: "Buggy 1" then "2 up" / "won 3 & 1". Level matches are one grey pill.
const statusPills = st => {
  if (!st.leader) return `<span class="pill n">${esc(st.text)}</span>`;
  const i = st.leader === 'A' ? 0 : 1;
  const m = /(won .+|\d+ up.*)$/.exec(st.text);
  return `<span class="right">${pill(i)}<span class="pill ${i ? 'b' : 'a'} soft">${esc(m ? m[1] : st.text)}</span></span>`;
};
const statusShort = st => {
  if (!st.leader) return st.text;
  const m = /(won .+|\d+ up.*)$/.exec(st.text);
  return `Buggy ${st.leader === 'A' ? 1 : 2} · ${m ? m[1] : st.text}`;
};
const status = st => `<span class="b ${sideCls(st.leader)}">${esc(st.text)}</span>`;
const sec = (label, body, near) => `<section class="sec${near ? ' near' : ''}">${label ? `<div class="sec-label">${label}</div>` : ''}${body}</section>`;
const label = t => `<span class="sub">${t}</span>`;
const cardOf = rows => `<div class="card">${rows}</div>`;
const navBack = (lbl, act = 'back') => `<div class="nav"><button class="link" data-act="${act}">${ICON.back}${esc(lbl)}</button></div>`;
