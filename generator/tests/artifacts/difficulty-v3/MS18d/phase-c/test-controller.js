'use strict';

/*
 * MS18d Phase C0 task-owned tests of the transport controller (controller.js) with the real tee, the real
 * orphan barrier and STAND-IN commands (fake-gp.js as the stock timing CLI, fake-writer.js as a ledger
 * writing command): never perf.js, never a generator, never a measurement. The test itself plays the
 * wrapper (it holds the stand-in lock file the controller expects, in an isolated TEMP). Covered: success
 * and complete miss; every stop (exit-1 crash, partial output, wrong cell, wrong target, wrong count,
 * missing MISS entry, contradiction, stderr); every hold before a payload (late or busy acquisition, a
 * foreign recent release despite an old own log, the A/B/C logs, the lock watch, the source binding, the
 * lock owner); bytes on disk before the end and after a kill; the tee dying first with a surviving command
 * and grandchild; a survivor after a normal exit; unknown liveness; the payload hook. Run it through the
 * lock wrapper:
 *   node generator/tests/artifacts/difficulty-v3/MS18d/phase-c/test-controller.js [--keep=<new folder under
 *   docs/difficulty-v3/evidence/MS18d/phase-c/tooling>]
 * Without --keep the run records of the stand-ins are deleted with the scratch folder; with it they are
 * retained as the review evidence of the stand-in runs (never in the real GP matrix).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { sha256 } = require('./common.js');
const { stockOutput } = require('./stock-fixtures.js');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const TOOLING = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS18d', 'phase-c', 'tooling');
const CONTROLLER = path.join(__dirname, 'controller.js');
const FAKE_GP = path.join(__dirname, 'fake-gp.js');
const FAKE_WRITER = path.join(__dirname, 'fake-writer.js');
const PLUGIN = path.join(__dirname, 'standin-payload-classifier.js');
const OWNED = path.join(__dirname, 'owned-processes.ps1');
const LEDGER = 'docs/difficulty-v3/evidence/MS18d/phase-c/lock-log.jsonl';

const keepArg = process.argv.slice(2).map((a) => /^--keep=(.+)$/.exec(a)).filter(Boolean)[0];
const scratch = fs.mkdtempSync(path.join(REPO, '.scratch-ms18d-c-ctl-'));
let evidenceRoot = path.join(scratch, 'evidence');
if (keepArg) {
  evidenceRoot = path.resolve(keepArg[1]);
  if (path.relative(TOOLING, evidenceRoot).startsWith('..') || fs.existsSync(evidenceRoot)) {
    console.error('--keep needs a NEW folder under ' + TOOLING);
    fs.rmSync(scratch, { recursive: true, force: true });
    process.exit(2);
  }
}
fs.mkdirSync(evidenceRoot, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
};
async function until(test, what, limitMs) {
  const end = Date.now() + (limitMs || 15000);
  for (;;) {
    const value = test();
    if (value) return value;
    if (Date.now() > end) throw new Error('timed out waiting for ' + what);
    await sleep(40);
  }
}
const readText = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const readLines = (file) => readText(file).split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const jsonl = (file, rows) => fs.writeFileSync(file,
  rows.map((r) => (typeof r === 'string' ? r : JSON.stringify(r))).join('\r\n') + '\r\n');
const leftover = [];

let passed = 0;
const failed = [];
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log('ok   ' + name);
  } catch (err) {
    failed.push(name);
    console.log('FAIL ' + name + ': ' + (err && err.stack));
  }
}

// ---------------------------------------------------------------------------------------------------------
// the world of one run: a scratch repository with the stand-in CLI, an isolated TEMP with the lock, the logs
// ---------------------------------------------------------------------------------------------------------

const HEAD = 'a'.repeat(40);
const MACHINE = { cpu: 'AMD EPYC 7763 64-Core Processor', logicalProcessors: 16, memoryGb: 64,
  platform: 'win32 10.0.26300' };
const FIXTURE = () => ({ head: HEAD, statusPorcelainZ: '',
  identities: { hashIdentity: 'H', replayIdentity: 'R', sources: 'S' },
  table: { sha256: 'TABLE', positions: [{ key: 'classic4/veryEasy', target: 31 }],
    targets: { 'classic4/veryEasy': 31 } },
  machine: MACHINE, node: 'v26.13.0', committed: {}, workingFiles: {} });
const GP_ARGS = ['tests\\perf.js', '--variant=classic4', '--level=veryEasy', '--runs=50', '--warmup=0',
  '--seed=7000', '--gate', '--ascii'];

const HELPER_DIR = 'generator\\tests\\artifacts\\difficulty-v3\\MS18d\\phase-c\\';
const manifestFiles = fs.readdirSync(__dirname).map((n) => HELPER_DIR + n);
fs.writeFileSync(path.join(scratch, 'manifest.txt'), manifestFiles.map((rel) =>
  sha256(fs.readFileSync(path.join(REPO, rel))).toUpperCase() + '  ' + rel).join('\r\n') + '\r\n');

function world(name, opts) {
  const o = opts || {};
  const root = path.join(scratch, name);
  fs.mkdirSync(path.join(root, 'generator', 'tests'), { recursive: true });
  fs.writeFileSync(path.join(root, 'generator', 'tests', 'perf.js'),
    'require(' + JSON.stringify(FAKE_GP) + ');\n');
  const tmp = path.join(root, 'tmp');
  fs.mkdirSync(tmp, { recursive: true });
  const logs = path.join(root, 'logs');
  fs.mkdirSync(logs, { recursive: true });
  const now = Date.now();
  const stamp = (ms) => new Date(ms).toISOString();
  jsonl(path.join(logs, 'a.jsonl'), [{ finished: stamp(now - 3600000) }]);
  jsonl(path.join(logs, 'b.jsonl'), [{ finished: stamp(now - 1800000) }]);
  jsonl(path.join(logs, 'c.jsonl'),
    [{ finished: stamp(now - 900000), releaseObservedAt: stamp(now - 899000) }]);
  fs.writeFileSync(path.join(root, 'fixture.json'),
    JSON.stringify(Object.assign(FIXTURE(), o.fixture || {})));
  const runDir = path.join(evidenceRoot, name);
  return { name, root, tmp, logs, runDir, now, stamp, pidFile: path.join(root, 'pids.txt'), opts: o };
}

function request(w, over) {
  const requested = w.opts.requestedAtMs || Date.now();
  const o = Object.assign({
    schema: 'ms18d-c-request-1', runId: w.name, task: 'stand-in ' + w.name, standin: true,
    profile: 'gp-cell', allowExit1: true, cell: { variant: 'classic4', level: 'veryEasy', targetMs: 31 },
    runDir: w.runDir, repo: w.root, command: { args: GP_ARGS },
    requestedAt: new Date(requested).toISOString(), wrapperPid: process.pid,
    slotBefore: { shared: false, timing: false },
    watch: { schema: 'ms18d-c-watch-1', firstCheckMs: requested - 200 - 15300,
      lastCheckMs: requested - 200, checks: 62, windowChecks: 62, maxIntervalMs: 260, windowSightings: 0,
      restartCount: 0, restarts: [], gaveUp: false },
    releaseSources: [{ label: 'A', file: path.join(w.logs, 'a.jsonl'), kind: 'log', required: true },
      { label: 'B', file: path.join(w.logs, 'b.jsonl'), kind: 'log', required: true },
      { label: 'C', file: path.join(w.logs, 'c.jsonl'), kind: 'log', required: false }],
    cLedger: path.join(w.logs, 'c.jsonl'),
    expected: { base: HEAD, identities: { hashIdentity: 'H', replayIdentity: 'R', sources: 'S' },
      tableSha256: 'TABLE', node: 'v26.13.0', machine: MACHINE },
    helpers: { manifestFile: path.join(scratch, 'manifest.txt'), manifestSha256: null,
      required: ['generator/tests/artifacts/difficulty-v3/MS18d/phase-c/controller.js'], repoRoot: REPO },
    bindingFixture: path.join(w.root, 'fixture.json'), powershell: 'pwsh', ownedProcesses: OWNED
  }, over || {});
  w.requested = requested;
  fs.mkdirSync(w.runDir, { recursive: true });
  fs.writeFileSync(path.join(w.runDir, 'request.json'),
    JSON.stringify(o, null, 2).replace(/\n/g, '\r\n') + '\r\n');
  return o;
}

/** Starts the controller as a child of this test (the wrapper), holding the stand-in lock file it expects. */
function startController(w, env, lockOver) {
  const lock = lockOver === undefined ? process.pid + '|stand-in ' + w.name + '|' +
    new Date(w.requested + 5).toISOString() : lockOver;
  if (lock !== null) fs.writeFileSync(path.join(w.tmp, 'dv3-sudoku.lock'), lock);
  const proc = spawn(process.execPath, [CONTROLLER, '--request=' + path.join(w.runDir, 'request.json')], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: Object.assign({}, process.env, { TEMP: w.tmp, TMP: w.tmp, FAKE_PIDFILE: w.pidFile,
      FAKE_GP_TARGET_MS: '31' }, env || {})
  });
  const run = { proc, out: '' };
  proc.stdout.on('data', (d) => { run.out += d; });
  proc.stderr.on('data', (d) => { run.out += d; });
  run.done = new Promise((resolve) => proc.on('close', (code, signal) => resolve({ code, signal })));
  return run;
}

async function drive(w, env, req, lockOver) {
  request(w, req);
  const run = startController(w, env, lockOver);
  const end = await run.done;
  const resultFile = path.join(w.runDir, 'result.json');
  return { code: end.code, out: run.out, result: fs.existsSync(resultFile) ? readJson(resultFile) : null,
    file: (n) => path.join(w.runDir, n) };
}

const pidsOf = (w) => readText(w.pidFile).split('\n').filter(Boolean).map((l) => {
  const [role, pid] = l.split(' ');
  return { role, pid: Number(pid) };
});
function trackTestProcesses(w) {
  pidsOf(w).forEach((p) => leftover.push(p.pid));
}

// ---------------------------------------------------------------------------------------------------------

async function completeResults() {
  await test('a complete success: exit 0, every record written, the barrier clean', async () => {
    const w = world('success');
    const r = await drive(w, { FAKE_GP_MODE: 'ok' });
    assert.strictEqual(r.code, 0, r.out);
    const why = JSON.stringify(r.result.classification && r.result.classification.problems);
    assert.strictEqual(r.result.outcome, 'success', why);
    assert.strictEqual(r.result.standin, true);
    assert.strictEqual(r.result.payloadStarted, true);
    assert.strictEqual(r.result.controllerExit, 0);
    assert.strictEqual(r.result.cli.exit, 0);
    assert.strictEqual(r.result.tee.marker.replace(/ seconds=.*/, ''), 'exit=0');
    assert.strictEqual(r.result.barrier.verdict, 'clean');
    ['request.json', 'acquisition.json', 'binding.json', 'admission.json', 'transcript.txt', 'stdout.txt',
      'stderr.txt', 'pids.jsonl', 'cleanup.json', 'result.json'].forEach((n) => {
      assert.ok(fs.existsSync(r.file(n)), n);
    });
    const acq = readJson(r.file('acquisition.json'));
    assert.strictEqual(acq.decision, 'proceed', acq.reasons.join());
    assert.ok(acq.startedAtMs >= w.requested && acq.startDelayMs <= 2000, 'start recorded by the child');
    assert.ok(acq.lockAcquiredAtMs >= w.requested && acq.lockAcquiredAtMs <= acq.startedAtMs);
    assert.strictEqual(acq.watch.ok, true);
    assert.ok(acq.watch.lastCheckMs < w.requested, 'the first and last check of the watch are in the record');
    assert.strictEqual(readJson(r.file('binding.json')).ok, true);
    assert.strictEqual(readJson(r.file('binding.json')).status.rawClean, true);
    const adm = readJson(r.file('admission.json'));
    assert.strictEqual(adm.decision, 'proceed');
    assert.strictEqual(adm.finalLockRecheck.stable, true);
    const records = readLines(r.file('pids.jsonl'));
    ['controller', 'tee', 'command'].forEach((role) => assert.ok(records.some((x) => x.role === role), role));
    assert.ok(records.some((x) => x.event === 'command-exit' && x.code === 0));
    assert.ok(records.some((x) => x.event === 'tee-exit' && x.stderrBytes === 0));
    assert.ok(/^\$ node tests\\perf\.js --variant=classic4 /.test(readText(r.file('transcript.txt'))));
    assert.ok(readText(r.file('stdout.txt')).indexOf('1 of 1 cells meet their p95 target') !== -1);
    assert.strictEqual(readText(r.file('stderr.txt')), '');
  });

  await test('C0-5: CPU time of controller and tee is recorded; no process is queried while the payload runs',
    async () => {
      const w = world('cpu');
      const r = await drive(w, { FAKE_GP_MODE: 'slow', FAKE_HOLD: '1200' });
      assert.strictEqual(r.code, 0, r.out);
      const cpu = r.result.cpu;
      assert.ok(Number.isInteger(cpu.controller.userMicros) && cpu.controller.userMicros > 0);
      assert.ok(Number.isInteger(cpu.controller.systemMicros) && cpu.controller.systemMicros >= 0);
      assert.ok(Number.isInteger(cpu.tee.userMicros) && Number.isInteger(cpu.tee.systemMicros));
      const exit = readLines(r.file('pids.jsonl')).filter((x) => x.event === 'command-exit')[0];
      const cleanup = readJson(r.file('cleanup.json'));
      assert.ok(cleanup.startedAtMs >= exit.atMs, 'the only process query began after the command ended');
      assert.ok(r.result.rawBytes.stdout > 100 && r.result.rawBytes.stderr === 0);
    });

  await test('a complete MISS: exit 1 comes through the controller, the mark is authoritative', async () => {
    const w = world('miss');
    const r = await drive(w, { FAKE_GP_MODE: 'miss' });
    assert.strictEqual(r.code, 1, r.out);
    assert.strictEqual(r.result.outcome, 'miss');
    assert.strictEqual(r.result.controllerExit, 1);
    assert.strictEqual(r.result.cli.exit, 1);
    assert.strictEqual(r.result.classification.miss.key, 'classic4/veryEasy');
    assert.strictEqual(r.result.barrier.verdict, 'clean');
  });

  const stops = [
    ['an exit-1 crash with a stack on stderr', 'crash', 1, ['crash', 'partial-output', 'stderr-output']],
    ['partial output', 'partial', 0, ['partial-output']],
    ['a row for another cell', 'wrong-cell', 0, ['wrong-cell']],
    ['a row with another target', 'wrong-target', 0, ['wrong-target']],
    ['a summary of two cells', 'wrong-count', 0, ['wrong-count']],
    ['a MISS without its Misses: entry', 'missing-miss', 1, ['missing-miss-entry']],
    ['ok and 1 of 1 with exit 1', 'ok-exit1', 1, ['contradiction']],
    ['MISS and 0 of 1 with exit 0', 'miss-exit0', 0, ['contradiction']],
    ['an ok row with the summary 0 of 1', 'summary-contradiction', 0, ['contradiction']],
    ['an unexplained line on stderr after a perfect result', 'stderr', 0, ['stderr-output']]
  ];
  for (const [name, mode, cliExit, kinds] of stops) {
    await test('STOP, never a result (exit 65), the real CLI exit and all bytes kept: ' + name, async () => {
      const w = world('stop-' + mode);
      const r = await drive(w, { FAKE_GP_MODE: mode });
      assert.strictEqual(r.code, 65, r.out);
      assert.strictEqual(r.result.outcome, 'stop');
      assert.strictEqual(r.result.classification.complete, false);
      const found = r.result.classification.kinds;
      kinds.forEach((k) => assert.ok(found.indexOf(k) !== -1, k + ' in ' + found));
      assert.strictEqual(r.result.cli.exit, cliExit, 'the real CLI exit is kept next to the exit 65');
      assert.ok(fs.existsSync(r.file('transcript.txt')) && fs.existsSync(r.file('stdout.txt')));
      if (mode === 'crash') assert.ok(/stand-in generation error/.test(readText(r.file('stderr.txt'))));
      assert.strictEqual(r.result.barrier.verdict, 'clean');
    });
  }

  await test('C0-3: any stderr byte makes a perfect result incomplete, even one normalisation drops',
    async () => {
      const w = world('stderr-cr');
      fs.writeFileSync(path.join(w.root, 'generator', 'tests', 'perf.js'),
        'process.stderr.write("\\r");\nrequire(' + JSON.stringify(FAKE_GP) + ');\n');
      const r = await drive(w, { FAKE_GP_MODE: 'ok' });
      assert.strictEqual(r.code, 65, r.out);
      assert.strictEqual(readText(r.file('stderr.txt')), '', 'the retained file has no line');
      assert.strictEqual(r.result.rawBytes.stderr, 1);
      assert.ok(r.result.classification.kinds.indexOf('stderr-output') !== -1);
    });
}

// ---------------------------------------------------------------------------------------------------------

async function holds() {
  const holdTests = [
    ['a late start (a request 10 s before the controller started), no foreign release proved',
      (w) => { w.opts.requestedAtMs = Date.now() - 10000; return {}; },
      ['late-start-and-foreign-release-unproved']],
    ['a busy slot at the request', () => ({ slotBefore: { shared: true, timing: false } }),
      ['slot-busy-and-foreign-release-unproved']],
    ['the timing lock busy at the request', () => ({ slotBefore: { shared: false, timing: true } }),
      ['slot-busy-and-foreign-release-unproved']],
    ['another job\'s release 5 s before, with an old own log (coordinator evidence)', (w) => {
      const file = path.join(w.logs, 'coord.jsonl');
      jsonl(file, [{ at: new Date(Date.now() - 5000).toISOString(), source: 'the orchestrator saw it',
        note: 'x' }]);
      const logPath = (n) => path.join(w.logs, n);
      return { releaseSources: [{ label: 'A', file: logPath('a.jsonl'), kind: 'log', required: true },
        { label: 'B', file: logPath('b.jsonl'), kind: 'log', required: true },
        { label: 'coord', file, kind: 'coordinator', required: true }] };
    }, ['release-gap-under-15s']],
    ['our own release 3 s ago in the Phase C log', (w) => {
      jsonl(path.join(w.logs, 'c.jsonl'), [{ finished: new Date(Date.now() - 4000).toISOString(),
        releaseObservedAt: new Date(Date.now() - 3000).toISOString() }]);
      return {};
    }, ['release-gap-under-15s']],
    ['the newest release only in the Phase A log (all three logs are read)', (w) => {
      jsonl(path.join(w.logs, 'a.jsonl'), [{ finished: new Date(Date.now() - 6000).toISOString() }]);
      return {};
    }, ['release-gap-under-15s']],
    ['a required log that is missing', (w) => ({ releaseSources: [
      { label: 'A', file: path.join(w.logs, 'no.jsonl'), kind: 'log', required: true },
      { label: 'B', file: path.join(w.logs, 'b.jsonl'), kind: 'log', required: true }] }),
    ['release-history-unproved']],
    ['a corrupt line in the Phase C log', (w) => {
      fs.appendFileSync(path.join(w.logs, 'c.jsonl'), 'not json\r\n');
      return {};
    }, ['release-history-unproved']],
    ['no lock watch record', () => ({ watch: null }), ['foreign-lock-watch-missing']],
    ['a lock watch that gave up', (w) => ({ watch: Object.assign({}, request(w).watch, { gaveUp: true }) }),
      ['foreign-lock-watch-gave-up']],
    ['a lock watch window of 15.299 s', (w) => {
      const r = request(w);
      return { watch: Object.assign({}, r.watch, { firstCheckMs: r.watch.firstCheckMs + 1 }) };
    }, ['foreign-lock-watch-under-15.3s']],
    ['a lock watch whose last check is not right before the call', (w) => {
      const r = request(w);
      return { watch: Object.assign({}, r.watch, { lastCheckMs: r.watch.lastCheckMs - 2000,
        firstCheckMs: r.watch.firstCheckMs - 2000 }) };
    }, ['foreign-lock-watch-not-right-before-the-call']],
    ['a lock watch with checks more than a second apart', (w) => ({ watch: Object.assign({},
      request(w).watch, { maxIntervalMs: 1500 }) }), ['foreign-lock-watch-interval-over-1s']],
    ['an engine file changed (another E hash identity)', () => ({}), ['hashIdentity'],
      { identities: { hashIdentity: 'X', replayIdentity: 'R', sources: 'S' } }],
    ['a HEAD that is not a descendant of the campaign base', () => ({}), ['neither the campaign base'],
      { head: 'b'.repeat(40), descendant: false }],
    ['a descendant HEAD that changed a tracked source since the base', () => ({}),
      ['not campaign outputs or pack files'], { head: 'b'.repeat(40), diffNames: ['generator/design.md'] }],
    ['a descendant HEAD that changed an undeclared run folder', () => ({}),
      ['not campaign outputs or pack files'],
      { head: 'b'.repeat(40), diffNames: [
        'docs/difficulty-v3/evidence/MS18d/gp/classic4-veryEasy/zz/x.json'] }],
    ['a changed tracked file in the status', () => ({}), ['reviewed clean-input'],
      { statusPorcelainZ: ' M generator/design.md\0' }],
    ['a staged ledger', () => ({}), ['reviewed clean-input'], { statusPorcelainZ: 'M  ' + LEDGER + '\0' }],
    ['an untracked ledger', () => ({}), ['reviewed clean-input'],
      { statusPorcelainZ: '?? ' + LEDGER + '\0' }],
    ['a ledger that is not a pure append of its committed bytes', () => ({}), ['reviewed clean-input'],
      { statusPorcelainZ: ' M ' + LEDGER + '\0', committed: { [LEDGER]: '{"a":1}\n' },
        workingFiles: { [LEDGER]: '{"a":2}\r\n' } }],
    ['another target table', () => ({}), ['target table'], { table: { sha256: 'OTHER',
      positions: [{ key: 'classic4/veryEasy', target: 31 }], targets: { 'classic4/veryEasy': 31 } } }],
    ['another target for the cell', () => ({}), ['target of classic4/veryEasy'], { table: {
      sha256: 'TABLE', positions: [{ key: 'classic4/veryEasy', target: 32 }],
      targets: { 'classic4/veryEasy': 32 } } }],
    ['another Node', () => ({}), ['node v24'], { node: 'v24.0.0' }],
    ['another machine', () => ({}), ['machine cpu'],
      { machine: Object.assign({}, MACHINE, { cpu: 'Other' }) }]
  ];
  for (const [name, build, tokens, fixture] of holdTests) {
    await test('HOLD before any payload (exit 64, nothing started): ' + name, async () => {
      const w = world('hold-' + name.replace(/\W+/g, '-').slice(0, 48), { fixture });
      const over = build(w);
      const r = await drive(w, { FAKE_GP_MODE: 'ok' }, over);
      assert.strictEqual(r.code, 64, r.out);
      assert.strictEqual(r.result.outcome, 'control-hold');
      assert.strictEqual(r.result.payloadStarted, false);
      assert.strictEqual(r.result.controllerExit, 64);
      const text = JSON.stringify(r.result.reasons) +
        JSON.stringify(readJson(r.file('acquisition.json')).reasons);
      tokens.forEach((t) => assert.ok(text.indexOf(t) !== -1, t + ' not in ' + text));
      ['transcript.txt', 'stdout.txt', 'stderr.txt', 'cleanup.json'].forEach((n) => {
        assert.ok(!fs.existsSync(r.file(n)), n + ' exists');
      });
      assert.strictEqual(readLines(r.file('pids.jsonl')).length, 1, 'only the controller was recorded');
    });
  }

  await test('R5: NODE_OPTIONS or a Node flag in the controller is a hold before anything starts (exit 64)',
    async () => {
      const a = world('node-options');
      const r = await drive(a, { FAKE_GP_MODE: 'ok', NODE_OPTIONS: '--no-warnings' });
      assert.strictEqual(r.code, 64, r.out);
      assert.strictEqual(r.result.heldAt, 'node-flags');
      assert.ok(/NODE_OPTIONS is set/.test(JSON.stringify(r.result.reasons)));
      assert.strictEqual(r.result.payloadStarted, false);
      ['acquisition.json', 'transcript.txt', 'stdout.txt'].forEach((n) => {
        assert.ok(!fs.existsSync(r.file(n)), n + ' exists');
      });
    });

  await test('R3: a descendant HEAD whose diff is declared run output, ledger and pack files proceeds',
    async () => {
      const w = world('descendant-ok', { fixture: { head: 'b'.repeat(40), diffNames: [
        LEDGER, 'tasks/difficulty-v3/check-list.md',
        'docs/difficulty-v3/evidence/MS18d/gp/classic4-veryEasy/r1/x.json'] } });
      const r = await drive(w, { FAKE_GP_MODE: 'ok' }, { declaredDirs: [
        'docs/difficulty-v3/evidence/MS18d/gp/classic4-veryEasy/r1'] });
      assert.strictEqual(r.code, 0, r.out + JSON.stringify(r.result && r.result.reasons));
      const b = readJson(r.file('binding.json'));
      assert.strictEqual(b.head.descendant, true);
      assert.strictEqual(b.head.actual, 'b'.repeat(40));
      assert.strictEqual(b.head.base, HEAD);
      assert.deepStrictEqual(b.head.diff.violations, []);
    });

  await test('R3: the same descendant is a hold when the declared run directories are not those of the diff',
    async () => {
      const w = world('descendant-undeclared', { fixture: { head: 'b'.repeat(40), diffNames: [
        'docs/difficulty-v3/evidence/MS18d/gp/classic4-veryEasy/r1/x.json'] } });
      const r = await drive(w, { FAKE_GP_MODE: 'ok' }, { declaredDirs: [] });
      assert.strictEqual(r.code, 64, r.out);
      assert.ok(/not campaign outputs or pack files/.test(JSON.stringify(r.result.reasons)));
    });

  await test('A/B/C continuity: the newest release, wherever it is, is old enough: proceed', async () => {
    const w = world('continuity');
    jsonl(path.join(w.logs, 'a.jsonl'), [{ finished: new Date(Date.now() - 20000).toISOString() }]);
    jsonl(path.join(w.logs, 'b.jsonl'), [{ finished: new Date(Date.now() - 1800000).toISOString() }]);
    jsonl(path.join(w.logs, 'c.jsonl'), [{ finished: new Date(Date.now() - 900000).toISOString() }]);
    const r = await drive(w, { FAKE_GP_MODE: 'ok' });
    assert.strictEqual(r.code, 0, r.out);
    const acq = readJson(r.file('acquisition.json'));
    assert.strictEqual(acq.latestRelease.label, 'A');
    assert.ok(acq.releaseGapMs >= 15000);
    assert.strictEqual(acq.historyFiles.length, 3);
  });

  await test('a busy or late acquisition needs a foreign release proved 15 s earlier', async () => {
    const w = world('busy-proved');
    w.opts.requestedAtMs = Date.now() - 20000;
    const file = path.join(w.logs, 'coord.jsonl');
    jsonl(file, [{ at: new Date(w.opts.requestedAtMs + 1000).toISOString(),
      source: 'seen released at the 1 s mark' }]);
    const r = await drive(w, { FAKE_GP_MODE: 'ok' }, { slotBefore: { shared: true, timing: false },
      releaseSources: [{ label: 'A', file: path.join(w.logs, 'a.jsonl'), kind: 'log', required: true },
        { label: 'B', file: path.join(w.logs, 'b.jsonl'), kind: 'log', required: true },
        { label: 'coord', file, kind: 'coordinator', required: true }] });
    assert.strictEqual(r.code, 0, r.out + JSON.stringify(r.result && r.result.reasons));
    const acq = readJson(r.file('acquisition.json'));
    assert.strictEqual(acq.busyAtRequest, true);
    assert.strictEqual(acq.foreignReleaseProof.length, 1);
  });

  await test('the lock must be ours: absent, held by another process, or the timing lock present: hold',
    async () => {
      const reasonsOf = (run) => readJson(run.file('acquisition.json')).reasons;
      const absent = await drive(world('lock-absent'), { FAKE_GP_MODE: 'ok' }, {}, null);
      assert.strictEqual(absent.code, 64);
      assert.ok(reasonsOf(absent).indexOf('our-lock-file-is-absent') !== -1);
      const other = world('lock-other');
      const o = await drive(other, { FAKE_GP_MODE: 'ok' }, {},
        '999999|someone else|' + new Date().toISOString());
      assert.strictEqual(o.code, 64);
      assert.ok(reasonsOf(o).indexOf('the-lock-is-not-held-by-the-wrapper') !== -1);
      const timing = world('lock-timing');
      fs.writeFileSync(path.join(timing.tmp, 'dv3-timing.lock'), 'someone');
      const t = await drive(timing, { FAKE_GP_MODE: 'ok' });
      assert.strictEqual(t.code, 64);
      assert.ok(reasonsOf(t).indexOf('the-timing-lock-is-present') !== -1);
      const parent = world('lock-parent');
      const p = await drive(parent, { FAKE_GP_MODE: 'ok' }, { wrapperPid: process.pid + 1 });
      assert.strictEqual(p.code, 64);
      assert.ok(reasonsOf(p).indexOf('the-controller-is-not-a-child-of-the-wrapper') !== -1);
    });

  await test('a helper manifest that does not match, or a payload table that disagrees on exit 1: hold',
    async () => {
      const w = world('manifest');
      const bad = path.join(w.root, 'bad-manifest.txt');
      fs.writeFileSync(bad, 'F'.repeat(64) + '  ' + HELPER_DIR + 'controller.js\r\n');
      const r = await drive(w, { FAKE_GP_MODE: 'ok' }, { helpers: { manifestFile: bad,
        manifestSha256: null, required: [], repoRoot: REPO } });
      assert.strictEqual(r.code, 64);
      assert.ok(readJson(r.file('binding.json')).problems.some((p) => /differ from the manifest/.test(p)));
      const e = world('exit1-table');
      const x = await drive(e, { FAKE_GP_MODE: 'ok' }, { allowExit1: false });
      assert.strictEqual(x.code, 64);
      assert.strictEqual(x.result.heldAt, 'request');
      assert.ok(/disagree on whether exit 1/.test(JSON.stringify(x.result.reasons)));
      assert.ok(!fs.existsSync(x.file('acquisition.json')));
    });
}

// ---------------------------------------------------------------------------------------------------------

async function transportAndCleanup() {
  await test('bytes are on disk BEFORE the command ends and survive a kill of the controller; the wrapper ' +
    'barrier then stops the orphans', async () => {
    const w = world('kill-controller');
    request(w, { teeDetached: true });
    const run = startController(w, { FAKE_GP_MODE: 'hang-grand' });
    await until(() => /Sudoku Generator performance/.test(readText(path.join(w.runDir, 'transcript.txt'))),
      'the first bytes of the transcript');
    const during = readText(path.join(w.runDir, 'transcript.txt'));
    assert.ok(/Sudoku Generator performance/.test(during) && !/(^|\r\n)(exit=|signal=)/.test(during), during);
    const streamed = readText(path.join(w.runDir, 'stdout.txt'));
    assert.ok(/Sudoku Generator performance/.test(streamed), 'stdout.txt too');
    await until(() => pidsOf(w).some((p) => p.role === 'grandchild'), 'the grandchild');
    const recorded = readLines(path.join(w.runDir, 'pids.jsonl'));
    ['controller', 'tee', 'command'].forEach((role) => {
      assert.ok(recorded.some((x) => x.role === role), role);
    });
    const command = recorded.filter((x) => x.role === 'command')[0];
    run.proc.kill('SIGKILL');
    await run.done;
    trackTestProcesses(w);
    assert.ok(!fs.existsSync(path.join(w.runDir, 'result.json')), 'a killed controller writes no result');
    const kept = readText(path.join(w.runDir, 'transcript.txt'));
    assert.ok(kept.indexOf(during.trimEnd()) === 0 || kept.length >= during.length,
      'the bytes written so far survive the kill');
    assert.ok(!/(^|\r\n)(exit=|signal=)/.test(kept), 'and no completion line is invented');
    assert.ok(alive(command.pid), 'the detached command outlived its controller and tee');
    const grand = pidsOf(w).filter((p) => p.role === 'grandchild')[0].pid;
    assert.ok(alive(grand));
    const cleanup = path.join(w.runDir, 'cleanup-wrapper.json');
    const barrier = await new Promise((resolve) => {
      const p = spawn('pwsh', ['-NoProfile', '-NonInteractive', '-File', OWNED, '-Action', 'barrier',
        '-RecordsFile', path.join(w.runDir, 'pids.jsonl'), '-OutFile', cleanup, '-IncludeController'],
      { stdio: 'ignore' });
      p.on('close', (code) => resolve(code));
    });
    assert.strictEqual(barrier, 10, 'stopped-owned');
    const record = readJson(cleanup);
    assert.strictEqual(record.verdict, 'stopped-owned');
    assert.ok(record.stops.every((s) => s.outcome === 'stopped'), JSON.stringify(record.stops));
    await until(() => !alive(command.pid) && !alive(grand), 'the orphans to be gone', 8000);
  });

  await test('the tee dies first with a surviving command and grandchild: the controller\'s barrier stops ' +
    'them', async () => {
    const w = world('tee-first');
    request(w, { teeDetached: true });
    const run = startController(w, { FAKE_GP_MODE: 'hang-grand' });
    const pidsFile = path.join(w.runDir, 'pids.jsonl');
    await until(() => pidsOf(w).some((p) => p.role === 'grandchild') &&
      readLines(pidsFile).some((x) => x.role === 'command'), 'the command and its grandchild');
    const records = readLines(pidsFile);
    const tee = records.filter((x) => x.role === 'tee')[0];
    const command = records.filter((x) => x.role === 'command')[0];
    const grand = pidsOf(w).filter((p) => p.role === 'grandchild')[0].pid;
    process.kill(tee.pid, 'SIGKILL');
    const end = await run.done;
    trackTestProcesses(w);
    const result = readJson(path.join(w.runDir, 'result.json'));
    assert.strictEqual(end.code, 65, run.out);
    assert.strictEqual(result.outcome, 'stop');
    assert.strictEqual(result.barrier.verdict, 'stopped-owned');
    const kinds = result.classification.kinds;
    ['orphan', 'marker-missing', 'cli-no-exit'].forEach((k) => {
      assert.ok(kinds.indexOf(k) !== -1, k + ' in ' + kinds);
    });
    const cleanup = readJson(path.join(w.runDir, 'cleanup.json'));
    assert.ok(cleanup.roots.some((r) => r.Role === 'tee' && r.State === 'absent'), 'the tee is gone');
    assert.ok(cleanup.stops.length >= 2 && cleanup.stops.every((s) => s.outcome === 'stopped'),
      JSON.stringify(cleanup.stops));
    assert.ok(cleanup.stops.some((s) => s.pid === command.pid) && cleanup.stops.some((s) => s.pid === grand));
    assert.ok(!alive(command.pid) && !alive(grand), 'the command and the grandchild are gone');
    assert.ok(!/(^|\r\n)(exit=|signal=)/.test(readText(path.join(w.runDir, 'transcript.txt'))),
      'the cut-off transcript has no end line');
  });

  await test('a grandchild that outlives a command that exited 0 with a perfect result: a stop', async () => {
    const w = world('survivor');
    const r = await drive(w, { FAKE_GP_MODE: 'survive' });
    trackTestProcesses(w);
    assert.strictEqual(r.code, 65, r.out);
    assert.strictEqual(r.result.cli.exit, 0);
    assert.strictEqual(r.result.barrier.verdict, 'stopped-owned');
    assert.ok(r.result.classification.kinds.indexOf('orphan') !== -1);
    assert.deepStrictEqual(r.result.classification.kinds.filter((k) => k !== 'orphan'), [],
      'the output itself was complete');
    const grand = pidsOf(w).filter((p) => p.role === 'grandchild')[0].pid;
    await until(() => !alive(grand), 'the grandchild to be gone', 6000);
  });

  await test('unknown liveness is a hold (exit 66): an unreadable table, nothing stopped', async () => {
    const w = world('unknown');
    const failedTable = path.join(w.root, 'snapshot-failed.json');
    fs.writeFileSync(failedTable, JSON.stringify({ ok: false, processes: [] }));
    const r = await drive(w, { FAKE_GP_MODE: 'ok' }, { barrierSnapshotFile: failedTable });
    assert.strictEqual(r.code, 66, r.out);
    assert.strictEqual(r.result.barrier.verdict, 'hold-unknown');
    assert.ok(r.result.classification.kinds.indexOf('orphan') !== -1);
    assert.strictEqual(readJson(r.file('cleanup.json')).simulated, true);
  });

  await test('a pid held by a process created long after the spawn window, no proof of exit: hold 66',
    async () => {
      const w = world('reuse');
      const table = path.join(w.root, 'snapshot-reuse.json');
      request(w, { teeDetached: true, barrierSnapshotFile: table });
      const run = startController(w, { FAKE_GP_MODE: 'hang' });
      const pidsFile = path.join(w.runDir, 'pids.jsonl');
      const command = await until(() => readLines(pidsFile).filter((x) => x.role === 'command')[0],
        'the command record');
      const tee = readLines(pidsFile).filter((x) => x.role === 'tee')[0];
      fs.writeFileSync(table, JSON.stringify({ ok: true, processes: [{ pid: command.pid, ppid: 4,
        createdMs: command.afterMs + 3600000, name: 'other.exe' }] }));
      process.kill(tee.pid, 'SIGKILL');
      const end = await run.done;
      trackTestProcesses(w);
      const result = readJson(path.join(w.runDir, 'result.json'));
      const cleanup = readJson(path.join(w.runDir, 'cleanup.json'));
      leftover.push(command.pid);
      assert.strictEqual(end.code, 66, run.out);
      assert.strictEqual(result.barrier.verdict, 'hold-unknown');
      assert.ok(/nothing proves the recorded one ended/.test(cleanup.problems.join(' ')));
      assert.strictEqual(cleanup.stops.length, 0, 'nothing was stopped on an unproved identity');
      assert.strictEqual(cleanup.survivors.length, 0);
      assert.strictEqual(cleanup.simulated, true);
    });
}

// ---------------------------------------------------------------------------------------------------------

async function payloadHook() {
  const ledgerRequest = (w, mode, records) => ({ profile: 'standin-ledger', allowExit1: false, cell: null,
    classifierModule: PLUGIN, expectedRecords: records || 3,
    command: { args: [FAKE_WRITER, '--out=' + path.join(w.runDir, 'ledger.json'),
      '--records=' + (records || 3), '--mode=' + mode] } });
  await test('C0-6: a ledger-writing payload plugs in with its own classifier on the same transport',
    async () => {
      const w = world('plugin-ok');
      const r = await drive(w, {}, ledgerRequest(w, 'ok'));
      assert.strictEqual(r.code, 0, r.out + JSON.stringify(r.result && r.result.classification));
      assert.strictEqual(r.result.profile, 'standin-ledger');
      assert.strictEqual(r.result.classification.records, 3);
      assert.strictEqual(readJson(r.file('acquisition.json')).decision, 'proceed');
      assert.strictEqual(r.result.barrier.verdict, 'clean');
      assert.strictEqual(readJson(r.file('binding.json')).ok, true);
    });
  const ledgerStops = [['short', 'ledger-incomplete', 65], ['nowrite', 'ledger-missing', 65],
    ['exit1', 'cli-not-zero', 65]];
  for (const [mode, kind, exit] of ledgerStops) {
    await test('C0-6: the ledger payload is a stop, never a result: ' + mode + ' (exit 1 undefined)',
      async () => {
        const w = world('plugin-' + mode);
        const r = await drive(w, {}, ledgerRequest(w, mode));
        assert.strictEqual(r.code, exit, r.out);
        assert.strictEqual(r.result.outcome, 'stop');
        assert.ok(r.result.classification.kinds.indexOf(kind) !== -1, r.result.classification.kinds.join());
        assert.notStrictEqual(r.result.controllerExit, 1);
      });
  }
  const fakeChild = path.join(__dirname, '..', 'phase-b', 'fake-child.js');
  await test('C0-6: the generic payload takes any command and accepts exit 0 only', async () => {
    const ok = world('generic-ok');
    const a = await drive(ok, {}, { profile: 'generic', allowExit1: false, cell: null,
      command: { args: [fakeChild, 'ok'] } }, undefined);
    assert.strictEqual(a.code, 0, a.out);
    assert.strictEqual(a.result.outcome, 'success');
    const bad = world('generic-fail');
    const b = await drive(bad, {}, { profile: 'generic', allowExit1: false, cell: null,
      command: { args: [fakeChild, 'fail', '1'] } });
    assert.strictEqual(b.code, 65, b.out);
    assert.strictEqual(b.result.cli.exit, 1);
    assert.ok(b.result.classification.kinds.indexOf('cli-nonzero') !== -1);
  });
  await test('C0-6: a request whose payload type is unknown is refused before anything runs', async () => {
    const w = world('unknown-type');
    const r = await drive(w, {}, { profile: 'recorder' });
    assert.strictEqual(r.code, 2, r.out);
    assert.ok(/unknown payload type/.test(r.out));
    assert.strictEqual(r.result, null);
  });
}

async function main() {
  await completeResults();
  await holds();
  await transportAndCleanup();
  await payloadHook();
}

main().then(() => {
  console.log(passed + ' passed, ' + failed.length + ' failed');
  if (failed.length > 0) console.log('FAILED: ' + failed.join(' | '));
  process.exitCode = failed.length === 0 ? 0 : 1;
}, (err) => {
  console.log('ERROR ' + (err && err.stack));
  process.exitCode = 1;
}).then(() => {
  leftover.forEach((pid) => {
    try {
      if (alive(pid)) process.kill(pid, 'SIGKILL');
    } catch (err) { /* gone */ }
  });
  fs.rmSync(scratch, { recursive: true, force: true });
});
