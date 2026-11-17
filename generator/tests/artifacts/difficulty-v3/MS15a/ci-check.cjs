'use strict';

// MS15a scratch (from MS14b's): runs the CI manifest check (bash .github/scripts/generator-suites.sh check, through Git's bash: plain
// `bash` is WSL here) from the repository root, so that tee-run.cjs can record its output. Usage (from generator/):
//   node tests/artifacts/difficulty-v3/MS15a/tee-run.cjs <out file> tests/artifacts/difficulty-v3/MS15a/ci-check.cjs
const { spawnSync } = require('child_process');

const run = spawnSync('C:\\Program Files\\Git\\bin\\bash.exe', ['.github/scripts/generator-suites.sh', 'check'],
  { cwd: 'Q:\\git\\sudoku', stdio: 'inherit' });
process.exit(run.status === null ? 1 : run.status);
