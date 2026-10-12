// Run: python3 -m http.server 8765 -d dist & NODE_PATH=/opt/npm-tools/node_modules node test/speech.run.js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 664 }, hasTouch: true, isMobile: true, permissions: ['microphone'] });
  const pg = await ctx.newPage(); const errs = []; let ok = true;
  const check = (n, c) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n); if (!c) ok = false; };
  pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => {
    const FakeSR = class { start() { window.__sr = this; setTimeout(() => this.onstart && this.onstart(), 10); } stop() { setTimeout(() => this.onend && this.onend(), 10); } abort() { setTimeout(() => this.onend && this.onend(), 10); } }; window.webkitSpeechRecognition = FakeSR; window.SpeechRecognition = FakeSR;
    window.NCGS_TEST_ASK = () => 'Take a drop. One penalty stroke (Rule 17.1).';
  });
  await pg.goto('http://localhost:8765/preview.html'); await pg.waitForTimeout(600);
  await pg.evaluate(() => { window.__ncgs.UI.stack = [{ v: 'rules', p: {} }]; window.__ncgs.render(); });
  const said = t => pg.evaluate(t => window.__sr.onresult({ results: [[{ transcript: t }]] }), t);
  await pg.tap('.askbar .mic'); await pg.waitForTimeout(300);
  check('tapping the microphone shows the listening panel with a level meter, X and Stop', await pg.evaluate(() => document.body.classList.contains('hearing') && getComputedStyle(document.querySelector('.askbar .live')).display !== 'none' && document.querySelectorAll('.eq i').length > 10 && !!document.querySelector('.askbar .x') && !!document.querySelector('.askbar .stop')) && /Listening/.test(await pg.$eval('#asklive', e => e.textContent)));
  await said('my ball is'); await said('my ball is in the water');
  check('words appear as they are spoken', (await pg.$eval('#asklive', e => e.textContent)) === 'my ball is in the water');
  await pg.screenshot({ path: '/tmp/claude-0/shots/speech-listening.png' });
  await pg.tap('.askbar .stop'); await pg.waitForTimeout(200);
  check('Stop just stops: the words wait in the box and nothing is sent', !(await pg.evaluate(() => document.body.classList.contains('hearing'))) && (await pg.$eval('#askin', e => e.value)) === 'my ball is in the water' && (await pg.evaluate(() => window.__ncgs.UI.chat.length)) === 0);
  await pg.screenshot({ path: '/tmp/claude-0/shots/speech-stopped.png' });
  await pg.tap('.askbar .send'); await pg.waitForSelector('.msg.ai .verdict');
  check('Send sends it and the ruling comes back', (await pg.evaluate(() => window.__ncgs.UI.chat[0].text)) === 'my ball is in the water' && /Take a drop\./.test(await pg.$eval('.verdict', e => e.textContent)));
  await pg.tap('.askbar .mic'); await pg.waitForTimeout(200); await said('something wrong');
  await pg.tap('.askbar .x'); await pg.waitForTimeout(200);
  check('X cancels: nothing is kept or sent', !(await pg.evaluate(() => document.body.classList.contains('hearing'))) && (await pg.$eval('#askin', e => e.value)) === '' && (await pg.evaluate(() => window.__ncgs.UI.chat.length)) === 2);
  check('no script errors', errs.length === 0);
  if (errs.length) console.log(errs);
  await b.close();
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
