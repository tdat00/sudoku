'use strict';
// Scratch (MS09a): the exact Findings of the fixture positions, with cell indexes.
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const ids = SG.fixtures.techniques.registryOrder;
const BELOW_FIN = ids.slice(0, ids.indexOf('finnedXWing'));
const BELOW_XW = ids.slice(0, ids.indexOf('xWing'));
const BELOW_KITE = ids.slice(0, ids.indexOf('twoStringKite'));
const cases = [
  ['FIN_RATED', '.19.7....7....85..6..5.....1.59....8.84...96.9....32.5.....7..9..76....4....5.78.', BELOW_FIN],
  ['FIN_SASHIMI', '76.....8.........4.....32...5....8.6...1..97...15.....4...8.69.82..9.4.....7.....', BELOW_FIN],
  ['FIN_SPARE', '....41.9...29...5.........87.5..9.4.....7...693...4....4.8.........25.17..6.....9', BELOW_FIN],
  ['ER_RATED', '..3....9.5..6..1...97.8...2....74..67..9.8..18..16....3...1.56...6..3..9.1....8..', BELOW_FIN],
  ['FIN_ORDINARY (before xWing)', '.....3.......89172.......3.4....7...81....75..6.9....4..2.31....83.9..61.7.4.....', BELOW_XW],
  ['KITE_ONLY (before kite)', '........6.1.672..4....39871..2....4.......1..34..61.28....8.53.93.......6........', BELOW_KITE]
];
cases.forEach(([name, puzzle, after]) => {
  const state = H.stateAfter(m9, puzzle, after);
  const ctx = SG.techniques.createContext(m9, {});
  const f = SG.techniques.get('finnedXWing').find(m9, state, ctx);
  const x = SG.techniques.get('xWing').find(m9, state, ctx);
  console.log(name, JSON.stringify(f), 'xWing:', x === null ? null : x.i18nArgs.baseUnits.join('/'),
    'unique', SG.dfs.countSolutions(m9, H.parsePuzzle(m9, puzzle), 2));
  if (f) console.log('   elim', JSON.stringify(f.eliminations), f.eliminations.map((e) => H.label(m9, e[0]) + '-' + e[1]).join(' '),
    'cells', f.cells.map((c) => H.label(m9, c)).join(' '));
});
