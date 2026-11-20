'use strict';
// Scratch (MS11a): a flood row for the uncapped type 3 on 16 digits: row 1 holds, besides the roofs R1C1 {1,2,3} and
// R1C9 {1,2,4} (floors R2C1, R2C9 {1,2}), a cycle of 14 pairs over the digits {1,2,5..16}, so that no subset has k + 1
// digits with the extras {3,4} and nothing is found; how many units does it cost?
const SG = require('./load.js');
const model16 = SG.fixtures.models.boxGrid('test-wing-16', 4, 4);
function maskOfDigits(digits) {
  let m = 0;
  digits.forEach((d) => { m |= 1 << (d - 1); });
  return m;
}
const D = 16;
const cycle = [1, 2, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
function flood(rows, shift) {
  const state = SG.model.initState(model16);
  for (let n = 0; n < rows; n++) {
    const rowR = 4 * n;
    const roofA = rowR * D;
    const roofB = rowR * D + 8;
    state.candidates[(rowR + 1) * D] = maskOfDigits([1, 2]);
    state.candidates[(rowR + 1) * D + 8] = maskOfDigits([1, 2]);
    state.candidates[roofA] = maskOfDigits([1, 2, 3]);
    state.candidates[roofB] = maskOfDigits([1, 2, 4]);
    let i = n * shift;
    for (let c = 0; c < D; c++) {
      const cell = rowR * D + c;
      if (cell === roofA || cell === roofB) continue;
      state.candidates[cell] = maskOfDigits([cycle[i % 14], cycle[(i + 1) % 14]]);
      i++;
    }
  }
  return state;
}
[[1, 0], [2, 1], [3, 1], [3, 5]].forEach((cfg) => {
  const state = flood(cfg[0], cfg[1]);
  const records = [];
  const ctx = SG.techniques.createContext(model16, { onPatternWork: (r) => records.push(r) });
  const t0 = process.hrtime.bigint();
  const f = SG.techniques.get('uniqueRectangle').find(model16, state, ctx);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log('rows ' + cfg[0] + ' shift ' + cfg[1] + ': ' + (f ? 'FINDING ' + f.i18nKey : 'null') + ' ' + JSON.stringify(records) +
    ' ' + ms.toFixed(1) + ' ms');
});
