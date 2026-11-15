'use strict';
// Scratch (MS09b): the exact Findings of the finnedSwordfish fixture positions, with cell indexes.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS09b/fixture-data.js
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const ids = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'pointing', 'boxLine', 'nakedPair', 'hiddenPair',
  'nakedTriple', 'hiddenTriple', 'nakedQuad', 'hiddenQuad', 'xWing', 'skyscraper', 'twoStringKite', 'simpleColouring',
  'emptyRectangle', 'finnedXWing', 'swordfish', 'finnedSwordfish'];
const BELOW_FSF = ids.slice(0, ids.indexOf('finnedSwordfish'));
const THROUGH_FSF = ids.slice();
const THROUGH_FIN = ids.slice(0, ids.indexOf('swordfish'));
const THROUGH_ER = ids.slice(0, ids.indexOf('finnedXWing'));
const cases = [
  ['FSF_RATED (ER_RATED)', '..3....9.5..6..1...97.8...2....74..67..9.8..18..16....3...1.56...6..3..9.1....8..', BELOW_FSF],
  ['FSF_SPARSE (rand4242#512)', '.3.....2..7.4....8..853.7....715......5...2......9..17...62...5...8.1..416.......', BELOW_FSF],
  ['FSF_SPARE (rand99#160)', '.6.8..2....36...8.9....3.4.5.278........6.59.7.......2.3.5......57.1.6.....3.7...', BELOW_FSF],
  ['COLOURING through finnedSwordfish', '....154........2..1.62..7...52..8.....79.23......54..8..3....9.5......6.7.......2', THROUGH_FSF],
  ['FSF_ORDINARY (rand777#416) through finnedXWing', '32.7.......6219..5..9.8..........1.6......87.8...5..3..7.8.5...5.896.....3.......', THROUGH_FIN],
  ['FIN_SPARE (rand20260101#16) through emptyRectangle', '....41.9...29...5.........87.5..9.4.....7...693...4....4.8.........25.17..6.....9', THROUGH_ER]
];
cases.forEach(([name, puzzle, after]) => {
  const state = H.stateAfter(m9, puzzle, after);
  const ctx = SG.techniques.createContext(m9, {});
  const f = SG.techniques.get('finnedSwordfish').find(m9, state, ctx);
  const s = SG.techniques.get('swordfish').find(m9, state, ctx);
  const x = SG.techniques.get('finnedXWing').find(m9, state, ctx);
  console.log(name, 'unique', SG.dfs.countSolutions(m9, H.parsePuzzle(m9, puzzle), 2), 'left', state.unsolvedCount);
  console.log('   finnedSwordfish', f === null ? null : JSON.stringify({ args: f.i18nArgs, elim: f.eliminations,
    labels: f.eliminations.map((e) => H.label(m9, e[0]) + '-' + e[1]).join(' '), cells: f.cells.map((c) => H.label(m9, c)).join(' ') }));
  console.log('   swordfish', s === null ? null : s.i18nArgs.baseUnits.join('/') + ' on ' + s.i18nArgs.coverUnits.join('/'),
    'finnedXWing', x === null ? null : x.i18nArgs.bases.join('/') + ' fins ' + x.i18nArgs.fins.join(','));
});
