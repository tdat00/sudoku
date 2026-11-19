#!/usr/bin/env node
'use strict';

/*
 * MS18d Phase B task-owned: one bounded, locked compound of the GG hash shards (the functional route of
 * the hash check: `tests/perf.js --hash-key=... --hash-record=<ledger>`, never a measurement). It is the
 * driver of MS18c (run-shards.cjs) with the repairs of this phase: every shard runs through the incremental
 * tee (tee-append.js), so its transcript is on disk while it runs and survives a kill; the compound writes
 * a start record before a shard and an end record after it; and it stops, for a ruling, on anything that
 * is not a clean pass. Run it only through Invoke-Locked of run-locked.ps1 (one lock for the whole
 * compound, at most 540 s, planned at most 450 s).
 *
 *   node tests/artifacts/difficulty-v3/MS18d/phase-b/run-gg.js --plan=<gg-plan.json> --from=<index>
 *        [--count=<n>] [--budget-seconds=420] [--source-hash=<hex>] [--dry-run]
 *
 * gg-plan.json: [ { label, args: [ perf.js, --hash-key=, --hash-from=, --hash-count=, --hash-record= ],
 * projectionSeconds, projectionBasis }, ... ]. Every item must carry its own projection. Before a shard the
 * driver admits it only when the elapsed time plus its projection fits the budget (the first shard of a
 * compound is always started); a shard that is not admitted is not started, and the compound ends normally
 * and says where to resume.
 *
 * A shard PASSES only when all of this holds: the tee ended with exit 0 and its transcript ends with the
 * line `exit=0 seconds=<n>`; the ledger exists with no `.partial` beside it, is a `regression-hashes`
 * ledger of the expected source identity (--source-hash, default the E hash identity of
 * phase-b/targets-frozen-final.json), carries exactly the asked records of the asked combination with
 * distinct keys and 16-hex hashes, and records the shard's own argv. Anything else (a nonzero exit, a
 * signal, a missing or partial ledger, a wrong identity) STOPS the compound with a nonzero code: the
 * transcript and any ledger are kept, the shard is never retried or replaced here, and the exit code is
 * never read as a MISS. The ledgers directory must hold only ledgers of the plan; a stray or `.partial`
 * file stops the compound before anything runs; an existing ledger or transcript of a shard is a refusal to
 * run it again. Nothing is deleted, ever.
 *
 * Records: docs/difficulty-v3/evidence/MS18d/phase-b/gg/logs/<label>.txt (the transcripts) and
 * .../gg/shard-runs.jsonl (one `start` and one `end` line per shard). `--repo=<dir>` is for the tests
 * (stand-ins in a scratch tree).
 */
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const TEE = path.join(HERE, 'tee-append.js');
const REAL_REPO = path.resolve(HERE, '..', '..', '..', '..', '..', '..');
const MAX_BUDGET = 450;
const HEX16 = /^[0-9a-f]{16}$/;

function parseArgs(argv) {
  const out = { plan: null, from: 0, count: Infinity, budget: 420, sourceHash: null, dryRun: false,
    repo: REAL_REPO };
  argv.forEach((arg) => {
    let m;
    if ((m = /^--plan=(.+)$/.exec(arg))) out.plan = m[1];
    else if ((m = /^--from=(\d+)$/.exec(arg))) out.from = Number(m[1]);
    else if ((m = /^--count=(\d+)$/.exec(arg))) out.count = Number(m[1]);
    else if ((m = /^--budget-seconds=(\d+)$/.exec(arg))) out.budget = Number(m[1]);
    else if ((m = /^--source-hash=([0-9a-f]{64})$/.exec(arg))) out.sourceHash = m[1];
    else if ((m = /^--repo=(.+)$/.exec(arg))) out.repo = path.resolve(m[1]);
    else if (arg === '--dry-run') out.dryRun = true;
    else throw new Error('unknown argument ' + arg);
  });
  if (!out.plan) throw new Error('usage: --plan=<gg-plan.json> --from=<index> [--count=<n>]');
  if (out.budget > MAX_BUDGET) throw new Error('a compound is planned at ' + MAX_BUDGET + ' s at most');
  return out;
}

/** The hash options of a plan item, or an error: { key, from, count, record, variant, level }. */
function shardOf(item) {
  const get = (name) => {
    const hit = item.args.map((a) => new RegExp('^--hash-' + name + '=(.+)$').exec(a)).filter(Boolean);
    if (hit.length !== 1) throw new Error(item.label + ': needs exactly one --hash-' + name);
    return hit[0][1];
  };
  const key = get('key');
  const [variant, level] = key.split('/');
  return { key, variant, level, from: Number(get('from')), count: Number(get('count')),
    record: get('record') };
}

/** Problems of the ledger of one shard (empty when it is complete and of the expected identity). */
function ledgerProblems(file, item, shard, sourceHash) {
  const problems = [];
  if (fs.existsSync(file + '.partial')) problems.push('a .partial file is beside the ledger');
  if (!fs.existsSync(file)) {
    problems.push('the ledger does not exist');
    return problems;
  }
  let ledger;
  try {
    ledger = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    problems.push('the ledger is not valid JSON: ' + err.message);
    return problems;
  }
  if (ledger.kind !== 'regression-hashes' || ledger.schema !== 1) {
    problems.push('not a regression-hashes ledger');
  }
  if (ledger.sourceHash !== sourceHash) {
    problems.push('sourceHash ' + ledger.sourceHash + ', expected ' + sourceHash);
  }
  if (JSON.stringify(ledger.argv) !== JSON.stringify(item.args.slice(1))) {
    problems.push('the ledger records another command line');
  }
  const records = Array.isArray(ledger.records) ? ledger.records : [];
  if (records.length !== shard.count) problems.push(records.length + ' records, expected ' + shard.count);
  const seen = new Set();
  records.forEach((r) => {
    const m = /^([^/]+)\/([^#]+)#(\d+)$/.exec(r.key || '');
    if (!m || m[1] !== shard.variant || m[2] !== shard.level || r.variant !== shard.variant ||
      r.level !== shard.level || r.seed !== Number(m[3])) {
      problems.push('a record is not of ' + shard.key + ': ' + r.key);
    }
    if (!HEX16.test(r.hash || '')) problems.push('a record has no 16-hex hash: ' + r.key);
    if (seen.has(r.key)) problems.push('a key twice: ' + r.key);
    seen.add(r.key);
  });
  return problems;
}

/** The last non-blank line of a transcript, read shared; null when unreadable. */
function lastLineOf(file) {
  try {
    const fd = fs.openSync(file, 'r');
    try {
      const text = fs.readFileSync(fd, 'utf8');
      return text.split(/\r?\n/).filter((l) => l.trim() !== '').pop() || '';
    } finally {
      fs.closeSync(fd);
    }
  } catch (err) {
    return null;
  }
}

function runShard(item, cwd, logFile) {
  return new Promise((resolve) => {
    const child = childProcess.spawn(process.execPath, [TEE, logFile].concat(item.args), {
      cwd, stdio: 'ignore', windowsHide: true, env: Object.assign({}, process.env, { TEE_QUIET: '1' })
    });
    child.on('error', (err) => resolve({ code: null, signal: null, error: err.message }));
    child.on('close', (code, signal) => resolve({ code, signal, error: null }));
  });
}

async function main(argv) {
  const opts = parseArgs(argv);
  const gen = path.join(opts.repo, 'generator');
  const evidence = path.join(opts.repo, 'docs', 'difficulty-v3', 'evidence', 'MS18d');
  const ledgers = path.join(evidence, 'hashes');
  const gg = path.join(evidence, 'phase-b', 'gg');
  const runsFile = path.join(gg, 'shard-runs.jsonl');
  let sourceHash = opts.sourceHash;
  if (!sourceHash) {
    const frozen = JSON.parse(fs.readFileSync(
      path.join(evidence, 'phase-b', 'targets-frozen-final.json'), 'utf8'));
    sourceHash = frozen.identities.hashIdentity;
  }
  const plan = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), opts.plan), 'utf8'));
  if (new Set(plan.map((x) => x.label)).size !== plan.length) throw new Error('a label twice in the plan');
  const slice = plan.slice(opts.from, opts.from + (Number.isFinite(opts.count) ? opts.count : plan.length));
  if (slice.length === 0) throw new Error('nothing to run from ' + opts.from);
  const shards = slice.map((item) => {
    if (typeof item.projectionSeconds !== 'number') throw new Error(item.label + ': no projection');
    if (item.projectionSeconds > opts.budget) {
      throw new Error(item.label + ': its projection exceeds the budget');
    }
    return shardOf(item);
  });
  const allowed = new Set(plan.map((item) => path.basename(shardOf(item).record)));

  if (fs.existsSync(ledgers)) {
    const stray = fs.readdirSync(ledgers).filter((name) => !allowed.has(name));
    if (stray.length > 0) {
      console.log('STOP before anything ran: stray file(s) in the ledgers directory: ' + stray.join(', '));
      return 3;
    }
  }
  const started = Date.now();
  const elapsed = () => (Date.now() - started) / 1000;
  console.log('plan: ' + slice.length + ' item(s), projected sum ' +
    slice.reduce((n, x) => n + x.projectionSeconds, 0) + ' s, budget ' + opts.budget + ' s, source ' +
    sourceHash.slice(0, 8));

  if (!opts.dryRun) {
    fs.mkdirSync(path.join(gg, 'logs'), { recursive: true });
    fs.mkdirSync(ledgers, { recursive: true });
  }
  let done = 0;
  for (let i = 0; i < slice.length; i++) {
    const item = slice[i];
    const shard = shards[i];
    const index = opts.from + i;
    if (i > 0 && elapsed() + item.projectionSeconds > opts.budget) {
      console.log('compound stops before #' + index + ' ' + item.label + ' (' + elapsed().toFixed(1) +
        ' s used, next projected ' + item.projectionSeconds + ' s, budget ' + opts.budget +
        ' s); resume with --from=' + index);
      return 0;
    }
    if (opts.dryRun) {
      console.log('would run #' + index + ' ' + item.label + ': node ' + item.args.join(' '));
      done++;
      continue;
    }
    const logFile = path.join(gg, 'logs', item.label + '.txt');
    const ledgerFile = path.resolve(gen, shard.record);
    if (fs.existsSync(logFile) || fs.existsSync(ledgerFile) || fs.existsSync(ledgerFile + '.partial')) {
      console.log('STOP before #' + index + ' ' + item.label +
        ': its transcript or ledger exists already; a shard is never run twice or replaced');
      return 3;
    }
    const t0 = Date.now();
    fs.appendFileSync(runsFile, JSON.stringify({ event: 'start', label: item.label, index,
      args: item.args, projectionSeconds: item.projectionSeconds, startedAt: new Date(t0).toISOString(),
      compoundElapsed: Number(elapsed().toFixed(3)) }) + '\r\n', 'utf8');
    const run = await runShard(item, gen, logFile);
    const seconds = (Date.now() - t0) / 1000;
    const marker = lastLineOf(logFile);
    const reasons = [];
    if (run.error) reasons.push('could not start: ' + run.error);
    if (run.signal) reasons.push('ended on signal ' + run.signal);
    if (run.code !== 0) reasons.push('exit code ' + run.code);
    if (!/^exit=0 seconds=[0-9.]+$/.test(marker || '')) {
      reasons.push('the transcript does not end in exit=0: ' + marker);
    }
    const problems = ledgerProblems(ledgerFile, item, shard, sourceHash);
    const ok = reasons.length === 0 && problems.length === 0;
    const endRecord = { event: 'end', label: item.label, index, exit: run.code, signal: run.signal, marker,
      nodeSeconds: Number(seconds.toFixed(3)), withinProjection: seconds <= item.projectionSeconds,
      pass: ok, reasons, ledgerProblems: problems, endedAt: new Date().toISOString(),
      compoundElapsed: Number(elapsed().toFixed(3)) };
    fs.appendFileSync(runsFile, JSON.stringify(endRecord) + '\r\n', 'utf8');
    console.log('#' + index + ' ' + item.label + ' ' + (ok ? 'PASS' : 'STOP') + ' node=' +
      seconds.toFixed(3) + 's: ' + (marker || ''));
    if (!ok) {
      reasons.concat(problems).forEach((r) => console.log('  ' + r));
      console.log('STOP at #' + index + ': the transcript and any ledger of the shard are kept; nothing is ' +
        'retried or replaced here. Report it for a ruling; it is not a result of the check.');
      return run.code ? run.code : 3;
    }
    done++;
  }
  console.log('compound complete: ' + done + ' shard(s) in ' + elapsed().toFixed(1) + ' s; next --from=' +
    (opts.from + slice.length));
  return 0;
}

module.exports = { parseArgs, shardOf, ledgerProblems, lastLineOf };

if (require.main === module) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  }, (err) => {
    console.error(String(err && err.message || err));
    process.exitCode = 2;
  });
}
