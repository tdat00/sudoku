'use strict';
// Scratch (MS10b): the actual work, cap hits and latency of the registered wxyzWing on identified populations, kept
// apart from the structural bounds of structural-max.js. Populations: the states of the agreement setups of
// tech-wing.test.js (H.randomStatesWithKnownSolution, source, requested size and seed named; the "killer" population is
// the uncaged 27-unit model of the test helper, not an assembled-cage model) and the first states of the four multi-grid
// boards; and, kept apart as constructed calls, a flood on every variant (every cell holds {1, 2, 3, 4}). A flood
// contains no WXYZ-Wing (two cells that do not see each other make all four digits non-restricted, and a quartet of
// mutual peers is a naked quad), so its cap hit shows the cost of the bounded prefix, never a lost deduction and never
// a cap rate of real puzzles. One call = one find(model, state, ctx) of the registered finder with its own limit 50000;
// the latency is the wall time of that call in this process (not a protected measurement of the machine: the lock was
// held). Every row has the requested and the actual number of calls, the indices (within the population) of the capped
// states, the calls that found a pattern, the work (largest, median, mean) and the latency.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS10b/work-census.js [--json=<file>] [--budget=<seconds>]
const fs = require('fs');
const SG = require('./load.js');
const H = SG.techHelper;

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const hit = args.find((a) => a.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const jsonOut = opt('json', null);
const budgetSeconds = Number(opt('budget', 40));
const box = (name, r, c) => SG.fixtures.models.boxGrid(name, r, c);

const populations = [
  ['classic9 seed 99', () => H.model('classic9'), 1600, 99], ['classic9 seed 777', () => H.model('classic9'), 1600, 777],
  ['classic9 seed 20260101', () => H.model('classic9'), 300, 20260101], ['classic6 seed 777', () => H.model('classic6'), 600, 777],
  ['classic4 seed 777', () => H.model('classic4'), 400, 777], ['12 digits seed 2026', () => box('census-12', 3, 4), 160, 2026],
  ['16 digits seed 2026', () => box('census-16', 4, 4), 12, 2026]
];
['diagonalX', 'hyper', 'jigsaw9', 'killer', 'greaterThan', 'wordoku'].forEach((v) => {
  if (SG.testkit.hasVariant(v)) populations.push([v + ' seed 4242', () => H.model(v), 400, 4242]);
});
['samurai', 'sohei', 'butterfly', 'flower'].forEach((v) => {
  if (!SG.testkit.hasVariant(v)) return;
  populations.push([v + ' seed 4242', () => H.model(v), 12, 4242]);
  populations.push([v + ' seed 777', () => H.model(v), 12, 777]);
});

function summarise(name, source, records, latencies, found, requested) {
  const works = records.map((r) => r.work);
  const cappedStates = [];
  records.forEach((r, i) => { if (r.capHit !== null) cappedStates.push(i); });
  latencies.sort((a, b) => a - b);
  const at = (q) => latencies[Math.min(latencies.length - 1, Math.floor(q * latencies.length))];
  const total = works.reduce((a, b) => a + b, 0);
  const sorted = works.slice().sort((a, b) => a - b);
  const row = { population: name, source, limit: 50000, requested, calls: records.length, found,
    capped: cappedStates.length, cappedStates, largestWork: Math.max.apply(null, works),
    medianWork: sorted[Math.floor(sorted.length / 2)], meanWork: Number((total / works.length).toFixed(1)),
    latencyMs: { mean: Number((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(3)),
      p95: Number(at(0.95).toFixed(3)), max: Number(latencies[latencies.length - 1].toFixed(3)) } };
  console.log(JSON.stringify(row));
  return row;
}

function timedCall(model, state, tech, records) {
  const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) });
  const t0 = process.hrtime.bigint();
  const f = tech.find(model, state, ctx);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return { f, ms };
}

const tech = SG.techniques.get('wxyzWing');
const rows = [];
populations.forEach(([name, make, n, seed]) => {
  const model = make();
  const t0 = Date.now();
  const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), n);
  const records = [];
  const latencies = [];
  let found = 0;
  for (let i = 0; i < items.length; i++) {
    if ((Date.now() - t0) / 1000 > budgetSeconds && i > 0) break;
    const { f, ms } = timedCall(model, items[i].state, tech, records);
    latencies.push(ms);
    if (f !== null) found++;
  }
  rows.push(summarise(name, 'H.randomStatesWithKnownSolution(' + model.variantId + ', rng ' + seed + ', ' + n + ')' +
    (records.length < n ? ' first ' + records.length + ' (time budget)' : '') +
    (name.indexOf('killer') === 0 ? '; uncaged 27-unit model of the test helper, no cages' : ''),
  records, latencies, found, n));
});

// The constructed flood on every variant: every cell holds {1, 2, 3, 4}. It has no WXYZ-Wing; a cap hit is the cost of the
// bounded prefix, not a lost deduction and not a rate of real puzzles.
const floods = [];
SG.variants.list().forEach((def) => { if (SG.testkit.hasVariant(def.id)) floods.push(H.model(def.id)); });
floods.push(box('census-12', 3, 4), box('census-16', 4, 4));
floods.forEach((model) => {
  if (model.digits < 4) return;
  const state = SG.model.initState(model);
  for (let c = 0; c < model.cellCount; c++) state.candidates[c] = 15;
  const records = [];
  const { f, ms } = timedCall(model, state, tech, records);
  rows.push(summarise(model.variantId + ' flood: every cell {1, 2, 3, 4}', 'constructed state (no WXYZ-Wing in it)', records,
    [ms], f !== null ? 1 : 0, 1));
});

if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(rows, null, 2).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
