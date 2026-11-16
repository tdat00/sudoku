'use strict';
// Scratch (MS11b): fixture data. Candidate real puzzles (the dug corpus of H.randomStatesWithKnownSolution(classic9, seed
// 4242), unique by construction, named by their index) and what uniqueRectangle finds at their position after every
// technique below it in the registry (through wWing): the subtype, the cells with their masks, the eliminations, the work,
// the soundness against the unique solution and whether the reduced position still has the same single solution. Also the
// negative candidates: positions before wWing where wWing finds something and uniqueRectangle nothing.
//   node tests/artifacts/difficulty-v3/MS11b/fixture-data.js [index,index,...]
const SG = require('./load.js');
const H = SG.techHelper;
const model = H.model('classic9');
const F = SG.fixtures.techniques;
const wanted = (process.argv[2] || '637,596,310,2140,156,1230,2360,2954,254,286')
  .split(',').map(Number);
const order = F.registryOrder;
const below = order.slice(0, order.indexOf('uniqueRectangle'));
const through = below.concat(['uniqueRectangle']);
const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(4242), (Math.max.apply(null, wanted) + 1) * 4);
const find = (id, state, extra) => {
  const records = [];
  const ctx = SG.techniques.createContext(model, Object.assign({ assumeUniqueness: true, onPatternWork: (r) => records.push(r) }, extra));
  return { f: SG.techniques.get(id).find(model, state, ctx), record: records[0] };
};
const masks = (state, cells) => cells.map((c) => H.label(model, c) + '{' + SG.bits.toArray(state.candidates[c]).join('') + '}').join(' ');
console.log('below UR (' + below.length + '): ' + below.join(' '));
wanted.forEach((index) => {
  const givens = items[index * 4].givens;
  const p = H.puzzleString(model, givens);
  const unique = SG.dfs.countSolutions(model, givens, 2) === 1;
  const state = H.stateAfter(model, p, below);
  const out = find('uniqueRectangle', state);
  const f = out.f;
  if (f === null) { console.log('#' + index + ' no uniqueRectangle at the position below it'); return; }
  const reduced = SG.model.cloneState(state);
  f.eliminations.forEach((e) => SG.constraints.eliminate(model, reduced, e[0], e[1]));
  const done = SG.dfs.searchFrom(model, reduced, { limit: 2 });
  const solution = SG.dfs.solve(model, givens);
  const sound = f.eliminations.every((e) => solution[e[0]] !== e[1]);
  const thr = H.stateAfter(model, p, through);
  console.log('#' + index + ' ' + p + ' unique=' + unique + ' open=' + state.unsolvedCount + ' | ' + f.i18nKey + ' | ' +
    masks(state, f.cells) + ' | args ' + JSON.stringify(f.i18nArgs) + ' | elim ' +
    f.eliminations.map((e) => H.label(model, e[0]) + '-' + e[1] + '(' + e[0] + ')').join(' ') + ' | cells ' + JSON.stringify(f.cells) +
    ' | sound=' + sound + ' reducedSolutions=' + done.found + ' | work ' + out.record.work + ' | through: open=' + thr.unsolvedCount);
});
// negatives: before wWing (the position through wxyzWing), wWing finds something and uniqueRectangle nothing
const beforeW = below.slice(0, below.indexOf('wWing'));
let shown = 0;
for (let i = 0; i < items.length && shown < 5; i += 4) {
  const givens = items[i].givens;
  const p = H.puzzleString(model, givens);
  const state = H.stateAfter(model, p, beforeW);
  if (find('wWing', state).f !== null && find('uniqueRectangle', state).f === null) {
    shown++;
    console.log('negative candidate (wWing finds, uniqueRectangle nothing) #' + (i / 4) + ' ' + p + ' open=' + state.unsolvedCount);
  }
}
