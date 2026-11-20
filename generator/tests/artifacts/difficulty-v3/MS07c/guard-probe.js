'use strict';

/*
 * MS07c scratch (handoff IR59): an observer of the objective guard of the dig, loaded with `node --require`, so
 * that the soak of record runs unchanged. The guard (`boundedObjective` in generator/js/engine/digger.js) refuses
 * a removal after OBJECTIVE_STEPS (100,000) budget checks of one solve, by throwing a GenerationError with the
 * code 'digger.objectiveGuard' out of `SG.logicalSolver.solve`, which the dig catches; the statistics do not say
 * how often that happens. This wraps `solve` to count the solves and those throws (and rethrows every error as
 * it was), and wraps `SG.digger.generate` and `SG.pipeline.run` to give the counts per request (the outermost call
 * only; the I4 repeat of every fifth request is a call of its own). It changes no argument, result or error.
 *
 *   $env:DV3_GUARD_PROBE_OUT = '<record.json>'
 *   node --require ./tests/artifacts/difficulty-v3/MS07c/guard-probe.js tests/soak.js <the soak's own arguments>
 *
 * The record is written when the process exits. The wrappers are installed after every `vm.runInThisContext`
 * of the soak's source loader, as soon as the objects exist.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const GUARD_CODE = 'digger.objectiveGuard';
const out = process.env.DV3_GUARD_PROBE_OUT;
if (!out) throw new Error('DV3_GUARD_PROBE_OUT must name the record file');

const state = { solves: 0, guardRefusals: 0, calls: [], instrumented: [], problems: [] };
let depth = 0;

function wrapOnce(host, name, make) {
  const real = host[name];
  if (typeof real !== 'function' || real.__guardProbe) return;
  const wrapped = make(real);
  wrapped.__guardProbe = true;
  host[name] = wrapped;
  state.instrumented.push(name);
}

function requestWrapper(route) {
  return (real) => function () {
    if (depth > 0) return real.apply(this, arguments);
    depth++;
    const solves = state.solves;
    const guard = state.guardRefusals;
    try {
      return real.apply(this, arguments);
    } finally {
      depth--;
      state.calls.push({ route: route, solves: state.solves - solves, guardRefusals: state.guardRefusals - guard });
    }
  };
}

function instrument() {
  const SG = globalThis.SG;
  if (!SG) return;
  if (SG.logicalSolver) {
    wrapOnce(SG.logicalSolver, 'solve', (real) => function () {
      state.solves++;
      try {
        return real.apply(this, arguments);
      } catch (err) {
        if (err && err.code === GUARD_CODE) state.guardRefusals++;
        throw err;
      }
    });
  }
  if (SG.digger) wrapOnce(SG.digger, 'generate', requestWrapper('digger.generate'));
  if (SG.pipeline) wrapOnce(SG.pipeline, 'run', requestWrapper('pipeline.run'));
}

const realRun = vm.runInThisContext;
vm.runInThisContext = function () {
  const result = realRun.apply(this, arguments);
  try {
    instrument();
  } catch (err) {
    state.problems.push(String(err && err.stack ? err.stack : err));
  }
  return result;
};

process.on('exit', (code) => {
  const record = {
    schema: 1,
    tool: 'guard-probe',
    argv: process.argv.slice(2),
    exitCode: code,
    solves: state.solves,
    guardRefusals: state.guardRefusals,
    requestCalls: state.calls.length,
    requestsWithGuardRefusals: state.calls.filter((call) => call.guardRefusals > 0).length,
    instrumented: state.instrumented,
    problems: state.problems,
    calls: state.calls
  };
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(path.resolve(out), JSON.stringify(record, null, 2).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
});
