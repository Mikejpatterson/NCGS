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

let listening = null;
function askListen() {
  if (listening) { try { listening.stop(); } catch (e) { /* already stopped */ } return; }
  if (!SPEECH) return askKeyboard();
  const r = new SPEECH();
  r.lang = 'en-IE'; r.interimResults = true; r.maxAlternatives = 1; r.continuous = false;
  let said = '', failed = false;
  const mic = () => document.querySelector('.askbar .mic');
  r.onstart = () => { listening = r; document.body.classList.add('hearing'); const input = document.getElementById('askin'); if (input) input.placeholder = 'Listening…'; };
  r.onresult = ev => {
    said = Array.from(ev.results).map(x => x[0].transcript).join(' ').trim();
    const input = document.getElementById('askin'); if (input) { input.value = said; UI.askDraft = said; }
  };
  r.onerror = ev => { failed = true; if (ev.error !== 'no-speech' && ev.error !== 'aborted') { toast("Dictation isn't available here. Tap the microphone on your keyboard instead."); askKeyboard(); } };
  r.onend = () => {
    listening = null; document.body.classList.remove('hearing');
    const input = document.getElementById('askin'); if (input) input.placeholder = 'What happened?';
    if (said && !failed) askQuestion(said);
  };
  try { r.start(); } catch (e) { askKeyboard(); }
}
function askKeyboard() { const i = document.getElementById('askin'); if (i) i.focus(); }

VIEWS.rules = () => ({
  tabs: 'rules',
  html: `<header class="hero c"><div class="hrow2"><h1 class="big" style="font-size:1.9rem">Ruling</h1>${UI.chat.length ? '<button class="link" data-act="ask-clear">New question</button>' : ''}</div></header>
    <div id="thread" class="thread">${askThread()}</div>
    <form class="askbar" data-form="ask" autocomplete="off"><input id="askin" type="text" enterkeyhint="send" maxlength="600" placeholder="What happened?" aria-label="Your rules question" value="${esc(UI.askDraft)}"><button class="mic" type="button" data-act="ask-mic" aria-label="Speak your question">${ICON.mic}</button><button class="send" type="submit" aria-label="Ask">${ICON.send}</button></form>`
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
  if (input) input.value = '';
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
