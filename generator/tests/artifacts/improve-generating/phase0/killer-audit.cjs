'use strict';

/*
 * Killer-only structure rule of the independent audit (IG-S02 re-audit), data-only and engine-free: the engine enters
 * only through `rebuild(cages)`, which the verifier worker backs with `SG.killer.modelFromCages` and `SG.pipeline.toWire`.
 *
 * Why a rule of its own: a Killer puzzle's model is the base board plus one partial all-different unit per cage of two
 * or more cells (`unitMeta.kind: 'cage'`), so the generic comparison of the units with the rebuilt base model rejects
 * every Killer puzzle. The rule (author-approved) is:
 *  - the cages partition all 81 cells exactly once; each cage has valid indices, is non-empty, is orthogonally
 *    connected and has `distinct: true`; its integer sum equals the sum of the distinct saved solution digits in it;
 *  - rebuild the model from the saved cages, in the saved order, with `SG.killer.modelFromCages` and compare the
 *    COMPLETE model wire: the 27 base units, exactly one matching cage unit per cage of size >= 2, none for a
 *    singleton and no extra unit, the colours and the layout. Nothing is repaired, sorted or normalised.
 * The independent solution/givens, uniqueness, canonical-rating and requiredness checks stay as they are. Provisional
 * (pre-freeze) evidence tooling.
 */
const C = require('./common.cjs');

const CELLS = 81;
const DIGITS = 9;

function asList(x) {
  if (Array.isArray(x)) return x;
  if (ArrayBuffer.isView(x)) return Array.from(x);
  return null;
}

function isIndex(x) {
  return Number.isInteger(x) && x >= 0 && x < CELLS;
}

function adjacent(a, b) {
  const dr = Math.abs(Math.floor(a / DIGITS) - Math.floor(b / DIGITS));
  const dc = Math.abs((a % DIGITS) - (b % DIGITS));
  return dr + dc === 1;
}

function isConnected(cells) {
  if (cells.length <= 1) return true;
  const seen = new Set([cells[0]]);
  const queue = [cells[0]];
  for (let i = 0; i < queue.length; i++) {
    for (let j = 0; j < cells.length; j++) {
      if (!seen.has(cells[j]) && adjacent(queue[i], cells[j])) {
        seen.add(cells[j]);
        queue.push(cells[j]);
      }
    }
  }
  return seen.size === cells.length;
}

function head(list, n) {
  return list.slice(0, n).join(',') + (list.length > n ? ',...' : '');
}

/** The data-only problems of the cage layout against the saved solution (empty: well formed). */
function cageProblems(model, solution) {
  const cages = model.cages;
  if (!Array.isArray(cages) || cages.length === 0) return ['the model has no cages'];
  const problems = [];
  const sol = asList(solution);
  const solOk = sol !== null && sol.length === CELLS && sol.every(function (d) {
    return Number.isInteger(d) && d >= 1 && d <= DIGITS;
  });
  if (!solOk) problems.push('the saved solution is not 81 digits of 1..9');
  const owners = new Array(CELLS).fill(0);
  cages.forEach(function (cage, k) {
    const where = 'cage ' + k;
    const cells = cage && typeof cage === 'object' ? asList(cage.cells) : null;
    if (cells === null || cells.length === 0) {
      problems.push(where + ' has no cells');
      return;
    }
    const bad = cells.filter(function (c) { return !isIndex(c); });
    if (bad.length > 0) {
      problems.push(where + ' has invalid cell indices: ' + head(bad, 4));
      return;
    }
    const unique = new Set(cells);
    if (unique.size !== cells.length) {
      problems.push(where + ' lists a cell twice');
      return;
    }
    cells.forEach(function (c) { owners[c]++; });
    if (cage.distinct !== true) problems.push(where + ' is not distinct');
    if (!Number.isInteger(cage.sum)) problems.push(where + ' has a sum that is not an integer: ' + cage.sum);
    if (!isConnected(cells)) problems.push(where + ' is not orthogonally connected');
    if (solOk) {
      const digits = cells.map(function (c) { return sol[c]; });
      if (new Set(digits).size !== digits.length) problems.push(where + ' repeats a solution digit');
      else if (Number.isInteger(cage.sum) && cage.sum !== digits.reduce(function (a, b) { return a + b; }, 0)) {
        problems.push(where + ' has sum ' + cage.sum + ' but the solution digits give ' +
          digits.reduce(function (a, b) { return a + b; }, 0));
      }
    }
  });
  const missing = [];
  const several = [];
  owners.forEach(function (n, c) {
    if (n === 0) missing.push(c);
    else if (n > 1) several.push(c);
  });
  if (missing.length > 0) problems.push(missing.length + ' cells are in no cage: ' + head(missing, 6));
  if (several.length > 0) problems.push(several.length + ' cells are in several cages: ' + head(several, 6));
  return problems;
}

/** Which parts of two canonical model wires differ, and where: a message per difference, never empty for unequal wires. */
function differences(saved, rebuilt) {
  const out = [];
  const keys = Array.from(new Set(Object.keys(saved).concat(Object.keys(rebuilt)))).sort();
  keys.forEach(function (key) {
    const a = saved[key];
    const b = rebuilt[key];
    if (C.canonicalJson(a) === C.canonicalJson(b)) return;
    if ((key === 'units' || key === 'unitMeta' || key === 'cages') && Array.isArray(a) && Array.isArray(b)) {
      let first = -1;
      for (let i = 0; i < Math.max(a.length, b.length) && first < 0; i++) {
        if (C.canonicalJson(a[i]) !== C.canonicalJson(b[i])) first = i;
      }
      out.push(key + ': saved ' + a.length + ', rebuilt ' + b.length + ', first difference at ' + first +
        (a.length > b.length ? ' (extra saved entries)' : a.length < b.length ? ' (missing saved entries)' : ''));
    } else {
      out.push(key + ' differs from the rebuilt model');
    }
  });
  if (out.length === 0) out.push('the model wire differs from the rebuilt one');
  return out;
}

/**
 * `input`: { wireModel (the saved model wire), solution (the saved solution), rebuild(cages) -> model wire }.
 * Returns the problems (an empty list: the structure is valid). Never throws on malformed data.
 */
function structureProblems(input) {
  const m = input ? input.wireModel : null;
  if (m === null || typeof m !== 'object') return ['the model is missing'];
  const problems = [];
  if (m.variantId !== 'killer') problems.push('not a killer model: ' + String(m.variantId));
  if (m.cellCount !== CELLS || m.digits !== DIGITS) problems.push('not a 9x9 board');
  problems.push.apply(problems, cageProblems(m, input.solution));
  // A malformed layout is rejected as it is: it is never rebuilt, so nothing is repaired on the way.
  if (problems.length > 0) return problems;
  let rebuilt;
  try {
    rebuilt = input.rebuild(m.cages.map(function (cage) { return { cells: asList(cage.cells).slice(), sum: cage.sum }; }));
  } catch (err) {
    return ['the saved cages cannot be rebuilt: ' + String(err && err.message ? err.message : err)];
  }
  if (C.canonicalJson(m) !== C.canonicalJson(rebuilt)) {
    return differences(C.canonicalize(m), C.canonicalize(rebuilt));
  }
  return [];
}

/**
 * Tampered copies of a saved Killer wire (plain data), each of which the rule must reject. The real-engine check of the
 * audit command posts these to the verifier. `cases[i].wire` is a deep copy; the original is untouched.
 */
function tamperCases(wire) {
  const copy = function () { return JSON.parse(JSON.stringify(wire)); };
  const cases = [];
  const model = wire.model;
  const cageUnit = function (m) {
    return m.unitMeta.findIndex(function (u) { return u.kind === 'cage'; });
  };
  const add = function (id, fn) {
    const w = copy();
    fn(w.model, w);
    cases.push({ id: id, wire: w });
  };
  const first = cageUnit(model);
  if (first >= 0) {
    add('remove-a-cage-unit', function (m) {
      m.units.splice(first, 1);
      m.unitMeta.splice(first, 1);
    });
    add('extra-cage-unit', function (m) {
      m.units.push(m.units[first].slice());
      m.unitMeta.push(Object.assign({}, m.unitMeta[first]));
    });
    add('wrong-cage-unit-cells', function (m) {
      const unit = m.units[first].slice();
      const spare = [0, 1, 2, 3, 4, 5, 6, 7, 8].find(function (c) { return unit.indexOf(c) < 0; });
      unit[0] = spare;
      m.units[first] = unit;
    });
  }
  add('wrong-cage-sum', function (m) { m.cages[0].sum += 1; });
  add('cage-not-distinct', function (m) { m.cages[0].distinct = false; });
  add('cell-in-two-cages', function (m) {
    const other = asList(m.cages[1].cells)[0];
    m.cages[0].cells = asList(m.cages[0].cells).concat([other]);
  });
  add('cell-in-no-cage', function (m) {
    const big = m.cages.findIndex(function (c) { return asList(c.cells).length >= 2; });
    m.cages[big].cells = asList(m.cages[big].cells).slice(0, -1);
  });
  add('swapped-cage-order', function (m) {
    const t = m.cages[0];
    m.cages[0] = m.cages[1];
    m.cages[1] = t;
  });
  return cases;
}

module.exports = { CELLS, DIGITS, structureProblems, cageProblems, differences, tamperCases, isConnected, adjacent };
