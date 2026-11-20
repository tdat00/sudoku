'use strict';

/*
 * MS18d Phase C0 task-owned STAND-IN of controller.js, only for the tests of the wrapper's own bookkeeping
 * (test-run-locked-c.ps1): it reads the same request, writes the controller's identity to pids.jsonl, then
 * does what FAKE_CONTROLLER_MODE says. It starts no payload and measures nothing.
 *   ok             result.json success (controller exit 0), exit 0
 *   hold           result.json control-hold with no payload (exit 64), exit 64
 *   hold-started   result.json control-hold that claims a payload started (exit 64), exit 64
 *   miss           result.json miss (exit 1), exit 1
 *   result0-exit3  result.json success (exit 0), but the process exits 3: the two disagree
 *   no-result      exit 0 without result.json
 *   orphan         result.json success, exit 0, but a detached process of the run (recorded as the command)
 *                  outlives it: the wrapper barrier has to find and stop it
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const arg = process.argv.slice(2).map((a) => /^--request=(.+)$/.exec(a)).filter(Boolean)[0];
if (!arg) {
  console.error('usage: fake-controller.js --request=<request.json>');
  process.exit(2);
}
const request = JSON.parse(fs.readFileSync(arg[1], 'utf8'));
const dir = request.runDir;
const mode = process.env.FAKE_CONTROLLER_MODE;
const pids = path.join(dir, 'pids.jsonl');
const record = (o) => fs.appendFileSync(pids, JSON.stringify(o) + '\r\n');
const result = (outcome, code, started) => fs.writeFileSync(path.join(dir, 'result.json'),
  JSON.stringify({ schema: 'ms18d-c-result-1', runId: request.runId, standin: true, outcome,
    payloadStarted: started, controllerExit: code }) + '\r\n');

const t = Date.now();
record({ role: 'controller', pid: process.pid, ppid: process.ppid, beforeMs: t - 60000, afterMs: t });

if (mode === 'ok') {
  result('success', 0, true);
} else if (mode === 'hold') {
  result('control-hold', 64, false);
  process.exitCode = 64;
} else if (mode === 'hold-started') {
  result('control-hold', 64, true);
  process.exitCode = 64;
} else if (mode === 'miss') {
  result('miss', 1, true);
  process.exitCode = 1;
} else if (mode === 'result0-exit3') {
  result('success', 0, true);
  process.exitCode = 3;
} else if (mode === 'no-result') {
  process.exitCode = 0;
} else if (mode === 'orphan') {
  const before = Date.now();
  const child = spawn(process.execPath, ['-e', 'setTimeout(function () {}, 60000)'],
    { detached: true, stdio: 'ignore' });
  record({ role: 'command', pid: child.pid, ppid: process.pid, beforeMs: before, afterMs: Date.now() });
  child.unref();
  result('success', 0, true);
} else {
  console.error('unknown FAKE_CONTROLLER_MODE ' + mode);
  process.exitCode = 9;
}
