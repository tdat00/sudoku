'use strict';
// Scratch (MS08c): how often does emptyRectangle fire in the random states of the sweeps (seed 20260101 x 300 as in
// techniques.test.js, seed 99 x 1200 as in tech-fish.test.js), and on which classic boards?
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const ids = (process.argv[2] || 'emptyRectangle,twoStringKite').split(',');
const runs = [['classic9', 300, 20260101], ['classic9', 1200, 99], ['classic9', 400, 777], ['classic6', 400, 777],
  ['classic4', 300, 777]];
runs.forEach(([variant, count, seed]) => {
  const model = H.model(variant);
  ids.forEach((id) => {
    const t0 = Date.now();
    const stats = H.assertSound(SG.test, id, { model, count, minFirings: 0, seed });
    console.log(variant + ' ' + count + ' seed ' + seed + ' ' + id + ': firings ' + stats.firings + ' in ' + stats.states +
      ' states, eliminations ' + stats.eliminations + ' (' + (Date.now() - t0) + ' ms)');
  });
});
