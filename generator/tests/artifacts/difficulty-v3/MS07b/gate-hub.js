'use strict';
// Scratch (MS07b): a hub with spokes and an odd triangle among the last cells: the proof is met inside an oversized
// expansion (index >= 256), which a bounded call splits into pieces.
const SG = require('./load-override.js');

function hubModel(spokes) {
  const units = [];
  const cellRow = [];
  const cellCol = [];
  for (let i = 1; i <= spokes - 2; i++) units.push([0, i]);
  const a = spokes - 1;
  const b = spokes;
  units.push([0, a], [a, b], [b, 0]);
  for (let c = 0; c <= spokes; c++) { cellRow.push(0); cellCol.push(c); }
  return SG.model.create({ variantId: 'gate-hub-' + spokes, digits: 2, units,
    layout: { rows: 1, cols: spokes + 1, cellRow, cellCol } });
}

function positions(m, state, opts) {
  const base = SG.techniques.createContext(m, {});
  function run(target) {
    let k = 0;
    let record = null;
    const ctx = Object.assign({}, base, {
      options: { onPatternWork: (r) => { record = r; } },
      check: () => { k++; if (k === target) throw new SG.errors.GenerationError('budget.exceeded', { reason: 'nodes' }); }
    });
    const found = SG.chainSearch.forcing(m, state, ctx, opts);
    return { checks: k, record, found };
  }
  const free = run(0);
  const works = [];
  for (let t = 1; t <= free.checks; t++) works.push(run(t).record.work);
  return { checks: free.checks, record: free.record, found: free.found, works };
}

const spokes = Number(process.argv[2] || 300);
const m = hubModel(spokes);
const state = SG.model.initState(m);
[{ workLimit: null }, { workLimit: undefined }].forEach((extra) => {
  const opts = Object.assign({ id: 'x', minLength: 1, maxLength: 12 }, extra);
  const r = positions(m, state, opts);
  const f = r.found;
  console.log(JSON.stringify(extra), 'checks', r.checks, 'work', r.record.work, 'limit', r.record.limit,
    'found', f && { len: f.i18nArgs.length, kind: f.i18nArgs.kind, el: f.eliminations, pl: f.placements },
    'first works', JSON.stringify(r.works.slice(0, 12)), 'max', Math.max.apply(null, r.works.map((w, i) => w - (i ? r.works[i - 1] : 0))));
});
