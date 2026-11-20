'use strict';
// Scratch (MS14a): the registry/output inactivity differential for the six registered subset techniques, with and without
// calls of the new kernel interleaved. Run with the tree (MS14A_BASE unset) and with the base commit (MS14A_BASE=git:bc3450c):
//   - the registry: id, group, base cost, order, scope and uniqueness of every registered technique, hashed, and whether
//     `lawOfLeftovers` is registered (it must not be);
//   - plain: for every state of the populations (classic9, classic6, classic4, 12 and 16 digits, and every named Jigsaw layout and its
//     transposition from SG.fixtures.jigsawModels) every subset technique's Finding and the number of budget checks it makes;
//   - interleaved (the tree only, the base has no kernel): the same calls again with SG.leftoverPatterns.find called on the same state, on
//     the next state and on a Jigsaw state before and after every subset call, with and without a lifted limit.
// The plain digest of the tree must equal the base's, and the interleaved digest must equal the plain one: no shared scratch.
//   node tests/artifacts/difficulty-v3/MS14a/subset-diff.js
const crypto = require('crypto');
const SG = require('./load.js');
const H = SG.techHelper;
const J = SG.fixtures.jigsawModels;
const IDS = ['nakedPair', 'hiddenPair', 'nakedTriple', 'hiddenTriple', 'nakedQuad', 'hiddenQuad'];

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
[['classic9', H.model('classic9'), 90, 4242], ['classic6', H.model('classic6'), 120, 61], ['classic4', H.model('classic4'), 60, 41],
  ['12 digits', SG.fixtures.models.boxGrid('diff-12', 3, 4), 12, 2026], ['16 digits', SG.fixtures.models.boxGrid('diff-16', 4, 4), 4, 1616]]
  .forEach(([name, model, n, seed]) => {
    H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), n).forEach((item, i) => {
      items.push({ tag: name + ' #' + i + ' ' + item.kind, model, state: item.state });
    });
  });
Object.keys(J.LAYOUTS).forEach((name, b) => [false, true].forEach((t) => {
  const layout = J.parse(J.LAYOUTS[name]);
  const model = J.build(t ? J.transpose(layout) : layout);
  jigsawStates(model, 9100 + 10 * b + (t ? 1 : 0), 20).forEach((state, i) => {
    items.push({ tag: 'jigsaw ' + name + (t ? ' (t)' : '') + ' #' + i, model, state });
  });
}));

const registry = crypto.createHash('sha256');
SG.techniques.list().forEach((t) => registry.update([t.id, t.group, t.baseCost, t.order, JSON.stringify(t.variantScope), t.assumesUniqueness].join('|') + '\n'));
const registered = SG.techniques.has('lawOfLeftovers');

function counted(fn) {
  const budget = { calls: 0, check() { budget.calls++; } };
  const result = fn(budget);
  return { result, checks: budget.calls };
}
function subsetCall(item, id) {
  const out = counted((budget) => SG.techniques.get(id).find(item.model, item.state, SG.techniques.createContext(item.model, { budget })));
  return JSON.stringify([id, out.result, out.checks]);
}

const plain = crypto.createHash('sha256');
let found = 0;
const before = [];
items.forEach((item) => {
  item.snapshot = JSON.stringify([Array.from(item.state.candidates), Array.from(item.state.value)]);
  IDS.forEach((id) => {
    const text = subsetCall(item, id);
    if (!/^\["[a-zA-Z]+",null,/.test(text)) found++;
    plain.update(item.tag + ' ' + text + '\n');
  });
});
let interleaved = null;
let kernelFired = 0;
let kernelCalls = 0;
const kernel = crypto.createHash('sha256');
if (SG.leftoverPatterns) {
  const LO = SG.leftoverPatterns;
  const jig = items.filter((x) => x.model.variantId === 'jigsaw9');
  const digest = crypto.createHash('sha256');
  const poke = (item, k, lift) => {
    const target = k % 3 === 0 ? item : k % 3 === 1 ? items[(items.indexOf(item) + 1) % items.length] : jig[(items.indexOf(item) * 7) % jig.length];
    const records = [];
    const ctx = SG.techniques.createContext(target.model, { onPatternWork: (r) => records.push(r) });
    const finding = LO.find(target.model, target.state, ctx, lift ? { workLimit: 100000000 } : undefined);
    kernelCalls++;
    if (finding !== null) kernelFired++;
    kernel.update(JSON.stringify([target.tag, finding, records]) + '\n');
  };
  items.forEach((item, n) => {
    IDS.forEach((id, k) => {
      poke(item, n + k, k % 2 === 0);
      digest.update(item.tag + ' ' + subsetCall(item, id) + '\n');
      poke(item, n + k + 1, k % 2 === 1);
    });
  });
  interleaved = digest.digest('hex');
}
const unchanged = items.every((item) => item.snapshot === JSON.stringify([Array.from(item.state.candidates), Array.from(item.state.value)]));
const plainHex = plain.digest('hex');
console.log('engine: ' + (process.env.MS14A_BASE || 'tree') + ', states ' + items.length + ' (' + items.filter((x) => x.model.variantId === 'jigsaw9').length +
  ' jigsaw), subset calls ' + items.length * IDS.length + ' (with a Finding ' + found + '), registry sha256 ' + registry.digest('hex') +
  ', lawOfLeftovers registered ' + registered + ', states unchanged ' + unchanged);
console.log('plain sha256 ' + plainHex);
if (interleaved !== null) {
  console.log('interleaved sha256 ' + interleaved + ' (equal to plain: ' + (interleaved === plainHex) + '), kernel calls ' + kernelCalls +
    ' (with a Finding ' + kernelFired + '), kernel results sha256 ' + kernel.digest('hex'));
} else {
  console.log('interleaved: none (no kernel in this source)');
}
process.exit(unchanged && (interleaved === null || interleaved === plainHex) && !registered ? 0 : 1);
