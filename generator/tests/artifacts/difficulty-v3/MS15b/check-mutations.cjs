'use strict';
// MS15b scratch (from MS15a's): checks that every `from` fragment of mutations.cjs occurs exactly once in its target file.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..', '..', '..');
const texts = {};
const mutations = require('./mutations.cjs');
let bad = 0;
mutations.forEach((m, i) => {
  if (!texts[m.target]) texts[m.target] = fs.readFileSync(path.resolve(root, m.target), 'utf8');
  const text = texts[m.target];
  m.edits.forEach((edit, k) => {
    const first = text.indexOf(edit.from);
    const second = first === -1 ? -1 : text.indexOf(edit.from, first + 1);
    if (first === -1 || second !== -1) {
      bad++;
      console.log('mutation ' + i + ' (' + m.name + ') edit ' + k + ': ' + (first === -1 ? 'not found' : 'found more than once'));
    }
  });
});
console.log(mutations.length + ' mutations, ' + bad + ' with a bad fragment');
process.exit(bad === 0 ? 0 : 1);
