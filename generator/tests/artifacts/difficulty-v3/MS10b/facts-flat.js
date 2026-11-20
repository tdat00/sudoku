'use strict';
// Scratch (MS10b): the transitions of the goldens that the "new hardest technique at a flat or lower score" pins read. For
// the given golden ids (default G13, G12) it prints, for both views, every transition that is no jump and has a new hardest
// technique, or whose total does not change, with its position, totals, tier, hardest techniques and the flags that the
// pins check. Usage (from generator/): node tests/artifacts/difficulty-v3/MS10b/facts-flat.js [G13,G12]
const SG = require('./load.js');
const R = SG.replay;
const GOLDENS = SG.fixtures.replayGoldens;
const WIRE = SG.fixtures.replayWire;
const ids = (process.argv[2] || 'G13,G12').split(',');
ids.forEach((id) => {
  const g = GOLDENS.filter((x) => x.id === id)[0];
  const result = WIRE[id] ? R.fromPlainWire(WIRE[id])
    : SG.pipeline.run(SG.store.toConfig(g.request), null, SG.budget.create({ ms: 120000 }));
  const analysis = R.analyse(result);
  console.log('== ' + id + ' positions ' + analysis.ratings.length);
  analysis.transitions.forEach((t) => {
    if (t.tier === 'jump') return;
    if (!(t.newHardest || t.after.total === t.before.total && t.role !== 'final')) return;
    console.log('  ' + t.view + ' ' + t.from + '>' + t.to + ' totals ' + t.before.total + '>' + t.after.total + ' tier ' + t.tier +
      ' newHardest ' + t.newHardest + ' hardest ' + t.before.hardest + '>' + t.after.hardest + ' role ' + t.role);
  });
});
