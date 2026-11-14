'use strict';

/*
 * Worker side of the S5a prototype (IG-S02): runs one absolute attempt of a request on the private, patched engine
 * instance of this worker thread (adapter `attempt-pool`) and posts its separate state. The attempt is the native
 * `SG.pipeline.run` of the unchanged request: only the attempt loop of `generateAttempts` is narrowed to the
 * ordinal, and the end-of-attempt merge is replaced by `capture`, which keeps the first-best sample, the local
 * terminal candidate, the keeper (with its ledger of counted offers) and the work apart for the host.
 * Test-only synthetic attempts exist only in a test-only host.
 */
const C = require('./common.cjs');

let modelHashed = false;

function offerDigest(candidate) {
  const model = candidate.model;
  const parts = { givens: Array.from(candidate.givens) };
  if (model.cages && model.cages.length > 0) {
    parts.cages = Array.from(model.cages, function (cage) { return [Array.from(cage.cells), cage.sum]; });
  }
  if (model.inequalities && model.inequalities.length > 0) {
    parts.signs = Array.from(model.inequalities, function (sign) { return [sign.a, sign.b]; });
  }
  return C.digestOf(parts);
}

function createPoolState(SG, job) {
  const state = { attempt: job.attempt, ledger: null, captured: null, hashMs: null };

  function wireOf(candidate, exact, log) {
    return SG.pipeline.toWire({ model: candidate.model, givens: candidate.givens, solution: candidate.solution,
      rating: candidate.rating, exact: exact, seed: 0, config: null, timings: {}, attempts: 0, warnings: [],
      digLog: log, work: undefined });
  }

  function describe(source, distance, exact, wire) {
    return { source: source, distance: distance, exact: exact, wire: wire, digest: C.digestOf({
      structure: C.canonicalize(wire.model), givens: wire.givens, solution: wire.solution, rating: wire.rating,
      log: wire.digLog === undefined ? null : wire.digLog }) };
  }

  state.attachKeeper = function (keeper) {
    const ledger = { offersMet: 0, counted: [] };
    keeper.igLedger = {
      met: function () { ledger.offersMet++; },
      counted: function (candidate, distance, count) {
        ledger.counted.push({ ordinal: ledger.offersMet, distance: distance, count: count,
          provesUniqueness: SG.difficulty.provesUniqueness(candidate.rating), digest: offerDigest(candidate) });
      }
    };
    state.ledger = ledger;
  };

  state.capture = function (a) {
    const keeper = a.keeper;
    const best = a.attemptBest;
    if (!best || !state.ledger) throw new Error('attempt ' + a.attempt + ' reached its end without a sample or ledger');
    const firstBest = describe('sample', a.attemptDistance, best.exact === true,
      wireOf(best, best.exact === true, best.log));
    let searched = null;
    if (a.searched !== null) {
      searched = describe('search', a.searchedDistance, a.searched.exact === true,
        wireOf(a.searched, a.searched.exact === true, a.searched.log));
      searched.unsound = a.searched.unsound === true;
    }
    let kept = null;
    if (keeper.best !== null) {
      const accepted = state.ledger.counted.filter(function (o) { return o.count === 1; });
      if (accepted.length === 0) throw new Error('the keeper holds a candidate that its ledger never counted');
      kept = describe('keeper', keeper.distance, keeper.distance === 0,
        wireOf(keeper.best, keeper.distance === 0, keeper.best.log));
      kept.ordinal = accepted[accepted.length - 1].ordinal;
    }
    let modelHash = null;
    if (!modelHashed) {
      const t0 = performance.now();
      const base = SG.pipeline.toWire({ model: a.model, givens: [], solution: [], rating: null, exact: false,
        seed: 0, config: null, timings: {}, attempts: 0, warnings: [], digLog: undefined, work: undefined }).model;
      modelHash = C.digestOf(base);
      state.hashMs = performance.now() - t0;
      modelHashed = true;
    }
    state.captured = {
      attempt: a.attempt,
      meta: { modelHash: modelHash, hashMs: state.hashMs },
      samples: { count: a.samples, unsound: a.unsound === true, firstBest: firstBest },
      searched: searched,
      keeper: { offersMet: state.ledger.offersMet, counted: state.ledger.counted, best: kept,
        localDistance: keeper.distance, localUnsound: keeper.unsound === true },
      work: SG.digger.copyWork([a.caps])[0]
    };
    // The pipeline needs a puzzle to finish its step events: the attempt's first-best sample stands in for it.
    return { model: best.model, givens: best.givens, solution: best.solution, clues: best.clues,
      achieved: best.achieved, rating: best.rating, exact: best.exact === true, attempts: 1, samples: a.samples,
      warnings: [], stats: best.stats, log: best.log, work: SG.digger.copyWork([a.caps]) };
  };
  return state;
}

/** One attempt: ctx { SG, job: { attempt, config }, post, failure }. */
function run(ctx) {
  const SG = ctx.SG;
  const job = ctx.job;
  const pool = createPoolState(SG, job);
  SG.__igPool = pool;
  let result = null;
  let error = null;
  const started = performance.now();
  try {
    result = SG.pipeline.run(job.config, null);
  } catch (err) {
    error = err;
  } finally {
    delete SG.__igPool;
  }
  const elapsed = performance.now() - started;
  if (error) {
    ctx.post({ type: 'attempt-error', attempt: job.attempt, engineElapsedMs: elapsed, error: ctx.failure(error) });
    return;
  }
  if (pool.captured === null) {
    ctx.post({ type: 'attempt-error', attempt: job.attempt, engineElapsedMs: elapsed, error: {
      code: 'attempt-not-captured', name: null,
      message: 'the engine instance did not run the attempt adapter (unpatched source?)', work: null } });
    return;
  }
  const state = pool.captured;
  state.meta.config = result.config;
  state.meta.seed = result.seed;
  state.meta.timings = result.timings;
  state.meta.engineElapsedMs = elapsed;
  ctx.post({ type: 'attempt-result', attempt: job.attempt, state: state });
}

/** Test-only attempt: spins `spinMs`, then answers with the scripted state or error (or never, when busy). */
function syntheticAttempt(job, post) {
  const script = job.script || {};
  if (script.busy) {
    post({ type: 'busy-started', attempt: job.attempt });
    let x = 0;
    for (;;) x = (x + 1) | 0;
  }
  const until = performance.now() + (script.spinMs || 0);
  let x = 0;
  while (performance.now() < until) x = (x + 1) | 0;
  if (script.error) post({ type: 'attempt-error', attempt: job.attempt, error: script.error });
  else post({ type: 'attempt-result', attempt: job.attempt, state: script.state, spinProof: x !== undefined });
}

module.exports = { run, syntheticAttempt, createPoolState, offerDigest };
