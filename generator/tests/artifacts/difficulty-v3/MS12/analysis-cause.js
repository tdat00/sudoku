'use strict';
// Scratch (MS12): why the golden analyses change. For every request of G01-G14 the golden record is generated in this process
// WITHOUT xyChain (unregistered, restored afterwards) by the procedure of tests/replay-goldens.js (withRequestedLevel,
// pipeline.run, a 120,000 ms budget, SG.replay.analyse, goldenOf) and compared with the saved replay-goldens.js (the previous
// source) and with the merged ledgers of the E run (--ledgers=<dir>), so that a golden changes in the ledgers if and only if
// the technique changes it. The admission of the technique at the level is listed, and for a changed golden the number of
// recorded steps that use xyChain (the golden's rows) is not needed: the cause is the with/without difference itself.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS12/analysis-cause.js --ledgers=<dir> [--ids=G03,G04]
//   [--json=<file>]
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
const RR = SG.fixtures.replayRecording;

const ledger = {};
fs.readdirSync(ledgerDir).filter((n) => n.endsWith('.json')).forEach((n) => {
  const data = JSON.parse(fs.readFileSync(path.join(ledgerDir, n), 'utf8'));
  (data.records || data.results || []).forEach((r) => { ledger[r.key] = r.value; });
});

const def = SG.techniques.get('xyChain');
const find = (id) => SG.fixtures.replayGoldens.filter((g) => g.id === id)[0];
function generate(g) {
  const req = g.request;
  const run = SG.fixtures.toolRecords.withRequestedLevel(req.variantId, req.difficulty, () => {
    const config = SG.store.toConfig(req);
    return SG.pipeline.run(config, null, SG.budget.create({ ms: BUDGET_MS }));
  });
  const analysis = SG.replay.analyse(run.value);
  return JSON.parse(JSON.stringify(RR.goldenOf({ id: g.id, request: req, today: g.today }, analysis, run.value.model)));
}

const rows = [];
SG.fixtures.replayGoldens.forEach((g) => {
  if (only && only.split(',').indexOf(g.id) < 0) return;
  const req = g.request;
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
  try { without = generate(g); } finally { SG.techniques.register(def); }
  const saved = JSON.stringify(find(g.id));
  const fresh = JSON.stringify(ledger[g.id]);
  const row = {
    id: g.id, request: req.variantId + ' ' + req.difficulty + ' ' + req.seed, admitsXyChain: admitted,
    withoutEqualsSaved: JSON.stringify(without) === saved, ledgerEqualsSaved: fresh === saved,
    changedInLedger: fresh !== saved, seconds: Number(((Date.now() - t0) / 1000).toFixed(1))
  };
  rows.push(row);
  console.log(JSON.stringify(row));
});
const bad = rows.filter((r) => !r.withoutEqualsSaved);
console.log('goldens examined ' + rows.length + '; changed in the ledgers ' + rows.filter((r) => r.changedInLedger).length +
  '; without xyChain not equal to the saved golden ' + bad.length);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ rows }, null, 1).replace(/\n/g, '\r\n') + '\r\n');
