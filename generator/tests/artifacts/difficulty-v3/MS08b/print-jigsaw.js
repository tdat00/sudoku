'use strict';
// Scratch (MS08b fix round): prints the region layout of the registry's jigsaw9 test model and the unit kinds.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS08b/print-jigsaw.js
const SG = require('./load.js');
const H = SG.techHelper;
const m = H.model('jigsaw9');
console.log(m.variantId, m.digits, m.cellCount, m.units.length);
const kinds = {};
m.unitMeta.forEach((u) => { kinds[u.kind] = (kinds[u.kind] || 0) + 1; });
console.log(JSON.stringify(kinds));
const reg = new Array(81).fill(0);
m.unitMeta.forEach((u, i) => { if (u.kind === 'region') m.units[i].forEach((c) => { reg[c] = u.label; }); });
for (let r = 0; r < 9; r++) console.log(reg.slice(r * 9, r * 9 + 9).join(' '));
console.log(Object.keys(SG.testkit).join(','));
