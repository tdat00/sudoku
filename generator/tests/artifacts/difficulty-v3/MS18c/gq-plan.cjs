'use strict';

/*
 * MS18c Stage 3 task-owned PLANNER of one supervised admission attempt (the Node side of
 * supervise-gq.ps1). Each command prints ONE JSON line; the decision logic is the pure journal.cjs, the
 * authority is the committed manifest (manifest.cjs / verify.cjs) and nothing here takes an A/T/O from
 * the developer:
 *
 *   peek      (before the lock; no hashing) journal, disk, liveness and authorization:
 *             adopt | start | close | recover-record | wait | refuse
 *   hostcheck (under the lock) the full confirmed host tuple, so a CLI restart burns no admission
 *   begin     (UNDER the lock, before the sampling) the frozen-input verification, the decision again,
 *             the durable reservations (close-out, recovery claim, admission-begin) and the attempt
 *             directory with its launch-spec.json; or the recovery of a readable record of a lost run
 *   post      (under the lock, after the owned tree exited) the journal events of the end of the
 *             attempt; for a complete record the revision-2 monitor with the mandatory canonical
 *             validation, the receipt and the single copy of the raw bytes when it passed
 *
 * A recovery (S-OD14) needs a committed one-use joint authorization naming a positively diagnosed fault
 * class that the journal itself supports; a close-out never grants a payload opportunity or resets a
 * counter. Records, partial files and canonical copies are inspected first and are never rerun.
 *   node gq-plan.cjs peek|hostcheck|begin|post --cell=<variant/level> [--name=value ...]
 */
const fs = require('fs');
const path = require('path');
const util = require('./util.cjs');
const rules = require('./rules.cjs');
const host = require('./host.cjs');
const journal = require('./journal.cjs');
const gitro = require('./gitro.cjs');
const manifestLib = require('./manifest.cjs');
const verifyLib = require('./verify.cjs');
const monitor = require('./monitor.cjs');
const inputs = require('./inputs.cjs');
const admission = require('./admission.cjs');

const DEFAULT_PATHS = Object.freeze({ runs: util.RUNS, qualification: util.QUALIFICATION });
const AUTH_SCHEMA = 'MS18c-gq-recovery-authorization-v2';
const PROOF_SCHEMA = 'MS18c-gq-termination-proof-v1';
const LOCK_STATES = ['absent', 'orchestrator-cleanup'];
const isObject = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const isHex = (x, n) => typeof x === 'string' && new RegExp('^[0-9a-f]{' + n + '}$').test(x);

function cellFiles(paths, key) {
  const name = util.cellDirName(key);
  const dir = path.join(paths.runs, name);
  return {
    name: name, dir: dir, journal: path.join(dir, 'journal.jsonl'),
    receipt: path.join(dir, 'acceptance-receipt.json'), refusals: path.join(dir, 'refusals.jsonl'),
    canonJson: path.join(paths.qualification, name + '.json'),
    canonMd: path.join(paths.qualification, name + '.md')
  };
}

const attemptDirOf = (paths, key, slot, ordinal) =>
  path.join(cellFiles(paths, key).dir, 'payload-' + slot, 'admission-' + ordinal);

const sha256File = (file) => util.sha256(fs.readFileSync(file));
const relIn = (files, file) => path.relative(files.dir, file).replace(/\\/g, '/');

/**
 * The record artifacts of a cell: `readable` qualifier.json files, `artifacts` (corrupt qualifier.json and
 * qualifier partial files, as { path relative to the cell folder, sha256 }) and `canonical` copies. Only
 * corrupt or partial artifacts can ever be acknowledged by an authorization; a readable record never can.
 */
function recordArtifacts(files, disk) {
  const readable = [];
  const artifacts = [];
  disk.records.forEach((f) => {
    try {
      JSON.parse(fs.readFileSync(f, 'utf8'));
      readable.push(f);
    } catch (err) {
      artifacts.push({ path: relIn(files, f), sha256: sha256File(f) });
    }
  });
  disk.recordPartials.forEach((f) => artifacts.push({ path: relIn(files, f), sha256: sha256File(f) }));
  const canonical = [files.canonJson, files.canonMd].filter((f) => fs.existsSync(f));
  return { readable: readable, artifacts: artifacts, canonical: canonical };
}

/** The job members the supervisor recorded for an attempt (pid + CIM creation time), or null if unknown. */
function readMembersSeen(dir) {
  try {
    const status = JSON.parse(fs.readFileSync(path.join(dir, 'status.json'), 'utf8'));
    if (!Array.isArray(status.membersSeen)) return null;
    return status.membersSeen.map((m) => ({ pid: m.pid, createdUtcMicros: m.createdUtcMicros || null }));
  } catch (err) {
    return null;
  }
}

const sameRun = (a, b) => Boolean(isObject(a) && isObject(b) && a.runId === b.runId && a.slot === b.slot &&
  a.ordinal === b.ordinal && isObject(a.supervisor) && isObject(b.supervisor) &&
  a.supervisor.pid === b.supervisor.pid && a.supervisor.createdUtcMicros === b.supervisor.createdUtcMicros);

/** The evidence file of a reference { path, sha256 } under the cell's recovery folder; its bytes or null. */
function evidenceBytes(ref, label, ctx, problems) {
  if (!isObject(ref) || typeof ref.path !== 'string' || !isHex(ref.sha256, 64)) {
    problems.push('the ' + label + ' reference (path and SHA-256) is missing');
    return null;
  }
  const wanted = 'docs/difficulty-v3/evidence/MS18c/recovery/' + util.cellDirName(ctx.key) + '/';
  if (ref.path.replace(/\\/g, '/').indexOf(wanted) !== 0) {
    problems.push('the ' + label + ' is not under ' + wanted);
  }
  const bytes = ctx.readBytes ? ctx.readBytes(path.join(util.REPO, ref.path)) : null;
  if (!bytes || util.sha256(bytes) !== ref.sha256) {
    problems.push('the ' + label + ' file does not hash to its reference');
    return null;
  }
  return bytes;
}

/** The problems of the termination proof: the supervisor and every owned member gone, the lock state. */
function proofProblems(bytes, ctx) {
  const problems = [];
  let proof = null;
  try {
    proof = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
  } catch (err) {
    return ['the termination proof is not JSON'];
  }
  const f = ctx.facts;
  const concerned = f.concerned;
  if (!isObject(proof) || proof.schema !== PROOF_SCHEMA) {
    problems.push('the termination proof has no ' + PROOF_SCHEMA);
  }
  if (!concerned || proof.runId !== concerned.runId) {
    problems.push('the termination proof does not concern run ' + (concerned && concerned.runId));
  }
  if (proof.allGone !== true) {
    problems.push('the termination proof does not state that everything is gone');
  }
  if (concerned && !(isObject(proof.supervisor) && concerned.supervisor &&
      proof.supervisor.pid === concerned.supervisor.pid &&
      proof.supervisor.createdUtcMicros === concerned.supervisor.createdUtcMicros)) {
    problems.push('the termination proof does not identify the journalled supervisor (PID, creation time)');
  }
  if (!Array.isArray(f.membersSeen)) {
    problems.push('the owned job members of run ' + (concerned && concerned.runId) + ' are unknown');
  } else {
    const key = (m) => m.pid + '|' + m.createdUtcMicros;
    const want = f.membersSeen.map(key).sort();
    const got = Array.isArray(proof.members) ? proof.members.map(key).sort() : null;
    if (rules.canon(want) !== rules.canon(got)) {
      problems.push('the termination proof does not list exactly the recorded owned job members');
    }
  }
  const lock = proof.lock;
  if (!isObject(lock) || LOCK_STATES.indexOf(lock.state) === -1) {
    problems.push('the termination proof does not record the lock state (' + LOCK_STATES.join(' or ') + ')');
  } else if (lock.state === 'orchestrator-cleanup' &&
      !(isObject(lock.cleanupProof) && typeof lock.cleanupProof.path === 'string' &&
        isHex(lock.cleanupProof.sha256, 64))) {
    problems.push('an orchestrator lock cleanup needs its recorded proof (path and SHA-256)');
  }
  return problems;
}

/**
 * Problems of a recovery authorization object. ctx: { key, epoch, manifestBlob, manifest, readBytes, facts }
 * with facts = journal.recoveryFacts(state) plus { concerned, membersSeen, artifacts }.
 */
function authorizationProblems(auth, ctx) {
  if (!isObject(auth)) return ['the authorization is not an object'];
  const problems = [];
  const f = ctx.facts;
  const eq = (label, got, want) => {
    if (got !== want) problems.push(label + ' is ' + JSON.stringify(got) + ', not ' + want);
  };
  eq('schema', auth.schema, AUTH_SCHEMA);
  eq('epoch', auth.epoch, ctx.epoch);
  eq('cell', auth.cell, ctx.key);
  eq('ownerDecision', auth.ownerDecision, 'S-OD14');
  eq('manifestBlob', auth.manifestBlob, ctx.manifestBlob);
  eq('slot', auth.slot, 2);
  eq('admissions', auth.admissions, 2);
  if (journal.FAULT_CLASSES.indexOf(auth.faultClass) === -1) {
    problems.push('faultClass ' + JSON.stringify(auth.faultClass) + ' is not on the allowlist of ' +
      'positively diagnosed faults (' + journal.FAULT_CLASSES.join(', ') + ')');
  } else if (f.classes.indexOf(auth.faultClass) === -1) {
    problems.push('faultClass ' + auth.faultClass + ' does not match the journal of slot 1 (it supports: ' +
      (f.classes.join(', ') || 'none') + ')');
  }
  if (rules.canon(auth.primaryRuns) !== rules.canon(f.primaryRuns)) {
    problems.push('primaryRuns are not the slot-1 runs of the journal');
  }
  if (f.open) {
    if (!sameRun(auth.closesRun, f.open)) {
      problems.push('closesRun does not name the open run ' + f.open.runId + ' with its supervisor PID and ' +
        'creation time');
    }
  } else if (auth.closesRun) {
    if (!f.lost.some((l) => sameRun(auth.closesRun, l))) {
      problems.push('closesRun names a run that the journal did not close out');
    }
  } else if (f.lost.some((l) => l.slot === 1)) {
    problems.push('a slot-1 run was closed out as lost, but closesRun does not name it');
  }
  const proofBytes = evidenceBytes(auth.terminationProof, 'termination proof', ctx, problems);
  if (proofBytes) proofProblems(proofBytes, ctx).forEach((p) => problems.push(p));
  evidenceBytes(auth.diagnosis, 'diagnosis', ctx, problems);
  const id = ctx.manifest.identities;
  const inp = auth.inputs;
  if (!isObject(inp) || inp.engineSources !== id.source.engineSources ||
      inp.qualifierHash !== id.tool.qualifierHash || inp.attemptPolicyDigest !== id.attemptPolicy.digest) {
    problems.push('inputs (engineSources, qualifierHash, attemptPolicyDigest) are not the manifest\'s');
  }
  const ap = auth.approvals;
  if (!isObject(ap) || typeof ap.sa1 !== 'string' || ap.sa1 === '' || typeof ap.sa2 !== 'string' ||
      ap.sa2 === '' || ap.sa1 === ap.sa2) {
    problems.push('approvals need two distinct references, sa1 and sa2');
  }
  if (auth.acknowledgedArtifacts !== undefined) {
    const list = auth.acknowledgedArtifacts;
    if (!Array.isArray(list)) {
      problems.push('acknowledgedArtifacts is not a list');
    } else {
      list.forEach((a) => {
        const there = isObject(a) && f.artifacts.some((x) => x.path === a.path && x.sha256 === a.sha256);
        if (!there) {
          problems.push('acknowledgedArtifacts names an artifact that is not there or whose bytes changed: ' +
            JSON.stringify(a && a.path));
        }
      });
    }
  }
  return problems;
}

/** The committed one-use authorization of a cell: exists in HEAD, working tree = blob, valid content. */
function loadAuthorization(key, ctx, deps) {
  const d = deps || {};
  const git = d.git || gitro.createGit(util.REPO);
  const rel = util.RECOVERY_DIR + '/' + util.cellDirName(key) + '.json';
  const abs = path.join(util.REPO, rel);
  const exists = d.exists || ((f) => fs.existsSync(f));
  const readBytes = d.readBytes || ((f) => (fs.existsSync(f) ? fs.readFileSync(f) : null));
  const problems = [];
  const atHead = git(['rev-parse', '--verify', '--quiet', 'HEAD:' + rel]);
  if (atHead.status !== 0) {
    return { ok: false, problems: ['no recovery authorization is committed in HEAD for ' + key] };
  }
  if (!exists(abs)) return { ok: false, problems: ['the authorization is not in the working tree'] };
  const bytes = readBytes(abs);
  const hashed = git(['hash-object', rel]);
  if (hashed.status !== 0 || hashed.stdout !== atHead.stdout) {
    problems.push('the authorization does not equal its committed blob');
  }
  if (git(['diff', '--quiet', 'HEAD', '--', rel]).status !== 0) {
    problems.push('git diff reports the authorization as changed');
  }
  let auth = null;
  try {
    auth = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
  } catch (err) {
    problems.push('the authorization is not JSON');
  }
  if (auth) {
    const context = Object.assign({ readBytes: readBytes }, ctx, { key: key });
    authorizationProblems(auth, context).forEach((p) => problems.push(p));
  }
  return { ok: problems.length === 0, problems: problems, blob: atHead.stdout,
    sha256: util.sha256(bytes), data: auth };
}

/** The supervisor of the open attempt: matches (same instance) or dead (gone, or another instance). */
function liveOf(state, observeProcess) {
  if (!state.open) return null;
  const supervisor = state.open.supervisor;
  if (!supervisor || !Number.isInteger(supervisor.pid)) {
    return { matches: false, dead: false, reason: 'no journalled supervisor' };
  }
  const seen = observeProcess(supervisor.pid, host.CALL_SECONDS);
  if (seen.observed) {
    const now = host.supervisorIdentity(seen.observed.pid, seen.observed.cimCreatedUtc);
    const matches = host.sameInstance(supervisor, now);
    return { matches: matches, dead: !matches, observed: now };
  }
  if (seen.absent) return { matches: false, dead: true, reason: seen.reason };
  return { matches: false, dead: false, timedOut: seen.timedOut, reason: seen.reason || 'unknown' };
}

/**
 * Proof by the tool itself that the supervisor and every recorded owned job member of an attempt are gone
 * (not running, or a process with another creation time). Unknown members, a failed or timed-out query and
 * any live member are all refusals.
 */
function ownedGone(key, ref, deps) {
  const dir = attemptDirOf(deps.paths, key, ref.slot, ref.ordinal);
  const members = readMembersSeen(dir);
  if (members === null) {
    return { ok: false, code: 'owned-members-unknown',
      reason: 'the owned job members of run ' + ref.runId + ' are unknown (no readable status.json)' };
  }
  const pids = members.map((m) => m.pid).concat([ref.supervisor.pid]);
  const seen = deps.observeProcesses(pids, host.CALL_SECONDS);
  if (!seen.observed) {
    return { ok: false, code: 'owned-liveness-unknown',
      reason: 'the liveness query of run ' + ref.runId + ' failed or timed out: not read as gone' };
  }
  const at = (pid) => seen.observed.filter((o) => o.pid === pid).map((o) => host.cimMicros(o.cimCreatedUtc));
  const alive = [];
  if (at(ref.supervisor.pid).indexOf(ref.supervisor.createdUtcMicros) !== -1) alive.push('supervisor ' +
    ref.supervisor.pid);
  members.forEach((m) => {
    const times = at(m.pid);
    if (times.length > 0 && (m.createdUtcMicros === null || times.indexOf(m.createdUtcMicros) !== -1)) {
      alive.push('job member ' + m.pid);
    }
  });
  return alive.length === 0 ? { ok: true } : { ok: false, code: 'owned-process-alive', alive: alive,
    reason: 'owned processes of run ' + ref.runId + ' are still alive: ' + alive.join(', ') };
}

/** The context shared by peek and begin: the journal, the disk and the verdict of `decideNext`. */
function decisionOf(key, manifest, manifestBlob, deps) {
  const files = cellFiles(deps.paths, key);
  const read = journal.readJournal(files.journal);
  const state = journal.reduce(read.events);
  state.problems = read.problems.concat(state.problems);
  const disk = journal.scanDisk(files.dir);
  const live = liveOf(state, deps.observeProcess);
  const art = recordArtifacts(files, disk);
  const base = journal.recoveryFacts(state);
  const concerned = base.open || base.last;
  const openDir = state.open ? attemptDirOf(deps.paths, key, state.open.slot, state.open.ordinal) : null;
  const openRecord = state.open ? { readable: art.readable.some((f) => path.dirname(f) === openDir) } : null;
  const supervisorDead = state.open ? Boolean(live && live.dead) : null;
  const wantAuth = !state.complete && !state.permanentGap && base.classes.length > 0 &&
    (supervisorDead !== null ? supervisorDead :
      (!state.recoveryClaimed || state.slots[2].attempts.length < 2));
  let recoveryAuth = null;
  if (wantAuth) {
    const facts = Object.assign({}, base, { concerned: concerned, artifacts: art.artifacts,
      membersSeen: concerned ? readMembersSeen(attemptDirOf(deps.paths, key, concerned.slot,
        concerned.ordinal)) : null });
    const ctx = { epoch: manifest.epoch, manifestBlob: manifestBlob, manifest: manifest, facts: facts };
    recoveryAuth = loadAuthorization(key, ctx, deps);
  }
  const acknowledged = recoveryAuth && recoveryAuth.ok && recoveryAuth.data.acknowledgedArtifacts || [];
  const unacknowledged = art.artifacts.filter((a) => !acknowledged.some((x) => x.path === a.path &&
    x.sha256 === a.sha256)).map((a) => a.path + ' (' + a.sha256.slice(0, 12) + ')')
    .concat(art.canonical.map((f) => 'canonical ' + path.basename(f)));
  const unknown = journal.unknownDirectories(state, disk);
  let decision;
  if (unknown.length > 0 && read.events.length > 0) {
    decision = { action: 'refuse', code: 'unknown-attempt-directory',
      reason: 'attempt directories on disk are not in the journal: ' + unknown.map((u) => u.dir).join('; ') };
  } else {
    decision = journal.decideNext(state, { nowMs: deps.nowMs, epoch: manifest.epoch, live: live,
      diskComplete: art.readable.length > 0, openRecord: openRecord, recordCandidates: unacknowledged,
      recoveryAuth: recoveryAuth });
  }
  const claims = decision.action === 'start' && decision.claimRecovery;
  if (claims || decision.action === 'close' || decision.action === 'recover-record') {
    const ref = claims ? base.last : base.open;
    const gone = ownedGone(key, ref, deps);
    if (!gone.ok) decision = { action: 'refuse', code: gone.code, reason: gone.reason, alive: gone.alive };
  }
  if (decision.action === 'refuse' && recoveryAuth && !recoveryAuth.ok) {
    decision.authorizationProblems = recoveryAuth.problems;
  }
  return { files: files, read: read, state: state, disk: disk, live: live, recoveryAuth: recoveryAuth,
    decision: decision, facts: base };
}

function refuse(files, runId, decision, extra) {
  const record = Object.assign({ at: util.isoUtc(), runId: runId, code: decision.code,
    reason: decision.reason }, extra || {});
  try {
    util.appendLine(files.refusals, JSON.stringify(record));
  } catch (err) {
    record.refusalRecordError = String(err.message);
  }
  return Object.assign({ ok: false }, decision);
}

const refusal = (files, args, code, reason) =>
  refuse(files, args.runId, { action: 'refuse', code: code, reason: reason });

/** Before the lock: no hashing and no CPU work; decides whether to ask for the lock at all. */
function peek(key, deps) {
  const loaded = deps.loadManifest();
  if (!loaded.manifest || loaded.problems.length > 0) {
    return { ok: false, action: 'refuse', code: 'manifest', reason: loaded.problems.join('; ') };
  }
  if (!manifestLib.rowOf(loaded.manifest, key)) {
    return { ok: false, action: 'refuse', code: 'not-a-row',
      reason: 'cell ' + key + ' is not an exact manifest row' };
  }
  const d = decisionOf(key, loaded.manifest, loaded.blob, deps);
  return Object.assign({ ok: d.decision.action !== 'refuse', epoch: loaded.manifest.epoch,
    manifestBlob: loaded.blob }, d.decision, d.live ? { live: d.live } : {});
}

/** The full confirmed host tuple (the manifest's), checked under the lock before an admission is reserved. */
function hostcheck(deps) {
  const loaded = deps.loadManifest();
  if (!loaded.manifest) return { ok: false, problems: loaded.problems };
  const seen = deps.observeHost(loaded.manifest.host.pid, host.CALL_SECONDS);
  const problems = seen.timedOut ? ['the host query timed out'] :
    host.hostProblems(loaded.manifest.host, seen.observed);
  return { ok: problems.length === 0, problems: problems, timedOut: Boolean(seen.timedOut) };
}

/** Appends the close-out of a lost run: it ends the attempt and grants no opportunity and no counter. */
function closeOut(files, open, d, deps) {
  const auth = d.recoveryAuth;
  journal.appendEvent(files.journal, 'attempt-end', { slot: open.slot, runId: open.runId,
    outcome: 'supervisor-lost', releasedAt: util.isoUtc(deps.nowMs),
    closedBy: { authorizationBlob: auth.blob, authorizationSha256: auth.sha256 } }, deps.nowMs);
}

/** Under the lock: verifies the frozen inputs, decides again, reserves and prepares the attempt. */
function begin(key, args, deps) {
  const v = deps.verifyCell(key);
  const files = cellFiles(deps.paths, key);
  if (!v.ok) return refusal(files, args, 'frozen-input-mismatch', v.problems.join('; '));
  const loaded = deps.loadManifest();
  const manifest = loaded.manifest;
  const row = manifestLib.rowOf(manifest, key);
  const sup = host.supervisorIdentity(args.supervisor.pid, args.supervisor.created);
  if (!sup) return refusal(files, args, 'supervisor-identity', 'no CIM creation time');
  let d = decisionOf(key, manifest, loaded.blob, deps);
  if (d.decision.action === 'recover-record') {
    const open = d.state.open;
    if (!open.attempt.launchIntent) {
      return refusal(files, args, 'unjournaled-complete-record',
        'a qualifier.json exists for run ' + open.runId + ' without a launch intent: a review stop');
    }
    const result = post(key, { runId: open.runId, slot: open.slot, ordinal: open.ordinal,
      launcherExit: null, wSeconds: null, tExpired: false, leftover: false, fault: true,
      supervisorLost: true }, deps);
    return Object.assign({ action: 'recovered-record' }, result);
  }
  if (d.decision.action === 'close') {
    closeOut(files, d.state.open, d, deps);
    d = decisionOf(key, manifest, loaded.blob, deps);
  }
  const decision = d.decision;
  if (decision.action !== 'start') {
    if (decision.journalPermanentGap && !d.state.permanentGap) {
      journal.appendEvent(files.journal, 'permanent-gap', { epoch: manifest.epoch, cell: key,
        runId: args.runId, reason: decision.reason }, deps.nowMs);
    }
    return refuse(files, args.runId, decision);
  }
  const slot = decision.slot;
  const ordinal = decision.ordinal;
  const dir = attemptDirOf(deps.paths, key, slot, ordinal);
  if (fs.existsSync(dir)) {
    return refusal(files, args, 'attempt-directory-exists', dir + ' exists and is never replaced');
  }
  const argv = manifestLib.payloadArgs(row, slot, ordinal);
  const argvProblems = manifestLib.payloadProblems(argv, row, slot, ordinal);
  if (argvProblems.length > 0) return refusal(files, args, 'payload', argvProblems.join('; '));
  const jsonArg = argv.filter((a) => a.indexOf('--json=') === 0)[0].slice(7);
  const outPath = path.resolve(util.GENERATOR, jsonArg);
  if (deps.paths === DEFAULT_PATHS && outPath !== path.join(dir, 'qualifier.json')) {
    return refusal(files, args, 'payload-path', 'the payload output path is not the attempt directory');
  }
  const T = row.T;
  const O = row.O;
  if (!(T > 0 && O === T + rules.OUTER_EXTRA)) {
    return refusal(files, args, 'ceilings', 'the row has no consistent T and O');
  }
  const at = deps.nowMs;
  if (d.read.events.length === 0) {
    journal.appendEvent(files.journal, 'cell-open', { epoch: manifest.epoch, cell: key,
      manifestBlob: loaded.blob, head: v.head, commits: v.commits }, at);
  }
  if (decision.claimRecovery) {
    journal.appendEvent(files.journal, 'recovery-claim', { epoch: manifest.epoch, cell: key, slot: 2,
      faultClass: d.recoveryAuth.data.faultClass, authorizationBlob: d.recoveryAuth.blob,
      authorizationSha256: d.recoveryAuth.sha256, runId: args.runId }, at);
  }
  const begun = journal.appendEvent(files.journal, 'admission-begin', { slot: slot, ordinal: ordinal,
    runId: args.runId, supervisor: sup, manifestBlob: loaded.blob, head: v.head,
    engineSources: v.engineSources, qualifierHash: v.qualifierHash, T: T, O: O,
    oStart: args.oStart || null }, at);
  fs.mkdirSync(dir, { recursive: true });
  const verified = { ratingVersion: v.ratingVersion, engineSources: v.engineSources,
    qualifierHash: v.qualifierHash };
  const spec = {
    schema: 'MS18c-gq-launch-spec-v1', runId: args.runId, cell: key, epoch: manifest.epoch,
    slot: slot, ordinal: ordinal, policy: admission.POLICY, manifestBlob: loaded.blob, head: v.head,
    attemptDir: dir, journalFile: files.journal, lockFile: args.lockFile,
    foreignLockFile: args.foreignLockFile, nodePath: manifest.identities.node.execPath,
    nodeVersion: manifest.identities.node.version, generatorDir: util.GENERATOR, payloadArgs: argv,
    host: manifest.host, caps: { callSeconds: host.CALL_SECONDS, cumulativeSeconds: host.CUMULATIVE_SECONDS },
    T: T, O: O, verified: verified, row: row
  };
  const specFile = path.join(dir, 'launch-spec.json');
  util.writeNew(specFile, util.jsonText(spec, true));
  return { ok: true, action: 'start', slot: slot, ordinal: ordinal, attemptDir: dir, specFile: specFile,
    T: T, O: O, epoch: manifest.epoch, manifestBlob: loaded.blob, head: v.head, journalSeq: begun.seq,
    claimedRecovery: Boolean(decision.claimRecovery), inputs: verified,
    nodePath: spec.nodePath, payloadArgs: argv };
}

function expectationOf(manifest, verified) {
  const lib = inputs.recordsConstants();
  return { lib: lib, expectation: {
    protocol: lib.PROTOCOL.document, seedBase: manifest.protocol.seedBase,
    qualifierHash: manifest.identities.tool.qualifierHash, acceptance: lib.PROTOCOL.acceptance,
    ratingVersion: verified.ratingVersion, guardMs: manifest.protocol.guardMs,
    attemptPolicy: manifest.identities.attemptPolicy.object, machine: manifest.identities.machine.object,
    engineSources: manifest.identities.source.engineSources } };
}

/**
 * After the owned tree exited (or, with `supervisorLost`, found dead). args: { runId, slot, ordinal,
 * launcherExit, wSeconds, tExpired, leftover, fault, supervisorLost }. Journals the end of the attempt and,
 * for a complete record, runs the monitor; nothing is rerun and nothing is selected. A fault flag, a null
 * exit code or a null W (a lost supervisor leaves none) are recorded as they are.
 */
function post(key, args, deps) {
  const files = cellFiles(deps.paths, key);
  const dir = attemptDirOf(deps.paths, key, args.slot, args.ordinal);
  const spec = JSON.parse(fs.readFileSync(path.join(dir, 'launch-spec.json'), 'utf8'));
  const at = deps.nowMs;
  const read = journal.readJournal(files.journal);
  const state = journal.reduce(read.events);
  const slotState = state.slots[args.slot];
  const attempt = slotState && slotState.attempts.filter((a) => a.runId === args.runId)[0];
  const open = state.open && state.open.runId === args.runId;
  if (read.problems.length > 0 || state.problems.length > 0 || !attempt || !open) {
    return { ok: false, outcome: 'journal-invalid',
      reason: read.problems.concat(state.problems)[0] || 'the attempt is not open' };
  }
  const end = (outcome, extra) => {
    journal.appendEvent(files.journal, 'attempt-end', Object.assign({ slot: args.slot,
      runId: args.runId, outcome: outcome, releasedAt: util.isoUtc(deps.nowMs) }, extra || {}), deps.nowMs);
    return outcome;
  };
  const events = [];
  try {
    util.readLines(path.join(dir, 'events.jsonl')).forEach((l) => events.push(JSON.parse(l)));
  } catch (err) {
    events.push({ type: 'unreadable-events', message: String(err.message) });
  }
  const readinessFile = path.join(dir, 'readiness.json');
  const readiness = fs.existsSync(readinessFile) ?
    JSON.parse(fs.readFileSync(readinessFile, 'utf8')) : null;
  const tExpired = Boolean(args.tExpired);
  const fault = Boolean(args.fault);
  if (!attempt.launchIntent) {
    const kind = readiness && readiness.kind ? readiness.kind : (tExpired ? 'timeout' : 'launcher-fault');
    const eligible = Boolean(readiness && readiness.eligible === true && args.launcherExit === 3);
    journal.appendEvent(files.journal, 'admission-hold', { slot: args.slot, runId: args.runId,
      kind: kind, eligible: eligible, launcherExit: args.launcherExit, tExpired: tExpired, fault: fault,
      holds: readiness ? readiness.holds : ['no readiness record; launcher exit ' + args.launcherExit] }, at);
    return { ok: true, outcome: end('unstarted-hold'), kind: kind, eligible: eligible };
  }
  // R: the journalled creation is authoritative (retried appends); events.jsonl is only the fallback.
  const created = read.events.filter((e) => e.type === 'qualifier-created' && e.runId === args.runId &&
    Number.isFinite(e.rSeconds))[0] || events.filter((e) => e.type === 'qualifier-created')[0];
  const rSeconds = created ? created.rSeconds : null;
  journal.appendEvent(files.journal, 'payload-end', { slot: args.slot, runId: args.runId,
    exitCode: args.launcherExit, tExpired: tExpired, leftover: Boolean(args.leftover), fault: fault,
    supervisorLost: Boolean(args.supervisorLost), wSeconds: args.wSeconds, rSeconds: rSeconds }, at);
  const jsonFile = path.join(dir, 'qualifier.json');
  if (!fs.existsSync(jsonFile)) {
    const partials = journal.scanDisk(files.dir).partials;
    return { ok: true, outcome: end('no-record', { partials: partials, tExpired: tExpired }),
      partials: partials };
  }
  let record;
  try {
    record = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  } catch (err) {
    return { ok: false, outcome: end('record-unreadable', { message: String(err.message) }),
      reason: 'qualifier.json is not JSON: a review stop, never a rerun' };
  }
  const loaded = deps.loadManifest();
  const row = manifestLib.rowOf(loaded.manifest, key);
  const ctx = expectationOf(loaded.manifest, spec.verified);
  const result = monitor.evaluate({ row: row, record: record, wSeconds: args.wSeconds,
    rSeconds: rSeconds, records: ctx.lib, expectation: ctx.expectation });
  const mdFile = path.join(dir, 'qualifier.md');
  const hasMd = fs.existsSync(mdFile);
  const receipt = {
    schema: 'MS18c-gq-acceptance-receipt-v1', epoch: loaded.manifest.epoch, cell: key,
    runId: args.runId, slot: args.slot, ordinal: args.ordinal, manifestBlob: loaded.blob, head: spec.head,
    original: { json: { path: jsonFile, sha256: sha256File(jsonFile) },
      markdown: hasMd ? { path: mdFile, sha256: sha256File(mdFile) } : null },
    wSeconds: args.wSeconds, rSeconds: rSeconds, launcherExit: args.launcherExit, tExpired: tExpired,
    leftover: Boolean(args.leftover), fault: fault, supervisorLost: Boolean(args.supervisorLost),
    monitor: result, verdict: result.proceed ? 'accepted' : 'review',
    summary: record.cells && record.cells[0] ? record.cells[0].summary : null, canonical: null,
    note: 'a complete record is retained and never rerun; a review verdict stops GQ for joint review'
  };
  if (result.proceed) {
    if (fs.existsSync(files.canonJson) || fs.existsSync(files.canonMd)) {
      receipt.verdict = 'review';
      receipt.monitor.invalid.push('a canonical qualification file already exists and is never overwritten');
    } else {
      fs.mkdirSync(path.dirname(files.canonJson), { recursive: true });
      fs.copyFileSync(jsonFile, files.canonJson, fs.constants.COPYFILE_EXCL);
      if (hasMd) fs.copyFileSync(mdFile, files.canonMd, fs.constants.COPYFILE_EXCL);
      receipt.canonical = { json: { path: files.canonJson, sha256: sha256File(files.canonJson) },
        markdown: hasMd ? { path: files.canonMd, sha256: sha256File(files.canonMd) } : null };
    }
  }
  util.writeNew(files.receipt, util.jsonText(receipt, true));
  journal.appendEvent(files.journal, 'postcheck', { slot: args.slot, runId: args.runId,
    verdict: receipt.verdict, receiptSha256: sha256File(files.receipt), proceed: result.proceed }, at);
  const outcome = end(receipt.verdict === 'accepted' ? 'record-accepted' : 'record-review');
  return { ok: true, outcome: outcome, verdict: receipt.verdict, receipt: files.receipt,
    monitor: { proceed: result.proceed, invalid: result.invalid, invalidTiming: result.invalidTiming,
      breaches: result.breaches, metrics: result.metrics } };
}

function defaultDeps() {
  const git = gitro.createGit(util.REPO);
  return {
    paths: DEFAULT_PATHS, nowMs: Date.now(), git: git,
    loadManifest: () => manifestLib.loadManifest({ git: git }),
    verifyCell: (key) => verifyLib.verifyCell(key, { git: git }),
    observeProcess: (pid, remaining) => host.observeProcess(pid, remaining),
    observeProcesses: (pids, remaining) => host.observeProcesses(pids, remaining),
    observeHost: (pid, remaining) => host.observeHost(pid, remaining)
  };
}

module.exports = {
  AUTH_SCHEMA, PROOF_SCHEMA, DEFAULT_PATHS, cellFiles, attemptDirOf, authorizationProblems,
  loadAuthorization, recordArtifacts, readMembersSeen, ownedGone, decisionOf, peek, hostcheck, begin, post,
  expectationOf
};

if (require.main === module) {
  const [command, ...rest] = process.argv.slice(2);
  const opt = {};
  rest.forEach((a) => {
    const m = /^--([a-zA-Z-]+)=(.*)$/.exec(a);
    if (m) opt[m[1]] = m[2];
  });
  const num = (x) => (x === undefined || x === '' ? undefined : Number(x));
  let out;
  try {
    const deps = defaultDeps();
    const key = opt.cell;
    if (command === 'hostcheck') {
      out = hostcheck(deps);
    } else if (!key) {
      throw new Error('--cell is required');
    } else if (command === 'peek') {
      out = peek(key, deps);
    } else if (command === 'begin') {
      out = begin(key, { runId: opt['run-id'],
        supervisor: { pid: num(opt['supervisor-pid']), created: opt['supervisor-created'] },
        oStart: opt['o-start'], lockFile: opt['lock-file'],
        foreignLockFile: opt['foreign-lock-file'] }, deps);
    } else if (command === 'post') {
      out = post(key, { runId: opt['run-id'], slot: num(opt.slot), ordinal: num(opt.ordinal),
        launcherExit: num(opt['launcher-exit']), wSeconds: num(opt.w), tExpired: opt['t-expired'] === '1',
        leftover: opt.leftover === '1', fault: opt.fault === '1' }, deps);
    } else {
      throw new Error('usage: gq-plan.cjs peek|hostcheck|begin|post --cell=<variant/level> ...');
    }
  } catch (err) {
    out = { ok: false, action: 'refuse', code: 'planner-fault', reason: String(err && err.stack || err) };
    process.exitCode = 70;
  }
  process.stdout.write(JSON.stringify(out) + '\n');
}
