'use strict';

/*
 * Tests of IG-S07 (test side, provisional (pre-freeze)).
 *
 * Pure cases (no engine, no worker thread, no timing, nothing written): the span accounting of the profile runtime on a fake
 * clock (nesting, finder leaves, hits and throws, context switches, throwing and abandoned frames, install and restore, a
 * property test of the reconciliation), the in-memory transforms of the adapter `profile` on the real sources (anchors,
 * compilation, the identifiers they use), the patched solver and technique sources run on a fake of the engine pieces (a toy
 * model, fake techniques with a fake clock, a budget with and without a limit, a budget error in a finder), the plan and its
 * packing, the reference compatibility on the current harness and the glue (identity, record additions). Nothing here
 * regenerates a puzzle.
 *
 * Engine cases (`engineChecks`) run on the real engine on three small requests in the first command of the round, under the
 * low-priority wrapper: the patched sources without the runtime and with it against an unpatched instance (same puzzle, same
 * number of budget checks), the consistency of the profile, a budget error in the middle of a run and an abandoned generator
 * (frames unwound, hooks removed, the next run native again).
 *
 *   node ig07-test.cjs [--filter=<text>]      development only: no engine, no timing, nothing written
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const C = require('./common.cjs');
const R = require('./records.cjs');
const M = require('./manifest.cjs');
const L = require('./loader.cjs');
const PR = require('./profile-runtime.cjs');
const PLAN = require('./plans/ig-s07.cjs');

const registry = [];

function add(id, group, title, fn) {
  registry.push({ id: id, group: group, title: title, fn: fn });
}

function check(condition, message) {
  if (!condition) throw new Error(message);
}

function equal(actual, expected, message) {
  if (C.canonicalJson(actual) !== C.canonicalJson(expected)) {
    throw new Error(message + ': expected ' + C.canonicalJson(expected) + ', got ' + C.canonicalJson(actual));
  }
}

function close(actual, expected, message, eps) {
  if (!(Math.abs(actual - expected) <= (eps === undefined ? 1e-9 : eps))) {
    throw new Error(message + ': expected ' + expected + ', got ' + actual);
  }
}

function throws(fn, test, message) {
  let thrown = null;
  try {
    fn();
  } catch (err) {
    thrown = err;
  }
  if (thrown === null) throw new Error(message + ': nothing was thrown');
  if (!test(thrown)) throw new Error(message + ': unexpected error ' + (thrown && thrown.code ? thrown.code : thrown));
  return thrown;
}

// --- the fake clock and the snapshot readers ----------------------------------------------------------------------------------

function fakeClock() {
  const clock = { t: 0, now: function () { return clock.t; }, advance: function (ms) { clock.t += ms; } };
  return clock;
}

function stageMs(snap, ctx, purpose, prim) {
  return snap.stage.filter(function (r) { return r[0] === ctx && r[1] === purpose && r[2] === prim; })
    .reduce(function (s, r) { return s + r[3]; }, 0);
}

function stageCount(snap, ctx, purpose, prim) {
  return snap.stage.filter(function (r) { return r[0] === ctx && r[1] === purpose && r[2] === prim; })
    .reduce(function (s, r) { return s + r[4]; }, 0);
}

function finderRow(snap, id) {
  const rows = snap.finders.filter(function (r) { return r[2] === id; });
  const sum = function (i) { return rows.reduce(function (s, r) { return s + r[i]; }, 0); };
  return { calls: sum(3), hits: sum(4), ms: sum(5), hitMs: sum(6), throwMs: sum(7), checks: sum(8), throws: sum(9) };
}

function totalMs(snap) {
  return snap.stage.reduce(function (s, r) { return s + r[3]; }, 0) + snap.finders.reduce(function (s, r) { return s + r[5]; }, 0);
}

// --- the profile runtime ----------------------------------------------------------------------------------------------------------

add('runtime.nesting-exclusive', 'runtime', 'nested frames book exclusive time; nothing is counted twice', function () {
  const k = fakeClock();
  const rt = PR.create({ now: k.now, techniqueIds: ['a'] });
  rt.begin();
  k.advance(2);
  const outer = rt.api.open('stageA.oracle');
  k.advance(3);
  const inner = rt.api.open('local.rating');
  k.advance(5);
  rt.api.close(inner);
  k.advance(1);
  rt.api.close(outer);
  k.advance(4);
  const snap = rt.finish();
  close(snap.rootMs, 15, 'root');
  close(stageMs(snap, 'setup', 'request', 'self'), 6, 'request self');
  close(stageMs(snap, 'setup', 'stageA.oracle', 'self'), 4, 'oracle self');
  close(stageMs(snap, 'setup', 'local.rating', 'self'), 5, 'rating self');
  close(totalMs(snap), 15, 'sum of the booked cells');
  equal(PR.consistency(snap), [], 'consistency');
  equal(snap.inclusiveMs['stageA.oracle'], { ms: 9, frames: 1 }, 'inclusive oracle');
});

add('runtime.context-switch', 'runtime', 'a context switch inside a frame splits its time exactly', function () {
  const k = fakeClock();
  const rt = PR.create({ now: k.now });
  rt.begin();
  k.advance(2);
  rt.setCtx(PR.CTX_ORDINARY);
  k.advance(3);
  const f = rt.api.open('step:dig');
  k.advance(1);
  rt.setCtx(PR.CTX_LOCAL);
  k.advance(4);
  rt.api.close(f);
  const snap = rt.finish();
  close(stageMs(snap, 'setup', 'request', 'self'), 2, 'setup');
  close(stageMs(snap, 'ordinary', 'request', 'self'), 3, 'ordinary gap');
  close(stageMs(snap, 'ordinary', 'step:dig', 'self'), 1, 'dig before the switch');
  close(stageMs(snap, 'local', 'step:dig', 'self'), 4, 'dig after the switch');
  equal(PR.consistency(snap), [], 'consistency');
});

add('runtime.finder-leaves', 'runtime', 'finder calls, hits, throws and applied Findings are leaves of the loop', function () {
  const k = fakeClock();
  const rt = PR.create({ now: k.now, techniqueIds: ['a', 'b'] });
  rt.begin();
  const purpose = rt.api.open('stageA.oracle');
  const handle = rt.api.solveBegin([{ id: 'a' }, { id: 'b' }]);
  const c = rt.api.c;
  const out = rt.api.iterate(function () {
    let t = handle.t();
    k.advance(1);
    handle.finder(0, t, null, true, c.checks);
    t = handle.t();
    k.advance(2);
    c.checks += 3;
    handle.finder(1, t, { technique: 'b' }, true, c.checks - 3);
    t = handle.t();
    k.advance(0.5);
    handle.applied(t);
    k.advance(0.25);
    t = handle.t();
    k.advance(3);
    handle.finder(0, t, undefined, false, c.checks);
    return 1;
  }, null, null, [], { budget: null }, null);
  equal(out, 1, 'the wrapped function result');
  rt.api.close(purpose);
  const snap = rt.finish();
  const a = finderRow(snap, 'a');
  const b = finderRow(snap, 'b');
  equal([a.calls, a.hits, a.throws], [2, 0, 1], 'finder a counts');
  close(a.ms, 4, 'finder a ms');
  close(a.throwMs, 3, 'finder a throw ms');
  equal([b.calls, b.hits, b.checks], [1, 1, 3], 'finder b counts and checks');
  close(b.hitMs, 2, 'finder b hit ms');
  close(stageMs(snap, 'setup', 'stageA.oracle', 'apply'), 0.5, 'apply ms');
  close(stageMs(snap, 'setup', 'stageA.oracle', 'solve.loop'), 0.25, 'loop self ms');
  equal(snap.counters.passes, 2, 'passes (calls of ladder index 0)');
  equal(snap.counters.applied, 1, 'applied');
  close(totalMs(snap), snap.rootMs, 'sum', 1e-9);
  equal(PR.consistency(snap), [], 'consistency');
});

add('runtime.throw-unwinding', 'runtime', 'a throwing call closes its frame; abandoned frames are closed at the unwinding', function () {
  const k = fakeClock();
  const rt = PR.create({ now: k.now });
  rt.begin();
  throws(function () {
    rt.api.call('stageB.objective', function () {
      k.advance(2);
      throw new Error('boom');
    });
  }, function (e) { return e.message === 'boom'; }, 'the error passes through');
  equal(rt.state().depth, 1, 'only the root is open');
  const outer = rt.api.open('step:dig');
  rt.api.open('stageA.oracle');
  k.advance(3);
  rt.api.close(outer);
  equal(rt.state().depth, 1, 'the leaked inner frame was closed with its outer one');
  equal(rt.state().leaked, 1, 'one leaked frame counted');
  rt.api.open('refine');
  rt.api.open('keeper.count');
  k.advance(1);
  const snap = rt.finish();
  equal(snap.nest.framesOpenAboveRootAtFinish, 2, 'two frames were open at finish');
  equal(snap.nest.leakedFramesClosedAtUnwind, 3, 'three frames closed by unwinding in all');
  equal(PR.consistency(snap, { allowLeaks: true }).length, 1, 'only the open-frames finding remains');
  close(totalMs(snap), snap.rootMs, 'every millisecond is booked even then', 1e-9);
});

add('runtime.property-reconciliation', 'runtime', 'random nests of frames, finders, applications and context switches reconcile', function () {
  const rnd = R.mulberry32(20261115);
  for (let n = 0; n < 300; n++) {
    const k = fakeClock();
    const rt = PR.create({ now: k.now, techniqueIds: ['f0', 'f1', 'f2', 'f3'] });
    rt.begin();
    const stack = [];
    const handle = rt.api.solveBegin([{ id: 'f0' }, { id: 'f1' }, { id: 'f2' }, { id: 'f3' }]);
    const labels = ['stageA.oracle', 'stageB.objective', 'safety.count', 'refine', 'local.rating', 'step:dig', 'step:rate'];
    const steps = 20 + Math.floor(rnd() * 80);
    for (let s = 0; s < steps; s++) {
      const roll = rnd();
      k.advance(Math.floor(rnd() * 8) * 0.25);
      if (roll < 0.2 && stack.length < 6) stack.push(rt.api.open(labels[Math.floor(rnd() * labels.length)]));
      else if (roll < 0.4 && stack.length > 0) rt.api.close(stack.pop());
      else if (roll < 0.55) rt.setCtx(Math.floor(rnd() * PR.CTX.length));
      else if (roll < 0.8) {
        const t = handle.t();
        k.advance(Math.floor(rnd() * 8) * 0.25);
        handle.finder(Math.floor(rnd() * 4), t, rnd() < 0.5 ? null : {}, rnd() < 0.9, rt.api.c.checks);
      } else {
        const t = handle.t();
        k.advance(Math.floor(rnd() * 4) * 0.25);
        handle.applied(t);
      }
    }
    while (stack.length > 0) rt.api.close(stack.pop());
    const snap = rt.finish();
    const problems = PR.consistency(snap);
    check(problems.length === 0, 'scenario ' + n + ': ' + problems.join('; '));
    close(totalMs(snap), snap.rootMs, 'scenario ' + n + ' sum', 1e-6);
  }
});

add('runtime.samples-and-local', 'runtime', 'a sample is a kind, an attempt and an ordinal; the local continuation is flagged by the strategy', function () {
  const k = fakeClock();
  const rt = PR.create({ now: k.now });
  rt.begin();
  const grid = rt.api.stepOpen('fullGrid', { attempt: 2, maxAttempts: 2 });
  k.advance(7);
  rt.api.stepClose(grid, 'fullGrid');
  rt.api.levelEnter({ proposal: true, where: { attempt: 2, sample: 1, maxSamples: 12 } });
  const dig = rt.api.stepOpen('dig', { attempt: 2, sample: 1 });
  k.advance(5);
  rt.api.stepClose(dig, 'dig');
  const tune = rt.api.stepOpen('tune', { attempt: 2, sample: 1 });
  rt.api.sampleResult({ exact: false, shallow: true, rating: { level: 'nightmare', score: 590, solved: true }, clues: 24,
    stats: { groups: 40, tried: 30, accepted: 12, rejected: 18, skipped: 3, oracleCalls: 30 } });
  rt.api.stepClose(tune, 'tune');
  k.advance(2);
  rt.api.localNext();
  rt.api.levelEnter({ proposal: false, where: { attempt: 2, sample: 12, maxSamples: 12 } });
  const dig2 = rt.api.stepOpen('dig', { attempt: 2, sample: 12 });
  k.advance(11);
  rt.api.stepClose(dig2, 'dig');
  const tune2 = rt.api.stepOpen('tune', {});
  rt.api.sampleResult({ exact: true, shallow: false, rating: { level: 'nightmare', score: 640, solved: true }, clues: 22, stats: null });
  rt.api.stepClose(tune2, 'tune');
  rt.api.levelEnter({ proposal: false, where: { attempt: 3, sample: 1 } });
  const snap = rt.finish();
  equal(snap.samples.map(function (s) { return [s.attempt, s.sample, s.kind, s.exact]; }),
    [[2, 1, 'proposal', false], [2, 12, 'local', true]], 'the observed samples');
  close(stageMs(snap, 'attempt', 'step:fullGrid', 'self'), 7, 'grid time is attempt-context');
  close(stageMs(snap, 'proposal', 'step:dig', 'self'), 5, 'proposal dig');
  close(stageMs(snap, 'attempt', 'request', 'self'), 2, 'the gap after tune is the restart loop');
  close(stageMs(snap, 'local', 'step:dig', 'self'), 11, 'local dig');
  close(snap.samples[0].wallMs, 5, 'sample wall', 1e-9);
  equal(snap.samples[0].stats.tried, 30, 'sample stats');
  equal(snap.samples[1].stats, null, 'no stats is null, never zero');
});

add('runtime.reasons-and-guided', 'runtime', 'oracle reasons and guided rounds are tallied by context', function () {
  const k = fakeClock();
  const rt = PR.create({ now: k.now });
  rt.begin();
  rt.setCtx(PR.CTX_ORDINARY);
  const oracle = function () { oracle.reason = 'tooHard'; return false; };
  oracle.reason = 'techniques';
  equal(rt.api.oracleCall(oracle, 1, 2, 3, 4, 5, 6), false, 'result passes through');
  const plain = function () { return false; };
  rt.api.oracleCall(plain, 1, 2, 3, 4, 5, 6);
  equal(rt.api.oracleCall(function () { return true; }, 1, 2, 3, 4, 5, 6), true, 'accepted passes through');
  rt.api.refusal(-1);
  rt.api.refusal(-3);
  rt.api.guidedRound(10, 4);
  rt.api.guidedRound(3, 3);
  const snap = rt.finish();
  equal(snap.refusals.stageA.ordinary, { techniques: 0, tooHard: 1, ambiguous: 1 }, 'stage A reasons');
  equal(snap.refusals.objective.ordinary, { techniques: 1, tooHard: 0, ambiguous: 1 }, 'objective reasons');
  equal(snap.guided[0].rounds, 2, 'rounds');
  equal([snap.guided[0].candidates, snap.guided[0].pool, snap.guided[0].minPool, snap.guided[0].maxPool], [13, 7, 3, 4], 'pool sizes');
  equal(stageCount(snap, 'ordinary', 'stageA.oracle', 'self'), 3, 'oracle frames');
});

function fakeSG() {
  const calls = [];
  const original = {
    solve: function () { calls.push('solve'); return 'solved'; },
    rate: function () { calls.push('rate'); return 'rated'; },
    countSolutions: function () { calls.push('count'); return 1; },
    stillUnique: function () { calls.push('still'); return true; },
    dfsSolve: function () { calls.push('dfs.solve'); return null; },
    searchFrom: function () { calls.push('from'); return { found: 0 }; },
    generate: function (model, rng, budget, options) {
      calls.push('grid');
      if (options && options.stats) Object.assign(options.stats, { attempts: 3, restarts: 2, backtracks: 41, fastSeed: true });
      return 'grid';
    }
  };
  const SG = { logicalSolver: { solve: original.solve }, difficulty: { rate: original.rate },
    dfs: { countSolutions: original.countSolutions, stillUnique: original.stillUnique, solve: original.dfsSolve,
      searchFrom: original.searchFrom }, fullGrid: { generate: original.generate } };
  return { SG: SG, original: original, calls: calls };
}

add('runtime.install-restore', 'runtime', 'install wraps the entry points, uninstall restores every one, even after a throw', function () {
  const k = fakeClock();
  const w = fakeSG();
  const rt = PR.create({ now: k.now });
  rt.begin();
  const info = rt.install(w.SG);
  equal(info.wrapped.length, 7, 'seven entry points wrapped');
  check(w.SG.__igProf !== undefined, 'the hook object is published');
  check(w.SG.logicalSolver.solve !== w.original.solve, 'solve is wrapped');
  equal(w.SG.logicalSolver.solve(), 'solved', 'the result passes through');
  w.SG.difficulty.rate();
  w.SG.dfs.stillUnique();
  const stats = {};
  w.SG.fullGrid.generate({}, {}, null, { stats: stats });
  throws(function () {
    w.SG.logicalSolver.solve = (function (inner) {
      return function () {
        inner();
        throw new Error('solver failed');
      };
    }(w.SG.logicalSolver.solve));
    w.SG.logicalSolver.solve();
  }, function (e) { return e.message === 'solver failed'; }, 'an error passes through the wrapper');
  const snap = rt.finish();
  const restore = rt.uninstall();
  equal(restore.restored, false, 'the replaced solve is reported, not hidden');
  equal(restore.problems.length, 1, 'one problem');
  check(w.SG.logicalSolver.solve === w.original.solve, 'solve is restored to the original');
  check(w.SG.difficulty.rate === w.original.rate && w.SG.dfs.countSolutions === w.original.countSolutions &&
    w.SG.dfs.stillUnique === w.original.stillUnique && w.SG.dfs.solve === w.original.dfsSolve &&
    w.SG.dfs.searchFrom === w.original.searchFrom && w.SG.fullGrid.generate === w.original.generate, 'every other entry point restored');
  check(w.SG.__igProf === undefined, 'the hook object is removed');
  equal(snap.grid, { calls: 1, attempts: 3, restarts: 2, backtracks: 41, fastSeeds: 1 }, 'full-grid counters');
  equal(snap.counters.solves, 2, 'the solve wrapper counted both calls');
  equal(stageCount(snap, 'setup', 'request', 'dfs.stillUnique'), 1, 'a dfs frame was booked under the open purpose');
  const rt2 = PR.create({ now: k.now });
  rt2.begin();
  rt2.install(w.SG);
  throws(function () { PR.create({ now: k.now }).install(w.SG); }, function (e) { return /another profile/.test(e.message); }, 'no second profile');
  equal(rt2.uninstall().restored, true, 'a clean restoration');
  const missing = fakeSG();
  delete missing.SG.dfs.stillUnique;
  throws(function () { PR.create({ now: k.now }).install(missing.SG); }, function (e) { return e.code === 'capability-missing'; },
    'a missing entry point is a capability error');
  check(missing.SG.logicalSolver.solve === missing.original.solve && missing.SG.__igProf === undefined,
    'a failed install leaves the engine untouched');
});

add('runtime.calibration', 'runtime', 'the unit costs are measured and finite', function () {
  const costs = PR.measureCosts({ iterations: 20000, repeats: 3 });
  ['clockReadNs', 'finderTimerPairNs', 'applyTimerNs', 'framePairNs', 'countedCheckNs', 'counterIncrementNs'].forEach(function (name) {
    check(Number.isFinite(costs[name]) && costs[name] >= 0, name + ' is a finite non-negative number');
  });
});

// --- the adapter on the real sources ---------------------------------------------------------------------------------------------------

function realPlan() {
  const set = L.loadSourceSet({ repoRoot: C.DEFAULT_REPO_ROOT });
  const adapter = L.getAdapter('profile');
  return { set: set, adapter: adapter, plan: L.buildLoadPlan(set, [adapter]) };
}

add('adapter.transforms-apply', 'adapter', 'every transform has a unique anchor, compiles, and only four sources change', function () {
  const p = realPlan();
  equal(p.plan.transforms.length, p.adapter.transforms.length, 'every transform applied');
  equal(p.plan.items.filter(function (i) { return i.patched; }).map(function (i) { return i.rel; }).sort(),
    ['../core/js/engine/dfs-solver.js', '../core/js/engine/logical-solver.js', '../core/js/engine/techniques.js',
      'js/engine/digger.js'], 'the patched files');
  p.plan.transforms.forEach(function (t) { check(t.beforeTextHash !== t.afterTextHash, t.id + ' changes its source'); });
  equal(p.set.fingerprint, p.plan.fingerprint, 'the plan carries the runtime fingerprint of the unmodified bytes');
});

add('adapter.identifiers', 'adapter', 'the inserted code only names identifiers of its function, the hook object or locals it declares', function () {
  const p = realPlan();
  const KEYWORDS = new Set(['const', 'let', 'if', 'else', 'try', 'finally', 'function', 'return', 'new', 'typeof', 'undefined',
    'null', 'true', 'false', 'SG', 'Math']);
  const byRel = new Map(p.set.files.map(function (e) { return [e.rel, e.text]; }));
  const declared = new Map();
  p.adapter.transforms.forEach(function (t) {
    const set = declared.get(t.file + '#' + t.anchor) || new Set();
    (t.code.match(/\b(?:const|let)\s+(ig[A-Za-z0-9]*)/g) || []).forEach(function (m) { set.add(m.split(/\s+/)[1]); });
    declared.set(t.file + '#' + t.anchor, set);
  });
  p.adapter.transforms.forEach(function (t) {
    const text = byRel.get(t.file);
    const at = text.indexOf(t.anchor);
    const indent = text.slice(text.lastIndexOf('\n', at - 1) + 1, at);
    const end = new RegExp('^' + indent + '\\}', 'm').exec(text.slice(at));
    const body = text.slice(at, at + end.index);
    const known = new Set(body.match(/[A-Za-z_$][\w$]*/g));
    const mine = declared.get(t.file + '#' + t.anchor);
    const code = t.code.replace(/'[^']*'/g, '\'\'');
    (code.match(/(?<![.\w$])[A-Za-z_$][\w$]*/g) || []).forEach(function (id) {
      if (KEYWORDS.has(id) || mine.has(id) || known.has(id)) return;
      throw new Error(t.id + ' names ' + id + ', which is neither a keyword, nor in ' + t.anchor + ', nor declared by it');
    });
    (code.match(/\big[A-Z][A-Za-z0-9]*/g) || []).forEach(function (id) {
      check(mine.has(id) || /^ig[A-Z]/.test(id) === false, t.id + ' uses ' + id + ' without a declaration');
    });
  });
});

add('adapter.no-random-or-solve', 'adapter', 'no inserted line draws a random number, shuffles, propagates or touches the constraint engine', function () {
  const forbidden = /(?:Math\.random|rng\.(?:next|int|shuffle|fork)|\.shuffle\(|SG\.constraints|propagate|SG\.model)/;
  realPlan().adapter.transforms.forEach(function (t) {
    t.code.split('\n').forEach(function (line) {
      // the native branch of a call wrapper repeats the original statement, which may fork a named stream
      if (/rng\.fork\('refine'\)/.test(line)) return;
      check(!forbidden.test(line), t.id + ' contains a forbidden call: ' + line.trim());
    });
  });
});

// --- the patched solver and technique sources on a fake of the engine pieces ----------------------------------------------------------------

function fakeEngine(clock) {
  const p = realPlan();
  const sandbox = {};
  vm.createContext(sandbox);
  const run = function (rel) {
    const item = p.plan.items.find(function (i) { return i.rel === rel; });
    vm.runInContext(item.code, sandbox, { filename: rel });
  };
  ['../core/js/engine/errors.js', '../core/js/engine/bits.js', '../core/js/engine/budget.js'].forEach(run);
  const SG = sandbox.SG;
  SG.model = {
    initState: function (model) {
      clock.advance(10);
      return { candidates: new Int32Array(model.cellCount).fill(SG.bits.full(model.digits)),
        value: new Int32Array(model.cellCount), unsolvedCount: model.cellCount };
    },
    cloneState: function (s) { return s; },
    isSolution: function (model, values) { return Array.prototype.every.call(values, function (v) { return v > 0; }); }
  };
  SG.constraints = {
    assign: function (model, st, cell, v) {
      clock.advance(0.5);
      if (st.value[cell] !== 0 && st.value[cell] !== v) return false;
      if (st.value[cell] === 0) st.unsolvedCount--;
      st.value[cell] = v;
      st.candidates[cell] = 1 << (v - 1);
      return true;
    },
    eliminate: function (model, st, cell, v) {
      clock.advance(0.5);
      st.candidates[cell] &= ~(1 << (v - 1));
      return st.candidates[cell] !== 0;
    },
    propagate: function () { return true; }
  };
  SG.dfs = { searchFrom: function () { return { solution: null }; }, countSolutions: function () { return 1; },
    stillUnique: function () { return true; }, solve: function () { return null; } };
  SG.difficulty = { rate: function () { return null; } };
  SG.fullGrid = { generate: function () { return null; } };
  run('../core/js/engine/techniques.js');
  run('../core/js/engine/logical-solver.js');
  const finding = function (id, placements, eliminations, cell) {
    return { technique: id, cells: [cell], placements: placements, eliminations: eliminations, i18nKey: 'k' };
  };
  const popcount = SG.bits.popcount;
  const lowest = function (mask) { return 32 - Math.clz32(mask & -mask); };
  const register = function (id, order, cost, find) {
    SG.techniques.register({ id: id, group: 'basic', baseCost: cost, order: order, i18nKey: 'x.' + id, find: find });
  };
  register('single', 10, 1, function (model, state, ctx) {
    clock.advance(1);
    ctx.check();
    for (let c = 0; c < model.cellCount; c++) {
      if (state.value[c] === 0 && popcount(state.candidates[c]) === 1) {
        return finding('single', [[c, lowest(state.candidates[c])]], [], c);
      }
    }
    return null;
  });
  const scan = function (id, limit, advance, checks) {
    return function (model, state, ctx) {
      clock.advance(advance);
      for (let i = 0; i < checks; i++) ctx.check();
      for (let c = 0; c < Math.min(limit, model.cellCount); c++) {
        if (state.value[c] === 0 && popcount(state.candidates[c]) > 1) {
          return finding(id, [], [[c, lowest(state.candidates[c])]], c);
        }
      }
      return null;
    };
  };
  register('scanA', 20, 2, scan('scanA', 2, 2, 2));
  register('scanB', 30, 3, scan('scanB', 99, 4, 1));
  return { SG: SG, sandbox: sandbox, model: { variantId: 'toy', cellCount: 4, digits: 3, units: [[0, 1, 2, 3]], unitMeta: [{}] } };
}

add('solver.fake-engine-profile', 'solver', 'the patched solver and techniques: timers, hits, checks and apply on a fake clock', function () {
  const clock = fakeClock();
  const engine = fakeEngine(clock);
  const SG = engine.SG;
  const givens = [1, 0, 0, 0];
  const native = SG.logicalSolver.solve(engine.model, givens, { budget: SG.budget.create({}) });
  const nativeBudget = SG.budget.create({});
  SG.logicalSolver.solve(engine.model, givens, { budget: nativeBudget });
  clock.t = 0;
  const rt = PR.create({ now: clock.now, techniqueIds: SG.techniques.list().map(function (t) { return t.id; }) });
  rt.install(SG);
  rt.begin();
  const budget = SG.budget.create({});
  const report = SG.logicalSolver.solve(engine.model, givens, { budget: budget });
  const snap = rt.finish();
  const restore = rt.uninstall();
  equal(restore.restored, true, 'restored');
  check(SG.__igProf === undefined, 'no hook object after the run');
  equal(C.canonicalJson(report), C.canonicalJson(native), 'the report is the native one');
  equal(budget.nodes, nativeBudget.nodes, 'the number of budget checks is the native one');
  equal(PR.consistency(snap), [], 'consistency');
  const single = finderRow(snap, 'single');
  const a = finderRow(snap, 'scanA');
  const b = finderRow(snap, 'scanB');
  equal([single.calls, single.hits, a.calls, a.hits, b.calls, b.hits], [9, 3, 6, 2, 4, 4], 'calls and hits');
  close(single.ms, 9, 'single ms');
  close(single.hitMs, 3, 'single hit ms');
  close(a.ms, 12, 'scanA ms');
  close(a.hitMs, 4, 'scanA hit ms');
  close(b.ms, 16, 'scanB ms');
  equal([single.checks, a.checks, b.checks], [9, 12, 4], 'finder checks (a budget is present)');
  equal(snap.counters.finderChecks + snap.counters.loopChecks, budget.nodes,
    'finder checks plus the observed loop checks are exactly the budget checks');
  equal(snap.counters.loopChecksDerived, snap.counters.loopChecks, 'on a solved puzzle the r1 derivation happens to agree');
  equal([snap.counters.passes, snap.counters.applied, snap.counters.solves], [9, 9, 1], 'passes, applied, solves');
  close(stageMs(snap, 'setup', 'request', 'solve.setup'), 10.5, 'state and givens work');
  close(stageMs(snap, 'setup', 'request', 'apply'), 4.5, 'applied Findings');
  close(stageMs(snap, 'setup', 'request', 'solve.loop'), 0, 'loop overhead');
  close(snap.rootMs, 52, 'root');
  // without a budget the finders' checks are not charged and are not counted
  clock.t = 0;
  const rt2 = PR.create({ now: clock.now, techniqueIds: ['single', 'scanA', 'scanB'] });
  rt2.install(SG);
  rt2.begin();
  SG.logicalSolver.solve(engine.model, givens, {});
  const snap2 = rt2.finish();
  rt2.uninstall();
  equal([snap2.counters.finderChecks, snap2.counters.loopChecks], [0, 0], 'no budget, no checks');
});

add('solver.fake-engine-error', 'solver', 'a budget error inside a finder is counted as a throw; frames and hooks are restored', function () {
  const clock = fakeClock();
  const engine = fakeEngine(clock);
  const SG = engine.SG;
  const rt = PR.create({ now: clock.now, techniqueIds: SG.techniques.list().map(function (t) { return t.id; }) });
  rt.install(SG);
  rt.begin();
  const err = throws(function () {
    SG.logicalSolver.solve(engine.model, [1, 0, 0, 0], { budget: SG.budget.create({ nodes: 5 }) });
  }, function (e) { return e.code === 'budget.exceeded'; }, 'the budget error reaches the caller');
  const snap = rt.finish();
  equal(rt.uninstall().restored, true, 'restored after the error');
  equal(PR.consistency(snap), [], 'consistent after the error');
  equal(finderRow(snap, 'single').throws, 1, 'the finder that was running is a throw');
  equal(snap.nest.leakedFramesClosedAtUnwind, 0, 'every frame closed through its own finally');
  check(err.code === 'budget.exceeded', 'the error is the native one');
  const after = SG.logicalSolver.solve(engine.model, [1, 0, 0, 0], { budget: SG.budget.create({}) });
  equal(after.solved, true, 'the next solve is native and works');
});

// A fake of the engine pieces with the real patched solver and the real budget: three ladders (none, one that ends stuck, one that
// solves) under every budget limit, in the three modes of the loop check.
function fakeLoopRows(mode) {
  const clock = fakeClock();
  const engine = fakeEngine(clock);
  const W = require('./ig07-worker.cjs');
  const cases = [
    { name: 'empty-ladder', givens: [0, 0, 0, 0], techniques: [] },
    { name: 'fake-stuck', givens: [0, 0, 0, 0], techniques: ['single'] },
    { name: 'fake-solved', givens: [1, 0, 0, 0], techniques: ['single', 'scanA', 'scanB'] }
  ];
  return { rows: W.runLoopCases(engine.SG, engine.model, cases, mode), SG: engine.SG };
}

add('solver.loop-check-boundaries', 'solver', 'the observed loop checks equal the budget\'s own count at every limit, where the r1 derivation does not', function () {
  const plain = fakeLoopRows('plain');
  const patched = fakeLoopRows('patched');
  const ready = { transforms: new Array(L.getAdapter('profile').transforms.length).fill({}), adapterIds: ['profile'] };
  const verdict = judgeLoopRows(plain.rows, patched.rows, ready);
  equal(verdict.filter(function (r) { return !r.ok; }).map(function (r) { return r.id + ': ' + C.canonicalJson(r.detail); }), [], 'every check passes');
  const empty = patched.rows.find(function (c) { return c.name === 'empty-ladder'; });
  const at = function (limit) { return empty.rows.find(function (r) { return r.limit === limit; }).on; };
  equal([at(0).code, at(0).nodes, at(0).profile.loopChecks, at(0).profile.loopChecksDerived], ['budget.exceeded', 1, 1, 0],
    'a check that throws before the first finder: observed, not derived');
  equal([at(1).code, at(1).nodes, at(1).profile.loopChecks, at(1).profile.loopChecksDerived], ['budget.exceeded', 2, 2, 0],
    'a check that throws before a stuck result: observed, not derived');
  equal([at(2).status, at(2).nodes, at(2).profile.loopChecks, at(2).profile.loopChecksDerived], ['stuck', 2, 2, 1],
    'an empty ladder: two loop checks, one derived');
  const solved = patched.rows.find(function (c) { return c.name === 'fake-solved'; });
  const throwsInFinder = solved.rows.filter(function (r) { return r.on.profile.finderThrows > 0; });
  check(throwsInFinder.length > 0, 'a limit that throws inside a finder is covered too');
  throwsInFinder.forEach(function (r) {
    equal(r.on.profile.loopChecks + r.on.profile.finderChecks, r.on.nodes, 'observed checks at limit ' + r.limit);
  });
  check(patched.SG.__igProf === undefined, 'no hook object is left behind');
});

add('loop.judge-rows', 'loop', 'the loop-check verdicts: a changed budget count, an unobserved check and a missing boundary are refused', function () {
  const ready = { transforms: new Array(L.getAdapter('profile').transforms.length).fill({}), adapterIds: ['profile'] };
  const failing = function (mutate) {
    const plain = fakeLoopRows('plain').rows;
    const patched = fakeLoopRows('patched').rows;
    mutate(plain, patched);
    return judgeLoopRows(plain, patched, ready).filter(function (r) { return !r.ok; }).map(function (r) { return r.id; });
  };
  equal(failing(function () {}), [], 'the untouched rows pass');
  equal(failing(function (plain, patched) { patched[1].rows[3].on.nodes += 1; }), ['loop.parity.fake-stuck', 'loop.observed.fake-stuck'],
    'a profiled run that charged the budget differently');
  equal(failing(function (plain, patched) { patched[0].rows[3].on.profile.loopChecks -= 1; }), ['loop.observed.empty-ladder'],
    'an unobserved check');
  equal(failing(function (plain, patched) { patched[0].rows[0].on.profile.loopChecks = 0; }).indexOf('loop.boundary-first-check') >= 0, true,
    'a first check that was not observed');
  equal(failing(function (plain, patched) { patched.forEach(function (c) { c.rows.forEach(function (r) { r.on.profile.restored = false; }); }); })
    .filter(function (id) { return /^loop\.observed/.test(id); }).length, 3, 'a hook that was not restored');
  equal(failing(function (plain, patched) { patched.forEach(function (c) { c.rows.forEach(function (r) {
    r.on.profile.loopChecksDerived = r.on.profile.loopChecks;
  }); c.unlimited.on.profile.loopChecksDerived = c.unlimited.on.profile.loopChecks; }); }), ['loop.r1-derivation-misses'],
  'a derivation that agrees everywhere would not show the defect the boundaries exercise');
});

// --- the plan and the glue --------------------------------------------------------------------------------------------------------------------------

add('plan.population', 'plan', 'nine shards, twelve requests, the literal cells and seeds of the task file; the request-free loop-check shard', function () {
  const manifest = M.buildManifest('IG-S07', 'provisional-r1');
  equal(manifest.shards.map(function (s) { return s.shard; }),
    ['c9', 'm16', 'm12', 'sam', 'killer-n', 'gt-n', 'killer-h', 'killer-e', 'gt-normal', 'lc'], 'the shards in execution order');
  equal(manifest.shards.find(function (s) { return s.shard === 'lc'; }).jobKeys, [], 'the loop-check shard holds no request');
  equal(manifest.jobs.length, 12, 'twelve requests');
  const want = {
    m16: ['mega16', 'nightmare', 3], m12: ['mega12', 'nightmare', 3], sam: ['samurai', 'nightmare', 42],
    c9: ['classic9', 'nightmare', 3], 'killer-n': ['killer', 'nightmare', 3], 'gt-n': ['greaterThan', 'nightmare', 3],
    'killer-h': ['killer', 'hard', 1], 'killer-e': ['killer', 'expert', 1], 'gt-normal': ['greaterThan', 'normal', 300]
  };
  manifest.jobs.forEach(function (j) {
    equal([j.puzzleVariant, j.level, j.requestSeed], want[j.shard], 'population of ' + j.key);
    equal(j.request, { variantId: j.puzzleVariant, difficulty: j.level, seed: j.requestSeed, trace: 'off',
      symmetry: 'rotational180', digOrder: 'random' }, 'the IG-S02 request of ' + j.key);
  });
  const controls = ['killer-h', 'killer-e', 'gt-normal'];
  manifest.shards.forEach(function (s) {
    if (s.shard === 'lc') return;
    const jobs = manifest.jobs.filter(function (j) { return j.shard === s.shard; });
    if (controls.indexOf(s.shard) >= 0) {
      equal(jobs.map(function (j) { return j.variantId; }), ['unprofiled', 'profiled'], s.shard + ': unprofiled arm first');
      equal(jobs.map(function (j) { return j.adapterIds.length; }), [0, 1], s.shard + ': adapters');
    } else {
      equal(jobs.map(function (j) { return j.variantId; }), ['profiled'], s.shard + ': the profiled arm only');
    }
  });
  equal(M.ALLOCATIONS_MS['IG-S07'], 12 * 60000, 'the 12-minute allocation');
});

add('plan.packing-and-baselines', 'plan', 'every shard fits one command window; the six IG-S02 comparators exist', function () {
  const manifest = M.buildManifest('IG-S07', 'provisional-r1');
  const window = M.commandWindowMs(C.GUARDS.commandMs);
  manifest.shards.forEach(function (s) {
    if (s.jobKeys.length === 0) return;
    const packed = M.packCommands(M.blocksFor(manifest, s.jobKeys), window);
    equal([packed.commands.length, packed.oversize.length], [1, 0], s.shard + ' is one command');
  });
  PLAN.CELLS.filter(function (c) { return c.kind === 'headline'; }).forEach(function (c) {
    const base = PLAN.baselineRecordsFile(C.DEFAULT_REPO_ROOT, c.cell, c.seed);
    const records = C.readJson(path.join(C.DEFAULT_REPO_ROOT, ...base.file.split('/'))).records;
    const rec = records.find(function (r) { return r.key === base.key; });
    check(rec && rec.digests && rec.generation.readyWallMs > 0, 'the comparator ' + base.key + ' has digests and a ready wall');
  });
});

add('glue.reference-compatibility', 'glue', 'the IG-S02 reference of every headline cell is compatible with the current harness', function () {
  const G = require('./ig07-run.cjs');
  const set = L.loadSourceSet({ repoRoot: C.DEFAULT_REPO_ROOT });
  const manifest = M.buildManifest('IG-S07', 'provisional-r1');
  manifest.jobs.filter(function (j) { return j.cellKind === 'headline'; }).forEach(function (job) {
    const base = PLAN.baselineRecordsFile(C.DEFAULT_REPO_ROOT, job.puzzleVariant, job.requestSeed);
    const command = C.readJson(path.join(C.DEFAULT_REPO_ROOT, ...path.dirname(base.file).split('/'), 'command.json'));
    const compat = G.referenceCompat(C.DEFAULT_REPO_ROOT, job, set.fingerprint, command.catalogueFingerprint);
    equal(compat.problems, [], 'compatibility problems of ' + job.key);
    equal(compat.accountingFilesChanged, [], 'accounting files of ' + job.key);
    // the runtime is not the one: refused
    const wrong = G.referenceCompat(C.DEFAULT_REPO_ROOT, job, 'f'.repeat(64), command.catalogueFingerprint);
    check(wrong.ok === false && /runtime/.test(wrong.problems[0]), 'a different runtime is refused');
  });
});

function profiledRecord(over) {
  const job = M.buildManifest('IG-S07', 'provisional-r1').jobs.find(function (j) { return j.shard === 'killer-h' && j.arm === 'prototype'; });
  const rec = R.recordBase(job);
  rec.outcome = 'complete';
  rec.cellKind = 'control';
  rec.digests = { structure: 's', givens: 'g', solution: 'o', rating: 'r', config: 'c', warnings: 'w', log: 'l', work: 'k',
    scalars: 'x', puzzle: 'p', all: 'a' };
  rec.claimedExact = false;
  rec.verifiedExact = false;
  rec.puzzleHash = 'p';
  rec.generation = Object.assign(rec.generation, { readyWallMs: 100, coldWallMs: 150, cpuTotalMs: 110 });
  return Object.assign(rec, over || {});
}

// --- the host-side executor and the prepare flow on a scripted fake worker -----------------------------------------------------------------------------------------

function fakeWorkerFactory(script) {
  const EventEmitter = require('events');
  return function (file, data) {
    const w = new EventEmitter();
    w.postMessage = function (msg) {
      if (msg && msg.type === 'job') setImmediate(function () { script.onJob(w, msg.job, data); });
    };
    w.terminate = function () {
      setImmediate(function () { w.emit('exit', 0); });
      return Promise.resolve(0);
    };
    setImmediate(function () {
      w.emit('message', { type: 'ready', loadMs: 5, runtimeFingerprint: 'fake', adapterIds: data.adapterIds || [],
        adapterHashes: [], transforms: (data.adapterIds || []).length > 0 ? L.getAdapter('profile').transforms.map(function (t) {
          return { id: t.id, file: t.file, beforeTextHash: 'a', afterTextHash: 'b' };
        }) : [],
        patchedFiles: [], proof: null, catalogue: data.wantCatalogue ? script.catalogue || null : null });
    });
    return w;
  };
}

function scriptedProfile() {
  const k = fakeClock();
  const rt = PR.create({ now: k.now, techniqueIds: ['nakedSingle'] });
  rt.begin();
  rt.api.levelEnter({ proposal: false, where: { attempt: 1, sample: 1 } });
  k.advance(3);
  rt.api.sampleResult({ exact: false, shallow: true, rating: { level: 'hard', score: 100, solved: true }, clues: 30, stats: null });
  return rt.finish();
}

function scriptedWire(exact) {
  return { v: 1, model: { variantId: 'killer', cellCount: 4, digits: 4, units: [], unitMeta: [], cages: [], inequalities: [], layout: {}, symbols: {},
    fixedCells: [] }, givens: [1, 0, 0, 4], solution: [1, 2, 3, 4], rating: { level: 'hard', score: 100, solved: true }, exact: exact, seed: 1,
  config: { variantId: 'killer', difficulty: 'hard', seed: 1 }, timings: { dig: 2 }, attempts: 1, warnings: [], digLog: [],
  work: [{ ratings: 3, proposals: 0, maxRatings: 1024, maxProposals: 32768, localSearches: [] }] };
}

add('host.profiled-request-executor', 'host', 'the profiled request is the host path with the ig07 job kind; the profile message is collected and the spawn hook restored', async function () {
  const H = require('./host.cjs');
  const G = require('./ig07-run.cjs');
  const RUN = require('./run.cjs');
  const jobs = M.buildManifest('IG-S07', 'provisional-r1').jobs.filter(function (j) { return j.shard === 'killer-h'; });
  const seen = [];
  const mk = function (mode) {
    const script = { onJob: function (w, job, data) {
      seen.push({ kind: job.kind, adapters: data.adapterIds, config: job.config });
      if (job.kind === 'ig07-profile-request') {
        if (mode === 'error') {
          w.emit('message', { type: 'ig07-profile', profile: scriptedProfile(), restore: { restored: true, problems: [] }, runMs: 3, ok: false, runError: {} });
          w.emit('message', { type: 'error', error: { code: 'budget.exceeded', name: 'GenerationError', message: 'x', work: null } });
          return;
        }
        w.emit('message', { type: 'ig07-profile', profile: scriptedProfile(), restore: { restored: true, problems: [] }, runMs: 3, ok: true, runError: null });
      }
      w.emit('message', { type: 'decision', wire: scriptedWire(false), engineElapsedMs: 3 });
    } };
    return new H.Host({ repoRoot: C.DEFAULT_REPO_ROOT, workerFactory: fakeWorkerFactory(script), testOnly: true });
  };
  const profiledJob = jobs.find(function (j) { return j.arm === 'prototype'; });
  const plainJob = jobs.find(function (j) { return j.arm === 'reference'; });
  const host = mk('ok');
  const spawnBefore = host.spawn;
  const obs = await G.execute({ host: host, job: profiledJob, catalogue: null, readyCheck: null });
  equal(obs.outcome, 'complete', 'decided');
  equal([seen[0].kind, seen[0].adapters, seen[0].config], ['ig07-profile-request', ['profile'], profiledJob.request], 'the profiled job kind, adapter and the IG-S02 request');
  equal(obs.profileMessageCount, 1, 'one profile message collected');
  check(host.spawn === spawnBefore && !Object.prototype.hasOwnProperty.call(host, 'spawn'), 'the passive spawn hook is removed again');
  const rec = RUN.recordOfRequest(profiledJob, obs, null, { deadlineMs: 270000 });
  G.augmentRecord(rec, profiledJob, obs, {});
  equal(R.checkRecord(rec), [], 'a well-formed record');
  equal([rec.solverMode, rec.cellKind, rec.profileProblems, rec.samplesUsed], ['profiled', 'control', [], 1], 'record additions');
  // the unprofiled arm is the unchanged host path
  const plain = await mk('ok').runRequest({ key: plainJob.key, request: plainJob.request, adapterIds: plainJob.adapterIds, guardScope: 'request', wantCatalogue: false });
  equal([plain.outcome, seen[seen.length - 1].kind, seen[seen.length - 1].adapters], ['complete', 'pipeline-request', []], 'the unprofiled arm: native kind, no adapter');
  // an engine error after the profile: the profile of the failed request is kept, the outcome is an error
  const failed = await G.execute({ host: mk('error'), job: profiledJob, catalogue: null, readyCheck: null });
  equal([failed.outcome, failed.error.code, failed.profileMessageCount], ['error', 'budget.exceeded', 1], 'an error keeps its profile');
  const frec = RUN.recordOfRequest(profiledJob, failed, null, { deadlineMs: 270000 });
  G.augmentRecord(frec, profiledJob, failed, {});
  equal(frec.profileProblems, [], 'a consistent profile of an errored request');
});

add('glue.prepare-flow', 'glue', 'prepare: probe, reference compatibility, calibration and the engine checks on scripted workers; a different catalogue stops', async function () {
  const H = require('./host.cjs');
  const G = require('./ig07-run.cjs');
  const set = L.loadSourceSet({ repoRoot: C.DEFAULT_REPO_ROOT });
  const jobs = M.buildManifest('IG-S07', 'provisional-r1').jobs.filter(function (j) { return j.shard === 'm12'; });
  const base = PLAN.baselineRecordsFile(C.DEFAULT_REPO_ROOT, 'mega12', 3);
  const command = C.readJson(path.join(C.DEFAULT_REPO_ROOT, ...path.dirname(base.file).split('/'), 'command.json'));
  const rowFor = function (spec, mode) {
    return { name: spec.name, mode: mode, plain: { ok: true, digest: 'd', nodes: 10, error: null },
      off: { ok: true, digest: 'd', nodes: 10, error: null },
      on: { ok: true, digest: 'd', nodes: 10, error: null, snapshot: { counters: { finderCalls: 5, canonicalRates: 2 }, samples: [{}],
        inclusiveMs: { 'step:dig': { ms: 1 } } }, restore: { restored: true }, consistency: [], workRatings: 2, snapshotBytes: 100 },
      hooksPresentAfter: false, failing: { ok: false, code: 'budget.exceeded', restore: { restored: true }, hooksPresentAfter: false, openAtFinish: 0, consistency: [] },
      afterFailure: { ok: true, digest: 'd', nodes: 10 }, abandoned: { restore: { restored: true }, hooksPresentAfter: false, openAtFinish: 0, consistency: [] } };
  };
  const run = async function (catalogueFingerprint) {
    const script = { catalogue: { snapshot: {}, fingerprint: catalogueFingerprint }, onJob: function (w, job) {
      if (job.kind === 'ig07-calibrate') {
        w.emit('message', { type: 'decision', wire: null, engineElapsedMs: 0, costs: { clockReadNs: 30, finderTimerPairNs: 80, applyTimerNs: 70,
          framePairNs: 120, countedCheckNs: 4, counterIncrementNs: 1 } });
      } else if (job.kind === 'ig07-check') {
        w.emit('message', { type: 'decision', wire: null, engineElapsedMs: 0, rows: job.cases.map(function (c) { return rowFor(c, job.mode); }) });
      }
    } };
    const host = new H.Host({ repoRoot: C.DEFAULT_REPO_ROOT, runtimeFingerprint: set.fingerprint, workerFactory: fakeWorkerFactory(script), testOnly: true });
    return G.prepare({ host: host, jobs: jobs, runKeys: new Set(jobs.map(function (j) { return j.key; })), repoRoot: C.DEFAULT_REPO_ROOT,
      round: 'provisional-r1', readyCheck: null });
  };
  const good = await run(command.catalogueFingerprint);
  equal(good.failure, null, 'no failure');
  equal([good.compat.length, good.compat[0].ok], [1, true], 'the headline reference is compatible');
  equal(good.calibration.clockReadNs, 30, 'the calibration is kept');
  if (good.synthetic) equal([good.synthetic.ok, good.synthetic.passed === good.synthetic.total], [true, true], 'the engine checks pass on good rows');
  const bad = await run('0'.repeat(64));
  check(bad.failure && bad.failure.code === 'reference-incompatible', 'a different catalogue stops the run before any generation');
});

add('glue.prepare-loop-check', 'glue', 'the request-free shard lc: the loop-check comparison only, no probe, no calibration, a failed verdict is recorded not stopped', async function () {
  const H = require('./host.cjs');
  const G = require('./ig07-run.cjs');
  const set = L.loadSourceSet({ repoRoot: C.DEFAULT_REPO_ROOT });
  const run = async function (tamper) {
    const seen = [];
    const script = { onJob: function (w, job) {
      seen.push(job.kind + ':' + job.mode);
      if (job.kind !== 'ig07-loopcheck') return;
      const rows = fakeLoopRows(job.mode).rows;
      if (tamper && job.mode === 'patched') rows[0].rows[3].on.profile.loopChecks -= 1;
      w.emit('message', { type: 'decision', wire: null, engineElapsedMs: 1, rows: rows });
    } };
    const host = new H.Host({ repoRoot: C.DEFAULT_REPO_ROOT, runtimeFingerprint: set.fingerprint, workerFactory: fakeWorkerFactory(script), testOnly: true });
    const out = await G.prepare({ host: host, shard: { shard: 'lc' }, jobs: [], runKeys: new Set(), repoRoot: C.DEFAULT_REPO_ROOT,
      round: 'provisional-r1', readyCheck: null });
    return { out: out, seen: seen };
  };
  const good = await run(false);
  equal(good.seen, ['ig07-loopcheck:plain', 'ig07-loopcheck:patched'], 'two workers, nothing else (no probe, no calibration)');
  equal([good.out.failure, good.out.loopCheck.ok, good.out.catalogue, good.out.calibration], [null, true, null, null], 'a passing verdict');
  check(/^loop-check \(real engine, revision r2\): \d+\/\d+ passed$/.test(good.out.notes[0]), 'the note of the command');
  check(good.out.loopCheck.rows.plain.length === good.out.loopCheck.rows.patched.length, 'the rows of both workers are kept');
  const bad = await run(true);
  equal([bad.out.failure, bad.out.loopCheck.ok], [null, false], 'a failed verdict is recorded and does not stop the command');
  check(/failed: loop\.observed\.empty-ladder/.test(bad.out.notes[0]), 'the failed check is named');
  const summary = G.summary({ prepared: good.out, records: [], mergedRecords: [], parity: null, chainInfo: null, shard: 'lc' });
  check(summary.extra.loopCheck && summary.extra.loopCheck.ok === true, 'the shard summary carries the verdict');
});

add('glue.identity', 'glue', 'profiled output against the comparator: equal, different, not comparable', function () {
  const G = require('./ig07-run.cjs');
  const profiled = profiledRecord();
  const jobs = M.buildManifest('IG-S07', 'provisional-r1').jobs.filter(function (j) { return j.shard === 'killer-h'; });
  const plainJob = jobs.find(function (j) { return j.arm === 'reference'; });
  const plain = Object.assign(R.recordBase(plainJob), { outcome: 'complete', digests: profiled.digests, claimedExact: false,
    puzzleHash: 'p', cellKind: 'control' });
  equal(G.identity([plain, profiled]).ok, 1, 'equal digests are identity-ok');
  const other = Object.assign({}, plain, { digests: Object.assign({}, profiled.digests, { all: 'b', log: 'm' }) });
  const failed = G.identity([other, profiled]);
  equal([failed.failed, failed.pairs[0].differing], [1, ['log']], 'a different log is identity-failed');
  equal(G.identity([profiled]).notComparable, 1, 'no comparator is not comparable');
  equal(G.identity([plain, Object.assign({}, profiled, { outcome: 'request-timeout' })]).notComparable, 1, 'a censored arm is not comparable');
  const headline = Object.assign({}, profiled, { shard: 'm12', cellKind: 'headline', puzzleVariant: 'mega12', requestSeed: 3 });
  const base = G.baselineRecord(C.DEFAULT_REPO_ROOT, 'mega12', 3);
  equal(G.identity([Object.assign({}, headline, { digests: base.digests, claimedExact: base.claimedExact })]).ok, 1,
    'a headline request is compared with IG-S02\'s native-w1 record');
});

add('glue.augment-record', 'glue', 'the record carries the checked profile, the counts and the exact origin; an inconsistent profile stops', function () {
  const G = require('./ig07-run.cjs');
  const k = fakeClock();
  const rt = PR.create({ now: k.now, techniqueIds: ['a'] });
  rt.begin();
  rt.api.levelEnter({ proposal: false, where: { attempt: 1, sample: 1 } });
  k.advance(4);
  rt.api.sampleResult({ exact: true, shallow: false, rating: { level: 'hard', score: 100, solved: true }, clues: 30, stats: null });
  const profile = rt.finish();
  const job = M.buildManifest('IG-S07', 'provisional-r1').jobs.find(function (j) { return j.shard === 'killer-h' && j.arm === 'prototype'; });
  const rec = R.recordBase(job);
  const wire = { exact: true, work: [{ ratings: 3, proposals: 0, maxRatings: 1024, maxProposals: 32768, localSearches: [] }] };
  const obs = { outcome: 'complete', wire: wire, profileMessage: { profile: profile, restore: { restored: true, problems: [] }, runMs: 4, ok: true },
    profileMessageCount: 1, calibration: { clockReadNs: 30 } };
  G.augmentRecord(rec, job, obs, {});
  equal(R.checkRecord(rec), [], 'a well-formed record');
  equal([rec.firstExactOrigin, rec.firstExactOrdinal, rec.samplesUsed, rec.profileProblems], ['sample', 1, 1, []], 'exact origin and samples');
  equal(rec.attemptsWork[0].ratings, 3, 'per-attempt work');
  const bad = R.recordBase(job);
  G.augmentRecord(bad, job, Object.assign({}, obs, { profileMessage: Object.assign({}, obs.profileMessage, { restore: { restored: false, problems: ['x'] } }) }), {});
  check(/not restored/.test(bad.identityViolation), 'a hook that was not restored is a correctness stop');
  const none = R.recordBase(job);
  G.augmentRecord(none, job, Object.assign({}, obs, { profileMessage: null }), {});
  check(/no profile message/.test(none.identityViolation), 'a missing profile is a correctness stop');
  const keeper = G.exactOrigin({ samples: [{ exact: false, kind: 'ordinary', sample: 1, attempt: 1 }] }, { exact: true });
  equal(keeper.origin, 'keeper', 'an exact result no sample reached came from the keeper');
  equal(G.exactOrigin({ samples: [{ exact: true, kind: 'local', sample: 12, attempt: 2 }] }, { exact: true }).origin, 'local-search', 'local origin');
});

// --- the aggregator (its own cases are registered by ig07-aggregate.cjs) -----------------------------------------------------------------------------------

// --- engine cases of the first command -----------------------------------------------------------------------------------------------------------------

const ENGINE_CASES = Object.freeze([
  { name: 'classic4-veryEasy-1', config: { variantId: 'classic4', difficulty: 'veryEasy', seed: 1, trace: 'off' } },
  { name: 'classic9-hard-1', config: { variantId: 'classic9', difficulty: 'hard', seed: 1, trace: 'off' } },
  { name: 'classic9-nightmare-2', config: { variantId: 'classic9', difficulty: 'nightmare', seed: 2, trace: 'off',
    symmetry: 'rotational180', digOrder: 'random' } }
]);

function ok(id, title, passed, detail) {
  return { id: id, group: 'engine', ok: passed, title: title, detail: detail || null };
}

/** Evaluates the rows of the plain and the patched worker (pure: the unit tests feed it scripted rows too). */
function judgeEngineRows(plainRows, patchedRows, ready) {
  const results = [];
  results.push(ok('engine.transforms-loaded', 'the patched instance ran all transforms of the adapter profile',
    !!ready && ready.transforms.length === L.getAdapter('profile').transforms.length &&
    ready.adapterIds.length === 1 && ready.adapterIds[0] === 'profile',
    ready ? { transforms: ready.transforms.length } : { error: 'no ready message' }));
  ENGINE_CASES.forEach(function (spec) {
    const plain = plainRows.find(function (r) { return r.name === spec.name; });
    const row = patchedRows.find(function (r) { return r.name === spec.name; });
    const name = spec.name;
    if (!plain || !row) {
      results.push(ok('engine.profile-parity.' + name, 'a row for the case', false, { error: 'missing row' }));
      return;
    }
    const same = function (a) { return a.ok && a.digest === plain.plain.digest && a.nodes === plain.plain.nodes; };
    results.push(ok('engine.profile-parity.' + name, 'the patched sources without the runtime and with it return the puzzle of an ' +
      'unpatched instance with the same number of budget checks', plain.plain.ok && same(row.off) && same(row.on),
      { plain: plain.plain.digest && plain.plain.digest.slice(0, 12), off: row.off.digest && row.off.digest.slice(0, 12),
        on: row.on.digest && row.on.digest.slice(0, 12), nodes: [plain.plain.nodes, row.off.nodes, row.on.nodes],
        error: row.on.error || row.off.error || plain.plain.error }));
    const snap = row.on.snapshot;
    const problems = (row.on.consistency || []).slice();
    if (!row.on.restore || row.on.restore.restored !== true) problems.push('hooks not restored');
    if (row.hooksPresentAfter) problems.push('the hook object survived the run');
    if (snap) {
      if (!(snap.counters.finderCalls > 0)) problems.push('no finder call observed');
      if (snap.samples.length < 1) problems.push('no sample observed');
      if (!(snap.inclusiveMs['step:dig'] && snap.inclusiveMs['step:dig'].ms > 0)) problems.push('no dig step observed');
      if (snap.counters.canonicalRates !== row.on.workRatings) {
        problems.push('canonical rates ' + snap.counters.canonicalRates + ' differ from the work counter ' + row.on.workRatings);
      }
    }
    results.push(ok('engine.profile-consistency.' + name, 'the profile reconciles, the hooks are restored and the canonical-rating ' +
      'counter equals the engine\'s own work counter', problems.length === 0,
      { error: problems.join('; ') || null, snapshotBytes: row.on.snapshotBytes }));
    const failing = row.failing;
    const fproblems = [];
    if (failing.ok || failing.code !== 'budget.exceeded') fproblems.push('no budget error: ' + failing.error);
    if (!failing.restore || failing.restore.restored !== true) fproblems.push('hooks not restored');
    if (failing.hooksPresentAfter) fproblems.push('the hook object survived the error');
    if (failing.openAtFinish !== 0) fproblems.push(failing.openAtFinish + ' frames open at finish');
    (failing.consistency || []).forEach(function (p) { fproblems.push(p); });
    if (!(row.afterFailure.ok && row.afterFailure.digest === plain.plain.digest && row.afterFailure.nodes === plain.plain.nodes)) {
      fproblems.push('the next run is not native again');
    }
    results.push(ok('engine.profile-error-unwinding.' + name, 'a budget error in the middle of a run unwinds every frame, restores every ' +
      'hook and leaves the next run native', fproblems.length === 0, { error: fproblems.join('; ') || null }));
    const ab = row.abandoned;
    const aproblems = [];
    if (ab.error) aproblems.push(ab.error);
    if (!ab.restore || ab.restore.restored !== true) aproblems.push('hooks not restored');
    if (ab.hooksPresentAfter) aproblems.push('the hook object survived');
    if (ab.openAtFinish !== 0) aproblems.push(ab.openAtFinish + ' frames open at finish');
    (ab.consistency || []).forEach(function (p) { aproblems.push(p); });
    results.push(ok('engine.profile-abandon.' + name, 'an abandoned generator closes its frames through its finally blocks and the ' +
      'hooks are restored', aproblems.length === 0, { error: aproblems.join('; ') || null }));
  });
  return results;
}

// --- the loop-check comparison of the revision r2 ----------------------------------------------------------------------------------------------------------

function sameOutcome(a, b) {
  return !!a && !!b && a.status === b.status && a.code === b.code && a.nodes === b.nodes && a.steps === b.steps && a.score === b.score &&
    C.canonicalJson(a.counts) === C.canonicalJson(b.counts);
}

/**
 * Evaluates the loop-check rows of the plain and the patched worker (pure: the unit tests feed it rows of a fake engine). For every case
 * and every budget limit: the three modes return the same report or error and the same number of budget checks; in the profiled mode
 * the observed loop checks plus the finder checks equal the budget's own count, a check that throws included; and the boundary
 * rows (a throw before the first finder, a throw before a stuck result, an empty ladder) are the ones the r1 derivation missed.
 */
function judgeLoopRows(plainRows, patchedRows, ready) {
  const results = [];
  results.push(ok('loop.transforms-loaded', 'the patched instance ran all transforms of the adapter profile',
    !!ready && ready.transforms.length === L.getAdapter('profile').transforms.length && ready.adapterIds.length === 1 &&
    ready.adapterIds[0] === 'profile', ready ? { transforms: ready.transforms.length } : { error: 'no ready message' }));
  let derivedMismatches = 0;
  let observedRows = 0;
  let finderSiteThrows = 0;
  patchedRows.forEach(function (pat) {
    const plain = plainRows.find(function (r) { return r.name === pat.name; });
    if (!plain || plain.rows.length !== pat.rows.length) {
      results.push(ok('loop.parity.' + pat.name, 'a row for the case', false, { error: 'missing or misaligned rows' }));
      return;
    }
    const parity = [];
    const observed = [];
    const pairs = [{ limit: null, base: plain.unlimited.off, off: pat.unlimited.off, on: pat.unlimited.on }].concat(pat.rows.map(function (row, i) {
      return { limit: row.limit, base: plain.rows[i].off, off: row.off, on: row.on, plainLimit: plain.rows[i].limit };
    }));
    pairs.forEach(function (p) {
      if (p.plainLimit !== undefined && p.plainLimit !== p.limit) parity.push('limit ' + p.limit + ' is not aligned');
      if (!sameOutcome(p.base, p.off) || !sameOutcome(p.base, p.on)) {
        parity.push('limit ' + p.limit + ': ' + C.canonicalJson([p.base && [p.base.status, p.base.code, p.base.nodes],
          p.off && [p.off.status, p.off.code, p.off.nodes], p.on && [p.on.status, p.on.code, p.on.nodes]]));
      }
      const q = p.on && p.on.profile;
      if (!q) {
        observed.push('limit ' + p.limit + ': no profile');
        return;
      }
      observedRows++;
      if (q.restored !== true) observed.push('limit ' + p.limit + ': hooks not restored');
      if (q.problems.length > 0) observed.push('limit ' + p.limit + ': ' + q.problems[0]);
      if (q.loopChecks + q.finderChecks !== p.on.nodes) {
        observed.push('limit ' + p.limit + ': observed ' + q.loopChecks + ' + ' + q.finderChecks + ' != budget ' + p.on.nodes);
      }
      if (q.loopChecksDerived + q.finderChecks !== p.on.nodes) derivedMismatches++;
      if (q.finderThrows > 0) finderSiteThrows++;
    });
    results.push(ok('loop.parity.' + pat.name, 'an unpatched instance, the patched sources without the runtime and with it return the same ' +
      'report or error and the same number of budget checks at every limit', parity.length === 0 && !!plain.unlimited.off.nodes,
    { limits: pat.rows.length, problems: parity.slice(0, 3) }));
    results.push(ok('loop.observed.' + pat.name, 'the observed loop checks (both sites, counted before the call) plus the finder checks equal ' +
      'the budget\'s own count at every limit, a check that throws included, and the hooks are restored', observed.length === 0,
    { limits: pat.rows.length, problems: observed.slice(0, 3) }));
  });
  const first = patchedRows.map(function (pat) { return pat.rows.find(function (r) { return r.limit === 0; }); });
  const firstProblems = [];
  patchedRows.forEach(function (pat, i) {
    const row = first[i];
    const on = row && row.on;
    const q = on && on.profile;
    if (!q || on.code !== 'budget.exceeded' || on.nodes !== 1 || q.loopChecks !== 1 || q.finderCalls !== 0) {
      firstProblems.push(pat.name + ': ' + C.canonicalJson(on ? [on.code, on.nodes, q ? [q.loopChecks, q.finderCalls] : null] : null));
    }
  });
  results.push(ok('loop.boundary-first-check', 'a check that throws before the first finder is observed (one check, no finder call, the ' +
    'budget\'s own node count of 1)', firstProblems.length === 0, { problems: firstProblems.slice(0, 3) }));
  const stuckProblems = [];
  let stuckCases = 0;
  patchedRows.forEach(function (pat) {
    const total = pat.unlimited.off.nodes;
    if (pat.unlimited.off.status !== 'stuck') return;
    stuckCases++;
    const row = pat.rows.find(function (r) { return r.limit === total - 1; });
    const on = row && row.on;
    const q = on && on.profile;
    if (!q || on.code !== 'budget.exceeded' || on.nodes !== total || q.loopChecks + q.finderChecks !== total) {
      stuckProblems.push(pat.name + ': ' + C.canonicalJson(on ? [on.code, on.nodes, total, q ? [q.loopChecks, q.finderChecks] : null] : null));
    }
  });
  results.push(ok('loop.boundary-stuck-check', 'a check that throws before a stuck result is observed (the last check of every case that ' +
    'ends stuck)', stuckCases > 0 && stuckProblems.length === 0, { stuckCases: stuckCases, problems: stuckProblems.slice(0, 3) }));
  const empty = patchedRows.find(function (pat) { return pat.techniques.length === 0; });
  const emptyOn = empty ? empty.unlimited.on : null;
  results.push(ok('loop.boundary-empty-ladder', 'an empty ladder is two loop checks (the top of the pass and the one before the stuck ' +
    'result) and no finder call', !!emptyOn && !!emptyOn.profile && emptyOn.status === 'stuck' && emptyOn.nodes === 2 &&
    emptyOn.profile.loopChecks === 2 && emptyOn.profile.finderCalls === 0,
  emptyOn && emptyOn.profile ? { loopChecks: emptyOn.profile.loopChecks, derived: emptyOn.profile.loopChecksDerived, nodes: emptyOn.nodes } :
    { error: 'no empty-ladder case' }));
  results.push(ok('loop.r1-derivation-misses', 'the r1 derivation (loop checks from the finder passes) differs from the budget\'s own count at ' +
    'the boundary rows', derivedMismatches > 0, { rowsWhereItDiffers: derivedMismatches, profiledRows: observedRows,
      rowsThatThrewInsideAFinder: finderSiteThrows }));
  return results;
}

async function loopChecks(io) {
  const host = io.host;
  const start = host.mark();
  const plain = await io.workerCall(host, { role: 'request', adapterIds: [] }, { kind: 'ig07-loopcheck', mode: 'plain' }, ['decision'], 40000);
  const patched = await io.workerCall(host, { role: 'request', adapterIds: ['profile'] }, { kind: 'ig07-loopcheck', mode: 'patched' },
    ['decision'], 40000);
  const end = host.mark();
  let results;
  if (plain.reply && patched.reply) {
    results = judgeLoopRows(plain.reply.rows, patched.reply.rows, patched.ready);
  } else {
    results = [ok('loop.checks-ran', 'the loop checks ran', false, { error: [plain, patched].map(function (c) {
      return c.error ? c.error.message : null; }).filter(Boolean).join('; ') || 'no reply' })];
  }
  return { results: results, rows: plain.reply && patched.reply ? { plain: plain.reply.rows, patched: patched.reply.rows } : null,
    wallMs: end.t - start.t, cpuMs: end.cpu - start.cpu,
    workerEngineMs: { plain: plain.reply ? plain.reply.engineElapsedMs : null, patched: patched.reply ? patched.reply.engineElapsedMs : null } };
}

async function engineChecks(io) {
  const host = io.host;
  const start = host.mark();
  const specs = ENGINE_CASES.map(function (c) { return { name: c.name, config: c.config }; });
  const plain = await io.workerCall(host, { role: 'request', adapterIds: [] }, { kind: 'ig07-check', mode: 'plain', cases: specs },
    ['decision'], 90000);
  const patched = await io.workerCall(host, { role: 'request', adapterIds: ['profile'] },
    { kind: 'ig07-check', mode: 'patched', cases: specs }, ['decision'], 120000);
  const end = host.mark();
  let results;
  if (plain.reply && patched.reply) {
    results = judgeEngineRows(plain.reply.rows, patched.reply.rows, patched.ready);
  } else {
    results = [ok('engine.checks-ran', 'the engine checks ran', false, { error: [plain, patched].map(function (c) {
      return c.error ? c.error.message : null; }).filter(Boolean).join('; ') || 'no reply' })];
  }
  return { results: results, wallMs: end.t - start.t, cpuMs: end.cpu - start.cpu };
}

add('engine.judge-rows', 'engine', 'the engine verdicts: all good, a digest difference, a missing restore', function () {
  const mk = function (name) {
    const snapshot = { counters: { finderCalls: 5, canonicalRates: 2 }, samples: [{}], inclusiveMs: { 'step:dig': { ms: 1 } } };
    return { name: name, off: { ok: true, digest: 'd', nodes: 10 },
      on: { ok: true, digest: 'd', nodes: 10, snapshot: snapshot, restore: { restored: true }, consistency: [], workRatings: 2 },
      hooksPresentAfter: false, failing: { ok: false, code: 'budget.exceeded', restore: { restored: true }, hooksPresentAfter: false,
        openAtFinish: 0, consistency: [] }, afterFailure: { ok: true, digest: 'd', nodes: 10 },
      abandoned: { restore: { restored: true }, hooksPresentAfter: false, openAtFinish: 0, consistency: [] } };
  };
  const plain = ENGINE_CASES.map(function (c) { return { name: c.name, plain: { ok: true, digest: 'd', nodes: 10 } }; });
  const patched = ENGINE_CASES.map(function (c) { return mk(c.name); });
  const ready = { transforms: new Array(L.getAdapter('profile').transforms.length).fill({}), adapterIds: ['profile'] };
  check(judgeEngineRows(plain, patched, ready).every(function (r) { return r.ok; }), 'all pass');
  const broken = ENGINE_CASES.map(function (c) { return mk(c.name); });
  broken[1].on.digest = 'e';
  broken[2].on.restore = { restored: false };
  const bad = judgeEngineRows(plain, broken, ready).filter(function (r) { return !r.ok; }).map(function (r) { return r.id; });
  equal(bad, ['engine.profile-parity.classic9-hard-1', 'engine.profile-consistency.classic9-nightmare-2'], 'the right checks fail');
});

// --- the runner ------------------------------------------------------------------------------------------------------------------------------------------------------------

async function runPure(filter) {
  const results = [];
  for (let i = 0; i < registry.length; i++) {
    const t = registry[i];
    if (filter && t.id.indexOf(filter) < 0) continue;
    const t0 = Date.now();
    try {
      await t.fn();
      results.push({ id: t.id, group: t.group, ok: true, title: t.title, ms: Date.now() - t0 });
    } catch (err) {
      results.push({ id: t.id, group: t.group, ok: false, title: t.title, ms: Date.now() - t0,
        detail: { error: String(err && err.stack ? err.stack.split('\n').slice(0, 5).join(' | ') : err) } });
    }
  }
  return { ok: results.every(function (r) { return r.ok; }), results: results };
}

module.exports = { registry, add, check, equal, close, throws, fakeClock, runPure, engineChecks, judgeEngineRows, ENGINE_CASES, loopChecks,
  judgeLoopRows };

if (require.main === module) {
  // the aggregator's own cases are registered by it
  require('./ig07-aggregate.cjs').registerTests(module.exports);
  const only = process.argv.slice(2).filter(function (a) { return /^--filter=/.test(a); }).map(function (a) { return a.slice(9); })[0];
  runPure(only).then(function (out) {
    out.results.forEach(function (r) {
      process.stdout.write((r.ok ? 'ok   ' : 'FAIL ') + r.id + ' (' + r.ms + ' ms)' + (r.ok ? '' : '\n     ' + r.detail.error) + '\n');
    });
    process.stdout.write(out.results.filter(function (r) { return r.ok; }).length + '/' + out.results.length + ' passed\n');
    process.exitCode = out.ok ? 0 : 1;
  });
}
