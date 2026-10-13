// Weather card: placeholder while loading, last forecast remembered on the phone, icons and colours by weather, no sideways overflow.
const { chromium } = require('playwright');
const URL = 'http://localhost:8765/preview.html';
let ok = true; const check = (n, c, x) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (!c && x ? '   [' + x + ']' : '')); if (!c) ok = false; };
const fake = (date, code, rain, wind) => { const hours = { time: [], temperature_2m: [], precipitation_probability: [], weather_code: [], wind_speed_10m: [] }; for (let k = 0; k < 5; k++) { hours.time.push(date + 'T' + (10 + k) + ':00'); hours.temperature_2m.push(18 + k); hours.precipitation_probability.push(rain); hours.weather_code.push(code); hours.wind_speed_10m.push(wind); } return { days: { time: [date], weather_code: [code], temperature_2m_max: [21], temperature_2m_min: [12], precipitation_probability_max: [rain], wind_speed_10m_max: [wind] }, hours, at: 1 }; };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(URL); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForSelector('.brand');
  const date = await pg.evaluate(() => { const n = window.__ncgs; n.ORGPIN.pin = '1234'; const r = n.D.round('demo-cabopino'); n.put('rounds', [Object.assign({}, r, { date: n.todayIso() })]); return n.todayIso(); });
  await pg.waitForTimeout(400);
  const show = () => pg.evaluate(() => { const n = window.__ncgs; n.UI.stack = [{ v: 'home', p: {} }, { v: 'round', p: { rid: 'demo-cabopino' } }]; n.render(); return { skel: !!document.querySelector('.wx-skel'), card: !!document.querySelector('.wx:not(.wx-skel)') }; });
  // 1. nothing remembered: a placeholder holds the space at once
  await pg.evaluate(() => { window.__ncgs.UI.wx = {}; localStorage.removeItem('ncgs-wx'); });
  const a = await show();
  check('a placeholder is shown while the forecast is being fetched', a.skel && !a.card, JSON.stringify(a));
  // 2. remembered forecast: shown at once, no placeholder
  await pg.evaluate(([d, f]) => { window.__ncgs.UI.wx = {}; localStorage.setItem('ncgs-wx', JSON.stringify({ cabopino: { at: Date.now(), data: f } })); }, [date, fake(date, 63, 70, 14)]);
  const c = await show();
  check('a remembered forecast shows immediately, with no placeholder', c.card && !c.skel, JSON.stringify(c));
  check('rain gets the rain colour and the plain sentence', await pg.evaluate(() => !!document.querySelector('.wx-rain') && /waterproof/i.test(document.querySelector('.wx-line').textContent)));
  check('every hour has its own icon', (await pg.$$('.wx-hours .wxi')).length === 5);
  // 3. an old remembered forecast (over 3 hours) is not trusted
  await pg.evaluate(([d, f]) => { window.__ncgs.UI.wx = {}; localStorage.setItem('ncgs-wx', JSON.stringify({ cabopino: { at: Date.now() - 4 * 3600e3, data: f } })); }, [date, fake(date, 63, 70, 14)]);
  const o = await show();
  check('a forecast more than 3 hours old is replaced, not shown', o.skel && !o.card, JSON.stringify(o));
  await pg.waitForTimeout(500);
  // 3b. a failed refresh never wipes out a good remembered forecast
  await pg.evaluate(([d, f]) => { window.__ncgs.UI.wx = {}; localStorage.setItem('ncgs-wx', JSON.stringify({ cabopino: { at: Date.now() - 40 * 60e3, data: f } })); }, [date, fake(date, 63, 70, 14)]);
  await show(); await pg.waitForTimeout(600);
  check('an empty answer from the server keeps the remembered forecast', await pg.evaluate(() => !!document.querySelector('.wx:not(.wx-skel)')));
  // 4. all kinds of weather draw without overflow
  for (const code of [0, 2, 3, 45, 53, 63, 73, 95]) {
    await pg.evaluate(([d, f]) => { window.__ncgs.UI.wx = { cabopino: { state: 'done', data: f } }; }, [date, fake(date, code, 40, 38)]);
    await show();
    const w = await pg.evaluate(() => { const e = document.querySelector('.wx'); return e && e.scrollWidth <= e.clientWidth + 1 && document.documentElement.scrollWidth <= window.innerWidth; });
    check('weather code ' + code + ' draws and fits the screen', !!w);
  }
  // 5. a failed fetch leaves nothing broken behind
  await pg.evaluate(() => { window.__ncgs.UI.wx = { cabopino: { state: 'failed' } }; });
  const f = await show(); check('a failed fetch shows nothing and does not loop', !f.skel && !f.card);
  check('no script errors', errs.length === 0, errs.slice(0, 2).join(' | '));
  await b.close(); console.log(ok ? 'all passed' : 'FAILED'); process.exit(ok ? 0 : 1);
})();
