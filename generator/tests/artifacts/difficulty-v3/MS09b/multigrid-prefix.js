'use strict';
// Scratch (MS09b): how deep a searched prefix does the agreement test on the multi-grid boards need to see firings, and what
// does the enumeration of that prefix cost? Usage (from generator/): node tests/artifacts/difficulty-v3/MS09b/multigrid-prefix.js
const SG = require('./load.js');
const { referenceFinned } = require('./reference.js');
const H = SG.techHelper;
['samurai', 'sohei', 'flower', 'butterfly'].forEach((v) => {
  if (!SG.testkit.hasVariant(v)) return;
  const model = H.model(v);
  const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(4242), 12);
  [100, 300, 1000].forEach((limit) => {
    const t0 = Date.now();
    let found = 0;
    let capped = 0;
    let complete = 0;
    items.slice(0, 8).forEach((it) => {
      const report = {};
      const patterns = referenceFinned(SG, model, it.state, 3, { limit, stopAtFirst: true, report }).filter((p) => p.targets.length > 0);
      if (patterns.length > 0) found++; else if (report.capped) capped++; else complete++;
    });
    console.log(v + ' limit ' + limit + ': found ' + found + ', complete ' + complete + ', capped ' + capped + ', ' + (Date.now() - t0) + ' ms for the enumeration');
  });
});
