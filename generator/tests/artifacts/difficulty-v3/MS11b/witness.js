'use strict';
// Scratch (MS11b): the two constructed witnesses of SA2's ruling (four real cells on 9 digits, five on 12 digits) through
// the corrected finder: Finding, units, capped prefix (work limits 0, units - 1, units) and the in-test state of the
// partial-unit wrong-union negative.
const SG = require('./load.js');
const H = SG.techHelper;

function maskOf(digits) {
  let m = 0;
  String(digits).split('').forEach((ch) => { m |= 1 << (parseInt(ch, 10) - 1); });
  return m;
}
function blank(model, spec) {
  const state = SG.model.initState(model);
  spec.forEach((p) => { state.candidates[p[0]] = maskOf(p[1]); });
  return state;
}
function run(model, state, limit) {
  const records = [];
  const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) });
  const finding = SG.wingSearch.uniqueRectangle(model, state, ctx, limit === undefined ? undefined : { workLimit: limit });
  return { finding, record: records[0] };
}

const model9 = H.model('classic9');
const w1 = blank(model9, [[0, '12'], [3, '12'], [9, '123'], [12, '124'], [11, '74'], [15, '35'], [16, '56'], [17, '67']]);
const model12 = SG.fixtures.models.boxGrid('test-wing-12', 3, 4);
const w2 = blank(model12, [[0, '12'], [4, '12'], [12, '123'], [16, '124'], [14, '35'], [18, '56'], [19, '67'], [20, '78'],
  [21, '84']]);
const w3 = blank(model12, [[0, '12'], [4, '12'], [12, '123'], [16, '124'], [14, '35'], [18, '56'], [19, '67'], [20, '78'],
  [21, '89'], [22, '94']]);
[['9 digits, four real cells (D = 3..7)', model9, w1], ['12 digits, five real cells (D = 3..8)', model12, w2],
  ['12 digits, six real cells (D = 3..9)', model12, w3]].forEach((w) => {
  const out = run(w[1], w[2]);
  console.log(w[0] + ': ' + JSON.stringify(out.finding));
  console.log('  record ' + JSON.stringify(out.record));
  const units = out.record.work;
  [0, 1, units - 1, units].forEach((limit) => {
    const o = run(w[1], w[2], limit);
    console.log('  limit ' + limit + ': ' + (o.finding ? 'found' : 'null') + ' ' + JSON.stringify(o.record));
  });
});
