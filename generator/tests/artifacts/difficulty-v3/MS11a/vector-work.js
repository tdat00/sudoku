'use strict';
// Scratch (MS11a): the work of the vector after the cap removal.
const SG = require('./load.js');
const H = SG.techHelper;
const model9 = H.model('classic9');
function maskOf(digits) {
  let m = 0;
  String(digits).split('').forEach((ch) => { m |= 1 << (parseInt(ch, 10) - 1); });
  return m;
}
const state = SG.model.initState(model9);
[[0, '12'], [3, '12'], [9, '123'], [12, '124'], [15, '34']].forEach((p) => { state.candidates[p[0]] = maskOf(p[1]); });
const records = [];
const ctx = SG.techniques.createContext(model9, { onPatternWork: (r) => records.push(r) });
const f = SG.techniques.get('uniqueRectangle').find(model9, state, ctx);
console.log(JSON.stringify(f && f.cells), JSON.stringify(records));
console.log(Array.from(state.candidates).slice(9, 18).map((m) => m.toString(2)).join(' '));
