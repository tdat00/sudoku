'use strict';
// Scratch (MS15a, after MS14a's subset-diff.js): the registry/output inactivity differential of the ALS enumerator, with and without calls of
// the enumerator interleaved. Run with the tree (MS15A_BASE unset) and with the base commit (MS15A_BASE=git:8bd2487, every SOURCE_FILES entry
// of that commit loaded from git into memory by load.js):
//   - the surface: the registry (id, group, base cost, order, scope, uniqueness of every registered technique), the weight/tier tables of
//     SG.difficulty, the keys of the SG namespace, and whether an ALS technique is registered (it must not be);
//   - plain: for every state of the populations (classic9, classic6, classic4, 12 and 16 digits, diagonal, windows and Killer cages from the
//     Generator's variants, every named Jigsaw layout and its transposition from SG.fixtures.jigsawModels) the Finding of EVERY registered
//     technique that applies to the board, and the number of budget checks it makes;
//   - interleaved (the tree only, the base has no enumerator): the same calls again with SG.alsPatterns.enumerate called before and after every
//     finder call, on the same state, on the next state and on a Jigsaw or 16-digit state, with a default guard, a tiny guard (cut), a lifted
//     guard and a spent-budget context, so that any scratch shared with a finder would show.
// The plain digest of the tree must equal the base's, and the interleaved digest must equal the plain one.
//   node tests/artifacts/difficulty-v3/MS15a/inactivity-diff.js
const crypto = require('crypto');
const SG = require('./load.js');
const H = SG.techHelper;
const J = SG.fixtures.jigsawModels;

function jigsawStates(model, seed, count) {
  const rng = SG.testkit.rng.create(seed);
  const out = [];
  for (let i = 0; i < count; i++) {
    const solution = J.solve(model, rng.fork('grid' + i));
    const pick = rng.fork('pick' + i);
    const placedShare = 0.05 + 0.3 * pick.next();
    const keep = 0.04 + 0.5 * pick.next();
    const state = SG.model.initState(model);
    for (let c = 0; c < model.cellCount; c++) if (pick.next() < placedShare) SG.constraints.assign(model, state, c, solution[c]);
    for (let c = 0; c < model.cellCount; c++) {
      if (state.value[c] !== 0) continue;
      for (let v = 1; v <= model.digits; v++) {
        if (v !== solution[c] && (state.candidates[c] & (1 << (v - 1))) !== 0 && pick.next() >= keep) SG.constraints.eliminate(model, state, c, v);
      }
    }
    out.push(state);
  }
  return out;
}

const items = [];
[['classic9', H.model('classic9'), 60, 4242], ['classic6', H.model('classic6'), 60, 61], ['classic4', H.model('classic4'), 40, 41],
  ['12 digits', SG.fixtures.models.boxGrid('diff-12', 3, 4), 6, 2026], ['16 digits', SG.fixtures.models.boxGrid('diff-16', 4, 4), 4, 1616],
  ['diagonalX', H.model('diagonalX'), 8, 7001], ['hyper', H.model('hyper'), 8, 7002], ['killer', H.model('killer'), 8, 7003]]
  .forEach(([name, model, n, seed]) => {
    H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), n).forEach((item, i) => {
      items.push({ tag: name + ' #' + i + ' ' + item.kind, model, state: item.state });
    });
  });
Object.keys(J.LAYOUTS).forEach((name, b) => [false, true].forEach((t) => {
  const layout = J.parse(J.LAYOUTS[name]);
  const model = J.build(t ? J.transpose(layout) : layout);
  jigsawStates(model, 9100 + 10 * b + (t ? 1 : 0), 4).forEach((state, i) => {
    items.push({ tag: 'jigsaw ' + name + (t ? ' (t)' : '') + ' #' + i, model, state });
  });
}));

const registry = crypto.createHash('sha256');
SG.techniques.list().forEach((t) => registry.update([t.id, t.group, t.baseCost, t.order, JSON.stringify(t.variantScope), t.assumesUniqueness].join('|') + '\n'));
const weights = crypto.createHash('sha256').update(JSON.stringify([SG.difficulty.WEIGHTS, SG.difficulty.TABLE, SG.difficulty.SCORING, SG.difficulty.LEVELS])).digest('hex');
const alsIds = ['alsXz', 'sueDeCoq', 'als', 'alsEnumerate', 'alsXyWing', 'deathBlossom'];
const registeredAls = alsIds.filter((id) => SG.techniques.has(id)).concat(SG.techniques.list().map((t) => t.id).filter((id) => /^als/i.test(id) || /sueDeCoq/.test(id)));
const keys = Object.keys(SG).sort();

function counted(fn) {
  const budget = { calls: 0, check() { budget.calls++; } };
  const result = fn(budget);
  return { result, checks: budget.calls };
}
const defs = SG.techniques.list();
// nishio and nishioDeep have no work limit (their accepted policy): as in legacy-diff.js they run on the boards of at most 6 digits only
const runnable = (def, model) => SG.techniques.appliesTo(def, model.variantId) && !((def.id === 'nishio' || def.id === 'nishioDeep') && model.digits > 6);
function finderCall(item, def) {
  const out = counted((budget) => def.find(item.model, item.state, SG.techniques.createContext(item.model, { budget })));
  return JSON.stringify([def.id, out.result, out.checks]);
}

const plain = crypto.createHash('sha256');
let found = 0;
let calls = 0;
items.forEach((item) => {
  item.snapshot = JSON.stringify([Array.from(item.state.candidates), Array.from(item.state.value)]);
  defs.forEach((def) => {
    if (!runnable(def, item.model)) return;
    const text = finderCall(item, def);
    calls++;
    if (!/^\["[a-zA-Z0-9]+",null,/.test(text)) found++;
    plain.update(item.tag + ' ' + text + '\n');
  });
});
let interleaved = null;
let enumCalls = 0;
let enumWithRecords = 0;
let enumCapped = 0;
const enumerated = crypto.createHash('sha256');
if (SG.alsPatterns) {
  const A = SG.alsPatterns;
  const big = items.filter((x) => x.model.variantId === 'jigsaw9' || x.model.digits === 16);
  const digest = crypto.createHash('sha256');
  const poke = (item, k) => {
    const target = k % 3 === 0 ? item : k % 3 === 1 ? items[(items.indexOf(item) + 1) % items.length] : big[(items.indexOf(item) * 7) % big.length];
    const mode = k % 4;
    let work;
    let limits;
    let options = {};
    if (mode === 0) work = A.createWork();
    else if (mode === 1) work = A.createWork(37);
    else if (mode === 2) { work = A.createWork(1e8); limits = { records: 1e6 }; } else { work = A.createWork(); options = { budget: SG.budget.create({ nodes: 2 }) }; }
    const ctx = SG.techniques.createContext(target.model, Object.assign({ onPatternWork: () => {} }, options));
    const out = A.enumerate(target.model, target.state, ctx, work, limits);
    enumCalls++;
    if (out.records.length > 0) enumWithRecords++;
    if (out.capHit !== null) enumCapped++;
    enumerated.update(JSON.stringify([target.tag, mode, out, work]) + '\n');
  };
  let n = 0;
  items.forEach((item) => {
    defs.forEach((def, k) => {
      if (!runnable(def, item.model)) return;
      poke(item, n + k);
      digest.update(item.tag + ' ' + finderCall(item, def) + '\n');
      poke(item, n + k + 1);
    });
    n++;
  });
  interleaved = digest.digest('hex');
}
const unchanged = items.every((item) => item.snapshot === JSON.stringify([Array.from(item.state.candidates), Array.from(item.state.value)]));
const plainHex = plain.digest('hex');
console.log('engine: ' + (process.env.MS15A_BASE || 'tree') + ', states ' + items.length + ' (' + items.filter((x) => x.model.variantId === 'jigsaw9').length + ' jigsaw), registered techniques ' +
  defs.length + ', finder calls ' + calls + ' (with a Finding ' + found + '), states unchanged ' + unchanged);
console.log('registry sha256 ' + registry.digest('hex') + ', weights/tiers sha256 ' + weights + ', ALS technique registered ' + (registeredAls.length > 0 ? registeredAls.join(',') : 'none'));
console.log('SG keys (' + keys.length + '): ' + keys.join(' '));
console.log('plain sha256 ' + plainHex);
if (interleaved !== null) {
  console.log('interleaved sha256 ' + interleaved + ' (equal to plain: ' + (interleaved === plainHex) + '), enumerator calls ' + enumCalls + ' (with records ' + enumWithRecords +
    ', cut or capped ' + enumCapped + '), enumerator results sha256 ' + enumerated.digest('hex'));
} else {
  console.log('interleaved: none (no enumerator in this source)');
}
process.exit(unchanged && (interleaved === null || interleaved === plainHex) && registeredAls.length === 0 ? 0 : 1);
