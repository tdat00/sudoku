'use strict';

// MS18c closure task-owned (from MS17b's ci-check.cjs): runs the CI manifest check (bash
// .github/scripts/generator-suites.sh check, through Git's bash: plain `bash` is WSL here) from the
// repository root, so that tee-run.cjs can record its output. Usage (from generator/, through Invoke-Locked):
//   node tests/artifacts/difficulty-v3/MS18c/ci-check.cjs
const { spawnSync } = require('child_process');

const run = spawnSync('C:\\Program Files\\Git\\bin\\bash.exe',
  ['.github/scripts/generator-suites.sh', 'check'],
  { cwd: 'Q:\\git\\sudoku', stdio: 'inherit' });
process.exit(run.status === null ? 1 : run.status);
