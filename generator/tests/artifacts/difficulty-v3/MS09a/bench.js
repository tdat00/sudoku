'use strict';
// Scratch (MS09a): cost per call of the fish finders on random states (classic9 seeds 777 and 99, 12 and 16 digits),
// and the work of finnedXWing. Informational (no assertion): the pattern cost tool is the evidence.
const SG = require('./load.js');
const H = SG.techHelper;

function bench(variantLabel, model, items, reps) {
  const ids = ['xWing', 'skyscraper', 'twoStringKite', 'emptyRectangle', 'finnedXWing', 'swordfish'];
  const out = {};
  ids.forEach((id) => {
    const tech = SG.techniques.get(id);
    const ctx = SG.techniques.createContext(model, {});
    let works = 0;
    let max = 0;
    let fired = 0;
    const t0 = process.hrtime.bigint();
    for (let r = 0; r < reps; r++) {
      items.forEach((item) => {
        const c = r === 0 ? SG.techniques.createContext(model, { onPatternWork: (rec) => { works += rec.work; max = Math.max(max, rec.work); } }) : ctx;
        const f = tech.find(model, item.state, c);
        if (r === 0 && f !== null) fired++;
      });
    }
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    out[id] = { msPerCall: +(ms / (reps * items.length)).toFixed(4), fired, meanWork: +(works / items.length).toFixed(1), maxWork: max };
  });
  console.log(variantLabel, items.length, 'states', JSON.stringify(out));
}

const m9 = H.model('classic9');
bench('classic9 777', m9, H.randomStatesWithKnownSolution(m9, SG.testkit.rng.create(777), 400), 5);
bench('classic9 99', m9, H.randomStatesWithKnownSolution(m9, SG.testkit.rng.create(99), 400), 5);
const m6 = H.model('classic6');
bench('classic6 777', m6, H.randomStatesWithKnownSolution(m6, SG.testkit.rng.create(777), 400), 5);
if (SG.testkit.hasVariant('samurai')) {
  const ms = H.model('samurai');
  bench('samurai 4242', ms, H.randomStatesWithKnownSolution(ms, SG.testkit.rng.create(4242), 12), 3);
}
