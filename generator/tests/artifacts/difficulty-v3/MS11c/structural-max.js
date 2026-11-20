'use strict';
// Scratch (MS11c): the structural bound of the work of one bugPlusOne call on every registered variant, against the
// limit of 50000 (an upper bound of the rule, not an observation of real states, which work-census.js records). A unit is
// one cell of one unit tallied under one proposed digit; a call proposes the three candidates of the only trivalue cell, so
// the bound is 3 x the sum of the sizes of the units (every proposal reading every unit to its end). A model with cages or
// inequalities (or a partial unit) is refused by a guard that costs nothing: its work is 0 whatever the state. Also
// measured: the constructed worst grave of each board (the last cell is the trivalue cell, the highest free digit its
// answer, so that the two refused proposals read all the units before the last one and the qualifying one reads them all)
// with the registered finder.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS11c/structural-max.js
const SG = require('./load.js');
const H = SG.techHelper;
const bit = (d) => 1 << (d - 1);

function worstGrave(model) {
  const solution = Array.from(SG.dfs.solve(model, new Int32Array(model.cellCount)));
  const cell = model.cellCount - 1;
  const free = [];
  for (let d = 1; d <= model.digits; d++) free.push(d);
  const state = SG.model.initState(model);
  for (let c = 0; c < model.cellCount; c++) {
    const s = solution[c];
    state.candidates[c] = bit(s) | bit(free[s % free.length]);
  }
  const pair = state.candidates[cell];
  const outside = free.filter((d) => (pair & bit(d)) === 0);
  state.candidates[cell] |= bit(outside[outside.length - 1]);
  const records = [];
  const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) });
  const f = SG.techniques.get('bugPlusOne').find(model, state, ctx);
  return { found: f !== null, work: records[0].work };
}

const rows = [];
SG.variants.list().forEach((def) => { if (SG.testkit.hasVariant(def.id)) rows.push([def.id, H.model(def.id)]); });
rows.push(['boxGrid 12 digits (3 x 4)', SG.fixtures.models.boxGrid('census-12', 3, 4)]);
rows.push(['boxGrid 16 digits (4 x 4)', SG.fixtures.models.boxGrid('census-16', 4, 4)]);
['classic4', 'classic6'].forEach((id) => rows.push([id, H.model(id)]));
rows.forEach(([id, model]) => {
  const sizes = model.units.reduce((a, u) => a + u.length, 0);
  const refused = model.cages.length > 0 || model.inequalities.length > 0 ||
    model.units.some((u, i) => u.length !== model.digits || model.unitMeta[i].partial);
  const row = { id, digits: model.digits, cells: model.cellCount, units: model.units.length, sumOfUnitSizes: sizes,
    structuralBound: refused ? 0 : 3 * sizes, limit: 50000, boundExceedsLimit: !refused && 3 * sizes > 50000,
    note: refused ? 'cages, inequalities or a partial unit: refused by the guard, work 0' :
      (id === 'killer' || id === 'greaterThan' ? 'uncaged / uninequalitied model of the test helper' : undefined) };
  if (!refused) {
    const worst = worstGrave(model);
    row.constructedWorstGrave = worst;
  }
  console.log(JSON.stringify(row));
});
