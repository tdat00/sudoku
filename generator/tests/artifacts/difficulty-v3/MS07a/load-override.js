'use strict';
// Scratch loader (MS07a): harness, ordered SOURCE_FILES and the fixture folders of the runner, no suites.
// SG_CHAIN_FILE replaces core/js/engine/tech-chain.js (a read-only copy of the original, for the differential).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const runner = fs.readFileSync(path.join(ROOT, 'tests/node-runner.js'), 'utf8');
const files = (/const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner)[1].match(/'[^']+'/g)).map((s) => s.slice(1, -1));

function run(rel) {
  let abs = path.join(ROOT, rel);
  if (rel === '../core/js/engine/tech-chain.js' && process.env.SG_CHAIN_FILE) abs = process.env.SG_CHAIN_FILE;
  vm.runInThisContext(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''), { filename: abs });
}

run('../core/tests/harness.js');
files.forEach((f) => { if (fs.existsSync(path.join(ROOT, f))) run(f); });
['../core/tests/fixtures', 'tests/fixtures'].forEach((dir) => {
  fs.readdirSync(path.join(ROOT, dir)).filter((n) => n.endsWith('.js')).sort()
    .forEach((n) => run(dir + '/' + n));
});

module.exports = globalThis.SG;
