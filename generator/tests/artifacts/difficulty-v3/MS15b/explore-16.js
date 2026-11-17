'use strict';
// Scratch (MS15b): 16-digit seeded positions with the suite's helper (placed share at most 0.28), to pick a population with a firing
// and at most 600 records.
const SG = require('./load.js');
const M = SG.fixtures.models;
const m16 = M.samurai();

function seeded(model, seed, count, keepRange, placedMax) {
  const rng = SG.testkit.rng.create(seed);
  const out = [];
  for (let i = 0; i < count; i++) {
    const solution = SG.testkit.randomSolution(model, rng.fork('grid' + i));
    const pick = rng.fork('pick' + i);
    const placedShare = 0.03 + placedMax * pick.next();
    const keep = keepRange[0] + (keepRange[1] - keepRange[0]) * pick.next();
    const state = SG.model.initState(model);
    for (let c = 0; c < model.cellCount; c++) if (pick.next() < placedShare) SG.constraints.assign(model, state, c, solution[c]);
    for (let c = 0; c < model.cellCount; c++) {
      if (state.value[c] !== 0) continue;
      for (let v = 1; v <= model.digits; v++) {
        if (v !== solution[c] && (state.candidates[c] & (1 << (v - 1))) !== 0 && pick.next() >= keep) SG.constraints.eliminate(model, state, c, v);
      }
    }
    out.push(state);
  }
  return out;
}
function describeState(model, state) {
  const ctx = SG.techniques.createContext(model, {});
  const e = SG.alsPatterns.enumerate(model, state, ctx, SG.alsPatterns.createWork(1e9), { records: 1e7 });
  const seen = [];
  const f = SG.alsPatterns.findXz(model, state, SG.techniques.createContext(model, { onPatternWork: (r) => seen.push(r) }),
    { workLimit: 1e9, limits: { records: 1e7 } });
  return { n: e.records.length, found: f !== null, work: seen[0].work };
}
[[0.3, 0.6], [0.4, 0.7], [0.5, 0.8], [0.6, 0.9], [0.7, 0.95]].forEach(([a, b]) => [7, 8, 9].forEach((seed) => {
  const rows = seeded(m16, seed, 4, [a, b], 0.25).map((s) => describeState(m16, s));
  console.log('16 keep ' + a + '-' + b + ' seed ' + seed + ': n ' + rows.map((r) => r.n).join('/') + ' firing ' +
    rows.map((r) => (r.found ? 1 : 0)).join(''));
}));
