'use strict';
// Scratch (MS08c): real positions (stuck through simpleColouring) where the GENERAL empty rectangle (the intersection of
// the two arm lines holds a candidate) removes a candidate, and the registered restricted technique finds nothing.
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const BELOW_ER = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'pointing', 'boxLine', 'nakedPair',
  'hiddenPair', 'nakedTriple', 'hiddenTriple', 'nakedQuad', 'hiddenQuad', 'xWing', 'skyscraper', 'twoStringKite',
  'simpleColouring'];
const ctx = SG.techniques.createContext(m9, { assumeUniqueness: false });
const er = SG.techniques.get('emptyRectangle');
const peers = m9.peers.map((l) => new Set(l));

function general(state) {
  const out = [];
  const cand = state.candidates;
  const val = state.value;
  for (let d = 1; d <= 9; d++) {
    const bit = 1 << (d - 1);
    const open = (cells) => Array.from(cells).filter((c) => val[c] === 0 && (cand[c] & bit) !== 0);
    const pairs = [];
    m9.units.forEach((cells, u) => {
      if (cells.some((c) => val[c] === d)) return;
      const two = open(cells);
      if (two.length === 2) pairs.push(two);
    });
    m9.units.forEach((cells, u) => {
      if (m9.unitMeta[u].kind !== 'box' || cells.some((c) => val[c] === d)) return;
      const S = open(cells);
      if (S.length < 3) return;
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          const inter = r * 9 + c;
          const inRow = (s) => Math.floor(s / 9) === r;
          const inCol = (s) => s % 9 === c;
          if (!S.every((s) => inRow(s) || inCol(s))) continue;
          if (!S.includes(inter)) continue;
          const A = S.filter(inRow);
          const B = S.filter((s) => inCol(s) && !inRow(s));
          if (B.length === 0) continue;
          pairs.forEach((pair) => {
            if (pair.some((x) => S.includes(x))) return;
            [0, 1].forEach((role) => {
              const p = pair[role];
              const q = pair[1 - role];
              if (!A.every((a) => peers[p].has(a))) return;
              for (let t = 0; t < 81; t++) {
                if (S.includes(t) || t === p || t === q) continue;
                if (val[t] === 0 && (cand[t] & bit) !== 0 && peers[q].has(t) && B.every((b) => peers[b].has(t))) {
                  out.push({ d, box: u, r, c, p, q, t, S });
                }
              }
            });
          });
        }
      }
    });
  }
  return out;
}

const seen = new Set();
let total = 0;
function row(name, text) {
  const puzzle = text.replace(/0/g, '.');
  if (seen.has(puzzle)) return;
  seen.add(puzzle);
  total++;
  let state;
  try { state = H.stateAfter(m9, puzzle, BELOW_ER); } catch (e) { return; }
  if (state.unsolvedCount === 0) return;
  if (er.find(m9, state, ctx) !== null) return;
  const g = general(state);
  if (g.length === 0) return;
  const unique = SG.dfs.countSolutions(m9, H.parsePuzzle(m9, puzzle), 2);
  const x = g[0];
  console.log(JSON.stringify({ name, puzzle, unique, left: state.unsolvedCount, n: g.length, d: x.d,
    box: H.label(m9, m9.units[x.box][0]) + '..', inter: H.label(m9, x.r * 9 + x.c), S: x.S.map((s) => H.label(m9, s)),
    p: H.label(m9, x.p), q: H.label(m9, x.q), t: H.label(m9, x.t) }));
}
SG.fixtures.classic.unique.forEach((fx) => row(fx.name, fx.puzzle));
SG.fixtures.rated.entries.forEach((fx) => row('rated:' + fx.name, fx.puzzle));
const count = Number(process.argv[2] || 300);
(process.argv[3] || '20260101,99,777').split(',').map(Number).forEach((seed) => {
  H.randomStatesWithKnownSolution(m9, SG.testkit.rng.create(seed), count).forEach((it, i) => {
    if (it.kind === 'initial') row('rand' + seed + '#' + i, H.puzzleString(m9, it.givens));
  });
});
console.error('puzzles ' + total);
