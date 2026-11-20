'use strict';
// Scratch (MS11a, from MS10b): a sources file for the GH step. Two forms:
//   own <out file> <id[,id...]>            the saved real source of each id (the puzzle of its saved help example, as the
//                                          Generator's Export box wrote it): the "own source first" rule of IR72 H1 (the tool's
//                                          default source, written out so that the task's --sources command can name it)
//   slice <out file> <id[,id...]> <from> <to>   the SAME list of real classic9 sources of the catalogue for every id given:
//                                          the distinct classic9 sources of the saved catalogue, in catalogue order, [from, to)
//                                          (at most 8, the task's --max-puzzles); level "" becomes null (the strict entry shape)
//   node tests/artifacts/difficulty-v3/MS11a/make-sources.cjs own sources.json uniqueRectangle
//   node tests/artifacts/difficulty-v3/MS11a/make-sources.cjs slice sources-remotepairs-a.json remotePairs 0 8
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const mode = process.argv[2];
const out = process.argv[3];
const ids = process.argv[4].split(',');
const root = path.resolve(__dirname, '..', '..', '..', '..');
const SG = {};
globalThis.SG = SG;
vm.runInThisContext(fs.readFileSync(path.join(root, 'js', 'ui', 'help-examples.js'), 'utf8'));

function entryOf(variant, puzzle) {
  const header = puzzle.split('\n')[0].split(',');
  return { variantId: variant, level: header[2] === '' ? null : header[2], seed: header[3], text: puzzle };
}

const sources = {};
const names = [];
if (mode === 'own') {
  ids.forEach((id) => {
    const ex = SG.helpExamples[id];
    if (!ex) throw new Error('no saved example for ' + id);
    sources[id] = [entryOf(ex.variant, ex.source.puzzle)];
    names.push(id + ' <- ' + ex.variant + ' ' + ex.source.puzzle.split('\n')[0]);
  });
} else if (mode === 'slice') {
  const from = Number(process.argv[5]);
  const to = Number(process.argv[6]);
  if (to - from > 8) throw new Error('a slice has at most 8 sources');
  const seen = new Set();
  const list = [];
  Object.keys(SG.helpExamples).forEach((key) => {
    const ex = SG.helpExamples[key];
    if (ex.variant !== 'classic9' || seen.has(ex.source.puzzle)) return;
    seen.add(ex.source.puzzle);
    list.push(entryOf('classic9', ex.source.puzzle));
    names.push(key + ' <- ' + (ex.source.puzzle.split('\n')[0].split(',')[2] || '-') + ' ' + ex.source.puzzle.split('\n')[0].split(',')[3]);
  });
  const slice = list.slice(from, to);
  ids.forEach((id) => { sources[id] = slice; });
  console.log(list.length + ' distinct classic9 sources in the catalogue; slice [' + from + ', ' + to + ') = ' + slice.length);
  names.splice(0, names.length, ...names.slice(from, to).map((n, i) => (from + i) + ': ' + n));
} else {
  throw new Error('mode own or slice');
}
const body = ids.map((id) => '    "' + id + '": [\r\n' + sources[id].map((item) => '      ' + JSON.stringify(item)).join(',\r\n') + '\r\n    ]')
  .join(',\r\n');
fs.writeFileSync(path.resolve(out), '{\r\n  "schema": 1,\r\n  "sources": {\r\n' + body + '\r\n  }\r\n}\r\n', 'utf8');
console.log('written to ' + out);
console.log(names.join('\n'));
