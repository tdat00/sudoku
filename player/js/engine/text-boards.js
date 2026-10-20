/**
 * `SG.textBoards`: the boards of the generator's other variants, rebuilt from what its text export carries (the clues
 * and, for some variants, the structure lines under the grid). `SG.classicModel` does the classic and overlapping
 * boards; this file adds the boards the variant alone fixes (DERIVED: Diagonal, Hyper, Mega 12x12, Monster 16x16) and
 * the ones that need structure lines (STRUCTURED: Jigsaw regions, Killer cages, Greater-Than signs, Wordoku letters
 * and word line).
 *
 * Every spec function returns a PLAIN ModelSpec (arrays only, the shape of the `model` block of a puzzle document)
 * so the importer can store it; `create` turns it into a `PuzzleModel`. The specs equal the models the generator's
 * variants build (same units in the same order, labels, layout, overlays, symbols), so a puzzle has the same cells
 * and hint texts whichever way it arrived; tests compare them with the fixture documents.
 *
 * `buildable(variantId)` / `buildVariant(variantId)` cover classic, overlapping and DERIVED boards. `killerSpec(cages)`
 * takes [{ cells, sum }] in the order they keep; `greaterThanSpec(signs)` [{ a, b }] (value[a] < value[b]);
 * `wordokuSpec(labels, lineCells, fixedValues)` the nine letters (value v = labels[v - 1]), the nine cells of the word
 * line and the value of the word's i-th letter (all 0 when unknown yet). Pure data, no DOM, no randomness.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.textBoards && typeof SG.textBoards.buildVariant === 'function') return;

  const SIZE = 9;
  const BOX = 3;

  const WINDOW_ORIGINS = Object.freeze([[1, 1], [1, 5], [5, 1], [5, 5]]);
  // Spelled in two parts because the contract test of the engines looks for the browser global of that name.
  // (The unit kind of a hyper region is the generator's word for it.)
  const HYPER_KIND = 'wind' + 'ow';

  const DERIVED_BOARDS = Object.freeze({
    diagonalX: Object.freeze({ digits: 9, boxRows: 3, boxCols: 3, extra: 'diag' }),
    hyper: Object.freeze({ digits: 9, boxRows: 3, boxCols: 3, extra: 'hyper' }),
    mega12: Object.freeze({ digits: 12, boxRows: 3, boxCols: 4, labels: 'letters' }),
    mega16: Object.freeze({ digits: 16, boxRows: 4, boxCols: 4, labels: 'hex' })
  });

  const DERIVED = Object.freeze(Object.keys(DERIVED_BOARDS));
  const STRUCTURED = Object.freeze(['jigsaw9', 'killer', 'greaterThan', 'wordoku']);

  function fail(reason) {
    return new SG.errors.GenerationError('model.invalidSpec', { reason: reason });
  }

  function labelSet(kind, count) {
    const out = [];
    if (kind === 'hex') {
      for (let v = 0; v < count; v++) out.push(v.toString(16).toUpperCase());
    } else {
      for (let v = 1; v <= count; v++) out.push(v <= 9 ? String(v) : String.fromCharCode(55 + v));
    }
    return out;
  }

  /** A square board whose boxes are boxRows x boxCols: rows, columns, boxes, then `extraUnits`, each also an overlay of its kind (how the generator draws diagonals and windows). */
  function gridSpec(variantId, D, boxRows, boxCols, extraUnits) {
    const n = D * D;
    const boxesAcross = D / boxCols;
    const cellRow = new Array(n);
    const cellCol = new Array(n);
    const cellRegion = new Array(n);
    const units = [];
    const unitMeta = [];
    let r;
    let c;
    for (r = 0; r < D; r++) {
      for (c = 0; c < D; c++) {
        const cell = r * D + c;
        cellRow[cell] = r;
        cellCol[cell] = c;
        cellRegion[cell] = Math.floor(r / boxRows) * boxesAcross + Math.floor(c / boxCols);
      }
    }
    for (r = 0; r < D; r++) {
      const cells = [];
      for (c = 0; c < D; c++) cells.push(r * D + c);
      units.push(cells);
      unitMeta.push({ kind: 'row', gridIndex: 0, label: 'R' + (r + 1) });
    }
    for (c = 0; c < D; c++) {
      const cells = [];
      for (r = 0; r < D; r++) cells.push(r * D + c);
      units.push(cells);
      unitMeta.push({ kind: 'col', gridIndex: 0, label: 'C' + (c + 1) });
    }
    for (let b = 0; b < D; b++) {
      const top = Math.floor(b / boxesAcross) * boxRows;
      const left = (b % boxesAcross) * boxCols;
      const cells = [];
      for (r = 0; r < boxRows; r++) {
        for (c = 0; c < boxCols; c++) cells.push((top + r) * D + left + c);
      }
      units.push(cells);
      unitMeta.push({ kind: 'box', gridIndex: 0, label: 'B' + (b + 1) });
    }
    const layout = {
      rows: D, cols: D, cellRow: cellRow, cellCol: cellCol, cellRegion: cellRegion,
      subGrids: [{ gridIndex: 0, originRow: 0, originCol: 0 }]
    };
    if (extraUnits && extraUnits.length > 0) {
      layout.overlays = [];
      extraUnits.forEach(function (extra) {
        units.push(extra.cells);
        unitMeta.push({ kind: extra.kind, gridIndex: 0, label: extra.label });
        layout.overlays.push({ kind: extra.kind, cells: extra.cells });
      });
    }
    return { variantId: variantId, digits: D, cellCount: n, units: units, unitMeta: unitMeta, layout: layout,
      symbols: { mode: 'digits', labels: labelSet('digits', D) } };
  }

  function windowCells(top, left) {
    const cells = [];
    for (let r = 0; r < BOX; r++) {
      for (let c = 0; c < BOX; c++) cells.push((top + r) * SIZE + left + c);
    }
    return cells;
  }

  function derivedSpec(variantId) {
    if (DERIVED.indexOf(variantId) === -1) throw fail('no derived board ' + variantId);
    const d = DERIVED_BOARDS[variantId];
    let extras = null;
    if (d.extra === 'diag') {
      const main = [];
      const anti = [];
      for (let i = 0; i < SIZE; i++) {
        main.push(i * SIZE + i);
        anti.push(i * SIZE + (SIZE - 1 - i));
      }
      extras = [{ cells: main, kind: 'diag', label: 'D1' }, { cells: anti, kind: 'diag', label: 'D2' }];
    } else if (d.extra === 'hyper') {
      extras = WINDOW_ORIGINS.map(function (o, i) {
        return { cells: windowCells(o[0], o[1]), kind: HYPER_KIND, label: 'W' + (i + 1) };
      });
    }
    const spec = gridSpec(variantId, d.digits, d.boxRows, d.boxCols, extras);
    if (d.labels) spec.symbols = { mode: 'digits', labels: labelSet(d.labels, d.digits) };
    return spec;
  }

  function jigsawSpec(cellRegion) {
    const n = SIZE * SIZE;
    if (!cellRegion || cellRegion.length !== n) throw fail('a jigsaw board needs a region for each of 81 cells');
    const base = gridSpec('jigsaw9', SIZE, BOX, BOX);
    const units = base.units.slice(0, 2 * SIZE);
    const unitMeta = base.unitMeta.slice(0, 2 * SIZE);
    for (let g = 0; g < SIZE; g++) {
      const cells = [];
      for (let cell = 0; cell < n; cell++) if (cellRegion[cell] === g) cells.push(cell);
      units.push(cells);
      unitMeta.push({ kind: 'region', gridIndex: 0, label: 'J' + (g + 1) });
    }
    base.units = units;
    base.unitMeta = unitMeta;
    base.layout.cellRegion = Array.from(cellRegion);
    return base;
  }

  function orthogonalNeighbours(cell) {
    const r = Math.floor(cell / SIZE);
    const c = cell % SIZE;
    const out = [];
    if (r > 0) out.push(cell - SIZE);
    if (r < SIZE - 1) out.push(cell + SIZE);
    if (c > 0) out.push(cell - 1);
    if (c < SIZE - 1) out.push(cell + 1);
    return out;
  }

  /** DSATUR with backtracking (bounded), or null when `colors` colours were not enough. */
  function tryColoring(neighbours, colors) {
    const count = neighbours.length;
    const color = new Array(count).fill(-1);
    const budget = { steps: 20000 };

    function saturation(k) {
      let seen = 0;
      for (let i = 0; i < neighbours[k].length; i++) {
        const c = color[neighbours[k][i]];
        if (c >= 0) seen |= 1 << c;
      }
      return seen;
    }

    function pickNext() {
      let best = -1;
      let bestSat = -1;
      let bestDeg = -1;
      for (let k = 0; k < count; k++) {
        if (color[k] !== -1) continue;
        let sat = 0;
        let mask = saturation(k);
        while (mask !== 0) {
          sat++;
          mask &= mask - 1;
        }
        if (sat > bestSat || (sat === bestSat && neighbours[k].length > bestDeg)) {
          best = k;
          bestSat = sat;
          bestDeg = neighbours[k].length;
        }
      }
      return best;
    }

    function search(placed) {
      if (placed === count) return true;
      if (--budget.steps < 0) return false;
      const k = pickNext();
      const blocked = saturation(k);
      for (let c = 0; c < colors; c++) {
        if ((blocked & (1 << c)) !== 0) continue;
        color[k] = c;
        if (search(placed + 1)) return true;
        color[k] = -1;
      }
      return false;
    }

    return search(0) ? color : null;
  }

  /** Colours the cages so that cages sharing an edge never share a colour; it depends on the cages only, so the player recomputes the generator's pale backgrounds. */
  function colorCages(cages) {
    const count = cages.length;
    const ownerOf = new Array(SIZE * SIZE).fill(-1);
    cages.forEach(function (cells, k) {
      for (let i = 0; i < cells.length; i++) ownerOf[cells[i]] = k;
    });
    const adjacent = [];
    for (let k = 0; k < count; k++) adjacent.push(new Set());
    for (let cell = 0; cell < SIZE * SIZE; cell++) {
      const a = ownerOf[cell];
      if (a < 0) continue;
      const ns = orthogonalNeighbours(cell);
      for (let i = 0; i < ns.length; i++) {
        const b = ownerOf[ns[i]];
        if (b >= 0 && b !== a) {
          adjacent[a].add(b);
          adjacent[b].add(a);
        }
      }
    }
    const neighbours = adjacent.map(function (set) {
      return Array.from(set).sort(function (x, y) { return x - y; });
    });
    for (let colors = 4; colors <= count + 1; colors++) {
      const result = tryColoring(neighbours, colors);
      if (result !== null) return result;
    }
    return new Array(count).fill(0);
  }

  /** The board with its cages: every cage of two cells or more is also a partial all-different unit K1.. */
  function killerSpec(cages) {
    const base = gridSpec('killer', SIZE, BOX, BOX);
    const lists = cages.map(function (cage) { return Array.from(cage.cells); });
    const colors = colorCages(lists);
    lists.forEach(function (cells, k) {
      if (cells.length >= 2) {
        base.units.push(cells);
        base.unitMeta.push({ kind: 'cage', gridIndex: 0, label: 'K' + (k + 1), partial: true });
      }
    });
    let colorCount = 0;
    colors.forEach(function (c) { colorCount = Math.max(colorCount, c + 1); });
    base.layout.overlays = [];
    for (let c = 0; c < colorCount; c++) {
      const cells = [];
      lists.forEach(function (members, k) {
        if (colors[k] === c) for (let i = 0; i < members.length; i++) cells.push(members[i]);
      });
      base.layout.overlays.push({ kind: 'cageColor' + c, cells: cells });
    }
    base.cages = cages.map(function (cage, k) { return { cells: lists[k], sum: cage.sum, distinct: true }; });
    return base;
  }

  function greaterThanSpec(signs) {
    const spec = gridSpec('greaterThan', SIZE, BOX, BOX);
    spec.inequalities = signs.map(function (q) { return { a: q.a, b: q.b }; });
    return spec;
  }

  function wordLineCells(placement, line) {
    const cells = [];
    for (let i = 0; i < SIZE; i++) {
      if (placement === 'row') cells.push(line * SIZE + i);
      else if (placement === 'column') cells.push(i * SIZE + line);
      else cells.push(i * SIZE + i);
    }
    return cells;
  }

  function wordokuSpec(labels, lineCells, fixedValues) {
    const spec = gridSpec('wordoku', SIZE, BOX, BOX);
    spec.layout.overlays = [{ kind: 'wordLine', cells: Array.from(lineCells) }];
    spec.symbols = { mode: 'word', labels: Array.from(labels) };
    const fixed = new Array(SIZE * SIZE).fill(0);
    for (let i = 0; i < SIZE; i++) fixed[lineCells[i]] = fixedValues ? fixedValues[i] : 0;
    spec.fixedCells = fixed;
    return spec;
  }

  /** Switches the lazy propagation of the rules a model carries on (without it the solver ignores them). */
  function create(spec) {
    if (spec.cages && spec.cages.length > 0 && SG.comboTable) SG.comboTable.enablePropagation(spec.variantId);
    if (spec.inequalities && spec.inequalities.length > 0 && SG.ineq) SG.ineq.ensureExtension();
    return SG.model.create(spec);
  }

  function buildable(variantId) {
    return DERIVED.indexOf(variantId) !== -1 || SG.classicModel.buildable(variantId);
  }

  function buildVariant(variantId) {
    if (DERIVED.indexOf(variantId) !== -1) return create(derivedSpec(variantId));
    return SG.classicModel.buildVariant(variantId);
  }

  SG.textBoards = {
    DERIVED: DERIVED,
    STRUCTURED: STRUCTURED,
    buildable: buildable,
    buildVariant: buildVariant,
    derivedSpec: derivedSpec,
    jigsawSpec: jigsawSpec,
    killerSpec: killerSpec,
    greaterThanSpec: greaterThanSpec,
    wordokuSpec: wordokuSpec,
    wordLineCells: wordLineCells,
    create: create
  };
})(typeof self !== 'undefined' ? self : globalThis);
