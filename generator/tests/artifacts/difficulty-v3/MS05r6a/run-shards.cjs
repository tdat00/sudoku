'use strict';

/*
 * MS05r6a: one bounded, locked compound of recorder shards. Run it only through Run-Dv3Logged.ps1 (Invoke-Dv3Node, one
 * lock for the whole compound, at most 540 s, planned at most 450 s). Every shard is its own child process, started with
 * exactly the arguments of the plan item (the E route of check-list section 7: tests\perf.js --hash-key ... --hash-record),
 * so its ledger, its identity and its exit code are those of a shard run alone; the compound only saves lock turns.
 *
 *   node tests/artifacts/difficulty-v3/MS05r6a/run-shards.cjs --plan=<plan.json> --from=<index> [--count=<n>]
 *        [--budget-seconds=450] [--first-estimate=60] [--continue-on-exit-1] [--dry-run]
 *
 * plan.json: [ { label, args: [ ... node arguments ... ], projectionSeconds?, projectionBasis? }, ... ] (the order of the plan is
 * the order of the run). An item may carry its own projection (a measurement on the same source, else a stated
 * conservative bound; IR12). Before each shard the driver admits it only when the elapsed time plus the larger of that
 * projection and the generic floor (--first-estimate) fits the budget; an item without a projection is projected as
 * the larger of the floor and twice the slowest shard so far. An item whose own projection exceeds the budget runs
 * alone (first, and the compound ends after it). A shard that is not admitted is not started (the compound ends
 * normally and says where to resume). The first shard of a compound is always started. A shard with a nonzero exit, or a ledger that was
 * not written, ends the compound with that exit code (nothing is retried and no partial ledger is kept: the recorders
 * write atomically); with --continue-on-exit-1 an exit code 1 (failed tests of a quick selection, kept in its results
 * file) does not end it. The transcript of each shard is logs/<label>.txt next to this task's evidence; one line per
 * shard is appended to shard-runs.jsonl there.
 */
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const GEN = path.resolve(__dirname, '..', '..', '..', '..');
const EVIDENCE = path.resolve(GEN, '..', 'docs', 'difficulty-v3', 'evidence', 'MS05r6a');

function parseArgs(argv) {
  const out = {
    plan: null, from: 0, count: Infinity, budget: 450, firstEstimate: 60, dryRun: false, continueOnExit1: false
  };
  argv.forEach((arg) => {
    let m;
    if ((m = /^--plan=(.+)$/.exec(arg))) out.plan = m[1];
    else if ((m = /^--from=(\d+)$/.exec(arg))) out.from = Number(m[1]);
    else if ((m = /^--count=(\d+)$/.exec(arg))) out.count = Number(m[1]);
    else if ((m = /^--budget-seconds=(\d+)$/.exec(arg))) out.budget = Number(m[1]);
    else if ((m = /^--first-estimate=(\d+)$/.exec(arg))) out.firstEstimate = Number(m[1]);
    else if (arg === '--dry-run') out.dryRun = true;
    else if (arg === '--continue-on-exit-1') out.continueOnExit1 = true;
    else throw new Error('unknown argument ' + arg);
  });
  if (!out.plan) throw new Error('usage: --plan=<plan.json> --from=<index> [--count=<n>] [--budget-seconds=450]');
  if (out.budget > 450) throw new Error('a compound is planned at 450 s at most');
  return out;
}

function main(argv) {
  const opts = parseArgs(argv);
  const plan = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), opts.plan), 'utf8'));
  const slice = plan.slice(opts.from, opts.from + (Number.isFinite(opts.count) ? opts.count : plan.length));
  const started = Date.now();
  const elapsed = () => (Date.now() - started) / 1000;
  let slowest = 0;
  let done = 0;
  fs.mkdirSync(path.join(EVIDENCE, 'logs'), { recursive: true });
  const projected = slice.filter((x) => typeof x.projectionSeconds === 'number');
  if (projected.length > 0) {
    console.log('plan: ' + slice.length + ' item(s), ' + projected.length + ' with their own projection, sum ' +
      projected.reduce((n, x) => n + x.projectionSeconds, 0).toFixed(1) + ' s');
  }
  for (let i = 0; i < slice.length; i++) {
    const item = slice[i];
    const index = opts.from + i;
    const own = typeof item.projectionSeconds === 'number' ? item.projectionSeconds : null;
    const floor = i === 0 ? 0 : opts.firstEstimate;
    const estimate = own === null ? Math.max(floor, 2 * slowest) : Math.max(own, floor);
    if (i > 0 && (elapsed() + estimate > opts.budget || (own !== null && own > opts.budget))) {
      console.log('compound stops before #' + index + ' ' + item.label + ' (' + elapsed().toFixed(1) + ' s used, next ' +
        'projected ' + estimate.toFixed(1) + ' s' + (own !== null ? ' by its own projection' : '') + ', budget ' +
        opts.budget + ' s); resume with --from=' + index);
      return 0;
    }
    if (opts.dryRun) {
      console.log('would run #' + index + ' ' + item.label + ': node ' + item.args.join(' '));
      done++;
      continue;
    }
    const logFile = path.join(EVIDENCE, 'logs', item.label + '.txt');
    if (fs.existsSync(logFile)) throw new Error('log ' + item.label + '.txt exists: a label is used once');
    const t0 = Date.now();
    const run = childProcess.spawnSync('node', item.args, { cwd: GEN, encoding: 'utf8', maxBuffer: 1 << 26,
      windowsHide: true });
    const seconds = (Date.now() - t0) / 1000;
    slowest = Math.max(slowest, seconds);
    const text = (run.stdout || '') + (run.stderr ? run.stderr : '');
    fs.writeFileSync(logFile, text.replace(/\r?\n/g, '\r\n'), 'utf8');
    const record = { label: item.label, index: index, args: item.args, exit: run.status, nodeSeconds: Number(seconds.toFixed(3)),
      startedAt: new Date(t0).toISOString(), compoundElapsed: Number(elapsed().toFixed(3)) };
    if (own !== null) {
      record.projectionSeconds = own;
      record.projectionBasis = item.projectionBasis || null;
      record.withinProjection = seconds <= own;
    }
    fs.appendFileSync(path.join(EVIDENCE, 'shard-runs.jsonl'), JSON.stringify(record) + '\n', 'utf8');
    const last = text.trim().split(/\r?\n/).slice(-1)[0] || '';
    console.log('#' + index + ' ' + item.label + ' exit=' + run.status + ' node=' + seconds.toFixed(3) + 's: ' + last);
    done++;
    if (own !== null && own > opts.budget) {
      console.log('compound ends after #' + index + ': its own projection exceeds the budget, so it ran alone');
      return run.status === 0 || (run.status === 1 && opts.continueOnExit1) ? 0 : (run.status === null ? 1 : run.status);
    }
    if (run.status === 1 && opts.continueOnExit1) continue;
    if (run.status !== 0) {
      console.log('compound ends at #' + index + ': exit ' + run.status);
      return run.status === null ? 1 : run.status;
    }
  }
  console.log('compound complete: ' + done + ' shard(s) in ' + elapsed().toFixed(1) + ' s; next --from=' +
    (opts.from + slice.length));
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  console.error(String(err && err.message || err));
  process.exitCode = 1;
}
