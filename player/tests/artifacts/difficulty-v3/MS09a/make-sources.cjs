'use strict';
// Scratch (MS09a): sources.json of the GH step for finnedXWing. The existing real sources of the catalogue whose replay with the
// current hint code reaches a finned X-Wing hint (gh-check-fin-existing-sources.txt: Nightmare 1156, 648, 828, 11 and 1427 and
// Hell 1 8), in the order of the brief's preference: the sources of the saved colour and chain examples first (Nightmare 648:
// simpleColouring and forcingChain; Nightmare 828: jellyfish), then the others.
//   node tests/artifacts/difficulty-v3/MS09a/make-sources.cjs
const fs = require('fs');
const path = require('path');

const here = __dirname;
const all = JSON.parse(fs.readFileSync(path.join(here, 'sources-fin-existing.json'), 'utf8')).sources.finnedXWing;
const pick = (labels) => labels.map((label) => {
  const found = all.filter((s) => s.level + ' ' + s.seed === label);
  if (found.length !== 1) throw new Error('source ' + label + ' not found exactly once');
  return found[0];
});
const list = pick(['Nightmare 648', 'Nightmare 828', 'Nightmare 1156', 'Nightmare 11', 'Nightmare 1427', 'Hell 1 8']);
const lines = list.map((item) => '      ' + JSON.stringify(item)).join(',\r\n');
fs.writeFileSync(path.join(here, 'sources.json'),
  '{\r\n  "schema": 1,\r\n  "sources": {\r\n    "finnedXWing": [\r\n' + lines + '\r\n    ]\r\n  }\r\n}\r\n', 'utf8');
console.log('finnedXWing ' + list.length + ' sources');
