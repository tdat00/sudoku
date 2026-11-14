'use strict';

/*
 * MS05r6c: one bounded, locked compound of independent items (IR12). A task-owned copy of MS05r6a's run-shards.cjs
 * (that driver stays unchanged). Run it only through Run-Dv3Logged.ps1 (Invoke-Dv3Node: one lock for the whole compound,
 * at most 540 s for the driver and all its children together, 15 s between lock acquisitions).
 *
 *   node tests/artifacts/difficulty-v3/MS05r6c/run-shards.cjs --plan=<plan.json> --from=<index> [--count=<n>]
 *        [--app=generator|player] [--budget-seconds=450] [--floor-seconds=60] [--evidence=<dir>] [--dry-run]
 *
 * plan.json: [ { label, args: [ node arguments ], projectionSeconds, projectionBasis, expectedExits?: [0],
 *                resultsPath? }, ... ]. Rules (check-list section 7, IR12):
 *  - Every item carries its own finite, positive projection (a measurement on the same source, otherwise a stated
 *    conservative bound for the complete item, start-up and registration included). A missing, unknown or non-finite
 *    projection is refused before anything starts: it is neither zero nor the generic floor.
 *  - Before each child, including the first, it is admitted only if
 *        elapsedSeconds + max(item.projectionSeconds, genericFloorSeconds) <= budget (450 s at most),
 *    with the actual elapsed time of the compound. The floor never replaces the item's own projection.
 *  - An item whose own projection exceeds the budget runs alone: it is admitted only as the first item and the compound
 *    ends after it (its task and request limits and the helper's 540 s ceiling are unchanged). Anything else that does
 *    not fit stays unstarted, and the driver says where to resume.
 *  - Items are independent: each has its own transcript (logs/<label>.txt), its own results file or ledger, its own
 *    duration and exit code, and one line in shard-runs.jsonl.
 *  - The driver stops at the first unexpected exit code and retries nothing. An exit code listed in an item's
 *    expectedExits (default [0]) continues the compound; a nonzero one is recorded as expectedNonzero, still a failure.
 */
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const DEFAULT_EVIDENCE = path.join(ROOT, 'docs', 'difficulty-v3', 'evidence', 'MS05r6c');

function parseArgs(argv) {
  const out = {
    plan: null, from: 0, count: Infinity, budget: 450, floor: 60, app: 'generator', evidence: null, dryRun: false
  };
  argv.forEach((arg) => {
    let m;
    if ((m = /^--plan=(.+)$/.exec(arg))) out.plan = m[1];
    else if ((m = /^--from=(\d+)$/.exec(arg))) out.from = Number(m[1]);
    else if ((m = /^--count=(\d+)$/.exec(arg))) out.count = Number(m[1]);
    else if ((m = /^--budget-seconds=(\d+(?:\.\d+)?)$/.exec(arg))) out.budget = Number(m[1]);
    else if ((m = /^--floor-seconds=(\d+(?:\.\d+)?)$/.exec(arg))) out.floor = Number(m[1]);
    else if ((m = /^--app=(generator|player)$/.exec(arg))) out.app = m[1];
    else if ((m = /^--evidence=(.+)$/.exec(arg))) out.evidence = m[1];
    else if (arg === '--dry-run') out.dryRun = true;
    else throw new Error('unknown argument ' + arg);
  });
  if (!out.plan) throw new Error('usage: --plan=<plan.json> --from=<index> [--count=<n>] [--app=generator|player]');
  if (out.budget > 450) throw new Error('a compound is planned at 450 s at most');
  return out;
}

/** The admission rule, pure so that a test can script it. */
function admission(elapsed, item, index, floor, budget) {
  const own = item.projectionSeconds;
  const planned = Math.max(own, floor);
  const record = { elapsedSeconds: round(elapsed), projectionSeconds: own, floorSeconds: floor, planned: planned,
    budgetSeconds: budget, ownExceedsBudget: own > budget };
  if (own > budget) {
    record.admitted = index === 0;
    record.reason = index === 0 ? 'its own projection exceeds the budget: it runs alone' :
      'its own projection exceeds the budget: it runs alone, in an invocation of its own';
  } else {
    record.admitted = elapsed + planned <= budget;
    record.reason = record.admitted ? 'elapsed + max(projection, floor) fits the budget' :
      'elapsed + max(projection, floor) does not fit the budget';
  }
  return record;
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

function validatePlan(slice, offset) {
  slice.forEach((item, i) => {
    const where = '#' + (offset + i) + ' ' + (item && item.label);
    if (!item || typeof item.label !== 'string' || !/^[A-Za-z0-9._-]+$/.test(item.label)) {
      throw new Error(where + ': a label of letters, digits, dot, dash and underscore is required');
    }
    if (!Array.isArray(item.args) || item.args.length === 0) throw new Error(where + ': args are required');
    if (typeof item.projectionSeconds !== 'number' || !Number.isFinite(item.projectionSeconds) ||
        item.projectionSeconds <= 0) {
      throw new Error(where + ': a finite positive projectionSeconds is required (a missing or unknown projection ' +
        'cannot enter a compound)');
    }
    if (typeof item.projectionBasis !== 'string' || item.projectionBasis.length < 8) {
      throw new Error(where + ': a projectionBasis (the measurement or the stated bound) is required');
    }
    if (item.expectedExits !== undefined && (!Array.isArray(item.expectedExits) ||
        item.expectedExits.some((c) => !Number.isInteger(c)))) {
      throw new Error(where + ': expectedExits must be a list of integers');
    }
  });
}

function run(opts) {
  const evidence = opts.evidence ? path.resolve(ROOT, opts.evidence) : DEFAULT_EVIDENCE;
  const cwd = path.join(ROOT, opts.app);
  const plan = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), opts.plan), 'utf8').replace(/^\uFEFF/, ''));
  const slice = plan.slice(opts.from, opts.from + (Number.isFinite(opts.count) ? opts.count : plan.length));
  validatePlan(slice, opts.from);
  const started = Date.now();
  const elapsed = () => (Date.now() - started) / 1000;
  fs.mkdirSync(path.join(evidence, 'logs'), { recursive: true });
  const summary = { startedAt: new Date(started).toISOString(), app: opts.app, from: opts.from, budgetSeconds: opts.budget,
    floorSeconds: opts.floor, items: slice.length, started: 0, passed: 0, expectedNonzero: 0, unexpected: null,
    unstarted: [], stop: null };
  const sumProjections = slice.reduce((n, x) => n + x.projectionSeconds, 0);
  console.log('plan: ' + slice.length + ' item(s), projections sum ' + sumProjections.toFixed(1) + ' s, budget ' +
    opts.budget + ' s, generic floor ' + opts.floor + ' s (it never replaces an item projection)');
  let exitCode = 0;
  for (let i = 0; i < slice.length; i++) {
    const item = slice[i];
    const index = opts.from + i;
    const adm = admission(elapsed(), item, i, opts.floor, opts.budget);
    if (!adm.admitted) {
      summary.unstarted = slice.slice(i).map((x, k) => ({ index: opts.from + i + k, label: x.label }));
      summary.stop = 'not admitted: #' + index + ' ' + item.label + ' (' + adm.reason + '; elapsed ' +
        adm.elapsedSeconds + ' s, projection ' + adm.projectionSeconds + ' s, floor ' + adm.floorSeconds + ' s)';
      console.log('compound stops before #' + index + ' ' + item.label + ': ' + adm.reason + ' (elapsed ' +
        adm.elapsedSeconds + ' s + max(' + adm.projectionSeconds + ', ' + adm.floorSeconds + ') > ' + opts.budget +
        ' s); unstarted: ' + summary.unstarted.map((x) => x.label).join(', ') + '; resume with --from=' + index);
      break;
    }
    if (opts.dryRun) {
      console.log('would run #' + index + ' ' + item.label + ': node ' + item.args.join(' ') + ' (' +
        JSON.stringify(adm) + ')');
      summary.started++;
      continue;
    }
    const logFile = path.join(evidence, 'logs', item.label + '.txt');
    if (fs.existsSync(logFile)) throw new Error('log ' + item.label + '.txt exists: a label is used once');
    const t0 = Date.now();
    const child = childProcess.spawnSync('node', item.args, { cwd: cwd, encoding: 'utf8', maxBuffer: 1 << 26,
      windowsHide: true });
    const seconds = (Date.now() - t0) / 1000;
    const text = (child.stdout || '') + (child.stderr ? child.stderr : '');
    fs.writeFileSync(logFile, text.replace(/\r?\n/g, '\r\n'), 'utf8');
    const expected = item.expectedExits || [0];
    const status = child.status === null ? -1 : child.status;
    const record = { label: item.label, index: index, app: opts.app, args: item.args, exit: status,
      expectedExits: expected, expectedNonzero: status !== 0 && expected.includes(status),
      nodeSeconds: round(seconds), startedAt: new Date(t0).toISOString(), compoundElapsed: round(elapsed()),
      admission: adm, projectionSeconds: item.projectionSeconds, projectionBasis: item.projectionBasis,
      withinProjection: seconds <= item.projectionSeconds };
    if (item.resultsPath) {
      record.resultsPath = item.resultsPath;
      record.resultsWritten = fs.existsSync(path.resolve(cwd, item.resultsPath));
    }
    fs.appendFileSync(path.join(evidence, 'shard-runs.jsonl'), JSON.stringify(record) + '\n', 'utf8');
    summary.started++;
    const last = text.trim().split(/\r?\n/).slice(-1)[0] || '';
    console.log('#' + index + ' ' + item.label + ' exit=' + status + ' node=' + seconds.toFixed(3) + 's (projected ' +
      item.projectionSeconds + ' s, elapsed before ' + adm.elapsedSeconds + ' s): ' + last);
    if (!expected.includes(status)) {
      summary.unexpected = { index: index, label: item.label, exit: status };
      summary.unstarted = slice.slice(i + 1).map((x, k) => ({ index: index + 1 + k, label: x.label }));
      summary.stop = 'unexpected exit ' + status + ' at #' + index + ' ' + item.label;
      console.log('compound ends at #' + index + ': unexpected exit ' + status + ' (expected ' + expected.join('/') +
        '); nothing is retried; unstarted: ' + (summary.unstarted.map((x) => x.label).join(', ') || 'none'));
      exitCode = status === 0 || status === -1 ? 1 : status;
      break;
    }
    if (status === 0) summary.passed++;
    else summary.expectedNonzero++;
    if (adm.ownExceedsBudget) {
      summary.unstarted = slice.slice(i + 1).map((x, k) => ({ index: index + 1 + k, label: x.label }));
      summary.stop = 'ran alone: its own projection exceeds the budget';
      console.log('compound ends after #' + index + ': its own projection exceeds the budget, so it ran alone');
      break;
    }
  }
  summary.elapsedSeconds = round(elapsed());
  summary.endedAt = new Date().toISOString();
  if (summary.stop === null) {
    summary.next = opts.from + slice.length;
    console.log('compound complete: ' + summary.started + ' item(s) in ' + summary.elapsedSeconds + ' s; next --from=' +
      summary.next);
  }
  if (!opts.dryRun) fs.appendFileSync(path.join(evidence, 'compounds.jsonl'), JSON.stringify(summary) + '\n', 'utf8');
  return { exitCode: exitCode, summary: summary };
}

if (require.main === module) {
  try {
    process.exitCode = run(parseArgs(process.argv.slice(2))).exitCode;
  } catch (err) {
    console.error(String(err && err.message || err));
    process.exitCode = 1;
  }
}

module.exports = { admission: admission, validatePlan: validatePlan, parseArgs: parseArgs, run: run };
