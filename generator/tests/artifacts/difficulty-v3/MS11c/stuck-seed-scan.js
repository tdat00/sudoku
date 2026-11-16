'use strict';
// Scratch (MS11c, SA2's pre-E ruling 1; from MS11b's stuck-seed-scan.js): the replacement seed for the Master case
// ['classic9', 'master', 16, true, null] of the real-pass CASES of generator/tests/suites/digger-target.test.js. Seeds 1 to
// 30 ascending, excluding the retained Master proposal seed 7 and the failing seed 16; only the candidate
// ['classic9', 'master', seed, true, null] is run, through the exact pass() construction of that test (same model, level,
// grid/dig RNG forks, proposal mode, null target, options and limits). The scan stops at the first seed with at least NINE
// genuine stuck kept proposals: a `keep` entry of the dig log with score null whose ordinary production evaluation
// (SG.digger.removalObjective(model, spec, true), as the replay of the test calls it, on the board rebuilt from the accepted
// removals of the log) is a proposal with the priority STUCK + unsolvedCount (STUCK = 1e9, unsolvedCount > 0: the bounded
// solve below the chain group did not finish). The source identity (SHA-256 of core/js/engine/tech-wing.js) is printed first.
// With --seed=16 only that seed is evaluated (the failing pass on the tree, for the record).
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS11c/stuck-seed-scan.js [--seed=<n>]
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const SG = require('./load.js');
const D = SG.difficulty;
const STUCK = 1e9;
const NEEDED = 9;
const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
console.log('tech-wing.js ' + crypto.createHash('sha256').update(fs.readFileSync(path.join(REPO, 'core/js/engine/tech-wing.js')))
  .digest('hex').toUpperCase());
const only = (process.argv.find((a) => a.startsWith('--seed=')) || '').slice(7);

function pass(c) {
  const model = SG.variants.get(c[0]).build({}, null);
  const rng = SG.rng.create(c[2]);
  const solution = SG.fullGrid.generate(model, rng.fork('grid'), null);
  const spec = D.spec(c[1], model);
  const target = c[4] === null || spec.max === Infinity ? null : spec.min + c[4] * (spec.max - spec.min);
  const log = [];
  const dug = SG.digger.digStage(model, solution, c[1], rng.fork('dig'), { log: log, proposal: c[3], target: target });
  return { model, solution, spec, log, dug };
}

// the stuck keeps of one pass, each re-evaluated by the production objective on the rebuilt board
function stuckKeeps(run) {
  const evaluate = SG.digger.removalObjective(run.model, run.spec, true);
  let givens = Int32Array.from(run.solution);
  const log = run.log;
  let i = 0;
  while (!(log[i].op === 'pass' && log[i].pass === 'guided')) {
    if (log[i].op === 'accept') log[i].cells.forEach((c) => { givens[c] = 0; });
    i++;
  }
  i++;
  const out = [];
  let keeps = 0;
  let scored = 0;
  for (; i < log.length; i++) {
    const e = log[i];
    const trial = Int32Array.from(givens);
    e.cells.forEach((c) => { trial[c] = 0; });
    if (e.op === 'keep') {
      keeps++;
      const objective = evaluate(trial, run.solution, e.cells, null, { oracleCalls: 0 });
      if (e.score === null) {
        const genuine = objective.kind === 'proposal' && objective.priority > STUCK;
        out.push({ index: i, cells: e.cells.slice(), priority: objective.priority, unsolved: objective.priority - STUCK, genuine });
      } else scored++;
    } else if (e.op === 'accept') givens = trial;
  }
  return { keeps, scored, stuck: out };
}

let selected = null;
const seeds = [];
for (let seed = 1; seed <= 30; seed++) {
  if (only !== '' ? seed !== Number(only) : (seed === 7 || seed === 16)) continue;
  seeds.push(seed);
}
for (let k = 0; k < seeds.length && selected === null; k++) {
  const seed = seeds[k];
  const t0 = Date.now();
  const run = pass(['classic9', 'master', seed, true, null]);
  const r = stuckKeeps(run);
  const genuine = r.stuck.filter((s) => s.genuine).length;
  console.log('seed ' + seed + ': keeps ' + r.keeps + ', scored ' + r.scored + ', stuck ' + r.stuck.length + ' (genuine ' + genuine +
    '), accepted removals ' + run.log.filter((e) => e.op === 'accept').length + ' (' + (Date.now() - t0) + ' ms)');
  if (only !== '' || genuine >= NEEDED) {
    selected = seed;
    console.log((only !== '' ? 'the stuck keeps of seed ' : 'selected seed ') + seed + '; its stuck keeps (log index, cells, priority = STUCK + unsolved, unsolved):');
    r.stuck.forEach((s) => console.log('  #' + s.index + ' cells [' + s.cells.join(',') + '] priority ' + s.priority + ' unsolved ' +
      s.unsolved + (s.genuine ? '' : ' NOT GENUINE')));
  }
}
console.log(only !== '' ? 'seed ' + only + ' evaluated' : selected === null ? 'no seed qualifies (seeds tried: ' + seeds.join(',') + ')' : 'first qualifying seed: ' + selected);
