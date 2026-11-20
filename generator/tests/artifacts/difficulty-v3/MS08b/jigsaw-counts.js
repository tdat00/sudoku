'use strict';
// Scratch (MS08b fix round): the Jigsaw populations of the new kite tests. For the registry's jigsaw9 board and its
// transpose (rows and columns swapped, the regions turned with them) over 120 random states of seed 4242: how many
// states hold a kite, the soundness statistics of H.assertSound, and the largest work of one call (observer record).
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS08b/jigsaw-counts.js
const SG = require('./load.js');
const H = SG.techHelper;

function turnedBoard(model) {
  const D = model.digits;
  const n = model.cellCount;
  const turn = (c) => (c % D) * D + Math.floor(c / D);
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
  let k = 0;
  model.unitMeta.forEach((meta, u) => {
    if (meta.kind !== 'region') return;
    const cells = Array.from(model.units[u]).map(turn).sort((a, b) => a - b);
    cells.forEach((c) => { cellRegion[c] = k; });
    units.push(cells);
    unitMeta.push({ kind: 'region', gridIndex: 0, label: meta.label });
    k++;
  });
  return SG.model.create({ variantId: model.variantId + 'Turned', digits: D, cellCount: n, units, unitMeta,
    layout: { rows: D, cols: D, cellRow, cellCol, cellRegion } });
}

const board = H.model('jigsaw9');
[board, turnedBoard(board)].forEach((model) => {
  const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(4242), 120);
  const records = [];
  const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) });
  const tech = SG.techniques.get('twoStringKite');
  let hits = 0;
  items.forEach((it) => { if (tech.find(model, it.state, ctx) !== null) hits++; });
  const stats = H.assertSound(SG.test, 'twoStringKite', { model, states: items, minFirings: 1 });
  const maxWork = records.reduce((m, r) => Math.max(m, r.work), 0);
  const capped = records.filter((r) => r.capHit !== null).length;
  console.log(model.variantId + ': 120 states, ' + hits + ' with a kite; assertSound ' + JSON.stringify({ states: stats.states,
    firings: stats.firings, eliminations: stats.eliminations }) + '; calls ' + records.length + ', largest work ' + maxWork +
    ' of 50000, capped ' + capped);
});
