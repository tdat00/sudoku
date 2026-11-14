'use strict';

/*
 * Private adapter of IG-S02 (S5a): the smallest in-memory change that lets one worker run exactly one attempt of
 * `SG.digger.generateAttempts` by its absolute ordinal and hand back its separate state. It rewrites only the
 * source strings of a private worker instance (never a file); the native engine is never patched.
 *
 * Without `SG.__igPool` the patched code is the native code: every addition is guarded by it.
 *  1. the attempt loop runs from the absolute ordinal to that same ordinal (one attempt), so the forks `grid#a`,
 *     `extra#a`, `dig#a.t` and `search#a` keep their native labels and the caps, sample alternation, variant
 *     hook and local continuation are the code of the native loop;
 *  2. the run's keeper gets a ledger and `createKeeper` reports every offer that reaches its distance test and
 *     every offer it counts (distance, DFS count including unknown), so the host can replay the serial keeper;
 *  3. before the native end-of-attempt merge the attempt hands its state to `SG.__igPool.capture`, which keeps
 *     the first-best sample, the local terminal candidate, the keeper and the work apart.
 * The host performs the end-of-attempt merge itself, in native order (see attempt-pool.cjs).
 */
const FILE = 'js/engine/digger.js';
const GENERATE = 'function* generateAttempts(model, level, rng, options, work) {';
const KEEPER = 'function createKeeper(spec, level, budget) {';

module.exports = Object.freeze({
  id: 'attempt-pool',
  version: 1,
  description: 'Runs one absolute attempt of SG.digger.generateAttempts and exposes its keeper offers.',
  transforms: Object.freeze([
    Object.freeze({
      id: 'attempt-pool.attempt-loop',
      file: FILE,
      anchor: GENERATE,
      position: 'replace',
      find: 'for (let attempt = 1; attempt <= maxAttempts; attempt++) {',
      code: [
        'const igOnly = SG.__igPool !== undefined && SG.__igPool.attempt > 0 ? SG.__igPool.attempt : 0;',
        'for (let attempt = igOnly || 1; attempt <= (igOnly || maxAttempts); attempt++) {'
      ].join('\n')
    }),
    Object.freeze({
      id: 'attempt-pool.keeper-ledger',
      file: FILE,
      anchor: GENERATE,
      position: 'replace',
      find: 'const keeper = createKeeper(spec, level, budget);',
      code: [
        'const keeper = createKeeper(spec, level, budget);',
        'if (SG.__igPool !== undefined) SG.__igPool.attachKeeper(keeper);'
      ].join('\n')
    }),
    Object.freeze({
      id: 'attempt-pool.offer-met',
      file: FILE,
      anchor: KEEPER,
      position: 'replace',
      find: 'if (!(distance < keeper.distance)) return false;',
      code: [
        'if (keeper.igLedger !== undefined) keeper.igLedger.met(distance, keeper.distance);',
        'if (!(distance < keeper.distance)) return false;'
      ].join('\n')
    }),
    Object.freeze({
      id: 'attempt-pool.offer-counted',
      file: FILE,
      anchor: KEEPER,
      position: 'replace',
      find: 'const count = countWithin(candidate.model, candidate.givens, budget);',
      code: [
        'const count = countWithin(candidate.model, candidate.givens, budget);',
        'if (keeper.igLedger !== undefined) keeper.igLedger.counted(candidate, distance, count);'
      ].join('\n')
    }),
    Object.freeze({
      id: 'attempt-pool.capture',
      file: FILE,
      anchor: GENERATE,
      position: 'replace',
      find: 'if (keeper.best !== null && keeper.distance < bestDistance) {',
      code: [
        'if (igOnly > 0) {',
        '  return SG.__igPool.capture({',
        '    model: model, level: level, spec: spec, attempt: attempt, caps: caps, keeper: keeper,',
        '    samples: samples, attemptBest: attemptBest, attemptDistance: attemptDistance, searched: searched,',
        '    searchedDistance: searched !== null ?',
        '      qualityOf(searched.rating, spec, level, searched.model) : null,',
        '    unsound: unsound, maxAttempts: maxAttempts, digTries: digTries',
        '  });',
        '}',
        'if (keeper.best !== null && keeper.distance < bestDistance) {'
      ].join('\n')
    })
  ])
});
