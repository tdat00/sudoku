'use strict';

/*
 * MS18d Phase D, task-owned: focused synthetic cases for the NEW validation behaviour of closeout.js and of the
 * thin locked caller run-locked-d.ps1 (nothing else of the closeout is tested twice: the existing identity, CI and
 * hash tools keep their own tests). Run it through run-locked-d.ps1 like every Phase D Node command. It reads the
 * committed final report and plan (read-only) as the base of the mutated copies, runs the caller on a stand-in
 * helper in a scratch folder of its own (.scratch-*, ignored by git, removed at the end) and never touches a
 * Phase D evidence file or the real shared lock.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');
const co = require('./closeout.js');

let passed = 0;
const failed = [];
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('ok   ' + name);
  } catch (err) {
    failed.push(name);
    console.log('FAIL ' + name + '\n     ' + (err && err.stack ? err.stack.split('\n').slice(0, 4).join('\n     ') : err));
  }
}

const clone = (x) => JSON.parse(JSON.stringify(x));
const report = co.readJson(path.join(co.FINAL, 'report.json'));
const plan = co.readJson(path.join(co.PHASE_C, 'gp-chunk-manifest-a3-v2.json'));
const chunkOf = new Map(plan.chunks.map((c) => [c.chunkId, c]));
const refOf = (rep) => new Map(rep.consumed.map((x) => [x.runDir, x]));
// a ledger reader that agrees with the plan: the indices and seeds of the chunk and the recorded hash
const agreeing = (rep) => {
  const byDir = refOf(rep);
  return (runDir) => {
    const ref = byDir.get(runDir);
    const chunk = chunkOf.get(ref.chunkId);
    return { sha256: ref.ledgerSha256, requests: chunk.seeds.map((seed, i) => ({ index: chunk.i0 + i, seed })) };
  };
};
const problemsOf = (rep, ledgerOf) => co.cellRows(rep, plan, ledgerOf || agreeing(rep)).problems;
const has = (problems, re) => problems.some((p) => re.test(p));

test('the display rounding is four decimals with the zeros dropped and never decides a verdict', () => {
  assert.strictEqual(co.fmt(604.1490000000003), '604.149');
  assert.strictEqual(co.fmt(15496.112700000001), '15496.1127');
  assert.strictEqual(co.fmt(0.40100000000001046), '0.401');
  assert.strictEqual(co.fmt(35522.675), '35522.675');
  const rows = co.cellRows(report, plan, agreeing(report)).rows;
  const w = rows.filter((r) => r.cell === 'wordoku/expert')[0];
  assert.strictEqual(w.verdict, 'MISS', '604.149 > 600 is a miss');
  assert.strictEqual(rows.filter((r) => r.verdict === 'meets').length, 74);
});

test('the 79 rows of the committed report agree with the V2 plan and the consumed ledgers', () => {
  assert.deepStrictEqual(problemsOf(report), []);
});

test('a missing, duplicated or wrongly targeted cell is a problem, never accepted', () => {
  const missing = clone(report);
  missing.cells.pop();
  assert.ok(has(problemsOf(missing), /has 78 cells, not 79|missing from the report/));
  const dup = clone(report);
  dup.cells[1] = clone(dup.cells[0]);
  assert.ok(has(problemsOf(dup), /twice in the report/));
  const target = clone(report);
  target.cells[2].stats.target += 1;
  assert.ok(has(problemsOf(target), /the target is not the plan target/));
  const verdict = clone(report);
  verdict.cells[0].stats.meets = false;
  assert.ok(has(problemsOf(verdict), /strict p95 < target/));
});

test('a consumed ledger that is missing, other bytes, other indices or other seeds is a problem', () => {
  const none = problemsOf(report, () => null);
  assert.ok(has(none, /the ledger file is missing/));
  const other = (runDir) => Object.assign({}, agreeing(report)(runDir), { sha256: 'f'.repeat(64) });
  assert.ok(has(problemsOf(report, other), /ledger bytes differ/));
  const shifted = (runDir) => {
    const led = agreeing(report)(runDir);
    led.requests = led.requests.map((r) => ({ index: r.index + 1, seed: r.seed }));
    return led;
  };
  assert.ok(has(problemsOf(report, shifted), /indices are not the plan indices/));
  const reseeded = (runDir) => {
    const led = agreeing(report)(runDir);
    led.requests = led.requests.map((r) => ({ index: r.index, seed: r.seed + 1 }));
    return led;
  };
  assert.ok(has(problemsOf(report, reseeded), /seeds are not the plan seeds/));
});

test('a changed aggregate (117 ledgers, a different miss set, 34 extra starts) is a problem', () => {
  const consumed = clone(report);
  consumed.consumed.push(clone(consumed.consumed[0]));
  assert.ok(has(problemsOf(consumed), /does not consume 114 ledgers/));
  const extra = clone(report);
  extra.extraColdStarts = 34;
  assert.ok(has(problemsOf(extra), /extraColdStarts is not 35/));
  const miss = clone(report);
  const c = miss.cells.filter((x) => x.cell === 'wordoku/expert')[0];
  c.stats.p95 = 599;
  c.stats.meets = true;
  assert.ok(has(problemsOf(miss), /the misses are not the five named|cells meeting: 75/));
});

test('only the 79-row table of the report is compared with the CSV, row by row and exactly', () => {
  const rows = co.cellRows(report, plan, agreeing(report)).rows;
  const csvRows = co.parseCsv(co.csvOf(rows));
  assert.strictEqual(csvRows.length, 79);
  const md = co.mdRowsOf(rows);
  assert.deepStrictEqual(co.reportProblems(md, csvRows, true), []);
  const edited = md.replace('| 4208.3516 |', '| 4208.352 |');
  assert.ok(co.reportProblems(edited, csvRows, true).some((p) => /mega12\/expert/.test(p)));
  assert.ok(co.reportProblems('no table here', csvRows, true).some((p) => /header is not in the report/.test(p)));
  assert.ok(co.reportProblems(md + '\n<<FILL:x>>\n', csvRows, true).some((p) => /placeholder/.test(p)));
  assert.deepStrictEqual(co.reportProblems(md + '\n<<FILL:x>>\n', csvRows, false), [], 'a draft may still be filled');
});

test('a tee transcript is cut at its markers; anything else is refused', () => {
  const good = '$ node a.js\r\nline one\r\nline two\r\nexit=0 seconds=1.25\r\n';
  assert.deepStrictEqual(co.bodyOf(good), ['line one', 'line two']);
  assert.throws(() => co.bodyOf('$ node a.js\nline one\n'), /no final marker/);
  assert.throws(() => co.bodyOf('line one\nexit=0 seconds=1\n'), /not a tee transcript/);
  assert.deepStrictEqual(co.bodyOf('$ node a.js\nsignal=SIGTERM seconds=540.0\n'), []);
});

test('the five identity lines are read in order and the baseline, the delta and the stability are checked', () => {
  const h = (c) => c.repeat(64);
  const text = ['generator quick fingerprint ' + h('a'), 'player quick fingerprint ' + h('b'),
    'generator with the manual trees ' + h('c'), 'replay identity (wire and analysis ledgers) ' + h('d'),
    'hash identity (hash ledgers) ' + h('e')].join('\n') + '\n';
  const ok = co.parseIdentities(text);
  assert.deepStrictEqual(ok.problems, []);
  assert.strictEqual(ok.identities.hashIdentity, h('e'));
  assert.ok(co.parseIdentities(text.split('\n').slice(1).join('\n')).problems.length > 0, 'four lines');
  const swapped = text.split('\n');
  [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
  assert.ok(co.parseIdentities(swapped.join('\n')).problems.length > 0, 'order');
});

test('a target re-check is accepted only with the exact counts, identities, table and all eleven statements', () => {
  const doc = {
    counts: { positions: 135, active: 79, absent: 56, retained: 62, updated: 17 }, tableSha256: co.EXPECT.tableSha256,
    identities: { sources: co.EXPECT.sources, hashIdentity: co.EXPECT.hashIdentity,
      replayIdentity: co.EXPECT.replayIdentity, replayIdentityBefore: co.EXPECT.replayIdentity },
    designTable: { equalToFrozen: true, bold: 17 },
    retainedBudgets: { statedIn: Array.from({ length: 11 }, () => ({ design: true, en: true, vi: true })) },
    problems: []
  };
  assert.deepStrictEqual(co.recheckProblems(doc, 'x'), []);
  const bad = (mutate, re) => {
    const d = clone(doc);
    mutate(d);
    assert.ok(co.recheckProblems(d, 'x').some((p) => re.test(p)), String(re));
  };
  bad((d) => { d.counts.updated = 16; }, /counts/);
  bad((d) => { d.tableSha256 = 'x'; }, /table/);
  bad((d) => { d.identities.hashIdentity = 'x'; }, /hash identity/);
  bad((d) => { d.designTable.bold = 16; }, /17 bold/);
  bad((d) => { d.retainedBudgets.statedIn[4].vi = false; }, /eleven/);
  bad((d) => { d.problems = ['x']; }, /lists problems/);
});

// ---------------------------------------------------------------------------------------------------------------

const inventory = () => ({ app: 'generator', sourceHash: 'h'.repeat(64), node: 'v26', timeFactor: 2, tests: [
  { suite: 'a', ordinal: 0, fullName: 'a > x', skipped: false }, { suite: 'a', ordinal: 1, fullName: 'a > y', skipped: false },
  { suite: 'b', ordinal: 0, fullName: 'b > z', skipped: false }] });
const result = () => ({ schema: 1, app: 'generator', complete: true, sourceStable: true, sourceHash: 'h'.repeat(64),
  node: 'v26', timeFactor: 2, argv: ['--suite=a,b', '--results=r.json'], selection: { count: 3 }, registrationErrors: [],
  results: { bailed: false, total: 3, tests: [{ suite: 'a', ordinal: 0, fullName: 'a > x', status: 'pass' },
    { suite: 'a', ordinal: 1, fullName: 'a > y', status: 'pass' }, { suite: 'b', ordinal: 0, fullName: 'b > z', status: 'pass' }] } });
const expectOf = () => ({ sourceHash: 'h'.repeat(64), argv: ['--suite=a,b', '--results=r.json'] });
const recon = (mutate, inv) => {
  const r = result();
  if (mutate) mutate(r);
  return co.reconcileShard('s', inv || inventory(), r, expectOf());
};

test('a quick result reconciles by (suite, ordinal) with every selected test exactly once', () => {
  const ok = recon();
  assert.deepStrictEqual(ok.problems, []);
  assert.deepStrictEqual(ok.tally, { expected: 3, rows: 3, passed: 3, failed: 0, skipped: 0 });
});

test('a missing or duplicate ordinal, an unexpected row and another full name are problems', () => {
  assert.ok(has(recon((r) => { r.results.tests.pop(); r.results.total = 2; }).problems, /missing row b\/0/));
  assert.ok(has(recon((r) => { r.results.tests[2] = clone(r.results.tests[1]); }).problems, /duplicate row a\/1|missing row b\/0/));
  assert.ok(has(recon((r) => { r.results.tests[2].ordinal = 7; }).problems, /unexpected row b\/7/));
  assert.ok(has(recon((r) => { r.results.tests[0].fullName = 'a > other'; }).problems, /another full name/));
  assert.ok(has(recon((r) => { r.results.total = 4; }).problems, /results\.total differs/));
});

test('a stale fingerprint, a bailed, unstable or incomplete run and another argv are problems', () => {
  assert.ok(has(recon((r) => { r.sourceHash = 'z'.repeat(64); }).problems, /stale or mixed source/));
  assert.ok(has(recon((r) => { r.sourceStable = false; }).problems, /not complete and source-stable/));
  assert.ok(has(recon((r) => { r.complete = false; }).problems, /not complete and source-stable/));
  assert.ok(has(recon((r) => { r.results.bailed = true; }).problems, /bailed/));
  assert.ok(has(recon((r) => { r.registrationErrors = ['x']; }).problems, /registration errors/));
  assert.ok(has(recon((r) => { r.argv = ['--suite=a']; }).problems, /argv is not the shard command/));
  assert.ok(has(recon((r) => { r.timeFactor = 3; }).problems, /time factor/));
});

test('a failed row and an unexplained skip are problems; a skip the inventory declares is explained', () => {
  assert.ok(has(recon((r) => { r.results.tests[1].status = 'fail'; }).problems, /a\/1 fail/));
  assert.ok(has(recon((r) => { r.results.tests[1].status = 'skip'; }).problems, /unexplained skip/));
  const inv = inventory();
  inv.tests[1].skipped = true;
  const r = recon((x) => { x.results.tests[1].status = 'skip'; }, inv);
  assert.deepStrictEqual(r.problems, []);
  assert.strictEqual(r.tally.skipped, 1);
});

// ---------------------------------------------------------------------------------------------------------------

test('the projection rule raises only, in exact integer arithmetic, and the jobs keep their limits', () => {
  assert.strictEqual(co.roundedProjection(102.9), 160);
  assert.strictEqual(co.roundedProjection(232.404), 350);
  assert.strictEqual(co.roundedProjection(121.512), 190);
  assert.strictEqual(co.roundedProjection(100), 150, 'an exact multiple is not pushed up');
  assert.strictEqual(co.roundedProjection(33.3), 50);
  assert.strictEqual(co.roundedProjection(33.4), 60);
  assert.strictEqual(co.roundedProjection(2.753), 10);
  assert.strictEqual(co.newProjection(330, 100), 330, 'never lowered');
  assert.strictEqual(co.newProjection(330, 232.404), 350);
  const manifest = { job: { jobOverheadSeconds: 180, ciSlowdownFactor: 3, timeoutMinutes: 30 },
    groups: [{ id: 'g1', shards: [{ id: 'a' }, { id: 'b' }] }, { id: 'g2', shards: [{ id: 'c' }] }] };
  const jobs = co.jobArithmetic(manifest, { a: 100, b: 50, c: 450, 'player-app': 190 });
  assert.deepStrictEqual(jobs.map((j) => [j.job, j.sum, j.projected, j.limit]),
    [['g1', 150, 630, 1800], ['g2', 450, 1530, 1800], ['Player job', 190, 750, 900]]);
  assert.ok(co.jobArithmetic(manifest, { a: 1, b: 1, c: 1, 'player-app': 250 })[2].projected > 900,
    'the Player job is judged against its own 900 s, not the generic 1800 s');
});

test('the item register needs every mandatory item once, every field filled and no placeholder', () => {
  const item = (id) => ({ id, source: 's', population: 'p', numbers: { a: 1 }, status: 'closed', limitations: 'l',
    disposition: 'd', nextOwner: 'o', evidence: ['e'] });
  const full = { schema: 'ms18d-phase-d-item-register-v1', items: co.REQUIRED_ITEMS.map(item) };
  assert.deepStrictEqual(co.registerProblems(full), []);
  const bad = (mutate, re) => {
    const r = clone(full);
    mutate(r);
    assert.ok(has(co.registerProblems(r), re), String(re));
  };
  bad((r) => { r.items.pop(); }, /is missing/);
  bad((r) => { r.items.push(clone(r.items[0])); }, /listed twice/);
  bad((r) => { r.items[3].disposition = ' '; }, /disposition is empty/);
  bad((r) => { r.items[3].evidence = []; }, /no evidence reference/);
  bad((r) => { r.items[3].status = 'done'; }, /status done is not allowed/);
  bad((r) => { r.items[3].limitations = 'TODO later'; }, /a placeholder/);
  bad((r) => { r.items.push(item('S-AV99')); }, /unexpected item S-AV99/);
  bad((r) => { r.items[0].numbers = {}; }, /numbers is empty/);
});

// ---------------------------------------------------------------------------------------------------------------
// the thin locked caller, on a stand-in helper that takes no lock

const REPO = co.REPO;
const CALLER = path.join(__dirname, 'run-locked-d.ps1');
const scratch = fs.mkdtempSync(path.join(REPO, '.scratch-phase-d-closeout-'));
const stub = path.join(scratch, 'stub-helper.ps1');
fs.writeFileSync(stub, [
  'function Invoke-Dv3Node {',
  '  param([string]$Task, [string[]]$NodeArgs, [switch]$AllowExit1)',
  '  $start = Get-Date',
  '  & node @NodeArgs',
  '  $code = $LASTEXITCODE',
  '  Write-Host "$Task exit=$code seconds=$([math]::Round(((Get-Date) - $start).TotalSeconds, 3))"',
  '  if ($code -ne 0) { throw "$Task command failed: $code" }',
  '}', ''].join('\r\n'));
let evidenceSeq = 0;
function caller(args, evidence) {
  const dir = evidence || path.join(scratch, 'ev' + (++evidenceSeq));
  const r = childProcess.spawnSync('pwsh', ['-NoProfile', '-NonInteractive', '-File', CALLER, '-Cwd', 'generator',
    '-EvidenceDir', dir, '-HelperFile', stub].concat(args), { encoding: 'utf8', cwd: REPO });
  const logFile = path.join(dir, 'lock-log.jsonl');
  const rows = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').split(/\r?\n/).filter((l) => l)
    .map((l) => JSON.parse(l)) : [];
  return { code: r.status, out: r.stdout + r.stderr, rows, dir };
}
const childFile = (code) => {
  const file = path.join(scratch, 'child-' + code + '.js');
  fs.writeFileSync(file, 'console.log("hello");\nprocess.exit(' + code + ');\n');
  return file;
};
const child = (code) => ['-Child', childFile(code)];

test('the caller records the helper line, the tee marker and the clocks of a successful command', () => {
  const r = caller(['-Id', 'ok-run', '-Transcript', 'ok.txt', '-MinGapSeconds', '0'].concat(child(0)));
  assert.strictEqual(r.code, 0, r.out);
  const row = r.rows[0];
  assert.strictEqual(row.outcome, 'ok');
  assert.strictEqual(row.helperExit, 0);
  assert.strictEqual(row.tee.exit, 0);
  assert.strictEqual(row.tee.complete, true);
  assert.ok(row.teeSeconds >= 0 && row.helperSeconds >= 0 && row.callerSeconds >= row.teeSeconds);
  assert.strictEqual(row.env.TEE_QUIET, '1');
  const transcript = fs.readFileSync(path.join(r.dir, 'transcripts', 'ok.txt'), 'utf8');
  assert.ok(/^\$ node /.test(transcript), 'the transcript starts with the command');
  assert.ok(/hello/.test(transcript), 'the child output is in the transcript');
});

test('a nonzero exit is recorded with the thrown message and stops the caller (exit 1, never success)', () => {
  const r = caller(['-Id', 'bad-run', '-Transcript', 'bad.txt', '-MinGapSeconds', '0'].concat(child(3)));
  assert.strictEqual(r.code, 1);
  const row = r.rows[0];
  assert.strictEqual(row.outcome, 'failed-stop');
  assert.strictEqual(row.helperExit, 3);
  assert.strictEqual(row.tee.exit, 3);
  assert.ok(/command failed: 3/.test(row.thrown));
});

test('an existing transcript or an existing output (or its .part) is refused before anything starts', () => {
  const first = caller(['-Id', 'one', '-Transcript', 't.txt', '-MinGapSeconds', '0'].concat(child(0)));
  assert.strictEqual(first.code, 0, first.out);
  const again = caller(['-Id', 'two', '-Transcript', 't.txt', '-MinGapSeconds', '0'].concat(child(0)), first.dir);
  assert.strictEqual(again.code, 2);
  assert.strictEqual(again.rows[1].outcome, 'refused-before-start');
  assert.strictEqual(again.rows[1].started, false);
  const outFile = path.join(REPO, 'generator', '.scratch-phase-d-output-' + process.pid + '.json');
  fs.writeFileSync(outFile + '.part', 'x');
  try {
    const part = caller(['-Id', 'three', '-Transcript', 'u.txt', '-MinGapSeconds', '0', '-NewOutputs',
      path.basename(outFile)].concat(child(0)), first.dir);
    assert.strictEqual(part.code, 2);
    assert.ok(/\.part/.test(JSON.stringify(part.rows[2].existing)));
  } finally {
    fs.rmSync(outFile + '.part', { force: true });
  }
});

test('the gap since the end of the previous command is kept before the next one starts', () => {
  const first = caller(['-Id', 'g1', '-Transcript', 'g1.txt', '-MinGapSeconds', '0'].concat(child(0)));
  const second = caller(['-Id', 'g2', '-Transcript', 'g2.txt', '-MinGapSeconds', '3'].concat(child(0)), first.dir);
  assert.strictEqual(second.code, 0, second.out);
  const a = second.rows[0];
  const b = second.rows[1];
  const gap = (Date.parse(b.startedAt) - Date.parse(a.endedAt)) / 1000;
  assert.ok(gap >= 2.9, 'the next command started ' + gap + ' s after the previous one ended');
  assert.ok(b.gapSleptSeconds > 2, 'the slept gap is recorded');
});

test('a transcript that is not a plain file name is refused', () => {
  const r = caller(['-Id', 'x', '-Transcript', '..\\evil.txt', '-MinGapSeconds', '0'].concat(child(0)));
  assert.notStrictEqual(r.code, 0);
  assert.strictEqual(r.rows.length, 0, 'nothing was recorded or started');
});

fs.rmSync(scratch, { recursive: true, force: true });
console.log(passed + ' passed, ' + failed.length + ' failed');
if (failed.length > 0) {
  console.log('FAILED: ' + failed.join(' | '));
  process.exitCode = 1;
}
