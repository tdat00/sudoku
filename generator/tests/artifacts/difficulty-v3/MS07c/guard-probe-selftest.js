'use strict';

/*
 * MS07c scratch: a check of guard-probe.js on stand-in objects, without the engine: a fake `SG.logicalSolver.solve`
 * that throws the guard's error once and a fake request that calls it. Run it as
 *
 *   $env:DV3_GUARD_PROBE_OUT = '<record.json>'
 *   node --require ./tests/artifacts/difficulty-v3/MS07c/guard-probe.js `
 *     tests/artifacts/difficulty-v3/MS07c/guard-probe-selftest.js
 *
 * and expect 3 solves, 1 guard refusal, 2 requests (the pipeline run calls the digger: counted once, as one request).
 */
const vm = require('vm');

class Guard extends Error {
  constructor() {
    super('digger.objectiveGuard');
    this.code = 'digger.objectiveGuard';
  }
}

let calls = 0;
globalThis.SG = {
  logicalSolver: { solve() { return ++calls === 1 ? (() => { throw new Guard(); })() : 'solved'; } },
  digger: { generate() { try { return globalThis.SG.logicalSolver.solve(); } catch (err) { return 'refused'; } } },
  pipeline: { run() { return globalThis.SG.digger.generate() + '+' + globalThis.SG.logicalSolver.solve(); } }
};
vm.runInThisContext('0');
const results = [globalThis.SG.digger.generate(), globalThis.SG.pipeline.run()];
if (results.join(',') !== 'refused,solved+solved') throw new Error('the probe changed a result: ' + results.join(','));
