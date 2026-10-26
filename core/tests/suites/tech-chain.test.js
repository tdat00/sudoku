// Chain techniques: Forcing Chain / X-Cycle (`forcingChain`) and Nishio (`nishio`).
//
// Soundness matters most here: an unsound chain silently produces puzzles without a solution (risk R3). So
// besides the shared invariant I7 check (SG.techHelper.assertSound) the suite
//   - verifies every chain a Finding reports with its OWN link definitions (a proof checker that shares no
//     code with the technique): polarity alternation, strong and weak links, the elimination rule;
//   - checks findings against an exhaustive oracle on positions with MANY solutions (a candidate may only be
//     removed when no solution contains it), not just against one known solution;
//   - feeds "twin solution" positions, where every candidate belongs to a solution, so any finding at all
//     would be unsound, and where the strong link graph is one big cycle (termination).
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var H = SG.techHelper;
  var F = SG.fixtures.classic;
  var model9 = H.model('classic9');
  var model6 = H.model('classic6');
  var model4 = H.model('classic4');
  var CHAIN_IDS = ['forcingChain', 'nishio'];
  var EVIL = ['escargot', 'worlds-hardest-2012', 'hard-platinum', 'hard-nugget', 'hard-b', 'hard-c'];

  function fail(message) {
    throw new SG.test.AssertionError(message);
  }

  function bitOf(digit) {
    return 1 << (digit - 1);
  }

  function ctxFor(m, options) {
    return SG.techniques.createContext(m, options || {});
  }

  function run(id, m, state, options) {
    return SG.techniques.get(id).find(m, state, ctxFor(m, options));
  }

  function fixture(name) {
    var found = F.unique.filter(function (fx) { return fx.name === name; })[0];
    if (!found) throw new Error('no fixture puzzle named ' + name);
    return found;
  }

  function same(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  /** Every registered technique below the chain group that is not tied to a variant. */
  function lowerIds() {
    return SG.techniques.list().filter(function (t) {
      return t.group !== 'chain' && t.variantScope === null;
    }).map(function (t) { return t.id; });
  }

  function caught(fn) {
    try {
      fn();
    } catch (err) {
      return err;
    }
    return null;
  }

  function applyFinding(m, state, finding) {
    var i;
    for (i = 0; i < finding.placements.length; i++) {
      if (!SG.constraints.assign(m, state, finding.placements[i][0], finding.placements[i][1])) return false;
    }
    for (i = 0; i < finding.eliminations.length; i++) {
      if (!SG.constraints.eliminate(m, state, finding.eliminations[i][0], finding.eliminations[i][1])) {
        return false;
      }
    }
    return SG.constraints.propagate(m, state);
  }

  // Proof checker for forcingChain Findings. It re-derives every link from the state with its own
  // definitions; nothing here is shared with ../core/js/engine/tech-chain.js.
  function isOpen(state, cell, digit) {
    return state.value[cell] === 0 && (state.candidates[cell] & bitOf(digit)) !== 0;
  }

  /** "At most one of the two is true". */
  function weakLinked(m, state, a, b) {
    if (!isOpen(state, a[0], a[1]) || !isOpen(state, b[0], b[1])) return false;
    if (a[0] === b[0]) return a[1] !== b[1];
    return a[1] === b[1] && m.peers[a[0]].indexOf(b[0]) !== -1;
  }

  /** "At least one of the two is true": two candidates of a cell, or two places of a digit in a unit. */
  function strongLinked(m, state, a, b) {
    if (!isOpen(state, a[0], a[1]) || !isOpen(state, b[0], b[1])) return false;
    if (a[0] === b[0]) return a[1] !== b[1] && SG.bits.popcount(state.candidates[a[0]]) === 2;
    if (a[1] !== b[1]) return false;
    var digit = a[1];
    for (var k = 0; k < m.cellUnits[a[0]].length; k++) {
      var u = m.cellUnits[a[0]][k];
      if (m.cellUnits[b[0]].indexOf(u) === -1) continue;
      var meta = m.unitMeta[u];
      if (m.units[u].length !== m.digits || (meta && meta.partial)) continue;
      var holders = 0;
      var placed = false;
      for (var i = 0; i < m.units[u].length; i++) {
        var c = m.units[u][i];
        if (state.value[c] === digit) placed = true;
        if (isOpen(state, c, digit)) holders++;
      }
      if (!placed && holders === 2) return true;
    }
    return false;
  }

  function lastOf(list) {
    return list[list.length - 1];
  }

  /** Everything wrong with the chains of a forcingChain Finding (empty array = a valid proof). */
  function chainProblems(m, state, finding) {
    var problems = [];
    var args = finding.i18nArgs;
    var chains = args.chains;
    if (!Array.isArray(chains) || chains.length === 0) return ['i18nArgs.chains is missing'];

    var lengths = chains.map(function (path, k) {
      path.forEach(function (step, i) {
        var where = 'chain ' + k + ', step ' + i + ' ' + JSON.stringify(step);
        if (step[2] !== 0 && step[2] !== 1) problems.push(where + ': truth must be 0 or 1');
        if (!isOpen(state, step[0], step[1])) problems.push(where + ' is not an open candidate');
        if (i === 0) return;
        var prev = path[i - 1];
        if (prev[2] === 0) {
          if (step[2] !== 1) problems.push(where + ': a false node must be followed by a true node');
          else if (!strongLinked(m, state, prev, step)) problems.push(where + ': not a strong link');
        } else if (step[2] !== 0) {
          problems.push(where + ': a true node must be followed by a false node');
        } else if (!weakLinked(m, state, prev, step)) {
          problems.push(where + ': not a weak link');
        }
      });
      return path.length - 1;
    });

    var start = chains[0][0];
    var cells = [];
    chains.forEach(function (path) {
      path.forEach(function (step) { if (cells.indexOf(step[0]) === -1) cells.push(step[0]); });
    });
    if (!same(finding.cells.slice().sort(), cells.slice().sort())) {
      problems.push('cells ' + JSON.stringify(finding.cells) + ' are not the cells of the chains');
    }
    if (args.length !== Math.max.apply(null, lengths)) {
      problems.push('length ' + args.length + ' is not the number of links ' + JSON.stringify(lengths));
    }

    if (args.kind === 'endpoints') {
      var end = lastOf(chains[0]);
      if (chains.length !== 1) problems.push('endpoints has exactly one chain');
      if (start[2] !== 0 || end[2] !== 1) problems.push('endpoints runs from a false node to a true node');
      if (start[0] === end[0] && start[1] === end[1]) problems.push('endpoints with one and the same node');
      if (finding.placements.length !== 0 || finding.eliminations.length === 0) {
        problems.push('endpoints eliminates and never places');
      }
      finding.eliminations.forEach(function (e) {
        if (!weakLinked(m, state, e, start) || !weakLinked(m, state, e, end)) {
          problems.push('elimination ' + JSON.stringify(e) + ' is not weakly linked to both ends');
        }
      });
    } else if (args.kind === 'contradiction' || args.kind === 'forced') {
      var wantStart = args.kind === 'contradiction' ? 1 : 0;
      if (chains.length !== 2) problems.push(args.kind + ' has exactly two chains');
      if (chains.length === 2) {
        var a = lastOf(chains[0]);
        var b = lastOf(chains[1]);
        if (!same(chains[1][0], start)) problems.push('both chains must start at the same literal');
        if (a[0] !== b[0] || a[1] !== b[1] || a[2] === b[2]) {
          problems.push('the chains must end in the two polarities of one node');
        }
      }
      if (start[2] !== wantStart) problems.push(args.kind + ' must start from truth ' + wantStart);
      var target = [[start[0], start[1]]];
      var onlyKey = args.kind === 'contradiction' ? 'eliminations' : 'placements';
      var otherKey = args.kind === 'contradiction' ? 'placements' : 'eliminations';
      if (!same(finding[onlyKey], target) || finding[otherKey].length !== 0) {
        problems.push(args.kind + ' must give exactly ' + onlyKey + ' ' + JSON.stringify(target));
      }
    } else {
      problems.push('unknown kind ' + JSON.stringify(args.kind));
    }
    return problems;
  }

  // Exhaustive oracle: which candidates belong to at least one solution of a position?
  function supportedMasks(m, state) {
    var out = new Int32Array(m.cellCount);
    for (var c = 0; c < m.cellCount; c++) {
      if (state.value[c] !== 0) {
        out[c] = bitOf(state.value[c]);
        continue;
      }
      for (var d = 1; d <= m.digits; d++) {
        if ((state.candidates[c] & bitOf(d)) === 0) continue;
        var trial = SG.model.cloneState(state);
        if (SG.constraints.assign(m, trial, c, d) && SG.constraints.propagate(m, trial) &&
            SG.dfs.searchFrom(m, trial, { limit: 1 }).found > 0) {
          out[c] |= bitOf(d);
        }
      }
    }
    return out;
  }

  /** A sound Finding removes only candidates without a solution and places only the one possible value. */
  function oracleProblems(m, state, finding, support) {
    var problems = [];
    finding.eliminations.forEach(function (e) {
      if ((support[e[0]] & bitOf(e[1])) !== 0) {
        problems.push('UNSOUND: ' + SG.model.cellLabel(m, e[0]) + ' <> ' + e[1] + ' is part of a solution');
      }
    });
    finding.placements.forEach(function (p) {
      if (support[p[0]] !== bitOf(p[1])) {
        problems.push('UNSOUND: placing ' + p[1] + ' in ' + SG.model.cellLabel(m, p[0]) +
          ' although other values stay possible there');
      }
    });
    return problems;
  }

  /**
   * Applies `id` repeatedly and checks every Finding against the oracle (and the proof checker for chains).
   * @returns {number} how many times it fired.
   */
  function runWithOracle(id, m, start, maxSteps, label) {
    var state = SG.model.cloneState(start);
    var firings = 0;
    for (var step = 0; step < maxSteps && state.unsolvedCount > 0; step++) {
      var finding = run(id, m, state);
      if (finding === null) break;
      firings++;
      var problems = H.findingProblems(m, state, finding, { technique: id });
      if (id === 'forcingChain') problems = problems.concat(chainProblems(m, state, finding));
      problems = problems.concat(oracleProblems(m, state, finding, supportedMasks(m, state)));
      if (problems.length > 0) {
        fail(id + ' failed on ' + label + ' (step ' + step + '):\n  - ' + problems.join('\n  - ') +
          '\n  finding: ' + JSON.stringify(finding));
      }
      if (!applyFinding(m, state, finding)) fail(id + ' led to a contradiction on ' + label);
    }
    return firings;
  }

  /** A position that keeps the solution but is otherwise random: some cells placed, wrong candidates kept. */
  function prunedFromSolution(m, solution, rng, placedShare, keepShare) {
    var state = SG.model.initState(m);
    var c;
    for (c = 0; c < m.cellCount; c++) {
      if (rng.next() < placedShare && !SG.constraints.assign(m, state, c, solution[c])) {
        throw new Error('the solution does not fit the model');
      }
    }
    for (c = 0; c < m.cellCount; c++) {
      if (state.value[c] !== 0) continue;
      var keep = bitOf(solution[c]);
      for (var v = 1; v <= m.digits; v++) {
        if (v !== solution[c] && rng.next() < keepShare) keep |= bitOf(v);
      }
      state.candidates[c] &= keep;
    }
    return state;
  }

  function randomSolution(m, rng) {
    var solution = SG.testkit.randomSolution(m, rng);
    if (!SG.model.isSolution(m, solution)) throw new Error('not a solution');
    return solution;
  }

  /** States for H.assertSound({ states }) that keep a known solution but are NOT dug from a puzzle. */
  function prunedStates(m, rng, count, keepShare) {
    var out = [];
    for (var i = 0; i < count; i++) {
      var r = rng.fork('pruned.' + i);
      var solution = randomSolution(m, r.fork('grid'));
      var state = prunedFromSolution(m, solution, r.fork('state'), 0.15 * r.next(), keepShare(r));
      out.push({ state: state, solution: solution, givens: solution, kind: 'pruned' });
    }
    return out;
  }

  /** A position whose candidates are exactly the digits of the given solutions (all of them supported). */
  function twinState(m, solutions, decoys) {
    var state = SG.model.initState(m);
    var c;
    for (c = 0; c < m.cellCount; c++) {
      var mask = 0;
      for (var k = 0; k < solutions.length; k++) mask |= bitOf(solutions[k][c]);
      state.candidates[c] = mask;
    }
    (decoys || []).forEach(function (d) { state.candidates[d[0]] |= bitOf(d[1]); });
    for (c = 0; c < m.cellCount; c++) {
      var m1 = state.candidates[c];
      if ((m1 & (m1 - 1)) === 0 && !SG.constraints.assign(m, state, c, 32 - Math.clz32(m1))) {
        throw new Error('twin state is inconsistent');
      }
    }
    return state;
  }

  function relabel(solution, perm) {
    return Int32Array.from(solution, function (v) { return perm[v - 1]; });
  }

  function randomPerm(rng, digits) {
    var perm = [];
    for (var d = 1; d <= digits; d++) perm.push(d);
    return rng.shuffle(perm);
  }

  /**
   * Another valid classic9 grid: digits permuted, rows permuted inside bands and bands permuted, columns the
   * same way, and sometimes transposed.
   */
  function symmetric9(solution, rng) {
    function order() {
      var bands = rng.shuffle([0, 1, 2]);
      var out = [];
      bands.forEach(function (b) {
        rng.shuffle([0, 1, 2]).forEach(function (i) { out.push(b * 3 + i); });
      });
      return out;
    }
    var rows = order();
    var cols = order();
    var perm = randomPerm(rng, 9);
    var transpose = rng.next() < 0.5;
    var out = new Int32Array(81);
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        var from = transpose ? cols[c] * 9 + rows[r] : rows[r] * 9 + cols[c];
        out[r * 9 + c] = perm[solution[from] - 1];
      }
    }
    if (!SG.model.isSolution(model9, out)) throw new Error('symmetry broke the grid');
    return out;
  }

  /** 4x4 with an extra all-different group of three cells (a partial unit: a digit may be missing there). */
  function partialUnitModel() {
    var base = SG.fixtures.models.boxGrid('chain-partial-base', 2, 2);
    var units = Array.prototype.map.call(base.units, function (u) { return Array.from(u); });
    var meta = Array.prototype.slice.call(base.unitMeta);
    units.push([0, 5, 10]);
    meta.push({ kind: 'diag', gridIndex: 0, label: 'P', partial: true });
    return SG.model.create({ variantId: 'chain-partial', digits: 4, units: units, unitMeta: meta,
      layout: base.layout });
  }

  /** 6x6 whose boxes are irregular: random cell swaps between boxes, kept only when a solution exists. */
  function irregularModel(rng, tag) {
    var base = SG.fixtures.models.boxGrid(tag + '-base', 2, 3);
    for (var attempt = 0; attempt < 100; attempt++) {
      var units = Array.prototype.map.call(base.units, function (u) { return Array.from(u); });
      var swaps = 2 + rng.int(5);
      for (var s = 0; s < swaps; s++) {
        var a = 12 + rng.int(6);
        var b = 12 + rng.int(6);
        if (a === b) continue;
        var i = rng.int(6);
        var j = rng.int(6);
        var tmp = units[a][i];
        units[a][i] = units[b][j];
        units[b][j] = tmp;
      }
      var m = SG.model.create({ variantId: tag, digits: 6, units: units, unitMeta: base.unitMeta,
        layout: base.layout });
      if (SG.dfs.solve(m, new Int32Array(m.cellCount), rng.fork('probe.' + attempt)) !== null) return m;
    }
    throw new Error('could not build an irregular model');
  }

  /**
   * A ring of n cells, each neighbouring pair an all-different unit over the digits {1, 2}: a pure cycle of
   * links where every cell and every unit is a strong link and a weak link at once. An even ring has exactly
   * two solutions, an odd ring none (so only the chain graph is of interest there, not "soundness").
   */
  var rings = {};
  function ringModel(n) {
    if (!rings[n]) {
      var units = [];
      var cellRow = [];
      var cellCol = [];
      for (var i = 0; i < n; i++) {
        units.push([i, (i + 1) % n]);
        cellRow.push(0);
        cellCol.push(i);
      }
      rings[n] = SG.model.create({ variantId: 'chain-ring-' + n, digits: 2, units: units,
        layout: { rows: 1, cols: n, cellRow: cellRow, cellCol: cellCol } });
    }
    return rings[n];
  }

  /**
   * Positions where the lower technique groups are stuck, typed in as published candidate grids (so they do
   * not depend on how the lower techniques are implemented): the givens and the candidates of the 81 cells,
   * row by row. `kind`, `length`, `eliminations` / `placements` and `cells` are what forcingChain reports.
   */
  var CHAIN_FIXTURES = [
    {
      name: 'X-chain of 3 links (two eliminations)',
      puzzle: '....3....1.64.9.....472..9.5.1.4.6..8.......9....827..6.3.1..4.......5..9......3.',
      grid: ['27 9 2578 168 3 168 128 56 4', '1 28 6 4 5 9 3 278 278', '3 58 4 7 2 168 18 9 56',
        '5 237 1 9 4 37 6 28 238', '8 2367 27 1356 67 13567 4 125 9', '4 36 9 1356 8 2 7 15 135',
        '6 2578 3 258 1 578 9 4 278', '27 14 78 2368 9 3478 5 12678 12678',
        '9 14 578 2568 67 45678 28 3 12678'],
      kind: 'endpoints',
      length: 3,
      eliminations: [[70, 2], [71, 2]],
      cells: [63, 0, 6, 78],
      chains: [[[63, 2, 0], [0, 2, 1], [6, 2, 0], [78, 2, 1]]]
    },
    {
      name: 'X-chain of 3 links (one elimination)',
      puzzle: '.4..9..32...5....45.2..4.8.79.........3.8.....1....8.9.....6..543.1........43...1',
      grid: ['18 4 167 678 9 78 5 3 2', '3 678 9 5 267 278 167 167 4', '5 67 2 3 1 4 9 8 67',
        '7 9 8 26 4 125 126 1256 3', '26 5 3 2679 8 1279 4 1267 67', '26 1 4 267 2567 3 8 2567 9',
        '189 278 17 2789 27 6 3 4 5', '4 3 567 1 257 2579 267 2679 8', '89 2678 567 4 3 25789 267 2679 1'],
      kind: 'endpoints',
      length: 3,
      eliminations: [[55, 8]],
      cells: [10, 14, 3, 57]
    },
    {
      name: 'contradiction chain of 3 links',
      puzzle: '..2.....9...1.8...7....3.4..4.5..7..5.3........67...2......9.81.......9...967.2..',
      grid: ['1368 13568 2 4 56 7 1358 1356 9', '3469 3569 45 1 256 8 35 7 2356',
        '7 1568 158 9 256 3 158 4 2568',
        '2 4 18 5 9 16 7 136 368', '5 7 3 28 18 1246 9 16 46', '189 189 6 7 3 14 1458 2 458',
        '36 2356 7 23 4 9 356 8 1', '1346 12356 145 238 18 125 3456 9 7', '1348 1358 9 6 7 15 2 35 345'],
      kind: 'contradiction',
      length: 3,
      eliminations: [[1, 5]],
      cells: [1, 7, 79, 60, 55],
      chains: [[[1, 5, 1], [7, 5, 0], [79, 5, 1], [60, 5, 0]], [[1, 5, 1], [55, 5, 0], [60, 5, 1]]]
    },
    {
      name: 'contradiction chain of 4 links',
      puzzle: '8...7.14..4....5.79......3..1.53.......9....5..........32.1..8.5.7..2.......8.3..',
      grid: ['8 5 3 2 7 9 1 4 6', '2 4 1 8 6 3 5 9 7', '9 7 6 14 5 14 2 3 8', '67 1 89 5 3 678 689 2 4',
        '3 26 48 9 24 17 68 17 5', '467 269 5 167 24 68 689 17 3', '46 3 2 46 1 5 7 8 9',
        '5 8 7 3 9 2 4 6 1', '1 69 49 467 8 467 3 5 2'],
      kind: 'contradiction',
      length: 4,
      eliminations: [[32, 8]],
      cells: [32, 29, 33, 51, 50]
    },
    {
      name: 'contradiction chain of 5 links',
      puzzle: '8...7.......6....157...2.969..7...4..5............8.376......7...29.34....3.4....',
      grid: ['8 126 169 13 7 59 23 25 4', '234 23 49 6 58 459 7 258 1', '5 7 14 148 138 2 38 9 6',
        '9 13 8 7 135 56 16 4 2', '234 5 7 1234 123 46 168 68 9', '24 126 146 124 9 8 5 3 7',
        '6 4 5 28 28 1 9 7 3', '7 8 2 9 6 3 4 1 5', '1 9 3 5 4 7 26 26 8'],
      kind: 'contradiction',
      length: 5,
      eliminations: [[1, 2]],
      cells: [1, 6, 3, 39, 31, 10, 28]
    },
    {
      name: 'contradiction chain of 6 links',
      puzzle: '6.49...1..85.4...7.7.6.....79....53......3..1.4.5....9...8.6..4.2.....8...7..4.5.',
      grid: ['6 3 4 9 278 2578 28 1 258', '129 8 5 123 4 12 236 269 7', '129 7 129 6 1238 1258 2348 249 2358',
        '7 9 1268 4 1268 128 5 3 28', '25 56 268 27 9 3 24678 467 1', '123 4 12368 5 12678 1278 2678 267 9',
        '359 15 39 8 1237 6 1237 27 4', '4 2 36 17 5 9 17 8 36', '8 16 7 123 123 4 9 5 236'],
      kind: 'contradiction',
      length: 6,
      eliminations: [[36, 2]],
      cells: [36, 37, 55, 60, 69, 39, 66]
    },
    {
      name: 'forced chain of 4 links (a placement)',
      puzzle: '2...316......7.......8.9...4.1.........94....9....3.2..5....8...7.26..93..47..1..',
      grid: ['2 49 57 45 3 1 6 458 5789', '8 149 3 456 7 26 259 145 159', '57 14 6 8 25 9 23 1345 157',
        '4 38 1 56 25 267 379 368 689', '57 38 2 9 4 67 357 13568 1568', '9 6 57 1 8 3 57 2 4',
        '6 5 9 3 1 4 8 7 2', '1 7 8 2 6 5 4 9 3', '3 2 4 7 9 8 1 56 56'],
      kind: 'forced',
      length: 4,
      placements: [[14, 2]],
      cells: [14, 15, 33, 32],
      chains: [[[14, 2, 0], [15, 2, 1], [15, 9, 0], [33, 9, 1], [33, 7, 0]],
        [[14, 2, 0], [32, 2, 1], [32, 7, 0], [33, 7, 1]]]
    },
    {
      name: 'forced chain of 4 links (second example)',
      puzzle: '6...57..38......6.....9......9.1.4........8.....3.91...6.7....8.8...3..9.54...2..',
      grid: ['6 14 2 48 5 7 9 18 3', '8 9 5 24 3 124 7 6 124', '47 147 3 6 9 1248 5 128 124',
        '57 27 9 258 1 28 4 3 6', '1 3 6 245 7 24 8 9 25', '45 24 8 3 6 9 1 27 257', '9 6 1 7 2 5 3 4 8',
        '2 8 7 1 4 3 6 5 9', '3 5 4 9 8 6 2 17 17'],
      kind: 'forced',
      length: 4,
      placements: [[14, 1]],
      cells: [14, 17, 7, 3, 23]
    }
  ];

  function fixtureState(fx) {
    var candidates = fx.grid.join(' ').split(' ');
    return H.makeState(model9, fx.puzzle, { candidates: candidates });
  }

  describe('chain group: registration', function () {
    it('registers forcingChain and nishio with the ladder values of design.md 6.6', function () {
      var fc = SG.techniques.get('forcingChain');
      expect(fc.group).toBe('chain');
      expect(fc.baseCost).toBe(90);
      expect(fc.order).toBe(190);
      expect(fc.i18nKey).toBe('technique.forcingChain');
      var ni = SG.techniques.get('nishio');
      expect(ni.group).toBe('chain');
      expect(ni.baseCost).toBe(140);
      expect(ni.order).toBe(200);
      expect(ni.i18nKey).toBe('technique.nishio');
    });

    it('applies to every variant and does not rely on a unique solution', function () {
      CHAIN_IDS.forEach(function (id) {
        var t = SG.techniques.get(id);
        expect(t.variantScope).toBeNull();
        expect(t.assumesUniqueness).toBe(false);
      });
    });

    it('comes after every technique of the lower groups in the ladder', function () {
      SG.techniques.list().forEach(function (t) {
        if (t.group !== 'chain') expect(t.order).toBeLessThan(190);
      });
    });
  });

  describe('chain group: soundness (I7)', function () {
    it('forcingChain never removes a solution candidate (300 states)', function () {
      H.assertSound(SG.test, 'forcingChain', { count: 300, minFirings: 3 });
    });

    it('nishio never removes a solution candidate (300 states)', function () {
      H.assertSound(SG.test, 'nishio', { count: 300, minFirings: 3 });
    });

    it('forcingChain is sound on positions with many wrong candidates left (long chains)', function () {
      var m = model9;
      var states = prunedStates(m, SG.testkit.rng.create(31), 150, function (r) { return 0.05 + 0.4 * r.next(); });
      var stats = H.assertSound(SG.test, 'forcingChain', { model: m, states: states, minFirings: 100 });
      expect(stats.eliminations).toBeGreaterThan(150);
    });

    it('nishio is sound on positions with many wrong candidates left', function () {
      var states = prunedStates(model9, SG.testkit.rng.create(32), 80, function (r) {
        return 0.05 + 0.3 * r.next();
      });
      H.assertSound(SG.test, 'nishio', { model: model9, states: states, minFirings: 30 });
    });

    it('is sound on 4x4 and 6x6 puzzles', function () {
      CHAIN_IDS.forEach(function (id) {
        H.assertSound(SG.test, id, { model: model6, count: 120, seed: 61 });
        H.assertSound(SG.test, id, { model: model4, count: 60, seed: 41 });
      });
    });

    it('is sound on 6x6 grids with irregular (jigsaw-like) regions', function () {
      var rng = SG.testkit.rng.create(71);
      for (var k = 0; k < 4; k++) {
        var m = irregularModel(rng.fork('model.' + k), 'chain-irregular-' + k);
        CHAIN_IDS.forEach(function (id) {
          H.assertSound(SG.test, id, { model: m, count: 28, seed: 700 + k });
        });
      }
    });

    it('is sound on a model with a partial unit (a digit may be missing from it)', function () {
      var m = partialUnitModel();
      CHAIN_IDS.forEach(function (id) {
        H.assertSound(SG.test, id, { model: m, count: 120, seed: 81 });
        var states = prunedStates(m, SG.testkit.rng.create(82), 120, function (r) { return 0.1 + 0.5 * r.next(); });
        H.assertSound(SG.test, id, { model: m, states: states });
      });
    });

    it('is sound on 12x12 and on overlapping (Samurai) grids', function () {
      var big = [SG.fixtures.models.boxGrid('chain-box12', 3, 4), SG.fixtures.models.samurai()];
      big.forEach(function (m, k) {
        var states = prunedStates(m, SG.testkit.rng.create(90 + k), 4, function () { return 0.12; });
        CHAIN_IDS.forEach(function (id) {
          H.assertSound(SG.test, id, { model: m, states: states, maxSteps: 12 });
        });
      });
    });

    it('never removes a candidate of a solution when a position has several solutions', function () {
      // The oracle enumerates, so this holds for puzzles that are NOT unique, where "the" solution is no
      // reference. classic6 keeps the oracle cheap; the classic9 cases are sparse.
      var rng = SG.testkit.rng.create(101);
      var firings = { forcingChain: 0, nishio: 0 };
      for (var i = 0; i < 60; i++) {
        var r = rng.fork('multi.' + i);
        var solution = randomSolution(model6, r.fork('grid'));
        var state = prunedFromSolution(model6, solution, r.fork('state'), 0.1 * r.next(),
          0.25 + 0.4 * r.next());
        CHAIN_IDS.forEach(function (id) {
          firings[id] += runWithOracle(id, model6, state, 6, 'classic6 position #' + i);
        });
      }
      expect(firings.forcingChain).toBeGreaterThan(20);
      expect(firings.nishio).toBeGreaterThan(5);
      for (var j = 0; j < 8; j++) {
        var q = rng.fork('sparse.' + j);
        var grid = randomSolution(model9, q.fork('grid'));
        var givens = new Int32Array(81);
        for (var c = 0; c < 81; c++) if (q.next() < 0.3) givens[c] = grid[c];
        var sparse = H.makeState(model9, givens);
        CHAIN_IDS.forEach(function (id) {
          runWithOracle(id, model9, sparse, 3, 'sparse classic9 position #' + j);
        });
      }
    });
  });

  // Twin solution positions: every candidate is part of a solution, so nothing may be found
  describe('chain group: positions without any valid deduction', function () {
    // forcingChain gets no length limit. nishio stays at depth 1 in the bulk loops (a nested trial of a
    // position where nothing can be refuted costs the whole search space) and has its own depth 2 test.
    var OPTIONS = { forcingChain: { maxChainLength: Infinity }, nishio: { maxNishioDepth: 1 } };

    it('finds nothing when every candidate belongs to one of 2-4 solutions of a classic9 grid', function () {
      var rng = SG.testkit.rng.create(111);
      for (var i = 0; i < 80; i++) {
        var r = rng.fork('twin.' + i);
        var base = randomSolution(model9, r.fork('grid'));
        var solutions = [base];
        for (var k = 1; k < 2 + (i % 3); k++) solutions.push(symmetric9(base, r.fork('sym.' + k)));
        var state = twinState(model9, solutions);
        CHAIN_IDS.forEach(function (id) {
          var finding = run(id, model9, state, OPTIONS[id]);
          if (finding !== null) {
            fail(id + ' found something in twin position #' + i + ': ' + JSON.stringify(finding));
          }
        });
      }
    });

    it('nishio finds nothing at depth 2 either, where every guess is a solution', function () {
      var rng = SG.testkit.rng.create(113);
      for (var i = 0; i < 3; i++) {
        var base = randomSolution(model9, rng.fork('grid.' + i));
        var state = twinState(model9, [base, symmetric9(base, rng.fork('sym.' + i))]);
        expect(run('nishio', model9, state, { maxNishioDepth: 2 })).toBeNull();
      }
    });

    it('finds nothing in the digit-swapped twin of a grid: strong links on one big cycle', function () {
      var base = F.parse(fixture('wikipedia-example').solution);
      var perms = [[2, 3, 1, 5, 6, 4, 8, 9, 7], [2, 1, 4, 3, 6, 5, 8, 7, 9], [9, 1, 2, 3, 4, 5, 6, 7, 8]];
      perms.forEach(function (perm) {
        var state = twinState(model9, [base, relabel(base, perm)]);
        CHAIN_IDS.forEach(function (id) {
          expect(run(id, model9, state, OPTIONS[id])).toBeNull();
        });
      });
    });

    it('finds nothing on an even ring of pair units (two solutions, all links strong and weak)', function () {
      [4, 6, 10, 16, 30].forEach(function (n) {
        var m = ringModel(n);
        var state = SG.model.initState(m);
        expect(supportedMasks(m, state)).toEqual(Int32Array.from(new Array(n), function () { return 3; }));
        CHAIN_IDS.forEach(function (id) {
          expect(run(id, m, state, OPTIONS[id])).toBeNull();
        });
      });
    });

    it('finds nothing in twin positions of 4x4, 6x6, 12x12 and Samurai models', function () {
      var rng = SG.testkit.rng.create(112);
      var models = [model4, model6, SG.fixtures.models.boxGrid('chain-box12', 3, 4),
        SG.fixtures.models.samurai(), partialUnitModel()];
      models.forEach(function (m, k) {
        var r = rng.fork('model.' + k);
        var base = randomSolution(m, r.fork('grid'));
        for (var i = 0; i < (m.cellCount > 100 ? 2 : 10); i++) {
          var solutions = [base, relabel(base, randomPerm(r.fork('p.' + i), m.digits))];
          if (i % 2 === 1) solutions.push(relabel(base, randomPerm(r.fork('q.' + i), m.digits)));
          var state = twinState(m, solutions);
          CHAIN_IDS.forEach(function (id) {
            var finding = run(id, m, state, id === 'nishio' ? OPTIONS.nishio : { maxChainLength: 16 });
            if (finding !== null) fail(id + ' found something in a twin ' + m.variantId + ' position');
          });
        }
      });
    });

    it('finds nothing on an empty grid, on a solved grid and on the deadly rectangle', function () {
      var empty = H.makeState(model9, new Int32Array(81));
      var solved = H.makeState(model9, fixture('classic-easy').puzzle);
      var deadly = H.makeState(model9, F.multi.filter(function (x) {
        return x.name === 'deadly-rectangle';
      })[0].puzzle);
      expect(solved.unsolvedCount).toBe(0);
      expect(deadly.unsolvedCount).toBe(4);
      [empty, solved, deadly].forEach(function (state) {
        H.expectNoFinding(SG.test, 'forcingChain', state);
        // depth 1 only for the empty grid: its nested trials never end early and cost the whole space
        H.expectNoFinding(SG.test, 'nishio', state, { solver: { maxNishioDepth: state === empty ? 1 : 2 } });
      });
    });

    it('still finds the decoy candidates that no solution contains', function () {
      var base = F.parse(fixture('wikipedia-example').solution);
      var twin = relabel(base, [2, 3, 1, 5, 6, 4, 8, 9, 7]);
      var cases = [
        { decoy: [55, 7], chain: { kind: 'endpoints', length: 1 } },
        { decoy: [63, 7], chain: { kind: 'contradiction', length: 4 } },
        { decoy: [20, 1], chain: { kind: 'contradiction', length: 4 } }
      ];
      cases.forEach(function (tc) {
        var state = twinState(model9, [base, twin], [tc.decoy]);
        var support = supportedMasks(model9, state);
        expect((support[tc.decoy[0]] & bitOf(tc.decoy[1])) !== 0).toBe(false);
        H.expectFinding(SG.test, 'forcingChain', state,
          { eliminations: [tc.decoy], args: tc.chain }, { model: model9 });
        H.expectFinding(SG.test, 'nishio', state,
          { eliminations: [tc.decoy], args: { digit: tc.decoy[1], depth: 1 } }, { model: model9 });
        var found = run('forcingChain', model9, state);
        expect(chainProblems(model9, state, found)).toEqual([]);
      });
    });
  });

  describe('forcingChain: chain proofs', function () {
    it('every reported chain alternates strong and weak links and justifies its deduction', function () {
      var counts = { endpoints: 0, contradiction: 0, forced: 0 };
      var states = prunedStates(model9, SG.testkit.rng.create(121), 120, function (r) {
        return 0.03 + 0.4 * r.next();
      });
      var more = H.randomStatesWithKnownSolution(model9, SG.testkit.rng.create(122), 120);
      var typed = CHAIN_FIXTURES.map(function (fx) { return { state: fixtureState(fx) }; });
      states.concat(more, typed).forEach(function (item, i) {
        var state = SG.model.cloneState(item.state);
        for (var step = 0; step < 6 && state.unsolvedCount > 0; step++) {
          var finding = run('forcingChain', model9, state);
          if (finding === null) break;
          var problems = chainProblems(model9, state, finding);
          if (problems.length > 0) {
            fail('state #' + i + ', step ' + step + ': ' + problems.join('; ') + '\n  ' +
              JSON.stringify(finding));
          }
          counts[finding.i18nArgs.kind]++;
          applyFinding(model9, state, finding);
        }
      });
      expect(counts.endpoints).toBeGreaterThan(50);
      expect(counts.contradiction).toBeGreaterThan(10);
      expect(counts.forced).toBeGreaterThan(0);
    });

    it('the proof checker rejects a chain that does not alternate or has a bogus link', function () {
      var fx = CHAIN_FIXTURES[0];
      var state = fixtureState(fx);
      var finding = run('forcingChain', model9, state);
      expect(chainProblems(model9, state, finding)).toEqual([]);
      var copy = JSON.parse(JSON.stringify(finding));
      copy.i18nArgs.chains[0][1][2] = 0; // false after false
      expect(chainProblems(model9, state, copy).length).toBeGreaterThan(0);
      copy = JSON.parse(JSON.stringify(finding));
      copy.i18nArgs.chains[0][2] = [40, 2, 0]; // not weakly linked to the previous node
      expect(chainProblems(model9, state, copy).length).toBeGreaterThan(0);
      copy = JSON.parse(JSON.stringify(finding));
      copy.eliminations = [[1, 9]]; // not weakly linked to the ends
      expect(chainProblems(model9, state, copy).length).toBeGreaterThan(0);
    });
  });

  describe('forcingChain: fixtures', function () {
    CHAIN_FIXTURES.forEach(function (fx) {
      it('reports the ' + fx.name, function () {
        var state = fixtureState(fx);
        var expected = { cells: fx.cells, args: { kind: fx.kind, length: fx.length } };
        if (fx.eliminations) expected.eliminations = fx.eliminations;
        if (fx.placements) expected.placements = fx.placements;
        if (fx.chains) expected.args.chains = fx.chains;
        var finding = H.expectFinding(SG.test, 'forcingChain', state, expected);
        expect(finding.i18nKey).toBe('technique.forcingChain.step.' + fx.kind);
        expect(chainProblems(model9, state, finding)).toEqual([]);
      });
    });

    it('has fixtures for all three kinds of deduction', function () {
      ['endpoints', 'contradiction', 'forced'].forEach(function (kind) {
        expect(CHAIN_FIXTURES.filter(function (fx) { return fx.kind === kind; }).length).toBeGreaterThan(1);
      });
    });

    it('finds nothing on the stuck positions of the famous puzzles at a chain length of 12', function () {
      var stuck = ['escargot', 'worlds-hardest-2012', 'hard-platinum', 'hard-nugget'];
      stuck.forEach(function (name) {
        H.expectNoFinding(SG.test, 'forcingChain', H.makeState(model9, fixture(name).puzzle));
      });
    });

    it('finds a contradiction chain of 3 links on hard-b', function () {
      var state = H.makeState(model9, fixture('hard-b').puzzle);
      var finding = H.expectFinding(SG.test, 'forcingChain', state,
        { eliminations: [[29, 2]], args: { kind: 'contradiction', length: 3 } });
      expect(chainProblems(model9, state, finding)).toEqual([]);
    });
  });

  describe('forcingChain: maxChainLength', function () {
    var states;

    function positions() {
      if (!states) {
        states = prunedStates(model9, SG.testkit.rng.create(131), 70, function (r) { return 0.03 + 0.3 * r.next(); })
          .map(function (item) { return item.state; });
        CHAIN_FIXTURES.forEach(function (fx) { states.push(fixtureState(fx)); });
      }
      return states;
    }

    it('reports the shortest chain, and nothing at all below its length', function () {
      var longest = 0;
      positions().forEach(function (state, i) {
        var base = run('forcingChain', model9, state, { maxChainLength: 12 });
        for (var limit = 1; limit <= 12; limit++) {
          var got = run('forcingChain', model9, state, { maxChainLength: limit });
          if (base === null || limit < base.i18nArgs.length) {
            if (got !== null) {
              fail('state #' + i + ': a chain of ' + got.i18nArgs.length + ' links at limit ' + limit);
            }
          } else {
            if (got === null) {
              fail('state #' + i + ': nothing at limit ' + limit + ', but ' + base.i18nArgs.length);
            }
            expect(got.i18nArgs.length).toBe(base.i18nArgs.length);
            expect(got.i18nArgs.chains.every(function (p) { return p.length - 1 <= limit; })).toBe(true);
          }
        }
        if (base !== null) longest = Math.max(longest, base.i18nArgs.length);
      });
      expect(longest).toBeGreaterThan(4);
    });

    it('treats the fixtures as exact: one link less and the chain is out of reach', function () {
      CHAIN_FIXTURES.forEach(function (fx) {
        var state = fixtureState(fx);
        expect(run('forcingChain', model9, state, { maxChainLength: fx.length - 1 })).toBeNull();
        var at = run('forcingChain', model9, state, { maxChainLength: fx.length });
        expect(at.i18nArgs.length).toBe(fx.length);
      });
    });

    it('defaults to 12 links: a ring needing 12 is solved, one needing 13 only with more', function () {
      // On an odd ring of n pair units the shortest proof is a forced chain of (n + 1) / 2 links.
      var near = ringModel(23);
      var far = ringModel(25);
      var nearState = SG.model.initState(near);
      var farState = SG.model.initState(far);
      var byDefault = run('forcingChain', near, nearState);
      expect(byDefault.i18nArgs.kind).toBe('forced');
      expect(byDefault.i18nArgs.length).toBe(12);
      expect(chainProblems(near, nearState, byDefault)).toEqual([]);
      expect(run('forcingChain', near, nearState, { maxChainLength: 11 })).toBeNull();

      expect(run('forcingChain', far, farState)).toBeNull();
      expect(run('forcingChain', far, farState, { maxChainLength: 12 })).toBeNull();
      [13, 14, 100, Infinity].forEach(function (limit) {
        var found = run('forcingChain', far, farState, { maxChainLength: limit });
        expect(found.i18nArgs.length).toBe(13);
        expect(chainProblems(far, farState, found)).toEqual([]);
      });
    });

    it('treats the limit alike everywhere: default and 12 agree, unlimited never shortens', function () {
      positions().forEach(function (state) {
        var byDefault = run('forcingChain', model9, state);
        expect(byDefault).toEqual(run('forcingChain', model9, state, { maxChainLength: 12 }));
        var unlimited = run('forcingChain', model9, state, { maxChainLength: Infinity });
        if (byDefault !== null) expect(unlimited).toEqual(byDefault);
      });
    });

    it('ignores a nonsensical limit and switches off for a limit below one link', function () {
      var state = fixtureState(CHAIN_FIXTURES[0]);
      var normal = run('forcingChain', model9, state);
      ['12', NaN, null, undefined, {}].forEach(function (bad) {
        expect(run('forcingChain', model9, state, { maxChainLength: bad })).toEqual(normal);
      });
      [0, -3, 0.5, -Infinity].forEach(function (off) {
        expect(run('forcingChain', model9, state, { maxChainLength: off })).toBeNull();
      });
      expect(run('forcingChain', model9, state, { maxChainLength: 3.9 })).toEqual(normal);
    });

    it('does not apply to nishio', function () {
      var state = H.makeState(model9, fixture('escargot').puzzle);
      var normal = run('nishio', model9, state);
      expect(normal).toBeTruthy();
      expect(run('nishio', model9, state, { maxChainLength: 1 })).toEqual(normal);
    });
  });

  describe('forcingChain: cyclic link graphs', function () {
    function budgetedRun(m, state, options) {
      var budget = SG.budget.create({});
      var started = Date.now();
      var finding = run('forcingChain', m, state, Object.assign({ budget: budget }, options));
      return { finding: finding, ticks: budget.nodes, ms: Date.now() - started };
    }

    it('terminates with no length limit on a graph where every cell and unit is a strong link', function () {
      var base = F.parse(fixture('wikipedia-example').solution);
      var state = twinState(model9, [base, relabel(base, [2, 3, 1, 5, 6, 4, 8, 9, 7])]);
      [Infinity, 1e9, 1000].forEach(function (limit) {
        var out = budgetedRun(model9, state, { maxChainLength: limit });
        expect(out.finding).toBeNull();
        // one search per literal at most: 81 cells x 9 digits x 2 truth values
        expect(out.ticks).toBeLessThanOrEqual(2 * 81 * 9);
        expect(out.ms).toBeLessThan(3000);
      });
    });

    it('terminates on pure cycles of any length, finding a proof only where one exists', function () {
      [16, 30, 200].forEach(function (n) {
        var m = ringModel(n);
        var out = budgetedRun(m, SG.model.initState(m), { maxChainLength: Infinity });
        expect(out.finding).toBeNull();
        expect(out.ticks).toBeLessThanOrEqual(2 * n * 2);
      });
      var odd = ringModel(201);
      var state = SG.model.initState(odd);
      expect(run('forcingChain', odd, state, { maxChainLength: 12 })).toBeNull();
      var found = run('forcingChain', odd, state, { maxChainLength: Infinity });
      expect(found.i18nArgs.length).toBe(101);
      expect(chainProblems(odd, state, found)).toEqual([]);
    });

    it('terminates on twin positions of the other models too', function () {
      var rng = SG.testkit.rng.create(141);
      [model4, model6, SG.fixtures.models.boxGrid('chain-box12', 3, 4)].forEach(function (m, k) {
        var base = randomSolution(m, rng.fork('grid.' + k));
        var state = twinState(m, [base, relabel(base, randomPerm(rng.fork('perm.' + k), m.digits))]);
        var out = budgetedRun(m, state, { maxChainLength: Infinity });
        expect(out.finding).toBeNull();
        expect(out.ticks).toBeLessThanOrEqual(2 * m.cellCount * m.digits);
      });
    });

    it('terminates and stays sound on strongly linked positions with decoys and no limit', function () {
      var base = F.parse(fixture('wikipedia-example').solution);
      var twin = relabel(base, [2, 3, 1, 5, 6, 4, 8, 9, 7]);
      var rng = SG.testkit.rng.create(142);
      for (var i = 0; i < 20; i++) {
        var decoys = [];
        for (var k = 0; k < 1 + (i % 4); k++) decoys.push([rng.int(81), 1 + rng.int(9)]);
        var state = twinState(model9, [base, twin], decoys);
        var out = budgetedRun(model9, state, { maxChainLength: Infinity });
        if (out.finding !== null) {
          expect(chainProblems(model9, state, out.finding)).toEqual([]);
          expect(H.findingProblems(model9, state, out.finding, { technique: 'forcingChain' })).toEqual([]);
        }
      }
    });
  });

  describe('chain group: budget', function () {
    var decoyState = (function () {
      var base = F.parse(fixture('wikipedia-example').solution);
      return twinState(model9, [base, relabel(base, [2, 3, 1, 5, 6, 4, 8, 9, 7])], [[63, 7]]);
    })();
    var deepState = H.makeState(model9, fixture('hard-platinum').puzzle);

    it('returns null instead of throwing when the node budget runs out', function () {
      [['forcingChain', decoyState], ['nishio', decoyState], ['nishio', deepState]].forEach(function (tc) {
        expect(run(tc[0], model9, tc[1])).toBeTruthy();
        var budget = SG.budget.create({ nodes: 3 });
        var finding = 'not run';
        var err = caught(function () { finding = run(tc[0], model9, tc[1], { budget: budget }); });
        expect(err).toBeNull();
        expect(finding).toBeNull();
        expect(budget.nodes).toBeGreaterThan(3);
      });
    });

    it('returns null when the time budget runs out', function () {
      // the budget looks at the clock every 1024 ticks; this search needs about ten thousand
      expect(run('nishio', model9, deepState)).toBeTruthy();
      var clock = 0;
      var budget = SG.budget.create({ ms: 1, now: function () { clock += 1; return clock; } });
      var finding = 'not run';
      var err = caught(function () { finding = run('nishio', model9, deepState, { budget: budget }); });
      expect(err).toBeNull();
      expect(finding).toBeNull();
      expect(budget.nodes).toBeGreaterThan(1000);
    });

    it('does not swallow any other error: a cancelled budget still throws', function () {
      CHAIN_IDS.forEach(function (id) {
        var budget = SG.budget.create({});
        budget.cancel();
        var err = caught(function () { run(id, model9, decoyState, { budget: budget }); });
        expect(err).toBeTruthy();
        expect(err.code).toBe('budget.cancelled');
      });
    });

    it('gives the same answer with a generous budget as without one, and does tick it', function () {
      CHAIN_IDS.forEach(function (id) {
        var budget = SG.budget.create({ nodes: 1e7 });
        expect(run(id, model9, decoyState, { budget: budget })).toEqual(run(id, model9, decoyState));
        expect(budget.nodes).toBeGreaterThan(0);
      });
    });

    it('turns a spent budget into a budget.exceeded from the solver, never into a wrong answer', function () {
      var ids = lowerIds().concat(CHAIN_IDS);
      var givens = F.parse(fixture('hard-platinum').puzzle);
      var budget = SG.budget.create({ nodes: 40 });
      var err = caught(function () {
        SG.logicalSolver.solve(model9, givens, { allowedTechniques: ids, budget: budget });
      });
      expect(err).toBeTruthy();
      expect(err.code).toBe('budget.exceeded');
    });
  });

  describe('nishio', function () {
    it('eliminates the first candidate whose assumption contradicts (escargot, depth 1)', function () {
      var state = H.makeState(model9, fixture('escargot').puzzle);
      var finding = H.expectFinding(SG.test, 'nishio', state,
        { eliminations: [[59, 9]], cells: [59], args: { cell: 59, label: 'R7C6', digit: 9, depth: 1 } });
      expect(finding.i18nKey).toBe('technique.nishio.step');
      expect(finding.placements).toEqual([]);
    });

    it('needs a nested guess on the famous puzzles that a plain trial cannot crack', function () {
      var cases = [['worlds-hardest-2012', 21, 3], ['hard-platinum', 23, 8], ['hard-nugget', 27, 5],
        ['hard-c', 4, 5]];
      cases.forEach(function (tc) {
        var state = H.makeState(model9, fixture(tc[0]).puzzle);
        H.expectNoFinding(SG.test, 'nishio', state, { solver: { maxNishioDepth: 1 } });
        H.expectFinding(SG.test, 'nishio', state,
          { eliminations: [[tc[1], tc[2]]], args: { depth: 2 } });
      });
    });

    it('tries shallow guesses first: a depth 1 result is also the result at every larger depth', function () {
      var rng = SG.testkit.rng.create(151);
      var checked = 0;
      prunedStates(model9, rng, 60, function (r) { return 0.05 + 0.3 * r.next(); }).forEach(function (item) {
        var one = run('nishio', model9, item.state, { maxNishioDepth: 1 });
        if (one === null) return;
        checked++;
        expect(one.i18nArgs.depth).toBe(1);
        expect(run('nishio', model9, item.state, { maxNishioDepth: 2 })).toEqual(one);
        expect(run('nishio', model9, item.state)).toEqual(one);
      });
      expect(checked).toBeGreaterThan(10);
    });

    it('reads maxNishioDepth: default 2, off below 1, capped at 3, nonsense means the default', function () {
      var state = H.makeState(model9, fixture('hard-platinum').puzzle);
      var byDefault = run('nishio', model9, state);
      expect(byDefault.i18nArgs.depth).toBe(2);
      expect(run('nishio', model9, state, { maxNishioDepth: 2 })).toEqual(byDefault);
      ['2', NaN, null, undefined, {}].forEach(function (bad) {
        expect(run('nishio', model9, state, { maxNishioDepth: bad })).toEqual(byDefault);
      });
      [0, -1, 0.9, -Infinity].forEach(function (off) {
        expect(run('nishio', model9, state, { maxNishioDepth: off })).toBeNull();
      });
      expect(run('nishio', model9, state, { maxNishioDepth: 1 })).toBeNull();
      expect(run('nishio', model9, state, { maxNishioDepth: 1e9 })).toEqual(byDefault);
      expect(run('nishio', model9, state, { maxNishioDepth: Infinity })).toEqual(byDefault);
    });

    it('never nests more than 3 guesses (the budget shows the work on an uncrackable position)', function () {
      // On the even ring a trial settles the whole ring, so each level costs exactly one tick per candidate.
      var m = ringModel(6);
      var state = SG.model.initState(m);
      function ticks(depth) {
        var budget = SG.budget.create({});
        expect(run('nishio', m, state, { budget: budget, maxNishioDepth: depth })).toBeNull();
        return budget.nodes;
      }
      expect(ticks(1)).toBe(12);
      expect(ticks(2)).toBe(24);
      expect(ticks(3)).toBe(36);
      expect(ticks(4)).toBe(36);
      expect(ticks(1e9)).toBe(36);
      expect(ticks(Infinity)).toBe(36);
    });

    it('is sound at depth 1, 2 and 3 on the famous puzzles, at every step until they are done', function () {
      [1, 2, 3].forEach(function (depth) {
        EVIL.forEach(function (name) {
          var fx = fixture(name);
          var solution = F.parse(fx.solution);
          var state = H.makeState(model9, fx.puzzle);
          for (var step = 0; step < 90 && state.unsolvedCount > 0; step++) {
            var finding = run('nishio', model9, state, { maxNishioDepth: depth });
            if (finding === null) break;
            expect(H.findingProblems(model9, state, finding, { technique: 'nishio', solution: solution }))
              .toEqual([]);
            expect(applyFinding(model9, state, finding)).toBe(true);
          }
          if (depth >= 2) expect(state.unsolvedCount).toBe(0);
        });
      });
    });

    it('never writes to the state it is given', function () {
      EVIL.forEach(function (name) {
        var state = H.makeState(model9, fixture(name).puzzle);
        var before = SG.model.cloneState(state);
        run('nishio', model9, state);
        run('forcingChain', model9, state);
        expect(state.candidates).toEqual(before.candidates);
        expect(state.value).toEqual(before.value);
        expect(state.unsolvedCount).toBe(before.unsolvedCount);
      });
    });

    it('uses the registered propagation extensions inside its trials', function () {
      // A stand-in rule: a cell may never hold 5 (a contradiction as soon as a 5 is fixed there).
      var calls = 0;
      var cell = 0;
      var state = H.makeState(model9, new Int32Array(81));
      H.expectNoFinding(SG.test, 'nishio', state, { solver: { maxNishioDepth: 1 } });
      SG.constraints.registerExtension({
        id: 'chainTestNoFiveInCell',
        propagate: function (m, st) {
          calls++;
          return st.value[cell] !== 5;
        }
      });
      try {
        var finding = run('nishio', model9, state);
        expect(finding).toBeTruthy();
        expect(finding.eliminations).toEqual([[cell, 5]]);
        expect(finding.i18nArgs.depth).toBe(1);
        expect(calls).toBeGreaterThan(0);
        expect(state.value[cell]).toBe(0);
        expect(state.candidates[cell]).toBe(SG.bits.full(9));
      } finally {
        SG.constraints.unregisterExtension('chainTestNoFiveInCell');
      }
    });

    it('proves the odd ring contradictory at once and leaves the even ring alone', function () {
      [5, 23, 25].forEach(function (n) {
        var m = ringModel(n);
        var finding = run('nishio', m, SG.model.initState(m));
        expect(finding.eliminations).toEqual([[0, 1]]);
        expect(finding.i18nArgs.depth).toBe(1);
      });
      expect(run('nishio', ringModel(24), SG.model.initState(ringModel(24)))).toBeNull();
    });
  });

  // Acceptance: nightmare puzzles that the lower technique groups cannot finish
  describe('chain group: nightmare puzzles', function () {
    /** Applies forcingChain and nishio (and the singles they unlock) until neither finds anything. */
    function chainOnly(start, solution) {
      var state = SG.model.cloneState(start);
      var used = { forcingChain: 0, nishio: 0 };
      for (var step = 0; step < 200 && state.unsolvedCount > 0; step++) {
        var finding = null;
        for (var i = 0; i < CHAIN_IDS.length && finding === null; i++) {
          finding = run(CHAIN_IDS[i], model9, state);
        }
        if (finding === null) break;
        expect(H.findingProblems(model9, state, finding, { solution: solution })).toEqual([]);
        used[finding.technique]++;
        expect(applyFinding(model9, state, finding)).toBe(true);
      }
      return { state: state, used: used };
    }

    it('solves at least 3 puzzles the lower groups cannot finish, one sound step at a time', function () {
      var solvedCount = 0;
      EVIL.forEach(function (name) {
        var fx = fixture(name);
        var solution = F.parse(fx.solution);
        var stuck = H.stateAfter(model9, fx.puzzle, lowerIds());
        SG.constraints.propagate(model9, stuck);
        if (stuck.unsolvedCount === 0) return;
        var out = chainOnly(stuck, solution);
        expect(out.state.unsolvedCount).toBeLessThan(stuck.unsolvedCount);
        if (out.state.unsolvedCount === 0) {
          expect(out.state.value).toEqual(solution);
          solvedCount++;
        }
      });
      expect(solvedCount).toBeGreaterThanOrEqual(3);
    });

    it('lets the logical solver finish them, with a chain technique as the hardest one used', function () {
      var ladder = lowerIds().concat(CHAIN_IDS);
      var finished = 0;
      EVIL.forEach(function (name) {
        var fx = fixture(name);
        var lower = SG.logicalSolver.solve(model9, F.parse(fx.puzzle),
          { allowedTechniques: lowerIds(), collectSteps: false });
        if (lower.solved) return;
        var report = SG.logicalSolver.solve(model9, F.parse(fx.puzzle),
          { allowedTechniques: ladder, collectSteps: false });
        expect(report.status).toBe('solved');
        expect(report.state.value).toEqual(F.parse(fx.solution));
        expect(CHAIN_IDS.indexOf(report.hardestTechnique)).not.toBe(-1);
        finished++;
      });
      expect(finished).toBeGreaterThanOrEqual(3);
    });

    it('honours maxNishioDepth passed to the solver as an option', function () {
      var ladder = lowerIds().concat(CHAIN_IDS);
      var givens = F.parse(fixture('worlds-hardest-2012').puzzle);
      var shallow = SG.logicalSolver.solve(model9, givens,
        { allowedTechniques: ladder, collectSteps: false, maxNishioDepth: 1 });
      expect(shallow.solved).toBe(false);
      expect(shallow.status).toBe('stuck');
      var deep = SG.logicalSolver.solve(model9, givens, { allowedTechniques: ladder, collectSteps: true });
      expect(deep.solved).toBe(true);
      expect(deep.steps.some(function (s) { return s.technique === 'nishio' && s.i18nArgs.depth === 2; }))
        .toBe(true);
    });

    it('honours maxChainLength given to the solver: singles + chains solve what it allows', function () {
      var singles = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine'];
      var have = singles.every(function (id) { return SG.techniques.has(id); });
      if (!have) SG.test.skip('no singles registered');
      var cases = [
        { needs: 6, puzzle: '6.49...1..85.4...7.7.6.....79....53......3..1' +
          '.4.5....9...8.6..4.2.....8...7..4.5.' },
        { needs: 5, puzzle: '8...7.......6....157...2.969..7...4..5.......' +
          '.....8.376......7...29.34....3.4....' },
        { needs: 4, puzzle: '8...7.14..4....5.79......3..1.53.......9....5' +
          '..........32.1..8.5.7..2.......8.3..' }
      ];
      cases.forEach(function (tc) {
        for (var limit = 1; limit <= 12; limit++) {
          var report = SG.logicalSolver.solve(model9, H.parsePuzzle(model9, tc.puzzle), {
            allowedTechniques: singles.concat(['forcingChain']), collectSteps: true, maxChainLength: limit });
          expect(report.solved).toBe(limit >= tc.needs);
          report.steps.forEach(function (s) {
            if (s.technique === 'forcingChain') expect(s.i18nArgs.length).toBeLessThanOrEqual(limit);
          });
        }
      });
    });

    it('does not trip the solver\'s state-mutation guard (SG.DEBUG) while solving them', function () {
      var before = SG.DEBUG;
      SG.setDebug(true);
      try {
        EVIL.forEach(function (name) {
          var report = SG.logicalSolver.solve(model9, F.parse(fixture(name).puzzle),
            { allowedTechniques: lowerIds().concat(CHAIN_IDS), collectSteps: false });
          expect(report.status).toBe('solved');
        });
      } finally {
        SG.setDebug(before);
      }
    });

    it('also cracks random minimal puzzles that the lower groups leave unsolved', function () {
      var rng = SG.testkit.rng.create(161);
      var ladder = lowerIds().concat(CHAIN_IDS);
      var stuck = 0;
      for (var i = 0; i < 40; i++) {
        var r = rng.fork('minimal.' + i);
        var solution = randomSolution(model9, r.fork('grid'));
        var dug = SG.testkit.dig(model9, solution, r.fork('dig'), { symmetry: 'none', minClues: 0 });
        var lower = SG.logicalSolver.solve(model9, dug.givens,
          { allowedTechniques: lowerIds(), collectSteps: false });
        if (lower.solved) continue;
        stuck++;
        var full = SG.logicalSolver.solve(model9, dug.givens,
          { allowedTechniques: ladder, collectSteps: false });
        expect(full.solved).toBe(true);
        expect(full.state.value).toEqual(solution);
      }
      expect(stuck).toBeGreaterThan(0);
    });
  });
})();
