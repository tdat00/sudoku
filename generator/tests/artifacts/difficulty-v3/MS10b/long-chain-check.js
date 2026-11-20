'use strict';
// Scratch (MS10b): the 12 puzzles of LONG_CHAIN_PUZZLES of core/tests/suites/tech-chain.test.js under the registered ladder
// (wxyzWing included). For each: the stuck position (every technique below the chains, C = 6), whether it is stuck at all,
// the length of the shortest chain there (the seam with no window and no work limit), and the result of the solver with the
// lower techniques and both chain ids (no nishio) for every limit 1..12 ("the first limit that solves" is the length that the
// puzzle needs). Usage (from generator/): node tests/artifacts/difficulty-v3/MS10b/long-chain-check.js [without]
//   "without": the same with wxyzWing unregistered (the ladder of MS10a), to compare.
const SG = require('./load.js');
const H = SG.techHelper;
const model9 = H.model('classic9');
const CS = SG.chainSearch;
const text = require('fs').readFileSync(require('path').join(__dirname, '..', '..', '..', '..', '..', 'core', 'tests', 'suites', 'tech-chain.test.js'), 'utf8');
const block = /var LONG_CHAIN_PUZZLES = \[([\s\S]*?)\];/.exec(text)[1];
const puzzles = [];
const fromArgs = process.argv[2] === 'texts';
block.split('\n').forEach((line) => {
  if (fromArgs) return;
  const m = /'([.0-9]{81})',?\s*(?:\/\/\s*#(\d+): (\d) links)?/.exec(line);
  if (m) puzzles.push({ text: m[1], index: m[2], links: m[3] });
});
if (fromArgs) process.argv.slice(3).forEach((t) => puzzles.push({ text: t.split(':')[1], index: t.split(':')[0], links: '?' }));
const without = process.argv[2] === 'without';
const def = SG.techniques.get('wxyzWing');
const weight = SG.difficulty.WEIGHTS.wxyzWing;
if (without) {
  SG.techniques.unregister('wxyzWing');
  delete SG.difficulty.WEIGHTS.wxyzWing;
}
const lowerIds = () => SG.techniques.list().filter((t) => t.group !== 'chain' && t.variantScope === null).map((t) => t.id);
const idsBefore = (id) => SG.techniques.list().filter((t) => t.variantScope === null && SG.techniques.get(id).order > t.order)
  .map((t) => t.id);
const below = idsBefore('forcingChainLong');
const ids = lowerIds().concat(['forcingChain', 'forcingChainLong']);
console.log((without ? 'WITHOUT' : 'WITH') + ' wxyzWing: ' + puzzles.length + ' puzzles');
puzzles.forEach((p, i) => {
  const before = CS.SHORT_MAX;
  CS.SHORT_MAX = 6;
  let state;
  try { state = H.stateAfter(model9, p.text, below); } finally { CS.SHORT_MAX = before; }
  const ctx = SG.techniques.createContext(model9, {});
  const seam = CS.forcing(model9, state, ctx, { id: 'x', minLength: 1, maxLength: 12, workLimit: null });
  const solves = [];
  for (let limit = 1; limit <= 12; limit++) {
    const report = SG.logicalSolver.solve(model9, H.parsePuzzle(model9, p.text),
      { allowedTechniques: ids, collectSteps: true, maxChainLength: limit });
    solves.push(report.solved ? 1 : 0);
  }
  const need = solves.indexOf(1) + 1;
  console.log('#' + i + ' (#' + p.index + ' said ' + p.links + ' links): shortest chain at the stuck position ' +
    (seam === null ? 'none (no chain up to 12)' : seam.i18nArgs.length) + '; the solver needs a limit of ' + (need === 0 ? '> 12' : need));
});
if (without) {
  SG.techniques.register(def);
  SG.difficulty.WEIGHTS.wxyzWing = weight;
}
