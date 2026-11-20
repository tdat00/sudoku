'use strict';

/*
 * MS13a scratch (from MS12's mutant-run.cjs): runs the tech-chain suite (or another --suite given after the mutation id)
 * against ONE in-memory mutation of core/js/engine/tech-chain.js (or of the file the mutation names). The file on disk is
 * never touched: fs.readFileSync is wrapped for that one path, so the node-runner of the Generator loads the mutated text.
 * Usage (from generator/):
 *   node tests/artifacts/difficulty-v3/MS13a/mutant-run.cjs <mutation index> [runner arguments]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const MUTATIONS = require('./' + (process.env.MS13A_MUTATIONS || 'mutations.cjs'));

const index = Number(process.argv[2]);
const mutation = MUTATIONS[index];
if (!mutation) {
  console.error('no mutation ' + process.argv[2]);
  process.exit(2);
}
const TARGET = path.resolve(ROOT, '..', mutation.target || 'core/js/engine/tech-chain.js');
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
process.argv = [process.argv[0], runner].concat(process.argv.slice(3).length > 0 ? process.argv.slice(3) : ['--suite=tech-chain']);
require(runner);
