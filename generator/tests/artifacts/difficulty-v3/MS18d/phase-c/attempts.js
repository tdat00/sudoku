'use strict';

/*
 * MS18d Phase C0b task-owned (SA1 R4): the attempt accounting of one immutable chunk, DERIVED from the
 * immutable run folders and the append-only C lock log; there is no mutable counter file (it would fall
 * outside the C0-4 allowlist and could be reset). A run folder `gp/<cell>/<run-id>/` belongs to a chunk when
 * its request.json (or, for a run that held before any request, its wrapper.json) names the chunk ID. Every
 * such folder is ONE admission (the wrapper created it: the chunk asked to be admitted), whatever became of
 * it. Per run:
 *   admitted         admission.json says `proceed` (informational);
 *   payloadStarted   result.json says so; with no result, any sign (an admission, a tee/command record in
 *                    pids.jsonl, a transcript) counts as a start: an uncertain start is never "unstarted";
 *   eligibleReAsk    result.json carries `eligibleReAsk: true` (written only for a verified unstarted
 *                    consumer-only hold; the C1 readiness launcher sets it, C0 never does).
 * Rules (the owner's A policy and the R24 continuation): at most TWO admissions per chunk, at most ONE actual
 * payload per chunk, a second admission only after an eligible hold and at least 60 s after its release.
 * A chunk whose payload started is never run again: no retry, no replacement, whatever its outcome. Any other
 * hold (a foreign lock, a binding difference, ...) is not an eligible re-ask: it needs a ruling.
 * Contradictions between the folders and the ledger (a ledger line without its folder, a folder that says
 * unstarted while it holds a transcript, ...) are `problems`: the chunk is held, never guessed.
 */
const fs = require('fs');
const path = require('path');
const { parseIsoMs, readJsonl } = require('./common.js');

const MAX_ADMISSIONS = 2;
const REASK_WAIT_MS = 60000;

function readJson(file) {
  try {
    return { value: JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')), problem: null };
  } catch (err) {
    return { value: null, problem: err.code === 'ENOENT' ? null : path.basename(file) + ': ' + err.message };
  }
}

function pidsOf(file) {
  const rows = [];
  if (!fs.existsSync(file)) return rows;
  readJsonl(file).entries.forEach((e) => rows.push(e.value));
  return rows;
}

/** What one run folder says about its chunk. */
function describeRun(dir, problems) {
  const runId = path.basename(dir);
  const read = (name) => {
    const r = readJson(path.join(dir, name));
    if (r.problem) problems.push(runId + '/' + r.problem);
    return r.value;
  };
  const request = read('request.json');
  const wrapper = read('wrapper.json');
  const admission = read('admission.json');
  const result = read('result.json');
  const chunkId = (request && request.chunk && request.chunk.chunkId) ||
    (wrapper && wrapper.chunkId) || null;
  const pids = pidsOf(path.join(dir, 'pids.jsonl'));
  const hasPayloadRecord = pids.some((r) => r && (r.role === 'tee' || r.role === 'command'));
  const hasTranscript = fs.existsSync(path.join(dir, 'transcript.txt'));
  const admitted = !!(admission && admission.decision === 'proceed');
  let payloadStarted;
  if (result) {
    payloadStarted = result.payloadStarted === true;
    if (!payloadStarted && (hasPayloadRecord || hasTranscript)) {
      problems.push(runId + ': result.json says the payload did not start but its records show one');
    }
    if (payloadStarted && !hasPayloadRecord && !hasTranscript) {
      problems.push(runId + ': result.json says the payload started but no record of it exists');
    }
  } else {
    payloadStarted = admitted || hasPayloadRecord || hasTranscript;
  }
  return { runId, chunkId, hasWrapper: !!wrapper, admitted, payloadStarted, hasResult: !!result,
    eligibleReAsk: !!(result && result.eligibleReAsk === true), outcome: result ? result.outcome : null,
    wrapper };
}

/**
 * `input`: { baseDir (gp/<cell>), chunkId, runId (the run being prepared, skipped), ledgerFile (the C lock
 * log) | null, nowMs }. Returns { schema, chunkId, runs, admissions, payloads, problems, decision, reasons }.
 */
function chunkAttempts(input) {
  const problems = [];
  const runs = [];
  const ids = fs.existsSync(input.baseDir)
    ? fs.readdirSync(input.baseDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    : [];
  const folders = new Set(ids);
  ids.forEach((name) => {
    if (name === input.runId) return;
    const run = describeRun(path.join(input.baseDir, name), problems);
    if (run.chunkId === input.chunkId) runs.push(run);
  });
  const rows = [];
  if (input.ledgerFile && fs.existsSync(input.ledgerFile)) {
    const parsed = readJsonl(input.ledgerFile);
    parsed.problems.forEach((p) => problems.push('the C lock log: ' + p));
    parsed.entries.forEach((e) => { if (e.value && e.value.chunkId === input.chunkId) rows.push(e.value); });
  }
  const runIdOf = (row) => path.posix.basename(String(row.runDir || '').replace(/\\/g, '/'));
  rows.forEach((row) => {
    const id = runIdOf(row);
    if (id === input.runId) return;
    if (!folders.has(id)) {
      problems.push('the C lock log names run ' + id + ' of the chunk, but its folder is gone');
    } else if (!runs.some((r) => r.runId === id)) {
      problems.push('run ' + id + ' is in the C lock log for the chunk, not in its folder');
    }
  });
  runs.forEach((run) => {
    const row = rows.filter((r) => runIdOf(r) === run.runId)[0];
    if (run.hasWrapper && !row) problems.push('run ' + run.runId + ' finished without a C lock log line');
    if (row && run.hasResult && row.controllerOutcome !== undefined &&
      row.controllerOutcome !== run.outcome) {
      problems.push('run ' + run.runId + ': the C lock log says ' + row.controllerOutcome +
        ', result.json ' + run.outcome);
    }
    if (row) run.releaseMs = parseIsoMs(row.releaseObservedAt) || parseIsoMs(row.finished);
  });
  const admissions = runs.length;
  const payloads = runs.filter((r) => r.payloadStarted).length;
  const reasons = [];
  if (problems.length > 0) reasons.push('attempt-records-inconsistent');
  if (payloads >= 1) reasons.push('chunk-payload-already-started: no retry and no replacement');
  if (admissions >= MAX_ADMISSIONS) reasons.push('chunk-admissions-used: at most two per chunk');
  else if (admissions === 1 && payloads === 0) {
    const last = runs[0];
    if (!last.eligibleReAsk) reasons.push('the earlier admission was not an eligible unstarted hold');
    else if (!(last.releaseMs && input.nowMs - last.releaseMs >= REASK_WAIT_MS)) {
      reasons.push('a re-ask needs at least 60 s after the verified release of the earlier admission');
    }
  }
  return { schema: 'ms18d-c-attempts-1', chunkId: input.chunkId, runs: runs.map((r) => ({ runId: r.runId,
    admitted: r.admitted, payloadStarted: r.payloadStarted, eligibleReAsk: r.eligibleReAsk,
    outcome: r.outcome })), admissions, payloads, problems, reasons,
  decision: reasons.length === 0 ? 'allow' : 'refuse' };
}

module.exports = { chunkAttempts, MAX_ADMISSIONS, REASK_WAIT_MS };
