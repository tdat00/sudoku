'use strict';
// Scratch (MS08b): sources.json of the GH step. Both IDs take real sources that the catalogue already holds
// (gh-check-kite-existing-sources.txt and gh-check-colouring-existing-sources.txt are the checks of all 21 existing
// classic9 sources):
//   twoStringKite: the sources of the saved colour and chain examples whose replay reaches a kite hint: Hell 1 214
//     (simpleColouring, skyscraper), Nightmare 648 (forcingChain), Nightmare 3 (forcingChainLong) and Hell 2 escargot
//     (nishioDeep); the nishio source (Hell 1 8) reaches none;
//   simpleColouring: its own source (Hell 1 214) reaches no colouring hint any more (a skyscraper or a kite comes
//     first), so the three existing sources that do: Hell 1 644 (xWing), Nightmare 828 (jellyfish) and Nightmare 648
//     (forcingChain).
//   node tests/artifacts/difficulty-v3/MS08b/make-sources.cjs
const fs = require('fs');
const path = require('path');

const here = __dirname;
const read = (name) => JSON.parse(fs.readFileSync(path.join(here, name), 'utf8')).sources;
const all = read('sources-kite-existing.json').twoStringKite;
const pick = (labels) => labels.map((label) => {
  const found = all.filter((s) => s.level + ' ' + s.seed === label);
  if (found.length !== 1) throw new Error('source ' + label + ' not found exactly once');
  return found[0];
});
const kite = pick(['Hell 1 214', 'Nightmare 648', 'Nightmare 3', 'Hell 2 escargot']);
const colouring = pick(['Hell 1 644', 'Nightmare 828', 'Nightmare 648']);
const lines = (list) => list.map((item) => '      ' + JSON.stringify(item)).join(',\r\n');
const text = '{\r\n  "schema": 1,\r\n  "sources": {\r\n    "simpleColouring": [\r\n' + lines(colouring) +
  '\r\n    ],\r\n    "twoStringKite": [\r\n' + lines(kite) + '\r\n    ]\r\n  }\r\n}\r\n';
fs.writeFileSync(path.join(here, 'sources.json'), text, 'utf8');
console.log('twoStringKite ' + kite.length + ' sources, simpleColouring ' + colouring.length + ' sources');
