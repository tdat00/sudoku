'use strict';

/*
 * MS13b: writes the two plans of the E families whose required identity changed (the five GR wires and the fourteen GR
 * analyses) for `run-shards.cjs`, each item with its own projection (IR12). The shard arguments are those of MS13a's plans
 * (docs/difficulty-v3/evidence/MS13a), with this task's evidence folder; the projection of a shard is the measurement of the same
 * shard in MS13a's final E (docs/difficulty-v3/evidence/MS13a/shard-runs.jsonl, the previous task's source: the engine is
 * identical, only the Generator's UI files differ), bounded as 2 x the measurement + 5 s. The hashes are not recorded: their
 * identity (perf.js: the engine files, no `js/ui`) is unchanged, so MS13a's ledgers are merge-checked as they are.
 *
 *   node tests/artifacts/difficulty-v3/MS13b/make-plans.cjs
 *
 * writes plan-wire.json (G09-G13) and plan-analysis.json (G01-G14) next to this script.
 */
const fs = require('fs');
const path = require('path');

const GEN = path.resolve(__dirname, '..', '..', '..', '..');
const PREVIOUS = path.resolve(GEN, '..', 'docs', 'difficulty-v3', 'evidence', 'MS13a', 'shard-runs.jsonl');
const OLD_PLANS = path.resolve(__dirname, '..', 'MS13a');

const measured = {};
fs.readFileSync(PREVIOUS, 'utf8').trim().split(/\r?\n/).forEach((line) => {
  const r = JSON.parse(line);
  measured[r.label] = r.nodeSeconds;
});

function planOf(file) {
  const old = JSON.parse(fs.readFileSync(path.join(OLD_PLANS, file), 'utf8'));
  return old.map((item) => {
    const seconds = measured[item.label];
    if (typeof seconds !== 'number') throw new Error('no measurement for ' + item.label);
    return {
      label: item.label,
      args: item.args.map((a) => a.replace('evidence\\MS13a\\', 'evidence\\MS13b\\')),
      projectionSeconds: Math.ceil(2 * seconds + 5),
      projectionBasis: 'MS13a final E ' + item.label + ' ' + seconds + ' s (same shard, the previous task\'s source); 2 x + 5 s'
    };
  });
}

const wirePlan = planOf('plan-wire.json');
const analysisPlan = planOf('plan-analysis.json');
if (wirePlan.length !== 5 || analysisPlan.length !== 14) throw new Error('plan sizes');
[wirePlan, analysisPlan].forEach((plan) => plan.forEach((item) => {
  if (item.args.some((a) => /MS13a/.test(a))) throw new Error('an argument still names MS13a: ' + item.label);
}));

const asText = (plan) => JSON.stringify(plan, null, 2).replace(/\n/g, '\r\n') + '\r\n';
fs.writeFileSync(path.join(__dirname, 'plan-wire.json'), asText(wirePlan));
fs.writeFileSync(path.join(__dirname, 'plan-analysis.json'), asText(analysisPlan));
const sum = (plan) => plan.reduce((n, x) => n + x.projectionSeconds, 0);
console.log('wire ' + wirePlan.length + ' shards, projections ' + sum(wirePlan) + ' s; analysis ' + analysisPlan.length +
  ' shards, ' + sum(analysisPlan) + ' s');
