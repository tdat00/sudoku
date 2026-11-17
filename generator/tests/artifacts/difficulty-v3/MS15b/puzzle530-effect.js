'use strict';
// Scratch (MS15b): PUZZLE_530 / PUZZLE_24 of tech-chain.test.js under the ladder with and without alsXz (C = 6 and C = 4):
// alsXz steps on the way, the stuck position, and the call of forcingChainLong (grouped record) on it.
const SG = require('./load.js');
const H = SG.techHelper;
const model9 = H.model('classic9');
const P530 = '...5.94...4...2..82.71.....7.....26...3.....7.1.6...95...........92.5..1.36......';
const P24 = '..7..1..6.8....1..5..6.78.3..65..7.......8..2.9..6....459........2...5......1..9.';
function idsBefore(id) {
  const below = [];
  SG.techniques.list().forEach((t) => { if (t.variantScope === null && SG.techniques.get(id).order > t.order) below.push(t.id); });
  return below;
}
const withAls = idsBefore('forcingChainLong');
const without = withAls.filter((id) => id !== 'alsXz');
[['P530', P530, 6], ['P24', P24, 4], ['P24', P24, 6]].forEach(([name, text, c]) => {
  const before = SG.chainSearch.SHORT_MAX;
  SG.chainSearch.SHORT_MAX = c;
  const givens = H.parsePuzzle(model9, text);
  [['with alsXz', withAls], ['without', without]].forEach(([label, ids]) => {
    const rep = SG.logicalSolver.solve(model9, givens, { allowedTechniques: ids, collectSteps: true });
    const als = rep.steps.filter((s) => s.technique === 'alsXz').length;
    const state = H.stateAfter(model9, text, ids);
    const recs = [];
    const ctx = SG.techniques.createContext(model9, { onPatternWork: (r) => recs.push(r) });
    const f = SG.techniques.get('forcingChainLong').find(model9, state, ctx);
    const r = recs[0];
    console.log(name + ' C=' + c + ' ' + label + ': status ' + rep.status + ' alsXz steps ' + als + ' open ' + state.unsolvedCount +
      ' forcingChainLong ' + (f === null ? 'null' : f.i18nArgs.length + ' links') + ' record ' + JSON.stringify({ stop: r.grouped.stop, graph: r.grouped.graph,
      minimum: r.grouped.minimum, capHit: r.capHit, work: r.work }));
  });
  SG.chainSearch.SHORT_MAX = before;
});
