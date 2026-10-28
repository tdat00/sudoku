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
 * Views. `buildViews` turns the moves and ratings into the two views of the replay: the details view (one
 * step per move) and the compact view (a few steps chosen by score that never go down, `select`, checked by
 * `audit`: a jump left in it cannot be removed with the recorded moves), and into the transition between
 * every two adjacent steps of each view: the change of the Total, the terms before and after, and the tier
 * (`isJump`, `badgeRatio`). The transition belongs to the view: the same end board can be a jump in one view
 * and not in the other.
 *
 * Data shapes (Move, Span, Rating, Analysis, View, ViewStep, Transition) are plain data that survive a
 * structured clone: ids, numbers, cell indexes and typed arrays, no text and no functions.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  const VERSION = 1;

  // RATE_NODES / COUNT_NODES: the guards of a rating and of a uniqueness count; MIN_GAIN .. R_EXP drive the
  // compact selection, JUMP_RATIO and JUMP_GAIN the jump rule; CULPRIT_SHARE .. PROBE_MAX_CELLS belong to the
  // explanation of jumps (a later task).
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

  function isScore(value) {
    return typeof value === 'number' && isFinite(value);
  }

  // f10 of the selection: the ratios of small scores are measured from 10.
  function floorTen(value) {
    return Math.max(value, 10);
  }

  /**
   * The jump rule, on exact totals: a score before above 0, a gain of JUMP_GAIN or more and a multiple of
   * JUMP_RATIO or more. A zero or unknown baseline is never a jump.
   */
  function isJump(before, after) {
    return isScore(before) && isScore(after) && before > 0 &&
      after - before >= CONSTANTS.JUMP_GAIN && after >= CONSTANTS.JUMP_RATIO * before;
  }

  /** The ratio of a jump badge: one decimal, rounded down, so it never overstates. */
  function badgeRatio(before, after) {
    return Math.floor(10 * after / before) / 10;
  }

  // The letter of a phase in a mixed step and its code when it stands alone.
  const PHASES = Object.freeze({
    random: { letter: 'D', code: 'D/Dig' },
    guided: { letter: 'G', code: 'G/Choose' },
    search: { letter: 'X', code: 'X/Adjust' },
    reveal: { letter: 'A', code: 'A/Restore' },
    clues: { letter: 'C', code: 'C/Clues' },
    signs: { letter: 'I', code: 'I/Signs' },
    signsMinimal: { letter: 'IM', code: 'IM/Signs' }
  });

  /** The code of a ViewStep in the golden tables, for example 'S/Sol', 'D/Dig' or 'G+A/Mixed'. */
  function phaseCode(step, structure) {
    if (step.role === 'solution') return 'S/Sol';
    if (step.role === 'structure') return structure === 'cages' ? 'S/Cag' : 'S/Sig';
    if (step.role === 'restart') return 'S/Restart';
    if (step.role === 'final') return 'F/Final';
    const known = step.phases.map(function (phase) {
      const own = Object.prototype.hasOwnProperty.call(PHASES, phase);
      return own ? PHASES[phase] : { letter: phase, code: phase };
    });
    if (known.length === 0) return '';
    if (known.length === 1) return known[0].code;
    return known.map(function (p) { return p.letter; }).join('+') + '/Mixed';
  }

  /**
   * The cuts of the compact view. `entries[i] = { score, phase, kind }` is position i (null score: not
   * rated). The chapter starts at the last restart `s` and ends at the last rated position `e`; only
   * positions whose score is not above that of any later rated one can be cut (the view never goes down). A
   * cut has a rank, the largest rule that asked for it: 4 the chapter start, 3 the end and a rise by the
   * ratio, 2 the end of a phase, 1 a fill. Steps that gain less than MIN_GAIN lose a fill cut. Returns
   * `{ s, e, ratio, cuts }` with `cuts = [{ position, rank }]`; `options` overrides `minGain`, `rMin`,
   * `rMax` and `rExp`.
   */
  function select(entries, options) {
    const opts = options || {};
    const minGain = numberOption(opts.minGain, CONSTANTS.MIN_GAIN);
    const rMin = numberOption(opts.rMin, CONSTANTS.R_MIN);
    const rMax = numberOption(opts.rMax, CONSTANTS.R_MAX);
    const rExp = numberOption(opts.rExp, CONSTANTS.R_EXP);
    function score(i) {
      return isScore(entries[i].score) ? entries[i].score : null;
    }
    function value(i) {
      return score(i) === null ? 0 : score(i);
    }

    let s = 0;
    entries.forEach(function (entry, i) { if (entry.kind === 'restart') s = i; });
    let e = -1;
    for (let i = entries.length - 1; i >= s && e === -1; i--) if (score(i) !== null) e = i;
    if (e === -1) return { s: s, e: -1, ratio: rMin, cuts: [] };

    const eligible = [];
    let lowest = score(e);
    for (let i = e - 1; i > s; i--) {
      const here = score(i);
      if (here !== null && here <= lowest) {
        eligible.unshift(i);
        lowest = here;
      }
    }
    eligible.unshift(s);
    if (e > s) eligible.push(e);

    const ratio = Math.min(rMax, Math.max(rMin, Math.pow(floorTen(value(e)) / 10, rExp)));
    const rank = new Map();
    function raise(i, to) {
      if (!(rank.get(i) >= to)) rank.set(i, to);
    }
    function steep(a, b) {
      return floorTen(value(b)) >= ratio * floorTen(value(a));
    }
    raise(s, 4);
    raise(e, 3);
    for (let k = 0; k + 1 < eligible.length; k++) {
      if (steep(eligible[k], eligible[k + 1])) {
        raise(eligible[k], 3);
        raise(eligible[k + 1], 3);
      }
    }
    const canCut = new Set(eligible);
    for (let from = s + 1; from <= e;) {
      let to = from;
      while (to < e && entries[to + 1].phase === entries[from].phase) to++;
      for (let i = to; i >= from; i--) {
        if (canCut.has(i)) {
          raise(i, 2);
          break;
        }
      }
      from = to + 1;
    }
    let last = s;
    eligible.forEach(function (i) {
      if (i <= s) return;
      if (rank.has(i)) {
        last = i;
      } else if (steep(last, i) && value(i) - value(last) >= minGain) {
        rank.set(i, 1);
        last = i;
      }
    });

    const cuts = Array.from(rank.keys()).sort(function (a, b) { return a - b; });
    for (let changed = true; changed;) {
      changed = false;
      for (let k = 0; k + 1 < cuts.length && !changed; k++) {
        const a = cuts[k];
        const b = cuts[k + 1];
        if (value(b) - value(a) >= minGain) continue;
        if (rank.get(b) === 1) {
          cuts.splice(k + 1, 1);
          changed = true;
        } else if (rank.get(a) === 1 && a !== s) {
          cuts.splice(k, 1);
          changed = true;
        }
      }
    }
    return {
      s: s,
      e: e,
      ratio: ratio,
      cuts: cuts.map(function (position) { return { position: position, rank: rank.get(position) }; })
    };
  }

  /**
   * The avoidability audit of the cut positions: a jump edge `a → b` that spans two moves or more is looked
   * at for a chain of rated positions in between, never going down and with no jump edge (a bridge); the
   * whole moves are the only material. Without a bridge the chain that most lowers the largest ratio is
   * inserted and its new edges are audited again; the jump that remains is kept. A position without a score
   * is never a bridge, and an edge that spans one has the scope 'ratedOnly' (else 'complete').
   * Returns `{ positions, edges }`, `edges[k] = { from, to, scope, inserted, remaining }`.
   */
  function audit(entries, positions) {
    const cuts = new Set(positions);
    const edges = [];
    function score(i) {
      return i >= 0 && i < entries.length && isScore(entries[i].score) ? entries[i].score : null;
    }
    function ratio(u, v) {
      return floorTen(score(v)) / floorTen(score(u));
    }

    // The chain over the points with the fewest edges, then the smallest largest ratio; null when none.
    function fewest(points, allowed) {
      const best = [{ edges: 0, top: 0, prev: -1 }];
      for (let v = 1; v < points.length; v++) {
        best.push(null);
        for (let u = 0; u < v; u++) {
          if (best[u] === null || !allowed(points[u], points[v])) continue;
          const edgeCount = best[u].edges + 1;
          const top = Math.max(best[u].top, ratio(points[u], points[v]));
          const now = best[v];
          if (now === null || edgeCount < now.edges || (edgeCount === now.edges && top < now.top)) {
            best[v] = { edges: edgeCount, top: top, prev: u };
          }
        }
      }
      const end = best[points.length - 1];
      if (end === null) return null;
      const inner = [];
      for (let t = end.prev; t > 0; t = best[t].prev) inner.unshift(points[t]);
      return { inner: inner, top: end.top };
    }

    // The smallest largest ratio of a chain that never goes down.
    function flattest(points) {
      const low = [0];
      for (let v = 1; v < points.length; v++) {
        low.push(Infinity);
        for (let u = 0; u < v; u++) {
          if (score(points[u]) <= score(points[v])) {
            low[v] = Math.min(low[v], Math.max(low[u], ratio(points[u], points[v])));
          }
        }
      }
      return low[points.length - 1];
    }

    function visit(a, b) {
      const from = score(a);
      const to = score(b);
      if (b - a < 2 || !isJump(from, to)) return;
      let complete = true;
      const points = [a];
      for (let j = a + 1; j < b; j++) {
        const here = score(j);
        if (here === null) complete = false;
        else if (from <= here && here <= to) points.push(j);
      }
      points.push(b);
      const scope = complete ? 'complete' : 'ratedOnly';
      const bridge = fewest(points, function (u, v) {
        return score(u) <= score(v) && !isJump(score(u), score(v));
      });
      if (bridge !== null) {
        bridge.inner.forEach(function (j) { cuts.add(j); });
        edges.push({ from: a, to: b, scope: scope, inserted: bridge.inner, remaining: false });
        return;
      }
      const edge = { from: a, to: b, scope: scope, inserted: [], remaining: true };
      edges.push(edge);
      const top = flattest(points);
      if (!(top < ratio(a, b))) return;
      const reduced = fewest(points, function (u, v) {
        return score(u) <= score(v) && ratio(u, v) <= top;
      });
      edge.inserted = reduced.inner;
      reduced.inner.forEach(function (j) { cuts.add(j); });
      const chain = [a].concat(reduced.inner, [b]);
      for (let k = 0; k + 1 < chain.length; k++) visit(chain[k], chain[k + 1]);
    }

    const sorted = ascending(cuts);
    for (let k = 0; k + 1 < sorted.length; k++) visit(sorted[k], sorted[k + 1]);
    edges.sort(function (x, y) { return x.from - y.from || y.to - x.to; });
    return { positions: ascending(cuts), edges: edges };
  }

  // The steps of a view: the solution, the structure (when there is one), then the steps that `add` appends
  // (a ViewStep; `position` is the move that ends it).
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

  // The distinct `field` values of the moves first .. last, in order of first appearance.
  function distinct(list, first, last, field) {
    const seen = [];
    for (let i = first; i <= last; i++) if (seen.indexOf(list[i][field]) === -1) seen.push(list[i][field]);
    return seen;
  }

  // The terms of the Total at a position: the parts of the rating that the tables and the sentences use.
  function termsOf(rating) {
    return {
      P: rating.P,
      W: rating.W,
      E: rating.empties,
      V: rating.V,
      R: rating.R,
      total: rating.score,
      level: rating.level,
      hardest: rating.hardest,
      counts: Object.assign({}, rating.counts)
    };
  }

  // The largest score among the rated positions first .. last (null when none) and how many have no score.
  function scan(ratings, first, last) {
    let top = null;
    let unscored = 0;
    for (let i = first; i <= last; i++) {
      const score = ratings[i].score;
      if (!isScore(score)) unscored++;
      else if (top === null || score > top) top = score;
    }
    return { top: top, unscored: unscored };
  }

  // What a step folds: the excursion above its end score, the clues its refinement moves restore, the
  // positions inside it that have no score and, for the compact "Starting again" step, the abandoned dig.
  function foldedOf(name, step, list, ratings, band) {
    const inside = scan(ratings, step.first, step.last - 1);
    const end = ratings[step.position].score;
    const peak = inside.top !== null && isScore(end) && inside.top > end ? inside.top : null;
    let revealed = 0;
    if (step.role === 'moves') {
      for (let i = step.first; i <= step.last; i++) {
        if (list[i].phase === 'reveal') revealed += list[i].restored.length;
      }
    }
    const restart = name === 'compact' && step.role === 'restart'
      ? { peak: inside.top, moves: step.last - 1 } : null;
    return {
      peak: peak,
      aboveBand: peak !== null && Boolean(band) && peak >= band.max,
      revealed: revealed,
      unscored: inside.unscored,
      restart: restart
    };
  }

  // The scope of the narrowest audit edge that contains the transition from one position to another.
  function scopeOf(edges, from, to) {
    let found = null;
    if (from < to) {
      edges.forEach(function (edge) {
        if (edge.from > from || edge.to < to) return;
        if (found === null || edge.to - edge.from < found.to - found.from) found = edge;
      });
    }
    return found === null ? null : found.scope;
  }

  /**
   * The two views of an analysis and the transitions between their adjacent steps (pure: it reads `moves`,
   * `ratings`, `structure`, `band` and `fallback`, and returns new objects). The details view has a step
   * per move; the compact view comes from `select` and `audit`; a conservative fallback has the same steps
   * in both (the solution, the structure when there is one, the finished puzzle). Returns `{ chapter, views,
   * transitions }`: the transitions of the compact view first, then those of the details view; the ViewStep
   * of each carries the index of its transition.
   */
  function buildViews(analysis) {
    const list = analysis.moves;
    const ratings = analysis.ratings;
    const structure = analysis.structure;
    const hasSolution = list.length > 0 && list[0].kind === 'solution';
    let chapter = 0;
    list.forEach(function (move, i) { if (move.kind === 'restart') chapter = i; });

    function ranged(view, role, first, last) {
      view.add(role, first, last, distinct(list, first, last, 'phase'), distinct(list, first, last, 'kind'));
    }
    function detailSteps() {
      const view = stepList(structure, hasSolution);
      for (let i = hasSolution ? 1 : 0; i < list.length; i++) {
        if (list[i].kind !== 'final') ranged(view, list[i].kind === 'restart' ? 'restart' : 'moves', i, i);
      }
      if (list.length > 0) view.add('final', list.length - 1, list.length - 1, [], []);
      return view.steps;
    }

    let compactSteps = null;
    let edges = [];
    if (analysis.fallback === null) {
      const entries = ratings.map(function (rating, i) {
        return { score: rating.score, phase: list[i].phase, kind: list[i].kind };
      });
      const chosen = select(entries);
      if (chosen.e >= 0) {
        const audited = audit(entries, chosen.cuts.map(function (cut) { return cut.position; }));
        edges = audited.edges;
        const view = stepList(structure, hasSolution);
        if (chosen.s > 0) ranged(view, 'restart', 1, chosen.s);
        let previous = chosen.s;
        audited.positions.forEach(function (position) {
          if (position <= chosen.s) return;
          ranged(view, 'moves', previous + 1, position);
          previous = position;
        });
        view.add('final', chosen.e, chosen.e, [], []);
        compactSteps = view.steps;
      }
    }
    if (compactSteps === null) compactSteps = detailSteps();
    const steps = { compact: compactSteps, details: detailSteps() };

    const transitions = [];
    function connect(name, auditEdges) {
      let firstSeen = false;
      const view = steps[name];
      for (let k = 1; k < view.length; k++) {
        const step = view[k];
        const from = view[k - 1].position;
        const before = termsOf(ratings[from]);
        const after = termsOf(ratings[step.position]);
        const rated = isScore(before.total) && isScore(after.total);
        let tier = null;
        if (before.total === 0 && isScore(after.total) && after.total > 0 && !firstSeen) tier = 'first';
        else if (isJump(before.total, after.total)) tier = 'jump';
        const newHardest = rated && before.total > 0 && typeof after.hardest === 'string' &&
          !(before.counts[after.hardest] > 0);
        if (tier === 'first') firstSeen = true;
        else if (tier === null && newHardest) tier = 'newPeak';
        step.transition = transitions.length;
        transitions.push({
          view: name,
          step: k,
          from: from,
          to: step.position,
          role: step.role === 'final' ? 'final' : 'step',
          before: before,
          after: after,
          change: rated && step.role !== 'structure' ? after.total - before.total : null,
          tier: tier,
          ratio: tier === 'jump' ? badgeRatio(before.total, after.total) : null,
          newHardest: newHardest,
          folded: foldedOf(name, step, list, ratings, analysis.band),
          auditScope: scopeOf(auditEdges, from, step.position),
          cause: null,
          choice: null
        });
      }
    }
    connect('compact', edges);
    connect('details', []);

    return {
      chapter: chapter,
      views: {
        compact: { name: 'compact', steps: steps.compact, audit: edges },
        details: { name: 'details', steps: steps.details, audit: [] }
      },
      transitions: transitions
    };
  }

  // The Analysis of a result; `buildViews` fills the chapter, the views and the transitions.
  function assemble(result, mm, list, ratings, reason, stats) {
    const config = result.config || {};
    let band;
    try {
      band = SG.difficulty.bandOf(config.difficulty);
    } catch (err) {
      band = { min: 0, max: Infinity };
    }
    const analysis = {
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
      views: null,
      transitions: [],
      proofs: {},
      stats: stats
    };
    return Object.assign(analysis, buildViews(analysis));
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
    const zero = solutionMove === null ? 0 : 1;
    const stats = { positions: list.length, fresh: 0, memo: 0, zero: zero, checks: 0 };
    return assemble(result, mm, list, ratings, reason, stats);
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

    return assemble(result, mm, list, ratings, null, stats);
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
    fromPlainWire: fromPlainWire,
    isJump: isJump,
    badgeRatio: badgeRatio,
    phaseCode: phaseCode,
    select: select,
    audit: audit,
    buildViews: buildViews
  };
})(typeof self !== 'undefined' ? self : globalThis);
