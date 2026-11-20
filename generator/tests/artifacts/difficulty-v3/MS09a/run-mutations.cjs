'use strict';

/*
 * MS09a scratch (from MS08b's run-mutations.cjs): one locked IR12 compound of the engine mutations. Every mutation runs
 * the tech-fish suite in its own child process and must make it fail. Admission rule (IR12): an item starts only when
 * elapsed + max(projection, generic floor) <= 450 s; the projection of an item is 20 s (basis: the unmutated tech-fish
 * run of this task, 10.4 s, about twice that), the generic floor is 60 s. Run through Invoke-Dv3Node from generator/:
 *   node tests/artifacts/difficulty-v3/MS09a/run-mutations.cjs <out file> [first index] [last index]
 * The output lists, per mutation, the failing tests (all of them counted, the first six named) and how many of them
 * are tests of the finned X-Wing.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const MUTATIONS = require('./mutations.cjs');

const PROJECTION_SECONDS = 20;
const FLOOR_SECONDS = 60;
const LIMIT_SECONDS = 450;
const out = process.argv[2];
const first = Number(process.argv[3] || 0);
const last = Number(process.argv[4] || MUTATIONS.length - 1);
const lines = [];
let detected = 0;
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
  const run = spawnSync(process.execPath, [path.join(__dirname, 'mutant-run.cjs'), String(i), '--suite=tech-fish'],
    { encoding: 'utf8', maxBuffer: 1 << 26 });
  const text = (run.stdout || '') + (run.stderr || '');
  const failed = text.split(/\r?\n/).filter((l) => /^\s+FAIL /.test(l)).map((l) => l.trim());
  const own = failed.filter((l) => /finned/.test(l));
  const summary = (/Tests:\s+(.*)/.exec(text) || [])[1] || 'no summary';
  const seconds = ((Date.now() - t0) / 1000).toFixed(1);
  const caught = run.status === 1 && failed.length > 0;
  if (caught) detected++;
  lines.push('mutation ' + i + ' (' + m.name + '): ' + (caught ? 'DETECTED' : 'NOT DETECTED (exit ' + run.status + ')') +
    ' - ' + summary + ' - ' + failed.length + ' failing, ' + own.length + ' of the finned X-Wing - ' + seconds + ' s');
  failed.slice(0, 6).forEach((l) => lines.push('    ' + l.slice(0, 230)));
  console.log(lines.filter((l) => l.startsWith('mutation ' + i + ' ')).join(''));
});
lines.push('detected ' + detected + ' of ' + tried + (notStarted > 0 ? ', ' + notStarted + ' not started' : '') +
  ', ' + ((Date.now() - started) / 1000).toFixed(1) + ' s');
console.log(lines[lines.length - 1]);
fs.writeFileSync(path.resolve(out), lines.join('\r\n') + '\r\n', 'utf8');
process.exit(detected === tried && notStarted === 0 ? 0 : 1);
