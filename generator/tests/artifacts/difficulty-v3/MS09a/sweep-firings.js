const SG = require('./load.js'); const H = SG.techHelper; const model = H.model('classic9');
const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(20260101), 300);
['skyscraper','twoStringKite','emptyRectangle','finnedXWing'].forEach((id) => {
  const stats = H.assertSound(SG.test, id, { model: model, count: 300, minFirings: 0, states: items });
  console.log(id + ' firings ' + stats.firings + ' of ' + stats.states + ' states');
});
