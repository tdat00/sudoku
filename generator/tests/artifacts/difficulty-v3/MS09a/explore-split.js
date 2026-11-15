'use strict';
// Scratch (MS09a): real positions (stuck after the techniques through emptyRectangle) where the finder says nothing but
// the same enumeration without the one-box rule for the fins removes something (a split-box finned fish: true, not claimed).
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
let shown = 0;

function row(name, text) {
  const puzzle = text.replace(/0/g, '.');
  if (seen.has(puzzle)) return;
  seen.add(puzzle);
  total++;
  let state;
  try { state = H.stateAfter(m9, puzzle, BELOW); } catch (e) { return; }
  if (state.unsolvedCount === 0) return;
  if (SG.techniques.get('finnedXWing').find(m9, state, ctx) !== null) return;
  const split = referenceFinned(SG, m9, state, 2, { noBox: true }).filter((p) => p.targets.length > 0);
  if (split.length === 0) return;
  const p = split[0];
  const solved = SG.dfs.countSolutions(m9, H.parsePuzzle(m9, puzzle), 2);
  shown++;
  if (shown <= 12) {
    console.log(JSON.stringify({ name, puzzle, unique: solved === 1, digit: p.digit, kind: p.kind,
      bases: p.bases.map((u) => m9.unitMeta[u].label), covers: p.covers.map((u) => m9.unitMeta[u].label),
      fins: p.fins.map((c) => H.label(m9, c)), el: p.targets.map((c) => H.label(m9, c)), n: split.length }));
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
console.error('puzzles ' + total + ' split-box positions ' + shown);
