'use strict';
// MS10a scratch: checks that every `from` fragment of mutations.cjs occurs exactly once in core/js/engine/tech-wing.js.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..', '..', '..');
const texts = {};
const mutations = require('./mutations.cjs');
let bad = 0;
mutations.forEach((m, i) => {
  const file = m.target || 'core/js/engine/tech-wing.js';
  if (!texts[file]) texts[file] = fs.readFileSync(path.resolve(root, file), 'utf8');
  const text = texts[file];
  const first = text.indexOf(m.from);
  const second = first === -1 ? -1 : text.indexOf(m.from, first + 1);
  if (first === -1 || second !== -1) {
    bad++;
    console.log('mutation ' + i + ' (' + m.name + '): ' + (first === -1 ? 'not found' : 'found more than once'));
  }
});
console.log(mutations.length + ' mutations, ' + bad + ' with a bad fragment');
process.exit(bad === 0 ? 0 : 1);
