'use strict';
// Scratch (MS10a): fixture data. For the candidate puzzles: unique solution, the first propagated position and the
// position through remotePairs; whether remotePairs and nakedPair find anything there.
const SG = require('./load.js');
const H = SG.techHelper;
const model = H.model('classic9');
const F = SG.fixtures.techniques;
const ctx = () => SG.techniques.createContext(model, { assumeUniqueness: true });
const find = (id, state) => SG.techniques.get(id).find(model, state, ctx());
const beforeNaked = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'pointing', 'boxLine'];
const through = F.registryOrder.slice(0, F.registryOrder.indexOf('remotePairs') + 1);
const cands = {
  rp1: '..5..9..2.8.....4.4..8..76.327..8.9....9..81.......6......1....1.25.....95.3.....',
  rp2: '..5.6..2.24...1....134.9......5..3....127..6.....1.5..4....8..1......8..9....5...',
  sup1: '....149....6.2.75....8......4.7.....3............8..6.2....3.18.9.2..4...7.....3.',
  sup2: '......4.9.76.9.......84.7....2......3...69..4....1568..8.5..1..6.9......1....8...',
  sup3: '..8....1.3...12..5..5...874...48...3.9.1..5..4.6.7.....8...7.2.1........7.3......',
  HARD_B: '..53.....8......2..7..1.5..4....53...1..7...6..32...8..6.5....9..4....3......97..',
  COLOURING: '....154........2..1.62..7...52..8.....79.23......54..8..3....9.5......6.7.......2',
  V2_PUZZLE_1: '2.6...8.......357...59....1...2..41..5..8.3..1...4...6.2..157...8..........7...6.'
};
Object.keys(cands).forEach((name) => {
  const p = cands[name];
  const givens = H.parsePuzzle(model, p);
  const unique = SG.dfs.countSolutions(model, givens, 2) === 1;
  const first = H.makeState(model, p);
  const f = find('remotePairs', first);
  const thr = H.stateAfter(model, p, through);
  const fThr = find('remotePairs', thr);
  const nk = H.stateAfter(model, p, beforeNaked);
  console.log(name + ' unique ' + unique + ' | first position remotePairs ' + (f ? JSON.stringify([f.cells, f.eliminations, f.i18nArgs]) : null) +
    ' | through remotePairs finds ' + (fThr ? 'SOMETHING' : 'nothing') + ' (open ' + thr.unsolvedCount + ') | before nakedPair: remotePairs ' +
    (find('remotePairs', nk) ? 'finds' : 'nothing') + ', nakedPair ' + (find('nakedPair', nk) ? 'finds' : 'nothing'));
});
