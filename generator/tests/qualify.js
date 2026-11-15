#!/usr/bin/env node
'use strict';

/*
 * Qualification of the levels each variant offers (rating v2: docs/difficulty-rating/report-detailed.md
 * section 6; the results are published in docs/difficulty-rating/qualification.md and copied into
 * `difficultySupport`).
 *
 *   node tests/qualify.js [--variant=id[,id]] [--level=id[,id]] [--jobs=N] [--json=FILE] [--markdown=FILE]
 *                         [--no-early-stop] [--quiet] [--help]
 *   node tests/qualify.js --merge=DIR --jobs=4 [--json=FILE] [--markdown=FILE] [--quiet]
 *
 * Protocol (section 6). For every variant with its default options and symmetry, and every level, 40
 * puzzles are generated with fixed seeds through the real pipeline (`SG.pipeline.run` with the 120 s
 * active-time guard of the application). A request is a HIT when it returns a valid puzzle (givens inside
 * the solution, a valid solution, exactly one solution by the DFS count) with a complete logical proof whose
 * level is exactly the requested one, without the warning 'difficulty.approximate', and the result is `exact`
 * (rating v3: the proof also needs a technique of the tier of the level; an absent flag is a miss, a shallow
 * result in the band is not a hit). Timeouts, errors,
 * approximate and unrated results are misses, and every request counts, also in the time percentile. A request
 * never passes `maxAttempts`: it takes the default number of attempts of the size of its board
 * (`SG.digger.defaultMaxAttempts`: 8 up to 81 cells, 4 up to 144, 2 above), so a large board that meets no
 * exact puzzle in those attempts ends in the fallback, which is a miss, and no level is hidden or offered before
 * this qualification decides (difficulty v3, CV6-03).
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
 * docs/difficulty-rating/qualification.md (UTF-8, CRLF, written whole and put in place, so a failed run
 * leaves no half file).
 * Every request must have an outcome: a worker that stops unexpectedly (also after the last request of a
 * round), loses its IPC channel or answers for a request it was not given fails the whole run, and nothing
 * is published. An offered verdict needs exactly 40 (first round) or 100 (second round) recorded outcomes.
 * Exit code: 0; 1 when the run failed; 2 for a usage error.
 *
 * Metadata (difficulty v3, MS07d). Besides the machine, the engine and the times, every shard records
 * `qualifierHash` (SHA-256 of the bytes of this file and of tests/fixtures/qualification-records.js),
 * `acceptance` ('canonical-required-tier': the hit above), `ratingVersion` (the one the engine reports; it is
 * the development version until the rating is versioned, and no shard is a released v3 result), `probe` and
 * `earlyStop` (the protocol options of the run), `guardMs`, `attemptPolicy` (the size-default attempts rule
 * and the hashes of the files that decide them; no request names `maxAttempts`) and, for each level,
 * `attempts`: the maximum of attempts configured for its board (the size default), not the attempts that
 * a request used.
 *
 * Merge (difficulty v3, MS07d). `--merge=DIR --jobs=4 [--json=FILE] [--markdown=FILE]` generates nothing. It
 * reads every *.json file of the folder DIR (a subfolder is not entered) and writes the record of the 15
 * variants x 9 levels = 135 cells of checklist Q, but only after everything is valid. A shard is refused for
 * a missing or different qualifierHash, source hash, ratingVersion, attempt policy or protocol, a probe, jobs
 * other than 4, another machine or Node than the other shards, a run that overlaps another in time,
 * a cell twice, outside the matrix or missing, a request with a wrong key, index, derived seed, time or
 * outcome, a summary that its requests do not give, a verdict on fewer than 40 or 100 outcomes, a second
 * round without all 40 first outcomes of 30 to 35 hits, and a stop that its proof does not justify (more than
 * 10 misses, or more than 5 requests over the budget, for the first round or in all). A rejected merge
 * writes nothing. The record keeps each shard's own metadata, adds `shardSeconds` (the shards' wall times
 * added up) apart from `wallSpanSeconds` (first start to last end), recomputes every summary and the support
 * lists, and is written, with its table, after the whole validation (both files or none: an output that
 * cannot be put in place puts the other back as it was). No live table is a default output, and
 * the live table is never an output of a merge. Exit code: 0; 1 for a rejected merge; 2 for a usage error.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const os = require('os');
const crypto = require('crypto');
const childProcess = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const RECORDS_FILE = path.join(ROOT, 'tests', 'fixtures', 'qualification-records.js');
// The live qualification table: no merge ever writes it (the final task composes it around a merged table).
const LIVE_TABLE = path.resolve(ROOT, '..', 'docs', 'difficulty-rating', 'qualification.md');

/**
 * The pure protocol, decision and merge helpers (tests/fixtures/qualification-records.js, SG.fixtures.
 * qualificationRecords), run once in a context of their own. The scheduler below and the merge share them.
 */
let recordsLib = null;
function records() {
  if (recordsLib === null) {
    const sandbox = vm.createContext({});
    vm.runInContext(fs.readFileSync(RECORDS_FILE, 'utf8').replace(/^\uFEFF/, ''), sandbox,
      { filename: RECORDS_FILE });
    recordsLib = vm.runInContext('SG.fixtures.qualificationRecords', sandbox);
  }
  return recordsLib;
}

/** Section 6 of the joint report (the constants are the helper's, shared with the merge). */
const PROTOCOL = records().PROTOCOL;
const FIRST_SEEDS = PROTOCOL.firstSeeds;
const MORE_SEEDS = PROTOCOL.moreSeeds;
const OFFER_FIRST = PROTOCOL.offerFirst;
const BORDER_FROM = PROTOCOL.borderFrom;
const OFFER_TOTAL = PROTOCOL.offerTotal;
const GUARD_MS = PROTOCOL.guardMs;
const SEED_BASE = PROTOCOL.seedBase;

const USAGE = [
  'Usage: node tests/qualify.js [options]',
  '       node tests/qualify.js --merge=DIR --jobs=4 [--json=FILE] [--markdown=FILE]',
  '',
  '  --variant=a,b     only these variants (default: every registered variant)',
  '  --level=a,b       only these levels (default: all nine)',
  '  --jobs=N          worker processes (default: half the logical processors)',
  '  --json=FILE       write every request and the summary as JSON',
  '  --markdown=FILE   write the table (the body of docs/difficulty-rating/qualification.md)',
  '  --no-early-stop   run every seed even when the verdict is already certain',
  '  --probe=N         a quick look, not a qualification: N seeds per level, no second round, no verdict',
  '  --merge=DIR       no generation: check the *.json shards of DIR and merge them into the complete record',
  '                    of the 15 variants x 9 levels; needs --jobs=4, takes only --json, --markdown, --quiet',
  '  --quiet           no progress lines',
  '  --help            show this help'
].join('\n');

function parseArgs(argv) {
  const opts = {
    variants: null, levels: null, jobs: Math.max(1, Math.floor(os.cpus().length / 2)), jobsGiven: false,
    json: null, markdown: null, earlyStop: true, quiet: false, help: false, child: false, probe: 0,
    merge: null
  };
  for (const arg of argv) {
    let m;
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--child') opts.child = true;
    else if (arg === '--no-early-stop') opts.earlyStop = false;
    else if (arg === '--quiet') opts.quiet = true;
    else if ((m = /^--variant=(.+)$/.exec(arg))) opts.variants = m[1].split(',');
    else if ((m = /^--level=(.+)$/.exec(arg))) opts.levels = m[1].split(',');
    else if ((m = /^--jobs=(\d+)$/.exec(arg))) {
      opts.jobs = Math.max(1, parseInt(m[1], 10));
      opts.jobsGiven = true;
    } else if ((m = /^--probe=(\d+)$/.exec(arg))) opts.probe = Math.max(1, parseInt(m[1], 10));
    else if ((m = /^--json=(.+)$/.exec(arg))) opts.json = m[1];
    else if ((m = /^--markdown=(.+)$/.exec(arg))) opts.markdown = m[1];
    else if ((m = /^--merge=(.*)$/.exec(arg))) {
      if (m[1] === '') throw new Error('--merge needs the folder of the shards');
      opts.merge = m[1];
    } else throw new Error('Unknown argument: ' + arg);
  }
  if (opts.merge !== null && !opts.help) {
    const conflicts = [];
    if (opts.variants !== null) conflicts.push('--variant');
    if (opts.levels !== null) conflicts.push('--level');
    if (opts.probe > 0) conflicts.push('--probe');
    if (!opts.earlyStop) conflicts.push('--no-early-stop');
    if (opts.child) conflicts.push('--child');
    if (conflicts.length > 0) {
      throw new Error('--merge generates nothing and cannot be combined with ' + conflicts.join(', '));
    }
    if (!opts.jobsGiven) {
      throw new Error('--merge needs --jobs=4: the qualification always runs with 4 workers');
    }
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

// The decision itself (seeds, budgets, percentile, hit, verdict, table) is the helper's, as in the merge.
function seedFor(tag) {
  return records().seedFor(tag);
}

function budgetOf(cellCount) {
  return records().budgetOf(cellCount);
}

function percentile(sorted, p) {
  return records().percentile(sorted, p);
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
      out.exact = result.exact === true;
      let consistent = true;
      for (let c = 0; c < model.cellCount; c++) {
        if (result.givens[c] !== 0 && result.givens[c] !== result.solution[c]) consistent = false;
      }
      out.valid = consistent && SG.model.isSolution(model, result.solution) &&
        SG.dfs.countSolutions(model, result.givens, 2) === 1;
      out.hit = hitOf(out, task.level);
    }
    process.send(out);
  });
  process.send({ ready: true });
}

/**
 * The hit of one request from the outcome the worker recorded: the independent checks (a valid puzzle that
 * has a complete proof, no approximate warning), the level the rating reports, and the generator's own
 * `exact` flag, strictly true (a complete proof in the requested level that needs its tier). A level name
 * that matches is a consistency check and never enough: an absent or false `exact` is a miss.
 */
function hitOf(out, requested) {
  return records().hitOf(out, requested);
}

// -------------------------------------------------------------------------------------------------
// Parent: schedules the requests and decides
// -------------------------------------------------------------------------------------------------

/** The first 16 hex digits of the SHA-256 over the engine's source files (the identity of the engine). */
function sourcesHash() {
  const hash = crypto.createHash('sha256');
  for (const rel of sourceFiles()) hash.update(fs.readFileSync(path.join(ROOT, rel)));
  return hash.digest('hex').slice(0, 16);
}

function engineInfo() {
  const info = { sources: sourcesHash(), commit: null, dirty: null };
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

/** The SHA-256 of the bytes of this file and of its helper: the identity of the tool that wrote a shard. */
function qualifierHash() {
  const hash = crypto.createHash('sha256');
  [__filename, RECORDS_FILE].forEach((file) => {
    hash.update(fs.readFileSync(file));
    hash.update('\0');
  });
  return hash.digest('hex');
}

// The files that decide the attempts of a request without `maxAttempts`: the rule, where the pipeline
// applies it and the size a variant reports.
const POLICY_FILES = ['js/engine/digger.js', 'js/engine/pipeline.js', 'js/variants/registry.js'];

/** The size-default attempts rule and the hashes of the files that hold it (no maxAttempts is ever named). */
function attemptPolicy() {
  const sources = {};
  POLICY_FILES.forEach((rel) => {
    sources[rel] = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');
  });
  return { function: 'SG.digger.defaultMaxAttempts', explicitMaxAttempts: false, sources: sources };
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
  return records().decide(cell, probe);
}

function fmt(ms) {
  return records().fmt(ms);
}

function markdownOf(summary) {
  return records().markdownOf(summary);
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
  for (const entry of records().matrixOf(SG)) {
    if (opts.variants && opts.variants.indexOf(entry.id) === -1) continue;
    for (const level of LEVELS) {
      if (levels.indexOf(level) === -1) continue;
      cells.push({
        variant: entry.id, level: level, key: entry.id + '/' + level, cellCount: entry.cellCount,
        attempts: entry.attempts, budget: budgetOf(entry.cellCount), done: [], pending: 0,
        queued: FIRST_SEEDS, round: 1, stopped: null
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
    protocol: PROTOCOL.document, seedBase: SEED_BASE, machine: machineInfo(opts.jobs), engine: engineInfo(),
    qualifierHash: qualifierHash(), acceptance: PROTOCOL.acceptance,
    ratingVersion: SG.difficulty.RATING_VERSION, probe: opts.probe, earlyStop: opts.earlyStop,
    guardMs: GUARD_MS, attemptPolicy: attemptPolicy(), started: new Date(started).toISOString()
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
        variant: c.variant, level: c.level, cellCount: c.cellCount, budget: c.budget, attempts: c.attempts,
        summary: c.summary, requests: c.done.slice().sort((a, b) => a.index - b.index)
      })),
      support: support
    });
    console.log('');
    console.log(markdownOf(summary));
    Object.keys(support).forEach((id) => console.log(id + ': ' + JSON.stringify(support[id])));
    const texts = [];
    if (opts.json) texts.push({ file: opts.json, text: records().recordText(summary) });
    if (opts.markdown) texts.push({ file: opts.markdown, text: records().toCrlf(markdownOf(summary)) });
    publish(texts);
    return 0;
  });
}

/**
 * Writes the texts [{ file, text }] whole, all or none. Each goes to `<file>.partial` first. Before the first
 * one is put in place, the bytes of the existing targets are kept (or the fact that there was none). When a
 * rename fails, every target already replaced is restored from its copy (or removed), the `.partial` files
 * are removed and the error says so: every file stays as it was, and no half file is left.
 */
function publish(texts) {
  const before = texts.map((t) => (fs.existsSync(t.file) ? { bytes: fs.readFileSync(t.file) } : null));
  const placed = [];
  try {
    texts.forEach((t) => {
      fs.mkdirSync(path.dirname(path.resolve(t.file)), { recursive: true });
      fs.writeFileSync(t.file + '.partial', t.text, 'utf8');
    });
    texts.forEach((t, i) => {
      fs.renameSync(t.file + '.partial', t.file);
      placed.push(i);
    });
  } catch (err) {
    const stuck = [];
    placed.forEach((i) => {
      try {
        if (before[i] === null) fs.rmSync(texts[i].file, { force: true });
        else fs.writeFileSync(texts[i].file, before[i].bytes);
      } catch (restoreError) {
        stuck.push(texts[i].file);
      }
    });
    texts.forEach((t) => {
      try {
        fs.rmSync(t.file + '.partial', { force: true });
      } catch (removeError) {
        // The next run writes over it.
      }
    });
    if (placed.length === 0) throw err;
    throw new Error(err.message + (stuck.length === 0 ?
      '; the ' + placed.length + ' output(s) already replaced were put back as they were' :
      '; THE OUTPUTS COULD NOT BE PUT BACK: ' + stuck.join(', ')));
  }
}

/** Outputs of a merge that are refused before anything is read: the live table, the shard folder, a repeat */
function checkMergeOutputs(opts) {
  const folder = path.resolve(opts.merge);
  const named = [['--json', opts.json], ['--markdown', opts.markdown]].filter((x) => x[1])
    .map(([option, file]) => ({ option: option, file: file, abs: path.resolve(file).toLowerCase() }));
  named.forEach((out) => {
    if (out.abs === LIVE_TABLE.toLowerCase()) {
      throw usageError(out.option + ': a merge never writes the live table ' +
        'docs/difficulty-rating/qualification.md');
    }
    const rel = path.relative(folder.toLowerCase(), out.abs);
    if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) {
      throw usageError(out.option + ': ' + out.file + ' is inside the folder of the shards, where the next ' +
        'merge would read it as a shard');
    }
  });
  if (named.length === 2 && named[0].abs === named[1].abs) {
    throw usageError('--json and --markdown name the same file');
  }
}

/** The problems of a rejected merge on stderr, at most 40 lines. */
function rejectMerge(problems) {
  console.error('qualify: the merge is rejected, nothing was written (' + problems.length +
    (problems.length === 1 ? ' problem):' : ' problems):'));
  problems.slice(0, 40).forEach((problem) => console.error('  - ' + problem));
  if (problems.length > 40) console.error('  ... and ' + (problems.length - 40) + ' more');
  return 1;
}

/**
 * --merge=DIR: no generation. Reads every *.json of the folder (a subfolder is not entered), checks the
 * shards against this tree (tests/fixtures/qualification-records.js) and, only when the whole matrix is
 * valid, writes the merged record and its table. Returns the exit code: 0, or 1 for a rejected merge.
 */
function mergeShards(opts) {
  const lib = records();
  checkMergeOutputs(opts);
  let names;
  try {
    names = fs.readdirSync(opts.merge).filter((name) => /\.json$/i.test(name)).sort();
  } catch (err) {
    return rejectMerge(['cannot read the folder ' + opts.merge + ': ' + err.message]);
  }
  const files = names.map((name) => {
    try {
      return { name: name, shard: JSON.parse(fs.readFileSync(path.join(opts.merge, name), 'utf8')) };
    } catch (err) {
      return { name: name, error: 'cannot be read as JSON: ' + err.message };
    }
  });
  const SG = loadSources();
  const result = lib.merge(files, {
    jobs: opts.jobs, sources: sourcesHash(), qualifierHash: qualifierHash(),
    ratingVersion: SG.difficulty.RATING_VERSION, attemptPolicy: attemptPolicy(), variants: lib.matrixOf(SG),
    levels: SG.difficulty.LEVELS.slice()
  });
  if (!result.ok) return rejectMerge(result.problems);
  const record = result.record;
  const texts = [];
  if (opts.json) texts.push({ file: opts.json, text: lib.recordText(record) });
  if (opts.markdown) texts.push({ file: opts.markdown, text: lib.toCrlf(markdownOf(record)) });
  try {
    publish(texts);
  } catch (err) {
    console.error('qualify: the merge is valid but its files could not be written: ' + err.message);
    return 1;
  }
  const t = record.totals;
  if (!opts.quiet) {
    console.log('qualify: merged ' + t.cells + ' cells from ' + record.shards.length + ' shards, ' +
      t.requests + ' requests, ' + t.offered + ' offered, ' + t.hidden + ' hidden (' + t.stopped +
      ' stopped early), jobs ' + record.machine.jobs + ', Node ' + record.machine.node + ', engine ' +
      (record.engine.commits.join(' + ') || '?') + ' sources ' + record.engine.sources + ', rating version ' +
      record.ratingVersion + ', shards ' + record.shardSeconds + ' s, wall span ' +
      record.wallSpanSeconds + ' s');
  }
  console.log('');
  console.log(markdownOf(record));
  Object.keys(record.support).forEach((id) => console.log(id + ': ' + JSON.stringify(record.support[id])));
  if (t.invalid > 0) {
    console.error('qualify: CORRECTNESS: ' + t.invalid + ' request(s) returned an invalid or non-unique ' +
      'puzzle (see "invalid" in the cells); report it, do not publish');
  }
  return 0;
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
  Promise.resolve().then(() => (opts.merge !== null ? mergeShards(opts) : parent(opts))).then((code) => {
    process.exitCode = code;
  }, (err) => {
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

module.exports = {
  budgetOf: budgetOf, hitOf: hitOf, percentile: percentile, seedFor: seedFor, SEED_BASE: SEED_BASE
};
