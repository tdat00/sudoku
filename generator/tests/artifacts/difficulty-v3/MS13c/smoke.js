'use strict';
// MS13c scratch: the grouped forcing finders against the singleton seam (the accepted legacy search) on random states.
// For every state: forcingChain (window 1..C) and forcingChainLong (C+1..12) as registered, against the singleton seam
// with workLimit null over the same window; every Finding is checked by the independent checker (canonical nodes for
// the grouped domain). Classes: equal (byte equal), groupFinding (a version 2 Finding), shorter, grouped only, pure
// differences (a legacy-format Finding that differs from the legacy one: must be 0), legacy only (a lost deduction).
// Usage: node smoke.js [count] [model] [seed]
const SG = require('./load.js');
const H = SG.techHelper;
const CP = SG.chainProofs;
const count = Number(process.argv[2] || 40);
const modelId = process.argv[3] || 'classic9';
const seed = Number(process.argv[4] || 77003);
const m = H.model(modelId);
const C = SG.chainSearch.SHORT_MAX;
const states = H.randomStatesWithKnownSolution(m, SG.testkit.rng.create(seed), count);
const tally = { states: 0, bothNull: 0, equal: 0, groupFinding: 0, groupShorter: 0, groupedOnly: 0, pureDiffers: 0,
  legacyOnly: 0, fallback: 0, fallbackFound: 0, capped: 0, bad: 0 };
const out = [];
for (const item of states) {
  tally.states++;
  for (const [id, min, max] of [['forcingChain', 1, C], ['forcingChainLong', C + 1, 12]]) {
    const records = [];
    const ctx = SG.techniques.createContext(m, { onPatternWork: (r) => records.push(r) });
    const got = SG.techniques.get(id).find(m, item.state, ctx);
    const legacy = SG.chainSearch.forcing(m, item.state, SG.techniques.createContext(m, {}),
      { id, minLength: min, maxLength: max, workLimit: null });
    const rec = records[0];
    if (rec.fallback) { tally.fallback++; if (rec.fallback.outcome === 'found') tally.fallbackFound++; }
    if (rec.grouped.stop && rec.grouped.stop !== 'window') tally.capped++;
    if (got) {
      const problems = CP.pathProblems(m, item.state, got, { canonical: rec.domain === 'grouped' });
      if (problems.length) { tally.bad++; out.push({ id, problems: problems.slice(0, 3) }); }
    }
    const same = JSON.stringify(got) === JSON.stringify(legacy);
    if (!got && !legacy) tally.bothNull++;
    else if (same) tally.equal++;
    else if (got && got.i18nArgs.proofVersion === 2) {
      tally.groupFinding++;
      if (!legacy) tally.groupedOnly++;
      else if (got.i18nArgs.length < legacy.i18nArgs.length) tally.groupShorter++;
    } else if (got && legacy) {
      tally.pureDiffers++;
      out.push({ id, pure: [JSON.stringify(got).slice(0, 300), JSON.stringify(legacy).slice(0, 300)] });
    } else if (!got) {
      tally.legacyOnly++;
      out.push({ id, legacyOnly: JSON.stringify(rec).slice(0, 400) });
    } else {
      out.push({ id, other: [JSON.stringify(got).slice(0, 200), String(legacy)] });
    }
  }
}
console.log(modelId, JSON.stringify(tally));
out.slice(0, 10).forEach((o) => console.log(JSON.stringify(o)));
