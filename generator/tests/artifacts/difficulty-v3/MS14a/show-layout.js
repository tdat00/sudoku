'use strict';
// Scratch (MS14a): lists the choices of units (rows as the line side) of a layout that leave 1 to 4 cells over, with the
// cells of each side and whether two cells of a side could hold the same digit (they do not see each other).
// Usage: node show-layout.js <nine rows of nine digits separated by commas> [t]   (t = transpose first: columns as lines)
const SG = require('./load.js');
const J = SG.fixtures.jigsawModels;
let layout = J.parse(process.argv[2].split(','));
if (process.argv[3] === 't') layout = J.transpose(layout);
const model = J.build(layout);
const label = (c) => SG.model.cellLabel(model, c);
const sees = (a, b) => Array.prototype.indexOf.call(model.peers[a], b) !== -1;
const lines = model.units.slice(0, 9); const regs = model.units.slice(18);
function combos(n) {
  const r = [];
  if (n === 1) for (let i = 0; i < 9; i++) r.push([i]);
  else for (let i = 0; i < 9; i++) for (let j = i + 1; j < 9; j++) r.push([i, j]);
  return r;
}
let count = 0;
[1, 2].forEach((n) => combos(n).forEach((lc) => combos(n).forEach((gc) => {
  const L = new Set(); lc.forEach((i) => lines[i].forEach((c) => L.add(c)));
  const G = new Set(); gc.forEach((i) => regs[i].forEach((c) => G.add(c)));
  const A = [...L].filter((c) => !G.has(c)).sort((a, b) => a - b); const B = [...G].filter((c) => !L.has(c)).sort((a, b) => a - b);
  if (A.length < 1 || A.length > 4) return;
  const free = (S) => { for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) if (!sees(S[i], S[j])) return true; return false; };
  count++;
  console.log('n=' + n + ' lines ' + lc.map((i) => 'R' + (i + 1)).join('+') + ' regions ' + gc.map((i) => 'J' + (i + 1)).join('+') +
    ' | A ' + A.map(label).join(' ') + (free(A) ? ' [repeat possible]' : '') + ' | B ' + B.map(label).join(' ') + (free(B) ? ' [repeat possible]' : ''));
})));
console.log(count + ' choices; solution exists: ' + (SG.dfs.solve(model, new Int32Array(81), SG.testkit.rng.create(1)) !== null));
