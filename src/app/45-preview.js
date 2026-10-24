/* ----- Test scenarios (private preview only; window.NCGS_SCENARIOS comes from src/preview/scenarios.js) ----- */
VIEWS.scenarios = () => {
  const S = window.NCGS_SCENARIOS;
  if (!S) return { html: `${navBack(backLabel())}<div class="head"><h1 class="title">Test scenarios</h1></div><div class="prose">Only in the preview.</div>` };
  const rows = S.list.map(s => s.soon
    ? `<div class="row tall"><span class="two"><span class="sub">${esc(s.title)}</span><span class="sub">${esc(s.note)}</span></span><span class="pill n">Soon</span></div>`
    : `<button class="row tall" data-act="scenario-pick" data-id="${s.id}" aria-current="${s.id === S.current}"><span class="two"><span class="${s.id === S.current ? 'b' : ''}">${esc(s.title)}</span><span class="sub">${esc(s.note)}</span></span>${s.id === S.current ? '<span class="pill g">Showing</span>' : chev}</button>`).join('');
  return {
    html: `<header class="hero s">${navBack(backLabel())}<div class="head"><h1 class="title">Test scenarios</h1></div>
      <p class="sub">Invented golfers and rounds. Pick one to see the app in that situation; it starts that scenario afresh. Nothing here touches the real app.</p></header>
      ${sec('', cardOf(rows), false)}`
  };
};
