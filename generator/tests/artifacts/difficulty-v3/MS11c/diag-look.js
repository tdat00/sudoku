'use strict';
// Scratch (MS11c): looks at the diagonal counts of the constructed grave on the plain model, to see why the diagonal model
// refuses it.
const SG = require('./load.js');
const H = SG.techHelper;
const model9 = H.model('classic9');
const solution = Array.from(SG.dfs.solve(model9, new Int32Array(81)));
console.log('diagonal of the plain solution:', [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => solution[i * 9 + i]).join(''));
console.log('row 5:', [0, 1, 2, 3, 4, 5, 6, 7, 8].map((c) => solution[36 + c]).join(''));
