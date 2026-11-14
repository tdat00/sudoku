'use strict';

/*
 * Re-audit of saved IG-S02 puzzles (the Killer shard), launched through the low-priority wrapper as ONE command:
 *
 *   node ig02-killer-audit.cjs --task=IG-S02 --round=provisional-r1 --shard=killer --source=a1 --out=audit-a1
 *                              [--requested-at=<iso>]
 *
 * Nothing is regenerated and no record is rewritten. The saved puzzle of every record of the source attempt that the
 * audit rejected (`validation-failed`) is verified again, after the timed interval, by the independent unpatched verifier
 * with the Killer-only structure rule (killer-audit.cjs, author-approved), and the result goes into a hash-linked sidecar
 * `<shard>/<out>/audit.json` (+ `audit.md`, `command.json`, firewall files). Each entry links by hash to the saved puzzle
 * file and to the original record; a new summary reconciles the rows (`aggregate.cjs --audit=...`). Before the audit, the
 * verifier is shown to REJECT tampered copies of a saved puzzle (malformed cage or unit) on the real engine; a verifier
 * that accepts one invalidates the audit. Everything is provisional (pre-freeze) evidence tooling; no git, no production
 * file is touched.
 */
const fs = require('fs');
const path = require('path');
const C = require('./common.cjs');
const L = require('./loader.cjs');
const R = require('./records.cjs');
const M = require('./manifest.cjs');
const H = require('./host.cjs');
const RUN = require('./run.cjs');
const KA = require('./killer-audit.cjs');

const HarnessError = C.HarnessError;
const AUDIT_SCHEMA = 'ig-s-audit/1';
const RULE = 'cages partition the 81 cells once, each non-empty, connected, distinct, with the sum of its distinct saved ' +
  'solution digits; the model rebuilt with SG.killer.modelFromCages from the saved cages (saved order) has the same ' +
  'COMPLETE wire: 27 base units, one cage unit per cage of size >= 2, none for a singleton, no extra unit, same colours ' +
  'and layout; nothing repaired. Solution/givens, uniqueness, canonical rating and requiredness checks unchanged.';

function parseArgs(argv) {
  const opts = { task: null, round: null, shard: null, source: null, out: null, requestedAt: null };
  const names = { task: 'task', round: 'round', shard: 'shard', source: 'source', out: 'out',
    'requested-at': 'requestedAt' };
  argv.forEach(function (arg) {
    const m = /^--([a-z-]+)=(.*)$/.exec(arg);
    if (!m || !Object.prototype.hasOwnProperty.call(names, m[1])) throw new HarnessError('args', 'unknown argument ' + arg);
    opts[names[m[1]]] = m[2];
  });
  if (opts.task !== 'IG-S02') throw new HarnessError('args', 'this audit belongs to --task=IG-S02');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(opts.round || '')) throw new HarnessError('args', 'missing or bad --round');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(opts.shard || '')) throw new HarnessError('args', 'missing or bad --shard');
  if (!R.ATTEMPT_ID.test(opts.source || '')) throw new HarnessError('args', 'missing or bad --source');
  if (!/^audit-[a-z0-9-]+$/.test(opts.out || '')) throw new HarnessError('args', '--out must look like audit-a1');
  return opts;
}

/** Typed arrays back where the original verifier received them (the saved JSON has plain arrays). */
function restore(wire) {
  const w = Object.assign({}, wire);
  w.givens = Int32Array.from(wire.givens);
  w.solution = Int32Array.from(wire.solution);
  return w;
}

/** The audit's outcome fields, the same derivation as run.cjs `recordOfRequest` for a verified or failed audit. */
function outcomeOf(verdict, wire, validation) {
  const status = RUN.validationStatus(verdict);
  const out = { status: status, outcome: status === 'verified' ? 'complete' : status === 'failed' ? 'error' :
    'validation-unknown', verifiedExact: null, required: null, vacuous: null, shallow: null };
  if (status === 'verified') {
    const fresh = verdict.fresh;
    out.verifiedExact = fresh.solved === true && fresh.level === wire.config.difficulty && fresh.required === true;
    out.required = fresh.required;
    out.vacuous = fresh.vacuous;
    out.shallow = fresh.shallow;
  } else if (status === 'failed') {
    out.verifiedExact = false;
  }
  out.validation = { wallMs: validation.wallMs, cpuMs: validation.cpuMs, solutionValid: verdict.solutionValid,
    givensAgree: verdict.givensAgree, structureValid: verdict.structureValid, unique: verdict.unique,
    canonicalEqual: verdict.canonicalEqual };
  out.validationDetail = { status: status, requirednessAgree: verdict.requirednessAgree,
    cpuResolutionStatus: validation.cpuResolutionStatus, probe: validation.proof || null, errors: verdict.errors };
  return out;
}

function sha256File(file) {
  return C.sha256(fs.readFileSync(file));
}

async function main(argv, deps) {
  deps = deps || {};
  const opts = parseArgs(argv);
  const repoRoot = C.DEFAULT_REPO_ROOT;
  const processStartedAt = new Date(performance.timeOrigin).toISOString();
  const expectedTask = opts.task + '/' + opts.shard + '-audit';
  const lock = deps.lock ? deps.lock(expectedTask) : RUN.observeLock(expectedTask);
  RUN.assertLockOwned(lock, expectedTask);

  const evidenceRoot = RUN.evidenceRootOf(repoRoot);
  const roundDir = path.join(evidenceRoot, opts.round);
  const shardDir = R.shardDirOf(evidenceRoot, opts.round, opts.task, opts.shard);
  const sourceDir = R.attemptDirOf(shardDir, opts.source);
  // `deps.outDir` and `deps.host` exist only for the offline dry run of the test file (a scratch folder, a stand-in verifier).
  const outDir = deps.outDir || path.join(shardDir, opts.out);
  if (fs.existsSync(outDir)) throw new HarnessError('output-exists', 'the audit sidecar already exists: ' + outDir);

  // Evidence that is audited: read as it is, hashed, never rewritten.
  const recordsFile = path.join(sourceDir, R.EVIDENCE_FILES.records);
  const commandFile = path.join(sourceDir, R.EVIDENCE_FILES.command);
  const sourceManifestFile = path.join(sourceDir, R.EVIDENCE_FILES.sourceManifest);
  const recordsDoc = C.readJson(recordsFile);
  const sourceCommand = C.readJson(commandFile);
  const sourceManifest = C.readJson(sourceManifestFile);
  const sourceHashes = { recordsFileSha256: sha256File(recordsFile), commandFileSha256: sha256File(commandFile),
    sourceManifestFileSha256: sha256File(sourceManifestFile) };
  const rejected = recordsDoc.records.filter(function (r) {
    return r.outcome === 'error' && r.error && r.error.code === 'validation-failed' && r.puzzleFile;
  });
  if (rejected.length === 0) throw new HarnessError('nothing-to-audit', 'no audit-rejected record with a saved puzzle');

  // Budget: the remaining task allocation less the quiet-admission grace, never beyond the command limit.
  const ledger = RUN.readLedger(roundDir);
  const budget = M.budgetState({ task: opts.task, round: opts.round, approvals: ledger.approvals,
    charges: R.collectCharges(ledger, R.scanRoundCommands(roundDir)) });
  const deadlineMs = Math.min(C.GUARDS.commandMs, budget.effectiveDeadlineMs);
  if (!(deadlineMs >= C.GUARDS.minWindowMs + C.GUARDS.finalizeReserveMs)) {
    throw new HarnessError('budget-exhausted', 'the remaining task allocation does not admit this command');
  }

  const before = L.loadSourceSet({ repoRoot: repoRoot });
  const harness = C.harnessFingerprint();
  const fwBefore = L.takeFirewall({ repoRoot: repoRoot });
  C.ensureDir(repoRoot, outDir);
  C.writeJsonAtomic(repoRoot, path.join(outDir, R.EVIDENCE_FILES.firewallBefore), fwBefore.snapshot);

  const host = deps.host || new H.Host({ repoRoot: repoRoot, runtimeFingerprint: before.fingerprint, deadlineMs: deadlineMs });
  if (!deps.host) host.calibrate();

  let loopError = null;
  const tests = { passed: false, cases: [] };
  const entries = [];
  try {
    // The saved puzzles, linked to the records by hash before anything is judged.
    const loaded = rejected.map(function (rec) {
      const file = path.resolve(evidenceRoot, ...rec.puzzleFile.split('/'));
      if (!C.isInside(evidenceRoot, file)) throw new HarnessError('path-unauthorised', 'puzzle outside the evidence: ' + file);
      const bytes = fs.readFileSync(file);
      const saved = JSON.parse(bytes.toString('utf8'));
      return { rec: rec, file: file, puzzleFileSha256: C.sha256(bytes), saved: saved };
    });

    // The verifier must reject malformed copies of a saved puzzle on the real engine before its acceptances count.
    const subject = loaded[0];
    const level = subject.saved.level;
    const cases = KA.tamperCases(subject.saved.wire);
    for (const tc of cases) {
      const v = await host.runValidation(restore(tc.wire), { level: level });
      const verdict = v.verdict;
      const rejectedCase = v.status === 'ok' && verdict !== null && verdict.structureValid === false &&
        RUN.validationStatus(verdict) === 'failed';
      tests.cases.push({ id: tc.id, rejected: rejectedCase, status: v.status, structureValid: verdict ? verdict.structureValid : null,
        firstErrors: verdict ? verdict.errors.slice(0, 2) : [], wallMs: v.wallMs });
    }
    tests.passed = tests.cases.length >= 5 && tests.cases.every(function (c) { return c.rejected; });

    for (const item of loaded) {
      const rec = item.rec;
      const wire = item.saved.wire;
      const digests = R.normaliseWire(wire).digests;
      const compared = R.compareDigests(rec.digests, digests);
      const links = {
        recordDigest: C.digestOf(rec),
        recordsFileSha256: sourceHashes.recordsFileSha256,
        puzzleFile: rec.puzzleFile,
        puzzleFileSha256: item.puzzleFileSha256,
        puzzleFileMatchesRecord: item.puzzleFileSha256 === rec.puzzleFileSha256,
        digestsMatchRecord: compared.equal,
        puzzleHashMatchesRecord: digests.puzzle === rec.puzzleHash && item.saved.puzzleHash === rec.puzzleHash,
        savedKeyMatchesRecord: item.saved.key === rec.key
      };
      const v = await host.runValidation(restore(wire), { level: rec.level });
      const verdict = v.verdict;
      const outcome = v.status === 'ok' ? outcomeOf(verdict, wire, v) : { status: 'unknown', outcome: 'validation-unknown',
        verifiedExact: null, required: null, vacuous: null, shallow: null, validation: { wallMs: v.wallMs, cpuMs: v.cpuMs,
        solutionValid: null, givensAgree: null, structureValid: null, unique: null, canonicalEqual: null },
        validationDetail: { status: 'unknown', requirednessAgree: null, cpuResolutionStatus: v.cpuResolutionStatus,
          probe: v.proof || null, errors: [v.error ? v.error.message : 'the verifier did not answer'] } };
      const audit = { status: outcome.status, verdict: verdict, wallMs: v.wallMs, cpuMs: v.cpuMs,
        cpuResolutionStatus: v.cpuResolutionStatus, verifierStatus: v.status };
      const entry = {
        key: rec.key, pairId: rec.pairId, arm: rec.arm, solverMode: rec.solverMode, requestSeed: rec.requestSeed,
        originalOutcome: rec.outcome, originalError: rec.error, claimedExact: rec.claimedExact, links: links, audit: audit,
        reconciled: { outcome: outcome.outcome, verifiedExact: outcome.verifiedExact, required: outcome.required,
          vacuous: outcome.vacuous, shallow: outcome.shallow, validation: outcome.validation,
          validationDetail: outcome.validationDetail },
        falseExactFlag: outcome.status === 'verified' && rec.claimedExact !== outcome.verifiedExact
      };
      entry.linkHash = C.digestOf({ key: rec.key, recordDigest: links.recordDigest, puzzleFileSha256: links.puzzleFileSha256,
        auditDigest: C.digestOf(audit), reconciledDigest: C.digestOf(entry.reconciled) });
      entries.push(entry);
    }
  } catch (err) {
    loopError = err;
  } finally {
    await host.terminateAll();
  }

  const after = L.loadSourceSet({ repoRoot: repoRoot });
  const stable = L.compareSourceSets(before, after);
  const harnessAfter = C.harnessFingerprint();
  const fwAfter = L.takeFirewall({ repoRoot: repoRoot });
  const fwDiff = L.diffFirewall(fwBefore, fwAfter);

  // What changed in the harness since the audited evidence was produced (per file, by content).
  const evidenceHarness = new Map((sourceManifest.harness.files || []).map(function (f) { return [f.file, f.sha256]; }));
  const nowHarness = new Map(harness.files.map(function (f) { return [f.file, f.sha256]; }));
  const harnessComparison = {
    evidenceFingerprint: sourceManifest.harness.fingerprint,
    currentFingerprint: harness.fingerprint,
    changed: Array.from(nowHarness.keys()).filter(function (f) { return evidenceHarness.has(f) && evidenceHarness.get(f) !== nowHarness.get(f); }),
    added: Array.from(nowHarness.keys()).filter(function (f) { return !evidenceHarness.has(f); }),
    removed: Array.from(evidenceHarness.keys()).filter(function (f) { return !nowHarness.has(f); }),
    unchangedCount: Array.from(nowHarness.keys()).filter(function (f) { return evidenceHarness.get(f) === nowHarness.get(f); }).length,
    note: 'ig02-run.cjs and aggregate.cjs changed after the evidence only in reporting (pair rows, cell summary, task ' +
      'summary); the generation hooks (prepare, execute, augmentRecord), attempt-pool.cjs, attempt-worker.cjs, the adapter, ' +
      'the plan, host.cjs, loader.cjs and run.cjs are those of the evidence. worker.cjs changed only in validate() ' +
      '(the Killer branch of the structure check) and killer-audit.cjs is new: verification only, no generation path.'
  };

  const summary = { audited: entries.length, verified: 0, failed: 0, unknown: 0, falseExactFlags: 0, linksOk: 0 };
  entries.forEach(function (e) {
    summary[e.audit.status === 'verified' ? 'verified' : e.audit.status === 'failed' ? 'failed' : 'unknown']++;
    if (e.falseExactFlag) summary.falseExactFlags++;
    if (e.links.puzzleFileMatchesRecord && e.links.digestsMatchRecord && e.links.puzzleHashMatchesRecord &&
        e.links.savedKeyMatchesRecord) summary.linksOk++;
  });

  let status = 'complete';
  if (loopError) status = C.exitCodeOf(loopError) === 2 ? 'unsupported-source' : 'error';
  else if (!stable.stable || harness.fingerprint !== harnessAfter.fingerprint) status = 'source-changed';
  else if (!fwDiff.clean) status = 'firewall-violation';
  else if (host.stopped || host.workers.size > 0) status = 'error';
  else if (!tests.passed || entries.length !== rejected.length) status = 'error';
  else if (summary.linksOk !== entries.length || summary.falseExactFlags > 0) status = 'identity-violation';
  else if (summary.failed > 0) status = 'validation-failed';

  const audit = {
    schema: AUDIT_SCHEMA,
    task: opts.task, round: opts.round, shard: opts.shard, sourceAttempt: opts.source, out: opts.out,
    evidenceStatus: C.EVIDENCE_PROVISIONAL,
    provisionalNotice: R.PROVISIONAL_NOTICE,
    purpose: 'Delayed independent verification of the six saved Killer puzzles that the original audit rejected by a ' +
      'structure rule that cannot hold for Killer. Nothing was regenerated; the original records, timings and ' +
      'fingerprints are untouched; generation times are unaffected because the audit is outside every generation time.',
    rule: RULE,
    verifier: { harnessFingerprint: harness.fingerprint, runtimeFingerprint: before.fingerprint,
      workerSha256: sha256File(path.join(C.HARNESS_DIR, 'worker.cjs')),
      killerAuditSha256: sha256File(path.join(C.HARNESS_DIR, 'killer-audit.cjs')),
      auditScriptSha256: sha256File(path.join(C.HARNESS_DIR, 'ig02-killer-audit.cjs')) },
    source: Object.assign({ recordsFile: C.toPosix(path.relative(repoRoot, recordsFile)),
      commandFile: C.toPosix(path.relative(repoRoot, commandFile)), commandStatus: sourceCommand.status,
      evidenceHarnessFingerprint: sourceCommand.harnessFingerprint, evidenceRuntimeFingerprint: sourceCommand.runtimeFingerprint },
    sourceHashes),
    harnessComparison: harnessComparison,
    verifierTests: tests,
    summary: summary,
    entries: entries,
    status: status,
    error: loopError ? { code: loopError.code || null, message: String(loopError.message) } : null
  };
  const auditSha = C.writeJsonAtomic(repoRoot, path.join(outDir, 'audit.json'), audit);

  const md = [];
  md.push('# IG-S02 ' + opts.shard + ' re-audit (' + opts.round + ', ' + opts.out + ')', '');
  md.push('**' + R.PROVISIONAL_NOTICE + '**', '');
  md.push('Status **' + status + '**. Audited ' + summary.audited + ': ' + summary.verified + ' verified, ' + summary.failed +
    ' failed, ' + summary.unknown + ' unknown; links ok ' + summary.linksOk + '/' + summary.audited + '. Verifier tests ' +
    (tests.passed ? 'passed' : 'FAILED') + ' (' + tests.cases.filter(function (c) { return c.rejected; }).length + '/' +
    tests.cases.length + ' tampered puzzles rejected).', '');
  md.push('Rule: ' + RULE, '');
  md.push('| key | original | audit | exact claimed / verified | structure | unique | canonical | requiredness | link hash |');
  md.push('|---|---|---|---|---|---|---|---|---|');
  entries.forEach(function (e) {
    const v = e.audit.verdict || {};
    md.push('| ' + e.key + ' | ' + e.originalOutcome + ' | ' + e.audit.status + ' | ' + e.claimedExact + ' / ' +
      e.reconciled.verifiedExact + ' | ' + v.structureValid + ' | ' + v.unique + ' | ' + v.canonicalEqual + ' | ' +
      v.requirednessAgree + ' | ' + e.linkHash.slice(0, 12) + ' |');
  });
  md.push('', '| tampered case | rejected | structure valid | first error |', '|---|---|---|---|');
  tests.cases.forEach(function (c) {
    md.push('| ' + c.id + ' | ' + c.rejected + ' | ' + c.structureValid + ' | ' + (c.firstErrors[0] || '').slice(0, 90) + ' |');
  });
  md.push('', 'Harness since the evidence (' + harnessComparison.evidenceFingerprint.slice(0, 8) + ' to ' +
    harnessComparison.currentFingerprint.slice(0, 8) + '): changed ' + harnessComparison.changed.join(', ') + '; added ' +
    harnessComparison.added.join(', ') + '. ' + harnessComparison.note, '');
  C.writeTextExclusive(repoRoot, path.join(outDir, 'audit.md'), md.join('\n'));
  C.writeJsonAtomic(repoRoot, path.join(outDir, R.EVIDENCE_FILES.firewallAfter), Object.assign({}, fwAfter.snapshot,
    { diff: { clean: fwDiff.clean, added: fwDiff.added, removed: fwDiff.removed, changed: fwDiff.changed } }));

  const timing = RUN.timingOf(processStartedAt, opts.requestedAt);
  const pseudo = entries.map(function (e) { return { key: e.key, outcome: e.reconciled.outcome }; });
  const command = RUN.assembleCommand({
    task: opts.task, shard: opts.shard + '/' + opts.out, round: opts.round, attemptId: opts.out, status: status,
    runtimeLabel: RUN.DEFAULT_RUNTIME_LABEL, runtimeFingerprint: before.fingerprint,
    runtimeFiles: L.describeSourceSet(before).files, sourceStable: stable.stable && harness.fingerprint === harnessAfter.fingerprint,
    harnessFingerprint: harness.fingerprint, adapterIds: [], adapterHashes: [], catalogue: null, manifestHash: null,
    pairOrder: null, plannedKeys: entries.map(function (e) { return e.key; }), records: pseudo, startedUnfinished: [],
    logicalBlockKeys: [], physicalPlanHash: null, physicalPlan: null, guards: host.guards,
    lock: { wrapperPath: null, ownerText: 'IG ' + expectedTask, expectedTask: expectedTask, observed: lock },
    timing: timing, error: audit.error,
    budgetLedgerReference: { ledger: C.toPosix(path.relative(repoRoot, path.join(roundDir, 'ledger.json'))),
      stateBefore: budget },
    gate: R.evaluateGate({ round: opts.round, runtimeFingerprint: before.fingerprint }),
    cpu: Object.assign({}, host.cpu, { commandCpuMs: host.commandCpuMs(), processAgeAtHostMs: host.processAgeMs }),
    firewallClean: fwDiff.clean, firewallDiff: { added: fwDiff.added, removed: fwDiff.removed, changed: fwDiff.changed },
    notes: ['re-audit of saved puzzles; nothing regenerated', 'audit.json sha256 ' + auditSha]
  });
  command.audit = { file: C.toPosix(path.relative(repoRoot, path.join(outDir, 'audit.json'))), sha256: auditSha,
    summary: summary, verifierTestsPassed: tests.passed, sourceAttempt: opts.source };
  C.writeJsonAtomic(repoRoot, path.join(outDir, R.EVIDENCE_FILES.command), command);
  process.stdout.write(JSON.stringify({ ig: 'audit', task: opts.task, shard: opts.shard, out: opts.out, status: status,
    summary: summary, testsPassed: tests.passed, auditSha256: auditSha }) + '\n');
  return command.exit;
}

module.exports = { parseArgs, restore, outcomeOf, main };

if (require.main === module) {
  const finish = function (code) {
    process.exitCode = code;
    process.stdout.write('', function () { process.exit(code); });
  };
  main(process.argv.slice(2)).then(finish, function (err) {
    process.stderr.write('IG audit error [' + (err && err.code ? err.code : 'unexpected') + ']: ' +
      (err && err.stack ? err.stack : String(err)) + '\n');
    finish(C.exitCodeOf(err));
  });
}
