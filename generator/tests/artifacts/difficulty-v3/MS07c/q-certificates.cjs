'use strict';

// MS07c scratch: the family certificates of the constructed puzzles at the selected cutoff C (read-only): solved with
// the set that solves it, stuck with the set that does not, and the same for the three Nightmare ones with the four chain ids.
const SG = globalThis.SG;
const H = SG.techHelper;
const D = SG.difficulty;
const m9 = H.model('classic9');
const sets = SG.fixtures.rated.techniqueSets;
console.log('C =', SG.chainSearch.SHORT_MAX, 'sets.chains =', sets.chains.filter((id) => SG.techniques.get(id).group === 'chain').join(','));
SG.fixtures.rated.constructed.forEach((e) => {
  const givens = H.parsePuzzle(m9, e.puzzle);
  const run = (set) => SG.logicalSolver.solve(m9, givens, { allowedTechniques: set, collectSteps: false,
    assumeUniqueness: false }).solved;
  const okSolve = run(e.solvableWith);
  const okStuck = e.notSolvableWith === null ? null : !run(e.notSolvableWith);
  const flag = okSolve && okStuck !== false ? '  ' : '* ';
  let extra = '';
  if (e.label === 'nightmare') {
    const four = sets.chains.concat(['forcingChainLong', 'nishioDeep']);
    extra = ' with the four chain ids ' + run(four) + ', with chains + forcingChainLong ' +
      run(sets.chains.concat(['forcingChainLong']));
  }
  console.log(flag + e.name + ' solvableWith ' + okSolve + ' notSolvableWith(stuck) ' + okStuck + extra);
});
