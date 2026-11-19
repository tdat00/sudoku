'use strict';

/*
 * MS18d Phase C1 task-owned STAND-IN support: synthetic facts for the readiness of policy A (counter
 * readings of os.cpus(), process snapshots of readiness-probe.ps1, a fake host binding), so that the tests
 * of the pure decisions, of the controller and of the merger drive the real code over invented, fully
 * controlled data. Nothing here measures anything on the machine; every number is invented by the test.
 */
const core = require('./readiness-core.js');
const journals = require('./journals.js');

const T0 = 1800000000000;
const HEAD = 'a'.repeat(40);
const BASE = 'b'.repeat(40);

/** The invented host as a journal entry's `host` (the .NET time with its zone, the CIM time in UTC). */
const HOST_FACTS = Object.freeze({ pid: 4242, dotNetStartTime: '2026-01-01T07:00:00.1234567+07:00',
  cimCreationDateUtcMicroseconds: '2026-01-01T00:00:00.123456Z', parentPid: 4000,
  executablePath: 'C:\\fake\\copilot.exe' });

/** The tuple readiness compares a live process with, for the first binding `host-1` of the invented host. */
const HOST = Object.freeze({ bindingId: 'host-1', pid: 4242, parentPid: 4000,
  netStartUtc: '2026-01-01T00:00:00.1234567Z', cimCreationUtc: '2026-01-01T00:00:00.123456Z',
  exePath: 'C:\\fake\\copilot.exe' });

/** The facts the probe would read for `binding` (found), with overrides. ProcessName is only diagnostic. */
function hostFacts(binding, over) {
  return Object.assign({ found: true, pid: binding.pid, parentPid: binding.parentPid, name: 'copilot.exe',
    exePath: binding.exePath, netStartUtc: binding.netStartUtc, cimCreationUtc: binding.cimCreationUtc,
    displayName: 'copilot.exe.old-1-2', error: null }, over || {});
}

/** The evidence file text of one observation and its journal entry (sha256 of the LF-normalized text). */
function bindingEntry(o) {
  const x = o || {};
  const id = x.bindingId || 'host-1';
  const host = Object.assign({}, HOST_FACTS, x.host || {});
  const text = JSON.stringify({ schema: 'ms18d-c-host-observation-1', ok: true, host,
    observedAt: '2026-01-02T10:00:00.000+07:00', diagnostics: { displayName: 'copilot.exe' } }, null, 2) +
    '\n';
  const entry = { bindingId: id, replaces: x.replaces === undefined ? null : x.replaces, host,
    observedAt: '2026-01-02T10:00:00.000+07:00',
    evidence: { file: journals.EVIDENCE_DIR + id + '.json', sha256: journals.normalizedSha256(text) },
    ref: 'SA2 ruling ' + id + '; SA1 concurs', at: '2026-01-02T10:05:00.000+07:00' };
  return { entry: Object.assign(entry, x.over || {}), evidenceText: x.evidenceText || text };
}

const ruling = (chunkId, heldRunId, over) => Object.assign({ chunkId, heldRunId, allowAttempt: 2,
  ref: 'SA2 ruling for ' + heldRunId, at: '2026-01-02T12:00:00.000+07:00' }, over || {});

/**
 * Committed journals of an invented repository: `bindings` = options of the binding entries in order (each
 * replaces the prior one), `rulings` = ruling objects, `baseBindings` / `baseRulings` = how many lines of
 * each were committed at the campaign base (default: the first binding and no ruling). `rawBindings` /
 * `rawRulings` replace a journal text outright (a malformed line). Returns the committed maps, a fake
 * `git`, and the readers of the two states.
 */
function journalWorld(o) {
  const x = o || {};
  const list = x.bindings || [{}];
  const made = [];
  list.forEach((b, i) => made.push(bindingEntry(Object.assign({
    replaces: i === 0 ? null : made[i - 1].entry.bindingId, bindingId: 'host-' + (i + 1) }, b))));
  const rulings = x.rulings || [];
  const text = (lines) => lines.length === 0 ? '' : lines.join('\n') + '\n';
  const bindingLines = made.map((m) => JSON.stringify(m.entry));
  const rulingLines = rulings.map((r) => JSON.stringify(r));
  const committed = {};
  committed[journals.BINDINGS_REL] = x.rawBindings !== undefined ? x.rawBindings : text(bindingLines);
  committed[journals.RULINGS_REL] = x.rawRulings !== undefined ? x.rawRulings : text(rulingLines);
  made.forEach((m) => {
    if (x.noEvidence !== true) committed[m.entry.evidence.file] = m.evidenceText;
  });
  const nb = x.baseBindings === undefined ? Math.min(1, made.length) : x.baseBindings;
  const nr = x.baseRulings === undefined ? 0 : x.baseRulings;
  const committedBase = {};
  committedBase[journals.BINDINGS_REL] = x.baseRawBindings !== undefined ? x.baseRawBindings
    : text(bindingLines.slice(0, nb));
  committedBase[journals.RULINGS_REL] = text(rulingLines.slice(0, nr));
  const git = (args) => {
    if (args[0] !== 'show') throw new Error('the fixture knows no git ' + args[0]);
    const m = /^([^:]+):(.*)$/.exec(args[1]);
    const map = m[1] === BASE ? committedBase : committed;
    if (map[m[2]] === undefined) throw new Error('not committed');
    return map[m[2]];
  };
  const base = x.noBase === true ? null : BASE;
  return { head: HEAD, base, committed, committedBase, git, entries: made.map((m) => m.entry),
    hostBinding: () => journals.hostBindingState(git, HEAD, base),
    rulings: () => journals.rulingsState(git, HEAD, base),
    // what the merger reads: the entries and lines of the valid committed chain
    chain: () => {
      const j = journals.loadJournal({ git, head: HEAD, base, rel: journals.BINDINGS_REL,
        parse: journals.parseBindings });
      return { entries: j.entries, lines: j.lines, problems: j.problems };
    } };
}

/**
 * Six counter readings of `cpus` logical processors for five intervals whose busy cores are `busy` (one value
 * per interval, 0..cpus): the busy cores fill processors one after the other. `elapsedMs` per interval.
 */
function readings(cpus, busy, elapsedMs) {
  const step = elapsedMs || 1000;
  const list = [];
  let state = [];
  for (let i = 0; i < cpus; i++) state.push({ user: 100000, nice: 0, sys: 50000, idle: 900000, irq: 100 });
  list.push({ atMs: T0, hrNs: 5e12, cpus: state.map((c) => Object.assign({}, c)) });
  busy.forEach((cores, k) => {
    let left = cores;
    state = state.map((c) => {
      const f = Math.max(0, Math.min(1, left));
      left -= f;
      const used = step * f;
      return { user: c.user + used / 2, nice: 0, sys: c.sys + used / 2, idle: c.idle + step - used,
        irq: c.irq };
    });
    list.push({ atMs: T0 + (k + 1) * step, hrNs: 5e12 + (k + 1) * step * 1e6,
      cpus: state.map((c) => Object.assign({}, c)) });
  });
  return list;
}

/** One process row of a snapshot. */
const proc = (pid, name, createdMs, cpuMs, ppid) => ({ pid, ppid: ppid === undefined ? 1 : ppid, name,
  createdMs, cpuMs });

/**
 * A pair of snapshots `windowMs` apart (default 8000). Always present: idle (pid 0), System, the host, the
 * wrapper (5000), the controller (5001) and a quiet bystander (310); the first probe (7001) is in the first
 * snapshot only, the second (7002) in the second only. Options: { binding, hostFacts, hostMissing,
 * afterHost, windowMs, rates: { 'pid:createdMs': CPU-s per second between the two }, extra: rows in both,
 * vanish: [pids missing from the second], afterOnly: rows only in the second }.
 */
function snapshots(o) {
  const opt = o || {};
  const window = opt.windowMs || 8000;
  const binding = opt.binding || HOST;
  const rates = opt.rates || {};
  const hostBlock = opt.hostMissing ? { found: false, pid: binding.pid }
    : (opt.hostFacts || hostFacts(binding));
  const base = [proc(0, 'System Idle Process', T0 - 9e6, 9e8), proc(4, 'System', T0 - 9e6, 5000, 0),
    proc(binding.pid, 'copilot.exe', T0 - 8e6, 100000, binding.parentPid),
    proc(5000, 'pwsh.exe', T0 - 100000, 2000), proc(5001, 'node.exe', T0 - 90000, 800, 5000),
    proc(310, 'bystander.exe', T0 - 7e6, 1000)].concat(opt.extra || []);
  const beforeAt = T0 - 500;
  const afterAt = beforeAt + window;
  const frame = (at, selfPid, selfCreatedMs, host, processes) => ({ schema: 'ms18d-c-snapshot-1', ok: true,
    error: null, queryStartMs: at - 100, queryEndMs: at + 100, takenAtMs: at, selfPid, selfCreatedMs, host,
    processes });
  const gone = new Set(opt.vanish || []);
  const before = frame(beforeAt, 7001, T0 - 1500, hostBlock,
    base.map((p) => Object.assign({}, p)).concat([proc(7001, 'pwsh.exe', T0 - 1500, 700, 5001)]));
  const after = frame(afterAt, 7002, afterAt - 1500, opt.afterHost !== undefined ? opt.afterHost : hostBlock,
    base.filter((p) => !gone.has(p.pid)).map((p) => Object.assign({}, p, {
      cpuMs: p.cpuMs + (rates[p.pid + ':' + p.createdMs] || 0) * window })).concat(
      [proc(7002, 'pwsh.exe', afterAt - 1500, 700, 5001)], opt.afterOnly || []));
  return { before, after };
}

/** The full input of core.decideReadiness for a quiet, admitted run; `over.input` replaces parts. */
function quietInput(over) {
  const o = over || {};
  const pair = snapshots(o.snapshotOptions);
  const input = {
    policy: { selector: 'S-OD15', choice: 'A', name: 'MS18d-GP-host-active' },
    expected: Object.assign({}, HOST), bindingSource: 'journal entry host-1', logicalCpus: 16,
    readings: readings(16, [0.2, 0.3, 0.25, 0.4, 0.1]), before: pair.before, after: pair.after,
    owned: [{ role: 'wrapper', pid: 5000, createdMs: T0 - 100000 },
      { role: 'controller', pid: 5001, createdMs: T0 - 90000 },
      { role: 'readiness-probe', pid: 7001, createdMs: T0 - 1500 },
      { role: 'readiness-probe', pid: 7002, createdMs: pair.after.selfCreatedMs }],
    budget: { elapsedMs: 8200, queryDurationsMs: [600, 650] }
  };
  return Object.assign(input, o.input || {});
}

/** The decision of a quiet admitted run. */
const quietDecision = (over) => core.decideReadiness(quietInput(over));

/**
 * The full readiness record of a quiet admitted run (readiness.json) with its raw snapshots. The binding
 * reference is that of the committed journal of `over.world` (default: the first binding `host-1`).
 */
function readinessRecord(over) {
  const input = quietInput(over);
  const decision = core.decideReadiness(input);
  const world = (over && over.world) || journalWorld();
  const state = world.hostBinding();
  const record = { schema: 'ms18d-c-readiness-record-1', policy: decision.policy, requestedAtMs: T0,
    startedAtMs: T0, endedAtMs: T0 + 8200, standin: false,
    inputs: { expected: input.expected, binding: state.reference, bindingSource: input.bindingSource,
      logicalCpus: input.logicalCpus, readings: input.readings, owned: input.owned, budget: input.budget,
      queries: [{ ok: true, timedOut: false, error: null, durationMs: 600 },
        { ok: true, timedOut: false, error: null, durationMs: 650 }] },
    snapshots: { before: null, after: null }, decision };
  return { input, decision, record, before: input.before, after: input.after, world };
}

module.exports = { T0, HEAD, BASE, HOST, HOST_FACTS, hostFacts, bindingEntry, ruling, journalWorld, readings,
  proc, snapshots, quietInput, quietDecision, readinessRecord };
