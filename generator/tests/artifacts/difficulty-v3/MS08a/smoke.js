'use strict';
const SG = require('./load.js');
const H = SG.techHelper;
const m = H.model('classic9');
const blank = '.'.repeat(81);

function digitState(digit, labels, extra) {
  const keep = new Set(labels.map((l) => H.cell(m, l)));
  const eliminate = [];
  for (let c = 0; c < m.cellCount; c++) if (!keep.has(c)) eliminate.push([c, digit]);
  return H.makeState(m, blank, { eliminate: eliminate, propagate: false });
}
function run(state, opts) {
  const ctx = SG.techniques.createContext(m, opts || {});
  return SG.techniques.get('skyscraper').find(m, state, ctx);
}
const s = digitState(5, ['R1C2', 'R1C8', 'R4C2', 'R4C7', 'R2C7']);
console.log(JSON.stringify(run(s)));
console.log('transposed', JSON.stringify(run(digitState(5, ['R2C1', 'R8C1', 'R2C4', 'R7C4', 'R7C2']))));
console.log('third cand', JSON.stringify(run(digitState(5, ['R1C2', 'R1C8', 'R1C5', 'R4C2', 'R4C7', 'R2C7']))));
console.log('xwing', JSON.stringify(run(digitState(5, ['R1C2', 'R1C8', 'R4C2', 'R4C8', 'R2C7']))));
console.log(SG.techniques.list().map((t) => t.id + ':' + t.order).join(' '));
