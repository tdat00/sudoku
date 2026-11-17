'use strict';

/*
 * MS13c: writes the three plans of the complete E gate for `run-shards.cjs`, each item with its own projection (IR12). The shard
 * arguments are those of MS14a's plans (the same 104 + 5 + 14 shards) with this task's evidence folder; the projection of a shard
 * is the measurement of the same shard in MS14a's final E (docs/difficulty-v3/evidence/MS14a/shard-runs.jsonl), bounded as
 * FACTOR x the measurement + 10 s. FACTOR is 3 by default and is stated in the record: this task activates the grouped chain search
 * (a chain call costs about 5 to 20 times the singleton one on its own), so a shard is expected to cost more than in MS14a; the
 * first compounds (the five wires) measure the ratio, and the factor of the following plans is read from them (FACTOR env, the
 * plans are rewritten before their compounds and only the not yet recorded shards are run from them). A shard that exceeds its
 * own projection is reported by the driver (`withinProjection`), and the compound's admission uses the larger of the projection
 * and its generic floor of 60 s.
 *
 *   FACTOR=3 node tests/artifacts/difficulty-v3/MS13c/make-plans.cjs
 *
 * writes plan-hashes.json (104 shards), plan-wire.json (G09-G13) and plan-analysis.json (G01-G14) next to this script.
 */
const fs = require('fs');
const path = require('path');

const GEN = path.resolve(__dirname, '..', '..', '..', '..');
const EVIDENCE = path.resolve(GEN, '..', 'docs', 'difficulty-v3', 'evidence');
const OLD_PLANS = path.resolve(__dirname, '..', 'MS14a');
const FACTOR = Number(process.env.FACTOR || 3);
const BASE_TASK = process.env.BASE_TASK || 'MS14a';
const OVERRIDES = process.env.OVERRIDES ? JSON.parse(process.env.OVERRIDES) : {};
const ONLY = process.env.KINDS ? process.env.KINDS.split(',') : ['wire', 'analysis', 'hashes'];

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
    const stated = OVERRIDES[item.label];
    return {
      label: item.label,
      args: item.args.map((a) => a.replace('evidence\\MS14a\\', 'evidence\\MS13c\\')),
      projectionSeconds: typeof stated === 'number' ? stated : Math.ceil(FACTOR * seconds + 10),
      projectionBasis: typeof stated === 'number'
        ? 'stated from the measured wire of the same puzzle in this task (OVERRIDES), ' + BASE_TASK + ' ' + seconds + ' s'
        : BASE_TASK + ' final E ' + item.label + ' ' + seconds + ' s (same shard); ' + FACTOR + ' x + 10 s'
    };
  });
}

const asText = (plan) => JSON.stringify(plan, null, 2).replace(/\n/g, '\r\n') + '\r\n';
const out = [['wire', 'plan-wire.json', 5], ['analysis', 'plan-analysis.json', 14], ['hashes', 'plan-hashes.json', 104]];
out.forEach(([kind, file, size]) => {
  if (ONLY.indexOf(kind) === -1) return;
  const plan = planOf(file);
  if (plan.length !== size) throw new Error('plan size of ' + kind);
  if (plan.some((item) => item.args.some((a) => /MS14a/.test(a)))) throw new Error('an argument still names MS14a: ' + kind);
  fs.writeFileSync(path.join(__dirname, file), asText(plan));
  console.log(kind + ' ' + plan.length + ' shards, projections ' + plan.reduce((n, x) => n + x.projectionSeconds, 0) + ' s (factor ' + FACTOR + ')');
});
