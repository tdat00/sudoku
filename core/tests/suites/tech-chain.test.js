// Chain techniques: Forcing Chain / X-Cycle (`forcingChain` 1..C links, `forcingChainLong` C + 1..12 links) and
// Nishio (`nishio` depth 1, `nishioDeep` depth 2 and 3): the windows of rating v3 over the shortest proof.
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
  var CHAIN_IDS = ['forcingChain', 'forcingChainLong', 'nishio', 'nishioDeep'];
  // The ids whose bulk loops may run on a position where nothing can be refuted: a second level of nishio costs
  // the whole search space there, so nishioDeep has its own small tests.
  var BULK_IDS = ['forcingChain', 'forcingChainLong', 'nishio'];
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

  /**
   * The accepted singleton finders that forcingChain and forcingChainLong were before MS13c (MS07b): the
   * unregistered seam's singleton search over the window of the id (forcingChain 1 to C links, no work limit;
   * forcingChainLong C + 1 to 12 links, 50000), narrowed by the caller's maxChainLength like the registered
   * ones. It is also what the fallback of forcingChain runs, so a test of "what the singleton search says"
   * reads it and not the grouped id.
   */
  function singleton(id, m, state, options) {
    var c = SG.chainSearch.SHORT_MAX;
    var short = id === 'forcingChain';
    var ceiling = short ? c : 12;
    var asked = options ? options.maxChainLength : undefined;
    var max = typeof asked === 'number' && !Number.isNaN(asked) ? Math.min(ceiling, Math.floor(asked)) : ceiling;
    return SG.chainSearch.forcing(m, state, ctxFor(m, options), { id: id, minLength: short ? 1 : c + 1,
      maxLength: max, workLimit: short ? null : 50000 });
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
    // A proof with groups (proofVersion 2, MS13c) is read by the independent checker of the grouped graph, with
    // canonical nodes; the triples of a singleton proof by the checker below, which shares nothing with it.
    if (finding.i18nArgs.proofVersion === 2) return SG.chainProofs.pathProblems(m, state, finding, { canonical: true });
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
      if (id === 'xyChain') problems = problems.concat(xyProblems(m, state, finding));
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

  /** Disjoint rings of pair units one after the other: proofs of different lengths in one position. */
  var ringUnions = {};
  function ringsModel(sizes) {
    var key = sizes.join('+');
    if (!ringUnions[key]) {
      var units = [];
      var cellRow = [];
      var cellCol = [];
      var base = 0;
      sizes.forEach(function (n) {
        for (var i = 0; i < n; i++) units.push([base + i, base + ((i + 1) % n)]);
        base += n;
      });
      for (var c = 0; c < base; c++) {
        cellRow.push(0);
        cellCol.push(c);
      }
      ringUnions[key] = SG.model.create({ variantId: 'chain-rings-' + key, digits: 2, units: units,
        layout: { rows: 1, cols: base, cellRow: cellRow, cellCol: cellCol } });
    }
    return ringUnions[key];
  }

  /**
   * A hub cell (cell 0) in a pair unit with each of `spokes` other cells: every expansion from a literal of the hub
   * has `spokes` + 1 edges, one more than a Samurai board could ever give. Two digits, so it has two solutions and
   * no proof at all.
   */
  var stars = {};
  function starModel(spokes) {
    if (!stars[spokes]) {
      var units = [];
      var cellRow = [];
      var cellCol = [];
      for (var i = 1; i <= spokes; i++) units.push([0, i]);
      for (var c = 0; c <= spokes; c++) {
        cellRow.push(0);
        cellCol.push(c);
      }
      stars[spokes] = SG.model.create({ variantId: 'chain-star-' + spokes, digits: 2, units: units,
        layout: { rows: 1, cols: spokes + 1, cellRow: cellRow, cellCol: cellCol } });
    }
    return stars[spokes];
  }

  /**
   * The same hub, but its last two spokes (cells `spokes` - 1 and `spokes`) also form a triangle with it: three
   * cells that must all differ over two digits. The first proof (a chain of 1 link, eliminating the last cell's
   * 1) is met at the 300th edge of the first expansion when there are 300 spokes, inside its second piece.
   */
  var hubs = {};
  function hubModel(spokes) {
    if (!hubs[spokes]) {
      var units = [];
      var cellRow = [];
      var cellCol = [];
      for (var i = 1; i <= spokes - 2; i++) units.push([0, i]);
      units.push([0, spokes - 1], [spokes - 1, spokes], [spokes, 0]);
      for (var c = 0; c <= spokes; c++) {
        cellRow.push(0);
        cellCol.push(c);
      }
      hubs[spokes] = SG.model.create({ variantId: 'chain-hub-' + spokes, digits: 2, units: units,
        layout: { rows: 1, cols: spokes + 1, cellRow: cellRow, cellCol: cellCol } });
    }
    return hubs[spokes];
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

  /**
   * Real minimal puzzles (one solution each) that the techniques below the chain group and forcingChain get stuck
   * on, and where the shortest chain has 7 or 8 links: dug by SG.testkit.dig from the seeded stream 161 (fork
   * 'minimal.<i>', the index in the comment), found by scanning 3000 of them in MS07b. The stuck position is
   * the one reached with C = 6 (`longStuckItem`): below C = 4 chains of 5 and 6 links are still left in it. Under
   * C = 4 and C = 6 alike its shortest chain is a forcingChainLong's. Since the WXYZ-Wing (MS10b) is registered
   * before the chains, three of the twelve (#379, #452 and #725) were solved or left no chain of up to 12 links
   * in their stuck position: they were replaced in place by #3329 (8 links, solved at exactly 8), #1036 and
   * #2475 (8 links). Since the grouped forcing ids (MS13c) the shortest chain is the shortest of the canonical
   * grouped graph, and the stuck position is that of the grouped forcingChain too: seven more (#29, #155, #1036,
   * #521, #530, #713 and #1003) are solved before they are stuck, leave no chain of 7 or 8 links or exceed the
   * grouped allowance, and are replaced in place by the lowest indices that qualify under the registered ladder
   * (`long-chain-scan-0000-12000.txt` of the MS13c evidence, 12000 indices): #589 (8 links), #68 (7 links, the
   * lowest that the solver solves at exactly 7, which position 2 needs), #1244, #1312, #1314, #1349 and #1375
   * (7 links); the five others (#24, #192, #3329, #2475 and #1024) are the same puzzles with the same lengths.
   */
  var LONG_CHAIN_PUZZLES = [
    '..7..1..6.8....1..5..6.78.3..65..7.......8..2.9..6....459........2...5......1..9.', // #24: 7 links
    '7...38..6..........532.4....94......1.......23...9.8.5....51.........3.7..29..56.', // #589: 8 links
    '.6.4....2..1..7..93..5...8...........52....971...2.84.23.....56..61.9............', // #68: 7 links
    '.754.3...9.....1.....5....7.8..6....6.3.78..1..........3.......5.48...6.1....7.53', // #192: 7 links
    '7...8..3.13....4...2....198............9..67...74.8..15....6...91..5..8..4..2....', // #3329: 8 links
    '7..9..34..98.....151.....6.1.....8.....7...54..54.2.......9.....2..56...6..82....', // #1244: 7 links
    '..1......7..4.......4231..5.......6.6..87.21...3.4..592.6...9......1.......5.9..6', // #1312: 7 links
    '.6..57....5.3....44.......7..1.3.....7...51.39.....8...83.9.......2...95..2...7..', // #1314: 7 links
    '....5.4.7.1..3...57..1..3.....5..8..9..2.8.....6.91.........96..31..7....2.....7.', // #1349: 7 links
    '..82....1.24.....7....5..3.4....5..37..48....186.9.......561..........1.2..7..6.9', // #2475: 8 links
    '3.4....7.2..76...1....3.2...5..2.....6.8.9...8....1..2..7......1..3...84.4..1.5..', // #1375: 7 links
    '..41..98.5..4.........9..7.....1...9..7..52..49...2..8...2.3.1.........261....5..' // #1024: 7 links
  ];

  /** The position where the solver, allowed only the ids of `ids`, is stuck, as a soundness state. */
  function stuckItem(text, ids) {
    var givens = H.parsePuzzle(model9, text);
    return { state: H.stateAfter(model9, text, ids), solution: SG.dfs.solve(model9, givens), givens: givens,
      kind: 'stuck' };
  }

  /** Runs `fn` with the short-chain cutoff C (`SG.chainSearch.SHORT_MAX`) set to `c`, and puts it back. */
  function withCutoff(c, fn) {
    var before = SG.chainSearch.SHORT_MAX;
    SG.chainSearch.SHORT_MAX = c;
    try {
      return fn();
    } finally {
      SG.chainSearch.SHORT_MAX = before;
    }
  }

  /** The stuck position of a puzzle of LONG_CHAIN_PUZZLES: every chain of up to 6 links is exhausted in it. */
  function longStuckItem(text, ids) {
    return withCutoff(6, function () { return stuckItem(text, ids); });
  }

  /** The ids tried before `id` in the registry: every other technique of the classic ladder below it. */
  function idsBefore(id) {
    var below = [];
    SG.techniques.list().forEach(function (t) {
      if (t.variantScope === null && SG.techniques.get(id).order > t.order) below.push(t.id);
    });
    return below;
  }

  describe('chain group: registration', function () {
    // R9 and R15 (difficulty v3): id, order, baseCost; the weights (1000, 1100, 1400, 1700, 2600) are those of the
    // Generator's technique-weights suite.
    var TABLE = [
      ['xyChain', 186, 82], ['forcingChain', 190, 90], ['forcingChainLong', 198, 118], ['nishio', 200, 140],
      ['nishioDeep', 202, 210]
    ];

    it('registers the five chain ids with the values of design.md 6.6 (R9, R15)', function () {
      TABLE.forEach(function (row) {
        var t = SG.techniques.get(row[0]);
        expect([row[0], t.group, t.order, t.baseCost, t.i18nKey]).toEqual([row[0], 'chain', row[1], row[2],
          'technique.' + row[0]]);
      });
      expect(SG.techniques.list().filter(function (t) { return t.group === 'chain'; }).map(function (t) {
        return t.id;
      })).toEqual(['xyChain', 'forcingChain', 'forcingChainLong', 'nishio', 'nishioDeep']);
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

    it('exposes the short window C, 4 to begin with (selected by MS07c), at SG.chainSearch.SHORT_MAX', function () {
      expect(SG.chainSearch.SHORT_MAX).toBe(4);
    });
  });

  describe('chain group: soundness (I7)', function () {
    it('forcingChain never removes a solution candidate (300 states)', function () {
      H.assertSound(SG.test, 'forcingChain', { count: 300, minFirings: 3 });
    });

    it('nishio never removes a solution candidate (300 states)', function () {
      H.assertSound(SG.test, 'nishio', { count: 300, minFirings: 3 });
    });

    it('forcingChainLong never removes a solution candidate on real positions where only a long chain is left',
      function () {
        var below = idsBefore('forcingChainLong');
        expect(below).toContain('forcingChain');
        var states = LONG_CHAIN_PUZZLES.map(function (text) { return longStuckItem(text, below); });
        var stats = H.assertSound(SG.test, 'forcingChainLong',
          { model: model9, states: states, minFirings: states.length });
        expect(stats.eliminations).toBeGreaterThanOrEqual(states.length);
      });

    it('nishioDeep never removes a solution candidate on the stuck positions of the famous puzzles',
      function () {
        var below = idsBefore('nishioDeep');
        expect(below).toContain('nishio');
        var states = EVIL.map(function (name) {
          var item = stuckItem(fixture(name).puzzle, below);
          expect(item.solution).toEqual(F.parse(fixture(name).solution));
          return item;
        });
        var stats = H.assertSound(SG.test, 'nishioDeep',
          { model: model9, states: states, minFirings: states.length });
        expect(stats.eliminations).toBeGreaterThanOrEqual(states.length);
      });

    it('forcingChain is sound on positions with many wrong candidates left (chains up to C links)', function () {
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
      var firings = { forcingChain: 0, forcingChainLong: 0, nishio: 0, nishioDeep: 0 };
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
    // The chain ids get no length limit. nishio stays at depth 1 in the bulk loops (a nested trial of a
    // position where nothing can be refuted costs the whole search space) and nishioDeep, whose window starts
    // at depth 2, has its own small tests.
    var OPTIONS = { forcingChain: { maxChainLength: Infinity }, forcingChainLong: { maxChainLength: Infinity },
      nishio: { maxNishioDepth: 1 } };

    it('finds nothing when every candidate belongs to one of 2-4 solutions of a classic9 grid', function () {
      var rng = SG.testkit.rng.create(111);
      for (var i = 0; i < 80; i++) {
        var r = rng.fork('twin.' + i);
        var base = randomSolution(model9, r.fork('grid'));
        var solutions = [base];
        for (var k = 1; k < 2 + (i % 3); k++) solutions.push(symmetric9(base, r.fork('sym.' + k)));
        var state = twinState(model9, solutions);
        BULK_IDS.forEach(function (id) {
          var finding = run(id, model9, state, OPTIONS[id]);
          if (finding !== null) {
            fail(id + ' found something in twin position #' + i + ': ' + JSON.stringify(finding));
          }
        });
      }
    });

    it('nishioDeep finds nothing at depth 2 and 3 either, where every guess is a solution', function () {
      var rng = SG.testkit.rng.create(113);
      for (var i = 0; i < 3; i++) {
        var base = randomSolution(model9, rng.fork('grid.' + i));
        var state = twinState(model9, [base, symmetric9(base, rng.fork('sym.' + i))]);
        expect(run('nishioDeep', model9, state, { maxNishioDepth: 2 })).toBeNull();
        if (i === 0) expect(run('nishioDeep', model9, state, { maxNishioDepth: 3 })).toBeNull();
      }
    });

    it('finds nothing in the digit-swapped twin of a grid: strong links on one big cycle', function () {
      var base = F.parse(fixture('wikipedia-example').solution);
      var perms = [[2, 3, 1, 5, 6, 4, 8, 9, 7], [2, 1, 4, 3, 6, 5, 8, 7, 9], [9, 1, 2, 3, 4, 5, 6, 7, 8]];
      perms.forEach(function (perm) {
        var state = twinState(model9, [base, relabel(base, perm)]);
        BULK_IDS.forEach(function (id) {
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
          BULK_IDS.forEach(function (id) {
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
        H.expectNoFinding(SG.test, 'forcingChainLong', state);
        H.expectNoFinding(SG.test, 'nishio', state);
        // not the empty grid: its nested trials never end early and cost the whole space
        if (state !== empty) H.expectNoFinding(SG.test, 'nishioDeep', state);
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
        // the shortest proof (a chain of at most 4 links, a guess of depth 1) is not theirs to take
        H.expectNoFinding(SG.test, 'forcingChainLong', state, { model: model9 });
        H.expectNoFinding(SG.test, 'nishioDeep', state, { model: model9 });
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
    // The window decides the id: a chain of up to C links is forcingChain's, a longer one forcingChainLong's.
    function ownerOf(fx) {
      return fx.length <= SG.chainSearch.SHORT_MAX ? 'forcingChain' : 'forcingChainLong';
    }

    // MS13c: the positions of CHAIN_FIXTURES on which a proof with groups is shorter than the typed-in singleton
    // proof, with the Finding of the registered owner of that shorter length (read from the recorded run of
    // `fixture-compare.js`, evidence MS13c): the typed-in proof is then the fallback's, not the registered ids'.
    var GROUP_PROOFS = {
      'contradiction chain of 6 links': { owner: 'forcingChain', expected: { eliminations: [[51, 7]],
        cells: [39, 42, 43, 51, 66, 69], args: { kind: 'contradiction', length: 3 } } }
    };

    CHAIN_FIXTURES.forEach(function (fx) {
      it('reports the ' + fx.name, function () {
        var state = fixtureState(fx);
        var id = ownerOf(fx);
        var expected = { cells: fx.cells, args: { kind: fx.kind, length: fx.length } };
        if (fx.eliminations) expected.eliminations = fx.eliminations;
        if (fx.placements) expected.placements = fx.placements;
        if (fx.chains) expected.args.chains = fx.chains;
        var grouped = GROUP_PROOFS[fx.name];
        if (grouped === undefined) {
          var finding = H.expectFinding(SG.test, id, state, expected);
          expect(finding.i18nKey).toBe('technique.' + id + '.step.' + fx.kind);
          expect(chainProblems(model9, state, finding)).toEqual([]);
          expect(run(id === 'forcingChain' ? 'forcingChainLong' : 'forcingChain', model9, state)).toBeNull();
        } else {
          // MS13c: the typed-in proof is still the singleton search's (the fallback's), exactly...
          var typed = singleton(id, model9, state);
          expect(typed.technique).toBe(id);
          expect(typed.i18nKey).toBe('technique.' + id + '.step.' + fx.kind);
          expect(typed.cells.slice().sort(function (a, b) { return a - b; }))
            .toEqual(fx.cells.slice().sort(function (a, b) { return a - b; }));
          expect([typed.i18nArgs.kind, typed.i18nArgs.length]).toEqual([fx.kind, fx.length]);
          expect(typed.eliminations).toEqual(fx.eliminations);
          expect(chainProblems(model9, state, typed)).toEqual([]);
          // ...but a proof with groups is shorter, so the registered owner of the typed-in length finds nothing
          // (that proof lies below its window) and the registered owner of the shorter one has another Finding
          expect(run(id, model9, state)).toBeNull();
          var found = H.expectFinding(SG.test, grouped.owner, state, grouped.expected);
          expect(found.i18nArgs.proofVersion).toBe(2);
          expect(chainProblems(model9, state, found)).toEqual([]);
        }
      });
    });

    it('has fixtures for all three kinds of deduction', function () {
      ['endpoints', 'contradiction', 'forced'].forEach(function (kind) {
        expect(CHAIN_FIXTURES.filter(function (fx) { return fx.kind === kind; }).length).toBeGreaterThan(1);
      });
    });

    it('finds nothing, in either chain window, on the stuck positions of the famous puzzles', function () {
      var stuck = ['escargot', 'worlds-hardest-2012', 'hard-platinum', 'hard-nugget'];
      stuck.forEach(function (name) {
        var state = H.makeState(model9, fixture(name).puzzle);
        // the accepted singleton search (the finders before MS13c, and the fallback of forcingChain): nothing
        expect([name, singleton('forcingChain', model9, state)]).toEqual([name, null]);
        expect([name, singleton('forcingChainLong', model9, state, { maxChainLength: 12 })]).toEqual([name, null]);
        // the grouped ids (MS13c): the same, but on escargot a proof with groups of 4 links exists
        expect([name, run('forcingChainLong', model9, state, { maxChainLength: 12 })]).toEqual([name, null]);
        var short = run('forcingChain', model9, state);
        if (name !== 'escargot') {
          expect([name, short]).toEqual([name, null]);
          return;
        }
        var solution = F.parse(fixture(name).solution);
        expect(short.i18nArgs.proofVersion).toBe(2);
        expect([short.i18nArgs.kind, short.i18nArgs.length, short.eliminations]).toEqual(['contradiction', 4,
          [[57, 9]]]);
        expect(chainProblems(model9, state, short)).toEqual([]);
        expect(H.findingProblems(model9, state, short, { technique: 'forcingChain', solution: solution }))
          .toEqual([]);
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

    it('reports the shortest chain up to C links, and nothing at all below its length', function () {
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
      expect(longest).toBe(SG.chainSearch.SHORT_MAX);
    });

    it('treats the fixtures as exact: one link less and the chain is out of reach', function () {
      CHAIN_FIXTURES.forEach(function (fx) {
        var state = fixtureState(fx);
        // forcingChain's own fixtures; a longer chain is forcingChainLong's, whose window starts at C + 1
        var id = fx.length <= SG.chainSearch.SHORT_MAX ? 'forcingChain' : 'forcingChainLong';
        // the accepted singleton search (MS13c: the fallback's), for every fixture
        expect(singleton(id, model9, state, { maxChainLength: fx.length - 1 })).toBeNull();
        expect(singleton(id, model9, state, { maxChainLength: fx.length }).i18nArgs.length).toBe(fx.length);
        // the registered id, wherever no shorter proof with groups exists (GROUP_PROOFS: the one fixture)
        if (fx.name === 'contradiction chain of 6 links') return;
        expect(run(id, model9, state, { maxChainLength: fx.length - 1 })).toBeNull();
        var at = run(id, model9, state, { maxChainLength: fx.length });
        expect(at.i18nArgs.length).toBe(fx.length);
      });
    });

    it('treats a limit above C alike: the default, 12 and no limit agree, and never lengthen a chain',
      function () {
        positions().forEach(function (state) {
          var byDefault = run('forcingChain', model9, state);
          expect(byDefault).toEqual(run('forcingChain', model9, state, { maxChainLength: 12 }));
          var unlimited = run('forcingChain', model9, state, { maxChainLength: Infinity });
          expect(unlimited).toEqual(byDefault);
          if (byDefault !== null) expect(byDefault.i18nArgs.length).toBeLessThanOrEqual(SG.chainSearch.SHORT_MAX);
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
        // the singleton search (the fallback): one search per literal at most, one root check each
        var budget = SG.budget.create({});
        var seam = SG.chainSearch.forcing(m, SG.model.initState(m), ctxFor(m, { budget: budget }),
          { id: 'x', minLength: 1, maxLength: Infinity, workLimit: null });
        expect(seam).toBeNull();
        expect(budget.nodes).toBeLessThanOrEqual(2 * n * 2);
        // the grouped id: the same bound for its own roots, the 256-unit cadence of its 50000 units, one more
        // search of the singleton graph after a local cap, and a few checks of set-up
        var out = budgetedRun(m, SG.model.initState(m), { maxChainLength: Infinity });
        expect(out.finding).toBeNull();
        expect(out.ticks).toBeLessThanOrEqual(2 * (2 * n * 2) + Math.ceil(50000 / 256) + 16);
      });
      var odd = ringModel(201);
      var state = SG.model.initState(odd);
      // the ids stop at their windows, whatever the caller asks for; the unregistered seam does not
      ['forcingChain', 'forcingChainLong'].forEach(function (id) {
        [{}, { maxChainLength: 12 }, { maxChainLength: Infinity }].forEach(function (options) {
          expect(run(id, odd, state, options)).toBeNull();
        });
      });
      var found = SG.chainSearch.forcing(odd, state, ctxFor(odd),
        { id: 'x', minLength: 1, maxLength: Infinity, workLimit: null });
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
    var near = ringModel(13); // the shortest proof of the ring of 13 pair units has 7 links: forcingChainLong's

    it('returns null instead of throwing when the node budget runs out', function () {
      [['forcingChain', model9, decoyState], ['nishio', model9, decoyState], ['nishioDeep', model9, deepState],
        ['forcingChainLong', near, SG.model.initState(near)]].forEach(function (tc) {
        expect(run(tc[0], tc[1], tc[2])).toBeTruthy();
        var budget = SG.budget.create({ nodes: 3 });
        var finding = 'not run';
        var err = caught(function () { finding = run(tc[0], tc[1], tc[2], { budget: budget }); });
        expect(err).toBeNull();
        expect(finding).toBeNull();
        expect(budget.nodes).toBeGreaterThan(3);
      });
    });

    it('returns null when the time budget runs out', function () {
      // the budget looks at the clock every 1024 ticks; this search needs about ten thousand
      expect(run('nishioDeep', model9, deepState)).toBeTruthy();
      var clock = 0;
      var budget = SG.budget.create({ ms: 1, now: function () { clock += 1; return clock; } });
      var finding = 'not run';
      var err = caught(function () { finding = run('nishioDeep', model9, deepState, { budget: budget }); });
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

    it('needs a nested guess on the famous puzzles that a plain trial cannot crack: nishioDeep owns them',
      function () {
        var cases = [['worlds-hardest-2012', 21, 3], ['hard-platinum', 23, 8], ['hard-nugget', 27, 5],
          ['hard-c', 4, 5]];
        cases.forEach(function (tc) {
          var state = H.makeState(model9, fixture(tc[0]).puzzle);
          H.expectNoFinding(SG.test, 'nishio', state);
          H.expectNoFinding(SG.test, 'nishioDeep', state, { solver: { maxNishioDepth: 1 } });
          var finding = H.expectFinding(SG.test, 'nishioDeep', state,
            { eliminations: [[tc[1], tc[2]]], args: { depth: 2 } });
          expect(finding.i18nKey).toBe('technique.nishioDeep.step');
          expect(finding.technique).toBe('nishioDeep');
        });
      });

    it('leaves a depth 1 result to nishio at every depth: nishioDeep never relabels it', function () {
      var rng = SG.testkit.rng.create(151);
      var checked = 0;
      prunedStates(model9, rng, 60, function (r) { return 0.05 + 0.3 * r.next(); }).forEach(function (item) {
        var one = run('nishio', model9, item.state, { maxNishioDepth: 1 });
        if (one === null) return;
        checked++;
        expect(one.i18nArgs.depth).toBe(1);
        expect(run('nishio', model9, item.state, { maxNishioDepth: 2 })).toEqual(one);
        expect(run('nishio', model9, item.state)).toEqual(one);
        expect(run('nishioDeep', model9, item.state)).toBeNull();
        expect(run('nishioDeep', model9, item.state, { maxNishioDepth: 3 })).toBeNull();
      });
      expect(checked).toBeGreaterThan(10);
    });

    it('reads maxNishioDepth for nishio: depth 1 whatever is asked, off below 1, nonsense is the default',
      function () {
        var escargot = H.makeState(model9, fixture('escargot').puzzle);
        var byDefault = run('nishio', model9, escargot);
        expect(byDefault.i18nArgs.depth).toBe(1);
        [1, 2, 3, 1e9, Infinity, 1.9].forEach(function (asked) {
          expect(run('nishio', model9, escargot, { maxNishioDepth: asked })).toEqual(byDefault);
        });
        ['2', NaN, null, undefined, {}].forEach(function (bad) {
          expect(run('nishio', model9, escargot, { maxNishioDepth: bad })).toEqual(byDefault);
        });
        [0, -1, 0.9, -Infinity].forEach(function (off) {
          expect(run('nishio', model9, escargot, { maxNishioDepth: off })).toBeNull();
        });
        // a position whose shortest refutation has depth 2 stays out of reach, whatever is asked
        var platinum = H.makeState(model9, fixture('hard-platinum').puzzle);
        [undefined, 1, 2, 3, Infinity].forEach(function (asked) {
          expect(run('nishio', model9, platinum, { maxNishioDepth: asked })).toBeNull();
        });
      });

    it('reads maxNishioDepth for nishioDeep: default 2, at most 3, never 1, off below 1, nonsense is the default',
      function () {
        var state = H.makeState(model9, fixture('hard-platinum').puzzle);
        var byDefault = run('nishioDeep', model9, state);
        expect(byDefault.i18nArgs.depth).toBe(2);
        [2, 3, 4, 1e9, Infinity, 2.9, 3.9].forEach(function (asked) {
          expect(run('nishioDeep', model9, state, { maxNishioDepth: asked })).toEqual(byDefault);
        });
        ['2', NaN, null, undefined, {}].forEach(function (bad) {
          expect(run('nishioDeep', model9, state, { maxNishioDepth: bad })).toEqual(byDefault);
        });
        // below its minimum of 2 the window is empty: the maximum is not raised to make the id fire
        [1, 1.9, 0, -1, 0.9, -Infinity].forEach(function (off) {
          expect(run('nishioDeep', model9, state, { maxNishioDepth: off })).toBeNull();
        });
      });

    it('stops at depth 1 for nishio and at depth 3 for nishioDeep (the work shows it on an uncrackable ring)',
      function () {
        // On the even ring a trial settles the whole ring, so each level costs exactly one unit per candidate.
        var m = ringModel(6);
        var state = SG.model.initState(m);
        function work(id, depth) {
          var records = [];
          var options = { onPatternWork: function (r) { records.push(r); } };
          if (depth !== undefined) options.maxNishioDepth = depth;
          expect(run(id, m, state, options)).toBeNull();
          expect(records.length).toBe(1);
          return records[0].work;
        }
        expect(work('nishio')).toBe(12);
        [0, 1, 2, 3, 4, 1e9, Infinity].forEach(function (depth) {
          expect([depth, work('nishio', depth)]).toEqual([depth, depth < 1 ? 0 : 12]);
        });
        expect(work('nishioDeep')).toBe(24);
        expect(work('nishioDeep', 2)).toBe(24);
        // only an explicit maximum reaches the ceiling 3, and nothing goes beyond it
        [3, 4, 1e9, Infinity].forEach(function (depth) {
          expect([depth, work('nishioDeep', depth)]).toEqual([depth, 36]);
        });
        [1, 0].forEach(function (depth) {
          expect([depth, work('nishioDeep', depth)]).toEqual([depth, 0]);
        });
      });

    it('is sound at depth 1, 2 and 3 on the famous puzzles, at every step until they are done', function () {
      [1, 2, 3].forEach(function (depth) {
        EVIL.forEach(function (name) {
          var fx = fixture(name);
          var solution = F.parse(fx.solution);
          var state = H.makeState(model9, fx.puzzle);
          for (var step = 0; step < 90 && state.unsolvedCount > 0; step++) {
            // nishio takes what is shallow; nishioDeep what needs the deeper window asked for
            var finding = run('nishio', model9, state, { maxNishioDepth: depth }) ||
              run('nishioDeep', model9, state, { maxNishioDepth: depth });
            if (finding === null) break;
            expect(depth >= 2 || finding.technique === 'nishio').toBe(true);
            expect(H.findingProblems(model9, state, finding, { technique: finding.technique,
              solution: solution })).toEqual([]);
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
        CHAIN_IDS.forEach(function (id) { run(id, model9, state); });
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
        // the refutation has depth 1: it is nishio's, not nishioDeep's
        expect(run('nishioDeep', m, SG.model.initState(m))).toBeNull();
      });
      expect(run('nishio', ringModel(24), SG.model.initState(ringModel(24)))).toBeNull();
      expect(run('nishioDeep', ringModel(24), SG.model.initState(ringModel(24)))).toBeNull();
    });
  });

  // The parameterised search seam (difficulty v3, MS07a): windows, minimum, work and the pattern-work report.
  // The registered ids are its wrappers (MS07b); the seam itself stays available for other ids and windows.
  describe('chain search seam: windows over the shortest proof', function () {
    var CS = SG.chainSearch;

    function forcing(m, state, opts, ctxOptions) {
      return CS.forcing(m, state, ctxFor(m, ctxOptions), opts);
    }

    function nishio(m, state, opts, ctxOptions) {
      return CS.nishio(m, state, ctxFor(m, ctxOptions), opts);
    }

    function between(id, min, max) {
      return { id: id, minLength: min, maxLength: max };
    }

    /** The longer of the chains of a Finding, in edges. */
    function longest(finding) {
      return Math.max.apply(null, finding.i18nArgs.chains.map(function (p) { return p.length - 1; }));
    }

    var states;
    function positions() {
      if (!states) {
        states = prunedStates(model9, SG.testkit.rng.create(171), 60,
          function (r) { return 0.03 + 0.3 * r.next(); }).map(function (item) { return item.state; });
        CHAIN_FIXTURES.forEach(function (fx) { states.push(fixtureState(fx)); });
      }
      return states;
    }

    it('adds no registered technique by itself: it serves ids of its own, registered or not', function () {
      var before = SG.techniques.list().map(function (t) { return t.id; });
      expect(typeof CS.forcing).toBe('function');
      expect(typeof CS.nishio).toBe('function');
      forcing(model9, fixtureState(CHAIN_FIXTURES[0]), between('probeChain', 5, 12));
      nishio(model9, H.makeState(model9, fixture('escargot').puzzle), { id: 'probeDeep', minDepth: 2 });
      expect(SG.techniques.list().map(function (t) { return t.id; })).toEqual(before);
      expect(SG.techniques.has('probeChain')).toBe(false);
      expect(SG.techniques.has('probeDeep')).toBe(false);
    });

    it('is what every registered finder asks for: its id, both bounds of its window and its work limit',
      function () {
        var c = SG.chainSearch.SHORT_MAX;
        var long = LONG_CHAIN_PUZZLES.map(function (text) {
          return longStuckItem(text, idsBefore('forcingChainLong')).state;
        });
        var chains = {
          forcingChain: { minLength: 1, maxLength: c, groupLimit: 4096, workLimit: 50000, fallback: true },
          forcingChainLong: { minLength: c + 1, maxLength: 12, groupLimit: 4096, workLimit: 50000,
            fallback: false }
        };
        Object.keys(chains).forEach(function (id) {
          positions().concat(long).forEach(function (state, i) {
            var seam = CS.groupedForcing(model9, state, ctxFor(model9), Object.assign({ id: id }, chains[id]));
            if (!same(seam, run(id, model9, state))) fail(id + ' differs from the seam on state #' + i);
          });
        });
        var depths = {
          nishio: { minDepth: 1, maxDepth: 1, workLimit: null },
          nishioDeep: { minDepth: 2, maxDepth: 2, workLimit: 50000 }
        };
        Object.keys(depths).forEach(function (id) {
          EVIL.forEach(function (name) {
            var state = H.makeState(model9, fixture(name).puzzle);
            expect(nishio(model9, state, Object.assign({ id: id }, depths[id]))).toEqual(run(id, model9, state));
          });
        });
      });

    it('takes the id for Finding.technique and the i18n key, and nothing else from it', function () {
      var state = fixtureState(CHAIN_FIXTURES[0]);
      var legacy = run('forcingChain', model9, state);
      var other = forcing(model9, state, between('forcingChainLong', 1, 12));
      expect(other.technique).toBe('forcingChainLong');
      expect(other.i18nKey).toBe('technique.forcingChainLong.step.endpoints');
      expect(H.findingProblems(model9, state, other, { technique: 'forcingChainLong' })).toEqual([]);
      other.technique = legacy.technique;
      other.i18nKey = legacy.i18nKey;
      expect(other).toEqual(legacy);

      var nState = H.makeState(model9, fixture('escargot').puzzle);
      var deep = nishio(model9, nState, { id: 'nishioDeep', minDepth: 1, maxDepth: 3 });
      expect(deep.technique).toBe('nishioDeep');
      expect(deep.i18nKey).toBe('technique.nishioDeep.step');
      expect(H.findingProblems(model9, nState, deep, { technique: 'nishioDeep' })).toEqual([]);
    });

    it('rejects a 3-edge minimum when 5 is requested, instead of searching from 5', function () {
      var state = fixtureState(CHAIN_FIXTURES[0]); // an X-chain of 3 links
      [[5, 12], [4, 12], [5, 5], [4, 6]].forEach(function (w) {
        expect(forcing(model9, state, between('x', w[0], w[1]))).toBeNull();
      });
      [[3, 3], [1, 3], [2, 12], [1, 12], [3, 5]].forEach(function (w) {
        var found = forcing(model9, state, between('x', w[0], w[1]));
        expect(found.i18nArgs.length).toBe(3);
        expect(found.eliminations).toEqual(CHAIN_FIXTURES[0].eliminations);
      });
      expect(forcing(model9, state, between('x', 1, 2))).toBeNull();
    });

    it('applies the inclusive window to a minimum of 7 edges: [5,12] finds it, a maximum of 6 does not',
      function () {
        var m = ringModel(13); // the odd ring of 13 pair units: the shortest proof has (13 + 1) / 2 edges
        var state = SG.model.initState(m);
        var base = forcing(m, state, between('x', 1, 12));
        expect(base.i18nArgs.kind).toBe('forced');
        expect(base.i18nArgs.length).toBe(7);
        expect(chainProblems(m, state, base)).toEqual([]);
        [[5, 12], [7, 12], [7, 7], [1, 7], [6, 8], [2, 100]].forEach(function (w) {
          expect(forcing(m, state, between('x', w[0], w[1]))).toEqual(base);
        });
        [[1, 6], [5, 6], [8, 12], [8, 9], [12, 12], [1, 1]].forEach(function (w) {
          expect(forcing(m, state, between('x', w[0], w[1]))).toBeNull();
        });
      });

    it('finds the minimum over the whole scan: a shorter proof on a later root beats an earlier longer one',
      function () {
        // The ring of 13 comes first (earlier roots, a 7-edge proof), then the ring of 5 (a 3-edge proof).
        var m = ringsModel([13, 5]);
        var state = SG.model.initState(m);
        var short = forcing(m, state, between('x', 1, 12));
        expect(short.i18nArgs.length).toBe(3);
        expect(short.cells.every(function (c) { return c >= 13; })).toBe(true);
        // A search that began at the minimum would rename the 7-edge proof of the first ring.
        [[4, 12], [5, 12], [7, 12], [7, 7], [4, 6]].forEach(function (w) {
          expect(forcing(m, state, between('x', w[0], w[1]))).toBeNull();
        });
        [[3, 3], [1, 6], [1, 12], [3, 12]].forEach(function (w) {
          expect(forcing(m, state, between('x', w[0], w[1]))).toEqual(short);
        });
        var alone = ringModel(13);
        expect(forcing(alone, SG.model.initState(alone), between('x', 5, 12)).i18nArgs.length).toBe(7);
      });

    it('keeps the tie order of the scan: the first root of the shortest length wins', function () {
      var m = ringModel(13);
      var state = SG.model.initState(m);
      var found = forcing(m, state, between('forcingChainLong', 7, 7));
      expect(found.i18nArgs.chains[0][0]).toEqual([0, 1, 0]); // the first literal of the scan
      expect(found).toEqual(forcing(m, state, between('forcingChainLong', 1, 12)));
      expect(found).toEqual(run('forcingChainLong', m, state));
      expect(run('forcingChain', m, state)).toBeNull(); // 7 links are beyond the short window
    });

    it('gives the registered answer in any window that holds the minimum and nothing outside it', function () {
      var found = 0;
      positions().forEach(function (state, i) {
        var base = forcing(model9, state, between('x', 1, 12));
        var at = 'state #' + i;
        if (base === null) {
          expect(forcing(model9, state, between('x', 3, 12))).toBeNull();
          expect(forcing(model9, state, between('x', 1, 5))).toBeNull();
          return;
        }
        found++;
        var length = base.i18nArgs.length;
        [[length, length], [length, 12], [1, length], [Math.max(1, length - 2), Math.min(12, length + 2)]]
          .forEach(function (w) {
            if (!same(forcing(model9, state, between('x', w[0], w[1])), base)) fail(at + ': window ' + w);
          });
        if (forcing(model9, state, between('x', length + 1, 12)) !== null) fail(at + ': minimum above');
        if (length > 1 && forcing(model9, state, between('x', 1, length - 1)) !== null) {
          fail(at + ': maximum below');
        }
      });
      expect(found).toBeGreaterThan(30);
    });

    it('permits chains of more than 12 edges, where the registered finder stops', function () {
      var far = ringModel(25); // 13 edges
      var farState = SG.model.initState(far);
      expect(forcing(far, farState, between('x', 1, 12))).toBeNull();
      expect(run('forcingChain', far, farState)).toBeNull();
      var found = forcing(far, farState, between('x', 13, 20));
      expect(found.i18nArgs.length).toBe(13);
      expect(chainProblems(far, farState, found)).toEqual([]);
      [[13, 13], [1, 20], [10, 13], [13, Infinity]].forEach(function (w) {
        expect(forcing(far, farState, between('x', w[0], w[1]))).toEqual(found);
      });
      expect(forcing(far, farState, between('x', 14, 20))).toBeNull();

      var odd = ringModel(201); // 101 edges, many roots: no work limit
      var oddState = SG.model.initState(odd);
      var long = forcing(odd, oddState, { id: 'x', minLength: 100, maxLength: 150, workLimit: null });
      expect(long.i18nArgs.length).toBe(101);
      expect(chainProblems(odd, oddState, long)).toEqual([]);
      expect(forcing(odd, oddState, { id: 'x', minLength: 102, maxLength: 150, workLimit: null })).toBeNull();
      expect(forcing(odd, oddState, { id: 'x', minLength: 1, maxLength: 100, workLimit: null })).toBeNull();
    });

    it('counts the edges of the longer of the two chains of a proof, not their sum', function () {
      var m = ringModel(13);
      var state = SG.model.initState(m);
      var found = forcing(m, state, between('x', 1, 12));
      var lengths = found.i18nArgs.chains.map(function (p) { return p.length - 1; }).sort();
      expect(lengths).toEqual([6, 7]);
      expect(found.i18nArgs.length).toBe(7);
      expect(forcing(m, state, between('x', 1, 6))).toBeNull();

      var contradiction = forcing(model9, fixtureState(CHAIN_FIXTURES[2]), between('x', 1, 12));
      expect(contradiction.i18nArgs.chains.map(function (p) { return p.length - 1; })).toEqual([3, 2]);
      expect(contradiction.i18nArgs.length).toBe(3);
    });

    it('the two chains of a proof differ by an odd number of edges, so one of them is the length', function () {
      // Every edge changes the polarity of the literal, and the proof ends in both polarities of one node.
      var seen = 0;
      positions().forEach(function (state, i) {
        var finding = forcing(model9, state, between('x', 1, 12));
        if (finding === null || finding.i18nArgs.chains.length < 2) return;
        seen++;
        var lengths = finding.i18nArgs.chains.map(function (p) { return p.length - 1; });
        if (Math.abs(lengths[0] - lengths[1]) % 2 !== 1) fail('state #' + i + ': ' + lengths);
        expect(finding.i18nArgs.length).toBe(Math.max(lengths[0], lengths[1]));
        expect(finding.i18nArgs.length).toBe(longest(finding));
      });
      expect(seen).toBeGreaterThan(5);
    });
  });

  describe('chain search seam: depth windows', function () {
    var CS = SG.chainSearch;

    function nishio(state, opts, ctxOptions) {
      return CS.nishio(model9, state, ctxFor(model9, ctxOptions), opts);
    }

    function depths(id, min, max) {
      return { id: id, minDepth: min, maxDepth: max };
    }

    it('rejects a depth 1 proof when the window is [2,2], and finds it in [1,1] and [1,2]', function () {
      var state = H.makeState(model9, fixture('escargot').puzzle);
      expect(nishio(state, depths('x', 2, 2))).toBeNull();
      expect(nishio(state, depths('x', 2, 3))).toBeNull();
      var shallow = nishio(state, depths('x', 1, 1));
      expect(shallow.i18nArgs.depth).toBe(1);
      expect(shallow.eliminations).toEqual([[59, 9]]);
      [[1, 2], [1, 3], [1, 1]].forEach(function (w) {
        expect(nishio(state, depths('x', w[0], w[1])).eliminations).toEqual([[59, 9]]);
      });
    });

    it('searches from depth 1 to establish the minimum, then applies the minimum of the window', function () {
      var state = H.makeState(model9, fixture('hard-platinum').puzzle); // needs a nested guess
      var deep = nishio(state, depths('x', 2, 2));
      expect(deep.i18nArgs.depth).toBe(2);
      var registered = run('nishioDeep', model9, state);
      expect(deep).toEqual(Object.assign({}, registered, { technique: 'x', i18nKey: 'technique.x.step' }));
      [[2, 3], [1, 2], [1, 3], [2, 100]].forEach(function (w) {
        expect(nishio(state, depths('x', w[0], w[1]))).toEqual(deep);
      });
      // the minimum is 2: neither a window ending at 1 nor one starting at 3 may claim it
      [[1, 1], [3, 3], [3, 4]].forEach(function (w) {
        expect(nishio(state, depths('x', w[0], w[1]))).toBeNull();
      });
    });

    it('gives the registered answer inside any window that holds the minimum depth, on the famous puzzles',
      function () {
        EVIL.forEach(function (name) {
          var state = H.makeState(model9, fixture(name).puzzle);
          var base = nishio(state, depths('x', 1, 3));
          if (base === null) return;
          var depth = base.i18nArgs.depth;
          [[depth, depth], [depth, 3], [1, depth]].forEach(function (w) {
            expect(nishio(state, depths('x', w[0], w[1]))).toEqual(base);
          });
          expect(nishio(state, depths('x', depth + 1, 3))).toBeNull();
          if (depth > 1) expect(nishio(state, depths('x', 1, depth - 1))).toBeNull();
        });
      });

    it('stops searching at the number of cells, which no nesting can exceed', function () {
      // The even ring has no refutation at any depth; an unlimited depth must still end.
      var m = ringModel(6);
      var state = SG.model.initState(m);
      var out = CS.nishio(m, state, ctxFor(m), { id: 'x', minDepth: 1, maxDepth: Infinity, workLimit: null });
      expect(out).toBeNull();
    });
  });

  describe('chain search seam: work limit and pattern-work report', function () {
    var CS = SG.chainSearch;
    var UNBOUNDED = { id: 'x', minLength: 1, maxLength: 12, workLimit: null };

    /** Runs a seam function and returns the finding with every record the observer got. */
    function observed(kind, m, state, opts, ctxOptions) {
      var records = [];
      var options = Object.assign({ onPatternWork: function (r) { records.push(r); } }, ctxOptions);
      var finding = CS[kind](m, state, ctxFor(m, options), opts);
      return { finding: finding, records: records, record: records[0] };
    }

    // The ring of 13 (a 7-edge proof), and the ring of 13 followed by a ring of 5 (a 3-edge proof, later).
    var near = ringModel(13);
    var nearState = SG.model.initState(near);
    var union = ringsModel([13, 5]);
    var unionState = SG.model.initState(union);
    var deepState = H.makeState(model9, fixture('hard-platinum').puzzle);
    var escargotState = H.makeState(model9, fixture('escargot').puzzle);

    it('reports a fresh record per call, with no limit and no cap for the registered finders', function () {
      var records = [];
      var finding = run('forcingChain', model9, fixtureState(CHAIN_FIXTURES[0]),
        { onPatternWork: function (r) { records.push(r); } });
      expect(finding).toBeTruthy();
      expect(records.length).toBe(1);
      expect(records[0].id).toBe('forcingChain');
      expect(records[0].work).toBeGreaterThan(0);
      expect(records[0].limit).toBeNull();
      expect(records[0].capHit).toBeNull();
      expect(records[0].retained).toBeNull();
      // MS13c: forcingChain's record names the stages of its grouped attempt and its fallback besides the five
      expect(Object.keys(records[0]).sort()).toEqual(['capHit', 'domain', 'fallback', 'grouped', 'id', 'limit',
        'retained', 'work']);

      records[0].work = -1; // a copy: the next call is not affected
      run('forcingChain', model9, fixtureState(CHAIN_FIXTURES[0]),
        { onPatternWork: function (r) { records.push(r); } });
      expect(records.length).toBe(2);
      expect(records[1]).not.toBe(records[0]);
      expect(records[1].work).toBeGreaterThan(0);

      var nishioRecords = [];
      run('nishio', model9, H.makeState(model9, fixture('escargot').puzzle),
        { onPatternWork: function (r) { nishioRecords.push(r); } });
      expect(nishioRecords.length).toBe(1);
      expect(nishioRecords[0].id).toBe('nishio');
      expect(nishioRecords[0].work).toBeGreaterThan(0);
      expect(nishioRecords[0].limit).toBeNull();
      expect(nishioRecords[0].capHit).toBeNull();
    });

    it('observes and never selects: the result is the same with, without and with a hostile observer',
      function () {
        var state = fixtureState(CHAIN_FIXTURES[2]);
        var plain = CS.forcing(near, nearState, ctxFor(near), UNBOUNDED);
        expect(plain.i18nArgs.length).toBe(7);
        var calls = 0;
        var hostile = CS.forcing(near, nearState, ctxFor(near, { onPatternWork: function (r) {
          calls++;
          r.work = 0;
          r.capHit = 'work';
          return 'ignored';
        } }), UNBOUNDED);
        expect(calls).toBe(1);
        expect(hostile).toEqual(plain);
        expect(run('forcingChain', model9, state, { onPatternWork: 'not a function' }))
          .toEqual(run('forcingChain', model9, state));
      });

    it('counts one unit per edge expansion, deterministically', function () {
      var a = observed('forcing', near, nearState, UNBOUNDED);
      var b = observed('forcing', near, nearState, UNBOUNDED);
      expect(a.record).toEqual(b.record);
      expect(a.record.work).toBeGreaterThan(100);
      expect(a.record.limit).toBeNull();
      expect(a.record.capHit).toBeNull();
      // the same position, a narrower range: the scan ends sooner
      expect(observed('forcing', near, nearState, { id: 'x', minLength: 1, maxLength: 6, workLimit: null })
        .record.work).toBeLessThan(a.record.work);
    });

    it('defaults to 50000 units, accepts a limit or null, and reports it', function () {
      expect(observed('forcing', near, nearState, { id: 'x' }).record.limit).toBe(50000);
      expect(observed('forcing', near, nearState, { id: 'x', workLimit: 7000.9 }).record.limit).toBe(7000);
      expect(observed('forcing', near, nearState, { id: 'x', workLimit: null }).record.limit).toBeNull();
      expect(observed('forcing', near, nearState, { id: 'x', workLimit: Infinity }).record.limit).toBeNull();
      expect(observed('nishio', model9, escargotState, { id: 'x' }).record.limit).toBe(50000);
      expect(observed('nishio', model9, escargotState, { id: 'x', workLimit: 99 }).record.limit).toBe(99);
      expect(observed('nishio', model9, escargotState, { id: 'x', workLimit: null }).record.limit).toBeNull();
    });

    it('returns null with capHit "work" once the limit is spent, never the best proof so far', function () {
      var full = observed('forcing', union, unionState, UNBOUNDED);
      expect(full.finding.i18nArgs.length).toBe(3);
      var total = full.record.work;
      // exactly the work of the first ring: its 7-edge proof is in hand, the 3-edge one is not yet found
      var ring = observed('forcing', near, nearState, UNBOUNDED).record.work;
      [0, 1, ring, total - 1].forEach(function (limit) {
        var out = observed('forcing', union, unionState,
          { id: 'x', minLength: 1, maxLength: 12, workLimit: limit });
        expect(out.finding).toBeNull();
        expect(out.record.work).toBe(limit);
        expect(out.record.limit).toBe(limit);
        expect(out.record.capHit).toBe('work');
      });
      var exact = observed('forcing', union, unionState,
        { id: 'x', minLength: 1, maxLength: 12, workLimit: total });
      expect(exact.finding).toEqual(full.finding);
      expect(exact.record.capHit).toBeNull();
      expect(exact.record.work).toBe(total);
    });

    it('rejects a proof below the minimum as soon as it is found, with less work than a full scan', function () {
      var full = observed('forcing', union, unionState, UNBOUNDED);
      var rejected = observed('forcing', union, unionState,
        { id: 'x', minLength: 5, maxLength: 12, workLimit: null });
      expect(rejected.finding).toBeNull();
      expect(rejected.record.capHit).toBeNull();
      expect(rejected.record.work).toBeLessThan(full.record.work);
    });

    it('spends a nishio unit per trial and returns null at the limit, as the forcing search does', function () {
      var shallow = { id: 'x', minDepth: 1, maxDepth: 2 };
      var full = observed('nishio', model9, deepState, Object.assign({ workLimit: null }, shallow));
      expect(full.finding.i18nArgs.depth).toBe(2);
      var total = full.record.work;
      expect(total).toBeGreaterThan(1000);
      [0, 1, 100, total - 1].forEach(function (limit) {
        var out = observed('nishio', model9, deepState, Object.assign({ workLimit: limit }, shallow));
        expect(out.finding).toBeNull();
        expect(out.record.work).toBe(limit);
        expect(out.record.capHit).toBe('work');
      });
      var exact = observed('nishio', model9, deepState, Object.assign({ workLimit: total }, shallow));
      expect(exact.finding).toEqual(full.finding);
      expect(exact.record.capHit).toBeNull();
      expect(exact.record.work).toBe(total);
    });

    it('reports a spent budget as nothing found, without a cap, and lets cancellation through', function () {
      [['forcing', union, unionState, { id: 'x', minLength: 1, maxLength: 12 }],
        ['nishio', model9, deepState, { id: 'x', minDepth: 1, maxDepth: 2 }]].forEach(function (tc) {
        var parent = SG.budget.create({ nodes: 3 });
        var spent = observed(tc[0], tc[1], tc[2], tc[3], { budget: parent });
        expect(spent.finding).toBeNull();
        expect(spent.records.length).toBe(1);
        expect(spent.record.capHit).toBeNull();
        expect(spent.record.limit).toBe(50000);
        // capHit null is no proof of a complete scan: the caller's own budget still fails after the call
        expect(caught(function () { parent.check(); }).code).toBe('budget.exceeded');

        var budget = SG.budget.create({});
        budget.cancel();
        var records = [];
        var err = caught(function () {
          CS[tc[0]](tc[1], tc[2], ctxFor(tc[1], { budget: budget,
            onPatternWork: function (r) { records.push(r); } }), tc[3]);
        });
        expect(err).toBeTruthy();
        expect(err.code).toBe('budget.cancelled');
        expect(records).toEqual([]);
        err = caught(function () {
          var unbounded = Object.assign({ workLimit: null }, tc[3]);
          CS[tc[0]](tc[1], tc[2], ctxFor(tc[1], { budget: budget }), unbounded);
        });
        expect(err.code).toBe('budget.cancelled');
      });
    });

    /**
     * The work counted at each parent-budget check of a seam call: a context whose k-th check throws a spent
     * budget lets the pattern-work record of the swallowed call tell the work done at that check, so nothing is
     * instrumented in production. `works` lists the checks in order; `gaps` the work between two of them (from
     * the start of the call to the first one, to the end of the call from the last one).
     */
    function checkWorks(kind, m, state, opts) {
      var base = ctxFor(m);
      function attempt(target) {
        var k = 0;
        var record = null;
        var ctx = Object.assign({}, base, {
          options: { onPatternWork: function (r) { record = r; } },
          check: function () {
            k++;
            if (k === target) throw new SG.errors.GenerationError('budget.exceeded', { reason: 'nodes' });
          }
        });
        var finding = CS[kind](m, state, ctx, opts);
        return { checks: k, record: record, finding: finding };
      }
      var free = attempt(0);
      var works = [];
      for (var target = 1; target <= free.checks; target++) {
        var spent = attempt(target);
        expect(spent.finding).toBeNull();
        expect(spent.record.capHit).toBeNull();
        works.push(spent.record.work);
      }
      var gaps = works.map(function (w, i) { return w - (i === 0 ? 0 : works[i - 1]); });
      gaps.push(free.record.work - (works.length === 0 ? 0 : works[works.length - 1]));
      return { works: works, gaps: gaps, max: Math.max.apply(null, gaps), record: free.record,
        finding: free.finding };
    }

    it('checks the parent budget at entry, and not at all on the unbounded path, of a solved position',
      function () {
        function counting(m) {
          var ctx = Object.assign({}, ctxFor(m), { check: function () { ctx.checks++; } });
          ctx.checks = 0;
          return ctx;
        }
        var solved = H.makeState(model9, F.unique[0].solution, { propagate: false });
        var ctx = counting(model9);
        expect(CS.forcing(model9, solved, ctx, { id: 'x' })).toBeNull();
        expect(ctx.checks).toBe(1); // the entry check; the registered finders of the old ids (no limit) have none
        ctx = counting(model9);
        expect(CS.forcing(model9, solved, ctx, { id: 'x', workLimit: null })).toBeNull();
        expect(ctx.checks).toBe(0);
        ctx = counting(model9);
        expect(CS.nishio(model9, solved, ctx, { id: 'x' })).toBeNull();
        expect(ctx.checks).toBe(1);
        ctx = counting(model9);
        expect(CS.nishio(model9, solved, ctx, { id: 'x', workLimit: null })).toBeNull();
        expect(ctx.checks).toBe(0);
        // the two ids with a limit check at entry, the two without do not, as before; the two grouped ids (MS13c)
        // check as the builder does: its entry, after its set-up and once per 256 uncharged scan steps, then the
        // entry of the minimum search (the registered forcingChain no longer has the unbounded path's 0)
        var grouped = 3 + Math.floor(CP.expectedTicks(model9) / 256);
        [['forcingChain', grouped], ['forcingChainLong', grouped], ['nishio', 0], ['nishioDeep', 1]]
          .forEach(function (row) {
            var own = counting(model9);
            SG.techniques.get(row[0]).find(model9, solved, own);
            expect([row[0], own.checks]).toEqual([row[0], row[1]]);
          });
      });

    it('lets no more than 256 work units pass between two checks, uneven expansions and tail included',
      function () {
        // Hubs of 100, 250 and 300 spokes: expansions of 1 or 2 edges next to ones of 101, 251 and 301. The
        // modulo gate of MS07a let up to 255 plus the size of the crossing expansion pass (330, 293, 553 here).
        [40, 100, 250, 300].forEach(function (spokes) {
          var m = starModel(spokes);
          var seen = checkWorks('forcing', m, SG.model.initState(m),
            { id: 'x', minLength: 1, maxLength: Infinity, workLimit: 3000 });
          var where = 'star of ' + spokes + ' spokes';
          expect([where, seen.record.work, seen.record.capHit]).toEqual([where, 3000, 'work']);
          expect([where, seen.works[0], seen.works[1]]).toEqual([where, 0, 0]); // the entry, the first root
          expect([where, seen.max <= 256]).toEqual([where, true]);
          // the gate takes the whole gap: it is not a check at every 128 units
          if (spokes >= 100) expect([where, seen.max]).toEqual([where, 256]);
          seen.gaps.forEach(function (gap) { expect(gap).toBeLessThan(257); });
        });
      });

    it('checks at an exact boundary of 256 when the next edge would pass it, and not before', function () {
      // A ring of 201 pair units: one long search of 600 units, expansions of 2 edges. The gate checks when
      // 255 units have passed (255 + 2 would pass 256), the root check before it is at 0.
      var long = ringModel(201);
      var seen = checkWorks('forcing', long, SG.model.initState(long),
        { id: 'x', minLength: 1, maxLength: Infinity, workLimit: 600 });
      expect(seen.works).toEqual([0, 0, 255, 510]);
      expect(seen.gaps).toEqual([0, 0, 255, 255, 90]);
    });

    it('splits an expansion of more than 256 edges into pieces, each behind the gate', function () {
      var m = starModel(300); // the hub literal has 301 edges
      var seen = checkWorks('forcing', m, SG.model.initState(m),
        { id: 'x', minLength: 1, maxLength: Infinity, workLimit: 3000 });
      // entry, first root, then a piece of 256 edges, the 45 that are left of it and 256 more
      expect(seen.works.slice(0, 5)).toEqual([0, 0, 256, 301, 557]);
      expect(seen.max).toBe(256);
      // the same positions with every work limit around a piece: each edge counted once, the cut at the limit
      [255, 256, 257, 300, 301, 302].forEach(function (limit) {
        var out = observed('forcing', m, SG.model.initState(m),
          { id: 'x', minLength: 1, maxLength: Infinity, workLimit: limit });
        expect([limit, out.finding, out.record.work, out.record.capHit]).toEqual([limit, null, limit, 'work']);
      });
    });

    it('counts a Finding in the middle of a piece, a cut and a spent budget exactly, edge by edge', function () {
      // 300 spokes: the proof is the 300th edge of the first expansion, in its second piece
      var m = hubModel(300);
      var state = SG.model.initState(m);
      var bounded = observed('forcing', m, state, { id: 'x', minLength: 1, maxLength: 12 });
      var unbounded = observed('forcing', m, state, { id: 'x', minLength: 1, maxLength: 12, workLimit: null });
      expect(bounded.finding).toEqual(unbounded.finding);
      expect(bounded.finding.i18nArgs.length).toBe(1);
      expect(bounded.finding.eliminations).toEqual([[300, 1]]);
      expect([bounded.record.work, unbounded.record.work]).toEqual([300, 300]);
      expect(bounded.record.capHit).toBeNull();
      var seen = checkWorks('forcing', m, state, { id: 'x', minLength: 1, maxLength: 12 });
      expect(seen.works).toEqual([0, 0, 256]); // entry, root, the gate before the second piece
      expect(seen.gaps).toEqual([0, 0, 256, 44]);
      // the limit: 300 reaches the proof, 299 stops one edge before it, 256 at the end of the first piece
      [[300, true], [301, true], [299, false], [256, false], [255, false]].forEach(function (row) {
        var out = observed('forcing', m, state, { id: 'x', minLength: 1, maxLength: 12, workLimit: row[0] });
        expect([row[0], out.finding !== null, out.record.work, out.record.capHit]).toEqual(row[1]
          ? [row[0], true, 300, null] : [row[0], false, row[0], 'work']);
      });
      // a budget that runs out at the gate before the second piece: the 256 edges of the first are counted
      var spent = observed('forcing', m, state, { id: 'x', minLength: 1, maxLength: 12 },
        { budget: SG.budget.create({ nodes: 2 }) });
      expect(spent.finding).toBeNull();
      expect([spent.record.work, spent.record.capHit]).toEqual([256, null]);
    });

    it('keeps the legacy cadence on the unbounded path: a check at each root, none in between', function () {
      // 300 spokes: the first root search (301 edges, the proof at the 300th) is the whole call
      var m = hubModel(300);
      var state = SG.model.initState(m);
      var window = { id: 'x', minLength: 1, maxLength: 12 };
      var bounded = checkWorks('forcing', m, state, Object.assign({}, window));
      var unbounded = checkWorks('forcing', m, state, Object.assign({ workLimit: null }, window));
      expect(unbounded.finding).toEqual(bounded.finding);
      expect(unbounded.record.work).toBe(300);
      expect(unbounded.works).toEqual([0]); // the root check only: no entry check, no periodic check
      expect(unbounded.gaps).toEqual([0, 300]);
      expect(unbounded.max).toBeGreaterThan(256); // a whole root search passes without a check
      expect(bounded.works).toEqual([0, 0, 256]); // entry, root and the gate before the second piece
      expect(bounded.max).toBeLessThan(257);
    });

    it('checks every nishio trial, bounded or not, and the bounded call once more at entry', function () {
      var m = ringModel(6);
      var state = SG.model.initState(m);
      var unbounded = checkWorks('nishio', m, state, { id: 'x', minDepth: 1, maxDepth: 2, workLimit: null });
      var bounded = checkWorks('nishio', m, state, { id: 'x', minDepth: 1, maxDepth: 2 });
      var trials = [];
      for (var i = 0; i < 24; i++) trials.push(i);
      expect(unbounded.works).toEqual(trials);
      expect(bounded.works).toEqual([0].concat(trials));
      expect(bounded.max).toBe(1);
    });

    it('never writes to the state, whatever the window, the limit or the outcome', function () {
      var cases = [
        [model9, fixtureState(CHAIN_FIXTURES[0]), { id: 'x', minLength: 5, maxLength: 12 }],
        [model9, fixtureState(CHAIN_FIXTURES[2]), { id: 'x', workLimit: 5 }],
        [union, unionState, { id: 'x', minLength: 1, maxLength: 12 }],
        [near, nearState, { id: 'x', minLength: 8, maxLength: 12 }]
      ];
      cases.forEach(function (tc) {
        var before = SG.model.cloneState(tc[1]);
        CS.forcing(tc[0], tc[1], ctxFor(tc[0]), tc[2]);
        expect(tc[1].candidates).toEqual(before.candidates);
        expect(tc[1].value).toEqual(before.value);
        expect(tc[1].unsolvedCount).toBe(before.unsolvedCount);
      });
      EVIL.forEach(function (name) {
        var state = H.makeState(model9, fixture(name).puzzle);
        var before = SG.model.cloneState(state);
        [{ id: 'x', minDepth: 2, maxDepth: 3 }, { id: 'x', minDepth: 1, maxDepth: 2, workLimit: 40 }]
          .forEach(function (opts) {
            CS.nishio(model9, state, ctxFor(model9), opts);
            expect(state.candidates).toEqual(before.candidates);
            expect(state.value).toEqual(before.value);
            expect(state.unsolvedCount).toBe(before.unsolvedCount);
          });
      });
    });

    it('refuses options it cannot read instead of guessing', function () {
      var state = fixtureState(CHAIN_FIXTURES[0]);
      var common = [undefined, null, 'x', {}, { id: '' }, { id: '1x' }, { id: 'a b' }, { id: 7 },
        { id: 'x', workLimit: -1 }, { id: 'x', workLimit: '5' }, { id: 'x', workLimit: NaN }];
      var chains = common.concat([{ id: 'x', minLength: '1' }, { id: 'x', maxLength: NaN }]);
      var depths = common.concat([{ id: 'x', minDepth: '1' }, { id: 'x', maxDepth: NaN }]);
      chains.forEach(function (opts) {
        var err = caught(function () { CS.forcing(model9, state, ctxFor(model9), opts); });
        if (!err || err.code !== 'solver.invalidOption') fail('forcing accepted ' + JSON.stringify(opts));
      });
      depths.forEach(function (opts) {
        var err = caught(function () { CS.nishio(model9, state, ctxFor(model9), opts); });
        if (!err || err.code !== 'solver.invalidOption') fail('nishio accepted ' + JSON.stringify(opts));
      });
    });

    it('floors the bounds, reads a minimum below 1 as 1, and an empty or negative range as nothing', function () {
      var state = fixtureState(CHAIN_FIXTURES[0]);
      function ask(opts, observer) {
        return CS.forcing(model9, state, ctxFor(model9, { onPatternWork: observer }), opts);
      }
      var base = ask({ id: 'x' });
      expect(base.i18nArgs.length).toBe(3);
      expect(ask({ id: 'x', minLength: -4, maxLength: 3.9 })).toEqual(base);
      expect(ask({ id: 'x', minLength: 0.2, maxLength: 12 })).toEqual(base);
      [[3, 2], [0, 0], [-1, -1], [1, -Infinity], [Infinity, 12]].forEach(function (w) {
        var records = [];
        var out = ask({ id: 'x', minLength: w[0], maxLength: w[1] }, function (r) { records.push(r); });
        expect(out).toBeNull();
        expect(records.length).toBe(1);
        expect(records[0].work).toBe(0);
      });
    });
  });

  // MS07b: what each registered id does on its own, with the options a caller can pass (R9, IR54).
  describe('chain windows: the four registered ids on their own', function () {
    var CS = SG.chainSearch;
    var MAX_LONG = 12;

    function withShortMax(c, fn) {
      var before = CS.SHORT_MAX;
      CS.SHORT_MAX = c;
      try {
        return fn();
      } finally {
        CS.SHORT_MAX = before;
      }
    }

    /** The odd ring whose shortest proof is a forced chain of exactly `links` links: (n + 1) / 2 = links. */
    function ringNeeding(links) {
      return ringModel(2 * links - 1);
    }

    function relabelled(finding, id) {
      return Object.assign({}, finding, { technique: id, i18nKey: 'technique.' + id + '.step.' +
        finding.i18nArgs.kind });
    }

    /** The seam with no window and no work limit: the shortest proof of the whole scan up to 12 links. */
    function shortest(m, state) {
      return CS.forcing(m, state, ctxFor(m), { id: 'x', minLength: 1, maxLength: MAX_LONG, workLimit: null });
    }

    it('splits the proofs at C: C links are forcingChain\'s, C + 1 to 12 forcingChainLong\'s, 13 nobody\'s',
      function () {
        [4, 6].forEach(function (c) {
          withShortMax(c, function () {
            [[c, 'forcingChain'], [c + 1, 'forcingChainLong'], [MAX_LONG, 'forcingChainLong'],
              [MAX_LONG + 1, null]].forEach(function (row) {
              var m = ringNeeding(row[0]);
              var state = SG.model.initState(m);
              ['forcingChain', 'forcingChainLong'].forEach(function (id) {
                var label = 'C = ' + c + ', a ring needing ' + row[0] + ' links, ' + id;
                var found = run(id, m, state);
                if (id !== row[1]) {
                  expect([label, found]).toEqual([label, null]);
                  return;
                }
                expect([label, found.technique, found.i18nArgs.length]).toEqual([label, id, row[0]]);
                expect(found.i18nKey).toBe('technique.' + id + '.step.forced');
                expect(chainProblems(m, state, found)).toEqual([]);
              });
            });
          });
        });
      });

    it('reads C at every call, not once: the same position changes owner as SHORT_MAX changes', function () {
      var m = ringNeeding(6);
      var state = SG.model.initState(m);
      function owner() {
        var short = run('forcingChain', m, state);
        var long = run('forcingChainLong', m, state);
        expect([short === null, long === null].filter(function (isNull) { return !isNull; }).length).toBe(1);
        return short !== null ? 'forcingChain' : 'forcingChainLong';
      }
      var initial = CS.SHORT_MAX;
      var byDefault = initial >= 6 ? 'forcingChain' : 'forcingChainLong';
      expect(owner()).toBe(byDefault);
      withShortMax(4, function () { expect(owner()).toBe('forcingChainLong'); });
      withShortMax(5, function () { expect(owner()).toBe('forcingChainLong'); });
      withShortMax(6, function () { expect(owner()).toBe('forcingChain'); });
      expect(CS.SHORT_MAX).toBe(initial);
      expect(owner()).toBe(byDefault); // restored, and still read afresh
      withShortMax(12, function () { expect(owner()).toBe('forcingChain'); });
      // a real position with a chain of 5 links (fixture 'contradiction chain of 5 links')
      var five = fixtureState(CHAIN_FIXTURES[4]);
      withShortMax(6, function () {
        expect(run('forcingChain', model9, five).i18nArgs.length).toBe(5);
        expect(run('forcingChainLong', model9, five)).toBeNull();
      });
      withShortMax(4, function () {
        expect(run('forcingChain', model9, five)).toBeNull();
        var long = run('forcingChainLong', model9, five);
        expect([long.technique, long.i18nArgs.length]).toEqual(['forcingChainLong', 5]);
        expect(chainProblems(model9, five, long)).toEqual([]);
      });
    });

    it('refuses a SHORT_MAX that is not a number instead of guessing a window', function () {
      var state = fixtureState(CHAIN_FIXTURES[0]);
      var initial = CS.SHORT_MAX;
      [undefined, NaN, '6', null].forEach(function (bad) {
        withShortMax(bad, function () {
          ['forcingChain', 'forcingChainLong'].forEach(function (id) {
            var err = caught(function () { run(id, model9, state); });
            if (!err || err.code !== 'solver.invalidOption') fail(id + ' accepted SHORT_MAX ' + String(bad));
          });
        });
      });
      expect(CS.SHORT_MAX).toBe(initial);
    });

    it('narrows its window with maxChainLength and never widens it, nor raises a maximum to make it fire',
      function () {
        var short = fixtureState(CHAIN_FIXTURES[0]); // a chain of 3 links
        var base = run('forcingChain', model9, short);
        [3, 4, 6, 12, 1e9, Infinity, 3.9, '2', NaN, null, undefined, {}].forEach(function (asked) {
          expect(run('forcingChain', model9, short, { maxChainLength: asked })).toEqual(base);
        });
        [2, 1, 0, -3, 0.5, 2.9, -Infinity].forEach(function (asked) {
          expect(run('forcingChain', model9, short, { maxChainLength: asked })).toBeNull();
        });
        // the long window holds a chain of 7 links; 12 is its ceiling, whatever is asked
        var near = ringNeeding(7);
        var nearState = SG.model.initState(near);
        var long = run('forcingChainLong', near, nearState);
        expect(long.i18nArgs.length).toBe(7);
        [12, 1e9, Infinity, 7, 7.9, 8, '1', NaN, null, undefined, {}].forEach(function (asked) {
          expect(run('forcingChainLong', near, nearState, { maxChainLength: asked })).toEqual(long);
        });
        // a maximum below C + 1 leaves an empty window, and it is not raised: not a search that fails
        var records = [];
        var c = CS.SHORT_MAX;
        var below = [c, c + 0.9, c - 1, 1, 0, -3, 0.5, -Infinity];
        below.forEach(function (asked) {
          var out = run('forcingChainLong', near, nearState, { maxChainLength: asked,
            onPatternWork: function (r) { records.push(r); } });
          expect([asked, out]).toEqual([asked, null]);
        });
        records.forEach(function (r) { expect([r.work, r.capHit]).toEqual([0, null]); });
        expect(records.length).toBe(below.length);
        // Infinity reaches the ceiling and not beyond: a chain of 13 links stays out of reach
        var far = ringNeeding(MAX_LONG + 1);
        expect(run('forcingChainLong', far, SG.model.initState(far), { maxChainLength: Infinity })).toBeNull();
        // the short position is forcingChain's, in every window of the long id
        [undefined, 12, Infinity].forEach(function (asked) {
          expect(run('forcingChainLong', model9, short, { maxChainLength: asked })).toBeNull();
        });
      });

    it('owns every shortest proof exactly once, for C = 4 and C = 6: the windows partition the scan',
      function () {
        var below = idsBefore('forcingChainLong');
        var positions = prunedStates(model9, SG.testkit.rng.create(171), 60,
          function (r) { return 0.03 + 0.3 * r.next(); }).map(function (item) { return item.state; });
        CHAIN_FIXTURES.forEach(function (fx) { positions.push(fixtureState(fx)); });
        LONG_CHAIN_PUZZLES.forEach(function (text) { positions.push(longStuckItem(text, below).state); });
        var counts = { forcingChain: 0, forcingChainLong: 0, none: 0 };
        var capped = 0;
        [4, 6].forEach(function (c) {
          withShortMax(c, function () {
            positions.forEach(function (state, i) {
              // the shortest proof of the whole scan in the complete canonical grouped graph (MS13c), with the
              // limits of the registered ids; a call that hits a local cap is not "the whole scan" and is counted
              var records = [];
              var seam = CS.groupedForcing(model9, state, ctxFor(model9, { onPatternWork: function (r) {
                records.push(r);
              } }), { id: 'x', minLength: 1, maxLength: MAX_LONG });
              var at = 'C = ' + c + ', state #' + i;
              if (records[0].grouped.stop !== null) {
                capped++;
                return;
              }
              var short = run('forcingChain', model9, state);
              var long = run('forcingChainLong', model9, state);
              if (seam === null) {
                expect([at, short, long]).toEqual([at, null, null]);
                counts.none++;
              } else if (seam.i18nArgs.length <= c) {
                expect([at, long]).toEqual([at, null]);
                expect(same(short, relabelled(seam, 'forcingChain'))).toBe(true);
                counts.forcingChain++;
              } else {
                expect([at, short]).toEqual([at, null]);
                expect(same(long, relabelled(seam, 'forcingChainLong'))).toBe(true);
                counts.forcingChainLong++;
              }
            });
          });
        });
        expect(capped).toBeLessThan(10);
        expect(counts.forcingChain).toBeGreaterThan(50);
        expect(counts.forcingChainLong).toBeGreaterThan(20);
        expect(counts.none).toBeGreaterThan(0);
      });

    it('lies in the window of its id at every step of a full solve, alone or mixed with the others',
      function () {
        var ladder = lowerIds().concat(CHAIN_IDS);
        var puzzles = EVIL.map(function (name) { return fixture(name).puzzle; })
          .concat(LONG_CHAIN_PUZZLES.slice(0, 3));
        var seen = { forcingChain: 0, forcingChainLong: 0, nishio: 0, nishioDeep: 0 };
        puzzles.forEach(function (text, i) {
          var report = SG.logicalSolver.solve(model9, H.parsePuzzle(model9, text),
            { allowedTechniques: ladder, collectSteps: true });
          expect([i, report.status]).toEqual([i, 'solved']);
          report.steps.forEach(function (step) {
            var args = step.i18nArgs;
            if (step.technique === 'forcingChain') expect(args.length).toBeLessThan(CS.SHORT_MAX + 1);
            if (step.technique === 'forcingChainLong') {
              expect(args.length).toBeGreaterThan(CS.SHORT_MAX);
              expect(args.length).toBeLessThan(MAX_LONG + 1);
            }
            if (step.technique === 'nishio') expect(args.depth).toBe(1);
            if (step.technique === 'nishioDeep') expect(args.depth).toBe(2);
            if (seen[step.technique] !== undefined) seen[step.technique]++;
          });
        });
        CHAIN_IDS.forEach(function (id) { expect([id, seen[id] > 0]).toEqual([id, true]); });
      });

    it('has the work policy of IR54: forcingChain and nishio unbounded, forcingChainLong and nishioDeep 50000',
      function () {
        function limitOf(id, m, state, options) {
          var records = [];
          run(id, m, state, Object.assign({ onPatternWork: function (r) { records.push(r); } }, options));
          expect(records.length).toBe(1);
          expect(records[0].id).toBe(id);
          return records[0].limit;
        }
        var near = ringNeeding(7);
        var platinum = H.makeState(model9, fixture('hard-platinum').puzzle);
        var escargot = H.makeState(model9, fixture('escargot').puzzle);
        expect(limitOf('forcingChain', model9, fixtureState(CHAIN_FIXTURES[0]))).toBeNull();
        expect(limitOf('forcingChainLong', near, SG.model.initState(near))).toBe(50000);
        expect(limitOf('nishio', model9, escargot)).toBeNull();
        expect(limitOf('nishioDeep', model9, platinum)).toBe(50000);
        // also for a window that is empty or a position with nothing to find
        expect(limitOf('forcingChain', model9, platinum, { maxChainLength: 0 })).toBeNull();
        expect(limitOf('forcingChainLong', model9, platinum, { maxChainLength: 0 })).toBe(50000);
        expect(limitOf('nishio', model9, platinum, { maxNishioDepth: 0 })).toBeNull();
        expect(limitOf('nishioDeep', model9, platinum, { maxNishioDepth: 1 })).toBe(50000);
      });

    it('keeps forcingChain unbounded where an accidental limit of 50000 would stop it, and bounds the long id',
      function () {
        // An odd ring of 2001 pair units (no proof of 6 links, about 120000 edges to see) and then a ring of 5
        // (a proof of 3 links): the short id must reach it, the long id (R10's limit) is cut before.
        var m = ringsModel([2001, 5]);
        var state = SG.model.initState(m);
        var short = [];
        var found = run('forcingChain', m, state, { onPatternWork: function (r) { short.push(r); } });
        expect(found.i18nArgs.length).toBe(3);
        expect(found.cells.every(function (c) { return c >= 2001; })).toBe(true);
        expect(short[0].limit).toBeNull();
        expect(short[0].capHit).toBeNull();
        expect(short[0].work).toBeGreaterThan(50000);
        // what a wrapper that forgot its limit would do: the seam default 50000 ends the scan with nothing
        var accidental = observedBy(m, state, { id: 'forcingChain', minLength: 1, maxLength: 6 });
        expect(accidental.finding).toBeNull();
        expect([accidental.record.limit, accidental.record.work, accidental.record.capHit])
          .toEqual([50000, 50000, 'work']);
        var long = [];
        expect(run('forcingChainLong', m, state, { onPatternWork: function (r) { long.push(r); } })).toBeNull();
        expect([long[0].limit, long[0].capHit]).toEqual([50000, 'work']);
      });

    /** One seam call with its pattern-work record. */
    function observedBy(m, state, opts) {
      var records = [];
      var finding = CS.forcing(m, state, ctxFor(m, { onPatternWork: function (r) { records.push(r); } }), opts);
      return { finding: finding, record: records[0] };
    }
  });

  // ---------------------------------------------------------------------------------------------------------------
  // xyChain (R15, MS12): the restricted edges. The enumeration and the proof checker below are written from the
  // candidates and `model.peers` alone; nothing is shared with the finder's tables (strong links, scratch buffers).
  // ---------------------------------------------------------------------------------------------------------------

  /** The cell of row r, column c (1-based) of a classic9 board. */
  function at(r, c) {
    return (r - 1) * 9 + (c - 1);
  }

  /** The open candidates of a cell, ascending. */
  function digitsOfCell(m, state, c) {
    var out = [];
    if (state.value[c] !== 0) return out;
    for (var d = 1; d <= m.digits; d++) if ((state.candidates[c] & bitOf(d)) !== 0) out.push(d);
    return out;
  }

  /** A position where each listed cell keeps only its listed digits and every other cell keeps all of them. */
  function cellsState(m, edits, tweak) {
    var state = SG.model.initState(m);
    Object.keys(edits).forEach(function (c) {
      var mask = 0;
      edits[c].forEach(function (d) { mask |= bitOf(d); });
      state.candidates[Number(c)] = mask;
    });
    if (tweak) tweak(state);
    return state;
  }

  function sees(m, a, b) {
    return m.peers[a].indexOf(b) !== -1;
  }

  /**
   * What an XY-chain Finding must be, derived again from the position: a path that alternates from a false literal to a
   * true one, every strong step the other candidate of a bivalue cell, every weak step the same digit in a distinct cell
   * that sees it, the same digit at both ends in distinct cells, and eliminations that are exactly the candidates of that
   * digit in the other cells that see both ends. Empty array = a valid proof.
   */
  function xyProblems(m, state, finding) {
    var problems = [];
    var args = finding.i18nArgs;
    if (finding.technique !== 'xyChain') problems.push('technique is ' + finding.technique);
    if (finding.i18nKey !== 'technique.xyChain.step') problems.push('i18nKey is ' + finding.i18nKey);
    if (!same(Object.keys(args), ['digit', 'kind', 'length', 'chains'])) {
      problems.push('i18nArgs keys are ' + JSON.stringify(Object.keys(args)));
    }
    if (args.kind !== 'endpoints') problems.push('kind is ' + args.kind);
    if (!Array.isArray(args.chains) || args.chains.length !== 1) return problems.concat('exactly one chain');
    var path = args.chains[0];
    if (path.length < 4 || path.length % 2 !== 0) problems.push('the path has ' + path.length + ' literals');
    path.forEach(function (step, i) {
      var where = 'step ' + i + ' ' + JSON.stringify(step);
      if (step[2] !== 0 && step[2] !== 1) problems.push(where + ': truth must be 0 or 1');
      if (!isOpen(state, step[0], step[1])) problems.push(where + ' is not an open candidate');
      if (i === 0) {
        if (step[2] !== 0) problems.push('the path must start from a false literal');
        return;
      }
      var prev = path[i - 1];
      if (prev[2] === 0) {
        var own = digitsOfCell(m, state, step[0]);
        if (step[2] !== 1 || step[0] !== prev[0] || step[1] === prev[1] || own.length !== 2) {
          problems.push(where + ': not the strong link of a bivalue cell');
        }
      } else if (step[2] !== 0 || step[1] !== prev[1] || step[0] === prev[0] || !sees(m, prev[0], step[0])) {
        problems.push(where + ': not a weak link between the same digit of two cells that see each other');
      }
    });
    var start = path[0];
    var end = lastOf(path);
    if (end[2] !== 1) problems.push('the path must end on a true literal');
    if (start[1] !== end[1]) problems.push('the ends are different digits');
    if (start[0] === end[0]) problems.push('the ends are one and the same cell');
    if (args.digit !== start[1]) problems.push('digit is ' + args.digit);
    if (args.length !== path.length - 1) problems.push('length is ' + args.length + ' for ' + (path.length - 1) + ' edges');
    var cells = [];
    path.forEach(function (step) { if (cells.indexOf(step[0]) === -1) cells.push(step[0]); });
    if (!same(finding.cells, cells.sort(function (a, b) { return a - b; }))) {
      problems.push('cells ' + JSON.stringify(finding.cells) + ' are not the distinct cells of the chain, ascending');
    }
    var wanted = [];
    for (var p = 0; p < m.cellCount; p++) {
      if (p !== start[0] && p !== end[0] && isOpen(state, p, start[1]) && sees(m, start[0], p) && sees(m, end[0], p)) {
        wanted.push([p, start[1]]);
      }
    }
    if (!same(finding.eliminations, wanted)) {
      problems.push('eliminations ' + JSON.stringify(finding.eliminations) + ' are not ' + JSON.stringify(wanted));
    }
    if (finding.placements.length !== 0) problems.push('an XY-chain places nothing');
    return problems;
  }

  /**
   * Every start literal "d is false in c" of a bivalue cell with its shortest restricted proof, by a breadth first
   * search over literals written from the candidates and the peers only: a false literal leads to the other candidate of
   * its bivalue cell, a true literal to the same digit in every cell that sees it. A proof ends in a true literal of the
   * start digit in a HIGHER cell and removes that digit from every other cell that sees both ends. `first` is the proof
   * the finder must report: the shortest of the scan, the lowest start (cell, digit) among the shortest ones.
   */
  function xyOracle(m, state, maxEdges) {
    function shortest(c0, d0) {
      var seen = {};
      var frontier = [[c0, d0, 0]];
      seen[c0 + ':' + d0 + ':0'] = true;
      for (var length = 1; length <= maxEdges && frontier.length > 0; length++) {
        var next = [];
        frontier.forEach(function (lit) {
          var outs = [];
          if (lit[2] === 0) {
            var own = digitsOfCell(m, state, lit[0]);
            if (own.length === 2) outs.push([lit[0], own[0] === lit[1] ? own[1] : own[0], 1]);
          } else {
            m.peers[lit[0]].forEach(function (p) { if (isOpen(state, p, lit[1])) outs.push([p, lit[1], 0]); });
          }
          outs.forEach(function (o) {
            var key = o[0] + ':' + o[1] + ':' + o[2];
            if (seen[key]) return;
            seen[key] = true;
            next.push(o);
          });
        });
        frontier = next;
        var ends = [];
        frontier.forEach(function (lit) {
          if (lit[2] !== 1 || lit[1] !== d0 || lit[0] <= c0) return;
          var elim = [];
          for (var p = 0; p < m.cellCount; p++) {
            if (p !== c0 && p !== lit[0] && isOpen(state, p, d0) && sees(m, c0, p) && sees(m, lit[0], p)) {
              elim.push(p);
            }
          }
          if (elim.length > 0) ends.push({ cell: lit[0], eliminations: elim });
        });
        if (ends.length > 0) return { start: [c0, d0], length: length, ends: ends };
      }
      return null;
    }
    var results = [];
    for (var c = 0; c < m.cellCount; c++) {
      var ds = digitsOfCell(m, state, c);
      if (ds.length !== 2) continue;
      ds.forEach(function (d) {
        var found = shortest(c, d);
        if (found !== null) results.push(found);
      });
    }
    var min = Infinity;
    results.forEach(function (r) { min = Math.min(min, r.length); });
    var first = null;
    for (var i = 0; i < results.length && first === null; i++) if (results[i].length === min) first = results[i];
    return { min: min, first: first, all: results };
  }

  /**
   * The registered xyChain against the enumeration: both find nothing, or the finder reports the shortest proof of the
   * scan, from the lowest start among the shortest, ending in one of that start's shortest ends, with a Finding that
   * passes the proof checker and the contract. Returns the Finding (null for none).
   */
  function xyAgreement(m, state, label, caller, solution) {
    var finding = run('xyChain', m, state, caller === undefined ? {} : { maxChainLength: caller });
    var oracle = xyOracle(m, state, caller === undefined ? 12 : Math.min(12, caller));
    if (oracle.first === null) {
      if (finding !== null) fail('xyChain found ' + JSON.stringify(finding) + ' on ' + label + ', the enumeration none');
      return null;
    }
    if (finding === null) {
      fail('xyChain found nothing on ' + label + ', the enumeration a proof of ' + oracle.min + ' edges from ' +
        JSON.stringify(oracle.first.start));
    }
    var problems = xyProblems(m, state, finding)
      .concat(H.findingProblems(m, state, finding, { technique: 'xyChain', solution: solution }));
    var chain = finding.i18nArgs.chains[0];
    var end = lastOf(chain);
    var pair = oracle.first.ends.filter(function (e) { return e.cell === end[0]; })[0];
    if (finding.i18nArgs.length !== oracle.min) {
      problems.push('length ' + finding.i18nArgs.length + ', the enumeration ' + oracle.min);
    }
    if (chain[0][0] !== oracle.first.start[0] || chain[0][1] !== oracle.first.start[1]) {
      problems.push('start ' + JSON.stringify(chain[0]) + ', the enumeration ' + JSON.stringify(oracle.first.start));
    }
    if (pair === undefined) problems.push('the end ' + end[0] + ' is not a shortest end of the start');
    if (problems.length > 0) fail('xyChain disagrees on ' + label + ':\n  - ' + problems.join('\n  - ') +
      '\n  finding: ' + JSON.stringify(finding));
    return finding;
  }

  /**
   * The work the finder must count, from the enumeration's own breadth first search in the documented order: the starts
   * in node order, the search of a start stopping at its first proof or at the limit (the window, or one less than the
   * shortest proof so far), a literal being expanded only below the limit, a false literal with its one strong edge (a
   * bivalue cell) or a true literal with a weak edge to every cell of `model.peers` order that holds the digit, each
   * edge counted whether or not it leads somewhere new, the edge of the proof included.
   */
  function xyWork(m, state, maxEdges) {
    var work = 0;
    var best = Infinity;
    for (var c0 = 0; c0 < m.cellCount; c0++) {
      var ds = digitsOfCell(m, state, c0);
      if (ds.length !== 2) continue;
      for (var k = 0; k < 2; k++) {
        var limit = Math.min(maxEdges, best - 1);
        if (limit < 1) return work;
        var d0 = ds[k];
        var seen = {};
        seen[c0 + ':' + d0 + ':0'] = true;
        var queue = [[c0, d0, 0, 0]];
        var found = false;
        for (var head = 0; head < queue.length && !found; head++) {
          var lit = queue[head];
          if (lit[3] >= limit) break;
          var outs = [];
          if (lit[2] === 0) {
            var own = digitsOfCell(m, state, lit[0]);
            outs.push([lit[0], own[0] === lit[1] ? own[1] : own[0], 1]);
          } else {
            m.peers[lit[0]].forEach(function (p) { if (isOpen(state, p, lit[1])) outs.push([p, lit[1], 0]); });
          }
          for (var i = 0; i < outs.length && !found; i++) {
            work++;
            var o = outs[i];
            var key = o[0] + ':' + o[1] + ':' + o[2];
            if (seen[key]) continue;
            seen[key] = true;
            var dist = lit[3] + 1;
            if (o[2] === 1) {
              var elim = false;
              if (o[1] === d0 && o[0] > c0) {
                for (var p = 0; p < m.cellCount && !elim; p++) {
                  elim = p !== c0 && p !== o[0] && isOpen(state, p, d0) && sees(m, c0, p) && sees(m, o[0], p);
                }
              }
              if (elim) {
                best = dist;
                found = true;
              } else {
                queue.push([o[0], o[1], 1, dist]);
              }
            } else if (digitsOfCell(m, state, o[0]).length === 2) {
              queue.push([o[0], o[1], 0, dist]);
            }
          }
        }
      }
    }
    return work;
  }

  /** The vector of R15: A = R1C1 {1,4}, B = R1C5 {1,2}, C = R1C9 {2,3}, D = R5C9 {3,4}; `pos` maps (row, col) to a cell. */
  function vectorEdits(pos) {
    var edits = {};
    edits[pos(1, 1)] = [1, 4];
    edits[pos(1, 5)] = [1, 2];
    edits[pos(1, 9)] = [2, 3];
    edits[pos(5, 9)] = [3, 4];
    return edits;
  }

  var ORIENTATIONS = [
    { name: 'as written', pos: function (r, c) { return at(r, c); } },
    { name: 'transposed', pos: function (r, c) { return at(c, r); } }
  ];

  // Seven cells where each sees the next: cell i holds {i + 1, i + 2} and the last {n, 1}, so n cells are 2n - 1 edges
  var SNAKE = [at(1, 1), at(1, 4), at(4, 4), at(4, 7), at(7, 7), at(9, 7), at(9, 2)];

  function snake(n) {
    var edits = {};
    for (var i = 0; i < n; i++) edits[SNAKE[i]] = [i + 1, i === n - 1 ? 1 : i + 2];
    return cellsState(model9, edits);
  }

  describe('xyChain: registration and the shared builder (R15)', function () {
    var CS = SG.chainSearch;

    it('is a chain technique of order 186 and base cost 82, for every variant, between bugPlusOne and ' +
      'forcingChain, with the uniqueness assumption off', function () {
        var t = SG.techniques.get('xyChain');
        expect([t.id, t.group, t.order, t.baseCost, t.i18nKey]).toEqual(['xyChain', 'chain', 186, 82,
          'technique.xyChain']);
        expect(t.variantScope).toBeNull();
        expect(t.assumesUniqueness).toBe(false);
        var ids = SG.techniques.list().map(function (x) { return x.id; });
        expect(ids.indexOf('xyChain')).toBe(ids.indexOf('bugPlusOne') + 1);
        expect(ids.indexOf('forcingChain')).toBe(ids.indexOf('xyChain') + 1);
      });

    it('asks the shared builder for the restricted edges, 1 to 12 edges and 50000 units, and nothing else',
      function () {
        var states = [];
        ORIENTATIONS.forEach(function (o) { states.push(cellsState(model9, vectorEdits(o.pos))); });
        prunedStates(model9, SG.testkit.rng.create(241), 40, function (r) { return 0.04 + 0.16 * r.next(); })
          .forEach(function (item) { states.push(item.state); });
        var fired = 0;
        states.forEach(function (state, i) {
          var seam = CS.forcing(model9, state, ctxFor(model9), { id: 'xyChain', edges: 'restricted', minLength: 1,
            maxLength: 12, workLimit: 50000 });
          var own = run('xyChain', model9, state);
          if (!same(seam, own)) fail('xyChain differs from the restricted seam on state #' + i);
          if (own !== null) fired++;
        });
        expect(fired).toBeGreaterThan(20);
      });

    it('defaults to the general edges, refuses any other mode, and gives the general Findings with their kinds',
      function () {
        var state = fixtureState(CHAIN_FIXTURES[0]); // an X-chain of 3 links through conjugate pairs
        var plain = CS.forcing(model9, state, ctxFor(model9), { id: 'forcingChain', minLength: 1, maxLength: 4,
          workLimit: null });
        var general = CS.forcing(model9, state, ctxFor(model9), { id: 'forcingChain', minLength: 1, maxLength: 4,
          workLimit: null, edges: 'general' });
        expect(general).toEqual(plain);
        expect(plain).toEqual(run('forcingChain', model9, state));
        expect(plain.i18nKey).toBe('technique.forcingChain.step.endpoints');
        [null, 'xy', 'Restricted', 1, true, {}].forEach(function (bad) {
          var err = caught(function () {
            CS.forcing(model9, state, ctxFor(model9), { id: 'x', edges: bad });
          });
          expect([String(bad), err && err.code]).toEqual([String(bad), 'solver.invalidOption']);
        });
        // nishio has no edges
        expect(CS.nishio(model9, H.makeState(model9, fixture('escargot').puzzle), ctxFor(model9),
          { id: 'x', minDepth: 1, maxDepth: 1, edges: 'restricted' })).toEqual(
          CS.nishio(model9, H.makeState(model9, fixture('escargot').puzzle), ctxFor(model9),
            { id: 'x', minDepth: 1, maxDepth: 1 }));
      });

    it('keeps each mode unchanged when the two are interleaved on one model (the search buffers are shared)',
      function () {
        var states = [cellsState(model9, vectorEdits(at)), fixtureState(CHAIN_FIXTURES[0]), fixtureState(CHAIN_FIXTURES[3])];
        prunedStates(model9, SG.testkit.rng.create(246), 24, function (r) { return 0.04 + 0.2 * r.next(); })
          .forEach(function (item) { states.push(item.state); });
        var modes = [{ id: 'probe', minLength: 1, maxLength: 12 },
          { id: 'probe', minLength: 1, maxLength: 12, edges: 'general' },
          { id: 'probe', minLength: 1, maxLength: 12, edges: 'restricted' },
          { id: 'probe', minLength: 1, maxLength: 12, workLimit: 300 },
          { id: 'probe', minLength: 1, maxLength: 12, workLimit: 300, edges: 'restricted' }];
        function once(state, opts) {
          var records = [];
          var finding = CS.forcing(model9, state, ctxFor(model9, { onPatternWork: function (r) { records.push(r); } }),
            opts);
          return { finding: finding, records: records };
        }
        var alone = states.map(function (state) { return modes.map(function (opts) { return once(state, opts); }); });
        // every state with every mode after every other mode, in two orders
        [false, true].forEach(function (reverse) {
          states.slice().map(function (s, i) { return i; }).sort(function (a, b) { return reverse ? b - a : a - b; })
            .forEach(function (i) {
              modes.map(function (m, k) { return k; }).sort(function (a, b) { return reverse ? a - b : b - a; })
                .forEach(function (k) {
                  expect([i, k, once(states[i], modes[k])]).toEqual([i, k, alone[i][k]]);
                });
            });
        });
        // the default is the general mode, and an explicit general mode the same call
        states.forEach(function (state, i) { expect(alone[i][0]).toEqual(alone[i][1]); });
        expect(alone.some(function (row) { return !same(row[1].finding, row[2].finding); })).toBe(true);
      });

    it('returns only the endpoints proof under the id it is given, whatever the position', function () {
      var seen = 0;
      prunedStates(model9, SG.testkit.rng.create(242), 40, function (r) { return 0.04 + 0.16 * r.next(); })
        .forEach(function (item, i) {
          var f = CS.forcing(model9, item.state, ctxFor(model9), { id: 'probeXy', edges: 'restricted',
            minLength: 1, maxLength: 12 });
          if (f === null) return;
          seen++;
          expect([i, f.technique, f.i18nKey, f.i18nArgs.kind, f.placements.length])
            .toEqual([i, 'probeXy', 'technique.probeXy.step', 'endpoints', 0]);
          expect(xyProblems(model9, item.state, Object.assign({}, f, { technique: 'xyChain',
            i18nKey: 'technique.xyChain.step' }))).toEqual([]);
        });
      expect(seen).toBeGreaterThan(20);
      // odd rings of pair units hold a forced chain (a polarity proof) for the general edges and none for these
      [5, 7, 9].forEach(function (n) {
        var m = ringModel(n);
        var state = SG.model.initState(m);
        var general = CS.forcing(m, state, ctxFor(m), { id: 'x', minLength: 1, maxLength: 12 });
        var restricted = CS.forcing(m, state, ctxFor(m), { id: 'x', minLength: 1, maxLength: 12,
          edges: 'restricted' });
        expect(general.i18nArgs.kind).toBe('forced');
        expect(restricted === null || restricted.i18nArgs.kind === 'endpoints').toBe(true);
        expect(restricted === null || restricted.placements.length === 0).toBe(true);
      });
    });
  });

  describe('xyChain: the vector of the brief and its near misses', function () {
    ORIENTATIONS.forEach(function (o) {
      it('finds the seven-edge chain of the brief, ' + o.name + ': false 4 in R1C1 ... true 4 in R5C9, R5C1 loses the 4',
        function () {
          var pos = o.pos;
          var state = cellsState(model9, vectorEdits(pos));
          var finding = xyAgreement(model9, state, 'the vector ' + o.name);
          var A = pos(1, 1);
          var B = pos(1, 5);
          var C = pos(1, 9);
          var D = pos(5, 9);
          expect(finding).toEqual({
            technique: 'xyChain',
            cells: [A, B, C, D].sort(function (a, b) { return a - b; }),
            placements: [],
            eliminations: [[pos(5, 1), 4]],
            i18nKey: 'technique.xyChain.step',
            i18nArgs: { digit: 4, kind: 'endpoints', length: 7, chains: [[[A, 4, 0], [A, 1, 1], [B, 1, 0], [B, 2, 1],
              [C, 2, 0], [C, 3, 1], [D, 3, 0], [D, 4, 1]]] }
          });
          expect(H.findingProblems(model9, state, finding, { technique: 'xyChain' })).toEqual([]);
        });
    });

    var NEAR_MISSES = [
      ['the far end holds another digit (R5C9 {3,5}): the chain ends on a 5, not on the 4 it starts from',
        function (e, pos) { e[pos(5, 9)] = [3, 5]; }],
      ['a cell with three candidates in the chain (R1C9 {2,3,6}) is no strong link',
        function (e, pos) { e[pos(1, 9)] = [2, 3, 6]; }],
      ['the third cell shares no digit with the second (R1C9 {3,5}): no weak link on the 2',
        function (e, pos) { e[pos(1, 9)] = [3, 5]; }],
      ['the second cell does not see the first (R1C5 moved to R2C5)',
        function (e, pos) { delete e[pos(1, 5)]; e[pos(2, 5)] = [1, 2]; }],
      ['the last cell does not see the third (R5C9 moved to R6C8)',
        function (e, pos) { delete e[pos(5, 9)]; e[pos(6, 8)] = [3, 4]; }],
      ['the only cell that sees both ends (R5C1) is solved, whatever candidates its neighbours kept', null,
        function (state, pos) {
          state.value[pos(5, 1)] = 4;
          state.candidates[pos(5, 1)] = bitOf(4);
        }],
      ['nothing to remove: the only cell that sees both ends (R5C1) holds no 4', null,
        function (state, pos) { state.candidates[pos(5, 1)] &= ~bitOf(4); }]
    ];

    ORIENTATIONS.forEach(function (o) {
      NEAR_MISSES.forEach(function (miss) {
        it('finds nothing when ' + miss[0] + ', ' + o.name, function () {
          var edits = vectorEdits(o.pos);
          if (miss[1]) miss[1](edits, o.pos);
          var state = cellsState(model9, edits, miss[2] ? function (s) { miss[2](s, o.pos); } : null);
          expect(xyAgreement(model9, state, 'the near miss "' + miss[0] + '" ' + o.name)).toBeNull();
          expect(xyOracle(model9, state, 12).first).toBeNull();
        });
      });
    });

    it('removes the 4 from exactly the cells that see both ends, and from no cell that sees only one', function () {
      var state = cellsState(model9, vectorEdits(at));
      var finding = run('xyChain', model9, state);
      expect(finding.eliminations).toEqual([[at(5, 1), 4]]);
      // R1C2 sees R1C1 only, R5C8 sees R5C9 only, R2C9 sees R1C9 (a middle cell) only: all still hold the 4
      [at(1, 2), at(5, 8), at(2, 9)].forEach(function (c) {
        expect([c, (state.candidates[c] & bitOf(4)) !== 0]).toEqual([c, true]);
        expect(finding.eliminations.some(function (e) { return e[0] === c; })).toBe(false);
      });
    });
  });

  describe('xyChain: the edges it does not take', function () {
    var CS = SG.chainSearch;

    /** The vector plus a tempting shortcut: the 1 is held only by R1C5 and R5C5 in column 5, a conjugate pair. */
    function shortcutState(pos) {
      var edits = vectorEdits(pos);
      edits[pos(5, 5)] = [1, 5, 7];
      edits[pos(5, 7)] = [1, 4];
      return cellsState(model9, edits, function (state) {
        for (var r = 1; r <= 9; r++) {
          if (r !== 1 && r !== 5) state.candidates[pos(r, 5)] &= ~bitOf(1);
        }
      });
    }

    /** How many strong links of a general chain join two different cells, that is, a conjugate pair of a unit. */
    function crossCellStrongLinks(finding) {
      var n = 0;
      finding.i18nArgs.chains.forEach(function (chain) {
        chain.forEach(function (step, i) {
          if (i > 0 && chain[i - 1][2] === 0 && chain[i - 1][0] !== step[0]) n++;
        });
      });
      return n;
    }

    ORIENTATIONS.forEach(function (o) {
      it('does not take the conjugate pair of a unit for a strong link: it shortens the general chain, not this one, ' +
        o.name, function () {
          var state = shortcutState(o.pos);
          var general = CS.forcing(model9, state, ctxFor(model9), { id: 'probe', minLength: 1, maxLength: 12 });
          expect(general).not.toBeNull();
          expect(chainProblems(model9, state, general)).toEqual([]);
          expect(crossCellStrongLinks(general)).toBeGreaterThan(0);
          expect(general.i18nArgs.length).toBeLessThan(7);
          var finding = xyAgreement(model9, state, 'the shortcut ' + o.name);
          var plain = run('xyChain', model9, cellsState(model9, vectorEdits(o.pos)));
          expect(finding.i18nArgs.length).toBe(7);
          expect(finding.i18nArgs.chains).toEqual(plain.i18nArgs.chains);
          expect(finding.eliminations).toEqual(plain.eliminations);
          expect(crossCellStrongLinks(finding)).toBe(0);
        });
    });

    it('is the same with every unit declared incomplete, where the general edges lose their conjugate links',
      function () {
        var plain = ctxFor(model9);
        var none = Object.assign({}, plain, { completeUnits: new Uint8Array(plain.completeUnits.length) });
        var xy = { id: 'xyChain', edges: 'restricted', minLength: 1, maxLength: 12 };
        var states = [cellsState(model9, vectorEdits(at)), shortcutState(at)];
        prunedStates(model9, SG.testkit.rng.create(243), 30, function (r) { return 0.04 + 0.16 * r.next(); })
          .forEach(function (item) { states.push(item.state); });
        states.forEach(function (state, i) {
          expect([i, CS.forcing(model9, state, none, xy)]).toEqual([i, CS.forcing(model9, state, plain, xy)]);
        });
        var shortcut = shortcutState(at);
        var general = { id: 'probe', minLength: 1, maxLength: 12 };
        expect(CS.forcing(model9, shortcut, none, general)).not.toEqual(CS.forcing(model9, shortcut, plain, general));
      });

    it('takes a weak link through a partial unit (a digit may be missing from it) and no strong link from it',
      function () {
        var m = partialUnitModel();
        // cells 0 and 10 see each other only through the partial unit [0, 5, 10]
        expect(Array.from(m.units[m.units.length - 1])).toEqual([0, 5, 10]);
        expect(sees(m, 0, 10)).toBe(true);
        expect(m.units.slice(0, -1).some(function (u) { return u.indexOf(0) !== -1 && u.indexOf(10) !== -1; }))
          .toBe(false);
        var state = cellsState(m, { 0: [1, 2], 10: [1, 2] });
        var finding = xyAgreement(m, state, 'a pair through a partial unit');
        expect(finding.i18nArgs.length).toBe(3);
        expect(finding.eliminations.map(function (e) { return e[0]; })).toContain(5);
        // a digit confined to two cells of the partial unit is no conjugate pair: nothing to start from
        var confined = cellsState(m, { 0: [1, 2, 3], 5: [1, 2, 3], 10: [1, 2, 3] }, function (s) {
          for (var c = 0; c < m.cellCount; c++) if (c !== 0 && c !== 5 && c !== 10) s.candidates[c] &= ~bitOf(3);
        });
        expect(xyAgreement(m, confined, 'a digit confined to a partial unit')).toBeNull();
      });

    it('claims no general chain: a position where only a chain through conjugate pairs, a contradiction or a forced ' +
      'chain exists is forcingChain\'s, and an XY-chain it does hold is a proof of its own', function () {
        var only = [];
        CHAIN_FIXTURES.forEach(function (fx) {
          var state = fixtureState(fx);
          var xy = run('xyChain', model9, state);
          var fc = SG.chainSearch.forcing(model9, state, ctxFor(model9), { id: 'forcingChain', minLength: 1,
            maxLength: 12 });
          expect([fx.name, fc !== null]).toEqual([fx.name, true]);
          if (xy === null) {
            only.push(fx.name);
            return;
          }
          // what xyChain says is a bivalue-only proof whatever the general chain is, never the general Finding relabelled
          expect([fx.name, xyProblems(model9, state, xy)]).toEqual([fx.name, []]);
          expect(xy.i18nKey).not.toBe(fc.i18nKey);
          expect(xy.i18nArgs.kind).toBe('endpoints');
        });
        expect(only.length).toBeGreaterThan(2);
        // the forced chains and the contradiction chains are never relabelled: a forced one has a placement
        CHAIN_FIXTURES.filter(function (fx) { return fx.kind === 'forced'; }).forEach(function (fx) {
          var xy = run('xyChain', model9, fixtureState(fx));
          expect(xy === null || xy.placements.length === 0).toBe(true);
        });
      });
  });

  describe('xyChain: the shortest proof of the whole scan', function () {
    /** A chain of `n` cells in the given cells: cell i holds {digit + i, digit + i + 1}, the last {digit + n - 1, digit}. */
    function chainEdits(cells, digit) {
      var edits = {};
      cells.forEach(function (c, i) {
        edits[c] = [digit + i, i === cells.length - 1 ? digit : digit + i + 1];
      });
      return edits;
    }

    var LONG = [at(1, 1), at(1, 4), at(4, 4)]; // digits 1, 2, 3: five edges, ends R1C1 and R4C4
    var SHORT = [at(8, 1), at(8, 2)]; // digits 4, 5: three edges

    it('takes a shorter proof on a later start over a longer one on an earlier start', function () {
      var edits = Object.assign(chainEdits(LONG, 1), chainEdits(SHORT, 4));
      var state = cellsState(model9, edits);
      var finding = xyAgreement(model9, state, 'a chain of 5 edges before one of 3');
      expect(finding.i18nArgs.length).toBe(3);
      expect(finding.cells).toEqual(SHORT);
      expect(finding.i18nArgs.digit).toBe(4);
      var longOnly = cellsState(model9, chainEdits(LONG, 1));
      expect(xyAgreement(model9, longOnly, 'the chain of 5 edges alone').i18nArgs.length).toBe(5);
    });

    it('takes the lowest start among proofs of the same length, the lower digit first inside one pair of cells',
      function () {
        var first = [at(2, 1), at(2, 2)];
        var second = [at(7, 1), at(7, 2)];
        var state = cellsState(model9, Object.assign(chainEdits(first, 6), chainEdits(second, 4)));
        var finding = xyAgreement(model9, state, 'two chains of 3 edges, the earlier with the higher digits');
        expect(finding.cells).toEqual(first);
        expect(finding.i18nArgs.digit).toBe(6);
        expect(finding.i18nArgs.chains[0][0]).toEqual([first[0], 6, 0]);
        var swapped = cellsState(model9, Object.assign(chainEdits(first, 4), chainEdits(second, 6)));
        var other = xyAgreement(model9, swapped, 'the same chains, digits swapped');
        expect(other.cells).toEqual(first);
        expect(other.i18nArgs.digit).toBe(4);
        var reversed = cellsState(model9, Object.assign(chainEdits(second, 6), chainEdits([at(2, 1), at(2, 2)], 4)));
        expect(xyAgreement(model9, reversed, 'the earlier chain is the one with the lower digits').cells)
          .toEqual(first);
      });

    it('looks at a pair of ends from its lower cell: the chain starts in the lower of the two ends', function () {
      var seen = 0;
      prunedStates(model9, SG.testkit.rng.create(244), 60, function (r) { return 0.04 + 0.16 * r.next(); })
        .forEach(function (item, i) {
          var f = run('xyChain', model9, item.state);
          if (f === null) return;
          seen++;
          var chain = f.i18nArgs.chains[0];
          expect([i, chain[0][0] < lastOf(chain)[0]]).toEqual([i, true]);
        });
      expect(seen).toBeGreaterThan(20);
    });
  });

  describe('xyChain: the window of 12 edges and the caller limit', function () {
    var CS = SG.chainSearch;

    it('finds a chain of 3, 5, 7, 9 and 11 edges, each the shortest proof of its position', function () {
      [2, 3, 4, 5, 6].forEach(function (n) {
        var finding = xyAgreement(model9, snake(n), 'a chain of ' + n + ' cells');
        expect([n, finding.i18nArgs.length]).toEqual([n, 2 * n - 1]);
        expect(finding.i18nArgs.chains[0].length).toBe(2 * n);
      });
    });

    it('stops at 12 edges: one of 11 is found, one of 13 is nobody\'s (an XY-chain has an odd number of edges)',
      function () {
        var long = snake(7);
        expect(run('xyChain', model9, long)).toBeNull();
        expect(xyOracle(model9, long, 12).first).toBeNull();
        expect(xyOracle(model9, long, 13).first.min).toBeUndefined();
        expect(xyOracle(model9, long, 13).min).toBe(13);
        // the seam is not clamped: it finds the chain of 13 edges and of any more, with a proof that checks
        var seam = CS.forcing(model9, long, ctxFor(model9), { id: 'xyChain', edges: 'restricted', minLength: 1,
          maxLength: 13 });
        expect(seam.i18nArgs.length).toBe(13);
        expect(xyProblems(model9, long, seam)).toEqual([]);
        expect(CS.forcing(model9, long, ctxFor(model9), { id: 'xyChain', edges: 'restricted', minLength: 1,
          maxLength: 12 })).toBeNull();
        // 11 is found with the registered window whatever larger caller limit comes with it
        [undefined, 11, 12, 13, 100, Infinity].forEach(function (asked) {
          var options = asked === undefined ? {} : { maxChainLength: asked };
          expect([asked, run('xyChain', model9, snake(6), options).i18nArgs.length]).toEqual([asked, 11]);
          expect([asked, run('xyChain', model9, long, options)]).toEqual([asked, null]);
        });
      });

    it('narrows its window with maxChainLength and never widens it: invalid or off reads as for the other chains',
      function () {
        var nine = snake(5);
        [[8, false], [8.9, false], [9, true], [9.9, true], [10, true], [11, true], [12, true], [Infinity, true],
          [0, false], [-1, false], [-Infinity, false], [NaN, true], ['3', true], [null, true], [undefined, true],
          [{}, true], [false, true]].forEach(function (row) {
          var finding = run('xyChain', model9, nine, { maxChainLength: row[0] });
          expect([String(row[0]), finding !== null]).toEqual([String(row[0]), row[1]]);
          if (finding !== null) expect(finding.i18nArgs.length).toBe(9);
        });
        // a smaller limit is a maximum on the shortest proof: it hides nothing shorter and finds no longer one
        var shorter = cellsState(model9, chainEdits3());
        expect(run('xyChain', model9, shorter, { maxChainLength: 5 }).i18nArgs.length).toBe(3);
        expect(run('xyChain', model9, shorter, { maxChainLength: 2 })).toBeNull();
      });

    /** Three cells of {1,2}, {2,3} and {3,1} next to a pair of {4,5} cells: the shortest proof is the pair's (3 edges). */
    function chainEdits3() {
      var edits = {};
      edits[at(1, 1)] = [1, 2];
      edits[at(1, 4)] = [2, 3];
      edits[at(4, 4)] = [3, 1];
      edits[at(8, 1)] = [4, 5];
      edits[at(8, 2)] = [4, 5];
      return edits;
    }

    it('applies the same window through the solver: maxChainLength given to it narrows xyChain too', function () {
      var puzzle = F.unique.filter(function (fx) { return fx.name === 'escargot'; })[0].puzzle;
      var givens = H.parsePuzzle(model9, puzzle);
      var ids = lowerIds().concat(['xyChain', 'forcingChain', 'forcingChainLong', 'nishio', 'nishioDeep']);
      function xyUses(options) {
        var report = SG.logicalSolver.solve(model9, givens, Object.assign({ allowedTechniques: ids,
          collectSteps: true }, options));
        return report.steps.filter(function (s) { return s.technique === 'xyChain'; });
      }
      var open = xyUses({});
      var off = xyUses({ maxChainLength: 0 });
      expect(open.length).toBeGreaterThan(0);
      expect(off).toEqual([]);
      open.forEach(function (step) { expect(step.i18nArgs.length).toBeLessThan(13); });
    });
  });

  describe('xyChain: work limit, observer and budget', function () {
    var CS = SG.chainSearch;
    var XY = { id: 'xyChain', edges: 'restricted', minLength: 1, maxLength: 12 };
    // Two bivalue cells of {1,2} side by side on the 4 x 4 board, every other cell with all four digits
    var pair4 = cellsState(model4, { 0: [1, 2], 1: [1, 2] });

    /** One restricted seam call with every record its observer got. */
    function observed(m, state, opts, ctxOptions) {
      var records = [];
      var options = Object.assign({ onPatternWork: function (r) { records.push(r); } }, ctxOptions);
      var finding = CS.forcing(m, state, ctxFor(m, options), Object.assign({}, XY, opts));
      return { finding: finding, records: records, record: records[0] };
    }

    /** The work counted at each parent-budget check of a restricted call (see checkWorks of the seam suite). */
    function checkWorksXy(m, state, opts) {
      var base = ctxFor(m);
      function attempt(target) {
        var k = 0;
        var record = null;
        var ctx = Object.assign({}, base, {
          options: { onPatternWork: function (r) { record = r; } },
          check: function () {
            k++;
            if (k === target) throw new SG.errors.GenerationError('budget.exceeded', { reason: 'nodes' });
          }
        });
        var finding = CS.forcing(m, state, ctx, Object.assign({}, XY, opts));
        return { checks: k, record: record, finding: finding };
      }
      var free = attempt(0);
      var works = [];
      for (var target = 1; target <= free.checks; target++) works.push(attempt(target).record.work);
      var gaps = works.map(function (w, i) { return w - (i === 0 ? 0 : works[i - 1]); });
      gaps.push(free.record.work - (works.length === 0 ? 0 : works[works.length - 1]));
      return { works: works, gaps: gaps, max: Math.max.apply(null, gaps), record: free.record };
    }

    it('counts one unit per edge expansion, and only the edges of the restricted graph: 33 on a pair of cells',
      function () {
        // R1C1 and R1C2 hold {1,2} and see each other and 6 more cells each... A has 7 peers. The first root (false 1 in
        // A) costs 1 strong edge, 7 weak edges of the true 2 and 1 strong edge to the true 1 in B, which is the proof: 9.
        // The proof is 3 edges, so each of the three later roots (false 2 in A, false 1 and 2 in B) searches 2 edges
        // only: 1 strong edge and the 7 weak edges of the true literal, 8 each. No edge joins two candidates of one
        // cell, and no unit gives a strong edge. 9 + 3 * 8 = 33.
        expect(model4.peers[0].length).toBe(7);
        var out = observed(model4, pair4, {});
        expect(out.finding.i18nArgs.length).toBe(3);
        expect(out.record).toEqual({ id: 'xyChain', work: 33, limit: 50000, capHit: null, retained: null });
        var again = observed(model4, pair4, {});
        expect(again.record).toEqual(out.record);
        var records = [];
        run('xyChain', model4, pair4, { onPatternWork: function (r) { records.push(r); } });
        expect(records).toEqual([out.record]);
      });

    it('counts exactly the edges of the enumeration\'s own breadth first search, with every window', function () {
      var states = [];
      ORIENTATIONS.forEach(function (o) { states.push(cellsState(model9, vectorEdits(o.pos))); });
      [2, 3, 4, 5, 6, 7].forEach(function (n) { states.push(snake(n)); });
      states.push(cellsState(model9, { 0: [1, 2], 1: [1, 2], 2: [1, 2], 9: [3, 4], 10: [4, 5] }));
      prunedStates(model9, SG.testkit.rng.create(245), 30, function (r) { return 0.04 + 0.16 * r.next(); })
        .forEach(function (item) { states.push(item.state); });
      var counted = 0;
      states.forEach(function (state, i) {
        [undefined, 3, 4, 5, 7, 9, 11, 12, 13].forEach(function (asked) {
          var records = [];
          var options = { onPatternWork: function (r) { records.push(r); } };
          if (asked !== undefined) options.maxChainLength = asked;
          run('xyChain', model9, state, options);
          var expected = xyWork(model9, state, asked === undefined ? 12 : Math.min(12, asked));
          expect([i, asked, records[0].work]).toEqual([i, asked, expected]);
          if (expected > 0) counted++;
        });
      });
      expect(counted).toBeGreaterThan(200);
      // the chain of 13 edges is searched to its 12th edge and no further: the registered window is what costs
      var wide = [];
      run('xyChain', model9, snake(7), { onPatternWork: function (r) { wide.push(r); } });
      var seam = observed(model9, snake(7), { maxLength: 13 });
      expect(seam.record.work).toBeGreaterThan(wide[0].work);
      expect(seam.record.work).toBe(xyWork(model9, snake(7), 13));
    });

    it('returns null with capHit "work" once the limit is spent, never the best proof so far', function () {
      [[33, true], [33.9, true], [34, true], [32, false], [9, false], [8, false], [1, false], [0, false]]
        .forEach(function (row) {
          var out = observed(model4, pair4, { workLimit: row[0] });
          var limit = Math.floor(row[0]);
          expect([row[0], out.finding !== null]).toEqual([row[0], row[1]]);
          expect(out.records.length).toBe(1);
          // the proof of 3 edges is met at the 9th unit, but the minimum is only known once the scan is done
          if (row[1]) expect(out.record).toEqual({ id: 'xyChain', work: 33, limit: limit, capHit: null, retained: null });
          else expect(out.record).toEqual({ id: 'xyChain', work: limit, limit: limit, capHit: 'work', retained: null });
        });
      // no unbounded mode for the registered finder, and a limit that is not a number is refused by the seam
      [-1, NaN, '5', {}].forEach(function (bad) {
        var err = caught(function () { observed(model4, pair4, { workLimit: bad }); });
        expect([String(bad), err && err.code]).toEqual([String(bad), 'solver.invalidOption']);
      });
      expect(observed(model4, pair4, { workLimit: null }).record.limit).toBeNull();
      expect(observed(model4, pair4, {}).record.limit).toBe(50000);
    });

    it('reports one record per normal return, whatever the answer, and none when the call throws', function () {
      var vector = cellsState(model9, vectorEdits(at));
      var records = [];
      var run1 = run('xyChain', model9, vector, { onPatternWork: function (r) { records.push(r); } });
      expect(run1).not.toBeNull();
      expect(records.length).toBe(1);
      expect(Object.keys(records[0]).sort()).toEqual(['capHit', 'id', 'limit', 'retained', 'work']);
      expect([records[0].id, records[0].limit, records[0].capHit, records[0].retained])
        .toEqual(['xyChain', 50000, null, null]);
      expect(records[0].work).toBeGreaterThan(0);
      records[0].work = -1; // a copy: the next call is not affected
      run('xyChain', model9, vector, { onPatternWork: function (r) { records.push(r); } });
      expect(records[1]).not.toBe(records[0]);
      expect(records[1].work).toBeGreaterThan(0);
      // nothing found (the empty grid), an empty window and a solved position: one record each, with no work
      var solved = H.makeState(model9, F.unique[0].solution, { propagate: false });
      [[SG.model.initState(model9), {}], [vector, { maxChainLength: 0 }], [solved, {}]].forEach(function (row, i) {
        var seen = [];
        expect([i, run('xyChain', model9, row[0], Object.assign({ onPatternWork: function (r) { seen.push(r); } },
          row[1]))]).toEqual([i, null]);
        expect([i, seen.length, seen[0].work, seen[0].capHit]).toEqual([i, 1, 0, null]);
      });
      // a hostile observer changes nothing
      var calls = 0;
      var hostile = run('xyChain', model9, vector, { onPatternWork: function (r) {
        calls++;
        r.work = 0;
        r.capHit = 'work';
        return 'ignored';
      } });
      expect(calls).toBe(1);
      expect(hostile).toEqual(run('xyChain', model9, vector));
      expect(run('xyChain', model9, vector, { onPatternWork: 'not a function' })).toEqual(hostile);
    });

    it('reports a spent budget as nothing found, without a cap, and lets cancellation and errors through with ' +
      'no record', function () {
        var vector = cellsState(model9, vectorEdits(at));
        var parent = SG.budget.create({ nodes: 3 });
        var spent = observed(model9, vector, {}, { budget: parent });
        expect(spent.finding).toBeNull();
        expect(spent.records.length).toBe(1);
        expect(spent.record.capHit).toBeNull();
        // capHit null is no proof of a complete scan: the caller's own budget still fails after the call
        expect(caught(function () { parent.check(); }).code).toBe('budget.exceeded');
        var registered = [];
        expect(run('xyChain', model9, vector, { budget: SG.budget.create({ nodes: 3 }),
          onPatternWork: function (r) { registered.push(r); } })).toBeNull();
        expect(registered.length).toBe(1);

        var budget = SG.budget.create({});
        budget.cancel();
        var records = [];
        [function () {
          run('xyChain', model9, vector, { budget: budget, onPatternWork: function (r) { records.push(r); } });
        }, function () {
          CS.forcing(model9, vector, ctxFor(model9, { budget: budget, onPatternWork: function (r) {
            records.push(r);
          } }), Object.assign({ workLimit: null }, XY));
        }].forEach(function (call, i) {
          expect([i, caught(call).code]).toEqual([i, 'budget.cancelled']);
        });
        var boom = new Error('boom');
        var ctx = Object.assign({}, ctxFor(model9), { check: function () { throw boom; },
          options: { onPatternWork: function (r) { records.push(r); } } });
        expect(caught(function () { SG.techniques.get('xyChain').find(model9, vector, ctx); })).toBe(boom);
        expect(records).toEqual([]);
      });

    it('checks the parent budget at entry (it is bounded) and lets no more than 256 units pass between two checks',
      function () {
        function counting(m) {
          var ctx = Object.assign({}, ctxFor(m), { check: function () { ctx.checks++; } });
          ctx.checks = 0;
          return ctx;
        }
        var solved = H.makeState(model9, F.unique[0].solution, { propagate: false });
        var own = counting(model9);
        SG.techniques.get('xyChain').find(model9, solved, own);
        expect(own.checks).toBe(1);
        var unbounded = counting(model9);
        expect(CS.forcing(model9, solved, unbounded, Object.assign({ workLimit: null }, XY))).toBeNull();
        expect(unbounded.checks).toBe(0);

        // Hubs of 40 to 300 spokes: every cell is a bivalue cell and the hub's true literal has `spokes` weak edges
        [40, 100, 250, 300].forEach(function (spokes) {
          var m = starModel(spokes);
          var seen = checkWorksXy(m, SG.model.initState(m), { minLength: 1, maxLength: Infinity, workLimit: 3000 });
          var where = 'star of ' + spokes + ' spokes';
          expect([where, seen.record.work, seen.record.capHit]).toEqual([where, 3000, 'work']);
          expect([where, seen.works[0], seen.works[1]]).toEqual([where, 0, 0]); // the entry, the first root
          expect([where, seen.max <= 256]).toEqual([where, true]);
        });
        // 300 spokes, in pieces: the first root is 1 strong edge (a check before it carries the first piece of 256 edges
        // to 257), then the 300 weak edges in pieces of 256 and 44 (checks at 1 and 257), 300 strong and 300 weak edges one by
        // one (checks where the next edge would pass 256: at 513 and at 769), and the second root starts at 901.
        var hub = starModel(300);
        var seen300 = checkWorksXy(hub, SG.model.initState(hub), { minLength: 1, maxLength: Infinity, workLimit: 3000 });
        expect(seen300.works.slice(0, 8)).toEqual([0, 0, 1, 257, 513, 769, 901, 902]);
        expect(seen300.max).toBe(256);
        // a ring of 201 cells, one root at a time: expansions of one and two edges, a check at the first 1-edge boundary
        var ring = ringModel(201);
        var seenRing = checkWorksXy(ring, SG.model.initState(ring), { minLength: 1, maxLength: Infinity,
          workLimit: 600 });
        expect(seenRing.works).toEqual([0, 0, 256, 511]);
        expect(seenRing.gaps).toEqual([0, 0, 256, 255, 89]);
      });
  });

  describe('xyChain: ownership, determinism and purity', function () {
    it('never writes to the state, answers the same after other calls, and hands out arrays of its own', function () {
      var state = cellsState(model9, vectorEdits(at));
      var snapshot = SG.model.cloneState(state);
      var a = run('xyChain', model9, state);
      expect(state.candidates).toEqual(snapshot.candidates);
      expect(state.value).toEqual(snapshot.value);
      var copy = JSON.parse(JSON.stringify(a));
      expect(a).toEqual(copy);
      // another position and another technique in between
      run('xyChain', model9, cellsState(model9, { 3: [1, 2], 4: [1, 2] }));
      run('forcingChain', model9, state);
      var b = run('xyChain', model9, state);
      expect(b).toEqual(copy);
      // nothing of a Finding is shared with the next one or with the scratch buffers of the search
      a.cells.push(99);
      a.eliminations.push([99, 9]);
      a.eliminations[0][1] = 9;
      a.i18nArgs.chains[0][0][2] = 1;
      a.i18nArgs.chains[0].push([1, 1, 1]);
      a.i18nArgs.chains.push([]);
      a.i18nArgs.digit = 0;
      expect(run('xyChain', model9, state)).toEqual(copy);
      expect(b).toEqual(copy);
      var all = [b.cells, b.eliminations, b.eliminations[0], b.i18nArgs, b.i18nArgs.chains, b.i18nArgs.chains[0],
        b.i18nArgs.chains[0][0]];
      var other = run('xyChain', model9, state);
      all.forEach(function (part, i) {
        var peer = [other.cells, other.eliminations, other.eliminations[0], other.i18nArgs, other.i18nArgs.chains,
          other.i18nArgs.chains[0], other.i18nArgs.chains[0][0]][i];
        expect([i, part === peer]).toEqual([i, false]);
      });
      expect(Object.isFrozen(state.candidates)).toBe(false);
    });

    it('does not trip the solver\'s state-mutation guard while solving with it', function () {
      var before = SG.DEBUG;
      SG.setDebug(true);
      try {
        var ids = lowerIds().concat(['xyChain', 'forcingChain', 'forcingChainLong', 'nishio', 'nishioDeep']);
        EVIL.slice(0, 3).forEach(function (name) {
          var report = SG.logicalSolver.solve(model9, F.parse(fixture(name).puzzle), { allowedTechniques: ids,
            collectSteps: false });
          expect(report.status).toBe('solved');
        });
      } finally {
        SG.setDebug(before);
      }
    });
  });

  describe('xyChain: agreement with the enumeration and soundness', function () {
    var model12 = SG.fixtures.models.boxGrid('chain-box12', 3, 4);
    var model16 = SG.fixtures.models.boxGrid('chain-box16', 4, 4);

    function pruned(m, count, seed, low, span) {
      return prunedStates(m, SG.testkit.rng.create(seed), count, function (r) { return low + span * r.next(); });
    }

    /** Agreement on every item (and soundness against its known solution); how many positions have a proof. */
    function agreeAll(m, items, label) {
      var fired = 0;
      items.forEach(function (item, i) {
        if (xyAgreement(m, item.state, label + ' #' + i + ' (' + item.kind + ')', undefined, item.solution) !== null) {
          fired++;
        }
      });
      return fired;
    }

    [['classic9', model9, 60, 251, 20], ['classic9', model9, 60, 252, 20], ['classic6', model6, 120, 253, 10],
      ['classic4', model4, 120, 254, 1]].forEach(function (setup) {
      it('finds the shortest proof exactly when one exists, on ' + setup[0] + ' positions with many wrong candidates ' +
        '(seed ' + setup[3] + ')', function () {
          var items = pruned(setup[1], setup[2], setup[3], 0.04, 0.2);
          expect(agreeAll(setup[1], items, setup[0])).toBeGreaterThanOrEqual(setup[4]);
        });
    });

    it('finds the shortest proof exactly when one exists, on real puzzles: initial, propagated and pruned states',
      function () {
        var items = H.randomStatesWithKnownSolution(model9, SG.testkit.rng.create(4242), 160);
        var fired = agreeAll(model9, items, 'classic9 puzzle state');
        expect(fired).toBeGreaterThanOrEqual(1);
      });

    it('agrees on arbitrary positions of pairs, solved cells and wider cells, whether or not a solution exists',
      function () {
        // random masks: most cells hold two digits, some are solved with stale neighbours, the rest hold three or all
        var everyLength = {};
        [[model4, 400, 0.7, 0.06, 40], [model6, 300, 0.7, 0.05, 40], [model9, 60, 0.55, 0.03, 20]].forEach(
          function (setup) {
            var m = setup[0];
            var rng = SG.testkit.rng.create(300 + m.digits);
            var fired = 0;
            var lengths = {};
            for (var i = 0; i < setup[1]; i++) {
              var state = SG.model.initState(m);
              for (var c = 0; c < m.cellCount; c++) {
                var roll = rng.next();
                if (roll < setup[2]) {
                  var a = 1 + rng.int(m.digits);
                  var b = 1 + rng.int(m.digits - 1);
                  if (b >= a) b++;
                  state.candidates[c] = bitOf(a) | bitOf(b);
                } else if (roll < setup[2] + setup[3]) {
                  var v = 1 + rng.int(m.digits);
                  state.value[c] = v;
                  state.candidates[c] = bitOf(v);
                } else if (roll < 0.9) {
                  state.candidates[c] = bitOf(1 + rng.int(m.digits)) | bitOf(1 + rng.int(m.digits)) |
                    bitOf(1 + rng.int(m.digits));
                }
              }
              var finding = xyAgreement(m, state, m.variantId + ' arbitrary position #' + i);
              var seen = [];
              run('xyChain', m, state, { onPatternWork: function (r) { seen.push(r); } });
              expect([m.variantId, i, seen[0].work]).toEqual([m.variantId, i, xyWork(m, state, 12)]);
              if (finding !== null) {
                fired++;
                lengths[finding.i18nArgs.length] = (lengths[finding.i18nArgs.length] || 0) + 1;
              }
            }
            expect([m.variantId, fired >= setup[4]]).toEqual([m.variantId, true]);
            Object.keys(lengths).forEach(function (len) { everyLength[len] = true; });
          });
        expect(Object.keys(everyLength).length).toBeGreaterThanOrEqual(2);
      });

    [12, 16].forEach(function (D) {
      it('agrees on ' + D + ' digits (box shapes of 3 x 4 and 4 x 4, no 9 x 9 arithmetic)', function () {
        var m = D === 12 ? model12 : model16;
        var items = pruned(m, D === 12 ? 6 : 3, 2026, 0.02, 0.06);
        expect(agreeAll(m, items, D + ' digits')).toBeGreaterThanOrEqual(1);
      });
    });

    ['diagonalX', 'hyper', 'jigsaw9'].forEach(function (variant) {
      it('agrees on ' + variant + ' (extra regions or irregular regions are real peers)', function () {
        if (!SG.testkit.hasVariant(variant)) SG.test.skip('no board of ' + variant + ' can be built here');
        var m = H.model(variant);
        expect(agreeAll(m, pruned(m, 30, 4242, 0.04, 0.16), variant)).toBeGreaterThanOrEqual(5);
      });
    });

    it('is sound, applied again and again, on 300 states and on positions with many wrong candidates', function () {
      H.assertSound(SG.test, 'xyChain', { count: 300, minFirings: 3 });
      var stats = H.assertSound(SG.test, 'xyChain', { model: model9, states: pruned(model9, 100, 255, 0.04, 0.2),
        minFirings: 60, maxSteps: 12 });
      expect(stats.eliminations).toBeGreaterThan(60);
      H.assertSound(SG.test, 'xyChain', { model: model6, count: 120, seed: 61 });
      H.assertSound(SG.test, 'xyChain', { model: model4, count: 60, seed: 41 });
    });

    it('is sound on 6x6 grids with irregular regions and on a model with a partial unit', function () {
      var rng = SG.testkit.rng.create(71);
      for (var k = 0; k < 4; k++) {
        var m = irregularModel(rng.fork('model.' + k), 'chain-irregular-' + k);
        agreeAll(m, pruned(m, 24, 700 + k, 0.04, 0.2), 'irregular 6x6 #' + k);
      }
      var partial = partialUnitModel();
      var fired = agreeAll(partial, pruned(partial, 120, 82, 0.1, 0.5), 'partial unit model');
      expect(fired).toBeGreaterThan(5);
      H.assertSound(SG.test, 'xyChain', { model: partial, count: 120, seed: 81 });
    });

    it('never removes a candidate of a solution when a position has several solutions', function () {
      var rng = SG.testkit.rng.create(101);
      var firings = 0;
      for (var i = 0; i < 60; i++) {
        var r = rng.fork('multi.' + i);
        var solution = randomSolution(model6, r.fork('grid'));
        var state = prunedFromSolution(model6, solution, r.fork('state'), 0.1 * r.next(), 0.2 + 0.2 * r.next());
        firings += runWithOracle('xyChain', model6, state, 6, 'classic6 position #' + i);
      }
      expect(firings).toBeGreaterThan(20);
      for (var j = 0; j < 8; j++) {
        var q = rng.fork('sparse.' + j);
        var grid = randomSolution(model9, q.fork('grid'));
        var givens = new Int32Array(81);
        for (var c = 0; c < 81; c++) if (q.next() < 0.3) givens[c] = grid[c];
        runWithOracle('xyChain', model9, H.makeState(model9, givens), 3, 'sparse classic9 position #' + j);
      }
    });

    it('finds nothing when every candidate belongs to one of 2-4 solutions (twin positions), on every board',
      function () {
        var rng = SG.testkit.rng.create(111);
        for (var i = 0; i < 40; i++) {
          var r = rng.fork('twin.' + i);
          var base = randomSolution(model9, r.fork('grid'));
          var solutions = [base];
          for (var k = 1; k < 2 + (i % 3); k++) solutions.push(symmetric9(base, r.fork('sym.' + k)));
          var state = twinState(model9, solutions);
          var finding = run('xyChain', model9, state);
          if (finding !== null) fail('xyChain found something in twin position #' + i + ': ' + JSON.stringify(finding));
        }
        var models = [model4, model6, SG.fixtures.models.boxGrid('chain-box12', 3, 4), SG.fixtures.models.samurai(),
          partialUnitModel()];
        models.forEach(function (m, j) {
          var q = rng.fork('model.' + j);
          var grid = randomSolution(m, q.fork('grid'));
          for (var t = 0; t < (m.cellCount > 100 ? 2 : 10); t++) {
            var sols = [grid, relabel(grid, randomPerm(q.fork('p.' + t), m.digits))];
            if (t % 2 === 1) sols.push(relabel(grid, randomPerm(q.fork('q.' + t), m.digits)));
            var twin = twinState(m, sols);
            if (run('xyChain', m, twin) !== null) fail('xyChain found something in a twin ' + m.variantId + ' position');
          }
        });
        // an even ring of pair units: every link is strong and weak at once, two solutions, nothing to find
        [4, 6, 10, 16, 30].forEach(function (n) {
          var ring = ringModel(n);
          expect(run('xyChain', ring, SG.model.initState(ring), { maxChainLength: Infinity })).toBeNull();
        });
      });

    /** n cells of `m` where each sees the next and the two ends see a common cell outside the chain; null if none. */
    function chainCells(m, n, from) {
      var path = [];
      function endsHaveCommonPeer() {
        for (var p = 0; p < m.cellCount; p++) {
          if (path.indexOf(p) === -1 && sees(m, path[0], p) && sees(m, path[n - 1], p)) return true;
        }
        return false;
      }
      function extend() {
        if (path.length === n) return endsHaveCommonPeer();
        var next = m.peers[path[path.length - 1]].slice().sort(function (a, b) { return a - b; });
        for (var i = 0; i < next.length; i++) {
          if (path.indexOf(next[i]) !== -1) continue;
          path.push(next[i]);
          if (extend()) return true;
          path.pop();
        }
        return false;
      }
      for (var s = from; s < m.cellCount; s++) {
        path = [s];
        if (extend()) return path;
      }
      return null;
    }

    /** The cells hold {1,2}, {2,3} ... {n,1}: one chain of 2n - 1 edges, every other cell holds every digit. */
    function chainOn(m, cells) {
      var edits = {};
      cells.forEach(function (c, i) { edits[c] = [i + 1, i === cells.length - 1 ? 1 : i + 2]; });
      return cellsState(m, edits);
    }

    // Constructed chains on every unit shape: each setup must fire, so a finder that never fires on a board shape
    // cannot agree vacuously.
    [['classic9', 'classic9', [2, 3, 5]], ['classic6', 'classic6', [2, 3, 5]], ['classic4', 'classic4', [2, 3]],
      ['12 digits', null, [2, 3, 5]], ['16 digits', null, [2, 3, 5]], ['diagonalX', 'diagonalX', [2, 3, 5]],
      ['hyper', 'hyper', [2, 3, 5]], ['jigsaw9', 'jigsaw9', [2, 3, 5]], ['samurai', 'samurai', [2, 3, 5]],
      ['sohei', 'sohei', [2, 3]], ['flower', 'flower', [2, 3]], ['butterfly', 'butterfly', [2, 3]]]
      .forEach(function (setup) {
        it('agrees on constructed chains on ' + setup[0] + ' (chains of ' + setup[2].join(', ') + ' cells)',
          function () {
            var m = setup[1] === null ? (setup[0] === '12 digits' ? model12 : model16) : null;
            if (m === null) {
              if (!SG.testkit.hasVariant(setup[1])) SG.test.skip('no board of ' + setup[1] + ' can be built here');
              m = H.model(setup[1]);
            }
            var seen = {};
            var fired = 0;
            setup[2].forEach(function (n) {
              [0, Math.floor(m.cellCount / 3), Math.floor(2 * m.cellCount / 3)].forEach(function (from) {
                var cells = chainCells(m, n, from);
                if (cells === null || seen[cells.join(',')]) return;
                seen[cells.join(',')] = true;
                var finding = xyAgreement(m, chainOn(m, cells), 'the chain ' + cells.join(','));
                expect(finding).not.toBeNull();
                expect(finding.i18nArgs.length).toBeLessThan(2 * n);
                expect(finding.i18nArgs.length % 2).toBe(1);
                fired++;
              });
            });
            expect(fired).toBeGreaterThanOrEqual(2);
          });
      });
  });

  // ---------------------------------------------------------------------------------------------------------------
  // The canonical grouped graph (R16, MS13a), read since MS13c by the grouped attempt of forcingChain and
  // forcingChainLong and by no other finder. Its
  // independent checker is `SG.chainProofs` (core/tests/fixtures/chain-proofs.js): it recomputes candidate membership,
  // every cross pair of peers and the complete-unit coverage from the model and the state, and shares nothing with the
  // builder. The suites below compare the builder with it, and test the checker itself on malformed graphs and proofs.
  // ---------------------------------------------------------------------------------------------------------------

  var CP = SG.chainProofs;
  var CG = SG.chainGraph;

  function graphOf(m, state, options, ctxOptions) {
    return CG.build(m, state, ctxFor(m, ctxOptions), options);
  }

  function snapshotOf(state) {
    return { candidates: Array.from(state.candidates), value: Array.from(state.value), unsolved: state.unsolvedCount };
  }

  /** The index of the node { cells, digit } in a graph, or -1. */
  function indexOfNode(graph, cells, digit) {
    for (var i = 0; i < graph.nodes.length; i++) {
      if (graph.nodes[i].digit === digit && same(graph.nodes[i].cells, cells)) return i;
    }
    return -1;
  }

  function listed(graph, kind, i, j) {
    return graph[kind][i].indexOf(j) !== -1 && graph[kind][j].indexOf(i) !== -1;
  }

  function edgeTotal(lists) {
    return lists.reduce(function (sum, list) { return sum + list.length; }, 0) / 2;
  }

  /** A position where only the listed cells hold anything, the digit `digit` alone (so the graph is just its own). */
  function digitOnly(m, digit, cells) {
    var state = SG.model.initState(m);
    for (var c = 0; c < m.cellCount; c++) state.candidates[c] = cells.indexOf(c) === -1 ? 0 : bitOf(digit);
    return state;
  }

  /** A context whose parent-budget check counts its calls and throws `failWith` at the `failAt`-th one. */
  function checkingCtx(m, failAt, failWith) {
    var ctx = Object.assign({}, ctxFor(m), { check: function () {
      ctx.checks++;
      if (ctx.checks === failAt) throw failWith;
    } });
    ctx.checks = 0;
    return ctx;
  }

  function spentBudget() {
    return new SG.errors.GenerationError('budget.exceeded', { reason: 'nodes' });
  }

  /**
   * classic9 and two 3 x 3 windows that overlap the boxes (R2C2..R4C4 and R6C6..R8C8), of the given kind: 'window'
   * (a complete unit that gives strong and weak links but generates no group) or 'region' (a box-like unit whose
   * intersections with a line are groups, overlapping those of the boxes); `diagonal` adds the main diagonal ('diag').
   */
  var extraModels = {};
  function extraUnitsModel(windowKind, diagonal) {
    var tag = 'chain-' + windowKind + (diagonal ? '-diag' : '');
    if (!extraModels[tag]) {
      var base = SG.fixtures.models.boxGrid(tag + '-base', 3, 3);
      var units = Array.prototype.map.call(base.units, function (u) { return Array.from(u); });
      var meta = Array.prototype.slice.call(base.unitMeta);
      [[1, 1], [5, 5]].forEach(function (origin, k) {
        var cells = [];
        for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) cells.push((origin[0] + r) * 9 + origin[1] + c);
        units.push(cells);
        meta.push({ kind: windowKind, gridIndex: 0, label: 'W' + (k + 1) });
      });
      if (diagonal) {
        units.push([0, 10, 20, 30, 40, 50, 60, 70, 80]);
        meta.push({ kind: 'diag', gridIndex: 0, label: 'D1' });
      }
      extraModels[tag] = SG.model.create({ variantId: tag, digits: 9, units: units, unitMeta: meta,
        layout: base.layout });
    }
    return extraModels[tag];
  }

  function windowModel() {
    return extraUnitsModel('window', true);
  }

  function regionModel() {
    return extraUnitsModel('region', false);
  }

  /** classic9 and a partial all-different "cage" of R2C1 and R2C4 (a box-like unit that is not complete). */
  var cages9 = null;
  function cageModel() {
    if (cages9 === null) {
      var base = SG.fixtures.models.boxGrid('chain-cage-base', 3, 3);
      var units = Array.prototype.map.call(base.units, function (u) { return Array.from(u); });
      var meta = Array.prototype.slice.call(base.unitMeta);
      units.push([9, 12]);
      meta.push({ kind: 'cage', gridIndex: 0, label: 'K1', partial: true });
      cages9 = SG.model.create({ variantId: 'chain-cage', digits: 9, units: units, unitMeta: meta,
        layout: base.layout });
    }
    return cages9;
  }

  /** `grids` independent 4 x 4 boards side by side: 4 digits, 16 groups of two cells per digit and grid. */
  var farms = {};
  function gridFarm(grids) {
    if (!farms[grids]) {
      var units = [];
      var meta = [];
      var cellRow = [];
      var cellCol = [];
      for (var g = 0; g < grids; g++) {
        var base = g * 16;
        for (var i = 0; i < 4; i++) {
          var row = [];
          var col = [];
          for (var k = 0; k < 4; k++) {
            row.push(base + i * 4 + k);
            col.push(base + k * 4 + i);
          }
          units.push(row, col);
          meta.push({ kind: 'row', gridIndex: g, label: 'G' + g + 'R' + (i + 1) },
            { kind: 'col', gridIndex: g, label: 'G' + g + 'C' + (i + 1) });
        }
        for (var b = 0; b < 4; b++) {
          var top = Math.floor(b / 2) * 2;
          var left = (b % 2) * 2;
          units.push([base + top * 4 + left, base + top * 4 + left + 1, base + (top + 1) * 4 + left,
            base + (top + 1) * 4 + left + 1]);
          meta.push({ kind: 'box', gridIndex: g, label: 'G' + g + 'B' + (b + 1) });
        }
        for (var c = 0; c < 16; c++) {
          cellRow.push(0);
          cellCol.push(base + c);
        }
      }
      farms[grids] = SG.model.create({ variantId: 'chain-farm-' + grids, digits: 4, units: units, unitMeta: meta,
        layout: { rows: 1, cols: grids * 16, cellRow: cellRow, cellCol: cellCol } });
    }
    return farms[grids];
  }

  /**
   * classic9 and three extra units that are NOT complete, each crossing a complete unit of the right kind: a region
   * of four cells (too short) on row 2, a region of nine cells marked partial on rows 2 and 4, and a unit of kind 'row'
   * marked partial through boxes 1, 5 and 9 (the cells of the main diagonal).
   */
  var incomplete9 = null;
  function incompleteModel() {
    if (incomplete9 === null) {
      var base = SG.fixtures.models.boxGrid('chain-incomplete-base', 3, 3);
      var units = Array.prototype.map.call(base.units, function (u) { return Array.from(u); });
      var meta = Array.prototype.slice.call(base.unitMeta);
      [[[9, 10, 11, 12], 'region', false, 'S1'], [[9, 10, 11, 12, 13, 27, 28, 29, 30], 'region', true, 'S2'],
        [[0, 10, 20, 30, 40, 50, 60, 70, 80], 'row', true, 'S3']].forEach(function (spec) {
        var entry = { kind: spec[1], gridIndex: 0, label: spec[3] };
        if (spec[2]) entry.partial = true;
        units.push(spec[0]);
        meta.push(entry);
      });
      incomplete9 = SG.model.create({ variantId: 'chain-incomplete', digits: 9, units: units, unitMeta: meta,
        layout: base.layout });
    }
    return incomplete9;
  }

  /**
   * `rows` independent complete rows of four cells (digits 1..4) and `loose` more cells in partial cages of at most
   * four: the scans of a build are 8 * rows + loose steps (every cell, and the cells of the complete rows).
   */
  var rowFarms = {};
  function rowFarm(rows, loose) {
    var tag = rows + '-' + loose;
    if (!rowFarms[tag]) {
      var units = [];
      var meta = [];
      var cells = rows * 4 + loose;
      for (var r = 0; r < rows; r++) {
        units.push([r * 4, r * 4 + 1, r * 4 + 2, r * 4 + 3]);
        meta.push({ kind: 'row', gridIndex: 0, label: 'R' + (r + 1) });
      }
      for (var first = rows * 4; first < cells; first += 4) {
        var cage = [];
        for (var c = first; c < Math.min(cells, first + 4); c++) cage.push(c);
        units.push(cage);
        meta.push({ kind: 'cage', gridIndex: 0, label: 'K' + (first + 1), partial: true });
      }
      var cellCol = [];
      for (var k = 0; k < cells; k++) cellCol.push(k);
      rowFarms[tag] = SG.model.create({ variantId: 'chain-rowfarm-' + tag, digits: 4, units: units, unitMeta: meta,
        layout: { rows: 1, cols: cells, cellRow: cellCol.map(function () { return 0; }), cellCol: cellCol } });
    }
    return rowFarms[tag];
  }

  describe('grouped graph (R16): the API and the registered kernels', function () {
    it('exposes build and the two limits of R10 (4096 additional nodes, 50000 tested combinations) only', function () {
      expect(Object.keys(CG).sort()).toEqual(['LIMITS', 'build']);
      expect(CG.LIMITS).toEqual({ groups: 4096, work: 50000 });
      expect(Object.isFrozen(CG.LIMITS)).toBe(true);
      var graph = graphOf(model4, SG.model.initState(model4));
      expect(Object.keys(graph)).toEqual(['nodes', 'weak', 'strong', 'complete', 'work', 'capHit']);
    });

    it('is read by the grouped attempt of forcingChain and forcingChainLong and by no other finder (MS13c)',
      function () {
        if (!SG.test.node) SG.test.skip('needs the Node file system; skipped in the browser');
        var text = SG.test.node.fs.readFileSync(
          SG.test.node.path.join(SG.test.node.root, '../core/js/engine/tech-chain.js'), 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
        function count(pattern) { return (text.match(pattern) || []).length; }
        function body(name) {
          var found = new RegExp('\\n  function ' + name + '\\([\\s\\S]*?\\n  }\\r?\\n').exec(text);
          expect([name, found !== null]).toEqual([name, true]);
          return found[0];
        }
        // its declaration, the entry of SG.chainGraph and the one call of the grouped attempt
        expect(count(/\bbuildGraph\b/g)).toBe(3);
        expect(count(/\bconstructGraph\b/g)).toBe(2); // its declaration and the one call inside buildGraph
        expect(/\bbuildGraph\(/.test(body('groupedAttempt'))).toBe(true);
        // the two grouped ids hand their spec to the grouped route, and no longer to the singleton search
        ['findForcingChain', 'findForcingChainLong'].forEach(function (name) {
          expect([name, /\bgroupedForcing\(/.test(body(name)), /\bforcingWith\(/.test(body(name))])
            .toEqual([name, true, false]);
        });
        // every other finder and the singleton seam never mention the graph, the grouped search or its limits
        ['findXyChain', 'findNishio', 'findNishioDeep', 'forcingWith', 'scanForcing', 'chainForcing',
          'chainNishio', 'buildStrongLinks', 'scratchFor', 'singletonFallback'].forEach(function (name) {
          expect([name, /Graph|graph|grouped|Grouped|GROUP_|searchAdjacency/.test(body(name))])
            .toEqual([name, false]);
        });
      });

    it('changes no Finding and no observer record of the registered finders and the seam, built in between or not',
      function () {
        var items = H.randomStatesWithKnownSolution(model9, SG.testkit.rng.create(8701), 10)
          .concat(prunedStates(model6, SG.testkit.rng.create(8702), 10, function (r) { return 0.05 + 0.2 * r.next(); }));
        function results() {
          return items.map(function (item) {
            var m = item.state.unsolvedCount > 0 && item.solution.length === 36 ? model6 : model9;
            var out = ['xyChain', 'forcingChain', 'forcingChainLong', 'nishio'].map(function (id) {
              var records = [];
              var finding = run(id, m, item.state, { onPatternWork: function (r) { records.push(r); } });
              return { finding: finding, records: records };
            });
            var seamRecords = [];
            var seam = SG.chainSearch.forcing(m, item.state, ctxFor(m, { onPatternWork: function (r) {
              seamRecords.push(r);
            } }), { id: 'probe', minLength: 1, maxLength: 8 });
            out.push({ finding: seam, records: seamRecords });
            return out;
          });
        }
        var before = JSON.stringify(results());
        items.forEach(function (item) {
          var m = item.solution.length === 36 ? model6 : model9;
          expect(graphOf(m, item.state, { workLimit: 1000000 }).complete).toBe(true);
        });
        expect(JSON.stringify(results())).toBe(before);
      });
  });

  describe('grouped graph (R16): the edge obligations of the brief, one vector at a time', function () {
    // Predicate vectors on boards where one digit stays in the listed cells only (every other digit is untouched).
    // They are synthetic unit tests of the obligations, never help examples of the product. Every vector is checked
    // with the independent predicates of SG.chainProofs and with the builder (where both nodes are canonical).
    function node(cells, digit) {
      return { cells: cells, digit: digit === undefined ? 5 : digit };
    }

    /** Asserts the two relations with the checker, and in the builder's graph when both nodes are in it. */
    function links(m, state, a, b, weak, strong, label) {
      expect([label, 'checker weak', CP.weakLinked(m, state, a, b)]).toEqual([label, 'checker weak', weak]);
      expect([label, 'checker strong', CP.strongLinked(m, state, a, b)]).toEqual([label, 'checker strong', strong]);
      var graph = graphOf(m, state);
      expect(CP.graphProblems(m, state, graph)).toEqual([]);
      var i = indexOfNode(graph, a.cells, a.digit);
      var j = indexOfNode(graph, b.cells, b.digit);
      if (i !== -1 && j !== -1) {
        expect([label, 'builder weak', listed(graph, 'weak', i, j)]).toEqual([label, 'builder weak', weak]);
        expect([label, 'builder strong', listed(graph, 'strong', i, j)]).toEqual([label, 'builder strong', strong]);
      }
      return graph;
    }

    it('same-digit weak: disjoint groups and EVERY cross pair in conflict (R1C1 R1C2 against R2C1 R2C2: all four)',
      function () {
        var state = digitOnly(model9, 5, [0, 1, 9, 10]);
        var graph = links(model9, state, node([0, 1]), node([9, 10]), true, true, 'two rows of a box');
        // the same cells read the other way: the two columns of the box are weak, too, and they overlap the rows
        expect(indexOfNode(graph, [0, 9], 5)).not.toBe(-1);
        links(model9, state, node([0, 9]), node([1, 10]), true, true, 'two columns of a box');
        links(model9, state, node([0, 1]), node([0, 9]), false, false, 'groups that share R1C1');
      });

    it('same-digit weak: one missing pair is no link, however convenient the other pairs are', function () {
      // R1C1 sees R4C1 and R5C1 (a column) but R1C2 sees neither: two of the four pairs, not a link
      var state = digitOnly(model9, 5, [0, 1, 27, 36]);
      var graph = links(model9, state, node([0, 1]), node([27, 36]), false, false, 'two of four pairs');
      var group = indexOfNode(graph, [0, 1], 5);
      var low = indexOfNode(graph, [27], 5);
      expect([indexOfNode(graph, [0], 5) !== -1, listed(graph, 'weak', indexOfNode(graph, [0], 5), low)])
        .toEqual([true, true]);
      expect(listed(graph, 'weak', group, low)).toBe(false); // R1C1 sees R4C1, the group {R1C1, R1C2} does not
      expect(listed(graph, 'weak', group, indexOfNode(graph, [36], 5))).toBe(false);
      // exactly one missing pair: R1C1 R1C2 against R1C4 and R4C1 (R1C2 does not see R4C1); a node the builder has no
      // reason to hold, so only the independent predicate speaks
      var three = digitOnly(model9, 5, [0, 1, 3, 27]);
      expect(CP.weakLinked(model9, three, node([0, 1]), node([3, 27]))).toBe(false);
      expect(CP.weakLinked(model9, three, node([0, 1]), node([3]))).toBe(true);
      expect(CP.weakLinked(model9, three, node([0]), node([3, 27]))).toBe(true);
    });

    it('overlapping groups are never weak or strong, even when together they are all the occurrences of a unit',
      function () {
        // classic9: {R1C1, R1C2} (box 1, row 1) and {R1C1, R2C1} (box 1, column 1) share R1C1 and together are all of box 1
        var shared = digitOnly(model9, 5, [0, 1, 9]);
        links(model9, shared, node([0, 1]), node([0, 9]), false, false, 'two groups that share a cell');
        // an overlap that fakes the count: six cells of box 1 hold the digit, and its row 1 and column 3 parts are
        // 3 + 3 cells, but together they cover only five of them (they share R1C3): no strong link
        var faked9 = digitOnly(model9, 5, [0, 1, 2, 10, 11, 20]);
        links(model9, faked9, node([0, 1, 2]), node([2, 11, 20]), false, false, 'row and column parts of one box');
        // a model with extra regions on top of the boxes: the box and the region of row 2 overlap
        var m = regionModel();
        // row 2 holds the digit in R2C1..R2C4 only: the box gives {C1,C2,C3}, the region {C2,C3,C4} (they overlap)
        var state = digitOnly(m, 5, [9, 10, 11, 12]);
        var graph = links(m, state, node([9, 10, 11]), node([10, 11, 12]), false, false, 'box and region of a row');
        expect(indexOfNode(graph, [9, 10, 11], 5)).not.toBe(-1);
        expect(indexOfNode(graph, [10, 11, 12], 5)).not.toBe(-1);
        // the disjoint singleton and group of the same row are the strong link of the row
        links(m, state, node([9, 10, 11]), node([12]), true, true, 'a group and the rest of the row');
        links(m, state, node([9]), node([10, 11, 12]), true, true, 'the rest of the row and a group');
        // an overlap that fakes the count: six cells of row 2 hold the digit, and the box and the region groups are
        // 3 + 3 cells, but together they cover only four of them: no strong link; the two boxes of the row are one
        var faked = digitOnly(m, 5, [9, 10, 11, 12, 13, 14]);
        links(m, faked, node([9, 10, 11]), node([10, 11, 12]), false, false, 'overlap with the count of the row');
        links(m, faked, node([9, 10, 11]), node([12, 13, 14]), true, true, 'the two boxes of the row');
      });

    it('same-digit strong: disjoint nodes that are exactly the occurrences of a complete unit; one more is no link',
      function () {
        // row 1 holds the digit in R1C1, R1C2 and R1C4 only: the box 1 part {R1C1, R1C2} and R1C4 are the whole row
        var exact = digitOnly(model9, 5, [0, 1, 3]);
        links(model9, exact, node([0, 1]), node([3]), true, true, 'exactly the occurrences of the row');
        // one more occurrence in the row (R1C7, in another box): the nodes no longer cover the row
        var more = digitOnly(model9, 5, [0, 1, 3, 6]);
        var graph = links(model9, more, node([0, 1]), node([3]), true, false, 'one more occurrence in the row');
        // the group is the whole box 1 and not the whole row: it has no strong link at all
        expect(graph.strong[indexOfNode(graph, [0, 1], 5)]).toEqual([]);
        // an occurrence of another unit does not matter: R3C3 is in box 1 but not in row 1
        links(model9, digitOnly(model9, 5, [0, 1, 3, 20]), node([0, 1]), node([3]), true, true, 'outside the row');
        // a digit that is already placed in the unit gives no strong link (a state that is not peer consistent)
        var placed = digitOnly(model9, 5, [0, 1, 3]);
        placed.value[8] = 5;
        placed.candidates[8] = bitOf(5);
        links(model9, placed, node([0, 1]), node([3]), true, false, 'the digit is placed in the row');
      });

    it('a partial unit gives weak links (all-different) and never a strong one, whatever it covers', function () {
      var m = partialUnitModel();
      // the partial group is R1C1, R2C2 and R3C3 (cells 0, 5, 10); R2C2 and R3C3 share only that unit
      var partial = digitOnly(m, 1, [5, 10]);
      links(m, partial, node([5], 1), node([10], 1), true, false, 'only a partial unit holds both');
      var three = digitOnly(m, 1, [0, 5, 10]);
      links(m, three, node([0], 1), node([5], 1), true, true, 'a box holds exactly both');
      links(m, three, node([5], 1), node([10], 1), true, false, 'the partial unit would hold all three');
    });

    it('groups come from complete boxes and regions with complete lines only: a partial cage, a window and a ' +
      'diagonal make none, but windows and diagonals still link', function () {
        var m = cageModel();
        // R2C1 and R2C4 are in the partial cage and in row 2, but in no common box
        var state = digitOnly(m, 5, [9, 12]);
        var graph = graphOf(m, state);
        expect(graph.complete).toBe(true);
        expect(indexOfNode(graph, [9, 12], 5)).toBe(-1);
        expect(CP.graphProblems(m, state, graph)).toEqual([]);
        links(m, state, node([9]), node([12]), true, true, 'the cage is weak, the complete row strong');
        // a window is a complete unit of another kind: its intersection with row 2 is no group, but the box part is
        var windows = windowModel();
        var wstate = digitOnly(windows, 5, [10, 11, 12]);
        var wgraph = graphOf(windows, wstate);
        expect(indexOfNode(wgraph, [10, 11, 12], 5)).toBe(-1);
        expect(indexOfNode(wgraph, [10, 11], 5)).not.toBe(-1);
        expect(CP.graphProblems(windows, wstate, wgraph)).toEqual([]);
        // the window and the diagonal give strong links: the only two places of the digit in them (nothing else joins
        // R2C3 with R4C2, or R1C1 with R9C9), and their peers give weak links
        links(windows, digitOnly(windows, 5, [11, 28]), node([11]), node([28]), true, true, 'the two cells of a window');
        links(windows, digitOnly(windows, 5, [0, 80]), node([0]), node([80]), true, true, 'the two cells of the diagonal');
        links(windows, digitOnly(windows, 5, [11, 28, 12]), node([11]), node([28]), true, false,
          'a third occurrence in the window');
        // the key order puts a prefix first: {R2C2, R2C3} (the box part of the row) before {R2C2, R2C3, R2C4} (the
        // part of a region); both are groups of box-like units
        var regions = regionModel();
        var rstate = digitOnly(regions, 5, [10, 11, 12]);
        var rgraph = graphOf(regions, rstate);
        expect(indexOfNode(rgraph, [10, 11], 5)).not.toBe(-1);
        expect(indexOfNode(rgraph, [10, 11, 12], 5)).not.toBe(-1);
        expect(indexOfNode(rgraph, [10, 11], 5)).toBeLessThan(indexOfNode(rgraph, [10, 11, 12], 5));
        expect(CP.graphProblems(regions, rstate, rgraph)).toEqual([]);
      });

    it('a box, a region or a line that is not complete makes no group: too short, or marked partial, whatever its ' +
      'cells hold; the complete ones beside it still do', function () {
        var m = incompleteModel();
        // the digit in R2C1..R2C5 (9..13), R4C1..R4C4 (27..30), R1C1 (0) and the diagonal cells 10, 20, 40
        var state = digitOnly(m, 5, [0, 9, 10, 11, 12, 13, 20, 27, 28, 29, 30, 40]);
        var graph = graphOf(m, state);
        expect(graph.complete).toBe(true);
        expect(CP.graphProblems(m, state, graph)).toEqual([]);
        // the short region S1 (9..12) and the partial region S2 (9..13 on row 2, 27..30 on row 4) make none
        expect(indexOfNode(graph, [9, 10, 11, 12], 5)).toBe(-1);
        expect(indexOfNode(graph, [9, 10, 11, 12, 13], 5)).toBe(-1);
        expect(indexOfNode(graph, [27, 28, 29, 30], 5)).toBe(-1);
        // the partial row-kind unit S3 crosses box 1 in R1C1, R2C2 and R3C3 (0, 10, 20): no group of it either
        expect(indexOfNode(graph, [0, 10, 20], 5)).toBe(-1);
        expect(indexOfNode(graph, [0, 10], 5)).toBe(-1);
        expect(indexOfNode(graph, [10, 20], 5)).toBe(-1);
        // the complete boxes and rows of the same position do: box 1 with row 2, box 4 with row 4, box 2 with row 2
        expect(indexOfNode(graph, [9, 10, 11], 5)).not.toBe(-1);
        expect(indexOfNode(graph, [27, 28, 29], 5)).not.toBe(-1);
        expect(indexOfNode(graph, [12, 13], 5)).not.toBe(-1);
        // and the graph is as large as the checker's expectation, which generates from complete units only
        expect(graph.nodes.length).toBe(CP.expectedNodes(m, state).nodes.length);
      });

    it('a solved cell is no occurrence: one open 5 beside a solved 5 in an intersection forms no group', function () {
      // a state that is not peer consistent: R1C3 is solved with the 5 and R1C1 still holds it
      var state = digitOnly(model9, 5, [0]);
      state.value[2] = 5;
      state.candidates[2] = bitOf(5);
      var graph = graphOf(model9, state);
      expect(graph.nodes).toEqual([{ cells: [0], digit: 5 }]);
      expect(CP.graphProblems(model9, state, graph)).toEqual([]);
      // and a solved cell is no singleton node, however many candidates the state keeps for it
      var solved = digitOnly(model9, 5, [0, 1]);
      solved.value[1] = 5;
      expect(graphOf(model9, solved).nodes).toEqual([{ cells: [0], digit: 5 }]);
    });

    it('different digits link only as the singletons of one cell: weak always, strong for a bivalue cell', function () {
      var state = SG.model.initState(model9);
      state.candidates[0] = bitOf(3) | bitOf(5);
      state.candidates[1] = bitOf(3) | bitOf(5) | bitOf(7);
      state.candidates[2] = bitOf(1); // R1C3 does not hold the 5: R1C1 and R1C2 are the box 1 part of row 1
      for (var c = 3; c < model9.cellCount; c++) state.candidates[c] = 0; // nothing else, to keep the graph small
      var graph = graphOf(model9, state);
      expect(CP.graphProblems(model9, state, graph)).toEqual([]);
      links(model9, state, node([0], 3), node([0], 5), true, true, 'a bivalue cell');
      links(model9, state, node([1], 3), node([1], 5), true, false, 'a trivalue cell');
      links(model9, state, node([1], 5), node([1], 7), true, false, 'another pair of a trivalue cell');
      // a group never links to another digit, not even to a candidate of one of its own cells
      var group = indexOfNode(graph, [0, 1], 5);
      expect(group).not.toBe(-1);
      expect(graph.weak[group].map(function (i) { return graph.nodes[i].digit; }).filter(function (d) {
        return d !== 5;
      })).toEqual([]);
      expect(graph.strong[group].map(function (i) { return graph.nodes[i].digit; }).filter(function (d) {
        return d !== 5;
      })).toEqual([]);
      links(model9, state, node([0, 1], 5), node([0], 3), false, false, 'a group and a candidate of one member cell');
      // two candidates of two cells are not linked either
      links(model9, state, node([0], 3), node([1], 5), false, false, 'different digits in two cells');
    });
  });

  describe('grouped graph (R16): agreement with the independent checker', function () {
    var BIG = { workLimit: 100000000 };
    var samurai = SG.fixtures.models.samurai();

    function pruned(m, count, seed, low, span) {
      return prunedStates(m, SG.testkit.rng.create(seed), count, function (r) { return low + span * r.next(); });
    }

    /** The positions of this block: { label, model, state, solution (null when there is none to hold) }. */
    var positions = null;
    function corpus() {
      if (positions !== null) return positions;
      positions = [];
      function add(label, m, items) {
        items.forEach(function (item, i) {
          positions.push({ label: label + ' #' + i, model: m, state: item.state, solution: item.solution || null });
        });
      }
      add('classic9 puzzle', model9, H.randomStatesWithKnownSolution(model9, SG.testkit.rng.create(8801), 6));
      add('classic9 pruned', model9, pruned(model9, 10, 8802, 0.03, 0.2));
      add('classic6 pruned', model6, pruned(model6, 16, 8803, 0.05, 0.3));
      add('classic4 pruned', model4, pruned(model4, 16, 8804, 0.05, 0.5));
      var model12 = SG.fixtures.models.boxGrid('chain-box12', 3, 4);
      var model16 = SG.fixtures.models.boxGrid('chain-box16', 4, 4);
      add('12 digits pruned', model12, pruned(model12, 2, 8805, 0.02, 0.06));
      add('16 digits pruned', model16, pruned(model16, 1, 8806, 0.01, 0.03));
      add('samurai pruned', samurai, pruned(samurai, 1, 8807, 0.01, 0.04));
      var partial = partialUnitModel();
      add('partial unit pruned', partial, pruned(partial, 24, 8808, 0.05, 0.5));
      var rng = SG.testkit.rng.create(8809);
      for (var k = 0; k < 3; k++) {
        var irregular = irregularModel(rng.fork('model.' + k), 'chain-graph-irregular-' + k);
        add('irregular 6x6 #' + k + ' pruned', irregular, pruned(irregular, 8, 8810 + k, 0.05, 0.3));
      }
      var windows = windowModel();
      add('windows and diagonal pruned', windows, pruned(windows, 8, 8820, 0.03, 0.15));
      var regions = regionModel();
      add('overlapping regions pruned', regions, pruned(regions, 8, 8821, 0.03, 0.15));
      add('blank classic9', model9, [{ state: SG.model.initState(model9) }]);
      add('blank windows and diagonal', windows, [{ state: SG.model.initState(windows) }]);
      add('blank overlapping regions', regions, [{ state: SG.model.initState(regions) }]);
      add('blank classic4', model4, [{ state: SG.model.initState(model4) }]);
      return positions;
    }

    it('is exactly the canonical graph of every position: nodes, weak and strong edges both ways, and the units it ' +
      'charges', function () {
        var seen = { positions: 0, groups: 0, groupWeak: 0, groupStrong: 0, groupGroupStrong: 0, nodes: 0 };
        corpus().forEach(function (item) {
          var graph = graphOf(item.model, item.state, BIG);
          expect([item.label, graph.complete, graph.capHit]).toEqual([item.label, true, null]);
          expect([item.label, CP.graphProblems(item.model, item.state, graph)]).toEqual([item.label, []]);
          expect([item.label, graph.work]).toEqual([item.label, CP.expectedWork(item.model, item.state).total]);
          if (item.solution !== null) {
            expect([item.label, CP.solutionProblems(item.model, graph, item.solution)]).toEqual([item.label, []]);
          }
          seen.positions++;
          seen.nodes += graph.nodes.length;
          graph.nodes.forEach(function (node, i) {
            if (node.cells.length > 1) seen.groups++;
            graph.weak[i].forEach(function (j) {
              if (j > i && node.cells.length > 1 && graph.nodes[j].cells.length > 1) seen.groupWeak++;
            });
            graph.strong[i].forEach(function (j) {
              if (j <= i) return;
              if (node.cells.length > 1 || graph.nodes[j].cells.length > 1) seen.groupStrong++;
              if (node.cells.length > 1 && graph.nodes[j].cells.length > 1) seen.groupGroupStrong++;
            });
          });
        });
        // the corpus is not vacuous: groups, weak links between groups and strong links with groups all occur
        expect(seen.positions).toBeGreaterThanOrEqual(90);
        expect(seen.groups).toBeGreaterThan(2000);
        expect(seen.groupWeak).toBeGreaterThan(500);
        expect(seen.groupStrong).toBeGreaterThan(100);
        expect(seen.groupGroupStrong).toBeGreaterThan(10);
      });

    it('keeps the old graph on the singletons: the weak and strong links of the forcingChain checker, pair by pair',
      function () {
        var compared = 0;
        corpus().forEach(function (item) {
          if (item.model.cellCount > 100) return;
          var graph = graphOf(item.model, item.state, BIG);
          var singles = 0;
          while (singles < graph.nodes.length && graph.nodes[singles].cells.length === 1) singles++;
          for (var i = 0; i < singles; i++) {
            for (var j = i + 1; j < singles; j++) {
              var a = [graph.nodes[i].cells[0], graph.nodes[i].digit];
              var b = [graph.nodes[j].cells[0], graph.nodes[j].digit];
              if (weakLinked(item.model, item.state, a, b) !== listed(graph, 'weak', i, j)) {
                fail(item.label + ': the weak link of ' + JSON.stringify(a) + ' and ' + JSON.stringify(b) + ' differs');
              }
              if (strongLinked(item.model, item.state, a, b) !== listed(graph, 'strong', i, j)) {
                fail(item.label + ': the strong link of ' + JSON.stringify(a) + ' and ' + JSON.stringify(b) +
                  ' differs');
              }
              compared++;
            }
          }
        });
        expect(compared).toBeGreaterThan(500000);
      });

    it('deduplicates groups on the same cells and sorts them by [digit, ...cells], after the singletons', function () {
      // two boxes on the same cells (the overlap of a Samurai board) give one node, not two
      var blank = SG.model.initState(samurai);
      var wanted = CP.expectedNodes(samurai, blank);
      expect(wanted.raw.length).toBeGreaterThan(wanted.groups.length);
      var graph = graphOf(samurai, blank, BIG);
      expect(graph.nodes.slice(0, wanted.singletons.length)).toEqual(wanted.singletons);
      expect(graph.nodes.slice(wanted.singletons.length)).toEqual(wanted.groups);
      expect(graph.work).toBe(CP.expectedWork(samurai, blank).total);
      // the key order, written here once more: the digit, then the cells element by element, a prefix first
      function before(a, b) {
        if (a.digit !== b.digit) return a.digit < b.digit;
        for (var k = 0; k < Math.min(a.cells.length, b.cells.length); k++) {
          if (a.cells[k] !== b.cells[k]) return a.cells[k] < b.cells[k];
        }
        return a.cells.length < b.cells.length;
      }
      corpus().forEach(function (item) {
        var nodes = graphOf(item.model, item.state, BIG).nodes;
        var first = nodes.findIndex(function (node) { return node.cells.length > 1; });
        for (var i = first + 1; first !== -1 && i < nodes.length; i++) {
          if (!before(nodes[i - 1], nodes[i])) fail(item.label + ': groups ' + (i - 1) + ' and ' + i + ' are not in key order');
        }
      });
    });

    it('builds a blank classic9 board with more nodes than cells x digits, in the order of the brief', function () {
      // 729 singletons, then 54 groups for each digit: the old tables (one entry per cell and digit) could not hold
      // it; the default work limit of 50,000 is not enough for it (84,807 units), so the limit is lifted here
      var blank = SG.model.initState(model9);
      var graph = graphOf(model9, blank, BIG);
      expect(graph.complete).toBe(true);
      expect(graph.nodes.length).toBe(81 * 9 + 54 * 9);
      expect(graph.nodes.length).toBeGreaterThan(model9.cellCount * model9.digits);
      expect(graph.weak.length).toBe(graph.nodes.length);
      expect(graph.strong.length).toBe(graph.nodes.length);
      expect(graph.work).toBe(84807);
      expect(CP.graphProblems(model9, blank, graph)).toEqual([]);
      expect(graph.nodes[0]).toEqual({ cells: [0], digit: 1 });
      expect(graph.nodes[1]).toEqual({ cells: [0], digit: 2 });
      expect(graph.nodes[9]).toEqual({ cells: [1], digit: 1 });
      expect(graph.nodes[729]).toEqual({ cells: [0, 1, 2], digit: 1 });
      expect(graph.nodes[730]).toEqual({ cells: [0, 9, 18], digit: 1 });
      expect(graph.nodes[729 + 53]).toEqual({ cells: [78, 79, 80], digit: 1 });
      expect(graph.nodes[729 + 54]).toEqual({ cells: [0, 1, 2], digit: 2 });
      expect(graph.nodes[graph.nodes.length - 1]).toEqual({ cells: [78, 79, 80], digit: 9 });
    });
  });

  describe('grouped graph (R16): limits, budget and the incomplete-graph rule', function () {
    // The blank classic9 board: 486 group candidates, 81 cells x 36 candidate pairs, and 9 digits x C(135, 2) = 81,405
    // pairs of nodes of one digit (every pair is charged, before the test that its first cells see each other)
    var BLANK_WORK = 84807;
    var LIFTED = 100000000;
    var BIG = { workLimit: LIFTED };

    function blank9() {
      return SG.model.initState(model9);
    }

    /** The graph of an incomplete call is empty: nothing a search could mistake for the whole graph. */
    function expectIncomplete(graph, capHit, work) {
      expect([graph.complete, graph.capHit, graph.work]).toEqual([false, capHit, work]);
      expect(graph.nodes).toEqual([]);
      expect(graph.weak).toEqual([]);
      expect(graph.strong).toEqual([]);
    }

    it('charges one unit per tested combination: a group candidate, a pair of candidates of a cell, and every pair ' +
      'of nodes of a digit', function () {
        expect(CP.expectedWork(model9, blank9())).toEqual({ groups: 486, cells: 2916, pairs: 81405, total: BLANK_WORK });
        expect(graphOf(model9, blank9(), BIG).work).toBe(BLANK_WORK);
        // the nodes of a position that is all solved: nothing to test
        var solved = H.makeState(model9, F.unique[0].solution, { propagate: false });
        expect(graphOf(model9, solved)).toEqual({ nodes: [], weak: [], strong: [], complete: true, work: 0,
          capHit: null });
        // the pairs whose first cells do not see each other are charged, too: three cells that see nothing of each
        // other cost the three pairs
        var sparse = digitOnly(model9, 5, [0, 40, 80]);
        expect(graphOf(model9, sparse).work).toBe(3);
        expect(CP.expectedWork(model9, sparse)).toEqual({ groups: 0, cells: 0, pairs: 3, total: 3 });
      });

    it('stops at the work limit: W is complete, W - 1 an empty incomplete graph with capHit "work" and work = the ' +
      'limit', function () {
        var state = blank9();
        var full = graphOf(model9, state, BIG);
        [BLANK_WORK, BLANK_WORK + 0.9, BLANK_WORK + 1, LIFTED].forEach(function (limit) {
          expect([limit, JSON.stringify(graphOf(model9, state, { workLimit: limit }))])
            .toEqual([limit, JSON.stringify(full)]);
        });
        [[BLANK_WORK - 1, BLANK_WORK - 1], [BLANK_WORK - 0.5, BLANK_WORK - 1], [50000, 50000], [1000, 1000],
          [486, 486], [487, 487], [1, 1], [0.9, 0], [0, 0]].forEach(function (row) {
          expectIncomplete(graphOf(model9, state, { workLimit: row[0] }), 'work', row[1]);
        });
        // the default limit is 50000: the blank classic9 board needs 84,807 units and is incomplete, not a reason to
        // raise the limit; a blank Samurai board is past it, too
        expectIncomplete(graphOf(model9, state), 'work', 50000);
        expectIncomplete(graphOf(SG.fixtures.models.samurai(), SG.model.initState(SG.fixtures.models.samurai())),
          'work', 50000);
        // a position of the real kind (most of the candidates gone) is well within it
        var real = prunedStates(model9, SG.testkit.rng.create(8903), 2, function () { return 0.1; })[1];
        expect(graphOf(model9, real.state).complete).toBe(true);
      });

    it('refuses the 4097th additional node (limit 4096, default) and builds 4096 of them, more nodes than ' +
      'cells x digits', function () {
        var farm = gridFarm(65);
        function position(extra) {
          var state = SG.model.initState(farm);
          for (var c = 1024; c < 1040; c++) state.candidates[c] = 0; // the 65th board holds nothing
          if (extra) {
            state.candidates[1024] = bitOf(1);
            state.candidates[1025] = bitOf(1);
          }
          return state;
        }
        var graph = graphOf(farm, position(false), BIG);
        expect([graph.complete, graph.capHit, graph.nodes.length]).toEqual([true, null, 4096 + 4096]);
        expect(graph.nodes.filter(function (node) { return node.cells.length > 1; }).length).toBe(4096);
        expect(graph.nodes.length).toBeGreaterThan(farm.cellCount * farm.digits);
        expect(CP.expectedNodes(farm, position(false)).groups.length).toBe(4096);
        // one more distinct group, one more refusal: at its own attempt (the 4097th), before any pair of nodes was
        // tested, with a work limit that is no obstacle
        expect(CP.expectedNodes(farm, position(true)).groups.length).toBe(4097);
        expectIncomplete(graphOf(farm, position(true), BIG), 'nodes', 4097);
        expectIncomplete(graphOf(farm, position(true)), 'nodes', 4097);
        // allowing 4096 groups does not promise a complete graph: with the default limits the board is past 50,000
        expectIncomplete(graphOf(farm, position(false)), 'work', 50000);
      });

    it('takes the quota of additional nodes from the option too, and enforces it while the groups are collected',
      function () {
        var state = blank9();
        function quota(limit) { return graphOf(model9, state, { groupLimit: limit, workLimit: LIFTED }); }
        expect(quota(486).complete).toBe(true);
        expect(quota(486.9).complete).toBe(true);
        expect(quota(100000).complete).toBe(true);
        // exactly the limit is allowed; the next distinct group refuses at its own attempt, not after the whole set
        expectIncomplete(quota(485), 'nodes', 486);
        expectIncomplete(quota(485.5), 'nodes', 486);
        expectIncomplete(quota(10), 'nodes', 11);
        expectIncomplete(quota(0), 'nodes', 1);
        // the work cap and the quota: whichever is reached first
        expectIncomplete(graphOf(model9, state, { groupLimit: 10, workLimit: 5 }), 'work', 5);
        expectIncomplete(graphOf(model9, state, { groupLimit: 10, workLimit: 11 }), 'nodes', 11);
        expectIncomplete(graphOf(model9, state, { groupLimit: 10, workLimit: 10 }), 'work', 10);
        // a model without lines has no group: a quota of 0 costs nothing
        var ring = ringModel(6);
        var ringState = SG.model.initState(ring);
        expect(graphOf(ring, ringState, { groupLimit: 0 }).complete).toBe(true);
        expect(CP.graphProblems(ring, ringState, graphOf(ring, ringState))).toEqual([]);
        // a Samurai board repeats a group on the cells of two boxes: a repeat spends work and no slot, so a quota
        // of the number of distinct groups is enough, and one less refuses between that many and all attempts
        var samurai = SG.fixtures.models.samurai();
        var empty = SG.model.initState(samurai);
        var unique = CP.expectedNodes(samurai, empty).groups.length;
        var attempts = CP.expectedNodes(samurai, empty).raw.length;
        expect(attempts).toBeGreaterThan(unique);
        var enough = graphOf(samurai, empty, { groupLimit: unique, workLimit: LIFTED });
        expect([enough.complete, enough.nodes.length - CP.expectedNodes(samurai, empty).singletons.length])
          .toEqual([true, unique]);
        var refused = graphOf(samurai, empty, { groupLimit: unique - 1, workLimit: LIFTED });
        expectIncomplete(refused, 'nodes', refused.work);
        expect(refused.work).toBeGreaterThanOrEqual(unique);
        expect(refused.work).toBeLessThanOrEqual(attempts);
      });

    it('refuses options that are not a finite number of at least 0 with solver.invalidOption, and floors the ' +
      'others', function () {
        var state = SG.model.initState(model4);
        [-1, NaN, Infinity, -Infinity, '5', null, {}, [], true].forEach(function (bad) {
          ['workLimit', 'groupLimit'].forEach(function (key) {
            var options = {};
            options[key] = bad;
            var err = caught(function () { graphOf(model4, state, options); });
            expect([key, String(bad), err && err.code]).toEqual([key, String(bad), 'solver.invalidOption']);
            expect(err.message).toContain(key);
          });
        });
        [null, 5, 'x', true].forEach(function (bad) {
          var err = caught(function () { graphOf(model4, state, bad); });
          expect([String(bad), err && err.code]).toEqual([String(bad), 'solver.invalidOption']);
        });
        expect(graphOf(model4, state, {}).complete).toBe(true);
        expect(graphOf(model4, state, { workLimit: undefined, groupLimit: undefined }).complete).toBe(true);
        expectIncomplete(graphOf(model4, state, { workLimit: 7.9 }), 'work', 7);
      });

    /** The work at each parent-budget check of a call: the `k`-th check throws a spent budget, the call reports. */
    function checkWorks(m, state, options) {
      var free = checkingCtx(m);
      var whole = CG.build(m, state, free, options);
      var works = [];
      for (var k = 1; k <= free.checks; k++) {
        var counting = checkingCtx(m, k, spentBudget());
        var graph = CG.build(m, state, counting, options);
        expect([k, graph.complete, graph.capHit, counting.checks]).toEqual([k, false, null, k]);
        works.push(graph.work);
      }
      return { checks: free.checks, works: works, work: whole.work, graph: whole };
    }

    it('checks the parent budget at entry, after the set-up, once per 256 steps of its uncharged scans and so that ' +
      'no more than 256 charged units pass between two checks', function () {
        // a position of 81 cells: its scans are 486 steps (the cells, 162 cells of intersections, 243 cells of units)
        var ticks = CP.expectedTicks(model9);
        expect(ticks).toBe(81 + 162 + 243);
        [486, 487, 512, 600, 767, 768, 769, 1000, 3000].forEach(function (limit) {
          var counting = checkingCtx(model9);
          var graph = CG.build(model9, blank9(), counting, { workLimit: limit });
          expect([limit, graph.work, counting.checks])
            .toEqual([limit, limit, 2 + Math.floor(ticks / 256) + Math.floor((limit - 1) / 256)]);
        });
        // every check, one by one: the work done when each one ran, in order
        var seen = checkWorks(model9, blank9(), { workLimit: 3000 });
        expect(seen.checks).toBe(2 + 1 + Math.floor(2999 / 256));
        // the entry and the one after the set-up come with no work, the 256th charged unit is the third check, and the
        // check in the scan of the units (the 256th step of 486) comes after the 486 group candidates
        expect(seen.works.slice(0, 5)).toEqual([0, 0, 256, 486, 512]);
        var gaps = seen.works.map(function (w, i) { return w - (i === 0 ? 0 : seen.works[i - 1]); });
        gaps.push(seen.work - seen.works[seen.works.length - 1]);
        expect(Math.max.apply(null, gaps)).toBeLessThanOrEqual(256);
        // a position with nothing to test still checks at entry, after the set-up and in its scans
        var solved = H.makeState(model9, F.unique[0].solution, { propagate: false });
        var empty = checkingCtx(model9);
        CG.build(model9, solved, empty);
        expect(empty.checks).toBe(2 + Math.floor(ticks / 256));
      });

    it('checks during the uncharged scans of a larger board, with no work done yet, and in charged cadence after',
      function () {
        var farm = gridFarm(20);
        var ticks = CP.expectedTicks(farm);
        expect(ticks).toBe(320 + 640 + 960);
        var seen = checkWorks(farm, SG.model.initState(farm), { workLimit: 3000 });
        expect(seen.checks).toBe(2 + Math.floor(ticks / 256) + Math.floor(2999 / 256));
        // entry, set-up, and the 256th cell of the state: three checks before any unit is charged
        expect(seen.works.slice(0, 3)).toEqual([0, 0, 0]);
        var gaps = seen.works.map(function (w, i) { return w - (i === 0 ? 0 : seen.works[i - 1]); });
        gaps.push(seen.work - seen.works[seen.works.length - 1]);
        expect(Math.max.apply(null, gaps)).toBeLessThanOrEqual(256);
      });

    it('checks once per 256 scan steps exactly, not per 255 or 257: positions of 255, 256, 511 and 512 steps',
      function () {
        // rowFarm(r, k) scans 8 * r + k steps; with a work limit of 0 nothing is charged, so only the scans check
        [[31, 7, 255], [32, 0, 256], [63, 7, 511], [64, 0, 512], [95, 7, 767], [96, 0, 768]].forEach(function (spec) {
          var m = rowFarm(spec[0], spec[1]);
          expect(CP.expectedTicks(m)).toBe(spec[2]);
          var counting = checkingCtx(m);
          var graph = CG.build(m, SG.model.initState(m), counting, { workLimit: 0 });
          expect([spec[2], graph.complete, graph.work, graph.capHit, counting.checks])
            .toEqual([spec[2], false, 0, 'work', 2 + Math.floor(spec[2] / 256)]);
        });
      });

    it('accounts the same cold and warm: a model whose geometry is built by the call, and one that already has it',
      function () {
        function fresh(tag) { return SG.fixtures.models.boxGrid('chain-cold-' + tag, 3, 3); }
        var cold = fresh('a');
        var first = checkingCtx(cold);
        var coldGraph = CG.build(cold, SG.model.initState(cold), first, { workLimit: 5000 });
        var second = checkingCtx(cold);
        var warmGraph = CG.build(cold, SG.model.initState(cold), second, { workLimit: 5000 });
        expect([first.checks, coldGraph.work, coldGraph.capHit]).toEqual([second.checks, warmGraph.work, warmGraph.capHit]);
        expect(second.checks).toBe(2 + 1 + Math.floor(4999 / 256));
        // the interruption in the set-up (checks 1 and 2): no work, no cap, and no broken cache for the next call
        [1, 2].forEach(function (k) {
          var model = fresh('b' + k);
          expectIncomplete(CG.build(model, SG.model.initState(model), checkingCtx(model, k, spentBudget())), null, 0);
          var again = CG.build(model, SG.model.initState(model), checkingCtx(model), { workLimit: 5000 });
          expect([k, again.work, again.capHit]).toEqual([k, 5000, 'work']);
        });
        // cancellation in the set-up propagates, cold or warm
        var model = fresh('c');
        var cancelled = new SG.errors.GenerationError('budget.cancelled', { reason: 'cancelled' });
        expect(caught(function () { CG.build(model, SG.model.initState(model), checkingCtx(model, 2, cancelled)); }))
          .toBe(cancelled);
        expect(caught(function () { CG.build(model, SG.model.initState(model), checkingCtx(model, 2, cancelled)); }))
          .toBe(cancelled);
      });

    it('turns a spent budget into an empty incomplete graph without a cap, at the check where it ran out', function () {
      var state = blank9();
      var seen = checkWorks(model9, state, { workLimit: 3000 });
      expect(seen.works.length).toBe(seen.checks);
      expectIncomplete(CG.build(model9, state, checkingCtx(model9, 1, spentBudget())), null, 0);
      expect(CG.build(model9, state, checkingCtx(model9, seen.checks + 1, spentBudget()), { workLimit: 3000 }).capHit)
        .toBe('work');
      // a real budget of 3 nodes: the entry check, the set-up and the 256th charged unit pass, the fourth check runs out
      var parent = SG.budget.create({ nodes: 3 });
      expectIncomplete(graphOf(model9, state, undefined, { budget: parent }), null, 486);
      // capHit null is no proof of a complete scan: the caller's own budget still fails after the call
      expect(caught(function () { parent.check(); }).code).toBe('budget.exceeded');
      // and the same state builds again afterwards
      expect(graphOf(model9, state, BIG).complete).toBe(true);
    });

    it('lets cancellation and every other error through, with no result', function () {
      var state = blank9();
      var budget = SG.budget.create({});
      budget.cancel();
      expect(caught(function () { graphOf(model9, state, undefined, { budget: budget }); }).code)
        .toBe('budget.cancelled');
      var late = new SG.errors.GenerationError('budget.cancelled', { reason: 'cancelled' });
      expect(caught(function () { CG.build(model9, state, checkingCtx(model9, 4, late)); })).toBe(late);
      var boom = new Error('boom');
      expect(caught(function () { CG.build(model9, state, checkingCtx(model9, 1, boom)); })).toBe(boom);
      expect(caught(function () { CG.build(model9, state, checkingCtx(model9, 2, boom)); })).toBe(boom);
      expect(caught(function () { CG.build(model9, state, checkingCtx(model9, 40, boom)); })).toBe(boom);
      // a cap is not an error: both caps return normally
      expect(caught(function () { graphOf(model9, state, { workLimit: 5 }); })).toBeNull();
      expect(caught(function () { graphOf(model9, state, { groupLimit: 5 }); })).toBeNull();
    });
  });

  describe('grouped graph (R16): ownership, determinism and state reuse', function () {
    var BIG = { workLimit: 100000000 };

    function position() {
      return prunedStates(model9, SG.testkit.rng.create(8901), 3, function (r) { return 0.05 + 0.1 * r.next(); })[1];
    }

    it('never writes to the state, the model or the context', function () {
      var pos = position();
      var before = snapshotOf(pos.state);
      var ctx = ctxFor(model9);
      var completeUnits = Array.from(ctx.completeUnits);
      var graph = CG.build(model9, pos.state, ctx, BIG);
      expect(graph.complete).toBe(true);
      expect(snapshotOf(pos.state)).toEqual(before);
      expect(Array.from(ctx.completeUnits)).toEqual(completeUnits);
      expect(Object.isFrozen(model9)).toBe(true);
    });

    it('returns arrays of its own: changing a graph changes neither the next one nor the earlier ones', function () {
      var state = position().state;
      var a = graphOf(model9, state, BIG);
      var b = graphOf(model9, state, BIG);
      expect(a).toEqual(b);
      var group = a.nodes.findIndex(function (node) { return node.cells.length > 1 && a.weak[a.nodes.indexOf(node)].length > 0; });
      expect(group).not.toBe(-1);
      [[a.nodes, b.nodes], [a.weak, b.weak], [a.strong, b.strong], [a.nodes[group], b.nodes[group]],
        [a.nodes[group].cells, b.nodes[group].cells], [a.weak[group], b.weak[group]],
        [a.nodes[0].cells, b.nodes[0].cells]].forEach(function (pair, i) {
        expect([i, pair[0] === pair[1]]).toEqual([i, false]);
      });
      var snapshot = JSON.stringify(b);
      a.nodes.push({ cells: [0], digit: 1 });
      a.nodes[group].cells.push(99);
      a.nodes[group].digit = 0;
      a.nodes[0].cells[0] = 80;
      a.weak[group].push(5);
      a.weak[group].reverse();
      a.strong[0].length = 0;
      a.complete = false;
      expect(JSON.stringify(b)).toBe(snapshot);
      expect(JSON.stringify(graphOf(model9, state, BIG))).toBe(snapshot);
      // the empty arrays of an incomplete graph are new, too
      var capped = graphOf(model9, state, { workLimit: 0 });
      capped.nodes.push(1);
      capped.weak.push([]);
      expect(graphOf(model9, state, { workLimit: 0 }).nodes).toEqual([]);
      expect(graphOf(model9, state, { workLimit: 0 }).weak).toEqual([]);
    });

    it('answers the same after other calls: other positions and models, the finders, capped and refused calls',
      function () {
        var state = position().state;
        var base = JSON.stringify(graphOf(model9, state, BIG));
        graphOf(model6, SG.model.initState(model6));
        graphOf(partialUnitModel(), SG.model.initState(partialUnitModel()));
        graphOf(gridFarm(65), SG.model.initState(gridFarm(65)));
        graphOf(model9, state, { workLimit: 10 });
        graphOf(model9, state, { groupLimit: 0 });
        CG.build(model9, state, checkingCtx(model9, 2, spentBudget()));
        caught(function () { graphOf(model9, state, { workLimit: -1 }); });
        run('forcingChain', model9, state);
        run('xyChain', model9, state);
        SG.chainSearch.forcing(model9, state, ctxFor(model9), { id: 'probe', minLength: 1, maxLength: 8 });
        expect(JSON.stringify(graphOf(model9, state, BIG))).toBe(base);
        expect(JSON.stringify(CG.build(model9, state, SG.techniques.createContext(model9, { budget: SG.budget.create({}) }),
          BIG))).toBe(base);
      });

    it('follows a state that is changed in place (no candidate cache), and equal candidates give one graph, ' +
      'whatever order they were reached in', function () {
        var pos = position();
        var state = pos.state;
        var earlier = SG.model.cloneState(state);
        var first = graphOf(model9, state, BIG);
        // remove wrong candidates of open cells (the solution digit stays), then place a value of the solution
        var removals = [];
        for (var c = 0; c < model9.cellCount && removals.length < 20; c++) {
          if (state.value[c] !== 0) continue;
          for (var d = 1; d <= 9 && removals.length < 20; d++) {
            if (d !== pos.solution[c] && (state.candidates[c] & bitOf(d)) !== 0) {
              removals.push([c, d]);
              state.candidates[c] &= ~bitOf(d);
            }
          }
        }
        expect(removals.length).toBe(20);
        var second = graphOf(model9, state, BIG);
        expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
        expect(CP.graphProblems(model9, state, second)).toEqual([]);
        expect(CP.graphProblems(model9, earlier, first)).toEqual([]); // the earlier graph still tells the earlier state
        expect(JSON.stringify(graphOf(model9, SG.model.cloneState(state), BIG))).toBe(JSON.stringify(second));
        var open = [];
        for (var k = 0; k < model9.cellCount; k++) if (state.value[k] === 0) open.push(k);
        expect(SG.constraints.assign(model9, state, open[0], pos.solution[open[0]])).toBe(true);
        var third = graphOf(model9, state, BIG);
        expect(CP.graphProblems(model9, state, third)).toEqual([]);
        expect(third.nodes.length).toBeLessThan(second.nodes.length);
        // the same candidates removed in the reverse order from a copy: the same node order and the same graph
        var forward = SG.model.cloneState(earlier);
        var backward = SG.model.cloneState(earlier);
        removals.forEach(function (r) { forward.candidates[r[0]] &= ~bitOf(r[1]); });
        removals.slice().reverse().forEach(function (r) { backward.candidates[r[0]] &= ~bitOf(r[1]); });
        expect(JSON.stringify(graphOf(model9, backward, BIG))).toBe(JSON.stringify(graphOf(model9, forward, BIG)));
        expect(JSON.stringify(graphOf(model9, forward, BIG))).toBe(JSON.stringify(second));
      });
  });

  describe('grouped graph (R16): the independent checker on malformed nodes, graphs and proofs',
    function () {
      var FIVE = 5;

      function step(cells, truth) {
        return { cells: cells, digit: FIVE, truth: truth };
      }

      function link(lists, a, b) {
        lists[a].push(b);
        lists[b].push(a);
        lists[a].sort(function (x, y) { return x - y; });
        lists[b].sort(function (x, y) { return x - y; });
      }

      function unlink(lists, a, b) {
        lists[a].splice(lists[a].indexOf(b), 1);
        lists[b].splice(lists[b].indexOf(a), 1);
      }

      it('flags a node that is not a set of open candidates of one digit, ascending and distinct', function () {
        var state = digitOnly(model9, FIVE, [0, 1, 3]);
        state.value[8] = FIVE; // a solved cell
        state.candidates[8] = bitOf(FIVE);
        expect(CP.nodeProblems(model9, state, { cells: [0, 1], digit: FIVE })).toEqual([]);
        expect(CP.nodeProblems(model9, state, { cells: [0, 1, 3], digit: FIVE })).toEqual([]);
        [[null, 'not a node'], [{ cells: 'x', digit: FIVE }, 'not a node'], [{ cells: [0, 1], digit: 0 }, 'digit'],
          [{ cells: [0, 1], digit: 10 }, 'digit'], [{ cells: [0, 1], digit: 1.5 }, 'digit'],
          [{ cells: [], digit: FIVE }, 'at least one cell'], [{ cells: [1, 0], digit: FIVE }, 'ascending'],
          [{ cells: [1, 1], digit: FIVE }, 'ascending'], [{ cells: [0, 81], digit: FIVE }, 'does not exist'],
          [{ cells: [-1, 0], digit: FIVE }, 'does not exist'], [{ cells: [0, 2], digit: FIVE }, 'does not hold'],
          [{ cells: [0, 8], digit: FIVE }, 'does not hold'], [{ cells: [0, 1], digit: 4 }, 'does not hold']
        ].forEach(function (row, i) {
          var problems = CP.nodeProblems(model9, state, row[0]).join(' | ');
          expect([i, problems.indexOf(row[1]) !== -1]).toEqual([i, true]);
        });
        // a node that is not a valid node is no end of a weak or a strong link
        expect(CP.weakLinked(model9, state, { cells: [0, 2], digit: FIVE }, { cells: [3], digit: FIVE })).toBe(false);
        expect(CP.strongLinked(model9, state, { cells: [0, 1], digit: FIVE }, { cells: [3, 2], digit: FIVE })).toBe(false);
      });

      it('flags every way a graph can differ from the canonical graph of its position', function () {
        var m = model9;
        // groups {R1C1, R1C2} and {R4C1, R5C1}, the singletons of both, and R1C4, R1C7
        var state = digitOnly(m, FIVE, [0, 1, 3, 6, 27, 36]);
        var good = graphOf(m, state);
        expect(CP.graphProblems(m, state, good)).toEqual([]);
        var group = indexOfNode(good, [0, 1], FIVE);
        var other = indexOfNode(good, [27, 36], FIVE);
        var s0 = indexOfNode(good, [0], FIVE);
        var s3 = indexOfNode(good, [3], FIVE);
        var s27 = indexOfNode(good, [27], FIVE);
        var s36 = indexOfNode(good, [36], FIVE);
        expect([group, other, s0, s3, s27, s36].every(function (i) { return i !== -1; })).toBe(true);
        // the real edges that the cases below remove: R1C1 sees R4C1, and R4C1 and R5C1 are all of box 4
        expect(listed(good, 'weak', s0, s27)).toBe(true);
        expect(listed(good, 'strong', s27, s36)).toBe(true);
        expect(listed(good, 'weak', group, other)).toBe(false);
        expect(listed(good, 'strong', group, s3)).toBe(false);
        var wide = good.weak.findIndex(function (list) { return list.length >= 2; });
        var cases = {
          'a weak link through one convenient peer pair': function (g) { link(g.weak, group, s27); },
          'a weak link between groups that see each other twice': function (g) { link(g.weak, group, other); },
          'a strong link with one more occurrence in the row': function (g) { link(g.strong, group, s3); },
          'a missing weak link': function (g) { unlink(g.weak, s0, s27); },
          'a missing strong link': function (g) { unlink(g.strong, s27, s36); },
          'a link listed one way only': function (g) { g.weak[s0].splice(g.weak[s0].indexOf(s27), 1); },
          'an adjacency list out of order': function (g) { g.weak[wide].reverse(); },
          'a duplicate in an adjacency list': function (g) { g.weak[wide].push(g.weak[wide][0]); },
          'a node linked to itself': function (g) { g.strong[group].push(group); },
          'a link to a node that does not exist': function (g) { g.weak[group].push(g.nodes.length); },
          'two nodes swapped': function (g) {
            var t = g.nodes[0];
            g.nodes[0] = g.nodes[1];
            g.nodes[1] = t;
          },
          'the last node dropped': function (g) { g.nodes.pop(); },
          'a node that is no box-line intersection': function (g) { g.nodes.push({ cells: [0, 3], digit: FIVE }); },
          'a group with its cells in the wrong order': function (g) { g.nodes[group].cells.reverse(); },
          'a node of the wrong digit': function (g) { g.nodes[s0].digit = 4; },
          'an adjacency list missing': function (g) { g.strong.pop(); },
          'a graph that says it is incomplete': function (g) { g.complete = false; },
          'a cap on a complete graph': function (g) { g.capHit = 'work'; },
          'a work that is no count': function (g) { g.work = -1; },
          'a key more': function (g) { g.extra = 1; }
        };
        Object.keys(cases).forEach(function (name) {
          var bad = JSON.parse(JSON.stringify(good));
          cases[name](bad);
          expect([name, CP.graphProblems(m, state, bad).length > 0]).toEqual([name, true]);
        });
        expect(CP.graphProblems(m, state, null).length).toBe(1);
        // a strong link through a partial unit is invalid whatever it covers
        var partial = partialUnitModel();
        var pstate = digitOnly(partial, 1, [5, 10]);
        var pgood = graphOf(partial, pstate);
        expect(CP.graphProblems(partial, pstate, pgood)).toEqual([]);
        var bad = JSON.parse(JSON.stringify(pgood));
        link(bad.strong, indexOfNode(pgood, [5], 1), indexOfNode(pgood, [10], 1));
        expect(CP.graphProblems(partial, pstate, bad).length).toBeGreaterThan(0);
        // and one more occurrence in a unit: the two nodes of the vector are weak, no longer strong
        var more = digitOnly(m, FIVE, [0, 1, 3, 6]);
        var mgood = graphOf(m, more);
        var mbad = JSON.parse(JSON.stringify(mgood));
        link(mbad.strong, indexOfNode(mgood, [0, 1], FIVE), indexOfNode(mgood, [3], FIVE));
        expect(CP.graphProblems(m, more, mgood)).toEqual([]);
        expect(CP.graphProblems(m, more, mbad).length).toBeGreaterThan(0);
        // a link between candidates of different digits in different cells is listed nowhere in a canonical graph
        var two = digitOnly(m, FIVE, [0, 4]);
        two.candidates[0] |= bitOf(3);
        two.candidates[4] |= bitOf(7);
        var tgood = graphOf(m, two);
        expect(CP.graphProblems(m, two, tgood)).toEqual([]);
        [['weak', tgood.weak], ['strong', tgood.strong]].forEach(function (kind) {
          var tbad = JSON.parse(JSON.stringify(tgood));
          link(tbad[kind[0]], indexOfNode(tgood, [0], 3), indexOfNode(tgood, [4], 7));
          expect([kind[0], CP.graphProblems(m, two, tbad).length > 0]).toEqual([kind[0], true]);
        });
      });

      it('flags an edge that fails in a known solution: a weak link between two true nodes, a strong one between two ' +
        'false nodes', function () {
          var pos = prunedStates(model9, SG.testkit.rng.create(8960), 1, function () { return 0.1; })[0];
          var graph = graphOf(model9, pos.state);
          expect(CP.solutionProblems(model9, graph, pos.solution)).toEqual([]);
          function single(cell, digit) { return indexOfNode(graph, [cell], digit); }
          function wrong(cell) {
            for (var d = 1; d <= 9; d++) if (d !== pos.solution[cell] && single(cell, d) !== -1) return single(cell, d);
            return -1;
          }
          var open = [];
          for (var c = 0; c < model9.cellCount && open.length < 2; c++) {
            if (pos.state.value[c] === 0 && wrong(c) !== -1) open.push(c);
          }
          var trueA = single(open[0], pos.solution[open[0]]);
          var trueB = single(open[1], pos.solution[open[1]]);
          var falseA = wrong(open[0]);
          var falseB = wrong(open[1]);
          expect([trueA, trueB, falseA, falseB].indexOf(-1)).toBe(-1);
          var bad = JSON.parse(JSON.stringify(graph));
          link(bad.weak, trueA, trueB);
          expect(CP.solutionProblems(model9, bad, pos.solution).join(' ')).toContain('both nodes true');
          bad = JSON.parse(JSON.stringify(graph));
          link(bad.strong, falseA, falseB);
          expect(CP.solutionProblems(model9, bad, pos.solution).join(' ')).toContain('both nodes false');
        });

      // The proof of the vector: R1C1 or R1C2 or R2C1 holds the 5, so R3C1, R3C2 and R3C3 lose it. Row 1 holds the 5 in
      // R1C1, R1C2 and R1C5 only, row 2 in R2C1 and R2C5 only. If {R1C1, R1C2} is false, R1C5 is true (strong link of the
      // row), so R2C5 is false (they see each other), so R2C1 is true (strong link of row 2). R3C1 to R3C3 see all three.
      var VECTOR = [0, 1, 4, 9, 13, 18, 19, 20];

      function vectorState() {
        return digitOnly(model9, FIVE, VECTOR);
      }

      function vectorFinding() {
        return {
          technique: 'groupedChain',
          cells: [0, 1, 4, 9, 13],
          placements: [],
          eliminations: [[18, FIVE], [19, FIVE], [20, FIVE]],
          i18nKey: 'technique.groupedChain.step',
          i18nArgs: { proofVersion: 2, kind: 'endpoints', length: 3,
            chains: [[step([0, 1], 0), step([4], 1), step([13], 0), step([9], 1)]] }
        };
      }

      it('accepts the proof of the vector and finds its three edges in the builder\'s graph', function () {
        var state = vectorState();
        expect(CP.pathProblems(model9, state, vectorFinding())).toEqual([]);
        expect(CP.pathProblems(model9, state, vectorFinding(), { canonical: true })).toEqual([]);
        expect(CP.targets(model9, state, step([0, 1], 0), step([9], 1))).toEqual([[18, FIVE], [19, FIVE], [20, FIVE]]);
        var graph = graphOf(model9, state);
        var group = indexOfNode(graph, [0, 1], FIVE);
        var s4 = indexOfNode(graph, [4], FIVE);
        var s13 = indexOfNode(graph, [13], FIVE);
        var s9 = indexOfNode(graph, [9], FIVE);
        expect(listed(graph, 'strong', group, s4)).toBe(true); // the rest of row 1
        expect(listed(graph, 'weak', s4, s13)).toBe(true); // one column, one box
        expect(listed(graph, 'strong', s13, s9)).toBe(true); // the rest of row 2
        // a legacy triple for a singleton step is read as the same node
        var mixed = vectorFinding();
        mixed.i18nArgs.chains[0][1] = [4, FIVE, 1];
        expect(CP.pathProblems(model9, state, mixed)).toEqual([]);
      });

      it('flags every way the proof of the vector can be wrong', function () {
        var state = vectorState();
        var extra = digitOnly(model9, FIVE, VECTOR.concat([6])); // one more occurrence in row 1: R1C7
        var cases = [
          ['a polarity that does not alternate', state, function (f) { f.i18nArgs.chains[0][1].truth = 0; },
            'false node must be followed by a true node'],
          ['a true node followed by a true node', state, function (f) { f.i18nArgs.chains[0][2].truth = 1; },
            'true node must be followed by a false node'],
          ['a member that is no candidate', state, function (f) { f.i18nArgs.chains[0][0].cells = [0, 1, 2]; },
            'does not hold candidate'],
          ['members out of order', state, function (f) { f.i18nArgs.chains[0][0].cells = [1, 0]; }, 'ascending'],
          ['a weak edge between cells that do not see each other', state, function (f) {
            f.i18nArgs.chains[0][2].cells = [20];
          }, 'not a weak edge'],
          ['a strong edge that does not cover the unit', extra, function () {}, 'not a strong edge'],
          ['a target that is missing', state, function (f) { f.eliminations = [[18, FIVE], [19, FIVE]]; },
            'eliminations'],
          ['a target that sees only one end', state, function (f) { f.eliminations.push([27, FIVE]); }, 'eliminations'],
          ['a target of another digit', state, function (f) { f.eliminations[0] = [18, 4]; }, 'eliminations'],
          ['a placement into a member of a true group', state, function (f) { f.placements = [[0, FIVE]]; },
            'placements'],
          ['a placement from an endpoints proof', state, function (f) { f.placements = [[9, FIVE]]; }, 'placements'],
          ['no proofVersion for a group step', state, function (f) { delete f.i18nArgs.proofVersion; },
            'needs proofVersion 2'],
          ['an argument more', state, function (f) { f.i18nArgs.digit = FIVE; }, 'i18nArgs keys'],
          ['a length that is no count of edges', state, function (f) { f.i18nArgs.length = 2; }, 'length'],
          ['cells out of order', state, function (f) { f.cells = [4, 0, 1, 9, 13]; }, 'ascending union'],
          ['a proof cell that is not listed', state, function (f) { f.cells = [0, 1, 4, 9]; }, 'ascending union'],
          ['an unknown kind', state, function (f) { f.i18nArgs.kind = 'weird'; }, 'unknown kind'],
          ['a chain of one node', state, function (f) { f.i18nArgs.chains[0] = [step([0, 1], 0)]; },
            'at least two nodes'],
          ['a step that is no node', state, function (f) { f.i18nArgs.chains[0][1] = { digit: FIVE, truth: 1 }; },
            'a step is'],
          ['no chain', state, function (f) { f.i18nArgs.chains = []; }, 'chains is missing']
        ];
        cases.forEach(function (row) {
          var finding = vectorFinding();
          row[2](finding);
          var problems = CP.pathProblems(model9, row[1], finding).join(' | ');
          expect([row[0], problems.indexOf(row[3]) !== -1]).toEqual([row[0], true]);
        });
        // a group is no canonical node unless a box and a line make it
        var odd = vectorFinding();
        odd.i18nArgs.chains[0][1] = step([0, 4], 1);
        expect(CP.pathProblems(model9, state, odd).join(' | ')).not.toContain('canonical');
        expect(CP.pathProblems(model9, state, odd, { canonical: true }).join(' | ')).toContain('not a canonical node');
      });

      it('lets a forced or a contradiction proof start from a singleton only, and never place an arbitrary member',
        function () {
          var state = vectorState();
          // a forced proof from the group {R1C1, R1C2}: two chains to the two polarities of {R1C5}
          var forced = {
            technique: 'groupedChain', cells: [0, 1, 4], placements: [[0, FIVE]], eliminations: [],
            i18nKey: 'technique.groupedChain.step',
            i18nArgs: { proofVersion: 2, kind: 'forced', length: 1,
              chains: [[step([0, 1], 0), step([4], 1)], [step([0, 1], 0), step([4], 0)]] }
          };
          var text = CP.pathProblems(model9, state, forced).join(' | ');
          expect(text).toContain('must start from a singleton');
          expect(text).toContain('placements [[0,5]] are not []'); // a group's truth places no member
          var contradiction = JSON.parse(JSON.stringify(forced));
          contradiction.i18nArgs.kind = 'contradiction';
          contradiction.placements = [];
          contradiction.eliminations = [[0, FIVE]];
          contradiction.i18nArgs.chains = [[step([0, 1], 1), step([4], 0)], [step([0, 1], 1), step([4], 1)]];
          expect(CP.pathProblems(model9, state, contradiction).join(' | ')).toContain('must start from a singleton');
        });

      // SA2's vector (the amended brief): a singleton root (cell 0, digit 1) is placed by two contradictory paths, and
      // it is also a member of the group G = {cell 0, cell 1} for the 1 that two of the proof's nodes are. Digits 1..4,
      // 16 cells in four rows ([0,1,9,15], [2,10,3,4], [5,6,7,8], [11,12,13,14]); the box [0,1,2,10], the row
      // [0,1,9,15] and four more complete units; cells 10 to 15 are fixed to 4.
      function reproducer() {
        var m = SG.model.create({ variantId: 'chain-sa2-vector', digits: 4,
          units: [[0, 1, 2, 10], [0, 3, 4, 11], [1, 3, 8, 12], [0, 5, 6, 13], [5, 2, 7, 14], [0, 1, 9, 15]],
          unitMeta: [{ kind: 'box', label: 'B1' }, { label: 'X1' }, { label: 'X2' }, { label: 'X3' }, { label: 'X4' },
            { kind: 'row', label: 'R1' }],
          layout: { rows: 4, cols: 4, cellRow: [0, 0, 1, 1, 1, 2, 2, 2, 2, 0, 1, 3, 3, 3, 3, 0],
            cellCol: [0, 1, 0, 2, 3, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 3] } });
        var state = SG.model.initState(m);
        [[1, 2], [1, 2, 3], [1, 2, 3], [1, 3], [2, 3], [1, 2], [1, 3], [1, 2, 3], [1, 2, 3], [2, 3]]
          .forEach(function (digits, c) {
            state.candidates[c] = digits.reduce(function (mask, d) { return mask | bitOf(d); }, 0);
          });
        for (var c = 10; c < 16; c++) {
          state.value[c] = 4;
          state.candidates[c] = bitOf(4);
        }
        state.unsolvedCount = 10;
        var finding = {
          technique: 'groupedChain', cells: [0, 1, 2, 3, 5], placements: [[0, 1]], eliminations: [],
          i18nKey: 'technique.groupedChain.step',
          i18nArgs: { proofVersion: 2, kind: 'forced', length: 5, chains: [
            [{ cells: [0], digit: 1, truth: 0 }, { cells: [0], digit: 2, truth: 1 }, { cells: [5], digit: 2, truth: 0 },
              { cells: [5], digit: 1, truth: 1 }, { cells: [2], digit: 1, truth: 0 },
              { cells: [0, 1], digit: 1, truth: 1 }],
            [{ cells: [0], digit: 1, truth: 0 }, { cells: [3], digit: 1, truth: 1 },
              { cells: [0, 1], digit: 1, truth: 0 }]] }
        };
        return { model: m, state: state, finding: finding };
      }

      it('accepts a forced singleton root that is also a member of a group inside its own proof (SA2 vector)',
        function () {
          var v = reproducer();
          var graph = graphOf(v.model, v.state);
          expect(CP.graphProblems(v.model, v.state, graph)).toEqual([]);
          var group = indexOfNode(graph, [0, 1], 1);
          expect(group).not.toBe(-1);
          // every edge of both paths is in the canonical graph
          [v.finding.i18nArgs.chains[0], v.finding.i18nArgs.chains[1]].forEach(function (chain) {
            for (var i = 1; i < chain.length; i++) {
              var a = indexOfNode(graph, chain[i - 1].cells, chain[i - 1].digit);
              var b = indexOfNode(graph, chain[i].cells, chain[i].digit);
              expect([a !== -1, b !== -1]).toEqual([true, true]);
              expect(listed(graph, chain[i - 1].truth === 0 ? 'strong' : 'weak', a, b)).toBe(true);
            }
          });
          expect(CP.pathProblems(v.model, v.state, v.finding)).toEqual([]);
          expect(CP.pathProblems(v.model, v.state, v.finding, { canonical: true })).toEqual([]);
          // the state completes in exactly one way, which holds every edge, and the placement is its cell 0
          var completion = [1, 2, 3, 3, 2, 2, 3, 1, 1, 3, 4, 4, 4, 4, 4, 4];
          expect(CP.solutionProblems(v.model, graph, completion)).toEqual([]);
          var found = [];
          var cells = [];
          function fill(c) {
            if (c === 10) {
              var ok = Array.prototype.every.call(v.model.units, function (u) {
                return [1, 2, 3, 4].every(function (d) {
                  return Array.prototype.filter.call(u, function (x) { return (x < 10 ? cells[x] : 4) === d; }).length === 1;
                });
              });
              if (ok) found.push(cells.slice().concat([4, 4, 4, 4, 4, 4]));
              return;
            }
            for (var d = 1; d <= 4; d++) {
              if ((v.state.candidates[c] & bitOf(d)) === 0) continue;
              cells[c] = d;
              fill(c + 1);
            }
          }
          fill(0);
          expect(found).toEqual([completion]);
          expect(completion[v.finding.placements[0][0]]).toBe(v.finding.placements[0][1]);
          // the negatives stay: placing the other member of the group, or nothing, or starting from the group
          var other = JSON.parse(JSON.stringify(v.finding));
          other.placements = [[1, 1]];
          expect(CP.pathProblems(v.model, v.state, other).join(' | ')).toContain('placements [[1,1]] are not [[0,1]]');
          var none = JSON.parse(JSON.stringify(v.finding));
          none.placements = [];
          expect(CP.pathProblems(v.model, v.state, none).length).toBeGreaterThan(0);
          var fromGroup = JSON.parse(JSON.stringify(v.finding));
          fromGroup.i18nArgs.chains.forEach(function (chain) { chain[0].cells = [0, 1]; });
          expect(CP.pathProblems(v.model, v.state, fromGroup).join(' | ')).toContain('must start from a singleton');
        });

      it('reads the legacy triples of the real forcingChain Findings like the old checker does, and as version 2',
        function () {
          function versionTwo(finding) {
            var args = finding.i18nArgs;
            var cells = [];
            args.chains.forEach(function (chain) {
              chain.forEach(function (s) { if (cells.indexOf(s[0]) === -1) cells.push(s[0]); });
            });
            return Object.assign({}, finding, { cells: cells.sort(function (a, b) { return a - b; }),
              i18nArgs: { proofVersion: 2, kind: args.kind, length: args.length, chains: args.chains.map(function (chain) {
                return chain.map(function (s) { return { cells: [s[0]], digit: s[1], truth: s[2] }; });
              }) } });
          }
          var kinds = {};
          CHAIN_FIXTURES.forEach(function (fx) {
            var state = fixtureState(fx);
            // the singleton search: its Findings are the legacy triples this test is about (the registered ids
            // find a version 2 proof with groups on one of these positions, MS13c)
            var finding = singleton('forcingChain', model9, state) || singleton('forcingChainLong', model9, state);
            expect(finding).not.toBeNull();
            expect([fx.name, chainProblems(model9, state, finding)]).toEqual([fx.name, []]);
            expect([fx.name, CP.pathProblems(model9, state, finding)]).toEqual([fx.name, []]);
            var two = versionTwo(finding);
            expect([fx.name, CP.pathProblems(model9, state, two, { canonical: true })]).toEqual([fx.name, []]);
            kinds[finding.i18nArgs.kind] = (kinds[finding.i18nArgs.kind] || 0) + 1;
            // the same proof with its start made a group of two cells is no proof of a placement or an elimination
            if (finding.i18nArgs.kind !== 'endpoints') {
              var grouped = JSON.parse(JSON.stringify(two));
              grouped.i18nArgs.chains.forEach(function (chain) {
                chain[0].cells = [chain[0].cells[0], chain[1].cells[0]].sort(function (a, b) { return a - b; });
              });
              expect([fx.name, CP.pathProblems(model9, state, grouped).join(' | ').indexOf('singleton') !== -1])
                .toEqual([fx.name, true]);
            }
          });
          expect(Object.keys(kinds).sort()).toEqual(['contradiction', 'endpoints', 'forced']);
        });

      /**
       * The endpoint proofs of a grouped graph, by a breadth first search over its literals (written here from the
       * adjacency lists alone): from a node taken false, strong edges lead to true nodes and weak edges to false ones;
       * the first true node that shares a target with the start ends the proof of that start.
       */
      function groupedProofs(m, state, graph, maxEdges, limit) {
        var out = [];
        var order = [];
        graph.nodes.forEach(function (node, i) { if (node.cells.length > 1) order.push(i); });
        graph.nodes.forEach(function (node, i) { if (node.cells.length === 1) order.push(i); });
        function shared(a, b) {
          return graph.weak[a].some(function (j) { return graph.nodes[j].cells.length === 1 && graph.weak[b].indexOf(j) !== -1; });
        }
        for (var o = 0; o < order.length && out.length < limit; o++) {
          var s = order[o];
          var parent = {};
          var depth = {};
          var queue = [2 * s];
          parent[2 * s] = -1;
          depth[2 * s] = 0;
          for (var head = 0; head < queue.length; head++) {
            var lit = queue[head];
            if (depth[lit] >= maxEdges) continue;
            var node = lit >> 1;
            var truth = lit & 1;
            var next = truth === 0 ? graph.strong[node] : graph.weak[node];
            for (var k = 0; k < next.length; k++) {
              var to = 2 * next[k] + (truth ^ 1);
              if (parent[to] !== undefined) continue;
              parent[to] = lit;
              depth[to] = depth[lit] + 1;
              queue.push(to);
              if ((to & 1) === 1 && next[k] !== s && shared(s, next[k])) {
                var path = [];
                for (var x = to; x !== -1; x = parent[x]) path.unshift(x);
                var chain = path.map(function (l) {
                  return { cells: graph.nodes[l >> 1].cells.slice(), digit: graph.nodes[l >> 1].digit, truth: l & 1 };
                });
                var cells = [];
                chain.forEach(function (n) { n.cells.forEach(function (c) { if (cells.indexOf(c) === -1) cells.push(c); }); });
                out.push({ technique: 'groupedChain', cells: cells.sort(function (a, b) { return a - b; }),
                  placements: [], eliminations: CP.targets(m, state, graph.nodes[s], graph.nodes[next[k]]),
                  i18nKey: 'technique.groupedChain.step',
                  i18nArgs: { proofVersion: 2, kind: 'endpoints', length: chain.length - 1, chains: [chain] } });
                head = queue.length;
                break;
              }
            }
          }
        }
        return out;
      }

      it('accepts every endpoint proof that a search over the grouped graph finds, and none removes a solution ' +
        'candidate', function () {
          var counts = { states: 0, proofs: 0, withGroup: 0, groupEnds: 0, targets: 0 };
          prunedStates(model9, SG.testkit.rng.create(8950), 40, function (r) { return 0.04 + 0.2 * r.next(); })
            .forEach(function (item, i) {
              var graph = graphOf(model9, item.state, { workLimit: 100000000 });
              var support = i < 6 ? supportedMasks(model9, item.state) : null;
              counts.states++;
              groupedProofs(model9, item.state, graph, 7, 5).forEach(function (finding) {
                expect(['state ' + i, CP.pathProblems(model9, item.state, finding, { canonical: true })])
                  .toEqual(['state ' + i, []]);
                finding.eliminations.forEach(function (e) {
                  if (item.solution[e[0]] === e[1]) fail('state ' + i + ' removes a candidate of the solution');
                });
                if (support !== null) expect(oracleProblems(model9, item.state, finding, support)).toEqual([]);
                var chain = finding.i18nArgs.chains[0];
                counts.proofs++;
                counts.targets += finding.eliminations.length;
                if (chain.some(function (node) { return node.cells.length > 1; })) counts.withGroup++;
                if (chain[0].cells.length > 1 || chain[chain.length - 1].cells.length > 1) counts.groupEnds++;
              });
            });
          expect(counts.proofs).toBeGreaterThanOrEqual(100);
          expect(counts.withGroup).toBeGreaterThanOrEqual(50);
          expect(counts.groupEnds).toBeGreaterThanOrEqual(20);
          expect(counts.targets).toBeGreaterThanOrEqual(counts.proofs);
        });
    });

  // ---------------------------------------------------------------------------------------------------------------
  // Grouped forcing (R16, MS13c, owner decision S-OD11 option A): forcingChain and forcingChainLong search the
  // canonical grouped graph first, on a bounded attempt (4096 additional nodes and one 50000-unit allowance for the
  // construction and the search together); only forcingChain falls back, on a local cap, to the complete singleton
  // search without a local limit. The proofs are read by the independent checker `SG.chainProofs`, the legacy by
  // `singleton` (the accepted singleton finders, which are also what the fallback runs).
  // ---------------------------------------------------------------------------------------------------------------

  var CS = SG.chainSearch;
  // Real puzzle #530 of the seeded stream 161 (a replaced entry of LONG_CHAIN_PUZZLES): at its stuck position with
  // C = 6 the shortest proof has 7 links, found by the singleton search (50000 units) but not by the grouped
  // attempt, whose construction and search together reach 50000 units first.
  var PUZZLE_530 = '...5.94...4...2..82.71.....7.....26...3.....7.1.6...95...........92.5..1.36......';
  var PUZZLE_24 = '..7..1..6.8....1..5..6.78.3..65..7.......8..2.9..6....459........2...5......1..9.';

  /** A grouped seam call (`opts` of the seam) or a registered id (`opts` the context options), with every record. */
  function called(how, m, state, opts, ctxOptions) {
    var records = [];
    var observer = { onPatternWork: function (r) { records.push(r); } };
    var finding;
    if (how === 'seam') finding = CS.groupedForcing(m, state, ctxFor(m, Object.assign(observer, ctxOptions)), opts);
    else finding = run(how, m, state, Object.assign(observer, opts, ctxOptions));
    return { finding: finding, records: records, record: records[0] };
  }

  var SEEDED = { classic9: [5151, 900], classic6: [5151, 800], jigsaw9: [77003, 150], hyper: [77003, 150],
    diagonalX: [77003, 150] };
  var seededStates = {};
  /** The seeded positions of a model (`H.randomStatesWithKnownSolution`), computed once per run. */
  function seeded(modelId) {
    if (!seededStates[modelId]) {
      seededStates[modelId] = H.randomStatesWithKnownSolution(H.model(modelId),
        SG.testkit.rng.create(SEEDED[modelId][0]), SEEDED[modelId][1]);
    }
    return seededStates[modelId];
  }

  /** The nodes of the first chain of a Finding of version 2, or null for the triples of a singleton proof. */
  function nodesOf(finding, k) {
    return finding.i18nArgs.proofVersion === 2 ? finding.i18nArgs.chains[k] : null;
  }

  describe('grouped forcing (R16, MS13c): proofs, ownership and the singleton rules', function () {
    it('proves every deduction it publishes: independent checker, solution, singleton starts and exact targets',
      function () {
        var plan = ['classic9', 'classic6', 'jigsaw9', 'hyper', 'diagonalX'];
        var seen = { found: 0, grouped: 0, endGroup: 0, innerGroup: 0, contradiction: 0, startGroup: 0 };
        plan.forEach(function (modelId) {
          var m = H.model(modelId);
          seeded(modelId).forEach(function (item, i) {
            ['forcingChain', 'forcingChainLong'].forEach(function (id) {
              var f = run(id, m, item.state);
              if (f === null) return;
              var at = modelId + ' #' + i + ' ' + id;
              seen.found++;
              expect([at, chainProblems(m, item.state, f)]).toEqual([at, []]);
              expect([at, H.findingProblems(m, item.state, f, { technique: id, solution: item.solution })])
                .toEqual([at, []]);
              var chains = nodesOf(f, 0);
              if (chains === null) return;
              seen.grouped++;
              // a placement or an elimination of a candidate starts from a singleton, never from a group
              var all = f.i18nArgs.chains;
              if (f.i18nArgs.kind !== 'endpoints') expect([at, all[0][0].cells.length]).toEqual([at, 1]);
              if (all[0][0].cells.length > 1) seen.startGroup++;
              if (f.i18nArgs.kind === 'contradiction') seen.contradiction++;
              var last = all[0][all[0].length - 1];
              if (f.i18nArgs.kind === 'endpoints' && last.cells.length > 1) {
                seen.endGroup++;
                // every elimination conflicts with EVERY member of the end group, and no candidate that sees only
                // some of its members is eliminated
                expect([at, f.eliminations]).toEqual([at, CP.targets(m, item.state, all[0][0], last)
                  .map(function (t) { return [t[0], t[1]]; })]);
                f.eliminations.forEach(function (e) {
                  last.cells.forEach(function (c) { expect([at, e[0] !== c && sees(m, e[0], c)]).toEqual([at, true]); });
                });
              }
              if (all.some(function (chain) {
                return chain.slice(1, f.i18nArgs.kind === 'endpoints' ? -1 : undefined).some(function (s) {
                  return s.cells.length > 1;
                });
              })) seen.innerGroup++;
            });
          });
        });
        expect(seen.grouped).toBeGreaterThanOrEqual(30);
        expect(seen.endGroup).toBeGreaterThanOrEqual(20);
        expect(seen.innerGroup).toBeGreaterThanOrEqual(2);
        expect(seen.contradiction).toBeGreaterThanOrEqual(1);
      });

    function sees(m, a, b) {
      return m.peers[a].indexOf(b) !== -1;
    }

    it('is the singleton search wherever no group is in the proof: byte for byte, and never longer with one',
      function () {
        var plan = [['classic9', 300], ['classic6', 400], ['jigsaw9', 100], ['hyper', 100], ['diagonalX', 100]];
        var seen = { same: 0, shorter: 0, sameLength: 0, nullBoth: 0 };
        plan.forEach(function (row) {
          var m = H.model(row[0]);
          seeded(row[0]).slice(0, row[1]).forEach(function (item, i) {
            ['forcingChain', 'forcingChainLong'].forEach(function (id) {
              var at = row[0] + ' #' + i + ' ' + id;
              var out = called(id, m, item.state);
              var old = singleton(id, m, item.state);
              var f = out.finding;
              if (f === null && old === null) {
                seen.nullBoth++;
              } else if (f !== null && f.i18nArgs.proofVersion !== 2) {
                // a singleton proof of a complete grouped search is the singleton search's own (order included);
                // only the long id's singleton search, capped at 50000 units, can have none where the grouped has
                if (old !== null) {
                  expect([at, same(f, old)]).toEqual([at, true]);
                  seen.same++;
                } else {
                  expect([at, id]).toEqual([at, 'forcingChainLong']);
                }
              } else if (f !== null) {
                // a proof with groups is the shortest of the grouped graph: never longer than the singleton one
                if (old !== null) expect([at, f.i18nArgs.length <= old.i18nArgs.length]).toEqual([at, true]);
                if (old !== null && f.i18nArgs.length < old.i18nArgs.length) seen.shorter++;
                else seen.sameLength++;
              } else if (id === 'forcingChain') {
                // the short id never loses a singleton proof: its graph holds every singleton proof
                expect([at, old]).toEqual([at, null]);
              }
              if (out.record.domain === 'singleton') expect([at, same(f, old)]).toEqual([at, true]);
            });
          });
        });
        expect(seen.same).toBeGreaterThan(100);
        expect(seen.sameLength + seen.shorter).toBeGreaterThanOrEqual(20);
        expect(seen.nullBoth).toBeGreaterThan(100);
      });

    it('finds the real proofs with groups of seeded classic positions: an end group, an inner group and a contradiction',
      function () {
        var m = H.model('classic9');
        var items = seeded('classic9');
        // an endpoints proof of 3 links that ends in a group of the 3: the candidate R2C7... sees every member
        var one = run('forcingChain', m, items[1].state);
        expect([one.i18nArgs.kind, one.i18nArgs.length, one.i18nArgs.proofVersion, one.eliminations])
          .toEqual(['endpoints', 3, 2, [[34, 3]]]);
        expect(one.i18nArgs.chains[0][3].cells.length).toBeGreaterThan(1);
        // a proof of 3 links with a group at its end and another inside, two eliminations
        var two = run('forcingChain', m, items[880].state);
        expect([two.i18nArgs.kind, two.i18nArgs.length, two.eliminations]).toEqual(['endpoints', 3,
          [[21, 2], [22, 2]]]);
        expect(two.i18nArgs.chains[0].filter(function (s) { return s.cells.length > 1; }).length)
          .toBeGreaterThanOrEqual(2);
        // a contradiction of two paths with a group inside, on a 6 x 6 board: the start is a singleton
        var m6 = H.model('classic6');
        var state6 = seeded('classic6')[121].state;
        var three = run('forcingChain', m6, state6);
        expect([three.i18nArgs.kind, three.i18nArgs.length, three.eliminations]).toEqual(['contradiction', 3,
          [[1, 1]]]);
        expect(three.i18nArgs.chains[0][0].cells).toEqual([1]);
        expect(three.i18nArgs.chains.some(function (c) { return c.some(function (s) { return s.cells.length > 1; }); }))
          .toBe(true);
        [[m, items[1].state, one], [m, items[880].state, two], [m6, state6, three]]
          .forEach(function (row) {
            expect(chainProblems(row[0], row[1], row[2])).toEqual([]);
            expect(row[2].cells).toEqual(row[2].cells.slice().sort(function (a, b) { return a - b; }));
          });
      });

    it('never places an arbitrary member of a true group: a group that is forced to be true gives no placement',
      function () {
        // the 5 of row 1 can only be in R1C1 or R1C2 (a group of the box 1 and the row 1, true as a whole), and
        // nowhere else on the board: the group is true, which places and eliminates nothing by itself
        var state = digitOnly(model9, 5, [0, 1]);
        ['forcingChain', 'forcingChainLong'].forEach(function (id) {
          expect(run(id, model9, state, { maxChainLength: 12 })).toBeNull();
        });
        // the same with a candidate that would be eliminated if the group counted as its first member
        var seen = digitOnly(model9, 5, [0, 1, 11]);
        ['forcingChain', 'forcingChainLong'].forEach(function (id) {
          var f = run(id, model9, seen, { maxChainLength: 12 });
          if (f !== null) {
            expect(chainProblems(model9, seen, f)).toEqual([]);
            expect(f.placements.length === 0 || f.i18nArgs.chains[0][0].cells.length === 1).toBe(true);
          }
        });
      });

    it('does not use a group as a strong link once another occurrence is in the unit, and reads every cross peer',
      function () {
        // The vector of MS13b: the 5 only in the cells of the proof and R3C1-3. "(R1C1 or R1C2 is 5)" is a strong link
        // to R1C5 only while row 1 holds the 5 in these three cells; an extra 5 in R1C6 breaks it.
        var open = [0, 1, 4, 9, 13, 18, 19, 20];
        var vector = digitOnly(model9, 5, open);
        var proof = { technique: 'forcingChain', cells: [0, 1, 4, 9, 13], placements: [],
          eliminations: [[18, 5], [19, 5], [20, 5]], i18nKey: 'technique.forcingChain.step.endpoints',
          i18nArgs: { proofVersion: 2, kind: 'endpoints', length: 3, chains: [[
            { cells: [0, 1], digit: 5, truth: 0 }, { cells: [4], digit: 5, truth: 1 },
            { cells: [13], digit: 5, truth: 0 }, { cells: [9], digit: 5, truth: 1 }]] } };
        expect(CP.pathProblems(model9, vector, proof, { canonical: true })).toEqual([]);
        var extra = digitOnly(model9, 5, open.concat([5]));
        expect(CP.pathProblems(model9, extra, proof).length).toBeGreaterThan(0);
        ['forcingChain', 'forcingChainLong'].forEach(function (id) {
          [vector, extra].forEach(function (state) {
            var f = run(id, model9, state, { maxChainLength: 12 });
            if (f !== null) expect(chainProblems(model9, state, f)).toEqual([]);
          });
        });
      });

    it('owns every Finding: arrays of its own, not the graph\'s or the search\'s, and none shared between calls',
      function () {
        var m = H.model('classic9');
        var state = seeded('classic9')[880].state;
        var before = snapshotOf(state);
        var a = run('forcingChain', m, state);
        var copy = JSON.parse(JSON.stringify(a));
        expect(a.i18nArgs.proofVersion).toBe(2);
        // every array of a second call is another object, whatever it holds
        var b = run('forcingChain', m, state);
        expect(b).toEqual(a);
        expect(b.cells).not.toBe(a.cells);
        expect(b.i18nArgs.chains).not.toBe(a.i18nArgs.chains);
        a.i18nArgs.chains.forEach(function (chain, k) {
          expect(b.i18nArgs.chains[k]).not.toBe(chain);
          chain.forEach(function (node, i) {
            expect(b.i18nArgs.chains[k][i]).not.toBe(node);
            expect(b.i18nArgs.chains[k][i].cells).not.toBe(node.cells);
          });
        });
        // writing into the first changes neither the second, nor a third call, nor the graph, nor the position
        a.cells.push(-1);
        a.eliminations.push([0, 0]);
        a.i18nArgs.chains.forEach(function (chain) { chain.forEach(function (node) { node.cells.push(-1); }); });
        expect(b).toEqual(copy);
        expect(run('forcingChain', m, state)).toEqual(copy);
        expect(snapshotOf(state)).toEqual(before);
        expect(graphOf(m, state).complete).toBe(true);
        // a Finding of singletons (the legacy triples) owns its arrays too
        var legacy = run('forcingChain', model9, fixtureState(CHAIN_FIXTURES[0]));
        var again = run('forcingChain', model9, fixtureState(CHAIN_FIXTURES[0]));
        expect(legacy).toEqual(again);
        legacy.i18nArgs.chains[0][0][1] = 99;
        legacy.cells.length = 0;
        expect(run('forcingChain', model9, fixtureState(CHAIN_FIXTURES[0]))).toEqual(again);
      });

    it('gives every step of a Finding an array of its own: also the start that both paths share', function () {
      var m6 = H.model('classic6');
      var f = run('forcingChain', m6, seeded('classic6')[121].state);
      expect([f.i18nArgs.proofVersion, f.i18nArgs.kind, f.i18nArgs.chains.length]).toEqual([2, 'contradiction', 2]);
      var arrays = [];
      f.i18nArgs.chains.forEach(function (chain) { chain.forEach(function (node) { arrays.push(node.cells); }); });
      // both paths begin with the same node; the Finding writes it twice, as two arrays
      expect(f.i18nArgs.chains[0][0].cells).toEqual(f.i18nArgs.chains[1][0].cells);
      arrays.forEach(function (a, i) {
        arrays.forEach(function (b, j) { if (i !== j) expect([i, j, a === b]).toEqual([i, j, false]); });
      });
      f.i18nArgs.chains[0][0].cells.push(-1);
      expect(f.i18nArgs.chains[1][0].cells).toEqual([1]);
      expect(f.cells).not.toContain(-1);
    });
  });

  describe('grouped forcing (R16, MS13c, S-OD11): the bounded attempt, its local caps and the short fallback',
    function () {
      var FAR = ringsModel([2001, 5]);
      var FAR_STATE = SG.model.initState(FAR);

      function stuck(text, c) {
        return withCutoff(c, function () { return stuckItem(text, idsBefore('forcingChainLong')).state; });
      }

      it('falls back on a local cap to the complete singleton search with no local limit, and records both phases',
        function () {
          var out = called('forcingChain', FAR, FAR_STATE);
          var old = singleton('forcingChain', FAR, FAR_STATE);
          expect(old.i18nArgs.length).toBe(3);
          expect(same(out.finding, old)).toBe(true);
          var r = out.record;
          expect(out.records.length).toBe(1);
          // the grouped attempt stopped at its construction: the work cap of 50000, nothing left for a search
          expect([r.grouped.stop, r.grouped.graph, r.grouped.minimum]).toEqual(['construction-work', 'incomplete',
            'skipped']);
          expect([r.grouped.construction, r.grouped.search, r.grouped.additional]).toEqual([50000, 0, null]);
          // the fallback ran, found the proof and is no part of a grouped minimum
          expect([r.fallback.entered, r.fallback.outcome, r.domain]).toEqual([true, 'found', 'singleton']);
          // it has no local limit: more than the grouped 50000 on its own, and the whole call records every stage
          var seam = called('seam', FAR, FAR_STATE, { id: 'x', minLength: 1, maxLength: 4, workLimit: 3 });
          expect(seam.record.grouped.stop).toBe('construction-work');
          var plain = [];
          SG.chainSearch.forcing(FAR, FAR_STATE, ctxFor(FAR, { onPatternWork: function (x) { plain.push(x); } }),
            { id: 'x', minLength: 1, maxLength: 4, workLimit: null });
          expect(r.fallback.work).toBe(plain[0].work);
          expect(r.fallback.work).toBeGreaterThan(50000);
          expect(r.work).toBe(r.grouped.construction + r.grouped.search + r.fallback.work);
          // the call has no limit and no cap of its own, as the accepted forcingChain
          expect([r.limit, r.capHit, r.retained]).toEqual([null, null, null]);
        });

      it('is no fallback for forcingChainLong: a local cap is null, alone or after forcingChain, with its cap',
        function () {
          var out = called('forcingChainLong', FAR, FAR_STATE);
          expect(out.finding).toBeNull();
          var r = out.record;
          expect([r.grouped.stop, r.fallback, r.domain, r.limit, r.capHit]).toEqual(['construction-work', null, null,
            50000, 'work']);
          expect(r.work).toBe(50000);
          // the real position of the search cap: the singleton search finds a 7-link proof there, the long id does not
          var item = stuck(PUZZLE_530, 6);
          withCutoff(6, function () {
            var long = called('forcingChainLong', model9, item);
            expect(long.finding).toBeNull();
            expect([long.record.grouped.graph, long.record.grouped.minimum, long.record.grouped.stop,
              long.record.fallback, long.record.domain, long.record.capHit]).toEqual(['complete', 'incomplete',
              'search-work', null, null, 'work']);
            expect(long.record.grouped.construction + long.record.grouped.search).toBe(50000);
            expect(long.record.work).toBe(50000);
            var old = singleton('forcingChainLong', model9, item);
            expect(old.i18nArgs.length).toBe(7);
            // forcingChain asked first changes nothing (nothing to give a Long, no relabel of a short proof)
            expect(run('forcingChain', model9, item)).toBeNull();
            expect(run('forcingChainLong', model9, item)).toBeNull();
          });
        });

      it('falls back on a search cap too, under the same window, and certifies only the singleton minimum',
        function () {
          var item = stuck(PUZZLE_530, 6);
          var window = { id: 'x', minLength: 7, maxLength: 12 };
          var fell = called('seam', model9, item, Object.assign({ fallback: true }, window));
          var old = SG.chainSearch.forcing(model9, item, ctxFor(model9), Object.assign({ workLimit: null }, window));
          expect(same(fell.finding, old)).toBe(true);
          expect(old.i18nArgs.length).toBe(7);
          expect([fell.record.grouped.stop, fell.record.fallback.entered, fell.record.fallback.outcome,
            fell.record.domain]).toEqual(['search-work', true, 'found', 'singleton']);
          expect(fell.record.work).toBe(50000 + fell.record.fallback.work);
          // the same position without a fallback: nothing, and the stages of the attempt alone
          var alone = called('seam', model9, item, Object.assign({ fallback: false }, window));
          expect([alone.finding, alone.record.fallback, alone.record.work, alone.record.capHit]).toEqual([null, null,
            50000, 'work']);
          // a shorter proof with groups exists in a complete graph, which the fallback does not claim to know
          var state = fixtureState(CHAIN_FIXTURES[5]);
          var tiny = { id: 'x', minLength: 1, maxLength: 12, workLimit: 100, fallback: true };
          var viaFallback = called('seam', model9, state, tiny);
          expect(viaFallback.record.domain).toBe('singleton');
          expect(viaFallback.finding.i18nArgs.length).toBe(6);
          expect(viaFallback.finding.i18nArgs.proofVersion).toBeUndefined();
          var complete = called('seam', model9, state, { id: 'x', minLength: 1, maxLength: 12 });
          expect(complete.record.domain).toBe('grouped');
          expect(complete.finding.i18nArgs.length).toBe(3);
          expect(complete.finding.i18nArgs.proofVersion).toBe(2);
        });

      it('runs its fallback under the same window: a proof below the minimum is nothing there too', function () {
        // FAR holds a proof of 3 links, which the fallback finds after the construction cap
        var out = called('seam', FAR, FAR_STATE, { id: 'x', minLength: 4, maxLength: 12, fallback: true });
        expect(out.finding).toBeNull();
        expect([out.record.grouped.stop, out.record.fallback.entered, out.record.fallback.outcome, out.record.domain])
          .toEqual(['construction-work', true, 'none', 'singleton']);
        var held = called('seam', FAR, FAR_STATE, { id: 'x', minLength: 3, maxLength: 3, fallback: true });
        expect([held.finding.i18nArgs.length, held.record.fallback.outcome]).toEqual([3, 'found']);
        var above = called('seam', FAR, FAR_STATE, { id: 'x', minLength: 1, maxLength: 2, fallback: true });
        expect([above.finding, above.record.fallback.outcome]).toEqual([null, 'none']);
      });

      it('falls back on the node quota, and a quota of exactly the nodes is no cap', function () {
        var state = stuck(PUZZLE_24, 4);
        var window5 = { id: 'forcingChainLong', minLength: 5, maxLength: 12 };
        var all = called('seam', model9, state, window5);
        var nodes = all.record.grouped.additional;
        expect(nodes).toBeGreaterThan(0);
        expect(all.record.grouped.stop).toBeNull();
        [[nodes, null], [nodes + 5, null], [nodes - 1, 'construction-nodes'], [0, 'construction-nodes']]
          .forEach(function (row) {
            var out = called('seam', model9, state, Object.assign({ groupLimit: row[0] }, window5));
            expect([row[0], out.record.grouped.stop]).toEqual([row[0], row[1]]);
            if (row[1] === null) {
              expect(same(out.finding, all.finding)).toBe(true);
            } else {
              // with no fallback a cap of the nodes is null with its own tag, and the graph is incomplete
              expect([out.finding, out.record.capHit, out.record.grouped.graph, out.record.grouped.minimum])
                .toEqual([null, 'nodes', 'incomplete', 'skipped']);
              // the short ID falls back to the singleton search on it
              var short = called('seam', model9, state, Object.assign({ groupLimit: row[0], fallback: true },
                window5));
              expect([short.record.domain, short.record.fallback.entered, short.record.capHit]).toEqual(['singleton',
                true, null]);
              expect(same(short.finding, singleton('forcingChainLong', model9, state))).toBe(true);
            }
          });
      });

      it('shares one allowance between construction and search: the exact boundary, never reset', function () {
        var state = stuck(PUZZLE_24, 4);
        var all = called('seam', model9, state, { id: 'x', minLength: 5, maxLength: 12 });
        var W = all.record.grouped.construction;
        var S = all.record.grouped.search;
        expect(all.finding.i18nArgs.length).toBe(5);
        expect(S).toBeGreaterThan(10);
        [[W - 1, 'construction-work'], [W, 'search-work'], [W + 5, 'search-work'], [W + S - 1, 'search-work'],
          [W + S, null], [W + S + 1000, null]].forEach(function (row) {
          var out = called('seam', model9, state, { id: 'x', minLength: 5, maxLength: 12, workLimit: row[0] });
          var r = out.record;
          var at = 'limit ' + row[0] + ' (construction ' + W + ', search ' + S + ')';
          expect([at, r.grouped.stop]).toEqual([at, row[1]]);
          // one counter: the stages together never pass the limit, and the call's work is their sum
          expect([at, r.work]).toEqual([at, r.grouped.construction + r.grouped.search]);
          expect([at, r.work <= row[0]]).toEqual([at, true]);
          if (row[1] === null) {
            expect([at, same(out.finding, all.finding)]).toEqual([at, true]);
          } else {
            // never the best proof seen so far, never a partial graph
            expect([at, out.finding]).toEqual([at, null]);
            expect([at, r.capHit]).toEqual([at, 'work']);
          }
        });
        // the search gets only what the construction left: five units after the construction, five at most
        var tight = called('seam', model9, state, { id: 'x', minLength: 5, maxLength: 12, workLimit: W + 5 });
        expect(tight.record.grouped.search).toBeLessThanOrEqual(5);
        expect(tight.record.grouped.construction).toBe(W);
      });

      it('runs nothing for an empty window, and nothing again after a completed negative or a window rejection',
        function () {
          var state = fixtureState(CHAIN_FIXTURES[0]); // a proof of 3 links, forcingChain's
          ['forcingChain', 'forcingChainLong'].forEach(function (id) {
            var off = called(id, model9, state, { maxChainLength: 0 });
            expect([off.finding, off.record.work, off.record.grouped.stop, off.record.grouped.graph,
              off.record.fallback, off.record.domain]).toEqual([null, 0, 'empty', 'skipped', null, null]);
          });
          // forcingChainLong's window starts above the proof: a rejection, with no second search even if allowed to
          var below = called('seam', model9, state, { id: 'x', minLength: 5, maxLength: 12, fallback: true });
          expect([below.finding, below.record.grouped.stop, below.record.grouped.minimum, below.record.fallback,
            below.record.domain]).toEqual([null, null, 'complete', null, 'grouped']);
          expect(called('forcingChainLong', model9, state).record.fallback).toBeNull();
          // a position with no proof in the window is a completed negative, not a cap
          var none = called('forcingChain', model9, twinState(model9, [F.parse(fixture('wikipedia-example').solution),
            relabel(F.parse(fixture('wikipedia-example').solution), [2, 3, 1, 5, 6, 4, 8, 9, 7])]),
          { maxChainLength: 12 });
          expect([none.finding, none.record.grouped.stop, none.record.fallback, none.record.domain])
            .toEqual([null, null, null, 'grouped']);
          // a narrowed window keeps the fallback's window: the singleton search finds nothing in 1 or 2 links either
          var narrow = called('forcingChain', FAR, FAR_STATE, { maxChainLength: 2 });
          expect([narrow.finding, narrow.record.fallback.outcome, narrow.record.domain]).toEqual([null, 'none',
            'singleton']);
          expect(called('forcingChain', FAR, FAR_STATE, { maxChainLength: 3 }).finding.i18nArgs.length).toBe(3);
        });

      it('hands the grouped seam the limits of R10: 4096 additional nodes and one allowance of 50000 units',
        function () {
          var out = called('seam', model9, fixtureState(CHAIN_FIXTURES[0]), { id: 'x' });
          expect(out.record.limit).toBe(50000);
          expect(called('seam', model9, fixtureState(CHAIN_FIXTURES[0]), { id: 'x', workLimit: 7000.9 }).record.limit)
            .toBe(7000);
          expect(called('seam', model9, fixtureState(CHAIN_FIXTURES[0]), { id: 'x', fallback: true }).record.limit)
            .toBeNull();
          [['workLimit', [NaN, -1, Infinity, null, '5', {}]], ['groupLimit', [NaN, -1, Infinity, null, '5']],
            ['fallback', [1, 'yes', null]], ['id', ['', '1x', 'a b', 5, null]],
            ['minLength', ['1', NaN]], ['maxLength', ['12', NaN]]].forEach(function (row) {
            row[1].forEach(function (bad) {
              var opts = { id: 'x' };
              opts[row[0]] = bad;
              var err = caught(function () { CS.groupedForcing(model9, fixtureState(CHAIN_FIXTURES[0]),
                ctxFor(model9), opts); });
              expect([row[0], String(bad), err && err.code]).toEqual([row[0], String(bad), 'solver.invalidOption']);
            });
          });
          [null, 5, 'x'].forEach(function (bad) {
            expect(caught(function () { CS.groupedForcing(model9, fixtureState(CHAIN_FIXTURES[0]), ctxFor(model9),
              bad); }).code).toBe('solver.invalidOption');
          });
        });

      it('is what forcingChain and forcingChainLong ask for, and no other registered id has a fallback',
        function () {
          var c = CS.SHORT_MAX;
          var spec = {
            forcingChain: { minLength: 1, maxLength: c, groupLimit: 4096, workLimit: 50000, fallback: true },
            forcingChainLong: { minLength: c + 1, maxLength: 12, groupLimit: 4096, workLimit: 50000, fallback: false }
          };
          var states = [FAR_STATE, fixtureState(CHAIN_FIXTURES[2]), fixtureState(CHAIN_FIXTURES[4]),
            stuck(PUZZLE_530, 4)];
          var models = [FAR, model9, model9, model9];
          Object.keys(spec).forEach(function (id) {
            states.forEach(function (state, i) {
              var want = called('seam', models[i], state, Object.assign({ id: id }, spec[id]));
              var got = called(id, models[i], state);
              expect([id, i, JSON.stringify(got.finding)]).toEqual([id, i, JSON.stringify(want.finding)]);
              expect([id, i, JSON.stringify(got.records)]).toEqual([id, i, JSON.stringify(want.records)]);
            });
          });
          // the other chain ids report the five fields of every other finder, and nothing of a grouped attempt
          ['xyChain', 'nishio'].forEach(function (id) {
            var rec = called(id, model9, fixtureState(CHAIN_FIXTURES[0])).record;
            expect([id, Object.keys(rec).sort()]).toEqual([id, ['capHit', 'id', 'limit', 'retained', 'work']]);
          });
        });
    });

  describe('grouped forcing (R16, MS13c, S-OD11): the parent budget, cancellation and the record', function () {
    var FAR = ringsModel([2001, 5]);
    var FAR_STATE = SG.model.initState(FAR);
    var capCache = null;
    /** The stuck position of puzzle #530 with C = 6 (computed once): its long proof is out of the allowance. */
    function capState() {
      if (capCache === null) {
        capCache = withCutoff(6, function () { return stuckItem(PUZZLE_530, idsBefore('forcingChainLong')).state; });
      }
      return capCache;
    }
    var WINDOW7 = { id: 'x', minLength: 7, maxLength: 12 };

    /** A context whose k-th parent-budget check throws `failWith` (never for k = 0), counting every check. */
    function failingAt(m, k, failWith, records) {
      var ctx = Object.assign({}, ctxFor(m), { options: { onPatternWork: function (r) { records.push(r); } },
        check: function () {
          ctx.checks++;
          if (ctx.checks === k) throw failWith;
        } });
      ctx.checks = 0;
      return ctx;
    }

    function attempt(how, m, state, opts, k, failWith) {
      var records = [];
      var ctx = failingAt(m, k, failWith, records);
      var error = null;
      var finding = null;
      try {
        finding = how === 'seam' ? CS.groupedForcing(m, state, ctx, opts) : SG.techniques.get(how).find(m, state, ctx);
      } catch (err) {
        error = err;
      }
      return { finding: finding, error: error, records: records, checks: ctx.checks };
    }

    it('does not recover from a spent parent budget: not in the construction, the search, before the fallback or in it',
      function () {
        // the checks of the attempt alone (no fallback) and of the whole call, counted on a free run
        var free = attempt('forcingChain', FAR, FAR_STATE, null, 0, null);
        var alone = attempt('seam', FAR, FAR_STATE, { id: 'x', minLength: 1, maxLength: 4 }, 0, null);
        var G = alone.checks;
        expect(free.checks).toBeGreaterThan(G + 5);
        // inside the construction: no Finding, no fallback, nothing after the failing check
        [1, 2, 3, Math.floor(G / 2), G].forEach(function (k) {
          var out = attempt('forcingChain', FAR, FAR_STATE, null, k, spentBudget());
          expect([k, out.error, out.finding, out.checks]).toEqual([k, null, null, k]);
          expect([k, out.records.length, out.records[0].grouped.stop, out.records[0].fallback, out.records[0].domain])
            .toEqual([k, 1, 'parent-budget', null, null]);
        });
        // the check before entering the fallback: the cap stays recorded, the fallback is not entered
        var before = attempt('forcingChain', FAR, FAR_STATE, null, G + 1, spentBudget());
        expect([before.error, before.finding, before.checks]).toEqual([null, null, G + 1]);
        var rb = before.records[0];
        expect([rb.grouped.stop, rb.fallback, rb.domain, rb.work]).toEqual(['construction-work', {
          entered: false, work: 0, outcome: 'parent-budget' }, null, 50000]);
        // inside the fallback: entered, spent, no second try
        var inside = attempt('forcingChain', FAR, FAR_STATE, null, G + 2, spentBudget());
        expect([inside.error, inside.finding, inside.checks]).toEqual([null, null, G + 2]);
        expect([inside.records[0].fallback.entered, inside.records[0].fallback.outcome, inside.records[0].domain])
          .toEqual([true, 'parent-budget', null]);
        // a budget that lasts to the end gives the Finding of the fallback
        expect(attempt('forcingChain', FAR, FAR_STATE, null, free.checks + 10, spentBudget()).finding.i18nArgs.length)
          .toBe(3);
      });

    it('stops at a spent parent budget in the search too, without a fallback even when one is allowed', function () {
      withCutoff(6, function () {
        var item = capState();
        var opts = Object.assign({ fallback: true }, WINDOW7);
        var grouped = attempt('seam', model9, item, opts, 0, null);
        var G = grouped.checks;
        expect(grouped.records[0].fallback.entered).toBe(true);
        var attemptOnly = attempt('seam', model9, item, Object.assign({ fallback: false }, WINDOW7), 0, null);
        var K = attemptOnly.checks;
        expect(G).toBeGreaterThan(K);
        // inside the search, and at the last check of the attempt: no fallback although one is allowed
        [K - 40, K - 1, K].forEach(function (k) {
          var out = attempt('seam', model9, item, opts, k, spentBudget());
          expect([k, out.error, out.finding, out.checks]).toEqual([k, null, null, k]);
          expect([k, out.records[0].grouped.stop, out.records[0].fallback, out.records[0].domain])
            .toEqual([k, 'parent-budget', null, null]);
          expect(out.records[0].grouped.graph).toBe('complete');
          expect(out.records[0].grouped.minimum).toBe('incomplete');
        });
      });
    });

    it('lets cancellation and every other error through, with no record and no fallback', function () {
      var cancelled = new SG.errors.GenerationError('budget.cancelled', { reason: 'cancelled' });
      var boom = new Error('boom');
      var alone = attempt('seam', FAR, FAR_STATE, { id: 'x', minLength: 1, maxLength: 4 }, 0, null);
      var G = alone.checks;
      [cancelled, boom].forEach(function (failWith) {
        [1, Math.floor(G / 2), G, G + 1, G + 2].forEach(function (k) {
          var out = attempt('forcingChain', FAR, FAR_STATE, null, k, failWith);
          expect([k, out.error, out.finding, out.records.length, out.checks]).toEqual([k, failWith, null, 0, k]);
        });
        var long = attempt('forcingChainLong', FAR, FAR_STATE, null, 2, failWith);
        expect([long.error, long.records.length]).toEqual([failWith, 0]);
      });
      // a real cancelled budget
      var budget = SG.budget.create({});
      budget.cancel();
      var err = caught(function () { run('forcingChain', FAR, FAR_STATE, { budget: budget }); });
      expect(err.code).toBe('budget.cancelled');
    });

    it('keeps one parent budget: no refund, no new budget, and the caller still finds it spent afterwards',
      function () {
        var budget = SG.budget.create({ nodes: 5 });
        var out = called('forcingChain', FAR, FAR_STATE, null, { budget: budget });
        expect([out.finding, out.record.grouped.stop]).toEqual([null, 'parent-budget']);
        expect(budget.nodes).toBeGreaterThan(5);
        expect(caught(function () { budget.check(); }).code).toBe('budget.exceeded');
        // an ample budget changes nothing, and is ticked by every stage (more than the unbounded singleton path)
        var ample = SG.budget.create({ nodes: 1e7 });
        var rich = called('forcingChain', FAR, FAR_STATE, null, { budget: ample });
        expect(same(rich.finding, called('forcingChain', FAR, FAR_STATE).finding)).toBe(true);
        var singletonBudget = SG.budget.create({ nodes: 1e7 });
        singleton('forcingChain', FAR, FAR_STATE, { budget: singletonBudget });
        expect(ample.nodes).toBeGreaterThan(singletonBudget.nodes);
      });

    it('reports one fresh record per normal return, every stage in its work, and observes without selecting',
      function () {
        var out = called('forcingChain', FAR, FAR_STATE);
        var again = called('forcingChain', FAR, FAR_STATE);
        expect(out.records.length).toBe(1);
        expect(out.record).not.toBe(again.record);
        expect(out.record.grouped).not.toBe(again.record.grouped);
        expect(out.record).toEqual(again.record);
        var calls = 0;
        var hostile = run('forcingChain', FAR, FAR_STATE, { onPatternWork: function (r) {
          calls++;
          r.work = -1;
          r.domain = 'grouped';
          r.grouped.stop = null;
          return 'ignored';
        } });
        expect(calls).toBe(1);
        expect(hostile).toEqual(out.finding);
        expect(run('forcingChain', FAR, FAR_STATE, { onPatternWork: 'not a function' })).toEqual(out.finding);
        // the domain is the control flow's: a singleton proof wins a complete grouped search (domain grouped, the
        // Finding of the singleton form), and a fallback proof is the singleton graph's, whatever it contains
        var pure = called('forcingChain', model9, fixtureState(CHAIN_FIXTURES[0]));
        expect([pure.record.domain, pure.finding.i18nArgs.proofVersion, pure.record.fallback])
          .toEqual(['grouped', undefined, null]);
        var grouped = called('forcingChain', model9, seeded('classic9')[880].state);
        expect([grouped.record.domain, grouped.finding.i18nArgs.proofVersion]).toEqual(['grouped', 2]);
        expect(out.record.domain).toBe('singleton');
      });

    it('counts the stages of real positions exactly: the construction by the checker, the search and the checks recorded',
      function () {
        // [model, position, id, additional nodes, search units, parent-budget checks, links of the Finding or null]
        var PINS = [
          ['classic9', 1, 'forcingChain', 65, 3522, 220, 3],
          ['classic9', 1, 'forcingChainLong', 65, 833, 37, null],
          ['classic9', 880, 'forcingChain', 172, 8384, 433, 3],
          ['classic9', 880, 'forcingChainLong', 172, 2725, 86, null],
          ['classic6', 121, 'forcingChain', 14, 1332, 79, 3],
          ['classic6', 121, 'forcingChainLong', 14, 61, 6, null]
        ];
        PINS.forEach(function (row) {
          var m = H.model(row[0]);
          var state = seeded(row[0])[row[1]].state;
          var records = [];
          var checks = 0;
          var ctx = Object.assign({}, ctxFor(m, { onPatternWork: function (r) { records.push(r); } }),
            { check: function () { checks++; } });
          var finding = SG.techniques.get(row[2]).find(m, state, ctx);
          var at = row[0] + ' #' + row[1] + ' ' + row[2];
          var g = records[0].grouped;
          // the construction and the nodes are the checker's; the search units and the checks are recorded values of
          // the registered search (one unit per link visited, one check per start and per 256 units)
          expect([at, g.construction]).toEqual([at, CP.expectedWork(m, state).total]);
          expect([at, g.additional]).toEqual([at, CP.expectedNodes(m, state).nodes.filter(function (n) {
            return n.cells.length > 1;
          }).length]);
          expect([at, g.additional, g.search, records[0].work, checks, finding === null ? null : finding.i18nArgs.length])
            .toEqual([at, row[3], row[4], g.construction + row[4], row[5], row[6]]);
          expect([at, g.stop, g.graph, g.minimum, records[0].domain]).toEqual([at, null, 'complete', 'complete',
            'grouped']);
        });
      });

    it('lets no more than 256 units pass between two parent-budget checks across both stages', function () {
      // a hub of 300 spokes: its true literal has 301 weak links, so the search splits an expansion into pieces
      var m = starModel(300);
      var state = SG.model.initState(m);
      var opts = { id: 'x', minLength: 1, maxLength: 12, workLimit: 95000 };
      var free = attempt('seam', m, state, opts, 0, null);
      var works = [];
      for (var k = 1; k <= free.checks; k++) {
        var spent = attempt('seam', m, state, opts, k, spentBudget());
        works.push(spent.records[0].work);
      }
      expect(works[0]).toBe(0);
      var gaps = works.map(function (w, i) { return w - (i === 0 ? 0 : works[i - 1]); });
      gaps.push(free.records[0].work - works[works.length - 1]);
      gaps.forEach(function (gap) { expect(gap).toBeLessThan(257); });
      expect(Math.max.apply(null, gaps)).toBe(256);
      // the search stage begins where the construction ended
      expect(free.records[0].grouped.construction).toBeGreaterThan(256);
      expect(free.records[0].grouped.search).toBeGreaterThan(0);
    });
  });

  // Acceptance: nightmare puzzles that the lower technique groups cannot finish
  describe('chain group: nightmare puzzles', function () {
    /** Applies the four chain ids (and the singles they unlock) until none finds anything. */
    function chainOnly(start, solution) {
      var state = SG.model.cloneState(start);
      var used = { forcingChain: 0, forcingChainLong: 0, nishio: 0, nishioDeep: 0 };
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
      expect(deep.steps.some(function (s) { return s.technique === 'nishioDeep' && s.i18nArgs.depth === 2; }))
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
      // both windows of the chain, so that the limit decides what is solved, whatever the cutoff C is
      var chains = ['forcingChain', 'forcingChainLong'];
      cases.forEach(function (tc) {
        for (var limit = 1; limit <= 12; limit++) {
          var report = SG.logicalSolver.solve(model9, H.parsePuzzle(model9, tc.puzzle), {
            allowedTechniques: singles.concat(chains), collectSteps: true, maxChainLength: limit });
          expect(report.solved).toBe(limit >= tc.needs);
          report.steps.forEach(function (s) {
            if (chains.indexOf(s.technique) !== -1) expect(s.i18nArgs.length).toBeLessThanOrEqual(limit);
          });
        }
      });
    });

    it('honours maxChainLength given to the solver for the long window too: 7 and 8 links need that much',
      function () {
        // Lower techniques and the two chain ids, no nishio: puzzle #68 of the long-chain list is solved with
        // chains of 7 links, #3329 with chains of 8 (#155 and #379 until MS13c and MS10b); a smaller limit
        // leaves both stuck, a larger one changes nothing (the solver's option only narrows the windows).
        var ids = lowerIds().concat(['forcingChain', 'forcingChainLong']);
        [[LONG_CHAIN_PUZZLES[2], 7], [LONG_CHAIN_PUZZLES[4], 8]].forEach(function (tc) {
          for (var limit = 1; limit <= 12; limit++) {
            var report = SG.logicalSolver.solve(model9, H.parsePuzzle(model9, tc[0]),
              { allowedTechniques: ids, collectSteps: true, maxChainLength: limit });
            expect([tc[1], limit, report.solved]).toEqual([tc[1], limit, limit >= tc[1]]);
            report.steps.forEach(function (s) {
              if (s.technique === 'forcingChainLong') {
                expect(s.i18nArgs.length).toBeGreaterThan(SG.chainSearch.SHORT_MAX);
                expect(s.i18nArgs.length).toBeLessThanOrEqual(limit);
              }
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
