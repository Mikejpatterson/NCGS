/* ---------- Screen state and navigation ---------- */
const UI = {
  stack: [{ v: 'home', p: {} }],
  org: false, orgUnlocked: false, orgStack: [{ v: 'home', p: {} }],
  toast: null, flash: false, contestSheet: false, fix: null, after: null, open: {}, scrollCur: false, scrollTop: false,
  playRid: null, hole: null, holeSheet: false, year: null, edit: false, matchGroup: null, board: null, res: 'lb', chat: [], chatBusy: false, askDraft: '',
  draft: null, sel: null, testSheet: null, photoFull: null, confirm: null, pinError: false, formError: null,
  wx: {}, shareImg: null, checkSeg: null, photos: {}
};
const cur = () => (UI.org ? UI.orgStack : UI.stack)[(UI.org ? UI.orgStack : UI.stack).length - 1];
const stackOf = () => (UI.org ? UI.orgStack : UI.stack);
function go(v, p) { stackOf().push({ v, p: p || {} }); UI.scrollTop = true; UI.formError = null; UI.confirm = null; UI.holeSheet = false; render(); }
function replaceTop(v, p) { const s = stackOf(); s[s.length - 1] = { v, p: p || {} };
  /* never leave the same screen twice in a row underneath, or Back would seem to do nothing */
  while (s.length > 1 && s[s.length - 2].v === v && JSON.stringify(s[s.length - 2].p) === JSON.stringify(p || {})) s.splice(s.length - 2, 1);
  UI.scrollTop = true; UI.formError = null; UI.confirm = null; UI.holeSheet = false; render(); }
function back() {
  const s = stackOf();
  if (s.length > 1) s.pop();
  else if (UI.org) { UI.org = false; } else s[0] = { v: 'home', p: {} };
  UI.scrollTop = true; UI.formError = null; UI.confirm = null; UI.contestSheet = false; UI.holeSheet = false;
  render();
}
function backTo(pred) {
  const s = stackOf();
  for (let i = s.length - 1; i >= 0; i--) if (pred(s[i])) { s.length = i + 1; UI.scrollTop = true; render(); return true; }
  return false;
}
const PLAY_VIEWS = ['tee', 'match', 'board', 'rules', 'entry', 'after', 'check', 'finish', 'hcp', 'results'];
function enterPlay(rid) {
  UI.playRid = rid;
  if (backTo(e => ['tee', 'match', 'board', 'rules'].includes(e.v))) return;
  go('tee', { rid });
}
function toast(msg) {
  UI.toast = msg;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { UI.toast = null; renderToast(); }, 2600);
  renderToast();
}
