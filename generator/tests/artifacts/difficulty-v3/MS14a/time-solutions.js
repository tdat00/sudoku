'use strict';
// Scratch (MS14a): which seeded random solutions of the named layouts are slow (the agreement tests use
// candidateStates(model, 31000 + 7 * index + transposed, 60, ...) with SG.testkit.randomSolution of rng.fork('grid' + i)).
const SG = require('./load.js');
const J = SG.fixtures.jigsawModels;
const NAMES = ['staggered', 'wavy', 'mixed', 'crossed'];
NAMES.forEach((name, idx) => [false, true].forEach((t) => {
  let layout = J.parse(J.LAYOUTS[name]);
  if (t) layout = J.transpose(layout);
  const model = J.build(layout);
  const rng = SG.testkit.rng.create(31000 + 7 * idx + (t ? 1 : 0));
  let slow = 0; let failed = 0; let worst = 0; const t0 = Date.now();
  for (let i = 0; i < 60; i++) {
    const budget = SG.budget.create({ nodes: 100000 });
    const t1 = Date.now();
    let sol = null;
    try { sol = SG.dfs.solve(model, Int32Array.from(model.fixedCells), rng.fork('grid' + i), budget); } catch (e) { failed++; }
    const ms = Date.now() - t1; worst = Math.max(worst, ms); if (ms > 200) slow++;
    if (sol === null && !failed) failed++;
  }
  console.log(name + (t ? ' (t)' : '') + ': 60 solutions in ' + (Date.now() - t0) + ' ms, slowest ' + worst + ' ms, over 200 ms: ' + slow + ', failed/over budget ' + failed);
}));
