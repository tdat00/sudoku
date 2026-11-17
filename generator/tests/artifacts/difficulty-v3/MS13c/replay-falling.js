'use strict';
// MS13c scratch: positions of the details view of the 14 new goldens that are a new hardest technique at a lower or equal
// score (tier newPeak, change <= 0), and every newPeak transition with a fall, to find the real falling case that the pin of
// replay.test.js needs. Usage (from generator/): node ...\replay-falling.js
const SG = require('./load.js');
const R = SG.replay;
const GOLDENS = SG.fixtures.replayGoldens;
const WIRE = SG.fixtures.replayWire;
GOLDENS.forEach((g) => {
  const result = WIRE[g.id] ? R.fromPlainWire(WIRE[g.id]) : SG.pipeline.run(SG.store.toConfig(g.request), null, SG.budget.create({ ms: 120000 }));
  const a = R.analyse(result);
  ['details', 'compact'].forEach((view) => {
    a.transitions.filter((t) => t.view === view && t.role === 'step' && t.newHardest && t.change <= 0).forEach((t) => {
      console.log(g.id, view, 'to', t.to, 'from', t.from, t.before.total, '->', t.after.total, 'change', t.change, 'hardest', t.before.hardest, '->', t.after.hardest, 'tier', t.tier, 'ratio', t.ratio);
    });
  });
});
