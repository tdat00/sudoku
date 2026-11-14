'use strict';

/*
 * Host side of the IG-S03 audit (test side, provisional (pre-freeze)): a session of three private engine instances
 * (plain native, native with audit annotations, scoped prototype with audit annotations; see scoped-audit-worker.cjs)
 * driven from the responsive harness host, the audit of one saved puzzle (unlimited parity and injected count failures
 * at selected ordinals) and the synthetic scenarios with the deliberately failing mutations of the focused tests.
 * Audited wall time is not a speed measurement.
 */
const path = require('path');
const C = require('./common.cjs');
const AU = require('./scoped-audit.cjs');
const SM = require('./scoped-solver.cjs');

const HarnessError = C.HarnessError;
const AUDIT_WORKER = path.join(__dirname, 'scoped-audit-worker.cjs');
const ROLES = Object.freeze({
  plain: Object.freeze([]),
  ref: Object.freeze(['scoped-audit']),
  scoped: Object.freeze(['scoped-solver', 'scoped-audit'])
});
const ROLE_NAMES = Object.freeze(['plain', 'ref', 'scoped']);
const SETS = Object.freeze(['canonical', 'floor', 'oracle', 'proposal']);
// A harness-level guard for one audit message (not an application, qualification or research request guard).
const OP_GUARD_MS = 120000;
// Starting the three engine instances is bounded separately: a worker that is not ready in this time stops the command.
const READY_GUARD_MS = 40000;
const MAX_ORDINALS = 12;

class AuditTimeout extends Error {
  constructor(scope, role, op) {
    super('audit op ' + op + ' on ' + role + ' did not answer before the ' + scope + ' guard');
    this.name = 'AuditTimeout';
    this.scope = scope;
  }
}

// The workers did not start: nothing can be audited, so the command stops (unsupported source) instead of retrying.
class AuditStartup extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuditStartup';
    this.code = 'audit-worker-start';
  }
}

class AuditSession {
  constructor(host) {
    this.host = host;
    this.workers = null;
    this.ready = {};
    this.progress = {};
    this.opening = null;
  }

  deadline() {
    return Math.min(this.host.clock() + OP_GUARD_MS, this.host.commandTimerAt);
  }

  scopeOf(deadlineAt) {
    return deadlineAt >= this.host.commandTimerAt ? 'command' : 'request';
  }

  // Memoised: the first caller opens the three workers while the others wait for the same promise. (A second consumer of
  // a worker's channel would drop its `ready` message.)
  open() {
    if (this.opening === null) this.opening = this.openOnce();
    return this.opening;
  }

  async openOnce() {
    const host = this.host;
    const original = host.workerFile;
    const workers = {};
    host.workerFile = AUDIT_WORKER;
    try {
      ROLE_NAMES.forEach((role) => {
        workers[role] = host.spawn({ role: 'audit', auditRole: role, adapterIds: ROLES[role].slice(),
          expectedFingerprint: host.runtimeFingerprint, noEngine: false, wantCatalogue: false });
        workers[role].worker.on('message', (m) => {
          if (m && m.type === 'progress') this.progress[role] = m;
        });
      });
    } finally {
      host.workerFile = original;
    }
    this.workers = workers;
    const deadlineAt = Math.min(host.clock() + READY_GUARD_MS, host.commandTimerAt);
    const scope = this.scopeOf(deadlineAt);
    const events = await Promise.all(ROLE_NAMES.map((role) => workers[role].channel.next(['ready', 'fatal'],
      deadlineAt, scope)));
    events.forEach((ev, i) => {
      const role = ROLE_NAMES[i];
      if (ev.kind === 'message' && ev.msg.type === 'ready') {
        this.ready[role] = ev.msg;
      } else if (ev.kind === 'timeout') {
        throw new AuditStartup('the audit worker ' + role + ' was not ready before the ' + ev.scope + ' guard (last progress: ' +
          JSON.stringify(this.progress[role] || null) + ')');
      } else {
        const error = ev.kind === 'message' ? ev.msg.error : ev.error;
        throw new AuditStartup('the audit worker ' + role + ' failed to start: ' + (error ? error.message : ev.kind) +
          (error && error.stack ? ' | ' + error.stack : ''));
      }
    });
  }

  async call(role, job) {
    await this.open();
    const w = this.workers[role];
    w.worker.postMessage({ type: 'job', job: job });
    const deadlineAt = this.deadline();
    const ev = await w.channel.next(['audit-result', 'fatal'], deadlineAt, this.scopeOf(deadlineAt));
    if (ev.kind === 'message' && ev.msg.type === 'audit-result') return ev.msg.result;
    if (ev.kind === 'timeout') throw new AuditTimeout(ev.scope, role, job.op);
    const error = ev.kind === 'message' ? ev.msg.error : ev.error;
    throw new HarnessError(error && error.code ? error.code : 'audit-worker', 'audit op ' + job.op + ' on ' + role +
      ' failed: ' + (error ? error.message + (error.stack ? ' | ' + error.stack : '') : ev.kind));
  }

  async all(roles, job) {
    return Promise.all(roles.map((role) => this.call(role, job)));
  }

  async close() {
    if (this.opening !== null) {
      try {
        await this.opening;
      } catch (err) {
        // a failed start: the workers are terminated below all the same
      }
    }
    if (this.workers === null) return;
    const list = ROLE_NAMES.map((role) => this.workers[role].worker);
    this.workers = null;
    this.opening = null;
    await Promise.all(list.map((w) => this.host.terminateWorker(w)));
  }

  adapterInfo() {
    const out = {};
    ROLE_NAMES.forEach((role) => {
      const r = this.ready[role];
      out[role] = r ? { adapterIds: r.adapterIds, adapterHashes: r.adapterHashes, hooks: r.hooks,
        transforms: r.transforms, loadMs: r.loadMs } : null;
    });
    return out;
  }
}

// --- one saved puzzle ---------------------------------------------------------------------------------------------

function ceilingPlan(setName, variantId, total, boundaries) {
  let form = null;
  if (setName === 'oracle') form = 'objective';
  else if (setName === 'canonical' && variantId === 'killer') form = 'killer';
  if (form === null) return [];
  const limit = AU.CEILINGS[form];
  const items = [];
  const anchor = boundaries.firstMulti || boundaries.first;
  const ks = [total];
  if (anchor) ks.unshift(anchor.ord0 + Math.ceil(anchor.m / 2));
  ks.forEach(function (k) {
    if (k >= 1 && k <= total && items.every(function (i) { return i.k !== k; })) {
      items.push({ set: setName, form: form, k: k, natural: false });
    }
  });
  if (total > limit) items.push({ set: setName, form: form, k: 0, natural: true });
  return items;
}

function compactRun(run) {
  return { completed: run.completed, code: run.error ? run.error.code : null, args: run.error ? run.error.args : null,
    ordinal: run.ordinal, token: run.token || null, steps: run.steps === undefined ? null : run.steps,
    meter: run.meter === undefined ? null : run.meter, boundaryNodesOk: run.boundaryNodesOk === undefined ? null :
      run.boundaryNodesOk };
}

function skipSummary(stats) {
  const finders = {};
  Object.keys(stats.finders).forEach(function (id) {
    const row = stats.finders[id];
    finders[id] = Object.assign({}, row);
  });
  return { finders: finders, solve: stats.solve, fallbackReasons: stats.fallbackReasons,
    violations: stats.violations };
}

/**
 * Audits one saved puzzle: for each of the four solver sets the unlimited runs of the three instances must agree
 * (check count, check-site token hash and checkpoints, steps, rating, final state), then the injected failures at the
 * selected ordinals must fail at the same ordinal and site with the same native error, steps and guard state.
 */
async function auditPuzzle(session, puzzle) {
  const sets = puzzle.sets || SETS;
  const base = { puzzleKey: puzzle.puzzleKey, wire: puzzle.wire };
  const phase1 = await session.all(ROLE_NAMES, Object.assign({ op: 'phase1', sets: sets.slice() }, base));
  const byRole = { plain: phase1[0], ref: phase1[1], scoped: phase1[2] };
  const out = { puzzleKey: puzzle.puzzleKey, variantId: byRole.ref.variantId, level: byRole.ref.level, sets: {},
    problems: [] };
  const plan = [];
  sets.forEach(function (name) {
    const ref = byRole.ref.sets[name];
    const scoped = byRole.scoped.sets[name];
    const plain = byRole.plain.sets[name];
    const unlimited = AU.compareUnlimited(ref, scoped, plain);
    const boundaries = scoped.skips || {};
    const ordinals = AU.selectOrdinals(ref.checks, boundaries, MAX_ORDINALS);
    const row = {
      set: name, checks: ref.checks, steps: ref.steps, status: ref.status, tokenHash: ref.hash,
      stepsDigest: ref.stepsDigest, reportDigest: ref.reportDigest, first: ref.first, last: ref.last,
      checkpoints: ref.checkpoints.length, unlimited: unlimited,
      boundaries: AU.boundaryLabels(ref.checks, boundaries),
      skipped: boundaries.count === undefined ? null : { scopes: boundaries.count, virtualNodeChecks:
        boundaries.virtualNodeChecks, crossing: boundaries.crossing, multi: boundaries.multi,
      distinctResidues: boundaries.distinctResidues },
      ordinals: ordinals, failures: [], stats: skipSummary(scoped.stats)
    };
    if (scoped.stats.violations.count > 0) {
      row.unlimited.equal = false;
      row.unlimited.problems.push('scope audit violations: ' + JSON.stringify(scoped.stats.violations.kinds));
    }
    ordinals.forEach(function (k) { plan.push({ set: name, form: 'native', k: k, natural: false }); });
    ceilingPlan(name, byRole.ref.variantId, ref.checks, boundaries).forEach(function (item) { plan.push(item); });
    out.sets[name] = row;
  });
  // A mismatch is re-captured: the first differing checkpoint window of the reference and the scoped sequence.
  for (const name of sets) {
    const row = out.sets[name];
    if (row.unlimited.equal) continue;
    const ref = byRole.ref.sets[name];
    const scoped = byRole.scoped.sets[name];
    const win = AU.firstDifferingWindow(ref.checkpoints, scoped.checkpoints, Math.max(ref.checks, scoped.checks));
    if (win !== null) {
      const cap = { set: name, from: win.from, to: win.to };
      const again = await session.all(['ref', 'scoped'], Object.assign({ op: 'phase1', sets: [name], capture: cap },
        base));
      row.mismatch = AU.mismatchContext(again[0].sets[name].captured, again[1].sets[name].captured, win.from);
      row.mismatchWindow = win;
    }
  }
  const phase2 = await session.all(ROLE_NAMES, Object.assign({ op: 'phase2', plan: plan }, base));
  plan.forEach(function (item, i) {
    const ref = phase2[1].runs[i];
    const scoped = phase2[2].runs[i];
    const plain = phase2[0].runs[i];
    const cmp = AU.compareFailure(ref, scoped, plain);
    out.sets[item.set].failures.push({ form: item.form, k: item.k, natural: item.natural, equal: cmp.equal,
      problems: cmp.problems, reference: compactRun(ref), scoped: compactRun(scoped) });
  });
  sets.forEach(function (name) {
    const row = out.sets[name];
    if (!row.unlimited.equal) out.problems.push(name + ': unlimited run differs: ' + row.unlimited.problems[0]);
    row.failures.forEach(function (f) {
      if (!f.equal) out.problems.push(name + ' k=' + f.k + ' ' + f.form + ': ' + f.problems[0]);
    });
    row.failuresEqual = row.failures.every(function (f) { return f.equal; });
    row.failedAsInjected = row.failures.filter(function (f) { return !f.natural && !f.reference.completed; }).length;
  });
  out.verdict = out.problems.length === 0 ? 'parity-ok' : 'parity-failed';
  return out;
}

// --- synthetic scenarios and the deliberately failing mutations ---------------------------------------------------

function compareScenario(ref, scoped, plain) {
  const problems = [];
  const same = function (name, a, b) {
    if (C.canonicalJson(a) !== C.canonicalJson(b)) problems.push(name + ' differs');
  };
  same('checks', ref.checks, scoped.checks);
  same('tokenHash', ref.hash, scoped.hash);
  same('checkpoints', ref.checkpoints, scoped.checkpoints);
  same('first window', ref.first, scoped.first);
  same('last window', ref.last, scoped.last);
  same('findings', ref.findingsDigest, scoped.findingsDigest);
  if (plain) {
    same('plain checks', plain.checks, ref.checks);
    same('plain findings', plain.findingsDigest, ref.findingsDigest);
  }
  if (scoped.stats && scoped.stats.violations.count > 0) {
    problems.push('scope audit violations ' + JSON.stringify(scoped.stats.violations.kinds));
  }
  return { equal: problems.length === 0, problems: problems };
}

function sumFinderCounter(stats, name) {
  return Object.keys(stats.finders).reduce(function (n, id) { return n + stats.finders[id][name]; }, 0);
}

async function runSynthetic(session, options) {
  const plan = AU.syntheticPlan();
  const first = [];
  const refs = new Map();
  for (const spec of plan) {
    const r = await session.all(ROLE_NAMES, { op: 'synthetic', spec: spec });
    const cmp = compareScenario(r[1], r[2], r[0]);
    refs.set(spec.id, { plain: r[0], ref: r[1] });
    first.push({ id: spec.id, variantId: spec.variantId, seed: spec.seed, initialStateHash: spec.initialStateHash,
      checks: r[1].checks, tokenHash: r[1].hash, findingsDigest: r[1].findingsDigest, positives: r[1].positives,
      equal: cmp.equal, problems: cmp.problems,
      coverage: r[2].skips ? { skippedScopes: r[2].skips.count, crossing: r[2].skips.crossing, multi: r[2].skips.multi,
        distinctResidues: r[2].skips.distinctResidues } : null,
      counters: { skipped: sumFinderCounter(r[2].stats, 'skippedScopes'),
        virtualEntryChecks: sumFinderCounter(r[2].stats, 'virtualEntryChecks'),
        virtualNodeChecks: sumFinderCounter(r[2].stats, 'virtualNodeChecks'),
        enumNodesSkipped: sumFinderCounter(r[2].stats, 'enumNodesSkipped'),
        enumNodesReal: sumFinderCounter(r[2].stats, 'enumNodesReal') } });
  }
  const mutations = [];
  for (const mutation of SM.MUTATIONS) {
    await session.call('scoped', { op: 'configure', mutation: mutation });
    const differing = [];
    let firstProblem = null;
    for (const spec of plan) {
      const m = await session.call('scoped', { op: 'synthetic', spec: spec });
      const cmp = compareScenario(refs.get(spec.id).ref, m, null);
      if (!cmp.equal) {
        differing.push(spec.id);
        if (firstProblem === null) firstProblem = cmp.problems[0];
      }
    }
    let realSolve = null;
    if (options && options.mutationPuzzle) {
      const p = options.mutationPuzzle;
      const base = { puzzleKey: p.puzzleKey + '#mut', wire: p.wire, sets: ['canonical'] };
      const refRun = await session.call('ref', Object.assign({ op: 'phase1' }, base));
      const mutRun = await session.call('scoped', Object.assign({ op: 'phase1' }, base));
      const cmp = AU.compareUnlimited(refRun.sets.canonical, mutRun.sets.canonical, null);
      realSolve = { puzzleKey: p.puzzleKey, detected: !cmp.equal, problem: cmp.problems[0] || null };
    }
    mutations.push({ mutation: mutation, detected: differing.length > 0, scenariosDiffering: differing,
      firstProblem: firstProblem, realSolve: realSolve });
  }
  // The real prototype is restored before anything is measured: no mutation, and the first scenario is equal again.
  await session.call('scoped', { op: 'configure', mutation: null });
  const again = await session.call('scoped', { op: 'synthetic', spec: plan[0] });
  const restored = compareScenario(refs.get(plan[0].id).ref, again, null);
  const coverage = {
    scenarios: first.length,
    skippedScopes: first.reduce(function (n, s) { return n + s.counters.skipped; }, 0),
    crossingScopes: first.reduce(function (n, s) { return n + (s.coverage ? s.coverage.crossing : 0); }, 0),
    multiCheckScopes: first.reduce(function (n, s) { return n + (s.coverage ? s.coverage.multi : 0); }, 0),
    maxDistinctResidues: first.reduce(function (n, s) { return Math.max(n, s.coverage ? s.coverage.distinctResidues : 0); },
      0),
    virtualNodeChecks: first.reduce(function (n, s) { return n + s.counters.virtualNodeChecks; }, 0),
    positives: first.reduce(function (n, s) { return n + s.positives; }, 0)
  };
  const problems = [];
  first.forEach(function (s) { if (!s.equal) problems.push(s.id + ': ' + s.problems[0]); });
  mutations.forEach(function (m) {
    if (!m.detected) problems.push('mutation ' + m.mutation + ' was NOT detected by the focused tests');
    if (m.realSolve && !m.realSolve.detected && m.mutation === 'stale-peers') {
      problems.push('mutation stale-peers was not detected on the real solve');
    }
  });
  if (!restored.equal) problems.push('the restored prototype differs from the reference: ' + restored.problems[0]);
  if (coverage.crossingScopes === 0 || coverage.maxDistinctResidues < 8) {
    problems.push('the synthetic states did not cross the cadence with several incoming residues');
  }
  return { scenarios: first, mutations: mutations, restored: restored, coverage: coverage, problems: problems,
    verdict: problems.length === 0 ? 'pass' : 'fail' };
}

module.exports = { AUDIT_WORKER, ROLES, ROLE_NAMES, SETS, OP_GUARD_MS, READY_GUARD_MS, MAX_ORDINALS, AuditTimeout,
  AuditStartup, AuditSession, auditPuzzle, runSynthetic, ceilingPlan, compareScenario, compactRun };
