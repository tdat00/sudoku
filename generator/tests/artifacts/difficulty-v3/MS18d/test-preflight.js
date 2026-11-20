'use strict';

/*
 * MS18d Phase A task-owned tests of project-gp.js and cost-compare.js. They use synthetic qualification data
 * and fake loaders (no engine is generated, nothing is timed); the real-data cases at the end only read the
 * accepted MS18c record and the declarations (the engine files are run as scripts, nothing is generated).
 *   node generator/tests/artifacts/difficulty-v3/MS18d/test-preflight.js
 */
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const gp = require('./project-gp.js');
const cost = require('./cost-compare.js');

const GENERATOR = path.resolve(__dirname, '..', '..', '..', '..');
const REPO = path.resolve(GENERATOR, '..');
const REAL_QUALIFICATION = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS18c', 'merge',
  'qualification-v3.json');
const records = gp.loadRecords();

let passed = 0;
let skipped = 0;
const failed = [];
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('ok   ' + name);
  } catch (err) {
    failed.push(name);
    console.log('FAIL ' + name + ': ' + (err && err.stack));
  }
}

// -------------------------------------------------------------------------------------------------
// Synthetic data
// -------------------------------------------------------------------------------------------------

const LEVELS = ['veryEasy', 'easy', 'normal', 'hard'];
const ENV = {
  identities: {
    sources: '1111111111111111', qualifierHash: 'a'.repeat(64), hashIdentity: 'b'.repeat(64),
    replayIdentity: 'c'.repeat(64), engineFileCount: 3,
    files: { 'tests/perf.js': 'd'.repeat(64), 'tests/fixtures/perf-helper.js': 'e'.repeat(64) }
  },
  machine: { cpu: 'cpu', logicalProcessors: 4, memoryGb: 8, platform: 'win32 10', node: 'v26.13.0' },
  git: null,
  proof: { file: 'proof.txt', present: false }
};

function percentileSummary(times) {
  const sorted = times.slice().sort((a, b) => a - b);
  return { p50: records.percentile(sorted, 0.5), p95: records.percentile(sorted, 0.95),
    max: sorted[sorted.length - 1] };
}

function makeCell(variant, level, cellCount, times) {
  const key = variant + '/' + level;
  const stats = percentileSummary(times);
  return {
    variant: variant, level: level, cellCount: cellCount, budget: records.budgetOf(cellCount), attempts: 8,
    summary: Object.assign({ n: times.length, hits: times.length, rate: 1, verdict: 'offered', stopped: null,
      errors: 0, approximate: 0, invalid: 0 }, stats),
    requests: times.map((ms, index) => ({ key: key, index: index, seed: 1000 + index, hit: true, ms: ms,
      achieved: level, score: 15, solved: true, approximate: false, exact: true, valid: true }))
  };
}

const hiddenCell = (variant, level) => ({ variant: variant, level: level, cellCount: 16, budget: 2000,
  attempts: 8, summary: { n: 0, hits: 0, rate: 0, p50: 0, p95: 0, max: 0, verdict: 'hidden', stopped: null },
  requests: [] });

const fill = (n, ms) => new Array(n).fill(ms);

/**
 * Two variants: alpha (16 cells, budget 2000) publishes veryEasy and hard; beta (81 cells, budget 10000)
 * publishes veryEasy, easy and normal; the other cells are hidden. `times` replaces the times of a cell.
 */
function synth(times) {
  const t = Object.assign({
    'alpha/veryEasy': fill(40, 5), 'alpha/hard': fill(40, 100), 'beta/veryEasy': fill(40, 20),
    'beta/easy': fill(40, 50), 'beta/normal': fill(40, 80)
  }, times || {});
  const cells = [];
  [['alpha', 16, ['veryEasy', 'hard']], ['beta', 81, ['veryEasy', 'easy', 'normal']]].forEach((v) => {
    LEVELS.forEach((level) => {
      cells.push(v[2].indexOf(level) !== -1 ? makeCell(v[0], level, v[1], t[v[0] + '/' + level])
        : hiddenCell(v[0], level));
    });
  });
  return {
    matrix: { variants: ['alpha', 'beta'], levels: LEVELS.slice(), cells: 8 },
    support: { alpha: ['veryEasy', 'hard'], beta: ['veryEasy', 'easy', 'normal'] },
    engine: { sources: '0123456789abcdef', commit: 'abc1234', commits: ['abc1234'], dirty: false },
    machine: { cpu: 'cpu', logicalProcessors: 4, memoryGb: 8, platform: 'win32 10', node: 'v26.13.0',
      jobs: 4 },
    qualifierHash: 'a'.repeat(64), ratingVersion: 3, seedBase: 1, guardMs: 120000, started: 's',
    finished: 'f',
    totals: { cells: 8, offered: 5 }, cells: cells
  };
}

function declarations(over) {
  return Object.assign({
    files: ['x.js'], published: { alpha: ['veryEasy', 'hard'], beta: ['veryEasy', 'easy', 'normal'] },
    cellCounts: { alpha: 16, beta: 81 }, attempts: { alpha: 8, beta: 8 },
    targets: {
      alpha: { veryEasy: 10, hard: 350 }, beta: { veryEasy: 80, easy: 200, normal: 200 }
    },
    targetLevels: LEVELS.slice(),
    perfCells: ['alpha/veryEasy', 'alpha/hard', 'beta/veryEasy', 'beta/easy', 'beta/normal']
  }, over || {});
}

function run(q, over) {
  return gp.build(Object.assign({
    qualification: q, qualificationBytes: 1, qualificationHash: 'f'.repeat(64), qualificationPath: 'q.json',
    declarations: declarations(), records: records, expect: null, expectedPublished: 5, env: ENV
  }, over || {}));
}

const projection = (out, key) => out.projections.find((p) => p.key === key);
const row = (out, key) => out.targetProposal.rows.find((r) => r.key === key);

function invalid(mutate, pattern, over) {
  const q = synth();
  mutate(q);
  assert.throws(() => run(q, over), (err) => err instanceof gp.InputError &&
    pattern.test(err.problems.join('\n')), String(pattern));
}

const cellOf = (q, key) => q.cells.find((c) => c.variant + '/' + c.level === key);

// -------------------------------------------------------------------------------------------------
// Projection
// -------------------------------------------------------------------------------------------------

test('a 40-request cell: mean, percentiles and the 50 * mean alert, unflagged and unadmitted', () => {
  const out = run(synth({ 'beta/normal': fill(40, 1000) }));
  const p = projection(out, 'beta/normal');
  assert.deepStrictEqual([p.requests, p.mean, p.p50, p.p95, p.max, p.meanAlertSeconds, p.flagged],
    [40, 1000, 1000, 1000, 1000, 50, false]);
  assert.deepStrictEqual(out.flagged, []);
  assert.strictEqual(p.admission.status, 'unadmitted-no-reviewed-basis');
  assert.strictEqual(p.admission.approved, false);
  assert.strictEqual(p.admission.basis, null);
  assert.strictEqual(p.admission.margin, null);
});

test('a 100-request cell (second round) is accepted; any other count is not a complete round', () => {
  const times = fill(100, 40).map((v, i) => v + i / 10);
  const out = run(synth({ 'beta/normal': times }));
  const p = projection(out, 'beta/normal');
  assert.strictEqual(p.requests, 100);
  assert.strictEqual(p.p95, times.slice().sort((a, b) => a - b)[94]);
  assert.throws(() => run(synth({ 'beta/normal': fill(53, 80) })), (err) => err instanceof gp.InputError &&
    /53 requests is not a complete round/.test(err.problems.join('\n')));
  assert.throws(() => run(synth({ 'beta/normal': fill(99, 80) })), /99 requests is not a complete round/);
});

test('a 10,000 ms mean gives a 500 s alert and is flagged; the exit code of main is 1', () => {
  const out = run(synth({ 'alpha/hard': fill(40, 10000) }));
  const p = projection(out, 'alpha/hard');
  assert.strictEqual(p.meanAlertSeconds, 500);
  assert.strictEqual(p.flagged, true);
  assert.strictEqual(p.admission.status, 'flagged-mean-alert');
  assert.deepStrictEqual(out.flagged.map((f) => f.key), ['alpha/hard']);
  assert.strictEqual(out.totals.flaggedCells, 1);
});

test('exactly 450 s is not flagged; one tenth of a microsecond more on the mean is', () => {
  const out = run(synth({ 'alpha/hard': fill(40, 9000) }));
  const p = projection(out, 'alpha/hard');
  assert.strictEqual(p.meanAlertSeconds, 450);
  assert.strictEqual(p.flagged, false);
  const above = fill(40, 9000);
  above[0] = 9000.004;
  const q = projection(run(synth({ 'alpha/hard': above })), 'alpha/hard');
  assert.strictEqual(q.mean, 9000.0001);
  assert.strictEqual(q.flagged, true);
});

test('times with more than four decimals use the float path and keep the strict boundary', () => {
  const hard = (ms) => projection(run(synth({ 'alpha/hard': fill(40, ms) })), 'alpha/hard');
  assert.strictEqual(hard(9000.00001).flagged, true);
  assert.strictEqual(hard(8999.99999).flagged, false);
});

test('the 50 * maximum is kept apart from the mean alert and never flags a cell', () => {
  const times = fill(40, 100);
  times[7] = 9100;
  const p = projection(run(synth({ 'beta/easy': times })), 'beta/easy');
  assert.strictEqual(p.maxAlertSeconds, 455);
  assert.strictEqual(p.maxAlertOver450, true);
  assert.strictEqual(p.flagged, false);
  assert.deepStrictEqual(run(synth({ 'beta/easy': times })).totals.cellsWithMaxAlertOver450, ['beta/easy']);
});

test('the sum of the alerts is the exact decimal sum, rounded to nine places', () => {
  const out = run(synth());
  const sum = out.projections.reduce((a, p) => a + p.meanAlertSeconds, 0);
  assert.strictEqual(out.totals.sumOfMeanAlertSeconds, Math.round(sum * 1e9) / 1e9);
  assert.strictEqual(out.totals.sumOfMeanAlertSeconds, 0.25 + 5 + 1 + 2.5 + 4);
});

test('the mean of four-decimal times is the exact decimal quotient, not a float-sum artefact', () => {
  const times = fill(40, 1000.0001);
  times[0] = 2000.9999;
  const p = projection(run(synth({ 'beta/normal': times })), 'beta/normal');
  assert.strictEqual(p.mean, 1025.025095);
  assert.strictEqual(p.meanAlertSeconds, 51.25125475);
});

// -------------------------------------------------------------------------------------------------
// Invalid and missing input (exit 2)
// -------------------------------------------------------------------------------------------------

test('every invalid or missing input is an InputError that names the problem', () => {
  invalid((q) => { q.cells.pop(); }, /missing cell beta\/hard/);
  invalid((q) => { q.cells.push(q.cells[0]); }, /duplicate cell alpha\/veryEasy/);
  invalid((q) => { q.cells[0].variant = 'gamma'; }, /not in the matrix|missing cell alpha\/veryEasy/);
  invalid((q) => { cellOf(q, 'beta/easy').requests[3].index = 2; }, /duplicate request index 2/);
  invalid((q) => { cellOf(q, 'beta/easy').requests[3].key = 'beta/normal'; }, /has key "beta\/normal"/);
  invalid((q) => { cellOf(q, 'beta/easy').requests[3].ms = -1; }, /not finite and >= 0/);
  invalid((q) => { cellOf(q, 'beta/easy').requests[3].ms = Infinity; }, /not finite and >= 0/);
  invalid((q) => { cellOf(q, 'beta/easy').requests[3].ms = NaN; }, /not finite and >= 0/);
  invalid((q) => { cellOf(q, 'beta/easy').requests[3].ms = '12'; }, /not finite and >= 0/);
  invalid((q) => { delete cellOf(q, 'beta/easy').requests[3].ms; }, /not finite and >= 0/);
  invalid((q) => { cellOf(q, 'beta/easy').requests = []; }, /no requests/);
  invalid((q) => { delete cellOf(q, 'beta/easy').requests; }, /no requests/);
  invalid((q) => { cellOf(q, 'beta/easy').summary.n = 39; }, /40 requests, summary n 39/);
  invalid((q) => { cellOf(q, 'beta/easy').summary.p95 = 1; }, /p95 50 differs from the summary 1/);
  invalid((q) => { cellOf(q, 'beta/easy').summary.verdict = 'hidden'; }, /verdict hidden, not offered/);
  invalid((q) => { cellOf(q, 'beta/hard').summary.verdict = 'offered'; },
    /offered in the record but not published/);
  invalid((q) => { q.support.beta = ['veryEasy', 'easy']; }, /published support/);
  invalid((q) => { delete q.support.beta; }, /published support/);
  invalid((q) => { cellOf(q, 'beta/easy').budget = 2000; }, /cellCount\/budget/);
  invalid((q) => { cellOf(q, 'beta/easy').attempts = 4; }, /attempts 4 is not the default 8/);
  invalid((q) => { q.engine.sources = 'xyz'; }, /16-hex engine.sources/);
  assert.throws(() => run({ cells: [] }), gp.InputError);
  assert.throws(() => run(null), gp.InputError);
});

test('published count, target positions and the accepted hash are checked', () => {
  invalid(() => {}, /5 published cells, not 79/, { expectedPublished: 79 });
  const failsWith = (over, pattern) => assert.throws(() => run(synth(), over),
    (e) => e instanceof gp.InputError && pattern.test(e.message));
  const decl = declarations();
  decl.targets.alpha.easy = 50;
  failsWith({ declarations: decl }, /alpha\/easy: has a target but is not published/);
  const noTarget = declarations();
  delete noTarget.targets.beta.easy;
  failsWith({ declarations: noTarget }, /beta\/easy: is published but has no/);
  const bad = declarations();
  bad.targets.beta.easy = 0;
  failsWith({ declarations: bad }, /not positive/);
  failsWith({ declarations: declarations({ published: { alpha: [] } }) },
    /beta is not registered|beta: published support/);
  failsWith({ expect: Object.assign({}, gp.ACCEPTED, { published: 5 }) }, /is not the accepted/);
});

// -------------------------------------------------------------------------------------------------
// The target rule
// -------------------------------------------------------------------------------------------------

test('ceil(3 * q) is exact for four-decimal times and the integer boundary', () => {
  assert.deepStrictEqual([10.1122, 12.9032, 100, 100.0001, 0.3334, 0.3333, 780.3884].map(gp.ceilTriple),
    [31, 39, 300, 301, 2, 1, 2342]);
  assert.strictEqual(gp.ceilTriple(1.23456789), Math.ceil(3 * 1.23456789));
});

test('keep when q <= t (equality keeps); update when q > t, never below the old one here', () => {
  const out = run(synth({ 'alpha/veryEasy': fill(40, 10), 'alpha/hard': fill(40, 350.0001) }));
  assert.deepStrictEqual([row(out, 'alpha/veryEasy').action, row(out, 'alpha/veryEasy').proposedTarget],
    ['keep', 10]);
  const r = row(out, 'alpha/hard');
  assert.deepStrictEqual([r.action, r.q, r.oldTarget, r.ceil3q, r.proposedTarget, r.decidedBy],
    ['update', 350.0001, 350, 1051, 1051, 'ceil3q']);
  assert.deepStrictEqual(out.targetProposal.summary, { cells: 5, kept: 4, changed: 1 });
  assert.deepStrictEqual(out.targetProposal.changes.map((c) => c.key), ['alpha/hard']);
});

test('the proposal is min(budget, max(predecessor, ceil(3q))): ceiling, floor and cap', () => {
  // alpha/veryEasy: 3 * 600.5 = 1801.5 -> 1802 (budget 2000). alpha/hard: q 300 <= 350 is kept.
  let out = run(synth({ 'alpha/veryEasy': fill(40, 600.5), 'alpha/hard': fill(40, 300) }));
  assert.deepStrictEqual([row(out, 'alpha/veryEasy').proposedTarget, row(out, 'alpha/veryEasy').decidedBy],
    [1802, 'ceil3q']);
  // the cap: 3 * 900 = 2700 > 2000
  out = run(synth({ 'alpha/veryEasy': fill(40, 900) }));
  assert.deepStrictEqual([row(out, 'alpha/veryEasy').proposedTarget, row(out, 'alpha/veryEasy').decidedBy],
    [2000, 'budget']);
  // the floor: beta/veryEasy rises to 3 * 3000 = 9000; beta/easy outgrows 200 with 3 * 201 = 603 < 9000
  out = run(synth({ 'beta/veryEasy': fill(40, 3000), 'beta/easy': fill(40, 201) }));
  const easy = row(out, 'beta/easy');
  assert.deepStrictEqual([easy.predecessor, easy.ceil3q, easy.proposedTarget, easy.decidedBy],
    [9000, 603, 9000, 'predecessor']);
});

test('a kept cell receives no cascade: the next level uses the kept target as its predecessor', () => {
  // beta/veryEasy is raised to 9000, beta/easy (q 50 <= 200) keeps 200, beta/normal (q 250 > 200) uses 200.
  const out = run(synth({ 'beta/veryEasy': fill(40, 3000), 'beta/normal': fill(40, 250) }));
  assert.deepStrictEqual([row(out, 'beta/veryEasy').proposedTarget, row(out, 'beta/easy').action,
    row(out, 'beta/easy').proposedTarget], [9000, 'keep', 200]);
  const normal = row(out, 'beta/normal');
  assert.deepStrictEqual([normal.predecessor, normal.proposedTarget, normal.decidedBy], [200, 750, 'ceil3q']);
});

test('a hidden level is never a candidate: the predecessor is the previous published level', () => {
  const decl = declarations({ published: { alpha: ['veryEasy', 'hard'], beta: ['veryEasy', 'normal'] },
    targets: { alpha: { veryEasy: 10, hard: 350 }, beta: { veryEasy: 80, normal: 200 } },
    perfCells: [] });
  const q = synth();
  q.support.beta = ['veryEasy', 'normal'];
  q.cells = q.cells.filter((c) => !(c.variant === 'beta' && c.level === 'easy')).concat(
    [hiddenCell('beta', 'easy')]);
  const out = run(q, { declarations: decl, expectedPublished: 4 });
  assert.deepStrictEqual(out.publishedCells.map((c) => c.key),
    ['alpha/veryEasy', 'alpha/hard', 'beta/veryEasy', 'beta/normal']);
  assert.strictEqual(row(out, 'beta/normal').predecessor, 80);
  assert.strictEqual(out.targetProposal.rows.some((r) => r.key === 'beta/easy'), false);
  assert.strictEqual(out.projections.some((p) => p.key === 'beta/easy'), false);
});

test('the minimum successes use integer arithmetic: 72 of 79; 71 of 79 prints 90 % but fails', () => {
  assert.strictEqual(gp.minSuccesses(79), 72);
  assert.strictEqual(gp.minSuccesses(10), 9);
  assert.strictEqual((71 / 79 * 100).toFixed(0), '90');
  assert.ok(71 / 79 < 0.9 && 72 / 79 >= 0.9);
  assert.ok(71 < gp.minSuccesses(79));
});

// -------------------------------------------------------------------------------------------------
// Metadata loading generates nothing
// -------------------------------------------------------------------------------------------------

function fakeLoader(calls) {
  const spy = (name) => () => { calls.push(name); throw new Error(name + ' must not be called'); };
  return (files) => {
    calls.push('load:' + files.length);
    calls.files = files;
    return {
      variants: {
        list: () => [{ id: 'alpha', difficultySupport: ['veryEasy', 'hard'] }],
        cellCountOf: () => 16
      },
      digger: { defaultMaxAttempts: () => 8, generate: spy('digger.generate') },
      pipeline: { run: spy('pipeline.run') },
      fixtures: { perfTools: {
        PERF_TARGETS: { alpha: { veryEasy: 10, hard: 350 } }, TARGET_LEVELS: LEVELS, measure: spy('measure'),
        cells: () => [{ key: 'alpha/veryEasy' }, { key: 'alpha/hard' }]
      } }
    };
  };
}

test('loadDeclarations loads engine files and perf-helper, never perf.js, and generates nothing', () => {
  const calls = [];
  const decl = gp.loadDeclarations(fakeLoader(calls), GENERATOR);
  assert.deepStrictEqual(decl.published, { alpha: ['veryEasy', 'hard'] });
  assert.deepStrictEqual(decl.perfCells, ['alpha/veryEasy', 'alpha/hard']);
  assert.deepStrictEqual(calls.filter((c) => !/^load:/.test(c)), []);
  assert.ok(calls.files.indexOf('tests/fixtures/perf-helper.js') !== -1);
  assert.strictEqual(calls.files.indexOf('tests/perf.js'), -1);
  assert.strictEqual(calls.files.some((f) => /^js\/(ui|worker)\//.test(f)), false);
  assert.ok(calls.files.some((f) => f === 'js/variants/registry.js'));
});

test('the helper source never calls measure, the pipeline or a generator, and never requires perf.js', () => {
  const text = fs.readFileSync(path.join(__dirname, 'project-gp.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const calling = /\bmeasure\(|pipeline\.run|\.generate\(|runSteps|digger\.generate|dfs\.solve/;
  assert.strictEqual(calling.test(text), false);
  const requires = (text.match(/require\([^)]*\)/g) || []);
  assert.strictEqual(requires.some((r) => /perf\.js/.test(r) && !/replay-fixtures/.test(r)), false);
});

// -------------------------------------------------------------------------------------------------
// The command: exit codes, files, CRLF
// -------------------------------------------------------------------------------------------------

function withScratch(fn) {
  const dir = fs.mkdtempSync(path.join(REPO, '.scratch-ms18d-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function runMain(dir, q, argvExtra, over) {
  const qFile = path.join(dir, 'q.json');
  if (q !== undefined) fs.writeFileSync(qFile, JSON.stringify(q), 'utf8');
  const out = [];
  const err = [];
  const code = gp.main(['--qualification=' + qFile, '--json=' + path.join(dir, 'out', 'gp.json')]
    .concat(argvExtra || []), Object.assign({
    out: (t) => out.push(t), err: (t) => err.push(t), cwd: dir, expect: null,
    loadDeclarations: () => declarations(), identities: ENV.identities, machine: ENV.machine, git: null,
    proof: ENV.proof
  }, over || {}));
  return { code: code, out: out, err: err, json: path.join(dir, 'out', 'gp.json') };
}

test('main exits 0, 1 or 2; the file is CRLF with the named keys and is written only on 0 and 1', () => {
  withScratch((dir) => {
    const ok = runMain(dir, synth());
    assert.strictEqual(ok.code, 0);
    const bytes = fs.readFileSync(ok.json);
    const text = bytes.toString('utf8');
    assert.ok(/\r\n$/.test(text) && !/(^|[^\r])\n/.test(text) && !/[ \t]\r\n/.test(text));
    const data = JSON.parse(text);
    assert.deepStrictEqual(Object.keys(data).filter((k) => ['qualificationHash', 'qualificationEngine',
      'publishedCells', 'projections', 'flagged', 'targetProposal', 'inputs'].indexOf(k) !== -1).length, 7);
    assert.strictEqual(data.inputs.qualification.sha256, data.qualificationHash);
    assert.ok(ok.out.some((l) => /^FLAGGED .*: none/.test(l)));
    fs.rmSync(path.join(dir, 'out'), { recursive: true });
    const flagged = runMain(dir, synth({ 'alpha/hard': fill(40, 10000) }));
    assert.strictEqual(flagged.code, 1);
    assert.ok(fs.existsSync(flagged.json));
    assert.ok(flagged.out.some((l) => /^FLAGGED .*alpha\/hard/.test(l)));
    fs.rmSync(path.join(dir, 'out'), { recursive: true });
    const q = synth();
    q.cells.pop();
    const bad = runMain(dir, q);
    assert.strictEqual(bad.code, 2);
    assert.strictEqual(fs.existsSync(bad.json), false);
    assert.ok(bad.err.some((l) => /^INVALID: missing cell beta\/hard/.test(l)));
  });
});

test('main exits 2 for a missing file, broken JSON, an unknown argument, a path outside the repo', () => {
  withScratch((dir) => {
    assert.strictEqual(runMain(dir, undefined).code, 2);
    fs.writeFileSync(path.join(dir, 'q.json'), '{ not json', 'utf8');
    assert.strictEqual(runMain(dir, undefined).code, 2);
    assert.strictEqual(runMain(dir, synth(), ['--runs=50']).code, 2);
    const outside = path.resolve(REPO, '..', 'ms18d-never-written.json');
    const res = gp.main(['--qualification=' + path.join(dir, 'q.json'), '--json=' + outside],
      { out: () => {}, err: () => {}, cwd: dir, expect: null });
    assert.strictEqual(res, 2);
    assert.strictEqual(fs.existsSync(outside), false);
    assert.strictEqual(gp.main([], { out: () => {}, err: () => {}, cwd: dir }), 2);
    assert.strictEqual(gp.main(['--help'], { out: () => {}, err: () => {}, cwd: dir }), 0);
  });
});

test('main is deterministic: the same input gives the same bytes', () => {
  withScratch((dir) => {
    const a = runMain(dir, synth());
    const first = fs.readFileSync(a.json);
    runMain(dir, synth());
    assert.ok(first.equals(fs.readFileSync(a.json)));
  });
});

// -------------------------------------------------------------------------------------------------
// cost-compare.js
// -------------------------------------------------------------------------------------------------

const creq = (key, index, ms, extra) => Object.assign({
  key: key, index: index, seed: 50 + index, hit: true, ms: ms, achieved: 'expert', score: 900, solved: true,
  approximate: false, exact: true, valid: true
}, extra);
const ccell = (key, reqs) => ({ variant: key.split('/')[0], level: key.split('/')[1], requests: reqs });

test('median: odd count, even count (mean of the middle two), empty', () => {
  assert.strictEqual(cost.median([3, 1, 2]), 2);
  assert.strictEqual(cost.median([4, 1, 2, 3]), 2.5);
  assert.strictEqual(cost.median([]), null);
});

test('pair rules: strict needs every field but ms equal and an old time above zero; seeds must agree', () => {
  const oldCells = [ccell('mega16/expert', [creq('mega16/expert', 0, 10), creq('mega16/expert', 1, 10),
    creq('mega16/expert', 2, 10), creq('mega16/expert', 3, 0), creq('mega16/expert', 4, 10),
    creq('mega16/expert', 5, 10)])];
  const newCells = [ccell('mega16/expert', [creq('mega16/expert', 0, 20),
    creq('mega16/expert', 1, 30, { score: 901 }), creq('mega16/expert', 2, 40, { hit: false }),
    creq('mega16/expert', 3, 50), creq('mega16/expert', 4, 60, { seed: 999 }),
    creq('mega16/expert', 5, 5, { achieved: 'master' })])];
  const count = (rule) => cost.pairs(oldCells, newCells, cost.RULES[rule]).length;
  assert.deepStrictEqual(['strict', 'outcomeScore', 'outcome', 'seed'].map(count), [1, 1, 2, 4]);
  assert.deepStrictEqual(cost.pairs(oldCells, newCells, cost.RULES.strict).map((p) => p.ratio), [2]);
  const summary = cost.summarize(oldCells, newCells, cost.RULES.seed);
  assert.strictEqual(summary.cohorts[0].key, 'mega16/expert');
  assert.strictEqual(summary.cohorts[0].pairs, 4);
  assert.strictEqual(summary.cohorts[0].median, 2.5);
});

test('a duplicated request and a shard whose bytes differ from the listed SHA-256 are invalid', () => {
  assert.throws(() => cost.pairs([ccell('a/b', [creq('a/b', 0, 1), creq('a/b', 0, 2)])], [], cost.RULES.seed),
    (e) => e instanceof cost.InputError && /duplicate request a\/b#0/.test(e.message));
  withScratch((dir) => {
    fs.mkdirSync(path.join(dir, 's'));
    fs.writeFileSync(path.join(dir, 's', 'x.json'), JSON.stringify({ cells: [], engine: {} }), 'utf8');
    const checkpoint = path.join(dir, 'c.json');
    fs.writeFileSync(checkpoint, JSON.stringify({ identity: {}, shards: [{ file: 's/x.json',
      sha256: '0'.repeat(64) }] }), 'utf8');
    assert.throws(() => cost.readOld(checkpoint, dir), /does not match its listed SHA-256/);
    fs.writeFileSync(checkpoint, JSON.stringify({ identity: {}, shards: [{ file: 's/missing.json',
      sha256: '0'.repeat(64) }] }), 'utf8');
    assert.throws(() => cost.readOld(checkpoint, dir), /missing shard/);
  });
});

// -------------------------------------------------------------------------------------------------
// Real data at the accepted base (reads only; nothing is generated)
// -------------------------------------------------------------------------------------------------

const BRIEF = [
  ['classic4/veryEasy', 10.1122, 10, 31], ['classic6/veryEasy', 12.9032, 10, 39],
  ['classic9/easy', 780.3884, 150, 2342], ['classic9/normal', 875.5958, 150, 2627],
  ['classic9/expert', 440.7861, 400, 1323], ['classic9/nightmare', 2792.0346, 2500, 8377],
  ['mega12/nightmare', 6280.4697, 3000, 18842], ['mega16/hell2', 25239.0671, 10000, 30000],
  ['diagonalX/nightmare', 5368.3201, 3000, 10000], ['hyper/normal', 524.3035, 200, 1573],
  ['hyper/nightmare', 8503.0273, 3000, 10000], ['jigsaw9/easy', 634.7225, 350, 1905],
  ['jigsaw9/hell2', 6102.238, 5000, 10000], ['killer/normal', 1808.2659, 700, 5425],
  ['sohei/hell2', 27155.5581, 20000, 30000], ['butterfly/nightmare', 16120.4641, 8000, 30000],
  ['wordoku/easy', 973.633, 250, 2921]
];
const BRIEF_TOP = [['sohei/hell2', 485.597059875], ['butterfly/nightmare', 303.421639375],
  ['mega12/hell2', 238.706340625], ['butterfly/hell2', 224.98218125], ['greaterThan/hell2', 224.924644],
  ['mega16/hell2', 205.9701415], ['samurai/master', 205.780898125]];

function realCase() {
  const identities = gp.computeIdentities(GENERATOR);
  const helperAtBase = identities.files['tests/fixtures/perf-helper.js'] === gp.ACCEPTED.perfHelperSha256;
  if (!helperAtBase) {
    skipped++;
    console.log('SKIP real-data cases: perf-helper.js differs from the accepted base (targets were updated)');
    return;
  }
  const bytes = fs.readFileSync(REAL_QUALIFICATION);
  // Traps on the two engine entry points of a generation, installed before any engine file runs: they
  // count the calls made while the declarations are loaded (a load only defines and registers).
  const calls = [];
  const trapped = {};
  const stub = {};
  const hooks = { pipeline: ['run', 'runSteps'], digger: ['generate'] };
  Object.keys(hooks).forEach((name) => {
    let value;
    Object.defineProperty(stub, name, {
      configurable: true, enumerable: true, get: () => value,
      set: (v) => {
        trapped[name] = true;
        value = new Proxy(Object.assign({}, v), {
          get: (target, prop) => {
            if (hooks[name].indexOf(prop) === -1 || typeof target[prop] !== 'function') return target[prop];
            return function () {
              calls.push(name + '.' + String(prop));
              return target[prop].apply(this, arguments);
            };
          }
        });
      }
    });
  });
  globalThis.SG = stub;
  const decl = gp.loadDeclarations(require(path.join(GENERATOR, 'tests', 'replay-fixtures.js')).loadFixtures,
    GENERATOR);
  const real = globalThis.SG;
  const build = () => gp.build({
    qualification: JSON.parse(bytes.toString('utf8')), qualificationBytes: bytes.length,
    qualificationHash: crypto.createHash('sha256').update(bytes).digest('hex'),
    qualificationPath: 'q', declarations: decl, records: records, expect: gp.ACCEPTED,
    env: { identities: identities, machine: ENV.machine, git: null, proof: ENV.proof }
  });
  const out = build();
  test('real data: loading the declarations and building call no pipeline, digger or perf.js', () => {
    assert.deepStrictEqual(Object.keys(trapped).sort(), ['digger', 'pipeline'], 'the traps were installed');
    assert.strictEqual(typeof real.pipeline.run, 'function');
    assert.deepStrictEqual(calls, []);
    assert.strictEqual(decl.files.indexOf('tests/perf.js'), -1);
    assert.strictEqual(real.fixtures.perfTools.cells().length, 79);
  });
  test('real data: 79 published cells with 40 requests each, the 56 hidden ones absent', () => {
    assert.strictEqual(out.publishedCells.length, 79);
    assert.deepStrictEqual(out.totals.requestsPerCellInGq, [40]);
    assert.strictEqual(out.inputs.declarations.perfCellsEqualPublished, true);
    const hidden = JSON.parse(bytes.toString('utf8')).cells.filter((c) => c.summary.verdict === 'hidden')
      .map((c) => c.variant + '/' + c.level);
    assert.strictEqual(hidden.length, 56);
    assert.strictEqual(hidden.some((k) => out.publishedCells.some((c) => c.key === k)), false);
  });
  test('real data: the 17 proposals of the brief, 62 kept, no anomaly', () => {
    assert.deepStrictEqual(out.targetProposal.summary, { cells: 79, kept: 62, changed: 17 });
    assert.deepStrictEqual(out.targetProposal.changes.map((c) => [c.key, c.q, c.oldTarget, c.proposedTarget]),
      BRIEF);
    assert.deepStrictEqual(out.targetProposal.anomalies, []);
  });
  test('real data: Sohei Hell 2 is the one flagged mean alert; the sum and the largest alerts match', () => {
    assert.deepStrictEqual(out.flagged.map((f) => [f.key, f.requests, f.mean, f.meanAlertSeconds]),
      [['sohei/hell2', 40, 9711.9411975, 485.597059875]]);
    assert.strictEqual(out.totals.sumOfMeanAlertSeconds, 3803.9658065);
    assert.deepStrictEqual(out.totals.largestMeanAlerts.map((p) => [p.key, p.meanAlertSeconds]), BRIEF_TOP);
    assert.strictEqual(out.totals.cellsWithMaxAlertOver450.length, 13);
    assert.strictEqual(out.totals.unadmittedWithoutBasis, 78);
    assert.strictEqual(out.projections.every((p) => p.admission.approved === false), true);
  });
  test('real data: the inputs bind the accepted identities and the build is repeatable', () => {
    assert.strictEqual(out.inputs.qualification.equalsAccepted, true);
    assert.strictEqual(out.inputs.qualification.measuredSources, '0ca29eaeebc295b6');
    assert.strictEqual(out.inputs.publication.sources, '75b0955e3e356bd1');
    assert.strictEqual(out.inputs.publication.qualifierHashEqualsRecord, true);
    assert.strictEqual(out.inputs.identities.hashIdentityEqualsAccepted, true);
    assert.strictEqual(out.inputs.identities.replayIdentityEqualsAccepted, true);
    Object.keys(out.inputs.tools).filter((k) => out.inputs.tools[k].acceptedBase !== null)
      .forEach((k) => assert.strictEqual(out.inputs.tools[k].equalsAcceptedBase, true, k));
    assert.strictEqual(out.inputs.protocol.gate.minSuccesses, 72);
    assert.strictEqual(out.inputs.protocol.gate.requests, 3950);
    assert.strictEqual(JSON.stringify(build()), JSON.stringify(out));
  });
}
realCase();

console.log(passed + ' passed, ' + failed.length + ' failed, ' + skipped + ' skipped');
if (failed.length > 0) console.log('FAILED: ' + failed.join(' | '));
process.exitCode = failed.length === 0 ? 0 : 1;
