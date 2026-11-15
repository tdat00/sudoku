'use strict';

/*
 * Worker side of IG-S09 (test side, provisional (pre-freeze)): the captured Greater-Than request of either arm and the post-timing
 * diagnosis in an unpatched instance. The dispatch is a single line of worker.cjs: every job kind that starts with `ig09-` is
 * handled here.
 *
 *   ig09-g0-request / ig09-g1-request   the native `SG.pipeline.run(config, null)` of worker.cjs on an instance that carries the
 *     adapter `gt-diagnostic`; the capture runtime is published as `SG.__igGt` for exactly that call and removed in a `finally`.
 *     G0 keeps the native order of the oracle, G1 solves first in the first technique pass of a sample (greater-than-diagnostic.cjs).
 *     The capture is posted as its own message (`ig09-capture`) before the decision, like the profile of IG-S07; the time to build
 *     and post it is measured and reported.
 *   ig09-diagnose   an unpatched verifier instance after the timed interval: the independent canonical re-rating of the dug samples,
 *     the uniqueness and the sign-minimality proof of the samples that satisfy the cheap clauses (clue floor, below the band), and
 *     the setup probes of the first missed sample. Rows are posted as they finish, so a host that ends the worker at its budget
 *     keeps what was done; what was not reached is unstarted, never assumed.
 */
const C = require('./common.cjs');
const G = require('./greater-than-diagnostic.cjs');

function techniqueAssumes(SG) {
  return function (id) {
    try {
      return SG.techniques.get(id).assumesUniqueness === true;
    } catch (err) {
      return null;
    }
  };
}

// --- the captured request ------------------------------------------------------------------------------------------------------

function runRequest(ctx, arm) {
  const SG = ctx.SG;
  if (SG.__igGt !== undefined) {
    ctx.post({ type: 'fatal', error: { code: 'unsupported-source', name: null, message: 'a capture runtime is already installed' } });
    return;
  }
  const rt = G.createRuntime({ arm: arm, techniqueAssumes: techniqueAssumes(SG) });
  SG.__igGt = rt.api;
  let result = null;
  let error = null;
  let t0 = null;
  let t1 = null;
  try {
    t0 = performance.now();
    try {
      result = SG.pipeline.run(ctx.job.config, null);
    } catch (err) {
      error = err;
    }
    t1 = performance.now();
  } finally {
    delete SG.__igGt;
  }
  const runMs = t1 - t0;
  const wire = error === null ? SG.pipeline.toWire(result) : null;
  const b0 = performance.now();
  const capture = rt.api.finish();
  const buildMs = performance.now() - b0;
  ctx.post({ type: 'ig09-capture', arm: arm, capture: capture, runMs: runMs, ok: error === null,
    restore: { removed: SG.__igGt === undefined }, captureBuildMs: buildMs, runError: error ? ctx.failure(error) : null });
  if (error !== null) {
    ctx.post({ type: 'error', error: ctx.failure(error), engineElapsedMs: runMs });
    return;
  }
  ctx.post({ type: 'decision', wire: wire, engineElapsedMs: runMs });
}

// --- the post-timing diagnosis -------------------------------------------------------------------------------------------------

function capSlice(cap) {
  const state = { used: 0 };
  const slice = {
    tick: function () {},
    check: function () {
      if (++state.used > cap) {
        const trip = new Error('node slice used up');
        trip.ig09cap = true;
        throw trip;
      }
    }
  };
  return { slice: slice, state: state };
}

/** Number of solutions (1, or 2 for "two or more") inside a node slice; null when the slice ran out first. */
function countCapped(SG, model, givens, cap) {
  const s = capSlice(cap);
  try {
    return { count: SG.dfs.countSolutions(model, givens, 2, s.slice), nodes: s.state.used };
  } catch (err) {
    if (err && err.ig09cap === true) return { count: null, nodes: s.state.used };
    throw err;
  }
}

function summaryOf(rating, digest) {
  return { solved: rating.solved === true, level: rating.level, score: rating.score, hardestTechnique: rating.hardestTechnique,
    digest: digest };
}

function minimality(SG, base, signsText, givens) {
  const signs = G.decodeSigns(signsText);
  const parts = [];
  let unique = null;
  const model = SG.greaterThan.withSigns(base, signs);
  const whole = countCapped(SG, model, givens, G.MINIMAL_NODE_CAP);
  unique = whole.count === null ? null : whole.count === 1;
  if (unique !== true) {
    return { status: unique === false ? 'not-unique' : 'unknown', minimal: unique === false ? false : null, unique: unique,
      signs: signs.length, necessary: 0, unknown: unique === null ? 1 : 0, redundantFirst: null, nodes: whole.nodes };
  }
  let nodes = whole.nodes;
  for (let i = 0; i < signs.length; i++) {
    const rest = signs.slice(0, i).concat(signs.slice(i + 1));
    const r = countCapped(SG, SG.greaterThan.withSigns(base, rest), givens, G.MINIMAL_NODE_CAP);
    nodes += r.nodes;
    parts.push(r.count);
    if (r.count === 1) break;
  }
  const verdict = G.judgeMinimality(parts);
  return { status: verdict.status, minimal: verdict.minimal, unique: true, signs: signs.length, necessary: verdict.necessary,
    unknown: verdict.unknown, redundantFirst: verdict.redundantFirst, checked: parts.length, nodes: nodes };
}

function runSample(SG, base, job, s, budgetMs, started) {
  const t0 = performance.now();
  const row = { ordinal: s.ordinal, ratingStatus: 'error', rating: null, canonicalEqual: null, below: null, unique: null,
    minimalStatus: 'not-required-for-trap', minimal: null, minimalDetail: null, error: null, wallMs: null };
  try {
    const givens = G.decodeGivens(s.givens);
    const model = SG.greaterThan.withSigns(base, G.decodeSigns(s.signs));
    const left = Math.max(1000, budgetMs - (performance.now() - started));
    let rating;
    try {
      rating = SG.difficulty.rate(model, givens, { budget: SG.budget.create({ ms: left }) });
    } catch (err) {
      row.ratingStatus = 'timeout';
      row.error = { code: err && err.code ? err.code : null, message: String(err && err.message ? err.message : err) };
      row.wallMs = performance.now() - t0;
      return row;
    }
    row.ratingStatus = 'ok';
    const digest = C.digestOf(rating);
    row.rating = summaryOf(rating, digest);
    row.canonicalEqual = digest === s.ratingDigest;
    const index = rating.level === null || rating.level === undefined ? -1 : SG.difficulty.levelIndex(rating.level);
    row.below = rating.solved === true && index >= 0 && index < SG.difficulty.levelIndex(job.level);
    // the cheap clauses first: the clue floor (known) and the complete canonical rating below the band
    if (s.floorClause === true && row.below === true && row.canonicalEqual === true) {
      const m = minimality(SG, base, s.signs, givens);
      row.minimalStatus = m.status;
      row.minimal = m.minimal;
      row.unique = m.unique;
      row.minimalDetail = m;
    }
  } catch (err) {
    row.error = { code: err && err.code ? err.code : null, message: String(err && err.message ? err.message : err) };
  }
  row.wallMs = performance.now() - t0;
  return row;
}

function runProbe(SG, base, job, probe, budgetMs, started) {
  const model = SG.greaterThan.withSigns(base, G.decodeSigns(probe.signsAll));
  const parent = G.decodeGivens(probe.parent);
  const spec = SG.difficulty.spec(job.level, model);
  const rows = [];
  probe.groups.forEach(function (g) {
    const row = { phase: g.phase, cells: g.cells, status: 'unstarted', block: null, uniquenessAfterRemoval: null,
      solveAfterRemoval: null, wallMs: null };
    rows.push(row);
    if (performance.now() - started > budgetMs) return;
    const t0 = performance.now();
    row.block = G.ruleBlock(parent, g.cells, model.cellUnits, probe.minClues, probe.minPerUnit);
    const givens = Int32Array.from(parent);
    g.cells.forEach(function (cell) { givens[cell] = 0; });
    try {
      const r = countCapped(SG, model, givens, G.PROBE_NODE_CAP);
      row.uniquenessAfterRemoval = r.count === null ? 'unknown (node cap)' : (r.count === 1 ? 'unique' : 'not-unique');
      row.uniquenessNodes = r.nodes;
      const steps = capSlice(G.PROBE_STEP_CAP);
      try {
        const report = SG.logicalSolver.solve(model, givens, { allowedTechniques: spec.allowedTechniques, collectSteps: false,
          assumeUniqueness: false, budget: steps.slice });
        row.solveAfterRemoval = report.status;
      } catch (err) {
        row.solveAfterRemoval = err && err.ig09cap === true ? 'unknown (step cap)' : 'error';
      }
      row.solveSteps = steps.state.used;
      row.status = 'done';
    } catch (err) {
      row.status = 'error';
      row.error = String(err && err.message ? err.message : err);
    }
    row.wallMs = performance.now() - t0;
  });
  return rows;
}

function runDiagnose(ctx) {
  const SG = ctx.SG;
  const job = ctx.job;
  if (SG.__igHooks !== undefined || SG.__igGt !== undefined) {
    ctx.post({ type: 'fatal', error: { code: 'unsupported-source', name: null, message: 'the diagnosis instance is not native' } });
    return;
  }
  const started = performance.now();
  const base = SG.greaterThan.buildBoard();
  const done = { type: 'ig09-done', stopped: null, rows: 0, unstarted: [], probe: null };
  const budget = job.budgetMs;
  const early = job.samples.filter(function (s) { return s.floorClause === true; });
  const late = job.samples.filter(function (s) { return s.floorClause !== true; });
  let stopped = false;
  const doSamples = function (list) {
    list.forEach(function (s) {
      if (stopped || performance.now() - started > budget) {
        stopped = true;
        done.unstarted.push(s.ordinal);
        return;
      }
      ctx.post({ type: 'ig09-begin', ordinal: s.ordinal });
      ctx.post({ type: 'ig09-row', row: runSample(SG, base, job, s, budget, started) });
      done.rows++;
    });
  };
  try {
    doSamples(early);
    if (job.probe) {
      ctx.post({ type: 'ig09-begin', probe: true, ordinal: job.probe.ordinal });
      ctx.post({ type: 'ig09-probe', ordinal: job.probe.ordinal, rows: runProbe(SG, base, job, job.probe, budget, started) });
      done.probe = 'posted';
    }
    doSamples(late);
  } catch (err) {
    ctx.post({ type: 'error', error: ctx.failure(err) });
    return;
  }
  done.stopped = stopped ? 'budget' : null;
  done.wallMs = performance.now() - started;
  ctx.post(done);
}

function handle(ctx) {
  const kind = ctx.job.kind;
  if (kind === 'ig09-g0-request') return runRequest(ctx, 'g0');
  if (kind === 'ig09-g1-request') return runRequest(ctx, 'g1');
  if (kind === 'ig09-diagnose') return runDiagnose(ctx);
  return ctx.post({ type: 'fatal', error: { code: 'job-kind', name: null, message: 'unknown IG-S09 job kind ' + kind } });
}

module.exports = { handle, runRequest, runDiagnose, runSample, runProbe, minimality, countCapped, capSlice };
