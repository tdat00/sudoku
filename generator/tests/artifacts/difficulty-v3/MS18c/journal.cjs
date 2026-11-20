'use strict';

/*
 * MS18c Stage 3 task-owned S-OD14 journal and counters. One append-only, hash-chained journal per
 * logical cell (`runs/<variant>-<level>/journal.jsonl`) holds every reservation, transition, identity
 * and outcome; the counters are never stored, they are REDUCED from it, so a restart, a renamed
 * attempt, another PID or a new agent cannot renumber or replenish anything. The stable counter key
 * is epoch + exact variant/level.
 *
 *   payload slot 1 = primary, 2 = the single recovery (only after a committed joint authorization,
 *   claimed once);
 *   admission ordinal 1 or 2 inside an authorized slot (2 only after an eligible unstarted CPU hold
 *   with no launch intent, at least 60 s after its release); the launch intent is journalled BEFORE
 *   the qualifier process is created and consumes the slot's payload opportunity whatever happens
 *   next.
 *
 * `reduce` is PURE and `decideNext` is PURE, so the whole policy runs on fake data. A completed
 * record, a live matching supervisor, an ambiguous open attempt, an exhausted slot or a permanent
 * gap are all refusals, never a silent restart.
 */
const fs = require('fs');
const path = require('path');
const util = require('./util.cjs');

const TYPES = ['cell-open', 'admission-begin', 'admission-hold', 'launch-intent', 'qualifier-created',
  'payload-end', 'postcheck', 'attempt-end', 'recovery-claim', 'permanent-gap'];
const RE_ASK_SECONDS = 60;
const MAX_ORDINAL = 2;
const SUPERVISOR_CLASSES = ['supervisor-crash', 'session-loss'];
// The explicit allowlist of positively diagnosed supervisor, session, T-kill, worker or launcher faults.
const FAULT_CLASSES = Object.freeze(SUPERVISOR_CLASSES.concat(['t-kill', 'worker-fault', 'launcher-fault']));

/** The hash of an event: the previous hash plus the canonical text of the event without its own hash. */
function hashOf(event) {
  const body = Object.assign({}, event);
  delete body.hash;
  return util.sha256(event.prev + '\n' + util.canon(body));
}

/** Reads the journal of a cell and verifies the chain; `problems` is empty for an intact one. */
function readJournal(file) {
  const events = [];
  const problems = [];
  let prev = util.ZERO_HASH;
  util.readLines(file).forEach((line, i) => {
    let event;
    try {
      event = JSON.parse(line);
    } catch (err) {
      problems.push('line ' + (i + 1) + ' is not JSON');
      return;
    }
    if (event.seq !== i + 1) problems.push('line ' + (i + 1) + ' has seq ' + event.seq);
    if (event.prev !== prev) problems.push('line ' + (i + 1) + ' does not follow the previous event');
    if (event.hash !== hashOf(event)) problems.push('line ' + (i + 1) + ' has a wrong hash');
    if (TYPES.indexOf(event.type) === -1) {
      problems.push('line ' + (i + 1) + ' has an unknown type ' + event.type);
    }
    prev = event.hash;
    events.push(event);
  });
  return { events: events, problems: problems, tip: prev };
}

/** Appends one event (flushed before returning); refuses a corrupt chain. Returns the stored event. */
function appendEvent(file, type, fields, now) {
  if (TYPES.indexOf(type) === -1) throw new RangeError('unknown journal event type ' + type);
  const read = readJournal(file);
  if (read.problems.length > 0) throw new Error('the journal is not intact: ' + read.problems[0]);
  const event = Object.assign({ seq: read.events.length + 1, prev: read.tip, at: util.isoUtc(now),
    type: type },
    fields);
  event.hash = hashOf(event);
  util.appendLine(file, JSON.stringify(event));
  return event;
}

function newSlot() {
  return { attempts: [], launchIntent: false };
}

/**
 * What the journal says about a recovery: `classes` are the fault labels slot 1 can support (empty: no
 * recovery is possible), `primaryRuns` the slot-1 runs, `open` the open attempt, `lost` every attempt closed
 * as supervisor-lost, `last` the last slot-1 attempt. The labels are derived from the JOURNALLED facts, never
 * from the readiness kind: an open or supervisor-lost attempt (supervisor-crash / session-loss); a launch
 * intent whose payload ended on T (t-kill) or not (worker-fault / launcher-fault); a hold before the intent
 * whose journalled launcher exit is not 3 and not a T expiry (launcher-fault). A hold with launcher exit 3 is
 * an ordinary admission verdict (host, lock, timeout, counters, snapshot, consumer) and is never a fault, and
 * nothing here grants a payload opportunity.
 */
function recoveryFacts(state) {
  const s1 = state.slots[1];
  const last = s1.attempts[s1.attempts.length - 1] || null;
  const lost = [];
  [1, 2].forEach((n) => state.slots[n].attempts.forEach((a) => {
    if (a.ended && a.outcome === 'supervisor-lost') {
      lost.push({ runId: a.runId, slot: n, ordinal: a.ordinal, supervisor: a.supervisor });
    }
  }));
  const open = state.open ? { runId: state.open.runId, slot: state.open.slot,
    ordinal: state.open.ordinal, supervisor: state.open.supervisor } : null;
  let classes = [];
  if (!state.complete && !state.permanentGap && last) {
    if (open && open.slot === 1) {
      classes = SUPERVISOR_CLASSES.slice();
    } else if (last.ended) {
      const hold = last.hold;
      if (last.outcome === 'supervisor-lost') {
        classes = SUPERVISOR_CLASSES.slice();
      } else if (last.launchIntent && last.payloadEnd) {
        classes = last.payloadEnd.tExpired ? ['t-kill'] : ['worker-fault', 'launcher-fault'];
      } else if (!last.launchIntent && hold && Number.isInteger(hold.launcherExit) &&
          hold.launcherExit !== 3 && !hold.tExpired) {
        classes = ['launcher-fault'];
      }
    }
  }
  return { classes: classes, primaryRuns: s1.attempts.map((a) => a.runId), open: open, lost: lost,
    last: last ? { runId: last.runId, slot: 1, ordinal: last.ordinal, supervisor: last.supervisor } : null };
}

/**
 * The state of a cell from its events. `problems` lists every ordering violation (an event for a run
 * that is not open, a second launch intent in a slot, a slot 2 without its claim, ...); a state with
 * problems is refused.
 */
function reduce(events) {
  const state = {
    problems: [], epoch: null, cell: null, slots: { 1: newSlot(), 2: newSlot() }, recoveryClaimed: false,
    permanentGap: false, complete: null, open: null, lastReleaseAt: null, manifestBlob: null
  };
  const bad = (event, text) => state.problems.push('event ' + event.seq + ' (' + event.type + '): ' + text);
  const attemptOf = (event) => {
    const slot = state.slots[event.slot];
    return slot ? slot.attempts.filter((a) => a.runId === event.runId)[0] : null;
  };
  events.forEach((event) => {
    switch (event.type) {
      case 'cell-open':
        if (state.epoch !== null) bad(event, 'the cell is opened twice');
        state.epoch = event.epoch;
        state.cell = event.cell;
        break;
      case 'admission-begin': {
        const slot = state.slots[event.slot];
        if (!slot) return bad(event, 'slot ' + event.slot + ' does not exist');
        if (state.permanentGap) bad(event, 'an admission after a permanent gap');
        if (state.complete) bad(event, 'an admission after a complete record');
        if (state.open) bad(event, 'an admission while ' + state.open.runId + ' is open');
        if (event.slot === 2 && !state.recoveryClaimed) bad(event, 'slot 2 without its recovery claim');
        if (event.slot === 2 && recoveryFacts(state).classes.length === 0) {
          bad(event, 'slot 2 although slot 1 has no eligible supervisor or session fault');
        }
        if (event.slot === 1 && state.slots[2].attempts.length > 0) bad(event, 'slot 1 after slot 2');
        if (event.ordinal !== slot.attempts.length + 1 || event.ordinal > MAX_ORDINAL) {
          bad(event, 'ordinal ' + event.ordinal + ' is not the next admission of slot ' + event.slot);
        }
        if (slot.launchIntent) bad(event, 'a new admission after a launch intent in the same slot');
        const attempt = { ordinal: event.ordinal, slot: event.slot, runId: event.runId, hold: null,
          launchIntent: false, qualifierCreated: false, ended: false, outcome: null, record: false,
          supervisor: event.supervisor };
        slot.attempts.push(attempt);
        state.open = { runId: event.runId, slot: event.slot, ordinal: event.ordinal,
          supervisor: event.supervisor, attempt: attempt };
        break;
      }
      case 'admission-hold': {
        const a = attemptOf(event);
        if (!a || !state.open || state.open.runId !== event.runId) return bad(event, 'no such open attempt');
        if (a.launchIntent) bad(event, 'a hold after a launch intent');
        a.hold = { kind: event.kind, eligible: event.eligible === true, releasedAt: null,
          launcherExit: event.launcherExit, tExpired: event.tExpired === true };
        break;
      }
      case 'launch-intent': {
        const a = attemptOf(event);
        if (!a || !state.open || state.open.runId !== event.runId) return bad(event, 'no such open attempt');
        if (state.slots[event.slot].launchIntent) bad(event, 'a second launch intent in slot ' + event.slot);
        if (a.hold) bad(event, 'a launch intent after a hold');
        a.launchIntent = true;
        state.slots[event.slot].launchIntent = true;
        break;
      }
      case 'qualifier-created': {
        const a = attemptOf(event);
        if (!a || !a.launchIntent) return bad(event, 'a creation without its launch intent');
        a.qualifierCreated = true;
        break;
      }
      case 'payload-end': {
        const a = attemptOf(event);
        if (!a || !a.launchIntent) return bad(event, 'a payload end without a launch intent');
        a.payloadEnd = { exitCode: event.exitCode, tExpired: event.tExpired === true,
          fault: event.fault === true };
        break;
      }
      case 'postcheck': {
        const a = attemptOf(event);
        if (!a) return bad(event, 'no such attempt');
        a.record = true;
        if (state.complete) bad(event, 'a second complete record');
        state.complete = { runId: event.runId, accepted: event.verdict === 'accepted', slot: event.slot };
        break;
      }
      case 'attempt-end': {
        const a = attemptOf(event);
        if (!a || !state.open || state.open.runId !== event.runId) return bad(event, 'no such open attempt');
        a.ended = true;
        a.outcome = event.outcome;
        state.lastReleaseAt = event.at;
        if (a.hold) a.hold.releasedAt = event.releasedAt || event.at;
        state.open = null;
        break;
      }
      case 'recovery-claim':
        if (state.recoveryClaimed) bad(event, 'a second recovery claim');
        if (state.open) bad(event, 'a recovery claim while ' + state.open.runId + ' is open');
        if (recoveryFacts(state).classes.length === 0) {
          bad(event, 'a recovery claim although slot 1 has no eligible supervisor or session fault');
        }
        if (state.complete) bad(event, 'a recovery claim after a complete record');
        state.recoveryClaimed = true;
        break;
      case 'permanent-gap':
        state.permanentGap = true;
        break;
      default:
        bad(event, 'unknown type');
    }
  });
  if (events.length > 0 && state.epoch === null) state.problems.push('the first event is not cell-open');
  return state;
}

/** The slot and ordinal an admission would use next, or why none (never a restart of a used opportunity). */
function nextAdmission(state, ctx) {
  const holdRule = (slotNo) => {
    const slot = state.slots[slotNo];
    const last = slot.attempts[slot.attempts.length - 1];
    if (slot.attempts.length === 0) return { action: 'start', slot: slotNo, ordinal: 1 };
    if (slot.attempts.length >= MAX_ORDINAL) {
      return { action: 'refuse', code: 'admissions-exhausted', slot: slotNo,
        reason: 'both admission ordinals of slot ' + slotNo + ' were unstarted holds: an unexecuted gap' };
    }
    if (!last.hold || !last.hold.eligible || last.launchIntent) {
      return { action: 'refuse', code: 'ineligible-hold-review', slot: slotNo,
        reason: 'the previous admission is not a verified eligible unstarted CPU hold: joint review' };
    }
    const waited = (ctx.nowMs - Date.parse(last.hold.releasedAt)) / 1000;
    if (!(waited >= RE_ASK_SECONDS)) {
      return { action: 'wait', code: 'reask-too-early', slot: slotNo,
        waitSeconds: Math.ceil(RE_ASK_SECONDS - waited),
        reason: 'a re-ask needs at least ' + RE_ASK_SECONDS + ' s after the release of the previous hold' };
    }
    return { action: 'start', slot: slotNo, ordinal: last.ordinal + 1 };
  };
  const facts = recoveryFacts(state);
  if (!state.recoveryClaimed) {
    if (state.slots[2].attempts.length > 0) {
      return { action: 'refuse', code: 'journal-invalid',
        reason: 'slot 2 state without a recovery claim' };
    }
    if (facts.classes.length === 0) return holdRule(1);
    const auth = ctx.recoveryAuth;
    if (auth && auth.ok === true) return { action: 'start', slot: 2, ordinal: 1, claimRecovery: true };
    return { action: 'refuse', code: 'recovery-authorization-required',
      reason: 'slot 1 ended with a supervisor or session fault (' + facts.classes.join(' / ') +
        '): a committed one-use joint recovery authorization naming a positively diagnosed fault ' +
        'class is required (S-OD14), and nothing retries automatically' };
  }
  const second2 = state.slots[2].attempts[state.slots[2].attempts.length - 1];
  if (state.slots[2].launchIntent || (second2 && second2.outcome === 'supervisor-lost')) {
    return { action: 'refuse', code: 'permanent-gap', journalPermanentGap: true,
      reason: 'permanent-gap: recovery-exhausted (slot 2 ended without a record)' };
  }
  const second = holdRule(2);
  if (second.action === 'refuse' && second.code === 'admissions-exhausted') {
    return { action: 'refuse', code: 'permanent-gap', journalPermanentGap: true,
      reason: 'permanent-gap: recovery-exhausted (both recovery admissions were holds)' };
  }
  if (second.action === 'start' && !(ctx.recoveryAuth && ctx.recoveryAuth.ok === true)) {
    return { action: 'refuse', code: 'recovery-authorization-required',
      reason: 'every recovery admission re-verifies the committed authorization: it is missing, ' +
        'edited or unclaimed' };
  }
  return second;
}

/**
 * The next action for a cell. ctx: { nowMs, epoch (the manifest's), live: null | { matches, dead } (the
 * supervisor of the open attempt: matches means PID plus CIM creation time are those of the journalled
 * supervisor; dead means it is positively gone or another instance, never a failed or timed-out query),
 * diskComplete: boolean (a readable qualifier.json exists in any attempt directory), openRecord: null |
 * { readable } (the qualifier.json of the OPEN attempt), recordCandidates: [text] (a corrupt or partial
 * record artifact, or a canonical file, not acknowledged by the authorization), recoveryAuth: null |
 * { ok } (the committed one-use authorization of the cell, validated by the caller against
 * `recoveryFacts`) }. `close` and `recover-record` close out an open attempt of a dead supervisor and
 * grant nothing: the next call decides what may follow.
 */
function decideNext(state, ctx) {
  const refuse = (code, reason, extra) =>
    Object.assign({ action: 'refuse', code: code, reason: reason }, extra);
  if (state.problems.length > 0) return refuse('journal-invalid', state.problems[0]);
  if (state.epoch !== null && state.epoch !== ctx.epoch) {
    return refuse('epoch-mismatch', 'the journal belongs to epoch ' + state.epoch + ', not ' + ctx.epoch);
  }
  if (state.complete) {
    return refuse('complete-record', 'a complete record exists (run ' + state.complete.runId +
      '): it is preserved and never rerun, whatever its verdict');
  }
  if (state.open && ctx.live && ctx.live.matches === true) {
    return { action: 'adopt', runId: state.open.runId, slot: state.open.slot, ordinal: state.open.ordinal };
  }
  if (state.open && ctx.live && ctx.live.dead === true && ctx.openRecord &&
      ctx.openRecord.readable === true) {
    // A readable qualifier.json of a lost run is recovered (journalled and reviewed), never rerun, and it
    // never justifies a recovery.
    return { action: 'recover-record', runId: state.open.runId, slot: state.open.slot,
      ordinal: state.open.ordinal };
  }
  if (ctx.diskComplete) {
    return refuse('unjournaled-complete-record', 'a qualifier record exists on disk without a journalled ' +
      'postcheck: a late or unjournaled record blocks any relaunch and goes to review');
  }
  if (ctx.recordCandidates && ctx.recordCandidates.length > 0) {
    return refuse('record-inspection-required', 'a partial or canonical record file exists (' +
      ctx.recordCandidates.join('; ') + '): the existing evidence is recovered and reviewed, never ' +
      're-run, and neither a close-out, a recovery claim nor a permanent gap takes effect');
  }
  if (state.open) {
    const dead = Boolean(ctx.live && ctx.live.dead === true);
    if (dead && ctx.recoveryAuth && ctx.recoveryAuth.ok === true) {
      return { action: 'close', runId: state.open.runId, slot: state.open.slot,
        ordinal: state.open.ordinal };
    }
    const why = !dead ? 'its supervisor is not confirmed dead (alive, or the liveness query failed or ' +
      'timed out)' : 'a committed joint authorization naming this run is required to close it out';
    return refuse('ambiguous-open-attempt', 'run ' + state.open.runId + ' began and never ended, and ' +
      why + ': a stop for joint diagnosis, never a relaunch');
  }
  if (state.permanentGap) return refuse('permanent-gap', 'permanent-gap: recovery-exhausted');
  return nextAdmission(state, ctx);
}

/** The attempt directories and qualifier outputs found on disk under a cell's runs directory. */
function scanDisk(cellRunsDir) {
  const found = { attempts: [], records: [], partials: [], recordPartials: [] };
  if (!fs.existsSync(cellRunsDir)) return found;
  fs.readdirSync(cellRunsDir, { withFileTypes: true }).forEach((slotEntry) => {
    const m = /^payload-(\d+)$/.exec(slotEntry.name);
    if (!slotEntry.isDirectory() || !m) return;
    const slotDir = path.join(cellRunsDir, slotEntry.name);
    fs.readdirSync(slotDir, { withFileTypes: true }).forEach((attemptEntry) => {
      const a = /^admission-(\d+)$/.exec(attemptEntry.name);
      if (!attemptEntry.isDirectory() || !a) return;
      const dir = path.join(cellRunsDir, slotEntry.name, attemptEntry.name);
      const files = fs.readdirSync(dir);
      found.attempts.push({ slot: Number(m[1]), ordinal: Number(a[1]), dir: dir, files: files });
      files.forEach((f) => {
        if (f === 'qualifier.json') found.records.push(path.join(dir, f));
        if (/\.partial$|\.part$/.test(f)) found.partials.push(path.join(dir, f));
        if (/^qualifier\.(json|md)\.partial$/.test(f)) found.recordPartials.push(path.join(dir, f));
      });
    });
  });
  return found;
}

/** Attempt directories on disk that the journal does not know (an ambiguous attempt: never replaced). */
function unknownDirectories(state, disk) {
  return disk.attempts.filter((d) => {
    const slot = state.slots[d.slot];
    return !slot || !slot.attempts.some((a) => a.ordinal === d.ordinal);
  });
}

module.exports = {
  TYPES, RE_ASK_SECONDS, FAULT_CLASSES, SUPERVISOR_CLASSES, hashOf, readJournal, appendEvent, reduce,
  recoveryFacts, decideNext, nextAdmission, scanDisk, unknownDirectories
};
