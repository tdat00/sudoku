'use strict';
// Scratch (MS07a): the registered forcingChain and nishio finders, finding, budget ticks and errors, on a fixed
// corpus; run once with the current tech-chain.js and once with SG_CHAIN_FILE = a copy of the original, and
// compare the printed digests. Usage: node differential.js <states> <out.json>
const crypto = require('crypto');
const fs = require('fs');
const SG = require('./load-override.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const count = Number(process.argv[2] || 60);
const out = process.argv[3] || null;

function describe(label, fn) {
  const budget = SG.budget.create({ nodes: label.nodes === undefined ? Infinity : label.nodes });
  let result;
  try {
    result = { f: fn(budget) };
  } catch (err) {
    result = { e: err && err.code ? err.code : String(err) };
  }
  result.ticks = budget.nodes;
  return result;
}

const records = [];
const hash = crypto.createHash('sha256');
function note(key, value) {
  const text = key + ' ' + JSON.stringify(value);
  hash.update(text + '\n');
  if (out) records.push(text);
}

let findNs = 0n;
function ask(id, m, state, options, nodes) {
  const t = process.hrtime.bigint();
  const r = describe({ nodes: nodes }, (budget) => {
    const ctx = SG.techniques.createContext(m, Object.assign({ budget: budget }, options));
    return SG.techniques.get(id).find(m, state, ctx);
  });
  findNs += process.hrtime.bigint() - t;
  return r;
}

const before = SG.model.cloneState;
let finds = 0;
function run(key, m, state) {
  const snapshot = before(state);
  [{}, { maxChainLength: 3 }, { maxChainLength: 6 }, { maxChainLength: 12 }, { maxChainLength: Infinity },
    { maxChainLength: 0 }, { maxChainLength: 'x' }].forEach((options, k) => {
    note(key + ' fc ' + k, ask('forcingChain', m, state, options));
    finds++;
  });
  [{ nodes: 3 }, { nodes: 40 }, { nodes: 400 }].forEach((b, k) => {
    note(key + ' fc budget ' + k, ask('forcingChain', m, state, {}, b.nodes));
    finds++;
  });
  [{}, { maxNishioDepth: 1 }, { maxNishioDepth: 3 }, { maxNishioDepth: 0 }, { maxNishioDepth: 1e9 }].forEach((options, k) => {
    note(key + ' ni ' + k, ask('nishio', m, state, options));
    finds++;
  });
  [{ nodes: 3 }, { nodes: 200 }].forEach((b, k) => {
    note(key + ' ni budget ' + k, ask('nishio', m, state, {}, b.nodes));
    finds++;
  });
  if (JSON.stringify(Array.from(snapshot.candidates)) !== JSON.stringify(Array.from(state.candidates))) {
    throw new Error(key + ': a find wrote to the state');
  }
}

const t0 = Date.now();
const states = H.randomStatesWithKnownSolution(m9, SG.testkit.rng.create(20260101), count);
states.forEach((item, i) => run('rand ' + i + ' ' + item.kind, m9, item.state));
SG.fixtures.classic.unique.slice(0, 12).forEach((fx, i) => {
  run('classic ' + fx.name, m9, H.makeState(m9, fx.puzzle));
});
// small and irregular boards
['classic4', 'classic6'].forEach((id) => {
  const m = H.model(id);
  H.randomStatesWithKnownSolution(m, SG.testkit.rng.create(7), 24).forEach((item, i) => run(id + ' ' + i, m, item.state));
});
console.log('finds', finds, 'ms', Date.now() - t0, 'findMs', Number(findNs / 1000n) / 1000, 'digest', hash.digest('hex'));
if (out) fs.writeFileSync(out, records.join('\n') + '\n');
