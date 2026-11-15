'use strict';
// Scratch (MS09b): the actual work, cap hits and latency of the registered finnedSwordfish on identified populations, kept
// apart from the structural upper bounds of structural-max-fin.js. Populations: the states of the agreement setups of
// tech-fish.test.js (H.randomStatesWithKnownSolution, source and seed named), and for the four multi-grid boards a
// bounded set of those states plus two constructed floods (one digit open in every cell; every digit open in every cell,
// the blank board). One call = one find(model, state, ctx) of the registered finder with its own limit 50000; the
// latency is the wall time of that call in this process (not a protected measurement of the machine: the lock was held).
// Usage (from generator/):
//   node tests/artifacts/difficulty-v3/MS09b/work-census-n3.js [--json=<file>] [--only=<name,name>] [--budget=<seconds>]
const fs = require('fs');
const SG = require('./load.js');
const H = SG.techHelper;

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const hit = args.find((a) => a.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const jsonOut = opt('json', null);
const only = opt('only', null) ? opt('only', null).split(',') : null;
const budgetSeconds = Number(opt('budget', 40));

function buildGrid(variantId, boxRows, boxCols) {
  const D = boxRows * boxCols;
  const n = D * D;
  const cellRow = new Int32Array(n);
  const cellCol = new Int32Array(n);
  const cellRegion = new Int32Array(n);
  const units = [];
  const unitMeta = [];
  for (let r = 0; r < D; r++) {
    for (let c = 0; c < D; c++) {
      cellRow[r * D + c] = r;
      cellCol[r * D + c] = c;
      cellRegion[r * D + c] = Math.floor(r / boxRows) * (D / boxCols) + Math.floor(c / boxCols);
    }
  }
  for (let r = 0; r < D; r++) {
    units.push(Array.from({ length: D }, (_, c) => r * D + c));
    unitMeta.push({ kind: 'row', gridIndex: 0, label: 'R' + (r + 1) });
  }
  for (let c = 0; c < D; c++) {
    units.push(Array.from({ length: D }, (_, r) => r * D + c));
    unitMeta.push({ kind: 'col', gridIndex: 0, label: 'C' + (c + 1) });
  }
  for (let b = 0; b < D; b++) {
    const top = Math.floor(b / (D / boxCols)) * boxRows;
    const left = (b % (D / boxCols)) * boxCols;
    const cells = [];
    for (let r = 0; r < boxRows; r++) for (let c = 0; c < boxCols; c++) cells.push((top + r) * D + left + c);
    units.push(cells);
    unitMeta.push({ kind: 'box', gridIndex: 0, label: 'B' + (b + 1) });
  }
  return SG.model.create({ variantId, digits: D, cellCount: n, units, unitMeta,
    layout: { rows: D, cols: D, cellRow, cellCol, cellRegion } });
}

const populations = [
  ['classic9 seed 99', () => H.model('classic9'), 1200, 99], ['classic9 seed 777', () => H.model('classic9'), 400, 777],
  ['classic9 seed 20260101', () => H.model('classic9'), 300, 20260101], ['classic6 seed 777', () => H.model('classic6'), 400, 777],
  ['classic4 seed 777', () => H.model('classic4'), 300, 777], ['fishTest12 seed 2026', () => buildGrid('fishTest12', 3, 4), 60, 2026],
  ['fishTest16 seed 2026', () => buildGrid('fishTest16', 4, 4), 32, 2026]
];
['diagonalX', 'hyper', 'jigsaw9', 'killer', 'greaterThan', 'wordoku'].forEach((v) => {
  if (SG.testkit.hasVariant(v)) populations.push([v + ' seed 4242', () => H.model(v), 120, 4242]);
});
['samurai', 'sohei', 'butterfly', 'flower'].forEach((v) => {
  if (!SG.testkit.hasVariant(v)) return;
  populations.push([v + ' seed 4242', () => H.model(v), 12, 4242]);
  populations.push([v + ' seed 777', () => H.model(v), 12, 777]);
});

function summarise(name, source, model, records, latencies, found) {
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

const tech = SG.techniques.get('finnedSwordfish');
const rows = [];
populations.forEach(([name, make, n, seed]) => {
  if (only && !only.some((o) => name.indexOf(o) !== -1)) return;
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
    (records.length < n ? ' first ' + records.length + ' (time budget)' : ''), model, records, latencies, found));
});

// The constructed floods on the four multi-grid boards: one digit open in every cell, and every digit open in every cell.
['samurai', 'sohei', 'butterfly', 'flower'].forEach((v) => {
  if (!SG.testkit.hasVariant(v)) return;
  const model = H.model(v);
  [['one digit open everywhere', () => {
    const s = H.makeState(model, '.'.repeat(model.cellCount), { propagate: false });
    for (let c = 0; c < model.cellCount; c++) s.candidates[c] = 1;
    return s;
  }], ['the blank board, every digit open', () => H.makeState(model, '.'.repeat(model.cellCount), { propagate: false })]]
    .forEach(([label, build]) => {
      const name = v + ' flood: ' + label;
      if (only && !only.some((o) => name.indexOf(o) !== -1)) return;
      const records = [];
      const { f, ms } = timedCall(model, build(), tech, records);
      rows.push(summarise(name, 'constructed state (' + label + ')', model, records, [ms], f !== null ? 1 : 0));
    });
});

if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(rows, null, 2).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
