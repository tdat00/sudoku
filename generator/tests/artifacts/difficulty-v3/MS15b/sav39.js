'use strict';
// Scratch (MS15b, S-AV39): whole-call measurements of the registered alsXz finder (production limits 4 / 4,096 / 50,000, no opts).
// Three populations, kept apart: `constructed` (blank boards and floods), `seeded` (seeded test positions) and `real` (the positions
// at which the registry reaches alsXz along the canonical solves of real puzzles already in the repository: no scan, no generation).
//   node sav39.js constructed|seeded|real [outfile.json]
// Every call is also repeated with lifted limits (workLimit 1e9, records 1e7: a DIAGNOSTIC measurement, not a production limit) and with
// the candidate common adjustment (workLimit 100,000 and 200,000), to tell what a cap lost and what an adjustment would change.
const fs = require('fs');
const path = require('path');
const SG = require('./load.js');
const H = SG.techHelper;
const M = SG.fixtures.models;
const J = SG.fixtures.jigsawModels;
const part = process.argv[2];
const outFile = process.argv[3];
const A = SG.alsPatterns;
const now = () => Number(process.hrtime.bigint()) / 1e6;

function q(a, p) { if (a.length === 0) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; }
function stats(a) { return a.length === 0 ? null : { min: q(a, 0), median: q(a, 0.5), p95: q(a, 0.95), max: q(a, 1) }; }
const r3 = (x) => Math.round(x * 1000) / 1000;

const LIFTED = { workLimit: 2e7, limits: { records: 1e5 } };
const STARTED = now();
let liftedSkipped = 0;

/** One whole call of the production finder, plus the diagnostic repeats. */
function measure(model, state) {
  const seen = [];
  const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => seen.push(r) });
  const t0 = now();
  const f = A.findXz(model, state, ctx);
  const ms = now() - t0;
  const rec = seen[0];
  const out = { work: rec.work, capHit: rec.capHit, retained: rec.retained, found: f !== null, ms: r3(ms), elims: f ? f.eliminations.length : 0 };
  const alt = {};
  [['lifted', LIFTED], ['w100k', { workLimit: 100000 }], ['w200k', { workLimit: 200000 }]].forEach(([name, opts]) => {
    if (name === 'lifted' && now() - STARTED > 380000) {
      liftedSkipped++;
      alt[name] = { work: rec.work, capHit: rec.capHit, found: f !== null, ms: out.ms, same: true, skipped: true };
      return;
    }
    const s2 = [];
    const c2 = SG.techniques.createContext(model, { onPatternWork: (r) => s2.push(r) });
    const a0 = now();
    const g = A.findXz(model, state, c2, opts);
    alt[name] = { work: s2[0].work, capHit: s2[0].capHit, found: g !== null, ms: r3(now() - a0),
      same: JSON.stringify(g) === JSON.stringify(f) };
  });
  out.alt = alt;
  return out;
}

function summarize(rows) {
  const caps = { none: 0, records: 0, work: 0 };
  rows.forEach((r) => { caps[r.capHit === null ? 'none' : r.capHit]++; });
  const lostLifted = rows.filter((r) => r.capHit !== null && !r.found && r.alt.lifted.found).length;
  const changed = (name) => rows.filter((r) => !r.alt[name].same).length;
  const cappedAt = (name) => rows.filter((r) => r.alt[name].capHit !== null).length;
  return { calls: rows.length, caps, found: rows.filter((r) => r.found).length, work: stats(rows.map((r) => r.work)),
    retained: stats(rows.map((r) => r.retained)), ms: stats(rows.map((r) => r.ms)),
    cappedWithNoFindingButLiftedFinds: lostLifted,
    lifted: { cappedStill: cappedAt('lifted'), findingDiffers: changed('lifted'), ms: stats(rows.map((r) => r.alt.lifted.ms)), work: stats(rows.map((r) => r.alt.lifted.work)) },
    w100k: { capped: cappedAt('w100k'), findingDiffers: changed('w100k'), ms: stats(rows.map((r) => r.alt.w100k.ms)) },
    w200k: { capped: cappedAt('w200k'), findingDiffers: changed('w200k'), ms: stats(rows.map((r) => r.alt.w200k.ms)) } };
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
    out.push(state);
  }
  return out;
}

const result = { part, node: process.version, source: 'tree, production limits ' + JSON.stringify(A.LIMITS), liftedDiagnostic: LIFTED };

if (part === 'constructed') {
  const rows = [];
  ['classic4', 'classic6', 'classic9', 'diagonalX', 'hyper', 'jigsaw9', 'killer', 'greaterThan', 'mega12', 'mega16', 'samurai', 'sohei', 'butterfly', 'flower',
    'wordoku'].forEach((id) => {
    if (!SG.testkit.hasVariant(id)) { rows.push({ model: id, skipped: true }); return; }
    const model = H.model(id);
    const blank = SG.model.initState(model);
    const m = measure(model, blank);
    rows.push({ model: id + ' blank', cells: model.cellCount, digits: model.digits, units: model.units.length, ...m });
  });
  [['9 x 9', M.boxGrid('flood9', 3, 3)], ['12 x 12', M.boxGrid('flood12', 3, 4)], ['16 x 16', M.boxGrid('flood16', 4, 4)]].forEach(([name, model]) => {
    const state = SG.model.initState(model);
    for (let c = 0; c < model.cellCount; c++) state.candidates[c] = 3;
    rows.push({ model: name + ' flood {1,2}', cells: model.cellCount, digits: model.digits, ...measure(model, state) });
  });
  result.rows = rows;
}

if (part === 'seeded') {
  const groups = [];
  const m9 = H.model('classic9');
  const add = (name, model, solve, seed, count, ranges, placed) => ranges.forEach((range) => {
    const states = seeded(model, solve, seed, count, range, placed);
    const rows = states.map((s) => measure(model, s));
    groups.push({ population: name + ' keep ' + range.join('-') + ' placed<=' + (0.03 + placed).toFixed(2) + ' seed ' + seed, positions: count, ...summarize(rows) });
  });
  const rs = (model, rng) => SG.testkit.randomSolution(model, rng);
  add('classic9', m9, rs, 4001, 24, [[0.05, 0.4], [0.3, 0.6], [0.5, 0.8]], 0.25);
  add('classic6', H.model('classic6'), rs, 4002, 12, [[0.05, 0.4], [0.3, 0.6], [0.5, 0.8]], 0.25);
  add('classic4', H.model('classic4'), rs, 4003, 12, [[0.05, 0.4], [0.3, 0.6]], 0.25);
  add('12 digits', M.boxGrid('s12', 3, 4), rs, 4004, 8, [[0.05, 0.4], [0.3, 0.6], [0.5, 0.8]], 0.25);
  add('16 digits', M.boxGrid('s16', 4, 4), rs, 4005, 8, [[0.05, 0.4], [0.3, 0.6], [0.5, 0.8]], 0.25);
  add('samurai', M.samurai(), rs, 4006, 4, [[0.05, 0.4], [0.3, 0.6], [0.7, 0.95]], 0.25);
  ['diagonalX', 'hyper'].forEach((id) => add(id, H.model(id), rs, 4007, 8, [[0.05, 0.4], [0.3, 0.6]], 0.25));
  const sweep = H.randomStatesWithKnownSolution(m9, SG.testkit.rng.create(20260101), 120);
  groups.push({ population: 'classic9 techniques-sweep states (120: initial, propagated, pruned; seed 20260101)', positions: 120, ...summarize(sweep.map((it) => measure(m9, it.state))) });
  result.groups = groups;
}

if (part === 'real') {
  const vm = require('vm');
  const root = path.join(__dirname, '..', '..', '..', '..', '..');
  vm.runInThisContext(fs.readFileSync(path.join(root, 'player', 'js', 'ui', 'help-examples.js'), 'utf8'));
  const puzzles = [];
  const seenText = {};
  const addPuzzle = (source, variant, text) => {
    const key = variant + ':' + text;
    if (seenText[key]) return;
    seenText[key] = true;
    puzzles.push({ source, variant, text });
  };
  Object.keys(SG.helpExamples).forEach((id) => {
    const ex = SG.helpExamples[id];
    if (['classic9', 'diagonalX', 'hyper'].indexOf(ex.variant) !== -1) addPuzzle('help example ' + id, ex.variant, ex.givens);
  });
  SG.fixtures.rated.entries.forEach((e, i) => { if (typeof e.puzzle === 'string' && e.puzzle.length === 81) addPuzzle('rated fixture ' + (e.name || i), 'classic9', e.puzzle); });
  SG.fixtures.classic.unique.forEach((e, i) => { if (typeof e.puzzle === 'string' && e.puzzle.length === 81) addPuzzle('classic fixture ' + (e.name || i), 'classic9', e.puzzle); });
  const rows = [];
  const perPuzzle = [];
  const started = now();
  let stopped = null;
  // a recording wrapper of the registered finder (this process only): the same finder, the position cloned first
  const def = SG.techniques.get('alsXz');
  SG.techniques.unregister('alsXz');
  let captured = [];
  SG.techniques.register({ id: def.id, group: def.group, baseCost: def.baseCost, order: def.order, i18nKey: def.i18nKey, variantScope: null,
    assumesUniqueness: false, find: function (model, state, ctx) { captured.push({ model, state: SG.model.cloneState(state) }); return def.find(model, state, ctx); } });
  for (let i = 0; i < puzzles.length; i++) {
    if (now() - started > 330000) { stopped = 'stopped before puzzle ' + i + ' of ' + puzzles.length + ' (330 s guard)'; break; }
    const p = puzzles[i];
    const model = H.model(p.variant);
    captured = [];
    const t0 = now();
    const ids = SG.techniques.list().filter((t) => SG.techniques.appliesTo(t, model.variantId)).map((t) => t.id);
    let status = 'error';
    try {
      status = SG.logicalSolver.solve(model, H.parsePuzzle(model, p.text), { allowedTechniques: ids, collectSteps: false, budget: SG.budget.create({ ms: 60000 }) }).status;
    } catch (e) { status = 'error ' + (e && e.code); }
    const mine = captured;
    const calls = mine.map((c) => measure(c.model, c.state));
    perPuzzle.push({ source: p.source, variant: p.variant, solveStatus: status, solveMs: r3(now() - t0), alsXzCalls: calls.length, found: calls.filter((c) => c.found).length,
      capped: calls.filter((c) => c.capHit !== null).map((c) => ({ capHit: c.capHit, work: c.work, liftedWork: c.alt.lifted.work, liftedCapHit: c.alt.lifted.capHit, liftedFound: c.alt.lifted.found })),
      workMax: calls.length === 0 ? null : Math.max.apply(null, calls.map((c) => c.work)), msMax: calls.length === 0 ? null : Math.max.apply(null, calls.map((c) => c.ms)) });
    calls.forEach((c) => rows.push(c));
  }
  result.puzzles = puzzles.length;
  result.puzzlesRun = perPuzzle.length;
  result.stopped = stopped;
  result.withCalls = perPuzzle.filter((p) => p.alsXzCalls > 0).length;
  result.summary = summarize(rows);
  result.perPuzzle = perPuzzle;
}

const text = JSON.stringify(Object.assign(result, { liftedSkipped: liftedSkipped }), null, 1);
if (outFile) fs.writeFileSync(path.resolve(outFile), text.replace(/\n/g, '\r\n') + '\r\n');
console.log(JSON.stringify(result.summary || result.groups || result.rows, null, 0).slice(0, 6000));
