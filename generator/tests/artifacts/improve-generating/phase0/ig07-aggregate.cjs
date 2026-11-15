'use strict';

/*
 * IG-S07 task documents from evidence only (test side, provisional (pre-freeze)): no engine, no timing. Reads the twelve records
 * of the nine shards, IG-S02's matched native-w1 records (the comparators of the six headline cells), IG-S03's coverage and its
 * serial partial-S3 rows (the implemented scopes), IG-S04/05's frontier ledgers (phase A) and the budget ledger, and writes once:
 *
 *   stage-profile.json    per request: the wall time by context (setup, attempt, ordinary, proposal, local), by purpose
 *                         (the stage) and by primitive, the partition of the request into finders (S3-covered and remaining),
 *                         applied Findings, solver state, loop, DFS, ratings, grid generation and the code of the stages
 *                         themselves, the counters (canonical ratings, oracle solves, DFS entries/checks/backtracks apart),
 *                         the samples and the per-attempt work
 *   finder-profile.json   per request: every finder (calls, hits, inclusive = exclusive wall time, hit and negative-call time,
 *                         budget checks), the S3-covered families against the remaining finders, by stage and sample kind, and
 *                         the conditional zero-cost scenarios (arithmetic of one profiled run: never a forecast and not a ceiling of a full S3)
 *   overhead.json         the instrumented run against its comparator (same-command arm or IG-S02), the calibrated cost of the
 *                         instrumentation, the reference compatibility
 *   frontier-phase-a.json the existing IG-S04/05 frontier ledgers: phase A against the other phases, accepted/refused floor tests,
 *                         DFS, allowed-set/canonical work and deepen, and the three kinds of zero yield
 *   summary.json/md       the above in tables, the report's assumptions against the measurement, the acceptance criteria
 *
 * The profiled run is an attribution run, never a timing run: no number here replaces an IG-S02 timing. The revision r2 (the author's
 * review) relabels the S3 figures as conditional zero-cost scenarios, drops the bias-adjusted column, marks the r1 budget-check totals
 * inexact and reads the loop-check comparison of the shard lc; the r1 files stay.
 *
 *   node ig07-aggregate.cjs --task=IG-S07 --round=provisional-r1 [--suffix=-r2 --revision=<text> --write=stage,finder]
 */
const fs = require('fs');
const path = require('path');
const C = require('./common.cjs');
const R = require('./records.cjs');
const M = require('./manifest.cjs');
const RUN = require('./run.cjs');
const AG = require('./aggregate.cjs');
const PR = require('./profile-runtime.cjs');
const PLAN = require('./plans/ig-s07.cjs');

const HarnessError = C.HarnessError;
const TASK = 'IG-S07';

// The report's SM1 anchor (docs/improve-generating/report.md, section 8 of the check-list): planning anchors, never thresholds.
const REPORT_ANCHORS = Object.freeze({
  mega16: { sample: 0.90, local: 0.10, note: 'mega16 samples ~90 %, local ~10 %' },
  other: 'G13 ~72 % / ~28 % belongs to another cohort of the report; no anchor for the other headline cells'
});

const ACCOUNTING_NOTE = 'The profile is wall-clock time of one instrumented native request: an attribution run, not a timing run. ' +
  'Finder and apply times include the cost of their own timers (estimated in overhead.json).';

function round(x, d) {
  if (typeof x !== 'number' || !Number.isFinite(x)) return null;
  const k = Math.pow(10, d === undefined ? 3 : d);
  return Math.round(x * k) / k;
}

function share(part, whole) {
  return typeof part === 'number' && typeof whole === 'number' && whole > 0 ? round(part / whole, 4) : null;
}

function ratioOf(a, b) {
  const r = R.ratio(a, b);
  return r === null ? null : round(r, 4);
}

function sum(list, pick) {
  return list.reduce(function (s, x) { return s + (pick ? pick(x) : x); }, 0);
}

// --- inputs ------------------------------------------------------------------------------------------------------------------------

function readJsonIfExists(file) {
  return fs.existsSync(file) ? C.readJson(file) : null;
}

/** IG-S03's coverage: the finders the partial S3 implements (the nine of the task) and the file it was read from. */
function s3Coverage(repoRoot, round) {
  const file = path.join(repoRoot, ...C.EVIDENCE_REL.split('/'), round, 'IG-S03', 'coverage-r3.json');
  const doc = C.readJson(file);
  return { file: C.toPosix(path.relative(repoRoot, file)), sha256: C.sha256(fs.readFileSync(file)),
    implemented: doc.implemented.slice(), families: doc.families.map(function (f) {
      return { id: f.id, family: f.family, scope: f.scope, nonzeroCheckFamily: f.nonzeroCheckFamily };
    }) };
}

/** IG-S03's serial partial-S3 factor for the matched request (n = 1 per cell), or null. */
function serialFactors(repoRoot, round) {
  const file = path.join(repoRoot, ...C.EVIDENCE_REL.split('/'), round, 'IG-S03', 'summary-r3.json');
  const doc = readJsonIfExists(file);
  const out = new Map();
  if (!doc) return { file: null, rows: out };
  doc.rows.forEach(function (row) {
    if (row.serial && typeof row.serial.readySpeedup === 'number') {
      out.set(row.pairId, { readySpeedup: row.serial.readySpeedup, cpuRatio: row.serial.cpuRatio === undefined ? null : row.serial.cpuRatio });
    }
  });
  return { file: C.toPosix(path.relative(repoRoot, file)), sha256: C.sha256(fs.readFileSync(file)), rows: out };
}

function chainRecords(repoRoot, round, task, shard) {
  const dir = R.shardDirOf(RUN.evidenceRootOf(repoRoot), round, task, shard);
  const chain = R.lastChain(R.listAttempts(dir));
  const lists = chain.map(function (a) {
    const file = path.join(a.dir, R.EVIDENCE_FILES.records);
    return fs.existsSync(file) ? C.readJson(file).records : [];
  });
  return { attempts: chain.map(function (a) { return a.attemptId; }), commands: chain.map(function (a) { return a.command; })
    .filter(Boolean), records: RUN.mergeRecords(lists) };
}

// --- one profiled request -----------------------------------------------------------------------------------------------------------

function techniqueTable(records) {
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    if (rec.profile && rec.profile.dims) return rec.profile.dims.finders.slice();
  }
  return [];
}

function catalogueTechniques(commands) {
  for (let i = 0; i < commands.length; i++) {
    const snap = commands[i] && commands[i].catalogueSnapshot;
    if (snap && Array.isArray(snap.techniques)) return snap.techniques;
  }
  return [];
}

const PARTS = ['finderCovered', 'finderRemaining', 'apply', 'solveSetup', 'solveLoop', 'dfs', 'rateSelf', 'gridGenerate', 'stageSelf'];
const PRIM_PART = { apply: 'apply', 'solve.setup': 'solveSetup', 'solve.loop': 'solveLoop', 'dfs.count': 'dfs', 'dfs.stillUnique': 'dfs',
  'dfs.solve': 'dfs', 'dfs.searchFrom': 'dfs', 'rate.canonical': 'rateSelf', 'fullGrid.generate': 'gridGenerate', self: 'stageSelf' };

function emptyParts() {
  const o = {};
  PARTS.forEach(function (p) { o[p] = 0; });
  return o;
}

function partsTotal(parts) {
  return sum(PARTS, function (p) { return parts[p]; });
}

function roundParts(parts, root) {
  const out = { ms: {}, shareOfRoot: {} };
  PARTS.forEach(function (p) {
    out.ms[p] = round(parts[p]);
    out.shareOfRoot[p] = share(parts[p], root);
  });
  out.totalMs = round(partsTotal(parts));
  return out;
}

function solverOf(parts) {
  const solver = parts.finderCovered + parts.finderRemaining + parts.apply + parts.solveSetup + parts.solveLoop;
  return { solverMs: round(solver), finderCoveredShare: share(parts.finderCovered, solver),
    finderRemainingShare: share(parts.finderRemaining, solver), applyShare: share(parts.apply, solver),
    stateAndSetupShare: share(parts.solveSetup, solver), loopShare: share(parts.solveLoop, solver) };
}

function statOf(values) {
  const sorted = values.filter(function (v) { return typeof v === 'number'; }).sort(function (a, b) { return a - b; });
  if (sorted.length === 0) return { n: 0, total: 0, mean: null, median: null, max: null };
  const total = sum(sorted);
  return { n: sorted.length, total: round(total), mean: round(total / sorted.length),
    median: round(sorted[Math.floor(sorted.length / 2)]), max: round(sorted[sorted.length - 1]) };
}

/** The budget-check totals of one profile and how far they can be trusted. */
function checkTotalsOf(c) {
  const observed = typeof c.loopChecks === 'number';
  return {
    finderChecks: c.finderChecks,
    loopChecksDerived: c.loopChecksDerived,
    loopChecksObserved: observed ? c.loopChecks : null,
    solverChecksTotal: c.finderChecks + (observed ? c.loopChecks : c.loopChecksDerived),
    exact: false,
    exactness: observed ? 'finder checks and loop checks are observed before the call; the budget checks that chain finders issue through the ' +
      'propagation engine (on variants with propagation extensions: cages, inequalities) are not observed, so the total can still fall short of the ' +
      'budget\'s own count where nishio or forcingChain ran under a budget' :
      'INEXACT: the loop-check part is derived from the finder passes (one per pass plus one before a stuck result), a count that misses a check ' +
      'that throws before the first finder or before returning stuck and every pass of an empty ladder; the finder-check part counts ctx.check() ' +
      'calls only and misses the budget checks that nishio and forcingChain issue through SG.constraints.place/propagate on variants with propagation ' +
      'extensions (tech-chain.js, constraints.js: read from the source, not measured); the r1 profile was not rerun'
  };
}

/** Everything the profile of one record says, as plain tables. `covered` is the set of S3-implemented finder ids. */
function analyseRequest(rec, covered) {
  const base = { key: rec.key, shard: rec.shard, cell: rec.puzzleVariant, level: rec.level, seed: rec.requestSeed,
    kind: rec.cellKind || null, arm: rec.arm, outcome: rec.outcome };
  const p = rec.profile;
  if (!p || p.rootMs === null) return Object.assign(base, { profile: null });
  const root = p.rootMs;
  const ctxNames = p.dims.contexts;
  const ctxMs = {};
  const ctxParts = {};
  ctxNames.forEach(function (x) { ctxMs[x] = 0; ctxParts[x] = emptyParts(); });
  const parts = emptyParts();
  const purposes = new Map();
  const purposeOf = function (name) {
    if (!purposes.has(name)) purposes.set(name, { purpose: name, ms: 0, parts: emptyParts(), byContext: {}, solves: 0, rates: 0 });
    return purposes.get(name);
  };
  p.stage.forEach(function (row) {
    const ctx = row[0];
    const part = PRIM_PART[row[2]];
    const entry = purposeOf(row[1]);
    parts[part] += row[3];
    ctxParts[ctx][part] += row[3];
    ctxMs[ctx] += row[3];
    entry.ms += row[3];
    entry.parts[part] += row[3];
    entry.byContext[ctx] = (entry.byContext[ctx] || 0) + row[3];
    if (row[2] === 'solve.setup') entry.solves += row[4];
    if (row[2] === 'rate.canonical') entry.rates += row[4];
  });
  const finders = new Map();
  const stageKind = {};
  p.finders.forEach(function (row) {
    const ctx = row[0];
    const id = row[2];
    const part = covered.has(id) ? 'finderCovered' : 'finderRemaining';
    parts[part] += row[5];
    ctxParts[ctx][part] += row[5];
    ctxMs[ctx] += row[5];
    const entry = purposeOf(row[1]);
    entry.ms += row[5];
    entry.parts[part] += row[5];
    entry.byContext[ctx] = (entry.byContext[ctx] || 0) + row[5];
    if (!finders.has(id)) {
      finders.set(id, { id: id, calls: 0, hits: 0, ms: 0, hitMs: 0, throwMs: 0, checks: 0, throws: 0, byContext: {}, byPurpose: {} });
    }
    const f = finders.get(id);
    f.calls += row[3];
    f.hits += row[4];
    f.ms += row[5];
    f.hitMs += row[6];
    f.throwMs += row[7];
    f.checks += row[8];
    f.throws += row[9];
    const c = f.byContext[ctx] || (f.byContext[ctx] = { calls: 0, ms: 0 });
    c.calls += row[3];
    c.ms += row[5];
    const k = row[1] + '|' + ctx;
    const sk = stageKind[k] || (stageKind[k] = { purpose: row[1], context: ctx, coveredMs: 0, remainingMs: 0, coveredCalls: 0,
      remainingCalls: 0, coveredMissMs: 0, remainingMissMs: 0 });
    const miss = row[5] - row[6] - row[7];
    if (covered.has(id)) {
      sk.coveredMs += row[5];
      sk.coveredCalls += row[3];
      sk.coveredMissMs += miss;
    } else {
      sk.remainingMs += row[5];
      sk.remainingCalls += row[3];
      sk.remainingMissMs += miss;
    }
  });
  const booked = partsTotal(parts);
  const sampleMs = ctxMs.ordinary + ctxMs.proposal;
  const contexts = ctxNames.map(function (x) {
    return { context: x, ms: round(ctxMs[x]), share: share(ctxMs[x], root), parts: roundParts(ctxParts[x], root).ms,
      solver: solverOf(ctxParts[x]) };
  });
  const purposeRows = Array.from(purposes.values()).sort(function (a, b) { return b.ms - a.ms; }).map(function (e) {
    const rounded = roundParts(e.parts, root);
    return { purpose: e.purpose, ms: round(e.ms), shareOfRoot: share(e.ms, root), parts: rounded.ms,
      byContext: Object.keys(e.byContext).reduce(function (o, k) { o[k] = round(e.byContext[k]); return o; }, {}),
      solves: e.solves, canonicalRates: e.rates, oracleSolves: e.solves - e.rates };
  });
  const rows = p.samples;
  const kinds = {};
  ['ordinary', 'proposal', 'local'].forEach(function (kind) {
    const of = rows.filter(function (r) { return r.kind === kind; });
    kinds[kind] = {
      samples: of.length, wallMs: statOf(of.map(function (r) { return r.wallMs; })),
      oracleCalls: statOf(of.map(function (r) { return r.stats ? r.stats.oracleCalls : null; })),
      solves: statOf(of.map(function (r) { return r.solves; })), rates: statOf(of.map(function (r) { return r.rates; })),
      finderMs: statOf(of.map(function (r) { return r.finderMs; })), dfsEntries: statOf(of.map(function (r) { return r.dfsEntries; })),
      exact: of.filter(function (r) { return r.exact; }).length, shallow: of.filter(function (r) { return r.shallow; }).length,
      contextMs: round(ctxMs[kind]), contextShare: share(ctxMs[kind], root)
    };
  });
  const work = rec.attemptsWork || null;
  const g = p.grid;
  const workRatings = work ? sum(work, function (w) { return w.ratings; }) : null;
  const engineTimings = rec.engineTimingsMs || null;
  const stepCheck = ['configure', 'buildModel', 'fullGrid', 'extraStructure', 'dig', 'rate', 'tune'].map(function (step) {
    const mine = p.inclusiveMs['step:' + step] ? p.inclusiveMs['step:' + step].ms : null;
    const theirs = engineTimings && typeof engineTimings[step] === 'number' ? engineTimings[step] : null;
    return { step: step, engineTimingMs: theirs === null ? null : round(theirs), profileInclusiveMs: mine === null ? null : round(mine),
      differenceMs: theirs === null || mine === null ? null : round(mine - theirs) };
  });
  const gen = rec.generation || {};
  return Object.assign(base, {
    profile: 'present',
    claimedExact: rec.claimedExact, verifiedExact: rec.verifiedExact,
    timing: { rootMs: round(root), workerRunMs: round(rec.profileWorkerRunMs), hostReadyWallMs: round(gen.readyWallMs),
      hostColdWallMs: round(gen.coldWallMs), cpuTotalMs: round(gen.cpuTotalMs), cpuResolutionStatus: gen.cpuResolutionStatus || null },
    reconciliation: { rootMs: round(root), bookedMs: round(booked), residualMs: round(root - booked, 4),
      workerRunMinusRootMs: round(rec.profileWorkerRunMs - root, 4),
      hostReadyMinusWorkerRunMs: round(gen.readyWallMs - rec.profileWorkerRunMs),
      note: 'booked = every stage cell and finder cell; the residual is floating-point error only. The host ready wall also holds ' +
        'the worker\'s toWire, the snapshot and the message delivery after the run.',
      stepCheck: stepCheck },
    contexts: contexts,
    sampleVsLocal: { sampleMs: round(sampleMs), localMs: round(ctxMs.local), otherMs: round(ctxMs.setup + ctxMs.attempt),
      sampleShare: share(sampleMs, root), localShare: share(ctxMs.local, root), otherShare: share(ctxMs.setup + ctxMs.attempt, root),
      sampleShareOfSampleAndLocal: share(sampleMs, sampleMs + ctxMs.local),
      note: 'sample = ordinary + proposal samples; local = the local-continuation sample of an attempt (its dig, rating and tune steps ' +
        'included); other = setup and the full grids, extra structure and restart loop. Request-group time of a cohort is not this.' },
    partition: roundParts(parts, root),
    solver: solverOf(parts),
    purposes: purposeRows,
    sampleKinds: kinds,
    counters: Object.assign({}, p.counters, { oracleSolves: p.counters.solves - p.counters.canonicalRates, workRatings: workRatings,
      checkTotals: checkTotalsOf(p.counters),
      note: 'canonical ratings = difficulty.rate calls (equal to the engine\'s own work ratings); oracle solves = logical solves that ' +
        'are not inside a rating; DFS entries/checks/backtracks are separate counters; DFS checks are the checks of the search loop ' +
        'only (checks inside constraint propagation are not counted)' }),
    grid: g,
    guided: p.guided,
    refusals: p.refusals,
    attempts: work,
    firstExact: rec.firstExactDetail || null,
    samples: rows,
    stageByFinderFamilyAndKind: Object.keys(stageKind).map(function (k) {
      const s = stageKind[k];
      return { purpose: s.purpose, context: s.context, coveredMs: round(s.coveredMs), remainingMs: round(s.remainingMs),
        coveredCalls: s.coveredCalls, remainingCalls: s.remainingCalls, coveredMissMs: round(s.coveredMissMs),
        remainingMissMs: round(s.remainingMissMs) };
    }).sort(function (a, b) { return (b.coveredMs + b.remainingMs) - (a.coveredMs + a.remainingMs); }),
    _parts: parts, _ctxParts: ctxParts, _finders: finders, _ctxMs: ctxMs
  });
}

// --- finders and the conditional zero-cost scenarios -------------------------------------------------------------------------------------

// The factor of a scenario: this profiled run with `removed` ms set to zero, everything else as measured.
function scenarioFactor(root, removed) {
  return root > 0 && removed < root ? round(root / (root - removed), 4) : null;
}

function finderDoc(a, techniques, covered, serial) {
  const root = a.timing.rootMs;
  const byId = new Map(techniques.map(function (t) { return [t.id, t]; }));
  const finderMs = sum(Array.from(a._finders.values()), function (f) { return f.ms; });
  const solverMs = a._parts.finderCovered + a._parts.finderRemaining + a._parts.apply + a._parts.solveSetup + a._parts.solveLoop;
  const rows = Array.from(a._finders.values()).sort(function (x, y) { return y.ms - x.ms; }).map(function (f) {
    const t = byId.get(f.id) || {};
    const miss = f.ms - f.hitMs - f.throwMs;
    return { id: f.id, group: t.group || null, order: t.order === undefined ? null : t.order, baseCost: t.baseCost === undefined ? null : t.baseCost,
      s3Covered: covered.has(f.id), calls: f.calls, hits: f.hits, hitRate: share(f.hits, f.calls), throws: f.throws,
      ms: round(f.ms), hitMs: round(f.hitMs), negativeCallMs: round(miss), throwMs: round(f.throwMs),
      usPerCall: f.calls > 0 ? round(f.ms * 1000 / f.calls, 3) : null, checks: f.checks, checksPerCall: f.calls > 0 ? round(f.checks / f.calls, 3) : null,
      shareOfRoot: share(f.ms, root), shareOfSolver: share(f.ms, solverMs), shareOfFinders: share(f.ms, finderMs),
      byContext: Object.keys(f.byContext).reduce(function (o, k) {
        o[k] = { calls: f.byContext[k].calls, ms: round(f.byContext[k].ms) };
        return o;
      }, {}) };
  });
  const family = function (name, test) {
    const of = rows.filter(test);
    const ms = sum(of, function (r) { return r.ms; });
    const miss = sum(of, function (r) { return r.negativeCallMs; });
    return { family: name, finders: of.map(function (r) { return r.id; }), calls: sum(of, function (r) { return r.calls; }),
      ms: round(ms), negativeCallMs: round(miss), hitMs: round(sum(of, function (r) { return r.hitMs; })),
      checks: sum(of, function (r) { return r.checks; }), shareOfRoot: share(ms, root), shareOfSolver: share(ms, solverMs),
      shareOfFinders: share(ms, finderMs), negativeCallShareOfRoot: share(miss, root) };
  };
  const covFam = family('S3-covered (IG-S03 implemented scopes)', function (r) { return r.s3Covered; });
  const remFam = family('remaining registered finders', function (r) { return !r.s3Covered; });
  const groupNames = Array.from(new Set(rows.map(function (r) { return r.group; }))).sort();
  const groups = groupNames.map(function (g) {
    const of = rows.filter(function (r) { return r.group === g; });
    const ms = sum(of, function (r) { return r.ms; });
    const miss = sum(of, function (r) { return r.negativeCallMs; });
    return { group: g, finders: of.map(function (r) { return r.id; }), s3Covered: of.filter(function (r) { return r.s3Covered; }).map(function (r) { return r.id; }),
      calls: sum(of, function (r) { return r.calls; }), ms: round(ms), shareOfRoot: share(ms, root), shareOfSolver: share(ms, solverMs),
      negativeCallMs: round(miss), negativeCallShareOfRoot: share(miss, root) };
  }).sort(function (x, y) { return y.ms - x.ms; });
  const chainRows = rows.filter(function (r) { return r.group === 'chain'; });
  const chainMs = sum(chainRows, function (r) { return r.ms; });
  const chainMiss = sum(chainRows, function (r) { return r.negativeCallMs; });
  const coveredMiss = covFam.negativeCallMs;
  const remainingMiss = remFam.negativeCallMs;
  const scenarios = {
    kind: 'conditional zero-cost scenarios',
    note: 'Each figure sets the named wall time of this one profiled run to zero and leaves everything else as measured. It is arithmetic ' +
      'of this run, not a forecast and not a ceiling of a full S3: a scoped cache can also skip negative scopes inside a call that ends ' +
      'by returning a Finding, so it could save more than the calls that returned nothing (the negative calls), and it costs lookups and ' +
      'invalidation, so it saves less; neither is measured here. Finder time includes its timers. Only the family-time scenarios (all the ' +
      'wall time of the covered or of the remaining finders) limit a change confined to those finders\' calls, which cannot save more than ' +
      'their whole time.',
    rootMs: round(root), finderMs: round(finderMs),
    scenarioNoFinderTime: scenarioFactor(root, finderMs),
    scenarioNoCoveredFinderTime: scenarioFactor(root, covFam.ms),
    scenarioNoRemainingFinderTime: scenarioFactor(root, remFam.ms),
    scenarioNoNegativeCallsAllFinders: scenarioFactor(root, coveredMiss + remainingMiss),
    scenarioNoNegativeCallsCoveredFinders: scenarioFactor(root, coveredMiss),
    scenarioNoNegativeCallsRemainingFinders: scenarioFactor(root, remainingMiss),
    chainGroup: { finders: chainRows.map(function (r) { return r.id; }), ms: round(chainMs), shareOfRoot: share(chainMs, root),
      negativeCallMs: round(chainMiss), negativeCallShareOfRoot: share(chainMiss, root),
      note: 'forcingChain and nishio work on cloned trial states, so their footprint is the whole grid state, not a unit or a cell' },
    nonChainRemainingNegativeCallMs: round(remainingMiss - chainMiss),
    scenarioNoNegativeCallsRemainingNonChain: scenarioFactor(root, remainingMiss - chainMiss),
    measuredPartialS3SerialFactor: serial ? round(serial.readySpeedup, 4) : null,
    measuredPartialS3Note: serial ? 'IG-S03 scoped-native-w1 against IG-S02 native-w1 for this very request (n = 1, time-separated, ' +
      'within the machine noise of a few percent); it covers the nine implemented finders only and is not extrapolated to the rest' :
      'no IG-S03 serial row for this request'
  };
  return { key: a.key, cell: a.cell, level: a.level, seed: a.seed, kind: a.kind, rootMs: round(root), finderMs: round(finderMs),
    solverMs: round(solverMs), finderShareOfRoot: share(finderMs, root), finderShareOfSolver: share(finderMs, solverMs),
    inclusiveEqualsExclusive: 'a finder call never contains another timed frame (finders call no solve, no DFS and no other finder), ' +
      'so its inclusive and exclusive times are the same number; the stage tables hold the rest of the solver as its own cells ' +
      '(never summed twice)',
    families: [covFam, remFam], groups: groups, finders: rows, top: rows.slice(0, 6).map(function (r) {
      return { id: r.id, s3Covered: r.s3Covered, ms: r.ms, shareOfRoot: r.shareOfRoot, hitRate: r.hitRate };
    }), byStageAndKind: a.stageByFinderFamilyAndKind, scenarios: scenarios };
}

// --- overhead ------------------------------------------------------------------------------------------------------------------------------

function estimatedCostMs(p, cal) {
  if (!p || !cal) return null;
  const ns = cal.finderTimerPairNs * p.ops.finderTimers + cal.applyTimerNs * p.ops.applyTimers + cal.framePairNs * p.ops.frames +
    cal.countedCheckNs * p.ops.countedChecks + cal.counterIncrementNs * p.ops.dfsCounterIncrements;
  return ns / 1e6;
}

function comparatorView(rec, records, repoRoot) {
  const G = require('./ig07-run.cjs');
  const cmp = G.comparatorOf(rec, records, repoRoot);
  if (!cmp) return null;
  const r = cmp.record;
  const g = r.generation || {};
  return { source: cmp.source, key: r.key, outcome: r.outcome, readyWallMs: g.readyWallMs, coldWallMs: g.coldWallMs, cpuTotalMs: g.cpuTotalMs,
    cpuResolutionStatus: g.cpuResolutionStatus || null, puzzleHash: r.puzzleHash || null,
    sameCommand: rec.cellKind === 'control' };
}

function overheadDoc(records, repoRoot) {
  const profiled = records.filter(function (r) { return r.arm === 'prototype' && r.outcome !== 'unstarted'; });
  const rows = profiled.map(function (rec) {
    const cmp = comparatorView(rec, records, repoRoot);
    const g = rec.generation || {};
    const cal = rec.profileCalibration || null;
    const est = estimatedCostMs(rec.profile, cal);
    const done = rec.outcome === 'complete' && cmp && cmp.outcome !== 'request-timeout' && cmp.readyWallMs > 0;
    return {
      key: rec.key, cell: rec.puzzleVariant, level: rec.level, seed: rec.requestSeed, outcome: rec.outcome,
      profiledReadyWallMs: round(g.readyWallMs), profiledColdWallMs: round(g.coldWallMs), profiledCpuTotalMs: round(g.cpuTotalMs),
      profiledCpuStatus: g.cpuResolutionStatus || null,
      comparator: cmp ? { source: cmp.source, key: cmp.key, readyWallMs: round(cmp.readyWallMs), coldWallMs: round(cmp.coldWallMs),
        cpuTotalMs: round(cmp.cpuTotalMs), sameCommand: cmp.sameCommand } : null,
      readyWallRatio: done ? ratioOf(g.readyWallMs, cmp.readyWallMs) : null,
      coldWallRatio: done ? ratioOf(g.coldWallMs, cmp.coldWallMs) : null,
      cpuRatio: done && R.usable(g.cpuResolutionStatus) && R.usable(cmp.cpuResolutionStatus) ? ratioOf(g.cpuTotalMs, cmp.cpuTotalMs) : null,
      overheadReadyWallPercent: done ? round((g.readyWallMs / cmp.readyWallMs - 1) * 100, 2) : null,
      comparatorKind: cmp ? (cmp.sameCommand ? 'same-command unprofiled arm (cleanest)' :
        'IG-S02 native-w1, time-separated (machine state and difficulty-v3 load may differ; harness fingerprints differ, see compatibility)') : null,
      calibration: cal ? { clockReadNs: cal.clockReadNs, finderTimerPairNs: cal.finderTimerPairNs, applyTimerNs: cal.applyTimerNs,
        framePairNs: cal.framePairNs, countedCheckNs: cal.countedCheckNs, counterIncrementNs: cal.counterIncrementNs } : null,
      operations: rec.profile ? rec.profile.ops : null,
      estimatedInstrumentationMs: est === null ? null : round(est, 4),
      estimatedInstrumentationShareOfReadyWall: est === null || !(g.readyWallMs > 0) ? null : round(est / g.readyWallMs, 4),
      estimateNote: 'operations x calibrated unit costs (a quiet worker with a warm clock path): a lower-bound style estimate, not a correction',
      profileBytes: rec.profile ? JSON.stringify(rec.profile).length : null,
      hostReadyMinusWorkerRunMs: rec.profile ? round(g.readyWallMs - rec.profileWorkerRunMs) : null
    };
  });
  const complete = rows.filter(function (r) { return r.readyWallRatio !== null; });
  const same = complete.filter(function (r) { return r.comparator.sameCommand; });
  const separated = complete.filter(function (r) { return !r.comparator.sameCommand; });
  return {
    schema: C.SCHEMA, task: TASK, evidenceStatus: C.EVIDENCE_PROVISIONAL, note: ACCOUNTING_NOTE,
    rows: rows,
    summary: {
      requests: rows.length, compared: complete.length,
      sameCommandReadyWallRatio: same.map(function (r) { return { key: r.key, ratio: r.readyWallRatio, cpuRatio: r.cpuRatio }; }),
      timeSeparatedReadyWallRatio: separated.map(function (r) { return { key: r.key, ratio: r.readyWallRatio, cpuRatio: r.cpuRatio }; }),
      reading: 'A ratio above 1 is the cost of the instrumentation plus whatever else differs between the two runs. The same-command ' +
        'arms differ only by the instrumentation and the run order; the time-separated comparators also differ by machine state, so ' +
        'a ratio within a few percent of 1 is not resolved against that noise. The instrumented wall time is never a before/after figure.'
    },
    referenceCompatibility: null
  };
}

// --- frontier phase A (existing evidence, no new run) ------------------------------------------------------------------------------------

const FRONTIER_MODES = ['F0', 'F1', 'FC', 'FM', 'FU', 'FS'];
const NATIVE_MODES = ['proposal-only', 'ordinary-only'];

function modeOfKey(key) {
  return key.split('/').pop();
}

function frontierRowsOf(started, samplesOf, modes) {
  const cells = ['classic9', 'mega12', 'mega16', 'samurai'];
  const rows = [];
  cells.forEach(function (cell) {
    modes.forEach(function (mode) {
      const trials = started.filter(function (r) { return r.puzzleVariant === cell && modeOfKey(r.key) === mode; });
      if (trials.length === 0) return;
      const samples = [];
      trials.forEach(function (t) { samplesOf(t).forEach(function (s) { samples.push(s); }); });
      const frontier = FRONTIER_MODES.indexOf(mode) >= 0;
      const pc = function (phase, field) {
        return sum(samples, function (s) {
          return s.frontier && s.frontier.phaseCosts && s.frontier.phaseCosts[phase] ? s.frontier.phaseCosts[phase][field] : 0;
        });
      };
      const wall = sum(samples, function (s) { return s.engineMs; });
      const passes = function (field) {
        return sum(samples, function (s) {
          return s.frontier && Array.isArray(s.frontier.passes) ? sum(s.frontier.passes, function (p) { return p[field]; }) : 0;
        });
      };
      const purpose = function (name, field) {
        return sum(samples, function (s) { return s.purposes && s.purposes[name] ? s.purposes[name][field] : 0; });
      };
      const front = function (s, field) {
        return s.frontier && Array.isArray(s.frontier[field]) ? s.frontier[field].length : 0;
      };
      const phaseA = pc('phaseA', 'wallMs');
      const init = pc('init', 'wallMs');
      const deepen = pc('deepen', 'wallMs');
      const phaseBWithDeepen = pc('phaseB', 'wallMs');
      const tests = passes('tests');
      const classified = passes('solved') + passes('rederived') + passes('stuckUnique') + passes('stuckUnknown') + passes('ambiguous');
      const row = {
        cell: cell, mode: mode, kind: frontier ? 'frontier' : 'native sample', trials: trials.length, samples: samples.length,
        sampleWallMs: round(wall), meanSampleWallMs: samples.length > 0 ? round(wall / samples.length) : null,
        outcomes: {
          complete: samples.filter(function (s) { return s.status === 'complete'; }).length,
          budgetEnded: samples.filter(function (s) { return s.status === 'sample-budget'; }).length,
          emptyFrontier: frontier ? samples.filter(function (s) {
            return s.status === 'complete' && s.frontier && Array.isArray(s.frontier.entries) && s.frontier.entries.length === 0;
          }).length : null,
          candidateClasses: samples.reduce(function (o, s) {
            const k = s.class === undefined || s.class === null ? 'none' : s.class;
            o[k] = (o[k] || 0) + 1;
            return o;
          }, {})
        }
      };
      if (frontier) {
        Object.assign(row, {
          wallMs: { init: round(init), phaseA: round(phaseA), phaseBWithoutDeepen: round(phaseBWithDeepen - deepen), deepen: round(deepen),
            phaseWallTotal: round(init + phaseA + phaseBWithDeepen), outsideThePhases: round(wall - (init + phaseA + phaseBWithDeepen)),
            phaseAShareOfSample: share(phaseA, wall), phaseBShareOfSample: share(phaseBWithDeepen - deepen, wall),
            deepenShareOfSample: share(deepen, wall), initShareOfSample: share(init, wall),
            phaseAShareOfPhaseWall: share(phaseA, init + phaseA + phaseBWithDeepen),
            phaseBShareOfPhaseWall: share(phaseBWithDeepen - deepen, init + phaseA + phaseBWithDeepen),
            deepenShareOfPhaseWall: share(deepen, init + phaseA + phaseBWithDeepen) },
          floorTests: { tests: tests, acceptedFull: passes('solved'), acceptedS2: passes('rederived'),
            refusedStuckUnique: passes('stuckUnique'), refusedStuckUnknown: passes('stuckUnknown'), refusedAmbiguous: passes('ambiguous'),
            unclassifiedTests: tests - classified, skippedGroups: passes('skippedAmbiguous') + passes('skippedMinClues') + passes('skippedUnitMinimum') },
          phaseACounts: { logicalSolves: pc('phaseA', 'solves'), logicalChecks: pc('phaseA', 'logicalChecks'), dfsCalls: pc('phaseA', 'dfsCalls'),
            dfsEntries: pc('phaseA', 'dfsEntries'), dfsChecks: pc('phaseA', 'dfsChecks') },
          uniquenessDfs: { calls: purpose('dfs', 'dfsCalls'), entries: purpose('dfs', 'dfsEntries'), checks: purpose('dfs', 'dfsChecks'),
            note: 'DFS after every stuck floor test (the refused-test uniqueness proof) and the phase-B fresh proofs; phase A wall holds ' +
              'its share, which these counts do not separate' },
          allowedAndCanonical: { allowedSolves: purpose('allowed', 'solves'), canonicalSolves: purpose('canonical', 'solves'),
            logicalChecks: purpose('allowed', 'logicalChecks') + purpose('canonical', 'logicalChecks') },
          deepenCounts: { runs: sum(samples, function (s) { return s.frontier && s.frontier.deepen && Array.isArray(s.frontier.deepen.runs) ?
            s.frontier.deepen.runs.length : 0; }),
            proposals: sum(samples, function (s) { return s.frontier && s.frontier.deepen ? s.frontier.deepen.proposals : 0; }),
            solves: pc('deepen', 'solves'), logicalChecks: pc('deepen', 'logicalChecks') },
          entries: sum(samples, function (s) { return front(s, 'entries'); }),
          phaseBTries: sum(samples, function (s) { return front(s, 'phaseB'); }),
          checkShares: (function () {
            const total = purpose('floor', 'logicalChecks') + purpose('canonical', 'logicalChecks') + purpose('allowed', 'logicalChecks') +
              purpose('deepen', 'logicalChecks');
            return { floorTests: share(purpose('floor', 'logicalChecks'), total), allowedAndCanonical: share(
              purpose('allowed', 'logicalChecks') + purpose('canonical', 'logicalChecks'), total),
            deepen: share(purpose('deepen', 'logicalChecks'), total),
            note: 'shares of the logical budget checks by engine purpose: counts, not wall time' };
          }())
        });
      } else {
        Object.assign(row, { nativeCounts: { oracleCalls: sum(samples, function (s) { return s.stats ? s.stats.oracleCalls : 0; }),
          groupsTried: sum(samples, function (s) { return s.stats ? s.stats.tried : 0; }),
          canonicalRatings: sum(samples, function (s) { return s.counts ? s.counts.canonicalRatings : 0; }) } });
      }
      rows.push(row);
    });
  });
  return rows;
}

const PILOT_SHARDS = ['s1-large-controls', 's2-small-all', 's3-large-native-f1', 's4-large-floors', 's5-large-reference', 's6-large-s2-control'];

/** An IG-S04 trial is one sample of ordinal 1 whose frontier detail sits on the record itself. */
function pilotSample(rec) {
  return { status: rec.outcome === 'sample-budget' ? 'sample-budget' : 'complete', engineMs: rec.engineMs, frontier: rec.frontier,
    purposes: rec.enginePurposes, stats: null, counts: rec.counts, class: 'not recorded' };
}

function frontierDoc(repoRoot, roundId) {
  const screen = chainRecords(repoRoot, roundId, 'IG-S05', 'screen');
  const started = screen.records.filter(function (r) { return r.outcome !== 'unstarted' && r.samples; });
  const rows = frontierRowsOf(started, function (t) { return t.samples; }, FRONTIER_MODES.concat(NATIVE_MODES));
  const pilotAttempts = {};
  let pilotRecords = [];
  PILOT_SHARDS.forEach(function (shard) {
    const got = chainRecords(repoRoot, roundId, 'IG-S04', shard);
    pilotAttempts[shard] = got.attempts;
    pilotRecords = pilotRecords.concat(got.records);
  });
  const pilotStarted = pilotRecords.filter(function (r) { return r.outcome !== 'unstarted' && r.frontier; });
  const pilotRows = frontierRowsOf(pilotStarted, function (t) { return [pilotSample(t)]; }, FRONTIER_MODES);
  const limits = [
    'The phase A wall of a frontier sample contains every floor test AND the DFS uniqueness checks that follow a stuck test; the per-purpose ' +
      'counts (floor, dfs, allowed/canonical, deepen) are counts of logical checks and DFS entries, not per-purpose or per-finder wall ' +
      'measurements.',
    'Native-request finder shares (finder-profile.json) cannot be transplanted into frontier phase A, and they say nothing about the cost of ' +
      'a scoped cache. A per-finder profile of frontier phase A would be separately authorised work.',
    'Classic9\'s empty frontier (every refused group proves ambiguous), the larger boards\' above-band or shallow candidates and the ' +
      'budget-ended searches are different outcomes of different mechanisms, never interchangeable failures.',
    'No frontier run was made for IG-S07: these are the IG-S05 screen trials as recorded (two samples of two grids per cell and mode at most, ' +
      'eight clusters per cell; zero verified hits in every mode) and, as a second dataset, the IG-S04 pilot trials (grid seeds 11 and 12, one ' +
      'sample each).'
  ];
  return { schema: C.SCHEMA, task: TASK, evidenceStatus: C.EVIDENCE_PROVISIONAL, source: { task: 'IG-S05', shard: 'screen',
    attempts: screen.attempts, startedTrials: started.length }, rows: rows,
  pilot: { source: { task: 'IG-S04', shards: pilotAttempts, startedTrials: pilotStarted.length,
    note: 'the pilot that fitted the count budgets: one sample per trial on two grids per cell; the same columns as the screen rows' },
    rows: pilotRows }, limits: limits };
}

// --- the whole documents -------------------------------------------------------------------------------------------------------------------

function machineSection(repoRoot, round) {
  const m = AG.machineTime(repoRoot, TASK, round);
  const ledger = RUN.readLedger(path.join(RUN.evidenceRootOf(repoRoot), round));
  return { allocationMs: m.allocationMs, chargedMs: m.chargedMs, remainingMs: m.remainingMs, commands: m.commands,
    priorityWaitMs: m.priorityWaitMs, entries: m.entries, note: m.note,
    approvals: ledger.approvals.filter(function (a) { return a.task === TASK || a.task === 'round'; }) };
}

// The harness fingerprint (12 characters) of the machine on which r1 wrote its documents: ig07-aggregate.cjs had been edited after the nine
// runs. Recorded by the developer when r1 was written; it cannot be recomputed from the later harness.
const R1_DOCUMENTS_HARNESS = 'f91e6e527f67';

/** The loop-check command of the revision r2 (shard lc), read from its own evidence, or a plain "not run". */
function loopCheckSection(repoRoot, roundId) {
  const dir = R.shardDirOf(RUN.evidenceRootOf(repoRoot), roundId, TASK, PLAN.LOOP_SHARD);
  const chain = R.lastChain(R.listAttempts(dir));
  const last = chain.length > 0 ? chain[chain.length - 1] : null;
  if (!last || !last.command) {
    return { status: 'not-run', reason: 'the shard lc has no command in this round: the comparison on the real engine was not run', command: null,
      verdict: null, results: [], cases: [] };
  }
  const sum = readJsonIfExists(path.join(last.dir, R.EVIDENCE_FILES.summary));
  const lc = sum && sum.extra ? sum.extra.loopCheck : null;
  const cmd = last.command;
  const out = { status: lc ? 'run' : 'no-verdict', reason: lc ? null : 'the command of the shard lc recorded no verdict', command: {
    attemptId: cmd.attemptId, status: cmd.status, harnessFingerprint: cmd.harnessFingerprint, manifestHash: cmd.manifestHash,
    runtimeFingerprint: cmd.runtimeFingerprint, sourceStable: cmd.sourceStable, firewallClean: cmd.firewallClean,
    occupiedMs: cmd.timing ? cmd.timing.occupiedMs : null }, verdict: null, results: [], cases: [] };
  if (!lc) return out;
  out.verdict = { ok: lc.ok, passed: lc.passed, total: lc.total };
  out.adapter = { hash: lc.adapterHash, version: lc.adapterVersion };
  out.worker = { wallMs: round(lc.workerWallMs), cpuMs: round(lc.workerCpuMs), engineMs: lc.workerEngineMs };
  out.results = lc.results.map(function (r) { return { id: r.id, ok: r.ok, title: r.title, detail: r.detail }; });
  const plainRows = lc.rows ? lc.rows.plain : [];
  out.cases = lc.rows ? lc.rows.patched.map(function (pat) {
    const plain = plainRows.find(function (r) { return r.name === pat.name; });
    const total = pat.unlimited.off.nodes;
    const pick = function (limit) {
      const row = pat.rows.find(function (r) { return r.limit === limit; });
      if (!row) return null;
      const prow = plain ? plain.rows.find(function (r) { return r.limit === limit; }) : null;
      const brief = function (x) { return x ? { status: x.status, code: x.code, nodes: x.nodes } : null; };
      const q = row.on.profile;
      return { limit: limit, plain: prow ? brief(prow.off) : null, patchedWithoutRuntime: brief(row.off), profiled: brief(row.on),
        observedLoopChecks: q.loopChecks, finderChecks: q.finderChecks, derivedLoopChecks: q.loopChecksDerived,
        finderCalls: q.finderCalls, derivedMatchesBudget: q.loopChecksDerived + q.finderChecks === row.on.nodes };
    };
    const limits = pat.rows.map(function (r) { return r.limit; });
    return { name: pat.name, techniques: pat.techniques, unlimitedStatus: pat.unlimited.off.status, unlimitedNodes: total,
      limitsTried: limits.length, rows: [pick(0), pick(total - 1), pick(total)].filter(Boolean),
      derivedMismatchLimits: pat.rows.filter(function (r) {
        return r.on.profile.loopChecksDerived + r.on.profile.finderChecks !== r.on.nodes;
      }).map(function (r) { return r.limit; }) };
  }) : [];
  return out;
}

function collectShards(repoRoot, round) {
  const manifest = M.buildManifest(TASK, round);
  const shards = manifest.shards.map(function (s) {
    const got = chainRecords(repoRoot, round, TASK, s.shard);
    const dir = R.shardDirOf(RUN.evidenceRootOf(repoRoot), round, TASK, s.shard);
    return { shard: s.shard, keys: s.jobKeys, status: R.shardStatus(dir, s).status, attempts: got.attempts, commands: got.commands,
      records: got.records };
  });
  return { manifest: manifest, shards: shards, records: [].concat.apply([], shards.map(function (s) { return s.records; })) };
}

function build(repoRoot, round) {
  const got = collectShards(repoRoot, round);
  const cov = s3Coverage(repoRoot, round);
  const serial = serialFactors(repoRoot, round);
  const covered = new Set(cov.implemented);
  const allCommands = [].concat.apply([], got.shards.map(function (s) { return s.commands; }));
  const techniques = catalogueTechniques(allCommands);
  const registered = techniques.map(function (t) { return t.id; });
  const profiledRecs = got.records.filter(function (r) { return r.arm === 'prototype' && r.outcome !== 'unstarted'; });
  const analyses = profiledRecs.map(function (rec) { return analyseRequest(rec, covered); });
  const cmdIdentity = got.shards.map(function (s) {
    const last = s.commands[s.commands.length - 1];
    return { shard: s.shard, status: s.status, attempts: s.attempts, parity: last ? last.parity : null };
  });
  const stage = {
    schema: C.SCHEMA, task: TASK, round: round, evidenceStatus: C.EVIDENCE_PROVISIONAL, provisionalNotice: R.PROVISIONAL_NOTICE,
    note: ACCOUNTING_NOTE,
    definitions: { contexts: PR.CTX, purposes: PR.PURPOSES, primitives: PR.PRIMS,
      partition: 'every booked millisecond is in exactly one of: finderCovered (S3-implemented finders), finderRemaining (the other ' +
        'registered finders), apply (applying Findings), solveSetup (state, ladder, givens, report outside the loop), solveLoop (the ' +
        'ladder loop outside finders and applications: ladder walk, checks, bookkeeping), dfs (the four DFS entry points), rateSelf ' +
        '(difficulty.rate outside its solve: classification), gridGenerate (fullGrid.generate outside its DFS), stageSelf (the code of ' +
        'the pipeline steps and of the stages themselves, and the gaps of the restart loop: the explicit residual of unnamed work)',
      reportAnchors: REPORT_ANCHORS },
    cells: analyses.map(function (a) {
      const out = Object.assign({}, a);
      delete out._parts;
      delete out._ctxParts;
      delete out._finders;
      delete out._ctxMs;
      return out;
    })
  };
  const finder = {
    schema: C.SCHEMA, task: TASK, round: round, evidenceStatus: C.EVIDENCE_PROVISIONAL, provisionalNotice: R.PROVISIONAL_NOTICE,
    note: ACCOUNTING_NOTE,
    registry: { registered: registered.length, ids: registered, s3Covered: registered.filter(function (id) { return covered.has(id); }),
      remaining: registered.filter(function (id) { return !covered.has(id); }), source: cov.file, sourceSha256: cov.sha256,
      note: 'the nine finders of IG-S03\'s implemented scopes (singles and the six naked/hidden pair, triple and quad finders) against ' +
        'every other registered finder of this source; variant-scoped finders (cage, inequality) run only on their variants' },
    partialS3Source: serial.file ? { file: serial.file, sha256: serial.sha256 } : null,
    cells: analyses.filter(function (a) { return a.profile; }).map(function (a) {
      const ser = serial.rows.get(a.cell + ':' + a.level + ':' + a.seed) || null;
      return finderDoc(a, techniques, covered, a.level === 'nightmare' ? ser : null);
    })
  };
  const overhead = overheadDoc(got.records, repoRoot);
  overhead.referenceCompatibility = referenceCompatibility(repoRoot, round, got);
  overhead.timingEvidence = 'Headline timings stay IG-S02\'s (and IG-S03\'s) measurements; nothing in this folder replaces them.';
  const frontier = frontierDoc(repoRoot, round);
  return { got: got, coverage: cov, serial: serial, covered: covered, registered: registered, analyses: analyses, stage: stage, finder: finder,
    overhead: overhead, frontier: frontier, machine: machineSection(repoRoot, round), identity: cmdIdentity,
    loopCheck: loopCheckSection(repoRoot, round),
    techniques: techniques };
}

/** The per-file comparison of the harness at IG-S02's generation evidence and now, for every headline cell. */
function referenceCompatibility(repoRoot, round, got) {
  const G = require('./ig07-run.cjs');
  const rows = [];
  got.shards.forEach(function (s) {
    const cmd = s.commands[s.commands.length - 1];
    if (!cmd) return;
    s.records.filter(function (r) { return r.cellKind === 'headline'; }).forEach(function (rec) {
      const job = { puzzleVariant: rec.puzzleVariant, requestSeed: rec.requestSeed };
      const c = G.referenceCompat(repoRoot, job, cmd.runtimeFingerprint, cmd.catalogueFingerprint);
      rows.push({ key: rec.key, baselineKey: c.baselineKey, ok: c.ok, problems: c.problems, baselineRuntimeFingerprint: c.baselineRuntimeFingerprint,
        baselineCatalogueFingerprint: c.baselineCatalogueFingerprint, baselineHarnessFingerprint: c.baselineHarnessFingerprint,
        harnessFingerprintNow: cmd.harnessFingerprint, runtimeFingerprint: cmd.runtimeFingerprint,
        accountingPathFilesChanged: c.accountingFilesChanged, accountingPathFiles: G.ACCOUNTING_FILES, changedFilesSinceBaseline: c.changedFiles,
        harnessFilesAtBaseline: c.harnessFilesAtEvidence });
    });
  });
  return { rows: rows, knownChanges: [
    { file: 'worker.cjs', why: 'job-kind dispatch lines of IG-S03 to IG-S07 and the Killer-only branch of validate() (verification only); the native ' +
      'pipelineRequest path is the one of the IG-S02 evidence by the accepted logs, not independently re-derivable here (no old copy, no git)' },
    { file: 'run.cjs', why: 'task hooks and solverMode (IG-S02 acceptance), one hook line per later task' },
    { file: 'ig02-run.cjs, aggregate.cjs', why: 'reporting only (IG-S02 acceptance, harness c4f3a6e0)' }],
  statement: 'The accounting and loading path (host.cjs, loader.cjs, common.cjs, records.cjs, manifest.cjs) is byte-identical to the harness of ' +
    'IG-S02\'s generation evidence; the comparators are therefore compatible, with the changed files listed per row.' };
}

// --- markdown ------------------------------------------------------------------------------------------------------------------------------------------

function pct(x) {
  return typeof x === 'number' ? (x * 100).toFixed(1) + ' %' : 'n/a';
}

function f(x, d) {
  return typeof x === 'number' && Number.isFinite(x) ? x.toFixed(d === undefined ? 1 : d) : 'n/a';
}

function sec(ms) {
  return typeof ms === 'number' && Number.isFinite(ms) ? (ms / 1000).toFixed(2) : 'n/a';
}

function table(headers, rows) {
  const out = ['| ' + headers.join(' | ') + ' |', '|' + headers.map(function () { return '---'; }).join('|') + '|'];
  rows.forEach(function (r) { out.push('| ' + r.map(function (v) { return v === null || v === undefined ? 'n/a' : String(v); }).join(' | ') + ' |'); });
  return out.join('\n');
}

function cellLabel(a) {
  return a.cell + ' ' + a.level + ' ' + a.seed;
}

function renderSummary(doc) {
  const L = [];
  const stage = doc.stage.cells.filter(function (a) { return a.profile; });
  const headline = stage.filter(function (a) { return a.kind === 'headline'; });
  L.push('# IG-S07 task summary (' + doc.round + '): SM1 stage and finder profiles', '');
  L.push('**' + R.PROVISIONAL_NOTICE + '**', '');
  if (doc.revision) L.push('Revision `' + doc.revision.name + '`: ' + doc.revision.note, '');
  L.push('Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**. ' + ACCOUNTING_NOTE, '');
  L.push('## Coverage', '');
  L.push(table(['planned requests', 'started', 'complete', 'censored', 'errors', 'unstarted', 'profiled complete'], [[doc.coverage.planned,
    doc.coverage.started, doc.coverage.complete, doc.coverage.censored, doc.coverage.errors, doc.coverage.unstarted,
    doc.coverage.profiledComplete]]), '');
  L.push(table(['shard', 'status', 'attempts'], doc.shards.map(function (s) { return [s.shard, s.status, s.attempts.join(', ')]; })), '');
  L.push('Identity of every profiled output against its unprofiled comparator (every digest section, exactness): ' +
    doc.identity.ok + ' ok, ' + doc.identity.failed + ' failed, ' + doc.identity.notComparable + ' not comparable.', '');
  L.push('## Where the time goes: sample, local continuation, other', '');
  L.push('Wall shares of the profiled request (sample = ordinary + proposal; local = the local-continuation sample; other = setup, full grids, ' +
    'extra structure, restart loop). The report anchor for mega16 is samples ~90 %, local ~10 %.', '');
  L.push(table(['request', 'profiled root s', 'sample', 'local', 'other', 'ordinary', 'proposal', 'report anchor', 'assumed bottleneck'],
    stage.map(function (a) {
      const sv = a.sampleVsLocal;
      const anchor = a.cell === 'mega16' && a.level === 'nightmare' ? '90 / 10' : 'none';
      const verdict = a.cell === 'mega16' && a.level === 'nightmare' ? (sv.sampleShareOfSampleAndLocal >= 0.8 ?
        'holds (samples ' + pct(sv.sampleShareOfSampleAndLocal) + ' of sample + local)' : 'does not hold (samples ' +
        pct(sv.sampleShareOfSampleAndLocal) + ' of sample + local)') : 'no anchor';
      const c = function (name) { return a.contexts.find(function (x) { return x.context === name; }); };
      return [cellLabel(a), sec(a.timing.rootMs), pct(sv.sampleShare), pct(sv.localShare), pct(sv.otherShare), pct(c('ordinary').share),
        pct(c('proposal').share), anchor, verdict];
    })), '');
  L.push('## Where the solver time goes (partition of the request, share of the profiled root)', '');
  L.push(table(['request', 'finders S3-covered', 'finders remaining', 'apply Findings', 'solver state/setup', 'solver loop', 'DFS', 'rating (classify)',
    'grid generation', 'stage code + residual'], stage.map(function (a) {
    const s = a.partition.shareOfRoot;
    return [cellLabel(a), pct(s.finderCovered), pct(s.finderRemaining), pct(s.apply), pct(s.solveSetup), pct(s.solveLoop), pct(s.dfs), pct(s.rateSelf),
      pct(s.gridGenerate), pct(s.stageSelf)];
  })), '');
  L.push('Inside the logical solver only (share of solver time):', '');
  L.push(table(['request', 'solver s', 'finders S3-covered', 'finders remaining', 'apply', 'state/setup', 'loop'], stage.map(function (a) {
    const s = a.solver;
    return [cellLabel(a), sec(s.solverMs), pct(s.finderCoveredShare), pct(s.finderRemainingShare), pct(s.applyShare), pct(s.stateAndSetupShare),
      pct(s.loopShare)];
  })), '');
  L.push('## Proposal against ordinary samples, and the local continuation', '');
  L.push(table(['request', 'kind', 'samples', 'total ms', 'mean ms', 'max ms', 'oracle calls (mean)', 'solves (mean)', 'finder ms (mean)', 'exact', 'shallow'],
    [].concat.apply([], stage.map(function (a) {
      return ['ordinary', 'proposal', 'local'].filter(function (k) { return a.sampleKinds[k].samples > 0; }).map(function (k) {
        const s = a.sampleKinds[k];
        return [cellLabel(a), k, s.samples, f(s.wallMs.total, 0), f(s.wallMs.mean, 0), f(s.wallMs.max, 0), f(s.oracleCalls.mean, 0),
          f(s.solves.mean, 0), f(s.finderMs.mean, 0), s.exact, s.shallow];
      });
    }))), '');
  L.push('A local-continuation row is one sample (the local search of an attempt), so its mean is its value; samples are only the observed ones ' +
    '(a request that ended by an error has no row for the interrupted sample). No sample probability is inferred from these totals.', '');
  L.push('## Stage detail (purpose, share of root, by primitive), each request\'s five largest stages', '');
  stage.forEach(function (a) {
    L.push('**' + cellLabel(a) + '**', '');
    L.push(table(['stage (purpose)', 'ms', 'share of root', 'oracle solves', 'canonical ratings', 'finders covered ms', 'finders remaining ms', 'apply ms', 'DFS ms',
      'self ms'], a.purposes.slice(0, 5).map(function (p) {
      return [p.purpose, f(p.ms, 0), pct(p.shareOfRoot), p.oracleSolves, p.canonicalRates, f(p.parts.finderCovered, 0), f(p.parts.finderRemaining, 0),
        f(p.parts.apply, 0), f(p.parts.dfs, 0), f(p.parts.stageSelf, 0)];
    })), '');
  });
  L.push('## Finders: S3-covered against the remaining registered finders', '');
  L.push('Covered = IG-S03\'s implemented scopes (`' + doc.registry.s3Covered.join(', ') + '`); remaining = the other ' + doc.registry.remaining.length +
    ' registered finders (`' + doc.registry.remaining.join(', ') + '`). A finder\'s inclusive and exclusive times are one number (see below).', '');
  L.push(table(['request', 'finder time share of root', 'covered share of root', 'remaining share of root', 'covered share of finders', 'remaining negative-call share of root',
    'covered negative-call share of root', 'chain group (nishio, forcingChain, ...) share of root'], doc.finder.cells.map(function (c) {
    const cov = c.families[0];
    const rem = c.families[1];
    return [cellLabel(c), pct(c.finderShareOfRoot), pct(cov.shareOfRoot), pct(rem.shareOfRoot), pct(cov.shareOfFinders), pct(rem.negativeCallShareOfRoot),
      pct(cov.negativeCallShareOfRoot), pct(c.scenarios.chainGroup.shareOfRoot)];
  })), '');
  L.push('A negative call is a finder call that returned no Finding (its whole wall time, the scan of every scope it looked at); a call that returned a ' +
    'Finding is a positive call, and it too may have looked at scopes that held nothing.', '');
  doc.finder.cells.forEach(function (c) {
    L.push('**' + cellLabel(c) + '** top finders (all rows: finder-profile.json)', '');
    L.push(table(['finder', 'S3', 'calls', 'hit rate', 'ms', 'share of root', 'negative-call ms', 'us/call', 'checks/call'], c.finders.slice(0, 6).map(function (r) {
      return [r.id, r.s3Covered ? 'covered' : 'remaining', r.calls, pct(r.hitRate), f(r.ms, 0), pct(r.shareOfRoot), f(r.negativeCallMs, 0), f(r.usPerCall, 2),
        f(r.checksPerCall, 2)];
    })), '');
  });
  L.push('## Conditional zero-cost scenarios (not a bound on a full S3)', '');
  L.push('Each factor is this profiled run with the named wall time set to zero and everything else as measured (root / (root - removed)). They are ' +
    'arithmetic of one instrumented run, not forecasts and not ceilings of a full S3: a call that returns a Finding can also skip cached negative ' +
    'scopes, so a full S3 could save more than the negative calls, and the cache costs lookups and invalidation, so it saves less. Only the two ' +
    'family-time columns limit a change confined to the calls of those finders (it cannot save more than their whole wall time, timers included).', '');
  L.push(table(['request', 'scenario: all finder time removed', 'scenario: covered finders\' time removed', 'scenario: remaining finders\' time removed',
    'scenario: negative calls of the covered finders removed', 'scenario: negative calls of the remaining finders removed',
    'scenario: negative calls of the remaining non-chain finders removed', 'measured partial S3 (IG-S03 serial, n = 1)'],
  doc.finder.cells.map(function (c) {
    const b = c.scenarios;
    return [cellLabel(c), f(b.scenarioNoFinderTime, 3), f(b.scenarioNoCoveredFinderTime, 3), f(b.scenarioNoRemainingFinderTime, 3),
      f(b.scenarioNoNegativeCallsCoveredFinders, 3), f(b.scenarioNoNegativeCallsRemainingFinders, 3), f(b.scenarioNoNegativeCallsRemainingNonChain, 3),
      f(b.measuredPartialS3SerialFactor, 3)];
  })), '');
  doc.scenarioReading.forEach(function (line) { L.push('- ' + line); });
  L.push('');
  L.push('## Profiling overhead (an instrumented run is not a timing run)', '');
  L.push(table(['request', 'profiled ready s', 'comparator', 'comparator ready s', 'ready ratio', 'cpu ratio', 'estimated instrumentation', 'estimated share of ready wall'],
    doc.overhead.rows.map(function (r) {
      return [r.key.replace('IG-S07/', ''), sec(r.profiledReadyWallMs), r.comparator ? (r.comparator.sameCommand ? 'same command' : 'IG-S02 native-w1') : 'none',
        r.comparator ? sec(r.comparator.readyWallMs) : 'n/a', f(r.readyWallRatio, 3), f(r.cpuRatio, 3), r.estimatedInstrumentationMs === null ? 'n/a' :
          f(r.estimatedInstrumentationMs, 1) + ' ms', pct(r.estimatedInstrumentationShareOfReadyWall)];
    })), '');
  L.push(doc.overhead.summary.reading, '');
  L.push('Reference compatibility (IG-S02 comparators): ' + doc.overhead.referenceCompatibility.statement, '');
  L.push(table(['request', 'compatible', 'accounting-path files changed', 'files changed since the baseline harness'], doc.overhead.referenceCompatibility.rows.map(function (r) {
    return [r.key.replace('IG-S07/', ''), r.ok, r.accountingPathFilesChanged.join(', ') || 'none', r.changedFilesSinceBaseline.join(', ')];
  })), '');
  L.push('## Frontier phase A (existing IG-S05 ledgers, no new run)', '');
  const fr = doc.frontier.rows.filter(function (r) { return r.kind === 'frontier' && ['F1', 'FC', 'FM'].indexOf(r.mode) >= 0; });
  const frontierTable = function (list) {
    return table(['cell', 'mode', 'samples', 'phase A / sample wall', 'phase A / phase wall', 'phase B (no deepen)', 'deepen', 'floor tests',
      'accepted full / S2', 'refused unique / unknown / ambiguous', 'phase A DFS entries', 'allowed + canonical solves', 'deepen proposals',
      'empty frontiers', 'budget-ended', 'candidate classes'], list.map(function (r) {
      return [r.cell, r.mode, r.samples, pct(r.wallMs.phaseAShareOfSample), pct(r.wallMs.phaseAShareOfPhaseWall), pct(r.wallMs.phaseBShareOfPhaseWall),
        pct(r.wallMs.deepenShareOfPhaseWall), r.floorTests.tests, r.floorTests.acceptedFull + ' / ' + r.floorTests.acceptedS2,
        r.floorTests.refusedStuckUnique + ' / ' + r.floorTests.refusedStuckUnknown + ' / ' + r.floorTests.refusedAmbiguous, r.phaseACounts.dfsEntries,
        r.allowedAndCanonical.allowedSolves + ' + ' + r.allowedAndCanonical.canonicalSolves, r.deepenCounts.proposals, r.outcomes.emptyFrontier,
        r.outcomes.budgetEnded, JSON.stringify(r.outcomes.candidateClasses)];
    }));
  };
  L.push('IG-S05 screen (8 clusters per cell, up to two samples per trial; phase B and deepen shares are of the phase wall, which holds init + phase A + phase B ' +
    'with its nested deepen; "outside the phases" is the rest of the sample wall):', '');
  L.push(frontierTable(fr), '');
  L.push('IG-S04 pilot (grid seeds 11 and 12, one sample per trial):', '');
  L.push(frontierTable(doc.frontier.pilot.rows.filter(function (r) { return ['F1', 'FC', 'FM'].indexOf(r.mode) >= 0; })), '');
  doc.frontier.limits.forEach(function (line) { L.push('- ' + line); });
  L.push('');
  L.push('## Loop-check comparison on the real engine (revision r2)', '');
  const lcDoc = doc.loopCheck;
  if (lcDoc.status !== 'run') {
    L.push('**Not run.** ' + lcDoc.reason + '. The observed loop-check counter of the revised instrument is therefore verified on a fake of the engine pieces with the ' +
      'real patched sources only, and the r1 totals stay inexact.', '');
  } else {
    L.push('Command `lc` (attempt ' + lcDoc.command.attemptId + ', ' + lcDoc.command.status + '; harness ' + lcDoc.command.harnessFingerprint.slice(0, 12) + '…, adapter profile version ' +
      lcDoc.adapter.version + ' ' + lcDoc.adapter.hash.slice(0, 12) + '…): the real `SG.logicalSolver.solve` of classic9 under budgets of 0, 1, 2, ... nodes on an unpatched ' +
      'instance, on the patched sources without the runtime and on the patched sources with it. Verdict: **' + lcDoc.verdict.passed + '/' + lcDoc.verdict.total + ' passed**' +
      (lcDoc.verdict.ok ? '.' : ' (FAILED).'), '');
    L.push(table(['check', 'passed', 'what', 'detail'], lcDoc.results.map(function (r) {
      return [r.id, r.ok, r.title, JSON.stringify(r.detail)];
    })), '');
    L.push('Boundary rows (limit = budget nodes; each cell is status or error code, then the budget\'s own count; observed = loop checks counted before the call, derived = the r1 estimate):', '');
    L.push(table(['case', 'ladder', 'unlimited run', 'limit', 'unpatched', 'patched, no runtime', 'profiled', 'observed loop', 'finder checks', 'derived loop', 'derived = budget count'],
      [].concat.apply([], lcDoc.cases.map(function (c) {
        const fmt = function (x) { return x ? (x.code || x.status) + ' / ' + x.nodes : 'n/a'; };
        return c.rows.map(function (r) {
          return [c.name, c.techniques.length === 0 ? 'none' : c.techniques.join(', '), c.unlimitedStatus + ' / ' + c.unlimitedNodes, r.limit, fmt(r.plain),
            fmt(r.patchedWithoutRuntime), fmt(r.profiled), r.observedLoopChecks, r.finderChecks, r.derivedLoopChecks, r.derivedMatchesBudget];
        });
      }))), '');
    L.push(table(['case', 'limits tried', 'limits where the r1 derivation differs from the budget\'s own count'], lcDoc.cases.map(function (c) {
      return [c.name, c.limitsTried, c.derivedMismatchLimits.join(', ') || 'none'];
    })), '');
    L.push('Worker wall time of the two comparison workers: ' + f(lcDoc.worker.wallMs, 0) + ' ms (engine part: plain ' + f(lcDoc.worker.engineMs.plain, 1) + ' ms, patched ' +
      f(lcDoc.worker.engineMs.patched, 1) + ' ms); the command occupied the wrapper for ' + f(lcDoc.command.occupiedMs / 1000, 1) + ' s.', '');
  }
  L.push('## Machine time and priority waits', '');
  const m = doc.machine;
  L.push('Charged ' + f(m.chargedMs / 1000, 1) + ' s of the ' + f(m.allocationMs / 1000, 0) + ' s allocation over ' + m.commands + ' commands (remaining ' +
    f(m.remainingMs / 1000, 1) + ' s); priority waits behind difficulty-v3 ' + f(m.priorityWaitMs / 1000, 1) + ' s, not charged. ' + m.note, '');
  if (m.approvals.length > 0) {
    L.push('Approvals in the ledger: ' + m.approvals.map(function (a) { return a.task + ' +' + f(a.extraMs / 1000, 1) + ' s by ' + a.by; }).join('; ') +
      '. They lift the admission gate of the dispatcher; the charge of a command is still its occupied time plus the grace.', '');
  }
  L.push(table(['shard', 'attempt', 'status', 'occupied s', 'charged s', 'priority wait s'], m.entries.map(function (e) {
    return [e.shard, e.attemptId, e.status, f(e.occupiedMs / 1000, 1), f(e.chargedMs / 1000, 1), f(e.priorityWaitMs / 1000, 1)];
  })), '');
  L.push('## Acceptance', '');
  L.push(table(['id', 'status', 'evidence'], doc.acceptance.map(function (a) { return [a.id, a.status, a.evidence]; })), '');
  L.push('## Deviations and disclosures', '');
  doc.deviations.forEach(function (line) { L.push('- ' + line); });
  L.push('');
  L.push('## Limitations and open points', '');
  doc.limitations.forEach(function (line) { L.push('- ' + line); });
  L.push('', '## Sources', '');
  const fp = doc.sources.fingerprints;
  const short = function (list) { return list.length === 0 ? 'none' : list.map(function (h) { return h.slice(0, 12) + '…'; }).join(', '); };
  L.push(table(['item', 'value'], [['runtime fingerprint', doc.sources.runtimeFingerprints.join(', ')],
    ['harness of the profile cohort (the run)', short(fp.profileCohort.harness) + ' (' + fp.profileCohort.commands + ' commands; manifest ' + short(fp.profileCohort.manifest) +
      '; adapter ' + short(fp.profileCohort.adapterHashes) + ', ' + fp.profileCohort.instrument + ')'],
    ['harness of the r1 report', fp.r1Documents.harness + ' (' + fp.r1Documents.note + ')'],
    ['fixed harness (the loop-check command)', short(fp.fixedHarness.harness) + ' (' + fp.fixedHarness.commands + ' command; manifest ' + short(fp.fixedHarness.manifest) +
      '; adapter ' + short(fp.fixedHarness.adapterHashes) + ')'],
    ['harness of this r2 report', fp.thisRevision.harness.slice(0, 12) + '… (' + fp.thisRevision.note + ')'],
    ['sources stable', doc.sources.sourceStable], ['firewall clean', doc.sources.firewallClean],
    ['S3 coverage source', doc.registry.source + ' (' + doc.registry.sourceSha256.slice(0, 12) + ')']]));
  return C.normaliseText(L.join('\n'));
}

// --- the task summary --------------------------------------------------------------------------------------------------------------------------------

function scenarioReading(doc) {
  const lines = [];
  doc.finder.cells.forEach(function (c) {
    const b = c.scenarios;
    const rem = c.families[1];
    const cov = c.families[0];
    lines.push(cellLabel(c) + ': the covered finders take ' + pct(cov.shareOfRoot) + ' of the profiled request (' + pct(cov.negativeCallShareOfRoot) +
      ' in negative calls) and the remaining finders ' + pct(rem.shareOfRoot) + ' (' + pct(rem.negativeCallShareOfRoot) + ' in negative calls; the chain ' +
      'group alone ' + pct(b.chainGroup.shareOfRoot) + '). Scenarios: no covered-finder time ' + f(b.scenarioNoCoveredFinderTime, 3) + 'x, no negative ' +
      'calls of the covered finders ' + f(b.scenarioNoNegativeCallsCoveredFinders, 3) + 'x (the measured partial S3 of this request: ' +
      (b.measuredPartialS3SerialFactor === null ? 'no row' : f(b.measuredPartialS3SerialFactor, 3) + 'x') + '); no negative calls of the remaining ' +
      'finders ' + f(b.scenarioNoNegativeCallsRemainingFinders, 3) + 'x (without the chain group ' + f(b.scenarioNoNegativeCallsRemainingNonChain, 3) + 'x).');
  });
  lines.push('These are conditional zero-cost scenarios of one profiled run, not ceilings of a full S3: a call that returns a Finding can also skip ' +
    'cached negative scopes, and a cache costs lookups and invalidation; neither is measured here. What the profile does support is attribution: ' +
    'where the finder time sits (covered against remaining, and the chain group), and that a change confined to the covered finders cannot save more ' +
    'than their time. How much of the remaining finders\' time a full S3 could skip needs per-scope data (what a call scanned, what invalidated it); ' +
    'nothing is extrapolated from the partial S3 to the other finders, to chains or to the cap behaviour.');
  return lines;
}

function acceptance(doc) {
  const stage = doc.stage.cells.filter(function (a) { return a.profile; });
  const allRecon = stage.every(function (a) { return Math.abs(a.reconciliation.residualMs) < 0.05 + 0.0006 * 400; });
  const problems = doc.profileProblems;
  const identityOk = doc.identity.failed === 0 && doc.identity.ok === doc.identity.pairs;
  return [
    { id: 'B01', status: stage.length > 0 ? 'met' : 'not met', evidence: 'every number is a measured wall time or a counted operation of the twelve fixed requests; no loose-count solve model is used' },
    { id: 'B02', status: stage.length > 0 ? 'met' : 'not met', evidence: 'local-continuation time (context local) is its own row and share; a cohort\'s request-group time is not substituted for it; ' +
      'per-attempt cap reasons are listed from the engine\'s own work' },
    { id: 'B03', status: 'met', evidence: 'the headline timings stay IG-S02\'s: profiled wall times appear only in the overhead and attribution tables, labelled instrumented' },
    { id: 'T01', status: allRecon && problems.length === 0 ? 'met' : 'not met', evidence: stage.length + ' profiles reconcile (booked cells = root, residual in the rows); finder time is one number per finder ' +
      'and the stage cells hold the rest of the solver, never summed twice; profile consistency problems: ' + problems.length },
    { id: 'T02', status: 'met', evidence: 'canonical ratings (difficulty.rate calls, equal to the engine\'s work counter), oracle solves (solves outside a rating), DFS entries/checks/backtracks and finder/loop budget checks are separate counters; the r1 budget-check totals are marked inexact (counters.checkTotals in stage-profile-r2.json)' },
    { id: 'T03', status: identityOk ? 'met' : 'not met', evidence: doc.identity.ok + ' of ' + doc.identity.pairs + ' profiled outputs equal their comparator in every digest section; hook restoration is checked in every request and in the engine checks' },
    { id: 'T04', status: 'met', evidence: 'the hooks call no solve, draw no number and charge no budget; the r1 engine checks compare the number of budget checks of an unpatched, a patched-without-runtime and a profiled run (13/13); the loop-check comparison of the revision r2 on the real engine: ' +
      (doc.loopCheck.status === 'run' ? doc.loopCheck.verdict.passed + '/' + doc.loopCheck.verdict.total + ' passed' : 'NOT RUN (' + doc.loopCheck.reason + ')') },
    { id: 'T05', status: 'met', evidence: 'every record carries source/case/trace metadata (trace off), the transform hashes, the calibration and its comparator; overhead.json holds the ratios' }
  ];
}

function buildSummary(repoRoot, round, built, revision) {
  const got = built.got;
  const records = got.records;
  const planned = got.manifest.jobs.length;
  const startedRecs = records.filter(function (r) { return r.outcome !== 'unstarted'; });
  const profiled = records.filter(function (r) { return r.arm === 'prototype' && r.outcome === 'complete' && r.profile; });
  const identityPairs = [].concat.apply([], built.identity.map(function (s) { return s.parity && s.parity.pairs ? s.parity.pairs : []; }));
  const identity = { pairs: identityPairs.length, ok: identityPairs.filter(function (p) { return p.verdict === 'identity-ok'; }).length,
    failed: identityPairs.filter(function (p) { return p.verdict === 'identity-failed'; }).length,
    notComparable: identityPairs.filter(function (p) { return p.verdict === 'not-comparable'; }).length, rows: identityPairs };
  const cmds = [].concat.apply([], got.shards.map(function (s) { return s.commands; }));
  const cellCmds = [].concat.apply([], got.shards.filter(function (s) { return s.shard !== PLAN.LOOP_SHARD; }).map(function (s) { return s.commands; }));
  const lcCmds = [].concat.apply([], got.shards.filter(function (s) { return s.shard === PLAN.LOOP_SHARD; }).map(function (s) { return s.commands; }));
  const uniq = function (values) { return Array.from(new Set(values.filter(Boolean))); };
  const doc = {
    schema: C.SCHEMA, task: TASK, round: round, evidenceStatus: C.EVIDENCE_PROVISIONAL, provisionalNotice: R.PROVISIONAL_NOTICE,
    formalGate: 'not-evaluable-pre-freeze', note: ACCOUNTING_NOTE,
    revision: revision || null,
    coverage: { planned: planned, started: startedRecs.length, complete: startedRecs.filter(function (r) { return r.outcome === 'complete'; }).length,
      censored: startedRecs.filter(function (r) { return r.outcome === 'request-timeout' || r.outcome === 'sample-budget'; }).length,
      errors: startedRecs.filter(function (r) { return r.outcome === 'error'; }).length, unstarted: planned - startedRecs.length,
      profiledComplete: profiled.length },
    shards: got.shards.map(function (s) { return { shard: s.shard, status: s.status, attempts: s.attempts }; }),
    identity: identity,
    registry: built.finder.registry,
    stage: built.stage, finder: built.finder, overhead: built.overhead, frontier: built.frontier,
    machine: built.machine,
    loopCheck: built.loopCheck,
    profileProblems: [].concat.apply([], records.map(function (r) { return (r.profileProblems || []).map(function (p) { return r.key + ': ' + p; }); })),
    engineChecks: cmds.map(function (c) { return (c.notes || []).filter(function (n) { return /^synthetic profile tests/.test(n); }); })
      .filter(function (n) { return n.length > 0; }),
    sources: { runtimeFingerprints: uniq(cmds.map(function (c) { return c.runtimeFingerprint; })),
      harnessFingerprints: uniq(cellCmds.map(function (c) { return c.harnessFingerprint; })), adapterIds: uniq([].concat.apply([], cellCmds.map(function (c) { return c.adapterIds || []; }))),
      adapterHashes: uniq([].concat.apply([], cellCmds.map(function (c) { return c.adapterHashes || []; }))),
      sourceStable: cmds.every(function (c) { return c.sourceStable === true; }), firewallClean: cmds.every(function (c) { return c.firewallClean === true; }),
      commandStatuses: got.shards.map(function (s) { return s.shard + ':' + s.attempts.join('+') + ':' + s.status; }),
      fingerprints: {
        profileCohort: { role: 'the nine profile commands (the run of r1, never rerun)', harness: uniq(cellCmds.map(function (c) { return c.harnessFingerprint; })),
          manifest: uniq(cellCmds.map(function (c) { return c.manifestHash; })), adapterHashes: uniq([].concat.apply([], cellCmds.map(function (c) { return c.adapterHashes || []; }))),
          commands: cellCmds.length, instrument: 'adapter profile version 1 (26 transforms: derived loop-check totals)' },
        r1Documents: { role: 'the harness when the r1 documents were written', harness: R1_DOCUMENTS_HARNESS + '…', note: 'ig07-aggregate.cjs had been edited after the nine runs ' +
          '(reporting code only); recorded by the developer when r1 was written, 12 characters, not recomputable from the later harness' },
        fixedHarness: { role: 'the fixed harness: the loop-check command (adapter profile version 2, 27 transforms, observed loop checks)',
          harness: uniq(lcCmds.map(function (c) { return c.harnessFingerprint; })), manifest: uniq(lcCmds.map(function (c) { return c.manifestHash; })),
          adapterHashes: built.loopCheck.adapter ? [built.loopCheck.adapter.hash] : [], commands: lcCmds.length },
        thisRevision: { role: 'the harness when this revision\'s documents were written', harness: C.harnessFingerprint().fingerprint,
          note: 'the writer of the r2 documents; it differs from the fixed harness of the loop-check command only by edits of ig07-aggregate.cjs (reporting code) ' +
            'made after that command: a shadowed-variable fix in the loop-check section and the wording of this note' }
      } }
  };
  doc.scenarioReading = scenarioReading(doc);
  doc.acceptance = acceptance(doc);
  doc.deviations = [
    'The classic9 shard ran first (the plumbing check of the first command); the other eight shards follow the table order of the task file.',
    'In the three control shards the unprofiled arm ran before the profiled one (an order effect on the same-command ratios is possible); the six ' +
      'headline cells have no same-command arm, their comparator is IG-S02\'s native-w1 record (time-separated, machine state may differ).',
    'The IG-S04 pilot trials were read as a second frontier dataset next to the IG-S05 screen; no frontier run was made.',
    'During development one scratch analysis script was written to the shell temp folder ($env:TEMP) against the rule that scratch files stay in the ' +
      'project; it was removed at once, held no evidence and no result was read back from it. One created file was misnamed and renamed inside the ' +
      'harness folder with Move-Item.',
    'Before the wrapped loop-check command, with the orchestrator\'s permission, the new worker function (`ig07-loopcheck`) was run once unwrapped on the real engine as a ' +
      'correctness pre-check: two node processes (unpatched, patched), about 0.4 s of CPU in all, no generation, no timing, nothing written to the evidence. Its first ' +
      'run showed that the puzzle chosen for the stuck cases was solved by singles (one stuck case only, no throw inside a finder), so the case puzzle was replaced by ' +
      'Escargot before the command was run; the second run passed 13/13 with three stuck cases and 25 rows that throw inside a finder.',
    'The r1 documents were written by harness ' + R1_DOCUMENTS_HARNESS + '…, after ig07-aggregate.cjs was edited following the nine runs (reporting code ' +
      'only); the nine commands ran under ' + uniq(cellCmds.map(function (c) { return c.harnessFingerprint.slice(0, 12); })).join(', ') + '….',
    'Revision r2 (the author\'s review): the S3 figures were relabelled conditional zero-cost scenarios (r1 called some of them ceilings of a full S3, which they ' +
      'are not) and the bias-adjusted column was dropped (it subtracted all-call timer costs from negative-call time); the budget-check totals of the r1 cohort ' +
      'are marked inexact and the original records are untouched; the profile cohort was not rerun, so its loop-check totals stay derived.',
    'Revision r2 added the request-free shard lc (the loop-check comparison on the real engine, no cell, no seed, no cohort). ' +
      (built.loopCheck.status === 'run' ? 'Its command ran under the fixed harness and is in the ledger.' : 'It has not run: ' + built.loopCheck.reason + '.') +
      (built.machine.approvals.length > 0 ? ' The dispatcher admits a command only with a window of at least 23 s after the 45 s grace; the remaining 57.3 s were short of ' +
        'that, so an approval entry of the orchestrator in the ledger (' + built.machine.approvals.map(function (a) { return a.extraMs + ' ms by ' + a.by; }).join('; ') +
        ') lifted the admission gate only.' : '')
  ];
  doc.limitations = [
    'n = 1 profiled request per cell: shares are observations of one seed, not distributions; the per-kind rows are the samples of that request.',
    'Wall-clock attribution inside one worker: process CPU is read once at the host (cpuTotal in overhead.json); no per-call CPU is taken. Process CPU also counts ' +
      'background threads (the Greater-Than cells show CPU/ready ratios above 1, as IG-S02\'s native Greater-Than runs did), so it is a side figure and never an attribution base.',
    'DFS checks are the budget checks of the search loop; checks issued inside constraint propagation are not counted separately (UNIQUE_NODES units are larger).',
    'The budget-check totals of the r1 profiles are INEXACT: the loop-check part was derived from the finder passes (it misses a check that throws before the first ' +
      'finder or before returning stuck, and every pass of an empty ladder), and the finder-check part counts ctx.check() calls only (the budget checks that nishio ' +
      'and forcingChain issue through the propagation engine on variants with propagation extensions are not observed: read from tech-chain.js and constraints.js, ' +
      'not measured). The original r1 records ' +
      'are preserved; the shares and times of this profile do not depend on them.',
    'The revised instrument (adapter profile version 2) observes both check sites of the ladder loop before the call; it was checked on the real engine only by the ' +
      'one comparison of the shard lc (and on a fake of the engine pieces with the real patched sources), never on a full request, and the propagation checks ' +
      'of the chain finders are still not observed.',
    'No frontier run was made: phase A is read from the IG-S05 ledgers; per-finder profiles of the frontier are not measured.',
    'Killer and Greater-Than strategies (structure search, sign dig) run inside the dig and extra-structure steps through the same primitives; their own stages are not labelled separately.'
  ];
  return doc;
}

// --- cli -----------------------------------------------------------------------------------------------------------------------------------------------------

function parseArgs(argv) {
  const o = { task: TASK, round: 'provisional-r1', suffix: '', revision: null, write: ['stage', 'finder', 'overhead', 'frontier'] };
  argv.forEach(function (arg) {
    const m = /^--([a-z-]+)=(.*)$/.exec(arg);
    if (!m) throw new HarnessError('args', 'unknown argument ' + arg);
    if (m[1] === 'task') o.task = m[2];
    else if (m[1] === 'round') o.round = m[2];
    else if (m[1] === 'suffix') o.suffix = m[2];
    else if (m[1] === 'revision') o.revision = m[2];
    else if (m[1] === 'write') o.write = m[2].split(',').filter(Boolean);
    else throw new HarnessError('args', 'unknown argument ' + arg);
  });
  if (o.task !== TASK) throw new HarnessError('args', 'this aggregator is for ' + TASK);
  o.write.forEach(function (name) {
    if (['stage', 'finder', 'overhead', 'frontier'].indexOf(name) < 0) throw new HarnessError('args', 'unknown document ' + name);
  });
  return o;
}

/** The summary file: the document names are those written by this revision, the others stay the files of the earlier one (no suffix). */
function slimOf(doc, suffix, written) {
  const out = Object.assign({}, doc);
  const w = written || ['stage', 'finder', 'overhead', 'frontier'];
  const name = function (id, base) { return base + (w.indexOf(id) >= 0 ? suffix : '') + '.json'; };
  out.files = { stage: name('stage', 'stage-profile'), finder: name('finder', 'finder-profile'), overhead: name('overhead', 'overhead'),
    frontier: name('frontier', 'frontier-phase-a') };
  out.cells = doc.stage.cells.filter(function (a) { return a.profile; }).map(function (a) {
    const fin = doc.finder.cells.find(function (c) { return c.key === a.key; });
    const ov = doc.overhead.rows.find(function (r) { return r.key === a.key; });
    return {
      key: a.key, kind: a.kind, outcome: a.outcome, claimedExact: a.claimedExact, verifiedExact: a.verifiedExact, timing: a.timing,
      sampleVsLocal: a.sampleVsLocal, contexts: a.contexts.map(function (c) { return { context: c.context, ms: c.ms, share: c.share }; }),
      partitionShareOfRoot: a.partition.shareOfRoot, solver: a.solver, counters: a.counters, firstExact: a.firstExact,
      sampleKinds: a.sampleKinds,
      finderFamilies: fin ? fin.families.map(function (x) {
        return { family: x.family, ms: x.ms, shareOfRoot: x.shareOfRoot, shareOfSolver: x.shareOfSolver, negativeCallMs: x.negativeCallMs,
          negativeCallShareOfRoot: x.negativeCallShareOfRoot, calls: x.calls, checks: x.checks, finders: x.finders };
      }) : null,
      topFinders: fin ? fin.top : null, scenarios: fin ? fin.scenarios : null,
      overhead: ov ? { readyWallRatio: ov.readyWallRatio, cpuRatio: ov.cpuRatio, comparator: ov.comparator, estimatedInstrumentationShareOfReadyWall:
        ov.estimatedInstrumentationShareOfReadyWall } : null
    };
  });
  out.stage = { file: out.files.stage, cells: out.cells.length };
  out.finder = { file: out.files.finder, registry: doc.finder.registry, cells: out.cells.length };
  out.overhead = { file: out.files.overhead, summary: doc.overhead.summary, referenceCompatibility: doc.overhead.referenceCompatibility };
  out.frontier = { file: out.files.frontier, source: doc.frontier.source, limits: doc.frontier.limits, rows: doc.frontier.rows.filter(function (r) {
    return r.kind === 'frontier' && ['F1', 'FC', 'FM'].indexOf(r.mode) >= 0; }),
  pilot: { source: doc.frontier.pilot.source, rows: doc.frontier.pilot.rows.filter(function (r) { return ['F1', 'FC', 'FM'].indexOf(r.mode) >= 0; }) } };
  return out;
}

function main(argv) {
  const opts = parseArgs(argv);
  const repoRoot = C.DEFAULT_REPO_ROOT;
  const built = build(repoRoot, opts.round);
  const summary = buildSummary(repoRoot, opts.round, built, opts.revision ? { name: 'summary' + opts.suffix, note: opts.revision } : null);
  const dir = path.join(RUN.evidenceRootOf(repoRoot), opts.round, TASK);
  const stamped = function (doc) {
    return opts.revision ? Object.assign({}, doc, { revision: { name: 'r' + opts.suffix.replace(/^-r/, ''), note: opts.revision } }) : doc;
  };
  const docs = { stage: ['stage-profile', built.stage], finder: ['finder-profile', built.finder], overhead: ['overhead', built.overhead],
    frontier: ['frontier-phase-a', built.frontier] };
  opts.write.forEach(function (id) {
    C.writeJsonAtomic(repoRoot, path.join(dir, docs[id][0] + opts.suffix + '.json'), stamped(docs[id][1]));
  });
  C.writeJsonAtomic(repoRoot, path.join(dir, 'summary' + opts.suffix + '.json'), slimOf(summary, opts.suffix, opts.write));
  C.writeTextExclusive(repoRoot, path.join(dir, 'summary' + opts.suffix + '.md'), renderSummary(summary));
  process.stdout.write('IG-S07 documents written to ' + C.toPosix(path.relative(repoRoot, dir)) + ' (suffix "' + opts.suffix + '": ' +
    opts.write.join(', ') + ', summary)\n');
  return 0;
}

// --- tests (registered by ig07-test.cjs) ------------------------------------------------------------------------------------------------------------------------

function registerTests(T) {
  const syntheticRecord = function (over) {
    const k = T.fakeClock();
    const rt = PR.create({ now: k.now, techniqueIds: ['nakedSingle', 'xWing', 'nishio'] });
    rt.begin();
    const cfg = rt.api.stepOpen('configure', {});
    k.advance(1);
    rt.api.stepClose(cfg, 'configure');
    rt.api.stepClose(rt.api.stepOpen('buildModel', {}), 'buildModel');
    const grid = rt.api.stepOpen('fullGrid', { attempt: 1 });
    k.advance(4);
    rt.api.stepClose(grid, 'fullGrid');
    const handle = rt.api.solveBegin([{ id: 'nakedSingle' }, { id: 'xWing' }, { id: 'nishio' }]);
    const sample = function (proposal, sampleNo, ms, exact) {
      rt.api.levelEnter({ proposal: proposal, where: { attempt: 1, sample: sampleNo } });
      const dig = rt.api.stepOpen('dig', { attempt: 1, sample: sampleNo });
      const oracle = rt.api.open('stageA.oracle');
      rt.api.iterate(function () {
        let t = handle.t();
        k.advance(ms);
        handle.finder(0, t, null, true, rt.api.c.checks);
        t = handle.t();
        k.advance(ms * 2);
        handle.finder(1, t, null, true, rt.api.c.checks);
        t = handle.t();
        k.advance(ms * 3);
        handle.finder(2, t, {}, true, rt.api.c.checks);
        return 1;
      }, null, null, [], { budget: null }, null);
      rt.api.close(oracle);
      rt.api.stepClose(dig, 'dig');
      const tune = rt.api.stepOpen('tune', {});
      rt.api.sampleResult({ exact: exact, shallow: !exact, rating: { level: 'nightmare', score: 600, solved: true }, clues: 30,
        stats: { groups: 40, tried: 9, accepted: 4, rejected: 5, skipped: 0, oracleCalls: 9 } });
      rt.api.stepClose(tune, 'tune');
    };
    sample(true, 1, 2, false);
    sample(false, 2, 1, false);
    rt.api.localNext();
    sample(false, 12, 1, true);
    const snap = rt.finish();
    const rec = Object.assign({ key: 'IG-S07/m12/mega12:nightmare:3/profiled', shard: 'm12', puzzleVariant: 'mega12', level: 'nightmare', requestSeed: 3,
      cellKind: 'headline', arm: 'prototype', outcome: 'complete', claimedExact: true, verifiedExact: true, profile: snap, profileWorkerRunMs: snap.rootMs,
      generation: { readyWallMs: snap.rootMs + 5, coldWallMs: snap.rootMs + 90, cpuTotalMs: snap.rootMs + 8, cpuResolutionStatus: 'resolved' },
      engineTimingsMs: null, attemptsWork: [{ attempt: 1, ratings: 2, proposals: 5, maxRatings: 1024, maxProposals: 32768, localSearches: [] }],
      firstExactDetail: { origin: 'local-search', ordinal: 12, attempt: 1, kind: 'local' } }, over || {});
    return rec;
  };
  T.add('aggregate.analyse-request', 'aggregate', 'the request analysis partitions the root, splits sample, local and other, and separates covered finders', function () {
    const rec = syntheticRecord();
    const a = analyseRequest(rec, new Set(['nakedSingle']));
    const root = rec.profile.rootMs;
    T.close(a.partition.totalMs, root, 'the partition holds the whole root', 0.01);
    T.close(a.sampleVsLocal.sampleMs + a.sampleVsLocal.localMs + a.sampleVsLocal.otherMs, root, 'sample + local + other = root', 0.01);
    T.equal(a.sampleKinds.local.samples, 1, 'one local sample');
    T.equal([a.sampleKinds.ordinary.samples, a.sampleKinds.proposal.samples], [1, 1], 'sample kinds');
    T.check(a.partition.ms.finderCovered > 0 && a.partition.ms.finderRemaining > a.partition.ms.finderCovered, 'covered and remaining finders are apart');
    T.close(a.partition.ms.finderCovered, 4, 'nakedSingle ms (2+1+1)', 0.01);
    T.equal(a.counters.oracleSolves, a.counters.solves - a.counters.canonicalRates, 'oracle solves exclude ratings');
    T.equal(a.reconciliation.residualMs, 0, 'residual');
  });
  T.add('aggregate.finder-doc-scenarios', 'aggregate', 'finder rows, families and scenarios: negative calls, family-time scenarios, no ceilings, no bias column', function () {
    const rec = syntheticRecord();
    const covered = new Set(['nakedSingle']);
    const a = analyseRequest(rec, covered);
    const techniques = [{ id: 'nakedSingle', group: 'basic', order: 10, baseCost: 1 }, { id: 'xWing', group: 'fish', order: 110, baseCost: 32 },
      { id: 'nishio', group: 'chain', order: 200, baseCost: 140 }];
    const doc = finderDoc(a, techniques, covered, { readySpeedup: 1.01 });
    const ns = doc.finders.find(function (r) { return r.id === 'nakedSingle'; });
    T.equal([ns.s3Covered, ns.calls, ns.hits, ns.hitRate], [true, 3, 0, 0], 'a covered finder with misses only');
    const nishio = doc.finders.find(function (r) { return r.id === 'nishio'; });
    T.equal([nishio.hits, nishio.negativeCallMs], [3, 0], 'a finder that always hits has no negative-call time');
    const s = doc.scenarios;
    T.equal(s.kind, 'conditional zero-cost scenarios', 'labelled as scenarios');
    T.check(s.scenarioNoNegativeCallsRemainingFinders > 1 && s.scenarioNoNegativeCallsAllFinders >= s.scenarioNoNegativeCallsRemainingFinders,
      'scenarios grow with what is removed');
    T.check(s.scenarioNoFinderTime >= s.scenarioNoCoveredFinderTime && s.scenarioNoFinderTime >= s.scenarioNoRemainingFinderTime &&
      s.scenarioNoCoveredFinderTime >= s.scenarioNoNegativeCallsCoveredFinders, 'removing a family\'s whole time is at least removing its negative calls');
    T.equal(s.measuredPartialS3SerialFactor, 1.01, 'the matched IG-S03 serial factor');
    const text = JSON.stringify(doc);
    T.check(!/ceiling|biasAdjusted|negativeScan/i.test(text.replace(/not a ceiling of a full S3/g, '')), 'no ceiling, no bias-adjusted figure, no negative-scan field');
    T.equal(doc.families.map(function (x) { return x.finders.length; }), [1, 2], 'family sizes');
  });
  T.add('aggregate.check-totals', 'aggregate', 'the budget-check totals are marked inexact; an r1 profile has only the derived loop checks', function () {
    const r1 = syntheticRecord();
    delete r1.profile.counters.loopChecks;
    const a = analyseRequest(r1, new Set(['nakedSingle']));
    const t = a.counters.checkTotals;
    T.equal([t.exact, t.loopChecksObserved, t.loopChecksDerived, t.solverChecksTotal], [false, null, a.counters.loopChecksDerived, a.counters.finderChecks + a.counters.loopChecksDerived],
      'r1 profile: derived, inexact');
    T.check(/INEXACT/.test(t.exactness) && /ctx\.check\(\)/.test(t.exactness) && /nishio/.test(t.exactness), 'the reasons are stated');
    const observed = checkTotalsOf(Object.assign({}, a.counters, { loopChecks: 7 }));
    T.equal([observed.exact, observed.loopChecksObserved, observed.solverChecksTotal], [false, 7, a.counters.finderChecks + 7], 'an observed count is used, still short of the chain propagation checks');
  });
  T.add('aggregate.overhead', 'aggregate', 'overhead ratios against a same-command arm and a missing comparator', function () {
    const prof = syntheticRecord({ cellKind: 'control', shard: 'killer-h', puzzleVariant: 'killer', level: 'hard', requestSeed: 1, key: 'IG-S07/killer-h/killer:hard:1/profiled',
      profileCalibration: { clockReadNs: 30, finderTimerPairNs: 80, applyTimerNs: 70, framePairNs: 120, countedCheckNs: 4, counterIncrementNs: 1 } });
    prof.generation.readyWallMs = 1100;
    prof.generation.cpuTotalMs = 1150;
    const plain = { key: 'IG-S07/killer-h/killer:hard:1/unprofiled', shard: 'killer-h', arm: 'reference', cellKind: 'control', outcome: 'complete',
      generation: { readyWallMs: 1000, coldWallMs: 1100, cpuTotalMs: 1040, cpuResolutionStatus: 'resolved' }, digests: {} };
    prof.generation.cpuResolutionStatus = 'resolved';
    const doc = overheadDoc([plain, prof], C.DEFAULT_REPO_ROOT);
    T.equal(doc.rows.length, 1, 'one profiled row');
    T.equal([doc.rows[0].readyWallRatio, doc.rows[0].overheadReadyWallPercent], [1.1, 10], 'ratio and percentage');
    T.check(doc.rows[0].estimatedInstrumentationMs > 0, 'the estimate uses the calibration');
    const none = overheadDoc([prof], C.DEFAULT_REPO_ROOT);
    T.equal(none.rows[0].readyWallRatio, null, 'no comparator: no ratio, never infinity');
  });
  T.add('aggregate.smoke', 'aggregate', 'the documents build and render from whatever evidence exists (nothing is written)', function () {
    const built = build(C.DEFAULT_REPO_ROOT, 'provisional-r1');
    const summary = buildSummary(C.DEFAULT_REPO_ROOT, 'provisional-r1', built, null);
    const text = renderSummary(summary);
    T.check(/## Where the time goes/.test(text) && /## Acceptance/.test(text), 'the sections are rendered');
    T.check(!/undefined|NaN|Infinity/.test(text), 'no undefined, NaN or Infinity in the markdown');
    T.check(!/(?<!\r)\n/.test(text) && /\r\n$/.test(text) && !/[ \t]+\r\n/.test(text), 'CRLF, final newline, no trailing whitespace');
    T.equal(summary.registry.registered === 0 || summary.registry.registered === 26, true, 'the registry has 26 techniques when a catalogue is recorded');
    JSON.stringify(slimOf(summary, ''));
  });
  T.add('aggregate.frontier-shape', 'aggregate', 'the frontier phase-A document reads the IG-S05 ledgers: F1 against FC and FM, three kinds of zero yield', function () {
    const doc = frontierDoc(C.DEFAULT_REPO_ROOT, 'provisional-r1');
    T.check(doc.source.startedTrials === 256, 'all 256 trials of the screen: ' + doc.source.startedTrials);
    ['classic9', 'mega12', 'mega16', 'samurai'].forEach(function (cell) {
      ['F1', 'FC', 'FM'].forEach(function (mode) {
        const row = doc.rows.find(function (r) { return r.cell === cell && r.mode === mode; });
        T.check(row && row.samples > 0, cell + ' ' + mode + ' has samples');
        T.check(row.wallMs.phaseAShareOfSample >= 0 && row.wallMs.phaseAShareOfSample <= 1, 'a share');
        T.check(row.floorTests.unclassifiedTests >= 0 && row.floorTests.tests === row.floorTests.acceptedFull + row.floorTests.acceptedS2 +
          row.floorTests.refusedStuckUnique + row.floorTests.refusedStuckUnknown + row.floorTests.refusedAmbiguous + row.floorTests.unclassifiedTests,
        cell + ' ' + mode + ': floor tests = accepted + refused + unclassified (cut by the budget)');
      });
    });
    const c9 = doc.rows.find(function (r) { return r.cell === 'classic9' && r.mode === 'F1'; });
    T.equal(c9.outcomes.emptyFrontier, 16, 'classic9 F1: every sample has an empty frontier');
    const m16 = doc.rows.find(function (r) { return r.cell === 'mega16' && r.mode === 'F1'; });
    T.check(m16.outcomes.budgetEnded > 0, 'mega16 F1 has budget-ended searches, apart from the empty frontiers');
    T.check(doc.limits.length === 4 && /not per-purpose/.test(doc.limits[0]), 'the limits are stated');
  });
}

module.exports = { analyseRequest, finderDoc, overheadDoc, frontierDoc, build, buildSummary, renderSummary, registerTests, s3Coverage, serialFactors,
  chainRecords, REPORT_ANCHORS, PARTS, statOf };

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    process.stderr.write('IG error [' + (err && err.code ? err.code : 'unexpected') + ']: ' + (err && err.message ? err.message : String(err)) + '\n');
    process.exitCode = C.exitCodeOf(err);
  }
}
