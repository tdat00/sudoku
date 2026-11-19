'use strict';

/*
 * MS18c step 6 task-owned, FILE-ONLY: the whole-test shards of the complete manual `variants` suite and their
 * reconciliation (no generation, no solver):
 *   node generator/tests/artifacts/difficulty-v3/MS18c/variants-shards.cjs plan
 *   node generator/tests/artifacts/difficulty-v3/MS18c/variants-shards.cjs check
 * `plan` reads closure/manual-variants/inventory-variants.json (the registered suite, `--list-tests`),
 * splits the
 * 285 tests into disjoint whole-test shards by the plain substring filter of the runner (one variant per
 * shard, the option-schema tests, the real mega16 replay), proves the shards disjoint and complete, projects
 * each from the final qualification (the p95 of every offered level times its puzzles, plus the determinism
 * re-run, times 1.5, plus 30 s) and writes closure/manual-variants/plan.json. `check` reads the results
 * file of
 * every shard and reports whether every selected test ran once, passed or not, with the exits and the source
 * identity of each, and writes closure/manual-variants/reconciliation.json and .md. Exit 1 on any problem.
 */
const fs = require('fs');
const path = require('path');
const util = require('./util.cjs');

const DIR = path.join(util.EVIDENCE, 'closure', 'manual-variants');
const HEAVY = ['samurai', 'sohei', 'flower', 'mega16', 'butterfly'];
const REPLAY = 'variants > player: the replay steps of a result > real top-level results with clues shown ' +
  'again replay faithfully (mega16)';
const problems = [];
const check = (ok, text) => { if (!ok) problems.push(text); };
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

const inventory = readJson(path.join(DIR, 'inventory-variants.json'));
const names = inventory.tests.map((t) => t.fullName);
const ids = ['sohei', 'butterfly', 'mega16', 'mega12', 'greaterThan', 'flower', 'hyper', 'diagonalX',
  'jigsaw9',
  'samurai', 'classic9', 'wordoku', 'killer', 'classic6', 'classic4'];

const shards = ids.map((id) => ({ name: 'variant-' + id, filter: '> variants: ' + id + ' >', variant: id }));
shards.push({ name: 'option-schema', filter: '> variants: the normalised option schema >' });
shards.push({ name: 'mega16-replay', exact: REPLAY });

const selects = (shard, name) => (shard.exact ? name === shard.exact
  : name.toLowerCase().indexOf(shard.filter.toLowerCase()) !== -1);
shards.forEach((s) => { s.tests = names.filter((n) => selects(s, n)); });
const taken = new Map();
shards.forEach((s) => s.tests.forEach((n) => taken.set(n, (taken.get(n) || 0) + 1)));
const leftover = names.filter((n) => !taken.has(n));
const doubled = [...taken].filter((e) => e[1] > 1).map((e) => e[0]);
if (leftover.length > 0) {
  const rest = { name: 'rest', filter: '> variants: the sweep covers every registered variant >' };
  rest.tests = names.filter((n) => selects(rest, n));
  check(JSON.stringify(rest.tests) === JSON.stringify(leftover),
    'the filter of the rest shard misses a test');
  shards.push(rest);
}
check(doubled.length === 0, 'tests in two shards: ' + doubled.join('; '));

// ---- the projection ---------------------------------------------------------------------------------------
const merged = readJson(path.join(util.EVIDENCE, 'merge', 'qualification-v3.json'));
shards.forEach((s) => {
  if (!s.variant) return;
  const n = HEAVY.indexOf(s.variant) !== -1 ? 2 : 3;
  let p95 = 0;
  merged.cells.filter((c) => c.variant === s.variant && c.summary.verdict === 'offered').forEach((c) => {
    p95 += (n + 1) * (c.summary.p95 / 1000);
  });
  s.worstCaseSeconds = Math.round(p95 * 1.5 + 30);
});
shards.forEach((s) => {
  if (s.variant) return;
  s.worstCaseSeconds = s.name === 'mega16-replay' ? 300 : 120;
});
shards.forEach((s) => check(s.worstCaseSeconds < 450, s.name + ': projection ' + s.worstCaseSeconds + ' s'));

if (process.argv[2] === 'plan') {
  const plan = { schema: 1, inventory: 'inventory-variants.json', total: names.length,
    shards: shards.map((s) => ({ name: s.name, filter: s.filter || null, exact: s.exact || null,
      tests: s.tests.length, worstCaseSeconds: s.worstCaseSeconds,
      basis: 'the p95 of every offered level of the final qualification times (puzzles + 1 re-run), ' +
        'times 1.5, plus 30 s; fixed 300 s for the real mega16 replay (118 s measured in MS07f), ' +
        '120 s for the quick rest' })),
    covered: [...taken.keys()].length, leftover: leftover.length, problems };
  check(plan.covered + leftover.length === names.length, 'the shards do not cover the inventory');
  util.writeAtomic(path.join(DIR, 'plan.json'), util.jsonText(plan, true));
  console.log(shards.map((s) => s.name + ': ' + s.tests.length + ' tests, worst case ' +
    s.worstCaseSeconds + ' s')
    .join('\n'));
  console.log('total ' + names.length + ', leftover ' + leftover.length + (leftover.length
    ? '\n  ' + leftover.slice(0, 10).join('\n  ') : ''));
} else if (process.argv[2] === 'check') {
  const rows = [];
  const seen = new Map();
  shards.forEach((s) => {
    const file = path.join(DIR, 'result-' + s.name + '.json');
    if (!fs.existsSync(file)) {
      rows.push({ shard: s.name, status: 'no result file' });
      problems.push(s.name + ': no result file');
      return;
    }
    const r = readJson(file);
    const tests = r.results.tests;
    tests.forEach((t) => seen.set(t.fullName, (seen.get(t.fullName) || []).concat(s.name + ':' + t.status)));
    const missing = s.tests.filter((n) => !tests.some((t) => t.fullName === n));
    const extra = tests.filter((t) => s.tests.indexOf(t.fullName) === -1).map((t) => t.fullName);
    check(missing.length === 0 && extra.length === 0, s.name + ': selection differs from the plan');
    check(r.complete === true, s.name + ': result not complete');
    rows.push({ shard: s.name, tests: tests.length, passed: r.results.passed, failed: r.results.failed,
      skipped: r.results.skipped, complete: r.complete, sourceStable: r.sourceStable,
      sourceHash: r.sourceHash, wallMs: r.wallMs, node: r.node,
      failures: tests.filter((t) => t.status === 'fail').map((t) => t.fullName) });
  });
  const everyOnce = names.every((n) => (seen.get(n) || []).length === 1);
  check(everyOnce, 'a selected test did not run exactly once');
  const totals = rows.reduce((a, r) => ({ tests: a.tests + (r.tests || 0), passed: a.passed + (r.passed || 0),
    failed: a.failed + (r.failed || 0), skipped: a.skipped + (r.skipped || 0) }),
  { tests: 0, passed: 0, failed: 0, skipped: 0 });
  const hashes = [...new Set(rows.map((r) => r.sourceHash).filter(Boolean))];
  check(hashes.length === 1, 'the shards ran on ' + hashes.length + ' source identities');
  const out = { schema: 1, selected: names.length, everyTestRanExactlyOnce: everyOnce, totals,
    sourceHashes: hashes,
    rows, problems };
  util.writeAtomic(path.join(DIR, 'reconciliation.json'), util.jsonText(out, true));
  const md = ['# MS18c complete manual variants suite: reconciliation', '',
    'Selected ' + names.length + ' tests; every selected test ran exactly once: ' + everyOnce +
    '. Totals: ' + totals.passed + ' passed, ' + totals.failed + ' failed, ' + totals.skipped +
    ' skipped of ' + totals.tests +
    '. Source identities: ' + hashes.map((h) => '`' + h + '`').join(', ') + '.', '',
    '| shard | tests | passed | failed | skipped | complete | source stable | wall (s) |',
    '|---|---|---|---|---|---|---|---|']
    .concat(rows.map((r) => '| ' + [r.shard, r.tests, r.passed, r.failed, r.skipped, r.complete,
      r.sourceStable,
      r.wallMs === undefined ? '' : (r.wallMs / 1000).toFixed(1)].join(' | ') + ' |'), '');
  rows.filter((r) => r.failures && r.failures.length).forEach((r) => {
    md.push('Failures of ' + r.shard + ':', '');
    r.failures.forEach((f) => md.push('- ' + f));
    md.push('');
  });
  md.push(problems.length === 0 ? 'No problem found.' : 'PROBLEMS: ' + problems.join('; '), '');
  util.writeAtomic(path.join(DIR, 'reconciliation.md'), md.join('\r\n'));
  console.log('manual variants: ' + totals.passed + ' passed, ' + totals.failed + ' failed of ' +
    totals.tests +
    '; every test once: ' + everyOnce + '; source identities: ' + hashes.length);
} else {
  console.log('usage: variants-shards.cjs plan | check');
  process.exitCode = 2;
}
if (problems.length > 0) {
  console.log('PROBLEMS:\n  ' + problems.join('\n  '));
  process.exitCode = 1;
}
