'use strict';
// Scratch (MS12): why the wires change. For every request of G09-G13, the SG.replay.toPlainWire data is generated in this
// process WITHOUT xyChain (unregistered, restored afterwards), with the recorder's own procedure (tests/replay-fixtures.js
// wireSpec.generate: withRequestedLevel, pipeline.run, a 120,000 ms budget, timings removed), and compared with the saved
// replay-wire.js (the previous source) and with the merged ledgers of the E run (given as --ledgers=<dir>), so that a wire
// changes in the ledgers if and only if the technique changes it. The admission of the technique at the request's level is
// listed too.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS12/wire-cause.js --ledgers=<dir> [--ids=G09,G10] [--json=<file>]
const fs = require('fs');
const path = require('path');
const SG = require('./load.js');

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const hit = args.find((a) => a.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const ledgerDir = opt('ledgers', null);
const only = opt('ids', null);
const jsonOut = opt('json', null);
const BUDGET_MS = 120000;

const ledger = {};
fs.readdirSync(ledgerDir).filter((n) => n.endsWith('.json')).forEach((n) => {
  const data = JSON.parse(fs.readFileSync(path.join(ledgerDir, n), 'utf8'));
  (data.records || data.results || []).forEach((r) => { ledger[r.key] = r.value; });
});

const def = SG.techniques.get('xyChain');
function generate(req) {
  const run = SG.fixtures.toolRecords.withRequestedLevel(req.variantId, req.difficulty, () => {
    const config = SG.store.toConfig(req);
    return SG.pipeline.run(config, null, SG.budget.create({ ms: BUDGET_MS }));
  });
  const data = SG.replay.toPlainWire(run.value);
  data.timings = {};
  return JSON.parse(JSON.stringify(data));
}

const rows = [];
SG.fixtures.replayRecording.WIRE_IDS.forEach((id) => {
  if (only && only.split(',').indexOf(id) < 0) return;
  const req = SG.fixtures.replayGoldens.filter((g) => g.id === id)[0].request;
  const model = SG.variants.get(req.variantId).build({}, SG.rng.create(1));
  let admitted = null;
  try {
    admitted = SG.difficulty.spec(req.difficulty, model).allowedTechniques.indexOf('xyChain') >= 0;
  } catch (e) {
    admitted = 'spec failed: ' + e.message;
  }
  const t0 = Date.now();
  SG.techniques.unregister('xyChain');
  let without;
  try { without = generate(req); } finally { SG.techniques.register(def); }
  const saved = JSON.stringify(SG.fixtures.replayWire[id]);
  const fresh = JSON.stringify(ledger[id]);
  const row = {
    id, request: req.variantId + ' ' + req.difficulty + ' ' + req.seed, admitsXyChain: admitted,
    withoutEqualsSaved: JSON.stringify(without) === saved, ledgerEqualsSaved: fresh === saved,
    changedInLedger: fresh !== saved, seconds: Number(((Date.now() - t0) / 1000).toFixed(1))
  };
  rows.push(row);
  console.log(JSON.stringify(row));
});
const bad = rows.filter((r) => !r.withoutEqualsSaved);
console.log('wires examined ' + rows.length + '; changed in the ledgers ' + rows.filter((r) => r.changedInLedger).length +
  '; without xyChain not equal to the saved wire ' + bad.length);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ rows }, null, 1).replace(/\n/g, '\r\n') + '\r\n');
