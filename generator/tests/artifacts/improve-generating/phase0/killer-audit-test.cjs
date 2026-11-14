'use strict';

/*
 * Pure tests of the Killer-only structure rule of the IG-S02 re-audit (killer-audit.cjs) and of the audit's reconciliation:
 * no engine, no worker, no generation. The engine enters the rule only through `rebuild(cages)`; here a stand-in builds the
 * model wire the way `SG.killer.modelFromCages` is specified to (27 base units, one cage unit per cage of two or more cells,
 * in cage order, colours and layout), so these cases prove the rule's data checks and its complete-wire comparison.
 * The real engine's rebuild is exercised by the audit command itself: it must reject tampered copies of a saved puzzle
 * before its six acceptances count.
 *
 *   node killer-audit-test.cjs      (pure cases only; milliseconds)
 */
const fs = require('fs');
const path = require('path');
const C = require('./common.cjs');
const R = require('./records.cjs');
const KA = require('./killer-audit.cjs');

const cases = [];

function add(id, title, fn) {
  cases.push({ id: id, title: title, fn: fn });
}

function check(condition, message) {
  if (!condition) throw new Error('check failed: ' + message);
}

function same(actual, expected, message) {
  if (C.canonicalJson(actual) !== C.canonicalJson(expected)) {
    throw new Error(message + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
  }
}

// --- a stand-in Killer model -----------------------------------------------------------------------------------------

function baseUnits() {
  const units = [];
  const meta = [];
  for (let r = 0; r < 9; r++) {
    units.push(Array.from({ length: 9 }, function (_v, c) { return r * 9 + c; }));
    meta.push({ kind: 'row', gridIndex: 0, label: 'R' + (r + 1) });
  }
  for (let c = 0; c < 9; c++) {
    units.push(Array.from({ length: 9 }, function (_v, r) { return r * 9 + c; }));
    meta.push({ kind: 'col', gridIndex: 0, label: 'C' + (c + 1) });
  }
  for (let b = 0; b < 9; b++) {
    const top = Math.floor(b / 3) * 3;
    const left = (b % 3) * 3;
    const cells = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cells.push((top + r) * 9 + left + c);
    units.push(cells);
    meta.push({ kind: 'box', gridIndex: 0, label: 'B' + (b + 1) });
  }
  return { units: units, meta: meta };
}

function solution() {
  const sol = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) sol.push(((r * 3 + Math.floor(r / 3) + c) % 9) + 1);
  return sol;
}

function sumOf(cells, sol) {
  return cells.reduce(function (a, c) { return a + sol[c]; }, 0);
}

/** The model wire of cages [{ cells, sum }]: base units, then one cage unit per cage of two or more cells. */
function modelWire(cages) {
  const base = baseUnits();
  const units = base.units.map(function (u) { return u.slice(); });
  const unitMeta = base.meta.map(function (m) { return Object.assign({}, m); });
  cages.forEach(function (cage, k) {
    if (cage.cells.length >= 2) {
      units.push(cage.cells.slice());
      unitMeta.push({ kind: 'cage', gridIndex: 0, label: 'K' + (k + 1), partial: true });
    }
  });
  const all = [];
  cages.forEach(function (cage) { cage.cells.forEach(function (c) { all.push(c); }); });
  return {
    variantId: 'killer', cellCount: 81, digits: 9, units: units, unitMeta: unitMeta,
    cages: cages.map(function (cage) { return { cells: cage.cells.slice(), sum: cage.sum, distinct: true }; }),
    inequalities: [],
    layout: { rows: 9, cols: 9, cellRow: Array.from({ length: 81 }, function (_v, c) { return Math.floor(c / 9); }),
      cellCol: Array.from({ length: 81 }, function (_v, c) { return c % 9; }),
      cellRegion: Array.from({ length: 81 }, function (_v, c) { return Math.floor(c / 27) * 3 + Math.floor((c % 9) / 3); }),
      overlays: [{ kind: 'cageColor0', cells: all }], subGrids: [{ gridIndex: 0, originRow: 0, originCol: 0 }] },
    symbols: { mode: 'digits', labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9'] }
  };
}

function cagesOf(lists, sol) {
  return lists.map(function (cells) { return { cells: cells.slice(), sum: sumOf(cells, sol) }; });
}

// Rows cut into thirds (27 cages of three), or with a domino and a singleton in the first row.
function tripleLists() {
  const out = [];
  for (let r = 0; r < 9; r++) for (let k = 0; k < 3; k++) out.push([r * 9 + k * 3, r * 9 + k * 3 + 1, r * 9 + k * 3 + 2]);
  return out;
}

function mixedLists() {
  const lists = tripleLists();
  lists.splice(0, 3, [0, 1, 2], [3, 4, 5], [6, 7], [8]);
  return lists;
}

function problemsOf(model, sol) {
  return KA.structureProblems({ wireModel: model, solution: sol || solution(), rebuild: modelWire });
}

function wellFormed(lists) {
  const sol = solution();
  return modelWire(cagesOf(lists || tripleLists(), sol));
}

// --- cases -----------------------------------------------------------------------------------------------------------

add('well-formed-layouts-are-accepted', 'whole rows of triples and a layout with a domino and a singleton pass the rule',
  function () {
    same(problemsOf(wellFormed()), [], 'triples');
    const mixed = wellFormed(mixedLists());
    same(problemsOf(mixed), [], 'domino and singleton');
    same(mixed.units.length, 27 + 27, 'a singleton gets no cage unit: 27 base + 27 cage units for 28 cages');
    check(mixed.unitMeta.filter(function (u) { return u.kind === 'cage'; }).length === 27, 'one unit per cage of size >= 2');
  });

add('malformed-cages-are-rejected', 'an overlap, a gap, a bad index, an empty or disconnected cage, a wrong sum are rejected',
  function () {
    const sol = solution();
    const rejects = function (mutate, pattern, message) {
      const lists = tripleLists().map(function (l) { return l.slice(); });
      const cages = cagesOf(lists, sol);
      const wire = mutate(modelWire(cages), cages, lists);
      const found = problemsOf(wire.model || wire, wire.solution || sol);
      check(found.length > 0 && found.some(function (p) { return pattern.test(p); }), message + ': ' + JSON.stringify(found));
    };
    rejects(function (_w, cages) {
      cages[1].cells.push(0);
      return modelWire(cages);
    }, /several cages|twice|several/, 'a cell in two cages');
    rejects(function (_w, cages) {
      cages[0].cells.pop();
      return modelWire(cages);
    }, /in no cage/, 'a cell in no cage');
    rejects(function (_w, cages) {
      cages[0].cells[0] = 81;
      return modelWire(cages);
    }, /invalid cell indices/, 'an index out of range');
    rejects(function (_w, cages) {
      cages[0].cells[0] = -1;
      return modelWire(cages);
    }, /invalid cell indices/, 'a negative index');
    rejects(function (_w, cages) {
      cages[0].cells[0] = 1.5;
      return modelWire(cages);
    }, /invalid cell indices/, 'a fractional index');
    rejects(function (_w, cages) {
      cages.push({ cells: [], sum: 0 });
      return modelWire(cages);
    }, /has no cells/, 'an empty cage');
    rejects(function (_w, cages) {
      cages[0].cells[1] = cages[0].cells[0];
      return modelWire(cages);
    }, /lists a cell twice/, 'a cell twice in one cage');
    rejects(function (_w, cages) {
      cages[0] = { cells: [0, 2], sum: sol[0] + sol[2] };
      cages.push({ cells: [1], sum: sol[1] });
      return modelWire(cages);
    }, /not orthogonally connected/, 'a disconnected cage');
    rejects(function (_w, cages) {
      cages[0] = { cells: [0, 10], sum: sol[0] + sol[10] };
      cages.push({ cells: [1, 2], sum: sol[1] + sol[2] });
      cages.push({ cells: [9], sum: sol[9] });
      cages.splice(1, 0);
      return modelWire(cages);
    }, /./, 'a re-cut layout that no longer partitions the board');
    rejects(function (_w, cages) {
      cages[2].sum += 1;
      return modelWire(cages);
    }, /has sum \d+ but the solution digits give/, 'a wrong sum');
    rejects(function (_w, cages) {
      cages[2].sum = 10.5;
      return modelWire(cages);
    }, /not an integer/, 'a non-integer sum');
    rejects(function (w) {
      w.cages[3].distinct = false;
      return w;
    }, /is not distinct/, 'distinct false');
    rejects(function (w) {
      w.cages[3].distinct = undefined;
      return w;
    }, /is not distinct/, 'distinct missing');
    const repeated = sol.slice();
    repeated[1] = repeated[0];
    const found = problemsOf(wellFormed(), repeated);
    check(found.some(function (p) { return /repeats a solution digit/.test(p); }), 'a repeated solution digit: ' + found);
    check(problemsOf(wellFormed(), sol.slice(0, 80)).some(function (p) { return /not 81 digits/.test(p); }), 'a short solution');
    const notKiller = wellFormed();
    notKiller.variantId = 'classic9';
    check(problemsOf(notKiller).some(function (p) { return /not a killer model/.test(p); }), 'not a killer model');
  });

add('malformed-units-are-rejected', 'a missing, extra, wrong or singleton unit, and a reordered layout, fail the complete-wire comparison',
  function () {
    const sol = solution();
    const model = wellFormed(mixedLists());
    const rejects = function (mutate, message) {
      const m = JSON.parse(JSON.stringify(model));
      mutate(m);
      const found = problemsOf(m, sol);
      check(found.length > 0, message + ': accepted');
      return found;
    };
    const firstCage = model.unitMeta.findIndex(function (u) { return u.kind === 'cage'; });
    check(firstCage === 27, 'the cage units follow the 27 base units');
    let found = rejects(function (m) { m.units.splice(firstCage, 1); m.unitMeta.splice(firstCage, 1); }, 'a missing cage unit');
    check(/units: saved 53, rebuilt 54/.test(found.join()), 'the message names the unit counts: ' + found);
    found = rejects(function (m) { m.units.push(m.units[firstCage].slice()); m.unitMeta.push(Object.assign({}, m.unitMeta[firstCage])); },
      'an extra cage unit');
    check(/units: saved 55, rebuilt 54/.test(found.join()) && /extra saved/.test(found.join()), 'an extra unit: ' + found);
    // a unit for the singleton cage (cell 8): "none for singletons"
    rejects(function (m) { m.units.push([8]); m.unitMeta.push({ kind: 'cage', gridIndex: 0, label: 'K4', partial: true }); },
      'a unit for a singleton cage');
    rejects(function (m) { m.units[firstCage] = m.units[firstCage].slice(0, 2).concat([40]); }, 'a cage unit with other cells');
    rejects(function (m) { m.units[0] = m.units[0].slice().reverse(); }, 'a changed base unit');
    rejects(function (m) { m.units[5].pop(); }, 'a shortened base unit');
    rejects(function (m) { m.unitMeta[firstCage].partial = false; }, 'a cage unit that is not partial');
    rejects(function (m) { m.unitMeta[firstCage].kind = 'row'; }, 'a cage unit of the wrong kind');
    rejects(function (m) { m.layout.overlays = []; }, 'a missing colour overlay');
    rejects(function (m) { m.layout.rows = 8; }, 'a changed layout');
    rejects(function (m) { m.symbols.mode = 'letters'; }, 'a changed symbol set');
    rejects(function (m) { m.extra = 1; }, 'an extra property');
    rejects(function (m) { delete m.inequalities; }, 'a missing property');
    // nothing is repaired: the same cages in another order are another model
    rejects(function (m) {
      const t = m.cages[0];
      m.cages[0] = m.cages[1];
      m.cages[1] = t;
    }, 'cages in another order than their units');
    const reordered = wellFormed(mixedLists().slice().reverse());
    check(problemsOf(reordered, sol).length === 0, 'a consistently reordered layout is a valid, different model');
  });

add('tampered-copies-are-all-rejected', 'every tampered copy of the audit command is rejected and the original is accepted',
  function () {
    const sol = solution();
    const wire = { model: wellFormed(mixedLists()), solution: sol };
    same(problemsOf(wire.model, sol), [], 'the original');
    const tampered = KA.tamperCases(wire);
    same(tampered.map(function (t) { return t.id; }), ['remove-a-cage-unit', 'extra-cage-unit', 'wrong-cage-unit-cells',
      'wrong-cage-sum', 'cage-not-distinct', 'cell-in-two-cages', 'cell-in-no-cage', 'swapped-cage-order'], 'the cases');
    tampered.forEach(function (t) {
      check(C.canonicalJson(t.wire.model) !== C.canonicalJson(wire.model), t.id + ' differs from the original');
      check(problemsOf(t.wire.model, sol).length > 0, t.id + ' is rejected');
    });
    check(C.canonicalJson(wire.model) === C.canonicalJson(wellFormed(mixedLists())), 'the original is untouched');
  });

add('the-rule-never-throws', 'garbage input and a failing rebuild are problems, not exceptions', function () {
  const sol = solution();
  [null, undefined, 5, 'x', {}, { variantId: 'killer' }, { variantId: 'killer', cellCount: 81, digits: 9, cages: 'x' },
    { variantId: 'killer', cellCount: 81, digits: 9, cages: [null] },
    { variantId: 'killer', cellCount: 81, digits: 9, cages: [{ cells: 'x', sum: 1 }] }].forEach(function (m) {
    const found = KA.structureProblems({ wireModel: m, solution: sol, rebuild: modelWire });
    check(Array.isArray(found) && found.length > 0, 'garbage is rejected: ' + JSON.stringify(m));
  });
  check(KA.structureProblems(null).length > 0 && KA.structureProblems(undefined).length > 0, 'no input');
  const throwing = KA.structureProblems({ wireModel: wellFormed(), solution: sol, rebuild: function () { throw new Error('boom'); } });
  check(throwing.length === 1 && /cannot be rebuilt: boom/.test(throwing[0]), 'a failing rebuild: ' + throwing);
  const typed = wellFormed();
  typed.cages = typed.cages.map(function (c) { return { cells: Int32Array.from(c.cells), sum: c.sum, distinct: true }; });
  same(KA.structureProblems({ wireModel: typed, solution: Int32Array.from(sol), rebuild: modelWire }), [],
    'typed arrays (as the worker receives them) are read like plain ones');
});

add('a-malformed-layout-is-not-rebuilt', 'a layout that fails the data rules never reaches the rebuild (nothing is repaired)',
  function () {
    const sol = solution();
    let rebuilt = 0;
    const model = wellFormed();
    model.cages[0].sum += 1;
    const found = KA.structureProblems({ wireModel: model, solution: sol, rebuild: function (c) { rebuilt++; return modelWire(c); } });
    check(found.length > 0 && rebuilt === 0, 'rejected before any rebuild: ' + rebuilt);
  });

// --- a pre-flight against the real saved puzzles --------------------------------------------------------------------

// A test-only port of `assemble` and `colorCages` (generator/js/variants/killer.js), kept here so that the saved Killer
// puzzles can be checked against an independent reconstruction before the one wrapped audit command is spent.
function portNeighbours() {
  const out = [];
  for (let cell = 0; cell < 81; cell++) {
    const r = Math.floor(cell / 9);
    const c = cell % 9;
    const list = [];
    if (r > 0) list.push(cell - 9);
    if (c > 0) list.push(cell - 1);
    if (c < 8) list.push(cell + 1);
    if (r < 8) list.push(cell + 9);
    out.push(list);
  }
  return out;
}

function portTryColoring(neighbours, colors) {
  const count = neighbours.length;
  const color = new Array(count).fill(-1);
  const budget = { steps: 20000 };
  function saturation(k) {
    let seen = 0;
    for (let i = 0; i < neighbours[k].length; i++) {
      const c = color[neighbours[k][i]];
      if (c >= 0) seen |= 1 << c;
    }
    return seen;
  }
  function pickNext() {
    let best = -1;
    let bestSat = -1;
    let bestDeg = -1;
    for (let k = 0; k < count; k++) {
      if (color[k] !== -1) continue;
      let sat = 0;
      let mask = saturation(k);
      while (mask !== 0) {
        sat++;
        mask &= mask - 1;
      }
      if (sat > bestSat || (sat === bestSat && neighbours[k].length > bestDeg)) {
        best = k;
        bestSat = sat;
        bestDeg = neighbours[k].length;
      }
    }
    return best;
  }
  function search(placed) {
    if (placed === count) return true;
    if (--budget.steps < 0) return false;
    const k = pickNext();
    const blocked = saturation(k);
    for (let c = 0; c < colors; c++) {
      if ((blocked & (1 << c)) !== 0) continue;
      color[k] = c;
      if (search(placed + 1)) return true;
      color[k] = -1;
    }
    return false;
  }
  return search(0) ? color : null;
}

function portColorCages(cages) {
  const NEIGH = portNeighbours();
  const owner = new Array(81).fill(-1);
  cages.forEach(function (cells, k) { cells.forEach(function (c) { owner[c] = k; }); });
  const adjacent = cages.map(function () { return new Set(); });
  for (let cell = 0; cell < 81; cell++) {
    const a = owner[cell];
    if (a < 0) continue;
    NEIGH[cell].forEach(function (n) {
      const b = owner[n];
      if (b >= 0 && b !== a) {
        adjacent[a].add(b);
        adjacent[b].add(a);
      }
    });
  }
  const neighbours = adjacent.map(function (set) { return Array.from(set).sort(function (x, y) { return x - y; }); });
  for (let colors = 4; colors <= cages.length + 1; colors++) {
    const result = portTryColoring(neighbours, colors);
    if (result !== null) return result;
  }
  return new Array(cages.length).fill(0);
}

function portModelWire(cages, saved) {
  const base = baseUnits();
  const units = base.units.map(function (u) { return u.slice(); });
  const unitMeta = base.meta.map(function (m) { return Object.assign({}, m); });
  cages.forEach(function (cage, k) {
    if (cage.cells.length >= 2) {
      units.push(cage.cells.slice());
      unitMeta.push({ kind: 'cage', gridIndex: 0, label: 'K' + (k + 1), partial: true });
    }
  });
  const colors = portColorCages(cages.map(function (c) { return c.cells; }));
  const colorCount = colors.reduce(function (m, c) { return Math.max(m, c + 1); }, 0);
  const overlays = [];
  for (let c = 0; c < colorCount; c++) {
    const cells = [];
    cages.forEach(function (cage, k) { if (colors[k] === c) cage.cells.forEach(function (x) { cells.push(x); }); });
    overlays.push({ kind: 'cageColor' + c, cells: cells });
  }
  return {
    variantId: 'killer', cellCount: 81, digits: 9, units: units, unitMeta: unitMeta,
    cages: cages.map(function (cage) { return { cells: cage.cells.slice(), sum: cage.sum, distinct: true }; }),
    inequalities: [],
    layout: { rows: 9, cols: 9, cellRow: Array.from({ length: 81 }, function (_v, c) { return Math.floor(c / 9); }),
      cellCol: Array.from({ length: 81 }, function (_v, c) { return c % 9; }),
      cellRegion: Array.from({ length: 81 }, function (_v, c) { return Math.floor(Math.floor(c / 9) / 3) * 3 + Math.floor((c % 9) / 3); }),
      overlays: overlays, subGrids: [{ gridIndex: 0, originRow: 0, originCol: 0 }] },
    symbols: saved.symbols, fixedCells: saved.fixedCells
  };
}

add('saved-killer-puzzles-match-an-independent-reconstruction',
  'the six saved Killer puzzles pass the data rules and equal a reconstruction from their cages (skipped without evidence)',
  function () {
    const dir = path.join(C.DEFAULT_REPO_ROOT, 'docs', 'improve-generating', 'evidence', 'phase0', 'provisional-r1', 'IG-S02',
      'killer', 'puzzles');
    if (!fs.existsSync(dir)) return { skipped: 'no saved Killer puzzles here' };
    const files = fs.readdirSync(dir).filter(function (f) { return /\.json$/.test(f); }).sort();
    check(files.length === 6, 'six saved puzzles: ' + files.length);
    const out = [];
    files.forEach(function (name) {
      const saved = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
      const model = saved.wire.model;
      same(KA.cageProblems(model, saved.wire.solution), [], name + ': the data rules');
      same(KA.structureProblems({ wireModel: model, solution: saved.wire.solution, rebuild: function (cages) {
        return portModelWire(cages, model); } }), [], name + ': equal to the reconstruction (' + model.units.length + ' units)');
      const cageUnits = model.unitMeta.filter(function (u) { return u.kind === 'cage'; }).length;
      same(cageUnits, model.cages.filter(function (c) { return c.cells.length >= 2; }).length, name + ': one unit per cage of size >= 2');
      out.push({ name: name, cages: model.cages.length, units: model.units.length, colours: model.layout.overlays.length });
    });
    return { puzzles: out };
  });

// --- the audit sidecar's reconciliation ------------------------------------------------------------------------------

add('reconciliation-needs-every-link', 'a sidecar entry applies only with its record, puzzle file, hashes and passed verifier tests',
  function () {
    const AG = require('./aggregate.cjs');
    const dir = path.join(C.HARNESS_DIR, 'scratch-audit');
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(path.join(dir, 'puzzles'), { recursive: true });
    try {
      const bytes = Buffer.from('{"saved":"puzzle"}\r\n');
      fs.writeFileSync(path.join(dir, 'puzzles', 'p.json'), bytes);
      const puzzleSha = C.sha256(bytes);
      const rec = R.blankRecord({ key: 'k1', pairId: 'killer:nightmare:1', arm: 'reference', outcome: 'error',
        claimedExact: false, verifiedExact: false, puzzleFileSha256: puzzleSha,
        error: { code: 'validation-failed', message: 'audit rejected' } });
      rec.generation.coldWallMs = 123;
      const reconciled = { outcome: 'complete', verifiedExact: false, required: false, vacuous: false, shallow: true,
        validation: { wallMs: 1, cpuMs: 1, solutionValid: true, givensAgree: true, structureValid: true, unique: true,
          canonicalEqual: true }, validationDetail: { status: 'verified', requirednessAgree: true, errors: [] } };
      const audit = { status: 'verified', verdict: { structureValid: true } };
      const links = { recordDigest: C.digestOf(rec), puzzleFile: 'puzzles/p.json', puzzleFileSha256: puzzleSha,
        puzzleFileMatchesRecord: true, digestsMatchRecord: true, puzzleHashMatchesRecord: true, savedKeyMatchesRecord: true };
      const entry = { key: 'k1', links: links, audit: audit, reconciled: reconciled, falseExactFlag: false };
      entry.linkHash = C.digestOf({ key: 'k1', recordDigest: links.recordDigest, puzzleFileSha256: puzzleSha,
        auditDigest: C.digestOf(audit), reconciledDigest: C.digestOf(reconciled) });
      const sidecar = function (over) {
        return { file: 'a/audit.json', sha256: 'f'.repeat(64), doc: Object.assign({ schema: 'ig-s-audit/1',
          verifierTests: { passed: true }, entries: [JSON.parse(JSON.stringify(entry))] }, over || {}) };
      };
      const out = AG.reconcile([rec], [sidecar()], dir);
      const row = out.records[0];
      check(row.outcome === 'complete' && row.error === null && row.verifiedExact === false && row.generation.coldWallMs === 123,
        'the copy is complete with the original timings');
      check(row.reconciliation.originalOutcome === 'error' && row.reconciliation.originalError.code === 'validation-failed' &&
        row.reconciliation.linkHash === entry.linkHash, 'and keeps the original outcome and the link');
      check(rec.outcome === 'error' && rec.error !== null, 'the stored record is untouched');
      check(out.applied.length === 1 && out.applied[0].newOutcome === 'complete', 'one reconciliation is reported');
      const stops = function (fn, message) {
        try {
          fn();
        } catch (err) {
          check(err.code === 'audit-invalid', message + ': ' + err.code);
          return;
        }
        throw new Error(message + ': applied');
      };
      stops(function () { AG.reconcile([rec], [sidecar({ verifierTests: { passed: false } })], dir); }, 'tests failed');
      const other = JSON.parse(JSON.stringify(rec));
      other.generation.coldWallMs = 124;
      stops(function () { AG.reconcile([other], [sidecar()], dir); }, 'a record that changed');
      const badLink = sidecar();
      badLink.doc.entries[0].audit.status = 'failed';
      stops(function () { AG.reconcile([rec], [badLink], dir); }, 'an audit that changed');
      const badPuzzle = sidecar();
      badPuzzle.doc.entries[0].links.puzzleFile = 'puzzles/missing.json';
      stops(function () { AG.reconcile([rec], [badPuzzle], dir); }, 'a missing puzzle file');
      fs.writeFileSync(path.join(dir, 'puzzles', 'p.json'), Buffer.from('changed'));
      stops(function () { AG.reconcile([rec], [sidecar()], dir); }, 'a changed puzzle file');
      stops(function () { AG.reconcile([], [sidecar()], dir); }, 'no such record');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

add('audit-outcome-follows-the-recorded-derivation', 'a verified, a failed and an unknown verdict map to the recorded outcome fields',
  function () {
    const A = require('./ig02-killer-audit.cjs');
    const wire = { config: { difficulty: 'nightmare' } };
    const validation = { wallMs: 5, cpuMs: 4, cpuResolutionStatus: 'coarse', proof: null };
    const verdict = function (over) {
      return Object.assign({ solutionValid: true, givensAgree: true, structureValid: true, unique: true, canonicalEqual: true,
        requirednessAgree: true, errors: [], fresh: { solved: true, level: 'nightmare', score: 1, required: false,
          vacuous: false, shallow: true } }, over || {});
    };
    let o = A.outcomeOf(verdict(), wire, validation);
    same([o.status, o.outcome, o.verifiedExact, o.shallow], ['verified', 'complete', false, true], 'a shallow, verified puzzle');
    o = A.outcomeOf(verdict({ fresh: { solved: true, level: 'nightmare', required: true, vacuous: false, shallow: false } }),
      wire, validation);
    same([o.outcome, o.verifiedExact], ['complete', true], 'an exact puzzle');
    o = A.outcomeOf(verdict({ structureValid: false, errors: ['structure: killer: x'] }), wire, validation);
    same([o.status, o.outcome, o.verifiedExact], ['failed', 'error', false], 'a rejected puzzle');
    o = A.outcomeOf(verdict({ unique: null }), wire, validation);
    same([o.status, o.outcome, o.verifiedExact], ['unknown', 'validation-unknown', null], 'an unjudged puzzle');
    const restored = A.restore({ givens: [1, 0], solution: [1, 2], model: {} });
    check(restored.givens instanceof Int32Array && restored.solution instanceof Int32Array, 'typed arrays are restored');
  });

add('audit-command-dry-run', 'the whole audit command runs offline on the real saved puzzles with a stand-in verifier and its sidecar reconciles',
  async function () {
    const A = require('./ig02-killer-audit.cjs');
    const AG = require('./aggregate.cjs');
    const HOST = require('./host.cjs');
    const evidenceRoot = path.join(C.DEFAULT_REPO_ROOT, 'docs', 'improve-generating', 'evidence', 'phase0');
    const killerDir = path.join(evidenceRoot, 'provisional-r1', 'IG-S02', 'killer');
    if (!fs.existsSync(path.join(killerDir, 'records.json'))) return { skipped: 'no Killer evidence here' };
    const dir = path.join(C.HARNESS_DIR, 'scratch-audit-run');
    fs.rmSync(dir, { recursive: true, force: true });
    try {
      const host = new HOST.Host({ repoRoot: C.DEFAULT_REPO_ROOT, runtimeFingerprint: null, deadlineMs: 100000 });
      let calls = 0;
      // The stand-in verifier applies the real rule with the independent reconstruction as its rebuild.
      host.runValidation = async function (wire) {
        calls++;
        const problems = KA.structureProblems({ wireModel: wire.model, solution: wire.solution, rebuild: function (cages) {
          return portModelWire(cages, wire.model); } });
        return { status: 'ok', wallMs: 1, cpuMs: 1, cpuResolutionStatus: 'unresolved', proof: null, error: null,
          verdict: { solutionValid: true, givensAgree: true, structureValid: problems.length === 0, unique: true,
            canonicalEqual: true, requirednessAgree: true, errors: problems.length > 0 ? ['structure: killer: ' + problems.join('; ')] : [],
            fresh: { solved: true, level: 'nightmare', score: 1, required: false, vacuous: false, shallow: true } } };
      };
      const lock = function (task) { return { file: 'dry', content: 'dry', expectedOwner: 'IG ' + task, ownerMatches: true }; };
      const quiet = process.stdout.write.bind(process.stdout);
      process.stdout.write = function () { return true; };
      let code;
      try {
        code = await A.main(['--task=IG-S02', '--round=provisional-r1', '--shard=killer', '--source=a1', '--out=audit-a1'],
          { lock: lock, host: host, outDir: dir });
      } finally {
        process.stdout.write = quiet;
      }
      const audit = C.readJson(path.join(dir, 'audit.json'));
      same([code, audit.status], [0, 'complete'], 'the command completes');
      same([audit.summary.audited, audit.summary.verified, audit.summary.failed, audit.summary.linksOk], [6, 6, 0, 6],
        'six audited, six verified, six linked');
      check(audit.verifierTests.passed && audit.verifierTests.cases.length === 8 && audit.verifierTests.cases.every(function (c) {
        return c.rejected; }), 'every tampered copy is rejected');
      same(calls, 8 + 6, 'eight tampered copies and six saved puzzles reach the verifier');
      check(audit.entries.every(function (e) { return /^[0-9a-f]{64}$/.test(e.linkHash) && e.links.puzzleFileMatchesRecord; }),
        'every entry is hash-linked to its puzzle and record');
      check(fs.existsSync(path.join(dir, 'command.json')) && fs.existsSync(path.join(dir, 'audit.md')), 'command.json and audit.md');
      same(audit.harnessComparison.added.indexOf('killer-audit.cjs') >= 0, true, 'the new files show as added since the evidence');
      const command = C.readJson(path.join(dir, 'command.json'));
      check(command.task === 'IG-S02' && command.timing && Number.isFinite(command.timing.occupiedMs) && command.audit.sha256,
        'the command record can be charged from its timing');
      const records = C.readJson(path.join(killerDir, 'records.json')).records;
      const out = AG.reconcile(records, [{ file: 'dry/audit.json', sha256: command.audit.sha256, doc: audit }], evidenceRoot);
      same(out.applied.length, 6, 'six rows reconcile');
      check(out.records.every(function (r) { return r.outcome === 'complete' && r.reconciliation && r.generation.coldWallMs ===
        records.find(function (o) { return o.key === r.key; }).generation.coldWallMs; }),
      'complete rows with the original timings');
      return { entries: audit.entries.length, status: audit.status };
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

// --- run -------------------------------------------------------------------------------------------------------------

async function main() {
  let failed = 0;
  for (const c of cases) {
    const started = C.nowMs();
    try {
      await c.fn();
      process.stdout.write('ok   ' + c.id + ' (' + Math.round(C.nowMs() - started) + ' ms)\n');
    } catch (err) {
      failed++;
      process.stdout.write('FAIL ' + c.id + ' ' + (err && err.message ? err.message : String(err)) + '\n');
    }
  }
  process.stdout.write('killer audit cases: ' + (cases.length - failed) + ' passed, ' + failed + ' failed\n');
  return failed === 0 ? 0 : 1;
}

module.exports = { cases: cases };

if (require.main === module) {
  main().then(function (code) {
    process.exitCode = code;
    process.stdout.write('', function () { process.exit(code); });
  });
}
