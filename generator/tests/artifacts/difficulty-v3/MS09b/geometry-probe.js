'use strict';
// Scratch (MS09b): the geometry vectors of the finned Swordfish tests, checked against the independent enumeration
// (reference.js) and the registered finder before they are written into the suite.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS09b/geometry-probe.js
const SG = require('./load.js');
const { referenceFinned } = require('./reference.js');
const H = SG.techHelper;
const m9 = H.model('classic9');

function digitsMap(model, spec) {
  const eliminate = [];
  Object.keys(spec).forEach((key) => {
    const keep = new Set(spec[key].map((label) => H.cell(model, label)));
    for (let c = 0; c < model.cellCount; c++) if (!keep.has(c)) eliminate.push([c, Number(key)]);
  });
  return H.makeState(model, '.'.repeat(model.cellCount), { eliminate, propagate: false });
}
const transposeRef = (ref) => { const m = /^R(\d+)C(\d+)$/.exec(ref); return 'R' + m[2] + 'C' + m[1]; };
const unitLabel = (model, u) => model.unitMeta[u].label;

function show(name, model, labels, digit) {
  const d = digit || 5;
  const state = digitsMap(model, { [d]: labels });
  const patterns = referenceFinned(SG, model, state, 3).filter((p) => p.targets.length > 0);
  const records = [];
  const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) });
  const f = SG.techniques.get('finnedSwordfish').find(model, state, ctx);
  console.log(name + ': reference ' + patterns.length + ' removing ' + patterns.map((p) => p.kind + ' ' +
    p.bases.map((u) => unitLabel(model, u)).join('/') + ' on ' + p.covers.map((u) => unitLabel(model, u)).join('/') +
    ' fins ' + p.fins.map((c) => H.label(model, c)).join(',') + ' body ' + p.body.join('') + ' targets ' +
    p.targets.map((c) => H.label(model, c)).join(',')).join(' | '));
  console.log('   finder ' + (f === null ? 'null' : JSON.stringify({ args: f.i18nArgs, el: f.eliminations.map((e) => H.label(model, e[0])),
    cells: f.cells.length })) + ' work ' + JSON.stringify(records[0]));
  const x2 = referenceFinned(SG, model, state, 2).filter((p) => p.targets.length > 0).length;
  const xf = SG.techniques.get('finnedXWing').find(model, state, SG.techniques.createContext(model, {}));
  const sw = SG.techniques.get('swordfish').find(model, state, SG.techniques.createContext(model, {}));
  console.log('   n=2 reference removing ' + x2 + ', finnedXWing ' + (xf === null ? 'null' : xf.i18nArgs.bases.join('/')) +
    ', swordfish ' + (sw === null ? 'null' : sw.i18nArgs.baseUnits.join('/')));
}

const CORE = ['R1C2', 'R1C5', 'R4C5', 'R4C8', 'R4C9', 'R7C2', 'R7C8', 'R5C8'];
const VECTOR = CORE.concat(['R9C2']);
show('CORE', m9, CORE);
show('VECTOR', m9, VECTOR);
show('VECTOR transposed', m9, VECTOR.map(transposeRef));
show('SPARSE (R4C5 missing)', m9, ['R1C2', 'R1C5', 'R4C8', 'R4C9', 'R7C2', 'R7C8', 'R5C8', 'R9C2']);
show('SPARSE transposed', m9, ['R1C2', 'R1C5', 'R4C8', 'R4C9', 'R7C2', 'R7C8', 'R5C8', 'R9C2'].map(transposeRef));
show('TWO_FINS', m9, VECTOR.concat(['R4C7']));
show('TWO_FINS + R6C8', m9, VECTOR.concat(['R4C7', 'R6C8']));
const FINS_TWO_LINES = ['R4C2', 'R4C5', 'R4C9', 'R5C5', 'R5C7', 'R5C8', 'R9C2', 'R9C8', 'R6C8'];
show('FINS_TWO_LINES', m9, FINS_TWO_LINES);
show('FINS_TWO_LINES transposed', m9, FINS_TWO_LINES.map(transposeRef));
console.log('--- near misses');
[
  ['split boxes R1C3', VECTOR.concat(['R1C3'])],
  ['fins one line two boxes R4C6', VECTOR.concat(['R4C6'])],
  ['off-cover target R5C7', ['R1C2', 'R1C5', 'R4C5', 'R4C8', 'R4C9', 'R7C2', 'R7C8', 'R5C7', 'R9C2']],
  ['cover cell not seeing the fin R2C8', ['R1C2', 'R1C5', 'R4C5', 'R4C8', 'R4C9', 'R7C2', 'R7C8', 'R2C8', 'R9C2']],
  ['no target', ['R1C2', 'R1C5', 'R4C5', 'R4C8', 'R4C9', 'R7C2', 'R7C8', 'R9C2']],
  ['line of fins only', ['R1C2', 'R1C5', 'R4C7', 'R4C9', 'R7C2', 'R7C8', 'R5C8', 'R9C2']],
  ['no fin (ordinary Swordfish)', ['R1C2', 'R1C5', 'R4C5', 'R4C8', 'R7C2', 'R7C8', 'R5C8', 'R9C2']],
  ['n=2 vector at n=3', ['R1C2', 'R1C8', 'R4C2', 'R4C8', 'R4C9', 'R5C8', 'R9C2']],
  ['two bases + single third row', ['R1C2', 'R1C5', 'R4C5', 'R4C8', 'R4C9', 'R7C2', 'R5C8', 'R9C2']]
].forEach(([name, labels]) => {
  show(name, m9, labels);
  show(name + ' transposed', m9, labels.map(transposeRef));
});
