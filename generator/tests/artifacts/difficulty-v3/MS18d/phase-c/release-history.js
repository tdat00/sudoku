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
 * release.
 */
const fs = require('fs');
const path = require('path');
const { parseIsoMs, readJsonl } = require('./common.js');

function fromLog(source, release) {
  const entries = readJsonl(source.file);
  const problems = entries.problems.map((p) => source.label + ': ' + p);
  entries.entries.forEach(({ line, value }) => {
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
    files.push({ label: source.label, file: source.file, present: true });
    const found = source.kind === 'coordinator' ? fromCoordinator(source, releases)
      : fromLog(source, releases);
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

module.exports = { collectReleases };
