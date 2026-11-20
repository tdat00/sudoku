'use strict';
// Scratch (MS11b): the actual work, cap hits and latency of the registered uniqueRectangle on identified populations, kept
// apart from the structural bounds of structural-max.js. Populations: the states of the agreement setups of tech-wing.test.js
// (H.randomStatesWithKnownSolution, source, requested size and seed named; the "killer" and "greaterThan" populations are the
// uncaged / uninequalitied models of the test helper, no cages and no inequalities, where the rectangles exist, not
// assembled-structure models) and the first states of the four multi-grid boards. One call = one find(model, state, ctx) of
// the registered finder (assuming uniqueness, each bounded pass with its own limit 50000) with the observer, counted once as a
// finder call. A call reports 0 records (the first pass found something), 1 (the second pass returned a Finding or spent the
// budget) or 2 (the second pass found nothing and the hidden pass ran), both with the id uniqueRectangle, the second pass
// first; any other count or id is an error of this script. "secondPass" and "hiddenPass" count the executions, their caps and
// their work apart (a pass is compared with its own limit, never with a sum). The latency is the wall time of the whole call
// in this process, including the first pass and the tables built on the first call of a model (not a protected measurement of
// the machine: the lock was held). With MS11b_BASE_WING=git:<commit> the wing engine of that commit is read from git (in
// memory, nothing is written) instead of the tree's: `git:ef95fc5`, the base commit of MS11b, already has the first and the
// second pass (one record per call that ran the second pass, no hidden form), so the same populations give the whole-call
// latency without the hidden pass; the hidden columns are then empty.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS11b/work-census.js [--json=<file>] [--budget=<seconds>]
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
function stats(list) {
  const works = list.map((r) => r.work);
  const sorted = works.slice().sort((a, b) => a - b);
  const total = works.reduce((a, b) => a + b, 0);
  const cappedStates = list.filter((r) => r.capHit !== null).map((r) => r.state);
  return { calls: list.length, capped: cappedStates.length, cappedStates,
    largestWork: works.length ? Math.max.apply(null, works) : 0, medianWork: works.length ? sorted[Math.floor(sorted.length / 2)] : 0,
    meanWork: works.length ? Number((total / works.length).toFixed(1)) : 0 };
}
function summarise(name, source, records, hidden, latencies, keys, requested, calls) {
  latencies.sort((a, b) => a - b);
  const at = (q) => latencies[Math.min(latencies.length - 1, Math.floor(q * latencies.length))];
  const second = stats(records);
  const third = stats(hidden);
  const row = { population: name, source, limit: 50000, requested, calls, secondPass: second.calls, found: keys,
    capped: second.capped, cappedStates: second.cappedStates,
    largestWork: second.largestWork, medianWork: second.medianWork, meanWork: second.meanWork,
    hiddenPass: { limit: 50000, calls: third.calls, capped: third.capped, cappedStates: third.cappedStates,
      largestWork: third.largestWork, medianWork: third.medianWork, meanWork: third.meanWork },
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
  const hidden = [];
  const latencies = [];
  const keys = {};
  let calls = 0;
  for (let i = 0; i < items.length; i++) {
    if ((Date.now() - t0) / 1000 > budgetSeconds && i > 0) break;
    const own = [];
    const ctx = SG.techniques.createContext(model, { assumeUniqueness: true, onPatternWork: (r) => { r.state = i; own.push(r); } });
    const t1 = process.hrtime.bigint();
    const f = tech.find(model, items[i].state, ctx);
    latencies.push(Number(process.hrtime.bigint() - t1) / 1e6);
    calls++;
    // the second pass reports first, the hidden pass second (only when the second pass found nothing); 0 records: the first
    // pass found something; anything else is an error of the finder or of this script
    if (own.length > 2 || own.some((r) => r.id !== 'uniqueRectangle')) {
      throw new Error('state #' + i + ' of ' + name + ': ' + own.length + ' records ' + JSON.stringify(own.map((r) => r.id)));
    }
    if (own.length > 0) records.push(own[0]);
    if (own.length > 1) hidden.push(own[1]);
    if (f !== null) {
      const key = f.i18nKey.replace('technique.uniqueRectangle.', '').replace('.step', '');
      keys[key] = (keys[key] || 0) + 1;
    }
  }
  rows.push(summarise(name, 'H.randomStatesWithKnownSolution(' + model.variantId + ', rng ' + seed + ', ' + n + ')' +
    (calls < n ? ' first ' + calls + ' (time budget)' : '') +
    (name.indexOf('killer') === 0 || name.indexOf('greaterThan') === 0 ? '; uncaged / uninequalitied model of the test helper' : ''),
  records, hidden, latencies, keys, n, calls));
});

if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(rows, null, 2).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
