'use strict';

/*
 * MS18a task-owned control flow of the bounded admission re-ask (SA2's ruling MS18a-Q2), with no I/O of its
 * own: every effect goes through an injected `deps` object, so test-attempts.cjs runs the whole flow without
 * generation, locks or processes.
 *
 * Rules (MS18a-Q2): per fixed logical plan entry at most TWO admission attempts, counted from the retained
 * lock-log rows (found by the payload's variant, level, --from and --count, so a renamed row still counts);
 * the re-ask comes at least 60 s after the first attempt's recorded release, with no lock held; it is
 * allowed only after an ELIGIBLE hold (exit 3, unstarted payload, no ledger, valid counters, verified host,
 * clean lock recheck and every hold reason the ordinary additional-consumer predicate of MS18a-Q1); a
 * payload is never rerun; a second eligible hold is an unexecuted GAP and the other entries continue;
 * anything else stops the driver.
 *
 * deps: { plan: { entries: [...] }, store: { records(), readiness(id), transcript(id),
 *   ledgerExists(entry) }, launch(entry, ordinal), sleep(ms), now() (ms), lockHeld() (optional),
 *   log(line) }
 */
const POLICY = 'MS18a-Q1-host-active';
const MAX_ATTEMPTS = 2;
const WAIT_MS = 60000;
const HOLD_PATTERN = new RegExp('^another process \\((.+), PID (\\d+)\\) gained ([0-9.]+) CPU-s in ' +
  '([0-9.]+) s \\(([0-9.]+) per second, limit 0\\.5\\)$');

const finite = (x) => typeof x === 'number' && Number.isFinite(x);

/** { variant, level, from, count } of a payload text (the joined soak arguments), or null. */
function payloadKey(text) {
  if (typeof text !== 'string') return null;
  const variant = /--variant=(\S+)/.exec(text);
  const level = /--level=(\S+)/.exec(text);
  const count = /--count=(\d+)/.exec(text);
  const from = /--from=(\d+)/.exec(text);
  if (!variant || !level || !count) return null;
  return {
    variant: variant[1], level: level[1], from: from ? Number(from[1]) : 0, count: Number(count[1])
  };
}

function sameSpan(row, entry) {
  const key = payloadKey(row.payload);
  return key !== null && key.variant === entry.variant && key.level === entry.level &&
    key.from === entry.from && key.count === entry.count;
}

/** 1 for the entry's own id, 2 for `<id>-admission2`, null for anything else (an alias). */
function ordinalOf(row, entry) {
  let ordinal = null;
  if (row.id === entry.id) ordinal = 1;
  else if (row.id === entry.id + '-admission2') ordinal = 2;
  if (ordinal === null) return null;
  if (row.attempt !== undefined && row.attempt !== ordinal) return null;
  if (row.entry !== undefined && row.entry !== entry.id) return null;
  return ordinal;
}

function holdProblem(reason, hostPid) {
  const m = HOLD_PATTERN.exec(reason);
  if (!m) return 'a hold reason is not the additional-consumer predicate: ' + reason;
  const cpu = Number(m[3]);
  const seconds = Number(m[4]);
  const rate = Number(m[5]);
  if (!(seconds > 0) || !finite(cpu) || !finite(rate)) return 'unreadable consumer figures: ' + reason;
  if (rate < 0.5 || Math.abs(cpu / seconds - rate) > 0.02) return 'inconsistent figures: ' + reason;
  if (Number(m[2]) === hostPid) return 'the consumer is the host itself: ' + reason;
  return null;
}

function hostVerified(readiness) {
  const host = readiness.hostObservation;
  const seen = host && host.observed;
  const want = host && host.expected;
  if (!seen || !want || host.inBothSnapshots !== true) return null;
  const sameExe = String(seen.cimExe).toLowerCase() === String(want.exe).toLowerCase();
  const same = seen.pid === want.pid && seen.created === want.created && seen.cimParent === want.parent;
  return same && sameExe ? want : null;
}

/**
 * { kind: 'completed' | 'eligible-hold' | 'stop', reason } of one attempt: the lock-log row, its readiness
 * record, its transcript and whether the canonical ledger exists.
 */
function classifyAttempt(row, readiness, transcript, ledgerExists) {
  const stop = (reason) => ({ kind: 'stop', reason: reason });
  if (!readiness || typeof readiness !== 'object') return stop('no readiness record');
  if (row.policy !== POLICY || readiness.policy !== POLICY) return stop('not under ' + POLICY);
  if (row.exit === 0 && !row.error) {
    if (readiness.admitted !== true) return stop('exit 0 without an admitted record');
    if (!readiness.payloadStartedAt || readiness.payloadExit !== 0) {
      return stop('exit 0 without a payload exit 0');
    }
    if (!ledgerExists) return stop('exit 0 but the ledger is absent');
    return { kind: 'completed', reason: 'admitted, payload exit 0, ledger present' };
  }
  const expected = row.exit === 3 && typeof row.error === 'string' && /command failed: 3$/.test(row.error);
  if (!expected) {
    return stop('exit ' + row.exit + (row.error ? ' (' + row.error + ')' : '') + ': not an admission hold');
  }
  if (readiness.admitted !== false) return stop('exit 3 but the record is not admitted:false');
  if (readiness.payloadStartedAt || readiness.payloadExit !== undefined) {
    return stop('exit 3 after the payload started');
  }
  if (typeof transcript !== 'string' || !/NOT STARTED/.test(transcript) || /^START /m.test(transcript)) {
    return stop('the transcript does not show an unstarted payload');
  }
  if (ledgerExists) return stop('exit 3 but a puzzle ledger exists');
  const cores = Array.isArray(readiness.intervals) ? readiness.intervals.map((i) => i.busyCores) : [];
  if (cores.length !== 5 || !cores.every(finite)) return stop('the aggregate counters are invalid');
  const want = hostVerified(readiness);
  if (!want) return stop('the host is not verified in both snapshots');
  const before = readiness.locks;
  const after = readiness.lockRecheck;
  const clean = before && !before.foreign.present && before.ownMatchesTask && after &&
    !after.foreign.present && after.ownMatchesTask;
  if (!clean) return stop('a lock condition is not clean');
  const holds = readiness.admissionHolds;
  if (!Array.isArray(holds) || holds.length === 0) return stop('no hold reason is recorded');
  for (let i = 0; i < holds.length; i++) {
    const problem = holdProblem(holds[i], want.pid);
    if (problem) return stop(problem);
  }
  return { kind: 'eligible-hold', reason: holds.join('; ') };
}

function assess(store, entry) {
  const rows = store.records().filter((row) => sameSpan(row, entry))
    .sort((a, b) => Date.parse(a.asked) - Date.parse(b.asked));
  const problems = [];
  const seen = new Set();
  const attempts = rows.map((row) => {
    const ordinal = ordinalOf(row, entry);
    if (ordinal === null) {
      problems.push('row ' + row.id + ' is an alias or inconsistent attempt of ' + entry.id);
    } else if (seen.has(ordinal)) {
      problems.push('attempt ' + ordinal + ' of ' + entry.id + ' appears twice');
    } else {
      seen.add(ordinal);
    }
    return { row: row, ordinal: ordinal, id: row.id };
  });
  if (rows.length > MAX_ATTEMPTS) {
    problems.push(rows.length + ' attempt rows for ' + entry.id + ' (the limit is 2)');
  }
  if (problems.length === 0 && attempts.some((a, i) => a.ordinal !== i + 1)) {
    problems.push('attempt ordinals are not 1, 2 in order');
  }
  const ledger = store.ledgerExists(entry);
  if (problems.length === 0) {
    attempts.forEach((a, i) => {
      // A ledger belongs to the last attempt; an earlier hold legitimately precedes it.
      const present = i === attempts.length - 1 ? ledger : false;
      a.verdict = classifyAttempt(a.row, store.readiness(a.id), store.transcript(a.id), present);
    });
  }
  return { attempts: attempts, problems: problems, ledger: ledger };
}

function summaryOf(st) {
  return (st ? st.attempts : []).map((a) => ({
    id: a.id, ordinal: a.ordinal, kind: a.verdict ? a.verdict.kind : null,
    reason: a.verdict ? a.verdict.reason : null, finished: a.row.finished
  }));
}

function driveEntry(entry, deps) {
  let launched = 0;
  const result = (status, reason, st) => ({
    id: entry.id, status: status, reason: reason, launched: launched, requests: entry.requests,
    attempts: summaryOf(st)
  });
  for (let round = 0; round < 3; round++) {
    const st = assess(deps.store, entry);
    if (st.problems.length) return result('stopped', st.problems.join('; '), st);
    const done = st.attempts.filter((a) => a.verdict.kind === 'completed');
    const stops = st.attempts.filter((a) => a.verdict.kind === 'stop');
    if (stops.length) return result('stopped', stops[0].id + ': ' + stops[0].verdict.reason, st);
    if (done.length > 1) return result('stopped', 'more than one completed attempt', st);
    if (done.length === 1) {
      if (done[0] !== st.attempts[st.attempts.length - 1]) {
        return result('stopped', 'a completed attempt is not the last', st);
      }
      return result('done', launched ? 'ran in this call' : 'already complete: never rerun', st);
    }
    if (st.ledger) return result('stopped', 'a ledger exists without a completed attempt record', st);
    const n = st.attempts.length;
    if (n >= MAX_ATTEMPTS) {
      deps.log(entry.id + ': two eligible admission holds: unexecuted gap');
      return result('gap', 'environment-held, unexecuted after two admission attempts', st);
    }
    if (launched >= MAX_ATTEMPTS) return result('stopped', 'the launch quota of this call is used', st);
    if (n === 1) {
      const wait = Date.parse(st.attempts[0].row.finished) + WAIT_MS - deps.now();
      if (typeof deps.lockHeld === 'function' && deps.lockHeld()) {
        return result('stopped', 'a lock is held before the wait', st);
      }
      if (wait > 0) {
        deps.log(entry.id + ': waiting ' + Math.ceil(wait / 1000) + ' s (60 s after the recorded release)');
        deps.sleep(wait);
      }
    }
    deps.log(entry.id + ': admission attempt ' + (n + 1));
    deps.launch(entry, n + 1);
    launched++;
  }
  return result('stopped', 'the control flow did not settle', assess(deps.store, entry));
}

/** Runs the named entries in order; stops at the first `stopped`; { results, lines, exitCode }. */
function run(ids, deps) {
  const results = [];
  for (const id of ids) {
    const entry = deps.plan.entries.find((e) => e.id === id);
    if (!entry) {
      results.push({
        id: id, status: 'stopped', reason: 'not an entry of the plan', launched: 0, requests: [], attempts: []
      });
      break;
    }
    const r = driveEntry(entry, deps);
    results.push(r);
    deps.log(id + ' -> ' + r.status + ': ' + r.reason);
    if (r.status === 'stopped') break;
  }
  const gaps = results.filter((r) => r.status === 'gap');
  const stopped = results.filter((r) => r.status === 'stopped');
  const lines = results.map((r) => {
    const attempts = r.attempts.map((a) => a.id + '=' + a.kind).join(', ') || 'none';
    return 'ENTRY ' + r.id + ': ' + r.status.toUpperCase() + ', ' + r.launched + ' launch(es) in this ' +
      'call, ' +
      'attempts ' + attempts + (r.status === 'gap' ? '; unexecuted requests ' + r.requests.join(', ') : '');
  });
  if (stopped.length) {
    lines.push('STATUS: STOPPED at ' + stopped[0].id + ': ' + stopped[0].reason);
  } else if (gaps.length) {
    lines.push('STATUS: INCOMPLETE: ' + gaps.length + ' unexecuted gap(s): ' +
      gaps.map((g) => g.id).join(', '));
  } else {
    lines.push('STATUS: COMPLETE for ' + results.length + ' listed entries');
  }
  return { results: results, lines: lines, exitCode: stopped.length ? 1 : gaps.length ? 4 : 0 };
}

module.exports = {
  POLICY: POLICY, MAX_ATTEMPTS: MAX_ATTEMPTS, WAIT_MS: WAIT_MS, payloadKey: payloadKey, ordinalOf: ordinalOf,
  classifyAttempt: classifyAttempt, assess: assess, driveEntry: driveEntry, run: run
};
