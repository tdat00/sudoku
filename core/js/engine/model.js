/**
 * Unified puzzle model: every variant is a constraint satisfaction problem made of cells, all-different
 * units, optional cages / inequalities and a drawing layout. The model is immutable once built (`create`);
 * everything that changes while solving lives in a separate `SolveState`, so cloning a search position is one
 * typed-array copy. `create` only builds data and never rejects a malformed unit list, so that `validate` can
 * report every problem of a hand-made model.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  const MAX_ERRORS = 50;

  // Budget of the V8 trial solve: small, because validation must stay cheap.
  const V8_NODES = 50000;
  const V8_MS = 500;

  /**
   * @typedef {Object} UnitMeta
   * `kind` is 'row' | 'col' | 'box' | 'region' | 'diag' | 'window' (free text allowed); `partial` marks an
   * all-different unit that may hold fewer than D cells; `label` is e.g. 'R3'.
   */

  /**
   * @typedef {Object} ModelSpec  Input of `create`.
   * `cellCount` defaults to `layout.cellRow.length`; `unitMeta` has one entry per unit (missing ones get
   * defaults); `inequalities` mean value[a] < value[b]; `symbols.labels[v - 1]` is the symbol of value v;
   * `fixedCells` is either one entry per cell (0 = free, v > 0 = forced to v) or a list of [cell, value]
   * pairs. `layout` is { rows, cols, cellRow, cellCol, cellRegion?, overlays?, subGrids? }.
   */

  /**
   * @typedef {Object} PuzzleModel  Immutable. Same fields as the spec, normalised to typed arrays, plus:
   * `cellUnits` (units containing each cell) and `peers` (cells sharing a unit with each cell, ascending).
   * `fixedCells` has one entry per cell (0 = free, v > 0 = forced to v); it marks the key word line of a
   * board with one (the solvers work from `givens` alone).
   */

  /**
   * @typedef {Object} SolveState
   * `candidates`: bit (v - 1) set while value v is still possible in the cell; `value`: fixed value, 0 while
   * undecided; `unsolvedCount`: number of cells whose value is 0.
   */

  function invalidSpec(reason) {
    return new SG.errors.GenerationError('model.invalidSpec', { reason: reason });
  }

  function isIndex(x, n) {
    return typeof x === 'number' && x >= 0 && x < n && Math.floor(x) === x;
  }

  function defaultLabels(digits) {
    const labels = [];
    for (let v = 1; v <= digits; v++) {
      labels.push(v <= 9 ? String(v) : String.fromCharCode(55 + v));
    }
    return labels;
  }

  function normalizeFixedCells(raw, n) {
    const out = new Int32Array(n);
    if (raw === undefined || raw === null) return out;
    if (raw.length === n && !(n > 0 && Array.isArray(raw[0]))) {
      for (let c = 0; c < n; c++) out[c] = raw[c] | 0;
      return out;
    }
    for (let i = 0; i < raw.length; i++) {
      const pair = raw[i];
      if (!Array.isArray(pair) || pair.length !== 2 || !isIndex(pair[0], n)) {
        throw invalidSpec('fixedCells must hold one value per cell or [cell, value] pairs');
      }
      out[pair[0]] = pair[1] | 0;
    }
    return out;
  }

  /** Builds `cellUnits` and `peers`; indices out of range are skipped (validate reports them). */
  function buildIncidence(units, n) {
    const counts = new Int32Array(n);
    const stamp = new Int32Array(n);
    let u;
    let i;
    for (u = 0; u < units.length; u++) {
      for (i = 0; i < units[u].length; i++) {
        const c = units[u][i];
        if (isIndex(c, n) && stamp[c] !== u + 1) {
          stamp[c] = u + 1;
          counts[c]++;
        }
      }
    }
    const cellUnits = [];
    for (let c = 0; c < n; c++) cellUnits.push(new Int32Array(counts[c]));
    const fill = new Int32Array(n);
    stamp.fill(0);
    for (u = 0; u < units.length; u++) {
      for (i = 0; i < units[u].length; i++) {
        const c = units[u][i];
        if (isIndex(c, n) && stamp[c] !== u + 1) {
          stamp[c] = u + 1;
          cellUnits[c][fill[c]++] = u;
        }
      }
    }

    const peers = [];
    const mark = new Int32Array(n);
    const tmp = new Int32Array(n);
    for (let c = 0; c < n; c++) {
      let k = 0;
      mark[c] = c + 1;
      const us = cellUnits[c];
      for (let j = 0; j < us.length; j++) {
        const cells = units[us[j]];
        for (i = 0; i < cells.length; i++) {
          const p = cells[i];
          if (isIndex(p, n) && mark[p] !== c + 1) {
            mark[p] = c + 1;
            tmp[k++] = p;
          }
        }
      }
      peers.push(tmp.slice(0, k).sort());
    }
    return { cellUnits: cellUnits, peers: peers };
  }

  function normalizeLayout(layout, n, unitMeta, units) {
    if (!layout || typeof layout !== 'object') throw invalidSpec('layout is required');
    if (!layout.cellRow || !layout.cellCol) {
      throw invalidSpec('layout.cellRow and layout.cellCol are required');
    }
    if (!(layout.rows >= 1) || !(layout.cols >= 1)) {
      throw invalidSpec('layout.rows and layout.cols are required');
    }

    let cellRegion;
    if (layout.cellRegion) {
      cellRegion = Int32Array.from(layout.cellRegion);
    } else {
      // Default region: the first box/region unit that holds the cell.
      cellRegion = new Int32Array(n);
      let regionNo = 0;
      for (let u = 0; u < units.length; u++) {
        const kind = unitMeta[u].kind;
        if (kind !== 'box' && kind !== 'region') continue;
        for (let i = 0; i < units[u].length; i++) {
          const c = units[u][i];
          if (isIndex(c, n) && cellRegion[c] === 0) cellRegion[c] = regionNo + 1;
        }
        regionNo++;
      }
      for (let c = 0; c < n; c++) cellRegion[c] = Math.max(cellRegion[c] - 1, 0);
    }

    const overlays = (layout.overlays || []).map(function (o) {
      return Object.freeze({ cells: Int32Array.from(o.cells), kind: String(o.kind) });
    });
    const subGrids = (layout.subGrids && layout.subGrids.length > 0
      ? layout.subGrids : [{ gridIndex: 0, originRow: 0, originCol: 0 }]).map(function (g) {
      return Object.freeze({ gridIndex: g.gridIndex, originRow: g.originRow, originCol: g.originCol });
    });

    return Object.freeze({
      rows: layout.rows,
      cols: layout.cols,
      cellRow: Int32Array.from(layout.cellRow),
      cellCol: Int32Array.from(layout.cellCol),
      cellRegion: cellRegion,
      overlays: Object.freeze(overlays),
      subGrids: Object.freeze(subGrids)
    });
  }

  function create(spec) {
    if (!spec || typeof spec !== 'object') throw invalidSpec('spec must be an object');
    if (typeof spec.variantId !== 'string' || spec.variantId === '') {
      throw invalidSpec('variantId is required');
    }
    const digits = spec.digits;
    if (!(Number.isInteger(digits) && digits >= 1 && digits <= SG.MAX_DIGITS)) {
      throw invalidSpec('digits must be an integer in 1..' + SG.MAX_DIGITS);
    }
    if (!Array.isArray(spec.units)) throw invalidSpec('units must be an array');
    if (!spec.layout || !spec.layout.cellRow) throw invalidSpec('layout is required');

    const n = spec.cellCount !== undefined ? spec.cellCount : spec.layout.cellRow.length;
    if (!(Number.isInteger(n) && n >= 1)) throw invalidSpec('cellCount must be a positive integer');

    const units = spec.units.map(function (u) { return Int32Array.from(u); });
    const unitMeta = units.map(function (u, i) {
      const m = (spec.unitMeta && spec.unitMeta[i]) || {};
      const meta = {
        kind: m.kind !== undefined ? m.kind : 'region',
        gridIndex: m.gridIndex !== undefined ? m.gridIndex : 0,
        label: m.label !== undefined ? m.label : 'U' + (i + 1)
      };
      if (m.partial) meta.partial = true;
      return Object.freeze(meta);
    });

    const incidence = buildIncidence(units, n);
    const layout = normalizeLayout(spec.layout, n, unitMeta, units);

    const cages = (spec.cages || []).map(function (c) {
      return Object.freeze({ cells: Int32Array.from(c.cells), sum: c.sum, distinct: c.distinct !== false });
    });
    const inequalities = (spec.inequalities || []).map(function (q) {
      return Object.freeze({ a: q.a, b: q.b });
    });
    const symbols = spec.symbols
      ? { mode: spec.symbols.mode, labels: Array.from(spec.symbols.labels) }
      : { mode: 'digits', labels: defaultLabels(digits) };

    Object.freeze(units);
    Object.freeze(incidence.cellUnits);
    Object.freeze(incidence.peers);
    Object.freeze(unitMeta);
    Object.freeze(cages);
    Object.freeze(inequalities);

    return Object.freeze({
      variantId: spec.variantId,
      cellCount: n,
      digits: digits,
      units: units,
      cellUnits: incidence.cellUnits,
      peers: incidence.peers,
      unitMeta: unitMeta,
      cages: cages,
      inequalities: inequalities,
      layout: layout,
      symbols: Object.freeze(symbols),
      fixedCells: normalizeFixedCells(spec.fixedCells, n)
    });
  }

  function addError(errors, message) {
    if (errors.length < MAX_ERRORS) errors.push(message);
    else if (errors.length === MAX_ERRORS) errors.push('... further errors omitted');
  }

  function checkUnits(model, errors) {
    const n = model.cellCount;
    const covered = new Uint8Array(n);
    const stamp = new Int32Array(n);
    for (let u = 0; u < model.units.length; u++) {
      const cells = model.units[u];
      const meta = model.unitMeta[u];
      const name = 'unit ' + u + (meta ? ' (' + meta.label + ')' : '');
      const partial = !!(meta && meta.partial);
      if (partial ? (cells.length < 1 || cells.length > model.digits) : cells.length !== model.digits) {
        addError(errors, 'V1: ' + name + ' has ' + cells.length + ' cells, expected ' +
          (partial ? '1..' : '') + model.digits);
      }
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        if (!isIndex(c, n)) {
          addError(errors, 'V2: ' + name + ' holds the invalid cell index ' + c + ' (cellCount ' + n + ')');
          continue;
        }
        covered[c] = 1;
        if (stamp[c] === u + 1) addError(errors, 'V1: ' + name + ' lists cell ' + c + ' twice');
        stamp[c] = u + 1;
      }
    }
    for (let c = 0; c < n; c++) {
      if (covered[c] === 0) addError(errors, 'V3: cell ' + c + ' belongs to no unit');
    }
  }

  function checkPeers(model, errors) {
    const n = model.cellCount;
    if (model.peers.length !== n) {
      addError(errors, 'V4: peers has ' + model.peers.length + ' entries, expected ' + n);
      return;
    }
    const seen = new Uint8Array(n * n);
    let a;
    let i;
    for (a = 0; a < n; a++) {
      for (i = 0; i < model.peers[a].length; i++) {
        const b = model.peers[a][i];
        if (!isIndex(b, n)) addError(errors, 'V4: peers[' + a + '] holds the invalid cell index ' + b);
        else if (b === a) addError(errors, 'V4: cell ' + a + ' is its own peer');
        else seen[a * n + b] = 1;
      }
    }
    for (a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        if (seen[a * n + b] !== seen[b * n + a]) {
          addError(errors, 'V4: peers is not symmetric for cells ' + a + ' and ' + b);
        }
      }
    }
  }

  function checkLayout(model, errors) {
    const n = model.cellCount;
    const layout = model.layout;
    if (layout.cellRow.length !== n || layout.cellCol.length !== n) {
      addError(errors, 'V5: layout.cellRow / cellCol must have one entry per cell (' + n + ')');
      return;
    }
    const used = new Map();
    for (let c = 0; c < n; c++) {
      const r = layout.cellRow[c];
      const col = layout.cellCol[c];
      if (!(r >= 0 && r < layout.rows && col >= 0 && col < layout.cols)) {
        addError(errors, 'V5: cell ' + c + ' lies outside the ' + layout.rows + 'x' + layout.cols +
          ' canvas');
        continue;
      }
      const key = r * layout.cols + col;
      if (used.has(key)) {
        addError(errors, 'V5: cells ' + used.get(key) + ' and ' + c + ' share the canvas position R' +
          (r + 1) + 'C' + (col + 1));
      } else {
        used.set(key, c);
      }
    }
  }

  function checkCages(model, errors) {
    const n = model.cellCount;
    const D = model.digits;
    const owner = new Int32Array(n).fill(-1);
    for (let k = 0; k < model.cages.length; k++) {
      const cage = model.cages[k];
      const size = cage.cells.length;
      let valid = true;
      for (let i = 0; i < size; i++) {
        const c = cage.cells[i];
        if (!isIndex(c, n)) {
          addError(errors, 'V6: cage ' + k + ' holds the invalid cell index ' + c);
          valid = false;
        } else if (owner[c] !== -1 && owner[c] !== k) {
          addError(errors, 'V6: cell ' + c + ' belongs to cages ' + owner[c] + ' and ' + k);
        } else {
          owner[c] = k;
        }
      }
      if (!valid) continue;
      if (size === 0) {
        addError(errors, 'V6: cage ' + k + ' is empty');
        continue;
      }
      let minSum;
      let maxSum;
      if (cage.distinct) {
        if (size > D) {
          addError(errors, 'V6: cage ' + k + ' has ' + size + ' distinct cells but only ' + D +
            ' digits exist');
          continue;
        }
        minSum = size * (size + 1) / 2;
        maxSum = size * D - size * (size - 1) / 2;
      } else {
        minSum = size;
        maxSum = size * D;
      }
      if (!(cage.sum >= minSum && cage.sum <= maxSum)) {
        addError(errors, 'V6: cage ' + k + ' sum ' + cage.sum + ' is outside the feasible range ' +
          minSum + '..' + maxSum);
      }
    }
  }

  function checkInequalities(model, errors) {
    const n = model.cellCount;
    const out = [];
    for (let c = 0; c < n; c++) out.push([]);
    const indegree = new Int32Array(n);
    let usable = true;
    for (let k = 0; k < model.inequalities.length; k++) {
      const q = model.inequalities[k];
      if (!isIndex(q.a, n) || !isIndex(q.b, n)) {
        addError(errors, 'V7: inequality ' + k + ' references an invalid cell (' + q.a + ', ' + q.b + ')');
        usable = false;
      } else if (q.a === q.b) {
        addError(errors, 'V7: inequality ' + k + ' compares cell ' + q.a + ' with itself');
        usable = false;
      } else {
        out[q.a].push(q.b);
        indegree[q.b]++;
      }
    }
    if (!usable) return;

    // Kahn's algorithm: whatever stays unprocessed lies on or behind a cycle, which has no solution.
    const queue = [];
    for (let c = 0; c < n; c++) if (indegree[c] === 0) queue.push(c);
    let processed = 0;
    for (let head = 0; head < queue.length; head++) {
      processed++;
      const list = out[queue[head]];
      for (let i = 0; i < list.length; i++) {
        if (--indegree[list[i]] === 0) queue.push(list[i]);
      }
    }
    if (processed < n) addError(errors, 'V7: the inequalities contain a cycle (a < b < ... < a)');
  }

  function checkSolvable(model, options, errors, warnings) {
    if (!SG.dfs || typeof SG.dfs.solve !== 'function') return;
    const budget = options.budget || SG.budget.create({ nodes: V8_NODES, ms: V8_MS });
    let solution;
    try {
      solution = SG.dfs.solve(model, model.fixedCells, null, budget);
    } catch (err) {
      if (err instanceof SG.errors.GenerationError && err.code === 'budget.exceeded') {
        warnings.push('V8: inconclusive, the trial solve ran out of budget');
        return;
      }
      if (err instanceof SG.errors.GenerationError && err.code === 'dfs.invalidGivens') {
        addError(errors, 'V8: fixedCells holds a value outside 1..' + model.digits);
        return;
      }
      throw err;
    }
    if (solution === null) addError(errors, 'V8: the model has no complete solution');
  }

  /**
   * Checks the model invariants V1-V8. V8 (a trial solve with a small budget) only runs when V1-V7 pass and
   * `SG.dfs` is loaded; a trial solve that runs out of budget is inconclusive and reported in `warnings`,
   * never as an error.
   */
  function validate(model, options) {
    options = options || {};
    const errors = [];
    const warnings = [];
    checkUnits(model, errors);
    checkPeers(model, errors);
    checkLayout(model, errors);
    checkCages(model, errors);
    checkInequalities(model, errors);
    if (errors.length === 0 && options.solve !== false) checkSolvable(model, options, errors, warnings);
    return { ok: errors.length === 0, errors: errors, warnings: warnings };
  }

  function initState(model) {
    const candidates = new Int32Array(model.cellCount);
    candidates.fill(SG.bits.full(model.digits));
    return {
      candidates: candidates,
      value: new Int32Array(model.cellCount),
      unsolvedCount: model.cellCount
    };
  }

  /**
   * Copies a state; with `into` (built for the same model) the copy is written into its buffers without
   * allocating.
   */
  function cloneState(state, into) {
    if (into) {
      into.candidates.set(state.candidates);
      into.value.set(state.value);
      into.unsolvedCount = state.unsolvedCount;
      return into;
    }
    return {
      candidates: state.candidates.slice(),
      value: state.value.slice(),
      unsolvedCount: state.unsolvedCount
    };
  }

  /**
   * Human label of a cell: 'R4C7' (1-based), prefixed 'G2-' on multi-grid layouts; an overlap cell is
   * labelled by the first sub-grid containing it.
   */
  function cellLabel(model, cellIndex) {
    const layout = model.layout;
    const row = layout.cellRow[cellIndex];
    const col = layout.cellCol[cellIndex];
    if (layout.subGrids.length > 1) {
      for (let i = 0; i < layout.subGrids.length; i++) {
        const g = layout.subGrids[i];
        if (row >= g.originRow && row < g.originRow + model.digits &&
            col >= g.originCol && col < g.originCol + model.digits) {
          return 'G' + (g.gridIndex + 1) + '-R' + (row - g.originRow + 1) + 'C' + (col - g.originCol + 1);
        }
      }
    }
    return 'R' + (row + 1) + 'C' + (col + 1);
  }

  /**
   * Independent check of a complete assignment against every unit, cage and inequality; shares no code with
   * the solver, so it is the oracle for "solution is valid".
   */
  function isSolution(model, values) {
    const n = model.cellCount;
    const D = model.digits;
    if (!values || values.length !== n) return false;
    let i;
    for (let c = 0; c < n; c++) {
      const v = values[c];
      if (!(Number.isInteger(v) && v >= 1 && v <= D)) return false;
    }
    for (let u = 0; u < model.units.length; u++) {
      const cells = model.units[u];
      let seen = 0;
      for (i = 0; i < cells.length; i++) {
        const bit = 1 << (values[cells[i]] - 1);
        if ((seen & bit) !== 0) return false;
        seen |= bit;
      }
    }
    for (let k = 0; k < model.cages.length; k++) {
      const cage = model.cages[k];
      let sum = 0;
      let seen = 0;
      for (i = 0; i < cage.cells.length; i++) {
        const v = values[cage.cells[i]];
        sum += v;
        if (cage.distinct) {
          const bit = 1 << (v - 1);
          if ((seen & bit) !== 0) return false;
          seen |= bit;
        }
      }
      if (sum !== cage.sum) return false;
    }
    for (let q = 0; q < model.inequalities.length; q++) {
      if (!(values[model.inequalities[q].a] < values[model.inequalities[q].b])) return false;
    }
    return true;
  }

  SG.model = {
    create: create,
    validate: validate,
    initState: initState,
    cloneState: cloneState,
    cellLabel: cellLabel,
    isSolution: isSolution
  };
})(typeof self !== 'undefined' ? self : globalThis);
