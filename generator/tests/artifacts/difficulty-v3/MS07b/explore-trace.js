'use strict';

// MS07b scratch: finds the seeds at which a real full trace of a classic9 request is longer than 2000 events while
// its non-micro (step) events fit the cap (the premise of the pipeline test "a real trace, capped to 2000 events").
//   node explore-trace.js <level> <firstSeed> <lastSeed>
const SG = require('./load.js');

const level = process.argv[2] || 'hell1';
const from = Number(process.argv[3] || 1);
const to = Number(process.argv[4] || 12);
for (let seed = from; seed <= to; seed++) {
  const events = [];
  const started = Date.now();
  const result = SG.pipeline.run({ variantId: 'classic9', difficulty: level, seed: seed, trace: 'full' },
    (e) => { events.push(e); });
  const steps = events.filter((e) => e.type !== 'micro').length;
  const capped = SG.events.capTrace(events, 2000).length;
  console.log(JSON.stringify({ level, seed, total: events.length, nonMicro: steps, capped, attempts: result.attempts,
    exact: result.exact, score: result.rating.score, ms: Date.now() - started }));
}
