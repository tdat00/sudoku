'use strict';
// Scratch (MS07b): where does a bounded forcing call check its parent budget? A ctx whose k-th check throws a spent
// budget exposes the work counted at that check through the pattern-work record (no production instrumentation).
// Run once with the current tech-chain.js and once with SG_CHAIN_FILE = the accepted MS07a file; compare.
// Usage: node gate-scan.js <scenario> [workLimit]
const SG = require('./load-override.js');
const H = SG.techHelper;

function ringModel(n) {
  const units = [];
  const cellRow = [];
  const cellCol = [];
  for (let i = 0; i < n; i++) { units.push([i, (i + 1) % n]); cellRow.push(0); cellCol.push(i); }
  return SG.model.create({ variantId: 'gate-ring-' + n, digits: 2, units, layout: { rows: 1, cols: n, cellRow, cellCol } });
}
// A hub cell paired with every spoke: the expansion of a hub literal has `spokes` edges.
function starModel(spokes) {
  const units = [];
  const cellRow = [];
  const cellCol = [];
  for (let i = 1; i <= spokes; i++) units.push([0, i]);
  for (let c = 0; c <= spokes; c++) { cellRow.push(0); cellCol.push(c); }
  return SG.model.create({ variantId: 'gate-star-' + spokes, digits: 2, units,
    layout: { rows: 1, cols: spokes + 1, cellRow, cellCol } });
}

function positions(m, state, opts) {
  const base = SG.techniques.createContext(m, {});
  let total = null;
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
  return { checks: free.checks, total: free.record.work, capHit: free.record.capHit, found: free.found !== null, works };
}

const scenario = process.argv[2];
const limit = process.argv[3] === undefined ? undefined : Number(process.argv[3]);
function summarize(name, r) {
  let gap = 0;
  let worst = 0;
  r.works.forEach((w, i) => { gap = w - (i === 0 ? 0 : r.works[i - 1]); worst = Math.max(worst, gap); });
  const tail = r.total - (r.works.length === 0 ? 0 : r.works[r.works.length - 1]);
  console.log(name, 'checks', r.checks, 'total work', r.total, 'capHit', r.capHit, 'found', r.found,
    'max gap', worst, 'final tail', tail, 'first', JSON.stringify(r.works.slice(0, 8)));
}
const opts = { id: 'x', minLength: 1, maxLength: Infinity };
if (limit !== undefined) opts.workLimit = limit;
if (scenario === 'ring201') {
  const m = ringModel(201);
  summarize('ring201', positions(m, SG.model.initState(m), opts));
} else if (scenario === 'star') {
  const m = starModel(Number(process.argv[4] || 300));
  summarize('star', positions(m, SG.model.initState(m), opts));
} else if (scenario === 'dense9') {
  const m9 = H.model('classic9');
  const rng = SG.testkit.rng.create(Number(process.argv[4] || 171));
  const sol = SG.testkit.randomSolution(m9, rng.fork('grid'));
  const state = SG.model.initState(m9);
  const r = rng.fork('state');
  for (let c = 0; c < 81; c++) {
    if (r.next() < 0.1) SG.constraints.assign(m9, state, c, sol[c]);
  }
  for (let c = 0; c < 81; c++) {
    if (state.value[c] !== 0) continue;
    let keep = 1 << (sol[c] - 1);
    for (let v = 1; v <= 9; v++) if (v !== sol[c] && r.next() < 0.45) keep |= 1 << (v - 1);
    state.candidates[c] &= keep;
  }
  summarize('dense9', positions(m9, state, opts));
}
