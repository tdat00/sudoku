#!/usr/bin/env node
'use strict';

/*
 * Performance measurement against design.md section 9.1.
 *
 *   node tests/perf.js [--variant=a,b] [--level=a,b] [--runs=50] [--quick] [--warmup=N] [--seed=N]
 *                      [--ascii] [--gate] [--update-hashes] [--check-hashes] [--alloc] [--help]
 *   node tests/perf.js --hash-key=variant/level [--hash-from=N] [--hash-count=N]
 *                      (--check-hashes | --hash-record=<file.json>)
 *   node tests/perf.js --hash-merge=<directory> [--check-hashes | --update-hashes [--hash-out=<file.js>]]
 *   node tests/perf.js --hash-list [--hash-key=variant/level] [--hash-from=N] [--hash-count=N]
 *
 * For every cell of the table of section 9.1 (a variant and a level it offers) it generates --runs puzzles
 * (default 50) through SG.pipeline.run with trace 'summary' and prints the p50 / p95 / max time next to the
 * p95 target, with a tick or a cross. The cells are those of SG.fixtures.perfTools.PERF_TARGETS
 * (tests/fixtures/perf-helper.js). At least 90 % of the cells must meet their target; every miss needs a
 * written justification, so the script ends with the list of misses.
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
 * Bounded hash modes (difficulty v3): --check-hashes and --update-hashes process the 26 x 20 = 520 records
 * at once, and the measurement options (--variant, --level, ...) do not select among them. The hash selectors
 * do:
 *
 *   --hash-key=variant/level   one exact combination of COMBOS (default: all)
 *   --hash-from=N              zero-based index in SEEDS, 0..19 (default 0)
 *   --hash-count=N             that many consecutive seed indexes (default: up to the last seed)
 *   --hash-list                print the selected keys and seeds, no generation
 *   --hash-record=<file.json>  generate the selected records and write only that ledger
 *   --hash-merge=<directory>   require the complete 520 records of the current sources from the ledgers, then
 *                              --check-hashes (the default) or --update-hashes, without generating
 *   --hash-out=<file.js>       with --update-hashes: write this file instead of the canonical fixture
 *
 * A selected --check-hashes says how many of the 520 it checked and is no pass of the complete corpus. The
 * canonical fixture is written only by a complete update or a complete, valid merge, in CRLF. The records of
 * a ledger are { key: 'variant/level#seed', variant, level, seed, hash, ms, overrides }; the identity of the
 * sources covers the engine files this script loads plus perf-helper.js, tool-records.js and this file.
 * A combination whose level the qualification has hidden keeps its place in the corpus: the level is offered
 * to that one generation (recorded in `overrides`) and the support array is restored afterwards.
 *
 * The source files are the ones listed in SOURCE_FILES of tests/node-runner.js, minus the UI files (the
 * engine does not use them); files that do not exist are skipped.
 */

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const FIXTURE_REL = 'tests/fixtures/regression.js';
const FIXTURE = path.join(ROOT, 'tests', 'fixtures', 'regression.js');
// The helper and tool code that the sourceHash of a ledger covers besides the engine sources.
const HASH_CODE_FILES = ['tests/fixtures/perf-helper.js', 'tests/fixtures/tool-records.js', 'tests/perf.js'];
const ACCEPT_SHARE = 0.9;
const QUICK_RUNS = 8;
const QUICK_MAX_TARGET_MS = 2000;
const MAX_PROBLEMS_SHOWN = 20;

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
  '  --help             show this help',
  '',
  'Bounded hash modes (the 520 records are 26 combinations x 20 seeds; the options above do not pick them):',
  '',
  '  --hash-key=variant/level   one exact combination of the corpus (default: all 26)',
  '  --hash-from=N              zero-based index in the 20 seeds, 0..19 (default 0)',
  '  --hash-count=N             that many consecutive seed indexes (default: up to the last one)',
  '  --hash-list                print the selected keys and seeds and the source identity, no generation',
  '  --hash-record=<file.json>  generate the selected records and write only that ledger (never a fixture)',
  '  --hash-merge=<directory>   read the ledgers of a directory, require all 520 records from the current',
  '                             sources exactly once, then --check-hashes (the default) or --update-hashes,',
  '                             without generating',
  '  --hash-out=<file.js>       with --update-hashes: write this project-relative file instead of',
  '                             tests/fixtures/regression.js',
  '',
  'A --check-hashes with a selector says how many of the 520 it checked and is no pass of the whole corpus;',
  'a canonical --update-hashes needs the complete corpus (or a complete merge).'
].join('\n');

const TIMING_OPTION = /^(--(?:variant|level|runs|warmup|seed|quick|gate|ascii))(?:=|$)/;
const HASH_OPTION = /^--hash-(key|from|count|record|merge|out)=(.*)$/;

function setHashOption(opts, name, value) {
  if (value === '') throw new Error('--hash-' + name + ' needs a value');
  if (opts.hash[name] !== null) throw new Error('--hash-' + name + ' is given twice');
  opts.hash[name] = value;
}

function parseArgs(argv) {
  const opts = {
    variants: null, levels: null, runs: 50, quick: false, warmup: 0, seed: 7000, gate: false, update: false,
    check: false, alloc: false, ascii: false, help: false, runsGiven: false, timing: [], hashList: false,
    hash: { key: null, from: null, count: null, record: null, merge: null, out: null }
  };
  for (const arg of argv) {
    let m;
    if ((m = TIMING_OPTION.exec(arg))) opts.timing.push(m[1]);
    if (arg === '--quick') opts.quick = true;
    else if (arg === '--gate') opts.gate = true;
    else if (arg === '--update-hashes') opts.update = true;
    else if (arg === '--check-hashes') opts.check = true;
    else if (arg === '--hash-list') opts.hashList = true;
    else if (arg === '--alloc') opts.alloc = true;
    else if (arg === '--ascii') opts.ascii = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if ((m = HASH_OPTION.exec(arg))) setHashOption(opts, m[1], m[2]);
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

function readSource(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, '');
}

function runScript(rel) {
  const abs = path.join(ROOT, rel);
  vm.runInThisContext(readSource(rel), { filename: abs });
}

/** The engine files of SOURCE_FILES that this script loads (no UI or worker file), in load order. */
function engineFiles() {
  const match = /const SOURCE_FILES = \[([\s\S]*?)\];/.exec(readSource('tests/node-runner.js'));
  if (!match) throw new Error('cannot find SOURCE_FILES in tests/node-runner.js');
  const files = (match[1].match(/'[^']+'/g) || []).map((s) => s.slice(1, -1));
  const skipped = (rel) => /^js\/(ui|worker)\//.test(rel);
  return files.filter((rel) => !skipped(rel) && fs.existsSync(path.join(ROOT, rel)));
}

function loadSources() {
  engineFiles().forEach(runScript);
  runScript('tests/fixtures/perf-helper.js');
  runScript('tests/fixtures/tool-records.js');
  if (fs.existsSync(FIXTURE)) runScript(FIXTURE_REL);
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

/** The identity a ledger carries: sources, manifest, Node and the state of the repository. */
function hashIdentity(env, tools) {
  const sources = crypto.createHash('sha256');
  engineFiles().concat(HASH_CODE_FILES).forEach((rel) => {
    sources.update(rel + '\0' + readSource(rel).replace(/\r\n/g, '\n'));
  });
  const state = env.identity([]);
  return {
    sourceHash: sources.digest('hex'),
    manifestHash: env.sha256(globalThis.SG.fixtures.toolRecords.manifestText(tools.hashManifest())),
    node: state.node, commit: state.commit, dirty: state.dirty
  };
}

/**
 * Generates the records of a selection one after the other and tells each combination when it is done.
 * @returns {{ results: Array, failure: ({ key: string, message: string }|null) }} the failure of the first
 *   record that could not be generated: it has no hash, and nothing takes the place of one
 */
function generateHashes(env, tools, entries) {
  const results = [];
  let group = null;
  const flush = () => {
    if (group === null) return;
    env.out('  ' + group.key + ': seeds ' + group.seeds.join(', ') + ' (' + (group.ms / 1000).toFixed(1) +
      ' s)' + (group.offered ? ' (level offered for these records only)' : ''));
  };
  for (const entry of entries) {
    const r = entry.request;
    const key = r.variant + '/' + r.level;
    if (group === null || group.key !== key) {
      flush();
      group = { key: key, seeds: [], ms: 0, offered: false };
    }
    const started = env.clock();
    let made;
    try {
      made = tools.hashRecord(r.variant, r.level, r.seed);
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      return { results: results, failure: { key: entry.key, message: message } };
    }
    const ms = Math.round(env.clock() - started);
    group.seeds.push(r.seed);
    group.ms += ms;
    group.offered = group.offered || made.overridden;
    results.push({ variant: r.variant, level: r.level, seed: r.seed, hash: made.hash, ms: ms,
      overrides: made.overridden ? [key.replace('/', ':')] : [] });
  }
  flush();
  return { results: results, failure: null };
}

/** The complete merge of the ledgers of a directory as flat records, or null (and a report) when refused. */
function mergeHashes(env, tools, directory, identity) {
  const files = env.readLedgers(directory).map((file) => {
    if (file.error !== undefined) return file;
    try {
      return { name: file.name, ledger: JSON.parse(file.text) };
    } catch (err) {
      return { name: file.name, error: 'not valid JSON (' + err.message + ')' };
    }
  });
  const merged = tools.mergeHashLedgers(files, identity);
  if (!merged.ok) {
    const isMissing = (problem) => /: missing \(/.test(problem);
    const problems = merged.problems.filter((p) => !isMissing(p)).concat(merged.problems.filter(isMissing));
    problems.slice(0, MAX_PROBLEMS_SHOWN).forEach((problem) => env.out('  ' + problem));
    const more = problems.length - MAX_PROBLEMS_SHOWN;
    if (more > 0) env.out('  ... and ' + more + ' more');
    const missing = problems.filter(isMissing).length;
    env.err('merge refused: ' + problems.length + ' problem' + (problems.length === 1 ? '' : 's') +
      (missing > 0 ? ' (' + missing + ' of the ' + tools.hashManifest().length + ' keys missing)' : '') +
      '; nothing was written');
    return null;
  }
  env.out('merged ' + files.length + ' ledger' + (files.length === 1 ? '' : 's') + ': all ' +
    merged.records.length + ' keys exactly once, recorded from the current sources');
  return merged.records.map((r) => ({ variant: r.request.variant, level: r.request.level,
    seed: r.request.seed, hash: r.value.hash }));
}

function listHashes(env, tools, plan, identity) {
  const sel = plan.selection;
  env.out('tests/perf.js: ' + sel.entries.length + ' of ' + sel.total + ' hash records (' + sel.label +
    '), kind ' + tools.HASH_KIND + ', fixture ' + FIXTURE_REL);
  sel.entries.forEach((entry) => {
    const r = entry.request;
    env.out('  ' + entry.key + ' ' + r.variant + ' ' + r.level + ' seed ' + r.seed + ' (index ' +
      tools.SEEDS.indexOf(r.seed) + ')');
  });
  env.out('manifestHash ' + identity.manifestHash);
  env.out('sourceHash   ' + identity.sourceHash);
  return 0;
}

/** Prints what differs from the recorded table and the verdict; a partial check is said to be partial. */
function reportHashes(env, tools, recorded, results, plan, source) {
  const found = tools.compareHashes(recorded, results);
  found.missing.forEach((key) => env.out('MISSING ' + key + ' is not in the fixture'));
  found.changed.forEach((one) => env.out('CHANGED ' + one.key + ': seeds ' + one.seeds.join(', ')));
  const total = plan.selection.total;
  const complete = results.length === total;
  if (found.bad === 0) {
    env.out(complete ? 'regression hashes: all ' + found.checked + ' puzzles unchanged' + source :
      'regression hashes: ' + found.checked + ' of ' + total + ' puzzles checked (' + plan.selection.label +
      '), all unchanged; the other ' + (total - found.checked) + ' were not checked, so this is not a pass ' +
      'of the complete corpus');
  } else {
    env.out('regression hashes: ' + found.bad + ' of ' + found.checked + ' puzzles changed' +
      (complete ? source : ' (a partial check of ' + found.checked + ' of ' + total + ' puzzles)'));
  }
  return found.bad === 0 ? 0 : 1;
}

function flatRecords(results) {
  return results.map((r) => ({ key: r.variant + '/' + r.level + '#' + r.seed, value: { hash: r.hash } }));
}

/** Writes the complete table in CRLF, atomically; only ever called with all records of the corpus. */
function writeHashes(env, tools, recorded, results, plan, source) {
  const table = tools.tableOf(flatRecords(results));
  if (recorded) {
    const found = tools.compareHashes(recorded, results);
    found.missing.forEach((key) => env.out('MISSING ' + key + ' is not in the current fixture'));
    found.changed.forEach((one) => env.out('CHANGED ' + one.key + ': seeds ' + one.seeds.join(', ')));
    env.out(found.bad === 0 ? 'every hash equals the current fixture' :
      found.bad + ' of ' + found.checked + ' hashes differ from the current fixture');
  }
  const base = plan.out ? 'cwd' : 'root';
  const target = plan.out || FIXTURE_REL;
  env.writeText(target, tools.toCrlf(tools.render(table)), base);
  env.out('wrote ' + env.show(target, base) + ': ' + tools.COMBOS.length + ' combinations x ' +
    tools.SEEDS.length + ' seeds' + source);
  return 0;
}

function runHashes(SG, plan, argv) {
  const tools = SG.fixtures.perfTools;
  const env = require('./replay-fixtures.js').nodeEnv();
  try {
    if (plan.file) env.checkPath(plan.file, { extension: '.json', notIn: 'tests/fixtures' });
    if (plan.out) env.checkPath(plan.out, { extension: '.js' });
    if (plan.directory) env.checkDirectory(plan.directory);
  } catch (err) {
    env.err(err.message + '\n\n' + USAGE);
    return 2;
  }
  const identity = ['list', 'record'].includes(plan.mode) || plan.from === 'merge' ?
    hashIdentity(env, tools) : null;
  if (plan.mode === 'list') return listHashes(env, tools, plan, identity);

  const recorded = SG.fixtures.regression || null;
  if (plan.mode === 'check' && !recorded) {
    env.err(FIXTURE_REL + ' does not exist: run node tests/perf.js --update-hashes');
    return 1;
  }
  const started = env.clock();
  const stamp = env.now();
  let results;
  let source = '';
  if (plan.from === 'merge') {
    results = mergeHashes(env, tools, plan.directory, identity);
    if (results === null) return 1;
    source = ' (merged ledgers, nothing generated)';
  } else {
    const made = generateHashes(env, tools, plan.selection.entries);
    if (made.failure !== null) {
      env.err(made.failure.key + ': generation failed: ' + made.failure.message + '; ' +
        (plan.mode === 'check' ? 'the check is incomplete' : 'nothing was written'));
      return 1;
    }
    results = made.results;
    source = ' (' + ((env.clock() - started) / 1000).toFixed(1) + ' s)';
  }

  if (plan.mode === 'record') {
    const ledger = tools.hashLedger(Object.assign({}, identity, { generatedAt: stamp, argv: argv }), results);
    env.writeText(plan.file, SG.fixtures.toolRecords.ledgerText(ledger), 'cwd');
    env.out('recorded ' + results.length + ' of ' + plan.selection.total + ' keys (' + plan.selection.label +
      ') in ' + env.show(plan.file, 'cwd') + '; a ledger is one shard, merge them all with --hash-merge');
    return 0;
  }
  if (plan.mode === 'update') return writeHashes(env, tools, recorded, results, plan, source);
  return reportHashes(env, tools, recorded, results, plan, source);
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
  const hashOptions = {
    check: opts.check, update: opts.update, list: opts.hashList, key: opts.hash.key, from: opts.hash.from,
    count: opts.hash.count, record: opts.hash.record, merge: opts.hash.merge, out: opts.hash.out,
    alloc: opts.alloc, timing: opts.timing
  };
  let plan;
  try {
    plan = tools.planHashRun(hashOptions);
  } catch (err) {
    console.error(err.message + '\n\n' + USAGE);
    return 2;
  }
  if (plan.mode !== 'timing') return runHashes(SG, plan, process.argv.slice(2));
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
