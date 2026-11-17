'use strict';
// MS15b scratch (I2 pin refresh): the jumps of the 14 goldens in the saved fixture at HEAD (before the E writes) and in the tree
// (after them), data only, no generation. Usage (from generator/): node tests/artifacts/difficulty-v3/MS15b/golden-jumps.js
const cp = require('child_process');
const path = require('path');
const vm = require('vm');
const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const read = (text) => {
  const sandbox = { SG: { fixtures: {} } };
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(text, sandbox);
  return sandbox.SG.fixtures.replayGoldens;
};
const fs = require('fs');
const oldG = read(cp.execFileSync('git', ['show', 'HEAD:generator/tests/fixtures/replay-goldens.js'], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26 }));
const newG = read(fs.readFileSync(path.join(REPO, 'generator', 'tests', 'fixtures', 'replay-goldens.js'), 'utf8'));
const brief = (g) => ({ id: g.id, request: g.request.variantId + ' ' + g.request.difficulty + ' ' + g.request.seed, counts: g.counts,
  rows: g.rows.length, jumps: g.jumps.map((j) => ({ step: j.step, cause: j.cause, frame: j.frame, choice: j.choice === null ? null : 'rec',
    firstUse: j.firstUse && j.firstUse.technique, key: j.key })), foldsPeaks: g.folds.map((f) => f.step + ':' + f.peak) });
newG.forEach((g, i) => {
  const o = brief(oldG[i]);
  const n = brief(g);
  const same = JSON.stringify(o) === JSON.stringify(n);
  console.log((same ? '=' : '*') + ' ' + n.id + ' ' + n.request);
  if (!same) {
    console.log('   old: counts ' + JSON.stringify(o.counts) + ' rows ' + o.rows + ' jumps ' + JSON.stringify(o.jumps) + ' folds ' + o.foldsPeaks.join(' '));
    console.log('   new: counts ' + JSON.stringify(n.counts) + ' rows ' + n.rows + ' jumps ' + JSON.stringify(n.jumps) + ' folds ' + n.foldsPeaks.join(' '));
  }
});
