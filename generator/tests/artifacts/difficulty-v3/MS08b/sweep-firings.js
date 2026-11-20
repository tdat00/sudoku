'use strict';
// Scratch (MS08b): how often does twoStringKite fire in the soundness sweep of techniques.test.js (300 classic9
// states of seed 20260101, supplements not included)?
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
['skyscraper', 'twoStringKite'].forEach((id) => {
  const stats = H.assertSound(SG.test, id, { model: m9, count: 300, minFirings: 0, seed: 20260101 });
  console.log(id + ' firings ' + stats.firings + ' in ' + stats.states + ' states, eliminations ' + stats.eliminations);
});
