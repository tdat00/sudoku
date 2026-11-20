'use strict';
// Scratch (MS16, development, read-only: no generation, no corpus, nothing written): the real finder on the brief's vectors and
// on the real classic 9 x 9 puzzles of SG.fixtures.techniques (known unique fixtures already in the repository), at several
// explicit prefixes of registered ids, and along the full canonical solve of each (the steps whose technique is sueDeCoq).
//   node search-sdc.js vectors|prefixes|solves
const SG = require('./load.js');
const H = SG.techHelper;
const A = SG.alsPatterns;
const part = process.argv[2];
const m9 = H.model('classic9');

function maskOf(digits) { let m = 0; for (const ch of digits) m |= 1 << (Number(ch) - 1); return m; }
function position(restricted) {
  const s = SG.model.initState(m9);
  Object.keys(restricted).forEach((ref) => { s.candidates[H.cell(m9, ref)] = maskOf(restricted[ref]); });
  return s;
}
function show(label, state, opts) {
  const seen = [];
  const ctx = SG.techniques.createContext(m9, { onPatternWork: (r) => seen.push(r) });
  const f = A.findSueDeCoq(m9, state, ctx, opts);
  const lab = (c) => SG.model.cellLabel(m9, c);
  console.log(label + ': ' + (f === null ? 'null' : JSON.stringify({ cells: f.cells.map(lab), elim: f.eliminations.map((e) => lab(e[0]) + '-' + e[1]).join(' '), key: f.i18nKey, args: f.i18nArgs })) + ' ' + JSON.stringify(seen));
}

if (part === 'vectors') {
  show('vector 1', position({ R1C1: '1234', R1C2: '1234', R1C5: '12', R2C3: '34' }));
  show('vector 2 (I = R1C1 R1C2 R1C3)', position({ R1C1: '1234', R1C2: '1235', R1C3: '125', R1C5: '12', R2C3: '34' }));
  show('vector 2b', position({ R1C1: '1234', R1C2: '1234', R1C3: '15', R1C5: '12', R2C3: '34' }));
  show('empty board', SG.model.initState(m9));
}

const F = SG.fixtures.techniques;
function puzzles() {
  const seen = new Map();
  const add = (e, tag) => { if (e && typeof e.puzzle === 'string' && e.puzzle.length === 81 && !seen.has(e.puzzle)) seen.set(e.puzzle, tag); };
  Object.keys(F.byId).forEach((id) => { (F.byId[id].positive || []).forEach((x) => add(x, id + '+')); (F.byId[id].negative || []).forEach((x) => add(x, id + '-')); });
  Object.keys(F.supplements).forEach((id) => F.supplements[id].forEach((x) => add(x, id + 's')));
  const out = [];
  seen.forEach((tag, puzzle) => {
    const g = H.parsePuzzle(m9, puzzle);
    if (SG.dfs.countSolutions(m9, g, 2) === 1) out.push({ tag, puzzle, solution: SG.dfs.solve(m9, g) });
  });
  return out;
}

if (part === 'prefixes') {
  const unscoped = SG.techniques.list().filter((t) => t.variantScope === null);
  const prefixes = { none: [], singles: ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine'] };
  [40, 60, 100, 140, 190].forEach((o) => { prefixes['below' + o] = unscoped.filter((t) => t.order < o).map((t) => t.id); });
  const list = puzzles();
  console.log('puzzles ' + list.length);
  Object.keys(prefixes).forEach((name) => {
    let fired = 0;
    let z = 0;
    const rows = [];
    list.forEach((p) => {
      const state = H.stateAfter(m9, p.puzzle, prefixes[name]);
      if (state.unsolvedCount === 0) return;
      const f = A.findSueDeCoq(m9, state, SG.techniques.createContext(m9, {}));
      if (f === null) return;
      fired++;
      if (f.i18nKey.endsWith('.extra')) z++;
      f.eliminations.forEach((e) => { if (p.solution[e[0]] === e[1]) throw new Error('unsound'); });
      rows.push(p.tag + ' ' + f.i18nKey.slice(17) + ' I' + (f.cells.length) + ' elim ' + f.eliminations.length);
    });
    console.log('prefix ' + name + ' (' + prefixes[name].length + ' ids): ' + fired + ' of ' + list.length + ' fire, Z non-empty ' + z + '; ' + rows.slice(0, 6).join(' | '));
  });
}

if (part === 'known') {
  // every classic 9 x 9 puzzle already in the repository (technique fixtures, rated references, unique fixtures, help sources),
  // with a unique solution, at the registry position of sueDeCoq (every unscoped technique of order < 196 exhausted), at the
  // propagated givens and at the bare givens
  const fs = require('fs');
  const path = require('path');
  const vm = require('vm');
  const root = path.join(__dirname, '..', '..', '..', '..', '..');
  vm.runInThisContext(fs.readFileSync(path.join(root, 'player', 'js', 'ui', 'help-examples.js'), 'utf8'));
  const seen = new Map();
  const add = (text, tag) => { if (typeof text === 'string' && text.length === 81 && !seen.has(text)) seen.set(text, tag); };
  puzzles().forEach((p) => add(p.puzzle, 'techniques ' + p.tag));
  SG.fixtures.rated.entries.forEach((e, i) => add(e.puzzle, 'rated ' + (e.name || i)));
  SG.fixtures.classic.unique.forEach((e, i) => add(e.puzzle, 'unique ' + (e.name || i)));
  Object.keys(SG.helpExamples).forEach((id) => { const ex = SG.helpExamples[id]; if (ex.variant === 'classic9') add(ex.givens, 'help ' + id); });
  const ids = SG.techniques.list().filter((t) => t.variantScope === null && t.order < 196).map((t) => t.id);
  let usable = 0;
  const rows = [];
  seen.forEach((tag, text) => {
    const givens = H.parsePuzzle(m9, text);
    if (SG.dfs.countSolutions(m9, givens, 2) !== 1) return;
    usable++;
    const solution = SG.dfs.solve(m9, givens);
    [['registry', () => H.stateAfter(m9, text, ids)], ['propagated', () => H.makeState(m9, text, { propagate: true })],
      ['bare', () => H.makeState(m9, text, { propagate: false })]].forEach(([where, make]) => {
      const state = make();
      if (state.unsolvedCount === 0) return;
      const f = A.findSueDeCoq(m9, state, SG.techniques.createContext(m9, {}));
      if (f === null) return;
      f.eliminations.forEach((e) => { if (solution[e[0]] === e[1]) throw new Error('unsound'); });
      const xz = A.findXz(m9, state, SG.techniques.createContext(m9, {})) !== null;
      rows.push(where + ' | ' + tag + ' | ' + text + ' | ' + f.i18nKey.slice(17) + ' cells ' + f.cells.length + ' elim ' + f.eliminations.length + ' alsXz ' + xz);
    });
  });
  console.log('sources ' + seen.size + ', unique solution ' + usable);
  rows.forEach((r) => console.log(r));
}

if (part === 'finding') {
  // node search-sdc.js finding <puzzle> <registry|propagated|bare>: the whole Finding of the finder on that position
  const text = process.argv[3];
  const where = process.argv[4];
  const ids = SG.techniques.list().filter((t) => t.variantScope === null && t.order < 196).map((t) => t.id);
  const state = where === 'registry' ? H.stateAfter(m9, text, ids) : H.makeState(m9, text, { propagate: where === 'propagated' });
  const f = A.findSueDeCoq(m9, state, SG.techniques.createContext(m9, {}));
  console.log(JSON.stringify(f));
  if (f !== null) {
    const solution = SG.dfs.solve(m9, H.parsePuzzle(m9, text));
    const lab = (c) => SG.model.cellLabel(m9, c);
    console.log('cells ' + f.cells.map(lab).join(' ') + ' | eliminations ' + f.eliminations.map((e) => lab(e[0]) + '-' + e[1]).join(' '));
    console.log('unsound: ' + f.eliminations.filter((e) => solution[e[0]] === e[1]).length + ', open cells ' + state.unsolvedCount);
  }
}

if (part === 'neighbours') {
  // the alsXz fixtures and every positive and negative of the other chain fixtures at their own positions: does sueDeCoq fire?
  ['alsXz', 'forcingChain', 'forcingChainLong', 'nishio', 'nishioDeep', 'xyChain'].forEach((id) => {
    ['positive', 'negative'].forEach((kind) => {
      (F.byId[id][kind] || []).forEach((fx, i) => {
        const state = fx.after !== null ? H.stateAfter(m9, fx.puzzle, fx.after) : H.makeState(m9, fx.puzzle, { propagate: fx.propagate });
        const f = A.findSueDeCoq(m9, state, SG.techniques.createContext(m9, {}));
        console.log(id + ' ' + kind + ' #' + i + ': sueDeCoq ' + (f === null ? 'null' : f.i18nKey.slice(17) + ' elim ' + f.eliminations.length) + ' | ' + fx.name.slice(0, 60));
      });
    });
  });
}

if (part === 'solves') {
  const list = puzzles();
  let steps = 0;
  let puzzlesWith = 0;
  const ids = SG.techniques.list().filter((t) => t.variantScope === null).map((t) => t.id);
  list.forEach((p) => {
    const r = SG.logicalSolver.solve(m9, H.parsePuzzle(m9, p.puzzle), { allowedTechniques: ids, collectSteps: true });
    const mine = (r.steps || []).map((s, i) => ({ s, i })).filter((x) => x.s.technique === 'sueDeCoq');
    if (mine.length > 0) {
      puzzlesWith++;
      steps += mine.length;
      console.log(p.tag + ' ' + p.puzzle + ' steps ' + r.steps.length + ' sueDeCoq at ' + mine.map((x) => x.i + ':' + x.s.i18nKey.slice(17)).join(','));
    }
  });
  console.log('puzzles with sueDeCoq in the full solve: ' + puzzlesWith + ' of ' + list.length + ', steps ' + steps);
}

if (part === 'populations') {
  // the seeded populations of the tests: positions, firings, the two forms, the sizes of I, the number of cells (p + q)
  const M = SG.fixtures.models;
  const J = SG.fixtures.jigsawModels;
  const rs = (model, rng) => SG.testkit.randomSolution(model, rng);
  const seeded = (model, solve, seed, count, keepRange) => {
    const rng = SG.testkit.rng.create(seed);
    const out = [];
    for (let i = 0; i < count; i++) {
      const solution = solve(model, rng.fork('grid' + i));
      const pick = rng.fork('pick' + i);
      const placedShare = 0.03 + 0.25 * pick.next();
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
  };
  const pops = [];
  const add = (name, model, solve, seed, count, keep) => pops.push({ name, model, solve, seed, count, keep });
  const tries = JSON.parse(process.argv[3] || '[0.05,0.4]');
  [4001, 4011, 4021].forEach((seed) => add('classic9 ' + seed, SG.techHelper.model('classic9'), rs, seed, 8, tries));
  [4002, 4012].forEach((seed) => add('classic6 ' + seed, SG.techHelper.model('classic6'), rs, seed, 12, tries));
  [4003, 4013].forEach((seed) => add('classic4 ' + seed, SG.techHelper.model('classic4'), rs, seed, 12, tries));
  [4004, 4014].forEach((seed) => add('12 digits ' + seed, M.boxGrid('s12', 3, 4), rs, seed, 4, tries));
  [4005, 4015].forEach((seed) => add('16 digits ' + seed, M.boxGrid('s16', 4, 4), rs, seed, 3, tries));
  [4006, 4016].forEach((seed) => add('samurai ' + seed, M.samurai(), rs, seed, 2, tries));
  [4007, 4017].forEach((seed) => ['diagonalX', 'hyper'].forEach((id) => add(id + ' ' + seed, SG.techHelper.model(id), rs, seed, 6, tries)));
  ['staggered', 'wavy', 'mixed', 'crossed'].forEach((name, i) => [false, true].forEach((flip) => {
    const layout = J.parse(J.LAYOUTS[name]);
    add('jigsaw ' + name + (flip ? ' T' : ''), J.build(flip ? J.transpose(layout) : layout), J.solve, 4100 + 2 * i + (flip ? 1 : 0), 6, tries);
  }));
  if (process.argv[4] === '16') {
    pops.length = 0;
    for (let s = 4020; s < 4060; s++) add('16 digits ' + s, M.boxGrid('s16', 4, 4), rs, s, 3, tries);
  }
  pops.forEach((p) => {
    let fired = 0;
    let extra = 0;
    let i3 = 0;
    let capped = 0;
    let over = 0;
    const t0 = Date.now();
    seeded(p.model, p.solve, p.seed, p.count, p.keep).forEach((item) => {
      const seen = [];
      const f = A.findSueDeCoq(p.model, item.state, SG.techniques.createContext(p.model, { onPatternWork: (r) => seen.push(r) }));
      if (seen[0].capHit === 'work') over++;
      if (seen[0].capHit === 'records') capped++;
      if (f === null) return;
      fired++;
      if (f.i18nKey.endsWith('.extra')) extra++;
      if (f.i18nArgs.forced.length === 1) i3++;
      f.eliminations.forEach((e) => { if (item.solution[e[0]] === e[1]) throw new Error('unsound'); });
    });
    console.log(p.name + ' keep ' + JSON.stringify(p.keep) + ': ' + p.count + ' positions, fired ' + fired + ' (Z non-empty ' + extra + '), work-capped ' + over + ', record-capped ' + capped + ', ' + (Date.now() - t0) + ' ms');
  });
}
