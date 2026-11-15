'use strict';
// Scratch (MS08a): how many random states of each agreement setup hold a removing skyscraper?
const SG = require('./load.js');
const H = SG.techHelper;

function buildGridModel(variantId, boxRows, boxCols) {
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

const setups = [['classic9', 400, 777], ['classic9', 400, 99], ['classic6', 400, 777], ['classic4', 300, 777],
  ['g12', 60, 2026], ['g16', 32, 2026], ['diagonalX', 120, 4242], ['hyper', 120, 4242], ['jigsaw9', 120, 4242]];
setups.forEach(([id, count, seed]) => {
  let model;
  if (id === 'g12') model = buildGridModel('fishTest12', 3, 4);
  else if (id === 'g16') model = buildGridModel('fishTest16', 4, 4);
  else if (!SG.testkit.hasVariant(id)) { console.log(id, 'no variant'); return; }
  else model = H.model(id);
  const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), count);
  const ctx = SG.techniques.createContext(model, {});
  let hits = 0;
  items.forEach((it) => { if (SG.techniques.get('skyscraper').find(model, it.state, ctx) !== null) hits++; });
  console.log(id, count, seed, 'hits', hits);
});
