'use strict';
// Scratch (MS10a): a same-pair chain on an assembled caged Killer model with an edge between cage-mates that share no complete
// row, column or box. The model is SG.killer.modelFromCages of the Killer puzzle of the help catalogue (the cageSplit example),
// the solution comes from the depth-first solver of the caged model. Prints the first few chains, the solution and a check of
// the solution against rows, columns, boxes and cages.
const fs = require('fs');
const path = require('path');
const SG = require('./load.js');
const H = SG.techHelper;

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const text = fs.readFileSync(path.join(ROOT, 'player/js/ui/help-examples.js'), 'utf8');
const m = /cageSplit: (\{"variant":"killer".*?"source")/.exec(text);
const start = text.indexOf('cageSplit: {');
const line = text.slice(start, text.indexOf('\n', start));
const json = JSON.parse(line.slice('cageSplit: '.length).replace(/,\s*$/, ''));
const cages = json.cages;
console.log('cages ' + cages.length + ', givens ' + json.givens);
const model = SG.killer.modelFromCages(cages);
const givens = H.parsePuzzle(model, json.givens);
const t0 = Date.now();
const solution = SG.dfs.solve(model, givens);
console.log('solved in ' + (Date.now() - t0) + ' ms: ' + Array.from(solution).join(''));
console.log('unique: ' + (SG.dfs.countSolutions(model, givens, 2) === 1));

const n = model.cellCount;
const completeKinds = { row: 1, col: 1, box: 1, region: 1 };
const classic = new Uint8Array(n * n);
model.units.forEach((cells, u) => {
  if (!completeKinds[model.unitMeta[u].kind]) return;
  for (const a of cells) for (const b of cells) if (a !== b) classic[a * n + b] = 1;
});
const peer = (a, b) => model.peers[a].indexOf(b) !== -1;
const found = [];
for (let a = 0; a < n && found.length < 6; a++) {
  for (const b of model.peers[a]) {
    if (solution[b] === solution[a]) continue;
    for (const c of model.peers[b]) {
      if (c === a || solution[c] !== solution[a] || peer(a, c)) continue;
      for (const d of model.peers[c]) {
        if (d === a || d === b || solution[d] !== solution[b] || peer(a, d) || peer(b, d)) continue;
        const cageOnly = [[a, b], [b, c], [c, d]].filter(([x, y]) => !classic[x * n + y]);
        if (cageOnly.length === 0) continue;
        const targets = model.peers[a].filter((t) => t !== b && t !== c && t !== d && peer(t, d));
        if (targets.length === 0) continue;
        found.push({ chain: [a, b, c, d].map((x) => H.label(model, x)), digits: [solution[a], solution[b]],
          cageOnly: cageOnly.map(([x, y]) => H.label(model, x) + '-' + H.label(model, y)),
          targets: targets.map((x) => H.label(model, x)) });
      }
    }
  }
}
found.slice(0, 6).forEach((f) => console.log(JSON.stringify(f)));
// check the solution
let ok = true;
model.units.forEach((cells) => {
  const seen = new Set();
  cells.forEach((c) => { if (seen.has(solution[c])) ok = false; seen.add(solution[c]); });
});
cages.forEach((cage) => { if (cage.cells.reduce((s, c) => s + solution[c], 0) !== cage.sum) ok = false; });
console.log('solution valid for every unit and cage sum: ' + ok);
