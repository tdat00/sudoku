'use strict';

/*
 * MS18c closure (from MS17b's make-plans.cjs): writes the three plans of the complete E gate for
 * run-shards.cjs, each item with its own projection. The shard arguments are those of MS17b's plans with this
 * task's evidence folder (closure/e); the projection of a shard is the measurement of the same shard in
 * MS17b's final E (its top-level shard-runs.jsonl), bounded as FACTOR x the measurement + 10 s, FACTOR 3 (an
 * environment variable overrides it), the rule of MS16, MS17a and MS17b. Engine bytes that a shard executes
 * are those of MS17b's measurement apart from the eight support arrays (publication, which the recorders
 * replace by their own per-call guards) and the data of perf-helper.js, so a shard that exceeds its own
 * projection is reported by the driver (`withinProjection`).
 *
 *   node tests/artifacts/difficulty-v3/MS18c/make-e-plans.cjs
 *
 * writes plan-wire.json (G09-G13), plan-analysis.json (G01-G14) and plan-hashes.json (104 shards) next to
 * this script.
 */
const fs = require('fs');
const path = require('path');

const GEN = path.resolve(__dirname, '..', '..', '..', '..');
const EVIDENCE = path.resolve(GEN, '..', 'docs', 'difficulty-v3', 'evidence');
const OLD = path.resolve(__dirname, '..', 'MS17b');
const FACTOR = Number(process.env.FACTOR || 3);

const measured = {};
fs.readFileSync(path.join(EVIDENCE, 'MS17b', 'shard-runs.jsonl'), 'utf8').trim().split(/\r?\n/)
  .forEach((line) => {
    const r = JSON.parse(line);
    measured[r.label] = r.nodeSeconds;
  });

const asText = (plan) => JSON.stringify(plan, null, 2).replace(/\n/g, '\r\n') + '\r\n';
[['plan-wire.json', 5], ['plan-analysis.json', 14], ['plan-hashes.json', 104]].forEach(([file, size]) => {
  const old = JSON.parse(fs.readFileSync(path.join(OLD, file), 'utf8'));
  if (old.length !== size) throw new Error('plan size of ' + file);
  const plan = old.map((item) => {
    const seconds = measured[item.label];
    if (typeof seconds !== 'number') throw new Error('no measurement for ' + item.label + ' in MS17b');
    return {
      label: item.label,
      args: item.args.map((a) => a.replace('evidence\\MS17b\\', 'evidence\\MS18c\\closure\\e\\')),
      projectionSeconds: Math.ceil(FACTOR * seconds + 10),
      projectionBasis: 'MS17b final E ' + item.label + ' ' + seconds + ' s (same shard); ' + FACTOR +
        ' x + 10 s'
    };
  });
  if (plan.some((item) => item.args.some((a) => /evidence\\(?!MS18c\\)MS\w+\\/.test(a)))) {
    throw new Error('an argument still names another task: ' + file);
  }
  fs.writeFileSync(path.join(__dirname, file), asText(plan));
  console.log(file + ' ' + plan.length + ' shards, projections ' +
    plan.reduce((n, x) => n + x.projectionSeconds, 0) +
    ' s (factor ' + FACTOR + ')');
});
