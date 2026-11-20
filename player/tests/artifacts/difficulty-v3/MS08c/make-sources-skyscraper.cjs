'use strict';
// Scratch (MS08c): sources-skyscraper.json of the GH step. The skyscraper's old source (Hell 1 214) reaches no skyscraper hint any
// more (the empty rectangle comes first), so another real source of the catalogue is used. The existing sources whose replay
// reaches a skyscraper hint (gh-check-skyscraper-existing-sources.txt): Nightmare 1156, 75, 44, 648, 561, 13 and 3 and Hard 18
// and 55. In the brief's order of preference the sources of saved colour and chain examples come first (Nightmare 648: the
// forcingChain and simpleColouring examples; Nightmare 3: forcingChainLong), then the others.
//   node tests/artifacts/difficulty-v3/MS08c/make-sources-skyscraper.cjs
const fs = require('fs');
const path = require('path');

const here = __dirname;
const all = JSON.parse(fs.readFileSync(path.join(here, 'sources-sky-existing.json'), 'utf8')).sources.skyscraper;
const pick = (labels) => labels.map((label) => {
  const found = all.filter((s) => s.level + ' ' + s.seed === label);
  if (found.length !== 1) throw new Error('source ' + label + ' not found exactly once');
  return found[0];
});
const list = pick(['Nightmare 648', 'Nightmare 3', 'Nightmare 1156', 'Nightmare 75', 'Nightmare 44', 'Nightmare 13',
  'Nightmare 561', 'Hard 18', 'Hard 55']);
const lines = list.map((item) => '      ' + JSON.stringify(item)).join(',\r\n');
fs.writeFileSync(path.join(here, 'sources-skyscraper.json'),
  '{\r\n  "schema": 1,\r\n  "sources": {\r\n    "skyscraper": [\r\n' + lines + '\r\n    ]\r\n  }\r\n}\r\n', 'utf8');
console.log('skyscraper ' + list.length + ' sources');
