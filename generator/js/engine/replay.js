/**
 * Generation Steps analysis (`SG.replay`): reads a finished PuzzleResult and never changes it. It turns the
 * dig log into complete moves (`moves`: a symmetric group, an exchange of clues, or one sign; never half of
 * one) and rates the board after every move once (`rateBoard`, `prepare`, `analyse`), keeping an honest
 * status when a board cannot be rated. It is pure: no DOM, no clock, no random numbers, so two analyses of
 * one result agree field by field, except for the work counts `checks` (see Ratings), and they are counts,
 * not time.
 *
 * Moves. The log entries of the engine (digger.js, greater-than.js, killer.js) become positions of the
 * board: position 0 is the full solution; every accepted group, every exchange (a removal followed by the
 * clues the local search shows again), every sign removal, every group of clues shown again and every
 * restart is one more position. The last position must be the finished puzzle, or the log is not trusted
 * (`mismatch`).
 *
 * Ratings. One canonical solve per distinct board (every technique, a guard of RATE_NODES checks); when the
 * proof assumes uniqueness the solutions are counted too (a guard of COUNT_NODES nodes). The finished puzzle
 * keeps `result.rating` and is never rated again. A board that cannot be rated gets a status, never a
 * guess: capped, stuck, ambiguous or unverified. `checks` is the work count of the solve (`budget.nodes`);
 * the subset techniques of the solver space their budget checks with a counter that lives across solves
 * (core/js/engine/tech-subset.js), so a count can differ by a few between two runs of the same board.
 *
 * Data shapes (Move, Span, Rating, Analysis, View) are plain data that survive a structured clone: ids,
 * numbers, cell indexes and typed arrays, no text and no functions.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  const VERSION = 1;

  // RATE_NODES / COUNT_NODES: the guards of a rating and of a uniqueness count; MIN_GAIN .. PROBE_MAX_CELLS
  // belong to the selection and the explanation of jumps (later tasks).
  const CONSTANTS = Object.freeze({
    RATE_NODES: 1000000,
    COUNT_NODES: 200000,
    MIN_GAIN: 10,
    R_MIN: 1.3,
    R_MAX: 3,
    R_EXP: 1 / 6,
    JUMP_RATIO: 3,
    JUMP_GAIN: 100,
    CULPRIT_SHARE: 0.9,
    TOGETHER_SHARE: 0.1,
    PROBE_MAX_CELLS: 4
  });

  function isEntry(entry) {
    return entry !== null && typeof entry === 'object' && typeof entry.op === 'string';
  }

  function ascending(list) {
    return Array.from(list).sort(function (a, b) { return a - b; });
  }

  function isCells(cells, n) {
    if (!Array.isArray(cells)) return false;
    const seen = new Set();
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (!Number.isInteger(c) || c < 0 || c >= n || seen.has(c)) return false;
      seen.add(c);
    }
    return true;
  }

  function isPair(pair, n) {
    return Array.isArray(pair) && pair.length === 2 && isCells(pair, n);
  }

  function sameList(a, b) {
    if (a === null || b === null) return a === b;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function sameSet(a, b) {
    return a.length === b.length && sameList(ascending(a), ascending(b));
  }

  function zerosIn(values) {
    let count = 0;
    for (let i = 0; i < values.length; i++) if (values[i] === 0) count++;
    return count;
  }

  function isBudgetError(err) {
    return err !== null && typeof err === 'object' && err.code === 'budget.exceeded';
  }

  // The reject entries of a dig log carry the reason; a missing one is counted as 'unknown'.
  function addReason(reasons, reason) {
    const key = typeof reason === 'string' ? reason : 'unknown';
    reasons[key] = (reasons[key] || 0) + 1;
  }

  // The keep / reject entries of a stretch of the log, as counts and lists (cell candidates and signs apart).
  function tally(entries) {
    const out = { rated: 0, refused: 0, rejected: [], rejectedSigns: [], reasons: {} };
    entries.forEach(function (e) {
      if (e.op === 'keep') {
        out.rated++;
      } else if (typeof e.sign === 'number') {
        out.rejectedSigns.push(e.sign);
        addReason(out.reasons, e.reason);
      } else {
        out.rated++;
        out.refused++;
        e.cells.forEach(function (c) { out.rejected.push(c); });
        addReason(out.reasons, e.reason);
      }
    });
    return out;
  }

  // The Span of an accept: the keeps and rejects since the previous accept of the pass. The chosen candidate
  // is the last keep with the accepted cells; the other keeps tell how far it stood out.
  function spanOf(entries, cells) {
    const t = tally(entries);
    let chosenAt = -1;
    for (let i = entries.length - 1; i >= 0 && chosenAt === -1; i--) {
      if (entries[i].op === 'keep' && sameSet(entries[i].cells, cells)) chosenAt = i;
    }
    let chosen = null;
    let others = 0;
    let nulls = 0;
    let max = null;
    entries.forEach(function (e, i) {
      if (e.op !== 'keep') return;
      const finite = typeof e.score === 'number' && isFinite(e.score);
      if (i === chosenAt) {
        chosen = finite ? e.score : null;
      } else if (finite) {
        others++;
        if (max === null || e.score > max) max = e.score;
      } else {
        nulls++;
      }
    });
    return {
      rated: t.rated,
      refused: t.refused,
      chosen: chosen,
      others: others,
      nulls: nulls,
      max: max,
      rejected: t.rejected,
      rejectedSigns: t.rejectedSigns,
      reasons: t.reasons,
      trail: null
    };
  }

  // Killer's rebuilt log (the layout search of an Expert or harder request): one random pass that removes, in
  // order, every symmetry group without a clue. It records no real dig, so it must not claim a random order.
  function isRebuilt(result, log) {
    const model = result.model;
    if (!model.cages || model.cages.length === 0 || !Array.isArray(log) || log.length === 0) return false;
    try {
      const asked = SG.difficulty.bandOf(result.config.difficulty).min;
      if (!(asked >= SG.difficulty.bandOf('expert').min)) return false;
      const first = log[0];
      if (!isEntry(first) || first.op !== 'pass' || first.pass !== 'random') return false;
      if (first.clues !== model.cellCount) return false;
      const givens = result.givens;
      const expected = SG.symmetry.groups(model, result.config.symmetry).filter(function (group) {
        return Array.prototype.every.call(group, function (c) { return givens[c] === 0; });
      });
      if (expected.length !== log.length - 1) return false;
      for (let i = 0; i < expected.length; i++) {
        const e = log[i + 1];
        if (!isEntry(e) || e.op !== 'accept' || e.sign !== undefined || !Array.isArray(e.cells)) return false;
        if (!sameList(e.cells, Array.from(expected[i]))) return false;
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * The moves of a result: `{ ok, reason, moves, signs, structure, rebuilt, randomOrder, finishedAlive }`.
   * Pure; never calls a solver. `moves[0]` is the full solution; the last move is the finished puzzle.
   * Without a usable log (`reason`: 'noLog', 'unreadable', 'mismatch') only the solution move is returned.
   */
  function moves(result) {
    const model = result.model;
    const n = model.cellCount;
    const config = result.config || {};
    const log = Array.isArray(result.digLog) ? result.digLog : null;
    const given = result.solution;
    const solution = given && typeof given.length === 'number' && given.length === n ? given : null;

    const signEntry = log === null ? null : log.find(function (e) { return isEntry(e) && e.op === 'signs'; });
    const signs = signEntry && Array.isArray(signEntry.signs)
      ? signEntry.signs.map(function (pair) { return Array.isArray(pair) ? pair.slice() : pair; }) : null;
    const hasCages = Boolean(model.cages) && model.cages.length > 0;
    const hasInequalities = Boolean(model.inequalities) && model.inequalities.length > 0;
    const structure = hasCages ? 'cages' : signs !== null || hasInequalities ? 'signs' : null;
    let finishedAlive = null;
    if (signs !== null) {
      const present = new Set((model.inequalities || []).map(function (s) { return s.a + ',' + s.b; }));
      finishedAlive = [];
      signs.forEach(function (pair, k) {
        if (Array.isArray(pair) && present.has(pair[0] + ',' + pair[1])) finishedAlive.push(k);
      });
    }
    const rebuilt = isRebuilt(result, log);
    const randomOrder = (config.digOrder || 'random') === 'random' && !rebuilt;

    function outcome(ok, reason, list) {
      return {
        ok: ok,
        reason: reason,
        moves: list,
        signs: signs,
        structure: structure,
        rebuilt: rebuilt,
        randomOrder: randomOrder,
        finishedAlive: finishedAlive
      };
    }

    if (solution === null) return outcome(false, 'noLog', []);

    const board = Int32Array.from(solution);
    const alive = signs === null ? null : signs.map(function () { return 1; });
    function aliveList() {
      if (alive === null) return null;
      const list = [];
      alive.forEach(function (flag, k) { if (flag === 1) list.push(k); });
      return list;
    }

    const list = [];
    let pass = null;
    function push(fields) {
      const move = Object.assign({
        index: list.length,
        kind: null,
        phase: null,
        pass: pass,
        from: -1,
        to: -1,
        at: -1,
        removed: [],
        restored: [],
        sign: null,
        span: null,
        values: Int32Array.from(board),
        alive: aliveList()
      }, fields);
      list.push(move);
      return move;
    }
    const first = push({ kind: 'solution', phase: 'start' });
    if (log === null || log.length === 0) return outcome(false, 'noLog', [first]);
    if (signs !== null && !signs.every(function (pair) { return isPair(pair, n); })) {
      return outcome(false, 'unreadable', [first]);
    }

    let signsStarted = false;
    let opening = null;
    let entries = [];
    let firstEntry = -1;
    let lastAccept = null;

    function closeOpening() {
      if (opening === null) return;
      push({
        kind: 'clues', phase: 'clues', from: opening.from, to: opening.to, restored: ascending(opening.cells)
      });
      opening = null;
    }
    function closeTrail() {
      if (entries.length > 0 && lastAccept !== null) {
        const t = tally(entries);
        lastAccept.span.trail = {
          rated: t.rated,
          refused: t.refused,
          rejected: t.rejected,
          rejectedSigns: t.rejectedSigns,
          reasons: t.reasons
        };
      }
      entries = [];
    }
    function note(entry, offset) {
      if (entries.length === 0) firstEntry = offset;
      entries.push(entry);
    }
    function accepted(fields, offset, cells) {
      const move = push(Object.assign({
        from: entries.length > 0 ? firstEntry : offset, to: offset, at: offset, span: spanOf(entries, cells)
      }, fields));
      lastAccept = move;
      entries = [];
      return move;
    }

    for (let offset = 0; offset < log.length; offset++) {
      const e = log[offset];
      if (!isEntry(e) || e.op === 'signs') continue;
      if (e.op === 'pass') {
        closeOpening();
        closeTrail();
        pass = typeof e.pass === 'string' ? e.pass : null;
        if (pass === 'signs' || pass === 'signs.minimal') signsStarted = true;
        lastAccept = null;
      } else if (e.op === 'clear') {
        closeOpening();
        closeTrail();
        board.fill(0);
        opening = { from: offset, to: offset, cells: [] };
      } else if (e.op === 'reveal') {
        if (!isCells(e.cells, n)) return outcome(false, 'unreadable', [first]);
        e.cells.forEach(function (c) { board[c] = solution[c]; });
        if (opening !== null && !signsStarted) {
          e.cells.forEach(function (c) { opening.cells.push(c); });
          opening.to = offset;
          continue;
        }
        closeOpening();
        const last = list[list.length - 1];
        const pairs = last.at === offset - 1 && last.sign === null && last.removed.length > 0;
        if (e.reason === 'search' && pairs) {
          last.kind = 'exchange';
          last.phase = 'search';
          last.restored = ascending(e.cells);
          last.to = offset;
          last.values = Int32Array.from(board);
        } else {
          const search = e.reason === 'search';
          push({
            kind: search ? 'searchAdd' : 'reveal',
            phase: search ? 'search' : 'reveal',
            from: offset,
            to: offset,
            restored: ascending(e.cells)
          });
        }
      } else if (e.op === 'accept') {
        closeOpening();
        if (typeof e.sign === 'number') {
          if (signs === null || !Number.isInteger(e.sign) || e.sign < 0 || e.sign >= signs.length) {
            return outcome(false, 'unreadable', [first]);
          }
          alive[e.sign] = 0;
          accepted({
            kind: 'sign', phase: pass === 'signs.minimal' ? 'signsMinimal' : 'signs', sign: e.sign
          }, offset, Array.isArray(e.cells) ? e.cells : []);
        } else {
          if (!isCells(e.cells, n)) return outcome(false, 'unreadable', [first]);
          e.cells.forEach(function (c) { board[c] = 0; });
          const guided = pass === 'guided';
          const searching = guided && !entries.some(function (x) { return x.op === 'keep'; });
          accepted({
            kind: guided ? (searching ? 'searchRemove' : 'guided') : 'random',
            phase: guided ? (searching ? 'search' : 'guided') : 'random',
            removed: ascending(e.cells)
          }, offset, e.cells);
        }
      } else if (e.op === 'reject') {
        closeOpening();
        if (typeof e.sign === 'number') {
          if (signs === null || !Number.isInteger(e.sign) || e.sign < 0 || e.sign >= signs.length) {
            return outcome(false, 'unreadable', [first]);
          }
        } else if (!isCells(e.cells, n)) {
          return outcome(false, 'unreadable', [first]);
        }
        note(e, offset);
      } else if (e.op === 'keep') {
        if (!isCells(e.cells, n)) return outcome(false, 'unreadable', [first]);
        note(e, offset);
      } else if (e.op === 'restart') {
        closeOpening();
        closeTrail();
        board.set(solution);
        push({ kind: 'restart', phase: 'start', from: offset, to: offset });
        pass = null;
        lastAccept = null;
      }
    }
    closeOpening();
    closeTrail();

    const finish = list[list.length - 1];
    const matches = result.givens && result.givens.length === n && sameList(finish.values, result.givens);
    if (!matches || !sameList(finish.alive, finishedAlive)) return outcome(false, 'mismatch', [first]);
    return outcome(true, null, list);
  }

  function emptyRating(empties) {
    return {
      status: 'rated',
      reasons: [],
      score: null,
      counts: {},
      empties: empties,
      hardest: null,
      P: null,
      W: null,
      R: null,
      V: null,
      level: null,
      checks: 0,
      memo: false
    };
  }

  function zeroRating() {
    return Object.assign(emptyRating(0), {
      status: 'zero', score: 0, P: 0, W: 0, R: 0, V: 0
    });
  }

  // Fills the score parts of a rating from the technique counts; null parts when the counts are not known.
  function scored(rating, score, counts, empties) {
    rating.score = score;
    rating.level = SG.difficulty.levelOfScore(score);
    rating.counts = Object.assign({}, counts);
    rating.empties = empties;
    try {
      const parts = SG.difficulty.breakdown(counts, empties);
      rating.P = parts.peak;
      rating.W = parts.work;
      rating.R = parts.workTerm;
      rating.V = parts.empty;
    } catch (err) {
      rating.P = rating.W = rating.R = rating.V = null;
    }
    return rating;
  }

  // The rating the generator itself recorded for the finished puzzle; null when it has no finite score.
  function finalRating(result) {
    const supplied = result.rating;
    if (!supplied || typeof supplied.score !== 'number' || !isFinite(supplied.score)) return null;
    const empties = typeof supplied.empties === 'number' ? supplied.empties : zerosIn(result.givens);
    const rating = scored(emptyRating(empties), supplied.score, supplied.techniqueCounts || {}, empties);
    rating.status = 'final';
    rating.hardest = typeof supplied.hardestTechnique === 'string' ? supplied.hardestTechnique : null;
    return rating;
  }

  function missingRating(result) {
    return Object.assign(emptyRating(zerosIn(result.givens)), {
      status: 'unverified', reasons: ['missingRating']
    });
  }

  function copyRating(rating) {
    return Object.assign({}, rating, {
      reasons: rating.reasons.slice(), counts: Object.assign({}, rating.counts)
    });
  }

  function numberOption(value, fallbackValue) {
    return typeof value === 'number' && !isNaN(value) ? value : fallbackValue;
  }

  // Counts the solutions of a board up to two; null when the guard ran out first.
  function countSolutions(model, values, countNodes) {
    try {
      return SG.dfs.countSolutions(model, values, 2, SG.budget.create({ nodes: countNodes }));
    } catch (err) {
      if (isBudgetError(err)) return null;
      throw err;
    }
  }

  /**
   * One canonical rating of one board: the logical solver with every technique (a guard of `rateNodes`
   * checks), then, when the proof assumes uniqueness (or `forceCount`), a count of the solutions (a guard of
   * `countNodes` nodes). Returns a Rating; `status` is 'rated', 'capped', 'stuck', 'ambiguous' or
   * 'unverified'. Errors other than the guards propagate.
   */
  function rateBoard(model, values, options) {
    const opts = options || {};
    const rateNodes = numberOption(opts.rateNodes, CONSTANTS.RATE_NODES);
    const countNodes = numberOption(opts.countNodes, CONSTANTS.COUNT_NODES);
    const rating = emptyRating(zerosIn(values));
    const budget = SG.budget.create({ nodes: rateNodes });
    let report;
    try {
      report = SG.logicalSolver.solve(model, values, {
        allowedTechniques: null, collectSteps: false, assumeUniqueness: true, budget: budget
      });
    } catch (err) {
      if (!isBudgetError(err)) throw err;
      rating.status = 'capped';
      rating.reasons = ['capped'];
      rating.checks = budget.nodes;
      return rating;
    }
    rating.checks = budget.nodes;
    const r = SG.difficulty.classify(report, model);
    const attempted = Object.assign({}, report.techniqueCounts);

    if (report.status !== 'solved') {
      rating.status = 'stuck';
      rating.reasons = [report.status === 'contradiction' ? 'contradiction' : 'stuck'];
      rating.counts = attempted;
      const found = countSolutions(model, values, countNodes);
      if (found === 2) rating.reasons.push('ambiguous');
      else if (found === 0 && rating.reasons[0] === 'stuck') rating.reasons.push('contradiction');
      return rating;
    }

    if (opts.forceCount === true || !SG.difficulty.provesUniqueness(r)) {
      const found = countSolutions(model, values, countNodes);
      if (found !== 1) {
        rating.counts = attempted;
        if (found === 2) {
          rating.status = 'ambiguous';
          rating.reasons = ['ambiguous'];
        } else if (found === null) {
          rating.status = 'unverified';
          rating.reasons = ['unverified'];
        } else {
          rating.status = 'stuck';
          rating.reasons = ['contradiction'];
        }
        return rating;
      }
    }
    scored(rating, r.score, r.techniqueCounts, r.empties);
    rating.hardest = r.hardestTechnique;
    return rating;
  }

  // The steps of the details view: the solution, the structure (when there is one), a step per move and the
  // finished puzzle. `add` appends a ViewStep; `position` is the move that ends it.
  function stepList(structure, hasSolution) {
    const steps = [];
    function add(role, first, last, phases, kinds) {
      steps.push({
        role: role, first: first, last: last, position: last, phases: phases, kinds: kinds, transition: null
      });
    }
    if (hasSolution) add('solution', 0, 0, [], []);
    if (hasSolution && structure !== null) add('structure', 0, 0, [], []);
    return { steps: steps, add: add };
  }

  function assemble(result, mm, list, ratings, steps, reason, stats) {
    const config = result.config || {};
    let band;
    try {
      band = SG.difficulty.bandOf(config.difficulty);
    } catch (err) {
      band = { min: 0, max: Infinity };
    }
    return {
      version: VERSION,
      fallback: reason,
      rebuilt: mm.rebuilt,
      randomOrder: mm.randomOrder,
      structure: mm.structure,
      signs: mm.signs,
      level: config.difficulty === undefined ? null : config.difficulty,
      band: band,
      moves: list,
      ratings: ratings,
      chapter: 0,
      views: { compact: null, details: { name: 'details', steps: steps, audit: [] } },
      transitions: [],
      proofs: {},
      stats: stats
    };
  }

  /**
   * The conservative analysis of a result whose moves cannot be rated: the solution, the finished puzzle with
   * the rating the generator recorded, and (with a structure) the structure step. Never calls a solver.
   * `reason`: 'noLog', 'unreadable', 'mismatch' or 'error'.
   */
  function fallback(result, reason) {
    const mm = moves(result);
    const solutionMove = mm.moves.length > 0 ? mm.moves[0] : null;
    const list = solutionMove === null ? [] : [solutionMove];
    const ratings = solutionMove === null ? [] : [zeroRating()];
    const finalIndex = list.length;
    list.push({
      index: finalIndex,
      kind: 'final',
      phase: 'final',
      pass: null,
      from: -1,
      to: -1,
      at: -1,
      removed: [],
      restored: [],
      sign: null,
      span: null,
      values: Int32Array.from(result.givens),
      alive: mm.finishedAlive === null ? null : mm.finishedAlive.slice()
    });
    ratings.push(finalRating(result) || missingRating(result));
    const view = stepList(mm.structure, solutionMove !== null);
    view.add('final', finalIndex, finalIndex, [], []);
    const zero = solutionMove === null ? 0 : 1;
    const stats = { positions: list.length, fresh: 0, memo: 0, zero: zero, checks: 0 };
    return assemble(result, mm, list, ratings, view.steps, reason, stats);
  }

  function* prepare(result, options) {
    const opts = options || {};
    const mm = moves(result);
    if (!mm.ok) return fallback(result, mm.reason);
    const final = finalRating(result);
    if (final === null) return fallback(result, 'error');

    const list = mm.moves;
    const total = list.length;
    const signs = mm.signs;
    const memo = new Map();
    const models = new Map();
    function key(values, alive) {
      return values.join(',') + '|' + (alive || []).join(',');
    }
    function modelFor(alive) {
      if (alive === null) return result.model;
      const id = alive.join(',');
      if (!models.has(id)) {
        models.set(id, SG.greaterThan.withSigns(result.model, alive.map(function (k) {
          return { a: signs[k][0], b: signs[k][1] };
        })));
      }
      return models.get(id);
    }
    memo.set(key(result.givens, mm.finishedAlive), final);

    const ratings = [];
    const stats = { positions: total, fresh: 0, memo: 0, zero: 0, checks: 0 };
    for (let i = 0; i < total; i++) {
      const move = list[i];
      if (move.kind === 'solution' || move.kind === 'restart') {
        ratings.push(zeroRating());
        stats.zero++;
      } else {
        const id = key(move.values, move.alive);
        if (memo.has(id)) {
          ratings.push(Object.assign(copyRating(memo.get(id)), { memo: true }));
          stats.memo++;
        } else {
          const rating = rateBoard(modelFor(move.alive), move.values, opts);
          memo.set(id, rating);
          ratings.push(rating);
          stats.fresh++;
          stats.checks += rating.checks;
        }
      }
      yield { done: i + 1, total: total };
    }

    const view = stepList(mm.structure, true);
    for (let i = 1; i < total; i++) {
      view.add(list[i].kind === 'restart' ? 'restart' : 'moves', i, i, [list[i].phase], [list[i].kind]);
    }
    view.add('final', total - 1, total - 1, [], []);
    return assemble(result, mm, list, ratings, view.steps, null, stats);
  }

  /** Runs `prepare` to its end and returns the Analysis. */
  function analyse(result, options) {
    const steps = prepare(result, options);
    for (;;) {
      const next = steps.next();
      if (next.done) return next.value;
    }
  }

  function plain(value) {
    if (ArrayBuffer.isView(value)) return Array.from(value);
    if (Array.isArray(value)) return value.map(plain);
    if (value !== null && typeof value === 'object') {
      const copy = {};
      Object.keys(value).forEach(function (key) { copy[key] = plain(value[key]); });
      return copy;
    }
    return value;
  }

  /** `SG.pipeline.toWire(result)` with every typed array as a plain array: survives JSON. */
  function toPlainWire(result) {
    return plain(SG.pipeline.toWire(result));
  }

  /** The PuzzleResult of `toPlainWire` data (also after a JSON round trip): givens and solution are typed. */
  function fromPlainWire(data) {
    const result = SG.pipeline.fromWire(data);
    if (data.givens) result.givens = Int32Array.from(data.givens);
    if (data.solution) result.solution = Int32Array.from(data.solution);
    return result;
  }

  SG.replay = {
    VERSION: VERSION,
    CONSTANTS: CONSTANTS,
    moves: moves,
    rateBoard: rateBoard,
    prepare: prepare,
    analyse: analyse,
    fallback: fallback,
    toPlainWire: toPlainWire,
    fromPlainWire: fromPlainWire
  };
})(typeof self !== 'undefined' ? self : globalThis);
