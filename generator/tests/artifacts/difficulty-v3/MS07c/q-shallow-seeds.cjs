'use strict';

// MS07c scratch: classic9 Nightmare requests of one attempt that end as a shallow fallback (exact false, the two
// warnings, a Nightmare rating) at the selected cutoff, for the seeds 1 to 40: the specimen the cache and worker
// suites need (seed 42 became exact when C changed from 6 to 4).
const SG = globalThis.SG;
const found = [];
for (let seed = 1; seed <= 40; seed++) {
  const t0 = Date.now();
  const r = SG.pipeline.run({ variantId: 'classic9', difficulty: 'nightmare', seed: seed, trace: 'off', maxAttempts: 1 }, null);
  const shallow = r.exact === false && r.rating.level === 'nightmare' &&
    JSON.stringify(r.warnings) === JSON.stringify(['difficulty.approximate', 'difficulty.shallow']);
  console.log('seed ' + seed + ' exact ' + r.exact + ' level ' + r.rating.level + ' score ' + r.rating.score + ' warnings ' +
    r.warnings.join('+') + ' ' + (Date.now() - t0) + ' ms' + (shallow ? '  <- shallow fallback' : ''));
  if (shallow) found.push(seed);
}
console.log('shallow fallbacks: ' + JSON.stringify(found));
