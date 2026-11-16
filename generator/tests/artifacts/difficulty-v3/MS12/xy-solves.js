'use strict';
// Scratch (MS12, adapted from MS11c's explore-solves.js): does xyChain occur in a complete logical solve of a real (dug)
// puzzle? The complete ladder of the registry is allowed (allowedTechniques null); the step list gives the techniques used.
// A puzzle QUALIFIES only when the solve is complete (`report.solved`) and has an xyChain step; an unsolved trace with the step is
// counted apart. Every puzzle of the population is attempted (no stop at the first hit); the first PRINT_LIMIT qualifying puzzles
// are printed, lowest index first, with their original givens. Also counted: the solves whose hardest technique is xyChain, and
// the lengths of the xyChain steps. The seed and the count are the arguments.
//   node tests/artifacts/difficulty-v3/MS12/xy-solves.js <seed> <count> [from]
const SG = require('./load.js');
const H = SG.techHelper;
const model = H.model('classic9');
const seed = Number(process.argv[2] || 4242);
const count = Number(process.argv[3] || 200);
const from = Number(process.argv[4] || 0);
const PRINT_LIMIT = Number(process.env.PRINT_LIMIT || 12);
console.log('xy-solves: seed ' + seed + ', puzzles ' + count + ' from ' + from + ', model ' + model.variantId +
  ', xyChain order ' + SG.techniques.get('xyChain').order +
  ', solver options {"allowedTechniques":null,"assumeUniqueness":true}, qualifying = report.solved && an xyChain step, ' +
  'print limit ' + PRINT_LIMIT);
const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), count * 4);
const t0 = Date.now();
let attempted = 0;
let solved = 0;
let hardestXy = 0;
let qualifying = 0;
let steps = 0;
let unsolvedWithStep = 0;
let printed = 0;
const indices = [];
const byLength = {};
for (let i = 0; i < items.length; i += 4) {
  const index = i / 4;
  if (index < from) continue;
  const givens = items[i].givens;
  attempted++;
  const report = SG.logicalSolver.solve(model, givens, { allowedTechniques: null, assumeUniqueness: true });
  if (report.solved) solved++;
  if (report.hardestTechnique === 'xyChain') hardestXy++;
  const own = report.steps.filter((s) => s.technique === 'xyChain');
  if (own.length > 0 && !report.solved) unsolvedWithStep++;
  if (report.solved && own.length > 0) {
    qualifying++;
    steps += own.length;
    own.forEach((s) => { byLength[s.i18nArgs.length] = (byLength[s.i18nArgs.length] || 0) + 1; });
    indices.push(index);
    if (++printed <= PRINT_LIMIT) {
      console.log('#' + index + ' ' + H.puzzleString(model, givens) + ' xyChain steps ' + own.length + ' of ' +
        report.steps.length + ' (first at step ' + (report.steps.findIndex((s) => s.technique === 'xyChain') + 1) +
        '); hardest ' + report.hardestTechnique);
    }
  }
}
console.log('seed ' + seed + ' puzzles ' + count + ' (from ' + from + '): attempted ' + attempted + ', solved ' + solved +
  ' (' + (100 * solved / attempted).toFixed(2) + ' % of the attempted); qualifying solves ' + qualifying + ' (' +
  (100 * qualifying / attempted).toFixed(4) + ' % of the attempted); steps in those solves ' + steps + ' by length ' +
  JSON.stringify(byLength) + '; unsolved traces with the step ' + unsolvedWithStep +
  '; solves whose hardest technique is xyChain ' + hardestXy);
console.log('qualifying indices, lowest first: ' + indices.slice(0, 40).join(',') +
  (indices.length > 40 ? ',...(' + indices.length + ' in all)' : '') + ', ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
