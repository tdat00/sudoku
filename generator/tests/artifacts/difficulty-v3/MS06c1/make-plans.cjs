'use strict';

/*
 * MS06c1: writes the three plans of the complete E gate for `run-shards.cjs`, each item with its own projection (IR12).
 * The projection of a shard is a measurement of the same key and shard on MS05r6a's final source (the engine of the
 * combined commit 00647f9, behaviour-identical to HEAD 1d657b1 on every default request: the evidence of
 * docs/difficulty-v3/evidence/MS05r6a/shard-runs.jsonl and runs.jsonl), bounded as 1.5 x the measurement + 2 s. MS06c1
 * wraps objectives and keeper offers only, so the bound is a margin for that; a shard that exceeds its own
 * projection is reported by the driver (`withinProjection`), and the compound's admission uses the larger of the
 * projection and its generic floor of 60 s.
 *
 *   node tests/artifacts/difficulty-v3/MS06c1/make-plans.cjs
 *
 * writes plan-hashes.json (104 shards: 26 combinations x 4 five-seed shards), plan-wire.json (G09-G13) and
 * plan-analysis.json (G01-G14) next to this script.
 */
const fs = require('fs');
const path = require('path');

const R6A = path.resolve(__dirname, '..', 'MS05r6a');
const EV5 = path.resolve(__dirname, '..', '..', '..', '..', '..', 'docs', 'difficulty-v3', 'evidence', 'MS05r6a');
const OUT = '..\\docs\\difficulty-v3\\evidence\\MS06c1\\';

function lines(file) {
  return fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
}

const measured = {};
lines(path.join(EV5, 'shard-runs.jsonl')).forEach((r) => { measured[r.label] = r.nodeSeconds; });
lines(path.join(EV5, 'runs.jsonl')).forEach((r) => { if (measured[r.label] === undefined) measured[r.label] = r.nodeSeconds; });

function bound(seconds) {
  return Math.ceil(1.5 * seconds + 2);
}

function withProjection(item, key) {
  const seconds = measured[key];
  if (typeof seconds !== 'number') throw new Error('no measurement for ' + key);
  return Object.assign({}, item, {
    projectionSeconds: bound(seconds),
    projectionBasis: 'MS05r6a ' + key + ' ' + seconds + ' s on the combined source; 1.5 x + 2 s'
  });
}

// Hash shards: the plan of MS05r6a with this task's labels and evidence paths.
const hashPlan = JSON.parse(fs.readFileSync(path.join(R6A, 'plan-hashes.json'), 'utf8')).map((item) => {
  const label = item.label.replace(/^b3-hash-/, 'g-hash-');
  const args = item.args.map((a) => a.replace(/MS05r6a/g, 'MS06c1'));
  return withProjection({ label: label, args: args }, item.label);
});
if (hashPlan.length !== 104) throw new Error('expected 104 hash shards, found ' + hashPlan.length);

const wirePlan = ['G09', 'G10', 'G11', 'G12', 'G13'].map((id) => withProjection({
  label: 'g-wire-' + id,
  args: ['tests\\replay-fixtures.js', '--ids=' + id, '--record=' + OUT + 'wire\\' + id + '.json']
}, 'b1-wire-' + id));

// Analysis shards: G07-G12 and G14 were measured inside a compound, G01-G06 and G13 alone.
const analysisKey = (id) => (measured['b2-analysis-' + id] !== undefined ? 'b2-analysis-' + id : null);
const analysisPlan = [];
for (let i = 1; i <= 14; i++) {
  const id = 'G' + String(i).padStart(2, '0');
  const key = analysisKey(id);
  analysisPlan.push(withProjection({
    label: 'g-analysis-' + id,
    args: ['tests\\replay-goldens.js', '--ids=' + id, '--record=' + OUT + 'analysis\\' + id + '.json']
  }, key));
}

const asText = (plan) => JSON.stringify(plan, null, 2).replace(/\n/g, '\r\n') + '\r\n';
fs.writeFileSync(path.join(__dirname, 'plan-hashes.json'), asText(hashPlan));
fs.writeFileSync(path.join(__dirname, 'plan-wire.json'), asText(wirePlan));
fs.writeFileSync(path.join(__dirname, 'plan-analysis.json'), asText(analysisPlan));
const sum = (plan) => plan.reduce((n, x) => n + x.projectionSeconds, 0);
console.log('hashes ' + hashPlan.length + ' shards, projections ' + sum(hashPlan) + ' s; wire ' + wirePlan.length +
  ' shards, ' + sum(wirePlan) + ' s; analysis ' + analysisPlan.length + ' shards, ' + sum(analysisPlan) + ' s');
