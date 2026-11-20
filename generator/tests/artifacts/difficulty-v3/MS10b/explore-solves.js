'use strict';
// Scratch (MS10b): does wxyzWing occur in a complete logical solve of a real (dug) puzzle? The complete ladder of the
// registry is allowed (allowedTechniques null, assumeUniqueness true); the step list gives the techniques used. A puzzle
// QUALIFIES only when the solve is complete (`report.solved`) and has a wxyzWing step (`wxyzSteps.length > 0`): an unsolved
// trace with the step is counted apart and supplies no source. Every puzzle of the population is attempted (no stop at the
// first hit); the first PRINT_LIMIT qualifying puzzles are printed, lowest index first, with their original givens. The seed
// and the count are the arguments.
//   node tests/artifacts/difficulty-v3/MS10b/explore-solves.js <seed> <count> [from]
const SG = require('./load.js');
const H = SG.techHelper;
const model = H.model('classic9');
const seed = Number(process.argv[2] || 777);
const count = Number(process.argv[3] || 200);
const from = Number(process.argv[4] || 0);
const PRINT_LIMIT = 12;
const order = SG.techniques.get('wxyzWing').order;
console.log('explore-solves: seed ' + seed + ', puzzles ' + count + ' from ' + from + ', model ' + model.variantId +
  ', wxyzWing order ' + order + ', solver options {"allowedTechniques":null,"assumeUniqueness":true}, qualifying = ' +
  'report.solved && wxyzSteps.length > 0, print limit ' + PRINT_LIMIT);
const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), count * 4);
const t0 = Date.now();
let attempted = 0;
let solved = 0;
let qualifying = 0;
let unsolvedWithStep = 0;
let stepsTotal = 0;
const hardest = {};
const indices = [];
for (let i = 0; i < items.length; i += 4) {
  const index = i / 4;
  if (index < from) continue;
  const givens = items[i].givens;
  attempted++;
  const report = SG.logicalSolver.solve(model, givens, { allowedTechniques: null, assumeUniqueness: true });
  if (report.solved) solved++;
  hardest[report.hardestTechnique] = (hardest[report.hardestTechnique] || 0) + 1;
  const steps = report.steps.filter((s) => s.technique === 'wxyzWing');
  if (steps.length > 0 && !report.solved) unsolvedWithStep++;
  if (report.solved && steps.length > 0) {
    qualifying++;
    stepsTotal += steps.length;
    indices.push(index);
    if (qualifying <= PRINT_LIMIT) {
      console.log('#' + index + ' ' + H.puzzleString(model, givens) + ' wxyzWing steps ' + steps.length + ' of ' +
        report.steps.length + '; hardest ' + report.hardestTechnique);
    }
  }
}
console.log('seed ' + seed + ' puzzles ' + count + ' (from ' + from + '): attempted ' + attempted + ', solved ' + solved + ' (' +
  (100 * solved / attempted).toFixed(2) + ' % of the attempted), qualifying solves (solved with a wxyzWing step) ' +
  qualifying + ' (' + (100 * qualifying / attempted).toFixed(4) + ' % of the attempted, ' +
  (solved > 0 ? (100 * qualifying / solved).toFixed(4) : 'n/a') + ' % of the solved), unsolved traces with the step ' +
  unsolvedWithStep + ', wxyzWing steps in the qualifying solves ' + stepsTotal);
console.log('qualifying indices, lowest first: ' + indices.slice(0, 40).join(',') +
  (indices.length > 40 ? ',... (' + indices.length + ' in all)' : ''));
console.log('hardest techniques ' + JSON.stringify(hardest) + ', ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
