'use strict';
// MS16 scratch (from MS15b's, names only): runs ONE run of ONE in-memory mutation (see mutations.cjs and mutant-hook.cjs): the
// runner of the run's app with `--suite=<suites> [--filter=<text>] --bail`. The file on disk is never touched. The hook is loaded
// here and in the processes the tests start (NODE_OPTIONS).
//   node generator/tests/artifacts/difficulty-v3/MS16/mutant-run.cjs <mutation index> <run index>
const path = require('path');
const { spawnSync } = require('child_process');

const MUTATIONS = require('./mutations.cjs');
const FOLLOW = [
  { app: 'generator', suites: 'techniques,technique-weights' },
  { app: 'generator', suites: 'tech-chain' }
];
const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const mutation = MUTATIONS[Number(process.argv[2])];
if (!mutation) {
  console.error('no mutation ' + process.argv[2]);
  process.exit(2);
}
const run = (process.env.MS16_RUNS === 'full' ? FOLLOW : mutation.runs)[Number(process.argv[3] || 0)];
if (!run) {
  console.error('no run ' + process.argv[3] + ' of mutation ' + process.argv[2]);
  process.exit(2);
}
const hook = path.join(__dirname, 'mutant-hook.cjs');
const args = [path.join(REPO, run.app, 'tests', 'node-runner.js'), '--suite=' + run.suites, '--bail'];
if (run.filter) args.push('--filter=' + run.filter);
const result = spawnSync(process.execPath, args, {
  cwd: path.join(REPO, run.app), encoding: 'utf8', maxBuffer: 1 << 26, timeout: 30000, killSignal: 'SIGKILL',
  env: Object.assign({}, process.env, { MS16_MUTATION: process.argv[2], NODE_OPTIONS: '--require=' + hook.replace(/\\/g, '/') })
});
process.stdout.write((result.stdout || '') + (result.stderr || ''));
if (result.error && result.error.code === 'ETIMEDOUT') {
  process.stdout.write('\nMUTANT-TIMEOUT: killed after 30 s (a full pass of the run takes under 20 s): the run did not end\n');
  process.exit(1);
}
process.exit(result.status === null ? 1 : result.status);
