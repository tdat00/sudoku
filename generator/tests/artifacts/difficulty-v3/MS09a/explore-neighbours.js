'use strict';
// Scratch (MS09a): candidates for the negative fixtures: finnedXWing at the positions of the neighbours.
const SG = require('./load.js');
const { referenceFinned } = require('./reference.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const BELOW_XW = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'pointing', 'boxLine', 'nakedPair', 'hiddenPair',
  'nakedTriple', 'hiddenTriple', 'nakedQuad', 'hiddenQuad'];
const BELOW_ER = BELOW_XW.concat(['xWing', 'skyscraper', 'twoStringKite', 'simpleColouring']);
const THROUGH_ER = BELOW_ER.concat(['emptyRectangle']);
const THROUGH_FIN = THROUGH_ER.concat(['finnedXWing']);
const ctx = SG.techniques.createContext(m9, { assumeUniqueness: false });
const cases = {
  X_WING_at_beforeXWing: ['9.2.....8......1..41.85..39.....8.....3.....78..6.45.2...29..1..5...........614..', BELOW_XW],
  X_WING_at_belowER: ['9.2.....8......1..41.85..39.....8.....3.....78..6.45.2...29..1..5...........614..', BELOW_ER],
  COLOURING_through_fin: ['....154........2..1.62..7...52..8.....79.23......54..8..3....9.5......6.7.......2', THROUGH_FIN],
  COLOURING_through_ER: ['....154........2..1.62..7...52..8.....79.23......54..8..3....9.5......6.7.......2', THROUGH_ER],
  ER_GENERAL_belowER: ['48..1....5....7.....125..9....7.84.....9..5.6.7........12....47......86.894....3.', BELOW_ER],
  KITE_ONLY_belowKite: ['........6.1.672..4....39871..2....4.......1..34..61.28....8.53.93.......6........', BELOW_XW.concat(['xWing', 'skyscraper'])],
  SKY_ONLY_belowSky: ['......6..8.21.....3.7..8..9.314.6..........5...47..163..6..........12.7.4..8..5.2', BELOW_XW.concat(['xWing'])]
};
Object.keys(cases).forEach((key) => {
  const state = H.stateAfter(m9, cases[key][0], cases[key][1]);
  const f = SG.techniques.get('finnedXWing').find(m9, state, ctx);
  const ref = referenceFinned(SG, m9, state, 2).filter((p) => p.targets.length > 0);
  const ordinary = SG.techniques.get('xWing').find(m9, state, ctx);
  console.log(key, 'left', state.unsolvedCount, 'finned', f === null ? null : JSON.stringify(f.i18nArgs), 'ref', ref.length,
    'xWing', ordinary === null ? null : ordinary.i18nArgs.baseUnits.join('/'));
});
