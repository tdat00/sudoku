'use strict';
// Scratch (MS08b fix round): labels of the Samurai board and the jigsaw positions of the new kite tests.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS08b/explore-fix.js
const SG = require('./load.js');
const H = SG.techHelper;

const s = H.model('samurai');
console.log('samurai', s.cellCount, s.units.length, JSON.stringify(s.layout.rows), JSON.stringify(s.layout.cols));
['R8C7', 'R11C10', 'R15C14', 'R1C1'].forEach((ref) => {
  try {
    const c = H.cell(s, ref);
    console.log(ref, c, H.label(s, c), Array.from(s.cellUnits[c]).map((u) => s.unitMeta[u].kind + ':' + s.unitMeta[u].label).join(' '));
  } catch (e) { console.log(ref, 'error', e.message); }
});
const j = H.model('jigsaw9');
console.log('jigsaw cell R3C5', H.cell(j, 'R3C5'), Array.from(j.cellUnits[H.cell(j, 'R3C5')]).map((u) => j.unitMeta[u].label).join(' '));
