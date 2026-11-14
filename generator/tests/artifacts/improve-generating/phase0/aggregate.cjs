'use strict';

/*
 * Task summary of IG-S02 across its eight shards: coverage, the paired native-w1 / attempts-w4 rows, per-cell statistics
 * next to the report's estimates, the pool occupancy (the two-attempt ceiling), exact counts, first-exact origin, the
 * machine time charged and the priority waits. It reads evidence only (JSON and markdown, no engine, nothing timed) and
 * writes `<round>/<task>/summary.json` and `summary.md`, once (an existing name fails closed; --out=<name> for another).
 *
 *   node aggregate.cjs --task=IG-S02 --round=provisional-r1 [--out=summary]
 *
 * Everything is provisional (pre-freeze): it enables no cell, selects no allowance and decides no default.
 */
const fs = require('fs');
const path = require('path');
const C = require('./common.cjs');
const R = require('./records.cjs');
const M = require('./manifest.cjs');
const RUN = require('./run.cjs');
const IG = require('./ig02-run.cjs');

const HarnessError = C.HarnessError;

function parseArgs(argv) {
  const opts = { task: 'IG-S02', round: null, out: 'summary', audits: [] };
  argv.forEach(function (arg) {
    const m = /^--(task|round|out|audit)=(.*)$/.exec(arg);
    if (!m) throw new HarnessError('args', 'unknown argument ' + arg);
    if (m[1] === 'audit') opts.audits.push(m[2]);
    else opts[m[1]] = m[2];
  });
  if (opts.task !== 'IG-S02') throw new HarnessError('args', 'aggregate.cjs summarises --task=IG-S02');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(opts.round || '')) throw new HarnessError('args', 'missing or bad --round');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(opts.out)) throw new HarnessError('args', 'bad --out');
  return opts;
}

/** An audit sidecar (ig02-killer-audit.cjs) by path, as it is on disk: its file hash is part of every link. */
function loadAudit(repoRoot, evidenceRoot, given) {
  const file = path.resolve(repoRoot, given);
  if (!C.isInside(evidenceRoot, file)) throw new HarnessError('path-unauthorised', 'an audit sidecar is under the evidence: ' + file);
  const bytes = fs.readFileSync(file);
  const doc = JSON.parse(bytes.toString('utf8'));
  if (doc.schema !== 'ig-s-audit/1') throw new HarnessError('audit-invalid', 'not an ig-s-audit/1 file: ' + given);
  return { file: C.toPosix(path.relative(evidenceRoot, file)), sha256: C.sha256(bytes), doc: doc };
}

/**
 * Reconciled copies of the audited records: a record that the original audit rejected and the re-audit verified. Only a
 * fully linked entry is applied (the original record, the saved puzzle file and the entry's own link hash must all match
 * and the verifier tests must have passed); anything else stops. The stored records are never modified: a copy carries the
 * original outcome, error and validation next to the new fields, and its generation timings are the original ones.
 */
function reconcile(records, audits, evidenceRoot) {
  const byKey = new Map(records.map(function (r) { return [r.key, r]; }));
  const applied = [];
  const out = new Map();
  audits.forEach(function (a) {
    if (!a.doc.verifierTests || a.doc.verifierTests.passed !== true) {
      throw new HarnessError('audit-invalid', 'the verifier tests of ' + a.file + ' did not pass: no reconciliation');
    }
    a.doc.entries.forEach(function (entry) {
      const rec = byKey.get(entry.key);
      if (!rec) throw new HarnessError('audit-invalid', 'no record ' + entry.key);
      if (C.digestOf(rec) !== entry.links.recordDigest) {
        throw new HarnessError('audit-invalid', 'the record differs from the one the audit linked: ' + entry.key);
      }
      if (rec.puzzleFileSha256 !== entry.links.puzzleFileSha256) {
        throw new HarnessError('audit-invalid', 'the saved puzzle differs from the one the audit linked: ' + entry.key);
      }
      const puzzle = path.resolve(evidenceRoot, ...entry.links.puzzleFile.split('/'));
      let onDisk = null;
      try {
        onDisk = C.sha256(fs.readFileSync(puzzle));
      } catch (err) {
        onDisk = null;
      }
      if (!C.isInside(evidenceRoot, puzzle) || onDisk !== entry.links.puzzleFileSha256) {
        throw new HarnessError('audit-invalid', 'the puzzle file is missing or changed since the audit: ' + entry.key);
      }
      const link = C.digestOf({ key: entry.key, recordDigest: entry.links.recordDigest,
        puzzleFileSha256: entry.links.puzzleFileSha256, auditDigest: C.digestOf(entry.audit),
        reconciledDigest: C.digestOf(entry.reconciled) });
      if (link !== entry.linkHash) throw new HarnessError('audit-invalid', 'the link hash of ' + entry.key + ' does not hold');
      const ok = entry.links.puzzleFileMatchesRecord && entry.links.digestsMatchRecord && entry.links.puzzleHashMatchesRecord &&
        entry.links.savedKeyMatchesRecord && entry.falseExactFlag !== true;
      if (!ok) throw new HarnessError('audit-invalid', 'the audit does not link or agree with ' + entry.key);
      const copy = JSON.parse(JSON.stringify(rec));
      const r = entry.reconciled;
      copy.outcome = r.outcome;
      copy.error = r.outcome === 'error' ? rec.error : null;
      copy.verifiedExact = r.verifiedExact;
      copy.required = r.required;
      copy.vacuous = r.vacuous;
      copy.shallow = r.shallow;
      copy.validation = r.validation;
      copy.validationDetail = r.validationDetail;
      copy.reconciliation = { audit: a.file, auditFileSha256: a.sha256, linkHash: entry.linkHash,
        originalOutcome: rec.outcome, originalError: rec.error, originalValidation: rec.validation,
        originalValidationDetail: rec.validationDetail, note: 'generation timings and fingerprints are the original ones' };
      out.set(entry.key, copy);
      applied.push({ key: entry.key, audit: a.file, auditFileSha256: a.sha256, linkHash: entry.linkHash,
        originalOutcome: rec.outcome, newOutcome: r.outcome, status: entry.audit.status, verifiedExact: r.verifiedExact });
    });
  });
  return { records: records.map(function (r) { return out.has(r.key) ? out.get(r.key) : r; }), applied: applied };
}

function collect(repoRoot, task, round) {
  const evidenceRoot = RUN.evidenceRootOf(repoRoot);
  const manifest = M.buildManifest(task, round);
  const shards = manifest.shards.map(function (shard) {
    const dir = R.shardDirOf(evidenceRoot, round, task, shard.shard);
    const attempts = R.listAttempts(dir);
    const chain = R.lastChain(attempts);
    const lists = chain.map(function (a) {
      const file = path.join(a.dir, R.EVIDENCE_FILES.records);
      return fs.existsSync(file) ? C.readJson(file).records : [];
    });
    const state = R.shardStatus(dir, shard);
    return { shard: shard.shard, keys: shard.jobKeys, status: state.status, chain: chain.map(function (a) {
      return a.attemptId; }), commands: chain.map(function (a) { return a.command; }).filter(Boolean),
    records: RUN.mergeRecords(lists), unstartedKeys: state.unstartedKeys };
  });
  return { manifest: manifest, shards: shards, evidenceRoot: evidenceRoot };
}

function machineTime(repoRoot, task, round) {
  const evidenceRoot = RUN.evidenceRootOf(repoRoot);
  const roundDir = path.join(evidenceRoot, round);
  const ledger = RUN.readLedger(roundDir);
  const scanned = R.scanRoundCommands(roundDir);
  const charges = R.collectCharges(ledger, scanned).filter(function (c) { return c.task === task; });
  const charged = charges.reduce(function (sum, c) { return sum + (Number.isFinite(c.chargedMs) ? c.chargedMs : 0); }, 0);
  const entries = ledger.entries.filter(function (e) { return e.task === task; }).map(function (e) {
    return { shard: e.shard, attemptId: e.attemptId, status: e.status, occupiedMs: e.occupiedMs,
      chargedMs: e.chargedMs, priorityWaitMs: e.priorityWaitMs, requestedAt: e.requestedAt, endedAt: e.endedAt };
  });
  // A command launched straight through the wrapper (the re-audit) is charged from its command.json.
  charges.filter(function (c) { return c.source === 'evidence'; }).forEach(function (c) {
    const found = scanned.find(function (s) { return s.rel === c.ref; });
    const cmd = found ? found.command : null;
    const t = cmd && cmd.timing ? cmd.timing : {};
    entries.push({ shard: cmd ? cmd.shard : null, attemptId: cmd ? cmd.attemptId : null, status: cmd ? cmd.status : null,
      occupiedMs: t.occupiedMs === undefined ? null : t.occupiedMs, chargedMs: c.chargedMs,
      priorityWaitMs: t.priorityWaitMs === undefined ? null : t.priorityWaitMs, requestedAt: t.requestedAt || null,
      endedAt: t.endedAt || null });
  });
  return {
    allocationMs: M.ALLOCATIONS_MS[task],
    chargedMs: charged,
    remainingMs: M.ALLOCATIONS_MS[task] - charged,
    commands: charges.length,
    priorityWaitMs: entries.reduce(function (sum, e) { return sum + (Number.isFinite(e.priorityWaitMs) ? e.priorityWaitMs : 0); }, 0),
    entries: entries,
    note: 'charged = occupied wrapper time + the 45 s quiet-admission grace per command; the priority wait is not charged'
  };
}

function build(repoRoot, task, round, audits) {
  const got = collect(repoRoot, task, round);
  let records = [];
  got.shards.forEach(function (s) { records.push.apply(records, s.records); });
  const reconciled = reconcile(records, audits || [], got.evidenceRoot);
  records = reconciled.records;
  const identity = IG.identity(records);
  const pairs = IG.pairRows(records, identity.pairs);
  const cells = IG.cellsOf(pairs);
  const commands = [];
  got.shards.forEach(function (s) { s.commands.forEach(function (c) { commands.push(c); }); });
  const latest = got.shards.map(function (s) { return s.commands[s.commands.length - 1]; }).filter(Boolean);
  const uniq = function (list) { return Array.from(new Set(list)); };
  const planned = got.manifest.jobs.length;
  const byKey = new Map(records.map(function (r) { return [r.key, r]; }));
  const count = function (outcomes) {
    return got.manifest.jobs.filter(function (j) {
      const r = byKey.get(j.key);
      return r && outcomes.indexOf(r.outcome) >= 0;
    }).length;
  };
  const rejected = got.manifest.jobs.filter(function (j) {
    const r = byKey.get(j.key);
    return r && r.outcome === 'error' && r.error && r.error.code === 'validation-failed';
  }).length;
  const identityCount = function (verdict) {
    return pairs.filter(function (p) { return p.identity === verdict; }).length;
  };
  return {
    schema: C.SCHEMA,
    task: task,
    round: round,
    evidenceStatus: round === C.ROUND_FROZEN ? C.EVIDENCE_FROZEN : C.EVIDENCE_PROVISIONAL,
    provisionalNotice: R.PROVISIONAL_NOTICE,
    formalGate: round === C.ROUND_FROZEN ? 'see the command gate' : 'not-evaluable-pre-freeze',
    coverage: {
      plannedRequests: planned,
      pairs: 18,
      completed: count(['complete']),
      censored: count(['request-timeout']),
      errors: count(['error']) - rejected,
      auditRejected: rejected,
      validationUnknown: count(['validation-unknown']),
      unstarted: planned - count(['complete', 'request-timeout', 'error', 'validation-unknown']),
      shards: got.shards.map(function (s) {
        return { shard: s.shard, status: s.status, attempts: s.chain, unstarted: s.unstartedKeys.length,
          reconciledKeys: reconciled.applied.filter(function (a) { return a.key.indexOf('/' + s.shard + '/') >= 0; }).length };
      })
    },
    reconciliation: { audits: (audits || []).map(function (a) {
      return { file: a.file, sha256: a.sha256, status: a.doc.status, verifierTestsPassed: a.doc.verifierTests.passed,
        summary: a.doc.summary, harnessComparison: a.doc.harnessComparison, verifier: a.doc.verifier, source: a.doc.source };
    }), applied: reconciled.applied,
    note: 'the stored records are never modified: a reconciled row is a copy that carries the original outcome and error, ' +
      'the original generation timings and fingerprints, and the hash-linked audit that verified its saved puzzle' },
    identity: { ok: identityCount('identity-ok'), failed: identityCount('identity-failed'),
      digestsEqualAuditRejected: identityCount('digests-equal-audit-rejected'),
      notComparable: identityCount('not-comparable'),
      deferred: identityCount('deferred') + identityCount('not-started') + identityCount(null) },
    cells: cells,
    pairs: pairs,
    machine: machineTime(repoRoot, task, round),
    sources: {
      runtimeFingerprints: uniq(latest.map(function (c) { return c.runtimeFingerprint; })),
      harnessFingerprints: uniq(latest.map(function (c) { return c.harnessFingerprint; })),
      adapterHashes: uniq([].concat.apply([], latest.map(function (c) { return c.adapterHashes || []; }))),
      sourceStable: latest.every(function (c) { return c.sourceStable === true; }),
      firewallClean: latest.every(function (c) { return c.firewallClean === true; }),
      commandStatuses: latest.map(function (c) { return c.shard + ':' + c.attemptId + ':' + c.status; })
    },
    syntheticPoolTests: (function () {
      const first = got.shards[0];
      const summaryFile = first && first.chain.length > 0 ? path.join(R.attemptDirOf(R.shardDirOf(got.evidenceRoot, round,
        task, first.shard), first.chain[0]), R.EVIDENCE_FILES.summary) : null;
      if (!summaryFile || !fs.existsSync(summaryFile)) return null;
      const extra = C.readJson(summaryFile).extra;
      return extra ? extra.syntheticPoolTests : null;
    })()
  };
}

function f(x, digits) {
  if (x === null || x === undefined) return 'n/a';
  if (typeof x !== 'number') return String(x);
  return Number.isInteger(x) && digits === undefined ? String(x) : x.toFixed(digits === undefined ? 2 : digits);
}

function table(headers, rows) {
  const out = ['| ' + headers.join(' | ') + ' |', '|' + headers.map(function () { return '---'; }).join('|') + '|'];
  rows.forEach(function (row) { out.push('| ' + row.map(function (v) { return v === null || v === undefined ? 'n/a' : v; }).join(' | ') + ' |'); });
  return out.join('\n');
}

function stat(d) {
  return d && d.n > 0 ? f(d.p50) + ' / ' + f(d.p95) : 'n/a';
}

function render(doc) {
  const L = [];
  L.push('# ' + doc.task + ' task summary (' + doc.round + ')', '');
  L.push('**' + doc.provisionalNotice + '**', '');
  L.push('Evidence status: **' + doc.evidenceStatus + '**. Formal gate: **' + doc.formalGate + '**. Arms: native-w1 = the ' +
    'full unmodified pipeline in one worker; attempts-w4 = S5a, one absolute attempt per worker, min(4, A) workers, ' +
    'consumed in native order.', '');
  const c = doc.coverage;
  L.push('## Coverage', '');
  L.push(table(['planned requests', 'pairs', 'complete', 'censored', 'errors', 'audit rejected', 'validation unknown',
    'unstarted'], [[c.plannedRequests, c.pairs, c.completed, c.censored, c.errors, c.auditRejected,
    c.validationUnknown, c.unstarted]]), '');
  L.push(table(['shard', 'status', 'attempts', 'unstarted keys', 'rows reconciled by audit'], c.shards.map(function (s) {
    return [s.shard, s.status, s.attempts.join(','), s.unstarted, s.reconciledKeys];
  })), '');
  L.push('Identity of the pairs (every digest section of the normalised result, exact flags, pool invariants): ' +
    doc.identity.ok + ' ok, ' + doc.identity.failed + ' failed, ' + doc.identity.digestsEqualAuditRejected +
    ' with equal digests but both puzzles rejected by the independent audit, ' + doc.identity.notComparable +
    ' not comparable (censored), ' + doc.identity.deferred + ' deferred.', '');
  L.push('## Per cell, next to the report (seconds; p50 / p95 nearest rank, p95 = the observed maximum for n < 20)', '');
  L.push(table(['cell', 'A', 'pairs', 'verified pairs', 'native ready', 'pooled ready',
    'ready speed-up (n/med/min-max)', 'cold speed-up med', 'CPU pooled / native med', 'report today med / p95',
    'report S5a factor', 'verdict'],
  doc.cells.map(function (x) {
    const rep = x.report;
    return [x.cell, x.attemptsPlanned, x.pairs, x.completePairs, stat(x.native.readyWallS), stat(x.pooled.readyWallS),
      x.readySpeedup.n + ' / ' + f(x.readySpeedup.upperMedian) + ' / ' + f(x.readySpeedupMin) + '-' +
        f(x.readySpeedup.max),
      f(x.coldSpeedup.upperMedian), f(x.cpuRatio.upperMedian), rep ? f(rep.today[0], 1) + ' / ' + f(rep.today[1], 1) : 'n/a',
      rep ? rep.s5a[0] + '-' + rep.s5a[1] : 'n/a', x.verdict];
  })), '');
  L.push('Cold wall, CPU and exact counts per arm:', '');
  L.push(table(['cell', 'native cold p50 / p95', 'pooled cold p50 / p95', 'native CPU p50 / p95', 'pooled CPU p50 / p95',
    'native verified exact', 'pooled verified exact', 'censored (native / pooled)', 'errors (native / pooled)',
    'audit rejected (native / pooled)', 'above 120 s (native / pooled)'], doc.cells.map(function (x) {
    return [x.cell, stat(x.native.coldWallS), stat(x.pooled.coldWallS), stat(x.native.cpuTotalS), stat(x.pooled.cpuTotalS),
      x.native.verifiedExact + '/' + x.native.requests, x.pooled.verifiedExact + '/' + x.pooled.requests,
      x.native.censored + ' / ' + x.pooled.censored, x.native.errors + ' / ' + x.pooled.errors,
      x.native.auditRejected + ' / ' + x.pooled.auditRejected, x.above120s.native + ' / ' + x.above120s.pooled];
  })), '');
  L.push('## Pool occupancy and origin (the two-attempt ceiling: min(4, A) lanes, never four busy on A = 2)', '');
  L.push(table(['cell', 'A', 'lanes', 'peak active', 'mean busy lanes (med)', 'attempts consumed', 'attempts started',
    'speculative completed', 'first exact origin', 'first exact attempt', 'duplicated model build ms'],
  doc.cells.map(function (x) {
    const p = x.pool;
    return [x.cell, x.attemptsPlanned, p.width, p.peakActive, f(p.meanBusyLanes.upperMedian), p.attemptsConsumed.join(','),
      p.attemptsStarted.join(','), p.speculativeCompleted, p.firstExactOrigins.map(function (o) { return o || '-'; }).join(','),
      p.firstExactOrdinals.map(function (o) { return o === null ? '-' : o; }).join(','),
      p.duplicatedModelBuildMs.map(function (v) { return f(v, 1); }).join(',')];
  })), '');
  L.push('## Paired rows (before = native-w1, after = attempts-w4; seconds)', '');
  L.push(table(['pair', 'first arm', 'native ready', 'native cold', 'native CPU', 'pooled ready', 'pooled cold', 'pooled CPU',
    'ready x', 'cold x', 'CPU ratio', 'exact (native / pooled)', 'identity', 'outcomes'], doc.pairs.map(function (p) {
    const n = p.native || {};
    const q = p.pooled || {};
    const sec = function (ms) { return ms === null || ms === undefined ? 'n/a' : f(ms / 1000); };
    return [p.pairId, p.firstArm, sec(n.readyWallMs), sec(n.coldWallMs), sec(n.cpuTotalMs), sec(q.readyWallMs),
      sec(q.coldWallMs), sec(q.cpuTotalMs), f(p.readySpeedup), f(p.coldSpeedup), f(p.cpuRatio),
      (n.verifiedExact === true ? 'yes' : n.verifiedExact === false ? 'no' : 'n/a') + ' / ' +
      (q.verifiedExact === true ? 'yes' : q.verifiedExact === false ? 'no' : 'n/a'), p.identity,
      (n.outcome || 'unstarted') + ' / ' + (q.outcome || 'unstarted')];
  })), '');
  L.push('## Machine time and priority waits', '');
  const m = doc.machine;
  L.push('Charged ' + f(m.chargedMs / 1000, 1) + ' s of the ' + f(m.allocationMs / 1000, 0) + ' s allocation over ' +
    m.commands + ' commands (remaining ' + f(m.remainingMs / 1000, 1) + ' s); priority waits behind difficulty-v3 ' +
    f(m.priorityWaitMs / 1000, 1) + ' s, not charged. ' + m.note + '.', '');
  L.push(table(['shard', 'attempt', 'status', 'occupied s', 'charged s', 'priority wait s'], m.entries.map(function (e) {
    return [e.shard, e.attemptId, e.status, f(e.occupiedMs / 1000, 1), f(e.chargedMs / 1000, 1),
      f(e.priorityWaitMs / 1000, 1)];
  })), '');
  L.push('## Sources', '');
  const s = doc.sources;
  L.push(table(['item', 'value'], [['runtime fingerprints', s.runtimeFingerprints.join(', ')],
    ['harness fingerprints', s.harnessFingerprints.join(', ')], ['adapter hashes', s.adapterHashes.join(', ')],
    ['sources stable', s.sourceStable], ['firewall clean', s.firewallClean],
    ['commands', s.commandStatuses.join('; ')]]), '');
  if (doc.reconciliation && doc.reconciliation.audits.length > 0) {
    const rc = doc.reconciliation;
    L.push('## Reconciliation by audit sidecar', '', rc.note + '.', '');
    rc.audits.forEach(function (a) {
      L.push('Audit `' + a.file + '` (file sha256 `' + a.sha256 + '`): status ' + a.status + ', verifier tests ' +
        (a.verifierTestsPassed ? 'passed' : 'FAILED') + ', ' + a.summary.verified + ' verified, ' + a.summary.failed +
        ' failed, ' + a.summary.unknown + ' unknown of ' + a.summary.audited + '. Verifier: worker.cjs `' +
        a.verifier.workerSha256 + '`, killer-audit.cjs `' + a.verifier.killerAuditSha256 + '`. Harness since the evidence (' +
        a.harnessComparison.evidenceFingerprint.slice(0, 8) + ' to ' + a.harnessComparison.currentFingerprint.slice(0, 8) +
        '): changed ' + a.harnessComparison.changed.join(', ') + '; added ' + a.harnessComparison.added.join(', ') + '. ' +
        a.harnessComparison.note, '');
    });
    L.push(table(['key', 'original outcome', 'audit status', 'new outcome', 'verified exact', 'link hash'],
      rc.applied.map(function (a) {
        return [a.key, a.originalOutcome, a.status, a.newOutcome, a.verifiedExact, a.linkHash.slice(0, 16)];
      })), '');
  }
  if (doc.syntheticPoolTests) {
    const t = doc.syntheticPoolTests;
    L.push('## Synthetic pool tests (first shard)', '', t.passed + '/' + t.total + ' passed.', '');
  }
  return C.normaliseText(L.join('\n'));
}

function main(argv) {
  const opts = parseArgs(argv);
  const repoRoot = C.DEFAULT_REPO_ROOT;
  const evidenceRoot = RUN.evidenceRootOf(repoRoot);
  const audits = opts.audits.map(function (given) { return loadAudit(repoRoot, evidenceRoot, given); });
  const doc = build(repoRoot, opts.task, opts.round, audits);
  const dir = path.join(evidenceRoot, opts.round, opts.task);
  C.writeJsonAtomic(repoRoot, path.join(dir, opts.out + '.json'), doc);
  C.writeTextExclusive(repoRoot, path.join(dir, opts.out + '.md'), render(doc));
  process.stdout.write('IG-S02 task summary written: ' + C.toPosix(path.relative(repoRoot, path.join(dir, opts.out))) + '.json/.md\n');
  return 0;
}

module.exports = { build, render, collect, machineTime, reconcile, loadAudit };

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    process.stderr.write('IG aggregate error [' + (err && err.code ? err.code : 'unexpected') + ']: ' +
      (err && err.message ? err.message : String(err)) + '\n');
    process.exitCode = C.exitCodeOf(err);
  }
}
