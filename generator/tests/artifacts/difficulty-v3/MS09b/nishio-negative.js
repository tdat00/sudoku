'use strict';
// Scratch (MS09b): the nishioDeep negative of the fixtures ("leaves the depth 1 refutation to nishio") lost its premise
// on ESCARGOT once finnedSwordfish is in the position list. Which known puzzles still have it: after every technique
// through forcingChainLong nishio finds a depth 1 refutation and nishioDeep finds nothing?
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS09b/nishio-negative.js
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const F = SG.fixtures.techniques;
const THROUGH_LONG = F.registryOrder.slice(0, F.registryOrder.indexOf('forcingChainLong') + 1);
const OLD_THROUGH_LONG = THROUGH_LONG.filter((id) => id !== 'finnedSwordfish');
const puzzles = {
  ESCARGOT: '1....7.9..3..2...8..96..5....53..9...1..8...26....4...3......1..4......7..7...3..',
  V2_PUZZLE_1: '2.6...8.......357...59....1...2..41..5..8.3..1...4...6.2..157...8..........7...6.',
  V2_PUZZLE_2: '.6125...3..5.......9...81.....8...469....672.....3..8..7.3......5....6..6.....234',
  HARD_B: '..53.....8......2..7..1.5..4....53...1..7...6..32...8..6.5....9..4....3......97..',
  PLATINUM: '.......12........3..23..4....18....5.6..7.8.......9.....85.....9...4.5..47...6...',
  WORLDS_HARDEST: '8..........36......7..9.2...5...7.......457.....1...3...1....68..85...1..9....4..',
  NUGGET: '.......39.....1..5..3.5.8....8.9...6.7...2...1..4.......9.8..5..2....6..4..7.....',
  DUG_24: '..7..1..6.8....1..5..6.78.3..65..7.......8..2.9..6....459........2...5......1..9.',
  DUG_379: '......4..4..8...15.5...7....8...19....23.8.......64.7........8614.........9.2...3',
  DUG_155: '...284.....51..83.....53....9.........8.....6.6..351.437.....6....4.2..88.......7'
};
Object.keys(puzzles).forEach((name) => {
  [['now', THROUGH_LONG], ['before finnedSwordfish', OLD_THROUGH_LONG]].forEach(([label, list]) => {
    const state = H.stateAfter(m9, puzzles[name], list);
    const ctx = SG.techniques.createContext(m9, {});
    const n = SG.techniques.get('nishio').find(m9, state, ctx);
    const d = SG.techniques.get('nishioDeep').find(m9, state, ctx);
    console.log(name + ' (' + label + '): left ' + state.unsolvedCount + ', nishio ' + (n === null ? 'null' : 'depth ' + n.i18nArgs.depth + ' ' +
      n.i18nArgs.label + '-' + n.i18nArgs.digit) + ', nishioDeep ' + (d === null ? 'null' : 'depth ' + d.i18nArgs.depth));
  });
});
