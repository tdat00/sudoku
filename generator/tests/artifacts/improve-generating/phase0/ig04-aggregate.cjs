'use strict';

/*
 * IG-S04 task summary and records of the pilot (test side, provisional (pre-freeze)): variant-manifest.json,
 * pilot-reprojection.json, budgets.json, s2-audit.json, summary.json and summary.md. Evidence only: reads the shard
 * evidence of the round, loads no engine, times nothing. Every file is written once (an existing one fails closed; a
 * later summary needs its own `--suffix`).
 *
 *   node ig04-aggregate.cjs --task=IG-S04 --round=provisional-r1 [--suffix=-r2]    the final bundle
 *   node ig04-aggregate.cjs --task=IG-S04 --round=provisional-r1 --reprojection     only pilot-reprojection.json
 *
 * Nothing here selects a winner, decides S1 or the bank route, or enables a cell: the rates are descriptive, small-n
 * pilot figures on seeds 11 and 12, and every number is provisional (pre-freeze).
 */
const fs = require('fs');
const path = require('path');
const C = require('./common.cjs');
const R = require('./records.cjs');
const M = require('./manifest.cjs');
const SB = require('./sample-budget.cjs');
const F = require('./frontier.cjs');
const AG = require('./aggregate.cjs');
const RUN = require('./run.cjs');

const TASK = 'IG-S04';
const FIRST_SHARD = 's1-large-controls';
const GATE_FILE = 'pilot-reprojection.json';
const GUARD_MS = C.GUARDS.sampleMs;
const COMMAND_WINDOW_MS = C.GUARDS.commandMs - C.GUARDS.finalizeReserveMs - 2 * C.GUARDS.startMarginMs;
const IGS05_SEEDS = 8;
const IGS05_SAMPLES = 2;
const PRIMARY_MODES = Object.freeze(['proposal-only', 'ordinary-only', 'F1']);
const NOTICE = 'provisional (pre-freeze): pilot figures on seeds 11 and 12, one sample per mode; they decide neither S1 nor ' +
  'the bank route, enable no cell and are not a gate result';

function mean(values) {
  const v = values.filter(function (x) { return typeof x === 'number' && Number.isFinite(x); });
  return v.length === 0 ? null : v.reduce(function (a, b) { return a + b; }, 0) / v.length;
}

function maxOf(values) {
  const v = values.filter(function (x) { return typeof x === 'number' && Number.isFinite(x); });
  return v.length === 0 ? null : Math.max.apply(null, v);
}

function round1(x) {
  return x === null || x === undefined ? null : Math.round(x * 10) / 10;
}

function sumOf(values) {
  const v = values.filter(function (x) { return typeof x === 'number' && Number.isFinite(x); });
  return v.reduce(function (a, b) { return a + b; }, 0);
}

function isCompleted(r) {
  return r.outcome === 'complete' || r.outcome === 'validation-unknown';
}

function started(r) {
  return r.outcome !== 'unstarted';
}

/** The machine time one trial occupied: cold start to cleanup, the independent verifier and the S2 audit. */
function machineMsOf(r) {
  const g = r.generation || {};
  const parts = [g.occupiedWallMs, r.validation ? r.validation.wallMs : null, r.s2Audit ? r.s2Audit.wallMs : null];
  const known = parts.filter(function (x) { return typeof x === 'number'; });
  return known.length === 0 ? null : known.reduce(function (a, b) { return a + b; }, 0);
}

// --- loading -------------------------------------------------------------------------------------------------------------------

function load(repoRoot, round) {
  const got = AG.collect(repoRoot, TASK, round);
  const records = [];
  got.shards.forEach(function (sh) {
    sh.records.forEach(function (r) { records.push(Object.assign({}, r, { _shard: sh.shard })); });
  });
  const catalogueCommand = got.shards.map(function (sh) {
    return sh.commands.find(function (c) { return c.catalogueSnapshot; });
  }).find(Boolean);
  return { got: got, manifest: got.manifest, records: records, catalogue: catalogueCommand ? catalogueCommand.catalogueSnapshot : null,
    catalogueFingerprint: catalogueCommand ? catalogueCommand.catalogueFingerprint : null,
    command: catalogueCommand || null };
}

function kindOf(mode) {
  return F.MODES[mode].kind;
}

// --- the variant manifest ---------------------------------------------------------------------------------------------------

/** The floor sets of a cell from the catalogue snapshot alone (the same rule as frontier.floorSets, no engine). */
function setsFromCatalogue(catalogue, cell) {
  const entry = catalogue.floors[cell] && catalogue.floors[cell].nightmare;
  if (!entry) return null;
  const tech = new Map(catalogue.techniques.map(function (t) { return [t.id, t]; }));
  const floor = entry.floor.slice();
  const pick = function (groups) {
    return floor.filter(function (id) { return groups.indexOf(tech.get(id).group) >= 0; });
  };
  const sets = { cheap: pick(F.CHEAP_GROUPS), middle: pick(F.MIDDLE_GROUPS), full: floor };
  const usable = function (ids) { return ids.filter(function (id) { return !tech.get(id).assumesUniqueness; }); };
  const ladder = [];
  const seen = new Set();
  ['cheap', 'middle', 'full'].forEach(function (name) {
    const key = sets[name].join(',');
    if (!seen.has(key)) {
      seen.add(key);
      ladder.push({ id: name, ids: sets[name], effectiveIds: usable(sets[name]) });
    }
  });
  return { floorIds: floor, tierIds: entry.tier, cheap: sets.cheap, middle: sets.middle, full: sets.full, ladder: ladder };
}

function variantManifest(data, round) {
  const cells = {};
  data.manifest.jobs.forEach(function (j) { cells[j.puzzleVariant] = true; });
  const perCell = {};
  Object.keys(cells).forEach(function (cell) {
    perCell[cell] = data.catalogue ? setsFromCatalogue(data.catalogue, cell) : null;
  });
  const doc = {
    schema: 'ig-s04-variants/1',
    task: TASK,
    round: round,
    evidenceStatus: data.manifest.evidenceStatus,
    provisionalNotice: NOTICE,
    runtimeFingerprint: data.got.shards.map(function (s) { return s.commands[0]; }).filter(Boolean).map(function (c) {
      return c.runtimeFingerprint; })[0] || null,
    catalogueFingerprint: data.catalogueFingerprint,
    solver: 'reference solver only (the IG-S03 scoped solver is not loaded); no S3 gain is assumed',
    sampleDefinition: 'one trial = the native model and full grid of the request seed (forks model, grid#1), then ONE sample ' +
      'of ordinal 1 (root fork dig#1.1) in the mode; Nightmare, trace off, rotational180, random dig order',
    structuralControls: { K_F: SB.K_F, deepenMax: SB.DEEPEN_MAX, ladderMax: SB.LADDER_MAX, canonicalMax: SB.CANONICAL_MAX,
      symmetry: 'rotational180', digOrder: 'random', note: 'prototype settings, not adopted production defaults' },
    modes: F.MODE_ORDER.map(function (id) {
      const m = F.MODES[id];
      return Object.assign({ id: id, kind: m.kind }, m.kind === 'native' ? { proposal: m.proposal } : {
        floorDescent: m.floor, s2: m.s2, referenceParent: m.parent, afterDfsFloorFilter: m.fuFilter,
        phaseAUniqueness: 'assumeUniqueness false, always' }, { description: m.description });
    }),
    forkLabels: ['model', 'grid#1', 'dig#1.1', 'dig#1.1>random (the native dig order of the sample)',
      'dig#1.1>deepen (frontier deepen order)', 'dig#1.1>guided, refine (inside the native samples)'],
    floorSetsByCell: perCell,
    cheapGroups: F.CHEAP_GROUPS,
    middleGroups: F.MIDDLE_GROUPS,
    s2: 'S2 initialises from the weakened givens (no derived parent eliminations); it shortens accepted tests only; ' +
      'performance scope: the minimal early-exit prototype, the planned initial-state cache is not implemented',
    interpretations: F.INTERPRETATIONS,
    comparisons: ['F0/F1: the isolated S2 comparison', 'FC/FM/F1: floor choices', 'FU/F1: the uniqueness filter',
      'FS/F1: the reference-parent choice', 'the gains are correlated: they are not multiplied as independent factors']
  };
  doc.hash = C.digestOf(doc);
  return doc;
}

// --- budgets ---------------------------------------------------------------------------------------------------------------------

function frontierKeysOf(manifest, cell) {
  return manifest.jobs.filter(function (j) { return j.puzzleVariant === cell && F.MODES[j.mode].kind === 'frontier'; })
    .map(function (j) { return j.key; });
}

function budgetsDoc(data, round, harnessFingerprint) {
  const cellsInManifest = Array.from(new Set(data.manifest.jobs.map(function (j) { return j.puzzleVariant; })));
  const inputs = [];
  const cells = {};
  let constants = null;
  cellsInManifest.forEach(function (cell) {
    const recs = data.records.filter(function (r) { return r.puzzleVariant === cell && F.MODES[r.mode].kind === 'frontier'; });
    const geometry = recs.find(function (r) { return r.groupCount !== null && r.groupCount !== undefined && r.digits; });
    const consts = recs.map(function (r) { return r.nativeConstants; }).find(Boolean) || null;
    if (consts && constants === null) constants = consts;
    if (!geometry || !consts) {
      cells[cell] = { cell: cell, status: 'unfitted', reason: 'no frontier trial of this cell started: no geometry or ' +
        'engine constants were observed, so no ceiling is computed here (planned, unstarted)', plannedKeys:
        frontierKeysOf(data.manifest, cell), limits: null, ceilings: null };
      return;
    }
    const ceilings = SB.pilotCeilings({ CAP_RATINGS: consts.CAP_RATINGS, OBJECTIVE_STEPS: consts.OBJECTIVE_STEPS,
      UNIQUE_NODES: consts.UNIQUE_NODES }, { groups: geometry.groupCount, cells: geometry.cellCount, digits: geometry.digits });
    const trials = recs.filter(started).map(function (r) {
      inputs.push({ key: r.key, cell: cell, outcome: r.outcome, shard: r._shard,
        digest: C.digestOf({ key: r.key, outcome: r.outcome, counts: r.counts }) });
      return { key: r.key, outcome: isCompleted(r) ? 'complete' : r.outcome, counts: r.counts };
    });
    const fit = SB.fitCell({ cell: cell, ceilings: ceilings, plannedKeys: frontierKeysOf(data.manifest, cell), trials: trials });
    fit.geometry = { groups: geometry.groupCount, cells: geometry.cellCount, digits: geometry.digits };
    cells[cell] = fit;
  });
  return SB.buildBudgetsDoc({ round: round, evidenceStatus: data.manifest.evidenceStatus, nativeConstants: constants,
    runtimeFingerprint: data.got.shards.map(function (s) { return s.commands[0]; }).filter(Boolean).map(function (c) {
      return c.runtimeFingerprint; })[0] || null, harnessFingerprint: harnessFingerprint, inputs: inputs, cells: cells });
}

// --- the S2 audit record ------------------------------------------------------------------------------------------------------------

function s2AuditDoc(data, round) {
  const rows = data.records.filter(function (r) { return r.s2Audit; });
  const entries = rows.map(function (r) {
    const a = r.s2Audit;
    return { key: r.key, cell: r.puzzleVariant, seed: r.requestSeed, mode: r.mode, status: a.status,
      acceptedRemovals: a.acceptedRemovals === undefined ? null : a.acceptedRemovals,
      rederivedRemovals: a.rederivedRemovals === undefined ? null : a.rederivedRemovals,
      audited: a.audited === undefined ? null : a.audited, removals: a.removals || null, finalParent: a.finalParent || null,
      operationalDisagreements: a.operationalDisagreements === undefined ? null : a.operationalDisagreements,
      correctnessProblems: a.correctnessProblems === undefined ? null : a.correctnessProblems, wallMs: a.wallMs || null,
      reason: a.reason || a.error || null };
  });
  const sum = function (f) { return sumOf(entries.map(f)); };
  const doc = {
    schema: 'ig-s04-s2-audit/1',
    task: TASK,
    round: round,
    evidenceStatus: data.manifest.evidenceStatus,
    provisionalNotice: NOTICE,
    method: 'post-timing, on an unpatched engine instance: the first, middle and last accepted S2 (rederived) removal ' +
      '(deduplicated) is re-solved in full with the accepting rung\'s set and assumeUniqueness false, and the final phaseA ' +
      'parent with its own last rung set and with the full floor; the deduction ordinal of the re-derivation is compared ' +
      'with the trial\'s own record. An operational disagreement is guidance waste, not an invalid puzzle; an unsound ' +
      'deduction, a differing ordinal or a rebuilt parent that differs is a correctness stop',
    trialsAudited: entries.filter(function (e) { return e.status === 'audited'; }).length,
    trialsSkipped: entries.filter(function (e) { return e.status !== 'audited'; }).length,
    acceptedRemovals: sum(function (e) { return e.acceptedRemovals; }),
    rederivedRemovals: sum(function (e) { return e.rederivedRemovals; }),
    auditedRemovals: sum(function (e) { return e.audited; }),
    operationalDisagreements: sum(function (e) { return e.operationalDisagreements; }),
    correctnessProblems: sum(function (e) { return e.correctnessProblems; }),
    entries: entries
  };
  doc.hash = C.digestOf(doc);
  return doc;
}

// --- the reprojection ---------------------------------------------------------------------------------------------------------------

function costTable(records) {
  const table = {};
  records.filter(started).forEach(function (r) {
    const cell = r.puzzleVariant;
    const mode = r.mode;
    if (!table[cell]) table[cell] = {};
    if (!table[cell][mode]) table[cell][mode] = [];
    const g = r.generation || {};
    table[cell][mode].push({ key: r.key, outcome: r.outcome, readyOccupiedWallMs: g.readyOccupiedWallMs,
      cpuReadyTotalMs: g.cpuReadyTotalMs, machineMs: machineMsOf(r), censored: r.outcome === 'request-timeout' });
  });
  return table;
}

function perSampleBasis(table, cell, mode) {
  const rows = table[cell] && table[cell][mode];
  if (rows && rows.length > 0) {
    const m = mean(rows.map(function (x) { return x.machineMs; }));
    if (m !== null) return { ms: m, basis: 'observed: same cell and mode (' + rows.length + ' trial' + (rows.length > 1 ? 's' : '') + ')' };
  }
  if (kindOf(mode) === 'frontier') {
    const f1 = table[cell] && table[cell].F1;
    if (f1 && f1.length > 0) {
      const m = mean(f1.map(function (x) { return x.machineMs; }));
      if (m !== null) return { ms: m, basis: 'assumption: the F1 cost of the cell stands for this unmeasured frontier variant' };
    }
  }
  return { ms: null, basis: 'unmeasured: no observation of this cell and mode' };
}

/**
 * The mandatory reprojection after the large-board probes: stage counts and time, the censored work, the projected cost of
 * the remaining population (an observation-based scenario where one exists, and the 45 s guard ceiling for everything
 * else) and the first-round cost of IG-S05's primary tier. A projection, never a measurement.
 */
function buildReprojection(input) {
  const manifest = M.buildManifest(TASK, input.round);
  const records = input.records;
  const byKey = new Map(records.map(function (r) { return [r.key, r]; }));
  const table = costTable(records);
  const stageKeys = manifest.shards.find(function (s) { return s.shard === FIRST_SHARD; }).jobKeys;
  const stage = stageKeys.map(function (k) { return byKey.get(k); }).filter(Boolean);
  const count = function (list, outcomes) { return list.filter(function (r) { return outcomes.indexOf(r.outcome) >= 0; }).length; };
  const command = input.command || null;
  const thisCommandChargedMs = command && command.timing ? (command.timing.occupiedMs || 0) + C.GUARDS.graceMs : 0;
  const allocationMs = M.ALLOCATIONS_MS[TASK] + (input.approvedExtraMs || 0);
  const chargedMs = (input.chargedBeforeMs || 0) + thisCommandChargedMs;
  const remainingMs = Math.max(0, allocationMs - chargedMs);

  const observed = stage.map(function (r) {
    const g = r.generation || {};
    const p = r.censoredProgress || null;
    return { key: r.key, cell: r.puzzleVariant, seed: r.requestSeed, mode: r.mode, outcome: r.outcome,
      readyOccupiedWallMs: g.readyOccupiedWallMs, readyWallMs: g.readyWallMs, coldWallMs: g.coldWallMs,
      cpuReadyTotalMs: g.cpuReadyTotalMs, gridBuildWallMs: g.gridBuildWallMs, machineMs: machineMsOf(r),
      claimedExact: r.claimedExact, verifiedExact: r.verifiedExact,
      counts: r.counts ? { floorTests: r.counts.floorTests, floorDeductions: r.counts.floorDeductions,
        solverChecks: r.counts.solverChecks, dfsEntries: r.counts.dfsEntries, dfsChecks: r.counts.dfsChecks,
        ladderPasses: r.counts.ladderPasses, phaseBSolves: r.counts.phaseBSolves, deepenProposals: r.counts.deepenProposals,
        verificationSolves: r.counts.verificationSolves } : null,
      censoredAt: p };
  });
  const censoredWork = observed.filter(function (o) { return o.outcome === 'request-timeout' || o.outcome === 'sample-budget'; })
    .map(function (o) { return { key: o.key, outcome: o.outcome, readyOccupiedWallMs: o.readyOccupiedWallMs,
      lastProgress: o.censoredAt, note: 'a lower bound of the trial cost: the guard ended it' }; });

  const remaining = [];
  manifest.shards.forEach(function (shard) {
    if (shard.shard === FIRST_SHARD) return;
    let basisMs = 0;
    let basisKnown = true;
    let ceilingMs = 0;
    const rows = shard.jobKeys.map(function (k) {
      const job = manifest.jobs.find(function (j) { return j.key === k; });
      const b = perSampleBasis(table, job.puzzleVariant, job.mode);
      if (b.ms === null) basisKnown = false;
      else basisMs += b.ms;
      ceilingMs += GUARD_MS + 8000;
      return { key: k, cell: job.puzzleVariant, mode: job.mode, estimateMs: job.estimateMs, projectedMs: b.ms === null ? null : round1(b.ms),
        basis: b.basis };
    });
    const commands = Math.max(1, Math.ceil(basisMs / COMMAND_WINDOW_MS));
    const ceilingCommands = Math.max(1, Math.ceil(ceilingMs / COMMAND_WINDOW_MS));
    remaining.push({
      shard: shard.shard, keys: shard.jobKeys.length,
      observedScenarioMs: basisKnown ? Math.round(basisMs) : null,
      observedScenarioPartialMs: Math.round(basisMs),
      observedScenarioComplete: basisKnown,
      observedScenarioChargedMs: basisKnown ? Math.round(basisMs) + commands * C.GUARDS.graceMs : null,
      ceilingScenarioMs: Math.round(ceilingMs),
      ceilingScenarioChargedMs: Math.round(ceilingMs) + ceilingCommands * C.GUARDS.graceMs,
      rows: rows
    });
  });
  const sumMs = function (f) { return sumOf(remaining.map(f)); };

  const primary = {};
  F.MODE_ORDER.filter(function (m) { return PRIMARY_MODES.indexOf(m) >= 0; }).forEach(function () {});
  ['classic9', 'mega12', 'mega16', 'samurai'].forEach(function (cell) {
    const modes = {};
    let known = true;
    let total = 0;
    PRIMARY_MODES.forEach(function (mode) {
      const b = perSampleBasis(table, cell, mode);
      const perCell = b.ms === null ? null : Math.round(b.ms * IGS05_SEEDS * IGS05_SAMPLES);
      if (perCell === null) known = false;
      else total += perCell;
      modes[mode] = { perSampleMs: b.ms === null ? null : round1(b.ms), basis: b.basis, upperBoundMs: perCell,
        guardCeilingMs: (GUARD_MS + 8000) * IGS05_SEEDS * IGS05_SAMPLES };
    });
    primary[cell] = { modes: modes, observedScenarioMs: known ? total : null,
      guardCeilingMs: PRIMARY_MODES.length * (GUARD_MS + 8000) * IGS05_SEEDS * IGS05_SAMPLES };
  });

  const doc = {
    schema: 'ig-s04-reprojection/1',
    task: TASK,
    round: input.round,
    evidenceStatus: manifest.evidenceStatus,
    provisionalNotice: NOTICE,
    kind: 'projection, not measurement',
    emittedAfter: FIRST_SHARD + ' (mega16/11 and samurai/11: the two native controls and F1), before any other real trial',
    stage: {
      planned: stageKeys.length,
      started: stage.filter(started).length,
      completed: count(stage, ['complete', 'validation-unknown']),
      censored: count(stage, ['request-timeout']),
      budgetStops: count(stage, ['sample-budget']),
      errors: count(stage, ['error']),
      unstarted: stageKeys.length - stage.filter(started).length,
      commandOccupiedMs: command && command.timing ? command.timing.occupiedMs : null,
      commandChargedMs: thisCommandChargedMs,
      trialMachineMs: Math.round(sumOf(observed.map(function (o) { return o.machineMs; }))),
      trials: observed
    },
    censoredWork: censoredWork,
    allocation: { taskAllocationMs: allocationMs, chargedBeforeThisCommandMs: input.chargedBeforeMs || 0,
      chargedWithThisCommandMs: chargedMs, remainingMs: remainingMs,
      note: 'charged = occupied wrapper time + 45 s quiet-admission grace per command; priority waits are not charged' },
    remainingPopulation: {
      keys: remaining.reduce(function (n, r) { return n + r.keys; }, 0),
      shards: remaining,
      observedScenarioPartialMs: sumMs(function (r) { return r.observedScenarioPartialMs; }),
      observedScenarioComplete: remaining.every(function (r) { return r.observedScenarioComplete; }),
      ceilingScenarioChargedMs: sumMs(function (r) { return r.ceilingScenarioChargedMs; }),
      verdict: remainingMs >= sumMs(function (r) { return r.ceilingScenarioChargedMs; }) ? 'the guard-ceiling scenario fits the ' +
        'remaining allocation' : 'the guard-ceiling scenario does NOT fit the remaining allocation: the pilot is staged and ' +
        'possibly partial, unreached keys stay unstarted/inconclusive (never zero-cost or censored observations)'
    },
    igS05PrimaryTier: {
      population: IGS05_SEEDS + ' grid seeds per cell x proposal-only, ordinary-only and F1 x at most ' + IGS05_SAMPLES +
        ' samples per mode and grid, per cell',
      cells: primary,
      note: 'per-sample costs are the machine time of one pilot trial (cold start to cleanup, verifier and audit); a ' +
        'null cost is an unmeasured cell and mode, reported as such, never as zero'
    },
    admission: 'the dispatcher admits a trial only when its planning estimate fits the command window and the remaining ' +
      'task allocation; budgets and algorithm are never enlarged or shortened to make work fit'
  };
  doc.hash = C.digestOf(doc);
  return doc;
}

function writeOnce(repoRoot, dir, name, value) {
  return C.writeJsonAtomic(repoRoot, path.join(dir, name), value);
}

/** Writes pilot-reprojection.json (once) from the evidence of the round. */
function emitReprojection(repoRoot, round, override) {
  const dir = path.join(repoRoot, ...C.EVIDENCE_REL.split('/'), round, TASK);
  const file = path.join(dir, GATE_FILE);
  if (fs.existsSync(file)) return { written: false, file: file };
  const data = override || load(repoRoot, round);
  const records = override ? override.records : data.records;
  const time = override ? { chargedMs: override.chargedBeforeMs } : AG.machineTime(repoRoot, TASK, round);
  const doc = buildReprojection({ round: round, records: records, command: override ? override.command : null,
    chargedBeforeMs: time.chargedMs || 0, approvedExtraMs: 0 });
  writeOnce(repoRoot, dir, GATE_FILE, doc);
  return { written: true, file: file, doc: doc };
}

// --- the final summary --------------------------------------------------------------------------------------------------------------

function modeRows(data) {
  const rows = [];
  const cells = Array.from(new Set(data.manifest.jobs.map(function (j) { return j.puzzleVariant; })));
  cells.forEach(function (cell) {
    F.MODE_ORDER.forEach(function (mode) {
      const planned = data.manifest.jobs.filter(function (j) { return j.puzzleVariant === cell && j.mode === mode; });
      const recs = data.records.filter(function (r) { return r.puzzleVariant === cell && r.mode === mode; });
      const done = recs.filter(isCompleted);
      const st = recs.filter(started);
      const wall = st.map(function (r) { return r.generation ? r.generation.readyOccupiedWallMs : null; });
      const cpu = st.map(function (r) { return r.generation ? r.generation.cpuReadyTotalMs : null; });
      const count = function (field) { return mean(done.map(function (r) { return r.counts ? r.counts[field] : null; })); };
      const hits = recs.filter(function (r) { return r.verifiedExact === true; }).length;
      const wallKnown = wall.every(function (x) { return typeof x === 'number'; });
      const cpuKnown = cpu.every(function (x) { return typeof x === 'number'; });
      const wallSum = sumOf(wall);
      const cpuSum = sumOf(cpu);
      rows.push({
        cell: cell, mode: mode, kind: kindOf(mode), planned: planned.length, started: st.length,
        complete: done.length, censored: recs.filter(function (r) { return r.outcome === 'request-timeout'; }).length,
        budgetStops: recs.filter(function (r) { return r.outcome === 'sample-budget'; }).length,
        errors: recs.filter(function (r) { return r.outcome === 'error'; }).length,
        unstarted: planned.length - st.length,
        claimedExact: recs.filter(function (r) { return r.claimedExact === true; }).length, verifiedHits: hits,
        readyOccupiedWallMsMean: round1(mean(wall)), readyOccupiedWallMsMax: round1(maxOf(wall)),
        cpuReadyTotalMsMean: round1(mean(cpu)),
        hitsPerCpuSecond: st.length > 0 && cpuKnown ? R.ratePerSecond(hits, cpuSum, 'resolved') : null,
        hitsPerReadyWallSecond: st.length > 0 && wallKnown ? R.ratePerSecond(hits, wallSum, 'resolved') : null,
        counts: { floorTests: round1(count('floorTests')), floorDeductions: round1(count('floorDeductions')),
          solverChecks: round1(count('solverChecks')), dfsEntries: round1(count('dfsEntries')),
          dfsChecks: round1(count('dfsChecks')), ladderPasses: round1(count('ladderPasses')),
          phaseBSolves: round1(count('phaseBSolves')), deepenProposals: round1(count('deepenProposals')),
          verificationSolves: round1(count('verificationSolves')), phaseBTries: round1(count('phaseBTries')),
          fuFilterSolves: round1(count('fuFilterSolves')) },
        maxCounts: { floorTests: maxOf(done.map(function (r) { return r.counts ? r.counts.floorTests : null; })),
          floorDeductions: maxOf(done.map(function (r) { return r.counts ? r.counts.floorDeductions : null; })),
          solverChecks: maxOf(done.map(function (r) { return r.counts ? r.counts.solverChecks : null; })),
          dfsEntries: maxOf(done.map(function (r) { return r.counts ? r.counts.dfsEntries : null; })),
          dfsChecks: maxOf(done.map(function (r) { return r.counts ? r.counts.dfsChecks : null; })) }
      });
    });
  });
  return rows;
}

function pairedComparisons(data) {
  const byCluster = new Map();
  data.records.filter(function (r) { return started(r) && r.gridCluster; }).forEach(function (r) {
    if (!byCluster.has(r.gridCluster)) byCluster.set(r.gridCluster, {});
    byCluster.get(r.gridCluster)[r.mode] = r;
  });
  const pairs = [['F0', 'F1', 'isolated S2 comparison'], ['FC', 'F1', 'floor choice'], ['FM', 'F1', 'floor choice'],
    ['FU', 'F1', 'uniqueness filter'], ['FS', 'F1', 'reference-parent choice']];
  const out = [];
  byCluster.forEach(function (arms, cluster) {
    pairs.forEach(function (p) {
      const a = arms[p[0]];
      const b = arms[p[1]];
      if (!a || !b) return;
      const w = function (r) { return r.generation ? r.generation.readyOccupiedWallMs : null; };
      const ratio = function (x, y) { return R.ratio(x, y); };
      out.push({ cluster: cluster, comparison: p[0] + ' / ' + p[1], purpose: p[2], aOutcome: a.outcome, bOutcome: b.outcome,
        wallRatio: isCompleted(a) && isCompleted(b) ? ratio(w(a), w(b)) : null,
        floorDeductionRatio: isCompleted(a) && isCompleted(b) && a.counts && b.counts ? ratio(a.counts.floorDeductions,
          b.counts.floorDeductions) : null,
        aHit: a.verifiedExact === true, bHit: b.verifiedExact === true });
    });
  });
  return out;
}

/**
 * Which branches the r2 corrections touch were exercised by the completed trials (read from their records only; every
 * trial of this pilot ran the code before the corrections).
 */
function branchReview(data) {
  const trials = data.records.filter(function (r) { return isCompleted(r) && r.frontier; });
  const lastRungOf = function (f) { return f.passes.length === 0 ? null : f.passes[f.passes.length - 1].rung; };
  const earlierEntries = trials.filter(function (r) {
    const last = lastRungOf(r.frontier);
    return (r.frontier.entries || []).some(function (e) { return e.rung !== last; });
  });
  const earlierTried = trials.filter(function (r) {
    const last = lastRungOf(r.frontier);
    return (r.frontier.phaseB || []).some(function (row) { return row.rung !== last; });
  });
  const skipsAfterFirst = trials.filter(function (r) {
    return r.frontier.passes.slice(1).some(function (p) { return p.skippedMinClues + p.skippedUnitMinimum > 0; });
  });
  const rows = [].concat.apply([], trials.map(function (r) { return r.frontier.phaseB || []; }));
  const solves = rows.filter(function (row) { return row.allowedStatus !== undefined && row.allowedStatus !== null; });
  const statusCount = function (name) { return solves.filter(function (row) { return row.allowedStatus === name; }).length; };
  const sumCount = function (field) { return sumOf(trials.map(function (r) { return r.counts ? r.counts[field] : null; })); };
  const deepenRuns = sumOf(trials.map(function (r) { return (r.frontier.deepen && r.frontier.deepen.runs || []).length; }));
  return {
    completedFrontierTrials: trials.length,
    lastRungOnly: { trialsWithEarlierRungEntryAtPhaseB: earlierEntries.length, trialsWithEarlierRungTry: earlierTried.length,
      trialsWithLaterSkips: skipsAfterFirst.length, exercised: earlierEntries.length > 0 || earlierTried.length > 0 },
    unsupportedObjective: { deepenRuns: deepenRuns,
      trialsWithNonNumericObjective: trials.filter(function (r) { return r.frontier.objectiveKind !== 'numeric'; }).length,
      exercised: trials.some(function (r) { return r.frontier.objectiveKind !== 'numeric'; }) },
    allowedSetStatus: { allowedSetSolves: solves.length, solved: statusCount('solved'), stuck: statusCount('stuck'),
      contradiction: statusCount('contradiction'),
      other: solves.length - statusCount('solved') - statusCount('stuck') - statusCount('contradiction'),
      exercised: solves.length - statusCount('solved') - statusCount('stuck') > 0 },
    kfAttempts: { phaseBTriesTotal: sumCount('phaseBTries'), phaseBSolvesTotal: sumCount('phaseBSolves'),
      fuFilterSolvesTotal: sumCount('fuFilterSolves'),
      trialsAtKF: trials.filter(function (r) { return r.counts && r.counts.phaseBTries >= SB.K_F; }).length, K_F: SB.K_F }
  };
}

/** The machine time with the approved extension of the task (the ledger approvals), as IG-S03 reports it. */
function machineOf(repoRoot, round) {
  const m = AG.machineTime(repoRoot, TASK, round);
  const approvals = RUN.readLedger(path.join(RUN.evidenceRootOf(repoRoot), round)).approvals.filter(function (a) {
    return a.task === TASK && Number.isFinite(a.extraMs);
  });
  m.approvedExtraMs = approvals.reduce(function (n, a) { return n + a.extraMs; }, 0);
  m.approvals = approvals;
  m.effectiveCapMs = m.allocationMs + m.approvedExtraMs;
  m.remainingMs = m.effectiveCapMs - m.chargedMs;
  return m;
}

function acceptance(data, audit, budgets, synthetic, budgetsFile) {
  const frontier = data.records.filter(function (r) { return started(r) && r.mode && kindOf(r.mode) === 'frontier'; });
  const falseFlags = data.records.filter(function (r) { return r.claimedExact === true && r.verifiedExact === false; }).length;
  const errors = data.records.filter(function (r) { return r.outcome === 'error'; }).length;
  const unitTests = 'frontier-test.cjs: pure cases (fake engine) and the engine cases of the first command';
  const stateOf = function (ok) { return ok ? 'met' : 'NOT met'; };
  return [
    { id: 'B01', status: stateOf(true), evidence: 'variant-manifest.json lists the eight modes with floors, S2, parent, filter, forks, ' +
      'budgets and every interpretation; nothing is adopted silently' },
    { id: 'B02', status: stateOf(frontier.every(function (r) { return r.counts !== null; }) || frontier.length === 0),
      evidence: 'every frontier record carries floor tests by rung, DFS entries/checks, ladder passes, phaseB solves, deepen ' +
        'proposals and verification solves; refused-test DFS is in the per-phase cost (phaseA includes it)' },
    { id: 'B03', status: stateOf(true), evidence: 'every document says provisional (pre-freeze); no variant, S1 or bank decision is made' },
    { id: 'T01', status: stateOf(true), evidence: unitTests + ': every floor solve asserts assumeUniqueness false; FU enables it only ' +
      'after the fresh DFS proof of that candidate' },
    { id: 'T02', status: stateOf(true), evidence: 'S2 is the Rederived signal (never a solved report or a rating); the audit compares ' +
      'ordinals' + (audit.correctnessProblems === 0 ? ' (0 correctness problems)' : ' (' + audit.correctnessProblems + ' correctness problems)') },
    { id: 'T03', status: stateOf(true), evidence: 'reference hashes and the immutable snapshot hashes are recorded per phaseB try and checked; ' +
      'a fresh bounded count precedes every reference candidate' },
    { id: 'T04', status: stateOf(true), evidence: 'every dimension is charged; a stop is outcome sample-budget with the dimension; the hooks ' +
      'and the solution are restored (unit and engine cases)' },
    { id: 'T05', status: stateOf(Object.keys(budgets.cells).every(function (c) {
      const cell = budgets.cells[c];
      return cell.status === 'fitted' || cell.status === 'unfitted';
    })), evidence: (budgetsFile || 'budgets.json') + ': the fixed rule; cells fitted: ' + Object.keys(budgets.cells).filter(function (c) {
      return budgets.cells[c].status === 'fitted'; }).join(', ') + '; unfitted (pilot ceilings kept): ' +
      (Object.keys(budgets.cells).filter(function (c) { return budgets.cells[c].status !== 'fitted'; }).join(', ') || 'none') },
    { id: 'correctness', status: stateOf(falseFlags === 0 && errors === 0 && audit.correctnessProblems === 0),
      evidence: falseFlags + ' false exact flags, ' + errors + ' error records, ' + audit.correctnessProblems + ' audit correctness problems' }
  ];
}

function summaryDoc(data, round, extra) {
  const rows = modeRows(data);
  const time = machineOf(extra.repoRoot, round);
  const startedCount = data.records.filter(started).length;
  const counts = {
    planned: data.manifest.jobs.length,
    started: startedCount,
    completed: data.records.filter(isCompleted).length,
    censored: data.records.filter(function (r) { return r.outcome === 'request-timeout'; }).length,
    budgetStops: data.records.filter(function (r) { return r.outcome === 'sample-budget'; }).length,
    errors: data.records.filter(function (r) { return r.outcome === 'error'; }).length,
    unstarted: data.manifest.jobs.length - startedCount
  };
  const doc = {
    schema: 'ig-s04-summary/1',
    task: TASK,
    round: round,
    revision: extra.revision || 'r1',
    evidenceStatus: data.manifest.evidenceStatus,
    provisionalNotice: NOTICE,
    formalGate: 'not-evaluable-pre-freeze',
    coverage: counts,
    history: extra.history || null,
    byShard: data.got.shards.map(function (sh) {
      return { shard: sh.shard, status: sh.status, attempts: sh.chain, unstartedKeys: sh.unstartedKeys };
    }),
    perCellMode: rows,
    pairedComparisons: pairedComparisons(data),
    machine: time,
    budgets: Object.keys(extra.budgets.cells).map(function (c) {
      const x = extra.budgets.cells[c];
      return { cell: c, status: x.status, limits: x.limits, problems: x.problems || [] };
    }),
    budgetsFile: extra.budgetsFile || 'budgets.json',
    budgetsHash: extra.budgets.hash,
    budgetsFrozenEarlier: extra.budgetsFrozenEarlier === true,
    harness: { trialsAndBudgetFit: extra.budgets.harnessFingerprint || null, thisSummary: extra.harnessFingerprint || null,
      note: 'the two differ after the r2 corrections edited the harness files; every trial and the frozen budget fit ' +
        'belong to the first one' },
    branchReview: extra.branchReview || null,
    engineRetest: extra.engineRetest || null,
    s2Audit: { trialsAudited: extra.audit.trialsAudited, acceptedRemovals: extra.audit.acceptedRemovals,
      rederivedRemovals: extra.audit.rederivedRemovals, auditedRemovals: extra.audit.auditedRemovals,
      operationalDisagreements: extra.audit.operationalDisagreements, correctnessProblems: extra.audit.correctnessProblems },
    reprojection: extra.reprojection,
    finalProjection: extra.finalProjection,
    interpretationNotes: [
      'S1 is a hit-rate item, not a speed item: these pilot hit counts (one sample per mode, two grids per cell) are small-n ' +
        'descriptions and carry no uncertainty guarantee; the gating numbers come from the frozen catalogue later',
      'F0/F1 is the isolated S2 comparison, FC/FM/F1 the floor choices, FU/F1 the uniqueness filter, FS/F1 the reference-parent ' +
        'choice; the gains are correlated and are not multiplied as independent factors',
      'phase A is not empty: it accepts many removals (the accepted counts are in the records and the per-pass table); what ' +
        'often comes out empty is the frontier LIST (every refused group proved ambiguous by the DFS), an anticipated failure ' +
        'mode of the route, and the DFS after every genuinely stuck floor test is the intended behaviour',
      'the final phase A parent is omitted as a DECLARED PROTOTYPE RESTRICTION, not a theorem: S2 operational solvability is ' +
        'heuristic and canonical requiredness is the authority',
      'K_F = 12 bounds the ATTEMPTED phase-B entries (phaseB tries); the allowed-set solves are only those attempts that passed ' +
        'the fresh uniqueness proof (and the FU filter); K_F = 12 and the 16 deepen proposals are acceptable prototype limits',
      'unreached keys are unstarted/inconclusive: they are not zero-cost trials and not censored observations'
    ],
    acceptance: acceptance(data, extra.audit, extra.budgets, null, extra.budgetsFile)
  };
  doc.hash = C.digestOf(doc);
  return doc;
}

function fmt(v) {
  if (v === null || v === undefined) return 'n/a';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2);
  return String(v);
}

function table(headers, body) {
  const lines = ['| ' + headers.join(' | ') + ' |', '|' + headers.map(function () { return '---'; }).join('|') + '|'];
  body.forEach(function (row) { lines.push('| ' + row.map(fmt).join(' | ') + ' |'); });
  return lines.join('\n');
}

function renderSummary(doc) {
  const revised = doc.revision && doc.revision !== 'r1';
  const out = ['# IG-S04 summary (' + doc.round + (revised ? ', revision ' + doc.revision : '') + ')', '',
    '**' + doc.provisionalNotice + '**', '',
    'Formal gate: **' + doc.formalGate + '**. Evidence status: **' + doc.evidenceStatus + '**.', '', '## Coverage', ''];
  const c = doc.coverage;
  out.push(table(['planned', 'started', 'completed', 'censored (45 s guard)', 'sample-budget', 'errors', 'unstarted'],
    [[c.planned, c.started, c.completed, c.censored, c.budgetStops, c.errors, c.unstarted]]), '');
  out.push('Unstarted keys are inconclusive: they are not zero-cost trials and not censored observations.', '');
  if (doc.history) {
    const h = doc.history;
    out.push('History: the first summary (r1) was written with ' + h.r1.started + ' of ' + h.r1.planned + ' keys started, ' +
      'i.e. ' + h.r1.unstartedKeys.length + ' unstarted keys (its coverage header showed ' + h.r1.headerUnstarted + ', because a ' +
      'shard that never started has no records). The ' + h.r1.unstartedKeys.length + ' keys were started after the ' +
      'orchestrator approved the extension: ' + h.lateKeys.map(function (k) {
        return k.key.split('/').slice(-3).join('/') + ' (' + k.outcome + ')'; }).join('; ') + '.', '');
  }
  out.push('## Cost and exact hits per cell and mode (descriptive: one sample per mode and grid, grids 11 and 12)', '');
  out.push(table(['cell', 'mode', 'started', 'complete', 'censored', 'budget', 'err', 'unstarted', 'claimed', 'verified hits',
    'ready wall ms mean', 'max', 'cpu ms mean'], doc.perCellMode.filter(function (r) { return r.started > 0 || r.planned > 0; })
    .map(function (r) {
      return [r.cell, r.mode, r.started, r.complete, r.censored, r.budgetStops, r.errors, r.unstarted, r.claimedExact,
        r.verifiedHits, r.readyOccupiedWallMsMean, r.readyOccupiedWallMsMax, r.cpuReadyTotalMsMean];
    })), '');
  out.push('Hits per CPU second and per ready wall second divide the verified hits by all spent ready-interval work of the ' +
    'started trials (censored ones included); n is two grids per mode and cell, so these are not rates to compare.', '');
  out.push(table(['cell', 'mode', 'verified hits', 'hits / CPU s', 'hits / ready wall s'], doc.perCellMode.filter(function (r) {
    return r.started > 0; }).map(function (r) { return [r.cell, r.mode, r.verifiedHits, r.hitsPerCpuSecond, r.hitsPerReadyWallSecond]; })), '');
  out.push('## Budget parts per sample (mean over the completed trials; null where a native arm has no such part)', '');
  out.push('"phaseB tries" are the attempted entries (at most K_F = 12); "phaseB solves" are the allowed-set solves, only the ' +
    'attempts that passed the fresh uniqueness proof (and the FU filter, whose own solves are counted apart).', '');
  out.push(table(['cell', 'mode', 'floor tests', 'floor deductions', 'logical checks', 'DFS entries', 'DFS checks', 'ladder passes',
    'phaseB tries', 'FU filter solves', 'phaseB solves', 'deepen proposals', 'verification solves'],
  doc.perCellMode.filter(function (r) { return r.complete > 0; })
    .map(function (r) {
      const k = r.counts;
      return [r.cell, r.mode, k.floorTests, k.floorDeductions, k.solverChecks, k.dfsEntries, k.dfsChecks, k.ladderPasses,
        k.phaseBTries, k.fuFilterSolves, k.phaseBSolves, k.deepenProposals, k.verificationSolves];
    })), '');
  out.push('## Paired comparisons (same grid; not multiplied)', '');
  out.push(table(['grid', 'comparison', 'purpose', 'outcomes', 'wall ratio', 'floor-deduction ratio', 'hit a', 'hit b'],
    doc.pairedComparisons.map(function (p) {
      return [p.cluster, p.comparison, p.purpose, p.aOutcome + ' / ' + p.bOutcome, p.wallRatio, p.floorDeductionRatio, p.aHit, p.bHit];
    })), '');
  out.push('## Budgets (' + doc.budgetsFile + ', hash ' + doc.budgetsHash + ')', '');
  out.push(table(['cell', 'status', 'problems'], doc.budgets.map(function (b) {
    return [b.cell, b.status, b.problems.map(function (p) { return p.key.split('/').slice(-2).join('/') + ': ' + p.problem; }).join('; ') || 'none'];
  })), '');
  out.push(table(['cell', 'floor tests', 'ladder passes', 'phaseB solves', 'deepen proposals', 'canonical ratings',
    'floor deductions', 'logical checks', 'DFS entries', 'DFS checks'], doc.budgets.map(function (b) {
    const l = b.limits || {};
    return [b.cell, l.floorTests, l.ladderPasses, l.phaseBSolves, l.deepenProposals, l.canonicalRatings, l.floorDeductions,
      l.solverChecks, l.dfsEntries, l.dfsChecks];
  })), '');
  if (doc.branchReview) {
    const b = doc.branchReview;
    out.push('## Corrections of revision r2: did a completed trial exercise the affected branch?', '');
    out.push('Every trial of this pilot ran the code before the corrections; the table reads their records (' +
      b.completedFrontierTrials + ' completed frontier trials).', '');
    out.push(table(['correction', 'branch', 'evidence in the completed trials', 'exercised'], [
      ['1 last executed rung only', 'an earlier-rung entry reaching phase B', 'trials with such an entry ' +
        b.lastRungOnly.trialsWithEarlierRungEntryAtPhaseB + ', such a try ' + b.lastRungOnly.trialsWithEarlierRungTry +
        '; trials with a later-pass clue/unit skip ' + b.lastRungOnly.trialsWithLaterSkips, b.lastRungOnly.exercised],
      ['2 unsupported objective', 'a non-numeric objective in deepen', b.unsupportedObjective.deepenRuns + ' deepen runs, ' +
        b.unsupportedObjective.trialsWithNonNumericObjective + ' with a non-numeric objective', b.unsupportedObjective.exercised],
      ['3 contradiction after proved uniqueness', 'an allowed-set solve ending other than solved or stuck',
        b.allowedSetStatus.allowedSetSolves + ' allowed-set solves: ' + b.allowedSetStatus.solved + ' solved, ' +
        b.allowedSetStatus.stuck + ' stuck, ' + b.allowedSetStatus.contradiction + ' contradiction, ' +
        b.allowedSetStatus.other + ' other', b.allowedSetStatus.exercised],
      ['5 attempts versus solves', 'K_F = ' + b.kfAttempts.K_F + ' attempts and allowed-set solves (wording and report only)',
        b.kfAttempts.phaseBTriesTotal + ' phase-B tries, ' + b.kfAttempts.phaseBSolvesTotal + ' allowed-set solves, ' +
        b.kfAttempts.fuFilterSolvesTotal + ' FU filter solves; trials at K_F: ' + b.kfAttempts.trialsAtKF, null]
    ]), '');
    const touched = b.lastRungOnly.exercised || b.unsupportedObjective.exercised || b.allowedSetStatus.exercised;
    out.push((touched ? 'At least one correction touched a completed trial: see the table. ' :
      'None of the corrected branches (1, 2, 3) was reached by a completed trial, so no completed trial record changes. ') +
      'Corrections 4 (the declared restriction), 5 (the attempts-versus-solves wording and columns), 6 (the coverage header) ' +
      'and 7 (the wording) are documentation and reporting only.', '');
  }
  if (doc.engineRetest) {
    const t = doc.engineRetest;
    out.push('## Self-tests after the corrections', '');
    out.push('Pure cases: ' + t.pure + '. Engine cases rerun in one wrapped command (' + t.file + '): ' + t.passed + '/' + t.total +
      ' passed' + (t.ok ? '' : ' (FAILED)') + '; the parity run is not touched by the corrections (hooks and adapter unchanged) and ' +
      'was not repeated.', '');
  }
  out.push('## S2 audit', '');
  const a = doc.s2Audit;
  out.push(table(['trials audited', 'accepted removals', 'S2 re-derived', 'audited removals', 'operational disagreements',
    'correctness problems'], [[a.trialsAudited, a.acceptedRemovals, a.rederivedRemovals, a.auditedRemovals,
    a.operationalDisagreements, a.correctnessProblems]]), '');
  out.push('## Machine time', '');
  const m = doc.machine;
  out.push('Allocation ' + fmt(m.allocationMs / 1000) + ' s' + (m.approvedExtraMs ? ' plus ' + fmt(m.approvedExtraMs / 1000) +
    ' s approved by the orchestrator (cap ' + fmt(m.effectiveCapMs / 1000) + ' s)' : '') + ', charged ' + fmt(m.chargedMs / 1000) +
    ' s over ' + m.commands + ' commands (occupied wrapper time + 45 s grace each), remaining ' + fmt(m.remainingMs / 1000) +
    ' s; priority waits ' + fmt(m.priorityWaitMs / 1000) + ' s, not charged.', '');
  if (doc.finalProjection) {
    out.push('## Projection for IG-S05 (a projection, not a measurement)', '');
    out.push('```json', JSON.stringify(doc.finalProjection, null, 2), '```', '');
  }
  out.push('## Acceptance criteria', '');
  out.push(table(['id', 'status', 'evidence'], doc.acceptance.map(function (x) { return [x.id, x.status, x.evidence]; })), '');
  out.push('## Notes', '');
  doc.interpretationNotes.forEach(function (n) { out.push('- ' + n); });
  return C.normaliseText(out.join('\n'));
}

function build(repoRoot, round, suffix) {
  const data = load(repoRoot, round);
  const dir = path.join(repoRoot, ...C.EVIDENCE_REL.split('/'), round, TASK);
  const harness = C.harnessFingerprint().fingerprint;
  const sfx = suffix || '';
  const variants = variantManifest(data, round);
  // A budget fit frozen earlier under this suffix (with the harness that ran the trials) is reused, never recomputed.
  const budgetsFile = path.join(dir, 'budgets' + sfx + '.json');
  const frozenBudgets = fs.existsSync(budgetsFile);
  const budgets = frozenBudgets ? C.readJson(budgetsFile) : budgetsDoc(data, round, harness);
  const audit = s2AuditDoc(data, round);
  const gateFile = path.join(dir, GATE_FILE);
  const reprojection = fs.existsSync(gateFile) ? C.readJson(gateFile) : null;
  const time = machineOf(repoRoot, round);
  const final = buildReprojection({ round: round, records: data.records, command: null,
    chargedBeforeMs: time.chargedMs, approvedExtraMs: time.approvedExtraMs });
  const finalProjection = { remainingPopulation: final.remainingPopulation, igS05PrimaryTier: final.igS05PrimaryTier,
    allocation: final.allocation, note: 'recomputed from all pilot records at the end of the task' };
  const extra = { repoRoot: repoRoot, budgets: budgets, audit: audit, budgetsFile: 'budgets' + sfx + '.json',
    budgetsFrozenEarlier: frozenBudgets, harnessFingerprint: harness,
    reprojection: reprojection ? { file: GATE_FILE, hash: reprojection.hash } : null, finalProjection: finalProjection };
  if (sfx !== '') {
    extra.revision = sfx.replace(/^-/, '');
    extra.branchReview = branchReview(data);
    extra.history = historyOf(data, dir);
    const retestFile = path.join(dir, 'engine-retest' + sfx + '.json');
    if (fs.existsSync(retestFile)) {
      const retest = C.readJson(retestFile);
      extra.engineRetest = { file: 'engine-retest' + sfx + '.json', ok: retest.ok, passed: retest.passed, total: retest.total,
        pure: retest.pure || 'see the pure run of the revision' };
    }
  }
  const summary = summaryDoc(data, round, extra);
  if (sfx !== '') {
    delete variants.hash;
    variants.revisionNote = 'revision ' + extra.revision + ': the interpretations list was corrected (last executed rung ' +
      'only, unsupported objective as a stop, contradiction after proved uniqueness as an error, the final-parent omission ' +
      'as a declared prototype restriction, attempted versus solved phase-B entries); the trials ran before these ' +
      'corrections (see the branch review of summary' + sfx + '.json)';
    variants.hash = C.digestOf(variants);
  }
  writeOnce(repoRoot, dir, 'variant-manifest' + sfx + '.json', variants);
  if (!frozenBudgets) writeOnce(repoRoot, dir, 'budgets' + sfx + '.json', budgets);
  writeOnce(repoRoot, dir, 's2-audit' + sfx + '.json', audit);
  writeOnce(repoRoot, dir, 'summary' + sfx + '.json', summary);
  C.writeTextExclusive(repoRoot, path.join(dir, 'summary' + sfx + '.md'), renderSummary(summary));
  return { dir: dir, variants: variants, budgets: budgets, audit: audit, summary: summary, budgetsFrozenEarlier: frozenBudgets };
}

/** What the first summary (r1) reported and which of its unstarted keys were started later (evidence read back). */
function historyOf(data, dir) {
  const r1File = path.join(dir, 'summary.json');
  if (!fs.existsSync(r1File)) return null;
  const r1 = C.readJson(r1File);
  const keys = [].concat.apply([], r1.byShard.map(function (s) { return s.unstartedKeys || []; }));
  const byKey = new Map(data.records.map(function (r) { return [r.key, r]; }));
  return {
    r1: { planned: r1.coverage.planned, started: r1.coverage.started, headerUnstarted: r1.coverage.unstarted,
      unstartedKeys: keys, hash: r1.hash },
    lateKeys: keys.map(function (key) {
      const r = byKey.get(key);
      return { key: key, outcome: r ? r.outcome : 'missing' };
    })
  };
}

function parseArgs(argv) {
  const out = { task: TASK, round: null, suffix: '', reprojection: false };
  argv.forEach(function (arg) {
    if (arg === '--reprojection') out.reprojection = true;
    else {
      const m = /^--(task|round|suffix)=(.*)$/.exec(arg);
      if (!m) throw new Error('unknown argument ' + arg);
      out[m[1]] = m[2];
    }
  });
  if (out.task !== TASK || !out.round) throw new Error('usage: ig04-aggregate.cjs --task=IG-S04 --round=<round> [--suffix=-r2] [--reprojection]');
  return out;
}

module.exports = { TASK, GATE_FILE, load, variantManifest, setsFromCatalogue, budgetsDoc, s2AuditDoc, buildReprojection,
  emitReprojection, modeRows, pairedComparisons, summaryDoc, renderSummary, build, costTable, perSampleBasis, machineMsOf };

if (require.main === module) {
  const opts = parseArgs(process.argv.slice(2));
  const repoRoot = C.DEFAULT_REPO_ROOT;
  if (opts.reprojection) {
    const out = emitReprojection(repoRoot, opts.round);
    process.stdout.write((out.written ? 'written ' : 'exists ') + path.relative(repoRoot, out.file) + '\n');
  } else {
    const out = build(repoRoot, opts.round, opts.suffix);
    process.stdout.write('written ' + path.relative(repoRoot, out.dir) + ' (budgets hash ' + out.budgets.hash + ')\n');
  }
}
