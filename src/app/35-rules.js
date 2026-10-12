/* ----- Rules checker: ask about the Rules of Golf and the society rules ----- */
const SPEECH = window.SpeechRecognition || window.webkitSpeechRecognition;
const ASK_IDEAS = [
  'My ball is in the water. What do I do?',
  'Ball out of bounds or lost: what now?',
  'Can I move something in a bunker?',
  'Unplayable lie: what are my options?',
  'How does Buggy Wars work?',
  'Who buys the first round?'
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

function askThread() {
  if (!UI.chat.length && !UI.chatBusy) {
    return `<div class="ask-intro"><p class="b">Say what happened.</p><p class="sub">${SPEECH ? 'Tap the microphone and speak, or type.' : 'Tap the box, then the microphone on your keyboard to speak.'} You get a ruling you can read out, with the rule number.</p></div>
      <div class="ask-ideas">${ASK_IDEAS.map(q => `<button class="idea" data-act="ask-idea" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>`;
  }
  return UI.chat.map(m => m.role === 'user'
    ? `<div class="msg me"><div class="bub">${esc(m.text)}</div></div>`
    : `<div class="msg ai"><div class="bub${m.error ? ' err' : ''}">${m.error ? esc(m.text) : askRuling(m.text)}</div></div>`).join('')
    + (UI.chatBusy ? '<div class="msg ai"><div class="bub wait" aria-label="Checking the rules"><i></i><i></i><i></i></div></div>' : '')
    + `<p class="cap ask-note">Answers come from the Rules of Golf and our society rules. For anything close, the organiser has the final say.</p>`;
}

/* ----- Speaking a question: live words, a level meter, Stop, X to cancel, then Send ----- */
const EQ_BARS = 30;
const eqHtml = () => Array.from({ length: EQ_BARS }, (_, i) => `<i style="--d:${(i * 0.07).toFixed(2)}s"></i>`).join('');
let listening = null, meter = null;

function stopMeter() {
  if (!meter) return;
  cancelAnimationFrame(meter.raf);
  try { meter.stream.getTracks().forEach(t => t.stop()); } catch (e) { /* already stopped */ }
  try { meter.ctx.close(); } catch (e) { /* already closed */ }
  meter = null;
  document.querySelectorAll('.eq i').forEach(i => { i.style.transform = ''; });
}
// The meter is only for show. If the phone will not share the microphone with speech recognition, the bars just pulse.
function startMeter() {
  const eq = document.querySelector('.eq');
  if (eq) eq.classList.add('fake');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    if (!listening) { stream.getTracks().forEach(t => t.stop()); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    const an = ctx.createAnalyser(); an.fftSize = 128; an.smoothingTimeConstant = 0.7;
    ctx.createMediaStreamSource(stream).connect(an);
    const data = new Uint8Array(an.frequencyBinCount);
    meter = { stream, ctx, raf: 0 };
    const tick = () => {
      an.getByteFrequencyData(data);
      const bars = document.querySelectorAll('.eq i');
      bars.forEach((el, i) => { const v = data[Math.min(data.length - 1, 1 + Math.floor(i * 0.9))] / 255; el.style.transform = `scaleY(${(0.12 + v * 0.95).toFixed(2)})`; });
      meter.raf = requestAnimationFrame(tick);
    };
    const live = document.querySelector('.eq'); if (live) live.classList.remove('fake');
    tick();
  }).catch(() => { /* keep the pulsing bars */ });
}

function showLive(on) {
  document.body.classList.toggle('hearing', on);
  const lt = document.getElementById('asklive');
  if (lt) lt.textContent = UI.askLive || (on ? 'Listening…' : '');
}

function askListen() {
  if (listening) return;
  if (!SPEECH) return askKeyboard('Tap the microphone on your keyboard to speak.');
  const r = new SPEECH();
  r.lang = 'en-IE'; r.interimResults = true; r.maxAlternatives = 1; r.continuous = false;
  UI.askLive = '';
  let failed = false, cancelled = false;
  r.onstart = () => { listening = r; r.cancel = () => { cancelled = true; try { r.abort(); } catch (e) { /* not running */ } }; showLive(true); startMeter(); };
  r.onresult = ev => {
    UI.askLive = Array.from(ev.results).map(x => x[0].transcript).join(' ').trim();
    const lt = document.getElementById('asklive'); if (lt) lt.textContent = UI.askLive || 'Listening…';
  };
  r.onerror = ev => {
    failed = true;
    if (ev.error !== 'no-speech' && ev.error !== 'aborted') askKeyboard("Dictation isn't available here. Tap the microphone on your keyboard instead.");
  };
  r.onend = () => {
    listening = null; stopMeter();
    const said = cancelled || failed ? '' : UI.askLive;
    UI.askLive = '';
    showLive(false);
    if (said) {
      UI.askDraft = (UI.askDraft ? UI.askDraft.trim() + ' ' : '') + said;
      const input = document.getElementById('askin');
      if (input) { input.value = UI.askDraft; growAsk(input); }
    }
  };
  try { r.start(); } catch (e) { listening = null; askKeyboard('Tap the microphone on your keyboard to speak.'); }
}
function askStop() { if (listening) { try { listening.stop(); } catch (e) { /* already stopped */ } } }
function askCancel() { if (listening && listening.cancel) listening.cancel(); }
function growAsk(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; }
function askKeyboard(msg) { const i = document.getElementById('askin'); if (i) i.focus(); if (msg) toast(msg); }

VIEWS.rules = () => ({
  tabs: 'rules',
  html: `<header class="hero c"><div class="hrow2"><h1 class="big" style="font-size:1.9rem">Ruling</h1>${UI.chat.length ? '<button class="link" data-act="ask-clear">New question</button>' : ''}</div></header>
    <div id="thread" class="thread">${askThread()}</div>
    <form class="askbar" data-form="ask" autocomplete="off">
      <div class="live"><div id="asklive" class="lt" aria-live="polite">${esc(UI.askLive || 'Listening…')}</div>
        <div class="lrow2"><button class="x" type="button" data-act="ask-cancel" aria-label="Cancel">${ICON.x}</button><div class="eq" aria-hidden="true">${eqHtml()}</div><button class="stop" type="button" data-act="ask-stop" aria-label="Stop"><i></i></button></div></div>
      <div class="typed"><textarea id="askin" rows="1" enterkeyhint="send" maxlength="600" placeholder="What happened?" aria-label="Your rules question">${esc(UI.askDraft)}</textarea><button class="mic" type="button" data-act="ask-mic" aria-label="Speak your question">${ICON.mic}</button><button class="send" type="submit" aria-label="Ask">${ICON.send}</button></div>
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
    if (res && res.answer) UI.chat.push({ role: 'ai', text: res.answer });
    else UI.chat.push({ role: 'ai', text: (res && res.message) || 'The rules checker could not answer just now.', error: true });
    refreshThread();
  }).catch(() => {
    UI.chatBusy = false;
    UI.chat.push({ role: 'ai', text: 'No signal right now. Try again when you have some.', error: true });
    refreshThread();
  });
}
