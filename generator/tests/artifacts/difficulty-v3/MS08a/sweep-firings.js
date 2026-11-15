'use strict';
// Scratch (MS08a): how often does skyscraper fire in the 300-state sweep of techniques.test.js (seed 20260101)?
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
['xWing', 'skyscraper', 'simpleColouring', 'swordfish'].forEach((id) => {
  const stats = H.assertSound(SG.test, id, { model: m9, count: 300, minFirings: 3 });
  console.log(id, JSON.stringify(stats));
});
