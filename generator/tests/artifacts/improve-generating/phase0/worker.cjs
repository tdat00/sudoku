'use strict';

/*
 * Worker-thread entry of the phase-0 harness: one private engine instance. It reads the sources, checks them
 * against the fingerprint the host recorded, applies the requested adapters in memory, runs the scripts in this
 * thread's global, reports `ready` and then runs exactly one job. A request worker posts `decision` the moment the
 * engine returns; an interrupted worker posts nothing (the host records the timeout). The verifier is a separate,
 * unpatched instance. Test-only synthetic jobs exist only when the host says `testOnly`.
 */
const { parentPort, workerData, isMainThread } = require('worker_threads');

if (isMainThread || !parentPort) throw new Error('worker.cjs is a worker_threads entry point');

const C = require('./common.cjs');
const L = require('./loader.cjs');

const data = workerData;
let SG = null;

const REQUIRED_API = [
  'pipeline.run', 'pipeline.toWire', 'pipeline.fromWire', 'pipeline.normalizeConfig', 'pipeline.STEPS',
  'difficulty.rate', 'difficulty.requiredOf', 'difficulty.certifyFloor', 'difficulty.floorTechniques',
  'difficulty.tierTechniques', 'difficulty.LEVELS', 'difficulty.RATING_VERSION', 'difficulty.WEIGHTS',
  'difficulty.TABLE', 'dfs.countSolutions', 'model.isSolution', 'model.validate', 'variants.get', 'variants.list',
  'variants.cellCountOf', 'digger.defaultMaxAttempts', 'rng.create', 'budget.create', 'techniques.list',
  'symmetry.KINDS'
];

function missingApi(root) {
  return REQUIRED_API.filter(function (dotted) {
    let value = root;
    const parts = dotted.split('.');
    for (let i = 0; i < parts.length; i++) {
      if (value === undefined || value === null) return true;
      value = value[parts[i]];
    }
    return value === undefined || value === null;
  });
}

function failure(err) {
  return {
    code: err && err.code !== undefined ? err.code : null,
    name: err && err.name ? err.name : null,
    message: String(err && err.message !== undefined ? err.message : err),
    work: err && err.work !== undefined ? err.work : null
  };
}

function post(message) {
  parentPort.postMessage(message);
}

// What the current source says about itself: nothing about the current catalogue is assumed by the harness.
function discoverCatalogue(engine) {
  const variants = engine.variants.list().map(function (def) {
    const cells = engine.variants.cellCountOf(def);
    return {
      id: def.id,
      group: def.group || null,
      digits: def.digits === undefined ? null : def.digits,
      cellCount: cells,
      levels: Array.isArray(def.difficultySupport) ? def.difficultySupport.slice() : null,
      digStrategy: def.digStrategy || null,
      hasPostGenerate: typeof def.postGenerate === 'function',
      defaultMaxAttempts: engine.digger.defaultMaxAttempts(cells)
    };
  });
  const floors = {};
  variants.forEach(function (v) {
    floors[v.id] = {};
    (v.levels || []).forEach(function (level) {
      floors[v.id][level] = {
        floor: engine.difficulty.floorTechniques(level, { variantId: v.id }),
        tier: engine.difficulty.tierTechniques(level, { variantId: v.id })
      };
    });
  });
  const pick = function (tech) {
    return { id: tech.id, group: tech.group, order: tech.order, baseCost: tech.baseCost,
      assumesUniqueness: tech.assumesUniqueness === true };
  };
  const snapshot = {
    ratingVersion: engine.difficulty.RATING_VERSION,
    levels: engine.difficulty.LEVELS.slice(),
    scoring: engine.difficulty.SCORING || null,
    weights: Object.assign({}, engine.difficulty.WEIGHTS),
    table: engine.difficulty.TABLE.map(function (row) { return Object.assign({}, row); }),
    techniques: engine.techniques.list().map(pick),
    variants: variants,
    floors: floors,
    defaults: {
      pipelineDefaultMaxAttempts: engine.pipeline.DEFAULT_MAX_ATTEMPTS,
      pipelineSteps: engine.pipeline.STEPS.slice(),
      fullTraceMaxCells: engine.pipeline.FULL_TRACE_MAX_CELLS === undefined ? null :
        engine.pipeline.FULL_TRACE_MAX_CELLS,
      smallBoardCells: engine.digger.SMALL_BOARD_CELLS === undefined ? null : engine.digger.SMALL_BOARD_CELLS,
      capRatings: engine.digger.CAP_RATINGS === undefined ? null : engine.digger.CAP_RATINGS,
      shallowSearchRatings: engine.digger.SHALLOW_SEARCH_RATINGS === undefined ? null :
        engine.digger.SHALLOW_SEARCH_RATINGS,
      digOrders: engine.digger.ORDERS ? engine.digger.ORDERS.slice() : null,
      symmetryKinds: engine.symmetry.KINDS.slice()
    }
  };
  return { snapshot: snapshot, fingerprint: C.digestOf(snapshot) };
}

// Proof for the adapter check: a patched instance shows its hook and it equals the public function; a native one
// shows no hook at all.
function adapterProof(engine) {
  const hooks = engine.__igHooks;
  const proof = { hooksPresent: hooks !== undefined, exposed: hooks ? Object.keys(hooks).sort() : [],
    normalizeConfigEqual: null };
  if (hooks && typeof hooks.normalizeConfig === 'function') {
    const probe = { variantId: 'classic4', difficulty: 'veryEasy', seed: 1, trace: 'off' };
    proof.normalizeConfigEqual = C.canonicalJson(hooks.normalizeConfig(probe)) ===
      C.canonicalJson(engine.pipeline.normalizeConfig(probe));
  }
  return proof;
}

function emptyWire(engine, model) {
  return engine.pipeline.toWire({
    model: model, givens: [], solution: [], rating: null, exact: false, seed: 0, config: null, timings: {},
    attempts: 0, warnings: [], digLog: undefined, work: undefined
  }).model;
}

/**
 * Independent audit of a returned puzzle on this (unpatched) engine instance: solution and givens, structure,
 * a uniqueness count, the canonical rating and requiredness. Unknown stays null, never true.
 */
function validate(engine, wire, validationMs) {
  const verdict = { solutionValid: null, givensAgree: null, structureValid: null, unique: null,
    canonicalEqual: null, requirednessAgree: null, fresh: null, errors: [] };
  const note = function (where, err) {
    verdict.errors.push(where + ': ' + (err && err.code ? err.code + ' ' : '') +
      String(err && err.message !== undefined ? err.message : err));
  };
  let result;
  try {
    result = engine.pipeline.fromWire(wire);
  } catch (err) {
    verdict.structureValid = false;
    note('fromWire', err);
    return verdict;
  }
  const model = result.model;
  const givens = result.givens;
  const solution = result.solution;
  const cfg = result.config;
  const level = cfg.difficulty;
  const budget = function () { return engine.budget.create({ ms: validationMs }); };

  try {
    const checked = engine.model.validate(model, { solve: false });
    const def = engine.variants.get(cfg.variantId);
    const base = def.build(cfg.variantOptions, engine.rng.create(cfg.seed).fork('model'));
    let same;
    let killerProblems = null;
    if (cfg.variantId === 'killer') {
      // Killer adds one cage unit per cage of two or more cells: its own rule (killer-audit.cjs, author-approved)
      // replaces the units comparison below, which would reject every Killer puzzle.
      killerProblems = require('./killer-audit.cjs').structureProblems({ wireModel: wire.model,
        solution: wire.solution, rebuild: function (cages) {
          return emptyWire(engine, engine.killer.modelFromCages(cages));
        } });
      same = killerProblems.length === 0;
    } else if (typeof def.postGenerate === 'function') {
      const core = function (m) {
        return { cellCount: m.cellCount, digits: m.digits, units: m.units, rows: m.layout.rows, cols: m.layout.cols };
      };
      same = C.canonicalJson(core(base)) === C.canonicalJson(core(model));
    } else {
      same = C.canonicalJson(emptyWire(engine, base)) === C.canonicalJson(emptyWire(engine, model));
    }
    verdict.structureValid = checked.ok === true && same;
    if (!checked.ok) note('model.validate', { message: checked.errors.join('; ') });
    if (!same) {
      note('structure', { message: killerProblems !== null ? 'killer: ' + killerProblems.join('; ') :
        'the model differs from the variant rebuilt from the seed' });
    }
  } catch (err) {
    verdict.structureValid = false;
    note('structure', err);
  }

  try {
    verdict.solutionValid = engine.model.isSolution(model, solution) === true;
    let agree = givens.length === model.cellCount && solution.length === model.cellCount;
    for (let c = 0; agree && c < model.cellCount; c++) {
      if (givens[c] !== 0 && givens[c] !== solution[c]) agree = false;
      const fixed = model.fixedCells && model.fixedCells[c];
      if (fixed && fixed !== solution[c]) agree = false;
    }
    verdict.givensAgree = agree;
  } catch (err) {
    verdict.solutionValid = false;
    verdict.givensAgree = false;
    note('solution', err);
  }

  try {
    const count = engine.dfs.countSolutions(model, givens, 2, budget());
    verdict.unique = count === 1;
    if (count !== 1) note('unique', { message: 'solution count ' + count });
  } catch (err) {
    verdict.unique = null;
    note('unique', err);
  }

  try {
    const fresh = engine.difficulty.rate(model, givens, { budget: budget() });
    verdict.canonicalEqual = C.canonicalJson(fresh) === C.canonicalJson(result.rating);
    const required = engine.difficulty.requiredOf(fresh, level, model);
    let certified = null;
    if (required !== null && required.vacuous !== true) {
      certified = engine.difficulty.certifyFloor(model, givens, level, budget());
    }
    if (required === null) verdict.requirednessAgree = null;
    else verdict.requirednessAgree = required.vacuous === true ? true : certified.required === required.required;
    verdict.fresh = {
      solved: fresh.solved === true,
      level: fresh.level,
      score: fresh.score,
      hardestTechnique: fresh.hardestTechnique,
      required: required === null ? null : required.required,
      vacuous: required === null ? null : required.vacuous,
      shallow: required === null ? null : fresh.solved === true && fresh.level === level && required.required !== true
    };
  } catch (err) {
    verdict.canonicalEqual = null;
    note('rating', err);
  }
  return verdict;
}

function pipelineRequest(job) {
  const started = performance.now();
  let result;
  try {
    result = SG.pipeline.run(job.config, null);
  } catch (err) {
    post({ type: 'error', error: failure(err) });
    return;
  }
  const elapsed = performance.now() - started;
  post({ type: 'decision', wire: SG.pipeline.toWire(result), engineElapsedMs: elapsed });
}

function verifyJob(job) {
  try {
    post({ type: 'validation', verdict: validate(SG, job.wire, job.validationMs || 60000) });
  } catch (err) {
    post({ type: 'fatal', error: failure(err) });
  }
}

// A tiny hand-made classic4 puzzle (the solution with two cells removed) in the wire form a request returns, so the
// verifier can be proven without running the generator. Test-only.
function handmadeWire() {
  const model = SG.variants.get('classic4').build({}, SG.rng.create(1).fork('model'));
  const solution = SG.dfs.solve(model, new Int32Array(model.cellCount), null, null);
  const givens = Int32Array.from(solution);
  givens[0] = 0;
  givens[5] = 0;
  const rating = SG.difficulty.rate(model, givens);
  const config = SG.pipeline.normalizeConfig({ variantId: 'classic4', difficulty: 'veryEasy', seed: 1, trace: 'off' });
  return SG.pipeline.toWire({ model: model, givens: givens, solution: solution, rating: rating, exact: false,
    seed: 1, config: config, timings: {}, attempts: 1, warnings: [], digLog: [], work: undefined });
}

function syntheticJob(job) {
  if (job.kind === 'selftest-busy') {
    post({ type: 'busy-started' });
    let x = 0;
    for (;;) x = (x + 1) | 0;
  } else if (job.kind === 'selftest-echo') {
    const until = performance.now() + (job.spinMs || 0);
    let x = 0;
    while (performance.now() < until) x = (x + 1) | 0;
    post({ type: 'decision', wire: null, spinProof: x !== undefined, engineElapsedMs: job.spinMs || 0 });
  } else if (job.kind === 'selftest-throw') {
    post({ type: 'error', error: { code: 'selftest', name: 'Error', message: 'synthetic engine error' } });
  } else if (job.kind === 'selftest-attempt') {
    require('./attempt-worker.cjs').syntheticAttempt(job, post);
  } else if (job.kind === 'selftest-handmade-wire' && SG) {
    try {
      post({ type: 'decision', wire: handmadeWire(), engineElapsedMs: 0 });
    } catch (err) {
      post({ type: 'error', error: failure(err) });
    }
  } else {
    post({ type: 'fatal', error: { code: 'job-kind', name: null, message: 'unknown job kind ' + job.kind } });
  }
}

function handle(job) {
  if (job.kind === 'pipeline-request') pipelineRequest(job);
  else if (job.kind === 'verify') verifyJob(job);
  else if (job.kind === 'attempt-run') require('./attempt-worker.cjs').run({ SG: SG, job: job, post: post, failure: failure });
  else if (typeof job.kind === 'string' && job.kind.indexOf('ig04-') === 0) {
    require('./ig04-worker.cjs').handle({ SG: SG, job: job, post: post, failure: failure });
  }
  else if (typeof job.kind === 'string' && job.kind.indexOf('ig05-') === 0) {
    require('./ig05-worker.cjs').handle({ SG: SG, job: job, post: post, failure: failure });
  }
  else if (data.testOnly === true) syntheticJob(job);
  else post({ type: 'fatal', error: { code: 'job-kind', name: null, message: 'unknown job kind ' + job.kind } });
}

function start() {
  const began = process.hrtime.bigint();
  let plan = null;
  try {
    if (data.noEngine !== true) {
      const prepared = L.prepareLoad({
        repoRoot: data.repoRoot, adapterIds: data.adapterIds || [], expectedFingerprint: data.expectedFingerprint
      });
      plan = prepared.plan;
      L.executePlan(plan, L.runInThisContext);
      SG = globalThis.SG;
      const missing = SG ? missingApi(SG) : ['SG'];
      if (missing.length > 0) throw new C.HarnessError('capability-missing', 'the engine lacks: ' + missing.join(', '));
      if (data.role === 'verify' && SG.__igHooks !== undefined) {
        throw new C.HarnessError('unsupported-source', 'the verifier instance is not native');
      }
    }
    const catalogue = data.wantCatalogue && SG ? discoverCatalogue(SG) : null;
    post({
      type: 'ready',
      loadMs: Number(process.hrtime.bigint() - began) / 1e6,
      runtimeFingerprint: plan ? plan.fingerprint : null,
      adapterIds: plan ? plan.adapterIds : [],
      adapterHashes: plan ? plan.adapterHashes : [],
      transforms: plan ? plan.transforms : [],
      patchedFiles: plan ? L.describePlan(plan).patchedFiles : [],
      proof: SG ? adapterProof(SG) : null,
      catalogue: catalogue
    });
  } catch (err) {
    post({ type: 'fatal', error: failure(err) });
    return;
  }
  parentPort.on('message', function (message) {
    if (message && message.type === 'job') handle(message.job);
  });
}

start();
