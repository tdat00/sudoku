'use strict';
// Scratch (MS09b): the independent enumeration of the finned fish with searched prefixes (the test suite carries its own
// copy, built the same way), from model.units, cellUnits, unitMeta and peers only. Exports
// referenceFinned(SG, model, state, size, opts): opts.allCovers, opts.digits, opts.limit (a searched prefix: the
// combinations of base lines before that position), opts.stopAtFirst (after the first pattern that removes something) and
// opts.report ({ tested, capped }); every pattern carries `unit`, the position of its combination of base lines.

function combinations(list, k) {
  const out = [];
  (function pick(start, chosen) {
    if (chosen.length === k) {
      out.push(chosen.slice());
      return;
    }
    for (let i = start; i < list.length; i++) {
      chosen.push(list[i]);
      pick(i + 1, chosen);
      chosen.pop();
    }
  })(0, []);
  return out;
}

const peerSets = new WeakMap();
function peerSetsOf(model) {
  let sets = peerSets.get(model);
  if (!sets) {
    sets = Array.from(model.peers, (list) => new Set(list));
    peerSets.set(model, sets);
  }
  return sets;
}

function referenceFinned(SG, model, state, size, opts) {
  const options = opts || {};
  const limit = options.limit === undefined ? Infinity : options.limit;
  const report = options.report || {};
  report.tested = 0;
  report.capped = false;
  let stop = false;
  const found = [];
  const cand = state.candidates;
  const val = state.value;
  const peers = peerSetsOf(model);
  const isComplete = (u) => model.units[u].length === model.digits && !(model.unitMeta[u] && model.unitMeta[u].partial);
  const unitsOfKind = (kind) => model.unitMeta.map((m, u) => (m.kind === kind && isComplete(u) ? u : -1)).filter((u) => u >= 0);
  const holders = (cell, test) => Array.from(model.cellUnits[cell]).filter((u) => isComplete(u) && test(model.unitMeta[u].kind));
  const isBoxLike = (kind) => kind === 'box' || kind === 'region';
  for (let d = 1; d <= model.digits && !stop; d++) {
    if (options.digits && options.digits.indexOf(d) === -1) continue;
    const bit = 1 << (d - 1);
    ['row', 'col'].forEach((kind) => {
      if (stop) return;
      const other = kind === 'row' ? 'col' : 'row';
      const bases = [];
      unitsOfKind(kind).forEach((u) => {
        const cells = Array.from(model.units[u]);
        if (cells.some((c) => val[c] === d)) return;
        const open = cells.filter((c) => val[c] === 0 && (cand[c] & bit) !== 0);
        if (open.length < 2) return;
        if (open.some((c) => holders(c, (k) => k === kind).length !== 1 || holders(c, (k) => k === other).length !== 1)) return;
        bases.push({ unit: u, cells: open, covers: open.map((c) => holders(c, (k) => k === other)[0]) });
      });
      combinations(bases, size).forEach((combo) => {
        if (stop) return;
        if (report.tested >= limit) {
          report.capped = true;
          stop = true;
          return;
        }
        const unit = report.tested++;
        const pool = options.allCovers ? unitsOfKind(other) :
          Array.from(new Set([].concat.apply([], combo.map((b) => b.covers)))).sort((a, b) => a - b);
        combinations(pool, size).forEach((covers) => {
          if (stop) return;
          const fins = [];
          const all = [];
          combo.forEach((b) => b.cells.forEach((c, i) => {
            all.push(c);
            if (covers.indexOf(b.covers[i]) === -1) fins.push(c);
          }));
          if (fins.length === 0) return;
          const boxes = fins.map((f) => holders(f, isBoxLike));
          if (boxes.some((list) => list.length !== 1 || list[0] !== boxes[0][0])) return;
          if (combo.some((b) => b.covers.every((cv) => covers.indexOf(cv) === -1))) return;
          if (covers.some((cv) => !combo.some((b) => b.covers.indexOf(cv) !== -1))) return;
          const targets = new Set();
          covers.forEach((cv) => Array.from(model.units[cv]).forEach((c) => {
            if (val[c] !== 0 || (cand[c] & bit) === 0) return;
            if (combo.some((b) => model.units[b.unit].indexOf(c) !== -1)) return;
            if (fins.every((f) => peers[c].has(f))) targets.add(c);
          }));
          found.push({ digit: d, kind, bases: combo.map((b) => b.unit), covers, fins: fins.sort((a, b) => a - b),
            cells: all.sort((a, b) => a - b), targets: Array.from(targets).sort((a, b) => a - b),
            body: combo.map((b) => b.covers.filter((cv) => covers.indexOf(cv) !== -1).length), unit });
          if (options.stopAtFirst && targets.size > 0) stop = true;
        });
      });
    });
  }
  return found;
}

module.exports = { referenceFinned, combinations };
