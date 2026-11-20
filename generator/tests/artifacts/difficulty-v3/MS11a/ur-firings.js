'use strict';
// Scratch (MS11a): how often each subtype of uniqueRectangle fires in the seeded random populations of the suites
// (the sweeps of tech-wing.test.js and techniques.test.js: states walked with the finder alone, the Finding applied and the
// singles it unlocks, up to maxSteps times). Counts per i18nKey.
//   node tests/artifacts/difficulty-v3/MS11a/ur-firings.js
const SG = require('./load.js');
const H = SG.techHelper;

function apply(model, state, finding) {
  for (const e of finding.eliminations) {
    if (!SG.constraints.eliminate(model, state, e[0], e[1])) return false;
  }
  return SG.constraints.propagate(model, state);
}

function count(model, items, maxSteps) {
  const tech = SG.techniques.get('uniqueRectangle');
  const ctx = SG.techniques.createContext(model, { assumeUniqueness: true });
  const out = {};
  const capped = { n: 0 };
  let states = 0;
  items.forEach((item) => {
    const state = SG.model.cloneState(item.state);
    states++;
    for (let step = 0; step < maxSteps && state.unsolvedCount > 0; step++) {
      const records = [];
      const withObserver = SG.techniques.createContext(model, { assumeUniqueness: true, onPatternWork: (r) => records.push(r) });
      const f = tech.find(model, state, withObserver);
      if (records.length > 0 && records[0].capHit !== null) capped.n++;
      if (f === null) break;
      out[f.i18nKey] = (out[f.i18nKey] || 0) + 1;
      if (!apply(model, state, f)) break;
    }
  });
  return { states, out, capped: capped.n };
}

const setups = [
  ['classic9', H.model('classic9'), 20260101, 300, 40],
  ['classic9', H.model('classic9'), 20260101, 300, 12],
  ['classic6', H.model('classic6'), 20260101, 200, 40],
  ['classic4', H.model('classic4'), 20260101, 300, 40],
  ['12 digits', SG.fixtures.models.boxGrid('test-wing-12', 3, 4), 20260101, 200, 40],
  ['classic9 seed 777', H.model('classic9'), 777, 300, 12],
  ['classic9 seed 99', H.model('classic9'), 99, 300, 12]
];
setups.forEach(([name, model, seed, n, steps]) => {
  const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), n);
  const r = count(model, items, steps);
  console.log(name + ' seed ' + seed + ' maxSteps ' + steps + ': ' + r.states + ' states ' + JSON.stringify(r.out) + ' capped ' + r.capped);
});
