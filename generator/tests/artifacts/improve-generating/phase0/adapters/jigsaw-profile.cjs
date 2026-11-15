'use strict';

/*
 * Private adapter of IG-S08 (bounded SM3 attribution of the Jigsaw Expert request of seed 1111; pre-MS07, provisional
 * (pre-freeze)): the in-memory transforms that hook the stage beacon (jigsaw-profile.cjs, published as `SG.__igJig` for the time of
 * one observed request) into a private copy of the engine. It rewrites only source strings of a worker instance, never a file;
 * the native engine is never patched. Each transform has a unique function anchor (no line numbers). Without `SG.__igJig` every
 * inserted line is skipped and the patched code is the native code: the hooks observe and draw no random number, solve nothing
 * and change no limit, restart rule or branch of the algorithm.
 *
 *  - jigsaw.js: the layout growth (attempt, growth backtracks, open levels and feasibility calls as counters; the growth, the
 *    solvability check and the plain-search check as contexts) and the layout outcome markers.
 *  - full-grid.js: searches, restarts, backtracks and the entry of the unlimited last search (counters of the current context).
 *  - dfs-solver.js: nodes, node checks and backtracks of the depth-first search (counters of the current context).
 *  - logical-solver.js: the time and hits of every finder call, in the context that called it.
 *  - digger.js: the pipeline steps (the stage runner, which also posts every stage entry before its synchronous work), the start
 *    of a sample (ordinary, proposal or local) and the inner pieces (the stage A oracle, the stage B objective, the final count
 *    of the random dig, the safety count, the keeper count, the proposal rating and the refinements, the local search's
 *    uniqueness counts, ratings and refinement).
 *
 * The engine entry points that need no source change (`logicalSolver.solve`, `difficulty.rate`, the four DFS calls and
 * `fullGrid.generate`) are wrapped by the beacon's `install` and restored by `uninstall`.
 */
const P = require('../jigsaw-profile.cjs');

const JIGSAW = 'js/variants/jigsaw.js';
const FULL_GRID = 'js/engine/full-grid.js';
const DFS = '../core/js/engine/dfs-solver.js';
const SOLVER = '../core/js/engine/logical-solver.js';
const DIGGER = 'js/engine/digger.js';

const GEN_REGIONS = 'function generateRegions(rng, options) {';
const GROW = 'function grow(rng, shape, maxBacktracks, counters) {';
const OPEN_LEVEL = 'function openLevel(d, rng, shape) {';
const GENERATE = 'function generate(model, rng, budget, options) {';
const SEARCH = 'function search(ws, depth) {';
const ITERATE = 'function iterate(model, state, ladder, ctx, run) {';
const STAGE = 'function* stage(stepId, args, body) {';
const DIG_STEPS = 'function* digSteps(model, solution, rng, options) {';
const GUIDED = 'function* digGuidedSteps(model, solution, startGivens, rejected, spec, rng, ctx) {';
const SECURE = 'function secureUniqueness(model, solution, dug, rng, ctx) {';
const KEEPER = 'function createKeeper(spec, level, budget) {';
const DIG_LEVEL = 'function* digLevelSteps(model, solution, level, rng, options) {';
const SEARCH_STRATEGY = 'function searchStrategy(candidate) {';
const RUN_LOCAL = 'function* runLocalSearch(candidate, solution, rng, ctx, local) {';

const J = 'SG.__igJig';
const K = P.CTX;

// `hooked` while the beacon is published, `native` otherwise: the native expression is never altered.
function viaBeacon(hooked, native) {
  return J + ' !== undefined ? ' + hooked + ' : ' + native;
}

function inContext(ctx, fn, args, native) {
  return viaBeacon(J + '.call(' + ctx + ', ' + fn + ', ' + args + ')', native);
}

module.exports = Object.freeze({
  id: 'jigsaw-profile',
  version: 1,
  description: 'SM3 stage beacon: stage entry markers, per-cell wall time, finder calls, layout/grid/DFS counters (observation only).',
  transforms: Object.freeze([
    // --- jigsaw.js: the layout ------------------------------------------------------------------------------------------------
    Object.freeze({
      id: 'jig.layout-attempt', file: JIGSAW, anchor: GEN_REGIONS, position: 'replace', find: 'stats.attempts++;',
      code: ['stats.attempts++;', 'if (' + J + ' !== undefined) ' + J + '.layoutAttempt(stats.attempts, stats.backtracks);'].join('\n')
    }),
    Object.freeze({
      id: 'jig.layout-grow', file: JIGSAW, anchor: GEN_REGIONS, position: 'replace',
      find: 'const grown = grower.grow(attemptRng, shape, maxBacktracks, counters);',
      code: 'const grown = ' + inContext(K.layoutGrowth, 'grower.grow', 'attemptRng, shape, maxBacktracks, counters',
        'grower.grow(attemptRng, shape, maxBacktracks, counters)') + ';'
    }),
    Object.freeze({
      id: 'jig.layout-solvable', file: JIGSAW, anchor: GEN_REGIONS, position: 'replace',
      find: 'if (!hasSolution(model, attemptRng.fork(\'solve\'))) {',
      code: 'if (!(' + inContext(K.layoutSolvable, 'hasSolution', 'model, attemptRng.fork(\'solve\')',
        'hasSolution(model, attemptRng.fork(\'solve\'))') + ')) {'
    }),
    Object.freeze({
      id: 'jig.layout-unsolvable', file: JIGSAW, anchor: GEN_REGIONS, position: 'replace', find: 'stats.unsolvable++;',
      code: ['stats.unsolvable++;', 'if (' + J + ' !== undefined) ' + J + '.layoutUnsolvable(stats.attempts);'].join('\n')
    }),
    Object.freeze({
      id: 'jig.layout-plain', file: JIGSAW, anchor: GEN_REGIONS, position: 'replace', find: '} else if (!solvesPlainly(model)) {',
      code: '} else if (!(' + inContext(K.layoutPlain, 'solvesPlainly', 'model', 'solvesPlainly(model)') + ')) {'
    }),
    Object.freeze({
      id: 'jig.layout-hard', file: JIGSAW, anchor: GEN_REGIONS, position: 'replace', find: 'stats.hard++;',
      code: ['stats.hard++;', 'if (' + J + ' !== undefined) ' + J + '.layoutHard(stats.attempts);'].join('\n')
    }),
    Object.freeze({
      id: 'jig.layout-accepted', file: JIGSAW, anchor: GEN_REGIONS, position: 'replace', find: 'return cellRegion;',
      code: ['if (' + J + ' !== undefined) ' + J + '.layoutAccepted(stats.attempts);', 'return cellRegion;'].join('\n')
    }),
    Object.freeze({
      id: 'jig.growth-backtrack', file: JIGSAW, anchor: GROW, position: 'replace', find: 'counters.backtracks++;',
      code: ['counters.backtracks++;', 'if (' + J + ' !== undefined) ' + J + '.layoutBack();'].join('\n')
    }),
    Object.freeze({
      id: 'jig.open-level', file: JIGSAW, anchor: OPEN_LEVEL, position: 'bodyStart',
      code: 'if (' + J + ' !== undefined) ' + J + '.layoutLevel();'
    }),
    Object.freeze({
      id: 'jig.feasible', file: JIGSAW, anchor: OPEN_LEVEL, position: 'replace', find: 'const legal = isFeasible();',
      code: ['const legal = isFeasible();', 'if (' + J + ' !== undefined) ' + J + '.layoutFeas();'].join('\n')
    }),
    // --- full-grid.js ------------------------------------------------------------------------------------------------------------
    Object.freeze({
      id: 'grid.unlimited', file: FULL_GRID, anchor: GENERATE, position: 'replace',
      find: 'const unlimited = attempt >= maxRestarts;',
      code: ['const unlimited = attempt >= maxRestarts;',
        'if (unlimited && ' + J + ' !== undefined) ' + J + '.gridUnlimited(attempt);'].join('\n')
    }),
    Object.freeze({
      id: 'grid.search', file: FULL_GRID, anchor: GENERATE, position: 'replace', find: 'stats.attempts++;',
      code: ['stats.attempts++;', 'if (' + J + ' !== undefined) ' + J + '.gridSearch();'].join('\n')
    }),
    Object.freeze({
      id: 'grid.backtracks', file: FULL_GRID, anchor: GENERATE, position: 'replace', find: 'stats.backtracks += result.backtracks;',
      code: ['stats.backtracks += result.backtracks;', 'if (' + J + ' !== undefined) ' + J + '.gridBack(result.backtracks);'].join('\n')
    }),
    Object.freeze({
      id: 'grid.restart', file: FULL_GRID, anchor: GENERATE, position: 'replace', find: 'stats.restarts++;',
      code: ['stats.restarts++;', 'if (' + J + ' !== undefined) ' + J + '.gridRestart();'].join('\n')
    }),
    // --- dfs-solver.js -----------------------------------------------------------------------------------------------------------
    Object.freeze({
      id: 'dfs.node', file: DFS, anchor: SEARCH, position: 'bodyStart',
      code: 'if (' + J + ' !== undefined) ' + J + '.dfsNode();'
    }),
    Object.freeze({
      id: 'dfs.check', file: DFS, anchor: SEARCH, position: 'replace', find: 'ws.budget.check();',
      code: ['if (' + J + ' !== undefined) ' + J + '.dfsCheck();', 'ws.budget.check();'].join('\n')
    }),
    Object.freeze({
      id: 'dfs.backtrack', file: DFS, anchor: SEARCH, position: 'replace', find: 'if (++ws.backtracks > ws.maxBacktracks) {',
      code: ['if (' + J + ' !== undefined) ' + J + '.dfsBack();', 'if (++ws.backtracks > ws.maxBacktracks) {'].join('\n')
    }),
    // --- logical-solver.js -------------------------------------------------------------------------------------------------------
    Object.freeze({
      id: 'solver.finder', file: SOLVER, anchor: ITERATE, position: 'replace',
      find: 'const found = tech.find(model, state, ctx);',
      code: [
        'let found;',
        'if (' + J + ' === undefined) {',
        '  found = tech.find(model, state, ctx);',
        '} else {',
        '  ' + J + '.finderOpen(tech);',
        '  try {',
        '    found = tech.find(model, state, ctx);',
        '  } finally {',
        '    ' + J + '.finderClose(found);',
        '  }',
        '}'
      ].join('\n')
    }),
    // --- digger.js: the pipeline steps ------------------------------------------------------------------------------------------
    Object.freeze({
      id: 'dig.stage-open', file: DIGGER, anchor: STAGE, position: 'bodyStart',
      code: 'const igStage = ' + J + ' !== undefined ? ' + J + '.stageOpen(stepId, args) : 0;'
    }),
    Object.freeze({
      id: 'dig.stage-close', file: DIGGER, anchor: STAGE, position: 'replace',
      find: 'timings[stepId] = (timings[stepId] || 0) + (now() - t0);',
      code: ['timings[stepId] = (timings[stepId] || 0) + (now() - t0);',
        'if (igStage !== 0 && ' + J + ' !== undefined) ' + J + '.stageClose(igStage, stepId);'].join('\n')
    }),
    // --- digger.js: stage A, the final count of the random dig, stage B ----------------------------------------------------------
    Object.freeze({
      id: 'dig.oracle', file: DIGGER, anchor: DIG_STEPS, position: 'replace',
      find: 'if (oracle(model, givens, solution, group, budget, stats)) {',
      code: 'if (' + inContext(K.digOracle, 'oracle', 'model, givens, solution, group, budget, stats',
        'oracle(model, givens, solution, group, budget, stats)') + ') {'
    }),
    Object.freeze({
      id: 'dig.verify', file: DIGGER, anchor: DIG_STEPS, position: 'replace',
      find: 'if (options.verify !== false && SG.dfs.countSolutions(model, givens, 2, budget) !== 1) {',
      code: 'if (options.verify !== false && (' + inContext(K.digVerify, 'SG.dfs.countSolutions', 'model, givens, 2, budget',
        'SG.dfs.countSolutions(model, givens, 2, budget)') + ') !== 1) {'
    }),
    Object.freeze({
      id: 'dig.objective', file: DIGGER, anchor: GUIDED, position: 'replace',
      find: 'const value = objective(givens, solution, group, ctx.budget, stats);',
      code: 'const value = ' + inContext(K.digObjective, 'objective', 'givens, solution, group, ctx.budget, stats',
        'objective(givens, solution, group, ctx.budget, stats)') + ';'
    }),
    // --- digger.js: the safety count, the keeper and the proposal rating ----------------------------------------------------------
    Object.freeze({
      id: 'dig.safety', file: DIGGER, anchor: SECURE, position: 'replace',
      find: 'const unique = SG.dfs.countSolutions(model, dug.givens, 2, ctx.budget) === 1;',
      code: 'const unique = (' + inContext(K.digSafety, 'SG.dfs.countSolutions', 'model, dug.givens, 2, ctx.budget',
        'SG.dfs.countSolutions(model, dug.givens, 2, ctx.budget)') + ') === 1;'
    }),
    Object.freeze({
      id: 'dig.keeper', file: DIGGER, anchor: KEEPER, position: 'replace',
      find: 'const count = countWithin(candidate.model, candidate.givens, budget);',
      code: 'const count = ' + inContext(K.digKeeper, 'countWithin', 'candidate.model, candidate.givens, budget',
        'countWithin(candidate.model, candidate.givens, budget)') + ';'
    }),
    Object.freeze({
      id: 'dig.level-enter', file: DIGGER, anchor: DIG_LEVEL, position: 'bodyStart',
      code: 'if (' + J + ' !== undefined) ' + J + '.levelEnter(options);'
    }),
    Object.freeze({
      id: 'dig.proposal-rating', file: DIGGER, anchor: DIG_LEVEL, position: 'replace',
      find: 'const first = rateCounted(dugModel, givens, budget, caps);',
      code: 'const first = ' + inContext(K.digProposalRating, 'rateCounted', 'dugModel, givens, budget, caps',
        'rateCounted(dugModel, givens, budget, caps)') + ';'
    }),
    Object.freeze({
      id: 'dig.proposal-refine', file: DIGGER, anchor: DIG_LEVEL, position: 'replace',
      find: 'const refined = refineDown(dugModel, solution, givens, first, spec, rng.fork(\'refine\'), resolved);',
      code: 'const refined = ' + inContext(K.digRefine, 'refineDown',
        'dugModel, solution, givens, first, spec, rng.fork(\'refine\'), resolved',
        'refineDown(dugModel, solution, givens, first, spec, rng.fork(\'refine\'), resolved)') + ';'
    }),
    // --- digger.js: the local search ----------------------------------------------------------------------------------------------
    Object.freeze({
      id: 'dig.search-strategy', file: DIGGER, anchor: SEARCH_STRATEGY, position: 'bodyStart',
      code: 'if (' + J + ' !== undefined) ' + J + '.localNext();'
    }),
    Object.freeze({
      id: 'dig.local-refine', file: DIGGER, anchor: RUN_LOCAL, position: 'replace',
      find: 'const refined = refineDown(model, solution, givens, rating, spec, rng.fork(\'refine\'), ctx);',
      code: 'const refined = ' + inContext(K.localRefine, 'refineDown',
        'model, solution, givens, rating, spec, rng.fork(\'refine\'), ctx',
        'refineDown(model, solution, givens, rating, spec, rng.fork(\'refine\'), ctx)') + ';'
    }),
    Object.freeze({
      id: 'dig.local-unique', file: DIGGER, anchor: RUN_LOCAL, position: 'replace',
      find: 'seen.unique = uniqueWithin(candModel, cand, budget);',
      code: 'seen.unique = ' + inContext(K.localUnique, 'uniqueWithin', 'candModel, cand, budget',
        'uniqueWithin(candModel, cand, budget)') + ';'
    }),
    Object.freeze({
      id: 'dig.local-rating', file: DIGGER, anchor: RUN_LOCAL, position: 'replace',
      find: 'seen.rating = rateCounted(candModel, cand, budget, caps);',
      code: 'seen.rating = ' + inContext(K.localRating, 'rateCounted', 'candModel, cand, budget, caps',
        'rateCounted(candModel, cand, budget, caps)') + ';'
    })
  ])
});
