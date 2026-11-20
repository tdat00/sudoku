'use strict';
// Scratch (MS11c): searches for a counterexample to the equivalence of the survivors of the mutation run (mutations 16 to
// 20 of mutations.cjs: the tally comparison `!==` replaced by `<`, `>` or `!== && !== 3`, and the first or last digit not
// checked). Argument: in a complete unit whose open cells all hold two candidates, a digit that is placed has exactly one
// solved cell and no open holder, so the cells split into |P| solved and U open ones and the open cells give 2U holders to
// the U unplaced digits; any one of the comparisons then forces every count (one digit is implied by the others).
// The search starts from constructed graves and from random states with solved cells on classic4 and classic6, applies
// small random changes and compares the predicate of the finder with each mutant over every proposal of the cell.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS11c/equivalence-search.js [states]
const SG = require('./load.js');
const H = SG.techHelper;
const bit = (d) => 1 << (d - 1);
const total = Number(process.argv[2] || 400000);

function predicate(model, state, target, extraBit, variant) {
  const digits = model.digits;
  for (let u = 0; u < model.units.length; u++) {
    const cells = model.units[u];
    const tally = new Array(digits).fill(0);
    let placed = 0;
    let holdsTarget = false;
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (c === target) holdsTarget = true;
      if (state.value[c] !== 0) {
        placed |= 1 << (state.value[c] - 1);
        tally[state.value[c] - 1]++;
        continue;
      }
      for (let mask = c === target ? state.candidates[c] & ~extraBit : state.candidates[c]; mask !== 0; mask &= mask - 1) {
        tally[31 - Math.clz32(mask & -mask)]++;
      }
    }
    if (holdsTarget && (placed & extraBit) !== 0) return false;
    let from = 0;
    let to = digits;
    if (variant === 'skipLast') to = digits - 1;
    if (variant === 'skipFirst') from = 1;
    for (let d = from; d < to; d++) {
      const want = ((placed >> d) & 1) === 1 ? 1 : 2;
      let bad;
      if (variant === 'less') bad = tally[d] < want;
      else if (variant === 'more') bad = tally[d] > want;
      else if (variant === 'three') bad = tally[d] !== want && tally[d] !== 3;
      else bad = tally[d] !== want;
      if (bad) return false;
    }
  }
  return true;
}

const VARIANTS = ['less', 'more', 'three', 'skipLast', 'skipFirst'];
const stats = { states: 0, accepted: 0, disagreements: {} };
VARIANTS.forEach((v) => { stats.disagreements[v] = 0; });
['classic4', 'classic6'].forEach((id) => {
  const model = H.model(id);
  const solution = Array.from(SG.dfs.solve(model, new Int32Array(model.cellCount)));
  const rng = SG.testkit.rng.create(20260116 + model.digits);
  const rounds = Math.floor(total / 2);
  for (let i = 0; i < rounds; i++) {
    const state = SG.model.initState(model);
    const placedDigits = rng.int(3) === 0 ? [model.digits] : rng.int(5) === 0 ? [model.digits, 1] : [];
    const free = [];
    for (let d = 1; d <= model.digits; d++) if (placedDigits.indexOf(d) === -1) free.push(d);
    if (free.length < 3) continue;
    const next = {};
    free.forEach((d, k) => { next[d] = free[(k + 1) % free.length]; });
    for (let c = 0; c < model.cellCount; c++) {
      const s = solution[c];
      if (placedDigits.indexOf(s) !== -1) {
        state.value[c] = s;
        state.candidates[c] = bit(s);
        state.unsolvedCount--;
      } else {
        state.candidates[c] = bit(s) | bit(next[s]);
      }
    }
    const openCells = [];
    for (let c = 0; c < model.cellCount; c++) if (state.value[c] === 0) openCells.push(c);
    const target = openCells[rng.int(openCells.length)];
    state.candidates[target] |= bit(1 + rng.int(model.digits));
    // small random changes: add, remove, move a candidate; solve or reopen a cell; duplicate a solved value
    const changes = rng.int(4);
    for (let k = 0; k < changes; k++) {
      const c = rng.int(model.cellCount);
      const kind = rng.int(6);
      if (kind === 0) state.candidates[c] |= bit(1 + rng.int(model.digits));
      else if (kind === 1 && state.value[c] === 0) state.candidates[c] &= ~bit(1 + rng.int(model.digits));
      else if (kind === 2 && state.value[c] === 0) {
        state.candidates[c] = (state.candidates[c] & ~bit(1 + rng.int(model.digits))) | bit(1 + rng.int(model.digits));
      } else if (kind === 3 && state.value[c] === 0) {
        const v = 1 + rng.int(model.digits);
        state.value[c] = v;
        state.candidates[c] = bit(v);
        state.unsolvedCount--;
      } else if (kind === 4 && state.value[c] !== 0) {
        state.value[c] = 0;
        state.candidates[c] = bit(solution[c]) | bit(1 + rng.int(model.digits));
        state.unsolvedCount++;
      } else if (kind === 5) {
        state.candidates[c] = state.value[c] !== 0 ? state.candidates[c] : (state.candidates[c] | bit(1 + rng.int(model.digits)));
      }
    }
    // the guard of the finder: one trivalue open cell, every other open cell with two candidates
    let tri = -1;
    let ok = true;
    for (let c = 0; c < model.cellCount && ok; c++) {
      if (state.value[c] !== 0) continue;
      const k = SG.bits.popcount(state.candidates[c]);
      if (k === 2) continue;
      if (k !== 3 || tri >= 0) ok = false;
      else tri = c;
    }
    if (!ok || tri < 0) continue;
    stats.states++;
    for (let bits = state.candidates[tri]; bits !== 0; bits &= bits - 1) {
      const extraBit = bits & -bits;
      const base = predicate(model, state, tri, extraBit, 'base');
      if (base) stats.accepted++;
      VARIANTS.forEach((v) => {
        if (predicate(model, state, tri, extraBit, v) !== base) {
          stats.disagreements[v]++;
          if (stats.disagreements[v] <= 3) console.log('DISAGREEMENT ' + v + ' on ' + id + ': ' + JSON.stringify({
            value: Array.from(state.value), candidates: Array.from(state.candidates), tri, extraBit }));
        }
      });
    }
  }
});
console.log('states passing the guard ' + stats.states + ', accepted proposals ' + stats.accepted + ', disagreements ' +
  JSON.stringify(stats.disagreements));
