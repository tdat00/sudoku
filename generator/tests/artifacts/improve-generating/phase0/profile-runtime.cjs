'use strict';

/*
 * Runtime of the IG-S07 SM1 profile (test side, provisional (pre-freeze)): a wall-clock span profiler for one native
 * generation request inside one worker. It is the object the private adapter `profile` calls as `SG.__igProf`; it exists
 * only between `install` and `uninstall`, so the same patched sources are the native code when it is absent.
 *
 * What it measures. Every millisecond between `begin` and `finish` is booked once, to a cell of the matrix
 *   context x purpose x primitive      (ms and number of frames)
 * or, for the finders, to
 *   context x purpose x finder         (calls, hits, ms, hit ms, throw ms, budget checks, throws)
 * so nested work is attributed to the innermost frame and never counted twice (exclusive accounting by segments: at every
 * boundary the time since the previous boundary goes to the frame that was on top). The sum of all cells therefore equals
 * the root span except for floating-point error; whatever the hooks do not name stays visible in the `self` primitive of
 * the enclosing purpose (`request` for the gaps of the restart loop) and is never redistributed.
 *
 *  - context    what kind of work the time belongs to: setup (configure, buildModel), attempt (full grid, extra structure,
 *               the gaps between samples), ordinary sample, proposal sample, local continuation (the local-search sample
 *               of an attempt: its dig, rating and tune steps included).
 *  - purpose    the call site that asked: the pipeline steps (`step:*`) and the semantic stages of the digger (`stageA.oracle`,
 *               `stageB.objective`, `safety.count`, `keeper.count`, `refine`, `proposal.rating`, `local.*`).
 *  - primitive  what ran for it: its own code (`self`), the logical solver (`solve.setup` = state, ladder and report outside
 *               the loop; `solve.loop` = the ladder loop outside finders and applications; `apply` = applying Findings),
 *               the finders (a separate matrix), the DFS entry points, a canonical rating (`rate.canonical`: the code of
 *               `difficulty.rate` outside its solve) and the full-grid generator.
 *
 * Cost control. A finder call costs two clock reads and a few array updates; no process CPU accounting is called per
 * finder. Nothing here draws a random number, solves, or charges the budget: the counters only observe (the loop's budget is
 * forwarded unchanged, one call for each call the engine makes). The factors that
 * matter for the overhead are calibrated by `measureCosts`.
 */

const CTX = Object.freeze(['setup', 'attempt', 'ordinary', 'proposal', 'local']);
const CTX_SETUP = 0;
const CTX_ATTEMPT = 1;
const CTX_ORDINARY = 2;
const CTX_PROPOSAL = 3;
const CTX_LOCAL = 4;

const PURPOSES = Object.freeze([
  'request', 'step:configure', 'step:buildModel', 'step:fullGrid', 'step:extraStructure', 'step:dig', 'step:rate',
  'step:tune', 'stageA.oracle', 'stageB.objective', 'safety.count', 'keeper.count', 'refine', 'proposal.rating',
  'local.search', 'local.unique', 'local.rating'
]);

const PRIMS = Object.freeze(['self', 'solve.setup', 'solve.loop', 'apply', 'finder', 'dfs.count', 'dfs.stillUnique',
  'dfs.solve', 'dfs.searchFrom', 'rate.canonical', 'fullGrid.generate']);
const P_SELF = 0;
const P_SOLVE = 1;
const P_LOOP = 2;
const P_APPLY = 3;
const P_DFS_COUNT = 5;
const P_DFS_STILL = 6;
const P_DFS_SOLVE = 7;
const P_DFS_FROM = 8;
const P_RATE = 9;
const P_GRID = 10;

const MAX_DEPTH = 128;
const MAX_PURPOSES = 48;
const MAX_SLOTS = 64;
const REASONS = Object.freeze(['techniques', 'tooHard', 'ambiguous']);
const PASS_LADDER_INDEX = 0;

const round3 = function (x) { return Math.round(x * 1000) / 1000; };
const num = function (x) { return typeof x === 'number' && Number.isFinite(x) ? x : null; };

/** The runtime of one profiled request. `options.now` replaces the clock (tests), `options.techniqueIds` seeds the finder slots. */
function create(options) {
  const opts = options || {};
  const now = typeof opts.now === 'function' ? opts.now : function () { return performance.now(); };
  const NC = CTX.length;
  const NP = MAX_PURPOSES;
  const NS = MAX_SLOTS;
  const NR = PRIMS.length;

  const purposeNames = PURPOSES.slice();
  const purposeIndex = new Map(purposeNames.map(function (p, i) { return [p, i]; }));
  function purposeOf(label) {
    let i = purposeIndex.get(label);
    if (i === undefined) {
      if (purposeNames.length >= NP) throw new Error('the profile has no room for the purpose ' + label);
      i = purposeNames.length;
      purposeNames.push(label);
      purposeIndex.set(label, i);
    }
    return i;
  }
  const slotNames = [];
  const slotIndex = new Map();
  function slotOf(id) {
    let i = slotIndex.get(id);
    if (i === undefined) {
      if (slotNames.length >= NS) throw new Error('the profile has no room for the finder ' + id);
      i = slotNames.length;
      slotNames.push(id);
      slotIndex.set(id, i);
    }
    return i;
  }
  (opts.techniqueIds || []).forEach(slotOf);

  const stageTime = new Float64Array(NC * NP * NR);
  const stageCount = new Float64Array(NC * NP * NR);
  const fCalls = new Float64Array(NC * NP * NS);
  const fHits = new Float64Array(NC * NP * NS);
  const fMs = new Float64Array(NC * NP * NS);
  const fHitMs = new Float64Array(NC * NP * NS);
  const fThrowMs = new Float64Array(NC * NP * NS);
  const fChecks = new Float64Array(NC * NP * NS);
  const fThrows = new Float64Array(NC * NP * NS);
  const inclMs = new Float64Array(NP);
  const inclFrames = new Float64Array(NP);

  const fStart = new Float64Array(MAX_DEPTH);
  const fPk = new Int32Array(MAX_DEPTH);
  const fPrim = new Int32Array(MAX_DEPTH);
  let sp = -1;
  let ctx = CTX_SETUP;
  let lastT = 0;
  let rootT0 = 0;
  let rootMs = null;
  let begun = false;
  let finished = false;
  let leaked = 0;
  let opened = 0;
  let maxDepthSeen = 0;
  let depthAtFinish = null;
  let attempt = null;
  let localPending = false;
  let curSample = null;
  const sampleRows = [];
  let nSolves = 0;
  let nRates = 0;
  let finderMsTotal = 0;
  let finderTimers = 0;
  let applyTimers = 0;

  // loopChecks: the observed `budget.check()` calls of the two sites of the ladder loop; loopDerived: the r1 estimate from the
  // finder passes (kept only to show where it differs from the observation, never as a count)
  const c = { checks: 0, loopChecks: 0, loopDerived: 0, passes: 0, applied: 0, dfsEntries: 0, dfsChecks: 0, dfsBacktracks: 0 };
  const grid = { calls: 0, attempts: 0, restarts: 0, backtracks: 0, fastSeeds: 0 };
  const guided = CTX.map(function () { return { rounds: 0, candidates: 0, pool: 0, minPool: null, maxPool: null }; });
  const reasonsA = new Float64Array(NC * REASONS.length);
  const reasonsB = new Float64Array(NC * REASONS.length);

  function topIndex() {
    return (ctx * NP + fPk[sp]) * NR + fPrim[sp];
  }

  // Books the time since the previous boundary to the frame that was on top, then moves the boundary.
  function seg(t) {
    if (sp >= 0) stageTime[topIndex()] += t - lastT;
    lastT = t;
  }

  function openFrame(pk, prim) {
    const t = now();
    seg(t);
    if (sp + 1 >= MAX_DEPTH) throw new Error('the profile stack is full');
    sp++;
    fStart[sp] = t;
    fPk[sp] = pk;
    fPrim[sp] = prim;
    stageCount[topIndex()]++;
    opened++;
    if (sp > maxDepthSeen) maxDepthSeen = sp;
    return sp + 1;
  }

  function openPrim(prim) {
    return openFrame(sp >= 0 ? fPk[sp] : 0, prim);
  }

  function closeTop(wasLeaked) {
    const t = now();
    seg(t);
    const incl = t - fStart[sp];
    if (fPrim[sp] === P_SELF) {
      inclMs[fPk[sp]] += incl;
      inclFrames[fPk[sp]]++;
    }
    if (wasLeaked) leaked++;
    sp--;
    if (sp < 0) rootMs = (rootMs === null ? 0 : rootMs) + incl;
  }

  // Closes the frame of `token` and, first, every frame above it that was never closed (an abandoned generator).
  function close(token) {
    const target = token - 1;
    if (!(target >= 0 && target <= sp)) return;
    while (sp > target) closeTop(true);
    closeTop(false);
  }

  function setCtx(next) {
    if (next === ctx) return;
    seg(now());
    ctx = next;
  }

  function open(label) {
    return openFrame(purposeOf(label), P_SELF);
  }

  function call(label, fn, a, b, d, e, f, g, h) {
    const token = openFrame(purposeOf(label), P_SELF);
    try {
      return fn(a, b, d, e, f, g, h);
    } finally {
      close(token);
    }
  }

  function oracleCall(fn, a, b, d, e, f, g) {
    const token = openFrame(purposeOf('stageA.oracle'), P_SELF);
    let ok;
    try {
      ok = fn(a, b, d, e, f, g);
      return ok;
    } finally {
      close(token);
      if (ok === false) {
        const r = fn.reason === 'techniques' ? 0 : fn.reason === 'tooHard' ? 1 : 2;
        reasonsA[ctx * REASONS.length + r]++;
      }
    }
  }

  function refusal(value) {
    const r = value === -1 ? 0 : value === -2 ? 1 : 2;
    reasonsB[ctx * REASONS.length + r]++;
  }

  function guidedRound(candidates, pool) {
    const g = guided[ctx];
    g.rounds++;
    g.candidates += candidates;
    g.pool += pool;
    if (g.minPool === null || pool < g.minPool) g.minPool = pool;
    if (g.maxPool === null || pool > g.maxPool) g.maxPool = pool;
  }

  function stepOpen(stepId, args) {
    if (stepId === 'configure' || stepId === 'buildModel') setCtx(CTX_SETUP);
    else if (stepId === 'fullGrid' || stepId === 'extraStructure') {
      setCtx(CTX_ATTEMPT);
      if (args && typeof args.attempt === 'number') attempt = args.attempt;
    }
    return openFrame(purposeOf('step:' + stepId), P_SELF);
  }

  function stepClose(token, stepId) {
    close(token);
    // The tune step ends a sample (or the local continuation): what follows belongs to the restart loop.
    if (stepId === 'tune') setCtx(CTX_ATTEMPT);
  }

  function localNext() {
    localPending = true;
  }

  function levelEnter(optionsOfLevel) {
    const where = optionsOfLevel && optionsOfLevel.where ? optionsOfLevel.where : {};
    let kind = optionsOfLevel && optionsOfLevel.proposal === true ? CTX_PROPOSAL : CTX_ORDINARY;
    if (localPending) {
      kind = CTX_LOCAL;
      localPending = false;
    }
    setCtx(kind);
    curSample = {
      attempt: typeof where.attempt === 'number' ? where.attempt : attempt,
      sample: typeof where.sample === 'number' ? where.sample : null,
      ctx: kind, t0: now(), solves: nSolves, rates: nRates, dfsEntries: c.dfsEntries, finderMs: finderMsTotal
    };
  }

  function sampleResult(info) {
    const s = curSample;
    if (s === null) return;
    curSample = null;
    const t = now();
    const rating = info && info.rating ? info.rating : null;
    const stats = info && info.stats ? info.stats : null;
    sampleRows.push({
      attempt: s.attempt, sample: s.sample, kind: CTX[s.ctx], startMs: round3(s.t0 - rootT0), wallMs: round3(t - s.t0),
      exact: !!(info && info.exact === true), shallow: !!(info && info.shallow === true),
      level: rating ? rating.level : null,
      score: rating && typeof rating.score === 'number' ? rating.score : null,
      solved: rating ? rating.solved === true : null,
      clues: info && typeof info.clues === 'number' ? info.clues : null,
      stats: stats ? { groups: num(stats.groups), tried: num(stats.tried), accepted: num(stats.accepted),
        rejected: num(stats.rejected), skipped: num(stats.skipped), oracleCalls: num(stats.oracleCalls) } : null,
      solves: nSolves - s.solves, rates: nRates - s.rates, dfsEntries: c.dfsEntries - s.dfsEntries,
      finderMs: round3(finderMsTotal - s.finderMs)
    });
  }

  // --- the logical solver -----------------------------------------------------------------------------------------

  class SolveHandle {
    constructor(slots) {
      this.slots = slots;
    }

    /** The boundary before a finder call or an application: books the time so far, returns the clock reading. */
    t() {
      const t = now();
      seg(t);
      return t;
    }

    finder(i, t0, found, ok, k0) {
      const t1 = now();
      const dt = t1 - t0;
      lastT = t1;
      finderTimers++;
      finderMsTotal += dt;
      const fi = (ctx * NP + fPk[sp]) * NS + this.slots[i];
      fCalls[fi]++;
      fMs[fi] += dt;
      if (!ok) {
        fThrows[fi]++;
        fThrowMs[fi] += dt;
      } else if (found !== null && found !== undefined) {
        fHits[fi]++;
        fHitMs[fi] += dt;
      }
      const dk = c.checks - k0;
      if (dk !== 0) fChecks[fi] += dk;
      if (i === PASS_LADDER_INDEX) c.passes++;
    }

    applied(t0) {
      const t1 = now();
      lastT = t1;
      applyTimers++;
      c.applied++;
      stageTime[(ctx * NP + fPk[sp]) * NR + P_APPLY] += t1 - t0;
      stageCount[(ctx * NP + fPk[sp]) * NR + P_APPLY]++;
    }
  }

  function solveBegin(ladder) {
    const slots = new Int32Array(ladder.length);
    for (let i = 0; i < ladder.length; i++) slots[i] = slotOf(ladder[i].id);
    return new SolveHandle(slots);
  }

  function iterateWrap(fn, model, state, ladder, tctx, run) {
    const token = openPrim(P_LOOP);
    const p0 = c.passes;
    let outcome = -1;
    try {
      outcome = fn(model, state, ladder, tctx, run);
      return outcome;
    } finally {
      // The r1 derivation (one check per finder pass and one before a stuck result), kept as a diagnostic: it misses a check that
      // throws before the first finder or before returning STUCK, and every pass of an empty ladder.
      if (tctx.budget !== null) c.loopDerived += (c.passes - p0) + (outcome === 0 ? 1 : 0);
      close(token);
    }
  }

  // The budget of one `iterate` call as the loop sees it: the same object, with `check` counted before it runs, so a check that
  // throws is counted too. Both check sites of the loop (the top of a pass and the one before a stuck result) go through it.
  function loopBudget(real) {
    const seen = Object.create(real);
    Object.defineProperty(seen, 'check', { value: function check() {
      c.loopChecks++;
      real.check();
    }, enumerable: true, writable: true, configurable: true });
    return seen;
  }

  function countedCheck(budget) {
    return function check() {
      c.checks++;
      budget.check();
    };
  }

  // --- install / uninstall ------------------------------------------------------------------------------------------

  const api = {
    c: c, open: open, close: close, call: call, oracleCall: oracleCall, refusal: refusal, guidedRound: guidedRound,
    stepOpen: stepOpen, stepClose: stepClose, localNext: localNext, levelEnter: levelEnter,
    sampleResult: sampleResult, solveBegin: solveBegin, iterate: iterateWrap, countedCheck: countedCheck, loopBudget: loopBudget
  };

  let installed = [];
  let host = null;

  function wrap(obj, name, prim, after) {
    const original = obj[name];
    if (typeof original !== 'function') {
      const err = new Error('the engine has no ' + name + ' to observe');
      err.code = 'capability-missing';
      throw err;
    }
    const wrapper = function () {
      if (prim === P_SOLVE) nSolves++;
      else if (prim === P_RATE) nRates++;
      const token = openPrim(prim);
      try {
        return original.apply(this, arguments);
      } finally {
        close(token);
        if (after !== undefined) after(arguments);
      }
    };
    obj[name] = wrapper;
    installed.push({ obj: obj, name: name, original: original, wrapper: wrapper });
  }

  function afterGrid(args) {
    const stats = args.length > 3 && args[3] && typeof args[3] === 'object' ? args[3].stats : null;
    grid.calls++;
    if (stats && typeof stats === 'object') {
      if (Number.isFinite(stats.attempts)) grid.attempts += stats.attempts;
      if (Number.isFinite(stats.restarts)) grid.restarts += stats.restarts;
      if (Number.isFinite(stats.backtracks)) grid.backtracks += stats.backtracks;
      if (stats.fastSeed === true) grid.fastSeeds++;
    }
  }

  /** Publishes `SG.__igProf` and wraps the entry points of the engine that the hooks cannot reach. */
  function install(SG) {
    if (host !== null) throw new Error('the profile is already installed');
    if (SG.__igProf !== undefined) throw new Error('another profile is installed in this engine instance');
    host = SG;
    try {
      wrap(SG.logicalSolver, 'solve', P_SOLVE);
      wrap(SG.difficulty, 'rate', P_RATE);
      wrap(SG.dfs, 'countSolutions', P_DFS_COUNT);
      wrap(SG.dfs, 'stillUnique', P_DFS_STILL);
      wrap(SG.dfs, 'solve', P_DFS_SOLVE);
      wrap(SG.dfs, 'searchFrom', P_DFS_FROM);
      wrap(SG.fullGrid, 'generate', P_GRID, afterGrid);
    } catch (err) {
      uninstall();
      throw err;
    }
    SG.__igProf = api;
    return { wrapped: installed.map(function (w) { return w.name; }) };
  }

  /** Restores every wrapped function and removes the hook object; reports whether each restoration is intact. */
  function uninstall() {
    const problems = [];
    if (host === null) return { restored: true, problems: problems, wasInstalled: false };
    for (let i = installed.length - 1; i >= 0; i--) {
      const w = installed[i];
      if (w.obj[w.name] !== w.wrapper) problems.push(w.name + ' was replaced by other code');
      w.obj[w.name] = w.original;
    }
    if (host.__igProf !== undefined && host.__igProf !== api) problems.push('SG.__igProf was replaced by other code');
    delete host.__igProf;
    const intact = installed.every(function (w) { return w.obj[w.name] === w.original; }) &&
      host.__igProf === undefined;
    installed = [];
    host = null;
    return { restored: intact && problems.length === 0, problems: problems, wasInstalled: true };
  }

  // --- begin / finish / snapshot ------------------------------------------------------------------------------------

  function begin() {
    if (begun) throw new Error('the profile has begun');
    begun = true;
    sp = -1;
    lastT = now();
    rootT0 = lastT;
    openFrame(0, P_SELF);
  }

  /** Closes every frame still open (the unwinding of an error or an abandoned generator) and returns the snapshot. */
  function finish() {
    if (!begun) throw new Error('the profile has not begun');
    if (!finished) {
      depthAtFinish = sp;
      while (sp > 0) closeTop(true);
      if (sp === 0) closeTop(false);
      finished = true;
    }
    return snapshot();
  }

  function snapshot() {
    const stage = [];
    let stageSum = 0;
    for (let x = 0; x < NC; x++) {
      for (let p = 0; p < purposeNames.length; p++) {
        for (let r = 0; r < NR; r++) {
          const i = (x * NP + p) * NR + r;
          if (stageTime[i] === 0 && stageCount[i] === 0) continue;
          stageSum += stageTime[i];
          stage.push([CTX[x], purposeNames[p], PRIMS[r], round3(stageTime[i]), stageCount[i]]);
        }
      }
    }
    const finders = [];
    let finderSum = 0;
    let finderCalls = 0;
    for (let x = 0; x < NC; x++) {
      for (let p = 0; p < purposeNames.length; p++) {
        for (let s = 0; s < slotNames.length; s++) {
          const i = (x * NP + p) * NS + s;
          if (fCalls[i] === 0) continue;
          finderSum += fMs[i];
          finderCalls += fCalls[i];
          finders.push([CTX[x], purposeNames[p], slotNames[s], fCalls[i], fHits[i], round3(fMs[i]), round3(fHitMs[i]),
            round3(fThrowMs[i]), fChecks[i], fThrows[i]]);
        }
      }
    }
    const inclusive = {};
    for (let p = 0; p < purposeNames.length; p++) {
      if (inclFrames[p] > 0) inclusive[purposeNames[p]] = { ms: round3(inclMs[p]), frames: inclFrames[p] };
    }
    const reasons = function (arr) {
      const out = {};
      for (let x = 0; x < NC; x++) {
        const row = {};
        let any = false;
        REASONS.forEach(function (name, r) {
          row[name] = arr[x * REASONS.length + r];
          if (row[name] > 0) any = true;
        });
        if (any) out[CTX[x]] = row;
      }
      return out;
    };
    const total = rootMs === null ? null : rootMs;
    return {
      schema: 'ig07-profile/1',
      clock: 'wall milliseconds (monotonic), read at frame boundaries and around every finder call and every applied ' +
        'Finding; no process CPU accounting per call',
      dims: { contexts: CTX.slice(), purposes: purposeNames.slice(), primitives: PRIMS.slice(), finders: slotNames.slice() },
      rootMs: total === null ? null : round3(total),
      stage: stage,
      finders: finders,
      inclusiveMs: inclusive,
      totals: {
        stageMs: round3(stageSum), finderMs: round3(finderSum), sumMs: round3(stageSum + finderSum),
        residualMs: total === null ? null : round3(total - stageSum - finderSum),
        note: 'sum = every booked cell (stage cells hold exclusive time, finder cells the finder calls); residual = root - sum ' +
          '(floating-point error only: no time is left unbooked)'
      },
      counters: {
        solves: nSolves, canonicalRates: nRates, finderCalls: finderCalls, finderMs: round3(finderSum),
        finderChecks: c.checks, loopChecks: c.loopChecks, loopChecksDerived: c.loopDerived, passes: c.passes, applied: c.applied,
        dfsEntries: c.dfsEntries, dfsSearchChecks: c.dfsChecks, dfsBacktracks: c.dfsBacktracks
      },
      grid: Object.assign({}, grid),
      guided: guided.map(function (g, x) {
        return Object.assign({ context: CTX[x] }, g);
      }).filter(function (g) { return g.rounds > 0; }),
      refusals: { stageA: reasons(reasonsA), objective: reasons(reasonsB) },
      samples: sampleRows.slice(),
      nest: { framesOpened: opened, leakedFramesClosedAtUnwind: leaked, maxDepth: maxDepthSeen + 1,
        framesOpenAboveRootAtFinish: depthAtFinish },
      ops: { finderTimers: finderTimers, applyTimers: applyTimers, frames: opened, countedChecks: c.checks,
        dfsCounterIncrements: c.dfsEntries + c.dfsChecks + c.dfsBacktracks }
    };
  }

  return { api: api, install: install, uninstall: uninstall, begin: begin, finish: finish, snapshot: snapshot,
    setCtx: setCtx, open: open, close: close, call: call,
    state: function () { return { depth: sp + 1, context: CTX[ctx], leaked: leaked }; } };
}

/**
 * The problems of a snapshot (an empty list: consistent): the root closed, the booked cells add up to the root, no frame left
 * open, no negative time, counters that agree with the rows. `allowLeaks` accepts frames that were closed by the unwinding
 * of an abandoned generator.
 */
function consistency(snap, options) {
  const o = options || {};
  const problems = [];
  if (!snap || snap.schema !== 'ig07-profile/1') return ['not a profile snapshot'];
  if (snap.rootMs === null) problems.push('the root span was not closed');
  const cells = snap.stage.length + snap.finders.length;
  const tolerance = 0.0006 * (cells + 1) + 0.02;
  if (snap.rootMs !== null && Math.abs(snap.totals.residualMs) > tolerance) {
    problems.push('the booked cells differ from the root by ' + snap.totals.residualMs + ' ms (tolerance ' +
      tolerance.toFixed(3) + ')');
  }
  if (snap.nest.framesOpenAboveRootAtFinish !== 0) {
    problems.push(snap.nest.framesOpenAboveRootAtFinish + ' frames were still open above the root at finish');
  }
  if (!o.allowLeaks && snap.nest.leakedFramesClosedAtUnwind !== 0) {
    problems.push(snap.nest.leakedFramesClosedAtUnwind + ' frames were closed by an unwinding');
  }
  let calls = 0;
  snap.stage.forEach(function (row) {
    if (!(row[3] >= -0.0006)) problems.push('negative time in ' + row.slice(0, 3).join('/'));
    if (!(Number.isInteger(row[4]) && row[4] >= 0)) problems.push('bad frame count in ' + row.slice(0, 3).join('/'));
  });
  snap.finders.forEach(function (row) {
    calls += row[3];
    if (!(row[4] <= row[3]) || !(row[9] <= row[3])) problems.push('hits or throws above calls for ' + row[2]);
    if (!(row[5] >= -0.0006) || row[6] + row[7] > row[5] + 0.002) problems.push('hit and throw time above the total for ' + row[2]);
  });
  if (snap.counters.finderCalls !== calls) problems.push('finder calls differ from the rows');
  const sumCount = function (prim) {
    return snap.stage.reduce(function (s, row) { return row[2] === prim ? s + row[4] : s; }, 0);
  };
  if (sumCount('apply') !== snap.counters.applied) problems.push('applied Findings differ from the apply rows');
  if (sumCount('solve.setup') !== snap.counters.solves) problems.push('solves differ from the solve rows');
  if (sumCount('rate.canonical') !== snap.counters.canonicalRates) problems.push('canonical rates differ from the rate rows');
  return problems;
}

/**
 * Unit costs of the instrumentation in ns, measured on the calling thread with the real clock: one clock read, one finder
 * timer pair with its bookkeeping, one applied-Finding timer, one open/close frame pair, one counted budget check and one
 * counter increment. Medians of `repeats` loops; a calibration, not a correction of any measured time.
 */
function measureCosts(options) {
  const o = options || {};
  const n = o.iterations || 200000;
  const repeats = o.repeats || 5;
  const clock = function () { return performance.now(); };
  const median = function (values) {
    const sorted = values.slice().sort(function (a, b) { return a - b; });
    return sorted[Math.floor(sorted.length / 2)];
  };
  const timeLoop = function (body) {
    const runs = [];
    for (let r = 0; r < repeats; r++) {
      const t0 = clock();
      body();
      runs.push((clock() - t0) * 1e6 / n);
    }
    return median(runs);
  };
  let sink = 0;
  const emptyNs = timeLoop(function () {
    for (let i = 0; i < n; i++) sink += i & 7;
  });
  const clockNs = timeLoop(function () {
    for (let i = 0; i < n; i++) sink += clock() > 0 ? 1 : 0;
  }) - emptyNs;
  const ids = ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'];
  const rt = create({ techniqueIds: ids });
  rt.begin();
  const ladder = ids.map(function (id) { return { id: id }; });
  const handle = rt.api.solveBegin(ladder);
  const token = rt.api.open('calibration');
  const finderNs = timeLoop(function () {
    for (let i = 0; i < n; i++) {
      const t0 = handle.t();
      handle.finder(i & 7, t0, null, true, rt.api.c.checks);
    }
  }) - emptyNs;
  const applyNs = timeLoop(function () {
    for (let i = 0; i < n; i++) {
      const t0 = handle.t();
      handle.applied(t0);
    }
  }) - emptyNs;
  const noop = function () { return 0; };
  const frameNs = timeLoop(function () {
    for (let i = 0; i < n; i++) sink += rt.api.call('calibration', noop);
  }) - emptyNs;
  const check = rt.api.countedCheck({ check: noop });
  const checkNs = timeLoop(function () {
    for (let i = 0; i < n; i++) check();
  }) - emptyNs;
  const c = rt.api.c;
  const counterNs = timeLoop(function () {
    for (let i = 0; i < n; i++) c.dfsEntries++;
  }) - emptyNs;
  rt.api.close(token);
  rt.finish();
  const clamp = function (x) { return Math.max(0, Math.round(x * 10) / 10); };
  return { iterations: n, repeats: repeats, clockReadNs: clamp(clockNs), finderTimerPairNs: clamp(finderNs),
    applyTimerNs: clamp(applyNs), framePairNs: clamp(frameNs), countedCheckNs: clamp(checkNs),
    counterIncrementNs: clamp(counterNs), sink: sink > 0 };
}

module.exports = { CTX, PURPOSES, PRIMS, REASONS, MAX_DEPTH, MAX_PURPOSES, MAX_SLOTS, CTX_SETUP, CTX_ATTEMPT,
  CTX_ORDINARY, CTX_PROPOSAL, CTX_LOCAL, create, consistency, measureCosts };
