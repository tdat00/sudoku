'use strict';

/*
 * S5a prototype of IG-S02: independent attempts of one request on up to four workers, consumed in native order.
 *
 *  - `SerialMerge` is the pure heart: it consumes per-attempt states (first-best sample, keeper ledger, local terminal
 *    candidate, work) in attempt order and reproduces what the serial `generateAttempts` end-of-attempt merge does,
 *    including the running keeper threshold, first-strictly-better, sample/keeper/search precedence and the earliest
 *    exact stopping boundary. It never takes a generic minimum over worker results.
 *  - `runAttemptPool` schedules the attempts on `min(4, A)` worker threads of one request host (the Host of host.cjs:
 *    guards, CPU read once at the host, termination), consumes them as they complete, decides at the earliest exact
 *    boundary, terminates the speculative rest and accounts the whole interval (CPU includes speculation and cleanup).
 *  - `identityReport` compares a native-w1 record with its attempts-w4 mate on every promised identity field.
 * Everything is provisional (pre-freeze). A merge difference or a keeper replay that cannot be explained is a
 * correctness stop (HarnessError 'merge-unexplained'), never a speed trade-off.
 */
const C = require('./common.cjs');
const H = require('./host.cjs');

const HarnessError = C.HarnessError;

const POOL_WIDTH = 4;

function isNumber(x) {
  return typeof x === 'number' && !Number.isNaN(x);
}

function unexplained(message, details) {
  return new HarnessError('merge-unexplained', message, details);
}

/** A distance for a record: JSON has no infinity, so an unrated or incomplete candidate is null. */
function distanceJson(d) {
  return isNumber(d) && Number.isFinite(d) ? d : null;
}

// --- the serial merge ---------------------------------------------------------------------------------------------

/**
 * One attempt state (from the worker, see attempt-worker.cjs):
 *   attempt, meta { config, seed, timings, modelHash, buildModelMs },
 *   samples { count, unsound, firstBest { source, distance, exact, digest, wire } },
 *   searched null | { source, distance, exact, digest, wire },
 *   keeper { offersMet, counted [ { ordinal, distance, count, provesUniqueness, digest } ],
 *            best null | { source, ordinal, distance, exact, digest, wire } },
 *   work (the caps of the attempt, `copyWork` form).
 * The keeper is the one of that attempt alone (fresh, threshold infinity); `consume` replays its counted offers
 * against the running serial threshold of the attempts consumed before, which is what the one keeper of the serial
 * loop would have done: only an offer below the threshold is counted at all, and only then can it set the best, the
 * distance or `unsound`. Counts of offers above the threshold were speculative work and change nothing.
 */
class SerialMerge {
  constructor(options) {
    this.attemptsPlanned = options.attempts;
    this.best = null;
    this.bestDistance = Infinity;
    this.bestAttempt = null;
    this.unsound = false;
    this.keeperBest = null;
    this.keeperDistance = Infinity;
    this.keeperUnsound = false;
    this.attempts = 0;
    this.samples = 0;
    this.work = [];
    this.timings = {};
    this.config = null;
    this.seed = null;
    this.modelHashes = [];
    this.steps = [];
    this.stopped = false;
  }

  _check(condition, message) {
    if (!condition) throw unexplained(message);
  }

  /** Consumes the next attempt in native order; returns { stop } (true when the best is exact). */
  consume(state) {
    this._check(!this.stopped, 'an attempt is consumed after the stopping boundary');
    this._check(state.attempt === this.attempts + 1, 'attempt ' + state.attempt + ' consumed out of order after ' +
      this.attempts);
    this._check(state.attempt <= this.attemptsPlanned, 'attempt ' + state.attempt + ' beyond the planned attempts');
    const meta = state.meta;
    if (this.config === null) {
      this.config = meta.config;
      this.seed = meta.seed;
      this._check(meta.config.maxAttempts === this.attemptsPlanned, 'the normalised config says maxAttempts ' +
        meta.config.maxAttempts + ' but ' + this.attemptsPlanned + ' were planned');
    } else {
      this._check(C.canonicalJson(meta.config) === C.canonicalJson(this.config), 'attempt ' + state.attempt +
        ' normalised the request differently');
    }
    this.attempts++;
    const step = { attempt: state.attempt, bestBefore: this.bestDistance, keeperBefore: this.keeperDistance };

    // 1. dig samples: first strictly better (the first sample always sets the best of the very first attempt).
    const first = state.samples.firstBest;
    this._check(state.samples.count >= 1 && first, 'attempt ' + state.attempt + ' has no sample');
    this._check(first.exact === (first.distance === 0), 'a sample claims exact with distance ' + first.distance);
    this.samples += state.samples.count;
    this.unsound = this.unsound || state.samples.unsound === true;
    if (this.best === null || first.distance < this.bestDistance) {
      this.best = first;
      this.bestDistance = first.distance;
      this.bestAttempt = state.attempt;
    }

    // 2. the keeper of the run: replay this attempt's counted offers against the running serial threshold.
    let threshold = this.keeperDistance;
    let accepted = null;
    const replay = { counted: 0, acceptedOrdinal: null, speculative: 0, unsoundSet: false };
    (state.keeper.counted || []).forEach(function (offer) {
      if (!(offer.distance < threshold)) {
        replay.speculative++;
        return;
      }
      replay.counted++;
      if (offer.count === 1) {
        threshold = offer.distance;
        accepted = offer;
      } else if (offer.count !== null && offer.provesUniqueness === true) {
        this.keeperUnsound = true;
        replay.unsoundSet = true;
      }
    }, this);
    if (accepted !== null) {
      const local = state.keeper.best;
      this._check(local && local.ordinal === accepted.ordinal && local.distance === accepted.distance,
        'the keeper replay of attempt ' + state.attempt + ' accepts offer ' + accepted.ordinal +
        ' but the worker kept ' + (local ? local.ordinal : 'nothing'));
      this._check(local.exact === (local.distance === 0), 'a kept candidate claims exact with distance ' +
        local.distance);
      this.keeperBest = local;
      this.keeperDistance = local.distance;
      replay.acceptedOrdinal = accepted.ordinal;
    }

    // 3. the local search sample is not a dig sample: its soundness counts, its candidate joins below.
    const searched = state.searched;
    if (searched) this.unsound = this.unsound || searched.unsound === true;

    // The native end of attempt: the keeper beats the samples only strictly, then the search beats both.
    let adopted = null;
    if (this.keeperBest !== null && this.keeperDistance < this.bestDistance) {
      this.best = this.keeperBest;
      this.bestDistance = this.keeperDistance;
      this.bestAttempt = state.attempt;
      adopted = 'keeper';
    }
    if (searched) {
      this._check(searched.exact === (searched.distance === 0), 'a search state claims exact with distance ' +
        searched.distance);
      if (searched.distance < this.bestDistance) {
        this.best = searched;
        this.bestDistance = searched.distance;
        this.bestAttempt = state.attempt;
        adopted = 'search';
      }
    }

    this.work.push(state.work);
    Object.keys(meta.timings || {}).forEach(function (id) {
      if (id === 'configure' || id === 'buildModel') {
        if (this.attempts === 1) this.timings[id] = meta.timings[id];
      } else {
        this.timings[id] = (this.timings[id] || 0) + meta.timings[id];
      }
    }, this);
    if (meta.modelHash) this.modelHashes.push(meta.modelHash);
    step.bestAfter = this.bestDistance;
    step.keeperAfter = this.keeperDistance;
    step.replay = replay;
    step.adopted = adopted;
    this.steps.push(step);
    this.stopped = this.best !== null && this.best.exact === true;
    return { stop: this.stopped };
  }

  /** The native verdict once the consumed prefix is the whole run: a result or `digger.noRatedPuzzle`. */
  finish() {
    const best = this.best;
    if (best === null || best.wire.rating.solved !== true) {
      return { ok: false, error: { code: 'digger.noRatedPuzzle', name: 'GenerationError',
        message: 'not one completely rated puzzle in every consumed attempt' } };
    }
    const warnings = [];
    if (!best.exact) {
      warnings.push('difficulty.approximate');
      if (best.wire.rating.solved === true && best.wire.rating.level === this.config.difficulty) {
        warnings.push('difficulty.shallow');
      }
    }
    if (this.unsound || this.keeperUnsound) warnings.push('digger.unsoundTechnique');
    const wire = {
      v: 1,
      model: best.wire.model,
      givens: best.wire.givens,
      solution: best.wire.solution,
      rating: best.wire.rating,
      exact: best.exact === true,
      seed: this.seed,
      config: this.config,
      timings: this.timings,
      attempts: this.attempts,
      warnings: warnings,
      digLog: best.wire.digLog,
      work: this.work
    };
    return { ok: true, wire: wire, warnings: warnings, best: { source: best.source, attempt: this.bestAttempt,
      exact: best.exact === true, distance: best.distance, digest: best.digest } };
  }
}

// --- the pool -----------------------------------------------------------------------------------------------------

/** Events of every worker of a pool in arrival order, each stamped with the host clock and CPU on arrival. */
class Inbox {
  constructor(host) {
    this.host = host;
    this.queue = [];
    this.wake = null;
  }

  push(event) {
    const m = this.host.mark();
    event.t = m.t;
    event.cpu = m.cpu;
    this.queue.push(event);
    if (this.wake) {
      const wake = this.wake;
      this.wake = null;
      wake();
    }
  }

  /** The next event, or a timeout event: whatever arrives after `deadlineAt` is a timeout, never a result. */
  async next(deadlineAt, scope) {
    for (;;) {
      if (this.queue.length > 0) {
        const event = this.queue.shift();
        if (event.t > deadlineAt) {
          return { kind: 'timeout', scope: scope, late: true, t: event.t, cpu: event.cpu,
            arrived: event.kind === 'message' ? event.msg.type : event.kind };
        }
        return event;
      }
      const remaining = deadlineAt - this.host.clock();
      if (remaining <= 0) {
        const m = this.host.mark();
        return { kind: 'timeout', scope: scope, late: false, t: m.t, cpu: m.cpu };
      }
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          this.wake = null;
          resolve();
        }, remaining);
        this.wake = () => {
          clearTimeout(timer);
          resolve();
        };
      });
    }
  }
}

function round3(x) {
  return isNumber(x) && Number.isFinite(x) ? Math.round(x * 1000) / 1000 : null;
}

/** The record row of one attempt: separate from the request totals, never summed into them again. */
function attemptRow(job, a, ctx) {
  const st = a.state || null;
  const keeper = st ? st.keeper : null;
  const counted = keeper ? keeper.counted || [] : [];
  return {
    key: job.key + '/a' + a.ordinal,
    parentKey: job.key,
    recordKind: 'attempt',
    attempt: a.ordinal,
    serialOrdinal: a.ordinal,
    lane: a.lane,
    consumed: a.consumed,
    speculative: !a.consumed,
    outcome: a.error ? 'error' : st ? 'complete' : 'terminated-unfinished',
    completedBeforeDecision: a.finishedAt !== null && a.finishedAt <= ctx.decisionAt,
    startedMs: round3(a.startedAt - ctx.t0),
    finishedMs: a.finishedAt === null ? null : round3(a.finishedAt - ctx.t0),
    wallMs: a.finishedAt === null ? null : round3(a.finishedAt - a.startedAt),
    engineElapsedMs: st ? round3(st.meta.engineElapsedMs) : null,
    cpuAvailability: 'unavailable per attempt: process.cpuUsage is read once at the host',
    origin: ctx.originOf(a.ordinal),
    error: a.error || null,
    work: st ? st.work : null,
    samples: st ? st.samples.count : null,
    modelHash: st ? st.meta.modelHash || null : null,
    buildModelMs: st ? round3(st.meta.timings ? st.meta.timings.buildModel : null) : null,
    candidates: st ? {
      sample: st.samples.firstBest ? { distance: distanceJson(st.samples.firstBest.distance),
        exact: st.samples.firstBest.exact, digest: st.samples.firstBest.digest } : null,
      search: st.searched ? { distance: distanceJson(st.searched.distance), exact: st.searched.exact,
        digest: st.searched.digest } : null,
      keeper: keeper && keeper.best ? { ordinal: keeper.best.ordinal, distance: distanceJson(keeper.best.distance),
        exact: keeper.best.exact, digest: keeper.best.digest } : null
    } : null,
    keeperLedger: keeper ? {
      offersMet: keeper.offersMet,
      counted: counted.map(function (o) {
        return { ordinal: o.ordinal, distance: distanceJson(o.distance), count: o.count,
          provesUniqueness: o.provesUniqueness, digest: o.digest };
      }),
      localUnsound: keeper.localUnsound === true
    } : null,
    sampleUnsound: st ? st.samples.unsound === true : null
  };
}

/**
 * One request on `min(4, A)` workers. `options`: attempts (A, from the discovered catalogue or the request),
 * width (default 4), makeJob(ordinal, firstOnLane) -> the job posted to a worker, spawn ({ adapterIds, noEngine }),
 * readyCheck, label. Returns an observation of the shape of `Host.runRequest` (outcome, wire, generation, guard,
 * terminateFailure ...) plus `pool`. A synthetic job kind is possible only on a test-only host.
 */
async function runAttemptPool(host, job, options) {
  const opts = options || {};
  const attempts = opts.attempts;
  if (!(Number.isInteger(attempts) && attempts >= 1)) throw new HarnessError('pool-attempts', 'no attempt count');
  if (host.stopped) throw new HarnessError('host-stopped', 'the host stopped: ' + host.stopped);
  const width = Math.min(opts.width || POOL_WIDTH, attempts);
  const guardMs = host.guards.requestMs;
  const marks = { t0: null, cpu0: null, tReady: null, cpuReady: null, tDecision: null, cpuDecision: null,
    tClean: null, cpuClean: null };
  const start = host.mark();
  marks.t0 = start.t;
  marks.cpu0 = start.cpu;
  const requestAt = marks.t0 + guardMs;
  const deadlineAt = Math.min(requestAt, host.commandTimerAt);
  const scopeAtTimeout = requestAt <= host.commandTimerAt ? 'request' : 'command';

  const inbox = new Inbox(host);
  const lanes = [];
  const rows = new Map();
  const results = new Map();
  const merge = new SerialMerge({ attempts: attempts });
  const obs = { key: job.key, outcome: 'error', timeoutScope: null, wire: null, error: null, fatal: null,
    engineElapsedMs: null, ready: null, lateDecision: false, terminateFailure: null, identityViolation: null };
  let nextOrdinal = 1;
  let nextConsume = 1;
  let active = 0;
  let peakActive = 0;
  let busyLaneMs = 0;
  let decided = null;
  let result = null;
  let firstReadyAt = null;
  let lastReadyAt = null;
  const activity = [];

  const note = function (t) { activity.push([round3(t - marks.t0), active]); };

  for (let i = 0; i < width; i++) {
    const spawned = host.spawn(Object.assign({ role: 'request', adapterIds: [], noEngine: false,
      wantCatalogue: false, expectedFingerprint: host.runtimeFingerprint }, opts.spawn || {}));
    const lane = { index: i, worker: spawned.worker, ready: false, alive: true, attempt: null, jobs: 0 };
    lane.worker.on('message', (msg) => inbox.push({ kind: 'message', lane: lane, msg: msg }));
    lane.worker.on('error', (err) => inbox.push({ kind: 'worker-error', lane: lane, error: H.serialiseError(err) }));
    lane.worker.on('exit', (code) => inbox.push({ kind: 'exit', lane: lane, code: code }));
    lanes.push(lane);
  }

  const assign = function (lane, t) {
    if (decided || !lane.alive || lane.attempt !== null || nextOrdinal > attempts) return;
    const ordinal = nextOrdinal++;
    lane.attempt = ordinal;
    const row = { ordinal: ordinal, lane: lane.index, startedAt: t, finishedAt: null, state: null, error: null,
      consumed: false, late: false };
    rows.set(ordinal, row);
    active++;
    peakActive = Math.max(peakActive, active);
    note(t);
    try {
      lane.worker.postMessage({ type: 'job', job: opts.makeJob(ordinal, lane.jobs === 0) });
      lane.jobs++;
    } catch (err) {
      lane.alive = false;
      lane.attempt = null;
      active--;
      row.error = { code: 'post-failed', name: null, message: String(err && err.message ? err.message : err) };
      row.finishedAt = t;
      const at = host.mark();
      results.set(ordinal, { error: row.error, t: t, cpu: at.cpu });
      drain({ t: t, cpu: at.cpu });
    }
  };

  const finishAttempt = function (lane, ev, state, error) {
    const ordinal = lane.attempt;
    const row = rows.get(ordinal);
    lane.attempt = null;
    active--;
    row.finishedAt = ev.t;
    busyLaneMs += ev.t - row.startedAt;
    note(ev.t);
    if (error) row.error = error;
    else row.state = state;
    results.set(ordinal, { state: state, error: error, t: ev.t, cpu: ev.cpu });
  };

  // Consume in native order, as far as the arrived results go; an exact best or the last attempt decides. The decision
  // is made when the result that completed the consumable prefix arrived (`trigger`), never at the arrival of an
  // earlier attempt that was waiting behind a slower one.
  const drain = function (trigger) {
    while (!decided && results.has(nextConsume)) {
      const entry = results.get(nextConsume);
      const row = rows.get(nextConsume);
      if (entry.error) {
        row.consumed = true;
        decided = { kind: 'error', t: trigger.t, cpu: trigger.cpu, error: entry.error, ordinal: nextConsume };
        return;
      }
      let outcome;
      try {
        outcome = merge.consume(entry.state);
      } catch (err) {
        row.consumed = true;
        decided = { kind: 'merge-error', t: trigger.t, cpu: trigger.cpu, error: { code: err.code || 'merge-error',
          name: err.name || null, message: err.message }, ordinal: nextConsume };
        return;
      }
      row.consumed = true;
      nextConsume++;
      if (outcome.stop || nextConsume > attempts) {
        decided = { kind: 'merged', t: trigger.t, cpu: trigger.cpu, exact: outcome.stop };
        return;
      }
    }
  };

  const onLaneLost = function (lane, ev, why) {
    if (!lane.alive) return;
    lane.alive = false;
    if (lane.attempt !== null) {
      finishAttempt(lane, ev, null, Object.assign({ code: 'worker-lost', name: null }, why));
    }
    drain(ev);
    if (!decided && lanes.every(function (l) { return !l.alive; })) {
      decided = { kind: 'error', t: ev.t, cpu: ev.cpu, ordinal: null,
        error: { code: 'pool-no-workers', name: null, message: 'every worker of the pool was lost' } };
    }
  };

  while (!decided) {
    const ev = await inbox.next(deadlineAt, scopeAtTimeout);
    if (ev.kind === 'timeout') {
      decided = { kind: 'timeout', t: ev.t, cpu: ev.cpu, scope: ev.scope, late: ev.late === true,
        arrived: ev.arrived || null };
      break;
    }
    const lane = ev.lane;
    if (ev.kind === 'worker-error') {
      onLaneLost(lane, ev, { message: ev.error.message });
    } else if (ev.kind === 'exit') {
      onLaneLost(lane, ev, { message: 'the worker exited with code ' + ev.code });
    } else if (ev.msg.type === 'ready') {
      lane.ready = true;
      if (firstReadyAt === null) {
        firstReadyAt = ev.t;
        marks.tReady = ev.t;
        marks.cpuReady = ev.cpu;
        obs.ready = ev.msg;
        const refusal = typeof opts.readyCheck === 'function' ? opts.readyCheck(ev.msg) : null;
        if (refusal) {
          decided = { kind: 'fatal', t: ev.t, cpu: ev.cpu, error: { code: refusal.code, name: null,
            message: refusal.message } };
          break;
        }
      }
      lastReadyAt = ev.t;
      assign(lane, ev.t);
    } else if (ev.msg.type === 'attempt-result' && lane.attempt !== null && ev.msg.attempt === lane.attempt) {
      finishAttempt(lane, ev, ev.msg.state, null);
      drain(ev);
      assign(lane, ev.t);
    } else if (ev.msg.type === 'attempt-error' && lane.attempt !== null) {
      finishAttempt(lane, ev, null, ev.msg.error || { code: 'attempt-error', name: null, message: 'attempt failed' });
      drain(ev);
      assign(lane, ev.t);
    } else if (ev.msg.type === 'fatal') {
      decided = { kind: 'fatal', t: ev.t, cpu: ev.cpu, error: ev.msg.error || { code: 'fatal', name: null,
        message: 'fatal worker message' } };
    }
  }

  marks.tDecision = decided.t;
  marks.cpuDecision = decided.cpu;
  const decisionAt = decided.t;
  // Lanes still busy at the decision (speculative attempts) count until then.
  rows.forEach(function (r) { if (r.finishedAt === null) busyLaneMs += Math.max(0, decisionAt - r.startedAt); });
  // The decision is made: stop what is not needed, wait for the cleanup, then read the total CPU.
  const terminations = await Promise.all(lanes.map(function (lane) { return host.terminateWorker(lane.worker); }));
  const failed = terminations.find(function (r) { return !r.ok; });
  if (failed) obs.terminateFailure = failed.reason;
  // A reply that arrived after the decision is a late reply of a speculative attempt: seen, never consumed.
  while (inbox.queue.length > 0) {
    const ev = inbox.queue.shift();
    if (ev.kind === 'message' && ev.msg.type === 'attempt-result' && rows.has(ev.msg.attempt)) {
      rows.get(ev.msg.attempt).late = true;
    }
  }
  const end = host.mark();
  marks.tClean = end.t;
  marks.cpuClean = end.cpu;

  if (decided.kind === 'merged') {
    result = merge.finish();
    if (result.ok) {
      obs.outcome = 'complete';
      obs.wire = result.wire;
    } else {
      obs.error = result.error;
    }
  } else if (decided.kind === 'timeout') {
    obs.outcome = 'request-timeout';
    obs.timeoutScope = decided.scope;
    obs.lateDecision = decided.late === true;
    obs.error = { code: 'timeout', name: null, message: decided.late === true ?
      'a ' + decided.arrived + ' arrived after the ' + decided.scope + ' deadline and was rejected' :
      'no decision before the ' + decided.scope + ' guard' };
  } else {
    obs.error = Object.assign({ name: null }, decided.error);
    if (decided.kind === 'fatal') obs.fatal = obs.error.code;
    if (decided.kind === 'merge-error') obs.identityViolation = 'merge-unexplained';
  }
  obs.generation = H.accountRequest(marks, host.cpu.quantumMs, host.cpu.api);
  obs.guard = { scope: 'request', guardMs: guardMs, deadlineAt: deadlineAt - marks.t0 };
  obs.testOnly = host.testOnly;

  const bestInfo = result && result.ok ? result.best : null;
  const originOf = function (ordinal) {
    return bestInfo && bestInfo.attempt === ordinal ? bestInfo.source : null;
  };
  const ordinals = Array.from(rows.keys()).sort(function (a, b) { return a - b; });
  const attemptRows = ordinals.map(function (o) {
    return attemptRow(job, rows.get(o), { t0: marks.t0, decisionAt: decisionAt, originOf: originOf });
  });
  const consumedCount = ordinals.filter(function (o) { return rows.get(o).consumed; }).length;
  const hashes = Array.from(new Set(attemptRows.map(function (r) { return r.modelHash; }).filter(Boolean)));
  const builds = attemptRows.map(function (r) { return r.buildModelMs; }).filter(function (v) { return v !== null; });
  const totalBuild = builds.reduce(function (a, b) { return a + b; }, 0);
  const wallToDecision = decisionAt - marks.t0;
  obs.pool = {
    width: width,
    ceiling: width,
    attemptsPlanned: attempts,
    attemptsStarted: ordinals.length,
    attemptsConsumed: consumedCount,
    attemptsSpeculative: ordinals.length - consumedCount,
    peakActive: peakActive,
    peakWithinCeiling: peakActive <= width,
    meanBusyLanes: wallToDecision > 0 ? round3(busyLaneMs / wallToDecision) : null,
    firstReadyMs: firstReadyAt === null ? null : round3(firstReadyAt - marks.t0),
    allReadyMs: lanes.every(function (l) { return l.ready; }) && lastReadyAt !== null ?
      round3(lastReadyAt - marks.t0) : null,
    decisionMs: round3(wallToDecision),
    decision: decided.kind,
    exact: bestInfo ? bestInfo.exact : null,
    firstExactOrigin: bestInfo && bestInfo.exact ? bestInfo.source : null,
    firstExactOrdinal: bestInfo && bestInfo.exact ? bestInfo.attempt : null,
    resultOrigin: bestInfo ? bestInfo.source : null,
    resultAttempt: bestInfo ? bestInfo.attempt : null,
    modelHashes: hashes,
    modelHashesEqual: hashes.length <= 1,
    duplicatedModelBuild: { perAttemptMs: builds, totalMs: round3(totalBuild),
      duplicatedMs: builds.length > 0 ? round3(totalBuild - builds[0]) : null },
    activity: activity,
    mergeSteps: merge.steps.map(function (s) {
      return { attempt: s.attempt, adopted: s.adopted, replay: s.replay, bestBefore: distanceJson(s.bestBefore),
        bestAfter: distanceJson(s.bestAfter), keeperBefore: distanceJson(s.keeperBefore),
        keeperAfter: distanceJson(s.keeperAfter) };
    }),
    keeperUnsoundConsumed: merge.keeperUnsound,
    sampleUnsoundConsumed: merge.unsound,
    attempts: attemptRows
  };
  return obs;
}

// --- identity of a native-w1 / attempts-w4 pair ---------------------------------------------------------------------

/**
 * Per pair, native-w1 (arm reference) against attempts-w4 (arm prototype): every digest section of the normalised
 * result (structure, givens, solution, canonical rating, configuration, warnings, dig log, work, scalars), the exact
 * flags, and the pool's own invariants. A pair whose mate has not run is deferred; a censored or unverified arm is
 * shown and proves nothing. The shape is that of the loader parity report, so the shard status logic is shared.
 */
function identityReport(records, compareDigests) {
  const byPair = new Map();
  records.forEach(function (r) {
    if (!r.pairId) return;
    if (!byPair.has(r.pairId)) byPair.set(r.pairId, {});
    byPair.get(r.pairId)[r.arm] = r;
  });
  const pairs = [];
  byPair.forEach(function (arms, pairId) {
    const ref = arms.reference;
    const proto = arms.prototype;
    const present = function (r) { return !!r && r.outcome !== 'unstarted'; };
    if (!present(ref) && !present(proto)) {
      pairs.push({ pairId: pairId, verdict: 'not-started' });
      return;
    }
    if (present(ref) !== present(proto)) {
      const have = present(ref) ? ref : proto;
      if (have.outcome === 'complete' || have.outcome === 'request-timeout') {
        pairs.push({ pairId: pairId, verdict: 'deferred', waitingFor: present(ref) ? 'prototype' : 'reference',
          arm: have.arm });
        return;
      }
    }
    const problems = [];
    const unproven = [];
    const unverified = [];
    [['native-w1', ref], ['attempts-w4', proto]].forEach(function (p) {
      if (!p[1] || p[1].outcome === 'unstarted') problems.push(p[0] + ' not run');
      else if (p[1].outcome === 'request-timeout') unproven.push(p[0] + ' censored (' + p[1].timeoutScope + ')');
      else if (p[1].outcome === 'validation-unknown') unverified.push(p[0] + ' validation unknown');
      else if (p[1].outcome !== 'complete') problems.push(p[0] + ' outcome ' + p[1].outcome);
    });
    let compared = null;
    if (problems.length === 0 && unproven.length === 0 && ref.digests && proto.digests) {
      compared = compareDigests(ref.digests, proto.digests);
      if (!compared.equal) problems.push('digests differ in: ' + compared.differing.join(', '));
      if (ref.claimedExact !== proto.claimedExact) problems.push('claimed exactness differs');
      // An unknown audit is no verified hit, but the two results can still be compared on every digest section.
      if (ref.verifiedExact !== null && proto.verifiedExact !== null) {
        if (ref.verifiedExact !== proto.verifiedExact) problems.push('verified exactness differs');
        if (ref.claimedExact !== ref.verifiedExact) problems.push('native claimed exact differs from verified');
        if (proto.claimedExact !== proto.verifiedExact) problems.push('pooled claimed exact differs from verified');
      }
      const pool = proto.pool;
      if (!pool) problems.push('no pool details');
      else {
        if (!pool.peakWithinCeiling) problems.push('peak active attempts ' + pool.peakActive + ' above min(4,A)');
        if (!pool.modelHashesEqual) problems.push('workers built different base models');
        if (pool.attemptsConsumed !== proto.attemptsUsed) problems.push('consumed attempts differ from attemptsUsed');
      }
    }
    let verdict = 'identity-ok';
    if (problems.length > 0) verdict = 'identity-failed';
    else if (unproven.length > 0) verdict = 'not-comparable';
    pairs.push({
      pairId: pairId, verdict: verdict, problems: problems, unproven: unproven, unverified: unverified,
      digestsEqual: compared ? compared.equal : null, differing: compared ? compared.differing : null,
      nativeDigest: ref && ref.digests ? ref.digests.all : null,
      pooledDigest: proto && proto.digests ? proto.digests.all : null,
      sections: ref && ref.digests ? Object.keys(ref.digests).filter(function (k) { return k !== 'all'; }) : null,
      claimedExact: ref ? ref.claimedExact : null, verifiedExact: ref ? ref.verifiedExact : null,
      puzzleHash: ref ? ref.puzzleHash : null
    });
  });
  const count = function (verdict) { return pairs.filter(function (p) { return p.verdict === verdict; }).length; };
  return { pairs: pairs, failed: count('identity-failed'), ok: count('identity-ok'),
    notComparable: count('not-comparable'), deferred: count('deferred') + count('not-started'),
    complete: pairs.length > 0 && count('identity-ok') === pairs.length };
}

module.exports = { POOL_WIDTH, SerialMerge, Inbox, runAttemptPool, identityReport, distanceJson, attemptRow };
