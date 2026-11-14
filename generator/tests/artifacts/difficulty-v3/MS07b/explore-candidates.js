'use strict';
// Scratch (MS07b): the exact Findings of the candidate fixture positions of the four chain IDs.
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const F = SG.fixtures.classic;
const LOWER = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'pointing', 'boxLine', 'nakedPair', 'hiddenPair',
  'nakedTriple', 'hiddenTriple', 'nakedQuad', 'hiddenQuad', 'xWing', 'simpleColouring', 'swordfish', 'jellyfish',
  'xyWing', 'xyzWing', 'wWing', 'uniqueRectangle'];
const afterOf = {
  forcingChain: LOWER,
  forcingChainLong: LOWER.concat(['forcingChain']),
  nishio: LOWER.concat(['forcingChain', 'forcingChainLong']),
  nishioDeep: LOWER.concat(['forcingChain', 'forcingChainLong', 'nishio'])
};
const ctx = SG.techniques.createContext(m9, { assumeUniqueness: false });
function famous(name) { return F.unique.filter((p) => p.name === name)[0].puzzle.replace(/0/g, '.'); }
const V2_P1 = '2.6...8.......357...59....1...2..41..5..8.3..1...4...6.2..157...8..........7...6.';
const V2_P2 = '.6125...3..5.......9...81.....8...469....672.....3..8..7.3......5....6..6.....234';
const cases = [
  ['forcingChain', 'v2 p1', V2_P1], ['forcingChain', 'v2 p2', V2_P2],
  ['forcingChainLong', 'seed161 #24', '..7..1..6.8....1..5..6.78.3..65..7.......8..2.9..6....459........2...5......1..9.'],
  ['forcingChainLong', 'seed161 #379', '......4..4..8...15.5...7....8...19....23.8.......64.7........8614.........9.2...3'],
  ['forcingChainLong', 'seed161 #155', '...284.....51..83.....53....9.........8.....6.6..351.437.....6....4.2..88.......7'],
  ['forcingChainLong', 'platinum', famous('hard-platinum')],
  ['forcingChainLong', 'v2 p1', V2_P1],
  ['nishio', 'v2 p1', V2_P1], ['nishio', 'v2 p2', V2_P2],
  ['nishio', 'escargot', famous('escargot')], ['nishio', 'hard-b', famous('hard-b')],
  ['nishio', 'platinum', famous('hard-platinum')],
  ['nishioDeep', 'platinum', famous('hard-platinum')], ['nishioDeep', 'worlds-hardest-2012', famous('worlds-hardest-2012')],
  ['nishioDeep', 'hard-nugget', famous('hard-nugget')], ['nishioDeep', 'hard-c', famous('hard-c')],
  ['nishioDeep', 'escargot', famous('escargot')], ['nishioDeep', 'hard-b', famous('hard-b')]
];
// each case at its own `after`, and for the negatives at an earlier one
cases.forEach(([id, name, puzzle]) => {
  const after = afterOf[id];
  const state = H.stateAfter(m9, puzzle, after);
  const f = SG.techniques.get(id).find(m9, state, ctx);
  const unique = SG.dfs.countSolutions(m9, H.parsePuzzle(m9, puzzle), 2);
  console.log(id.padEnd(17), name.padEnd(20), 'unique', unique, 'left', state.unsolvedCount, f === null ? 'null' :
    JSON.stringify({ el: f.eliminations, pl: f.placements, len: f.i18nArgs.length, kind: f.i18nArgs.kind,
      depth: f.i18nArgs.depth }));
});
console.log('--- negatives');
[['forcingChain', 'v2 p1 through fc', V2_P1, LOWER.concat(['forcingChain'])],
  ['forcingChainLong', 'v2 p1 at LOWER (fc owns it)', V2_P1, LOWER],
  ['forcingChainLong', 'v2 p2 at LOWER (fc owns it)', V2_P2, LOWER],
  ['forcingChainLong', 'platinum at fc', famous('hard-platinum'), afterOf.forcingChainLong],
  ['forcingChainLong', 'seed161 #24 through long', '..7..1..6.8....1..5..6.78.3..65..7.......8..2.9..6....459........2...5......1..9.',
    afterOf.nishio],
  ['nishio', 'platinum at long', famous('hard-platinum'), afterOf.nishio],
  ['nishioDeep', 'escargot at long (nishio owns it)', famous('escargot'), afterOf.nishio],
  ['nishioDeep', 'hard-b at long (nishio owns it)', famous('hard-b'), afterOf.nishio],
  ['nishioDeep', 'platinum through deep', famous('hard-platinum'), afterOf.nishioDeep.concat(['nishioDeep'])]
].forEach(([id, name, puzzle, after]) => {
  const state = H.stateAfter(m9, puzzle, after);
  const f = SG.techniques.get(id).find(m9, state, ctx);
  console.log(id.padEnd(17), name.padEnd(36), 'left', state.unsolvedCount, f === null ? 'null' :
    JSON.stringify({ el: f.eliminations, len: f.i18nArgs.length, depth: f.i18nArgs.depth }));
});
