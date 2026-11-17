'use strict';
// MS13c scratch (from MS10b's long-chain-check.js): for the given indices of the seeded stream 161 (fork 'minimal.<i>'), the
// puzzle, whether its stuck position (every technique below forcingChainLong, C = 6) has a proof of 7 or 8 links in the
// grouped graph, and the smallest maxChainLength with which the solver (the lower techniques and both grouped forcing ids, no
// nishio) solves it. Usage (from generator/): node tests/artifacts/difficulty-v3/MS13c/long-chain-check.js <index> [<index>...]
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const CS = SG.chainSearch;
const lower = SG.techniques.list().filter((t) => t.group !== 'chain' && t.variantScope === null).map((t) => t.id);
const below = SG.techniques.list().filter((t) => t.variantScope === null &&
  SG.techniques.get('forcingChainLong').order > t.order).map((t) => t.id);
const ids = lower.concat(['forcingChain', 'forcingChainLong']);
const rng = SG.testkit.rng.create(161);
process.argv.slice(2).forEach((arg) => {
  const i = Number(arg);
  const r = rng.fork('minimal.' + i);
  const solution = SG.testkit.randomSolution(m9, r.fork('grid'));
  const dug = SG.testkit.dig(m9, solution, r.fork('dig'), { symmetry: 'none', minClues: 0 });
  const puzzle = H.puzzleString(m9, dug.givens);
  const before = CS.SHORT_MAX;
  CS.SHORT_MAX = 6;
  let state;
  try { state = H.stateAfter(m9, puzzle, below); } finally { CS.SHORT_MAX = before; }
  const records = [];
  const seam = state.unsolvedCount === 0 ? null : CS.groupedForcing(m9, state,
    SG.techniques.createContext(m9, { onPatternWork: (rec) => records.push(rec) }), { id: 'x', minLength: 1, maxLength: 12 });
  const solves = [];
  for (let limit = 1; limit <= 12; limit++) {
    const report = SG.logicalSolver.solve(m9, H.parsePuzzle(m9, puzzle),
      { allowedTechniques: ids, collectSteps: true, maxChainLength: limit });
    solves.push(report.solved ? 1 : 0);
  }
  const need = solves.indexOf(1) + 1;
  console.log('#' + i + ' shortest at the stuck position: ' + (seam === null ? 'none/solved' : seam.i18nArgs.length) +
    (records[0] && records[0].grouped.stop ? ' (' + records[0].grouped.stop + ')' : '') + '; the solver needs a limit of ' +
    (need === 0 ? '> 12' : need));
});
