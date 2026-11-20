'use strict';

/*
 * MS07c scratch: loads what generator/tests/node-runner.js loads (harness, SOURCE_FILES, FIXTURES_DIRS), without a suite,
 * and hands the global SG to a script, for read-only questions about the registry at the selected cutoff:
 *
 *   node tests/artifacts/difficulty-v3/MS07c/explore.cjs <script.cjs> [arguments]
 *
 * The script is required after the load and gets `globalThis.SG`; it may set `SG.chainSearch.SHORT_MAX` for a question
 * and must put it back. It generates nothing unless its own code does. Run it under the lock when it can take over 10 s.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const runner = fs.readFileSync(path.join(ROOT, 'tests/node-runner.js'), 'utf8').replace(/^\uFEFF/, '');

function listOf(name) {
  const match = new RegExp('const ' + name + ' = \\[([\\s\\S]*?)\\];').exec(runner);
  if (!match) throw new Error('cannot find ' + name);
  return (match[1].match(/'[^']+'/g) || []).map((s) => s.slice(1, -1));
}

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, '');
const run = (rel) => vm.runInThisContext(read(rel), { filename: path.join(ROOT, rel) });
run(/const HARNESS_FILE = '([^']+)';/.exec(runner)[1]);
globalThis.SG.test.node = Object.freeze({ fs: fs, path: path, vm: vm, root: ROOT });
listOf('SOURCE_FILES').filter((rel) => fs.existsSync(path.join(ROOT, rel))).forEach(run);
listOf('FIXTURES_DIRS').forEach((dir) => {
  fs.readdirSync(path.join(ROOT, dir)).filter((name) => name.endsWith('.js')).sort().forEach((name) => run(dir + '/' + name));
});

const script = process.argv[2];
if (!script) throw new Error('usage: explore.cjs <script.cjs> [arguments]');
require(path.resolve(script));
