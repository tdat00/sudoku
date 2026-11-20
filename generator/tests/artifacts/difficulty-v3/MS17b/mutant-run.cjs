'use strict';

/*
 * MS17b scratch (from MS17a's mutant-run.cjs): runs the suites of ONE app against ONE in-memory mutation of one file (the
 * file the mutation names). The file on disk is never touched: fs.readFileSync is wrapped for that one path, so the runner
 * of the app loads the mutated text. Usage (from the repository root or anywhere):
 *   node generator/tests/artifacts/difficulty-v3/MS17b/mutant-run.cjs <mutation index> [runner arguments]
 * Without runner arguments it runs the `suites` of the mutation in its app with --bail: a mutation counts as detected when
 * the run exits 1 and names at least one failing test (the first failure ends the run; a survivor runs to the end).
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const MUTATIONS = require('./mutations.cjs');

const index = Number(process.argv[2]);
const mutation = MUTATIONS[index];
if (!mutation) {
  console.error('no mutation ' + process.argv[2]);
  process.exit(2);
}
const TARGET = path.resolve(REPO, mutation.target);
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
const runner = path.join(REPO, mutation.app, 'tests', 'node-runner.js');
const extra = process.argv.slice(3);
process.argv = [process.argv[0], runner].concat(extra.length > 0 ? extra : ['--suite=' + mutation.suites, '--bail']);
require(runner);
