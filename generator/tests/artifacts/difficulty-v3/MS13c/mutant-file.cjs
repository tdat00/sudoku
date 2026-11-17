'use strict';
// MS13c scratch: writes the engine with the edits of one mutation of mutations.cjs applied, as a file for MS13C_CHAIN=file:<out>
// (survivor-scan.js). Usage: node mutant-file.cjs <mutation index> <out file>
const fs = require('fs');
const path = require('path');
const MUTATIONS = require('./mutations.cjs');
const mutation = MUTATIONS[Number(process.argv[2])];
if (!mutation) throw new Error('no mutation ' + process.argv[2]);
let text = fs.readFileSync(path.resolve(__dirname, '..', '..', '..', '..', '..', mutation.target), 'utf8');
mutation.edits.forEach((edit) => {
  const at = text.indexOf(edit.from);
  if (at === -1 || text.indexOf(edit.from, at + 1) !== -1) throw new Error('a fragment is not found exactly once');
  text = text.replace(edit.from, () => edit.to);
});
fs.writeFileSync(path.resolve(process.argv[3]), text, 'utf8');
console.log('wrote ' + process.argv[3] + ' for ' + mutation.name);
