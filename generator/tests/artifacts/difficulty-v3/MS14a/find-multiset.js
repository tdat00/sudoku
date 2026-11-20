'use strict';
// Scratch (MS14a): looks for hand-made positions, consistent with a known solution, on which the first removing choice is a
// given one and the multiset rule differs from a set rule (signatures as the set of digits present).
//   node find-multiset.js <layout> <lines> <regions> <seed> <tries> [t]      (t: transposed layout)
const SG = require('./load.js');
const J = SG.fixtures.jigsawModels;
let layout = J.parse(J.LAYOUTS[process.argv[2]]);
if (process.argv[7] === 't') layout = J.transpose(layout);
const model = J.build(layout);
const wantLines = process.argv[3]; const wantRegions = process.argv[4];
const rng = SG.testkit.rng.create(Number(process.argv[5] || 1));
const tries = Number(process.argv[6] || 2000);

function sees(a, b) { return Array.prototype.indexOf.call(model.peers[a], b) !== -1; }
function digitList(mask) { const o = []; for (let d = 1; d <= 9; d++) if (mask & (1 << (d - 1))) o.push(d); return o; }
function kind(k) { const o = []; model.unitMeta.forEach((m, u) => { if (m.kind === k) o.push(u); }); return o; }
function combos(list, n) { const r = []; if (n === 1) list.forEach((x) => r.push([x])); else for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) r.push([list[i], list[j]]); return r; }
function assignments(state, cells) {
  const options = cells.map((c) => (state.value[c] ? [state.value[c]] : digitList(state.candidates[c])));
  const out = [];
  (function walk(i, chosen) {
    if (i === cells.length) { out.push(chosen.slice()); return; }
    options[i].forEach((d) => {
      for (let q = 0; q < i; q++) if (chosen[q] === d && sees(cells[q], cells[i])) return;
      chosen.push(d); walk(i + 1, chosen); chosen.pop();
    });
  })(0, []);
  return out;
}
function oracle(state, mode) {
  for (let n = 1; n <= 2; n++) {
    for (const lk of ['row', 'col']) {
      for (const lc of combos(kind(lk), n)) {
        for (const gc of combos(kind('region'), n)) {
          const L = []; lc.forEach((u) => model.units[u].forEach((c) => L.push(c)));
          const G = []; gc.forEach((u) => model.units[u].forEach((c) => G.push(c)));
          const a = L.filter((c) => G.indexOf(c) < 0).sort((x, y) => x - y); const b = G.filter((c) => L.indexOf(c) < 0).sort((x, y) => x - y);
          if (a.length < 1 || a.length > 4) continue;
          if (![...a, ...b].some((c) => state.value[c] === 0)) continue;
          const sig = (asg) => (mode === 'set' ? [...new Set(asg)].sort((x, y) => x - y).join(',') : asg.slice().sort((x, y) => x - y).join(','));
          const tab = (cells) => { const t = {}; assignments(state, cells).forEach((asg) => { const k = sig(asg); if (!t[k]) t[k] = cells.map(() => ({})); asg.forEach((d, i) => { t[k][i][d] = true; }); }); return t; };
          const ta = tab(a); const tb = tab(b);
          const shared = Object.keys(ta).filter((k) => tb[k]);
          const ln = lc.map((u) => model.unitMeta[u].label).join('+'); const rn = gc.map((u) => model.unitMeta[u].label).join('+');
          if (!shared.length) return { declined: true, lines: ln, regions: rn };
          const el = [];
          [[a, ta], [b, tb]].forEach(([cells, t]) => cells.forEach((c, i) => { if (state.value[c]) return; digitList(state.candidates[c]).forEach((d) => { if (!shared.some((k) => t[k][i][d])) el.push(SG.model.cellLabel(model, c) + ':' + d); }); }));
          if (el.length) return { lines: ln, regions: rn, el: el.join(' '), a, b };
        }
      }
    }
  }
  return null;
}

const wanted = (r) => r && !r.declined && r.lines === wantLines && r.regions === wantRegions;
const lc = wantLines.split('+').map((s) => model.unitMeta.findIndex((m) => m.label === s));
const gc = wantRegions.split('+').map((s) => model.unitMeta.findIndex((m) => m.label === s));
const L = []; lc.forEach((u) => model.units[u].forEach((c) => L.push(c)));
const G = []; gc.forEach((u) => model.units[u].forEach((c) => G.push(c)));
const cells = [...L.filter((c) => G.indexOf(c) < 0), ...G.filter((c) => L.indexOf(c) < 0)];
let found = 0; let reached = 0; let passed = 0; const tally = {};
for (let t = 0; t < tries && found < 6; t++) {
  const r = rng.fork('t' + t);
  const S = SG.testkit.randomSolution(model, r.fork('S'));
  // the cells of the choice that repeat a digit are the interesting ones: keep only solutions where a side repeats
  const aDigits = cells.slice(0, cells.length / 2).map((c) => S[c]);
  const bDigits = cells.slice(cells.length / 2).map((c) => S[c]);
  if (new Set(aDigits).size === aDigits.length && new Set(bDigits).size === bDigits.length) continue;
  const state = SG.model.initState(model);
  const spec = [];
  cells.forEach((c) => {
    const kindOf = r.int(3);
    if (kindOf === 0) { spec.push('given ' + SG.model.cellLabel(model, c) + '=' + S[c]); SG.constraints.assign(model, state, c, S[c]); }
    else {
      let mask = 1 << (S[c] - 1); const extra = r.int(3);
      for (let k = 0; k < extra; k++) mask |= 1 << r.int(9);
      state.candidates[c] &= mask;
      spec.push('open ' + SG.model.cellLabel(model, c) + ':' + digitList(state.candidates[c]).join('') + ' (S ' + S[c] + ')');
    }
  });
  const real = oracle(state, 'multiset');
  passed++;
  const key = real ? (real.declined ? 'declined' : real.lines + '/' + real.regions) : 'none';
  tally[key] = (tally[key] || 0) + 1;
  if (process.env.DEBUG && passed <= 3) console.log('DEBUG ' + spec.join('; ') + ' => ' + JSON.stringify(real));
  if (!wanted(real)) continue;
  reached++;
  const flat = oracle(state, 'set');
  const same = flat && !flat.declined && flat.el === real.el && flat.lines === real.lines && flat.regions === real.regions;
  if (same) continue;
  found++;
  console.log('FOUND ' + spec.join('; ') + ' | multiset: ' + real.el + ' | set: ' + (flat ? (flat.declined ? 'declined ' + flat.lines + '/' + flat.regions : flat.lines + '/' + flat.regions + ' ' + flat.el) : 'null'));
}
console.log('done, repeat-states ' + passed + ', first removal from the wanted choice in ' + reached + ' states, found ' + found + '; first choices: ' + JSON.stringify(tally));
