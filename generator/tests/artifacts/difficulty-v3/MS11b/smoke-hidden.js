'use strict';
// Scratch (MS11b): the brief's hidden vector through the registered finder and a few variations, no loops.
const SG = require('./load.js');
const H = SG.techHelper;
const model = H.model('classic9');

function blank() {
  return SG.model.initState(model);
}
function setMask(state, ref, digits) {
  let m = 0;
  String(digits).split('').forEach((ch) => { m |= 1 << (parseInt(ch, 10) - 1); });
  state.candidates[H.cell(model, ref)] = m;
}
function run(state, opts) {
  const records = [];
  const ctx = SG.techniques.createContext(model, Object.assign({ onPatternWork: (r) => records.push(r) }, opts));
  const finding = SG.techniques.get('uniqueRectangle').find(model, state, ctx);
  return { finding, records };
}
function drop(state, digit, refs) {
  refs.forEach((ref) => { state.candidates[H.cell(model, ref)] &= ~(1 << (digit - 1)); });
}

// A=R1C1{1,2}, B=R1C4{1,2,4}, C=R2C1{1,2,5}, D=R2C4{1,2,3}; 1 conjugate D-C in row 2 and D-B in column 4
function vector() {
  const s = blank();
  setMask(s, 'R1C1', '12');
  setMask(s, 'R1C4', '124');
  setMask(s, 'R2C1', '125');
  setMask(s, 'R2C4', '123');
  drop(s, 1, ['R2C2', 'R2C3', 'R2C5', 'R2C6', 'R2C7', 'R2C8', 'R2C9']);
  drop(s, 1, ['R3C4', 'R4C4', 'R5C4', 'R6C4', 'R7C4', 'R8C4', 'R9C4']);
  return s;
}
const v = run(vector());
console.log('vector', JSON.stringify(v.finding));
console.log(JSON.stringify(v.records));

// the same with an extra 1 in R2C7: no longer conjugate in the row
const extra = vector();
extra.candidates[H.cell(model, 'R2C7')] |= 1;
console.log('extra 1 in the row', JSON.stringify(run(extra).finding));

// swapped roles: 2 is the conjugate digit, 1 is removed from D
const swapped = blank();
setMask(swapped, 'R1C1', '12');
setMask(swapped, 'R1C4', '124');
setMask(swapped, 'R2C1', '125');
setMask(swapped, 'R2C4', '123');
drop(swapped, 2, ['R2C2', 'R2C3', 'R2C5', 'R2C6', 'R2C7', 'R2C8', 'R2C9']);
drop(swapped, 2, ['R3C4', 'R4C4', 'R5C4', 'R6C4', 'R7C4', 'R8C4', 'R9C4']);
console.log('swapped roles', JSON.stringify(run(swapped).finding));

// uniqueness not assumed
console.log('no uniqueness', JSON.stringify(run(vector(), { assumeUniqueness: false })));
