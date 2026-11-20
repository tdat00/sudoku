'use strict';
// Scratch (MS08c): the structural maximum of work units per call of emptyRectangle on every registered variant. One unit
// is a tested pair of a box and a conjugate unit of a digit: digits x (boxes whose candidates can all have a single
// owner: the box is the only box-like unit of each of its cells, and each has one row and one column) x (complete units:
// every one can be a conjugate pair). Counted from the model's own units, as the finder's tables do; 0 on a board without a
// complete box-like unit. Next to it the same count with both rectangles of a box, both arms and both pair ends tested as
// separate units (x 8), for the record of the alternative unit.
const SG = require('./load.js');
const H = SG.techHelper;

const out = [];
SG.variants.list().forEach((def) => {
  const id = def.id;
  if (!SG.testkit.hasVariant(id)) { out.push({ id, note: 'not available' }); return; }
  const model = H.model(id);
  const complete = (u) => model.units[u].length === model.digits && !(model.unitMeta[u] && model.unitMeta[u].partial);
  const holders = (cell, test) => Array.from(model.cellUnits[cell]).filter((u) => complete(u) && test(model.unitMeta[u].kind));
  const isBoxLike = (k) => k === 'box' || k === 'region';
  let boxes = 0;
  let eligible = 0;
  model.unitMeta.forEach((m, u) => {
    if (!isBoxLike(m.kind) || !complete(u)) return;
    boxes++;
    const ok = Array.from(model.units[u]).every((c) => {
      const own = holders(c, isBoxLike);
      return own.length === 1 && own[0] === u && holders(c, (k) => k === 'row').length === 1 &&
        holders(c, (k) => k === 'col').length === 1;
    });
    if (ok) eligible++;
  });
  let units = 0;
  model.units.forEach((cells, u) => { if (complete(u)) units++; });
  const row = { id, digits: model.digits, cells: model.cellCount, boxLikeUnits: boxes, eligibleBoxes: eligible,
    completeUnits: units, max: model.digits * eligible * units, maxIfEveryTest: model.digits * eligible * units * 8 };
  out.push(row);
  console.log(JSON.stringify(row));
});
const biggest = out.filter((r) => r.max !== undefined).reduce((a, b) => (b.max > a.max ? b : a));
console.log('largest maximum: ' + biggest.id + ' ' + biggest.max + ' of a limit of 50000 (x 8 would be ' + biggest.maxIfEveryTest + ')');
