'use strict';
// Scratch (MS14a): looks for Jigsaw layouts whose rows overlap their regions a lot, to be frozen into
// SG.fixtures.jigsawModels.LAYOUTS. Simulated annealing on the sum of squared row/region overlaps from the box layout, with
// a move that hands one cell of a region to a neighbour and takes another back (both regions keep nine cells).
// Usage: node search-layouts.js <seed> <steps> <walks> [target objective]
const SG = require('./load.js');
const J = SG.fixtures.jigsawModels;
const rng = SG.testkit.rng.create(Number(process.argv[2] || 1));
const steps = Number(process.argv[3] || 3000);
const walks = Number(process.argv[4] || 5);
const target = Number(process.argv[5] || 400);

function neighbours(cell) {
  const r = Math.floor(cell / 9); const c = cell % 9; const out = [];
  if (r > 0) out.push(cell - 9); if (r < 8) out.push(cell + 9); if (c > 0) out.push(cell - 1); if (c < 8) out.push(cell + 1);
  return out;
}

function objective(layout) {
  const cnt = Array.from({ length: 9 }, () => new Array(9).fill(0));
  layout.forEach((g, c) => { cnt[Math.floor(c / 9)][g]++; });
  let s = 0; cnt.forEach((row) => row.forEach((x) => { s += x * x; }));
  return s;
}

function choices(layout) {
  const rows = []; for (let r = 0; r < 9; r++) rows.push(Array.from({ length: 9 }, (_, c) => r * 9 + c));
  const regs = []; for (let g = 0; g < 9; g++) regs.push(layout.map((x, c) => (x === g ? c : -1)).filter((c) => c >= 0));
  const out = { n1: [0, 0, 0, 0, 0], n2: [0, 0, 0, 0, 0], list: [] };
  function combos(n) {
    const r = [];
    if (n === 1) for (let i = 0; i < 9; i++) r.push([i]);
    else for (let i = 0; i < 9; i++) for (let j = i + 1; j < 9; j++) r.push([i, j]);
    return r;
  }
  [1, 2].forEach((n) => {
    combos(n).forEach((lc) => combos(n).forEach((gc) => {
      const L = new Set(); lc.forEach((i) => rows[i].forEach((c) => L.add(c)));
      const G = new Set(); gc.forEach((i) => regs[i].forEach((c) => G.add(c)));
      const A = [...L].filter((c) => !G.has(c)); const B = [...G].filter((c) => !L.has(c));
      if (A.length >= 1 && A.length <= 4) {
        (n === 1 ? out.n1 : out.n2)[A.length]++;
        out.list.push({ n, lc, gc, A, B });
      }
    }));
  });
  return out;
}

function move(layout, r) {
  const a = r.int(81);
  const nb = neighbours(a).filter((b) => layout[b] !== layout[a]);
  if (nb.length === 0) return null;
  const x = layout[a]; const y = layout[nb[r.int(nb.length)]];
  const l = layout.slice(); l[a] = y;
  const back = [];
  for (let c = 0; c < 81; c++) {
    if (c !== a && l[c] === y && neighbours(c).some((d) => l[d] === x)) back.push(c);
  }
  if (back.length === 0) return null;
  const b = back[r.int(back.length)];
  l[b] = x;
  return J.problems(l).length === 0 ? l : null;
}

const results = [];
for (let w = 0; w < walks; w++) {
  let layout = J.parse(J.LAYOUTS.boxes);
  let cur = objective(layout);
  const r = rng.fork('walk' + w);
  for (let s = 0; s < steps && cur < target; s++) {
    const l = move(layout, r);
    if (!l) continue;
    const next = objective(l);
    const temp = 6 * (1 - s / steps) + 0.2;
    if (next >= cur || r.next() < Math.exp((next - cur) / temp)) { layout = l; cur = next; }
  }
  const ch = choices(layout);
  results.push({ layout, ch, obj: cur });
}
function score(x) { return x.ch.n1.reduce((a, b) => a + b, 0) + 3 * x.ch.n2.reduce((a, b) => a + b, 0); }
results.sort((x, y) => score(y) - score(x));
results.slice(0, 4).forEach((x) => {
  console.log('objective', x.obj, 'score', score(x), 'n1', x.ch.n1.join(','), 'n2', x.ch.n2.join(','));
  for (let r = 0; r < 9; r++) console.log('  ' + x.layout.slice(r * 9, r * 9 + 9).join(''));
});
