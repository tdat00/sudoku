'use strict';
// Scratch (MS07a): numbers behind the seam tests.
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');

function ringsModel(sizes) {
  const units = [];
  const cellRow = [];
  const cellCol = [];
  let base = 0;
  sizes.forEach((n) => {
    for (let i = 0; i < n; i++) units.push([base + i, base + ((i + 1) % n)]);
    base += n;
  });
  for (let c = 0; c < base; c++) { cellRow.push(0); cellCol.push(c); }
  return SG.model.create({ variantId: 'rings-' + sizes.join('+'), digits: 2, units: units,
    layout: { rows: 1, cols: base, cellRow: cellRow, cellCol: cellCol } });
}

function ctxFor(m, options) { return SG.techniques.createContext(m, options || {}); }
function forcing(m, state, opts, ctxOptions) {
  const seen = [];
  const o = Object.assign({ onPatternWork: (r) => seen.push(r) }, ctxOptions);
  const f = SG.chainSearch.forcing(m, state, ctxFor(m, o), opts);
  return { f: f, rec: seen[0], seen: seen };
}

const rc = ringsModel([13, 5]);
const rs = SG.model.initState(rc);
const a = forcing(rc, rs, { id: 'x', minLength: 1, maxLength: 12, workLimit: null });
console.log('union', a.f && a.f.i18nArgs.length, JSON.stringify(a.rec), a.f.cells);
const r13 = ringsModel([13]);
const b = forcing(r13, SG.model.initState(r13), { id: 'x', minLength: 1, maxLength: 12, workLimit: null });
console.log('ring13', b.f.i18nArgs.length, JSON.stringify(b.rec), JSON.stringify(b.f.i18nArgs.chains.map((c) => c.length - 1)), JSON.stringify(b.f.i18nArgs.chains[0][0]));
const c = forcing(rc, rs, { id: 'x', minLength: 1, maxLength: 12, workLimit: b.rec.work });
console.log('union at ring13 work', c.f, JSON.stringify(c.rec));
const d = forcing(rc, rs, { id: 'x', minLength: 5, maxLength: 12, workLimit: null });
console.log('union min5', d.f, JSON.stringify(d.rec));
for (const L of [0, 1, a.rec.work - 1, a.rec.work]) {
  const e = forcing(rc, rs, { id: 'x', minLength: 1, maxLength: 12, workLimit: L });
  console.log('limit', L, e.f && e.f.i18nArgs.length, JSON.stringify(e.rec));
}

// check counts
let checks = 0;
const base = ctxFor(rc, {});
const counting = Object.assign({}, base, { check: function () { checks++; } });
const ring201 = ringsModel([201]);
const st201 = SG.model.initState(ring201);
const cc = Object.assign({}, ctxFor(ring201, {}), { check: function () { checks++; } });
const r = SG.chainSearch.forcing(ring201, st201, cc, { id: 'x', minLength: 1, maxLength: Infinity, workLimit: 600 });
console.log('ring201 checks', checks, r);
checks = 0;
const solved = H.makeState(m9, SG.fixtures.classic.unique[0].solution, { propagate: false });
const c9 = Object.assign({}, ctxFor(m9, {}), { check: function () { checks++; } });
SG.chainSearch.forcing(m9, solved, c9, { id: 'x', workLimit: 50000 });
console.log('solved bounded checks', checks);
checks = 0;
SG.chainSearch.forcing(m9, solved, c9, { id: 'x', workLimit: null });
console.log('solved legacy checks', checks);
checks = 0;
SG.chainSearch.nishio(m9, solved, c9, { id: 'x', workLimit: 50000 });
console.log('solved nishio bounded checks', checks);
checks = 0;
SG.chainSearch.nishio(m9, solved, c9, { id: 'x', workLimit: null });
console.log('solved nishio legacy checks', checks);

// nishio numbers
function fixture(name) { return SG.fixtures.classic.unique.filter((fx) => fx.name === name)[0]; }
function nishio(m, state, opts, ctxOptions) {
  const seen = [];
  const o = Object.assign({ onPatternWork: (rec) => seen.push(rec) }, ctxOptions);
  const f = SG.chainSearch.nishio(m, state, ctxFor(m, o), opts);
  return { f: f, rec: seen[0] };
}
const esc = H.makeState(m9, fixture('escargot').puzzle);
const hp = H.makeState(m9, fixture('hard-platinum').puzzle);
let t0 = Date.now();
const n1 = nishio(m9, esc, { id: 'nishio', minDepth: 1, maxDepth: 2, workLimit: null });
console.log('escargot', n1.f.i18nArgs.depth, JSON.stringify(n1.rec), Date.now() - t0);
t0 = Date.now();
const n2 = nishio(m9, hp, { id: 'nishio', minDepth: 1, maxDepth: 2, workLimit: null });
console.log('platinum', n2.f.i18nArgs.depth, JSON.stringify(n2.rec), Date.now() - t0);
t0 = Date.now();
const n3 = nishio(m9, esc, { id: 'nishio', minDepth: 2, maxDepth: 2, workLimit: null });
console.log('escargot [2,2]', n3.f, JSON.stringify(n3.rec), Date.now() - t0);
for (const L of [0, 1, n2.rec.work - 1, n2.rec.work]) {
  const e = nishio(m9, hp, { id: 'x', minDepth: 1, maxDepth: 2, workLimit: L });
  console.log('nishio limit', L, e.f && e.f.i18nArgs.depth, JSON.stringify(e.rec));
}
