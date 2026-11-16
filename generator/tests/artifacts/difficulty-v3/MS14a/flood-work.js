'use strict';
// Scratch (MS14a): the work of the kernel on blank boards of every named layout (the flood), lifted and default.
const SG = require('./load.js');
const J = SG.fixtures.jigsawModels;
Object.keys(J.LAYOUTS).forEach((name) => {
  [false, true].forEach((t) => {
    let layout = J.parse(J.LAYOUTS[name]);
    if (t) layout = J.transpose(layout);
    const model = J.build(layout);
    const state = SG.model.initState(model);
    const run = (opts) => { const records = []; const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) }); const t0 = process.hrtime.bigint(); const f = SG.leftoverPatterns.find(model, state, ctx, opts); return { f: f && f.i18nArgs, r: records[0], ms: Number(process.hrtime.bigint() - t0) / 1e6 }; };
    const lifted = run({ workLimit: 100000000 }); const dflt = run();
    console.log(name + (t ? ' (t)' : '') + ': lifted ' + JSON.stringify(lifted.r) + ' ' + lifted.ms.toFixed(1) + 'ms; default ' + JSON.stringify(dflt.r) + ' ' + dflt.ms.toFixed(1) + 'ms');
  });
});
