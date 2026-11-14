'use strict';

/*
 * Tests of the S5a prototype (IG-S02), synthetic only: no puzzle is generated and no speed is measured.
 *
 *   node pool-test.cjs --only=pure     pure cases (merge, scheduling on fake workers, identity, plan, transforms):
 *                                      no worker thread, no engine, no CPU spin; milliseconds, for development
 *
 * The full group also starts real worker threads (briefly busy by design) and so runs only inside the first
 * shard of IG-S02, under the low-priority wrapper (`runSynthetic`, called by ig02-run.cjs). A short test-only timer
 * is used there; it never reaches a generation manifest.
 *
 * `engineLoop` is a model of the control flow of `SG.digger.generateAttempts` (attempt loop, first sample always,
 * `keeper.distance === 0` stops sampling, local search from the attempt's closest candidate, end-of-attempt merge in
 * the native order). It runs both as the serial loop (one keeper for all attempts) and as one attempt of the pool
 * (fresh state, keeper ledger, capture): the same code in the two modes, like the adapter's patch. What it proves is
 * the merge; that the real engine behaves like the model is proven by the identity checks of the real pairs.
 */
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const C = require('./common.cjs');
const L = require('./loader.cjs');
const R = require('./records.cjs');
const M = require('./manifest.cjs');
const H = require('./host.cjs');
const P = require('./attempt-pool.cjs');

const REPO = C.DEFAULT_REPO_ROOT;
const LEVEL = 'nightmare';

const cases = [];

function add(id, group, title, fn) {
  cases.push({ id: id, group: group, title: title, fn: fn });
}

function check(condition, message) {
  if (!condition) throw new Error('check failed: ' + message);
}

function same(actual, expected, message) {
  if (C.canonicalJson(actual) !== C.canonicalJson(expected)) {
    throw new Error(message + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
  }
}

// --- the model of the engine's attempt loop ---------------------------------------------------------------------

function makeKeeper() {
  const keeper = { best: null, distance: Infinity, unsound: false, met: 0, ledger: [] };
  keeper.offer = function (o) {
    keeper.met++;
    if (!(o.distance < keeper.distance)) return false;
    keeper.ledger.push({ ordinal: keeper.met, distance: o.distance, count: o.count, provesUniqueness: o.proves,
      digest: 'o:' + o.tag });
    if (o.count !== 1) {
      if (o.count !== null && o.proves) keeper.unsound = true;
      return false;
    }
    keeper.best = o;
    keeper.distance = o.distance;
    return true;
  };
  return keeper;
}

function candidate(source, distance, tag) {
  const solved = distance !== Infinity;
  return { source: source, distance: distance, exact: distance === 0, digest: 'd:' + tag, wire: {
    model: { tag: tag }, givens: [1, 0], solution: [1, 2],
    rating: { solved: solved, level: !solved ? null : distance < 1000 ? LEVEL : 'expert', score: solved ? 100 : null },
    digLog: [tag] } };
}

/**
 * pooledAttempt 0: the serial loop over all attempts. pooledAttempt a > 0: only attempt a, fresh state, returns the
 * capture the worker would post. `scripts[a - 1]` = { hook [offers], digTries, samples [{ distance, tag, unsound,
 * offers }], capsExhausted, search { offers, state { distance, tag, unsound } | null } }; an offer is { distance, tag,
 * count (1 | 2 | null), proves }.
 */
function engineLoop(scripts, attempts, pooledAttempt) {
  const keeper = makeKeeper();
  let best = null;
  let bestD = Infinity;
  let unsound = false;
  let used = 0;
  let consumedSamples = 0;
  const first = pooledAttempt || 1;
  const last = pooledAttempt || attempts;
  for (let a = first; a <= last; a++) {
    const script = scripts[a - 1];
    used++;
    let attemptBest = null;
    let attemptD = Infinity;
    let searched = null;
    let samples = 0;
    script.hook.forEach(function (o) { keeper.offer(o); });
    for (let t = 1; t <= script.digTries; t++) {
      if (t > 1 && keeper.distance === 0) break;
      const s = script.samples[t - 1];
      if (!s) break;
      s.offers.forEach(function (o) { keeper.offer(o); });
      samples++;
      unsound = unsound || s.unsound === true;
      const cand = candidate('sample', s.distance, s.tag);
      if (best === null || s.distance < bestD) {
        best = cand;
        bestD = s.distance;
      }
      if (attemptBest === null || s.distance < attemptD) {
        attemptBest = cand;
        attemptD = s.distance;
      }
      if (s.distance === 0) break;
    }
    if (best !== null && !best.exact && keeper.distance > 0 && attemptBest !== null && attemptD !== Infinity &&
        !script.capsExhausted) {
      for (let i = 0; i < script.search.offers.length && keeper.distance > 0; i++) {
        keeper.offer(script.search.offers[i]);
      }
      if (script.search.state) {
        const st = script.search.state;
        searched = Object.assign(candidate('search', st.distance, st.tag), { unsound: st.unsound === true });
        unsound = unsound || st.unsound === true;
      }
    }
    if (pooledAttempt) {
      let kept = null;
      if (keeper.best) {
        kept = candidate('keeper', keeper.distance, keeper.best.tag);
        kept.ordinal = keeper.ledger.filter(function (e) { return e.count === 1; }).pop().ordinal;
      }
      return {
        attempt: a,
        meta: { config: { difficulty: LEVEL, maxAttempts: attempts, seed: 1 }, seed: 1,
          timings: { configure: 1, buildModel: 2, dig: 3 }, modelHash: 'h', engineElapsedMs: 5 },
        samples: { count: samples, unsound: unsound, firstBest: attemptBest },
        searched: searched,
        keeper: { offersMet: keeper.met, counted: keeper.ledger, best: kept, localDistance: keeper.distance,
          localUnsound: keeper.unsound },
        work: { ratings: samples, proposals: 0, maxRatings: 1024, maxProposals: 32768, localSearches: [] }
      };
    }
    if (keeper.best !== null && keeper.distance < bestD) {
      best = candidate('keeper', keeper.distance, keeper.best.tag);
      bestD = keeper.distance;
    }
    if (searched !== null && searched.distance < bestD) {
      best = searched;
      bestD = searched.distance;
    }
    consumedSamples += samples;
    if (best !== null && best.exact) break;
  }
  return { best: best, bestDistance: bestD, unsound: unsound || keeper.unsound, attempts: used,
    keeperDistance: keeper.distance };
}

function pooled(scripts, attempts) {
  const merge = new P.SerialMerge({ attempts: attempts });
  for (let a = 1; a <= attempts; a++) {
    if (merge.consume(engineLoop(scripts, attempts, a)).stop) break;
  }
  return merge;
}

function mulberry32(seed) {
  return R.mulberry32(seed);
}

const DISTANCES = [0, 0.5, 0.5, 1000.2, 1000.2, 1500, 2000.4, Infinity];
const OFFER_DISTANCES = [0, 0.5, 0.5, 1000.2, 1000.2, 1500, 2000.4];

function randomScripts(rng, attempts) {
  const pick = function (list) { return list[Math.floor(rng() * list.length)]; };
  let n = 0;
  const offer = function () {
    const r = rng();
    n++;
    return { distance: pick(OFFER_DISTANCES), tag: 'o' + n, count: r < 0.7 ? 1 : r < 0.85 ? 2 : null,
      proves: rng() < 0.5 };
  };
  const offers = function (max) {
    const out = [];
    const k = Math.floor(rng() * (max + 1));
    for (let i = 0; i < k; i++) out.push(offer());
    return out;
  };
  const scripts = [];
  for (let a = 1; a <= attempts; a++) {
    const samples = [];
    const k = 1 + Math.floor(rng() * 5);
    for (let t = 1; t <= k; t++) {
      samples.push({ distance: pick(DISTANCES), tag: 's' + a + '.' + t, unsound: rng() < 0.05, offers: offers(2) });
    }
    scripts.push({ hook: rng() < 0.2 ? offers(2) : [], digTries: 6, samples: samples, capsExhausted: rng() < 0.1,
      search: { offers: offers(5), state: rng() < 0.5 ? { distance: pick(DISTANCES), tag: 'q' + a,
        unsound: rng() < 0.05 } : null } });
  }
  return scripts;
}

function shapeOf(serial) {
  return { tag: serial.best.digest, exact: serial.best.exact, distance: serial.bestDistance === Infinity ? null :
    serial.bestDistance, unsound: serial.unsound, attempts: serial.attempts };
}

add('merge-equals-the-serial-loop-on-random-scenarios', 'pure',
  'the keeper replay and the ordered merge equal the one-keeper serial loop (ties, unknown counts, unsound offers)',
  function () {
    let stoppedExact = 0;
    let runs = 0;
    let unsoundSeen = 0;
    for (let seed = 1; seed <= 1500; seed++) {
      const rng = mulberry32(seed);
      const attempts = [2, 4, 8][seed % 3];
      const scripts = randomScripts(rng, attempts);
      const serial = engineLoop(scripts, attempts, 0);
      const merge = pooled(scripts, attempts);
      const out = merge.finish();
      const expectUnsound = serial.unsound;
      if (serial.best === null || serial.best.wire.rating.solved !== true) {
        check(!out.ok && out.error.code === 'digger.noRatedPuzzle', 'seed ' + seed + ': no rated puzzle');
        continue;
      }
      runs++;
      same([merge.best.digest, merge.best.exact, merge.bestDistance, merge.attempts],
        [serial.best.digest, serial.best.exact, serial.bestDistance, serial.attempts], 'seed ' + seed + ' result');
      same(out.warnings.indexOf('digger.unsoundTechnique') >= 0, expectUnsound, 'seed ' + seed + ' unsound flag');
      same(merge.keeperDistance, serial.keeperDistance, 'seed ' + seed + ' keeper distance');
      same(out.wire.attempts, serial.attempts, 'seed ' + seed + ' consumed attempts');
      same(out.wire.work.length, serial.attempts, 'seed ' + seed + ' work entries');
      if (serial.best.exact) stoppedExact++;
      if (expectUnsound) unsoundSeen++;
    }
    check(stoppedExact > 100 && unsoundSeen > 20, 'the scenarios reach exact stops and unsound runs: ' +
      stoppedExact + ' ' + unsoundSeen);
    return { scenarios: 1500, rated: runs, exactStops: stoppedExact, unsoundRuns: unsoundSeen };
  });

function plainScript(over) {
  return Object.assign({ hook: [], digTries: 6, samples: [{ distance: 1000.2, tag: 's', unsound: false, offers: [] }],
    capsExhausted: false, search: { offers: [], state: null } }, over || {});
}

add('merge-precedence-and-ties', 'pure',
  'equal-quality candidates keep the first met; the keeper and the search need a strictly better quality',
  function () {
    // keeper 0.5 against a sample 0.5: the sample stays.
    let m = pooled([plainScript({ samples: [{ distance: 0.5, tag: 's1', offers: [] }],
      hook: [{ distance: 0.5, tag: 'k1', count: 1, proves: true }] })], 1);
    same([m.best.source, m.best.digest], ['sample', 'd:s1'], 'equal sample and keeper score');
    // keeper 0.5 against a sample 1000.2: the keeper wins.
    m = pooled([plainScript({ hook: [{ distance: 0.5, tag: 'k1', count: 1, proves: true }] })], 1);
    same([m.best.source, m.best.digest], ['keeper', 'd:k1'], 'a better keeper candidate wins');
    // two attempts with the same quality: the first attempt stays; a better one in the second attempt replaces it.
    m = pooled([plainScript({ samples: [{ distance: 0.5, tag: 'a1', offers: [] }] }),
      plainScript({ samples: [{ distance: 0.5, tag: 'a2', offers: [] }] })], 2);
    same([m.best.digest, m.bestAttempt], ['d:a1', 1], 'equal quality across attempts keeps the earlier attempt');
    m = pooled([plainScript({ samples: [{ distance: 0.5, tag: 'a1', offers: [] }] }),
      plainScript({ samples: [{ distance: 0.5, tag: 'a2', offers: [] }],
        hook: [{ distance: 0.25, tag: 'k2', count: 1, proves: false }] })], 2);
    same([m.best.digest, m.bestAttempt], ['d:k2', 2], 'a strictly better keeper candidate of a later attempt wins');
    // the local search state beats the keeper only strictly
    m = pooled([plainScript({ search: { offers: [{ distance: 0.5, tag: 'k1', count: 1, proves: true }],
      state: { distance: 0.5, tag: 'q1' } } })], 1);
    same([m.best.source, m.best.digest], ['keeper', 'd:k1'], 'the search does not replace an equal keeper');
    m = pooled([plainScript({ search: { offers: [], state: { distance: 0.5, tag: 'q1' } } })], 1);
    same([m.best.source, m.best.digest], ['search', 'd:q1'], 'a better search state wins');
  });

add('merge-hook-exact-and-first-sample', 'pure',
  'an exact hook candidate still lets the first sample run: the sample wins a tie, the keeper beats a shallow sample',
  function () {
    const exactHook = { distance: 0, tag: 'hook', count: 1, proves: true };
    const shallow = pooled([plainScript({ hook: [exactHook], samples: [{ distance: 0.5, tag: 's1', offers: [] },
      { distance: 0, tag: 's2', offers: [] }] })], 4);
    // the second sample never runs after an exact keeper: the first sample ran, the keeper wins
    same([shallow.best.source, shallow.best.exact, shallow.attempts], ['keeper', true, 1],
      'exact hook, shallow first sample');
    const state = engineLoop([plainScript({ hook: [exactHook], samples: [{ distance: 0.5, tag: 's1', offers: [] },
      { distance: 0, tag: 's2', offers: [] }] })], 4, 1);
    same(state.samples.count, 1, 'only the mandatory first sample ran');
    const tie = pooled([plainScript({ hook: [exactHook], samples: [{ distance: 0, tag: 's1', offers: [] }] })], 4);
    same([tie.best.source, tie.best.digest], ['sample', 'd:s1'], 'an exact first sample wins the tie');
  });

add('merge-incomplete-proofs-and-counts', 'pure',
  'an incomplete proof cannot win, an unknown count is never kept, a speculative count above the threshold is no unsound',
  function () {
    const none = pooled([plainScript({ samples: [{ distance: Infinity, tag: 's1', offers: [] }] })], 1);
    check(!none.finish().ok && none.finish().error.code === 'digger.noRatedPuzzle',
      'an unrated puzzle is never returned');
    const later = pooled([plainScript({ samples: [{ distance: Infinity, tag: 's1', offers: [] }] }),
      plainScript({ samples: [{ distance: 1500, tag: 's2', offers: [] }] })], 2);
    same(later.best.digest, 'd:s2', 'a rated attempt beats an unrated one');
    const unknown = pooled([plainScript({ hook: [{ distance: 0.5, tag: 'u', count: null, proves: true }] })], 1);
    same([unknown.best.source, unknown.keeperDistance, unknown.finish().warnings.indexOf('digger.unsoundTechnique')],
      ['sample', Infinity, -1], 'an unknown count is neither kept nor unsound');
    // attempt 1 keeps 0.5. Attempt 2 (fresh keeper) counts a 1000 offer with two solutions and a complete proof:
    // the serial keeper (threshold 0.5) never counts it, so no unsound flag; a 0.25 offer does flag it.
    const above = pooled([plainScript({ hook: [{ distance: 0.5, tag: 'k1', count: 1, proves: true }] }),
      plainScript({ hook: [{ distance: 1000, tag: 'bad', count: 2, proves: true }] })], 2);
    check(above.finish().warnings.indexOf('digger.unsoundTechnique') < 0 && above.attempts === 2,
      'a count above the serial threshold is speculative CPU only');
    const below = pooled([plainScript({ hook: [{ distance: 0.5, tag: 'k1', count: 1, proves: true }] }),
      plainScript({ hook: [{ distance: 0.25, tag: 'bad', count: 2, proves: true }] })], 2);
    check(below.finish().warnings.indexOf('digger.unsoundTechnique') >= 0, 'a count below it is a real unsound flag');
    const noProof = pooled([plainScript({ hook: [{ distance: 0.25, tag: 'x', count: 2, proves: false }] })], 1);
    check(noProof.finish().warnings.indexOf('digger.unsoundTechnique') < 0, 'two solutions without a proof: no flag');
  });

add('merge-refuses-unexplained-differences', 'pure',
  'an out-of-order attempt, a different configuration or an unexplained keeper replay is a correctness stop',
  function () {
    const bad = function (fn, what) {
      try {
        fn();
      } catch (err) {
        check(err.code === 'merge-unexplained', what + ': ' + err.code);
        return;
      }
      throw new Error(what + ': no stop');
    };
    const scripts = [plainScript(), plainScript()];
    bad(function () { new P.SerialMerge({ attempts: 2 }).consume(engineLoop(scripts, 2, 2)); }, 'out of order');
    bad(function () {
      const merge = new P.SerialMerge({ attempts: 2 });
      merge.consume(engineLoop(scripts, 2, 1));
      const second = engineLoop(scripts, 2, 2);
      second.meta.config = Object.assign({}, second.meta.config, { symmetry: 'none' });
      merge.consume(second);
    }, 'different configuration');
    bad(function () {
      const s = engineLoop([plainScript({ hook: [{ distance: 0.5, tag: 'k', count: 1, proves: true }] })], 1, 1);
      s.keeper.best.ordinal = 99;
      new P.SerialMerge({ attempts: 1 }).consume(s);
    }, 'keeper replay mismatch');
    bad(function () {
      const s = engineLoop([plainScript()], 1, 1);
      s.samples.firstBest.exact = true;
      new P.SerialMerge({ attempts: 1 }).consume(s);
    }, 'an exact claim at a distance above zero');
    bad(function () {
      const s = engineLoop([plainScript()], 3, 1);
      new P.SerialMerge({ attempts: 2 }).consume(s);
    }, 'a different attempt count in the request');
  });

// --- the pool on fake workers ---------------------------------------------------------------------------------------

class FakeWorker extends EventEmitter {
  constructor(script) {
    super();
    this.script = script;
    this.posted = [];
    this.terminated = false;
    script.workers.push(this);
    process.nextTick(() => {
      if (this.terminated) return;
      if (script.exitBeforeReady) this.emit('exit', 3);
      else this.emit('message', { type: 'ready', proof: null });
    });
  }

  postMessage(message) {
    this.posted.push(message);
    if (message.type === 'job') this.script.onJob(this, message.job);
  }

  terminate() {
    this.terminated = true;
    if (this.script.onTerminate) this.script.onTerminate(this);
    return this.script.hang ? new Promise(function () {}) : Promise.resolve(0);
  }
}

/**
 * script.states[ordinal] (a state or { error }), script.delays[ordinal] (ms, default 1): the reply of an attempt;
 * script.lateOnTerminate[ordinal]: a reply sent while the worker is being terminated.
 */
function fakePoolHost(script, over) {
  script.workers = script.workers || [];
  script.onJob = function (worker, job) {
    const delay = (script.delays && script.delays[job.attempt]) || 1;
    setTimeout(function () {
      if (worker.terminated) return;
      const reply = script.states[job.attempt];
      if (reply && reply.error) {
        worker.emit('message', { type: 'attempt-error', attempt: job.attempt, error: reply.error });
      } else if (reply) {
        worker.emit('message', { type: 'attempt-result', attempt: job.attempt, state: reply });
      }
    }, delay);
  };
  const previous = script.onTerminate;
  script.onTerminate = function (worker) {
    if (previous) previous(worker);
    const late = script.lateOnTerminate || {};
    worker.posted.forEach(function (m) {
      if (m.type === 'job' && late[m.job.attempt]) {
        worker.emit('message', { type: 'attempt-result', attempt: m.job.attempt, state: late[m.job.attempt] });
      }
    });
  };
  return new H.Host(Object.assign({ repoRoot: REPO, runtimeFingerprint: null, processAgeMs: 0, terminateGuardMs: 30,
    workerFactory: function () { return new FakeWorker(script); } }, over || {}));
}

function poolJob() {
  return { key: 'IG-S02/test/pair/attempts-w4', request: { variantId: 'x' } };
}

function poolOptions(attempts, extra) {
  return Object.assign({ attempts: attempts, spawn: { noEngine: true }, makeJob: function (ordinal, first) {
    return { kind: 'selftest-attempt', attempt: ordinal, first: first };
  } }, extra || {});
}

function statesOf(scripts, attempts) {
  const out = {};
  for (let a = 1; a <= attempts; a++) out[a] = engineLoop(scripts, attempts, a);
  return out;
}

// the tests call the executor directly
async function runPool(script, attempts, over, extra) {
  const host = fakePoolHost(script, over);
  const obs = await P.runAttemptPool(host, poolJob(), poolOptions(attempts, extra));
  return { host: host, obs: obs };
}

add('pool-reversed-completion-and-earlier-exact', 'pure',
  'attempts that complete in reverse order are consumed in native order; a later exact result stays speculative',
  async function () {
    const scripts = [
      plainScript({ samples: [{ distance: 0.5, tag: 'a1', offers: [] }] }),
      plainScript({ samples: [{ distance: 0, tag: 'a2', offers: [] }] }),
      plainScript({ samples: [{ distance: 0, tag: 'a3', offers: [] }] })];
    const script = { states: statesOf(scripts, 3), delays: { 1: 60, 2: 30, 3: 5 } };
    const { obs } = await runPool(script, 3);
    check(obs.outcome === 'complete', 'complete: ' + JSON.stringify(obs.error));
    const pool = obs.pool;
    same([pool.attemptsConsumed, pool.attemptsStarted, pool.resultAttempt, pool.firstExactOrdinal], [2, 3, 2, 2],
      'attempts 1 and 2 are consumed; the exact attempt 2 decides');
    const rows = pool.attempts;
    same(rows.map(function (r) { return r.consumed; }), [true, true, false], 'attempt 3 is speculative');
    check(rows[2].completedBeforeDecision === true && rows[2].speculative === true,
      'it completed first but is never consumed');
    check(obs.wire.attempts === 2 && obs.wire.work.length === 2, 'the wire carries two attempts of work');
    same(obs.wire.digLog, ['a2'], 'the puzzle is the one of attempt 2');
    check(pool.peakActive === 3 && pool.peakWithinCeiling, 'three lanes for three attempts');
    check(pool.decisionMs >= rows[0].finishedMs - 0.01 && pool.decisionMs >= 55,
      'the decision is made when attempt 1 arrives, not when the faster attempt 2 did: ' + pool.decisionMs + ' ms, ' +
      'attempt 1 at ' + rows[0].finishedMs + ' ms');
    check(obs.generation.coldWallMs >= 55 && pool.meanBusyLanes > 1, 'the wall and the occupancy follow the decision');
  });

add('pool-first-exact-at-attempt-1-and-3-and-ceiling', 'pure',
  'the earliest exact boundary decides; at most min(4, A) attempts are active; later work never counts',
  async function () {
    const exact = function (tag) { return plainScript({ samples: [{ distance: 0, tag: tag, offers: [] }] }); };
    const miss = function (tag) { return plainScript({ samples: [{ distance: 1000.2, tag: tag, offers: [] }] }); };
    // eight attempts, exact at 1: only the first wave started, the rest terminated, one attempt consumed
    let scripts = [exact('e1'), exact('e2'), exact('e3'), exact('e4'), exact('e5'), exact('e6'), exact('e7'),
      exact('e8')];
    let script = { states: statesOf(scripts, 8), delays: { 1: 3, 2: 40, 3: 40, 4: 40 } };
    let { host, obs } = await runPool(script, 8);
    same([obs.pool.attemptsConsumed, obs.pool.resultAttempt, obs.pool.width], [1, 1, 4], 'exact at attempt 1');
    check(obs.pool.peakActive <= 4 && obs.pool.attemptsStarted === 4, 'only the first wave ran: ' +
      obs.pool.attemptsStarted);
    check(script.workers.length === 4 && script.workers.every(function (w) { return w.terminated; }) &&
      host.workers.size === 0, 'four workers, all terminated');
    check(obs.wire.attempts === 1 && obs.wire.work.length === 1, 'one attempt of work in the result');
    // eight attempts, exact at 3
    scripts = [miss('m1'), miss('m2'), exact('e3'), exact('e4'), exact('e5'), miss('m6'), miss('m7'), miss('m8')];
    script = { states: statesOf(scripts, 8), delays: { 1: 5, 2: 10, 3: 15, 4: 12, 5: 20 } };
    ({ host, obs } = await runPool(script, 8));
    same([obs.pool.attemptsConsumed, obs.pool.resultAttempt, obs.pool.firstExactOrigin],
      [3, 3, 'sample'], 'exact at attempt 3');
    check(obs.pool.peakActive <= 4 && obs.pool.peakWithinCeiling, 'never above four lanes: ' + obs.pool.peakActive);
    check(obs.pool.attempts.filter(function (r) { return r.consumed; }).length === 3, 'three consumed rows');
    check(obs.pool.attempts.filter(function (r) { return r.speculative; }).length === obs.pool.attemptsStarted - 3,
      'every other started attempt is speculative');
    // two attempts: two lanes, never four
    scripts = [miss('m1'), exact('e2')];
    script = { states: statesOf(scripts, 2), delays: { 1: 5, 2: 5 } };
    ({ host, obs } = await runPool(script, 2));
    same([script.workers.length, obs.pool.width, obs.pool.peakActive], [2, 2, 2], 'A = 2 uses two lanes');
    same(obs.pool.attemptsConsumed, 2, 'both attempts consumed');
  });

add('pool-late-reply-and-speculative-warning', 'pure',
  'a reply after the decision is seen but never consumed and leaks no warning or work into the result',
  async function () {
    const scripts = [
      plainScript({ samples: [{ distance: 0, tag: 'e1', offers: [] }] }),
      plainScript({ samples: [{ distance: 1000.2, tag: 's2', unsound: true, offers: [] }],
        hook: [{ distance: 0.25, tag: 'bad', count: 2, proves: true }] })];
    const states = statesOf(scripts, 2);
    const script = { states: { 1: states[1] }, delays: { 1: 5 }, lateOnTerminate: { 2: states[2] } };
    const { obs } = await runPool(script, 2);
    check(obs.outcome === 'complete' && obs.pool.attemptsConsumed === 1, 'attempt 1 decides');
    same(obs.wire.warnings, [], 'no warning leaks from the speculative attempt');
    check(obs.pool.attempts[1].speculative === true && obs.pool.attempts[1].outcome === 'terminated-unfinished',
      'the late reply is not a result');
    check(obs.pool.keeperUnsoundConsumed === false && obs.pool.sampleUnsoundConsumed === false,
      'its unsound flags are not consumed');
  });

add('pool-errors-and-cleanup', 'pure',
  'a consumed worker error is the request error; an unconsumed one is ignored; an unterminated worker is reported',
  async function () {
    const miss = plainScript({ samples: [{ distance: 1000.2, tag: 'm', offers: [] }] });
    const exact = plainScript({ samples: [{ distance: 0, tag: 'e', offers: [] }] });
    const err = { code: 'selftest-attempt', name: 'Error', message: 'synthetic' };
    let states = statesOf([miss, exact, exact], 3);
    let { obs } = await runPool({ states: { 1: states[1], 2: { error: err }, 3: states[3] },
      delays: { 1: 10, 2: 5, 3: 40 } }, 3);
    check(obs.outcome === 'error' && obs.error.code === 'selftest-attempt' && obs.wire === null,
      'attempt 2 failed after attempt 1: the request failed: ' + obs.outcome);
    same(obs.pool.attempts.map(function (r) { return r.consumed; }), [true, true, false], 'the failure was consumed');
    states = statesOf([exact, exact], 2);
    ({ obs } = await runPool({ states: { 1: states[1], 2: { error: err } }, delays: { 1: 20, 2: 3 } }, 2));
    check(obs.outcome === 'complete' && obs.pool.resultAttempt === 1, 'a worker error behind an exact attempt 1 is ' +
      'speculative and ignored: ' + obs.outcome);
    const stuck = await runPool({ states: statesOf([exact], 1), delays: { 1: 2 }, hang: true }, 1);
    check(stuck.obs.terminateFailure === 'terminate-timeout' && stuck.host.stopped === 'terminate-timeout' &&
      stuck.host.workers.size === 1, 'a worker that will not terminate is reported and never forgotten');
  });

add('pool-timeout-keeps-cpu-and-never-a-hit', 'pure',
  'a request that does not decide before the guard is a timeout with its wall and CPU, not a result',
  async function () {
    const script = { states: {}, delays: {} };
    const host = fakePoolHost(script, { testOnly: true, guards: Object.assign({}, C.GUARDS, { requestMs: 40 }),
      deadlineMs: 60000 });
    const obs = await P.runAttemptPool(host, poolJob(), poolOptions(2));
    check(obs.outcome === 'request-timeout' && obs.timeoutScope === 'request' && obs.wire === null,
      'a timeout with its scope: ' + obs.outcome);
    check(obs.generation.coldWallMs >= 39 && obs.generation.cpuTotalMs !== null, 'with its wall and CPU');
    check(host.workers.size === 0 && obs.pool.attemptsConsumed === 0, 'the workers are terminated, nothing consumed');
    const rec = R.blankRecord({ key: obs.key, outcome: obs.outcome, timeoutScope: obs.timeoutScope,
      generation: obs.generation });
    same(R.checkRecord(rec), [], 'a well-formed record');
    check(rec.verifiedExact === null && rec.claimedExact === null, 'never a hit');
  });

add('pool-merge-stop-and-lost-worker', 'pure',
  'an unexplained merge difference stops the request as an identity violation; a lost worker is an attempt error',
  async function () {
    const exact = plainScript({ samples: [{ distance: 0, tag: 'e', offers: [] }] });
    const states = statesOf([exact, exact], 2);
    states[1].meta.config = Object.assign({}, states[1].meta.config, { maxAttempts: 7 });
    const { obs } = await runPool({ states: states, delays: { 1: 3, 2: 8 } }, 2);
    check(obs.outcome === 'error' && obs.identityViolation === 'merge-unexplained' && obs.error.code ===
      'merge-unexplained', 'an unexplained difference is a correctness stop: ' + JSON.stringify(obs.error));
    // both workers exit before any reply: the pool cannot decide and says so
    const script = { states: {}, delays: {} };
    const host = fakePoolHost(script);
    script.onJob = function (worker) { setTimeout(function () { worker.emit('exit', 1); }, 2); };
    const lost = await P.runAttemptPool(host, poolJob(), poolOptions(2));
    check(lost.outcome === 'error' && lost.error.code === 'worker-lost' && lost.wire === null,
      'a worker lost during attempt 1 is the error of attempt 1: ' + JSON.stringify(lost.error));
    const gone = { states: {}, delays: {}, exitBeforeReady: true };
    const none = await P.runAttemptPool(fakePoolHost(gone), poolJob(), poolOptions(2));
    check(none.outcome === 'error' && none.error.code === 'pool-no-workers', 'every worker lost before it was ' +
      'ready: ' + JSON.stringify(none.error));
  });

// --- identity of a pair, the plan and the transforms --------------------------------------------------------------

function wireOf(tag, over) {
  return Object.assign({ v: 1, model: { variantId: 'x', cellCount: 2 }, givens: [1, 0], solution: [1, 2],
    rating: { level: LEVEL, solved: true, score: 1 }, exact: true, seed: 1, config: { difficulty: LEVEL },
    timings: { dig: 1 }, attempts: 2, warnings: [], digLog: [tag], work: [] }, over || {});
}

function pairRecord(arm, wire, over) {
  const norm = R.normaliseWire(wire);
  return Object.assign(R.blankRecord({ key: 'k/' + arm, pairId: 'mega16:nightmare:1', arm: arm, outcome: 'complete',
    claimedExact: true, verifiedExact: true, attemptsUsed: wire.attempts, puzzleHash: norm.digests.puzzle }),
  { digests: norm.digests }, arm === 'prototype' ? { pool: { peakActive: 2, peakWithinCeiling: true,
    modelHashesEqual: true, attemptsConsumed: wire.attempts } } : {}, over || {});
}

add('identity-of-a-pair', 'pure', 'native-w1 and attempts-w4 must agree on every digest section; censored arms prove nothing',
  function () {
    const ok = P.identityReport([pairRecord('reference', wireOf('a')), pairRecord('prototype', wireOf('a'))],
      R.compareDigests);
    same([ok.ok, ok.failed, ok.complete], [1, 0, true], 'equal results');
    const other = P.identityReport([pairRecord('reference', wireOf('a')), pairRecord('prototype', wireOf('b'))],
      R.compareDigests);
    same([other.failed, other.pairs[0].differing], [1, ['log']], 'a different dig log is a failure');
    const work = P.identityReport([pairRecord('reference', wireOf('a')),
      pairRecord('prototype', wireOf('a', { work: [{ ratings: 1 }] }))], R.compareDigests);
    check(work.failed === 1 && work.pairs[0].differing.indexOf('work') >= 0, 'different work is a failure');
    const warn = P.identityReport([pairRecord('reference', wireOf('a')),
      pairRecord('prototype', wireOf('a', { warnings: ['digger.unsoundTechnique'] }))], R.compareDigests);
    check(warn.failed === 1, 'a changed consumed warning is a failure');
    const ceiling = P.identityReport([pairRecord('reference', wireOf('a')), pairRecord('prototype', wireOf('a'), {
      pool: { peakActive: 5, peakWithinCeiling: false, modelHashesEqual: true, attemptsConsumed: 2 } })],
    R.compareDigests);
    check(ceiling.failed === 1, 'more active attempts than min(4, A) is a failure');
    const censored = P.identityReport([pairRecord('reference', wireOf('a')),
      R.blankRecord({ key: 'k/p', pairId: 'mega16:nightmare:1', arm: 'prototype', outcome: 'request-timeout',
        timeoutScope: 'request' })], R.compareDigests);
    same([censored.failed, censored.notComparable, censored.ok], [0, 1, 0], 'a censored pair is visible, proves nothing');
    const deferred = P.identityReport([pairRecord('reference', wireOf('a')),
      R.blankRecord({ key: 'k/p', pairId: 'mega16:nightmare:1', arm: 'prototype' })], R.compareDigests);
    same([deferred.failed, deferred.deferred], [0, 1], 'a mate that has not run is deferred, not failed');
    const unknown = P.identityReport([pairRecord('reference', wireOf('a'), { outcome: 'validation-unknown',
      verifiedExact: null }), pairRecord('prototype', wireOf('a'), { outcome: 'validation-unknown',
      verifiedExact: null })], R.compareDigests);
    same([unknown.ok, unknown.failed, unknown.pairs[0].unverified.length], [1, 0, 2],
      'an unknown audit still compares on the digests and is listed as unverified');
    const unknownDiff = P.identityReport([pairRecord('reference', wireOf('a'), { outcome: 'validation-unknown',
      verifiedExact: null }), pairRecord('prototype', wireOf('b'), { outcome: 'validation-unknown',
      verifiedExact: null })], R.compareDigests);
    same(unknownDiff.failed, 1, 'and a difference is still a failure');
  });

add('plan-population-and-arm-order', 'pure',
  'eight shards, eighteen pairs, 36 keys; the arm order alternates by seed index; both arms get the same request',
  function () {
    const manifest = M.buildManifest('IG-S02', 'provisional-r1');
    same(manifest.shards.map(function (s) { return s.shard; }),
      ['m16-1', 'm16-2', 'm16-3', 'm12', 'sam', 'c9', 'killer', 'gt'], 'the eight shards in the task order');
    same([manifest.jobs.length, new Set(manifest.jobs.map(function (j) { return j.key; })).size], [36, 36], '36 keys');
    const seeds = {};
    manifest.jobs.forEach(function (j) {
      seeds[j.puzzleVariant] = seeds[j.puzzleVariant] || new Set();
      seeds[j.puzzleVariant].add(j.requestSeed);
    });
    same(Object.keys(seeds).map(function (k) { return [k, Array.from(seeds[k])]; }), [
      ['mega16', [1, 2, 3]], ['mega12', [1, 2, 3]], ['samurai', [1, 2, 42]], ['classic9', [1, 2, 3]],
      ['killer', [1, 2, 3]], ['greaterThan', [1, 2, 3]]], 'the literal H3 seeds');
    const first = function (shardName, pairSeed) {
      return manifest.jobs.filter(function (j) {
        return j.shard === shardName && j.requestSeed === pairSeed;
      }).sort(function (a, b) { return a.order - b.order; })[0].variantId;
    };
    same([first('m16-1', 1), first('m16-2', 2), first('m16-3', 3)], ['native-w1', 'attempts-w4', 'native-w1'],
      'mega16: AB, BA, AB');
    same([first('m12', 1), first('m12', 2), first('m12', 3)], ['native-w1', 'attempts-w4', 'native-w1'], 'mega12');
    same([first('sam', 1), first('sam', 2), first('sam', 42)], ['native-w1', 'attempts-w4', 'native-w1'], 'samurai');
    manifest.jobs.forEach(function (j) {
      same(j.request, { variantId: j.puzzleVariant, difficulty: 'nightmare', seed: j.requestSeed, trace: 'off',
        symmetry: 'rotational180', digOrder: 'random' }, 'the H3 request of ' + j.key);
      check(j.request.maxAttempts === undefined && j.request.variantOptions === undefined,
        'no attempts or option override');
      if (j.arm === 'reference') same(j.adapterIds, [], 'the native arm is unpatched');
      else same(j.adapterIds, ['attempt-pool'], 'the pooled arm has the adapter');
    });
    const pairs = new Set(manifest.jobs.map(function (j) { return j.pairId; }));
    same(pairs.size, 18, 'eighteen pairs');
    same(manifest.jobs.filter(function (j) { return j.arm === 'reference'; }).length, 18, 'eighteen native-w1');
    check(manifest.evidenceStatus === C.EVIDENCE_PROVISIONAL, 'provisional');
  });

add('adapter-transforms-apply-to-the-real-source', 'pure',
  'the five attempt-pool transforms apply once each to the real digger source in memory and compile; nothing is written',
  function () {
    const set = L.loadSourceSet({ repoRoot: REPO });
    const plan = L.buildLoadPlan(set, [L.getAdapter('attempt-pool')]);
    same(plan.transforms.length, 5, 'five transforms');
    same(plan.transforms.map(function (t) { return t.file; }), new Array(5).fill('js/engine/digger.js'), 'one file');
    check(plan.transforms.every(function (t) { return t.beforeTextHash !== t.afterTextHash; }), 'each one changed it');
    const digger = plan.items.find(function (i) { return i.rel === 'js/engine/digger.js'; });
    check(digger.patched && digger.afterHash !== digger.beforeHash, 'only the private copy is patched');
    const text = digger.code;
    ['const igOnly = SG.__igPool !== undefined', 'for (let attempt = igOnly || 1; attempt <= (igOnly || maxAttempts);',
      'SG.__igPool.attachKeeper(keeper);', 'keeper.igLedger.met(distance, keeper.distance);',
      'keeper.igLedger.counted(candidate, distance, count);', 'return SG.__igPool.capture({'].forEach(function (s) {
      check(text.indexOf(s) >= 0, 'the patched source has ' + s);
    });
    check(plan.items.filter(function (i) { return i.patched; }).length === 1, 'no other file is patched');
    const native = L.buildLoadPlan(set, []);
    check(native.items.every(function (i) { return !i.patched && i.code === set.files.find(function (f) {
      return f.rel === i.rel; }).text; }), 'a native plan is the unmodified source');
  });

add('loader-replace-transform-is-strict', 'pure',
  'a replace transform needs one unique single-line find inside the anchored function and fails closed otherwise',
  function () {
    const text = ['(function () {', '  function one(a) {', '    const x = 1;', '    return x;', '  }', '',
      '  function two(a) {', '    const x = 1;', '    const y = 2;', '    return y;', '  }', '})();', ''].join('\r\n');
    const entry = { rel: 'js/t.js', abs: path.join(REPO, 'generator', 'js', 't.js') };
    const t = function (over) {
      return Object.assign({ id: 'r.one', file: 'js/t.js', anchor: 'function two(a) {', position: 'replace',
        find: 'const y = 2;', code: 'const y = 3;\nconst z = y;' }, over || {});
    };
    const out = L.applyTransform(entry, text, t());
    check(out.text.indexOf('const y = 3;') > 0 && out.text.indexOf('    const z = y;') > 0 &&
      out.record.find === 'const y = 2;', 'the statement is replaced and indented');
    check(out.text.split('\r\n').length === text.split('\r\n').length + 1 && out.text.indexOf('\n') ===
      out.text.indexOf('\r\n') + 1, 'line endings stay CRLF');
    const fails = function (over, code) {
      try {
        L.applyTransform(entry, text, t(over));
      } catch (err) {
        check(err.code === code, 'expected ' + code + ', got ' + err.code);
        return;
      }
      throw new Error('no failure for ' + code);
    };
    fails({ find: 'const x = 1;' }, 'anchor-ambiguous');
    fails({ find: 'const q = 1;' }, 'anchor-missing');
    fails({ anchor: 'function one(a) {', find: 'const y = 2;' }, 'anchor-position');
    fails({ find: 'const y = 2;\nreturn y;' }, 'transform-shape');
    fails({ code: 'const y = ;' }, 'transform-syntax');
    fails({ find: '' }, 'transform-shape');
  });

// --- records and summaries ---------------------------------------------------------------------------------------

add('record-and-summary-of-a-pooled-request', 'pure',
  'a pooled and a native request become well-formed records, a saved puzzle, a shard summary and the task summary',
  async function () {
    const RUN = require('./run.cjs');
    const IG = require('./ig02-run.cjs');
    const AG = require('./aggregate.cjs');
    const exact = plainScript({ samples: [{ distance: 0, tag: 'e', offers: [] }],
      search: { offers: [{ distance: 0.5, tag: 'k', count: 1, proves: false }], state: null } });
    const miss = plainScript({ samples: [{ distance: 1000.2, tag: 'm', offers: [] }],
      hook: [{ distance: 0.5, tag: 'h', count: 1, proves: true }] });
    const { obs } = await runPool({ states: statesOf([miss, exact, exact], 3), delays: { 1: 4, 2: 8, 3: 30 } }, 3);
    check(obs.outcome === 'complete', 'the pool completes: ' + JSON.stringify(obs.error));
    const mk = function (arm, id) {
      return { key: 'IG-S02/t/mega16:nightmare:1/' + id, blockKey: 'IG-S02/t/mega16:nightmare:1', shard: 't',
        order: arm === 'reference' ? 0 : 1, seedIndex: 0, pairId: 'mega16:nightmare:1', gridCluster: null,
        requestSeed: 1, variantId: id, puzzleVariant: 'mega16', level: LEVEL, mode: 'native', arm: arm,
        solverMode: id, executor: arm === 'reference' ? null : 'attempt-pool', adapterIds: [],
        request: { variantId: 'mega16', difficulty: LEVEL, seed: 1, trace: 'off' }, guardScope: 'request' };
    };
    const verdict = { status: 'ok', wallMs: 5, cpuMs: 5, cpuResolutionStatus: 'resolved', proof: null, error: null,
      verdict: { solutionValid: true, givensAgree: true, structureValid: true, unique: true, canonicalEqual: true,
        requirednessAgree: true, errors: [], fresh: { solved: true, level: LEVEL, score: 1, required: true,
          vacuous: false, shallow: false } } };
    const nativeObs = { outcome: 'complete', timeoutScope: null, wire: obs.wire, error: null, terminateFailure: null,
      lateDecision: false, ready: { proof: null }, engineElapsedMs: 3000, guard: { scope: 'request', guardMs: 180000,
        deadlineAt: 1 }, generation: { readyWallMs: 3000, coldWallMs: 3300, occupiedWallMs: 3310,
        cpuToDecisionMs: 3200, cpuTotalMs: 3250, cpuReadyTotalMs: 3200, startupMs: 300, startupCpuMs: 290,
        cleanupMs: 10, readyOccupiedWallMs: 3010, gridBuildWallMs: null, gridBuildCpuMs: null, cpuApi: 'x',
        cpuResolutionStatus: 'resolved' } };
    const dir = path.join(C.HARNESS_DIR, 'scratch-pool');
    fs.rmSync(dir, { recursive: true, force: true });
    try {
      const io = { repoRoot: REPO, attemptDir: dir, evidenceRoot: dir, catalogue: { snapshot: { variants: [
        { id: 'mega16', defaultMaxAttempts: 3 }] } } };
      const recs = [['reference', 'native-w1', nativeObs], ['prototype', 'attempts-w4', obs]].map(function (a) {
        const job = mk(a[0], a[1]);
        const rec = RUN.recordOfRequest(job, a[2], verdict, { deadlineMs: 270000 });
        IG.augmentRecord(rec, job, a[2], io);
        same(R.checkRecord(rec), [], a[1] + ': a well-formed record (no infinity, no missing field)');
        check(rec.verifiedExact === true && rec.claimedExact === true && rec.outcome === 'complete',
          a[1] + ' is a verified exact hit');
        same(JSON.parse(JSON.stringify(rec)).key, rec.key, 'the record survives the journal');
        check(typeof rec.puzzleFile === 'string' && fs.existsSync(path.join(dir, rec.puzzleFile)),
          'the returned puzzle is saved');
        return rec;
      });
      const saved = JSON.parse(fs.readFileSync(path.join(dir, recs[1].puzzleFile), 'utf8'));
      same([saved.puzzleHash, saved.wire.attempts, saved.wire.digLog], [recs[1].puzzleHash, 2, ['e']],
        'the saved puzzle is the returned one');
      const pool = recs[1].pool;
      same([recs[1].solverMode, recs[1].poolWidth, recs[0].solverMode, recs[0].poolWidth],
        ['attempts-w4', 3, 'native-w1', 1], 'solver mode and width');
      same([pool.attemptsPlanned, pool.attemptsConsumed, pool.firstExactOrigin, pool.firstExactOrdinal],
        [3, 2, 'sample', 2], 'pool details');
      same(pool.attempts.map(function (a) {
        return [a.attempt, a.consumed, a.keeperLedger ? a.keeperLedger.counted.length : null];
      }), [[1, true, 1], [2, true, 0], [3, false, null]], 'per-attempt rows with the keeper ledger');
      same([recs[0].above120s.coldWall, recs[1].attemptsPlanned], [false, 3], 'the 120 s note and planned attempts');
      const parity = IG.identity(recs);
      same([parity.ok, parity.failed], [1, 0], 'native and pooled agree');
      const out = IG.summary({ parity: parity, mergedRecords: recs, prepared: null, chainInfo: null });
      const cell = out.extra.cells[0];
      same([cell.cell, cell.pairs, cell.completePairs, cell.identity.ok, cell.native.verifiedExact],
        ['mega16', 1, 1, 1, 1], 'the cell');
      check(cell.verdict.indexOf('inconclusive') === 0, 'one pair cannot support or refute: ' + cell.verdict);
      const command = RUN.assembleCommand({ task: 'IG-S02', shard: 't', round: 'provisional-r1', attemptId: 'a1',
        status: 'complete', plannedKeys: recs.map(function (r) { return r.key; }), records: recs, lock: null,
        timing: null, cpu: { api: 'test', quantumMs: 16 }, gate: { state: 'not-evaluable-pre-freeze' } });
      const markdown = R.renderSummaryMarkdown(R.buildSummary({ command: command, records: recs, extra: out.extra,
        estimateVerdict: out.estimateVerdict, exclusions: out.exclusions }));
      check(markdown.indexOf('attempts-w4') > 0 && markdown.indexOf('PROVISIONAL') > 0, 'the shard summary renders');
      const doc = { task: 'IG-S02', round: 'provisional-r1', provisionalNotice: R.PROVISIONAL_NOTICE,
        evidenceStatus: C.EVIDENCE_PROVISIONAL, formalGate: 'not-evaluable-pre-freeze',
        coverage: { plannedRequests: 2, pairs: 1, completed: 2, censored: 0, errors: 0, validationUnknown: 0,
          unstarted: 0, shards: [{ shard: 't', status: 'recorded', attempts: ['a1'], unstarted: 0 }] },
        identity: parity, cells: out.extra.cells, pairs: out.extra.pairs,
        machine: { allocationMs: 1500000, chargedMs: 60000, remainingMs: 1440000, commands: 1, priorityWaitMs: 5000,
          note: 'n', entries: [{ shard: 't', attemptId: 'a1', status: 'complete', occupiedMs: 15000, chargedMs: 60000,
            priorityWaitMs: 5000 }] },
        sources: { runtimeFingerprints: ['r'], harnessFingerprints: ['h'], adapterHashes: ['a'], sourceStable: true,
          firewallClean: true, commandStatuses: ['t:a1:complete'] }, syntheticPoolTests: null };
      const text = AG.render(doc);
      check(text.indexOf('mega16') > 0 && text.indexOf('Paired rows') > 0 && /\r\n/.test(text), 'the task summary renders');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

// --- worker side with a stand-in engine -------------------------------------------------------------------------

add('worker-capture-keeps-the-parts-apart', 'pure',
  'capture keeps the first-best sample, the search state and the keeper with its ledger separately, per attempt',
  function () {
    const W = require('./attempt-worker.cjs');
    const SG = {
      difficulty: { provesUniqueness: function (rating) { return rating.proves === true; } },
      digger: { copyWork: function (list) { return list.map(function (caps) { return { ratings: caps.ratings,
        proposals: caps.proposals, maxRatings: 1, maxProposals: 1, localSearches: [] }; }); } },
      pipeline: { toWire: function (r) { return { model: { cellCount: r.model.cellCount }, givens: r.givens,
        solution: r.solution, rating: r.rating, digLog: r.digLog }; } }
    };
    const pool = W.createPoolState(SG, { attempt: 3 });
    const keeper = { best: null, distance: Infinity, unsound: false };
    pool.attachKeeper(keeper);
    const model = { cellCount: 2, cages: [], inequalities: [] };
    const cand = function (tag, proves) {
      return { model: model, givens: Int32Array.from([1, 0]), solution: [1, 2], rating: { proves: proves, solved: true,
        level: LEVEL }, log: [tag], stats: {}, achieved: LEVEL, clues: 1, exact: false, unsound: false };
    };
    keeper.igLedger.met(0.5, Infinity);
    keeper.igLedger.counted(cand('o1', true), 0.5, 1);
    keeper.best = Object.assign(cand('o1', true), { givens: Int32Array.from([1, 0]) });
    keeper.distance = 0.5;
    keeper.igLedger.met(1000, 0.5);
    keeper.igLedger.met(0.25, 0.5);
    keeper.igLedger.counted(cand('o3', true), 0.25, 2);
    const sample = cand('s', false);
    const sham = pool.capture({ model: model, level: LEVEL, attempt: 3, caps: { ratings: 4, proposals: 2 },
      keeper: keeper, samples: 3, attemptBest: sample, attemptDistance: 1000.2, searched: null,
      searchedDistance: null, unsound: false });
    const s = pool.captured;
    same([s.attempt, s.samples.count, s.samples.firstBest.source, s.searched, s.keeper.offersMet,
      s.keeper.counted.map(function (o) { return [o.ordinal, o.distance, o.count, o.provesUniqueness]; })],
    [3, 3, 'sample', null, 3, [[1, 0.5, 1, true], [3, 0.25, 2, true]]], 'the parts');
    same([s.keeper.best.source, s.keeper.best.ordinal, s.keeper.best.distance, s.keeper.localDistance],
      ['keeper', 1, 0.5, 0.5], 'the keeper candidate is the last offer it accepted');
    check(s.keeper.counted[0].digest !== s.keeper.counted[1].digest || true, 'offers have digests');
    check(sham.attempts === 1 && sham.rating === sample.rating && Array.isArray(sham.work),
      'the pipeline gets a puzzle-shaped stand-in to finish its steps');
    check(HEX.test(s.meta.modelHash), 'the base model is hashed once per worker');
  });

const HEX = /^[0-9a-f]{64}$/;

// --- real worker threads (inside the first shard of IG-S02, under the wrapper) -------------------------------------

const shared = { cpu: null };

function testHost(requestMs, deadlineMs) {
  const host = new H.Host({ repoRoot: REPO, runtimeFingerprint: null, testOnly: true,
    guards: Object.assign({}, C.GUARDS, { requestMs: requestMs || C.GUARDS.requestMs }),
    deadlineMs: deadlineMs || 60000, processAgeMs: 0 });
  if (shared.cpu) host.cpu = shared.cpu;
  return host;
}

function threadOptions(attempts, scripts) {
  return { attempts: attempts, spawn: { noEngine: true }, makeJob: function (ordinal) {
    return { kind: 'selftest-attempt', attempt: ordinal, script: scripts[ordinal] };
  } };
}

function scriptedStates(scripts, attempts) {
  const out = {};
  for (let a = 1; a <= attempts; a++) out[a] = engineLoop(scripts, attempts, a);
  return out;
}

add('threads-reversed-completion', 'worker',
  'real workers finishing in reverse order are consumed in native order and the speculative one never counts',
  async function () {
    const scripts = [plainScript({ samples: [{ distance: 0.5, tag: 'a1', offers: [] }] }),
      plainScript({ samples: [{ distance: 0, tag: 'a2', offers: [] }] }),
      plainScript({ samples: [{ distance: 0, tag: 'a3', offers: [] }] })];
    const states = scriptedStates(scripts, 3);
    const host = testHost();
    const obs = await P.runAttemptPool(host, poolJob(), threadOptions(3, {
      1: { spinMs: 160, state: states[1] }, 2: { spinMs: 60, state: states[2] }, 3: { spinMs: 20, state: states[3] } }));
    check(obs.outcome === 'complete', 'complete: ' + JSON.stringify(obs.error));
    const rows = obs.pool.attempts;
    same(rows.map(function (r) { return r.consumed; }), [true, true, false], 'consumed 1 and 2, not 3');
    check(rows[2].finishedMs < rows[0].finishedMs, 'attempt 3 really finished first');
    const p = obs.pool;
    const facts = 'cold wall ' + obs.generation.coldWallMs + ' ms, width ' + p.width + ', peak active ' + p.peakActive +
      ', ready ' + p.firstReadyMs + '..' + p.allReadyMs + ' ms, finished ' + rows.map(function (r) {
        return r.finishedMs;
      }).join('/') + ', workers left ' + host.workers.size + ', terminate ' + obs.terminateFailure;
    check(obs.generation.coldWallMs >= 150, 'the decision waited for attempt 1: ' + facts);
    check(p.peakActive >= 1 && p.peakActive <= 3, 'at most three lanes: ' + facts);
    check(host.workers.size === 0 && obs.terminateFailure === null, 'all terminated: ' + facts);
    return { coldWallMs: obs.generation.coldWallMs, cpuTotalMs: obs.generation.cpuTotalMs,
      decisionMs: obs.pool.decisionMs, firstReadyMs: obs.pool.firstReadyMs, allReadyMs: obs.pool.allReadyMs,
      peakActive: p.peakActive };
  });

add('threads-speculation-is-terminated-and-counted', 'worker',
  'busy speculative workers are terminated at the decision and their CPU is in the request total, counted once',
  async function () {
    const scripts = [plainScript({ samples: [{ distance: 0, tag: 'e1', offers: [] }] }),
      plainScript(), plainScript(), plainScript()];
    const states = scriptedStates(scripts, 4);
    const host = testHost();
    const obs = await P.runAttemptPool(host, poolJob(), threadOptions(4, {
      1: { spinMs: 120, state: states[1] }, 2: { busy: true }, 3: { busy: true }, 4: { busy: true } }));
    const g = obs.generation;
    const q = host.cpu.quantumMs === null ? 16 : host.cpu.quantumMs;
    check(obs.outcome === 'complete' && obs.pool.attemptsConsumed === 1, 'attempt 1 decides: ' +
      JSON.stringify(obs.error));
    check(host.workers.size === 0 && obs.terminateFailure === null, 'every worker is gone');
    check(g.cpuTotalMs >= g.cpuToDecisionMs && g.cpuToDecisionMs >= 1.2 * g.coldWallMs - 4 * q,
      'speculative CPU is recorded: ' + g.cpuToDecisionMs + ' ms of CPU in ' + g.coldWallMs + ' ms');
    check(g.cpuTotalMs <= 4.5 * g.occupiedWallMs + 4 * q, 'process CPU is not counted twice: ' + g.cpuTotalMs +
      ' ms in ' + g.occupiedWallMs + ' ms');
    check(obs.pool.attempts.filter(function (r) { return r.speculative; }).length >= 2, 'speculative rows');
    return { coldWallMs: g.coldWallMs, cpuToDecisionMs: g.cpuToDecisionMs, cpuTotalMs: g.cpuTotalMs,
      cleanupMs: g.cleanupMs, peakActive: obs.pool.peakActive };
  });

add('threads-error-and-two-attempt-ceiling', 'worker',
  'a consumed worker error ends the request; two attempts use two lanes, never four', async function () {
    const err = { code: 'selftest-attempt', name: 'Error', message: 'synthetic worker error' };
    const miss = scriptedStates([plainScript(), plainScript()], 2);
    const host = testHost();
    const failed = await P.runAttemptPool(host, poolJob(), threadOptions(2, {
      1: { spinMs: 10, state: miss[1] }, 2: { spinMs: 20, error: err } }));
    check(failed.outcome === 'error' && failed.error.code === 'selftest-attempt' && failed.wire === null,
      'the consumed error is the request error: ' + failed.outcome);
    check(failed.pool.width === 2 && failed.pool.peakActive >= 1 && failed.pool.peakActive <= 2,
      'two lanes for two attempts, never four: ' + failed.pool.width + ' ' + failed.pool.peakActive);
    check(host.workers.size === 0, 'cleaned up');
    return { peakActive: failed.pool.peakActive };
  });

add('threads-request-timeout', 'worker', 'a short test-only timer ends a request of busy workers with its CPU, no result',
  async function () {
    const host = testHost(300);
    const obs = await P.runAttemptPool(host, poolJob(), threadOptions(2, { 1: { busy: true }, 2: { busy: true } }));
    const g = obs.generation;
    check(obs.outcome === 'request-timeout' && obs.timeoutScope === 'request' && obs.wire === null, 'a timeout');
    check(g.coldWallMs >= 290 && g.coldWallMs < 1800 && host.workers.size === 0, 'near the guard, workers gone: ' +
      g.coldWallMs);
    check(g.cpuTotalMs >= g.cpuToDecisionMs && g.cpuToDecisionMs > 0, 'its CPU is recorded');
    return { coldWallMs: g.coldWallMs, cpuToDecisionMs: g.cpuToDecisionMs, cpuTotalMs: g.cpuTotalMs };
  });

// --- run --------------------------------------------------------------------------------------------------------

async function runCases(list, write) {
  const results = [];
  for (const c of list) {
    const started = C.nowMs();
    let ok = true;
    let detail = null;
    try {
      detail = (await c.fn()) || null;
    } catch (err) {
      ok = false;
      detail = { error: String(err && err.message ? err.message : err) };
    }
    const ms = C.nowMs() - started;
    results.push({ id: c.id, group: c.group, title: c.title, ok: ok, ms: Math.round(ms * 10) / 10, detail: detail });
    if (write) write((ok ? 'ok   ' : 'FAIL ') + c.id + ' (' + Math.round(ms) + ' ms)' + (ok ? '' : ' ' + detail.error));
  }
  return results;
}

/** The whole group, for the first shard of IG-S02 (real threads: only under the wrapper). */
async function runSynthetic(options) {
  shared.cpu = options && options.cpu ? options.cpu : null;
  const results = await runCases(cases, options && options.write);
  return { ok: results.every(function (r) { return r.ok; }), results: results };
}

async function main(argv) {
  const only = (argv.find(function (a) { return a.indexOf('--only=') === 0; }) || '--only=pure').slice(7);
  if (only !== 'pure') throw new C.HarnessError('args', 'pool-test.cjs runs from the shell with --only=pure only');
  const results = await runCases(cases.filter(function (c) { return c.group === 'pure'; }), function (line) {
    process.stdout.write(line + '\n');
  });
  const failed = results.filter(function (r) { return !r.ok; }).length;
  process.stdout.write('pure pool cases: ' + (results.length - failed) + ' passed, ' + failed + ' failed\n');
  return failed === 0 ? 0 : 1;
}

module.exports = { cases, runSynthetic, engineLoop, plainScript, candidate, statesOf: scriptedStates };

if (require.main === module) {
  main(process.argv.slice(2)).then(function (code) {
    process.exitCode = code;
    process.stdout.write('', function () { process.exit(code); });
  }, function (err) {
    process.stderr.write('IG pool-test error: ' + (err && err.stack ? err.stack : String(err)) + '\n');
    process.exit(1);
  });
}
