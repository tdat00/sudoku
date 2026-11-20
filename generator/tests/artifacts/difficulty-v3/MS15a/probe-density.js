'use strict';
// Scratch (MS15a): record counts of seeded positions at several candidate densities, to pick the densities of the suite.
const SG = require('./load.js');
const A = SG.alsPatterns;
const M = SG.fixtures.models;

function seeded(model, seed, count, keepRange) {
  const rng = SG.testkit.rng.create(seed);
  const out = [];
  for (let i = 0; i < count; i++) {
    const solution = SG.testkit.randomSolution(model, rng.fork('grid' + i));
    const pick = rng.fork('pick' + i);
    const placedShare = 0.03 + 0.25 * pick.next();
    const keep = keepRange[0] + (keepRange[1] - keepRange[0]) * pick.next();
    const state = SG.model.initState(model);
    for (let c = 0; c < model.cellCount; c++) if (pick.next() < placedShare) SG.constraints.assign(model, state, c, solution[c]);
    for (let c = 0; c < model.cellCount; c++) {
      if (state.value[c] !== 0) continue;
      for (let v = 1; v <= model.digits; v++) {
        if (v !== solution[c] && (state.candidates[c] & (1 << (v - 1))) !== 0 && pick.next() >= keep) SG.constraints.eliminate(model, state, c, v);
      }
    }
    out.push({ state, keep: keep.toFixed(2), placed: placedShare.toFixed(2) });
  }
  return out;
}

const boards = [['classic9', SG.techHelper.model('classic9'), [[0.05, 0.4]]], ['12', M.boxGrid('d12', 3, 4), [[0.03, 0.25], [0.1, 0.3], [0.15, 0.4], [0.2, 0.5]]],
  ['16', M.boxGrid('d16', 4, 4), [[0.02, 0.15], [0.1, 0.3], [0.15, 0.4], [0.2, 0.5], [0.3, 0.6]]], ['samurai', M.samurai(), [[0.05, 0.35]]]];
boards.forEach(([name, model, ranges]) => ranges.forEach((range) => {
  const ctx = SG.techniques.createContext(model, {});
  const items = seeded(model, 1504, 3, range);
  items.forEach((item, i) => {
    const work = A.createWork(1e9);
    const t0 = Date.now();
    const out = A.enumerate(model, item.state, ctx, work, { records: 1e7 });
    console.log(name + ' keep ' + range + ' #' + i + ' (keep ' + item.keep + ', placed ' + item.placed + '): records ' + out.records.length +
      ' work ' + work.used + ' ' + (Date.now() - t0) + ' ms');
  });
}));
