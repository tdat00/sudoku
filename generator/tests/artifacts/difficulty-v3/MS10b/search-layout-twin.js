'use strict';
// Scratch (MS10b): a multigrid-ownership negative for wxyzWing on the Samurai. A quartet A, B, C, D with the masks
// {1,4}, {1,2}, {2,3}, {3,4} (the vector) whose pairs A-B, B-C and C-D would all be "seeing" if two cells of one LAYOUT
// row (or column) counted as peers, A and D not seeing each other, and a cell T that would see A and D: under the real
// peers (units only) one of the pairs does not see (the layout twin), so the restricted digit is not restricted and
// nothing may be found; under the layout rule the quartet is a WXYZ-Wing that removes the 4 from T.
//   node tests/artifacts/difficulty-v3/MS10b/search-layout-twin.js
const SG = require('./load.js');
const H = SG.techHelper;
const model = H.model('samurai');
const n = model.cellCount;
const L = model.layout;
const real = (a, b) => Array.prototype.indexOf.call(model.peers[a], b) !== -1;
const layout = (a, b) => a !== b && (real(a, b) || L.cellRow[a] === L.cellRow[b] || L.cellCol[a] === L.cellCol[b]);
let found = 0;
for (let a = 0; a < n && found < 6; a++) {
  for (let b = 0; b < n && found < 6; b++) {
    // A-B is the layout twin pair: same layout row or column, not real peers
    if (a === b || real(a, b) || !(L.cellRow[a] === L.cellRow[b] || L.cellCol[a] === L.cellCol[b])) continue;
    for (let c = 0; c < n && found < 6; c++) {
      if (c === a || c === b || !real(b, c) || layout(a, c)) continue;
      for (let d = 0; d < n && found < 6; d++) {
        if (d === a || d === b || d === c || !real(c, d) || layout(b, d) || layout(a, d)) continue;
        for (let t = 0; t < n; t++) {
          if (t === a || t === b || t === c || t === d) continue;
          if (!layout(t, a) || !layout(t, d) || layout(t, b) || layout(t, c)) continue;
          found++;
          const state = SG.model.initState(model);
          state.candidates[a] = 1 | 8; state.candidates[b] = 1 | 2; state.candidates[c] = 2 | 4; state.candidates[d] = 4 | 8;
          const f = SG.techniques.get('wxyzWing').find(model, state, SG.techniques.createContext(model, {}));
          console.log('A ' + H.label(model, a) + ' B ' + H.label(model, b) + ' C ' + H.label(model, c) + ' D ' + H.label(model, d) +
            ' T ' + H.label(model, t) + ' | real finder: ' + (f ? JSON.stringify(f.eliminations) : 'none') +
            ' | layout rows ' + [a, b, c, d].map((x) => L.cellRow[x]).join(',') + ' cols ' + [a, b, c, d].map((x) => L.cellCol[x]).join(','));
          t = n;
        }
      }
    }
  }
}
console.log('found ' + found);
