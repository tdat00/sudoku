'use strict';
// Scratch (MS08c): how many states of each agreement setup of tech-fish.test.js hold an empty rectangle (finder only; the
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

function count(model, n, seed) {
  const t0 = Date.now();
  const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), n);
  const t1 = Date.now();
  let hits = 0;
  const ctx = SG.techniques.createContext(model, {});
  const tech = SG.techniques.get('emptyRectangle');
  items.forEach((it) => { if (tech.find(model, it.state, ctx) !== null) hits++; });
  return { states: n, hits, genMs: t1 - t0, findMs: Date.now() - t1 };
}

const turned = JIGSAW_LAYOUT.map((_, r) => JIGSAW_LAYOUT.map((row) => row.charAt(r)).join(''));
const grids = {
  fishTest12: [buildGrid('fishTest12', 3, 4), 60, 2026], fishTest16: [buildGrid('fishTest16', 4, 4), 32, 2026],
  jigsawLayout: [regionBoard('jigsawLayout', JIGSAW_LAYOUT), 120, 4242],
  jigsawLayoutTurned: [regionBoard('jigsawLayoutTurned', turned), 120, 4242]
};
Object.keys(grids).forEach((k) => {
  const [model, n, seed] = grids[k];
  console.log(k + ' seed ' + seed + ': ' + JSON.stringify(count(model, n, seed)));
});
const setups = [
  ['classic9', 400, 777], ['classic9', 400, 99], ['classic6', 400, 777], ['classic4', 300, 777],
  ['diagonalX', 120, 4242], ['hyper', 120, 4242], ['jigsaw9', 120, 4242]
];
const extra = (process.argv[2] || '').split(',').filter(Boolean);
extra.forEach((v) => setups.push([v, Number(process.argv[3] || 12), 4242]));
setups.forEach(([variant, n, seed]) => {
  if (!SG.testkit.hasVariant(variant)) { console.log(variant + ' not available'); return; }
  const r = count(H.model(variant), n, seed);
  console.log(variant + ' seed ' + seed + ': ' + JSON.stringify(r));
});
