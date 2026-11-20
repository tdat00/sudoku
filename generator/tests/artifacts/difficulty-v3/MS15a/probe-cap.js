'use strict';
// Scratch (MS15a): looks for a seeded position that reaches the default record limit (4096) within the default work limit.
const SG = require('./load.js');
const A = SG.alsPatterns;
const model = SG.fixtures.models.boxGrid('probe-16', 4, 4);
const ctx = SG.techniques.createContext(model, {});

function positionOf(seed, lo, hi) {
  const rng = SG.testkit.rng.create(seed);
  const state = SG.model.initState(model);
  for (let c = 0; c < model.cellCount; c++) {
    const size = lo + rng.int(hi - lo + 1);
    let mask = 0;
    while (SG.bits.popcount(mask) < size) mask |= 1 << rng.int(model.digits);
    state.candidates[c] = mask;
  }
  return state;
}

[[2, 2], [2, 3], [3, 3], [2, 4], [3, 4], [3, 5], [4, 4], [4, 5]].forEach(([lo, hi]) => {
  [1, 2, 3].forEach((seed) => {
    const state = positionOf(seed, lo, hi);
    const work = A.createWork(10000000);
    const t0 = Date.now();
    const out = A.enumerate(model, state, ctx, work, { records: 1000000 });
    const bySize = [0, 0, 0, 0, 0];
    out.records.forEach((r) => bySize[r.cells.length]++);
    console.log('cands ' + lo + '-' + hi + ' seed ' + seed + ': records ' + out.records.length + ' by size ' + bySize.slice(1).join('/') +
      ' complete ' + out.complete + ' work ' + work.used + ' ' + (Date.now() - t0) + ' ms');
  });
});
