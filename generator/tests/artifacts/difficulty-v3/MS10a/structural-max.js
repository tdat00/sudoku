'use strict';
// Scratch (MS10a): the structural upper bound of work units per call of remotePairs on every registered variant (not an
// observation). A unit is an edge extension (a same-pair open peer found while a cell of a component is expanded, in the
// colouring walk and in the walk of the witness) or a tested pair of ends. Bounds, from the model's own units and peers:
//   colouring    every open cell is expanded at most once per call, so at most the sum of the peers of all cells (reached
//                by the flood where every cell holds one pair: an odd cycle, no pair of ends is tested);
//   pairs        only a consistent component has pairs of ends, and in it a unit holds at most two cells (three would be a
//                triangle), so a component has at most kmax = 2U / u cells (U units, u the fewest units of any cell) and
//                the tested pairs are at most k^2 / 4 per component; the components are disjoint: at most n x kmax / 4;
//   witness      one walk per call (the call ends with its Finding), at most twice the edges of its component, and a
//                consistent component has at most one edge per unit: 2U.
// The total is the sum of the three. Usage (from generator/): node tests/artifacts/difficulty-v3/MS10a/structural-max.js
const SG = require('./load.js');
const H = SG.techHelper;

const out = [];
const rows = [];
SG.variants.list().forEach((def) => {
  if (!SG.testkit.hasVariant(def.id)) {
    console.log(JSON.stringify({ id: def.id, note: 'not available' }));
    return;
  }
  rows.push([def.id, H.model(def.id)]);
});
rows.push(['boxGrid 12 digits (3 x 4)', SG.fixtures.models.boxGrid('census-12', 3, 4)]);
rows.push(['boxGrid 16 digits (4 x 4)', SG.fixtures.models.boxGrid('census-16', 4, 4)]);
['classic4', 'classic6'].forEach((id) => rows.push([id, H.model(id)]));
rows.forEach(([id, model]) => {
  const n = model.cellCount;
  const U = model.units.length;
  let peerSum = 0;
  let fewest = Infinity;
  for (let c = 0; c < n; c++) {
    peerSum += model.peers[c].length;
    fewest = Math.min(fewest, model.cellUnits[c].length);
  }
  const kmax = Math.min(n, Math.floor((2 * U) / fewest));
  const pairs = Math.floor((n * kmax) / 4);
  const walk = 2 * U;
  const row = { id, digits: model.digits, cells: n, units: U, fewestUnitsOfACell: fewest, peerSum, kmax, pairs, walk,
    maximum: peerSum + pairs + walk, limit: 50000 };
  out.push(row);
  console.log(JSON.stringify(row));
});
const big = out.reduce((a, b) => (b.maximum > a.maximum ? b : a));
console.log('largest structural maximum: ' + big.id + ' ' + big.maximum + ' units of a limit of 50000 (' +
  (100 * big.maximum / 50000).toFixed(1) + ' %)');
