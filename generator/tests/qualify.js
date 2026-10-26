#!/usr/bin/env node
'use strict';

/*
 * Qualification of the levels each variant offers (rating v2: docs/difficulty-rating/report-detailed.md
 * section 6; the results are published in docs/difficulty-rating/qualification.md and copied into
 * `difficultySupport`).
 *
 *   node tests/qualify.js [--variant=id[,id]] [--level=id[,id]] [--jobs=N] [--json=FILE] [--markdown=FILE]
 *                         [--no-early-stop] [--quiet] [--help]
 *
 * Protocol (section 6). For every variant with its default options and symmetry, and every level, 40
 * puzzles are generated with fixed seeds through the real pipeline (`SG.pipeline.run` with the 120 s
 * active-time guard of the application). A request is a HIT when it returns a valid puzzle (givens inside
 * the solution, a valid solution, exactly one solution by the DFS count) with a complete logical proof whose
 * level is exactly the requested one, without the warning 'difficulty.approximate'. Timeouts, errors,
 * approximate and unrated results are misses, and every request counts, also in the time percentile.
 *  - 36 or more hits of 40, and p95 within the budget: the level is offered.
 *  - 30 to 35 hits: 60 more seeds; offered with at least 90 hits of the 100 and p95 (of all 100) within the
 *    budget.
 *  - fewer than 30 hits: hidden.
 * Budgets (p95 of the generation time): 2 s for boards of at most 36 cells (classic4, classic6), 10 s for
 * the other boards of at most 81 cells, 30 s for larger boards. Lists may have gaps.
 *
 * Early stop (default; `--no-early-stop` runs every seed): a level stops as soon as its verdict cannot change
 * any more - more than 10 misses among the first 40 (at most 29 hits), more than 10 misses of 100 in the
 * second round, or more slow requests (over the budget) than the percentile of 100 requests allows (5) -
 * and the table then shows how many requests ran. Such a level is hidden either way.
 *
 * Seeds: request k of (variant, level) uses the FNV-1a hash of 'variant/level/k' on the base seed
 * `SEED_BASE`, so a re-run reproduces every puzzle. The requests are shared out over `--jobs` worker
 * processes (default: half the logical processors); the times are measured inside the workers, so a high
 * `--jobs` on a busy machine makes them slower, never faster. The table records the machine, the number of
 * jobs, the Node version and the engine (git commit, whether the tree had changes, and a hash of the
 * source files).
 *
 * Output: a progress line per level (unless --quiet), then the table and the support list per variant;
 * `--json` writes every request and the summary, `--markdown` the table of
 * docs/difficulty-rating/qualification.md.
 * Every request must have an outcome: a worker that stops unexpectedly (also after the last request of a
 * round), loses its IPC channel or answers for a request it was not given fails the whole run, and nothing
 * is published. An offered verdict needs exactly 40 (first round) or 100 (second round) recorded outcomes.
 * Exit code: 0; 1 when the run failed; 2 for a usage error.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const os = require('os');
const crypto = require('crypto');
const childProcess = require('child_process');

const ROOT = path.resolve(__dirname, '..');

/** Section 6 of the joint report. */
const FIRST_SEEDS = 40;
const MORE_SEEDS = 60;
const OFFER_FIRST = 36;
const BORDER_FROM = 30;
const OFFER_TOTAL = 90;
const GUARD_MS = 120000;
const SEED_BASE = 20260601;

const USAGE = [
  'Usage: node tests/qualify.js [options]',
  '',
  '  --variant=a,b     only these variants (default: every registered variant)',
  '  --level=a,b       only these levels (default: all nine)',
  '  --jobs=N          worker processes (default: half the logical processors)',
  '  --json=FILE       write every request and the summary as JSON',
  '  --markdown=FILE   write the table (the body of docs/difficulty-rating/qualification.md)',
  '  --no-early-stop   run every seed even when the verdict is already certain',
  '  --probe=N         a quick look, not a qualification: N seeds per level, no second round, no verdict',
  '  --quiet           no progress lines',
  '  --help            show this help'
].join('\n');

function parseArgs(argv) {
  const opts = {
    variants: null, levels: null, jobs: Math.max(1, Math.floor(os.cpus().length / 2)), json: null,
    markdown: null, earlyStop: true, quiet: false, help: false, child: false, probe: 0
  };
  for (const arg of argv) {
    let m;
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--child') opts.child = true;
    else if (arg === '--no-early-stop') opts.earlyStop = false;
    else if (arg === '--quiet') opts.quiet = true;
    else if ((m = /^--variant=(.+)$/.exec(arg))) opts.variants = m[1].split(',');
    else if ((m = /^--level=(.+)$/.exec(arg))) opts.levels = m[1].split(',');
    else if ((m = /^--jobs=(\d+)$/.exec(arg))) opts.jobs = Math.max(1, parseInt(m[1], 10));
    else if ((m = /^--probe=(\d+)$/.exec(arg))) opts.probe = Math.max(1, parseInt(m[1], 10));
    else if ((m = /^--json=(.+)$/.exec(arg))) opts.json = m[1];
    else if ((m = /^--markdown=(.+)$/.exec(arg))) opts.markdown = m[1];
    else throw new Error('Unknown argument: ' + arg);
  }
  return opts;
}

/** The engine's source files, in the order of SOURCE_FILES of tests/node-runner.js (UI files skipped). */
function sourceFiles() {
  const runner = fs.readFileSync(path.join(ROOT, 'tests/node-runner.js'), 'utf8');
  const match = /const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner);
  if (!match) throw new Error('cannot find SOURCE_FILES in tests/node-runner.js');
  return (match[1].match(/'[^']+'/g) || []).map((s) => s.slice(1, -1))
    .filter((rel) => !/^js\/(ui|worker)\//.test(rel) && fs.existsSync(path.join(ROOT, rel)));
}

function loadSources() {
  for (const rel of sourceFiles()) {
    const abs = path.join(ROOT, rel);
    vm.runInThisContext(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''), { filename: abs });
  }
  return globalThis.SG;
}

/** FNV-1a of a tag on the base seed (the derivation of tests/soak.js). */
function seedFor(tag) {
  let h = (2166136261 ^ SEED_BASE) >>> 0;
  for (let k = 0; k < tag.length; k++) h = Math.imul(h ^ tag.charCodeAt(k), 16777619) >>> 0;
  return h;
}

/** p95 budget of a board in milliseconds. */
function budgetOf(cellCount) {
  if (cellCount <= 36) return 2000;
  if (cellCount <= 81) return 10000;
  return 30000;
}

/** Nearest-rank percentile of a sorted array. */
function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))];
}

// -------------------------------------------------------------------------------------------------
// Worker process: runs one request at a time
// -------------------------------------------------------------------------------------------------

function child() {
  const SG = loadSources();
  SG.variants.list().forEach((def) => { def.difficultySupport = SG.difficulty.LEVELS.slice(); });
  process.on('message', (task) => {
    if (task === 'exit') process.exit(0);
    const out = { key: task.key, index: task.index, seed: task.seed, hit: false };
    const t0 = process.hrtime.bigint();
    let result = null;
    try {
      result = SG.pipeline.run(
        { variantId: task.variant, difficulty: task.level, seed: task.seed, trace: 'off' },
        null, SG.budget.create({ ms: GUARD_MS }));
    } catch (err) {
      out.error = err && err.code ? err.code : String(err && err.message);
    }
    out.ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (result !== null) {
      const model = result.model;
      const rating = result.rating;
      out.achieved = rating.level;
      out.score = rating.score;
      out.solved = rating.solved === true;
      out.approximate = result.warnings.indexOf('difficulty.approximate') !== -1;
      let consistent = true;
      for (let c = 0; c < model.cellCount; c++) {
        if (result.givens[c] !== 0 && result.givens[c] !== result.solution[c]) consistent = false;
      }
      out.valid = consistent && SG.model.isSolution(model, result.solution) &&
        SG.dfs.countSolutions(model, result.givens, 2) === 1;
      out.hit = out.valid && out.solved && !out.approximate && rating.level === task.level;
    }
    process.send(out);
  });
  process.send({ ready: true });
}

// -------------------------------------------------------------------------------------------------
// Parent: schedules the requests and decides
// -------------------------------------------------------------------------------------------------

function engineInfo() {
  const hash = crypto.createHash('sha256');
  for (const rel of sourceFiles()) hash.update(fs.readFileSync(path.join(ROOT, rel)));
  const info = { sources: hash.digest('hex').slice(0, 16), commit: null, dirty: null };
  try {
    info.commit = childProcess.execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe',
      'ignore'] }).toString().trim();
    info.dirty = childProcess.execSync('git status --porcelain', { cwd: ROOT, stdio: ['ignore', 'pipe',
      'ignore'] }).toString().trim() !== '';
  } catch (err) {
    // Not a git checkout: the hash of the sources identifies the engine.
  }
  return info;
}

function machineInfo(jobs) {
  const cpus = os.cpus();
  return {
    cpu: cpus.length > 0 ? cpus[0].model.trim() : 'unknown', logicalProcessors: cpus.length,
    memoryGb: Math.round(os.totalmem() / 1073741824), platform: os.platform() + ' ' + os.release(),
    node: process.version, jobs: jobs
  };
}

/**
 * The verdict of a level from its requests (see the file header). Only a complete round can offer a level:
 * exactly `FIRST_SEEDS` outcomes in the first round, or `FIRST_SEEDS + MORE_SEEDS` with the second.
 */
function decide(cell, probe) {
  const n = cell.done.length;
  const hits = cell.done.filter((r) => r.hit).length;
  const sorted = cell.done.map((r) => r.ms).sort((a, b) => a - b);
  const p95 = percentile(sorted, 0.95);
  const fast = p95 <= cell.budget;
  const complete = n === FIRST_SEEDS || n === FIRST_SEEDS + MORE_SEEDS;
  let verdict;
  if (probe) verdict = 'probe';
  else if (cell.stopped || !complete) verdict = 'hidden';
  else if (n === FIRST_SEEDS) verdict = hits >= OFFER_FIRST && fast ? 'offered' : 'hidden';
  else verdict = hits >= OFFER_TOTAL && fast ? 'offered' : 'hidden';
  return {
    n: n, hits: hits, rate: n > 0 ? hits / n : 0, p50: percentile(sorted, 0.5), p95: p95,
    max: sorted.length > 0 ? sorted[sorted.length - 1] : 0, verdict: verdict,
    stopped: cell.stopped || (!probe && !complete ? 'incomplete' : null),
    errors: cell.done.filter((r) => r.error).length,
    approximate: cell.done.filter((r) => r.approximate).length,
    invalid: cell.done.filter((r) => r.valid === false).length
  };
}

function fmt(ms) {
  return ms >= 10000 ? (ms / 1000).toFixed(1) + ' s' : ms >= 1000 ? (ms / 1000).toFixed(2) + ' s'
    : ms.toFixed(0) + ' ms';
}

function markdownOf(summary) {
  const lines = [];
  lines.push('| variant | level | n | hits | rate | p50 | p95 | max | budget | verdict |');
  lines.push('|---|---|---:|---:|---:|---:|---:|---:|---:|---|');
  summary.cells.forEach((c) => {
    const s = c.summary;
    const verdict = s.verdict + (s.stopped ? ' (stopped: ' + s.stopped + ')' : '');
    lines.push('| ' + c.variant + ' | ' + c.level + ' | ' + s.n + ' | ' + s.hits + ' | ' +
      (100 * s.rate).toFixed(0) + ' % | ' + fmt(s.p50) + ' | ' + fmt(s.p95) + ' | ' + fmt(s.max) + ' | ' +
      fmt(c.budget) + ' | ' + verdict + ' |');
  });
  return lines.join('\n') + '\n';
}

/** An error in what was asked for (exit code 2, with the usage), not a failure of the run. */
function usageError(message) {
  const err = new Error(message);
  err.usage = true;
  return err;
}

function parent(opts) {
  const SG = loadSources();
  const LEVELS = SG.difficulty.LEVELS;
  const levels = opts.levels || LEVELS;
  const bad = levels.filter((l) => LEVELS.indexOf(l) === -1);
  if (bad.length > 0) throw usageError('unknown level: ' + bad.join(', '));
  const cells = [];
  for (const def of SG.variants.list()) {
    if (opts.variants && opts.variants.indexOf(def.id) === -1) continue;
    const model = def.build({}, SG.rng.create(SEED_BASE).fork('build:' + def.id));
    for (const level of LEVELS) {
      if (levels.indexOf(level) === -1) continue;
      cells.push({
        variant: def.id, level: level, key: def.id + '/' + level, cellCount: model.cellCount,
        budget: budgetOf(model.cellCount), done: [], pending: 0, queued: FIRST_SEEDS, round: 1, stopped: null
      });
    }
  }
  if (cells.length === 0) throw usageError('nothing to do: no variant / level selected');
  const firstSeeds = opts.probe || FIRST_SEEDS;
  cells.forEach((c) => { c.queued = firstSeeds; });
  const byKey = new Map(cells.map((c) => [c.key, c]));
  const queue = [];
  cells.forEach((c) => {
    for (let k = 0; k < firstSeeds; k++) {
      queue.push({ key: c.key, variant: c.variant, level: c.level, index: k });
    }
  });

  const started = Date.now();
  const header = {
    protocol: 'docs/difficulty-rating/report-detailed.md section 6', seedBase: SEED_BASE,
    machine: machineInfo(opts.jobs), engine: engineInfo(), started: new Date(started).toISOString()
  };
  if (!opts.quiet) {
    console.log('qualify: ' + cells.length + ' levels, ' + opts.jobs + ' jobs, ' + header.machine.cpu +
      ', Node ' + header.machine.node + ', engine ' + (header.engine.commit || '?') +
      (header.engine.dirty ? '+changes' : '') + ' sources ' + header.engine.sources);
  }

  function overBudget(cell) {
    return cell.done.filter((r) => r.ms > cell.budget).length;
  }

  /**
   * Is the verdict of a level certain before all its requests ran? More misses than any offer allows, or
   * more slow requests than the percentile of 100 requests allows (a level of the first round may still get
   * the second one, so the first round uses the allowance of 100 too).
   */
  function certain(cell) {
    if (!opts.earlyStop || opts.probe) return null;
    const misses = cell.done.filter((r) => !r.hit).length;
    const total = FIRST_SEEDS + MORE_SEEDS;
    if (cell.round === 1 && misses > FIRST_SEEDS - BORDER_FROM) return 'misses';
    if (cell.round === 2 && misses > total - OFFER_TOTAL) return 'misses';
    if (overBudget(cell) > total - Math.ceil(0.95 * total)) return 'time';
    return null;
  }

  function finished(cell) {
    return cell.pending === 0 && cell.queued === 0;
  }

  function afterResult(cell) {
    if (cell.stopped === null) {
      const why = certain(cell);
      if (why !== null) {
        cell.stopped = why;
        for (let i = queue.length - 1; i >= 0; i--) if (queue[i].key === cell.key) queue.splice(i, 1);
        cell.queued = 0;
      }
    }
    if (!finished(cell) || cell.stopped !== null) {
      if (finished(cell)) report(cell);
      return;
    }
    const hits = cell.done.filter((r) => r.hit).length;
    if (!opts.probe && cell.round === 1 && hits >= BORDER_FROM && hits < OFFER_FIRST) {
      cell.round = 2;
      cell.queued = MORE_SEEDS;
      for (let k = FIRST_SEEDS; k < FIRST_SEEDS + MORE_SEEDS; k++) {
        queue.unshift({ key: cell.key, variant: cell.variant, level: cell.level, index: k });
      }
      return;
    }
    report(cell);
  }

  function report(cell) {
    cell.summary = decide(cell, opts.probe > 0);
    if (opts.quiet) return;
    const s = cell.summary;
    console.log(cell.key + ': ' + s.hits + '/' + s.n + ' hits, p95 ' + fmt(s.p95) + ' (budget ' +
      fmt(cell.budget) + '), ' + s.verdict + (s.stopped ? ' (stopped: ' + s.stopped + ')' : ''));
  }

  return new Promise((resolve, reject) => {
    let live = 0;
    let failed = false;
    const workers = [];
    function inFlight(worker) {
      return worker.busy ? ' with ' + worker.busy.key + ' #' + worker.busy.index + ' in flight' : '';
    }
    /** Ends the run without a result: the other workers are stopped, nothing is published. */
    function fail(message) {
      if (failed) return;
      failed = true;
      workers.forEach((w) => {
        w.expectedExit = true;
        try {
          w.kill();
        } catch (err) {
          // Already gone.
        }
      });
      reject(new Error(message));
    }
    function send(worker, message) {
      try {
        worker.send(message);
      } catch (err) {
        fail('cannot reach a worker' + inFlight(worker) + ': ' + err.message);
      }
    }
    function next(worker) {
      if (failed) return;
      const task = queue.shift();
      if (!task) {
        worker.busy = null;
        worker.expectedExit = true;
        send(worker, 'exit');
        return;
      }
      const cell = byKey.get(task.key);
      cell.queued--;
      cell.pending++;
      task.seed = seedFor(task.key + '/' + task.index);
      worker.busy = task;
      send(worker, task);
    }
    for (let j = 0; j < Math.min(opts.jobs, queue.length); j++) {
      const worker = childProcess.fork(__filename, ['--child'],
        { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
      worker.busy = null;
      worker.expectedExit = false;
      live++;
      workers.push(worker);
      worker.on('message', (msg) => {
        if (failed) return;
        if (msg && msg.ready) {
          next(worker);
          return;
        }
        const task = worker.busy;
        if (!msg || !task || msg.key !== task.key || msg.index !== task.index) {
          fail('a worker answered for a request it was not given' + inFlight(worker));
          return;
        }
        worker.busy = null;
        const cell = byKey.get(msg.key);
        cell.pending--;
        cell.done.push(msg);
        afterResult(cell);
        next(worker);
      });
      worker.on('error', (err) => {
        fail('worker error' + inFlight(worker) + ': ' + (err && err.message));
      });
      worker.on('exit', (code, signal) => {
        live--;
        if (failed) return;
        if (!worker.expectedExit || code !== 0 || worker.busy) {
          fail('a worker stopped unexpectedly (code ' + code + (signal ? ', signal ' + signal : '') + ')' +
            inFlight(worker));
          return;
        }
        if (live > 0) return;
        const open = cells.filter((c) => c.pending !== 0 || c.queued !== 0);
        if (open.length > 0) {
          fail('requests without an outcome: ' + open.map((c) => c.key).join(', '));
          return;
        }
        resolve();
      });
    }
  }).then(() => {
    cells.forEach((c) => { if (!c.summary) c.summary = decide(c, opts.probe > 0); });
    const support = {};
    cells.forEach((c) => {
      if (!support[c.variant]) support[c.variant] = [];
      if (c.summary.verdict === 'offered') support[c.variant].push(c.level);
    });
    const summary = Object.assign(header, {
      finished: new Date().toISOString(), seconds: Math.round((Date.now() - started) / 1000),
      cells: cells.map((c) => ({
        variant: c.variant, level: c.level, cellCount: c.cellCount, budget: c.budget, summary: c.summary,
        requests: c.done.slice().sort((a, b) => a.index - b.index)
      })),
      support: support
    });
    console.log('');
    console.log(markdownOf(summary));
    Object.keys(support).forEach((id) => console.log(id + ': ' + JSON.stringify(support[id])));
    if (opts.json) fs.writeFileSync(opts.json, JSON.stringify(summary, null, 1));
    if (opts.markdown) fs.writeFileSync(opts.markdown, markdownOf(summary));
    return 0;
  });
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message + '\n\n' + USAGE);
    process.exitCode = 2;
    return;
  }
  if (opts.child) {
    child();
    return;
  }
  if (opts.help) {
    console.log(USAGE);
    return;
  }
  Promise.resolve().then(() => parent(opts)).then((code) => { process.exitCode = code; }, (err) => {
    if (err && err.usage) {
      console.error(err.message + '\n\n' + USAGE);
      process.exitCode = 2;
      return;
    }
    console.error('qualify: the run failed, nothing was published: ' + (err && err.message));
    process.exitCode = 1;
  });
}

if (require.main === module) main();

module.exports = { budgetOf: budgetOf, percentile: percentile, seedFor: seedFor, SEED_BASE: SEED_BASE };
