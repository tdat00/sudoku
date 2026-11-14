'use strict';

/*
 * MS06c2: a probe of the guided pass under the active target policy: for each case it prints how many removals the
 * pass applied, the score and the tier state of its board before and after, and what ended it. It only reads the
 * dig log, like the replay of the `digger-target` suite. Run it through the shared-machine lock (it generates).
 *
 *   node tests/artifacts/difficulty-v3/MS06c2/probe-passes.cjs
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

const SG = loadSources();
const D = SG.difficulty;

function bounded(model, spec, givens) {
  const report = SG.logicalSolver.solve(model, givens, {
    allowedTechniques: spec.allowedTechniques, collectSteps: false, assumeUniqueness: false, budget: null
  });
  if (!report.solved) return null;
  const score = D.classify(report, model).score;
  const used = spec.tierTechniques.some((id) => report.techniqueCounts[id] > 0);
  return { score: Math.round(score), tier: D.levelIndex(spec.level) === 0 || spec.tierTechniques.length === 0 || used };
}

const cases = [
  ['classic9', 'normal', 4, 0.5], ['classic9', 'normal', 9, 0.9], ['classic9', 'normal', 14, null],
  ['classic9', 'hard', 4, 0.5], ['classic9', 'hard', 9, 0.1], ['classic9', 'expert', 4, 0.5],
  ['classic9', 'expert', 9, 0.9], ['classic9', 'master', 4, 0.5], ['classic9', 'master', 9, 0.1],
  ['classic9', 'easy', 4, 0.5], ['classic9', 'veryEasy', 4, 0.5]
];
for (const c of cases) {
  const model = SG.variants.get(c[0]).build({}, null);
  const rng = SG.rng.create(c[2]);
  const solution = SG.fullGrid.generate(model, rng.fork('grid'), null);
  const spec = D.spec(c[1], model);
  const target = c[3] === null ? null : spec.min + c[3] * (spec.max - spec.min);
  const log = [];
  const dug = SG.digger.digStage(model, solution, c[1], rng.fork('dig'), { log, target });
  const givens = Int32Array.from(solution);
  let i = 0;
  while (!(log[i].op === 'pass' && log[i].pass === 'guided')) {
    if (log[i].op === 'accept') log[i].cells.forEach((cell) => { givens[cell] = 0; });
    i++;
  }
  const start = bounded(model, spec, givens);
  const pass = log.slice(i + 1);
  const accepts = pass.filter((e) => e.op === 'accept').length;
  const last = pass.length > 0 ? pass[pass.length - 1].op : 'none';
  const end = bounded(model, spec, dug.givens);
  console.log([c[1], c[2], 'target', target === null ? null : Math.round(target), 'start', JSON.stringify(start),
    'end', JSON.stringify(end), 'accepts', accepts, 'rejects', pass.filter((e) => e.op === 'reject').length,
    'lastOp', last].join(' '));
}
