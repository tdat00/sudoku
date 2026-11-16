'use strict';
// Scratch (MS12): prototype of the independent oracle and the vectors of the xyChain tests.
const SG = require('./load.js');
const H = SG.techHelper;
const m = H.model('classic9');
const bit = (d) => 1 << (d - 1);
const cell = (r, c) => (r - 1) * 9 + (c - 1);
const lab = (c) => SG.model.cellLabel(m, c);

function stateWith(edits, base) {
  const s = SG.model.initState(m);
  Object.keys(edits).forEach((c) => {
    let mask = 0;
    edits[c].forEach((d) => { mask |= bit(d); });
    s.candidates[Number(c)] = mask;
  });
  if (base) base(s);
  return s;
}
function digitsOf(mask) { const out = []; for (let d = 1; d <= 9; d++) if (mask & bit(d)) out.push(d); return out; }

// the oracle: shortest restricted proof per start literal, then the global one, from m.peers only
function oracle(model, state, maxEdges) {
  const open = (c, d) => state.value[c] === 0 && (state.candidates[c] & bit(d)) !== 0;
  const cands = (c) => (state.value[c] === 0 ? digitsOf(state.candidates[c]) : []);
  const starts = [];
  for (let c = 0; c < model.cellCount; c++) {
    const ds = cands(c);
    if (ds.length !== 2) continue;
    ds.forEach((d) => starts.push([c, d]));
  }
  const results = [];
  starts.forEach(([c0, d0]) => {
    // literals: key c:d:truth
    const key = (c, d, t) => c + ':' + d + ':' + t;
    const dist = new Map();
    const parent = new Map();
    let frontier = [[c0, d0, 0]];
    dist.set(key(c0, d0, 0), 0);
    let length = 0;
    let best = null;
    while (frontier.length > 0 && length < maxEdges && best === null) {
      length++;
      const next = [];
      for (const [c, d, t] of frontier) {
        const outs = [];
        if (t === 0) {
          const ds = cands(c);
          if (ds.length === 2) outs.push([c, ds[0] === d ? ds[1] : ds[0], 1]);
        } else {
          model.peers[c].forEach((p) => { if (open(p, d)) outs.push([p, d, 0]); });
        }
        for (const o of outs) {
          const k = key(o[0], o[1], o[2]);
          if (dist.has(k)) continue;
          dist.set(k, length);
          parent.set(k, key(c, d, t));
          next.push(o);
        }
      }
      frontier = next;
      // proofs at this length
      const found = [];
      for (const [c, d, t] of frontier) {
        if (t !== 1 || d !== d0 || c <= c0) continue;
        const elim = [];
        for (let p = 0; p < model.cellCount; p++) {
          if (p === c0 || p === c) continue;
          if (open(p, d0) && model.peers[c0].indexOf(p) !== -1 && model.peers[c].indexOf(p) !== -1) elim.push(p);
        }
        if (elim.length > 0) found.push({ start: [c0, d0], end: [c, d], length, elim });
      }
      if (found.length > 0) best = found;
    }
    if (best !== null) results.push({ start: [c0, d0], length: best[0].length, ends: best });
  });
  results.sort((a, b) => (a.start[0] - b.start[0]) || (a.start[1] - b.start[1]));
  let min = Infinity;
  results.forEach((r) => { min = Math.min(min, r.length); });
  const first = results.filter((r) => r.length === min)[0] || null;
  return { min, first, all: results };
}

function vector(transpose) {
  const at = (r, c) => (transpose ? cell(c, r) : cell(r, c));
  const edits = {};
  edits[at(1, 1)] = [1, 4];
  edits[at(1, 5)] = [1, 2];
  edits[at(1, 9)] = [2, 3];
  edits[at(5, 9)] = [3, 4];
  return stateWith(edits);
}
function show(title, s, max) {
  const f = SG.techniques.get('xyChain').find(m, s, SG.techniques.createContext(m, max ? { maxChainLength: max } : {}));
  const o = oracle(m, s, 12);
  console.log(title, 'finder', f && f.i18nArgs.length, f && JSON.stringify(f.eliminations), 'oracle', o.min,
    o.first && lab(o.first.start[0]) + o.first.start[1] + ' ends ' + o.first.ends.map((e) => lab(e.end[0]) + ' elim ' + e.elim.map(lab).join('/')).join(';'));
  return f;
}
show('vector', vector(false));
show('vector T', vector(true));

// the tempting shortcut: 1 is a conjugate pair in column 5 (B = R1C5 and E = R5C5), E holds 1, 5, 7; F = R5C7 {1,4}
function shortcut() {
  const edits = {};
  edits[cell(1, 1)] = [1, 4];
  edits[cell(1, 5)] = [1, 2];
  edits[cell(1, 9)] = [2, 3];
  edits[cell(5, 9)] = [3, 4];
  edits[cell(5, 5)] = [1, 5, 7];
  edits[cell(5, 7)] = [1, 4];
  const s = stateWith(edits);
  // digit 1 only in B and E in column 5
  for (let r = 1; r <= 9; r++) {
    if (r === 1 || r === 5) continue;
    s.candidates[cell(r, 5)] &= ~bit(1);
  }
  return s;
}
const sc = shortcut();
const fx = show('shortcut xy', sc);
const general = SG.chainSearch.forcing(m, sc, SG.techniques.createContext(m, {}), { id: 'probe', minLength: 1, maxLength: 12 });
console.log('general', general && general.i18nArgs.kind, general && general.i18nArgs.length, general && JSON.stringify(general.eliminations),
  general && JSON.stringify(general.i18nArgs.chains));
console.log('xy chain', fx && JSON.stringify(fx.i18nArgs.chains));
