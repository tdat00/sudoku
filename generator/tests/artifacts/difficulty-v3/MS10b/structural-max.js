'use strict';
// Scratch (MS10b): the work of wxyzWing on its worst constructed state, on every registered variant, against the limit of
// 50000 (not an observation of real states, which work-census.js records). The state is the flood: every cell holds
// {1, 2, 3, 4} (a quartet inside a unit has four restricted digits, any other has two or more unrestricted ones, so nothing is
// found and every extension is tried; it contains no WXYZ-Wing, so a count above the limit is the cost of the bounded prefix,
// not a lost deduction). The exact number of units is measured with the seam and a ceiling of 3,000,000 units
// (a larger count is reported as "more than"), next to the crude bound of the rule: every set of at most four cells of the pool
// is a prefix that is tested once, C(n,1) + C(n,2) + C(n,3) + C(n,4) for n cells. The "killer" row is the uncaged 27-unit
// model of the test helper (H.model('killer') has no cages); a model assembled with cages has more peers and is not measured here.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS10b/structural-max.js
const SG = require('./load.js');
const H = SG.techHelper;

const CEILING = 3000000;
const rows = [];
const out = [];
SG.variants.list().forEach((def) => {
  if (SG.testkit.hasVariant(def.id)) rows.push([def.id, H.model(def.id)]);
});
rows.push(['boxGrid 12 digits (3 x 4)', SG.fixtures.models.boxGrid('census-12', 3, 4)]);
rows.push(['boxGrid 16 digits (4 x 4)', SG.fixtures.models.boxGrid('census-16', 4, 4)]);
['classic4', 'classic6'].forEach((id) => rows.push([id, H.model(id)]));
const choose = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); };
rows.forEach(([id, model]) => {
  const n = model.cellCount;
  const state = SG.model.initState(model);
  for (let c = 0; c < n; c++) state.candidates[c] = 15;
  const records = [];
  const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) });
  const t0 = process.hrtime.bigint();
  const found = SG.wingSearch.wxyzWing(model, state, ctx, { workLimit: CEILING });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const r = records[0];
  const row = { id, digits: model.digits, cells: n, units: model.units.length, crudeBound: choose(n, 1) + choose(n, 2) + choose(n, 3) + choose(n, 4),
    floodUnits: r.capHit === null ? r.work : 'more than ' + CEILING, found: found !== null, limit: 50000,
    floodExceedsLimit: r.capHit !== null || r.work > 50000, ms: Number(ms.toFixed(1)),
    note: id === 'killer' ? 'uncaged 27-unit model of the test helper, not an assembled-cage model' : undefined };
  out.push(row);
  console.log(JSON.stringify(row));
});
