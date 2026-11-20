'use strict';

/*
 * MS05r6c: scripted self-test of run-shards.cjs (IR12). No puzzle is generated: the children are `node -e` one-liners.
 *   node tests/artifacts/difficulty-v3/MS05r6c/run-shards.selftest.cjs
 * It checks the admission rule (own projection first, the generic floor never replacing it), the refusal of a missing
 * or non-finite projection, the item that runs alone, the unstarted remainder and the stop at the first unexpected exit.
 * It writes to a scratch folder next to itself and removes it at the end.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const driver = require('./run-shards.cjs');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const SCRATCH = path.join(__dirname, 'selftest-scratch');
const REL_SCRATCH = path.relative(ROOT, SCRATCH);
let checks = 0;

function ok(name, fn) {
  fn();
  checks++;
  console.log('ok   ' + name);
}

function plan(items) {
  const file = path.join(SCRATCH, 'plan-' + checks + '.json');
  fs.writeFileSync(file, JSON.stringify(items), 'utf8');
  return file;
}

function item(label, code, extra) {
  return Object.assign({ label: label, args: ['-e', 'process.exit(' + code + ')'], projectionSeconds: 1,
    projectionBasis: 'scripted one-liner, a stated bound' }, extra || {});
}

function runPlan(items, argv) {
  const file = plan(items);
  const opts = driver.parseArgs(['--plan=' + file, '--evidence=' + REL_SCRATCH].concat(argv || []));
  const quiet = console.log;
  console.log = () => {};
  try {
    return driver.run(opts);
  } finally {
    console.log = quiet;
  }
}

function lines(file) {
  const abs = path.join(SCRATCH, file);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : [];
}

fs.rmSync(SCRATCH, { recursive: true, force: true });
fs.mkdirSync(SCRATCH, { recursive: true });
try {
  ok('refuses a missing, unknown or non-finite projection and a missing basis before anything starts', () => {
    const bad = [{ projectionSeconds: undefined }, { projectionSeconds: Infinity }, { projectionSeconds: NaN },
      { projectionSeconds: 0 }, { projectionSeconds: -5 }, { projectionSeconds: '30' }, { projectionBasis: '' }];
    bad.forEach((extra) => {
      assert.throws(() => driver.validatePlan([Object.assign(item('x', 0), extra)], 0), /projection/i);
    });
    assert.throws(() => driver.validatePlan([item('bad label!', 0)], 0), /label/);
    assert.throws(() => driver.validatePlan([item('x', 0, { expectedExits: ['0'] })], 0), /expectedExits/);
    driver.validatePlan([item('fine', 0)], 0);
  });

  ok('admits by elapsed + max(own projection, floor) <= budget, the floor never replacing the projection', () => {
    const adm = (elapsed, own, index, floor, budget) =>
      driver.admission(elapsed, { projectionSeconds: own }, index, floor === undefined ? 60 : floor,
        budget === undefined ? 450 : budget);
    assert.strictEqual(adm(0, 400, 0).admitted, true);
    assert.strictEqual(adm(395, 10, 1).admitted, false);
    assert.strictEqual(adm(390, 10, 1).admitted, true);
    assert.strictEqual(adm(340, 100, 1).admitted, true);
    assert.strictEqual(adm(351, 100, 1).admitted, false);
    // the 139.1 s Generator player suite: a floor of 60 s alone would admit it at 300 s elapsed, its own bound 180 s does not
    assert.strictEqual(adm(300, 60, 1).admitted, true);
    assert.strictEqual(adm(300, 180, 1).admitted, false);
    assert.strictEqual(adm(270, 180, 1).admitted, true);
    assert.strictEqual(adm(271, 180, 1).admitted, false);
    const record = adm(300, 180, 1);
    assert.deepStrictEqual([record.planned, record.projectionSeconds, record.floorSeconds], [180, 180, 60]);
  });

  ok('an item whose own projection exceeds the budget runs alone and only as the first item', () => {
    const first = driver.admission(0, { projectionSeconds: 500 }, 0, 60, 450);
    const later = driver.admission(1, { projectionSeconds: 500 }, 1, 60, 450);
    assert.strictEqual(first.admitted, true);
    assert.strictEqual(first.ownExceedsBudget, true);
    assert.strictEqual(later.admitted, false);
    const out = runPlan([item('alone-a', 0, { projectionSeconds: 500 }), item('alone-b', 0)]);
    assert.strictEqual(out.exitCode, 0);
    assert.strictEqual(out.summary.started, 1);
    assert.deepStrictEqual(out.summary.unstarted.map((x) => x.label), ['alone-b']);
    assert.ok(fs.existsSync(path.join(SCRATCH, 'logs', 'alone-a.txt')));
    assert.ok(!fs.existsSync(path.join(SCRATCH, 'logs', 'alone-b.txt')));
  });

  ok('leaves a non-fitting item and the rest unstarted, and says where to resume', () => {
    const slow = { args: ['-e', 'setTimeout(function () {}, 400)'], projectionSeconds: 1.8 };
    const out = runPlan([item('fit-a', 0, slow), item('fit-b', 0, { projectionSeconds: 1.8 }), item('fit-c', 0)],
      ['--budget-seconds=2', '--floor-seconds=1']);
    assert.strictEqual(out.exitCode, 0);
    assert.strictEqual(out.summary.started, 1);
    assert.deepStrictEqual(out.summary.unstarted.map((x) => x.label), ['fit-b', 'fit-c']);
    assert.ok(/not admitted/.test(out.summary.stop));
    const run = lines('shard-runs.jsonl').filter((r) => r.label === 'fit-a')[0];
    assert.strictEqual(run.admission.admitted, true);
    assert.strictEqual(run.withinProjection, true);
  });

  ok('stops at the first unexpected exit, retries nothing and keeps an expected nonzero exit as a failure', () => {
    const out = runPlan([item('seq-a', 0), item('seq-b', 1, { expectedExits: [0, 1] }), item('seq-c', 3),
      item('seq-d', 0)]);
    assert.strictEqual(out.exitCode, 3);
    assert.strictEqual(out.summary.started, 3);
    assert.strictEqual(out.summary.passed, 1);
    assert.strictEqual(out.summary.expectedNonzero, 1);
    assert.deepStrictEqual(out.summary.unexpected, { index: 2, label: 'seq-c', exit: 3 });
    assert.deepStrictEqual(out.summary.unstarted.map((x) => x.label), ['seq-d']);
    const runs = lines('shard-runs.jsonl').filter((r) => /^seq-/.test(r.label));
    assert.deepStrictEqual(runs.map((r) => [r.label, r.exit, r.expectedNonzero]),
      [['seq-a', 0, false], ['seq-b', 1, true], ['seq-c', 3, false]]);
    assert.ok(!fs.existsSync(path.join(SCRATCH, 'logs', 'seq-d.txt')));
    assert.throws(() => runPlan([item('seq-a', 0)]), /used once/);
  });

  ok('a plain exit 1 that is not declared expected also stops the compound', () => {
    const out = runPlan([item('one-a', 1), item('one-b', 0)]);
    assert.strictEqual(out.exitCode, 1);
    assert.strictEqual(out.summary.started, 1);
    assert.deepStrictEqual(out.summary.unstarted.map((x) => x.label), ['one-b']);
  });

  ok('a dry run starts nothing and writes no log', () => {
    const out = runPlan([item('dry-a', 0), item('dry-b', 0)], ['--dry-run']);
    assert.strictEqual(out.exitCode, 0);
    assert.ok(!fs.existsSync(path.join(SCRATCH, 'logs', 'dry-a.txt')));
  });
  console.log('run-shards self-test: ' + checks + ' checks passed');
} finally {
  fs.rmSync(SCRATCH, { recursive: true, force: true });
}
