'use strict';
// Scratch loader (copied from MS13a's load.js, adapted): harness, ordered SOURCE_FILES and the fixture folders of the runner,
// no suites. MS13B_BASE=git:<commit> loads every source file of the list from that commit, read from git into memory (nothing
// is written), instead of the tree's, to compare with the base commit (7932132: MS13a accepted). MS13B_APP=player loads the
// Player's SOURCE_FILES and fixtures instead of the Generator's (the two apps define different `SG.i18n` code).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const cp = require('child_process');

const APP = process.env.MS13B_APP === 'player' ? 'player' : 'generator';
const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const ROOT = path.join(REPO, APP);
const runner = fs.readFileSync(path.join(ROOT, 'tests/node-runner.js'), 'utf8');
const files = (/const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner)[1].match(/'[^']+'/g)).map((s) => s.slice(1, -1));
const base = /^git:(\w+)$/.exec(process.env.MS13B_BASE || '');
if (process.env.MS13B_BASE && !base) throw new Error('MS13B_BASE is git:<commit>');

function read(abs) {
  if (!base) return fs.readFileSync(abs, 'utf8');
  const rel = path.relative(REPO, abs).replace(/\\/g, '/');
  return cp.execFileSync('git', ['show', base[1] + ':' + rel], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 });
}

function run(rel) {
  const abs = path.join(ROOT, rel);
  vm.runInThisContext(read(abs).replace(/^\uFEFF/, ''), { filename: abs });
}

run('../core/tests/harness.js');
// what the node runners give the suites (SG.test.node), so that fixtures that read documents work here too
if (globalThis.SG && globalThis.SG.test) globalThis.SG.test.node = { fs, path, vm, root: ROOT };
files.forEach((f) => { if (fs.existsSync(path.join(ROOT, f))) run(f); });
['../core/tests/fixtures', 'tests/fixtures'].forEach((dir) => {
  fs.readdirSync(path.join(ROOT, dir)).filter((n) => n.endsWith('.js')).sort().forEach((n) => run(dir + '/' + n));
});

module.exports = globalThis.SG;
if (base && process.env.MS13B_TREE_LOCALES === '1') {
  // the base formatter code with the tree's language packs: the locale files only add keys, so running the tree's two packs
  // over the base ones overwrites every changed text with its new value
  ['js/ui/locale.en.js', 'js/ui/locale.vi.js'].forEach((rel) => {
    const abs = path.join(ROOT, rel);
    vm.runInThisContext(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''), { filename: abs });
  });
}
