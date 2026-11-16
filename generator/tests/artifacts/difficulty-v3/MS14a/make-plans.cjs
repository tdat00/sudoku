'use strict';

/*
 * MS14a: writes the three plans of the complete E gate for `run-shards.cjs`, each item with its own projection (IR12). The shard
 * arguments are those of MS13a's plans (the same 104 + 5 + 14 shards) with this task's evidence folder; the projection of a shard
 * is the measurement of the same shard in the last final E that recorded it (docs/difficulty-v3/evidence/MS13b/shard-runs.jsonl
 * for the wires and the analyses, MS13a's for the 520 hashes, which MS13b did not record), bounded as 2 x the measurement + 5 s.
 * This task's kernel is inactive (no registered finder reads it), so a shard is expected to cost what it cost there; a shard that
 * exceeds its own projection is reported by the driver (`withinProjection`), and the compound's admission uses the larger of the
 * projection and its generic floor of 60 s.
 *
 *   node tests/artifacts/difficulty-v3/MS14a/make-plans.cjs
 *
 * writes plan-hashes.json (104 shards: 26 combinations x 4 five-seed shards), plan-wire.json (G09-G13) and plan-analysis.json
 * (G01-G14) next to this script.
 */
const fs = require('fs');
const path = require('path');

const GEN = path.resolve(__dirname, '..', '..', '..', '..');
const EVIDENCE = path.resolve(GEN, '..', 'docs', 'difficulty-v3', 'evidence');
const OLD_PLANS = path.resolve(__dirname, '..', 'MS13a');

function measurements(task) {
  const out = {};
  fs.readFileSync(path.join(EVIDENCE, task, 'shard-runs.jsonl'), 'utf8').trim().split(/\r?\n/).forEach((line) => {
    const r = JSON.parse(line);
    out[r.label] = r.nodeSeconds;
  });
  return out;
}

function planOf(file, task) {
  const measured = measurements(task);
  const old = JSON.parse(fs.readFileSync(path.join(OLD_PLANS, file), 'utf8'));
  return old.map((item) => {
    const seconds = measured[item.label];
    if (typeof seconds !== 'number') throw new Error('no measurement for ' + item.label + ' in ' + task);
    return {
      label: item.label,
      args: item.args.map((a) => a.replace('evidence\\MS13a\\', 'evidence\\MS14a\\')),
      projectionSeconds: Math.ceil(2 * seconds + 5),
      projectionBasis: task + ' final E ' + item.label + ' ' + seconds + ' s (same shard, the previous recording of it); 2 x + 5 s'
    };
  });
}

const hashPlan = planOf('plan-hashes.json', 'MS13a');
const wirePlan = planOf('plan-wire.json', 'MS13b');
const analysisPlan = planOf('plan-analysis.json', 'MS13b');
if (hashPlan.length !== 104 || wirePlan.length !== 5 || analysisPlan.length !== 14) throw new Error('plan sizes');
[hashPlan, wirePlan, analysisPlan].forEach((plan) => plan.forEach((item) => {
  if (item.args.some((a) => /MS13a/.test(a))) throw new Error('an argument still names MS13a: ' + item.label);
}));

const asText = (plan) => JSON.stringify(plan, null, 2).replace(/\n/g, '\r\n') + '\r\n';
fs.writeFileSync(path.join(__dirname, 'plan-hashes.json'), asText(hashPlan));
fs.writeFileSync(path.join(__dirname, 'plan-wire.json'), asText(wirePlan));
fs.writeFileSync(path.join(__dirname, 'plan-analysis.json'), asText(analysisPlan));
const sum = (plan) => plan.reduce((n, x) => n + x.projectionSeconds, 0);
console.log('hashes ' + hashPlan.length + ' shards, projections ' + sum(hashPlan) + ' s; wire ' + wirePlan.length +
  ' shards, ' + sum(wirePlan) + ' s; analysis ' + analysisPlan.length + ' shards, ' + sum(analysisPlan) + ' s');
