'use strict';
// Scratch (MS11a): real positions with a Unique Rectangle of type 3 or 4 among seeded dug puzzles (unique by construction).
// The position is the one after every unscoped technique of the registry below uniqueRectangle (the logical solver
// restricted to them: through wWing), asked of the registered finder with assumeUniqueness true. The cutoff is the order
// of the registered uniqueRectangle (180): it is asserted, and so is that the prefix does not contain it. Every position is
// counted by the key of its first Finding; the first PRINT_LIMIT hits of each subtype are printed. A bounded scan: seed,
// count and first index come from the arguments.
//   node tests/artifacts/difficulty-v3/MS11a/explore-dug.js <seed> <count> [from] [below|propagated|initial]
const SG = require('./load.js');
const H = SG.techHelper;
const model = H.model('classic9');
const seed = Number(process.argv[2] || 777);
const count = Number(process.argv[3] || 100);
const from = Number(process.argv[4] || 0);
const mode = process.argv[5] || 'below';
const PRINT_LIMIT = 12;
const cutoff = SG.techniques.get('uniqueRectangle').order;
if (cutoff !== 180) throw new Error('uniqueRectangle is registered at order ' + cutoff + ', not 180');
const before = SG.techniques.list().filter((t) => t.order < cutoff && t.variantScope === null).map((t) => t.id);
if (before.indexOf('uniqueRectangle') !== -1) throw new Error('the prefix holds uniqueRectangle');
console.log('explore-dug: seed ' + seed + ', puzzles ' + count + ' from ' + from + ', mode ' + mode + ', model ' +
  model.variantId + ', cutoff = order of uniqueRectangle = ' + cutoff + ', prefix of ' + before.length +
  ' techniques (' + before.join(' ') + '), print limit ' + PRINT_LIMIT);
const find = SG.techniques.get('uniqueRectangle').find;
const rng = SG.testkit.rng.create(seed);
const t0 = Date.now();
const items = H.randomStatesWithKnownSolution(model, rng, count * 4);
const counts = {};
const printed = {};
let attempted = 0;
let solvedBefore = 0;
let capped = 0;
let calls = 0;
let mostWork = 0;
for (let i = 0; i < items.length; i += 4) {
  const index = i / 4;
  if (index < from) continue;
  const item = items[i];
  attempted++;
  const puzzle = H.puzzleString(model, item.givens);
  const state = mode === 'below' ? H.stateAfter(model, puzzle, before) :
    H.makeState(model, puzzle, { propagate: mode === 'propagated' });
  if (state.unsolvedCount === 0) solvedBefore++;
  const records = [];
  const ctx = SG.techniques.createContext(model, { assumeUniqueness: true, onPatternWork: (r) => records.push(r) });
  const f = find(model, state, ctx);
  if (records.length > 0) {
    calls++;
    mostWork = Math.max(mostWork, records[0].work);
    if (records[0].capHit !== null) capped++;
  }
  if (f === null) continue;
  f.eliminations.forEach((e) => {
    if (item.solution[e[0]] === e[1]) {
      console.log('UNSOUND #' + index + ' ' + puzzle + ' ' + JSON.stringify(f));
      process.exitCode = 3;
    }
  });
  const key = f.i18nKey.replace('technique.uniqueRectangle.', '').replace('.step', '');
  counts[key] = (counts[key] || 0) + 1;
  printed[key] = (printed[key] || 0) + 1;
  if (key === 'type1' || key === 'type2') {
    if (printed[key] <= 3) {
      console.log('#' + index + ' ' + puzzle + ' ' + key + ' args ' + JSON.stringify(f.i18nArgs) + ' cells ' +
        JSON.stringify(f.cells) + ' elim ' + f.eliminations.map((e) => H.label(model, e[0]) + '-' + e[1] + '(' + e[0] + ')').join(' '));
    }
  } else if (printed[key] <= PRINT_LIMIT) {
    console.log('#' + index + ' ' + puzzle + ' ' + key + ' roofs ' + f.i18nArgs.roof1 + ' ' + f.i18nArgs.roof2 +
      ' digits ' + f.i18nArgs.digits.join('') + (f.i18nArgs.partDigits ? ' part ' + f.i18nArgs.partDigits.join('') +
      ' real ' + f.i18nArgs.cells.join(' ') : ' removed ' + f.i18nArgs.digit) + ' unit ' + f.i18nArgs.unit + ' elim ' +
      f.eliminations.map((e) => H.label(model, e[0]) + '-' + e[1]).join(' ') + ' work ' + (records[0] ? records[0].work : '-'));
  }
}
console.log('seed ' + seed + ' puzzles ' + count + ' (from ' + from + '): attempted ' + attempted +
  ', fully solved by the prefix ' + solvedBefore + ', first Findings by subtype ' + JSON.stringify(counts) +
  ', calls that ran the second pass ' + calls + ', most work ' + mostWork + ', capped calls ' + capped + ', ' +
  ((Date.now() - t0) / 1000).toFixed(1) + ' s');
