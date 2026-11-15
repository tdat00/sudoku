'use strict';
// Scratch (MS08a): sources.json of the GH step: skyscraper from the saved simpleColouring source (Hell 1, 214) and
// xyzWing from the four existing catalogue sources whose replay with the current hint code reaches an xyzWing hint
// (gh-check-xyz-existing-sources.txt: puzzles 6, 15, 17 and 18 of the 22 existing classic9 sources).
//   node tests/artifacts/difficulty-v3/MS08a/make-sources.cjs
const fs = require('fs');
const path = require('path');

const here = __dirname;
const colouring = JSON.parse(fs.readFileSync(path.join(here, 'sources-colouring.json'), 'utf8'));
const existing = JSON.parse(fs.readFileSync(path.join(here, 'sources-xyz-existing.json'), 'utf8'));
const wanted = ['Nightmare 70', 'Nightmare 13', 'Nightmare 11', 'Nightmare 1427'];
const xyz = existing.sources.xyzWing.filter((s) => wanted.indexOf(s.level + ' ' + s.seed) !== -1);
if (xyz.length !== wanted.length) throw new Error('expected ' + wanted.length + ' xyzWing sources, got ' + xyz.length);
const lines = (list) => list.map((item) => '      ' + JSON.stringify(item)).join(',\r\n');
const text = '{\r\n  "schema": 1,\r\n  "sources": {\r\n    "skyscraper": [\r\n' + lines(colouring.sources.skyscraper) +
  '\r\n    ],\r\n    "xyzWing": [\r\n' + lines(xyz) + '\r\n    ]\r\n  }\r\n}\r\n';
fs.writeFileSync(path.join(here, 'sources.json'), text, 'utf8');
console.log('skyscraper ' + colouring.sources.skyscraper.length + ' source, xyzWing ' + xyz.length + ' sources');
