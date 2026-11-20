'use strict';
// Scratch (MS08c): candidates for the boundary negative of the emptyRectangle fixtures: a real position before
// simpleColouring (through twoStringKite) where simpleColouring finds a deduction and emptyRectangle nothing, and the
// same for the kite (position before twoStringKite).
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const THROUGH_SKY = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'pointing', 'boxLine', 'nakedPair',
  'hiddenPair', 'nakedTriple', 'hiddenTriple', 'nakedQuad', 'hiddenQuad', 'xWing', 'skyscraper'];
const THROUGH_KITE = THROUGH_SKY.concat(['twoStringKite']);
const ctx = SG.techniques.createContext(m9, { assumeUniqueness: false });
const find = (id, state) => SG.techniques.get(id).find(m9, state, ctx);

const F = SG.fixtures.techniques;
const puzzles = [];
['simpleColouring', 'xWing', 'swordfish'].forEach((id) => {
  F.historyV2.byId[id].positive.forEach((fx) => puzzles.push([id + ':' + fx.name, fx.puzzle]));
});
SG.fixtures.classic.unique.forEach((fx) => puzzles.push(['classic:' + fx.name, fx.puzzle]));
puzzles.forEach(([name, puzzle]) => {
  const k = H.stateAfter(m9, puzzle, THROUGH_KITE);
  const c = find('simpleColouring', k);
  const e = find('emptyRectangle', k);
  const s = H.stateAfter(m9, puzzle, THROUGH_SKY);
  const kk = find('twoStringKite', s);
  const ee = find('emptyRectangle', s);
  if ((c && !e) || (kk && !ee)) {
    console.log(name, puzzle, 'colouring@kite=' + !!c, 'ER@kite=' + !!e, 'kite@sky=' + !!kk, 'ER@sky=' + !!ee);
  }
});
