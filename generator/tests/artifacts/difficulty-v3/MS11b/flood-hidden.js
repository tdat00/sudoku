'use strict';
// Scratch (MS11b): the work of the third pass of uniqueRectangle on constructed floods (no pattern, many tested pairs).
const SG = require('./load.js');
const H = SG.techHelper;

function run(model, state, opts) {
  const records = [];
  const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) });
  const f = SG.wingSearch.uniqueRectangle(model, state, ctx, opts);
  return { f, records };
}
function mask(digits) {
  let m = 0;
  String(digits).split('').forEach((ch) => { m |= 1 << (parseInt(ch, 10) - 1); });
  return m;
}

const model9 = H.model('classic9');
// every cell of column 1 holds exactly {1,2}, the rest is open
const s1 = SG.model.initState(model9);
for (let r = 0; r < 9; r++) s1.candidates[r * 9] = mask('12');
const o1 = run(model9, s1);
console.log('column of pairs:', JSON.stringify(o1.f && o1.f.i18nKey), JSON.stringify(o1.records));

// every cell of row 1 and column 1 holds exactly {1,2}
const s2 = SG.model.initState(model9);
for (let i = 0; i < 9; i++) { s2.candidates[i] = mask('12'); s2.candidates[i * 9] = mask('12'); }
const o2 = run(model9, s2);
console.log('row and column of pairs:', JSON.stringify(o2.f && o2.f.i18nKey), JSON.stringify(o2.records));

// the cells of the first row and of the first column of each box hold {1,2}: floors only, other cells {1,2,3}
const s3 = SG.model.initState(model9);
for (let c = 0; c < 81; c++) s3.candidates[c] = mask('123');
for (let r = 0; r < 9; r += 3) for (let c = 0; c < 9; c += 3) s3.candidates[r * 9 + c] = mask('12');
const o3 = run(model9, s3);
console.log('one pair per box, others {1,2,3}:', JSON.stringify(o3.f && o3.f.i18nKey), JSON.stringify(o3.records));

// one pair, others {1,2,3}
const s5 = SG.model.initState(model9);
for (let r = 0; r < 9; r++) { s5.candidates[r * 9] = mask('12'); s5.candidates[r * 9 + 3] = mask('12'); s5.candidates[r * 9 + 6] = mask('12'); }
const o5 = run(model9, s5);
console.log('three columns of pairs:', JSON.stringify(o5.f && o5.f.i18nKey), JSON.stringify(o5.records));
const s6 = SG.model.initState(model9);
for (let r = 0; r < 9; r++) { s6.candidates[r * 9] = mask('12'); s6.candidates[r * 9 + 4] = mask('12'); }
const o6 = run(model9, s6);
console.log('two columns of pairs (1 and 5):', JSON.stringify(o6.f && o6.f.i18nKey), JSON.stringify(o6.records));

// single exact cell, everything else {1,2,3}
const s4 = SG.model.initState(model9);
for (let c = 0; c < 81; c++) s4.candidates[c] = mask('123');
s4.candidates[0] = mask('12');
const o4 = run(model9, s4);
console.log('one pair, others {1,2,3}:', JSON.stringify(o4.f && o4.f.i18nKey), JSON.stringify(o4.records));
