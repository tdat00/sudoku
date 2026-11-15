'use strict';

/*
 * IG-S10 reconciliation (part 3): the estimate table (the check-list's thirteen rows, copied into report.json/md and filled
 * from the evidence), the machine accounting block and the assembly of report.json. Provisional (pre-freeze).
 *
 * Verdict rules (r2): no invented threshold. A "Today" anchor and an SM1 share are shown with their DESCRIPTIVE difference and
 * no verdict. The S5a factor keeps the IG-S02 rule against the report's planning range (median reaches the low end:
 * supported; no pair reaches it: the planning-factor estimate is refuted on these pairs, which says nothing about the
 * usefulness of the measured improvement; otherwise inconclusive). Partial S3 had no assigned gain forecast: its result is
 * "no material net gain demonstrated" (median of the paired incremental ratios) and the full-S3 forecast is untested. A
 * first-phase or all-phase estimate whose components are not all implemented is inconclusive.
 */
const path = require('path');
const C = require('./common.cjs');
const R = require('./records.cjs');
const RUN = require('./run.cjs');
const RC = require('./reconcile.cjs');
const RP = require('./reconcile-report.cjs');

const get = RC.get;
const f2 = function (x) { return RP.num(x) === null ? 'n/a' : (Math.round(x * 100) / 100).toFixed(2); };
const f3 = function (x) { return RP.num(x) === null ? 'n/a' : (Math.round(x * 1000) / 1000).toFixed(3); };
const f4 = function (x) { return RP.num(x) === null ? 'n/a' : (Math.round(x * 10000) / 10000).toFixed(4); };
const pct = function (x) { return RP.num(x) === null ? 'n/a' : (Math.round(x * 1000) / 10).toFixed(1) + ' %'; };
const range = function (d) { return d && d.n > 0 ? f2(d.min) + '-' + f2(d.max) : 'n/a'; };
const signed = function (x, digits) { return RP.num(x) === null ? 'n/a' : (x >= 0 ? '+' : '') + x.toFixed(digits); };
const f1 = function (x) { return Number(x).toFixed(1); };

/** The S5a reading in words: the planning factor only, never the usefulness of the improvement. */
function s5aText(h) {
  const f = h.factors.s5aReady;
  const lo = h.anchors.s5a[0];
  const hi = h.anchors.s5a[1];
  const verdict = RP.s5aVerdict(h.factors, lo);
  const planned = 'x' + f1(lo) + '-' + f1(hi);
  if (verdict === 'supported') return 'supported (median x' + f2(f.p50) + ' reaches the low end of the planning range ' + planned + ')';
  if (verdict === 'inconclusive') return 'inconclusive (median x' + f2(f.p50) + ' is below the low end of ' + planned +
    ' but at least one pair reaches it, up to x' + f2(f.max) + ')';
  return 'below the planning range on all ' + f.n + ' observed pairs (x' + f2(f.min) + '-' + f2(f.max) + ' versus ' + planned +
    '); no general refutation: the x' + f2(f.p50) + ' (median) pool improvement stands, and the original IG-S02 verdict (' +
    h.acceptedS5aVerdict + ') is kept as historical evidence in IG-S02/summary-r2';
}

// --- the six headline rows ----------------------------------------------------------------------------------------------------

function headlineRow(h) {
  const a = h.anchors;
  const n = h.arms['native-w1'];
  const p = h.arms['attempts-w4'];
  const sp = h.arms['scoped-attempts-w4'];
  const ss = h.arms['scoped-native-w1'];
  const f = h.factors;
  // a descriptive comparison of like statistics: a maximum of two requests is compared with the new maximum, never with a median
  const todayIsMax = /^maximum/.test(a.today.statistic);
  const measuredToday = todayIsMax ? n.readyWallS.max : n.readyWallS.p50;
  const diff = RP.descriptiveDifference(measuredToday, a.today.value);
  diff.statistic = todayIsMax ? 'maximum of the 3 native-w1 ready walls against the ' + a.today.statistic + ' (' + a.today.basis + ')' :
    'median of the 3 native-w1 ready walls against the ' + a.today.statistic.split(' / ')[0] + ' (' + a.today.basis + ')';
  diff.measuredMedianS = n.readyWallS.p50;
  diff.measuredMaxS = n.readyWallS.max;
  const verdicts = {
    today: 'descriptive-difference',
    s5a: RP.s5aVerdict(f, a.s5a[0]),
    partialS3: 'no-material-net-gain-demonstrated',
    fullS3: 'untested-inconclusive',
    firstPhases: 'inconclusive',
    allPhases: 'inconclusive'
  };
  const hitText = function (arm, name) {
    return name + ' ' + arm.verifiedExact + '/' + arm.requests + ' exact, ' + f4(arm.hitsPerCpuSecond) + '/CPU s, ' +
      f4(arm.hitsPerColdWallSecond) + '/wall s';
  };
  return {
    id: h.cell, rowKind: 'headline', report: a.label,
    anchorChecklist: a.checklist, todayDifference: diff,
    P: 'Today ' + a.today.value + (a.today.p95 === null ? '' : ' / ' + a.today.p95) + ' s (' + a.today.statistic + ': ' + a.today.basis +
      '; report, Measured); first phases ' + a.first.median + ' / ' + a.first.p95 + ' s (P: full S3 x S4 x S5a, S3 alone on the ' +
      'local continuation; equal results); all phases ' + a.all.median + ' / ' + a.all.p95 + ' s, envelope ' +
      a.all.envelope[0] + '-' + a.all.envelope[1] + ' s (P); S5a x' + f1(a.s5a[0]) + '-' + f1(a.s5a[1]) + '; no forecast was assigned to the partial S3',
    before: 'native-w1, n = ' + n.requests + ', trace off: ready p50 ' + f2(n.readyWallS.p50) + ' / max ' + f2(n.readyWallS.max) +
      ' s; cold p50 ' + f2(n.coldWallS.p50) + ' s; CPU p50 ' + f2(n.cpuTotalS.p50) + ' s',
    after: 'S5a w4: ready p50 ' + f2(p.readyWallS.p50) + ' / max ' + f2(p.readyWallS.max) + ' s (cold p50 ' + f2(p.coldWallS.p50) +
      '); S5a + partial S3: ready p50 ' + f2(sp.readyWallS.p50) + ' / max ' + f2(sp.readyWallS.max) + ' s; serial partial S3 (n = ' +
      ss.requests + '): ' + (ss.requests > 0 ? f2(ss.readyWallS.p50) + ' s' : 'n/a'),
    ratios: 'S5a ready x' + f2(f.s5aReady.p50) + ' (' + range(f.s5aReady) + '), cold x' + f2(f.s5aCold.p50) + ', CPU pool/native x' +
      f2(f.s5aCpu.p50) + ' (' + range(f.s5aCpu) + '); partial S3 over the pool: median paired incremental ready ratio x' +
      f2(f.partialS3Incremental.p50) + ' (' + range(f.partialS3Incremental) + '), CPU x' + f2(f.combinedCpu.p50) +
      ' (S5a+S3 / native; median combined ready x' + f2(f.combinedReady.p50) + ')',
    hits: hitText(n, 'native') + '; ' + hitText(p, 'S5a') + '; ' + hitText(sp, 'S5a+S3'),
    scope: 'measured: S5a (min(4, A) workers) and partial S3 (singles and subsets) on 3 paired seeds; first-phase components not ' +
      'implemented: full S3 and S4 (S4 moves to phase 3 under the new generator version, Q04); phase-3 components not composed: ' +
      'S1/S2/S5b (IG-S06 deferred); S7 not implemented; ' + n.censored + '+' + p.censored + '+' + sp.censored + ' censored, ' +
      (n.errors + p.errors + sp.errors) + ' errors' + (h.cell === 'killer' ? '; Killer rows by hash-linked audit overlay' : '') +
      '; n = 3 descriptive',
    verdicts: verdicts,
    verdict: 'Today: no verdict, descriptive difference: measured ' + (todayIsMax ? 'maximum ' + f2(n.readyWallS.max) + ' s against the ' +
      'CV3 maximum of two requests ' : 'median ' + f2(n.readyWallS.p50) + ' s against the ' + a.today.statistic.split(' / ')[0] + ' ') + a.today.value +
      ' s (' + signed(diff.absolute, 2) + ' s, ' + signed(diff.relative * 100, 1) + ' %)' + (todayIsMax ? '; the measured median is ' +
      f2(n.readyWallS.p50) + ' s (shown separately, not compared with a maximum)' : '') + '; S5a: ' + s5aText(h) + '; partial S3: no ' +
      'material net gain demonstrated (median paired incremental ratio x' + f2(f.partialS3Incremental.p50) + ', range ' +
      range(f.partialS3Incremental) + '), full-S3 forecast untested/inconclusive; first phases (original formula: full S3 x S4 x S5a, ' +
      'S3 alone on the local continuation): S5a and partial S3 measured, full S3 unmeasured, S4 unimplemented (Q04 moves it to phase 3 ' +
      'under the new generator version): inconclusive; all phases add S1/S2/S5b (phase 3, new generator version): grid-trial ' +
      'prototype only, composition deferred (IG-S06): inconclusive; implemented scope reaches ' + f2(sp.readyWallS.p50) + ' s ready'
  };
}

// --- the other rows ---------------------------------------------------------------------------------------------------------------

function s5aRow(cells) {
  const bits = cells.map(function (h) {
    return h.cell + ' x' + f2(h.factors.s5aReady.p50) + ' (' + range(h.factors.s5aReady) + ')';
  });
  const cpu = cells.map(function (h) { return h.cell + ' ' + f2(h.factors.s5aCpu.p50); });
  const verdicts = {};
  cells.forEach(function (h) { verdicts[h.cell] = RP.s5aVerdict(h.factors, h.anchors.s5a[0]); });
  const lanes = cells.filter(function (h) { return h.attempts === 2; }).map(function (h) {
    return h.cell + ' peak active ' + get(h.pool, 'peakActive') + ' of ' + get(h.pool, 'width'); });
  const spec = cells.map(function (h) { return h.cell + ' ' + get(h.pool, 'speculativeCompleted'); });
  const equalHits = cells.every(function (h) { return h.arms['native-w1'].verifiedExact === h.arms['attempts-w4'].verifiedExact; });
  const killer = cells.find(function (h) { return h.cell === 'killer'; });
  const gt = cells.find(function (h) { return h.cell === 'greaterThan'; });
  return {
    id: 's5a', rowKind: 'multiplier', report: 'S5a width 4',
    P: 'at most 2 active attempts on two-attempt boards; x2.8-3.0 on 8/4-attempt boards, x1.7-1.8 on two-attempt boards',
    before: 'native-w1, n = 3 per cell (rows above)',
    after: 'attempts-w4: ' + bits.join('; '),
    ratios: 'CPU pool/native p50: ' + cpu.join(', ') + '; the pool reads CPU once at the host (speculation, startup and cleanup included)',
    hits: 'verified exact identical in both arms in every cell: ' + equalHits + ' (classic9 1/3, Greater-Than 3/3, others 0/3)',
    scope: 'pooled == native on 18/18 pairs (identity of every digest section); two-attempt ceiling respected (' + lanes.join('; ') +
      '); speculative attempts completed and discarded: ' + spec.join(', ') + '; early-exact regressions (first exact at attempt 1): ' +
      'classic9:2 x0.91, greaterThan:1 x0.89; n = 3 descriptive; no censoring; above 120 s: 0',
    verdicts: verdicts,
    verdict: 'supported on mega16, mega12, samurai, classic9; Killer: ' + s5aText(killer) + '; Greater-Than: ' + s5aText(gt)
  };
}

function s3Row(cells, ctx) {
  const cov = ctx.evidence.s03Coverage.doc;
  const bits = cells.map(function (h) {
    return h.cell + ' serial ' + (h.factors.partialS3Serial.n > 0 ? f2(h.factors.partialS3Serial.p50) : 'n/a') + ' (n = ' +
      h.factors.partialS3Serial.n + '), median paired incremental ' + f2(h.factors.partialS3Incremental.p50) + ' (' +
      range(h.factors.partialS3Incremental) + ')';
  });
  return {
    id: 's3', rowKind: 'multiplier', report: 'Partial S3',
    P: 'same check/failure sequence (parity); no gain forecast was assigned to the partial scope (the report\'s x1.3-1.65 is the ' +
      'full-S3 planning range)',
    before: 'native-w1 / attempts-w4 baselines of IG-S02 (reused, never rerun)',
    after: 'scoped-native-w1 (n = 1 per cell on 6 seeds) and scoped-attempts-w4 (18 requests): ' + bits.join('; '),
    ratios: 'serial x0.94-1.03, median paired incremental over the pool x0.89-1.04 per request; CPU pool+S3/pool x0.97-1.13',
    hits: 'verified exact unchanged on 24/24 scoped requests (24 request identities digest-equal to IG-S02)',
    scope: 'PARTIAL: naked/hidden singles (3 finders, no checks) and the six naked/hidden pair/triple/quad finders (replayed ' +
      'checks); ' + get(cov, 'nativeFullScan.length') + ' other techniques (pointing, box/line, fish, wings, chains, cages, ' +
      'inequalities) stay native full scans; skipped scopes charging two or more virtual node checks covered by engine-free ' +
      'tests only; no naturally binding ceiling captured (boundary-injected only)',
    verdicts: { parity: 'supported', partialScopeGain: 'no-material-net-gain-demonstrated', fullS3: 'untested-inconclusive' },
    verdict: 'parity supported (SM4 sufficient for these families on this runtime: 18 saved puzzles x 4 solver sets equal, 770 ' +
      'injected failures equal in ordinal, site and error fields, four deliberate mutations detected, 0 audit violations); ' +
      'no material net gain demonstrated within the partial scope; full-S3 forecast untested/inconclusive ' +
      '(17 families and the cache overhead unmeasured; SM1 conditional scenarios are not ceilings)'
  };
}

function s1s2Row(sm2) {
  const natives = [];
  sm2.cells.forEach(function (c) { c.modes.filter(function (m) { return m.kind === 'native'; }).forEach(function (m) { natives.push(m); }); });
  const nativeSamples = natives.reduce(function (n, m) { return n + m.samplesObserved; }, 0);
  const nativeExact = natives.reduce(function (n, m) { return n + m.native.class.exact; }, 0);
  const nativeShallow = natives.reduce(function (n, m) { return n + m.native.class.shallow; }, 0);
  const nativeTrials = natives.reduce(function (n, m) { return n + m.trials; }, 0);
  const frontierTrials = sm2.cells.reduce(function (n, c) { return n + c.modes.filter(function (m) { return m.kind === 'frontier'; }).reduce(
    function (k, m) { return k + m.trials; }, 0); }, 0);
  const per = sm2.cells.map(function (c) {
    const f1 = c.f1SampleCostVsNative;
    return c.cell + ' x' + f2(f1.f1OverEqualWeightMix) + ' (F1/ordinary x' + f2(f1.f1OverOrdinary) + ', F1/proposal x' + f2(f1.f1OverProposal) + ')';
  });
  const outcomes = sm2.cells.map(function (c) {
    const o = c.s1CostVsYield.outcomesOfTheCheapWork;
    return c.cell + ' ' + o.emptyUniqueFrontier + '/' + o.samples + ' empty unique frontiers, ' + o.candidatesAboveBand + ' above-band candidates' +
      (o.budgetStopSamples > 0 ? ', ' + o.budgetStopSamples + ' count-budget stops' : '');
  });
  const mix = sm2.sampleMixInSm1.filter(function (m) { return m.fourSm1Request; }).map(function (m) {
    return m.ordinarySamples + '/' + m.proposalSamples; });
  const budgetEnded = sm2.cells.map(function (c) {
    return c.cell + ' ' + c.modes.filter(function (m) { return m.kind === 'frontier'; }).reduce(function (n, m) {
      return n + m.outcomes.budgetEnded; }, 0);
  });
  const allHits = sm2.verifiedHits;
  const mixText = sm2.cells.map(function (c) { return f2(c.f1SampleCostVsNative.f1OverEqualWeightMix); }).join(' / ');
  return {
    id: 's1s2', rowKind: 'multiplier', report: 'S1 F0/F1/FC/FM/FU/FS: sample cost and yield kept apart',
    P: 'a hit-rate lever, not a speed lever: a near-constant per-sample cost, time per sample divided by about 1 (81 cells), 1.2 (144), ' +
      '1.5-2 (multigrids), 3 (mega16) (report.md:35-36, 108); yield (p) unmeasured, decided by SM2',
    before: 'native kinds, 8 grid clusters per cell: proposal-only and ordinary-only, ' + sm2.cells.reduce(function (n, c) {
      return n + c.modes.filter(function (m) { return m.kind === 'native'; }).reduce(function (k, m) { return k + m.verifiedHits; }, 0);
    }, 0) + ' verified hits in ' + nativeTrials + ' trials; ' + nativeExact + ' exact of ' + nativeSamples + ' native samples (' + nativeShallow + ' shallow)',
    after: 'six frontier variants x 4 cells x 8 clusters = ' + frontierTrials + ' trials: ' + sm2.cells.reduce(function (n, c) {
      return n + c.modes.filter(function (m) { return m.kind === 'frontier'; }).reduce(function (k, m) { return k + m.verifiedHits; }, 0);
    }, 0) + ' verified hits; budget-ended frontier trials per cell: ' + budgetEnded.join(', '),
    ratios: 'COST (separate from yield), F1 sample CPU over the equal-weight native mix of the same grids: ' + per.join('; ') +
      '. The near-constant-cost planning expectation was not observed for this prototype and cohort; ' +
      'the cheap work is attributable to unsuccessful, empty or above-band outcomes: ' + outcomes.join('; ') + '; no exact, shallow or below-band ' +
      'candidate in any cell. Equal weighting matches the observed ordinary/proposal counts of the four SM1 requests (' + mix.join(', ') +
      '; IG-S07/summary-r2.md lines 78-88); it remains a sample-cost comparator, not whole-request throughput, and early stopping can ' +
      'change the realised mix',
    hits: 'YIELD: ' + (allHits === 0 ? '0 verified hits' : allHits + ' verified hits') + ' in every mode and cell, native controls included ' +
      '(rates and all ' + sm2.intervals.rows + ' paired intervals: ' + sm2.intervals.degenerate + ' degenerate, 0 [0, 0]); sample-origin 0, ' +
      'local-origin not measured (no local continuation in these trials). Cost per verified exact puzzle is unestablished (no hit to divide by)',
    scope: 'two-sample grid trials on the pre-MS07 catalogue, reference solver, width 1; whole-request recovery and local search ' +
      'excluded; classic9, mega12, mega16, samurai only (wordoku, sohei, flower, butterfly: not measured); selection F1 is a ' +
      'non-winning diagnostic default in all four cells; held-out outcomes unmeasured; the S2 isolation is the next row',
    verdicts: { sampleCost: 'planning-expectation-not-observed', costPerVerifiedExactPuzzle: 'unestablished', yield: 'inconclusive' },
    verdict: 'cost: F1 samples cost ' + mixText + ' of the native mix on classic9 / mega12 / mega16 / samurai, not the near-constant ' +
      'cost the planning expectation gave, and the cheap work belongs to unsuccessful, empty or above-band outcomes; yield: inconclusive ' +
      '(no demonstrated exact-yield benefit and no refutation: 0 hits include the native controls); cost per verified exact puzzle ' +
      'unestablished; separate problems kept apart (empty unique frontiers, shallow or above-band candidates, count-budget stops); ' +
      'formal gate not-evaluable-pre-freeze; no S1 drop and no S9 routing implied'
  };
}

function s2Row(sm2) {
  const iso = sm2.cells.map(function (c) { return { cell: c.cell, s: c.s2Isolated }; });
  const bits = function (key) { return iso.map(function (x) { return x.cell + ' x' + f2(x.s[key]); }).join(', '); };
  const paired = iso.map(function (x) {
    return x.cell + ' x' + f2(x.s.pairedClusterReadyCpuRatio.median) + ' (' + f2(x.s.pairedClusterReadyCpuRatio.min) + '-' + f2(x.s.pairedClusterReadyCpuRatio.max) + ')';
  }).join(', ');
  const ratios = iso.map(function (x) { return x.s.f1OverF0MeanSampleCpu; });
  const lo = Math.min.apply(null, ratios);
  const hi = Math.max.apply(null, ratios);
  const deduction = iso.map(function (x) {
    return x.cell + ' ' + x.s.deductionSaving.f1AcceptedByRederivation + ' of ' + (x.s.deductionSaving.f1AcceptedByRederivation +
      x.s.deductionSaving.f1AcceptedByFullProof) + ' (' + pct(x.s.deductionSaving.rederivationShareOfF1Accepted) + ')';
  }).join('; ');
  return {
    id: 's2', rowKind: 'multiplier', report: 'S2 isolated: F0 versus F1',
    P: 'S2 re-derivation early exit of removal tests: "a removal test costs a few deductions, not a solve" (plan.md:99), part of the S1 + S2 ' +
      'per-sample divisor (report.md:107-108)',
    before: 'F0 (frontier without the re-derivation): mean sample CPU ms ' + iso.map(function (x) { return x.cell + ' ' + f2(x.s.f0MeanSampleCpuMs); }).join(', '),
    after: 'F1 (with the re-derivation), the same grids and samples: mean sample CPU ms ' + iso.map(function (x) { return x.cell + ' ' + f2(x.s.f1MeanSampleCpuMs); }).join(', '),
    ratios: 'F1/F0 CPU, statistic: ratio of the mean sample CPU over the same samples of the same 8 grid clusters per cell (' + iso[0].s.pairedPopulation +
      '): ' + bits('f1OverF0MeanSampleCpu') + ' (' + f2(lo) + '-' + f2(hi) + '); ratio of the cohort totals of ready CPU: ' + bits('f1OverF0ReadyCpuOfClusterTotals') +
      '; median of the 8 paired per-cluster ready-CPU ratios (min-max): ' + paired + ' (dispersed at n = 8)',
    hits: 'n/a (cost row); F0 and F1 take the same decisions in every cell (floor tests, candidates, outcomes equal): ' +
      iso.map(function (x) { return x.cell + ' ' + x.s.sameDecisions; }).join(', ') + '; 0 verified hits in both',
    scope: 'paired population: ' + iso[0].s.pairedPopulation + '; KEPT SEPARATE: correctness and deduction-saving evidence (F1 accepted removals by ' +
      're-derivation instead of a full proof: ' + deduction + '; S2 audited on the IG-S04 pilot: ' + get(sm2.s2Audit, 'trialsAudited') +
      ' trials, ' + get(sm2.s2Audit, 'auditedRemovals') + ' removals, ' + get(sm2.s2Audit, 'correctnessProblems') + ' correctness problems); not ' +
      'generalised: whole requests, other cells, larger floors and the deduction-saving mechanism are not isolated here',
    verdicts: { cpuSaving: 'none-observed-on-this-cohort', correctnessAndDeductionSaving: 'reported-separately', generalisation: 'not-claimed' },
    verdict: 'no CPU saving on this cohort: F1/F0 CPU x' + f2(lo) + '-' + f2(hi) + ' (mean sample CPU, same 16 samples per cell); correctness and ' +
      'deduction-saving evidence is reported separately and is not contradicted by this; not generalised to "S2 never helps"'
  };
}

function sm5Row() {
  return {
    id: 'sm5', rowKind: 'multiplier', report: 'SM5 pool width sweep 1 / 2 / 4',
    P: 'S5a in Node worker_threads with 1, 2 and 4 workers on mega12 and classic9 Nightmare: identical puzzles and wall time; decides the pool ' +
      'design and the message cost (plan.md:366)',
    before: 'not measured', after: 'not measured', ratios: 'n/a', hits: 'n/a',
    scope: 'UNMEASURED: no 1 / 2 / 4-width sweep exists for classic9 or mega12. IG-S02 compared the serial native run (width 1) with the pool at ' +
      'width min(4, A) on six cells and 3 seeds; the effective two-worker operation on the two-attempt boards (mega16, samurai) is not the missing ' +
      'width-two comparison on classic9 and mega12',
    verdicts: { sweep: 'unmeasured' },
    verdict: 'unmeasured (not passed, not refuted); added to the frozen proposal (D9, A7) and no run is authorised'
  };
}

function floorProbesRow() {
  return {
    id: 'floor-probes', rowKind: 'multiplier', report: 'Restricted-floor performance probes',
    P: 'restricted-floor (and prefix) probes of the new test costs: an accepted floor test, a refused floor test at each floor level, a DFS ' +
      'uniqueness check, a full solve (clarifications.md:186, 503; report.md:42, 136, 263)',
    before: 'not measured', after: 'not measured', ratios: 'n/a', hits: 'n/a',
    scope: 'UNMEASURED: no probe times these operations in isolation. The existing floor parity evidence (equal floor decisions of the equal-result ' +
      'checks and the F0/F1 comparison) is not that experiment; the frontier trials count floor tests and report a phase-A wall share, not a ' +
      'cost per operation kind',
    verdicts: { probes: 'unmeasured' },
    verdict: 'unmeasured (not passed, not refuted); added to the frozen proposal (D9, A7) and no run is authorised'
  };
}

function s5bRow() {
  return {
    id: 's5b', rowKind: 'multiplier', report: 'S5b composition',
    P: 'samples parallel; local continuation remains per attempt (never four lanes on a two-attempt board)',
    before: 'not measured', after: 'not measured', ratios: 'n/a', hits: 'n/a',
    scope: 'IG-S06 (held-out requests 201/202, N1/CA4/CQ1/CQ4, quota protocol) is DEFERRED for the pre-freeze round: no ' +
      'implementation, no run, no record; the full-request composition of S1/S2 with S5b is unmeasured',
    verdicts: { composition: 'inconclusive' },
    verdict: 'inconclusive: deferred, unmeasured (not passed, not refuted); see the frozen-rerun plan for when to implement and ' +
      'run it (after the frozen SM2 review and a separate budget approval)'
  };
}

function sm1Row(sm1, headline) {
  const anchors = { mega16: 0.90, mega12: 0.83, samurai: 0.72, classic9: 0.53 };
  const label = { mega16: 'mega16:3', mega12: 'mega12:3', samurai: 'samurai:42', classic9: 'classic9:3' };
  const differences = {};
  const bits = Object.keys(anchors).map(function (cell) {
    const c = sm1.cells.find(function (x) { return x.key.indexOf('/' + label[cell].replace(':', ':nightmare:') + '/') > 0; });
    differences[cell] = { sampleSharePercent: RP.num(c.sampleShare) === null ? null : c.sampleShare * 100, anchorPercent: anchors[cell] * 100,
      differencePoints: RP.pointsDifference(c.sampleShare, anchors[cell]) };
    return cell + ' ' + pct(c.sampleShare) + ' / ' + pct(c.localShare) + ' (P ' + Math.round(anchors[cell] * 100) + ' %, ' +
      signed(differences[cell].differencePoints, 1) + ' points)';
  });
  const others = sm1.cells.filter(function (x) { return /killer:nightmare|greaterThan:nightmare/.test(x.key); }).map(function (c) {
    return c.key.split('/')[2] + ' ' + pct(c.sampleShare) + ' / ' + pct(c.localShare);
  });
  return {
    id: 'sm1', rowKind: 'multiplier', report: 'SM1 shares',
    P: 'mega16 samples ~90 %, local ~10 %; G13 (samurai) ~72 % / ~28 %; mega12 83 %; classic9 ~53 % (a fitted component share)',
    before: 'nine profiled native requests, n = 1 per cell, instrumented wall (not the before/after timing evidence)',
    after: 'sample / local share of engine-root wall: ' + bits.join('; '),
    ratios: 'profile overhead (profiled / unprofiled ready wall) beside each cell in the report JSON; chains (`nishio`, `forcingChain`) ' +
      'about 81 % of the mega16 and 77 % of the mega12 profile (hotspots, not cacheability)',
    hits: 'n/a (attribution); sample / local share of the Nightmare profiles without an anchor: ' + others.join('; '),
    scope: 'n = 1 per cell; Killer and Greater-Than have large non-finder shares (Killer DFS 45 %, Greater-Than local search own ' +
      'code 25 %); S3 scenarios are CONDITIONAL zero-cost figures, not full-S3 ceilings; frontier phase A per-finder wall ' +
      'unmeasured (counts and phase wall only); pre-MS07; observed ' + sm1.solvesPerOrdinarySample.min + '-' + sm1.solvesPerOrdinarySample.max +
      ' solves per ordinary sample in the four SM1 requests, so the plan\'s 1,296 solves per sample and its "10x fewer solves per ' +
      'sample" are withdrawn as representative costing and speed-up premises (section 7)',
    verdicts: { descriptive: 'no verdict; differences in percentage points beside each cell' },
    differences: differences,
    verdict: 'descriptive, no verdict (n = 1 per cell, no threshold is set by the pack): sample-share differences to the report in ' +
      'percentage points ' + Object.keys(anchors).map(function (cell) {
        return cell + ' ' + signed(differences[cell].differencePoints, 1); }).join(', ') + '; Killer and Greater-Than have no ' +
      'sample/local anchor'
  };
}

function sm3Row(sm3) {
  return {
    id: 'sm3', rowKind: 'multiplier', report: 'SM3 Jigsaw 1111',
    P: 'historical 325.313 s (I5 n = 20, one request); stage unknown',
    before: 'historical 325.313 s, uninstrumented, not remeasured (a 400 s command would break the 300 s ceiling)',
    after: 'censored at ' + f3(sm3.thisRun.censoredLowerBoundWallS) + ' s (guard ' + sm3.thisRun.guardS + ' s), CPU at least ' +
      f2(sm3.thisRun.censoredLowerBoundCpuS) + ' s, no puzzle; control seed 1100 ready-wall factor ' + f2(sm3.control.readyWallFactor) +
      ' (n = 1)',
    ratios: 'n/a: a censored lower bound is not a completed latency; cumulative full-grid contexts ' +
      pct(get(sm3, 'stageLowerBounds.fullGrid.share') !== null ? sm3.stageLowerBounds.fullGrid.share : null),
    hits: 'n/a (no puzzle)',
    scope: 'one instrumented request, censored by the 240 s Jigsaw guard; the instrumented run passed the 120 s application guard ' +
      'which does not establish uninstrumented latency; counters of the running search are in none of the completed counts; ' +
      'per-attempt counts unknown, not reconstructed; no safe ceiling inferred',
    verdicts: { stageAttribution: 'supported' },
    verdict: 'supported as an attribution (full-grid search, Q07 option (b)), censored: lower bound ' + f3(sm3.thisRun.censoredLowerBoundWallS) +
      ' s; consistent with, not proof of, the historical 325 s being the same stage'
  };
}

function gtRow(gt) {
  const n = gt.cohorts.normal;
  const m = gt.cohorts.nightmare;
  const trapN = gt.namedTrap.normal;
  const trapM = gt.namedTrap.nightmare;
  return {
    id: 'gt', rowKind: 'multiplier', report: 'Greater-Than Normal / Q16',
    P: 'MS05e: 22.1 % of the Normal misses end at the clue floor (named trap); 95 % is a request-group cost, not a stage share',
    before: 'G0 (native sign pass), trace SUMMARY: Normal ' + n.pairs + ' pairs ready ' + f2(n.sums.g0ReadyS) + ' s; Nightmare ' + m.pairs +
      ' of ' + m.pairsPlanned + ' pairs ' + f2(m.sums.g0ReadyS) + ' s',
    after: 'G1 (sound-solve-first, first technique pass only): Normal ' + f2(n.sums.g1ReadyS) + ' s; Nightmare ' + f2(m.sums.g1ReadyS) + ' s',
    ratios: 'G0/G1 ratio of cohort totals: ready wall Normal ' + f3(n.readyRatioOfTotalsG0OverG1) + ', Nightmare ' + f3(m.readyRatioOfTotalsG0OverG1) +
      '; CPU (incl. startup and cleanup) Normal ' + f3(n.cpuRatioOfTotalsG0OverG1) + ', Nightmare ' + f3(m.cpuRatioOfTotalsG0OverG1) +
      ' (a value below 1 means G1 took longer)',
    hits: 'verified exact samples per cohort: Normal ' + n.missSplit.g0.exact + ' of ' + n.missSplit.g0.samples + ', Nightmare ' +
      m.missSplit.g0.exact + ' of ' + m.missSplit.g0.samples + ' (the split is identical in G0 and G1: ' + (C.canonicalJson(n.missSplit.g0.buckets) ===
      C.canonicalJson(n.missSplit.g1.buckets) && C.canonicalJson(m.missSplit.g0.buckets) === C.canonicalJson(m.missSplit.g1.buckets)) + '); named trap ' +
      trapN.numerator + '/' + trapN.denominator + ' of Normal misses, ' + trapM.numerator + '/' + trapM.denominator + ' of Nightmare misses',
    scope: 'trace SUMMARY cohort, never the trace-off headline; Normal 20/20 pairs, Nightmare 6/10 (a partial, budget-limited cohort: ' +
      '706-709 UNSTARTED, eight rows; the recorded requests completed); ' +
      '26/26 pairs identical (digests, ratings, sign decisions, semantic counters), no guard-binding difference; `counts.dfsEntries` ' +
      'in the records are countSolutions CALLS (erratum applied); probes: ' + gt.probes.executedGroupChecks + ' executed group checks ' +
      'plus ' + gt.probes.reusedRows + ' reused rows; two singleton observer controls; no global G1 winner, no production adoption',
    verdicts: { namedTrapShare: 'descriptive-reproduced', requestGroupShare: 'descriptive-reproduced', g1: 'inconclusive' },
    verdict: 'named trap: ' + pct(trapN.numerator / trapN.denominator) + ' of Normal misses end at the clue floor against 22.1 % in MS05e ' +
      '(descriptive, no threshold; minimality 83/83); the 95 % is the request-group share (' +
      pct(get(n.localStage, 'g0.requestGroupShareOfTimeOfRequestsWithACappedLocal.share')) +
      ' here) while the measured local-stage share is ' + pct(get(n.localStage, 'g0.measuredLocalStageShareOfAllRequestTime.share')) +
      '; G1: modest Normal benefit (x' + f3(n.readyRatioOfTotalsG0OverG1) + '), substantial Nightmare regression (x' + f3(m.readyRatioOfTotalsG0OverG1) +
      ', six pairs, a partial, budget-limited cohort: its recorded requests completed and eight rows were unstarted); no global winner (cohorts differ) and no production adoption'
  };
}

function estimateTable(ctx) {
  const rows = ctx.headline.map(headlineRow);
  rows.push(s5aRow(ctx.headline), s3Row(ctx.headline, ctx), s1s2Row(ctx.sm2), s2Row(ctx.sm2), s5bRow(), sm1Row(ctx.sm1, ctx.headline),
    sm3Row(ctx.sm3), gtRow(ctx.gt), sm5Row(), floorProbesRow());
  return rows;
}

// --- provenance ----------------------------------------------------------------------------------------------------------------

function provenance(ctx) {
  const textOfEvidence = Object.keys(ctx.evidence).map(function (k) {
    const e = ctx.evidence[k];
    return e.doc ? JSON.stringify(e.doc) : '';
  }).join('\n');
  const commandText = JSON.stringify(ctx.coverage.tasks.map(function (t) { return t.identity; }));
  const found = function (prefix) {
    const inEvidence = textOfEvidence.indexOf(prefix) >= 0 || commandText.indexOf(prefix) >= 0;
    return inEvidence;
  };
  const perTask = ctx.coverage.tasks.map(function (t) {
    const d = RC.DECLARED_FINGERPRINTS[t.task];
    const measurement = t.identity.harnessFingerprintsOfCommands;
    return {
      task: t.task,
      measurement: { role: 'harness fingerprint(s) recorded by the measurement commands (the final run chain)', fingerprints: measurement },
      measurementDeclaredPrefixes: d.measurement.map(function (p) { return { prefix: p, inCommands: measurement.some(function (m) {
        return m.indexOf(p) === 0; }) }; }),
      reportWriters: d.writers.map(function (p) { return { prefix: p, foundInEvidenceDocuments: found(p) }; }),
      correctedHarness: d.corrected.map(function (p) { return { prefix: p, foundInEvidenceDocuments: found(p), engineRerun: false }; }),
      reading: 'the corrections after the measurement (reporting, verification, branches no trial exercised) were NOT rerun ' +
        'on the engine; the measurement commands, the report writers and the corrected harnesses are distinct identities'
    };
  });
  const ig09 = RC.DECLARED_FINGERPRINTS['IG-S09'];
  return {
    runtime: { fingerprint: ctx.runtimeFingerprint, label: RUN.DEFAULT_RUNTIME_LABEL, files: ctx.runtimeFileCount,
      note: 'every measurement command of the nine tasks ran on this runtime fingerprint (checked per task)' },
    catalogue: ctx.catalogue,
    harness: {
      atIgS10Run: ctx.harnessAtRun,
      beforeIgS10: { fingerprint: RP.HARNESS_BEFORE_IG_S10, short: RP.HARNESS_BEFORE_IG_S10.slice(0, 12),
        note: 'computed with common.cjs harnessFingerprint() at the start of this task, before any IG-S10 edit; it is the ' +
          'IG-S09 F2-follow-up harness (' + ig09.corrected[0] + '...); IG-S10 adds files and one glue line in run.cjs, so the ' +
          'fingerprint of this run differs' },
      accepted: { 'IG-S02': 'summary-r2 + Killer audit-a1', 'IG-S03': 'summary-r3', 'IG-S04': 'summary-r2, budgets-r2',
        'IG-S05': 'summary-r2', 'IG-S07': 'r2', 'IG-S08': 'r3', 'IG-S09': 'r2 plus the F2 follow-up (' + ig09.corrected[0] + '...)' }
    },
    perTask: perTask,
    documents: Object.keys(ctx.evidence).map(function (k) { return { name: k, rel: ctx.evidence[k].rel, sha256: ctx.evidence[k].sha256,
      bytes: ctx.evidence[k].bytes, parsed: ctx.evidence[k].doc !== null }; })
  };
}

// --- the machine block of the report --------------------------------------------------------------------------------------------

function machineBlock(b) {
  const t = b.roundTotals;
  return {
    chargedWrappedBeforeIgS10S: t.chargedWrappedBeforeIgS10Ms / 1000, chargedIgS10S: t.chargedIgS10Ms / 1000,
    chargedWrappedS: t.chargedWrappedMs / 1000, manualAdjustmentsS: t.manualAdjustmentsMs / 1000,
    chargedTotalS: t.chargedTotalMs / 1000, ceilingS: t.ceilingMs / 1000, unusedOfCeilingS: t.unusedOfRoundCeilingMs / 1000,
    wrappedCommands: t.wrappedCommands, ledgerEntries: t.ledgerEntries, evidenceOnlyCommands: t.evidenceOnlyCommands,
    occupiedS: t.occupiedMs / 1000, chargedGraceS: t.chargedGraceMs / 1000,
    priorityWaitKnownS: t.priorityWaitKnownMs / 1000, priorityWaitKnownLedgerOnlyS: t.priorityWaitKnownLedgerOnlyMs / 1000,
    priorityWaitKnownAuxiliaryReceiptsS: t.priorityWaitKnownAuxiliaryReceiptsMs / 1000,
    commandsWithUnknownWait: t.commandsWithUnknownWait,
    manualAdjustments: b.manualAdjustments.map(function (a) { return { task: a.task, chargedS: (a.chargedMs + a.graceMs) / 1000,
      graceS: a.graceMs / 1000, what: a.what, rule: a.rule }; }),
    approvals: b.approvals.map(function (a) { return { task: a.task, extraS: a.extraMs / 1000, usedBeyondBaseS: a.usedBeyondBaseMs / 1000 }; }),
    tasks: Object.keys(b.tasks).map(function (k) {
      const x = b.tasks[k];
      return { task: k, allocationS: x.allocationMs / 1000, approvedS: x.approvedExtraMs / 1000, commands: x.commands,
        chargedS: x.chargedMs / 1000, graceS: x.chargedGraceMs / 1000, manualAdjustmentS: x.manualAdjustmentMs / 1000,
        unusedOfAllocationPlusApprovalS: x.unusedOfAllocationPlusApprovalMs / 1000, priorityWaitKnownS: x.priorityWaitKnownMs / 1000,
        commandsWithUnknownWait: x.commandsWithUnknownWait, status: x.status };
    }),
    ig10: b.ig10, reference: 'budget-summary-r2.json'
  };
}

module.exports = { headlineRow, s5aRow, s3Row, s1s2Row, s2Row, s5bRow, sm1Row, sm3Row, gtRow, sm5Row, floorProbesRow, estimateTable, provenance, machineBlock,
  f2, f3, f4, pct, range };
