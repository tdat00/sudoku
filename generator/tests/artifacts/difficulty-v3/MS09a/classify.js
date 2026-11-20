'use strict';
// Scratch (MS09a): classify the real hits of explore-new.js: number of fins, sashimi or not, orientation, and whether the
// independent enumeration agrees with the finder on the first removing pattern.
const SG = require('./load.js');
const { referenceFinned } = require('./reference.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const BELOW = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'pointing', 'boxLine', 'nakedPair', 'hiddenPair',
  'nakedTriple', 'hiddenTriple', 'nakedQuad', 'hiddenQuad', 'xWing', 'skyscraper', 'twoStringKite', 'simpleColouring',
  'emptyRectangle'];
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
  const f = SG.techniques.get('finnedXWing').find(m9, state, ctx);
  const ref = referenceFinned(SG, m9, state, 2).filter((p) => p.targets.length > 0);
  if ((f === null) !== (ref.length === 0)) { disagree++; console.log('DISAGREE', name); }
  if (f === null) return;
  hits++;
  const first = ref[0];
  const sameEl = JSON.stringify(f.eliminations) === JSON.stringify(first.targets.map((c) => [c, first.digit]));
  const solved = SG.dfs.countSolutions(m9, H.parsePuzzle(m9, puzzle), 2);
  console.log(JSON.stringify({ name, unique: solved === 1, digit: f.i18nArgs.digit, kind: first.kind, bases: f.i18nArgs.bases,
    covers: f.i18nArgs.covers, fins: f.i18nArgs.fins, body: first.body, sashimi: first.body.some((b) => b < 2), sameEl,
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
