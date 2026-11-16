'use strict';
// Scratch (MS14a): completes a hand-made pair of regions into a whole Jigsaw layout. J1 = R1C1-4 + R2C2-5 + R3C3 and
// J2 = R1C5-8 + R2C6-8 + R3C8 + R4C8 (regions 0 and 1) leave A = {R1C9, R2C1, R2C9} and B = {R3C3, R3C8, R4C8} when rows 1-2
// are chosen with these two regions. The other 63 cells are cut into seven connected regions of nine cells by a randomised
// backtracking search that always takes the first free cell. Usage: node complete-layout.js <seed> <layouts wanted>
const SG = require('./load.js');
const J = SG.fixtures.jigsawModels;
const rng = SG.testkit.rng.create(Number(process.argv[2] || 1));
const wanted = Number(process.argv[3] || 3);
const cell = (r, c) => (r - 1) * 9 + (c - 1);
const j1 = [[1, 1], [1, 2], [1, 3], [1, 4], [2, 2], [2, 3], [2, 4], [2, 5], [3, 3]].map((p) => cell(p[0], p[1]));
const j2 = [[1, 5], [1, 6], [1, 7], [1, 8], [2, 6], [2, 7], [2, 8], [3, 8], [4, 8]].map((p) => cell(p[0], p[1]));
function neighbours(c) {
  const r = Math.floor(c / 9); const k = c % 9; const out = [];
  if (r > 0) out.push(c - 9); if (r < 8) out.push(c + 9); if (k > 0) out.push(c - 1); if (k < 8) out.push(c + 1);
  return out;
}
function components(layout) {
  const seen = new Set(); const sizes = [];
  for (let c = 0; c < 81; c++) {
    if (layout[c] !== -1 || seen.has(c)) continue;
    let n = 0; const stack = [c]; seen.add(c);
    while (stack.length) { const x = stack.pop(); n++; neighbours(x).forEach((d) => { if (layout[d] === -1 && !seen.has(d)) { seen.add(d); stack.push(d); } }); }
    sizes.push(n);
  }
  return sizes;
}
let budget = 0;
function solve(layout, region, r) {
  const first = layout.indexOf(-1);
  if (first < 0) return region === 9;
  if (region >= 9) return false;
  for (let attempt = 0; attempt < 30; attempt++) {
    if (++budget > 200000) return false;
    const set = [first];
    layout[first] = region;
    while (set.length < 9) {
      const frontier = [];
      set.forEach((c) => neighbours(c).forEach((d) => { if (layout[d] === -1 && frontier.indexOf(d) < 0) frontier.push(d); }));
      if (!frontier.length) break;
      const d = frontier[r.int(frontier.length)];
      layout[d] = region; set.push(d);
    }
    let ok = set.length === 9 && components(layout).every((n) => n % 9 === 0);
    if (ok && solve(layout, region + 1, r)) return true;
    set.forEach((c) => { layout[c] = -1; });
  }
  return false;
}
function choiceCount(layout) {
  const model = J.build(layout);
  const out = { rows1: 0, cols1: 0, rows2: [], cols2: 0 };
  [['row', 0], ['col', 9]].forEach(([kind, offset]) => {
    const lines = model.units.slice(offset, offset + 9); const regs = model.units.slice(18);
    const combos = (n) => { const r = []; if (n === 1) for (let i = 0; i < 9; i++) r.push([i]); else for (let i = 0; i < 9; i++) for (let j = i + 1; j < 9; j++) r.push([i, j]); return r; };
    [1, 2].forEach((n) => combos(n).forEach((lc) => combos(n).forEach((gc) => {
      const L = new Set(); lc.forEach((i) => lines[i].forEach((c) => L.add(c)));
      const G = new Set(); gc.forEach((i) => regs[i].forEach((c) => G.add(c)));
      const A = [...L].filter((c) => !G.has(c)); const B = [...G].filter((c) => !L.has(c));
      if (A.length < 1 || A.length > 4) return;
      if (n === 1) out[kind === 'row' ? 'rows1' : 'cols1']++;
      else if (kind === 'row') out.rows2.push(lc.map((i) => 'R' + (i + 1)).join('+') + '/' + gc.map((i) => 'J' + (i + 1)).join('+') + ' A' + A.length);
      else out.cols2++;
    })));
  });
  return out;
}
let shown = 0; let valid = 0; const withN1 = [];
for (let t = 0; t < 4000 && shown < wanted; t++) {
  const layout = new Array(81).fill(-1);
  j1.forEach((c) => { layout[c] = 0; }); j2.forEach((c) => { layout[c] = 1; });
  budget = 0;
  if (!solve(layout, 2, rng.fork('t' + t)) || J.problems(layout).length) continue;
  valid++;
  const ch = choiceCount(layout);
  if (!(ch.rows1 === 0 && ch.cols1 >= 1 && ch.rows2.some((x) => x.startsWith('R1+R2/J1+J2')))) { withN1.push(ch.rows1 + ch.cols1); continue; }
  shown++;
  console.log('try ' + t + ': n=1 row choices ' + ch.rows1 + ', n=1 column choices ' + ch.cols1 + ', n=2 rows ' + ch.rows2.join(', ') + ', n=2 columns ' + ch.cols2);
  for (let r = 0; r < 9; r++) console.log('  ' + layout.slice(r * 9, r * 9 + 9).join(''));
  console.log('  solution exists: ' + (SG.dfs.solve(J.build(layout), new Int32Array(81), SG.testkit.rng.create(1)) !== null));
}
console.log('done: valid layouts ' + valid + ', those with an n=1 choice: ' + withN1.length + ' (' + withN1.slice(0, 20).join(',') + ')');
