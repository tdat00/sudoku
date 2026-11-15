'use strict';

/*
 * Worker side of IG-S08 (test side, provisional (pre-freeze), pre-MS07): the observed native request, the engine checks of the
 * instrument, the calibration of its unit costs and the synthetic busy worker of the journal recovery test. The dispatch is a
 * single line of worker.cjs: every job kind that starts with `ig08-` is handled here.
 *
 * An observed request is the native `SG.pipeline.run(config, null)` of worker.cjs on an engine instance that carries the adapter
 * `jigsaw-profile`; the beacon (jigsaw-profile.cjs) is installed for exactly that call, over the shared buffer the host handed
 * in through the worker data, and uninstalled in a `finally`, whatever the run does. The beacon posts its stage markers while the
 * synchronous work runs (`ig08-ev` messages, journaled by the host), and the counters live in the shared buffer, so an
 * interrupted worker leaves them behind. The host's request accounting is the unchanged `Host.runRequest` one.
 */
const { workerData } = require('worker_threads');
const C = require('./common.cjs');
const P = require('./jigsaw-profile.cjs');

function techniquesOf(SG) {
  return SG.techniques.list().map(function (t) { return { id: t.id, group: t.group }; });
}

/**
 * `fn` runs with a beacon installed over `options.sab` (markers go to `options.post`). Never throws: the error is data. The
 * beacon is finished, then uninstalled, whatever `fn` does.
 */
function observe(SG, options, fn) {
  const out = { ok: false, value: null, error: null, restore: null, installError: null, stats: null, runMs: null };
  let beacon = null;
  let installed = false;
  try {
    if (SG.__igJig !== undefined) throw new C.HarnessError('unsupported-source', 'a beacon is already installed');
    beacon = P.createBeacon({ sab: options.sab, post: options.post, epoch: options.epoch, maxMarkers: options.maxMarkers,
      techniques: techniquesOf(SG) });
    beacon.install(SG);
    installed = true;
    beacon.begin();
    const t0 = performance.now();
    try {
      out.value = fn();
      out.ok = true;
    } catch (err) {
      out.error = err;
    }
    out.runMs = performance.now() - t0;
  } catch (err) {
    out.installError = err;
  } finally {
    if (beacon !== null) {
      try {
        beacon.finish(out.ok ? 'ok' : 'error');
      } catch (err) {
        out.finishError = String(err && err.message ? err.message : err);
      }
      out.restore = installed ? beacon.uninstall() : { restored: true, problems: [], wasInstalled: false };
      out.stats = beacon.stats();
    }
  }
  return out;
}

function sabOf() {
  const data = workerData;
  return data && data.ig08 && data.ig08.sab ? data.ig08.sab : null;
}

// --- the observed request -----------------------------------------------------------------------------------------------------

function runRequest(ctx) {
  const sab = sabOf();
  if (sab === null) {
    ctx.post({ type: 'fatal', error: { code: 'ig08-no-beacon', name: null, message: 'no shared buffer was handed to the worker' } });
    return;
  }
  const SG = ctx.SG;
  let wire = null;
  const out = observe(SG, { sab: sab, post: ctx.post }, function () {
    const result = SG.pipeline.run(ctx.job.config, null);
    wire = SG.pipeline.toWire(result);
    return null;
  });
  if (out.installError) {
    const err = out.installError;
    const fatal = err instanceof C.HarnessError || err.code === 'capability-missing';
    ctx.post({ type: fatal ? 'fatal' : 'error', error: Object.assign(ctx.failure(err), { code: err.code || 'ig08-install' }),
      engineElapsedMs: out.runMs });
    return;
  }
  ctx.post({ type: 'ig08-profile', restore: out.restore, runMs: out.runMs, ok: out.ok, stats: out.stats,
    runError: out.error ? ctx.failure(out.error) : null });
  if (!out.ok) {
    ctx.post({ type: 'error', error: ctx.failure(out.error), engineElapsedMs: out.runMs });
    return;
  }
  ctx.post({ type: 'decision', wire: wire, engineElapsedMs: out.runMs });
}

// --- the engine checks of the first command ---------------------------------------------------------------------------------

function digestOf(wire) {
  // records.cjs is loaded only here: the observed request path of a worker loads nothing it does not use
  return wire ? require('./records.cjs').normaliseWire(wire).digests.all : null;
}

function runPlain(SG, config, budget) {
  const t0 = performance.now();
  try {
    const wire = SG.pipeline.toWire(SG.pipeline.run(config, null, budget));
    return { ok: true, digest: digestOf(wire), runMs: performance.now() - t0, error: null, code: null };
  } catch (err) {
    return { ok: false, digest: null, runMs: performance.now() - t0, error: String(err && err.message ? err.message : err),
      code: err && err.code ? err.code : null };
  }
}

function markerCounts(markers) {
  const counts = {};
  markers.forEach(function (m) { counts[m.ev] = (counts[m.ev] || 0) + 1; });
  return counts;
}

function observedRow(SG, config, budget, tag) {
  const sab = P.allocate();
  const markers = [];
  let wire = null;
  const out = observe(SG, { sab: sab, post: function (m) { markers.push(m); } }, function () {
    wire = SG.pipeline.toWire(SG.pipeline.run(config, null, budget));
    return null;
  });
  const snap = P.readSnapshot(sab);
  const att = P.attribute(snap, { techniques: techniquesOf(SG) });
  const row = { tag: tag, ok: out.ok, digest: digestOf(wire), runMs: out.runMs, error: out.error ? String(out.error.message || out.error) : null,
    code: out.error && out.error.code ? out.error.code : null, installError: out.installError ? String(out.installError.message) : null,
    restore: out.restore, hooksPresentAfter: SG.__igJig !== undefined, finishError: out.finishError || null,
    state: att.state, depthAtEnd: snap.header.depth, beaconObservedMs: att.beaconObservedMs,
    markers: markerCounts(markers), markerOrder: markers.map(function (m) { return m.ev; }).slice(0, 12),
    stageOpened: markers.filter(function (m) { return m.ev === 'stage-open'; }).map(function (m) { return m.step; }),
    stageClosed: markers.filter(function (m) { return m.ev === 'stage-close'; }).map(function (m) { return m.step; }),
    totals: att.counters.totals, finderCalls: att.finders.reduce(function (s, r) { return s + r.calls; }, 0),
    spans: out.stats ? out.stats.spans : null, samples: att.samples, stages: att.stages.map(function (s) {
      return { stage: s.stage, ms: s.wallMsLowerBound };
    }) };
  return row;
}

function runCase(SG, spec) {
  const row = { name: spec.name, hooksPresentAtStart: SG.__igJig !== undefined };
  const budgetNodes = function (b) { return typeof b.nodes === 'number' ? b.nodes : null; };
  const plainBudget = SG.budget.create({});
  row.off = Object.assign(runPlain(SG, spec.config, plainBudget), { nodes: budgetNodes(plainBudget) });
  const onBudget = SG.budget.create({});
  row.on = Object.assign(observedRow(SG, spec.config, onBudget, 'on'), { nodes: budgetNodes(onBudget) });
  if (spec.failing === true && row.off.nodes !== null && row.off.nodes >= 2) {
    const failAt = Math.max(1, Math.floor(row.off.nodes / 2));
    row.failing = Object.assign(observedRow(SG, spec.config, SG.budget.create({ nodes: failAt }), 'failing'), { failAfterNodes: failAt });
    row.afterFailure = runPlain(SG, spec.config, SG.budget.create({}));
    // an abandoned generator: the finally blocks run, the beacon closes what is left
    const sab = P.allocate();
    const markers = [];
    const out = observe(SG, { sab: sab, post: function (m) { markers.push(m); } }, function () {
      const steps = SG.pipeline.runSteps(spec.config, null, null, { cooperative: true });
      for (let k = 0; k < 6; k++) {
        if (steps.next().done) break;
      }
      steps.return(undefined);
      return null;
    });
    const snap = P.readSnapshot(sab);
    row.abandoned = { ok: out.ok, restore: out.restore, hooksPresentAfter: SG.__igJig !== undefined, depthAtEnd: snap.header.depth,
      opened: markers.filter(function (m) { return m.ev === 'stage-open'; }).length,
      closed: markers.filter(function (m) { return m.ev === 'stage-close'; }).length, error: out.error ? String(out.error.message) : null };
  }
  return row;
}

function runLayoutCase(SG, seed) {
  const generate = function (stats) {
    return SG.jigsaw.generateRegions(SG.rng.create(seed).fork('model'), { stats: stats });
  };
  const offStats = {};
  const off = Array.from(generate(offStats));
  const onStats = {};
  const sab = P.allocate();
  const markers = [];
  let on = null;
  const out = observe(SG, { sab: sab, post: function (m) { markers.push(m); } }, function () {
    on = Array.from(generate(onStats));
    return null;
  });
  const snap = P.readSnapshot(sab);
  const att = P.attribute(snap, { techniques: techniquesOf(SG) });
  const ctxMs = function (name) {
    const row = att.contexts.find(function (c) { return c.name === name; });
    return row ? row.ms : 0;
  };
  return { seed: seed, ok: out.ok, error: out.error ? String(out.error.message) : null, sameRegions: on !== null &&
    on.join(',') === off.join(','), offStats: offStats, onStats: onStats, beacon: att.layout, restore: out.restore,
    hooksPresentAfter: SG.__igJig !== undefined, growthMs: ctxMs('layout.growth'), solvableMs: ctxMs('layout.solvable'),
    plainMs: ctxMs('layout.plain'), markers: markerCounts(markers), depthAtEnd: snap.header.depth };
}

/** A full grid on a small board with the beacon over it: the grid hooks against the generator's own statistics. */
function runGridCase(SG, spec) {
  const model = SG.variants.get(spec.variantId).build({}, SG.rng.create(spec.seed).fork('model'));
  const generate = function (stats) {
    return Array.from(SG.fullGrid.generate(model, SG.rng.create(spec.seed).fork('grid#1'), null, { stats: stats }));
  };
  const offStats = {};
  const off = generate(offStats);
  const onStats = {};
  const sab = P.allocate();
  let on = null;
  const out = observe(SG, { sab: sab, post: function () {} }, function () {
    on = generate(onStats);
    return null;
  });
  const snap = P.readSnapshot(sab);
  const att = P.attribute(snap, { techniques: techniquesOf(SG) });
  return { name: spec.variantId + '-' + spec.seed, ok: out.ok, error: out.error ? String(out.error.message) : null,
    sameGrid: on !== null && on.join(',') === off.join(','), offStats: offStats, onStats: onStats,
    totals: att.counters.totals, restore: out.restore, hooksPresentAfter: SG.__igJig !== undefined, depthAtEnd: snap.header.depth,
    gridCalls: att.contexts.reduce(function (s, c) {
      return s + c.bySub.filter(function (b) { return b.kind === 'gridGenerator'; }).reduce(function (t, b) { return t + b.calls; }, 0);
    }, 0) };
}

function runCheck(ctx) {
  try {
    const job = ctx.job;
    const rows = { cases: job.cases.map(function (spec) { return runCase(ctx.SG, spec); }),
      layouts: job.layoutSeeds.map(function (seed) { return runLayoutCase(ctx.SG, seed); }),
      grids: job.gridCases.map(function (spec) { return runGridCase(ctx.SG, spec); }) };
    ctx.post({ type: 'decision', wire: null, rows: rows, engineElapsedMs: 0 });
  } catch (err) {
    ctx.post({ type: 'error', error: ctx.failure(err) });
  }
}

// --- the calibration of the unit costs ---------------------------------------------------------------------------------------

function median(values) {
  const sorted = values.slice().sort(function (a, b) { return a - b; });
  return sorted[Math.floor(sorted.length / 2)];
}

function perOpNs(fn, n, repeats) {
  const samples = [];
  for (let r = 0; r < repeats; r++) {
    const t0 = performance.now();
    for (let i = 0; i < n; i++) fn(i);
    samples.push((performance.now() - t0) * 1e6 / n);
  }
  return median(samples);
}

/** Unit costs of the beacon's operations in ns (a scratch beacon over its own buffer, no engine). Estimates, never corrections. */
function measureCosts(options) {
  const o = options || {};
  const n = o.iterations || 50000;
  const repeats = o.repeats || 3;
  let posted = 0;
  const beacon = P.createBeacon({ sab: P.allocate(), post: function () { posted++; }, maxMarkers: 1e9, techniques: [] });
  beacon.begin();
  const cell = P.CTX.dig * P.SUBS + 1;
  const costs = {
    enterLeavePairNs: perOpNs(function () { beacon.enter(cell); beacon.leave(); }, n, repeats),
    epochReadNs: perOpNs(function () { performance.timeOrigin + performance.now(); }, n, repeats),
    counterIncrementNs: perOpNs(function () { beacon.api.dfsNode(); }, n * 10, repeats),
    markerPostNs: perOpNs(function (i) { beacon.api.layoutAttempt(i, 0); }, Math.min(n, 20000), repeats),
    iterations: n, repeats: repeats
  };
  beacon.finish('ok');
  costs.markersPosted = posted;
  return costs;
}

function runCalibrate(ctx) {
  try {
    ctx.post({ type: 'decision', wire: null, costs: measureCosts(ctx.job.options), engineElapsedMs: 0 });
  } catch (err) {
    ctx.post({ type: 'error', error: ctx.failure(err) });
  }
}

// --- the synthetic busy worker of the journal recovery test (test-only host) ---------------------------------------------------

function spinMs(ms) {
  const until = performance.now() + ms;
  let x = 0;
  while (performance.now() < until) x = (x + 1) | 0;
  return x;
}

/**
 * A worker that publishes stage entries and counters through the real beacon, then never returns: the busy loop that only the
 * host's guard ends. Test-only (the host must say so): never part of a manifest.
 */
function runSyntheticBusy(ctx) {
  if (!(workerData && workerData.testOnly === true)) {
    ctx.post({ type: 'fatal', error: { code: 'test-only-leak', name: null, message: 'a synthetic job outside a test-only host' } });
    return;
  }
  const sab = sabOf();
  if (sab === null) {
    ctx.post({ type: 'fatal', error: { code: 'ig08-no-beacon', name: null, message: 'no shared buffer was handed to the worker' } });
    return;
  }
  const beacon = P.createBeacon({ sab: sab, post: ctx.post, techniques: [{ id: 'nakedSingle', group: 'basic' },
    { id: 'nakedPair', group: 'subset' }] });
  const J = beacon.api;
  beacon.begin();
  let token = J.stageOpen('configure', {});
  J.stageClose(token, 'configure');
  token = J.stageOpen('buildModel', { variantId: 'jigsaw9' });
  for (let n = 1; n <= 3; n++) {
    J.layoutAttempt(n, n - 1);
    J.call(P.CTX.layoutGrowth, spinMs, 3);
    J.layoutBack();
  }
  J.layoutAccepted(3);
  J.stageClose(token, 'buildModel');
  J.stageOpen('fullGrid', { attempt: 2, maxAttempts: 8 });
  ctx.post({ type: 'ig08-synthetic-ready' });
  // the busy part: only counters move, no message is posted from here on
  for (let i = 0; ; i++) {
    J.dfsNode();
    J.dfsCheck();
    if ((i & 0x3ffff) === 0) J.gridRestart();
  }
}

function handle(ctx) {
  const kind = ctx.job.kind;
  if (kind === 'ig08-jigsaw-request') return runRequest(ctx);
  if (kind === 'ig08-check') return runCheck(ctx);
  if (kind === 'ig08-calibrate') return runCalibrate(ctx);
  if (kind === 'ig08-synthetic-busy') return runSyntheticBusy(ctx);
  return ctx.post({ type: 'fatal', error: { code: 'job-kind', name: null, message: 'unknown IG-S08 job kind ' + kind } });
}

module.exports = { handle, observe, runRequest, runCheck, runCase, runLayoutCase, runGridCase, runCalibrate, measureCosts,
  runSyntheticBusy, techniquesOf };
