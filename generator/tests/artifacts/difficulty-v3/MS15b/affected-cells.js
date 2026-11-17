'use strict';
// MS15b scratch (GP): the cells of the performance table (SG.fixtures.perfTools.PERF_TARGETS, design.md 9.1) whose level admits
// `alsXz` on the active source, by the rule the generator itself uses (SG.difficulty.spec(level, model).allowedTechniques of the
// variant's default model), with the target of each cell. Read-only: nothing is generated or written.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS15b/affected-cells.js
const SG = require('./load.js');
const T = SG.fixtures.perfTools;
const D = SG.difficulty;
const admit = [];
const other = [];
Object.keys(T.PERF_TARGETS).forEach((variant) => {
  const model = SG.variants.get(variant).build({}, null);
  Object.keys(T.PERF_TARGETS[variant]).forEach((level) => {
    const cell = { key: variant + '/' + level, target: T.PERF_TARGETS[variant][level] };
    (D.spec(level, model).allowedTechniques.indexOf('alsXz') !== -1 ? admit : other).push(cell);
  });
});
console.log('cells in the performance table: ' + (admit.length + other.length));
console.log('cells whose level admits alsXz: ' + admit.length + ' (levels: ' + Array.from(new Set(admit.map((c) => c.key.split('/')[1]))).join(', ') + ')');
admit.forEach((c) => console.log('  ' + c.key + ' target ' + c.target + ' ms'));
console.log('cells that do not admit it: ' + other.length + ' (levels: ' + Array.from(new Set(other.map((c) => c.key.split('/')[1]))).join(', ') + ')');
const weight = D.WEIGHTS.alsXz;
console.log('alsXz weight ' + weight + ', 1.25 x weight ' + 1.25 * weight + '; master band max ' + D.spec('master', SG.variants.get('classic9').build({}, null)).max);
