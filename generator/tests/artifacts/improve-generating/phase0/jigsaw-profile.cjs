'use strict';

/*
 * The stage beacon of IG-S08 (test side, provisional (pre-freeze), pre-MS07): the observation runtime of the bounded
 * attribution of the Jigsaw Expert request of seed 1111 (SM3), plus the pure functions that read its shared memory, reconcile
 * its journal and compute the attribution. No engine, no file and no clock is used by the pure functions.
 *
 * Why shared memory. The request runs in a worker thread inside one synchronous call that no timer can interrupt, and the
 * worker is terminated at the observation guard without a word. The counters therefore live in a SharedArrayBuffer that the
 * responsive host reads at any time (a heartbeat) and after the termination (the post-mortem), and every stage entry is also
 * posted to the host as a message before the synchronous work begins. A counter only grows, so every read is a lower bound.
 *
 * What is measured. Wall time is booked once, by segments, to a cell of context (the stage of the pipeline or one of its inner
 * pieces) x sub (own code, one registered finder, the logical solver's own code, the rating's own code, the depth-first
 * search, the full-grid generator): the exclusive time of a nested span is never counted twice. Calls and hits are counted per
 * cell. Count-based progress (the layout attempts and growth backtracks, the feasibility calls, the full-grid searches,
 * restarts and backtracks, the depth-first nodes, checks and backtracks) is booked to the context that was current.
 *
 * What is NOT measured (unknown, never zero): the totals of the solver's budget checks (the beacon does not instrument them: the
 * request passes no external budget, but the digger's own internal budgets, such as the stage B objective's step guard and the
 * node slices of the uniqueness counts, issue checks that this instrument does not count, and the propagation checks of the chain
 * finders bypass `ctx.check` in any case), the work inside constraint propagation, the time of applying a Finding (it is part of
 * the logical solver's own code) and anything the private source does not expose.
 *
 * Counter scope. The depth-first counters (nodes, checks, backtracks) are live: they include a search that is still running. The
 * full-grid counters (searches, restarts, backtracks) are booked when a search returns, so they count completed searches only; a
 * running search is in none of them. All counters are cumulative over the whole request, per context, never per attempt.
 */

const VERSION = 1;
const MAGIC = 0x1608;

const NCTX = 24;
const SUBS = 48;
const NCELL = NCTX * SUBS;
const TECH_MAX = 42;
const SUB = Object.freeze({ self: 0, solver: 43, rate: 44, dfs: 45, grid: 46, otherFinder: 47 });

// The contexts. `outside` is the pipeline glue between two stages (and the time before the first one).
const CTX = Object.freeze({
  outside: 0, configure: 1, buildModel: 2, layoutGrowth: 3, layoutSolvable: 4, layoutPlain: 5, fullGrid: 6,
  extraStructure: 7, dig: 8, digOracle: 9, digObjective: 10, digVerify: 11, digSafety: 12, digKeeper: 13,
  digProposalRating: 14, digRefine: 15, rate: 16, tune: 17, local: 18, localUnique: 19, localRating: 20, localRefine: 21
});
const CTX_NAMES = Object.freeze(['outside', 'configure', 'buildModel', 'layout.growth', 'layout.solvable', 'layout.plain',
  'fullGrid', 'extraStructure', 'dig', 'dig.oracle(stageA)', 'dig.objective(stageB)', 'dig.verify', 'dig.safetyCount',
  'dig.keeperCount', 'dig.proposalRating', 'dig.refine', 'rate', 'tune', 'local', 'local.unique', 'local.rating',
  'local.refine', 'reserved22', 'reserved23']);
// The pipeline stage a context belongs to (the local continuation is the dig step of a local sample, reported on its own).
const STAGE_OF = Object.freeze(['outside', 'configure', 'buildModel', 'buildModel', 'buildModel', 'buildModel', 'fullGrid',
  'extraStructure', 'dig', 'dig', 'dig', 'dig', 'dig', 'dig', 'dig', 'dig', 'rate', 'tune', 'local', 'local', 'local',
  'local', 'outside', 'outside']);
const STAGE_ORDER = Object.freeze(['outside', 'configure', 'buildModel', 'fullGrid', 'extraStructure', 'dig', 'rate', 'tune',
  'local']);
const STEP_CTX = Object.freeze({ configure: CTX.configure, buildModel: CTX.buildModel, fullGrid: CTX.fullGrid,
  extraStructure: CTX.extraStructure, dig: CTX.dig, rate: CTX.rate, tune: CTX.tune });
const STEP_INDEX = Object.freeze({ configure: 0, buildModel: 1, fullGrid: 2, extraStructure: 3, dig: 4, rate: 5, tune: 6 });
const STEP_NAMES = Object.freeze(['configure', 'buildModel', 'fullGrid', 'extraStructure', 'dig', 'rate', 'tune']);
// Contexts entered a few times per sample: each entry is also posted (a durable marker before the synchronous work). The hot
// ones (the stage A oracle, the stage B objective, the keeper and the local search's own counts) are not posted.
const MARKED_CTX = Object.freeze([CTX.digVerify, CTX.digSafety, CTX.digProposalRating, CTX.digRefine, CTX.localRefine]);
const KIND = Object.freeze({ none: 0, ordinary: 1, proposal: 2, local: 3 });
const KIND_NAMES = Object.freeze(['none', 'ordinary', 'proposal', 'local']);
const STATE = Object.freeze({ unset: 0, running: 1, ok: 2, error: 3 });
const STATE_NAMES = Object.freeze(['unset', 'running', 'finished', 'finished-with-error']);

const HEADER_NAMES = Object.freeze(['magic', 'version', 'seq', 'cell', 'ctx', 'lastT', 'kind', 'attempt', 'sample', 'step',
  'markers', 'dropped', 'depth', 'tBegin', 'tEnd', 'state']);
const GLOBAL_NAMES = Object.freeze(['layoutAttempts', 'layoutGrowthBacktracks', 'layoutLevels', 'layoutFeasibility',
  'layoutUnsolvable', 'layoutHard', 'layoutAccepted', 'gridUnlimitedEntered', 'samples', 'reserved9', 'reserved10',
  'reserved11', 'reserved12', 'reserved13', 'reserved14', 'reserved15']);
const CTX_COUNTER_NAMES = Object.freeze(['dfsNodes', 'dfsChecks', 'dfsBacktracks', 'gridSearches', 'gridRestarts',
  'gridBacktracks']);

const OFF = {};
(function layout() {
  let at = 0;
  const take = function (name, n) {
    OFF[name] = at;
    at += n;
  };
  take('header', 16);
  take('globals', 16);
  CTX_COUNTER_NAMES.forEach(function (name) { take(name, NCTX); });
  take('ms', NCELL);
  take('calls', NCELL);
  take('hits', NCELL);
  OFF.total = at;
}());
const H = {};
HEADER_NAMES.forEach(function (name, i) { H[name] = OFF.header + i; });
const G = {};
GLOBAL_NAMES.forEach(function (name, i) { G[name] = OFF.globals + i; });

const DEFAULT_MAX_MARKERS = 4000;

function allocate() {
  return new SharedArrayBuffer(OFF.total * 8);
}

function defaultEpoch() {
  return performance.timeOrigin + performance.now();
}

function round6(x) {
  return Math.round(x * 1e6) / 1e6;
}

// --- the beacon (worker side) ---------------------------------------------------------------------------------------------

/**
 * One beacon over a shared buffer. `post(message)` publishes a durable marker to the host (messages of type `ig08-ev`),
 * `epoch()` is the wall clock in ms, `techniques` the registered finders ({ id, group }). `begin`/`finish` bracket a request;
 * `install`/`uninstall` publish `SG.__igJig` and wrap the engine entry points that no source transform reaches.
 */
function createBeacon(options) {
  const f = new Float64Array(options.sab);
  if (f.length !== OFF.total) throw new Error('the shared buffer does not have the beacon layout');
  const epoch = options.epoch || defaultEpoch;
  const post = options.post || function () {};
  const maxMarkers = options.maxMarkers === undefined ? DEFAULT_MAX_MARKERS : options.maxMarkers;
  const techniques = options.techniques || [];
  if (techniques.length > TECH_MAX) {
    const err = new Error('more registered finders (' + techniques.length + ') than the beacon layout holds (' + TECH_MAX + ')');
    err.code = 'capability-missing';
    throw err;
  }
  const subOf = new Map();
  techniques.forEach(function (t, i) { subOf.set(t.id, 1 + i); });
  const marked = new Set(MARKED_CTX);

  const stack = [];
  const openAt = [];
  let cell = 0;
  let ctx = 0;
  let lastT = 0;
  let kind = KIND.none;
  let pendingLocal = false;
  let begun = false;
  let finished = false;
  let seq = 0;
  let markers = 0;
  let dropped = 0;

  function mark(ev, data) {
    seq++;
    f[H.seq] = seq;
    if (markers >= maxMarkers) {
      dropped++;
      f[H.dropped] = dropped;
      return;
    }
    markers++;
    f[H.markers] = markers;
    const message = { type: 'ig08-ev', ev: ev, seq: seq, t: epoch() };
    if (data) Object.keys(data).forEach(function (k) { message[k] = data[k]; });
    post(message);
  }

  function slice(t) {
    f[OFF.ms + cell] += t - lastT;
    lastT = t;
  }

  function publish() {
    f[H.cell] = cell;
    f[H.ctx] = ctx;
    f[H.depth] = stack.length;
    f[H.lastT] = lastT;
  }

  function enter(newCell) {
    slice(epoch());
    stack.push(cell);
    cell = newCell;
    ctx = (newCell / SUBS) | 0;
    f[OFF.calls + cell]++;
    publish();
    return stack.length;
  }

  function leave() {
    if (stack.length === 0) return;
    slice(epoch());
    cell = stack.pop();
    ctx = (cell / SUBS) | 0;
    publish();
  }

  function stageOpen(step, args) {
    let c = Object.prototype.hasOwnProperty.call(STEP_CTX, step) ? STEP_CTX[step] : CTX.outside;
    if (step === 'dig' && kind === KIND.local) c = CTX.local;
    f[H.step] = Object.prototype.hasOwnProperty.call(STEP_INDEX, step) ? STEP_INDEX[step] : -1;
    if (args && typeof args.attempt === 'number') f[H.attempt] = args.attempt;
    if (args && typeof args.sample === 'number') f[H.sample] = args.sample;
    const token = enter(c * SUBS);
    openAt[token] = lastT;
    mark('stage-open', { step: step, ctx: c, attempt: args && typeof args.attempt === 'number' ? args.attempt : null,
      sample: args && typeof args.sample === 'number' ? args.sample : null, kind: kind });
    return token;
  }

  function stageClose(token, step) {
    const opened = openAt[token];
    while (stack.length >= token) leave();
    f[H.step] = -1;
    mark('stage-close', { step: step, wallMs: round6(lastT - opened) });
  }

  function levelEnter(opts) {
    const where = opts && opts.where ? opts.where : null;
    kind = pendingLocal ? KIND.local : (opts && opts.proposal === true ? KIND.proposal : KIND.ordinary);
    pendingLocal = false;
    f[H.kind] = kind;
    f[G.samples]++;
    if (where && typeof where.attempt === 'number') f[H.attempt] = where.attempt;
    if (where && typeof where.sample === 'number') f[H.sample] = where.sample;
    mark('sample', { attempt: where && typeof where.attempt === 'number' ? where.attempt : null,
      sample: where && typeof where.sample === 'number' ? where.sample : null, kind: kind });
  }

  function localNext() {
    pendingLocal = true;
  }

  // A call of the engine function `fn` inside the context `c`, the arguments and the result unchanged.
  function call(c, fn, ...args) {
    enter(c * SUBS);
    try {
      if (marked.has(c)) mark('ctx', { ctx: c });
      return fn(...args);
    } finally {
      leave();
    }
  }

  function finderOpen(tech) {
    const s = subOf.get(tech.id);
    enter(ctx * SUBS + (s === undefined ? SUB.otherFinder : s));
  }

  function finderClose(found) {
    if (found !== null && found !== undefined) f[OFF.hits + cell]++;
    leave();
  }

  const api = {
    CTX: CTX,
    stageOpen: stageOpen,
    stageClose: stageClose,
    levelEnter: levelEnter,
    localNext: localNext,
    call: call,
    finderOpen: finderOpen,
    finderClose: finderClose,
    dfsNode: function () { f[OFF.dfsNodes + ctx]++; },
    dfsCheck: function () { f[OFF.dfsChecks + ctx]++; },
    dfsBack: function () { f[OFF.dfsBacktracks + ctx]++; },
    gridSearch: function () { f[OFF.gridSearches + ctx]++; },
    gridRestart: function () { f[OFF.gridRestarts + ctx]++; },
    gridBack: function (n) { f[OFF.gridBacktracks + ctx] += n; },
    gridUnlimited: function (attempt) {
      f[G.gridUnlimitedEntered]++;
      mark('grid-unlimited', { ctx: ctx, searchAttempt: attempt });
    },
    layoutAttempt: function (n, backtracksBefore) {
      f[G.layoutAttempts]++;
      mark('layout-attempt', { n: n, backtracksBefore: backtracksBefore });
    },
    layoutBack: function () { f[G.layoutGrowthBacktracks]++; },
    layoutLevel: function () { f[G.layoutLevels]++; },
    layoutFeas: function () { f[G.layoutFeasibility]++; },
    layoutUnsolvable: function (n) {
      f[G.layoutUnsolvable]++;
      mark('layout-unsolvable', { n: n });
    },
    layoutHard: function (n) {
      f[G.layoutHard]++;
      mark('layout-hard', { n: n });
    },
    layoutAccepted: function (n) {
      f[G.layoutAccepted]++;
      mark('layout-accepted', { n: n });
    }
  };

  // --- install / uninstall: the entry points that no source transform reaches ---------------------------------------------
  let installed = [];
  let hostSG = null;

  function wrap(obj, name, sub) {
    const original = obj[name];
    if (typeof original !== 'function') {
      const err = new Error('the engine has no ' + name + ' to observe');
      err.code = 'capability-missing';
      throw err;
    }
    const wrapper = function () {
      enter(ctx * SUBS + sub);
      try {
        return original.apply(this, arguments);
      } finally {
        leave();
      }
    };
    obj[name] = wrapper;
    installed.push({ obj: obj, name: name, original: original, wrapper: wrapper });
  }

  function install(SG) {
    if (hostSG !== null) throw new Error('the beacon is already installed');
    if (SG.__igJig !== undefined) throw new Error('another beacon is installed in this engine instance');
    hostSG = SG;
    try {
      wrap(SG.logicalSolver, 'solve', SUB.solver);
      wrap(SG.difficulty, 'rate', SUB.rate);
      wrap(SG.dfs, 'countSolutions', SUB.dfs);
      wrap(SG.dfs, 'stillUnique', SUB.dfs);
      wrap(SG.dfs, 'solve', SUB.dfs);
      wrap(SG.dfs, 'searchFrom', SUB.dfs);
      wrap(SG.fullGrid, 'generate', SUB.grid);
    } catch (err) {
      uninstall();
      throw err;
    }
    SG.__igJig = api;
    return { wrapped: installed.map(function (w) { return w.name; }) };
  }

  function uninstall() {
    const problems = [];
    if (hostSG === null) return { restored: true, problems: problems, wasInstalled: false };
    for (let i = installed.length - 1; i >= 0; i--) {
      const w = installed[i];
      if (w.obj[w.name] !== w.wrapper) problems.push(w.name + ' was replaced by other code');
      w.obj[w.name] = w.original;
    }
    if (hostSG.__igJig !== undefined && hostSG.__igJig !== api) problems.push('SG.__igJig was replaced by other code');
    delete hostSG.__igJig;
    const intact = installed.every(function (w) { return w.obj[w.name] === w.original; }) && hostSG.__igJig === undefined;
    installed = [];
    hostSG = null;
    return { restored: intact && problems.length === 0, problems: problems, wasInstalled: true };
  }

  function begin() {
    if (begun) throw new Error('the beacon has begun');
    begun = true;
    lastT = epoch();
    f[H.magic] = MAGIC;
    f[H.version] = VERSION;
    f[H.tBegin] = lastT;
    f[H.step] = -1;
    f[H.state] = STATE.running;
    cell = 0;
    ctx = 0;
    publish();
    mark('begin', { version: VERSION, nCtx: NCTX, subs: SUBS,
      techniques: techniques.map(function (t) { return { id: t.id, group: t.group === undefined ? null : t.group }; }) });
  }

  function finish(state) {
    if (!begun || finished) return;
    finished = true;
    while (stack.length > 0) leave();
    slice(epoch());
    f[H.tEnd] = lastT;
    f[H.state] = state === 'ok' ? STATE.ok : STATE.error;
    publish();
    mark('end', { state: state });
  }

  return { api: api, begin: begin, finish: finish, install: install, uninstall: uninstall, enter: enter, leave: leave,
    stats: function () { return { markers: markers, dropped: dropped, depth: stack.length, spans: totalCalls(f) }; } };
}

function totalCalls(f) {
  let n = 0;
  for (let c = 0; c < NCELL; c++) n += f[OFF.calls + c];
  return n;
}

// --- reading the shared memory (host side, any time, also after the worker was terminated) --------------------------------

function readSnapshot(sab) {
  const f = new Float64Array(sab);
  const header = {};
  HEADER_NAMES.forEach(function (name, i) { header[name] = f[OFF.header + i]; });
  const globals = {};
  GLOBAL_NAMES.forEach(function (name, i) {
    if (!/^reserved/.test(name)) globals[name] = f[OFF.globals + i];
  });
  const ctxRows = [];
  for (let c = 0; c < NCTX; c++) {
    const row = CTX_COUNTER_NAMES.map(function (name) { return f[OFF[name] + c]; });
    if (row.some(function (v) { return v !== 0; })) ctxRows.push([c].concat(row));
  }
  const cells = [];
  for (let k = 0; k < NCELL; k++) {
    const ms = f[OFF.ms + k];
    const calls = f[OFF.calls + k];
    const hits = f[OFF.hits + k];
    if (ms !== 0 || calls !== 0 || hits !== 0) cells.push([(k / SUBS) | 0, k % SUBS, round6(ms), calls, hits]);
  }
  return { layout: { version: VERSION, nCtx: NCTX, subs: SUBS, ctxCounterNames: CTX_COUNTER_NAMES.slice(),
    cellColumns: ['ctx', 'sub', 'ms', 'calls', 'hits'] }, header: header, globals: globals, ctxCounters: ctxRows, cells: cells };
}

/** The compact form of a heartbeat: the current position and the counters that moved. */
function summariseSnapshot(snap) {
  const totals = {};
  CTX_COUNTER_NAMES.forEach(function (name, i) {
    totals[name] = snap.ctxCounters.reduce(function (s, row) { return s + row[1 + i]; }, 0);
  });
  const finderCalls = snap.cells.filter(function (r) { return r[1] >= 1 && r[1] <= TECH_MAX; })
    .reduce(function (s, r) { return s + r[3]; }, 0);
  const h = snap.header;
  const globals = {};
  Object.keys(snap.globals).forEach(function (k) { if (snap.globals[k] !== 0) globals[k] = snap.globals[k]; });
  return {
    state: STATE_NAMES[h.state] || 'unset', seq: h.seq, cell: h.cell, ctx: h.ctx, ctxName: CTX_NAMES[h.ctx] || null,
    step: h.step >= 0 ? STEP_NAMES[h.step] : null, attempt: h.attempt, sample: h.sample,
    kind: KIND_NAMES[h.kind] || null, depth: h.depth, lastT: h.lastT, markers: h.markers, dropped: h.dropped,
    globals: globals, totals: totals, finderCalls: finderCalls
  };
}

// --- the attribution (pure) -----------------------------------------------------------------------------------------------

function familyOf(techniques) {
  const byIndex = new Map();
  (techniques || []).forEach(function (t, i) { byIndex.set(1 + i, t); });
  return function (sub) {
    if (sub === SUB.self) return { kind: 'own', id: null, group: null };
    if (sub === SUB.solver) return { kind: 'solver', id: null, group: null };
    if (sub === SUB.rate) return { kind: 'rating', id: null, group: null };
    if (sub === SUB.dfs) return { kind: 'dfs', id: null, group: null };
    if (sub === SUB.grid) return { kind: 'gridGenerator', id: null, group: null };
    const t = byIndex.get(sub);
    if (t) return { kind: 'finder', id: t.id, group: t.group === undefined || t.group === null ? 'unknown' : t.group };
    return { kind: 'finder', id: null, group: 'unregistered' };
  };
}

/**
 * The attribution of one observation from a snapshot (the final shared memory read, or the last heartbeat when that was
 * all that survived). `endEpochMs` is the host's instant of the timeout (or of the decision); the time since the last slice
 * is booked to the cell that was current, as a lower bound of what that cell had taken by then.
 */
function attribute(snapshot, options) {
  const o = options || {};
  const h = snapshot.header;
  const family = familyOf(o.techniques);
  const finished = h.state === STATE.ok || h.state === STATE.error;
  const inProgressMs = !finished && Number.isFinite(o.endEpochMs) && h.lastT > 0 ? Math.max(0, o.endEpochMs - h.lastT) : 0;
  const cells = snapshot.cells.map(function (r) {
    const inCell = !finished && inProgressMs > 0 && r[0] === h.ctx && r[0] * SUBS + r[1] === h.cell;
    return { ctx: r[0], sub: r[1], ms: r[2] + (inCell ? inProgressMs : 0), calls: r[3], hits: r[4], inProgress: inCell };
  });
  if (!finished && inProgressMs > 0 && !cells.some(function (c) { return c.inProgress; })) {
    cells.push({ ctx: h.ctx, sub: h.cell % SUBS, ms: inProgressMs, calls: 0, hits: 0, inProgress: true });
  }
  const observedMs = cells.reduce(function (s, c) { return s + c.ms; }, 0);
  const perCtx = new Map();
  cells.forEach(function (c) {
    if (!perCtx.has(c.ctx)) perCtx.set(c.ctx, { ctx: c.ctx, name: CTX_NAMES[c.ctx], stage: STAGE_OF[c.ctx], ms: 0, entries: 0, bySub: [] });
    const row = perCtx.get(c.ctx);
    row.ms += c.ms;
    if (c.sub === SUB.self) row.entries += c.calls;
    row.bySub.push(Object.assign({ sub: c.sub }, family(c.sub), { ms: c.ms, calls: c.calls, hits: c.hits }));
  });
  const contexts = Array.from(perCtx.values()).sort(function (a, b) { return b.ms - a.ms; });
  const counters = new Map();
  snapshot.ctxCounters.forEach(function (row) {
    const entry = { ctx: row[0], name: CTX_NAMES[row[0]], stage: STAGE_OF[row[0]] };
    CTX_COUNTER_NAMES.forEach(function (name, i) { entry[name] = row[1 + i]; });
    counters.set(row[0], entry);
  });
  const stages = STAGE_ORDER.map(function (stage) {
    const rows = contexts.filter(function (c) { return c.stage === stage; });
    const ms = rows.reduce(function (s, c) { return s + c.ms; }, 0);
    const own = { dfsNodes: 0, dfsChecks: 0, dfsBacktracks: 0, gridSearches: 0, gridRestarts: 0, gridBacktracks: 0 };
    counters.forEach(function (e) {
      if (e.stage === stage) Object.keys(own).forEach(function (k) { own[k] += e[k]; });
    });
    return { stage: stage, wallMsLowerBound: ms, share: observedMs > 0 ? ms / observedMs : null,
      contexts: rows.map(function (c) { return c.name; }), counters: own };
  });
  const finders = new Map();
  const byGroup = new Map();
  const solverOther = { solver: 0, rating: 0, dfs: 0, gridGenerator: 0, own: 0 };
  cells.forEach(function (c) {
    const fam = family(c.sub);
    if (fam.kind === 'finder') {
      const key = String(fam.id);
      if (!finders.has(key)) finders.set(key, { id: fam.id, group: fam.group, ms: 0, calls: 0, hits: 0 });
      const row = finders.get(key);
      row.ms += c.ms;
      row.calls += c.calls;
      row.hits += c.hits;
      if (!byGroup.has(fam.group)) byGroup.set(fam.group, { group: fam.group, ms: 0, calls: 0, hits: 0 });
      const g = byGroup.get(fam.group);
      g.ms += c.ms;
      g.calls += c.calls;
      g.hits += c.hits;
    } else {
      solverOther[fam.kind] += c.ms;
    }
  });
  const byStageFamily = [];
  cells.forEach(function (c) {
    const fam = family(c.sub);
    if (fam.kind !== 'finder' || c.ms === 0) return;
    const stage = STAGE_OF[c.ctx];
    let row = byStageFamily.find(function (r) { return r.stage === stage && r.group === fam.group; });
    if (!row) {
      row = { stage: stage, group: fam.group, ms: 0, calls: 0, hits: 0 };
      byStageFamily.push(row);
    }
    row.ms += c.ms;
    row.calls += c.calls;
    row.hits += c.hits;
  });
  const totals = {};
  CTX_COUNTER_NAMES.forEach(function (name) {
    totals[name] = Array.from(counters.values()).reduce(function (s, e) { return s + e[name]; }, 0);
  });
  const sorted = function (rows) { return rows.slice().sort(function (a, b) { return b.ms - a.ms; }); };
  return {
    state: STATE_NAMES[h.state] || 'unset',
    current: finished ? null : { ctx: h.ctx, ctxName: CTX_NAMES[h.ctx], sub: h.cell % SUBS, part: family(h.cell % SUBS), stage: STAGE_OF[h.ctx],
      step: h.step >= 0 ? STEP_NAMES[h.step] : null, attempt: h.attempt, sample: h.sample, kind: KIND_NAMES[h.kind] || null,
      inProgressMs: inProgressMs, depth: h.depth },
    beaconObservedMs: observedMs,
    inProgressMs: inProgressMs,
    stages: stages.filter(function (s) { return s.wallMsLowerBound > 0 || s.counters.dfsNodes > 0; }),
    contexts: contexts,
    finderGroups: sorted(Array.from(byGroup.values())),
    finders: sorted(Array.from(finders.values())).filter(function (r) { return r.calls > 0 || r.ms > 0; }),
    finderByStage: sorted(byStageFamily),
    nonFinderWallMs: solverOther,
    layout: snapshot.globals,
    counters: { totals: totals, byContext: Array.from(counters.values()) },
    samples: snapshot.globals.samples,
    markers: { posted: h.markers, dropped: h.dropped }
  };
}

// --- the journal (pure) -----------------------------------------------------------------------------------------------------

/** Parses journal text; an unparsable last line (a write cut short) is reported, never fatal. */
function parseJournal(text) {
  const lines = String(text).split(/\r?\n/);
  const out = { entries: [], truncatedLastLine: false, badLines: [] };
  lines.forEach(function (line, i) {
    if (line === '') return;
    try {
      out.entries.push(JSON.parse(line));
    } catch (err) {
      if (lines.slice(i + 1).every(function (l) { return l === ''; })) out.truncatedLastLine = true;
      else out.badLines.push(i + 1);
    }
  });
  return out;
}

/**
 * Everything one request left in the journal, in order: the stages (open/close pairs of the markers), the heartbeats and, when
 * it survived, the post-mortem. `source` says what the attribution rests on: the final shared-memory read, the last heartbeat
 * (the host died first) or only the markers.
 */
function reconcileJournal(entries, key) {
  const mine = entries.filter(function (e) { return e.key === key; });
  const out = { key: key, lines: mine.length, spawn: null, begin: null, stages: [], layoutEvents: [], heartbeats: 0,
    lastHeartbeat: null, final: null, workerEnd: null, markers: 0, problems: [], source: 'none' };
  let open = [];
  let lastSeq = 0;
  mine.forEach(function (e) {
    if (e.type === 'spawn') out.spawn = e;
    else if (e.type === 'heartbeat') {
      out.heartbeats++;
      out.lastHeartbeat = e;
    } else if (e.type === 'final') out.final = e;
    else if (e.type === 'worker-end') out.workerEnd = e;
    else if (e.type === 'ev') {
      out.markers++;
      if (typeof e.workerSeq === 'number') {
        if (e.workerSeq <= lastSeq) out.problems.push('marker sequence went backwards at ' + e.workerSeq);
        lastSeq = e.workerSeq;
      }
      if (e.ev === 'begin') out.begin = e;
      else if (e.ev === 'stage-open') {
        const stage = { step: e.step, ctx: e.ctx, attempt: e.attempt, sample: e.sample, kind: KIND_NAMES[e.kind] || null,
          openedAtMs: e.t, closedAtMs: null, wallMs: null, closed: false };
        out.stages.push(stage);
        open.push(stage);
      } else if (e.ev === 'stage-close') {
        const stage = open.length > 0 ? open.pop() : null;
        if (stage === null) out.problems.push('a stage closed that was not open: ' + e.step);
        else {
          stage.closed = true;
          stage.closedAtMs = e.t;
          stage.wallMs = e.wallMs;
        }
      } else if (/^layout-/.test(e.ev) || e.ev === 'grid-unlimited') {
        out.layoutEvents.push({ ev: e.ev, n: e.n === undefined ? null : e.n, t: e.t });
      }
    }
  });
  out.openStages = open.map(function (s) { return { step: s.step, attempt: s.attempt, sample: s.sample, kind: s.kind }; });
  if (out.final && out.final.snapshot) out.source = 'final';
  else if (out.lastHeartbeat && out.lastHeartbeat.snapshot) out.source = 'last-heartbeat';
  else if (out.markers > 0) out.source = 'markers-only';
  return out;
}

module.exports = Object.freeze({
  VERSION, MAGIC, NCTX, SUBS, NCELL, TECH_MAX, SUB, CTX, CTX_NAMES, STAGE_OF, STAGE_ORDER, STEP_CTX, STEP_INDEX,
  STEP_NAMES, MARKED_CTX, KIND, KIND_NAMES, STATE, STATE_NAMES, HEADER_NAMES, GLOBAL_NAMES, CTX_COUNTER_NAMES, OFF, H, G,
  DEFAULT_MAX_MARKERS, allocate, createBeacon, readSnapshot, summariseSnapshot, attribute, parseJournal, reconcileJournal,
  familyOf, round6
});
