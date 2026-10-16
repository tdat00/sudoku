#!/usr/bin/env node
'use strict';

/*
 * Performance measurement against design.md section 9.1 (task T-6.2).
 *
 *   node tests/perf.js [--variant=a,b] [--level=a,b] [--runs=50] [--quick] [--warmup=N] [--seed=N]
 *                      [--ascii] [--gate] [--update-hashes] [--check-hashes] [--help]
 *
 * For every cell of the table of section 9.1 (a variant and a level it offers) it generates --runs puzzles
 * (default 50) through SG.pipeline.run with trace 'summary' and prints the p50 / p95 / max time next to the
 * p95 target, with a tick or a cross. The cells are those of SG.fixtures.perfTools.PERF_TARGETS
 * (tests/fixtures/perf-helper.js). The acceptance of T-6.2 is that at least 90 % of the cells meet their
 * target; every miss needs a written justification, so the script ends with the list of misses.
 *
 *   --quick            8 runs per cell and only the cells whose target is 2 s or less (a few seconds in all)
 *   --warmup=N         untimed runs of each cell before the timed ones (default 0: cold start included)
 *   --gate             exit code 1 when fewer than 90 % of the cells meet their target (default: always 0)
 *   --update-hashes    regenerate tests/fixtures/regression.js from the current code and exit (see below)
 *   --check-hashes     compare the current code with tests/fixtures/regression.js and exit (1 on a mismatch)
 *   --alloc            heap probe of the hot loops of the engine (rule R2): bytes allocated per call of
 *                      propagate, place and the DFS, on a few boards (re-runs itself with --expose-gc)
 *   --ascii            "ok" / "MISS" instead of the tick and the cross
 *
 * Regression hashes: for 20 fixed seeds and the combinations of SG.fixtures.perfTools.COMBOS, the hash of the
 * puzzle the pipeline gives is recorded in tests/fixtures/regression.js. The suite "perf" of the normal test
 * run (node tests/node-runner.js) fails when a hash changes, which is how an optimisation proves that it did
 * not change any puzzle. After a change that is meant to alter puzzles (a calibration, a new dig rule) run
 * `node tests/perf.js --update-hashes` and commit the new fixture with a note about the reason.
 * `SG_UPDATE_HASHES=1 node tests/node-runner.js --suite=perf` does the same from the test runner.
 *
 * The source files are the ones listed in SOURCE_FILES of tests/node-runner.js, minus the UI files (the
 * engine does not use them); files that do not exist yet are skipped.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const FIXTURE = path.join(ROOT, 'tests', 'fixtures', 'regression.js');
const ACCEPT_SHARE = 0.9;
const QUICK_RUNS = 8;
const QUICK_MAX_TARGET_MS = 2000;

const USAGE = [
  'Usage: node tests/perf.js [options]',
  '',
  '  --variant=a,b      only these variants (default: every variant of the table of design.md 9.1)',
  '  --level=a,b        only these levels',
  '  --runs=N           puzzles per cell (default 50, the p95 of the table is over 50 runs)',
  '  --quick            8 runs per cell, only cells with a target of 2 s or less',
  '  --warmup=N         untimed runs before the timed ones (default 0)',
  '  --seed=N           first seed of the runs (default 7000)',
  '  --gate             exit code 1 when fewer than 90 % of the cells meet their target',
  '  --update-hashes    rewrite tests/fixtures/regression.js from the current code and exit',
  '  --check-hashes     compare the current code with tests/fixtures/regression.js and exit',
  '  --alloc            bytes allocated per call in the hot loops (propagate, place, DFS), then exit',
  '  --ascii            "ok" / "MISS" instead of the tick and the cross',
  '  --help             show this help'
].join('\n');

function parseArgs(argv) {
  const opts = {
    variants: null, levels: null, runs: 50, quick: false, warmup: 0, seed: 7000, gate: false, update: false,
    check: false, alloc: false, ascii: false, help: false, runsGiven: false
  };
  for (const arg of argv) {
    let m;
    if (arg === '--quick') opts.quick = true;
    else if (arg === '--gate') opts.gate = true;
    else if (arg === '--update-hashes') opts.update = true;
    else if (arg === '--check-hashes') opts.check = true;
    else if (arg === '--alloc') opts.alloc = true;
    else if (arg === '--ascii') opts.ascii = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if ((m = /^--variant=(.+)$/.exec(arg))) opts.variants = m[1].split(',');
    else if ((m = /^--level=(.+)$/.exec(arg))) opts.levels = m[1].split(',');
    else if ((m = /^--runs=(\d+)$/.exec(arg))) { opts.runs = parseInt(m[1], 10); opts.runsGiven = true; }
    else if ((m = /^--warmup=(\d+)$/.exec(arg))) opts.warmup = parseInt(m[1], 10);
    else if ((m = /^--seed=(\d+)$/.exec(arg))) opts.seed = parseInt(m[1], 10);
    else throw new Error('Unknown argument: ' + arg);
  }
  if (opts.runs < 1) throw new Error('--runs must be at least 1');
  return opts;
}

function loadSources() {
  const runner = fs.readFileSync(path.join(ROOT, 'tests/node-runner.js'), 'utf8');
  const match = /const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner);
  if (!match) throw new Error('cannot find SOURCE_FILES in tests/node-runner.js');
  const files = (match[1].match(/'[^']+'/g) || []).map((s) => s.slice(1, -1));
  const skipped = (rel) => /^js\/(ui|worker)\//.test(rel);
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    if (skipped(rel) || !fs.existsSync(abs)) continue;
    vm.runInThisContext(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''), { filename: abs });
  }
  const helper = path.join(ROOT, 'tests', 'fixtures', 'perf-helper.js');
  vm.runInThisContext(fs.readFileSync(helper, 'utf8').replace(/^\uFEFF/, ''), { filename: helper });
  if (fs.existsSync(FIXTURE)) {
    vm.runInThisContext(fs.readFileSync(FIXTURE, 'utf8').replace(/^\uFEFF/, ''), { filename: FIXTURE });
  }
  return globalThis.SG;
}

function pad(text, width, left) {
  const s = String(text);
  if (s.length >= width) return s;
  return left ? s + ' '.repeat(width - s.length) : ' '.repeat(width - s.length) + s;
}

function fmtMs(ms) {
  return ms >= 100 ? ms.toFixed(0) : ms >= 10 ? ms.toFixed(1) : ms.toFixed(2);
}

function fmtTarget(ms) {
  return ms >= 1000 ? (ms / 1000) + ' s' : ms + ' ms';
}

function updateHashes(SG) {
  const tools = SG.fixtures.perfTools;
  const started = process.hrtime.bigint();
  const table = tools.recordAll((combo) => process.stdout.write('  ' + combo.key + '\n'));
  fs.writeFileSync(FIXTURE, tools.render(table));
  const seconds = Number(process.hrtime.bigint() - started) / 1e9;
  console.log('wrote ' + path.relative(ROOT, FIXTURE) + ': ' + tools.COMBOS.length + ' combinations x ' +
    tools.SEEDS.length + ' seeds (' + seconds.toFixed(1) + ' s)');
  return 0;
}

/**
 * Heap probe of rule R2 (no allocation in the hot loops): the growth of the used heap over many calls of the
 * hot functions, with the garbage collector held off by a large young generation. A function that allocates
 * nothing per call shows a few bytes (the noise of the probe); the DFS shows a few tens, the one-time buffers
 * of the depths it reaches spread over the calls.
 */
function allocProbe(SG) {
  const refill = (to, from) => SG.model.cloneState(from, to);
  function probe(name, calls, fn) {
    for (let i = 0; i < 300; i++) fn(i);
    global.gc();
    const before = process.memoryUsage().heapUsed;
    for (let i = 0; i < calls; i++) fn(i);
    const after = process.memoryUsage().heapUsed;
    console.log('  ' + name.padEnd(52) + pad(((after - before) / calls).toFixed(1), 8) + ' bytes/call');
  }
  function puzzle(variant, level, seed) {
    return SG.pipeline.run({ variantId: variant, difficulty: level, seed: seed, trace: 'off' }, null);
  }

  console.log('Heap growth per call (the garbage collector is held off; noise is a few bytes)\n');
  const classic = puzzle('classic9', 'hard', 11);
  const model = classic.model;
  const givens = classic.givens;
  const solved = classic.solution;
  const proto = SG.model.initState(model);
  for (let c = 0; c < model.cellCount; c++) {
    if (givens[c] !== 0) SG.constraints.assign(model, proto, c, givens[c]);
  }
  const work = SG.model.initState(model);
  probe('constraints.propagate  (classic9 hard puzzle)', 20000, () => {
    refill(work, proto);
    return SG.constraints.propagate(model, work, null);
  });
  probe('constraints.propagateSwept', 20000, () => {
    refill(work, proto);
    return SG.constraints.propagateSwept(model, work, null, 0);
  });
  const settled = SG.model.cloneState(proto);
  SG.constraints.propagate(model, settled, null);
  probe('constraints.place  (copy by set, then one guess)', 50000, (i) => {
    refill(work, settled);
    return SG.constraints.place(model, work, i % model.cellCount, 1 + (i % 9), null);
  });
  const clueCells = [];
  for (let c = 0; c < model.cellCount; c++) if (givens[c] !== 0) clueCells.push(c);
  probe('dfs.countSolutions  (classic9 hard puzzle)', 3000, () => SG.dfs.countSolutions(model, givens, 2));
  const empty = new Int32Array(model.cellCount);
  probe('dfs.countSolutions  (empty grid, first solution)', 3000, () =>
    SG.dfs.countSolutions(model, empty, 1));
  probe('dfs.stillUnique  (every clue in turn)', 20000, (i) => {
    const c = clueCells[i % clueCells.length];
    return SG.dfs.stillUnique(model, givens, c, solved[c]);
  });
  [['killer', 'easy'], ['greaterThan', 'hard'], ['samurai', 'easy']].forEach((pair) => {
    const r = puzzle(pair[0], pair[1], 3);
    probe('dfs.countSolutions  (' + pair[0] + ' ' + pair[1] + ' puzzle)', 1000, () =>
      SG.dfs.countSolutions(r.model, r.givens, 2));
  });
  return 0;
}

function checkHashes(SG) {
  const tools = SG.fixtures.perfTools;
  const recorded = SG.fixtures.regression;
  if (!recorded) {
    console.error('tests/fixtures/regression.js does not exist: run node tests/perf.js --update-hashes');
    return 1;
  }
  let bad = 0;
  let checked = 0;
  for (const combo of tools.COMBOS) {
    const expected = recorded.hashes[combo.key];
    if (!expected) {
      console.log('MISSING ' + combo.key + ' is not in the fixture');
      bad++;
      continue;
    }
    const now = tools.hashesOf(combo);
    const diff = [];
    now.forEach((h, i) => { if (h !== expected[i]) diff.push(tools.SEEDS[i]); });
    checked += now.length;
    if (diff.length > 0) {
      bad += diff.length;
      console.log('CHANGED ' + combo.key + ': seeds ' + diff.join(', '));
    }
  }
  console.log(bad === 0 ? 'regression hashes: all ' + checked + ' puzzles unchanged' :
    'regression hashes: ' + bad + ' of ' + checked + ' puzzles changed');
  return bad === 0 ? 0 : 1;
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message + '\n\n' + USAGE);
    return 2;
  }
  if (opts.help) {
    console.log(USAGE);
    return 0;
  }
  if (opts.alloc && typeof global.gc !== 'function') {
    const child = require('child_process').spawnSync(process.execPath,
      ['--expose-gc', '--max-semi-space-size=256', __filename].concat(process.argv.slice(2)),
      { stdio: 'inherit' });
    return child.status === null ? 1 : child.status;
  }

  const SG = loadSources();
  const tools = SG.fixtures.perfTools;
  if (opts.update) return updateHashes(SG);
  if (opts.check) return checkHashes(SG);
  if (opts.alloc) return allocProbe(SG);

  const runs = opts.quick && !opts.runsGiven ? QUICK_RUNS : opts.runs;
  let cells = tools.cells();
  if (opts.variants) cells = cells.filter((c) => opts.variants.indexOf(c.variant) !== -1);
  if (opts.levels) cells = cells.filter((c) => opts.levels.indexOf(c.level) !== -1);
  if (opts.quick) cells = cells.filter((c) => c.target <= QUICK_MAX_TARGET_MS);
  if (cells.length === 0) {
    console.error('nothing to measure: no cell of the table matches the selection\n\n' + USAGE);
    return 2;
  }

  const cpu = os.cpus()[0];
  console.log('Sudoku Generator performance  (node ' + process.version + ', ' +
    (cpu ? cpu.model.trim() : '?') +
    ', ' + runs + ' runs per cell' + (opts.warmup ? ', ' + opts.warmup + ' warm-up' : '') +
    ', trace summary, seed ' + opts.seed + ')');
  console.log('p95 target = design.md section 9.1; cells = variant x level the variant offers\n');
  console.log(pad('variant', 12, true) + pad('level', 10, true) + pad('target', 9) + pad('p50', 9) +
    pad('p95', 9) +
    pad('max', 9) + pad('mean', 9) + '   ' + 'result');

  const tick = opts.ascii ? 'ok' : '\u2713';
  const cross = opts.ascii ? 'MISS' : '\u2717';
  const misses = [];
  let met = 0;
  let last = null;
  for (const cell of cells) {
    for (let i = 0; i < opts.warmup; i++) {
      SG.pipeline.run({ variantId: cell.variant, difficulty: cell.level, seed: opts.seed - 1 - i,
        trace: 'summary' }, function () {});
    }
    const r = tools.measure(cell.variant, cell.level, runs, { seedBase: opts.seed });
    const ok = r.p95 < cell.target;
    if (ok) met++;
    else misses.push({ cell: cell, r: r });
    console.log(pad(last === cell.variant ? '' : cell.variant, 12, true) + pad(cell.level, 10, true) +
      pad(fmtTarget(cell.target), 9) + pad(fmtMs(r.p50), 9) + pad(fmtMs(r.p95), 9) + pad(fmtMs(r.max), 9) +
      pad(fmtMs(r.mean), 9) + '   ' + (ok ? tick : cross));
    last = cell.variant;
  }

  const share = met / cells.length;
  console.log('\n' + met + ' of ' + cells.length + ' cells meet their p95 target (' +
    (share * 100).toFixed(0) +
    ' %, acceptance: at least ' + ACCEPT_SHARE * 100 + ' %)');
  if (misses.length > 0) {
    console.log('Misses:');
    for (const m of misses) {
      console.log('  ' + m.cell.key + ': p95 ' + fmtMs(m.r.p95) + ' ms against ' + fmtTarget(m.cell.target) +
        ' (x' + (m.r.p95 / m.cell.target).toFixed(2) + '), max ' + fmtMs(m.r.max) + ' ms');
    }
  }
  return opts.gate && share < ACCEPT_SHARE ? 1 : 0;
}

process.exitCode = main();
