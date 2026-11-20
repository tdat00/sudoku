'use strict';

/*
 * MS06c2: the REAL request of the MS05r3 allowance tests in `pipeline.test.js` ("a real 9x9 Master request whose local
 * search meets shallow states and keeps going after them"). Under the active target policy seed 1 no longer has
 * a local search with more than 64 ratings after its first shallow state (62), so the premise is looked for again among
 * the first 25 seeds, as the comment of the test says. For each seed it prints the first local search of the attempt:
 * firstShallowAt, shallowRatings, ratings and what ended it. It stops starting seeds after the time budget.
 *
 *   node tests/artifacts/difficulty-v3/MS06c2/probe-real-seeds.cjs --from=1 --count=25 [--budget-seconds=400]
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

function loadSources() {
  const runner = fs.readFileSync(path.join(ROOT, 'tests/node-runner.js'), 'utf8');
  const match = /const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner);
  const files = (match[1].match(/'[^']+'/g) || []).map((s) => s.slice(1, -1));
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    if (fs.existsSync(abs)) vm.runInThisContext(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''), { filename: abs });
  }
  return globalThis.SG;
}

const args = {};
process.argv.slice(2).forEach((a) => {
  const m = /^--([a-z-]+)=(.+)$/.exec(a);
  if (m) args[m[1]] = m[2];
});
const from = Number(args.from || 1);
const count = Number(args.count || 25);
const budget = Number(args['budget-seconds'] || 400);

const SG = loadSources();
const model9 = SG.variants.get('classic9').build({}, null);
const started = Date.now();
for (let seed = from; seed < from + count; seed++) {
  if ((Date.now() - started) / 1000 > budget) {
    console.log('stopped before seed ' + seed + ' (budget)');
    break;
  }
  const t0 = Date.now();
  SG.digger.SHALLOW_SEARCH_RATINGS = Infinity;
  const out = SG.digger.generate(model9, 'master', SG.rng.create(seed), { maxAttempts: 1 });
  const searches = out.work[0].localSearches;
  const first = searches[0] || null;
  console.log('seed ' + seed + ' exact ' + out.exact + ' searches ' + searches.length + ' ' + (first ? JSON.stringify({
    ratings: first.ratings, proposals: first.proposals, firstShallowAt: first.firstShallowAt,
    shallowRatings: first.shallowRatings, capHit: first.capHit }) : 'none') + ' ' +
    ((Date.now() - t0) / 1000).toFixed(1) + ' s');
}
