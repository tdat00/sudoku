'use strict';
// MS16 scratch (from MS15b's): one IR12 compound of the mutations: for every mutation of [first, last], its runs in order until one
// fails (the mutation is DETECTED by that run; a failing run stops the mutant) or all pass (it SURVIVED). Admission (IR12): a
// mutation starts only when elapsed + max(projection, floor) <= 450 s; the projection of a mutation is the sum of its runs' own
// bounds (a stated conservative bound for a SURVIVING run: 15 s for the 62 Sue de Coq tests, measured 8.6 s of process; 30 s for
// any whole suite), the generic floor is 60 s. Run through Invoke-Locked from the generator folder:
//   node tests/artifacts/difficulty-v3/MS16/run-mutations.cjs <out file> [first index] [last index]
// MUT_ONLY=3,7,9 restricts to those indices; MUT_RUNS=full replaces every mutant's runs by the follow-up list (the whole tech-als
// suite and the registry, chain and weight suites). The output lists, per mutation, the run that failed and its first failing test.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const MUTATIONS = require('./mutations.cjs');

const FOLLOW = [
  { app: 'generator', suites: 'techniques,technique-weights' },
  { app: 'generator', suites: 'tech-chain' }
];
const BOUND = { 'tech-als~sue-de-coq': 15, 'tech-als': 30, 'techniques,technique-weights': 15, 'tech-chain': 30 };
const FLOOR_SECONDS = 60;
const LIMIT_SECONDS = 450;
const out = process.argv[2];
const first = Number(process.argv[3] || 0);
const last = Number(process.argv[4] || MUTATIONS.length - 1);
const only = process.env.MUT_ONLY ? process.env.MUT_ONLY.split(',').map(Number) : null;
const follow = process.env.MUT_RUNS === 'full';
const lines = [];
let detected = 0;
let survivors = 0;
let notStarted = 0;
let tried = 0;
const started = Date.now();
function key(run) { return run.suites + (run.filter ? '~' + run.filter : ''); }
MUTATIONS.forEach((m, i) => {
  if (i < first || i > last) return;
  if (only !== null && only.indexOf(i) === -1) return;
  const runs = follow ? FOLLOW : m.runs;
  const elapsed = (Date.now() - started) / 1000;
  const projection = runs.reduce((n, r) => n + (BOUND[key(r)] || 30), 0);
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
  for (let r = 0; r < runs.length && caught === null; r++) {
    const run = spawnSync(process.execPath, [path.join(__dirname, 'mutant-run.cjs'), String(i), String(r)], {
      encoding: 'utf8', maxBuffer: 1 << 26, env: Object.assign({}, process.env, follow ? { MS16_RUNS: 'full' } : {})
    });
    const text = (run.stdout || '') + (run.stderr || '');
    failed = text.split(/\r?\n/).filter((l) => /^\s+FAIL /.test(l)).map((l) => l.trim());
    summary = (/Tests:\s+(.*)/.exec(text) || [])[1] || 'no summary';
    if (run.status === 2 && /fragment is not found exactly once|no mutation/.test(text)) {
      caught = false;
      lines.push('mutation ' + i + ' (' + m.name + '): BAD FRAGMENT');
      break;
    }
    if (run.status === 1 && /MUTANT-TIMEOUT/.test(text)) {
      caught = true;
      which = r;
      failed = ['TIMEOUT: killed after 30 s, the test run did not end (non-termination)'];
      summary = 'killed after 30 s';
    } else if (run.status === 1 && failed.length > 0) {
      caught = true;
      which = r;
    }
  }
  const seconds = ((Date.now() - t0) / 1000).toFixed(1);
  if (caught) detected++;
  else survivors++;
  const used = which >= 0 ? runs[which] : null;
  const line = 'mutation ' + i + ' (' + m.name + '): ' + (caught ? 'DETECTED by run ' + which + ' (' + used.app + ' ' + used.suites +
    (used.filter ? ' ~' + used.filter : '') + ')' : (m.equivalent ? 'NOT DETECTED, EQUIVALENT (' + m.equivalent + ')' : 'NOT DETECTED')) +
    ' - ' + summary + ' - ' + failed.length + ' failing - ' + seconds + ' s';
  lines.push(line);
  if (caught) failed.slice(0, 2).forEach((l) => lines.push('    ' + l.slice(0, 230).replace(/\s+$/, '')));
  if (!process.env.TEE_QUIET) console.log(line);
});
lines.push('detected ' + detected + ' of ' + tried + ', survivors ' + survivors + (notStarted > 0 ? ', ' + notStarted + ' not started' : '') + ', ' + ((Date.now() - started) / 1000).toFixed(1) + ' s');
if (!process.env.TEE_QUIET) console.log(lines[lines.length - 1]);
fs.writeFileSync(path.resolve(out), lines.join('\r\n') + '\r\n', 'utf8');
process.exit(notStarted === 0 ? 0 : 1);
