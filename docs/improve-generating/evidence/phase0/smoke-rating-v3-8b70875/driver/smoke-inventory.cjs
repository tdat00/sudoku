'use strict';

/*
 * Smoke-only phase IG-S01/smoke-inventory: source-list / fingerprint inspection first, then the source-only adapter
 * dry runs and plan-only of IG-S01..IG-S10, with the explicit engine-free test entry points as time permits. Every
 * piece is a child process of this supervisor (one owned PID each), so the payload deadline, counted from the start of
 * this process, is enforced even when a piece blocks; nothing generates a puzzle or loads an engine. Excluded by
 * design: engine retests (ig04-retest), audit drivers (ig02-killer-audit), dev-check generators (ig05-dev-check,
 * ig09-dev-check) and every test group that needs evidence (only the synthetic `gate` group of ig10-test runs).
 *
 *   node smoke-inventory.cjs --round=<r> --out-dir=<abs> --payload-ms=<n> --expect-root=<abs> --reference-root=<abs>
 *        --forbidden-roots=<abs|abs> --target-commit=<sha> --runtime-label=<text> [--concurrency=<n>]
 *        [--tests=all|none]   (none: probes only, for a development check of the wiring; the smoke runs all)
 */
const path = require('path');
const S = require('./smoke-lib.cjs');

const HERE = __dirname;
const at = function (name) { return path.join(HERE, name); };

// Priority order: the files that exercise the patched sources of the real runtime first.
const TESTS = [
  { id: 'ig07-test.pure', file: 'ig07-test.cjs', args: [] },
  { id: 'ig09-test.pure', file: 'ig09-test.cjs', args: [] },
  { id: 'ig08-test.pure', file: 'ig08-test.cjs', args: [] },
  { id: 'scoped-test.pure', file: 'scoped-test.cjs', args: [] },
  { id: 'frontier-test.pure', file: 'frontier-test.cjs', args: [] },
  { id: 'pool-test.pure', file: 'pool-test.cjs', args: ['--only=pure'] },
  { id: 'ig05-test.pure', file: 'ig05-test.cjs', args: [] },
  { id: 'killer-audit-test.pure', file: 'killer-audit-test.cjs', args: [] },
  { id: 'ig10-test.gate', file: 'ig10-test.cjs', args: ['gate'] }
];

async function main(argv) {
  const opts = S.parseArgs(argv, ['round', 'out-dir', 'payload-ms', 'expect-root', 'reference-root',
    'forbidden-roots', 'target-commit', 'runtime-label', 'concurrency', 'tests']);
  const payloadMs = Number(opts['payload-ms']);
  if (!Number.isFinite(payloadMs) || payloadMs < 1000) throw new Error('bad --payload-ms');
  if (!path.isAbsolute(opts['out-dir'])) throw new Error('--out-dir must be absolute');
  const concurrency = Number(opts.concurrency || 4);
  const lockAtStart = S.readLockFile();
  const sup = new S.UnitSupervisor({ label: 'IG-S01/smoke-inventory', payloadMs: payloadMs,
    outDir: opts['out-dir'], concurrency: concurrency, cwd: process.cwd(), minStartMs: 900 });
  const common = ['--round=' + opts.round];
  sup.addUnit({ id: 'inspect', kind: 'probe', script: at('smoke-probe.cjs'), parse: 'json', barrier: true,
    stopOnFail: true, verify: function (rec) {
      const roots = rec.parsed && rec.parsed.roots;
      return roots && roots.belongsToSmokeWorktree === true ? null :
        'the loaded source root or fingerprint does not belong to the smoke worktree';
    }, args: ['--mode=inspect'].concat(common, ['--expect-root=' + opts['expect-root'],
      '--reference-root=' + opts['reference-root'], '--forbidden-roots=' + opts['forbidden-roots'],
      '--target-commit=' + opts['target-commit']]) });
  sup.addUnit({ id: 'analyze', kind: 'probe', script: at('smoke-probe.cjs'), parse: 'json',
    args: ['--mode=analyze'].concat(common, ['--runtime-label=' + opts['runtime-label']]) });
  TESTS.forEach(function (t) {
    if (opts.tests === 'none') return;
    sup.addUnit({ id: t.id, kind: 'engine-free-test', script: at(t.file), parse: 'tests', args: t.args });
  });
  const outcome = await sup.run();
  const doc = S.buildSupervisorDocument({ phase: 'smoke-inventory', wrapperTask: 'IG-S01/smoke-inventory',
    round: opts.round, payloadMs: payloadMs, concurrency: concurrency, lockAtStart: lockAtStart }, outcome);
  const written = S.writeJsonFile(path.join(opts['out-dir'], 'supervisor.json'), doc);
  process.stdout.write(JSON.stringify({ ig: 'smoke-inventory', passed: doc.summary.passed, failed: doc.summary.failed,
    timedOut: doc.summary.timedOut, unstarted: doc.summary.unstarted, terminationsVerified:
    doc.summary.terminationsVerified + '/' + doc.summary.terminations, endedAtMs: doc.timing.endedAtMs,
    sha256: written.sha256 }) + '\n');
  return doc.summary.terminations > doc.summary.terminationsVerified ? 5 : 0;
}

main(process.argv.slice(2)).then(function (code) {
  process.exitCode = code;
  process.stdout.write('', function () { process.exit(code); });
}, function (err) {
  process.stderr.write('IG smoke-inventory error: ' + (err && err.stack ? err.stack : String(err)) + '\n');
  process.exit(3);
});
