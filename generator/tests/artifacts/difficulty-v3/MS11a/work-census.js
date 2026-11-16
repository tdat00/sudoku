'use strict';
// Scratch (MS11a): the actual work, cap hits and latency of the registered uniqueRectangle on identified populations, kept
// apart from the structural bounds of structural-max.js. Populations: the states of the agreement setups of tech-wing.test.js
// (H.randomStatesWithKnownSolution, source, requested size and seed named; the "killer" and "greaterThan" populations are the
// uncaged models of the test helper, no cages and no inequalities, where the rectangles exist, not assembled-structure models)
// and the first states of the four multi-grid boards. One call = one find(model, state, ctx) of the registered finder (assuming
// uniqueness, its own limit 50000) with the observer; "second pass" counts the calls that ran it (the first pass found nothing),
// whose work is the units of the record. The latency is the wall time of the whole call in this process (not a protected
// measurement of the machine: the lock was held). With MS11A_BASE_WING set the wing engine of the base commit is loaded (no
// second pass, no record): the same populations give the latency of the unchanged first pass alone.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS11a/work-census.js [--json=<file>] [--budget=<seconds>]
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

const byKey = {};
function summarise(name, source, records, latencies, keys, requested, calls) {
  const works = records.map((r) => r.work);
  const cappedStates = [];
  records.forEach((r, i) => { if (r.capHit !== null) cappedStates.push(r.state); });
  latencies.sort((a, b) => a - b);
  const at = (q) => latencies[Math.min(latencies.length - 1, Math.floor(q * latencies.length))];
  const sorted = works.slice().sort((a, b) => a - b);
  const total = works.reduce((a, b) => a + b, 0);
  const row = { population: name, source, limit: 50000, requested, calls, secondPass: records.length, found: keys,
    capped: cappedStates.length, cappedStates,
    largestWork: works.length ? Math.max.apply(null, works) : 0, medianWork: works.length ? sorted[Math.floor(sorted.length / 2)] : 0,
    meanWork: works.length ? Number((total / works.length).toFixed(1)) : 0,
    latencyMs: { mean: Number((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(4)),
      p95: Number(at(0.95).toFixed(4)), max: Number(latencies[latencies.length - 1].toFixed(4)) } };
  console.log(JSON.stringify(row));
  return row;
}

const tech = SG.techniques.get('uniqueRectangle');
const rows = [];
populations.forEach(([name, make, n, seed]) => {
  const model = make();
  const t0 = Date.now();
  const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), n);
  const records = [];
  const latencies = [];
  const keys = {};
  let calls = 0;
  for (let i = 0; i < items.length; i++) {
    if ((Date.now() - t0) / 1000 > budgetSeconds && i > 0) break;
    const ctx = SG.techniques.createContext(model, { assumeUniqueness: true, onPatternWork: (r) => { r.state = i; records.push(r); } });
    const t1 = process.hrtime.bigint();
    const f = tech.find(model, items[i].state, ctx);
    latencies.push(Number(process.hrtime.bigint() - t1) / 1e6);
    calls++;
    if (f !== null) {
      const key = f.i18nKey.replace('technique.uniqueRectangle.', '').replace('.step', '');
      keys[key] = (keys[key] || 0) + 1;
    }
  }
  rows.push(summarise(name, 'H.randomStatesWithKnownSolution(' + model.variantId + ', rng ' + seed + ', ' + n + ')' +
    (calls < n ? ' first ' + calls + ' (time budget)' : '') +
    (name.indexOf('killer') === 0 || name.indexOf('greaterThan') === 0 ? '; uncaged / uninequalitied model of the test helper' : ''),
  records, latencies, keys, n, calls));
});

if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(rows, null, 2).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
