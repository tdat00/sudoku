const SG = require('./load.js'); const H = SG.techHelper;
['classic9', 'classic6', 'classic4'].forEach((name) => {
  const model = H.model(name);
  const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(20260101), name === 'classic9' ? 300 : 200);
  ['wxyzWing', 'xyzWing', 'wWing'].forEach((id) => {
    const stats = H.assertSound(SG.test, id, { model: model, count: items.length, minFirings: 0, states: items });
    console.log(name + ' ' + id + ' firings ' + stats.firings + ' of ' + stats.states + ' states');
  });
});
