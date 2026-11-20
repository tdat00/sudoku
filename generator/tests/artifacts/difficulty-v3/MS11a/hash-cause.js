'use strict';
// Scratch (MS11a): why the regression hashes change. For every cell of the 26 whose level admits uniqueRectangle (the allowed
// techniques of the level, read from SG.difficulty.spec on the variant's model), every seed is generated twice in this
// process, once as registered and once without types 3 and 4 (finder wrapped, restored afterwards). The
// "without" hash is compared with the recorded hash (the previous task's source, the table of regression.js, not yet
// updated at the time of the run) and the "with" hash with the hash of the merged ledgers (given as --ledgers=<dir>), so
// that a key changes if and only if the technique changes the puzzle. Cells that do not admit the technique are listed.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS11a/hash-cause.js --ledgers=<dir> [--json=<file>]
const fs = require('fs');
const path = require('path');
const SG = require('./load.js');
const D = SG.difficulty;
const T = SG.fixtures.perfTools;

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const hit = args.find((a) => a.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const ledgerDir = opt('ledgers', null);
const jsonOut = opt('json', null);
const baselineFile = opt('baseline', null);

// The previous record of every key: the table of regression.js, or (after it was updated) the recordedOld of an earlier run.
const baseline = {};
if (baselineFile) JSON.parse(fs.readFileSync(baselineFile, 'utf8')).rows.forEach((r) => { baseline[r.key] = r.recordedOld; });

const recordedNew = {};
fs.readdirSync(ledgerDir).filter((n) => n.endsWith('.json')).forEach((n) => {
  const data = JSON.parse(fs.readFileSync(path.join(ledgerDir, n), 'utf8'));
  (data.records || data.results || []).forEach((r) => { recordedNew[r.key] = r.hash; });
});

const def = SG.techniques.get('uniqueRectangle');
// The "without" finder: the registered one, returning nothing where it would return a type 3 or a type 4 (those run only
// after the first pass found nothing, so this is exactly the previous behaviour).
const withoutDef = {
  id: def.id, group: def.group, baseCost: def.baseCost, order: def.order, i18nKey: def.i18nKey,
  variantScope: def.variantScope, assumesUniqueness: def.assumesUniqueness,
  find: (model, state, ctx) => {
    const f = def.find(model, state, ctx);
    return f !== null && /type[34]\.step$/.test(f.i18nKey) ? null : f;
  }
};
const admit = [];
const skipped = [];
T.COMBOS.forEach((combo) => {
  const model = SG.variants.get(combo.variant).build({}, SG.rng.create(1));
  let ok = false;
  try { ok = D.spec(combo.level, model).allowedTechniques.indexOf('uniqueRectangle') >= 0; } catch (e) { ok = false; }
  (ok ? admit : skipped).push(combo);
});
console.log('cells that admit uniqueRectangle (' + admit.length + '): ' + admit.map((c) => c.key).join(', '));
console.log('cells that do not (' + skipped.length + '): ' + skipped.map((c) => c.key).join(', '));

const rows = [];
const t0 = Date.now();
const run = (combo, seed) => T.hashRecord(combo.variant, combo.level, seed).hash;
admit.forEach((combo) => {
  const old = SG.fixtures.regression.hashes[combo.key];
  T.SEEDS.forEach((seed, i) => {
    const key = combo.key + '#' + seed;
    const recordedOld = baselineFile ? baseline[key] : old[i];
    const hashWith = run(combo, seed);
    SG.techniques.unregister('uniqueRectangle');
    SG.techniques.register(withoutDef);
    let hashWithout;
    try { hashWithout = run(combo, seed); } finally {
      SG.techniques.unregister('uniqueRectangle');
      SG.techniques.register(def);
    }
    rows.push({
      key, hashWith, hashWithout, recordedOld, recordedNew: recordedNew[key],
      withEqualsLedger: hashWith === recordedNew[key], withoutEqualsOld: hashWithout === recordedOld,
      changedByTechnique: hashWith !== hashWithout, changedInLedger: recordedNew[key] !== recordedOld
    });
  });
  const mine = rows.filter((r) => r.key.indexOf(combo.key + '#') === 0);
  console.log(combo.key + ': ' + mine.filter((r) => r.changedByTechnique).length + ' of ' + mine.length +
    ' change with the technique (seeds ' + mine.filter((r) => r.changedByTechnique).map((r) => r.key.split('#')[1]).join(', ') + ')');
});
const bad = rows.filter((r) => !r.withEqualsLedger || !r.withoutEqualsOld || r.changedByTechnique !== r.changedInLedger);
console.log('keys examined ' + rows.length + '; changed by the technique ' + rows.filter((r) => r.changedByTechnique).length +
  '; changed in the ledgers ' + rows.filter((r) => r.changedInLedger).length + '; inconsistent ' + bad.length +
  ' (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
bad.forEach((r) => console.log('  INCONSISTENT ' + JSON.stringify(r)));
if (jsonOut) {
  const text = JSON.stringify({ admit: admit.map((c) => c.key), skipped: skipped.map((c) => c.key), rows }, null, 1);
  fs.writeFileSync(jsonOut, text.replace(/\n/g, '\r\n') + '\r\n');
}
