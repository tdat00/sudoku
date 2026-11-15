'use strict';

/*
 * IG-S10 tests: synthetic reporting and gate cases plus consistency checks of the reconciliation on the accepted evidence.
 * Pure: no engine, no worker, no clock-dependent assertion, no git. `node ig10-test.cjs` runs them all (the wrapped IG-S10
 * command runs the same cases first and writes nothing if one fails). The gate cases use SYNTHETIC 40-cluster fixtures: their
 * statistics are not a real frozen decision.
 *
 * Groups: `gate` (gate.cjs on synthetic frozen records) and `reconcile` (coverage rules, statistics rules, the real accepted
 * evidence reconciled into the documents).
 */
const fs = require('fs');
const path = require('path');
const C = require('./common.cjs');
const R = require('./records.cjs');
const M = require('./manifest.cjs');
const RUN = require('./run.cjs');
const G = require('./gate.cjs');
const S = require('./ig05-stats.cjs');
const RC = require('./reconcile.cjs');

const cases = [];
function add(group, id, title, fn) { cases.push({ group: group, id: id, title: title, fn: fn }); }

function ok(cond, message) { if (!cond) throw new Error(message || 'assertion failed'); }
function eq(a, b, message) {
  ok(C.canonicalJson(a) === C.canonicalJson(b), (message || 'not equal') + ': ' + C.canonicalJson(a) + ' vs ' + C.canonicalJson(b));
}
function near(a, b, tol, message) { ok(typeof a === 'number' && Math.abs(a - b) <= tol, (message || 'not near') + ': ' + a + ' vs ' + b); }

// --- synthetic frozen fixtures ----------------------------------------------------------------------------------------------

const FP = 'a'.repeat(64);
const CAT = 'b'.repeat(64);
const SEEDS = Array.from({ length: 40 }, function (_x, i) { return 101 + i; });
const REQUEST_SEEDS = Array.from({ length: 40 }, function (_x, i) { return 201 + i; });
const LIMITS = { defaults: { pipelineDefaultMaxAttempts: 8, capRatings: 1024 }, guards: { requestMs: 180000, sampleMs: 45000 },
  budgetHash: 'c'.repeat(64) };

function freezeReceipt(over) {
  return Object.assign({ schema: 'ig-s-freeze/1', acceptedLabels: { ms17b: 'MS17b-accepted', ms18e: 'MS18e-accepted' },
    runtimeFingerprint: FP, catalogueFingerprint: CAT, limitsAndDefaults: JSON.parse(JSON.stringify(LIMITS)),
    attestation: { by: 'orchestrator', text: 'the synthetic freeze of a unit test' } }, over || {});
}
function budgetReceipt(over) {
  return Object.assign({ schema: 'ig-s-budget/1', authorisedTotalMs: 1e7, perTaskMs: { 'IG-S05': 1e7 }, runtimeFingerprint: FP,
    source: 'synthetic', attestation: { by: 'orchestrator' } }, over || {});
}

function sm2Record(cell, seed, mode, o) {
  const x = o || {};
  const hit = x.hit === true;
  return { key: 'syn/' + cell + '/' + seed + '/' + mode, puzzleVariant: cell, requestSeed: seed, gridCluster: seed, mode: mode,
    outcome: x.outcome || 'complete', claimedExact: x.claimed === undefined ? hit : x.claimed,
    verifiedExact: x.verified === undefined ? hit : x.verified,
    generation: { cpuReadyTotalMs: x.cpu === undefined ? 500 : x.cpu, readyOccupiedWallMs: x.wall === undefined ? 300 : x.wall,
      cpuTotalMs: 600, occupiedWallMs: 400 } };
}

/** All 320 grid trials of a cell: `spec(mode, seed)` returns the options of one record, null leaves the row out. */
function sm2Records(cell, spec) {
  const out = [];
  SEEDS.forEach(function (seed) {
    S.MODES.forEach(function (mode) {
      const o = spec ? spec(mode, seed) : {};
      if (o !== null) out.push(sm2Record(cell, seed, mode, o));
    });
  });
  return out;
}

function requestRecord(cell, seed, mode, o) {
  const x = o || {};
  const hit = x.hit === true;
  return { key: 'syn/req/' + cell + '/' + seed + '/' + mode, puzzleVariant: cell, requestSeed: seed, mode: mode,
    outcome: x.outcome || 'complete', claimedExact: x.claimed === undefined ? hit : x.claimed,
    verifiedExact: x.verified === undefined ? hit : x.verified, firstExactOrigin: x.origin || 'sample',
    generation: { coldWallMs: x.cold === undefined ? 5000 : x.cold, cpuTotalMs: 9000 } };
}

function frozenInput(over) {
  return Object.assign({ round: 'frozen-gate', freezeReceipt: freezeReceipt(), budgetReceipt: budgetReceipt(), runtimeFingerprint: FP,
    catalogueFingerprint: CAT, observedLimits: JSON.parse(JSON.stringify(LIMITS)), cells: ['classic9'], seeds: SEEDS,
    requestSeeds: REQUEST_SEEDS, sm2Records: sm2Records('classic9', null), requestRecords: [], quantumMs: 16, assumptions: null }, over || {});
}

const cell9 = function (gate) { return gate.cells.classic9; };

// --- gate cases ----------------------------------------------------------------------------------------------------------------

add('gate', 'g01-provisional-never-evaluable', 'a provisional round is not evaluable whatever the numbers, receipts or flags say', function () {
  const hits = function (mode) { return mode === 'F1' ? { hit: true } : {}; };
  const gate = G.evaluateFrozenGate(frozenInput({ round: 'provisional-r1', ratingVersion: 3, frozen: true,
    sm2Records: sm2Records('classic9', hits) }));
  eq(gate.state, 'not-evaluable-pre-freeze');
  eq(gate.formalGateEnabled, false);
  eq(gate.formalVerdict, null);
  eq(Object.keys(gate.cells).length, 0, 'no cell is evaluated before the freeze');
  const real = G.provisionalGate({ round: 'provisional-r1', runtimeFingerprint: FP });
  eq(real.state, 'not-evaluable-pre-freeze');
  eq(real.usedAsFormalGate, false);
});

add('gate', 'g02-source-not-attested', 'a frozen flag is not a freeze; invalid, mismatched or missing receipts and catalogue states are named', function () {
  eq(G.evaluateFrozenGate(frozenInput({ freezeReceipt: null, ratingVersion: 3, frozen: true })).state, 'frozen-receipt-missing');
  eq(G.evaluateFrozenGate(frozenInput({ freezeReceipt: freezeReceipt({ attestation: null }) })).state, 'frozen-receipt-invalid');
  eq(G.evaluateFrozenGate(frozenInput({ runtimeFingerprint: 'd'.repeat(64) })).state, 'frozen-runtime-mismatch');
  eq(G.evaluateFrozenGate(frozenInput({ budgetReceipt: null })).state, 'frozen-budget-missing');
  eq(G.evaluateFrozenGate(frozenInput({ budgetReceipt: budgetReceipt({ runtimeFingerprint: 'e'.repeat(64) }) })).state, 'frozen-runtime-mismatch');
  eq(G.evaluateFrozenGate(frozenInput({ catalogueFingerprint: 'f'.repeat(64) })).state, 'frozen-catalogue-mismatch');
  eq(G.evaluateFrozenGate(frozenInput({ catalogueFingerprint: null })).state, 'frozen-catalogue-unverified');
  const refused = G.evaluateFrozenGate(frozenInput({ freezeReceipt: null }));
  eq(refused.formalGateEnabled, false);
  eq(Object.keys(refused.cells).length, 0);
});

add('gate', 'g03-mismatched-limits', 'limits and defaults that differ from the attested ones stop the evaluation', function () {
  const other = JSON.parse(JSON.stringify(LIMITS));
  other.guards.requestMs = 240000;
  const bad = G.evaluateFrozenGate(frozenInput({ observedLimits: other }));
  eq(bad.state, 'frozen-limits-mismatch');
  ok(bad.reasons[0].indexOf('guards') === 0, 'the differing key is named');
  eq(Object.keys(bad.cells).length, 0);
  eq(G.evaluateFrozenGate(frozenInput({ observedLimits: undefined })).state, 'frozen-limits-unverified');
  const missingKey = JSON.parse(JSON.stringify(LIMITS));
  delete missingKey.defaults;
  eq(G.evaluateFrozenGate(frozenInput({ observedLimits: missingKey })).state, 'frozen-limits-mismatch');
  eq(G.evaluateFrozenGate(frozenInput()).state, 'frozen-inputs-collected');
});

add('gate', 'g04-incomplete-paired-controls', 'a missing control or variant makes the cell inconclusive and is never dropped', function () {
  const gate = G.evaluateFrozenGate(frozenInput({ sm2Records: sm2Records('classic9', function (mode, seed) {
    return mode === 'proposal-only' && seed < 104 ? null : {};
  }) }));
  const c = cell9(gate);
  eq(c.verdict, 'inconclusive');
  eq(c.coverage.controlsComplete, false);
  ok(c.coverage.modesWithMissingTrials.indexOf('proposal-only') >= 0);
  eq(c.perMode['proposal-only'].trials, 37, 'the three unstarted trials are not silently dropped from the plan');
  eq(c.coverage.unstarted, 3);
  eq(gate.state, 'frozen-inconclusive');
  eq(gate.formalGateEnabled, false);
  const few = G.evaluateFrozenGate(frozenInput({ seeds: SEEDS.slice(0, 8), sm2Records: sm2Records('classic9', null).filter(function (r) {
    return r.requestSeed < 109; }) }));
  eq(cell9(few).verdict, 'inconclusive');
  ok(cell9(few).reasons.join(' ').indexOf('fewer than 40') >= 0, 'eight clusters are not a frozen decision population');
});

add('gate', 'g05-zero-hits-no-pseudo-count', 'zero hits give a zero rate and a zero lower bound, never a pseudo-count; identical resamples are labelled degenerate', function () {
  const c = cell9(G.evaluateFrozenGate(frozenInput()));
  eq(c.baselineClass, 'zero-baseline');
  eq(c.perMode.F1.hits, 0);
  eq(c.perMode.F1.perCpuSecond, 0);
  eq(c.selectedOwn.cpu.lowerBound95OneSided, 0);
  eq(c.selectedOwn.cpu.point, 0);
  eq(c.selectedOwn.cpu.degenerate, true);
  c.comparisons.forEach(function (cmp) {
    eq(cmp.lowerBound95OneSided, 0);
    eq(cmp.degenerate, true);
    ok(cmp.interpretation.indexOf('not evidence of equivalence or non-inferiority') >= 0);
  });
  eq(c.selection.winner, false);
  eq(c.verdict, 'inputs-collected-awaits-author-decision');
  eq(R.binomialLowerBound(0, 40, 0.05), 0);
  near(R.binomialLowerBound(40, 40, 0.05), Math.pow(0.05, 1 / 40), 1e-12, 'n of n is alpha^(1/n)');
});

add('gate', 'g06-budget-and-censored-stay-in-denominators', 'budget-ended and censored trials stay in every denominator; the survivor-only rate is secondary', function () {
  const spec = function (mode, seed) {
    if (mode !== 'F1') return {};
    if (seed < 111) return { hit: seed < 106 };
    if (seed < 121) return { outcome: 'sample-budget', cpu: 4000, wall: 3000 };
    if (seed < 124) return { outcome: 'request-timeout', cpu: 9000, wall: 8000 };
    return {};
  };
  const c = cell9(G.evaluateFrozenGate(frozenInput({ sm2Records: sm2Records('classic9', spec) })));
  const f1 = c.perMode.F1;
  eq(f1.hits, 5);
  eq(f1.budgetEnded, 10);
  eq(f1.censored, 3);
  eq(f1.trials, 40, 'every started trial is a trial');
  near(f1.cpuMs, 27 * 500 + 10 * 4000 + 3 * 9000, 1e-9, 'all spent CPU is in the denominator');
  ok(f1.conditionalExcludingBudgetEnded.perCpuSecond > f1.perCpuSecond, 'the survivor-only rate is higher and only secondary');
  ok(f1.conditionalExcludingBudgetEnded.note.indexOf('passes no gate') > 0);
  eq(c.selection.winner, true);
  eq(c.selection.selected, 'F1');
});

add('gate', 'g07-on-time-lower-bound-without-go', 'the on-time exact lower bound is published below and above 0.5 without an automatic go', function () {
  const requests = function (frontierHits) {
    const out = [];
    REQUEST_SEEDS.forEach(function (seed, i) {
      out.push(requestRecord('classic9', seed, 'native-mixed', { hit: false }));
      out.push(requestRecord('classic9', seed, 'selected-frontier', { hit: i < frontierHits }));
    });
    return out;
  };
  const above = G.evaluateFrozenGate(frozenInput({ requestRecords: requests(30) }));
  const below = G.evaluateFrozenGate(frozenInput({ requestRecords: requests(20) }));
  const arm = function (g) { return cell9(g).requestLevel.arms['selected-frontier']; };
  near(arm(above).lowerBound95OneSided, 0.6129397599, 1e-6);
  eq(arm(above).meetsHalf, true);
  near(arm(below).lowerBound95OneSided, 0.3610916600, 1e-6);
  eq(arm(below).meetsHalf, false);
  [above, below].forEach(function (g) {
    eq(g.formalVerdict, null);
    eq(cell9(g).decision, 'plan-author-decision-pending');
    eq(cell9(g).requestLevelQualification, 'not-established');
    eq(cell9(g).verdict, 'inputs-collected-awaits-author-decision', 'a bound above 0.5 is not a go and below is not a no-go');
  });
  eq(above.requestLevel, 'request-evidence-collected');
  near(R.binomialLowerBound(26, 40, 0.05), 0.508, 0.001, '26 of 40 sits near 0.5 and is not imposed here');
  const slow = requests(30).map(function (r) {
    return r.mode === 'selected-frontier' && r.requestSeed === 201 ? requestRecord('classic9', 201, r.mode, { hit: true, cold: 12000 }) : r;
  });
  eq(arm(G.evaluateFrozenGate(frozenInput({ requestRecords: slow }))).onTimeVerifiedExact, 29, 'a slow exact request (> 10 s on an 81-cell board) is not on time');
  const unverified = requests(30).map(function (r) {
    return r.mode === 'selected-frontier' && r.requestSeed === 202 ? requestRecord('classic9', 202, r.mode, { claimed: true, verified: false }) : r;
  });
  const inv = G.evaluateFrozenGate(frozenInput({ requestRecords: unverified }));
  eq(arm(inv).onTimeVerifiedExact, 29);
  eq(cell9(inv).verdict, 'invalid-evidence', 'a claimed-exact request whose verification failed is invalid evidence, not a quiet miss');
  eq(inv.state, 'frozen-invalid-evidence');
  eq(inv.formalGateEnabled, false);
});

add('gate', 'g08-non-inferiority-failure', 'a positive-baseline cell that loses hits per second fails non-inferiority; one that keeps them meets the margin', function () {
  const lose = function (mode, seed) {
    if (mode === 'proposal-only') return { hit: seed < 111 };
    if (mode === 'F1') return { hit: seed < 103 };
    return {};
  };
  const keep = function (mode, seed) {
    if (mode === 'proposal-only') return { hit: seed < 111 };
    if (mode === 'F1') return { hit: seed < 121 };
    return {};
  };
  const failing = cell9(G.evaluateFrozenGate(frozenInput({ sm2Records: sm2Records('classic9', lose) })));
  eq(failing.baselineClass, 'positive-baseline');
  eq(failing.nonInferiority.status, 'fails');
  ok(failing.nonInferiority.failing.length > 0);
  ok(failing.comparisons[0].lowerBound95OneSided < 0);
  eq(failing.projection, null, 'the projection belongs to zero-baseline cells');
  eq(failing.verdict, 'inputs-collected-awaits-author-decision');
  const holding = cell9(G.evaluateFrozenGate(frozenInput({ sm2Records: sm2Records('classic9', keep) })));
  eq(holding.nonInferiority.status, 'lower-bound-meets-margin');
  ok(/pending the author/.test(holding.nonInferiority.marginSource), 'a default margin is labelled as pending review');
  const margin = cell9(G.evaluateFrozenGate(frozenInput({ sm2Records: sm2Records('classic9', lose),
    assumptions: { nonInferiorityMargin: { value: 5, approvedBy: 'Astra' } } })));
  ok(/author-approved/.test(margin.nonInferiority.marginSource));
});

add('gate', 'g09-invalid-claimed-hit', 'a claimed exact hit that the audit did not verify makes the evidence invalid', function () {
  const gate = G.evaluateFrozenGate(frozenInput({ sm2Records: sm2Records('classic9', function (mode, seed) {
    return mode === 'F1' && seed === 130 ? { claimed: true, verified: false } : {};
  }) }));
  eq(cell9(gate).verdict, 'invalid-evidence');
  eq(cell9(gate).anomalies.falseExact.length, 1);
  eq(gate.state, 'frozen-invalid-evidence');
  eq(gate.formalGateEnabled, false);
  const unclaimed = G.evaluateFrozenGate(frozenInput({ sm2Records: sm2Records('classic9', function (mode, seed) {
    return mode === 'F1' && seed === 130 ? { claimed: false, verified: true } : {};
  }) }));
  eq(cell9(unclaimed).anomalies.verifiedButNotClaimed.length, 1, 'a verified hit that was not claimed is an anomaly for review, not a hit');
  eq(cell9(unclaimed).perMode.F1.hits, 0);
});

add('gate', 'g10-projection-awaits-author-review', 'without an approved assumption set the projection awaits the author; an approved set only publishes inputs', function () {
  const none = G.evaluateFrozenGate(frozenInput());
  eq(cell9(none).projection.status, 'projection-awaits-author-review');
  eq(none.projection, 'projection-awaits-author-review');
  const approved = G.evaluateFrozenGate(frozenInput({ assumptions: { projection: { id: 'author-set-1', approvedBy: 'Astra' } },
    poolEfficiency: { classic9: 0.85 }, workCounts: { classic9: { attemptsPerRequest: 8 } } }));
  eq(cell9(approved).projection.status, 'projection-inputs-ready');
  eq(cell9(approved).projection.inputs.poolWidth, 4);
  eq(cell9(approved).projection.inputs.measuredPoolEfficiency, 0.85);
  eq(approved.formalVerdict, null, 'even with approved assumptions the evaluator never emits a go or no-go');
  const unapproved = G.evaluateFrozenGate(frozenInput({ assumptions: { projection: { id: 'draft' } } }));
  eq(cell9(unapproved).projection.status, 'projection-awaits-author-review', 'an unsigned set is not approved');
});

add('gate', 'g11-sample-only-no-request-level', 'sample-only evidence cannot establish a request-level qualification', function () {
  const perfect = G.evaluateFrozenGate(frozenInput({ sm2Records: sm2Records('classic9', function (mode) {
    return mode === 'F1' ? { hit: true } : {};
  }) }));
  eq(cell9(perfect).requestLevel.status, 'not-established-sample-only');
  eq(cell9(perfect).requestLevelQualification, 'not-established');
  eq(perfect.requestLevel, 'not-established');
  eq(cell9(perfect).directRequestFractionBesideRates, null);
  const partial = [];
  REQUEST_SEEDS.slice(0, 20).forEach(function (seed) {
    partial.push(requestRecord('classic9', seed, 'native-mixed', {}), requestRecord('classic9', seed, 'selected-frontier', { hit: true }));
  });
  const incomplete = G.evaluateFrozenGate(frozenInput({ requestRecords: partial }));
  eq(cell9(incomplete).requestLevel.status, 'incomplete-request-coverage');
  eq(cell9(incomplete).verdict, 'inconclusive');
});

add('gate', 'g12-unresolved-cpu-and-duplicates', 'an unresolved CPU denominator is null, never infinity; a duplicate row is reported and not merged', function () {
  const tiny = cell9(G.evaluateFrozenGate(frozenInput({ sm2Records: sm2Records('classic9', function (mode) {
    return mode === 'F1' ? { hit: true, cpu: 0.1, wall: 0.1 } : {};
  }) })));
  eq(tiny.perMode.F1.perCpuSecond, null);
  eq(tiny.perMode.F1.cpuStatus, 'unresolved');
  eq(tiny.verdict, 'inconclusive');
  const dup = sm2Records('classic9', null);
  dup.push(sm2Record('classic9', 101, 'F1', { hit: true }));
  const dupGate = cell9(G.evaluateFrozenGate(frozenInput({ sm2Records: dup })));
  eq(dupGate.verdict, 'inconclusive');
  ok(dupGate.reasons.join(' ').indexOf('duplicate row') >= 0);
});

add('gate', 'g13-requests-origin-and-censoring', 'request censoring counts as not on time; sample-origin and local-origin hits are kept apart', function () {
  const rows = [];
  REQUEST_SEEDS.forEach(function (seed, i) {
    rows.push(requestRecord('classic9', seed, 'native-mixed', {}));
    rows.push(requestRecord('classic9', seed, 'selected-frontier', i < 10 ? { hit: true, origin: 'sample' } : i < 14 ? { hit: true, origin: 'local' } :
      i < 16 ? { outcome: 'request-timeout', cold: 180000 } : {}));
  });
  const arm = cell9(G.evaluateFrozenGate(frozenInput({ requestRecords: rows }))).requestLevel.arms['selected-frontier'];
  eq(arm.onTimeVerifiedExact, 14);
  eq(arm.firstExactOrigin.sample, 10);
  eq(arm.firstExactOrigin.local, 4);
  eq(arm.censoredOrFailed, 2);
  eq(arm.started, 40);
});

add('gate', 'g14-invalid-frozen-inputs-rejected', 'a failed-verification request claim, repeated seeds and a seed/cluster mismatch are invalid evidence, never frozen-inputs-collected', function () {
  const full = function (over) {
    const rows = [];
    REQUEST_SEEDS.forEach(function (seed, i) {
      rows.push(requestRecord('classic9', seed, 'native-mixed', {}));
      rows.push(requestRecord('classic9', seed, 'selected-frontier', over && over(i, seed) || { hit: i < 30 }));
    });
    return rows;
  };
  const clean = G.evaluateFrozenGate(frozenInput({ requestRecords: full() }));
  eq(clean.state, 'frozen-inputs-collected', 'the same population with no false claim is a collected input set');
  const falseClaim = G.evaluateFrozenGate(frozenInput({ requestRecords: full(function (i) {
    return i === 7 ? { claimed: true, verified: false } : { hit: i < 30 };
  }) }));
  eq(falseClaim.state, 'frozen-invalid-evidence');
  eq(falseClaim.formalGateEnabled, false);
  eq(cell9(falseClaim).verdict, 'invalid-evidence');
  eq(cell9(falseClaim).anomalies.falseExactRequests.length, 1);
  eq(falseClaim.requestLevel, 'not-established', 'invalid requests do not establish a request level');
  ok(/claimed exact full request/.test(cell9(falseClaim).reasons.join(' ')));

  const copies = Array.from({ length: 40 }, function () { return 101; });
  const oneSeed = G.evaluateFrozenGate(frozenInput({ seeds: copies, sm2Records: sm2Records('classic9', null).filter(function (r) { return r.requestSeed === 101; }) }));
  eq(oneSeed.state, 'frozen-invalid-evidence', 'forty copies of one planned grid seed are one cluster counted forty times');
  eq(oneSeed.formalGateEnabled, false);
  eq(cell9(oneSeed).coverage.clustersPlanned, 40);
  eq(cell9(oneSeed).coverage.distinctClusters, 1);
  ok(/planned grid seeds are not distinct: 40 planned, 1 distinct/.test(cell9(oneSeed).reasons.join(' ')));
  const withMany = G.evaluateFrozenGate(frozenInput({ seeds: copies }));
  eq(withMany.state, 'frozen-invalid-evidence', 'records of other clusters do not repair a repeated plan');

  const sameRequest = Array.from({ length: 40 }, function () { return 201; });
  const repeated = G.evaluateFrozenGate(frozenInput({ requestSeeds: sameRequest, requestRecords: full() }));
  eq(repeated.state, 'frozen-invalid-evidence');
  ok(/planned request seeds are not distinct/.test(cell9(repeated).reasons.join(' ')));

  const mismatch = sm2Records('classic9', null);
  mismatch[10] = Object.assign({}, mismatch[10], { gridCluster: 101 });
  const clustered = G.evaluateFrozenGate(frozenInput({ sm2Records: mismatch }));
  eq(clustered.state, 'frozen-invalid-evidence');
  ok(/belongs to cluster 101/.test(cell9(clustered).reasons.join(' ')));
  [falseClaim, oneSeed, repeated, clustered].forEach(function (g) { eq(g.formalVerdict, null, 'an invalid input set never yields a verdict'); });
});

add('reconcile', 'r16-decision-owners-named-apart', 'the plan author (Fable) and the pack author (Astra) are named apart in the gate, the report decisions and the approvals', function () {
  ok(/plan author \(Fable\)/.test(G.DECISION_OWNER) && /pack author \(Astra\)/.test(G.DECISION_OWNER));
  const gate = G.evaluateFrozenGate(frozenInput());
  ok(/plan author \(Fable\)/.test(gate.decisionOwner) && !/Astra\/Fable|Fable\/Astra|author and Fable/.test(gate.decisionOwner));
  const b = built_();
  const text = JSON.stringify(b.report.decisions) + JSON.stringify(b.frozenPlan.approvalsNeeded);
  ok(!/Astra\/Fable|Fable\/Astra|plan author and Fable|"to":"Astra"|"to":"Fable"/.test(text), 'no ambiguous owner wording');
  ok(b.report.decisions.every(function (d) { return /plan author \(Fable\)|pack author \(Astra\)/.test(d.to); }));
});

// --- reconciliation cases ----------------------------------------------------------------------------------------------------

let built = null;
function built_() {
  if (built === null) {
    const IG10 = require('./ig10-run.cjs');
    built = IG10.buildAll({});
  }
  return built;
}

const identityOk = function (over) {
  return Object.assign({ runtimeMatchesCurrent: true, runtimeFingerprints: [FP], plannedKeysOutsideTheManifest: [], sourceStable: true,
    firewallClean: true, evidenceStatuses: [C.EVIDENCE_PROVISIONAL], gateStates: ['not-evaluable-pre-freeze'] }, over || {});
};
const shardOf = function (keys, records, kind) { return { shard: 's', kind: kind || 'pipeline', keys: keys, records: records }; };
const recOf = function (key, outcome, extra) { return Object.assign({ key: key, outcome: outcome, claimedExact: false, verifiedExact: false }, extra || {}); };

add('reconcile', 'r01-duplicate-keys-rejected', 'the coverage rules reject a key planned twice and a record outside the manifest', function () {
  const seen = new Map();
  const first = RC.taskProblems({ task: 'IG-SA', manifestKeys: ['k1', 'k2'], shards: [shardOf(['k1', 'k2'], [recOf('k1', 'complete'),
    recOf('k2', 'complete')])], counts: { completed: 2 }, identity: identityOk(), seenKeys: seen });
  eq(first, []);
  const dup = RC.taskProblems({ task: 'IG-SB', manifestKeys: ['k2', 'k3'], shards: [shardOf(['k2', 'k3'], [recOf('k2', 'complete'),
    recOf('k3', 'complete')])], counts: { completed: 2 }, identity: identityOk(), seenKeys: seen });
  ok(dup.some(function (p) { return p.indexOf('duplicate planned key') === 0 && p.indexOf('k2') > 0; }), 'a duplicate key is a problem');
  const stray = RC.taskProblems({ task: 'IG-SC', manifestKeys: ['m1'], shards: [shardOf(['m1'], [recOf('m1', 'complete'), recOf('zz', 'complete')])],
    counts: { completed: 1 }, identity: identityOk(), seenKeys: new Map() });
  ok(stray.some(function (p) { return p.indexOf('outside the manifest') > 0; }), 'an unplanned record is not silently kept');
  const synthetic = RC.taskProblems({ task: 'IG-SD', manifestKeys: [], shards: [shardOf([], [recOf('case', 'complete')], 'synthetic')],
    counts: {}, identity: identityOk(), seenKeys: new Map() });
  eq(synthetic, [], 'synthetic cases plan no manifest key');
});

add('reconcile', 'r02-silent-exclusions-and-classes', 'every key is classified; a key with no record is explicitly unstarted; the overlay is counted apart', function () {
  const shard = shardOf(['a', 'b', 'c', 'd', 'e', 'f', 'g'], [recOf('a', 'complete'), recOf('b', 'sample-budget'), recOf('c', 'request-timeout'),
    recOf('d', 'error'), recOf('e', 'validation-unknown'), recOf('f', 'error')]);
  const overlaid = new Map([['f', recOf('f', 'complete')]]);
  const got = RC.classifyShard(shard, overlaid, new Set(['f']));
  eq(got.counts, { completed: 1, completedByAuditOverlay: 1, budgetEnded: 1, censored: 1, error: 1, validationUnknown: 1, unstarted: 1 });
  const total = Object.keys(got.counts).reduce(function (n, k) { return n + got.counts[k]; }, 0);
  eq(total, 7, 'every planned key is accounted for');
  const lost = RC.taskProblems({ task: 'IG-SE', manifestKeys: ['a', 'b'], shards: [shardOf(['a', 'b'], [recOf('a', 'complete')])],
    counts: { completed: 1 }, identity: identityOk(), seenKeys: new Map() });
  ok(lost.some(function (p) { return p.indexOf('keys classified for') > 0; }), 'a lost key is a problem');
  const falseFlag = RC.taskProblems({ task: 'IG-SF', manifestKeys: ['x'], shards: [shardOf(['x'], [recOf('x', 'complete',
    { claimedExact: true, verifiedExact: false })])], counts: { completed: 1 }, identity: identityOk(), seenKeys: new Map() });
  ok(falseFlag.some(function (p) { return p.indexOf('false exact flag') > 0; }));
});

add('reconcile', 'r03-incompatible-identities', 'another runtime, several runtimes, changed sources, another label or a gate state other than pre-freeze are problems', function () {
  const probe = function (over) {
    return RC.taskProblems({ task: 'IG-SG', manifestKeys: ['k'], shards: [shardOf(['k'], [recOf('k', 'complete')])], counts: { completed: 1 },
      identity: identityOk(over), seenKeys: new Map() });
  };
  eq(probe({}), []);
  ok(probe({ runtimeMatchesCurrent: false }).length === 1);
  ok(probe({ runtimeFingerprints: [FP, CAT] }).length === 1);
  ok(probe({ sourceStable: false }).length === 1);
  ok(probe({ firewallClean: false }).length === 1);
  ok(probe({ evidenceStatuses: ['frozen-confirmatory'] }).length === 1);
  ok(probe({ gateStates: ['frozen-ready'] }).length === 1);
  ok(probe({ plannedKeysOutsideTheManifest: ['q'] }).length === 1);
});

add('reconcile', 'r04-statistics-keep-pairs-and-denominators', 'paired clusters are resampled whole; rates keep censored work in the denominator', function () {
  const clusters = [1, 2, 3, 4, 5].map(function (i) { return { a: i, b: 2 * i }; });
  const iv = R.bootstrapClusters(clusters, function (drawn) {
    const a = drawn.reduce(function (n, c) { return n + c.a; }, 0);
    const b = drawn.reduce(function (n, c) { return n + c.b; }, 0);
    return b / a;
  });
  eq(iv.ci95, [2, 2], 'a pair is never split: every resample of whole clusters keeps the ratio 2');
  eq(iv.resamples, 2000);
  eq(iv.seed, 20261114);
  const done = { outcome: 'complete', verifiedExact: true, claimedExact: true, generation: { cpuTotalMs: 1000, coldWallMs: 1000, cleanupMs: 0,
    readyWallMs: 900 } };
  const cut = { outcome: 'request-timeout', verifiedExact: null, claimedExact: null, generation: { cpuTotalMs: 9000, coldWallMs: 9000,
    cleanupMs: 0, readyWallMs: 8900 } };
  const arm = R.armSummary([done, cut], 16);
  near(arm.hitsPerCpuSecond, 0.1, 1e-12, 'the censored request\'s CPU is in the denominator');
  near(arm.hitsPerColdWallSecond, 0.1, 1e-12);
  eq(arm.censored, 1);
  eq(R.ratePerSecond(1, 0, 'unresolved'), null);
  eq(R.ratio(1, 0), null, 'never infinity');
  eq(R.binomialLowerBound(0, 3, 0.05), 0);
});

add('reconcile', 'r05-accepted-evidence-reconciles', 'the accepted evidence reconciles with no problem and every cross-check agrees', function () {
  const b = built_();
  eq(b.problems, []);
  eq(b.coverage.ok, true);
  ok(b.checks.length >= 100, 'at least a hundred cross-checks of recomputed values against the accepted summaries');
  eq(b.checks.filter(function (c) { return !c.ok; }).length, 0);
  const s = b.coverage.summary;
  eq(s.plannedKeys, 480);
  eq(s.unstarted, 8);
  eq(s.censored, 1);
  eq(s.budgetEnded, 13);
  eq(s.completedByAuditOverlay, 6);
  eq(s.error, 0);
  eq(s.observedKeys + s.unstarted, s.plannedKeys);
});

add('reconcile', 'r06-coverage-specifics', 'IG-S06 is deferred, IG-S09 lists its eight unstarted rows, IG-S08 its censored lower bound, IG-S02 its overlay', function () {
  const b = built_();
  const task = function (t) { return b.coverage.tasks.find(function (x) { return x.task === t; }); };
  eq(b.coverage.deferred.length, 1);
  eq(b.coverage.deferred[0].task, 'IG-S06');
  ok(/UNMEASURED/.test(b.coverage.deferred[0].consequence));
  eq(task('IG-S09').unstarted.length, 8);
  ok(task('IG-S09').unstarted.every(function (k) { return /nightmare-70[6-9]|nightmare-708|nightmare-706/.test(k); }));
  eq(task('IG-S09').shardsNeverRun, ['nightmare-706-707', 'nightmare-708-709']);
  eq(task('IG-S08').censored.length, 1);
  near(task('IG-S08').censored[0].coldWallMsLowerBound, 240014.5519, 0.001);
  eq(task('IG-S02').auditOverlay.rows.length, 6);
  eq(task('IG-S05').earlyExactSkipped, 0);
  eq(task('IG-S05').sampleOrdinals.returned + task('IG-S05').sampleOrdinals['sample-budget'], 512);
  ok(b.coverage.excludedObservations.some(function (e) { return e.task === 'IG-S05' && e.observations === 16; }), 'the IG-S05 dev-check stays excluded and listed');
  const auxRels = b.coverage.auxiliaryCommands.map(function (a) { return a.rel; });
  ['IG-S02/killer/audit-a1/command.json', 'IG-S04/engine-retest-r2/command.json', 'IG-S09/dev-check/command.json'].forEach(function (rel) {
    ok(auxRels.indexOf(rel) >= 0, rel + ' is an auxiliary command');
  });
  ok(auxRels.every(function (rel) { return !/^IG-S10\//.test(rel); }), 'this task\'s own command is never auxiliary');
  const own = b.coverage.ownCommands;
  ok(own.length >= 1 && own.every(function (c) { return c.task === 'IG-S10' && c.shard === 'reconcile'; }), 'its own command is listed apart');
  const shardRels = new Set();
  b.coverage.tasks.forEach(function (t) { t.shards.forEach(function (s) { s.attempts.forEach(function (a) { if (a.rel) shardRels.add(a.rel); }); }); });
  ok(auxRels.every(function (rel) { return !shardRels.has(rel); }), 'no command is both a shard attempt and auxiliary');
  // failed and paused attempts are kept in the history
  ok(task('IG-S03').shards.some(function (s) { return s.attempts.some(function (a) { return a.status === 'parity-failed'; }); }));
  ok(task('IG-S02').shards.some(function (s) { return s.attempts.filter(function (a) { return a.status === 'error'; }).length === 2; }));
});

add('reconcile', 'r07-machine-accounting', 'the budget is charged once, waits are excluded, the IG-S09 dev check is counted once with an unknown wait, the manual debit stays apart', function () {
  const b = built_().budget;
  const t = b.roundTotals;
  // structural invariants that hold before and after this task's own command is ledgered
  eq(t.wrappedCommands, b.commands.length);
  eq(t.wrappedCommands, t.ledgerEntries + t.evidenceOnlyCommands);
  const ig10 = b.commands.filter(function (c) { return c.task === 'IG-S10'; });
  ok(ig10.length <= 1, 'at most the one wrapped reconciliation command');
  eq(t.chargedWrappedMs, t.chargedWrappedBeforeIgS10Ms + t.chargedIgS10Ms);
  eq(t.chargedTotalMs, t.chargedWrappedMs + t.manualAdjustmentsMs);
  eq(t.unusedOfRoundCeilingMs, t.ceilingMs - t.chargedTotalMs);
  eq(t.chargedWrappedMs, t.occupiedMs + t.chargedGraceMs, 'occupied time plus grace, never the wait');
  near(t.chargedWrappedBeforeIgS10Ms, 6556413, 0.5, 'the nine tasks before IG-S10');
  eq(b.manualAdjustments.length, 1);
  eq(b.manualAdjustments[0].task, 'IG-S07');
  eq(b.manualAdjustments[0].chargedMs, 470);
  eq(b.manualAdjustments[0].graceMs, 0, 'the manual debit carries no admission grace');
  eq(t.manualAdjustmentsMs, 470);
  eq(b.tasks['IG-S07'].manualAdjustmentMs, 470);
  eq(b.tasks['IG-S07'].chargedMs, b.tasks['IG-S07'].chargedWrappedMs + 470);
  ok(b.commands.every(function (c) { return c.shard !== 'pre-check'; }), 'the manual debit is not a wrapped command');
  if (ig10.length === 1 && ig10[0].source === 'ledger') {
    // after the command: ledger entry 71 is in the totals
    eq(ig10[0].seq, 71);
    near(ig10[0].chargedMs, 53535, 0.5);
    eq(t.wrappedCommands, 77);
    eq(t.chargedWrappedMs, 6609948);
    eq(t.chargedTotalMs, 6610418);
    eq(t.unusedOfRoundCeilingMs, 4189582);
    eq(t.priorityWaitKnownLedgerOnlyMs, 13342190);
    eq(t.priorityWaitKnownAuxiliaryReceiptsMs, 454623);
    eq(t.priorityWaitKnownMs, 13796813);
    eq(t.commandsWithUnknownWait, 3);
  } else if (ig10.length === 0) {
    // before the command: the nine tasks only
    eq(t.wrappedCommands, 76);
    eq(t.chargedTotalMs, 6556413 + 470);
    eq(t.chargedIgS10Ms, 0);
  }
  eq(t.priorityWaitKnownMs, t.priorityWaitKnownLedgerOnlyMs + t.priorityWaitKnownAuxiliaryReceiptsMs, 'waits by source add up');
  const unknown = b.commands.filter(function (c) { return c.priorityWaitMs === null; });
  eq(unknown.length, t.commandsWithUnknownWait);
  ok(unknown.every(function (c) { return c.source === 'evidence'; }), 'only commands outside the dispatcher have no wait on record');
  const s09 = b.tasks['IG-S09'];
  near(s09.chargedMs, 895678, 0.5);
  eq(s09.commands, 9, 'eight shard and control commands plus the dev check');
  eq(b.commands.filter(function (c) { return c.shard === 'dev-check' && c.task === 'IG-S09'; }).length, 1, 'the dev check appears once');
  ok(unknown.some(function (c) { return c.shard === 'dev-check' && c.task === 'IG-S09'; }), 'the dev-check wait is unknown, not 0');
  eq(s09.commandsWithUnknownWait, 1);
  near(s09.priorityWaitKnownMs, 914187, 0.5);
  near(s09.unusedOfAllocationPlusApprovalMs, 94322, 0.5);
  eq(b.tasks['IG-S06'].commands, 0);
  eq(b.tasks['IG-S06'].chargedMs, 0);
  near(b.tasks['IG-S04'].beyondBaseAllocationMs, 108329, 0.5);
  eq(b.tasks['IG-S02'].beyondBaseAllocationMs, 0);
  const waits = b.commands.reduce(function (n, c) { return n + (c.priorityWaitMs === null ? 0 : c.priorityWaitMs); }, 0);
  near(waits, t.priorityWaitKnownMs, 0.5);
  ok(b.commands.every(function (c) { return Math.abs(c.chargedMs - (c.occupiedMs + c.chargedGraceMs)) < 1; }), 'occupied time plus grace, never the wait');
  eq(RC.waitKnown({ requestedAt: '2026-11-15T02:49:34.308Z', admittedAt: '2026-11-15T02:49:34.269Z', priorityWaitMs: 0 }), null);
  eq(RC.waitKnown({ requestedAt: '2026-11-15T02:49:00.000Z', admittedAt: '2026-11-15T02:49:34.269Z', priorityWaitMs: 34269 }), 34269);
});

add('reconcile', 'r08-estimate-table-and-interpretation', 'the estimate table has thirteen rows; cohorts, scope and censoring are kept apart', function () {
  const b = built_();
  const rows = b.report.estimateTable;
  eq(rows.length, 16, 'the check-list\'s 13 rows, the isolated S2 comparison and the two unmeasured rows');
  ok(rows.every(function (r) { return r.P && r.verdict && r.scope && r.verdicts; }));
  eq(rows.slice(0, 6).map(function (r) { return r.id; }), ['mega16', 'mega12', 'samurai', 'classic9', 'killer', 'greaterThan']);
  eq(rows.find(function (r) { return r.id === 'mega16'; }).verdicts.s5a, 'supported');
  eq(rows.find(function (r) { return r.id === 'killer'; }).verdicts.s5a, 'below-planning-range-on-all-observed-pairs');
  eq(rows.find(function (r) { return r.id === 'greaterThan'; }).verdicts.s5a, 'inconclusive');
  ok(rows.slice(0, 6).every(function (r) { return r.verdicts.allPhases === 'inconclusive' && r.verdicts.firstPhases === 'inconclusive'; }),
    'a partial implementation never decides the all-phase estimates');
  const s3 = rows.find(function (r) { return r.id === 's3'; });
  ok(/PARTIAL/.test(s3.scope) && /full-S3 forecast untested\/inconclusive/.test(s3.verdict), 'partial S3 scope is stated and full S3 is not refuted');
  ok(/no gain forecast was assigned/.test(s3.P));
  eq(s3.verdicts.partialScopeGain, 'no-material-net-gain-demonstrated');
  eq(s3.verdicts.fullS3, 'untested-inconclusive');
  ok(!/refuted/.test(s3.verdict), 'no partial-S3 refutation');
  const s5b = rows.find(function (r) { return r.id === 's5b'; });
  ok(/deferred, unmeasured/.test(s5b.verdict));
  const sm1 = rows.find(function (r) { return r.id === 'sm1'; });
  ok(/CONDITIONAL/.test(sm1.scope) && /not full-S3 ceilings/.test(b.report.sm1.scope));
  const sm3 = rows.find(function (r) { return r.id === 'sm3'; });
  ok(/censored/.test(sm3.verdict) && /no safe ceiling inferred/.test(sm3.scope));
  near(b.report.sm3.thisRun.censoredLowerBoundWallS, 240.0145519, 1e-6);
  eq(b.report.sm3.thisRun.completedRequest, false);
  const gt = rows.find(function (r) { return r.id === 'gt'; });
  ok(/trace SUMMARY/.test(gt.scope) && !/trace off/.test(gt.scope), 'the Greater-Than cohort is not mixed with the trace-off headline');
  ok(/no global winner/.test(gt.verdict));
  eq(b.report.gt.cohorts.normal.pairs, 20);
  eq(b.report.gt.cohorts.nightmare.pairs, 6);
  near(b.report.gt.cohorts.normal.readyRatioOfTotalsG0OverG1, 41297.649 / 40078.55, 1e-3);
});

add('reconcile', 'r17-verdict-scope-and-statistics', 'no invented thresholds; the paired incremental median is used; the Killer label is scoped; partial S3 is not refuted', function () {
  const b = built_();
  const rows = b.report.estimateTable;
  ok(!/within 10 %|within 25 %|within 5 percentage|supported within|refuted beyond/.test(b.report.verdictRules), 'the report writer\'s thresholds are gone');
  const f2 = function (x) { return (Math.round(x * 100) / 100).toFixed(2); };
  b.report.headline.forEach(function (h) {
    const row = rows.find(function (r) { return r.id === h.cell; });
    eq(row.verdicts.today, 'descriptive-difference');
    eq(row.verdicts.partialS3, 'no-material-net-gain-demonstrated');
    eq(row.verdicts.fullS3, 'untested-inconclusive');
    ok(row.verdict.indexOf('median paired incremental ratio x' + f2(h.factors.partialS3Incremental.p50)) >= 0,
      h.cell + ': the median of the paired incremental ratios is quoted');
    near(row.todayDifference.absolute, (h.cell === 'samurai' ? h.arms['native-w1'].readyWallS.max : h.arms['native-w1'].readyWallS.p50) - h.anchors.today.value, 1e-9);
    ok(/Today: no verdict, descriptive difference/.test(row.verdict));
    ok(/no material net gain demonstrated/.test(row.verdict) && !/partial S3 refuted/.test(row.verdict));
  });
  const killer = rows.find(function (r) { return r.id === 'killer'; });
  ok(/below the planning range on all 3 observed pairs/.test(killer.verdict) && /2\.07-2\.65 versus x2\.8-3\.0/.test(killer.verdict) &&
    /no general refutation/.test(killer.verdict) && /x2\.55 \(median\) pool improvement stands/.test(killer.verdict) &&
    /original IG-S02 verdict \(estimate-refuted \(no pair reaches 2\.8\)\) is kept as historical evidence/.test(killer.verdict),
  'the Killer S5a label is below the planning range, not refuted in general, and keeps the historical verdict');
  const s5a = rows.find(function (r) { return r.id === 's5a'; });
  ok(/below the planning range on all 3 observed pairs/.test(s5a.verdict) && !/refuted on Killer/.test(s5a.verdict));
  const sm1 = rows.find(function (r) { return r.id === 'sm1'; });
  eq(Object.keys(sm1.differences), ['mega16', 'mega12', 'samurai', 'classic9']);
  ok(typeof sm1.differences.classic9.differencePoints === 'number' && /descriptive, no verdict/.test(sm1.verdict));
  ok(!/supported|inconclusive/.test(sm1.verdict), 'SM1 shows differences, not verdicts');
  ok(rows.every(function (r) { return !/(?<!not |estimate-)refuted/.test(r.verdict); }),
    'no bare "refuted" remains in any row (the historical IG-S02 verdict is quoted as such, "not refuted" is a negation)');
});

add('reconcile', 'r20-baseline-statistics-and-first-phases', 'the samurai baseline is a maximum compared with a maximum; the first-phase formula and the premises are corrected', function () {
  const b = built_();
  const rows = b.report.estimateTable;
  const sam = rows.find(function (r) { return r.id === 'samurai'; });
  const h = b.report.headline.find(function (x) { return x.cell === 'samurai'; });
  eq(h.anchors.today.statistic, 'maximum of two requests');
  ok(/larger of two requests, not a median/.test(h.anchors.today.basis));
  near(h.arms['native-w1'].readyWallS.max, 26.53, 0.005);
  near(sam.todayDifference.relative * 100, -0.8, 0.05);
  near(sam.todayDifference.measuredMedianS, 24.93, 0.005);
  ok(/measured maximum 26\.53 s against the CV3 maximum of two requests 26\.74 s \(-0\.21 s, -0\.8 %\)/.test(sam.verdict) &&
    /measured median is 24\.93 s \(shown separately/.test(sam.verdict));
  ok(/maximum of two requests/.test(sam.P) && !/median.*26\.74/.test(sam.verdict));
  ['mega16', 'mega12', 'classic9', 'killer', 'greaterThan'].forEach(function (cell) {
    ok(/median \/ p95/.test(b.report.headline.find(function (x) { return x.cell === cell; }).anchors.today.statistic), cell + ' anchor is a median');
  });
  // the first-phase formula and its verdict
  rows.slice(0, 6).forEach(function (r) {
    ok(/full S3 x S4 x S5a, S3 alone on the local continuation/.test(r.P), r.id + ': the original formula');
    ok(/S5a and partial S3 measured, full S3 unmeasured, S4 unimplemented \(Q04 moves it to phase 3 under the new generator version\): inconclusive/.test(r.verdict));
    ok(/all phases add S1\/S2\/S5b \(phase 3, new generator version\)/.test(r.verdict));
    ok(!/S1\/S2, S4, S5b, full S3 unimplemented/.test(r.verdict), 'S1/S2/S5b are not missing components of the first-phase formula');
    ok(/S4 moves to phase 3 under the new generator version, Q04/.test(r.scope));
  });
  // the withdrawn premises
  const wp = b.report.withdrawnPremises;
  ok(/withdrawn as representative costing and speed-up premises/.test(wp.status));
  eq([wp.observed.min, wp.observed.max], [74, 331]);
  ok(/does not refute a mathematical upper bound/.test(wp.boundReading) && /separately justified loose bound/.test(wp.boundReading));
  ok(/1,296/.test(wp.premises[0]) && /10x fewer solves/.test(wp.premises[1]));
  ok(/withdrawn/.test(rows.find(function (r) { return r.id === 'sm1'; }).scope));
  // the Greater-Than cohort
  const gt = rows.find(function (r) { return r.id === 'gt'; });
  ok(/partial, budget-limited cohort/.test(gt.verdict) && /partial, budget-limited cohort/.test(gt.scope) && !/censored cohort/.test(gt.verdict + gt.scope));
  ok(/a partial, budget-limited cohort/.test(b.markdown) && !/censored cohort/.test(b.markdown));
});

add('reconcile', 'r21-s1-s2-rows-and-unmeasured-gaps', 'S1 cost and yield are separate, S2 is isolated, the native mix is stated, two measurements are explicitly unmeasured', function () {
  const b = built_();
  const rows = b.report.estimateTable;
  const s1 = rows.find(function (r) { return r.id === 's1s2'; });
  const ratios = b.report.sm2.cells.map(function (c) { return Math.round(c.f1SampleCostVsNative.f1OverEqualWeightMix * 100) / 100; });
  eq(ratios, [0.38, 0.28, 0.12, 0.23], 'F1 / equal-weight mix, classic9 / mega12 / mega16 / samurai');
  ok(/near-constant-cost planning expectation was not observed for this prototype and cohort/.test(s1.ratios));
  ok(/unsuccessful, empty or above-band outcomes/.test(s1.ratios) && /16\/16 empty unique frontiers/.test(s1.ratios));
  ok(/Cost per verified exact puzzle is unestablished/.test(s1.hits) && /0 verified hits in every mode and cell, native controls included/.test(s1.hits));
  eq(s1.verdicts.costPerVerifiedExactPuzzle, 'unestablished');
  eq(s1.verdicts.yield, 'inconclusive');
  ok(/matches the observed ordinary\/proposal counts of the four SM1 requests \(48\/48, 12\/12, 24\/24, 12\/12; IG-S07\/summary-r2\.md lines 78-88\)/.test(s1.ratios) ||
    (/matches the observed ordinary\/proposal counts of the four SM1 requests/.test(s1.ratios) && /48\/48/.test(s1.ratios)), 'the native mix is stated from the observed counts');
  ok(!/NOT the native request mix/.test(JSON.stringify(b.report.sm2) + JSON.stringify(rows)), 'the "native mix unknown" wording is gone (it is only quoted in the errata table)');
  ok(/remains a sample-cost comparator, not whole-request throughput/.test(b.report.sm2.cells[0].f1SampleCostVsNative.label) &&
    /early stopping can change the realised mix/.test(b.report.sm2.cells[0].f1SampleCostVsNative.label));
  b.report.sm2.sampleMixInSm1.filter(function (m) { return m.fourSm1Request; }).forEach(function (m) { eq(m.ordinarySamples, m.proposalSamples); });
  const s2 = rows.find(function (r) { return r.id === 's2'; });
  b.report.sm2.cells.forEach(function (c) {
    const x = c.s2Isolated.f1OverF0MeanSampleCpu;
    ok(x >= 1.005 && x <= 1.125, c.cell + ': F1/F0 mean sample CPU ' + x);
    eq(c.s2Isolated.sameDecisions, true);
  });
  ok(/\(1\.01-1\.12\)/.test(s2.ratios) && /ratio of the mean sample CPU over the same samples of the same 8 grid clusters/.test(s2.ratios));
  ok(/no CPU saving on this cohort/.test(s2.verdict) && /not generalised to "S2 never helps"/.test(s2.verdict));
  ok(/KEPT SEPARATE: correctness and deduction-saving evidence/.test(s2.scope) && /correctness problems/.test(s2.scope));
  eq(s2.verdicts.cpuSaving, 'none-observed-on-this-cohort');
  // two explicit unmeasured rows
  const sm5 = rows.find(function (r) { return r.id === 'sm5'; });
  const probes = rows.find(function (r) { return r.id === 'floor-probes'; });
  eq([sm5.verdicts.sweep, probes.verdicts.probes], ['unmeasured', 'unmeasured']);
  ok(/UNMEASURED/.test(sm5.scope) && /not the missing width-two comparison/.test(sm5.scope) && /plan\.md:366/.test(sm5.P));
  ok(/UNMEASURED/.test(probes.scope) && /existing floor parity evidence/.test(probes.scope) && /is not that experiment/.test(probes.scope));
  const plan = b.frozenPlan;
  eq(plan.gaps.map(function (g) { return g.id; }), ['GAP-SM5', 'GAP-FLOOR']);
  ok(plan.approvalsNeeded.some(function (a) { return a.id === 'A7' && /SM5/.test(a.what) && /no run authorised/.test(a.what); }));
  ok(b.report.decisions.some(function (d) { return d.id === 'D9' && /SM5/.test(d.text) && /restricted-floor/.test(d.text); }));
  // source preparation
  const pre = plan.prerequisites;
  ok(/dedicated worktree at the ATTESTED frozen commit/.test(pre.steps[0].what) && /pinned harness/.test(pre.steps[1].what) &&
    /fingerprint/.test(pre.steps[2].what) && /inventory the capabilities/.test(pre.steps[3].what));
  ok(/never falls back to the old engine/.test(pre.neverFallBack));
  ok(pre.uncostedApprovalDependentWork.some(function (x) { return /adapter repairs and their reproof/.test(x); }) &&
    pre.uncostedApprovalDependentWork.some(function (x) { return /recalibration/.test(x); }));
  ok(plan.approvalsNeeded.some(function (a) { return a.id === 'A8' && /uncosted, approval-dependent/.test(a.what); }));
  ok(b.report.decisions.some(function (d) { return d.id === 'D10' && /dedicated worktree/.test(d.text); }));
  plan.extensions.cells.forEach(function (e) { ok(typeof e.proxyStatistics === 'string' && e.proxyStatistics.length > 0); });
  ok(/UNLIKE statistics/.test(plan.extensions.cells.find(function (e) { return e.cell === 'butterfly'; }).proxyStatistics));
  ok(/maximum of two requests/.test(plan.extensions.cells.find(function (e) { return e.cell === 'sohei'; }).proxyBasis));
});

add('reconcile', 'r22-errata-and-staleness', 'the errata table locates every affected passage in the files; the staleness section and the smoke placeholder are present', function () {
  const b = built_();
  const errata = b.report.errata;
  eq(errata.map(function (e) { return e.ruling; }), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  ok(errata.every(function (e) { return e.located; }), 'every entry locates its passages: ' + errata.filter(function (e) { return !e.located; }).map(function (e) { return e.id; }));
  const lines = function (id, doc) {
    const p = errata.find(function (e) { return e.id === id; }).passages.find(function (x) { return x.document === doc; });
    return p ? p.lines : [];
  };
  const has = function (arr, list) { list.forEach(function (n) { ok(arr.indexOf(n) >= 0, 'line ' + n + ' is cited in ' + arr.join(',')); }); };
  has(lines('E3', 'report.md (joint report)'), [35, 36, 108]);
  has(lines('E5', 'report.md (joint report)'), [65]);
  has(lines('E6', 'plan.md (joint plan)'), [67, 98]);
  has(lines('E7', 'plan.md (joint plan)'), [366]);
  has(lines('E1', 'report.md (joint report)'), [64]);
  has(lines('E5', 'IG-S10 report-r2.md'), [132, 137]);
  ok(errata.every(function (e) { return e.passages.every(function (p) { return p.lines.length === 0 || p.quoted; }); }));
  ok(b.markdown.indexOf('## 0. Errata to the joint report, the plan and the earlier IG-S10 reports') > 0);
  ok(/report\.md \(joint report\): 35-36, 108/.test(b.markdown) && /plan\.md \(joint plan\): 67, 74, 98, 154, 338, 350/.test(b.markdown));
  const st = b.report.staleness;
  ok(/`ef8a9cc`/.test(st.facts[0]) && /`36b2b832\.\.\.`/.test(st.facts[0]));
  ok(/8b70875/.test(st.facts[1]) && /11 runtime files/.test(st.facts[1]) && /\+808 \/ -208/.test(st.facts[1]) && /SHORT_MAX/.test(st.facts[1]) &&
    /forcingChainLong/.test(st.facts[1]) && /1400/.test(st.facts[1]) && /nishioDeep/.test(st.facts[1]) && /2600/.test(st.facts[1]));
  ok(/12 of 12 exact, p50 0\.15 s, p95 0\.51 s/.test(st.facts[2]) && /G13 samurai\/42 exact at attempt 1/.test(st.facts[2]) &&
    /G10 Killer\/42 shallow to exact/.test(st.facts[2]) && /Hell 1 non-vacuous/.test(st.facts[2]));
  ok(/about 14 finders/.test(st.facts[3]) && /MS08 to MS16/.test(st.facts[3]));
  ok(/not paired improvements/.test(st.reading));
  eq(st.compatibilitySmoke, 'Compatibility smoke: see `evidence/phase0/smoke-rating-v3-8b70875/`');
  ok(b.markdown.indexOf('## 15. Staleness of the measurements') > 0 && b.markdown.indexOf(st.compatibilitySmoke) > 0);
});

add('reconcile', 'r09-greater-than-accounting', 'the counter erratum, the executed/reused probe split, CPU against ready wall and the unstarted rows are reported', function () {
  const gt = built_().report.gt;
  ok(/countSolutions CALLS/.test(gt.counterErratum.applied));
  eq(gt.counterErratum.check.countsDfsEntriesEqualsCountSolutionsCalls, 52);
  eq(gt.counterErratum.units.nodeEntries, 'not instrumented (null)');
  eq(gt.probes.executedGroupChecks, 15);
  eq(gt.probes.reusedRows, 15);
  eq(gt.probes.listedRows, 30);
  ok(/never 30 independent/.test(gt.probes.note));
  ok(/startup and cleanup/.test(gt.cpuBasis) && /ready wall excludes startup/.test(gt.cpuBasis));
  eq(gt.unstarted.length, 8);
  ok(gt.cohorts.normal.cpuRatioOfTotalsG0OverG1 !== gt.cohorts.normal.readyRatioOfTotalsG0OverG1, 'CPU and ready wall are two quantities');
  near(gt.cohorts.nightmare.readyRatioOfTotalsG0OverG1, 0.1698, 1e-3);
  eq(gt.namedTrap.normal.numerator, 83);
  eq(gt.namedTrap.normal.denominator, 376);
});

add('reconcile', 'r10-provenance-keeps-identities-apart', 'measurement, report-writer and corrected-harness fingerprints are separate and the corrections are not engine-rerun', function () {
  const p = built_().report.provenance;
  const t = function (id) { return p.perTask.find(function (x) { return x.task === id; }); };
  eq(p.runtime.fingerprint, '36b2b8327f348fc6fc39471f34608c6679b9f3fc34e48178563cc4424173b50a');
  eq(p.catalogue.fingerprint, 'd035b740ff3ad78310773050a53f0633ca6ac4e4b38e68df173c19befef9fb3e');
  eq(p.harness.beforeIgS10.short, 'bbd5db2da6cd');
  ok(p.harness.atIgS10Run !== p.harness.beforeIgS10.fingerprint, 'this task changes the harness');
  ok(t('IG-S09').measurement.fingerprints[0].indexOf('9da69f60') === 0);
  ok(t('IG-S09').correctedHarness.some(function (x) { return x.prefix === 'bbd5db2da6cd' && x.engineRerun === false; }));
  ok(t('IG-S07').measurement.fingerprints.some(function (x) { return x.indexOf('0feb1ea57bd4') === 0; }));
  ok(t('IG-S07').reportWriters.some(function (x) { return x.prefix === '5027a528f03a'; }));
  ok(t('IG-S08').reportWriters.some(function (x) { return x.prefix === '82b623923934'; }));
  t('IG-S04').correctedHarness.forEach(function (x) { eq(x.engineRerun, false); });
  ok(t('IG-S02').measurement.fingerprints[0].indexOf('dd759a22') === 0);
});

add('reconcile', 'r11-gate-json-and-frozen-plan', 'gate.json stays not-evaluable-pre-freeze; the frozen plan lists commands, populations, extensions and approvals', function () {
  const b = built_();
  eq(b.gate.state, 'not-evaluable-pre-freeze');
  eq(b.gate.formalGateEnabled, false);
  eq(b.gate.formalVerdict, null);
  eq(b.gate.usedAsFormalGate, false);
  eq(b.gate.projection, 'projection-awaits-author-review');
  ok(/not-established|IG-S06 deferred/.test(JSON.stringify(b.gate.coverageOfTheInputs)));
  const plan = b.frozenPlan;
  eq(plan.steps.length, 10);
  ok(/UNAPPROVED|PROPOSAL/.test(plan.status));
  eq(plan.steps.find(function (s) { return s.task === 'IG-S06'; }).implemented, false);
  eq(plan.steps.find(function (s) { return s.task === 'IG-S05'; }).frozenManifest.jobs, 1280);
  ok(plan.steps.every(function (s) { return /-Round frozen-gate -FreezeReceipt .*freeze\.json' -BudgetReceipt .*frozen-budget\.json'/.test(s.command); }));
  eq(plan.ig06.populations.confirmatory.requests, 320, 'two modes x 40 requests on four cells, not four modes');
  eq(plan.extensions.cells.map(function (e) { return e.cell; }), ['wordoku', 'sohei', 'flower', 'butterfly']);
  plan.extensions.cells.forEach(function (e) {
    ok(/UNAPPROVED/.test(e.status));
    eq(e.populations.pilot.gridSeeds, [11, 12]);
    eq(e.populations.sm2.gridSeeds, '101-140');
    eq(e.populations.requests.seeds, '201-240');
    ok(e.projection.chargedMs > 0 && e.projection.scenarioBand.highChargedMs > e.projection.scenarioBand.lowChargedMs);
  });
  const s09 = plan.steps.find(function (s) { return s.task === 'IG-S09'; }).projection;
  ok(s09.unstartedRowsCostBoundsMs.low > 0 && s09.unstartedRowsCostBoundsMs.high >= s09.unstartedRowsCostBoundsMs.mean, 'the unstarted rows are priced, not at zero');
  const s08 = plan.steps.find(function (s) { return s.task === 'IG-S08'; }).projection;
  ok(s08.censoredBound.lowerBoundMs === 240015 && s08.censoredBound.guardLimitedPlanningMs >= 240015 && !('upperBoundMs' in s08.censoredBound),
    'the censored tail has a lower bound and a guard-limited planning figure, not an inferred ceiling');
  ok(plan.approvalsNeeded.length >= 5);
  ok(plan.steps.filter(function (s) { return s.implemented; }).every(function (s) { return s.adapters.dryRunOnCurrentRuntime.every(function (a) {
    return /ok on the current runtime/.test(a.dryRun); }); }), 'every adapter dry run passes on today\'s runtime');
});

add('reconcile', 'r18-projection-packing', 'extension phases are separate commands counted per scenario; admission and guard figures are planning scenarios, not guaranteed bounds', function () {
  const FPLAN = require('./frozen-plan.cjs');
  const GR = 45000;
  const WINDOW = M.commandWindowMs(C.GUARDS.commandMs);
  // the packing rule on a synthetic phase set: every phase is at least one command and phases never share an invocation
  const one = FPLAN.phasePlan({ pilot: 1000, sm2: 1000, requests: 1000 }, 1);
  eq(one.commands, 3, 'three tiny phases are three commands, not one');
  eq(one.chargedMs, 3000 + 3 * GR);
  const split = FPLAN.phasePlan({ pilot: 1000, sm2: WINDOW + 1000, requests: 2 * WINDOW + 1000 }, 1);
  eq([split.phases.pilot.commands, split.phases.sm2.commands, split.phases.requests.commands], [1, 2, 3]);
  eq(FPLAN.phasePlan({ pilot: 1000, sm2: WINDOW + 1000, requests: 2 * WINDOW + 1000 }, 0.5).commands, 1 + 1 + 2, 'recomputed for the low scenario');
  eq(FPLAN.phasePlan({ pilot: 1000, sm2: WINDOW + 1000, requests: 2 * WINDOW + 1000 }, 2).commands, 1 + 3 + 5, 'recomputed for the high scenario');
  const plan = built_().frozenPlan;
  const ext = function (cell) { return plan.extensions.cells.find(function (e) { return e.cell === cell; }).projection; };
  const minima = { wordoku: 3, sohei: 8, flower: 6, butterfly: 6 };
  Object.keys(minima).forEach(function (cell) {
    const p = ext(cell);
    ok(p.commands >= minima[cell], cell + ': at least ' + minima[cell] + ' phase-separated commands, not ' + p.commands);
    eq(p.commands, p.commandsByPhase.pilot + p.commandsByPhase.sm2 + p.commandsByPhase.requests);
    ['pilot', 'sm2', 'requests'].forEach(function (phase) { ok(p.commandsByPhase[phase] >= 1, cell + ' ' + phase + ' is a command of its own'); });
    ['low', 'central', 'high'].forEach(function (sc) {
      const s = p.scenarios[sc];
      eq(s.commands, s.phases.pilot.commands + s.phases.sm2.commands + s.phases.requests.commands);
      eq(s.chargedMs, s.occupiedMs + GR * s.commands, cell + ' ' + sc + ': occupied plus grace per command');
      ok(s.commands >= 3);
    });
    ok(p.scenarios.high.commands >= p.scenarios.central.commands && p.scenarios.central.commands >= p.scenarios.low.commands);
    eq(p.chargedMs, p.scenarios.central.chargedMs);
    ok(/incomplete upper bound/.test(p.label));
  });
  ok(plan.extensions.minimumCommandsCentral.total >= 3 + 8 + 6 + 6, 'the central minimum is at least 23 phase-separated commands');
  // IG-S06: phases and a guard scenario with the validation guard, one command per request, labelled incomplete
  const pr = plan.ig06.projection;
  ok(/INCOMPLETE upper bound/.test(pr.label));
  eq(pr.scenarios.guardScenario.observations, 364);
  eq(pr.scenarios.guardScenario.commands, 364, 'one command per request');
  eq(pr.scenarios.guardScenario.perRequestMs, C.GUARDS.requestMs + C.GUARDS.validationMs, 'the 60 s validation guard is added to the 180 s request guard');
  eq(pr.scenarios.guardScenario.chargedMs, 364 * (C.GUARDS.requestMs + C.GUARDS.validationMs + GR));
  ok(pr.omittedFromTheGuardScenario.length >= 4 && !('ceiling' in pr.chargedMs), 'what the scenario omits is listed; it is not called a ceiling');
  ['low', 'central'].forEach(function (sc) {
    const s = pr.scenarios[sc];
    eq(s.commands.total, s.commands.confirmatory + s.commands.diagnostic);
    ok(s.commands.confirmatory >= 1 && s.commands.diagnostic >= 1, 'the confirmatory and diagnostic phases are separate commands');
    eq(s.chargedMs, s.occupiedMs + GR * s.commands.total);
  });
  // admission plans: a planning figure, never a guaranteed upper bound
  plan.steps.filter(function (s) { return s.implemented; }).forEach(function (s) {
    ok(s.projection.admissionPlanChargedMs >= s.projection.lowChargedMs, s.task + ' admission plan');
    ok(!('highChargedMs' in s.projection) && !('commandsHigh' in s.projection), 'no "high" bound claim');
    ok(/not a guaranteed upper bound/.test(s.planOnlyProjection.basis));
  });
  ok(/none is a guaranteed upper bound/.test(plan.status));
  ok(plan.approvalsNeeded.every(function (a) { return !/^plan author$|^plan author, Fable$/.test(a.who); }), 'owners are named apart');
  const fz = built_().report.frozen;
  eq(fz.ig06.guardScenario, pr.chargedMs.guardScenario);
  eq(fz.extensions.minimumCommandsCentral.byCell.wordoku >= 3, true);
});

add('reconcile', 'r12-formats', 'the markdown and JSON documents are CRLF, UTF-8 without BOM, no trailing whitespace, one final newline', function () {
  const b = built_();
  eq(C.normaliseText(b.markdown), b.markdown, 'report.md is already normalised');
  [b.coverage, b.budget, b.gate, b.frozenPlan, b.report].forEach(function (doc) {
    const text = C.jsonText(doc);
    ok(text.indexOf('\r\n') > 0 && !/(^|[^\r])\n/.test(text) && !/[ \t]\r\n/.test(text) && text.endsWith('\r\n') && !text.endsWith('\r\n\r\n'));
    ok(text.charCodeAt(0) !== 0xFEFF);
    ok(!/NaN|Infinity/.test(text.replace(/"[^"]*"/g, '""')), 'no NaN or infinity');
  });
  ok(b.markdown.indexOf('PROVISIONAL (pre-freeze)') > 0);
  ok(b.report.provisionalNotice.indexOf('PROVISIONAL (pre-freeze)') === 0);
  eq(b.report.evidenceStatus, 'provisional (pre-freeze)');
});

add('reconcile', 'r13-plan-and-no-engine', 'the shard plan fits the 4-minute allocation and the IG-S10 modules load no engine, worker or git', function () {
  const manifest = M.buildManifest('IG-S10', 'provisional-r1');
  eq(manifest.jobs.length, 1);
  eq(manifest.shards[0].kind, 'analysis');
  const physical = M.packCommands(M.blocksFor(manifest, manifest.shards[0].jobKeys), M.commandWindowMs(195000));
  eq(physical.commands.length, 1);
  eq(physical.oversize, [], 'the job fits the request window of the 195 s deadline that the 4-minute allocation leaves');
  eq(M.projectedMachineMs(physical), 225000, 'three minutes of work plus the 45 s grace stay inside the 4-minute allocation');
  ok(M.projectedMachineMs(physical) <= M.ALLOCATIONS_MS['IG-S10']);
  eq(M.ALLOCATIONS_MS['IG-S10'], 240000);
  const files = ['gate.cjs', 'reconcile.cjs', 'reconcile-report.cjs', 'reconcile-build.cjs', 'reconcile-render.cjs', 'reconcile-errata.cjs', 'frozen-plan.cjs', 'ig10-run.cjs',
    'ig10-test.cjs', 'plans/ig-s10.cjs'];
  files.forEach(function (f) {
    const text = fs.readFileSync(path.join(C.HARNESS_DIR, f), 'utf8');
    ok(!/require\('\.\/(host|worker|attempt-worker|ig0\dworker|scoped-audit-worker)\.cjs'\)/.test(text.replace(/\/\/.*$/gm, '')), f + ' requires an engine host or worker');
    ok(!/require\('(child_process|worker_threads)'\)|new Worker\(|spawn\(|execSync\(/.test(text.replace(/\/\/.*$/gm, '')), f + ' starts a process or a thread');
  });
  const plan = RUN.planOnly({ task: 'IG-S10', round: 'provisional-r1', freezeReceipt: null, budgetReceipt: null, runtimeLabel: null }, C.DEFAULT_REPO_ROOT);
  eq(plan.shards.length, 1);
  eq(plan.shards[0].kind, 'analysis');
  eq(plan.gate.state, 'not-evaluable-pre-freeze');
  eq(plan.adapters, []);
});

add('reconcile', 'r14-exact-input-populations', 'every manifest equals its preregistered population; a missing, extra or duplicated row is detected', function () {
  RC.TASKS.forEach(function (task) {
    const manifest = M.buildManifest(task, 'provisional-r1');
    const check = RC.populationCheck(task, manifest);
    eq(check.equal, true, task + ' population: ' + C.canonicalJson(check));
  });
  const manifest = M.buildManifest('IG-S02', 'provisional-r1');
  eq(RC.expectedPopulation('IG-S02').length, 36);
  eq(RC.expectedPopulation('IG-S05').length, 256);
  eq(RC.expectedPopulation('IG-S09').length, 62);
  const missing = Object.assign({}, manifest, { jobs: manifest.jobs.slice(1) });
  eq(RC.populationCheck('IG-S02', missing).missing.length, 1);
  const extra = Object.assign({}, manifest, { jobs: manifest.jobs.concat([Object.assign({}, manifest.jobs[0], { requestSeed: 99 })]) });
  eq(RC.populationCheck('IG-S02', extra).extra.length, 1);
  const dup = Object.assign({}, manifest, { jobs: manifest.jobs.concat([manifest.jobs[0]]) });
  eq(RC.populationCheck('IG-S02', dup).duplicates, 1);
  eq(RC.populationCheck('IG-S02', dup).equal, false);
  eq(built_().coverage.summary.populationsEqualToThePreregistered, true);
  eq(built_().coverage.summary.earlyExactSkipped, 0);
  eq(built_().coverage.summary.blocked, 0);
});

add('reconcile', 'r15-frozen-closure-inputs', 'the frozen closure compares the receipt\'s limits with the run\'s catalogue defaults, guards and budget hash', function () {
  const IG10 = require('./ig10-run.cjs');
  const commands = [{ catalogueSnapshot: { defaults: LIMITS.defaults }, guards: LIMITS.guards }];
  const observed = IG10.observedLimitsOf(commands, LIMITS.budgetHash);
  eq(G.compareLimits(LIMITS, observed).ok, true);
  const other = IG10.observedLimitsOf(commands, 'd'.repeat(64));
  eq(G.compareLimits(LIMITS, other).state, 'frozen-limits-mismatch');
  eq(G.compareLimits(LIMITS, IG10.observedLimitsOf([], undefined)).ok, false);
  eq(typeof IG10.runFrozenClosure, 'function');
  eq(IG10.OUTPUTS.length, 6);
});

add('reconcile', 'r19-r3-revision-bundle', 'the r3 bundle names itself consistently, carries the superseded r1 and r2 hashes and distinguishes the writer from the r1 command and the r2 writer', function () {
  const IG10 = require('./ig10-run.cjs');
  const roundDir = path.join(RUN.evidenceRootOf(C.DEFAULT_REPO_ROOT), RC.ROUND);
  const r1 = IG10.r1Snapshot(roundDir);
  eq(r1.slice(0, 6).map(function (f) { return f.file; }), ['report.json', 'report.md', 'coverage.json', 'budget-summary.json', 'gate.json',
    'frozen-rerun-plan.json']);
  eq(r1.length, 7);
  ok(/IG-S10\/reconcile\/command\.json$/.test(r1[6].file), 'the r1 wrapped command is superseded by hash too');
  const r2 = IG10.r2Snapshot(roundDir);
  eq(r2.files.map(function (f) { return f.file; }), ['coverage-r2.json', 'budget-summary-r2.json', 'gate-r2.json', 'frozen-rerun-plan-r2.json',
    'report-r2.json', 'report-r2.md']);
  ok(/^[0-9a-f]{64}$/.test(r2.writerHarnessFingerprint), 'the r2 writer fingerprint is read from report-r2.json');
  const snap = r1.concat(r2.files);
  ok(snap.every(function (f) { return /^[0-9a-f]{64}$/.test(f.sha256) && (f.revision === 'r1' || f.revision === 'r2'); }));
  eq(IG10.revisionOutputs('-r3'), ['coverage-r3.json', 'budget-summary-r3.json', 'gate-r3.json', 'frozen-rerun-plan-r3.json', 'report-r3.json', 'report-r3.md']);
  const writer = 'w'.repeat(64);
  const revision = { id: 'r3', reason: 'test', supersedes: snap, r1CommandHarnessFingerprint: r1[6].harnessFingerprint,
    r2WriterHarnessFingerprint: r2.writerHarnessFingerprint, writerHarnessFingerprint: writer, writerRole: 'test' };
  const r = IG10.buildAll({ suffix: '-r3', revision: revision, harnessFingerprint: writer });
  eq(r.report.outputs.map(function (o) { return o.file; }), ['coverage-r3.json', 'budget-summary-r3.json', 'gate-r3.json', 'frozen-rerun-plan-r3.json',
    'report-r3.md']);
  eq(r.report.gate.reference, 'gate-r3.json');
  eq(r.report.machine.reference, 'budget-summary-r3.json');
  eq(r.report.frozen.reference, 'frozen-rerun-plan-r3.json');
  [r.coverage, r.budget, r.gate, r.frozenPlan, r.report].forEach(function (d) { eq(d.revision.id, 'r3'); });
  const hashOf = function (doc) { return C.sha256(C.jsonText(doc)); };
  eq(r.report.outputs.map(function (o) { return o.sha256; }), [hashOf(r.coverage), hashOf(r.budget), hashOf(r.gate), hashOf(r.frozenPlan),
    C.sha256(r.markdown)], 'the report carries the hash of every r3 document');
  const ids = [r.report.revision.writerHarnessFingerprint, r.report.revision.r2WriterHarnessFingerprint, r.report.revision.r1CommandHarnessFingerprint];
  eq(new Set(ids).size, 3, 'the r3 writer, the r2 writer and the r1 command are three distinct identities');
  ok(r.markdown.indexOf('revision r3') > 0 && r.markdown.indexOf(writer) > 0 && r.markdown.indexOf('gate-r3.json') > 0);
  eq(r.gate.state, 'not-evaluable-pre-freeze');
  eq(r.gate.formalGateEnabled, false);
  ok(/unwrapped, read-only aggregations/.test(r.report.deviations.join(' ')), 'the unwrapped aggregations are disclosed');
  ok(/no measured record, coverage figure, accounting figure or gate state changed/.test(r.report.deviations.join(' ')));
  // the unchanged documents are unchanged in substance: the comparison used for the revision header
  const before = C.readJson(path.join(roundDir, 'gate-r2.json'));
  eq(IG10.comparable('gate', before), IG10.comparable('gate', r.gate), 'the gate document equals its r2 counterpart apart from the revision header and test counts');
  const cov = C.readJson(path.join(roundDir, 'coverage-r2.json'));
  eq(IG10.comparable('coverage', cov), IG10.comparable('coverage', r.coverage));
  const bud = C.readJson(path.join(roundDir, 'budget-summary-r2.json'));
  eq(IG10.comparable('budget-summary', bud), IG10.comparable('budget-summary', r.budget), 'the accounting is unchanged');
  ok(IG10.comparable('frozen-rerun-plan', C.readJson(path.join(roundDir, 'frozen-rerun-plan-r2.json'))) !== IG10.comparable('frozen-rerun-plan', r.frozenPlan),
    'the frozen plan changed (prerequisites, gaps, approvals, proxy statistics)');
});

// --- running -------------------------------------------------------------------------------------------------------------------

function runPure(filter) {
  const results = [];
  cases.forEach(function (c) {
    if (filter && c.group !== filter) return;
    const started = C.nowMs();
    let pass = true;
    let error = null;
    try {
      c.fn();
    } catch (err) {
      pass = false;
      error = String(err && err.message ? err.message : err);
    }
    results.push({ id: c.id, group: c.group, title: c.title, ok: pass, ms: Math.round((C.nowMs() - started) * 10) / 10, error: error });
  });
  return results;
}

module.exports = { cases: cases, runPure: runPure };

if (require.main === module) {
  const results = runPure(process.argv[2]);
  results.forEach(function (r) { process.stdout.write((r.ok ? 'ok   ' : 'FAIL ') + r.id + ' (' + Math.round(r.ms) + ' ms)' + (r.ok ? '' : ' ' + r.error) + '\n'); });
  const failed = results.filter(function (r) { return !r.ok; }).length;
  process.stdout.write(results.length - failed + ' passed, ' + failed + ' failed\n');
  process.exit(failed === 0 ? 0 : 1);
}
