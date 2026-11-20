'use strict';
// Scratch (MS08b): how many states of each agreement setup of tech-fish.test.js hold a kite (finder only; the
// enumeration agrees by the test), and the cost of generating them on the multi-grid boards.
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

function count(model, n, seed) {
  const t0 = Date.now();
  const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), n);
  const t1 = Date.now();
  let hits = 0;
  const ctx = SG.techniques.createContext(model, {});
  const tech = SG.techniques.get('twoStringKite');
  items.forEach((it) => { if (tech.find(model, it.state, ctx) !== null) hits++; });
  return { states: n, hits, genMs: t1 - t0, findMs: Date.now() - t1 };
}

const setups = [
  ['classic9', 400, 777], ['classic9', 400, 99], ['classic6', 400, 777], ['classic4', 300, 777],
  ['diagonalX', 120, 4242], ['hyper', 120, 4242], ['jigsaw9', 120, 4242]
];
const grids = { fishTest12: [buildGrid('fishTest12', 3, 4), 60, 2026], fishTest16: [buildGrid('fishTest16', 4, 4), 32, 2026] };
Object.keys(grids).forEach((k) => {
  const [model, n, seed] = grids[k];
  console.log(k + ' seed ' + seed + ': ' + JSON.stringify(count(model, n, seed)));
});
const extra = (process.argv[2] || '').split(',').filter(Boolean);
extra.forEach((v) => setups.push([v, Number(process.argv[3] || 12), 4242]));
setups.forEach(([variant, n, seed]) => {
  if (!SG.testkit.hasVariant(variant)) { console.log(variant + ' not available'); return; }
  const r = count(H.model(variant), n, seed);
  console.log(variant + ' seed ' + seed + ': ' + JSON.stringify(r));
});
