'use strict';
// Scratch loader (MS14b, from MS14a's): harness, ordered SOURCE_FILES and the fixture folders of the Generator runner, no
// suites. MS14B_BASE=git:<commit> loads the two engine files this task changes (core/js/engine/tech-subset.js and
// generator/js/engine/difficulty.js) as they were at that commit, read from git into memory (nothing is written), instead of
// the tree's: the base engine (7eddb15, the pack-only commit on the accepted MS13c implementation 9d58d86) is the comparator of
// the cause proofs. Without it the tree is loaded.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const REPO = path.resolve(ROOT, '..');
const runner = fs.readFileSync(path.join(ROOT, 'tests/node-runner.js'), 'utf8');
const files = (/const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner)[1].match(/'[^']+'/g)).map((s) => s.slice(1, -1));
const BASED = ['core/js/engine/tech-subset.js', 'generator/js/engine/difficulty.js'];

function run(rel) {
  let abs = path.join(ROOT, rel);
  let text = null;
  const repoRel = path.relative(REPO, abs).replace(/\\/g, '/');
  if (process.env.MS14B_BASE && BASED.indexOf(repoRel) !== -1) {
    const commit = /^git:(\w+)$/.exec(process.env.MS14B_BASE);
    if (!commit) throw new Error('MS14B_BASE is git:<commit>');
    text = require('child_process').execFileSync('git', ['show', commit[1] + ':' + repoRel],
      { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26 });
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
