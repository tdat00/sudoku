'use strict';

/*
 * Smoke-only supervisor of ONE child (phases IG-S01/self-test and IG-S01/loader-parity of the compatibility smoke).
 * It is launched by the low-priority wrapper (Invoke-IgNode, from Invoke-IgSmoke.ps1) with the wrapper's task name
 * as the lock owner text, spawns the real harness command as its child, enforces the payload deadline from the start
 * of this process, terminates only that child (by PID) when the deadline passes, verifies that it is gone and writes
 * `supervisor.json`. The child's own exit code is recorded, never propagated: this process exits 0 whenever it
 * wrote its result (exit 4: the fail-safe after the deadline; 3: a supervisor error).
 *
 *   node smoke-supervise.cjs --phase=<name> --wrapper-task=<IG-S01/...> --round=<round> --out-dir=<abs>
 *        --payload-ms=<n> -- <abs script under the harness folder> [child args...]
 */
const fs = require('fs');
const path = require('path');
const S = require('./smoke-lib.cjs');

async function main(argv) {
  const opts = S.parseArgs(argv, ['phase', 'wrapper-task', 'round', 'out-dir', 'payload-ms']);
  const payloadMs = Number(opts['payload-ms']);
  if (!Number.isFinite(payloadMs) || payloadMs < 1000) throw new Error('bad --payload-ms');
  const outDir = opts['out-dir'];
  if (!path.isAbsolute(outDir)) throw new Error('--out-dir must be absolute');
  const script = opts.rest[0];
  if (!script || !path.isAbsolute(script) || path.dirname(script) !== __dirname || !fs.existsSync(script)) {
    throw new Error('the child must be an existing absolute script directly in ' + __dirname);
  }
  const lockAtStart = S.readLockFile();
  const sup = new S.UnitSupervisor({ label: opts['wrapper-task'], payloadMs: payloadMs, outDir: outDir,
    concurrency: 1, cwd: process.cwd(), minStartMs: 500 });
  sup.addUnit({ id: 'child', kind: 'harness-command', script: script, args: opts.rest.slice(1) });
  const outcome = await sup.run();
  const doc = S.buildSupervisorDocument({ phase: opts.phase, wrapperTask: opts['wrapper-task'], round: opts.round,
    payloadMs: payloadMs, concurrency: 1, lockAtStart: lockAtStart }, outcome);
  const written = S.writeJsonFile(path.join(outDir, 'supervisor.json'), doc);
  const child = doc.units[0];
  process.stdout.write(JSON.stringify({ ig: 'smoke-supervise', phase: opts.phase, child: child.status,
    exit: child.exitCode, timedOut: doc.summary.timedOut, terminationsVerified: doc.summary.terminationsVerified + '/' +
    doc.summary.terminations, wallMs: child.wallMs, sha256: written.sha256 }) + '\n');
  return doc.summary.terminations > doc.summary.terminationsVerified ? 5 : 0;
}

main(process.argv.slice(2)).then(function (code) {
  process.exitCode = code;
  process.stdout.write('', function () { process.exit(code); });
}, function (err) {
  process.stderr.write('IG smoke-supervise error: ' + (err && err.stack ? err.stack : String(err)) + '\n');
  process.exit(3);
});
