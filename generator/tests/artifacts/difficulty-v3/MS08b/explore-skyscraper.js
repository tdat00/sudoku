'use strict';
// Scratch (MS08b): real positions through xWing where a skyscraper exists but no kite (the neighbour's boundary).
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const THROUGH_XWING = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'pointing', 'boxLine', 'nakedPair',
  'hiddenPair', 'nakedTriple', 'hiddenTriple', 'nakedQuad', 'hiddenQuad', 'xWing'];
const ctx = SG.techniques.createContext(m9, { assumeUniqueness: false });
const seen = new Set();
let total = 0;
let hits = 0;

function row(name, text) {
  const puzzle = text.replace(/0/g, '.');
  if (seen.has(puzzle)) return;
  seen.add(puzzle);
  total++;
  let state;
  try { state = H.stateAfter(m9, puzzle, THROUGH_XWING); } catch (e) { return; }
  if (state.unsolvedCount === 0) return;
  const sky = SG.techniques.get('skyscraper').find(m9, state, ctx);
  const kite = SG.techniques.get('twoStringKite').find(m9, state, ctx);
  if (sky === null || kite !== null) return;
  hits++;
  const unique = SG.dfs.countSolutions(m9, H.parsePuzzle(m9, puzzle), 2) === 1;
  console.log(JSON.stringify({ name, puzzle, unique, left: state.unsolvedCount, digit: sky.i18nArgs.digit,
    lines: sky.i18nArgs.lines, ends: sky.i18nArgs.ends, el: sky.eliminations.map((e) => H.label(m9, e[0])) }));
}

SG.fixtures.classic.unique.forEach((fx) => row(fx.name, fx.puzzle));
SG.fixtures.rated.entries.forEach((fx) => row('rated:' + fx.name, fx.puzzle));
const count = Number(process.argv[2] || 300);
const seeds = (process.argv[3] || '20260101,99,777').split(',').map(Number);
seeds.forEach((seed) => {
  const items = H.randomStatesWithKnownSolution(m9, SG.testkit.rng.create(seed), count);
  items.forEach((it, i) => { if (it.kind === 'initial') row('rand' + seed + '#' + i, H.puzzleString(m9, it.givens)); });
});
console.error('puzzles ' + total + ' hits ' + hits);
