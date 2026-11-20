'use strict';
// MS14c scratch (from MS14b's): one IR12 compound of the mutations: for every mutation of [first, last], its runs in order until one
// fails (the mutation is DETECTED by that run; a failing run stops the mutant) or all pass (it SURVIVED). Admission (IR12): a mutation
// starts only when elapsed + max(projection, floor) <= 450 s; the projection of a mutation is the sum of its runs' own bounds (a
// stated conservative bound: a full pass of the suite and the start of the runner, measured in the development runs), the generic
// floor is 60 s. Run through Invoke-Dv3Node from the repository root:
//   node generator/tests/artifacts/difficulty-v3/MS14c/run-mutations.cjs <out file> [first index] [last index]
// The output lists, per mutation, the run that failed and its first failing test.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const MUTATIONS = require('./mutations.cjs');

// Stated per-run bounds in seconds (a full pass of the suite, with the startup of the runner and its sources).
const BOUND = { 'tech-cage': 10, techniques: 14 };
const FLOOR_SECONDS = 60;
const LIMIT_SECONDS = 450;
const out = process.argv[2];
const first = Number(process.argv[3] || 0);
const last = Number(process.argv[4] || MUTATIONS.length - 1);
const only = process.env.MUT_ONLY ? process.env.MUT_ONLY.split(',').map(Number) : null;
const lines = [];
let detected = 0;
let survivors = 0;
let notStarted = 0;
let tried = 0;
const started = Date.now();
MUTATIONS.forEach((m, i) => {
  if (i < first || i > last) return;
  if (only !== null && only.indexOf(i) === -1) return;
  const elapsed = (Date.now() - started) / 1000;
  const projection = m.runs.reduce((n, r) => n + (BOUND[r.suites] || 30), 0);
  if (elapsed + Math.max(projection, FLOOR_SECONDS) > LIMIT_SECONDS) {
    notStarted++;
    lines.push('mutation ' + i + ' (' + m.name + '): NOT STARTED (elapsed ' + elapsed.toFixed(1) + ' s, projection ' + projection + ' s)');
    return;
  }
  tried++;
  const t0 = Date.now();
  let caught = null;
  let failed = [];
  let summary = 'no summary';
  let which = -1;
  for (let r = 0; r < m.runs.length && caught === null; r++) {
    const run = spawnSync(process.execPath, [path.join(__dirname, 'mutant-run.cjs'), String(i), String(r)], { encoding: 'utf8', maxBuffer: 1 << 26 });
    const text = (run.stdout || '') + (run.stderr || '');
    failed = text.split(/\r?\n/).filter((l) => /^\s+FAIL /.test(l)).map((l) => l.trim());
    summary = (/Tests:\s+(.*)/.exec(text) || [])[1] || 'no summary';
    if (run.status === 2 && /fragment is not found exactly once|no mutation/.test(text)) {
      caught = false;
      lines.push('mutation ' + i + ' (' + m.name + '): BAD FRAGMENT');
      break;
    }
    if (run.status === 1 && failed.length > 0) {
      caught = true;
      which = r;
    }
  }
  const seconds = ((Date.now() - t0) / 1000).toFixed(1);
  if (caught) detected++;
  else survivors++;
  const line = 'mutation ' + i + ' (' + m.name + '): ' + (caught ? 'DETECTED by run ' + which + ' (' + m.runs[which].app + ' ' + m.runs[which].suites +
    (m.runs[which].filter ? ' ~' + m.runs[which].filter : '') + ')' : (m.equivalent ? 'NOT DETECTED, EQUIVALENT (' + m.equivalent + ')' : 'NOT DETECTED')) +
    ' - ' + summary + ' - ' + failed.length + ' failing - ' + seconds + ' s';
  lines.push(line);
  if (caught) failed.slice(0, 2).forEach((l) => lines.push('    ' + l.slice(0, 230).replace(/\s+$/, '')));
  if (!process.env.TEE_QUIET) console.log(line);
});
lines.push('detected ' + detected + ' of ' + tried + ', survivors ' + survivors + (notStarted > 0 ? ', ' + notStarted + ' not started' : '') + ', ' + ((Date.now() - started) / 1000).toFixed(1) + ' s');
if (!process.env.TEE_QUIET) console.log(lines[lines.length - 1]);
fs.writeFileSync(path.resolve(out), lines.join('\r\n') + '\r\n', 'utf8');
process.exit(notStarted === 0 ? 0 : 1);
