'use strict';
// Scratch (MS11b): do the goldens that the recorder wrote equal what the registered ladder gives and what the ladder
// gives without the hidden form of the Unique Rectangle? Each golden is generated exactly as tests/replay-goldens.js does
// (withRequestedLevel, the budget of the recorder, RR.goldenOf), as registered and with the finder wrapped so that a
// `hidden.step` Finding becomes null, and both are compared with the saved golden (the fixture as published by the task
// before this one). Usage (from generator/): node tests/artifacts/difficulty-v3/MS11b/g-cause-saved.js [G14,...]
const SG = require('./load.js');
const RR = SG.fixtures.replayRecording;
const ids = (process.argv[2] || 'G01,G02,G03,G04,G05,G06,G07,G08,G10,G12,G13,G14').split(',');
const def = SG.techniques.get('uniqueRectangle');
const withoutDef = {
  id: def.id, group: def.group, baseCost: def.baseCost, order: def.order, i18nKey: def.i18nKey,
  variantScope: def.variantScope, assumesUniqueness: def.assumesUniqueness,
  find: (model, state, ctx) => {
    const f = def.find(model, state, ctx);
    return f !== null && /hidden\.step$/.test(f.i18nKey) ? null : f;
  }
};
const fields = (a, b, prefix, out) => {
  if (a === b) return out;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = Object.keys(Object.assign({}, a, b));
    keys.forEach((k) => fields(a[k], b[k], prefix + (Array.isArray(a) ? '[' + k + ']' : '.' + k), out));
    return out;
  }
  out.push(prefix);
  return out;
};
const generate = (g) => {
  const req = g.request;
  const run = SG.fixtures.toolRecords.withRequestedLevel(req.variantId, req.difficulty, () =>
    SG.pipeline.run(SG.store.toConfig(req), null, SG.budget.create({ ms: 120000 })));
  return JSON.parse(JSON.stringify(RR.goldenOf({ id: g.id, request: req, today: g.today }, SG.replay.analyse(run.value),
    run.value.model)));
};
ids.forEach((id) => {
  const saved = SG.fixtures.replayGoldens.filter((x) => x.id === id)[0];
  const t0 = Date.now();
  const withHidden = generate(saved);
  SG.techniques.unregister('uniqueRectangle');
  SG.techniques.register(withoutDef);
  let without;
  try {
    without = generate(saved);
  } finally {
    SG.techniques.unregister('uniqueRectangle');
    SG.techniques.register(def);
  }
  const diffWith = fields(saved, withHidden, '', []);
  const diffWithout = fields(saved, without, '', []);
  console.log(id + ' ' + saved.request.variantId + ' ' + saved.request.difficulty + ' seed ' + saved.request.seed +
    ': fields differing from the saved golden: as registered ' + diffWith.length + ', without the hidden form ' +
    diffWithout.length + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
});
