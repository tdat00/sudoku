#!/usr/bin/env node
'use strict';

/*
 * MS18d Phase C0 task-owned: the transport CONTROLLER, the node command the shared helper runs inside the
 * lock. It stays alive above the tee (tee-c.js) and the command, through the orphan barrier, so that the
 * ordinary cleanup after a tee outcome happens while our lock is still held. It does no CPU readiness work
 * in C0 (that is C1) and is not a detached or recovery service; the unchanged 540 s of the shared helper
 * covers the whole tree, and nothing here adds a deadline of its own. It works for ANY payload (SA1 C0-6):
 * the G3 check is supplied per payload type by payloads.js.
 *
 *   node controller.js --request=<run directory>/request.json
 *
 * While the payload runs the controller (and the tee) do no periodic work: it waits for the close event of
 * the tee, with no timer, no poll and no process query; its CPU time and the tee's are recorded at the end
 * (C0-5). In order, every step writing its record into the run directory before the next one starts:
 *   1. the first statement takes the ACTUAL start instant (G1) and pids.jsonl gets the controller's
 *      identity; a Node flag (process.execArgv, NODE_OPTIONS: the tee's child inherits it) is a hold (R5);
 *   2. the lock files are read (who holds ours, when the helper took it) and the release history of the
 *      Phase A, B and C logs and any coordinator evidence is collected (G2); acquisition.json is the G1
 *      decision, which includes the wrapper's lock watch (the proof of the last release for locks held by
 *      others);
 *   3. the source binding (G4, against the campaign base, R3) is made, binding.json; the payload type's own
 *      checks (its plan manifest, the attempt accounting of its unit derived from the immutable run
 *      folders, R4) are recorded; the lock is read again right before the payload; admission.json carries
 *      them and the final decision;
 *   4. a hold stops here: result.json says `control-hold`, no payload was started, the exit code is 64;
 *   5. otherwise the tee starts the command; the tee's and the command's pid and spawn time window, the
 *      command's real exit and the raw byte counts of its stdout and stderr are in pids.jsonl (written by
 *      the tee without querying any process), transcript.txt, stdout.txt and stderr.txt fill as it runs;
 *   6. after ANY tee outcome the barrier (owned-processes.ps1) runs, cleanup.json (G5);
 *   7. the classifier of the payload type (G3) writes result.json and the exit code: 0 complete success,
 *      1 complete miss (only for a type that defines it), 65 stop (anything incomplete, contradictory or
 *      unexplained), 66 the barrier could not prove the cleanup (hold), 67 an error of the controller
 *      itself. 64 is a hold before any payload.
 */
const T0 = Date.now();
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseIsoMs, appendJsonl, writeJsonExclusive, readJsonl } = require('./common.js');
const { collectReleases } = require('./release-history.js');
const { decideAcquisition } = require('./acquisition.js');
const { bindSource, declaredRunDirs } = require('./source-binding.js');
const { payloadFor, boundedResult } = require('./payloads.js');

const EXIT = { HOLD: 64, STOP: 65, BARRIER: 66, ERROR: 67 };

const REAL_GP = path.resolve(__dirname, '..', '..', '..', '..', '..', '..', 'docs', 'difficulty-v3',
  'evidence', 'MS18d', 'gp');

function loadRequest(file) {
  const request = JSON.parse(fs.readFileSync(file, 'utf8'));
  const need = ['runId', 'runDir', 'repo', 'profile', 'command', 'requestedAt', 'wrapperPid', 'slotBefore',
    'releaseSources', 'expected', 'powershell', 'ownedProcesses'];
  need.forEach((k) => {
    if (request[k] === undefined || request[k] === null) throw new Error('the request has no ' + k);
  });
  if (request.schema !== 'ms18d-c-request-1') throw new Error('the request schema is ' + request.schema);
  if (!Array.isArray(request.command.args) || request.command.args.length === 0) {
    throw new Error('no command');
  }
  const norm = path.resolve(request.runDir).replace(/\\/g, '/').toLowerCase();
  const gp = REAL_GP.replace(/\\/g, '/').toLowerCase();
  if (request.standin !== true && !new RegExp('^' + gp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
    '/[^/]+/[^/]+$').test(norm)) {
    throw new Error('a real run directory is docs/difficulty-v3/evidence/MS18d/gp/<cell or all-79>/<run-id>');
  }
  if (request.standin === true && (norm === gp || norm.startsWith(gp + '/'))) {
    throw new Error('a stand-in never writes into the real GP matrix');
  }
  return request;
}

/** The two lock files of the shared slot as the shared helper writes them: `<pid>|<task>|<UTC instant>`. */
function readLockState() {
  const tmp = process.env.TEMP || os.tmpdir();
  const shared = path.join(tmp, 'dv3-sudoku.lock');
  const timing = path.join(tmp, 'dv3-timing.lock');
  const state = { tmp, sharedPresent: fs.existsSync(shared), timingPresent: fs.existsSync(timing), raw: null,
    ownerPid: null, task: null, acquiredAtMs: null };
  if (state.sharedPresent) {
    try {
      state.raw = fs.readFileSync(shared, 'utf8');
      const parts = state.raw.split('|');
      if (parts.length >= 3 && /^\d+$/.test(parts[0])) {
        state.ownerPid = Number(parts[0]);
        state.task = parts.slice(1, -1).join('|');
        state.acquiredAtMs = parseIsoMs(parts[parts.length - 1]);
      }
    } catch (err) {
      state.raw = null;
    }
  }
  return state;
}

function fixtureIo(file) {
  const f = JSON.parse(fs.readFileSync(file, 'utf8'));
  return {
    git: (args) => {
      if (args[0] === 'rev-parse') return f.head + '\n';
      if (args[0] === 'status') return f.statusPorcelainZ || '';
      if (args[0] === 'show') {
        const text = f.committed && f.committed[args[1].replace(/^HEAD:/, '')];
        if (text === undefined) throw new Error('not committed');
        return text;
      }
      if (args[0] === 'merge-base') {
        if (f.descendant === false) throw new Error('not an ancestor');
        return '';
      }
      if (args[0] === 'diff') return (f.diffNames || []).map((n) => n + '\0').join('');
      throw new Error('the fixture knows no git ' + args[0]);
    },
    readWorking: (rel) => {
      if (!f.workingFiles || f.workingFiles[rel] === undefined) throw new Error('no such working file');
      return f.workingFiles[rel];
    },
    identities: () => f.identities,
    table: () => ({ sha256: f.table.sha256, positions: f.table.positions,
      targetOf: (key) => (f.table.targets[key] === undefined ? null : f.table.targets[key]) }),
    machine: () => f.machine,
    node: () => f.node
  };
}

function runBarrier(request, recordsFile, cleanupFile) {
  const args = ['-NoProfile', '-NonInteractive', '-File', request.ownedProcesses, '-Action', 'barrier',
    '-RecordsFile', recordsFile, '-OutFile', cleanupFile];
  // a stand-in may replace the process table (and then nothing is ever stopped): the unknown-liveness cases
  if (request.standin === true && request.barrierSnapshotFile) {
    args.push('-SnapshotFile', request.barrierSnapshotFile);
  }
  const run = childProcess.spawnSync(request.powershell, args, { encoding: 'utf8', timeout: 90000 });
  let record = null;
  try {
    record = JSON.parse(fs.readFileSync(cleanupFile, 'utf8'));
  } catch (err) {
    record = null;
  }
  if (!record) {
    return { verdict: 'hold-unknown', problems: ['the barrier wrote no cleanup record (exit ' + run.status +
      ', signal ' + run.signal + '): ' + String(run.stderr || '').trim()], file: null };
  }
  return Object.assign({ file: path.basename(cleanupFile), scriptExit: run.status }, record);
}

function lastLine(text) {
  const lines = String(text).split(/\r?\n/).filter((l) => l.trim() !== '');
  return lines.length > 0 ? lines[lines.length - 1] : null;
}

function readOrNull(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (err) {
    return null;
  }
}

async function main(argv) {
  const arg = argv.map((a) => /^--request=(.+)$/.exec(a)).filter(Boolean)[0];
  if (!arg) {
    console.error('usage: controller.js --request=<request.json>');
    return 2;
  }
  let request;
  let payload;
  try {
    request = loadRequest(path.resolve(arg[1]));
    payload = payloadFor(request);
    payload.validateRequest(request);
  } catch (err) {
    console.error('the request is refused: ' + err.message);
    return 2;
  }
  const runDir = path.resolve(request.runDir);
  const file = (name) => path.join(runDir, name);
  const pids = file('pids.jsonl');
  const requestedAtMs = parseIsoMs(request.requestedAt);
  const base = { schema: 'ms18d-c-result-1', runId: request.runId, standin: request.standin === true,
    profile: request.profile, cell: request.cell || null, task: request.task || null, startedAtMs: T0 };
  const finish = (result, code) => {
    const cpu = process.cpuUsage();
    writeJsonExclusive(file('result.json'), Object.assign({}, base, result, { controllerExit: code,
      cpu: Object.assign({ controller: { userMicros: cpu.user, systemMicros: cpu.system } }, result.cpu),
      finishedAtMs: Date.now() }));
    return code;
  };

  appendJsonl(pids, { role: 'controller', pid: process.pid, ppid: process.ppid,
    beforeMs: Number.isFinite(requestedAtMs) ? requestedAtMs : T0 - 60000, afterMs: T0 });
  const state = { teeStarted: false, barrierDone: false };
  try {
    if (request.allowExit1 !== payload.allowsMissExit) {
      return finish({ outcome: 'control-hold', payloadStarted: false, heldAt: 'request',
        reasons: ['the wrapper and the payload type disagree on whether exit 1 is defined'] }, EXIT.HOLD);
    }
    // R5: the tee's child inherits the environment, so a Node flag is a hold, never silently cleared
    const flagReasons = [];
    if (process.execArgv.length > 0) flagReasons.push('process.execArgv is not empty');
    if (process.env.NODE_OPTIONS !== undefined && process.env.NODE_OPTIONS !== '') {
      flagReasons.push('NODE_OPTIONS is set');
    }
    if (flagReasons.length > 0) {
      return finish({ outcome: 'control-hold', payloadStarted: false, heldAt: 'node-flags',
        reasons: flagReasons }, EXIT.HOLD);
    }

    // G1 and G2
    const lock = readLockState();
    const history = collectReleases(request.releaseSources);
    const acquisition = decideAcquisition({ requestedAtMs, startedAtMs: T0,
      lockAcquiredAtMs: lock.acquiredAtMs, slotBefore: request.slotBefore, history,
      watch: request.watch });
    acquisition.lockAtStart = { sharedPresent: lock.sharedPresent, timingPresent: lock.timingPresent,
      ownerPid: lock.ownerPid, task: lock.task, controllerPid: process.pid, controllerParentPid: process.ppid,
      wrapperPid: request.wrapperPid };
    acquisition.historyFiles = history.files;
    const own = [];
    if (!lock.sharedPresent) own.push('our-lock-file-is-absent');
    else if (lock.ownerPid !== request.wrapperPid) own.push('the-lock-is-not-held-by-the-wrapper');
    if (process.ppid !== request.wrapperPid) own.push('the-controller-is-not-a-child-of-the-wrapper');
    if (lock.timingPresent) own.push('the-timing-lock-is-present');
    if (own.length > 0) {
      acquisition.reasons = Array.from(new Set(acquisition.reasons.concat(own)));
      acquisition.decision = 'hold';
    }
    writeJsonExclusive(file('acquisition.json'), acquisition);
    if (acquisition.decision !== 'proceed') {
      return finish({ outcome: 'control-hold', payloadStarted: false, reasons: acquisition.reasons,
        heldAt: 'acquisition' }, EXIT.HOLD);
    }

    // G4
    if (request.bindingFixture && request.standin !== true) {
      throw new Error('a binding fixture is for stand-ins only');
    }
    const io = request.bindingFixture ? fixtureIo(request.bindingFixture)
      : require('./source-io.js').liveIo(request.repo);
    const ledgerRuns = [];
    if (request.cLedger && fs.existsSync(request.cLedger)) {
      readJsonl(request.cLedger).entries.forEach((e) => {
        if (e.value && e.value.runDir) ledgerRuns.push(e.value.runDir);
      });
    }
    // R2: the directories the frozen manifest declares, literally; a payload type without a manifest (the
    // stock cell and the generic stand-ins) is given its declared directories by the request
    let declaredDirs = [];
    let planProblems = [];
    try {
      declaredDirs = payload.declaredDirs ? payload.declaredDirs(request) : request.declaredDirs || [];
    } catch (err) {
      planProblems = ['the declared run directories could not be read: ' + err.message];
    }
    const thisRun = path.relative(request.repo, runDir).replace(/\\/g, '/');
    const binding = bindSource({
      expected: Object.assign({}, request.expected, { cell: payload.cellOf(request) || null }),
      allow: { declaredRuns: declaredRunDirs(ledgerRuns, thisRun, declaredDirs), declaredDirs,
        ledger: request.ledgerRel || undefined },
      helpers: request.helpers || null, requireHead: request.standin !== true, io
    });
    planProblems.forEach((p) => binding.problems.push(p));
    if (planProblems.length > 0) binding.ok = false;
    writeJsonExclusive(file('binding.json'), binding);

    // the payload type's own checks of its plan and of the attempts of its unit (R4), recorded before the
    // admission
    let extra = { ok: true, problems: [] };
    if (payload.extraChecks) {
      extra = payload.extraChecks(request, { runDir, cLedger: request.cLedger || null, nowMs: Date.now() });
      Object.keys(extra.records || {}).forEach((name) => writeJsonExclusive(file(name), extra.records[name]));
    }

    // the final lock recheck, immediately before the payload
    const recheck = readLockState();
    const stable = recheck.sharedPresent && recheck.raw === lock.raw && !recheck.timingPresent;
    const admission = { schema: 'ms18d-c-admission-1', acquisition: acquisition.decision, binding: binding.ok,
      payloadChecks: extra.ok, finalLockRecheck: { stable, sharedPresent: recheck.sharedPresent,
        timingPresent: recheck.timingPresent },
      readiness: null,
      note: 'CPU readiness is C1 work; C0 admits on acquisition, binding and the lock recheck only' };
    admission.decision = acquisition.decision === 'proceed' && binding.ok && extra.ok && stable
      ? 'proceed' : 'hold';
    writeJsonExclusive(file('admission.json'), admission);
    if (admission.decision !== 'proceed') {
      const reasons = [].concat(binding.ok ? [] : binding.problems, extra.ok ? [] : extra.problems,
        stable ? [] : ['the lock changed before the payload']);
      return finish({ outcome: 'control-hold', payloadStarted: false, reasons, heldAt: 'binding' },
        EXIT.HOLD);
    }

    // the payload, through the tee: from here to the close event of the tee nothing runs but the event wait
    const env = Object.assign({}, process.env,
      { TEE_QUIET: '1', TEE_SPAWN_RECORD: pids, TEE_STREAMS_DIR: runDir });
    if (request.command.exec) env.TEE_EXEC = request.command.exec;
    if (request.teeDetached === true && request.standin === true) env.TEE_DETACHED = '1';
    const before = Date.now();
    const tee = childProcess.spawn(process.execPath,
      [path.join(__dirname, 'tee-c.js'), file('transcript.txt')].concat(request.command.args),
      { cwd: path.join(request.repo, 'generator'), stdio: 'ignore', env });
    const after = Date.now();
    state.teeStarted = true;
    appendJsonl(pids, { role: 'tee', pid: tee.pid, ppid: process.pid, beforeMs: before, afterMs: after });
    const teeEnd = await new Promise((resolve) => {
      tee.on('error', (err) => resolve({ code: null, signal: null, error: err.message }));
      tee.on('close', (code, signal) => resolve({ code, signal, error: null }));
    });

    // G5, after any tee outcome
    const barrier = runBarrier(request, pids, file('cleanup.json'));
    state.barrierDone = true;

    // G3, by the payload type
    const records = readJsonl(pids).entries.map((e) => e.value);
    const exitEvent = records.filter((r) => r && r.event === 'command-exit').pop() || null;
    const teeExit = records.filter((r) => r && r.event === 'tee-exit').pop() || null;
    const transcript = readOrNull(file('transcript.txt'));
    const lines = transcript === null ? [] : transcript.split(/\r?\n/);
    const evidence = {
      request, runDir, stdout: readOrNull(file('stdout.txt')), stderr: readOrNull(file('stderr.txt')),
      stdoutBytes: teeExit ? teeExit.stdoutBytes : null, stderrBytes: teeExit ? teeExit.stderrBytes : null,
      cli: { exit: exitEvent ? exitEvent.code : null, signal: exitEvent ? exitEvent.signal : null },
      tee: { marker: transcript === null ? null : lastLine(transcript), exit: teeEnd.code },
      argvLine: lines.length > 0 ? lines[0] : null, barrier, binding, acquisition,
      readRunFile: (name) => readOrNull(path.join(runDir, name)),
      readRunBytes: (name) => {
        try {
          return fs.readFileSync(path.join(runDir, name));
        } catch (err) {
          return null;
        }
      }
    };
    if (!exitEvent && teeEnd.signal) evidence.cli.signal = teeEnd.signal;
    const classified = boundedResult(payload, payload.classify(evidence));
    const barrierHold = String(barrier.verdict).indexOf('hold') === 0;
    const code = barrierHold ? EXIT.BARRIER : classified.controllerExit;
    return finish({ outcome: classified.outcome, payloadStarted: true, classification: classified,
      cli: classified.cli || evidence.cli, tee: Object.assign({ pid: tee.pid, processExit: teeEnd.code,
        processSignal: teeEnd.signal, spawnError: teeEnd.error }, classified.tee),
      barrier: { verdict: barrier.verdict, file: barrier.file || null, problems: barrier.problems || [] },
      rawBytes: { stdout: evidence.stdoutBytes, stderr: evidence.stderrBytes },
      cpu: { tee: teeExit ? { userMicros: teeExit.cpuUserMicros, systemMicros: teeExit.cpuSystemMicros }
        : null },
      files: { transcript: 'transcript.txt', stdout: 'stdout.txt', stderr: 'stderr.txt',
        pids: 'pids.jsonl' } },
    code);
  } catch (err) {
    if (state.teeStarted && !state.barrierDone) {
      try {
        runBarrier(request, pids, file('cleanup-after-error.json'));
      } catch (inner) { /* the error below is the one that matters */ }
    }
    try {
      return finish({ outcome: state.teeStarted ? 'stop' : 'control-hold', payloadStarted: state.teeStarted,
        error: String(err && err.stack || err) }, EXIT.ERROR);
    } catch (inner) {
      console.error(String(err && err.stack || err));
      return EXIT.ERROR;
    }
  }
}

main(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
}, (err) => {
  console.error(String(err && err.stack || err));
  process.exitCode = EXIT.ERROR;
});
