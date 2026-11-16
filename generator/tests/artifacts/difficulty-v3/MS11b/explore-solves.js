'use strict';
// Scratch (MS11b): do the Unique Rectangle subtypes 3 and 4 occur in a complete logical solve of a real (dug) puzzle? The
// complete ladder of the registry is allowed (allowedTechniques null, assumeUniqueness true); the step list gives the
// techniques used. A puzzle QUALIFIES for a subtype only when the solve is complete (`report.solved`) and has a
// uniqueRectangle step of that subtype; an unsolved trace with the step is counted apart and supplies no source. Every
// puzzle of the population is attempted (no stop at the first hit); the first PRINT_LIMIT qualifying puzzles of each
// subtype are printed, lowest index first, with their original givens. Also counted: the solves whose hardest
// technique is uniqueRectangle. The seed and the count are the arguments.
//   node tests/artifacts/difficulty-v3/MS11b/explore-solves.js <seed> <count> [from]
const SG = require('./load.js');
const H = SG.techHelper;
const model = H.model('classic9');
const seed = Number(process.argv[2] || 777);
const count = Number(process.argv[3] || 200);
const from = Number(process.argv[4] || 0);
const PRINT_LIMIT = 6;
const KEYS = ['type1', 'type2', 'type3', 'type4'];
console.log('explore-solves: seed ' + seed + ', puzzles ' + count + ' from ' + from + ', model ' + model.variantId +
  ', uniqueRectangle order ' + SG.techniques.get('uniqueRectangle').order +
  ', solver options {"allowedTechniques":null,"assumeUniqueness":true}, qualifying = report.solved && a step of the ' +
  'subtype, print limit ' + PRINT_LIMIT + ' per subtype');
const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), count * 4);
const t0 = Date.now();
let attempted = 0;
let solved = 0;
let hardestUr = 0;
const qualifying = { type1: 0, type2: 0, type3: 0, type4: 0 };
const steps = { type1: 0, type2: 0, type3: 0, type4: 0 };
const unsolvedWithStep = { type1: 0, type2: 0, type3: 0, type4: 0 };
const printed = { type1: 0, type2: 0, type3: 0, type4: 0 };
const indices = { type3: [], type4: [] };
for (let i = 0; i < items.length; i += 4) {
  const index = i / 4;
  if (index < from) continue;
  const givens = items[i].givens;
  attempted++;
  const report = SG.logicalSolver.solve(model, givens, { allowedTechniques: null, assumeUniqueness: true });
  if (report.solved) solved++;
  if (report.hardestTechnique === 'uniqueRectangle') hardestUr++;
  KEYS.forEach((key) => {
    const own = report.steps.filter((s) => s.technique === 'uniqueRectangle' &&
      s.i18nKey === 'technique.uniqueRectangle.' + key + '.step');
    if (own.length > 0 && !report.solved) unsolvedWithStep[key]++;
    if (report.solved && own.length > 0) {
      qualifying[key]++;
      steps[key] += own.length;
      if (indices[key]) indices[key].push(index);
      printed[key]++;
      if (printed[key] <= PRINT_LIMIT && (key === 'type3' || key === 'type4')) {
        console.log('#' + index + ' ' + H.puzzleString(model, givens) + ' ' + key + ' steps ' + own.length + ' of ' +
          report.steps.length + '; hardest ' + report.hardestTechnique);
      }
    }
  });
}
console.log('seed ' + seed + ' puzzles ' + count + ' (from ' + from + '): attempted ' + attempted + ', solved ' + solved +
  ' (' + (100 * solved / attempted).toFixed(2) + ' % of the attempted); qualifying solves per subtype ' +
  JSON.stringify(qualifying) + ' (' + KEYS.map((k) => k + ' ' + (100 * qualifying[k] / attempted).toFixed(4) + ' %').join(', ') +
  ' of the attempted); steps in those solves ' + JSON.stringify(steps) + '; unsolved traces with the step ' +
  JSON.stringify(unsolvedWithStep) + '; solves whose hardest technique is uniqueRectangle ' + hardestUr);
console.log('qualifying indices, lowest first: type3 ' + indices.type3.slice(0, 30).join(',') +
  (indices.type3.length > 30 ? ',...(' + indices.type3.length + ' in all)' : '') + '; type4 ' +
  indices.type4.slice(0, 30).join(',') + (indices.type4.length > 30 ? ',...(' + indices.type4.length + ' in all)' : '') +
  ', ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
