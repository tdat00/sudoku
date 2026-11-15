'use strict';
// Scratch (MS08b): real positions where a near miss would be UNSOUND. Position = the stuck position of the solver
// when it may use every technique through twoStringKite. A row pair and a column pair that share one cell s (three
// distinct cells only) are no kite: the cell T that sees both free ends would lose the digit under a rule that
// ignored the sharing, and in some real positions T is the solution cell.
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const THROUGH = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'pointing', 'boxLine', 'nakedPair',
  'hiddenPair', 'nakedTriple', 'hiddenTriple', 'nakedQuad', 'hiddenQuad', 'xWing', 'skyscraper', 'twoStringKite'];
const rows = []; const cols = [];
m9.unitMeta.forEach((m, u) => { if (m.kind === 'row') rows.push(u); else if (m.kind === 'col') cols.push(u); });
const peers = m9.peers.map((p) => new Set(p));
const seen = new Set();
let total = 0;
let hits = 0;

function pairOf(state, u, d) {
  const bit = 1 << (d - 1);
  let placed = false;
  const open = [];
  m9.units[u].forEach((c) => {
    if (state.value[c] === d) placed = true;
    else if (state.value[c] === 0 && (state.candidates[c] & bit) !== 0) open.push(c);
  });
  return placed || open.length !== 2 ? null : open;
}

function row(name, text) {
  const puzzle = text.replace(/0/g, '.');
  if (seen.has(puzzle)) return;
  seen.add(puzzle);
  total++;
  let state;
  try { state = H.stateAfter(m9, puzzle, THROUGH); } catch (e) { return; }
  if (state.unsolvedCount === 0) return;
  const solution = SG.dfs.solve(m9, H.parsePuzzle(m9, puzzle));
  for (let d = 1; d <= 9; d++) {
    const bit = 1 << (d - 1);
    for (const ru of rows) {
      const rp = pairOf(state, ru, d);
      if (rp === null) continue;
      for (const cu of cols) {
        const cp = pairOf(state, cu, d);
        if (cp === null) continue;
        const shared = rp.filter((c) => cp.indexOf(c) !== -1);
        if (shared.length !== 1) continue;
        const s = shared[0];
        const a1 = rp.find((c) => c !== s);
        const b1 = cp.find((c) => c !== s);
        for (let t = 0; t < m9.cellCount; t++) {
          if (t === s || t === a1 || t === b1) continue;
          if (state.value[t] !== 0 || (state.candidates[t] & bit) === 0) continue;
          if (!peers[a1].has(t) || !peers[b1].has(t)) continue;
          if (solution[t] === d) {
            hits++;
            console.log(JSON.stringify({ name, puzzle, digit: d, row: m9.unitMeta[ru].label, col: m9.unitMeta[cu].label,
              shared: H.label(m9, s), a1: H.label(m9, a1), b1: H.label(m9, b1), target: H.label(m9, t),
              left: state.unsolvedCount }));
          }
        }
      }
    }
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
console.error('puzzles ' + total + ' hits ' + hits);
