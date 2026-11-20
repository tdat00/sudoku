'use strict';
// Scratch (MS08c): sources.json of the GH step for emptyRectangle. The existing real sources of the catalogue whose replay
// with the current hint code reaches an empty rectangle hint (gh-check-er-existing-sources.txt: Nightmare 1156, Nightmare 692,
// Hell 1 214 and Nightmare 828), in the order of the brief's preference: the sources of the saved colour and chain examples
// first (Hell 1 214: skyscraper, kite; Nightmare 828: jellyfish), then the others.
//   node tests/artifacts/difficulty-v3/MS08c/make-sources.cjs
const fs = require('fs');
const path = require('path');

const here = __dirname;
const all = JSON.parse(fs.readFileSync(path.join(here, 'sources-er-existing.json'), 'utf8')).sources.emptyRectangle;
const pick = (labels) => labels.map((label) => {
  const found = all.filter((s) => s.level + ' ' + s.seed === label);
  if (found.length !== 1) throw new Error('source ' + label + ' not found exactly once');
  return found[0];
});
const er = pick(['Hell 1 214', 'Nightmare 828', 'Nightmare 692', 'Nightmare 1156']);
const lines = (list) => list.map((item) => '      ' + JSON.stringify(item)).join(',\r\n');
const text = '{\r\n  "schema": 1,\r\n  "sources": {\r\n    "emptyRectangle": [\r\n' + lines(er) + '\r\n    ]\r\n  }\r\n}\r\n';
fs.writeFileSync(path.join(here, 'sources.json'), text, 'utf8');
console.log('emptyRectangle ' + er.length + ' sources');
