'use strict';
// Scratch (MS14a): looks for Jigsaw layouts (rows as the lines) with NO choice of one row and one region that leaves 1-4
// cells over, but with choices of two rows and two regions in which a side has two cells that do not see each other, so that
// a digit can repeat. Usage: node search-n2.js <seed> <steps> <walks> <target>
const SG = require('./load.js');
const J = SG.fixtures.jigsawModels;
const rng = SG.testkit.rng.create(Number(process.argv[2] || 1));
const steps = Number(process.argv[3] || 4000);
const walks = Number(process.argv[4] || 100);
const target = Number(process.argv[5] || 300);

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
  const model = J.build(layout);
  const sees = (a, b) => Array.prototype.indexOf.call(model.peers[a], b) !== -1;
  const lines = model.units.slice(0, 9); const regs = model.units.slice(18);
  const combos = (n) => { const r = []; if (n === 1) for (let i = 0; i < 9; i++) r.push([i]); else for (let i = 0; i < 9; i++) for (let j = i + 1; j < 9; j++) r.push([i, j]); return r; };
  const out = { n1: 0, n2: [] };
  [1, 2].forEach((n) => combos(n).forEach((lc) => combos(n).forEach((gc) => {
    const L = new Set(); lc.forEach((i) => lines[i].forEach((c) => L.add(c)));
    const G = new Set(); gc.forEach((i) => regs[i].forEach((c) => G.add(c)));
    const A = [...L].filter((c) => !G.has(c)); const B = [...G].filter((c) => !L.has(c));
    if (A.length < 1 || A.length > 4) return;
    const free = (S) => { for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) if (!sees(S[i], S[j])) return true; return false; };
    if (n === 1) out.n1++;
    else out.n2.push({ lc, gc, A, B, repeatA: free(A), repeatB: free(B) });
  })));
  return out;
}
function move(layout, r) {
  const a = r.int(81);
  const nb = neighbours(a).filter((b) => layout[b] !== layout[a]);
  if (nb.length === 0) return null;
  const x = layout[a]; const y = layout[nb[r.int(nb.length)]];
  const l = layout.slice(); l[a] = y;
  const back = [];
  for (let c = 0; c < 81; c++) if (c !== a && l[c] === y && neighbours(c).some((d) => l[d] === x)) back.push(c);
  if (back.length === 0) return null;
  l[back[r.int(back.length)]] = x;
  return J.problems(l).length === 0 ? l : null;
}
let shown = 0;
for (let w = 0; w < walks && shown < 4; w++) {
  let layout = J.parse(J.LAYOUTS.boxes);
  let cur = objective(layout);
  const r = rng.fork('walk' + w);
  const goal = target - 40 + r.int(80);
  for (let s = 0; s < steps && cur < goal; s++) {
    const l = move(layout, r);
    if (!l) continue;
    const next = objective(l);
    const temp = 6 * (1 - s / steps) + 0.2;
    if (next >= cur || r.next() < Math.exp((next - cur) / temp)) { layout = l; cur = next; }
  }
  const ch = choices(layout);
  const rep = ch.n2.filter((x) => x.repeatA && x.repeatB);
  if (ch.n1 === 0 && rep.length >= 1) {
    shown++;
    console.log('objective ' + cur + ' n1 ' + ch.n1 + ' n2 ' + ch.n2.length + ' with repeats on both sides ' + rep.length);
    for (let rr = 0; rr < 9; rr++) console.log('  ' + layout.slice(rr * 9, rr * 9 + 9).join(''));
    rep.slice(0, 3).forEach((x) => console.log('   lines ' + x.lc.map((i) => 'R' + (i + 1)).join('+') + ' regions ' + x.gc.map((i) => 'J' + (i + 1)).join('+') + ' A ' + x.A.length + ' cells, B ' + x.B.length));
  }
}
console.log('done');
