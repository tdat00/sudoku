#!/usr/bin/env node
'use strict';

/*
 * Headless test runner (Node >= 18, built-in modules only).
 *
 *   node tests/node-runner.js [--all | --manual] [--suite=<name>[,<name>]] [--filter=<text>] [--bail]
 *                             [--verbose] [--help]
 *
 * Two sets of suites:
 *   tests/suites/  the quick set (default, about 60 s): what a developer or an agent runs after every change,
 *                  together with ../core/tests/suites, the engine suites shared with the player;
 *   tests/manual/  the heavy suites (about 8 minutes: every variant, every level, performance, regression
 *                  hashes). Run them with --all (CI does) or --manual, or by name with --suite=<name>.
 *
 * Exit code: 0 when every test passed, 1 on any failure, load error, unknown suite or when no test ran.
 *
 * SOURCE_FILES lists every source file in dependency load order. It is the reference order: index.html,
 * js/worker/gen.worker.js (design.md 12.2) and tests.html repeat it, and the ui-contract suite checks that
 * they agree. tests/soak.js, perf.js and qualify.js read the array from this file. A listed file that does
 * not exist is skipped (listed with --verbose).
 *
 * Test discovery is automatic: the harness and the fixtures of ../core/tests and tests/fixtures/*.js load
 * first, then the suites of ../core/tests/suites and tests/suites/*.test.js (and tests/manual/*.test.js when
 * asked), each directory in alphabetical order; a suite name must be unique. Adding a suite or fixture needs
 * no change here.
 *
 * Suites loaded by vm.runInThisContext do not have `require`. Node helpers for suites that need the
 * file system are exposed as `SG.test.node` = { fs, path, vm, root } (undefined in a browser).
 */
const SOURCE_FILES = [
  '../core/js/engine/ns.js',
  '../core/js/engine/errors.js',
  '../core/js/engine/bits.js',
  '../core/js/engine/budget.js',
  'js/engine/rng.js',
  '../core/js/engine/model.js',
  '../core/js/engine/constraints.js',
  '../core/js/engine/combo-table.js',
  '../core/js/engine/dfs-solver.js',
  '../core/js/engine/techniques.js',
  '../core/js/engine/logical-solver.js',
  '../core/js/engine/tech-basic.js',
  '../core/js/engine/tech-subset.js',
  '../core/js/engine/tech-fish.js',
  '../core/js/engine/tech-wing.js',
  '../core/js/engine/tech-chain.js',
  '../core/js/engine/tech-cage.js',
  '../core/js/engine/tech-ineq.js',
  '../core/js/engine/classic-model.js',
  '../core/js/engine/model-aids.js',
  'js/engine/difficulty.js',
  'js/engine/full-grid.js',
  'js/engine/symmetry.js',
  'js/engine/digger.js',
  'js/engine/events.js',
  'js/engine/explain-data.js',
  'js/engine/pipeline.js',
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
  '../core/js/ui/exchange.js',
  'js/ui/i18n.js',
  'js/ui/locale.en.js',
  'js/ui/locale.vi.js',
  'js/ui/locale.shell.js',
  '../core/js/ui/symbols.js',
  '../core/js/ui/board-view.js',
  'js/ui/store.js',
  'js/ui/controls.js',
  'js/ui/step-view.js',
  'js/ui/explain.js',
  'js/ui/player.js',
  '../core/assets/wordbook/words.vi.js',
  '../core/assets/wordbook/words.en.js',
  '../core/js/ui/wordbook.js',
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
const HARNESS_FILE = '../core/tests/harness.js';
// The suites and fixtures shared with the other project (core/tests) come first, then the project's own.
const FIXTURES_DIRS = ['../core/tests/fixtures', 'tests/fixtures'];
const SUITES_DIRS = ['../core/tests/suites', 'tests/suites'];
const MANUAL_DIR = 'tests/manual';
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
  'Without options only the quick suites of tests/suites run.',
  '',
  '  --all                    run the quick suites and the manual (heavy) ones of tests/manual',
  '  --manual                 run only the manual (heavy) suites',
  '  --suite=<name>[,<name>]  run only these suites, quick or manual (file name without ".test.js")',
  '  --filter=<text>          run only tests whose full name contains <text> (case-insensitive)',
  '  --bail                   stop after the first failing test',
  '  --verbose                print every test, skipped source files and benchmark timings',
  '  --help                   show this help'
].join('\n');

function parseArgs(argv) {
  const opts = {
    suites: [], filter: null, bail: false, verbose: false, help: false, all: false, manual: false
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--bail') opts.bail = true;
    else if (arg === '--all') opts.all = true;
    else if (arg === '--manual') opts.manual = true;
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

/** The suites of every directory as { name, dir }; a name must be unique across all directories. */
function listSuites(dirs) {
  const found = [];
  for (const dir of dirs) {
    for (const file of listFiles(dir, SUITE_SUFFIX)) {
      const name = file.slice(0, -SUITE_SUFFIX.length);
      const clash = found.find((s) => s.name === name);
      if (clash) throw new Error('Suite "' + name + '" exists in both ' + clash.dir + ' and ' + dir);
      found.push({ name: name, dir: dir });
    }
  }
  return found;
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
    const reason = record.reason ? dim(' - ' + record.reason) : '';
    console.log('  ' + yellow('skip') + ' ' + record.fullName + reason);
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
      console.error(red('Failed to load source file ' + rel + ':') + '\n' +
        (err && err.stack ? err.stack : err));
      return 1;
    }
  }

  for (const dir of FIXTURES_DIRS) {
    for (const name of listFiles(dir, '.js')) {
      try {
        runFile(dir + '/' + name);
      } catch (err) {
        console.error(red('Failed to load fixture ' + name + ':') + '\n' +
          (err && err.stack ? err.stack : err));
        return 1;
      }
    }
  }

  const quickList = listSuites(SUITES_DIRS);
  const manualList = listSuites([MANUAL_DIR]);
  const quick = quickList.map((s) => s.name);
  const manual = manualList.map((s) => s.name);
  const available = quick.concat(manual).sort();
  const dirOf = (name) => quickList.concat(manualList).find((s) => s.name === name).dir;
  const unknown = opts.suites.filter((s) => !available.includes(s));
  if (unknown.length > 0) {
    console.error('Unknown suite: ' + unknown.join(', ') + '\nAvailable suites: ' + available.join(', '));
    return 1;
  }
  let selected;
  if (opts.suites.length > 0) selected = available.filter((s) => opts.suites.includes(s));
  else if (opts.all) selected = available;
  else if (opts.manual) selected = manual;
  else selected = quick;

  for (const name of selected) {
    SG.test.setSuite(name);
    try {
      runFile(dirOf(name) + '/' + name + SUITE_SUFFIX);
    } catch (err) {
      SG.test.addLoadError(name, err);
    }
  }

  console.log(bold('Sudoku Generator tests') + dim('  (node ' + process.version + ')'));
  console.log('Sources: ' + loaded.length + ' loaded, ' + missing.length + ' missing' +
    (opts.verbose ? '' : dim(' (--verbose lists them)')));
  if (opts.suites.length === 0 && !opts.all && !opts.manual && manual.length > 0) {
    console.log(dim('Quick suites only (' + quick.length + '); --all also runs the ' + manual.length +
      ' manual ones of tests/manual.'));
  }
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
      console.log('  ' + b.name + ': ' + b.msPerOp.toFixed(4) + ' ms/op, ' + Math.round(b.opsPerSec) +
        ' ops/s (' + b.iterations + ' iterations)');
    });
  }

  const wallMs = Number(process.hrtime.bigint() - started) / 1e6;
  console.log('');
  console.log('Suites: ' + results.suites.length);
  console.log('Tests:  ' + results.total + ' total, ' + green(results.passed + ' passed') + ', ' +
    (results.failed > 0 ? red(results.failed + ' failed') : '0 failed') + ', ' + results.skipped +
    ' skipped' + (results.bailed ? yellow('  (stopped early: --bail)') : ''));
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
