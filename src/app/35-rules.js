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
  return UI.chat.map(m => m.role === 'user'
    ? `<div class="msg me"><div class="bub">${esc(m.text)}</div></div>`
    : `<div class="msg ai"><div class="bub${m.error ? ' err' : ''}">${m.error ? esc(m.text) : askRuling(m.text) + askSources(m.sources)}</div></div>`).join('')
    + (UI.chatBusy ? '<div class="msg ai"><div class="bub wait" aria-label="Checking the rules"><i></i><i></i><i></i></div></div>' : '')
    + `<p class="cap ask-note">Checked against the official Rules of Golf (R&amp;A and USGA). For anything close, play a second ball and ask the organiser.</p>`;
}

/* ----- Speaking a question: words fill the box as you speak, a waveform shows your voice, Stop / X / Send ----- */
const EQ_BARS = 36;
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
  bars.forEach((el, i) => { const v = meter.levels[i]; el.style.height = v == null ? '' : Math.max(4, Math.round(v * 34)) + 'px'; });
}
function startMeter() {
  stopMeter();
  meter = { levels: [], timer: 0, an: null, buf: null, stream: null, ctx: null, lastWords: 0 };
  const m = meter;
  m.timer = setInterval(() => {
    let v;
    if (m.an) { m.an.getByteTimeDomainData(m.buf); let sum = 0; for (let k = 0; k < m.buf.length; k++) { const d = (m.buf[k] - 128) / 128; sum += d * d; } v = Math.min(1, Math.sqrt(sum / m.buf.length) * 5); }
    else v = Date.now() - UI.askWordsAt < 700 ? 0.25 + Math.random() * 0.6 : 0.03;   // no microphone access for the meter: move while words arrive
    m.levels.push(v); if (m.levels.length > EQ_BARS) m.levels.shift();
    drawMeter();
  }, 70);
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
  document.documentElement.style.setProperty('--askh', (bar ? bar.offsetHeight : 76) + 'px');
}

function askListen() {
  if (listening) return;
  if (!SPEECH) return askKeyboard('Tap the microphone on your keyboard to speak.');
  const box = document.getElementById('askin');
  const base = (box ? box.value : UI.askDraft).trim();
  const r = new SPEECH();
  r.lang = 'en-IE'; r.interimResults = true; r.maxAlternatives = 1; r.continuous = true;
  UI.askWordsAt = 0;
  let cancelled = false;
  r.onstart = () => {
    listening = r;
    r.cancel = () => { cancelled = true; try { r.abort(); } catch (e) { /* not running */ } };
    showLive(true); startMeter();
  };
  r.onresult = ev => {
    UI.askWordsAt = Date.now();
    const said = Array.from(ev.results).map(x => x[0].transcript).join(' ').replace(/\s+/g, ' ').trim();
    UI.askDraft = (base ? base + ' ' : '') + said;
    const input = document.getElementById('askin');
    if (input) { input.value = UI.askDraft; growAsk(input); input.scrollTop = input.scrollHeight; }
  };
  r.onerror = ev => {
    if (ev.error !== 'no-speech' && ev.error !== 'aborted') askKeyboard("Dictation isn't available here. Tap the microphone on your keyboard instead.");
  };
  r.onend = () => {
    if (listening === r) listening = null;
    stopMeter();
    showLive(false);
    if (cancelled) {
      UI.askDraft = base;
      const input = document.getElementById('askin');
      if (input) { input.value = base; growAsk(input); }
    }
  };
  try { r.start(); } catch (e) { listening = null; askKeyboard('Tap the microphone on your keyboard to speak.'); }
}
function askStop() { if (listening) { try { listening.stop(); } catch (e) { /* already stopped */ } } }
function askCancel() { if (listening && listening.cancel) listening.cancel(); }
function growAsk(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 168) + 'px'; sizeAsk(); }
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
  if (input) { input.value = ''; input.style.height = ''; }
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
    if (res && res.answer) UI.chat.push({ role: 'ai', text: res.answer, sources: res.sources || [] });
    else UI.chat.push({ role: 'ai', text: (res && res.message) || 'The rules checker could not answer just now.', error: true });
    refreshThread();
  }).catch(() => {
    UI.chatBusy = false;
    UI.chat.push({ role: 'ai', text: 'No signal right now. Try again when you have some.', error: true });
    refreshThread();
  });
}
