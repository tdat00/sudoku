'use strict';
// Scratch (MS12, adapted from MS11c's): how often xyChain fires in the sweep of techniques.test.js (the chain group: the 120
// random states of the shared corpus, seed 20260101, then the supplements) and in the other populations of the suite, to
// report the random firings apart from the supplemental ones.
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const F = SG.fixtures.techniques;
const random = H.randomStatesWithKnownSolution(m9, SG.testkit.rng.create(20260101), 120);
const sweep = H.assertSound(SG.test, 'xyChain', { model: m9, count: 120, minFirings: 0, states: random });
console.log('sweep, 120 random states of classic9 (seed 20260101): ' + JSON.stringify(sweep));
const supplements = (F.supplements.xyChain || []).map((fx) => {
  const state = H.stateAfter(m9, fx.puzzle, fx.after);
  return { state, solution: SG.dfs.solve(m9, H.parsePuzzle(m9, fx.puzzle)), givens: H.parsePuzzle(m9, fx.puzzle), kind: 'supplement' };
});
const supp = H.assertSound(SG.test, 'xyChain', { model: m9, minFirings: 0, states: supplements });
console.log('the ' + supplements.length + ' supplements alone: ' + JSON.stringify(supp));
const random300 = H.randomStatesWithKnownSolution(m9, SG.testkit.rng.create(20260101), 300);
console.log('300 random states (seed 20260101): ' + JSON.stringify(H.assertSound(SG.test, 'xyChain', { model: m9, minFirings: 0, states: random300 })));
