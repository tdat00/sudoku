/**
 * Play: the user solves the opened puzzle on the board, with notes, undo / redo, error checking, hints that name
 * the technique they use, a timer and completion detection. The entries live in the module's own overlay layer of
 * the board SVG (`<g class="layer-play">`), so the board view only ever draws the clues.
 *
 * Two layers, so everything can be tested in Node:
 *  - `SG.play.createGame(model, givens, solution, { now, autoNotes })`  the PURE game engine: entries, notes, exact
 *    undo / redo, rule conflicts, wrong entries, hints, a timer on an injected clock, completion detection and a
 *    serialisable state. No DOM, no timers. `autoNotes` (default true): a placed value leaves the notes of its
 *    peers. `restoreGame(model, givens, solution, data)` rebuilds a game from `game.serialize()` (TypeError for
 *    data that does not belong to this puzzle).
 *  - `SG.play.init(app)`  the DOM layer, started by app.js: the status bar (`#play-status`), the tools, number pad and
 *    hint card (`#play-root`), the Options frame (`#options-root`: symbols, check mode, notes switch), the popup over
 *    the board, the overlay layer, keyboard and pointer input. `attach(puzzle, {state?, symbolMode?, focus?})` puts
 *    a puzzle (what `SG.importer` returns) in play, `detach()` takes it out. The app emits `play:game` ({ game,
 *    puzzle }) on attach and `play:change` (the game's event, or { type: 'symbols' }) on every change.
 * Pure helpers: `describeHint`, `localizeArgs`, `groupEliminations`, `valueText`, `noteLayout`, `padLayout`,
 * `cellAtPoint`, `moveSelection` (jumps over holes of the canvas), `createKeyReader` (also two-character symbols such
 * as 10-12), `typedLabels`.
 *
 * Game: values (getValue userValue isGiven getNotes snapshot); editing (setValue(cell, v, {amend}) clearValue
 * erase toggleNote fillNotes undo redo canUndo canRedo reset); checking (conflicts wrongCells check progress
 * isSolved, status() = 'idle' | 'playing' | 'solved' | 'gaveUp'); hints (hint nextHintStep applyHint clearHint
 * currentHint revealCell revealSolution); timer (startTimer pauseTimer(by) resumeTimer(by) elapsedMs timerState);
 * subscribe(fn) -> off, setOptions, getOptions, serialize, counters. Every change calls the subscribers with
 * `{ type, cells, values, solved }`; `type` is one of 'set', 'erase', 'note', 'fillNotes', 'undo', 'redo', 'hint',
 * 'reveal', 'revealAll', 'reset', 'check', 'timer', 'solved'.
 *
 * Hints. The next logical step is the first step of `SG.logicalSolver.solve` on the givens plus the user's CORRECT
 * entries (wrong entries are ignored and counted in `hint.ignored`). Every step is checked against the solution
 * before it is shown, so a hint never suggests a wrong value; when the solver is stuck the hint says so
 * (`ok: false, reason: 'stuck'`). The steps of one solve form a plan the user walks with `hint()` (level 1
 * technique and region, 2 the cells, 3 the placement or elimination), `nextHintStep()` and `applyHint()`. An applied
 * elimination is remembered, so the next plan skips it.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.play && typeof SG.play.createGame === 'function') return;

  const SAVE_VERSION = 1;
  const MAX_HISTORY = 2000;
  const HINT_BUDGET_MS = 4000;
  const HINT_LEVELS = 3;
  const KEY_TIMEOUT_MS = 1200;
  const CHECK_MODES = Object.freeze(['off', 'conflicts', 'live']);

  function fail(message) {
    return new TypeError('SG.play: ' + message);
  }

  function tr(key, args) {
    return SG.i18n && typeof SG.i18n.t === 'function' ? SG.i18n.t(key, args) : key;
  }

  function hasText(key) {
    return !!(SG.i18n && typeof SG.i18n.has === 'function' && SG.i18n.has(key));
  }

  function bitOf(value) {
    return 1 << (value - 1);
  }

  function popcount(mask) {
    let m = mask;
    let count = 0;
    while (m !== 0) {
      m &= m - 1;
      count++;
    }
    return count;
  }

  function defaultNow() {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now() : Date.now();
  }

  /** The mini grid of the candidate notes of a cell (columns x rows): 3x3 for 9 digits, 3x2 for 6, 2x2 for 4, 4x3 for 12, 4x4 for 16. */
  function noteLayout(digits) {
    const d = Math.max(1, digits | 0);
    const cols = Math.ceil(Math.sqrt(d));
    return { cols: cols, rows: Math.ceil(d / cols) };
  }

  function padLayout(digits, maxCols) {
    const d = Math.max(1, digits | 0);
    const rows = Math.ceil(d / Math.max(1, maxCols | 0));
    return { cols: Math.ceil(d / rows), rows: rows };
  }

  function cellAtPoint(geo, x, y) {
    const col = Math.floor((x - geo.originX) / geo.cell);
    const row = Math.floor((y - geo.originY) / geo.cell);
    if (!(row >= 0 && row < geo.rows && col >= 0 && col < geo.cols)) return -1;
    return geo.at[row * geo.cols + col];
  }

  function moveSelection(geo, cell, dRow, dCol) {
    if (!(cell >= 0)) return cell;
    let row = geo.cellRow[cell] + dRow;
    let col = geo.cellCol[cell] + dCol;
    while (row >= 0 && row < geo.rows && col >= 0 && col < geo.cols) {
      const found = geo.at[row * geo.cols + col];
      if (found >= 0) return found;
      row += dRow;
      col += dCol;
    }
    return cell;
  }

  /** The text of every value as the board draws it in a symbol mode; colour and shape modes have no text and fall back to the label of the model. Entry v - 1 is value v. */
  function typedLabels(model, mode) {
    const out = [];
    const labels = model.symbols && model.symbols.labels;
    for (let v = 1; v <= model.digits; v++) {
      let text = null;
      if (SG.symbols && typeof SG.symbols.glyph === 'function') {
        const g = SG.symbols.glyph(mode || 'digits', v, model, { label: false });
        if (g && typeof g.text === 'string' && g.text !== '') text = g.text;
      }
      if (text === null) {
        const labelled = labels && labels[v - 1] !== undefined && model.symbols.mode !== 'word';
        if (labelled) text = String(labels[v - 1]);
        else text = v <= 9 ? String(v) : String.fromCharCode(55 + v);
      }
      out.push(text);
    }
    return out;
  }

  function valueText(model, value, mode) {
    if (SG.symbols && typeof SG.symbols.glyph === 'function') {
      const g = SG.symbols.glyph(mode || 'digits', value, model, {});
      if (g && typeof g.text === 'string' && g.text !== '') return g.text;
      if (g && typeof g.label === 'string' && g.label !== '') return g.label;
    }
    return typedLabels(model, mode)[value - 1] || String(value);
  }

  /**
   * Reads typed characters into values. One-character symbols give their value at once; a set with two-character
   * symbols (mega12 numbers 1-12) gives the shorter value first (`pending: true`) and the longer one when the next
   * character arrives within the timeout (`continued: true`: it replaces the pending one). Digits 1-9 stand for the
   * first nine values when no symbol starts with them (typing 5 in a letter or word set).
   */
  function createKeyReader(labels, options) {
    const timeout = options && options.timeoutMs > 0 ? options.timeoutMs : KEY_TIMEOUT_MS;
    const exact = new Map();
    const names = [];
    labels.forEach(function (label, index) {
      const key = String(label).toLowerCase();
      if (!exact.has(key)) {
        exact.set(key, index + 1);
        names.push(key);
      }
    });
    for (let v = 1; v <= Math.min(9, labels.length); v++) {
      const key = String(v);
      if (!names.some(function (name) { return name.indexOf(key) === 0; })) {
        exact.set(key, v);
        names.push(key);
      }
    }
    let buffer = '';
    let stamp = 0;

    function known(prefix) {
      return names.some(function (name) { return name.indexOf(prefix) === 0; });
    }

    function longer(prefix) {
      return names.some(function (name) {
        return name.length > prefix.length && name.indexOf(prefix) === 0;
      });
    }

    return {
      labels: labels.slice(),
      reset: function reset() {
        buffer = '';
      },
      feed: function feed(char, now) {
        const c = String(char).toLowerCase();
        if (c.length === 0) return null;
        if (buffer !== '' && !(now - stamp <= timeout)) buffer = '';
        let continued = buffer !== '';
        let candidate = buffer + c;
        if (!known(candidate)) {
          continued = false;
          candidate = c;
          if (!known(candidate)) {
            buffer = '';
            return null;
          }
        }
        stamp = now;
        const value = exact.has(candidate) ? exact.get(candidate) : null;
        if (value !== null && !longer(candidate)) {
          buffer = '';
          return { value: value, pending: false, continued: continued };
        }
        buffer = candidate;
        return { value: value, pending: true, continued: continued };
      }
    };
  }

  function groupEliminations(eliminations) {
    const byValue = new Map();
    (eliminations || []).forEach(function (pair) {
      if (!byValue.has(pair[1])) byValue.set(pair[1], []);
      byValue.get(pair[1]).push(pair[0]);
    });
    return Array.from(byValue.keys()).sort(function (a, b) { return a - b; }).map(function (value) {
      return { value: value, cells: byValue.get(value).sort(function (a, b) { return a - b; }) };
    });
  }

  const DIGIT_ARGS = ['digit', 'digitX', 'digitY'];
  const DIGIT_LIST_ARGS = ['digits', 'forced', 'partDigits'];

  /** A copy of a step's i18nArgs with every digit written the way the board draws it (a hexadecimal 0 is value 1, a Wordoku value is a letter) and every chain cell as a label. */
  function localizeArgs(model, args, mode) {
    const out = Object.assign({}, args || {});
    DIGIT_ARGS.forEach(function (key) {
      if (typeof out[key] === 'number') out[key] = valueText(model, out[key], mode);
    });
    DIGIT_LIST_ARGS.forEach(function (key) {
      if (Array.isArray(out[key])) {
        out[key] = out[key].map(function (v) {
          return typeof v === 'number' ? valueText(model, v, mode) : v;
        });
      }
    });
    if (Array.isArray(out.chains)) {
      out.chains = out.chains.map(function (chain) {
        return chain.map(function (lit) {
          return [SG.model.cellLabel(model, lit[0]), valueText(model, lit[1], mode), lit[2]];
        });
      });
    }
    return out;
  }

  function cellLabels(model, cells) {
    return cells.map(function (c) { return SG.model.cellLabel(model, c); });
  }

  /** The translated texts of a hint: `{ ok: false, reason, text }` for a hint without a step; else `title`, `description`, `region`, `cells`, `action`, `explanation`, `ignored` (a text, '' for none). */
  function describeHint(model, hint, opts) {
    const mode = opts && opts.mode ? opts.mode : 'digits';
    if (!hint || hint.ok !== true) {
      const reason = hint && hint.reason ? hint.reason : 'unavailable';
      return { ok: false, reason: reason, text: tr('play.hint.' + reason) };
    }
    let region = tr('play.hint.noRegion');
    if (hint.region !== null && hint.region.kind === 'cage') {
      region = tr('play.hint.region.cage', { sum: hint.region.sum });
    } else if (hint.region !== null) {
      region = tr('play.hint.region', { kind: tr('unitKind.' + hint.region.kind), label: hint.region.label });
    }
    const symbols = function (v) { return valueText(model, v, mode); };
    let action;
    if (hint.placements.length > 0) {
      action = hint.placements.map(function (p) {
        return tr('play.hint.place', { cell: SG.model.cellLabel(model, p[0]), symbol: symbols(p[1]) });
      }).join(' ');
    } else {
      action = groupEliminations(hint.eliminations).map(function (g) {
        return tr('play.hint.eliminate',
          { symbol: symbols(g.value), cells: cellLabels(model, g.cells).join(', ') });
      }).join(' ');
    }
    return {
      ok: true,
      title: tr(hint.nameKey),
      description: hasText(hint.descKey) ? tr(hint.descKey) : '',
      region: region,
      cells: tr('play.hint.cells', { cells: cellLabels(model, hint.cells).join(', ') }),
      action: action,
      explanation: tr(hint.stepKey, localizeArgs(model, hint.stepArgs, mode)),
      ignored: hint.ignored > 0 ? tr('play.hint.ignored', { count: hint.ignored }) : ''
    };
  }

  function createGame(model, givens, solution, options) {
    if (!model || !(model.cellCount > 0)) throw fail('a puzzle model is required');
    const n = model.cellCount;
    const D = model.digits;
    if (!givens || givens.length !== n) throw fail('givens must have one entry per cell (' + n + ')');
    if (!solution || solution.length !== n) throw fail('solution must have one entry per cell (' + n + ')');
    const opts = options || {};
    const given = Int32Array.from(givens);
    const sol = Int32Array.from(solution);
    const values = new Int32Array(n);
    const notes = new Int32Array(n);
    const settings = { autoNotes: opts.autoNotes !== false };
    const counts = { hints: 0, reveals: 0, checks: 0 };
    const clock = typeof opts.now === 'function' ? opts.now : defaultNow;
    const tm = { started: false, elapsed: 0, since: null, pausedBy: null };
    const listeners = [];
    const hs = { key: null, plan: [], status: 'none', cursor: 0, level: 0, ignored: 0, current: null,
      known: new Set() };
    let undoStack = [];
    let redoStack = [];
    let solved = false;

    function validCell(cell) {
      return Number.isInteger(cell) && cell >= 0 && cell < n;
    }

    function cellValue(cell) {
      return given[cell] || values[cell];
    }

    function userGrid() {
      const grid = new Int32Array(n);
      for (let i = 0; i < n; i++) grid[i] = given[i] || (values[i] === sol[i] ? values[i] : 0);
      return grid;
    }

    function fullGrid() {
      const grid = new Int32Array(n);
      for (let i = 0; i < n; i++) grid[i] = cellValue(i);
      return grid;
    }

    function candidateMask(grid, cell) {
      let mask = SG.bits ? SG.bits.full(D) : (1 << D) - 1;
      const peers = model.peers[cell];
      for (let k = 0; k < peers.length; k++) {
        const v = grid[peers[k]];
        if (v > 0) mask &= ~bitOf(v);
      }
      return mask;
    }

    function emit(info) {
      listeners.slice().forEach(function (fn) {
        try {
          fn(info);
        } catch (err) {
          if (typeof console !== 'undefined' && typeof console.error === 'function') console.error(err);
        }
      });
    }

    function stopTimer() {
      if (tm.since !== null) {
        tm.elapsed += clock() - tm.since;
        tm.since = null;
      }
      tm.pausedBy = null;
    }

    function touchTimer() {
      if (solved) return;
      if (!tm.started) {
        tm.started = true;
        tm.since = clock();
      } else if (tm.since === null && tm.pausedBy === null) {
        tm.since = clock();
      }
    }

    function elapsedMs() {
      return tm.elapsed + (tm.since !== null ? Math.max(0, clock() - tm.since) : 0);
    }

    function hasGaveUp() {
      return undoStack.some(function (entry) { return entry.gaveUp === true; });
    }

    function computeSolved() {
      let equal = true;
      for (let i = 0; i < n; i++) {
        const v = cellValue(i);
        if (v === 0) return false;
        if (v !== sol[i]) equal = false;
      }
      return equal || (!!SG.model && SG.model.isSolution(model, fullGrid()));
    }

    function status() {
      if (solved) return hasGaveUp() ? 'gaveUp' : 'solved';
      return tm.started ? 'playing' : 'idle';
    }

    function recordCell(rec, cell, v, mask) {
      if (values[cell] === v && notes[cell] === mask) return;
      rec.push([cell, values[cell], v, notes[cell], mask]);
      values[cell] = v;
      notes[cell] = mask;
    }

    function placeInto(rec, cell, v) {
      recordCell(rec, cell, v, 0);
      if (!settings.autoNotes) return;
      const bit = bitOf(v);
      const peers = model.peers[cell];
      for (let k = 0; k < peers.length; k++) {
        const p = peers[k];
        const open = values[p] === 0 && given[p] === 0;
        if (open && (notes[p] & bit) !== 0) recordCell(rec, p, 0, notes[p] & ~bit);
      }
    }

    function revert(entry) {
      const touched = [];
      for (let k = entry.changes.length - 1; k >= 0; k--) {
        const c = entry.changes[k];
        values[c[0]] = c[1];
        notes[c[0]] = c[3];
        touched.push(c[0]);
      }
      return touched;
    }

    function replay(entry) {
      const touched = [];
      for (let k = 0; k < entry.changes.length; k++) {
        const c = entry.changes[k];
        values[c[0]] = c[2];
        notes[c[0]] = c[4];
        touched.push(c[0]);
      }
      return touched;
    }

    function touchedCells(rec) {
      const seen = new Set();
      rec.forEach(function (c) { seen.add(c[0]); });
      return Array.from(seen).sort(function (a, b) { return a - b; });
    }

    function valuesChanged(rec) {
      return rec.some(function (c) { return c[1] !== c[2]; });
    }

    /** Announces a change: the hint of the old grid goes, the solved state is re-evaluated. */
    function settle(type, cells, changedValues) {
      if (changedValues) hs.current = null;
      const was = solved;
      solved = computeSolved();
      if (solved && !was) stopTimer();
      else if (!solved) touchTimer();
      emit({ type: type, cells: cells, values: changedValues, solved: solved });
      if (solved && !was) emit({ type: 'solved', cells: [], values: false, solved: true });
    }

    function commit(type, rec, extra) {
      if (rec.length === 0) return false;
      const entry = { kind: type, changes: rec };
      if (extra && extra.gaveUp === true) entry.gaveUp = true;
      undoStack.push(entry);
      if (undoStack.length > MAX_HISTORY) undoStack.shift();
      redoStack = [];
      settle(type, touchedCells(rec), valuesChanged(rec));
      return true;
    }

    function setValue(cell, v, o) {
      if (!validCell(cell) || !(Number.isInteger(v) && v >= 1 && v <= D)) return false;
      if (given[cell] > 0 || values[cell] === v) return false;
      let amended = null;
      if (o && o.amend === true && redoStack.length === 0 && undoStack.length > 0) {
        const top = undoStack[undoStack.length - 1];
        if (top.kind === 'set' && top.changes[0][0] === cell) {
          amended = top;
          undoStack.pop();
          revert(top);
        }
      }
      const rec = [];
      placeInto(rec, cell, v);
      if (rec.length === 0) {
        if (amended !== null) settle('undo', touchedCells(amended.changes), true);
        return amended !== null;
      }
      return commit('set', rec);
    }

    function clearValue(cell) {
      if (!validCell(cell) || given[cell] > 0 || values[cell] === 0) return false;
      const rec = [];
      recordCell(rec, cell, 0, notes[cell]);
      return commit('erase', rec);
    }

    function erase(cell) {
      if (!validCell(cell) || given[cell] > 0) return false;
      if (values[cell] > 0) return clearValue(cell);
      if (notes[cell] === 0) return false;
      const rec = [];
      recordCell(rec, cell, 0, 0);
      return commit('erase', rec);
    }

    function toggleNote(cell, v) {
      if (!validCell(cell) || !(Number.isInteger(v) && v >= 1 && v <= D)) return false;
      if (given[cell] > 0 || values[cell] > 0) return false;
      const rec = [];
      recordCell(rec, cell, 0, notes[cell] ^ bitOf(v));
      return commit('note', rec);
    }

    function fillNotes() {
      const grid = fullGrid();
      const rec = [];
      for (let i = 0; i < n; i++) {
        if (given[i] === 0 && values[i] === 0) recordCell(rec, i, 0, candidateMask(grid, i));
      }
      return commit('fillNotes', rec);
    }

    function undo() {
      if (undoStack.length === 0) return false;
      const entry = undoStack.pop();
      revert(entry);
      redoStack.push(entry);
      settle('undo', touchedCells(entry.changes), valuesChanged(entry.changes));
      return true;
    }

    function redo() {
      if (redoStack.length === 0) return false;
      const entry = redoStack.pop();
      replay(entry);
      undoStack.push(entry);
      settle('redo', touchedCells(entry.changes), valuesChanged(entry.changes));
      return true;
    }

    function reset() {
      const cells = [];
      for (let i = 0; i < n; i++) if (values[i] !== 0 || notes[i] !== 0) cells.push(i);
      values.fill(0);
      notes.fill(0);
      undoStack = [];
      redoStack = [];
      counts.hints = 0;
      counts.reveals = 0;
      counts.checks = 0;
      tm.started = false;
      tm.elapsed = 0;
      tm.since = null;
      tm.pausedBy = null;
      hs.key = null;
      hs.plan = [];
      hs.current = null;
      hs.known.clear();
      solved = false;
      emit({ type: 'reset', cells: cells, values: true, solved: false });
    }

    function cageRange(cage, used, open) {
      if (open === 0) return [0, 0];
      if (!cage.distinct) return [open, open * D];
      const free = [];
      for (let v = 1; v <= D; v++) if ((used & bitOf(v)) === 0) free.push(v);
      if (free.length < open) return null;
      let min = 0;
      let max = 0;
      for (let k = 0; k < open; k++) {
        min += free[k];
        max += free[free.length - 1 - k];
      }
      return [min, max];
    }

    /** The rule conflicts among the visible values: a digit twice in a unit, a cage that repeats a digit or can no longer reach its sum, an unsatisfied sign. */
    function conflicts() {
      const flag = new Uint8Array(n);
      const badUnits = [];
      const badCages = [];
      const badSigns = [];
      const first = new Int32Array(D + 1);
      let u;
      let i;
      for (u = 0; u < model.units.length; u++) {
        const cells = model.units[u];
        let dup = false;
        first.fill(-1);
        for (i = 0; i < cells.length; i++) {
          const c = cells[i];
          const v = cellValue(c);
          if (v <= 0) continue;
          if (first[v] === -1) {
            first[v] = c;
          } else {
            flag[c] = 1;
            flag[first[v]] = 1;
            dup = true;
          }
        }
        if (dup) badUnits.push(u);
      }
      for (let k = 0; k < model.cages.length; k++) {
        const cage = model.cages[k];
        let sum = 0;
        let used = 0;
        let filled = 0;
        let bad = false;
        for (i = 0; i < cage.cells.length; i++) {
          const v = cellValue(cage.cells[i]);
          if (v <= 0) continue;
          sum += v;
          filled++;
          if (cage.distinct) {
            if ((used & bitOf(v)) !== 0) bad = true;
            used |= bitOf(v);
          }
        }
        if (!bad && filled > 0) {
          const range = cageRange(cage, used, cage.cells.length - filled);
          bad = range === null || sum + range[0] > cage.sum || sum + range[1] < cage.sum;
        }
        if (bad) {
          badCages.push(k);
          for (i = 0; i < cage.cells.length; i++) if (cellValue(cage.cells[i]) > 0) flag[cage.cells[i]] |= 2;
        }
      }
      for (let q = 0; q < model.inequalities.length; q++) {
        const a = model.inequalities[q].a;
        const b = model.inequalities[q].b;
        const va = cellValue(a);
        const vb = cellValue(b);
        let bad = false;
        if (va > 0 && vb > 0) bad = !(va < vb);
        else if (va === D) bad = true;
        else if (vb === 1) bad = true;
        if (bad) {
          badSigns.push(q);
          if (va > 0) flag[a] |= 4;
          if (vb > 0) flag[b] |= 4;
        }
      }
      const cells = [];
      for (i = 0; i < n; i++) if (flag[i] !== 0) cells.push(i);
      return { cells: cells, units: badUnits, cages: badCages, signs: badSigns };
    }

    function wrongCells() {
      const out = [];
      for (let i = 0; i < n; i++) if (values[i] > 0 && values[i] !== sol[i]) out.push(i);
      return out;
    }

    function progress() {
      let givenCount = 0;
      let filled = 0;
      let correct = 0;
      for (let i = 0; i < n; i++) {
        if (given[i] > 0) {
          givenCount++;
        } else if (values[i] > 0) {
          filled++;
          if (values[i] === sol[i]) correct++;
        }
      }
      const total = n - givenCount;
      return {
        total: total, givens: givenCount, filled: filled, correct: correct, wrong: filled - correct,
        remaining: total - correct, percent: total === 0 ? 100 : Math.round(100 * correct / total)
      };
    }

    function check() {
      counts.checks++;
      const found = conflicts();
      const wrong = wrongCells();
      const p = progress();
      emit({ type: 'check', cells: [], values: false, solved: solved });
      return {
        wrong: wrong, conflicts: found.cells, filled: p.filled, empty: p.total - p.filled,
        ok: wrong.length === 0 && found.cells.length === 0, complete: solved
      };
    }

    function ensureExtensions() {
      if (model.cages.length > 0 && SG.comboTable) SG.comboTable.enablePropagation(model.variantId);
      if (model.inequalities.length > 0 && SG.ineq) SG.ineq.ensureExtension();
    }

    function runSolver(grid, assumeUniqueness) {
      return SG.logicalSolver.solve(model, grid, {
        collectSteps: true,
        stopOnStuck: true,
        assumeUniqueness: assumeUniqueness,
        budget: SG.budget ? SG.budget.create({ ms: HINT_BUDGET_MS }) : null
      });
    }

    function stepSound(step) {
      for (let k = 0; k < step.placements.length; k++) {
        if (sol[step.placements[k][0]] !== step.placements[k][1]) return false;
      }
      for (let k = 0; k < step.eliminations.length; k++) {
        if (sol[step.eliminations[k][0]] === step.eliminations[k][1]) return false;
      }
      return true;
    }

    function soundPrefix(steps) {
      let k = 0;
      while (k < steps.length && stepSound(steps[k])) k++;
      return steps.slice(0, k);
    }

    function knownKey(cell, v) {
      return cell * 32 + v;
    }

    function alreadyKnown(step) {
      return step.placements.length === 0 && step.eliminations.every(function (e) {
        return hs.known.has(knownKey(e[0], e[1]));
      });
    }

    function countIgnored() {
      return wrongCells().length;
    }

    function planHints() {
      const grid = userGrid();
      hs.key = grid.join(',');
      hs.cursor = 0;
      hs.level = 0;
      hs.current = null;
      hs.plan = [];
      hs.ignored = countIgnored();
      if (grid.every(function (v) { return v > 0; })) {
        hs.status = 'solved';
        return;
      }
      ensureExtensions();
      try {
        let report = runSolver(grid, true);
        let steps = soundPrefix(report.steps);
        if (steps.length === 0 && report.steps.length > 0) {
          // The first step disagrees with the solution (a puzzle with more than one solution, say): retry
          // without the techniques that rely on a unique solution.
          report = runSolver(grid, false);
          steps = soundPrefix(report.steps);
        }
        hs.plan = steps.filter(function (s) { return !alreadyKnown(s); });
        hs.status = hs.plan.length > 0 ? 'ok' : report.status === 'contradiction' ? 'unavailable' : 'stuck';
      } catch (err) {
        hs.status = 'unavailable';
      }
    }

    function ensurePlan() {
      const key = userGrid().join(',');
      if (hs.key !== key || hs.status === 'none') planHints();
    }

    function unitContaining(step) {
      const a = step.i18nArgs || {};
      let index = -1;
      if (Number.isInteger(a.unitIndex)) index = a.unitIndex;
      else if (step.technique === 'pointing' && Number.isInteger(a.boxIndex)) index = a.boxIndex;
      else if (step.technique === 'boxLine' && Number.isInteger(a.lineIndex)) index = a.lineIndex;
      else if (typeof a.unit === 'string') {
        for (let u = 0; u < model.unitMeta.length; u++) {
          if (model.unitMeta[u].label === a.unit) {
            index = u;
            break;
          }
        }
      }
      if (index < 0 && step.cells.length >= 2 && step.technique !== 'cageCombo') {
        let best = -1;
        for (let u = 0; u < model.units.length; u++) {
          const members = model.units[u];
          if (step.cells.every(function (c) { return members.indexOf(c) !== -1; }) &&
              (best < 0 || members.length < model.units[best].length)) {
            best = u;
          }
        }
        index = best;
      }
      return index;
    }

    function regionOf(step) {
      if (step.technique === 'nakedSingle') return null;
      if (step.technique === 'cageCombo' && step.i18nArgs && step.i18nArgs.sum !== undefined) {
        return { kind: 'cage', label: String(step.i18nArgs.sum), sum: step.i18nArgs.sum,
          cells: step.cells.slice() };
      }
      const u = unitContaining(step);
      if (u < 0) return null;
      return { kind: model.unitMeta[u].kind, label: model.unitMeta[u].label, unit: u,
        cells: Array.from(model.units[u]) };
    }

    function buildHint(k, level) {
      const step = hs.plan[k];
      const known = SG.techniques && SG.techniques.has(step.technique);
      const tech = known ? SG.techniques.get(step.technique) : null;
      const nameKey = tech ? tech.i18nKey : 'technique.' + step.technique;
      const targets = [];
      step.placements.concat(step.eliminations).forEach(function (pair) {
        if (targets.indexOf(pair[0]) === -1) targets.push(pair[0]);
      });
      return {
        ok: true,
        step: k,
        steps: hs.plan.length,
        level: level,
        technique: step.technique,
        nameKey: nameKey,
        descKey: nameKey + '.desc',
        stepKey: step.i18nKey,
        stepArgs: Object.assign({}, step.i18nArgs),
        kind: step.placements.length > 0 ? 'placement' : 'elimination',
        cells: step.cells.slice(),
        targets: targets,
        placements: step.placements.map(function (p) { return p.slice(); }),
        eliminations: step.eliminations.map(function (e) { return e.slice(); }),
        region: regionOf(step),
        ignored: hs.ignored
      };
    }

    function refused(reason) {
      hs.current = { ok: false, reason: reason, ignored: hs.ignored };
      return hs.current;
    }

    function hint() {
      ensurePlan();
      if (hs.status !== 'ok') return refused(hs.status);
      if (hs.cursor >= hs.plan.length) return refused('stuck');
      hs.ignored = countIgnored();
      if (hs.level === 0) counts.hints++;
      hs.level = Math.min(hs.level + 1, HINT_LEVELS);
      hs.current = buildHint(hs.cursor, hs.level);
      emit({ type: 'hint', cells: hs.current.cells, values: false, solved: solved });
      return hs.current;
    }

    function nextHintStep() {
      ensurePlan();
      if (hs.status !== 'ok') return refused(hs.status);
      if (hs.cursor + 1 >= hs.plan.length) return refused('stuck');
      hs.cursor++;
      hs.level = 0;
      return hint();
    }

    function clearHint() {
      hs.current = null;
      hs.level = 0;
    }

    function currentHint() {
      return hs.current;
    }

    function applyHint() {
      const h = hs.current;
      if (!h || h.ok !== true) return false;
      const rec = [];
      h.placements.forEach(function (p) {
        if (given[p[0]] === 0 && values[p[0]] !== p[1]) placeInto(rec, p[0], p[1]);
      });
      h.eliminations.forEach(function (e) {
        hs.known.add(knownKey(e[0], e[1]));
        if (given[e[0]] === 0 && values[e[0]] === 0 && (notes[e[0]] & bitOf(e[1])) !== 0) {
          recordCell(rec, e[0], 0, notes[e[0]] & ~bitOf(e[1]));
        }
      });
      if (h.placements.length === 0) {
        hs.cursor++;
        hs.level = 0;
        hs.current = null;
      }
      if (rec.length === 0) {
        emit({ type: 'hint', cells: h.targets, values: false, solved: solved });
        return true;
      }
      return commit('hint', rec);
    }

    function easiestCell() {
      const grid = userGrid();
      let best = -1;
      let bestCount = Infinity;
      for (let i = 0; i < n; i++) {
        if (given[i] > 0 || values[i] === sol[i]) continue;
        const count = popcount(candidateMask(grid, i));
        if (count < bestCount) {
          best = i;
          bestCount = count;
        }
      }
      return best;
    }

    function revealCell(cell) {
      let target = cell;
      if (!validCell(target) || given[target] > 0 || values[target] === sol[target]) target = easiestCell();
      if (target < 0) return null;
      const rec = [];
      placeInto(rec, target, sol[target]);
      counts.reveals++;
      commit('reveal', rec);
      return { cell: target, value: sol[target] };
    }

    function revealSolution() {
      const rec = [];
      for (let i = 0; i < n; i++) if (given[i] === 0) recordCell(rec, i, sol[i], 0);
      if (rec.length === 0) return false;
      counts.reveals += rec.length;
      return commit('revealAll', rec, { gaveUp: true });
    }

    function pauseTimer(by) {
      if (!tm.started || tm.since === null) return false;
      tm.elapsed += clock() - tm.since;
      tm.since = null;
      tm.pausedBy = by === 'auto' ? 'auto' : 'user';
      emit({ type: 'timer', cells: [], values: false, solved: solved });
      return true;
    }

    function resumeTimer(by) {
      if (!tm.started || tm.since !== null || solved) return false;
      if (by === 'auto' && tm.pausedBy !== 'auto') return false;
      tm.pausedBy = null;
      tm.since = clock();
      emit({ type: 'timer', cells: [], values: false, solved: solved });
      return true;
    }

    function startTimer() {
      if (tm.started || solved) return false;
      tm.started = true;
      tm.since = clock();
      tm.pausedBy = null;
      emit({ type: 'timer', cells: [], values: false, solved: solved });
      return true;
    }

    function timerState() {
      return { started: tm.started, running: tm.since !== null, paused: tm.pausedBy !== null,
        pausedBy: tm.pausedBy, elapsedMs: elapsedMs() };
    }

    function serializeEntries(list) {
      return list.map(function (e) {
        const out = { k: e.kind, c: e.changes.map(function (c) { return c.slice(); }) };
        if (e.gaveUp === true) out.g = 1;
        return out;
      });
    }

    function serialize() {
      return {
        v: SAVE_VERSION,
        variantId: model.variantId,
        cells: n,
        digits: D,
        values: Array.from(values),
        notes: Array.from(notes),
        undo: serializeEntries(undoStack),
        redo: serializeEntries(redoStack),
        counters: { hints: counts.hints, reveals: counts.reveals, checks: counts.checks },
        known: Array.from(hs.known),
        options: { autoNotes: settings.autoNotes },
        timer: { started: tm.started, elapsed: Math.round(elapsedMs()),
          pausedBy: tm.since !== null ? 'auto' : tm.pausedBy }
      };
    }

    function parseEntries(list) {
      if (!Array.isArray(list)) throw fail('invalid saved game: history');
      return list.map(function (e) {
        if (!e || !Array.isArray(e.c)) throw fail('invalid saved game: history entry');
        e.c.forEach(function (c) {
          const ok = Array.isArray(c) && c.length === 5 && validCell(c[0]) &&
            c.every(function (x) { return Number.isInteger(x) && x >= 0; }) && c[1] <= D && c[2] <= D;
          if (!ok) throw fail('invalid saved game: history change');
        });
        const entry = { kind: String(e.k), changes: e.c.map(function (c) { return c.slice(); }) };
        if (e.g === 1) entry.gaveUp = true;
        return entry;
      });
    }

    function load(data) {
      const full = SG.bits ? SG.bits.full(D) : (1 << D) - 1;
      const ok = data && data.v === SAVE_VERSION && data.cells === n && data.digits === D &&
        Array.isArray(data.values) && data.values.length === n && Array.isArray(data.notes) &&
        data.notes.length === n;
      if (!ok) throw fail('invalid saved game');
      for (let i = 0; i < n; i++) {
        const v = data.values[i];
        const m = data.notes[i];
        const badCell = !(Number.isInteger(v) && v >= 0 && v <= D);
        const badNote = !(Number.isInteger(m) && m >= 0 && (m & ~full) === 0);
        if (badCell || badNote) throw fail('invalid saved game: cell ' + i);
        if (given[i] > 0 && (v !== 0 || m !== 0)) throw fail('invalid saved game: a clue was changed');
        values[i] = v;
        notes[i] = m;
      }
      undoStack = parseEntries(data.undo);
      redoStack = parseEntries(data.redo);
      const c = data.counters || {};
      counts.hints = c.hints | 0;
      counts.reveals = c.reveals | 0;
      counts.checks = c.checks | 0;
      (data.known || []).forEach(function (k) { if (Number.isInteger(k)) hs.known.add(k); });
      if (data.options && typeof data.options.autoNotes === 'boolean') {
        settings.autoNotes = data.options.autoNotes;
      }
      const t = data.timer || {};
      tm.started = t.started === true;
      tm.elapsed = Number(t.elapsed) > 0 ? Number(t.elapsed) : 0;
      tm.since = null;
      tm.pausedBy = tm.started ? (t.pausedBy === 'user' ? 'user' : 'auto') : null;
      solved = computeSolved();
      if (solved) {
        tm.pausedBy = null;
      }
    }

    if (opts.state) load(opts.state);

    return {
      model: model,
      cellCount: n,
      digits: D,

      getValue: cellValue,
      userValue: function userValue(cell) { return validCell(cell) ? values[cell] : 0; },
      isGiven: function isGiven(cell) { return validCell(cell) && given[cell] > 0; },
      getNotes: function getNotes(cell) { return validCell(cell) ? notes[cell] : 0; },
      snapshot: function snapshot() { return { values: values.slice(), notes: notes.slice() }; },

      setValue: setValue,
      clearValue: clearValue,
      erase: erase,
      toggleNote: toggleNote,
      fillNotes: fillNotes,
      undo: undo,
      redo: redo,
      canUndo: function canUndo() { return undoStack.length > 0; },
      canRedo: function canRedo() { return redoStack.length > 0; },
      reset: reset,

      conflicts: conflicts,
      wrongCells: wrongCells,
      check: check,
      progress: progress,
      isSolved: function isSolved() { return solved; },
      status: status,

      hint: hint,
      nextHintStep: nextHintStep,
      applyHint: applyHint,
      clearHint: clearHint,
      currentHint: currentHint,
      revealCell: revealCell,
      revealSolution: revealSolution,

      pauseTimer: pauseTimer,
      startTimer: startTimer,
      resumeTimer: resumeTimer,
      elapsedMs: elapsedMs,
      timerState: timerState,

      subscribe: function subscribe(fn) {
        if (typeof fn !== 'function') throw fail('subscribe needs a function');
        listeners.push(fn);
        return function off() {
          const at = listeners.indexOf(fn);
          if (at !== -1) listeners.splice(at, 1);
        };
      },
      setOptions: function setOptions(next) {
        if (next && typeof next.autoNotes === 'boolean') settings.autoNotes = next.autoNotes;
      },
      getOptions: function getOptions() { return { autoNotes: settings.autoNotes }; },
      counters: function counters() {
        return { hints: counts.hints, reveals: counts.reveals, checks: counts.checks };
      },
      serialize: serialize
    };
  }

  /** Rebuilds a game from `game.serialize()`; a running timer comes back paused. Throws TypeError for data that does not belong to this puzzle. */
  function restoreGame(model, givens, solution, data, options) {
    if (data === null || typeof data !== 'object') throw fail('invalid saved game');
    return createGame(model, givens, solution, Object.assign({}, options || {}, { state: data }));
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const CLOCK_MS = 500;
  const RESET_ARM_MS = 4000;
  // The same breakpoint as css/layout.css (and Sudoku Generator): below it the keys are fixed to the bottom.
  const SMALL_SCREEN = '(max-width: 767.98px)';
  const WIDE_PAD_COLS = 6;
  const POPUP_COLS = 3;
  const POPUP_COLS_BIG = 4;
  const CELL_UNITS = 40;
  const NOTE_MARGIN = 3;
  const NOTE_TOP_CAGE = 11;
  const ARROWS = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

  const ICON_PATHS = {
    undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
    redo: 'm15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13',
    erase: 'm7 21-4.3-4.3a1.5 1.5 0 0 1 0-2.1l10-10a1.5 1.5 0 0 1 2.1 0l5.6 5.6a1.5 1.5 0 0 1 0 2.1L11 21z' +
      'M7 21h13',
    notes: 'M4 20l1-4.5L16.5 4a2.1 2.1 0 0 1 3 3L8 18.5zM14.5 6l3 3',
    reset: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5',
    hint: 'M9 18h6M10 21.5h4M12 2.5a6.5 6.5 0 0 0-3.7 11.8c.6.5 1 1.2 1 1.9v.8h5.4v-.8c0-.7.4-1.4 1-1.9' +
      'A6.5 6.5 0 0 0 12 2.5z',
    // A grid of candidates (the notes of every cell).
    fillNotes: 'M6 6h.01M12 6h.01M18 6h.01M6 12h.01M12 12h.01M18 12h.01M6 18h.01M12 18h.01M18 18h.01',
    // An eye: show what is hidden.
    reveal: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z'
  };

  let controller = null;

  function h(tag, attrs, children) {
    const node = root.document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (name) {
      const value = attrs[name];
      if (value === null || value === undefined || value === false) return;
      if (name === 'class') node.className = value;
      else if (name === 'text') node.textContent = value;
      else node.setAttribute(name, value === true ? '' : String(value));
    });
    (children || []).forEach(function (child) { if (child) node.appendChild(child); });
    return node;
  }

  function s(tag, attrs) {
    const node = root.document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (name) { node.setAttribute(name, String(attrs[name])); });
    return node;
  }

  /**
   * Draws a snapshot of a game on a board view, in the same layer and with the same classes as the play overlay: the
   * player's entries, the notes of the cells that matter and the marks of a hint. The Help page uses it to show a
   * technique at work; symbols are drawn as text. `snap`: `values` (the player's entries; the board draws the givens),
   * `notes` (bit mask per cell), `hint` (what `game.hint()` returned), `notesIn` (cells whose notes are drawn; default
   * the region, the hint cells and the ones it changes).
   */
  function renderSnapshot(board, svgEl, model, snap) {
    const geo = board.getGeometry();
    const mode = snap.mode || 'digits';
    const hint = snap.hint && snap.hint.ok === true ? snap.hint : null;
    const inRegion = new Set(hint && hint.region ? hint.region.cells : []);
    const inCells = new Set(hint ? hint.cells : []);
    const inTargets = new Set(hint ? hint.targets : []);
    const elim = new Map();
    const keep = new Map();
    if (hint) {
      hint.eliminations.forEach(function (e) { elim.set(e[0], (elim.get(e[0]) || 0) | bitOf(e[1])); });
      hint.placements.forEach(function (p) { keep.set(p[0], (keep.get(p[0]) || 0) | bitOf(p[1])); });
    }
    const noted = new Set(snap.notesIn || Array.from(inRegion).concat(Array.from(inCells), Array.from(inTargets)));
    const layer = s('g', { class: 'layer-play', 'data-layer': 'play', 'aria-hidden': 'true',
      style: 'font-size:' + geo.value.font + 'px' });
    const lay = noteLayout(model.digits);
    const top = model.cages.length > 0 ? NOTE_TOP_CAGE : NOTE_MARGIN;
    const slotW = (CELL_UNITS - 2 * NOTE_MARGIN) / lay.cols;
    const slotH = (CELL_UNITS - top - NOTE_MARGIN) / lay.rows;
    const longest = typedLabels(model, mode).reduce(function (m, text) { return Math.max(m, text.length); }, 1);
    const font = Math.min(slotH * 0.86, slotW / (longest * 0.62), 11);
    const text = function (v) { return SG.symbols.glyph(mode, v, model, { colorAuxSymbol: false, label: false }).text; };
    for (let i = 0; i < model.cellCount; i++) {
      let cls = 'pl-cell';
      if (inRegion.has(i)) cls += ' is-hint-region';
      if (inCells.has(i)) cls += ' is-hint-cell';
      if (inTargets.has(i)) cls += ' is-hint-target';
      const group = s('g', { class: cls, 'data-pc': i });
      const rect = { x: geo.cellX[i] + 1.5, y: geo.cellY[i] + 1.5, width: CELL_UNITS - 3, height: CELL_UNITS - 3 };
      group.appendChild(s('rect', Object.assign({ class: 'pl-bg' }, rect)));
      group.appendChild(s('rect', Object.assign({ class: 'pl-hint' }, rect)));
      const value = snap.values[i] || 0;
      const mask = snap.notes[i] || 0;
      if (value > 0) {
        const label = s('text', { class: 'pl-val', x: geo.cellX[i] + CELL_UNITS / 2,
          y: geo.cellY[i] + CELL_UNITS / 2 + geo.value.shiftY, dy: '0.35em', 'text-anchor': 'middle' });
        label.textContent = text(value);
        group.appendChild(s('g', { class: 'pl-content' }, [])).appendChild(label);
      } else if (mask !== 0 && noted.has(i)) {
        const content = s('g', { class: 'pl-content' });
        for (let d = 1; d <= model.digits; d++) {
          if ((mask & bitOf(d)) === 0) continue;
          const note = s('text', {
            class: 'pl-note' + (((elim.get(i) || 0) & bitOf(d)) !== 0 ? ' is-elim' : '') +
              (((keep.get(i) || 0) & bitOf(d)) !== 0 ? ' is-keep' : ''),
            x: geo.cellX[i] + NOTE_MARGIN + (((d - 1) % lay.cols) + 0.5) * slotW,
            y: geo.cellY[i] + top + (Math.floor((d - 1) / lay.cols) + 0.5) * slotH,
            dy: '0.35em', 'text-anchor': 'middle', 'font-size': Math.round(font * 10) / 10
          });
          note.textContent = text(d);
          content.appendChild(note);
        }
        group.appendChild(content);
      }
      layer.appendChild(group);
    }
    svgEl.appendChild(layer);
    return layer;
  }

  function icon(name) {
    const svg = s('svg', { class: 'icon', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' });
    if (ICON_PATHS[name] !== undefined) svg.appendChild(s('path', { d: ICON_PATHS[name] }));
    else svg.appendChild(s('use', { href: '#ic-' + name }));
    return svg;
  }

  function clockText(ms) {
    const whole = Math.floor(Math.max(0, ms) / 1000) * 1000;
    return whole < 1000 ? tr('duration.s', { value: '0' }) : SG.i18n.formatDuration(whole);
  }

  function createController(app) {
    const doc = root.document;
    const els = {};
    const bound = [];
    const subscriptions = [];
    const appOffs = [];
    let board = null;
    let svg = null;
    let geo = null;
    let puzzle = null;
    let game = null;
    let unsubscribeGame = null;
    let active = false;
    let sel = -1;
    let notesMode = false;
    let marks = null;
    let hint = null;
    let layer = null;
    let reader = null;
    let clockTimer = null;
    let resetTimer = null;
    let revealTimer = null;
    let padSig = '';
    let wordHidden = false;
    let popupOpen = false;
    let moreOpen = false;

    function bindText(el, key, attr) {
      const entry = { el: el, key: key, attr: attr || null };
      bound.push(entry);
      applyText(entry);
      return el;
    }

    function applyText(entry) {
      const text = tr(entry.key);
      if (entry.attr === null) entry.el.textContent = text;
      else entry.el.setAttribute(entry.attr, text);
    }

    function retranslate() {
      bound.forEach(applyText);
      if (active && els.wordCard !== undefined && !els.wordCard.hidden) renderWordCard(true);
    }

    function store() {
      return typeof app.getStore === 'function' ? app.getStore() : null;
    }

    function pref(name) {
      const st = store();
      const state = st === null ? null : st.get();
      if (state !== null && state[name] !== undefined) return state[name];
      return name === 'check' ? 'conflicts' : true;
    }

    function currentMode() {
      return svg !== null && svg.getAttribute('data-symbols') ? svg.getAttribute('data-symbols') : 'digits';
    }

    function auxOn() {
      const st = store();
      return st === null || st.get().colorAuxSymbol !== false;
    }

    function labelOf(cell) {
      return SG.model.cellLabel(game.model, cell);
    }

    function toolButton(id, iconName, key, onClick) {
      const button = h('button', { type: 'button', class: 'play__tool', 'data-tool': id }, [
        icon(iconName), h('span', { class: 'play__tool-label' })
      ]);
      bindText(button.lastChild, key);
      bindText(button, key + '.title', 'title');
      button.addEventListener('click', onClick);
      els[id] = button;
      return button;
    }

    function buildHintCard() {
      const card = {
        title: h('h3', { class: 'play__hint-title' }),
        desc: h('p', { class: 'play__hint-desc' }),
        region: h('p', { class: 'play__hint-line' }),
        cells: h('p', { class: 'play__hint-line' }),
        action: h('p', { class: 'play__hint-action' }),
        explain: h('p', { class: 'play__hint-line' }),
        note: h('p', { class: 'play__hint-note' }),
        more: h('button', { type: 'button', class: 'btn btn--secondary btn--sm' }),
        apply: h('button', { type: 'button', class: 'btn btn--primary btn--sm' }),
        reveal: h('button', { type: 'button', class: 'btn btn--secondary btn--sm' }),
        close: h('button', { type: 'button', class: 'play__hint-close' }, [icon('x')])
      };
      bindText(card.more, 'play.hint.more');
      bindText(card.reveal, 'play.hint.reveal');
      bindText(card.close, 'play.hint.close', 'aria-label');
      bindText(card.close, 'play.hint.close', 'title');
      card.more.addEventListener('click', showHint);
      card.apply.addEventListener('click', applyHint);
      card.reveal.addEventListener('click', revealCell);
      card.close.addEventListener('click', closeHint);
      card.root = h('div', { class: 'play__hint', hidden: true, 'aria-live': 'polite' }, [
        card.close,
        h('div', { class: 'play__hint-head' }, [card.title]),
        card.desc, card.region, card.cells, card.action, card.explain, card.note,
        h('div', { class: 'play__hint-buttons' }, [card.more, card.apply, card.reveal])
      ]);
      return card;
    }

    function buildUi() {
      const statusHost = doc.getElementById('play-status');
      const panelHost = doc.getElementById('play-root');
      const optionsHost = doc.getElementById('options-root');
      if (statusHost === null || panelHost === null || optionsHost === null) return false;

      els.pause = h('button', { type: 'button', class: 'btn btn--primary btn--sm play__pause' }, [
        icon('pause'), h('span', { class: 'btn__label' })
      ]);
      els.pauseLabel = els.pause.lastChild;
      els.pause.addEventListener('click', togglePause);
      els.reset = h('button', { type: 'button', class: 'btn btn--secondary btn--sm play__reset' }, [
        icon('reset'), h('span', { class: 'btn__label' })
      ]);
      els.resetLabel = els.reset.lastChild;
      els.reset.addEventListener('click', resetGame);
      els.clock = h('span', { class: 'play__clock' });
      els.progress = h('span', { class: 'play__progress' });
      const timeLabel = h('span', { class: 'visually-hidden' });
      bindText(timeLabel, 'play.timer.label');
      els.controls = h('div', { class: 'play__controls' }, [els.pause, els.reset]);
      els.statusRow = h('div', { class: 'play__status-row' }, [
        els.controls,
        h('span', { class: 'play__time' }, [timeLabel, els.clock])
      ]);
      els.status = h('div', { class: 'play__status', hidden: true }, [els.statusRow, els.progress]);
      statusHost.appendChild(els.status);
      const statusLine = statusHost.querySelector('.status-row');
      if (statusLine !== null) els.status.appendChild(statusLine);
      els.statusHost = statusHost;

      els.wordTitle = h('div', { class: 'play__word-title' });
      bindText(els.wordTitle, 'play.word.title');
      els.wordText = h('div', { class: 'play__word-text' });
      els.wordMeaning = h('p', { class: 'play__word-meaning' });
      els.wordOther = h('p', { class: 'play__word-other' });
      els.wordCard = h('div', { class: 'play__word', hidden: true }, [
        els.wordTitle, els.wordText, els.wordMeaning, els.wordOther
      ]);
      els.status.appendChild(els.wordCard);

      els.tools = h('div', { class: 'play__tools', role: 'toolbar' }, [
        toolButton('notes', 'notes', 'play.tool.notes', toggleNotes),
        toolButton('erase', 'erase', 'play.tool.erase', eraseCell),
        toolButton('undo', 'undo', 'play.tool.undo', undo),
        toolButton('redo', 'redo', 'play.tool.redo', redo),
        toolButton('hint', 'hint', 'play.tool.hint', showHint),
        toolButton('check', 'check', 'play.tool.check', checkEntries)
      ]);
      els.notes.setAttribute('aria-pressed', 'false');
      bindText(els.tools, 'play.tool.label', 'aria-label');

      els.pad = h('div', { class: 'play__pad', role: 'group' });
      bindText(els.pad, 'play.pad.label', 'aria-label');
      els.hintCard = buildHintCard();

      const symbolsLegend = h('legend', { class: 'field-group__legend' });
      bindText(symbolsLegend, 'play.symbols.label');
      els.symbolsList = h('div', { class: 'play__choices' });
      els.symbolsRow = h('fieldset', { class: 'field-group play__symbols' }, [symbolsLegend, els.symbolsList]);

      els.keys = h('div', { class: 'play__keys' }, [els.tools, els.pad]);
      // The actions on this puzzle (fill in all notes, reveal a cell) stay out of the way until the play frame is
      // expanded, so none is pressed by mistake; the toggle sits right under the pad.
      els.moreIcon = icon('chevron-down');
      els.moreLabel = h('span', { class: 'btn__label' });
      els.moreToggle = h('button', { type: 'button', class: 'btn btn--ghost btn--sm play__more-toggle',
        'aria-expanded': 'false', 'aria-controls': 'play-more' }, [els.moreIcon, els.moreLabel]);
      els.moreToggle.addEventListener('click', function () { setMore(!moreOpen); });
      els.moreBody = h('div', { class: 'play__more', id: 'play-more', hidden: true }, [makeActions()]);
      els.keys.appendChild(els.moreToggle);
      els.keys.appendChild(els.moreBody);
      els.panel = h('section', { class: 'play__panel', hidden: true }, [
        els.keys, els.hintCard.root
      ]);
      bindText(els.panel, 'play.panel.label', 'aria-label');
      setMore(false);
      els.root = h('div', { class: 'play', 'data-active': 'false' }, [els.panel]);
      panelHost.appendChild(els.root);

      // The Options frame below the play frame: symbols and the two checking preferences (as in the Settings dialog).
      els.checkRadios = CHECK_MODES.map(function (mode) {
        const input = h('input', { type: 'radio', name: 'play-check', value: mode });
        input.checked = pref('check') === mode;
        input.addEventListener('change', function () {
          const st = store();
          if (input.checked && st !== null) st.set({ check: mode }, { source: 'play' });
        });
        const text = h('span');
        bindText(text, 'play.options.check.' + mode);
        return h('label', { class: 'checkbox' }, [input, text]);
      });
      const checkLegend = h('legend', { class: 'field-group__legend' });
      bindText(checkLegend, 'play.options.check');
      const checkGroup = h('fieldset', { class: 'field-group' }, [
        checkLegend, h('div', { class: 'play__choices' }, els.checkRadios)
      ]);
      els.autoNotes = h('input', { type: 'checkbox', id: 'play-auto-notes' });
      els.autoNotes.checked = pref('autoNotes') !== false;
      els.autoNotes.addEventListener('change', function () {
        const st = store();
        if (st !== null) st.set({ autoNotes: els.autoNotes.checked }, { source: 'play' });
      });
      const autoLabel = h('label', { class: 'field__label', for: 'play-auto-notes' });
      bindText(autoLabel, 'play.options.autoNotes');
      const title = h('span', { class: 'play__options-title' });
      bindText(title, 'play.options.summary');
      els.optionsBox = h('details', { class: 'disclosure play__options', hidden: true }, [
        h('summary', {}, [title]),
        h('div', { class: 'disclosure__body play__options-body' }, [
          els.symbolsRow,
          checkGroup,
          h('div', { class: 'checkbox play__option' }, [els.autoNotes, autoLabel])
        ])
      ]);
      optionsHost.appendChild(els.optionsBox);
      els.legend = doc.getElementById('board-legend');

      const popupTool = function (iconName, key, onClick) {
        const button = h('button', { type: 'button', class: 'play__ptool' }, [icon(iconName)]);
        bindText(button, key, 'aria-label');
        bindText(button, key, 'title');
        button.addEventListener('click', onClick);
        return button;
      };
      els.popupPad = h('div', { class: 'play__popup-pad', role: 'group' });
      bindText(els.popupPad, 'play.pad.label', 'aria-label');
      els.popupNotes = popupTool('notes', 'play.tool.notes', toggleNotes);
      els.popupNotes.setAttribute('aria-pressed', 'false');
      els.popupErase = popupTool('erase', 'play.tool.erase', eraseCell);
      els.popupClose = popupTool('x', 'play.popup.close', closePopup);
      els.popup = h('div', { class: 'play__popup', role: 'toolbar', hidden: true }, [
        els.popupPad, h('div', { class: 'play__popup-tools' }, [els.popupNotes, els.popupErase, els.popupClose])
      ]);
      bindText(els.popup, 'play.popup.label', 'aria-label');
      const frame = doc.querySelector('.board-frame');
      if (frame !== null) frame.appendChild(els.popup);
      placeStatus();
      return true;
    }

    /** Where the status box lives: the top of the side panel on a wide screen; on a small screen the Play / Pause / Reset buttons join Share / Import above the puzzle and the box follows on the next line. */
    function placeStatus() {
      if (els.status === undefined) return;
      const actions = doc.querySelector('.main-actions');
      const head = actions !== null ? actions.parentNode : null;
      if (isSmallScreen() && actions !== null && head !== null) {
        if (els.controls.parentNode !== actions) actions.insertBefore(els.controls, actions.firstChild);
        if (els.status.parentNode !== head) head.insertBefore(els.status, actions.nextSibling);
      } else {
        if (els.controls.parentNode !== els.statusRow) els.statusRow.insertBefore(els.controls, els.statusRow.firstChild);
        if (els.status.parentNode !== els.statusHost) els.statusHost.appendChild(els.status);
      }
    }

    /** The actions on the puzzle, in the play frame once expanded: fill in all notes, reveal a cell, reveal the solution. (Starting over is the Reset button of the status box.) */
    function makeActions() {
      const button = function (key, iconName, onClick) {
        const label = h('span', { 'data-i18n': key });
        label.textContent = tr(key);
        const node = h('button', { type: 'button', class: 'btn btn--secondary btn--sm' }, [icon(iconName), label]);
        node.label = label;
        node.addEventListener('click', onClick);
        return node;
      };
      els.actions = {
        fill: button('play.options.fillNotes', 'fillNotes', fillNotes),
        cell: button('play.options.revealCell', 'reveal', askRevealCell)
      };
      refreshActions();
      return h('div', { class: 'play__actions play__option-buttons', 'data-setting': 'puzzle' },
        [els.actions.fill, els.actions.cell]);
    }

    function setMore(open) {
      moreOpen = open === true;
      if (!moreOpen) disarmReveal();
      els.moreBody.hidden = !moreOpen;
      els.moreToggle.setAttribute('aria-expanded', moreOpen ? 'true' : 'false');
      els.moreLabel.setAttribute('data-i18n', moreOpen ? 'play.more.hide' : 'play.more.show');
      els.moreLabel.textContent = tr(moreOpen ? 'play.more.hide' : 'play.more.show');
      els.moreIcon.firstChild.setAttribute('href', moreOpen ? '#ic-chevron-up' : '#ic-chevron-down');
      syncKeysHeight();
    }

    function refreshActions() {
      const set = els.actions;
      if (set === undefined) return;
      const editable = canEdit();
      [set.fill, set.cell].forEach(function (node) { node.disabled = !editable; });
      const key = revealTimer === null ? 'play.options.revealCell' : 'play.options.revealCell.confirm';
      set.cell.label.setAttribute('data-i18n', key);
      set.cell.label.textContent = tr(key);
      set.cell.classList.toggle('is-armed', revealTimer !== null);
    }

    function refreshSymbolControl() {
      const modes = SG.symbols.modesFor(SG.modelAids.symbolModes(game.model));
      els.symbolsRow.hidden = modes.length < 2;
      els.symbolsList.textContent = '';
      modes.forEach(function (mode) {
        const input = h('input', { type: 'radio', name: 'play-symbols', value: mode });
        input.addEventListener('change', function () { if (input.checked) setSymbolMode(mode); });
        const text = h('span');
        text.textContent = tr('symbolMode.' + mode);
        els.symbolsList.appendChild(h('label', { class: 'checkbox' }, [input, text]));
      });
      syncSymbolControl();
    }

    function syncSymbolControl() {
      Array.prototype.forEach.call(els.symbolsList.querySelectorAll('input'), function (input) {
        input.checked = input.value === currentMode();
      });
    }

    function renderLegend() {
      if (els.legend === null) return;
      const mode = currentMode();
      const wanted = active && (mode === 'colors' || mode === 'shapes');
      els.legend.hidden = !wanted;
      els.legend.textContent = '';
      if (wanted) SG.symbols.renderLegend(els.legend, mode, game.model, { colorAuxSymbol: auxOn() });
    }

    function setSymbolMode(mode) {
      if (!active || SG.symbols.modesFor(SG.modelAids.symbolModes(game.model)).indexOf(mode) === -1) return false;
      if (mode !== currentMode()) {
        board.setSymbolMode(mode);
        reader = createKeyReader(typedLabels(game.model, mode));
        app.emit('play:change', { type: 'symbols', mode: mode });
      }
      syncSymbolControl();
      renderLegend();
      refreshAll();
      return true;
    }

    function glyphOf(v) {
      return SG.symbols.glyph(currentMode(), v, game.model, { colorAuxSymbol: auxOn(), label: false });
    }

    function lenClass(text) {
      return text.length >= 3 ? ' pl-val--l3' : text.length === 2 ? ' pl-val--l2' : '';
    }

    function buildLayer() {
      const n = game.cellCount;
      const g = s('g', { class: 'layer-play', 'data-layer': 'play', 'aria-hidden': 'true' });
      g.setAttribute('style', 'font-size:' + geo.value.font + 'px');
      const cells = new Array(n);
      for (let i = 0; i < n; i++) {
        const cellGroup = s('g', { class: 'pl-cell', 'data-pc': i });
        const size = CELL_UNITS - 3;
        const rect = { x: geo.cellX[i] + 1.5, y: geo.cellY[i] + 1.5, width: size, height: size };
        cellGroup.appendChild(s('rect', Object.assign({ class: 'pl-bg' }, rect)));
        cellGroup.appendChild(s('rect', Object.assign({ class: 'pl-hint' }, rect)));
        g.appendChild(cellGroup);
        cells[i] = { g: cellGroup, content: null };
      }
      svg.appendChild(g);
      const labels = typedLabels(game.model, currentMode());
      const longest = labels.reduce(function (m, text) { return Math.max(m, text.length); }, 1);
      layer = { g: g, cells: cells, shown: new Array(n).fill(''), cls: new Array(n).fill(''),
        sig: currentMode() + '|' + auxOn(), longest: longest };
    }

    function ensureLayer() {
      if (layer !== null && layer.g.parentNode === svg) {
        const sig = currentMode() + '|' + auxOn();
        if (layer.sig === sig) return;
        layer.sig = sig;
        layer.shown.fill('');
        return;
      }
      buildLayer();
    }

    function removeLayer() {
      if (layer !== null && layer.g.parentNode !== null) layer.g.parentNode.removeChild(layer.g);
      layer = null;
    }

    function drawValue(parent, i, v) {
      const g = glyphOf(v);
      const x = geo.cellX[i];
      const y = geo.cellY[i];
      const cx = x + CELL_UNITS / 2;
      const cy = y + CELL_UNITS / 2 + geo.value.shiftY;
      if (g.colorIndex !== null) {
        parent.appendChild(s('rect', { class: 'pl-fill cell--c' + (g.colorIndex + 1), x: x + 1.2, y: y + 1.2,
          width: CELL_UNITS - 2.4, height: CELL_UNITS - 2.4 }));
      }
      if (g.shape !== null) {
        parent.appendChild(s('path', { class: g.colorIndex !== null ? 'sym sym--aux' : 'sym sym--placed',
          'fill-rule': 'evenodd', d: SG.symbols.shapePath(g.shape, cx, cy) }));
      }
      if (g.text !== null) {
        const label = s('text', { class: 'pl-val' + lenClass(g.text), x: cx, y: cy, dy: '0.35em',
          'text-anchor': 'middle' });
        label.textContent = g.text;
        parent.appendChild(label);
      }
    }

    function drawNotes(parent, i, mask, elim) {
      const lay = noteLayout(game.digits);
      const top = game.model.cages.length > 0 ? NOTE_TOP_CAGE : NOTE_MARGIN;
      const slotW = (CELL_UNITS - 2 * NOTE_MARGIN) / lay.cols;
      const slotH = (CELL_UNITS - top - NOTE_MARGIN) / lay.rows;
      const font = Math.min(slotH * 0.86, slotW / (layer.longest * 0.62), 11);
      for (let d = 1; d <= game.digits; d++) {
        if ((mask & bitOf(d)) === 0) continue;
        const cx = geo.cellX[i] + NOTE_MARGIN + (((d - 1) % lay.cols) + 0.5) * slotW;
        const cy = geo.cellY[i] + top + (Math.floor((d - 1) / lay.cols) + 0.5) * slotH;
        const g = glyphOf(d);
        const cls = 'pl-note' + ((elim & bitOf(d)) !== 0 ? ' is-elim' : '');
        if (g.text !== null) {
          const label = s('text', { class: cls, x: cx, y: cy, dy: '0.35em', 'text-anchor': 'middle',
            'font-size': Math.round(font * 10) / 10 });
          label.textContent = g.text;
          parent.appendChild(label);
        } else if (g.colorIndex !== null) {
          const side = Math.min(slotW, slotH) * 0.72;
          const marked = (elim & bitOf(d)) !== 0 ? ' is-elim' : '';
          parent.appendChild(s('rect', { class: 'pl-note-fill cell--c' + (g.colorIndex + 1) + marked,
            x: cx - side / 2, y: cy - side / 2, width: side, height: side }));
        } else if (g.shape !== null) {
          parent.appendChild(s('path', { class: cls + ' pl-note-sym', 'fill-rule': 'evenodd',
            d: SG.symbols.shapePath(g.shape, cx, cy, Math.min(slotW, slotH) * 0.4) }));
        }
      }
    }

    function elimMasks() {
      const out = new Map();
      if (hint !== null && hint.ok === true && hint.level >= 3) {
        hint.eliminations.forEach(function (e) { out.set(e[0], (out.get(e[0]) || 0) | bitOf(e[1])); });
      }
      return out;
    }

    function describeEntry(i, v, mask) {
      const el = board !== null ? board.getCellElement(i) : null;
      if (el === null) return;
      let text = '';
      // The grid labels (a11y.js) read the entry from here: the value layer of the board only has the clues.
      if (v > 0) el.setAttribute('data-user', valueText(game.model, v, currentMode()));
      else el.removeAttribute('data-user');
      if (v === 0 && mask !== 0) {
        const names = [];
        for (let d = 1; d <= game.digits; d++) {
          if ((mask & bitOf(d)) !== 0) names.push(valueText(game.model, d, currentMode()));
        }
        text = tr('play.cell.notes', { symbols: names.join(', ') });
      }
      if (text === '') el.removeAttribute('aria-description');
      else el.setAttribute('aria-description', text);
    }

    function clearDescriptions() {
      if (board === null || game === null) return;
      for (let i = 0; i < game.cellCount; i++) {
        const el = board.getCellElement(i);
        if (el === null) continue;
        el.removeAttribute('aria-description');
        el.removeAttribute('data-user');
      }
    }

    function renderCells() {
      const fresh = board.getGeometry();
      if (fresh !== geo) {
        geo = fresh;
        removeLayer();
      }
      ensureLayer();
      const elim = elimMasks();
      for (let i = 0; i < game.cellCount; i++) {
        const v = game.userValue(i);
        const mask = v === 0 ? game.getNotes(i) : 0;
        const bad = v === 0 && elim.has(i) ? elim.get(i) & mask : 0;
        const key = v + ':' + mask + ':' + bad;
        if (layer.shown[i] === key) continue;
        layer.shown[i] = key;
        describeEntry(i, v, mask);
        const c = layer.cells[i];
        if (c.content !== null) c.content.textContent = '';
        if (v === 0 && mask === 0) continue;
        if (c.content === null) {
          c.content = s('g', { class: 'pl-content' });
          c.g.appendChild(c.content);
        }
        if (v > 0) drawValue(c.content, i, v);
        else drawNotes(c.content, i, mask, bad);
      }
    }

    function currentMarks() {
      const n = game.cellCount;
      const out = { conflict: new Uint8Array(n), wrong: new Uint8Array(n) };
      if (pref('check') !== 'off') game.conflicts().cells.forEach(function (c) { out.conflict[c] = 1; });
      if (pref('check') === 'live') game.wrongCells().forEach(function (c) { out.wrong[c] = 1; });
      if (marks !== null) {
        marks.conflicts.forEach(function (c) { out.conflict[c] = 1; });
        marks.wrong.forEach(function (c) { out.wrong[c] = 1; });
      }
      return out;
    }

    function refreshMarks() {
      if (!active || layer === null) return;
      ensureLayer();
      const n = game.cellCount;
      const shown = currentMarks();
      const near = new Uint8Array(n);
      if (sel >= 0) {
        const peers = game.model.peers[sel];
        for (let k = 0; k < peers.length; k++) near[peers[k]] = 1;
      }
      const selValue = sel >= 0 ? game.getValue(sel) : 0;
      const inRegion = new Set(hint !== null && hint.ok === true && hint.region ? hint.region.cells : []);
      const inCells = new Set(hint !== null && hint.ok === true && hint.level >= 2 ? hint.cells : []);
      const inTargets = new Set(hint !== null && hint.ok === true && hint.level >= 3 ? hint.targets : []);
      for (let i = 0; i < n; i++) {
        let cls = 'pl-cell';
        if (i === sel) cls += ' is-sel';
        else if (near[i] === 1) cls += ' is-peer';
        if (selValue > 0 && i !== sel && game.getValue(i) === selValue) cls += ' is-same';
        if (shown.conflict[i] === 1) cls += ' is-conflict';
        if (shown.wrong[i] === 1) cls += ' is-wrong';
        if (inRegion.has(i)) cls += ' is-hint-region';
        if (inCells.has(i)) cls += ' is-hint-cell';
        if (inTargets.has(i)) cls += ' is-hint-target';
        if (layer.cls[i] !== cls) {
          layer.cls[i] = cls;
          layer.cells[i].g.setAttribute('class', cls);
        }
      }
    }

    function setPausedLook() {
      if (layer !== null) layer.g.classList.toggle('is-paused', game.timerState().pausedBy === 'user');
    }

    function canEdit() {
      if (!active || game === null) return false;
      const status = game.status();
      return status !== 'solved' && status !== 'gaveUp' && game.timerState().pausedBy !== 'user';
    }

    function updateClock() {
      if (game === null) return;
      els.clock.textContent = clockText(game.elapsedMs());
    }

    function startClock() {
      if (clockTimer === null) clockTimer = root.setInterval(updateClock, CLOCK_MS);
      updateClock();
    }

    function stopClock() {
      if (clockTimer !== null) root.clearInterval(clockTimer);
      clockTimer = null;
    }

    function refreshPad() {
      const model = game.model;
      const sig = [model.variantId, game.digits, currentMode(), auxOn(), SG.i18n.current].join('|');
      if (sig !== padSig) {
        padSig = sig;
        const wide = padLayout(game.digits, WIDE_PAD_COLS);
        els.pad.style.setProperty('--play-pad-cols', String(wide.cols));
        // The bar fixed to the bottom of a small screen keeps the pad on one row (two for more than 9 symbols).
        els.pad.style.setProperty('--play-pad-cols-mobile',
          String(game.digits <= 9 ? game.digits : Math.ceil(game.digits / 2)));
        els.popupPad.style.setProperty('--play-pad-cols', String(padLayout(game.digits,
          game.digits > 9 ? POPUP_COLS_BIG : POPUP_COLS).cols));
        [[els.pad, 'play__key'], [els.popupPad, 'play__pkey']].forEach(function (pair) {
          pair[0].textContent = '';
          for (let v = 1; v <= game.digits; v++) {
            const g = SG.symbols.glyph(currentMode(), v, model, { colorAuxSymbol: auxOn() });
            const key = h('button', { type: 'button', class: pair[1], 'data-v': v, 'data-name': g.label });
            if (g.text !== null) key.textContent = g.text;
            else key.innerHTML = SG.symbols.swatchMarkup(g);
            key.addEventListener('click', function () { enterValue(v, false); });
            pair[0].appendChild(key);
          }
        });
      }
      const editable = canEdit();
      const filled = sel >= 0 ? game.userValue(sel) : 0;
      const noteMask = sel >= 0 ? game.getNotes(sel) : 0;
      [els.pad, els.popupPad].forEach(function (pad) {
        Array.prototype.forEach.call(pad.children, function (key) {
          const v = Number(key.getAttribute('data-v'));
          key.disabled = !editable;
          key.setAttribute('aria-label', tr(notesMode ? 'play.pad.note' : 'play.pad.value',
            { symbol: key.getAttribute('data-name') }));
          const pressed = notesMode ? (noteMask & bitOf(v)) !== 0 : filled === v;
          key.setAttribute('aria-pressed', pressed ? 'true' : 'false');
        });
        pad.classList.toggle('is-notes', notesMode);
      });
    }

    function isSmallScreen() {
      return typeof root.matchMedia === 'function' && root.matchMedia(SMALL_SCREEN).matches;
    }

    function syncKeysHeight() {
      if (els.keys === undefined || root.document === undefined) return;
      const fixed = active && root.getComputedStyle(els.keys).position === 'fixed';
      root.document.documentElement.style.setProperty('--play-keys-height',
        fixed ? els.keys.offsetHeight + 'px' : '0px');
    }

    /** The popup with the pad keys, Notes, Erase and Close next to the clicked cell; it follows the selected cell until closed and is not shown for a given, paused or solved game. */
    function renderPopup() {
      if (els.popup === undefined || els.popup.parentNode === null) return;
      const wanted = popupOpen && active && sel >= 0 && canEdit() && !game.isGiven(sel) && !isSmallScreen();
      const cellEl = wanted && board !== null ? board.getCellElement(sel) : null;
      if (cellEl === null) {
        els.popup.hidden = true;
        return;
      }
      els.popup.hidden = false;
      const frame = els.popup.parentNode.getBoundingClientRect();
      const cell = cellEl.getBoundingClientRect();
      const width = els.popup.offsetWidth;
      const height = els.popup.offsetHeight;
      const gap = 6;
      let left = cell.left - frame.left + cell.width / 2 - width / 2;
      left = Math.max(gap, Math.min(left, frame.width - width - gap));
      // Below the cell when it fits, else above it, else pinned to the nearest edge.
      let top = cell.bottom - frame.top + gap;
      if (top + height > frame.height - gap) top = cell.top - frame.top - height - gap;
      top = Math.max(gap, Math.min(top, frame.height - height - gap));
      els.popup.style.left = Math.round(left) + 'px';
      els.popup.style.top = Math.round(top) + 'px';
    }

    function closePopup() {
      popupOpen = false;
      renderPopup();
    }

    function refreshTools() {
      const editable = canEdit();
      els.notes.disabled = !editable;
      els.notes.setAttribute('aria-pressed', notesMode ? 'true' : 'false');
      els.popupNotes.disabled = !editable;
      els.popupNotes.setAttribute('aria-pressed', notesMode ? 'true' : 'false');
      els.popupErase.disabled = !editable;
      els.erase.disabled = !editable;
      els.undo.disabled = !active || !game.canUndo() || game.timerState().pausedBy === 'user';
      els.redo.disabled = !active || !game.canRedo() || game.timerState().pausedBy === 'user';
      els.hint.disabled = !editable;
      els.check.disabled = !editable;
      refreshActions();
    }

    function refreshStatus() {
      const p = game.progress();
      els.progress.textContent = tr('play.progress', { filled: p.filled + p.givens, total: game.cellCount });
      const state = game.timerState();
      const idle = game.status() === 'idle';
      const paused = state.pausedBy === 'user';
      const finished = game.isSolved();
      // Play before the first move, Pause while the clock runs, Resume after a pause. Reset only while the
      // game is paused (so that it is not pressed by mistake in the middle of a game) or when it is solved
      // (to play it again).
      els.pause.hidden = finished;
      els.pause.setAttribute('aria-pressed', paused ? 'true' : 'false');
      els.pause.setAttribute('data-state', idle ? 'play' : paused ? 'resume' : 'pause');
      els.pauseLabel.textContent = tr(idle ? 'play.timer.play' : paused ? 'play.timer.resume' : 'play.timer.pause');
      els.pause.setAttribute('title', els.pauseLabel.textContent);
      els.pause.firstChild.firstChild.setAttribute('href', idle || paused ? '#ic-play' : '#ic-pause');
      const armed = resetTimer !== null;
      const resetLabel = tr(armed ? 'play.options.reset.confirm' : 'play.options.reset');
      els.reset.hidden = !paused && !finished;
      els.reset.classList.toggle('is-armed', armed);
      els.reset.setAttribute('aria-label', resetLabel);
      els.reset.setAttribute('title', resetLabel);
      els.resetLabel.textContent = tr(armed ? 'play.timer.reset.confirm' : 'play.timer.reset');
      refreshActions();
      updateClock();
    }

    function say(kind, build, quiet) {
      if (build === null || quiet === true || typeof app.announce !== 'function') return;
      app.announce(build());
    }

    function refreshAll() {
      if (!active) return;
      renderCells();
      refreshMarks();
      refreshPad();
      refreshTools();
      refreshStatus();
      setPausedLook();
      syncWordLine();
      renderPopup();
      syncKeysHeight();
    }

    function focusBoard() {
      if (svg === null) return;
      const roving = sel >= 0 && board !== null ? board.getCellElement(sel) : null;
      const target = roving !== null && roving.hasAttribute('tabindex') ? roving : svg;
      if (typeof target.focus === 'function' && target.hasAttribute('tabindex')) {
        target.focus({ preventScroll: true });
      }
    }

    function select(cell, focus) {
      const next = game !== null && Number.isInteger(cell) && cell >= 0 && cell < game.cellCount ? cell : -1;
      if (next !== sel) {
        sel = next;
        disarmReveal();
        if (reader !== null) reader.reset();
        refreshMarks();
        refreshPad();
        renderPopup();
      }
      if (focus === true) focusBoard();
    }

    function firstEditable() {
      for (let i = 0; i < game.cellCount; i++) if (!game.isGiven(i) && game.userValue(i) === 0) return i;
      return -1;
    }

    function pointToCell(clientX, clientY) {
      const ctm = typeof svg.getScreenCTM === 'function' ? svg.getScreenCTM() : null;
      if (ctm === null || typeof svg.createSVGPoint !== 'function') return -1;
      const point = svg.createSVGPoint();
      point.x = clientX;
      point.y = clientY;
      const at = point.matrixTransform(ctm.inverse());
      return cellAtPoint(geo, at.x, at.y);
    }

    function onBoardClick(ev) {
      if (!active || (typeof ev.button === 'number' && ev.button !== 0)) return;
      if (ev.detail === 0 && ev.clientX === 0 && ev.clientY === 0) return;
      const cell = pointToCell(ev.clientX, ev.clientY);
      if (cell >= 0) {
        select(cell, true);
        // A click or tap on a cell opens the popup for it (a keyboard move only moves an open one). A small
        // screen has the keys fixed to the bottom instead, so it gets no popup.
        popupOpen = !isSmallScreen();
        renderPopup();
      }
    }

    function onFocusIn(ev) {
      const target = ev.target;
      if (!active || !target || typeof target.getAttribute !== 'function' || target === svg) return;
      if (svg === null || !svg.contains(target)) return;
      const value = target.getAttribute('data-cell');
      if (value !== null && value !== '') select(Number(value), false);
    }

    function requireCell() {
      if (sel >= 0) return true;
      say('info', function () { return tr('play.msg.select'); });
      return false;
    }

    function enterValue(v, continued) {
      if (!canEdit() || !requireCell()) return;
      const cell = sel;
      if (game.isGiven(cell)) {
        say('warning', function () { return tr('play.msg.given', { cell: labelOf(cell) }); });
        return;
      }
      if (notesMode) {
        if (game.userValue(cell) > 0) {
          say('warning', function () { return tr('play.msg.notesFilled', { cell: labelOf(cell) }); });
          return;
        }
        game.toggleNote(cell, v);
        return;
      }
      if (game.userValue(cell) === v && !continued) {
        game.clearValue(cell);
        return;
      }
      game.setValue(cell, v, { amend: continued });
    }

    function eraseCell() {
      if (!canEdit() || !requireCell()) return;
      if (game.isGiven(sel)) {
        const cell = sel;
        say('warning', function () { return tr('play.msg.given', { cell: labelOf(cell) }); });
        return;
      }
      game.erase(sel);
    }

    function undo() {
      if (active && game.timerState().pausedBy !== 'user') game.undo();
    }

    function redo() {
      if (active && game.timerState().pausedBy !== 'user') game.redo();
    }

    function toggleNotes() {
      if (!canEdit()) return;
      notesMode = !notesMode;
      refreshPad();
      refreshTools();
    }

    function fillNotes() {
      if (!canEdit()) return;
      if (game.fillNotes()) say('info', function () { return tr('play.msg.notesFilledAll'); });
    }

    function checkEntries() {
      if (!canEdit()) return;
      const res = game.check();
      marks = { wrong: new Set(res.wrong), conflicts: new Set(res.conflicts) };
      if (res.filled === 0) {
        say('info', function () { return tr('play.check.empty'); });
      } else if (res.ok) {
        say('success', function () { return tr('play.check.ok'); });
      } else {
        say('danger', function () {
          const parts = [];
          if (res.wrong.length > 0) parts.push(tr('play.check.wrong', { count: res.wrong.length }));
          if (res.conflicts.length > 0) {
            parts.push(tr('play.check.conflicts', { count: res.conflicts.length }));
          }
          return parts.join(' ');
        });
      }
      refreshMarks();
    }

    function revealCell() {
      if (!canEdit()) return;
      const shown = game.revealCell(sel >= 0 ? sel : undefined);
      if (shown === null) return;
      select(shown.cell, false);
      say('info', function () {
        return tr('play.msg.revealed', {
          cell: labelOf(shown.cell), symbol: valueText(game.model, shown.value, currentMode())
        });
      });
    }

    function askRevealCell() {
      if (!canEdit()) return;
      if (revealTimer === null) {
        revealTimer = root.setTimeout(function () {
          revealTimer = null;
          if (active) refreshActions();
        }, RESET_ARM_MS);
        refreshActions();
        return;
      }
      disarmReveal();
      revealCell();
    }

    function disarmReveal() {
      if (revealTimer === null) return;
      root.clearTimeout(revealTimer);
      revealTimer = null;
      refreshActions();
    }

    function resetGame() {
      if (!active) return;
      if (resetTimer === null) {
        resetTimer = root.setTimeout(function () {
          resetTimer = null;
          if (active) refreshStatus();
        }, RESET_ARM_MS);
        refreshStatus();
        return;
      }
      root.clearTimeout(resetTimer);
      resetTimer = null;
      game.reset();
      marks = null;
      hint = null;
      notesMode = false;
      say('info', function () { return tr('play.msg.reset'); });
    }

    function togglePause() {
      if (!active) return;
      if (game.status() === 'idle') {
        game.startTimer();
        say('info', null);
      } else if (game.timerState().pausedBy === 'user') {
        if (resetTimer !== null) {
          root.clearTimeout(resetTimer);
          resetTimer = null;
        }
        game.resumeTimer('user');
        say('info', null);
      } else if (game.pauseTimer('user')) {
        say('info', function () { return tr('play.timer.paused'); });
      }
    }

    /** Pauses a running game for good (the user has to resume it): leaving it for another puzzle. */
    function pauseGame() {
      if (!active || game === null || game.isSolved()) return false;
      game.resumeTimer('auto');
      return game.pauseTimer('user');
    }

    function show(el, visible) {
      el.hidden = !visible;
    }

    function renderHint() {
      const card = els.hintCard;
      if (hint === null) {
        card.root.hidden = true;
        return;
      }
      card.root.hidden = false;
      const d = describeHint(game.model, hint, { mode: currentMode() });
      const ok = d.ok === true;
      const level = ok ? hint.level : 3;
      card.title.textContent = ok ? d.title : tr('play.tool.hint');
      card.desc.textContent = ok ? d.description : d.text;
      show(card.desc, card.desc.textContent !== '');
      card.region.textContent = ok ? d.region : '';
      show(card.region, ok);
      card.cells.textContent = ok ? d.cells : '';
      show(card.cells, ok && level >= 2);
      card.action.textContent = ok ? d.action : '';
      show(card.action, ok && level >= 3);
      card.explain.textContent = ok ? d.explanation : '';
      show(card.explain, ok && level >= 3);
      if (ok) {
        card.note.textContent = d.ignored;
      } else {
        card.note.textContent = hint.ignored > 0 ? tr('play.hint.ignored', { count: hint.ignored }) : '';
      }
      show(card.note, card.note.textContent !== '');
      show(card.more, ok && hint.level < 3);
      show(card.apply, ok && hint.level >= 3);
      if (ok) {
        card.apply.textContent = tr(hint.kind === 'placement' ? 'play.hint.apply.place'
          : 'play.hint.apply.eliminate');
      }
      show(card.reveal, !ok && hint.reason === 'stuck');
    }

    function afterHintChange() {
      renderHint();
      renderCells();
      refreshMarks();
    }

    function showHint() {
      if (!canEdit()) return;
      hint = game.hint();
      afterHintChange();
    }

    function applyHint() {
      if (!canEdit() || hint === null || hint.ok !== true) return;
      const placed = hint.kind === 'placement' ? hint.targets[0] : -1;
      game.applyHint();
      hint = null;
      if (placed >= 0) select(placed, false);
      afterHintChange();
    }

    function closeHint() {
      game.clearHint();
      hint = null;
      afterHintChange();
    }

    function wordEntries(info) {
      if (!info || !SG.wordbook) return [];
      return SG.wordbook.lookup(info.word, SG.i18n.current);
    }

    const POS_KEYS = Object.freeze({
      n: 'play.word.pos.n', v: 'play.word.pos.v', a: 'play.word.pos.a', d: 'play.word.pos.d', o: 'play.word.pos.o'
    });

    function posText(entry) {
      return tr(POS_KEYS[entry.pos] || POS_KEYS.o);
    }

    function renderWordCard(visible) {
      if (els.wordCard === undefined) return;
      const info = visible && active ? SG.modelAids.describeWord(game.model) : null;
      const entry = wordEntries(info)[0];
      els.wordCard.hidden = entry === undefined;
      if (entry === undefined) return;
      els.wordText.textContent = entry.text + ' (' + posText(entry) + ')';
      els.wordText.setAttribute('lang', entry.language);
      els.wordMeaning.textContent = entry.meaning;
      els.wordOther.textContent = entry.other;
      els.wordOther.hidden = entry.other === '';
    }

    function syncWordLine() {
      if (board === null || !SG.modelAids) return;
      if (!active || SG.modelAids.describeWord(game.model) === null) return;
      const reveal = game.isSolved();
      if (reveal === !wordHidden) return;
      wordHidden = !reveal;
      board.setLayerVisible('word', reveal);
      renderWordCard(reveal);
    }

    function wordSentence(info) {
      const entry = wordEntries(info)[0];
      if (entry === undefined) return tr('play.success.word', { word: info.word });
      return tr('play.success.wordMeaning', { word: entry.text, meaning: entry.meaning });
    }

    function onSolved() {
      stopClock();
      updateClock();
      const status = game.status();
      if (status === 'gaveUp') {
        say('info', function () { return tr('play.msg.revealedAll'); });
        return;
      }
      const time = clockText(game.elapsedMs());
      const counters = game.counters();
      const info = SG.modelAids.describeWord(game.model);
      say('success', function () {
        let text = tr('play.success', { time: clockText(game.elapsedMs()) });
        if (counters.hints > 0) text += ' ' + tr('play.success.hints', { count: counters.hints });
        if (counters.reveals > 0) text += ' ' + tr('play.success.revealed', { count: counters.reveals });
        if (info) text += ' ' + wordSentence(info);
        return text;
      });
      if (board !== null && typeof board.pulseDone === 'function') board.pulseDone();
      if (typeof app.toast === 'function') app.toast('success', 'play.success.toast', { time: time });
    }

    function showFinished() {
      const status = game.status();
      renderWordCard(SG.modelAids.describeWord(game.model) !== null);
      if (status === 'gaveUp') {
        say('info', function () { return tr('play.msg.revealedAll'); }, true);
        return;
      }
      const info = SG.modelAids.describeWord(game.model);
      say('success', function () {
        let text = tr('play.success', { time: clockText(game.elapsedMs()) });
        if (info) text += ' ' + wordSentence(info);
        return text;
      }, true);
    }

    function onGameChange(info) {
      if (!active) return;
      if (info.type === 'timer') {
        if (game.timerState().running) startClock();
        else stopClock();
        refreshAll();
        app.emit('play:change', info);
        return;
      }
      if (info.values && marks !== null) marks = null;
      if (info.type === 'undo' || info.type === 'redo' || info.type === 'reset' || info.type === 'set' ||
          info.type === 'erase') {
        say('info', null);
      }
      if (info.values && hint !== null) {
        hint = null;
        game.clearHint();
        renderHint();
      }
      if ((info.type === 'set' || info.type === 'erase') && info.cells.length > 0 &&
          typeof app.announce === 'function') {
        const cell = info.cells[0];
        const value = game.userValue(cell);
        app.announce(value > 0
          ? tr('play.msg.set', { cell: labelOf(cell), symbol: valueText(game.model, value, currentMode()) })
          : tr('play.msg.cleared', { cell: labelOf(cell) }));
      }
      refreshAll();
      if (info.type === 'solved') onSolved();
      else if (!game.isSolved() && game.timerState().running) startClock();
      app.emit('play:change', info);
    }

    function isButton(el) {
      return el && (el.tagName === 'BUTTON' || el.tagName === 'A');
    }

    function keyTargetOk(target) {
      if (doc.querySelector('dialog[open], #modal-root .modal') !== null) return false;
      if (!target || target === doc.body || target === doc.documentElement) return true;
      if (svg !== null && svg.contains(target)) return true;
      if (els.root.contains(target)) {
        return ['INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY', 'OPTION'].indexOf(target.tagName) === -1;
      }
      return false;
    }

    function moveBy(delta) {
      if (sel < 0) {
        select(firstEditable() >= 0 ? firstEditable() : 0, true);
        return;
      }
      select(moveSelection(geo, sel, delta[0], delta[1]), true);
    }

    function hotkeyFree(letter) {
      if (reader === null) return true;
      return reader.labels.every(function (label) { return String(label).toLowerCase() !== letter; });
    }

    function onKeyDown(ev) {
      if (!active || ev.defaultPrevented || ev.isComposing || !keyTargetOk(ev.target)) return;
      const key = ev.key;
      if (typeof key !== 'string') return;
      if ((ev.ctrlKey || ev.metaKey) && !ev.altKey) {
        const lower = key.toLowerCase();
        if (lower === 'z') {
          ev.preventDefault();
          if (ev.shiftKey) redo();
          else undo();
        } else if (lower === 'y') {
          ev.preventDefault();
          redo();
        }
        return;
      }
      if (ev.altKey || key === 'Tab') return;
      const bare = ev.target === doc.body || ev.target === doc.documentElement || !ev.target;
      if (isButton(ev.target) && (key === 'Enter' || key === ' ')) return;
      if (Object.prototype.hasOwnProperty.call(ARROWS, key)) {
        if (bare) return;
        ev.preventDefault();
        moveBy(ARROWS[key]);
        return;
      }
      if (key === 'Escape') {
        if (hint !== null) {
          ev.preventDefault();
          closeHint();
        } else if (popupOpen) {
          ev.preventDefault();
          closePopup();
        }
        return;
      }
      if (!canEdit()) return;
      if (key === 'Backspace' || key === 'Delete' || (key === ' ' && !bare)) {
        ev.preventDefault();
        eraseCell();
        return;
      }
      if (key.length !== 1) return;
      const read = reader.feed(key, Date.now());
      if (read !== null) {
        ev.preventDefault();
        if (read.value !== null) enterValue(read.value, read.continued);
        return;
      }
      const lower = key.toLowerCase();
      if ((lower === 'n' && hotkeyFree('n')) || key === '`') {
        ev.preventDefault();
        toggleNotes();
      } else if (lower === 'h' && hotkeyFree('h')) {
        ev.preventDefault();
        showHint();
      }
    }

    function onVisibility() {
      if (!active || game === null) return;
      if (doc.visibilityState === 'hidden') pauseAuto();
      else resumeAuto();
    }

    function pauseAuto() {
      if (active && game !== null && game.pauseTimer('auto')) stopClock();
    }

    function resumeAuto() {
      if (active && game !== null && game.resumeTimer('auto')) startClock();
    }

    function listen(target, type, fn) {
      target.addEventListener(type, fn);
      subscriptions.push(function () { target.removeEventListener(type, fn); });
    }

    function makeGame(state) {
      const options = { autoNotes: pref('autoNotes') !== false };
      if (state !== undefined && state !== null) {
        try {
          return restoreGame(puzzle.model, puzzle.givens, puzzle.solution, state, options);
        } catch (err) {
          // A saved game that does not fit (damaged, other version): start a fresh one.
        }
      }
      return createGame(puzzle.model, puzzle.givens, puzzle.solution, options);
    }

    function attach(next, options) {
      const opt = options || {};
      const view = typeof app.getBoard === 'function' ? app.getBoard() : null;
      if (!next || !next.model || view === null || els.root === undefined) return null;
      if (active) detach();
      board = view;
      svg = board.svg || doc.getElementById('board-svg');
      puzzle = next;
      geo = board.getGeometry();
      game = makeGame(opt.state);
      const modes = SG.symbols.modesFor(SG.modelAids.symbolModes(game.model));
      const wanted = opt.symbolMode || puzzle.symbolMode;
      board.setSymbolMode(modes.indexOf(wanted) !== -1 ? wanted : modes[0]);
      board.setValues(puzzle.givens);
      board.setGivens(puzzle.givens);
      board.clearHighlights();
      reader = createKeyReader(typedLabels(game.model, currentMode()));
      active = true;
      unsubscribeGame = game.subscribe(onGameChange);
      svg.classList.add('play-on');
      listen(svg, 'click', onBoardClick);
      // On the document, not on the svg: Blink makes an SVG element with a focus listener focusable, which
      // would add the whole board to the tab order in front of its roving cell.
      listen(doc, 'focusin', onFocusIn);
      listen(doc, 'keydown', onKeyDown);
      listen(doc, 'visibilitychange', onVisibility);
      listen(root, 'blur', pauseAuto);
      listen(root, 'focus', resumeAuto);
      listen(root, 'resize', function () { renderPopup(); syncKeysHeight(); });
      popupOpen = false;
      setMore(false);
      wordHidden = false;
      renderWordCard(false);
      notesMode = false;
      marks = null;
      hint = null;
      els.root.setAttribute('data-active', 'true');
      els.panel.hidden = false;
      els.optionsBox.hidden = false;
      els.status.hidden = false;
      sel = firstEditable();
      layer = null;
      padSig = '';
      refreshSymbolControl();
      renderLegend();
      renderHint();
      game.resumeTimer('auto');
      refreshAll();
      if (game.timerState().running) startClock();
      updateClock();
      if (game.isSolved()) showFinished();
      if (opt.focus === true) focusBoard();
      app.emit('play:game', { game: game, puzzle: puzzle });
      return game;
    }

    function detach() {
      if (!active) return false;
      active = false;
      stopClock();
      game.pauseTimer('auto');
      if (unsubscribeGame !== null) unsubscribeGame();
      unsubscribeGame = null;
      subscriptions.splice(0).forEach(function (off) { off(); });
      if (resetTimer !== null) root.clearTimeout(resetTimer);
      resetTimer = null;
      if (revealTimer !== null) root.clearTimeout(revealTimer);
      revealTimer = null;
      hint = null;
      game.clearHint();
      renderHint();
      notesMode = false;
      clearDescriptions();
      removeLayer();
      if (svg !== null) svg.classList.remove('play-on');
      if (board !== null && wordHidden) board.setLayerVisible('word', true);
      wordHidden = false;
      if (els.wordCard !== undefined) els.wordCard.hidden = true;
      renderLegend();
      els.root.setAttribute('data-active', 'false');
      els.panel.hidden = true;
      popupOpen = false;
      setMore(false);
      renderPopup();
      els.optionsBox.hidden = true;
      els.status.hidden = true;
      refreshActions();
      syncKeysHeight();
      return true;
    }

    function onSettings(payload) {
      const keys = payload && payload.keys ? payload.keys : [];
      if (keys.indexOf('check') !== -1) {
        els.checkRadios.forEach(function (label) {
          label.firstChild.checked = label.firstChild.value === pref('check');
        });
      }
      if (keys.indexOf('autoNotes') !== -1) {
        els.autoNotes.checked = pref('autoNotes') !== false;
        if (game !== null) game.setOptions({ autoNotes: pref('autoNotes') !== false });
      }
      if (!active) return;
      if (keys.indexOf('colorAuxSymbol') !== -1) {
        board.setColorAuxSymbol(auxOn());
        renderLegend();
      }
      refreshAll();
    }

    function onLocale() {
      retranslate();
      if (game !== null) refreshSymbolControl();
      if (active) {
        if (layer !== null) layer.shown.fill('');
        renderHint();
        renderLegend();
        refreshAll();
      }
    }

    function start() {
      if (!buildUi()) return false;
      appOffs.push(app.on('settings', onSettings), app.on('locale', onLocale));
      // The same breakpoint moves the controls (placeStatus) and drops the popup.
      if (typeof root.matchMedia === 'function') {
        const query = root.matchMedia(SMALL_SCREEN);
        const onQuery = function () { placeStatus(); renderPopup(); syncKeysHeight(); };
        if (typeof query.addEventListener === 'function') {
          query.addEventListener('change', onQuery);
          appOffs.push(function () { query.removeEventListener('change', onQuery); });
        }
      }
      return true;
    }

    function destroy() {
      detach();
      appOffs.splice(0).forEach(function (off) { if (typeof off === 'function') off(); });
      bound.length = 0;
      if (els.root && els.root.parentNode) els.root.parentNode.removeChild(els.root);
      if (els.optionsBox && els.optionsBox.parentNode) els.optionsBox.parentNode.removeChild(els.optionsBox);
      if (els.popup && els.popup.parentNode) els.popup.parentNode.removeChild(els.popup);
      if (els.controls && els.controls.parentNode) els.controls.parentNode.removeChild(els.controls);
      if (els.status && els.status.parentNode) els.status.parentNode.removeChild(els.status);
    }

    return {
      start: start,
      attach: attach,
      detach: detach,
      pauseGame: pauseGame,
      select: select,
      setSymbolMode: setSymbolMode,
      destroy: destroy,
      symbolMode: currentMode,
      isActive: function isActive() { return active; },
      getGame: function getGame() { return game; }
    };
  }

  function init(app) {
    if (typeof document === 'undefined' || !app || typeof app.on !== 'function') return false;
    if (controller !== null) return true;
    const created = createController(app);
    if (!created.start()) return false;
    controller = created;
    return true;
  }

  function attach(puzzle, options) {
    return controller !== null ? controller.attach(puzzle, options) : null;
  }

  function detach() {
    return controller !== null && controller.detach();
  }

  function pauseGame() {
    return controller !== null && controller.pauseGame();
  }

  function isActive() {
    return controller !== null && controller.isActive();
  }

  function getGame() {
    return controller !== null ? controller.getGame() : null;
  }

  function getSymbolMode() {
    return controller !== null && controller.isActive() ? controller.symbolMode() : 'digits';
  }

  function setSymbolMode(mode) {
    return controller !== null && controller.setSymbolMode(mode);
  }

  function select(cell) {
    if (controller !== null && controller.isActive()) controller.select(cell, true);
  }

  function destroy() {
    if (controller !== null) controller.destroy();
    controller = null;
  }

  SG.play = {
    init: init,
    attach: attach,
    detach: detach,
    pauseGame: pauseGame,
    isActive: isActive,
    getGame: getGame,
    getSymbolMode: getSymbolMode,
    setSymbolMode: setSymbolMode,
    select: select,
    destroy: destroy,
    SAVE_VERSION: SAVE_VERSION,
    CHECK_MODES: CHECK_MODES,
    HINT_LEVELS: HINT_LEVELS,
    createGame: createGame,
    restoreGame: restoreGame,
    describeHint: describeHint,
    renderSnapshot: renderSnapshot,
    localizeArgs: localizeArgs,
    groupEliminations: groupEliminations,
    valueText: valueText,
    typedLabels: typedLabels,
    createKeyReader: createKeyReader,
    noteLayout: noteLayout,
    padLayout: padLayout,
    cellAtPoint: cellAtPoint,
    moveSelection: moveSelection
  };

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'play.panel.label': 'Play',
      'play.symbols.label': 'Symbols',
      'play.timer.label': 'Time',
      'play.timer.pause': 'Pause',
      'play.timer.play': 'Play',
      'play.timer.reset': 'Reset',
      'play.timer.reset.confirm': 'Confirm',
      'play.timer.resume': 'Resume',
      'play.timer.paused': 'Paused. Press Resume to carry on.',
      'play.progress': '{filled} of {total} cells filled',
      'play.tool.label': 'Play tools',
      'play.tool.notes': 'Notes',
      'play.tool.notes.title': 'Pencil notes (N): mark the symbols a cell may still hold',
      'play.tool.erase': 'Erase',
      'play.tool.erase.title': 'Erase the selected cell (Backspace)',
      'play.tool.undo': 'Undo',
      'play.tool.undo.title': 'Undo (Ctrl+Z)',
      'play.tool.redo': 'Redo',
      'play.tool.redo.title': 'Redo (Ctrl+Y)',
      'play.tool.hint': 'Hint',
      'play.tool.hint.title': 'Find the next logical step (H)',
      'play.tool.check': 'Check',
      'play.tool.check.title': 'Check your entries',
      'play.pad.label': 'Symbol pad',
      'play.pad.value': 'Enter {symbol}',
      'play.pad.note': 'Toggle note {symbol}',
      'play.popup.label': 'Enter a value in the selected cell',
      'play.popup.close': 'Close the keys',
      'play.options.summary': 'Options',
      'play.options.check': 'Check as I type',
      'play.options.check.off': 'Off (only when I press Check)',
      'play.options.check.conflicts': 'Rule conflicts (repeats, cage sums, signs)',
      'play.options.check.live': 'All mistakes (compared with the solution)',
      'play.options.autoNotes': 'Remove a placed symbol from the notes of its neighbours',
      'play.options.fillNotes': 'Fill in all notes',
      'play.more.show': 'More actions',
      'play.more.hide': 'Fewer actions',
      'play.options.revealCell': 'Reveal a cell',
      'play.options.revealCell.confirm': 'Press again to reveal',
      'play.options.reset': 'Reset puzzle',
      'play.options.reset.confirm': 'Press again to reset',
      'play.msg.select': 'Select a cell first.',
      'play.cell.entry': 'Your entry: {symbol}',
      'play.cell.notes': 'Your notes: {symbols}',
      'play.msg.given': '{cell} is a clue and cannot be changed.',
      'play.msg.notesFilled': '{cell} already has a value. Erase it to add notes.',
      'play.msg.set': '{cell}: {symbol}',
      'play.msg.cleared': '{cell}: cleared',
      'play.msg.notesFilledAll': 'All notes are filled in.',
      'play.msg.revealed': 'Revealed {cell}: {symbol}.',
      'play.msg.revealedAll': 'The solution is shown. This puzzle does not count as solved.',
      'play.msg.reset': 'The puzzle was reset.',
      'play.check.empty': 'Nothing to check yet. Enter a few values first.',
      'play.check.ok': 'No mistakes so far. Keep going!',
      'play.check.wrong_one': '{count} entry does not match the solution.',
      'play.check.wrong_other': '{count} entries do not match the solution.',
      'play.check.conflicts_one': '{count} cell breaks a rule.',
      'play.check.conflicts_other': '{count} cells break a rule.',
      'play.success': 'Solved! Time: {time}.',
      'play.success.hints_one': 'You used {count} hint.',
      'play.success.hints_other': 'You used {count} hints.',
      'play.success.revealed_one': '{count} cell was revealed for you.',
      'play.success.revealed_other': '{count} cells were revealed for you.',
      'play.success.word': 'The hidden word is {word}.',
      'play.success.wordMeaning': 'The hidden word is {word}: {meaning}',
      'play.word.title': 'The hidden word',
      'play.word.pos.n': 'noun',
      'play.word.pos.v': 'verb',
      'play.word.pos.a': 'adjective',
      'play.word.pos.d': 'adverb',
      'play.word.pos.o': 'word',
      'play.success.toast': 'Puzzle solved in {time}!',
      'play.hint.region': 'Look in {kind} {label}.',
      'play.hint.region.cage': 'Look at the cage with sum {sum}.',
      'play.hint.noRegion': 'Look for this pattern in the whole grid.',
      'play.hint.cells': 'Cells involved: {cells}.',
      'play.hint.place': 'Place {symbol} in {cell}.',
      'play.hint.eliminate': 'Remove the candidate {symbol} from {cells}.',
      'play.hint.more': 'Show more',
      'play.hint.apply.place': 'Fill it in',
      'play.hint.apply.eliminate': 'Remove from my notes',
      'play.hint.close': 'Close hint',
      'play.hint.reveal': 'Reveal one cell',
      'play.hint.ignored_one': '{count} of your entries is wrong and was ignored for this hint.',
      'play.hint.ignored_other': '{count} of your entries are wrong and were ignored for this hint.',
      'play.hint.stuck': 'No logical step found from here: the puzzle needs a harder technique than ' +
        'the solver knows. You can reveal one cell to move on.',
      'play.hint.solved': 'Nothing to hint: every cell is already correct.',
      'play.hint.unavailable': 'A hint is not available right now.'
    },
    vi: {
      'play.panel.label': 'Chơi',
      'play.symbols.label': 'Ký hiệu',
      'play.timer.label': 'Thời gian',
      'play.timer.pause': 'Tạm dừng',
      'play.timer.play': 'Chơi',
      'play.timer.reset': 'Đặt lại',
      'play.timer.reset.confirm': 'Xác nhận',
      'play.timer.resume': 'Tiếp tục',
      'play.timer.paused': 'Đang tạm dừng. Nhấn Tiếp tục để chơi tiếp.',
      'play.progress': 'Đã điền {filled}/{total} ô',
      'play.tool.label': 'Công cụ chơi',
      'play.tool.notes': 'Ghi chú',
      'play.tool.notes.title': 'Ghi chú nháp (N): đánh dấu các ký hiệu ô này còn có thể nhận',
      'play.tool.erase': 'Xóa',
      'play.tool.erase.title': 'Xóa ô đang chọn (Backspace)',
      'play.tool.undo': 'Hoàn tác',
      'play.tool.undo.title': 'Hoàn tác (Ctrl+Z)',
      'play.tool.redo': 'Làm lại',
      'play.tool.redo.title': 'Làm lại (Ctrl+Y)',
      'play.tool.hint': 'Gợi ý',
      'play.tool.hint.title': 'Tìm bước suy luận tiếp theo (H)',
      'play.tool.check': 'Kiểm tra',
      'play.tool.check.title': 'Kiểm tra các ô bạn đã điền',
      'play.pad.label': 'Bàn phím ký hiệu',
      'play.pad.value': 'Điền {symbol}',
      'play.pad.note': 'Bật/tắt ghi chú {symbol}',
      'play.popup.label': 'Nhập giá trị vào ô đã chọn',
      'play.popup.close': 'Đóng bàn phím',
      'play.options.summary': 'Tùy chọn',
      'play.options.check': 'Kiểm tra khi gõ',
      'play.options.check.off': 'Tắt (chỉ khi tôi nhấn Kiểm tra)',
      'play.options.check.conflicts': 'Vi phạm luật (trùng số, tổng lồng, dấu so sánh)',
      'play.options.check.live': 'Mọi lỗi (so với đáp án)',
      'play.options.autoNotes': 'Tự xóa ký hiệu vừa điền khỏi ghi chú của các ô cùng nhóm',
      'play.options.fillNotes': 'Điền sẵn mọi ghi chú',
      'play.more.show': 'Thêm thao tác',
      'play.more.hide': 'Bớt thao tác',
      'play.options.revealCell': 'Hiện một ô',
      'play.options.revealCell.confirm': 'Nhấn lần nữa để hiện',
      'play.options.reset': 'Đặt lại đề',
      'play.options.reset.confirm': 'Nhấn lần nữa để đặt lại',
      'play.msg.select': 'Hãy chọn một ô trước.',
      'play.cell.entry': 'Bạn đã điền: {symbol}',
      'play.cell.notes': 'Ghi chú của bạn: {symbols}',
      'play.msg.given': '{cell} là ô cho sẵn, không thể thay đổi.',
      'play.msg.notesFilled': '{cell} đã có giá trị. Hãy xóa giá trị trước khi ghi chú.',
      'play.msg.set': '{cell}: {symbol}',
      'play.msg.cleared': '{cell}: đã xóa',
      'play.msg.notesFilledAll': 'Đã điền sẵn tất cả ghi chú.',
      'play.msg.revealed': 'Đã hiện {cell}: {symbol}.',
      'play.msg.revealedAll': 'Đã hiện đáp án. Đề này không được tính là đã giải.',
      'play.msg.reset': 'Đã đặt lại đề.',
      'play.check.empty': 'Chưa có gì để kiểm tra. Hãy điền vài ô trước.',
      'play.check.ok': 'Chưa thấy lỗi nào. Cứ tiếp tục nhé!',
      'play.check.wrong_one': '{count} ô không khớp với đáp án.',
      'play.check.wrong_other': '{count} ô không khớp với đáp án.',
      'play.check.conflicts_one': '{count} ô vi phạm luật.',
      'play.check.conflicts_other': '{count} ô vi phạm luật.',
      'play.success': 'Giải xong rồi! Thời gian: {time}.',
      'play.success.hints_one': 'Bạn đã dùng {count} gợi ý.',
      'play.success.hints_other': 'Bạn đã dùng {count} gợi ý.',
      'play.success.revealed_one': 'Có {count} ô đã được hiện sẵn cho bạn.',
      'play.success.revealed_other': 'Có {count} ô đã được hiện sẵn cho bạn.',
      'play.success.word': 'Từ ẩn là {word}.',
      'play.success.wordMeaning': 'Từ ẩn là {word}: {meaning}',
      'play.word.title': 'Từ ẩn',
      'play.word.pos.n': 'danh từ',
      'play.word.pos.v': 'động từ',
      'play.word.pos.a': 'tính từ',
      'play.word.pos.d': 'trạng từ',
      'play.word.pos.o': 'từ',
      'play.success.toast': 'Đã giải xong đề trong {time}!',
      'play.hint.region': 'Hãy nhìn vào {kind} {label}.',
      'play.hint.region.cage': 'Hãy nhìn vào lồng có tổng {sum}.',
      'play.hint.noRegion': 'Hãy tìm mẫu này trên toàn bộ lưới.',
      'play.hint.cells': 'Các ô liên quan: {cells}.',
      'play.hint.place': 'Điền {symbol} vào {cell}.',
      'play.hint.eliminate': 'Loại ứng viên {symbol} khỏi {cells}.',
      'play.hint.more': 'Xem thêm',
      'play.hint.apply.place': 'Điền giúp tôi',
      'play.hint.apply.eliminate': 'Xóa khỏi ghi chú của tôi',
      'play.hint.close': 'Đóng gợi ý',
      'play.hint.reveal': 'Hiện một ô',
      'play.hint.ignored_one': '{count} ô bạn điền bị sai nên đã được bỏ qua khi tìm gợi ý.',
      'play.hint.ignored_other': '{count} ô bạn điền bị sai nên đã được bỏ qua khi tìm gợi ý.',
      'play.hint.stuck': 'Không tìm được bước suy luận nào từ vị trí này: đề cần kỹ thuật khó hơn mức ' +
        'bộ giải biết. Bạn có thể hiện một ô để đi tiếp.',
      'play.hint.solved': 'Không còn gì để gợi ý: mọi ô đều đã đúng.',
      'play.hint.unavailable': 'Hiện chưa thể đưa ra gợi ý.'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
