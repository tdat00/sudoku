'use strict';
// MS14b scratch: the mechanism behind the changed analysis golden G06 (jigsaw9 nightmare 42), with G07 (jigsaw9 nightmare 3962167687,
// unchanged) beside it. Same method as mechanism.js: under the engine the loader gives (the tree's, or MS14B_BASE=git:7eddb15) it
// generates the golden's request with the recorder's own procedure (cause.js), keeps the puzzle and rates it, and with
// --cross=<dump of the other engine> rates the other engine's puzzle of the same request under this engine.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS14b/mechanism-g.js --out=<file> [--cross=<file>]
const fs = require('fs');
const SG = require('./load.js');

const arg = (name) => { const a = process.argv.find((x) => x.startsWith('--' + name + '=')); return a ? a.slice(name.length + 3) : null; };
const engine = process.env.MS14B_BASE ? process.env.MS14B_BASE : 'tree';
const cross = arg('cross') ? JSON.parse(fs.readFileSync(arg('cross'), 'utf8')) : null;
const IDS = ['G06', 'G07'];

const summary = (rating, model, level) => {
  const need = SG.difficulty.requiredOf(rating, level, model);
  return {
    solved: rating.solved, score: rating.score, level: rating.level, hardest: rating.hardestTechnique,
    leftovers: (rating.techniqueCounts && rating.techniqueCounts.lawOfLeftovers) || 0,
    needsTier: need === null ? null : need.required
  };
};

const rows = [];
IDS.forEach((id) => {
  const g = SG.fixtures.replayGoldens.filter((x) => x.id === id)[0];
  const req = g.request;
  const run = SG.fixtures.toolRecords.withRequestedLevel(req.variantId, req.difficulty, () => {
    const config = SG.store.toConfig(req);
    return SG.pipeline.run(config, null, SG.budget.create({ ms: 120000 }));
  });
  const result = run.value;
  const givens = Array.from(result.givens);
  const regions = Array.from(result.model.layout.cellRegion);
  const row = {
    key: id + ' ' + req.variantId + ' ' + req.difficulty + ' ' + req.seed, clues: givens.filter((v) => v !== 0).length, givens, regions,
    own: summary(SG.difficulty.rate(result.model, result.givens, {}), result.model, req.difficulty)
  };
  if (cross) {
    const other = cross.rows.filter((r) => r.key === row.key)[0];
    row.sameRegions = JSON.stringify(other.regions) === JSON.stringify(regions);
    row.otherEngine = cross.engine;
    row.otherClues = other.clues;
    row.otherPuzzle = summary(SG.difficulty.rate(result.model, Array.isArray(result.givens) ? other.givens.slice() :
      new result.givens.constructor(other.givens), {}), result.model, req.difficulty);
  }
  rows.push(row);
});
fs.writeFileSync(arg('out'), JSON.stringify({ engine, rows }).replace(/\n/g, '\r\n') + '\r\n');
const f = (p) => (p.solved ? p.level + '/' + p.score + (p.leftovers ? ' L' + p.leftovers : '') : 'unsolved');
rows.forEach((r) => console.log(r.key + ': engine ' + engine + ' clues ' + r.clues + ', own rating ' + f(r.own) +
  (cross ? '; the puzzle of ' + cross.engine + ' (clues ' + r.otherClues + ', same regions ' + r.sameRegions + ') rated here ' + f(r.otherPuzzle) : '')));
