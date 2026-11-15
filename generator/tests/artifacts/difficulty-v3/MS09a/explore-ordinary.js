'use strict';
// Scratch (MS09a): real positions before xWing (stuck after the techniques below it) where an ordinary X-Wing fires and
// the finned X-Wing finds nothing: the boundary of the technique with its neighbour (an ordinary fish is not relabelled).
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const BELOW_XW = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'pointing', 'boxLine', 'nakedPair', 'hiddenPair',
  'nakedTriple', 'hiddenTriple', 'nakedQuad', 'hiddenQuad'];
const ctx = SG.techniques.createContext(m9, { assumeUniqueness: false });
const seen = new Set();
let total = 0;
let shown = 0;

function row(name, text) {
  const puzzle = text.replace(/0/g, '.');
  if (seen.has(puzzle)) return;
  seen.add(puzzle);
  total++;
  let state;
  try { state = H.stateAfter(m9, puzzle, BELOW_XW); } catch (e) { return; }
  if (state.unsolvedCount === 0) return;
  const x = SG.techniques.get('xWing').find(m9, state, ctx);
  if (x === null) return;
  const f = SG.techniques.get('finnedXWing').find(m9, state, ctx);
  if (f !== null) return;
  shown++;
  if (shown <= 10) {
    const solved = SG.dfs.countSolutions(m9, H.parsePuzzle(m9, puzzle), 2);
    console.log(JSON.stringify({ name, puzzle, unique: solved === 1, digit: x.i18nArgs.digit, base: x.i18nArgs.baseUnits,
      cover: x.i18nArgs.coverUnits, left: state.unsolvedCount }));
  }
}

SG.fixtures.classic.unique.forEach((fx) => row(fx.name, fx.puzzle));
SG.fixtures.rated.entries.forEach((fx) => row('rated:' + fx.name, fx.puzzle));
const count = Number(process.argv[2] || 300);
const seeds = (process.argv[3] || '20260101,99,777').split(',').map(Number);
seeds.forEach((seed) => {
  const items = H.randomStatesWithKnownSolution(m9, SG.testkit.rng.create(seed), count);
  items.forEach((it, i) => { if (it.kind === 'initial') row('rand' + seed + '#' + i, H.puzzleString(m9, it.givens)); });
});
console.error('puzzles ' + total + ' ordinary X-Wing without a finned one: ' + shown);
