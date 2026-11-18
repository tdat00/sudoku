'use strict';

/*
 * MS17b scratch (read-only diagnosis of the GD #21 failure, ~seconds): replays the `capped` helper of the manual `difficulty` suite
 * ("digger.generate: the full-rating cap of an attempt (section 5.7 (9))") for classic9 at one level, seeds 1..12, maxRatings 3,
 * digTries 1, and prints for each seed which phase made each full `SG.difficulty.rate` call (the test's own classification of the
 * stack: refine, search, cages, signs, sample), the error code or the achieved level. The test needs, at some seed, exactly
 * `maxRatings` ratings with the last one made inside `phase`.
 *   node tests/artifacts/difficulty-v3/MS17b/cap-diagnosis.cjs [level] [phase] [maxRatings] [lastSeed]   (from generator/;
 *   defaults nightmare refine 3 12, the test's own search)
 * MS16_BASE=git:<commit> makes the loader use the sources of that commit instead of the tree (read-only, in memory).
 * The first version (seeds 1..12 and cap 3 hardcoded, a footer that always said "third"), which produced the earlier outputs, is
 * kept as cap-diagnosis.v1.cjs; this version takes the cap and the last seed as arguments and labels its footer with them.
 */
const SG = require('../MS16/load.js');
const D = SG.difficulty;
const level = process.argv[2] || 'nightmare';
const phase = process.argv[3] || 'refine';
const LEVELS = D.LEVELS;

function capped(variantId, lvl, seed, maxRatings, digTries) {
  const def = SG.variants.get(variantId);
  const support = def.difficultySupport;
  def.difficultySupport = LEVELS.slice();
  const rate = D.rate;
  const origins = [];
  D.rate = function () {
    const stack = String(new Error().stack);
    origins.push(/refineDown/.test(stack) ? 'refine' : /localSearchSteps/.test(stack) ? 'search'
      : /searchCagesSteps/.test(stack) ? 'cages' : /digSignsSteps/.test(stack) ? 'signs' : 'sample');
    return rate.apply(this, arguments);
  };
  try {
    const model = def.build(SG.variants.defaultOptions(variantId), SG.rng.create(seed).fork('model'));
    let puzzle = null;
    let error = null;
    try {
      puzzle = SG.digger.generate(model, lvl, SG.rng.create(seed), {
        maxAttempts: 1, digTries, maxRatings, postGenerate: def.postGenerate || null,
        strategy: SG.digger.getStrategy(def.digStrategy || 'cells'), strategyId: def.digStrategy || 'cells'
      });
    } catch (err) {
      error = err;
    }
    return { puzzle, error, origins };
  } finally {
    D.rate = rate;
    def.difficultySupport = support;
  }
}

const cap = Number(process.argv[4] || 3);
const lastSeed = Number(process.argv[5] || 12);
let found = 0;
for (let seed = 1; seed <= lastSeed; seed++) {
  const run = capped('classic9', level, seed, cap, 1);
  const hit = run.origins.length === cap && run.origins[cap - 1] === phase;
  if (hit) found++;
  console.log('seed ' + String(seed).padStart(2) + ': ratings ' + run.origins.length + ' [' + run.origins.join(', ') + '] ' +
    (run.error ? 'error ' + run.error.code : 'achieved ' + run.puzzle.achieved + ' exact ' + run.puzzle.exact) + (hit ? '  <- ' + phase : ''));
}
console.log('seeds 1..' + lastSeed + ' whose rating number ' + cap + ' (the last one allowed by the cap) is made in ' + phase + ' at ' + level +
  ' with maxRatings ' + cap + ': ' + found);
