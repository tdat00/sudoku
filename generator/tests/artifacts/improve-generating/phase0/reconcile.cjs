'use strict';

/*
 * IG-S10 reconciliation (part 1): the accepted evidence of IG-S01 to IG-S09 read back from disk, the coverage
 * reconciliation (every declared key: completed, completed by audit overlay, budget-ended, censored, error, unstarted,
 * deferred; auxiliary commands and excluded observations listed, never dropped) and the machine accounting of the whole
 * round. Pure reads: no engine, no worker, no clock, no git. Everything is provisional (pre-freeze).
 *
 * The second part (`reconcile-report.cjs`) builds the estimate-versus-measured report on top of this.
 */
const fs = require('fs');
const path = require('path');
const C = require('./common.cjs');
const R = require('./records.cjs');
const M = require('./manifest.cjs');
const RUN = require('./run.cjs');

const HarnessError = C.HarnessError;
const ROUND = 'provisional-r1';
const TASKS = Object.freeze(['IG-S01', 'IG-S02', 'IG-S03', 'IG-S04', 'IG-S05', 'IG-S07', 'IG-S08', 'IG-S09']);
const FIRST_ROUND_ALLOCATION_ORDER = Object.freeze(['IG-S01', 'IG-S02', 'IG-S03', 'IG-S04', 'IG-S05', 'IG-S06', 'IG-S07',
  'IG-S08', 'IG-S09', 'IG-S10']);

// The accepted revision of every document used (the check-list's review table and the Execution logs). `big` documents are
// hashed but not parsed: the report needs only their fingerprints.
const EVIDENCE = Object.freeze({
  s02Summary: { rel: 'IG-S02/summary-r2.json' },
  s02Audit: { rel: 'IG-S02/killer/audit-a1/audit.json' },
  s03Summary: { rel: 'IG-S03/summary-r3.json' },
  s03Coverage: { rel: 'IG-S03/coverage-r3.json' },
  s03Parity: { rel: 'IG-S03/parity-r3.json', big: true },
  s03Checks: { rel: 'IG-S03/check-sequences-r3.json', big: true },
  s04Summary: { rel: 'IG-S04/summary-r2.json' },
  s04Budgets: { rel: 'IG-S04/budgets-r2.json' },
  s04Audit: { rel: 'IG-S04/s2-audit-r2.json', big: true },
  s04Retest: { rel: 'IG-S04/engine-retest-r2.json' },
  s04Reprojection: { rel: 'IG-S04/pilot-reprojection.json' },
  s05Summary: { rel: 'IG-S05/summary-r2.json' },
  s05Rates: { rel: 'IG-S05/rates-r2.json' },
  s05Intervals: { rel: 'IG-S05/paired-intervals-r2.json' },
  s05Selection: { rel: 'IG-S05/selection.json' },
  s05Manifest: { rel: 'IG-S05/screen-manifest.json', big: true },
  s07Summary: { rel: 'IG-S07/summary-r2.json' },
  s07Stage: { rel: 'IG-S07/stage-profile-r2.json', big: true },
  s07Finder: { rel: 'IG-S07/finder-profile-r2.json', big: true },
  s07Overhead: { rel: 'IG-S07/overhead.json' },
  s07Frontier: { rel: 'IG-S07/frontier-phase-a.json', big: true },
  s08Summary: { rel: 'IG-S08/summary-r3.json' },
  s08Tail: { rel: 'IG-S08/tail-attribution-r3.json', big: true },
  s09Summary: { rel: 'IG-S09/summary-r2.json' },
  s09MissSplit: { rel: 'IG-S09/miss-split-r2.json', big: true },
  s09OrderParity: { rel: 'IG-S09/order-parity-r2.json', big: true },
  s09Probes: { rel: 'IG-S09/setup-probes-r2.json', big: true },
  s09Samples: { rel: 'IG-S09/samples-r2.json', big: true },
  s09SignPasses: { rel: 'IG-S09/sign-passes-r2.json', big: true }
});

// What the Execution logs and the pack author name as accepted: the measurement, report-writer and corrected-harness
// fingerprints are kept apart (the corrections were not engine-rerun). Prefixes; every one is searched for in the evidence.
const DECLARED_FINGERPRINTS = Object.freeze({
  'IG-S01': { measurement: ['64b1e386'], writers: [], corrected: [] },
  'IG-S02': { measurement: ['dd759a22'], writers: ['c4f3a6e0'], corrected: ['c4f3a6e0'] },
  'IG-S03': { measurement: ['baeb9ea2', 'dedddaef'], writers: ['dedddaef'], corrected: [] },
  'IG-S04': { measurement: ['694eea9b'], writers: ['98016f2c'], corrected: ['98016f2c'] },
  'IG-S05': { measurement: ['58c583c2'], writers: ['f297ca31'], corrected: ['f297ca31'] },
  'IG-S07': { measurement: ['0feb1ea57bd4'], writers: ['f91e6e527f67', '5027a528f03a'], corrected: ['062742c330eb', '5027a528f03a'] },
  'IG-S08': { measurement: ['fe2bae1efce6'], writers: ['acd724186e2d', '82b623923934'], corrected: ['82b623923934'] },
  'IG-S09': { measurement: ['9da69f60'], writers: ['89105175e832', 'd414ebac'], corrected: ['bbd5db2da6cd'] }
});

const TASK_META = Object.freeze({
  'IG-S01': { title: 'Isolated loader, manifests, safety and records', status: 'accepted',
    accepted: 'accepted after one fix round (harness 64b1e386); infrastructure only, no estimate' },
  'IG-S02': { title: 'Paired headline baseline and S5a width-4 attempt pool', status: 'accepted',
    accepted: 'accepted after the Killer audit (summary-r2 with the hash-linked sidecar)' },
  'IG-S03': { title: 'Small S3 prototype (partial) with virtual-check parity', status: 'accepted',
    accepted: 'accepted (summary-r3): SM4 parity sufficient for these families; no material net gain from the partial S3' },
  'IG-S04': { title: 'S1/S2 frontier variants and the staged budget pilot', status: 'accepted',
    accepted: 'accepted after the six-key completion and one correction round (summary-r2, budgets-r2)' },
  'IG-S05': { title: 'Paired SM2 grid screen and yield rates', status: 'accepted-inconclusive',
    accepted: 'accepted, inconclusive by the preregistered rule (summary-r2)' },
  'IG-S06': { title: 'Held-out requests and ordered sample composition', status: 'deferred',
    accepted: 'DEFERRED this pre-freeze round (2026-11-15 scheduling decision): not passed, not refuted, not run' },
  'IG-S07': { title: 'SM1 stage and finder profiles', status: 'accepted',
    accepted: 'accepted after one fix round (summary-r2): provisional attribution, not complete solver-check accounting' },
  'IG-S08': { title: 'Bounded SM3 attribution of Jigsaw Expert seed 1111', status: 'accepted',
    accepted: 'accepted after one reporting-only round (summary-r3): a censored lower bound, not a latency gate' },
  'IG-S09': { title: 'Greater-Than miss split and solve-first diagnostic', status: 'accepted-partial',
    accepted: 'accepted as an authorised partial diagnostic (summary-r2, F1-F5 closed): Nightmare 706-709 unstarted' }
});

const NOTE_PROVISIONAL = 'PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a ' +
  'cell, selects an allowance, changes a default or authorises the bank route.';

function readJsonBytes(abs) {
  const bytes = fs.readFileSync(abs);
  return { bytes: bytes, doc: JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, '')) };
}

/**
 * The accepted documents of the round: every file's sha-256 and size (read once), the parsed JSON of the ones the report
 * quotes. A missing file stops: a reconciliation over absent evidence is a silent exclusion.
 */
function loadEvidence(roundDir) {
  const out = {};
  Object.keys(EVIDENCE).forEach(function (name) {
    const spec = EVIDENCE[name];
    const abs = path.join(roundDir, ...spec.rel.split('/'));
    if (!fs.existsSync(abs)) throw new HarnessError('evidence-missing', 'accepted evidence is missing: ' + spec.rel);
    const bytes = fs.readFileSync(abs);
    out[name] = { name: name, rel: spec.rel, sha256: C.sha256(bytes), bytes: bytes.length,
      doc: spec.big ? null : JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, '')) };
  });
  return out;
}

function get(obj, pathText, fallback) {
  let cur = obj;
  const parts = pathText.split('.');
  for (let i = 0; i < parts.length; i++) {
    if (cur === null || cur === undefined) return fallback === undefined ? null : fallback;
    cur = cur[parts[i]];
  }
  return cur === undefined ? (fallback === undefined ? null : fallback) : cur;
}

function uniq(list) {
  return Array.from(new Set(list.filter(function (x) { return x !== null && x !== undefined; })));
}

// --- one task's evidence --------------------------------------------------------------------------------------------

function attemptRel(roundDir, attempt) {
  return C.toPosix(path.relative(roundDir, path.join(attempt.dir, R.EVIDENCE_FILES.command)));
}

/** Reads the manifest, every shard's attempts, the final run chain and its merged records (the harness's own readers). */
function collectTask(evidenceRoot, round, task) {
  const roundDir = path.join(evidenceRoot, round);
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
    return {
      shard: shard.shard, kind: shard.kind, keys: shard.jobKeys.slice(), status: state.status,
      reason: state.reason || null, unstartedKeys: state.unstartedKeys.slice(),
      attempts: attempts.map(function (a) {
        const t = a.command && a.command.timing ? a.command.timing : {};
        return { attemptId: a.attemptId, rel: attemptRel(roundDir, a), status: a.command ? a.command.status : 'no-command-json',
          exit: a.command ? a.command.exit : null, occupiedMs: t.occupiedMs === undefined ? null : t.occupiedMs,
          inFinalChain: chain.some(function (c) { return c.attemptId === a.attemptId; }) };
      }),
      chain: chain.map(function (a) { return a.attemptId; }),
      commands: chain.map(function (a) { return a.command; }).filter(Boolean),
      allCommands: attempts.map(function (a) { return a.command; }).filter(Boolean),
      records: RUN.mergeRecords(lists)
    };
  });
  return { task: task, manifest: manifest, shards: shards };
}

const OUTCOME_CLASS = Object.freeze({ complete: 'completed', 'sample-budget': 'budgetEnded', 'request-timeout': 'censored',
  error: 'error', 'validation-unknown': 'validationUnknown', unstarted: 'unstarted' });

function classOf(record) {
  if (!record) return 'unstarted';
  return Object.prototype.hasOwnProperty.call(OUTCOME_CLASS, record.outcome) ? OUTCOME_CLASS[record.outcome] : 'error';
}

/**
 * The IG-S02 Killer overlay: six records the shared verifier rejected (a Killer-only structure rule was missing) and the
 * hash-linked re-audit of their saved puzzles verified. The stored records are never modified; the overlay is applied to
 * copies by the reconciler of the IG-S02 aggregator, which stops on a broken link.
 */
function applyKillerOverlay(repoRoot, evidenceRoot, records) {
  const AGG = require('./aggregate.cjs');
  const rel = EVIDENCE.s02Audit.rel;
  const audit = AGG.loadAudit(repoRoot, evidenceRoot, path.join(evidenceRoot, ROUND, ...rel.split('/')));
  const out = AGG.reconcile(records, [audit], evidenceRoot);
  return { records: out.records, applied: out.applied, auditFile: ROUND + '/' + rel, auditSha256: audit.sha256 };
}

function countBy(keys, classify) {
  const counts = { completed: 0, completedByAuditOverlay: 0, budgetEnded: 0, censored: 0, error: 0, validationUnknown: 0,
    unstarted: 0 };
  keys.forEach(function (k) { counts[classify(k)]++; });
  return counts;
}

function sumCounts(list) {
  const out = { completed: 0, completedByAuditOverlay: 0, budgetEnded: 0, censored: 0, error: 0, validationUnknown: 0,
    unstarted: 0 };
  list.forEach(function (c) { Object.keys(out).forEach(function (k) { out[k] += c[k] || 0; }); });
  return out;
}

// --- identities ---------------------------------------------------------------------------------------------------------

function identityOf(task, shards, currentRuntime, manifest) {
  const commands = [];
  shards.forEach(function (s) { s.commands.forEach(function (c) { commands.push(c); }); });
  const everyCommand = [];
  shards.forEach(function (s) { s.allCommands.forEach(function (c) { everyCommand.push(c); }); });
  // a synthetic shard (the self-test) plans no manifest key: its commands list their cases
  const plannedUnion = new Set();
  shards.filter(function (s) { return s.kind !== 'synthetic'; }).forEach(function (s) {
    s.commands.forEach(function (c) { (c.plannedKeys || []).forEach(function (k) { plannedUnion.add(k); }); });
  });
  const manifestKeys = new Set(manifest.jobs.map(function (j) { return j.key; }));
  const plannedOutside = Array.from(plannedUnion).filter(function (k) { return !manifestKeys.has(k); });
  const plannedEqual = manifest.jobs.every(function (j) { return plannedUnion.has(j.key); }) && plannedOutside.length === 0;
  return {
    runtimeFingerprints: uniq(commands.map(function (c) { return c.runtimeFingerprint; })),
    runtimeMatchesCurrent: commands.every(function (c) { return c.runtimeFingerprint === currentRuntime; }),
    harnessFingerprintsOfCommands: uniq(commands.map(function (c) { return c.harnessFingerprint; })),
    harnessFingerprintsOfEveryAttempt: uniq(everyCommand.map(function (c) { return c.harnessFingerprint; })),
    adapterHashes: uniq([].concat.apply([], commands.map(function (c) { return c.adapterHashes || []; }))),
    manifestHashesRecorded: uniq(commands.map(function (c) { return c.manifestHash; })),
    manifestHashNow: manifest.manifestHash,
    manifestHashChanged: commands.some(function (c) { return c.manifestHash && c.manifestHash !== manifest.manifestHash; }),
    plannedKeysOutsideTheManifest: plannedOutside,
    plannedKeysEqualTheManifestKeys: plannedEqual,
    manifestHashNote: commands.some(function (c) { return c.manifestHash && c.manifestHash !== manifest.manifestHash; }) ?
      (plannedEqual ? 'the manifest hash differs from the recorded one because the plan was extended after the run (a ' +
        'request-free shard); every planned request key is identical' : 'the manifest hash differs and the keys differ') : null,
    sourceStable: commands.every(function (c) { return c.sourceStable === true; }),
    firewallClean: commands.every(function (c) { return c.firewallClean === true; }),
    evidenceStatuses: uniq(commands.map(function (c) { return c.evidenceStatus; })),
    gateStates: uniq(commands.map(function (c) { return c.gate ? c.gate.state : null; })),
    commandStatuses: commands.map(function (c) { return c.shard + ':' + c.attemptId + ':' + c.status; })
  };
}

// --- the exact input populations -----------------------------------------------------------------------------------------------

const H3 = Object.freeze({ mega16: [1, 2, 3], mega12: [1, 2, 3], samurai: [1, 2, 42], classic9: [1, 2, 3], killer: [1, 2, 3],
  greaterThan: [1, 2, 3] });
const SM2_CELLS = ['classic9', 'mega12', 'mega16', 'samurai'];
const SM2_MODES = ['proposal-only', 'ordinary-only', 'F0', 'F1', 'FC', 'FM', 'FU', 'FS'];
const range = function (a, b) { const out = []; for (let i = a; i <= b; i++) out.push(i); return out; };

function tuple(cell, level, variant, seed) { return [cell, level, variant, seed].join('|'); }

/** The preregistered populations of the task files (literal seeds), as sorted cell|level|variant|seed tuples. */
function expectedPopulation(task) {
  const out = [];
  const h3 = function (variants) {
    Object.keys(H3).forEach(function (cell) {
      H3[cell].forEach(function (seed) { variants.forEach(function (v) { out.push(tuple(cell, 'nightmare', v, seed)); }); });
    });
  };
  if (task === 'IG-S01') {
    [['classic4', 'veryEasy'], ['classic9', 'hard']].forEach(function (p) {
      ['native', 'noop-expose'].forEach(function (v) { out.push(tuple(p[0], p[1], v, 1)); });
    });
  } else if (task === 'IG-S02') {
    h3(['native-w1', 'attempts-w4']);
  } else if (task === 'IG-S03') {
    h3(['solver-audit', 'scoped-attempts-w4']);
    out.push(tuple('synthetic', 'nightmare', 'solver-audit', 0));
    [['mega16', 3], ['mega12', 3], ['samurai', 42], ['classic9', 3], ['killer', 3], ['greaterThan', 3]].forEach(function (p) {
      out.push(tuple(p[0], 'nightmare', 'scoped-native-w1', p[1]));
    });
  } else if (task === 'IG-S04' || task === 'IG-S05') {
    const seeds = task === 'IG-S04' ? [11, 12] : range(101, 108);
    SM2_CELLS.forEach(function (cell) {
      SM2_MODES.forEach(function (mode) { seeds.forEach(function (seed) { out.push(tuple(cell, 'nightmare', mode, seed)); }); });
    });
  } else if (task === 'IG-S07') {
    [['classic9', 3], ['mega16', 3], ['mega12', 3], ['samurai', 42], ['killer', 3], ['greaterThan', 3]].forEach(function (p) {
      out.push(tuple(p[0], 'nightmare', 'profiled', p[1]));
    });
    [['killer', 'hard', 1], ['killer', 'expert', 1], ['greaterThan', 'normal', 300]].forEach(function (p) {
      ['unprofiled', 'profiled'].forEach(function (v) { out.push(tuple(p[0], p[1], v, p[2])); });
    });
  } else if (task === 'IG-S08') {
    out.push(tuple('jigsaw9', 'expert', 'unprofiled', 1100), tuple('jigsaw9', 'expert', 'profiled', 1100),
      tuple('jigsaw9', 'expert', 'profiled', 1111));
  } else if (task === 'IG-S09') {
    range(300, 319).forEach(function (s) { ['g0', 'g1'].forEach(function (v) { out.push(tuple('greaterThan', 'normal', v, s)); }); });
    range(700, 709).forEach(function (s) { ['g0', 'g1'].forEach(function (v) { out.push(tuple('greaterThan', 'nightmare', v, s)); }); });
    out.push(tuple('greaterThan', 'normal', 'native-observer-free', 300), tuple('greaterThan', 'nightmare', 'native-observer-free', 700));
  }
  return out.sort();
}

/** The manifest's jobs against the preregistered population: equal as sets, no duplicate, nothing missing or extra. */
function populationCheck(task, manifest) {
  const expected = expectedPopulation(task);
  const observed = manifest.jobs.map(function (j) { return tuple(j.puzzleVariant, j.level, j.variantId, j.requestSeed); }).sort();
  const exp = new Set(expected);
  const obs = new Set(observed);
  const missing = expected.filter(function (x) { return !obs.has(x); });
  const extra = observed.filter(function (x) { return !exp.has(x); });
  return { expected: expected.length, observed: observed.length, duplicates: observed.length - obs.size, missing: missing, extra: extra,
    equal: missing.length === 0 && extra.length === 0 && observed.length === obs.size };
}

// --- the coverage reconciliation ----------------------------------------------------------------------------------------

/**
 * How the keys of one shard are classified: from the merged records of its final run chain, with the audit-overlay keys
 * counted as completed by overlay. `overlaid` maps a key to its overlaid copy, `reconciledKeys` is the set of overlaid keys.
 */
function classifyShard(shard, overlaid, reconciledKeys) {
  const byKey = new Map(shard.records.map(function (r) { return [r.key, r]; }));
  const classify = function (k) {
    const rec = overlaid && overlaid.has(k) ? overlaid.get(k) : byKey.get(k);
    if (reconciledKeys && reconciledKeys.has(k)) return 'completedByAuditOverlay';
    return classOf(rec);
  };
  return { byKey: byKey, classify: classify, counts: countBy(shard.keys, classify) };
}

/**
 * The reconciliation problems of one task (pure): duplicate planned keys across tasks or shards (`seenKeys` is the map of keys
 * already planned by earlier tasks and is updated), records outside the manifest, a false exact flag, keys that are not all
 * accounted for, an incompatible identity (another runtime, several runtimes, changed sources, a firewall difference, a label
 * other than provisional, a gate state other than not-evaluable-pre-freeze).
 */
function taskProblems(input) {
  const task = input.task;
  const problems = [];
  const seen = input.seenKeys;
  input.manifestKeys.forEach(function (k) {
    if (seen.has(k)) problems.push('duplicate planned key across tasks or shards: ' + k + ' (' + seen.get(k) + ')');
    seen.set(k, task);
  });
  input.shards.forEach(function (s) {
    s.records.forEach(function (r) {
      if (s.keys.indexOf(r.key) < 0 && s.kind !== 'synthetic') {
        problems.push(task + '/' + s.shard + ': a record outside the manifest (' + r.key + ')');
      }
      if (r.claimedExact === true && r.verifiedExact === false && !(input.reconciledKeys && input.reconciledKeys.has(r.key))) {
        problems.push(task + ': false exact flag at ' + r.key);
      }
    });
  });
  const accounted = Object.keys(input.counts).reduce(function (n, k) { return n + input.counts[k]; }, 0);
  if (accounted !== input.manifestKeys.length) {
    problems.push(task + ': ' + accounted + ' keys classified for ' + input.manifestKeys.length + ' planned');
  }
  const identity = input.identity;
  if (!identity.runtimeMatchesCurrent) problems.push(task + ': a command ran on another runtime than the one loaded now');
  if (identity.runtimeFingerprints.length > 1) problems.push(task + ': several runtime fingerprints in its commands');
  if (identity.plannedKeysOutsideTheManifest.length > 0) problems.push(task + ': planned keys outside the manifest');
  if (!identity.sourceStable) problems.push(task + ': a command reports changed sources');
  if (!identity.firewallClean) problems.push(task + ': a command reports a firewall difference');
  if (identity.evidenceStatuses.some(function (s) { return s !== C.EVIDENCE_PROVISIONAL; })) {
    problems.push(task + ': a command is not labelled provisional (pre-freeze)');
  }
  if (identity.gateStates.some(function (s) { return s !== 'not-evaluable-pre-freeze'; })) {
    problems.push(task + ': a command reports a gate state other than not-evaluable-pre-freeze');
  }
  return problems;
}

/**
 * coverage.json: per task, planned against observed. `evidence` is `loadEvidence`'s result; `s05Rates` supplies the sample
 * ordinals (returned, early-exact skipped, not reached) of IG-S05; the IG-S09 and IG-S08 specifics come from their summaries.
 */
function buildCoverage(input) {
  const repoRoot = input.repoRoot;
  const evidenceRoot = input.evidenceRoot || RUN.evidenceRootOf(repoRoot);
  const roundDir = path.join(evidenceRoot, ROUND);
  const evidence = input.evidence;
  const currentRuntime = input.runtimeFingerprint;
  const problems = [];
  const tasks = [];
  const allKeys = new Map();
  const attemptRels = new Set();

  TASKS.forEach(function (task) {
    const got = collectTask(evidenceRoot, ROUND, task);
    got.shards.forEach(function (s) { s.attempts.forEach(function (a) { attemptRels.add(a.rel); }); });
    // the Killer overlay of IG-S02 (applied to copies; the stored records stay as they are)
    let overlay = null;
    if (task === 'IG-S02') {
      const all = [];
      got.shards.forEach(function (s) { all.push.apply(all, s.records); });
      overlay = applyKillerOverlay(repoRoot, evidenceRoot, all);
    }
    const overlaid = new Map();
    if (overlay) overlay.records.forEach(function (r) { overlaid.set(r.key, r); });
    const reconciledKeys = new Set(overlay ? overlay.applied.map(function (a) { return a.key; }) : []);

    const manifestKeys = got.manifest.jobs.map(function (j) { return j.key; });
    const shardRows = got.shards.map(function (s) {
      const classified = classifyShard(s, overlaid, reconciledKeys);
      const byKey = classified.byKey;
      const counts = classified.counts;
      const keysOf = function (name) { return s.keys.filter(function (k) { return classified.classify(k) === name; }); };
      return {
        shard: s.shard, kind: s.kind, status: s.status, reason: s.reason, plannedKeys: s.keys.length, outcomes: counts,
        syntheticCases: s.kind === 'synthetic' ? { total: s.records.length, passed: s.records.filter(function (r) {
          return r.outcome === 'complete'; }).length, failed: s.records.filter(function (r) {
          return r.outcome !== 'complete'; }).length } : null,
        unstartedKeys: keysOf('unstarted'), attempts: s.attempts, finalChain: s.chain,
        harnessStatusNote: reconciledKeys.size > 0 && s.keys.some(function (k) { return reconciledKeys.has(k); }) ?
          'the stored records stay "error" (the shared verifier lacked a Killer rule); the hash-linked re-audit verified ' +
          'all six saved puzzles: counted as completed by audit overlay' : null,
        censoredRows: keysOf('censored').map(function (k) {
          const r = overlaid.has(k) ? overlaid.get(k) : byKey.get(k);
          return { key: k, outcome: r.outcome, timeoutScope: r.timeoutScope,
            coldWallMsLowerBound: r.generation ? r.generation.coldWallMs : null,
            cpuTotalMs: r.generation ? r.generation.cpuTotalMs : null };
        })
      };
    });
    const total = sumCounts(shardRows.map(function (s) { return s.outcomes; }));
    const planned = manifestKeys.length;
    const identity = identityOf(task, got.shards, currentRuntime, got.manifest);
    const population = populationCheck(task, got.manifest);
    if (!population.equal) {
      problems.push(task + ': the manifest differs from the preregistered population (missing ' + population.missing.length + ', extra ' +
        population.extra.length + ', duplicates ' + population.duplicates + ')');
    }
    taskProblems({ task: task, manifestKeys: manifestKeys, shards: got.shards, overlaid: overlaid, reconciledKeys: reconciledKeys,
      counts: total, identity: identity, seenKeys: allKeys }).forEach(function (p) { problems.push(p); });
    const meta = TASK_META[task];
    const entry = {
      task: task, title: meta.title, status: meta.status, acceptance: meta.accepted,
      planned: { keys: planned, shards: got.manifest.shards.length, manifestHash: got.manifest.manifestHash },
      observed: total,
      shards: shardRows,
      unstarted: [].concat.apply([], shardRows.map(function (s) { return s.unstartedKeys; })),
      censored: [].concat.apply([], shardRows.map(function (s) { return s.censoredRows; })),
      auditOverlay: overlay ? { file: overlay.auditFile, fileSha256: overlay.auditSha256,
        rows: overlay.applied.map(function (a) { return { key: a.key, originalOutcome: a.originalOutcome,
          newOutcome: a.newOutcome, verifiedExact: a.verifiedExact, linkHash: a.linkHash }; }) } : null,
      aliases: [],
      blocked: [],
      population: { equalToThePreregisteredPopulation: population.equal, expected: population.expected, observed: population.observed,
        duplicates: population.duplicates, missing: population.missing, extra: population.extra },
      identity: identity
    };
    tasks.push(entry);
  });

  // IG-S05: the sample ordinals, early-exact skips and the dev-check keys that stay excluded
  const s05 = tasks.find(function (t) { return t.task === 'IG-S05'; });
  const rates = evidence.s05Rates.doc;
  const ordinals = {};
  get(rates, 'coverage', []).forEach(function (row) {
    Object.keys(row.sampleOrdinals || {}).forEach(function (k) { ordinals[k] = (ordinals[k] || 0) + row.sampleOrdinals[k]; });
  });
  s05.sampleOrdinals = ordinals;
  s05.earlyExactSkipped = Object.keys(ordinals).filter(function (k) { return k.indexOf('skipped-') === 0; })
    .reduce(function (n, k) { return n + ordinals[k]; }, 0);
  const s09 = tasks.find(function (t) { return t.task === 'IG-S09'; });
  s09.rowsNeverStarted = s09.unstarted.slice();
  s09.shardsNeverRun = s09.shards.filter(function (s) { return s.status === 'not-run'; }).map(function (s) { return s.shard; });

  // commands that belong to no shard attempt: audits, retests and development checks (charged once, listed here); the one
  // reconciliation command of this task (IG-S10) is a shard attempt of its own plan and is listed apart, never as auxiliary
  const ownAttempts = R.listAttempts(R.shardDirOf(evidenceRoot, ROUND, 'IG-S10', 'reconcile'));
  ownAttempts.forEach(function (a) { attemptRels.add(attemptRel(roundDir, a)); });
  const ownCommands = ownAttempts.map(function (a) {
    const t = a.command && a.command.timing ? a.command.timing : {};
    return { rel: attemptRel(roundDir, a), task: 'IG-S10', shard: 'reconcile', attemptId: a.attemptId,
      status: a.command ? a.command.status : 'no-command-json', occupiedMs: t.occupiedMs === undefined ? null : t.occupiedMs,
      role: 'the one wrapped reconciliation command of this task (r1); the r2 documents are an unwrapped read-only aggregation' };
  });
  const scanned = R.scanRoundCommands(roundDir);
  const auxiliary = scanned.filter(function (s) { return !attemptRels.has(s.rel); }).map(function (s) {
    const cmd = s.command || {};
    const t = cmd.timing || {};
    return { rel: s.rel, task: cmd.task || null, shard: cmd.shard || null, status: cmd.status || null,
      occupiedMs: t.occupiedMs === undefined ? null : t.occupiedMs, role: roleOfAuxiliary(s.rel) };
  });
  const excluded = excludedObservations(evidence);
  const deferred = [{
    task: 'IG-S06', title: TASK_META['IG-S06'].title, status: 'deferred', acceptance: TASK_META['IG-S06'].accepted,
    planned: { keys: null, shards: null, manifestHash: null, note: 'not planned in this round: no manifest or plan exists ' +
      '(plans/ig-s06.cjs is added by the task when it is implemented)' },
    observed: { completed: 0, censored: 0, error: 0, unstarted: 0, note: 'no IG-S06 measurement exists' },
    reason: 'IG-S05 found no verified exact hit in any mode, native controls included; F1 is a non-winning diagnostic ' +
      'default, not a selected strategy to compose; the pre-MS07 catalogue may change',
    consequence: 'full-request composition (S1/S2 plus S5b, held-out requests 201/202, N1/CA4/CQ1/CQ4) is UNMEASURED: ' +
      'not passed, not refuted; the 24-minute allocation was not run and is not an automatic transfer'
  }];
  const counts = sumCounts(tasks.map(function (t) { return t.observed; }));
  const plannedKeys = tasks.reduce(function (n, t) { return n + t.planned.keys; }, 0);
  return {
    schema: 'ig-s-coverage/1', task: 'IG-S10', round: ROUND, evidenceStatus: C.EVIDENCE_PROVISIONAL,
    provisionalNotice: NOTE_PROVISIONAL,
    summary: Object.assign({ tasksReconciled: tasks.length, tasksDeferred: deferred.length, plannedKeys: plannedKeys },
      counts, { observedKeys: plannedKeys - counts.unstarted, earlyExactSkipped: s05.earlyExactSkipped, aliases: 0, blocked: 0,
        deferredTasks: ['IG-S06'], populationsEqualToThePreregistered: tasks.every(function (t) { return t.population.equalToThePreregisteredPopulation; }),
        problems: problems.length }),
    tasks: tasks, deferred: deferred, auxiliaryCommands: auxiliary, ownCommands: ownCommands, excludedObservations: excluded,
    problems: problems,
    ok: problems.length === 0,
    rules: ['every declared manifest key is completed, completed by audit overlay, budget-ended, censored, an error, ' +
      'validation-unknown or explicitly unstarted; none is dropped', 'a stored record is never modified: an overlay is a ' +
      'hash-linked copy', 'a key started once is never counted twice: duplicate keys across tasks stop the reconciliation',
    'IG-S06 is deferred and unmeasured: not passed, not refuted; IG-S09 Nightmare 706-709 are unstarted, not excluded, ' +
      'failed or replaced; no automatic catch-up run']
  };
}

function roleOfAuxiliary(rel) {
  if (rel.indexOf('/killer/audit-') > 0) return 're-audit sidecar of the six saved Killer puzzles (no generation)';
  if (rel.indexOf('engine-retest') > 0) return 'real-engine retest of the corrected frontier code (no trial, nothing timed)';
  if (rel.indexOf('dev-check') > 0) return 'development check of the per-job flow (not part of any shard; its requests are excluded)';
  return 'auxiliary command';
}

/** Observations that exist on disk or in the logs and enter no count, rate or interval: listed, never silent. */
function excludedObservations(evidence) {
  const s05dev = get(evidence.s05Summary.doc, 'closure.devChecks', []);
  const out = [];
  s05dev.forEach(function (d) {
    out.push({ task: 'IG-S05', what: 'dev-check (' + d.file + ')', observations: d.keys,
      why: 'the 16 keys are identical to the screen\'s (earlier harness and manifest, admission rule only); stay excluded from ' +
        'every count, rate, interval and selection', source: 'IG-S05/summary-r2.json closure.devChecks' });
  });
  out.push({ task: 'IG-S09', what: 'dev-check (IG-S09/dev-check)', observations: 3,
    why: 'three disclosed development requests (Normal seed 300: G0, G1 and the observer-free control); excluded from every ' +
      'count; its machine time is charged once (52.035 s) and it is a command outside every shard',
    source: 'IG-S09 Execution log; IG-S09/summary-r2.json' });
  out.push({ task: 'IG-S07', what: 'unwrapped pre-check (disclosed)', observations: 2,
    why: '0.47 s and 0.41 s CPU on a puzzle later replaced by Escargot; not a profile row; the 0.470 s is debited once as a manual ' +
      'adjustment without grace (see the budget summary), the 0.41 s is not added',
    source: 'IG-S07 Execution log (disclosed deviation)' });
  out.push({ task: 'IG-S02', what: 'Killer re-audit sidecar (audit-a1)', observations: 6,
    why: 'verification of six saved puzzles, no generation; the six stored rows keep their original error outcome and are ' +
      'counted as completed by audit overlay', source: 'IG-S02/killer/audit-a1/audit.json' });
  out.push({ task: 'IG-S04', what: 'engine retest r2 (engine-retest-r2)', observations: 15,
    why: 'a retest of the corrected frontier code on the real engine: 15 checks, no trial, nothing timed',
    source: 'IG-S04/engine-retest-r2.json' });
  return out;
}

// --- machine accounting ---------------------------------------------------------------------------------------------------

function waitKnown(timing) {
  if (!timing || typeof timing.priorityWaitMs !== 'number') return null;
  // a recorded 0 with a request time that does not precede the admission is an artifact, not a measured wait
  if (timing.requestedAt && timing.admittedAt && Date.parse(timing.requestedAt) >= Date.parse(timing.admittedAt)) return null;
  return timing.priorityWaitMs;
}

/**
 * The accounting of the whole round from the ledger plus the commands it does not reference (the common budget reader of the
 * harness: a command is charged once). Priority waits are excluded from every charge and listed apart: known (ledger or a
 * command's own request time) against unknown.
 */
function buildBudgetSummary(input) {
  const evidenceRoot = input.evidenceRoot;
  const roundDir = path.join(evidenceRoot, ROUND);
  const ledger = RUN.readLedger(roundDir);
  const scanned = R.scanRoundCommands(roundDir);
  const charges = R.collectCharges(ledger, scanned);
  const approvals = ledger.approvals || [];
  const commandOf = new Map(scanned.map(function (s) { return [s.rel, s.command]; }));
  const commands = [];
  const referenced = new Set(ledger.entries.map(function (e) { return e.commandJson; }).filter(Boolean));
  ledger.entries.forEach(function (e) {
    commands.push({ source: 'ledger', seq: e.seq, task: e.task, shard: e.shard, attemptId: e.attemptId, status: e.status,
      occupiedMs: e.occupiedMs, chargedGraceMs: e.chargedGraceMs, chargedMs: e.chargedMs,
      priorityWaitMs: typeof e.priorityWaitMs === 'number' ? e.priorityWaitMs : null,
      requestedAt: e.requestedAt || null, endedAt: e.endedAt || null, note: e.note ? String(e.note).slice(0, 120) : null });
  });
  scanned.forEach(function (s) {
    if (referenced.has(s.rel) || !s.command) return;
    const t = s.command.timing || {};
    const occupied = typeof t.occupiedMs === 'number' ? t.occupiedMs : C.GUARDS.wrapperLimitMs;
    const grace = typeof t.chargedGraceMs === 'number' ? t.chargedGraceMs : C.GUARDS.graceMs;
    commands.push({ source: 'evidence', seq: null, task: s.command.task, shard: s.command.shard,
      attemptId: s.command.attemptId, status: s.command.status,
      occupiedMs: occupied, chargedGraceMs: grace, chargedMs: occupied + grace, priorityWaitMs: waitKnown(t),
      requestedAt: t.requestedAt || null, endedAt: t.endedAt || null, note: s.rel });
  });
  const byTask = {};
  FIRST_ROUND_ALLOCATION_ORDER.forEach(function (task) {
    const rows = commands.filter(function (c) { return c.task === task; });
    const allocationMs = M.ALLOCATIONS_MS[task];
    const approvedMs = approvals.filter(function (a) { return a.task === task; }).reduce(function (n, a) { return n + a.extraMs; }, 0);
    const manualMs = MANUAL_ADJUSTMENTS.filter(function (a) { return a.task === task; }).reduce(function (n, a) {
      return n + a.chargedMs + a.graceMs; }, 0);
    const wrappedMs = rows.reduce(function (n, c) { return n + c.chargedMs; }, 0);
    const chargedMs = wrappedMs + manualMs;
    const known = rows.filter(function (c) { return c.priorityWaitMs !== null; });
    byTask[task] = {
      task: task, allocationMs: allocationMs, approvedExtraMs: approvedMs, commands: rows.length,
      occupiedMs: rows.reduce(function (n, c) { return n + c.occupiedMs; }, 0),
      chargedGraceMs: rows.reduce(function (n, c) { return n + c.chargedGraceMs; }, 0), chargedWrappedMs: wrappedMs,
      manualAdjustmentMs: manualMs, chargedMs: chargedMs,
      beyondBaseAllocationMs: Math.max(0, chargedMs - allocationMs),
      unusedOfAllocationMs: Math.max(0, allocationMs - chargedMs),
      unusedOfAllocationPlusApprovalMs: Math.max(0, allocationMs + approvedMs - chargedMs),
      priorityWaitKnownMs: known.reduce(function (n, c) { return n + c.priorityWaitMs; }, 0),
      commandsWithKnownWait: known.length, commandsWithUnknownWait: rows.length - known.length,
      status: task === 'IG-S06' ? 'deferred: not run, not an automatic transfer' : null
    };
  });
  const wrappedTotal = commands.reduce(function (n, c) { return n + c.chargedMs; }, 0);
  const ig10Wrapped = commands.filter(function (c) { return c.task === 'IG-S10'; });
  const ig10Charged = ig10Wrapped.reduce(function (n, c) { return n + c.chargedMs; }, 0);
  const manualTotal = MANUAL_ADJUSTMENTS.reduce(function (n, a) { return n + a.chargedMs + a.graceMs; }, 0);
  const totalCharged = wrappedTotal + manualTotal;
  const approvedTotal = approvals.reduce(function (n, a) { return n + a.extraMs; }, 0);
  const known = commands.filter(function (c) { return c.priorityWaitMs !== null; });
  const sumWait = function (list) { return list.reduce(function (n, c) { return n + c.priorityWaitMs; }, 0); };
  const knownLedger = known.filter(function (c) { return c.source === 'ledger'; });
  const knownReceipts = known.filter(function (c) { return c.source === 'evidence'; });
  return {
    schema: 'ig-s-budget-summary/1', task: 'IG-S10', round: ROUND, evidenceStatus: C.EVIDENCE_PROVISIONAL,
    provisionalNotice: NOTE_PROVISIONAL,
    reader: 'the harness budget reader (records.cjs collectCharges over ledger.json plus every command.json it does not reference); ' +
      'a command is charged once: occupied wrapper time plus the 45 s quiet-admission grace; priority waits are never charged; ' +
      'manual adjustments are listed apart from the wrapped commands',
    roundTotals: {
      ceilingMs: M.TOTAL_MS, plannedAllocationsMs: Object.keys(M.ALLOCATIONS_MS).reduce(function (n, t) {
        return n + M.ALLOCATIONS_MS[t]; }, 0), reserveMs: M.RESERVE_MS,
      wrappedCommands: commands.length, ledgerEntries: ledger.entries.length,
      evidenceOnlyCommands: commands.filter(function (c) { return c.source === 'evidence'; }).length,
      chargedWrappedBeforeIgS10Ms: wrappedTotal - ig10Charged, chargedIgS10Ms: ig10Charged, chargedWrappedMs: wrappedTotal,
      manualAdjustmentsMs: manualTotal, chargedTotalMs: totalCharged, unusedOfRoundCeilingMs: M.TOTAL_MS - totalCharged,
      approvedExtraMs: approvedTotal,
      chargedGraceMs: commands.reduce(function (n, c) { return n + c.chargedGraceMs; }, 0),
      occupiedMs: commands.reduce(function (n, c) { return n + c.occupiedMs; }, 0),
      priorityWaitKnownLedgerOnlyMs: sumWait(knownLedger), priorityWaitKnownAuxiliaryReceiptsMs: sumWait(knownReceipts),
      priorityWaitKnownMs: sumWait(known), commandsWithKnownWait: known.length,
      commandsWithUnknownWait: commands.length - known.length },
    manualAdjustments: MANUAL_ADJUSTMENTS.map(function (a) { return Object.assign({}, a); }),
    approvals: approvals.map(function (a) {
      const t = byTask[a.task];
      return { task: a.task, extraMs: a.extraMs, by: a.by, taskChargedMs: t ? t.chargedMs : null,
        taskBaseAllocationMs: t ? t.allocationMs : null,
        usedBeyondBaseMs: t ? t.beyondBaseAllocationMs : null };
    }),
    tasks: byTask,
    ig10: { allocationMs: M.ALLOCATIONS_MS['IG-S10'], graceMs: C.GUARDS.graceMs, wrappedCommands: ig10Wrapped.length,
      chargedMs: ig10Charged, unusedOfAllocationMs: M.ALLOCATIONS_MS['IG-S10'] - ig10Charged,
      ledgerSeq: ig10Wrapped.length ? ig10Wrapped[0].seq : null,
      status: ig10Wrapped.length ? 'the one reconciliation command is complete and charged (ledger entry ' + ig10Wrapped[0].seq +
        '); the r2 documents are written by an unwrapped read-only aggregation (no engine, no worker, not charged)' :
        'in flight when this document is written: its own charge (occupied time plus 45 s) is entered in ledger.json by ' +
        'the dispatcher after the command ends and is not in the totals above' },
    commands: commands,
    disclosures: disclosedUnwrapped(),
    note: 'unknown waits: commands launched outside the dispatcher without --requested-at have no wait on record; a recorded ' +
      '0 whose request time follows the admission is an artifact and is treated as unknown (IG-S09 dev-check). Known waits are ' +
      'reported by source: the ledger alone, the auxiliary command receipts alone and both together. The Execution logs ' +
      'quote totals that include such commands (IG-S01 "about 362 s" against ' + Math.round((byTask['IG-S01'].priorityWaitKnownMs) / 1000) +
      ' s known here with ' + byTask['IG-S01'].commandsWithUnknownWait + ' commands unknown): the evidence keeps only what was recorded, never an estimate'
  };
}

// A debit that is not a wrapped command: no admission grace, listed apart from the wrapped-command counts.
const MANUAL_ADJUSTMENTS = Object.freeze([Object.freeze({ task: 'IG-S07', chargedMs: 470, graceMs: 0,
  what: 'the IG-S07 unwrapped pre-check (0.470 s), debited once on the orchestrator\'s request after the pack author\'s review of r1',
  rule: 'no quiet-admission grace; debited once; kept apart from the wrapped-command counts' })]);

// What ran outside the wrapper or off the plan, from the Execution logs: analysis only, no engine and no worker.
function disclosedUnwrapped() {
  return [
    { task: 'IG-S03', text: 'the focused engine-free tests ran outside the wrapper (no engine, nothing timed); one prohibited ' +
      'read-only `git status` (not repeated)' },
    { task: 'IG-S05', text: 'pure tests and the aggregator ran unwrapped (no engine, no worker); the wrapped dev-check is in the ledger' },
    { task: 'IG-S07', text: 'unwrapped 0.47 s / 0.41 s CPU pre-check; a `$env:TEMP` slip and a renamed file; pure tests unwrapped' },
    { task: 'IG-S08', text: 'pure tests, a source-only transform dry run, -PlanOnly and the aggregator ran unwrapped (no engine, no ' +
      'worker thread); the control command also ran the instrument\'s engine checks and a calibration' },
    { task: 'IG-S09', text: 'pure tests, -PlanOnly and the aggregator unwrapped; three dev-check requests; symmetric proof reuse on ' +
      'identical full inputs; the catalogue from the ready message' },
    { task: 'IG-S10', text: 'pure tests, source-only dry runs and -PlanOnly (no engine, no worker, no generation) ran unwrapped ' +
      'during development; the one reconciliation shard ran through the wrapper; the r2 documents were written by an unwrapped, ' +
      'read-only aggregation (ig10-run.cjs --write-r2: no engine, no worker, no wrapper, local CPU only, not charged) after the pack ' +
      'author\'s review of r1; no second wrapped command was run' }
  ];
}

module.exports = { ROUND, TASKS, EVIDENCE, DECLARED_FINGERPRINTS, TASK_META, NOTE_PROVISIONAL, MANUAL_ADJUSTMENTS, loadEvidence, get, uniq,
  collectTask, classOf, applyKillerOverlay, identityOf, classifyShard, taskProblems, countBy, sumCounts, expectedPopulation,
  populationCheck, buildCoverage, excludedObservations, waitKnown, buildBudgetSummary, disclosedUnwrapped, readJsonBytes };
