'use strict';
// Scratch (MS10b): the scope of the literal R13 rule on real positions, as sampled evidence only (it is not a proof of
// equivalence). For the positions after every technique below wxyzWing (the same dug corpus as explore-dug.js: seed 4242,
// mode 'below'), every WXYZ pattern with a target (digit-set-first enumeration, units only) is classified: does a quartet cell
// hold a single candidate, is a quartet cell isolated (it shares no digit with the other three; this is not a test of the
// general disconnection of the four cells), and does the first pattern of the finder differ from the first pattern that has
// neither (what a rule with "at least two candidates" or an isolated-cell exclusion would return).
//   node tests/artifacts/difficulty-v3/MS10b/scope-check.js [count] [seed]
const SG = require('./load.js');
const H = SG.techHelper;
const model = H.model('classic9');
const count = Number(process.argv[2] || 3000);
const seed = Number(process.argv[3] || 4242);
const bit = (d) => 1 << (d - 1);
const pop = SG.bits.popcount;
const seesCache = (() => {
  const n = model.cellCount;
  const m = new Uint8Array(n * n);
  model.units.forEach((cells) => { for (let i = 0; i < cells.length; i++) for (let j = 0; j < cells.length; j++) if (i !== j) m[cells[i] * n + cells[j]] = 1; });
  return m;
})();
const sees = (a, b) => seesCache[a * model.cellCount + b] === 1;

function patterns(state) {
  const n = model.cellCount;
  const cand = state.candidates;
  const pool = [];
  for (let c = 0; c < n; c++) if (state.value[c] === 0 && cand[c] !== 0 && pop(cand[c]) <= 4) pool.push(c);
  const out = [];
  for (let a = 1; a <= 9; a++) for (let b = a + 1; b <= 9; b++) for (let c = b + 1; c <= 9; c++) for (let d = c + 1; d <= 9; d++) {
    const digits = [a, b, c, d];
    const mask = bit(a) | bit(b) | bit(c) | bit(d);
    const inside = pool.filter((cell) => (cand[cell] & ~mask) === 0);
    for (let i = 0; i < inside.length; i++) for (let j = i + 1; j < inside.length; j++) for (let k = j + 1; k < inside.length; k++) for (let l = k + 1; l < inside.length; l++) {
      const quad = [inside[i], inside[j], inside[k], inside[l]];
      if ((cand[quad[0]] | cand[quad[1]] | cand[quad[2]] | cand[quad[3]]) !== mask) continue;
      const holders = {};
      const apart = [];
      digits.forEach((dd) => {
        holders[dd] = quad.filter((cell) => (cand[cell] & bit(dd)) !== 0);
        if (holders[dd].some((p, x) => holders[dd].some((q, y) => y > x && !sees(p, q)))) apart.push(dd);
      });
      if (apart.length !== 1) continue;
      const z = apart[0];
      let target = false;
      for (let t = 0; t < n && !target; t++) {
        if (state.value[t] === 0 && (cand[t] & bit(z)) !== 0 && quad.indexOf(t) === -1 && holders[z].every((h) => sees(t, h))) target = true;
      }
      if (!target) continue;
      const single = quad.some((cell) => pop(cand[cell]) === 1);
      const isolated = quad.some((cell) => quad.every((other) => other === cell || (cand[cell] & cand[other]) === 0));
      out.push({ quad, single, isolated });
    }
  }
  out.sort((x, y) => { for (let i = 0; i < 4; i++) if (x.quad[i] !== y.quad[i]) return x.quad[i] - y.quad[i]; return 0; });
  return out;
}

const before = SG.techniques.list().filter((t) => t.order < 155 && t.variantScope === null).map((t) => t.id);
const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), count * 4);
let positions = 0;
let withPattern = 0;
let all = 0;
let singles = 0;
let isolated = 0;
let firstDiffers = 0;
for (let i = 0; i < items.length; i += 4) {
  positions++;
  const state = H.stateAfter(model, H.puzzleString(model, items[i].givens), before);
  const list = patterns(state);
  if (list.length === 0) continue;
  withPattern++;
  all += list.length;
  singles += list.filter((p) => p.single).length;
  isolated += list.filter((p) => p.isolated).length;
  const clean = list.find((p) => !p.single && !p.isolated);
  if (!clean || clean.quad.join() !== list[0].quad.join()) firstDiffers++;
}
console.log('seed ' + seed + ': ' + positions + ' positions after the techniques below wxyzWing, ' + withPattern + ' hold a pattern with a target, ' + all +
  ' patterns in all; patterns with a single-candidate cell ' + singles + ', with a cell that shares no digit with the other three ' + isolated +
  '; positions where the first pattern differs from the first pattern of a rule without those two cases ' + firstDiffers);
