'use strict';
// Scratch (MS10a): why G06 changes in the analysis. The golden result of G06 is analysed twice with the same puzzle, once with
// remotePairs registered and once without it (unregistered, weight removed, restored afterwards); the rating positions whose
// score differs are listed with their technique counts. Usage (from generator/):
//   node tests/artifacts/difficulty-v3/MS10a/g06-cause.js
const SG = require('./load.js');
const R = SG.replay;
const D = SG.difficulty;
const g = SG.fixtures.replayGoldens.filter((x) => x.id === 'G06')[0];
const result = SG.pipeline.run(SG.store.toConfig(g.request), null, SG.budget.create({ ms: 120000 }));
const withA = R.analyse(result);
const def = SG.techniques.get('remotePairs');
const weight = D.WEIGHTS.remotePairs;
SG.techniques.unregister('remotePairs');
delete D.WEIGHTS.remotePairs;
const withoutA = R.analyse(result);
SG.techniques.register(def);
D.WEIGHTS.remotePairs = weight;
console.log('ratings keys: ' + Object.keys(withA.ratings[0]).join(', '));
console.log('positions ' + withA.ratings.length + ' / ' + withoutA.ratings.length);
let differing = 0;
withA.ratings.forEach((r, i) => {
  const o = withoutA.ratings[i];
  if (r.score === o.score) return;
  differing++;
  const counts = (x) => JSON.stringify(x.techniqueCounts || x.counts || null);
  console.log('position ' + i + ': score without ' + o.score + ', with ' + r.score + '; hardest without ' +
    (o.hardestTechnique || o.hardest) + ', with ' + (r.hardestTechnique || r.hardest));
  console.log('  without ' + counts(o));
  console.log('  with    ' + counts(r));
});
console.log('positions whose score differs: ' + differing);
