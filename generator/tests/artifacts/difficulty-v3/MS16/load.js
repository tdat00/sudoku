'use strict';
// Scratch loader (MS16, from MS15b's): harness, ordered SOURCE_FILES and the fixture folders of the Generator runner, no
// suites. MS16_BASE=git:<commit> loads EVERY source file of SOURCE_FILES as it is at that commit (the list too), read
// from git into memory (nothing is written), and only the harness and the fixture folders from the tree: the base engine
// of the activation comparisons (8b26e83: MS15b, ALS-XZ active, no Sue de Coq).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const childProcess = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const REPO = path.resolve(ROOT, '..');
const base = (() => {
  if (!process.env.MS16_BASE) return null;
  const commit = /^git:(\w+)$/.exec(process.env.MS16_BASE);
  if (!commit) throw new Error('MS16_BASE is git:<commit>');
  return commit[1];
})();

function gitText(commit, rel) {
  return childProcess.execFileSync('git', ['show', commit + ':' + rel], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26 });
}

const runnerText = base === null ? fs.readFileSync(path.join(ROOT, 'tests/node-runner.js'), 'utf8')
  : gitText(base, 'generator/tests/node-runner.js');
const files = (/const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runnerText)[1].match(/'[^']+'/g)).map((s) => s.slice(1, -1));

function run(rel) {
  const abs = path.join(ROOT, rel);
  vm.runInThisContext(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''), { filename: abs });
}

function runBase(rel) {
  const repoRel = path.posix.normalize('generator/' + rel);
  vm.runInThisContext(gitText(base, repoRel).replace(/^\uFEFF/, ''), { filename: path.join(REPO, repoRel) });
}

run('../core/tests/harness.js');
files.forEach((f) => {
  if (base !== null) runBase(f);
  else if (fs.existsSync(path.join(ROOT, f))) run(f);
});
['../core/tests/fixtures', 'tests/fixtures'].forEach((dir) => {
  fs.readdirSync(path.join(ROOT, dir)).filter((n) => n.endsWith('.js')).sort()
    .forEach((n) => run(dir + '/' + n));
});

module.exports = globalThis.SG;
