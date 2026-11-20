'use strict';
// MS15a scratch: the hook of the in-memory mutations (mutations.cjs), from MS14b's. Loaded in the mutant runner and, through
// NODE_OPTIONS, in every Node process the tests start. When MS15A_MUTATION names a mutation, fs.readFileSync returns its target file
// with the edits applied, for that one path only; nothing is ever written. A fragment that is not found exactly once ends the
// process with code 2 (a mutation that would not be one).
const fs = require('fs');
const path = require('path');

const index = process.env.MS15A_MUTATION;
if (index !== undefined && index !== '') {
  const MUTATIONS = require('./mutations.cjs');
  const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
  const mutation = MUTATIONS[Number(index)];
  if (!mutation) {
    process.stderr.write('no mutation ' + index + '\n');
    process.exit(2);
  }
  const TARGET = path.resolve(REPO, mutation.target);
  const original = fs.readFileSync;
  fs.readFileSync = function (file, ...rest) {
    const out = original.call(fs, file, ...rest);
    if ((typeof file === 'string' || file instanceof URL) && path.resolve(String(file instanceof URL ? file.pathname.replace(/^\//, '') : file)) === TARGET) {
      let text = out.toString();
      mutation.edits.forEach((edit) => {
        const at = text.indexOf(edit.from);
        if (at === -1 || text.indexOf(edit.from, at + 1) !== -1) {
          process.stderr.write('mutation ' + index + ': a fragment is not found exactly once\n');
          process.exit(2);
        }
        text = text.replace(edit.from, () => edit.to);
      });
      return typeof out === 'string' ? text : Buffer.from(text);
    }
    return out;
  };
}
