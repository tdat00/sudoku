'use strict';
// MS13c scratch (from MS13a's loader): harness, ordered SOURCE_FILES and the fixture folders of the runner, no suites.
// MS13C_CHAIN=git:<commit> loads the chain engine of that commit, read from git into memory (nothing is written),
// instead of the tree's, to compare with the base source (4aa3d11: MS14a accepted, the singleton forcing finders).
// MS13C_CHAIN=file:<path> loads that file instead (for example a frozen copy).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const runner = fs.readFileSync(path.join(ROOT, 'tests/node-runner.js'), 'utf8');
const files = (/const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner)[1].match(/'[^']+'/g)).map((s) => s.slice(1, -1));

function run(rel) {
  let abs = path.join(ROOT, rel);
  let text = null;
  if (process.env.MS13C_CHAIN && rel.endsWith('core/js/engine/tech-chain.js')) {
    const git = /^git:(\w+)$/.exec(process.env.MS13C_CHAIN);
    const file = /^file:(.+)$/.exec(process.env.MS13C_CHAIN);
    if (git) {
      text = require('child_process').execFileSync('git', ['show', git[1] + ':core/js/engine/tech-chain.js'],
        { cwd: path.resolve(ROOT, '..'), encoding: 'utf8', maxBuffer: 1 << 26 });
      abs = path.resolve(ROOT, '..', 'core/js/engine/tech-chain.js');
    } else if (file) {
      text = fs.readFileSync(path.resolve(file[1]), 'utf8');
    } else {
      throw new Error('MS13C_CHAIN is git:<commit> or file:<path>');
    }
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
