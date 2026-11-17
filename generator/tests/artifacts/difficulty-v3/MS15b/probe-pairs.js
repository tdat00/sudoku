'use strict';
// Scratch (MS15b), evidence for the work-unit question only: on the real classic 9 x 9 puzzles of the technique fixtures,
// at the position where the registry reaches order 194 (every technique before it exhausted, rating-v3 registry), the
// ALS records (default limits, huge guard), the number of record pairs and what an independent ALS-XZ oracle finds.
// The oracle is written from the definition only (record cells/occurrences, model.peers); the engine has no finder yet.
const SG = require('./load.js');
const H = SG.techHelper;
const F = SG.fixtures.techniques;
const model = H.model('classic9');
const ids = SG.techniques.list().filter((t) => t.variantScope === null && t.order < 194).map((t) => t.id);
const puzzles = new Map();
function add(entry, tag) {
  if (entry && typeof entry.puzzle === 'string' && entry.puzzle.length === 81 && !puzzles.has(entry.puzzle)) {
    puzzles.set(entry.puzzle, tag);
  }
}
Object.keys(F.byId).forEach((id) => {
  const e = F.byId[id];
  (e.positive || []).forEach((x) => add(x, id + '+'));
  (e.negative || []).forEach((x) => add(x, id + '-'));
});
Object.keys(F.supplements).forEach((id) => F.supplements[id].forEach((x) => add(x, id + 's')));

const popcount = SG.bits.popcount;
function sees(a, b) { return model.peers[a].indexOf(b) !== -1; }

function analyse(state, solution) {
  const ctx = SG.techniques.createContext(model, {});
  const work = SG.alsPatterns.createWork(1e9);
  const out = SG.alsPatterns.enumerate(model, state, ctx, work, { records: 1e7 });
  const recs = out.records.map((r) => ({ cells: r.cells, mask: r.digits.reduce((m, d) => m | (1 << (d - 1)), 0), occ: r.occurrences }));
  const n = recs.length;
  let units = 0;
  let disjoint = 0;
  let share2 = 0;
  let rcc = 0;
  let combos = 0;
  let firstUnits = -1;
  let firstPair = -1;
  let pairIndex = 0;
  let unsound = 0;
  let eliminations = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      pairIndex++;
      units++;
      const A = recs[i];
      const B = recs[j];
      if (A.cells.some((c) => B.cells.indexOf(c) !== -1)) continue;
      disjoint++;
      const common = A.mask & B.mask;
      if (popcount(common) < 2) continue;
      share2++;
      for (let x = 1; x <= 9; x++) {
        if ((common & (1 << (x - 1))) === 0) continue;
        if (!A.occ[x].every((a) => B.occ[x].every((b) => sees(a, b)))) continue;
        rcc++;
        for (let z = 1; z <= 9; z++) {
          if (z === x || (common & (1 << (z - 1))) === 0) continue;
          const zcells = A.occ[z].concat(B.occ[z]);
          units += 1;
          const targets = [];
          model.peers[zcells[0]].forEach((c) => {
            units += 1;
            if (state.value[c] !== 0 || (state.candidates[c] & (1 << (z - 1))) === 0) return;
            if (A.cells.indexOf(c) !== -1 || B.cells.indexOf(c) !== -1) return;
            if (zcells.every((q) => sees(c, q))) targets.push(c);
          });
          if (targets.length > 0) {
            combos++;
            eliminations += targets.length;
            targets.forEach((c) => { if (solution[c] === z) unsound++; });
            if (firstUnits < 0) { firstUnits = units; firstPair = pairIndex; }
          }
        }
      }
    }
  }
  return { n, capHit: out.capHit, enumWork: work.used, pairs: n * (n - 1) / 2, disjoint, share2, rcc, combos, eliminations,
    unsound, firstPair, firstUnits, totalUnits: units };
}

let count = 0;
const rows = [];
puzzles.forEach((tag, puzzle) => {
  const givens = H.parsePuzzle(model, puzzle);
  if (SG.dfs.countSolutions(model, givens, 2) !== 1) return;
  const solution = SG.dfs.solve(model, givens);
  const state = H.stateAfter(model, puzzle, ids);
  let open = 0;
  for (let c = 0; c < model.cellCount; c++) if (state.value[c] === 0) open++;
  if (open === 0) return;
  const t0 = Date.now();
  const r = analyse(state, solution);
  r.ms = Date.now() - t0;
  r.open = open;
  r.tag = tag;
  rows.push(r);
  count++;
  console.log(JSON.stringify(r));
});
const nums = (k) => rows.map((r) => r[k]).sort((a, b) => a - b);
function q(a, p) { return a.length === 0 ? null : a[Math.min(a.length - 1, Math.floor(p * a.length))]; }
console.log('positions with open cells at order 194: ' + count + ' of ' + puzzles.size + ' unique puzzles');
['n', 'enumWork', 'pairs', 'share2', 'rcc', 'combos', 'totalUnits'].forEach((k) => {
  const a = nums(k);
  console.log(k + ': min ' + a[0] + ' median ' + q(a, 0.5) + ' p90 ' + q(a, 0.9) + ' max ' + a[a.length - 1]);
});
console.log('positions with a Finding: ' + rows.filter((r) => r.combos > 0).length + '; unsound eliminations: ' +
  rows.reduce((s, r) => s + r.unsound, 0));
