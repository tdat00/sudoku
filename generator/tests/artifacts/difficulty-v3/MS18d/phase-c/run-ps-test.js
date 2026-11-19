'use strict';

/*
 * MS18d Phase C0 task-owned: runs one PowerShell stand-in test of the Phase C wrapper or barrier as ONE node
 * command, so that it sits under the shared lock like every other command of this task. PowerShell runs
 * with an ISOLATED TEMP (a project-local scratch folder, removed afterwards), so that the dv3-*.lock files
 * of the stand-ins are never the real ones, and with
 *   MS18D_SCRATCH   that folder (the test refuses to run without it);
 *   GPC_MANIFEST    a helper manifest made now of the Phase C helpers and the frozen files of earlier
 *                   phases they reference (a stand-in manifest: the reviewed one is made by the freeze);
 *   GPC_TEST_EVIDENCE the folder where the test keeps the run records of its stand-ins (the scratch
 *                   folder, or the one named by --keep=<folder under
 *                   docs/difficulty-v3/evidence/MS18d/phase-c/tooling/>).
 *   node generator/tests/artifacts/difficulty-v3/MS18d/phase-c/run-ps-test.js <test.ps1> [--keep=<folder>]
 * Everything a test starts runs inside this protected command (its 540 s ceiling covers it). Exit code:
 * that of the PowerShell script (0 only when every test passed).
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { sha256, REFERENCED_FROZEN } = require('./common.js');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const TOOLING = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS18d', 'phase-c', 'tooling');
const REFERENCED = REFERENCED_FROZEN;

const [script, keep] = process.argv.slice(2);
if (!script || !/\.ps1$/.test(script)) {
  console.error('usage: run-ps-test.js <test.ps1> [--keep=<folder under phase-c/tooling>]');
  process.exit(2);
}
const scratch = fs.mkdtempSync(path.join(REPO, '.scratch-ms18d-c-ps-'));
let evidence = path.join(scratch, 'evidence');
if (keep) {
  const m = /^--keep=(.+)$/.exec(keep);
  evidence = m ? path.resolve(m[1]) : null;
  if (!evidence || path.relative(TOOLING, evidence).startsWith('..') || fs.existsSync(evidence)) {
    console.error('--keep needs a NEW folder under ' + TOOLING);
    fs.rmSync(scratch, { recursive: true, force: true });
    process.exit(2);
  }
}
fs.mkdirSync(evidence, { recursive: true });

const files = fs.readdirSync(__dirname).filter((n) => fs.statSync(path.join(__dirname, n)).isFile())
  .map((n) => 'generator\\tests\\artifacts\\difficulty-v3\\MS18d\\phase-c\\' + n).concat(REFERENCED);
const manifest = path.join(scratch, 'helpers-manifest.txt');
const hashLine = (rel) => sha256(fs.readFileSync(path.join(REPO, rel))).toUpperCase() + '  ' + rel;
fs.writeFileSync(manifest, files.map(hashLine).join('\r\n') + '\r\n');

const proc = spawn('pwsh', ['-NoProfile', '-NonInteractive', '-File', path.resolve(script)], {
  stdio: 'inherit', cwd: path.join(REPO, 'generator'),
  env: Object.assign({}, process.env, { TEMP: scratch, TMP: scratch, MS18D_SCRATCH: scratch,
    GPC_MANIFEST: manifest, GPC_TEST_EVIDENCE: evidence })
});
proc.on('close', (code) => {
  fs.rmSync(scratch, { recursive: true, force: true });
  process.exitCode = code === null ? 1 : code;
});
