/* ----- Rules checker: ask about the Rules of Golf, checked live against the official rules ----- */
const SPEECH = window.SpeechRecognition || window.webkitSpeechRecognition;
const ASK_IDEAS = [
  'My ball hit another ball on the green. What now?',
  'Ball moved after I addressed it',
  'Ball in a bunker footprint or plugged lie',
  'Unplayable lie: what are my options?',
  'Ball hit my buggy or a person'
];

// Plain text from the answer: paragraphs, "- " bullets and **bold**, nothing else.
function askText(t) {
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  return String(t).trim().split(/\n{2,}/).map(par => `<div class="ap">${par.split('\n').map(l => /^\s*[-•*]\s+/.test(l) ? `<div class="ab">${inline(l.replace(/^\s*[-•*]\s+/, ''))}</div>` : `<div>${inline(l)}</div>`).join('')}</div>`).join('');
}

// A ruling: the first sentence is the verdict, shown big enough to read out; the rule numbers become chips.
function askRuling(t) {
  const text = String(t).trim();
  const m = /^([\s\S]*?[.!?])(?:\s+|$)([\s\S]*)$/.exec(text);
  let verdict = m ? m[1] : text, rest = m ? m[2] : '';
  if (verdict.length > 200) { verdict = text.split('\n')[0]; rest = text.slice(verdict.length); }
  const rules = [...new Set((text.match(/Rules?\s+\d+(?:\.\d+)?(?:[a-z])?(?:\(\d+\))?/g) || []).map(r => r.replace(/^Rules\b/, 'Rule')))];
  const inline = x => esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  return `<div class="verdict">${inline(verdict.replace(/^\*\*|\*\*$/g, ''))}</div>${rest.trim() ? `<div class="rest">${askText(rest)}</div>` : ''}${rules.length ? `<div class="rules">${rules.map(r => `<span class="rulechip">${esc(r)}</span>`).join('')}</div>` : ''}`;
}

// A card from the checker: either one quick question with big tap answers, or the ruling itself.
const boldBits = x => esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
function askCardHtml(c, i, live) {
  if (c.type === 'ask') {
    return `<div class="qcard"><div class="qtext">${esc(c.question)}</div><div class="qopts">${c.options.map(o =>
      `<button class="qopt${o.tag ? ' t-' + o.tag : ''}${/^not sure/i.test(o.label) ? ' dim' : ''}" data-act="ask-idea" data-q="${esc(o.label)}"${live ? '' : ' disabled'}>${o.tag ? `<span class="qtag">${o.tag === 'red' ? 'Red' : 'Yellow'}</span>` : ''}<span>${esc(o.label)}</span></button>`).join('')}</div></div>`;
  }
  const top = [c.topic, c.rule].filter(Boolean).join(' · ');
  return `<div class="rcard">${top ? `<div class="rtop">${esc(top)}</div>` : ''}<div class="rverdict">${boldBits(c.verdict)}</div>${c.intro ? `<div class="rintro">${boldBits(c.intro)}</div>` : ''}
    ${c.steps.length ? `<ol class="rsteps">${c.steps.map((x, n) => `<li><span class="rn">${n + 1}</span><span>${boldBits(x)}</span></li>`).join('')}</ol>` : ''}
    ${c.note ? `<div class="rnote">${boldBits(c.note)}</div>` : ''}
    <div class="ract"><button class="rbtn" data-act="ask-read" data-i="${i}">${ICON.speak}<span>Read out</span></button><button class="rbtn" data-act="ask-more">Ask more</button></div></div>`;
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
    return `<div class="ask-intro"><p class="b">Say what happened.</p><p class="sub">${SPEECH ? 'Tap the microphone and speak, or type.' : 'Tap the box, then the microphone on your keyboard to speak.'} You get a ruling you can read out, checked against the official rules.</p></div>
      <div class="ask-ideas">${ASK_IDEAS.map(q => `<button class="idea" data-act="ask-idea" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>`;
  }
  return UI.chat.map((m, i) => m.role === 'user'
    ? `<div class="msg me"><div class="bub">${esc(m.text)}</div></div>`
    : m.card ? `<div class="msg ai card">${askCardHtml(m.card, i, i === UI.chat.length - 1 && !UI.chatBusy)}${m.card.type === 'ruling' ? askSources(m.sources) : ''}</div>`
    : `<div class="msg ai"><div class="bub${m.error ? ' err' : ''}">${m.error ? esc(m.text) : askRuling(m.text) + askSources(m.sources)}</div></div>`).join('')
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
  html: `<header class="hero c"><div class="hrow2"><h1 class="big" style="font-size:1.9rem">Ruling</h1>${UI.chat.length ? '<button class="link" data-act="ask-clear">New question</button>' : ''}</div></header>
    <div id="thread" class="thread">${askThread()}</div>
    <form class="askbar" data-form="ask" autocomplete="off">
      <div class="card">
        <textarea id="askin" rows="1" enterkeyhint="send" maxlength="600" placeholder="What happened?" aria-label="Your rules question">${esc(UI.askDraft)}</textarea>
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

function refreshThread() {
  const el = document.getElementById('thread');
  if (!el) return;
  el.innerHTML = askThread();
  const bar = document.querySelector('.hero .hrow2');
  if (bar && !bar.querySelector('[data-act="ask-clear"]') && UI.chat.length) bar.insertAdjacentHTML('beforeend', '<button class="link" data-act="ask-clear">New question</button>');
  if (bar && !UI.chat.length) { const b = bar.querySelector('[data-act="ask-clear"]'); if (b) b.remove(); }
  window.scrollTo(0, document.body.scrollHeight);
}

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
    refreshThread();
    return;
  }
  UI.chatBusy = true;
  refreshThread();
  const history = UI.chat.slice(0, -1).filter(m => !m.error).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', text: m.text }));
  call({ op: 'ask', question: q, history }).then(res => {
    UI.chatBusy = false;
    if (res && res.answer) UI.chat.push({ role: 'ai', text: res.answer, card: res.card || null, sources: res.sources || [] });
    else UI.chat.push({ role: 'ai', text: (res && res.error === 'bad' && /Unknown request/.test(res.message || '')) ? 'The rules checker is not switched on yet. The organiser needs to finish setting it up.' : ((res && res.message) || 'The rules checker could not answer just now.'), error: true });
    refreshThread();
  }).catch(() => {
    UI.chatBusy = false;
    UI.chat.push({ role: 'ai', text: 'No signal right now. Try again when you have some.', error: true });
    refreshThread();
  });
}
