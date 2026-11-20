'use strict';
// Scratch (MS07b): firings of the soundness populations of tech-chain.test.js for the four ids.
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const F = SG.fixtures.classic;
function pruned(m, solution, rng, placedShare, keepShare) {
  const state = SG.model.initState(m);
  for (let c = 0; c < m.cellCount; c++) if (rng.next() < placedShare) SG.constraints.assign(m, state, c, solution[c]);
  for (let c = 0; c < m.cellCount; c++) {
    if (state.value[c] !== 0) continue;
    let keep = 1 << (solution[c] - 1);
    for (let v = 1; v <= m.digits; v++) if (v !== solution[c] && rng.next() < keepShare) keep |= 1 << (v - 1);
    state.candidates[c] &= keep;
  }
  return state;
}
function prunedStates(m, rng, count, keepShare) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const r = rng.fork('pruned.' + i);
    const solution = SG.testkit.randomSolution(m, r.fork('grid'));
    const state = pruned(m, solution, r.fork('state'), 0.15 * r.next(), keepShare(r));
    out.push({ state, solution, givens: solution, kind: 'pruned' });
  }
  return out;
}
const lower = SG.techniques.list().filter((t) => t.group !== 'chain' && t.variantScope === null).map((t) => t.id);
function stats(id, states, maxSteps) {
  const t0 = Date.now();
  const s = { fired: 0, ms: 0 };
  try {
    const out = H.assertSound({ fail: (m) => { throw new Error(m); } }, id, { model: m9, states, maxSteps: maxSteps || 40 });
    s.fired = out.firings; s.elims = out.eliminations;
  } catch (e) { s.err = String(e.message).slice(0, 300); }
  s.ms = Date.now() - t0;
  return s;
}
const A = prunedStates(m9, SG.testkit.rng.create(31), 150, (r) => 0.05 + 0.4 * r.next());
const B = prunedStates(m9, SG.testkit.rng.create(32), 80, (r) => 0.05 + 0.3 * r.next());
console.log('pruned31 forcingChain', JSON.stringify(stats('forcingChain', A)));
console.log('pruned31 forcingChainLong', JSON.stringify(stats('forcingChainLong', A)));
console.log('pruned31 nishio', JSON.stringify(stats('nishio', A)));
console.log('pruned32 nishio', JSON.stringify(stats('nishio', B)));
console.log('pruned32 nishioDeep', JSON.stringify(stats('nishioDeep', B)));
const EVIL = ['escargot', 'worlds-hardest-2012', 'hard-platinum', 'hard-nugget', 'hard-b', 'hard-c'];
const before = lower.concat(['forcingChain', 'forcingChainLong', 'nishio']);
const D = EVIL.map((name) => {
  const fx = F.unique.filter((p) => p.name === name)[0];
  return { state: H.stateAfter(m9, fx.puzzle, before), solution: F.parse(fx.solution), givens: F.parse(fx.puzzle), kind: 'stuck' };
});
console.log('evil stuck nishioDeep', JSON.stringify(stats('nishioDeep', D)));
