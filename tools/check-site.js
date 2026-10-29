// The live app is the committed site/ folder (site.yml publishes it as it is). This check fails if site/index.html
// was not rebuilt after a change to the app's source, so a merge can never leave the live app behind its code.
// Run: node tools/check-site.js   (no build needed; it reads the committed files)
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const safe = s => s.replace(/<\/(script)/gi, '<\\/$1');   // the same escaping build.js uses
const site = read('site/index.html');
const files = fs.readdirSync(path.join(root, 'src/app')).filter(f => f.endsWith('.js')).sort().map(f => 'src/app/' + f)
  .concat(['src/engine.js', 'src/draw.js', 'src/groups.js', 'src/styles.css']);
const stale = files.filter(f => !site.includes(f.endsWith('.css') ? read(f) : safe(read(f))));
// server.js is embedded with its build fingerprint filled in, so compare its fingerprint instead
const fp = require('crypto').createHash('sha1').update(read('src/server.js')).digest('hex').slice(0, 8);
if (!site.includes(`"server":"${fp}"`)) stale.push('src/server.js');
if (stale.length) {
  console.log('site/ is out of date with the source. Rebuild it (see README) for:\n  ' + stale.join('\n  '));
  process.exit(1);
}
console.log(`site/ matches the source (${files.length + 1} files)`);
