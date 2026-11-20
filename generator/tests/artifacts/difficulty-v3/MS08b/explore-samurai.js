'use strict';
// Scratch (MS08b fix round): labels of the Samurai board.
const SG = require('./load.js');
const H = SG.techHelper;
const s = H.model('samurai');
console.log(Object.keys(s.layout).join(','));
console.log('cells 0, 1, 80, 81, 184, 368:', [0, 1, 80, 81, 184, 368].map((c) => c + '=' + H.label(s, c)).join(' '));
const labels = s.unitMeta.map((m) => m.kind + ':' + m.label);
console.log(labels.slice(0, 30).join(' '));
console.log(labels.slice(-30).join(' '));
// which cell indexes lie in two box units?
const twoBoxes = [];
for (let c = 0; c < s.cellCount; c++) {
  const boxes = Array.from(s.cellUnits[c]).filter((u) => s.unitMeta[u].kind === 'box');
  if (boxes.length > 1) twoBoxes.push(c);
}
console.log('cells in two boxes:', twoBoxes.length, twoBoxes.slice(0, 12).map((c) => c + '=' + H.label(s, c)).join(' '));
// cell absolute coordinates
const r = s.layout.cellRow;
const cc = s.layout.cellCol;
const abs = (row, col) => { for (let c = 0; c < s.cellCount; c++) if (r[c] === row - 1 && cc[c] === col - 1) return c; return -1; };
['8,7', '8,11', '9,8', '11,8', '11,11', '11,10', '11,14', '12,11', '15,11', '15,14'].forEach((rc) => {
  const [row, col] = rc.split(',').map(Number);
  const c = abs(row, col);
  console.log('abs R' + row + 'C' + col, c, c >= 0 ? H.label(s, c) + ' units ' + Array.from(s.cellUnits[c]).map((u) => s.unitMeta[u].label).join('/') : '');
});
