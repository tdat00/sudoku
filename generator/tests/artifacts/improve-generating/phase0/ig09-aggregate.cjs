'use strict';

/*
 * Task documents of IG-S09 (test side, provisional (pre-freeze)), from evidence only: no engine, no worker, no timing. Reads the
 * shards of a round, classifies every dug sample with the exact predicate of the task file (greater-than-diagnostic.cjs), and writes,
 * once, into the task folder of the round:
 *
 *   samples.json        every sample of every request: setup (origins), final state, rating, exact/shallow, bucket and raw flags
 *   sign-passes.json    every sign pass: removals, decisions, physical DFS calls / checks, restricted solves, skipped counts (G1)
 *   setup-probes.json   the limited counterfactual of the first missed sample of each request, with its coverage
 *   miss-split.json     the disjoint split per cohort and arm with exact numerators and denominators, minimality coverage, trap
 *                       lower / upper shares, unknowns, the setup origins
 *   order-parity.json   G0 against G1 per pair (identity, guard-binding-difference, mismatch, not comparable), the controls
 *   summary.json / .md  the whole task: coverage, physical work, generation time and its stage split, observer overhead, guards,
 *                       local-stage time, the diagnosis cost, machine time, acceptance criteria, deviations
 *
 *   node ig09-aggregate.cjs --task=IG-S09 --round=provisional-r1 [--suffix=-r2] [--revision=<text>]
 *
 * Labels: cumulative figures are over the whole request, per-pass figures per pass; completed work is what a returned request did.
 * A counter the capture cannot observe is `not instrumented` (null), never zero. No unconditional statement about uninstrumented
 * latency is made from an instrumented run.
 *
 * Revision r2 (review IG-S09-ASTRA-F1..F5): the unsuffixed r1 files are preserved; r2 corrects what they say about the counters (the
 * r1 `counts.dfsEntries` aliases the count of `countSolutions` CALLS, not node entries; `UNIQUE_NODES` counts budget checks, not search
 * nodes; CPU is the request's total CPU, startup and cleanup included), the executed versus reused setup probes, the provenance of
 * the priority waits and the failure accounting (a stop is never a met T01), from the same recorded evidence.
 */
const fs = require('fs');
const path = require('path');
const C = require('./common.cjs');
const R = require('./records.cjs');
const M = require('./manifest.cjs');
const G = require('./greater-than-diagnostic.cjs');
const RUN = require('./ig09-run.cjs');
const PLAN = require('./plans/ig-s09.cjs');

const TASK = 'IG-S09';
const ALLOCATION_MS = M.ALLOCATIONS_MS[TASK];
const HISTORICAL = Object.freeze({
  source: 'docs/difficulty-v3/cv6-guided-sign-dig-2026-11-14.md (MS05e before data; seeds 300-319 Normal; historical, a different instrument and ' +
    'source label, never a substitute for these paired observations)',
  samples: 394, attempts: 41, exact: 18, shallow: 21, below: 355, misses: 376, namedTrap: 83, trapShareOfMisses: '83 of 376 (22.1 %)',
  setupTwoAbove: '187 of 376 (49.7 %)', belowAfterTuneReveal: '85 of 376 (22.6 %)', requestsWithCappedLocal: 21,
  cappedLocalRequestGroupShareOfTime: '95 % (a request-group share, not a stage share)'
});
const PREDICATE = 'complete canonical rating below the requested band AND finalClues <= spec.minClues + 1 AND an independently proved minimal ' +
  'sign set (removing each remaining sign admits another solution; a count cap is unknown, not minimal)';

function r3(x) {
  return x === null || x === undefined ? null : Math.round(x * 1000) / 1000;
}

function sec(ms) {
  return ms === null || ms === undefined ? 'n/a' : (Math.round(ms / 10) / 100).toFixed(2) + ' s';
}

function msText(ms) {
  return ms === null || ms === undefined ? 'n/a' : (Math.round(ms * 10) / 10).toFixed(1) + ' ms';
}

function pct(n, d) {
  return d > 0 ? (Math.round(n / d * 1000) / 10).toFixed(1) + ' % (' + n + ' of ' + d + ')' : 'n/a (' + n + ' of ' + d + ')';
}

function share(n, d) {
  return { numerator: n, denominator: d, share: d > 0 ? r3(n / d) : null };
}

function clean(value) {
  return JSON.parse(JSON.stringify(value));
}

function sum(list, f) {
  return list.reduce(function (t, x) { return t + (f(x) === null || f(x) === undefined ? 0 : f(x)); }, 0);
}

function describe(values) {
  return R.describe(values.filter(function (v) { return typeof v === 'number'; }));
}

// --- evidence ---------------------------------------------------------------------------------------------------------------------

function readShard(repoRoot, round, shard) {
  const dir = R.shardDirOf(path.join(repoRoot, ...C.EVIDENCE_REL.split('/')), round, TASK, shard);
  const attempts = R.listAttempts(dir).filter(function (a) { return a.command !== null; });
  if (attempts.length === 0) return null;
  const lists = attempts.map(function (a) {
    const file = path.join(a.dir, R.EVIDENCE_FILES.records);
    return fs.existsSync(file) ? C.readJson(file).records : [];
  });
  const byKey = new Map();
  lists.forEach(function (list) {
    list.forEach(function (r) {
      const earlier = byKey.get(r.key);
      if (!earlier || earlier.outcome === 'unstarted' || r.outcome !== 'unstarted') byKey.set(r.key, r);
    });
  });
  return { shard: shard, attempts: attempts.map(function (a) { return a.attemptId; }), commands: attempts.map(function (a) { return a.command; }),
    records: Array.from(byKey.values()) };
}

function readInput(repoRoot, round) {
  const names = PLAN.shardList().map(function (s) { return s.shard; }).concat([PLAN.CONTROL_SHARD]);
  const roundDir = path.join(repoRoot, ...C.EVIDENCE_REL.split('/'), round);
  const ledgerFile = path.join(roundDir, 'ledger.json');
  const devDir = path.join(roundDir, TASK, 'dev-check');
  const dev = fs.existsSync(path.join(devDir, 'command.json')) ? C.readJson(path.join(devDir, 'command.json')) : null;
  const ledger = fs.existsSync(ledgerFile) ? C.readJson(ledgerFile) : { entries: [], approvals: [] };
  // the common budget reader (the one the runner admits commands with): ledger entries plus every command.json the ledger does not reference
  const commonReader = M.budgetState({ task: TASK, round: round, charges: R.collectCharges(ledger, R.scanRoundCommands(roundDir)), approvals: ledger.approvals });
  return { round: round, shards: names.map(function (n) { return readShard(repoRoot, round, n); }).filter(Boolean),
    ledger: ledger, devCheck: dev, commonReader: commonReader };
}

// --- classification of every sample --------------------------------------------------------------------------------------------------

function levelsOf(input) {
  for (let i = 0; i < input.shards.length; i++) {
    const c = input.shards[i].commands.find(function (x) { return x.catalogueSnapshot; });
    if (c) return c.catalogueSnapshot.levels;
  }
  return ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1', 'hell2'];
}

function gtRecords(input) {
  const out = [];
  input.shards.forEach(function (s) {
    s.records.forEach(function (r) { if (r.gtArm === 'g0' || r.gtArm === 'g1') out.push(Object.assign({}, r, { shardName: s.shard })); });
  });
  return out;
}

function controlRecords(input) {
  const out = [];
  input.shards.forEach(function (s) {
    s.records.forEach(function (r) { if (r.cellKind === 'control') out.push(Object.assign({}, r, { shardName: s.shard })); });
  });
  return out;
}

function completed(rec) {
  return rec.outcome === 'complete' && rec.gt && rec.gt.capture;
}

function classifyRequest(rec, levels) {
  const cap = rec.gt.capture;
  const diag = rec.gt.diag;
  return cap.samples.filter(function (s) { return s.kind !== 'local' && s.setup !== null && s.final; }).map(function (s) {
    const d = diag && diag.rows ? diag.rows[s.ordinal] || null : null;
    const cls = G.classifySample(s, d, rec.level, levels);
    return { rec: rec, s: s, d: d, cls: cls };
  });
}

function originCounts(s) {
  const out = { 'clue-floor': { groups: 0, cells: 0 }, 'unit-floor': { groups: 0, cells: 0 }, help: { groups: 0, cells: 0 },
    tune: { groups: 0, cells: 0 } };
  s.setup.groups.forEach(function (g) {
    if (out[g.phase]) {
      out[g.phase].groups++;
      out[g.phase].cells += g.cells.length;
    }
  });
  return out;
}

// --- documents ----------------------------------------------------------------------------------------------------------------------

/**
 * Why a dug sample has no diagnosis row. `unfinished`: the worker reported it started and the allowance ended before its result (the
 * result is UNKNOWN); `unstarted`: never reported started; r1 records (no `unfinished` list) cannot tell the two apart for a missing row:
 * `unstarted-or-unfinished (r1 record)`; no diagnosis at all: `none`.
 */
function diagnosisGap(rec, ordinal) {
  const d = rec.gt ? rec.gt.diag : null;
  if (!d) return 'none';
  if (Array.isArray(d.unfinished) && d.unfinished.indexOf(ordinal) >= 0) return 'unfinished';
  if (Array.isArray(d.unstarted) && d.unstarted.indexOf(ordinal) >= 0) return Array.isArray(d.unfinished) ? 'unstarted' : 'unstarted-or-unfinished (r1 record)';
  return 'none';
}

function sampleRows(rec, items) {
  return items.map(function (x) {
    const s = x.s;
    const o = originCounts(s);
    return { ordinal: s.ordinal, attempt: s.attempt, sample: s.sample, kind: s.kind, floor: s.setup.minClues, minPerUnit: s.setup.minPerUnit,
      initialClues: s.setup.initialClues, setupAboveFloor: s.setup.initialClues - s.setup.minClues, finalClues: s.final.clues,
      finalAboveFloor: s.final.clues - s.setup.minClues, tuneRounds: s.tuneRounds, tuneRevealGroups: o.tune.groups, tuneRevealCells: o.tune.cells,
      setupOrigins: { clueFloor: o['clue-floor'], unitFloor: o['unit-floor'], help: o.help }, helpProbes: s.setup.helpProbes,
      signsTotal: s.setup.signsTotal, signsLeft: G.decodeSigns(s.final.signs).length, exact: s.final.exact, shallow: s.final.shallow,
      rating: s.final.rating, unsound: s.final.unsound, oracleQuestions: s.final.stats ? s.final.stats.oracleCalls : null,
      diagnosis: x.d === null ? { status: diagnosisGap(rec, s.ordinal) } : { ratingStatus: x.d.ratingStatus, canonicalEqual: x.d.canonicalEqual, below: x.d.below,
        minimalStatus: x.d.minimalStatus, minimal: x.d.minimal, unique: x.d.unique, validationReusedFrom: x.d.validationReusedFrom || null },
      bucket: x.cls.bucket, flags: x.cls.flags, spansMs: s.spansMs, counters: s.counters, countWithinMax: s.countWithinMax,
      groups: s.setup.groups, setupGivens: s.setup.givens, finalGivens: s.final.givens, finalSigns: s.final.signs };
  });
}

function localRows(rec) {
  return rec.gt.capture.samples.filter(function (s) { return s.kind === 'local'; }).map(function (s) {
    return { ordinal: s.ordinal, attempt: s.attempt, sample: s.sample, entry: s.localEntry, caps: s.localCaps,
      final: s.final ? { clues: s.final.clues, exact: s.final.exact, shallow: s.final.shallow, rating: s.final.rating } : null,
      spansMs: s.spansMs, counters: s.counters };
  });
}

function buildSamples(requests) {
  return { schema: 'ig09-samples/2', evidenceStatus: C.EVIDENCE_PROVISIONAL, note: 'givens and signs are encoded (one digit per cell; "a-b" = value[a] < value[b]); ' +
    'a sample without a diagnosis row is unfinished (started, result unknown), unstarted (never reported) or none; counter units: see counterInterpretation in summary-r2.json',
  requests: requests.map(function (x) {
    const counts = x.rec.counts || {};
    return { key: x.rec.key, arm: x.rec.gtArm, level: x.rec.level, seed: x.rec.requestSeed, outcome: x.rec.outcome, samples: sampleRows(x.rec, x.items),
      localSamples: localRows(x.rec), attemptsWork: x.rec.attemptsWork || null,
      recordedCounts: { dfsEntries: counts.dfsEntries === undefined ? null : counts.dfsEntries, dfsChecks: counts.dfsChecks === undefined ? null : counts.dfsChecks,
        countSolutionsCalls: x.rec.gt.capture.totals.dfsCalls, searchLoopBudgetChecks: x.rec.gt.capture.totals.dfsChecks,
        interpretation: counts.dfsEntries === x.rec.gt.capture.totals.dfsCalls ? 'the recorded counts.dfsEntries equals the count of countSolutions calls: it is NOT a ' +
          'count of depth-first node entries (node entries: not instrumented)' : 'counts.dfsEntries does not equal the countSolutions calls: not interpreted' } };
  }) };
}

function passRowsOf(rec) {
  const rows = [];
  rec.gt.capture.samples.forEach(function (s) {
    s.passes.forEach(function (p) {
      rows.push({ sample: s.ordinal, attempt: s.attempt, sampleNo: s.sample, sampleKind: s.kind, index: p.index, name: p.name, kind: p.kind,
        round: p.round, firstTechnique: p.firstTechnique, cluesAtStart: p.cluesAtStart, signsAliveAtStart: p.aliveAtStart, removals: p.removals,
        accepted: p.accepted, rejectedAmbiguous: p.rejectedAmbiguous, rejectedTechniques: p.rejectedTechniques, errors: p.errors,
        dfsCalls: p.dfsCalls, dfsChecks: p.dfsChecks, restrictedSolves: p.restrictedSolves, skippedDfs: p.g1 ? p.g1.proved : 0, g1: p.g1,
        byOutcome: p.byOutcome, wallMs: p.wallMs, ended: p.ended, seq: p.seq, idxHash: p.idxHash });
    });
  });
  return rows;
}

function workTable(passes) {
  const t = G.sumPasses(passes);
  const per = function (n, d) { return d > 0 ? r3(n / d) : null; };
  return { passes: t.passes, removals: t.removals, accepted: t.accepted, rejectedAmbiguous: t.rejectedAmbiguous, rejectedTechniques: t.rejectedTechniques,
    errors: t.errors, dfsCalls: t.dfsCalls, dfsChecks: t.dfsChecks, restrictedSolves: t.restrictedSolves, skippedDfs: t.skippedDfs, wallMs: t.wallMs,
    perRemoval: { dfsCalls: per(t.dfsCalls, t.removals), dfsChecks: per(t.dfsChecks, t.removals), restrictedSolves: per(t.restrictedSolves, t.removals),
      skippedDfs: per(t.skippedDfs, t.removals) },
    perPass: { dfsCalls: per(t.dfsCalls, t.passes), dfsChecks: per(t.dfsChecks, t.passes), restrictedSolves: per(t.restrictedSolves, t.passes),
      skippedDfs: per(t.skippedDfs, t.passes), wallMs: per(t.wallMs, t.passes) },
    byOutcome: t.byOutcome, g1: t.g1 };
}

function buildPasses(requests) {
  return { schema: 'ig09-sign-passes/2', evidenceStatus: C.EVIDENCE_PROVISIONAL,
    note: 'cumulative per pass; dfsCalls = calls of countSolutions (one per uniqueness count, NOT depth-first node entries; node entries are not instrumented); ' +
      'dfsChecks = budget checks of the depth-first search loop (propagation checks are not included); restrictedSolves are calls of the allowed-set solve; ' +
      'skippedDfs is a count skipped by a complete sound proof (G1 only)',
    counterUnits: G.COUNTER_UNITS,
    requests: requests.map(function (x) { return { key: x.rec.key, arm: x.rec.gtArm, level: x.rec.level, seed: x.rec.requestSeed, passes: passRowsOf(x.rec) }; }) };
}

function groupOf(p) {
  if (p.firstTechnique) return 'firstTechnique';
  return p.kind === 'technique' ? 'laterTechnique' : 'minimal';
}

function physicalWork(recs) {
  const passes = [];
  recs.forEach(function (r) { r.gt.capture.samples.forEach(function (s) { s.passes.forEach(function (p) { passes.push(p); }); }); });
  const by = { firstTechnique: [], laterTechnique: [], minimal: [] };
  passes.forEach(function (p) { by[groupOf(p)].push(p); });
  const requests = recs.map(function (r) {
    const t = r.gt.capture.totals;
    const sp = G.sumPasses(G.passesOf(r.gt.capture.samples));
    return { key: r.key, dfsCalls: t.dfsCalls, dfsChecks: t.dfsChecks, restrictedSolves: t.restrictedSolves, inSignPassesDfsCalls: sp.dfsCalls,
      inSignPassesDfsChecks: sp.dfsChecks, inSignPassesSolves: sp.restrictedSolves, removals: sp.removals, passes: sp.passes,
      outsideSignPassesDfsCalls: t.dfsCalls - sp.dfsCalls, outsideSignPassesDfsChecks: t.dfsChecks - sp.dfsChecks,
      outsideSignPassesSolves: t.restrictedSolves - sp.restrictedSolves };
  });
  return { requests: recs.length, samples: sum(recs, function (r) { return r.gt.capture.samples.filter(function (s) { return s.kind !== 'local'; }).length; }),
    cumulativeOverTheRequest: { dfsCalls: sum(recs, function (r) { return r.gt.capture.totals.dfsCalls; }),
      dfsChecks: sum(recs, function (r) { return r.gt.capture.totals.dfsChecks; }), restrictedSolves: sum(recs, function (r) { return r.gt.capture.totals.restrictedSolves; }) },
    signPasses: { firstTechnique: workTable(by.firstTechnique), laterTechnique: workTable(by.laterTechnique), minimal: workTable(by.minimal), all: workTable(passes) },
    perRequest: { dfsCalls: describe(requests.map(function (x) { return x.dfsCalls; })), dfsChecks: describe(requests.map(function (x) { return x.dfsChecks; })),
      restrictedSolves: describe(requests.map(function (x) { return x.restrictedSolves; })),
      removals: describe(requests.map(function (x) { return x.removals; })) },
    perRequestRows: requests };
}

// --- the miss split ------------------------------------------------------------------------------------------------------------------

function diagnosisCoverage(recs) {
  const statuses = {};
  let rows = 0;
  let unstarted = 0;
  let unfinished = 0;
  let unfinishedRecorded = true;
  let reused = 0;
  let maxWallMs = 0;
  recs.forEach(function (r) {
    const d = r.gt.diag;
    const st = d ? d.status : 'none';
    statuses[st] = (statuses[st] || 0) + 1;
    if (d) {
      rows += Object.keys(d.rows).length;
      unstarted += d.unstarted.length;
      if (Array.isArray(d.unfinished)) unfinished += d.unfinished.length;
      else unfinishedRecorded = false;
      reused += d.reuse ? d.reuse.samples : 0;
      if (typeof d.wallMs === 'number' && d.wallMs > maxWallMs) maxWallMs = d.wallMs;
    }
  });
  return { requests: recs.length, diagnosisStatuses: statuses, rows: rows, unstartedSamples: unstarted,
    unfinishedSamples: unfinishedRecorded ? unfinished : 'not recorded (r1 records): a missing row is unstarted or unfinished', reusedSamples: reused,
    longestDiagnosisWallMs: r3(maxWallMs) };
}

function originSummary(items) {
  const keys = ['clue-floor', 'unit-floor', 'help', 'tune'];
  const out = { samples: items.length, groups: {}, cells: {}, samplesWithGroupsOf: {} };
  keys.forEach(function (k) {
    out.groups[k] = 0;
    out.cells[k] = 0;
    out.samplesWithGroupsOf[k] = 0;
  });
  items.forEach(function (x) {
    const o = originCounts(x.s);
    keys.forEach(function (k) {
      out.groups[k] += o[k].groups;
      out.cells[k] += o[k].cells;
      if (o[k].groups > 0) out.samplesWithGroupsOf[k]++;
    });
  });
  return out;
}

function setupExcessOrigin(items) {
  // for the samples that ended with their setup two or more clues above the floor and no tune reveal
  const out = { 'unit-floor only': 0, 'help only': 0, 'unit-floor and help': 0, 'neither (the clue-floor groups overshoot)': 0 };
  items.forEach(function (x) {
    const o = originCounts(x.s);
    const u = o['unit-floor'].groups > 0;
    const h = o.help.groups > 0;
    if (u && h) out['unit-floor and help']++;
    else if (u) out['unit-floor only']++;
    else if (h) out['help only']++;
    else out['neither (the clue-floor groups overshoot)']++;
  });
  return out;
}

function buildMissSplit(requests, levels) {
  const cohorts = {};
  ['normal', 'nightmare'].forEach(function (level) {
    cohorts[level] = {};
    ['g0', 'g1'].forEach(function (arm) {
      const mine = requests.filter(function (x) { return x.rec.level === level && x.rec.gtArm === arm; });
      const items = [];
      mine.forEach(function (x) { x.items.forEach(function (i) { items.push(i); }); });
      const split = G.missSplit(items.map(function (i) { return i.cls; }));
      const bucketItems = function (b) { return items.filter(function (i) { return i.cls.bucket === b; }); };
      cohorts[level][arm] = {
        requests: mine.length, split: split, coverage: diagnosisCoverage(mine.map(function (x) { return x.rec; })),
        shares: { exact: share(split.exact, split.samples), shallow: share(split.buckets.shallow, split.samples),
          aboveOrUnrated: share(split.buckets['above-or-unrated'], split.samples), belowTrap: share(split.buckets['below-trap'], split.samples),
          belowTune: share(split.buckets['below-tune'], split.samples), belowSetup2: share(split.buckets['below-setup2'], split.samples),
          otherBelow: share(split.buckets['other-below'], split.samples), unconfirmed: share(split.buckets.unconfirmed, split.samples) },
        sharesOfMisses: { namedTrapLower: split.trapLowerShareOfMisses, namedTrapUpper: split.trapUpperShareOfMisses,
          belowTune: share(split.buckets['below-tune'], split.misses), belowSetup2: share(split.buckets['below-setup2'], split.misses),
          shallow: share(split.buckets.shallow, split.misses) },
        eligibleBeforeMinimality: { cheapFloorClauseTrue: share(items.filter(function (i) { return i.cls.flags.floorClause; }).length, items.length),
          belowAndFloorClause: share(split.trapEligible, items.length), minimalityAsked: split.minimalityCoverage,
          note: 'only a sample that satisfies the clue-floor clause and the complete canonical below-band clause needs a minimality proof; the rest is ' +
            'not-required-for-trap (never an implied proof)' },
        setupOrigins: { allSamples: originSummary(items), misses: originSummary(items.filter(function (i) { return i.cls.bucket !== 'exact'; })),
          belowSetup2ExcessOrigin: setupExcessOrigin(bucketItems('below-setup2')) }
      };
    });
  });
  return { schema: 'ig09-miss-split/1', evidenceStatus: C.EVIDENCE_PROVISIONAL, predicate: PREDICATE,
    buckets: G.BUCKETS, order: 'exact; shallow in-band; above/not-rated/stuck; below + named trap; below + post-setup tune reveal; below + no tune reveal ' +
      '+ setup at least two above the floor; other/unknown below; unconfirmed (no independent canonical rating). The predicate order prevents double counting.',
    levels: levels, historical: HISTORICAL, cohorts: cohorts,
    reading: 'An ending category is not an intervention coverage: no "only N % can benefit" conclusion follows. The origin of a setup reveal (clue-floor rule, ' +
      'unit-floor rule, solvability help) is not proof that it is necessary now.' };
}

// --- probes --------------------------------------------------------------------------------------------------------------------------

function buildProbes(requests) {
  const rows = [];
  requests.forEach(function (x) {
    const diag = x.rec.gt.diag;
    const missed = G.firstMissed(x.rec.gt.capture.samples);
    const p = diag && diag.probe ? diag.probe : null;
    rows.push({ key: x.rec.key, arm: x.rec.gtArm, level: x.rec.level, seed: x.rec.requestSeed, firstMissedSample: missed ? missed.ordinal : null,
      aboveFloorGroupsAvailable: missed ? G.aboveFloorGroups(missed, 1000).length : 0,
      probe: p ? { status: p.status || (p.rows.length > 0 ? 'done' : 'unstarted'), groupsPlanned: p.groupsPlanned, execution: p.reusedFrom ? 'reused' : 'executed',
        reusedFrom: p.reusedFrom || null, rows: p.rows } : null });
  });
  // every group row of a request with a probe; a reused row is a COPY of the donor's executed row (same parent, groups, source and guards)
  const flat = [];
  rows.forEach(function (r) {
    if (r.probe) r.probe.rows.forEach(function (g) { flat.push(Object.assign({ key: r.key, level: r.level, execution: r.probe.execution, donor: r.probe.reusedFrom }, g)); });
  });
  const tally = function (list) {
    const done = list.filter(function (g) { return g.status === 'done'; });
    const count = function (f, v) { return list.filter(function (g) { return f(g) === v; }).length; };
    return { groupRows: list.length, done: done.length, notDone: list.length - done.length,
      blockedByRule: { clueFloor: done.filter(function (g) { return g.block && g.block.floorBlock; }).length,
        unitFloor: done.filter(function (g) { return g.block && g.block.unitBlock; }).length,
        neither: done.filter(function (g) { return g.block && !g.block.floorBlock && !g.block.unitBlock; }).length },
      uniquenessAfterRemoval: { unique: count(function (g) { return g.uniquenessAfterRemoval; }, 'unique'),
        notUnique: count(function (g) { return g.uniquenessAfterRemoval; }, 'not-unique'),
        unknown: list.filter(function (g) { return g.status === 'done' && /unknown/.test(g.uniquenessAfterRemoval || ''); }).length },
      solveAfterRemoval: { solved: count(function (g) { return g.solveAfterRemoval; }, 'solved'), stuck: count(function (g) { return g.solveAfterRemoval; }, 'stuck'),
        contradiction: count(function (g) { return g.solveAfterRemoval; }, 'contradiction'),
        unknownOrError: list.filter(function (g) { return g.status === 'done' && !/^(solved|stuck|contradiction)$/.test(g.solveAfterRemoval || ''); }).length } };
  };
  const executed = flat.filter(function (g) { return g.execution === 'executed'; });
  const reused = flat.filter(function (g) { return g.execution === 'reused'; });
  const withProbe = rows.filter(function (r) { return r.probe !== null && r.probe.rows.length > 0; });
  const donors = new Set(rows.filter(function (r) { return r.probe && r.probe.reusedFrom; }).map(function (r) { return r.probe.reusedFrom; }));
  return { schema: 'ig09-setup-probes/2', evidenceStatus: C.EVIDENCE_PROVISIONAL,
    method: 'for the first missed (not exact) sign-dug sample of each request, at most the first three above-floor setup groups (unit-floor rule or solvability ' +
      'help) in their recorded order, after timing, against the saved post-setup, full-signs parent: the pure clue-floor / unit-floor rule, a bounded ' +
      'uniqueness count and the allowed-set solve after the removal. The second-running arm of a pair reuses the first-running arm\'s rows when the whole ' +
      'probe input (solution, parent, signs, groups, floors, source, guards) is identical: a reused row is a copy, not a second execution',
    coverage: { requests: rows.length, withAMissedSample: rows.filter(function (r) { return r.firstMissedSample !== null; }).length,
      withAboveFloorGroups: rows.filter(function (r) { return r.aboveFloorGroupsAvailable > 0; }).length,
      requestsWithProbeRows: withProbe.length,
      requestsThatExecutedAProbe: withProbe.filter(function (r) { return r.probe.execution === 'executed'; }).length,
      requestsThatReusedAProbe: withProbe.filter(function (r) { return r.probe.execution === 'reused'; }).length, donorRequestsReusedByAnother: donors.size,
      groupRowsExecuted: executed.length, groupRowsReusedCopies: reused.length, groupRowsListed: flat.length,
      groupRowsDone: flat.filter(function (g) { return g.status === 'done'; }).length,
      groupRowsNotDone: flat.filter(function (g) { return g.status !== 'done'; }).length,
      note: 'Limited counterfactual coverage of one sample per request: not a population intervention coverage. The listed rows are ' + executed.length +
        ' executed group checks plus ' + reused.length + ' reused copies; they are never ' + flat.length + ' independent probe executions' },
    results: { executed: tally(executed), reusedCopies: tally(reused),
      reading: 'The executed rows are the observations; the reused copies repeat a donor row and are listed apart, never added to the executed results' },
    requests: rows };
}

// --- parity ---------------------------------------------------------------------------------------------------------------------------

function buildParity(allRecords, controls) {
  const readG0 = function (level, seed) {
    return allRecords.find(function (r) { return r.gtArm === 'g0' && r.level === level && r.requestSeed === seed && r.outcome === 'complete'; }) || null;
  };
  const id = RUN.identity(allRecords.concat(controls), { readG0: readG0 });
  const arms = id.pairs.filter(function (p) { return p.kind === 'arms'; });
  const count = function (list, v) { return list.filter(function (p) { return p.verdict === v; }).length; };
  return { schema: 'ig09-order-parity/2', evidenceStatus: C.EVIDENCE_PROVISIONAL,
    method: 'per pair: the request digests (structure, givens, solution, rating, configuration, warnings, dig log, work) and, sample by sample, the final ' +
      'states, canonical ratings, the semantic oracle-question counts and the accepted / rejected sign decisions of every pass; the first differing event is ' +
      'kept; a difference is a guard-binding-difference only when an external budget was present AND the first differing event is an error event whose recorded ' +
      'first failure carries a recognised guard code (' + G.GUARD_CODES.join(', ') + '); any other difference or failure is a mismatch that stops the diagnostic',
    pairs: { total: arms.length, identityOk: count(arms, 'identity-ok'), guardBindingDifference: count(arms, 'guard-binding-difference'),
      mismatch: count(arms, 'identity-failed'), notComparable: count(arms, 'not-comparable'), deferred: count(arms, 'deferred') },
    controls: id.pairs.filter(function (p) { return p.kind === 'control'; }), pairRows: arms };
}

// --- time ------------------------------------------------------------------------------------------------------------------------------

function stageSplit(rec) {
  const cap = rec.gt.capture;
  const t = rec.engineTimingsMs || {};
  const dug = cap.samples.filter(function (s) { return s.kind !== 'local'; });
  const local = cap.samples.filter(function (s) { return s.kind === 'local'; });
  const passes = G.passesOf(cap.samples);
  const wall = function (g) { return sum(passes.filter(function (p) { return groupOf(p) === g; }), function (p) { return p.wallMs; }); };
  const engineMs = rec.gt.workerRunMs;
  const grid = (t.configure || 0) + (t.buildModel || 0) + (t.fullGrid || 0);
  const placement = t.extraStructure || 0;
  const sampleTotal = sum(dug, function (s) { return s.spansMs.totalMs; });
  const localTotal = sum(local, function (s) { return s.spansMs.totalMs; });
  return { engineMs: r3(engineMs), fullGridAndModelSetupMs: r3(grid), signPlacementMs: r3(placement),
    setupCluePlacementMs: r3(sum(dug, function (s) { return s.spansMs.setupMs; })), signPassFirstTechniqueMs: r3(wall('firstTechnique')),
    signPassLaterTechniqueMs: r3(wall('laterTechnique')), signPassMinimalMs: r3(wall('minimal')),
    tuningMs: r3(sum(dug, function (s) { return s.spansMs.tuneMs; })), afterStrategyMs: r3(sum(dug, function (s) { return s.spansMs.afterStrategyMs; })),
    localSearchMs: r3(localTotal), dugSampleTotalMs: r3(sampleTotal),
    otherMs: engineMs === null ? null : r3(engineMs - grid - placement - sampleTotal - localTotal),
    engineStepTimingsMs: t, note: 'afterStrategy = the safety uniqueness count and the rate step after the sign dig returns; other = what no sample or setup span ' +
      'covers (the rate and tune steps outside a sample, the keeper, the between-sample work)' };
}

function pairRows(recs) {
  const by = new Map();
  recs.forEach(function (r) {
    if (!by.has(r.pairId)) by.set(r.pairId, {});
    by.get(r.pairId)[r.gtArm] = r;
  });
  return Array.from(by.entries()).map(function (e) {
    const a = e[1].g0;
    const b = e[1].g1;
    const ok = a && b && a.outcome === 'complete' && b.outcome === 'complete';
    return { pairId: e[0], g0: a || null, g1: b || null, complete: !!ok, g0First: ok && a.order < b.order };
  });
}

function ratioOf(a, b, status) {
  if (status !== undefined && status !== 'resolved' && status !== 'coarse') return null;
  return R.ratio(a, b);
}

function usableBoth(a, b) {
  return R.usable(a.generation.cpuResolutionStatus) && R.usable(b.generation.cpuResolutionStatus);
}

function timeTable(recs, level) {
  const mine = recs.filter(function (r) { return r.level === level; });
  const pairs = pairRows(mine).filter(function (p) { return p.complete; });
  const rw = function (r) { return r.generation.readyWallMs; };
  const cpu = function (r) { return r.generation.cpuTotalMs; };
  const g0 = pairs.map(function (p) { return p.g0; });
  const g1 = pairs.map(function (p) { return p.g1; });
  const med = function (list) { return R.percentileNearestRank(list, 0.5); };
  const wallRatios = pairs.map(function (p) { return R.ratio(rw(p.g0), rw(p.g1)); });
  const cpuRatios = pairs.map(function (p) { return ratioOf(cpu(p.g0), cpu(p.g1), usableBoth(p.g0, p.g1) ? 'resolved' : 'unresolved'); });
  const sw = function (arm, f) { return sum(arm, f); };
  const stage = function (arm) {
    const rows = arm.map(stageSplit);
    const keys = ['engineMs', 'fullGridAndModelSetupMs', 'signPlacementMs', 'setupCluePlacementMs', 'signPassFirstTechniqueMs', 'signPassLaterTechniqueMs',
      'signPassMinimalMs', 'tuningMs', 'afterStrategyMs', 'localSearchMs', 'otherMs'];
    const out = {};
    keys.forEach(function (k) { out[k] = r3(sum(rows, function (x) { return x[k]; })); });
    return out;
  };
  const byOrder = function (first) {
    const sel = pairs.filter(function (p) { return p.g0First === first; });
    return { pairs: sel.length, medianPerPairReadyWallRatioG0OverG1: med(sel.map(function (p) { return R.ratio(rw(p.g0), rw(p.g1)); })) };
  };
  const stage0 = stage(g0);
  const stage1 = stage(g1);
  const diff = {};
  Object.keys(stage0).forEach(function (k) { diff[k] = r3(stage1[k] - stage0[k]); });
  return { level: level, pairsCompleted: pairs.length, requestsRecorded: mine.length,
    g0: { readyWallMs: describe(g0.map(rw)), cpuTotalMs: describe(g0.map(cpu)), sumReadyWallMs: r3(sw(g0, rw)), sumCpuTotalMs: r3(sw(g0, cpu)),
      cpuResolution: Array.from(new Set(g0.map(function (r) { return r.generation.cpuResolutionStatus; }))) },
    g1: { readyWallMs: describe(g1.map(rw)), cpuTotalMs: describe(g1.map(cpu)), sumReadyWallMs: r3(sw(g1, rw)), sumCpuTotalMs: r3(sw(g1, cpu)),
      cpuResolution: Array.from(new Set(g1.map(function (r) { return r.generation.cpuResolutionStatus; }))) },
    ratioOfCohortTotals: { direction: 'G0 / G1 (a value below 1 means G1 took longer)', readyWallSumG0OverSumG1: R.ratio(sw(g0, rw), sw(g1, rw)),
      cpuSumG0OverSumG1: ratioOf(sw(g0, cpu), sw(g1, cpu), g0.concat(g1).every(function (r) { return R.usable(r.generation.cpuResolutionStatus); }) ?
        'resolved' : 'unresolved'), numeratorMs: { readyWallG0: r3(sw(g0, rw)), cpuG0: r3(sw(g0, cpu)) },
      denominatorMs: { readyWallG1: r3(sw(g1, rw)), cpuG1: r3(sw(g1, cpu)) },
      note: 'a ratio of cohort totals: long requests weigh more; it is not a median of paired ratios' },
    paired: { direction: 'G0 / G1 per pair', perPairReadyWallRatioG0OverG1: describe(wallRatios), perPairCpuRatioG0OverG1: describe(cpuRatios),
      g0RanFirst: byOrder(true), g1RanFirst: byOrder(false),
      note: 'Paired summaries of per-pair ratios (n pairs); the nearest-rank p95 of n observations is the maximum only while n < 20 and the second-largest value at n = 20, ' +
        'and is never a tail estimate; time-separated pairs (one request after the other, alternating order); an instrumented run is not an uninstrumented headline; ' +
        'the ratio of one pair carries no tail estimate; an unresolved CPU interval is unknown (null)' },
    cpuBasis: 'cpuTotalMs is the CPU of the whole request from the start of the worker to its cleanup (worker startup and cleanup included); it is not the CPU from ' +
      'ready to decision, and "total-CPU ratio" below means the ratio of these totals',
    stageSplitSumMs: { g0: stage0, g1: stage1, g1MinusG0: diff,
      reading: 'the stages are the same code with the same inputs in both arms except the first technique sign pass: only signPassFirstTechniqueMs differs by ' +
        'design (and the setup-free parts it feeds none); any other difference is measurement noise or time separation and is attributed to nothing' } };
}

function localStage(recs) {
  const out = {};
  ['normal', 'nightmare'].forEach(function (level) {
    out[level] = {};
    ['g0', 'g1'].forEach(function (arm) {
      out[level][arm] = localStageOf(recs.filter(function (r) { return r.level === level; }), arm);
    });
  });
  return out;
}

/** One cohort and arm: the local-stage numerator and every denominator are spans of the same completed requests' engine run. */
function localStageOf(recs, armId) {
  const out = {};
  [armId].forEach(function (arm) {
    const mine = recs.filter(function (r) { return r.gtArm === arm && completed(r); });
    const withLocal = mine.filter(function (r) { return r.gt.capture.samples.some(function (s) { return s.kind === 'local'; }); });
    const capped = mine.filter(function (r) {
      return r.gt.capture.samples.some(function (s) { return s.kind === 'local' && s.localCaps && s.localCaps.capHit !== null; });
    });
    const totalMs = sum(mine, function (r) { return r.gt.workerRunMs; });
    const localMs = sum(mine, function (r) { return sum(r.gt.capture.samples.filter(function (s) { return s.kind === 'local'; }), function (s) { return s.spansMs.totalMs; }); });
    const cappedTotalMs = sum(capped, function (r) { return r.gt.workerRunMs; });
    const cappedLocalMs = sum(capped, function (r) { return sum(r.gt.capture.samples.filter(function (s) { return s.kind === 'local'; }), function (s) { return s.spansMs.totalMs; }); });
    const capReasons = {};
    mine.forEach(function (r) {
      r.gt.capture.samples.filter(function (s) { return s.kind === 'local'; }).forEach(function (s) {
        const k = s.localCaps ? String(s.localCaps.capHit) : 'unknown';
        capReasons[k] = (capReasons[k] || 0) + 1;
      });
    });
    out[arm] = { requests: mine.length, requestsWithALocalSearch: withLocal.length, requestsWithACappedLocalSearch: capped.length,
      measuredLocalStageShareOfAllRequestTime: share(r3(localMs), r3(totalMs)),
      requestGroupShareOfTimeOfRequestsWithACappedLocal: share(r3(cappedTotalMs), r3(totalMs)),
      measuredLocalStageShareInsideThoseRequests: share(r3(cappedLocalMs), r3(cappedTotalMs)), localSearchEndReasons: capReasons,
      engineWallDenominatorMs: r3(totalMs),
      note: 'time = the worker run (engine wall) of the same completed requests, instrumented; the old 95 % is a request-group share, the measured local-stage ' +
        'fraction is measuredLocalStageShareOfAllRequestTime (all requests of this cohort and arm) and measuredLocalStageShareInsideThoseRequests (inside the capped ones)' };
  });
  return out[armId];
}

function guardAccounting(recs) {
  const out = {};
  ['g0', 'g1'].forEach(function (arm) {
    const mine = recs.filter(function (r) { return r.gtArm === arm && completed(r); });
    const samples = [];
    mine.forEach(function (r) { r.gt.capture.samples.forEach(function (s) { samples.push(s); }); });
    const dug = samples.filter(function (s) { return s.kind !== 'local' && s.setup; });
    const tot = function (f) { return sum(mine, function (r) { return f(r.gt.capture.totals); }); };
    const maxTune = dug.reduce(function (m, s) { return Math.max(m, s.tuneRounds); }, 0);
    const works = [];
    mine.forEach(function (r) { (r.attemptsWork || []).forEach(function (w) { works.push(w); }); });
    const errorDecisions = G.sumPasses(G.passesOf(samples)).errors;
    out[arm] = {
      requests: mine.length, dugSamples: dug.length,
      signPassCountAndSolve: { externalBudgetSeenBySamples: dug.filter(function (s) { return s.setup.budgetPresent; }).length, ofSamples: dug.length,
        limit: 'no external budget object reaches these calls in these requests (seen by ' + dug.filter(function (s) { return s.setup.budgetPresent; }).length + ' of ' + dug.length +
          ' samples); any internal limit of the count or of the solver: not instrumented',
        consumption: 'search-loop budget checks (cumulative over the request, not search nodes) ' + tot(function (t) { return t.dfsChecks; }) + ' in ' + tot(function (t) { return t.dfsCalls; }) +
          ' countSolutions calls; the solver\'s own budget checks: not instrumented',
        guardThatBound: 'no guard event recorded: ' + errorDecisions + ' error decision(s) in the sign passes (a binding guard is recorded as an error decision)',
        bounds: 'MAX_TUNE_ROUNDS 8: the largest number of tune rounds seen is ' + maxTune + '; the solvability-help loop is bounded by the cell count (probes per sample, max ' +
          dug.reduce(function (m, s) { return Math.max(m, s.setup.helpProbes); }, 0) + ')' },
      uniquenessCountSlice: { name: 'UNIQUE_NODES (digger.js countWithin: keeper offers and the local search)',
        limit: '200000 budget checks per count slice (the slice counts search-loop AND propagation budget checks, so it is not a search-node count)',
        calls: tot(function (t) { return t.countWithinCalls; }), budgetChecksUsedCumulative: tot(function (t) { return t.countWithinNodes; }),
        largestSingleCountBudgetChecks: samples.reduce(function (m, s) { return Math.max(m, s.countWithinMax || 0); }, 0),
        trips: tot(function (t) { return t.countWithinTrips; }), guardThatBound: tot(function (t) { return t.countWithinTrips; }) > 0 ? 'the uniqueness count slice ' +
          'bound in ' + tot(function (t) { return t.countWithinTrips; }) + ' count(s)' : 'none recorded: no count reached the slice (0 trips)' },
      safetyUniquenessCount: { limit: 'no external budget object in these requests; internal limit: not instrumented', consumption: 'not instrumented separately: it is inside the after-strategy part of a sample',
        guardThatBound: 'not instrumented' },
      stageBObjective: { name: 'OBJECTIVE_STEPS (digger.js digGuidedSteps / boundedObjective)', limit: '100000 solver steps per solve',
        entriesObserved: tot(function (t) { return t.guidedEntries; }), consumption: tot(function (t) { return t.guidedEntries; }) === 0 ?
          'not reached: the sign strategy does not run stage B' : 'not instrumented', guardThatBound: tot(function (t) { return t.guidedEntries; }) === 0 ? 'none: stage B not entered (0 entries)' : 'not instrumented' },
      attemptCaps: { name: 'CAP_RATINGS 1024 / CAP_PROPOSALS 32768 / SHALLOW_SEARCH_RATINGS 256 per attempt (wire.work)', attempts: works.length,
        ratingsMax: works.reduce(function (m, w) { return Math.max(m, w.ratings); }, 0), proposalsMax: works.reduce(function (m, w) { return Math.max(m, w.proposals); }, 0),
        capHits: (function () {
          const k = {};
          works.forEach(function (w) { w.localSearches.forEach(function (l) { k[String(l.capHit)] = (k[String(l.capHit)] || 0) + 1; }); });
          return k;
        })() }
    };
  });
  return out;
}

function overheadRows(controls, recs, commandOf) {
  return controls.map(function (c) {
    const g0 = recs.find(function (r) { return r.gtArm === 'g0' && r.level === c.level && r.requestSeed === c.requestSeed && r.outcome === 'complete'; }) || null;
    if (!g0 || c.outcome !== 'complete') {
      return { control: c.key, level: c.level, seed: c.requestSeed, status: 'not-comparable', controlOutcome: c.outcome, g0Recorded: !!g0 };
    }
    const cg = c.generation;
    const gg = g0.generation;
    const cc = commandOf(c.shardName);
    const gc = commandOf(g0.shardName);
    const same = function (a, b) { return a !== undefined && a !== null && b !== undefined && b !== null && C.canonicalJson(a) === C.canonicalJson(b); };
    const compat = {
      runtimeFingerprint: { control: cc ? cc.runtimeFingerprint : null, g0: gc ? gc.runtimeFingerprint : null, equal: !!cc && !!gc && cc.runtimeFingerprint === gc.runtimeFingerprint },
      harnessFingerprint: { control: cc ? cc.harnessFingerprint : null, g0: gc ? gc.harnessFingerprint : null, equal: !!cc && !!gc && cc.harnessFingerprint === gc.harnessFingerprint },
      trace: { control: c.normalisedConfig ? c.normalisedConfig.trace : null, g0: g0.normalisedConfig ? g0.normalisedConfig.trace : null,
        equal: same(c.normalisedConfig ? c.normalisedConfig.trace : null, g0.normalisedConfig ? g0.normalisedConfig.trace : null) },
      configuration: { equal: same(c.normalisedConfig, g0.normalisedConfig), digestEqual: !!c.digests && !!g0.digests && c.digests.config === g0.digests.config },
      outputDigests: { equal: !!c.digests && !!g0.digests && c.digests.all === g0.digests.all, sections: c.digests && g0.digests ? R.compareDigests(g0.digests, c.digests) : null },
      exactness: { control: [c.claimedExact, c.verifiedExact], g0: [g0.claimedExact, g0.verifiedExact], equal: c.claimedExact === g0.claimedExact && c.verifiedExact === g0.verifiedExact },
      instrumentation: { control: c.adapterIds || [], g0: g0.adapterIds || [], note: 'the control carries no adapter and no capture hook; G0 carries gt-diagnostic' },
      priorityWrapper: { control: cc && cc.lock && cc.lock.observed ? cc.lock.observed.ownerMatches === true : null, note: 'the control ran inside the runner under the wrapper\'s lock' }
    };
    return { control: c.key, g0: g0.key, level: c.level, seed: c.requestSeed, status: 'n = 1, time-separated', compatibility: compat,
      compatible: compat.runtimeFingerprint.equal && compat.trace.equal && compat.configuration.equal && compat.outputDigests.equal && compat.exactness.equal,
      controlReadyWallMs: cg.readyWallMs, g0ReadyWallMs: gg.readyWallMs, readyWallRatioG0OverControl: R.ratio(gg.readyWallMs, cg.readyWallMs),
      readyWallDifferenceMs: r3(gg.readyWallMs - cg.readyWallMs),
      controlCpuTotalMs: cg.cpuTotalMs, g0CpuTotalMs: gg.cpuTotalMs, cpuRatioG0OverControl: ratioOf(gg.cpuTotalMs, cg.cpuTotalMs, usableBoth(c, g0) ? 'resolved' : 'unresolved'),
      cpuResolution: [cg.cpuResolutionStatus, gg.cpuResolutionStatus], g0WorkerRunMs: g0.gt ? g0.gt.workerRunMs : null, g0CaptureBuildMs: g0.gt ? g0.gt.captureBuildMs : null,
      note: 'the control ran in another command at another time; ratio = captured G0 / observer-free control; one singleton per cohort gives no uncertainty estimate, ' +
        'no population-wide overhead, no statement about uninstrumented latency in general and no correction of any G1 timing' };
  });
}

/**
 * The wait of the development check. Its record is written by the check itself, which cannot see when the caller asked: the r1 check took
 * "requested" AFTER its admission, so the recorded 0 is fictitious. A wait is known only when the caller's timestamp (`--requested-at`)
 * precedes the admission; otherwise it is unknown (null), never zero.
 */
function devCheckWait(timing) {
  const recorded = timing && timing.priorityWaitMs !== undefined ? timing.priorityWaitMs : null;
  const asked = timing ? Date.parse(timing.requestedAt) : NaN;
  const admitted = timing ? Date.parse(timing.admittedAt) : NaN;
  if (Number.isFinite(asked) && Number.isFinite(admitted) && asked < admitted && typeof recorded === 'number') {
    return { valueMs: recorded, status: 'recorded (caller timestamp)', recordedValueMs: recorded };
  }
  return { valueMs: null, status: 'unknown', recordedValueMs: recorded,
    reason: 'the check took its "requested" timestamp after its own admission (requestedAt ' + (timing ? timing.requestedAt : 'n/a') + ' is not before admittedAt ' +
      (timing ? timing.admittedAt : 'n/a') + '), so the recorded ' + recorded + ' is not a wait; no wrapper record of this command\'s wait exists' };
}

function machine(input) {
  const entries = (input.ledger.entries || []).filter(function (e) { return e.task === TASK; });
  const approved = (input.ledger.approvals || []).filter(function (a) { return a.task === TASK; }).reduce(function (t, a) { return t + a.extraMs; }, 0);
  const dev = input.devCheck ? input.devCheck.timing : null;
  const devCharged = dev ? dev.occupiedMs + dev.chargedGraceMs : 0;
  const ledgerCharged = entries.reduce(function (t, e) { return t + e.chargedMs; }, 0);
  const charged = ledgerCharged + devCharged;
  const waits = entries.reduce(function (t, e) { return t + (e.priorityWaitMs || 0); }, 0);
  const ceiling = ALLOCATION_MS + approved;
  const common = input.commonReader || null;
  return { entries: entries.map(function (e) {
    return { shard: e.shard, attemptId: e.attemptId, occupiedMs: e.occupiedMs, chargedMs: e.chargedMs, priorityWaitMs: e.priorityWaitMs, status: e.status, wrapperExit: e.wrapperExit };
  }), devCheck: dev ? { occupiedMs: dev.occupiedMs, chargedMs: devCharged, command: 'IG-S09/dev-check/command.json', priorityWait: devCheckWait(dev) } : null,
  chargedMs: charged, ledgerChargedMs: ledgerCharged, devCheckChargedMs: devCharged, allocationMs: ALLOCATION_MS, approvedExtraMs: approved, ceilingMs: ceiling,
  remainingMs: ceiling - charged,
  commonReader: common ? { reader: 'manifest.budgetState over records.collectCharges: ledger entries plus every command.json the ledger does not reference',
    chargedMs: common.chargedMs, approvedExtraMs: common.approvedExtraMs, remainingTaskMs: common.remainingTaskMs, includesDevCheckOnce: common.chargedMs === charged,
    equalToThisReport: common.chargedMs === charged && common.approvedExtraMs === approved } : null,
  priorityWait: { knownMs: waits, scope: 'the ' + entries.length + ' shard/control commands of the ledger only; their dispatcher-recorded waits',
    developmentCheck: dev ? devCheckWait(dev) : null, allTaskTotal: dev ? 'unknown: the development check\'s wait is not recorded; ' + waits + ' ms is not an all-task total' :
      waits + ' ms (no development check recorded)',
    note: 'priority waits are never charged' },
  approvals: (input.ledger.approvals || []).filter(function (a) { return a.task === TASK; }) };
}

// --- summary ----------------------------------------------------------------------------------------------------------------------------

const R2_CORRECTIONS = Object.freeze([
  { finding: 'IG-S09-ASTRA-F1', what: 'counter units and timing labels',
    code: 'new records no longer alias countSolutions calls to counts.dfsEntries (it stays null: node entries are not instrumented); each record carries gt.counterUnits',
    report: 'dfsCalls are countSolutions CALLS, dfsChecks are search-loop budget checks, UNIQUE_NODES counts budget checks (search-loop and propagation); CPU columns are the ' +
      'request total CPU (startup and cleanup included); the blanket "p95 is the observed maximum" is replaced (the maximum for n < 20, the second-largest at n = 20); the r1 records ' +
      'are annotated (counterInterpretation), not rewritten' },
  { finding: 'IG-S09-ASTRA-F2', what: 'failures are preserved and guards identified by evidence',
    code: 'a solver exception, contradiction, uniqueness-assuming proof or malformed report stops the G1 request (no retry through the native order) and the first failure keeps its ' +
      'code, site and ordinal; guard-binding-difference needs a recognised recorded guard code, otherwise mismatch; an unrecognised failure stops the diagnostic request',
    report: 'failures block; T01 is never "met" with a recorded stop; the recorded r1 results had 0 fallbacks and need no rerun' },
  { finding: 'IG-S09-ASTRA-F3', what: 'the diagnosis deadline',
    code: 'the allowance is 30 s from the diagnosis start (DIAG_GRACE_MS removed), bounded by the command deadline, with a margin inside it; the worker reports each piece of work before it ' +
      'starts, so unfinished (started, unknown) and unstarted (never reported) are kept apart and arrived rows survive a timeout',
    report: 'diagnosisDeadline block (with the longest recorded diagnosis wall); samples.json shows unfinished / unstarted per sample; the r1 results stand where every recorded diagnosis ' +
      'is inside the 30 s allowance (see diagnosisDeadline.reading)' },
  { finding: 'IG-S09-ASTRA-F4', what: 'executed probes versus reused coverage',
    code: 'none (the records already carry reusedFrom)',
    report: 'setup-probes-r2.json and the Setup probes section list the executed group checks and the reused copies apart, with donor and recipient request counts; the results are ' +
      'split the same way and a reused copy is never counted as an independent execution' },
  { finding: 'IG-S09-ASTRA-F5', what: 'wait provenance',
    code: 'the development check takes the caller\'s --requested-at and writes a null wait without it (never a fictitious 0)',
    report: 'machine.priorityWait: the ledger-recorded waits of the shard / control commands are a known partial figure, not an all-task total; the development check\'s wait is unknown; ' +
      'the charge is reconciled with the common budget reader (the development check is charged once)' }
]);

function buildSummary(input, ctx) {
  const levels = ctx.levels;
  const recs = ctx.recs;
  const done = recs.filter(completed);
  const censored = recs.filter(function (r) { return r.outcome !== 'complete' && r.outcome !== 'unstarted'; });
  const unstarted = recs.filter(function (r) { return r.outcome === 'unstarted'; });
  const physical = {};
  ['normal', 'nightmare'].forEach(function (level) {
    physical[level] = {};
    ['g0', 'g1'].forEach(function (arm) {
      physical[level][arm] = physicalWork(done.filter(function (r) { return r.level === level && r.gtArm === arm; }));
    });
  });
  const diffOf = function (level) {
    const a = physical[level].g0.signPasses.firstTechnique;
    const b = physical[level].g1.signPasses.firstTechnique;
    return { cohort: level, firstTechniquePass: { dfsCallsG0: a.dfsCalls, dfsCallsG1: b.dfsCalls, dfsCallsSavedBySkips: b.skippedDfs,
      dfsChecksG0: a.dfsChecks, dfsChecksG1: b.dfsChecks, restrictedSolvesG0: a.restrictedSolves, restrictedSolvesG1: b.restrictedSolves,
      extraRestrictedSolves: b.restrictedSolves - a.restrictedSolves,
      solvesOnCandidatesTheCountRejectsG1: b.g1.stuckAmbiguous, wallMsG0: a.wallMs, wallMsG1: b.wallMs,
      wallRatioG0OverG1: R.ratio(a.wallMs, b.wallMs), removalsG0: a.removals, removalsG1: b.removals },
    regression: b.restrictedSolves > a.restrictedSolves && b.dfsCalls >= a.dfsCalls ? 'G1 made more physical work in the first technique pass (more solves and no fewer count calls)' :
      (b.wallMs > a.wallMs ? 'the first technique pass took more wall time in G1 although it skipped ' + b.skippedDfs + ' count(s)' : 'no regression in the first technique pass') };
  };
  const times = { normal: timeTable(done, 'normal'), nightmare: timeTable(done, 'nightmare') };
  const controls = ctx.controls;
  const commandOf = function (shard) {
    const s = input.shards.find(function (x) { return x.shard === shard; });
    return s && s.commands.length > 0 ? s.commands[s.commands.length - 1] : null;
  };
  // the diagnosis worker's wall, split into the sample rows, the probes and the rest (worker start, load, messages); all post-timing
  const rowMs = sum(done, function (r) { return r.gt.diag ? sum(Object.keys(r.gt.diag.rows).filter(function (k) { return !r.gt.diag.rows[k].validationReusedFrom; }), function (k) { return r.gt.diag.rows[k].wallMs; }) : 0; });
  const probeMs = sum(done, function (r) { return r.gt.diag && r.gt.diag.probe && !r.gt.diag.probe.reusedFrom ? sum(r.gt.diag.probe.rows, function (g) { return g.wallMs; }) : 0; });
  const diagWall = sum(done, function (r) { return r.gt.diag ? r.gt.diag.wallMs : 0; });
  const diagCpu = sum(done, function (r) { return r.gt.diag ? r.gt.diag.cpuMs : 0; });
  const valWall = sum(done, function (r) { return r.validation ? r.validation.wallMs : 0; });
  const valCpu = sum(done, function (r) { return r.validation ? r.validation.cpuMs : 0; });
  const g1Cases = { tried: 0, proved: 0, stuckAmbiguous: 0, stuckUnique: 0, stoppedContradiction: 0, stoppedError: 0, stoppedUnsoundProof: 0, stoppedMalformed: 0 };
  done.filter(function (r) { return r.gtArm === 'g1'; }).forEach(function (r) {
    // r1 records name the four stop counters fallback* / unsoundProof (the code that retried them through the native order); g1Counter reads either name
    r.gt.capture.samples.forEach(function (s) { s.passes.forEach(function (p) { if (p.g1) Object.keys(g1Cases).forEach(function (k) { g1Cases[k] += G.g1Counter(p.g1, k); }); }); });
  });
  const stoppedTotal = g1Cases.stoppedContradiction + g1Cases.stoppedError + g1Cases.stoppedUnsoundProof + g1Cases.stoppedMalformed;
  const withCapture = recs.filter(function (r) { return r.gt && r.gt.capture; });
  const aliasEqual = withCapture.filter(function (r) { return r.counts && r.counts.dfsEntries === r.gt.capture.totals.dfsCalls; }).length;
  const errorDecisions = {};
  ['g0', 'g1'].forEach(function (arm) {
    errorDecisions[arm] = G.sumPasses(done.filter(function (r) { return r.gtArm === arm; }).reduce(function (t, r) { return t.concat(G.passesOf(r.gt.capture.samples)); }, [])).errors;
  });
  const failuresRecorded = withCapture.filter(function (r) { return r.gt.firstFailure || (r.gt.capture && r.gt.capture.firstFailure); }).map(function (r) {
    const f = r.gt.firstFailure || r.gt.capture.firstFailure;
    return { key: r.key, code: f.code, kind: f.kind, site: f.site, sampleOrdinal: f.sampleOrdinal, pass: f.pass, removal: f.removal, recognisedGuard: G.GUARD_CODES.indexOf(f.code) >= 0 };
  });
  const failures = { stoppedByG1: { total: stoppedTotal, contradiction: g1Cases.stoppedContradiction, error: g1Cases.stoppedError, unsoundProof: g1Cases.stoppedUnsoundProof,
    malformedReport: g1Cases.stoppedMalformed }, errorDecisionsInSignPasses: errorDecisions, firstFailuresRecorded: failuresRecorded,
  unrecognisedFirstFailures: failuresRecorded.filter(function (f) { return !f.recognisedGuard; }), censoredOrFailedRequests: censored.length,
  guardCodesRecognised: G.GUARD_CODES, stopCodes: G.STOP_CODES,
  reading: 'The r1 records were written by code that retried a G1 solver failure through the native order; they recorded the four counters as fallbackContradiction / ' +
    'fallbackError / fallbackShape / unsoundProof, all 0 in every pass, and no error decision in any sign pass, so no failure was converted into an ordinary rejection in ' +
    'these records. They carry no firstFailure field (new in the r2 code, which stops the request instead of retrying and records the first failure\'s code, site and ordinal)' };
  const counterInterpretation = { units: G.COUNTER_UNITS,
    recordedFieldCheck: { recordsWithACapture: withCapture.length, countsDfsEntriesEqualsCountSolutionsCalls: aliasEqual, differ: withCapture.length - aliasEqual,
      reading: 'In these records counts.dfsEntries is the count of countSolutions CALLS (capture.totals.dfsCalls), not depth-first node entries; node entries and the ' +
        'solver\'s own budget checks are not instrumented. The records are not rewritten; the r2 documents say dfsCalls / count calls' } };
  const diagnosisDeadline = { promisedMs: G.DIAG_BUDGET_MS, r1Implementation: 'the host allowed 30000 ms + DIAG_GRACE_MS (3000 ms) = 33 s from the start of the diagnosis',
    r2Implementation: 'the allowance is 30000 ms from the start of the diagnosis, bounded by the command deadline; worker start and a ' + RUN.DIAG_MARGIN_MS + ' ms margin are inside it; ' +
      'rows that arrived are kept; started work without a result is unfinished (unknown), work never reported started is unstarted',
    recorded: diagnosisCoverage(done), reading: diagnosisCoverage(done).longestDiagnosisWallMs < G.DIAG_BUDGET_MS ? 'The longest recorded diagnosis took ' + diagnosisCoverage(done).longestDiagnosisWallMs +
      ' ms, inside the 30 s allowance, so none of the recorded results can depend on the r1 grace and they stand' : 'A recorded diagnosis reached the 30 s allowance: results that may depend on the ' +
      'r1 grace are not established' };
  const cmd = input.shards.length > 0 ? input.shards[0].commands[0] : null;
  const commands = [];
  input.shards.forEach(function (s) { s.commands.forEach(function (c) { commands.push(c); }); });
  const sources = cmd ? { runtimeLabel: cmd.runtimeLabel, runtimeFingerprint: cmd.runtimeFingerprint, harnessFingerprints: Array.from(new Set(commands.map(function (c) {
    return c.harnessFingerprint;
  }))), adapterIds: cmd.adapterIds, adapterHashes: Array.from(new Set(commands.reduce(function (t, c) { return t.concat(c.adapterHashes || []); }, []))),
  sourceStable: commands.every(function (c) { return c.sourceStable === true; }), firewallClean: commands.every(function (c) { return c.firewallClean === true; }),
  node: cmd.machine ? cmd.machine.node : null, platform: cmd.machine ? cmd.machine.platform : null, cpuModel: cmd.machine ? cmd.machine.cpuModel : null,
  logicalProcessors: cmd.machine ? cmd.machine.logicalProcessors : null } : null;
  const parity = ctx.parity;
  const mach = machine(input);
  const split = ctx.missSplit.cohorts;
  const probes = ctx.probes;
  const unknownMinimality = ['normal', 'nightmare'].reduce(function (t, l) {
    return t + split[l].g0.split.trapUnknown + split[l].g1.split.trapUnknown;
  }, 0);
  const unconfirmed = ['normal', 'nightmare'].reduce(function (t, l) { return t + split[l].g0.split.unconfirmed + split[l].g1.split.unconfirmed; }, 0);
  return {
    schema: 'ig09-summary/2', task: TASK, round: input.round, evidenceStatus: C.EVIDENCE_PROVISIONAL, revision: ctx.revision || null,
    supersedes: 'summary.json (r1, preserved unchanged): the same recorded evidence, with the r2 corrections listed in r2Corrections',
    r2Corrections: R2_CORRECTIONS,
    title: 'IG-S09 Greater-Than miss predicate and solve-first diagnostic (provisional, pre-freeze; pre-MS07)',
    population: { normal: 'Greater-Than Normal, literal seeds 300-319 (20 paired requests)', nightmare: 'Greater-Than Nightmare, literal seeds 700-709 (10 paired ' +
      'requests)', request: 'trace SUMMARY (the historical diagnostic population), other options and defaults native; arm order alternates by seed index',
    controls: 'observer-free native Normal 300 and Nightmare 700, inside the runner and the priority wrapper' },
    coverage: { requestsRecorded: recs.length, completed: done.length, censoredOrFailed: censored.map(function (r) { return { key: r.key, outcome: r.outcome, scope: r.timeoutScope }; }),
      unstarted: unstarted.map(function (r) { return r.key; }), plannedPairs: 30, controlsRecorded: controls.length, population: ctx.coverage },
    arms: { g0: 'the native first-allowed sign pass with the capture', g1: 'the native restricted solve (assumeUniqueness false) first in the first technique sign ' +
      'pass of every sample only; a complete sound proof skips that candidate\'s DFS count; otherwise the native count and the original reason' },
    parity: { pairs: parity.pairs, controls: parity.controls.map(function (c) { return { pairId: c.pairId, verdict: c.verdict }; }) },
    physicalWork: physical, physicalDifference: [diffOf('normal'), diffOf('nightmare')], g1Results: g1Cases, failures: failures, counterInterpretation: counterInterpretation,
    generationTime: times, localStage: localStage(recs), guards: guardAccounting(done), observerOverhead: overheadRows(controls, recs, commandOf),
    diagnosisDeadline: diagnosisDeadline,
    diagnosisCost: { note: 'post-timing, outside every generation figure: an unpatched instance per request (rating, minimality, probes), separate from the harness\'s own ' +
      'final-puzzle validation, the observer-free controls and the development check; the CPU figures are the CPU of the whole call (worker start to termination)',
    diagnosisWallMs: r3(diagWall), diagnosisCpuTotalMs: r3(diagCpu),
      diagnosisSampleRowsWallMs: r3(rowMs), diagnosisProbeRowsWallMs: r3(probeMs), diagnosisWorkerStartAndOtherWallMs: r3(diagWall - rowMs - probeMs),
      validationWallMs: r3(valWall), validationCpuTotalMs: r3(valCpu),
      reuse: ['normal', 'nightmare'].map(function (l) { return { cohort: l, g0: split[l].g0.coverage, g1: split[l].g1.coverage }; }) },
    missSplit: split, minimality: { unknownEligible: unknownMinimality, unconfirmedSamples: unconfirmed }, probes: probes.coverage, probeResults: probes.results,
    machine: mach, sources: sources, writer: ctx.writer || null, historical: HISTORICAL
  };
}

// --- criteria and markdown ------------------------------------------------------------------------------------------------------------------

function criteria(s) {
  const out = [];
  const add = function (id, status, evidence) { out.push({ id: id, status: status, evidence: evidence }); };
  const pairsOk = s.parity.pairs.mismatch === 0;
  const splitCoverage = ['normal', 'nightmare'].map(function (l) {
    return l + ': G0 ' + s.missSplit[l].g0.split.samples + ' samples, G1 ' + s.missSplit[l].g1.split.samples;
  }).join('; ');
  const pop = s.coverage.population;
  const scope = 'scoped to the recorded requests (Normal ' + pop.normal.pairsRecorded + '/' + pop.normal.pairsPlanned + ' pairs, Nightmare ' + pop.nightmare.pairsRecorded + '/' +
    pop.nightmare.pairsPlanned + ' pairs); no global G1 winner and no production adoption follows';
  add('B01', 'met for the recorded requests', 'miss-split.json: the exact predicate "' + PREDICATE + '", cheap clauses before minimality; ' + splitCoverage + '; minimality unknown for ' +
    s.minimality.unknownEligible + ' eligible and ' + s.minimality.unconfirmedSamples + ' unconfirmed samples (denominators and unknowns are in the tables); ' + scope);
  add('B02', 'met for the recorded requests', 'whole-pass and whole-request physical countSolutions calls / search-loop budget checks / restricted solves / skips, per removal, per pass and per request, in the Physical work tables; ' +
    'node entries and the solver\'s own checks are not instrumented; no saving is inferred from a per-probe cost; ' + scope);
  add('B03', 'met', 'a diagnostic only: no guided pool, setup-clue policy change or IR29 adoption is made or authorised; G1 is a private in-memory order; ' + scope);
  const g1r = s.g1Results;
  const stopped = s.failures.stoppedByG1.total;
  const unexpected = s.failures.unrecognisedFirstFailures.length + stopped + s.failures.errorDecisionsInSignPasses.g0 + s.failures.errorDecisionsInSignPasses.g1;
  add('T01', unexpected === 0 ? 'met for the recorded requests' : 'NOT met (failures or stops recorded)',
    'G1 skipped ' + g1r.proved + ' count(s) only after a complete, non-uniqueness-assuming proof; stuck ' + (g1r.stuckAmbiguous + g1r.stuckUnique) +
    ' (native count run); stops by the G1 oracle: contradiction ' + g1r.stoppedContradiction + ', solver error ' + g1r.stoppedError + ', uniqueness-assuming proof ' + g1r.stoppedUnsoundProof +
    ', malformed report ' + g1r.stoppedMalformed + '; error decisions in the sign passes G0 ' + s.failures.errorDecisionsInSignPasses.g0 + ', G1 ' + s.failures.errorDecisionsInSignPasses.g1 +
    '; unrecognised first failures ' + s.failures.unrecognisedFirstFailures.length + ' (a failure is preserved with its code, site and ordinal and stops the request; it is never retried ' +
    'through the native order and never counted as met). The r1 records were produced by the retrying code and recorded 0 in every such counter');
  add('T02', pairsOk ? 'met for the recorded pairs' : 'NOT met', 'pairs: ' + JSON.stringify(s.parity.pairs) + '; a guard-binding-difference is classified apart, never counted as identity; ' +
    'the eight unstarted request rows have no identity result');
  const missing = pop.unstartedRows.length;
  add('T03', missing > 0 ? 'PARTIAL' : 'met', 'Normal ' + pop.normal.pairsRecorded + '/' + pop.normal.pairsPlanned + ' pairs; Nightmare ' + pop.nightmare.pairsRecorded + '/' + pop.nightmare.pairsPlanned +
    ' pairs; ' + missing + ' experimental request rows unstarted (' + (missing > 0 ? seedsText(pop) : 'none') + '; budget-limited by the pack author\'s ruling, not excluded, ' +
    'failed or replaced); the controls (' + pop.controls.recorded + '/' + pop.controls.planned + ') are a separate population. Every recorded sample, setup origin, local stage and ' +
    'capped / unknown check is accounted for in samples.json and miss-split.json; unstarted or timed-out rows stay unconfirmed');
  add('T04', 'met', 'generation wall (ready to decision) and total CPU (startup and cleanup included) per request, and the diagnosis / validation wall and total CPU of their calls, are separate ' +
    'fields (Diagnosis cost); the stage time split names full-grid / model setup, setup-clue placement, the sign passes, tuning and the local search apart');
  const ctl = s.observerOverhead;
  const ok = ctl.filter(function (c) { return c.compatible === true; });
  add('T05', ctl.length === 0 ? 'PENDING' : (ok.length === pop.controls.planned ? 'met for the coverage established' : 'PARTIAL'),
    ctl.length + ' of ' + pop.controls.planned + ' singleton observer-free controls recorded, ' + ok.length + ' compatible with their captured G0 (source, trace, configuration, output digests); ' +
    'two singletons do not establish population-wide overhead and do not justify correcting any G1 timing; capture build time is reported; no instrumented number is called an uninstrumented headline');
  return out;
}

function seedsText(pop) {
  const by = {};
  pop.unstartedRows.forEach(function (r) {
    if (!by[r.level]) by[r.level] = [];
    if (by[r.level].indexOf(r.seed) < 0) by[r.level].push(r.seed);
  });
  return Object.keys(by).map(function (l) { return l.charAt(0).toUpperCase() + l.slice(1) + ' seeds ' + by[l].join(', '); }).join('; ');
}

function tableText(headers, rows) {
  const line = function (cells) { return '| ' + cells.map(function (c) { return String(c === null || c === undefined ? 'n/a' : c).replace(/\|/g, '/'); }).join(' | ') + ' |'; };
  return [line(headers), line(headers.map(function () { return '---'; }))].concat(rows.map(line)).join('\n');
}

function renderMarkdown(s) {
  const L = [];
  L.push('# ' + s.title, '');
  L.push('**' + R.PROVISIONAL_NOTICE + '**', '');
  L.push('Pre-MS07: the catalogue, floors and search may change when difficulty-v3 freezes. Every figure is an instrumented diagnostic (trace summary, capture hooks); none ' +
    'is an uninstrumented headline.', '');
  if (s.revision && s.revision !== 'r1') {
    L.push('## Revision ' + s.revision + ': corrections after the pack-author review (r1 files are preserved unchanged)', '');
    L.push(s.supersedes + '.', '');
    s.r2Corrections.forEach(function (c) { L.push('- **' + c.finding + '** (' + c.what + '). Code: ' + c.code + '. Report: ' + c.report + '.'); });
    L.push('');
  }
  L.push('## Coverage', '');
  const pop = s.coverage.population;
  L.push('- Experimental pairs: Normal ' + pop.normal.pairsRecorded + ' of ' + pop.normal.pairsPlanned + ', Nightmare ' + pop.nightmare.pairsRecorded + ' of ' + pop.nightmare.pairsPlanned +
    ' (recorded and completed; **partial, budget-limited**). Requests recorded ' + s.coverage.requestsRecorded + ', completed ' + s.coverage.completed + ', censored or failed ' +
    s.coverage.censoredOrFailed.length + ', unstarted ' + pop.unstartedRows.length + ' of the 60 planned request rows' + (pop.unstartedRows.length > 0 ? ' (' + seedsText(pop) +
    ': **unstarted**, not excluded, failed or replaced; the pack author ruled that they are not finished in this pre-freeze round)' : '') + '.');
  L.push('- Observer-free controls (a separate population): ' + pop.controls.recorded + ' of ' + pop.controls.planned + ' recorded.');
  s.coverage.censoredOrFailed.forEach(function (c) { L.push('  - ' + c.key + ': ' + c.outcome + (c.scope ? ' (' + c.scope + ')' : '')); });
  L.push('- Population: ' + s.population.normal + '; ' + s.population.nightmare + '. ' + s.population.request + '.', '');
  L.push('Direction of every comparison below: **G0 / G1** (a value below 1 means G1 took longer). Ratios of cohort totals and paired summaries (medians of per-pair ratios) are labelled apart.', '');
  L.push('## G0 / G1 identity and parity (order-parity.json)', '');
  L.push('Pairs: ' + JSON.stringify(s.parity.pairs) + '. Controls (observer-free native against the captured G0): ' + (s.parity.controls.length === 0 ? 'none recorded' :
    s.parity.controls.map(function (c) { return c.pairId + ' ' + c.verdict; }).join('; ')) + '.', '');
  L.push('## Physical work (cumulative over the completed requests; per-pass figures per pass)', '');
  L.push('Units: **count calls** = calls of `countSolutions` (one per uniqueness count; **not** depth-first node entries, which are not instrumented; the r1 records\' `counts.dfsEntries` ' +
    'holds this number); **search-loop checks** = budget checks of the depth-first search loop (propagation checks are not included); **restricted solves** = calls of the allowed-set ' +
    'solve; **skipped counts** = counts skipped by a complete sound proof (G1 only). The solver\'s own budget checks are not instrumented.', '');
  ['normal', 'nightmare'].forEach(function (level) {
    const g0 = s.physicalWork[level].g0;
    const g1 = s.physicalWork[level].g1;
    L.push('### ' + level + ' (G0: ' + g0.requests + ' requests, ' + g0.samples + ' dug samples; G1: ' + g1.requests + ' requests, ' + g1.samples + ' dug samples)', '');
    const rows = [];
    ['firstTechnique', 'laterTechnique', 'minimal', 'all'].forEach(function (k) {
      [['G0', g0], ['G1', g1]].forEach(function (a) {
        const t = a[1].signPasses[k];
        rows.push([k, a[0], t.passes, t.removals, t.dfsCalls, t.dfsChecks, t.restrictedSolves, t.skippedDfs, t.perRemoval.dfsCalls, t.perRemoval.dfsChecks,
          t.perRemoval.restrictedSolves, t.perPass.dfsCalls, msText(t.wallMs)]);
      });
    });
    L.push(tableText(['sign passes', 'arm', 'passes', 'removals', 'count calls', 'search-loop checks', 'restricted solves', 'skipped counts', 'count calls / removal',
      'checks / removal', 'solves / removal', 'count calls / pass', 'pass wall'], rows), '');
    L.push(tableText(['per request (completed)', 'arm', 'count calls p50 / p95 / max', 'search-loop checks p50 / p95 / max', 'restricted solves p50 / p95 / max', 'removals p50 / p95 / max'],
      [['G0', g0], ['G1', g1]].map(function (a) {
        const p = a[1].perRequest;
        const f = function (d) { return d.p50 + ' / ' + d.p95 + ' / ' + d.max; };
        return ['n = ' + p.dfsCalls.n, a[0], f(p.dfsCalls), f(p.dfsChecks), f(p.restrictedSolves), f(p.removals)];
      })), '');
    L.push('Cumulative over the whole request (setup help, passes, tuning, keeper counts, safety count, local search): G0 count calls ' + g0.cumulativeOverTheRequest.dfsCalls +
      ', search-loop checks ' + g0.cumulativeOverTheRequest.dfsChecks + ', solves ' + g0.cumulativeOverTheRequest.restrictedSolves + '; G1 ' + g1.cumulativeOverTheRequest.dfsCalls + ', ' +
      g1.cumulativeOverTheRequest.dfsChecks + ', ' + g1.cumulativeOverTheRequest.restrictedSolves + '. (The nearest-rank p95 is the maximum only for n < 20 and the second-largest value at n = 20.)', '');
  });
  L.push('G1 against G0, first technique pass (the only pass G1 changes; wall ratio is G0 / G1):', '');
  L.push(tableText(['cohort', 'count calls G0', 'count calls G1', 'counts skipped by proof', 'solves G0', 'solves G1', 'extra solves', 'solves on candidates the count rejects', 'pass wall G0',
    'pass wall G1', 'wall ratio G0 / G1', 'regression'], s.physicalDifference.map(function (d) {
    const f = d.firstTechniquePass;
    return [d.cohort, f.dfsCallsG0, f.dfsCallsG1, f.dfsCallsSavedBySkips, f.restrictedSolvesG0, f.restrictedSolvesG1, f.extraRestrictedSolves, f.solvesOnCandidatesTheCountRejectsG1,
      msText(f.wallMsG0), msText(f.wallMsG1), f.wallRatioG0OverG1 === null ? 'n/a' : r3(f.wallRatioG0OverG1), d.regression];
  })), '');
  L.push('G1 results over all first technique passes (' + s.g1Results.tried + ' questions): ' + JSON.stringify(s.g1Results) + '.', '');
  L.push('## Failures and stops (IG-S09-ASTRA-F2)', '');
  L.push('Stops by the G1 oracle: ' + JSON.stringify(s.failures.stoppedByG1) + '; error decisions in the sign passes: ' + JSON.stringify(s.failures.errorDecisionsInSignPasses) +
    '; first failures recorded: ' + s.failures.firstFailuresRecorded.length + ' (unrecognised ' + s.failures.unrecognisedFirstFailures.length + '); censored or failed requests: ' +
    s.failures.censoredOrFailedRequests + '. ' + s.failures.reading + '.', '');
  L.push('## Counter units (IG-S09-ASTRA-F1)', '');
  L.push(tableText(['counter', 'unit'], Object.keys(s.counterInterpretation.units).map(function (k) { return [k, s.counterInterpretation.units[k]]; })), '');
  const cf = s.counterInterpretation.recordedFieldCheck;
  L.push('Recorded field check: ' + cf.recordsWithACapture + ' records with a capture; `counts.dfsEntries` equals the count of `countSolutions` calls in ' + cf.countsDfsEntriesEqualsCountSolutionsCalls +
    ' of them (differs in ' + cf.differ + '). ' + cf.reading + '.', '');
  L.push('## Generation time (request wall ready-to-decision, and total CPU; instrumented)', '');
  L.push('Wall is ready to decision. **Total CPU** is the CPU of the whole request from worker start to cleanup (startup and cleanup included); it is not the CPU from ready to decision.', '');
  ['normal', 'nightmare'].forEach(function (level) {
    const t = s.generationTime[level];
    L.push('### ' + level + ' (' + t.pairsCompleted + ' completed pairs)', '');
    L.push(tableText(['arm', 'ready wall p50 / p95 / max', 'total CPU (startup and cleanup included) p50 / p95 / max', 'sum ready wall', 'sum total CPU'], [['G0', t.g0], ['G1', t.g1]].map(function (a) {
      return [a[0], msText(a[1].readyWallMs.p50) + ' / ' + msText(a[1].readyWallMs.p95) + ' / ' + msText(a[1].readyWallMs.max), msText(a[1].cpuTotalMs.p50) + ' / ' +
        msText(a[1].cpuTotalMs.p95) + ' / ' + msText(a[1].cpuTotalMs.max), sec(a[1].sumReadyWallMs), sec(a[1].sumCpuTotalMs)];
    })), '');
    const tot = t.ratioOfCohortTotals;
    const rt = function (x) { return x === null || x === undefined ? 'unknown' : r3(x); };
    L.push('**Ratio of cohort totals (G0 / G1)**: sum of ready wall ' + sec(tot.numeratorMs.readyWallG0) + ' / ' + sec(tot.denominatorMs.readyWallG1) + ' = ' + rt(tot.readyWallSumG0OverSumG1) +
      '; sum of total CPU ' + sec(tot.numeratorMs.cpuG0) + ' / ' + sec(tot.denominatorMs.cpuG1) + ' = ' + rt(tot.cpuSumG0OverSumG1) + ' (the total-CPU ratio). ' + tot.note + '.', '');
    L.push('**Paired summary (G0 / G1 per pair)**: median per-pair ready-wall ratio ' + rt(t.paired.perPairReadyWallRatioG0OverG1.p50) + ' (n = ' + t.paired.perPairReadyWallRatioG0OverG1.n +
      '), median per-pair total-CPU ratio ' + rt(t.paired.perPairCpuRatioG0OverG1.p50) + ' (n = ' + t.paired.perPairCpuRatioG0OverG1.n + '); G0 ran first in ' + t.paired.g0RanFirst.pairs +
      ' pairs (median ' + rt(t.paired.g0RanFirst.medianPerPairReadyWallRatioG0OverG1) + '), G1 first in ' + t.paired.g1RanFirst.pairs + ' (median ' +
      rt(t.paired.g1RanFirst.medianPerPairReadyWallRatioG0OverG1) + '). ' + t.paired.note + '.', '');
    const st = t.stageSplitSumMs;
    L.push(tableText(['stage (summed over the completed pairs)', 'G0', 'G1', 'G1 - G0'], Object.keys(st.g0).map(function (k) {
      return [k, msText(st.g0[k]), msText(st.g1[k]), msText(st.g1MinusG0[k])];
    })), '');
    L.push(st.reading + '.', '');
  });
  L.push('## Local-stage time by cohort and arm (measured, not the request-group share)', '');
  L.push('Numerator: the local-search samples\' spans; every denominator: the engine run (worker wall) of the same completed requests. Validation, probes, controls and the development check are not in it.', '');
  const lrows = [];
  ['normal', 'nightmare'].forEach(function (level) {
    ['g0', 'g1'].forEach(function (arm) {
      const l = s.localStage[level][arm];
      lrows.push([level, arm.toUpperCase(), l.requests, l.requestsWithALocalSearch, l.requestsWithACappedLocalSearch,
        pct(l.measuredLocalStageShareOfAllRequestTime.numerator, l.measuredLocalStageShareOfAllRequestTime.denominator),
        pct(l.requestGroupShareOfTimeOfRequestsWithACappedLocal.numerator, l.requestGroupShareOfTimeOfRequestsWithACappedLocal.denominator),
        pct(l.measuredLocalStageShareInsideThoseRequests.numerator, l.measuredLocalStageShareInsideThoseRequests.denominator), JSON.stringify(l.localSearchEndReasons)]);
    });
  });
  L.push(tableText(['cohort', 'arm', 'completed requests', 'with a local search', 'with a capped one', 'measured local-stage share of all engine time (ms)',
    'request-group share: engine time of requests with a capped local search (ms)', 'local-stage share inside those requests (ms)', 'local search end reasons'], lrows), '');
  L.push('Historical (MS05e, a different instrument): ' + HISTORICAL.cappedLocalRequestGroupShareOfTime + '.', '');
  L.push('## Miss split (exact predicate; miss-split.json)', '');
  L.push('Named trap: ' + PREDICATE + '.', '');
  ['normal', 'nightmare'].forEach(function (level) {
    L.push('### ' + level, '');
    const rows = [];
    G.BUCKETS.forEach(function (b) {
      rows.push([b, pct(s.missSplit[level].g0.split.buckets[b], s.missSplit[level].g0.split.samples), pct(s.missSplit[level].g1.split.buckets[b], s.missSplit[level].g1.split.samples)]);
    });
    L.push(tableText(['bucket (disjoint)', 'G0 share of dug samples', 'G1 share of dug samples'], rows), '');
    ['g0', 'g1'].forEach(function (arm) {
      const x = s.missSplit[level][arm];
      const sp = x.split;
      L.push('- ' + arm.toUpperCase() + ': named trap lower ' + pct(sp.trapLowerShareOfMisses.numerator, sp.trapLowerShareOfMisses.denominator) + ' of the misses, upper ' +
        pct(sp.trapUpperShareOfMisses.numerator, sp.trapUpperShareOfMisses.denominator) + '; minimality asked for ' + sp.minimalityCoverage.requiredForTrap + ' eligible sample(s) ' +
        '(decided ' + sp.minimalityCoverage.decided + ', unknown ' + sp.minimalityCoverage.unknown + '); cheap clue-floor clause true for ' +
        pct(x.eligibleBeforeMinimality.cheapFloorClauseTrue.numerator, x.eligibleBeforeMinimality.cheapFloorClauseTrue.denominator) + ' of the samples; below the band and at the ' +
        'floor (needing a proof) ' + pct(x.eligibleBeforeMinimality.belowAndFloorClause.numerator, x.eligibleBeforeMinimality.belowAndFloorClause.denominator) + '; diagnosis ' +
        JSON.stringify(x.coverage.diagnosisStatuses) + ', reused samples ' + x.coverage.reusedSamples + ', unstarted ' + x.coverage.unstartedSamples + ', unfinished ' +
        x.coverage.unfinishedSamples + '.');
    });
    L.push('');
  });
  L.push('Historical Normal 300-319 (MS05e before; not a substitute): ' + HISTORICAL.samples + ' dug samples, ' + HISTORICAL.misses + ' misses, named trap ' + HISTORICAL.trapShareOfMisses +
    ', setup two or more above the floor ' + HISTORICAL.setupTwoAbove + ', below after a tune reveal ' + HISTORICAL.belowAfterTuneReveal + '.', '');
  L.push('Setup origins (clue-floor rule, unit-floor rule, solvability help; an origin is not proof of present necessity), over all dug samples of the Normal cohort:', '');
  L.push(tableText(['arm', 'groups clue-floor / unit-floor / help / tune', 'cells clue-floor / unit-floor / help / tune', 'samples with unit-floor groups', 'samples with help groups',
    'below+setup2 excess from'], ['g0', 'g1'].map(function (arm) {
    const o = s.missSplit.normal[arm].setupOrigins;
    const a = o.allSamples;
    return [arm, [a.groups['clue-floor'], a.groups['unit-floor'], a.groups.help, a.groups.tune].join(' / '), [a.cells['clue-floor'], a.cells['unit-floor'], a.cells.help,
      a.cells.tune].join(' / '), a.samplesWithGroupsOf['unit-floor'], a.samplesWithGroupsOf.help, JSON.stringify(o.belowSetup2ExcessOrigin)];
  })), '');
  L.push('## Setup probes (limited counterfactual, setup-probes-r2.json): executed group checks and reused copies, apart', '');
  const pc = s.probes;
  L.push('Requests with a probe: ' + pc.requestsWithProbeRows + ' of ' + pc.requests + ' (first missed sample with above-floor groups): **' + pc.requestsThatExecutedAProbe +
    ' requests executed their probe** (' + pc.groupRowsExecuted + ' executed group checks) and **' + pc.requestsThatReusedAProbe + ' requests reused a donor\'s rows** (' + pc.groupRowsReusedCopies +
    ' reused copies; ' + pc.donorRequestsReusedByAnother + ' distinct donor requests). The ' + pc.groupRowsListed + ' listed rows are ' + pc.groupRowsExecuted + ' executed plus ' + pc.groupRowsReusedCopies +
    ' reused copies, **not ' + pc.groupRowsListed + ' independent executions**; done ' + pc.groupRowsDone + ', not done ' + pc.groupRowsNotDone + '. ' + pc.note + '.', '');
  const pr = s.probeResults;
  const prow = function (name, t) {
    return [name, t.groupRows, t.done, t.blockedByRule.clueFloor + ' / ' + t.blockedByRule.unitFloor + ' / ' + t.blockedByRule.neither,
      t.uniquenessAfterRemoval.unique + ' / ' + t.uniquenessAfterRemoval.notUnique + ' / ' + t.uniquenessAfterRemoval.unknown,
      t.solveAfterRemoval.solved + ' / ' + t.solveAfterRemoval.stuck + ' / ' + t.solveAfterRemoval.contradiction + ' / ' + t.solveAfterRemoval.unknownOrError];
  };
  L.push(tableText(['rows', 'group rows', 'done', 'blocked by clue-floor / unit-floor / neither rule', 'after removal: unique / not unique / unknown',
    'solve after removal: solved / stuck / contradiction / unknown or error'], [prow('executed (the observations)', pr.executed), prow('reused copies (repeats of a donor row)', pr.reusedCopies)]), '');
  L.push(pr.reading + '.', '');
  L.push('## Internal guards (per arm, completed requests)', '');
  ['g0', 'g1'].forEach(function (arm) {
    const g = s.guards[arm];
    L.push('### ' + arm.toUpperCase() + ' (' + g.requests + ' requests, ' + g.dugSamples + ' dug samples)', '');
    L.push(tableText(['guard', 'limit', 'observed', 'which guard bound'], [
      ['sign-pass count and restricted solve', g.signPassCountAndSolve.limit, g.signPassCountAndSolve.consumption + '; ' + g.signPassCountAndSolve.bounds, g.signPassCountAndSolve.guardThatBound],
      [g.uniquenessCountSlice.name, g.uniquenessCountSlice.limit, g.uniquenessCountSlice.calls + ' counts, ' + g.uniquenessCountSlice.budgetChecksUsedCumulative + ' budget checks in all, largest single ' +
        g.uniquenessCountSlice.largestSingleCountBudgetChecks + ', trips ' + g.uniquenessCountSlice.trips, g.uniquenessCountSlice.guardThatBound],
      ['safety uniqueness count', g.safetyUniquenessCount.limit, g.safetyUniquenessCount.consumption, g.safetyUniquenessCount.guardThatBound],
      [g.stageBObjective.name, g.stageBObjective.limit, g.stageBObjective.entriesObserved + ' entries; ' + g.stageBObjective.consumption, g.stageBObjective.guardThatBound],
      [g.attemptCaps.name, '1024 / 32768 / 256', g.attemptCaps.attempts + ' attempts; most ratings ' + g.attemptCaps.ratingsMax + ', most proposals ' + g.attemptCaps.proposalsMax +
        '; local-search cap reasons ' + JSON.stringify(g.attemptCaps.capHits), 'see the local-stage section']]), '');
  });
  L.push('## Observer overhead (two singleton controls; ratio = captured G0 / observer-free control)', '');
  const rtx = function (x) { return x === null || x === undefined ? 'unknown' : r3(x); };
  L.push(tableText(['control', 'status', 'control ready wall', 'G0 ready wall', 'difference (G0 - control)', 'ratio G0 / control', 'control total CPU', 'G0 total CPU', 'total-CPU ratio G0 / control',
    'G0 capture build'], s.observerOverhead.map(function (o) {
    return [o.control, o.status, msText(o.controlReadyWallMs), msText(o.g0ReadyWallMs), msText(o.readyWallDifferenceMs), rtx(o.readyWallRatioG0OverControl), msText(o.controlCpuTotalMs),
      msText(o.g0CpuTotalMs), rtx(o.cpuRatioG0OverControl), msText(o.g0CaptureBuildMs)];
  })), '');
  L.push('Compatibility of each control with its captured G0 (source, trace, configuration, output digests):', '');
  L.push(tableText(['control', 'runtime fingerprint equal', 'harness fingerprint equal', 'trace (control / G0)', 'configuration equal', 'output digests equal', 'exactness equal',
    'adapters (control / G0)', 'ran under the wrapper lock', 'compatible'], s.observerOverhead.filter(function (o) { return o.compatibility; }).map(function (o) {
    const c = o.compatibility;
    return [o.control, c.runtimeFingerprint.equal, c.harnessFingerprint.equal, c.trace.control + ' / ' + c.trace.g0, c.configuration.equal, c.outputDigests.equal, c.exactness.equal,
      JSON.stringify(c.instrumentation.control) + ' / ' + JSON.stringify(c.instrumentation.g0), c.priorityWrapper.control, o.compatible];
  })), '');
  L.push('Each control is a singleton, time-separated from its G0 request (another command at another time). Two singletons do not establish population-wide overhead; no statement ' +
    'about uninstrumented latency in general follows and no G1 timing is corrected with them. The control requests are not cohort observations.', '');
  L.push('## Diagnosis and validation cost (post-timing, outside every generation figure; controls and the development check are separate)', '');
  L.push('Diagnosis worker (rating, minimality, probes) on the recorded requests: wall ' + sec(s.diagnosisCost.diagnosisWallMs) + ' (sample rows ' + sec(s.diagnosisCost.diagnosisSampleRowsWallMs) +
    ', probe rows ' + sec(s.diagnosisCost.diagnosisProbeRowsWallMs) + ', worker start and other ' + sec(s.diagnosisCost.diagnosisWorkerStartAndOtherWallMs) + '), total CPU of the calls ' +
    sec(s.diagnosisCost.diagnosisCpuTotalMs) + '. Harness final-puzzle validation: wall ' + sec(s.diagnosisCost.validationWallMs) + ', total CPU ' + sec(s.diagnosisCost.validationCpuTotalMs) + '.', '');
  const dd = s.diagnosisDeadline;
  L.push('Diagnosis allowance (IG-S09-ASTRA-F3): promised ' + sec(dd.promisedMs) + '. r1 code: ' + dd.r1Implementation + '. r2 code: ' + dd.r2Implementation + '. Recorded diagnoses: ' +
    JSON.stringify(dd.recorded) + '. ' + dd.reading + '.', '');
  L.push('## Machine time', '');
  L.push(tableText(['command', 'attempt', 'occupied', 'charged (+45 s grace)', 'priority wait (not charged)', 'status'], s.machine.entries.map(function (e) {
    return [e.shard, e.attemptId, sec(e.occupiedMs), sec(e.chargedMs), sec(e.priorityWaitMs), e.status];
  })), '');
  const mc = s.machine;
  L.push('Charged ' + sec(mc.chargedMs) + ' of the ' + sec(mc.ceilingMs) + ' ceiling (allocation ' + sec(mc.allocationMs) + ' + approved extra ' + sec(mc.approvedExtraMs) +
    ': ' + mc.approvals.map(function (a) { return a.by; }).join('; ') + '): the ' + mc.entries.length + ' ledger commands ' + sec(mc.ledgerChargedMs) + (mc.devCheck ? ' plus the development check (' +
    sec(mc.devCheck.occupiedMs) + ' occupied + grace) ' + sec(mc.devCheckChargedMs) + ', charged once' : '') + '; remaining ' + sec(mc.remainingMs) + '.' + (mc.commonReader ?
    ' The common budget reader (' + mc.commonReader.reader + ') gives charged ' + sec(mc.commonReader.chargedMs) + ', remaining ' + sec(mc.commonReader.remainingTaskMs) +
    (mc.commonReader.equalToThisReport ? ': equal to this report, the development check is not charged twice.' : ': DIFFERS from this report.') : ''), '');
  L.push('Priority waits (never charged): the ' + mc.entries.length + ' shard / control commands recorded **' + sec(mc.priorityWait.knownMs) + '** in all (' + mc.priorityWait.scope + '). This is the ' +
    'known partial figure, **not an all-task total**: ' + (mc.priorityWait.developmentCheck ? 'the development check\'s wait is ' + mc.priorityWait.developmentCheck.status + ': ' +
    (mc.priorityWait.developmentCheck.reason || mc.priorityWait.developmentCheck.status) : 'no development check recorded') + '.', '');
  L.push('## Acceptance criteria', '');
  L.push(tableText(['id', 'status', 'evidence'], s.criteria.map(function (k) { return [k.id, k.status, k.evidence]; })), '');
  if (s.sources) {
    L.push('## Sources', '');
    L.push(tableText(['item', 'value'], [['runtime label (supplied)', s.sources.runtimeLabel], ['runtime fingerprint', s.sources.runtimeFingerprint], ['harness fingerprints of the commands',
      s.sources.harnessFingerprints.join(', ')], ['writer (aggregator) fingerprint of this report, revision ' + (s.writer ? s.writer.revision : 'n/a'), s.writer ? s.writer.harnessFingerprint : 'n/a'],
    ['aggregator file sha-256', s.writer ? s.writer.aggregatorSha256 : 'n/a'], ['adapters', (s.sources.adapterIds || []).join(', ')], ['adapter hashes', s.sources.adapterHashes.join(', ')],
    ['sources stable', s.sources.sourceStable], ['firewall clean', s.sources.firewallClean], ['node', s.sources.node], ['platform', s.sources.platform], ['cpu', s.sources.cpuModel + ' (' +
      s.sources.logicalProcessors + ' logical processors)']]), '');
  }
  if (s.deviations.length > 0) {
    L.push('## Deviations and disclosures', '');
    s.deviations.forEach(function (d) { L.push('- ' + d); });
    L.push('');
  }
  return C.normaliseText(L.join('\n'));
}

// --- the documents ----------------------------------------------------------------------------------------------------------------------------

function populationCoverage(input, recs, controls) {
  const manifest = M.buildManifest(TASK, input.round);
  const recorded = new Set(recs.filter(function (r) { return r.outcome !== 'unstarted'; }).map(function (r) { return r.key; }));
  const planned = manifest.jobs.filter(function (j) { return j.cellKind !== 'control'; });
  const unstarted = planned.filter(function (j) { return !recorded.has(j.key); });
  const pairsOf = function (level) {
    const mine = recs.filter(function (r) { return r.level === level && completed(r); });
    const ids = new Set(mine.map(function (r) { return r.pairId; }));
    let n = 0;
    ids.forEach(function (id) {
      if (mine.some(function (r) { return r.pairId === id && r.gtArm === 'g0'; }) && mine.some(function (r) { return r.pairId === id && r.gtArm === 'g1'; })) n++;
    });
    return n;
  };
  const plannedPairs = function (level) {
    return new Set(planned.filter(function (j) { return j.level === level; }).map(function (j) { return j.pairId; })).size;
  };
  const controlJobs = manifest.jobs.filter(function (j) { return j.cellKind === 'control'; });
  return { normal: { pairsRecorded: pairsOf('normal'), pairsPlanned: plannedPairs('normal') },
    nightmare: { pairsRecorded: pairsOf('nightmare'), pairsPlanned: plannedPairs('nightmare') },
    unstartedRows: unstarted.map(function (j) { return { key: j.key, level: j.level, seed: j.requestSeed, arm: j.gtArm }; }),
    unstartedSeeds: Array.from(new Set(unstarted.map(function (j) { return j.level + ' ' + j.requestSeed; }))),
    controls: { planned: controlJobs.length, recorded: controls.filter(function (c) { return c.outcome === 'complete'; }).length },
    note: 'unstarted rows are planned and never started (budget-limited by the pack author\'s ruling): not excluded, not failed, not replaced' };
}

function disclosures(revision) {
  const rev = revision || 'r1';
  const list = [
    'Partial, budget-limited diagnostic: Nightmare seeds 706-709 (eight request rows) were never started; the pack author ruled that they are not finished in this pre-freeze round. ' +
      'Normal 300-319 is complete (20 of 20 pairs); Nightmare is 6 of 10 pairs. Conclusions are scoped to the recorded requests: no global G1 winner, no production adoption.',
    'Proof reuse is symmetric: whichever arm of a pair runs first is diagnosed in full and the other reuses a row only when the full canonical input (level, solution, givens, signs), ' +
      'the runtime fingerprint and the guard settings match; the donor is recorded per sample (validationReusedFrom). An unreached row stays unknown (unconfirmed). Accepted by the pack author.',
    'Three development-check requests (Normal seed 300: G0, G1 and an observer-free native request, command IG-S09/dev-check, charged 52.04 s) validated the instrumentation before the shards; ' +
      'they are not cohort observations and not substitutes for the controls, and they are in no table.',
    'The catalogue is taken from the ready message of the first request of each command (no separate probe); the sources were fingerprint-checked and the adapter transforms dry-run before ' +
      'any generation. Accepted by the pack author.',
    'The observer-free controls ran in their own command (observer-control) under the harness fingerprint of the shards (no harness edit between the shards and the controls), inside the runner ' +
      'and the priority wrapper; they are singletons and a separate population.',
    'Reporting writer revision ' + rev + ': this report was written after the commands; the aggregator is a harness file, so the writer fingerprint differs from the fingerprint the commands recorded ' +
      '(both are in Sources). Raw records are unchanged. Pure tests, plan-only runs, the transform dry-run and the aggregator dry runs ran unwrapped (no engine, no worker thread).',
    'Counters: count calls are calls of countSolutions (the r1 records alias them to counts.dfsEntries; they are not node entries); search-loop checks exclude propagation checks; ' +
      'UNIQUE_NODES counts budget checks; node entries, propagation checks and the solver\'s own budget checks are not instrumented (null), never zero.'
  ];
  if (rev !== 'r1') {
    list.push('The recorded requests ran under the harness fingerprint(s) in Sources, before the r2 code changes: their G1 oracle retried a solver failure through the native order (the ' +
      'recorded counters show none) and their diagnosis allowance carried a 3 s grace (the recorded diagnosis walls are in diagnosisDeadline.recorded). The r2 behaviour (G1 stops on a ' +
      'solver failure, 30 s deadline, executed / reused probe split, unknown dev-check wait) is covered by the r2 pure tests with scripted engines; no engine request ran with the r2 code ' +
      'and none is needed for these corrections.');
  }
  return list;
}

function documents(input, meta) {
  const m = meta || {};
  const levels = levelsOf(input);
  const recs = gtRecords(input);
  const controls = controlRecords(input);
  const requests = recs.filter(completed).map(function (rec) { return { rec: rec, items: classifyRequest(rec, levels) }; });
  const missSplit = buildMissSplit(requests, levels);
  const probes = buildProbes(requests);
  const parity = buildParity(recs, controls);
  const writer = { harnessFingerprint: C.harnessFingerprint().fingerprint, aggregatorSha256: C.sha256(fs.readFileSync(__filename)),
    revision: m.revision || 'r1', role: 'the report writer (this file is part of the harness fingerprint); the fingerprints the commands recorded are in Sources' };
  const summary = buildSummary(input, { levels: levels, recs: recs, controls: controls, missSplit: missSplit, probes: probes, parity: parity, revision: m.revision || 'r1',
    coverage: populationCoverage(input, recs, controls), writer: writer });
  summary.criteria = criteria(summary);
  summary.deviations = disclosures(m.revision).concat(m.deviations || []);
  return { samples: buildSamples(requests), signPasses: buildPasses(requests), setupProbes: probes, missSplit: missSplit, orderParity: parity, summary: summary,
    markdown: renderMarkdown(summary) };
}

function writeDocuments(repoRoot, round, docs, suffix) {
  const dir = path.join(repoRoot, ...C.EVIDENCE_REL.split('/'), round, TASK);
  const sfx = suffix || '';
  const files = { samples: 'samples', signPasses: 'sign-passes', setupProbes: 'setup-probes', missSplit: 'miss-split', orderParity: 'order-parity', summary: 'summary' };
  Object.keys(files).forEach(function (k) { C.writeJsonAtomic(repoRoot, path.join(dir, files[k] + sfx + '.json'), docs[k]); });
  C.writeTextExclusive(repoRoot, path.join(dir, 'summary' + sfx + '.md'), docs.markdown);
  return Object.keys(files).map(function (k) { return files[k] + sfx + '.json'; }).concat(['summary' + sfx + '.md']);
}

function parseArgs(argv) {
  const o = { task: TASK, round: 'provisional-r1', suffix: '', revision: null, deviation: [], dryRun: false };
  argv.forEach(function (arg) {
    if (arg === '--dry-run') {
      o.dryRun = true;
      return;
    }
    const m = /^--(task|round|suffix|revision|deviation)=(.*)$/.exec(arg);
    if (!m) throw new C.HarnessError('args', 'unknown argument ' + arg);
    if (m[1] === 'deviation') o.deviation.push(m[2]);
    else o[m[1]] = m[2];
  });
  if (o.task !== TASK) throw new C.HarnessError('args', 'this aggregator is for ' + TASK);
  return o;
}

function main(argv) {
  const o = parseArgs(argv);
  const repoRoot = C.DEFAULT_REPO_ROOT;
  const input = readInput(repoRoot, o.round);
  const docs = documents(input, { revision: o.revision, deviations: o.deviation });
  if (o.dryRun) {
    // development only: the summary markdown on stdout, nothing written
    process.stdout.write(docs.markdown);
    return 0;
  }
  const written = writeDocuments(repoRoot, o.round, docs, o.suffix);
  process.stdout.write(JSON.stringify({ ig: 'aggregate', task: TASK, round: o.round, written: written, completed: docs.summary.coverage.completed,
    pairs: docs.orderParity.pairs }) + '\n');
  return 0;
}

// --- tests (registered by ig09-test.cjs) ----------------------------------------------------------------------------------------------------------

function registerTests(t) {
  const mkRec = function (arm, key, level, seed, order, capture, diag, over) {
    const gen = { readyWallMs: 100, coldWallMs: 150, cpuTotalMs: 90, cpuResolutionStatus: 'resolved' };
    return Object.assign(R.blankRecord({ key: key, outcome: 'complete', arm: arm === 'g0' ? 'reference' : 'prototype', pairId: 'greaterThan:' + level + ':' + seed, level: level,
      requestSeed: seed, order: order, generation: gen }), { gtArm: arm, cellKind: level, claimedExact: true, verifiedExact: true,
      digests: { all: 'x', structure: 's', givens: 'g', solution: 'o', rating: 'r', config: 'c', warnings: 'w', log: 'l', work: 'k', scalars: 'sc', puzzle: 'p' },
      engineTimingsMs: { configure: 1, buildModel: 1, fullGrid: 10, extraStructure: 2, dig: 50, rate: 5, tune: 1 }, attemptsWork: [{ ratings: 3, proposals: 0, maxRatings: 1024,
        maxProposals: 32768, localSearches: [{ ratings: 1, proposals: 5, firstShallowAt: null, shallowRatings: 0, shallowLimit: 256, capHit: 'proposals' }] }],
      validation: { wallMs: 5, cpuMs: 5 }, gt: { arm: arm, capture: capture, captureBuildMs: 1, workerRunMs: 90, restore: { removed: true }, runError: null, problems: [], diag: diag } },
    over || {});
  };
  const diagFor = function (capture, over) {
    const rows = {};
    capture.samples.forEach(function (s) {
      if (s.kind === 'local' || !s.setup) return;
      rows[s.ordinal] = Object.assign({ ordinal: s.ordinal, ratingStatus: 'ok', rating: Object.assign({ solved: true, level: 'easy', score: 100 }, { digest: s.final.rating.digest }),
        canonicalEqual: true, below: true, minimalStatus: 'proved', minimal: true, unique: true, validationReusedFrom: null }, over || {});
    });
    return { status: 'complete', rows: rows, unstarted: [], plan: {}, reuse: { samples: 0, diagnosed: Object.keys(rows).length, sources: [] }, probe: null, wallMs: 20, cpuMs: 20 };
  };
  t.add('aggregate.documents-on-captures', 'aggregate', 'the documents partition the dug samples, keep numerators and denominators and mark every figure provisional', function () {
    const g0 = t.runDig({ arm: 'g0' }).capture;
    const g1 = t.runDig({ arm: 'g1' }).capture;
    const input = { round: 'provisional-r1', ledger: { entries: [], approvals: [] }, devCheck: null, shards: [{ shard: 'normal-300-304', attempts: ['a1'],
      commands: [{ catalogueSnapshot: { levels: t.LEVELS }, runtimeLabel: 'l', runtimeFingerprint: 'f', harnessFingerprint: 'h', adapterIds: ['gt-diagnostic'], adapterHashes: ['a'],
        sourceStable: true, firewallClean: true, machine: {} }], records: [mkRec('g0', 'a/g0', 'normal', 300, 0, g0, diagFor(g0)), mkRec('g1', 'a/g1', 'normal', 300, 1, g1, diagFor(g1))] }] };
    const docs = documents(input, {});
    const split = docs.missSplit.cohorts.normal.g0.split;
    t.equal(split.samples, g0.samples.filter(function (s) { return s.kind !== 'local'; }).length, 'every dug sample is classified');
    t.equal(Object.keys(split.buckets).reduce(function (a, k) { return a + split.buckets[k]; }, 0), split.samples, 'the buckets are disjoint and complete');
    t.equal(docs.orderParity.pairs.identityOk, 1, 'the pair is identical');
    t.check(/provisional/.test(docs.summary.evidenceStatus) && /PROVISIONAL/.test(docs.markdown), 'marked provisional');
    t.check(docs.summary.physicalWork.normal.g1.signPasses.firstTechnique.skippedDfs > 0, 'G1 skips are reported separately from the semantic counter');
    t.equal(docs.summary.physicalDifference[0].firstTechniquePass.dfsCallsSavedBySkips, docs.summary.physicalWork.normal.g1.signPasses.firstTechnique.skippedDfs, 'saved calls = skips');
    t.equal(docs.summary.criteria.map(function (c) { return c.id; }), ['B01', 'B02', 'B03', 'T01', 'T02', 'T03', 'T04', 'T05'], 'every acceptance id is addressed');
    t.check(docs.summary.observerOverhead.length === 0, 'no control recorded: no overhead row');
    t.check(JSON.stringify(docs.summary).indexOf('Infinity') < 0 && JSON.stringify(docs.summary).indexOf('NaN') < 0, 'no infinity or NaN');
    ['samples', 'signPasses', 'setupProbes', 'missSplit', 'orderParity', 'summary'].forEach(function (k) { t.check(typeof docs[k] === 'object', k); });
  });
  t.add('aggregate.unconfirmed-and-unknown-stay-visible', 'aggregate', 'unstarted diagnosis rows are unconfirmed in the split, never guessed; a missing minimality proof is no trap', function () {
    const g0 = t.runDig({ arm: 'g0' }).capture;
    const diag = diagFor(g0);
    diag.rows = {};
    diag.status = 'budget';
    diag.unstarted = g0.samples.map(function (s) { return s.ordinal; });
    const input = { round: 'provisional-r1', ledger: { entries: [], approvals: [] }, shards: [{ shard: 'normal-300-304', attempts: ['a1'], commands: [{ catalogueSnapshot: { levels: t.LEVELS } }],
      records: [mkRec('g0', 'a/g0', 'normal', 300, 0, g0, diag)] }] };
    const docs = documents(input, {});
    const sp = docs.missSplit.cohorts.normal.g0.split;
    t.equal(sp.buckets.unconfirmed, sp.samples, 'every sample is unconfirmed');
    t.equal([sp.trapProven, sp.trapLowerShareOfMisses.numerator], [0, 0], 'no trap without proof');
    t.equal(docs.summary.coverage.completed, 1, 'one completed request');
    t.check(docs.orderParity.pairs.deferred === 1, 'the mate has not run: deferred');
  });
  t.add('aggregate.stage-split-and-local-share', 'aggregate', 'the stage split adds up to the engine time and the local share has its own numerator', function () {
    const g0 = t.runDig({ arm: 'g0' }).capture;
    const rec = mkRec('g0', 'a/g0', 'normal', 300, 0, g0, diagFor(g0));
    const s = stageSplit(rec);
    t.check(s.engineMs === 90 && s.fullGridAndModelSetupMs === 12 && s.signPlacementMs === 2, 'engine step timings feed the split');
    const l = localStage([rec]);
    t.equal(l.normal.g0.requestsWithACappedLocalSearch, 0, 'no local sample in the capture: none capped');
    t.equal(l.normal.g0.measuredLocalStageShareOfAllRequestTime.denominator, 90, 'the denominator is the worker run');
    t.equal(l.nightmare.g0.requests, 0, 'another cohort has its own, empty, row');
  });
  t.add('aggregate.local-share-by-cohort-and-arm', 'aggregate', 'the local-stage shares are split by cohort and arm with the engine wall of the same requests as denominator', function () {
    const g0 = t.runDig({ arm: 'g0' }).capture;
    const g1 = t.runDig({ arm: 'g1' }).capture;
    const local = function (cap, ms) {
      const c = JSON.parse(JSON.stringify(cap));
      c.samples.push({ ordinal: 99, attempt: 1, sample: 12, kind: 'local', ended: true, endReason: 'end', setup: null, final: null, passes: [], localEntry: null,
        localCaps: { ratings: 1, proposals: 32768, firstShallowAt: null, shallowRatings: 0, shallowLimit: 256, capHit: 'proposals' }, spansMs: { totalMs: ms } });
      return c;
    };
    const a = mkRec('g0', 'n/g0', 'normal', 300, 0, local(g0, 30), diagFor(g0));
    const b = mkRec('g1', 'n/g1', 'normal', 300, 1, local(g1, 20), diagFor(g1), { gt: Object.assign({}, a.gt, { capture: local(g1, 20), workerRunMs: 40 }) });
    const c = mkRec('g0', 'h/g0', 'nightmare', 700, 0, local(g0, 5), diagFor(g0), { gt: Object.assign({}, a.gt, { capture: local(g0, 5), workerRunMs: 10 }) });
    const l = localStage([a, b, c]);
    t.equal([l.normal.g0.measuredLocalStageShareOfAllRequestTime.numerator, l.normal.g0.measuredLocalStageShareOfAllRequestTime.denominator], [30, 90], 'Normal G0: 30 of 90 ms');
    t.equal([l.normal.g1.measuredLocalStageShareOfAllRequestTime.numerator, l.normal.g1.measuredLocalStageShareOfAllRequestTime.denominator], [20, 40], 'Normal G1: 20 of 40 ms');
    t.equal([l.nightmare.g0.measuredLocalStageShareOfAllRequestTime.numerator, l.nightmare.g0.measuredLocalStageShareOfAllRequestTime.denominator], [5, 10], 'Nightmare G0: 5 of 10 ms');
    t.equal(l.nightmare.g1.requests, 0, 'an arm with no request is empty, not borrowed from the other cohort');
    t.equal(l.normal.g0.requestsWithACappedLocalSearch, 1, 'the capped local search is counted');
  });
  t.add('aggregate.ratios-are-g0-over-g1-and-unknown-stays-unknown', 'aggregate', 'cohort totals and paired medians are labelled apart, G0 / G1, and an unresolved CPU interval is null', function () {
    const g0 = t.runDig({ arm: 'g0' }).capture;
    const g1 = t.runDig({ arm: 'g1' }).capture;
    const gen = function (wall, cpu, status) { return { readyWallMs: wall, coldWallMs: wall, cpuTotalMs: cpu, cpuResolutionStatus: status }; };
    const recs = [];
    [[100, 0, 'unresolved', 400, 0, 'unresolved'], [100, 90, 'resolved', 400, 360, 'resolved']].forEach(function (x, i) {
      const seed = 300 + i;
      recs.push(mkRec('g0', 'a/' + seed + '/g0', 'normal', seed, 0, g0, diagFor(g0), { generation: gen(x[0], x[1], x[2]) }));
      recs.push(mkRec('g1', 'a/' + seed + '/g1', 'normal', seed, 1, g1, diagFor(g1), { generation: gen(x[3], x[4], x[5]) }));
    });
    const tt = timeTable(recs, 'normal');
    t.equal(tt.ratioOfCohortTotals.readyWallSumG0OverSumG1, 0.25, 'the ratio of totals is G0 / G1');
    t.check(/G0 \/ G1/.test(tt.ratioOfCohortTotals.direction) && /not a median/.test(tt.ratioOfCohortTotals.note), 'labelled as a ratio of totals');
    t.equal(tt.paired.perPairReadyWallRatioG0OverG1.p50, 0.25, 'the paired summary is a median of per-pair ratios');
    t.equal(tt.ratioOfCohortTotals.cpuSumG0OverSumG1, null, 'an unresolved CPU interval makes the cohort ratio unknown');
    t.equal(tt.paired.perPairCpuRatioG0OverG1.n, 1, 'only the pair with resolved CPU intervals counts in the paired CPU summary');
    t.equal(tt.paired.perPairCpuRatioG0OverG1.p50, 0.25, 'and its ratio is G0 / G1');
  });
  const baseCmd = { catalogueSnapshot: { levels: t.LEVELS }, runtimeLabel: 'l', runtimeFingerprint: 'f', harnessFingerprint: 'h', adapterIds: ['gt-diagnostic'], adapterHashes: ['a'],
    sourceStable: true, firewallClean: true, machine: {} };
  const inputOf = function (records, over) {
    return Object.assign({ round: 'provisional-r1', ledger: { entries: [], approvals: [] }, devCheck: null, shards: [{ shard: 'normal-300-304', attempts: ['a1'], commands: [baseCmd],
      records: records }] }, over || {});
  };
  const pair = function (over0, over1, diag0, diag1) {
    const g0 = t.runDig({ arm: 'g0' }).capture;
    const g1 = t.runDig({ arm: 'g1' }).capture;
    return { g0: g0, g1: g1, records: [mkRec('g0', 'a/g0', 'normal', 300, 0, g0, diag0 || diagFor(g0), Object.assign({ counts: { dfsEntries: g0.totals.dfsCalls } }, over0 || {})),
      mkRec('g1', 'a/g1', 'normal', 300, 1, g1, diag1 || diagFor(g1), Object.assign({ counts: { dfsEntries: g1.totals.dfsCalls } }, over1 || {}))] };
  };
  t.add('aggregate.probes-executed-versus-reused', 'aggregate', 'the probe rows are reported as executed group checks plus reused copies, never as independent executions', function () {
    const g0 = t.runDig({ arm: 'g0' }).capture;
    const g1 = t.runDig({ arm: 'g1' }).capture;
    const rowsOf = function (n, solve) {
      return Array.from({ length: n }, function (_v, i) {
        return { phase: 'help', group: i, status: 'done', block: { floorBlock: i === 0, unitBlock: false }, uniquenessAfterRemoval: 'unique', solveAfterRemoval: solve };
      });
    };
    const d0 = diagFor(g0);
    d0.probe = { ordinal: 0, groupsPlanned: 3, rows: rowsOf(3, 'stuck'), digest: 'd', reusedFrom: null };
    const d1 = diagFor(g1);
    d1.status = 'reused-only';
    d1.probe = { ordinal: 0, groupsPlanned: 3, rows: rowsOf(3, 'stuck'), digest: 'd', reusedFrom: 'a/g0' };
    const docs = documents(inputOf([mkRec('g0', 'a/g0', 'normal', 300, 0, g0, d0), mkRec('g1', 'a/g1', 'normal', 300, 1, g1, d1)]), {});
    const c = docs.setupProbes.coverage;
    t.equal([c.groupRowsExecuted, c.groupRowsReusedCopies, c.groupRowsListed], [3, 3, 6], 'executed plus reused copies = the listed rows');
    t.equal([c.requestsThatExecutedAProbe, c.requestsThatReusedAProbe, c.donorRequestsReusedByAnother], [1, 1, 1], 'executing, reusing and donor requests');
    t.check(/never 6 independent probe executions/.test(c.note), 'the note refuses the independent reading');
    const r = docs.setupProbes.results;
    t.equal([r.executed.groupRows, r.reusedCopies.groupRows], [3, 3], 'the results are split');
    t.equal([r.executed.blockedByRule.clueFloor, r.executed.solveAfterRemoval.stuck, r.reusedCopies.solveAfterRemoval.stuck], [1, 3, 3], 'each population has its own tallies');
    t.check(/not 6 independent executions/.test(docs.markdown) && /3 executed plus 3 reused/.test(docs.markdown), 'the markdown says so');
    t.equal(docs.setupProbes.requests.map(function (x) { return x.probe.execution; }), ['executed', 'reused'], 'every request row says which');
  });
  t.add('aggregate.machine-wait-provenance-and-charge-reconciliation', 'aggregate', 'a dev-check wait without a caller timestamp is unknown, the known waits are not an all-task total, the dev check is charged once', function () {
    const entries = [{ task: 'IG-S09', shard: 'normal-300-304', attemptId: 'a1', occupiedMs: 10000, chargedMs: 55000, priorityWaitMs: 2000, status: 'recorded' },
      { task: 'IG-S09', shard: 'observer-control', attemptId: 'a1', occupiedMs: 20000, chargedMs: 65000, priorityWaitMs: 3000, status: 'recorded' }];
    const dev = function (requestedAt) {
      return { timing: { requestedAt: requestedAt, admittedAt: '2026-11-15T02:49:34.269Z', endedAt: '2026-11-15T02:49:41.304Z', occupiedMs: 7000, chargedGraceMs: 45000, priorityWaitMs: 0 } };
    };
    const base = function (over) {
      return inputOf(pair().records, Object.assign({ ledger: { entries: entries, approvals: [{ task: 'IG-S09', extraMs: 90000, by: 'x' }] }, devCheck: dev('2026-11-15T02:49:34.308Z') }, over));
    };
    const m = documents(base({ commonReader: { chargedMs: 55000 + 65000 + 52000, approvedExtraMs: 90000, remainingTaskMs: 900000 + 90000 - 172000 } }), {}).summary.machine;
    t.equal([m.ledgerChargedMs, m.devCheckChargedMs, m.chargedMs], [120000, 52000, 172000], 'the ledger plus the development check, once');
    t.equal(m.commonReader.equalToThisReport, true, 'equal to the common budget reader');
    t.equal([m.priorityWait.knownMs, m.devCheck.priorityWait.valueMs, m.devCheck.priorityWait.status, m.devCheck.priorityWait.recordedValueMs], [5000, null, 'unknown', 0],
      'a requested timestamp after the admission is no wait: unknown, never the recorded 0');
    t.check(/not an all-task total/.test(m.priorityWait.allTaskTotal) && /shard\/control commands/.test(m.priorityWait.scope), 'the known waits are scoped, not a total');
    const twice = documents(base({ commonReader: { chargedMs: 55000 + 65000 + 52000 + 52000, approvedExtraMs: 90000, remainingTaskMs: 0 } }), {}).summary.machine;
    t.equal(twice.commonReader.equalToThisReport, false, 'a double-charged development check would show as a difference');
    const known = documents(base({ devCheck: dev('2026-11-15T02:46:06.600Z') }), {}).summary.machine;
    t.equal([known.devCheck.priorityWait.status, known.devCheck.priorityWait.valueMs], ['recorded (caller timestamp)', 0], 'a caller timestamp before the admission keeps the recorded wait');
    t.check(/Priority waits \(never charged\)/.test(documents(base({}), {}).markdown) && /not an all-task total/.test(documents(base({}), {}).markdown), 'the markdown labels the figure');
  });
  t.add('aggregate.t01-never-met-with-stops-and-counter-units', 'aggregate', 'a recorded stop or an unrecognised failure is never a met T01; r1 counter names are read; the counter units are annotated', function () {
    const by = function (docs, id) { return docs.summary.criteria.find(function (c) { return c.id === id; }); };
    const clean = pair();
    const cleanDocs = documents(inputOf(clean.records), {});
    t.equal(by(cleanDocs, 'T01').status, 'met for the recorded requests', 'no stop, no failure: met for the recorded requests');
    // a stop under its r1 name (fallbackError) is read as a stop
    const legacy = pair();
    const p = legacy.g1.samples[0].passes.find(function (x) { return x.g1; });
    // an r1 record has only the old names: the new key is absent and the old one carries the stop
    delete p.g1.stoppedError;
    p.g1.fallbackError = 1;
    const legacyDocs = documents(inputOf(legacy.records), {});
    t.equal(legacyDocs.summary.g1Results.stoppedError, 1, 'the r1 counter name is read');
    t.equal(by(legacyDocs, 'T01').status, 'NOT met (failures or stops recorded)', 'a recorded stop is never met');
    // an unrecognised first failure
    const failing = pair(null, { gt: Object.assign({}, clean.records[1].gt, { firstFailure: { code: 'solver.noEffect', kind: 'error', site: 'restricted-solve', sampleOrdinal: 0, pass: 0, removal: 2 } }) });
    const failDocs = documents(inputOf(failing.records), {});
    t.equal(failDocs.summary.failures.unrecognisedFirstFailures.length, 1, 'the failure keeps its code and ordinal');
    t.equal(by(failDocs, 'T01').status, 'NOT met (failures or stops recorded)', 'an unrecognised failure is never met');
    // counter units
    const ci = cleanDocs.summary.counterInterpretation;
    t.equal([ci.recordedFieldCheck.recordsWithACapture, ci.recordedFieldCheck.countsDfsEntriesEqualsCountSolutionsCalls, ci.recordedFieldCheck.differ], [2, 2, 0], 'counts.dfsEntries aliases the countSolutions calls in every record');
    t.check(/NOT a count of depth-first node entries/.test(cleanDocs.samples.requests[0].recordedCounts.interpretation), 'the per-request record is annotated');
    t.check(/budget checks/.test(cleanDocs.summary.guards.g0.uniquenessCountSlice.limit) && !/search nodes per count/.test(cleanDocs.summary.guards.g0.uniquenessCountSlice.limit),
      'UNIQUE_NODES is a budget-check count');
    const note = cleanDocs.summary.generationTime.normal.paired.note;
    t.check(!/p95 is the observed maximum/.test(note) && /second-largest value at n = 20/.test(note), 'no blanket "p95 is the maximum"');
    t.check(/Total CPU/.test(cleanDocs.markdown) && /startup and cleanup included/.test(cleanDocs.markdown) && !/DFS node checks/.test(cleanDocs.markdown), 'CPU and count labels');
  });
  t.add('aggregate.partial-coverage-and-criteria', 'aggregate', 'unstarted rows are listed, T03 is partial, T05 is pending without controls and scoped with them', function () {
    const g0 = t.runDig({ arm: 'g0' }).capture;
    const g1 = t.runDig({ arm: 'g1' }).capture;
    const cmd = { catalogueSnapshot: { levels: t.LEVELS }, runtimeLabel: 'l', runtimeFingerprint: 'f', harnessFingerprint: 'h', adapterIds: ['gt-diagnostic'], adapterHashes: ['a'],
      sourceStable: true, firewallClean: true, machine: {}, lock: { observed: { ownerMatches: true } } };
    const input = { round: 'provisional-r1', ledger: { entries: [], approvals: [] }, devCheck: null, shards: [{ shard: 'normal-300-304', attempts: ['a1'], commands: [cmd],
      records: [mkRec('g0', 'IG-S09/normal-300-304/greaterThan:normal:300/g0', 'normal', 300, 0, g0, diagFor(g0)),
        mkRec('g1', 'IG-S09/normal-300-304/greaterThan:normal:300/g1', 'normal', 300, 1, g1, diagFor(g1))] }] };
    const docs = documents(input, {});
    const pop = docs.summary.coverage.population;
    t.equal([pop.normal.pairsRecorded, pop.normal.pairsPlanned, pop.nightmare.pairsRecorded, pop.nightmare.pairsPlanned], [1, 20, 0, 10], 'pairs recorded against planned');
    t.equal(pop.unstartedRows.length, 58, 'every planned row without a record is listed as unstarted');
    const by = function (id) { return docs.summary.criteria.find(function (c) { return c.id === id; }); };
    t.equal(by('T03').status, 'PARTIAL', 'T03 is partial');
    t.equal(by('T05').status, 'PENDING', 'no control: T05 pending');
    t.check(/unstarted/.test(by('T03').evidence) && /separate population/.test(by('T03').evidence), 'the controls are a separate population and the gap is explicit');
    t.check(/scoped to the recorded requests/.test(by('B01').evidence) && /no global G1 winner/.test(by('B03').evidence), 'conclusions are scoped');
    // a control compatible with its G0 gives a scoped T05; one of two is only partial
    const digests = docs.summary.parity && mkRec('g0', 'x', 'normal', 300, 0, g0, null).digests;
    const control = Object.assign(R.blankRecord({ key: 'IG-S09/observer-control/greaterThan:normal:300/native', outcome: 'complete', arm: 'reference', pairId: 'control:greaterThan:normal:300',
      level: 'normal', requestSeed: 300, order: 0, generation: { readyWallMs: 80, coldWallMs: 90, cpuTotalMs: 80, cpuResolutionStatus: 'resolved' } }),
    { cellKind: 'control', gtArm: null, claimedExact: true, verifiedExact: true, digests: digests, normalisedConfig: { trace: 'summary' }, adapterIds: [], round: 'provisional-r1' });
    input.shards[0].records[0].normalisedConfig = { trace: 'summary' };
    input.shards.push({ shard: 'observer-control', attempts: ['a1'], commands: [cmd], records: [control] });
    const withControl = documents(input, {});
    const o = withControl.summary.observerOverhead[0];
    t.equal([o.compatible, o.compatibility.trace.equal, o.compatibility.runtimeFingerprint.equal], [true, true, true], 'compatibility is checked against the captured G0');
    t.equal(withControl.summary.criteria.find(function (c) { return c.id === 'T05'; }).status, 'PARTIAL', 'one of two controls: partial, never a population claim');
    t.check(/do not establish population-wide overhead/.test(withControl.summary.criteria.find(function (c) { return c.id === 'T05'; }).evidence), 'singletons are not population overhead');
  });
}

module.exports = { TASK, HISTORICAL, PREDICATE, readInput, documents, writeDocuments, stageSplit, localStage, guardAccounting, classifyRequest, physicalWork, registerTests, main };

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    process.stderr.write('IG error [' + (err && err.code ? err.code : 'unexpected') + ']: ' + (err && err.stack ? err.stack : err) + '\n');
    process.exitCode = C.exitCodeOf(err);
  }
}
