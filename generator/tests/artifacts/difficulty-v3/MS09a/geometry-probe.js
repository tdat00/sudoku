'use strict';
// Scratch (MS09a): evaluates the digit maps of the geometry tests against the reference and the finder before they are
// written into the suite. Usage: node geometry-probe.js
const SG = require('./load.js');
const { referenceFinned } = require('./reference.js');
const H = SG.techHelper;
const m9 = H.model('classic9');

function digitsMap(model, spec) {
  const eliminate = [];
  Object.keys(spec).forEach((key) => {
    const keep = new Set(spec[key].map((label) => H.cell(model, label)));
    for (let c = 0; c < model.cellCount; c++) if (!keep.has(c)) eliminate.push([c, Number(key)]);
  });
  return H.makeState(model, '.'.repeat(model.cellCount), { eliminate, propagate: false });
}
const turn = (ref) => { const m = /^R(\d+)C(\d+)$/.exec(ref); return 'R' + m[2] + 'C' + m[1]; };

function show(name, labels, model) {
  const mdl = model || m9;
  const state = digitsMap(mdl, { 5: labels });
  const ref = referenceFinned(SG, mdl, state, 2);
  const all = referenceFinned(SG, mdl, state, 2, { allCovers: true });
  const rm = ref.filter((p) => p.targets.length > 0);
  const f = SG.techniques.get('finnedXWing').find(mdl, state, SG.techniques.createContext(mdl, {}));
  const lab = (c) => H.label(mdl, c);
  const ul = (u) => mdl.unitMeta[u].label;
  console.log('== ' + name + ' | patterns ' + ref.length + ' removing ' + rm.length + ' allCoversSame ' +
    (JSON.stringify(ref) === JSON.stringify(all)));
  rm.forEach((p) => console.log('   ref ' + p.kind + ' bases ' + p.bases.map(ul) + ' covers ' + p.covers.map(ul) + ' fins ' + p.fins.map(lab) +
    ' body ' + p.body + ' -> ' + p.targets.map(lab)));
  ref.filter((p) => p.targets.length === 0).forEach((p) => console.log('   (no target) ' + p.kind + ' bases ' + p.bases.map(ul) + ' covers ' +
    p.covers.map(ul) + ' fins ' + p.fins.map(lab)));
  console.log('   finder ' + (f === null ? 'null' : JSON.stringify({ cells: f.cells.map(lab), el: f.eliminations.map((e) => lab(e[0])), args: f.i18nArgs })));
}

const CORE = ['R1C2', 'R1C8', 'R4C2', 'R4C8', 'R4C9', 'R5C8'];
const cases = {
  'bare vector': CORE,
  'vector (decoy R9C2)': CORE.concat(['R9C2']),
  'vector transposed': CORE.concat(['R9C2']).map(turn),
  'sashimi': ['R1C2', 'R1C8', 'R4C8', 'R4C9', 'R5C8', 'R9C2'],
  'sashimi transposed': ['R1C2', 'R1C8', 'R4C8', 'R4C9', 'R5C8', 'R9C2'].map(turn),
  'two fins same line': ['R1C2', 'R1C8', 'R4C2', 'R4C8', 'R4C7', 'R4C9', 'R5C8', 'R9C2'],
  'two fins, two targets': ['R1C2', 'R1C8', 'R4C2', 'R4C8', 'R4C7', 'R4C9', 'R5C8', 'R6C8', 'R9C2'],
  'fins in two bases, one box': ['R4C2', 'R4C8', 'R4C9', 'R5C2', 'R5C8', 'R5C7', 'R6C8', 'R9C2'],
  'split-box fins': ['R1C2', 'R1C8', 'R1C5', 'R4C2', 'R4C8', 'R4C9', 'R5C8', 'R9C2'],
  'off-cover target only': ['R1C2', 'R1C8', 'R4C2', 'R4C8', 'R4C9', 'R5C7', 'R9C2'],
  'target missing the fin (R7C8)': ['R1C2', 'R1C8', 'R4C2', 'R4C8', 'R4C9', 'R7C8', 'R9C2'],
  'fins only in one base line': ['R1C2', 'R1C8', 'R4C7', 'R4C9', 'R5C8', 'R9C2'],
  'no fin (ordinary X-Wing)': ['R1C2', 'R1C8', 'R4C2', 'R4C8', 'R5C8'],
  'third base candidate in a third box + vector (two boxes of fins)': ['R1C2', 'R1C8', 'R4C2', 'R4C8', 'R4C9', 'R4C5', 'R5C8', 'R9C2'],
  'target without the candidate': ['R1C2', 'R1C8', 'R4C2', 'R4C8', 'R4C9', 'R9C2'],
  'cover order': ['R1C2', 'R1C8', 'R1C9', 'R2C2', 'R2C8', 'R3C8', 'R3C9', 'R9C5'],
  'cover order b': ['R1C2', 'R1C8', 'R1C9', 'R2C2', 'R2C8', 'R3C8', 'R9C5', 'R9C1']
};
Object.keys(cases).forEach((name) => show(name, cases[name]));
