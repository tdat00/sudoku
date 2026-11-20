'use strict';

/*
 * MS05r6b: self-test of coverage.cjs on tiny synthetic inventories and results (no test, no puzzle, no real result file).
 *   node tests/artifacts/difficulty-v3/MS05r6b/coverage.selftest.cjs
 * Cases: complete, a failed test kept, a gap, a duplicate (two shards), an unexpected key, a mixed source, a bail, a zero-test
 * result, a missing file, a new skip, a changed full name, a wrong selector and the exit codes.
 */
const assert = require('assert');
const coverage = require('./coverage.cjs');

const HASH = 'a'.repeat(64);
const APP = 'generator';
let checks = 0;

function fixture() {
  const names = [['alpha', 0, 'alpha > one'], ['alpha', 1, 'alpha > two'], ['alpha', 2, 'alpha > three'],
    ['beta', 0, 'beta > one'], ['beta', 1, 'beta > two']];
  const inventory = { tests: names.map((n) => ({ suite: n[0], ordinal: n[1], fullName: n[2], kind: 'test',
    skipped: false })) };
  const row = (n, status) => ({ suite: n[0], name: n[2], fullName: n[2], status: status || 'pass', ms: 1, reason: '',
    error: status === 'fail' ? { message: 'boom' } : null, ordinal: n[1] });
  const keys = (list) => list.map((n) => ({ key: APP + '/' + n[0] + '/' + n[1], fullName: n[2] }));
  const alpha = names.slice(0, 3);
  const beta = names.slice(3);
  const section = {
    inventoryPath: 'synthetic', sourceHash: HASH, node: 'v0', timeFactor: 2,
    shards: [
      { id: 'a', args: ['tests/node-runner.js', '--suite=alpha'], expectedTestKeys: keys(alpha), resultPath: 'a.json' },
      { id: 'b', args: ['tests/node-runner.js', '--suite=beta'], expectedTestKeys: keys(beta), resultPath: 'b.json' }
    ]
  };
  const doc = (suite, list, extra) => Object.assign({
    schema: 1, app: APP, node: 'v0', sourceHash: HASH, timeFactor: 2,
    selection: { set: 'suites', suites: [suite], filter: null, exact: null, count: list.length },
    complete: true, sourceStable: true, wallMs: 10,
    results: { total: list.length, passed: list.length, failed: 0, skipped: 0, bailed: false, ms: 5,
      tests: list.map((n) => row(n)) },
    registrationErrors: [], argv: ['--suite=' + suite, '--results=x.json']
  }, extra || {});
  return { inventory: inventory, section: section, alpha: alpha, beta: beta, row: row, doc: doc,
    docs: { 'a.json': doc('alpha', alpha), 'b.json': doc('beta', beta) } };
}

function reconcile(f, docs) {
  return coverage.reconcileApp(APP, f.section, f.inventory, (shard) => (docs || f.docs)[shard.resultPath] || null);
}

function ok(name, fn) {
  fn();
  checks++;
  console.log('ok   ' + name);
}

ok('a complete, green coverage: every key once, counts and the exit code 0', () => {
  const f = fixture();
  const r = reconcile(f);
  assert.strictEqual(r.verdict, 'complete-green');
  assert.deepStrictEqual(r.counts, { total: 5, passed: 5, failed: 0, skipped: 0 });
  assert.deepStrictEqual([r.coverage.missing.length, r.coverage.duplicates.length, r.coverage.unexpected.length], [0, 0, 0]);
  assert.strictEqual(coverage.exitCodeOf({ apps: { generator: r } }), 0);
});

ok('a failed test stays failed: complete with failures, listed, exit code 1', () => {
  const f = fixture();
  f.docs['b.json'].results.tests[1] = f.row(f.beta[1], 'fail');
  f.docs['b.json'].results.failed = 1;
  const r = reconcile(f);
  assert.strictEqual(r.verdict, 'complete-with-failures');
  assert.deepStrictEqual(r.failed.map((x) => x.key), ['generator/beta/1']);
  assert.strictEqual(coverage.exitCodeOf({ apps: { generator: r } }), 1);
});

ok('a gap: a missing row makes the shard unaccepted and its keys uncovered', () => {
  const f = fixture();
  f.docs['a.json'].results.tests.pop();
  f.docs['a.json'].results.total = 2;
  const r = reconcile(f);
  assert.strictEqual(r.verdict, 'incomplete');
  assert.strictEqual(r.shards[0].accepted, false);
  assert.deepStrictEqual(r.coverage.missing.map((x) => x.key), ['generator/alpha/0', 'generator/alpha/1', 'generator/alpha/2']);
  assert.strictEqual(coverage.exitCodeOf({ apps: { generator: r } }), 2);
});

ok('a duplicate row inside one result, and a key claimed by two shards', () => {
  const f = fixture();
  f.docs['a.json'].results.tests.push(f.row(f.alpha[0]));
  f.docs['a.json'].results.total = 4;
  let r = reconcile(f);
  assert.strictEqual(r.verdict, 'incomplete');
  assert.ok(r.coverage.duplicates.some((d) => d.key === 'generator/alpha/0'));
  const g = fixture();
  g.section.shards[1].expectedTestKeys.push(g.section.shards[0].expectedTestKeys[0]);
  g.docs['b.json'].results.tests.push(g.row(g.alpha[0]));
  g.docs['b.json'].results.total = 3;
  g.docs['b.json'].selection.count = 3;
  r = reconcile(g);
  assert.strictEqual(r.verdict, 'incomplete');
  assert.deepStrictEqual(r.coverage.duplicates.map((d) => d.shards), [['a', 'b']]);
});

ok('an unexpected key: a row that is no expected key of its shard nor an inventory row', () => {
  const f = fixture();
  f.docs['b.json'].results.tests.push({ suite: 'beta', name: 'beta > ghost', fullName: 'beta > ghost', status: 'pass',
    ms: 1, reason: '', error: null, ordinal: 99 });
  f.docs['b.json'].results.total = 3;
  const r = reconcile(f);
  assert.strictEqual(r.verdict, 'incomplete');
  assert.deepStrictEqual(r.coverage.unexpected.map((x) => x.key), ['generator/beta/99']);
});

ok('a mixed source, Node or time factor makes a shard unaccepted', () => {
  ['sourceHash', 'node', 'timeFactor'].forEach((field) => {
    const f = fixture();
    f.docs['b.json'][field] = field === 'timeFactor' ? 3 : 'other';
    const r = reconcile(f);
    assert.strictEqual(r.verdict, 'incomplete');
    assert.strictEqual(r.shards[1].accepted, false);
    assert.ok(r.shards[1].reasons.some((x) => x.indexOf(field) === 0), field);
    assert.strictEqual(r.coverage.missing.length, 2);
  });
});

ok('a bail, an incomplete run, changed sources and registration errors are refused', () => {
  const cases = [
    (d) => { d.results.bailed = true; },
    (d) => { d.complete = false; },
    (d) => { d.sourceStable = false; },
    (d) => { d.registrationErrors = [{ suite: 'x' }]; }
  ];
  cases.forEach((mutate, i) => {
    const f = fixture();
    mutate(f.docs['a.json']);
    const r = reconcile(f);
    assert.strictEqual(r.verdict, 'incomplete', 'case ' + i);
    assert.strictEqual(r.shards[0].accepted, false, 'case ' + i);
  });
});

ok('a zero-test result and a missing result file are not a pass', () => {
  const f = fixture();
  f.docs['b.json'].results.tests = [];
  f.docs['b.json'].results.total = 0;
  f.docs['b.json'].selection.count = 0;
  let r = reconcile(f);
  assert.strictEqual(r.verdict, 'incomplete');
  assert.ok(r.shards[1].reasons.indexOf('zero tests') !== -1);
  delete f.docs['b.json'];
  r = reconcile(f);
  assert.strictEqual(r.verdict, 'incomplete');
  assert.ok(r.shards[1].reasons.indexOf('the result file is missing') !== -1);
});

ok('a new skip, a changed full name and a wrong selector are refused', () => {
  let f = fixture();
  f.docs['a.json'].results.tests[2] = f.row(f.alpha[2], 'skip');
  let r = reconcile(f);
  assert.strictEqual(r.shards[0].accepted, false);
  assert.ok(r.shards[0].reasons.some((x) => /new skip/.test(x)));
  f = fixture();
  f.docs['a.json'].results.tests[0].fullName = 'alpha > renamed';
  r = reconcile(f);
  assert.strictEqual(r.shards[0].accepted, false);
  assert.ok(r.shards[0].reasons.some((x) => /full name differs/.test(x)));
  f = fixture();
  f.docs['a.json'].argv = ['--suite=alpha,beta', '--results=x.json'];
  r = reconcile(f);
  assert.strictEqual(r.shards[0].accepted, false);
  assert.ok(r.shards[0].reasons.indexOf('the argv is not the shard selector') !== -1);
});

console.log('coverage self-test: ' + checks + ' checks passed');
