'use strict';

/*
 * MS15a: writes the three plans of the complete E gate for `run-shards.cjs`, each item with its own projection (IR12). The shard
 * arguments are those of MS14b's plans (the same 104 + 5 + 14 shards) with this task's evidence folder; the projection of a shard
 * is the measurement of the same shard in MS14b's final E-2 (docs/difficulty-v3/evidence/MS14b/shard-runs.jsonl, the top-level
 * wire/analysis/hashes records that MS14c checked and that no later task changed), bounded as FACTOR x the measurement + 10 s, FACTOR
 * 2. This task adds an inactive module that no finder reads, so a shard is expected to cost what it cost there (one more source file to
 * read at start); a shard that exceeds its own projection is reported by the driver (`withinProjection`), and the compound's admission
 * uses the larger of the projection and its generic floor of 60 s.
 *
 *   node tests/artifacts/difficulty-v3/MS15a/make-plans.cjs
 *
 * writes plan-hashes.json (104 shards), plan-wire.json (G09-G13) and plan-analysis.json (G01-G14) next to this script.
 */
const fs = require('fs');
const path = require('path');

const GEN = path.resolve(__dirname, '..', '..', '..', '..');
const EVIDENCE = path.resolve(GEN, '..', 'docs', 'difficulty-v3', 'evidence');
const OLD_PLANS = path.resolve(__dirname, '..', 'MS14b');
const FACTOR = Number(process.env.FACTOR || 2);
const BASE_TASK = 'MS14b';

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
      args: item.args.map((a) => a.replace('evidence\\MS14b\\', 'evidence\\MS15a\\')),
      projectionSeconds: Math.ceil(FACTOR * seconds + 10),
      projectionBasis: BASE_TASK + ' final E-2 ' + item.label + ' ' + seconds + ' s (same shard); ' + FACTOR + ' x + 10 s'
    };
  });
}

const asText = (plan) => JSON.stringify(plan, null, 2).replace(/\n/g, '\r\n') + '\r\n';
[['wire', 'plan-wire.json', 5], ['analysis', 'plan-analysis.json', 14], ['hashes', 'plan-hashes.json', 104]].forEach(([kind, file, size]) => {
  const plan = planOf(file);
  if (plan.length !== size) throw new Error('plan size of ' + kind);
  if (plan.some((item) => item.args.some((a) => /MS14b/.test(a)))) throw new Error('an argument still names MS14b: ' + kind);
  fs.writeFileSync(path.join(__dirname, file), asText(plan));
  console.log(kind + ' ' + plan.length + ' shards, projections ' + plan.reduce((n, x) => n + x.projectionSeconds, 0) + ' s (factor ' + FACTOR + ')');
});
