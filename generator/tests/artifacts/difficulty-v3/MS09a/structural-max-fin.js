'use strict';
// Scratch (MS09a): the structural maximum of work units per call of finnedXWing (n = 2) on every registered variant, and
// of the shared enumeration at n = 3 for the handoff to MS09b. One unit is a tested combination of n base lines of a
// digit and orientation: digits x (C(rows, n) + C(columns, n)), where the rows and columns are the complete units of
// that kind (every one can be a base line when it has the candidates; a line with an overlapped cell is eligible only when
// that cell is no candidate, so this is an upper bound for a multi-grid board). 0 on a board without a complete box-like
// unit (no fin box). Counted from the model's own units. Next to it the largest number of cover trials inside one unit:
// C(m, n) where m is the smaller of the number of cover lines of the other orientation and n times the length of a line (the
// covers of the candidates of the n base lines).
const SG = require('./load.js');
const H = SG.techHelper;

function choose(n, k) {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

const out = [];
SG.variants.list().forEach((def) => {
  const id = def.id;
  if (!SG.testkit.hasVariant(id)) { out.push({ id, note: 'not available' }); return; }
  const model = H.model(id);
  const complete = (u) => model.units[u].length === model.digits && !(model.unitMeta[u] && model.unitMeta[u].partial);
  const count = (kind) => model.unitMeta.filter((m, u) => m.kind === kind && complete(u)).length;
  const boxLike = model.unitMeta.filter((m, u) => (m.kind === 'box' || m.kind === 'region') && complete(u)).length;
  const rows = count('row');
  const cols = count('col');
  const lineLength = Math.max.apply(null, model.unitMeta.map((m, u) => (m.kind === 'row' || m.kind === 'col') && complete(u) ? model.units[u].length : 0));
  const row = { id, digits: model.digits, cells: model.cellCount, rows, cols, lineLength, boxLikeUnits: boxLike };
  [2, 3].forEach((n) => {
    row['units' + n] = boxLike === 0 ? 0 : model.digits * (choose(rows, n) + choose(cols, n));
    row['trialsPerUnit' + n] = boxLike === 0 ? 0 : choose(Math.min(Math.max(rows, cols), n * lineLength), n);
  });
  out.push(row);
  console.log(JSON.stringify(row));
});
const big2 = out.filter((r) => r.units2 !== undefined).reduce((a, b) => (b.units2 > a.units2 ? b : a));
const big3 = out.filter((r) => r.units3 !== undefined).reduce((a, b) => (b.units3 > a.units3 ? b : a));
console.log('largest maximum at n = 2: ' + big2.id + ' ' + big2.units2 + ' of a limit of 50000');
console.log('largest maximum at n = 3: ' + big3.id + ' ' + big3.units3 + ' (for MS09b)');
