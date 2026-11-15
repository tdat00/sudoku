'use strict';

/*
 * Smoke-only report writer (pure: reads the archive folder of the smoke and writes smoke-report.json and
 * smoke-report.md beside it; no engine, no generation, no timing). It distinguishes textual applicability (private
 * transforms applied to the source text), engine-free pure tests, runtime canaries (the existing self-test and the
 * loader-parity rows) and semantic parity, which this smoke does not test.
 *
 *   node smoke-report.cjs --archive=<abs folder> --round=<round> --target-commit=<sha>
 */
const fs = require('fs');
const path = require('path');
const S = require('./smoke-lib.cjs');

const TASKS = ['IG-S01', 'IG-S02', 'IG-S03', 'IG-S04', 'IG-S05', 'IG-S06', 'IG-S07', 'IG-S08', 'IG-S09', 'IG-S10'];
const TEST_TASK = {
  'ig07-test.pure': 'IG-S07', 'ig09-test.pure': 'IG-S09', 'ig08-test.pure': 'IG-S08', 'scoped-test.pure': 'IG-S03',
  'frontier-test.pure': 'IG-S04', 'pool-test.pure': 'IG-S02', 'ig05-test.pure': 'IG-S05',
  'killer-audit-test.pure': 'IG-S02 (Killer re-audit)', 'ig10-test.gate': 'IG-S10'
};

const opts = S.parseArgs(process.argv.slice(2), ['archive', 'round', 'target-commit']);
const archive = opts.archive;

function readJson(rel) {
  const file = path.join(archive, rel);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch (err) {
    return { __error: err.message };
  }
}

function readText(rel) {
  const file = path.join(archive, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function cell(value) {
  if (value === null || value === undefined) return '-';
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function table(headers, rows) {
  const lines = ['| ' + headers.join(' | ') + ' |', '| ' + headers.map(function () { return '---'; }).join(' | ') + ' |'];
  rows.forEach(function (r) { lines.push('| ' + r.map(cell).join(' | ') + ' |'); });
  return lines;
}

function short(hash, n) {
  return hash ? String(hash).slice(0, n || 12) : null;
}

const ledger = readJson('ledger.json');
const pre = readJson('preflight.json');
const post = readJson('postflight.json');
const inv = readJson('smoke/smoke-inventory/supervisor.json');
const stSup = readJson('smoke/self-test/supervisor.json');
const lpSup = readJson('smoke/loader-parity/supervisor.json');
const stCmd = readJson('IG-S01/self-test/command.json');
const lpCmd = readJson('IG-S01/loader-parity/command.json');
const lpRecords = readJson('IG-S01/loader-parity/records.json');

const invUnit = function (id) { return inv && Array.isArray(inv.units) ? inv.units.find(function (u) { return u.id === id; }) || null : null; };
const inspect = invUnit('inspect') && invUnit('inspect').parsed ? invUnit('inspect').parsed : null;
const analyze = invUnit('analyze') && invUnit('analyze').parsed ? invUnit('analyze').parsed : null;

// --- identity ---------------------------------------------------------------------------------------------------

const identity = {
  targetCommit: opts['target-commit'],
  smokeWorktree: pre ? pre.paths.smokeRoot : null,
  headAtStart: pre ? pre.git.smokeWorktreeBefore.head : null,
  headAtEnd: post ? post.git.smokeWorktreeAfter.head : null,
  referenceWorktreeHead: pre ? pre.git.referenceHead : null,
  rootBelongsToSmokeWorktree: inspect ? inspect.roots.belongsToSmokeWorktree : null,
  loadedFilesOutsideRoot: inspect ? inspect.roots.loadedFilesOutsideRoot : null,
  loadedFilesInForbiddenRoots: inspect ? inspect.roots.loadedFilesInForbiddenRoots : null,
  runtime: inspect ? { fingerprint: inspect.source.runtimeFingerprint, files: inspect.source.count,
    runnerSha256: inspect.source.runnerSha256 } : null,
  runtimeOfReferenceWorktree: inspect && inspect.reference && inspect.reference.runtime ? {
    fingerprint: inspect.reference.runtime.runtimeFingerprint, sameAsSmoke: inspect.reference.runtime.sameFingerprintAsSmoke,
    changedInSmoke: inspect.reference.runtime.changedInSmoke, addedInSmoke: inspect.reference.runtime.addedInSmoke,
    removedInSmoke: inspect.reference.runtime.removedInSmoke } : null,
  harness: inspect ? {
    dir: inspect.harness.dir, packFilesOnlyFingerprint: inspect.harness.harnessFingerprintPackFilesOnly,
    fingerprintWithSmokeFiles: inspect.harness.harnessFingerprintWithSmokeFiles, smokeFiles: inspect.harness.smokeFiles,
    referenceHarness: inspect.reference && inspect.reference.harness ? inspect.reference.harness : null } : null
};

// The runtime fingerprint of every child command against the inspection (the label is not source authority).
const labelCheck = {
  defaultRuntimeLabel: inspect ? inspect.constants.defaultRuntimeLabel : null,
  selfTestRecord: stCmd ? { runtimeLabel: stCmd.runtimeLabel, runtimeFingerprint: stCmd.runtimeFingerprint,
    harnessFingerprint: stCmd.harnessFingerprint, sourceStable: stCmd.sourceStable } : null,
  loaderParityRecord: lpCmd ? { runtimeLabel: lpCmd.runtimeLabel, runtimeFingerprint: lpCmd.runtimeFingerprint,
    harnessFingerprint: lpCmd.harnessFingerprint, sourceStable: lpCmd.sourceStable } : null
};
const smokeFp = identity.runtime ? identity.runtime.fingerprint : null;
const filesMatch = function (cmd) {
  if (!cmd || !Array.isArray(cmd.runtimeFiles) || !inspect) return null;
  const mine = new Map(inspect.source.files.map(function (f) { return [f.rel, f.sha256]; }));
  return cmd.runtimeFiles.length === mine.size && cmd.runtimeFiles.every(function (f) { return mine.get(f.rel) === f.sha256; });
};
const harnessFp = inspect ? inspect.harness.harnessFingerprintWithSmokeFiles : null;
labelCheck.selfTestFingerprintIsSmoke = stCmd ? stCmd.runtimeFingerprint === smokeFp : null;
labelCheck.loaderParityFingerprintIsSmoke = lpCmd ? lpCmd.runtimeFingerprint === smokeFp : null;
labelCheck.selfTestRuntimeFilesMatchInspection = filesMatch(stCmd);
labelCheck.loaderParityRuntimeFilesMatchInspection = filesMatch(lpCmd);
labelCheck.selfTestHarnessFingerprintIsInspected = stCmd ? stCmd.harnessFingerprint === harnessFp : null;
labelCheck.loaderParityHarnessFingerprintIsInspected = lpCmd ? lpCmd.harnessFingerprint === harnessFp : null;
labelCheck.explanation = 'self-test.cjs has no --runtime-label option and always records RUN.DEFAULT_RUNTIME_LABEL, ' +
  'a constant of run.cjs naming the older pack runtime (1c042ad / f7be90f); a stale human-readable label in an unchanged ' +
  'self-test record is not source authority. The identity of the loaded source is its runtimeFingerprint and the ' +
  'per-file SHA-256 of command.json.runtimeFiles, compared here with the inspection of the smoke worktree.';

// --- textual applicability -------------------------------------------------------------------------------------

const adapters = analyze ? analyze.adapters.map(function (a) {
  const usedBy = analyze.combos.filter(function (c) { return c.adapterIds.indexOf(a.id) >= 0; }).reduce(function (acc, c) {
    c.usedBy.forEach(function (t) { if (acc.indexOf(t) < 0) acc.push(t); });
    return acc;
  }, []).sort();
  return {
    id: a.id, source: a.source, hash: a.hash || null, usedByTasks: usedBy, loadError: a.loadError || null,
    transforms: a.transformCount, files: a.files,
    independentApplicable: a.independent ? a.independent.applicable : null,
    independentFailures: a.independent ? a.independent.rows.filter(function (r) { return !r.ok; }).map(function (r) {
      return { id: r.id, file: r.file, anchor: r.anchor, code: r.code, message: r.message }; }) : null,
    sequentialOk: a.sequential ? a.sequential.ok : null, sequentialApplied: a.sequential ? a.sequential.applied : null,
    firstFailure: a.sequential ? a.sequential.firstFailure : null,
    loaderAgreesWithReplica: a.sequential ? a.sequential.replicaAgreesWithLoader : null
  };
}) : null;

const combos = analyze ? analyze.combos.map(function (c) {
  return { adapterIds: c.adapterIds, usedBy: c.usedBy, origins: c.origins, native: c.native === true, ok: c.ok,
    applied: c.applied === undefined ? (c.authoritative ? c.authoritative.transforms : null) : c.applied,
    firstFailure: c.firstFailure || null };
}) : null;

const plans = analyze ? analyze.plans : null;
const perTask = TASKS.map(function (t) {
  const m = analyze ? analyze.manifests[t] : null;
  const plan = plans ? plans.find(function (p) { return p.task === t; }) : null;
  const taskCombos = combos ? combos.filter(function (c) { return c.usedBy.indexOf(t) >= 0 && !c.native; }) : [];
  const bad = taskCombos.filter(function (c) { return c.ok === false; });
  const testRow = Object.keys(TEST_TASK).filter(function (k) { return TEST_TASK[k].indexOf(t) === 0; });
  return {
    task: t,
    adapterCombos: m ? m.combos.map(function (c) { return c.length === 0 ? '(native)' : c.join('+'); }) : null,
    comboOrigin: m ? (m.built ? 'manifest' : 'static (manifest not buildable here)') : null,
    textual: taskCombos.length === 0 ? 'no adapter' : (bad.length === 0 ? 'applies' : 'DOES NOT APPLY'),
    firstFailing: bad.length > 0 ? bad[0].firstFailure : null,
    planOnly: plan ? (plan.ok ? 'ok' : plan.classification) : null,
    planOnlyDetail: plan && !plan.ok ? plan.error : null,
    shards: plan && plan.ok ? plan.shards.map(function (s) { return s.shard + ':' + s.keys; }).join(' ') : null,
    pureTests: testRow
  };
});

// --- pure tests ------------------------------------------------------------------------------------------------

const tests = inv ? inv.units.filter(function (u) { return u.kind === 'engine-free-test'; }).map(function (u) {
  const p = u.parsed || {};
  return { id: u.id, task: TEST_TASK[u.id] || null, status: u.status, reason: u.reason || null, exitCode: u.exitCode,
    wallMs: u.wallMs === undefined ? null : u.wallMs, okLines: p.okLines === undefined ? null : p.okLines,
    failLines: p.failLines === undefined ? null : p.failLines, summaryLine: p.summaryLine || null,
    firstFailure: p.firstFailure || null, failures: p.failures || [], termination: u.termination || null };
}) : [];

// --- canaries --------------------------------------------------------------------------------------------------

function parseCaseLines(text) {
  const rows = [];
  text.split(/\r?\n/).forEach(function (l) {
    let m = /^ok\s+(\S+)\s+\((\d+) ms\)/.exec(l);
    if (m) rows.push({ id: m[1], ok: true, ms: Number(m[2]) });
    m = /^FAIL\s+(\S+)\s*(.*)$/.exec(l);
    if (m) rows.push({ id: m[1], ok: false, error: m[2].slice(0, 300) });
  });
  return rows;
}

const stChild = stSup && stSup.units ? stSup.units[0] : null;
const stCases = parseCaseLines(readText('smoke/self-test/child.stdout.txt'));
const selfTest = {
  ran: stChild !== null, childStatus: stChild ? stChild.status : null, exitCode: stChild ? stChild.exitCode : null,
  wallMs: stChild ? stChild.wallMs : null, commandStatus: stCmd ? stCmd.status : null,
  selfTestPassed: stCmd ? stCmd.selfTestPassed : null, casesPassed: stCases.filter(function (c) { return c.ok; }).length,
  casesFailed: stCases.filter(function (c) { return !c.ok; }).length, cases: stCases,
  firewallClean: stCmd ? stCmd.firewallClean : null, sourceStable: stCmd ? stCmd.sourceStable : null,
  lockObserved: stCmd && stCmd.lock ? stCmd.lock.observed : null,
  engineCases: stCases.filter(function (c) { return /engine|verifier|worker/.test(c.id); }).map(function (c) { return c.id + ':' + (c.ok ? 'ok' : 'FAIL'); }),
  timing: stCmd ? stCmd.timing : null
};

const lpChild = lpSup && lpSup.units ? lpSup.units[0] : null;
const lpRows = lpRecords && Array.isArray(lpRecords.records) ? lpRecords.records.map(function (r) {
  return { key: r.key, outcome: r.outcome, claimedExact: r.claimedExact, verifiedExact: r.verifiedExact,
    puzzleHash: short(r.puzzleHash, 16), validation: r.validationDetail ? r.validationDetail.status : null,
    coldWallMs: r.generation ? r.generation.coldWallMs : null, error: r.error ? r.error.code || r.error.message : null };
}) : null;
const loaderParity = {
  ran: lpChild !== null, childStatus: lpChild ? lpChild.status : null, exitCode: lpChild ? lpChild.exitCode : null,
  wallMs: lpChild ? lpChild.wallMs : null, commandStatus: lpCmd ? lpCmd.status : null,
  plannedKeys: lpCmd ? lpCmd.plannedKeys : (inspect ? inspect.loaderParityPrediction.plannedKeys : null),
  completedKeys: lpCmd ? lpCmd.completedKeys : null, unstartedKeys: lpCmd ? lpCmd.unstartedKeys : null,
  pause: lpCmd ? lpCmd.pause : null, parity: lpCmd ? lpCmd.parity : null, rows: lpRows,
  predictedBeforeRun: inspect ? inspect.loaderParityPrediction : null,
  firewallClean: lpCmd ? lpCmd.firewallClean : null, sourceStable: lpCmd ? lpCmd.sourceStable : null,
  deadlineMsGiven: lpChild ? (lpChild.args.find(function (a) { return /^--deadline-ms=/.test(a); }) || null) : null,
  timing: lpCmd ? lpCmd.timing : null, error: lpCmd ? lpCmd.error : null
};

// --- failures, unstarted work, charges --------------------------------------------------------------------------

const failures = [];
(adapters || []).forEach(function (a) {
  if (a.loadError) failures.push({ where: 'adapter ' + a.id, kind: 'adapter-load', code: a.loadError.code, detail: a.loadError.message });
  if (a.sequentialOk === false) {
    failures.push({ where: 'adapter ' + a.id + ' (used by ' + a.usedByTasks.join(', ') + ')', kind: 'textual-applicability',
      firstFailingFile: a.firstFailure.file, firstFailingAnchor: a.firstFailure.anchor, transform: a.firstFailure.transformId,
      code: a.firstFailure.code, detail: a.firstFailure.message });
  }
});
tests.forEach(function (t) {
  if (t.status === 'failed') failures.push({ where: t.id, kind: 'pure-test', code: 'exit ' + t.exitCode, detail: t.firstFailure || t.summaryLine });
});
(plans || []).forEach(function (p) {
  if (!p.ok && p.classification === 'unexpected') failures.push({ where: 'plan-only ' + p.task, kind: 'plan-only', code: p.error.code, detail: p.error.message });
});
if (stChild && (stChild.status !== 'passed' || (stCmd && stCmd.selfTestPassed !== true))) {
  failures.push({ where: 'IG-S01/self-test', kind: 'runtime-canary', code: stChild.status, detail: stCases.filter(function (c) { return !c.ok; }).map(function (c) { return c.id + ': ' + c.error; }).join('; ') || (stCmd ? stCmd.status : 'no command.json') });
}
if (lpChild && lpChild.status !== 'passed') {
  failures.push({ where: 'IG-S01/loader-parity', kind: 'runtime-canary', code: lpChild.status, detail: lpCmd ? lpCmd.status : 'no command.json' });
}

const unstarted = [];
tests.forEach(function (t) {
  if (t.status === 'unstarted' || t.status === 'timeout') unstarted.push({ what: t.id, kind: t.status, reason: t.reason });
});
if (inv) inv.units.filter(function (u) { return u.kind === 'probe' && u.status !== 'passed'; }).forEach(function (u) {
  unstarted.push({ what: u.id, kind: u.status, reason: u.reason });
});
if (ledger) ledger.skipped.forEach(function (s) { unstarted.push({ what: 'phase ' + s.phase, kind: 'skipped', reason: s.reason }); });
if (lpCmd && Array.isArray(lpCmd.unstartedKeys)) lpCmd.unstartedKeys.forEach(function (k) {
  unstarted.push({ what: k, kind: 'unstarted row', reason: lpCmd.pause ? lpCmd.pause.reason : 'the first physical command of the shard only' });
});
if (stChild && stChild.status === 'timeout') unstarted.push({ what: 'IG-S01/self-test', kind: 'timeout', reason: stChild.reason });
if (lpChild && lpChild.status === 'timeout') unstarted.push({ what: 'IG-S01/loader-parity', kind: 'timeout', reason: lpChild.reason });

const charges = ledger ? {
  budgetMs: ledger.budgetMs, admissions: ledger.totals.admissions, maxAdmissions: ledger.maxAdmissions,
  chargedMs: ledger.totals.chargedMs, occupiedMs: ledger.totals.occupiedMs, graceMs: ledger.totals.chargedGraceMs,
  remainingMs: ledger.totals.remainingMs, priorityWaitMsExcluded: ledger.totals.priorityWaitMsExcluded,
  entries: ledger.entries.map(function (e) {
    return { phase: e.shard, wrapperTask: e.wrapperTask, requestedAt: e.requestedAt, admittedAt: e.admittedAt, endedAt: e.endedAt,
      receipt: e.wrapperReceipt, occupiedMs: e.occupiedMs, occupiedSource: e.occupiedSource, chargedMs: e.chargedMs,
      payloadDeadlineMs: e.payloadDeadlineMs, priorityWaitMs: e.priorityWaitMs, priorityWaitToAdmissionMs: e.priorityWaitToAdmissionMs,
      status: e.status, commandJson: e.commandJson };
  }), skipped: ledger.skipped
} : null;

// --- overall ---------------------------------------------------------------------------------------------------

const adaptersOk = adapters ? adapters.filter(function (a) { return a.sequentialOk === true; }) : [];
const adaptersBad = adapters ? adapters.filter(function (a) { return a.sequentialOk === false; }) : [];
const testsPassed = tests.filter(function (t) { return t.status === 'passed'; }).length;
const testsFailed = tests.filter(function (t) { return t.status === 'failed'; }).length;
const oneLine = 'smoke ' + opts.round + ' (rating-v3@' + String(opts['target-commit']).slice(0, 7) + '): ' +
  (adapters ? adaptersOk.length + ' of ' + adapters.length + ' adapters apply textually' +
    (adaptersBad.length > 0 ? ' (' + adaptersBad.map(function (a) { return a.id + ' fails at ' + a.firstFailure.file + ' [' + a.firstFailure.code + ']'; }).join('; ') + ')' : '') : 'inventory not completed') +
  '; pure tests ' + testsPassed + ' passed / ' + testsFailed + ' failed / ' + tests.filter(function (t) { return t.status === 'unstarted' || t.status === 'timeout'; }).length + ' unstarted or timed out' +
  '; self-test ' + (selfTest.ran ? (selfTest.selfTestPassed === true ? 'passed ' + selfTest.casesPassed + '/' + (selfTest.casesPassed + selfTest.casesFailed) : 'did not pass') : 'not run') +
  '; loader-parity ' + (loaderParity.ran ? (loaderParity.completedKeys ? loaderParity.completedKeys.length : 0) + '/' + (loaderParity.plannedKeys ? loaderParity.plannedKeys.length : '?') + ' rows' : 'not run') +
  '; charged ' + (charges ? charges.chargedMs : '?') + '/' + (charges ? charges.budgetMs : '?') + ' ms in ' + (charges ? charges.admissions : '?') + ' admission(s)';
const overall = {
  oneLine: oneLine,
  status: failures.length === 0 && unstarted.length === 0 ? 'clean' : (!inspect ? 'incomplete' : 'findings')
};

const notTested = [
  'semantic parity: that a patched (adapter) instance returns the same puzzles, ratings, checks and work as the native engine on the rating-v3 runtime is NOT tested; only the existing no-op hook (noop-expose) is exercised by the loader-parity rows that ran',
  'textual applicability of an adapter means its private string transforms find unique anchors and the patched text compiles (vm.Script); it does not run the patched code',
  'the engine-free tests that ran use fakes and the real source text; none of them generates a puzzle, and the groups that need accepted evidence (reconcile, the historical IG-S10 cases) were not run',
  'no performance, timing, throughput or pool-width figure was measured or is meaningful here; all numbers are provisional compatibility observations',
  'IG-S06, rows 706-709 and every frozen-gate run are out of scope; IG-S03 and IG-S05 plan-only is blocked by prerequisite evidence of provisional-r1 that this worktree does not hold'
];

const report = {
  schema: 'ig-smoke-report/1', round: opts.round, generatedAt: S.nowIso(), evidenceStatus: 'provisional (pre-freeze); compatibility smoke, not a pack round',
  overall: overall, identity: identity, labelCheck: labelCheck, charges: charges,
  textualApplicability: { adapters: adapters, combinations: combos },
  perTask: perTask, pureTests: tests, planOnly: plans,
  canaries: { selfTest: selfTest, loaderParity: loaderParity },
  failures: failures, unstartedOrTimedOut: unstarted, notTested: notTested,
  git: post ? { headAtEnd: post.git.smokeWorktreeAfter.head, trackedChangesAfter: post.git.smokeWorktreeAfter.trackedChanges,
    untrackedAfter: post.git.smokeWorktreeAfter.untracked, statusShortAfter: post.git.smokeWorktreeAfter.statusShort,
    trackedFilesUnchanged: post.git.trackedFilesUnchanged } : null,
  driver: pre ? pre.driverFiles : null,
  fatal: post ? post.fatal : null
};

// --- markdown --------------------------------------------------------------------------------------------------

const md = [];
md.push('# Smoke report ' + opts.round, '');
md.push('Provisional (pre-freeze) compatibility smoke of the improve-generating phase-0 harness against the `rating-v3` source; not a pack round, no gate, no verdict on any prototype.', '');
md.push('**Result:** ' + oneLine, '');
md.push('## Identity', '');
md.push('- Smoke worktree: `' + cell(identity.smokeWorktree) + '`, HEAD `' + cell(identity.headAtStart) + '` (target `' + opts['target-commit'] + '`), HEAD at the end `' + cell(identity.headAtEnd) + '`.');
md.push('- Source loaded from the smoke worktree: ' + cell(identity.rootBelongsToSmokeWorktree) + ' (files outside the root: ' + cell(identity.loadedFilesOutsideRoot ? identity.loadedFilesOutsideRoot.length : null) + ', in `Q:\\git\\sudoku` or the improve-generating worktree: ' + cell(identity.loadedFilesInForbiddenRoots ? identity.loadedFilesInForbiddenRoots.length : null) + ').');
if (identity.runtime) md.push('- Runtime fingerprint `' + identity.runtime.fingerprint + '` (' + identity.runtime.files + ' sources, runner SHA-256 `' + short(identity.runtime.runnerSha256, 16) + '`).');
if (identity.runtimeOfReferenceWorktree) {
  const r = identity.runtimeOfReferenceWorktree;
  md.push('- The older pack runtime (improve-generating worktree, read only) has fingerprint `' + short(r.fingerprint, 16) + '`; sources changed in the smoke tree: ' + (r.changedInSmoke.length === 0 ? 'none' : r.changedInSmoke.map(function (f) { return '`' + f + '`'; }).join(', ')) + '; added ' + r.addedInSmoke.length + ', removed ' + r.removedInSmoke.length + '.');
}
if (identity.harness) {
  const h = identity.harness;
  md.push('- Harness copy: pack files only `' + h.packFilesOnlyFingerprint + '`, with the smoke files `' + h.fingerprintWithSmokeFiles + '` (what the child commands record as `harnessFingerprint`).');
  if (h.referenceHarness) {
    const rh = h.referenceHarness;
    md.push('- Harness in the improve-generating worktree (read only) has fingerprint `' + short(rh.harnessFingerprint, 16) + '`: identical to the copy: **' + cell(rh.identicalToPackFilesOfCopy) + '**; differing files: ' + (rh.differing && rh.differing.length > 0 ? rh.differing.map(function (f) { return '`' + f + '`'; }).join(', ') : 'none') + '; only there: ' + (rh.onlyInReference && rh.onlyInReference.length > 0 ? rh.onlyInReference.map(function (f) { return '`' + f + '`'; }).join(', ') : 'none') + '. The smoke tested the copy.');
  }
}
md.push('- Labels: ' + labelCheck.explanation);
md.push('  - self-test record label `' + cell(labelCheck.selfTestRecord ? labelCheck.selfTestRecord.runtimeLabel : null) + '`: runtimeFingerprint is the smoke tree\'s ' + cell(labelCheck.selfTestFingerprintIsSmoke) + ', per-file hashes match the inspection ' + cell(labelCheck.selfTestRuntimeFilesMatchInspection) + ', harness fingerprint as inspected ' + cell(labelCheck.selfTestHarnessFingerprintIsInspected) + '.');
md.push('  - loader-parity record label `' + cell(labelCheck.loaderParityRecord ? labelCheck.loaderParityRecord.runtimeLabel : null) + '` (supplied): runtimeFingerprint is the smoke tree\'s ' + cell(labelCheck.loaderParityFingerprintIsSmoke) + ', per-file hashes match the inspection ' + cell(labelCheck.loaderParityRuntimeFilesMatchInspection) + ', harness fingerprint as inspected ' + cell(labelCheck.loaderParityHarnessFingerprintIsInspected) + '.', '');

md.push('## Charges and waits', '');
if (charges) {
  md.push('Charged ' + charges.chargedMs + ' ms of ' + charges.budgetMs + ' ms (occupied ' + charges.occupiedMs + ' ms from the wrapper receipts + ' + charges.graceMs + ' ms grace); admissions ' + charges.admissions + ' of ' + charges.maxAdmissions + '; remaining ' + charges.remainingMs + ' ms; priority wait (not charged) ' + charges.priorityWaitMsExcluded + ' ms.', '');
  md.push.apply(md, table(['phase', 'requested (UTC)', 'admitted (UTC)', 'receipt', 'occupied ms', 'charged ms', 'payload deadline ms', 'wait to admission ms', 'status'],
    charges.entries.map(function (e) { return [e.phase, e.requestedAt, e.admittedAt, e.receipt, e.occupiedMs, e.chargedMs, e.payloadDeadlineMs, e.priorityWaitToAdmissionMs, e.status]; })));
  md.push('');
  if (charges.skipped.length > 0) md.push('Skipped phases: ' + charges.skipped.map(function (s) { return s.phase + ' (' + s.reason + ')'; }).join('; '), '');
}

md.push('## Textual applicability (private transforms on the source text; semantic parity not tested)', '');
if (adapters) {
  md.push.apply(md, table(['adapter', 'used by', 'transforms', 'independently applicable', 'applied in sequence', 'first failing file / anchor', 'error code'],
    adapters.map(function (a) {
      const f = a.firstFailure;
      return [a.id, a.usedByTasks.join(', ') || '-', a.transforms, a.independentApplicable + '/' + a.transforms, a.sequentialOk ? 'all ' + a.sequentialApplied : a.sequentialApplied + ' of ' + a.transforms + ' (stops)',
        f ? f.file + ' :: `' + f.anchor + '`' + (f.find ? ' find `' + f.find + '`' : '') + ' (' + f.transformId + ')' : '-', f ? f.code : '-'];
    })));
  md.push('');
  adapters.filter(function (a) { return a.independentFailures && a.independentFailures.length > 0; }).forEach(function (a) {
    md.push('Independently inapplicable transforms of `' + a.id + '`: ' + a.independentFailures.map(function (f) { return '`' + f.id + '` (' + f.file + ', ' + f.code + ')'; }).join(', ') + '.');
  });
  md.push('', 'Adapter combinations used by the task manifests (applied in their manifest order):', '');
  md.push.apply(md, table(['combination', 'tasks', 'origin', 'result', 'first failing transform'],
    combos.map(function (c) { return [c.native ? '(native, no adapter)' : c.adapterIds.join(' + '), c.usedBy.join(', '), c.origins.join('; '), c.ok ? 'applies' : 'FAILS',
      c.firstFailure ? c.firstFailure.transformId + ' @ ' + c.firstFailure.file + ' [' + c.firstFailure.code + ']' : '-']; })));
  md.push('');
} else {
  md.push('The inventory probe did not complete.', '');
}

md.push('## Per task', '');
md.push.apply(md, table(['task', 'adapter combinations', 'textual', 'plan-only', 'shards:keys', 'engine-free tests'],
  perTask.map(function (t) { return [t.task, (t.adapterCombos && t.adapterCombos.length > 0 ? t.adapterCombos.join(' ; ') + (t.comboOrigin && t.comboOrigin !== 'manifest' ? ' (' + t.comboOrigin + ')' : '') : '- (no manifest)'), t.textual, t.planOnly + (t.planOnlyDetail ? ': ' + t.planOnlyDetail.message.slice(0, 120) : ''), t.shards, t.pureTests.join(', ') || (t.task === 'IG-S01' ? 'self-test (full run)' : '-')]; })));
md.push('', 'Plan-only classes: `ok`; `expected-no-plan-file` (IG-S06: expected, not a regression); `prerequisite-evidence-absent` (the plan reads evidence of `provisional-r1` that the smoke worktree does not hold; not a source incompatibility); `unexpected`.', '');

md.push('## Engine-free pure tests (explicit entry points, no engine, no generation)', '');
md.push.apply(md, table(['unit', 'task', 'status', 'ok lines', 'fail lines', 'wall ms', 'summary / first failure'],
  tests.map(function (t) { return [t.id, t.task, t.status + (t.reason ? ' (' + t.reason + ')' : ''), t.okLines, t.failLines, t.wallMs, t.firstFailure || t.summaryLine]; })));
md.push('', 'Not run by design: `self-test.cjs --only=pure` (covered by the full self-test), engine retests, audit drivers, dev-check generators, the non-gate groups of `ig10-test.cjs`.', '');

md.push('## Runtime canaries (existing self-test and loader-parity rows only)', '');
md.push('- **IG-S01/self-test**: ran ' + cell(selfTest.ran) + ', child ' + cell(selfTest.childStatus) + ' (exit ' + cell(selfTest.exitCode) + ', ' + cell(selfTest.wallMs) + ' ms), command.json status `' + cell(selfTest.commandStatus) + '`, selfTestPassed ' + cell(selfTest.selfTestPassed) + ', cases ' + selfTest.casesPassed + ' passed / ' + selfTest.casesFailed + ' failed; engine-related cases: ' + (selfTest.engineCases.join(', ') || '-') + '; firewall clean ' + cell(selfTest.firewallClean) + ', source stable ' + cell(selfTest.sourceStable) + '.');
selfTest.cases.filter(function (c) { return !c.ok; }).forEach(function (c) { md.push('  - FAIL ' + c.id + ': ' + c.error); });
md.push('- **IG-S01/loader-parity**: ran ' + cell(loaderParity.ran) + ', child ' + cell(loaderParity.childStatus) + ' (exit ' + cell(loaderParity.exitCode) + ', ' + cell(loaderParity.wallMs) + ' ms), command status `' + cell(loaderParity.commandStatus) + '`, rows completed ' + cell(loaderParity.completedKeys ? loaderParity.completedKeys.length : null) + ' of ' + cell(loaderParity.plannedKeys ? loaderParity.plannedKeys.length : null) + '; given ' + cell(loaderParity.deadlineMsGiven) + '.');
if (loaderParity.predictedBeforeRun) {
  const p = loaderParity.predictedBeforeRun;
  md.push('  - Packing arithmetic (inspection, before the run): at 25000 ms the window is ' + p.at25000.windowMs + ' ms, every row estimates ' + p.jobEstimateMs[0] + ' ms, so ' + p.at25000.commands + ' physical commands and one run.cjs call runs only `' + (p.at25000.firstCommandKeys[0] || '-') + '`; a complete pair needs `--deadline-ms` >= ' + p.minDeadlineMsForOnePair + ' and all four rows >= ' + p.minDeadlineMsForAllRows + ' (' + p.note + ').');
}
if (loaderParity.rows) md.push.apply(md, table(['row', 'outcome', 'claimed exact', 'verified exact', 'validation', 'cold wall ms', 'puzzle hash'], loaderParity.rows.map(function (r) { return [r.key, r.outcome, r.claimedExact, r.verifiedExact, r.validation, r.coldWallMs, r.puzzleHash]; })));
if (loaderParity.parity) md.push('  - parity report: ' + cell(JSON.stringify(loaderParity.parity.pairs ? loaderParity.parity.pairs.map(function (p) { return { pairId: p.pairId, verdict: p.verdict }; }) : loaderParity.parity)));
md.push('');

md.push('## Failures with first failing anchor and error code', '');
if (failures.length === 0) md.push('None.', '');
else {
  md.push.apply(md, table(['where', 'kind', 'first failing file / anchor', 'error code', 'detail'], failures.map(function (f) {
    return [f.where, f.kind, f.firstFailingFile ? f.firstFailingFile + ' :: ' + f.firstFailingAnchor : '-', f.code, f.detail];
  })));
  md.push('');
}

md.push('## Unstarted work and timeouts', '');
if (unstarted.length === 0) md.push('None.', '');
else {
  md.push.apply(md, table(['what', 'kind', 'reason'], unstarted.map(function (u) { return [u.what, u.kind, u.reason]; })));
  md.push('');
}

md.push('## Not tested', '');
notTested.forEach(function (n) { md.push('- ' + n); });
md.push('');
md.push('## Worktree', '');
if (post) {
  md.push('- `git status --short` of the smoke worktree after the smoke: tracked changes ' + post.git.smokeWorktreeAfter.trackedChanges.length + ' (' + (post.git.trackedFilesUnchanged ? 'tracked files unchanged' : 'TRACKED FILES CHANGED') + '); untracked entries: ' + post.git.smokeWorktreeAfter.untracked.map(function (u) { return '`' + u + '`'; }).join(', ') + '.');
  md.push('- HEAD unchanged: ' + cell(post.git.headUnchanged) + '.');
}
if (report.fatal) md.push('- Fatal error recorded: ' + report.fatal);
md.push('');

S.writeJsonFile(path.join(archive, 'smoke-report.json'), report);
S.writeTextFile(path.join(archive, 'smoke-report.md'), md.join('\n'));
process.stdout.write('smoke-report written: ' + overall.status + '\n');
