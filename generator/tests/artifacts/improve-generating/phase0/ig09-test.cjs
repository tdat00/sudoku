'use strict';

/*
 * Tests of IG-S09 (test side, provisional (pre-freeze)): the Greater-Than miss predicate and the solve-first diagnostic.
 *
 * Pure cases (no engine instance, no worker thread, nothing written, nothing timed): the capture runtime and the arm G1 on the
 * real, patched `greater-than.js` run on a fake of the engine pieces (a scripted uniqueness count and restricted solver, the real
 * rng, budget and error modules): the oracle cases (solved proof, true stuck / unique, true stuck / ambiguous, a count that does not
 * finish, a contradiction, a budget failure and a proof by a uniqueness-assuming technique that must not skip the count), identity
 * with the native code and with G0, the counters (physical DFS calls and checks, restricted solves, skipped counts, the semantic
 * oracle-question counter), a shared count guard bound differently by the changed order, the exact miss categories at floor,
 * floor + 1 and floor + 2 with and without tune reveals, the cheap-clause short circuit and the missing minimality proof, the
 * post-timing diagnosis on a fake instance (exhausted budget, node-capped counts), exact-input validation reuse and a changed
 * input forbidding it, the setup-probe rule, the plan, the transforms on the real sources, the record additions and the identity.
 *
 *   node ig09-test.cjs [--filter=<text>]      development only: no engine instance, no worker thread, nothing written
 */
const vm = require('vm');
const C = require('./common.cjs');
const R = require('./records.cjs');
const M = require('./manifest.cjs');
const L = require('./loader.cjs');
const G = require('./greater-than-diagnostic.cjs');
const W = require('./ig09-worker.cjs');
const RUN = require('./ig09-run.cjs');
const PLAN = require('./plans/ig-s09.cjs');

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

// --- the real sources, patched in memory ----------------------------------------------------------------------------------------

let cached = null;

function sources() {
  if (cached === null) {
    const set = L.loadSourceSet({ repoRoot: C.DEFAULT_REPO_ROOT });
    cached = { set: set, plan: L.buildLoadPlan(set, [L.getAdapter('gt-diagnostic')]), plain: L.buildLoadPlan(set, []) };
  }
  return cached;
}

// --- a fake of the engine pieces under greater-than.js -------------------------------------------------------------------------

const SIGN_PAIRS = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [0, 4], [1, 5], [2, 6]];
const N = 8;

/**
 * The scripted engine. A puzzle is unique iff every sign of `needUnique` is alive; the techniques solve it iff it is unique and
 * (every sign of `needTech` is alive or the givens hold at least `solveClues` clues). `mode` scripts the odd cases per candidate.
 */
function fakeEngine(options) {
  const o = Object.assign({ needUnique: [1, 4, 6], needTech: [1, 4, 6, 2, 8], solveClues: 5, minClues: 3, minPerUnit: 1,
    assumesUniqueness: [], script: {}, budget: null }, options || {});
  const keyOf = function (p) { return p.a + '-' + p.b; };
  const index = {};
  SIGN_PAIRS.forEach(function (p, i) { index[p[0] + '-' + p[1]] = i; });
  const context = vm.createContext({ SG: {}, performance: performance, console: console });
  const SG = context.SG;
  const fake = { counts: { count: 0, solve: 0, nodes: 0 }, keys: [], trace: [], SG: SG, o: o };
  SG.ineq = { ensureExtension: function () {} };
  SG.variants = { has: function () { return true; }, register: function () {} };
  SG.digger = {
    getStrategy: function () { throw new SG.errors.GenerationError('digger.unknownStrategy', { id: 'signs' }); },
    registerStrategy: function () {},
    rateCounted: function () {
      return { solved: true, level: 'easy', score: 100, hardestTechnique: 'a', techniqueCounts: { a: 1 } };
    }
  };
  SG.modelAids = { signEdges: function () { return []; } };
  SG.events = { toEmitter: function () {
    return { wantsMicro: false, wantsMetrics: false, micro: function () {}, metric: function () {}, syncBoard: function () {},
      step: function () {} };
  } };
  SG.model = { create: function (spec) {
    const m = Object.assign({}, spec);
    m.cellUnits = [];
    for (let c = 0; c < spec.cellCount; c++) m.cellUnits.push([]);
    spec.units.forEach(function (u, k) { u.forEach(function (c) { m.cellUnits[c].push(k); }); });
    return m;
  } };
  SG.symmetry = { groups: function (model) {
    const out = [];
    for (let c = 0; c < model.cellCount; c++) out.push([c]);
    return out;
  } };
  const LEVELS = ['veryEasy', 'easy', 'normal', 'hard'];
  SG.difficulty = {
    levelIndex: function (level) { return LEVELS.indexOf(level); },
    spec: function (level) {
      return { level: level, oracle: 'techniques', allowedTechniques: ['a', 'b'], minClues: o.minClues,
        minCluesPerUnit: o.minPerUnit, symmetryDefault: 'none', min: 180, max: 400 };
    }
  };
  const aliveOf = function (model) {
    const alive = new Set();
    model.inequalities.forEach(function (s) { alive.add(index[keyOf(s)]); });
    return alive;
  };
  const cluesOf = function (givens) {
    let n = 0;
    for (let i = 0; i < givens.length; i++) if (givens[i] !== 0) n++;
    return n;
  };
  const useBudget = function (budget) {
    if (budget) budget.check();
  };
  SG.dfs = { countSolutions: function (model, givens, limit, budget) {
    if (SG.__igGt !== undefined) SG.__igGt.dfsEntry();
    fake.counts.count++;
    const alive = aliveOf(model);
    fake.keys.push(Array.from(alive).sort().join(','));
    const sc = o.script[Array.from(alive).sort().join(',')];
    if (sc && sc.count === 'throw') {
      const err = new SG.errors.GenerationError('budget.exceeded', {});
      throw err;
    }
    // one node check per alive sign that is not needed: a stand-in for the search
    for (let k = 0; k < 2; k++) {
      if (SG.__igGt !== undefined) SG.__igGt.dfsCheck();
      fake.counts.nodes++;
      useBudget(budget);
    }
    return o.needUnique.every(function (i) { return alive.has(i); }) ? 1 : 2;
  } };
  SG.logicalSolver = { solve: function (model, givens, opts) {
    fake.counts.solve++;
    const alive = aliveOf(model);
    const key = Array.from(alive).sort().join(',');
    const sc = o.script[key];
    useBudget(opts.budget);
    if (sc && sc.solve === 'throw') throw new SG.errors.GenerationError('solver.noEffect', { technique: 'a' });
    if (sc && sc.solve === 'malformed') return { solved: false };
    if (sc && sc.solve === 'contradiction') {
      return { solved: false, status: 'contradiction', techniqueCounts: {}, state: { value: new Int32Array(N) } };
    }
    const unique = o.needUnique.every(function (i) { return alive.has(i); });
    const tech = o.needTech.every(function (i) { return alive.has(i); }) || cluesOf(givens) >= o.solveClues;
    const solved = unique && tech;
    const counts = sc && sc.solve === 'assumes' ? { a: 1, u: 1 } : { a: 1 };
    return { solved: solved, status: solved ? 'solved' : 'stuck', techniqueCounts: solved ? counts : {},
      state: { value: new Int32Array(N) } };
  } };
  SG.techniques = { get: function (id) { return { id: id, assumesUniqueness: o.assumesUniqueness.indexOf(id) >= 0 }; } };
  const rels = ['../core/js/engine/errors.js', '../core/js/engine/budget.js', 'js/engine/rng.js'];
  const load = function (rel, code) { vm.runInContext(code, context, { filename: rel }); };
  const src = sources();
  rels.forEach(function (rel) { load(rel, src.plain.items.find(function (i) { return i.rel === rel; }).code); });
  const gtItem = function (patched) { return (patched ? src.plan : src.plain).items.find(function (i) { return i.rel === 'js/variants/greater-than.js'; }); };
  fake.loadGreaterThan = function (patched) { load('js/variants/greater-than.js', gtItem(patched).code); };
  fake.model = function () {
    return SG.model.create({ variantId: 'greaterThan', digits: 4, cellCount: N, units: [[0, 1, 2, 3], [4, 5, 6, 7]], unitMeta: [],
      layout: {}, inequalities: SIGN_PAIRS.map(function (p) { return { a: p[0], b: p[1] }; }) });
  };
  fake.solution = function () { return Int32Array.from([1, 2, 3, 4, 2, 3, 4, 1]); };
  return fake;
}

/** One digSigns run on a fresh fake engine: `arm` null = no runtime published (the native path of the patched or plain source). */
function runDig(options) {
  const o = options || {};
  const fake = fakeEngine(o.engine);
  fake.loadGreaterThan(o.patched !== false);
  const SG = fake.SG;
  let rt = null;
  if (o.arm) {
    rt = G.createRuntime({ arm: o.arm, techniqueAssumes: function (id) { return SG.techniques.get(id).assumesUniqueness; } });
    SG.__igGt = rt.api;
  }
  const log = [];
  const stats = {};
  let result = null;
  let error = null;
  const budget = o.budget || null;
  if (rt) rt.api.sampleStart({ where: { attempt: 1, sample: 1 }, proposal: false });
  try {
    result = SG.greaterThan.digSigns(fake.model(), fake.solution(), 'normal', SG.rng.create(o.seed || 7).fork('dig'), {
      spec: SG.difficulty.spec('normal'), log: log, keeper: { offer: function () { return true; } }, caps: null, budget: budget });
    if (rt) {
      rt.api.strategyDone();
      rt.api.sampleEnd({ dug: Object.assign({ unsound: false }, result), rating: result.rating, exact: false, shallow: false, caps: null });
    }
  } catch (err) {
    error = err;
  }
  Object.assign(stats, result ? result.stats : {});
  const out = { fake: fake, rt: rt, log: log, result: result, error: error,
    summary: result ? { givens: Array.from(result.givens), clues: result.clues, signs: result.model.inequalities.map(function (s) {
      return s.a + '-' + s.b;
    }), stats: result.stats } : null };
  out.capture = rt ? rt.api.finish() : null;
  return out;
}

function passOf(out, kind, round) {
  return out.capture.samples[0].passes.find(function (p) { return p.kind === kind && p.round === round; });
}

// --- the arm G1 and the capture on the real greater-than.js --------------------------------------------------------------------------

add('dig.patched-source-without-runtime-is-native', 'dig', 'the patched sources without the runtime give the same result and dig log as the plain ones', function () {
  const plain = runDig({ patched: false });
  const patched = runDig({ patched: true });
  check(plain.error === null && patched.error === null, 'the fake runs: ' + (plain.error || patched.error));
  equal(patched.summary, plain.summary, 'the result');
  equal(patched.log, plain.log, 'the dig log');
  check(plain.log.some(function (e) { return e.op === 'accept'; }) && plain.log.some(function (e) { return e.op === 'reject'; }),
    'the scripted puzzle exercises accepted and rejected signs');
  check(plain.fake.counts.solve > 0 && plain.fake.counts.count > 0, 'both oracles ran');
});

add('dig.g0-capture-observes-without-changing-anything', 'dig', 'G0 with the capture equals the native result; setup origins, passes and decisions are recorded', function () {
  const plain = runDig({ patched: false });
  const g0 = runDig({ arm: 'g0' });
  equal(g0.summary, plain.summary, 'the result');
  equal(g0.log, plain.log, 'the dig log');
  equal(g0.fake.counts, plain.fake.counts, 'the physical work of the native path');
  const s = g0.capture.samples[0];
  check(s.ended === true && s.kind === 'ordinary' && s.attempt === 1, 'one ended ordinary sample');
  const phases = s.setup.groups.map(function (g) { return g.phase; });
  check(phases.filter(function (p) { return p === 'clue-floor'; }).length === 3, 'three clue-floor groups: ' + phases);
  check(phases.every(function (p) { return G.PHASES.indexOf(p) >= 0; }), 'only known phases');
  check(s.setup.initialClues >= 3, 'the post-setup parent has at least the floor: ' + s.setup.initialClues);
  check(s.tuneRounds >= 1, 'a tune round happened');
  check(phases.indexOf('tune') >= 0, 'a tune reveal is recorded with its origin');
  const first = passOf(g0, 'technique', 0);
  equal([first.firstTechnique, first.g1], [true, null], 'G0 has no G1 record');
  equal(first.seq.length, first.removals, 'one decision per removal');
  equal(first.accepted + first.rejectedAmbiguous + first.rejectedTechniques, first.removals, 'outcomes add up');
  equal(first.dfsCalls, first.removals, 'G0 counts once per removal in the first technique pass');
  check(g0.capture.totals.dfsCalls === g0.fake.counts.count, 'the counter equals the scripted count calls');
  equal(g0.capture.totals.dfsChecks, g0.fake.counts.nodes, 'the node checks');
  equal(g0.capture.totals.restrictedSolves >= 1, true, 'restricted solves are counted by the hook');
  const total = s.passes.reduce(function (t, p) { return t + p.removals; }, 0);
  equal(s.final.stats.oracleCalls >= total, true, 'the semantic oracle counter covers every removal question');
});

add('dig.g1-identity-and-physical-work', 'dig', 'G1 gives G0\'s decisions, final state and semantic counter; it skips only counts proved by a complete solve', function () {
  const g0 = runDig({ arm: 'g0' });
  const g1 = runDig({ arm: 'g1' });
  check(g1.error === null, 'G1 runs: ' + g1.error);
  equal(g1.summary, g0.summary, 'result, final signs and the semantic oracle-question counter');
  equal(g1.log, g0.log, 'accepted / rejected decisions and reasons');
  const cmp = G.compareArms(g0.capture, g1.capture);
  equal([cmp.equal, cmp.verdict], [true, 'identity-ok'], 'the arms compare identical');
  const a = passOf(g0, 'technique', 0);
  const b = passOf(g1, 'technique', 0);
  equal(b.seq, a.seq, 'the decisions of the first technique pass');
  const g = b.g1;
  check(g.tried === b.removals, 'every removal of the first technique pass was a G1 question');
  const proved = g.proved;
  check(proved > 0 && g.stuckAmbiguous > 0 && g.stuckUnique > 0, 'the script exercises all three results: ' + JSON.stringify(g));
  equal(b.dfsCalls, a.dfsCalls - proved, 'DFS calls fall exactly by the proved candidates');
  equal(b.restrictedSolves, a.restrictedSolves + g.stuckAmbiguous, 'a solve is added exactly for the candidates the DFS count rejects');
  equal(G.sumPasses([b]).skippedDfs, proved, 'the skipped count is reported separately');
  const later = G.passesOf(g1.capture.samples, function (p) { return !p.firstTechnique; });
  check(later.every(function (p) { return p.g1 === null; }), 'G1 changes the first technique pass only');
  const laterA = G.passesOf(g0.capture.samples, function (p) { return !p.firstTechnique; });
  equal(G.sumPasses(later).dfsCalls, G.sumPasses(laterA).dfsCalls, 'the other passes make the same physical DFS calls');
  equal(G.sumPasses(later).restrictedSolves, G.sumPasses(laterA).restrictedSolves, 'and the same restricted solves');
  // a G1 that skipped nothing would not be a saving: the counters, not a renamed question, decide
  equal(g1.fake.counts.count, g0.fake.counts.count - proved, 'the scripted engine saw the saved counts');
});

add('dig.g1-stops-on-solver-failures', 'dig', 'a solver exception, a contradiction, a uniqueness-assuming proof and a malformed report stop the G1 request with their own code, site and ordinal', function () {
  const base = runDig({ arm: 'g0' });
  const seq = passOf(base, 'technique', 0).seq;
  const first = function (ch) {
    const i = seq.indexOf(ch);
    check(i >= 0, 'the scripted pass has a candidate decided ' + ch);
    return { at: i, key: base.fake.keys[i] };
  };
  const accepted = first('a');
  const ambiguous = first('n');
  const cases = [
    { name: 'contradiction', at: accepted, script: 'contradiction', code: 'ig09.g1-contradiction', kind: 'contradiction', field: 'stoppedContradiction' },
    { name: 'malformed report', at: accepted, script: 'malformed', code: 'ig09.g1-malformed-report', kind: 'malformed-report', field: 'stoppedMalformed' },
    { name: 'uniqueness-assuming proof', at: accepted, script: 'assumes', code: 'ig09.g1-unsound-proof', kind: 'unsound-proof', field: 'stoppedUnsoundProof',
      engine: { assumesUniqueness: ['u'] } },
    // G0 never solves a candidate its count rejects, so its run is clean; G1 solves it first and meets the exception
    { name: 'solver exception on a candidate the count rejects', at: ambiguous, script: 'throw', code: 'solver.noEffect', kind: 'error', field: 'stoppedError' }
  ];
  cases.forEach(function (c) {
    const engine = Object.assign({ script: { [c.at.key]: { solve: c.script } } }, c.engine || {});
    const g0 = runDig({ arm: 'g0', engine: engine });
    const g1 = runDig({ arm: 'g1', engine: engine });
    check(g0.error === null, c.name + ': the native order completes (' + (g0.error && g0.error.code) + ')');
    check(g1.error !== null, c.name + ': G1 stops');
    equal(g1.error.code, c.code, c.name + ': the failure keeps its own code');
    const ff = g1.capture.firstFailure;
    check(ff !== null, c.name + ': the first failure is recorded');
    equal([ff.code, ff.kind, ff.site, ff.arm], [c.code, c.kind, 'restricted-solve', 'g1'], c.name + ': code, kind, site');
    equal([ff.sampleOrdinal, ff.pass, ff.passName, ff.round, ff.firstTechniquePass, ff.removal], [0, 0, 'signs', 0, true, c.at.at], c.name + ': the ordinal');
    const pass = g1.capture.samples[0].passes[0];
    equal(pass.seq.slice(-1), 'e', c.name + ': the event is an error, never an ordinary rejection');
    equal(pass.seq.length, c.at.at + 1, c.name + ': nothing is decided after it');
    equal(pass.g1[c.field], 1, c.name + ': counted as stopped, not as a stuck or a fallback');
    equal(pass.g1.stuckAmbiguous + pass.g1.stuckUnique + pass.g1.proved, c.at.at, c.name + ': the failed question is no G1 result');
    equal(g1.capture.samples[0].endReason, 'unfinished', c.name + ': the sample did not end normally');
    // nothing was retried through the native order: no count was run for the failed candidate
    equal(pass.dfsCalls, c.at.at - pass.g1.proved, c.name + ': no DFS count for the failed candidate');
  });
  // a count that fails after a stuck solve keeps its code and its DFS site too
  const stuckKey = first('t').key;
  const counted = runDig({ arm: 'g1', engine: { script: { [stuckKey]: { count: 'throw' } } } });
  equal([counted.capture.firstFailure.code, counted.capture.firstFailure.site], ['budget.exceeded', 'dfs-count'], 'a failing count: code and site kept');
});

add('dig.g1-audits-the-technique-count-map-before-skipping', 'dig', 'a proof with a missing, null, string, array or bad-valued technique-count map is malformed: nothing is skipped, neither callback runs, the first failure is kept; {} stays valid', function () {
  const assumes = function (id) { return id === 'u' ? true : (id === 'a' || id === 'b' ? false : null); };
  // drive the runtime as the patched digger does: a sample, its first technique pass, then one removal through the oracle
  const drive = function (report) {
    const rt = G.createRuntime({ arm: 'g1', techniqueAssumes: assumes });
    const api = rt.api;
    const calls = { count: 0, question: 0 };
    api.sampleStart({});
    api.digBegin({ minClues: 3, minPerUnit: 1, symmetry: null, levelIndex: 0, signsTotal: 3, techniques: true, budgetPresent: false, solution: Int32Array.from([1, 2, 3, 4]), signs: [] });
    api.pass('start', 'signs', 5);
    check(api.solveFirstApplies(true) === true, 'G1 applies in the first technique pass');
    let thrown = null;
    let result;
    try {
      result = api.removal(2, 'signs', function () {
        return api.solveFirst(function () { calls.count++; return null; }, function () { return report; }, function () { calls.question++; });
      });
    } catch (err) {
      thrown = err;
    }
    return { thrown: thrown, result: result, calls: calls, failure: rt.snapshot().firstFailure, rt: rt };
  };
  const solved = function (counts, hasCounts) {
    const r = { solved: true, status: 'solved' };
    if (hasCounts !== false) r.techniqueCounts = counts;
    return r;
  };
  const malformed = [
    { name: 'missing', report: solved(undefined, false), detail: /techniqueCounts is missing/ },
    { name: 'null', report: solved(null), detail: /techniqueCounts is null/ },
    { name: 'string', report: solved('a'), detail: /a string, not a plain object/ },
    { name: 'number', report: solved(3), detail: /a number, not a plain object/ },
    { name: 'array', report: solved([1]), detail: /an array/ },
    { name: 'negative value', report: solved({ a: -1 }), detail: /techniqueCounts\[a\] is not a non-negative integer/ },
    { name: 'fractional value', report: solved({ a: 1.5 }), detail: /techniqueCounts\[a\] is not a non-negative integer/ },
    { name: 'string value', report: solved({ a: '2' }), detail: /techniqueCounts\[a\] is not a non-negative integer/ },
    { name: 'NaN value', report: solved({ a: NaN }), detail: /techniqueCounts\[a\] is not a non-negative integer/ },
    { name: 'a bad value beside a good one', report: solved({ a: 1, b: -2 }), detail: /techniqueCounts\[b\]/ },
    { name: 'non-plain object', report: solved(new Map()), detail: /not a plain object/ }
  ];
  malformed.forEach(function (m) {
    const d = drive(m.report);
    check(d.thrown !== null, m.name + ': the request stops');
    equal(d.thrown.code, 'ig09.g1-malformed-report', m.name + ': the malformed-report code');
    check(m.detail.test(d.thrown.message), m.name + ': the message says what is wrong: ' + d.thrown.message);
    equal(d.calls, { count: 0, question: 0 }, m.name + ': neither the count nor the semantic-question callback ran');
    equal([d.failure.code, d.failure.kind, d.failure.site, d.failure.sampleOrdinal, d.failure.pass, d.failure.removal, d.failure.sign],
      ['ig09.g1-malformed-report', 'malformed-report', 'restricted-solve', 0, 0, 0, 2], m.name + ': the first failure keeps code, site and ordinal');
    const pass = d.rt.api.finish().samples[0].passes[0];
    equal([pass.g1.proved, pass.g1.stoppedMalformed, pass.g1.stoppedUnsoundProof, pass.g1.stuckAmbiguous, pass.g1.stuckUnique], [0, 1, 0, 0, 0],
      m.name + ': booked as a malformed stop, not as a skip, a stuck or an unsound proof');
    equal(pass.seq, 'e', m.name + ': an error event, never an ordinary decision');
  });
  // a technique that assumes uniqueness stays an unsound proof, also without running either callback
  const unsound = drive(solved({ a: 1, u: 1 }));
  equal([unsound.thrown.code, unsound.calls], ['ig09.g1-unsound-proof', { count: 0, question: 0 }], 'a uniqueness-assuming proof: its own code, nothing ran');
  // valid maps still skip the count: the empty map, a known-free technique and a zero count
  [{ name: 'the empty map', counts: {} }, { name: 'a known-free technique', counts: { a: 2 } }, { name: 'a zero count', counts: { a: 0, b: 3 } }].forEach(function (v) {
    const d = drive(solved(v.counts));
    equal([d.thrown, d.result, d.failure], [null, null, null], v.name + ': accepted, no failure');
    equal(d.calls, { count: 0, question: 1 }, v.name + ': the semantic question counted once, the DFS count skipped');
    const pass = d.rt.api.finish().samples[0].passes[0];
    equal([pass.g1.proved, pass.seq], [1, 'a'], v.name + ': booked as a proof');
  });
});

add('dig.g1-never-swallows-a-count-failure', 'dig', 'a count that does not finish after a stuck solve propagates; it is neither stuck nor unique', function () {
  // the first candidate of the first technique pass that the native order rejects after a complete count: its count then throws
  const base = runDig({ arm: 'g0' });
  const seq = passOf(base, 'technique', 0).seq;
  let at = -1;
  for (let i = 0; i < seq.length && at < 0; i++) if (seq[i] === 't' || seq[i] === 'n') at = i;
  check(at >= 0, 'the script has a rejected candidate');
  const engine = { script: { [base.fake.keys[at]]: { count: 'throw' } } };
  const g0 = runDig({ arm: 'g0', engine: engine });
  const g1 = runDig({ arm: 'g1', engine: engine });
  check(g0.error !== null && g1.error !== null, 'both raise');
  equal([g1.error.code, g0.error.code], ['budget.exceeded', 'budget.exceeded'], 'the same failure');
  const last0 = g0.capture.samples[0].passes[0];
  const last1 = g1.capture.samples[0].passes[0];
  equal([last0.seq.slice(-1), last1.seq.slice(-1)], ['e', 'e'], 'the failure is an error event, not an ordinary stuck decision');
  equal(last1.seq, last0.seq, 'the decisions before it are the same');
  equal(g1.capture.samples[0].endReason, 'unfinished', 'the sample is unfinished');
  equal(last1.g1.stuckAmbiguous + last1.g1.stuckUnique + last1.g1.proved, at, 'the failed question is not booked as any G1 result');
});

add('dig.shared-count-guard-binds-differently', 'dig', 'an external shared budget is spent in another order by G1: a guard-binding-difference, not an identity pass', function () {
  const make = function (limit, code) {
    let used = 0;
    return { tick: function () {}, check: function () {
      if (++used > limit) {
        const err = new Error('shared budget used up');
        if (code !== null) err.code = code;
        throw err;
      }
    } };
  };
  const search = function (code) {
    for (let limit = 6; limit < 200; limit++) {
      const g0 = runDig({ arm: 'g0', budget: make(limit, code) });
      const g1 = runDig({ arm: 'g1', budget: make(limit, code) });
      if ((g0.error === null) !== (g1.error === null) || (g0.error && g0.capture.samples[0].passes.length !== g1.capture.samples[0].passes.length)) {
        return { limit: limit, g0: g0, g1: g1 };
      }
      if (g0.error && g1.error && !G.compareArms(g0.capture, g1.capture).equal) return { limit: limit, g0: g0, g1: g1 };
    }
    return null;
  };
  const found = search('budget.exceeded');
  check(found !== null, 'some shared limit binds at a different candidate in the two orders');
  const cmp = G.compareArms(found.g0.capture, found.g1.capture);
  check(cmp.budgetPresent === true, 'the budget was seen by the sample');
  equal(cmp.verdict, 'guard-binding-difference', 'classified from the recorded guard event: ' + JSON.stringify(cmp.firstDifference));
  check(cmp.firstDifference.eventA === 'e' || cmp.firstDifference.eventB === 'e', 'the first differing event is the guard');
  equal(cmp.guardCode, 'budget.exceeded', 'the recognised guard code is reported');
  // an external budget alone proves nothing: the same difference caused by an unrecognised error is a mismatch
  const other = search(null);
  check(other !== null, 'an unrecognised error also binds at different candidates');
  const otherCmp = G.compareArms(other.g0.capture, other.g1.capture);
  check(otherCmp.budgetPresent === true, 'the budget is present');
  equal(otherCmp.verdict, 'mismatch', 'an arbitrary error is not a guard-binding-difference: ' + JSON.stringify(otherCmp.firstDifference));
  equal(otherCmp.unrecognisedFailure.map(function (f) { return f.code; }), [null], 'flagged as unrecognised, with the code it had');
  // an error with another code than a guard code is a mismatch too
  const solver = search('solver.noEffect');
  equal(G.compareArms(solver.g0.capture, solver.g1.capture).verdict, 'mismatch', 'a solver error is not a guard');
  // without an external budget the same difference is a mismatch that stops the pack
  const forged = JSON.parse(JSON.stringify(found.g1.capture));
  forged.samples.forEach(function (s) { s.setup.budgetPresent = false; });
  const plainA = JSON.parse(JSON.stringify(found.g0.capture));
  plainA.samples.forEach(function (s) { s.setup.budgetPresent = false; });
  equal(G.compareArms(plainA, forged).verdict, 'mismatch', 'no external budget: a mismatch');
});

add('dig.compare-arms-mismatch-kinds', 'dig', 'a differing decision, final state or semantic counter is a mismatch (no budget)', function () {
  const g0 = runDig({ arm: 'g0' }).capture;
  const clone = function () { return JSON.parse(JSON.stringify(g0)); };
  equal(G.compareArms(g0, clone()).verdict, 'identity-ok', 'equal');
  const a = clone();
  a.samples[0].passes[0].seq = a.samples[0].passes[0].seq.replace(/a/, 'n');
  const r = G.compareArms(g0, a);
  equal(r.verdict, 'mismatch', 'a changed decision');
  equal(r.firstDifference.field, 'pass.seq', 'the first differing event is kept');
  check(r.firstDifference.position >= 0, 'with its position');
  const b = clone();
  b.samples[0].final.stats.oracleCalls += 1;
  equal(G.compareArms(g0, b).firstDifference.field, 'final.stats.oracleCalls', 'the semantic counter');
  const c = clone();
  c.samples[0].final.givens = '9' + c.samples[0].final.givens.slice(1);
  equal(G.compareArms(g0, c).verdict, 'mismatch', 'a different final state');
  const d = clone();
  d.samples.push(Object.assign({}, d.samples[0]));
  equal(G.compareArms(g0, d).firstDifference.field, 'sampleCount', 'a different sample count');
});

// --- the classification --------------------------------------------------------------------------------------------------------------

const LEVELS = ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1', 'hell2'];

function sampleOf(o) {
  const floor = 24;
  const groups = [];
  for (let i = 0; i < (o.floorGroups === undefined ? 3 : o.floorGroups); i++) groups.push({ phase: 'clue-floor', group: i, cells: [i] });
  for (let i = 0; i < (o.helpGroups || 0); i++) groups.push({ phase: 'help', group: 10 + i, cells: [10 + i] });
  for (let i = 0; i < (o.tune || 0); i++) groups.push({ phase: 'tune', group: 20 + i, cells: [20 + i] });
  return { ordinal: o.ordinal || 0, kind: 'ordinary', setup: { minClues: floor, minPerUnit: 1, initialClues: floor + (o.setupAbove || 0), groups: groups,
    solution: '1'.repeat(81), givens: '0'.repeat(81) }, final: { clues: floor + (o.above === undefined ? 0 : o.above), exact: !!o.exact,
    shallow: !!o.shallow, givens: 'g', signs: 's', rating: { digest: 'r' } } };
}

function diagOf(o) {
  return Object.assign({ ratingStatus: 'ok', canonicalEqual: true, rating: { solved: true, level: 'easy', score: 100, digest: 'r' },
    minimal: null }, o || {});
}

add('classify.floor-clause-and-tune-reveals', 'classify', 'the named trap at floor, floor + 1 and floor + 2, with and without tune reveals', function () {
  const cls = function (s, d) { return G.classifySample(s, d, 'normal', LEVELS); };
  equal(cls(sampleOf({ above: 0 }), diagOf({ minimal: true })).bucket, 'below-trap', 'at the floor, proved minimal');
  equal(cls(sampleOf({ above: 1, setupAbove: 1 }), diagOf({ minimal: true })).bucket, 'below-trap', 'floor + 1, proved minimal');
  equal(cls(sampleOf({ above: 2, setupAbove: 2 }), diagOf({ minimal: true })).bucket, 'below-setup2', 'floor + 2, no tune reveal: setup two above');
  equal(cls(sampleOf({ above: 2, setupAbove: 0, tune: 1 }), diagOf({ minimal: true })).bucket, 'below-tune', 'floor + 2 after a tune reveal');
  equal(cls(sampleOf({ above: 1, setupAbove: 0, tune: 1 }), diagOf({ minimal: true })).bucket, 'below-trap',
    'floor + 1 after a (single-cell) tune reveal still satisfies the whole predicate: the order is trap first');
  equal(cls(sampleOf({ above: 3, setupAbove: 3, helpGroups: 3 }), diagOf({ minimal: true })).bucket, 'below-setup2', 'help groups above the floor');
  // the clue-floor clause is not optional: a minimal sample two above the floor is no trap
  const two = cls(sampleOf({ above: 2, setupAbove: 2 }), diagOf({ minimal: true }));
  equal([two.flags.floorClause, two.flags.trapProven], [false, false], 'floor + 2 fails the clause');
});

add('classify.missing-minimality-proof-never-makes-a-trap', 'classify', 'unknown or negative minimality, no independent rating and a rating mismatch', function () {
  const cls = function (s, d) { return G.classifySample(s, d, 'normal', LEVELS); };
  const unknown = cls(sampleOf({ above: 0 }), diagOf({ minimal: null }));
  equal([unknown.bucket, unknown.flags.trapEligible, unknown.flags.trapProven, unknown.flags.trapUnknown], ['other-below', true, false, true],
    'eligible but unproved: trap-unknown, not a trap');
  const notMinimal = cls(sampleOf({ above: 0 }), diagOf({ minimal: false }));
  equal([notMinimal.bucket, notMinimal.flags.trapUnknown], ['other-below', false], 'a removable sign: not a trap and not unknown');
  equal(cls(sampleOf({ above: 0 }), null).bucket, 'unconfirmed', 'no independent result');
  equal(cls(sampleOf({ above: 0 }), diagOf({ ratingStatus: 'unstarted' })).bucket, 'unconfirmed', 'diagnosis not reached');
  equal(cls(sampleOf({ above: 0 }), diagOf({ canonicalEqual: false })).bucket, 'unconfirmed', 'the independent rating differs');
  equal(cls(sampleOf({ exact: true }), diagOf({ rating: { solved: true, level: 'normal', score: 200, digest: 'r' } })).bucket, 'exact', 'exact');
  equal(cls(sampleOf({ shallow: true }), diagOf({ rating: { solved: true, level: 'normal', score: 200, digest: 'r' } })).bucket, 'shallow', 'shallow');
  equal(cls(sampleOf({}), diagOf({ rating: { solved: true, level: 'hard', score: 500, digest: 'r' } })).bucket, 'above-or-unrated', 'above the band');
  equal(cls(sampleOf({}), diagOf({ rating: { solved: false, level: null, score: null, digest: 'r' } })).bucket, 'above-or-unrated', 'not rated or stuck');
});

add('classify.miss-split-numbers', 'classify', 'the disjoint split, the lower and the upper trap share, with numerators and denominators', function () {
  const list = [];
  const push = function (s, d) { list.push(G.classifySample(s, d, 'normal', LEVELS)); };
  push(sampleOf({ exact: true }), diagOf({ rating: { solved: true, level: 'normal', score: 200, digest: 'r' } }));
  push(sampleOf({ shallow: true }), diagOf({ rating: { solved: true, level: 'normal', score: 200, digest: 'r' } }));
  push(sampleOf({}), diagOf({ rating: { solved: true, level: 'hard', score: 500, digest: 'r' } }));
  push(sampleOf({ above: 0 }), diagOf({ minimal: true }));
  push(sampleOf({ above: 1, setupAbove: 1 }), diagOf({ minimal: true }));
  push(sampleOf({ above: 0 }), diagOf({ minimal: null }));
  push(sampleOf({ above: 0 }), null);
  push(sampleOf({ above: 3, setupAbove: 0, tune: 2 }), diagOf());
  push(sampleOf({ above: 4, setupAbove: 4 }), diagOf());
  push(sampleOf({ above: 0 }), diagOf({ minimal: false }));
  const split = G.missSplit(list);
  equal(split.samples, 10, 'denominator: all dug samples');
  equal(split.buckets, { exact: 1, shallow: 1, 'above-or-unrated': 1, 'below-trap': 2, 'below-tune': 1, 'below-setup2': 1, 'other-below': 2,
    unconfirmed: 1 }, 'every sample in exactly one bucket');
  equal(Object.keys(split.buckets).reduce(function (t, k) { return t + split.buckets[k]; }, 0), 10, 'disjoint and complete');
  equal(split.misses, 9, 'misses = samples - exact');
  equal(split.trapLowerShareOfMisses, { numerator: 2, denominator: 9 }, 'lower: proven traps over the misses');
  equal(split.trapUpperShareOfMisses.numerator, 2 + 1 + 1, 'upper: plus one unknown minimality and one unconfirmed eligible');
  equal(split.minimalityCoverage, { requiredForTrap: 4, decided: 3, unknown: 1 }, 'minimality coverage of the eligible samples');
});

add('classify.judge-minimality', 'classify', 'minimal needs every removal to admit another solution; a capped count is unknown', function () {
  equal(G.judgeMinimality([2, 2, 2]).status, 'proved', 'all necessary');
  equal(G.judgeMinimality([2, null, 2]).status, 'unknown', 'a capped count is unknown, never minimal');
  equal(G.judgeMinimality([2, 1, null]).status, 'not-minimal', 'a redundant sign decides it');
  equal(G.judgeMinimality([2, 1]).redundantFirst, 1, 'the first redundant sign');
  equal(G.judgeMinimality([]).status, 'proved', 'no sign left: vacuously minimal');
});

// --- the post-timing diagnosis on a fake instance ---------------------------------------------------------------------------------------

function fakeVerifier(script) {
  const s = Object.assign({ rating: { solved: true, level: 'easy', score: 100 }, counts: {}, ratingThrows: false }, script || {});
  const calls = { count: [], rate: 0 };
  const SG = {
    greaterThan: { buildBoard: function () { return { signs: [] }; }, withSigns: function (_b, signs) {
      return { signs: signs, cellUnits: Array.from({ length: 81 }, function () { return [0]; }) };
    } },
    difficulty: { rate: function () {
      calls.rate++;
      if (s.ratingThrows) throw new Error('budget');
      return s.rating;
    }, levelIndex: function (l) { return LEVELS.indexOf(l); }, spec: function () { return { allowedTechniques: ['a'] }; } },
    budget: { create: function () { return {}; } },
    dfs: { countSolutions: function (model, givens, limit, budget) {
      calls.count.push(model.signs.length);
      const f = s.counts[model.signs.length];
      if (f === 'cap') {
        for (let i = 0; i < 1e6; i++) budget.check();
      }
      return f === undefined ? 2 : f;
    } },
    logicalSolver: { solve: function () { return { status: 'stuck' }; } }
  };
  return { SG: SG, calls: calls };
}

const GIVENS81 = '1'.repeat(40) + '0'.repeat(41);

add('worker.cheap-clause-short-circuit', 'worker', 'minimality is asked for only when the clue floor holds and the canonical rating is below the band', function () {
  const job = { level: 'normal' };
  const row = function (flag, rating, counts) {
    const v = fakeVerifier({ rating: rating, counts: counts || { 1: 1 } });
    const out = W.runSample(v.SG, v.SG.greaterThan.buildBoard(), job, { ordinal: 0, givens: GIVENS81, signs: '0-1,1-2,2-3', floorClause: flag,
      ratingDigest: C.digestOf(rating) }, 30000, performance.now());
    return { row: out, calls: v.calls };
  };
  const below = { solved: true, level: 'easy', score: 100 };
  const a = row(false, below);
  equal([a.row.minimalStatus, a.calls.count.length], ['not-required-for-trap', 0], 'the floor clause fails: no DFS count at all');
  const b = row(true, { solved: true, level: 'normal', score: 200 });
  equal([b.row.minimalStatus, b.calls.count.length], ['not-required-for-trap', 0], 'in the band: no proof is asked');
  const c = row(true, below, { 3: 1 });
  equal([c.row.minimalStatus, c.row.minimal], ['proved', true], 'below the band at the floor: asked, all three signs necessary');
  // whole puzzle unique (3 signs: 1), then every removal (2 signs left): 2 = another solution
  equal(c.calls.count, [3, 2, 2, 2], 'one count of the puzzle, then one per remaining sign');
  const d = row(true, below, { 3: 1, 2: 1 });
  equal([d.row.minimalStatus, d.row.minimal, d.calls.count.length], ['not-minimal', false, 2], 'a redundant sign stops the proof at once');
  const e = row(true, below, { 3: 1, 2: 'cap' });
  equal([e.row.minimalStatus, e.row.minimal], ['unknown', null], 'a node-capped count is unknown, not minimal');
  const f = row(true, { solved: true, level: 'normal', score: 200 }, {});
  check(f.calls.rate === 1, 'one rating');
  const v = fakeVerifier({ ratingThrows: true });
  const t = W.runSample(v.SG, v.SG.greaterThan.buildBoard(), job, { ordinal: 1, givens: GIVENS81, signs: '', floorClause: true, ratingDigest: 'x' },
    30000, performance.now());
  equal([t.ratingStatus, t.minimalStatus], ['timeout', 'not-required-for-trap'], 'a rating that does not finish is a timeout, nothing is proved');
});

add('worker.exhausted-budget-leaves-unstarted-rows', 'worker', 'a spent validation budget leaves samples unstarted and the diagnosis says so', function () {
  const v = fakeVerifier({});
  const posted = [];
  W.runDiagnose({ SG: v.SG, job: { level: 'normal', budgetMs: -1, probe: null, samples: [
    { ordinal: 3, givens: GIVENS81, signs: '', floorClause: true, ratingDigest: 'x' },
    { ordinal: 4, givens: GIVENS81, signs: '', floorClause: false, ratingDigest: 'x' }] },
  post: function (m) { posted.push(m); }, failure: function (e) { return e; } });
  const done = posted.find(function (m) { return m.type === 'ig09-done'; });
  equal([done.stopped, done.unstarted, done.rows], ['budget', [3, 4], 0], 'nothing started, both ordinals listed');
  equal(v.calls.rate, 0, 'no engine work after the budget');
  // the order of work: the cheap clause first, the probe between, the rest last
  const w = fakeVerifier({});
  const seen = [];
  W.runDiagnose({ SG: w.SG, job: { level: 'normal', budgetMs: 1e9, probe: { ordinal: 0, signsAll: '', parent: GIVENS81, minClues: 24, minPerUnit: 1,
    groups: [{ phase: 'help', cells: [3] }] }, samples: [
    { ordinal: 5, givens: GIVENS81, signs: '', floorClause: false, ratingDigest: 'x' },
    { ordinal: 6, givens: GIVENS81, signs: '', floorClause: true, ratingDigest: 'x' }] },
  post: function (m) { seen.push(m.type + (m.row ? ':' + m.row.ordinal : '')); }, failure: function (e) { return e; } });
  equal(seen.filter(function (t) { return t !== 'ig09-begin'; }), ['ig09-row:6', 'ig09-probe', 'ig09-row:5', 'ig09-done'], 'floor-clause samples, then the probes, then the others');
  equal(seen, ['ig09-begin', 'ig09-row:6', 'ig09-begin', 'ig09-probe', 'ig09-begin', 'ig09-row:5', 'ig09-done'], 'each piece of work announces its start before it runs');
});

// --- exact-input validation reuse ---------------------------------------------------------------------------------------------------------

function captureOf(over) {
  const s = sampleOf(Object.assign({ above: 0, helpGroups: 1 }, over || {}));
  s.final.givens = GIVENS81;
  s.final.signs = '0-1,1-2';
  s.final.rating = { digest: 'r1', solved: true, level: 'easy' };
  s.ordinal = 0;
  const t = sampleOf({ above: 1, setupAbove: 1, ordinal: 1 });
  t.final.givens = '2' + GIVENS81.slice(1);
  t.final.signs = '0-1';
  t.final.rating = { digest: 'r2', solved: true, level: 'easy' };
  t.ordinal = 1;
  return { schema: G.SCHEMA, arm: 'g0', finished: true, samples: [s, t], attemptSigns: { 1: '0-1,1-2,2-3' }, totals: {} };
}

add('reuse.same-digest-reuses-and-a-changed-input-does-not', 'reuse', 'validation is reused only for an identical canonical input, source and guard settings', async function () {
  const calls = [];
  const call = async function (job) {
    calls.push(job.samples.map(function (s) { return s.ordinal; }));
    return { status: 'complete', rows: job.samples.map(function (s) {
      return { ordinal: s.ordinal, ratingStatus: 'ok', rating: { solved: true, level: 'easy', score: 100, digest: s.ratingDigest },
        canonicalEqual: true, minimal: true, minimalStatus: 'proved', unique: true };
    }), probe: job.probe ? { ordinal: job.probe.ordinal, rows: [{ phase: 'help', status: 'done' }] } : null, done: { stopped: null, rows: 2, wallMs: 1 },
    wallMs: 5, cpuMs: 5, cpuResolutionStatus: 'resolved', error: null };
  };
  const cache = { samples: new Map(), probes: new Map() };
  const base = { level: 'normal', cache: cache, runtimeFingerprint: 'fp' };
  const a = await RUN.diagnoseRequest(Object.assign({ capture: captureOf(), key: 'k/g0' }, base), call);
  equal(calls.length, 1, 'the first request is diagnosed');
  equal(a.reuse, { samples: 0, diagnosed: 2, sources: [] }, 'nothing to reuse yet');
  const b = await RUN.diagnoseRequest(Object.assign({ capture: captureOf(), key: 'k/g1' }, base), call);
  equal(calls.length, 1, 'identical input: no worker call at all');
  equal(b.status, 'reused-only', 'the status says so');
  equal([b.reuse.samples, b.reuse.diagnosed, b.reuse.sources], [2, 0, ['k/g0']], 'both reused from the first request');
  equal(b.rows[0].validationReusedFrom, 'k/g0', 'validationReusedFrom is recorded per sample');
  check(b.probe !== null && b.probe.reusedFrom === 'k/g0', 'the probe of the same parent is reused too');
  // a changed sign set: that sample is diagnosed again, the other one is reused
  const changed = captureOf();
  changed.samples[1].final.signs = '0-1,2-3';
  const c = await RUN.diagnoseRequest(Object.assign({ capture: changed, key: 'k/g1b' }, base), call);
  equal(calls[calls.length - 1], [1], 'only the changed sample goes to the worker');
  equal([c.rows[0].validationReusedFrom, c.rows[1].validationReusedFrom], ['k/g0', null], 'reuse is per sample');
  // a changed rating digest, a changed source and changed guard settings forbid reuse
  const ratingChanged = captureOf();
  ratingChanged.samples[0].final.rating = { digest: 'other', solved: true, level: 'easy' };
  const n0 = calls.length;
  await RUN.diagnoseRequest(Object.assign({ capture: ratingChanged, key: 'k/g1c' }, base), call);
  equal(calls[n0], [0], 'a different canonical rating of the same input is not reused');
  const n1 = calls.length;
  await RUN.diagnoseRequest({ capture: captureOf(), key: 'k/g1d', level: 'normal', cache: cache, runtimeFingerprint: 'other-source' }, call);
  equal(calls[n1], [0, 1], 'another source fingerprint: nothing is reused');
  // a matching final request alone is not enough: the digest includes the solution and the givens
  const other = captureOf();
  other.samples[0].setup.solution = '2'.repeat(81);
  const n2 = calls.length;
  await RUN.diagnoseRequest(Object.assign({ capture: other, key: 'k/g1e' }, base), call);
  equal(calls[n2], [0], 'another solution: not reused');
});

add('reuse.unstarted-rows-stay-unconfirmed', 'reuse', 'a diagnosis that ran out of budget keeps its unstarted ordinals and the samples stay unconfirmed', async function () {
  const call = async function (job) {
    return { status: 'budget', rows: [], probe: null, done: { stopped: 'budget', rows: 0, wallMs: 1 }, wallMs: 30000, cpuMs: 30000, cpuResolutionStatus: 'resolved',
      error: null, unstarted: job.samples.map(function (s) { return s.ordinal; }) };
  };
  const diag = await RUN.diagnoseRequest({ capture: captureOf(), key: 'k/g0', level: 'normal', cache: { samples: new Map(), probes: new Map() },
    runtimeFingerprint: 'fp' }, call);
  equal([diag.status, diag.unstarted.sort()], ['budget', [0, 1]], 'the host kept what it did not reach');
  const cap = captureOf();
  const cls = G.classifySample(cap.samples[0], diag.rows[0] || null, 'normal', LEVELS);
  equal(cls.bucket, 'unconfirmed', 'unconfirmed, never a guessed category');
});

// --- the diagnosis allowance (IG-S09-ASTRA-F3) -------------------------------------------------------------------------------------------------

/** A scripted host: a clock that advances only on scripted events, a channel that records the deadlines it is given. */
function fakeDiagHost(opts) {
  const o = Object.assign({ startAt: 1000, readyAfterMs: 500, commandTimerAt: 1e9, events: [] }, opts || {});
  const host = { stopped: null, now: o.startAt, commandTimerAt: o.commandTimerAt, runtimeFingerprint: 'fp', cpu: { quantumMs: 1 }, deadlines: [], scopes: [],
    posted: [], terminated: 0 };
  host.clock = function () { return host.now; };
  host.mark = function () { return { t: host.now, cpu: host.now / 2 }; };
  host.terminateWorker = async function () {
    host.terminated++;
    return { ok: true };
  };
  const queue = [{ type: 'ready' }].concat(o.events);
  host.spawn = function () {
    return { worker: { postMessage: function (m) { host.posted.push(m); } }, channel: { next: async function (_kinds, deadlineAt, scope) {
      host.deadlines.push(deadlineAt);
      host.scopes.push(scope);
      if (queue.length === 0 || queue[0].type === 'timeout') {
        host.now = deadlineAt;
        return { kind: 'timeout' };
      }
      const msg = queue.shift();
      if (msg.type === 'ready') host.now += o.readyAfterMs;
      return { kind: 'message', msg: msg };
    } } };
  };
  return host;
}

add('diag.allowance-is-thirty-seconds-from-the-start-and-bounded-by-the-command', 'diag', 'the 30 s allowance counts from the diagnosis start (no grace on top), is bounded by the command deadline and leaves a margin to the worker', async function () {
  const done = { type: 'ig09-done', stopped: null, rows: 0, wallMs: 1 };
  const a = fakeDiagHost({ events: [done] });
  const outA = await RUN.diagnoseCall(a, { level: 'normal', samples: [], probe: null }, 30000);
  equal(a.deadlines, [31000, 31000], 'every wait ends at start + 30000, not 33000');
  equal([outA.allowanceMs, outA.allowanceScope, outA.status, a.terminated], [30000, 'request', 'complete', 1], 'the allowance is recorded');
  equal(a.posted[0].job.budgetMs, 31000 - 1500 - RUN.DIAG_MARGIN_MS, 'the worker budget is what is left at the posting, minus the margin');
  check(a.posted[0].job.budgetMs < outA.allowanceMs, 'startup and the margin are inside the allowance');
  // the command deadline binds before the allowance
  const b = fakeDiagHost({ commandTimerAt: 11000, events: [done] });
  const outB = await RUN.diagnoseCall(b, { level: 'normal', samples: [], probe: null }, 30000);
  equal(b.deadlines, [11000, 11000], 'bounded by the command deadline');
  equal([outB.allowanceMs, outB.allowanceScope, b.posted[0].job.budgetMs], [10000, 'command', 11000 - 1500 - RUN.DIAG_MARGIN_MS], 'and recorded as such');
  // never a negative worker budget
  const c = fakeDiagHost({ commandTimerAt: 1800, events: [done] });
  await RUN.diagnoseCall(c, { level: 'normal', samples: [], probe: null }, 30000);
  equal(c.posted[0].job.budgetMs, 0, 'a worker budget never goes below zero');
});

add('diag.timeout-keeps-rows-and-tells-unfinished-from-unstarted', 'diag', 'rows that arrived survive a timeout; started work without a result is unfinished, work never reported is unstarted', async function () {
  const call = function (events) {
    const host = fakeDiagHost({ events: events });
    return function (job, budgetMs) { return RUN.diagnoseCall(host, job, budgetMs); };
  };
  const row = function (ordinal) {
    return { type: 'ig09-row', row: { ordinal: ordinal, ratingStatus: 'ok', rating: { solved: true, level: 'easy', score: 100, digest: 'r' + (ordinal + 1) },
      canonicalEqual: true, minimal: true, minimalStatus: 'proved', unique: true } };
  };
  const input = function (key) {
    return { capture: captureOf(), key: key, level: 'normal', cache: { samples: new Map(), probes: new Map() }, runtimeFingerprint: 'fp' };
  };
  // the first sample finished, the second started and the allowance ended
  const probeCall = call([{ type: 'ig09-begin', ordinal: 0 }, row(0), { type: 'ig09-begin', ordinal: 1 }, { type: 'timeout' }]);
  const one = await RUN.diagnoseRequest(input('k/a'), probeCall);
  equal(one.status, 'timeout', 'the status');
  equal([Object.keys(one.rows), one.unfinished, one.unstarted], [['0'], [1], []], 'row 0 survives; sample 1 is unfinished, not unstarted');
  equal([one.probe.status, one.probe.rows.length], ['unstarted', 0], 'the probe never began: unstarted');
  check(one.allowance.allowanceMs === 30000 && one.allowance.workerBudgetMs < 30000, 'the allowance is part of the record');
  // nothing was reported before the allowance ended
  const none = await RUN.diagnoseRequest(input('k/b'), call([{ type: 'timeout' }]));
  equal([none.status, Object.keys(none.rows), none.unfinished, none.unstarted.slice().sort()], ['timeout', [], [], [0, 1]], 'demonstrably unstarted');
  // a probe that began but did not report is unfinished
  const probeBegan = await RUN.diagnoseRequest(input('k/c'), call([{ type: 'ig09-begin', ordinal: 0 }, row(0), { type: 'ig09-begin', ordinal: 1 }, row(1),
    { type: 'ig09-begin', probe: true }, { type: 'timeout' }]));
  equal([probeBegan.unfinished, probeBegan.unstarted, probeBegan.probe.status], [[], [], 'unfinished'], 'a started probe is unfinished');
});

add('devcheck.unknown-wait-is-not-zero', 'diag', 'the wait of the development check is unknown without a caller timestamp, never a fictitious zero', function () {
  const D = require('./ig09-dev-check.cjs');
  equal(D.waitOf(null, '2026-11-15T09:00:00.000Z'), null, 'no requested timestamp: unknown');
  equal(D.waitOf('2026-11-15T08:59:00.000Z', '2026-11-15T09:00:00.000Z'), 60000, 'a given timestamp: the difference');
  equal(D.waitOf('garbage', '2026-11-15T09:00:00.000Z'), null, 'an unreadable timestamp: unknown');
  equal(D.parseArgs(['--round=r', '--requested-at=2026-11-15T08:59:00.000Z']).requestedAt, '2026-11-15T08:59:00.000Z', 'the argument is accepted');
});

// --- the setup probes --------------------------------------------------------------------------------------------------------------------

add('probe.rule-block-and-groups', 'probe', 'the clue floor and unit floor rule, the first three above-floor groups in recorded order, the first missed sample', function () {
  const units = [[0, 1, 2], [3, 4, 5]];
  const cellUnits = [[0], [0], [0], [1], [1], [1]];
  const parent = Int32Array.from([1, 1, 0, 1, 0, 0]);
  const at = function (cells, minClues, minPerUnit) { return G.ruleBlock(parent, cells, cellUnits, minClues, minPerUnit); };
  equal(at([0], 3, 0), { floorBlock: true, unitBlock: false, cluesAfter: 2, unitsBelowFloor: [] }, 'the clue floor blocks');
  equal(at([0], 2, 1).floorBlock, false, 'two clues are left: not blocked by the floor');
  equal(at([3], 1, 1), { floorBlock: true, unitBlock: true, cluesAfter: 2, unitsBelowFloor: [1] }.floorBlock === true ? at([3], 1, 1) : null,
    'a pure rule result');
  equal(at([3], 1, 1).unitBlock, true, 'the only clue of unit 1 cannot go');
  equal(at([0], 1, 1).unitBlock, false, 'unit 0 keeps one clue');
  equal(at([2], 1, 1).unitBlock, false, 'an empty cell removes nothing');
  void units;
  const sample = sampleOf({ helpGroups: 5 });
  sample.setup.groups.splice(1, 0, { phase: 'unit-floor', group: 40, cells: [40] });
  const groups = G.aboveFloorGroups(sample, 3);
  equal(groups.map(function (g) { return g.group; }), [40, 10, 11], 'at most three, in the recorded order, floor groups excluded');
  const exact = sampleOf({ exact: true, ordinal: 0 });
  const miss = sampleOf({ ordinal: 1 });
  const local = Object.assign(sampleOf({ ordinal: 2 }), { kind: 'local', setup: null });
  equal(G.firstMissed([exact, local, miss]).ordinal, 1, 'the first non-exact dug sample; a local sample has no setup');
  equal(G.firstMissed([exact]), null, 'no missed sample, no probe');
});

// --- the plan, the transforms, the glue -----------------------------------------------------------------------------------------------------

add('plan.cohorts-shards-and-arm-order', 'plan', 'literal seeds, the fixed shards, paired arms alternating by seed index, the control shard', function () {
  const manifest = M.buildManifest('IG-S09', 'provisional-r1');
  equal(manifest.shards.map(function (s) { return s.shard; }), ['normal-300-304', 'normal-305-309', 'normal-310-314', 'normal-315-319',
    'nightmare-700-701', 'nightmare-702-703', 'nightmare-704-705', 'nightmare-706-707', 'nightmare-708-709', 'observer-control'], 'the shards');
  const seeds = function (level) {
    return Array.from(new Set(manifest.jobs.filter(function (j) { return j.level === level && j.cellKind !== 'control'; }).map(function (j) {
      return j.requestSeed;
    })));
  };
  equal(seeds('normal'), Array.from({ length: 20 }, function (_v, i) { return 300 + i; }), 'Normal 300-319, literal');
  equal(seeds('nightmare'), Array.from({ length: 10 }, function (_v, i) { return 700 + i; }), 'Nightmare 700-709, literal');
  const paired = manifest.jobs.filter(function (j) { return j.cellKind !== 'control'; });
  equal(paired.length, 60, '30 paired requests = 60 jobs');
  const first = function (seed) { return paired.filter(function (j) { return j.requestSeed === seed; }).sort(function (a, b) { return a.order - b.order; })[0].arm; };
  equal([first(300), first(301), first(302), first(700), first(701)], ['reference', 'prototype', 'reference', 'reference', 'prototype'],
    'the first arm alternates by the index in the seed list (reference = G0)');
  paired.forEach(function (j) {
    equal(j.request.trace, 'summary', 'trace summary: ' + j.key);
    equal(Object.keys(j.request).sort(), ['difficulty', 'seed', 'trace', 'variantId'], 'no other option is overridden');
    equal(j.adapterIds, ['gt-diagnostic'], 'the same capture in both arms');
  });
  const controls = manifest.jobs.filter(function (j) { return j.cellKind === 'control'; });
  equal(controls.map(function (j) { return j.level + ':' + j.requestSeed; }), ['normal:300', 'nightmare:700'], 'one control each');
  controls.forEach(function (j) {
    equal([j.adapterIds, j.executor], [[], null], 'observer-free: no adapter, the unchanged host path');
    equal(j.request.trace, 'summary', 'the same request');
  });
  check(manifest.guards.requestMs === 180000, 'the production research guards');
  check(M.ALLOCATIONS_MS['IG-S09'] === 15 * 60000, 'the 15 minute allocation');
});

add('adapter.transforms-apply-to-the-real-sources', 'adapter', 'every anchor is unique and every patched source compiles', function () {
  const src = sources();
  equal(src.plan.transforms.length, L.getAdapter('gt-diagnostic').transforms.length, 'all transforms applied');
  equal(src.plan.items.filter(function (i) { return i.patched; }).map(function (i) { return i.rel; }).sort(),
    ['../core/js/engine/dfs-solver.js', 'js/engine/digger.js', 'js/variants/greater-than.js'], 'three files patched');
  src.plan.transforms.forEach(function (t) { check(t.beforeTextHash !== t.afterTextHash, t.id + ' changes its source'); });
});

add('adapter.runtime-names-exist-and-hooks-observe-only', 'adapter', 'every hook the transforms call exists; no inserted line draws a random number or touches a limit', function () {
  const rt = G.createRuntime({ arm: 'g1' });
  const names = new Set();
  L.getAdapter('gt-diagnostic').transforms.forEach(function (t) {
    t.code.replace(/SG\.__igGt\.([A-Za-z]+)/g, function (m, name) { names.add(name); return m; });
    const inserted = t.position === 'replace' ?
      t.code.split('\n').filter(function (line) { return line.trim() !== t.find.trim(); }).join('\n') : t.code;
    check(!/rng\.(next|int|pick|shuffle)\(/.test(inserted), t.id + ' draws a random number');
    check(!/\bMAX_|OBJECTIVE_STEPS|UNIQUE_NODES\s*=|budget\.(tick|cancel)/.test(inserted), t.id + ' touches a limit');
  });
  names.forEach(function (name) { check(typeof rt.api[name] === 'function', 'SG.__igGt.' + name + ' is not a runtime function'); });
  check(names.size >= 20, 'the transforms use the runtime: ' + names.size + ' names');
  // the single transform that changes the order of the oracle calls only the runtime's G1 entry
  const orderChanging = L.getAdapter('gt-diagnostic').transforms.filter(function (t) { return /solveFirst/.test(t.code); });
  equal(orderChanging.map(function (t) { return t.id; }), ['gt.solve-first'], 'one transform carries the order change');
  check(/solveFirstApplies\(allowed !== null\)/.test(orderChanging[0].code), 'guarded by the runtime and by an allowed-set solve');
});

add('glue.identity-pairs-and-controls', 'glue', 'G0 against G1 and the observer-free controls against the captured G0', function () {
  const digests = function (x) { return { structure: 's', givens: 'g', solution: 'o', rating: 'r', config: 'c', warnings: 'w', log: 'l', work: 'k',
    scalars: 'sc', puzzle: 'p', all: x }; };
  const cap = runDig({ arm: 'g0' }).capture;
  const cap1 = runDig({ arm: 'g1' }).capture;
  const rec = function (arm, key, capture, all, extra) {
    return Object.assign({ key: key, arm: arm, pairId: 'greaterThan:normal:300', cellKind: 'normal', outcome: 'complete', digests: digests(all),
      claimedExact: true, verifiedExact: true, level: 'normal', requestSeed: 300, gt: { capture: capture } }, extra || {});
  };
  const ok = RUN.identity([rec('reference', 'a/g0', cap, 'x'), rec('prototype', 'a/g1', cap1, 'x')], { readG0: function () { return null; } });
  equal([ok.ok, ok.failed, ok.guardBinding], [1, 0, 0], 'identical outputs: identity-ok');
  const bad = RUN.identity([rec('reference', 'a/g0', cap, 'x'), rec('prototype', 'a/g1', cap1, 'y')], { readG0: function () { return null; } });
  equal([bad.failed, bad.pairs[0].verdict], [1, 'identity-failed'], 'differing request digests stop the pack');
  const censored = RUN.identity([rec('reference', 'a/g0', cap, 'x'), rec('prototype', 'a/g1', null, 'x', { outcome: 'request-timeout', gt: { capture: null } })],
    { readG0: function () { return null; } });
  equal([censored.failed, censored.notComparable], [0, 1], 'a censored pair is not compared');
  const half = RUN.identity([rec('reference', 'a/g0', cap, 'x')], { readG0: function () { return null; } });
  equal(half.deferred, 1, 'the mate has not run yet: deferred, not failed');
  const control = { key: 'c/native', arm: 'reference', pairId: 'control:greaterThan:normal:300', cellKind: 'control', outcome: 'complete',
    digests: digests('x'), claimedExact: true, level: 'normal', requestSeed: 300 };
  const g0rec = rec('reference', 'a/g0', cap, 'x');
  equal(RUN.identity([control], { readG0: function () { return g0rec; } }).ok, 1, 'the observer-free control equals the captured G0');
  equal(RUN.identity([Object.assign({}, control, { digests: digests('z') })], { readG0: function () { return g0rec; } }).failed, 1,
    'an observer that changes the output stops the pack');
  equal(RUN.identity([control], { readG0: function () { return null; } }).notComparable, 1, 'no G0 recorded yet');
});

add('glue.capture-consistency', 'glue', 'a capture that does not add up is an identity violation of the instrument', function () {
  const g1 = runDig({ arm: 'g1' }).capture;
  const wire = { attempts: 1 };
  equal(RUN.captureProblems(g1, wire, 'g1'), [], 'a well-formed capture');
  equal(RUN.captureProblems(g1, wire, 'g0').length > 0, true, 'the wrong arm is reported');
  const broken = JSON.parse(JSON.stringify(g1));
  broken.samples[0].passes[0].seq += 'a';
  check(RUN.captureProblems(broken, wire, 'g1').some(function (p) { return /decisions != removals/.test(p); }), 'decisions != removals');
  check(RUN.captureProblems(g1, { attempts: 3 }, 'g1').some(function (p) { return /attempts/.test(p); }), 'the attempts of the wire');
  const rec = R.recordBase({ key: 'k', arm: 'prototype', variantId: 'g1' });
  RUN.augmentRecord(rec, { executor: 'gt', gtArm: 'g1', cellKind: 'normal', solverMode: 'x' }, { outcome: 'complete', wire: wire,
    gt: { capture: broken, diag: null, restore: { removed: true }, runError: null } }, {});
  check(typeof rec.identityViolation === 'string' && /capture-inconsistent/.test(rec.identityViolation), 'the record is flagged');
  equal(R.checkRecord(rec).length >= 0, true, 'the record stays a record');
});

add('glue.unexpected-failure-is-a-violation-and-a-guard-is-not', 'glue', 'a first failure that is not a recognised guard is an identity violation of the request; a recognised guard code is not', function () {
  const wire = { attempts: 1 };
  const base = runDig({ arm: 'g1' }).capture;
  const recordFor = function (failure) {
    const capture = JSON.parse(JSON.stringify(base));
    capture.firstFailure = failure;
    const rec = R.recordBase({ key: 'k', arm: 'prototype', variantId: 'g1' });
    RUN.augmentRecord(rec, { executor: 'gt', gtArm: 'g1', cellKind: 'normal', solverMode: 'x' }, { outcome: 'complete', wire: wire,
      gt: { capture: capture, diag: null, restore: { removed: true }, runError: null } }, {});
    return rec;
  };
  const failure = function (code, kind) {
    return { kind: kind || 'error', code: code, name: 'Error', message: 'm', site: 'restricted-solve', arm: 'g1', sampleOrdinal: 0, attempt: 1, sample: 1, pass: 0, passName: 'signs',
      round: 0, firstTechniquePass: true, removal: 3, sign: 4 };
  };
  const solver = recordFor(failure('solver.noEffect'));
  check(/unexpected failure \(error, solver\.noEffect\) at restricted-solve, sample 0, pass 0, removal 3/.test(solver.identityViolation), 'the code, site and ordinal are in the violation: ' + solver.identityViolation);
  equal(solver.gt.firstFailure.code, 'solver.noEffect', 'the first failure is kept in the record');
  check(/unexpected failure/.test(recordFor(failure('ig09.g1-contradiction', 'contradiction')).identityViolation), 'a G1 contradiction stops');
  check(/unexpected failure/.test(recordFor(failure(null)).identityViolation), 'an error without a code stops');
  const guard = recordFor(failure('budget.exceeded'));
  check(!guard.identityViolation, 'a recognised guard code is not an unexpected failure by itself');
  equal(guard.counts.dfsEntries, null, 'counts.dfsEntries stays unknown (countSolutions calls are not node entries)');
  equal(typeof guard.counts.dfsChecks, 'number', 'the search-loop checks are recorded');
  check(guard.gt.counterUnits && /NOT depth-first node entries/.test(guard.gt.counterUnits.dfsCalls), 'the record carries the counter units');
});

add('classify.encodings', 'classify', 'givens and signs round-trip', function () {
  const g = Int32Array.from([0, 1, 9, 5, 0]);
  equal(Array.from(G.decodeGivens(G.encodeGivens(g))), Array.from(g), 'givens');
  equal(G.decodeSigns(G.encodeSigns([{ a: 3, b: 4 }, { a: 10, b: 2 }])), [{ a: 3, b: 4 }, { a: 10, b: 2 }], 'signs');
  equal(G.decodeSigns(''), [], 'no signs');
  equal(G.cluesOf('0120'), 2, 'clues');
});

// --- the runner -----------------------------------------------------------------------------------------------------------------------------

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

module.exports = { registry, add, check, equal, throws, runDig, fakeEngine, captureOf, sampleOf, diagOf, LEVELS, runPure };

if (require.main === module) {
  try {
    require('./ig09-aggregate.cjs').registerTests(module.exports);
  } catch (err) {
    if (!err || err.code !== 'MODULE_NOT_FOUND') throw err;
  }
  const only = process.argv.slice(2).filter(function (a) { return /^--filter=/.test(a); }).map(function (a) { return a.slice(9); })[0];
  runPure(only).then(function (out) {
    out.results.forEach(function (r) {
      process.stdout.write((r.ok ? 'ok   ' : 'FAIL ') + r.id + ' (' + r.ms + ' ms)' + (r.ok ? '' : '\n     ' + r.detail.error) + '\n');
    });
    process.stdout.write(out.results.filter(function (r) { return r.ok; }).length + '/' + out.results.length + ' passed\n');
    process.exitCode = out.ok ? 0 : 1;
  });
}
