'use strict';

/*
 * Private adapter of IG-S09 (Greater-Than miss predicate and solve-first diagnostic; provisional (pre-freeze)): the in-memory
 * transforms that hook the capture runtime of greater-than-diagnostic.cjs (published as `SG.__igGt` for the time of one request)
 * into a private copy of the engine, and that carry the arm G1's order of the oracle. It rewrites source strings of a worker
 * instance only, never a file; the native engine is never patched. Each transform has a unique function anchor and a replaced
 * line that occurs exactly once (no line numbers). Without `SG.__igGt` every inserted line is skipped and the patched code is the
 * native code. The hooks observe and count: they draw no random number and change no limit.
 *
 *  - greater-than.js (digSignsSteps and solveWithin): the dig (floors, the clue-floor / unit-floor / solvability-help origin of
 *    every setup reveal, the post-setup parent, the sign passes, every removal question, the tuning reveal) and, only for the
 *    arm G1 and only in the first technique pass of a sample, the oracle that solves first (`SG.__igGt.solveFirst`).
 *  - digger.js (digLevelSteps, searchStrategy, localSearchSteps, countWithin, digGuidedSteps): the start and the end of a dig
 *    sample (kind, attempt, sample, final state, canonical rating, exactness), the local search's entry, the internal uniqueness
 *    count guard (UNIQUE_NODES: calls, budget checks used (search-loop and propagation checks, not search nodes), trips) and the entries of
 *    the stage B objective (not on this path: expected 0).
 *  - dfs-solver.js: the entries of the uniqueness count and the node checks of the search.
 */
const GT = 'js/variants/greater-than.js';
const DIGGER = 'js/engine/digger.js';
const DFS = '../core/js/engine/dfs-solver.js';

const DIG_SIGNS = 'function* digSignsSteps(model, solution, level, rng, options) {';
const SOLVE_WITHIN = 'function solveWithin(model, givens, allowed, budget) {';
const TRACE_PASS = 'function tracePass(phase, name) {';
const REVEAL_GROUP = 'function revealGroup(g) {';
const DIG_LEVEL = 'function* digLevelSteps(model, solution, level, rng, options) {';
const SEARCH_STRATEGY = 'function searchStrategy(candidate) {';
const LOCAL_STEPS = 'function* localSearchSteps(candidate, solution, rng, ctx) {';
const COUNT_WITHIN = 'function countWithin(model, givens, parent) {';
const GUIDED = 'function* digGuidedSteps(model, solution, startGivens, rejected, spec, rng, ctx) {';
const COUNT = 'function countSolutions(model, givens, limit, budget) {';
const SEARCH = 'function search(ws, depth) {';

const G = 'SG.__igGt';

function hook(call) {
  return 'if (' + G + ' !== undefined) ' + G + '.' + call + ';';
}

module.exports = Object.freeze({
  id: 'gt-diagnostic',
  version: 1,
  description: 'Greater-Than sign dig capture (setup origins, passes, removals, samples, internal guards) and the G1 solve-first order.',
  transforms: Object.freeze([
    // --- greater-than.js -----------------------------------------------------------------------------------------------------------
    Object.freeze({ id: 'gt.restricted-solve', file: GT, anchor: SOLVE_WITHIN, position: 'bodyStart',
      code: hook('restrictedSolve()') }),
    Object.freeze({ id: 'gt.dig-begin', file: GT, anchor: DIG_SIGNS, position: 'replace',
      find: 'const allowed = spec.oracle === \'techniques\' ? spec.allowedTechniques : null;',
      code: ['const allowed = spec.oracle === \'techniques\' ? spec.allowedTechniques : null;',
        hook('digBegin({ minClues: minClues, minPerUnit: minPerUnit, symmetry: symmetry, levelIndex: levelIndex, ' +
          'signsTotal: model.inequalities.length, techniques: allowed !== null, budgetPresent: budget !== null, ' +
          'solution: solution, signs: model.inequalities })')].join('\n') }),
    Object.freeze({ id: 'gt.reveal-group', file: GT, anchor: REVEAL_GROUP, position: 'bodyStart', code: hook('group(g)') }),
    Object.freeze({ id: 'gt.reveal-cell', file: GT, anchor: DIG_SIGNS, position: 'replace', find: 'pending.push(c);',
      code: ['pending.push(c);', hook('cell(c)')].join('\n') }),
    Object.freeze({ id: 'gt.trace-pass', file: GT, anchor: TRACE_PASS, position: 'bodyStart',
      code: hook('pass(phase, name, clues)') }),
    Object.freeze({ id: 'gt.removal', file: GT, anchor: DIG_SIGNS, position: 'replace',
      find: 'const reason = oracle(withSigns(model, aliveSigns()));',
      code: ['const reason = ' + G + ' !== undefined ? ' + G + '.removal(idx, name, function () {',
        '  return oracle(withSigns(model, aliveSigns()));',
        '}) : oracle(withSigns(model, aliveSigns()));'].join('\n') }),
    Object.freeze({ id: 'gt.solve-first', file: GT, anchor: DIG_SIGNS, position: 'replace',
      find: 'const reason = uniqueOracle(trial);',
      code: ['if (' + G + ' !== undefined && ' + G + '.solveFirstApplies(allowed !== null)) {',
        '  return ' + G + '.solveFirst(function () { return uniqueOracle(trial); },',
        '    function () { return solveWithin(trial, givens, allowed, budget); },',
        '    function () { stats.oracleCalls++; });',
        '}',
        'const reason = uniqueOracle(trial);'].join('\n') }),
    Object.freeze({ id: 'gt.phase-clue-floor', file: GT, anchor: DIG_SIGNS, position: 'replace',
      find: 'const groupOrder = rng.shuffle(groups.map(function (g, index) { return index; }));',
      code: ['const groupOrder = rng.shuffle(groups.map(function (g, index) { return index; }));',
        hook('phase(\'clue-floor\')')].join('\n') }),
    Object.freeze({ id: 'gt.phase-unit-floor', file: GT, anchor: DIG_SIGNS, position: 'replace',
      find: 'for (let u = 0; u < model.units.length && minPerUnit > 0; u++) {',
      code: [hook('phase(\'unit-floor\')'), 'for (let u = 0; u < model.units.length && minPerUnit > 0; u++) {'].join('\n') }),
    Object.freeze({ id: 'gt.phase-help', file: GT, anchor: DIG_SIGNS, position: 'replace',
      find: 'const report = solveWithin(model, givens, allowed, budget);',
      code: [hook('phase(\'help\')'), 'const report = solveWithin(model, givens, allowed, budget);'].join('\n') }),
    Object.freeze({ id: 'gt.setup-done', file: GT, anchor: DIG_SIGNS, position: 'replace',
      find: 'const caps = options.caps || null;',
      code: [hook('setupDone(givens, clues)'), 'const caps = options.caps || null;'].join('\n') }),
    Object.freeze({ id: 'gt.phase-tune', file: GT, anchor: DIG_SIGNS, position: 'replace',
      find: 'if (!tooHard || round === MAX_TUNE_ROUNDS) break;',
      code: ['if (!tooHard || round === MAX_TUNE_ROUNDS) break;', hook('phase(\'tune\')')].join('\n') }),
    // --- digger.js -------------------------------------------------------------------------------------------------------------------
    Object.freeze({ id: 'dig.sample-start', file: DIGGER, anchor: DIG_LEVEL, position: 'replace',
      find: 'let found = strategy(model, solution, level, rng, resolved);',
      code: [hook('sampleStart({ where: where, proposal: proposal })'),
        'let found = strategy(model, solution, level, rng, resolved);'].join('\n') }),
    Object.freeze({ id: 'dig.strategy-done', file: DIGGER, anchor: DIG_LEVEL, position: 'replace',
      find: 'if (SG.budget.isSteps(found)) found = yield* found;',
      code: ['if (SG.budget.isSteps(found)) found = yield* found;', hook('strategyDone()')].join('\n') }),
    Object.freeze({ id: 'dig.sample-end', file: DIGGER, anchor: DIG_LEVEL, position: 'replace',
      find: 'const shallow = !exact && isComplete(rating, level);',
      code: ['const shallow = !exact && isComplete(rating, level);',
        hook('sampleEnd({ dug: dug, rating: rating, exact: exact, shallow: shallow, caps: caps })')].join('\n') }),
    Object.freeze({ id: 'dig.search-strategy', file: DIGGER, anchor: SEARCH_STRATEGY, position: 'bodyStart',
      code: hook('localNext()') }),
    Object.freeze({ id: 'dig.local-enter', file: DIGGER, anchor: LOCAL_STEPS, position: 'bodyStart',
      code: hook('localEnter(candidate)') }),
    Object.freeze({ id: 'dig.count-within-start', file: DIGGER, anchor: COUNT_WITHIN, position: 'bodyStart',
      code: hook('countWithinStart()') }),
    Object.freeze({ id: 'dig.count-within-end', file: DIGGER, anchor: COUNT_WITHIN, position: 'replace',
      find: 'return SG.dfs.countSolutions(model, givens, 2, slice);',
      code: ['const answer = SG.dfs.countSolutions(model, givens, 2, slice);', hook('countWithinEnd(used, false)'),
        'return answer;'].join('\n') }),
    Object.freeze({ id: 'dig.count-within-trip', file: DIGGER, anchor: COUNT_WITHIN, position: 'replace',
      find: 'if (err instanceof SG.errors.GenerationError && err.code === UNIQUE_GUARD_CODE) return null;',
      code: ['if (err instanceof SG.errors.GenerationError && err.code === UNIQUE_GUARD_CODE) {',
        '  ' + hook('countWithinEnd(used, true)'), '  return null;', '}'].join('\n') }),
    Object.freeze({ id: 'dig.guided-entry', file: DIGGER, anchor: GUIDED, position: 'replace',
      find: 'const objective = removalObjective(model, spec, ctx.proposal === true);',
      code: ['const objective = removalObjective(model, spec, ctx.proposal === true);', hook('guidedEntry()')].join('\n') }),
    // --- dfs-solver.js ---------------------------------------------------------------------------------------------------------------
    Object.freeze({ id: 'dfs.count-entry', file: DFS, anchor: COUNT, position: 'bodyStart', code: hook('dfsEntry()') }),
    Object.freeze({ id: 'dfs.check', file: DFS, anchor: SEARCH, position: 'replace', find: 'ws.budget.check();',
      code: [hook('dfsCheck()'), 'ws.budget.check();'].join('\n') })
  ])
});
