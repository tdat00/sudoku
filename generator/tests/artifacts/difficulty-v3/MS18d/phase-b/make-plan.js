#!/usr/bin/env node
'use strict';

/*
 * MS18d Phase B task-owned: writes gg-plan.json next to this script, the plan of the 104 GG hash shards for
 * run-gg.js. It is MS18c's plan-hashes.json (the same 104 shards in the same order: 26 combinations of
 * `tests/fixtures/perf-helper.js` x 4 shards of 5 seeds; the hidden diagnostic requests and the original
 * seeds are the corpus's, not this plan's) with the ledgers of this task (docs/difficulty-v3/evidence/MS18d/
 * hashes/) and a projection per shard: ceil(3 x the measurement of the same shard in MS18c's closure E +
 * 10 s), the rule of MS16 to MS18c. The measurement is a bound on a shard that executes the same engine
 * bytes except the target literals; it is not a limit for the whole run (399 s in MS18c is not a bound).
 *
 *   node generator/tests/artifacts/difficulty-v3/MS18d/phase-b/make-plan.js
 *
 * The plan is checked before it is written: 104 shards, 26 distinct combinations, each shard of 5 seeds
 * from 0, 5, 10 and 15, labels and ledger names unique, every argument naming only this task's ledgers, a
 * measurement with exit 0 for every shard. The file is created, never overwritten. It also prints the plan
 * of the compounds by projection (what the driver admits at a budget of 420 s if each shard took its whole
 * projection).
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const OLD_PLAN = path.join(REPO, 'generator', 'tests', 'artifacts', 'difficulty-v3', 'MS18c',
  'plan-hashes.json');
const OLD_RUNS = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS18c', 'closure', 'e',
  'shard-runs.jsonl');
const OUT = path.join(__dirname, 'gg-plan.json');
const OLD_DIR = 'evidence\\MS18c\\closure\\e\\hashes\\';
const NEW_DIR = 'evidence\\MS18d\\hashes\\';
const FACTOR = 3;
const BUDGET = 420;

const measured = {};
fs.readFileSync(OLD_RUNS, 'utf8').trim().split(/\r?\n/).forEach((line) => {
  const r = JSON.parse(line);
  if (/^g-hash-/.test(r.label)) measured[r.label] = r;
});

const old = JSON.parse(fs.readFileSync(OLD_PLAN, 'utf8'));
if (old.length !== 104) throw new Error('the MS18c plan has ' + old.length + ' shards, not 104');
const plan = old.map((item) => {
  const run = measured[item.label];
  if (!run || run.exit !== 0) throw new Error('no clean measurement for ' + item.label);
  return {
    label: item.label,
    args: item.args.map((a) => a.replace(OLD_DIR, NEW_DIR)),
    projectionSeconds: Math.ceil(FACTOR * run.nodeSeconds + 10),
    projectionBasis: 'MS18c closure E ' + item.label + ' ' + run.nodeSeconds + ' s (same shard); ' + FACTOR +
      ' x + 10 s'
  };
});

const keys = new Set();
const records = new Set();
plan.forEach((item) => {
  const get = (name) => {
    const hit = item.args.map((a) => new RegExp('^--hash-' + name + '=(.+)$').exec(a)).filter(Boolean);
    if (hit.length !== 1) throw new Error(item.label + ': needs one --hash-' + name);
    return hit[0][1];
  };
  if (item.args[0] !== 'tests\\perf.js' || item.args.length !== 5) throw new Error(item.label + ': shape');
  const from = Number(get('from'));
  if (get('count') !== '5' || [0, 5, 10, 15].indexOf(from) === -1) throw new Error(item.label + ': seeds');
  const record = get('record');
  const name = get('key').replace('/', '-') + '-' + String(from).padStart(2, '0') + '.json';
  if (record !== '..\\docs\\difficulty-v3\\' + NEW_DIR + name) {
    throw new Error(item.label + ': record ' + record);
  }
  if (item.label !== 'g-hash-' + name.replace(/\.json$/, '')) throw new Error(item.label + ': label');
  if (records.has(record)) throw new Error('a ledger twice: ' + record);
  records.add(record);
  keys.add(get('key'));
});
if (new Set(plan.map((x) => x.label)).size !== 104) throw new Error('a label twice');
if (keys.size !== 26) throw new Error(keys.size + ' combinations, not 26');
if (plan.some((x) => x.args.some((a) => /MS18c/.test(a)))) throw new Error('an argument names MS18c');

const planText = JSON.stringify(plan, null, 2).replace(/\n/g, '\r\n') + '\r\n';
fs.writeFileSync(OUT, planText, { encoding: 'utf8', flag: 'wx' });

let compounds = 0;
let elapsed = 0;
let size = 0;
const starts = [];
plan.forEach((item, i) => {
  if (size === 0 || elapsed + item.projectionSeconds > BUDGET) {
    compounds++;
    elapsed = 0;
    size = 0;
    starts.push(i);
  }
  elapsed += item.projectionSeconds;
  size++;
});
const sum = (list) => list.reduce((n, x) => n + x, 0);
console.log('gg-plan.json: ' + plan.length + ' shards, ' + keys.size + ' combinations, projections ' +
  sum(plan.map((x) => x.projectionSeconds)) + ' s (factor ' + FACTOR + '), measured ' +
  sum(plan.map((x) => measured[x.label].nodeSeconds)).toFixed(2) + ' s in MS18c');
console.log('by projection, at a budget of ' + BUDGET + ' s: ' + compounds + ' compound(s) from ' +
  starts.join(', '));
