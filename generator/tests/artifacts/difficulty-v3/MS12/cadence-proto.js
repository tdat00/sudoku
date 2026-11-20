'use strict';
// Scratch (MS12): numbers for the cadence tests of the restricted mode.
const SG = require('./load.js');
const H = SG.techHelper;

function ringModel(n) {
  const units = []; const cellRow = []; const cellCol = [];
  for (let i = 0; i < n; i++) { units.push([i, (i + 1) % n]); cellRow.push(0); cellCol.push(i); }
  return SG.model.create({ variantId: 'chain-ring-' + n, digits: 2, units, layout: { rows: 1, cols: n, cellRow, cellCol } });
}
function starModel(spokes) {
  const units = []; const cellRow = []; const cellCol = [];
  for (let i = 1; i <= spokes; i++) units.push([0, i]);
  for (let c = 0; c <= spokes; c++) { cellRow.push(0); cellCol.push(c); }
  return SG.model.create({ variantId: 'chain-star-' + spokes, digits: 2, units, layout: { rows: 1, cols: spokes + 1, cellRow, cellCol } });
}
function checkWorks(m, state, opts) {
  const base = SG.techniques.createContext(m, {});
  function attempt(target) {
    let k = 0; let record = null;
    const ctx = Object.assign({}, base, {
      options: { onPatternWork: (r) => { record = r; } },
      check() { k++; if (k === target) throw new SG.errors.GenerationError('budget.exceeded', { reason: 'nodes' }); }
    });
    const finding = SG.chainSearch.forcing(m, state, ctx, opts);
    return { checks: k, record, finding };
  }
  const free = attempt(0);
  const works = [];
  for (let t = 1; t <= free.checks; t++) works.push(attempt(t).record.work);
  const gaps = works.map((w, i) => w - (i === 0 ? 0 : works[i - 1]));
  gaps.push(free.record.work - (works.length === 0 ? 0 : works[works.length - 1]));
  return { works, gaps, max: Math.max(...gaps), record: free.record, finding: free.finding };
}
[40, 100, 250, 300].forEach((spokes) => {
  const m = starModel(spokes);
  const seen = checkWorks(m, SG.model.initState(m), { id: 'x', edges: 'restricted', minLength: 1, maxLength: Infinity, workLimit: 3000 });
  console.log('star', spokes, 'works', JSON.stringify(seen.works.slice(0, 8)), 'max', seen.max, 'record', JSON.stringify(seen.record));
});
const long = ringModel(201);
let seen = checkWorks(long, SG.model.initState(long), { id: 'x', edges: 'restricted', minLength: 1, maxLength: Infinity, workLimit: 600 });
console.log('ring201', JSON.stringify(seen.works), JSON.stringify(seen.gaps), JSON.stringify(seen.record));
const m3 = ringModel(3);
let r3 = SG.chainSearch.forcing(m3, SG.model.initState(m3), SG.techniques.createContext(m3, {}), { id: 'x', edges: 'restricted' });
console.log('ring3', JSON.stringify(r3));
r3 = SG.chainSearch.forcing(m3, SG.model.initState(m3), SG.techniques.createContext(m3, {}), { id: 'x' });
console.log('ring3 general', JSON.stringify(r3));
