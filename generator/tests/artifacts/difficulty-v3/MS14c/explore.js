'use strict';
// Scratch (MS14c): explores candidate positions for the new core suite tech-cage (prints the Findings of cageCombo).
const SG = require('./load.js');
const H = SG.techHelper;

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

function idx(label) { const m = /^R(\d)C(\d)$/.exec(label); return (m[1] - 1) * 9 + (m[2] - 1); }

function run(spec) {
  const cages = spec.cages.map((c) => ({ cells: c.cells.map(idx), sum: c.sum }));
  const model = build(cages);
  SG.comboTable.enablePropagation('tech-cage-core');
  const fix = new Int32Array(81);
  Object.keys(spec.fix).forEach((k) => { fix[idx(k)] = spec.fix[k]; });
  const solution = SG.dfs.solve(model, fix);
  const valid = SG.model.isSolution(model, solution);
  const givens = new Int32Array(81);
  Object.keys(spec.givens || {}).forEach((k) => { givens[idx(k)] = spec.givens[k]; });
  const opts = { propagate: spec.propagate !== false };
  if (spec.candidates) {
    opts.candidates = new Array(81).fill(null);
    Object.keys(spec.candidates).forEach((k) => { opts.candidates[idx(k)] = spec.candidates[k]; });
  }
  const state = H.makeState(model, givens, opts);
  const tech = SG.techniques.get('cageCombo');
  const f = tech.find(model, state, SG.techniques.createContext(model, {}));
  console.log('== ' + spec.name + ' solution valid=' + valid + ' unsolved=' + state.unsolvedCount);
  if (!f) { console.log('  null'); return; }
  const lab = (c) => SG.model.cellLabel(model, c);
  console.log('  cells', f.cells.map(lab).join(' '));
  console.log('  placements', JSON.stringify(f.placements.map((p) => lab(p[0]) + '=' + p[1])));
  console.log('  elims', f.eliminations.map((e) => lab(e[0]) + '-' + e[1]).join(' '));
  console.log('  args', JSON.stringify(f.i18nArgs));
}

const specs = require(process.argv[2] || './explore-specs.js');
specs.forEach(run);
