'use strict';
// Scratch (MS09b): the ownership topology of the Butterfly board, for the structural argument that no finned Swordfish can
// fire on it in a satisfiable state. A candidate of a base line needs a single row, a single column and a single box-like
// owner (the candidate ownership of findFish, counted over complete units). Usage (from generator/):
//   node tests/artifacts/difficulty-v3/MS09b/butterfly-topology.js [variant]
const SG = require('./load.js');
const H = SG.techHelper;
const variant = process.argv[2] || 'butterfly';
const model = H.model(variant);
const complete = (u) => model.units[u].length === model.digits && !(model.unitMeta[u] && model.unitMeta[u].partial);
const holders = (cell, test) => Array.from(model.cellUnits[cell]).filter((u) => complete(u) && test(model.unitMeta[u].kind));
const rowOwners = [];
const colOwners = [];
const boxOwners = [];
for (let c = 0; c < model.cellCount; c++) {
  rowOwners.push(holders(c, (k) => k === 'row'));
  colOwners.push(holders(c, (k) => k === 'col'));
  boxOwners.push(holders(c, (k) => k === 'box' || k === 'region'));
}
const single = [];
let singleRowCol = 0;
for (let c = 0; c < model.cellCount; c++) {
  if (rowOwners[c].length === 1 && colOwners[c].length === 1) singleRowCol++;
  if (rowOwners[c].length === 1 && colOwners[c].length === 1 && boxOwners[c].length === 1) single.push(c);
}
console.log(variant + ': ' + model.cellCount + ' cells, ' + singleRowCol + ' with a single row and column (the cells a base line can hold), ' +
  single.length + ' of them also with a single box');
const boxesOfSingle = Array.from(new Set(single.map((c) => boxOwners[c][0]))).sort((a, b) => a - b);
console.log('boxes holding single-owner cells: ' + boxesOfSingle.map((u) => model.unitMeta[u].label + '(' +
  single.filter((c) => boxOwners[c][0] === u).length + ' cells)').join(', '));
const lines = (kind) => model.unitMeta.map((m, u) => (m.kind === kind && complete(u) ? u : -1)).filter((u) => u >= 0);
['row', 'col'].forEach((kind) => {
  const perBox = new Map();
  let linesWithSingles = 0;
  let linesWithManyBoxes = 0;
  lines(kind).forEach((u) => {
    const cells = Array.from(model.units[u]).filter((c) => single.indexOf(c) !== -1);
    const boxes = Array.from(new Set(cells.map((c) => boxOwners[c][0])));
    if (cells.length > 0) linesWithSingles++;
    if (boxes.length > 1) linesWithManyBoxes++;
    boxes.forEach((b) => {
      if (!perBox.has(b)) perBox.set(b, []);
      perBox.get(b).push(model.unitMeta[u].label + ':' + cells.filter((c) => boxOwners[c][0] === b).length);
    });
  });
  console.log(kind + 's: ' + lines(kind).length + ' complete, ' + linesWithSingles + ' with single-owner cells, ' + linesWithManyBoxes +
    ' with single-owner cells in more than one box');
  Array.from(perBox.keys()).sort((a, b) => a - b).forEach((b) => console.log('  ' + model.unitMeta[b].label + ': ' + perBox.get(b).join(' ')));
});
// the lines of the other kind that hold the single-owner cells of each box (the covers of a base in that box)
['row', 'col'].forEach((kind) => {
  const other = kind === 'row' ? 'col' : 'row';
  const coverSets = boxesOfSingle.map((b) => new Set(single.filter((c) => boxOwners[c][0] === b).map((c) => (other === 'row' ? rowOwners[c][0] : colOwners[c][0]))));
  let shared = 0;
  for (let i = 0; i < coverSets.length; i++) {
    for (let j = i + 1; j < coverSets.length; j++) coverSets[i].forEach((u) => { if (coverSets[j].has(u)) shared++; });
  }
  console.log('base kind ' + kind + ': ' + shared + ' cover line(s) (' + other + 's) holding single-owner cells of two boxes');
});
