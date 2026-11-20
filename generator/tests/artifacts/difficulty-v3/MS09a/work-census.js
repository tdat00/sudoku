'use strict';
// Scratch (MS09a): the work of finnedXWing on the states of the agreement setups of tech-fish.test.js (and of every
// state of the soundness sweep's seeds): the largest and the mean number of work units of one call, with the number of calls
// that found something, against the structural maximum of the variant. Usage (from generator/):
//   node tests/artifacts/difficulty-v3/MS09a/work-census.js
const SG = require('./load.js');
const H = SG.techHelper;

function buildGrid(variantId, boxRows, boxCols) {
  const D = boxRows * boxCols;
  const n = D * D;
  const cellRow = new Int32Array(n);
  const cellCol = new Int32Array(n);
  const cellRegion = new Int32Array(n);
  const units = [];
  const unitMeta = [];
  for (let r = 0; r < D; r++) {
    for (let c = 0; c < D; c++) {
      cellRow[r * D + c] = r;
      cellCol[r * D + c] = c;
      cellRegion[r * D + c] = Math.floor(r / boxRows) * (D / boxCols) + Math.floor(c / boxCols);
    }
  }
  for (let r = 0; r < D; r++) {
    units.push(Array.from({ length: D }, (_, c) => r * D + c));
    unitMeta.push({ kind: 'row', gridIndex: 0, label: 'R' + (r + 1) });
  }
  for (let c = 0; c < D; c++) {
    units.push(Array.from({ length: D }, (_, r) => r * D + c));
    unitMeta.push({ kind: 'col', gridIndex: 0, label: 'C' + (c + 1) });
  }
  for (let b = 0; b < D; b++) {
    const top = Math.floor(b / (D / boxCols)) * boxRows;
    const left = (b % (D / boxCols)) * boxCols;
    const cells = [];
    for (let r = 0; r < boxRows; r++) for (let c = 0; c < boxCols; c++) cells.push((top + r) * D + left + c);
    units.push(cells);
    unitMeta.push({ kind: 'box', gridIndex: 0, label: 'B' + (b + 1) });
  }
  return SG.model.create({ variantId, digits: D, cellCount: n, units, unitMeta,
    layout: { rows: D, cols: D, cellRow, cellCol, cellRegion } });
}

const setups = [
  ['classic9', () => H.model('classic9'), 1200, 99], ['classic9', () => H.model('classic9'), 400, 777],
  ['classic9', () => H.model('classic9'), 300, 20260101], ['classic6', () => H.model('classic6'), 400, 777],
  ['classic4', () => H.model('classic4'), 300, 777], ['fishTest12', () => buildGrid('fishTest12', 3, 4), 60, 2026],
  ['fishTest16', () => buildGrid('fishTest16', 4, 4), 32, 2026]
];
['diagonalX', 'hyper', 'jigsaw9', 'killer', 'greaterThan', 'wordoku', 'samurai', 'sohei', 'butterfly', 'flower'].forEach((v) => {
  if (SG.testkit.hasVariant(v)) setups.push([v, () => H.model(v), v === 'jigsaw9' || v === 'diagonalX' || v === 'hyper' ? 120 : 12, 4242]);
});
let overall = 0;
setups.forEach(([name, make, n, seed]) => {
  const model = make();
  const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), n);
  const records = [];
  const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) });
  const tech = SG.techniques.get('finnedXWing');
  let found = 0;
  items.forEach((it) => { if (tech.find(model, it.state, ctx) !== null) found++; });
  const works = records.map((r) => r.work);
  const max = Math.max.apply(null, works);
  overall = Math.max(overall, max);
  const capped = records.filter((r) => r.capHit !== null).length;
  console.log(name + ' seed ' + seed + ': ' + items.length + ' calls, ' + found + ' found, largest work ' + max + ', mean ' +
    (works.reduce((a, b) => a + b, 0) / works.length).toFixed(1) + ', capped ' + capped);
});
console.log('largest work of any call: ' + overall + ' of 50000');
