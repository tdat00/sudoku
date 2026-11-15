'use strict';

/*
 * Worker side of IG-S07 (test side, provisional (pre-freeze)): the profiled native request, the engine checks of the first
 * command and the calibration of the instrumentation cost. The dispatch is a single line of worker.cjs: every job kind that
 * starts with `ig07-` is handled here.
 *
 * A profiled request is the native `SG.pipeline.run(config, null)` of worker.cjs on an engine instance that carries the
 * adapter `profile`; the profile runtime is installed for exactly that call and uninstalled in a `finally`, whatever the
 * run does. The profile is posted as its own message (`ig07-profile`) before the `decision` (or the error), so the host's
 * request accounting is the unchanged `Host.runRequest` one.
 *
 * Revision r2 adds the job kind `ig07-loopcheck`: the real `SG.logicalSolver.solve` of classic9 under budgets of 0, 1, 2, ...
 * nodes, on an unpatched instance and on a patched one (runtime absent and present), so that the checks of the ladder loop that
 * throw before the first finder or before a stuck result, and an empty ladder, are compared with the budget's own count.
 */
const C = require('./common.cjs');
const PR = require('./profile-runtime.cjs');

// An abandoned generator is stopped after this many steps: inside the dig stage of every small request of the checks.
const ABANDON_AFTER_YIELDS = 6;

function finderIds(SG) {
  return SG.techniques.list().map(function (t) { return t.id; });
}

/** One native run on this instance; `profiled` installs the runtime around it. Never throws: the error is data. */
function runOnce(SG, config, options) {
  const o = options || {};
  const out = { ok: false, wire: null, error: null, snapshot: null, restore: null, runMs: null, budgetNodes: null,
    installError: null };
  let rt = null;
  let installed = false;
  let result = null;
  let t0 = null;
  let t1 = null;
  try {
    if (o.profiled === true) {
      if (SG.__igProf !== undefined) throw new C.HarnessError('unsupported-source', 'a profile is already installed');
      rt = PR.create({ techniqueIds: finderIds(SG) });
      rt.install(SG);
      installed = true;
      rt.begin();
    }
    t0 = performance.now();
    try {
      result = SG.pipeline.run(config, null, o.budget === undefined ? undefined : o.budget);
      out.ok = true;
    } catch (err) {
      out.error = err;
    }
    t1 = performance.now();
  } catch (err) {
    out.installError = err;
  } finally {
    if (rt !== null) {
      try {
        out.snapshot = rt.finish();
      } catch (err) {
        out.snapshot = null;
        out.installError = out.installError || err;
      }
      out.restore = installed ? rt.uninstall() : { restored: true, problems: [], wasInstalled: false };
    }
  }
  out.runMs = t0 !== null && t1 !== null ? t1 - t0 : null;
  if (o.budget && typeof o.budget.nodes === 'number') out.budgetNodes = o.budget.nodes;
  if (out.ok) out.wire = SG.pipeline.toWire(result);
  return out;
}

function runProfiled(ctx) {
  const SG = ctx.SG;
  const post = ctx.post;
  const out = runOnce(SG, ctx.job.config, { profiled: true });
  if (out.installError) {
    const err = out.installError;
    const fatal = err instanceof C.HarnessError || err.code === 'capability-missing';
    post({ type: fatal ? 'fatal' : 'error', error: Object.assign(ctx.failure(err), { code: err.code || 'profile-install' }),
      engineElapsedMs: out.runMs });
    return;
  }
  post({ type: 'ig07-profile', profile: out.snapshot, restore: out.restore, runMs: out.runMs, ok: out.ok,
    runError: out.error ? ctx.failure(out.error) : null });
  if (!out.ok) {
    post({ type: 'error', error: ctx.failure(out.error), engineElapsedMs: out.runMs });
    return;
  }
  post({ type: 'decision', wire: out.wire, engineElapsedMs: out.runMs });
}

// --- the engine checks of the first command ---------------------------------------------------------------------------------

function digestOf(wire) {
  // records.cjs is loaded only here: the profiled request path of a worker loads nothing it does not use
  return wire ? require('./records.cjs').normaliseWire(wire).digests.all : null;
}

function sumRatings(wire) {
  return wire && Array.isArray(wire.work) ? wire.work.reduce(function (s, w) { return s + w.ratings; }, 0) : null;
}

function runCase(SG, spec, mode) {
  const row = { name: spec.name, mode: mode, hooksPresentAtStart: SG.__igProf !== undefined };
  const cfg = spec.config;
  if (mode === 'plain') {
    const plain = runOnce(SG, cfg, { profiled: false, budget: SG.budget.create({}) });
    row.plain = { ok: plain.ok, digest: digestOf(plain.wire), nodes: plain.budgetNodes, runMs: plain.runMs,
      error: plain.error ? plain.error.message : null };
    return row;
  }
  // patched source, runtime absent: the transforms must be the native code
  const off = runOnce(SG, cfg, { profiled: false, budget: SG.budget.create({}) });
  row.off = { ok: off.ok, digest: digestOf(off.wire), nodes: off.budgetNodes, runMs: off.runMs,
    error: off.error ? off.error.message : null };
  const on = runOnce(SG, cfg, { profiled: true, budget: SG.budget.create({}) });
  row.on = { ok: on.ok, digest: digestOf(on.wire), nodes: on.budgetNodes, runMs: on.runMs,
    error: on.error ? on.error.message : null, snapshot: on.snapshot, restore: on.restore,
    workRatings: sumRatings(on.wire),
    consistency: on.snapshot ? PR.consistency(on.snapshot, { allowLeaks: false }) : ['no snapshot'] };
  row.hooksPresentAfter = SG.__igProf !== undefined;
  // a budget error in the middle of the run: frames unwound, hooks removed
  const failAt = Math.max(1, Math.floor((on.budgetNodes || 2) / 2));
  const failing = runOnce(SG, cfg, { profiled: true, budget: SG.budget.create({ nodes: failAt }) });
  row.failing = { ok: failing.ok, error: failing.error ? failing.error.message : null, failAfterNodes: failAt,
    code: failing.error && failing.error.code ? failing.error.code : null, restore: failing.restore,
    consistency: failing.snapshot ? PR.consistency(failing.snapshot, { allowLeaks: false }) : ['no snapshot'],
    openAtFinish: failing.snapshot ? failing.snapshot.nest.framesOpenAboveRootAtFinish : null,
    hooksPresentAfter: SG.__igProf !== undefined };
  // after the error the next run on this instance is native again
  const after = runOnce(SG, cfg, { profiled: false, budget: SG.budget.create({}) });
  row.afterFailure = { ok: after.ok, digest: digestOf(after.wire), nodes: after.budgetNodes };
  // an abandoned generator: finally blocks run, the runtime closes what is left
  const rt = PR.create({ techniqueIds: finderIds(SG) });
  let abandoned = null;
  try {
    rt.install(SG);
    rt.begin();
    const steps = SG.pipeline.runSteps(cfg, null, null, { cooperative: true });
    for (let k = 0; k < ABANDON_AFTER_YIELDS; k++) {
      if (steps.next().done) break;
    }
    steps.return(undefined);
    abandoned = { snapshot: rt.finish() };
  } catch (err) {
    abandoned = { error: String(err && err.message ? err.message : err) };
  } finally {
    row.abandoned = Object.assign(abandoned || {}, { restore: rt.uninstall(), hooksPresentAfter: SG.__igProf !== undefined });
  }
  if (row.abandoned.snapshot) {
    row.abandoned.consistency = PR.consistency(row.abandoned.snapshot, { allowLeaks: true });
    row.abandoned.openAtFinish = row.abandoned.snapshot.nest.framesOpenAboveRootAtFinish;
    delete row.abandoned.snapshot;
  }
  row.on.snapshotBytes = on.snapshot ? JSON.stringify(on.snapshot).length : null;
  return row;
}

function runCheck(ctx) {
  try {
    const rows = ctx.job.cases.map(function (spec) { return runCase(ctx.SG, spec, ctx.job.mode); });
    ctx.post({ type: 'decision', wire: null, rows: rows, engineElapsedMs: 0 });
  } catch (err) {
    ctx.post({ type: 'error', error: ctx.failure(err) });
  }
}

function runCalibrate(ctx) {
  try {
    ctx.post({ type: 'decision', wire: null, costs: PR.measureCosts(ctx.job.options), engineElapsedMs: 0 });
  } catch (err) {
    ctx.post({ type: 'error', error: ctx.failure(err) });
  }
}

// --- the loop-check comparison (the revision r2 of IG-S07: the observed check sites of the ladder loop) -----------------------------

const SINGLES = Object.freeze(['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine']);
const PUZZLES = Object.freeze({
  blank: '0'.repeat(81),
  easy: '003020600900305001001806400008102900700000008006708200002609500800203009005010300',
  hard: '100007090030020008009600500005300900010080002600004000300000010040000007007000300'
});
// Every case is a real `SG.logicalSolver.solve` on classic9. The ladders cover the boundaries of the loop: no technique at all, a
// ladder that solves the grid, a ladder that ends stuck, and one whose finders issue their own `ctx.check()` calls.
const LOOP_CASES = Object.freeze([
  Object.freeze({ name: 'empty-ladder', puzzle: 'blank', techniques: Object.freeze([]) }),
  Object.freeze({ name: 'singles-solved', puzzle: 'easy', techniques: SINGLES }),
  Object.freeze({ name: 'singles-stuck', puzzle: 'hard', techniques: SINGLES }),
  Object.freeze({ name: 'subsets-stuck', puzzle: 'hard', techniques: Object.freeze(SINGLES.concat(['nakedPair', 'hiddenPair', 'nakedTriple'])) })
]);
const SWEEP_FROM_ZERO = 24;

function givensOf(text) {
  return Int32Array.from(text.split('').map(Number));
}

/** Every budget limit that matters: 0 up to a cap, and the last checks before the unlimited run's own count and just past it. */
function sweepLimits(total) {
  const out = new Set();
  for (let k = 0; k <= Math.min(total + 1, SWEEP_FROM_ZERO); k++) out.add(k);
  for (let k = Math.max(0, total - 3); k <= total + 1; k++) out.add(k);
  return Array.from(out).sort(function (a, b) { return a - b; });
}

/** One solve under a budget of `limit` nodes (null: unlimited); `profiled` installs a runtime around it. Never throws. */
function loopSolve(SG, model, spec, limit, profiled) {
  const budget = SG.budget.create(limit === null ? {} : { nodes: limit });
  const row = { limit: limit, status: null, code: null, nodes: null, steps: null, score: null, counts: null, profile: null };
  let rt = null;
  let installed = false;
  let snapshot = null;
  try {
    if (profiled) {
      rt = PR.create({ techniqueIds: finderIds(SG) });
      rt.install(SG);
      installed = true;
      rt.begin();
    }
    try {
      const report = SG.logicalSolver.solve(model, spec.givens, { allowedTechniques: spec.techniques.slice(), budget: budget });
      row.status = report.status;
      row.steps = report.steps.length;
      row.score = report.score;
      row.counts = report.techniqueCounts;
    } catch (err) {
      row.code = err && err.code ? err.code : String(err && err.message ? err.message : err);
    }
    row.nodes = budget.nodes;
  } catch (err) {
    row.setupError = String(err && err.message ? err.message : err);
  } finally {
    if (rt !== null) {
      try {
        snapshot = rt.finish();
      } catch (err) {
        row.finishError = String(err && err.message ? err.message : err);
      }
      const restore = installed ? rt.uninstall() : { restored: true, problems: [] };
      const c = snapshot ? snapshot.counters : null;
      row.profile = { restored: restore.restored === true && SG.__igProf === undefined,
        problems: snapshot ? PR.consistency(snapshot, { allowLeaks: false }) : ['no snapshot'],
        loopChecks: c ? c.loopChecks : null, finderChecks: c ? c.finderChecks : null, loopChecksDerived: c ? c.loopChecksDerived : null,
        finderCalls: c ? c.finderCalls : null, finderThrows: snapshot ? snapshot.finders.reduce(function (s, r) { return s + r[9]; }, 0) : null,
        passes: c ? c.passes : null };
    }
  }
  return row;
}

/** The rows of every case of one mode: plain = the native instance; patched = the patched sources, runtime absent (off) and present (on). */
function runLoopCases(SG, model, cases, mode) {
  return cases.map(function (spec) {
    const base = loopSolve(SG, model, spec, null, false);
    const total = base.nodes;
    const limits = sweepLimits(typeof total === 'number' ? total : 0);
    const rows = limits.map(function (limit) {
      const row = { limit: limit, off: loopSolve(SG, model, spec, limit, false) };
      if (mode === 'patched') row.on = loopSolve(SG, model, spec, limit, true);
      return row;
    });
    const out = { name: spec.name, techniques: spec.techniques.slice(), unlimited: { off: base }, rows: rows };
    if (mode === 'patched') out.unlimited.on = loopSolve(SG, model, spec, null, true);
    return out;
  });
}

function runLoopCheck(ctx) {
  try {
    const SG = ctx.SG;
    const model = SG.variants.get('classic9').build({}, SG.rng.create(1).fork('model'));
    const cases = LOOP_CASES.map(function (c) {
      return { name: c.name, givens: givensOf(PUZZLES[c.puzzle]), techniques: c.techniques };
    });
    const t0 = performance.now();
    const rows = runLoopCases(SG, model, cases, ctx.job.mode);
    ctx.post({ type: 'decision', wire: null, rows: rows, engineElapsedMs: performance.now() - t0 });
  } catch (err) {
    ctx.post({ type: 'error', error: ctx.failure(err) });
  }
}

function handle(ctx) {
  const kind = ctx.job.kind;
  if (kind === 'ig07-profile-request') return runProfiled(ctx);
  if (kind === 'ig07-check') return runCheck(ctx);
  if (kind === 'ig07-loopcheck') return runLoopCheck(ctx);
  if (kind === 'ig07-calibrate') return runCalibrate(ctx);
  return ctx.post({ type: 'fatal', error: { code: 'job-kind', name: null, message: 'unknown IG-S07 job kind ' + kind } });
}

module.exports = { handle, runProfiled, runCheck, runCalibrate, runLoopCheck, runOnce, runCase, runLoopCases, loopSolve, sweepLimits,
  LOOP_CASES, PUZZLES, SINGLES };
