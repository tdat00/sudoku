'use strict';

/*
 * Private adapter of IG-S04 (S1/S2 frontier prototype): the in-memory transforms that hook the runtime of
 * frontier-runtime.cjs into a private copy of the engine. It rewrites only source strings of a worker instance, never a
 * file; the native engine is never patched, and the scoped S3 prototype is not part of it (reference solver only).
 * Each transform has a unique function anchor (no line numbers). Without `SG.__igRt` the patched code is the native code.
 *
 *  - logical-solver.js: `solve` wraps the caller's budget so its checks are counted and the solve is counted;
 *    `iterate` tells the runtime about every applied Finding (deduction count, S2 early exit, the enforced limits).
 *  - dfs-solver.js: `begin` counts the call and wraps the budget; `search` counts every real entry.
 *  - digger.js: before `generate` (every constant and helper is declared above it) the runtime is created and the native
 *    constants and helpers the frontier needs are exposed to it: the same `removalObjective`, `rateCounted`,
 *    `countWithin`, `qualityOf`, `isExact`, `createKeeper`, `cellSequence`, `groupSequence`, `unitsStayFilled` ...
 *
 * The factory is published on the worker's global when this module is loaded (the loader requires an adapter inside
 * the worker thread that builds the instance), so the transformed sources never need a `require`.
 */
const SOLVER = '../core/js/engine/logical-solver.js';
const DFS = '../core/js/engine/dfs-solver.js';
const DIGGER = 'js/engine/digger.js';

const SOLVE = 'function solve(model, givens, options) {';
const ITERATE = 'function iterate(model, state, ladder, ctx, run) {';
const BEGIN = 'function begin(ws, limit, rng, budget, wantSolution) {';
const SEARCH = 'function search(ws, depth) {';
const GENERATE = 'function generate(model, level, rng, options) {';

globalThis.__igFrontierFactory = function (SG) {
  return require('../frontier-runtime.cjs').create(SG);
};

// Every name the frontier code needs from digger.js, by its native name. All of them are declared above `generate`.
const EXPOSED = Object.freeze([
  'CAP_RATINGS', 'CAP_PROPOSALS', 'REFINE_RATINGS', 'UNIQUE_NODES', 'UNIQUE_GUARD_CODE', 'OBJECTIVE_STEPS',
  'OBJECTIVE_GUARD_CODE', 'GUIDED_CANDIDATES', 'GUIDED_MIN_CANDIDATES', 'GUIDED_START', 'STUCK_SCORE',
  'REFUSED_TECHNIQUES', 'REFUSED_TOO_HARD', 'REFUSED_AMBIGUOUS', 'SHALLOW_QUALITY', 'DEFAULT_DIG_TRIES',
  'DEFAULT_DIG_TRIES_COARSE', 'countWithin', 'uniqueWithin', 'rateCounted', 'removalObjective', 'unitsStayFilled',
  'qualityOf', 'isExact', 'isComplete', 'isShallow', 'createKeeper', 'keptPuzzle', 'newCaps', 'capsExhausted',
  'cellSequence', 'groupSequence', 'refusalReason', 'copyWork', 'distanceToLevel'
]);

const BOOT = [
  'SG.__igRt = typeof globalThis.__igFrontierFactory === \'function\' ? globalThis.__igFrontierFactory(SG) : undefined;',
  'if (SG.__igRt !== undefined) {',
  '  SG.__igRt.digger = {'
].concat(EXPOSED.map(function (name, i) {
  return '    ' + name + ': ' + name + (i + 1 < EXPOSED.length ? ',' : '');
})).concat(['  };', '}']).join('\n');

module.exports = Object.freeze({
  id: 'frontier-hooks',
  version: 1,
  description: 'S1/S2 frontier prototype: counters, enforced count limits, the S2 early exit and the native helpers.',
  exposed: EXPOSED,
  transforms: Object.freeze([
    Object.freeze({
      id: 'frontier-hooks.solve-options', file: SOLVER, anchor: SOLVE, position: 'bodyStart',
      code: 'if (SG.__igRt !== undefined) options = SG.__igRt.solveOptions(options);'
    }),
    Object.freeze({
      id: 'frontier-hooks.step', file: SOLVER, anchor: ITERATE, position: 'replace',
      find: 'const first = counts[index]++ === 0;',
      code: [
        'if (SG.__igRt !== undefined) SG.__igRt.step(model, state, tech);',
        'const first = counts[index]++ === 0;'
      ].join('\n')
    }),
    Object.freeze({
      id: 'frontier-hooks.dfs-begin', file: DFS, anchor: BEGIN, position: 'replace',
      find: 'ws.budget = budget || NO_BUDGET;',
      code: [
        'if (SG.__igRt !== undefined) SG.__igRt.dfsCall();',
        'ws.budget = budget ? (SG.__igRt !== undefined ? SG.__igRt.dfsBudget(budget) : budget) : NO_BUDGET;'
      ].join('\n')
    }),
    Object.freeze({
      id: 'frontier-hooks.dfs-entry', file: DFS, anchor: SEARCH, position: 'bodyStart',
      code: 'if (SG.__igRt !== undefined) SG.__igRt.dfsEntry();'
    }),
    Object.freeze({
      id: 'frontier-hooks.digger-boot', file: DIGGER, anchor: GENERATE, position: 'before',
      code: BOOT
    })
  ])
});
