'use strict';

/*
 * IG-S03 prototype of S3 (scoped negative scans), test side only. Provisional (pre-freeze).
 *
 * The runtime that the private source adapter `scoped-solver` (adapters/scoped-solver.cjs) hooks into an in-memory copy
 * of the engine: the solver loop notifies it of every applied Finding (`begin`, `applied`), and the finders of
 * tech-basic.js and tech-subset.js ask it first (`nakedSingle`, `hiddenSingle`, `findSubset`). It answers `undefined`
 * when it does not handle a call (the native code then runs, the fallback is counted) and otherwise exactly what the
 * native finder would return.
 *
 * Implemented (the fixed design of the task): negative scans of naked singles (cell scope), hidden singles (unit
 * scope) and the six naked/hidden pair/triple/quad finders (unit scope). Nothing else: pointing, box/line, fish,
 * wings, chains, cages and inequalities stay native full scans. Only NEGATIVE results are cached; a positive Finding is
 * always found again by a real scan.
 *
 * Scope proof (what the cache rests on):
 *  - A scope is one cell (naked single) or one unit (the others). Its result, and for a subset finder the number of
 *    enumeration nodes of its scan, depend only on the values and candidates of the cells of that scope, the finder
 *    definition (size, naked or hidden), the digit count and `completeUnits[u]` (both fixed for a solve). No other
 *    state is read.
 *  - Per solve, the solver tells `applied` what a Finding placed or eliminated. A placement dirties the placed cell
 *    and all its peers (`assign` changes the candidates of exactly those), an elimination dirties its cell; a dirty
 *    cell dirties every unit it lies in. A scope proved negative at the current version of its unit (cell) is skipped.
 *    Marking too much is safe; the audit mode compares the real state with a shadow after every step and reports any
 *    changed cell that was not marked, and re-scans every skipped scope natively to confirm it is still negative with
 *    the same increment.
 *  - Budget checks. Hidden/naked singles never call `ctx.check()`. The subset finders call it once on entering each
 *    unit and once per CHECK_EVERY enumeration nodes of ONE counter (`nodes`) that is reset once per find and spans the
 *    units. A skipped scope therefore replays its entry check and then
 *    floor((r + inc) / CHECK_EVERY) - floor(r / CHECK_EVERY) real `ctx.check()` calls at the virtual node positions
 *    (r = the incoming residue, inc = the cached raw increment of that scope), leaving `nodes` at the boundary at
 *    every call and at r + inc at the end. Every check is issued, none is bulk-charged, so a budget that throws does so
 *    at the same logical site and ordinal as the native scan. Nothing reads the scratch of an interrupted scan: the
 *    scratch of tech-subset.js is re-initialised by every find/unit, and a scope proved negative is recorded only
 *    after its scan completed, never when a check threw.
 *
 * Test-only switches (`config.mutation`) exist for the focused tests, which must FAIL under each of them; production
 * and benchmark instances never set one. Benchmark mode has no per-check hashing or per-finder clocks: `config.audit`
 * is null and only integer counters are kept.
 */
const FINDER_IDS = Object.freeze(['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'nakedPair', 'hiddenPair',
  'nakedTriple', 'hiddenTriple', 'nakedQuad', 'hiddenQuad']);
const FINDER_INDEX = Object.freeze(FINDER_IDS.reduce(function (acc, id, i) {
  acc[id] = i;
  return acc;
}, {}));
const SUBSET_FIRST = 3;
const CHECK_EVERY_EXPECTED = 256;

const COUNTERS = Object.freeze(['calls', 'scopesVisited', 'realScopes', 'negativeRecorded', 'positiveScopes',
  'skippedScopes', 'enumNodesReal', 'enumNodesSkipped', 'realEntryChecks', 'virtualEntryChecks', 'realNodeChecks',
  'virtualNodeChecks', 'nativeFallbackCalls']);
const COUNTER_INDEX = Object.freeze(COUNTERS.reduce(function (acc, name, i) {
  acc[name] = i;
  return acc;
}, {}));
const N_COUNTERS = COUNTERS.length;
const C_CALLS = COUNTER_INDEX.calls;
const C_VISITED = COUNTER_INDEX.scopesVisited;
const C_REAL = COUNTER_INDEX.realScopes;
const C_NEG = COUNTER_INDEX.negativeRecorded;
const C_POS = COUNTER_INDEX.positiveScopes;
const C_SKIP = COUNTER_INDEX.skippedScopes;
const C_ENUM_REAL = COUNTER_INDEX.enumNodesReal;
const C_ENUM_SKIP = COUNTER_INDEX.enumNodesSkipped;
const C_REAL_ENTRY = COUNTER_INDEX.realEntryChecks;
const C_VIRT_ENTRY = COUNTER_INDEX.virtualEntryChecks;
const C_REAL_NODE = COUNTER_INDEX.realNodeChecks;
const C_VIRT_NODE = COUNTER_INDEX.virtualNodeChecks;
const C_FALLBACK = COUNTER_INDEX.nativeFallbackCalls;

const MUTATIONS = Object.freeze(['stale-peers', 'last-count', 'dirty-first', 'bulk-check']);

function create(SG, options) {
  const opts = options || {};
  const config = {
    audit: null,
    verifySkips: false,
    mutation: null,
    postStats: opts.postStats === true
  };
  const solves = new WeakMap();
  const counters = FINDER_IDS.map(function () { return new Float64Array(N_COUNTERS); });
  const totals = { solvesBegun: 0, stepsApplied: 0, cellsInvalidated: 0, unitsInvalidated: 0, applyCalls: 0 };
  const fallbackReasons = {};
  const violations = { count: 0, kinds: {}, samples: [] };

  function fallback(finder, reason) {
    counters[finder][C_FALLBACK]++;
    fallbackReasons[reason] = (fallbackReasons[reason] || 0) + 1;
  }

  function violation(kind, detail) {
    violations.count++;
    violations.kinds[kind] = (violations.kinds[kind] || 0) + 1;
    if (violations.samples.length < 12) violations.samples.push(Object.assign({ kind: kind }, detail));
  }

  // One solve's private scoped state. Per-solve ownership: it is found by the solve's `ctx` and valid only for the
  // very state object the solver loop was given; any other ctx or state (a trial copy, a direct call) is native.
  class Solve {
    constructor(model, state, ladder, ctx) {
      this.model = model;
      this.state = state;
      this.ctx = ctx;
      this.audit = config.audit;
      this.verify = config.verifySkips === true;
      this.mut = config.mutation;
      const units = model.units.length;
      this.units = units;
      this.cellUnits = model.cellUnits;
      this.unitVer = new Int32Array(units).fill(1);
      this.unitStamp = new Int32Array(units);
      this.stamp = 0;
      this.cellVer = null;
      this.nsProof = null;
      this.proofs = new Array(FINDER_IDS.length).fill(null);
      this.chks = new Array(FINDER_IDS.length).fill(null);
      this.one = [0];
      this.shadowCand = null;
      this.shadowVal = null;
      this.cellStamp = null;
      if (this.audit !== null) {
        this.shadowCand = Array.from(state.candidates);
        this.shadowVal = Array.from(state.value);
        this.cellStamp = new Int32Array(model.cellCount);
      }
    }

    // Per finder: the version at which each scope was proved negative; a subset finder keeps the raw node increment of the
    // scope in the second half of the same array (one allocation).
    proof(f) {
      let p = this.proofs[f];
      if (p === null) p = this.proofs[f] = new Int32Array(this.units * (f >= SUBSET_FIRST ? 2 : 1));
      return p;
    }

    cachedChecks(f) {
      let a = this.chks[f];
      if (a === null) a = this.chks[f] = new Int32Array(this.units);
      return a;
    }

    dirty(c) {
      totals.cellsInvalidated++;
      if (this.cellVer !== null) this.cellVer[c]++;
      if (this.cellStamp !== null) this.cellStamp[c] = this.stamp;
      const us = this.cellUnits[c];
      for (let k = 0; k < us.length; k++) {
        const u = us[k];
        if (this.unitStamp[u] !== this.stamp) {
          this.unitStamp[u] = this.stamp;
          this.unitVer[u]++;
          totals.unitsInvalidated++;
        }
      }
    }

    // Called by the solver loop after every applied Finding (placements and eliminations as the Finding lists them,
    // a superset of what changed).
    applied(finding) {
      totals.stepsApplied++;
      this.stamp++;
      const model = this.model;
      const placements = finding.placements;
      const eliminations = finding.eliminations;
      let i;
      for (i = 0; i < placements.length; i++) {
        const c = placements[i][0];
        this.dirty(c);
        if (this.mut === 'stale-peers') continue;
        const ps = model.peers[c];
        for (let j = 0; j < ps.length; j++) this.dirty(ps[j]);
      }
      for (i = 0; i < eliminations.length; i++) this.dirty(eliminations[i][0]);
      if (this.shadowCand !== null) this.checkShadow();
    }

    // Audit only: every cell whose value or candidates changed must have been marked by `applied`.
    checkShadow() {
      const cand = this.state.candidates;
      const val = this.state.value;
      for (let c = 0; c < cand.length; c++) {
        if (cand[c] === this.shadowCand[c] && val[c] === this.shadowVal[c]) continue;
        if (this.cellStamp[c] !== this.stamp) violation('unmarked-change', { cell: c, step: totals.stepsApplied });
        this.shadowCand[c] = cand[c];
        this.shadowVal[c] = val[c];
      }
    }
  }

  function solveOf(finder, ctx, state) {
    const s = solves.get(ctx);
    if (s === undefined) {
      fallback(finder, 'no-solve-state');
      return null;
    }
    if (s.state !== state) {
      fallback(finder, 'foreign-state');
      return null;
    }
    return s;
  }

  // --- the solver loop ---------------------------------------------------------------------------------------

  function begin(model, state, ladder, ctx) {
    if (config.scoping === false) return null;
    totals.solvesBegun++;
    const s = new Solve(model, state, ladder, ctx);
    solves.set(ctx, s);
    return s;
  }

  // --- naked singles (scope: one cell) --------------------------------------------------------------------------

  function nakedSingle(model, state, ctx) {
    const s = ctx === undefined ? null : solveOf(0, ctx, state);
    if (s === null) return undefined;
    const c0 = counters[0];
    c0[C_CALLS]++;
    const n = model.cellCount;
    if (s.cellVer === null) {
      s.cellVer = new Int32Array(n).fill(1);
      s.nsProof = new Int32Array(n);
    }
    const ver = s.cellVer;
    const proof = s.nsProof;
    const cand = state.candidates;
    const val = state.value;
    let skipped = 0;
    for (let c = 0; c < n; c++) {
      if (proof[c] === ver[c]) {
        skipped++;
        if (s.verify) verifyNakedSkip(model, state, c);
        continue;
      }
      const m = cand[c];
      if (val[c] === 0 && m !== 0 && (m & (m - 1)) === 0) {
        c0[C_VISITED] += c + 1;
        c0[C_SKIP] += skipped;
        c0[C_REAL] += c + 1 - skipped;
        c0[C_POS]++;
        c0[C_NEG] += c - skipped;
        const digit = 32 - Math.clz32(m);
        return {
          technique: 'nakedSingle',
          cells: [c],
          placements: [[c, digit]],
          eliminations: [],
          i18nKey: 'technique.nakedSingle.step',
          i18nArgs: { cell: SG.model.cellLabel(model, c), digit: digit }
        };
      }
      proof[c] = ver[c];
    }
    c0[C_VISITED] += n;
    c0[C_SKIP] += skipped;
    c0[C_REAL] += n - skipped;
    c0[C_NEG] += n - skipped;
    return null;
  }

  function verifyNakedSkip(model, state, c) {
    const m = state.candidates[c];
    if (state.value[c] === 0 && m !== 0 && (m & (m - 1)) === 0) {
      violation('skipped-scope-not-negative', { finder: 'nakedSingle', cell: c });
    }
  }

  // --- hidden singles (scope: one unit; the native finder scans the one-unit list) --------------------------------

  function hiddenSingle(model, state, ctx, id) {
    const f = FINDER_INDEX[id];
    const s = solveOf(f, ctx, state);
    if (s === null) return undefined;
    const kit = SG.__igBasicKit;
    if (kit === undefined) {
      fallback(f, 'kit-missing');
      return undefined;
    }
    const cf = counters[f];
    cf[C_CALLS]++;
    const g = kit.geometryOf(model);
    const list = id === 'hiddenSingleBox' ? g.boxUnits : g.lineUnits;
    const proof = s.proof(f);
    const ver = s.unitVer;
    const one = s.one;
    for (let k = 0; k < list.length; k++) {
      const u = list[k];
      cf[C_VISITED]++;
      one[0] = u;
      if (proof[u] === ver[u]) {
        cf[C_SKIP]++;
        if (s.verify && kit.findHiddenSingle(model, state, ctx, one, id) !== null) {
          violation('skipped-scope-not-negative', { finder: id, unit: u });
        }
        continue;
      }
      cf[C_REAL]++;
      const found = kit.findHiddenSingle(model, state, ctx, one, id);
      if (found !== null) {
        cf[C_POS]++;
        return found;
      }
      proof[u] = ver[u];
      cf[C_NEG]++;
    }
    return null;
  }

  // --- subset finders (scope: one unit; checks replayed, see the file header) -----------------------------------

  // One real scan of a unit with the native helpers of tech-subset.js. Returns the Finding or null; the cache is
  // written by the caller only when it returned null without a throw.
  function scanUnit(K, model, u, state, ctx, def, complete) {
    const cells = model.units[u];
    if (cells.length > K.MAX_UNIT || (def.hidden && complete[u] !== 1)) return null;
    const cand = state.candidates;
    const value = state.value;
    const size = def.size;
    const count = def.hidden ? K.collectDigits(cells, value, cand, model.digits, size)
      : K.collectCells(cells, value, cand, size);
    if (count < size) return null;
    K.startSearch();
    while (K.nextCombination(count, size, ctx)) {
      const finding = K.conclude(model, u, cand, def);
      if (finding !== null) return finding;
    }
    return null;
  }

  function verifySubsetSkip(K, s, model, u, state, def, complete, f, expected) {
    const audit = s.audit;
    const quiet = { check: function () {} };
    const savedNodes = K.getNodes();
    if (audit !== null) audit.muted = true;
    try {
      K.setNodes(0);
      const finding = scanUnit(K, model, u, state, quiet, def, complete);
      const inc = K.getNodes();
      if (finding !== null) violation('skipped-scope-not-negative', { finder: def.id, unit: u });
      else if (inc !== expected) {
        violation('skipped-scope-increment', { finder: def.id, unit: u, cached: expected, actual: inc });
      }
    } finally {
      K.setNodes(savedNodes);
      if (audit !== null) audit.muted = false;
    }
  }

  // The checks of a skipped scope, issued one by one (never as a bulk charge).
  function replayChecks(K, s, ctx, f, def, u, inc, cf) {
    const r = K.getNodes();
    const target = r + inc;
    const every = K.CHECK_EVERY;
    const first = Math.floor(r / every) + 1;
    const last = Math.floor(target / every);
    const audit = s.audit;
    if (s.mut === 'bulk-check') {
      if (last >= first) {
        K.setNodes(target);
        if (audit !== null) audit.siteNode(target);
        ctx.check();
        cf[C_VIRT_NODE]++;
      }
      K.setNodes(target);
      return last >= first ? 1 : 0;
    }
    let made = 0;
    if (s.mut === 'last-count') {
      const cachedCount = s.cachedChecks(f)[u];
      for (let k = 0; k < cachedCount; k++) {
        K.setNodes((first + k) * every);
        if (audit !== null) audit.siteNode((first + k) * every);
        ctx.check();
        made++;
      }
      cf[C_VIRT_NODE] += made;
      K.setNodes(target);
      return made;
    }
    if (ctx.budget === null) {
      // No budget: every check is a no-op, so only the boundary state matters.
      cf[C_VIRT_NODE] += last >= first ? last - first + 1 : 0;
      K.setNodes(target);
      return last >= first ? last - first + 1 : 0;
    }
    for (let k = first; k <= last; k++) {
      const at = k * every;
      K.setNodes(at);
      if (audit !== null) audit.siteNode(at);
      ctx.check();
      made++;
    }
    cf[C_VIRT_NODE] += made;
    K.setNodes(target);
    return made;
  }

  function findSubset(model, state, ctx, def) {
    const f = FINDER_INDEX[def.id];
    if (f === undefined || f < SUBSET_FIRST) return undefined;
    const s = solveOf(f, ctx, state);
    if (s === null) return undefined;
    const K = SG.__igSubsetKit;
    if (K === undefined || K.CHECK_EVERY !== CHECK_EVERY_EXPECTED) {
      fallback(f, K === undefined ? 'kit-missing' : 'check-cadence-changed');
      return undefined;
    }
    const cf = counters[f];
    cf[C_CALLS]++;
    const units = model.units;
    const total = units.length;
    const complete = ctx.completeUnits;
    const proof = s.proof(f);
    const ver = s.unitVer;
    const audit = s.audit;
    const hidden = def.hidden;
    let order = null;
    if (s.mut === 'dirty-first') {
      order = [];
      for (let u = 0; u < total; u++) if (proof[u] !== ver[u]) order.push(u);
      for (let u = 0; u < total; u++) if (proof[u] === ver[u]) order.push(u);
    }
    K.setNodes(0);
    for (let i = 0; i < total; i++) {
      const u = order === null ? i : order[i];
      cf[C_VISITED]++;
      if (audit !== null) audit.siteUnit(def.id, u, K.getNodes());
      if (proof[u] === ver[u]) {
        const ord0 = audit !== null ? audit.ordinal + 1 : 0;
        ctx.check();
        cf[C_VIRT_ENTRY]++;
        cf[C_SKIP]++;
        const inc = proof[total + u];
        cf[C_ENUM_SKIP] += inc;
        if (s.verify) verifySubsetSkip(K, s, model, u, state, def, complete, f, inc);
        const residue = K.getNodes();
        const made = replayChecks(K, s, ctx, f, def, u, inc, cf);
        if (audit !== null) audit.scopeSkipped(def.id, u, ord0, made, inc, residue);
        continue;
      }
      ctx.check();
      cf[C_REAL_ENTRY]++;
      cf[C_REAL]++;
      const before = K.getNodes();
      const finding = scanUnit(K, model, u, state, ctx, def, complete);
      const after = K.getNodes();
      cf[C_ENUM_REAL] += after - before;
      const nodeChecks = Math.floor(after / K.CHECK_EVERY) - Math.floor(before / K.CHECK_EVERY);
      cf[C_REAL_NODE] += nodeChecks;
      if (finding !== null) {
        cf[C_POS]++;
        return finding;
      }
      proof[u] = ver[u];
      proof[total + u] = after - before;
      if (s.mut === 'last-count') s.cachedChecks(f)[u] = nodeChecks;
      cf[C_NEG]++;
    }
    return null;
  }

  // --- accounting -----------------------------------------------------------------------------------------------

  function snapshot() {
    const finders = {};
    FINDER_IDS.forEach(function (id, f) {
      const row = {};
      COUNTERS.forEach(function (name, k) { row[name] = counters[f][k]; });
      finders[id] = row;
    });
    return {
      solve: Object.assign({}, totals),
      finders: finders,
      fallbackReasons: Object.assign({}, fallbackReasons),
      violations: { count: violations.count, kinds: Object.assign({}, violations.kinds),
        samples: violations.samples.slice() },
      config: { audit: config.audit !== null, verifySkips: config.verifySkips, mutation: config.mutation }
    };
  }

  function reset() {
    counters.forEach(function (row) { row.fill(0); });
    Object.keys(totals).forEach(function (k) { totals[k] = 0; });
    Object.keys(fallbackReasons).forEach(function (k) { delete fallbackReasons[k]; });
    violations.count = 0;
    violations.kinds = {};
    violations.samples = [];
  }

  // Benchmark and pool workers report their counters to the host at the end of each pipeline run.
  function flush() {
    if (!config.postStats) return;
    const wt = require('worker_threads');
    if (!wt.isMainThread && wt.parentPort) wt.parentPort.postMessage({ type: 'scoped-stats', stats: snapshot() });
    reset();
  }

  function configure(next) {
    const c = next || {};
    if (c.mutation !== undefined && c.mutation !== null && MUTATIONS.indexOf(c.mutation) < 0) {
      throw new Error('unknown mutation ' + c.mutation);
    }
    ['audit', 'verifySkips', 'mutation', 'scoping', 'postStats'].forEach(function (k) {
      if (c[k] !== undefined) config[k] = c[k];
    });
  }

  return { begin: begin, nakedSingle: nakedSingle, hiddenSingle: hiddenSingle, findSubset: findSubset,
    snapshot: snapshot, reset: reset, flush: flush, configure: configure, config: config };
}

module.exports = { create, FINDER_IDS, FINDER_INDEX, COUNTERS, MUTATIONS };
