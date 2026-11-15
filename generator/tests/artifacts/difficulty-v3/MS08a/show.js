'use strict';
// Scratch (MS08a): show the digit map and the Finding of a skyscraper position.
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const BELOW = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'pointing', 'boxLine', 'nakedPair', 'hiddenPair',
  'nakedTriple', 'hiddenTriple', 'nakedQuad', 'hiddenQuad', 'xWing'];
const ctx = SG.techniques.createContext(m9, { assumeUniqueness: false });
process.argv.slice(2).forEach((puzzle) => {
  const state = H.stateAfter(m9, puzzle, BELOW);
  const f = SG.techniques.get('skyscraper').find(m9, state, ctx);
  console.log(puzzle, 'unsolved', state.unsolvedCount);
  if (f === null) { console.log('  none'); return; }
  const d = f.i18nArgs.digit;
  const bit = 1 << (d - 1);
  const cells = new Set(f.cells);
  const el = new Set(f.eliminations.map((e) => e[0]));
  for (let r = 0; r < 9; r++) {
    let line = '  ';
    for (let c = 0; c < 9; c++) {
      const i = r * 9 + c;
      let ch = '.';
      if (state.value[i] !== 0) ch = state.value[i] === d ? '#' : '-';
      else if (state.candidates[i] & bit) ch = cells.has(i) ? 'O' : el.has(i) ? 'x' : 'o';
      line += ch + (c % 3 === 2 ? '  ' : ' ');
    }
    console.log(line);
  }
  console.log('  ', JSON.stringify(f));
});
