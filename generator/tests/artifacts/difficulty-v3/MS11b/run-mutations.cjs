'use strict';

/*
 * MS11b scratch (from MS10b's run-mutations.cjs): one locked IR12 compound of the engine mutations. Every mutation runs
 * the tech-wing suite in its own child process and must make it fail. Admission rule (IR12): an item starts only when
 * elapsed + max(projection, generic floor) <= 450 s; the projection of an item is 30 s (basis: the unmutated tech-wing
 * run of this task, 10 s in the locked gate, about three times that), the generic floor is 60 s. Run through
 * Invoke-Dv3Node from generator/:
 *   node tests/artifacts/difficulty-v3/MS11b/run-mutations.cjs <out file> [first index] [last index]
 * The output lists, per mutation, the failing tests (all of them counted, the first six named) and how many of them
 * are tests of uniqueRectangle.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const MUTATIONS = require('./' + (process.env.MS11B_MUTATIONS || 'mutations.cjs'));

const PROJECTION_SECONDS = 30;
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
  const run = spawnSync(process.execPath, [path.join(__dirname, 'mutant-run.cjs'), String(i),
    '--suite=' + (m.suite || 'tech-wing')], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const text = (run.stdout || '') + (run.stderr || '');
  const failed = text.split(/\r?\n/).filter((l) => /^\s+FAIL /.test(l)).map((l) => l.trim());
  const own = failed.filter((l) => /uniqueRectangle/.test(l));
  const summary = (/Tests:\s+(.*)/.exec(text) || [])[1] || 'no summary';
  const seconds = ((Date.now() - t0) / 1000).toFixed(1);
  const caught = run.status === 1 && failed.length > 0;
  if (caught) detected++;
  lines.push('mutation ' + i + ' (' + m.name + '): ' + (caught ? 'DETECTED' : 'NOT DETECTED (exit ' + run.status + ')') +
    ' - ' + summary + ' - ' + failed.length + ' failing, ' + own.length + ' of uniqueRectangle - ' + seconds + ' s');
  failed.slice(0, 6).forEach((l) => lines.push('    ' + l.slice(0, 230)));
  if (!process.env.TEE_QUIET) console.log(lines.filter((l) => l.startsWith('mutation ' + i + ' ')).join(''));
});
lines.push('detected ' + detected + ' of ' + tried + (notStarted > 0 ? ', ' + notStarted + ' not started' : '') +
  ', ' + ((Date.now() - started) / 1000).toFixed(1) + ' s');
if (!process.env.TEE_QUIET) console.log(lines[lines.length - 1]);
fs.writeFileSync(path.resolve(out), lines.join('\r\n') + '\r\n', 'utf8');
process.exit(detected === tried && notStarted === 0 ? 0 : 1);
