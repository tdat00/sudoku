'use strict';

/*
 * MS10a scratch (from MS09b's mutant-run.cjs): runs the tech-wing suite (or another --suite given after the mutation id)
 * against ONE in-memory mutation of core/js/engine/tech-wing.js. The file on disk is never touched: fs.readFileSync is
 * wrapped for that one path, so the node-runner of the Generator loads the mutated text. Usage (from generator/):
 *   node tests/artifacts/difficulty-v3/MS10a/mutant-run.cjs <mutation index> [runner arguments]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const MUTATIONS = require('./mutations.cjs');

const index = Number(process.argv[2]);
const mutation = MUTATIONS[index];
if (!mutation) {
  console.error('no mutation ' + process.argv[2]);
  process.exit(2);
}
// a mutation names its file (relative to the repository root); the default is the wing engine
const TARGET = path.resolve(ROOT, '..', mutation.target || 'core/js/engine/tech-wing.js');
const original = fs.readFileSync;
fs.readFileSync = function (file, ...rest) {
  const out = original.call(fs, file, ...rest);
  if (typeof file === 'string' && path.resolve(file) === TARGET) {
    const text = out.toString();
    const at = text.indexOf(mutation.from);
    if (at === -1 || text.indexOf(mutation.from, at + 1) !== -1) {
      console.error('mutation ' + index + ': the fragment is not found exactly once');
      process.exit(2);
    }
    return text.replace(mutation.from, () => mutation.to);
  }
  return out;
};
const runner = path.join(ROOT, 'tests', 'node-runner.js');
process.argv = [process.argv[0], runner].concat(process.argv.slice(3).length > 0 ? process.argv.slice(3) : ['--suite=tech-wing']);
require(runner);
