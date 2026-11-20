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
  // a transcript, a stream or a ledger is a sign of a payload (F2/F5): an uncertain start is never unstarted
  const hasTranscript = ['transcript.txt', 'stdout.txt', 'stderr.txt', 'ledger.json']
    .some((name) => fs.existsSync(path.join(dir, name)));
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
    // proven unstarted: result.json says so in so many words (a missing key is an uncertain start, for a3)
    declaredUnstarted: !!(result && result.payloadStarted === false),
    eligibleReAsk: !!(result && result.eligibleReAsk === true), outcome: result ? result.outcome : null,
    wrapper };
}

const EXCEPTION_ATTEMPT = 3;
const sameList = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** The attempt number a run id names for its chunk (`<chunk>.a<n>`), or null for any other name. */
function attemptOf(runId, chunkId) {
  const id = String(runId);
  const head = String(chunkId) + '.a';
  if (!id.startsWith(head) || !/^[0-9]+$/.test(id.slice(head.length))) return null;
  return Number(id.slice(head.length));
}

/**
 * The reasons an exceptional third admission (a3) is refused; [] when it stands. It exists only for a chunk
 * of the V2 `admissionExceptions` (`exception`), with that chunk's OWN two earlier admissions, both proven
 * unstarted holds (result.json says control-hold and payloadStarted false, no payload sign) with a matching
 * control-hold line in the C lock log. Refused: earlier payload evidence, an uncertain start, a missing or
 * contradictory history, any other folder of the chunk (an existing a3, a stray one), another chunk's
 * exception or folders (no borrowing), a chunk that already succeeded, a repeat of the a3. Rulings (F3) are
 * never consulted: the authority is the owner decision of the exception and the frozen V2/B4 binding.
 */
function exceptionReasons(c) {
  const { input, exception, runs, rows, folders, runIdOf } = c;
  const chunkId = input.chunkId;
  const prior = [chunkId + '.a1', chunkId + '.a2'];
  const out = [];
  if (!exception) {
    return ['no-admission-exception: attempt 3 exists only for a chunk of the V2 admissionExceptions'];
  }
  if (exception.chunkId !== chunkId) {
    out.push('exception-for-another-chunk: an exception is never borrowed by another chunk');
  }
  if (exception.runId !== input.runId || exception.attempt !== EXCEPTION_ATTEMPT ||
    exception.maxAdmissions !== 3 || exception.maxPayloads !== 1 || !sameList(exception.priorRunIds, prior)) {
    out.push('the exception is not the a3 exception of this chunk and run');
  }
  const strays = Array.from(folders).filter((n) => n !== input.runId && n.startsWith(chunkId + '.') &&
    prior.indexOf(n) === -1);
  if (strays.length > 0) out.push('stray-chunk-folder: ' + strays.join(', ') + ' (an a3 or another folder)');
  const names = runs.map((r) => r.runId).sort();
  if (!sameList(names, prior)) {
    out.push('a3 needs its own a1 and a2 admissions, found ' +
      (names.length > 0 ? names.join(', ') : 'none'));
  }
  runs.forEach((run) => {
    if (!run.hasResult) out.push('uncertain-start: ' + run.runId + ' has no result.json');
    else if (run.outcome !== 'control-hold' || !run.declaredUnstarted || run.payloadStarted) {
      out.push('not-proven-unstarted: ' + run.runId + ' is not a control-hold that started no payload');
    }
  });
  prior.forEach((id) => {
    const mine = rows.filter((r) => runIdOf(r) === id);
    if (mine.length !== 1 || mine[0].controllerOutcome !== 'control-hold') {
      out.push('missing-or-contradictory-history: no matching control-hold line of ' + id +
        ' in the C lock log');
    }
  });
  if (rows.some((r) => r.controllerOutcome === 'success' || r.outcome === 'success')) {
    out.push('chunk-already-succeeded: a completed chunk has no a3');
  }
  if (rows.some((r) => runIdOf(r) === input.runId)) {
    out.push('the a3 run already has a line in the C lock log');
  }
  return out;
}

/**
 * `input`: { baseDir (gp/<cell>), chunkId, runId (the run being prepared, skipped), ledgerFile (the C lock
 * log) | null, rulings (journals.rulingsState: the COMMITTED journal at the admitted HEAD) | null, nowMs,
 * exception (the V2 `admissionExceptions` entry of this chunk, or null; only the a3 run is judged by it) }.
 * Returns { schema, chunkId, attempt, runs, admissions, payloads, problems, ruling, rulingsJournal, decision,
 * reasons }.
 * The default cap is TWO admissions and ONE payload per chunk. An a3 (runId `<chunk>.a3`) is admitted only by
 * exceptionReasons; an a4 (any attempt above 3) never.
 * F3: a committed ruling line {chunkId, heldRunId, allowAttempt: 2, ref, at} is honoured only for a chunk
 * with ONE admission that started no payload (so never after a started payload and never beyond two
 * admissions), and only while it is neither stale (dated before the verified release of the hold it rules
 * on) nor prospective (dated after now); it stands in for the eligible-hold and 60 s conditions of a
 * re-ask. A journal that is absent, malformed, contradictory or does not keep its base version is a
 * problem, not authority. A ruling never authorizes an a3.
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
    // F1: a pre-window hold created no folder and consumed no admission
    parsed.entries.forEach((e) => {
      if (e.value && e.value.chunkId === input.chunkId && e.value.type !== 'pre-window-hold') {
        rows.push(e.value);
      }
    });
  }
  const rulings = input.rulings || { entries: [], problems: ['no committed rulings journal was read'],
    reference: null };
  rulings.problems.forEach((p) => problems.push('the rulings journal: ' + p));
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
  const attempt = attemptOf(input.runId, input.chunkId);
  const exception = input.exception || null;
  const reasons = [];
  let ruling = null;
  if (problems.length > 0) reasons.push('attempt-records-inconsistent');
  if (payloads >= 1) reasons.push('chunk-payload-already-started: no retry and no replacement');
  if (attempt !== null && attempt > EXCEPTION_ATTEMPT) {
    reasons.push('chunk-attempt-beyond-the-exception: no a4 and no attempt above 3');
  } else if (attempt === EXCEPTION_ATTEMPT) {
    exceptionReasons({ input, exception, runs, rows, folders, runIdOf }).forEach((r) => reasons.push(r));
  } else if (admissions >= MAX_ADMISSIONS) reasons.push('chunk-admissions-used: at most two per chunk');
  else if (admissions === 1 && payloads === 0) {
    const last = runs[0];
    const named = rulings.entries.filter((r) => r.chunkId === input.chunkId &&
      r.heldRunId === last.runId)[0];
    let notAuthority = null;
    if (named) {
      const at = parseIsoMs(named.at);
      if (!(last.releaseMs && at >= last.releaseMs)) {
        notAuthority = 'the ruling is stale: dated before the verified release of the hold it rules on';
      } else if (at > input.nowMs) notAuthority = 'the ruling is prospective: dated after now';
      else ruling = named;
    }
    // F3: a valid committed ruling for this held run stands in for the eligible-hold and 60 s conditions
    if (!ruling) {
      if (!last.eligibleReAsk) reasons.push('the earlier admission was not an eligible unstarted hold');
      else if (!(last.releaseMs && input.nowMs - last.releaseMs >= REASK_WAIT_MS)) {
        reasons.push('a re-ask needs at least 60 s after the verified release of the earlier admission');
      }
      if (notAuthority && reasons.length > 0) reasons.push(notAuthority);
    }
  }
  return { schema: 'ms18d-c-attempts-1', chunkId: input.chunkId, attempt, exception: exception ?
    exception.id : null, runs: runs.map((r) => ({ runId: r.runId,
    admitted: r.admitted, payloadStarted: r.payloadStarted, eligibleReAsk: r.eligibleReAsk,
    outcome: r.outcome })), admissions, payloads, problems, reasons, ruling,
  rulingsJournal: rulings.reference, decision: reasons.length === 0 ? 'allow' : 'refuse' };
}

module.exports = { chunkAttempts, attemptOf, MAX_ADMISSIONS, EXCEPTION_ATTEMPT, REASK_WAIT_MS };
