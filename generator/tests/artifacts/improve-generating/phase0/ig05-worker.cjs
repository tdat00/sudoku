'use strict';

/*
 * Worker side of IG-S05 (test side, provisional (pre-freeze)): one grid trial of the SM2 screen on the private patched
 * engine instance of this worker thread (adapter `frontier-hooks`, the reference solver), the post-timing canonical
 * classification of the final phase A parents on an unpatched instance, and the unmeasured synthetic engine tests. The
 * dispatch is a single line of worker.cjs: every job kind that starts with `ig05-` is handled here.
 *
 * A trial builds the native model and full grid of the request seed (forks `model` and `grid#1`), reports the grid
 * (`grid-built`, so the host can stamp its wall and CPU), then runs up to two samples of the native forks `dig#1.1` and
 * `dig#1.2` on that one grid (screen.cjs). It posts `sample-start` / `sample-end` around every sample (the host stamps them:
 * per-sample wall and CPU, and the per-sample guard), `progress` at the phase boundaries of a frontier sample and finally
 * `decision` with the wire of the closest complete candidate of the trial (the fully given fallback at worst for a frontier
 * mode), the plain trial details, the full grid and the parent descriptors for the post-timing classification.
 */
const C = require('./common.cjs');
const F = require('./frontier.cjs');
const S = require('./screen.cjs');
const W04 = require('./ig04-worker.cjs');

const PASS_THROUGH = W04.PASS_THROUGH;

/** The trial of a job: ctx { SG, job: { config, trial: { mode, samples, limits? } }, post, failure }. */
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
    const D = rt.digger;
    const info = { groups: groups.length, cells: model.cellCount, digits: model.digits, gridHash: F.hashGivens(solution),
      nativeConstants: { CAP_RATINGS: D.CAP_RATINGS, CAP_PROPOSALS: D.CAP_PROPOSALS, OBJECTIVE_STEPS: D.OBJECTIVE_STEPS,
        UNIQUE_NODES: D.UNIQUE_NODES, DEFAULT_DIG_TRIES: D.DEFAULT_DIG_TRIES,
        DEFAULT_DIG_TRIES_COARSE: D.DEFAULT_DIG_TRIES_COARSE } };
    post({ type: 'grid-built', wallMs: gridWallMs, counters: gridCounters, stats: gridStats, info: info });
    rt.reset();

    const out = { mode: mode.id, kind: mode.kind, cell: cfg.variantId, seed: cfg.seed, groups: info.groups, cells: info.cells,
      digits: info.digits, nativeConstants: info.nativeConstants, gridHash: info.gridHash, gridStats: gridStats,
      gridBuild: { wallMs: gridWallMs, counters: gridCounters }, samplesPlanned: trial.samples };
    let limits = null;
    if (mode.kind === 'frontier') {
      const lim = W04.limitsFor(rt, model, groups.length, trial);
      limits = lim.limits;
      out.limits = lim.limits;
      out.ceilings = lim.ceilings;
      out.limitOrigin = lim.origin;
    } else {
      out.limits = null;
      out.limitOrigin = 'native guards and caps (CAP_RATINGS, CAP_PROPOSALS, UNIQUE_NODES, OBJECTIVE_STEPS), shared by both ' +
        'samples as one attempt; no count budget';
    }
    const result = S.runScreenTrial({ SG: SG, rt: rt, model: model, solution: solution, spec: spec, level: level, cfg: cfg,
      rng: rng, mode: mode, budget: PASS_THROUGH, limits: limits, progress: post, samplesMax: trial.samples,
      testOnly: trial.testOnly || null,
      onSampleStart: function (s) { post({ type: 'sample-start', ordinal: s.ordinal, fork: s.fork, kind: s.kind }); },
      onSampleEnd: function (row) {
        post({ type: 'sample-end', ordinal: row.ordinal, status: row.status, claimedExact: row.claimedExact === true,
          engineMs: row.engineMs, class: row.class });
      } });

    out.status = result.status;
    out.samples = result.samples;
    out.skipped = result.skipped;
    out.firstExact = result.firstExact;
    out.bestOrdinal = result.bestOrdinal;
    out.digTries = result.digTries;
    out.nativeCaps = result.nativeCaps;
    out.performanceScope = mode.kind === 'frontier' ? (mode.s2 ? 'minimal S2 early-exit prototype: no initial-state cache, ' +
      'no reuse of parent eliminations; it shortens accepted tests only' : 'S2 off: every accepted test is a full floor solve') :
      'the native sample, unchanged';
    out.forkLabels = ['model', 'grid#1'].concat(result.samples.map(function (s) { return s.fork; }),
      result.skipped.map(function (s) { return s.fork + ' (skipped: ' + s.reason + ')'; }));
    out.best = S.bestView(result.best, D);
    out.bestSource = result.best === null ? null : result.best.source;
    const wire = result.best === null ? null : W04.wireOf(SG, cfg, solution, model, result.best, result.caps);
    out.engineMs = performance.now() - started;
    post({ type: 'decision', wire: wire, engineElapsedMs: out.engineMs, trial: out, solution: Array.from(solution),
      parentInputs: result.parentInputs });
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

/** The classification of the final phase A parents of a trial on this (unpatched) instance. ctx.job: see screen.cjs. */
function runParent(ctx) {
  try {
    ctx.post({ type: 'parent-result', parents: S.classifyParents(ctx.SG, ctx.job) });
  } catch (err) {
    ctx.post({ type: 'error', error: ctx.failure(err) });
  }
}

/** The synthetic engine tests of the first command (ig05-test.cjs): the patched instance. */
function runSynthetic(ctx) {
  try {
    const results = require('./ig05-test.cjs').engineSynthetic({ SG: ctx.SG, post: ctx.post });
    ctx.post({ type: 'decision', wire: null, results: results, engineElapsedMs: 0 });
  } catch (err) {
    ctx.post({ type: 'error', error: ctx.failure(err) });
  }
}

/** The synthetic engine tests that need an unpatched instance (the classifier). */
function runSyntheticVerify(ctx) {
  try {
    const results = require('./ig05-test.cjs').engineSyntheticVerify({ SG: ctx.SG, post: ctx.post });
    ctx.post({ type: 'decision', wire: null, results: results, engineElapsedMs: 0 });
  } catch (err) {
    ctx.post({ type: 'error', error: ctx.failure(err) });
  }
}

function handle(ctx) {
  const kind = ctx.job.kind;
  if (kind === 'ig05-trial') return runTrial(ctx);
  if (kind === 'ig05-parent') return runParent(ctx);
  if (kind === 'ig05-synthetic') return runSynthetic(ctx);
  if (kind === 'ig05-synthetic-verify') return runSyntheticVerify(ctx);
  return ctx.post({ type: 'fatal', error: { code: 'job-kind', name: null, message: 'unknown IG-S05 job kind ' + kind } });
}

module.exports = { handle, runTrial, runParent, runSynthetic, runSyntheticVerify };
