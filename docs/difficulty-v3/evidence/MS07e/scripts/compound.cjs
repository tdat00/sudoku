#!/usr/bin/env node
'use strict';

/*
 * MS07e compound runner (IR12, SA1 2026-11-14): ONE locked invocation that runs several independent plan items one after
 * the other. It is started only through Invoke-Dv3Node (scripts/driver.ps1), so the 540 s ceiling of the helper covers this
 * process and its children together, and one lock acquisition (with the 15 s gap after it) serves the whole compound. IR12's
 * rules, as implemented here:
 *   - every item has its own finite projection (a measurement on the same source, else a stated bound) in the plan;
 *   - before an item starts, elapsed + max(projection of the item, the generic floor) must be <= the budget (450 s). The
 *     generic floor is a constant 60 s (every item here has its own projection; the first compounds of this run used
 *     max(60 s, twice the slowest child so far), the rule of MS05r6a, and it is recorded in plan.md) and never replaces an
 *     item's projection. The first item of a
 *     compound always starts (an item alone fits 450 s: items above 450 s are marked `launch: false` in the plan);
 *   - an item that does not fit is left unstarted and the compound ends normally ("next --from=<index>");
 *   - items are independent: each has its own outputs and transcript; nothing here compounds a producer with its consumer;
 *   - the compound stops at the first unexpected exit (an item's `allowExit1` declares the one expected failure code) and exits
 *     3; no automatic retry; a failed item's partial outputs are moved to its failedDir, never left in a merge folder;
 *   - a `launch: false` item is recorded as UNEXECUTED (once) and costs nothing; an item whose outputs exist is not run again.
 *
 *   node compound.cjs --plan=<plan.json> --from=<index> [--budget-seconds=450] [--floor=60] [--id=<compound label>]
 *
 * It appends to run-log.jsonl (state started / ran / unexecuted / skipped-exists / halt-preflight / compound) and to
 * progress-log.txt (CRLF). Exit 0: the compound ended normally; 3: an unexpected exit or a failed preflight; 2: usage.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = 'Q:\\git\\sudoku';
const GEN = path.join(REPO, 'generator');
const EVIDENCE = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS07e');
const TEE = path.join(GEN, 'tests', 'artifacts', 'difficulty-v3', 'MS07c', 'tee-run.cjs');
const LOG = path.join(EVIDENCE, 'progress-log.txt');
const JSONL = path.join(EVIDENCE, 'run-log.jsonl');

function stamp() {
  const d = new Date();
  const p = (n, w) => String(n).padStart(w || 2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) +
    ':' + p(d.getSeconds());
}
function log(text) {
  const line = stamp() + ' | ' + text;
  console.log(line);
  fs.appendFileSync(LOG, line + '\r\n', 'utf8');
}
function jsonl(obj) {
  fs.appendFileSync(JSONL, JSON.stringify(obj) + '\r\n', 'utf8');
}
const abs = (rel, base) => path.resolve(base || GEN, rel);

/**
 * The registration-only listing of an item (no test runs, no generation, well under a second): its selected total must be the
 * expected one. A listing that exists already (the same filter, an earlier preflight) is read again, not overwritten.
 */
function preflight(it, i) {
  const pl = it.preList;
  let status = 0;
  if (!fs.existsSync(abs(pl.out))) {
    status = spawnSync(process.execPath, pl.args, { cwd: GEN, encoding: 'utf8' }).status;
  }
  let total = -1;
  if (status === 0 && fs.existsSync(abs(pl.out))) {
    total = JSON.parse(fs.readFileSync(abs(pl.out), 'utf8').replace(/^\uFEFF/, '')).tests.length;
  }
  log('PRELIST #' + i + ' ' + it.id + ' | exit=' + status + ' selected=' + total + ' expected=' + pl.expectTotal);
  if (status !== 0 || total !== Number(pl.expectTotal)) {
    log('HALT #' + i + ' ' + it.id + ' | the registration-only preflight did not select the expected total');
    jsonl({ index: i, id: it.id, phase: it.phase, state: 'halt-preflight', selected: total, expected: pl.expectTotal });
    return false;
  }
  return true;
}

function main(argv) {
  let planFile = null;
  let from = 0;
  let budget = 450;
  let floor = 60;
  let label = '';
  let preflightOnly = false;
  argv.forEach((arg) => {
    let m;
    if ((m = /^--plan=(.+)$/.exec(arg))) planFile = m[1];
    else if (arg === '--preflight') preflightOnly = true;
    else if ((m = /^--from=(\d+)$/.exec(arg))) from = Number(m[1]);
    else if ((m = /^--budget-seconds=(\d+)$/.exec(arg))) budget = Number(m[1]);
    else if ((m = /^--floor=(\d+)$/.exec(arg))) floor = Number(m[1]);
    else if ((m = /^--id=(.+)$/.exec(arg))) label = m[1];
    else throw Object.assign(new Error('unknown argument ' + arg), { usage: true });
  });
  if (!planFile) throw Object.assign(new Error('--plan is required'), { usage: true });
  const items = JSON.parse(fs.readFileSync(planFile, 'utf8').replace(/^\uFEFF/, ''));
  if (preflightOnly) {
    for (let k = from; k < items.length; k++) {
      const it = items[k];
      const done = (it.outputs || []).some((o) => fs.existsSync(abs(o)));
      if (it.launch !== false && it.preList && !done && !preflight(it, k)) return 3;
    }
    return 0;
  }
  const started = Date.now();
  const elapsed = () => (Date.now() - started) / 1000;
  let slowest = 0;
  let ran = 0;
  let i = from;
  for (; i < items.length; i++) {
    const it = items[i];
    const outputs = it.outputs || [];
    if (it.launch === false) {
      log('UNEXECUTED #' + i + ' ' + it.id + ' | projection ' + it.projectionSeconds + ' s | ' + it.reason);
      jsonl({ index: i, id: it.id, phase: it.phase, state: 'unexecuted', projectionSeconds: it.projectionSeconds,
        projectionBasis: it.projectionBasis, reason: it.reason });
      continue;
    }
    const existing = outputs.filter((o) => fs.existsSync(abs(o)));
    if (existing.length > 0) {
      log('SKIP #' + i + ' ' + it.id + ' | output exists already, not run again: ' + existing.join(', '));
      jsonl({ index: i, id: it.id, phase: it.phase, state: 'skipped-exists', outputs: existing });
      continue;
    }
    const needed = Math.max(it.projectionSeconds, floor);
    if (ran > 0 && elapsed() + needed > budget) {
      log('COMPOUND #' + i + ' ' + it.id + ' not admitted: elapsed ' + elapsed().toFixed(1) + ' s + max(projection ' +
        it.projectionSeconds + ' s, floor ' + floor + ' s) > ' + budget + ' s; left for the next compound');
      break;
    }
    if (it.preList && !preflight(it, i)) return 3;
    const cwd = it.cwd ? path.join(REPO, it.cwd) : GEN;
    const nodeArgs = it.tee ? [TEE, it.tee].concat(it.args) : it.args.slice();
    const t0 = Date.now();
    const startedIso = new Date(t0).toISOString();
    log('START #' + i + ' ' + it.id + ' | elapsed ' + elapsed().toFixed(1) + ' s | projection ' + it.projectionSeconds + ' s | node ' + it.args.join(' '));
    jsonl({ index: i, id: it.id, phase: it.phase, state: 'started', compound: label, started: startedIso,
      elapsedBefore: Math.round(elapsed() * 1000) / 1000, projectionSeconds: it.projectionSeconds });
    const child = spawnSync(process.execPath, nodeArgs, { cwd: cwd, stdio: 'inherit' });
    const seconds = Math.round((Date.now() - t0)) / 1000;
    const code = child.status === null ? 1 : child.status;
    slowest = Math.max(slowest, seconds);
    ran++;
    const allowed = it.allowExit1 ? [0, 1] : [0];
    const outcome = code === 0 ? 'ok' : allowed.indexOf(code) !== -1 ? 'expected-exit1' : 'failed-exit' + code;
    const failedAttempt = outcome !== 'ok' && (outcome !== 'expected-exit1' || it.phase === 'gq');
    const moved = [];
    if (failedAttempt) {
      outputs.forEach((o) => [abs(o), abs(o) + '.partial'].forEach((cand) => {
        if (fs.existsSync(cand)) {
          const fd = abs(it.failedDir || path.join('..', 'docs', 'difficulty-v3', 'evidence', 'MS07e', 'failed'));
          fs.mkdirSync(fd, { recursive: true });
          const d = new Date();
          const dest = path.join(fd, String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') +
            String(d.getSeconds()).padStart(2, '0') + '-' + path.basename(cand));
          fs.renameSync(cand, dest);
          moved.push(dest);
        }
      }));
    }
    log('END   #' + i + ' ' + it.id + ' | exit=' + code + ' outcome=' + outcome + ' node=' + seconds + ' s projected=' +
      it.projectionSeconds + ' s' + (moved.length ? ' moved=' + moved.join(',') : ''));
    jsonl({ index: i, id: it.id, phase: it.phase, state: 'ran', compound: label, args: it.args, started: startedIso,
      ended: new Date().toISOString(), exit: code, outcome: outcome, nodeSeconds: seconds, projectionSeconds: it.projectionSeconds,
      outputs: outputs, moved: moved });
    if (outcome.indexOf('failed-exit') === 0 || (it.phase === 'gq' && outcome === 'expected-exit1')) {
      log('HALT #' + i + ' ' + it.id + ' | outcome ' + outcome + ' needs a look before anything else runs');
      return 3;
    }
  }
  log('COMPOUND ' + label + ' complete: ' + ran + ' item(s) ran in ' + elapsed().toFixed(1) + ' s; next --from=' + i);
  jsonl({ state: 'compound-end', compound: label, plan: path.basename(planFile), ran: ran, seconds: Math.round(elapsed() * 1000) / 1000,
    next: i });
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  console.error(String(err && err.message || err));
  process.exitCode = err && err.usage ? 2 : 3;
}
