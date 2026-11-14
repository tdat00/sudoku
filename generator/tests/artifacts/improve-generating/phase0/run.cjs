'use strict';

/*
 * Command entry of the phase-0 harness: one shard in one admitted command, always launched through the supplied
 * low-priority wrapper by Invoke-IgTask.ps1 (only --plan-only, which loads no engine and times nothing, runs
 * unwrapped).
 *
 *   node run.cjs --task=IG-S01 --round=provisional-r1 --shard=<shard> [--attempt=a1] [--resume=<command.json>]
 *                [--deadline-ms=N] [--runtime-label=<text>] [--freeze-receipt=<json>] [--budget-receipt=<json>]
 *                [--lock-helper=<path>] [--requested-at=<iso>]
 *   node run.cjs --task=... --round=... --plan-only      source identity, shards, keys, packing, budget
 *
 * Exit 0: the recorded observations passed the correctness checks (an incomplete productive pause included, with
 * command.status = paused-unstarted); 1: incorrect output, parity, identity or source problem; 2: unsupported
 * source or plan. Everything it writes is provisional (pre-freeze) unless a valid frozen receipt says otherwise.
 * No git is run: commit labels are supplied provenance labels, content fingerprints are the checked identity.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const C = require('./common.cjs');
const L = require('./loader.cjs');
const R = require('./records.cjs');
const M = require('./manifest.cjs');

const HarnessError = C.HarnessError;

const DEFAULT_RUNTIME_LABEL = '1c042ad (label supplied by the pack; runtime f7be90f, unchanged by ef8a9cc)';
const SELF_TEST_ESTIMATE_MS = 15000;

// Task glue loaded lazily: a task that runs its own kind of request (IG-S02: a pool) registers its module here.
const TASK_HOOKS = { 'IG-S02': './ig02-run.cjs', 'IG-S03': './ig03-run.cjs', 'IG-S04': './ig04-run.cjs' };

function taskHooks(task) {
  return Object.prototype.hasOwnProperty.call(TASK_HOOKS, task) ? require(TASK_HOOKS[task]) : null;
}

function parseArgs(argv) {
  const opts = { task: null, round: null, shard: null, attempt: null, resume: null, deadlineMs: null,
    runtimeLabel: null, freezeReceipt: null, budgetReceipt: null, lockHelper: null, requestedAt: null,
    planOnly: false };
  const names = { task: 'task', round: 'round', shard: 'shard', attempt: 'attempt', resume: 'resume',
    'deadline-ms': 'deadlineMs', 'runtime-label': 'runtimeLabel', 'freeze-receipt': 'freezeReceipt',
    'budget-receipt': 'budgetReceipt', 'lock-helper': 'lockHelper', 'requested-at': 'requestedAt' };
  argv.forEach(function (arg) {
    if (arg === '--plan-only') {
      opts.planOnly = true;
      return;
    }
    const m = /^--([a-z-]+)=(.*)$/.exec(arg);
    if (!m || !Object.prototype.hasOwnProperty.call(names, m[1])) throw new HarnessError('args', 'unknown argument ' + arg);
    opts[names[m[1]]] = m[2];
  });
  if (!/^IG-S(0[1-9]|10)$/.test(opts.task || '')) throw new HarnessError('args', 'missing or bad --task');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(opts.round || '')) throw new HarnessError('args', 'missing or bad --round');
  if (opts.deadlineMs !== null) {
    opts.deadlineMs = Number(opts.deadlineMs);
    if (!Number.isFinite(opts.deadlineMs) || opts.deadlineMs <= 0) throw new HarnessError('args', 'bad --deadline-ms');
  }
  if (!opts.planOnly && !opts.shard) throw new HarnessError('args', 'missing --shard');
  return opts;
}

function evidenceRootOf(repoRoot) {
  return path.join(repoRoot, ...C.EVIDENCE_REL.split('/'));
}

function readLedger(roundDir) {
  const file = path.join(roundDir, 'ledger.json');
  if (!fs.existsSync(file)) return { entries: [], approvals: [] };
  const ledger = C.readJson(file);
  return { entries: Array.isArray(ledger.entries) ? ledger.entries : [],
    approvals: Array.isArray(ledger.approvals) ? ledger.approvals : [] };
}

function readReceipt(file, label) {
  if (!file) return null;
  if (!fs.existsSync(file)) throw new HarnessError('receipt-missing', label + ' receipt does not exist: ' + file);
  return C.readJson(file);
}

function machineInfo() {
  const cpus = os.cpus();
  return {
    node: process.version,
    execArgv: process.execArgv.slice(),
    platform: os.platform() + ' ' + os.release() + ' ' + os.arch(),
    cpuModel: cpus.length > 0 ? cpus[0].model.trim() : null,
    logicalProcessors: cpus.length,
    memoryGiB: Math.round(os.totalmem() / 2 ** 30 * 10) / 10
  };
}

/**
 * Read-only look at the supplied wrapper's lock file: whose command holds the timing slot. `ownerMatches` is true only
 * when the file was read and names exactly this task; a missing file is false and an unreadable one is null, and
 * neither counts as owned (`assertLockOwned`). `io` replaces the real file for the self-test.
 */
function observeLock(expectedTask, io) {
  const file = io && io.file ? io.file : path.join(os.tmpdir(), 'dv3-sudoku.lock');
  const reader = io && io.readFile ? io.readFile : function (f) { return fs.readFileSync(f, 'utf8'); };
  const expectedOwner = 'IG ' + expectedTask;
  try {
    const content = reader(file);
    return { file: file, content: content, expectedOwner: expectedOwner,
      ownerMatches: content.split('|')[1] === expectedOwner };
  } catch (err) {
    return { file: file, content: null, expectedOwner: expectedOwner, error: err.code || String(err),
      ownerMatches: err.code === 'ENOENT' ? false : null };
  }
}

/** Generation and the self-test run only under the wrapper's lock: the owner must have been proved, not just not refuted. */
function assertLockOwned(lock, expectedTask) {
  if (lock.ownerMatches !== true) {
    throw new HarnessError('unlocked-refused', 'the low-priority wrapper is not proved to hold the timing slot for ' +
      expectedTask + (lock.error ? ' (the lock file could not be read: ' + lock.error + ')' : '') +
      '; generation is never run unlocked');
  }
}

/** Before any frozen generation: both receipts present and valid, both naming the loaded runtime. */
function assertFrozenReceipts(input) {
  const check = R.receiptProblems(input);
  if (!check.ok) {
    throw new HarnessError(check.code, 'frozen receipts refused: ' + check.problems.join('; '), check.problems);
  }
}

function uniqueAdapterSets(jobs) {
  const sets = new Map();
  jobs.forEach(function (j) { sets.set(JSON.stringify(j.adapterIds || []), j.adapterIds || []); });
  return Array.from(sets.values());
}

// --- plan only ----------------------------------------------------------------------------------------------

function planOnly(opts, repoRoot) {
  const manifest = M.buildManifest(opts.task, opts.round);
  const set = L.loadSourceSet({ repoRoot: repoRoot });
  const harness = C.harnessFingerprint();
  const evidenceRoot = evidenceRootOf(repoRoot);
  const roundDir = path.join(evidenceRoot, opts.round);
  const ledger = readLedger(roundDir);
  const charges = R.collectCharges(ledger, R.scanRoundCommands(roundDir));
  const freezeReceipt = readReceipt(opts.freezeReceipt, 'freeze');
  const budgetReceipt = readReceipt(opts.budgetReceipt, 'budget');
  const budget = M.budgetState({ task: opts.task, round: opts.round, charges: charges, approvals: ledger.approvals,
    receipt: budgetReceipt });
  const gate = R.evaluateGate({ round: opts.round, freezeReceipt: freezeReceipt, budgetReceipt: budgetReceipt,
    runtimeFingerprint: set.fingerprint, catalogueFingerprint: null });
  const receipts = R.receiptProblems({ round: opts.round, freezeReceipt: freezeReceipt,
    budgetReceipt: budgetReceipt, runtimeFingerprint: set.fingerprint });
  // Without an admitting budget (a frozen round before its receipts) the cost is projected on a full 270 s window.
  const projectionDeadlineMs = budget.canAdmit ? budget.effectiveDeadlineMs : C.GUARDS.commandMs;
  const window = M.commandWindowMs(projectionDeadlineMs);
  const adapters = [];
  manifest.shards.forEach(function (shard) {
    uniqueAdapterSets(M.jobsOf(manifest, shard.jobKeys)).forEach(function (ids) {
      ids.forEach(function (id) {
        if (!adapters.some(function (a) { return a.id === id; })) {
          adapters.push({ id: id, hash: C.digestOf(L.getAdapter(id)) });
        }
      });
    });
  });
  let projectedMs = 0;
  const shards = manifest.shards.map(function (shard) {
    const dir = R.shardDirOf(evidenceRoot, opts.round, opts.task, shard.shard);
    const state = R.shardStatus(dir, shard);
    const physical = M.packCommands(M.blocksFor(manifest, state.unstartedKeys), window);
    let own = M.projectedMachineMs(physical);
    if (shard.kind === 'synthetic') own = state.status === 'recorded' ? 0 : SELF_TEST_ESTIMATE_MS + C.GUARDS.graceMs;
    if (state.status !== 'recorded') projectedMs += own;
    const last = state.attempts.length > 0 ? state.attempts[state.attempts.length - 1] : null;
    return {
      shard: shard.shard,
      kind: shard.kind,
      status: state.status,
      reason: state.reason || null,
      dirRel: C.toPosix(path.relative(repoRoot, dir)),
      keys: shard.jobKeys,
      unstartedKeys: state.unstartedKeys,
      blocks: shard.blockKeys,
      attempts: state.attempts.map(function (a) { return a.attemptId; }),
      chain: state.chain || null,
      nextAttempt: state.attempts.length === 0 ? 'a1' : R.nextAttemptId(state.attempts),
      lastCommandJson: last && last.command ?
        path.join(R.attemptDirOf(dir, last.attemptId), 'command.json') : null,
      lastCommandRel: last && last.command ?
        C.toPosix(path.relative(roundDir, path.join(R.attemptDirOf(dir, last.attemptId), 'command.json'))) : null,
      physicalPlan: shard.kind === 'synthetic' ? null : { hash: physical.hash, windowMs: physical.windowMs,
        commands: physical.commands, oversize: physical.oversize },
      projectedMachineMs: own
    };
  });
  return {
    schema: C.SCHEMA,
    task: opts.task,
    round: opts.round,
    evidenceStatus: manifest.evidenceStatus,
    mode: 'plan-only (no engine loaded, nothing timed, nothing written)',
    runtimeLabel: opts.runtimeLabel || DEFAULT_RUNTIME_LABEL,
    runtimeFingerprint: set.fingerprint,
    runtimeFiles: L.describeSourceSet(set).files,
    harnessFingerprint: harness.fingerprint,
    adapters: adapters,
    capabilities: { guards: C.GUARDS, tasksWithAllocation: Object.keys(M.ALLOCATIONS_MS),
      worker: 'worker_threads, one request at a time, process-wide CPU read once at the host' },
    manifestHash: manifest.manifestHash,
    pairOrder: manifest.pairOrder,
    gate: gate,
    receipts: receipts,
    budget: budget,
    ledgerPath: C.toPosix(path.relative(repoRoot, path.join(roundDir, 'ledger.json'))),
    shards: shards,
    projectedMachineMs: projectedMs
  };
}

// --- validation outcome of one request ----------------------------------------------------------------------

function validationStatus(verdict) {
  if (!verdict) return 'unknown';
  const core = [verdict.solutionValid, verdict.givensAgree, verdict.structureValid, verdict.unique,
    verdict.canonicalEqual, verdict.requirednessAgree];
  if (core.some(function (v) { return v === false; })) return 'failed';
  if (core.some(function (v) { return v === null || v === undefined; }) || !verdict.fresh) return 'unknown';
  return 'verified';
}

function workTotals(work) {
  if (!Array.isArray(work)) return { ratings: null, proposals: null, capReasons: null };
  let ratings = 0;
  let proposals = 0;
  const reasons = [];
  work.forEach(function (w) {
    (w.localSearches || []).forEach(function (s) {
      proposals += s.proposals;
      reasons.push(s.capHit);
    });
    ratings += w.ratings;
  });
  return { ratings: ratings, proposals: proposals, capReasons: reasons };
}

/** The record of one finished request: generation, validation and the identity fields, everything else null. */
function recordOfRequest(job, obs, validation, hostInfo) {
  const rec = R.recordBase(job);
  rec.outcome = obs.outcome;
  rec.timeoutScope = obs.timeoutScope;
  rec.generation = obs.generation;
  rec.limits = { guardMs: obs.guard.guardMs, guardScope: obs.guard.scope, commandDeadlineMs: hostInfo.deadlineMs };
  rec.limitOrigin = 'research safety guard (' + obs.guard.scope + ')';
  rec.solverMode = job.solverMode || 'native';
  rec.poolWidth = 1;
  rec.error = obs.error;
  rec.terminateFailure = obs.terminateFailure || null;
  rec.lateDecision = obs.lateDecision === true;
  rec.adapterIds = job.adapterIds || [];
  rec.adapterProof = obs.ready ? obs.ready.proof : null;
  rec.transforms = obs.ready && obs.ready.transforms ? obs.ready.transforms.map(function (t) {
    return { id: t.id, file: t.file, beforeTextHash: t.beforeTextHash, afterTextHash: t.afterTextHash };
  }) : null;
  rec.engineElapsedMs = obs.engineElapsedMs;
  if (obs.outcome !== 'complete') return rec;

  const wire = obs.wire;
  const norm = R.normaliseWire(wire);
  const totals = workTotals(wire.work);
  rec.normalisedConfig = wire.config;
  rec.claimedExact = wire.exact === true;
  rec.puzzleHash = norm.digests.puzzle;
  rec.digests = norm.digests;
  rec.attemptsUsed = wire.attempts;
  rec.canonicalRatings = totals.ratings;
  rec.localProposals = totals.proposals;
  rec.localCapReasons = totals.capReasons;
  rec.achieved = wire.rating ? wire.rating.level : null;
  rec.score = wire.rating ? wire.rating.score : null;
  rec.warnings = wire.warnings;
  rec.engineTimingsMs = wire.timings;

  const verdict = validation && validation.status === 'ok' ? validation.verdict : null;
  const status = validationStatus(verdict);
  rec.validation = {
    wallMs: validation ? validation.wallMs : null,
    cpuMs: validation ? validation.cpuMs : null,
    solutionValid: verdict ? verdict.solutionValid : null,
    givensAgree: verdict ? verdict.givensAgree : null,
    structureValid: verdict ? verdict.structureValid : null,
    unique: verdict ? verdict.unique : null,
    canonicalEqual: verdict ? verdict.canonicalEqual : null
  };
  rec.validationDetail = { status: status, requirednessAgree: verdict ? verdict.requirednessAgree : null,
    cpuResolutionStatus: validation ? validation.cpuResolutionStatus : null, probe: validation ? validation.proof : null,
    errors: verdict ? verdict.errors : (validation && validation.error ? [validation.error.message] : []) };
  if (status === 'verified') {
    const fresh = verdict.fresh;
    rec.verifiedExact = fresh.solved === true && fresh.level === wire.config.difficulty && fresh.required === true;
    rec.required = fresh.required;
    rec.vacuous = fresh.vacuous;
    rec.shallow = fresh.shallow;
  } else if (status === 'failed') {
    rec.verifiedExact = false;
    rec.outcome = 'error';
    rec.error = { code: 'validation-failed', name: null, message: 'the independent audit rejected the puzzle',
      details: verdict.errors };
  } else {
    rec.outcome = 'validation-unknown';
  }
  if (rec.claimedExact === true && rec.verifiedExact === false) rec.identityViolation = 'false-exact-flag';
  return rec;
}

// --- the loader-parity checks -------------------------------------------------------------------------------

/** Native versus no-op-loader parity per pair: digests of every deterministic section, adapter proof, exactness. */
function parityReport(records) {
  const byPair = new Map();
  records.forEach(function (r) {
    if (!r.pairId) return;
    if (!byPair.has(r.pairId)) byPair.set(r.pairId, {});
    byPair.get(r.pairId)[r.arm] = r;
  });
  const pairs = [];
  byPair.forEach(function (arms, pairId) {
    const ref = arms.reference;
    const proto = arms.prototype;
    const present = function (r) { return !!r && r.outcome !== 'unstarted'; };
    if (!present(ref) && !present(proto)) {
      pairs.push({ pairId: pairId, verdict: 'not-started' });
      return;
    }
    // One arm has not run in this chain yet: the comparison is deferred, not failed, and is made when the mate
    // appears (a later attempt of the same resume chain). An arm that ran and did not complete is a failure.
    if (present(ref) !== present(proto)) {
      const have = present(ref) ? ref : proto;
      if (have.outcome === 'complete') {
        pairs.push({ pairId: pairId, verdict: 'deferred', waitingFor: present(ref) ? 'prototype' : 'reference',
          arm: have.arm });
        return;
      }
    }
    const problems = [];
    [ref, proto].forEach(function (r, i) {
      if (!r || r.outcome === 'unstarted') {
        problems.push((i === 0 ? 'reference' : 'prototype') + ' not run');
      } else if (r.outcome !== 'complete') {
        problems.push((i === 0 ? 'reference' : 'prototype') + ' outcome ' + r.outcome);
      }
    });
    let compared = null;
    if (ref && proto && ref.digests && proto.digests) {
      compared = R.compareDigests(ref.digests, proto.digests);
      if (!compared.equal) problems.push('digests differ in: ' + compared.differing.join(', '));
      if (ref.claimedExact !== proto.claimedExact || ref.verifiedExact !== proto.verifiedExact) {
        problems.push('exactness differs');
      }
      if (ref.claimedExact !== ref.verifiedExact) problems.push('native claimed exact differs from verified');
      if (ref.adapterProof && ref.adapterProof.hooksPresent !== false) problems.push('native instance has hooks');
      const p = proto.adapterProof;
      if (!p || p.hooksPresent !== true || p.exposed.indexOf('normalizeConfig') < 0 || p.normalizeConfigEqual !== true) {
        problems.push('no-op hook not proven');
      }
      if (!proto.transforms || proto.transforms.length === 0 ||
          proto.transforms.some(function (t) { return t.beforeTextHash === t.afterTextHash; })) {
        problems.push('no patched source recorded');
      }
    }
    pairs.push({
      pairId: pairId,
      verdict: problems.length === 0 ? 'parity-ok' : 'parity-failed',
      problems: problems,
      digestsEqual: compared ? compared.equal : null,
      differing: compared ? compared.differing : null,
      referenceDigest: ref && ref.digests ? ref.digests.all : null,
      prototypeDigest: proto && proto.digests ? proto.digests.all : null,
      sections: ref && ref.digests ? Object.keys(ref.digests).filter(function (k) { return k !== 'all'; }) : null,
      claimedExact: ref ? ref.claimedExact : null,
      verifiedExact: ref ? ref.verifiedExact : null,
      puzzleHash: ref ? ref.puzzleHash : null
    });
  });
  const count = function (verdict) { return pairs.filter(function (p) { return p.verdict === verdict; }).length; };
  return { pairs: pairs, failed: count('parity-failed'), ok: count('parity-ok'),
    deferred: count('deferred') + count('not-started'),
    complete: pairs.length > 0 && count('parity-ok') === pairs.length };
}

// --- command assembly ---------------------------------------------------------------------------------------

function classify(array, records, outcomes) {
  return array.filter(function (k) {
    const r = records.get(k);
    return r && outcomes.indexOf(r.outcome) >= 0;
  });
}

/** The command.json of an attempt from what the run observed. Shared with the self-test shard. */
function assembleCommand(ctx) {
  const byKey = new Map(ctx.records.map(function (r) { return [r.key, r]; }));
  const keys = ctx.plannedKeys;
  const completed = classify(keys, byKey, ['complete', 'validation-unknown']);
  const censored = classify(keys, byKey, ['request-timeout', 'sample-budget']);
  const errors = classify(keys, byKey, ['error']);
  const unstarted = classify(keys, byKey, ['unstarted']);
  const startedUnfinished = ctx.startedUnfinished || [];
  return {
    schema: C.SCHEMA,
    task: ctx.task,
    shard: ctx.shard,
    round: ctx.round,
    attemptId: ctx.attemptId,
    status: ctx.status,
    evidenceStatus: ctx.round === C.ROUND_FROZEN ? C.EVIDENCE_FROZEN : C.EVIDENCE_PROVISIONAL,
    runtimeLabel: ctx.runtimeLabel,
    runtimeFingerprint: ctx.runtimeFingerprint,
    runtimeFiles: ctx.runtimeFiles,
    sourceStable: ctx.sourceStable,
    harnessFingerprint: ctx.harnessFingerprint,
    adapterIds: ctx.adapterIds,
    adapterHashes: ctx.adapterHashes,
    catalogueSnapshot: ctx.catalogue ? ctx.catalogue.snapshot : null,
    catalogueFingerprint: ctx.catalogue ? ctx.catalogue.fingerprint : null,
    machine: machineInfo(),
    manifestHash: ctx.manifestHash,
    pairOrder: ctx.pairOrder,
    plannedKeys: keys,
    completedKeys: completed,
    censoredKeys: censored,
    errorKeys: errors,
    startedUnfinishedKeys: startedUnfinished,
    unstartedKeys: unstarted,
    logicalBlockKeys: ctx.logicalBlockKeys,
    physicalPlanHash: ctx.physicalPlanHash,
    physicalPlan: ctx.physicalPlan,
    guards: ctx.guards,
    lock: ctx.lock,
    timing: ctx.timing,
    exit: R.exitCodeForStatus(ctx.status),
    error: ctx.error || null,
    budgetLedgerReference: ctx.budgetLedgerReference,
    gate: ctx.gate,
    cpu: ctx.cpu,
    firewallClean: ctx.firewallClean,
    firewallDiff: ctx.firewallDiff,
    resumeOf: ctx.resumeOf || null,
    chain: ctx.chain || null,
    pause: ctx.pause || null,
    parity: ctx.parity || null,
    selfTestPassed: ctx.selfTestPassed === undefined ? null : ctx.selfTestPassed,
    notes: ctx.notes || []
  };
}

function timingOf(processStartedAt, requestedAt) {
  const endedAt = C.isoNow();
  const occupiedMs = Math.round(Date.now() - performance.timeOrigin);
  return {
    requestedAt: requestedAt || null,
    admittedAt: processStartedAt,
    endedAt: endedAt,
    occupiedMs: occupiedMs,
    chargedGraceMs: C.GUARDS.graceMs,
    priorityWaitMs: requestedAt ? Math.max(0, Date.parse(processStartedAt) - Date.parse(requestedAt)) : null
  };
}

function writeFinalEvidence(repoRoot, att, parts) {
  C.writeJsonAtomic(repoRoot, att.files.records, parts.recordsDoc);
  C.writeJsonAtomic(repoRoot, att.files.firewallAfter, parts.firewallAfter);
  C.writeJsonAtomic(repoRoot, att.files.command, parts.command);
  C.writeJsonAtomic(repoRoot, att.files.summary, parts.summary);
  C.writeTextExclusive(repoRoot, att.files.summaryMd, R.renderSummaryMarkdown(parts.summary));
}

// --- the shard run ------------------------------------------------------------------------------------------

/**
 * The resume decision. `prev` is the command.json of a paused attempt and must be the evidence of an attempt of this
 * shard that nothing has resumed yet. Only the keys of its run chain count as started (an unrelated older attempt is
 * a different run); the keys handed on are the never-started ones, under identical manifest, runtime and harness
 * fingerprints.
 */
function resolveResume(input) {
  const prev = input.prev;
  if (prev.task !== input.manifest.task || prev.round !== input.manifest.round || prev.shard !== input.shard.shard) {
    throw new HarnessError('resume-refused', 'the command.json is of another task, round or shard');
  }
  const prevAttempt = input.existing.find(function (a) { return a.attemptId === prev.attemptId; });
  if (!prevAttempt || !prevAttempt.command || C.digestOf(prevAttempt.command) !== C.digestOf(prev)) {
    throw new HarnessError('resume-refused', 'the command.json is not the evidence of an attempt of this shard');
  }
  if (input.existing.some(function (a) {
    return a.command && a.command.resumeOf && a.command.resumeOf.attemptId === prev.attemptId;
  })) {
    throw new HarnessError('resume-refused', 'attempt ' + prev.attemptId + ' was already resumed');
  }
  const chain = R.chainOf(input.existing, prev.attemptId);
  const selection = R.selectResumable({
    command: prev, manifestHash: input.manifest.manifestHash, runtimeFingerprint: input.runtimeFingerprint,
    harnessFingerprint: input.harnessFingerprint, jobs: M.jobsOf(input.manifest, input.shard.jobKeys),
    attempts: chain.map(function (a) { return a.command; }).filter(Boolean), startedKeys: R.startedKeysOf(chain)
  });
  if (!selection.ok) throw new HarnessError('resume-refused', 'cannot resume: ' + selection.reason);
  if (selection.keys.length === 0) {
    throw new HarnessError('resume-refused', 'no never-started key is left to resume');
  }
  return { keys: selection.keys, chain: chain,
    resumeOf: { attemptId: prev.attemptId, manifestHash: prev.manifestHash, refused: selection.refused } };
}

/**
 * Record lists merged by key, oldest first: a real record is never replaced by an `unstarted` placeholder, and a
 * placeholder is replaced by the real record of a later attempt of the chain.
 */
function mergeRecords(lists) {
  const byKey = new Map();
  lists.forEach(function (list) {
    list.forEach(function (r) {
      const earlier = byKey.get(r.key);
      if (!earlier || earlier.outcome === 'unstarted' || r.outcome !== 'unstarted') byKey.set(r.key, r);
    });
  });
  return Array.from(byKey.values());
}

/** What this attempt started against what the chain had started: proof that nothing was started twice. */
function buildChainInfo(input) {
  const startedBefore = R.startedKeysOf(input.chain);
  const startedHere = input.keys.filter(function (k) { return input.unstartedKeys.indexOf(k) < 0; });
  const rerunKeys = startedHere.filter(function (k) { return startedBefore.indexOf(k) >= 0; });
  const merged = new Map(input.mergedRecords.map(function (r) { return [r.key, r]; }));
  return {
    attempts: input.chain.map(function (a) { return a.attemptId; }).concat([input.attemptId]),
    resumed: input.resumed,
    startedBefore: startedBefore,
    startedHere: startedHere,
    rerunKeys: rerunKeys,
    noRerun: rerunKeys.length === 0,
    unstartedAfter: input.shardKeys.filter(function (k) {
      const r = merged.get(k);
      return !r || r.outcome === 'unstarted';
    })
  };
}

async function runShard(opts, repoRoot) {
  const H = require('./host.cjs');
  const processStartedAt = new Date(performance.timeOrigin).toISOString();
  const manifest = M.buildManifest(opts.task, opts.round);
  const shard = M.shardOf(manifest, opts.shard);
  if (!shard) throw new HarnessError('plan-missing', 'unknown shard ' + opts.shard);
  if (shard.kind === 'synthetic') {
    throw new HarnessError('shard-kind', shard.shard + ' is a synthetic shard: it is run by self-test.cjs');
  }
  const evidenceRoot = evidenceRootOf(repoRoot);
  const roundDir = path.join(evidenceRoot, opts.round);
  const shardDir = R.shardDirOf(evidenceRoot, opts.round, opts.task, shard.shard);
  const expectedTask = opts.task + '/' + shard.shard;

  const before = L.loadSourceSet({ repoRoot: repoRoot });
  const harness = C.harnessFingerprint();
  const freezeReceipt = readReceipt(opts.freezeReceipt, 'freeze');
  const budgetReceipt = readReceipt(opts.budgetReceipt, 'budget');
  // Before anything is opened or generated: both receipts valid and fingerprinting this runtime, then the lock.
  assertFrozenReceipts({ round: opts.round, freezeReceipt: freezeReceipt, budgetReceipt: budgetReceipt,
    runtimeFingerprint: before.fingerprint });
  const lock = observeLock(expectedTask);
  assertLockOwned(lock, expectedTask);

  // Resume or fresh attempt: never a hidden retry.
  const existing = R.listAttempts(shardDir);
  let keys = shard.jobKeys.slice();
  let resumeOf = null;
  let chain = [];
  if (opts.resume) {
    const resumed = resolveResume({ prev: C.readJson(opts.resume), existing: existing, manifest: manifest,
      shard: shard, runtimeFingerprint: before.fingerprint, harnessFingerprint: harness.fingerprint });
    keys = resumed.keys;
    resumeOf = resumed.resumeOf;
    chain = resumed.chain;
  } else if (existing.length > 0 && !opts.attempt) {
    throw new HarnessError('attempt-exists', 'the shard already has evidence; a new attempt needs --attempt=aN ' +
      'or --resume');
  }
  const attemptId = opts.attempt || (opts.resume ? R.nextAttemptId(existing) : 'a1');

  // Budget and deadline: the dispatcher's figure, never beyond the remaining task/round time.
  const ledger = readLedger(roundDir);
  const budget = M.budgetState({ task: opts.task, round: opts.round,
    charges: R.collectCharges(ledger, R.scanRoundCommands(roundDir)), approvals: ledger.approvals,
    receipt: budgetReceipt });
  const deadlineMs = Math.min(opts.deadlineMs === null ? C.GUARDS.commandMs : opts.deadlineMs,
    budget.effectiveDeadlineMs);
  if (!(deadlineMs >= C.GUARDS.minWindowMs + C.GUARDS.finalizeReserveMs)) {
    throw new HarnessError('budget-exhausted', 'the remaining task/round budget does not admit a command');
  }

  // Adapters are dry-run now: an ambiguous anchor or a patch that does not compile stops before any request.
  const jobs = M.jobsOf(manifest, keys);
  const adapterSets = uniqueAdapterSets(jobs);
  const loadPlans = adapterSets.map(function (ids) {
    return { adapterIds: ids, plan: L.describePlan(L.buildLoadPlan(before, ids.map(L.getAdapter))) };
  });
  const allAdapters = [];
  adapterSets.forEach(function (ids) { ids.forEach(function (id) { if (allAdapters.indexOf(id) < 0) allAdapters.push(id); }); });

  const physical = M.packCommands(M.blocksFor(manifest, keys), M.commandWindowMs(deadlineMs));
  const thisCommand = physical.commands.length > 0 ? physical.commands[0] : { jobKeys: [], blockKeys: [] };
  const runKeys = new Set(thisCommand.jobKeys);

  const att = R.openAttempt(repoRoot, shardDir, attemptId);
  const fwBefore = L.takeFirewall({ repoRoot: repoRoot });
  const host = new H.Host({ repoRoot: repoRoot, runtimeFingerprint: before.fingerprint, deadlineMs: deadlineMs });
  host.calibrate();
  const journal = new R.Journal(repoRoot, att.files.journal, keys);
  journal.append('command-start', { task: opts.task, shard: shard.shard, attemptId: attemptId, keys: keys,
    manifestHash: manifest.manifestHash, physicalPlanHash: physical.hash });
  C.writeJsonAtomic(repoRoot, att.files.manifest, { manifest: manifest, attemptKeys: keys,
    runKeys: Array.from(runKeys), physicalPlan: physical });
  C.writeJsonAtomic(repoRoot, att.files.sourceManifest, { schema: C.SCHEMA, evidenceStatus: manifest.evidenceStatus,
    source: L.describeSourceSet(before), harness: harness, loadPlans: loadPlans });
  C.writeJsonAtomic(repoRoot, att.files.firewallBefore, fwBefore.snapshot);

  let stop = null;
  let pause = null;
  let catalogue = null;
  let fatalError = null;
  let loopError = null;
  let prepared = null;
  const hooks = taskHooks(opts.task);
  const runtimeProblems = [];
  // A frozen run refuses the job the moment its worker reports a catalogue other than the one the receipt froze.
  const readyCheck = opts.round === C.ROUND_FROZEN ? function (ready) {
    if (!ready.catalogue || ready.catalogue.fingerprint === freezeReceipt.catalogueFingerprint) return null;
    return { code: 'frozen-catalogue-mismatch', message: 'the loaded catalogue is not the one the freeze receipt names' };
  } : null;
  try {
    if (hooks && hooks.prepare) {
      // Task preparation under the same lock: the unmeasured catalogue probe and, in the first shard, its synthetic tests.
      prepared = await hooks.prepare({ host: host, shard: shard, repoRoot: repoRoot, jobs: jobs,
        runKeys: runKeys, readyCheck: readyCheck, round: opts.round });
      if (prepared.catalogue && catalogue === null) catalogue = prepared.catalogue;
      if (prepared.failure) {
        fatalError = new HarnessError(prepared.failure.code, prepared.failure.message);
        stop = 'task-prepare';
      }
    }
    for (const job of jobs) {
      if (!runKeys.has(job.key) || stop) continue;
      if (!host.canAdmit(job.estimateMs)) {
        pause = { reason: host.expired() ? 'command-deadline' : 'window', remainingMs: Math.round(host.remainingMs()),
          nextKey: job.key };
        break;
      }
      journal.start(job.key);
      const obs = hooks && hooks.execute && job.executor ? await hooks.execute({ host: host, job: job,
        catalogue: catalogue, readyCheck: readyCheck }) : await host.runRequest({ key: job.key,
        request: job.request, adapterIds: job.adapterIds, guardScope: job.guardScope,
        wantCatalogue: catalogue === null, readyCheck: readyCheck });
      if (obs.ready && obs.ready.catalogue && catalogue === null) catalogue = obs.ready.catalogue;
      let validation = null;
      if (obs.outcome === 'complete' && !host.stopped) {
        validation = await host.runValidation(obs.wire, { level: job.level });
      }
      const rec = recordOfRequest(job, obs, validation, { deadlineMs: deadlineMs });
      if (hooks && hooks.augmentRecord) {
        hooks.augmentRecord(rec, job, obs, { repoRoot: repoRoot, attemptDir: att.dir, catalogue: catalogue,
          evidenceRoot: evidenceRoot });
      }
      journal.finish(job.key, rec);
      if (obs.fatal) {
        fatalError = new HarnessError(obs.fatal, obs.error.message);
        stop = obs.fatal === 'source-changed' ? 'source-changed' : 'unsupported-source';
      } else if (rec.identityViolation) {
        runtimeProblems.push(rec.identityViolation + ' at ' + job.key);
      }
      // A worker that cannot be terminated stops the run: it is reported, never forgotten.
      if (host.stopped) {
        runtimeProblems.push('a worker did not terminate (' + host.stopped + ') after ' + job.key);
        stop = stop || 'terminate-timeout';
      }
    }
  } catch (err) {
    loopError = err;
  } finally {
    await host.terminateAll();
  }
  const stillOwned = host.workers.size;

  const after = L.loadSourceSet({ repoRoot: repoRoot });
  const stable = L.compareSourceSets(before, after);
  const harnessAfter = C.harnessFingerprint();
  const fwAfter = L.takeFirewall({ repoRoot: repoRoot });
  const fwDiff = L.diffFirewall(fwBefore, fwAfter);

  const recon = R.reconcile(keys, C.readJsonl(att.files.journal));
  const records = R.buildRecords(jobs, recon);
  const recordProblems = [];
  records.forEach(function (r) { R.checkRecord(r).forEach(function (p) { recordProblems.push(r.key + ': ' + p); }); });
  if (!recon.ok) recon.problems.forEach(function (p) { recordProblems.push('journal: ' + p); });

  // The resume chain: what earlier attempts of this run already recorded, and proof that nothing was started twice.
  const chainLists = chain.map(function (a) {
    const file = path.join(a.dir, R.EVIDENCE_FILES.records);
    return fs.existsSync(file) ? C.readJson(file).records : [];
  });
  const merged = mergeRecords(chainLists.concat([records]));
  const chainInfo = buildChainInfo({ chain: chain, attemptId: attemptId, resumed: resumeOf !== null, keys: keys,
    unstartedKeys: recon.unstarted, shardKeys: shard.jobKeys, mergedRecords: merged });
  const rerunKeys = chainInfo.rerunKeys;
  // Parity is decided over the whole chain: a pair whose mate has not run yet is deferred, not failed.
  const mergedByKey = new Map(merged.map(function (r) { return [r.key, r]; }));
  const shardRecords = M.jobsOf(manifest, shard.jobKeys).map(function (j) {
    return mergedByKey.get(j.key);
  }).filter(Boolean);
  let parity = null;
  if (shard.shard === 'loader-parity') parity = parityReport(shardRecords);
  else if (hooks && hooks.identity) parity = hooks.identity(shardRecords);
  const gate = R.evaluateGate({ round: opts.round, freezeReceipt: freezeReceipt, budgetReceipt: budgetReceipt,
    runtimeFingerprint: before.fingerprint, catalogueFingerprint: catalogue ? catalogue.fingerprint : null });

  let status = 'complete';
  const unstartedNow = recon.unstarted;
  if (loopError) status = C.exitCodeOf(loopError) === 2 ? 'unsupported-source' : 'error';
  else if (stop === 'unsupported-source') status = 'unsupported-source';
  else if (stop === 'source-changed' || !stable.stable || harness.fingerprint !== harnessAfter.fingerprint) {
    status = 'source-changed';
  } else if (!fwDiff.clean) status = 'firewall-violation';
  else if (stop === 'terminate-timeout' || stop === 'task-prepare' || stillOwned > 0) status = 'error';
  else if (runtimeProblems.length > 0 || rerunKeys.length > 0) status = 'identity-violation';
  else if (recordProblems.length > 0) status = 'error';
  else if (records.some(function (r) { return r.outcome === 'error'; })) status = 'validation-failed';
  else if (parity && parity.failed > 0) status = 'parity-failed';
  else if (unstartedNow.length > 0) status = 'paused-unstarted';
  if (status === 'paused-unstarted' && !pause) {
    pause = { reason: thisCommand.jobKeys.length === 0 ? 'no-admissible-job' : 'next-physical-command',
      remainingMs: Math.round(host.remainingMs()), nextKey: unstartedNow[0] };
  }

  const timing = timingOf(processStartedAt, opts.requestedAt);
  const command = assembleCommand({
    task: opts.task, shard: shard.shard, round: opts.round, attemptId: attemptId, status: status,
    runtimeLabel: opts.runtimeLabel || DEFAULT_RUNTIME_LABEL, runtimeFingerprint: before.fingerprint,
    runtimeFiles: L.describeSourceSet(before).files, sourceStable: stable.stable && harness.fingerprint ===
      harnessAfter.fingerprint, harnessFingerprint: harness.fingerprint, adapterIds: allAdapters,
    adapterHashes: allAdapters.map(function (id) { return C.digestOf(L.getAdapter(id)); }), catalogue: catalogue,
    manifestHash: manifest.manifestHash, pairOrder: manifest.pairOrder, plannedKeys: keys, records: records,
    startedUnfinished: recon.startedUnfinished, logicalBlockKeys: M.blocksFor(manifest, keys).map(function (b) {
      return b.blockKey;
    }), physicalPlanHash: physical.hash,
    physicalPlan: { windowMs: physical.windowMs, commands: physical.commands.length, thisCommandKeys:
      thisCommand.jobKeys, oversize: physical.oversize }, guards: host.guards,
    lock: { wrapperPath: opts.lockHelper, ownerText: 'IG ' + expectedTask, expectedTask: expectedTask, observed: lock },
    timing: timing, error: loopError ? { code: loopError.code || null, message: String(loopError.message) } :
      (fatalError ? { code: fatalError.code, message: fatalError.message } :
        (stop === 'terminate-timeout' ? { code: 'terminate-timeout', message: 'a worker did not terminate; ' +
          stillOwned + ' still owned, the run stopped' } : null)),
    budgetLedgerReference: { ledger: C.toPosix(path.relative(repoRoot, path.join(roundDir, 'ledger.json'))),
      stateBefore: budget }, gate: gate,
    cpu: Object.assign({}, host.cpu, { commandCpuMs: host.commandCpuMs(), processAgeAtHostMs: host.processAgeMs }),
    firewallClean: fwDiff.clean, firewallDiff: { added: fwDiff.added, removed: fwDiff.removed,
      changed: fwDiff.changed }, resumeOf: resumeOf, chain: chainInfo, pause: pause, parity: parity,
    notes: [].concat(runtimeProblems, recordProblems, rerunKeys.map(function (k) { return 'started twice: ' + k; }),
      stable.stable ? [] : ['sources changed: ' + stable.changed.concat(stable.added, stable.removed).join(', ')],
      prepared && prepared.notes ? prepared.notes : [])
  });
  const taskSummary = hooks && hooks.summary ? hooks.summary({ command: command, records: records, parity: parity,
    chainInfo: chainInfo, prepared: prepared, shard: shard.shard, mergedRecords: shardRecords }) : null;
  const summary = R.buildSummary({ command: command, records: records,
    extra: taskSummary ? taskSummary.extra : (parity ? { loaderParity: parity, chain: chainInfo } : null),
    estimateVerdict: taskSummary ? taskSummary.estimateVerdict :
      'not applicable: IG-S01 is infrastructure only and confirms no speed estimate',
    exclusions: taskSummary ? taskSummary.exclusions : ['correctness controls, not timing observations'] });
  writeFinalEvidence(repoRoot, att, { recordsDoc: { schema: C.SCHEMA, task: opts.task, shard: shard.shard,
    round: opts.round, attemptId: attemptId, evidenceStatus: command.evidenceStatus, manifestHash:
    manifest.manifestHash, records: records }, firewallAfter: Object.assign({}, fwAfter.snapshot, { diff: {
    clean: fwDiff.clean, added: fwDiff.added, removed: fwDiff.removed, changed: fwDiff.changed } }),
  command: command, summary: summary });
  journal.append('command-end', { status: status, exit: command.exit });
  return { command: command, dir: att.dir };
}

async function main(argv) {
  const opts = parseArgs(argv);
  const repoRoot = C.DEFAULT_REPO_ROOT;
  if (opts.planOnly) {
    process.stdout.write(JSON.stringify(planOnly(opts, repoRoot)) + '\n');
    return 0;
  }
  const out = await runShard(opts, repoRoot);
  process.stdout.write(JSON.stringify({ ig: 'command', task: out.command.task, shard: out.command.shard,
    attemptId: out.command.attemptId, status: out.command.status, exit: out.command.exit,
    evidence: C.toPosix(path.relative(repoRoot, out.dir)) }) + '\n');
  return out.command.exit;
}

module.exports = { parseArgs, observeLock, assertLockOwned, assertFrozenReceipts, planOnly, runShard, resolveResume,
  mergeRecords, buildChainInfo, validationStatus, parityReport, assembleCommand, timingOf, writeFinalEvidence,
  machineInfo, readLedger, evidenceRootOf, recordOfRequest, DEFAULT_RUNTIME_LABEL };

if (require.main === module) {
  const finish = function (code) {
    process.exitCode = code;
    // Flush what was written, then leave even if a handle were left open: the wrapper's backstop is 300 s.
    process.stdout.write('', function () { process.exit(code); });
  };
  main(process.argv.slice(2)).then(finish, function (err) {
    process.stderr.write('IG error [' + (err && err.code ? err.code : 'unexpected') + ']: ' +
      (err && err.message ? err.message : String(err)) + '\n');
    finish(C.exitCodeOf(err));
  });
}
