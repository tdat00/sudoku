'use strict';

/*
 * IG-S03 task summary across the shards (test side, provisional (pre-freeze)): reads evidence only, no engine. It writes
 * `parity.json`, `check-sequences.json`, `coverage.json` and `summary.json/md` once under <round>/IG-S03/ (the shard
 * records are never modified).
 *
 * Three speed-ups are reported separately, per cell, next to the report's estimates and never merged:
 *   serial S3        IG-S02 native-w1  /  scoped-native-w1          (S3 alone against today; six requests, n = 1 per cell)
 *   incremental S3   IG-S02 attempts-w4 /  scoped-attempts-w4       (S3 over the pool; three requests per cell)
 *   combined         IG-S02 native-w1  /  scoped-attempts-w4        (pool plus S3)
 * The baselines are IG-S02's records (summary-r2: the Killer audit overlay), reused with the author's approval; nothing
 * is rerun. CPU, speculation and the early-exact regressions stay in the record. Tails at n = 3 are descriptive. The S3
 * of this prototype is PARTIAL (singles and subsets only): its measured gain is not the full-S3 forecast of the report.
 */
const fs = require('fs');
const path = require('path');
const C = require('./common.cjs');
const R = require('./records.cjs');
const AG = require('./aggregate.cjs');
const RUN = require('./run.cjs');
const SM = require('./scoped-solver.cjs');
const PLAN = require('./plans/ig-s03.cjs');

const TASK = 'IG-S03';
const BASELINE_SUMMARY = 'docs/improve-generating/evidence/phase0/provisional-r1/IG-S02/summary-r2.json';

// The report's anchors: the S3 factor "x 1.3 - 1.65 on solve work (1.0 - 2.75)" (report section 5) and, per cell, IG-S02's
// S5a factor; the combined planning range is their product. Planning anchors, never acceptance thresholds.
const S3_REPORT = Object.freeze({ low: 1.3, high: 1.65, wide: [1.0, 2.75] });
const S5A_REPORT = Object.freeze({ mega16: [1.7, 1.8], mega12: [2.8, 3.0], samurai: [1.7, 1.8], classic9: [2.8, 3.0],
  killer: [2.8, 3.0], greaterThan: [2.8, 3.0] });
const CELL_ORDER = Object.freeze(['mega16', 'mega12', 'samurai', 'classic9', 'killer', 'greaterThan']);
const SETS = Object.freeze(['canonical', 'floor', 'oracle', 'proposal']);

// Reporting changes of each revision after the first (no run, no machine time: the evidence is read as it is).
const REVISION_CHANGES = Object.freeze({
  'summary-r2': Object.freeze(['adds the serial request mega16:3 (shard ser-m16), the approved machine time and the B03 ' +
    'wording of the criterion']),
  'summary-r3': Object.freeze([
    'verdict wording: "no material net gain observed on this cohort" replaces the earlier wording and its unexplained 5 % ' +
      'rule; what the verdict does and does not say is stated explicitly',
    'early-exact list: only requests with firstExactOrdinal = 1 (the earlier list also held first exacts at attempts 4 and 6)',
    'B02 counts the 24 request identities apart from the 19 audit jobs (the earlier text said 43)',
    'SM4 scope statement added; the multi-check disclosure is kept'])
});

// The families of the task: which finders are implemented, and the proof obligations of IG-S-Q03.
const FAMILIES = Object.freeze([
  { family: 'singles', ids: ['nakedSingle'], scope: 'cell', checks: false,
    obligation1: 'no ctx.check() call at all; the result depends only on the value and candidates of the cell',
    obligation2: 'not applicable: the finder makes no check, so no budget error can interrupt it' },
  { family: 'singles', ids: ['hiddenSingleBox', 'hiddenSingleLine'], scope: 'unit', checks: false,
    obligation1: 'no ctx.check() call at all; the result depends only on the values and candidates of the unit cells and ' +
      'completeUnits[u] (fixed for a solve)',
    obligation2: 'not applicable: the finder makes no check, so no budget error can interrupt it' },
  { family: 'subset', ids: ['nakedPair', 'hiddenPair', 'nakedTriple', 'hiddenTriple', 'nakedQuad', 'hiddenQuad'],
    scope: 'unit', checks: true,
    obligation1: 'one entry check per unit plus one per CHECK_EVERY nodes of a counter that spans the units: the check ' +
      'count of a scope is NOT a function of its footprint alone, but its node increment is; the checks are replayed ' +
      'from the cached increment and the incoming residue (floor((r+inc)/CHECK_EVERY) - floor(r/CHECK_EVERY))',
    obligation2: 'nothing reads the scratch of an interrupted scan (tech-subset.js re-initialises it by every find and ' +
      'unit, and no handler wraps a subset finder: the only handler that swallows budget.exceeded is tech-chain.js, inside ' +
      'its own find); a negative is recorded only after a completed scan, never when a check threw' }
]);

const NATIVE_REASONS = Object.freeze({
  locked: 'outside the fixed design (item 1 lists singles and the six subset finders); no ctx.check() site, a ' +
    'negative cache is provable but not part of this prototype',
  fish: 'outside the fixed design; has ctx.check() sites, no proof attempted',
  wing: 'outside the fixed design; has ctx.check() sites on counters that are not unit-local, no proof attempted',
  chain: 'outside the fixed design; its find swallows budget.exceeded (obligation 2 would need a proof about its trial ' +
    'state), no proof attempted',
  cage: 'outside the fixed design; has ctx.check() sites, no proof attempted',
  ineq: 'outside the fixed design; has ctx.check() sites, no proof attempted'
});

function parseArgs(argv) {
  const opts = { task: TASK, round: null, out: 'summary' };
  argv.forEach(function (arg) {
    const m = /^--([a-z]+)=(.*)$/.exec(arg);
    if (!m || ['task', 'round', 'out'].indexOf(m[1]) < 0) throw new C.HarnessError('args', 'unknown argument ' + arg);
    opts[m[1]] = m[2];
  });
  if (opts.task !== TASK) throw new C.HarnessError('args', 'this summary is for ' + TASK);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(opts.round || '')) throw new C.HarnessError('args', 'missing or bad --round');
  return opts;
}

function ms(x) {
  return typeof x === 'number' && Number.isFinite(x) ? x : null;
}

function s(x) {
  return typeof x === 'number' && Number.isFinite(x) ? Math.round(x / 10) / 100 : null;
}

function armRow(rec) {
  if (!rec) return null;
  const g = rec.generation || {};
  const pool = rec.pool || null;
  return {
    outcome: rec.outcome,
    claimedExact: rec.claimedExact,
    verifiedExact: rec.verifiedExact,
    readyWallMs: ms(g.readyWallMs),
    coldWallMs: ms(g.coldWallMs),
    cpuTotalMs: ms(g.cpuTotalMs),
    cpuResolutionStatus: g.cpuResolutionStatus === undefined ? null : g.cpuResolutionStatus,
    attemptsUsed: rec.attemptsUsed === undefined ? null : rec.attemptsUsed,
    puzzleHash: rec.puzzleHash,
    pool: pool ? { attemptsStarted: pool.attemptsStarted, attemptsConsumed: pool.attemptsConsumed,
      attemptsSpeculative: pool.attemptsSpeculative, peakActive: pool.peakActive, meanBusyLanes: pool.meanBusyLanes,
      firstExactOrigin: pool.firstExactOrigin, firstExactOrdinal: pool.firstExactOrdinal } : null
  };
}

// The IG-S02 baseline arm views, from its task summary (summary-r2: the Killer audit overlay applied).
function baselineArm(view) {
  if (!view) return null;
  return { outcome: view.outcome, claimedExact: view.claimedExact, verifiedExact: view.verifiedExact,
    readyWallMs: ms(view.readyWallMs), coldWallMs: ms(view.coldWallMs), cpuTotalMs: ms(view.cpuTotalMs),
    cpuResolutionStatus: view.cpuResolutionStatus, attemptsUsed: view.attemptsUsed, puzzleHash: view.puzzleHash,
    pool: view.pool ? { attemptsStarted: view.pool.attemptsStarted, attemptsConsumed: view.pool.attemptsConsumed,
      attemptsSpeculative: view.pool.attemptsSpeculative, peakActive: view.pool.peakActive,
      meanBusyLanes: view.pool.meanBusyLanes, firstExactOrigin: view.pool.firstExactOrigin,
      firstExactOrdinal: view.pool.firstExactOrdinal } : null };
}

function usable(a) {
  return !!a && a.outcome === 'complete' && a.readyWallMs !== null;
}

function cpuOk(a, b) {
  return R.usable(a.cpuResolutionStatus) && R.usable(b.cpuResolutionStatus);
}

/**
 * One row per request: the IG-S02 baselines (native-w1, attempts-w4) next to the scoped arms. A factor needs two completed,
 * resolved arms; a censored or unverified arm shows its timing but proves neither identity nor speed.
 */
function buildRows(baselinePairs, scopedPool, scopedSerial) {
  const rows = [];
  baselinePairs.forEach(function (bp) {
    const native = baselineArm(bp.native);
    const pooled = baselineArm(bp.pooled);
    const pool = armRow(scopedPool.get(bp.pairId));
    const serial = armRow(scopedSerial.get(bp.pairId));
    const row = { pairId: bp.pairId, cell: bp.cell, seed: bp.seed, baselineNative: native, baselinePooled: pooled,
      scopedPool: pool, scopedSerial: serial, serial: null, incremental: null, combined: null };
    if (serial && usable(native) && usable(serial)) {
      row.serial = { readySpeedup: R.ratio(native.readyWallMs, serial.readyWallMs),
        coldSpeedup: R.ratio(native.coldWallMs, serial.coldWallMs),
        cpuRatio: cpuOk(native, serial) ? R.ratio(serial.cpuTotalMs, native.cpuTotalMs) : null };
    }
    if (pool && usable(pooled) && usable(pool)) {
      row.incremental = { readySpeedup: R.ratio(pooled.readyWallMs, pool.readyWallMs),
        coldSpeedup: R.ratio(pooled.coldWallMs, pool.coldWallMs),
        cpuRatio: cpuOk(pooled, pool) ? R.ratio(pool.cpuTotalMs, pooled.cpuTotalMs) : null };
    }
    if (pool && usable(native) && usable(pool)) {
      row.combined = { readySpeedup: R.ratio(native.readyWallMs, pool.readyWallMs),
        coldSpeedup: R.ratio(native.coldWallMs, pool.coldWallMs),
        cpuRatio: cpuOk(native, pool) ? R.ratio(pool.cpuTotalMs, native.cpuTotalMs) : null };
    }
    row.earlyExact = !!(pooled && pooled.pool && pooled.pool.firstExactOrdinal === 1);
    rows.push(row);
  });
  return rows;
}

function describeFactor(rows, pick) {
  const values = rows.map(pick).filter(function (v) { return typeof v === 'number' && Number.isFinite(v); });
  return Object.assign(R.describe(values), { min: values.length ? Math.min.apply(null, values) : null,
    max: values.length ? Math.max.apply(null, values) : null });
}

const NO_MATERIAL_GAIN = 'no material net gain observed on this cohort';

function verdictFor(factor, low, high) {
  if (factor.n === 0) return 'inconclusive: no completed, resolved pair';
  if (factor.upperMedian !== null && factor.upperMedian >= low) {
    return 'within or above the planning range (median ' + factor.upperMedian.toFixed(2) + ' >= ' + low.toFixed(2) + ')';
  }
  if (factor.max !== null && factor.max < 1) {
    return NO_MATERIAL_GAIN + ': slower than the baseline in every observed pair (max ' + factor.max.toFixed(2) + ')';
  }
  const med = factor.upperMedian === null ? 'n/a' : factor.upperMedian.toFixed(2);
  if (factor.upperMedian !== null && factor.upperMedian < 1) {
    return NO_MATERIAL_GAIN + ': median ' + med + ' < 1, below the planning range (' + low.toFixed(2) + ')';
  }
  return 'below the planning range (median ' + med + ' < ' + low.toFixed(2) + '): ' + NO_MATERIAL_GAIN;
}

/** What the verdict does and does not say (author's review, revision r3). `natives` = the families left native. */
function verdictStatements(natives) {
  return [
    'This PARTIAL S3 (naked/hidden singles and the six subset finders only) does NOT supply the report\'s 1.3-1.65x on ' +
      'solve work: ' + NO_MATERIAL_GAIN + '.',
    'It does NOT refute full S3: the other ' + natives + ' techniques (the locked, fish, wing, chain, cage and inequality ' +
      'families: pointing, box/line, fish, wings, chains, cages and inequalities) stay native full scans, and neither their ' +
      'cost nor the cache-overhead attribution (the per-solve state, the invalidation, the skipped-scope loops against the ' +
      'native scans they replace) was measured here.',
    'SM1 (IG-S07) is still needed to locate where the solver time of a Nightmare request goes and therefore what any S3 ' +
      'could save.'
  ];
}

function sm4Statement(requests, puzzles) {
  return 'SM4 is sufficient for these families on this runtime (naked and hidden singles, the six naked/hidden ' +
    'pair/triple/quad finders): the footprint and invalidation arguments (a scope\'s result and node increment depend only ' +
    'on its cells; a placement dirties the cell and its peers) and the scratch-use argument (no handler reads an interrupted ' +
    'scan; a negative is recorded only after a completed scan), together with the trace evidence (every check-site token, ' +
    'step and rating equal on ' + puzzles + ' saved puzzles in four solver sets, ' + requests + ' request identities) and the ' +
    'forced-boundary evidence (injected count failures at the first, middle, last and skipped-scope boundary checks, and ' +
    'boundary-injected real ceilings). This is a statement about this runtime and this population, not a certification of ' +
    'the frozen source: the frozen rerun repeats it on the frozen catalogue.';
}

function cellSummaries(rows) {
  return CELL_ORDER.map(function (cell) {
    const mine = rows.filter(function (r) { return r.cell === cell; });
    const s5a = S5A_REPORT[cell];
    const serial = describeFactor(mine, function (r) { return r.serial ? r.serial.readySpeedup : null; });
    const incremental = describeFactor(mine, function (r) { return r.incremental ? r.incremental.readySpeedup : null; });
    const combined = describeFactor(mine, function (r) { return r.combined ? r.combined.readySpeedup : null; });
    const combinedLow = s5a[0] * S3_REPORT.low;
    const combinedHigh = s5a[1] * S3_REPORT.high;
    const spec = function (rowsOf, pick) { return rowsOf.map(pick).filter(function (a) { return a; }); };
    const pooled = spec(mine, function (r) { return r.scopedPool; });
    return {
      cell: cell,
      requests: mine.length,
      report: { s3: [S3_REPORT.low, S3_REPORT.high], s3Wide: S3_REPORT.wide, s5a: s5a,
        combinedProduct: [Math.round(combinedLow * 100) / 100, Math.round(combinedHigh * 100) / 100] },
      serial: { factor: serial, coldFactor: describeFactor(mine, function (r) { return r.serial ? r.serial.coldSpeedup : null; }),
        cpuRatio: describeFactor(mine, function (r) { return r.serial ? r.serial.cpuRatio : null; }),
        verdict: mine.some(function (r) { return r.scopedSerial; }) ? verdictFor(serial, S3_REPORT.low, S3_REPORT.high) :
          'not run: the serial request is unstarted (machine-time allocation exhausted, see the machine section)' },
      incremental: { factor: incremental,
        coldFactor: describeFactor(mine, function (r) { return r.incremental ? r.incremental.coldSpeedup : null; }),
        cpuRatio: describeFactor(mine, function (r) { return r.incremental ? r.incremental.cpuRatio : null; }),
        verdict: verdictFor(incremental, S3_REPORT.low, S3_REPORT.high) },
      combined: { factor: combined,
        coldFactor: describeFactor(mine, function (r) { return r.combined ? r.combined.coldSpeedup : null; }),
        cpuRatio: describeFactor(mine, function (r) { return r.combined ? r.combined.cpuRatio : null; }),
        verdict: verdictFor(combined, combinedLow, combinedHigh) },
      earlyExactRegressions: mine.filter(function (r) { return r.earlyExact; }).map(function (r) {
        return { pairId: r.pairId, firstExactOrigin: r.baselinePooled.pool.firstExactOrigin,
          firstExactOrdinal: r.baselinePooled.pool.firstExactOrdinal,
          baselinePoolVsNative: usable(r.baselinePooled) && usable(r.baselineNative) ?
            R.ratio(r.baselineNative.readyWallMs, r.baselinePooled.readyWallMs) : null,
          serial: r.serial ? r.serial.readySpeedup : null,
          incremental: r.incremental ? r.incremental.readySpeedup : null,
          combined: r.combined ? r.combined.readySpeedup : null,
          regression: !!(r.combined && r.combined.readySpeedup !== null && r.combined.readySpeedup < 1) };
      }),
      verifiedExact: { baselineNative: mine.filter(function (r) {
        return r.baselineNative && r.baselineNative.verifiedExact === true; }).length,
      scopedPool: pooled.filter(function (a) { return a.verifiedExact === true; }).length },
      speculation: mine.map(function (r) {
        const b = r.baselinePooled && r.baselinePooled.pool;
        const p = r.scopedPool && r.scopedPool.pool;
        return { pairId: r.pairId, baselineStarted: b ? b.attemptsStarted : null, baselineConsumed: b ? b.attemptsConsumed : null,
          scopedStarted: p ? p.attemptsStarted : null, scopedConsumed: p ? p.attemptsConsumed : null };
      })
    };
  });
}

// --- S3 counters --------------------------------------------------------------------------------------------------------

function addCounters(into, row) {
  Object.keys(row).forEach(function (k) { into[k] = (into[k] || 0) + row[k]; });
}

function totalsOfStats(statsList) {
  const finders = {};
  const solve = {};
  const fallbackReasons = {};
  let violations = 0;
  statsList.forEach(function (st) {
    Object.keys(st.finders).forEach(function (id) {
      if (!finders[id]) finders[id] = {};
      addCounters(finders[id], st.finders[id]);
    });
    addCounters(solve, st.solve);
    addCounters(fallbackReasons, st.fallbackReasons);
    violations += st.violations.count !== undefined ? st.violations.count : st.violations;
  });
  return { finders: finders, solve: solve, fallbackReasons: fallbackReasons, violations: violations };
}

function auditStats(auditRecords) {
  const list = [];
  auditRecords.forEach(function (rec) {
    if (rec.audit.kind !== 'puzzle') return;
    SETS.forEach(function (name) {
      const set = rec.audit.sets[name];
      if (set && set.stats) list.push(set.stats);
    });
  });
  return list;
}

function timingStats(records) {
  const list = [];
  records.forEach(function (rec) {
    if (rec.scoped && rec.scoped.messages > 0) {
      list.push({ finders: rec.scoped.finders, solve: rec.scoped.solve, fallbackReasons: rec.scoped.fallbackReasons,
        violations: { count: rec.scoped.violations } });
    }
  });
  return list;
}

function coverageDoc(catalogue, auditTotals, timingTotals, auditRecords) {
  const techniques = catalogue ? catalogue.techniques : [];
  const implemented = new Set();
  FAMILIES.forEach(function (f) { f.ids.forEach(function (id) { implemented.add(id); }); });
  const families = [];
  FAMILIES.forEach(function (fam) {
    fam.ids.forEach(function (id) {
      const a = auditTotals.finders[id] || {};
      const t = timingTotals.finders[id] || {};
      const pick = function (o) {
        return { calls: o.calls || 0, scopesVisited: o.scopesVisited || 0, realScopes: o.realScopes || 0,
          negativeScopesRecorded: o.negativeRecorded || 0, positiveScopes: o.positiveScopes || 0,
          skippedScopes: o.skippedScopes || 0, enumNodesReal: o.enumNodesReal || 0,
          enumNodesSkipped: o.enumNodesSkipped || 0, realEntryChecks: o.realEntryChecks || 0,
          virtualEntryChecks: o.virtualEntryChecks || 0, realNodeChecks: o.realNodeChecks || 0,
          virtualNodeChecks: o.virtualNodeChecks || 0, nativeFallbackCalls: o.nativeFallbackCalls || 0 };
      };
      const exercised = (a.skippedScopes || 0) > 0;
      families.push({ id: id, family: fam.family, scope: fam.scope, implemented: true, nonzeroCheckFamily: fam.checks,
        proofObligation1: fam.obligation1, proofObligation2: fam.obligation2,
        status: exercised ? 'proved + exercised (skipped scopes under audit)' : 'proved, not exercised by the audit population',
        fallbackToFullScan: false, audit: pick(a), timing: pick(t) });
    });
  });
  const natives = techniques.filter(function (t) { return !implemented.has(t.id); }).map(function (t) {
    return { id: t.id, group: t.group, implemented: false, fallbackToFullScan: true,
      fallbackReason: NATIVE_REASONS[t.group] || 'outside the fixed design' };
  });
  const virtualChecks = function (totals) {
    let entry = 0;
    let node = 0;
    Object.keys(totals.finders).forEach(function (id) {
      entry += totals.finders[id].virtualEntryChecks || 0;
      node += totals.finders[id].virtualNodeChecks || 0;
    });
    return { virtualEntryChecks: entry, virtualNodeChecks: node };
  };
  return {
    schema: C.SCHEMA,
    task: TASK,
    evidenceStatus: C.EVIDENCE_PROVISIONAL,
    implemented: Array.from(implemented),
    families: families,
    nativeFullScan: natives,
    runtimeFallbacks: { audit: auditTotals.fallbackReasons, timing: timingTotals.fallbackReasons },
    invalidations: { audit: { cellsInvalidated: auditTotals.solve.cellsInvalidated || 0,
      unitsInvalidated: auditTotals.solve.unitsInvalidated || 0, solves: auditTotals.solve.solvesBegun || 0,
      steps: auditTotals.solve.stepsApplied || 0 },
    timing: { cellsInvalidated: timingTotals.solve.cellsInvalidated || 0,
      unitsInvalidated: timingTotals.solve.unitsInvalidated || 0, solves: timingTotals.solve.solvesBegun || 0,
      steps: timingTotals.solve.stepsApplied || 0 } },
    virtualCheckCharges: { audit: virtualChecks(auditTotals), timing: virtualChecks(timingTotals) },
    scopeAuditViolations: { audit: auditTotals.violations, timing: timingTotals.violations },
    note: 'a family without a proof stays a native full scan; a family that has a proof but whose skipped scopes were not ' +
      'exercised is named as such. Raw enumeration visits are enumeration nodes (the unit of tech-subset.js `nodes`).',
    auditPuzzles: auditRecords.filter(function (r) { return r.audit.kind === 'puzzle'; }).length
  };
}

// --- parity and check sequences -----------------------------------------------------------------------------------------

function parityDoc(auditRecords, identity) {
  const synthetic = auditRecords.find(function (r) { return r.audit.kind === 'synthetic'; }) || null;
  const puzzles = auditRecords.filter(function (r) { return r.audit.kind === 'puzzle'; }).map(function (r) {
    const sets = {};
    SETS.forEach(function (name) {
      const set = r.audit.sets[name];
      if (!set) return;
      const fails = set.failures || [];
      sets[name] = { checks: set.checks, steps: set.steps, status: set.status, tokenHash: set.tokenHash,
        unlimitedEqual: set.unlimited.equal, failuresTested: fails.length, failuresEqual: set.failuresEqual,
        failuresWithError: fails.filter(function (f) { return !f.reference.completed; }).length,
        boundaryInjected: fails.filter(function (f) { return f.form !== 'native' && !f.natural; }).length,
        naturalBinding: fails.filter(function (f) { return f.natural && !f.reference.completed; }).map(function (f) {
          return { form: f.form, ordinal: f.reference.ordinal, equal: f.equal }; }),
        skipped: set.skipped };
    });
    return { key: r.key, cell: r.audit.cell, seed: r.audit.seed, variant: r.audit.variantId, level: r.audit.level,
      puzzleFile: r.audit.puzzleFile, puzzleFileSha256: r.audit.puzzleFileSha256, verdict: r.audit.verdict,
      problems: r.audit.problems, sets: sets };
  });
  const perSet = {};
  SETS.forEach(function (name) {
    perSet[name] = { puzzles: 0, unlimitedEqual: 0, failuresTested: 0, failuresEqual: 0, checks: 0 };
    puzzles.forEach(function (p) {
      if (!p.sets[name]) return;
      const x = perSet[name];
      x.puzzles++;
      if (p.sets[name].unlimitedEqual) x.unlimitedEqual++;
      x.failuresTested += p.sets[name].failuresTested;
      x.checks += p.sets[name].checks;
      if (p.sets[name].failuresEqual) x.failuresEqual += p.sets[name].failuresTested;
    });
  });
  return {
    schema: C.SCHEMA,
    task: TASK,
    evidenceStatus: C.EVIDENCE_PROVISIONAL,
    synthetic: synthetic ? { key: synthetic.key, verdict: synthetic.audit.verdict, problems: synthetic.audit.problems,
      scenarios: synthetic.audit.scenarios, mutations: synthetic.audit.mutations, restored: synthetic.audit.restored,
      coverage: synthetic.audit.coverage, adapters: synthetic.audit.adapters } : null,
    puzzles: puzzles,
    perSet: perSet,
    verdicts: { ok: puzzles.filter(function (p) { return p.verdict === 'parity-ok'; }).length,
      failed: puzzles.filter(function (p) { return p.verdict !== 'parity-ok'; }).length },
    requestIdentity: identity,
    note: 'boundary-injected = a count failure placed at the real ceiling (100,000 objective, 30,000 Killer rating) by ' +
      'controlled precharge, NOT a naturally binding measurement; naturally binding captured cases are listed apart'
  };
}

function sequencesDoc(auditRecords) {
  const entries = [];
  auditRecords.filter(function (r) { return r.audit.kind === 'puzzle'; }).forEach(function (r) {
    SETS.forEach(function (name) {
      const set = r.audit.sets[name];
      if (!set) return;
      entries.push({ key: r.key, set: name, checks: set.checks, steps: set.steps, tokenHash: set.tokenHash,
        stepsDigest: set.stepsDigest, reportDigest: set.reportDigest, first: set.first, last: set.last,
        checkpoints: set.checkpoints, boundaries: set.boundaries, ordinals: set.ordinals,
        failures: set.failures.map(function (f) {
          return { form: f.form, natural: f.natural, k: f.k, equal: f.equal, reference: f.reference, scoped: f.scoped,
            problems: f.problems };
        }) });
    });
  });
  return { schema: C.SCHEMA, task: TASK, evidenceStatus: C.EVIDENCE_PROVISIONAL, entries: entries,
    note: 'each entry: the unlimited check sequence (count, token hash, first/last windows, checkpoint hashes) and every ' +
      'injected failure with the reference and the scoped outcome (error fields without wall-clock, ordinal, site token, ' +
      'steps applied, guard state)' };
}

// --- summary ------------------------------------------------------------------------------------------------------------

function load(repoRoot, round) {
  const got = AG.collect(repoRoot, TASK, round);
  const records = [];
  got.shards.forEach(function (sh) { records.push.apply(records, sh.records); });
  const baselineFile = path.join(repoRoot, ...BASELINE_SUMMARY.split('/'));
  const baseline = C.readJson(baselineFile);
  return { got: got, records: records, baseline: baseline, baselineSha256: C.sha256(fs.readFileSync(baselineFile)) };
}

function build(repoRoot, round, loaded) {
  const data = loaded || load(repoRoot, round);
  const records = data.records;
  const audits = records.filter(function (r) { return r.audit && r.outcome === 'complete'; });
  const scopedPool = new Map();
  const scopedSerial = new Map();
  records.forEach(function (r) {
    if (r.arm !== 'prototype') return;
    const pairId = r.pairId;
    if (r.solverMode === 'scoped-attempts-w4') scopedPool.set(pairId, r);
    else if (r.solverMode === 'scoped-native-w1') scopedSerial.set(pairId, r);
  });
  const rows = buildRows(data.baseline.pairs, scopedPool, scopedSerial);
  const cells = cellSummaries(rows);
  const identity = require('./ig03-run.cjs').identity(records);
  const catalogueCommand = data.got.shards.map(function (sh) {
    return sh.commands.find(function (c) { return c.catalogueSnapshot; });
  }).find(Boolean);
  const catalogue = catalogueCommand ? catalogueCommand.catalogueSnapshot : null;
  const coverage = coverageDoc(catalogue, totalsOfStats(auditStats(audits)),
    totalsOfStats(timingStats(records.filter(function (r) { return r.arm === 'prototype'; }))), audits);
  const parity = parityDoc(audits, identity);
  const sequences = sequencesDoc(audits);
  const commands = [];
  data.got.shards.forEach(function (sh) { sh.commands.forEach(function (c) { commands.push(c); }); });
  const latest = data.got.shards.map(function (sh) { return sh.commands[sh.commands.length - 1]; }).filter(Boolean);
  const uniq = function (list) { return Array.from(new Set(list)); };
  const planned = data.got.manifest.jobs.length;
  const byKey = new Map(records.map(function (r) { return [r.key, r]; }));
  const outcome = function (list) {
    return data.got.manifest.jobs.filter(function (j) {
      const r = byKey.get(j.key);
      return r && list.indexOf(r.outcome) >= 0;
    }).length;
  };
  const timingRecords = records.filter(function (r) { return r.arm === 'prototype'; });
  const noAuditInTiming = timingRecords.every(function (r) {
    return (r.adapterIds || []).indexOf('scoped-audit') < 0;
  });
  const synthetic = parity.synthetic;
  const acceptance = acceptanceOf({ parity: parity, coverage: coverage, identity: identity, rows: rows,
    timingRecords: timingRecords, noAuditInTiming: noAuditInTiming, planned: planned,
    completed: outcome(['complete']) });
  let multiTotal = 0;
  let maxChecks = 0;
  let natural = 0;
  parity.puzzles.forEach(function (p) {
    Object.keys(p.sets).forEach(function (n) {
      const st = p.sets[n];
      if (st.skipped) multiTotal += st.skipped.multi || 0;
      maxChecks = Math.max(maxChecks, st.checks);
      natural += st.naturalBinding.length;
    });
  });
  const serialMissing = CELL_ORDER.filter(function (cell) {
    return !rows.some(function (r) { return r.cell === cell && r.scopedSerial; }) &&
      PLAN.SERIAL.some(function (x) { return x.cell === cell; });
  });
  const limitations = [
    'multi-check scopes: ' + multiTotal + ' skipped scopes of the saved puzzles and ' + (synthetic && synthetic.coverage ?
      synthetic.coverage.multiCheckScopes : 'n/a') + ' of the synthetic states charged two or more virtual node checks ' +
      '(the units of these boards enumerate fewer than 512 nodes per scan); the crossing of the cadence with different ' +
      'incoming residues IS exercised at engine level, the replay of several checks in one scope only by the engine-free tests ' +
      'of scoped-test.cjs on the same runtime code (every ordinal of scripts with multi-check scopes is swept there)',
    'no solve of the audit population reached a real ceiling by itself: the longest has ' + maxChecks + ' checks (ceilings: ' +
      '100,000 objective, 30,000 Killer rating); naturally binding captured cases: ' + natural + '. Every ceiling case is ' +
      'boundary-injected by controlled precharge',
    'the focused engine-free tests (per-solve isolation, budget-error cleanup, mutations on a fake of the engine pieces) ran ' +
      'outside the wrapper because they load no engine and time nothing; their transcript is kept beside this summary',
    'S3 counters of a pooled request cover the pipeline runs that finished in its workers (consumed and speculative ' +
      'completed attempts); an attempt terminated before its end reports none',
    serialMissing.length > 0 ? 'serial S3 not measured for ' + serialMissing.join(', ') + ': the request is unstarted, the ' +
      'machine-time allocation (22 min) was exhausted; the scoped-pool, audit and the other five serial rows are complete' : null
  ].filter(Boolean);
  return {
    schema: C.SCHEMA,
    task: TASK,
    round: round,
    evidenceStatus: round === C.ROUND_FROZEN ? C.EVIDENCE_FROZEN : C.EVIDENCE_PROVISIONAL,
    provisionalNotice: R.PROVISIONAL_NOTICE,
    formalGate: round === C.ROUND_FROZEN ? 'see the command gate' : 'not-evaluable-pre-freeze',
    scope: 'PARTIAL S3: negative scans of naked/hidden singles and the six subset finders only (pointing, box/line, fish, ' +
      'wings, chains, cages and inequalities stay native). It does not supply the report\'s 1.3-1.65x and does not refute ' +
      'full S3 (see "What the verdict means").',
    baseline: { file: BASELINE_SUMMARY, sha256: data.baselineSha256, note: 'IG-S02 summary-r2 (Killer audit overlay); ' +
      'generation baselines of harness dd759a22 reused with the author\'s approval, nothing rerun' },
    coverage: { plannedKeys: planned, completed: outcome(['complete']), censored: outcome(['request-timeout']),
      errors: outcome(['error']), validationUnknown: outcome(['validation-unknown']),
      shards: data.got.shards.map(function (sh) {
        return { shard: sh.shard, status: sh.status, attempts: sh.chain, unstarted: sh.unstartedKeys.length };
      }) },
    reportEstimates: { s3: S3_REPORT, s5a: S5A_REPORT,
      note: 'S3 x 1.3 - 1.65 on solve work (1.0 - 2.75), report section 5; the combined range is the product with IG-S02\'s ' +
        'S5a factor of the cell; planning anchors, not thresholds' },
    cells: cells,
    rows: rows,
    parity: { verdicts: parity.verdicts, synthetic: synthetic ? { verdict: synthetic.verdict,
      coverage: synthetic.coverage, mutations: synthetic.mutations.map(function (m) {
        return { mutation: m.mutation, detected: m.detected, scenariosDiffering: m.scenariosDiffering.length }; }),
    restored: synthetic.restored.equal } : null, perSet: parity.perSet },
    identity: (function () {
      const isAudit = function (p) { return /\/audit$/.test(p.pairId); };
      const reqs = identity.pairs.filter(function (p) { return !isAudit(p); });
      const audits = identity.pairs.filter(isAudit);
      const n = function (list, v) { return list.filter(function (p) { return p.verdict === v; }).length; };
      const counts = function (list) {
        return { total: list.length, ok: n(list, 'identity-ok'), failed: n(list, 'identity-failed'),
          notComparable: n(list, 'not-comparable') };
      };
      return { requests: counts(reqs), auditJobs: counts(audits),
        note: 'requests = the scoped timing requests compared with IG-S02 in every digest section; auditJobs = the audit ' +
          'jobs (18 saved puzzles and the synthetic job) with their parity verdicts, reported separately' };
    })(),
    verdictStatements: verdictStatements(coverage.nativeFullScan.length),
    sm4: sm4Statement(identityRequests(identity.pairs).length, parity.puzzles.length),
    coverageSummary: { families: coverage.families.map(function (f) {
      return { id: f.id, status: f.status, skippedAudit: f.audit.skippedScopes, skippedTiming: f.timing.skippedScopes,
        virtualNodeChecksAudit: f.audit.virtualNodeChecks, virtualNodeChecksTiming: f.timing.virtualNodeChecks }; }),
    nativeFullScan: coverage.nativeFullScan.length,
    invalidations: coverage.invalidations, virtualCheckCharges: coverage.virtualCheckCharges,
    scopeAuditViolations: coverage.scopeAuditViolations },
    machine: (function () {
      const m = AG.machineTime(repoRoot, TASK, round);
      const approvals = RUN.readLedger(path.join(RUN.evidenceRootOf(repoRoot), round)).approvals.filter(function (a) {
        return a.task === TASK && Number.isFinite(a.extraMs);
      });
      m.approvedExtraMs = approvals.reduce(function (n, a) { return n + a.extraMs; }, 0);
      m.approvals = approvals;
      m.remainingMs += m.approvedExtraMs;
      return m;
    })(),
    sources: {
      runtimeFingerprints: uniq(latest.map(function (c) { return c.runtimeFingerprint; })),
      harnessFingerprints: uniq(latest.map(function (c) { return c.harnessFingerprint; })),
      adapterHashes: uniq([].concat.apply([], latest.map(function (c) { return c.adapterHashes || []; }))),
      adapterIds: uniq([].concat.apply([], latest.map(function (c) { return c.adapterIds || []; }))),
      sourceStable: latest.every(function (c) { return c.sourceStable === true; }),
      firewallClean: latest.every(function (c) { return c.firewallClean === true; }),
      commandStatuses: latest.map(function (c) { return c.shard + ':' + c.attemptId + ':' + c.status; })
    },
    timingInstanceInstrumentation: { auditAdapterLoaded: !noAuditInTiming,
      note: 'timing arms load only the adapters scoped-solver (and attempt-pool): no per-check hashing, no per-finder clock; ' +
        'only integer counters' },
    acceptance: acceptance,
    limitations: limitations,
    attachments: { parity: 'parity.json', checkSequences: 'check-sequences.json', coverage: 'coverage.json' },
    _docs: { parity: parity, sequences: sequences, coverage: coverage }
  };
}

function identityRequests(pairs) {
  return pairs.filter(function (p) { return !/\/audit$/.test(p.pairId); });
}

function acceptanceOf(x) {
  const p = x.parity;
  const allUnlimited = p.puzzles.length > 0 && p.puzzles.every(function (q) {
    return Object.keys(q.sets).every(function (n) { return q.sets[n].unlimitedEqual; });
  });
  const allFailures = p.puzzles.length > 0 && p.puzzles.every(function (q) {
    return Object.keys(q.sets).every(function (n) { return q.sets[n].failuresEqual; });
  });
  const syn = p.synthetic;
  const rowsMatched = x.rows.filter(function (r) { return r.scopedPool && r.scopedPool.outcome === 'complete'; }).length;
  const serialDone = x.rows.filter(function (r) { return r.scopedSerial && r.scopedSerial.outcome === 'complete'; }).length;
  const status = function (ok) { return ok ? 'met' : 'NOT met'; };
  return [
    { id: 'B01', status: 'met', evidence: 'every table labels the prototype PARTIAL S3 and the planning range as the full-S3 ' +
      'forecast of the report; no figure is presented as the forecast' },
    { id: 'B02', status: status(x.identity.failed === 0 && allUnlimited && allFailures), evidence: (function () {
      const reqs = identityRequests(x.identity.pairs);
      const ok = reqs.filter(function (r) { return r.verdict === 'identity-ok'; }).length;
      return reqs.length + ' request identities (every scoped timing request against IG-S02, every digest section): ' + ok +
        ' identical, ' + reqs.filter(function (r) { return r.verdict === 'identity-failed'; }).length + ' failed; the audit ' +
        'jobs are counted apart (parity.json); unlimited parity on every audited set; injected failures equal';
    })() },
    { id: 'B03', status: status(rowsMatched === 18), evidence: rowsMatched + ' of 18 scoped-pool requests (all six headline ' +
      'rows) completed with matched IG-S02 baselines; the two-attempt local work stays limited (peak active attempts in the ' +
      'pool records); serial rows completed: ' + serialDone + ' of 6 (a timing-plan item, not part of this criterion)' },
    { id: 'T01', status: status(allUnlimited && p.puzzles.length === 18), evidence: p.puzzles.length +
      ' saved puzzles audited; Finding/step/rating digests and the logical check sequences equal in all four sets' },
    { id: 'T02', status: status(allFailures && p.puzzles.length === 18), evidence: 'count failures at the first, middle, last ' +
      'and skipped-scope boundary checks fail at the same ordinal, site and with the same error fields' },
    { id: 'T03', status: status(!!syn && syn.verdict === 'pass' && x.coverage.scopeAuditViolations.audit === 0),
      evidence: 'synthetic states crossing the cadence, peer invalidation (shadow check), per-solve isolation and budget-error ' +
        'cleanup; the four deliberate mutations are detected and the prototype restored' },
    { id: 'T04', status: status(x.identity.failed === 0 && x.identity.ok + x.identity.notComparable > 0),
      evidence: 'uncensored scoped outputs against IG-S02\'s native and pooled digests (every section)' },
    { id: 'T05', status: status(x.noAuditInTiming && x.timingRecords.every(function (r) {
      return r.outcome !== 'complete' || (r.scoped && r.scoped.messages > 0); })), evidence: 'timing instances carry no audit ' +
      'instrumentation; skipped/real/virtual counters and CPU are in the records' }
  ];
}

// --- markdown -----------------------------------------------------------------------------------------------------------

function f(x, d) {
  if (x === null || x === undefined) return 'n/a';
  if (typeof x !== 'number') return String(x);
  return Number.isInteger(x) && d === undefined ? String(x) : x.toFixed(d === undefined ? 2 : d);
}

function table(headers, rows) {
  const out = ['| ' + headers.join(' | ') + ' |', '|' + headers.map(function () { return '---'; }).join('|') + '|'];
  rows.forEach(function (row) { out.push('| ' + row.map(function (v) { return v === null || v === undefined ? 'n/a' : v; }).join(' | ') + ' |'); });
  return out.join('\n');
}

function fac(d) {
  return d && d.n > 0 ? f(d.upperMedian) + ' (' + f(d.min) + '-' + f(d.max) + ', n=' + d.n + ')' : 'n/a';
}

function render(doc) {
  const L = [];
  L.push('# IG-S03 task summary (' + doc.round + '): scoped solver prototype and virtual-check parity', '');
  L.push('**' + doc.provisionalNotice + '**', '');
  if (doc.revision) {
    L.push('Revision `' + doc.revision.file + '`: supersedes ' + doc.revision.supersedes + '. Reporting changes:', '');
    doc.revision.changes.forEach(function (text) { L.push('- ' + text); });
    L.push('');
  }
  L.push('Evidence status: **' + doc.evidenceStatus + '**. Formal gate: **' + doc.formalGate + '**. ' + doc.scope, '');
  L.push('Baselines: ' + doc.baseline.note + ' (`' + doc.baseline.file + '`, sha256 `' + doc.baseline.sha256 + '`).', '');
  L.push('## Coverage', '');
  L.push(table(['planned keys', 'completed', 'censored', 'errors', 'validation unknown'],
    [[doc.coverage.plannedKeys, doc.coverage.completed, doc.coverage.censored, doc.coverage.errors,
      doc.coverage.validationUnknown]]), '');
  L.push(table(['shard', 'status', 'attempts', 'unstarted'], doc.coverage.shards.map(function (sh) {
    return [sh.shard, sh.status, sh.attempts.join(','), sh.unstarted];
  })), '');
  L.push('## Speed-ups per cell, three separate quantities (ready-wall factor: upper median, min-max, n; n = 3 tails are ' +
    'descriptive)', '');
  L.push(table(['cell', 'report S3', 'serial S3 (native-w1 / scoped-native-w1, n=1)', 'incremental S3 over the pool ' +
    '(attempts-w4 / scoped-attempts-w4)', 'report S5a x S3', 'combined (native-w1 / scoped-attempts-w4)'],
  doc.cells.map(function (c) {
    return [c.cell, c.report.s3.join('-'), fac(c.serial.factor), fac(c.incremental.factor), c.report.combinedProduct.join('-'),
      fac(c.combined.factor)];
  })), '');
  L.push('Verdicts within the implemented (partial) scope:', '');
  L.push(table(['cell', 'serial S3', 'incremental S3', 'combined'], doc.cells.map(function (c) {
    return [c.cell, c.serial.verdict, c.incremental.verdict, c.combined.verdict];
  })), '');
  L.push('### What the verdict means', '');
  doc.verdictStatements.forEach(function (text) { L.push('- ' + text); });
  L.push('');
  L.push('Cold-wall factors and CPU ratios (scoped / baseline; above 1 = more CPU):', '');
  L.push(table(['cell', 'serial cold', 'serial CPU', 'incremental cold', 'incremental CPU', 'combined cold', 'combined CPU'],
    doc.cells.map(function (c) {
      return [c.cell, fac(c.serial.coldFactor), fac(c.serial.cpuRatio), fac(c.incremental.coldFactor),
        fac(c.incremental.cpuRatio), fac(c.combined.coldFactor), fac(c.combined.cpuRatio)];
    })), '');
  L.push('## Per request (seconds; ready wall / CPU)', '');
  L.push(table(['request', 'native-w1', 'attempts-w4', 'scoped-native-w1', 'scoped-attempts-w4', 'serial x', 'incremental x',
    'combined x', 'exact (native / pool / scoped pool)'], doc.rows.map(function (r) {
    const a = function (x) { return x ? f(s(x.readyWallMs)) + ' / ' + f(s(x.cpuTotalMs)) : 'n/a'; };
    return [r.pairId, a(r.baselineNative), a(r.baselinePooled), a(r.scopedSerial), a(r.scopedPool),
      r.serial ? f(r.serial.readySpeedup) : 'n/a', r.incremental ? f(r.incremental.readySpeedup) : 'n/a',
      r.combined ? f(r.combined.readySpeedup) : 'n/a', [r.baselineNative ? r.baselineNative.verifiedExact : null,
        r.baselinePooled ? r.baselinePooled.verifiedExact : null, r.scopedPool ? r.scopedPool.verifiedExact : null]
        .map(function (v) { return v === true ? 'yes' : v === false ? 'no' : 'n/a'; }).join(' / ')];
  })), '');
  L.push('Early-exact requests (the pool\'s first exact result came from attempt 1, `firstExactOrdinal = 1`, in IG-S02: the ' +
    'pool can finish no earlier than that attempt and the speculative starts are pure CPU; combined x below 1 is a ' +
    'regression against today). Requests whose first exact came later (greaterThan:2 at sample 6, greaterThan:3 at sample 4) ' +
    'are not early-exact and are not listed:', '');
  L.push(table(['cell', 'request', 'first exact', 'IG-S02 pool vs native x', 'serial x', 'incremental x', 'combined x'],
    [].concat.apply([], doc.cells.map(function (c) {
      return c.earlyExactRegressions.map(function (e) {
        return [c.cell, e.pairId, e.firstExactOrigin + ' #' + e.firstExactOrdinal, f(e.baselinePoolVsNative),
          f(e.serial), f(e.incremental), f(e.combined) + (e.regression ? ' (regression)' : '')];
      });
    }))), '');
  L.push('Speculation (attempts started / consumed; baseline pool against scoped pool):', '');
  L.push(table(['request', 'baseline started', 'baseline consumed', 'scoped started', 'scoped consumed'],
    [].concat.apply([], doc.cells.map(function (c) { return c.speculation; })).map(function (x) {
      return [x.pairId, x.baselineStarted, x.baselineConsumed, x.scopedStarted, x.scopedConsumed];
    })), '');
  L.push('## Parity', '');
  L.push('Saved puzzles audited: ' + (doc.parity.verdicts.ok + doc.parity.verdicts.failed) + ' (' + doc.parity.verdicts.ok +
    ' parity-ok, ' + doc.parity.verdicts.failed + ' failed). Request identity against IG-S02 (every digest section): ' +
    doc.identity.requests.ok + ' of ' + doc.identity.requests.total + ' scoped requests identical, ' +
    doc.identity.requests.failed + ' failed, ' + doc.identity.requests.notComparable + ' not comparable.', '');
  L.push(table(['set', 'puzzles', 'unlimited runs equal', 'checks audited', 'injected failures', 'equal'],
    SETS.map(function (name) {
      const x = doc.parity.perSet[name];
      return [name, x.puzzles, x.unlimitedEqual, x.checks, x.failuresTested, x.failuresEqual];
    })), '');
  if (doc.parity.synthetic) {
    const sy = doc.parity.synthetic;
    L.push('Synthetic states (' + sy.verdict + '): ' + sy.coverage.scenarios + ' scenarios, ' + sy.coverage.skippedScopes +
      ' skipped scopes, ' + sy.coverage.crossingScopes + ' crossing the cadence, ' + sy.coverage.multiCheckScopes +
      ' with several checks, up to ' + sy.coverage.maxDistinctResidues + ' distinct incoming residues in one scenario.', '');
    L.push(table(['deliberate mutation', 'detected', 'scenarios differing'], sy.mutations.map(function (m) {
      return [m.mutation, m.detected, m.scenariosDiffering];
    })), '');
    L.push('Prototype restored after the mutations: ' + sy.restored + '.', '');
  }
  L.push('### SM4 scope', '');
  L.push(doc.sm4, '');
  L.push('Disclosure kept: skipped scopes that charge two or more virtual node checks are covered only by the engine-free tests ' +
    '(see the limitations); the engine-level audit exercises the crossing of the cadence with different incoming residues.', '');
  L.push('## Finder families', '');
  L.push(table(['family', 'finders', 'checks', 'obligation 1 (check count depends on the footprint)', 'obligation 2 (no handler reads ' +
    'interrupted scratch)'], FAMILIES.map(function (x) {
    return [x.family, x.ids.join(', '), x.checks ? 'yes (replayed)' : 'none', x.obligation1, x.obligation2];
  })), '');
  L.push(table(['finder', 'status', 'skipped scopes (audit)', 'skipped scopes (timing)', 'virtual node checks (audit)',
    'virtual node checks (timing)'], doc.coverageSummary.families.map(function (x) {
    return [x.id, x.status, x.skippedAudit, x.skippedTiming, x.virtualNodeChecksAudit, x.virtualNodeChecksTiming];
  })), '');
  L.push(doc.coverageSummary.nativeFullScan + ' other techniques of the catalogue stay native full scans (reasons in coverage.json). ' +
    'Scope audit violations: audit ' + doc.coverageSummary.scopeAuditViolations.audit + ', timing ' +
    doc.coverageSummary.scopeAuditViolations.timing + '.', '');
  L.push('## Machine time and priority waits', '');
  const m = doc.machine;
  L.push('Charged ' + f(m.chargedMs / 1000, 1) + ' s of the ' + f(m.allocationMs / 1000, 0) + ' s allocation' +
    (m.approvedExtraMs ? ' plus ' + f(m.approvedExtraMs / 1000, 0) + ' s approved by the orchestrator' : '') + ' over ' +
    m.commands + ' commands (remaining ' + f(m.remainingMs / 1000, 1) + ' s); priority waits behind difficulty-v3 ' +
    f(m.priorityWaitMs / 1000, 1) + ' s, not charged. ' + m.note + '.', '');
  L.push(table(['shard', 'attempt', 'status', 'occupied s', 'charged s', 'priority wait s'], m.entries.map(function (e) {
    return [e.shard, e.attemptId, e.status, f(s(e.occupiedMs)), f(s(e.chargedMs)), f(s(e.priorityWaitMs))];
  })), '');
  L.push('## Acceptance', '');
  L.push(table(['id', 'status', 'evidence'], doc.acceptance.map(function (a) { return [a.id, a.status, a.evidence]; })), '');
  L.push('## Limitations and open points', '');
  doc.limitations.forEach(function (text) { L.push('- ' + text); });
  L.push('');
  L.push('## Sources', '');
  L.push(table(['item', 'value'], [['runtime fingerprints', doc.sources.runtimeFingerprints.join(', ')],
    ['harness fingerprints', doc.sources.harnessFingerprints.join(', ')], ['adapter ids', doc.sources.adapterIds.join(', ')],
    ['adapter hashes', doc.sources.adapterHashes.join(', ')], ['sources stable', doc.sources.sourceStable],
    ['firewall clean', doc.sources.firewallClean], ['commands', doc.sources.commandStatuses.join('; ')]]), '');
  return C.normaliseText(L.join('\n'));
}

function main(argv) {
  const opts = parseArgs(argv);
  const repoRoot = C.DEFAULT_REPO_ROOT;
  const evidenceRoot = RUN.evidenceRootOf(repoRoot);
  const doc = build(repoRoot, opts.round);
  const docs = doc._docs;
  delete doc._docs;
  const dir = path.join(evidenceRoot, opts.round, TASK);
  // A new revision (--out=summary-r2) writes its own attachments beside it; the earlier files are never touched.
  const suffix = opts.out === 'summary' ? '' : opts.out.replace(/^summary/, '');
  doc.attachments = { parity: 'parity' + suffix + '.json', checkSequences: 'check-sequences' + suffix + '.json',
    coverage: 'coverage' + suffix + '.json' };
  doc.revision = opts.out === 'summary' ? null : { file: opts.out, supersedes: 'the earlier revisions of this summary ' +
    '(summary.json/md and, from r3, summary-r2.json/md), kept unchanged as history', changes: REVISION_CHANGES[opts.out] || [] };
  C.writeJsonAtomic(repoRoot, path.join(dir, 'parity' + suffix + '.json'), docs.parity);
  C.writeJsonAtomic(repoRoot, path.join(dir, 'check-sequences' + suffix + '.json'), docs.sequences);
  C.writeJsonAtomic(repoRoot, path.join(dir, 'coverage' + suffix + '.json'), docs.coverage);
  C.writeJsonAtomic(repoRoot, path.join(dir, opts.out + '.json'), doc);
  C.writeTextExclusive(repoRoot, path.join(dir, opts.out + '.md'), render(doc));
  process.stdout.write('IG-S03 task summary written: ' + C.toPosix(path.relative(repoRoot, dir)) + '/{parity,' +
    'check-sequences,coverage}' + suffix + '.json and ' + opts.out + '.json (+ ' + opts.out + '.md)\n');
  return 0;
}

module.exports = { build, render, buildRows, cellSummaries, coverageDoc, parityDoc, sequencesDoc, acceptanceOf, load,
  totalsOfStats, FAMILIES, S3_REPORT, S5A_REPORT };

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    process.stderr.write('IG aggregate error [' + (err && err.code ? err.code : 'unexpected') + ']: ' +
      (err && err.message ? err.message : String(err)) + '\n');
    process.exitCode = C.exitCodeOf(err);
  }
}
