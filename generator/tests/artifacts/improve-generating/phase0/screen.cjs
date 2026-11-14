'use strict';

/*
 * The grid trial of the SM2 screen (IG-S05, test side, provisional (pre-freeze)).
 *
 * One trial = ONE grid (the native model and full grid of the request seed: forks `model` and `grid#1`) and up to two
 * samples of the native forks `dig#1.1` and `dig#1.2` in one of the eight modes of IG-S04:
 *   proposal-only / ordinary-only   the native `digLevel` sample of that kind, BOTH samples of the kind, sharing the
 *                                   native attempt caps and the native keeper (as one attempt of `generateAttempts`);
 *   F0 F1 FC FM FU FS               the frontier sample of frontier.cjs (unchanged), each sample with its own fresh
 *                                   count budget (the frozen per-cell vector of IG-S04, never retuned).
 * Stopping is the native one: the first exact sample (or an exact keeper candidate) ends the trial and the later ordinals
 * are recorded as skipped-first-exact; a failed independent check is a correctness stop of the harness and never a
 * reason to try another sample. There is no local-search continuation here. The independent verifier and the canonical
 * classification of the parent run after the timed interval (ig05-run.cjs) and never steer generation.
 *
 * The engine pieces come in through `ctx.SG` and `ctx.rt` exactly as in frontier.cjs, so the control flow is tested with
 * the scripted fake engine of frontier-test.cjs as well as on the real one.
 */
const C = require('./common.cjs');
const F = require('./frontier.cjs');

const HarnessError = C.HarnessError;

const SAMPLES_MAX = 2;
const SKIP_REASONS = Object.freeze(['first-exact', 'first-exact-keeper', 'caps-exhausted']);

function sampleFork(ordinal) {
  return 'dig#1.' + ordinal;
}

function finiteOrNull(x) {
  return typeof x === 'number' && Number.isFinite(x) ? x : null;
}

/** exact | shallow | below | above | unrated, from the native quality of a rating (the native tie and band rules). */
function outcomeClass(SG, D, rating, spec, level, model) {
  if (!rating || rating.solved !== true || rating.level === null || rating.level === undefined) return 'unrated';
  const q = D.qualityOf(rating, spec, level, model);
  if (q === 0) return 'exact';
  if (q === D.SHALLOW_QUALITY) return 'shallow';
  if (q === Infinity) return 'unrated';
  return SG.difficulty.levelIndex(rating.level) < SG.difficulty.levelIndex(level) ? 'below' : 'above';
}

function bestView(best, D) {
  if (best === null || best === undefined) return null;
  return {
    source: best.source,
    quality: finiteOrNull(best.quality),
    exact: best.exact === true,
    uniqueness: best.uniqueness,
    level: best.rating ? best.rating.level : null,
    score: best.rating ? best.rating.score : null,
    solved: best.rating ? best.rating.solved : null,
    hardestTechnique: best.rating ? best.rating.hardestTechnique : null,
    entry: best.entry === undefined ? null : best.entry,
    clues: Array.from(best.givens).filter(function (v) { return v !== 0; }).length,
    puzzleHash: F.hashGivens(best.givens)
  };
}

function skippedFrom(firstSkipped, reason, max) {
  const rows = [];
  for (let t = firstSkipped; t <= max; t++) rows.push({ ordinal: t, fork: sampleFork(t), status: 'skipped', reason: reason });
  return rows;
}

function digTriesOf(SG, D, model, cfg) {
  const groups = SG.symmetry.groups(model, cfg.symmetry);
  return groups.some(function (g) { return g.length > 2; }) ? D.DEFAULT_DIG_TRIES_COARSE : D.DEFAULT_DIG_TRIES;
}

// --- the native samples of one kind --------------------------------------------------------------------------------

/**
 * Up to `samplesMax` native samples of one kind on one grid, with the loop of `generateAttempts` for attempt 1: one caps
 * object and one keeper for the attempt, a later sample is not started once the keeper is exact or the caps are used
 * up, and the first exact sample ends the loop. The closest candidate is chosen as the native run chooses it: the best
 * sample (a strict improvement is needed), then the keeper when it is strictly closer. No local search follows.
 */
function runNativeSamples(ctx) {
  const SG = ctx.SG;
  const rt = ctx.rt;
  const D = rt.digger;
  const model = ctx.model;
  const spec = ctx.spec;
  const level = ctx.level;
  const cfg = ctx.cfg;
  const budget = ctx.budget;
  const now = ctx.now || function () { return performance.now(); };
  const max = ctx.samplesMax === undefined ? SAMPLES_MAX : ctx.samplesMax;
  const proposal = ctx.mode.proposal === true;
  const caps = D.newCaps({});
  const keeper = D.createKeeper(spec, level, budget);
  const em = SG.events.toEmitter(null);
  const stage = SG.digger.createStageSteps(em, { budget: budget, cooperative: false });
  const digTries = digTriesOf(SG, D, model, cfg);
  const base = {
    symmetry: cfg.symmetry, order: cfg.digOrder, maxAttempts: cfg.maxAttempts, budget: budget, emit: em, stage: stage,
    cooperative: false, postGenerate: null, strategy: SG.digger.getStrategy('cells'), strategyId: 'cells', spec: spec,
    keeper: keeper, caps: caps
  };
  const samples = [];
  let skipped = [];
  let bestPuzzle = null;
  let bestQuality = Infinity;
  let bestOrdinal = null;
  let firstExact = null;
  let ratingsBefore = 0;
  let proposalsBefore = 0;
  for (let t = 1; t <= max; t++) {
    if (t > 1 && keeper.distance === 0) {
      skipped = skippedFrom(t, 'first-exact-keeper', max);
      break;
    }
    if (t > 1 && D.capsExhausted(caps)) {
      skipped = skippedFrom(t, 'caps-exhausted', max);
      break;
    }
    const fork = sampleFork(t);
    ctx.onSampleStart({ ordinal: t, fork: fork, kind: proposal ? 'proposal' : 'ordinary' });
    rt.reset();
    rt.setPurpose('native');
    const t0 = now();
    let puzzle;
    try {
      puzzle = SG.digger.digLevel(model, ctx.solution, level, ctx.rng.fork(fork), Object.assign({}, base, {
        where: { attempt: 1, maxAttempts: cfg.maxAttempts, sample: t, maxSamples: digTries }, proposal: proposal }));
    } finally {
      rt.setPurpose('other');
    }
    const wallMs = now() - t0;
    const quality = D.qualityOf(puzzle.rating, spec, level, puzzle.model);
    const engine = rt.countersOf();
    const row = {
      ordinal: t, fork: fork, kind: proposal ? 'proposal' : 'ordinary', status: 'complete', engineMs: wallMs,
      quality: finiteOrNull(quality), class: outcomeClass(SG, D, puzzle.rating, spec, level, puzzle.model),
      claimedExact: puzzle.exact === true, unsound: puzzle.unsound === true, clues: puzzle.clues,
      level: puzzle.rating.level, score: puzzle.rating.score, solved: puzzle.rating.solved,
      hardestTechnique: puzzle.rating.hardestTechnique, puzzleHash: F.hashGivens(puzzle.givens), stats: puzzle.stats,
      uniqueness: 'secureUniqueness',
      // the caps are one object for the attempt: cumulative after this sample; the counts below are this sample's own
      capsAfter: { ratings: caps.ratings, proposals: caps.proposals },
      keeper: { distance: finiteOrNull(keeper.distance), held: keeper.best !== null },
      counts: { solverChecks: engine.solverChecks, dfsEntries: engine.dfsEntries, dfsChecks: engine.dfsChecks,
        canonicalRatings: caps.ratings - ratingsBefore, proposals: caps.proposals - proposalsBefore },
      engine: engine, purposes: rt.snapshot().by, budgetStop: null
    };
    ratingsBefore = caps.ratings;
    proposalsBefore = caps.proposals;
    samples.push(row);
    ctx.onSampleEnd(row);
    if (bestPuzzle === null || quality < bestQuality) {
      bestPuzzle = puzzle;
      bestQuality = quality;
      bestOrdinal = t;
    }
    if (puzzle.exact === true) {
      firstExact = { ordinal: t, origin: 'sample', source: 'sample' };
      skipped = skippedFrom(t + 1, 'first-exact', max);
      break;
    }
  }
  let chosen = bestPuzzle;
  let source = 'sample';
  if (keeper.best !== null && keeper.distance < bestQuality) {
    chosen = D.keptPuzzle(keeper.best, level);
    source = 'keeper';
    bestQuality = keeper.distance;
    if (firstExact === null && chosen.exact === true) {
      const last = samples[samples.length - 1];
      firstExact = { ordinal: last.ordinal, origin: 'sample', source: 'keeper' };
    }
  }
  const best = {
    givens: chosen.givens, model: chosen.model, rating: chosen.rating, source: source, quality: bestQuality,
    exact: chosen.exact === true, uniqueness: source === 'keeper' ? 'dfs-count' : 'secureUniqueness', log: chosen.log,
    entry: null
  };
  return {
    kind: 'native', status: 'complete', samples: samples, skipped: skipped, best: best, bestOrdinal: bestOrdinal,
    caps: D.copyWork([caps]), firstExact: firstExact, parentInputs: [], digTries: digTries,
    nativeCaps: { ratings: caps.ratings, proposals: caps.proposals, maxRatings: caps.maxRatings,
      maxProposals: caps.maxProposals }
  };
}

// --- the frontier samples ------------------------------------------------------------------------------------------

/**
 * Up to `samplesMax` frontier samples on one grid, ordinal t on the root fork `dig#1.t`, each with the frozen count
 * budget (`ctx.limits`) and its own fresh counters. A later sample is not started once the best candidate is exact. A
 * sample that stops on its count budget is a distinct outcome of that sample (never a hit, never an error) and the trial
 * goes on to the next ordinal; the best complete candidate of the trial is the native one (strictly better replaces).
 */
function runFrontierSamples(ctx) {
  const SG = ctx.SG;
  const rt = ctx.rt;
  const D = rt.digger;
  const now = ctx.now || function () { return performance.now(); };
  const max = ctx.samplesMax === undefined ? SAMPLES_MAX : ctx.samplesMax;
  const samples = [];
  const parentInputs = [];
  let skipped = [];
  let best = null;
  let bestOrdinal = null;
  let bestCaps = null;
  let firstExact = null;
  for (let t = 1; t <= max; t++) {
    if (t > 1 && best !== null && best.exact === true) {
      skipped = skippedFrom(t, 'first-exact', max);
      break;
    }
    const fork = sampleFork(t);
    ctx.onSampleStart({ ordinal: t, fork: fork, kind: 'frontier' });
    rt.reset();
    const t0 = now();
    const result = F.runFrontier({ SG: SG, rt: rt, model: ctx.model, solution: ctx.solution, spec: ctx.spec,
      level: ctx.level, cfg: ctx.cfg, rng: ctx.rng.fork(fork), variant: ctx.mode, budget: ctx.budget,
      limits: ctx.limits, testOnly: ctx.testOnly || null, progress: ctx.progress });
    const wallMs = now() - t0;
    const sampleBest = result.best;
    const row = {
      ordinal: t, fork: fork, kind: 'frontier', status: result.status, engineMs: wallMs,
      budgetStop: result.budgetStop === undefined ? null : result.budgetStop,
      claimedExact: sampleBest !== null && sampleBest.exact === true,
      class: sampleBest === null ? null : (sampleBest.source === 'fallback' ? 'fallback' :
        outcomeClass(SG, D, sampleBest.rating, ctx.spec, ctx.level, ctx.model)),
      best: bestView(sampleBest, D), fallback: result.fallback, counts: result.counts, engine: rt.countersOf(),
      purposes: rt.snapshot().by, frontier: result.detail,
      parent: result.audit ? { hash: result.audit.finalParentHash, clues: result.detail.finalClues,
        removedGroups: result.audit.removals.length } : null,
      caps: result.caps && result.caps.length > 0 ? { ratings: result.caps[0].ratings, proposals: result.caps[0].proposals } :
        null
    };
    samples.push(row);
    if (result.audit) {
      parentInputs.push({ ordinal: t, hash: result.audit.finalParentHash, clues: result.detail.finalClues,
        removedGroups: result.audit.removals.map(function (r) { return r[0]; }) });
    }
    ctx.onSampleEnd(row);
    if (sampleBest !== null && (best === null || sampleBest.quality < best.quality)) {
      best = sampleBest;
      bestOrdinal = t;
      bestCaps = result.caps;
    }
    if (sampleBest !== null && sampleBest.exact === true && firstExact === null) {
      firstExact = { ordinal: t, origin: 'sample', source: 'sample' };
    }
  }
  return {
    kind: 'frontier', status: trialStatus(samples, best), samples: samples, skipped: skipped, best: best,
    bestOrdinal: bestOrdinal, caps: bestCaps, firstExact: firstExact, parentInputs: parentInputs,
    digTries: digTriesOf(SG, D, ctx.model, ctx.cfg), nativeCaps: null
  };
}

/** `sample-budget` only for a trial that ends without an exact candidate and had a sample stopped by its count budget. */
function trialStatus(samples, best) {
  if (best !== null && best.exact === true) return 'complete';
  return samples.some(function (s) { return s.status === 'sample-budget'; }) ? 'sample-budget' : 'complete';
}

/**
 * The two-sample trial of a mode. ctx: SG, rt, model, solution, spec, level, cfg, rng (the request root: forks `dig#1.t`
 * are taken here), mode (an entry of F.MODES), budget, limits (the frozen vector for a frontier mode, null for a native
 * one), progress, onSampleStart, onSampleEnd, samplesMax (default 2).
 */
function runScreenTrial(ctx) {
  if (ctx.mode === undefined || ctx.mode === null) throw new HarnessError('plan-missing', 'no mode');
  const out = Object.assign({ onSampleStart: function () {}, onSampleEnd: function () {} }, ctx);
  if (out.samplesMax !== undefined && !(out.samplesMax >= 1 && out.samplesMax <= SAMPLES_MAX)) {
    throw new HarnessError('plan-missing', 'at most ' + SAMPLES_MAX + ' samples per grid');
  }
  return ctx.mode.kind === 'native' ? runNativeSamples(out) : runFrontierSamples(out);
}

// --- the post-timing canonical classification of the final phase A parent -----------------------------------------------

const CLASSES = Object.freeze(['exact', 'shallow', 'below', 'above', 'incomplete', 'ambiguous', 'unknown']);

function classOfParent(row, SG, level) {
  if (row.unique === false) return 'ambiguous';
  if (row.unique === null || row.rating === null) return 'unknown';
  if (row.rating.solved !== true || row.rating.level === null || row.rating.level === undefined) return 'incomplete';
  if (row.rating.level === level) {
    if (row.required === null) return 'unknown';
    return row.required === true ? 'exact' : 'shallow';
  }
  return SG.difficulty.levelIndex(row.rating.level) < SG.difficulty.levelIndex(level) ? 'below' : 'above';
}

/**
 * Canonical classification of the final phase A parents of a trial, on an unpatched engine instance, outside every timed
 * interval: the parent is rebuilt from the full grid and the removed groups, its hash must equal the one the trial
 * recorded (a mismatch is a correctness stop for the caller), its solution count is checked by the independent DFS and its
 * rating is the untouched canonical one. The result never steers generation and never counts as a hit.
 * input: { config, solution (array), parents: [{ ordinal, hash, clues, removedGroups }], ms }.
 */
function classifyParents(SG, input) {
  const cfg = SG.pipeline.normalizeConfig(input.config);
  const def = SG.variants.get(cfg.variantId);
  const model = def.build(cfg.variantOptions, SG.rng.create(cfg.seed).fork('model'));
  const groups = SG.symmetry.groups(model, cfg.symmetry);
  const solution = Int32Array.from(input.solution);
  const level = cfg.difficulty;
  const ms = input.ms || 10000;
  return input.parents.map(function (p) {
    const parent = Int32Array.from(solution);
    p.removedGroups.forEach(function (gi) {
      const g = groups[gi];
      if (!g) throw new HarnessError('parent-mismatch', 'the trial names the symmetry group ' + gi + ', which does not exist');
      for (let k = 0; k < g.length; k++) parent[g[k]] = 0;
    });
    const hash = F.hashGivens(parent);
    const row = { ordinal: p.ordinal, hash: hash, expectedHash: p.hash, hashMatches: hash === p.hash,
      clues: Array.from(parent).filter(function (v) { return v !== 0; }).length, status: 'classified',
      solutionCount: null, unique: null, rating: null, required: null, vacuous: null, class: null, errors: [] };
    if (!row.hashMatches) {
      row.status = 'hash-mismatch';
      return row;
    }
    const budget = function () { return SG.budget.create({ ms: ms }); };
    try {
      const count = SG.dfs.countSolutions(model, parent, 2, budget());
      row.solutionCount = count;
      row.unique = count === 1 ? true : (count === 0 || count === 2 ? false : null);
    } catch (err) {
      row.errors.push('unique: ' + (err && err.code ? err.code + ' ' : '') + String(err && err.message !== undefined ?
        err.message : err));
    }
    try {
      const fresh = SG.difficulty.rate(model, parent, { budget: budget() });
      row.rating = { solved: fresh.solved === true, level: fresh.level === undefined ? null : fresh.level,
        score: fresh.score === undefined ? null : fresh.score,
        hardestTechnique: fresh.hardestTechnique === undefined ? null : fresh.hardestTechnique };
      const required = SG.difficulty.requiredOf(fresh, level, model);
      row.required = required === null ? null : required.required === true;
      row.vacuous = required === null ? null : required.vacuous === true;
    } catch (err) {
      row.errors.push('rating: ' + (err && err.code ? err.code + ' ' : '') + String(err && err.message !== undefined ?
        err.message : err));
    }
    row.class = classOfParent(row, SG, level);
    return row;
  });
}

module.exports = {
  SAMPLES_MAX, SKIP_REASONS, CLASSES, sampleFork, outcomeClass, bestView, skippedFrom, digTriesOf, runNativeSamples,
  runFrontierSamples, runScreenTrial, trialStatus, classifyParents, classOfParent
};
