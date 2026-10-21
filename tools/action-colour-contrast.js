/* Contrast ratios (WCAG 2) for the colour pairs in docs/ACTION-COLOUR.md. Run: node tools/action-colour-contrast.js */
const lum = h => {
  const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
};
const mix = (f, b, a) => '#' + [1, 3, 5].map(i => Math.round(parseInt(f.slice(i, i + 2), 16) * a + parseInt(b.slice(i, i + 2), 16) * (1 - a)).toString(16).padStart(2, '0')).join('').toUpperCase();
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };

const PINE = '#0B3D2E', PINE2 = '#14573F', IVORY = '#FAF8F3', WHITE = '#FFFFFF', PAGE = '#E5ECE6';
const pairs = [
  ['--on-action white', WHITE, '--action pine', PINE],
  ['white', WHITE, 'pine-2 (hero gradient)', PINE2],
  ['--on-action-inverse pine', PINE, '--action-inverse ivory', IVORY],
  ['--on-pine-label', '#E9E2CF', 'pine', PINE],
  ['--on-pine-label', '#E9E2CF', 'pine-2', PINE2],
  ['--award champagne', '#D4B483', 'pine', PINE],
  ['--award champagne', '#D4B483', 'pine-2', PINE2],
  ['--award champagne', '#D4B483', 'ivory (not used for meaning)', IVORY],
  ['pine', PINE, '--action-tint', '#E3EFE6'],
  ['pine', PINE, 'white', WHITE],
  ['pine', PINE, 'page', PAGE],
  ['pine', PINE, '--on-pine-label (pill.w)', '#E9E2CF'],
  ['pine', PINE, '--lead-tint', '#F3EFE5'],
  ['text', '#0F1A14', '--lead-tint', '#F3EFE5'],
  ['--sub', '#55625A', '--lead-tint', '#F3EFE5'],
  ['--sub', '#55625A', '--fill (.pp.p1)', '#EAF0EB'],
  ['--sub', '#55625A', '--action-tint', '#E3EFE6'],
  ['--green', '#167A41', '--green-soft (.stile.tf)', '#DDF1E4'],
  ['pine', PINE, '.lnk.sun light end', '#E8F3EA'],
  ['pine', PINE, '.lnk.sun dark end', '#CFE5D5'],
  ['.lnk.sun .lnk-s', '#3E6B57', '.lnk.sun light end', '#E8F3EA'],
  ['.lnk.sun .lnk-s', '#3E6B57', '.lnk.sun dark end', '#CFE5D5'],
  ['white 80% (.after small)', mix(WHITE, PINE, .8), 'pine', PINE],
  ['white 55% (.prog i.done, marker)', mix(WHITE, PINE, .55), 'pine', PINE],
  ['old flag-yellow (retired)', '#F6C515', 'ivory', IVORY],
];
for (const [fn, f, bn, b] of pairs) console.log(`${fn} ${f} on ${bn} ${b}: ${ratio(f, b).toFixed(2)}:1`);
