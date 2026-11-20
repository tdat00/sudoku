'use strict';

/*
 * MS08a scratch: one locked compound (IR12) of the engine mutations: every mutation runs the tech-fish suite in its own
 * child process (about 8 s each, projection 15 s each, 10 mutations: 150 s <= 450 s) and must make it fail. Run through
 * Invoke-Dv3Node from generator/:
 *   node tests/artifacts/difficulty-v3/MS08a/run-mutations.cjs <out file>
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const MUTATIONS = require('./mutations.cjs');

const out = process.argv[2];
const lines = [];
let detected = 0;
const started = Date.now();
MUTATIONS.forEach((m, i) => {
  const t0 = Date.now();
  const run = spawnSync(process.execPath, [path.join(__dirname, 'mutant-run.cjs'), String(i), '--suite=tech-fish'],
    { encoding: 'utf8', maxBuffer: 1 << 26 });
  const text = (run.stdout || '') + (run.stderr || '');
  const failed = text.split(/\r?\n/).filter((l) => /^\s+FAIL /.test(l)).map((l) => l.trim());
  const summary = (/Tests:\s+(.*)/.exec(text) || [])[1] || 'no summary';
  const seconds = ((Date.now() - t0) / 1000).toFixed(1);
  const caught = run.status === 1 && failed.length > 0;
  if (caught) detected++;
  lines.push('mutation ' + i + ' (' + m.name + '): ' + (caught ? 'DETECTED' : 'NOT DETECTED (exit ' + run.status + ')') +
    ' - ' + summary + ' - ' + seconds + ' s');
  failed.slice(0, 4).forEach((l) => lines.push('    ' + l.slice(0, 200)));
  console.log(lines[lines.length - 1 - Math.min(4, failed.length)]);
});
lines.push('detected ' + detected + ' of ' + MUTATIONS.length + ', ' + ((Date.now() - started) / 1000).toFixed(1) + ' s');
console.log(lines[lines.length - 1]);
fs.writeFileSync(path.resolve(out), lines.join('\r\n') + '\r\n', 'utf8');
process.exit(detected === MUTATIONS.length ? 0 : 1);
