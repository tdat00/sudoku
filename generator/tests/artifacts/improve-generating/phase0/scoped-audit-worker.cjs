'use strict';

/*
 * Worker-thread entry of the IG-S03 audit (test side, provisional (pre-freeze)): one private engine instance in one of
 * three roles, loaded exactly like the harness worker (same loader, same fingerprint check):
 *   plain   the unpatched native engine (adapters: none): counts checks and returns steps/report digests;
 *   ref     the native engine with the audit annotations (adapter scoped-audit): hashes every logical check site;
 *   scoped  the S3 prototype with the same annotations (adapters scoped-solver + scoped-audit), re-verifying every skipped
 *           scope natively and shadow-checking every invalidation.
 * Ops (one message each, answered with `audit-result`): configure, phase1 (unlimited runs), phase2 (injected failures),
 * synthetic (a scripted scenario of subset finds with state mutations), stats. Test-only; never part of a timing run.
 */
const { parentPort, workerData, isMainThread } = require('worker_threads');

if (isMainThread || !parentPort) throw new Error('scoped-audit-worker.cjs is a worker_threads entry point');

const C = require('./common.cjs');
const L = require('./loader.cjs');
const AU = require('./scoped-audit.cjs');

const data = workerData;
const role = data.auditRole;
let SG = null;
let observer = null;
const puzzles = new Map();

function post(message) {
  parentPort.postMessage(message);
}

function failure(err) {
  return { code: err && err.code !== undefined ? err.code : null, name: err && err.name ? err.name : null,
    message: String(err && err.message !== undefined ? err.message : err),
    stack: err && err.stack ? String(err.stack).split('\n').slice(0, 6).join('\n') : null };
}

function puzzleOf(job) {
  let p = puzzles.get(job.puzzleKey);
  if (p === undefined) {
    const r = SG.pipeline.fromWire(job.wire);
    p = { model: r.model, givens: r.givens, level: r.config.difficulty, variantId: r.config.variantId };
    puzzles.clear();
    puzzles.set(job.puzzleKey, p);
  }
  return p;
}

function setsOf(p) {
  const spec = SG.difficulty.spec(p.level, p.model);
  return {
    canonical: { allowedTechniques: null, assumeUniqueness: true },
    floor: { allowedTechniques: spec.floorTechniques, assumeUniqueness: true },
    oracle: { allowedTechniques: spec.allowedTechniques, assumeUniqueness: false },
    proposal: { allowedTechniques: spec.allowedTechniques.filter(function (id) {
      return SG.techniques.get(id).group !== 'chain';
    }), assumeUniqueness: true }
  };
}

function reportDigests(report) {
  const state = report.state;
  return {
    stepsDigest: C.digestOf(report.steps),
    reportDigest: C.digestOf({ status: report.status, solved: report.solved, score: report.score,
      techniqueCounts: report.techniqueCounts, hardest: report.hardestTechnique,
      candidates: Array.from(state.candidates), value: Array.from(state.value),
      unsolvedCount: state.unsolvedCount, steps: report.steps.length })
  };
}

// One audited solve. `spec` = { form, k }; `capture` = { from, to } re-captures a window of tokens.
function solveOnce(p, setName, spec, capture) {
  const budget = AU.makeBudget(SG, observer, spec);
  if (observer !== null) observer.reset(capture ? { capture: capture } : undefined);
  const sets = setsOf(p);
  const options = Object.assign({ collectSteps: true, budget: budget }, sets[setName]);
  const kit = role === 'scoped' ? SG.__igSubsetKit : undefined;
  const started = performance.now();
  try {
    const report = SG.logicalSolver.solve(p.model, p.givens, options);
    const d = reportDigests(report);
    return Object.assign({ completed: true, ordinal: budget.count(), steps: report.steps.length,
      status: report.status, wallMs: performance.now() - started }, d);
  } catch (err) {
    const expected = AU.GUARD_CODES[spec.form];
    if (!(err instanceof SG.errors.GenerationError) || (spec.form !== 'observe' && err.code !== expected)) throw err;
    const token = observer !== null ? observer.lastTokenString() : null;
    const out = { completed: false, error: AU.errorFields(err), ordinal: budget.count(), token: token,
      steps: observer !== null ? observer.steps : null, wallMs: performance.now() - started };
    if (spec.form === 'killer') out.meter = budget.meter.spent;
    if (kit !== undefined && token !== null) {
      const m = /^subset-(unit|node):.*:n(\d+):s/.exec(token);
      if (m) out.boundaryNodesOk = kit.getNodes() === Number(m[2]);
    }
    return out;
  }
}

function phase1(job) {
  const p = puzzleOf(job);
  const out = { puzzleKey: job.puzzleKey, variantId: p.variantId, level: p.level, sets: {} };
  job.sets.forEach(function (name) {
    if (role === 'scoped') SG.__igScoped.reset();
    const run = solveOnce(p, name, { form: 'observe', k: 0 }, job.capture && job.capture.set === name ? job.capture : null);
    const row = { checks: run.ordinal, stepsDigest: run.stepsDigest, reportDigest: run.reportDigest,
      steps: run.steps, status: run.status, wallMs: run.wallMs };
    if (observer !== null) {
      const s = observer.summary();
      Object.assign(row, { hash: s.hash, first: s.first, last: s.last, checkpoints: s.checkpoints,
        captured: s.captured, skips: s.skips });
    }
    if (role === 'scoped') row.stats = SG.__igScoped.snapshot();
    out.sets[name] = row;
  });
  return out;
}

function phase2(job) {
  const p = puzzleOf(job);
  const out = { puzzleKey: job.puzzleKey, runs: [] };
  job.plan.forEach(function (item) {
    const run = solveOnce(p, item.set, { form: item.form, k: item.k }, null);
    out.runs.push(Object.assign({ set: item.set, form: item.form, k: item.k, natural: item.natural === true }, run));
  });
  return out;
}

// --- the synthetic scenario ---------------------------------------------------------------------------------------

function pickBit(mask, rand) {
  const bits = [];
  for (let d = 0; d < 32; d++) if ((mask & (1 << d)) !== 0) bits.push(d + 1);
  return bits.length === 0 ? 0 : bits[Math.floor(rand() * bits.length)];
}

function runScenario(spec) {
  const cfg = SG.pipeline.normalizeConfig({ variantId: spec.variantId, difficulty: 'nightmare', seed: 1, trace: 'off' });
  const model = SG.variants.get(spec.variantId).build(cfg.variantOptions, SG.rng.create(1).fork('model'));
  const n = model.cellCount;
  if (n !== spec.cells || model.digits !== spec.digits) {
    throw new C.HarnessError('unsupported-source', 'scenario ' + spec.id + ' expects ' + spec.cells + ' cells and ' +
      spec.digits + ' digits, the model has ' + n + ' and ' + model.digits);
  }
  const init = AU.initialMasks(spec);
  const rand = init.rand;
  const state = SG.model.initState(model);
  for (let c = 0; c < n; c++) state.candidates[c] = init.masks[c];
  if (observer !== null) observer.reset();
  const budget = AU.makeBudget(SG, observer, { form: 'observe', k: 0 });
  const ctx = SG.techniques.createContext(model, { budget: budget, assumeUniqueness: true });
  const ladder = SG.techniques.list().filter(function (t) { return t.group === 'subset'; });
  const solve = role === 'scoped' ? SG.__igScoped.begin(model, state, ladder, ctx) : null;
  const log = [];
  let positives = 0;
  for (let round = 0; round < spec.rounds; round++) {
    ladder.forEach(function (tech) {
      const found = tech.find(model, state, ctx);
      if (found !== null) positives++;
      log.push([tech.id, found === null ? null : [found.technique, found.cells, found.eliminations]]);
    });
    for (let m = 0; m < spec.mutations; m++) {
      const c = Math.floor(rand() * n);
      const kind = rand() < spec.placeShare ? 'place' : 'elim';
      let digit = pickBit(state.candidates[c], rand);
      if (digit === 0) continue;
      if (kind === 'place') {
        state.candidates[c] |= (1 << (digit - 1));
        SG.constraints.assign(model, state, c, digit);
        if (solve !== null) solve.applied({ placements: [[c, digit]], eliminations: [] });
      } else {
        SG.constraints.eliminate(model, state, c, digit);
        if (solve !== null) solve.applied({ placements: [], eliminations: [[c, digit]] });
      }
      log.push([kind, c, digit]);
    }
  }
  const out = { id: spec.id, checks: budget.count(), findingsDigest: C.digestOf(log), positives: positives,
    rounds: spec.rounds };
  if (observer !== null) {
    const s = observer.summary();
    Object.assign(out, { hash: s.hash, first: s.first, last: s.last, checkpoints: s.checkpoints, skips: s.skips });
  }
  if (role === 'scoped') out.stats = SG.__igScoped.snapshot();
  return out;
}

function handle(job) {
  try {
    let result;
    if (job.op === 'configure') {
      if (role !== 'scoped') throw new Error('configure is for the scoped role');
      SG.__igScoped.configure({ mutation: job.mutation === undefined ? undefined : job.mutation,
        verifySkips: job.verifySkips === undefined ? undefined : job.verifySkips });
      SG.__igScoped.reset();
      result = { configured: SG.__igScoped.snapshot().config };
    } else if (job.op === 'phase1') result = phase1(job);
    else if (job.op === 'phase2') result = phase2(job);
    else if (job.op === 'synthetic') {
      if (role === 'scoped') SG.__igScoped.reset();
      result = runScenario(job.spec);
    } else if (job.op === 'stats') result = role === 'scoped' ? SG.__igScoped.snapshot() : null;
    else throw new Error('unknown audit op ' + job.op);
    post({ type: 'audit-result', op: job.op, role: role, result: result });
  } catch (err) {
    post({ type: 'fatal', error: failure(err) });
  }
}

function start() {
  const began = process.hrtime.bigint();
  try {
    post({ type: 'progress', stage: 'worker-started', role: role });
    const prepared = L.prepareLoad({ repoRoot: data.repoRoot, adapterIds: data.adapterIds || [],
      expectedFingerprint: data.expectedFingerprint });
    post({ type: 'progress', stage: 'prepared', role: role });
    L.executePlan(prepared.plan, function (code, filename) {
      post({ type: 'progress', stage: 'script', file: String(filename).split(/[\\/]/).pop() });
      return L.runInThisContext(code, filename);
    });
    post({ type: 'progress', stage: 'engine-loaded', role: role });
    SG = globalThis.SG;
    if (!SG) throw new C.HarnessError('capability-missing', 'the engine did not load');
    observer = SG.__igAudit !== undefined ? SG.__igAudit : null;
    const expectScoped = role === 'scoped';
    const expectAudit = role !== 'plain';
    if (expectScoped !== (SG.__igScoped !== undefined) || expectAudit !== (observer !== null)) {
      throw new C.HarnessError('unsupported-source', 'role ' + role + ' does not have its adapters');
    }
    if (role === 'scoped') SG.__igScoped.configure({ audit: observer, verifySkips: true, postStats: false });
    post({ type: 'ready', role: role, loadMs: Number(process.hrtime.bigint() - began) / 1e6,
      runtimeFingerprint: prepared.plan.fingerprint, adapterIds: prepared.plan.adapterIds,
      adapterHashes: prepared.plan.adapterHashes,
      transforms: prepared.plan.transforms.map(function (t) {
        return { id: t.id, file: t.file, beforeTextHash: t.beforeTextHash, afterTextHash: t.afterTextHash };
      }),
      hooks: { scoped: SG.__igScoped !== undefined, audit: observer !== null,
        subsetKit: SG.__igSubsetKit !== undefined, basicKit: SG.__igBasicKit !== undefined } });
  } catch (err) {
    post({ type: 'fatal', error: failure(err) });
    return;
  }
  parentPort.on('message', function (message) {
    if (message && message.type === 'job') handle(message.job);
  });
}

start();
