'use strict';
// MS14b scratch: the mechanism behind the changed regression hashes of the two Jigsaw cells (jigsaw9/normal and jigsaw9/master).
// Under the engine the loader gives (the tree's, or MS14B_BASE=git:7eddb15) it generates every seed of both cells with the
// recorders' own procedure (perf-helper hashRecord's pipeline call), keeps the puzzle (givens, region map) and rates it with
// SG.difficulty.rate, and with --cross=<dump of the other engine> it also rates the OTHER engine's puzzle of the same key under this
// engine (after checking that both engines built the same region map for the key). Nothing is written to the repository.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS14b/mechanism.js --out=<file> [--cross=<file>]
const fs = require('fs');
const SG = require('./load.js');

const arg = (name) => { const a = process.argv.find((x) => x.startsWith('--' + name + '=')); return a ? a.slice(name.length + 3) : null; };
const T = SG.fixtures.perfTools;
const engine = process.env.MS14B_BASE ? process.env.MS14B_BASE : 'tree';
const cross = arg('cross') ? JSON.parse(fs.readFileSync(arg('cross'), 'utf8')) : null;
const CELLS = ['jigsaw9/normal', 'jigsaw9/master'];

const summary = (rating, model, level) => {
  const need = SG.difficulty.requiredOf(rating, level, model);
  return {
    solved: rating.solved, score: rating.score, level: rating.level, hardest: rating.hardestTechnique,
    leftovers: (rating.techniqueCounts && rating.techniqueCounts.lawOfLeftovers) || 0,
    needsTier: need === null ? null : need.required
  };
};

const rows = [];
T.COMBOS.filter((c) => CELLS.indexOf(c.key) >= 0).forEach((combo) => {
  T.SEEDS.forEach((seed) => {
    const key = combo.key + '#' + seed;
    const run = SG.fixtures.toolRecords.withRequestedLevel(combo.variant, combo.level, () =>
      SG.pipeline.run({ variantId: combo.variant, difficulty: combo.level, seed: seed, trace: 'off' }, null));
    const result = run.value;
    const givens = Array.from(result.givens);
    const regions = Array.from(result.model.layout.cellRegion);
    const rating = SG.difficulty.rate(result.model, result.givens, {});
    const row = {
      key, level: combo.level, hash: T.hashRecord(combo.variant, combo.level, seed).hash, clues: givens.filter((v) => v !== 0).length,
      givens, regions, own: summary(rating, result.model, combo.level)
    };
    if (cross) {
      const other = cross.rows.filter((r) => r.key === key)[0];
      row.sameRegions = JSON.stringify(other.regions) === JSON.stringify(regions);
      row.otherEngine = cross.engine;
      row.otherClues = other.clues;
      row.otherPuzzle = summary(SG.difficulty.rate(result.model, Array.isArray(result.givens) ? other.givens.slice() :
        new result.givens.constructor(other.givens), {}), result.model, combo.level);
    }
    rows.push(row);
  });
});
fs.writeFileSync(arg('out'), JSON.stringify({ engine, rows }).replace(/\n/g, '\r\n') + '\r\n');
console.log('engine ' + engine + ': ' + rows.length + ' puzzles' + (cross ? ' (+ the puzzles of ' + cross.engine + ' rated under this engine)' : ''));
