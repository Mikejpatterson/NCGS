// Run: python3 -m http.server 8765 -d dist & NODE_PATH=/opt/npm-tools/node_modules node test/ruling.run.js
// The Ruling screen: one quick question with big tap answers, then the ruling card with Read out and Ask more.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 744 }, hasTouch: true, isMobile: true });
  const pg = await ctx.newPage(); const errs = []; let ok = true;
  const check = (n, c) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n); if (!c) ok = false; };
  pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => {
    window.__said = [];
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speaking: false, speak(u) { window.__said.push(u.text); }, cancel() {} } });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: class { constructor(t) { this.text = t; } } });
    window.NCGS_TEST_ASK = body => {
      const last = body.messages[body.messages.length - 1].content;
      if (/No stakes/.test(last)) return '{"type":"ruling","topic":"Unplayable ball","rule":"Rule 19","verdict":"1 penalty shot","intro":"Mick picks one of these:","steps":["Drop within **2 club-lengths**, no nearer the hole","Go **back on a line** from the flag through the ball","Play again from **where he last hit**"],"note":"Count the penalty in Mick\'s score for the hole."}';
      if (/bushes/.test(last)) return '{"type":"ask","question":"Is the ball inside red or yellow stakes?","options":[{"label":"Red stakes or line","tag":"red"},{"label":"Yellow stakes or line","tag":"yellow"},{"label":"No stakes, just bushes"},{"label":"Not sure"}]}';
      return 'Take a drop. One penalty stroke (Rule 17.1).';
    };
  });
  await pg.goto('http://localhost:8765/preview.html'); await pg.waitForTimeout(600);
  await pg.evaluate(() => { window.__ncgs.UI.stack = [{ v: 'rules', p: {} }]; window.__ncgs.render(); });
  await pg.fill('#askin', "Mick's ball is in the bushes left of the green"); await pg.evaluate(() => window.__ncgs.UI.askDraft = "Mick's ball is in the bushes left of the green");
  await pg.tap('.askbar .send'); await pg.waitForSelector('.qcard');
  check('a question comes back as big tap answers', (await pg.$$('.qopt')).length === 4 && /red or yellow/.test(await pg.$eval('.qtext', e => e.textContent)));
  check('the red and yellow answers carry a colour tag', !!(await pg.$('.qopt.t-yellow .qtag')) && !!(await pg.$('.qopt .qtag')));
  check('every answer is at least 48px tall', await pg.evaluate(() => [...document.querySelectorAll('.qopt')].every(e => e.getBoundingClientRect().height >= 48)));
  await pg.tap('.qopt:nth-child(3)'); await pg.waitForSelector('.rcard');
  check('tapping an answer sends it as the next message', await pg.evaluate(() => window.__ncgs.UI.chat.some(m => m.role === 'user' && m.text === 'No stakes, just bushes')));
  check('the ruling card shows topic and rule, the verdict, numbered steps and the note', await pg.evaluate(() => /Unplayable ball · Rule 19/.test(document.querySelector('.rtop').textContent) && document.querySelector('.rverdict').textContent === '1 penalty shot' && document.querySelectorAll('.rsteps li').length === 3 && !!document.querySelector('.rsteps li b') && /Count the penalty/.test(document.querySelector('.rnote').textContent)));
  check('the earlier question can no longer be tapped', await pg.evaluate(() => [...document.querySelectorAll('.qopt')].every(e => e.disabled)));
  check('nothing runs off the side', await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await pg.tap('[data-act="ask-read"]'); await pg.waitForTimeout(100);
  check('Read out speaks the verdict and the options', await pg.evaluate(() => /1 penalty shot.*Option 1.*2 club-lengths.*Option 3/.test(window.__said[0] || '') && !/\*\*/.test(window.__said[0])));
  await pg.tap('[data-act="ask-more"]'); await pg.waitForTimeout(100);
  check('Ask more puts the cursor in the box', await pg.evaluate(() => document.activeElement && document.activeElement.id === 'askin'));
  await pg.evaluate(() => { const n = window.__ncgs; n.UI.chat = []; n.UI.chatBusy = false; n.render(); });
  await pg.fill('#askin', 'Ball in the water'); await pg.evaluate(() => window.__ncgs.UI.askDraft = 'Ball in the water');
  await pg.tap('.askbar .send'); await pg.waitForSelector('.msg.ai .verdict');
  check('a plain-text answer still shows the old way', /Take a drop\./.test(await pg.$eval('.verdict', e => e.textContent)) && !(await pg.$('.rcard')));
  check('no script errors', errs.length === 0);
  if (errs.length) console.log(errs);
  await pg.screenshot({ path: '/tmp/ruling.png' });
  await b.close();
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
