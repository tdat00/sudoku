'use strict';
// Scratch (MS08b, fix round: box-like units): the structural maximum of work units per call of twoStringKite on every
// registered variant (digits x disjoint complete rows x disjoint complete columns: every row and every column
// conjugate for every digit; 0 on a board without a complete box-like unit, kind 'box' or 'region'), next to the
// skyscraper's (digits x (pairs of rows + pairs of columns)) as a check against MS08a's table.
// Lines are counted from the model's own units, as the finder's tables do.
const SG = require('./load.js');
const H = SG.techHelper;

function disjointLines(model, kind) {
  const complete = (u) => model.units[u].length === model.digits && !(model.unitMeta[u] && model.unitMeta[u].partial);
  const lines = [];
  model.unitMeta.forEach((m, u) => { if (m.kind === kind && complete(u)) lines.push(u); });
  const owners = new Int32Array(model.cellCount);
  lines.forEach((u) => model.units[u].forEach((c) => { owners[c]++; }));
  return lines.filter((u) => model.units[u].every((c) => owners[c] === 1));
}

function boxLikeOwned(model) {
  const complete = (u) => model.units[u].length === model.digits && !(model.unitMeta[u] && model.unitMeta[u].partial);
  const owners = new Int32Array(model.cellCount);
  let units = 0;
  model.unitMeta.forEach((m, u) => {
    if ((m.kind === 'box' || m.kind === 'region') && complete(u)) { units++; model.units[u].forEach((c) => { owners[c]++; }); }
  });
  let owned = 0;
  for (let c = 0; c < model.cellCount; c++) if (owners[c] === 1) owned++;
  return { units, owned };
}

const out = [];
SG.variants.list().forEach((def) => {
  const id = def.id;
  if (!SG.testkit.hasVariant(id)) { out.push({ id, note: 'not available' }); return; }
  const model = H.model(id);
  const rows = disjointLines(model, 'row').length;
  const cols = disjointLines(model, 'col').length;
  const d = model.digits;
  const boxLike = boxLikeOwned(model);
  const row = { id, digits: d, cells: model.cellCount, disjointRows: rows, disjointCols: cols,
    kiteMax: boxLike.units > 0 ? d * rows * cols : 0,
    skyscraperMax: d * ((rows * (rows - 1)) / 2 + (cols * (cols - 1)) / 2),
    boxLikeUnits: boxLike.units, cellsWithOneBoxLike: boxLike.owned };
  out.push(row);
  console.log(JSON.stringify(row));
});
const biggest = out.filter((r) => r.kiteMax !== undefined).reduce((a, b) => (b.kiteMax > a.kiteMax ? b : a));
console.log('largest kite maximum: ' + biggest.id + ' ' + biggest.kiteMax + ' of a limit of 50000');
