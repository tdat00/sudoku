'use strict';
// Scratch loader (MS14a, from MS13a's): harness, ordered SOURCE_FILES and the fixture folders of the Generator runner, no
// suites. MS14A_BASE=git:<commit> loads the subset engine of that commit, read from git into memory (nothing is written),
// instead of the tree's, to compare with the base source (bc3450c: MS13b accepted plus pack-only commits, no
// SG.leftoverPatterns).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const runner = fs.readFileSync(path.join(ROOT, 'tests/node-runner.js'), 'utf8');
const files = (/const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner)[1].match(/'[^']+'/g)).map((s) => s.slice(1, -1));

function run(rel) {
  let abs = path.join(ROOT, rel);
  let text = null;
  if (process.env.MS14A_BASE && rel.endsWith('core/js/engine/tech-subset.js')) {
    const commit = /^git:(\w+)$/.exec(process.env.MS14A_BASE);
    if (!commit) throw new Error('MS14A_BASE is git:<commit>');
    text = require('child_process').execFileSync('git', ['show', commit[1] + ':core/js/engine/tech-subset.js'],
      { cwd: path.resolve(ROOT, '..'), encoding: 'utf8', maxBuffer: 1 << 26 });
    abs = path.resolve(ROOT, '..', 'core/js/engine/tech-subset.js');
  }
  if (text === null) text = fs.readFileSync(abs, 'utf8');
  vm.runInThisContext(text.replace(/^\uFEFF/, ''), { filename: abs });
}

run('../core/tests/harness.js');
files.forEach((f) => { if (fs.existsSync(path.join(ROOT, f))) run(f); });
['../core/tests/fixtures', 'tests/fixtures'].forEach((dir) => {
  fs.readdirSync(path.join(ROOT, dir)).filter((n) => n.endsWith('.js')).sort()
    .forEach((n) => run(dir + '/' + n));
});

module.exports = globalThis.SG;
