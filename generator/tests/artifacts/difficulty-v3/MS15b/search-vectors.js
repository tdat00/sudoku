'use strict';
// Scratch (MS15b): searches small hand-sized ALS-XZ positions that separate the real rule from a mutated one (overlapping
// sets allowed, only ONE x cross-peer required, a target that sees only SOME z cells), to encode them as vectors.
const SG = require('./load.js');
const H = SG.techHelper;
const model = H.model('classic9');
const popc = (m) => { let n = 0; for (; m; m >>= 1) n += m & 1; return n; };
const units = model.units;
const seeMemo = new Map();
function sees(a, b) {
  if (a === b) return false;
  const key = a * 81 + b;
  let v = seeMemo.get(key);
  if (v === undefined) { v = units.some((u) => u.indexOf(a) !== -1 && u.indexOf(b) !== -1); seeMemo.set(key, v); }
  return v;
}
function candidatesOf(state, c) { const out = []; for (let d = 1; d <= 9; d++) if (state.candidates[c] & (1 << (d - 1))) out.push(d); return out; }
function records(state, maxCells) {
  const table = new Map();
  units.forEach((u) => {
    const open = u.filter((c) => state.value[c] === 0).sort((a, b) => a - b);
    for (let k = 1; k <= maxCells; k++) {
      const pick = [];
      (function walk(from) {
        if (pick.length === k) {
          let mask = 0; pick.forEach((c) => { mask |= state.candidates[c]; });
          if (popc(mask) === k + 1) table.set(pick.join(','), pick.slice());
          return;
        }
        for (let i = from; i < open.length; i++) { pick.push(open[i]); walk(i + 1); pick.pop(); }
      })(0);
    }
  });
  return Array.from(table.values()).sort((a, b) => a.length - b.length || (() => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; })())
    .map((cells) => { let mask = 0; cells.forEach((c) => { mask |= state.candidates[c]; }); const occ = {}; for (let d = 1; d <= 9; d++) if (mask & (1 << (d - 1))) occ[d] = cells.filter((c) => state.candidates[c] & (1 << (d - 1))); return { cells, mask, occ }; });
}
function witnesses(state, recs, rule) {
  const out = [];
  for (let i = 0; i < recs.length; i++) for (let j = i + 1; j < recs.length; j++) {
    const A = recs[i], B = recs[j];
    const overlap = A.cells.some((c) => B.cells.indexOf(c) !== -1);
    if (overlap && !rule.allowOverlap) continue;
    const common = A.mask & B.mask;
    for (let x = 1; x <= 9; x++) {
      if (!(common & (1 << (x - 1)))) continue;
      const pairs = []; A.occ[x].forEach((a) => B.occ[x].forEach((b) => pairs.push(sees(a, b))));
      const ok = rule.anyRcc ? pairs.some((p) => p) : pairs.every((p) => p);
      if (!ok) continue;
      for (let z = 1; z <= 9; z++) {
        if (z === x || !(common & (1 << (z - 1)))) continue;
        const zc = A.occ[z].concat(B.occ[z]);
        const targets = [];
        for (let c = 0; c < 81; c++) {
          if (state.value[c] !== 0 || !(state.candidates[c] & (1 << (z - 1))) || A.cells.indexOf(c) !== -1 || B.cells.indexOf(c) !== -1) continue;
          const seesAll = rule.anyTarget ? zc.some((q) => sees(c, q)) : zc.every((q) => sees(c, q));
          if (seesAll) targets.push(c);
        }
        if (targets.length) out.push({ A: A.cells, B: B.cells, x, z, targets });
      }
    }
  }
  return out;
}
function build(spec) {
  const state = SG.model.initState(model);
  Object.keys(spec).forEach((c) => { state.candidates[Number(c)] = spec[c].reduce((m, d) => m | (1 << (d - 1)), 0); });
  return state;
}
const rng = SG.testkit.rng.create(515);
const kinds = { overlap: { allowOverlap: true }, anyRcc: { anyRcc: true }, anyTarget: { anyTarget: true } };
const best = {};
for (let trial = 0; trial < 60000; trial++) {
  const nCells = 4 + rng.int(3);
  const cells = new Set();
  const region = [0, 1, 2, 3, 4, 9, 10, 11, 12, 13]; // R1C1-C5, R2C1-C5
  while (cells.size < nCells) cells.add(region[rng.int(region.length)]);
  const spec = {};
  cells.forEach((c) => {
    const size = 2 + rng.int(2);
    const set = new Set();
    while (set.size < size) set.add(1 + rng.int(4));
    spec[c] = Array.from(set).sort();
  });
  const state = build(spec);
  const recs = records(state, 3);
  const real = witnesses(state, recs, {});
  if (real.length > 0) continue;
  Object.keys(kinds).forEach((k) => {
    const w = witnesses(state, recs, kinds[k]);
    if (w.length > 0 && (!best[k] || nCells < best[k].n || (nCells === best[k].n && recs.length < best[k].r))) {
      best[k] = { n: nCells, r: recs.length, spec, first: w[0] };
    }
  });
}
Object.keys(best).forEach((k) => console.log(k, JSON.stringify(best[k])));
