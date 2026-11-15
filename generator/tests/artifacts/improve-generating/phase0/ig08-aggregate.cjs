'use strict';

/*
 * Task documents of IG-S08 (test side, provisional (pre-freeze), pre-MS07), from evidence only: no engine, no worker, no timing.
 * Reads the two shards (control, tail) of a round, recomputes the attribution of the tail request from its stage journal alone
 * (and checks it against the record's), and writes, once, into the task folder of the round:
 *
 *   tail-attribution.json   the attribution of the Jigsaw tail by stage and finder family, the censoring limits actually applied,
 *                           the lower bounds, the counter trajectory of the heartbeats and what stays unknown
 *   summary.json / .md      the whole task: historical 325.313 s against this run, the control, the overhead, the instrument and
 *                           recovery checks, the machine time, the acceptance criteria and the deviations
 *
 *   node ig08-aggregate.cjs --task=IG-S08 --round=provisional-r1 [--suffix=-r2] [--revision=<text>]
 *
 * A censored request is a lower bound at the limit actually applied: never a completed latency, never a pass, and no evidence that
 * a specific ceiling is safe. A counter the private source does not expose is unknown (null), never zero.
 */
const fs = require('fs');
const path = require('path');
const C = require('./common.cjs');
const R = require('./records.cjs');
const P = require('./jigsaw-profile.cjs');
const RUN = require('./ig08-run.cjs');
const PLAN = require('./plans/ig-s08.cjs');

const TASK = 'IG-S08';
const ALLOCATION_MS = require('./manifest.cjs').ALLOCATIONS_MS[TASK];
const HISTORICAL = Object.freeze({ totalSeconds: 325.313, population: 'I5 (n = 20 Jigsaw Expert requests in the report)',
  note: 'a separate, uninstrumented historical measurement whose machine and source version are not re-established here; the request was not retained ' +
    'and is not remeasured to completion (a 400 s command would break the 300 s ceiling); the other 19 requests took at most 2.438 s' });

function sec(ms) {
  return ms === null || ms === undefined ? 'n/a' : (Math.round(ms / 10) / 100).toFixed(2) + ' s';
}

function pct(x) {
  return x === null || x === undefined ? 'n/a' : (Math.round(x * 1000) / 10).toFixed(1) + ' %';
}

function clean(value) {
  return JSON.parse(JSON.stringify(value));
}

// --- evidence --------------------------------------------------------------------------------------------------------------------------

function readShard(repoRoot, round, shard) {
  const shardDir = R.shardDirOf(path.join(repoRoot, ...C.EVIDENCE_REL.split('/')), round, TASK, shard);
  const attempts = R.listAttempts(shardDir).filter(function (a) { return a.command !== null; });
  if (attempts.length === 0) return null;
  const last = attempts[attempts.length - 1];
  const recordsFile = path.join(last.dir, R.EVIDENCE_FILES.records);
  if (!fs.existsSync(recordsFile)) return null;
  const journalFile = path.join(last.dir, RUN.STAGE_JOURNAL);
  const syntheticFile = path.join(last.dir, RUN.SYNTHETIC_JOURNAL);
  return { shard: shard, dir: last.dir, attemptId: last.attemptId, attempts: attempts.map(function (a) { return a.attemptId; }),
    command: last.command, records: C.readJson(recordsFile).records,
    summary: fs.existsSync(path.join(last.dir, R.EVIDENCE_FILES.summary)) ? C.readJson(path.join(last.dir, R.EVIDENCE_FILES.summary)) : null,
    journalText: fs.existsSync(journalFile) ? fs.readFileSync(journalFile, 'utf8') : null,
    syntheticJournalText: fs.existsSync(syntheticFile) ? fs.readFileSync(syntheticFile, 'utf8') : null };
}

function readInput(repoRoot, round) {
  const roundDir = path.join(repoRoot, ...C.EVIDENCE_REL.split('/'), round);
  const ledgerFile = path.join(roundDir, 'ledger.json');
  return { round: round, control: readShard(repoRoot, round, PLAN.CONTROL_SHARD), tail: readShard(repoRoot, round, PLAN.TAIL_SHARD),
    ledger: fs.existsSync(ledgerFile) ? C.readJson(ledgerFile) : { entries: [], approvals: [] } };
}

// --- the attribution of the tail ------------------------------------------------------------------------------------------------------------

// The header fields `sample` and `kind` of the beacon keep the values of the last sample until the next one starts; they describe
// only the steps of a sample. The documents show them for those steps and nothing otherwise (the raw journal and records keep them).
const SAMPLE_STEPS = Object.freeze(['dig', 'rate', 'tune']);

function sampleScoped(step, value) {
  return step !== null && step !== undefined && SAMPLE_STEPS.indexOf(step) >= 0 ? value : null;
}

function heartbeatSeries(entries, key, techniques) {
  const family = P.familyOf(techniques || []);
  const partOf = function (sub) {
    const f = family(sub);
    return f.kind === 'finder' ? 'finder:' + f.id : f.kind;
  };
  return entries.filter(function (e) { return e.key === key && e.type === 'heartbeat'; }).map(function (e) {
    const s = e.summary;
    return { n: e.n, atMs: e.rel, cpuMs: e.cpuMs, context: s.ctxName, part: partOf(s.cell % P.SUBS), step: s.step, attempt: s.attempt,
      sample: sampleScoped(s.step, s.sample), kind: sampleScoped(s.step, s.kind),
      dfsNodes: s.totals.dfsNodes, dfsChecks: s.totals.dfsChecks, dfsBacktracks: s.totals.dfsBacktracks, gridSearches: s.totals.gridSearches,
      gridRestarts: s.totals.gridRestarts, layoutAttempts: s.globals.layoutAttempts || 0, samples: s.globals.samples || 0,
      finderCalls: s.finderCalls };
  });
}

/** A sampling view of the heartbeats: where the request was at each 5 s tick (context and part), counted. */
function tally(series) {
  const counts = new Map();
  series.forEach(function (s) {
    const key = s.context + ' / ' + s.part;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.entries()).map(function (e) { return { where: e[0], heartbeats: e[1] }; })
    .sort(function (a, b) { return b.heartbeats - a.heartbeats; });
}

function trend(series) {
  if (series.length < 2) return { moved: null, note: 'fewer than two heartbeats' };
  const a = series[series.length - 2];
  const b = series[series.length - 1];
  const fields = ['dfsNodes', 'dfsChecks', 'gridSearches', 'gridRestarts', 'layoutAttempts', 'samples', 'finderCalls'];
  const moved = fields.filter(function (f) { return b[f] > a[f]; });
  return { moved: moved.length > 0, fields: moved, lastIntervalMs: b.atMs - a.atMs,
    note: moved.length > 0 ? 'counters still moving in the last heartbeat interval' :
      'no counter moved in the last heartbeat interval: the work was inside a stretch of code without progress counters' };
}

/** The finished stages of the sequence by pipeline step: how many ran to the end and how long they took (the open one is not in it). */
function closedByStep(stages) {
  const out = {};
  stages.filter(function (s) { return s.closed; }).forEach(function (s) {
    if (!out[s.step]) out[s.step] = { count: 0, wallMs: 0, maxWallMs: 0 };
    out[s.step].count++;
    out[s.step].wallMs += s.wallMs;
    out[s.step].maxWallMs = Math.max(out[s.step].maxWallMs, s.wallMs);
  });
  return out;
}

/** The cost of the observation itself from the operations the beacon counted and the calibrated unit costs: an estimate, never a correction. */
function overheadEstimate(a, calibration) {
  if (!calibration || !Number.isFinite(calibration.enterLeavePairNs)) return null;
  const spans = a.contexts.reduce(function (s, c) { return s + c.bySub.reduce(function (t, b) { return t + b.calls; }, 0); }, 0);
  const t = a.counters.totals;
  const increments = t.dfsNodes + t.dfsChecks + t.dfsBacktracks + t.gridSearches + t.gridRestarts;
  const posted = a.markers ? a.markers.posted : 0;
  const ms = (spans * calibration.enterLeavePairNs + increments * calibration.counterIncrementNs + posted * calibration.markerPostNs) / 1e6;
  return { spans: spans, counterIncrements: increments, markersPosted: posted, estimatedMs: ms,
    shareOfObservedWall: a.beaconObservedMs > 0 ? ms / a.beaconObservedMs : null,
    note: 'calibrated unit costs (a micro-benchmark of the control command: ' + calibration.enterLeavePairNs.toFixed(0) + ' ns per span, ' +
      calibration.counterIncrementNs.toFixed(1) + ' ns per counter increment, the marker post without the thread hand-over) times the operations counted in the tail; ' +
      'the real cost of a call inside a hot loop can differ, and the tail\'s uninstrumented throughput was not measured, so the depth-first counts are counts ' +
      'of the instrumented search only. An estimate, never a correction' };
}

/**
 * What the full-grid counters cover. The beacon's counters are cumulative over the whole request, per context: the figures of the
 * fullGrid context span every full-grid stage entry (the finished ones and the open one). The full-grid counters are booked when a
 * search returns (completed searches only); the depth-first counters are live. What was observed for the open stage alone is its wall
 * time (the stage-open marker to the host's timeout instant), the entry of the unlimited last search (a marker) and the moment after
 * which no search returned (the heartbeats); its own node, backtrack and restart counts are unknown (no snapshot is taken at a
 * stage entry) and are not reconstructed.
 */
function fullGridScope(x) {
  const a = x.attribution;
  const rc = x.rc;
  const rows = a.counters.byContext.filter(function (e) { return e.stage === 'fullGrid'; });
  const sum = function (name) { return rows.reduce(function (s, e) { return s + e[name]; }, 0); };
  const stage = a.stages.find(function (s) { return s.stage === 'fullGrid'; });
  const entries = rc.stages.filter(function (s) { return s.step === 'fullGrid'; });
  const finished = x.closedByStep.fullGrid || { count: 0, wallMs: 0, maxWallMs: 0 };
  const open = entries.filter(function (s) { return !s.closed; }).pop() || null;
  const endEpoch = rc.final && Number.isFinite(rc.final.endEpochMs) ? rc.final.endEpochMs :
    (rc.lastHeartbeat && Number.isFinite(rc.lastHeartbeat.hostEpochMs) ? rc.lastHeartbeat.hostEpochMs : null);
  const marks = x.entries.filter(function (e) { return e.key === x.key && e.type === 'ev' && e.ev === 'grid-unlimited'; }).map(function (e) {
    const inOpen = open !== null && e.t >= open.openedAtMs;
    return { context: P.CTX_NAMES[e.ctx] || null, searchIndexInItsGenerateCall: e.searchAttempt, atEpochMs: e.t,
      msAfterTheOpenStageOpened: inOpen ? e.t - open.openedAtMs : null, inTheOpenStage: inOpen,
      runningAtLeastMs: inOpen && endEpoch !== null ? endEpoch - e.t : null };
  });
  const series = x.series;
  const last = series.length > 0 ? series[series.length - 1] : null;
  let unchanged = null;
  if (last) {
    let i = series.length - 1;
    while (i > 0 && series[i - 1].gridSearches === last.gridSearches) i--;
    unchanged = { completedSearches: last.gridSearches, scope: 'all contexts (the layout solvability check\'s searches included)', fromHeartbeat: series[i].n,
      atMs: series[i].atMs, toHeartbeat: last.n,
      note: 'no search returned between this heartbeat and the end of the observation (the unlimited-entry marker, when present, dates the start of the running search)' };
  }
  const openWall = open !== null && endEpoch !== null ? endEpoch - open.openedAtMs : null;
  return {
    scopeNote: 'cumulative figures span every full-grid stage entry of the request (finished and open) and, for the full-grid counters, count completed ' +
      'searches only (a search is booked when it returns, so the running search is in none of them); the depth-first counters are live and include the ' +
      'running search; per-attempt counts of nodes, backtracks and restarts are unknown',
    cumulativeOverAllFullGridStageEntries: { stageEntries: entries.length, finishedEntries: finished.count, openEntries: entries.length - finished.count,
      wallMsLowerBound: stage ? stage.wallMsLowerBound : 0, completedSearches: sum('gridSearches'), completedRestarts: sum('gridRestarts'),
      backtracksOfReturnedSearches: sum('gridBacktracks'), liveDfsNodes: sum('dfsNodes'), liveDfsChecks: sum('dfsChecks'),
      liveDfsBacktracks: sum('dfsBacktracks') },
    finishedStages: finished,
    openStage: open === null ? null : { attempt: open.attempt, openedAtEpochMs: open.openedAtMs, wallMsObserved: openWall,
      wallSource: 'stage-open marker to the host\'s timeout instant', residualMsOfCumulativeWall: openWall === null || !stage ? null :
        Math.round((stage.wallMsLowerBound - finished.wallMs - openWall) * 1000) / 1000 },
    unlimitedLastSearch: marks,
    completedSearchesUnchanged: unchanged,
    perAttemptCounts: { searches: null, restarts: null, backtracks: null, dfsNodes: null, dfsBacktracks: null,
      why: 'unknown: the counters are cumulative per context and no snapshot is taken at a stage entry; for the open stage only its wall time, the ' +
        'unlimited-entry marker and the heartbeat observation above were recorded' }
  };
}

function readout(x) {
  const out = [];
  const a = x.attribution;
  if (!a) {
    out.push('Lack of attribution: no shared-memory read and no heartbeat survived; only the stage markers (if any) are known.');
    return out;
  }
  const stages = a.stages.slice().sort(function (p, q) { return q.wallMsLowerBound - p.wallMsLowerBound; });
  const top = stages[0];
  if (top) out.push('Dominant stage by wall lower bound: ' + top.stage + ' (' + sec(top.wallMsLowerBound) + ', ' + pct(top.share) + ' of the ' +
    sec(a.beaconObservedMs) + ' observed from engine start of the request).');
  const ctx = a.contexts[0];
  if (ctx) {
    const sub = ctx.bySub.slice().sort(function (p, q) { return q.ms - p.ms; })[0];
    out.push('Dominant context: ' + ctx.name + ' (' + sec(ctx.ms) + '); largest part inside it: ' + (sub.kind === 'finder' ? 'finder ' + sub.id +
      ' (' + sub.group + ')' : sub.kind) + ' ' + sec(sub.ms) + '.');
  }
  if (x.current) {
    const part = x.current.part;
    out.push('When the observation ended the request was in ' + x.current.stage + ' / ' + x.current.ctxName + ' (pipeline step ' + x.current.step +
      (x.current.attempt ? ', attempt ' + x.current.attempt : '') + (x.current.sample !== null ? ', sample ' + x.current.sample + ', kind ' + x.current.kind : '') +
      '), inside ' + (part.kind === 'finder' ? 'finder ' + part.id + ' (' + part.group + ')' : part.kind === 'own' ? 'its own code' : 'the ' + part.kind) +
      ', for at least ' + sec(x.current.inProgressMs) + ' since its last accounted segment.');
  } else {
    out.push('The request ended by itself inside the observation (state ' + a.state + ').');
  }
  const done = x.closedByStep || {};
  const doneMs = Object.keys(done).reduce(function (s, k) { return s + done[k].wallMs; }, 0);
  const doneCount = Object.keys(done).reduce(function (s, k) { return s + done[k].count; }, 0);
  if (doneCount > 0) {
    const fg = done.fullGrid;
    out.push('Before the stage that was still open, ' + doneCount + ' stage entries ran to the end and took ' + sec(doneMs) + ' in total' +
      (fg ? '; the ' + fg.count + ' finished full-grid stage(s) took ' + sec(fg.wallMs) + ' in total, the longest ' + sec(fg.maxWallMs) : '') + '.');
  }
  const l = a.layout;
  out.push('Layout (buildModel): ' + l.layoutAttempts + ' growth attempt(s), ' + l.layoutGrowthBacktracks + ' growth backtrack(s), ' + l.layoutLevels +
    ' open level(s), ' + l.layoutFeasibility + ' feasibility call(s); ' + l.layoutUnsolvable + ' dropped as unsolvable, ' + l.layoutHard +
    ' as too hard for the plain search; ' + (l.layoutAccepted === 1 ? 'a layout was accepted' : 'no layout accepted at the end of the observation') + '.');
  const sc = x.fullGridScope;
  if (sc) {
    const cum = sc.cumulativeOverAllFullGridStageEntries;
    out.push('Full-grid counters, cumulative over all ' + cum.stageEntries + ' full-grid stage entries (' + cum.finishedEntries + ' finished, ' + cum.openEntries +
      ' open): wall lower bound ' + sec(cum.wallMsLowerBound) + '; COMPLETED searches ' + cum.completedSearches + ' (' + cum.completedRestarts + ' restarts, ' +
      cum.backtracksOfReturnedSearches + ' backtracks of returned searches; the running search is in none of these three); LIVE depth-first counters, which ' +
      'include the running search: ' + cum.liveDfsNodes + ' nodes, ' + cum.liveDfsBacktracks + ' backtracks. Per-attempt counts are unknown.');
    if (sc.openStage) {
      const um = sc.unlimitedLastSearch.filter(function (m) { return m.inTheOpenStage; })[0];
      out.push('Open full-grid stage (attempt ' + sc.openStage.attempt + ') alone: wall observed >= ' + sec(sc.openStage.wallMsObserved) + ' (' + sc.openStage.wallSource +
        '); the ' + sc.finishedStages.count + ' finished full-grid stage(s) account for ' + sec(sc.finishedStages.wallMs) + ' of the cumulative wall' +
        (um ? '. Its unlimited last search was entered ' + sec(um.msAfterTheOpenStageOpened) + ' after the stage opened (marker: search index ' +
          um.searchIndexInItsGenerateCall + ' of its generate call) and was still running, for at least ' + sec(um.runningAtLeastMs) : '. No unlimited-entry marker was seen in it') + '.');
    }
    if (sc.completedSearchesUnchanged) {
      out.push('Completed searches (all contexts: the layout solvability check\'s searches included) stayed at ' + sc.completedSearchesUnchanged.completedSearches +
        ' from the heartbeat at ' + sec(sc.completedSearchesUnchanged.atMs) + ' (no. ' + sc.completedSearchesUnchanged.fromHeartbeat + ') to the end of the observation.');
    }
  } else {
    const l0 = a.layout;
    out.push('Full-grid stage: the unlimited last search was ' + (l0.gridUnlimitedEntered > 0 ? 'entered ' + l0.gridUnlimitedEntered + ' time(s)' : 'not entered') + '.');
  }
  const fg = a.finderGroups[0];
  if (fg) out.push('Largest finder family by time: ' + fg.group + ' (' + sec(fg.ms) + ', ' + fg.calls + ' calls, ' + fg.hits + ' hits); all finders ' +
    sec(a.finderGroups.reduce(function (s, g) { return s + g.ms; }, 0)) + ' of ' + sec(a.beaconObservedMs) + '.');
  out.push('Heartbeats: ' + x.trend.note + '.');
  return out;
}

function implications(x) {
  const out = [];
  const a = x.attribution;
  if (!a) return ['No attribution: no S7 piece can be named from this run.'];
  const where = x.current ? x.current.ctxName : (a.contexts[0] ? a.contexts[0].name : null);
  const topCtx = a.contexts[0] ? a.contexts[0].name : null;
  const sites = {
    'fullGrid': 'the full-grid search (generate: unlimited last search after the 50th restart; restarts keep forking `grid#a.k`): the ceiling on total restarts or work of IG-S-Q07 option (b)',
    'layout.growth': 'buildJigsaw (the layout growth does not receive the budget; it is bounded by 200 attempts of at most 60 backtracks)',
    'layout.solvable': 'buildJigsaw (the layout solvability check, bounded by 4000 nodes per attempt and at most 200 attempts)',
    'layout.plain': 'buildJigsaw (the plain-search check, bounded by 5000 nodes per attempt and at most 200 attempts)',
    'dig.safetyCount': 'the sample safety count `secureUniqueness` (no local ceiling; an over-ceiling count would reject the sample)',
    'dig.verify': 'the final count of the random dig (`countSolutions` without a ceiling)',
    'dig.oracle(stageA)': 'the stage A oracle (a uniqueness DFS per removal; no ceiling of the S7 list)',
    'dig.keeperCount': 'the keeper count (already bounded by UNIQUE_NODES)',
    'local.unique': 'the local search uniqueness count (already bounded by UNIQUE_NODES)'
  };
  const named = function (name) { return Object.prototype.hasOwnProperty.call(sites, name) ? sites[name] : null; };
  const seen = [];
  [where, topCtx].forEach(function (name) {
    if (name === null || seen.indexOf(name) >= 0) return;
    seen.push(name);
    const site = named(name);
    out.push(site ? 'Context ' + name + ' points at ' + site + '.' : 'Context ' + name + ' is not one of the S7 pieces named in the plan ' +
      '(full-grid restarts, safety count, Greater-Than signs, buildJigsaw): rating, oracle objective or local-search work is bounded by the existing caps, so ' +
      'an S7 ceiling of the listed kind would not bound it; the question for Astra is whether another piece belongs in S7.');
  });
  if (where === 'fullGrid' || topCtx === 'fullGrid') {
    const sc = x.fullGridScope;
    if (sc) {
      const cum = sc.cumulativeOverAllFullGridStageEntries;
      const um = sc.unlimitedLastSearch.filter(function (m) { return m.inTheOpenStage; })[0];
      out.push('What this one request offers for sizing a count-based full-grid ceiling, with its scope: ' + sc.finishedStages.count + ' finished full-grid stage(s) took ' +
        sec(sc.finishedStages.wallMs) + ' in total (the longest ' + sec(sc.finishedStages.maxWallMs) + ')' +
        (sc.openStage ? '; the open stage alone was observed for at least ' + sec(sc.openStage.wallMsObserved) + (um ? ', its unlimited last search for at least ' +
          sec(um.runningAtLeastMs) : '') : '') + '; the depth-first counts (' + cum.liveDfsNodes + ' nodes, ' + cum.liveDfsBacktracks + ' backtracks) are cumulative over ALL ' +
        cum.stageEntries + ' full-grid stage entries and come from the instrumented search, and ' + cum.completedSearches + ' searches had COMPLETED (the running one is not ' +
        'counted); no per-attempt node, backtrack or restart count exists. A single request gives no distribution per successful full-grid attempt, so no ceiling can ' +
        'be sized from it.');
    }
    if (x.censored && x.limitAppliedMs !== null && x.limitAppliedMs >= 120000) {
      out.push('The instrumented observation ran past 120 s without finishing. That does not establish this source\'s uninstrumented latency: the observation\'s overhead ' +
        'was measured once, on a different request (seed 1100, n = 1), and estimated from a micro-benchmark, and the tail\'s uninstrumented throughput was not measured. ' +
        'The historical uninstrumented 325.313 s (I5) is a separate risk statement, not re-established here. What either implies for the application\'s 120 s guard ' +
        'is not decided by this run.');
    }
  }
  if (x.censored) {
    out.push('The request was censored at ' + sec(x.limitAppliedMs) + ' (' + x.scope + '): this is a lower bound. It does not show how long the request takes, ' +
      'that the observed stage is the only expensive one, or that any particular S7 ceiling is safe or sufficient.');
  } else {
    out.push('The request completed inside the observation: the attribution is of a complete request on this source and machine; whether the historical ' +
      '325.313 s tail exists as a latency here is a result of this run, not a pass of any gate.');
  }
  out.push('No ceiling is chosen or tested here. A ceiling and its reaction need the separately designed experiment the task file names, after the frozen catalogue (MS07).');
  return out;
}

function buildAttribution(input, meta) {
  const tail = input.tail;
  const rec = tail ? tail.records.find(function (r) { return r.arm === 'prototype'; }) : null;
  const base = { schema: 'ig-s08-tail-attribution/1', task: TASK, round: input.round, evidenceStatus: C.EVIDENCE_PROVISIONAL,
    label: RUN.PRE_MS07, preMs07: true, provenance: RUN.PROVENANCE, revision: meta && meta.revision ? meta.revision : null,
    request: { variantId: 'jigsaw9', difficulty: 'expert', seed: PLAN.TAIL_SEED, config: PLAN.requestOf(PLAN.TAIL_SEED) },
    historical: HISTORICAL, unknownCounters: RUN.UNKNOWN_COUNTERS };
  if (!rec) return Object.assign(base, { thisRun: null, attribution: null, note: 'the tail shard has no record yet' });
  const parsed = P.parseJournal(tail.journalText || '');
  const rc = P.reconcileJournal(parsed.entries, rec.key);
  const full = RUN.attributionOf(rc);
  const a = full.attribution ? clean(full.attribution) : null;
  const recorded = rec.jigsaw && rec.jigsaw.attribution ? rec.jigsaw.attribution : null;
  const g = rec.generation;
  const censored = rec.outcome === 'request-timeout';
  const finished = rec.outcome === 'complete' || rec.outcome === 'validation-unknown';
  const series = heartbeatSeries(parsed.entries, rec.key, rc.begin && Array.isArray(rc.begin.techniques) ? rc.begin.techniques : []);
  const tr = trend(series);
  const closed = closedByStep(rc.stages);
  const current = a && a.current ? Object.assign({}, a.current, { sample: sampleScoped(a.current.step, a.current.sample),
    kind: sampleScoped(a.current.step, a.current.kind), attempt: a.current.attempt > 0 ? a.current.attempt : null }) : null;
  const thisRun = {
    key: rec.key, outcome: rec.outcome, censored: censored, completedRequest: finished,
    completedColdWallMs: finished ? g.coldWallMs : null, completedReadyWallMs: finished ? g.readyWallMs : null,
    censoredLowerBoundWallMs: censored ? g.coldWallMs : null, censoredLowerBoundCpuToTimeoutMs: censored ? g.cpuToDecisionMs : null,
    cpuTotalMs: g.cpuTotalMs, cpuResolutionStatus: g.cpuResolutionStatus, startupMs: g.startupMs, cleanupMs: g.cleanupMs,
    timeoutScope: rec.timeoutScope, limitAppliedMs: rec.limits ? (rec.jigsaw ? rec.jigsaw.limitAppliedMs : null) : null,
    guardMs: rec.limits ? rec.limits.guardMs : null, guardScope: rec.limits ? rec.limits.guardScope : null,
    commandDeadlineMs: rec.limits ? rec.limits.commandDeadlineMs : null,
    commandWindowRemainingAtSpawnMs: rec.jigsaw ? rec.jigsaw.commandWindowRemainingAtSpawnMs : null,
    verifiedExact: rec.verifiedExact, claimedExact: rec.claimedExact, puzzleHash: rec.puzzleHash,
    validation: rec.validation, attemptsUsed: rec.attemptsUsed,
    note: censored ? 'censored lower bound at the limit actually applied: not a completed latency, not a pass, not evidence that a specific S7 ceiling is safe' :
      (finished ? 'completed inside the observation; independently validated after the timed interval' : 'see outcome')
  };
  const x = { attribution: a, trend: tr, current: current, closedByStep: closed, censored: censored, limitAppliedMs: thisRun.limitAppliedMs,
    scope: rec.timeoutScope, rc: rc, entries: parsed.entries, key: rec.key, series: series };
  x.fullGridScope = a ? fullGridScope(x) : null;
  const calibration = input.control && input.control.summary && input.control.summary.extra ? input.control.summary.extra.calibration : null;
  return Object.assign(base, {
    thisRun: thisRun,
    attributionSource: full.source, attributedAtMs: full.atRelMs,
    attributionMatchesRecord: a && recorded ? C.digestOf(a) === C.digestOf(clean(recorded)) : null,
    markerAgreement: a ? RUN.agreement(rc, full.attribution) : null,
    stageLowerBounds: a ? a.stages : null,
    fullGridScope: x.fullGridScope,
    counterScopeNote: 'stage rows are cumulative over the whole request: the fullGrid row spans every full-grid stage entry. The grid searches/restarts/backtracks ' +
      'columns count COMPLETED searches (booked when a search returns); the dfs columns are LIVE and include a running search. Per-attempt counts are unknown.',
    currentStage: current,
    currentStageNote: 'sample and kind are shown only for the steps of a sample (dig, rate, tune): the beacon header keeps the previous sample\'s values ' +
      'until the next sample starts, so the raw journal and records show them (stale) for a full-grid entry',
    instrumentationOverheadEstimate: a ? overheadEstimate(a, calibration) : null,
    contexts: a ? a.contexts : null,
    finderFamilies: a ? a.finderGroups : null,
    finders: a ? a.finders : null,
    finderByStage: a ? a.finderByStage : null,
    nonFinderWallMs: a ? a.nonFinderWallMs : null,
    layout: a ? a.layout : null,
    counters: a ? a.counters : null,
    beaconObservedMs: a ? a.beaconObservedMs : null,
    unobservedMs: a && g.coldWallMs !== null ? Math.round((g.coldWallMs - a.beaconObservedMs) * 1000) / 1000 : null,
    unobservedNote: 'host cold wall minus the interval the beacon observed: the worker\'s startup and engine load before the beacon began (and, for a ' +
      'finished request, its teardown); the beacon books every millisecond it observed to a cell, so there is no other residual',
    heartbeatTrajectory: series, heartbeatTrend: tr, heartbeatSampling: tally(series),
    stageSequence: { columns: ['step', 'attempt', 'sample', 'kind', 'wallMs', 'closed'], rows: rc.stages.map(function (s) {
      return [s.step, s.attempt, s.sample, sampleScoped(s.step, s.kind), s.wallMs, s.closed];
    }), openAtEnd: rc.openStages.map(function (s) { return Object.assign({}, s, { kind: sampleScoped(s.step, s.kind) }); }), closedWallMsByStep: closed },
    journal: { file: RUN.STAGE_JOURNAL, lines: rc.lines, markers: rc.markers, heartbeats: rc.heartbeats, problems: rc.problems,
      truncatedLastLine: parsed.truncatedLastLine, unparsableLines: parsed.badLines, sha256OfItsLines: rec.stageJournal ? rec.stageJournal.sha256OfItsLines : null,
      layoutEvents: rc.layoutEvents.length },
    readout: readout(x),
    impliesForS7: implications(x)
  });
}

// --- the summary ---------------------------------------------------------------------------------------------------------------------------------

function ledgerView(input) {
  const entries = (input.ledger.entries || []).filter(function (e) { return e.task === TASK; });
  const charged = entries.reduce(function (s, e) { return s + (e.chargedMs || 0); }, 0);
  const occupied = entries.reduce(function (s, e) { return s + (e.occupiedMs || 0); }, 0);
  const waits = entries.reduce(function (s, e) { return s + (e.priorityWaitMs || 0); }, 0);
  const approvals = (input.ledger.approvals || []).filter(function (a) { return a.task === TASK; });
  const approved = approvals.reduce(function (s, a) { return s + (a.extraMs || 0); }, 0);
  return { entries: entries.map(function (e) {
    return { seq: e.seq, shard: e.shard, attemptId: e.attemptId, occupiedMs: e.occupiedMs, chargedGraceMs: e.chargedGraceMs, chargedMs: e.chargedMs,
      priorityWaitMs: e.priorityWaitMs, wrapperExit: e.wrapperExit, wrapperSeconds: e.wrapperSeconds, status: e.status, requestedAt: e.requestedAt,
      endedAt: e.endedAt };
  }), occupiedMs: occupied, chargedMs: charged, allocationMs: ALLOCATION_MS, approvedExtraMs: approved, remainingMs: ALLOCATION_MS + approved - charged,
  priorityWaitMs: waits, commands: entries.length };
}

function controlView(input) {
  const control = input.control;
  if (!control) return null;
  const ref = control.records.find(function (r) { return r.arm === 'reference'; }) || null;
  const proto = control.records.find(function (r) { return r.arm === 'prototype'; }) || null;
  const row = function (r) {
    return r ? { key: r.key, outcome: r.outcome, readyWallMs: r.generation.readyWallMs, coldWallMs: r.generation.coldWallMs,
      cpuTotalMs: r.generation.cpuTotalMs, cpuResolutionStatus: r.generation.cpuResolutionStatus, puzzleHash: r.puzzleHash,
      claimedExact: r.claimedExact, verifiedExact: r.verifiedExact, achieved: r.achieved, attemptsUsed: r.attemptsUsed,
      validation: r.validation, validationStatus: r.validationDetail ? r.validationDetail.status : null } : null;
  };
  const prepared = control.summary && control.summary.extra ? control.summary.extra : {};
  return { attemptId: control.attemptId, status: control.command.status, native: row(ref), observed: row(proto), identity: control.command.parity,
    overhead: prepared.overhead || null, calibration: prepared.calibration || null, engineChecks: prepared.engineChecks || null,
    syntheticRecovery: prepared.syntheticRecovery || null, firewallClean: control.command.firewallClean, sourceStable: control.command.sourceStable,
    harnessFingerprint: control.command.harnessFingerprint, runtimeFingerprint: control.command.runtimeFingerprint,
    adapterHashes: control.command.adapterHashes, timing: control.command.timing, observedAttribution: proto && proto.jigsaw ? proto.jigsaw.attribution : null };
}

function criteria(input, attribution, control, ledger) {
  const tailCmd = input.tail ? input.tail.command : null;
  const rec = attribution.thisRun;
  const a = attribution.stageLowerBounds;
  const wrapperOk = ledger.entries.length > 0 && ledger.entries.every(function (e) { return e.wrapperExit === 0 && (e.occupiedMs || 0) <= C.GUARDS.wrapperLimitMs; });
  const identityOk = control && control.identity && control.identity.complete === true;
  const rows = [];
  const add = function (id, status, evidence) { rows.push({ id: id, status: status, evidence: evidence }); };
  add('B01', a ? 'met' : 'met (lack of attribution is explicit)', a ? 'the tail is attributed to ' + (attribution.stageLowerBounds[0] ? 'observed stages (see the table); source ' +
    attribution.attributionSource : 'no stage') : 'no attribution survived: stated, not guessed');
  add('B02', rec ? 'met' : 'not evaluable', rec && rec.censored ? 'the request is recorded as a censored lower bound; summary.md and tail-attribution.json say it is not a pass, ' +
    'not a completed latency and not evidence for a specific ceiling' : 'the request completed or did not run; nothing is described as a pass of a gate');
  add('B03', wrapperOk && tailCmd && tailCmd.firewallClean === true ? 'met' : 'check', 'every command ran through the supplied low-priority wrapper (exit 0, at most 300 s); the production/test firewall was ' +
    (tailCmd ? 'clean: ' + tailCmd.firewallClean : 'not available') + '; priority waits are excluded from the charge');
  add('T01', control && control.syntheticRecovery && control.syntheticRecovery.ok === true && attribution.journal && attribution.journal.markers > 0 ? 'met' : 'check',
    'the synthetic busy-worker recovery test and the real journal (markers ' + (attribution.journal ? attribution.journal.markers : 'n/a') + ', heartbeats ' +
    (attribution.journal ? attribution.journal.heartbeats : 'n/a') + ', source ' + attribution.attributionSource + ')');
  add('T02', identityOk && control.firewallClean === true ? 'met' : 'check', 'control digests: ' + (control && control.identity ? control.identity.ok + ' identical, ' + control.identity.failed +
    ' different' : 'n/a') + '; no production restart, guard or RNG change (patched sources are private in-memory copies; hooks draw nothing)');
  add('T03', rec ? 'met' : 'not evaluable', rec && rec.censored ? 'timeout: no puzzle, no check result was invented (puzzle hash ' + rec.puzzleHash + ', exactness ' + rec.verifiedExact + ')' :
    'completed: independent validation ran (' + JSON.stringify(rec ? rec.validation : null) + ')');
  add('T04', a ? 'met' : 'partly', 'wall, CPU and counter lower bounds, the source identities and the unknown counters are listed in tail-attribution.json');
  return rows;
}

function buildSummary(input, attribution, meta) {
  const control = controlView(input);
  const ledger = ledgerView(input);
  const tailCmd = input.tail ? input.tail.command : null;
  const rec = attribution.thisRun;
  return {
    schema: 'ig-s08-summary/1', task: TASK, round: input.round, evidenceStatus: C.EVIDENCE_PROVISIONAL, label: RUN.PRE_MS07, preMs07: true,
    revision: meta && meta.revision ? meta.revision : null,
    notice: R.PROVISIONAL_NOTICE + ' Pre-MS07: the catalogue, floors and search may change when difficulty-v3 freezes.',
    formalGate: 'not-evaluable-pre-freeze (a diagnostic task, not a latency gate)',
    provenance: RUN.PROVENANCE,
    historical: HISTORICAL,
    thisRun: rec,
    comparison: rec ? { historicalSeconds: HISTORICAL.totalSeconds, thisRunCompletedSeconds: rec.completedColdWallMs === null ? null : rec.completedColdWallMs / 1000,
      thisRunCensoredLowerBoundSeconds: rec.censoredLowerBoundWallMs === null ? null : rec.censoredLowerBoundWallMs / 1000,
      note: 'the historical figure and this run are different measurements; a censored lower bound is never compared as if it were a latency' } : null,
    attributionSource: attribution.attributionSource, stageLowerBounds: attribution.stageLowerBounds, fullGridScope: attribution.fullGridScope,
    counterScopeNote: attribution.counterScopeNote, finderFamilies: attribution.finderFamilies,
    layout: attribution.layout, counters: attribution.counters ? attribution.counters.totals : null, unknownCounters: RUN.UNKNOWN_COUNTERS,
    readout: attribution.readout, impliesForS7: attribution.impliesForS7,
    control: control,
    machine: ledger,
    sources: tailCmd ? { runtimeLabel: tailCmd.runtimeLabel, runtimeFingerprint: tailCmd.runtimeFingerprint, harnessFingerprint: tailCmd.harnessFingerprint,
      adapterIds: tailCmd.adapterIds, adapterHashes: tailCmd.adapterHashes, sourceStable: tailCmd.sourceStable, firewallClean: tailCmd.firewallClean,
      node: tailCmd.machine ? tailCmd.machine.node : null, cpuModel: tailCmd.machine ? tailCmd.machine.cpuModel : null,
      logicalProcessors: tailCmd.machine ? tailCmd.machine.logicalProcessors : null, platform: tailCmd.machine ? tailCmd.machine.platform : null } : null,
    criteria: criteria(input, attribution, control, ledger),
    deviations: meta && meta.deviations ? meta.deviations : []
  };
}

// --- markdown ---------------------------------------------------------------------------------------------------------------------------------------

function cell(v) {
  if (v === null || v === undefined) return 'n/a';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : (Math.round(v * 1000) / 1000).toString();
  return String(v).replace(/\|/g, '\\|');
}

function table(headers, rows) {
  const out = ['| ' + headers.join(' | ') + ' |', '|' + headers.map(function () { return '---'; }).join('|') + '|'];
  rows.forEach(function (r) { out.push('| ' + r.map(cell).join(' | ') + ' |'); });
  return out.join('\n');
}

function renderMarkdown(summary, attribution) {
  const L = [];
  L.push('# IG-S08: bounded SM3 attribution of Jigsaw Expert seed 1111 (' + summary.round + (summary.revision ? ', ' + summary.revision : '') + ')', '');
  L.push('**' + summary.notice + '**', '');
  L.push('**' + summary.label + '.**', '');
  L.push('Formal gate: **' + summary.formalGate + '**. Evidence status: **' + summary.evidenceStatus + '**.', '');
  L.push('Provenance: harness base ' + summary.provenance.harnessBase + '; loop-test ' + summary.provenance.loopTestProvenance + '. Counter limitation: ' +
    summary.provenance.counterLimitation + '.', '');
  const r = summary.thisRun;
  L.push('## Result', '');
  if (!r) {
    L.push('The tail shard has no record.', '');
  } else {
    L.push(table(['item', 'value'], [
      ['request', 'jigsaw9, Expert, seed 1111, trace off, rotational180, random order, default options and attempts'],
      ['historical total (I5)', HISTORICAL.totalSeconds + ' s: ' + HISTORICAL.note],
      ['this run: outcome', r.outcome + (r.censored ? ' (CENSORED: a lower bound)' : '')],
      ['this run: completed latency (cold wall)', r.completedColdWallMs === null ? 'none: the request did not complete' : sec(r.completedColdWallMs)],
      ['this run: censored wall lower bound', r.censoredLowerBoundWallMs === null ? 'n/a' : '>= ' + sec(r.censoredLowerBoundWallMs)],
      ['this run: CPU lower bound (host process, to the timeout)', r.censoredLowerBoundCpuToTimeoutMs === null ? 'n/a' : '>= ' + sec(r.censoredLowerBoundCpuToTimeoutMs) +
        ' (' + r.cpuResolutionStatus + ')'],
      ['limit actually applied', r.limitAppliedMs === null ? 'n/a' : sec(r.limitAppliedMs) + ' from the request start, scope ' + r.timeoutScope + ' (guard ' + sec(r.guardMs) +
        ', ' + r.guardScope + '; command deadline ' + sec(r.commandDeadlineMs) + '; command window at spawn ' + sec(r.commandWindowRemainingAtSpawnMs) + ')'],
      ['worker startup (not in the attribution)', sec(r.startupMs)],
      ['puzzle / exactness', r.completedRequest ? 'hash ' + r.puzzleHash + '; verified exact ' + r.verifiedExact : 'none: nothing is invented for a censored request']]), '');
    L.push(r.note + '.', '');
  }
  L.push('## Attribution of the tail by stage (lower bounds)', '');
  L.push('Source of the attribution: **' + summary.attributionSource + '** (marker/shared-memory agreement: ' + attribution.markerAgreement + '; matches the record: ' +
    attribution.attributionMatchesRecord + '). Observed by the beacon: ' + sec(attribution.beaconObservedMs) + '; unobserved (worker startup and engine load): ' +
    sec(attribution.unobservedMs) + '.', '');
  if (summary.stageLowerBounds) {
    L.push(table(['stage', 'wall lower bound', 'share', 'dfs nodes (live)', 'dfs checks (live)', 'dfs backtracks (live)', 'completed grid searches',
      'completed grid restarts', 'grid backtracks of returned searches'], summary.stageLowerBounds.map(function (s) {
      return [s.stage, sec(s.wallMsLowerBound), pct(s.share), s.counters.dfsNodes, s.counters.dfsChecks, s.counters.dfsBacktracks, s.counters.gridSearches,
        s.counters.gridRestarts, s.counters.gridBacktracks];
    })), '');
    L.push('Counter scope: every row is cumulative over the whole request, so the fullGrid row spans every full-grid stage entry (finished and open), not the open ' +
      'attempt alone; the grid columns count COMPLETED searches (a search is booked when it returns, so a running search is in none of them); the dfs columns are ' +
      'LIVE and include a running search. Per-attempt counts are unknown.', '');
    if (attribution.fullGridScope) {
      const sc = attribution.fullGridScope;
      const cum = sc.cumulativeOverAllFullGridStageEntries;
      L.push('Full-grid scope (cumulative versus the open stage, completed versus active searches):', '');
      const rows = [['cumulative: all ' + cum.stageEntries + ' full-grid stage entries (' + cum.finishedEntries + ' finished, ' + cum.openEntries + ' open)',
        sec(cum.wallMsLowerBound), cum.completedSearches, cum.completedRestarts, cum.backtracksOfReturnedSearches, cum.liveDfsNodes, cum.liveDfsBacktracks]];
      rows.push(['finished stage entries (' + sc.finishedStages.count + '; the longest ' + sec(sc.finishedStages.maxWallMs) + ')', sec(sc.finishedStages.wallMs),
        'unknown', 'unknown', 'unknown', 'unknown', 'unknown']);
      if (sc.openStage) {
        rows.push(['open stage entry (attempt ' + sc.openStage.attempt + ')', '>= ' + sec(sc.openStage.wallMsObserved), 'unknown (1 active)', 'unknown', 'unknown', 'unknown', 'unknown']);
      }
      L.push(table(['scope', 'wall', 'completed searches', 'completed restarts', 'backtracks of returned searches', 'live dfs nodes', 'live dfs backtracks'], rows), '');
      sc.unlimitedLastSearch.forEach(function (m) {
        L.push('Unlimited last search marker: context ' + m.context + ', search index ' + m.searchIndexInItsGenerateCall + ' of its generate call' + (m.inTheOpenStage ?
          ', entered ' + sec(m.msAfterTheOpenStageOpened) + ' after the open stage opened, running for at least ' + sec(m.runningAtLeastMs) : ', in a stage that finished') + '.', '');
      });
      if (sc.completedSearchesUnchanged) {
        L.push('Completed searches (' + sc.completedSearchesUnchanged.scope + ') stayed at ' + sc.completedSearchesUnchanged.completedSearches + ' from heartbeat no. ' +
          sc.completedSearchesUnchanged.fromHeartbeat + ' (' + sec(sc.completedSearchesUnchanged.atMs) + ') to the end. ' + sc.perAttemptCounts.why + '.', '');
      }
    }
    L.push('Top contexts (exclusive wall; the sub-columns separate the finder, solver, rating, depth-first and grid-generator parts):', '');
    L.push(table(['context', 'stage', 'wall', 'entries', 'largest part'], attribution.contexts.slice(0, 10).map(function (c) {
      const sub = c.bySub.slice().sort(function (p, q) { return q.ms - p.ms; })[0];
      return [c.name, c.stage, sec(c.ms), c.entries, (sub.kind === 'finder' ? 'finder ' + sub.id : sub.kind) + ' ' + sec(sub.ms)];
    })), '');
    L.push('Finder families (time, calls, hits; all stages):', '');
    L.push(table(['family', 'wall', 'calls', 'hits'], (summary.finderFamilies || []).map(function (g) { return [g.group, sec(g.ms), g.calls, g.hits]; })), '');
    L.push('Non-finder wall by kind (ms): ' + JSON.stringify(attribution.nonFinderWallMs) + '.', '');
    if (attribution.stageSequence) {
      const seq = attribution.stageSequence;
      L.push('Stage sequence from the markers (' + seq.rows.length + ' stage entries, the last 12 below; finished stages by step: ' +
        JSON.stringify(seq.closedWallMsByStep) + '):', '');
      L.push(table(['step', 'attempt', 'sample', 'kind', 'wall', 'finished'], seq.rows.slice(-12).map(function (s) {
        return [s[0], s[1], s[2], s[3], s[4] === null ? 'running at the end' : sec(s[4]), s[5]];
      })), '');
    }
    if (attribution.heartbeatTrajectory && attribution.heartbeatTrajectory.length > 0) {
      L.push('Heartbeat samples (the host reads the shared memory every ' + sec(RUN.HEARTBEAT_MS) + '; ' + attribution.heartbeatTrajectory.length +
        ' reads; where the request was at each tick, counted): ' + JSON.stringify(attribution.heartbeatSampling) + '.', '');
      const hb = attribution.heartbeatTrajectory;
      const rows = hb.length <= 24 ? hb : hb.filter(function (_s, i) { return i % Math.ceil(hb.length / 24) === 0 || i === hb.length - 1; });
      L.push(table(['at', 'cpu', 'context / part', 'step', 'attempt', 'sample', 'dfs nodes (live, cumulative)', 'dfs backtracks (live, cumulative)',
        'completed grid searches (all contexts)', 'completed grid restarts (all contexts)', 'layout attempts', 'finder calls'], rows.map(function (s) {
        return [sec(s.atMs), sec(s.cpuMs), s.context + ' / ' + s.part, s.step, s.attempt, s.sample, s.dfsNodes, s.dfsBacktracks, s.gridSearches, s.gridRestarts,
          s.layoutAttempts, s.finderCalls];
      })), '');
    }
  }
  L.push('## Counters', '');
  if (summary.layout) L.push('Layout: ' + JSON.stringify(summary.layout) + '.', '');
  if (summary.counters) L.push('Depth-first and grid totals over the whole request (the dfs figures are live, the grid figures count completed searches only): ' + JSON.stringify(summary.counters) + '.', '');
  const oe = attribution.instrumentationOverheadEstimate;
  if (oe) {
    L.push('Instrumentation overhead estimate for the tail: ' + oe.spans + ' spans, ' + oe.counterIncrements + ' counter increments and ' + oe.markersPosted +
      ' markers are about ' + cell(oe.estimatedMs) + ' ms (' + pct(oe.shareOfObservedWall) + ' of the observed wall). ' + oe.note + '.', '');
  }
  L.push('Unknown (never zero):', '');
  summary.unknownCounters.forEach(function (u) { L.push('- ' + u.counter + ': ' + u.why); });
  L.push('', '## Reading', '');
  (summary.readout || []).forEach(function (s) { L.push('- ' + s); });
  L.push('', '## What it implies for S7 and the ceilings', '');
  (summary.impliesForS7 || []).forEach(function (s) { L.push('- ' + s); });
  const c = summary.control;
  L.push('', '## Control (Jigsaw Expert seed 1100)', '');
  if (c) {
    L.push('Command status ' + c.status + '; identity of the observed request against the native one: ' + (c.identity ? c.identity.ok + ' identical, ' + c.identity.failed + ' different, ' +
      c.identity.notComparable + ' not comparable' : 'n/a') + '.', '');
    L.push(table(['arm', 'outcome', 'ready wall', 'cold wall', 'cpu', 'puzzle hash', 'verified exact', 'validation'], [c.native, c.observed].filter(Boolean).map(function (x, i) {
      return [i === 0 ? 'native (unobserved)' : 'observed (beacon)', x.outcome, sec(x.readyWallMs), sec(x.coldWallMs), sec(x.cpuTotalMs), x.puzzleHash, x.verifiedExact, x.validationStatus];
    })), '');
    if (c.overhead) {
      L.push('Instrumentation overhead on seed 1100 (n = 1): ready-wall factor ' + cell(c.overhead.readyWallFactor) + ', cold-wall factor ' + cell(c.overhead.coldWallFactor) +
        ', CPU factor ' + cell(c.overhead.cpuFactor) + '. ' + c.overhead.note + (c.overhead.estimate ? ' Operation-count estimate: ' + c.overhead.estimate.spans + ' spans, ' +
          c.overhead.estimate.counterIncrements + ' counter increments, ' + c.overhead.estimate.markersPosted + ' markers = about ' + cell(c.overhead.estimate.estimatedMs) +
          ' ms (' + pct(c.overhead.estimate.shareOfObservedWall) + ' of the observed wall).' : ''), '');
    }
    if (c.engineChecks) L.push('Engine checks of the instrument (real engine, first command): ' + c.engineChecks.passed + '/' + c.engineChecks.total + ' passed.', '');
    if (c.syntheticRecovery) {
      L.push('Synthetic short-timeout journal recovery test (busy worker, test-only host, guard ' + sec(c.syntheticRecovery.guardMs) + '): ' +
        c.syntheticRecovery.checks.filter(function (k) { return k.ok; }).length + '/' + c.syntheticRecovery.checks.length + ' checks passed.', '');
    }
  } else {
    L.push('The control shard has no record.', '');
  }
  const m = summary.machine;
  L.push('## Machine time', '');
  L.push(table(['command', 'attempt', 'occupied', 'charged (occupied + 45 s grace)', 'priority wait (not charged)', 'status'], m.entries.map(function (e) {
    return [e.shard, e.attemptId, sec(e.occupiedMs), sec(e.chargedMs), sec(e.priorityWaitMs), e.status];
  })), '');
  L.push('Charged ' + sec(m.chargedMs) + ' of the ' + sec(m.allocationMs) + ' allocation (approved extra ' + sec(m.approvedExtraMs) + '); remaining ' + sec(m.remainingMs) +
    '; priority waits ' + sec(m.priorityWaitMs) + '.', '');
  L.push('## Acceptance criteria', '');
  L.push(table(['id', 'status', 'evidence'], summary.criteria.map(function (k) { return [k.id, k.status, k.evidence]; })), '');
  if (summary.sources) {
    L.push('## Sources', '');
    L.push(table(['item', 'value'], [['runtime label (supplied)', summary.sources.runtimeLabel], ['runtime fingerprint', summary.sources.runtimeFingerprint],
      ['harness fingerprint (this task\'s commands)', summary.sources.harnessFingerprint], ['adapters', (summary.sources.adapterIds || []).join(', ')],
      ['adapter hashes', (summary.sources.adapterHashes || []).join(', ')], ['sources stable', summary.sources.sourceStable], ['firewall clean', summary.sources.firewallClean],
      ['node', summary.sources.node], ['platform', summary.sources.platform], ['cpu', summary.sources.cpuModel + ' (' + summary.sources.logicalProcessors + ' logical processors)']]), '');
  }
  if (summary.deviations.length > 0) {
    L.push('## Deviations and disclosures', '');
    summary.deviations.forEach(function (d) { L.push('- ' + d); });
    L.push('');
  }
  return C.normaliseText(L.join('\n'));
}

function documents(input, meta) {
  const attribution = buildAttribution(input, meta);
  const summary = buildSummary(input, attribution, meta);
  return { attribution: attribution, summary: summary, markdown: renderMarkdown(summary, attribution) };
}

// --- tests (registered by ig08-test.cjs) --------------------------------------------------------------------------------------------------------------------

function registerTests(t) {
  const fixtures = function () {
    const key = 'IG-S08/tail/jigsaw9:expert:1111/profiled';
    const k = t.fakeClock(100);
    const f = t.fakeBeacon(k);
    f.beacon.begin();
    let tok = f.api.stageOpen('buildModel', {});
    f.api.layoutAttempt(1, 0);
    f.api.call(P.CTX.layoutGrowth, function () { k.advance(10); });
    f.api.layoutAccepted(1);
    f.api.stageClose(tok, 'buildModel');
    f.api.levelEnter({ where: { attempt: 1, sample: 3 }, proposal: true });
    tok = f.api.stageOpen('fullGrid', { attempt: 1, maxAttempts: 8 });
    f.api.gridUnlimited(50);
    k.advance(300);
    f.api.dfsNode();
    const snap = P.readSnapshot(f.sab);
    const lines = [];
    const line = function (type, data) { lines.push(Object.assign({ at: 'x', key: key, type: type }, data)); };
    line('spawn', { hostEpochMs: 100, commandWindowRemainingMs: 238000 });
    f.posted.forEach(function (m, i) { line('ev', Object.assign({}, m, { type: 'ev', rel: i, workerSeq: m.seq, ev: m.ev })); });
    line('heartbeat', { n: 1, rel: 5000, hostEpochMs: 200, cpuMs: 4000, summary: P.summariseSnapshot(snap), snapshot: snap });
    line('heartbeat', { n: 2, rel: 10000, hostEpochMs: 400, cpuMs: 9000, summary: P.summariseSnapshot(snap), snapshot: snap });
    line('final', { rel: 12000, hostEpochMs: 410, endEpochMs: 410, outcome: 'request-timeout', summary: P.summariseSnapshot(snap), snapshot: snap });
    const text = lines.map(function (l) { return JSON.stringify(l); }).join('\r\n') + '\r\n';
    const rc = P.reconcileJournal(P.parseJournal(text).entries, key);
    const full = RUN.attributionOf(rc);
    const gen = { coldWallMs: 12000, readyWallMs: 11900, startupMs: 100, cleanupMs: 5, cpuToDecisionMs: 11000, cpuTotalMs: 11010, cpuResolutionStatus: 'resolved' };
    const rec = Object.assign(R.blankRecord({ key: key, outcome: 'request-timeout', timeoutScope: 'request', arm: 'prototype', shard: 'tail', generation: gen }), {
      limits: { guardMs: 240000, guardScope: 'jigsaw', commandDeadlineMs: 250000 },
      jigsaw: { limitAppliedMs: 240000, commandWindowRemainingAtSpawnMs: 238000, attribution: clean(full.attribution) },
      stageJournal: { sha256OfItsLines: 'x' } });
    return { key: key, text: text, rec: rec };
  };
  const input = function (fx, over) {
    return Object.assign({ round: 'provisional-r1', control: null, tail: { command: { firewallClean: true, runtimeLabel: 'l', runtimeFingerprint: 'r', harnessFingerprint: 'h',
      adapterIds: ['jigsaw-profile'], adapterHashes: ['a'], sourceStable: true, machine: {} }, records: [fx.rec], journalText: fx.text }, ledger: { entries: [{ task: TASK, shard: 'tail',
      attemptId: 'a1', occupiedMs: 240000, chargedGraceMs: 45000, chargedMs: 285000, priorityWaitMs: 1000, wrapperExit: 0, status: 'complete' }], approvals: [] } }, over || {});
  };
  t.fixtures = fixtures;
  t.inputOf = input;
  t.add('aggregate.tail-attribution-from-the-journal', 'aggregate', 'the attribution is recomputed from the journal and equals the record\'s; the censored run stays a lower bound', function () {
    const fx = fixtures();
    const d = documents(input(fx), {});
    const a = d.attribution;
    t.equal([a.attributionSource, a.attributionMatchesRecord, a.markerAgreement], ['final', true, 'agree'], 'source and agreement');
    t.equal([a.thisRun.censored, a.thisRun.completedColdWallMs, a.thisRun.censoredLowerBoundWallMs], [true, null, 12000], 'censored: no completed latency');
    t.equal([a.currentStage.step, a.currentStage.attempt, a.currentStage.sample, a.currentStage.kind], ['fullGrid', 1, null, null], 'where it was: the stale sample fields are not shown');
    t.check(a.stageSequence.rows.every(function (row) { return row[0] === 'dig' || row[0] === 'rate' || row[0] === 'tune' ? true : row[3] === null; }), 'no kind for a full-grid entry');
    t.check(a.heartbeatTrajectory.every(function (s) { return s.sample === null && s.kind === null; }), 'no stale sample in the heartbeats');
    t.check(a.readout.some(function (s) { return /Before the stage that was still open, 1 stage entries ran to the end/.test(s); }), 'finished stages are reported');
    t.check(a.impliesForS7.some(function (s) { return /no distribution per successful full-grid attempt/.test(s); }), 'no ceiling can be sized from one request');
    t.check(a.instrumentationOverheadEstimate === null, 'no estimate without a calibration (the fixture has no control)');
    t.check(a.heartbeatTrajectory.length === 2 && a.heartbeatTrend.moved === false, 'the heartbeat trajectory and its trend');
    t.check(/not a completed latency/.test(a.thisRun.note), 'the note says so');
    t.check(a.impliesForS7.some(function (s) { return /full-grid search/.test(s); }) && a.impliesForS7.some(function (s) { return /lower bound/.test(s); }), 'S7 reading');
    t.check(a.readout.some(function (s) { return /unlimited last search was entered .* \(marker: search index 50 of its generate call\)/.test(s); }), 'the unlimited search is reported');
    t.equal(a.unknownCounters.map(function (u) { return u.counter; }).slice(0, 2), ['solverBudgetChecks', 'constraintPropagationOperations'], 'unknown counters');
  });
  t.add('aggregate.summary-and-markdown', 'aggregate', 'the summary labels the evidence, the criteria are computed and the document is normalised text', function () {
    const fx = fixtures();
    const d = documents(input(fx), { revision: 'test' });
    const md = d.markdown;
    t.check(/pre-MS07/.test(md) && /provisional \(pre-freeze\)/i.test(md) && /CENSORED: a lower bound/.test(md), 'labels');
    t.check(!/\n(?!\r)/.test(md.replace(/\r\n/g, '')) && /\r\n$/.test(md) && !/ +\r\n/.test(md), 'CRLF, no trailing space, a final newline');
    t.equal(d.summary.criteria.map(function (k) { return k.id; }), ['B01', 'B02', 'B03', 'T01', 'T02', 'T03', 'T04'], 'criteria');
    t.check(d.summary.criteria.find(function (k) { return k.id === 'B02'; }).status === 'met', 'B02');
    t.check(d.summary.machine.chargedMs === 285000 && d.summary.machine.remainingMs === 75000, 'machine time from the ledger');
    t.equal(d.summary.comparison.thisRunCompletedSeconds, null, 'no completed seconds for a censored request');
    t.check(JSON.stringify(d.summary).indexOf('undefined') < 0, 'plain data');
  });
  t.add('aggregate.no-tail-no-attribution', 'aggregate', 'without a tail record the documents say so and invent nothing', function () {
    const d = documents({ round: 'r', control: null, tail: null, ledger: { entries: [], approvals: [] } }, {});
    t.equal([d.attribution.thisRun, d.attribution.attribution], [null, null], 'nothing');
    t.check(/no record/.test(d.markdown), 'stated');
  });
}

// --- the command ----------------------------------------------------------------------------------------------------------------------------------------------------

function parseArgs(argv) {
  const o = { task: null, round: null, suffix: '', revision: null, deviations: [] };
  argv.forEach(function (arg) {
    const m = /^--([a-z-]+)=(.*)$/.exec(arg);
    if (!m) throw new C.HarnessError('args', 'unknown argument ' + arg);
    if (m[1] === 'task') o.task = m[2];
    else if (m[1] === 'round') o.round = m[2];
    else if (m[1] === 'suffix') o.suffix = m[2];
    else if (m[1] === 'revision') o.revision = m[2];
    else if (m[1] === 'deviation') o.deviations.push(m[2]);
    else throw new C.HarnessError('args', 'unknown argument ' + arg);
  });
  if (o.task !== TASK) throw new C.HarnessError('args', '--task=' + TASK + ' is required');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(o.round || '')) throw new C.HarnessError('args', 'missing or bad --round');
  if (!/^(-[a-z0-9]+)?$/.test(o.suffix)) throw new C.HarnessError('args', 'bad --suffix');
  return o;
}

function main(argv) {
  const o = parseArgs(argv);
  const repoRoot = C.DEFAULT_REPO_ROOT;
  const input = readInput(repoRoot, o.round);
  const d = documents(input, { revision: o.revision, deviations: o.deviations });
  const dir = path.join(repoRoot, ...C.EVIDENCE_REL.split('/'), o.round, TASK);
  C.writeJsonAtomic(repoRoot, path.join(dir, 'tail-attribution' + o.suffix + '.json'), d.attribution);
  C.writeJsonAtomic(repoRoot, path.join(dir, 'summary' + o.suffix + '.json'), d.summary);
  C.writeTextExclusive(repoRoot, path.join(dir, 'summary' + o.suffix + '.md'), d.markdown);
  process.stdout.write('IG-S08 documents written to ' + C.toPosix(path.relative(repoRoot, dir)) + ' (suffix "' + o.suffix + '")\n');
  return 0;
}

module.exports = { TASK, HISTORICAL, readShard, readInput, buildAttribution, buildSummary, renderMarkdown, documents, registerTests, heartbeatSeries,
  trend, readout, implications, ledgerView, criteria };

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    process.stderr.write('IG-S08 aggregate error: ' + (err && err.message ? err.message : String(err)) + '\n');
    process.exitCode = 1;
  }
}
