'use strict';

/*
 * MS18b task-owned control flow of the bounded admission re-ask (the MS18a-Q2 rule renewed by the MS18b
 * brief: "MS18b-host-active"), with no I/O of its own: every effect goes through an injected `deps`
 * object, so
 * test-attempts.cjs runs the whole flow without generation, locks or processes. Adapted from MS18a's
 * attempts.cjs with ONE substantive change, required by the brief: the identity of an attempt is
 * EXPERIMENT-AWARE.
 *
 * Identity. A payload belongs to exactly one experiment: exactly one of `--shallow-cap=<s>` (family `cap`,
 * the R5 settings 64, 128, 256, none) or `--chain-window=<s>` (family `window`, the R9 settings 4, 6);
 * both or
 * neither is an evidence defect (this task's rows are fresh comparison rows). The key of a row is
 * { family, setting, variant, level, seed, from, count, total } derived from the payload text, and the plan
 * entry carries the same key plus the other effective default (the chain window of a cap entry, the shallow
 * allowance of a window entry) and the source defaults; the row's own `identity` field (written by
 * run-entry.ps1 from the plan entry) must equal the entry's identity as a whole. The same span at another
 * setting or in the other family is a different entry with its own quota and history; a row under another
 * name with the same full identity still counts against its entry (and, being an alias, stops the driver).
 *
 * Rules (as MS18a-Q2): per fixed logical entry at most TWO admission attempts, counted from the retained
 * lock-log rows across driver calls and restarts; the re-ask comes at least 60 s after the first attempt's
 * recorded release, with no lock held; it is allowed only after an ELIGIBLE hold (exit 3, unstarted payload,
 * no ledger, valid counters, verified host, clean lock recheck and every hold reason the ordinary
 * additional-consumer predicate); a payload is never rerun; a second eligible hold is an unexecuted GAP and
 * the other entries continue; anything else stops the driver.
 *
 * deps: { plan: { entries: [...] }, store: { records(), readiness(id), transcript(id),
 *   ledgerExists(entry) }, launch(entry, ordinal), sleep(ms), now() (ms), lockHeld() (optional),
 *   log(line) }
 */
const POLICY = 'MS18b-host-active';
const MAX_ATTEMPTS = 2;
const WAIT_MS = 60000;
const FAMILIES = {
  cap: { flag: '--shallow-cap', settings: ['64', '128', '256', 'none'] },
  window: { flag: '--chain-window', settings: ['4', '6'] }
};
const HOLD_PATTERN = new RegExp('^another process \\((.+), PID (\\d+)\\) gained ([0-9.]+) CPU-s in ' +
  '([0-9.]+) s \\(([0-9.]+) per second, limit 0\\.5\\)$');

const finite = (x) => typeof x === 'number' && Number.isFinite(x);

/** JSON with the keys of every object sorted, so that two spellings of one identity compare equal. */
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    const body = Object.keys(value).sort().map((k) => JSON.stringify(k) + ':' + canonical(value[k]));
    return '{' + body.join(',') + '}';
  }
  return JSON.stringify(value);
}

/**
 * The identity of a payload text (the joined soak arguments): { soak: false } for any other command, else
 * { soak: true, ok, problem, key: { family, setting, variant, level, seed, from, count, total } }.
 */
function parsePayload(text) {
  if (typeof text !== 'string' || !/soak\.js/.test(text)) return { soak: false };
  const bad = (problem) => ({ soak: true, ok: false, problem: problem, key: null });
  const flag = (name) => {
    const all = [];
    const re = new RegExp('(?:^|\\s)' + name + '=(\\S*)', 'g');
    let m;
    while ((m = re.exec(text)) !== null) all.push(m[1]);
    return all;
  };
  const cap = flag('--shallow-cap');
  const window = flag('--chain-window');
  if (cap.length + window.length !== 1) {
    return bad('exactly one of --shallow-cap and --chain-window is required, found ' + cap.length + ' and ' +
      window.length);
  }
  const family = cap.length === 1 ? 'cap' : 'window';
  const setting = cap.length === 1 ? cap[0] : window[0];
  if (FAMILIES[family].settings.indexOf(setting) === -1) {
    return bad(FAMILIES[family].flag + '=' + setting + ' is not a setting of the ' + family + ' experiment');
  }
  const one = (name) => {
    const all = flag(name);
    return all.length === 1 ? all[0] : null;
  };
  const variant = one('--variant');
  const level = one('--level');
  const seed = one('--seed');
  const count = one('--count');
  const from = one('--from');
  const total = one('--total-count');
  const whole = (v) => v !== null && /^\d+$/.test(v);
  if (variant === null || level === null || !whole(seed) || !whole(count)) {
    return bad('--variant, --level, --seed and --count must each appear exactly once');
  }
  if ((from !== null && !whole(from)) || (total !== null && !whole(total))) {
    return bad('--from and --total-count must be whole numbers');
  }
  return {
    soak: true, ok: true, problem: null,
    key: {
      family: family, setting: setting, variant: variant, level: level, seed: Number(seed),
      from: from === null ? 0 : Number(from), count: Number(count),
      total: total === null ? Number(count) : Number(total)
    }
  };
}

/** The key of a plan entry (its identity), in the same shape as parsePayload's. */
function entryKey(entry) {
  const i = entry.identity || {};
  return {
    family: i.family, setting: i.setting, variant: i.variant, level: i.level, seed: i.seed, from: i.from,
    count: i.count, total: i.total
  };
}

/** Problems of a plan entry before any launch: its payload text must say exactly what its identity says. */
function entryProblem(entry) {
  if (!entry.identity || typeof entry.identity !== 'object') return 'the entry has no identity';
  if (!Array.isArray(entry.payload)) return 'the entry has no payload';
  const parsed = parsePayload(entry.payload.join(' '));
  if (!parsed.soak || !parsed.ok) return 'the payload has no valid experiment identity: ' + parsed.problem;
  if (canonical(parsed.key) !== canonical(entryKey(entry))) {
    return 'the payload (' + canonical(parsed.key) + ') differs from the identity (' +
      canonical(entryKey(entry)) + ')';
  }
  if (entry.identity.total !== 12) return 'the logical total is not 12';
  const other = entry.identity.family === 'cap' ? entry.identity.otherChainWindow :
    entry.identity.otherShallowCap;
  if (other !== 'default') return 'the other effective setting is not recorded as the source default';
  return null;
}

/** Problems of the whole plan, [{ id, problem }]: every entry, and two entries that carry one identity. */
function planProblems(plan) {
  const out = [];
  const seen = new Map();
  plan.entries.forEach((entry) => {
    const problem = entryProblem(entry);
    if (problem) out.push({ id: entry.id, problem: problem });
    const key = canonical(entryKey(entry));
    if (seen.has(key)) {
      out.push({ id: entry.id, problem: 'the same identity as the entry ' + seen.get(key) });
      out.push({ id: seen.get(key), problem: 'the same identity as the entry ' + entry.id });
    } else {
      seen.set(key, entry.id);
    }
  });
  return out;
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

/** The identity text of a lock-log row: the parsed, canonical `identity` field, or null. */
function rowIdentity(row) {
  if (typeof row.identity !== 'string' || row.identity === '') return null;
  try {
    return canonical(JSON.parse(row.identity));
  } catch (err) {
    return null;
  }
}

function assess(store, entry) {
  const problems = [];
  const mine = canonical(entryKey(entry));
  const matched = [];
  store.records().forEach((row) => {
    const parsed = parsePayload(row.payload);
    if (!parsed.soak) return;
    if (!parsed.ok) {
      problems.push('row ' + row.id + ' has no valid experiment identity: ' + parsed.problem);
    } else if (canonical(parsed.key) === mine) {
      matched.push(row);
    }
  });
  const rows = matched.sort((a, b) => Date.parse(a.asked) - Date.parse(b.asked));
  const seen = new Set();
  const attempts = rows.map((row) => {
    const ordinal = ordinalOf(row, entry);
    const identity = rowIdentity(row);
    if (identity === null) {
      problems.push('row ' + row.id + ' of ' + entry.id + ' carries no readable identity');
    } else if (identity !== canonical(entry.identity)) {
      problems.push('row ' + row.id + ' carries an identity that differs from the plan entry ' + entry.id);
    }
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
  const planProblem = entryProblem(entry);
  if (planProblem) return result('stopped', 'plan: ' + planProblem, null);
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

const describe = (entry) => {
  const i = entry.identity || {};
  return i.family + ' ' + i.setting + ' ' + i.variant + ' ' + i.level + ' ' + i.from + '-' +
    (i.from + i.count - 1);
};

/** Runs the named entries in order; stops at the first `stopped`; { results, lines, exitCode }. */
function run(ids, deps) {
  const results = [];
  const planFault = planProblems(deps.plan);
  for (const id of ids) {
    const entry = deps.plan.entries.find((e) => e.id === id);
    if (!entry) {
      results.push({
        id: id, status: 'stopped', reason: 'not an entry of the plan', launched: 0, requests: [], attempts: []
      });
      break;
    }
    const faults = planFault.filter((p) => p.id === id).map((p) => p.problem);
    if (faults.length) {
      results.push({
        id: id, status: 'stopped', reason: 'plan: ' + faults.join('; '), launched: 0,
        requests: entry.requests, attempts: []
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
    const entry = deps.plan.entries.find((e) => e.id === r.id);
    const attempts = r.attempts.map((a) => a.id + '=' + a.kind).join(', ') || 'none';
    return 'ENTRY ' + r.id + (entry ? ' (' + describe(entry) + ')' : '') + ': ' + r.status.toUpperCase() +
      ', ' + r.launched + ' launch(es) in this call, attempts ' + attempts +
      (r.status === 'gap' ? '; unexecuted requests ' + r.requests.join(', ') : '');
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
  POLICY: POLICY, MAX_ATTEMPTS: MAX_ATTEMPTS, WAIT_MS: WAIT_MS, FAMILIES: FAMILIES, canonical: canonical,
  parsePayload: parsePayload, entryKey: entryKey, entryProblem: entryProblem, planProblems: planProblems,
  ordinalOf: ordinalOf, classifyAttempt: classifyAttempt, assess: assess, driveEntry: driveEntry, run: run
};
