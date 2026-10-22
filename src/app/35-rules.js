/* ----- Rules checker: ask about the Rules of Golf, checked live against the official rules ----- */
const SPEECH = window.SpeechRecognition || window.webkitSpeechRecognition;
const SIT_SVG = d => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ASK_IDEAS = [
  { q: 'My ball hit another ball on the green. What now?', t: 'Ball hit a ball', s: 'On the green', i: SIT_SVG('<circle cx="8" cy="13" r="4.5"/><circle cx="17.5" cy="11" r="3.5"/><path d="M3 20h18"/>') },
  { q: 'Ball moved after I addressed it', t: 'Ball moved', s: 'After you set up', i: SIT_SVG('<circle cx="8.5" cy="14" r="4.5"/><path d="M15 8h6m0 0-2.5-2.5M21 8l-2.5 2.5"/>') },
  { q: 'Ball in a bunker footprint or plugged lie', t: 'Bunker trouble', s: 'Footprint or plugged', i: SIT_SVG('<path d="M2 19h20"/><path d="M4 19c1.5-6 5-9.5 9-9.5 3.2 0 5.3 2.4 7 9.5"/>') },
  { q: 'Unplayable lie: what are my options?', t: 'Unplayable lie', s: 'Your options', i: SIT_SVG('<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>') }
];

// Plain text from the answer: paragraphs, "- " bullets and **bold**, nothing else.
function askText(t) {
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  return String(t).trim().split(/\n{2,}/).map(par => `<div class="ap">${par.split('\n').map(l => /^\s*[-•*]\s+/.test(l) ? `<div class="ab">${inline(l.replace(/^\s*[-•*]\s+/, ''))}</div>` : `<div>${inline(l)}</div>`).join('')}</div>`).join('');
}

/* ----- Rule chips: every rule a ruling cites can be tapped to see the rule itself ----- */
// The 25 Rules of Golf by name (titles only; the wording itself is read on the R&A site or quoted from it).
const RULE_TITLES = ['', 'The Game, Player Conduct and the Rules', 'The Course', 'The Competition', "The Player's Equipment",
  'Playing the Round', 'Playing a Hole', 'Ball Search: Finding and Identifying Ball', 'Course Played as It Is Found',
  'Ball Played as It Lies; Ball at Rest Lifted or Moved', 'Preparing for and Making a Stroke; Advice and Help; Caddies',
  'Ball in Motion Accidentally Hits Person, Animal or Object; Deliberate Actions to Affect Ball in Motion', 'Bunkers',
  'Putting Greens', 'Procedures for Ball: Marking, Lifting and Cleaning; Replacing on Spot; Dropping in Relief Area; Playing from Wrong Place',
  'Relief from Loose Impediments and Movable Obstructions', 'Relief from Abnormal Course Conditions, Dangerous Animal Condition, Embedded Ball',
  'Penalty Areas', 'Stroke-and-Distance Relief, Ball Lost or Out of Bounds, Provisional Ball', 'Unplayable Ball',
  'Resolving Rules Issues During Round; Rulings by Referee and Committee', 'Other Forms of Individual Stroke Play and Match Play',
  'Foursomes', 'Four-Ball', 'Team Competitions', 'Modifications for Players with Disabilities'];
// Shorter names for the chips; the pop-up shows the full name.
const RULE_SHORT = { 9: 'Ball Played as It Lies', 10: 'Making a Stroke; Advice; Caddies', 11: 'Ball in Motion Hits Person or Object',
  14: 'Procedures for Ball', 15: 'Loose Impediments, Movable Obstructions', 16: 'Abnormal Course Conditions, Embedded Ball',
  18: 'Stroke and Distance, Lost, Out of Bounds', 20: 'Resolving Rules Issues', 21: 'Other Forms of Play' };
const ruleShort = r => RULE_SHORT[ruleMain(r)] || RULE_TITLES[ruleMain(r)];
const RULE_RE = /Rules?\s+(\d{1,2}(?:\.\d+)?[a-z]?(?:\(\d+\))?)/g;
// "Rule 19", "Rule 14.7a" and so on, in the order they first appear, real rule numbers only.
function ruleRefs(texts) {
  const out = [];
  texts.filter(Boolean).forEach(t => { for (const m of String(t).matchAll(RULE_RE)) { const n = parseInt(m[1], 10); if (n >= 1 && n <= 25 && !out.includes(m[1])) out.push(m[1]); } });
  return out;
}
const ruleMain = r => parseInt(r, 10);
const ruleUrl = r => `https://www.randa.org/en/rog/the-rules-of-golf/rule-${ruleMain(r)}`;
function ruleChips(refs, i) {
  if (!refs.length) return '';
  return `<div class="rrefs">${refs.map(r => `<button class="rref" data-act="rule-open" data-rule="${esc(r)}" data-i="${i}" aria-label="Show Rule ${esc(r)}, ${esc(RULE_TITLES[ruleMain(r)])}"><span class="rref-n">Rule ${esc(r)}</span><span class="rref-t">${esc(ruleShort(r))}</span></button>`).join('')}</div>`;
}
// The pop-up for one rule: its name, the official wording when this answer copied it from the R&A site, and the official page.
function ruleSheetHtml(r, i) {
  const m = UI.chat[i], c = m && m.card;
  const main = ruleMain(r);
  const quote = c && c.quote && c.rule && ruleMain(String(c.rule).replace(/^Rules?\s+/, '')) === main ? c.quote : '';
  return `<div class="scrim rule-scrim" data-act="rule-close"><div class="sheet rulesheet" role="dialog" aria-label="Rule ${esc(r)}">
    <div class="nav"><span class="b">Rule ${esc(r)}</span><button class="link" data-act="rule-close">Done</button></div>
    <h2 class="rs-title">${esc(RULE_TITLES[main])}</h2>
    ${quote ? `<div class="rs-lab">Official wording${c.rule && c.rule !== 'Rule ' + r ? ` · ${esc(c.rule)}` : ''}</div><blockquote class="rs-quote">${esc(quote)}</blockquote>`
      : `<p class="rs-none">The full official wording of Rule ${main} is on the R&amp;A site.</p>`}
    <a class="btn rs-go" href="${ruleUrl(r)}" target="_blank" rel="noopener">Read Rule ${main} on the R&amp;A site</a>
    <p class="cap rs-cap">The official Rules of Golf, from The R&amp;A. It is the official rule that counts.</p></div></div>`;
}
function ruleOpen(r, i) {
  ruleClose();
  document.body.insertAdjacentHTML('beforeend', `<div id="rulesheet">${ruleSheetHtml(r, i)}</div>`);
  const d = document.querySelector('#rulesheet .link'); if (d) d.focus({ preventScroll: true });
}
function ruleClose() { const el = document.getElementById('rulesheet'); if (el) el.remove(); }

// A ruling: the first sentence is the verdict, shown big enough to read out; the rule numbers become chips.
function askRuling(t, i) {
  const text = String(t).trim();
  const m = /^([\s\S]*?[.!?])(?:\s+|$)([\s\S]*)$/.exec(text);
  let verdict = m ? m[1] : text, rest = m ? m[2] : '';
  if (verdict.length > 200) { verdict = text.split('\n')[0]; rest = text.slice(verdict.length); }
  const inline = x => esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  return `<div class="verdict">${inline(verdict.replace(/^\*\*|\*\*$/g, ''))}</div>${rest.trim() ? `<div class="rest">${askText(rest)}</div>` : ''}${ruleChips(ruleRefs([text]), i)}`;
}

// A card from the checker: either one quick question with big tap answers, or the ruling itself.
const boldBits = x => esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
function askCardHtml(c, i, live, sources) {
  const refs = c.type === 'ruling' ? ruleRefs([c.rule, c.verdict, c.intro, ...(c.steps || []), c.note]) : [];
  const hasInfo = c.type === 'ruling' && !refs.length && !!(c.quote || (sources || []).some(x => x && /^https:\/\//.test(x.url))), open = !!(UI.chatInfo && UI.chatInfo[i]);
  if (c.type === 'ask') {
    return `<div class="qcard"><div class="qtext">${esc(c.question)}</div><div class="qopts">${c.options.map(o =>
      `<button class="qopt${o.tag ? ' t-' + o.tag : ''}${/^not sure/i.test(o.label) ? ' dim' : ''}" data-act="ask-idea" data-q="${esc(o.label)}"${live ? '' : ' disabled'}>${o.tag ? `<span class="qtag">${o.tag === 'red' ? 'Red' : 'Yellow'}</span>` : ''}<span>${esc(o.label)}</span></button>`).join('')}</div></div>`;
  }
  const top = [c.topic, c.rule].filter(Boolean).join(' · ');
  return `<div class="rcard">${top ? `<div class="rtop">${esc(top)}</div>` : ''}<div class="rverdict">${boldBits(c.verdict)}</div>${c.intro ? `<div class="rintro">${boldBits(c.intro)}</div>` : ''}
    ${c.steps.length ? `<ol class="rsteps">${c.steps.map((x, n) => `<li><span class="rn">${n + 1}</span><span>${boldBits(x)}</span></li>`).join('')}</ol>` : ''}
    ${c.note ? `<div class="rnote">${boldBits(c.note)}</div>` : ''}
    ${ruleChips(refs, i)}
    <div class="ract"><button class="rbtn" data-act="ask-read" data-i="${i}">${ICON.speak}<span>Read out</span></button><button class="rbtn" data-act="ask-more">Ask more</button>${hasInfo ? `<button class="rbtn rinfo" data-act="ask-info" data-i="${i}" aria-expanded="${open}" aria-label="The official rule wording">i</button>` : ''}</div>
    ${hasInfo && open ? `<div class="rquote"><div class="rqh">${esc(c.rule || 'The rule')} · official wording</div>${c.quote ? `<blockquote>${esc(c.quote)}</blockquote>` : '<p class="rqn">No exact wording came back this time. Open the official rule to read it.</p>'}${askSources(sources)}<p class="rqn">Check it against the link. It is the official rule that counts.</p></div>` : ''}</div>`;
}
function askSpoken(c) { return [c.verdict, c.intro, ...c.steps.map((x, n) => 'Option ' + (n + 1) + '. ' + x), c.note].filter(Boolean).join('. ').replace(/\*\*/g, ''); }
function askRead(i) {
  const m = UI.chat[i];
  if (!m || !m.card || m.card.type !== 'ruling' || !window.speechSynthesis) return toast("Reading out isn't available on this phone.");
  const synth = window.speechSynthesis;
  if (synth.speaking) { synth.cancel(); return; }
  const u = new SpeechSynthesisUtterance(askSpoken(m.card)); u.lang = 'en-IE'; u.rate = 0.95;
  synth.speak(u);
}

function askSources(list) {
  const ok = (list || []).filter(x => x && /^https:\/\//.test(x.url));
  if (!ok.length) return '';
  return `<div class="srcs"><span class="srcl">Source</span>${ok.map(x => `<a class="src" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(String(x.title).replace(/\s*\|.*$/, ''))}</a>`).join('')}</div>`;
}

function askThread() {
  if (!UI.chat.length && !UI.chatBusy) {
    return `<section class="hero pine askhero"><div class="ah-txt"><small>RULING</small><b>What happened?</b><span>Speak or type it. You get a clear ruling, checked against the official rules.</span></div><button class="ah-mic" type="button" data-act="ask-mic" aria-label="Tap and speak your question"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8.5" y="2.5" width="7" height="12" rx="3.5" fill="#fff"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21M8.5 21h7"/></svg></button></section>
      <div class="sitlab">Or pick a common one</div>
      <div class="sits">${ASK_IDEAS.map(x => `<button class="sit" data-act="ask-idea" data-q="${esc(x.q)}"><span class="sit-i">${x.i}</span><span class="sit-t">${esc(x.t)}</span><span class="sit-s">${esc(x.s)}</span></button>`).join('')}</div>`;
  }
  return UI.chat.map((m, i) => m.role === 'user'
    ? `<div class="msg me"><div class="bub">${esc(m.text)}</div></div>`
    : m.card ? `<div class="msg ai card">${askCardHtml(m.card, i, i === UI.chat.length - 1 && !UI.chatBusy, m.sources)}</div>`
    : `<div class="msg ai"><div class="bub${m.error ? ' err' : ''}">${m.error ? esc(m.text) : askRuling(m.text, i) + askSources(m.sources)}</div></div>`).join('')
    + (UI.chatBusy ? '<div class="msg ai"><div class="bub wait" aria-label="Checking the rules"><i></i><i></i><i></i></div></div>' : '')
    + `<p class="cap ask-note">Checked against the official Rules of Golf (R&amp;A and USGA). For anything close, play a second ball and ask the organiser.</p>`;
}

/* ----- Speaking a question: words fill the box as you speak, a waveform shows your voice, Stop / X / Send ----- */
const EQ_BARS = 48;
const eqHtml = () => Array.from({ length: EQ_BARS }, () => '<i></i>').join('');
let listening = null, meter = null;

// The waveform fills from the left, one bar every moment, and scrolls once full. Quiet shows as a dot.
function stopMeter() {
  if (!meter) return;
  clearInterval(meter.timer);
  try { meter.stream && meter.stream.getTracks().forEach(t => t.stop()); } catch (e) { /* already stopped */ }
  try { meter.ctx && meter.ctx.close(); } catch (e) { /* already closed */ }
  meter = null;
  document.querySelectorAll('.eq i').forEach(i => { i.style.height = ''; });
}
function drawMeter() {
  const bars = document.querySelectorAll('.eq i');
  bars.forEach((el, i) => { const v = meter.levels[i]; el.style.height = v == null ? '' : Math.max(3, Math.round(v * 30)) + 'px'; });
}
function startMeter() {
  stopMeter();
  meter = { levels: [], smooth: 0, timer: 0, an: null, buf: null, stream: null, ctx: null, lastWords: 0 };
  const m = meter;
  m.timer = setInterval(() => {
    let v;
    if (m.an) { m.an.getByteTimeDomainData(m.buf); let sum = 0; for (let k = 0; k < m.buf.length; k++) { const d = (m.buf[k] - 128) / 128; sum += d * d; } v = Math.min(1, Math.sqrt(sum / m.buf.length) * 5); }
    else v = Date.now() - UI.askWordsAt < 700 ? 0.25 + Math.random() * 0.6 : 0.03;   // no microphone access for the meter: move while words arrive
    m.smooth += (v - m.smooth) * (v > m.smooth ? 0.7 : 0.35);   // quick to rise, easy to fall
    m.levels.push(m.smooth); if (m.levels.length > EQ_BARS) m.levels.shift();
    drawMeter();
  }, 55);
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    if (meter !== m) { stream.getTracks().forEach(t => t.stop()); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    const an = ctx.createAnalyser(); an.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(an);
    m.stream = stream; m.ctx = ctx; m.an = an; m.buf = new Uint8Array(an.fftSize);
  }).catch(() => { /* keep the fallback */ });
}

function showLive(on) {
  document.body.classList.toggle('hearing', on);
  sizeAsk();
}
// The box grows with the words; the thread keeps clear of it.
function sizeAsk() {
  const bar = document.querySelector('.askbar');
  const box = document.getElementById('askin');
  if (bar && box) bar.classList.toggle('empty', !box.value.trim());
  document.documentElement.style.setProperty('--askh', (bar ? bar.offsetHeight : 76) + 'px');
}

function askListen() {
  // A tap on the microphone while the app thinks it is already listening means a previous go got stuck: reset it.
  if (listening) { const old = listening; listening = null; old.cancel = null; try { old.abort(); } catch (e) { /* already stopped */ } stopMeter(); showLive(false); }
  if (!SPEECH) return askKeyboard('Tap the microphone on your keyboard to speak.');
  const box = document.getElementById('askin');
  const base = (box ? box.value : UI.askDraft).trim();
  let r;
  try { r = new SPEECH(); } catch (e) { return askKeyboard("Dictation isn't available here. Tap the microphone on your keyboard instead."); }
  r.lang = 'en-IE'; r.interimResults = true; r.maxAlternatives = 1; r.continuous = true;
  UI.askWordsAt = 0;
  let cancelled = false, began = false, dog = 0;
  const giveUp = msg => { clearTimeout(dog); cancelled = true; if (listening === r) listening = null; try { r.abort(); } catch (e) { /* not running */ } stopMeter(); showLive(false); askKeyboard(msg); };
  listening = r;
  r.cancel = () => { cancelled = true; try { r.abort(); } catch (e) { /* not running */ } };
  showLive(true);   // answer the tap straight away, even while the phone is still getting the microphone ready
  dog = setTimeout(() => { if (!began) giveUp("The microphone didn't start. Tap it again, or use the microphone on your keyboard."); }, 3500);
  r.onstart = () => { began = true; clearTimeout(dog); startMeter(); };
  r.onresult = ev => {
    began = true; clearTimeout(dog);
    UI.askWordsAt = Date.now();
    const said = Array.from(ev.results).map(x => x[0].transcript).join(' ').replace(/\s+/g, ' ').trim();
    UI.askDraft = (base ? base + ' ' : '') + said;
    const input = document.getElementById('askin');
    if (input) { input.value = UI.askDraft; growAsk(input); }
  };
  r.onerror = ev => {
    clearTimeout(dog);
    if (ev.error === 'aborted') return;
    if (ev.error === 'no-speech') { toast("Didn't catch anything. Tap the microphone and try again."); return; }
    if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') { askKeyboard('Microphone or speech access is off for this app. Turn it on in Settings, or use the microphone on your keyboard.'); return; }
    askKeyboard("Dictation isn't working here (" + ev.error + "). Tap the microphone on your keyboard instead.");
  };
  r.onend = () => {
    clearTimeout(dog);
    if (listening === r) listening = null;
    stopMeter();
    showLive(false);
    if (cancelled) {
      UI.askDraft = base;
      const input = document.getElementById('askin');
      if (input) { input.value = base; growAsk(input); }
    }
  };
  try { r.start(); } catch (e) { giveUp('Tap the microphone on your keyboard to speak.'); }
}
function askStop() { if (listening) { try { listening.stop(); } catch (e) { /* already stopped */ } } }
function askCancel() { if (listening && listening.cancel) listening.cancel(); }
// The box grows with a hidden twin of itself (a real textarea, so the words wrap exactly the same way), so its height can be animated (a textarea cannot animate from "auto").
let askMirror = null;
function growAsk(el) {
  const card = el.closest('.card');
  if (!card) return;
  if (!askMirror || askMirror.parentNode !== card) { askMirror = document.createElement('textarea'); askMirror.className = 'mirror'; askMirror.setAttribute('aria-hidden', 'true'); askMirror.tabIndex = -1; askMirror.readOnly = true; askMirror.rows = 1; card.appendChild(askMirror); }
  askMirror.value = el.value;
  const full = askMirror.scrollHeight, MAX = 168, need = Math.min(full, MAX);
  if (el.dataset.h !== String(need)) { el.style.height = need + 'px'; el.dataset.h = String(need); }
  el.classList.toggle('over', full > MAX);
  if (full > MAX) el.scrollTop = full - MAX;   // glide to the newest words (the box has smooth scrolling)
  sizeAsk();
  // keep the page clear of the box while it is growing
  const t0 = performance.now();
  (function follow() { sizeAsk(); if (performance.now() - t0 < 260) requestAnimationFrame(follow); })();
}
function askKeyboard(msg) { const i = document.getElementById('askin'); if (i) i.focus(); if (msg) toast(msg); }

VIEWS.rules = () => ({
  tabs: 'rules',
  html: `<header class="hero c rulehd${UI.chat.length || UI.chatBusy ? '' : ' empty'}"><div class="hrow2"><h1 class="big" style="font-size:1.9rem">Ruling</h1>${UI.chat.length ? '<button class="link" data-act="ask-clear">New question</button>' : ''}</div></header>
    <div id="thread" class="thread">${askThread()}</div>
    <form class="askbar" data-form="ask" autocomplete="off">
      <div class="card">
        <textarea id="askin" rows="1" enterkeyhint="send" maxlength="600" placeholder="${UI.chat.length ? 'What happened?' : 'Or type it here'}" aria-label="Your rules question">${esc(UI.askDraft)}</textarea>
        <div class="arow">
          <button class="x" type="button" data-act="ask-cancel" aria-label="Cancel">${ICON.x}</button>
          <div class="eq" aria-hidden="true">${eqHtml()}</div>
          <button class="stop" type="button" data-act="ask-stop" aria-label="Stop"><i></i></button>
          <button class="mic" type="button" data-act="ask-mic" aria-label="Speak your question">${ICON.mic}</button>
          <button class="send" type="submit" aria-label="Ask">${ICON.send}</button>
        </div>
      </div>
    </form>`
});

function refreshThread(mode) {
  const el = document.getElementById('thread');
  if (!el) return;
  el.innerHTML = askThread();
  const hd = document.querySelector('.rulehd'); if (hd) hd.classList.toggle('empty', !UI.chat.length && !UI.chatBusy);
  const bar = document.querySelector('.hero .hrow2');
  if (bar && !bar.querySelector('[data-act="ask-clear"]') && UI.chat.length) bar.insertAdjacentHTML('beforeend', '<button class="link" data-act="ask-clear">New question</button>');
  if (bar && !UI.chat.length) { const b = bar.querySelector('[data-act="ask-clear"]'); if (b) b.remove(); }
  const s = scroller();
  if (mode === 'keep') return;
  if (mode === 'answer') {
    // Start at the top of the answer so it reads from the first line
    const msgs = el.querySelectorAll('.msg.ai'), last = msgs[msgs.length - 1];
    if (last) { s.scrollTop += last.getBoundingClientRect().top - s.getBoundingClientRect().top - 12; return; }
  }
  s.scrollTop = s.scrollHeight;
}
function askInfo(i) { UI.chatInfo = UI.chatInfo || {}; UI.chatInfo[i] = !UI.chatInfo[i]; refreshThread('keep'); }

function askQuestion(q) {
  q = String(q || '').trim();
  if (!q || UI.chatBusy) return;
  if (listening) { const l = listening; l.cancel = null; try { l.abort(); } catch (e) { /* not running */ } }
  UI.chat.push({ role: 'user', text: q });
  UI.askDraft = '';
  const input = document.getElementById('askin');
  if (input) { input.value = ''; input.style.height = ''; sizeAsk(); }
  if (!navigator.onLine) {
    UI.chat.push({ role: 'ai', text: 'No signal right now. Try again when you have some.', error: true });
    refreshThread("answer");
    return;
  }
  UI.chatBusy = true;
  refreshThread();
  const history = UI.chat.slice(0, -1).filter(m => !m.error).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', text: m.text }));
  call({ op: 'ask', question: q, history }, 70000).then(res => {
    UI.chatBusy = false;
    if (res && res.answer) UI.chat.push({ role: 'ai', text: res.answer, card: res.card || null, sources: res.sources || [] });
    else UI.chat.push({ role: 'ai', text: (res && res.error === 'bad' && /Unknown request/.test(res.message || '')) ? 'The rules checker is not switched on yet. The organiser needs to finish setting it up.' : ((res && res.message) || 'The rules checker could not answer just now.'), error: true });
    refreshThread("answer");
  }).catch(e => {
    UI.chatBusy = false;
    const slow = e && e.name === 'AbortError';
    UI.chat.push({ role: 'ai', text: !navigator.onLine ? 'No signal right now. Try again when you have some.' : slow ? 'The rules checker took too long to answer. Tap New question and try again.' : 'The rules checker did not answer just now' + (e && e.message ? ' (' + e.message + ')' : '') + '. Try again in a moment.', error: true });
    refreshThread("answer");
  });
}
