'use strict';

/*
 * MS18d Phase C0 task-owned (SA1 C0-6): the PAYLOAD TYPES of the transport. The controller (acquisition G1,
 * release logs G2, source binding G4, orphan barrier G5, the transcript and pid records) works for any
 * command; what differs per payload is only the G3 check, supplied here as a classifier module:
 *
 *   {
 *     type,                          the name in request.profile
 *     allowsMissExit,                true only where exit 1 has a defined meaning (a complete GP miss); the
 *                                    wrapper allows exit 1 of the shared helper for such a type and no other
 *     validateRequest(request),      throws when the request lacks what the type needs
 *     cellOf(request),               { variant, level, targetMs } to bind a target, else null
 *     classify(evidence)             -> { schema, outcome: 'success' | 'miss' | 'stop', complete,
 *                                         controllerExit, kinds, problems, ... }; the controller exit is 0
 *                                    for a complete success, 1 only for a complete miss of a type that
 *                                    allows it, 65 for a stop
 *     declaredDirs(request)          optional: the run directories the frozen manifest declares (R2)
 *     extraChecks(request, ctx)      optional: the type's own checks before admission ({ ok, problems,
 *                                    records }), e.g. the plan manifest and the attempts of its unit (R4)
 *   }
 * `evidence` is everything retained about the run: { request, runDir, stdout, stderr, stdoutBytes,
 * stderrBytes, cli: { exit, signal } (the command's own exit, from the tee's record), tee: { marker, exit },
 * argvLine, barrier, binding, acquisition, readRunFile(name), readRunBytes(name) }, so that a payload that
 * writes a file (a ledger, say) can read it from the run directory. Registered here: `gp-cell` (the stock
 * `perf.js --gate` transcript, classify.js, a stand-in type since C0b), `generic` (exit 0 only) and, from
 * payload-gp.js, the final matrix's `gp-recorder` (the raw-time ledger writer, exit 0 only after writing
 * it) and `gp-merge` (the check-only merger, exit 1 only for a complete numerical MISS). A stand-in
 * classifier (request.standin and request.classifierModule) is loaded only to test this hook.
 */
const path = require('path');
const { classifyGpRun, classifyGenericRun, STOP_EXIT } = require('./classify.js');
const finalMatrix = require('./payload-gp.js');

const registry = new Map();

function register(impl) {
  ['type', 'validateRequest', 'cellOf', 'classify'].forEach((k) => {
    if (impl[k] === undefined) throw new Error('a payload type needs ' + k);
  });
  if (typeof impl.allowsMissExit !== 'boolean') {
    throw new Error('a payload type says whether exit 1 is defined');
  }
  if (registry.has(impl.type)) throw new Error('payload type ' + impl.type + ' is registered twice');
  registry.set(impl.type, impl);
  return impl;
}

register({
  type: 'gp-cell',
  allowsMissExit: true,
  validateRequest(request) {
    const c = request.cell;
    if (!c || typeof c.variant !== 'string' || typeof c.level !== 'string' || !Number.isInteger(c.targetMs)) {
      throw new Error('a gp-cell request names its cell and its frozen target');
    }
  },
  cellOf: (request) => request.cell,
  classify(e) {
    const m = e.request.expected && e.request.expected.machine;
    return classifyGpRun({
      expected: Object.assign({ runs: 50, seed: 7000, node: e.request.expected.node, cpu: m && m.cpu },
        e.request.cell),
      stdout: e.stdout, stderr: e.stderr, stderrBytes: e.stderrBytes, cli: e.cli, tee: e.tee,
      argvLine: e.argvLine, barrier: e.barrier, binding: e.binding, acquisition: e.acquisition
    });
  }
});

register({
  type: 'generic',
  allowsMissExit: false,
  validateRequest() {},
  cellOf: () => null,
  classify: (e) => classifyGenericRun({ stderrBytes: e.stderrBytes, cli: e.cli, tee: e.tee,
    barrier: e.barrier, binding: e.binding, acquisition: e.acquisition })
});

/** The typed payloads of the final matrix (payload-gp.js): the raw-time recorder and the check-only merge */
register(finalMatrix.recorder);
register(finalMatrix.merge);

/** The payload type a request names (a stand-in may bring its own classifier module, to test the hook). */
function payloadFor(request) {
  if (request.standin === true && request.classifierModule) {
    const impl = require(path.resolve(request.classifierModule));
    ['type', 'validateRequest', 'cellOf', 'classify', 'allowsMissExit'].forEach((k) => {
      if (impl[k] === undefined) throw new Error('the stand-in classifier lacks ' + k);
    });
    if (impl.type !== request.profile) {
      throw new Error('the stand-in classifier is not of type ' + request.profile);
    }
    return impl;
  }
  const found = registry.get(request.profile);
  if (!found) throw new Error('unknown payload type ' + request.profile);
  return found;
}

/**
 * The controller's central rule: the classifier of a type decides, but exit 1 is a controller exit only for
 * a type that defines it and only for a complete miss; any other code that is not 0 or the stop code is a
 * stop.
 */
function boundedResult(impl, result) {
  const problems = [];
  if (!result || typeof result !== 'object') {
    return { outcome: 'stop', complete: false, controllerExit: STOP_EXIT, kinds: ['classifier-failed'],
      problems: ['the classifier returned no result'] };
  }
  const code = result.controllerExit;
  if (code === 0 && result.outcome === 'success' && result.complete === true) return result;
  if (code === 1 && result.outcome === 'miss' && result.complete === true && impl.allowsMissExit) {
    return result;
  }
  if (code === STOP_EXIT && result.outcome === 'stop') return result;
  problems.push('the classifier of ' + impl.type + ' returned outcome ' + result.outcome + ' with exit ' +
    code + ' (complete ' + result.complete + '), which this type does not define');
  return Object.assign({}, result, { outcome: 'stop', complete: false, controllerExit: STOP_EXIT,
    kinds: (result.kinds || []).concat(['undefined-exit']),
    problems: (result.problems || []).concat(problems) });
}

module.exports = { register, payloadFor, boundedResult, types: () => Array.from(registry.keys()) };
