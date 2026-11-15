'use strict';
// Scratch (MS08c): the vector of the brief on classic9: box B1 digit 5, arms A = {R2C1, R2C3} and B = {R1C2, R3C2},
// external column-C5 pair p = R2C5, q = R7C5; R7C2 loses the 5.
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');

function digitsMap(model, spec) {
  const eliminate = [];
  Object.keys(spec).forEach((key) => {
    const keep = new Set(spec[key].map((label) => H.cell(model, label)));
    for (let c = 0; c < model.cellCount; c++) if (!keep.has(c)) eliminate.push([c, Number(key)]);
  });
  return H.makeState(model, '.'.repeat(model.cellCount), { eliminate, propagate: false });
}

console.log('registered', SG.techniques.has('emptyRectangle'), SG.techniques.get('emptyRectangle').order);
const state = digitsMap(m9, { 5: ['R2C1', 'R2C3', 'R1C2', 'R3C2', 'R2C5', 'R7C5', 'R7C2'] });
const ctx = SG.techniques.createContext(m9, { onPatternWork: (r) => console.log('work', JSON.stringify(r)) });
console.log(JSON.stringify(SG.techniques.get('emptyRectangle').find(m9, state, ctx)));
console.log(Object.keys(SG.fishSearch), SG.fishSearch.EMPTY_RECTANGLE_WORK_LIMIT);
