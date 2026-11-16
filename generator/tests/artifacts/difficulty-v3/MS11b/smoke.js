'use strict';
// Scratch (MS11b): the brief's vectors through the registered finder, a few states, no loops.
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

// type 3: floors R1C1/R1C4 {1,2}, roofs R2C1 {1,2,3}, R2C4 {1,2,4}, a real cell R2C7 {3,4}
const t3 = blank();
setMask(t3, 'R1C1', '12');
setMask(t3, 'R1C4', '12');
setMask(t3, 'R2C1', '123');
setMask(t3, 'R2C4', '124');
setMask(t3, 'R2C7', '34');
const o3 = run(t3);
console.log(JSON.stringify(o3.finding));
console.log(JSON.stringify(o3.records));

// type 4: 1 only in the two roofs of row 2, floors R1C1/R1C4 {1,2}, roofs R2C1 {1,2,3}, R2C4 {1,2,4}
const t4 = blank();
setMask(t4, 'R1C1', '12');
setMask(t4, 'R1C4', '12');
setMask(t4, 'R2C1', '123');
setMask(t4, 'R2C4', '124');
for (let c = 0; c < 9; c++) {
  if (c !== 0 && c !== 3) t4.candidates[9 + c] &= ~1;
}
const o4 = run(t4);
console.log(JSON.stringify(o4.finding));
console.log(JSON.stringify(o4.records));
