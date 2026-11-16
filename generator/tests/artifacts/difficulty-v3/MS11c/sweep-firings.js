'use strict';
// Scratch (MS11c): how often the finder fires in the soundness sweeps of the wing suite (random states of the shared
// corpus per size) and in the differential walks, to set the firing minima of the new tests.
const SG = require('./load.js');
const H = SG.techHelper;
const models = {
  4: H.model('classic4'), 6: H.model('classic6'), 9: H.model('classic9'),
  12: SG.fixtures.models.boxGrid('test-wing-12', 3, 4), 16: SG.fixtures.models.boxGrid('test-wing-16', 4, 4)
};
const counts = { 4: 300, 6: 200, 9: 300, 12: 200, 16: 8 };
Object.keys(models).forEach((d) => {
  const stats = H.assertSound(SG.test, 'bugPlusOne', { model: models[d], count: counts[d], minFirings: 0 });
  console.log(d + ' digits: ' + JSON.stringify(stats));
});
// the techniques.test.js sweep: seed 20260101, 300 states of classic9
const s9 = H.randomStatesWithKnownSolution(models[9], SG.testkit.rng.create(20260101), 300);
const stats9 = H.assertSound(SG.test, 'bugPlusOne', { model: models[9], count: 300, minFirings: 0, states: s9 });
console.log('classic9 seed 20260101 x 300: ' + JSON.stringify(stats9));
