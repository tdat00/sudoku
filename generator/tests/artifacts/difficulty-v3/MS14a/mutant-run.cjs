'use strict';

/*
 * MS14a scratch (from MS13b's mutant-run.cjs, with several edits per mutation): runs the suites of ONE app against ONE
 * in-memory mutation of one file (the file the mutation names). The file on disk is never touched: fs.readFileSync is wrapped
 * for that one path, so the runner of the app loads the mutated text. Usage (from the repository root or anywhere):
 *   node generator/tests/artifacts/difficulty-v3/MS14a/mutant-run.cjs <mutation index> [runner arguments]
 * Without runner arguments it runs the `suites` of the mutation in its app, selected by its `filter`.
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
    let text = out.toString();
    mutation.edits.forEach((edit) => {
      const at = text.indexOf(edit.from);
      if (at === -1 || text.indexOf(edit.from, at + 1) !== -1) {
        console.error('mutation ' + index + ': a fragment is not found exactly once');
        process.exit(2);
      }
      text = text.replace(edit.from, () => edit.to);
    });
    return text;
  }
  return out;
};
const runner = path.join(REPO, mutation.app, 'tests', 'node-runner.js');
const extra = process.argv.slice(3);
const args = ['--suite=' + mutation.suites];
if (mutation.filter) args.push('--filter=' + mutation.filter);
process.argv = [process.argv[0], runner].concat(extra.length > 0 ? extra : args);
require(runner);
