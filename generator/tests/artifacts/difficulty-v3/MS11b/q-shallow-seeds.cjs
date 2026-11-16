'use strict';

// MS11b scratch (from MS08c's q-shallow-seeds.cjs): classic9 Nightmare requests of one attempt that end as a shallow
// fallback (exact false, the two warnings, a Nightmare rating) with the Unique Rectangle hidden form registered, for the
// seeds 1 to 40, stopping after the third: the specimen the cache, worker and pipeline suites need (seed 21, the specimen
// of MS08a, became exact when the hidden form joined: its regression hash changed). Usage (from generator/):
//   node tests/artifacts/difficulty-v3/MS11b/q-shallow-seeds.cjs
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
