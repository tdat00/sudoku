'use strict';
// Scratch (MS14a): random solutions of the named layouts with restarts (a node budget per attempt).
const SG = require('./load.js');
const J = SG.fixtures.jigsawModels;
const NODES = Number(process.argv[2] || 3000);
['boxes', 'staggered', 'wavy', 'mixed', 'crossed'].forEach((name) => [false, true].forEach((t) => {
  let layout = J.parse(J.LAYOUTS[name]);
  if (t) layout = J.transpose(layout);
  const model = J.build(layout);
  const rng = SG.testkit.rng.create(77);
  let attempts = 0; let worst = 0; let unsolved = 0; const t0 = Date.now();
  for (let i = 0; i < 60; i++) {
    let used = 0; let sol = null;
    for (; used < 400 && sol === null; used++) {
      try { sol = SG.dfs.solve(model, Int32Array.from(model.fixedCells), rng.fork('s' + i + '.' + used), SG.budget.create({ nodes: NODES })); } catch (e) { sol = null; }
    }
    attempts += used; worst = Math.max(worst, used); if (sol === null) unsolved++;
  }
  console.log(name + (t ? ' (t)' : '') + ': mean attempts ' + (attempts / 60).toFixed(1) + ', worst ' + worst + ', unsolved ' + unsolved + ', ' + (Date.now() - t0) + ' ms');
}));
