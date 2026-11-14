'use strict';
// Scratch (MS07b): how often do the four chain IDs fire in the soundness sweep population of techniques.test.js
// (120 random classic9 states, seed 20260101), and with which chain length / nishio depth.
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const ids = ['forcingChain', 'forcingChainLong', 'nishio', 'nishioDeep'];
const count = Number(process.argv[2] || 120);
const states = H.randomStatesWithKnownSolution(m9, SG.testkit.rng.create(20260101), count);
const ctx = SG.techniques.createContext(m9, { assumeUniqueness: true });
const out = {};
ids.forEach((id) => {
  const tech = SG.techniques.get(id);
  let firings = 0;
  const lens = {};
  const t0 = Date.now();
  states.forEach((item) => {
    const state = SG.model.cloneState(item.state);
    for (let step = 0; step < 40 && state.unsolvedCount > 0; step++) {
      const f = tech.find(m9, state, ctx);
      if (f === null) return;
      firings++;
      const key = f.i18nArgs.length !== undefined ? 'len' + f.i18nArgs.length : 'depth' + f.i18nArgs.depth;
      lens[key] = (lens[key] || 0) + 1;
      f.placements.forEach((p) => SG.constraints.assign(m9, state, p[0], p[1]));
      f.eliminations.forEach((e) => SG.constraints.eliminate(m9, state, e[0], e[1]));
      SG.constraints.propagate(m9, state);
    }
  });
  out[id] = { firings, lens, ms: Date.now() - t0 };
});
console.log(JSON.stringify(out));
