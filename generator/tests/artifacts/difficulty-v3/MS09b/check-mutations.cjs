'use strict';
// Scratch (MS09b): checks that every mutation of mutations.cjs has a `from` fragment found exactly once in the engine file.
const fs = require('fs');
const path = require('path');
const MUTATIONS = require('./mutations.cjs');
const text = fs.readFileSync(path.resolve(__dirname, '..', '..', '..', '..', '..', 'core', 'js', 'engine', 'tech-fish.js'), 'utf8');
let bad = 0;
MUTATIONS.forEach((m, i) => {
  const at = text.indexOf(m.from);
  const count = at === -1 ? 0 : (text.indexOf(m.from, at + 1) === -1 ? 1 : 2);
  if (count !== 1) { bad++; console.log('mutation ' + i + ' (' + m.name + '): ' + count + ' occurrence(s)'); }
  if (m.from === m.to) { bad++; console.log('mutation ' + i + ' changes nothing'); }
});
console.log(MUTATIONS.length + ' mutations, ' + bad + ' problem(s)');
process.exit(bad ? 1 : 0);
