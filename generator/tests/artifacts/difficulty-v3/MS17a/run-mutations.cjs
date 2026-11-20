'use strict';

/*
 * MS17a scratch (from MS13b's run-mutations.cjs): one locked IR12 compound of the mutations. Every mutation runs the
 * `history` suite in its own child process and must make it fail. Admission rule (IR12): an item starts only when
 * elapsed + max(projection, generic floor) <= 450 s; the projection of an item is 15 s (a stated conservative bound: the
 * unmutated suite measured 2.7 s, startup included, in logs/d1-history-1.txt), the generic floor is 60 s. Run through
 * Invoke-Dv3Node from the repository root:
 *   node generator/tests/artifacts/difficulty-v3/MS17a/run-mutations.cjs <out file> [first index] [last index]
 * The output lists, per mutation, the failing tests (all of them counted, the first six named). A mutation marked
 * `equivalent` is expected to survive; it counts as detected only when it is killed.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const MUTATIONS = require('./mutations.cjs');

const PROJECTION_SECONDS = 15;
const FLOOR_SECONDS = 60;
const LIMIT_SECONDS = 450;
const out = process.argv[2];
const first = Number(process.argv[3] || 0);
const last = Number(process.argv[4] || MUTATIONS.length - 1);
const lines = [];
let detected = 0;
let survivors = 0;
let notStarted = 0;
let tried = 0;
const started = Date.now();
MUTATIONS.forEach((m, i) => {
  if (i < first || i > last) return;
  const elapsed = (Date.now() - started) / 1000;
  if (elapsed + Math.max(PROJECTION_SECONDS, FLOOR_SECONDS) > LIMIT_SECONDS) {
    notStarted++;
    lines.push('mutation ' + i + ' (' + m.name + '): NOT STARTED (elapsed ' + elapsed.toFixed(1) + ' s)');
    return;
  }
  tried++;
  const t0 = Date.now();
  const run = spawnSync(process.execPath, [path.join(__dirname, 'mutant-run.cjs'), String(i)],
    { encoding: 'utf8', maxBuffer: 1 << 26 });
  const text = (run.stdout || '') + (run.stderr || '');
  const failed = text.split(/\r?\n/).filter((l) => /^\s+FAIL /.test(l)).map((l) => l.trim());
  const summary = (/Tests:\s+(.*)/.exec(text) || [])[1] || 'no summary';
  const seconds = ((Date.now() - t0) / 1000).toFixed(1);
  const caught = run.status === 1 && failed.length > 0;
  if (caught) detected++;
  else survivors++;
  const line = 'mutation ' + i + ' (' + m.name + '): ' + (caught ? 'DETECTED' : (m.equivalent ? 'NOT DETECTED, EQUIVALENT (' +
    m.equivalent + ')' : 'NOT DETECTED (exit ' + run.status + ')')) + ' - ' + summary + ' - ' + failed.length + ' failing - ' +
    seconds + ' s';
  lines.push(line);
  failed.slice(0, 6).forEach((l) => lines.push('    ' + l.slice(0, 230).replace(/\s+$/, '')));
  if (!process.env.TEE_QUIET) console.log(line);
});
lines.push('detected ' + detected + ' of ' + tried + ', survivors ' + survivors +
  (notStarted > 0 ? ', ' + notStarted + ' not started' : '') + ', ' + ((Date.now() - started) / 1000).toFixed(1) + ' s');
if (!process.env.TEE_QUIET) console.log(lines[lines.length - 1]);
fs.writeFileSync(path.resolve(out), lines.join('\r\n') + '\r\n', 'utf8');
process.exit(notStarted === 0 ? 0 : 1);
