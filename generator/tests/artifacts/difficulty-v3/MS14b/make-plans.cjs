'use strict';

/*
 * MS14b: writes the three plans of the complete E gate for `run-shards.cjs`, each item with its own projection (IR12). The shard
 * arguments are those of MS13c's plans (the same 104 + 5 + 14 shards) with this task's evidence folder; the projection of a shard
 * is the measurement of the same shard in MS13c's final E (docs/difficulty-v3/evidence/MS13c/shard-runs.jsonl, the second run on
 * the accepted source), bounded as FACTOR x the measurement + 10 s. FACTOR is 2 by default: this task adds a technique that only a
 * Jigsaw board can use, so only the jigsaw9 shards (hash cells jigsaw9/normal and jigsaw9/master, analyses G06 and G07) are expected
 * to cost more, and their MS13c measurements are 0.8 to 7 s; every other shard runs unchanged code. A shard that exceeds its
 * own projection is reported by the driver (`withinProjection`), and the compound's admission uses the larger of the projection
 * and its generic floor of 60 s.
 *
 *   node tests/artifacts/difficulty-v3/MS14b/make-plans.cjs
 *
 * writes plan-hashes.json (104 shards), plan-wire.json (G09-G13) and plan-analysis.json (G01-G14) next to this script.
 */
const fs = require('fs');
const path = require('path');

const GEN = path.resolve(__dirname, '..', '..', '..', '..');
const EVIDENCE = path.resolve(GEN, '..', 'docs', 'difficulty-v3', 'evidence');
const OLD_PLANS = path.resolve(__dirname, '..', 'MS13c');
const FACTOR = Number(process.env.FACTOR || 2);
const BASE_TASK = 'MS13c';

function measurements(task) {
  const out = {};
  fs.readFileSync(path.join(EVIDENCE, task, 'shard-runs.jsonl'), 'utf8').trim().split(/\r?\n/).forEach((line) => {
    const r = JSON.parse(line);
    out[r.label] = r.nodeSeconds;
  });
  return out;
}

function planOf(file) {
  const measured = measurements(BASE_TASK);
  const old = JSON.parse(fs.readFileSync(path.join(OLD_PLANS, file), 'utf8'));
  return old.map((item) => {
    const seconds = measured[item.label];
    if (typeof seconds !== 'number') throw new Error('no measurement for ' + item.label + ' in ' + BASE_TASK);
    return {
      label: item.label,
      args: item.args.map((a) => a.replace('evidence\\MS13c\\', 'evidence\\MS14b\\')),
      projectionSeconds: Math.ceil(FACTOR * seconds + 10),
      projectionBasis: BASE_TASK + ' final E ' + item.label + ' ' + seconds + ' s (same shard); ' + FACTOR + ' x + 10 s'
    };
  });
}

const asText = (plan) => JSON.stringify(plan, null, 2).replace(/\n/g, '\r\n') + '\r\n';
[['wire', 'plan-wire.json', 5], ['analysis', 'plan-analysis.json', 14], ['hashes', 'plan-hashes.json', 104]].forEach(([kind, file, size]) => {
  const plan = planOf(file);
  if (plan.length !== size) throw new Error('plan size of ' + kind);
  if (plan.some((item) => item.args.some((a) => /MS13c/.test(a)))) throw new Error('an argument still names MS13c: ' + kind);
  fs.writeFileSync(path.join(__dirname, file), asText(plan));
  console.log(kind + ' ' + plan.length + ' shards, projections ' + plan.reduce((n, x) => n + x.projectionSeconds, 0) + ' s (factor ' + FACTOR + ')');
});
