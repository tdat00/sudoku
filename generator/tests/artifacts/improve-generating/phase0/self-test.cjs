'use strict';

/*
 * Self-test of the phase-0 harness (IG-S01): synthetic cases only. It never generates a puzzle and measures no
 * speed; every number it writes is provisional (pre-freeze) infrastructure evidence.
 *
 *   node self-test.cjs --task=IG-S01 --round=provisional-r1 [--attempt=a1]   full run, writes the self-test shard
 *   node self-test.cjs --task=IG-S01 --round=provisional-r1 --only=pure      pure cases only (no worker, no CPU
 *                                                                           spin, no evidence), for development
 *
 * The full run starts workers (one briefly busy by design), so it is launched only through the low-priority wrapper
 * (Invoke-IgNode -Task 'IG-S01/self-test') and refuses to run when that wrapper does not hold the timing slot.
 * The test-only short timer exists only in a host built with testOnly and never reaches a generation manifest.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const C = require('./common.cjs');
const L = require('./loader.cjs');
const R = require('./records.cjs');
const M = require('./manifest.cjs');
const H = require('./host.cjs');
const RUN = require('./run.cjs');

const HarnessError = C.HarnessError;
const REPO = C.DEFAULT_REPO_ROOT;
const SCRATCH = path.join(C.HARNESS_DIR, 'scratch');
const VROOT = path.join(path.parse(REPO).root, 'ig-virtual-repo');

// --- tiny framework ---------------------------------------------------------------------------------------------

const cases = [];

function add(id, group, title, fn) {
  cases.push({ id: id, group: group, title: title, fn: fn });
}

function check(condition, message) {
  if (!condition) throw new Error('check failed: ' + message);
}

function same(actual, expected, message) {
  if (C.canonicalJson(actual) !== C.canonicalJson(expected)) {
    throw new Error(message + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
  }
}

function near(actual, expected, tolerance, message) {
  if (!(Math.abs(actual - expected) <= tolerance)) {
    throw new Error(message + ': expected ' + expected + ' +- ' + tolerance + ', got ' + actual);
  }
}

function throwsCode(fn, code, message) {
  try {
    fn();
  } catch (err) {
    if (err && err.code === code) return;
    throw new Error(message + ': expected ' + code + ', got ' + (err && err.code ? err.code : String(err)));
  }
  throw new Error(message + ': did not fail with ' + code);
}

async function rejectsCode(fn, code, message) {
  try {
    await fn();
  } catch (err) {
    if (err && err.code === code) return;
    throw new Error(message + ': expected ' + code + ', got ' + (err && err.code ? err.code : String(err)));
  }
  throw new Error(message + ': did not fail with ' + code);
}

function scratchDir(name) {
  const dir = path.join(SCRATCH, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function runnerText(list) {
  return 'const SOURCE_FILES = [\n' + list.map(function (s) { return "  '" + s + "'"; }).join(',\n') + '\n];\n';
}

function virtualFiles(extra, list) {
  return Object.assign({
    'generator/tests/node-runner.js': runnerText(list || ['js/a.js', '../core/js/b.js']),
    'generator/js/a.js': '(function () {\n  function alpha(x) {\n    return x;\n  }\n  globalThis.a = alpha(1);\n})();\n',
    'core/js/b.js': '(function () {\n  function beta() {\n    return 2;\n  }\n  globalThis.b = beta();\n})();\n'
  }, extra || {});
}

function virtualSet(list, links, extra) {
  return L.loadSourceSet({ repoRoot: VROOT, io: L.memoryIo(VROOT, virtualFiles(extra, list), links) });
}

const HEX64 = /^[0-9a-f]{64}$/;

// --- pure cases -------------------------------------------------------------------------------------------------

add('source-list-corruption', 'pure', 'a corrupted SOURCE_FILES declaration fails closed', function () {
  const good = runnerText(['a.js', 'b.js']);
  same(L.parseSourceList(good), ['a.js', 'b.js'], 'a good list');
  const bad = {
    'no declaration': 'const OTHER = [];',
    'two declarations': good + good,
    'not closed': "const SOURCE_FILES = [ 'a.js',",
    'double quotes': 'const SOURCE_FILES = [ "a.js" ];',
    'comment inside': "const SOURCE_FILES = [\n  'a.js', // note\n  'b.js'\n];",
    expression: "const SOURCE_FILES = [ 'a.js' + 'b.js' ];",
    spread: 'const SOURCE_FILES = [ ...other ];',
    unquoted: 'const SOURCE_FILES = [ a.js ];',
    duplicate: runnerText(['a.js', 'a.js']),
    empty: 'const SOURCE_FILES = [];',
    backslash: "const SOURCE_FILES = [ 'js\\\\a.js' ];",
    absolute: "const SOURCE_FILES = [ '/etc/a.js' ];"
  };
  Object.keys(bad).forEach(function (name) {
    throwsCode(function () { L.parseSourceList(bad[name]); }, 'source-list', name);
  });
  const real = L.parseSourceList(fs.readFileSync(path.join(REPO, 'generator', 'tests', 'node-runner.js'), 'utf8'));
  check(real.length > 30 && real[0] === '../core/js/engine/ns.js', 'the real list parses in its order');
  return { realSources: real.length };
});

add('source-path-escape-and-missing', 'pure', 'a missing or escaping source fails closed', function () {
  const ok = virtualSet();
  same(ok.files.map(function (f) { return f.rel; }), ['js/a.js', '../core/js/b.js'], 'listed order kept');
  check(HEX64.test(ok.fingerprint), 'ordered runtime fingerprint');
  throwsCode(function () { virtualSet(['js/a.js', 'js/nope.js']); }, 'source-missing', 'missing source');
  throwsCode(function () { virtualSet(['js/a.js', '../../outside.js'], null, { '../outside.js': 'x' }); },
    'source-escape', 'lexical escape');
  const link = {};
  link[path.resolve(VROOT, 'generator', 'js', 'a.js')] = path.join(path.parse(VROOT).root, 'elsewhere', 'a.js');
  throwsCode(function () { virtualSet(null, link); }, 'source-escape', 'escape through a link');
  const files = virtualFiles();
  delete files['generator/tests/node-runner.js'];
  throwsCode(function () {
    L.loadSourceSet({ repoRoot: VROOT, io: L.memoryIo(VROOT, files) });
  }, 'source-missing', 'missing runner');
});

add('duplicate-key-and-output', 'pure', 'a duplicate key, start, finish or output fails closed', function () {
  const manifest = M.buildManifest('IG-S01', 'provisional-r1');
  const dupJob = JSON.parse(JSON.stringify(manifest));
  dupJob.jobs.push(Object.assign({}, dupJob.jobs[0]));
  throwsCode(function () { M.validateManifest(dupJob); }, 'duplicate-key', 'duplicate job key');
  const dupBlock = JSON.parse(JSON.stringify(manifest));
  dupBlock.blocks.push(dupBlock.blocks[0]);
  throwsCode(function () { M.validateManifest(dupBlock); }, 'duplicate-key', 'duplicate block key');

  const dir = scratchDir('journal');
  const file = path.join(dir, 'journal.jsonl');
  const journal = new R.Journal(REPO, file, ['k1', 'k2']);
  journal.start('k1');
  throwsCode(function () { journal.start('k1'); }, 'duplicate-start', 'second start');
  throwsCode(function () { journal.finish('k2', {}); }, 'finish-without-start', 'finish without start');
  throwsCode(function () { journal.start('zz'); }, 'journal-unknown-key', 'unplanned key');
  journal.finish('k1', { n: 1 });
  throwsCode(function () { journal.finish('k1', { n: 2 }); }, 'duplicate-finish', 'second finish');
  const again = new R.Journal(REPO, file, ['k1', 'k2']);
  check(again.started.has('k1') && again.finished.has('k1'), 'a reopened journal remembers');
  throwsCode(function () { again.start('k1'); }, 'duplicate-start', 'start after reopening');
  C.appendJsonl(REPO, file, { seq: 99, type: 'job-start', key: 'k1' });
  throwsCode(function () { new R.Journal(REPO, file, ['k1', 'k2']); }, 'journal-corrupt', 'corrupt journal');
  check(!R.reconcile(['k1', 'k2'], C.readJsonl(file)).ok, 'reconciliation reports the duplicate');

  const out = path.join(dir, 'records.json');
  C.writeJsonAtomic(REPO, out, { a: 1 });
  throwsCode(function () { C.writeJsonAtomic(REPO, out, { a: 2 }); }, 'output-exists', 'duplicate JSON output');
  check(!fs.existsSync(out + '.partial'), 'no partial left behind');
  same(C.readJson(out), { a: 1 }, 'the first output is intact');
  const text = path.join(dir, 'x.md');
  C.writeTextExclusive(REPO, text, 'a');
  throwsCode(function () { C.writeTextExclusive(REPO, text, 'b'); }, 'output-exists', 'duplicate text output');
});

function pausedCommand(over) {
  return Object.assign({
    task: 'IG-S01', round: 'provisional-r1', shard: 's', attemptId: 'a1', status: 'paused-unstarted',
    manifestHash: 'm', runtimeFingerprint: 'r', harnessFingerprint: 'h', sourceStable: true,
    unstartedKeys: ['k2', 'k3'], completedKeys: ['k1'], censoredKeys: [], errorKeys: [], startedUnfinishedKeys: []
  }, over || {});
}

function resumeInput(over, commandOver) {
  return Object.assign({
    command: pausedCommand(commandOver), manifestHash: 'm', runtimeFingerprint: 'r', harnessFingerprint: 'h',
    jobs: [{ key: 'k1' }, { key: 'k2' }, { key: 'k3' }], attempts: [], startedKeys: ['k1']
  }, over || {});
}

add('incompatible-hashes', 'pure', 'a resume under other manifest, runtime or harness hashes is refused', function () {
  const ok = R.selectResumable(resumeInput());
  check(ok.ok, 'compatible hashes resume');
  same(ok.keys, ['k2', 'k3'], 'the never-started keys');
  same(R.selectResumable(resumeInput({ manifestHash: 'x' })).reason, 'incompatible-manifest', 'manifest');
  same(R.selectResumable(resumeInput({ runtimeFingerprint: 'x' })).reason, 'incompatible-runtime', 'runtime');
  same(R.selectResumable(resumeInput({ harnessFingerprint: 'x' })).reason, 'incompatible-harness', 'harness');
  same(R.selectResumable(resumeInput({}, { sourceStable: false })).reason, 'source-unstable', 'unstable source');
  same(R.selectResumable(resumeInput({}, { status: 'complete' })).reason, 'not-paused-unstarted', 'not paused');
});

add('missing-and-unstarted-row', 'pure', 'a missing row is unstarted, a started row without result is an error', function () {
  const entries = [
    { type: 'job-start', key: 'a' }, { type: 'job-finish', key: 'a', record: { key: 'a', outcome: 'complete' } },
    { type: 'job-start', key: 'b' }
  ];
  const recon = R.reconcile(['a', 'b', 'c'], entries);
  check(recon.ok, 'a consistent journal');
  same(recon.startedUnfinished, ['b'], 'started without finish');
  same(recon.unstarted, ['c'], 'never started');
  const records = R.buildRecords([{ key: 'a' }, { key: 'b' }, { key: 'c' }], recon);
  same(records.map(function (r) { return r.outcome; }), ['complete', 'error', 'unstarted'], 'one record per key');
  same(records[1].error.code, 'started-without-finish', 'the crashed row says so');
  check(records.every(function (r) { return R.checkRecord(r).length === 0 || r.key === 'a'; }), 'well formed');
  const sel = R.selectResumable(resumeInput({ jobs: [{ key: 'a' }, { key: 'b' }, { key: 'c' }] },
    { unstartedKeys: ['b', 'c'] }));
  const withStarted = R.selectResumable(resumeInput({ jobs: [{ key: 'a' }, { key: 'b' }, { key: 'c' }],
    startedKeys: ['a', 'b'] }, { unstartedKeys: ['b', 'c'] }));
  same(withStarted.keys, ['c'], 'only the never-started key resumes');
  same(withStarted.refused.map(function (r) { return r.reason; }), ['already-started'], 'the started key is refused');
  check(sel.ok, 'resume plan exists');
});

add('started-timeout-children-not-resumable', 'pure', 'a started timeout and its abandoned child samples are not resumed',
  function () {
    const jobs = [{ key: 'P' }, { key: 'P/s1', parentKey: 'P' }, { key: 'P/s2', parentKey: 'P' }, { key: 'Q' }];
    const sel = R.selectResumable(resumeInput({ jobs: jobs, startedKeys: [],
      attempts: [{ censoredKeys: ['P'] }] }, { unstartedKeys: ['P/s1', 'P/s2', 'Q'] }));
    same(sel.keys, ['Q'], 'only the unrelated never-started parent');
    same(sel.refused.map(function (r) { return r.reason; }), ['parent-started', 'parent-started'], 'children refused');
    const timeoutRecord = R.blankRecord({ key: 'P', outcome: 'request-timeout', timeoutScope: 'request' });
    same(R.checkRecord(timeoutRecord), [], 'the timeout is a record');
    check(timeoutRecord.verifiedExact === null, 'a timeout is never a hit');
  });

add('immutable-attempt-output', 'pure', 'attempt output is immutable and only authorised paths are written', function () {
  const shardDir = path.join(scratchDir('attempts'), 'provisional-r1', 'IG-S01', 'shard');
  const a1 = R.openAttempt(REPO, shardDir, 'a1');
  C.writeJsonAtomic(REPO, a1.files.manifest, { m: 1 });
  throwsCode(function () { R.openAttempt(REPO, shardDir, 'a1'); }, 'attempt-exists', 'attempt a1 twice');
  R.openAttempt(REPO, shardDir, 'a2');
  throwsCode(function () { R.openAttempt(REPO, shardDir, 'a2'); }, 'attempt-exists', 'attempt a2 twice');
  throwsCode(function () { R.attemptDirOf(shardDir, 'x9'); }, 'attempt-id', 'bad attempt id');
  throwsCode(function () { R.attemptDirOf(shardDir, 'a0'); }, 'attempt-id', 'attempt a0');
  same(R.nextAttemptId([{ attemptId: 'a1' }, { attemptId: 'a2' }]), 'a3', 'next attempt id');
  throwsCode(function () {
    C.writeJsonAtomic(REPO, path.join(REPO, 'generator', 'js', 'x.json'), {});
  }, 'path-unauthorised', 'write into production');
  throwsCode(function () {
    C.writeTextExclusive(REPO, path.join(REPO, 'docs', 'difficulty-v3', 'x.md'), 'x');
  }, 'path-unauthorised', 'write into other docs');

  const origin = path.join(SCRATCH, 'attempts', 'origin.js');
  const fake = { files: [{ abs: origin }] };
  const item = { code: 'x' };
  throwsCode(function () { L.writePrivateCopy(REPO, fake, item, origin); }, 'path-unauthorised', 'over its origin');
  throwsCode(function () {
    L.writePrivateCopy(REPO, fake, item, path.join(REPO, C.EVIDENCE_REL.split('/').join(path.sep), 'copy.js'));
  }, 'path-unauthorised', 'a private copy outside the harness folder');
  const set = L.loadSourceSet({ repoRoot: REPO });
  const patched = L.buildLoadPlan(set, [L.NOOP_EXPOSE]).items.filter(function (i) { return i.patched; })[0];
  throwsCode(function () { L.writePrivateCopy(REPO, set, patched, patched.abs); }, 'path-unauthorised',
    'the real origin');
  const copy = L.writePrivateCopy(REPO, set, patched, path.join(SCRATCH, 'attempts', 'pipeline.patched.js'));
  check(fs.readFileSync(copy, 'utf8').indexOf('__igHooks') >= 0, 'the private copy holds the hook');
  check(fs.readFileSync(patched.abs, 'utf8').indexOf('__igHooks') < 0, 'the origin is unchanged');
});

add('productive-pause-exit0-incomplete', 'pure', 'a productive pause exits 0 but is not complete coverage', function () {
  same(R.exitCodeForStatus('complete'), 0, 'complete');
  same(R.exitCodeForStatus('paused-unstarted'), 0, 'pause');
  same(R.exitCodeForStatus('parity-failed'), 1, 'parity');
  same(R.exitCodeForStatus('identity-violation'), 1, 'identity');
  same(R.exitCodeForStatus('source-changed'), 1, 'source change');
  same(R.exitCodeForStatus('unsupported-source'), 2, 'unsupported');
  same(C.exitCodeOf(new HarnessError('source-missing', 'x')), 2, 'a missing source stops');
  same(C.exitCodeOf(new HarnessError('anchor-ambiguous', 'x')), 2, 'an ambiguous anchor stops');
  same(C.exitCodeOf(new HarnessError('source-changed', 'x')), 1, 'a changed source is incorrect, not unsupported');
  check(!R.isCoverageComplete({ status: 'paused-unstarted', unstartedKeys: ['k'] }), 'pause is incomplete');
  check(!R.isCoverageComplete({ status: 'complete', unstartedKeys: ['k'] }), 'unstarted keys are incomplete');
  check(R.isCoverageComplete({ status: 'complete', unstartedKeys: [] }), 'complete is complete');
  const records = [R.blankRecord({ key: 'k1', outcome: 'complete' }), R.blankRecord({ key: 'k2' })];
  const command = RUN.assembleCommand({ task: 'IG-S01', shard: 's', round: 'provisional-r1', attemptId: 'a1',
    status: 'paused-unstarted', plannedKeys: ['k1', 'k2'], records: records, lock: null, timing: null });
  same(command.exit, 0, 'the paused command exits 0');
  same(command.unstartedKeys, ['k2'], 'and names what it left');
  same(command.completedKeys, ['k1'], 'and what it did');
});

add('zero-or-quantised-cpu-never-infinite', 'pure', 'zero or quantised CPU cannot create infinity', function () {
  same(R.classifyCpu(0, 15.6), 'unresolved', 'zero');
  same(R.classifyCpu(10, 15.6), 'unresolved', 'below one quantum');
  same(R.classifyCpu(20, 15.6), 'coarse', 'a few quanta');
  same(R.classifyCpu(100, 15.6), 'resolved', 'many quanta');
  same(R.classifyCpu(5, null), 'unquantified', 'no probe');
  same(R.classifyCpu(null, 1), 'unavailable', 'unavailable');
  same(R.classifyCpu(NaN, 1), 'unavailable', 'not a number');
  [0, 1, 5].forEach(function (a) {
    [0, -1, NaN, Infinity, 1e-300, 1].forEach(function (b) {
      const r = R.ratio(a, b);
      check(r === null || Number.isFinite(r), 'ratio(' + a + ', ' + b + ') is null or finite');
    });
  });
  same(R.ratio(1, 0), null, '1/0');
  same(R.ratio(0, 0), null, '0/0');
  same(R.ratePerSecond(2, 0, 'resolved'), null, 'zero denominator');
  same(R.ratePerSecond(2, 500, 'unresolved'), null, 'unresolved denominator');
  same(R.ratePerSecond(2, 500, 'resolved'), 4, 'a resolved rate');
  const make = function (arm, cpu, status, cold) {
    return R.blankRecord({ key: arm, pairId: 'p', arm: arm, outcome: 'complete', verifiedExact: true,
      generation: { readyWallMs: cold - 20, coldWallMs: cold, cleanupMs: 2, cpuTotalMs: cpu,
        cpuResolutionStatus: status } });
  };
  const records = [make('reference', 0, 'unresolved', 100), make('prototype', 0, 'unresolved', 50)];
  const command = RUN.assembleCommand({ task: 'IG-S01', shard: 's', round: 'provisional-r1', attemptId: 'a1',
    status: 'complete', plannedKeys: ['reference', 'prototype'], records: records, lock: null, timing: null,
    cpu: { api: 'test', quantumMs: 15.6 } });
  const summary = R.buildSummary({ command: command, records: records });
  same(summary.arms.reference.hitsPerCpuSecond, null, 'no CPU rate from an unresolved sum');
  same(summary.pairedRows[0].cpuFactor, null, 'no CPU factor from unresolved intervals');
  check(Number.isFinite(summary.pairedRows[0].coldWallFactor), 'the wall factor is still reported');
  check(Number.isFinite(summary.arms.reference.hitsPerColdWallSecond), 'the cold-wall rate is reported');
  check(R.renderSummaryMarkdown(summary).indexOf('Infinity') < 0, 'no infinity in the markdown');
});

add('cold-ready-separation', 'pure', 'cold, ready, startup, cleanup and total are separate intervals', function () {
  const g = H.accountRequest({ t0: 0, tReady: 40, tDecision: 100, tClean: 104, cpu0: 0, cpuReady: 30,
    cpuDecision: 90, cpuClean: 95 }, 15.6, 'test');
  same([g.coldWallMs, g.readyWallMs, g.startupMs, g.cleanupMs, g.occupiedWallMs, g.readyOccupiedWallMs],
    [100, 60, 40, 4, 104, 64], 'wall intervals');
  same([g.cpuToDecisionMs, g.cpuTotalMs, g.cpuReadyTotalMs, g.startupCpuMs, g.cleanupCpuMs],
    [90, 95, 65, 30, 5], 'CPU intervals (decision, total, ready-only, startup, cleanup)');
  check(g.cpuTotalMs >= g.cpuToDecisionMs, 'cleanup and speculative CPU are in the total');
  const cut = H.accountRequest({ t0: 0, tReady: null, tDecision: 50, tClean: 55, cpu0: 0, cpuReady: null,
    cpuDecision: 40, cpuClean: 41 }, 15.6, 'test');
  same([cut.readyWallMs, cut.startupMs, cut.startupCpuMs, cut.cpuReadyTotalMs], [null, null, null, null],
    'a request that never became ready has unknown ready values, not zero');
  same(cut.coldWallMs, 50, 'but its cold wall is known');
  same(cut.gridBuildWallMs, null, 'unknown grid-build cost is null');
});

add('logical-block-packing-and-deadline', 'pure', 'logical blocks pack whole and the deadline shrinks with the budget',
  function () {
    const block = function (i) {
      return { blockKey: 'b' + i, jobKeys: ['b' + i + '/x', 'b' + i + '/y'], estimateMs: 20000,
        jobs: [{ key: 'b' + i + '/x', estimateMs: 10000 }, { key: 'b' + i + '/y', estimateMs: 10000 }] };
    };
    const blocks = [1, 2, 3, 4].map(block);
    const keysOf = function (plan) { return plan.commands.map(function (c) { return c.blockKeys.join('+'); }); };
    same(keysOf(M.packCommands(blocks, 50000)), ['b1+b2', 'b3+b4'], 'two blocks per command');
    same(keysOf(M.packCommands(blocks, 30000)), ['b1', 'b2', 'b3', 'b4'], 'one block per command');
    const first = M.packCommands(blocks, 90000);
    same(keysOf(first), ['b1+b2+b3+b4'], 'everything fits one command');
    const shrunk = M.packCommands(blocks.slice(1), 45000);
    same(keysOf(shrunk), ['b2+b3', 'b4'], 'after b1 ran, a smaller window repacks the rest in order');
    check(first.hash !== shrunk.hash && first.hash !== M.packCommands(blocks, 50000).hash, 'the plan is fingerprinted');
    const big = { blockKey: 'big', jobKeys: ['g/x', 'g/y'], estimateMs: 100000,
      jobs: [{ key: 'g/x', estimateMs: 50000 }, { key: 'g/y', estimateMs: 50000 }] };
    const split = M.packCommands([big], 60000);
    same(split.commands.map(function (c) { return c.jobKeys.join(); }), ['g/x', 'g/y'], 'only an oversize block splits');
    check(split.commands.every(function (c) { return c.split; }), 'split commands say so');
    const huge = { blockKey: 'h', jobKeys: ['h/x'], estimateMs: 70000, jobs: [{ key: 'h/x', estimateMs: 70000 }] };
    same(M.packCommands([huge], 60000).oversize, ['h/x'], 'a job that can never fit is reported, not started');

    const a = M.buildManifest('IG-S01', 'provisional-r1');
    const b = M.buildManifest('IG-S01', 'provisional-r1');
    same(a.manifestHash, b.manifestHash, 'the logical manifest does not depend on packing');
    const shard = M.shardOf(a, 'loader-parity');
    same(M.packCommands(M.blocksFor(a, shard.jobKeys), M.commandWindowMs(195000)).commands.length, 1, 'IG-S01 packing');
    const one = M.blocksFor(a, [shard.jobKeys[3]]);
    same(one.length, 1, 'a resumed single job keeps its block');
    same(one[0].jobKeys, [shard.jobKeys[3]], 'and only that job');

    same(M.effectiveDeadlineMs(1e9, 1e9), 270000, 'at most 270 s');
    same(M.effectiveDeadlineMs(100000, 1e9), 55000, 'task time minus grace');
    same(M.effectiveDeadlineMs(1e9, 80000), 35000, 'round time minus grace');
    same(M.effectiveDeadlineMs(30000, 1e9), 0, 'never negative');
    const state = function (charged, others, approvals) {
      const charges = [{ task: 'IG-S01', chargedMs: charged }];
      if (others) charges.push({ task: 'IG-S02', chargedMs: others });
      return M.budgetState({ task: 'IG-S01', round: 'provisional-r1', charges: charges, approvals: approvals });
    };
    same(state(100000).effectiveDeadlineMs, 95000, 'the task allocation shrinks the deadline');
    check(state(100000).canAdmit, 'and still admits');
    check(!state(230000).canAdmit, 'a nearly spent task cannot admit');
    check(!state(0, M.TOTAL_MS - 50000).canAdmit, 'a nearly spent round cannot admit');
    check(state(230000, 0, [{ task: 'IG-S01', extraMs: 60000 }]).canAdmit, 'an approval adds time');
    check(!M.budgetState({ task: 'IG-S01', round: 'frozen-gate', charges: [], receipt: null }).canAdmit,
      'a frozen round without a budget receipt admits nothing');
    check(M.budgetState({ task: 'IG-S01', round: 'frozen-gate', charges: [],
      receipt: { perTaskMs: { 'IG-S01': 240000 }, authorisedTotalMs: 600000 } }).canAdmit, 'a receipt authorises');
    const host = new H.Host({ repoRoot: REPO, runtimeFingerprint: null, deadlineMs: 195000 });
    check(host.canAdmit(10000) && !host.canAdmit(500000), 'the host admits only what fits its window');
    const tight = new H.Host({ repoRoot: REPO, runtimeFingerprint: null, deadlineMs: 270000, testOnly: true,
      guards: Object.assign({}, C.GUARDS, { finalizeReserveMs: 269000 }) });
    check(!tight.canAdmit(500), 'a window below the start margin admits nothing');
  });

add('one-sided-lower-bound-edges', 'pure', 'the one-sided binomial lower bound at 0/n and n/n', function () {
  [1, 5, 40].forEach(function (n) { same(R.binomialLowerBound(0, n), 0, '0/' + n + ' has a zero lower bound'); });
  [1, 3, 40].forEach(function (n) {
    near(R.binomialLowerBound(n, n), Math.pow(0.05, 1 / n), 1e-12, n + '/' + n);
  });
  check(R.binomialLowerBound(26, 40) >= 0.5, '26/40 reaches 0.5');
  check(R.binomialLowerBound(25, 40) < 0.5, '25/40 does not');
  near(R.binomialTailAtLeast(7, 20, R.binomialLowerBound(7, 20)), 0.05, 1e-7, 'the bound inverts the tail');
  let last = -1;
  for (let k = 0; k <= 12; k++) {
    const b = R.binomialLowerBound(k, 12);
    check(b >= last, 'monotone in k');
    last = b;
  }
  same(R.binomialLowerBound(3, 0), null, 'no trials');
  same(R.binomialLowerBound(5, 4), null, 'more successes than trials');
  same(R.binomialLowerBound(1.5, 4), null, 'not a count');
  near(R.binomialTailAtLeast(3, 5, 0.5), 0.5, 1e-12, 'a known tail');
});

add('cluster-resampling-keeps-pairs', 'pure', 'cluster resampling keeps a cluster\'s pair together', function () {
  const clusters = [{ ref: 2, proto: 10 }, { ref: 4, proto: 20 }, { ref: 6, proto: 30 }];
  let drawn = 0;
  let broken = 0;
  const stat = function (sample) {
    sample.forEach(function (c) {
      drawn++;
      if (clusters.indexOf(c) < 0 || c.proto !== 5 * c.ref) broken++;
    });
    return sample.reduce(function (s, c) { return s + c.proto; }, 0) / sample.reduce(function (s, c) { return s + c.ref; }, 0);
  };
  const a = R.bootstrapClusters(clusters, stat);
  check(drawn > 3 * 2000 && broken === 0, 'every resampled cluster is an intact original pair');
  near(a.point, 5, 1e-12, 'the paired ratio is constant');
  same(a.resamples, 2000, 'default 2,000 resamples');
  same(a.seed, 20261114, 'fixed analysis seed');
  same(R.bootstrapClusters(clusters, stat), a, 'deterministic');
  check(a.descriptive === true, 'labelled descriptive');
  const none = R.bootstrapClusters([{ h: 0, c: 100 }, { h: 0, c: 80 }, { h: 0, c: 90 }], function (s) {
    return s.reduce(function (x, c) { return x + c.h; }, 0) / s.reduce(function (x, c) { return x + c.c; }, 0);
  });
  same([none.point, none.lowerBound95OneSided, none.ci95], [0, 0, [0, 0]], 'zero hits: zero bound, no pseudo-count');
  const all = R.bootstrapClusters([{ h: 1 }, { h: 1 }, { h: 1 }], function (s) {
    return s.reduce(function (x, c) { return x + c.h; }, 0) / s.length;
  });
  same([all.point, all.lowerBound95OneSided], [1, 1], 'all hits');
  const unresolved = R.bootstrapClusters([{ a: 1 }, { a: 2 }], function () { return null; });
  same([unresolved.unresolvedResamples, unresolved.lowerBound95OneSided], [2000, null], 'unresolved stays null');
  same(R.bootstrapClusters([], stat).point, null, 'no clusters');
});

const A_TEXT = [
  '(function () {',
  "  'use strict';",
  '  function alpha(x) {',
  '    return x;',
  '  }',
  '  function beta(y) {',
  '    return y;',
  '  }',
  '  globalThis.out = alpha(1) + beta(2);',
  '})();',
  ''
].join('\n');

function entryOf(text) {
  return { rel: 'js/a.js', abs: path.join(VROOT, 'generator', 'js', 'a.js'), sha256: C.sha256(text), text: text };
}

function transform(over) {
  return Object.assign({ id: 't.alpha', file: 'js/a.js', anchor: 'function alpha(x) {', position: 'before',
    code: 'globalThis.hooked = alpha;' }, over || {});
}

add('transform-validation', 'pure', 'private transforms need unique function anchors and keep their origin', function () {
  const entry = entryOf(A_TEXT);
  const good = L.applyTransform(entry, A_TEXT, transform());
  check(good.text !== A_TEXT && good.record.beforeTextHash !== good.record.afterTextHash, 'before/after hashes differ');
  same(good.record.beforeTextHash, C.sha256(Buffer.from(A_TEXT, 'utf8')), 'the before hash is the origin');
  const ran = vm.runInNewContext(good.text + '\n[typeof globalThis.hooked, globalThis.out].join();');
  same(ran, 'function,3', 'the patched source runs and behaves');
  const body = L.applyTransform(entry, A_TEXT, transform({ id: 't.beta', anchor: 'function beta(y) {',
    position: 'bodyStart', code: 'y = y + 0;' }));
  check(body.text.indexOf('function beta(y) {\n    y = y + 0;') >= 0, 'bodyStart inserts inside the function');
  const twice = A_TEXT + '\n(function () {\n  function alpha(x) {\n    return x;\n  }\n})();\n';
  throwsCode(function () { L.applyTransform(entry, twice, transform()); }, 'anchor-ambiguous', 'anchor twice');
  const redeclared = A_TEXT.replace('function beta(y) {', 'function alpha(z) {\n    return z;\n  }\n  function beta(y) {');
  throwsCode(function () { L.applyTransform(entry, redeclared, transform()); }, 'anchor-ambiguous', 'name twice');
  throwsCode(function () { L.applyTransform(entry, A_TEXT, transform({ anchor: 'function gone(x) {' })); },
    'anchor-missing', 'missing anchor');
  throwsCode(function () { L.applyTransform(entry, A_TEXT, transform({ anchor: 'return x;' })); },
    'anchor-not-function', 'not a function header');
  const inline = 'foo(); function gamma() {}\n';
  throwsCode(function () {
    L.applyTransform(entry, inline, transform({ anchor: 'function gamma() {' }));
  }, 'anchor-position', 'anchor not at line start');
  throwsCode(function () {
    L.applyTransform(entry, 'function gamma() { return 1; }\n', transform({ anchor: 'function gamma()',
      position: 'bodyStart' }));
  }, 'anchor-position', 'bodyStart without a brace');
  throwsCode(function () { L.applyTransform(entry, A_TEXT, transform({ code: '}}}' })); }, 'transform-syntax',
    'patch that does not compile');
  throwsCode(function () { L.applyTransform(entry, A_TEXT, transform({ code: '' })); }, 'transform-shape', 'no code');
  throwsCode(function () { L.applyTransform(entry, A_TEXT, transform({ position: 'after' })); }, 'transform-shape',
    'bad position');
  const set = virtualSet();
  throwsCode(function () {
    L.buildLoadPlan(set, [{ id: 'x', transforms: [transform({ file: 'js/zzz.js' })] }]);
  }, 'transform-file', 'a file that is not listed');
  throwsCode(function () {
    L.buildLoadPlan(set, [{ id: 'x', transforms: [transform(), transform({ anchor: 'function alpha(x) {' })] }]);
  }, 'transform-duplicate', 'a repeated transform id');
  throwsCode(function () { L.getAdapter('definitely-missing'); }, 'adapter-unknown', 'unknown adapter');
  throwsCode(function () { L.getAdapter('../x'); }, 'adapter-unknown', 'adapter path trick');
  const plan = L.buildLoadPlan(set, [{ id: 'x', transforms: [transform()] }]);
  const rawA = set.files[0].text;
  check(plan.items[0].patched && !plan.items[1].patched, 'only the transformed file is patched');
  same(plan.items[1].code, set.files[1].text, 'an untouched file is run unmodified');
  same(plan.items[1].afterHash, plan.items[1].beforeHash, 'with equal hashes');
  check(set.files[0].text === rawA && rawA.indexOf('hooked') < 0, 'the origin text is untouched');

  const real = L.loadSourceSet({ repoRoot: REPO });
  const realPlan = L.buildLoadPlan(real, [L.NOOP_EXPOSE]);
  same(realPlan.items.filter(function (i) { return i.patched; }).map(function (i) { return i.rel; }),
    ['js/engine/pipeline.js'], 'the no-op hook patches exactly pipeline.js');
  same(realPlan.transforms[0].functionName, 'normalizeConfig', 'on its function anchor');
  check(realPlan.adapterHashes.every(function (h) { return HEX64.test(h); }), 'adapter hashes');
  return { transformHash: realPlan.transforms[0].transformHash, afterTextHash: realPlan.transforms[0].afterTextHash };
});

add('source-change-detected', 'pure', 'a changed, added or reordered source invalidates the comparison', function () {
  const files = virtualFiles();
  const io = L.memoryIo(VROOT, files);
  const before = L.loadSourceSet({ repoRoot: VROOT, io: io });
  check(L.compareSourceSets(before, L.loadSourceSet({ repoRoot: VROOT, io: io })).stable, 'unchanged is stable');
  io.files.set(path.resolve(VROOT, 'core', 'js', 'b.js'), Buffer.from('changed'));
  const after = L.loadSourceSet({ repoRoot: VROOT, io: io });
  const diff = L.compareSourceSets(before, after);
  check(!diff.stable && diff.changed.join() === '../core/js/b.js', 'a changed byte is found');
  const reordered = virtualSet(['../core/js/b.js', 'js/a.js']);
  const order = L.compareSourceSets(virtualSet(), reordered);
  check(!order.stable && !order.sameOrder, 'a reordered list is not the same runtime');
  const plus = virtualSet(['js/a.js', '../core/js/b.js', 'js/c.js'], null, { 'generator/js/c.js': 'x' });
  check(L.compareSourceSets(virtualSet(), plus).added.join() === 'js/c.js', 'an added source is found');
  throwsCode(function () {
    L.prepareLoad({ repoRoot: VROOT, io: L.memoryIo(VROOT, files), expectedFingerprint: 'f'.repeat(64) });
  }, 'source-changed', 'a worker refuses sources that differ from the recorded fingerprint');
  const prepared = L.prepareLoad({ repoRoot: VROOT, io: L.memoryIo(VROOT, files),
    expectedFingerprint: before.fingerprint });
  same(prepared.plan.items.length, 2, 'and loads matching ones');
});

add('gate-states', 'pure', 'frozen receipt, unsupported source and provisional gate states', function () {
  const fp = 'a'.repeat(64);
  const freeze = { schema: 'ig-s-freeze/1', acceptedLabels: { ms17b: 'x1', ms18e: 'y1' }, runtimeFingerprint: fp,
    catalogueFingerprint: 'b'.repeat(64), limitsAndDefaults: { attempts: [8, 4, 2] },
    attestation: { by: 'orchestrator', at: '2026-11-14', text: 'frozen' } };
  const budget = { schema: 'ig-s-budget/1', source: 'orchestrator', authorisedTotalMs: 1e6, runtimeFingerprint: fp,
    perTaskMs: { 'IG-S01': 1e5 }, attestation: { by: 'orchestrator' } };
  const gate = function (over) {
    return R.evaluateGate(Object.assign({ round: 'frozen-gate', freezeReceipt: freeze, budgetReceipt: budget,
      runtimeFingerprint: fp, catalogueFingerprint: 'b'.repeat(64) }, over || {}));
  };
  const provisional = R.evaluateGate({ round: 'provisional-r1', freezeReceipt: freeze, budgetReceipt: budget,
    runtimeFingerprint: fp, catalogueFingerprint: 'b'.repeat(64), frozen: true, ratingVersion: 3 });
  same([provisional.state, provisional.formalGateEnabled], ['not-evaluable-pre-freeze', false],
    'pre-freeze is never evaluable, whatever a receipt or a flag says');
  const flag = R.evaluateGate({ round: 'frozen-gate', frozen: true, ratingVersion: 3, runtimeFingerprint: fp });
  same([flag.state, flag.formalGateEnabled], ['frozen-receipt-missing', false], 'a frozen flag alone enables nothing');
  same(gate({ freezeReceipt: Object.assign({}, freeze, { schema: 'x' }) }).state, 'frozen-receipt-invalid', 'invalid');
  same(gate({ freezeReceipt: Object.assign({}, freeze, { attestation: null }) }).state, 'frozen-receipt-invalid',
    'no attestation');
  same(gate({ runtimeFingerprint: 'c'.repeat(64) }).state, 'frozen-runtime-mismatch', 'another runtime');
  same(gate({ budgetReceipt: null }).state, 'frozen-budget-missing', 'no budget receipt');
  same(gate({ budgetReceipt: { schema: 'ig-s-budget/1' } }).state, 'frozen-budget-invalid', 'invalid budget receipt');
  same(gate({ budgetReceipt: Object.assign({}, budget, { runtimeFingerprint: undefined }) }).state,
    'frozen-budget-invalid', 'a budget receipt without a runtime fingerprint');
  same(gate({ budgetReceipt: Object.assign({}, budget, { runtimeFingerprint: 'e'.repeat(64) }) }).state,
    'frozen-runtime-mismatch', 'a budget receipt for another runtime');
  same(gate({ catalogueFingerprint: null }).state, 'frozen-catalogue-unverified', 'catalogue not observed');
  same(gate({ catalogueFingerprint: 'd'.repeat(64) }).state, 'frozen-catalogue-mismatch', 'another catalogue');
  same(gate({ supportOk: false }).state, 'unsupported-source', 'unsupported source');
  const ready = gate();
  same([ready.state, ready.formalGateEnabled, ready.projection], ['frozen-ready', true,
    'projection-awaits-author-review'], 'a complete frozen basis, the projection still awaits the author');
  check(R.validateFreezeReceipt(null).length > 0 && R.validateBudgetReceipt(null).length > 0, 'null receipts');
});

function receiptSet() {
  const fp = 'a'.repeat(64);
  return {
    fp: fp,
    freeze: { schema: 'ig-s-freeze/1', acceptedLabels: { ms17b: 'x1', ms18e: 'y1' }, runtimeFingerprint: fp,
      catalogueFingerprint: 'b'.repeat(64), limitsAndDefaults: {}, attestation: { by: 'orchestrator', text: 'frozen' } },
    budget: { schema: 'ig-s-budget/1', source: 'orchestrator', authorisedTotalMs: 1e6, runtimeFingerprint: fp,
      perTaskMs: { 'IG-S01': 1e5 }, attestation: { by: 'orchestrator' } }
  };
}

add('receipts-validated-before-frozen-generation', 'pure', 'both frozen receipts are validated before any frozen generation',
  async function () {
    const r = receiptSet();
    const input = function (over) {
      return Object.assign({ round: 'frozen-gate', freezeReceipt: r.freeze, budgetReceipt: r.budget,
        runtimeFingerprint: r.fp }, over || {});
    };
    const noFingerprint = Object.assign({}, r.budget);
    delete noFingerprint.runtimeFingerprint;
    const other = 'e'.repeat(64);
    check(R.receiptProblems(input()).ok, 'two valid receipts naming this runtime');
    check(R.receiptProblems({ round: 'provisional-r1' }).ok, 'a pre-freeze round needs no receipt');
    same(R.receiptProblems(input({ freezeReceipt: null })).code, 'frozen-receipt-missing', 'no freeze receipt');
    same(R.receiptProblems(input({ budgetReceipt: null })).code, 'frozen-receipt-missing', 'no budget receipt');
    same(R.receiptProblems(input({ budgetReceipt: noFingerprint })).code, 'frozen-receipt-invalid',
      'a budget receipt without a runtimeFingerprint');
    check(R.validateBudgetReceipt(noFingerprint).some(function (p) { return /runtimeFingerprint/.test(p); }),
      'the budget receipt schema names the field');
    same(R.receiptProblems(input({ freezeReceipt: Object.assign({}, r.freeze, { schema: 'x' }) })).code,
      'frozen-receipt-invalid', 'an invalid freeze receipt');
    same(R.receiptProblems(input({ budgetReceipt: Object.assign({}, r.budget, { runtimeFingerprint: other }) })).code,
      'frozen-runtime-mismatch', 'a budget receipt for another runtime');
    same(R.receiptProblems(input({ freezeReceipt: Object.assign({}, r.freeze, { runtimeFingerprint: other }) })).code,
      'frozen-runtime-mismatch', 'a freeze receipt for another runtime');
    RUN.assertFrozenReceipts(input());
    RUN.assertFrozenReceipts({ round: 'provisional-r1' });
    throwsCode(function () { RUN.assertFrozenReceipts(input({ budgetReceipt: null })); }, 'frozen-receipt-missing',
      'a run refuses without a receipt');
    throwsCode(function () { RUN.assertFrozenReceipts(input({ budgetReceipt: noFingerprint })); },
      'frozen-receipt-invalid', 'a run refuses an invalid receipt');
    throwsCode(function () {
      RUN.assertFrozenReceipts(input({ budgetReceipt: Object.assign({}, r.budget, { runtimeFingerprint: other }) }));
    }, 'frozen-runtime-mismatch', 'a run refuses a receipt for another runtime');
    ['frozen-receipt-missing', 'frozen-receipt-invalid', 'frozen-runtime-mismatch', 'frozen-catalogue-mismatch']
      .forEach(function (code) { same(C.exitCodeOf(new HarnessError(code, 'x')), 2, code + ' stops the pack'); });

    // The command itself refuses before it opens an evidence folder, takes the lock or generates.
    const dir = scratchDir('receipts');
    const freezeFile = path.join(dir, 'freeze.json');
    const budgetFile = path.join(dir, 'budget.json');
    C.writeJsonAtomic(REPO, freezeFile, r.freeze);
    C.writeJsonAtomic(REPO, budgetFile, noFingerprint);
    const frozenDir = path.join(RUN.evidenceRootOf(REPO), 'frozen-gate');
    check(!fs.existsSync(frozenDir), 'precondition: no frozen evidence folder');
    await rejectsCode(function () {
      return RUN.runShard({ task: 'IG-S01', round: 'frozen-gate', shard: 'loader-parity', attempt: null,
        resume: null, deadlineMs: null, runtimeLabel: null, freezeReceipt: freezeFile, budgetReceipt: budgetFile,
        lockHelper: null, requestedAt: null, planOnly: false }, REPO);
    }, 'frozen-receipt-invalid', 'run.cjs refuses invalid receipts');
    check(!fs.existsSync(frozenDir), 'and opened nothing');
    const plan = RUN.planOnly({ task: 'IG-S01', round: 'frozen-gate', runtimeLabel: null, freezeReceipt: freezeFile,
      budgetReceipt: budgetFile }, REPO);
    same([plan.receipts.ok, plan.receipts.code, plan.gate.formalGateEnabled], [false, 'frozen-receipt-invalid', false],
      'the plan reports the refusal');
    const ps = stripComments(fs.readFileSync(path.join(C.HARNESS_DIR, 'Invoke-IgTask.ps1'), 'utf8'));
    const checkAt = ps.indexOf('$FirstPlan.receipts.ok');
    const sourceAt = ps.indexOf('. $helperPath');
    check(checkAt > 0 && sourceAt > checkAt, 'the dispatcher checks the receipts before it sources the wrapper');
  });

add('lock-owner-must-be-proved', 'pure', 'the lock-owner guard needs proof: a missing or unreadable lock file fails',
  function () {
    const task = 'IG-S01/loader-parity';
    const lockOf = function (read) { return RUN.observeLock(task, { file: 'virtual.lock', readFile: read }); };
    const failing = function (code) {
      return function () {
        const err = new Error('lock: ' + code);
        if (code) err.code = code;
        throw err;
      };
    };
    const owned = lockOf(function () { return '4242|IG ' + task + '|2026-11-14T00:00:00Z'; });
    same(owned.ownerMatches, true, 'the owner line names this task');
    RUN.assertLockOwned(owned, task);
    const cases = {
      'another task holds the lock': [lockOf(function () { return '4242|IG IG-S01/self-test|t'; }), false],
      'a task name that only starts like ours': [lockOf(function () { return '4242|IG ' + task + 'x|t'; }), false],
      'a lock file that is empty': [lockOf(function () { return ''; }), false],
      'no lock file': [lockOf(failing('ENOENT')), false],
      'a lock file that cannot be read (busy)': [lockOf(failing('EBUSY')), null],
      'a lock file that cannot be read (denied)': [lockOf(failing('EACCES')), null],
      'a read error without a code': [lockOf(failing(null)), null]
    };
    Object.keys(cases).forEach(function (name) {
      same(cases[name][0].ownerMatches, cases[name][1], name + ': ownerMatches');
      throwsCode(function () { RUN.assertLockOwned(cases[name][0], task); }, 'unlocked-refused', name + ' fails the guard');
    });
    const busy = lockOf(failing('EBUSY'));
    check(busy.error === 'EBUSY' && busy.content === null, 'the read error is recorded');
    // Both entry points use the same guard, and neither tests only for a refuted owner.
    const runSource = fs.readFileSync(path.join(C.HARNESS_DIR, 'run.cjs'), 'utf8');
    const selfSource = fs.readFileSync(__filename, 'utf8');
    check(runSource.indexOf('assertLockOwned(lock, expectedTask);') >= 0 &&
      selfSource.indexOf('RUN.assertLockOwned(lock, expectedTask);') >= 0, 'both entry points call assertLockOwned');
    const weak = 'ownerMatches ===' + ' false';
    check(runSource.indexOf(weak) < 0 && selfSource.indexOf(weak) < 0, 'no guard that passes when the owner is unknown');
  });

add('rates-charge-all-spent-work', 'pure', 'rate denominators include censored, error and validation-unknown work',
  function () {
    const make = function (key, outcome, cpu, cold, cleanup, over) {
      return R.blankRecord(Object.assign({ key: key, pairId: 'p', arm: 'prototype', outcome: outcome,
        generation: { cpuTotalMs: cpu, coldWallMs: cold, cleanupMs: cleanup, readyWallMs: cold === null ? null :
          cold - 10, cpuResolutionStatus: 'resolved' } }, over || {}));
    };
    const records = [
      make('a', 'complete', 100, 500, 5, { verifiedExact: true, claimedExact: true }),
      make('b', 'request-timeout', 400, 1000, 10, { timeoutScope: 'request' }),
      make('c', 'error', 60, 80, 2, { error: { code: 'x' } }),
      make('d', 'validation-unknown', 40, 300, 3, { claimedExact: true }),
      R.blankRecord({ key: 'e', pairId: 'p', arm: 'prototype' })
    ];
    const a = R.armSummary(records, 16);
    same(a.spent.complete, { requests: 1, cpuMs: 100, wallMs: 505 }, 'completed work');
    same(a.spent.censored, { requests: 1, cpuMs: 400, wallMs: 1010 }, 'censored work');
    same(a.spent.errors, { requests: 1, cpuMs: 60, wallMs: 82 }, 'error work');
    same(a.spent.validationUnknown, { requests: 1, cpuMs: 40, wallMs: 303 }, 'validation-unknown work');
    same(a.spent.total, { requests: 4, cpuMs: 600, wallMs: 1900 }, 'all started work, the unstarted row spent none');
    same([a.cpuTotalAggregateMs, a.wallChargedMs, a.verifiedHits, a.unstarted], [600, 1900, 1, 1], 'denominators');
    near(a.hitsPerCpuSecond, 1 / 0.6, 1e-9, 'the CPU rate charges all 600 ms, not the 100 ms of the hit');
    near(a.hitsPerColdWallSecond, 1 / 1.9, 1e-9, 'the wall rate charges all 1.9 s');
    check(a.hitsPerCpuSecond < 2 && a.hitsPerColdWallSecond < 1, 'neither is the optimistic completed-only rate');
    check(a.cpuTotalMs.n === 1 && a.censoredColdWallMs.n === 1, 'completion statistics stay completed-only');
    // Spend that is unknown stays unknown: it never shrinks the denominator.
    const crashed = R.blankRecord({ key: 'f', pairId: 'p', arm: 'prototype', outcome: 'error',
      error: { code: 'started-without-finish' } });
    const u = R.armSummary(records.concat([crashed]), 16);
    same([u.cpuTotalAggregateMs, u.wallChargedMs, u.hitsPerCpuSecond, u.hitsPerColdWallSecond], [null, null, null, null],
      'a started row without measurements makes the rate unknown');
    // And no category is silently absent from the report.
    const command = RUN.assembleCommand({ task: 'IG-S01', shard: 's', round: 'provisional-r1', attemptId: 'a1',
      status: 'complete', plannedKeys: records.map(function (x) { return x.key; }), records: records, lock: null,
      timing: null, cpu: { api: 'test', quantumMs: 16 } });
    const markdown = R.renderSummaryMarkdown(R.buildSummary({ command: command, records: records }));
    ['complete', 'censored', 'errors', 'validationUnknown', 'total'].forEach(function (k) {
      check(markdown.indexOf('| ' + k + ' |') >= 0, 'the summary lists ' + k);
    });
  });

const { EventEmitter } = require('events');

// A worker stand-in for host logic: no thread, no CPU. `script.onStart(worker)` and `script.onMessage(worker, msg)`.
class FakeWorker extends EventEmitter {
  constructor(script) {
    super();
    this.script = script;
    this.posted = [];
    if (script.workers) script.workers.push(this);
    process.nextTick(() => { if (script.onStart) script.onStart(this); });
  }

  postMessage(message) {
    this.posted.push(message);
    if (this.script.onMessage) this.script.onMessage(this, message);
  }

  terminate() {
    return this.script.hang ? new Promise(function () {}) : Promise.resolve(0);
  }
}

function fakeHost(script, over) {
  const state = { now: 0 };
  const host = new H.Host(Object.assign({
    repoRoot: REPO, runtimeFingerprint: 'x', clock: function () { return state.now; },
    meter: H.createCpuMeter(function () { return { user: state.now * 1000, system: 0 }; }), processAgeMs: 0,
    terminateGuardMs: 30, workerFactory: function () { return new FakeWorker(script); }
  }, over || {}));
  return { host: host, state: state };
}

add('host-deadline-late-decision-and-termination', 'pure',
  'deadlines count from process start, a late decision is rejected and an unterminated worker is kept and reported',
  async function () {
    const anchored = fakeHost({}, { processAgeMs: 5000, deadlineMs: 20000 }).host;
    same(anchored.startedAt, -5000, 'the deadline counts from the process start');
    same(anchored.remainingMs(), 7000, '20 s deadline - 8 s finalize reserve - 5 s already used');
    check(anchored.canAdmit(5000) && !anchored.canAdmit(5001), 'admission honours the shortened window');
    const real = new H.Host({ repoRoot: REPO, runtimeFingerprint: null });
    check(real.processAgeMs > 0 && Math.abs(real.clock() - real.startedAt - real.processAgeMs) < 5,
      'by default the anchor is the real age of this process');

    const ready = function (worker) { worker.emit('message', { type: 'ready', proof: null }); };
    let lateHost = null;
    const lateScript = { onStart: ready, onMessage: function (worker, message) {
      if (message.type === 'job') {
        lateHost.state.now = 180001;
        worker.emit('message', { type: 'decision', wire: { v: 1 } });
      }
    } };
    lateHost = fakeHost(lateScript);
    const late = await lateHost.host.runRequest({ key: 'late', request: {} });
    check(late.outcome === 'request-timeout' && late.timeoutScope === 'request' && late.lateDecision === true,
      'a decision after the 180 s deadline is a timeout: ' + late.outcome);
    check(late.wire === null && /rejected/.test(late.error.message), 'and its result is rejected, not recorded');
    same(late.generation.coldWallMs, 180001, 'its wall is the arrival time');

    let timelyHost = null;
    const timelyScript = { onStart: ready, onMessage: function (worker, message) {
      if (message.type === 'job') {
        timelyHost.state.now = 100;
        worker.emit('message', { type: 'decision', wire: { v: 1 } });
      }
    } };
    timelyHost = fakeHost(timelyScript);
    const timely = await timelyHost.host.runRequest({ key: 'timely', request: {} });
    check(timely.outcome === 'complete' && timely.wire && timely.lateDecision === false, 'an on-time decision stands');
    same([timely.generation.coldWallMs, timely.generation.cpuTotalMs], [100, 100], 'with its intervals');

    let stuckHost = null;
    const stuckScript = { hang: true, workers: [], onStart: ready, onMessage: function (worker, message) {
      if (message.type === 'job') {
        stuckHost.state.now = 10;
        worker.emit('message', { type: 'decision', wire: { v: 1 } });
      }
    } };
    stuckHost = fakeHost(stuckScript);
    const stuck = await stuckHost.host.runRequest({ key: 'stuck', request: {} });
    check(stuck.outcome === 'complete' && stuck.terminateFailure === 'terminate-timeout',
      'a worker that will not terminate is reported: ' + stuck.terminateFailure);
    check(stuckHost.host.stopped === 'terminate-timeout' && stuckHost.host.workers.size === 1,
      'the host stops and still owns the worker');
    await rejectsCode(function () { return stuckHost.host.runRequest({ key: 'next', request: {} }); }, 'host-stopped',
      'no further request after a termination timeout');
    await rejectsCode(function () { return stuckHost.host.runValidation({}, { level: 'x' }); }, 'host-stopped',
      'no validation either');
    const all = await stuckHost.host.terminateAll();
    same([all.ok, all.remaining], [false, 1], 'terminating all reports the worker it could not stop');
    check(stuckHost.host.workers.has(stuckScript.workers[0]), 'the worker is not forgotten');

    const refusedScript = { workers: [], onStart: function (worker) {
      worker.emit('message', { type: 'ready', catalogue: { fingerprint: 'aaa' } });
    } };
    const refused = await fakeHost(refusedScript).host.runRequest({ key: 'refused', request: {},
      readyCheck: function (msg) {
        return msg.catalogue.fingerprint === 'bbb' ? null : { code: 'frozen-catalogue-mismatch', message: 'no' };
      } });
    check(refused.outcome === 'error' && refused.fatal === 'frozen-catalogue-mismatch', 'a refused job is an error');
    same(refusedScript.workers[0].posted.length, 0, 'and the job was never posted to the worker');
  });

function attemptOf(id, resumes, over) {
  return { attemptId: id, dir: path.join(VROOT, 'ev', id), journal: (over && over.journal) || [],
    command: Object.assign({ task: 'IG-S01', round: 'provisional-r1', shard: 's', attemptId: id,
      status: 'paused-unstarted', manifestHash: 'm', runtimeFingerprint: 'r', harnessFingerprint: 'h',
      sourceStable: true, completedKeys: [], censoredKeys: [], errorKeys: [], startedUnfinishedKeys: [],
      unstartedKeys: [], resumeOf: resumes ? { attemptId: resumes } : null }, (over && over.command) || {}) };
}

function starts(keys) {
  return keys.map(function (k) { return { type: 'job-start', key: k }; });
}

add('parity-defers-and-resume-chain-reconciles', 'pure',
  'incomplete parity pairs are deferred and reconciled across a resume chain, with no key started twice', function () {
    const digests = { all: 'x', structure: 's', givens: 'g' };
    const rec = function (pairId, arm, over) {
      return Object.assign(R.blankRecord({ key: pairId + '/' + arm, pairId: pairId, arm: arm, outcome: 'complete',
        claimedExact: true, verifiedExact: true, puzzleHash: 'h' }), {
        digests: Object.assign({}, digests),
        adapterProof: arm === 'reference' ? { hooksPresent: false, exposed: [], normalizeConfigEqual: null } :
          { hooksPresent: true, exposed: ['normalizeConfig'], normalizeConfigEqual: true },
        transforms: arm === 'prototype' ? [{ id: 't', beforeTextHash: 'a', afterTextHash: 'b' }] : []
      }, over || {});
    };
    const open = function (pairId, arm) {
      return R.blankRecord({ key: pairId + '/' + arm, pairId: pairId, arm: arm });
    };
    const half = RUN.parityReport([rec('p1', 'reference'), open('p1', 'prototype')]);
    same([half.pairs[0].verdict, half.pairs[0].waitingFor, half.failed, half.deferred, half.complete],
      ['deferred', 'prototype', 0, 1, false], 'a pair whose mate has not run is deferred, not failed');
    const none = RUN.parityReport([open('p1', 'reference'), open('p1', 'prototype')]);
    same([none.pairs[0].verdict, none.failed, none.deferred], ['not-started', 0, 1], 'a pair not started');
    const both = RUN.parityReport([rec('p1', 'reference'), rec('p1', 'prototype')]);
    same([both.pairs[0].verdict, both.complete, both.failed], ['parity-ok', true, 0], 'a complete pair compares');
    const differing = RUN.parityReport([rec('p1', 'reference'),
      rec('p1', 'prototype', { digests: Object.assign({}, digests, { all: 'y', structure: 't' }) })]);
    same([differing.pairs[0].verdict, differing.failed], ['parity-failed', 1], 'a real difference still fails');
    check(differing.pairs[0].problems.join().indexOf('structure') >= 0, 'and names the section');
    const censored = RUN.parityReport([rec('p1', 'reference', { outcome: 'request-timeout', timeoutScope: 'request' }),
      open('p1', 'prototype')]);
    same(censored.pairs[0].verdict, 'parity-failed', 'a started arm that did not complete is not deferred');

    const first = [rec('p1', 'reference'), rec('p1', 'prototype'), open('p2', 'reference'), open('p2', 'prototype')];
    const second = [rec('p2', 'reference'), rec('p2', 'prototype')];
    const atFirst = RUN.parityReport(first);
    same([atFirst.ok, atFirst.failed, atFirst.deferred, atFirst.complete], [1, 0, 1, false],
      'after the pause: one pair compared, one deferred');
    const merged = RUN.mergeRecords([first, second]);
    same(merged.map(function (r) { return r.outcome; }), ['complete', 'complete', 'complete', 'complete'],
      'a later attempt replaces the placeholders');
    const atSecond = RUN.parityReport(merged);
    same([atSecond.ok, atSecond.failed, atSecond.deferred, atSecond.complete], [2, 0, 0, true],
      'after the resume: every pair compared');
    same(RUN.mergeRecords([second, [open('p2', 'reference')]])[0].outcome, 'complete',
      'a placeholder never replaces a real record');

    // The resume chain.
    const a1 = attemptOf('a1', null, { journal: starts(['k1', 'k2', 'k3', 'k4']),
      command: { status: 'complete', completedKeys: ['k1', 'k2', 'k3', 'k4'] } });
    const a2 = attemptOf('a2', null, { journal: starts(['k1', 'k2']),
      command: { completedKeys: ['k1', 'k2'], unstartedKeys: ['k3', 'k4'] } });
    const a3 = attemptOf('a3', 'a2', { journal: starts(['k3']),
      command: { completedKeys: ['k3'], unstartedKeys: ['k4'] } });
    const a4 = attemptOf('a4', null, { command: { status: 'complete' } });
    const ids = function (chain) { return chain.map(function (a) { return a.attemptId; }); };
    same(ids(R.chainOf([a1, a2, a3, a4], 'a3')), ['a2', 'a3'], 'a resume extends its chain');
    same(ids(R.chainOf([a1, a2, a3, a4], 'a1')), ['a1'], 'a fresh attempt starts a chain');
    same(ids(R.lastChain([a1, a2, a3, a4])), ['a4'], 'the last chain is the latest run');
    same(R.lastChain([]), [], 'no attempts, no chain');
    same(R.startedKeysOf(R.chainOf([a1, a2], 'a2')).sort(), ['k1', 'k2'], 'only the chain started k1 and k2');
    const manifest = { task: 'IG-S01', round: 'provisional-r1', manifestHash: 'm',
      jobs: ['k1', 'k2', 'k3', 'k4'].map(function (k) { return { key: k }; }) };
    const shard = { shard: 's', kind: 'pipeline', jobKeys: ['k1', 'k2', 'k3', 'k4'] };
    const resume = function (prev, existing, over) {
      return RUN.resolveResume(Object.assign({ prev: prev, existing: existing, manifest: manifest, shard: shard,
        runtimeFingerprint: 'r', harnessFingerprint: 'h' }, over || {}));
    };
    const ok = resume(a2.command, [a1, a2]);
    same([ok.keys, ids(ok.chain)], [['k3', 'k4'], ['a2']],
      'an older finished run that started every key does not block resuming the newer paused one');
    same(resume(a3.command, [a1, a2, a3]).keys, ['k4'], 'a second pause resumes only what is left');
    throwsCode(function () { resume(a2.command, [a1, a2, a3]); }, 'resume-refused', 'an attempt is resumed once');
    throwsCode(function () { resume(Object.assign({}, a2.command, { unstartedKeys: ['k1'] }), [a1, a2]); },
      'resume-refused', 'a command.json that is not the recorded evidence');
    throwsCode(function () { resume(Object.assign({}, a2.command, { shard: 'other' }), [a1, a2]); },
      'resume-refused', 'another shard');
    throwsCode(function () { resume(a2.command, [a1, a2], { runtimeFingerprint: 'z' }); }, 'resume-refused',
      'another runtime');
    throwsCode(function () { resume(a2.command, [a1, a2], { harnessFingerprint: 'z' }); }, 'resume-refused',
      'another harness');
    const all = Object.keys({ k1: 1, k2: 1, k3: 1, k4: 1 }).map(function (k) {
      return R.blankRecord({ key: k, outcome: 'complete' });
    });
    const proof = RUN.buildChainInfo({ chain: ok.chain, attemptId: 'a3', resumed: true, keys: ['k3', 'k4'],
      unstartedKeys: [], shardKeys: shard.jobKeys, mergedRecords: all });
    same([proof.attempts, proof.noRerun, proof.rerunKeys, proof.unstartedAfter, proof.startedBefore.sort(),
      proof.startedHere], [['a2', 'a3'], true, [], [], ['k1', 'k2'], ['k3', 'k4']], 'no recorded work was rerun');
    const bad = RUN.buildChainInfo({ chain: ok.chain, attemptId: 'a3', resumed: true, keys: ['k2', 'k3'],
      unstartedKeys: [], shardKeys: shard.jobKeys, mergedRecords: all });
    same([bad.noRerun, bad.rerunKeys], [false, ['k2']], 'a key started twice is caught');

    // The shard state follows the latest chain only.
    const root = scratchDir('chains');
    const dir = path.join(root, 'IG-S01', 's');
    const write = function (where, command) {
      fs.mkdirSync(where, { recursive: true });
      C.writeJsonAtomic(REPO, path.join(where, 'command.json'), command);
    };
    write(dir, a1.command);
    same(R.shardStatus(dir, shard).status, 'recorded', 'a finished run');
    write(path.join(dir, 'a2'), a2.command);
    const paused = R.shardStatus(dir, shard);
    same([paused.status, paused.chain, paused.unstartedKeys], ['paused', ['a2'], ['k3', 'k4']],
      'a fresh attempt after a finished run is its own chain, and it is paused');
    write(path.join(dir, 'a3'), Object.assign({}, a3.command, { status: 'complete', completedKeys: ['k3', 'k4'],
      unstartedKeys: [] }));
    const done = R.shardStatus(dir, shard);
    same([done.status, done.chain], ['recorded', ['a2', 'a3']], 'the resume completes the chain');
    write(path.join(dir, 'a4'), Object.assign({}, a4.command, { status: 'parity-failed', completedKeys: [] }));
    same(R.shardStatus(dir, shard).status, 'failed', 'a failed fresh attempt is judged alone');
  });

function stripComments(source) {
  return source.replace(/<#[\s\S]*?#>/g, '').split(/\r?\n/).filter(function (line) {
    return !/^\s*#/.test(line);
  }).join('\n');
}

add('dispatcher-uses-only-the-wrapper', 'pure', 'the dispatcher uses only the supplied wrapper and no lock of its own',
  function () {
    const text = fs.readFileSync(path.join(C.HARNESS_DIR, 'Invoke-IgTask.ps1'), 'utf8');
    const code = stripComments(text);
    ['Invoke-Dv3Node', 'Dv3', 'dv3-lock', 'dv3-sudoku.lock', 'dv3-timing.lock', 'CreateNew', 'IO.File]::Open',
      'FileStream', '-LimitSeconds', '-QuietSeconds', '-WaitHours', 'AllowExit1', 'Start-Process',
      'Invoke-Expression', 'sudoku.improve-generating', 'Remove-Item'].forEach(function (token) {
      check(code.indexOf(token) < 0, 'the dispatcher must not contain ' + token);
    });
    check(!/(^|[^\w-])git(\.exe)?\s/m.test(code), 'the dispatcher runs no git');
    check(/\.\s+\$helperPath/.test(code), 'it sources the lock helper');
    check(/Invoke-IgNode\s+-Repo\s+sudoku\s+-Task\s+\$wrapperTask\s+-NodeArgs/.test(code),
      'it calls Invoke-IgNode for each shard');
    check(/\$LockHelper\s*=\s*\(Join-Path \$env:USERPROFILE '[^']*ig-lock\.ps1'\)/.test(code),
      'the default helper path is beneath USERPROFILE');
    check(code.indexOf('$PSScriptRoot') >= 0, 'the repository is derived from the script location');
    ['PlanOnly', 'ResumeUnstarted', 'FreezeReceipt', 'BudgetReceipt', 'LockHelper', 'Attempt'].forEach(function (p) {
      check(new RegExp('\\$' + p + '\\b').test(code), 'parameter ' + p);
    });
    const nodeCalls = code.match(/&\s+node\b/g) || [];
    same(nodeCalls.length, 1, 'one unwrapped node call');
    const planFn = /function Get-IgPlan \{[\s\S]*?\n\}/.exec(code);
    check(planFn && /'--plan-only'/.test(planFn[0]) && /&\s+node\b/.test(planFn[0]), 'and it is the plan-only call');
    check(/Set-Location -LiteralPath \$repoRoot/.test(code), 'per-task commands run from the repository root');
  });

add('test-only-cannot-leak', 'pure', 'a test-only guard can never reach a generation manifest or command', async function () {
  const manifest = M.buildManifest('IG-S01', 'provisional-r1');
  check(!C.hasKeyDeep(manifest, 'testOnly'), 'no test-only key in the manifest');
  same(manifest.guards, C.GUARDS, 'the manifest carries the production guards');
  const leaky = JSON.parse(JSON.stringify(manifest));
  leaky.jobs[0].testOnly = { requestMs: 400 };
  throwsCode(function () { M.validateManifest(leaky); }, 'test-only-leak', 'a test-only key');
  const short = JSON.parse(JSON.stringify(manifest));
  short.guards.requestMs = 400;
  throwsCode(function () { M.validateManifest(short); }, 'test-only-leak', 'shortened guards');
  throwsCode(function () {
    new H.Host({ repoRoot: REPO, runtimeFingerprint: null, guards: Object.assign({}, C.GUARDS, { requestMs: 400 }) });
  }, 'guard-override-forbidden', 'a production host with a short guard');
  throwsCode(function () {
    new H.Host({ repoRoot: REPO, runtimeFingerprint: null, deadlineMs: 400000 });
  }, 'guard-override-forbidden', 'a production host with a longer deadline');
  const host = new H.Host({ repoRoot: REPO, runtimeFingerprint: null });
  await rejectsCode(function () { return host.runRequest({ key: 'k', kind: 'selftest-busy' }); }, 'test-only-leak',
    'a synthetic job on a production host');
  throwsCode(function () { RUN.parseArgs(['--task=IG-S01', '--round=provisional-r1', '--shard=s', '--test-only']); },
    'args', 'the command line has no test-only switch');
  throwsCode(function () { RUN.parseArgs(['--task=IG-S01', '--round=provisional-r1', '--shard=s',
    '--request-guard-ms=5']); }, 'args', 'the command line has no guard override');
  check(host.testOnly === false && host.guards.requestMs === 180000, 'production guards: 180 s request');
  same([C.GUARDS.commandMs, C.GUARDS.sampleMs, C.GUARDS.jigsawMs], [270000, 45000, 240000], 'command and sample guards');
});

add('harness-text-format', 'pure', 'every harness file is CRLF, UTF-8 without BOM, no trailing space, final newline',
  function () {
    const folders = [C.HARNESS_DIR, path.join(C.HARNESS_DIR, 'adapters'), path.join(C.HARNESS_DIR, 'plans')];
    let seen = 0;
    folders.forEach(function (folder) {
      if (!fs.existsSync(folder)) return;
      fs.readdirSync(folder).forEach(function (name) {
        const full = path.join(folder, name);
        if (!/\.(cjs|ps1|md|json)$/.test(name) || !fs.statSync(full).isFile()) return;
        seen++;
        const bytes = fs.readFileSync(full);
        check(!(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf), name + ' has a BOM');
        const text = bytes.toString('utf8');
        check(!/[^\r]\n|^\n/.test(text), name + ' has a bare LF');
        check(!/\r(?!\n)/.test(text), name + ' has a bare CR');
        check(!/[ \t]+\r\n/.test(text) && !/[ \t]+$/.test(text), name + ' has trailing whitespace');
        check(text.endsWith('\r\n') && !text.endsWith('\r\n\r\n'), name + ' needs exactly one final newline');
      });
    });
    check(seen >= 9, 'the harness files were found: ' + seen);
    same(C.normaliseText('a \nb\t\n\n\n'), 'a\r\nb\r\n', 'the emitter normalises');
    same(C.normaliseText('\uFEFFx\r\ny'), 'x\r\ny\r\n', 'and drops a BOM');
    check(R.renderSummaryMarkdown(R.buildSummary({
      command: RUN.assembleCommand({ task: 'IG-S01', shard: 's', round: 'provisional-r1', attemptId: 'a1',
        status: 'complete', plannedKeys: [], records: [], lock: null, timing: null }), records: [] }))
      .indexOf('PROVISIONAL (pre-freeze)') >= 0, 'every provisional summary says so');
  });

add('descriptive-statistics', 'pure', 'nearest-rank percentiles, the upper median and n', function () {
  const v = [5, 1, 4, 2, 3, 6, 10, 9, 8, 7];
  same([R.percentileNearestRank(v, 0.5), R.percentileNearestRank(v, 0.95), R.percentileNearestRank(v, 1)], [5, 10, 10],
    'p50, p95, max');
  same([R.upperMedian([1, 2, 3, 4]), R.upperMedian([1, 2, 3]), R.upperMedian([])], [3, 2, null], 'upper median');
  same(R.percentileNearestRank([], 0.5), null, 'empty');
  const d = R.describe([1, null, NaN, 3, undefined, 2]);
  same([d.n, d.p50, d.max], [3, 2, 3], 'only finite values count');
  check(d.note && d.note.indexOf('observed maximum') >= 0, 'small n says p95 is the maximum');
});

add('firewall-detects-changes', 'pure', 'the production firewall inventory finds a changed, added or removed file', function () {
  const root = path.join(path.parse(REPO).root, 'ig-virtual-firewall');
  const make = function () {
    return L.memoryIo(root, {
      'core/js/a.js': 'aaa', 'generator/js/b.js': 'bbb', 'README.md': 'r', 'docs/difficulty-v3/x.md': 'doc',
      'docs/improve-generating/plan.md': 'plan', 'docs/improve-generating/evidence/phase0/e.json': 'ev',
      'generator/tests/artifacts/improve-generating/phase0/z.cjs': 'zz'
    });
  };
  const io = make();
  const before = L.takeFirewall({ repoRoot: root, io: io });
  const keys = Array.from(before.entries.keys()).sort();
  same(keys, ['README.md', 'core/js/a.js', 'docs/difficulty-v3/x.md', 'docs/improve-generating/plan.md',
    'generator/js/b.js'], 'the harness and evidence folders are outside the inventory');
  same(before.entries.get('docs/difficulty-v3/x.md').sha256, null, 'the large docs tree is size and mtime only');
  check(before.entries.get('docs/improve-generating/plan.md').sha256 !== null, 'the pack documents are hashed');
  check(HEX64.test(before.snapshot.treeDigest), 'a tree digest');
  check(L.diffFirewall(before, L.takeFirewall({ repoRoot: root, io: io })).clean, 'unchanged is clean');
  const abs = function (rel) { return path.resolve(root, rel); };
  io.files.set(abs('docs/improve-generating/evidence/phase0/e.json'), Buffer.from('other'));
  io.files.set(abs('generator/tests/artifacts/improve-generating/phase0/z.cjs'), Buffer.from('other'));
  check(L.diffFirewall(before, L.takeFirewall({ repoRoot: root, io: io })).clean, 'the writable folders may change');
  io.files.set(abs('core/js/a.js'), Buffer.from('bbb'));
  io.files.set(abs('docs/improve-generating/plan.md'), Buffer.from('plaz'));
  io.files.set(abs('docs/difficulty-v3/x.md'), Buffer.from('doc2'));
  io.files.set(abs('core/js/new.js'), Buffer.from('n'));
  io.files.delete(abs('README.md'));
  const diff = L.diffFirewall(before, L.takeFirewall({ repoRoot: root, io: io }));
  same([diff.clean, diff.changed.sort(), diff.added, diff.removed], [false, ['core/js/a.js',
    'docs/difficulty-v3/x.md', 'docs/improve-generating/plan.md'], ['core/js/new.js'], ['README.md']], 'the diff');
});

add('normalised-digest-includes-structure', 'pure', 'a result digest covers the variant structure, not only the givens',
  function () {
    const wire = function (over) {
      return Object.assign({
        v: 1,
        model: { variantId: 'x', cellCount: 4, digits: 2, units: [[0, 1], [2, 3]], cages: [], inequalities: [],
          layout: { rows: 2, cols: 2 }, symbols: { mode: 'digits', labels: ['1', '2'] }, fixedCells: null },
        givens: Int32Array.from([1, 0, 0, 2]), solution: Int32Array.from([1, 2, 1, 2]),
        rating: { level: 'easy', score: 5, solved: true }, exact: true, seed: 1, config: { difficulty: 'easy' },
        attempts: 1, warnings: [], digLog: [{ op: 'accept' }], work: [{ ratings: 1 }], timings: { dig: 1.5 }
      }, over || {});
    };
    const base = R.normaliseWire(wire());
    same(R.normaliseWire(wire({ givens: [1, 0, 0, 2], solution: [1, 2, 1, 2] })).digests.all, base.digests.all,
      'typed arrays and arrays are the same data');
    same(R.normaliseWire(wire({ timings: { dig: 99 } })).digests.all, base.digests.all, 'timings are not hashed');
    same(R.normaliseWire(wire({ digLog: undefined })).digests.log, R.normaliseWire(wire({ digLog: null })).digests.log,
      'an absent log is null');
    const other = wire();
    other.model = Object.assign({}, other.model, { units: [[0, 2], [1, 3]] });
    const changed = R.normaliseWire(other);
    check(changed.digests.givens === base.digests.givens && changed.digests.solution === base.digests.solution,
      'same givens and solution');
    check(changed.digests.all !== base.digests.all && changed.digests.puzzle !== base.digests.puzzle,
      'but another structure is another digest');
    const cmp = R.compareDigests(base.digests, changed.digests);
    check(!cmp.equal && cmp.differing.indexOf('structure') >= 0 && cmp.differing.indexOf('givens') < 0,
      'the comparison names the differing section');
    check(!R.compareDigests(base.digests, R.normaliseWire(wire({ exact: false })).digests).equal, 'exactness counts');
    check(!R.compareDigests(base.digests, R.normaliseWire(wire({ rating: { level: 'easy', score: 6,
      solved: true } })).digests).equal, 'the canonical rating counts');
    check(HEX64.test(base.digests.all), 'a sha-256');
  });

add('record-schema-unknown-is-null', 'pure', 'a record has every field, unknown is null and never zero', function () {
  const rec = R.blankRecord({ key: 'k' });
  same(R.checkRecord(rec), [], 'a blank record is well formed');
  R.RECORD_FIELDS.forEach(function (f) { check(f in rec, 'field ' + f); });
  check(rec.counts.floorTests === null && rec.counts.verificationSolves === null, 'counters are null');
  check(rec.generation.cpuTotalMs === null && rec.validation.unique === null, 'nested unknowns are null');
  check(rec.claimedExact === null && rec.verifiedExact === null && rec.outcome === 'unstarted', 'identity unknown');
  const problems = function (over) { return R.checkRecord(R.blankRecord(Object.assign({ key: 'k' }, over))); };
  check(problems({ generation: { cpuTotalMs: NaN } }).length > 0, 'NaN is rejected');
  check(problems({ generation: { cpuTotalMs: Infinity } }).length > 0, 'infinity is rejected');
  check(problems({ outcome: 'request-timeout' }).length > 0, 'a timeout needs its scope');
  check(problems({ outcome: 'request-timeout', timeoutScope: 'request' }).length === 0, 'with a scope it is fine');
  check(problems({ outcome: 'complete', timeoutScope: 'request' }).length > 0, 'a scope without a timeout');
  check(problems({ outcome: 'weird' }).length > 0, 'an unknown outcome');
  const broken = R.blankRecord({ key: 'k' });
  delete broken.counts;
  check(R.checkRecord(broken).length > 0, 'a missing block');
  const base = R.recordBase({ key: 'p/native', pairId: 'p', arm: 'reference', variantId: 'native', level: 'hard' });
  same([base.pairId, base.arm, base.variantId, base.level, base.requestSeed], ['p', 'reference', 'native', 'hard', null],
    'identity from the job, the rest unknown');
});

add('ledger-charges-and-shard-status', 'pure', 'machine charges and shard states come from durable evidence', function () {
  const ledger = { entries: [
    { task: 'IG-S01', chargedMs: 50000, commandJson: 'IG-S01/loader-parity/command.json' },
    { task: 'IG-S01', chargedMs: 345000, commandJson: null }
  ] };
  const evidence = [
    { rel: 'IG-S01/loader-parity/command.json', command: { task: 'IG-S01', timing: { occupiedMs: 5000 } } },
    { rel: 'IG-S01/self-test/command.json', command: { task: 'IG-S01', timing: { occupiedMs: 3000,
      chargedGraceMs: 45000 } } },
    { rel: 'IG-S01/broken/command.json', command: null }
  ];
  const charges = R.collectCharges(ledger, evidence);
  same(charges.reduce(function (s, c) { return s + c.chargedMs; }, 0), 50000 + 345000 + 48000,
    'a hard timeout charges 300 s plus grace, a direct launch occupied plus grace, nothing twice');

  const root = scratchDir('shards');
  const write = function (dir, command) { C.writeJsonAtomic(REPO, path.join(dir, 'command.json'), command); };
  const shard = { shard: 'loader-parity', kind: 'pipeline', jobKeys: ['k1', 'k2', 'k3'] };
  const dir = path.join(root, 'IG-S01', 'loader-parity');
  same(R.shardStatus(dir, shard).status, 'not-run', 'nothing recorded');
  fs.mkdirSync(dir, { recursive: true });
  write(dir, pausedCommand({ completedKeys: ['k1'], unstartedKeys: ['k2', 'k3'] }));
  const paused = R.shardStatus(dir, shard);
  same([paused.status, paused.unstartedKeys], ['paused', ['k2', 'k3']], 'a pause leaves unstarted keys');
  const a2 = path.join(dir, 'a2');
  fs.mkdirSync(a2);
  write(a2, pausedCommand({ attemptId: 'a2', status: 'complete', completedKeys: ['k2', 'k3'], unstartedKeys: [],
    resumeOf: { attemptId: 'a1' } }));
  same(R.shardStatus(dir, shard).status, 'recorded', 'a later attempt completes it');
  same(R.listAttempts(dir).map(function (a) { return a.attemptId; }), ['a1', 'a2'], 'attempts in order');
  const crashed = path.join(root, 'IG-S01', 'crashed');
  fs.mkdirSync(crashed, { recursive: true });
  C.appendJsonl(REPO, path.join(crashed, 'journal.jsonl'), { seq: 1, type: 'command-start' });
  same(R.shardStatus(crashed, shard).status, 'failed', 'a journal without command.json is a crashed attempt');
  const bad = path.join(root, 'IG-S01', 'bad');
  fs.mkdirSync(bad, { recursive: true });
  write(bad, pausedCommand({ status: 'parity-failed', completedKeys: ['k1', 'k2', 'k3'], unstartedKeys: [] }));
  same(R.shardStatus(bad, shard).status, 'failed', 'a failed attempt is not recorded');
  const synthetic = { shard: 'self-test', kind: 'synthetic', jobKeys: [] };
  const st = path.join(root, 'IG-S01', 'self-test');
  fs.mkdirSync(st, { recursive: true });
  write(st, pausedCommand({ status: 'complete', selfTestPassed: true, unstartedKeys: [] }));
  same(R.shardStatus(st, synthetic).status, 'recorded', 'a passed self-test shard is recorded, not rerun');
});

add('plan-only-loads-no-engine', 'pure', '-PlanOnly expands the exact keys without loading an engine', function () {
  const plan = RUN.planOnly({ task: 'IG-S01', round: 'provisional-r1', runtimeLabel: null, freezeReceipt: null,
    budgetReceipt: null }, REPO);
  check(globalThis.SG === undefined, 'no engine in this process');
  check(plan.mode.indexOf('no engine') >= 0 && plan.evidenceStatus === 'provisional (pre-freeze)', 'labelled');
  same(plan.gate.state, 'not-evaluable-pre-freeze', 'provisional gate');
  const parity = plan.shards.filter(function (s) { return s.shard === 'loader-parity'; })[0];
  same(parity.keys, [
    'IG-S01/loader-parity/classic4:veryEasy:1/native', 'IG-S01/loader-parity/classic4:veryEasy:1/noop-expose',
    'IG-S01/loader-parity/classic9:hard:1/noop-expose', 'IG-S01/loader-parity/classic9:hard:1/native'
  ], 'the fixed controls, reference first on the even index, prototype first on the odd one');
  same(plan.shards[0].kind, 'synthetic', 'the synthetic shard is separate');
  check(HEX64.test(plan.runtimeFingerprint) && plan.runtimeFiles.length > 30, 'source identity');
  check(plan.projectedMachineMs > 0 || plan.shards.every(function (s) { return s.status === 'recorded'; }),
    'a projected cost');
  same(plan.pairOrder.map(function (p) { return p.order[0]; }), ['reference', 'prototype'], 'alternating pair order');
});

// --- worker cases (full run only, through the wrapper) ----------------------------------------------------------

const shared = { cpu: null, fingerprint: null };

function testHost(guardOverrides, deadlineMs, fingerprint) {
  const host = new H.Host({ repoRoot: REPO, runtimeFingerprint: fingerprint === undefined ? shared.fingerprint :
    fingerprint, testOnly: true, guards: Object.assign({}, C.GUARDS, guardOverrides || {}),
  deadlineMs: deadlineMs || 60000, processAgeMs: 0 });
  if (shared.cpu) host.cpu = shared.cpu;
  return host;
}

add('busy-worker-request-timeout', 'worker', 'a busy synthetic worker is terminated by a short test-only request timer',
  async function () {
    const host = testHost({ requestMs: 300 });
    const ticks = [];
    const scheduled = host.clock();
    setTimeout(function () { ticks.push(host.clock() - scheduled); }, 100);
    const obs = await host.runRequest({ key: 'selftest/busy', kind: 'selftest-busy', noEngine: true, request: {} });
    const g = obs.generation;
    const q = host.cpu.quantumMs === null ? 16 : host.cpu.quantumMs;
    check(obs.outcome === 'request-timeout' && obs.timeoutScope === 'request', 'a timeout with its scope');
    check(obs.wire === null && obs.error.code === 'timeout', 'an interrupted worker sends no fake result');
    check(g.coldWallMs >= 290 && g.coldWallMs < 300 + 1500, 'the wall is near the guard: ' + g.coldWallMs);
    check(host.workers.size === 0, 'the owned worker is terminated');
    check(ticks.length === 1 && ticks[0] < 200, 'the host stayed responsive: ' + ticks.join());
    check(g.cpuToDecisionMs >= 0.3 * g.coldWallMs - q, 'CPU to the timeout is recorded: ' + g.cpuToDecisionMs);
    check(g.cpuTotalMs >= g.cpuToDecisionMs, 'cleanup and speculative CPU are not dropped');
    check(g.cpuTotalMs <= 1.5 * g.occupiedWallMs + 3 * q, 'process-wide CPU is not counted twice: ' + g.cpuTotalMs +
      ' of ' + g.occupiedWallMs + ' ms wall');
    check(g.cleanupMs >= 0 && g.occupiedWallMs >= g.coldWallMs - 1e-6, 'cleanup follows the decision');
    const rec = R.blankRecord({ key: 'selftest/busy', outcome: obs.outcome, timeoutScope: obs.timeoutScope,
      generation: g });
    same(R.checkRecord(rec), [], 'the timeout is a well-formed record');
    check(rec.verifiedExact === null && rec.claimedExact === null, 'a timeout is never a hit');
    return { coldWallMs: g.coldWallMs, cpuToDecisionMs: g.cpuToDecisionMs, cpuTotalMs: g.cpuTotalMs,
      cleanupMs: g.cleanupMs, quantumMs: host.cpu.quantumMs, tickMs: ticks[0] };
  });

add('busy-worker-command-timeout', 'worker', 'the command deadline also terminates a busy worker', async function () {
  const host = testHost({ requestMs: 5000 }, C.GUARDS.finalizeReserveMs + 450);
  const obs = await host.runRequest({ key: 'selftest/busy-command', kind: 'selftest-busy', noEngine: true,
    request: {} });
  check(obs.outcome === 'request-timeout' && obs.timeoutScope === 'command', 'a command-scope timeout');
  check(obs.wire === null && host.workers.size === 0, 'no result, worker terminated');
  check(host.expired() && !host.canAdmit(10), 'the command window is closed afterwards');
  check(obs.generation.cpuTotalMs >= obs.generation.cpuToDecisionMs, 'its CPU is recorded too');
  return { coldWallMs: obs.generation.coldWallMs };
});

add('real-worker-cold-ready-intervals', 'worker', 'a real worker separates startup from the ready interval', async function () {
  const host = testHost({});
  const obs = await host.runRequest({ key: 'selftest/echo', kind: 'selftest-echo', noEngine: true, request: {},
    spinMs: 60 });
  const g = obs.generation;
  check(obs.outcome === 'complete', 'the echo job completes');
  check(g.readyWallMs >= 55 && g.startupMs > 0, 'ready ' + g.readyWallMs + ' ms, startup ' + g.startupMs + ' ms');
  near(g.coldWallMs, g.startupMs + g.readyWallMs, 1e-6, 'cold = startup + ready');
  near(g.cpuTotalMs, g.startupCpuMs + g.cpuReadyTotalMs, 1e-6, 'total CPU = startup + ready-only');
  check(g.cpuReadyTotalMs <= g.cpuTotalMs && g.occupiedWallMs >= g.coldWallMs, 'ready-only is inside the total');
  check(g.gridBuildWallMs === null && g.gridBuildCpuMs === null, 'no grid build here: null, not zero');
  check(g.cpuApi.indexOf('process.cpuUsage') >= 0, 'the CPU API is named');
  return { readyWallMs: g.readyWallMs, startupMs: g.startupMs, cleanupMs: g.cleanupMs };
});

add('worker-fails-closed', 'worker', 'a source change, an unknown adapter or an engine error fails closed', async function () {
  const changed = await testHost({ requestMs: 20000 }, 60000, 'f'.repeat(64)).runRequest({ key: 'selftest/changed',
    request: { variantId: 'classic4', difficulty: 'veryEasy', seed: 1, trace: 'off' }, adapterIds: [] });
  check(changed.outcome === 'error' && changed.fatal === 'source-changed' && changed.wire === null,
    'a worker refuses sources that differ from the host fingerprint');
  const unknown = await testHost({ requestMs: 20000 }).runRequest({ key: 'selftest/adapter',
    request: { variantId: 'classic4', difficulty: 'veryEasy', seed: 1, trace: 'off' },
    adapterIds: ['definitely-missing'] });
  check(unknown.outcome === 'error' && unknown.fatal === 'adapter-unknown', 'an unknown adapter is fatal');
  same(C.exitCodeOf(new HarnessError(unknown.fatal, 'x')), 2, 'and stops as unsupported');
  const thrown = await testHost({}).runRequest({ key: 'selftest/throw', kind: 'selftest-throw', noEngine: true,
    request: {} });
  check(thrown.outcome === 'error' && thrown.fatal === null && thrown.error.code === 'selftest',
    'an engine error is an error record, not a hit and not a stop');
});

add('engine-loads-and-discovers-catalogue', 'worker', 'native and no-op instances load, prove their hooks and discover the catalogue',
  async function () {
    const host = testHost({ requestMs: 30000 });
    const native = await host.runRequest({ key: 'selftest/engine-native', kind: 'selftest-echo', request: {},
      wantCatalogue: true });
    check(native.outcome === 'complete', 'the native instance loads: ' + JSON.stringify(native.error));
    const r = native.ready;
    same(r.runtimeFingerprint, shared.fingerprint, 'the worker verified the host fingerprint');
    check(r.proof.hooksPresent === false && r.transforms.length === 0, 'a native instance has no hook');
    const snap = r.catalogue.snapshot;
    check(HEX64.test(r.catalogue.fingerprint) && Number.isInteger(snap.ratingVersion), 'a catalogue fingerprint');
    const ids = snap.variants.map(function (v) { return v.id; });
    check(ids.indexOf('classic4') >= 0 && ids.indexOf('classic9') >= 0, 'variants are discovered: ' + ids.join());
    check(Array.isArray(snap.floors.classic9.hard.floor) && snap.levels.indexOf('hard') >= 0, 'floors and levels');
    check(snap.techniques.length > 0 && snap.defaults.pipelineDefaultMaxAttempts >= 1, 'techniques and defaults');
    const noop = await host.runRequest({ key: 'selftest/engine-noop', kind: 'selftest-echo', request: {},
      adapterIds: ['noop-expose'] });
    check(noop.outcome === 'complete', 'the no-op instance loads: ' + JSON.stringify(noop.error));
    const p = noop.ready.proof;
    check(p.hooksPresent === true && p.exposed.indexOf('normalizeConfig') >= 0 && p.normalizeConfigEqual === true,
      'the no-op hook is present and equals the public function: ' + JSON.stringify(p));
    same(noop.ready.transforms.length, 1, 'one transform applied');
    same(noop.ready.patchedFiles.map(function (f) { return f.rel; }), ['js/engine/pipeline.js'], 'one patched file');
    same(noop.ready.adapterHashes, [C.digestOf(L.NOOP_EXPOSE)], 'the adapter hash');
    check(noop.ready.patchedFiles[0].beforeHash !== noop.ready.patchedFiles[0].afterHash, 'before and after differ');
    return { nativeLoadMs: r.loadMs, noopLoadMs: noop.ready.loadMs, catalogueFingerprint: r.catalogue.fingerprint,
      ratingVersion: snap.ratingVersion, levels: snap.levels, variants: ids.length, techniques: snap.techniques.length,
      defaults: snap.defaults };
  });

add('verifier-audits-a-handmade-puzzle', 'worker', 'the independent verifier accepts a valid puzzle and rejects tampered ones',
  async function () {
    const host = testHost({ requestMs: 30000 });
    const made = await host.runRequest({ key: 'selftest/handmade', kind: 'selftest-handmade-wire', request: {} });
    check(made.outcome === 'complete' && made.wire && made.wire.v === 1, 'a wire came back: ' +
      JSON.stringify(made.error));
    const good = await host.runValidation(made.wire, { level: 'veryEasy' });
    check(good.status === 'ok', 'the verifier answered: ' + JSON.stringify(good.error));
    const v = good.verdict;
    same([v.solutionValid, v.givensAgree, v.structureValid, v.unique, v.canonicalEqual, v.requirednessAgree],
      [true, true, true, true, true, true], 'a valid puzzle passes every check ' + JSON.stringify(v.errors));
    same(RUN.validationStatus(v), 'verified', 'verified');
    check(v.fresh.solved === true && v.fresh.vacuous === true && v.fresh.level === 'veryEasy', 'fresh rating: ' +
      JSON.stringify(v.fresh));
    check(good.proof && good.proof.hooksPresent === false, 'the verifier is a native instance');
    check(good.wallMs > 0 && good.cpuMs >= 0, 'validation cost is reported on its own');
    const wrong = structuredClone(made.wire);
    wrong.givens[0] = wrong.solution[0] === 1 ? 2 : 1;
    const badGivens = await host.runValidation(wrong, { level: 'veryEasy' });
    check(badGivens.status === 'ok' && badGivens.verdict.givensAgree === false &&
      RUN.validationStatus(badGivens.verdict) === 'failed', 'a given that contradicts the solution is rejected');
    const open = structuredClone(made.wire);
    open.givens.fill(0);
    const notUnique = await host.runValidation(open, { level: 'veryEasy' });
    check(notUnique.status === 'ok' && notUnique.verdict.unique === false &&
      RUN.validationStatus(notUnique.verdict) === 'failed', 'a puzzle with several solutions is rejected');
    const alien = structuredClone(made.wire);
    alien.model.units = alien.model.units.slice(1);
    const badStructure = await host.runValidation(alien, { level: 'veryEasy' });
    check(RUN.validationStatus(badStructure.verdict || { structureValid: false }) === 'failed' ||
      badStructure.status !== 'ok', 'a changed structure is not verified');
    return { goodWallMs: good.wallMs, goodCpuMs: good.cpuMs, cpuStatus: good.cpuResolutionStatus };
  });

// --- run --------------------------------------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { task: null, round: null, attempt: 'a1', only: 'all' };
  argv.forEach(function (arg) {
    const m = /^--(task|round|attempt|only)=(.*)$/.exec(arg);
    if (!m) throw new HarnessError('args', 'unknown argument ' + arg);
    opts[m[1]] = m[2];
  });
  if (opts.task !== 'IG-S01') throw new HarnessError('args', 'self-test.cjs belongs to --task=IG-S01');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(opts.round || '')) throw new HarnessError('args', 'missing or bad --round');
  if (['all', 'pure'].indexOf(opts.only) < 0) throw new HarnessError('args', '--only is all or pure');
  return opts;
}

async function runCases(list) {
  const results = [];
  for (const c of list) {
    const started = C.nowMs();
    let ok = true;
    let detail = null;
    try {
      detail = (await c.fn()) || null;
    } catch (err) {
      ok = false;
      detail = { error: String(err && err.message ? err.message : err) };
    }
    const ms = C.nowMs() - started;
    results.push({ id: c.id, group: c.group, title: c.title, ok: ok, ms: Math.round(ms * 10) / 10, detail: detail });
    process.stdout.write((ok ? 'ok   ' : 'FAIL ') + c.id + ' (' + Math.round(ms) + ' ms)' +
      (ok ? '' : ' ' + detail.error) + '\n');
  }
  return results;
}

async function main(argv) {
  const opts = parseArgs(argv);
  if (opts.only === 'pure') {
    fs.rmSync(SCRATCH, { recursive: true, force: true });
    const results = await runCases(cases.filter(function (c) { return c.group === 'pure'; }));
    fs.rmSync(SCRATCH, { recursive: true, force: true });
    const failed = results.filter(function (r) { return !r.ok; }).length;
    process.stdout.write('pure cases: ' + (results.length - failed) + ' passed, ' + failed + ' failed\n');
    return failed === 0 ? 0 : 1;
  }

  const processStartedAt = new Date(performance.timeOrigin).toISOString();
  const expectedTask = opts.task + '/self-test';
  const lock = RUN.observeLock(expectedTask);
  RUN.assertLockOwned(lock, expectedTask);
  const evidenceRoot = RUN.evidenceRootOf(REPO);
  const roundDir = path.join(evidenceRoot, opts.round);
  const shardDir = R.shardDirOf(evidenceRoot, opts.round, opts.task, 'self-test');
  const att = R.openAttempt(REPO, shardDir, opts.attempt);
  const before = L.loadSourceSet({ repoRoot: REPO });
  const harness = C.harnessFingerprint();
  const manifest = M.buildManifest(opts.task, opts.round);
  const fwBefore = L.takeFirewall({ repoRoot: REPO });
  const calibration = new H.Host({ repoRoot: REPO, runtimeFingerprint: before.fingerprint });
  calibration.calibrate();
  shared.cpu = calibration.cpu;
  shared.fingerprint = before.fingerprint;
  const loadPlans = [{ adapterIds: ['noop-expose'],
    plan: L.describePlan(L.buildLoadPlan(before, [L.NOOP_EXPOSE])) }];
  C.writeJsonAtomic(REPO, att.files.sourceManifest, { schema: C.SCHEMA, evidenceStatus: manifest.evidenceStatus,
    source: L.describeSourceSet(before), harness: harness, loadPlans: loadPlans });
  C.writeJsonAtomic(REPO, att.files.firewallBefore, fwBefore.snapshot);

  fs.rmSync(SCRATCH, { recursive: true, force: true });
  const results = await runCases(cases);
  fs.rmSync(SCRATCH, { recursive: true, force: true });

  const after = L.loadSourceSet({ repoRoot: REPO });
  const stable = L.compareSourceSets(before, after);
  const harnessAfter = C.harnessFingerprint();
  const fwAfter = L.takeFirewall({ repoRoot: REPO });
  const fwDiff = L.diffFirewall(fwBefore, fwAfter);
  await calibration.terminateAll();

  const allOk = results.every(function (r) { return r.ok; });
  const sourceStable = stable.stable && harness.fingerprint === harnessAfter.fingerprint;
  let status = 'complete';
  if (!sourceStable) status = 'source-changed';
  else if (!fwDiff.clean) status = 'firewall-violation';
  else if (!allOk) status = 'error';
  const keys = results.map(function (r) { return opts.task + '/self-test/' + r.id; });
  const records = results.map(function (r, i) {
    return R.blankRecord({ key: keys[i], recordKind: 'synthetic', mode: r.group, outcome: r.ok ? 'complete' : 'error',
      error: r.ok ? null : { code: 'selftest-failed', name: null, message: r.detail.error },
      title: r.title, durationMs: r.ms, detail: r.ok ? r.detail : null });
  });
  const ledger = RUN.readLedger(roundDir);
  const budget = M.budgetState({ task: opts.task, round: opts.round, approvals: ledger.approvals,
    charges: R.collectCharges(ledger, R.scanRoundCommands(roundDir)) });
  const gate = R.evaluateGate({ round: opts.round, runtimeFingerprint: before.fingerprint });
  const command = RUN.assembleCommand({
    task: opts.task, shard: 'self-test', round: opts.round, attemptId: opts.attempt, status: status,
    runtimeLabel: RUN.DEFAULT_RUNTIME_LABEL, runtimeFingerprint: before.fingerprint,
    runtimeFiles: L.describeSourceSet(before).files, sourceStable: sourceStable,
    harnessFingerprint: harness.fingerprint, adapterIds: ['noop-expose'],
    adapterHashes: [C.digestOf(L.NOOP_EXPOSE)], catalogue: null, manifestHash: manifest.manifestHash,
    pairOrder: manifest.pairOrder, plannedKeys: keys, records: records, startedUnfinished: [],
    logicalBlockKeys: [], physicalPlanHash: null, physicalPlan: null, guards: C.GUARDS,
    lock: { wrapperPath: null, ownerText: 'IG ' + expectedTask, expectedTask: expectedTask, observed: lock },
    timing: RUN.timingOf(processStartedAt, null), error: null,
    budgetLedgerReference: { ledger: C.toPosix(path.relative(REPO, path.join(roundDir, 'ledger.json'))),
      stateBefore: budget },
    gate: gate, cpu: Object.assign({}, calibration.cpu, { commandCpuMs: calibration.commandCpuMs() }),
    firewallClean: fwDiff.clean, firewallDiff: { added: fwDiff.added, removed: fwDiff.removed,
      changed: fwDiff.changed }, selfTestPassed: allOk && status === 'complete',
    notes: ['synthetic cases only: no puzzle generated, no speed measured', 'the short busy-worker timers are '
      + 'test-only and appear in no generation manifest']
  });
  const summary = R.buildSummary({ command: command, records: records,
    estimateVerdict: 'not applicable: IG-S01 is infrastructure only and confirms no speed estimate',
    exclusions: ['synthetic cases, not timing observations'],
    extra: { cases: results.map(function (r) { return { id: r.id, group: r.group, ok: r.ok, ms: r.ms,
      detail: r.detail }; }), cpuProbe: calibration.cpu.probe } });
  RUN.writeFinalEvidence(REPO, att, { recordsDoc: { schema: C.SCHEMA, task: opts.task, shard: 'self-test',
    round: opts.round, attemptId: opts.attempt, evidenceStatus: command.evidenceStatus,
    manifestHash: manifest.manifestHash, records: records }, firewallAfter: Object.assign({}, fwAfter.snapshot, {
    diff: { clean: fwDiff.clean, added: fwDiff.added, removed: fwDiff.removed, changed: fwDiff.changed } }),
  command: command, summary: summary });
  process.stdout.write('self-test ' + status + ': ' + results.filter(function (r) { return r.ok; }).length + '/' +
    results.length + ' cases passed; evidence ' + C.toPosix(path.relative(REPO, att.dir)) + '\n');
  return command.exit;
}

module.exports = { cases: cases };

if (require.main === module) {
  const finish = function (code) {
    process.exitCode = code;
    process.stdout.write('', function () { process.exit(code); });
  };
  main(process.argv.slice(2)).then(finish, function (err) {
    process.stderr.write('IG self-test error [' + (err && err.code ? err.code : 'unexpected') + ']: ' +
      (err && err.stack ? err.stack : String(err)) + '\n');
    finish(C.exitCodeOf(err));
  });
}
