'use strict';

/*
 * MS07b scratch: explains the changed regression hashes. For each key `variant/level#seed` it generates the puzzle
 * through the pipeline (the way `perf.js --hash-record` does) and prints one JSON line: the hash, the attempts, the
 * clues, the score of the rating and the hardest technique with the counts of the chain and nishio steps.
 * SG_CHAIN_FILE=<file> loads that file instead of core/js/engine/tech-chain.js (the accepted MS07a copy for the old side).
 *
 *   node tests/artifacts/difficulty-v3/MS07b/explain-hashes.js classic9/nightmare#2 ...
 */
const SG = require('./load-override.js');

process.argv.slice(2).forEach((key) => {
  const [combo, seedText] = key.split('#');
  const [variant, level] = combo.split('/');
  const seed = Number(seedText);
  const records = SG.fixtures.toolRecords;
  const started = Date.now();
  const run = records.withRequestedLevel(variant, level, () =>
    SG.pipeline.run({ variantId: variant, difficulty: level, seed: seed, trace: 'off' }, null));
  const result = run.value;
  const rating = result.rating || {};
  const counts = rating.techniqueCounts || {};
  const pick = {};
  ['forcingChain', 'forcingChainLong', 'nishio', 'nishioDeep'].forEach((id) => {
    if (counts[id]) pick[id] = counts[id];
  });
  console.log(JSON.stringify({
    key: key,
    hash: SG.fixtures.perfTools.hashRecord(variant, level, seed).hash,
    attempts: result.attempts,
    clues: result.clues,
    score: rating.score,
    hardest: rating.hardestTechnique,
    chainSteps: pick,
    ms: Date.now() - started
  }));
});
