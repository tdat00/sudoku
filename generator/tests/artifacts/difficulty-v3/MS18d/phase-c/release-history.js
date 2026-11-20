'use strict';

/*
 * MS18d Phase C0 task-owned (G2, the reading side): the release history of the shared slot, from EVERY log
 * of this task and not only the one a run writes to. A source is one of
 *   - a lock log of Phase A, Phase B or Phase C (kind `log`): every record carries `finished` (the wrapper's
 *     time after the shared helper returned, never before the lock file was removed) and a Phase C record
 *     may carry `releaseObservedAt`, a verified observation made after the helper returned (an upper bound
 *     of the removal, not an exact removal time); the later of the two names the release of that record;
 *   - coordinator evidence (kind `coordinator`): lines `{ "at": <ISO with zone>, "source": <text>,
 *     "note": <text> }`, a release of another job's hold that somebody who saw it vouches for.
 * The result carries every release, the latest of all of them and the latest one that is not our own log.
 * A log that is missing when it is required, a line that is not JSON, a record without a usable time or
 * coordinator evidence without a source is a PROBLEM: an unproved history, which the acquisition rule treats
 * as a hold. Reading the logs again after a restart, or after a log was added, never resets the latest
 * release. The one record class of the Phase C log that is not a release is the typed F1 pre-window event
 * (epoch 3, below): it is excluded before the time is required and listed in that log's `files[]` entry.
 */
const fs = require('fs');
const path = require('path');
const { parseIsoMs, readJsonl } = require('./common.js');

/*
 * Epoch 3: the F1 `pre-window-hold` event of the Phase C log (label `C`) is NOT a release. The wrapper
 * writes it when the lock watch (or the cheap re-check after it) gave up before any run folder existed: no
 * lock was acquired, no admission was consumed, no payload started, so there is nothing to collect and no
 * `finished` time (the historical writer wrote only `at`; line 24 of the real log is one). It is recognised
 * by its TYPED semantics, in every form a writer produced (heldAt `foreign-lock-watch` or
 * `pre-window-recheck`, with or without the explicit no-acquisition metadata, with or without a diagnostic
 * `finished`), and only when it is valid in every respect: the exact schema, `type` and `outcome` both
 * `pre-window-hold`, a usable `at`, no key outside the list below (a release time, a run directory, an exit,
 * a controller outcome ... are claims of an acquisition, so such a row is contradictory and a PROBLEM), the
 * metadata false where present, and a `finished` only together with all three metadata fields false. A row
 * that claims to be one and is not valid is a problem, never a release and never silently ignored.
 * Everything else still needs a usable `finished`.
 */
const PRE_WINDOW_HELD_AT = ['foreign-lock-watch', 'pre-window-recheck'];
const PRE_WINDOW_KEYS = ['schema', 'type', 'task', 'runId', 'cell', 'payload', 'chunkId', 'attempt', 'scope',
  'standin', 'outcome', 'heldAt', 'at', 'reasons', 'watch', 'problems', 'watchCycles', 'repeatedCycles',
  'omittedCycles', 'cycles', 'lockAcquired', 'admissionConsumed', 'payloadStarted', 'finished'];
const PRE_WINDOW_NOT = ['lockAcquired', 'admissionConsumed', 'payloadStarted'];

/**
 * null when the record does not claim to be a pre-window event (it is an ordinary row), else
 * { valid, why }: `why` is the first reason it is not a valid one.
 */
function classifyPreWindowEvent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (value.type !== 'pre-window-hold' && value.outcome !== 'pre-window-hold') return null;
  const no = (why) => ({ valid: false, why });
  if (value.schema !== 'ms18d-c-run-1') return no('schema');
  if (value.type !== 'pre-window-hold' || value.outcome !== 'pre-window-hold') return no('type and outcome');
  if (PRE_WINDOW_HELD_AT.indexOf(value.heldAt) === -1) return no('heldAt');
  if (parseIsoMs(value.at) === null) return no('at');
  const unknown = Object.keys(value).filter((k) => PRE_WINDOW_KEYS.indexOf(k) === -1)[0];
  if (unknown !== undefined) return no('key ' + unknown);
  const claim = PRE_WINDOW_NOT.filter((k) => value[k] !== undefined && value[k] !== false)[0];
  if (claim !== undefined) return no('claim ' + claim);
  if (value.finished !== undefined) {
    if (parseIsoMs(value.finished) === null) return no('finished');
    if (PRE_WINDOW_NOT.some((k) => value[k] !== false)) return no('finished without metadata');
  }
  return { valid: true, why: null };
}

function fromLog(source, release, entry) {
  const entries = readJsonl(source.file);
  const problems = entries.problems.map((p) => source.label + ': ' + p);
  entries.entries.forEach(({ line, value }) => {
    if (source.label === 'C') {
      const event = classifyPreWindowEvent(value);
      if (event !== null) {
        if (event.valid) {
          entry.skippedLines = (entry.skippedLines || []).concat([line]);
          entry.skippedEvents = (entry.skippedEvents || []).concat([{ line, type: value.type,
            heldAt: value.heldAt, runId: value.runId === undefined ? null : value.runId, at: value.at }]);
        } else {
          problems.push(source.label + ':' + line + ': not a valid pre-window event (' + event.why + ')');
        }
        return;
      }
    }
    const finished = parseIsoMs(value && value.finished);
    const observed = value && value.releaseObservedAt !== undefined
      ? parseIsoMs(value.releaseObservedAt) : null;
    if (value && value.releaseObservedAt !== undefined && observed === null) {
      problems.push(source.label + ':' + line + ': releaseObservedAt is not a usable time');
    }
    if (finished === null) {
      problems.push(source.label + ':' + line + ': no usable finished time');
      return;
    }
    const atMs = observed !== null && observed > finished ? observed : finished;
    release.push({ atMs, label: source.label, origin: 'own', file: path.basename(source.file), line });
  });
  return problems;
}

function fromCoordinator(source, release) {
  const entries = readJsonl(source.file);
  const problems = entries.problems.map((p) => source.label + ': ' + p);
  entries.entries.forEach(({ line, value }) => {
    const atMs = parseIsoMs(value && value.at);
    if (atMs === null) {
      problems.push(source.label + ':' + line + ': no usable time');
      return;
    }
    if (typeof value.source !== 'string' || value.source.trim() === '') {
      problems.push(source.label + ':' + line + ': no source: the evidence is not vouched for');
      return;
    }
    release.push({ atMs, label: source.label, origin: 'coordinator', file: path.basename(source.file), line,
      source: value.source });
  });
  return problems;
}

/** `sources`: [{ label, file, kind: 'log' | 'coordinator', required }]. */
function collectReleases(sources) {
  const releases = [];
  const problems = [];
  const files = [];
  sources.forEach((source) => {
    if (!fs.existsSync(source.file)) {
      if (source.required) problems.push(source.label + ': the required log ' + source.file + ' is missing');
      files.push({ label: source.label, file: source.file, present: false });
      return;
    }
    const entry = { label: source.label, file: source.file, present: true };
    files.push(entry);
    const found = source.kind === 'coordinator' ? fromCoordinator(source, releases)
      : fromLog(source, releases, entry);
    found.forEach((p) => problems.push(p));
  });
  const latestOf = (list) => list.reduce((best, r) => (best === null || r.atMs > best.atMs ? r : best), null);
  return {
    releases,
    problems,
    files,
    latest: latestOf(releases),
    latestOwn: latestOf(releases.filter((r) => r.origin === 'own')),
    latestForeign: latestOf(releases.filter((r) => r.origin !== 'own'))
  };
}

module.exports = { collectReleases, classifyPreWindowEvent, PRE_WINDOW_HELD_AT, PRE_WINDOW_KEYS };
