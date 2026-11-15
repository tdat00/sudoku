'use strict';
// Scratch (MS09b): how many states of each agreement setup of tech-fish.test.js hold a finned X-Wing (finder only; the
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

const { referenceFinned } = require('./reference.js');

// The tally of the test (agree in tech-fish.test.js): the registered finder (or the seam with a limit) against the enumeration
// of the same searched prefix. Returns the number of states with a finned Swordfish inside the prefix ('found'), with none
// and the whole search tested ('complete') and with none and the prefix spent ('capped'), and whether any disagreed.
function count(model, n, seed, slice, limit) {
  const t0 = Date.now();
  const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), n).slice(0, slice || n);
  const t1 = Date.now();
  const out = { states: items.length, limit: limit === undefined ? 'default' : limit, found: 0, complete: 0, capped: 0,
    disagreements: 0, positions: [] };
  const tech = SG.techniques.get('finnedSwordfish');
  items.forEach((it) => {
    const report = {};
    const options = { stopAtFirst: true, report };
    if (limit !== undefined) options.limit = limit;
    const patterns = referenceFinned(SG, model, it.state, 3, options).filter((p) => p.targets.length > 0);
    const records = [];
    const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) });
    const f = limit === undefined ? tech.find(model, it.state, ctx) :
      SG.fishSearch.finnedSwordfish(model, it.state, ctx, { workLimit: limit });
    const r = records[0];
    if (patterns.length > 0) {
      out.found++;
      out.positions.push(patterns[0].unit);
      const first = patterns[0];
      const same = f !== null && JSON.stringify(f.eliminations) === JSON.stringify(first.targets.map((c) => [c, first.digit])) &&
        JSON.stringify(f.cells) === JSON.stringify(first.cells) && f.i18nArgs.digit === first.digit &&
        r.work === first.unit + 1 && r.capHit === null;
      if (!same) out.disagreements++;
    } else {
      if (report.capped) out.capped++; else out.complete++;
      if (f !== null || r.work !== report.tested || r.capHit !== (report.capped ? 'work' : null)) out.disagreements++;
    }
  });
  out.positions = out.positions.length === 0 ? [] : [Math.min.apply(null, out.positions), Math.max.apply(null, out.positions)];
  out.genMs = t1 - t0;
  out.checkMs = Date.now() - t1;
  return out;
}

const turned = JIGSAW_LAYOUT.map((_, r) => JIGSAW_LAYOUT.map((row) => row.charAt(r)).join(''));
const grids = {
  fishTest12: [buildGrid('fishTest12', 3, 4), 60, 2026, 12, 120], fishTest16: [buildGrid('fishTest16', 4, 4), 32, 2026, 8, 60],
  jigsawLayout: [regionBoard('jigsawLayout', JIGSAW_LAYOUT), 120, 4242, 40], jigsawLayoutTurned: [regionBoard('jigsawLayoutTurned', turned), 120, 4242, 40]
};
Object.keys(grids).forEach((k) => {
  const [model, n, seed, slice, limit] = grids[k];
  console.log(k + ' seed ' + seed + ': ' + JSON.stringify(count(model, n, seed, slice, limit)));
});
const setups = [
  ['classic9', 150, 777, 150], ['classic9', 150, 99, 150], ['classic6', 400, 777, 400], ['classic4', 300, 777, 300],
  ['classic9', 150, 777, 150, 1], ['classic9', 150, 777, 150, 25], ['classic9', 150, 777, 150, 300],
  ['classic9', 150, 99, 150, 1], ['classic9', 150, 99, 150, 25], ['classic9', 150, 99, 150, 300],
  ['classic6', 400, 777, 400, 1], ['classic6', 400, 777, 400, 10], ['classic6', 400, 777, 400, 60],
  ['diagonalX', 120, 4242, 40], ['hyper', 120, 4242, 40], ['jigsaw9', 120, 4242, 20],
  ['samurai', 12, 4242, 8, 40], ['sohei', 12, 4242, 8, 40], ['butterfly', 12, 4242, 8, 40], ['flower', 12, 4242, 8, 40]
];
setups.forEach(([variant, n, seed, slice, limit]) => {
  if (!SG.testkit.hasVariant(variant)) { console.log(variant + ' not available'); return; }
  const r = count(H.model(variant), n, seed, slice, limit);
  console.log(variant + ' seed ' + seed + ': ' + JSON.stringify(r));
});
