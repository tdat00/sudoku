'use strict';

/*
 * MS18b task-owned CLI of the bounded admission re-ask (the MS18a-Q2 rule renewed by the MS18b brief): runs
 * the named entries (or a named phase) of docs/difficulty-v3/evidence/MS18b/plan-recheck.json in order
 * through attempts.cjs, which holds all the rules (EXPERIMENT-AWARE identity: family, setting, variant,
 * level, seed, absolute span and logical total; at most two admission attempts per entry counted from the
 * retained lock-log rows, the re-ask at least 60 s after the recorded release with no lock held, no payload
 * rerun, a second eligible hold is a named gap, any other failure stops). Each attempt is one locked command
 * started as
 *   pwsh -NoProfile -File run-entry.ps1 -Id <entry> -Attempt <n>
 * (run-locked.ps1: the lock helper, the MS18b admission policy, the 15 s gap). Attempt 2 only changes the id
 * (`<entry>-admission2`), so its readiness, transcript and lock-log records are distinct; the payload, span,
 * seed, setting and canonical ledger path are the entry's.
 *   node generator/tests/artifacts/difficulty-v3/MS18b/drive.cjs <entry id> [more entry ids...]
 *   node generator/tests/artifacts/difficulty-v3/MS18b/drive.cjs --phase=<phase name>
 * Exit code: 0 every listed entry done; 4 INCOMPLETE (at least one unexecuted gap, nothing stopped, even
 * when a later entry exited 0); 1 STOPPED (an identity, evidence, payload or unexpected failure); 2 usage.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const attempts = require('./attempts.cjs');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const EVIDENCE = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS18b');
const readText = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null);
const plan = JSON.parse(readText(path.join(EVIDENCE, 'plan-recheck.json')));

let ids = process.argv.slice(2);
const phaseArg = ids.find((a) => a.startsWith('--phase='));
if (phaseArg) {
  const phase = plan.phases[phaseArg.slice(8)];
  if (!phase) {
    console.error('no such phase; phases: ' + Object.keys(plan.phases).join(', '));
    process.exit(2);
  }
  ids = ids.filter((a) => a !== phaseArg).concat(phase);
}
if (ids.length === 0) {
  console.error('usage: drive.cjs <entry id> [more entry ids...] | --phase=<name>');
  process.exit(2);
}

const store = {
  records: () => (readText(path.join(EVIDENCE, 'lock-log.jsonl')) || '').split(/\r?\n/).filter(Boolean)
    .map((line) => JSON.parse(line)),
  readiness: (id) => {
    const text = readText(path.join(EVIDENCE, 'readiness', id + '.json'));
    return text === null ? null : JSON.parse(text);
  },
  transcript: (id) => readText(path.join(EVIDENCE, 'logs', id + '.txt')),
  ledgerExists: (entry) => fs.existsSync(path.join(EVIDENCE, entry.json))
};

const stamp = () => new Date().toISOString().slice(11, 19) + 'Z';
const log = (line) => console.log('[' + stamp() + '] ' + line);
const sleeper = new Int32Array(new SharedArrayBuffer(4));
const SHOWN = /^LOCKED|^STOP|^strict screen|^DIAGNOSTICS|^RESULT|^Shard of|^ATTEMPT/;

function launch(entry, ordinal) {
  const script = path.join(__dirname, 'run-entry.ps1');
  log('launch ' + entry.id + ' attempt ' + ordinal);
  const run = spawnSync('pwsh', ['-NoProfile', '-File', script, '-Id', entry.id, '-Attempt', String(ordinal)],
    { encoding: 'utf8', maxBuffer: 1 << 28, timeout: 1800000, windowsHide: true });
  String(run.stdout || '').split(/\r?\n/).filter((line) => SHOWN.test(line))
    .forEach((line) => console.log('  ' + line));
  String(run.stderr || '').split(/\r?\n/).filter(Boolean).forEach((line) => console.log('  stderr: ' + line));
  log('run-entry.ps1 exit ' + run.status);
}

const outcome = attempts.run(ids, {
  plan: plan, store: store, launch: launch, now: () => Date.now(),
  sleep: (ms) => Atomics.wait(sleeper, 0, 0, ms),
  lockHeld: () => fs.existsSync(path.join(process.env.TEMP, 'dv3-sudoku.lock')),
  log: log
});
outcome.lines.forEach((line) => console.log(line));
process.exitCode = outcome.exitCode;
