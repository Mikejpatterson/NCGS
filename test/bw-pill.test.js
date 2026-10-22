// The Buggy Wars result pill (src/app/30-play.js bwPill). Pure function, loaded from the source.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const src = fs.readFileSync(require('path').join(__dirname, '../src/app/30-play.js'), 'utf8');
const body = src.slice(src.indexOf('function bwPill('), src.indexOf('/* The two pairs as initials badges'));
const bwPill = new Function('esc', `${body}; return bwPill;`)(x => String(x));
const gc = { labels: [{ long: 'Buggy 1' }, { long: 'Buggy 2' }] };
const live = (lead, toPlay, dormie) => ({ lead, status: { state: 'live', leader: lead > 0 ? 'A' : lead < 0 ? 'B' : null, toPlay, dormie } });
const txt = h => />([^<]*)<\/span>$/.exec(h)[1];

test('ahead with more holes left than the lead: "2 up, 3 to play"', () => assert.equal(txt(bwPill(gc, live(2, 3, false))), '2 up, 3 to play'));
test('lead equals holes left: "Dormie 2"', () => assert.equal(txt(bwPill(gc, live(-2, 2, true))), 'Dormie 2'));
test('dormie 1 on the last hole', () => assert.equal(txt(bwPill(gc, live(1, 1, true))), 'Dormie 1'));
test('the leader is still named for screen readers', () => assert.match(bwPill(gc, live(-2, 2, true)), /aria-label="Buggy 2 Dormie 2"/));
test('all square stays "AS, 4 to play"', () => assert.equal(txt(bwPill(gc, live(0, 4, false))), 'AS, 4 to play'));
