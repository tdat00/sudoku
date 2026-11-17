'use strict';
// Scratch (MS15b): record counts and firing of seeded positions on the other board shapes, to size the agreement populations.
const SG = require('./load.js');
const H = SG.techHelper;
const M = SG.fixtures.models;
const J = SG.fixtures.jigsawModels;

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
  const w = SG.alsPatterns.createWork(1e9);
  const e = SG.alsPatterns.enumerate(model, state, ctx, w, { records: 1e7 });
  const seen = [];
  const f = SG.alsPatterns.findXz(model, state, SG.techniques.createContext(model, { onPatternWork: (r) => seen.push(r) }),
    { workLimit: 1e9, limits: { records: 1e7 } });
  return { n: e.records.length, found: f !== null, work: seen[0].work };
}
function show(name, model, seed, count, range, placed) {
  const rows = seeded(model, seed, count, range, placed).map((s) => describeState(model, s));
  console.log(name + ' keep ' + range + ' placed<=' + (0.03 + placed).toFixed(2) + ': n ' + rows.map((r) => r.n).join('/') + ' work ' +
    rows.map((r) => r.work).join('/') + ' firing ' + rows.filter((r) => r.found).length + '/' + rows.length);
}
const names = Object.keys(J).filter((k) => J[k] && J[k].units);
console.log('jigsaw keys: ' + Object.keys(J).join(','));
const samurai = M.samurai();
[[0.5, 0.8, 0.6], [0.6, 0.9, 0.6], [0.7, 0.95, 0.6]].forEach(([a, b, p]) => show('samurai', samurai, 4, 2, [a, b], p));
const m16 = M.boxGrid('d16', 4, 4);
[[0.5, 0.8, 0.8], [0.4, 0.7, 0.8], [0.6, 0.9, 0.8]].forEach(([a, b, p]) => show('16', m16, 7, 4, [a, b], p));
names.slice(0, 3).forEach((k) => [[0.3, 0.6, 0.28], [0.5, 0.8, 0.28]].forEach(([a, b, p]) => show('jigsaw ' + k, J[k], 9, 3, [a, b], p)));
