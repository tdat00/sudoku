'use strict';

/*
 * Worker side of IG-S04 (test side, provisional (pre-freeze)): one grid trial on the private patched engine instance of
 * this worker thread (adapter `frontier-hooks`), the post-timing S2 audit on an unpatched instance, the unmeasured
 * synthetic engine tests and the patched/unpatched parity run. The dispatch is a single line of worker.cjs:
 * every job kind that starts with `ig04-` is handled here.
 *
 * A trial builds the native model and full grid of the request seed (forks `model` and `grid#1`), reports the grid
 * (`grid-built`, so the host can stamp its wall and CPU), resets the counters and runs ONE sample of ordinal 1 in the
 * mode of the job. It posts `progress` messages at its phase boundaries (a blocked solver cannot, but whatever was posted
 * stays visible if the host has to cut the trial at the 45 s guard) and finally `decision` with the wire of the closest
 * complete candidate (the fully given fallback at worst) and the plain trial details.
 */
const C = require('./common.cjs');
const SB = require('./sample-budget.cjs');
const F = require('./frontier.cjs');

const PASS_THROUGH = Object.freeze({ tick: function tick() {}, check: function check() {} });

function limitsFor(rt, model, groups, trial) {
  const consts = rt.digger;
  const ceilings = SB.pilotCeilings({ CAP_RATINGS: consts.CAP_RATINGS, OBJECTIVE_STEPS: consts.OBJECTIVE_STEPS,
    UNIQUE_NODES: consts.UNIQUE_NODES }, { groups: groups, cells: model.cellCount, digits: model.digits });
  if (trial.testOnly && trial.testOnly.limits) return { limits: Object.assign({}, ceilings, trial.testOnly.limits),
    ceilings: ceilings, origin: 'test-only override (never in a manifest)' };
  if (trial.limits) return { limits: Object.assign({}, trial.limits), ceilings: ceilings, origin: 'supplied budget vector' };
  return { limits: ceilings, ceilings: ceilings, origin: 'pilot ceilings (diagnostic safety envelopes, not fitted)' };
}

function wireOf(SG, cfg, solution, model, best, caps) {
  const exact = best.exact === true;
  return SG.pipeline.toWire({
    model: best.model || model, givens: best.givens, solution: solution, rating: best.rating, exact: exact,
    seed: cfg.seed, config: cfg, timings: {}, attempts: 1,
    warnings: exact ? [] : ['difficulty.approximate'], digLog: best.log === undefined ? [] : best.log, work: caps
  });
}

/** The trial of a job: ctx { SG, job: { config, trial: { mode, ... } }, post, failure }. */
function runTrial(ctx) {
  const SG = ctx.SG;
  const post = ctx.post;
  const rt = SG.__igRt;
  const started = performance.now();
  try {
    if (rt === undefined || rt.digger === null) {
      throw new C.HarnessError('capability-missing', 'the engine instance did not run the frontier hooks (unpatched source?)');
    }
    const trial = ctx.job.trial;
    const mode = F.MODES[trial.mode];
    if (!mode) throw new C.HarnessError('plan-missing', 'unknown mode ' + trial.mode);
    const cfg = SG.pipeline.normalizeConfig(ctx.job.config);
    const def = SG.variants.get(cfg.variantId);
    if (def.digStrategy || typeof def.postGenerate === 'function') {
      throw new C.HarnessError('unsupported-source', cfg.variantId + ' has a variant dig strategy or structure hook: it cannot ' +
        'enter the cell frontier route');
    }
    const level = cfg.difficulty;
    const rng = SG.rng.create(cfg.seed);
    const model = def.build(cfg.variantOptions, rng.fork('model'));
    const spec = SG.difficulty.spec(level, model);
    const em = SG.events.toEmitter(null);

    rt.reset();
    rt.setPurpose('grid');
    const gridStats = {};
    const g0 = performance.now();
    const solution = SG.fullGrid.generate(model, rng.fork('grid#1'), PASS_THROUGH, { emit: em, stepEvents: false,
      stats: gridStats });
    const gridWallMs = performance.now() - g0;
    const gridCounters = rt.countersOf();
    const groups = SG.symmetry.groups(model, cfg.symmetry);
    const info = { groups: groups.length, cells: model.cellCount, digits: model.digits, gridHash: F.hashGivens(solution),
      nativeConstants: { CAP_RATINGS: rt.digger.CAP_RATINGS, CAP_PROPOSALS: rt.digger.CAP_PROPOSALS,
        OBJECTIVE_STEPS: rt.digger.OBJECTIVE_STEPS, UNIQUE_NODES: rt.digger.UNIQUE_NODES } };
    post({ type: 'grid-built', wallMs: gridWallMs, counters: gridCounters, stats: gridStats, info: info });
    rt.reset();

    const common = { SG: SG, rt: rt, model: model, solution: solution, spec: spec, level: level, cfg: cfg,
      rng: rng.fork('dig#1.1'), budget: PASS_THROUGH, progress: post };
    const forkLabels = ['model', 'grid#1', 'dig#1.1'];
    const out = { mode: mode.id, kind: mode.kind, cell: cfg.variantId, seed: cfg.seed, groups: info.groups,
      cells: info.cells, digits: info.digits, forkLabels: forkLabels, nativeConstants: info.nativeConstants,
      gridHash: info.gridHash, gridStats: gridStats, gridBuild: { wallMs: gridWallMs, counters: gridCounters } };
    let result;
    let caps;
    if (mode.kind === 'native') {
      forkLabels.push('dig#1.1>native children (random, guided, refine)');
      result = F.runNative(Object.assign({ kind: mode }, common));
      caps = result.caps;
      out.status = result.status;
      out.limits = null;
      out.limitOrigin = 'native guards and caps (CAP_RATINGS, CAP_PROPOSALS, UNIQUE_NODES, OBJECTIVE_STEPS); no count budget';
      out.native = { sample: result.sample, keeper: result.keeper, caps: result.counts };
      const c = rt.countersOf();
      out.counts = { floorTests: null, floorDeductions: null, solverChecks: c.solverChecks, dfsEntries: c.dfsEntries,
        dfsChecks: c.dfsChecks, ladderPasses: null, phaseBSolves: null, deepenProposals: null,
        verificationSolves: result.counts.ratings, canonicalRatings: result.counts.ratings };
    } else {
      forkLabels.push('dig#1.1>random (native dig order)', 'dig#1.1>deepen');
      const lim = limitsFor(rt, model, groups.length, trial);
      out.limits = lim.limits;
      out.ceilings = lim.ceilings;
      out.limitOrigin = lim.origin;
      result = F.runFrontier(Object.assign({ variant: mode, limits: lim.limits, testOnly: trial.testOnly || null }, common));
      caps = result.caps;
      out.status = result.status;
      out.budgetStop = result.budgetStop;
      out.counts = result.counts;
      out.frontier = result.detail;
      out.fallback = result.fallback;
      out.audit = result.audit;
      out.performanceScope = mode.s2 ? 'minimal S2 early-exit prototype: no initial-state cache, no reuse of parent ' +
        'eliminations; it shortens accepted tests only' : 'S2 off: every accepted test is a full floor solve';
    }
    out.engine = rt.countersOf();
    out.enginePurposes = rt.snapshot().by;
    const best = result.best;
    out.best = best === null ? null : {
      source: best.source, quality: best.quality === Infinity ? null : best.quality, exact: best.exact === true,
      uniqueness: best.uniqueness, level: best.rating.level, score: best.rating.score, solved: best.rating.solved,
      hardestTechnique: best.rating.hardestTechnique, entry: best.entry === undefined ? null : best.entry,
      clues: Array.from(best.givens).filter(function (v) { return v !== 0; }).length
    };
    const wire = best === null ? null : wireOf(SG, cfg, solution, model, best, caps);
    out.engineMs = performance.now() - started;
    post({ type: 'decision', wire: wire, engineElapsedMs: out.engineMs, trial: out });
  } catch (err) {
    const fatal = err instanceof C.HarnessError && C.exitCodeOf(err) === 2;
    post({ type: fatal ? 'fatal' : 'error', error: ctx.failure(err), engineElapsedMs: performance.now() - started });
  } finally {
    if (rt !== undefined) {
      rt.setLimits(null);
      rt.disarmS2();
    }
  }
}

/** The S2 audit of a trial on this (unpatched) instance: ctx.job { config, solution, audit, checkLimit }. */
function runAudit(ctx) {
  const SG = ctx.SG;
  try {
    const result = F.auditS2(SG, ctx.job);
    ctx.post({ type: 'audit-result', audit: result });
  } catch (err) {
    ctx.post({ type: 'error', error: ctx.failure(err) });
  }
}

/** A plain pipeline run (the parity partner of an unpatched run): a pass-through budget when the job says so. */
function runParity(ctx) {
  const SG = ctx.SG;
  try {
    const budget = ctx.job.withBudget === true ? PASS_THROUGH : null;
    const result = SG.pipeline.run(ctx.job.config, null, budget);
    ctx.post({ type: 'decision', wire: SG.pipeline.toWire(result), engineElapsedMs: 0 });
  } catch (err) {
    ctx.post({ type: 'error', error: ctx.failure(err) });
  }
}

/** The synthetic engine tests of the first command (frontier-test.cjs): ctx.job { suite }. */
function runSynthetic(ctx) {
  try {
    const results = require('./frontier-test.cjs').engineSynthetic({ SG: ctx.SG, post: ctx.post });
    ctx.post({ type: 'decision', wire: null, results: results, engineElapsedMs: 0 });
  } catch (err) {
    ctx.post({ type: 'error', error: ctx.failure(err) });
  }
}

function handle(ctx) {
  const kind = ctx.job.kind;
  if (kind === 'ig04-trial') return runTrial(ctx);
  if (kind === 'ig04-audit') return runAudit(ctx);
  if (kind === 'ig04-parity') return runParity(ctx);
  if (kind === 'ig04-synthetic') return runSynthetic(ctx);
  return ctx.post({ type: 'fatal', error: { code: 'job-kind', name: null, message: 'unknown IG-S04 job kind ' + kind } });
}

module.exports = { handle, runTrial, runAudit, runParity, runSynthetic, limitsFor, wireOf, PASS_THROUGH };
