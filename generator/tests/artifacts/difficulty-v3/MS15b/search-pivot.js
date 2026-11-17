'use strict';
// Scratch (MS15b): a cage position whose first ALS-XZ witness has a pivot (the first z cell of A) with another number of
// peers than the first z cell of B and the last z cell of A, to pin the pivot by the work of the call.
const SG = require('./load.js');
const H = SG.techHelper;

function range(n) { const out = []; for (let i = 0; i < n; i++) out.push(i); return out; }
function buildModel(id, D, boxRows, boxCols, extra) {
  const cellRow = [], cellCol = [], units = [], meta = [];
  for (let r = 0; r < D; r++) for (let c = 0; c < D; c++) { cellRow.push(r); cellCol.push(c); }
  for (let r = 0; r < D; r++) { units.push(range(D).map((col) => r * D + col)); meta.push({ kind: 'row', label: 'R' + (r + 1) }); }
  for (let c = 0; c < D; c++) { units.push(range(D).map((row) => row * D + c)); meta.push({ kind: 'col', label: 'C' + (c + 1) }); }
  for (let b = 0; b < D; b++) {
    const top = Math.floor(b / (D / boxCols)) * boxRows;
    const left = (b % (D / boxCols)) * boxCols;
    const box = [];
    for (let r = 0; r < boxRows; r++) for (let c = 0; c < boxCols; c++) box.push((top + r) * D + left + c);
    units.push(box); meta.push({ kind: 'box', label: 'B' + (b + 1) });
  }
  (extra || []).forEach((u) => { units.push(u.cells); meta.push({ kind: u.kind, label: u.label, partial: u.partial === true }); });
  return SG.model.create({ variantId: id, digits: D, units, unitMeta: meta, layout: { rows: D, cols: D, cellRow, cellCol } });
}
const cageModel = buildModel('als-cage', 9, 3, 3, [{ kind: 'cage', label: 'K1', cells: [0, 40, 80], partial: true }]);
const peers = (c) => cageModel.peers[c].length;
console.log('peers R1C1', peers(0), 'R5C5', peers(40), 'R9C9', peers(80), 'R1C2', peers(1));
const popc = (m) => { let n = 0; for (; m; m >>= 1) n += m & 1; return n; };
const rng = SG.testkit.rng.create(77);
const region = [0, 1, 2, 3, 4, 40, 39, 41, 80, 79, 9, 10];
const found = [];
for (let trial = 0; trial < 40000 && found.length < 6; trial++) {
  const state = SG.model.initState(cageModel);
  const n = 4 + rng.int(3);
  const cells = new Set();
  while (cells.size < n) cells.add(region[rng.int(region.length)]);
  cells.forEach((c) => {
    const size = 2 + rng.int(2);
    const set = new Set();
    while (set.size < size) set.add(1 + rng.int(4));
    state.candidates[c] = Array.from(set).reduce((m, d) => m | (1 << (d - 1)), 0);
  });
  const seen = [];
  const ctx = SG.techniques.createContext(cageModel, { onPatternWork: (r) => seen.push(r) });
  const f = SG.alsPatterns.findXz(cageModel, state, ctx, { limits: { cells: 3 } });
  if (f === null) continue;
  // recover the witness: A, B from the engine's own enumeration and order
  const ctx2 = SG.techniques.createContext(cageModel, {});
  const records = SG.alsPatterns.enumerate(cageModel, state, ctx2, SG.alsPatterns.createWork(), { cells: 3 }).records;
  const z = f.i18nArgs.digitY, x = f.i18nArgs.digitX;
  let hit = null;
  for (let i = 0; i < records.length && hit === null; i++) for (let j = i + 1; j < records.length && hit === null; j++) {
    const A = records[i], B = records[j];
    if (A.cells.some((c) => B.cells.indexOf(c) !== -1)) continue;
    if (A.digits.indexOf(x) === -1 || B.digits.indexOf(x) === -1 || A.digits.indexOf(z) === -1 || B.digits.indexOf(z) === -1) continue;
    const cc = A.cells.concat(B.cells).sort((a, b) => a - b);
    if (JSON.stringify(cc) === JSON.stringify(f.cells)) hit = { A, B };
  }
  if (hit === null) continue;
  const a = hit.A.occurrences[z], b = hit.B.occurrences[z];
  const pa = peers(a[0]), pl = peers(a[a.length - 1]), pb = peers(b[0]);
  if (pa !== pl && pa !== pb && a.length >= 2) {
    found.push({ cells: Array.from(cells).sort((p, q) => p - q).map((c) => c + ':' + SG.fixtures.techniques && '').join(''), spec: Array.from(cells).sort((p, q) => p - q).map((c) => [SG.model.cellLabel(cageModel, c), SG.bits.toArray(state.candidates[c]).join('')]),
      x, z, A: hit.A.cells, B: hit.B.cells, aOcc: a, bOcc: b, peers: [pa, pl, pb], work: seen[0].work });
  }
}
found.forEach((f) => console.log(JSON.stringify(f)));
console.log('found ' + found.length);
