'use strict';
// MS13b scratch: which texts of the language packs differ between the tree and the base commit, for each app (dump-locales.js
// in a child process for each of the four combinations). Usage: node generator/tests/artifacts/difficulty-v3/MS13b/locale-diff.cjs [commit]
const path = require('path');
const { spawnSync } = require('child_process');

const commit = process.argv[2] || '7932132';
const script = path.join(__dirname, 'dump-locales.js');
let total = 0;
['generator', 'player'].forEach((app) => {
  const dump = (base) => {
    const env = Object.assign({}, process.env, { MS13B_APP: app });
    delete env.MS13B_BASE;
    if (base) env.MS13B_BASE = 'git:' + commit;
    const run = spawnSync(process.execPath, [script], { env, encoding: 'utf8', maxBuffer: 1 << 28 });
    if (run.status !== 0) throw new Error(app + ' ' + (base ? 'base' : 'tree') + ': ' + run.stderr);
    return JSON.parse(run.stdout);
  };
  const tree = dump(false);
  const base = dump(true);
  ['en', 'vi'].forEach((code) => {
    const keys = Array.from(new Set(Object.keys(tree[code]).concat(Object.keys(base[code])))).sort();
    const changed = keys.filter((k) => tree[code][k] !== base[code][k]);
    console.log(app + ' ' + code + ': ' + Object.keys(base[code]).length + ' keys at base, ' + Object.keys(tree[code]).length +
      ' in the tree, ' + changed.length + ' differ: ' + changed.join(', '));
    total += changed.length;
  });
});
console.log('total texts that differ: ' + total);
