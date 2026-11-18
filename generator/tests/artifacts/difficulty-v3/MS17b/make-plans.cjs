'use strict';

/*
 * MS17b: writes the three plans of the complete E gate for `run-shards.cjs`, each item with its own projection (IR12). The shard
 * arguments are those of the latest plans of each family with this task's evidence folder: the five wires and the fourteen analyses
 * from MS17a's plans, the 104 hash shards (26 combinations x 4 shards of 5 seeds) from MS16's plans, because MS17a retained MS16's
 * hash ledgers and did not record that family. The projection of a shard is the measurement of the same shard in the evidence of
 * the task whose plan it comes from (MS17a's final E for the wires and analyses, MS16's final E for the hashes: the top-level
 * shard-runs.jsonl records), bounded as FACTOR x the measurement + 10 s, FACTOR 3 (an environment variable overrides it), the rule of
 * MS16 and MS17a. The version literal of difficulty.js and cache.js are the only included bytes that differ from those sources
 * (MS17a's last included bytes are the base of this task; MS16's engine bytes are identical in every file the shards execute), so
 * the generation work of every shard is that of the measurement; a shard that exceeds its own projection is reported by the driver
 * (`withinProjection`), and the compound's admission uses the larger of the projection and its generic floor of 60 s.
 *
 *   node tests/artifacts/difficulty-v3/MS17b/make-plans.cjs
 *
 * writes plan-wire.json (G09-G13), plan-analysis.json (G01-G14) and plan-hashes.json (104 shards) next to this script.
 */
const fs = require('fs');
const path = require('path');

const GEN = path.resolve(__dirname, '..', '..', '..', '..');
const EVIDENCE = path.resolve(GEN, '..', 'docs', 'difficulty-v3', 'evidence');
const ARTIFACTS = path.resolve(__dirname, '..');
const FACTOR = Number(process.env.FACTOR || 3);

function measurements(task) {
  const out = {};
  fs.readFileSync(path.join(EVIDENCE, task, 'shard-runs.jsonl'), 'utf8').trim().split(/\r?\n/).forEach((line) => {
    const r = JSON.parse(line);
    out[r.label] = r.nodeSeconds;
  });
  return out;
}

function planOf(sourceTask, file, size) {
  const measured = measurements(sourceTask);
  const old = JSON.parse(fs.readFileSync(path.join(ARTIFACTS, sourceTask, file), 'utf8'));
  if (old.length !== size) throw new Error('plan size of ' + sourceTask + '/' + file);
  return old.map((item) => {
    const seconds = measured[item.label];
    if (typeof seconds !== 'number') throw new Error('no measurement for ' + item.label + ' in ' + sourceTask);
    return {
      label: item.label,
      args: item.args.map((a) => a.replace('evidence\\' + sourceTask + '\\', 'evidence\\MS17b\\')),
      projectionSeconds: Math.ceil(FACTOR * seconds + 10),
      projectionBasis: sourceTask + ' final E ' + item.label + ' ' + seconds + ' s (same shard); ' + FACTOR + ' x + 10 s'
    };
  });
}

const asText = (plan) => JSON.stringify(plan, null, 2).replace(/\n/g, '\r\n') + '\r\n';
[['MS17a', 'plan-wire.json', 'plan-wire.json', 5], ['MS17a', 'plan-analysis.json', 'plan-analysis.json', 14],
  ['MS16', 'plan-hashes.json', 'plan-hashes.json', 104]].forEach(([task, from, to, size]) => {
  const plan = planOf(task, from, size);
  if (plan.some((item) => item.args.some((a) => /evidence\\MS1[0-9a-z]*\\/.test(a) && !/evidence\\MS17b\\/.test(a)))) {
    throw new Error('an argument still names another task: ' + to);
  }
  fs.writeFileSync(path.join(__dirname, to), asText(plan));
  console.log(to + ' ' + plan.length + ' shards from ' + task + ', projections ' + plan.reduce((n, x) => n + x.projectionSeconds, 0) +
    ' s (factor ' + FACTOR + ')');
});
