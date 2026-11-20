'use strict';
// Scratch (MS08c): the data of the emptyRectangle fixtures (Findings of the chosen real puzzles at the position where
// emptyRectangle is reached) and a search for real negatives: positions where the general rectangle (a candidate at the
// intersection allowed) would remove a candidate that the registered, restricted technique does not.
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const BELOW_ER = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'pointing', 'boxLine', 'nakedPair',
  'hiddenPair', 'nakedTriple', 'hiddenTriple', 'nakedQuad', 'hiddenQuad', 'xWing', 'skyscraper', 'twoStringKite',
  'simpleColouring'];
const THROUGH_ER = BELOW_ER.concat(['emptyRectangle']);
const ctx = SG.techniques.createContext(m9, { assumeUniqueness: false });
const er = SG.techniques.get('emptyRectangle');

const chosen = {
  ER_RATED: '..3....9.5..6..1...97.8...2....74..67..9.8..18..16....3...1.56...6..3..9.1....8..',
  ER_SEEDED: '..92......1......8.7..9.24..8.....53....386..5.....1.......2...1.2..583.8....4..1'
};

function show(name, puzzle) {
  const state = H.stateAfter(m9, puzzle, BELOW_ER);
  const f = er.find(m9, state, ctx);
  const unique = SG.dfs.countSolutions(m9, H.parsePuzzle(m9, puzzle), 2);
  console.log(name, 'unique=' + unique, 'left=' + state.unsolvedCount);
  if (f === null) { console.log('  no finding'); return; }
  console.log('  cells', f.cells.map((c) => H.label(m9, c)).join(' '));
  console.log('  elim', f.eliminations.map((e) => H.label(m9, e[0]) + '-' + e[1]).join(' '), 'raw', JSON.stringify(f.eliminations));
  console.log('  args', JSON.stringify(f.i18nArgs));
  const after = H.stateAfter(m9, puzzle, THROUGH_ER);
  console.log('  after through ER: left=' + after.unsolvedCount + ' finding=' + (er.find(m9, after, ctx) !== null));
}
Object.keys(chosen).forEach((k) => show(k, chosen[k]));
(process.argv[2] || '').split(',').filter(Boolean).forEach((p, i) => show('arg' + i, p));
