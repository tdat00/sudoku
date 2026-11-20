'use strict';
// Scratch (MS10b): fixture data. Candidate real puzzles (the dug corpus of H.randomStatesWithKnownSolution(classic9, seed
// 4242), unique by construction, named by their index) and what wxyzWing finds at their position after every technique below
// it in the registry (through xyzWing): the quartet with its masks, the holders of z, the eliminations, the work. Also the
// negative candidates: positions before nakedQuad where nakedQuad finds something and wxyzWing nothing, and the number of
// open cells at the position through wxyzWing.
//   node tests/artifacts/difficulty-v3/MS10b/fixture-data.js [index,index,...]
const SG = require('./load.js');
const H = SG.techHelper;
const model = H.model('classic9');
const F = SG.fixtures.techniques;
const wanted = (process.argv[2] || '2,30,38,48,54,70,84,96,105,106,114,120,128,138,140,146,154,161,180,187,188,214,216,229,232')
  .split(',').map(Number);
const order = F.registryOrder;
const below = order.slice(0, order.indexOf('wxyzWing'));
const through = below.concat(['wxyzWing']);
const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(4242), (Math.max.apply(null, wanted) + 1) * 4);
const find = (id, state) => SG.techniques.get(id).find(model, state, SG.techniques.createContext(model, { assumeUniqueness: true }));
const masks = (state, cells) => cells.map((c) => H.label(model, c) + '{' + SG.bits.toArray(state.candidates[c]).join('') + '}').join(' ');
wanted.forEach((index) => {
  const givens = items[index * 4].givens;
  const p = H.puzzleString(model, givens);
  const unique = SG.dfs.countSolutions(model, givens, 2) === 1;
  const state = H.stateAfter(model, p, below);
  const f = find('wxyzWing', state);
  if (f === null) { console.log('#' + index + ' no wxyzWing at the position below it'); return; }
  const z = f.i18nArgs.digit;
  const holders = f.cells.filter((c) => (state.candidates[c] & (1 << (z - 1))) !== 0);
  const reduced = SG.model.cloneState(state);
  f.eliminations.forEach((e) => SG.constraints.eliminate(model, reduced, e[0], e[1]));
  const done = SG.dfs.searchFrom(model, reduced, { limit: 2 });
  const solution = SG.dfs.solve(model, givens);
  const sound = f.eliminations.every((e) => solution[e[0]] !== e[1]);
  const thr = H.stateAfter(model, p, through);
  console.log('#' + index + ' ' + p + ' unique=' + unique + ' open=' + state.unsolvedCount + ' | ' + masks(state, f.cells) +
    ' | z=' + z + ' holders=' + holders.length + ' | elim ' + f.eliminations.map((e) => H.label(model, e[0]) + '-' + e[1]).join(' ') +
    ' | sound=' + sound + ' reducedSolutions=' + done.found + ' | through: open=' + thr.unsolvedCount);
});
// negatives: before nakedQuad, nakedQuad finds, wxyzWing finds nothing
const beforeQuad = order.slice(0, order.indexOf('nakedQuad'));
let shown = 0;
for (let i = 0; i < items.length && shown < 6; i += 4) {
  const givens = items[i].givens;
  const p = H.puzzleString(model, givens);
  const state = H.stateAfter(model, p, beforeQuad);
  if (find('nakedQuad', state) !== null && find('wxyzWing', state) === null) {
    shown++;
    console.log('negative candidate (nakedQuad finds, wxyzWing nothing) #' + (i / 4) + ' ' + p + ' open=' + state.unsolvedCount);
  }
}
