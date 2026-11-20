'use strict';

// MS13b scratch (copied from MS13a's): runs the CI manifest check (bash .github/scripts/generator-suites.sh check) from the
// repository root, so that tee-run.cjs can record its output. Usage (from generator/):
//   node tests/artifacts/difficulty-v3/MS13b/tee-run.cjs <out file> tests/artifacts/difficulty-v3/MS13b/ci-check.cjs
const { spawnSync } = require('child_process');

const run = spawnSync('C:\\Program Files\\Git\\bin\\bash.exe', ['.github/scripts/generator-suites.sh', 'check'],
  { cwd: 'Q:\\git\\sudoku', stdio: 'inherit' });
process.exit(run.status === null ? 1 : run.status);
