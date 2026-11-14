'use strict';

/*
 * Focused tests of IG-S03 (test side, provisional (pre-freeze)). The pure cases here need no engine, no worker and no
 * timing: they drive the real runtime of scoped-solver.cjs on a small fake of the engine pieces it hooks (a model of
 * rows and columns, a subset kit whose enumeration consumes a deterministic number of nodes) against a native-style
 * reference loop that makes the checks of tech-subset.js `findSubset` in the same order. The engine-level counterparts
 * (the real tech-subset.js with the real budgets, saved puzzles, injected count failures) are the audit jobs of the
 * first audit shard, run under the low-priority wrapper.
 *
 * The cases must FAIL for stale-peer invalidation, last-check-count-only caching, wrong scan order and a bulk check
 * that skips the true failure boundary: each is a deliberate mutation of the test-side runtime (`config.mutation`),
 * never of production code; the real prototype is restored (and re-checked) after every mutation.
 *
 *   node scoped-test.cjs [--only=pure]      development only: no engine, no timing, nothing written
 */
const C = require('./common.cjs');
const AU = require('./scoped-audit.cjs');
const SM = require('./scoped-solver.cjs');
const L = require('./loader.cjs');

const CHECK_EVERY = 256;
const MAX_UNIT = 30;

// --- a fake of the engine pieces the runtime hooks ---------------------------------------------------------------------

function popcount(x) {
  let n = 0;
  for (let v = x >>> 0; v !== 0; v &= v - 1) n++;
  return n;
}

function makeModel(side) {
  const n = side * side;
  const units = [];
  for (let r = 0; r < side; r++) units.push(Array.from({ length: side }, function (_x, c) { return r * side + c; }));
  for (let c = 0; c < side; c++) units.push(Array.from({ length: side }, function (_x, r) { return r * side + c; }));
  const cellUnits = Array.from({ length: n }, function (_x, cell) {
    return Int32Array.from([Math.floor(cell / side), side + (cell % side)]);
  });
  const peers = Array.from({ length: n }, function (_x, cell) {
    const set = new Set();
    cellUnits[cell].forEach(function (u) { units[u].forEach(function (c) { if (c !== cell) set.add(c); }); });
    return Int32Array.from(Array.from(set).sort(function (a, b) { return a - b; }));
  });
  return { cellCount: n, digits: 16, units: units, cellUnits: cellUnits, peers: peers,
    unitMeta: units.map(function (_u, i) { return { label: 'U' + i, kind: i < side ? 'row' : 'col' }; }) };
}

// The enumeration of a unit consumes `work(unit)` nodes (a function of the candidates of its cells only, like the real
// enumeration) and asks the budget once per CHECK_EVERY nodes of the ONE counter of the find, like tech-subset.js.
// A unit whose first cell holds exactly the mask 3 yields a Finding (a positive scope) half way through.
function makeKit(audit) {
  let nodes = 0;
  let cells = null;
  let cand = null;
  let consumed = false;
  let positive = false;
  function work() {
    let w = 100;
    for (let i = 0; i < cells.length; i++) w += cand[cells[i]] % 97;
    return w;
  }
  const kit = {
    CHECK_EVERY: CHECK_EVERY,
    MAX_UNIT: MAX_UNIT,
    getNodes: function () { return nodes; },
    setNodes: function (v) { nodes = v; },
    collectCells: function (unitCells, value, candidates, size) {
      cells = unitCells;
      cand = candidates;
      let count = 0;
      for (let i = 0; i < unitCells.length; i++) {
        const bits = popcount(candidates[unitCells[i]]);
        if (value[unitCells[i]] === 0 && bits >= 2 && bits <= size) count++;
      }
      return Math.max(count, size);
    },
    collectDigits: function (unitCells, value, candidates, digits, size) {
      return kit.collectCells(unitCells, value, candidates, size) + 1;
    },
    startSearch: function () {
      consumed = false;
      positive = cand[cells[0]] === 3;
    },
    nextCombination: function (count, size, ctx) {
      if (consumed) return false;
      const total = work();
      const upto = positive ? Math.floor(total / 2) : total;
      for (let i = 0; i < upto; i++) {
        if ((++nodes & (CHECK_EVERY - 1)) === 0) {
          if (audit) audit.siteNode(nodes);
          ctx.check();
        }
      }
      consumed = true;
      return positive;
    },
    conclude: function (model, u, candidates, def) {
      return positive ? { technique: def.id, cells: [u], placements: [], eliminations: [] } : null;
    }
  };
  return kit;
}

const DEFS = SM.FINDER_IDS.slice(3).map(function (id) {
  return { id: id, size: id.indexOf('Pair') >= 0 ? 2 : id.indexOf('Triple') >= 0 ? 3 : 4,
    hidden: id.indexOf('hidden') === 0 };
});

// Native-style reference: the loop of tech-subset.js findSubset on the fake kit.
function nativeFind(kit, audit, model, state, ctx, def) {
  kit.setNodes(0);
  for (let u = 0; u < model.units.length; u++) {
    if (audit) audit.siteUnit(def.id, u, kit.getNodes());
    ctx.check();
    const cells = model.units[u];
    if (cells.length > MAX_UNIT || (def.hidden && ctx.completeUnits[u] !== 1)) continue;
    const count = def.hidden ? kit.collectDigits(cells, state.value, state.candidates, model.digits, def.size)
      : kit.collectCells(cells, state.value, state.candidates, def.size);
    if (count < def.size) continue;
    kit.startSearch();
    while (kit.nextCombination(count, def.size, ctx)) {
      const f = kit.conclude(model, u, state.candidates, def);
      if (f !== null) return f;
    }
  }
  return null;
}

class Boom extends Error {
  constructor(at) {
    super('boom at ' + at);
    this.at = at;
  }
}

function makeCtx(model, audit, failAt, once) {
  let count = 0;
  const budget = {
    tick: function () {},
    check: function () {
      count++;
      if (audit) audit.onCheck();
      if (failAt !== undefined && (once ? count === failAt : count >= failAt)) throw new Boom(count);
    }
  };
  return { budget: budget, check: budget.check, completeUnits: new Uint8Array(model.units.length).fill(1),
    count: function () { return count; } };
}

function randomState(model, rand) {
  const cand = new Int32Array(model.cellCount);
  for (let c = 0; c < model.cellCount; c++) cand[c] = 4 + Math.floor(rand() * 60);
  return { candidates: cand, value: new Int32Array(model.cellCount), unsolvedCount: model.cellCount };
}

// A scenario script: rounds of finds on the six subset finders, between them eliminations and placements. Now and then a
// first cell of a unit is given the mask 3 for one round (that unit then holds a Finding) and is reset in the next.
function makeScript(seed, rounds) {
  const rand = AU.mulberry32(seed);
  const script = [];
  let reset = null;
  for (let r = 0; r < rounds; r++) {
    if (reset !== null) {
      script.push({ type: 'elim', cell: reset, pick: 0, bits: 9 });
      reset = null;
    }
    if (rand() < 0.2) {
      reset = Math.floor(rand() * 6) * 6;
      script.push({ type: 'elim', cell: reset, pick: 0, bits: 3 });
    }
    script.push({ type: 'find' });
    const k = 1 + Math.floor(rand() * 4);
    for (let i = 0; i < k; i++) {
      script.push({ type: rand() < 0.4 ? 'place' : 'elim', cell: Math.floor(rand() * 36), pick: rand(),
        bits: 4 + Math.floor(rand() * 60) });
    }
  }
  return script;
}

function applyOp(model, state, op) {
  if (op.type === 'elim') {
    state.candidates[op.cell] = op.bits;
    return { placements: [], eliminations: [[op.cell, 1]] };
  }
  state.candidates[op.cell] = op.bits;
  state.value[op.cell] = 1 + (op.bits % 15);
  model.peers[op.cell].forEach(function (p) { state.candidates[p] = (state.candidates[p] * 5 + 7) % 61 + 4; });
  return { placements: [[op.cell, 1]], eliminations: [] };
}

/**
 * Runs one script either natively or through the scoped runtime. Returns the token hash, the findings log and the
 * failure (if the budget threw at `failAt`).
 */
function runScript(side, seed, mode, options) {
  const model = makeModel(side);
  const rand = AU.mulberry32(seed ^ 0x5bd1e995);
  const state = randomState(model, rand);
  const audit = AU.createObserver();
  audit.reset();
  const kit = makeKit(audit);
  const ctx = makeCtx(model, audit, options.failAt);
  const SGfake = { __igSubsetKit: kit, __igBasicKit: {}, model: { cellLabel: function (m, c) { return 'c' + c; } } };
  let rt = null;
  let solve = null;
  if (mode === 'scoped') {
    rt = SM.create(SGfake);
    rt.configure({ audit: audit, verifySkips: options.verify !== false, mutation: options.mutation || null });
    solve = rt.begin(model, state, [], ctx);
  }
  const log = [];
  let failure = null;
  try {
    makeScript(seed, options.rounds || 5).forEach(function (op) {
      if (op.type === 'find') {
        DEFS.forEach(function (def) {
          const found = mode === 'scoped' ? rt.findSubset(model, state, ctx, def) : nativeFind(kit, audit, model, state,
            ctx, def);
          if (found === undefined) throw new Error('the runtime did not handle ' + def.id);
          log.push([def.id, found === null ? null : found.cells]);
        });
      } else {
        const finding = applyOp(model, state, op);
        if (solve !== null) solve.applied(finding);
        log.push([op.type, op.cell]);
      }
    });
  } catch (err) {
    if (!(err instanceof Boom)) throw err;
    failure = { at: err.at, ordinal: audit.ordinal, token: audit.lastTokenString(), nodes: kit.getNodes(), finds: log.length };
  }
  const s = audit.summary();
  return { hash: s.hash, checks: ctx.count(), findings: C.digestOf(log), failure: failure, checkpoints: s.checkpoints,
    first: s.first, last: s.last, stats: rt ? rt.snapshot() : null, skips: s.skips };
}

function sameRun(a, b) {
  return a.hash === b.hash && a.checks === b.checks && a.findings === b.findings &&
    C.canonicalJson(a.failure) === C.canonicalJson(b.failure);
}

// --- test cases -----------------------------------------------------------------------------------------------------

const cases = [];
function test(id, title, fn) {
  cases.push({ id: id, title: title, fn: fn });
}
function expect(cond, message) {
  if (!cond) throw new Error(message);
}

test('P01', 'the scoped runtime equals the native-style loop (check sequence, findings) on 40 scripts', function () {
  let skipped = 0;
  let virtual = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const ref = runScript(6, seed, 'ref', {});
    const sc = runScript(6, seed, 'scoped', {});
    expect(sameRun(ref, sc), 'seed ' + seed + ' differs: ' + ref.hash + ' vs ' + sc.hash);
    expect(sc.stats.violations.count === 0, 'seed ' + seed + ' audit violations ' + JSON.stringify(sc.stats.violations));
    Object.keys(sc.stats.finders).forEach(function (id) {
      skipped += sc.stats.finders[id].skippedScopes;
      virtual += sc.stats.finders[id].virtualNodeChecks;
    });
  }
  expect(skipped > 100 && virtual > 100, 'the scripts skipped too little (' + skipped + ' scopes, ' + virtual + ' virtual)');
});

test('P02', 'a failure injected at EVERY ordinal of a script fails at the same ordinal, site and boundary state', function () {
  let swept = 0;
  let inScope = 0;
  [3, 7].forEach(function (seed) {
    const total = runScript(6, seed, 'ref', {}).checks;
    for (let k = 1; k <= total; k++) {
      const ref = runScript(6, seed, 'ref', { failAt: k });
      const sc = runScript(6, seed, 'scoped', { failAt: k });
      expect(ref.failure !== null && sc.failure !== null, 'no failure at ordinal ' + k);
      expect(sameRun(ref, sc), 'seed ' + seed + ' ordinal ' + k + ': ' + C.canonicalJson(ref.failure) + ' vs ' +
        C.canonicalJson(sc.failure));
      const m = /^subset-(unit|node):.*:n(\d+):s/.exec(sc.failure.token || '');
      if (m) expect(sc.failure.nodes === Number(m[2]), 'the node counter at the throw is not the boundary at ' + k);
      swept++;
      if (m && m[1] === 'node') inScope++;
    }
  });
  expect(swept > 500 && inScope > 50, 'the sweep covered too little (' + swept + ', ' + inScope + ')');
});

test('P03', 'incoming residues differ and cross the cadence: skipped scopes replay one check per virtual position', function () {
  let residues = new Set();
  let multi = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const sc = runScript(6, seed, 'scoped', {});
    if (sc.skips) {
      multi += sc.skips.multi;
      expect(sc.skips.crossing > 0 || sc.skips.count === 0, 'no skipped scope crossed the cadence');
      residues = new Set(Array.from(residues).concat(Array.from({ length: sc.skips.distinctResidues }, function (_x, i) {
        return seed * 1000 + i; })));
    }
  }
  expect(multi > 10 && residues.size > 20, 'too few multi-check scopes or residues (' + multi + ', ' + residues.size + ')');
});

SM.MUTATIONS.forEach(function (mutation, i) {
  test('M0' + (i + 1), 'the deliberate mutation "' + mutation + '" is detected (it must FAIL the parity cases)', function () {
    let detected = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const ref = runScript(6, seed, 'ref', {});
      const mut = runScript(6, seed, 'scoped', { mutation: mutation, verify: false });
      if (!sameRun(ref, mut)) detected++;
    }
    expect(detected > 0, 'mutation ' + mutation + ' was not detected');
    // and the real prototype is back: no mutation, equal again
    const ref = runScript(6, 1, 'ref', {});
    expect(sameRun(ref, runScript(6, 1, 'scoped', {})), 'the restored prototype differs from the reference');
  });
});

test('M05', 'the stale-peer mutation is also caught by the shadow check of the audit mode', function () {
  let violations = 0;
  for (let seed = 1; seed <= 20; seed++) {
    violations += runScript(6, seed, 'scoped', { mutation: 'stale-peers' }).stats.violations.count;
  }
  expect(violations > 0, 'no unmarked change was reported');
});

test('M06', 'a bulk check that skips the true failure boundary is caught by an injected failure inside a skipped scope', function () {
  let caught = null;
  for (let seed = 1; seed <= 20 && caught === null; seed++) {
    const total = runScript(6, seed, 'ref', {}).checks;
    for (let k = 1; k <= total && caught === null; k += 3) {
      const ref = runScript(6, seed, 'ref', { failAt: k });
      const mut = runScript(6, seed, 'scoped', { mutation: 'bulk-check', failAt: k, verify: false });
      if (ref.failure !== null && (mut.failure === null || mut.failure.token !== ref.failure.token)) {
        caught = { seed: seed, ordinal: k };
      }
    }
  }
  expect(caught !== null, 'no injected failure exposed the bulk charge');
});

test('P04', 'per-solve ownership: another ctx or a foreign state is native, solves do not share dirty state', function () {
  const model = makeModel(6);
  const kit = makeKit(null);
  const SGfake = { __igSubsetKit: kit, __igBasicKit: {}, model: { cellLabel: function () { return ''; } } };
  const rt = SM.create(SGfake);
  const rand = AU.mulberry32(11);
  const stateA = randomState(model, rand);
  const stateB = randomState(model, rand);
  const ctxA = makeCtx(model, null);
  const ctxB = makeCtx(model, null);
  rt.begin(model, stateA, [], ctxA);
  rt.begin(model, stateB, [], ctxB);
  const def = DEFS[0];
  expect(rt.findSubset(model, stateA, ctxA, def) === null, 'solve A should find nothing');
  expect(rt.findSubset(model, stateA, makeCtx(model, null), def) === undefined, 'an unknown ctx must be native');
  expect(rt.findSubset(model, stateB, ctxA, def) === undefined, 'a foreign state must be native');
  const snap = rt.snapshot();
  expect(snap.fallbackReasons['no-solve-state'] === 1 && snap.fallbackReasons['foreign-state'] === 1,
    'the fallbacks were not counted: ' + JSON.stringify(snap.fallbackReasons));
  const before = snap.finders.nakedPair.skippedScopes;
  rt.findSubset(model, stateB, ctxB, def);
  expect(rt.snapshot().finders.nakedPair.skippedScopes === before, 'solve B must not see the proofs of solve A');
  rt.findSubset(model, stateA, ctxA, def);
  expect(rt.snapshot().finders.nakedPair.skippedScopes === before + model.units.length, 'solve A skips its own clean scopes');
});

test('P05', 'budget-error cleanup: an interrupted real scan records nothing and the cache stays valid after the throw', function () {
  const side = 6;
  const def = DEFS[4];
  const build = function () {
    const model = makeModel(side);
    const state = { candidates: new Int32Array(model.cellCount).fill(63), value: new Int32Array(model.cellCount),
      unsolvedCount: model.cellCount };
    return { model: model, state: state };
  };
  const a = build();
  const audit = AU.createObserver();
  audit.reset();
  const kit = makeKit(audit);
  const rt = SM.create({ __igSubsetKit: kit, __igBasicKit: {}, model: { cellLabel: function () { return ''; } } });
  rt.configure({ audit: audit, verifySkips: true });
  const ctx = makeCtx(a.model, audit, 2, true);
  rt.begin(a.model, a.state, [], ctx);
  let threw = false;
  try {
    rt.findSubset(a.model, a.state, ctx, def);
  } catch (err) {
    threw = err instanceof Boom;
  }
  expect(threw, 'the node check must throw inside the first unit');
  expect(rt.snapshot().finders[def.id].negativeRecorded === 0, 'an interrupted scan must not be recorded as negative');
  // after the swallowed error, the same solve goes on: its find must equal a native find from scratch
  audit.reset();
  const ctxAfter = ctx;
  const found = rt.findSubset(a.model, a.state, ctxAfter, def);
  const scopedHash = audit.summary().hash;
  const b = build();
  const auditRef = AU.createObserver();
  auditRef.reset();
  const kitRef = makeKit(auditRef);
  const ctxRef = makeCtx(b.model, auditRef);
  const foundRef = nativeFind(kitRef, auditRef, b.model, b.state, ctxRef, def);
  expect(found === foundRef && auditRef.summary().hash === scopedHash, 'the find after the throw differs from native');
  expect(rt.snapshot().violations.count === 0, 'audit violations after the throw');
});

test('P06', 'the audit comparison reports a mismatch with its context', function () {
  const a = ['t1', 't2', 't3', 't4'];
  const b = ['t1', 't2', 'X', 't4'];
  const ctx = AU.mismatchContext(a, b, 1025);
  expect(ctx !== null && ctx.ordinal === 1027 && ctx.reference.indexOf('t3') >= 0, 'bad context ' + JSON.stringify(ctx));
  expect(AU.firstDifferingWindow([1, 2, 3], [1, 9, 3], 4096).from === 1025, 'bad window');
  expect(AU.firstDifferingWindow([1, 2], [1, 2], 2048) === null, 'equal lists differ');
  const ok = AU.compareUnlimited({ checks: 5, hash: 'h', checkpoints: [], first: [], last: [], stepsDigest: 's', reportDigest: 'r' },
    { checks: 5, hash: 'h', checkpoints: [], first: [], last: [], stepsDigest: 's', reportDigest: 'r' }, null);
  expect(ok.equal, 'equal runs differ');
  const bad = AU.compareFailure({ completed: false, error: { code: 'x' }, ordinal: 3, token: 'a', steps: 1 },
    { completed: false, error: { code: 'x' }, ordinal: 4, token: 'a', steps: 1 }, null);
  expect(!bad.equal, 'different failure ordinals are equal');
});

test('P07', 'ordinal selection: first, middle, last, then before / middle / after the skipped scopes, deduplicated', function () {
  const b = { first: { ord0: 10, m: 0 }, firstMulti: { ord0: 40, m: 4 }, last: { ord0: 900, m: 2 },
    sampled: [{ ord0: 480, m: 3 }, { ord0: 100, m: 1 }] };
  const ks = AU.selectOrdinals(1000, b, 12);
  expect(ks.length <= 12 && new Set(ks).size === ks.length, 'not deduplicated or too long');
  [1, 1000, 500, 9, 42, 45].forEach(function (k) { expect(ks.indexOf(k) >= 0, 'missing ordinal ' + k + ' in ' + ks); });
  expect(AU.selectOrdinals(3, {}, 12).join() === '1,3,2', 'bad small selection ' + AU.selectOrdinals(3, {}, 12));
});

test('P08', 'the transforms apply to the current source (unique anchors, compiles) and leave the others alone', function () {
  const set = L.loadSourceSet({});
  [['scoped-solver'], ['scoped-audit'], ['scoped-solver', 'scoped-audit'], ['attempt-pool', 'scoped-solver']]
    .forEach(function (ids) {
      const plan = L.buildLoadPlan(set, ids.map(L.getAdapter));
      const patched = plan.items.filter(function (i) { return i.patched; }).map(function (i) {
        return i.rel.split('/').pop();
      });
      patched.forEach(function (name) {
        expect(['logical-solver.js', 'tech-basic.js', 'tech-subset.js', 'pipeline.js', 'digger.js'].indexOf(name) >= 0,
          'unexpected patched file ' + name);
      });
      expect(plan.transforms.every(function (t) { return t.beforeTextHash !== t.afterTextHash; }), 'a no-op transform');
    });
});

test('P09', 'the plan is fixed: 18 audit puzzles, 18 pooled and 6 serial observations, hashes in the manifest', function () {
  const M = require('./manifest.cjs');
  const manifest = M.buildManifest('IG-S03', 'provisional-r1');
  const by = function (exec) { return manifest.jobs.filter(function (j) { return j.executor === exec; }); };
  const audits = by('solver-audit');
  expect(audits.length === 19, 'audit jobs ' + audits.length);
  expect(audits.filter(function (j) { return j.audit.kind === 'puzzle'; }).length === 18, 'puzzle audits');
  expect(audits.every(function (j) { return j.audit.kind === 'synthetic' || /^[0-9a-f]{64}$/.test(j.audit.sha256); }),
    'a saved puzzle has no hash');
  const synthetic = audits.find(function (j) { return j.audit.kind === 'synthetic'; });
  expect(synthetic.audit.scenarios.length === 9 && synthetic.audit.scenarios.every(function (s) {
    return /^[0-9a-f]{64}$/.test(s.initialStateHash); }), 'synthetic hashes');
  expect(by('scoped-pool').length === 18 && by('scoped-native').length === 6, 'timing observations');
  const serial = by('scoped-native').map(function (j) { return j.puzzleVariant + ':' + j.requestSeed; }).sort().join(' ');
  expect(serial === 'classic9:3 greaterThan:3 killer:3 mega12:3 mega16:3 samurai:42', 'serial population ' + serial);
  expect(new Set(manifest.jobs.map(function (j) { return j.key; })).size === manifest.jobs.length, 'duplicate keys');
  expect(manifest.shards.length === 11, 'shards ' + manifest.shards.length);
});

// --- singles on the fake: the native algorithms of tech-basic.js over a unit list, applied by an iterate-like loop -------

function digitOf(bit) {
  return 32 - Math.clz32(bit);
}

function nativeHiddenSingle(model, state, ctx, unitList, id) {
  const cand = state.candidates;
  const val = state.value;
  for (let k = 0; k < unitList.length; k++) {
    const u = unitList[k];
    const cells = model.units[u];
    let once = 0;
    let twice = 0;
    let placed = 0;
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (val[c] !== 0) placed |= 1 << (val[c] - 1);
      else {
        twice |= once & cand[c];
        once |= cand[c];
      }
    }
    const hidden = once & ~twice & ~placed;
    if (hidden === 0) continue;
    const bit = hidden & -hidden;
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (val[c] === 0 && (cand[c] & bit) !== 0) {
        return { technique: id, cells: [c], placements: [[c, digitOf(bit)]], eliminations: [], unit: u };
      }
    }
  }
  return null;
}

function nativeNaked(state, n) {
  for (let c = 0; c < n; c++) {
    const m = state.candidates[c];
    if (state.value[c] === 0 && m !== 0 && (m & (m - 1)) === 0) {
      return { technique: 'nakedSingle', cells: [c], placements: [[c, digitOf(m)]], eliminations: [] };
    }
  }
  return null;
}

function runSingles(seed, mode, mutation) {
  const side = 6;
  const model = makeModel(side);
  model.digits = 6;
  const rand = AU.mulberry32(seed);
  const state = { candidates: new Int32Array(model.cellCount), value: new Int32Array(model.cellCount),
    unsolvedCount: model.cellCount };
  for (let c = 0; c < model.cellCount; c++) {
    let mask = 0;
    const want = 1 + Math.floor(rand() * 3);
    while (popcount(mask) < want) mask |= 1 << Math.floor(rand() * 6);
    state.candidates[c] = mask;
  }
  const geometry = { boxUnits: Int32Array.from([0, 1, 2, 3, 4, 5]), lineUnits: Int32Array.from([6, 7, 8, 9, 10, 11]) };
  const kit = { findHiddenSingle: nativeHiddenSingle, geometryOf: function () { return geometry; } };
  const SGfake = { __igBasicKit: kit, __igSubsetKit: makeKit(null), model: { cellLabel: function (m, c) { return c; } } };
  const ctx = makeCtx(model, null);
  let rt = null;
  let solve = null;
  if (mode === 'scoped') {
    rt = SM.create(SGfake);
    rt.configure({ mutation: mutation || null, verifySkips: true });
    solve = rt.begin(model, state, [], ctx);
  }
  const find = {
    nakedSingle: function () {
      const f = mode === 'scoped' ? rt.nakedSingle(model, state, ctx) : undefined;
      return f !== undefined ? f : nativeNaked(state, model.cellCount);
    },
    hiddenSingleBox: function () {
      const f = mode === 'scoped' ? rt.hiddenSingle(model, state, ctx, 'hiddenSingleBox') : undefined;
      return f !== undefined ? f : nativeHiddenSingle(model, state, ctx, geometry.boxUnits, 'hiddenSingleBox');
    },
    hiddenSingleLine: function () {
      const f = mode === 'scoped' ? rt.hiddenSingle(model, state, ctx, 'hiddenSingleLine') : undefined;
      return f !== undefined ? f : nativeHiddenSingle(model, state, ctx, geometry.lineUnits, 'hiddenSingleLine');
    }
  };
  const log = [];
  for (let step = 0; step < 80; step++) {
    let found = null;
    ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine'].some(function (id) {
      found = find[id]();
      return found !== null;
    });
    let finding;
    if (found !== null) {
      const c = found.cells[0];
      const d = found.placements[0][1];
      log.push([found.technique, c, d]);
      const bit = 1 << (d - 1);
      state.value[c] = d;
      state.candidates[c] = bit;
      model.peers[c].forEach(function (p) { state.candidates[p] &= ~bit; if (state.candidates[p] === 0) state.candidates[p] = 1; });
      finding = found;
    } else {
      const c = Math.floor(rand() * model.cellCount);
      const m = state.candidates[c];
      const d = 1 + Math.floor(rand() * 6);
      log.push(['elim', c, d]);
      if (state.value[c] === 0 && popcount(m) > 1 && (m & (1 << (d - 1))) !== 0) state.candidates[c] = m & ~(1 << (d - 1));
      finding = { placements: [], eliminations: [[c, d]] };
    }
    if (solve !== null) solve.applied(finding);
  }
  return { log: C.digestOf(log), steps: log.length, stats: rt ? rt.snapshot() : null };
}

test('P10', 'singles: naked and hidden scans over cached negatives equal the native scans (80 steps, 30 states)', function () {
  let skipped = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const ref = runSingles(seed, 'ref');
    const sc = runSingles(seed, 'scoped');
    expect(ref.log === sc.log, 'seed ' + seed + ' differs');
    expect(sc.stats.violations.count === 0, 'seed ' + seed + ' violations ' + JSON.stringify(sc.stats.violations));
    Object.keys(sc.stats.finders).forEach(function (id) { skipped += sc.stats.finders[id].skippedScopes; });
  }
  expect(skipped > 200, 'the singles skipped too little: ' + skipped);
});

test('M07', 'the stale-peer mutation is detected on singles too (steps differ or the audit reports an unmarked change)', function () {
  let detected = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const ref = runSingles(seed, 'ref');
    const mut = runSingles(seed, 'scoped', 'stale-peers');
    if (ref.log !== mut.log || mut.stats.violations.count > 0) detected++;
  }
  expect(detected > 0, 'not detected');
});

function run(options) {
  const results = [];
  cases.forEach(function (c) {
    const started = Date.now();
    try {
      c.fn();
      results.push({ id: c.id, title: c.title, ok: true, ms: Date.now() - started });
    } catch (err) {
      results.push({ id: c.id, title: c.title, ok: false, ms: Date.now() - started, detail: String(err && err.message) });
    }
  });
  return results;
}

module.exports = { run, cases, runScript, makeModel, makeKit, nativeFind, DEFS, sameRun };

if (require.main === module) {
  const results = run({});
  results.forEach(function (r) {
    process.stdout.write((r.ok ? 'ok   ' : 'FAIL ') + r.id + ' ' + r.title + ' (' + r.ms + ' ms)' +
      (r.ok ? '' : ' :: ' + r.detail) + '\n');
  });
  const failed = results.filter(function (r) { return !r.ok; }).length;
  process.stdout.write(results.length - failed + '/' + results.length + ' passed\n');
  process.exitCode = failed === 0 ? 0 : 1;
}
