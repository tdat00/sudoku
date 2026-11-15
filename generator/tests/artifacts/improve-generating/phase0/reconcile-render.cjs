'use strict';

/*
 * IG-S10: report.md, rendered from report.json alone (what the reader sees is exactly what the JSON holds). CRLF, no
 * trailing whitespace, one final newline (common.cjs normaliseText). Provisional (pre-freeze).
 */
const C = require('./common.cjs');
const B = require('./reconcile-build.cjs');

const f2 = B.f2;
const f3 = B.f3;
const f4 = B.f4;
const pct = B.pct;

function cell(v) {
  if (v === null || v === undefined) return 'n/a';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000);
  return String(v).replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function table(headers, rows) {
  const out = ['| ' + headers.join(' | ') + ' |', '|' + headers.map(function () { return '---'; }).join('|') + '|'];
  rows.forEach(function (r) { out.push('| ' + r.map(cell).join(' | ') + ' |'); });
  return out.join('\n');
}

const mmss = function (ms) { return ms === null || ms === undefined ? 'n/a' : (Math.round(ms / 100) / 10).toFixed(1) + ' s'; };
const mins = function (ms) { return (Math.round(ms / 6000) / 10).toFixed(1) + ' min'; };
const short = function (h, n) { return h ? h.slice(0, n || 12) : 'n/a'; };

function renderReport(rep) {
  const L = [];
  const add = function () { Array.prototype.forEach.call(arguments, function (x) { L.push(x); }); };
  add('# IG-S10: estimates against measurements, and the frozen-rerun handoff (' + rep.round + (rep.revision ? ', revision ' + rep.revision.id : '') + ')', '');
  add('**' + rep.provisionalNotice + '**', '');
  if (rep.revision) {
    add('**Revision ' + rep.revision.id + '** (' + rep.revision.reason + '). It supersedes the r1 and r2 documents, which stay unchanged beside it ' +
      '(sha-256 first 16: ' + rep.revision.supersedes.map(function (s) { return (s.revision ? s.revision + ' ' : '') + s.file + ' ' + s.sha256.slice(0, 16); }).join('; ') + '). ' +
      rep.revision.writerRole + '. Writer harness fingerprint ' + rep.revision.writerHarnessFingerprint + ' (the r2 writer ran harness ' +
      short(rep.revision.r2WriterHarnessFingerprint, 16) + '...; the wrapped r1 command ran harness ' + short(rep.revision.r1CommandHarnessFingerprint, 16) + '...). ' +
      (rep.revision.comparisonToR2 ? 'Against r2 (revision header, test counts and disclosures ignored): ' + rep.revision.comparisonToR2.map(function (c) {
        return c.file + (c.materiallyEqual ? ' equals ' : ' differs from ') + c.comparedWith; }).join('; ') + '.' : ''), '');
  }
  add('Evidence status: **' + rep.evidenceStatus + '**. Formal gate: **' + rep.formalGate + '** (see ' + rep.gate.reference + '). Pre-MS07 ' +
    'catalogue and runtime; every number below is a provisional measurement of a prototype, never a production result. ' +
    'Original estimates are labelled **P** (the joint report: Measured today, otherwise Derived or Projection).', '');
  add('Scope of this document: the reconciliation of IG-S01 to IG-S09 (IG-S06 deferred), the estimate-versus-measured table of ' +
    'the check-list, the provisional gate report, the machine accounting and the frozen-rerun proposal. It generated no ' +
    'puzzle, started no engine and no worker, and changed no production source.', '');
  if (rep.errata) {
    add('## 0. Errata to the joint report, the plan and the earlier IG-S10 reports', '');
    add('The pack author\'s report-only rulings correct the passages below. The originals (`report.md`, `plan.md`, `clarifications.md` and the r1 / r2 ' +
      'reports) are not edited; line numbers are located in the files as they are now. Measured records and accounting figures are unchanged.', '');
    add(table(['#', 'ruling', 'subject', 'affected passage (document: lines)', 'what was wrong', 'correction (this revision)'], rep.errata.map(function (e) {
      return [e.id, e.ruling, e.subject, e.passages.map(function (p) { return p.document + ': ' + (p.linesText || 'n/a'); }).join('; '), e.problem, e.correction];
    })), '');
  }

  // --- 1. sources -----------------------------------------------------------------------------------------------------------
  add('## 1. Sources and identities', '');
  const p = rep.provenance;
  add(table(['item', 'value'], [
    ['runtime fingerprint (every measurement command; recheck by file reads)', p.runtime.fingerprint],
    ['runtime label (supplied)', p.runtime.label], ['runtime files', p.runtime.files],
    ['catalogue fingerprint', p.catalogue.fingerprint], ['catalogue', 'rating version ' + p.catalogue.ratingVersion + ', ' +
      p.catalogue.variants + ' variants, ' + p.catalogue.techniques + ' techniques'],
    ['harness fingerprint of this ' + (rep.revision ? rep.revision.id + ' report writer (unwrapped aggregation)' : 'IG-S10 run'), p.harness.atIgS10Run],
    ['harness fingerprint of the r2 report writer', rep.revision && rep.revision.r2WriterHarnessFingerprint ? rep.revision.r2WriterHarnessFingerprint : 'n/a'],
    ['harness fingerprint of the wrapped r1 command', rep.revision ? rep.revision.r1CommandHarnessFingerprint : p.harness.atIgS10Run],
    ['harness fingerprint before the IG-S10 edits (= the IG-S09 F2 follow-up)', p.harness.beforeIgS10.fingerprint],
    ['source stability and firewall', rep.sourceChecks.summary]]), '');
  add(p.harness.beforeIgS10.note, '');
  add('Three identities are kept apart for every task: the **measurement** command(s) that produced the records, the **report ' +
    'writer(s)** that produced the accepted summaries, and the **corrected harness** after later corrections. The corrections ' +
    '(reporting, verification, branches no trial exercised) were NOT rerun on the engine.', '');
  add(table(['task', 'measurement (recorded by the commands)', 'report writer(s) (prefix, found in evidence)',
    'corrected harness (prefix, engine-rerun)'], p.perTask.map(function (t) {
    return [t.task, t.measurement.fingerprints.map(function (x) { return short(x); }).join(', '),
      t.reportWriters.map(function (w) { return w.prefix + (w.foundInEvidenceDocuments ? ' (yes)' : ' (log only)'); }).join(', ') || 'none',
      t.correctedHarness.map(function (w) { return w.prefix + (w.foundInEvidenceDocuments ? ' (yes' : ' (log only') + ', no)'; }).join(', ') || 'none'];
  })), '');
  add('Accepted revisions used: ' + Object.keys(p.harness.accepted).map(function (k) { return k + ' ' + p.harness.accepted[k]; }).join('; ') +
    '. Earlier revisions of every summary stay as history and are not used.', '');
  add(table(['accepted document', 'sha-256 (first 16)', 'bytes'], p.documents.map(function (d) {
    return [d.rel, d.sha256.slice(0, 16), d.bytes];
  })), '');

  // --- 2. coverage ----------------------------------------------------------------------------------------------------------
  const cv = rep.coverage;
  add('## 2. Coverage reconciliation (planned against observed)', '');
  const s = cv.summary;
  add('Planned keys ' + s.plannedKeys + ' across ' + s.tasksReconciled + ' tasks: completed ' + s.completed + ', completed by audit overlay ' +
    s.completedByAuditOverlay + ', budget-ended ' + s.budgetEnded + ', censored ' + s.censored + ', errors ' + s.error + ', ' +
    'validation unknown ' + s.validationUnknown + ', **unstarted ' + s.unstarted + '**; early-exact skipped ' + s.earlyExactSkipped + ', aliases ' + s.aliases +
    ', blocked ' + s.blocked + '; deferred: **IG-S06** (not planned, not run). Every manifest equals its preregistered population: ' +
    s.populationsEqualToThePreregistered + '. Reconciliation problems: ' + s.problems + '. A key is never counted twice and none is dropped.', '');
  add(table(['task', 'status', 'planned', 'completed', 'audit overlay', 'budget-ended', 'censored', 'error', 'unstarted', 'manifest'],
    cv.tasks.map(function (t) {
      return [t.task, t.status, t.planned.keys, t.observed.completed, t.observed.completedByAuditOverlay, t.observed.budgetEnded,
        t.observed.censored, t.observed.error, t.observed.unstarted, t.identity.manifestHashChanged ? 'hash differs (see notes)' : 'equal'];
    }).concat([['IG-S06', 'deferred', 'not planned', 0, 0, 0, 0, 0, 'n/a', 'no manifest']])), '');
  cv.tasks.forEach(function (t) {
    const bits = [];
    if (t.identity.manifestHashNote) bits.push(t.identity.manifestHashNote);
    if (t.auditOverlay) bits.push('Killer overlay: ' + t.auditOverlay.rows.length + ' stored `error` rows verified by the hash-linked re-audit (`' +
      t.auditOverlay.file + '`, sha-256 ' + t.auditOverlay.fileSha256.slice(0, 16) + '); the stored records are unchanged');
    if (t.censored.length > 0) bits.push('censored: ' + t.censored.map(function (c) { return c.key + ' (' + c.outcome + ', scope ' +
      c.timeoutScope + ', cold wall lower bound ' + f3(c.coldWallMsLowerBound / 1000) + ' s)'; }).join('; '));
    if (t.unstarted.length > 0) bits.push('UNSTARTED (not excluded, failed or replaced): ' + t.unstarted.join(', '));
    if (t.sampleOrdinals) bits.push('sample ordinals: ' + JSON.stringify(t.sampleOrdinals) + '; early-exact skipped ' + t.earlyExactSkipped);
    if (t.shardsNeverRun && t.shardsNeverRun.length) bits.push('shards never run: ' + t.shardsNeverRun.join(', '));
    const attemptNotes = t.shards.filter(function (sh) { return sh.attempts.length > 1; }).map(function (sh) {
      return sh.shard + ' [' + sh.attempts.map(function (a) { return a.attemptId + ':' + a.status; }).join(' '); }).map(function (x) { return x + ']'; });
    if (attemptNotes.length > 0) bits.push('attempt history kept (failed and paused attempts included): ' + attemptNotes.join('; '));
    if (bits.length > 0) add('- **' + t.task + '** (' + t.acceptance + '): ' + bits.join(' | '));
  });
  add('- **IG-S06** (' + cv.deferred[0].acceptance + '): ' + cv.deferred[0].consequence + '.', '');
  add('Commands outside every shard (charged once, listed here, their requests excluded from every count):', '');
  add(table(['command', 'task', 'status', 'occupied', 'role'], cv.auxiliaryCommands.map(function (a) {
    return [a.rel, a.task, a.status, mmss(a.occupiedMs), a.role];
  })), '');
  if (cv.ownCommands && cv.ownCommands.length > 0) {
    add('This task\'s own wrapped command (a shard attempt of its own plan, never an auxiliary command):', '');
    add(table(['command', 'task', 'status', 'occupied', 'role'], cv.ownCommands.map(function (a) {
      return [a.rel, a.task + '/' + a.shard, a.status, mmss(a.occupiedMs), a.role];
    })), '');
  }
  add('Observations that enter no count, rate or interval:', '');
  add(table(['task', 'what', 'observations', 'why'], cv.excludedObservations.map(function (e) {
    return [e.task, e.what, e.observations, e.why];
  })), '');
  add(cv.problems.length === 0 ? 'No reconciliation problem: identities, counts, firewall and gate labels agree.' :
    '**Problems:** ' + cv.problems.join('; '), '');

  // --- 3. the estimate table ---------------------------------------------------------------------------------------------------
  add('## 3. Estimate versus measured (the check-list table, filled)', '');
  add(rep.verdictRules, '');
  add(table(['Report row / multiplier', 'P: report planning anchor', 'Paired measured before', 'Measured prototype after',
    'CPU ratio / wall ratio', 'Hits / CPU s / wall s', 'Scope, censoring, source', 'Verdict (implemented scope)'],
  rep.estimateTable.map(function (r) {
    return [r.report, r.P, r.before, r.after, r.ratios, r.hits, r.scope, r.verdict];
  })), '');
  add('Verdict labels per aspect (the full rows are in the report JSON):', '');
  add(table(['row', 'verdicts'], rep.estimateTable.map(function (r) { return [r.report, JSON.stringify(r.verdicts)]; })), '');

  // --- 4. headline cells in detail ---------------------------------------------------------------------------------------------
  add('## 4. The six headline cells: paired per-seed rows, summaries and uncertainty (trace off, Nightmare, 3 paired seeds)', '');
  add('Cohort: IG-S02 (native-w1 against S5a attempts-w4) and IG-S03 (scoped solver: partial S3). Seconds. CPU is the host\'s ' +
    'process-wide CPU read once, startup, speculation and cleanup included. Ready = from engine-ready; cold = from worker ' +
    'start. n = 3: p95 is the observed maximum; the intervals are descriptive provisional ones with poor small-sample ' +
    'coverage.', '');
  rep.headline.forEach(function (h) {
    add('### ' + h.label + ' (attempts ' + h.attempts + ')', '');
    add(table(['seed', 'native ready / cold / CPU', 'S5a ready / cold / CPU', 'S5a+S3 ready / CPU', 'serial S3 ready', 'S5a ready x',
      'S5a CPU x', 'combined x', 'exact (native/S5a/S5a+S3)'], h.pairs.map(function (r) {
      const b = function (x) { return x ? f2(x.readyWallS) + ' / ' + f2(x.coldWallS) + ' / ' + f2(x.cpuTotalS) : 'n/a'; };
      return [r.seed, b(r.nativeW1), b(r.attemptsW4), r.scopedAttemptsW4 ? f2(r.scopedAttemptsW4.readyWallS) + ' / ' +
        f2(r.scopedAttemptsW4.cpuTotalS) : 'n/a', r.scopedNativeW1 ? f2(r.scopedNativeW1.readyWallS) : 'not run', f2(r.ratios.s5aReady),
      f2(r.ratios.s5aCpu), f2(r.ratios.combinedReady), (r.nativeW1.verifiedExact ? 'yes' : 'no') + ' / ' +
        (r.attemptsW4.verifiedExact ? 'yes' : 'no') + ' / ' + (r.scopedAttemptsW4 && r.scopedAttemptsW4.verifiedExact ? 'yes' : 'no')];
    })), '');
    add(table(['arm', 'n', 'complete', 'ready p50 / max', 'cold p50', 'CPU p50 / max', 'startup p50 ms', 'cleanup p50 ms', 'verified exact',
      'hits / CPU s', 'hits / wall s'], Object.keys(h.arms).filter(function (k) { return h.arms[k].requests > 0; }).map(function (k) {
      const a = h.arms[k];
      return [k, a.requests, a.complete, f2(a.readyWallS.p50) + ' / ' + f2(a.readyWallS.max), f2(a.coldWallS.p50),
        f2(a.cpuTotalS.p50) + ' / ' + f2(a.cpuTotalS.max), a.startupMs.p50, a.cleanupMs.p50, a.verifiedExact, f4(a.hitsPerCpuSecond),
        f4(a.hitsPerColdWallSecond)];
    })), '');
    const iv = h.intervals.s5aReadyWallRatioOfTotals;
    const ic = h.intervals.s5aCpuRatioOfTotals;
    add('S5a ready-wall ratio of cohort totals ' + f2(iv.point) + ', 95 % interval [' + f2(iv.ci95[0]) + ', ' + f2(iv.ci95[1]) + '] (one-sided ' +
      'lower bound ' + f2(iv.lowerBound95OneSided) + '); CPU ratio ' + f2(ic.point) + ' [' + f2(ic.ci95[0]) + ', ' + f2(ic.ci95[1]) +
      '] (2,000 resamples of whole seed clusters, analysis seed ' + iv.seed + '; descriptive, n = 3). Full-request on-time exact ' +
      'fraction (verified exact and cold wall within ' + h.onTime.budgetS + ' s): native ' + h.onTime.nativeW1.onTimeVerifiedExact + '/' +
      h.onTime.nativeW1.started + ' (lower bound ' + f3(h.onTime.nativeW1.lowerBound95OneSided) + '), S5a ' + h.onTime.attemptsW4.onTimeVerifiedExact +
      '/' + h.onTime.attemptsW4.started + ' (' + f3(h.onTime.attemptsW4.lowerBound95OneSided) + '), S5a+S3 ' + h.onTime.scopedAttemptsW4.onTimeVerifiedExact +
      '/' + h.onTime.scopedAttemptsW4.started + ' (' + f3(h.onTime.scopedAttemptsW4.lowerBound95OneSided) + '). With n = 3 the largest ' +
      'attainable lower bound is ' + f3(h.onTime.nativeW1.maximumPossibleLowerBound) + ': this statistic cannot approach 0.5 on this cohort ' +
      'and corroborates nothing about feasibility.', '');
    add('Pool (S5a): width ' + (h.pool ? h.pool.width : 'n/a') + ', peak active ' + (h.pool ? h.pool.peakActive : 'n/a') + '; attempts consumed ' +
      (h.pool ? h.pool.attemptsConsumed.join('/') : 'n/a') + ', started ' + (h.pool ? h.pool.attemptsStarted.join('/') : 'n/a') +
      ' (the difference is discarded speculative work, its CPU is in the totals); speculative attempts completed ' +
      (h.pool ? h.pool.speculativeCompleted : 'n/a') + '; duplicated model build ms ' + (h.pool ? h.pool.duplicatedModelBuildMs.join('/') : 'n/a') +
      '; requests above the 120 s application guard (native/pooled): ' + (h.above120s ? JSON.stringify(h.above120s) : 'n/a') +
      ' (a research observation, not an application pass).', '');
  });
  add('### S3: the implemented scope and its parity', '');
  add(rep.s3.scope, '');
  add(table(['finder', 'status', 'skipped scopes (audit)', 'virtual node checks (audit)'], rep.s3.finders.map(function (f) {
    return [f.id, f.status, f.skippedAudit, f.virtualNodeChecksAudit];
  })), '');
  add(rep.s3.parity, '');

  // --- 5. SM2 ----------------------------------------------------------------------------------------------------------------
  add('## 5. SM2: the frontier variants F0/F1/FC/FM/FU/FS and both native controls (two-sample grid trials, 8 clusters per cell)', '');
  add(rep.sm2.scope, '');
  rep.sm2.cells.forEach(function (c) {
    add('### ' + c.cell, '');
    add(table(['mode', 'trials', 'verified hits', 'ready CPU s', 'ready wall s', 'hits/CPU s', 'budget-ended', 'mean sample CPU ms', 'empty frontier',
      'floor tests', 'refused (ambiguous / stuck unique)', 'DFS entries', 'canonical rated', 'cand. exact/shallow/below/above', 'phase-A wall share'],
    c.modes.map(function (m) {
      const f = m.funnel;
      const n = m.native;
      return [m.mode, m.trials, m.verifiedHits, f3(m.readyCpuS), f3(m.readyWallS), f4(m.hitsPerCpuSecond), m.outcomes.budgetEnded,
        f2(m.meanSampleCpuMs), f ? f.emptyFrontierSamples : 'n/a', f ? f.floorTests : (n ? n.groupsTried + ' tried' : 'n/a'),
        f ? f.refusedAmbiguous + ' / ' + f.refusedStuckUnique : 'n/a', f ? f.dfsEntries : 'n/a', f ? f.canonicalRated : (n ? n.canonicalRatings : 'n/a'),
        f ? f.candidates.exact + '/' + f.candidates.shallow + '/' + f.candidates.below + '/' + f.candidates.above :
          (n ? n.class.exact + '/' + n.class.shallow + '/' + n.class.below + '/' + n.class.above + ' (samples)' : 'n/a'),
        f && f.phaseWallShare ? pct(f.phaseWallShare.phaseA) : 'n/a'];
    })), '');
    const r = c.f1SampleCostVsNative;
    add('F1 mean sample CPU ' + f2(r.f1MeanSampleCpuMs) + ' ms against ordinary ' + f2(r.ordinaryMeanSampleCpuMs) + ' ms (x' + f2(r.f1OverOrdinary) +
      ') and proposal ' + f2(r.proposalMeanSampleCpuMs) + ' ms (x' + f2(r.f1OverProposal) + '); equal-weight mix x' + f2(r.f1OverEqualWeightMix) +
      ' (' + r.label + '). Selection: ' + c.selection.selected + ' (' + (c.selection.winner ? 'winner' : 'explicitly non-winning diagnostic default, ' +
      c.selection.reason) + '). Finding: ' + c.finding, '');
  });
  add('**S1: sample cost and yield, kept apart.** Cost: F1 sample CPU over the equal-weight native mix of the same grids is ' +
    rep.sm2.cells.map(function (c) { return c.cell + ' x' + f2(c.s1CostVsYield.cost.f1OverEqualWeightMix); }).join(', ') + '. The planning expectation was a near-' +
    'constant per-sample cost (report.md:35-36, 108); it was not observed for this prototype and cohort. The cheap work is attributable to unsuccessful, ' +
    'empty or above-band outcomes; yield is a separate question and remains inconclusive.', '');
  add(table(['cell', 'F1 mean sample CPU ms', 'equal-weight mix ms', 'F1 / mix', 'planning expectation (divisor)', 'samples', 'empty unique frontier', 'exact / shallow / below candidates',
    'above-band candidates', 'count-budget stops', 'verified hits (F1 / all modes)', 'cost per verified exact puzzle'], rep.sm2.cells.map(function (c) {
    const s = c.s1CostVsYield;
    const o = s.outcomesOfTheCheapWork;
    return [c.cell, f2(s.cost.f1MeanSampleCpuMs), f2(s.cost.equalWeightMixMeanSampleCpuMs), f2(s.cost.f1OverEqualWeightMix),
      s.cost.planningDivisor, o.samples, o.emptyUniqueFrontier,
      o.candidatesExact + ' / ' + o.candidatesShallow + ' / ' + o.candidatesBelow, o.candidatesAboveBand, o.budgetStopSamples,
      s.yield.f1VerifiedHits + ' / ' + s.yield.allModesVerifiedHits, 'unestablished (no verified hit)'];
  })), '');
  add('Native sample mix: ' + rep.sm2.cells[0].f1SampleCostVsNative.label + '. Observed in the profiled SM1 requests (ordinary / proposal samples): ' +
    rep.sm2.sampleMixInSm1.map(function (m) { return m.key.split('/')[2] + ' ' + m.ordinarySamples + ' / ' + m.proposalSamples; }).join('; ') + '.', '');
  const s2Ratios = rep.sm2.cells.map(function (c) { return c.s2Isolated.f1OverF0MeanSampleCpu; });
  add('**S2 isolated: F0 versus F1.** Statistic: the ratio of the mean sample CPU of F1 over F0 on the same samples; paired population: ' +
    rep.sm2.cells[0].s2Isolated.pairedPopulation + '. F1/F0 CPU is ' + f2(Math.min.apply(null, s2Ratios)) + '-' + f2(Math.max.apply(null, s2Ratios)) +
    ': no CPU saving on this cohort. Correctness and deduction-saving evidence is reported separately and the result is not generalised to "S2 never helps".', '');
  add(table(['cell', 'F0 mean sample CPU ms', 'F1 mean sample CPU ms', 'F1 / F0 (mean sample CPU)', 'F1 / F0 (ready CPU, cluster totals)', 'paired per-cluster ready-CPU ratio: median (min-max)',
    'same decisions in F0 and F1', 'F1 accepted by re-derivation / all accepted', 'F0 accepted by full proof'], rep.sm2.cells.map(function (c) {
    const s = c.s2Isolated;
    const d = s.deductionSaving;
    return [c.cell, f2(s.f0MeanSampleCpuMs), f2(s.f1MeanSampleCpuMs), f3(s.f1OverF0MeanSampleCpu), f3(s.f1OverF0ReadyCpuOfClusterTotals),
      f2(s.pairedClusterReadyCpuRatio.median) + ' (' + f2(s.pairedClusterReadyCpuRatio.min) + '-' + f2(s.pairedClusterReadyCpuRatio.max) + ')', s.sameDecisions,
      d.f1AcceptedByRederivation + ' / ' + (d.f1AcceptedByRederivation + d.f1AcceptedByFullProof) + ' (' + pct(d.rederivationShareOfF1Accepted) + ')',
      d.f0AcceptedByFullProof];
  })), '');
  add('Outcomes over ' + rep.sm2.trialsObserved + ' trials: ' + JSON.stringify(rep.sm2.outcomes) + '; verified hits ' + rep.sm2.verifiedHits + '. Intervals: ' +
    rep.sm2.intervals.reading + ' (' + rep.sm2.intervals.degenerate + ' of ' + rep.sm2.intervals.rows + ' rows). S2 audit (pilot): ' + JSON.stringify(rep.sm2.s2Audit) +
    '. Held-out: ' + rep.sm2.heldOut + '.', '');
  add('Pilot (IG-S04, a separate dataset: ' + rep.sm2.pilot.scope + ') budgets frozen as hash ' + short(rep.sm2.pilot.budgetsHash, 16) + ': ' +
    rep.sm2.pilot.budgets.map(function (b) { return b.cell + ' ' + b.status; }).join(', ') + '. Two-grid fits are experimental limits, not tail guarantees.', '');
  rep.sm2.problems.forEach(function (x) { add('- ' + x); });
  add('');

  // --- 6. composition ----------------------------------------------------------------------------------------------------------
  add('## 6. Composition (IG-S06): deferred, unmeasured', '');
  rep.composition.lines.forEach(function (x) { add('- ' + x); });
  add('');

  // --- 7. SM1 -----------------------------------------------------------------------------------------------------------------
  add('## 7. SM1: stage and finder profiles (n = 1 per cell, instrumented; attribution, not timing evidence)', '');
  add(rep.sm1.scope, '');
  add(table(['request', 'sample share', 'local share', 'other', 'solver / root', 'covered finders / root', 'remaining finders / root', 'chain group / root',
    'no covered-finder time', 'no negative calls (covered)', 'no negative calls (remaining; w/o chains)', 'measured partial S3 serial', 'profile / unprofiled ready'],
  rep.sm1.cells.map(function (c) {
    return [c.key.split('/').slice(1, 3).join(' '), pct(c.sampleShare), pct(c.localShare), pct(c.otherShare), pct(c.solverShareOfRoot),
      pct(c.finderCoveredShareOfRoot), pct(c.finderRemainingShareOfRoot), pct(c.chainGroupShareOfRoot), f3(c.scenarios.noCoveredFinderTime),
      f3(c.scenarios.noNegativeCallsCovered), f3(c.scenarios.noNegativeCallsRemaining) + ' (' + f3(c.scenarios.noNegativeCallsRemainingNonChain) + ')',
      c.scenarios.measuredPartialS3SerialFactor === null ? 'no row' : f3(c.scenarios.measuredPartialS3SerialFactor),
      c.overhead ? f3(c.overhead.readyWallRatio) : 'n/a'];
  })), '');
  add('Scenario columns are CONDITIONAL zero-cost figures of one profiled run (the named wall time set to zero), not ceilings of a full S3. ' +
    rep.sm1.counterLimitation + '.', '');
  rep.sm1.reading.forEach(function (x) { add('- ' + x); });
  add('');
  const wp = rep.withdrawnPremises;
  add('**Costing premises withdrawn** (' + wp.status + '): ' + wp.premises.join('; ') + '. SM1 observed (mean solves per ordinary sample, the four SM1 requests): ' +
    rep.sm1.solvesPerOrdinarySample.rows.filter(function (m) { return m.fourSm1Request; }).map(function (m) {
      return m.key.split('/')[2] + ' ' + f2(m.ordinaryMeanSolves); }).join(', ') + ' (about ' + rep.sm1.solvesPerOrdinarySample.min + '-' +
    rep.sm1.solvesPerOrdinarySample.max + '; source ' + rep.sm1.solvesPerOrdinarySample.source + '). ' + wp.boundReading + ' Affected passages: ' +
    wp.passages.map(function (p) { return p.document + ' ' + p.linesText; }).join('; ') + '.', '');

  // --- 8. SM3 -----------------------------------------------------------------------------------------------------------------
  const m3 = rep.sm3;
  add('## 8. SM3: bounded attribution of the Jigsaw Expert seed-1111 tail (censored)', '');
  add(m3.scope, '');
  add(table(['item', 'value'], [
    ['historical (uninstrumented, not remeasured)', m3.historical.totalSeconds + ' s (' + m3.historical.population + ')'],
    ['this run', m3.thisRun.outcome + ' (censored ' + m3.thisRun.censored + ', completed ' + m3.thisRun.completedRequest + ')'],
    ['wall lower bound / guard', f3(m3.thisRun.censoredLowerBoundWallS) + ' s / ' + m3.thisRun.guardS + ' s (' + m3.thisRun.guardScope + ')'],
    ['CPU lower bound', f2(m3.thisRun.censoredLowerBoundCpuS) + ' s'],
    ['control seed 1100', m3.control.key + ', identity ' + JSON.stringify(m3.control.identity && m3.control.identity.complete) + ', ready-wall factor ' + f2(m3.control.readyWallFactor) + ' (n = ' + m3.control.n + '), engine checks ' + m3.control.engineChecks]]), '');
  add(table(['stage', 'wall lower bound ms', 'share'], Object.keys(m3.stageLowerBounds).map(function (k) {
    return [k, f2(m3.stageLowerBounds[k].wallMsLowerBound), pct(m3.stageLowerBounds[k].share)];
  })), '');
  add(m3.reading, '');
  m3.impliesForS7.forEach(function (x) { add('- ' + x); });
  add('Unknown counters (never zero): ' + m3.unknownCounters.join('; ') + '.', '');

  // --- 9. Greater-Than ---------------------------------------------------------------------------------------------------------
  const gt = rep.gt;
  add('## 9. Greater-Than: exact miss split and physical work (IG-S09)', '');
  add(gt.scope, '');
  ['normal', 'nightmare'].forEach(function (lv) {
    const c = gt.cohorts[lv];
    add('### ' + lv + ' (' + c.pairs + ' of ' + c.pairsPlanned + ' pairs' + (c.pairs < c.pairsPlanned ? '; a partial, budget-limited cohort: the recorded requests completed, ' +
      (c.pairsPlanned - c.pairs) * 2 + ' rows were unstarted' : '') + ')', '');
    add(table(['seed', 'G0 ready s', 'G1 ready s', 'G0 CPU s', 'G1 CPU s', 'ready G0/G1', 'CPU G0/G1', 'exact G0/G1'], c.rows.map(function (r) {
      return [r.seed, f2(r.g0ReadyS), f2(r.g1ReadyS), f2(r.g0CpuS), f2(r.g1CpuS), f3(r.readyRatioG0OverG1), f3(r.cpuRatioG0OverG1),
        (r.g0VerifiedExact ? 'yes' : 'no') + ' / ' + (r.g1VerifiedExact ? 'yes' : 'no')];
    })), '');
    add('Ratio of cohort totals (G0 / G1; below 1 means G1 took longer): ready wall ' + f3(c.readyRatioOfTotalsG0OverG1) + ' [' +
      f3(c.intervals.readyRatioOfTotals.ci95[0]) + ', ' + f3(c.intervals.readyRatioOfTotals.ci95[1]) + '], CPU ' + f3(c.cpuRatioOfTotalsG0OverG1) + ' [' +
      f3(c.intervals.cpuRatioOfTotals.ci95[0]) + ', ' + f3(c.intervals.cpuRatioOfTotals.ci95[1]) + '] (descriptive, whole pairs resampled); paired median ' +
      'ready ratio ' + f3(c.pairedMedianReadyRatio) + '.', '');
    const sp = c.missSplit.g0;
    add('Miss split (identical in G0 and G1): ' + JSON.stringify(sp.buckets) + '; misses ' + sp.misses + '; named trap ' + sp.trapProven + ' (lower share ' +
      sp.trapLowerShareOfMisses.numerator + '/' + sp.trapLowerShareOfMisses.denominator + '); minimality decided ' + sp.minimalityCoverage.decided + '/' +
      sp.minimalityCoverage.requiredForTrap + '; trap unknown ' + sp.trapUnknown + '. Local stage of engine wall: G0 ' +
      pct(c.localStage.g0.measuredLocalStageShareOfAllRequestTime.share) + ', G1 ' + pct(c.localStage.g1.measuredLocalStageShareOfAllRequestTime.share) +
      '; request-group share of capped-local requests (G0) ' + pct(c.localStage.g0.requestGroupShareOfTimeOfRequestsWithACappedLocal.share) + '.', '');
  });
  add('Physical work of the first technique pass:', '');
  add(table(['cohort', 'dfsCalls G0', 'dfsCalls G1', 'saved by skips', 'restricted solves G0', 'restricted solves G1', 'extra solves on count-rejected candidates', 'wall G0 ms', 'wall G1 ms', 'reading'],
    gt.physicalDifference.map(function (d) {
      const w = d.firstTechniquePass;
      return [d.cohort, w.dfsCallsG0, w.dfsCallsG1, w.dfsCallsSavedBySkips, w.restrictedSolvesG0, w.restrictedSolvesG1, w.solvesOnCandidatesTheCountRejectsG1,
        w.wallMsG0, w.wallMsG1, d.regression];
    })), '');
  add('**Counter erratum applied.** ' + gt.counterErratum.applied + '. Units: dfsCalls = ' + gt.counterErratum.units.dfsCalls + '; dfsChecks = ' +
    gt.counterErratum.units.dfsChecks + '; restrictedSolves = ' + gt.counterErratum.units.restrictedSolves + '; node entries and solver budget checks: ' +
    gt.counterErratum.units.nodeEntries + '. Record check: ' + gt.counterErratum.check.countsDfsEntriesEqualsCountSolutionsCalls + ' of ' +
    gt.counterErratum.check.recordsWithACapture + ' records.', '');
  add('Setup probes (after timing, the first missed sample of each request, at most three above-floor groups): **' + gt.probes.executedGroupChecks +
    ' executed group checks** plus **' + gt.probes.reusedRows + ' reused rows** (' + gt.probes.listedRows + ' listed; never 30 independent executions); ' +
    gt.probes.requestsThatExecuted + ' requests executed a probe, ' + gt.probes.requestsThatReused + ' reused one. ' + gt.cpuBasis + '.', '');
  add('Unstarted (eight rows, both arms; no catch-up run): ' + gt.unstarted.join(', ') + '.', '');
  add('Observer controls (two singletons, time-separated; compatible with the captured G0; no population-wide overhead claim): ' +
    gt.observerControls.map(function (o) { return o.level + ' ' + o.seed + ': captured G0 / observer-free ready wall x' + f3(o.readyWallRatioG0OverControl) +
      ', CPU x' + f3(o.cpuRatioG0OverControl) + ' (compatible ' + o.compatible + ')'; }).join('; ') + '.', '');

  // --- 10. gate ---------------------------------------------------------------------------------------------------------------
  const g = rep.gate;
  add('## 10. The gate (provisional report)', '');
  add('State: **' + g.state + '**. Formal gate enabled: ' + g.formalGateEnabled + '; formal verdict: ' + (g.formalVerdict === null ? 'none' : g.formalVerdict) +
    '; projection: **' + g.projection + '**. Decision owner: ' + g.decisionOwner + '. ' + g.reasons.join(' '), '');
  add('The real gate document stays `not-evaluable-pre-freeze`: pre-freeze observations are descriptive and cannot enable a cell, select ' +
    'an allowance, change a default or authorise the bank route. The frozen-gate evaluator (`gate.cjs`) was exercised on ' +
    'SYNTHETIC 40-cluster fixtures only (' + rep.tests.gate.passed + ' of ' + rep.tests.gate.total + ' cases passed in the run that wrote this document); its statistics are not a ' +
    'real frozen decision. Descriptive pre-freeze inputs per SM2 cell (verified hits per ready CPU and wall second):', '');
  add(table(['cell', 'clusters', 'modes with all trials', 'verified hits (every mode)', 'rates / paired intervals', 'selection'],
    Object.keys(g.descriptiveInputs).map(function (c) {
      const d = g.descriptiveInputs[c];
      const hits = Object.keys(d.verifiedHitsByMode).map(function (m) { return m + ' ' + d.verifiedHitsByMode[m]; }).join(', ');
      return [c, d.clusters, d.modesWithAllTrials, hits, d.ratesPerCpuAndWallSecond + ' / ' + d.paired,
        d.selection.selected + (d.selection.winner ? '' : ' (non-winning default: ' + d.selection.reason + ')')];
    })), '');

  // --- 11. machine -------------------------------------------------------------------------------------------------------------
  const mc = rep.machine;
  add('## 11. Machine accounting of the whole round', '');
  add('Final charge of the round: **' + f2(mc.chargedTotalS) + ' s** (' + mins(mc.chargedTotalS * 1000) + ') of the ' + mc.ceilingS + ' s (180 min) ceiling; ' +
    'unused **' + f2(mc.unusedOfCeilingS) + ' s**. It is ' + mc.wrappedCommands + ' wrapped commands (' + mc.ledgerEntries + ' ledger entries, including ' +
    'IG-S10\'s own, entry 71, ' + f2(mc.chargedIgS10S) + ' s, and ' + mc.evidenceOnlyCommands + ' commands the ledger does not reference: charged once, the ' +
    'IG-S09 dev check among them) = ' + f2(mc.chargedWrappedS) + ' s (' + f2(mc.chargedWrappedBeforeIgS10S) + ' s before IG-S10; occupied ' + f2(mc.occupiedS) +
    ' s + charged grace ' + f2(mc.chargedGraceS) + ' s), plus the manual adjustment' + (mc.manualAdjustments.length === 1 ? '' : 's') + ' listed apart: ' +
    mc.manualAdjustments.map(function (a) { return a.task + ' ' + f3(a.chargedS) + ' s, grace ' + a.graceS + ' s (' + a.rule + ')'; }).join('; ') + '. ' +
    'Priority waits are excluded from every charge: **' + f3(mc.priorityWaitKnownS) + ' s known** (ledger entries ' + f3(mc.priorityWaitKnownLedgerOnlyS) +
    ' s + auxiliary command receipts ' + f3(mc.priorityWaitKnownAuxiliaryReceiptsS) + ' s); ' + mc.commandsWithUnknownWait + ' commands have no wait on record ' +
    '(two IG-S01 evidence-only commands and the IG-S09 dev-check: unknown, not 0).', '');
  add(table(['task', 'allocation s', 'approved s', 'commands', 'charged s', 'grace s', 'manual s', 'unused of allocation + approval s', 'known priority wait s', 'unknown waits', 'status'],
    mc.tasks.map(function (t) {
      return [t.task, t.allocationS, t.approvedS, t.commands, f3(t.chargedS), t.graceS, t.manualAdjustmentS, f2(t.unusedOfAllocationPlusApprovalS),
        f2(t.priorityWaitKnownS), t.commandsWithUnknownWait, t.status || ''];
    })), '');
  const beyond = mc.tasks.filter(function (t) { return t.chargedS > t.allocationS; });
  add('Approvals (extra time lifted by the orchestrator or the pack author): ' + mc.approvals.map(function (a) { return a.task + ' +' + a.extraS + ' s (used beyond the base allocation: ' +
    f2(a.usedBeyondBaseS) + ' s)'; }).join('; ') + '. Tasks that charged more than their base allocation: ' +
    (beyond.length ? beyond.map(function (t) { return t.task + ' (' + f2(t.chargedS - t.allocationS) + ' s over)'; }).join(', ') : 'none') + '.', '');

  // --- 12. frozen ----------------------------------------------------------------------------------------------------------------
  const fz = rep.frozen;
  add('## 12. The frozen rerun: proposal and the approvals it needs', '');
  add(fz.status, '');
  const pre = fz.prerequisites;
  add('**Prerequisite of every frozen command, before the table below (uncosted):** ' + pre.status + '.', '');
  pre.steps.forEach(function (x) { add(x.order + '. ' + x.what); });
  add('', pre.neverFallBack + '. Uncosted, approval-dependent work: ' + pre.uncostedApprovalDependentWork.join('; ') + '. ' + pre.costing + '.', '');
  add('Measurements the first round never made (explicit unmeasured rows of the estimate table; no run authorised):', '');
  fz.gaps.forEach(function (g) { add('- **' + g.id + '**: ' + g.what + '. Not the same as: ' + g.notTheSame + '. ' + g.status + '.'); });
  add('');
  add(table(['order', 'task', 'depends on', 'population', 'frozen keys', 'first round charged s', 'planning scenario charged s (low - admission plan / guard scenario)', 'commands (low - admission plan / guard scenario)'],
    fz.steps.map(function (s) {
      return [s.order, s.task, s.dependsOn.join('; ') || 'none', s.population, s.frozenKeys, s.firstRound, s.charged, s.commands];
    })), '');
  add('Each command is `' + fz.exampleCommand + '` (replace the task id; `-PlanOnly` shows the expanded cost before approval). ' + fz.totals.reading + '. Totals: tasks with a harness ' +
    mins(fz.totals.low) + ' to ' + mins(fz.totals.admissionPlan) + '. **Planning scenarios with incomplete upper bounds** (none is a guaranteed ceiling: validation, cleanup, ' +
    'diagnostics and retries are not all included): IG-S06 (unimplemented) ' + mins(fz.ig06.low) + ' (formula, ' + fz.ig06.commands.low + ' commands), ' +
    mins(fz.ig06.central) + ' (central, no saving credited, ' + fz.ig06.commands.central + ' commands), guard scenario ' + mins(fz.ig06.guardScenario) +
    ' (' + fz.ig06.commands.guardScenario + ' requests, each its own command at the 180 s request guard + 60 s validation guard + 45 s grace; omits the scheduler ' +
    'tests, re-projection and pool-invariance checks, cleanup beyond the guards and retries); the four extensions ' + mins(fz.extensions.combined) + ' central, ' +
    mins(fz.extensions.combinedBand.low) + ' to ' + mins(fz.extensions.combinedBand.high) + ' (proxy-based, very low confidence). Four-cell frozen request ' +
    'population: two modes x 40 requests, 320 requests, not four modes.', '');
  add('IG-S06 commands by phase (confirmatory + diagnostic; the phases cannot share an invocation): low ' + fz.ig06.commandsByPhase.low.confirmatory + ' + ' +
    fz.ig06.commandsByPhase.low.diagnostic + ', central ' + fz.ig06.commandsByPhase.central.confirmatory + ' + ' + fz.ig06.commandsByPhase.central.diagnostic + '.', '');
  add('The extension phases (pilot, SM2 screen, requests) cannot share an invocation across their dependency boundaries: each phase is at least one wrapped command ' +
    '(45 s grace each) and the counts are recomputed for every scenario (minimum central total ' + fz.extensions.minimumCommandsCentral.total + ' commands).', '');
  add(table(['extension (UNAPPROVED)', 'proxy (scale; statistic)', 'pilot 11,12 trials', 'SM2 101-140 trials', 'requests 201-240', 'commands low / central / high', 'central commands pilot + SM2 + requests', 'planning scenario charged s: central (low-high)'], fz.extensions.rows.map(function (e) {
    return [e.cell, e.proxy + ' (x' + e.proxyScale + '; ' + e.proxyStatistics + ')', 16, 320, 80, e.commands.low + ' / ' + e.commands.central + ' / ' + e.commands.high,
      e.commandsByPhase.pilot + ' + ' + e.commandsByPhase.sm2 + ' + ' + e.commandsByPhase.requests,
      Math.round(e.chargedMs / 1000) + ' (' + Math.round(e.band.low / 1000) + '-' + Math.round(e.band.high / 1000) + ')'];
  })), '');
  add('Approvals needed before any frozen run:', '');
  fz.approvals.forEach(function (a) { add('- **' + a.id + '** (' + a.who + '): ' + a.what); });
  add('', 'IG-S06: ' + fz.ig06.proposal, '');

  // --- 13. decisions -------------------------------------------------------------------------------------------------------------
  add('## 13. Remaining decisions for the plan author (Fable) and the pack author (Astra)', '');
  rep.decisions.forEach(function (d) { add('- **' + d.id + '** (' + d.to + '): ' + d.text); });
  add('');

  // --- 14. checks, deviations, limitations ------------------------------------------------------------------------------------------
  add('## 14. Cross-checks, tests, deviations and limitations', '');
  const bad = rep.crossChecks.filter(function (x) { return !x.ok; });
  add('Cross-checks of the recomputed raw-record values against the accepted summaries: ' + (rep.crossChecks.length - bad.length) + ' of ' + rep.crossChecks.length +
    ' agree' + (bad.length ? '; DISAGREE: ' + bad.map(function (x) { return x.id; }).join('; ') : '') + '. Tests run by the writer: reconciliation ' +
    rep.tests.reconcile.passed + '/' + rep.tests.reconcile.total + ', synthetic gate ' + rep.tests.gate.passed + '/' + rep.tests.gate.total + '.', '');
  rep.deviations.forEach(function (x) { add('- ' + x); });
  add('');
  add('Acceptance (self-assessed from the facts above; the orchestrator reviews):', '');
  add(table(['id', 'status', 'evidence'], rep.acceptance.map(function (a) { return [a.id, a.status, a.evidence]; })), '');
  if (rep.staleness) {
    add('## 15. ' + rep.staleness.title, '');
    rep.staleness.facts.forEach(function (x) { add('- ' + x); });
    add('', rep.staleness.reading, '', rep.staleness.compatibilitySmoke, '');
  }
  return C.normaliseText(L.join('\n'));
}

module.exports = { renderReport, table };
