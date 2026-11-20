'use strict';
// Scratch (MS10a): the actual work, cap hits and latency of the registered remotePairs on identified populations, kept
// apart from the structural upper bounds of structural-max.js. Populations: the states of the agreement setups of
// tech-wing.test.js (H.randomStatesWithKnownSolution, source and seed named), the first states of the four multi-grid
// boards, and a constructed flood on every variant (every cell holds the pair {1, 2}: one component with odd cycles, the work
// is the sum of the peers). One call = one find(model, state, ctx) of the registered finder with its own limit 50000; the
// latency is the wall time of that call in this process (not a protected measurement of the machine: the lock was held).
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS10a/work-census.js [--json=<file>] [--budget=<seconds>]
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

function summarise(name, source, records, latencies, found) {
  const works = records.map((r) => r.work);
  latencies.sort((a, b) => a - b);
  const at = (q) => latencies[Math.min(latencies.length - 1, Math.floor(q * latencies.length))];
  const total = works.reduce((a, b) => a + b, 0);
  const row = { population: name, source, limit: 50000, calls: records.length, found,
    capped: records.filter((r) => r.capHit !== null).length, largestWork: Math.max.apply(null, works),
    meanWork: Number((total / works.length).toFixed(1)),
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

const tech = SG.techniques.get('remotePairs');
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
    (records.length < n ? ' first ' + records.length + ' (time budget)' : ''), records, latencies, found));
});

// The constructed flood on every variant: every cell holds {1, 2}. Work = the sum of the peers, no pair is tested.
const floods = [];
SG.variants.list().forEach((def) => { if (SG.testkit.hasVariant(def.id)) floods.push(H.model(def.id)); });
floods.push(box('census-12', 3, 4), box('census-16', 4, 4));
floods.forEach((model) => {
  const state = SG.model.initState(model);
  let peerSum = 0;
  for (let c = 0; c < model.cellCount; c++) {
    state.candidates[c] = 3;
    peerSum += model.peers[c].length;
  }
  const records = [];
  const { f, ms } = timedCall(model, state, tech, records);
  const row = summarise(model.variantId + ' flood: every cell {1, 2}', 'constructed state', records, [ms], f !== null ? 1 : 0);
  row.peerSum = peerSum;
  row.workEqualsPeerSum = records[0].work === peerSum;
  console.log('  work equals the sum of the peers (' + peerSum + '): ' + row.workEqualsPeerSum);
  rows.push(row);
});

if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(rows, null, 2).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
