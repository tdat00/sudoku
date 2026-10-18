#!/usr/bin/env node
'use strict';

/*
 * Headless test runner (Node >= 18, built-in modules only).
 *
 *   node tests/node-runner.js [--suite=<name>[,<name>]] [--filter=<text>] [--bail] [--verbose] [--help]
 *
 * Exit code: 0 when every test passed, 1 on any failure, load error, unknown suite or when no test ran.
 *
 * ===========================================================================================
 * SOURCE_FILES CONTRACT - read before touching this file
 * ===========================================================================================
 * SOURCE_FILES lists EVERY source file planned in design.md section 12.1, in dependency load order,
 * including files that do not exist yet. Missing files are skipped silently (listed with --verbose).
 * That is deliberate: a later phase that creates one of these files never has to edit this runner,
 * so this file is not a merge-conflict hotspot.
 *
 *   - Only edit the array when you add a source file that is NOT in it yet; put it in its correct
 *     dependency position and keep the relative order of the other entries.
 *   - Keep the order in sync with index.html and js/worker/gen.worker.js (design.md 12.2) and the
 *     file list in tests.html.
 *
 * Test discovery is automatic: tests/fixtures/*.js load first, then tests/suites/*.test.js in
 * alphabetical order. Adding a suite or fixture needs no change here.
 *
 * Suites loaded by vm.runInThisContext do not have `require`. Node helpers for suites that need the
 * file system are exposed as `SG.test.node` = { fs, path, vm, root } (undefined in a browser).
 * ===========================================================================================
 */
const SOURCE_FILES = [
  'js/core/ns.js',
  'js/core/errors.js',
  'js/core/bits.js',
  'js/core/budget.js',
  'js/core/rng.js',
  'js/core/model.js',
  'js/core/constraints.js',
  'js/core/combo-table.js',
  'js/core/dfs-solver.js',
  'js/core/techniques.js',
  'js/core/logical-solver.js',
  'js/core/tech-basic.js',
  'js/core/tech-subset.js',
  'js/core/tech-fish.js',
  'js/core/tech-wing.js',
  'js/core/tech-chain.js',
  'js/core/tech-cage.js',
  'js/core/tech-ineq.js',
  'js/core/difficulty.js',
  'js/core/full-grid.js',
  'js/core/symmetry.js',
  'js/core/digger.js',
  'js/core/events.js',
  'js/core/explain-data.js',
  'js/core/pipeline.js',
  'js/variants/registry.js',
  'js/variants/classic.js',
  'js/variants/mega.js',
  'js/variants/extra-regions.js',
  'js/variants/jigsaw.js',
  'js/variants/killer.js',
  'js/variants/greater-than.js',
  'js/variants/multigrid.js',
  'js/variants/wordoku.js',
  'assets/wordlists/isograms.en.js',
  'assets/wordlists/isograms.vi.js',
  'js/worker/worker-client.js',
  'js/ui/exchange.js',
  'js/ui/i18n.js',
  'js/ui/locale.en.js',
  'js/ui/locale.vi.js',
  'js/ui/locale.shell.js',
  'js/ui/symbols.js',
  'js/ui/board-view.js',
  'js/ui/store.js',
  'js/ui/controls.js',
  'js/ui/step-view.js',
  'js/ui/explain.js',
  'js/ui/player.js',
  'js/ui/result-view.js',
  'js/ui/cache.js',
  'js/ui/history.js',
  'js/ui/export.js',
  'js/ui/a11y.js',
  'js/ui/theme.js',
  'js/ui/help.js',
  'js/ui/app.js'
];

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const HARNESS_FILE = 'tests/harness.js';
const FIXTURES_DIR = 'tests/fixtures';
const SUITES_DIR = 'tests/suites';
const SUITE_SUFFIX = '.test.js';

const USE_COLOR = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

function paint(code, text) {
  return USE_COLOR ? '\u001b[' + code + 'm' + text + '\u001b[0m' : text;
}
const green = (t) => paint('32', t);
const red = (t) => paint('31', t);
const yellow = (t) => paint('33', t);
const dim = (t) => paint('2', t);
const bold = (t) => paint('1', t);

const USAGE = [
  'Usage: node tests/node-runner.js [options]',
  '',
  '  --suite=<name>[,<name>]  run only these suites (file name without ".test.js")',
  '  --filter=<text>          run only tests whose full name contains <text> (case-insensitive)',
  '  --bail                   stop after the first failing test',
  '  --verbose                print every test, skipped source files and benchmark timings',
  '  --help                   show this help'
].join('\n');

function parseArgs(argv) {
  const opts = { suites: [], filter: null, bail: false, verbose: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--bail') opts.bail = true;
    else if (arg === '--verbose') opts.verbose = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else {
      const m = /^--(suite|filter)(?:=(.*))?$/.exec(arg);
      if (!m) throw new Error('Unknown argument: ' + arg);
      const value = m[2] !== undefined ? m[2] : argv[++i];
      if (value === undefined || value === '') throw new Error('Missing value for --' + m[1]);
      if (m[1] === 'suite') {
        value.split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => opts.suites.push(s));
      } else {
        opts.filter = value;
      }
    }
  }
  return opts;
}

function runFile(relPath) {
  const abs = path.join(ROOT, relPath);
  const code = fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, '');
  vm.runInThisContext(code, { filename: abs });
}

function listFiles(relDir, suffix) {
  const abs = path.join(ROOT, relDir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs)
    .filter((name) => name.endsWith(suffix) && fs.statSync(path.join(abs, name)).isFile())
    .sort();
}

function formatMs(ms) {
  return ms >= 1000 ? (ms / 1000).toFixed(2) + ' s' : Math.round(ms) + ' ms';
}

function formatFailure(record, verbose) {
  const lines = ['  ' + red('FAIL') + ' ' + record.fullName];
  const err = record.error;
  lines.push('       ' + red(err.name + ': ' + err.message));
  const frames = err.stack.split('\n').filter((l) => /^\s+at /.test(l));
  const shown = verbose ? frames : frames.filter((l) => !l.includes('harness.js')).slice(0, 4);
  shown.forEach((l) => lines.push(dim('       ' + l.trim())));
  return lines.join('\n');
}

function printTest(record) {
  const time = dim('(' + formatMs(record.ms) + ')');
  if (record.status === 'pass') console.log('  ' + green('ok  ') + ' ' + record.fullName + ' ' + time);
  else if (record.status === 'skip') {
    console.log('  ' + yellow('skip') + ' ' + record.fullName + (record.reason ? dim(' - ' + record.reason) : ''));
  } else console.log(formatFailure(record, true));
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message + '\n\n' + USAGE);
    return 1;
  }
  if (opts.help) {
    console.log(USAGE);
    return 0;
  }

  const started = process.hrtime.bigint();

  runFile(HARNESS_FILE);
  const SG = globalThis.SG;
  SG.test.node = Object.freeze({ fs: fs, path: path, vm: vm, root: ROOT });

  const loaded = [];
  const missing = [];
  for (const rel of SOURCE_FILES) {
    if (!fs.existsSync(path.join(ROOT, rel))) {
      missing.push(rel);
      continue;
    }
    try {
      runFile(rel);
      loaded.push(rel);
    } catch (err) {
      console.error(red('Failed to load source file ' + rel + ':') + '\n' + (err && err.stack ? err.stack : err));
      return 1;
    }
  }

  for (const name of listFiles(FIXTURES_DIR, '.js')) {
    try {
      runFile(FIXTURES_DIR + '/' + name);
    } catch (err) {
      console.error(red('Failed to load fixture ' + name + ':') + '\n' + (err && err.stack ? err.stack : err));
      return 1;
    }
  }

  const suiteFiles = listFiles(SUITES_DIR, SUITE_SUFFIX);
  const available = suiteFiles.map((f) => f.slice(0, -SUITE_SUFFIX.length));
  const unknown = opts.suites.filter((s) => !available.includes(s));
  if (unknown.length > 0) {
    console.error('Unknown suite: ' + unknown.join(', ') + '\nAvailable suites: ' + available.join(', '));
    return 1;
  }
  const selected = opts.suites.length > 0 ? available.filter((s) => opts.suites.includes(s)) : available;

  for (const name of selected) {
    SG.test.setSuite(name);
    try {
      runFile(SUITES_DIR + '/' + name + SUITE_SUFFIX);
    } catch (err) {
      SG.test.addLoadError(name, err);
    }
  }

  console.log(bold('Sudoku Generator tests') + dim('  (node ' + process.version + ')'));
  console.log('Sources: ' + loaded.length + ' loaded, ' + missing.length + ' planned but not created yet' +
    (opts.verbose ? '' : dim(' (--verbose lists them)')));
  if (opts.verbose) {
    loaded.forEach((f) => console.log('  loaded  ' + f));
    missing.forEach((f) => console.log(dim('  missing ' + f)));
  }
  console.log('');

  const results = await SG.test.run({
    suite: selected,
    filter: opts.filter,
    bail: opts.bail,
    onSuiteStart: opts.verbose ? (name) => console.log(bold(name)) : undefined,
    onTestEnd: opts.verbose ? printTest : undefined,
    onSuiteEnd: (s) => {
      const status = s.failed > 0 ? red('FAIL') : green('ok  ');
      const counts = s.passed + ' passed' + (s.skipped ? ', ' + s.skipped + ' skipped' : '') +
        (s.failed ? ', ' + s.failed + ' failed' : '');
      console.log(status + ' ' + s.name + ': ' + counts + dim('  (' + formatMs(s.ms) + ')'));
    }
  });

  const failures = results.tests.filter((t) => t.status === 'fail');
  if (!opts.verbose && failures.length > 0) {
    console.log('\n' + bold('Failures:'));
    failures.forEach((t) => console.log(formatFailure(t, false)));
  }
  if (opts.verbose && results.benches.length > 0) {
    console.log('\n' + bold('Benchmarks:'));
    results.benches.forEach((b) => {
      console.log('  ' + b.name + ': ' + b.msPerOp.toFixed(4) + ' ms/op, ' + Math.round(b.opsPerSec) + ' ops/s (' +
        b.iterations + ' iterations)');
    });
  }

  const wallMs = Number(process.hrtime.bigint() - started) / 1e6;
  console.log('');
  console.log('Suites: ' + results.suites.length);
  console.log('Tests:  ' + results.total + ' total, ' + green(results.passed + ' passed') + ', ' +
    (results.failed > 0 ? red(results.failed + ' failed') : '0 failed') + ', ' + results.skipped + ' skipped' +
    (results.bailed ? yellow('  (stopped early: --bail)') : ''));
  console.log('Time:   ' + formatMs(results.ms) + ' running tests, ' + formatMs(wallMs) + ' total');

  if (results.total === 0) {
    console.log(red('No tests were run.'));
    return 1;
  }
  return results.failed > 0 ? 1 : 0;
}

main().then(
  (code) => { process.exitCode = code; },
  (err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
);
