'use strict';

// MS08b scratch (from MS07c's q-shallow-seeds.cjs): classic9 Nightmare requests of one attempt that end as a shallow
// fallback (exact false, the two warnings, a Nightmare rating) with the skyscraper registered, for the seeds 1 to 40,
// stopping after the third: the specimen the cache, worker and pipeline suites need (seed 5 became exact when the
// skyscraper joined, as seed 42 did with C = 4). Usage (from generator/): node tests/artifacts/difficulty-v3/MS08b/q-shallow-seeds.cjs
const SG = require('./load.js');
const found = [];
for (let seed = 1; seed <= 40 && found.length < 3; seed++) {
  const t0 = Date.now();
  const r = SG.pipeline.run({ variantId: 'classic9', difficulty: 'nightmare', seed: seed, trace: 'off', maxAttempts: 1 }, null);
  const shallow = r.exact === false && r.rating.level === 'nightmare' &&
    JSON.stringify(r.warnings) === JSON.stringify(['difficulty.approximate', 'difficulty.shallow']);
  console.log('seed ' + seed + ' exact ' + r.exact + ' level ' + r.rating.level + ' score ' + r.rating.score + ' warnings ' +
    r.warnings.join('+') + ' ' + (Date.now() - t0) + ' ms' + (shallow ? '  <- shallow fallback' : ''));
  if (shallow) found.push(seed);
}
console.log('shallow fallbacks: ' + JSON.stringify(found));
