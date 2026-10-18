/**
 * Replay of a generation (task T-4.6, reworked; design.md sections 7.3 and 10.3): `SG.player`.
 *
 * After a generation the board shows the finished puzzle at once. The replay lets the user step back
 * through how the puzzle was made, one VISIBLE change of the board at a time, with the buttons First /
 * Previous / Next / Last step and the slider; nothing plays by itself. It is built from the result itself
 * (`PuzzleResult.solution`, `.model` and `.digLog`, the compact dig log recorded by `SG.digger`), not from
 * the event trace, so it is the same whatever the trace verbosity, the board size or the thread.
 *
 * Steps (`buildSteps(result)`, pure), each one a change that the board shows:
 *   'solution'  the full grid: every value of `result.solution`.
 *   'cages'     Killer: the cages and their sums appear.
 *   'signs'     Greater-Than: a sign appears on every pair of neighbours it applies to.
 *   'clues'     Greater-Than: the grid is emptied and a few clues are kept.
 *   'random'    a batch of random removals: about a ninth of the board is tried per step (`batchCells`);
 *               what could go is removed (frame 'cell--dug'), what had to stay goes back (frame
 *               'cell--kept'). Every batch removes something; refusals after the last removal join the
 *               last batch. The first batches are the easy ones: a step there removes a whole batch.
 *   'guided'    a round (several on large boards, `roundsPerStep`) of the guided dig: candidate removals
 *               are rated and the one that makes the puzzle hardest is removed; refused candidates are
 *               framed 'cell--kept'.
 *   'signDig'   Greater-Than: a batch of signs tried (`batchSigns`); removed signs are drawn dashed, signs
 *               that had to stay red (board `setSignMarks`).
 *   'reveal'    Greater-Than: the puzzle came out too hard, more clues are shown (frame 'cell--revealed').
 *   'restart'   the safety net threw a dug puzzle away and digs again from the full grid (rare).
 *   'final'     the finished puzzle: its clues, no frames.
 * Position 0 is the empty board, position k shows step k, the last position the finished puzzle. Technical
 * work (the settings, the board model, the rating, the tuning, samples that missed the level) is not shown.
 * A result without a dig log (an old one) replays as solution, structure and finished puzzle.
 *
 * Step objects are plain data: `{ index, kind, phase, line, key, args, values, structure, marks, signs,
 * metrics }`. `phase` and `line` name the explanation of `SG.explain` and its pseudocode line, `key` /
 * `args` the sentence (`describeStep`), `values` the board after the step, `structure` whether cages and
 * signs are drawn, `marks` the frames `{ dug, kept, revealed }`, `signs` (Greater-Than) the sign marks
 * `{ hidden, removed, kept }` by index into `buildSteps().signs`, `metrics` the running dig counters
 * `{ attempts, accepted, rejected, clues }` (null outside the dig), counted in what the board shows: the
 * cells (or signs) removed so far and put back so far, `attempts` their sum, so they add up with the
 * steps; a dig batch also has `reasons`, the number of refusals per reason ('ambiguous', 'techniques',
 * 'tooHard').
 *
 * Player (`create(options)`): `load(result)` builds the steps and shows the LAST position; `first`, `prev`,
 * `next`, `last`, `seek(position)` move; `bindControls(rootEl)` wires `#btn-first #btn-prev #btn-next
 * #btn-last #scrubber #player-time`; `reset()` forgets the puzzle (the app draws the board then). Callbacks:
 * `onPosition({ position, length, step, direction })` after every move ('forward' | 'backward' | 'seek'),
 * `onStateChange({ position, length, finished, loaded })` when the length or the end flag change.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.player && typeof SG.player.create === 'function') return;

  /** The board layers the player shows and hides, in drawing order. */
  const LAYER_NAMES = Object.freeze(['regions', 'overlays', 'grid', 'cells', 'cages', 'ineq', 'word']);

  /** Layers that belong to the extra structure: hidden until the step that builds it. */
  const STRUCTURE_LAYERS = Object.freeze(['cages', 'ineq']);

  const KINDS = Object.freeze(['solution', 'cages', 'signs', 'clues', 'random', 'guided', 'signDig', 'reveal',
    'restart', 'final']);

  /** The frame classes of the board (css/board.css) for the marks of a step. */
  const MARK_CLASSES = Object.freeze({ dug: 'cell--dug', kept: 'cell--kept', revealed: 'cell--revealed' });

  /** Passes of the dig log that try signs (Greater-Than) and the guided pass. */
  const SIGN_PASSES = Object.freeze(['signs', 'signs.minimal']);
  const GUIDED_PASS = 'guided';

  /** Cells tried per random step: about a ninth of the board, at least 2. */
  function batchCells(cellCount) {
    return Math.max(2, Math.round(cellCount / 9));
  }

  /** Rounds of the guided dig per step: one on boards up to about 120 cells, more on larger ones. */
  function roundsPerStep(cellCount) {
    return Math.max(1, Math.round(cellCount / 81));
  }

  /** Signs tried per step: an eighth of them, at least 4. */
  function batchSigns(signCount) {
    return Math.max(4, Math.round(signCount / 8));
  }

  // ---------------------------------------------------------------------------------------------
  // Steps (pure)
  // ---------------------------------------------------------------------------------------------

  function countClues(values) {
    let n = 0;
    for (let i = 0; i < values.length; i++) if (values[i] > 0) n++;
    return n;
  }

  function cellsOf(entry) {
    return Array.isArray(entry.cells) ? entry.cells.filter(function (c) { return Number.isInteger(c); }) : [];
  }

  /** The reason of a batch: the one all its refusals share, else 'mixed'. */
  function reasonOf(reasons) {
    const names = Object.keys(reasons);
    return names.length === 1 ? names[0] : 'mixed';
  }

  /**
   * Builds the replay of a result.
   * @param {Object} result  A `PuzzleResult` (`model`, `givens`, `solution`, optional `digLog`).
   * @returns {{steps: Object[], signs: ?Array<number[]>, cellCount: number}}  `signs` lists every sign of
   *          a Greater-Than dig as `[a, b]` (value[a] < value[b]); the sign marks of the steps index it.
   */
  function buildSteps(result) {
    const model = result.model;
    const n = model.cellCount;
    const solution = result.solution && result.solution.length === n ? Int32Array.from(result.solution)
      : null;
    const givens = Int32Array.from(result.givens);
    const log = Array.isArray(result.digLog) && solution !== null ? result.digLog : [];
    let signList = null;
    for (let k = 0; k < log.length; k++) {
      if (log[k] && log[k].op === 'signs' && Array.isArray(log[k].signs)) {
        signList = log[k].signs;
        break;
      }
    }
    const hasCages = model.cages.length > 0;
    const hasSigns = signList !== null || model.inequalities.length > 0;

    const steps = [];
    let values = new Int32Array(n);
    let structure = false;
    const hidden = new Set();
    const counters = { attempts: 0, accepted: 0, rejected: 0 };

    function metrics() {
      return {
        attempts: counters.attempts, accepted: counters.accepted, rejected: counters.rejected,
        clues: countClues(values)
      };
    }

    function push(kind, phase, line, key, args, extra) {
      const x = extra || {};
      const step = {
        index: steps.length + 1,
        kind: kind,
        phase: phase,
        line: line,
        key: key,
        args: args,
        values: Int32Array.from(values),
        structure: structure,
        marks: { dug: x.dug || [], kept: x.kept || [], revealed: x.revealed || [] },
        signs: null,
        metrics: x.metrics === undefined ? null : x.metrics
      };
      if (signList !== null) {
        const removedNow = new Set(x.removedSigns || []);
        step.signs = {
          hidden: Array.from(hidden).filter(function (i) { return !removedNow.has(i); }),
          removed: x.removedSigns || [],
          kept: x.keptSigns || []
        };
      }
      steps.push(step);
      return step;
    }

    if (solution !== null) {
      values = Int32Array.from(solution);
      push('solution', 'fullGrid', 'place', 'replay.solution', { filled: n, unit: 'cell' });
      if (hasCages || hasSigns) {
        structure = true;
        if (hasCages) {
          push('cages', 'extraStructure', 'build', 'replay.cages', { count: model.cages.length });
        } else {
          push('signs', 'extraStructure', 'build', 'replay.signs',
            { signs: signList !== null ? signList.length : model.inequalities.length });
        }
      }
      replayLog(log, solution, n, signList, {
        values: function () { return values; },
        setValues: function (next) { values = next; },
        hidden: hidden,
        counters: counters,
        metrics: metrics,
        push: push,
        steps: steps
      });
    }

    // The finished puzzle, whatever the log said: the clues of the result, the signs of its model.
    values = givens;
    structure = hasCages || hasSigns;
    if (signList !== null) {
      const alive = new Set(model.inequalities.map(function (q) { return q.a + ':' + q.b; }));
      hidden.clear();
      signList.forEach(function (pair, i) { if (!alive.has(pair[0] + ':' + pair[1])) hidden.add(i); });
    }
    const finalArgs = { clues: countClues(givens) };
    if (model.inequalities.length > 0) finalArgs.signs = model.inequalities.length;
    push('final', 'dig', 'verify', model.inequalities.length > 0 ? 'replay.final.signs' : 'replay.final',
      finalArgs, { metrics: solution !== null && log.length > 0 ? metrics() : null });
    return { steps: steps, signs: signList, cellCount: n };
  }

  /** Turns the dig log into batched steps (see the file header). */
  function replayLog(log, solution, n, signList, ctx) {
    const cellBudget = batchCells(n);
    const roundBudget = roundsPerStep(n);
    const signBudget = signList !== null ? batchSigns(signList.length) : 4;
    const counters = ctx.counters;
    let pass = null;
    let batch = null;
    let opening = null;
    let signsStarted = false;

    function kindOfPass() {
      if (SIGN_PASSES.indexOf(pass) !== -1) return 'signDig';
      return pass === GUIDED_PASS ? 'guided' : 'random';
    }

    function newBatch() {
      return {
        kind: kindOfPass(), tried: 0, removed: [], kept: [], reasons: {}, rounds: 0, rated: 0, refused: 0,
        removedSigns: [], keptSigns: []
      };
    }

    function noteReason(b, reason) {
      const r = typeof reason === 'string' && reason !== '' ? reason : 'mixed';
      b.reasons[r] = (b.reasons[r] || 0) + 1;
    }

    function hasRemoval(b) {
      return b.removed.length > 0 || b.removedSigns.length > 0;
    }

    function stepArgs(b) {
      if (b.kind === 'guided') {
        const args = { rated: b.rated, refused: b.refused, removed: b.removed.length,
          cellList: b.removed.slice(), unit: 'cell', clues: countClues(ctx.values()) };
        if (b.rounds > 1) args.rounds = b.rounds;
        if (b.kept.length > 0) args.kept = b.kept.length;
        return args;
      }
      if (b.kind === 'signDig') {
        const args = { tried: b.tried, removed: b.removedSigns.length, unit: 'sign',
          signs: signList.length - ctx.hidden.size };
        if (b.keptSigns.length > 0) {
          args.kept = b.keptSigns.length;
          args.reason = reasonOf(b.reasons);
        }
        return args;
      }
      const args = { tried: b.tried, removed: b.removed.length, unit: 'cell',
        clues: countClues(ctx.values()) };
      if (b.kept.length > 0) {
        args.kept = b.kept.length;
        args.reason = reasonOf(b.reasons);
      }
      return args;
    }

    function stepKey(b, args) {
      if (b.kind === 'guided') return args.rounds > 1 ? 'replay.guided.rounds' : 'replay.guided';
      if (b.kind === 'signDig') return args.kept ? 'replay.signDig.some' : 'replay.signDig.all';
      return args.kept ? 'replay.random.some' : 'replay.random.all';
    }

    function emitBatch(b) {
      const args = stepArgs(b);
      ctx.push(b.kind, 'dig', b.kind === 'guided' ? 'deeper' : 'check', stepKey(b, args), args, {
        dug: b.removed.slice(), kept: b.kept.slice(), removedSigns: b.removedSigns.slice(),
        keptSigns: b.keptSigns.slice(), metrics: ctx.metrics()
      });
    }

    /** Refusals after the last removal of a pass change nothing on the board: they join the last step. */
    function mergeIntoLast(b) {
      const last = ctx.steps[ctx.steps.length - 1];
      if (!last || last.kind !== b.kind) return false;
      const merged = {
        kind: b.kind,
        tried: (last.args.tried || 0) + b.tried,
        removed: last.marks.dug.slice(),
        kept: last.marks.kept.concat(b.kept),
        reasons: Object.assign({}, last.reasons || {}),
        rounds: last.args.rounds || 1,
        rated: (last.args.rated || 0) + b.rated,
        refused: (last.args.refused || 0) + b.refused,
        removedSigns: last.signs ? last.signs.removed.slice() : [],
        keptSigns: last.signs ? last.signs.kept.concat(b.keptSigns) : []
      };
      Object.keys(b.reasons).forEach(function (r) {
        merged.reasons[r] = (merged.reasons[r] || 0) + b.reasons[r];
      });
      const args = stepArgs(merged);
      last.args = args;
      last.key = stepKey(merged, args);
      last.marks.kept = merged.kept;
      if (last.signs) last.signs.kept = merged.keptSigns;
      last.reasons = merged.reasons;
      last.metrics = ctx.metrics();
      return true;
    }

    function flush() {
      if (batch === null) return;
      const b = batch;
      batch = null;
      if (b.tried === 0 && b.rated === 0 && b.removed.length === 0) return;
      if (hasRemoval(b) || !mergeIntoLast(b)) {
        emitBatch(b);
        ctx.steps[ctx.steps.length - 1].reasons = b.reasons;
      }
    }

    function closeIfFull() {
      const b = batch;
      if (b === null) return;
      if (b.kind === 'guided' ? b.rounds >= roundBudget
        : b.kind === 'signDig' ? b.tried >= signBudget && hasRemoval(b)
          : b.tried >= cellBudget && hasRemoval(b)) {
        flush();
      }
    }

    function closeOpening() {
      if (opening === null) return;
      const revealed = opening.revealed;
      opening = null;
      ctx.push('clues', 'dig', null, 'replay.clues', { clues: countClues(ctx.values()) },
        { revealed: revealed, metrics: ctx.metrics() });
    }

    function current() {
      if (batch === null) batch = newBatch();
      return batch;
    }

    /** Counts what the board shows (cells, or signs), so the counters add up with the step list. */
    function count(name, k) {
      counters[name] += k;
      counters.attempts += k;
    }

    log.forEach(function (e) {
      if (!e || typeof e.op !== 'string') return;
      const values = ctx.values();
      switch (e.op) {
        case 'pass':
          flush();
          closeOpening();
          pass = typeof e.pass === 'string' ? e.pass : null;
          if (SIGN_PASSES.indexOf(pass) !== -1) signsStarted = true;
          break;
        case 'clear':
          flush();
          values.fill(0);
          opening = { revealed: [] };
          break;
        case 'reveal': {
          const cells = cellsOf(e);
          cells.forEach(function (c) { if (c >= 0 && c < n) values[c] = solution[c]; });
          if (opening !== null && !signsStarted) {
            opening.revealed = opening.revealed.concat(cells);
          } else {
            flush();
            ctx.push('reveal', 'dig', null, 'replay.reveal',
              { revealed: cells.length, clues: countClues(values) },
              { revealed: cells, metrics: ctx.metrics() });
          }
          break;
        }
        case 'restart':
          flush();
          closeOpening();
          ctx.setValues(Int32Array.from(solution));
          ctx.push('restart', 'dig', 'verify', 'replay.restart', { filled: n, unit: 'cell' },
            { metrics: ctx.metrics() });
          break;
        case 'accept': {
          closeOpening();
          const b = current();
          if (typeof e.sign === 'number') {
            ctx.hidden.add(e.sign);
            b.removedSigns.push(e.sign);
            b.tried++;
            count('accepted', 1);
          } else {
            const cells = cellsOf(e);
            cells.forEach(function (c) { if (c >= 0 && c < n) values[c] = 0; });
            b.removed = b.removed.concat(cells);
            if (b.kind === 'guided') b.rounds++;
            else b.tried += cells.length;
            count('accepted', cells.length);
          }
          closeIfFull();
          break;
        }
        case 'reject': {
          closeOpening();
          const b = current();
          noteReason(b, e.reason);
          if (typeof e.sign === 'number') {
            b.keptSigns.push(e.sign);
            b.tried++;
            count('rejected', 1);
          } else {
            const cells = cellsOf(e);
            b.kept = b.kept.concat(cells);
            if (b.kind === 'guided') {
              b.rated++;
              b.refused++;
            } else {
              b.tried += cells.length;
            }
            count('rejected', cells.length);
          }
          closeIfFull();
          break;
        }
        case 'keep':
          // A guided candidate that was fine but not the hardest: rated, the board does not change.
          current().rated++;
          break;
        default:
          break;
      }
    });
    flush();
    closeOpening();
  }

  /**
   * The board at a position: what `render` draws. Pure.
   * @param {{steps: Object[], cellCount: number}} built  What `buildSteps` returned.
   * @param {number} position  0 .. steps.length.
   * @returns {{position: number, step: ?Object, values: Int32Array, final: boolean, structure: boolean,
   *   marks: {dug: number[], kept: number[], revealed: number[]}, signs: ?Object}}
   */
  function viewAt(built, position) {
    const p = Math.max(0, Math.min(built.steps.length, Math.floor(Number(position)) || 0));
    const step = p === 0 ? null : built.steps[p - 1];
    if (step === null) {
      return { position: 0, step: null, values: new Int32Array(built.cellCount), final: false,
        structure: false, marks: { dug: [], kept: [], revealed: [] }, signs: null };
    }
    return { position: p, step: step, values: step.values, final: step.kind === 'final',
      structure: step.structure, marks: step.marks, signs: step.signs };
  }

  // ---------------------------------------------------------------------------------------------
  // Texts
  // ---------------------------------------------------------------------------------------------

  function T(key, args) {
    return SG.i18n && typeof SG.i18n.t === 'function' ? SG.i18n.t(key, args) : key;
  }

  function unitText(unit, count) {
    const key = unit === 'sign' ? 'replay.unit.sign' : unit === 'clue' ? 'unit.clue'
      : unit === 'removal' ? 'replay.unit.removal' : 'unit.cell';
    return T(key, { count: count });
  }

  function cellName(cell, labeler) {
    return SG.i18n && typeof SG.i18n.cellLabel === 'function' ? SG.i18n.cellLabel(cell, labeler)
      : '#' + (cell + 1);
  }

  /** The arguments of a step as the sentences want them: counts with their unit, cell names, reasons. */
  function displayArgs(step, labeler) {
    const a = step.args || {};
    const unit = a.unit || 'cell';
    const out = {};
    Object.keys(a).forEach(function (name) {
      const v = a[name];
      if (name === 'unit') return;
      if (name === 'cellList') out[name] = v.map(function (c) { return cellName(c, labeler); }).join(', ');
      else if (name === 'reason') out[name] = T('replay.reason.' + v);
      else if (name === 'clues' || name === 'revealed') out[name] = unitText('clue', v);
      else if (name === 'signs') out[name] = unitText('sign', v);
      else if (name === 'rated') out[name] = unitText('removal', v);
      else if (name === 'filled' || name === 'tried' || name === 'removed' || name === 'kept') {
        out[name] = unitText(unit, v);
      } else out[name] = v;
    });
    return out;
  }

  /**
   * The sentence of a step in the current language.
   * @param {?Object} step  null: position 0.
   * @param {function(number): string} [labeler]  Names cells; default: the labeler of `SG.i18n`.
   * @returns {string}
   */
  function describeStep(step, labeler) {
    if (step === null || step === undefined) return T('replay.start');
    return T(step.key, displayArgs(step, labeler));
  }

  /** @returns {string} The short title of a step ('Random removals'). */
  function stepTitle(step) {
    return T('replay.title.' + step.kind);
  }

  /** @returns {string} The one-line summary of a step for the list ('9 cells removed · 43 clues left'). */
  function stepMeta(step, labeler) {
    const args = displayArgs(step, labeler);
    switch (step.kind) {
      case 'random':
      case 'guided':
        return T(step.args.kept ? 'replay.meta.digKept' : 'replay.meta.dig', args);
      case 'signDig':
        return T(step.args.kept ? 'replay.meta.signDigKept' : 'replay.meta.signDig', args);
      case 'final':
        return T(step.args.signs !== undefined ? 'replay.meta.final.signs' : 'replay.meta.final', args);
      default:
        return T('replay.meta.' + step.kind, args);
    }
  }

  /** @returns {string} 'Step 3 of 12', or 'Start' at position 0. */
  function positionText(position, length) {
    return position === 0 ? T('replay.position.start')
      : T('replay.position', { step: position, total: length });
  }

  // ---------------------------------------------------------------------------------------------
  // Player
  // ---------------------------------------------------------------------------------------------

  /**
   * Creates the player.
   * @param {Object} [options]
   * @param {Object} [options.board]  A `SG.boardView` view; without one only the callbacks and the controls
   *        work. Used: `setValues`, `setGivens`, `clearHighlights`, `highlight`, `setLayerVisible`, and for
   *        Greater-Than `setModel` and `setSignMarks`.
   * @param {function(Object): void} [options.onPosition]  `{ position, length, step, direction }`.
   * @param {function(Object): void} [options.onStateChange]  `{ position, length, finished, loaded }`.
   * @returns {Object} `load, reset, first, prev, next, last, seek, state, describe, getSteps, getStep,
   *          bindControls, destroy`.
   */
  function create(options) {
    const o = options || {};
    const board = o.board || null;
    const onPosition = typeof o.onPosition === 'function' ? o.onPosition : null;
    const onStateChange = typeof o.onStateChange === 'function' ? o.onStateChange : null;

    let built = null;
    let result = null;
    let position = 0;
    let fullModel = null;
    let shownModel = null;
    let stateKey = '';
    let ui = null;
    let destroyed = false;

    function length() {
      return built === null ? 0 : built.steps.length;
    }

    function state() {
      const len = length();
      return { position: position, length: len, finished: len > 0 && position === len,
        loaded: built !== null };
    }

    function safely(fn, arg) {
      try {
        fn(arg);
      } catch (err) {
        if (typeof console !== 'undefined' && typeof console.error === 'function') console.error(err);
      }
    }

    function callBoard(name, a, b) {
      if (board !== null && typeof board[name] === 'function') board[name](a, b);
    }

    /** Greater-Than: the board draws every sign during the replay and the model of the result at the end. */
    function ensureModel(kind) {
      if (board === null || typeof board.setModel !== 'function' || kind === shownModel) return;
      if (kind === 'full') {
        if (fullModel === null) {
          const signs = built.signs.map(function (pair) { return { a: pair[0], b: pair[1] }; });
          fullModel = SG.greaterThan && typeof SG.greaterThan.withSigns === 'function'
            ? SG.greaterThan.withSigns(result.model, signs) : result.model;
        }
        board.setModel(fullModel);
      } else {
        board.setModel(result.model);
      }
      shownModel = kind;
    }

    function render() {
      if (board === null || built === null) return;
      const view = viewAt(built, position);
      if (built.signs !== null) ensureModel(view.final ? 'final' : 'full');
      callBoard('setValues', view.values);
      callBoard('setGivens', view.final ? result.givens : null);
      callBoard('clearHighlights');
      Object.keys(MARK_CLASSES).forEach(function (name) {
        if (view.marks[name].length > 0) callBoard('highlight', view.marks[name], MARK_CLASSES[name]);
      });
      if (typeof board.setLayerVisible === 'function') {
        LAYER_NAMES.forEach(function (name) {
          board.setLayerVisible(name, view.structure || STRUCTURE_LAYERS.indexOf(name) === -1);
        });
      }
      callBoard('setSignMarks', view.final ? null : view.signs);
    }

    // ---- controls ---------------------------------------------------------------------------------

    function setProp(el, prop, value) {
      if (el[prop] !== value) el[prop] = value;
    }

    function setAttr(el, name, value) {
      if (el.getAttribute(name) !== value) el.setAttribute(name, value);
    }

    function updateUi() {
      if (ui === null) return;
      const s = state();
      [ui.first, ui.prev, ui.next, ui.last].forEach(function (el) {
        if (el) setProp(el, 'disabled', !s.loaded);
      });
      if (ui.scrubber) {
        setProp(ui.scrubber, 'disabled', !s.loaded);
        setProp(ui.scrubber, 'max', String(s.length));
        setProp(ui.scrubber, 'value', String(s.position));
        const step = s.loaded && s.position > 0 ? built.steps[s.position - 1] : null;
        const text = !s.loaded ? '' : step === null ? positionText(0, s.length)
          : positionText(s.position, s.length) + ': ' + stepTitle(step);
        setAttr(ui.scrubber, 'aria-valuetext', text);
      }
      if (ui.time) setProp(ui.time, 'textContent', s.loaded ? positionText(s.position, s.length) : '');
    }

    function emitState() {
      const s = state();
      const key = [s.length, s.finished, s.loaded].join('|');
      if (key === stateKey) return;
      stateKey = key;
      if (onStateChange !== null) safely(onStateChange, s);
    }

    function emitPosition(direction) {
      if (onPosition === null) return;
      safely(onPosition, {
        position: position,
        length: length(),
        step: built === null || position === 0 ? null : built.steps[position - 1],
        direction: direction
      });
    }

    // ---- moving -----------------------------------------------------------------------------------

    function seekTo(target, direction) {
      if (destroyed || built === null) return;
      const wanted = Math.floor(Number(target));
      if (!isFinite(wanted)) return;
      const p = Math.max(0, Math.min(length(), wanted));
      if (p === position) {
        updateUi();
        return;
      }
      position = p;
      render();
      updateUi();
      emitPosition(direction);
      emitState();
    }

    /**
     * Shows a result: builds its steps and shows the LAST position, the finished puzzle.
     * @param {Object} res  A `PuzzleResult`.
     * @param {{position?: number}} [opts]  Another position to start from.
     */
    function load(res, opts) {
      if (destroyed) return;
      result = res;
      built = buildSteps(res);
      fullModel = null;
      shownModel = 'final';
      const wanted = opts && Number.isInteger(opts.position) ? opts.position : length();
      position = Math.max(0, Math.min(length(), wanted));
      render();
      updateUi();
      emitState();
      emitPosition('seek');
    }

    /** Forgets the puzzle: the controls are disabled and the board is left to the app. */
    function reset() {
      if (destroyed) return;
      const hadSigns = built !== null && built.signs !== null;
      built = null;
      result = null;
      position = 0;
      fullModel = null;
      shownModel = null;
      callBoard('clearHighlights');
      if (hadSigns) callBoard('setSignMarks', null);
      updateUi();
      emitState();
      emitPosition('seek');
    }

    function unbindControls() {
      if (ui === null) return;
      ui.listeners.forEach(function (l) { l.el.removeEventListener(l.type, l.fn); });
      if (ui.unsubscribe) ui.unsubscribe();
      ui = null;
    }

    /**
     * Connects the controls inside `#player-root`: `#btn-first #btn-prev #btn-next #btn-last` move,
     * `#scrubber` is the position (0 .. length, with a translated `aria-valuetext`), `#player-time` shows
     * 'Step k of N'. They are disabled while nothing is loaded; a language change re-translates them.
     * @param {Element} rootEl
     * @returns {function(): void} Removes the listeners (also done by `destroy`).
     */
    function bindControls(rootEl) {
      unbindControls();
      if (destroyed || !rootEl || typeof rootEl.querySelector !== 'function') return unbindControls;
      const q = function (selector) { return rootEl.querySelector(selector); };
      ui = {
        first: q('#btn-first'),
        prev: q('#btn-prev'),
        next: q('#btn-next'),
        last: q('#btn-last'),
        scrubber: q('#scrubber'),
        time: q('#player-time'),
        listeners: [],
        unsubscribe: null
      };
      const listen = function (el, type, fn) {
        if (!el) return;
        el.addEventListener(type, fn);
        ui.listeners.push({ el: el, type: type, fn: fn });
      };
      listen(ui.first, 'click', function () { player.first(); });
      listen(ui.prev, 'click', function () { player.prev(); });
      listen(ui.next, 'click', function () { player.next(); });
      listen(ui.last, 'click', function () { player.last(); });
      listen(ui.scrubber, 'input', function () { seekTo(Number(ui.scrubber.value), 'seek'); });
      if (SG.i18n && typeof SG.i18n.onChange === 'function') ui.unsubscribe = SG.i18n.onChange(updateUi);
      updateUi();
      return unbindControls;
    }

    const player = {
      load: load,
      reset: reset,
      first: function first() { seekTo(0, 'seek'); },
      prev: function prev() { seekTo(position - 1, 'backward'); },
      next: function next() { seekTo(position + 1, 'forward'); },
      last: function last() { seekTo(length(), 'seek'); },

      /**
       * Moves to a position (clamped): 0 is the empty board, k shows step k.
       * @param {number} target
       */
      seek: function seek(target) { seekTo(target, 'seek'); },

      state: state,

      /**
       * The sentence of a position (default: the current one), for the status line.
       * @param {number} [at]
       * @returns {{text: string, step: ?Object}}
       */
      describe: function describe(at) {
        if (built === null) return { text: '', step: null };
        const p = at === undefined ? position : Math.max(0, Math.min(length(), Math.floor(at)));
        const step = p === 0 ? null : built.steps[p - 1];
        return { text: describeStep(step), step: step };
      },

      /** @returns {Object[]} The steps of the puzzle on show (empty when nothing is loaded). */
      getSteps: function getSteps() { return built === null ? [] : built.steps; },

      /** @returns {?Object} The step at a position (null at 0 or outside). */
      getStep: function getStep(p) {
        return built === null || !(p >= 1 && p <= built.steps.length) ? null : built.steps[p - 1];
      },

      bindControls: bindControls,

      /** Lets go of the controls and the puzzle; the board is left to the app. */
      destroy: function destroy() {
        if (destroyed) return;
        unbindControls();
        if (built !== null && built.signs !== null) callBoard('setSignMarks', null);
        built = null;
        result = null;
        destroyed = true;
      }
    };
    return player;
  }

  SG.player = {
    LAYER_NAMES: LAYER_NAMES,
    STRUCTURE_LAYERS: STRUCTURE_LAYERS,
    KINDS: KINDS,
    MARK_CLASSES: MARK_CLASSES,
    batchCells: batchCells,
    roundsPerStep: roundsPerStep,
    batchSigns: batchSigns,
    buildSteps: buildSteps,
    viewAt: viewAt,
    describeStep: describeStep,
    stepTitle: stepTitle,
    stepMeta: stepMeta,
    positionText: positionText,
    create: create
  };

  // ---------------------------------------------------------------------------------------------
  // Locale fragment (the button labels `player.*` live in locale.shell.js)
  // ---------------------------------------------------------------------------------------------

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'replay.position': 'Step {step} of {total}',
      'replay.position.start': 'Start',
      'replay.start': 'The empty grid. Press Next step to see how the puzzle was made.',
      'replay.unit.sign_one': '{count} sign',
      'replay.unit.sign_other': '{count} signs',
      'replay.unit.removal_one': '{count} possible removal',
      'replay.unit.removal_other': '{count} possible removals',

      'replay.title.solution': 'Full solution',
      'replay.title.cages': 'Cages',
      'replay.title.signs': 'Signs',
      'replay.title.clues': 'Starting clues',
      'replay.title.random': 'Random removals',
      'replay.title.guided': 'Hardest removal',
      'replay.title.signDig': 'Removing signs',
      'replay.title.reveal': 'More clues',
      'replay.title.restart': 'Starting again',
      'replay.title.final': 'Finished puzzle',

      'replay.solution': 'Fill the whole grid with a random solution that follows every rule ({filled}).',
      'replay.cages': 'Split the solution into {count} cages and write the sum of each cage in its corner.',
      'replay.signs': 'Put a sign between neighbouring cells to show which one is greater: {signs}.',
      'replay.clues': 'Empty the grid and keep {clues}; the signs will do most of the work.',
      'replay.random.all': 'Remove {removed} at random: the puzzle can still be solved without them.',
      'replay.random.some': 'Try to remove {tried} at random: {removed} removed, {kept} put back because ' +
        '{reason}.',
      'replay.guided': 'Rate {rated} ({refused} refused) and remove the one that makes the puzzle hardest: ' +
        '{cellList}.',
      'replay.guided.rounds': 'In {rounds} rounds, rate {rated} ({refused} refused), each time removing ' +
        'the one that makes the puzzle hardest: {cellList}.',
      'replay.signDig.all': 'Remove {removed}: the puzzle can still be solved without them.',
      'replay.signDig.some': 'Try to remove {tried}: {removed} removed, {kept} kept because {reason}.',
      'replay.reveal': 'The puzzle came out too hard for this level, so {revealed} more are shown.',
      'replay.restart': 'The final check found a second solution, so the holes are dug again from the full ' +
        'grid with a plain uniqueness check ({filled}).',
      'replay.final': 'The finished puzzle: {clues}.',
      'replay.final.signs': 'The finished puzzle: {clues} and {signs}.',
      'replay.reason.ambiguous': 'without them the puzzle would have more than one solution',
      'replay.reason.techniques': 'without them the techniques of this level could not finish the puzzle',
      'replay.reason.tooHard': 'removing them would make the puzzle harder than this level',
      'replay.reason.mixed': 'the puzzle still needs them',

      'replay.meta.solution': '{filled}',
      'replay.meta.cages': '{count} cages',
      'replay.meta.signs': '{signs}',
      'replay.meta.clues': '{clues}',
      'replay.meta.dig': '{removed} removed \u00b7 {clues} left',
      'replay.meta.digKept': '{removed} removed \u00b7 {kept} put back \u00b7 {clues} left',
      'replay.meta.signDig': '{removed} removed \u00b7 {signs} left',
      'replay.meta.signDigKept': '{removed} removed \u00b7 {kept} kept \u00b7 {signs} left',
      'replay.meta.reveal': '{revealed} more \u00b7 {clues} in all',
      'replay.meta.restart': '{filled}',
      'replay.meta.final': '{clues}',
      'replay.meta.final.signs': '{clues} \u00b7 {signs}'
    },
    vi: {
      'replay.position': 'Bước {step}/{total}',
      'replay.position.start': 'Bắt đầu',
      'replay.start': 'Lưới trống. Bấm Bước tiếp theo để xem đề được tạo ra như thế nào.',
      'replay.unit.sign_one': '{count} dấu',
      'replay.unit.sign_other': '{count} dấu',
      'replay.unit.removal_one': '{count} cách xóa',
      'replay.unit.removal_other': '{count} cách xóa',

      'replay.title.solution': 'Lời giải đầy đủ',
      'replay.title.cages': 'Các lồng',
      'replay.title.signs': 'Các dấu so sánh',
      'replay.title.clues': 'Số cho sẵn ban đầu',
      'replay.title.random': 'Xóa ngẫu nhiên',
      'replay.title.guided': 'Xóa ô làm đề khó nhất',
      'replay.title.signDig': 'Bỏ bớt dấu',
      'replay.title.reveal': 'Thêm số cho sẵn',
      'replay.title.restart': 'Làm lại từ đầu',
      'replay.title.final': 'Đề hoàn chỉnh',

      'replay.solution': 'Điền kín lưới bằng một lời giải ngẫu nhiên tuân theo mọi luật ({filled}).',
      'replay.cages': 'Chia lời giải thành {count} lồng và ghi tổng của mỗi lồng ở góc lồng.',
      'replay.signs': 'Đặt dấu giữa các ô kề nhau để cho biết ô nào lớn hơn: {signs}.',
      'replay.clues': 'Xóa trống lưới và chỉ giữ {clues}; các dấu sẽ gánh phần lớn việc giải.',
      'replay.random.all': 'Xóa ngẫu nhiên {removed}: không có chúng đề vẫn giải được.',
      'replay.random.some': 'Thử xóa ngẫu nhiên {tried}: xóa được {removed}, trả lại {kept} vì {reason}.',
      'replay.guided': 'Đánh giá {rated} ({refused} bị loại) và xóa cách làm đề khó nhất: {cellList}.',
      'replay.guided.rounds': 'Qua {rounds} vòng, đánh giá {rated} ({refused} bị loại), mỗi vòng xóa cách ' +
        'làm đề khó nhất: {cellList}.',
      'replay.signDig.all': 'Bỏ {removed}: không có chúng đề vẫn giải được.',
      'replay.signDig.some': 'Thử bỏ {tried}: bỏ được {removed}, giữ lại {kept} vì {reason}.',
      'replay.reveal': 'Đề vẫn khó hơn mức đã chọn nên hiện thêm {revealed}.',
      'replay.restart': 'Bước kiểm tra cuối tìm thấy lời giải thứ hai, nên các ô được đào lại từ lưới đầy ' +
        'đủ chỉ với phép kiểm tra lời giải duy nhất ({filled}).',
      'replay.final': 'Đề hoàn chỉnh: {clues}.',
      'replay.final.signs': 'Đề hoàn chỉnh: {clues} và {signs}.',
      'replay.reason.ambiguous': 'thiếu chúng đề sẽ có nhiều hơn một lời giải',
      'replay.reason.techniques': 'thiếu chúng các kỹ thuật của mức này không giải hết được đề',
      'replay.reason.tooHard': 'xóa chúng sẽ làm đề khó hơn mức đã chọn',
      'replay.reason.mixed': 'đề vẫn cần đến chúng',

      'replay.meta.solution': '{filled}',
      'replay.meta.cages': '{count} lồng',
      'replay.meta.signs': '{signs}',
      'replay.meta.clues': '{clues}',
      'replay.meta.dig': 'xóa {removed} \u00b7 còn {clues}',
      'replay.meta.digKept': 'xóa {removed} \u00b7 trả lại {kept} \u00b7 còn {clues}',
      'replay.meta.signDig': 'bỏ {removed} \u00b7 còn {signs}',
      'replay.meta.signDigKept': 'bỏ {removed} \u00b7 giữ {kept} \u00b7 còn {signs}',
      'replay.meta.reveal': 'thêm {revealed} \u00b7 tổng {clues}',
      'replay.meta.restart': '{filled}',
      'replay.meta.final': '{clues}',
      'replay.meta.final.signs': '{clues} \u00b7 {signs}'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
