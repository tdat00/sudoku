'use strict';

/*
 * MS08b (fix round, pass 2): writes the three plans of the complete E gate for `run-shards.cjs`, each item with its own
 * projection (IR12). The projection of a shard is a measurement of the same key and shard in pass 2a of this task
 * (docs/difficulty-v3/evidence/MS08b/pass-2a/shard-runs.jsonl, the same source before the locale text of the kite
 * changed), bounded as
 * 2 x the measurement + 5 s: a region now bridges, so the Jigsaw shards can cost more or less; a shard that exceeds its
 * own projection is reported by the driver (`withinProjection`), and the compound's admission uses the larger of the
 * projection and its generic floor of 60 s. The shard arguments are those of the plans of pass 1 (this folder).
 *
 *   node tests/artifacts/difficulty-v3/MS08b/make-plans.cjs
 *
 * rewrites plan-hashes.json (104 shards: 26 combinations x 4 five-seed shards), plan-wire.json (G09-G13) and
 * plan-analysis.json (G01-G14) next to this script.
 */
const fs = require('fs');
const path = require('path');

const GEN = path.resolve(__dirname, '..', '..', '..', '..');
const EVIDENCE = path.resolve(GEN, '..', 'docs', 'difficulty-v3', 'evidence', 'MS08b', 'pass-2a');
const PLANS = __dirname;

const measured = {};
fs.readFileSync(path.join(EVIDENCE, 'shard-runs.jsonl'), 'utf8').trim().split(/\r?\n/).forEach((line) => {
  const r = JSON.parse(line);
  measured[r.label] = r.nodeSeconds;
});

const plans = {};
['plan-hashes.json', 'plan-wire.json', 'plan-analysis.json'].forEach((file) => {
  plans[file] = JSON.parse(fs.readFileSync(path.join(PLANS, file), 'utf8'));
});

function planOf(file) {
  return plans[file].map((item) => {
    const seconds = measured[item.label];
    if (typeof seconds !== 'number') throw new Error('no measurement for ' + item.label);
    return {
      label: item.label,
      args: item.args,
      projectionSeconds: Math.ceil(2 * seconds + 5),
      projectionBasis: 'MS08b pass 2a ' + item.label + ' ' + seconds + ' s (box-like kite, same shard); 2 x + 5 s'
    };
  });
}

const hashPlan = planOf('plan-hashes.json');
const wirePlan = planOf('plan-wire.json');
const analysisPlan = planOf('plan-analysis.json');
if (hashPlan.length !== 104 || wirePlan.length !== 5 || analysisPlan.length !== 14) throw new Error('plan sizes');

const asText = (plan) => JSON.stringify(plan, null, 2).replace(/\n/g, '\r\n') + '\r\n';
fs.writeFileSync(path.join(__dirname, 'plan-hashes.json'), asText(hashPlan));
fs.writeFileSync(path.join(__dirname, 'plan-wire.json'), asText(wirePlan));
fs.writeFileSync(path.join(__dirname, 'plan-analysis.json'), asText(analysisPlan));
const sum = (plan) => plan.reduce((n, x) => n + x.projectionSeconds, 0);
console.log('hashes ' + hashPlan.length + ' shards, projections ' + sum(hashPlan) + ' s; wire ' + wirePlan.length +
  ' shards, ' + sum(wirePlan) + ' s; analysis ' + analysisPlan.length + ' shards, ' + sum(analysisPlan) + ' s');
