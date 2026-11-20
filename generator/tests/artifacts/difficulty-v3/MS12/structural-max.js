'use strict';
// Scratch (MS12): the structural bound of the work of one xyChain call on every registered variant, against the limit of
// 50000 (an upper bound of the rule, not an observation of real states, which work-census.js records). A unit is one edge
// expansion of the restricted graph. A search from one start literal visits every literal once: a false literal of a
// bivalue cell has one strong edge, a true literal one weak edge to every peer cell that holds its digit, so a start costs at
// most 2n (strong) + 2n x P (weak), P the largest number of peers of a cell, n the cells (every cell bivalue, which no real
// position is); there are at most 2n starts: bound = 2n x 2n x (P + 1) = 4 n^2 (P + 1). The window of 12 edges and the
// shrinking limit after the first proof only lower it. Also measured, with the registered finder: two constructed positions of
// each board that are the worst a proofless graph can be: the twin of a grid (the digits a and b swapped: every cell of a or b
// holds {a, b}, no deduction exists) and the cells of one digit pair everywhere ({1,2} in every cell, where a proof is found at
// once).
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS12/structural-max.js
const SG = require('./load.js');
const H = SG.techHelper;
const bit = (d) => 1 << (d - 1);

function measure(model, state) {
  const records = [];
  const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) });
  const t0 = process.hrtime.bigint();
  const f = SG.techniques.get('xyChain').find(model, state, ctx);
  return { found: f !== null, length: f === null ? null : f.i18nArgs.length, work: records[0].work,
    capHit: records[0].capHit, ms: Number((Number(process.hrtime.bigint() - t0) / 1e6).toFixed(3)) };
}

function twin(model) {
  const solution = Array.from(SG.dfs.solve(model, new Int32Array(model.cellCount)));
  const state = SG.model.initState(model);
  for (let c = 0; c < model.cellCount; c++) {
    const s = solution[c];
    state.candidates[c] = s === 1 ? bit(1) | bit(2) : s === 2 ? bit(1) | bit(2) : bit(s);
  }
  return state;
}

function allPairs(model) {
  const state = SG.model.initState(model);
  for (let c = 0; c < model.cellCount; c++) state.candidates[c] = bit(1) | bit(2);
  return state;
}

const rows = [];
SG.variants.list().forEach((def) => { if (SG.testkit.hasVariant(def.id)) rows.push([def.id, H.model(def.id)]); });
rows.push(['boxGrid 12 digits (3 x 4)', SG.fixtures.models.boxGrid('census-12', 3, 4)]);
rows.push(['boxGrid 16 digits (4 x 4)', SG.fixtures.models.boxGrid('census-16', 4, 4)]);
['classic4', 'classic6'].forEach((id) => rows.push([id, H.model(id)]));
rows.forEach(([id, model]) => {
  let peers = 0;
  for (let c = 0; c < model.cellCount; c++) peers = Math.max(peers, model.peers[c].length);
  const bound = 4 * model.cellCount * model.cellCount * (peers + 1);
  const row = { id, digits: model.digits, cells: model.cellCount, units: model.units.length, largestPeerSet: peers,
    structuralBound: bound, limit: 50000, boundExceedsLimit: bound > 50000,
    note: model.cages.length > 0 || model.inequalities.length > 0
      ? 'cages or inequalities: weak edges still use the peers (cage cells are peers), strong edges only bivalue cells'
      : undefined };
  try {
    row.twinOfAGrid = measure(model, twin(model));
  } catch (err) {
    row.twinOfAGrid = 'not built: ' + err.message;
  }
  row.everyCellOneDigitPair = measure(model, allPairs(model));
  console.log(JSON.stringify(row));
});
