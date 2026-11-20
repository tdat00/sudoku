'use strict';
// Scratch (MS15b): the 12 LONG_CHAIN_PUZZLES of tech-chain.test.js under the ladder with and without alsXz: does alsXz fire on their way
// to the stuck position (C = 6 cutoff as the suite uses), is the puzzle solved, and what is the shortest grouped chain left.
const SG = require('./load.js');
const H = SG.techHelper;
const model9 = H.model('classic9');
const PUZZLES = [
  '..7..1..6.8....1..5..6.78.3..65..7.......8..2.9..6....459........2...5......1..9.',
  '7...38..6..........532.4....94......1.......23...9.8.5....51.........3.7..29..56.',
  '.6.4....2..1..7..93..5...8...........52....971...2.84.23.....56..61.9............',
  '.754.3...9.....1.....5....7.8..6....6.3.78..1..........3.......5.48...6.1....7.53',
  '7...8..3.13....4...2....198............9..67...74.8..15....6...91..5..8..4..2....',
  '7..9..34..98.....151.....6.1.....8.....7...54..54.2.......9.....2..56...6..82....',
  '..1......7..4.......4231..5.......6.6..87.21...3.4..592.6...9......1.......5.9..6',
  '.6..57....5.3....44.......7..1.3.....7...51.39.....8...83.9.......2...95..2...7..',
  '....5.4.7.1..3...57..1..3.....5..8..9..2.8.....6.91.........96..31..7....2.....7.',
  '..82....1.24.....7....5..3.4....5..37..48....186.9.......561..........1.2..7..6.9',
  '3.4....7.2..76...1....3.2...5..2.....6.8.9...8....1..2..7......1..3...84.4..1.5..',
  '..41..98.5..4.........9..7.....1...9..7..52..49...2..8...2.3.1.........261....5..'
];
function idsBefore(id) {
  const below = [];
  SG.techniques.list().forEach((t) => { if (t.variantScope === null && SG.techniques.get(id).order > t.order) below.push(t.id); });
  return below;
}
const withAls = idsBefore('forcingChainLong');
const without = withAls.filter((id) => id !== 'alsXz');
const before = SG.chainSearch.SHORT_MAX;
SG.chainSearch.SHORT_MAX = 6;
PUZZLES.forEach((text, i) => {
  const givens = H.parsePuzzle(model9, text);
  const a = SG.logicalSolver.solve(model9, givens, { allowedTechniques: withAls, collectSteps: true });
  const b = SG.logicalSolver.solve(model9, givens, { allowedTechniques: without, collectSteps: true });
  const alsSteps = a.steps.filter((s) => s.technique === 'alsXz').length;
  const sa = H.stateAfter(model9, text, withAls);
  const sb = H.stateAfter(model9, text, without);
  const same = JSON.stringify([Array.from(sa.candidates), Array.from(sa.value)]) === JSON.stringify([Array.from(sb.candidates), Array.from(sb.value)]);
  const chain = (state) => {
    const f = SG.techniques.get('forcingChainLong').find(model9, state, SG.techniques.createContext(model9, {}));
    return f === null ? null : f.i18nArgs.length;
  };
  console.log('#' + i + ' alsXz steps on the way ' + alsSteps + ' status with/without ' + a.status + '/' + b.status + ' stuck positions equal ' + same +
    ' open ' + sa.unsolvedCount + '/' + sb.unsolvedCount + ' longChain ' + chain(sa) + '/' + chain(sb));
});
SG.chainSearch.SHORT_MAX = before;
