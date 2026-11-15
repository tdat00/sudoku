'use strict';
// Scratch (MS09b): where is finnedSwordfish the first technique reached on real unique puzzles? Position = the stuck
// position of the solver when it may only use the techniques before it in the registry (through swordfish).
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS09b/explore-n3.js [count] [seeds] [dug count]
const SG = require('./load.js');
const { referenceFinned } = require('./reference.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const BELOW = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'pointing', 'boxLine', 'nakedPair', 'hiddenPair',
  'nakedTriple', 'hiddenTriple', 'nakedQuad', 'hiddenQuad', 'xWing', 'skyscraper', 'twoStringKite', 'simpleColouring',
  'emptyRectangle', 'finnedXWing', 'swordfish'];
const ctx = SG.techniques.createContext(m9, { assumeUniqueness: false });
const seen = new Set();
let total = 0;
let hits = 0;
let disagree = 0;

function row(name, text) {
  const puzzle = text.replace(/0/g, '.');
  if (seen.has(puzzle)) return;
  seen.add(puzzle);
  total++;
  let state;
  try { state = H.stateAfter(m9, puzzle, BELOW); } catch (e) { return; }
  if (state.unsolvedCount === 0) return;
  const f = SG.techniques.get('finnedSwordfish').find(m9, state, ctx);
  if (f === null) return;
  const ref = referenceFinned(SG, m9, state, 3).filter((p) => p.targets.length > 0);
  if (ref.length === 0) { disagree++; console.log('DISAGREE', name); return; }
  hits++;
  const first = ref[0];
  const solved = SG.dfs.countSolutions(m9, H.parsePuzzle(m9, puzzle), 2);
  console.log(JSON.stringify({ name, puzzle, unique: solved === 1, left: state.unsolvedCount, digit: f.i18nArgs.digit,
    kind: first.kind, bases: f.i18nArgs.bases, covers: f.i18nArgs.covers, fins: f.i18nArgs.fins, body: first.body,
    el: f.eliminations.map((e) => H.label(m9, e[0])), patterns: ref.length }));
}

SG.fixtures.classic.unique.forEach((fx) => row(fx.name, fx.puzzle));
SG.fixtures.rated.entries.forEach((fx) => row('rated:' + fx.name, fx.puzzle));
const count = Number(process.argv[2] || 300);
const seeds = (process.argv[3] || '20260101,99,777').split(',').map(Number);
seeds.forEach((seed) => {
  const items = H.randomStatesWithKnownSolution(m9, SG.testkit.rng.create(seed), count);
  items.forEach((it, i) => { if (it.kind === 'initial') row('rand' + seed + '#' + i, H.puzzleString(m9, it.givens)); });
});
console.error('puzzles ' + total + ' hits ' + hits + ' disagreements ' + disagree);
