'use strict';
// MS16 scratch (from MS15b's): checks that every `from` fragment of mutations.cjs occurs exactly once in its target file, and
// prints the tally per set.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..', '..', '..');
const texts = {};
const mutations = require('./mutations.cjs');
let bad = 0;
const sets = {};
mutations.forEach((m, i) => {
  sets[m.set] = (sets[m.set] || 0) + 1;
  if (!texts[m.target]) texts[m.target] = fs.readFileSync(path.resolve(root, m.target), 'utf8');
  const text = texts[m.target];
  m.edits.forEach((edit, k) => {
    const first = text.indexOf(edit.from);
    const second = first === -1 ? -1 : text.indexOf(edit.from, first + 1);
    if (first === -1 || second !== -1) {
      bad++;
      console.log('mutation ' + i + ' (' + m.name + ') edit ' + k + ': ' + (first === -1 ? 'not found' : 'found more than once'));
    }
    if (edit.from === edit.to) {
      bad++;
      console.log('mutation ' + i + ' (' + m.name + ') edit ' + k + ': from equals to');
    }
  });
});
console.log(Object.keys(sets).map((k) => k + ' ' + sets[k]).join(', '));
console.log(mutations.length + ' mutations, ' + bad + ' with a bad fragment');
process.exit(bad === 0 ? 0 : 1);
