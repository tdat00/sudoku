'use strict';

/*
 * Private adapter of IG-S07 (SM1 stage and finder profiles): the in-memory transforms that hook the profile runtime
 * (profile-runtime.cjs, published as `SG.__igProf` for the time of one profiled request) into a private copy of the engine.
 * It rewrites only source strings of a worker instance, never a file; the native engine is never patched. Each transform
 * has a unique function anchor (no line numbers). Without `SG.__igProf` every inserted line is skipped and the patched code
 * is the native code: the hooks observe and draw no random number, solve nothing and charge no budget.
 *
 *  - logical-solver.js: `solve` runs `iterate` through the runtime (a `solve.loop` frame), `iterate` times every finder
 *    call (calls, hits, wall time, budget checks, a thrown error) and every applied Finding, and counts both of its own
 *    `budget.check()` sites (the top of a pass and the one before a stuck result) before the check runs.
 *  - techniques.js: `createContext` counts the `ctx.check()` calls of the finders that have a budget.
 *  - digger.js: the pipeline steps (`stage`), the semantic stages (the stage A oracle, the stage B objective, the safety
 *    count, the keeper count, the refinements, the proposal rating, the local search and its two counts), the start of a
 *    sample (kind, attempt, ordinal) and its result, the number of candidates of a guided round and the objective's
 *    refusal reasons. Each call site keeps its arguments and its result.
 *  - dfs-solver.js: `search` counts entries, budget checks of the search loop and backtracks.
 *
 * The entry points that need no source change (`logicalSolver.solve`, `difficulty.rate`, the four DFS calls and
 * `fullGrid.generate`) are wrapped by the runtime's `install` and restored by `uninstall`.
 */
const SOLVER = '../core/js/engine/logical-solver.js';
const TECHNIQUES = '../core/js/engine/techniques.js';
const DFS = '../core/js/engine/dfs-solver.js';
const DIGGER = 'js/engine/digger.js';

const STAGE = 'function* stage(stepId, args, body) {';
const DIG_STEPS = 'function* digSteps(model, solution, rng, options) {';
const GUIDED = 'function* digGuidedSteps(model, solution, startGivens, rejected, spec, rng, ctx) {';
const SECURE = 'function secureUniqueness(model, solution, dug, rng, ctx) {';
const KEEPER = 'function createKeeper(spec, level, budget) {';
const DIG_LEVEL = 'function* digLevelSteps(model, solution, level, rng, options) {';
const RUN_LOCAL = 'function* runLocalSearch(candidate, solution, rng, ctx, local) {';
const LOCAL_STEPS = 'function* localSearchSteps(candidate, solution, rng, ctx) {';
const SEARCH_STRATEGY = 'function searchStrategy(candidate) {';
const REFUSAL = 'function refusalReason(value) {';
const SOLVE = 'function solve(model, givens, options) {';
const ITERATE = 'function iterate(model, state, ladder, ctx, run) {';
const CREATE_CONTEXT = 'function createContext(model, options) {';
const SEARCH = 'function search(ws, depth) {';

const P = 'SG.__igProf';

// `cond ? hooked : native`, so the native line is untouched when the profile is absent.
function viaProfile(hooked, native) {
  return P + ' !== undefined ? ' + hooked + ' : ' + native;
}

module.exports = Object.freeze({
  id: 'profile',
  version: 2,
  description: 'SM1 profile: stage and finder wall-time spans, finder calls/hits/checks, observed loop checks and DFS counters (observation only).',
  transforms: Object.freeze([
    // --- logical-solver.js -------------------------------------------------------------------------------------------
    Object.freeze({
      id: 'profile.solve-iterate', file: SOLVER, anchor: SOLVE, position: 'replace',
      find: 'const outcome = loaded.ok ? iterate(model, state, ladder, SG.techniques.createContext(model, opts), run)',
      code: 'const outcome = loaded.ok ? (' + viaProfile(
        P + '.iterate(iterate, model, state, ladder, SG.techniques.createContext(model, opts), run)',
        'iterate(model, state, ladder, SG.techniques.createContext(model, opts), run)') + ')'
    }),
    Object.freeze({
      id: 'profile.iterate-begin', file: SOLVER, anchor: ITERATE, position: 'bodyStart',
      code: 'const igP = ' + P + ' !== undefined ? ' + P + '.solveBegin(ladder) : null;'
    }),
    Object.freeze({
      id: 'profile.iterate-budget', file: SOLVER, anchor: ITERATE, position: 'replace',
      find: 'const budget = ctx.budget;',
      code: 'const budget = igP !== null && ctx.budget !== null ? ' + P + '.loopBudget(ctx.budget) : ctx.budget;'
    }),
    Object.freeze({
      id: 'profile.iterate-finder', file: SOLVER, anchor: ITERATE, position: 'replace',
      find: 'const found = tech.find(model, state, ctx);',
      code: [
        'let found;',
        'if (igP === null) {',
        '  found = tech.find(model, state, ctx);',
        '} else {',
        '  const igT0 = igP.t();',
        '  const igK0 = ' + P + '.c.checks;',
        '  let igOk = false;',
        '  try {',
        '    found = tech.find(model, state, ctx);',
        '    igOk = true;',
        '  } finally {',
        '    igP.finder(i, igT0, found, igOk, igK0);',
        '  }',
        '}'
      ].join('\n')
    }),
    Object.freeze({
      id: 'profile.iterate-apply', file: SOLVER, anchor: ITERATE, position: 'replace',
      find: 'const changed = applyFinding(model, state, tech, finding, collect, effect);',
      code: [
        'const igA0 = igP !== null ? igP.t() : 0;',
        'const changed = applyFinding(model, state, tech, finding, collect, effect);',
        'if (igP !== null) igP.applied(igA0);'
      ].join('\n')
    }),
    // --- techniques.js -----------------------------------------------------------------------------------------------
    Object.freeze({
      id: 'profile.context-check', file: TECHNIQUES, anchor: CREATE_CONTEXT, position: 'replace',
      find: 'check: budget === null ? noop : function check() { budget.check(); },',
      code: 'check: budget === null ? noop : (' + viaProfile(P + '.countedCheck(budget)',
        'function check() { budget.check(); }') + '),'
    }),
    // --- dfs-solver.js -----------------------------------------------------------------------------------------------
    Object.freeze({
      id: 'profile.dfs-entry', file: DFS, anchor: SEARCH, position: 'bodyStart',
      code: 'if (' + P + ' !== undefined) ' + P + '.c.dfsEntries++;'
    }),
    Object.freeze({
      id: 'profile.dfs-check', file: DFS, anchor: SEARCH, position: 'replace',
      find: 'ws.budget.check();',
      code: ['if (' + P + ' !== undefined) ' + P + '.c.dfsChecks++;', 'ws.budget.check();'].join('\n')
    }),
    Object.freeze({
      id: 'profile.dfs-backtrack', file: DFS, anchor: SEARCH, position: 'replace',
      find: 'if (++ws.backtracks > ws.maxBacktracks) {',
      code: ['if (' + P + ' !== undefined) ' + P + '.c.dfsBacktracks++;', 'if (++ws.backtracks > ws.maxBacktracks) {']
        .join('\n')
    }),
    // --- digger.js: pipeline steps -----------------------------------------------------------------------------------
    Object.freeze({
      id: 'profile.stage-open', file: DIGGER, anchor: STAGE, position: 'bodyStart',
      code: 'const igStep = ' + P + ' !== undefined ? ' + P + '.stepOpen(stepId, args) : 0;'
    }),
    Object.freeze({
      id: 'profile.stage-close', file: DIGGER, anchor: STAGE, position: 'replace',
      find: 'timings[stepId] = (timings[stepId] || 0) + (now() - t0);',
      code: ['timings[stepId] = (timings[stepId] || 0) + (now() - t0);',
        'if (igStep !== 0) ' + P + '.stepClose(igStep, stepId);'].join('\n')
    }),
    // --- digger.js: stage A and stage B ------------------------------------------------------------------------------
    Object.freeze({
      id: 'profile.oracle', file: DIGGER, anchor: DIG_STEPS, position: 'replace',
      find: 'if (oracle(model, givens, solution, group, budget, stats)) {',
      code: 'if (' + viaProfile(P + '.oracleCall(oracle, model, givens, solution, group, budget, stats)',
        'oracle(model, givens, solution, group, budget, stats)') + ') {'
    }),
    Object.freeze({
      id: 'profile.objective', file: DIGGER, anchor: GUIDED, position: 'replace',
      find: 'const value = objective(givens, solution, group, ctx.budget, stats);',
      code: 'const value = ' + viaProfile(
        P + '.call(\'stageB.objective\', objective, givens, solution, group, ctx.budget, stats)',
        'objective(givens, solution, group, ctx.budget, stats)') + ';'
    }),
    Object.freeze({
      id: 'profile.guided-round', file: DIGGER, anchor: GUIDED, position: 'replace',
      find: 'const pool = candidates.length > limit ? candidates.slice(0, limit) : candidates;',
      code: ['const pool = candidates.length > limit ? candidates.slice(0, limit) : candidates;',
        'if (' + P + ' !== undefined) ' + P + '.guidedRound(candidates.length, pool.length);'].join('\n')
    }),
    Object.freeze({
      id: 'profile.refusal', file: DIGGER, anchor: REFUSAL, position: 'bodyStart',
      code: 'if (' + P + ' !== undefined) ' + P + '.refusal(value);'
    }),
    // --- digger.js: the counts of the safety net, the keeper and the local search ------------------------------------------
    Object.freeze({
      id: 'profile.safety', file: DIGGER, anchor: SECURE, position: 'replace',
      find: 'const unique = SG.dfs.countSolutions(model, dug.givens, 2, ctx.budget) === 1;',
      code: 'const unique = (' + viaProfile(
        P + '.call(\'safety.count\', SG.dfs.countSolutions, model, dug.givens, 2, ctx.budget)',
        'SG.dfs.countSolutions(model, dug.givens, 2, ctx.budget)') + ') === 1;'
    }),
    Object.freeze({
      id: 'profile.keeper', file: DIGGER, anchor: KEEPER, position: 'replace',
      find: 'const count = countWithin(candidate.model, candidate.givens, budget);',
      code: 'const count = ' + viaProfile(
        P + '.call(\'keeper.count\', countWithin, candidate.model, candidate.givens, budget)',
        'countWithin(candidate.model, candidate.givens, budget)') + ';'
    }),
    // --- digger.js: samples, proposal rating and refinement ----------------------------------------------------------------
    Object.freeze({
      id: 'profile.level-enter', file: DIGGER, anchor: DIG_LEVEL, position: 'bodyStart',
      code: 'if (' + P + ' !== undefined) ' + P + '.levelEnter(options);'
    }),
    Object.freeze({
      id: 'profile.proposal-rating', file: DIGGER, anchor: DIG_LEVEL, position: 'replace',
      find: 'const first = rateCounted(dugModel, givens, budget, caps);',
      code: 'const first = ' + viaProfile(
        P + '.call(\'proposal.rating\', rateCounted, dugModel, givens, budget, caps)',
        'rateCounted(dugModel, givens, budget, caps)') + ';'
    }),
    Object.freeze({
      id: 'profile.proposal-refine', file: DIGGER, anchor: DIG_LEVEL, position: 'replace',
      find: 'const refined = refineDown(dugModel, solution, givens, first, spec, rng.fork(\'refine\'), resolved);',
      code: 'const refined = ' + viaProfile(
        P + '.call(\'refine\', refineDown, dugModel, solution, givens, first, spec, rng.fork(\'refine\'), resolved)',
        'refineDown(dugModel, solution, givens, first, spec, rng.fork(\'refine\'), resolved)') + ';'
    }),
    Object.freeze({
      id: 'profile.sample-result', file: DIGGER, anchor: DIG_LEVEL, position: 'replace',
      find: 'scope.metrics = ratingMetrics(dug.clues, rating);',
      code: ['scope.metrics = ratingMetrics(dug.clues, rating);',
        'if (' + P + ' !== undefined) {',
        '  ' + P + '.sampleResult({ exact: exact, shallow: shallow, rating: rating, clues: dug.clues, stats: dug.stats });',
        '}'].join('\n')
    }),
    // --- digger.js: the local search ---------------------------------------------------------------------------------------------
    Object.freeze({
      id: 'profile.search-strategy', file: DIGGER, anchor: SEARCH_STRATEGY, position: 'bodyStart',
      code: 'if (' + P + ' !== undefined) ' + P + '.localNext();'
    }),
    Object.freeze({
      id: 'profile.local-open', file: DIGGER, anchor: LOCAL_STEPS, position: 'bodyStart',
      code: 'const igLocal = ' + P + ' !== undefined ? ' + P + '.open(\'local.search\') : 0;'
    }),
    Object.freeze({
      id: 'profile.local-close', file: DIGGER, anchor: LOCAL_STEPS, position: 'replace',
      find: 'leaveLocal(caps, local);',
      code: ['leaveLocal(caps, local);', 'if (igLocal !== 0) ' + P + '.close(igLocal);'].join('\n')
    }),
    Object.freeze({
      id: 'profile.local-refine', file: DIGGER, anchor: RUN_LOCAL, position: 'replace',
      find: 'const refined = refineDown(model, solution, givens, rating, spec, rng.fork(\'refine\'), ctx);',
      code: 'const refined = ' + viaProfile(
        P + '.call(\'refine\', refineDown, model, solution, givens, rating, spec, rng.fork(\'refine\'), ctx)',
        'refineDown(model, solution, givens, rating, spec, rng.fork(\'refine\'), ctx)') + ';'
    }),
    Object.freeze({
      id: 'profile.local-unique', file: DIGGER, anchor: RUN_LOCAL, position: 'replace',
      find: 'seen.unique = uniqueWithin(candModel, cand, budget);',
      code: 'seen.unique = ' + viaProfile(
        P + '.call(\'local.unique\', uniqueWithin, candModel, cand, budget)',
        'uniqueWithin(candModel, cand, budget)') + ';'
    }),
    Object.freeze({
      id: 'profile.local-rating', file: DIGGER, anchor: RUN_LOCAL, position: 'replace',
      find: 'seen.rating = rateCounted(candModel, cand, budget, caps);',
      code: 'seen.rating = ' + viaProfile(
        P + '.call(\'local.rating\', rateCounted, candModel, cand, budget, caps)',
        'rateCounted(candModel, cand, budget, caps)') + ';'
    })
  ])
});
