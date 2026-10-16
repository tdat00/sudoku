/**
 * Shared test helper for the logical techniques (T-2.2 ... T-2.6, reused by T-2.9). Exposed as SG.techHelper.
 * Loaded automatically by tests/node-runner.js (every tests/fixtures/*.js is). It needs the core sources and
 * tests/harness.js and does no work at load time.
 *
 * ===========================================================================================
 * HOW TO USE IT FROM A TECHNIQUE SUITE (read this first)
 * ===========================================================================================
 *   var H = SG.techHelper;
 *   var model = H.model('classic9');                    // cached PuzzleModel of any registered variant id
 *
 *   // 1. Soundness (invariant I7). EVERY technique suite must have this test; it is the most important one.
 *   it('is sound', function () {
 *     H.assertSound(SG.test, 'xWing', { count: 300, minFirings: 3 });
 *   });
 *
 *   // 2. Positive fixture: this state must produce this Finding (values below are only an illustration).
 *   var state = H.makeState(model, puzzleString81);
 *   H.expectFinding(SG.test, 'xWing', state, {
 *     eliminations: [['R3C4', 5], ['R7C4', 5]],         // cells as index or as 'R3C4' label
 *     cells: ['R1C1', 'R1C7', 'R6C1', 'R6C7'],          // optional, compared as a set
 *     args: { digit: 5 }                                 // optional, must be a subset of finding.i18nArgs
 *   });
 *
 *   // 3. Negative fixture: this state must NOT produce a Finding.
 *   H.expectNoFinding(SG.test, 'xWing', H.makeState(model, anotherPuzzleString));
 *
 * `t` (first argument of the assert functions) is the assertion kit. Pass `SG.test` (or null): failures are
 * thrown as SG.test.AssertionError, like any other failed expect().
 *
 * ---- API --------------------------------------------------------------------------------------------
 * H.model(variantId = 'classic9')
 *     A cached PuzzleModel from the variant registry (variants whose build needs an rng are not supported).
 *
 * H.makeState(model, givens, opts?) -> SolveState
 *     givens: an Int32Array/array with one entry per cell (0 = empty) or a string: whitespace is ignored,
 *     '0' '.' '_' are empty cells, '1'-'9' then 'A'-'G' are the digits 1-16.
 *     The state is built like the solver builds it (every given entered with peer elimination) and, unless
 *     opts.propagate === false, then propagated with SG.constraints.propagate, so naked and hidden singles
 *     are already placed. That is where a person is once the singles are used up, which is where pointing,
 *     subset, fish and wing techniques are looked for.
 *     opts.candidates: array with one entry per cell, a string of digits ('259') or null; the cell keeps only
 *       those candidates (type in a published candidate grid). Applied before propagation.
 *     opts.eliminate: [[cell, value], ...] candidates to remove, cells as index or label. Applied before
 *       propagation. A hand-made state must still contain the true solution (the assertions check that).
 *     The state remembers its model, so the other helpers do not ask for it again.
 *
 * H.stateAfter(model, givens, techniqueIds) -> SolveState
 *     The position where the logical solver gets stuck when it may only use `techniqueIds` (registered ids;
 *     [] = the initial grid). It reaches "everything cheaper is exhausted" without hand-editing candidates,
 *     for example H.stateAfter(model, puzzle, ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine']).
 *
 * H.expectFinding(t, techniqueId, state, expected, opts?) -> Finding
 *     Calls the technique on `state` and asserts, in this order: it returned a Finding; find() did not
 *     modify the state and gives the same answer when asked twice (no randomness, no hidden state); the
 *     Finding obeys the contract (H.findingProblems is empty); it is sound against the unique solution of
 *     the puzzle when the state has one; it matches `expected`.
 *     expected = { placements?, eliminations?, cells?, args?, partial? }. Every list that is given is
 *     compared as a SET (order does not matter) and must match exactly; with partial: true the listed items
 *     only have to be contained. Lists that are left out are not checked. Returns the Finding.
 *     opts: { model (when the state was not made by this helper), solution (Int32Array, when the state does
 *     not have a unique solution of its own), assumeUniqueness (default true), solver (extra ctx options) }.
 *
 * H.expectNoFinding(t, techniqueId, state, opts?)
 *     Asserts find() returns null and leaves the state unchanged.
 *
 * H.assertSound(t, techniqueId, opts?) -> stats
 *     Invariant I7. Takes states derived from puzzles with a KNOWN UNIQUE SOLUTION, runs the technique on
 *     them and asserts that every Finding obeys the contract and never places a wrong value or removes a
 *     candidate that is the true solution of its cell. After each Finding it is applied (followed by the
 *     singles it unlocks) and the technique is asked again, up to opts.maxSteps times, so deeper positions
 *     are covered too. A failure message contains the puzzle, its solution and the offending Finding.
 *     opts: { model (default classic9; a technique with a variantScope needs model AND states),
 *             count (default 300 states), seed (default 20260101; the puzzle corpus is cached per model and
 *             seed, so all suites share it), minFirings (default 0; the technique must have fired at least
 *             this often, so a typo cannot make the test pass vacuously), maxSteps (default 40),
 *             states (an array like randomStatesWithKnownSolution returns, instead of generating some) }.
 *     Returns { states, firings, placements, eliminations, byKind } for logging.
 *
 * H.randomStatesWithKnownSolution(model, rng, count) -> Array<{ state, solution, givens, kind }>
 *     The generator behind assertSound. Puzzles are dug from random full grids and are unique by
 *     construction: every second one is a minimal puzzle that the singles alone do not finish (so the other
 *     techniques have something to do), the others stop digging early and are easier. Each puzzle yields four
 *     states, kinds 'initial' (givens only, singles still open), 'propagated' (singles used up) and two
 *     'pruned' (propagated, then a random share of the WRONG candidates removed: the solution stays, and
 *     fish, wings and subsets get more to find). Deterministic for the seed of `rng`; every call returns
 *     fresh states, so a test may modify them.
 *
 * H.findingProblems(model, state, finding, opts?) -> string[]
 *     Everything wrong with a Finding against the contract (empty array = fine). opts: { technique
 *     (expected id), solution (adds the soundness checks) }.
 *
 * H.parsePuzzle(model, text) / H.puzzleString(model, givens) / H.cell(model, ref) / H.label(model, cell)
 *     Conversions between strings, cell indices and 'R4C7' labels.
 * ===========================================================================================
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};

  var DEFAULT_SEED = 20260101;
  var DIGIT_CHARS = '123456789ABCDEFG';
  var KINDS = ['initial', 'propagated', 'pruned', 'pruned'];
  var MIN_OPEN_AFTER_PRUNING = 8;

  // ---------------------------------------------------------------------------------------------
  // Failures
  // ---------------------------------------------------------------------------------------------

  function fail(t, message) {
    var E = (t && t.AssertionError) || (SG.test && SG.test.AssertionError) || Error;
    throw new E(message);
  }

  // ---------------------------------------------------------------------------------------------
  // Models, cells, puzzle strings
  // ---------------------------------------------------------------------------------------------

  var models = {};
  /** state -> model, filled by every helper that creates a state. */
  var owners = new WeakMap();
  var labelMaps = new WeakMap();

  function model(variantId) {
    var id = variantId || 'classic9';
    if (!models[id]) models[id] = SG.variants.get(id).build({}, null);
    return models[id];
  }

  function label(m, cell) {
    return SG.model.cellLabel(m, cell);
  }

  function cell(m, ref) {
    if (typeof ref === 'number') {
      if (!(Number.isInteger(ref) && ref >= 0 && ref < m.cellCount)) {
        throw new Error('cell index ' + ref + ' is outside 0..' + (m.cellCount - 1));
      }
      return ref;
    }
    var map = labelMaps.get(m);
    if (!map) {
      map = {};
      for (var c = 0; c < m.cellCount; c++) map[SG.model.cellLabel(m, c).toUpperCase()] = c;
      labelMaps.set(m, map);
    }
    var key = String(ref).toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(map, key)) throw new Error('unknown cell label "' + ref + '"');
    return map[key];
  }

  /** Characters -> values; '0', '.' and '_' are 0 (empty). */
  function parseDigits(m, text, what) {
    var out = [];
    var clean = String(text).replace(/\s+/g, '').toUpperCase();
    for (var i = 0; i < clean.length; i++) {
      var ch = clean.charAt(i);
      if (ch === '0' || ch === '.' || ch === '_') {
        out.push(0);
        continue;
      }
      var v = DIGIT_CHARS.indexOf(ch) + 1;
      if (v < 1 || v > m.digits) {
        throw new Error(what + ': character "' + ch + '" is not valid for ' + m.digits + ' digits');
      }
      out.push(v);
    }
    return out;
  }

  function parsePuzzle(m, text) {
    if (typeof text !== 'string') {
      if (!text || text.length !== m.cellCount) {
        throw new Error('givens must have ' + m.cellCount + ' entries');
      }
      return Int32Array.from(text);
    }
    var values = parseDigits(m, text, 'puzzle');
    if (values.length !== m.cellCount) {
      throw new Error('puzzle has ' + values.length + ' cells, the model needs ' + m.cellCount);
    }
    return Int32Array.from(values);
  }

  function puzzleString(m, givens) {
    var s = '';
    for (var c = 0; c < m.cellCount; c++) s += givens[c] === 0 ? '.' : DIGIT_CHARS.charAt(givens[c] - 1);
    return s;
  }

  // ---------------------------------------------------------------------------------------------
  // States
  // ---------------------------------------------------------------------------------------------

  function bind(state, m) {
    owners.set(state, m);
    return state;
  }

  function modelOf(state, opts) {
    var m = (opts && opts.model) || owners.get(state);
    if (!m) throw new Error('this state was not made by SG.techHelper: pass { model: model } in the options');
    return m;
  }

  /** Enters the givens like the logical solver does: peer elimination only. */
  function stateFromGivens(m, givens) {
    var state = SG.model.initState(m);
    for (var c = 0; c < m.cellCount; c++) {
      if (givens[c] !== 0 && !SG.constraints.assign(m, state, c, givens[c])) {
        throw new Error('the givens contradict each other at ' + label(m, c));
      }
    }
    return state;
  }

  function restrictCandidates(m, state, specs) {
    if (specs.length !== m.cellCount) throw new Error('candidates needs one entry per cell');
    for (var c = 0; c < m.cellCount; c++) {
      if (specs[c] === null || specs[c] === undefined || specs[c] === '') continue;
      var keep = 0;
      parseDigits(m, specs[c], 'candidates[' + c + ']').forEach(function (v) {
        if (v === 0) throw new Error('candidates[' + c + '] may only list digits');
        keep |= 1 << (v - 1);
      });
      if ((state.candidates[c] & keep) === 0) {
        throw new Error('candidates[' + c + '] leaves ' + label(m, c) + ' empty');
      }
      state.candidates[c] &= keep;
    }
  }

  function makeState(m, givens, opts) {
    opts = opts || {};
    var state = stateFromGivens(m, parsePuzzle(m, givens));
    if (opts.candidates) restrictCandidates(m, state, opts.candidates);
    (opts.eliminate || []).forEach(function (pair) {
      if (!SG.constraints.eliminate(m, state, cell(m, pair[0]), pair[1])) {
        throw new Error('eliminating ' + pair[1] + ' from ' + pair[0] + ' leaves the cell empty');
      }
    });
    if (opts.propagate !== false && !SG.constraints.propagate(m, state)) {
      throw new Error('the puzzle is contradictory (propagation failed)');
    }
    return bind(state, m);
  }

  function stateAfter(m, givens, techniqueIds) {
    var report = SG.logicalSolver.solve(m, parsePuzzle(m, givens), {
      allowedTechniques: techniqueIds,
      collectSteps: false
    });
    return bind(report.state, m);
  }

  function sameState(a, b) {
    if (a.unsolvedCount !== b.unsolvedCount) return false;
    for (var i = 0; i < a.candidates.length; i++) {
      if (a.candidates[i] !== b.candidates[i] || a.value[i] !== b.value[i]) return false;
    }
    return true;
  }

  // ---------------------------------------------------------------------------------------------
  // Findings
  // ---------------------------------------------------------------------------------------------

  function isPlainData(v) {
    if (v === null) return true;
    var type = typeof v;
    if (type === 'number' || type === 'string' || type === 'boolean') return true;
    if (Array.isArray(v)) return v.every(isPlainData);
    if (type === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
      return Object.keys(v).every(function (k) { return isPlainData(v[k]); });
    }
    return false;
  }

  function isPair(pair, m) {
    return Array.isArray(pair) && pair.length === 2 && Number.isInteger(pair[0]) && pair[0] >= 0 &&
      pair[0] < m.cellCount && Number.isInteger(pair[1]) && pair[1] >= 1 && pair[1] <= m.digits;
  }

  function describePair(m, pair) {
    return '[' + pair[0] + ',' + pair[1] + '] (' + label(m, pair[0]) + ' = ' + pair[1] + ')';
  }

  function describeFinding(finding) {
    try { return JSON.stringify(finding); } catch (e) { return String(finding); }
  }

  /** Structure of the Finding: everything that can be checked without looking at the state. */
  function shapeProblems(m, finding, techniqueId) {
    var problems = [];
    if (techniqueId !== undefined && finding.technique !== techniqueId) {
      problems.push('finding.technique is ' + JSON.stringify(finding.technique) +
        ', expected "' + techniqueId + '"');
    }
    ['cells', 'placements', 'eliminations'].forEach(function (key) {
      if (!Array.isArray(finding[key])) problems.push(key + ' must be an array');
    });
    if (typeof finding.i18nKey !== 'string' || finding.i18nKey === '') {
      problems.push('i18nKey must be a non-empty string');
    }
    if (!finding.i18nArgs || typeof finding.i18nArgs !== 'object' || !isPlainData(finding.i18nArgs)) {
      problems.push('i18nArgs must be a plain JSON object (no functions, typed arrays or class instances)');
    }
    if (problems.length > 0) return problems;

    if (finding.cells.length === 0) {
      problems.push('cells is empty: nothing would be highlighted for this step');
    }
    finding.cells.forEach(function (c, k) {
      if (!(Number.isInteger(c) && c >= 0 && c < m.cellCount)) {
        problems.push('cells[' + k + '] = ' + c + ' is not a cell index');
      }
    });
    if (finding.placements.length === 0 && finding.eliminations.length === 0) {
      problems.push('no placements and no eliminations');
    }
    return problems;
  }

  function findingProblems(m, state, finding, opts) {
    opts = opts || {};
    if (finding === null || typeof finding !== 'object') return ['the Finding is not an object'];
    var problems = shapeProblems(m, finding, opts.technique);
    if (!Array.isArray(finding.placements) || !Array.isArray(finding.eliminations)) return problems;

    var cand = state.candidates;
    var val = state.value;
    var solution = opts.solution;
    var changes = 0;
    var placedAt = {};
    finding.placements.forEach(function (p, i) {
      var where = 'placements[' + i + '] ';
      if (!isPair(p, m)) {
        problems.push(where + JSON.stringify(p) + ' is not a [cell, value] pair in range');
        return;
      }
      if (placedAt[p[0]] !== undefined && placedAt[p[0]] !== p[1]) {
        problems.push(where + describePair(m, p) + ' contradicts another placement in the same cell');
      }
      placedAt[p[0]] = p[1];
      if (val[p[0]] === p[1]) problems.push(where + describePair(m, p) + ' is already placed');
      else if (val[p[0]] !== 0) problems.push(where + describePair(m, p) + ' targets a solved cell');
      else if ((cand[p[0]] & (1 << (p[1] - 1))) === 0) {
        problems.push(where + describePair(m, p) + ' is not a candidate');
      } else {
        changes++;
      }
      if (solution && solution[p[0]] !== p[1]) {
        problems.push('WRONG placement ' + describePair(m, p) + ': the solution has ' + solution[p[0]]);
      }
    });
    finding.eliminations.forEach(function (e, i) {
      var where = 'eliminations[' + i + '] ';
      if (!isPair(e, m)) {
        problems.push(where + JSON.stringify(e) + ' is not a [cell, value] pair in range');
        return;
      }
      if ((cand[e[0]] & (1 << (e[1] - 1))) === 0) {
        problems.push(where + describePair(m, e) + ' is not a candidate (list real eliminations only)');
      } else {
        changes++;
      }
      if (solution && solution[e[0]] === e[1]) {
        problems.push('UNSOUND elimination ' + describePair(m, e) + ': ' + e[1] +
          ' is the true solution of ' + label(m, e[0]));
      }
    });
    if (changes === 0 && problems.length === 0) problems.push('the Finding changes nothing in this state');
    return problems;
  }

  function requireTechnique(id) {
    if (!SG.techniques.has(id)) {
      throw new Error('technique "' + id + '" is not registered; is its file loaded?');
    }
    return SG.techniques.get(id);
  }

  function contextFor(m, opts) {
    var options = Object.assign({ assumeUniqueness: opts.assumeUniqueness }, opts.solver);
    return SG.techniques.createContext(m, options);
  }

  /** Canonical text of a find() result, for comparing two answers. */
  function answerText(finding) {
    return describeFinding(finding === undefined ? null : finding);
  }

  /**
   * Runs find() twice. Asserts that it leaves the state alone and answers the same both times; returns the
   * Finding or null.
   */
  function callFind(t, tech, m, state, ctx) {
    var before = SG.model.cloneState(state);
    var finding = tech.find(m, state, ctx);
    if (!sameState(before, state)) {
      fail(t, 'technique "' + tech.id + '" modified the state inside find(); it must only read the state ' +
        'and return a Finding');
    }
    var again = tech.find(m, state, ctx);
    if (answerText(finding) !== answerText(again)) {
      fail(t, 'technique "' + tech.id + '" is not deterministic: two calls on the same state gave\n  ' +
        answerText(finding) + '\n  ' + answerText(again));
    }
    return finding === undefined ? null : finding;
  }

  function solutionOf(m, state) {
    if (SG.dfs.countSolutions(m, state.value, 2) !== 1) return null;
    return SG.dfs.solve(m, state.value);
  }

  function pairKeys(m, pairs) {
    return pairs.map(function (p) { return cell(m, p[0]) + ':' + p[1]; }).sort();
  }

  function cellKeys(m, refs) {
    return refs.map(function (r) { return cell(m, r); }).sort(function (a, b) { return a - b; }).map(String);
  }

  function expectList(t, what, found, wanted, partial, finding, techniqueId) {
    var ok = partial ? wanted.every(function (x) { return found.indexOf(x) !== -1; }) :
      found.length === wanted.length && found.every(function (x, i) { return x === wanted[i]; });
    if (!ok) {
      fail(t, 'technique "' + techniqueId + '": ' + what + ' ' +
        (partial ? 'do not contain' : 'differ from') +
        ' the expected ones.\n  expected: ' + wanted.join(' ') + '\n  found:    ' + found.join(' ') +
        '\n  finding:  ' + describeFinding(finding));
    }
  }

  function expectFinding(t, techniqueId, state, expected, opts) {
    opts = opts || {};
    var tech = requireTechnique(techniqueId);
    var m = modelOf(state, opts);
    var finding = callFind(t, tech, m, state, contextFor(m, opts));
    if (finding === null) {
      fail(t, 'technique "' + techniqueId + '" found nothing, but a Finding was expected');
    }

    var solution = opts.solution || solutionOf(m, state);
    if (solution) {
      for (var c = 0; c < m.cellCount; c++) {
        if ((state.candidates[c] & (1 << (solution[c] - 1))) === 0) {
          fail(t, 'the fixture state is inconsistent: the solution digit ' + solution[c] + ' of ' +
            label(m, c) + ' is not among its candidates');
        }
      }
    }
    var problems = findingProblems(m, state, finding, { technique: techniqueId, solution: solution });
    if (problems.length > 0) {
      fail(t, 'technique "' + techniqueId + '" returned a bad Finding:\n  - ' + problems.join('\n  - ') +
        '\n  finding: ' + describeFinding(finding));
    }

    expected = expected || {};
    var partial = expected.partial === true;
    if (expected.placements) {
      expectList(t, 'placements', pairKeys(m, finding.placements), pairKeys(m, expected.placements),
        partial, finding, techniqueId);
    }
    if (expected.eliminations) {
      expectList(t, 'eliminations', pairKeys(m, finding.eliminations), pairKeys(m, expected.eliminations),
        partial, finding, techniqueId);
    }
    if (expected.cells) {
      expectList(t, 'cells', cellKeys(m, finding.cells), cellKeys(m, expected.cells), partial, finding,
        techniqueId);
    }
    Object.keys(expected.args || {}).forEach(function (key) {
      if (!SG.test.deepEqual(finding.i18nArgs[key], expected.args[key])) {
        fail(t, 'technique "' + techniqueId + '": i18nArgs.' + key + ' is ' +
          describeFinding(finding.i18nArgs[key]) + ', expected ' + describeFinding(expected.args[key]));
      }
    });
    return finding;
  }

  function expectNoFinding(t, techniqueId, state, opts) {
    opts = opts || {};
    var tech = requireTechnique(techniqueId);
    var m = modelOf(state, opts);
    var finding = callFind(t, tech, m, state, contextFor(m, opts));
    if (finding !== null) {
      fail(t, 'technique "' + techniqueId + '" should find nothing here, but returned: ' +
        describeFinding(finding));
    }
  }

  // ---------------------------------------------------------------------------------------------
  // States with a known solution
  // ---------------------------------------------------------------------------------------------

  /** Puzzles (unique by construction) per model and seed; grown on demand and shared by every caller. */
  var corpora = new Map();

  function solvedBySingles(m, givens) {
    var state = stateFromGivens(m, givens);
    return SG.constraints.propagate(m, state) && state.unsolvedCount === 0;
  }

  /**
   * Every second puzzle is dug to a minimal one and kept only when the singles alone do not finish it (such
   * a position is where the other techniques get their turn); the rest stop digging early and are easier.
   */
  function makePuzzle(m, rng, index) {
    var wantStuck = index % 2 === 0;
    var puzzle = null;
    for (var attempt = 0; attempt < 30; attempt++) {
      var r = rng.fork('techHelper.puzzle.' + index + '.' + attempt);
      var solution = SG.fullGrid.generate(m, r.fork('grid'), null);
      var minClues = wantStuck ? 0 : Math.ceil(m.cellCount * (0.3 + 0.2 * r.fork('clues').next()));
      var dug = SG.digger.dig(m, solution, r.fork('dig'), { symmetry: 'none', minClues: minClues });
      puzzle = { givens: dug.givens, solution: solution };
      if (!wantStuck || !solvedBySingles(m, puzzle.givens)) break;
    }
    return puzzle;
  }

  function corpus(m, rng, size) {
    var key = [m.variantId, m.cellCount, m.digits, m.units.length, rng.seed].join('|');
    var list = corpora.get(key);
    if (!list) {
      list = [];
      corpora.set(key, list);
    }
    while (list.length < size) list.push(makePuzzle(m, rng, list.length));
    return list;
  }

  /**
   * 'pruned': the propagated position with a random share of its WRONG candidates removed, which keeps the
   * solution in every cell but leaves fish, wings and subsets more to find. It is propagated again when
   * that leaves enough open cells, otherwise the singles stay open so the position is not trivial.
   */
  function buildState(m, puzzle, kind, r) {
    var state = stateFromGivens(m, puzzle.givens);
    if (kind === 'initial') return state;
    if (!SG.constraints.propagate(m, state)) {
      throw new Error('internal: a puzzle with a solution failed to propagate');
    }
    if (kind === 'propagated') return state;
    var share = 0.02 + 0.2 * r.next();
    for (var c = 0; c < m.cellCount; c++) {
      if (state.value[c] !== 0) continue;
      for (var v = 1; v <= m.digits; v++) {
        if (v !== puzzle.solution[c] && (state.candidates[c] & (1 << (v - 1))) !== 0 && r.next() < share) {
          SG.constraints.eliminate(m, state, c, v);
        }
      }
    }
    var settled = SG.model.cloneState(state);
    if (!SG.constraints.propagate(m, settled)) {
      throw new Error('internal: removing wrong candidates broke propagation');
    }
    return settled.unsolvedCount >= MIN_OPEN_AFTER_PRUNING ? settled : state;
  }

  function randomStatesWithKnownSolution(m, rng, count) {
    var perPuzzle = KINDS.length;
    var puzzles = corpus(m, rng, Math.ceil(count / perPuzzle));
    var out = [];
    for (var k = 0; k < count; k++) {
      var puzzle = puzzles[Math.floor(k / perPuzzle)];
      var kind = KINDS[k % perPuzzle];
      var state = buildState(m, puzzle, kind, rng.fork('techHelper.state.' + k));
      out.push({ state: bind(state, m), solution: puzzle.solution, givens: puzzle.givens, kind: kind });
    }
    return out;
  }

  /** Applies a Finding with the engine's own primitives, then the singles it unlocks. */
  function applyFinding(m, state, finding) {
    var i;
    for (i = 0; i < finding.placements.length; i++) {
      var p = finding.placements[i];
      if (!SG.constraints.assign(m, state, p[0], p[1])) return false;
    }
    for (i = 0; i < finding.eliminations.length; i++) {
      var e = finding.eliminations[i];
      if (!SG.constraints.eliminate(m, state, e[0], e[1])) return false;
    }
    return SG.constraints.propagate(m, state);
  }

  function describeCase(m, item, index, step) {
    return 'state #' + index + ' (' + (item.kind || 'custom') + ', step ' + step + ')' +
      '\n  puzzle:   ' + puzzleString(m, item.givens) +
      '\n  solution: ' + puzzleString(m, item.solution);
  }

  function assertSound(t, techniqueId, opts) {
    opts = opts || {};
    var tech = requireTechnique(techniqueId);
    var m = opts.model;
    if (!m) {
      if (tech.variantScope !== null) {
        throw new Error('technique "' + techniqueId + '" is scoped to [' + tech.variantScope.join(', ') +
          ']: pass { model, states } for such a variant');
      }
      m = model('classic9');
    }
    if (!SG.techniques.appliesTo(tech, m.variantId)) {
      throw new Error('technique "' + techniqueId + '" does not apply to variant "' + m.variantId + '"');
    }
    var count = opts.count === undefined ? 300 : opts.count;
    var maxSteps = opts.maxSteps === undefined ? 40 : opts.maxSteps;
    var seed = opts.seed === undefined ? DEFAULT_SEED : opts.seed;
    var states = opts.states || randomStatesWithKnownSolution(m, SG.rng.create(seed), count);
    var ctx = SG.techniques.createContext(m, { assumeUniqueness: true });
    var stats = { states: states.length, firings: 0, placements: 0, eliminations: 0, byKind: {} };

    states.forEach(function (item, index) {
      var state = SG.model.cloneState(item.state);
      for (var step = 0; step < maxSteps && state.unsolvedCount > 0; step++) {
        var finding = callFind(t, tech, m, state, ctx);
        if (finding === null) return;
        var problems = findingProblems(m, state, finding,
          { technique: techniqueId, solution: item.solution });
        if (problems.length > 0) {
          fail(t, 'technique "' + techniqueId + '" is not sound / not valid on ' +
            describeCase(m, item, index, step) +
            '\n  problems:\n  - ' + problems.join('\n  - ') + '\n  finding:  ' + describeFinding(finding));
        }
        stats.firings++;
        stats.placements += finding.placements.length;
        stats.eliminations += finding.eliminations.length;
        var kind = item.kind || 'custom';
        stats.byKind[kind] = (stats.byKind[kind] || 0) + 1;
        if (!applyFinding(m, state, finding)) {
          fail(t, 'a sound-looking Finding of "' + techniqueId + '" led to a contradiction on ' +
            describeCase(m, item, index, step) + '\n  finding:  ' + describeFinding(finding));
        }
      }
    });

    var minFirings = opts.minFirings || 0;
    if (stats.firings < minFirings) {
      fail(t, 'technique "' + techniqueId + '" fired only ' + stats.firings + ' times on ' + stats.states +
        ' states (minFirings is ' + minFirings + '): the soundness check is too weak; raise count or pass ' +
        'harder states');
    }
    return stats;
  }

  SG.techHelper = {
    model: model,
    makeState: makeState,
    stateAfter: stateAfter,
    expectFinding: expectFinding,
    expectNoFinding: expectNoFinding,
    assertSound: assertSound,
    randomStatesWithKnownSolution: randomStatesWithKnownSolution,
    findingProblems: findingProblems,
    parsePuzzle: parsePuzzle,
    puzzleString: puzzleString,
    cell: cell,
    label: label,
    KINDS: KINDS
  };
})();
