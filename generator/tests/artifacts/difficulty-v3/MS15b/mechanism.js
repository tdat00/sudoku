'use strict';
// MS15b scratch (from MS14b's mechanism.js and mechanism-g.js, one generic script): the mechanism behind the changed canonical
// outputs. Under the engine the loader gives (the tree's, or MS15B_BASE=git:b958a58, the accepted MS15a engine without the
// registered alsXz) it generates each named output's puzzle with the recorders' own procedure (as cause.js), keeps the puzzle
// (givens, region map) and rates it with SG.difficulty.rate, counting the uses of alsXz in the canonical rating; with
// --cross=<dump of the other engine> it also rates the OTHER engine's puzzle of the same output under this engine (after
// checking that both engines built the same region map). Nothing is written to the repository.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS15b/mechanism.js --kind=wire|analysis|hash --only=<G10,G13 |
//   classic9/nightmare#3,...> --out=<file> [--cross=<file>]
// For --kind=hash --only names the keys (variant/level#seed) to generate.
const fs = require('fs');
const SG = require('./load.js');

const arg = (name) => { const a = process.argv.find((x) => x.startsWith('--' + name + '=')); return a ? a.slice(name.length + 3) : null; };
const kind = arg('kind');
const only = arg('only').split(',');
const engine = process.env.MS15B_BASE ? process.env.MS15B_BASE : 'tree';
const cross = arg('cross') ? JSON.parse(fs.readFileSync(arg('cross'), 'utf8')) : null;
const T = SG.fixtures.perfTools;

const summary = (rating, model, level) => {
  const need = SG.difficulty.requiredOf(rating, level, model);
  return {
    solved: rating.solved, score: rating.score, level: rating.level, hardest: rating.hardestTechnique,
    alsXz: (rating.techniqueCounts && rating.techniqueCounts.alsXz) || 0,
    needsTier: need === null ? null : need.required
  };
};

const targets = [];
if (kind === 'hash') {
  only.forEach((key) => {
    const cell = /^(.+)#(\d+)$/.exec(key);
    const combo = T.COMBOS.filter((c) => c.key === cell[1])[0];
    targets.push({ key, variant: combo.variant, level: combo.level, seed: Number(cell[2]),
      run: () => SG.pipeline.run({ variantId: combo.variant, difficulty: combo.level, seed: Number(cell[2]), trace: 'off' }, null) });
  });
} else {
  const source = kind === 'wire' ? SG.fixtures.replayGoldens.filter((g) => SG.fixtures.replayRecording.WIRE_IDS.indexOf(g.id) >= 0)
    : SG.fixtures.replayGoldens;
  only.forEach((id) => {
    const g = source.filter((x) => x.id === id)[0];
    const req = g.request;
    targets.push({ key: id + ' ' + req.variantId + ' ' + req.difficulty + ' ' + req.seed, variant: req.variantId, level: req.difficulty,
      run: () => SG.pipeline.run(SG.store.toConfig(req), null, SG.budget.create({ ms: 120000 })) });
  });
}

const rows = [];
targets.forEach((t) => {
  const run = SG.fixtures.toolRecords.withRequestedLevel(t.variant, t.level, t.run);
  const result = run.value;
  const givens = Array.from(result.givens);
  const regions = result.model.layout && result.model.layout.cellRegion ? Array.from(result.model.layout.cellRegion) : null;
  const row = { key: t.key, level: t.level, clues: givens.filter((v) => v !== 0).length, givens, regions,
    own: summary(SG.difficulty.rate(result.model, result.givens, {}), result.model, t.level) };
  if (cross) {
    const other = cross.rows.filter((r) => r.key === t.key)[0];
    row.sameRegions = JSON.stringify(other.regions) === JSON.stringify(regions);
    row.samePuzzle = JSON.stringify(other.givens) === JSON.stringify(givens);
    row.otherEngine = cross.engine;
    row.otherClues = other.clues;
    row.otherOwn = other.own;
    row.otherPuzzle = summary(SG.difficulty.rate(result.model, Array.isArray(result.givens) ? other.givens.slice() :
      new result.givens.constructor(other.givens), {}), result.model, t.level);
  }
  rows.push(row);
});
fs.writeFileSync(arg('out'), JSON.stringify({ engine, rows }).replace(/\n/g, '\r\n') + '\r\n');
const f = (p) => (p.solved ? p.level + '/' + p.score + (p.alsXz ? ' alsXz x' + p.alsXz : '') : 'unsolved');
rows.forEach((r) => console.log(r.key + ': engine ' + engine + ' clues ' + r.clues + ', own rating ' + f(r.own) +
  (cross ? '; the puzzle of ' + cross.engine + ' (clues ' + r.otherClues + ', same regions ' + r.sameRegions + ', same puzzle ' + r.samePuzzle +
    ') rated here ' + f(r.otherPuzzle) : '')));
