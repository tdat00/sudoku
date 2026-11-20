'use strict';

/*
 * MS18d Phase C0 task-owned (G1): the decision on the ACTUAL acquisition of the shared slot, made inside the
 * locked child before any payload, from three instants and the release history:
 *   requestedAtMs   the wrapper's clock when it asked for the slot, with the state of both lock files then;
 *   startedAtMs     this child's own clock at its first statement (so after the shared helper took the lock);
 *   lockAcquiredAtMs when the shared helper wrote the lock file as it took it (provenance only);
 *   history         collectReleases() over the Phase A, B and C logs and any coordinator evidence.
 * The rule (SA1 G1 and C0-1, check-list S-OD register):
 *   - the lock watch: the wrapper looked at BOTH lock files at least once a second for the 15.3 s right
 *     before the call and saw none (see watchReasons); that is the proof of the last release for locks
 *     held by others;
 *   - late start: startedAt - requestedAt STRICTLY greater than 2.000 s; busy: either lock file existed when
 *     the slot was requested. A busy or late acquisition is held unless a release of ANOTHER job (coordinator
 *     evidence), made after the request, is proved at least 15.000 s before the start. Our own old release
 *     proves nothing about a slot that somebody else released lately;
 *   - always: the latest release of all of them is at least 15.000 s (inclusive) before the start;
 *   - hold when anything is not proved: a time that is missing, negative or in the future, a lock-file
 *     instant outside [request, start], an unknown slot state, an unproved or empty release history.
 * A hold starts no payload, writes no result of a run and releases the slot; it is not an eligible re-ask.
 * Pure: no clock, no file.
 */
const LATE_START_MS = 2000;
const RELEASE_GAP_MS = 15000;
const WATCH_WINDOW_MS = 15300;
const WATCH_MAX_INTERVAL_MS = 1000;
const WATCH_LAST_CHECK_MAX_AGE_MS = 1000;

const isInstant = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * C0-1 (SA1): the logs cannot see another agent that released a free slot just before our request. The
 * wrapper therefore looks at BOTH lock files at least once a second for the 15.3 s right before the call;
 * any lock seen restarts the window; a bounded wait ends in a hold. Its record is the proof of the last
 * release for locks held by others: no lock in [firstCheck, lastCheck], so any release is before
 * firstCheck, at least 15.3 s before the call. Reasons (empty when proved); the record is `{ schema,
 * firstCheckMs, lastCheckMs, maxIntervalMs, windowSightings, gaveUp, ... }` as slot-watch.ps1 writes it.
 */
function watchReasons(watch, requestedAtMs) {
  if (!watch || typeof watch !== 'object' || watch.schema !== 'ms18d-c-watch-1') {
    return ['foreign-lock-watch-missing'];
  }
  const reasons = [];
  if (watch.gaveUp === true) reasons.push('foreign-lock-watch-gave-up');
  if (!isInstant(watch.firstCheckMs) || !isInstant(watch.lastCheckMs) || !isInstant(watch.maxIntervalMs) ||
    !Number.isInteger(watch.windowSightings)) {
    reasons.push('foreign-lock-watch-record-unusable');
    return reasons;
  }
  if (watch.lastCheckMs - watch.firstCheckMs < WATCH_WINDOW_MS) {
    reasons.push('foreign-lock-watch-under-15.3s');
  }
  if (watch.maxIntervalMs > WATCH_MAX_INTERVAL_MS) reasons.push('foreign-lock-watch-interval-over-1s');
  if (watch.windowSightings !== 0) reasons.push('foreign-lock-seen-in-the-window');
  if (isInstant(requestedAtMs)) {
    const age = requestedAtMs - watch.lastCheckMs;
    if (age < 0 || age > WATCH_LAST_CHECK_MAX_AGE_MS) {
      reasons.push('foreign-lock-watch-not-right-before-the-call');
    }
  }
  return reasons;
}

function decideAcquisition(input) {
  const { requestedAtMs, startedAtMs, lockAcquiredAtMs, slotBefore, history, watch } = input;
  const reasons = [];
  const record = {
    schema: 'ms18d-c-acquisition-1', thresholds: { lateStartMs: LATE_START_MS, releaseGapMs: RELEASE_GAP_MS },
    requestedAtMs: isInstant(requestedAtMs) ? requestedAtMs : null,
    startedAtMs: isInstant(startedAtMs) ? startedAtMs : null,
    lockAcquiredAtMs: isInstant(lockAcquiredAtMs) ? lockAcquiredAtMs : null,
    slotBefore: slotBefore || null
  };

  if (!isInstant(requestedAtMs) || !isInstant(startedAtMs)) reasons.push('unknown-times');
  else if (startedAtMs < requestedAtMs) reasons.push('negative-start-delay');
  if (!slotBefore || typeof slotBefore.shared !== 'boolean' || typeof slotBefore.timing !== 'boolean') {
    reasons.push('slot-state-unknown');
  }
  if (!isInstant(lockAcquiredAtMs)) reasons.push('lock-acquisition-instant-unknown');
  else if (isInstant(requestedAtMs) && isInstant(startedAtMs) &&
    (lockAcquiredAtMs < requestedAtMs || lockAcquiredAtMs > startedAtMs)) {
    reasons.push('lock-instant-outside-request-and-start');
  }
  const problems = history && Array.isArray(history.problems) ? history.problems : ['no release history'];
  if (problems.length > 0) reasons.push('release-history-unproved');
  const releases = history && Array.isArray(history.releases) ? history.releases : [];
  if (releases.length === 0) reasons.push('no-release-history');
  record.historyProblems = problems.slice();
  const watchProblems = watchReasons(watch, requestedAtMs);
  watchProblems.forEach((r) => reasons.push(r));
  record.watch = watch && typeof watch === 'object' ? { schema: watch.schema || null,
    firstCheckMs: watch.firstCheckMs, lastCheckMs: watch.lastCheckMs, checks: watch.checks,
    windowChecks: watch.windowChecks, maxIntervalMs: watch.maxIntervalMs,
    windowSightings: watch.windowSightings, restarts: watch.restarts,
    gaveUp: watch.gaveUp, ok: watchProblems.length === 0 } : null;

  if (isInstant(startedAtMs) && releases.some((r) => r.atMs > startedAtMs)) {
    reasons.push('release-in-the-future');
  }

  const times = isInstant(requestedAtMs) && isInstant(startedAtMs);
  const busy = !!(slotBefore && (slotBefore.shared === true || slotBefore.timing === true));
  const delayMs = times ? startedAtMs - requestedAtMs : null;
  const late = times && delayMs > LATE_START_MS;
  record.busyAtRequest = busy;
  record.startDelayMs = delayMs;
  record.late = !!late;

  const latest = releases.reduce((best, r) => (best === null || r.atMs > best.atMs ? r : best), null);
  record.latestRelease = latest ? { atMs: latest.atMs, label: latest.label, origin: latest.origin } : null;
  record.releaseGapMs = latest && isInstant(startedAtMs) ? startedAtMs - latest.atMs : null;

  if (times && latest) {
    if (startedAtMs - latest.atMs < RELEASE_GAP_MS) reasons.push('release-gap-under-15s');
    if (busy || late) {
      const proof = releases.filter((r) => r.origin !== 'own' && r.atMs >= requestedAtMs &&
        startedAtMs - r.atMs >= RELEASE_GAP_MS);
      record.foreignReleaseProof = proof.map((r) => ({ atMs: r.atMs, label: r.label,
        source: r.source || null }));
      if (proof.length === 0) {
        reasons.push(busy ? 'slot-busy-and-foreign-release-unproved'
          : 'late-start-and-foreign-release-unproved');
      }
    }
  }

  record.reasons = Array.from(new Set(reasons));
  record.decision = record.reasons.length === 0 ? 'proceed' : 'hold';
  return record;
}

module.exports = { decideAcquisition, watchReasons, LATE_START_MS, RELEASE_GAP_MS, WATCH_WINDOW_MS,
  WATCH_MAX_INTERVAL_MS, WATCH_LAST_CHECK_MAX_AGE_MS };
