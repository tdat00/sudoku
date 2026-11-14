'use strict';

/*
 * MS07b: writes the three plans of the complete E gate for `run-shards.cjs`, each item with its own projection (IR12).
 * The projection of a shard is a measurement of the same key and shard in MS06c2's complete run on its source (the
 * behaviour before the chain windows: docs/difficulty-v3/evidence/MS06c2/shard-runs.jsonl), bounded as 2 x the
 * measurement + 5 s: the new ids and the Hell 1 tier change puzzles, so a shard can cost more or less; a shard that
 * exceeds its own projection is reported by the driver (`withinProjection`), and the compound's admission uses the
 * larger of the projection and its generic floor of 60 s. The shard arguments are those of MS06c2's plans with this
 * task's evidence folder.
 *
 *   node tests/artifacts/difficulty-v3/MS07b/make-plans.cjs
 *
 * writes plan-hashes.json (104 shards: 26 combinations x 4 five-seed shards), plan-wire.json (G09-G13) and
 * plan-analysis.json (G01-G14) next to this script, from the base-plan-*.json copies of MS06c2's plans.
 */
const fs = require('fs');
const path = require('path');

const EVIDENCE = path.resolve(__dirname, '..', '..', '..', '..', '..', 'docs', 'difficulty-v3', 'evidence', 'MS06c2');

const measured = {};
fs.readFileSync(path.join(EVIDENCE, 'shard-runs.jsonl'), 'utf8').trim().split(/\r?\n/).forEach((line) => {
  const r = JSON.parse(line);
  measured[r.label] = r.nodeSeconds;
});

function planOf(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8')).map((item) => {
    const seconds = measured[item.label];
    if (typeof seconds !== 'number') throw new Error('no measurement for ' + item.label);
    return {
      label: item.label,
      args: item.args.map((a) => a.replace(/MS06c2/g, 'MS07b')),
      projectionSeconds: Math.ceil(2 * seconds + 5),
      projectionBasis: 'MS06c2 ' + item.label + ' ' + seconds + ' s before the chain windows; 2 x + 5 s'
    };
  });
}

const hashPlan = planOf('base-plan-hashes.json');
const wirePlan = planOf('base-plan-wire.json');
const analysisPlan = planOf('base-plan-analysis.json');
if (hashPlan.length !== 104 || wirePlan.length !== 5 || analysisPlan.length !== 14) throw new Error('plan sizes');

const asText = (plan) => JSON.stringify(plan, null, 2).replace(/\n/g, '\r\n') + '\r\n';
fs.writeFileSync(path.join(__dirname, 'plan-hashes.json'), asText(hashPlan));
fs.writeFileSync(path.join(__dirname, 'plan-wire.json'), asText(wirePlan));
fs.writeFileSync(path.join(__dirname, 'plan-analysis.json'), asText(analysisPlan));
const sum = (plan) => plan.reduce((n, x) => n + x.projectionSeconds, 0);
console.log('hashes ' + hashPlan.length + ' shards, projections ' + sum(hashPlan) + ' s; wire ' + wirePlan.length +
  ' shards, ' + sum(wirePlan) + ' s; analysis ' + analysisPlan.length + ' shards, ' + sum(analysisPlan) + ' s');
