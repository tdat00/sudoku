'use strict';

/*
 * MS18d Phase C0 task-owned STAND-IN of the stock timing CLI (tests/perf.js), for the verification of the
 * Phase C transport only: never a generator, never a measurement, never GP evidence. The tests copy it, as
 * `generator/tests/perf.js`, into a scratch tree, so that the controller starts it with the frozen command
 * line. It reads that command line (`--variant= --level= --runs= --warmup= --seed= --gate --ascii`) and
 * behaves as FAKE_GP_MODE says (default `ok`); the target it prints is FAKE_GP_TARGET_MS.
 *   ok | miss                 the stock success output (exit 0) or the stock miss output (exit 1)
 *   crash                     the header and legend, then an uncaught error: a stack on stderr, exit 1
 *   partial                   the output up to the column header, exit 0
 *   wrong-cell | wrong-target the stock success output for another cell / another target text
 *   wrong-count               a summary `2 of 2`
 *   missing-miss              a MISS row with `0 of 1` and exit 1 but no Misses: block
 *   ok-exit1 | miss-exit0     a consistent output with the opposite exit code
 *   summary-contradiction     an ok row with the summary `0 of 1`
 *   stderr                    the stock success output and a line on stderr, exit 0
 *   slow                      the first lines, FAKE_HOLD ms (default 1500), then the rest (exit 0)
 *   survive                   the stock success output, exit 0, and a grandchild that outlives it
 *   hang | hang-grand         the header, then waiting for 60 s (with a hanging grandchild)
 * With FAKE_PIDFILE set it appends `<role> <pid>` lines (role: FAKE_ROLE, default `command`).
 */
const fs = require('fs');
const { spawn } = require('child_process');
const { stockOutput } = require('./stock-fixtures.js');

const mode = process.env.FAKE_GP_MODE || 'ok';
const role = process.env.FAKE_ROLE || 'command';
if (process.env.FAKE_PIDFILE) fs.appendFileSync(process.env.FAKE_PIDFILE, role + ' ' + process.pid + '\n');

const opt = {};
process.argv.slice(2).forEach((a) => {
  const m = /^--([a-z]+)=(.+)$/.exec(a);
  if (m) opt[m[1]] = m[2];
});
const targetMs = Number(process.env.FAKE_GP_TARGET_MS || 100);
const base = { variant: opt.variant, level: opt.level, targetMs, p50: targetMs / 4, p95: targetMs / 2,
  max: targetMs * 0.8, mean: targetMs / 3 };
const miss = Object.assign({}, base, { p95: targetMs * 1.5, max: targetMs * 2 });
const hold = Number(process.env.FAKE_HOLD || 1500);

function hang() {
  setInterval(() => {}, 1000);
  setTimeout(() => process.exit(0), 60000);
}

function grandchild() {
  // detached: a child of a node process otherwise dies with it (libuv puts the children of a node process in
  // a job that is closed when the process ends), and the barrier has nothing to find
  const g = spawn(process.execPath, [__filename], {
    detached: true, stdio: 'ignore',
    env: Object.assign({}, process.env, { FAKE_GP_MODE: 'hang', FAKE_ROLE: 'grandchild' })
  });
  g.unref();
}

function print(text, code) {
  process.stdout.write(text);
  setTimeout(() => process.exit(code), 30);
}

if (mode === 'ok') print(stockOutput(base), 0);
else if (mode === 'miss') print(stockOutput(miss), 1);
else if (mode === 'crash') {
  process.stdout.write(stockOutput(base).split('\n').slice(0, 3).join('\n') + '\n');
  setTimeout(() => { throw new Error('stand-in generation error'); }, 30);
} else if (mode === 'partial') print(stockOutput(base).split('\n').slice(0, 4).join('\n') + '\n', 0);
else if (mode === 'wrong-cell') {
  print(stockOutput(Object.assign({}, base, { variant: 'killer', level: 'easy' })), 0);
}
else if (mode === 'wrong-target') print(stockOutput(Object.assign({}, base, { targetMs: targetMs + 1 })), 0);
else if (mode === 'wrong-count') print(stockOutput(Object.assign({}, base, { met: 2, cells: 2 })), 0);
else if (mode === 'missing-miss') print(stockOutput(Object.assign({}, miss, { misses: false })), 1);
else if (mode === 'ok-exit1') print(stockOutput(base), 1);
else if (mode === 'miss-exit0') print(stockOutput(miss), 0);
else if (mode === 'summary-contradiction') print(stockOutput(Object.assign({}, base, { met: 0 })), 0);
else if (mode === 'stderr') {
  process.stderr.write('an unexplained warning\n');
  print(stockOutput(base), 0);
} else if (mode === 'slow') {
  const lines = stockOutput(base).split('\n');
  process.stdout.write(lines.slice(0, 4).join('\n') + '\n');
  setTimeout(() => print(lines.slice(4).join('\n'), 0), hold);
} else if (mode === 'survive') {
  grandchild();
  print(stockOutput(base), 0);
} else if (mode === 'hang') {
  process.stdout.write(stockOutput(base).split('\n').slice(0, 3).join('\n') + '\n');
  hang();
} else if (mode === 'hang-grand') {
  grandchild();
  process.stdout.write(stockOutput(base).split('\n').slice(0, 3).join('\n') + '\n');
  hang();
} else {
  console.error('unknown FAKE_GP_MODE ' + mode);
  process.exit(9);
}
