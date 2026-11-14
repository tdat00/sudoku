'use strict';

/*
 * Private adapter of IG-S03 (S3, scoped negative scans): the in-memory transforms that hook the runtime of
 * scoped-solver.cjs into a private copy of the engine. It rewrites only source strings of a worker instance, never a
 * file; the native engine is never patched. Each transform has a unique function anchor (no line numbers).
 *
 *  - logical-solver.js: `iterate` asks the runtime for a per-solve state (`begin`) and tells it every applied Finding
 *    (`applied`).
 *  - tech-basic.js: naked and hidden singles ask the runtime first; the runtime reaches the native one-unit scan of
 *    `findHiddenSingle` and the geometry through `SG.__igBasicKit`.
 *  - tech-subset.js: `findSubset` asks the runtime first; the runtime reuses the native helpers of the module
 *    (collect, enumerate, conclude) and its node counter through `SG.__igSubsetKit`.
 *  - pipeline.js: `run` reports the runtime's counters to the host when it ends (a message, no timing).
 *
 * The runtime answers `undefined` when it does not handle a call, and the native code then runs unchanged. Every other
 * finder (pointing, box/line, fish, wings, chains, cages, inequalities) is not touched at all.
 *
 * The factory is published on the worker's global when this module is loaded (the loader requires an adapter inside
 * the worker thread that builds the instance), so the transformed sources never need a `require`.
 */
const SOLVER = '../core/js/engine/logical-solver.js';
const BASIC = '../core/js/engine/tech-basic.js';
const SUBSET = '../core/js/engine/tech-subset.js';
const PIPELINE = 'js/engine/pipeline.js';

const ITERATE = 'function iterate(model, state, ladder, ctx, run) {';
const FIND_NAKED = 'function findNakedSingle(model, state) {';
const FIND_BOX = 'function findHiddenSingleBox(model, state, ctx) {';
const FIND_LINE = 'function findHiddenSingleLine(model, state, ctx) {';
const FIND_SUBSET = 'function findSubset(model, state, ctx, def) {';
const RUN = 'function run(config, emit, budget) {';

globalThis.__igScopedFactory = function (SG) {
  return require('../scoped-solver.cjs').create(SG, { postStats: true });
};

function delegateHidden(id) {
  return [
    'if (SG.__igScoped !== undefined) {',
    '  const igFound = SG.__igScoped.hiddenSingle(model, state, ctx, \'' + id + '\');',
    '  if (igFound !== undefined) return igFound;',
    '}'
  ].join('\n');
}

module.exports = Object.freeze({
  id: 'scoped-solver',
  version: 1,
  description: 'S3 prototype: scoped negative scans of singles and subsets with replayed budget checks.',
  transforms: Object.freeze([
    Object.freeze({
      id: 'scoped-solver.boot', file: SOLVER, anchor: ITERATE, position: 'before',
      code: 'SG.__igScoped = typeof globalThis.__igScopedFactory === \'function\' ? ' +
        'globalThis.__igScopedFactory(SG) : undefined;'
    }),
    Object.freeze({
      id: 'scoped-solver.iterate-begin', file: SOLVER, anchor: ITERATE, position: 'bodyStart',
      code: 'const igS = SG.__igScoped !== undefined ? SG.__igScoped.begin(model, state, ladder, ctx) : null;'
    }),
    Object.freeze({
      id: 'scoped-solver.iterate-applied', file: SOLVER, anchor: ITERATE, position: 'replace',
      find: 'const changed = applyFinding(model, state, tech, finding, collect, effect);',
      code: [
        'const changed = applyFinding(model, state, tech, finding, collect, effect);',
        'if (igS !== null) igS.applied(finding);'
      ].join('\n')
    }),
    Object.freeze({
      id: 'scoped-solver.basic-kit', file: BASIC, anchor: FIND_NAKED, position: 'before',
      code: 'SG.__igBasicKit = { findHiddenSingle: findHiddenSingle, geometryOf: geometryOf };'
    }),
    Object.freeze({
      id: 'scoped-solver.naked-single', file: BASIC, anchor: FIND_NAKED, position: 'bodyStart',
      code: [
        'if (SG.__igScoped !== undefined) {',
        '  const igFound = SG.__igScoped.nakedSingle(model, state, arguments[2]);',
        '  if (igFound !== undefined) return igFound;',
        '}'
      ].join('\n')
    }),
    Object.freeze({
      id: 'scoped-solver.hidden-single-box', file: BASIC, anchor: FIND_BOX, position: 'bodyStart',
      code: delegateHidden('hiddenSingleBox')
    }),
    Object.freeze({
      id: 'scoped-solver.hidden-single-line', file: BASIC, anchor: FIND_LINE, position: 'bodyStart',
      code: delegateHidden('hiddenSingleLine')
    }),
    Object.freeze({
      id: 'scoped-solver.subset-kit', file: SUBSET, anchor: FIND_SUBSET, position: 'before',
      code: [
        'SG.__igSubsetKit = {',
        '  collectCells: collectCells, collectDigits: collectDigits, startSearch: startSearch,',
        '  nextCombination: nextCombination, conclude: conclude,',
        '  getNodes: function () { return nodes; }, setNodes: function (value) { nodes = value; },',
        '  CHECK_EVERY: CHECK_EVERY, MAX_UNIT: MAX_UNIT',
        '};'
      ].join('\n')
    }),
    Object.freeze({
      id: 'scoped-solver.subset-find', file: SUBSET, anchor: FIND_SUBSET, position: 'bodyStart',
      code: [
        'if (SG.__igScoped !== undefined) {',
        '  const igFound = SG.__igScoped.findSubset(model, state, ctx, def);',
        '  if (igFound !== undefined) return igFound;',
        '}'
      ].join('\n')
    }),
    Object.freeze({
      id: 'scoped-solver.run-flush', file: PIPELINE, anchor: RUN, position: 'replace',
      find: 'return SG.budget.drive(runSteps(config, emit, budget, { cooperative: false }));',
      code: [
        'try {',
        '  return SG.budget.drive(runSteps(config, emit, budget, { cooperative: false }));',
        '} finally {',
        '  if (SG.__igScoped !== undefined) SG.__igScoped.flush();',
        '}'
      ].join('\n')
    })
  ])
});
