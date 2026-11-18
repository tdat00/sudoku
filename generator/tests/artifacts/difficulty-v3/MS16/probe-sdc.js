'use strict';
// Scratch (MS16, phase P0), evidence for the questions the brief leaves open: which unit pairs are "line/box", which subsets of
// the intersection are I, the work unit and the search order. Read-only: no generation, no corpus, nothing written but the JSON
// named on the command line. The oracle is written from the R19 text with model.units, model.unitMeta and state only (no engine
// table, no enumerator record); the record-based scan then reads SG.alsPatterns.enumerate's records (lifted DIAGNOSTIC limits:
// guard 1e9, records 1e7, cells 4), and the two must agree pattern by pattern.
//   node probe-sdc.js [out.json]
const fs = require('fs');
const path = require('path');
const SG = require('./load.js');
const H = SG.techHelper;
const M = SG.fixtures.models;
const popcount = SG.bits.popcount;
const num = (a, b) => a - b;

function combos(list, k) {
  const out = [];
  const pick = [];
  (function rec(from) {
    if (pick.length === k) { out.push(pick.slice()); return; }
    for (let i = from; i < list.length; i++) { pick.push(list[i]); rec(i + 1); pick.pop(); }
  })(0);
  return out;
}
const maskOfDigits = (ds) => ds.reduce((m, d) => m | (1 << (d - 1)), 0);
const digitsOfMask = (m) => { const o = []; for (let d = 1; m >> (d - 1) !== 0; d++) if ((m >> (d - 1)) & 1) o.push(d); return o; };

// pairs of (line, box-like) units with at least two open cells in common, in unit index order (line first, then box)
function geometry(model, state, rule) {
  const sets = model.units.map((cells) => new Set(cells));
  const lines = [];
  const boxes = [];
  model.units.forEach((cells, u) => {
    const kind = model.unitMeta[u].kind;
    if (kind === 'row' || kind === 'col') lines.push(u);
    else if (rule === 'R2' || kind === 'box' || kind === 'region') boxes.push(u);
  });
  const pairs = [];
  lines.forEach((U) => boxes.forEach((V) => {
    const S = model.units[U].filter((c) => sets[V].has(c) && state.value[c] === 0).sort(num);
    if (S.length >= 2) pairs.push({ U, V, S });
  }));
  return { sets, lines, boxes, pairs };
}

function eliminationsOf(model, state, sets, U, V, I, A, B, C) {
  const out = new Map();
  const proving = new Set(I.concat(A.cells, B.cells));
  const Z = C & ~A.mask & ~B.mask;
  const mark = (c, d) => { if (state.value[c] === 0 && ((state.candidates[c] >> (d - 1)) & 1)) out.set(c * 64 + d, [c, d]); };
  model.units[U].forEach((c) => {
    if (proving.has(c)) return;
    digitsOfMask(A.mask | Z).forEach((d) => mark(c, d));
  });
  model.units[V].forEach((c) => {
    if (proving.has(c)) return;
    digitsOfMask(B.mask | Z).forEach((d) => mark(c, d));
  });
  return Array.from(out.values()).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

// brute-force ALS of the open cells of a cell list: every subset of 1..maxK cells whose candidate union is size + 1 digits
function bruteAls(state, cells, maxK) {
  const open = cells.filter((c) => state.value[c] === 0).sort(num);
  const out = [];
  for (let k = 1; k <= Math.min(maxK, open.length); k++) {
    combos(open, k).forEach((sub) => {
      let mask = 0;
      sub.forEach((c) => { mask |= state.candidates[c]; });
      if (popcount(mask) === k + 1) out.push({ cells: sub, mask, size: k });
    });
  }
  return out;
}

const key = (U, V, I, A, B) => [U, V, I.join('.'), A.cells.join('.'), B.cells.join('.')].join('|');

function oracle(model, state, geo, solution) {
  const maxK = Math.min(4, model.digits - 1);
  const found = new Map();
  const valid = new Map();
  let unsound = 0;
  geo.pairs.forEach((p) => {
    const inV = geo.sets[p.V];
    const inU = geo.sets[p.U];
    const alsA = bruteAls(state, model.units[p.U].filter((c) => !inV.has(c)), maxK);
    const alsB = bruteAls(state, model.units[p.V].filter((c) => !inU.has(c)), maxK);
    [2, 3].forEach((size) => combos(p.S, size).forEach((I) => {
      let C = 0;
      I.forEach((c) => { C |= state.candidates[c]; });
      alsA.filter((a) => (a.mask & ~C) === 0).forEach((A) => alsB.filter((b) => (b.mask & ~C) === 0).forEach((B) => {
        if ((A.mask & B.mask) !== 0 || popcount(C) !== size + A.size + B.size) return;
        const k = key(p.U, p.V, I, A, B);
        const elims = eliminationsOf(model, state, geo.sets, p.U, p.V, I, A, B, C);
        const Z = C & ~A.mask & ~B.mask;
        const info = { U: p.U, V: p.V, I, A, B, C, Z, elims };
        valid.set(k, info);
        if (elims.length > 0) {
          found.set(k, info);
          elims.forEach((e) => { if (solution && solution[e[0]] === e[1]) unsound++; });
        }
      }));
    }));
  });
  return { found, valid, unsound };
}

// the design under test: records from the enumerator, membership by the unit cell lists, the two candidate work schemes
function recordScan(model, state, geo, records, solution, rule) {
  const recs = records.map((r) => ({ cells: r.cells, mask: maskOfDigits(r.digits), size: r.cells.length }));
  const n = recs.length;
  let prep = 0;
  geo.boxes.forEach((V) => { prep += model.units[V].length; });
  const run = { prep, pairs: 0, opened: 0, perI: 0, perPair: 0, classify: n, home: 0, filter: 0, ab: 0, scan: 0 };
  const found = new Map();
  const valid = new Map();
  let first = null;
  let unsound = 0;
  geo.pairs.forEach((p) => {
    const inV = geo.sets[p.V];
    const inU = geo.sets[p.U];
    const rawA = recs.filter((r) => r.cells.every((c) => inU.has(c) && !inV.has(c)));
    const rawB = recs.filter((r) => r.cells.every((c) => inV.has(c) && !inU.has(c)));
    // P3: the records whose cells all lie in the line (any cell in the box too), and in the box
    run.home += recs.filter((r) => r.cells.every((c) => inU.has(c))).length + recs.filter((r) => r.cells.every((c) => inV.has(c))).length;
    run.pairs++;
    run.perPair += n;
    [2, 3].forEach((size) => combos(p.S, size).forEach((I) => {
      run.opened++;
      run.perI += n;
      run.filter += rawA.length + rawB.length;
      let C = 0;
      I.forEach((c) => { C |= state.candidates[c]; });
      const candA = rawA.filter((a) => (a.mask & ~C) === 0);
      const candB = rawB.filter((b) => (b.mask & ~C) === 0);
      candA.forEach((A) => candB.forEach((B) => {
        run.ab++;
        if ((A.mask & B.mask) !== 0 || popcount(C) !== size + A.size + B.size) return;
        run.scan += new Set([...model.units[p.U], ...model.units[p.V]]).size;
        const k = key(p.U, p.V, I, A, B);
        const elims = eliminationsOf(model, state, geo.sets, p.U, p.V, I, A, B, C);
        const info = { U: p.U, V: p.V, I, A, B, C, Z: C & ~A.mask & ~B.mask, elims, S: p.S.length };
        valid.set(k, info);
        if (elims.length > 0) {
          found.set(k, info);
          elims.forEach((e) => { if (solution && solution[e[0]] === e[1]) unsound++; });
          if (first === null) first = { info, run: Object.assign({}, run) };
        }
      }));
    }));
  });
  const total = (r) => ({
    p1: r.prep + r.pairs + r.opened + r.perI + r.ab + r.scan,
    p2: r.prep + r.pairs + r.opened + r.perPair + r.filter + r.ab + r.scan,
    p3: r.prep + r.classify + r.pairs + r.home + r.opened + r.filter + r.ab + r.scan
  });

  return { n, run, found, valid, unsound, first, total: total(run), firstTotal: first === null ? null : total(first.run) };
}

function labelOf(model, u) { return model.unitMeta[u].label; }
function describe(model, info) {
  return {
    line: labelOf(model, info.U), box: labelOf(model, info.V), I: info.I.map((c) => SG.model.cellLabel(model, c)),
    A: info.A.cells.map((c) => SG.model.cellLabel(model, c)), aDigits: digitsOfMask(info.A.mask),
    B: info.B.cells.map((c) => SG.model.cellLabel(model, c)), bDigits: digitsOfMask(info.B.mask),
    Z: digitsOfMask(info.Z), eliminations: info.elims.map((e) => SG.model.cellLabel(model, e[0]) + '-' + e[1])
  };
}

function analyse(model, state, solution, tag) {
  const ctx = SG.techniques.createContext(model, {});
  const work = SG.alsPatterns.createWork(1e9);
  const enumerated = SG.alsPatterns.enumerate(model, state, ctx, work, { records: 1e7 });
  const row = { tag, open: 0, digits: model.digits, cells: model.cellCount, records: enumerated.records.length,
    enumCapHit: enumerated.capHit, enumWork: work.used };
  for (let c = 0; c < model.cellCount; c++) if (state.value[c] === 0) row.open++;
  ['R1', 'R2'].forEach((rule) => {
    const geo = geometry(model, state, rule);
    const o = oracle(model, state, geo, solution);
    const s = recordScan(model, state, geo, enumerated.records, solution, rule);
    const oracleKeys = Array.from(o.found.keys()).sort().join(';');
    const scanKeys = Array.from(s.found.keys()).sort().join(';');
    const validOracle = Array.from(o.valid.keys()).sort().join(';');
    const validScan = Array.from(s.valid.keys()).sort().join(';');
    let i2 = 0;
    let i3 = 0;
    geo.pairs.forEach((p) => { i2 += combos(p.S, 2).length; i3 += combos(p.S, 3).length; });
    const byForm = { zEmpty: 0, zNonEmpty: 0, i2: 0, i3: 0, wholeIntersection: 0, properSubset: 0, strictCapacityValid: 0 };
    s.found.forEach((x) => {
      byForm[x.Z === 0 ? 'zEmpty' : 'zNonEmpty']++;
      byForm[x.I.length === 2 ? 'i2' : 'i3']++;
      byForm[x.I.length === x.S ? 'wholeIntersection' : 'properSubset']++;
    });
    s.valid.forEach((x) => { if (x.I.length === x.S) byForm.strictCapacityValid++; });
    const plus = (t) => ({ p1: t.p1 + row.enumWork, p2: t.p2 + row.enumWork, p3: t.p3 + row.enumWork });
    row[rule] = { pairs: geo.pairs.length, i2, i3, capacityValid: s.valid.size, withElimination: s.found.size, byForm,
      oracleValid: o.valid.size, oracleWithElimination: o.found.size, agreeFound: oracleKeys === scanKeys,
      agreeValid: validOracle === validScan, unsound: o.unsound + s.unsound, counters: s.run, totals: s.total,
      firstTotals: s.firstTotal, whole: plus(s.total), firstWhole: s.firstTotal === null ? null : plus(s.firstTotal),
      first: s.first === null ? null : describe(model, s.first.info) };
  });
  return row;
}

function seeded(model, solve, seed, count, keepRange, placedMax) {
  const rng = SG.testkit.rng.create(seed);
  const out = [];
  for (let i = 0; i < count; i++) {
    const solution = solve(model, rng.fork('grid' + i));
    const pick = rng.fork('pick' + i);
    const placedShare = 0.03 + placedMax * pick.next();
    const keep = keepRange[0] + (keepRange[1] - keepRange[0]) * pick.next();
    const state = SG.model.initState(model);
    for (let c = 0; c < model.cellCount; c++) if (pick.next() < placedShare) SG.constraints.assign(model, state, c, solution[c]);
    for (let c = 0; c < model.cellCount; c++) {
      if (state.value[c] !== 0) continue;
      for (let v = 1; v <= model.digits; v++) {
        if (v !== solution[c] && (state.candidates[c] & (1 << (v - 1))) !== 0 && pick.next() >= keep) SG.constraints.eliminate(model, state, c, v);
      }
    }
    out.push({ state, solution });
  }
  return out;
}

const now = () => Number(process.hrtime.bigint()) / 1e6;
const started = now();
const rowsA = [];
const rowsB = [];

// population A: real classic 9 x 9 fixture puzzles at the position where the registry reaches order 196
{
  const model = H.model('classic9');
  const F = SG.fixtures.techniques;
  const ids = SG.techniques.list().filter((t) => t.variantScope === null && t.order < 196).map((t) => t.id);
  const puzzles = new Map();
  const add = (entry, tag) => {
    if (entry && typeof entry.puzzle === 'string' && entry.puzzle.length === 81 && !puzzles.has(entry.puzzle)) puzzles.set(entry.puzzle, tag);
  };
  Object.keys(F.byId).forEach((id) => {
    const e = F.byId[id];
    (e.positive || []).forEach((x) => add(x, id + '+'));
    (e.negative || []).forEach((x) => add(x, id + '-'));
  });
  Object.keys(F.supplements).forEach((id) => F.supplements[id].forEach((x) => add(x, id + 's')));
  let skipped = 0;
  puzzles.forEach((tag, puzzle) => {
    const givens = H.parsePuzzle(model, puzzle);
    if (SG.dfs.countSolutions(model, givens, 2) !== 1) { skipped++; return; }
    const solution = SG.dfs.solve(model, givens);
    const state = H.stateAfter(model, puzzle, ids);
    let open = 0;
    for (let c = 0; c < model.cellCount; c++) if (state.value[c] === 0) open++;
    if (open === 0) return;
    const t0 = now();
    const r = analyse(model, state, solution, tag + ' ' + puzzle);
    r.ms = Math.round(now() - t0);
    rowsA.push(r);
  });
  rowsA.skippedNotUnique = skipped;
  rowsA.unique = puzzles.size - skipped;
  rowsA.total = puzzles.size;
}

// population B: seeded positions (kept apart)
{
  const rs = (model, rng) => SG.testkit.randomSolution(model, rng);
  const add = (name, model, seed, count, ranges) => ranges.forEach((range) => {
    seeded(model, rs, seed, count, range, 0.25).forEach((item, i) => {
      const t0 = now();
      const r = analyse(model, item.state, item.solution, name + ' keep ' + range.join('-') + ' #' + i);
      r.ms = Math.round(now() - t0);
      r.population = name;
      rowsB.push(r);
    });
  });
  add('classic9', H.model('classic9'), 4001, 4, [[0.05, 0.4], [0.3, 0.6], [0.5, 0.8]]);
  add('12 digits', M.boxGrid('s12', 3, 4), 4004, 2, [[0.05, 0.4], [0.3, 0.6]]);
  add('16 digits', M.boxGrid('s16', 4, 4), 4005, 2, [[0.05, 0.4], [0.3, 0.6]]);
  add('samurai', M.samurai(), 4006, 2, [[0.05, 0.4], [0.3, 0.6]]);
  ['diagonalX', 'hyper', 'jigsaw9'].forEach((id) => { if (SG.testkit.hasVariant(id)) add(id, H.model(id), 4007, 3, [[0.05, 0.4], [0.3, 0.6]]); });
}

function q(a, p) { if (a.length === 0) return null; const s = a.slice().sort(num); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; }
function stat(a) { return a.length === 0 ? null : { min: q(a, 0), median: q(a, 0.5), p90: q(a, 0.9), max: q(a, 1) }; }
function summary(rows, label) {
  const out = { label, positions: rows.length };
  ['R1', 'R2'].forEach((rule) => {
    const g = (f) => rows.map((r) => f(r[rule]));
    out[rule] = {
      pairs: stat(g((x) => x.pairs)), i2: stat(g((x) => x.i2)), i3: stat(g((x) => x.i3)),
      capacityValid: stat(g((x) => x.capacityValid)), positionsWithValid: rows.filter((r) => r[rule].capacityValid > 0).length,
      positionsWithElimination: rows.filter((r) => r[rule].withElimination > 0).length,
      patternsWithElimination: g((x) => x.withElimination).reduce((a, b) => a + b, 0),
      zEmpty: g((x) => x.byForm.zEmpty).reduce((a, b) => a + b, 0), zNonEmpty: g((x) => x.byForm.zNonEmpty).reduce((a, b) => a + b, 0),
      positionsWithZEmpty: rows.filter((r) => r[rule].byForm.zEmpty > 0).length,
      positionsWithZNonEmpty: rows.filter((r) => r[rule].byForm.zNonEmpty > 0).length,
      agreeFound: rows.filter((r) => r[rule].agreeFound).length, agreeValid: rows.filter((r) => r[rule].agreeValid).length,
      unsound: g((x) => x.unsound).reduce((a, b) => a + b, 0),
      scheme1Whole: stat(g((x) => x.whole.p1)), scheme2Whole: stat(g((x) => x.whole.p2)), scheme3Whole: stat(g((x) => x.whole.p3)),
      scheme1Above: rows.filter((r) => r[rule].whole.p1 > 50000).length, scheme2Above: rows.filter((r) => r[rule].whole.p2 > 50000).length,
      scheme3Above: rows.filter((r) => r[rule].whole.p3 > 50000).length,
      scheme1First: stat(rows.filter((r) => r[rule].firstWhole).map((r) => r[rule].firstWhole.p1)),
      scheme2First: stat(rows.filter((r) => r[rule].firstWhole).map((r) => r[rule].firstWhole.p2)),
      scheme3First: stat(rows.filter((r) => r[rule].firstWhole).map((r) => r[rule].firstWhole.p3)),
      wholeIntersection: g((x) => x.byForm.wholeIntersection).reduce((a, b) => a + b, 0),
      properSubset: g((x) => x.byForm.properSubset).reduce((a, b) => a + b, 0),
      capacityValidAll: g((x) => x.capacityValid).reduce((a, b) => a + b, 0),
      capacityValidStrict: g((x) => x.byForm.strictCapacityValid).reduce((a, b) => a + b, 0),
      perI: stat(g((x) => x.counters.perI)), perPair: stat(g((x) => x.counters.perPair)), home: stat(g((x) => x.counters.home)),
      filter: stat(g((x) => x.counters.filter)), ab: stat(g((x) => x.counters.ab)),
      scan: stat(g((x) => x.counters.scan)), prep: stat(g((x) => x.counters.prep))
    };
  });
  out.records = stat(rows.map((r) => r.records));
  out.enumWork = stat(rows.map((r) => r.enumWork));
  out.enumCapped = rows.filter((r) => r.enumCapHit !== null).length;
  out.ms = stat(rows.map((r) => r.ms));
  return out;
}

function line(s, rule) {
  const x = s[rule];
  const m = (st) => st === null ? '-' : st.median + '/' + st.p90 + '/' + st.max;
  return s.label + ' [' + rule + '] n=' + s.positions + ' records(med/p90/max)=' + m(s.records) + ' enum=' + m(s.enumWork) +
    ' pairs=' + m(x.pairs) + ' | whole P1=' + m(x.scheme1Whole) + ' >50k ' + x.scheme1Above + ' | P2=' + m(x.scheme2Whole) + ' >50k ' +
    x.scheme2Above + ' | P3=' + m(x.scheme3Whole) + ' >50k ' + x.scheme3Above + ' | first P3=' + m(x.scheme3First) +
    ' | patterns ' + x.patternsWithElimination + ' (whole-S ' + x.wholeIntersection + ', proper subset ' + x.properSubset +
    '; capacity-valid ' + x.capacityValidAll + ', strict ' + x.capacityValidStrict + ') Z empty ' + x.zEmpty + ' nonempty ' + x.zNonEmpty +
    ' agree ' + x.agreeFound + '/' + x.agreeValid + ' unsound ' + x.unsound;
}

const boards = {};
rowsB.forEach((r) => { (boards[r.population] = boards[r.population] || []).push(r); });
const result = {
  node: process.version, seconds: Math.round((now() - started) / 100) / 10,
  note: 'diagnostic lifted limits (guard 1e9, records 1e7, cells 4); R1 = rows/cols against box and region kinds, R2 = rows/cols against every other unit; P1 charges one unit per record tested per I, P2 one unit per record classified per (line, box) pair, P3 one unit per record classified once plus one per home candidate at each pair; all three also charge prep (cells of the box-like units), one per pair, one per I opened, the subset filter, the A-by-B pairs and the target scan',
  populationA: { realClassic9Fixtures: { total: rowsA.total, unique: rowsA.unique, positionsAtOrder196: rowsA.length }, summary: summary(rowsA, 'A real classic 9x9 at order 196'), rows: rowsA },
  populationB: { summary: summary(rowsB, 'B seeded (all)'), perBoard: Object.keys(boards).map((k) => summary(boards[k], 'B ' + k)), rows: rowsB }
};
if (process.argv[2]) fs.writeFileSync(path.resolve(process.argv[2]), JSON.stringify(result, null, 1).replace(/\n/g, '\r\n') + '\r\n');
console.log('population A: ' + rowsA.length + ' positions (of ' + rowsA.unique + ' unique puzzles, ' + rowsA.total + ' fixture strings)');
['R1', 'R2'].forEach((rule) => console.log(line(result.populationA.summary, rule)));
console.log('population B: ' + rowsB.length + ' positions');
['R1', 'R2'].forEach((rule) => console.log(line(result.populationB.summary, rule)));
result.populationB.perBoard.forEach((s) => console.log(line(s, 'R1')));
console.log('first eliminations of A (up to 8):');
rowsA.filter((r) => r.R1.first).slice(0, 8).forEach((r) => console.log(r.tag.slice(0, 40) + ' ' + JSON.stringify(r.R1.first)));
console.log('seconds ' + result.seconds);
