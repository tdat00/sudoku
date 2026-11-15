'use strict';

/*
 * MS09a: writes the three plans of the complete E gate for `run-shards.cjs`, each item with its own projection (IR12).
 * The shard arguments are those of MS08c's plans (the same 104 + 5 + 14 shards, with this task's evidence folder); the
 * projection of a shard is the measurement of the same shard in the final E of MS08c (docs/difficulty-v3/evidence/MS08c/
 * shard-runs.jsonl, the previous task's source), bounded as 2 x the measurement + 5 s: the finned X-Wing adds work to
 * every rating that reaches it, so a shard can cost more; a shard that exceeds its own projection is reported by the
 * driver (`withinProjection`), and the compound's admission uses the larger of the projection and its generic floor of 60 s.
 *
 *   node tests/artifacts/difficulty-v3/MS09a/make-plans.cjs
 *
 * writes plan-hashes.json (104 shards: 26 combinations x 4 five-seed shards), plan-wire.json (G09-G13) and
 * plan-analysis.json (G01-G14) next to this script.
 */
const fs = require('fs');
const path = require('path');

const GEN = path.resolve(__dirname, '..', '..', '..', '..');
const PREVIOUS = path.resolve(GEN, '..', 'docs', 'difficulty-v3', 'evidence', 'MS08c', 'shard-runs.jsonl');
const OLD_PLANS = path.resolve(__dirname, '..', 'MS08c');

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
      args: item.args.map((a) => a.replace('evidence\\MS08c\\', 'evidence\\MS09a\\')),
      projectionSeconds: Math.ceil(2 * seconds + 5),
      projectionBasis: 'MS08c final E ' + item.label + ' ' + seconds + ' s (same shard, source without the finned X-Wing); 2 x + 5 s'
    };
  });
}

const hashPlan = planOf('plan-hashes.json');
const wirePlan = planOf('plan-wire.json');
const analysisPlan = planOf('plan-analysis.json');
if (hashPlan.length !== 104 || wirePlan.length !== 5 || analysisPlan.length !== 14) throw new Error('plan sizes');
[hashPlan, wirePlan, analysisPlan].forEach((plan) => plan.forEach((item) => {
  if (item.args.some((a) => /MS08c/.test(a))) throw new Error('an argument still names MS08c: ' + item.label);
}));

const asText = (plan) => JSON.stringify(plan, null, 2).replace(/\n/g, '\r\n') + '\r\n';
fs.writeFileSync(path.join(__dirname, 'plan-hashes.json'), asText(hashPlan));
fs.writeFileSync(path.join(__dirname, 'plan-wire.json'), asText(wirePlan));
fs.writeFileSync(path.join(__dirname, 'plan-analysis.json'), asText(analysisPlan));
const sum = (plan) => plan.reduce((n, x) => n + x.projectionSeconds, 0);
console.log('hashes ' + hashPlan.length + ' shards, projections ' + sum(hashPlan) + ' s; wire ' + wirePlan.length +
  ' shards, ' + sum(wirePlan) + ' s; analysis ' + analysisPlan.length + ' shards, ' + sum(analysisPlan) + ' s');
