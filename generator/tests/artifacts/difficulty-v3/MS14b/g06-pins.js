'use strict';
// MS14b scratch: the values that the two G06 pins of tests/suites/replay.test.js read, from the golden's own run on the tree
// (I2: the new value comes from a recorded output). Same calls as the test's entry() and analysisOf(); nothing is written.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS14b/g06-pins.js
const SG = require('./load.js');
const R = SG.replay;
const g = SG.fixtures.replayGoldens.filter((x) => x.id === 'G06')[0];
const result = SG.pipeline.run(SG.store.toConfig(g.request), null, SG.budget.create({ ms: 120000 }));
const analysis = R.analyse(result);
const label = (cell) => SG.model.cellLabel(result.model, cell);
const frameLabel = (frame) => (frame === null ? '-' : frame.kind === 'cell' ? label(frame.cell) : 'sign ' + frame.sign);
const out = R.rateBoard(result.model, result.givens, { forceCount: true, countNodes: 1 });
const rated = R.rateBoard(result.model, result.givens, { forceCount: true });
console.log('rateBoard with countNodes 1: ' + out.status + ' score ' + out.score + '; default: ' + rated.status + ' score ' + rated.score);
['compact', 'details'].forEach((name) => {
  analysis.transitions.filter((t) => t.view === name && t.tier === 'jump').forEach((t) => {
    console.log(name + ' jump: to ' + t.to + ' role ' + t.role + ' before ' + t.before.total + ' after ' + t.after.total + ' class ' +
      t.cause.class + ' frame ' + frameLabel(t.cause.frame) + ' culprit.otherScore ' + (t.cause.culprit ? t.cause.culprit.otherScore : 'n/a') +
      ' firstUse ' + (t.cause.firstUse ? t.cause.firstUse.technique : 'n/a'));
  });
});
