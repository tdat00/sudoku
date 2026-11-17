'use strict';
// Scratch (MS15b): which populations of positions give moderate record counts and real ALS-XZ firings (exploration
// with the engine itself; the suite's agreement tests use their own independent oracle).
const SG = require('./load.js');
const H = SG.techHelper;
const M = SG.fixtures.models;

function describeState(model, state) {
  const ctx = SG.techniques.createContext(model, {});
  const w = SG.alsPatterns.createWork(1e9);
  const e = SG.alsPatterns.enumerate(model, state, ctx, w, { records: 1e7 });
  const seen = [];
  const f = SG.alsPatterns.findXz(model, state, SG.techniques.createContext(model, { onPatternWork: (r) => seen.push(r) }),
    { workLimit: 1e9, limits: { records: 1e7 } });
  return { n: e.records.length, enumWork: w.used, found: f !== null, work: seen[0].work };
}

function summary(name, rows) {
  const ns = rows.map((r) => r.n).sort((a, b) => a - b);
  const works = rows.map((r) => r.work).sort((a, b) => a - b);
  console.log(name + ': ' + rows.length + ' positions, records min/med/max ' + ns[0] + '/' + ns[ns.length >> 1] + '/' +
    ns[ns.length - 1] + ', work med/max ' + works[works.length >> 1] + '/' + works[works.length - 1] + ', firing ' +
    rows.filter((r) => r.found).length);
}

const m9 = H.model('classic9');
['initial', 'propagated', 'pruned'].forEach((kind) => {
  const items = H.randomStatesWithKnownSolution(m9, SG.testkit.rng.create(20260101), 120).filter((it) => it.kind === kind);
  summary('classic9 sweep ' + kind, items.map((it) => describeState(m9, it.state)));
});

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

const boards = [['classic9', m9], ['classic6', H.model('classic6')], ['classic4', H.model('classic4')], ['12', M.boxGrid('d12', 3, 4)],
  ['16', M.boxGrid('d16', 4, 4)]];
boards.forEach(([name, model]) => {
  [[0.05, 0.4, 0.25], [0.3, 0.6, 0.25], [0.5, 0.8, 0.25], [0.3, 0.6, 0.6], [0.5, 0.8, 0.6]].forEach(([a, b, p]) => {
    const rows = seeded(model, 99, 6, [a, b], p).map((s) => describeState(model, s));
    summary(name + ' keep ' + a + '-' + b + ' placed<=' + (0.03 + p).toFixed(2), rows);
  });
});
