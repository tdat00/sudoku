'use strict';
// Scratch (MS09b): second geometry probe of the finned Swordfish tests: the jigsaw board, the 4 x 4 board, the Samurai
// and a window of the hyper board (a target that sees only one of two fins).
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS09b/geometry-probe-2.js
const SG = require('./load.js');
const { referenceFinned } = require('./reference.js');
const H = SG.techHelper;

function digitsMap(model, spec) {
  // only the first digit of the spec has candidates, and only on the listed cells: no other digit is scanned
  const only = Number(Object.keys(spec)[0]);
  const keep = new Set(spec[only].map((label) => H.cell(model, label)));
  const state = H.makeState(model, '.'.repeat(model.cellCount), { propagate: false });
  for (let c = 0; c < model.cellCount; c++) state.candidates[c] = keep.has(c) ? 1 << (only - 1) : 0;
  return state;
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
}

const JIGSAW_LAYOUT = ['111222233', '112224443', '152244463', '155544463', '155566663', '155666733',
  '888997773', '888999777', '888999977'];
function regionBoard(variantId, layout) {
  const D = layout.length;
  const n = D * D;
  const units = [];
  const unitMeta = [];
  const cellRow = new Int32Array(n);
  const cellCol = new Int32Array(n);
  const cellRegion = new Int32Array(n);
  for (let c = 0; c < n; c++) { cellRow[c] = Math.floor(c / D); cellCol[c] = c % D; }
  for (let r = 0; r < D; r++) {
    units.push(Array.from({ length: D }, (_, c) => r * D + c));
    unitMeta.push({ kind: 'row', gridIndex: 0, label: 'R' + (r + 1) });
  }
  for (let c = 0; c < D; c++) {
    units.push(Array.from({ length: D }, (_, r) => r * D + c));
    unitMeta.push({ kind: 'col', gridIndex: 0, label: 'C' + (c + 1) });
  }
  for (let k = 0; k < D; k++) {
    const cells = [];
    for (let c = 0; c < n; c++) if (layout[Math.floor(c / D)].charAt(c % D) === String(k + 1)) cells.push(c);
    cells.forEach((c) => { cellRegion[c] = k; });
    units.push(cells);
    unitMeta.push({ kind: 'region', gridIndex: 0, label: 'J' + (k + 1) });
  }
  return SG.model.create({ variantId, digits: D, cellCount: n, units, unitMeta,
    layout: { rows: D, cols: D, cellRow, cellCol, cellRegion } });
}
const turned = JIGSAW_LAYOUT.map((_, r) => JIGSAW_LAYOUT.map((row) => row.charAt(r)).join(''));
const jig = regionBoard('jigsawLayout', JIGSAW_LAYOUT);
const jigT = regionBoard('jigsawLayoutTurned', turned);
const JIG3 = ['R3C5', 'R3C7', 'R3C8', 'R6C2', 'R6C8', 'R9C2', 'R9C7', 'R2C7', 'R7C8'];
console.log('--- jigsaw');
show('JIG3', jig, JIG3);
show('JIG3 transposed', jigT, JIG3.map(transposeRef));
show('JIG3 second fin R3C1 (J1)', jig, JIG3.concat(['R3C1']));
show('JIG3 cover cell outside the fin region R4C8 (J6)', jig, ['R3C5', 'R3C7', 'R3C8', 'R6C2', 'R6C8', 'R9C2', 'R9C7', 'R4C8', 'R7C8']);

function plain4() {
  const D = 4;
  const units = [];
  const unitMeta = [];
  const cellRow = new Int32Array(16);
  const cellCol = new Int32Array(16);
  const cellRegion = new Int32Array(16);
  for (let r = 0; r < D; r++) for (let c = 0; c < D; c++) {
    cellRow[r * D + c] = r; cellCol[r * D + c] = c; cellRegion[r * D + c] = Math.floor(r / 2) * 2 + Math.floor(c / 2);
  }
  for (let r = 0; r < D; r++) { units.push(Array.from({ length: D }, (_, c) => r * D + c)); unitMeta.push({ kind: 'row', gridIndex: 0, label: 'R' + (r + 1) }); }
  for (let c = 0; c < D; c++) { units.push(Array.from({ length: D }, (_, r) => r * D + c)); unitMeta.push({ kind: 'col', gridIndex: 0, label: 'C' + (c + 1) }); }
  for (let b = 0; b < D; b++) {
    const top = Math.floor(b / 2) * 2;
    const left = (b % 2) * 2;
    const cells = [];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) cells.push((top + r) * D + left + c);
    units.push(cells); unitMeta.push({ kind: 'box', gridIndex: 0, label: 'B' + (b + 1) });
  }
  return SG.model.create({ variantId: 'fishTestPlain4', digits: 4, cellCount: 16, units, unitMeta,
    layout: { rows: 4, cols: 4, cellRow, cellCol, cellRegion } });
}
console.log('--- 4 x 4');
const p4 = plain4();
show('SMALL', p4, ['R1C1', 'R1C3', 'R2C1', 'R2C2', 'R3C2', 'R3C3', 'R3C4', 'R4C3', 'R4C1'], 1);

console.log('--- samurai');
if (SG.testkit.hasVariant('samurai')) {
  const sam = H.model('samurai');
  const g = (labels) => labels.map((l) => 'G1-' + l);
  show('SAMURAI unshared box G1-B6', sam, g(['R1C2', 'R1C5', 'R4C5', 'R4C8', 'R4C9', 'R6C2', 'R6C8', 'R5C8', 'R9C2']));
  show('SAMURAI shared corner box', sam, g(['R1C2', 'R1C5', 'R4C5', 'R4C8', 'R7C2', 'R7C8', 'R7C9', 'R8C8', 'R9C2']));
}

console.log('--- hyper');
if (SG.testkit.hasVariant('hyper')) {
  const hy = H.model('hyper');
  console.log('units of kind: ' + Array.from(new Set(hy.unitMeta.map((m) => m.kind))).join(','));
  const base = ['R1C2', 'R1C5', 'R4C5', 'R4C8', 'R7C2', 'R7C8', 'R9C2'];
  show('HYPER fins R4C7 R4C9 target R5C8', hy, base.concat(['R4C7', 'R4C9', 'R5C8']));
  show('HYPER fins R4C7 R4C9 target R2C8 (sees R4C7 through a window only)', hy, base.concat(['R4C7', 'R4C9', 'R2C8']));
  const peers = (a, b) => hy.peers[H.cell(hy, a)].indexOf(H.cell(hy, b)) !== -1 || Array.from(hy.peers[H.cell(hy, a)]).indexOf(H.cell(hy, b)) !== -1;
  console.log('R2C8 sees R4C7 ' + peers('R2C8', 'R4C7') + ', R2C8 sees R4C9 ' + peers('R2C8', 'R4C9') + ', R5C8 sees R4C7 ' + peers('R5C8', 'R4C7') + ', R5C8 sees R4C9 ' + peers('R5C8', 'R4C9'));
}
