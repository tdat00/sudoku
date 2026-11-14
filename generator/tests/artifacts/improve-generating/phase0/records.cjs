'use strict';

/*
 * Records of the phase-0 harness: the request/sample record with null for every unknown field, the immutable
 * start/finish journal, the evidence folder of an attempt, reconciliation and resume rules, normalised result
 * digests, the analysis helpers (nearest-rank percentiles, paired-cluster resampling, binomial-tail inversion,
 * CPU-resolution classes), the frozen receipt/budget checks and the JSON/markdown summary emitter.
 * Everything here is provisional (pre-freeze) unless a validated frozen receipt says otherwise.
 */
const fs = require('fs');
const path = require('path');
const C = require('./common.cjs');

const HarnessError = C.HarnessError;

const OUTCOMES = ['complete', 'sample-budget', 'request-timeout', 'validation-unknown', 'error', 'unstarted'];
const TIMEOUT_SCOPES = [null, 'sample', 'request', 'command'];

const RECORD_FIELDS = [
  'key', 'parentKey', 'recordKind', 'pairId', 'gridCluster', 'requestSeed', 'attempt', 'sample', 'variantId',
  'level', 'mode', 'normalisedConfig', 'solverMode', 'poolWidth', 'sampleMode', 'parentMode', 'floorIds',
  'tierIds', 'limits', 'limitOrigin', 'serialOrdinal', 'consumed', 'speculative', 'origin', 'outcome',
  'timeoutScope', 'generation', 'validation', 'claimedExact', 'verifiedExact', 'required', 'vacuous', 'shallow',
  'achieved', 'score', 'puzzleHash', 'attemptsUsed', 'samplesUsed', 'canonicalRatings', 'localProposals',
  'localCapReasons', 'counts', 'firstExactOrigin', 'firstExactOrdinal', 'checkpointHashes', 'warnings', 'error'
];
const GENERATION_FIELDS = [
  'readyWallMs', 'coldWallMs', 'occupiedWallMs', 'cpuToDecisionMs', 'cpuTotalMs', 'cpuReadyTotalMs', 'startupMs',
  'startupCpuMs', 'cleanupMs', 'readyOccupiedWallMs', 'gridBuildWallMs', 'gridBuildCpuMs', 'cpuApi',
  'cpuResolutionStatus'
];
const VALIDATION_FIELDS = ['wallMs', 'cpuMs', 'solutionValid', 'givensAgree', 'structureValid', 'unique',
  'canonicalEqual'];
const COUNT_FIELDS = ['floorTests', 'floorDeductions', 'solverChecks', 'dfsEntries', 'dfsChecks', 'ladderPasses',
  'phaseBSolves', 'deepenProposals', 'verificationSolves'];

function nullObject(fields) {
  const out = {};
  fields.forEach(function (f) { out[f] = null; });
  return out;
}

/** A record with every field present and unknown: null, never zero. `over` fills what the observation knows. */
function blankRecord(over) {
  const record = {};
  RECORD_FIELDS.forEach(function (f) { record[f] = null; });
  record.recordKind = 'request';
  record.outcome = 'unstarted';
  record.generation = nullObject(GENERATION_FIELDS);
  record.validation = nullObject(VALIDATION_FIELDS);
  record.counts = nullObject(COUNT_FIELDS);
  const extra = Object.assign({}, over || {});
  ['generation', 'validation', 'counts'].forEach(function (name) {
    if (extra[name]) {
      record[name] = Object.assign(record[name], extra[name]);
      delete extra[name];
    }
  });
  return Object.assign(record, extra);
}

function findNonFinite(value, where) {
  if (value === undefined) return where + ' is undefined';
  if (typeof value === 'number') return Number.isFinite(value) ? null : where + ' is ' + value;
  if (value === null || typeof value !== 'object') return null;
  const keys = Array.isArray(value) ? value.map(function (_v, i) { return i; }) : Object.keys(value);
  for (let i = 0; i < keys.length; i++) {
    const found = findNonFinite(value[keys[i]], where + '.' + keys[i]);
    if (found) return found;
  }
  return null;
}

/** The problems of a record (an empty list: well formed). Unknown must be null; no NaN, no infinity. */
function checkRecord(record) {
  const problems = [];
  RECORD_FIELDS.forEach(function (f) { if (!(f in record)) problems.push('missing field ' + f); });
  if (typeof record.key !== 'string' || record.key === '') problems.push('no key');
  if (OUTCOMES.indexOf(record.outcome) < 0) problems.push('bad outcome ' + record.outcome);
  if (TIMEOUT_SCOPES.indexOf(record.timeoutScope) < 0) problems.push('bad timeoutScope ' + record.timeoutScope);
  if (record.outcome === 'request-timeout' && record.timeoutScope === null) problems.push('timeout without scope');
  if (record.timeoutScope !== null && record.outcome !== 'request-timeout' && record.outcome !== 'sample-budget') {
    problems.push('timeout scope on an outcome that is not a timeout');
  }
  [['generation', GENERATION_FIELDS], ['validation', VALIDATION_FIELDS], ['counts', COUNT_FIELDS]].forEach(
    function (pair) {
      const part = record[pair[0]];
      if (part === null || typeof part !== 'object') problems.push(pair[0] + ' missing');
      else pair[1].forEach(function (f) { if (!(f in part)) problems.push(pair[0] + '.' + f + ' missing'); });
    });
  const bad = findNonFinite(record, 'record');
  if (bad) problems.push(bad);
  return problems;
}

/** Identity fields a manifest job gives its record. */
function recordBase(job) {
  return blankRecord({
    key: job.key,
    parentKey: job.parentKey === undefined ? null : job.parentKey,
    recordKind: job.recordKind || 'request',
    pairId: job.pairId === undefined ? null : job.pairId,
    gridCluster: job.gridCluster === undefined ? null : job.gridCluster,
    requestSeed: job.requestSeed === undefined ? null : job.requestSeed,
    variantId: job.variantId === undefined ? null : job.variantId,
    level: job.level === undefined ? null : job.level,
    mode: job.mode === undefined ? null : job.mode,
    arm: job.arm === undefined ? null : job.arm,
    puzzleVariant: job.puzzleVariant === undefined ? null : job.puzzleVariant,
    blockKey: job.blockKey === undefined ? null : job.blockKey,
    shard: job.shard === undefined ? null : job.shard,
    order: job.order === undefined ? null : job.order
  });
}

// --- analysis helpers -----------------------------------------------------------------------------------------

function finiteSorted(values) {
  return values.filter(function (v) { return typeof v === 'number' && Number.isFinite(v); })
    .sort(function (a, b) { return a - b; });
}

/** Nearest-rank percentile (p in [0, 1]); null without a value. Descriptive, not a tail estimate. */
function percentileNearestRank(values, p) {
  const sorted = finiteSorted(values);
  if (sorted.length === 0) return null;
  if (p <= 0) return sorted[0];
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
}

/** The upper median (for comparison with historical reports); the nearest-rank p50 is reported separately. */
function upperMedian(values) {
  const sorted = finiteSorted(values);
  return sorted.length === 0 ? null : sorted[Math.floor(sorted.length / 2)];
}

function describe(values) {
  const n = finiteSorted(values).length;
  return {
    n: n,
    p50: percentileNearestRank(values, 0.5),
    p95: percentileNearestRank(values, 0.95),
    max: percentileNearestRank(values, 1),
    upperMedian: upperMedian(values),
    note: n > 0 && n < 20 ? 'p95 is the observed maximum, not a production-tail estimate' : null
  };
}

/**
 * Observable resolution class of a CPU interval against the quantum probed from the CPU API: an interval below
 * one quantum is unresolved (a zero is not "free"), below four quanta coarse.
 */
function classifyCpu(valueMs, quantumMs) {
  if (typeof valueMs !== 'number' || !Number.isFinite(valueMs)) return 'unavailable';
  if (typeof quantumMs !== 'number' || !Number.isFinite(quantumMs) || quantumMs <= 0) {
    return valueMs > 0 ? 'unquantified' : 'unresolved';
  }
  if (valueMs < quantumMs) return 'unresolved';
  return valueMs < 4 * quantumMs ? 'coarse' : 'resolved';
}

function usable(status) {
  return status === 'resolved' || status === 'coarse';
}

/** a / b, or null when either is unknown or the denominator is not a positive finite number: never infinity. */
function ratio(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number' || !Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (b <= 0) return null;
  return a / b;
}

/** Events per second over a denominator in ms; null when the denominator is unresolved. */
function ratePerSecond(count, denominatorMs, status) {
  if (typeof count !== 'number' || !Number.isFinite(count)) return null;
  if (status !== undefined && !usable(status)) return null;
  const perMs = ratio(count, denominatorMs);
  return perMs === null ? null : perMs * 1000;
}

function logFactorials(n) {
  const lf = new Array(n + 1);
  lf[0] = 0;
  for (let i = 1; i <= n; i++) lf[i] = lf[i - 1] + Math.log(i);
  return lf;
}

/** P(X >= k) for X ~ Binomial(n, p), summed in log space. */
function binomialTailAtLeast(k, n, p) {
  if (k <= 0) return 1;
  if (k > n || p <= 0) return 0;
  if (p >= 1) return 1;
  const lf = logFactorials(n);
  const lp = Math.log(p);
  const lq = Math.log(1 - p);
  let sum = 0;
  for (let i = k; i <= n; i++) sum += Math.exp(lf[n] - lf[i] - lf[n - i] + i * lp + (n - i) * lq);
  return Math.min(1, sum);
}

/**
 * Exact one-sided lower confidence bound of a success probability after k successes in n trials (the tail
 * inversion of Clopper and Pearson): 0 for k = 0, alpha^(1/n) for k = n, else the p whose upper-tail P(X >= k) is
 * alpha, found by bisection. No pseudo-count. The trials are assumed independent.
 */
function binomialLowerBound(k, n, alpha) {
  const a = alpha === undefined ? 0.05 : alpha;
  if (!Number.isInteger(k) || !Number.isInteger(n) || n < 1 || k < 0 || k > n) return null;
  if (k === 0) return 0;
  if (k === n) return Math.pow(a, 1 / n);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 200 && hi - lo > 1e-13; i++) {
    const mid = (lo + hi) / 2;
    if (binomialTailAtLeast(k, n, mid) > a) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ANALYSIS_SEED = 20261114;

/**
 * Seed-cluster bootstrap: whole clusters (a cluster keeps its paired observations) are drawn with replacement,
 * `statistic(drawnClusters)` is evaluated on each draw (null: unresolved, skipped and counted). The interval is a
 * descriptive provisional one with poor small-sample coverage, not a reliable confidence guarantee.
 */
function bootstrapClusters(clusters, statistic, options) {
  const resamples = options && options.resamples ? options.resamples : 2000;
  const seed = options && options.seed !== undefined ? options.seed : ANALYSIS_SEED;
  const n = clusters.length;
  const point = n === 0 ? null : statistic(clusters);
  const out = {
    descriptive: true, note: 'descriptive provisional interval; poor small-sample coverage',
    clusters: n, resamples: resamples, seed: seed, point: point === undefined ? null : point,
    ci95: [null, null], lowerBound95OneSided: null, unresolvedResamples: 0
  };
  if (n === 0) return out;
  const rng = mulberry32(seed);
  const stats = [];
  for (let b = 0; b < resamples; b++) {
    const drawn = new Array(n);
    for (let i = 0; i < n; i++) drawn[i] = clusters[Math.floor(rng() * n)];
    const s = statistic(drawn);
    if (typeof s === 'number' && Number.isFinite(s)) stats.push(s);
    else out.unresolvedResamples++;
  }
  if (stats.length > 0) {
    out.ci95 = [percentileNearestRank(stats, 0.025), percentileNearestRank(stats, 0.975)];
    out.lowerBound95OneSided = percentileNearestRank(stats, 0.05);
  }
  return out;
}

// --- normalised result digests ----------------------------------------------------------------------------------

/**
 * The deterministic part of a PuzzleResult wire (timings are left out): the variant structure (units, cages,
 * signs, layout, symbols), givens, solution, canonical rating, exact flag, seed, configuration, attempts, warnings,
 * dig log and work. A hash of the givens alone would not tell two structures apart.
 */
function normaliseWire(wire) {
  const plain = C.canonicalize;
  const structure = plain(wire.model);
  const parts = {
    structure: structure,
    givens: plain(wire.givens),
    solution: plain(wire.solution),
    rating: plain(wire.rating),
    config: plain(wire.config),
    warnings: plain(wire.warnings),
    log: plain(wire.digLog === undefined ? null : wire.digLog),
    work: plain(wire.work === undefined ? null : wire.work),
    scalars: { exact: wire.exact === true, seed: wire.seed, attempts: wire.attempts }
  };
  const digests = {};
  Object.keys(parts).forEach(function (name) { digests[name] = C.digestOf(parts[name]); });
  digests.puzzle = C.digestOf({ structure: structure, givens: parts.givens, solution: parts.solution });
  digests.all = C.digestOf(parts);
  return { digests: digests, exact: wire.exact === true, cellCount: wire.model ? wire.model.cellCount : null };
}

/** Field-by-field comparison of two digest sets: which sections differ. */
function compareDigests(a, b) {
  const sections = Object.keys(a).filter(function (k) { return k !== 'all'; });
  const differing = sections.filter(function (k) { return a[k] !== b[k]; });
  Object.keys(b).forEach(function (k) {
    if (k !== 'all' && sections.indexOf(k) < 0) differing.push(k);
  });
  return { equal: a.all === b.all && differing.length === 0, differing: differing };
}

// --- journal, reconciliation, resume ----------------------------------------------------------------------------

/**
 * Append-only start/finish journal of one attempt. A key can start once and finish once; a finish needs its
 * start. A second start or finish (a retry, a duplicate acceptance) fails closed.
 */
class Journal {
  constructor(repoRoot, file, plannedKeys) {
    this.repoRoot = repoRoot;
    this.file = file;
    this.planned = new Set(plannedKeys);
    this.started = new Set();
    this.finished = new Map();
    this.seq = 0;
    C.readJsonl(file).forEach(function (entry) { this.replay(entry); }, this);
  }

  replay(entry) {
    this.seq = Math.max(this.seq, entry.seq || 0);
    if (entry.type === 'job-start') {
      if (!this.planned.has(entry.key) || this.started.has(entry.key)) {
        throw new HarnessError('journal-corrupt', 'unexpected start of ' + entry.key);
      }
      this.started.add(entry.key);
    } else if (entry.type === 'job-finish') {
      if (!this.started.has(entry.key) || this.finished.has(entry.key)) {
        throw new HarnessError('journal-corrupt', 'unexpected finish of ' + entry.key);
      }
      this.finished.set(entry.key, entry.record);
    }
  }

  append(type, data) {
    const entry = Object.assign({ seq: ++this.seq, at: C.isoNow(), type: type }, data || {});
    C.appendJsonl(this.repoRoot, this.file, entry);
    return entry;
  }

  start(key) {
    if (!this.planned.has(key)) throw new HarnessError('journal-unknown-key', 'not a planned key: ' + key);
    if (this.started.has(key)) throw new HarnessError('duplicate-start', 'a started row cannot start again: ' + key);
    this.append('job-start', { key: key });
    this.started.add(key);
  }

  finish(key, record) {
    if (!this.started.has(key)) throw new HarnessError('finish-without-start', 'finish before start: ' + key);
    if (this.finished.has(key)) throw new HarnessError('duplicate-finish', 'duplicate result for ' + key);
    this.append('job-finish', { key: key, record: record });
    this.finished.set(key, record);
  }
}

/** Journal entries against the planned keys: finished, started without a finish, never started, and problems. */
function reconcile(plannedKeys, entries) {
  const planned = new Set(plannedKeys);
  const started = new Set();
  const finished = new Map();
  const problems = [];
  entries.forEach(function (e) {
    if (e.type === 'job-start') {
      if (!planned.has(e.key)) problems.push('start of unplanned key ' + e.key);
      else if (started.has(e.key)) problems.push('duplicate start of ' + e.key);
      else started.add(e.key);
    } else if (e.type === 'job-finish') {
      if (!started.has(e.key)) problems.push('finish without start of ' + e.key);
      else if (finished.has(e.key)) problems.push('duplicate finish of ' + e.key);
      else finished.set(e.key, e.record);
    }
  });
  return {
    ok: problems.length === 0,
    problems: problems,
    finished: finished,
    startedUnfinished: plannedKeys.filter(function (k) { return started.has(k) && !finished.has(k); }),
    unstarted: plannedKeys.filter(function (k) { return !started.has(k); })
  };
}

/** One record per planned job, in order: its result, or an explicit error / unstarted record. */
function buildRecords(jobs, recon) {
  return jobs.map(function (job) {
    if (recon.finished.has(job.key)) return recon.finished.get(job.key);
    const base = recordBase(job);
    if (recon.startedUnfinished.indexOf(job.key) >= 0) {
      base.outcome = 'error';
      base.error = { code: 'started-without-finish', message: 'the row started and has no result' };
    }
    return base;
  });
}

/**
 * Which keys a paused command may hand to a later one. Only manifest keys proved never started, under the same
 * manifest, runtime and harness fingerprints; a started row (finished, timed out or crashed) and the children
 * abandoned under a started parent are refused.
 */
function selectResumable(input) {
  const refused = [];
  const refuseAll = function (reason) {
    return { ok: false, reason: reason, keys: [], refused: refused };
  };
  const command = input.command;
  if (!command || command.status !== 'paused-unstarted') return refuseAll('not-paused-unstarted');
  if (command.manifestHash !== input.manifestHash) return refuseAll('incompatible-manifest');
  if (command.runtimeFingerprint !== input.runtimeFingerprint) return refuseAll('incompatible-runtime');
  if (command.harnessFingerprint !== input.harnessFingerprint) return refuseAll('incompatible-harness');
  if (command.sourceStable !== true) return refuseAll('source-unstable');
  const startedKeys = new Set(input.startedKeys || []);
  (input.attempts || []).forEach(function (a) {
    ['completedKeys', 'censoredKeys', 'errorKeys', 'startedUnfinishedKeys'].forEach(function (name) {
      (a[name] || []).forEach(function (k) { startedKeys.add(k); });
    });
  });
  const jobs = new Map(input.jobs.map(function (j) { return [j.key, j]; }));
  const keys = [];
  (command.unstartedKeys || []).forEach(function (key) {
    const job = jobs.get(key);
    if (!job) refused.push({ key: key, reason: 'not-in-manifest' });
    else if (startedKeys.has(key)) refused.push({ key: key, reason: 'already-started' });
    else if (job.parentKey && startedKeys.has(job.parentKey)) refused.push({ key: key, reason: 'parent-started' });
    else keys.push(key);
  });
  return { ok: true, reason: null, keys: keys, refused: refused };
}

const ATTEMPT_ID = /^a[1-9]\d{0,2}$/;

function shardDirOf(evidenceRoot, round, task, shard) {
  return path.join(evidenceRoot, round, task, shard);
}

/** a1 is the shard folder itself; a later attempt is a sub-folder, so an old attempt is never overwritten. */
function attemptDirOf(shardDir, attemptId) {
  if (!ATTEMPT_ID.test(attemptId)) throw new HarnessError('attempt-id', 'bad attempt id ' + attemptId);
  return attemptId === 'a1' ? shardDir : path.join(shardDir, attemptId);
}

const EVIDENCE_FILES = {
  command: 'command.json', records: 'records.json', sourceManifest: 'source-manifest.json',
  firewallBefore: 'firewall-before.json', firewallAfter: 'firewall-after.json', summary: 'summary.json',
  summaryMd: 'summary.md', journal: 'journal.jsonl', manifest: 'manifest.json'
};

/** Opens a new attempt folder; an existing one (same attempt id) fails closed. */
function openAttempt(repoRoot, shardDir, attemptId) {
  const dir = attemptDirOf(shardDir, attemptId);
  C.assertAuthorised(repoRoot, dir);
  if (attemptId === 'a1') {
    const clash = ['command', 'journal', 'manifest'].some(function (k) {
      return fs.existsSync(path.join(dir, EVIDENCE_FILES[k]));
    });
    if (clash) throw new HarnessError('attempt-exists', 'attempt a1 already has evidence: ' + dir);
    fs.mkdirSync(dir, { recursive: true });
  } else {
    fs.mkdirSync(path.dirname(dir), { recursive: true });
    try {
      fs.mkdirSync(dir);
    } catch (err) {
      if (err && err.code === 'EEXIST') throw new HarnessError('attempt-exists', 'attempt exists: ' + dir);
      throw err;
    }
  }
  const files = {};
  Object.keys(EVIDENCE_FILES).forEach(function (k) { files[k] = path.join(dir, EVIDENCE_FILES[k]); });
  return { dir: dir, attemptId: attemptId, files: files };
}

/** Every attempt folder of a shard with its command.json (null while missing: a crashed or running attempt). */
function listAttempts(shardDir) {
  const out = [];
  const read = function (dir, attemptId) {
    const cmd = path.join(dir, EVIDENCE_FILES.command);
    const journal = path.join(dir, EVIDENCE_FILES.journal);
    const hasCommand = fs.existsSync(cmd);
    const hasJournal = fs.existsSync(journal);
    if (!hasCommand && !hasJournal) return;
    out.push({
      attemptId: attemptId, dir: dir, command: hasCommand ? C.readJson(cmd) : null, hasJournal: hasJournal,
      journal: hasJournal ? C.readJsonl(journal) : []
    });
  };
  if (!fs.existsSync(shardDir)) return out;
  read(shardDir, 'a1');
  fs.readdirSync(shardDir, { withFileTypes: true }).filter(function (d) {
    return d.isDirectory() && ATTEMPT_ID.test(d.name);
  }).sort(function (a, b) { return Number(a.name.slice(1)) - Number(b.name.slice(1)); }).forEach(function (d) {
    read(path.join(shardDir, d.name), d.name);
  });
  return out;
}

function nextAttemptId(attempts) {
  const max = attempts.reduce(function (m, a) { return Math.max(m, Number(a.attemptId.slice(1))); }, 0);
  return 'a' + (max + 1);
}

const FAILED_STATUSES = new Set(['parity-failed', 'validation-failed', 'source-changed', 'firewall-violation',
  'identity-violation', 'unlocked-refused', 'error', 'unsupported-source', 'frozen-receipt-missing',
  'frozen-receipt-invalid', 'frozen-runtime-mismatch']);

/**
 * The attempts of the run chain that ends at `attemptId`: that attempt and the ones it resumed (`command.resumeOf`),
 * oldest first. An attempt started fresh (a new attempt id after a failure or a deliberate rerun) begins a new chain;
 * the older chain's evidence is preserved but is not part of this one.
 */
function chainOf(attempts, attemptId) {
  const byId = new Map(attempts.map(function (a) { return [a.attemptId, a]; }));
  const chain = [];
  const seen = new Set();
  let cur = byId.get(attemptId);
  while (cur && !seen.has(cur.attemptId)) {
    seen.add(cur.attemptId);
    chain.unshift(cur);
    const previous = cur.command && cur.command.resumeOf ? cur.command.resumeOf.attemptId : null;
    cur = previous ? byId.get(previous) : null;
  }
  return chain;
}

function lastChain(attempts) {
  return attempts.length === 0 ? [] : chainOf(attempts, attempts[attempts.length - 1].attemptId);
}

/** The keys that started in the attempts of a chain (finished, timed out, crashed): never to be started again. */
function startedKeysOf(chain) {
  const out = new Set();
  chain.forEach(function (a) {
    (a.journal || []).forEach(function (e) { if (e.type === 'job-start') out.add(e.key); });
    ['completedKeys', 'censoredKeys', 'errorKeys', 'startedUnfinishedKeys'].forEach(function (name) {
      ((a.command && a.command[name]) || []).forEach(function (k) { out.add(k); });
    });
  });
  return Array.from(out);
}

/**
 * The state of a shard from its evidence: not-run, recorded (every key has a final record), paused (unstarted
 * keys remain after a productive pause) or failed (a crashed or failed attempt: new attempt id and approval needed).
 * Only the latest run chain counts: a fresh attempt does not inherit the keys of an older chain.
 */
function shardStatus(shardDir, shard) {
  const attempts = listAttempts(shardDir);
  if (attempts.length === 0) return { status: 'not-run', attempts: attempts, unstartedKeys: shard.jobKeys.slice() };
  if (shard.kind === 'synthetic') {
    const last = attempts[attempts.length - 1];
    const ok = last.command && last.command.status === 'complete' && last.command.selfTestPassed === true;
    const passedBefore = attempts.some(function (a) {
      return a.command && a.command.status === 'complete' && a.command.selfTestPassed === true;
    });
    return { status: ok || passedBefore ? 'recorded' : 'failed', attempts: attempts, unstartedKeys: [] };
  }
  const chain = lastChain(attempts);
  const ids = chain.map(function (a) { return a.attemptId; });
  if (chain.some(function (a) { return a.command === null; })) {
    return { status: 'failed', reason: 'an attempt has no command.json (crashed or still running)',
      attempts: attempts, chain: ids, unstartedKeys: [] };
  }
  const final = new Set();
  chain.forEach(function (a) {
    ['completedKeys', 'censoredKeys', 'errorKeys', 'startedUnfinishedKeys'].forEach(function (name) {
      (a.command[name] || []).forEach(function (k) { final.add(k); });
    });
  });
  const unstarted = shard.jobKeys.filter(function (k) { return !final.has(k); });
  const last = chain[chain.length - 1].command;
  if (FAILED_STATUSES.has(last.status)) {
    return { status: 'failed', reason: last.status, attempts: attempts, chain: ids, unstartedKeys: unstarted };
  }
  if (unstarted.length > 0) {
    return { status: 'paused', attempts: attempts, chain: ids, unstartedKeys: unstarted, last: last };
  }
  return { status: 'recorded', attempts: attempts, chain: ids, unstartedKeys: [] };
}

/** Every command.json under a round folder, for the budget scan: `rel` is relative to the round, with `/`. */
function scanRoundCommands(roundDir) {
  const out = [];
  const walk = function (dir, depth) {
    if (!fs.existsSync(dir) || depth > 4) return;
    fs.readdirSync(dir, { withFileTypes: true }).forEach(function (d) {
      const full = path.join(dir, d.name);
      if (d.isDirectory()) walk(full, depth + 1);
      else if (d.name === EVIDENCE_FILES.command) {
        try {
          out.push({ rel: C.toPosix(path.relative(roundDir, full)), command: C.readJson(full) });
        } catch (err) {
          out.push({ rel: C.toPosix(path.relative(roundDir, full)), command: null });
        }
      }
    });
  };
  walk(roundDir, 0);
  return out;
}

/**
 * Machine time charged so far: the dispatcher's ledger entries plus every command.json the ledger does not
 * reference (a command launched directly through the wrapper). Each is its occupied time plus the quiet-admission
 * grace; priority wait is never charged.
 */
function collectCharges(ledger, evidence) {
  const entries = ledger && Array.isArray(ledger.entries) ? ledger.entries : [];
  const referenced = new Set(entries.map(function (e) { return e.commandJson; }).filter(Boolean));
  const out = entries.map(function (e) {
    return { task: e.task, chargedMs: e.chargedMs, source: 'ledger', ref: e.commandJson || null };
  });
  evidence.forEach(function (ev) {
    if (referenced.has(ev.rel) || !ev.command) return;
    const timing = ev.command.timing || {};
    const occupied = typeof timing.occupiedMs === 'number' ? timing.occupiedMs : C.GUARDS.wrapperLimitMs;
    const grace = typeof timing.chargedGraceMs === 'number' ? timing.chargedGraceMs : C.GUARDS.graceMs;
    out.push({ task: ev.command.task, chargedMs: occupied + grace, source: 'evidence', ref: ev.rel });
  });
  return out;
}

// --- gate: frozen receipt and budget receipt -------------------------------------------------------------------

const HEX64 = /^[0-9a-f]{64}$/;

function validateFreezeReceipt(receipt) {
  const problems = [];
  if (!receipt || typeof receipt !== 'object') return ['the receipt is not an object'];
  if (receipt.schema !== 'ig-s-freeze/1') problems.push('schema must be ig-s-freeze/1');
  const labels = receipt.acceptedLabels || {};
  if (typeof labels.ms17b !== 'string' || labels.ms17b === '') problems.push('acceptedLabels.ms17b missing');
  if (typeof labels.ms18e !== 'string' || labels.ms18e === '') problems.push('acceptedLabels.ms18e missing');
  if (typeof receipt.runtimeFingerprint !== 'string' || !HEX64.test(receipt.runtimeFingerprint)) {
    problems.push('runtimeFingerprint must be a sha-256');
  }
  if (typeof receipt.catalogueFingerprint !== 'string' || !HEX64.test(receipt.catalogueFingerprint)) {
    problems.push('catalogueFingerprint must be a sha-256');
  }
  if (!receipt.limitsAndDefaults || typeof receipt.limitsAndDefaults !== 'object') {
    problems.push('limitsAndDefaults missing');
  }
  const att = receipt.attestation;
  if (!att || typeof att.by !== 'string' || att.by === '' || typeof att.text !== 'string' || att.text === '') {
    problems.push('attestation (by, text) missing');
  }
  return problems;
}

function validateBudgetReceipt(receipt) {
  const problems = [];
  if (!receipt || typeof receipt !== 'object') return ['the receipt is not an object'];
  if (receipt.schema !== 'ig-s-budget/1') problems.push('schema must be ig-s-budget/1');
  if (!(Number.isFinite(receipt.authorisedTotalMs) && receipt.authorisedTotalMs > 0)) {
    problems.push('authorisedTotalMs must be a positive number');
  }
  if (!receipt.perTaskMs || typeof receipt.perTaskMs !== 'object') problems.push('perTaskMs missing');
  if (typeof receipt.runtimeFingerprint !== 'string' || !HEX64.test(receipt.runtimeFingerprint)) {
    problems.push('runtimeFingerprint must be a sha-256');
  }
  if (typeof receipt.source !== 'string' || receipt.source === '') problems.push('source missing');
  const att = receipt.attestation;
  if (!att || typeof att.by !== 'string' || att.by === '') problems.push('attestation.by missing');
  return problems;
}

/**
 * The check that runs before any frozen generation: both receipts present and valid, and both fingerprinting the
 * runtime that is loaded. `code` is the error code a run raises (null when ready); a provisional round needs none.
 */
function receiptProblems(input) {
  if (input.round !== C.ROUND_FROZEN) return { ok: true, code: null, problems: [] };
  const missing = [];
  if (!input.freezeReceipt) missing.push('freeze receipt missing');
  if (!input.budgetReceipt) missing.push('budget receipt missing');
  if (missing.length > 0) return { ok: false, code: 'frozen-receipt-missing', problems: missing };
  const problems = validateFreezeReceipt(input.freezeReceipt).map(function (p) { return 'freeze receipt: ' + p; })
    .concat(validateBudgetReceipt(input.budgetReceipt).map(function (p) { return 'budget receipt: ' + p; }));
  if (problems.length > 0) return { ok: false, code: 'frozen-receipt-invalid', problems: problems };
  const mismatch = [];
  if (input.freezeReceipt.runtimeFingerprint !== input.runtimeFingerprint) {
    mismatch.push('the freeze receipt fingerprints another runtime than the one loaded');
  }
  if (input.budgetReceipt.runtimeFingerprint !== input.runtimeFingerprint) {
    mismatch.push('the budget receipt fingerprints another runtime than the one loaded');
  }
  if (mismatch.length > 0) return { ok: false, code: 'frozen-runtime-mismatch', problems: mismatch };
  return { ok: true, code: null, problems: [] };
}

/**
 * The gate state of a command. A flag, a ratingVersion or a round name alone never enables a formal gate: a valid
 * freeze receipt that matches the loaded runtime (and catalogue, when observed) and a valid budget receipt do. The
 * provisional round is never evaluable. Even when ready, the rate-to-request-fraction conversion awaits the
 * author's review.
 */
function evaluateGate(input) {
  const round = input.round;
  const base = { round: round, formalGateEnabled: false, projection: 'projection-awaits-author-review',
    reasons: [] };
  if (round !== C.ROUND_FROZEN) {
    return Object.assign(base, { state: 'not-evaluable-pre-freeze',
      reasons: ['pre-freeze round: no gate is evaluated whatever the numbers or a frozen flag say'] });
  }
  if (input.supportOk === false) return Object.assign(base, { state: 'unsupported-source', reasons: ['unsupported source'] });
  if (!input.freezeReceipt) {
    return Object.assign(base, { state: 'frozen-receipt-missing',
      reasons: ['no freeze receipt (a frozen flag alone is not proof)'] });
  }
  const freezeProblems = validateFreezeReceipt(input.freezeReceipt);
  if (freezeProblems.length > 0) return Object.assign(base, { state: 'frozen-receipt-invalid', reasons: freezeProblems });
  if (input.freezeReceipt.runtimeFingerprint !== input.runtimeFingerprint) {
    return Object.assign(base, { state: 'frozen-runtime-mismatch',
      reasons: ['the receipt fingerprints another runtime than the one loaded'] });
  }
  if (!input.budgetReceipt) return Object.assign(base, { state: 'frozen-budget-missing', reasons: ['no budget receipt'] });
  const budgetProblems = validateBudgetReceipt(input.budgetReceipt);
  if (budgetProblems.length > 0) return Object.assign(base, { state: 'frozen-budget-invalid', reasons: budgetProblems });
  if (input.budgetReceipt.runtimeFingerprint !== input.runtimeFingerprint) {
    return Object.assign(base, { state: 'frozen-runtime-mismatch',
      reasons: ['the budget receipt fingerprints another runtime than the one loaded'] });
  }
  if (input.catalogueFingerprint === undefined || input.catalogueFingerprint === null) {
    return Object.assign(base, { state: 'frozen-catalogue-unverified',
      reasons: ['the catalogue fingerprint was not observed'] });
  }
  if (input.freezeReceipt.catalogueFingerprint !== input.catalogueFingerprint) {
    return Object.assign(base, { state: 'frozen-catalogue-mismatch',
      reasons: ['the receipt fingerprints another catalogue than the one observed'] });
  }
  return Object.assign(base, { state: 'frozen-ready', formalGateEnabled: true, reasons: [] });
}

// --- status and exit --------------------------------------------------------------------------------------------

const STATUS_EXIT = { complete: 0, 'paused-unstarted': 0, 'unsupported-source': 2, 'frozen-receipt-missing': 2 };

/** Exit 0 means the recorded observations passed correctness checks (a pause included); 1 is incorrect; 2 stops. */
function exitCodeForStatus(status) {
  return Object.prototype.hasOwnProperty.call(STATUS_EXIT, status) ? STATUS_EXIT[status] : 1;
}

function isCoverageComplete(command) {
  return command.status === 'complete' && (command.unstartedKeys || []).length === 0;
}

// --- summary ----------------------------------------------------------------------------------------------------

const PROVISIONAL_NOTICE = 'PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; ' +
  'nothing here enables a cell, selects an allowance or changes a default.';

function brief(record) {
  const g = record.generation;
  return {
    key: record.key, outcome: record.outcome, readyWallMs: g.readyWallMs, coldWallMs: g.coldWallMs,
    cpuTotalMs: g.cpuTotalMs, cpuResolutionStatus: g.cpuResolutionStatus, claimedExact: record.claimedExact,
    verifiedExact: record.verifiedExact, puzzleHash: record.puzzleHash
  };
}

// prototype / reference of one generation field; CPU factors also need both intervals to be resolved.
function factor(proto, ref, field, needCpu) {
  if (!proto || !ref || proto.outcome !== 'complete' || ref.outcome !== 'complete') return null;
  const a = proto.generation;
  const b = ref.generation;
  if (needCpu && !(usable(a.cpuResolutionStatus) && usable(b.cpuResolutionStatus))) return null;
  return ratio(a[field], b[field]);
}

const SPENT_CATEGORIES = {
  complete: ['complete'],
  censored: ['request-timeout', 'sample-budget'],
  errors: ['error'],
  validationUnknown: ['validation-unknown']
};

// A sum is unknown (null) when any term is: unknown spend never becomes a smaller denominator.
function sumKnown(values) {
  return values.indexOf(null) >= 0 ? null : values.reduce(function (a, b) { return a + b; }, 0);
}

// What a group of started requests spent: all generation CPU to the end of cleanup and the cold wall to the
// decision (or the timeout) plus the cleanup, whatever the outcome.
function spentOf(rows) {
  return {
    requests: rows.length,
    cpuMs: sumKnown(rows.map(function (r) { return r.generation.cpuTotalMs; })),
    wallMs: sumKnown(rows.map(function (r) {
      return r.generation.coldWallMs === null || r.generation.cleanupMs === null ? null :
        r.generation.coldWallMs + r.generation.cleanupMs;
    }))
  };
}

function armSummary(records, quantumMs) {
  const byOutcome = function (outcomes) {
    return records.filter(function (r) { return outcomes.indexOf(r.outcome) >= 0; });
  };
  const done = byOutcome(['complete']);
  const column = function (rows, name) {
    return rows.map(function (r) { return r.generation[name]; }).filter(function (v) { return v !== null; });
  };
  const spent = {};
  Object.keys(SPENT_CATEGORIES).forEach(function (name) { spent[name] = spentOf(byOutcome(SPENT_CATEGORIES[name])); });
  const names = Object.keys(SPENT_CATEGORIES);
  spent.total = {
    requests: names.reduce(function (n, k) { return n + spent[k].requests; }, 0),
    cpuMs: sumKnown(names.map(function (k) { return spent[k].cpuMs; })),
    wallMs: sumKnown(names.map(function (k) { return spent[k].wallMs; }))
  };
  const cpuStatus = spent.total.cpuMs === null ? 'unavailable' : classifyCpu(spent.total.cpuMs, quantumMs);
  const hits = done.filter(function (r) { return r.verifiedExact === true; }).length;
  return {
    requests: records.length,
    complete: done.length,
    censored: spent.censored.requests,
    errors: spent.errors.requests,
    validationUnknown: spent.validationUnknown.requests,
    unstarted: byOutcome(['unstarted']).length,
    // Completed requests only: a censored request has no completion time.
    readyWallMs: describe(column(done, 'readyWallMs')),
    coldWallMs: describe(column(done, 'coldWallMs')),
    cpuTotalMs: describe(column(done, 'cpuTotalMs')),
    censoredColdWallMs: describe(column(byOutcome(SPENT_CATEGORIES.censored), 'coldWallMs')),
    // Rate denominators: every started request's spend, completed or not, reported by category as well.
    spent: spent,
    cpuTotalAggregateMs: spent.total.cpuMs,
    cpuAggregateStatus: cpuStatus,
    wallChargedMs: spent.total.wallMs,
    verifiedHits: hits,
    hitsPerCpuSecond: spent.total.cpuMs === null ? null : ratePerSecond(hits, spent.total.cpuMs, cpuStatus),
    hitsPerColdWallSecond: spent.total.wallMs === null ? null : ratePerSecond(hits, spent.total.wallMs, 'resolved')
  };
}

/** The summary of a command: coverage, paired rows, descriptive statistics, rates, sources and the gate. */
function buildSummary(ctx) {
  const command = ctx.command;
  const records = ctx.records;
  const quantum = command.cpu && command.cpu.quantumMs !== undefined ? command.cpu.quantumMs : null;
  const byPair = new Map();
  records.forEach(function (r) {
    if (r.pairId === null || r.pairId === undefined) return;
    if (!byPair.has(r.pairId)) byPair.set(r.pairId, {});
    byPair.get(r.pairId)[r.arm] = r;
  });
  const pairs = Array.from(byPair.entries()).map(function (e) {
    const ref = e[1].reference;
    const proto = e[1].prototype;
    return {
      pairId: e[0],
      reference: ref ? brief(ref) : null,
      prototype: proto ? brief(proto) : null,
      cpuFactor: factor(proto, ref, 'cpuTotalMs', true),
      readyWallFactor: factor(proto, ref, 'readyWallMs', false),
      coldWallFactor: factor(proto, ref, 'coldWallMs', false)
    };
  });
  const arms = {};
  ['reference', 'prototype'].forEach(function (arm) {
    const rows = records.filter(function (r) { return r.arm === arm; });
    if (rows.length > 0) arms[arm] = armSummary(rows, quantum);
  });
  return {
    schema: C.SCHEMA,
    task: command.task,
    shard: command.shard,
    round: command.round,
    attemptId: command.attemptId,
    evidenceStatus: command.evidenceStatus,
    provisionalNotice: command.evidenceStatus === C.EVIDENCE_PROVISIONAL ? PROVISIONAL_NOTICE : null,
    formalGate: command.gate ? command.gate.state : null,
    status: command.status,
    exit: command.exit,
    coverage: {
      planned: command.plannedKeys.length,
      completed: command.completedKeys.length,
      censored: (command.censoredKeys || []).length,
      errors: (command.errorKeys || []).length,
      unstarted: command.unstartedKeys.length,
      complete: isCoverageComplete(command),
      exclusions: ctx.exclusions || []
    },
    sources: {
      runtimeLabel: command.runtimeLabel,
      runtimeFingerprint: command.runtimeFingerprint,
      files: (command.runtimeFiles || []).length,
      harnessFingerprint: command.harnessFingerprint,
      adapterIds: command.adapterIds,
      adapterHashes: command.adapterHashes,
      sourceStable: command.sourceStable,
      firewallClean: command.firewallClean
    },
    cpu: command.cpu || null,
    pairedRows: pairs,
    arms: arms,
    estimateVerdict: ctx.estimateVerdict || 'inconclusive',
    extra: ctx.extra || null,
    notes: ctx.notes || []
  };
}

function fmt(value) {
  if (value === null || value === undefined) return 'n/a';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(3);
  return String(value);
}

function table(headers, rows) {
  const out = ['| ' + headers.join(' | ') + ' |', '|' + headers.map(function () { return '---'; }).join('|') + '|'];
  rows.forEach(function (row) { out.push('| ' + row.map(fmt).join(' | ') + ' |'); });
  return out.join('\n');
}

function renderSummaryMarkdown(summary) {
  const lines = [];
  lines.push('# ' + summary.task + ' / ' + summary.shard + ' (' + summary.round + ', ' + summary.attemptId + ')');
  lines.push('');
  if (summary.provisionalNotice) lines.push('**' + summary.provisionalNotice + '**', '');
  lines.push('Evidence status: **' + summary.evidenceStatus + '**. Formal gate: **' + summary.formalGate + '**.');
  lines.push('Command status: **' + summary.status + '** (exit ' + summary.exit + '). Estimate verdict: ' +
    summary.estimateVerdict + '.', '');
  lines.push('## Coverage', '');
  const c = summary.coverage;
  lines.push(table(['planned', 'completed', 'censored', 'errors', 'unstarted', 'coverage complete'],
    [[c.planned, c.completed, c.censored, c.errors, c.unstarted, c.complete]]), '');
  if (c.exclusions.length > 0) lines.push('Exclusions: ' + c.exclusions.join('; '), '');
  lines.push('## Sources', '');
  const s = summary.sources;
  lines.push(table(['item', 'value'], [
    ['runtime label (supplied)', s.runtimeLabel], ['runtime fingerprint', s.runtimeFingerprint],
    ['runtime files', s.files], ['harness fingerprint', s.harnessFingerprint],
    ['adapters', (s.adapterIds || []).join(', ') || 'none'], ['sources stable', s.sourceStable],
    ['firewall clean', s.firewallClean]]), '');
  if (summary.cpu) {
    lines.push('CPU: ' + summary.cpu.api + '; observed quantum ' + fmt(summary.cpu.quantumMs) +
      ' ms. A value below the quantum is unresolved and gives no rate or factor.', '');
  }
  if (summary.pairedRows.length > 0) {
    lines.push('## Paired rows (before = reference, after = prototype)', '');
    lines.push(table(['pair', 'ref ready ms', 'ref cold ms', 'ref cpu ms', 'proto ready ms', 'proto cold ms',
      'proto cpu ms', 'cpu factor', 'ready factor', 'cold factor'], summary.pairedRows.map(function (p) {
      const r = p.reference || {};
      const q = p.prototype || {};
      return [p.pairId, r.readyWallMs, r.coldWallMs, r.cpuTotalMs, q.readyWallMs, q.coldWallMs, q.cpuTotalMs,
        p.cpuFactor, p.readyWallFactor, p.coldWallFactor];
    })), '');
  }
  Object.keys(summary.arms).forEach(function (arm) {
    const a = summary.arms[arm];
    lines.push('## Arm: ' + arm, '');
    lines.push(table(['metric', 'n', 'p50', 'p95', 'max', 'upper median'], [
      ['ready wall ms', a.readyWallMs.n, a.readyWallMs.p50, a.readyWallMs.p95, a.readyWallMs.max,
        a.readyWallMs.upperMedian],
      ['cold wall ms', a.coldWallMs.n, a.coldWallMs.p50, a.coldWallMs.p95, a.coldWallMs.max,
        a.coldWallMs.upperMedian],
      ['cpu total ms', a.cpuTotalMs.n, a.cpuTotalMs.p50, a.cpuTotalMs.p95, a.cpuTotalMs.max,
        a.cpuTotalMs.upperMedian]]), '');
    lines.push('Requests ' + a.requests + ', complete ' + a.complete + ', censored ' + a.censored + ', errors ' +
      a.errors + ', validation unknown ' + a.validationUnknown + ', unstarted ' + a.unstarted + '. Verified hits ' +
      a.verifiedHits + '; per CPU second ' + fmt(a.hitsPerCpuSecond) + ' (all spent CPU ' +
      fmt(a.cpuTotalAggregateMs) + ' ms, ' + a.cpuAggregateStatus + '); per cold wall second ' +
      fmt(a.hitsPerColdWallSecond) + ' (all spent wall ' + fmt(a.wallChargedMs) +
      ' ms). With few requests p95 is the observed maximum.', '');
    lines.push('Spent generation work behind the rates (completed, censored, error and validation-unknown ' +
      'requests all count):', '');
    lines.push(table(['category', 'requests', 'cpu ms', 'wall ms (cold + cleanup)'],
      ['complete', 'censored', 'errors', 'validationUnknown', 'total'].map(function (k) {
        return [k, a.spent[k].requests, a.spent[k].cpuMs, a.spent[k].wallMs];
      })), '');
  });
  if (summary.extra) {
    lines.push('## Task details', '', '```json', JSON.stringify(summary.extra, null, 2), '```', '');
  }
  if (summary.notes.length > 0) {
    lines.push('## Notes', '');
    summary.notes.forEach(function (n) { lines.push('- ' + n); });
  }
  return C.normaliseText(lines.join('\n'));
}

module.exports = {
  OUTCOMES, TIMEOUT_SCOPES, RECORD_FIELDS, GENERATION_FIELDS, VALIDATION_FIELDS, COUNT_FIELDS, EVIDENCE_FILES,
  ATTEMPT_ID, ANALYSIS_SEED, PROVISIONAL_NOTICE, blankRecord, checkRecord, recordBase, percentileNearestRank,
  upperMedian, describe, classifyCpu, usable, ratio, ratePerSecond, binomialTailAtLeast, binomialLowerBound,
  mulberry32, bootstrapClusters, normaliseWire, compareDigests, Journal, reconcile, buildRecords,
  selectResumable, shardDirOf, attemptDirOf, openAttempt, listAttempts, nextAttemptId, shardStatus,
  scanRoundCommands, collectCharges, validateFreezeReceipt, validateBudgetReceipt, receiptProblems, evaluateGate,
  chainOf, lastChain, startedKeysOf,
  exitCodeForStatus, isCoverageComplete, buildSummary, renderSummaryMarkdown, armSummary
};
