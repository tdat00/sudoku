'use strict';
// Scratch loader (copied from MS10b): harness, ordered SOURCE_FILES and the fixture folders of the runner,
// no suites.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const runner = fs.readFileSync(path.join(ROOT, 'tests/node-runner.js'), 'utf8');
const files = (/const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner)[1].match(/'[^']+'/g)).map((s) => s.slice(1, -1));

function run(rel) {
  let abs = path.join(ROOT, rel);
  // MS11A_BASE_WING: load the wing engine of the base commit (a copy kept next to this file) instead of the tree's, to
  // measure the cost of the second pass of uniqueRectangle against the unchanged first pass
  if (process.env.MS11A_BASE_WING && rel.endsWith('core/js/engine/tech-wing.js')) {
    abs = path.resolve(process.env.MS11A_BASE_WING);
  }
  vm.runInThisContext(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''), { filename: abs });
}

run('../core/tests/harness.js');
files.forEach((f) => { if (fs.existsSync(path.join(ROOT, f))) run(f); });
['../core/tests/fixtures', 'tests/fixtures'].forEach((dir) => {
  fs.readdirSync(path.join(ROOT, dir)).filter((n) => n.endsWith('.js')).sort()
    .forEach((n) => run(dir + '/' + n));
});

module.exports = globalThis.SG;
