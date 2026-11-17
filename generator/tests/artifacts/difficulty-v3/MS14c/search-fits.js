'use strict';
// Scratch (MS14c): looks for a consistent propagated position of one cage in which the "every open cell holds a digit of the set" test
// of the surviving-combination filter changes what cageCombo finds (mutant S03). Prints the first few.
const SG = require('./load.js');
const H = SG.techHelper;
const D = 9;

function build(cages) {
  const units = [];
  const meta = [];
  const cellRow = [];
  const cellCol = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { cellRow.push(r); cellCol.push(c); }
  for (let r = 0; r < 9; r++) { units.push(Array.from({ length: 9 }, (_, c) => r * 9 + c)); meta.push({ kind: 'row', label: 'R' + (r + 1) }); }
  for (let c = 0; c < 9; c++) { units.push(Array.from({ length: 9 }, (_, r) => r * 9 + c)); meta.push({ kind: 'col', label: 'C' + (c + 1) }); }
  for (let b = 0; b < 9; b++) {
    const cells = [];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cells.push((Math.floor(b / 3) * 3 + i) * 9 + (b % 3) * 3 + j);
    units.push(cells);
    meta.push({ kind: 'box', label: 'B' + (b + 1) });
  }
  return SG.model.create({ variantId: 'tech-cage-core', digits: 9, units, unitMeta: meta,
    layout: { rows: 9, cols: 9, cellRow, cellCol }, cages });
}
const pop = (m) => { let n = 0; for (; m; m >>= 1) n += m & 1; return n; };
const sum = (m) => { let t = 0; for (let d = 1; d <= 9; d++) if (m & (1 << (d - 1))) t += d; return t; };

function result(model, state, cage, opts) {
  const open = cage.cells.filter((c) => state.value[c] === 0);
  let fixedMask = 0; let fixedSum = 0; let union = 0;
  cage.cells.forEach((c) => { const v = state.value[c]; if (v) { fixedMask |= 1 << (v - 1); fixedSum += v; } });
  open.forEach((c) => { union |= state.candidates[c]; });
  const sets = [];
  for (let m = 1; m < 512; m++) {
    if (pop(m) !== open.length || sum(m) !== cage.sum - fixedSum) continue;
    if (!opts.noForbidden && (m & fixedMask)) continue;
    if (!opts.noUnion && (m & ~union)) continue;
    if (!opts.noFits && !open.every((c) => state.candidates[c] & m)) continue;
    sets.push(m);
  }
  if (!sets.length) return 'none';
  let always = 511; let valid = 0;
  sets.forEach((s) => { always &= s; valid |= s; });
  const out = [];
  for (let d = 1; d <= 9; d++) {
    const bit = 1 << (d - 1);
    if (!(always & bit)) continue;
    const places = open.filter((c) => state.candidates[c] & bit);
    if (places.length < 2) { out.push('P' + d); continue; }
    model.units.forEach((cells, u) => {
      if (!places.every((p) => cells.indexOf(p) !== -1)) return;
      for (const x of cells) if (!state.value[x] && cage.cells.indexOf(x) === -1 && (state.candidates[x] & bit)) out.push(x + ':' + d);
    });
  }
  open.forEach((c) => { for (let e = 1; e <= 9; e++) if ((state.candidates[c] & (1 << (e - 1))) && !(valid & (1 << (e - 1)))) out.push(c + ':' + e); });
  return out.sort().join(',');
}

SG.comboTable.enablePropagation('tech-cage-core');
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const mode = process.argv[2] || 'fits';
const trials = Number(process.argv[3] || 3000);
let found = 0;
for (let trial = 0; trial < trials && found < 4; trial++) {
  const size = 2 + Math.floor(rnd() * 3);
  const cells = [];
  const start = Math.floor(rnd() * 9) * 9 + Math.floor(rnd() * (9 - size));
  for (let i = 0; i < size; i++) cells.push(start + i);
  const digs = [];
  while (digs.length < size) { const d = 1 + Math.floor(rnd() * 9); if (digs.indexOf(d) === -1) digs.push(d); }
  const model = build([{ cells, sum: digs.reduce((a, b) => a + b, 0) }]);
  const cands = new Array(81).fill(null);
  cells.forEach((c, i) => {
    let s = String(digs[i]);
    for (let d = 1; d <= 9; d++) if (d !== digs[i] && rnd() < 0.45) s += d;
    cands[c] = s;
  });
  let state;
  try { state = H.makeState(model, new Int32Array(81), { candidates: cands }); } catch (e) { continue; }
  const a = result(model, state, model.cages[0], {});
  const b = result(model, state, model.cages[0], mode === 'fits' ? { noFits: true } : mode === 'forbidden' ? { noForbidden: true } : { noUnion: true });
  if (a !== b) {
    found++;
    console.log('mode ' + mode + ' cage ' + cells.map((c) => SG.model.cellLabel(model, c)).join(' ') + ' sum ' + model.cages[0].sum + ' digits ' + digs.join(''));
    console.log('  cands ' + cells.map((c) => SG.model.cellLabel(model, c) + '=' + [1,2,3,4,5,6,7,8,9].filter((d) => state.candidates[c] & (1 << (d - 1))).join('')).join(' '));
    console.log('  with  : ' + a.slice(0, 120));
    console.log('  w/o   : ' + b.slice(0, 120));
  }
}
console.log('found ' + found);
