'use strict';
// Scratch (MS08b): the saved help examples of the classic9 variant as a sources file for ONE technique id: every
// existing real source puzzle of the catalogue (text, level and seed as the Generator's Export box wrote them).
//   node tests/artifacts/difficulty-v3/MS08b/make-existing-sources.cjs <technique id> <out file>
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const id = process.argv[2];
const out = process.argv[3];
const root = path.resolve(__dirname, '..', '..', '..', '..');
const SG = {};
globalThis.SG = SG;
vm.runInThisContext(fs.readFileSync(path.join(root, 'js', 'ui', 'help-examples.js'), 'utf8'));
const seen = new Set();
const list = [];
Object.keys(SG.helpExamples).forEach((key) => {
  const ex = SG.helpExamples[key];
  if (ex.variant !== 'classic9' || seen.has(ex.source.puzzle)) return;
  seen.add(ex.source.puzzle);
  const header = ex.source.puzzle.split('\n')[0].split(',');
  list.push({ variantId: 'classic9', level: header[2], seed: header[3], text: ex.source.puzzle });
});
const data = { schema: 1, sources: {} };
data.sources[id] = list;
const text = '{\r\n  "schema": 1,\r\n  "sources": {\r\n    "' + id + '": [\r\n' +
  list.map((item) => '      ' + JSON.stringify(item)).join(',\r\n') + '\r\n    ]\r\n  }\r\n}\r\n';
fs.writeFileSync(path.resolve(out), text, 'utf8');
console.log(list.length + ' source(s) for ' + id + ' written to ' + out);
