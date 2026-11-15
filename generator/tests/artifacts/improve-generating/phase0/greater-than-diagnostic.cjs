'use strict';

/*
 * IG-S09 (test side, provisional (pre-freeze)): the Greater-Than miss predicate and the sound-solve-first diagnostic. This module
 * holds everything that is independent of an engine instance, so that it can be tested without one:
 *
 *   - the capture runtime (`createRuntime`), published as `SG.__igGt` for the time of ONE request by the worker (ig09-worker.cjs).
 *     The private transforms of adapters/gt-diagnostic.cjs call it; both arms install the same runtime. It observes (per sample:
 *     setup reveals with their origin, sign passes, tuning, final state, local-search entry) and counts physical work (DFS count
 *     calls, DFS search-node checks, restricted solves, skipped DFS counts, the digger's internal count guard). It draws no random
 *     number and changes no limit.
 *   - the arm G1 (`solveFirst`): in the first technique sign pass of a sample ONLY, the native restricted solve (assumeUniqueness
 *     false) runs before the DFS uniqueness count. A complete, non-uniqueness-assuming proof is the only thing that skips the
 *     count; a genuine stuck result runs the native count and keeps the original ambiguous/techniques reason. A contradiction, a
 *     proof by a uniqueness-assuming technique, a malformed report or a thrown error is NEVER retried through the native order (r2:
 *     the earlier code did, which could turn a solver failure into an ordinary ambiguous rejection): the first failure is recorded
 *     (code, site, ordinal) and the request stops with that failure.
 *   - the pure analysis: the disjoint miss split, the named trap (exactly: a complete canonical rating below the requested band AND
 *     finalClues <= minClues + 1 AND an independently proved minimal sign set), minimality judgement, the setup-probe rule block,
 *     the validation-reuse digest and the G0/G1 comparison, whose `guard-binding-difference` needs a recognised, recorded guard event.
 */
const C = require('./common.cjs');

const SCHEMA = 'ig09-capture/1';
const MINIMAL_NODE_CAP = 200000;
const PROBE_NODE_CAP = 200000;
const PROBE_STEP_CAP = 100000;
const PROBE_GROUPS = 3;
const DIAG_BUDGET_MS = 30000;
// The error codes of the engine's own guards: the only events a guard-binding difference may rest on.
const GUARD_CODES = Object.freeze(['budget.exceeded', 'budget.cancelled', 'digger.uniqueGuard', 'digger.objectiveGuard']);
const STOP_CODES = Object.freeze({ contradiction: 'ig09.g1-contradiction', 'unsound-proof': 'ig09.g1-unsound-proof',
  'malformed-report': 'ig09.g1-malformed-report' });
// What the capture's counters count (r2: the r1 records alias the first one to `counts.dfsEntries`, which it is NOT).
const COUNTER_UNITS = Object.freeze({
  dfsCalls: 'calls of SG.dfs.countSolutions (one per uniqueness count, whatever its depth); NOT depth-first node entries',
  dfsChecks: 'budget checks of the depth-first search loop (`ws.budget.check()` in `search`); propagation checks are not included',
  restrictedSolves: 'calls of the allowed-set restricted solve (`solveWithin`)',
  countWithinCalls: 'calls of the digger\'s `countWithin` (keeper offers and the local search): one UNIQUE_NODES slice each',
  countWithinNodes: 'budget checks counted by the UNIQUE_NODES slices (search-loop AND propagation checks), not search nodes',
  nodeEntries: 'not instrumented (null)', solverBudgetChecks: 'not instrumented (null)' });
const PHASES = Object.freeze(['clue-floor', 'unit-floor', 'help', 'tune']);
const BUCKETS = Object.freeze(['exact', 'shallow', 'above-or-unrated', 'below-trap', 'below-tune', 'below-setup2', 'other-below',
  'unconfirmed']);

// --- encodings -------------------------------------------------------------------------------------------------------------------

function encodeGivens(values) {
  let text = '';
  for (let i = 0; i < values.length; i++) text += String.fromCharCode(48 + values[i]);
  return text;
}

function decodeGivens(text) {
  const out = new Int32Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) - 48;
  return out;
}

function encodeSigns(list) {
  const parts = [];
  for (let i = 0; i < list.length; i++) parts.push(list[i].a + '-' + list[i].b);
  return parts.join(',');
}

function decodeSigns(text) {
  if (text === '') return [];
  return text.split(',').map(function (pair) {
    const at = pair.indexOf('-');
    return { a: Number(pair.slice(0, at)), b: Number(pair.slice(at + 1)) };
  });
}

function cluesOf(text) {
  let n = 0;
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) !== 48) n++;
  return n;
}

function fnv(text, seed) {
  let h = seed === undefined ? 0x811c9dc5 : seed;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function round3(x) {
  return Math.round(x * 1000) / 1000;
}

// --- the capture runtime ---------------------------------------------------------------------------------------------------------

function blankG1() {
  return { tried: 0, proved: 0, stuckAmbiguous: 0, stuckUnique: 0, stoppedContradiction: 0, stoppedError: 0, stoppedUnsoundProof: 0,
    stoppedMalformed: 0 };
}

// The r1 records (written by the code that retried a failure through the native order) name these counters `fallback*`; all are 0 there.
const LEGACY_G1 = Object.freeze({ stoppedContradiction: 'fallbackContradiction', stoppedError: 'fallbackError',
  stoppedUnsoundProof: 'unsoundProof', stoppedMalformed: 'fallbackShape' });

/** A G1 counter by its current name, or by its r1 name in an older record. */
function g1Counter(g1, name) {
  if (g1[name] !== undefined) return g1[name];
  return LEGACY_G1[name] !== undefined && g1[LEGACY_G1[name]] !== undefined ? g1[LEGACY_G1[name]] : 0;
}

function blankOutcome() {
  return { n: 0, dfsCalls: 0, dfsChecks: 0, solves: 0 };
}

/**
 * The runtime of one request. `arm` is 'g0' (native order) or 'g1' (solve first in the first technique pass). `now` is the clock
 * (milliseconds); `techniqueAssumes(id)` tells whether a technique assumes uniqueness (true / false, null when unknown).
 */
function createRuntime(options) {
  const o = options || {};
  const arm = o.arm === 'g1' ? 'g1' : 'g0';
  const now = typeof o.now === 'function' ? o.now : function () { return performance.now(); };
  const assumes = typeof o.techniqueAssumes === 'function' ? o.techniqueAssumes : function () { return null; };
  const c = { dfsCalls: 0, dfsChecks: 0, restrictedSolves: 0, countWithinCalls: 0, countWithinNodes: 0, countWithinTrips: 0,
    guidedEntries: 0 };
  const samples = [];
  const attemptSigns = {};
  let serial = 0;
  let cur = null;
  let localPending = false;
  let begun = null;
  let finished = false;
  let lastCall = null;
  let currentIdx = null;
  let firstFailure = null;

  /**
   * The first failure of the request, kept with its code, its site (the last engine call before it: a DFS count, a restricted solve,
   * or unknown) and its ordinal (sample, pass, removal in the pass, sign). Later failures never replace it.
   */
  function noteFailure(kind, err, site) {
    if (firstFailure !== null) return firstFailure;
    const p = cur !== null ? cur.open : null;
    firstFailure = { kind: kind, code: err && typeof err.code === 'string' ? err.code : null, name: err && err.name ? err.name : null,
      message: String(err && err.message !== undefined ? err.message : err), site: site || lastCall || 'unknown', arm: arm,
      sampleOrdinal: cur !== null ? cur.ordinal : null, attempt: cur !== null ? cur.attempt : null, sample: cur !== null ? cur.sample : null,
      pass: p ? p.index : null, passName: p ? p.name : null, round: p ? p.round : null, firstTechniquePass: p ? p.firstTechnique : null,
      removal: p ? p.removals : null, sign: currentIdx };
    return firstFailure;
  }

  function snap() {
    return { d: c.dfsCalls, k: c.dfsChecks, s: c.restrictedSolves, w: c.countWithinCalls, wn: c.countWithinNodes,
      wt: c.countWithinTrips, g: c.guidedEntries };
  }

  function delta(a, b) {
    return { dfsCalls: b.d - a.d, dfsChecks: b.k - a.k, restrictedSolves: b.s - a.s, countWithinCalls: b.w - a.w,
      countWithinNodes: b.wn - a.wn, countWithinTrips: b.wt - a.wt, guidedEntries: b.g - a.g };
  }

  function blankSample(kind, where) {
    return { ordinal: serial++, attempt: where && where.attempt !== undefined ? where.attempt : null,
      sample: where && where.sample !== undefined ? where.sample : null, kind: kind, ended: false, endReason: null,
      t0: now(), c0: snap(), tSetup: null, cSetup: null, tStrategy: null, cStrategy: null, t1: null,
      setup: null, groups: [], phase: null, helpProbes: 0, initialClues: null, setupGivens: null, techPasses: 0, minPasses: 0,
      accepted: 0, passes: [], open: null, countWithinMax: 0, localEntry: null };
  }

  function closeSample(reason) {
    if (cur === null) return;
    if (cur.open !== null) {
      cur.passes.push(closePass(cur.open, false));
      cur.open = null;
    }
    cur.ended = reason === 'end';
    cur.endReason = reason;
    cur.t1 = now();
    cur.c1 = snap();
    samples.push(cur);
    cur = null;
  }

  function closePass(p, ended) {
    p.wallMs = round3(now() - p.t0);
    const d = delta(p.c0, snap());
    p.dfsCalls = d.dfsCalls;
    p.dfsChecks = d.dfsChecks;
    p.restrictedSolves = d.restrictedSolves;
    p.ended = ended;
    delete p.c0;
    delete p.t0;
    p.idxHash = fnv(p.idxs.join(','));
    delete p.idxs;
    return p;
  }

  /**
   * The verdict on a restricted-solve report that claims a proof: 'sound' (techniques only, none assumes uniqueness), 'unsound' (a
   * technique that is not known to be free of the uniqueness assumption) or 'malformed' (the technique-count map is not a plain
   * object of non-negative integers, so the proof cannot be audited). `detail` says what is wrong. `{}` is a valid, empty map.
   */
  function proofVerdict(report) {
    const counts = report.techniqueCounts;
    if (counts === undefined || counts === null) return { verdict: 'malformed', detail: 'techniqueCounts is ' + (counts === null ? 'null' : 'missing') };
    if (typeof counts !== 'object' || Array.isArray(counts)) {
      return { verdict: 'malformed', detail: 'techniqueCounts is ' + (Array.isArray(counts) ? 'an array' : 'a ' + typeof counts) + ', not a plain object' };
    }
    const proto = Object.getPrototypeOf(counts);
    if (proto !== Object.prototype && proto !== null) return { verdict: 'malformed', detail: 'techniqueCounts is not a plain object' };
    const ids = Object.keys(counts);
    for (let i = 0; i < ids.length; i++) {
      const v = counts[ids[i]];
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
        return { verdict: 'malformed', detail: 'techniqueCounts[' + ids[i] + '] is not a non-negative integer' };
      }
    }
    for (let i = 0; i < ids.length; i++) if (assumes(ids[i]) !== false) return { verdict: 'unsound', detail: 'technique ' + ids[i] + ' is not known to be free of the uniqueness assumption' };
    return { verdict: 'sound', detail: null };
  }

  const api = {
    dfsEntry: function () {
      c.dfsCalls++;
      lastCall = 'dfs-count';
    },
    dfsCheck: function () { c.dfsChecks++; },
    restrictedSolve: function () {
      c.restrictedSolves++;
      lastCall = 'restricted-solve';
    },
    guidedEntry: function () { c.guidedEntries++; },
    countWithinStart: function () { c.countWithinCalls++; },
    countWithinEnd: function (used, tripped) {
      c.countWithinNodes += used;
      if (tripped === true) c.countWithinTrips++;
      if (cur !== null && used > cur.countWithinMax) cur.countWithinMax = used;
    },
    localNext: function () { localPending = true; },
    localEnter: function (candidate) {
      if (cur === null) return;
      const rating = candidate && candidate.rating ? candidate.rating : null;
      cur.localEntry = { startClues: candidate && candidate.givens ? cluesOf(encodeGivens(candidate.givens)) : null,
        startSigns: candidate && candidate.model ? candidate.model.inequalities.length : null,
        startRating: rating ? { solved: rating.solved === true, level: rating.level, score: rating.score } : null };
    },
    sampleStart: function (info) {
      if (cur !== null) closeSample('abandoned');
      const kind = localPending ? 'local' : (info && info.proposal === true ? 'proposal' : 'ordinary');
      localPending = false;
      cur = blankSample(kind, info ? info.where : null);
    },
    digBegin: function (info) {
      if (cur === null) cur = blankSample('orphan', null);
      cur.setup = { minClues: info.minClues, minPerUnit: info.minPerUnit, symmetry: info.symmetry, levelIndex: info.levelIndex,
        signsTotal: info.signsTotal, techniques: info.techniques === true, budgetPresent: info.budgetPresent === true,
        solution: encodeGivens(info.solution) };
      cur.signsTotal = info.signsTotal;
      if (cur.attempt !== null && attemptSigns[cur.attempt] === undefined) attemptSigns[cur.attempt] = encodeSigns(info.signs);
    },
    phase: function (name) {
      if (cur === null) return;
      cur.phase = name;
      if (name === 'help') cur.helpProbes++;
    },
    group: function (g) {
      if (cur === null) return;
      cur.groups.push({ phase: cur.phase, group: g, cells: [] });
    },
    cell: function (cell) {
      if (cur === null || cur.groups.length === 0) return;
      cur.groups[cur.groups.length - 1].cells.push(cell);
    },
    setupDone: function (givens, clues) {
      if (cur === null) return;
      cur.setupGivens = encodeGivens(givens);
      cur.initialClues = clues;
      cur.tSetup = now();
      cur.cSetup = snap();
    },
    pass: function (phase, name, clues) {
      if (cur === null) return;
      if (phase === 'start') {
        if (cur.open !== null) cur.passes.push(closePass(cur.open, false));
        const technique = name === 'signs';
        let round;
        if (technique) round = cur.techPasses++;
        else round = cur.minPasses++;
        cur.open = { index: cur.passes.length, name: name, kind: technique ? 'technique' : 'minimal', round: round,
          firstTechnique: technique && round === 0, cluesAtStart: clues,
          aliveAtStart: cur.signsTotal === undefined ? null : cur.signsTotal - cur.accepted, t0: now(), c0: snap(),
          removals: 0, accepted: 0, rejectedAmbiguous: 0, rejectedTechniques: 0, errors: 0, seq: '', idxs: [],
          byOutcome: { accepted: blankOutcome(), ambiguous: blankOutcome(), techniques: blankOutcome() },
          g1: arm === 'g1' && technique && round === 0 ? blankG1() : null };
      } else if (cur.open !== null) {
        cur.passes.push(closePass(cur.open, true));
        cur.open = null;
      }
    },
    removal: function (idx, name, run) {
      const p = cur !== null ? cur.open : null;
      if (p === null) return run();
      const before = snap();
      let reason;
      lastCall = null;
      currentIdx = idx;
      try {
        reason = run();
      } catch (err) {
        noteFailure('error', err);
        p.errors++;
        p.removals++;
        p.seq += 'e';
        p.idxs.push(idx);
        throw err;
      }
      const after = snap();
      p.removals++;
      p.idxs.push(idx);
      const key = reason === null ? 'accepted' : (reason === 'ambiguous' ? 'ambiguous' : 'techniques');
      if (key === 'accepted') {
        p.accepted++;
        cur.accepted++;
      } else if (key === 'ambiguous') {
        p.rejectedAmbiguous++;
      } else {
        p.rejectedTechniques++;
      }
      p.seq += key === 'accepted' ? 'a' : (key === 'ambiguous' ? 'n' : 't');
      const bucket = p.byOutcome[key];
      bucket.n++;
      bucket.dfsCalls += after.d - before.d;
      bucket.dfsChecks += after.k - before.k;
      bucket.solves += after.s - before.s;
      return reason;
    },
    solveFirstApplies: function (hasAllowed) {
      return arm === 'g1' && hasAllowed === true && cur !== null && cur.open !== null && cur.open.firstTechnique === true &&
        cur.open.g1 !== null;
    },
    /**
     * The arm G1's oracle. `count()` is the native uniqueness oracle (null: unique, else 'ambiguous'; it increments the semantic
     * oracle counter itself), `solve()` the native restricted solve, `question()` the semantic counter increment for a candidate
     * whose count is skipped. Returns null (the sign may go) or the reason it stays.
     */
    solveFirst: function (count, solve, question) {
      const g1 = cur.open.g1;
      g1.tried++;
      let report;
      try {
        report = solve();
      } catch (err) {
        // an engine failure is never retried and never turned into an ordinary rejection: it stops the request with its own code
        g1.stoppedError++;
        noteFailure('error', err, 'restricted-solve');
        throw err;
      }
      // a report that claims a proof is audited before anything is skipped: nothing (count or semantic question) runs for a malformed or unsound one
      let proof = null;
      if (report && report.solved === true && report.status === 'solved') {
        proof = proofVerdict(report);
        if (proof.verdict === 'sound') {
          question();
          g1.proved++;
          return null;
        }
      }
      if (report && report.status === 'stuck' && report.solved === false) {
        const reason = count();
        if (reason !== null) {
          g1.stuckAmbiguous++;
          return reason;
        }
        g1.stuckUnique++;
        return 'techniques';
      }
      // a contradiction, a proof that used a uniqueness-assuming technique, a malformed report: never an ordinary stuck, never a retry
      let kind = 'malformed-report';
      let detail = report && report.status ? 'status ' + report.status : 'no usable report';
      if (report && report.status === 'contradiction') {
        kind = 'contradiction';
      } else if (proof !== null && proof.verdict === 'unsound') {
        kind = 'unsound-proof';
        detail = 'a proof with ' + proof.detail;
      } else if (proof !== null) {
        detail = 'a proof with malformed metadata (' + proof.detail + ')';
      }
      if (kind === 'contradiction') g1.stoppedContradiction++;
      else if (kind === 'unsound-proof') g1.stoppedUnsoundProof++;
      else g1.stoppedMalformed++;
      const err = new Error('G1 stopped: the restricted solve returned ' + detail);
      err.name = 'IG09StopError';
      err.code = STOP_CODES[kind];
      noteFailure(kind, err, 'restricted-solve');
      throw err;
    },
    strategyDone: function () {
      if (cur === null) return;
      cur.tStrategy = now();
      cur.cStrategy = snap();
    },
    sampleEnd: function (res) {
      if (cur === null) return;
      const dug = res.dug;
      const rating = res.rating;
      cur.final = {
        clues: dug.clues,
        givens: encodeGivens(dug.givens),
        signs: encodeSigns(dug.model.inequalities),
        exact: res.exact === true,
        shallow: res.shallow === true,
        unsound: dug.unsound === true,
        rating: rating ? { solved: rating.solved === true, level: rating.level, score: rating.score,
          hardestTechnique: rating.hardestTechnique, digest: C.digestOf(rating) } : null,
        stats: dug.stats ? { groups: dug.stats.groups, tried: dug.stats.tried, accepted: dug.stats.accepted,
          rejected: dug.stats.rejected, skipped: dug.stats.skipped, oracleCalls: dug.stats.oracleCalls } : null
      };
      const caps = res.caps;
      if (cur.kind === 'local' && caps && Array.isArray(caps.localSearches) && caps.localSearches.length > 0) {
        const entry = caps.localSearches[caps.localSearches.length - 1];
        cur.localCaps = { ratings: entry.ratings, proposals: entry.proposals, firstShallowAt: entry.firstShallowAt,
          shallowRatings: entry.shallowRatings, shallowLimit: entry.shallowLimit, capHit: entry.capHit };
      }
      closeSample('end');
    },
    finish: function () {
      finished = true;
      if (cur !== null) closeSample('unfinished');
      return snapshot();
    }
  };

  function sampleRow(s) {
    const total = s.t1 === null ? null : s.t1 - s.t0;
    const end = s.c1 || snap();
    const row = {
      ordinal: s.ordinal, attempt: s.attempt, sample: s.sample, kind: s.kind, ended: s.ended, endReason: s.endReason,
      setup: s.setup === null ? null : Object.assign({}, s.setup, { initialClues: s.initialClues, givens: s.setupGivens,
        helpProbes: s.helpProbes, groups: s.groups.map(function (g) { return { phase: g.phase, group: g.group, cells: g.cells }; }) }),
      final: s.final || null,
      tuneRounds: s.techPasses > 0 ? s.techPasses - 1 : (s.minPasses > 0 ? s.minPasses - 1 : 0),
      passes: s.passes,
      localEntry: s.localEntry,
      localCaps: s.localCaps || null,
      counters: delta(s.c0, end),
      countWithinMax: s.countWithinMax,
      spansMs: {
        totalMs: total === null ? null : round3(total),
        setupMs: s.tSetup === null ? null : round3(s.tSetup - s.t0),
        passMs: round3(s.passes.reduce(function (sum, p) { return sum + p.wallMs; }, 0)),
        strategyMs: s.tStrategy === null ? null : round3(s.tStrategy - s.t0),
        afterStrategyMs: s.tStrategy === null || s.t1 === null ? null : round3(s.t1 - s.tStrategy)
      }
    };
    if (s.tStrategy !== null && s.tSetup !== null) {
      row.spansMs.tuneMs = round3(s.tStrategy - s.tSetup - row.spansMs.passMs);
    } else {
      row.spansMs.tuneMs = null;
    }
    const setupCounters = s.cSetup === null ? null : delta(s.c0, s.cSetup);
    row.setupCounters = setupCounters;
    return row;
  }

  function snapshot() {
    return { schema: SCHEMA, arm: arm, finished: finished, samples: samples.map(sampleRow), attemptSigns: attemptSigns,
      totals: delta({ d: 0, k: 0, s: 0, w: 0, wn: 0, wt: 0, g: 0 }, snap()), firstFailure: firstFailure,
      counterUnits: COUNTER_UNITS };
  }

  begun = now();
  return { api: api, arm: arm, snapshot: snapshot, startedAt: begun };
}

// --- classification ----------------------------------------------------------------------------------------------------------------

function levelIndexOf(levels, name) {
  return levels.indexOf(name);
}

function tuneRevealCount(sample) {
  return sample.setup.groups.filter(function (g) { return g.phase === 'tune'; }).length;
}

/**
 * One dug sample, from its captured data `s` and the independent post-timing result `d` (null: none). The cheap clauses (the clue
 * floor and the complete canonical below-band) come first; only a sample that satisfies both is asked for a minimality proof
 * (`d.minimal`: true, false or null for unknown), and a missing proof never makes a trap.
 */
function classifySample(s, d, level, levels) {
  const requested = levelIndexOf(levels, level);
  const setup = s.setup;
  const floor = setup.minClues;
  const flags = { floorClause: s.final.clues <= floor + 1, tuneReveals: tuneRevealCount(s), setupAboveFloor: setup.initialClues - floor,
    below: null, minimal: d && d.minimal !== undefined ? d.minimal : null, trapEligible: false, trapProven: false,
    trapUnknown: false, ratingConfirmed: false };
  const confirmed = !!d && d.ratingStatus === 'ok' && d.canonicalEqual === true;
  flags.ratingConfirmed = confirmed;
  if (!confirmed) {
    return { bucket: 'unconfirmed', flags: flags, reason: !d || d.ratingStatus !== 'ok' ? 'no independent rating (' +
      (d ? d.ratingStatus : 'none') + ')' : 'independent rating differs from the captured one' };
  }
  const r = d.rating;
  if (s.final.exact) return { bucket: 'exact', flags: flags };
  if (s.final.shallow) return { bucket: 'shallow', flags: flags };
  const index = r.level === null || r.level === undefined ? -1 : levelIndexOf(levels, r.level);
  if (r.solved !== true || index < 0 || index > requested) return { bucket: 'above-or-unrated', flags: flags };
  flags.below = index < requested;
  if (!flags.below) return { bucket: 'other-below', flags: flags, reason: 'in the band but neither exact nor shallow' };
  flags.trapEligible = flags.floorClause;
  if (flags.floorClause && flags.minimal === true) {
    flags.trapProven = true;
    return { bucket: 'below-trap', flags: flags };
  }
  flags.trapUnknown = flags.floorClause && flags.minimal === null;
  if (flags.tuneReveals > 0) return { bucket: 'below-tune', flags: flags };
  if (flags.tuneReveals === 0 && flags.setupAboveFloor >= 2) return { bucket: 'below-setup2', flags: flags };
  return { bucket: 'other-below', flags: flags };
}

/** The disjoint split of a list of classified samples, with the exact numerators and denominators. */
function missSplit(classified) {
  const buckets = {};
  BUCKETS.forEach(function (b) { buckets[b] = 0; });
  classified.forEach(function (x) { buckets[x.bucket]++; });
  const n = classified.length;
  const misses = n - buckets.exact;
  const below = classified.filter(function (x) { return x.flags.below === true; });
  const eligible = classified.filter(function (x) { return x.flags.trapEligible === true; });
  const proven = eligible.filter(function (x) { return x.flags.trapProven; });
  const unknown = eligible.filter(function (x) { return x.flags.trapUnknown; });
  const unconfirmed = buckets.unconfirmed;
  const unconfirmedEligible = classified.filter(function (x) { return x.bucket === 'unconfirmed' && x.flags.floorClause; }).length;
  return {
    samples: n,
    buckets: buckets,
    exact: buckets.exact,
    misses: misses,
    below: below.length,
    trapEligible: eligible.length,
    trapProven: proven.length,
    trapUnknown: unknown.length,
    unconfirmed: unconfirmed,
    trapLowerShareOfMisses: { numerator: proven.length, denominator: misses },
    trapUnconfirmedEligible: unconfirmedEligible,
    trapUpperShareOfMisses: { numerator: proven.length + unknown.length + unconfirmedEligible, denominator: misses,
      note: 'upper: proven traps plus eligible samples whose minimality is unknown plus samples with no confirmed rating that ' +
        'satisfy the cheap clue-floor clause' },
    minimalityCoverage: { requiredForTrap: eligible.length, decided: eligible.length - unknown.length, unknown: unknown.length }
  };
}

// --- minimality, probes, reuse -------------------------------------------------------------------------------------------------------

/**
 * `results[i]`: the number of solutions (1 or 2 = "two or more") of the puzzle without sign i, or null when the count did not
 * finish inside its node slice. Minimal means every removal admits another solution; a capped count is unknown, never minimal.
 */
function judgeMinimality(results) {
  let necessary = 0;
  let unknown = 0;
  let redundantFirst = null;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r === null || r === undefined) unknown++;
    else if (r >= 2) necessary++;
    else if (redundantFirst === null) redundantFirst = i;
  }
  let status = 'proved';
  if (redundantFirst !== null) status = 'not-minimal';
  else if (unknown > 0) status = 'unknown';
  return { status: status, minimal: status === 'proved' ? true : (status === 'not-minimal' ? false : null),
    signs: results.length, necessary: necessary, unknown: unknown, redundantFirst: redundantFirst };
}

/**
 * Would removing `cells` from the parent givens break the clue floor or the unit floor by rule alone? `cellUnits[c]` lists the units
 * of cell c. Pure: no engine, no search.
 */
function ruleBlock(parent, cells, cellUnits, minClues, minPerUnit) {
  const values = Array.from(parent);
  let clues = 0;
  const unitClues = {};
  for (let c = 0; c < values.length; c++) {
    if (values[c] === 0) continue;
    clues++;
    const us = cellUnits[c];
    for (let k = 0; k < us.length; k++) unitClues[us[k]] = (unitClues[us[k]] || 0) + 1;
  }
  const removed = cells.filter(function (cell) { return values[cell] !== 0; });
  const unitDrop = {};
  removed.forEach(function (cell) {
    const us = cellUnits[cell];
    for (let k = 0; k < us.length; k++) unitDrop[us[k]] = (unitDrop[us[k]] || 0) + 1;
  });
  const floorBlock = clues - removed.length < minClues;
  const units = Object.keys(unitDrop).filter(function (u) { return (unitClues[u] || 0) - unitDrop[u] < minPerUnit; });
  return { floorBlock: floorBlock, unitBlock: minPerUnit > 0 && units.length > 0, cluesAfter: clues - removed.length,
    unitsBelowFloor: units.map(Number) };
}

/** The groups of the setup above the floor (unit-floor rule and solvability help), in their recorded order, at most `limit`. */
function aboveFloorGroups(sample, limit) {
  const groups = sample.setup.groups.filter(function (g) { return g.phase === 'unit-floor' || g.phase === 'help'; });
  return groups.slice(0, limit === undefined ? PROBE_GROUPS : limit);
}

/** The first missed sample (not exact) of a request among the sign-dug samples, in sample order; null without one. */
function firstMissed(samples) {
  const list = samples.filter(function (s) { return s.kind !== 'local' && s.setup !== null && s.final; });
  const found = list.find(function (s) { return s.final.exact !== true; });
  return found || null;
}

function sampleInputDigest(input) {
  return C.digestOf({ level: input.level, solution: input.solution, givens: input.givens, signs: input.signs,
    runtimeFingerprint: input.runtimeFingerprint, guards: input.guards });
}

function probeInputDigest(input) {
  return C.digestOf({ level: input.level, solution: input.solution, parent: input.parent, signsAll: input.signsAll,
    groups: input.groups, floor: input.floor, runtimeFingerprint: input.runtimeFingerprint, guards: input.guards });
}

/**
 * The diagnosis plan of a request: which samples need an independent result and in which order (the cheap floor clause first, the
 * rest after) and which are reused from an earlier validated request with the same input digest. `cache` maps digest -> { key, row }.
 */
function planDiagnosis(capture, options) {
  const o = options;
  const rows = [];
  capture.samples.forEach(function (s) {
    if (s.kind === 'local' || s.setup === null || !s.final) return;
    const input = { level: o.level, solution: s.setup.solution, givens: s.final.givens, signs: s.final.signs,
      runtimeFingerprint: o.runtimeFingerprint, guards: o.guards };
    const digest = sampleInputDigest(input);
    const hit = o.cache ? o.cache.get(digest) : undefined;
    const sameRating = !!hit && !!hit.row.rating && hit.row.rating.digest === (s.final.rating ? s.final.rating.digest : null);
    rows.push({ ordinal: s.ordinal, digest: digest, floorClause: s.final.clues <= s.setup.minClues + 1,
      reusedFrom: sameRating ? hit.key : null, reusedRow: sameRating ? hit.row : null });
  });
  const todo = rows.filter(function (r) { return r.reusedFrom === null; });
  todo.sort(function (a, b) { return (a.floorClause === b.floorClause ? 0 : (a.floorClause ? -1 : 1)) || a.ordinal - b.ordinal; });
  return { rows: rows, order: todo.map(function (r) { return r.ordinal; }) };
}

// --- the comparison of the arms ------------------------------------------------------------------------------------------------------

function firstPassDifference(pa, pb) {
  const fields = ['name', 'kind', 'round', 'removals', 'accepted', 'rejectedAmbiguous', 'rejectedTechniques', 'seq', 'idxHash',
    'cluesAtStart'];
  for (let i = 0; i < fields.length; i++) {
    if (pa[fields[i]] !== pb[fields[i]]) return fields[i];
  }
  return null;
}

/**
 * G0 against G1 for one request, sample by sample: the same samples in the same order, the same final states, ratings and verdicts,
 * the same sign decisions in every pass and the same semantic oracle-question counts. The first difference is kept. A difference
 * is a `guard-binding-difference` only when an external budget was present and the first differing decision is a thrown error (a
 * guard); anything else is a `mismatch` and stops the pack. `budgetPresent` is whether any sample saw an external budget.
 */
function compareArms(a, b) {
  const budgetPresent = a.samples.concat(b.samples).some(function (s) { return s.setup && s.setup.budgetPresent === true; });
  const out = { equal: true, verdict: 'identity-ok', budgetPresent: budgetPresent, firstDifference: null, samplesCompared: 0,
    passesCompared: 0, removalsCompared: 0 };
  const note = function (where) {
    out.equal = false;
    if (out.firstDifference === null) out.firstDifference = where;
  };
  if (a.samples.length !== b.samples.length) note({ field: 'sampleCount', a: a.samples.length, b: b.samples.length });
  const n = Math.min(a.samples.length, b.samples.length);
  for (let i = 0; i < n; i++) {
    const x = a.samples[i];
    const y = b.samples[i];
    out.samplesCompared++;
    const head = ['attempt', 'sample', 'kind'];
    for (let h = 0; h < head.length; h++) {
      if (x[head[h]] !== y[head[h]]) note({ sample: i, field: head[h], a: x[head[h]], b: y[head[h]] });
    }
    const fa = x.final;
    const fb = y.final;
    if ((fa === null) !== (fb === null)) {
      note({ sample: i, field: 'final', a: fa === null ? null : 'present', b: fb === null ? null : 'present' });
    } else if (fa !== null) {
      const keys = ['clues', 'givens', 'signs', 'exact', 'shallow', 'unsound'];
      keys.forEach(function (k) { if (fa[k] !== fb[k]) note({ sample: i, field: 'final.' + k, a: fa[k], b: fb[k] }); });
      const ra = fa.rating ? fa.rating.digest : null;
      const rb = fb.rating ? fb.rating.digest : null;
      if (ra !== rb) note({ sample: i, field: 'final.rating', a: ra, b: rb });
      const qa = fa.stats ? fa.stats.oracleCalls : null;
      const qb = fb.stats ? fb.stats.oracleCalls : null;
      if (qa !== qb) note({ sample: i, field: 'final.stats.oracleCalls', a: qa, b: qb });
    }
    if ((x.setup === null) !== (y.setup === null)) {
      note({ sample: i, field: 'setup' });
    } else if (x.setup !== null) {
      if (x.setup.givens !== y.setup.givens) note({ sample: i, field: 'setup.givens', a: x.setup.givens, b: y.setup.givens });
      if (C.canonicalJson(x.setup.groups) !== C.canonicalJson(y.setup.groups)) note({ sample: i, field: 'setup.groups' });
    }
    if (x.passes.length !== y.passes.length) note({ sample: i, field: 'passCount', a: x.passes.length, b: y.passes.length });
    const m = Math.min(x.passes.length, y.passes.length);
    for (let p = 0; p < m; p++) {
      out.passesCompared++;
      out.removalsCompared += x.passes[p].removals;
      const field = firstPassDifference(x.passes[p], y.passes[p]);
      if (field !== null) {
        let position = null;
        const sa = x.passes[p].seq;
        const sb = y.passes[p].seq;
        for (let k = 0; k < Math.max(sa.length, sb.length); k++) {
          if (sa[k] !== sb[k]) {
            position = k;
            break;
          }
        }
        note({ sample: i, pass: p, field: 'pass.' + field, position: position, a: x.passes[p][field], b: y.passes[p][field],
          eventA: position === null ? null : (sa[position] || null), eventB: position === null ? null : (sb[position] || null) });
      }
    }
  }
  if (!out.equal) {
    const d = out.firstDifference;
    // a guard-binding difference rests on a recognised guard event that the capture recorded (its code), never on "an error happened"
    const failures = [];
    if (d.eventA === 'e') failures.push({ side: 'g0', failure: a.firstFailure || null });
    if (d.eventB === 'e') failures.push({ side: 'g1', failure: b.firstFailure || null });
    d.failures = failures;
    const recognised = failures.filter(function (f) { return f.failure !== null && GUARD_CODES.indexOf(f.failure.code) >= 0; });
    out.verdict = budgetPresent && recognised.length > 0 ? 'guard-binding-difference' : 'mismatch';
    if (recognised.length > 0) out.guardCode = recognised[0].failure.code;
    if (failures.length > 0 && recognised.length === 0) {
      out.unrecognisedFailure = failures.map(function (f) {
        return { side: f.side, code: f.failure ? f.failure.code : null, kind: f.failure ? f.failure.kind : 'not recorded' };
      });
    }
  }
  return out;
}

// --- sums for the documents ------------------------------------------------------------------------------------------------------------

function passesOf(samples, filter) {
  const out = [];
  samples.forEach(function (s) {
    s.passes.forEach(function (p) { if (!filter || filter(p, s)) out.push(p); });
  });
  return out;
}

/** Physical work of a list of passes: removals, DFS calls and node checks, restricted solves, skipped counts and the G1 outcomes. */
function sumPasses(passes) {
  const t = { passes: passes.length, removals: 0, accepted: 0, rejectedAmbiguous: 0, rejectedTechniques: 0, errors: 0, dfsCalls: 0,
    dfsChecks: 0, restrictedSolves: 0, skippedDfs: 0, wallMs: 0, g1: blankG1(), byOutcome: { accepted: blankOutcome(),
      ambiguous: blankOutcome(), techniques: blankOutcome() } };
  passes.forEach(function (p) {
    t.removals += p.removals;
    t.accepted += p.accepted;
    t.rejectedAmbiguous += p.rejectedAmbiguous;
    t.rejectedTechniques += p.rejectedTechniques;
    t.errors += p.errors;
    t.dfsCalls += p.dfsCalls;
    t.dfsChecks += p.dfsChecks;
    t.restrictedSolves += p.restrictedSolves;
    t.wallMs += p.wallMs;
    if (p.g1) {
      Object.keys(t.g1).forEach(function (k) { t.g1[k] += g1Counter(p.g1, k); });
      t.skippedDfs += p.g1.proved;
    }
    ['accepted', 'ambiguous', 'techniques'].forEach(function (k) {
      Object.keys(t.byOutcome[k]).forEach(function (f) { t.byOutcome[k][f] += p.byOutcome[k][f]; });
    });
  });
  t.wallMs = round3(t.wallMs);
  return t;
}

module.exports = { SCHEMA, MINIMAL_NODE_CAP, PROBE_NODE_CAP, PROBE_STEP_CAP, PROBE_GROUPS, DIAG_BUDGET_MS, GUARD_CODES, STOP_CODES, COUNTER_UNITS,
  PHASES, BUCKETS, encodeGivens, decodeGivens, encodeSigns, decodeSigns, cluesOf, createRuntime, classifySample, missSplit, judgeMinimality,
  ruleBlock, aboveFloorGroups, firstMissed, sampleInputDigest, probeInputDigest, planDiagnosis, compareArms, passesOf, sumPasses,
  tuneRevealCount, blankG1, g1Counter };
