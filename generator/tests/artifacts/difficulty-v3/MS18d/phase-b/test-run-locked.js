'use strict';

/*
 * MS18d Phase B task-owned: runs test-run-locked.ps1 (the tests of the Phase B lock wrapper) as ONE command
 * under the real shared lock. PowerShell runs with an ISOLATED TEMP (a project-local scratch folder), so the
 * stand-ins and the fake lock files of those tests never touch the real dv3-*.lock files, and everything
 * that starts runs inside this protected command (its 540 s ceiling covers it; the tests need well under a
 * minute).
 *   node generator/tests/artifacts/difficulty-v3/MS18d/phase-b/test-run-locked.js
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const script = path.join(__dirname, 'test-run-locked.ps1');
const scratch = fs.mkdtempSync(path.join(REPO, '.scratch-ms18d-b-rl-'));
const env = Object.assign({}, process.env, { TEMP: scratch, TMP: scratch, MS18D_SCRATCH: scratch });

const child = spawn('pwsh', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script],
  { stdio: 'inherit', env });
const limit = setTimeout(() => {
  console.log('the wrapper tests exceeded 150 s; stopping them');
  child.kill();
}, 150000);
child.on('error', (err) => {
  console.log('cannot start pwsh: ' + err.message);
  process.exitCode = 1;
});
child.on('close', (code) => {
  clearTimeout(limit);
  fs.rmSync(scratch, { recursive: true, force: true });
  process.exitCode = code === 0 ? 0 : 1;
});
