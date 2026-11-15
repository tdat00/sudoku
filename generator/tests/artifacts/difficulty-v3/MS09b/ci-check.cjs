'use strict';

// MS08c scratch: runs the CI manifest check (bash .github/scripts/generator-suites.sh check) from the repository root,
// so that tee-run.cjs can record its output. Usage (from generator/):
//   node tests/artifacts/difficulty-v3/MS08c/tee-run.cjs <out file> tests/artifacts/difficulty-v3/MS08c/ci-check.cjs
const { spawnSync } = require('child_process');

const run = spawnSync('C:\\Program Files\\Git\\bin\\bash.exe', ['.github/scripts/generator-suites.sh', 'check'],
  { cwd: 'Q:\\git\\sudoku', stdio: 'inherit' });
process.exit(run.status === null ? 1 : run.status);
