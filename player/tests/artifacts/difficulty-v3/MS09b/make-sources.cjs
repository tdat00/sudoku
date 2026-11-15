'use strict';
// Scratch (MS09b): sources.json of the GH step for finnedSwordfish. The existing real sources of the catalogue whose replay with
// the current hint code reaches a finned Swordfish hint (gh-check-fsf-existing-sources.txt: Nightmare 648, Nightmare 1156,
// Nightmare 3 and Hell 2 escargot), the source of the saved colour and chain examples first (Nightmare 648), then the others.
// The tool keeps the easiest hint to read among them.
//   node tests/artifacts/difficulty-v3/MS09b/make-sources.cjs
const fs = require('fs');
const path = require('path');

const here = __dirname;
const all = JSON.parse(fs.readFileSync(path.join(here, 'sources-fsf-existing.json'), 'utf8')).sources.finnedSwordfish;
const pick = (labels) => labels.map((label) => {
  const found = all.filter((s) => s.level + ' ' + s.seed === label);
  if (found.length !== 1) throw new Error('source ' + label + ' not found exactly once');
  return found[0];
});
const list = pick(['Nightmare 648', 'Nightmare 1156', 'Nightmare 3', 'Hell 2 escargot']);
const lines = list.map((item) => '      ' + JSON.stringify(item)).join(',\r\n');
fs.writeFileSync(path.join(here, 'sources.json'),
  '{\r\n  "schema": 1,\r\n  "sources": {\r\n    "finnedSwordfish": [\r\n' + lines + '\r\n    ]\r\n  }\r\n}\r\n', 'utf8');
console.log('finnedSwordfish ' + list.length + ' sources');
