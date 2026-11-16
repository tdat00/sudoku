'use strict';
// Scratch (MS11c): the actual work, cap hits and latency of the registered bugPlusOne on identified populations, kept apart
// from the structural bounds of structural-max.js. Populations: the states of the agreement setups of tech-wing.test.js
// (H.randomStatesWithKnownSolution, source, requested size and seed named; the "killer" and "greaterThan" populations are the
// uncaged / uninequalitied models of the test helper, no cages and no inequalities, not assembled-structure models) and the
// first states of the four multi-grid boards. One call = one find(model, state, ctx) of the registered finder (assuming
// uniqueness, limit 50000) with the observer; it must report exactly one record with the id bugPlusOne (any other count or id is
// an error of this script). "tallied" counts the calls whose guard passed (work above 0, a call that tallies cells), "found"
// the calls that returned a Finding. The latency is the wall time of the whole call in this process (not a protected measurement
// of the machine: the lock was held).
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS11c/work-census.js [--json=<file>] [--budget=<seconds>]
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

const tech = SG.techniques.get('bugPlusOne');
const rows = [];
let totalCalls = 0;
populations.forEach(([name, make, n, seed]) => {
  const model = make();
  const t0 = Date.now();
  const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), n);
  const works = [];
  const cappedStates = [];
  const latencies = [];
  let found = 0;
  let calls = 0;
  for (let i = 0; i < items.length; i++) {
    if ((Date.now() - t0) / 1000 > budgetSeconds && i > 0) break;
    const own = [];
    const ctx = SG.techniques.createContext(model, { assumeUniqueness: true, onPatternWork: (r) => own.push(r) });
    const t1 = process.hrtime.bigint();
    const f = tech.find(model, items[i].state, ctx);
    latencies.push(Number(process.hrtime.bigint() - t1) / 1e6);
    calls++;
    if (own.length !== 1 || own[0].id !== 'bugPlusOne') {
      throw new Error('state #' + i + ' of ' + name + ': ' + own.length + ' records ' + JSON.stringify(own.map((r) => r.id)));
    }
    works.push(own[0].work);
    if (own[0].capHit !== null) cappedStates.push(i);
    if (f !== null) found++;
  }
  totalCalls += calls;
  latencies.sort((a, b) => a - b);
  const at = (q) => latencies[Math.min(latencies.length - 1, Math.floor(q * latencies.length))];
  const tallied = works.filter((w) => w > 0);
  const row = { population: name,
    source: 'H.randomStatesWithKnownSolution(' + model.variantId + ', rng ' + seed + ', ' + n + ')' +
      (calls < n ? ' first ' + calls + ' (time budget)' : '') +
      (name.indexOf('killer') === 0 || name.indexOf('greaterThan') === 0 ? '; uncaged / uninequalitied model of the test helper' : ''),
    limit: 50000, requested: n, calls, tallied: tallied.length, found, capped: cappedStates.length, cappedStates,
    largestWork: works.length ? Math.max.apply(null, works) : 0,
    meanWorkAllCalls: Number((works.reduce((a, b) => a + b, 0) / Math.max(1, works.length)).toFixed(2)),
    latencyMs: { mean: Number((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(4)),
      p95: Number(at(0.95).toFixed(4)), max: Number(latencies[latencies.length - 1].toFixed(4)) } };
  console.log(JSON.stringify(row));
  rows.push(row);
});
console.log('sampled finder calls ' + totalCalls + ', tallied ' + rows.reduce((a, r) => a + r.tallied, 0) + ', found ' +
  rows.reduce((a, r) => a + r.found, 0) + ', capped ' + rows.reduce((a, r) => a + r.capped, 0) + ', largest work ' +
  Math.max.apply(null, rows.map((r) => r.largestWork)));
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(rows, null, 2).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
