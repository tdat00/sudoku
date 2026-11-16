'use strict';
// Scratch (MS11c): candidate real puzzles for the fixtures. For each puzzle: the position after every technique below
// bugPlusOne (BELOW_BUG) and through it (THROUGH_BUG), whether bugPlusOne fires there, the unsolved count, and whether
// the puzzle has exactly one solution (plain depth first search).
const SG = require('./load.js');
const H = SG.techHelper;
const model = H.model('classic9');
const below = SG.techniques.list().filter((t) => t.order < 182 && t.variantScope === null).map((t) => t.id);
const through = below.concat(['bugPlusOne']);
const find = SG.techniques.get('bugPlusOne').find;
const puzzles = {
  POS_A: '.12843...3.......2...2....7.24.7.........9..8.7...2.3.....1..6...9..64........1.9',
  POS_B: '..32.4.6.....5.8..6...93....2......74.........6.1.........4..9....31.2...12..97.3',
  SUP_A: '...8.3164.9..26......1..9..........3..8..1.2....289..781.6...5.3.....6.8..4......',
  SUP_B: '...3..4.8..9.4.1.38...9.7..1..2.....68...5.2....4....1..685.........9..4.7.6...1.',
  SUP_C: '.51.....7.9.3...6.28....3......5.6.........4....9.1.5..3..2.9.19.86........7...3.',
  UR_TYPE1: '2.....7...31...5..7.6..82..3......9....41.......7.2.....8.6..1..4...5........382.',
  UR_TYPE3: '...6.........2.7.8..8.57..9.17...4...........4....38...4.9..17..25.3....8..5.69..',
  UR_WWING: '...9....8.6.....3..7.8..4.......12.3.43.7..5.1...2.6....6.45......2..16.3.8......',
  WX_OPEN: '.4..76...8........2..9......8......1...3....4..5.2..69......6326.1..5....9...4.8.',
  WX_QUAD: '2..5..6.94..6.........2...4..78.3.2.1........62...9...5...8.4....8.1...7.6......8'
};
Object.keys(puzzles).forEach((name) => {
  const text = puzzles[name];
  const givens = H.parsePuzzle(model, text);
  const unique = SG.dfs.countSolutions(model, givens, 2);
  const b = H.stateAfter(model, text, below);
  const t = H.stateAfter(model, text, through);
  const ctx = SG.techniques.createContext(model, { assumeUniqueness: true });
  const fb = find(model, b, ctx);
  const ft = find(model, t, ctx);
  console.log(name + ' solutions ' + unique + ' | below: open ' + b.unsolvedCount + ' bugPlusOne ' +
    (fb === null ? 'none' : H.label(model, fb.placements[0][0]) + '=' + fb.placements[0][1]) + ' | through: open ' +
    t.unsolvedCount + ' bugPlusOne ' + (ft === null ? 'none' : 'FINDS'));
});
