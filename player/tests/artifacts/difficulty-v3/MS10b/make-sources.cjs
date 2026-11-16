'use strict';
// Scratch (MS10b): sources.json of the GH step for wxyzWing. The brief prefers the existing wing and chain sources: the eight
// real classic9 sources of the saved examples of remotePairs, xyWing, xyzWing, uniqueRectangle, forcingChain, forcingChainLong,
// nishio and nishioDeep (sources-wxyz-existing.json, made by make-existing-sources.cjs --wing-chain from the catalogue). The tool
// replays each with the real Player hints and keeps the easiest wxyzWing hint to read among them. Nothing is generated.
//   node tests/artifacts/difficulty-v3/MS10b/make-sources.cjs
const fs = require('fs');
const path = require('path');

const here = __dirname;
const all = JSON.parse(fs.readFileSync(path.join(here, 'sources-wxyz-existing.json'), 'utf8')).sources.wxyzWing
  .map((item) => Object.assign({}, item, { level: item.level === '' ? null : item.level }));
if (all.length !== 8) throw new Error('expected the eight wing and chain sources, found ' + all.length);
const lines = all.map((item) => '      ' + JSON.stringify(item)).join(',\r\n');
fs.writeFileSync(path.join(here, 'sources.json'),
  '{\r\n  "schema": 1,\r\n  "sources": {\r\n    "wxyzWing": [\r\n' + lines + '\r\n    ]\r\n  }\r\n}\r\n', 'utf8');
console.log('wxyzWing ' + all.length + ' sources');
