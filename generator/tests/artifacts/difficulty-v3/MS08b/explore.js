'use strict';
// Scratch (MS08b): where is twoStringKite the first technique reached on real unique puzzles? Position = the stuck
// position of the solver when it may only use the techniques before it in the registry (through skyscraper).
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const BELOW = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'pointing', 'boxLine', 'nakedPair', 'hiddenPair',
  'nakedTriple', 'hiddenTriple', 'nakedQuad', 'hiddenQuad', 'xWing', 'skyscraper'];
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
  try { state = H.stateAfter(m9, puzzle, BELOW); } catch (e) { return; }
  if (state.unsolvedCount === 0) return;
  const f = SG.techniques.get('twoStringKite').find(m9, state, ctx);
  if (f === null) return;
  hits++;
  const solved = SG.dfs.countSolutions(m9, H.parsePuzzle(m9, puzzle), 2);
  console.log(JSON.stringify({ name, puzzle, unique: solved === 1, left: state.unsolvedCount, digit: f.i18nArgs.digit,
    lines: f.i18nArgs.lines, bridge: f.i18nArgs.bridge, ends: f.i18nArgs.ends,
    el: f.eliminations.map((e) => H.label(m9, e[0])) }));
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
