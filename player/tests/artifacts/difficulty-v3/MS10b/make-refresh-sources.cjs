'use strict';
// Scratch (MS10b): a sources file with the SAME list of real classic9 sources of the catalogue for every id given, for the
// refresh of the old help examples that the new technique changed (IR72 H1: refresh every affected ID from its own source, and
// when that source no longer yields it, use another real source of the catalogue and record the candidates and the choice).
//   node tests/artifacts/difficulty-v3/MS10b/make-refresh-sources.cjs <out file> <ids, comma separated> <from> <to>
// <from> and <to> select the slice [from, to) of the distinct classic9 sources of the saved catalogue (in catalogue order), so
// that a command replays at most 16 puzzles. Level "" becomes null (the strict entry shape).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const out = process.argv[2];
const ids = process.argv[3].split(',');
const from = Number(process.argv[4]);
const to = Number(process.argv[5]);
const root = path.resolve(__dirname, '..', '..', '..', '..');
const SG = {};
globalThis.SG = SG;
vm.runInThisContext(fs.readFileSync(path.join(root, 'js', 'ui', 'help-examples.js'), 'utf8'));
const seen = new Set();
const list = [];
const names = [];
Object.keys(SG.helpExamples).forEach((key) => {
  const ex = SG.helpExamples[key];
  if (ex.variant !== 'classic9' || seen.has(ex.source.puzzle)) return;
  seen.add(ex.source.puzzle);
  const header = ex.source.puzzle.split('\n')[0].split(',');
  list.push({ variantId: 'classic9', level: header[2] === '' ? null : header[2], seed: header[3], text: ex.source.puzzle });
  names.push(key + ' <- ' + (header[2] || '-') + ' ' + header[3]);
});
const slice = list.slice(from, to);
const sources = {};
ids.forEach((id) => { sources[id] = slice; });
const body = ids.map((id) => '    "' + id + '": [\r\n' + slice.map((item) => '      ' + JSON.stringify(item)).join(',\r\n') + '\r\n    ]')
  .join(',\r\n');
fs.writeFileSync(path.resolve(out), '{\r\n  "schema": 1,\r\n  "sources": {\r\n' + body + '\r\n  }\r\n}\r\n', 'utf8');
console.log(list.length + ' distinct classic9 sources in the catalogue; slice [' + from + ', ' + to + ') = ' + slice.length + ' written to ' + out);
console.log(names.slice(from, to).map((n, i) => (from + i) + ': ' + n).join('\n'));
