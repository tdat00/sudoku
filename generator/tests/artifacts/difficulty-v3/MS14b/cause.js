'use strict';
// MS14b scratch (from MS13c's cause.js): why the canonical outputs change. The outputs
// named by --only are generated in THIS process with the recorders' own procedures, under whatever engine the loader gives
// (the tree's, or MS14B_BASE=git:7eddb15, the base without the registered Law of Leftovers), and compared with the saved canonical
// output (the fixture of the previous task: replay-wire.js, replay-goldens.js, regression.js) and with the merged ledgers of the
// E run (--ledgers=<dir>, recorded from the current sources). Run under the base engine every output must equal the saved one (the
// cause is the activation of the registered technique alone); run under the tree's every output must equal the ledger (the recording is
// reproducible).
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS14b/cause.js --kind=wire|analysis|hash --ledgers=<dir>
//   --only=<G10,G13 | classic9/nightmare,...> [--json=<file>]
// For --kind=hash --only names cells (variant/level); every seed of the cell is generated.
const fs = require('fs');
const path = require('path');
const SG = require('./load.js');

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const hit = args.find((a) => a.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const kind = opt('kind', null);
const ledgerDir = opt('ledgers', null);
const only = opt('only', null) ? opt('only', null).split(',') : null;
const jsonOut = opt('json', null);
const BUDGET_MS = 120000;
const engine = process.env.MS14B_BASE ? process.env.MS14B_BASE : 'tree';

const ledger = {};
fs.readdirSync(ledgerDir).filter((n) => n.endsWith('.json')).forEach((n) => {
  const data = JSON.parse(fs.readFileSync(path.join(ledgerDir, n), 'utf8'));
  (data.records || data.results || []).forEach((r) => { ledger[r.key] = kind === 'hash' ? r.hash : r.value; });
});

const rows = [];
const t0 = Date.now();
const finish = (what, bad) => {
  console.log(what + ' examined ' + rows.length + ' (engine ' + engine + ', ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s); ' +
    'equal to the saved output ' + rows.filter((r) => r.equalsSaved).length + ', equal to the ledger ' +
    rows.filter((r) => r.equalsLedger).length + ', ledger differs from the saved ' + rows.filter((r) => !r.ledgerEqualsSaved).length);
  if (jsonOut) {
    fs.writeFileSync(jsonOut, JSON.stringify({ engine, rows }, null, 1).replace(/\n/g, '\r\n') + '\r\n');
  }
  process.exit(bad ? 1 : 0);
};

if (kind === 'wire') {
  const generate = (req) => {
    const run = SG.fixtures.toolRecords.withRequestedLevel(req.variantId, req.difficulty, () => {
      const config = SG.store.toConfig(req);
      return SG.pipeline.run(config, null, SG.budget.create({ ms: BUDGET_MS }));
    });
    const data = SG.replay.toPlainWire(run.value);
    data.timings = {};
    return JSON.parse(JSON.stringify(data));
  };
  SG.fixtures.replayRecording.WIRE_IDS.forEach((id) => {
    if (only && only.indexOf(id) < 0) return;
    const req = SG.fixtures.replayGoldens.filter((g) => g.id === id)[0].request;
    const t1 = Date.now();
    const made = JSON.stringify(generate(req));
    const saved = JSON.stringify(SG.fixtures.replayWire[id]);
    const fresh = JSON.stringify(ledger[id]);
    const row = { id, request: req.variantId + ' ' + req.difficulty + ' ' + req.seed, equalsSaved: made === saved,
      equalsLedger: made === fresh, ledgerEqualsSaved: fresh === saved, seconds: Number(((Date.now() - t1) / 1000).toFixed(1)) };
    rows.push(row);
    console.log(JSON.stringify(row));
  });
  finish('wires', false);
} else if (kind === 'analysis') {
  const RR = SG.fixtures.replayRecording;
  const generate = (g) => {
    const req = g.request;
    const run = SG.fixtures.toolRecords.withRequestedLevel(req.variantId, req.difficulty, () => {
      const config = SG.store.toConfig(req);
      return SG.pipeline.run(config, null, SG.budget.create({ ms: BUDGET_MS }));
    });
    const analysis = SG.replay.analyse(run.value);
    return JSON.parse(JSON.stringify(RR.goldenOf({ id: g.id, request: req, today: g.today }, analysis, run.value.model)));
  };
  SG.fixtures.replayGoldens.forEach((g) => {
    if (only && only.indexOf(g.id) < 0) return;
    const t1 = Date.now();
    const made = JSON.stringify(generate(g));
    const saved = JSON.stringify(g);
    const fresh = JSON.stringify(ledger[g.id]);
    const row = { id: g.id, request: g.request.variantId + ' ' + g.request.difficulty + ' ' + g.request.seed,
      equalsSaved: made === saved, equalsLedger: made === fresh, ledgerEqualsSaved: fresh === saved,
      seconds: Number(((Date.now() - t1) / 1000).toFixed(1)) };
    rows.push(row);
    console.log(JSON.stringify(row));
  });
  finish('goldens', false);
} else if (kind === 'hash') {
  const T = SG.fixtures.perfTools;
  T.COMBOS.forEach((combo) => {
    if (only && only.indexOf(combo.key) < 0) return;
    const old = SG.fixtures.regression.hashes[combo.key];
    const t1 = Date.now();
    const mine = [];
    T.SEEDS.forEach((seed, i) => {
      const key = combo.key + '#' + seed;
      const made = T.hashRecord(combo.variant, combo.level, seed).hash;
      const row = { key, made, saved: old[i], ledger: ledger[key], equalsSaved: made === old[i], equalsLedger: made === ledger[key],
        ledgerEqualsSaved: ledger[key] === old[i] };
      rows.push(row);
      mine.push(row);
    });
    console.log(combo.key + ': ' + mine.filter((r) => !r.ledgerEqualsSaved).length + ' of ' + mine.length + ' differ in the ledger (seeds ' +
      mine.filter((r) => !r.ledgerEqualsSaved).map((r) => r.key.split('#')[1]).join(', ') + '); equal to the saved ' +
      mine.filter((r) => r.equalsSaved).length + ', to the ledger ' + mine.filter((r) => r.equalsLedger).length + ' (' +
      ((Date.now() - t1) / 1000).toFixed(1) + ' s)');
  });
  finish('hashes', false);
} else {
  throw new Error('--kind=wire|analysis|hash');
}
