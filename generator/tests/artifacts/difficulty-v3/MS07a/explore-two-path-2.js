'use strict';
// Scratch (MS07a): look for contradiction/forced proofs whose two chains differ by 3 or more edges.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const runner = fs.readFileSync(path.join(ROOT, 'tests/node-runner.js'), 'utf8');
const files = (/const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner)[1].match(/'[^']+'/g)).map((s) => s.slice(1, -1));
function run(rel) {
  const abs = path.join(ROOT, rel);
  vm.runInThisContext(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''), { filename: abs });
}
run('../core/tests/harness.js');
files.forEach((f) => { if (fs.existsSync(path.join(ROOT, f))) run(f); });
['../core/tests/fixtures', 'tests/fixtures'].forEach((dir) => {
  fs.readdirSync(path.join(ROOT, dir)).filter((n) => n.endsWith('.js')).sort().forEach((n) => run(dir + '/' + n));
});
const SG = globalThis.SG;
const H = SG.techHelper;
const m = H.model('classic9');
const count = Number(process.argv[2] || 2000);
const seed = Number(process.argv[3] || 7);
const pairs = {};
const found = [];
const states = H.randomStatesWithKnownSolution(m, SG.testkit.rng.create(seed), count);
const t0 = Date.now();
states.forEach((item, i) => {
  const state = SG.model.cloneState(item.state);
  for (let step = 0; step < 10 && state.unsolvedCount > 0; step++) {
    const before = SG.model.cloneState(state);
    const ctx = SG.techniques.createContext(m, {});
    const f = SG.techniques.get('forcingChain').find(m, state, ctx);
    if (f === null) break;
    if (f.i18nArgs.chains.length === 2) {
      const l = f.i18nArgs.chains.map((c) => c.length - 1);
      const key = l.join('/') + ' => ' + f.i18nArgs.length;
      pairs[key] = (pairs[key] || 0) + 1;
      if (Math.abs(l[0] - l[1]) >= 3) {
        found.push({
          i, step, l, kind: f.i18nArgs.kind, puzzle: H.puzzleString(m, item.givens),
          candidates: Array.from(before.candidates).map((mask, c) => {
            if (before.value[c] !== 0) return String(before.value[c]);
            let s = '';
            for (let d = 1; d <= 9; d++) if (mask & (1 << (d - 1))) s += d;
            return s;
          }).join(' ')
        });
      }
    }
    for (const p of f.placements) SG.constraints.assign(m, state, p[0], p[1]);
    for (const e of f.eliminations) SG.constraints.eliminate(m, state, e[0], e[1]);
    SG.constraints.propagate(m, state);
  }
});
console.log(JSON.stringify(pairs));
console.log('ms', Date.now() - t0, 'found', found.length);
console.log(JSON.stringify(found.slice(0, 3), null, 1));
