'use strict';

/*
 * Tests of IG-S08 (test side, provisional (pre-freeze), pre-MS07).
 *
 * Pure cases (no engine, no worker thread, no CPU load, nothing written): the exclusive span accounting of the beacon on a fake
 * clock (nesting, finder cells, hits, throwing calls, unwinding, sample kinds, the counters booked to the current context, the
 * marker cap, install and restore on a fake engine), the shared-memory snapshot and the attribution (in-progress time of a killed
 * worker, finished runs), the journal (parse, truncated last line, reconcile, the fallback sources), the in-memory transforms of
 * the adapter `jigsaw-profile` on the real sources (anchors, compilation, every beacon name they use exists), the patched
 * jigsaw layout and the patched stage runner run on a fake of the engine pieces (stubs and the real rng), the host side recorder
 * on fake workers (a scripted worker that never answers, a short test-only Jigsaw guard, the journal recovery judged by the same
 * checks as the real synthetic test), the plan and its packing, the record additions and the identity. Nothing here regenerates a
 * puzzle.
 *
 * Engine cases (`engineChecks`) run on the real engine in the first command of the round, under the low-priority wrapper: the
 * patched sources without the beacon and with it against each other (same puzzle, same number of budget checks), the stage
 * accounting, a budget error in the middle of a run, an abandoned generator, the layout and full-grid counters against the
 * engine's own statistics.
 *
 *   node ig08-test.cjs [--filter=<text>]      development only: no engine, no worker thread, nothing written
 */
const { EventEmitter } = require('events');
const vm = require('vm');
const C = require('./common.cjs');
const R = require('./records.cjs');
const M = require('./manifest.cjs');
const L = require('./loader.cjs');
const H = require('./host.cjs');
const P = require('./jigsaw-profile.cjs');
const PLAN = require('./plans/ig-s08.cjs');
const RUN = require('./ig08-run.cjs');

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

// --- fakes --------------------------------------------------------------------------------------------------------------------

function fakeClock(start) {
  const clock = { t: start === undefined ? 1000 : start, now: function () { return clock.t; },
    advance: function (ms) { clock.t += ms; } };
  return clock;
}

const TECHS = [{ id: 'nakedSingle', group: 'basic' }, { id: 'nakedPair', group: 'subset' }];

function fakeBeacon(clock, over) {
  const sab = P.allocate();
  const posted = [];
  const beacon = P.createBeacon(Object.assign({ sab: sab, post: function (m) { posted.push(m); }, epoch: clock.now,
    techniques: TECHS }, over || {}));
  return { beacon: beacon, api: beacon.api, sab: sab, posted: posted };
}

function cell(snap, ctx, sub) {
  const row = snap.cells.find(function (r) { return r[0] === ctx && r[1] === sub; });
  return row ? { ms: row[2], calls: row[3], hits: row[4] } : { ms: 0, calls: 0, hits: 0 };
}

function fakeSG() {
  const noop = function () { return 1; };
  return { logicalSolver: { solve: noop }, difficulty: { rate: noop },
    dfs: { countSolutions: noop, stillUnique: noop, solve: noop, searchFrom: noop }, fullGrid: { generate: noop } };
}

function memoryJournal() {
  const lines = [];
  return { lines: lines, append: function (e) { lines.push(JSON.stringify(e)); }, sync: function () {}, close: function () {},
    text: function () { return lines.join('\r\n') + '\r\n'; } };
}

// --- the beacon ---------------------------------------------------------------------------------------------------------------

add('beacon.exclusive-accounting', 'beacon', 'nested spans book exclusive time; nothing is counted twice', function () {
  const k = fakeClock();
  const f = fakeBeacon(k);
  f.beacon.begin();
  k.advance(2);
  const token = f.api.stageOpen('dig', { attempt: 1, sample: 2 });
  k.advance(3);
  const r = f.api.call(P.CTX.digOracle, function (a, b) { k.advance(5); return a + b; }, 20, 22);
  equal(r, 42, 'the result of a call passes through');
  k.advance(1);
  f.api.stageClose(token, 'dig');
  k.advance(4);
  f.beacon.finish('ok');
  const snap = P.readSnapshot(f.sab);
  close(cell(snap, P.CTX.outside, 0).ms, 6, 'outside: before the stage and after it');
  close(cell(snap, P.CTX.dig, 0).ms, 4, 'dig own code');
  close(cell(snap, P.CTX.digOracle, 0).ms, 5, 'oracle');
  const att = P.attribute(snap, { techniques: TECHS });
  close(att.beaconObservedMs, 15, 'the booked cells add up to the observed interval');
  equal(att.state, 'finished', 'state');
  equal(att.current, null, 'nothing is running at the end');
  equal(f.beacon.stats().depth, 0, 'frames balanced');
});

add('beacon.stage-markers-and-tokens', 'beacon', 'a stage entry is posted before its work; closing unwinds frames left open', function () {
  const k = fakeClock();
  const f = fakeBeacon(k);
  f.beacon.begin();
  const token = f.api.stageOpen('fullGrid', { attempt: 3, maxAttempts: 8 });
  equal(f.posted.map(function (m) { return m.ev; }), ['begin', 'stage-open'], 'the marker precedes the work');
  equal([f.posted[1].step, f.posted[1].attempt, f.posted[1].ctx], ['fullGrid', 3, P.CTX.fullGrid], 'marker fields');
  f.beacon.enter(P.CTX.digOracle * P.SUBS);
  f.beacon.enter(P.CTX.digSafety * P.SUBS);
  k.advance(7);
  f.api.stageClose(token, 'fullGrid');
  equal(f.beacon.stats().depth, 0, 'the frames above the stage are closed with it');
  const closeMarker = f.posted[f.posted.length - 1];
  equal([closeMarker.ev, closeMarker.step, closeMarker.wallMs], ['stage-close', 'fullGrid', 7], 'close marker');
  const snap = P.readSnapshot(f.sab);
  close(cell(snap, P.CTX.digSafety, 0).ms, 7, 'the time went to the innermost frame');
});

add('beacon.finder-cells', 'beacon', 'finder calls book calls, hits and exclusive time in the context that called them', function () {
  const k = fakeClock();
  const f = fakeBeacon(k);
  f.beacon.begin();
  const token = f.api.stageOpen('rate', {});
  k.advance(1);
  f.api.finderOpen({ id: 'nakedPair' });
  k.advance(7);
  f.api.finderClose({ cells: [] });
  f.api.finderOpen({ id: 'nakedSingle' });
  k.advance(2);
  f.api.finderClose(null);
  f.api.finderOpen({ id: 'notRegistered' });
  k.advance(3);
  f.api.finderClose(undefined);
  f.api.stageClose(token, 'rate');
  f.beacon.finish('ok');
  const snap = P.readSnapshot(f.sab);
  equal(cell(snap, P.CTX.rate, 2), { ms: 7, calls: 1, hits: 1 }, 'nakedPair (sub 2)');
  equal(cell(snap, P.CTX.rate, 1), { ms: 2, calls: 1, hits: 0 }, 'nakedSingle (sub 1)');
  equal(cell(snap, P.CTX.rate, P.SUB.otherFinder), { ms: 3, calls: 1, hits: 0 }, 'an unregistered finder');
  close(cell(snap, P.CTX.rate, 0).ms, 1, 'the rating context keeps its own time');
  const att = P.attribute(snap, { techniques: TECHS });
  equal(att.finderGroups.map(function (g) { return [g.group, g.ms, g.calls, g.hits]; }),
    [['subset', 7, 1, 1], ['unregistered', 3, 1, 0], ['basic', 2, 1, 0]], 'finder families by time');
  equal(att.finderByStage.map(function (r) { return [r.stage, r.group, r.ms]; }),
    [['rate', 'subset', 7], ['rate', 'unregistered', 3], ['rate', 'basic', 2]], 'family by stage');
});

add('beacon.call-semantics', 'beacon', 'a call passes its arguments and result through; a throwing call leaves the frames balanced', function () {
  const k = fakeClock();
  const f = fakeBeacon(k);
  f.beacon.begin();
  const marker = new Error('boom');
  const thrown = throws(function () {
    f.api.call(P.CTX.digSafety, function () { k.advance(3); throw marker; });
  }, function (err) { return err === marker; }, 'the same error object propagates');
  check(thrown === marker, 'identity');
  equal(f.beacon.stats().depth, 0, 'balanced after a throw');
  equal(f.api.call(P.CTX.digVerify, function () { return arguments.length; }, 1, undefined, null), 3, 'every argument passes');
  const snap = P.readSnapshot(f.sab);
  close(cell(snap, P.CTX.digSafety, 0).ms, 3, 'the time before the throw is booked');
  equal(f.posted.filter(function (m) { return m.ev === 'ctx'; }).map(function (m) { return m.ctx; }),
    [P.CTX.digSafety, P.CTX.digVerify], 'the rarely entered inner contexts post a marker, the hot ones do not');
  f.api.call(P.CTX.digOracle, function () { return 0; });
  f.api.call(P.CTX.digKeeper, function () { return 0; });
  equal(f.posted.filter(function (m) { return m.ev === 'ctx'; }).length, 2, 'no marker for the hot contexts');
});

add('beacon.sample-kinds', 'beacon', 'ordinary, proposal and local samples: the dig step of a local sample is its own context', function () {
  const k = fakeClock();
  const f = fakeBeacon(k);
  f.beacon.begin();
  f.api.levelEnter({ where: { attempt: 1, sample: 1 }, proposal: true });
  let t = f.api.stageOpen('dig', { attempt: 1, sample: 1 });
  f.api.stageClose(t, 'dig');
  f.api.levelEnter({ where: { attempt: 1, sample: 2 } });
  t = f.api.stageOpen('dig', { attempt: 1, sample: 2 });
  f.api.stageClose(t, 'dig');
  f.api.localNext();
  f.api.levelEnter({ where: { attempt: 1, sample: 2 }, proposal: false });
  t = f.api.stageOpen('dig', { attempt: 1, sample: 2 });
  f.api.stageClose(t, 'dig');
  f.api.levelEnter({ where: { attempt: 2, sample: 1 } });
  t = f.api.stageOpen('dig', { attempt: 2, sample: 1 });
  f.api.stageClose(t, 'dig');
  equal(f.posted.filter(function (m) { return m.ev === 'sample'; }).map(function (m) { return P.KIND_NAMES[m.kind]; }),
    ['proposal', 'ordinary', 'local', 'ordinary'], 'the kind of each sample (the local flag is consumed once)');
  equal(f.posted.filter(function (m) { return m.ev === 'stage-open'; }).map(function (m) { return m.ctx; }),
    [P.CTX.dig, P.CTX.dig, P.CTX.local, P.CTX.dig], 'the dig step of the local sample runs in the local context');
  const snap = P.readSnapshot(f.sab);
  equal(snap.globals.samples, 4, 'four samples');
});

add('beacon.counters-by-context', 'beacon', 'depth-first, grid and layout counters are booked to the context that was current', function () {
  const k = fakeClock();
  const f = fakeBeacon(k);
  const a = f.api;
  f.beacon.begin();
  const token = a.stageOpen('fullGrid', { attempt: 1 });
  for (let i = 0; i < 5; i++) a.dfsNode();
  for (let i = 0; i < 3; i++) a.dfsCheck();
  for (let i = 0; i < 2; i++) a.dfsBack();
  a.gridSearch();
  a.gridSearch();
  a.gridRestart();
  a.gridBack(10);
  a.call(P.CTX.layoutSolvable, function () { a.dfsNode(); a.dfsCheck(); a.gridSearch(); });
  a.gridUnlimited(50);
  a.stageClose(token, 'fullGrid');
  a.layoutAttempt(1, 0);
  a.layoutBack();
  a.layoutBack();
  a.layoutBack();
  a.layoutLevel();
  a.layoutFeas();
  a.layoutFeas();
  a.layoutUnsolvable(1);
  a.layoutHard(2);
  a.layoutAccepted(3);
  f.beacon.finish('ok');
  const att = P.attribute(P.readSnapshot(f.sab), { techniques: TECHS });
  const byCtx = function (name) { return att.counters.byContext.find(function (e) { return e.name === name; }); };
  const grid = byCtx('fullGrid');
  equal([grid.dfsNodes, grid.dfsChecks, grid.dfsBacktracks, grid.gridSearches, grid.gridRestarts, grid.gridBacktracks],
    [5, 3, 2, 2, 1, 10], 'the full-grid stage');
  const solvable = byCtx('layout.solvable');
  equal([solvable.dfsNodes, solvable.dfsChecks, solvable.gridSearches], [1, 1, 1], 'the layout solvability check');
  equal(att.counters.totals.dfsNodes, 6, 'totals');
  equal(att.layout, { layoutAttempts: 1, layoutGrowthBacktracks: 3, layoutLevels: 1, layoutFeasibility: 2, layoutUnsolvable: 1,
    layoutHard: 1, layoutAccepted: 1, gridUnlimitedEntered: 1, samples: 0 }, 'global counters');
  equal(f.posted.filter(function (m) { return /^layout-|^grid-/.test(m.ev); }).map(function (m) { return m.ev; }),
    ['grid-unlimited', 'layout-attempt', 'layout-unsolvable', 'layout-hard', 'layout-accepted'], 'durable layout markers');
});

add('beacon.marker-cap', 'beacon', 'a marker flood is capped and counted, the counters keep moving', function () {
  const k = fakeClock();
  const f = fakeBeacon(k, { maxMarkers: 3 });
  f.beacon.begin();
  for (let i = 0; i < 6; i++) f.api.layoutAttempt(i + 1, 0);
  equal(f.posted.length, 3, 'posted markers');
  const snap = P.readSnapshot(f.sab);
  equal([snap.header.markers, snap.header.dropped, snap.globals.layoutAttempts], [3, 4, 6], 'posted, dropped, counted anyway');
});

add('beacon.install-and-restore', 'beacon', 'the entry points are wrapped for one request and restored; a missing one installs nothing', function () {
  const k = fakeClock();
  const SG = fakeSG();
  const originals = [SG.logicalSolver.solve, SG.difficulty.rate, SG.dfs.countSolutions, SG.dfs.stillUnique, SG.dfs.solve,
    SG.dfs.searchFrom, SG.fullGrid.generate];
  const f = fakeBeacon(k);
  const info = f.beacon.install(SG);
  equal(info.wrapped.length, 7, 'seven entry points');
  check(SG.__igJig === f.api, 'the beacon is published');
  f.beacon.begin();
  const token = f.api.stageOpen('rate', {});
  SG.difficulty.rate();
  f.api.stageClose(token, 'rate');
  f.beacon.finish('ok');
  const snap = P.readSnapshot(f.sab);
  equal(cell(snap, P.CTX.rate, P.SUB.rate).calls, 1, 'the wrapped rating is a cell of its own');
  const restore = f.beacon.uninstall();
  equal(restore, { restored: true, problems: [], wasInstalled: true }, 'restored');
  check(SG.__igJig === undefined, 'the beacon is gone');
  const now = [SG.logicalSolver.solve, SG.difficulty.rate, SG.dfs.countSolutions, SG.dfs.stillUnique, SG.dfs.solve,
    SG.dfs.searchFrom, SG.fullGrid.generate];
  check(now.every(function (fn, i) { return fn === originals[i]; }), 'every function is the original again');
  // another beacon in the same instance is refused; a replaced function is reported
  const g = fakeBeacon(k);
  g.beacon.install(SG);
  throws(function () { fakeBeacon(k).beacon.install(SG); }, function (e) { return /already installed|another beacon/.test(e.message); }, 'refused');
  SG.dfs.solve = function () { return 2; };
  const bad = g.beacon.uninstall();
  check(bad.restored === false && /solve/.test(bad.problems[0]), 'a replaced function is reported');
  const broken = fakeSG();
  delete broken.dfs.stillUnique;
  const brokenSolve = broken.logicalSolver.solve;
  const brokenCount = broken.dfs.countSolutions;
  const h = fakeBeacon(k);
  throws(function () { h.beacon.install(broken); }, function (e) { return e.code === 'capability-missing'; }, 'a missing entry point');
  check(broken.__igJig === undefined && broken.logicalSolver.solve === brokenSolve && broken.dfs.countSolutions === brokenCount,
    'nothing stays installed: the wrappers put in before the failure are rolled back');
});

add('beacon.finish-unwinds', 'beacon', 'finishing with frames open (an abandoned run) closes them and says so', function () {
  const k = fakeClock();
  const f = fakeBeacon(k);
  f.beacon.begin();
  f.api.stageOpen('dig', {});
  f.beacon.enter(P.CTX.digOracle * P.SUBS);
  k.advance(4);
  f.beacon.finish('error');
  const snap = P.readSnapshot(f.sab);
  equal([snap.header.depth, P.STATE_NAMES[snap.header.state]], [0, 'finished-with-error'], 'state and depth');
  close(cell(snap, P.CTX.digOracle, 0).ms, 4, 'the open time is booked');
  f.beacon.finish('ok');
  equal(P.STATE_NAMES[P.readSnapshot(f.sab).header.state], 'finished-with-error', 'finish is idempotent');
});

// --- the snapshot and the attribution ----------------------------------------------------------------------------------------------

add('attribution.in-progress-of-a-killed-worker', 'attribution', 'the time since the last slice goes to the cell that was running, as a lower bound', function () {
  const k = fakeClock(5000);
  const f = fakeBeacon(k);
  f.beacon.begin();
  k.advance(10);
  f.api.stageOpen('fullGrid', { attempt: 2 });
  k.advance(30);
  f.api.dfsNode();
  const snap = P.readSnapshot(f.sab);
  equal(P.STATE_NAMES[snap.header.state], 'running', 'running at the read');
  const at = P.attribute(snap, { techniques: TECHS, endEpochMs: 5040 + 500 });
  close(at.inProgressMs, 530, 'in progress: the time since the last slice (the stage opened at 5010)');
  close(at.current.inProgressMs, 530, 'current in progress');
  equal([at.current.stage, at.current.step, at.current.attempt], ['fullGrid', 'fullGrid', 2], 'where it was');
  close(at.beaconObservedMs, 540, 'observed up to the end');
  const grid = at.stages.find(function (s) { return s.stage === 'fullGrid'; });
  close(grid.wallMsLowerBound, 530, 'the stage got the in-progress time');
  const nothing = P.attribute(snap, { techniques: TECHS });
  close(nothing.inProgressMs, 0, 'no end instant: nothing is invented');
  const done = fakeBeacon(fakeClock());
  done.beacon.begin();
  done.beacon.finish('ok');
  close(P.attribute(P.readSnapshot(done.sab), { techniques: TECHS, endEpochMs: 1e9 }).inProgressMs, 0, 'a finished run takes no extra time');
});

add('attribution.shape', 'attribution', 'stages, contexts, families and the non-finder time are consistent', function () {
  const k = fakeClock();
  const f = fakeBeacon(k);
  f.beacon.begin();
  let t = f.api.stageOpen('buildModel', {});
  f.api.call(P.CTX.layoutGrowth, function () { k.advance(10); });
  f.api.call(P.CTX.layoutSolvable, function () { k.advance(5); });
  f.api.stageClose(t, 'buildModel');
  t = f.api.stageOpen('rate', {});
  f.api.finderOpen({ id: 'nakedSingle' });
  k.advance(6);
  f.api.finderClose({});
  f.api.stageClose(t, 'rate');
  f.beacon.finish('ok');
  const att = P.attribute(P.readSnapshot(f.sab), { techniques: TECHS });
  equal(att.stages.map(function (s) { return [s.stage, s.wallMsLowerBound]; }), [['buildModel', 15], ['rate', 6]], 'stage totals');
  const total = att.stages.reduce(function (s, x) { return s + x.wallMsLowerBound; }, 0);
  close(total, att.beaconObservedMs, 'stages add up (no hidden residual)');
  close(att.stages.reduce(function (s, x) { return s + x.share; }, 0), 1, 'shares add up to one');
  equal(att.contexts.filter(function (c) { return c.ms > 0; }).map(function (c) { return c.name; }),
    ['layout.growth', 'rate', 'layout.solvable'], 'contexts sorted by time');
  equal(att.nonFinderWallMs, { solver: 0, rating: 0, dfs: 0, gridGenerator: 0, own: 15 }, 'the non-finder time is the contexts\' own code');
  equal(att.markers, { posted: f.posted.length, dropped: 0 }, 'markers');
});

// --- the journal ----------------------------------------------------------------------------------------------------------------------

function craftedEntries(key, withFinal) {
  const e = [];
  const line = function (type, data) { e.push(Object.assign({ at: 'x', key: key, type: type }, data)); };
  line('spawn', { hostEpochMs: 1, commandWindowRemainingMs: 238000 });
  const ev = function (seq, name, data) { line('ev', Object.assign({ rel: seq, workerSeq: seq, t: seq, ev: name }, data)); };
  ev(1, 'begin', { techniques: TECHS });
  ev(2, 'stage-open', { step: 'configure', ctx: 1, attempt: null, sample: null, kind: 0 });
  ev(3, 'stage-close', { step: 'configure', wallMs: 1 });
  ev(4, 'stage-open', { step: 'buildModel', ctx: 2, attempt: null, sample: null, kind: 0 });
  ev(5, 'layout-attempt', { n: 1, backtracksBefore: 0 });
  ev(6, 'layout-accepted', { n: 1 });
  ev(7, 'stage-close', { step: 'buildModel', wallMs: 9 });
  ev(8, 'stage-open', { step: 'fullGrid', ctx: 6, attempt: 1, sample: null, kind: 0 });
  const mk = function () {
    const k = fakeClock(100);
    const f = fakeBeacon(k);
    f.beacon.begin();
    f.api.stageOpen('fullGrid', { attempt: 1 });
    k.advance(50);
    f.api.dfsNode();
    return P.readSnapshot(f.sab);
  };
  const snap = mk();
  line('heartbeat', { n: 1, rel: 5000, hostEpochMs: 160, cpuMs: 4900, summary: P.summariseSnapshot(snap), snapshot: snap });
  if (withFinal) line('final', { rel: 9000, hostEpochMs: 200, endEpochMs: 200, outcome: 'request-timeout', summary: P.summariseSnapshot(snap),
    snapshot: snap });
  return e;
}

add('journal.parse-truncated-last-line', 'journal', 'a last line cut short is reported, an inner bad line is counted', function () {
  const ok = P.parseJournal('{"a":1}\r\n{"b":2}\r\n');
  equal([ok.entries.length, ok.truncatedLastLine, ok.badLines], [2, false, []], 'clean');
  const cut = P.parseJournal('{"a":1}\r\n{"b":');
  equal([cut.entries.length, cut.truncatedLastLine, cut.badLines], [1, true, []], 'cut');
  const bad = P.parseJournal('{"a":1}\r\nnot json\r\n{"c":3}\r\n');
  equal([bad.entries.length, bad.truncatedLastLine, bad.badLines], [2, false, [2]], 'inner');
});

add('journal.reconcile-sources', 'journal', 'the stages come from the markers; the attribution from the final read, else the last heartbeat', function () {
  const key = 'k1';
  const withFinal = P.reconcileJournal(craftedEntries(key, true), key);
  equal(withFinal.stages.map(function (s) { return [s.step, s.closed]; }), [['configure', true], ['buildModel', true], ['fullGrid', false]], 'stages');
  equal(withFinal.openStages.map(function (s) { return s.step; }), ['fullGrid'], 'open stage');
  equal([withFinal.layoutEvents.length, withFinal.heartbeats, withFinal.source, withFinal.problems], [2, 1, 'final', []], 'counts');
  const a = RUN.attributionOf(withFinal);
  equal([a.source, a.attribution.current.step, a.attribution.counters.totals.dfsNodes], ['final', 'fullGrid', 1], 'from the final read');
  const noFinal = P.reconcileJournal(craftedEntries(key, false), key);
  const b = RUN.attributionOf(noFinal);
  equal([noFinal.source, b.source, b.attribution.current.step], ['last-heartbeat', 'last-heartbeat', 'fullGrid'], 'from the last heartbeat');
  const onlyMarkers = P.reconcileJournal(craftedEntries(key, false).filter(function (x) { return x.type !== 'heartbeat'; }), key);
  const c = RUN.attributionOf(onlyMarkers);
  equal([onlyMarkers.source, c.source, c.attribution], ['markers-only', 'markers-only', null], 'markers only: no counters are invented');
  const other = P.reconcileJournal(craftedEntries(key, true), 'someone-else');
  equal([other.lines, other.source], [0, 'none'], 'another key sees nothing');
  equal(RUN.agreement(withFinal, a.attribution), 'agree', 'marker and shared memory agree');
  const backwards = craftedEntries(key, true);
  backwards[3].workerSeq = 1;
  check(P.reconcileJournal(backwards, key).problems.length > 0, 'a marker sequence that goes backwards is a problem');
});

// --- the adapter on the real sources --------------------------------------------------------------------------------------------------

let realPlan = null;
function plan() {
  if (realPlan === null) {
    const set = L.loadSourceSet({ repoRoot: C.DEFAULT_REPO_ROOT });
    realPlan = { set: set, plan: L.buildLoadPlan(set, [L.getAdapter('jigsaw-profile')]) };
  }
  return realPlan;
}

add('adapter.transforms-apply', 'adapter', 'every transform finds its unique anchor in the real sources and the patched text compiles', function () {
  const p = plan().plan;
  const adapter = L.getAdapter('jigsaw-profile');
  equal(p.transforms.length, adapter.transforms.length, 'every transform applied');
  equal(new Set(p.transforms.map(function (t) { return t.id; })).size, adapter.transforms.length, 'unique ids');
  equal(p.items.filter(function (i) { return i.patched; }).map(function (i) { return i.rel; }).sort(),
    ['../core/js/engine/dfs-solver.js', '../core/js/engine/logical-solver.js', 'js/engine/digger.js', 'js/engine/full-grid.js',
      'js/variants/jigsaw.js'], 'the patched files');
  check(p.transforms.every(function (t) { return t.beforeTextHash !== t.afterTextHash; }), 'every transform changes its text');
  check(p.items.filter(function (i) { return i.patched; }).every(function (i) { return /SG\.__igJig/.test(i.code); }), 'hooks present');
  // a patched file without the beacon is the native text plus guarded lines only: removing the inserted guarded lines restores it
  const native = new Map(plan().set.files.map(function (e) { return [e.rel, e.text.split(/\r?\n/)]; }));
  p.items.filter(function (i) { return i.patched; }).forEach(function (item) {
    const now = item.code.split(/\r?\n/);
    const old = native.get(item.rel);
    const bag = new Map();
    old.forEach(function (l) { bag.set(l, (bag.get(l) || 0) + 1); });
    now.forEach(function (l) { bag.set(l, (bag.get(l) || 0) - 1); });
    const removed = Array.from(bag.entries()).filter(function (e) { return e[1] > 0; });
    // only lines the transforms replaced (a find line, or its restatement) may be missing from the patched text
    removed.forEach(function (e) { check(e[1] <= 1 && e[0].trim().length > 0, item.rel + ' lost a line: ' + e[0]); });
  });
});

add('adapter.beacon-names-exist', 'adapter', 'every beacon method and context number the transforms use exists', function () {
  const k = fakeClock();
  const api = fakeBeacon(k).api;
  const adapter = L.getAdapter('jigsaw-profile');
  const names = new Set();
  const contexts = new Set();
  adapter.transforms.forEach(function (t) {
    t.code.replace(/SG\.__igJig\.([A-Za-z]+)/g, function (_m, name) { names.add(name); return _m; });
    t.code.replace(/SG\.__igJig\.call\((\d+),/g, function (_m, n) { contexts.add(Number(n)); return _m; });
  });
  names.forEach(function (name) { check(typeof api[name] === 'function', 'SG.__igJig.' + name + ' is not a beacon function'); });
  const known = new Set(Object.keys(P.CTX).map(function (n) { return P.CTX[n]; }));
  contexts.forEach(function (n) { check(known.has(n) && n < P.NCTX, 'context ' + n + ' is not defined'); });
  check(names.size >= 20, 'the transforms use the beacon: ' + names.size + ' names');
  // the hot contexts have no marker; the posted ones are the few-per-sample ones
  equal(P.MARKED_CTX.slice().sort(), [P.CTX.digVerify, P.CTX.digSafety, P.CTX.digProposalRating, P.CTX.digRefine, P.CTX.localRefine].sort(),
    'the contexts that post a marker');
});

add('adapter.fixed-hooks-do-not-change-the-algorithm', 'adapter', 'no inserted line draws a random number, changes a limit or a branch', function () {
  const adapter = L.getAdapter('jigsaw-profile');
  adapter.transforms.forEach(function (t) {
    // the line a transform replaces is native code that stays; only what it adds is judged
    const inserted = t.position === 'replace' ?
      t.code.split('\n').filter(function (line) { return line.trim() !== t.find.trim(); }).join('\n') : t.code;
    check(!/rng\.(next|int|pick|shuffle)\(/.test(inserted.replace(/rng\.fork\('(solve|refine)'\)/g, '')), t.id + ' draws a random number');
    check(!/budget\.(tick|check|cancel)|maxRestarts|maxBacktracks\s*=|\bMAX_|LIMIT/.test(inserted), t.id + ' touches a limit');
  });
});

function loadContext(rels, patched, stub) {
  const set = plan().set;
  const loadPlan = patched ? plan().plan : L.buildLoadPlan(set, []);
  const context = vm.createContext({ SG: stub, performance: performance, console: console });
  rels.forEach(function (rel) {
    const item = loadPlan.items.find(function (i) { return i.rel === rel; });
    check(item, 'no source ' + rel);
    vm.runInContext(item.code, context, { filename: item.abs });
  });
  return context;
}

function layoutStub() {
  const stub = { variants: { has: function () { return true; }, register: function () {} }, MAX_DIGITS: 16,
    model: { create: function (x) { return x; } }, budget: { create: function () { return {}; } },
    logicalSolver: { solve: function () { return 1; } }, difficulty: { rate: function () { return 1; } },
    calls: { solvable: 0, plain: 0 } };
  stub.dfs = { solve: function () { stub.calls.plain++; return stub.calls.plain % 3 === 1 ? null : [1]; },
    countSolutions: function () { return 1; }, stillUnique: function () { return true; }, searchFrom: function () { return {}; } };
  stub.fullGrid = { generate: function () {
    stub.calls.solvable++;
    if (stub.calls.solvable % 3 === 1) throw new stub.errors.GenerationError('fullGrid.unsatisfiable', {});
    return null;
  } };
  return stub;
}

add('jigsaw.patched-layout-on-a-fake-engine', 'adapter', 'the layout hooks count the growth, the checks and the outcomes exactly as the generator\'s own statistics', function () {
  const rels = ['../core/js/engine/errors.js', 'js/engine/rng.js', 'js/variants/jigsaw.js'];
  const plainStub = layoutStub();
  loadContext(rels, false, plainStub);
  const plainStats = {};
  const plainRegions = Array.from(plainStub.jigsaw.generateRegions(plainStub.rng.create(1100).fork('model'), { stats: plainStats }));

  const stub = layoutStub();
  loadContext(rels, true, stub);
  const k = fakeClock();
  const sab = P.allocate();
  const posted = [];
  const beacon = P.createBeacon({ sab: sab, post: function (m) { posted.push(m); }, techniques: TECHS });
  beacon.install(stub);
  beacon.begin();
  const stats = {};
  let regions;
  try {
    regions = Array.from(stub.jigsaw.generateRegions(stub.rng.create(1100).fork('model'), { stats: stats }));
  } finally {
    beacon.finish('ok');
    beacon.uninstall();
  }
  equal(regions, plainRegions, 'the hooks change no layout');
  equal(stats, plainStats, 'the generator\'s statistics are the same');
  check(stats.attempts >= 3 && stats.unsolvable >= 1 && stats.hard >= 1, 'the stubs exercised the outcomes: ' + JSON.stringify(stats));
  const snap = P.readSnapshot(sab);
  equal([snap.globals.layoutAttempts, snap.globals.layoutGrowthBacktracks, snap.globals.layoutUnsolvable, snap.globals.layoutHard,
    snap.globals.layoutAccepted], [stats.attempts, stats.backtracks, stats.unsolvable, stats.hard, 1], 'counters equal the statistics');
  check(snap.globals.layoutLevels > 0 && snap.globals.layoutFeasibility > 0, 'open levels and feasibility calls are counted');
  const att = P.attribute(snap, { techniques: TECHS });
  const entries = function (name) { return att.contexts.find(function (c) { return c.name === name; }).entries; };
  equal(entries('layout.growth'), stats.attempts, 'one growth span per attempt');
  equal(entries('layout.solvable'), stub.calls.solvable, 'one solvability span per grown attempt');
  equal(entries('layout.plain'), stub.calls.plain, 'one plain-search span per solvable attempt');
  const gridCalls = att.contexts.find(function (c) { return c.name === 'layout.solvable'; }).bySub
    .find(function (b) { return b.kind === 'gridGenerator'; }).calls;
  equal(gridCalls, stub.calls.solvable, 'the full-grid generator is a cell of the solvability check');
  equal(posted.filter(function (m) { return m.ev === 'layout-attempt'; }).length, stats.attempts, 'one durable marker per attempt');
  check(stub.__igJig === undefined, 'restored');
});

add('digger.patched-stage-runner-on-a-fake-engine', 'adapter', 'the stage runner posts its entry before the body and closes in its finally, also when the body throws', function () {
  const rels = ['../core/js/engine/errors.js', '../core/js/engine/budget.js', 'js/engine/digger.js'];
  const stub = Object.assign(fakeSG(), { events: { STEP_IDS: P.STEP_NAMES.slice() } });
  loadContext(rels, true, stub);
  const sab = P.allocate();
  const posted = [];
  const beacon = P.createBeacon({ sab: sab, post: function (m) { posted.push(m); }, techniques: TECHS });
  beacon.install(stub);
  beacon.begin();
  const drive = function (gen) {
    let s = gen.next();
    while (!s.done) s = gen.next();
    return s.value;
  };
  const stage = stub.digger.createStageSteps({ step: function () {} }, {});
  let order = [];
  const value = drive(stage('dig', { attempt: 1, sample: 2 }, function () {
    order.push(posted.map(function (m) { return m.ev; }).join('>'));
    return 7;
  }));
  equal(value, 7, 'the stage still returns the body\'s value');
  equal(order, ['begin>stage-open'], 'the entry marker is posted before the body runs');
  throws(function () {
    drive(stage('rate', {}, function () { throw new Error('inside'); }));
  }, function (e) { return e.message === 'inside'; }, 'the error propagates');
  equal(beacon.stats().depth, 0, 'frames unwound');
  equal(posted.filter(function (m) { return m.ev === 'stage-close'; }).map(function (m) { return m.step; }), ['dig', 'rate'],
    'the failing stage closed too');
  // an abandoned stage (the generator is closed at its first yield: a cooperative run that is given up)
  const coop = stub.digger.createStageSteps({ step: function () {} }, { cooperative: true });
  const gen = coop('tune', {}, function () { return 1; });
  gen.next();
  gen.return(undefined);
  equal(beacon.stats().depth, 0, 'an abandoned stage unwinds');
  beacon.finish('ok');
  beacon.uninstall();
  check(stub.__igJig === undefined, 'restored');
});

// --- the host side recorder on fake workers --------------------------------------------------------------------------------------------

class FakeWorker extends EventEmitter {
  constructor(file, data) {
    super();
    this.data = data;
    this.timers = [];
    setImmediate(() => this.emit('message', { type: 'ready', loadMs: 1, adapterIds: [], proof: null, transforms: [] }));
  }

  postMessage(msg) {
    if (msg && msg.type === 'job') this.script();
  }

  // the scripted worker of the recovery test: the same markers as runSyntheticBusy, then counters that move on a timer
  script() {
    const beacon = P.createBeacon({ sab: this.data.ig08.sab, post: (m) => this.emit('message', m), techniques: TECHS });
    const J = beacon.api;
    beacon.begin();
    let token = J.stageOpen('configure', {});
    J.stageClose(token, 'configure');
    token = J.stageOpen('buildModel', { variantId: 'jigsaw9' });
    for (let n = 1; n <= 3; n++) {
      J.layoutAttempt(n, n - 1);
      J.call(P.CTX.layoutGrowth, function () { return 0; });
      J.layoutBack();
    }
    J.layoutAccepted(3);
    J.stageClose(token, 'buildModel');
    J.stageOpen('fullGrid', { attempt: 2, maxAttempts: 8 });
    let i = 0;
    this.timers.push(setInterval(() => {
      for (let n = 0; n < 1000; n++) {
        J.dfsNode();
        J.dfsCheck();
      }
      if ((i++ % 7) === 0) J.gridRestart();
    }, 5));
  }

  terminate() {
    this.timers.forEach(clearInterval);
    setImmediate(() => this.emit('exit', 1));
    return Promise.resolve(1);
  }
}

function fakeHost(guardOverrides) {
  return new H.Host({ repoRoot: C.DEFAULT_REPO_ROOT, runtimeFingerprint: null, testOnly: true, deadlineMs: 60000, processAgeMs: 0,
    guards: Object.assign({}, C.GUARDS, guardOverrides || {}),
    workerFactory: function (file, data) { return new FakeWorker(file, data); } });
}

async function fakeRecovery(key, guardMs, heartbeatMs) {
  const host = fakeHost({ jigsawMs: guardMs });
  const journal = memoryJournal();
  const obs = await RUN.withBeacon(host, { key: key, journal: journal, heartbeatMs: heartbeatMs }, function () {
    return host.runRequest({ key: key, kind: 'ig08-synthetic-busy', noEngine: true, request: {}, guardScope: 'jigsaw' });
  });
  return { obs: obs, text: journal.text(), hostWorkersAfter: host.workers.size, journal: journal };
}

add('recorder.fake-worker-timeout-recovery', 'recorder', 'a worker that never answers: the host journals its stages and counters and the same judge as the real test passes', async function () {
  const run = await fakeRecovery('IG-S08/test/busy', 600, 100);
  const judged = RUN.judgeRecovery(run, { guardMs: 600, minHeartbeats: 2 });
  const failed = judged.checks.filter(function (c) { return !c.ok; });
  check(failed.length === 0, 'failed: ' + failed.map(function (c) { return c.id + ' ' + JSON.stringify(c.detail); }).join('; '));
  check(judged.checks.length >= 14, 'the judge ran ' + judged.checks.length + ' checks');
  check(run.obs.generation.coldWallMs >= 590 && run.obs.generation.coldWallMs < 1500, 'the guard fired at the guard: ' + run.obs.generation.coldWallMs);
  const kinds = run.journal.lines.map(function (l) { return JSON.parse(l).type; });
  const beforeExit = kinds.filter(function (t) { return t !== 'worker-exit'; });
  check(kinds[0] === 'spawn' && beforeExit[beforeExit.length - 1] === 'final', 'spawn first, the final read last (the exit event may follow): ' +
    kinds.slice(0, 3).join());
});

add('recorder.judge-rejects-a-broken-journal', 'recorder', 'the judge fails when the markers, the heartbeats or the final read are missing', async function () {
  const run = await fakeRecovery('IG-S08/test/busy2', 500, 100);
  const dropped = function (predicate) {
    const lines = run.journal.lines.filter(function (l) { return !predicate(JSON.parse(l)); });
    return Object.assign({}, run, { text: lines.join('\r\n') + '\r\n' });
  };
  const failing = function (r) {
    return RUN.judgeRecovery(r, { guardMs: 500, minHeartbeats: 2 }).checks.filter(function (c) { return !c.ok; }).map(function (c) { return c.id; });
  };
  check(failing(dropped(function (e) { return e.type === 'heartbeat'; })).indexOf('recovery.heartbeats-while-busy') >= 0, 'no heartbeat');
  check(failing(dropped(function (e) { return e.type === 'ev' && e.ev === 'stage-open' && e.step === 'fullGrid'; }))
    .indexOf('recovery.stage-markers-survive') >= 0, 'no stage marker');
  check(failing(dropped(function (e) { return e.type === 'final'; })).indexOf('recovery.final-read') >= 0, 'no final read');
  const wrongOutcome = Object.assign({}, run, { obs: Object.assign({}, run.obs, { outcome: 'complete', wire: {} }) });
  check(failing(wrongOutcome).indexOf('recovery.timeout-recorded') >= 0, 'a result where a timeout was expected');
});

add('recorder.spawn-restored-and-no-journal-after', 'recorder', 'the host\'s spawn is restored and the recorder is silent after the request', async function () {
  const host = fakeHost({ jigsawMs: 300 });
  const own = Object.prototype.hasOwnProperty.call(host, 'spawn');
  const journal = memoryJournal();
  const obs = await RUN.withBeacon(host, { key: 'k', journal: journal, heartbeatMs: 50 }, function () {
    return host.runRequest({ key: 'k', kind: 'ig08-synthetic-busy', noEngine: true, request: {}, guardScope: 'jigsaw' });
  });
  equal(Object.prototype.hasOwnProperty.call(host, 'spawn'), own, 'spawn is the class method again');
  const n = journal.lines.length;
  await new Promise(function (resolve) { setTimeout(resolve, 150); });
  const late = journal.lines.slice(n).map(function (l) { return JSON.parse(l).type; });
  equal(late.filter(function (t) { return t !== 'worker-exit'; }), [], 'nothing but the worker\'s own exit is written after the request ended');
  check(obs.outcome === 'request-timeout', 'the request timed out');
  equal(host.workers.size, 0, 'the worker is gone');
});

// --- plan, packing and budget ------------------------------------------------------------------------------------------------------------

add('plan.shards-keys-and-admission', 'plan', 'two shards, three requests, the fixed seeds and settings; the tail fits the window it can get', function () {
  const manifest = M.buildManifest('IG-S08', 'provisional-r1');
  equal(manifest.shards.map(function (s) { return [s.shard, s.jobKeys.length]; }), [['control', 2], ['tail', 1]], 'shards');
  equal(manifest.jobs.map(function (j) { return [j.requestSeed, j.arm, j.guardScope, j.executor]; }),
    [[1100, 'reference', 'request', null], [1100, 'prototype', 'request', 'jigsaw'], [1111, 'prototype', 'jigsaw', 'jigsaw']], 'jobs');
  manifest.jobs.forEach(function (j) {
    equal(j.request, { variantId: 'jigsaw9', difficulty: 'expert', seed: j.requestSeed, trace: 'off', symmetry: 'rotational180',
      digOrder: 'random' }, 'the preregistered request');
    check(!('maxAttempts' in j.request) && !('variantOptions' in j.request), 'default options and attempts');
  });
  equal(manifest.pairOrder.find(function (p) { return p.pairId === 'jigsaw9:expert:1100'; }).order, ['reference', 'prototype'],
    'the native control first');
  const tailKeys = manifest.shards[1].jobKeys;
  // the tail is admitted when the control left at least the window of its estimate: deadline 250 s (control 20 s), 258 s (11 s)
  [250000, 258500, 270000].forEach(function (deadline) {
    const packed = M.packCommands(M.blocksFor(manifest, tailKeys), M.commandWindowMs(deadline));
    equal([packed.commands.length, packed.oversize], [1, []], 'the tail is one admissible command at a ' + deadline + ' ms deadline');
  });
  const tooLate = M.packCommands(M.blocksFor(manifest, tailKeys), M.commandWindowMs(185000));
  check(tooLate.oversize.length === 1, 'a window below the estimate is never started');
  equal(M.ALLOCATIONS_MS['IG-S08'], 360000, 'the allocation: 6 minutes');
});

add('plan.budget-after-the-control', 'plan', 'the tail host deadline follows the remaining allocation (the observation limit actually applied)', function () {
  const state = function (controlMs) {
    return M.budgetState({ task: 'IG-S08', round: 'provisional-r1', approvals: [], charges: controlMs === null ? [] : [{ task: 'IG-S08',
      chargedMs: controlMs + 45000 }] });
  };
  equal(state(null).effectiveDeadlineMs, 270000, 'before the control: the command ceiling');
  equal(state(20000).effectiveDeadlineMs, 250000, 'after a 20 s control');
  equal(state(11500).effectiveDeadlineMs, 258500, 'after an 11.5 s control');
  equal(state(30000).effectiveDeadlineMs, 240000, 'after a 30 s control (the task\'s own bound)');
  // the observation guard (240 s) binds when the deadline minus the finalize reserve and the start offset still exceeds it
  const reserve = C.GUARDS.finalizeReserveMs;
  check(250000 - reserve >= C.GUARDS.jigsawMs + 1500, 'at a 250 s deadline the 240 s guard is the binding limit');
  check(240000 - reserve < C.GUARDS.jigsawMs, 'at a 240 s deadline the command window is the binding limit (recorded as scope command)');
});

// --- record additions and identity -------------------------------------------------------------------------------------------------------------

add('record.censored-tail-is-a-lower-bound', 'record', 'a timed-out tail request: no puzzle, no check result, a labelled lower bound with its attribution', async function () {
  const run = await fakeRecovery('IG-S08/tail/jigsaw9:expert:1111/profiled', 500, 100);
  const manifest = M.buildManifest('IG-S08', 'provisional-r1');
  const job = manifest.jobs.find(function (j) { return j.requestSeed === 1111; });
  const rec = require('./run.cjs').recordOfRequest(Object.assign({}, job, { key: 'IG-S08/tail/jigsaw9:expert:1111/profiled' }), run.obs, null, { deadlineMs: 250000 });
  RUN.augmentRecord(rec, job, run.obs, { attemptDir: 'unused', journalText: run.text });
  equal(R.checkRecord(rec), [], 'a well-formed record');
  equal([rec.outcome, rec.timeoutScope, rec.censored], ['request-timeout', 'request', true], 'censored');
  check(rec.puzzleHash === null && rec.claimedExact === null && rec.verifiedExact === null && rec.digests === undefined,
    'no puzzle, no exactness: nothing is invented');
  check(rec.validation.solutionValid === null && rec.validation.unique === null, 'no check result');
  check(rec.censoredLowerBound.wallMs === rec.generation.coldWallMs && /not a completed latency/.test(rec.censoredLowerBound.note), 'lower bound');
  equal([rec.jigsaw.source, rec.jigsaw.preMs07, rec.jigsaw.attribution.current.step, rec.jigsaw.markerAgreement], ['final', true, 'fullGrid', 'agree'],
    'attribution from the journal');
  check(rec.jigsaw.unknownCounters.some(function (u) { return u.counter === 'solverBudgetChecks'; }), 'unknown counters are named');
  equal([rec.counts.solverChecks, rec.counts.floorTests, rec.counts.verificationSolves], [null, null, null], 'unknown stays null');
  check(rec.counts.dfsEntries > 0 && rec.counts.dfsChecks > 0, 'observed DFS counters');
  equal(rec.beaconProblems, [], 'a censored run is not judged by the finished-run rules');
  check(rec.limits.guardScope === 'jigsaw', 'the guard scope applied is recorded');
});

add('identity.control-and-tail', 'record', 'the observed control must equal the native one; the tail has no comparator and says so', function () {
  const digests = { all: 'a', puzzle: 'p' };
  const mk = function (arm, over) {
    return Object.assign({ key: 'IG-S08/control/x/' + arm, shard: 'control', arm: arm, outcome: 'complete', claimedExact: true,
      verifiedExact: true, puzzleHash: 'p', digests: digests }, over || {});
  };
  const ok = RUN.identity([mk('reference'), mk('prototype')]);
  equal([ok.ok, ok.failed, ok.complete], [1, 0, true], 'identical');
  const bad = RUN.identity([mk('reference'), mk('prototype', { digests: { all: 'b', puzzle: 'q' } })]);
  equal([bad.failed, bad.pairs[0].verdict], [1, 'identity-failed'], 'different puzzle');
  const incomplete = RUN.identity([mk('reference'), mk('prototype', { outcome: 'request-timeout' })]);
  equal([incomplete.failed, incomplete.notComparable], [0, 1], 'not comparable, never a pass');
  const tail = RUN.identity([{ key: 'IG-S08/tail/x/profiled', shard: 'tail', arm: 'prototype', outcome: 'request-timeout' }]);
  equal([tail.failed, tail.notComparable, tail.complete], [0, 1, false], 'the tail has no comparator');
});

add('summary.overhead-estimate', 'record', 'the overhead is one ratio plus the calibrated estimate; a missing figure is null', function () {
  const g = function (ready) { return { readyWallMs: ready, coldWallMs: ready + 100, cpuTotalMs: ready * 1.1, cpuResolutionStatus: 'resolved' }; };
  const a = { contexts: [{ bySub: [{ calls: 1000 }, { calls: 500 }] }], counters: { totals: { dfsNodes: 10000, dfsChecks: 8000, dfsBacktracks: 100,
    gridSearches: 3, gridRestarts: 1 } }, markers: { posted: 40 }, beaconObservedMs: 2000 };
  const ref = { outcome: 'complete', generation: g(1000) };
  const proto = { outcome: 'complete', generation: g(1500), jigsaw: { attribution: a } };
  const out = RUN.overheadOf(ref, proto, { enterLeavePairNs: 100, counterIncrementNs: 3, markerPostNs: 5000 });
  close(out.readyWallFactor, 1.5, 'ready factor');
  equal([out.estimate.spans, out.estimate.counterIncrements, out.estimate.markersPosted], [1500, 18104, 40], 'operations');
  close(out.estimate.estimatedMs, (1500 * 100 + 18104 * 3 + 40 * 5000) / 1e6, 'estimated ms');
  equal(RUN.overheadOf(ref, { outcome: 'request-timeout', generation: g(1) }, null), null, 'no overhead from a censored request');
  equal(RUN.overheadOf(ref, proto, null).estimate, null, 'no estimate without a calibration');
});

// --- the full-grid counter scope in the documents (reporting only) ---------------------------------------------------------------------------------------

function gridFixture(openThird) {
  const key = 'IG-S08/tail/jigsaw9:expert:1111/profiled';
  const k = fakeClock(1000);
  const f = fakeBeacon(k);
  const a = f.api;
  f.beacon.begin();
  const stage = function (attempt, searches, restarts, backtracks, nodes, nodeBacktracks, ms) {
    const tok = a.stageOpen('fullGrid', { attempt: attempt });
    for (let i = 0; i < searches; i++) a.gridSearch();
    for (let i = 0; i < restarts; i++) a.gridRestart();
    a.gridBack(backtracks);
    for (let i = 0; i < nodes; i++) a.dfsNode();
    for (let i = 0; i < nodeBacktracks; i++) a.dfsBack();
    k.advance(ms);
    a.stageClose(tok, 'fullGrid');
  };
  stage(1, 3, 2, 30, 100, 40, 5);
  k.advance(1);
  stage(2, 2, 1, 20, 50, 20, 4);
  k.advance(1);
  const third = a.stageOpen('fullGrid', { attempt: 3 });
  k.advance(2);
  a.gridUnlimited(50);
  for (let i = 0; i < 1000; i++) a.dfsNode();
  for (let i = 0; i < 2000; i++) a.dfsBack();
  k.advance(10000);
  if (!openThird) a.stageClose(third, 'fullGrid');
  const endEpoch = k.t + 500;
  const snap = P.readSnapshot(f.sab);
  const lines = [];
  const line = function (type, data) { lines.push(Object.assign({ at: 'x', key: key, type: type }, data)); };
  line('spawn', { hostEpochMs: 1000, commandWindowRemainingMs: 238000 });
  f.posted.forEach(function (m, i) { line('ev', Object.assign({}, m, { type: 'ev', rel: i, workerSeq: m.seq, ev: m.ev })); });
  line('heartbeat', { n: 1, rel: 5000, hostEpochMs: endEpoch - 400, cpuMs: 4000, summary: P.summariseSnapshot(snap), snapshot: snap });
  line('heartbeat', { n: 2, rel: 10000, hostEpochMs: endEpoch - 200, cpuMs: 9000, summary: P.summariseSnapshot(snap), snapshot: snap });
  line('final', { rel: 12000, hostEpochMs: endEpoch, endEpochMs: endEpoch, outcome: 'request-timeout', summary: P.summariseSnapshot(snap), snapshot: snap });
  const text = lines.map(function (l) { return JSON.stringify(l); }).join('\r\n') + '\r\n';
  const full = RUN.attributionOf(P.reconcileJournal(P.parseJournal(text).entries, key));
  const gen = { coldWallMs: 12000, readyWallMs: 11900, startupMs: 100, cleanupMs: 5, cpuToDecisionMs: 11000, cpuTotalMs: 11010, cpuResolutionStatus: 'resolved' };
  const rec = Object.assign(R.blankRecord({ key: key, outcome: 'request-timeout', timeoutScope: 'request', arm: 'prototype', shard: 'tail', generation: gen }), {
    limits: { guardMs: 240000, guardScope: 'jigsaw', commandDeadlineMs: 250000 },
    jigsaw: { limitAppliedMs: 240000, commandWindowRemainingAtSpawnMs: 238000, attribution: JSON.parse(JSON.stringify(full.attribution)) },
    stageJournal: { sha256OfItsLines: 'x' } });
  return { round: 'provisional-r1', control: null, tail: { command: { firewallClean: true, runtimeLabel: 'l', runtimeFingerprint: 'r', harnessFingerprint: 'h',
    adapterIds: ['jigsaw-profile'], adapterHashes: ['a'], sourceStable: true, machine: {} }, records: [rec], journalText: text },
  ledger: { entries: [], approvals: [] } };
}

add('aggregate.full-grid-scope-completed-and-open', 'aggregate', 'cumulative versus open-stage figures and completed versus active searches are labelled, per-attempt counts stay unknown', function () {
  const AGG = require('./ig08-aggregate.cjs');
  const open = AGG.documents(gridFixture(true), { revision: 'test' });
  const sc = open.attribution.fullGridScope;
  const cum = sc.cumulativeOverAllFullGridStageEntries;
  equal([cum.stageEntries, cum.finishedEntries, cum.openEntries], [3, 2, 1], 'three full-grid stage entries, two finished, one open');
  equal([cum.completedSearches, cum.completedRestarts, cum.backtracksOfReturnedSearches], [5, 3, 50], 'completed searches only: the finished stages');
  equal([cum.liveDfsNodes, cum.liveDfsBacktracks], [1150, 2060], 'live depth-first counters include the running search');
  equal([sc.finishedStages.count, sc.finishedStages.wallMs, sc.finishedStages.maxWallMs], [2, 9, 5], 'finished stages');
  close(cum.wallMsLowerBound, 10511, 'the cumulative wall spans all three entries', 1e-6);
  equal([sc.openStage.attempt, sc.openStage.wallMsObserved], [3, 10502], 'the open stage alone: stage-open marker to the timeout instant');
  close(sc.openStage.residualMsOfCumulativeWall, 0, 'finished plus open reconcile with the cumulative wall', 1e-6);
  equal(sc.unlimitedLastSearch.map(function (m) { return [m.context, m.searchIndexInItsGenerateCall, m.inTheOpenStage, m.msAfterTheOpenStageOpened, m.runningAtLeastMs]; }),
    [['fullGrid', 50, true, 2, 10500]], 'the unlimited-entry marker dates the running search');
  equal([sc.completedSearchesUnchanged.fromHeartbeat, sc.completedSearchesUnchanged.completedSearches], [1, 5], 'no search returned since the first heartbeat');
  equal(sc.perAttemptCounts, { searches: null, restarts: null, backtracks: null, dfsNodes: null, dfsBacktracks: null, why: sc.perAttemptCounts.why }, 'per-attempt counts are unknown, not reconstructed');
  check(/unknown/.test(sc.perAttemptCounts.why), 'and the reason is given');
  const text = open.attribution.readout.concat(open.attribution.impliesForS7).join('\n');
  check(/cumulative over all 3 full-grid stage entries \(2 finished, 1 open\)/.test(text), 'the readout names the cumulative scope');
  check(/COMPLETED searches 5 \(3 restarts, 50 backtracks of returned searches; the running search is in none of these three\)/.test(text), 'completed searches');
  check(/LIVE depth-first counters, which include the running search: 1150 nodes, 2060 backtracks/.test(text), 'live counters');
  check(/Per-attempt counts are unknown/.test(text) && /Open full-grid stage \(attempt 3\) alone: wall observed >= 10\.50 s/.test(text), 'per-attempt unknown; the open stage alone');
  check(/cumulative over ALL 3 full-grid stage entries/.test(text) && /no per-attempt node, backtrack or restart count exists/.test(text), 'the sizing statement is scoped');
  check(!/the open stage made at least/.test(text), 'cumulative figures are not given to the open stage');
  check(!/application would end|native search is faster/.test(text + JSON.stringify(open.attribution)), 'no unconditional application or native-throughput claim');
  const md = open.markdown;
  check(/completed grid searches/.test(md) && /Full-grid scope \(cumulative versus the open stage, completed versus active searches\)/.test(md) &&
    /unknown \(1 active\)/.test(md) && /LIVE and include a running search/.test(md), 'the document labels the columns and the scope');
  // all stages finished: no open stage, the unlimited search is in a finished stage
  const done = AGG.documents(gridFixture(false), { revision: 'test' }).attribution.fullGridScope;
  equal([done.cumulativeOverAllFullGridStageEntries.finishedEntries, done.cumulativeOverAllFullGridStageEntries.openEntries, done.openStage], [3, 0, null],
    'with every stage finished there is no open stage');
  equal(done.unlimitedLastSearch.map(function (m) { return [m.inTheOpenStage, m.runningAtLeastMs]; }), [[false, null]], 'a finished stage\'s search is not reported as running');
  equal([done.finishedStages.count, done.finishedStages.wallMs], [3, 10011], 'finished stages include the long one');
});

add('aggregate.budget-wording-is-not-instrumented', 'aggregate', 'solver check totals are "not instrumented", never "no budget"; the internal guards are acknowledged', function () {
  const why = RUN.UNKNOWN_COUNTERS.find(function (u) { return u.counter === 'solverBudgetChecks'; }).why;
  check(/not instrumented/.test(why) && /internal budgets/.test(why) && !/has no budget|no-op|absent altogether/.test(why), why);
  check(/not instrumented/.test(RUN.PROVENANCE.counterLimitation) && !/absent altogether|no-op/.test(RUN.PROVENANCE.counterLimitation), RUN.PROVENANCE.counterLimitation);
});

// --- the engine checks of the first command ---------------------------------------------------------------------------------------------------------

const ENGINE_CASES = Object.freeze([
  Object.freeze({ name: 'classic4-veryEasy-1', failing: true, config: Object.freeze({ variantId: 'classic4', difficulty: 'veryEasy', seed: 1,
    trace: 'off' }) }),
  Object.freeze({ name: 'classic9-hard-1', failing: false, config: Object.freeze({ variantId: 'classic9', difficulty: 'hard', seed: 1,
    trace: 'off' }) })
]);
// Layout-only checks: two arbitrary seeds (1100 is the control's own layout); neither is a search for a Jigsaw Expert seed.
const LAYOUT_SEEDS = Object.freeze([1100, 9]);
const GRID_CASES = Object.freeze([Object.freeze({ variantId: 'classic4', seed: 1 }), Object.freeze({ variantId: 'classic9', seed: 1 })]);
const STEPS = P.STEP_NAMES;

function sorted(list) {
  return list.slice().sort();
}

function judgeEngineRows(rows) {
  const results = [];
  const add2 = function (id, ok, detail) { results.push({ id: id, ok: ok === true, detail: detail === undefined ? null : detail }); };
  rows.cases.forEach(function (row) {
    const n = row.name;
    add2('engine.hooks-absent-at-start.' + n, row.hooksPresentAtStart === false, null);
    add2('engine.same-puzzle.' + n, row.off.ok && row.on.ok && row.off.digest !== null && row.off.digest === row.on.digest,
      { off: row.off.digest, on: row.on.digest, error: row.on.error });
    add2('engine.same-budget-checks.' + n, row.off.nodes !== null && row.off.nodes === row.on.nodes, { off: row.off.nodes, on: row.on.nodes });
    add2('engine.restored.' + n, row.on.restore && row.on.restore.restored === true && row.on.hooksPresentAfter === false &&
      row.on.state === 'finished' && row.on.depthAtEnd === 0 && row.on.finishError === null, { restore: row.on.restore, state: row.on.state });
    add2('engine.stage-markers-balanced.' + n, STEPS.every(function (s) { return row.on.stageOpened.indexOf(s) >= 0; }) &&
      C.canonicalJson(sorted(row.on.stageOpened)) === C.canonicalJson(sorted(row.on.stageClosed)),
    { opened: row.on.stageOpened.length, closed: row.on.stageClosed.length });
    add2('engine.time-accounting.' + n, Math.abs(row.on.beaconObservedMs - row.on.runMs) <= Math.max(10, 0.05 * row.on.runMs) &&
      Math.abs(row.on.stages.reduce(function (s, x) { return s + x.ms; }, 0) - row.on.beaconObservedMs) <= 1e-6 * Math.max(1, row.on.beaconObservedMs),
    { observed: row.on.beaconObservedMs, run: row.on.runMs });
    add2('engine.counters-observed.' + n, row.on.finderCalls > 0 && row.on.samples >= 1 && row.on.totals.gridSearches >= 1 &&
      row.on.spans > 0, { finderCalls: row.on.finderCalls, samples: row.on.samples, totals: row.on.totals });
    if (row.failing) {
      const f = row.failing;
      add2('engine.budget-error-unwinds.' + n, f.ok === false && f.code === 'budget.exceeded' && f.state === 'finished-with-error' &&
        f.depthAtEnd === 0 && f.restore && f.restore.restored === true && f.hooksPresentAfter === false &&
        f.stageOpened.length === f.stageClosed.length && row.afterFailure.ok && row.afterFailure.digest === row.off.digest,
      { code: f.code, state: f.state, depth: f.depthAtEnd, after: row.afterFailure.ok });
      const a = row.abandoned;
      add2('engine.abandoned-generator-unwinds.' + n, a.ok === true && a.restore.restored === true && a.hooksPresentAfter === false &&
        a.depthAtEnd === 0 && a.opened === a.closed && a.opened > 0, a);
    }
  });
  rows.layouts.forEach(function (l) {
    const n = 'layout-' + l.seed;
    add2('engine.layout-same-regions.' + n, l.ok && l.sameRegions && C.canonicalJson(l.offStats) === C.canonicalJson(l.onStats), { off: l.offStats,
      on: l.onStats });
    add2('engine.layout-counters-equal-stats.' + n, l.beacon.layoutAttempts === l.onStats.attempts &&
      l.beacon.layoutGrowthBacktracks === l.onStats.backtracks && l.beacon.layoutUnsolvable === l.onStats.unsolvable &&
      l.beacon.layoutHard === l.onStats.hard && l.beacon.layoutAccepted === 1 && l.beacon.layoutLevels > 0 &&
      l.beacon.layoutFeasibility > 0, { beacon: l.beacon, stats: l.onStats });
    add2('engine.layout-restored.' + n, l.restore && l.restore.restored === true && l.hooksPresentAfter === false && l.depthAtEnd === 0,
      l.restore);
  });
  rows.grids.forEach(function (g) {
    const n = 'grid-' + g.name;
    add2('engine.grid-same-grid.' + n, g.ok && g.sameGrid && C.canonicalJson(g.offStats) === C.canonicalJson(g.onStats), { off: g.offStats, on: g.onStats });
    add2('engine.grid-counters-equal-stats.' + n, g.totals.gridSearches === g.onStats.attempts && g.totals.gridRestarts === g.onStats.restarts &&
      g.totals.gridBacktracks === g.onStats.backtracks && g.totals.dfsBacktracks === g.onStats.backtracks && g.totals.dfsNodes > 0 &&
      g.totals.dfsChecks > 0 && g.totals.dfsNodes >= g.totals.dfsChecks && g.gridCalls === 1, { totals: g.totals, stats: g.onStats });
    add2('engine.grid-restored.' + n, g.restore && g.restore.restored === true && g.hooksPresentAfter === false && g.depthAtEnd === 0, g.restore);
  });
  return results;
}

/** The engine checks on the real engine: one worker with the patched sources, no request of the experiment. */
async function engineChecks(ctx) {
  const run = await ctx.workerCall(ctx.host, { role: 'request', adapterIds: ['jigsaw-profile'] },
    { kind: 'ig08-check', cases: ENGINE_CASES, layoutSeeds: LAYOUT_SEEDS, gridCases: GRID_CASES }, ['decision'], 60000);
  if (!run.reply || !run.reply.rows) {
    return { results: [{ id: 'engine.worker', ok: false, detail: { error: run.error ? run.error.message : 'no reply' } }],
      wallMs: run.wallMs, cpuMs: run.cpuMs };
  }
  return { results: judgeEngineRows(run.reply.rows), wallMs: run.wallMs, cpuMs: run.cpuMs, rows: run.reply.rows };
}

function goodRows() {
  const on = function () {
    return { ok: true, digest: 'd', nodes: 10, runMs: 100, beaconObservedMs: 101, error: null, restore: { restored: true }, hooksPresentAfter: false,
      state: 'finished', depthAtEnd: 0, finishError: null, stageOpened: STEPS.slice(), stageClosed: STEPS.slice(),
      stages: [{ stage: 'x', ms: 101 }], totals: { gridSearches: 1 }, finderCalls: 5, samples: 1, spans: 9 };
  };
  const failing = { ok: false, code: 'budget.exceeded', state: 'finished-with-error', depthAtEnd: 0, restore: { restored: true },
    hooksPresentAfter: false, stageOpened: ['dig'], stageClosed: ['dig'] };
  const layout = { seed: 9, ok: true, sameRegions: true, offStats: { attempts: 3, backtracks: 7, unsolvable: 1, hard: 1 },
    onStats: { attempts: 3, backtracks: 7, unsolvable: 1, hard: 1 }, beacon: { layoutAttempts: 3, layoutGrowthBacktracks: 7, layoutUnsolvable: 1,
      layoutHard: 1, layoutAccepted: 1, layoutLevels: 5, layoutFeasibility: 9 }, restore: { restored: true }, hooksPresentAfter: false, depthAtEnd: 0 };
  const grid = { name: 'classic4-1', ok: true, sameGrid: true, offStats: { attempts: 1, restarts: 0, backtracks: 2 },
    onStats: { attempts: 1, restarts: 0, backtracks: 2 }, totals: { gridSearches: 1, gridRestarts: 0, gridBacktracks: 2, dfsBacktracks: 2,
      dfsNodes: 9, dfsChecks: 7 }, gridCalls: 1, restore: { restored: true }, hooksPresentAfter: false, depthAtEnd: 0 };
  return { cases: [{ name: 'c', hooksPresentAtStart: false, off: { ok: true, digest: 'd', nodes: 10 }, on: on(), failing: failing,
    afterFailure: { ok: true, digest: 'd' }, abandoned: { ok: true, restore: { restored: true }, hooksPresentAfter: false, depthAtEnd: 0,
      opened: 3, closed: 3 } }], layouts: [layout], grids: [grid] };
}

add('engine-judge.accepts-good-and-rejects-tampered-rows', 'engine-judge', 'the engine checks are judged by rules that fail on a broken hook', function () {
  const good = judgeEngineRows(goodRows());
  check(good.every(function (r) { return r.ok; }), 'good rows pass: ' + good.filter(function (r) { return !r.ok; }).map(function (r) { return r.id; }).join());
  const t = goodRows();
  t.cases[0].on.digest = 'other';
  t.cases[0].on.restore = { restored: false };
  t.layouts[0].beacon.layoutAttempts = 2;
  t.grids[0].totals.dfsBacktracks = 5;
  t.cases[0].failing.depthAtEnd = 2;
  const bad = judgeEngineRows(t).filter(function (r) { return !r.ok; }).map(function (r) { return r.id; });
  equal(bad, ['engine.same-puzzle.c', 'engine.restored.c', 'engine.budget-error-unwinds.c', 'engine.layout-counters-equal-stats.layout-9',
    'engine.grid-counters-equal-stats.grid-classic4-1'], 'the right checks fail');
});

// --- the runner -----------------------------------------------------------------------------------------------------------------------------------------------------

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

module.exports = { registry, add, check, equal, close, throws, fakeClock, fakeBeacon, runPure, engineChecks, judgeEngineRows, ENGINE_CASES,
  LAYOUT_SEEDS, GRID_CASES, goodRows };

if (require.main === module) {
  try {
    require('./ig08-aggregate.cjs').registerTests(module.exports);
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
