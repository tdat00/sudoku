#!/usr/bin/env node
'use strict';

/*
 * MS07e GD reconciliation (reads only): matches the results of the classic9 `difficulty` shards against the registration-only
 * inventory of the unchanged manual suite (154 tests) and writes gd/reconciled.json and gd/reconciled.md. It runs nothing.
 *
 *   node reconcile-gd.cjs
 */
const fs = require('fs');
const path = require('path');

const EVIDENCE = 'Q:\\git\\sudoku\\docs\\difficulty-v3\\evidence\\MS07e';
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const inventory = read(path.join(EVIDENCE, 'gd', 'difficulty-inventory.json'));
const expected = inventory.tests.map((t) => t.fullName);
const plan = read(path.join(EVIDENCE, 'plans', 'plan-gd.json'));
const extra = ['plans/plan-gd-confusion.json'].filter((f) => fs.existsSync(path.join(EVIDENCE, f)))
  .map((f) => read(path.join(EVIDENCE, f)));
const items = plan.concat([].concat.apply([], extra));
const runs = fs.readFileSync(path.join(EVIDENCE, 'run-log.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const runOf = {};
runs.forEach((r) => { if (r.state === 'ran') runOf[r.id] = r; });

const seen = new Map();
const shards = [];
const failures = [];
let unexecuted = [];
items.forEach((item) => {
  const resultPath = path.join(EVIDENCE, 'gd', item.id.replace(/^gd-/, '') + '.json');
  const run = runOf[item.id] || null;
  const row = { id: item.id, label: item.label, projectionSeconds: item.projectionSeconds, exit: run ? run.exit : null,
    outcome: run ? run.outcome : 'not run', nodeSeconds: run ? run.nodeSeconds : null,
    lockWaitSeconds: run ? run.lockWaitSeconds : null, total: 0, passed: 0, failed: 0, skipped: 0 };
  if (!fs.existsSync(resultPath)) {
    unexecuted.push(item.id);
    shards.push(row);
    return;
  }
  const result = read(resultPath);
  row.complete = result.complete === true;
  row.sourceStable = result.sourceStable === true;
  row.sourceHash = result.sourceHash;
  row.wallMs = result.wallMs;
  [].concat.apply([], [].concat(result.results).map((r) => r.tests)).forEach((t) => {
    row.total++;
    if (t.status === 'pass') row.passed++;
    else if (t.status === 'fail') row.failed++;
    else row.skipped++;
    if (seen.has(t.fullName)) seen.get(t.fullName).push(item.id); else seen.set(t.fullName, [item.id]);
    if (t.status !== 'pass') {
      const message = t.error && t.error.message ? t.error.message : (t.reason || '');
      let kind = 'CORRECTNESS';
      if (/hits the requested level in at least 90 %/.test(t.fullName)) kind = 'availability: aggregate hit rate';
      else if (/is generated well inside the budget/.test(t.fullName)) kind = 'availability: median time';
      failures.push({ shard: item.id, status: t.status, kind: kind, fullName: t.fullName, message: message, ms: t.ms });
    }
  });
  shards.push(row);
});

const covered = [];
const missing = [];
const duplicated = [];
const unexpectedKeys = [];
expected.forEach((name) => {
  if (!seen.has(name)) missing.push(name);
  else {
    covered.push(name);
    if (seen.get(name).length > 1) duplicated.push(name);
  }
});
seen.forEach((v, k) => { if (expected.indexOf(k) === -1) unexpectedKeys.push(k); });
const confusionKey = expected.find((n) => /is a confusion matrix/.test(n));
const summary = {
  schema: 1, task: 'MS07e', inventory: { tests: expected.length, sourceHash: inventory.sourceHash },
  covered: covered.length, missing: missing.length, duplicated: duplicated.length, unexpected: unexpectedKeys.length,
  passed: shards.reduce((a, s) => a + s.passed, 0), failed: shards.reduce((a, s) => a + s.failed, 0),
  skipped: shards.reduce((a, s) => a + s.skipped, 0), notRun: unexecuted, missingNames: missing,
  confusionMatrixCovered: confusionKey ? seen.has(confusionKey) : null,
  correctnessFailures: failures.filter((f) => f.kind === 'CORRECTNESS').length,
  availabilityFailures: failures.filter((f) => f.kind !== 'CORRECTNESS').length,
  failures: failures, shards: shards
};
fs.writeFileSync(path.join(EVIDENCE, 'gd', 'reconciled.json'), JSON.stringify(summary, null, 2).replace(/\n/g, '\r\n') + '\r\n');
const md = ['| shard | tests | passed | failed | process s | lock wait s | exit | outcome |', '|---|---:|---:|---:|---:|---:|---:|---|'];
shards.forEach((s) => {
  md.push('| ' + s.id + ' | ' + s.total + ' | ' + s.passed + ' | ' + s.failed + ' | ' + (s.nodeSeconds === null ? '' :
    s.nodeSeconds) + ' | ' + (s.lockWaitSeconds === null || s.lockWaitSeconds === undefined ? 'in a compound' : s.lockWaitSeconds) +
    ' | ' + (s.exit === null ? '' : s.exit) +
    ' | ' + s.outcome + ' |');
});
md.push('');
md.push('covered ' + covered.length + ' of ' + expected.length + ', passed ' + summary.passed + ', failed ' + summary.failed +
  ', skipped ' + summary.skipped + ', missing ' + missing.length + ', duplicated ' + duplicated.length + ', unexpected ' +
  unexpectedKeys.length);
failures.forEach((f) => md.push('- ' + f.kind + ' | ' + f.shard + ' | ' + f.fullName.split(' > ').slice(-2).join(' > ') + ' | ' + f.message));
fs.writeFileSync(path.join(EVIDENCE, 'gd', 'reconciled.md'), md.join('\r\n') + '\r\n');
console.log(md.join('\n'));
