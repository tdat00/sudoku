'use strict';

/*
 * MS05e scratch driver: Greater-Than generation by literal seeds, as CV6 of tests/manual/greater-than.test.js
 * makes it. One run, one file, no hidden loop. Run it only under Invoke-Dv3Node (docs/difficulty-v3/evidence/MS05e).
 *
 *   node tests/artifacts/difficulty-v3/MS05e/measure-gt.js --mode=diagnose|measure --level=<id> --from=N --count=N
 *        --repeat=N --json=<project-relative path>
 *
 * Seeds are the literal from+i (not perf.js's seedBase+i*101, not soak's FNV tags). Each request is
 * `SG.pipeline.run({ variantId: 'greaterThan', difficulty: level, seed, trace: 'summary' }, sink)`: the default
 * configuration and no budget, as CV6 does, no warm-up and no support override. The request is timed alone
 * (`performance.now()` around the call); every validity, uniqueness, symmetry and minimality check runs afterwards.
 *
 * The registered 'signs' strategy is wrapped (get / unregister / register, restored in a finally) in both modes:
 *   measure   only adds the counters of the returned sample's `stats` (a function call and a few additions per
 *             sample, so the request-wide oracle work can be reported); the headline timing is the pipeline's.
 *   diagnose  also copies each sample's result and the position of the current `dig` step (attempt, sample, read
 *             from the step start event) and, after the timed request, classifies every sample, rates it and
 *             verifies that its sign set is minimal (each remaining sign removed, solutions counted up to 2; an
 *             error or a time-out is `null`, unknown, never minimal). That is diagnosis, not headline latency.
 * No production source is edited to capture anything.
 */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');

const HERE = __dirname;
const GENERATOR = path.resolve(HERE, '..', '..', '..', '..');
const REPO = path.resolve(GENERATOR, '..');
const PROCESS_CEILING_MS = 540000;
// A request cannot be interrupted, so no new one starts when it could not end before the ceiling at the pace of
// the slowest request so far; the rest is recorded as unstarted, not as a result.
const START_MARGIN_MS = 60000;
const MINIMAL_CHECK_MS = 20000;

const VARIANT = 'greaterThan';
const LEVELS = ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1', 'hell2'];

function parseArgs(argv) {
  const out = { mode: null, level: null, from: null, count: null, repeat: null, json: null };
  argv.forEach((arg) => {
    let m;
    if ((m = /^--mode=(diagnose|measure)$/.exec(arg))) out.mode = m[1];
    else if ((m = /^--level=([A-Za-z0-9]+)$/.exec(arg))) out.level = m[1];
    else if ((m = /^--from=(\d+)$/.exec(arg))) out.from = Number(m[1]);
    else if ((m = /^--count=(\d+)$/.exec(arg))) out.count = Number(m[1]);
    else if ((m = /^--repeat=(\d+)$/.exec(arg))) out.repeat = Number(m[1]);
    else if ((m = /^--json=(.+)$/.exec(arg))) out.json = m[1];
    else throw new Error('unknown argument ' + arg);
  });
  Object.keys(out).forEach((k) => {
    if (out[k] === null) throw new Error('missing --' + k);
  });
  if (LEVELS.indexOf(out.level) === -1) throw new Error('unknown level ' + out.level);
  if (out.count < 1) throw new Error('--count must be at least 1');
  if (path.isAbsolute(out.json)) throw new Error('--json: give a project-relative path');
  return out;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function readText(abs) {
  return fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, '');
}

/** SOURCE_FILES of tests/node-runner.js, hashed like soak.js: `<path>\0<text with LF line ends>`. */
function sourceIdentity() {
  const runner = readText(path.join(GENERATOR, 'tests', 'node-runner.js'));
  const match = /const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner);
  const files = (match[1].match(/'[^']+'/g) || []).map((s) => s.slice(1, -1));
  const hash = crypto.createHash('sha256');
  let loaded = 0;
  files.forEach((rel) => {
    const abs = path.join(GENERATOR, rel);
    if (!fs.existsSync(abs)) return;
    hash.update(rel + '\0' + readText(abs).replace(/\r\n/g, '\n'));
    loaded++;
  });
  const own = (rel) => sha256(readText(path.join(GENERATOR, rel)).replace(/\r\n/g, '\n'));
  return {
    hash: hash.digest('hex'), files: loaded,
    greaterThanHash: own('js/variants/greater-than.js'),
    diggerHash: own('js/engine/digger.js'),
    toolHash: sha256(readText(__filename).replace(/\r\n/g, '\n'))
  };
}

function gitState() {
  const git = (args) => childProcess.execFileSync('git', args, {
    cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true
  });
  try {
    const commit = git(['rev-parse', 'HEAD']).trim();
    const changed = git(['status', '--porcelain', '--', '.', ':(exclude)docs/difficulty-v3/evidence',
      ':(exclude)generator/tests/artifacts']).split(/\r?\n/).filter((line) => line !== '');
    return { commit: commit, dirty: changed.length > 0, dirtyFiles: changed.slice(0, 50) };
  } catch (err) {
    return { commit: null, dirty: null, dirtyFiles: [] };
  }
}

function machineInfo() {
  const cpus = os.cpus();
  return {
    platform: os.platform(), release: os.release(), arch: os.arch(),
    cpuModel: cpus.length > 0 ? cpus[0].model.trim() : null, cpus: cpus.length,
    memoryGiB: Math.round(os.totalmem() / 2 ** 30 * 10) / 10
  };
}

/** What the lock file of Invoke-Dv3Node says (read only): the owner process, the task and the time. */
function lockState() {
  const file = path.join(os.tmpdir(), 'dv3-sudoku.lock');
  try {
    return { file: file, content: fs.readFileSync(file, 'utf8') };
  } catch (err) {
    return { file: file, content: null };
  }
}

/** Nearest-rank percentile, exactly as tests/manual/greater-than.test.js does it. */
function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
}

function round3(x) {
  return typeof x === 'number' ? Math.round(x * 1000) / 1000 : x;
}

function writeAtomic(rel, text) {
  const abs = path.resolve(process.cwd(), rel);
  const root = path.resolve(REPO) + path.sep;
  if (!(abs + path.sep).startsWith(root)) throw new Error(rel + ': the path must stay inside the repository');
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const partial = abs + '.partial';
  fs.writeFileSync(partial, text, 'utf8');
  fs.renameSync(partial, abs);
  return abs;
}

/** A copy of the per-attempt work the pipeline result carries (ratings, proposals and the local searches). */
function workOf(work) {
  if (!Array.isArray(work)) return null;
  return work.map((a) => ({
    ratings: a.ratings, proposals: a.proposals,
    localSearches: Array.isArray(a.localSearches) ? a.localSearches.map((s) => ({
      ratings: s.ratings, proposals: s.proposals, firstShallowAt: s.firstShallowAt,
      shallowRatings: s.shallowRatings, capHit: s.capHit
    })) : []
  }));
}

function sumWork(work) {
  const total = { ratings: 0, proposals: 0, localSearches: 0, shallowRatings: 0 };
  (work || []).forEach((a) => {
    total.ratings += a.ratings;
    total.proposals += a.proposals;
    a.localSearches.forEach((s) => {
      total.localSearches++;
      total.shallowRatings += s.shallowRatings || 0;
    });
  });
  return total;
}

function main(argv) {
  const opts = parseArgs(argv);
  require('../../../replay-fixtures.js').nodeEnv().engine();
  const engine = globalThis.SG;
  const identity = sourceIdentity();
  const git = gitState();
  const startedAt = new Date();
  const started = process.hrtime.bigint();
  const diagnose = opts.mode === 'diagnose';
  const elapsedTotal = () => Number(process.hrtime.bigint() - started) / 1e6;

  const original = engine.digger.getStrategy('signs');
  const request = {
    events: 0, calls: 0, tried: 0, accepted: 0, rejected: 0, oracleCalls: 0, skipped: 0, digMs: 0
  };
  let where = null;
  let captured = [];

  function record(result, options, ms) {
    request.calls++;
    request.digMs += ms;
    const s = result.stats || {};
    ['tried', 'accepted', 'rejected', 'oracleCalls', 'skipped'].forEach((k) => { request[k] += s[k] || 0; });
    if (!diagnose) return;
    captured.push({
      where: where ? Object.assign({}, where) : null,
      ms: ms,
      givens: Int32Array.from(result.givens),
      clues: result.clues,
      model: result.model || null,
      rating: result.rating || null,
      stats: Object.assign({}, s),
      log: Array.isArray(options && options.log) ? options.log.slice() : [],
      spec: options && options.spec ? { min: options.spec.min, max: options.spec.max,
        minClues: options.spec.minClues } : null
    });
  }

  function wrapper(model, solution, level, rng, options) {
    const t0 = performance.now();
    const found = original(model, solution, level, rng, options);
    if (engine.budget.isSteps(found)) {
      return (function* inner() {
        const result = yield* found;
        record(result, options, performance.now() - t0);
        return result;
      })();
    }
    record(found, options, performance.now() - t0);
    return found;
  }

  function sink(ev) {
    request.events++;
    if (diagnose && ev.type === 'step' && ev.stepId === 'dig' && ev.phase === 'start') where = ev.i18nArgs;
  }

  const config = {
    variantId: VARIANT, difficulty: opts.level, seed: 0, trace: 'summary'
  };
  const requests = [];
  const unstarted = [];
  let slowest = 0;

  engine.digger.unregisterStrategy('signs');
  engine.digger.registerStrategy('signs', wrapper);
  try {
    for (let i = 0; i < opts.count; i++) {
      const seed = opts.from + i;
      if (elapsedTotal() + Math.max(slowest * 1.5, 0) + START_MARGIN_MS > PROCESS_CEILING_MS) {
        for (let k = i; k < opts.count; k++) unstarted.push(opts.from + k);
        break;
      }
      Object.keys(request).forEach((k) => { request[k] = 0; });
      captured = [];
      where = null;
      let result = null;
      let error = null;
      const cfg = Object.assign({}, config, { seed: seed });
      const t0 = performance.now();
      try {
        result = engine.pipeline.run(cfg, sink);
      } catch (err) {
        error = { code: err && err.code || null, name: err && err.name || null,
          message: String(err && err.message || err), work: workOf(err && err.work) };
      }
      const elapsedMs = performance.now() - t0;
      slowest = Math.max(slowest, elapsedMs);
      const rec = { seed: seed, ok: error === null, elapsedMs: round3(elapsedMs) };
      rec.counters = {
        events: request.events, samplesDug: request.calls, tried: request.tried, accepted: request.accepted,
        rejected: request.rejected, oracleCalls: request.oracleCalls, digMs: round3(request.digMs)
      };
      if (error !== null) {
        rec.error = error;
        rec.work = error.work;
      } else {
        Object.assign(rec, summarize(engine, opts.level, result));
        rec.checks = checks(engine, opts.level, result);
      }
      if (diagnose) rec.samples = analyseSamples(engine, opts.level, captured);
      requests.push(rec);
      writePartial();
    }
  } finally {
    engine.digger.unregisterStrategy('signs');
    engine.digger.registerStrategy('signs', original);
  }

  function writePartial() {
    writeAtomic(opts.json + '.partial', JSON.stringify(build(false)) + '\n');
  }

  function build(complete) {
    const times = requests.map((r) => r.elapsedMs);
    const okTimes = requests.filter((r) => r.ok).map((r) => r.elapsedMs);
    const sum = (list) => list.reduce((a, b) => a + b, 0);
    const done = requests.filter((r) => r.ok);
    const work = done.map((r) => r.workTotals);
    return {
      schema: 1,
      tool: 'tests/artifacts/difficulty-v3/MS05e/measure-gt.js',
      task: 'MS05e',
      mode: opts.mode, variant: VARIANT, level: opts.level, repeat: opts.repeat,
      from: opts.from, count: opts.count,
      seeds: Array.from({ length: opts.count }, (_, i) => opts.from + i),
      complete: complete && unstarted.length === 0,
      unstartedSeeds: unstarted,
      source: { sourceHash: identity.hash, sourceFiles: identity.files, greaterThanHash: identity.greaterThanHash,
        diggerHash: identity.diggerHash, toolHash: identity.toolHash, commit: git.commit, dirty: git.dirty,
        dirtyFiles: git.dirtyFiles },
      node: process.version,
      machine: machineInfo(),
      lock: lockState(),
      argv: argv,
      startedAt: startedAt.toISOString(),
      config: {
        request: { variantId: VARIANT, difficulty: opts.level, seedLiteral: 'from+i', trace: 'summary' },
        budget: 'none (as CV6)', warmup: false, supportOverride: false,
        defaultMaxAttempts: engine.digger.defaultMaxAttempts(81),
        shallowSearchRatings: engine.digger.SHALLOW_SEARCH_RATINGS === Infinity ? null
          : engine.digger.SHALLOW_SEARCH_RATINGS,
        capRatings: engine.digger.CAP_RATINGS,
        signPool: engine.greaterThan && engine.greaterThan.SIGN_POOL !== undefined
          ? engine.greaterThan.SIGN_POOL : null,
        spec: (function () {
          const model = engine.variants.get(VARIANT).build({}, null);
          const spec = engine.difficulty.spec(opts.level, model);
          return { min: spec.min, max: spec.max === Infinity ? null : spec.max, minClues: spec.minClues,
            minCluesPerUnit: spec.minCluesPerUnit, tierTechniques: spec.tierTechniques };
        })(),
        instrumentation: diagnose ? 'signs strategy wrapper: copies of every sample (diagnosis, not headline)'
          : 'signs strategy wrapper: counters only'
      },
      summary: {
        requests: requests.length, errors: requests.length - done.length,
        exactHits: done.filter((r) => r.exact).length,
        approximate: done.filter((r) => !r.exact).length,
        elapsedMs: { p50: percentile(times, 0.5), p95: percentile(times, 0.95), max: times.length
          ? Math.max.apply(null, times) : null, total: round3(sum(times)), mean: times.length
          ? round3(sum(times) / times.length) : null },
        elapsedMsOkOnly: { p50: percentile(okTimes, 0.5), p95: percentile(okTimes, 0.95) },
        attempts: sum(done.map((r) => r.attempts)),
        attemptsMax: done.length ? Math.max.apply(null, done.map((r) => r.attempts)) : null,
        samplesDug: sum(requests.map((r) => r.counters.samplesDug)),
        oracleCalls: sum(requests.map((r) => r.counters.oracleCalls)),
        tried: sum(requests.map((r) => r.counters.tried)),
        fullRatings: sum(work.map((w) => w.ratings)),
        proposals: sum(work.map((w) => w.proposals)),
        localSearches: sum(work.map((w) => w.localSearches)),
        checksFailed: done.filter((r) => !r.checks.allOk).length
      },
      durationMs: round3(elapsedTotal()),
      requests: requests
    };
  }

  const data = build(true);
  const abs = writeAtomic(opts.json, JSON.stringify(data, null, 1) + '\n');
  try {
    fs.unlinkSync(abs + '.partial');
  } catch (err) {
    // no partial left
  }
  const s = data.summary;
  console.log(opts.mode + ' ' + opts.level + ' ' + opts.from + '+' + opts.count + ' r' + opts.repeat +
    ': requests ' + s.requests + ', errors ' + s.errors + ', exact ' + s.exactHits + ', p50 ' + s.elapsedMs.p50 +
    ' ms, p95 ' + s.elapsedMs.p95 + ' ms, max ' + s.elapsedMs.max + ' ms, total ' + s.elapsedMs.total +
    ' ms, attempts ' + s.attempts + ', oracleCalls ' + s.oracleCalls + ', checksFailed ' + s.checksFailed +
    (data.complete ? '' : ', INCOMPLETE (unstarted ' + data.unstartedSeeds.length + ')') +
    ', file ' + path.relative(REPO, abs).split(path.sep).join('/'));
  return data.complete && s.errors === 0 && s.checksFailed === 0 ? 0 : 1;
}

function countOf(engine, model, givens, budget) {
  return engine.dfs.countSolutions(model, givens, 2, budget);
}

function signsWithout(engine, model, index) {
  return engine.greaterThan.withSigns(model, model.inequalities.filter((q, k) => k !== index));
}

/** Every remaining sign removed in turn must leave two solutions: true, false, or null (an error, unknown). */
function minimalSigns(engine, model, givens) {
  const budget = engine.budget.create({ ms: MINIMAL_CHECK_MS * model.inequalities.length });
  try {
    for (let s = 0; s < model.inequalities.length; s++) {
      const n = countOf(engine, signsWithout(engine, model, s), givens, budget);
      if (n !== 2) return false;
    }
    return true;
  } catch (err) {
    return null;
  }
}

function symmetric(engine, model, givens, symmetry) {
  const groups = engine.symmetry.groups(model, symmetry);
  return groups.every((g) => {
    const first = givens[g[0]] !== 0;
    for (let i = 1; i < g.length; i++) if ((givens[g[i]] !== 0) !== first) return false;
    return true;
  });
}

function clueCount(givens) {
  let k = 0;
  for (let c = 0; c < givens.length; c++) if (givens[c] !== 0) k++;
  return k;
}

function summarize(engine, level, result) {
  const rating = result.rating;
  const work = workOf(result.work);
  return {
    level: rating.level, score: rating.score, exact: result.exact === true,
    attempts: result.attempts, clues: clueCount(result.givens), signs: result.model.inequalities.length,
    warnings: result.warnings.slice(), hardest: rating.hardestTechnique,
    work: work, workTotals: sumWork(work)
  };
}

/** Independent checks of a returned puzzle, outside the timed interval. */
function checks(engine, level, result) {
  const model = result.model;
  const givens = result.givens;
  const spec = engine.difficulty.spec(level, model);
  const out = {};
  out.unique = countOf(engine, model, givens, null) === 1;
  out.solutionOk = engine.model.isSolution(model, result.solution) &&
    Array.from(givens).every((v, c) => v === 0 || v === result.solution[c]);
  out.symmetric = symmetric(engine, model, givens, result.config.symmetry);
  out.floorOk = clueCount(givens) >= spec.minClues;
  out.minimal = minimalSigns(engine, model, givens);
  const again = engine.difficulty.rate(model, givens);
  const req = engine.difficulty.requiredOf(again, level, model);
  out.requiredNow = req === null ? null : req.required;
  out.ratingAgrees = again.level === result.rating.level && again.score === result.rating.score;
  out.exactAgrees = result.exact === (again.level === level && out.requiredNow === true);
  out.warningsAgree = result.exact ? result.warnings.length === 0
    : result.warnings.indexOf('difficulty.approximate') !== -1;
  out.allOk = out.unique && out.solutionOk && out.symmetric && out.floorOk && out.minimal === true &&
    out.ratingAgrees && out.exactAgrees && out.warningsAgree;
  return out;
}

/** Classifies each captured sample of a request (diagnosis). */
function analyseSamples(engine, level, captured) {
  const target = engine.difficulty.levelIndex(level);
  return captured.map((c) => {
    const model = c.model;
    const rec = {
      attempt: c.where ? c.where.attempt : null, sample: c.where ? c.where.sample : null,
      digMs: round3(c.ms), clues: c.clues, floor: c.spec ? c.spec.minClues : null,
      signs: model ? model.inequalities.length : null,
      oracleCalls: c.stats.oracleCalls, tried: c.stats.tried, accepted: c.stats.accepted,
      rejected: c.stats.rejected
    };
    const passes = c.log.filter((e) => e.op === 'pass');
    const firstPass = c.log.findIndex((e) => e.op === 'pass');
    rec.rounds = passes.filter((e) => e.pass === 'signs' || e.pass === 'signs.minimal').length / 2;
    rec.tuneReveals = firstPass < 0 ? 0 : c.log.slice(firstPass).filter((e) => e.op === 'reveal').length;
    rec.initialClues = c.clues - c.log.slice(firstPass < 0 ? c.log.length : firstPass).reduce(
      (n, e) => n + (e.op === 'reveal' ? e.cells.length : 0), 0);
    if (model === null) {
      rec.category = 'noModel';
      return rec;
    }
    let rated = null;
    try {
      rated = engine.difficulty.rate(model, c.givens);
    } catch (err) {
      rec.rateError = String(err && err.code || err);
    }
    rec.solved = rated !== null && rated.solved === true;
    rec.score = rec.solved ? rated.score : null;
    rec.level = rec.solved ? rated.level : null;
    const req = rec.solved ? engine.difficulty.requiredOf(rated, level, model) : null;
    rec.required = req === null ? null : req.required;
    rec.atFloor = rec.floor !== null && c.clues <= rec.floor + 1;
    rec.unique = (function () {
      try {
        return countOf(engine, model, c.givens, null) === 1;
      } catch (err) {
        return null;
      }
    })();
    rec.minimal = minimalSigns(engine, model, c.givens);
    if (!rec.solved) rec.category = 'unrated';
    else if (rec.level === level) rec.category = rec.required === true ? 'exact' : 'shallow';
    else rec.category = engine.difficulty.levelIndex(rec.level) < target ? 'below' : 'above';
    return rec;
  });
}

process.exitCode = main(process.argv.slice(2));
