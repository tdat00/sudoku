/**
 * Killer Sudoku (design.md sections 5.1, 6.3, 8.2): a classic 9x9 board whose cells are also grouped into
 * cages. Each cage shows a sum and holds pairwise distinct digits that add up to it. Classic Killer shows
 * no given digits, so the cages carry all the information; the digger keeps only the few clues that the
 * level (and the cage layout) needs.
 *
 * How the pieces fit (no `if (variant === 'killer')` exists anywhere in js/core):
 *   - `build` returns the plain 9x9 board without cages, because the cages come from the solution and the
 *     solution does not exist yet at step 2 of the pipeline.
 *   - `postGenerate` (pipeline step 4, 'extraStructure') grows the cages from the full grid, checks that
 *     the puzzle without any clue has a single solution, repairs the cage layout when it does not,
 *     colours the cages and returns the model with the cages in it (models are immutable, so it returns a
 *     new one).
 *   - cage propagation lives in combo-table.js (a constraint extension that this file switches on for the
 *     variant), the cage techniques in tech-cage.js, and `digStrategy: 'killer'` (registered below) tunes
 *     the hole digger to cages.
 *
 * What the model carries for the renderer:
 *   - `model.cages[k]`  { cells, sum, distinct: true }. Cells are sorted in reading order, so `cells[0]`
 *     is the top-left cell of the cage: that is where the sum label goes.
 *   - `model.layout.overlays`  one entry per used colour, `{ kind: 'cageColor0' ... 'cageColor4', cells }`:
 *     the cells of all cages that get that pale background colour. No two cages that share an edge have
 *     the same colour. `SG.killer.describeCages(model)` returns the same information per cage.
 *   - every cage with at least two cells is also a partial all-different unit (`kind: 'cage'`, label
 *     'K<n>'), which is how the engine makes the cells of a cage peers of each other.
 *
 * Variant options (`variantOptions`): `{ cageSize: -2..2 }`, default 0. It tilts the cage size
 * distribution of the difficulty towards smaller (negative) or larger (positive) cages.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first instance on repeated loads.
  if (SG.killer && typeof SG.killer.describeCages === 'function') return;

  const ID = 'killer';
  const DIGITS = 9;
  const BOX = 3;
  const CELLS = DIGITS * DIGITS;

  /**
   * Size distribution of the cages per difficulty: share of cages with that many cells (design.md 8.2).
   * Rating v2: expert uses the shares of hard; hell1 and hell2 use those of nightmare and tilt them
   * towards larger cages (`tiltFor`). Every level needs its own entry: `sizeDistribution` falls back to the
   * normal shares for an unknown one.
   */
  const SIZE_SHARES = {
    veryEasy: { 2: 45, 3: 40, 4: 15 },
    easy: { 2: 45, 3: 40, 4: 15 },
    normal: { 2: 30, 3: 35, 4: 25, 5: 10 },
    hard: { 2: 15, 3: 30, 4: 30, 5: 20, 6: 5 },
    expert: { 2: 15, 3: 30, 4: 30, 5: 20, 6: 5 },
    master: { 2: 15, 3: 30, 4: 30, 5: 20, 6: 5 },
    nightmare: { 2: 15, 3: 30, 4: 30, 5: 20, 6: 5 },
    hell1: { 2: 15, 3: 30, 4: 30, 5: 20, 6: 5 },
    hell2: { 2: 15, 3: 30, 4: 30, 5: 20, 6: 5 }
  };
  /**
   * Levels whose cages are tilted towards larger ones on top of the user's slider: the measured +2 (held-out
   * run, docs/report-v2/report-detailed.md section 5.7 (7): old-nightmare hits 24/30 -> 30/30).
   */
  const LARGER_CAGES = Object.freeze({ hell1: 2, hell2: 2 });
  const MIN_TARGET = 2;
  const MAX_TARGET = 6;
  /** A cage that absorbs a leftover cell may grow to this many cells. */
  const MAX_CAGE_CELLS = 7;

  /** The slider of the cage size option. */
  const TILT_MIN = -2;
  const TILT_MAX = 2;

  /** Pale background colours: at most this many classes ('cageColor0' ... 'cageColor4'). */
  const COLOR_KIND = 'cageColor';

  // ---------------------------------------------------------------------------------------------
  // The board without cages
  // ---------------------------------------------------------------------------------------------

  /** Options stored per base model, so that `postGenerate` can read what `build` was given. */
  const optionsOf = new WeakMap();

  /**
   * @param {Object} [opts]  Raw variant options.
   * @returns {{cageSize: number}} Normalised options.
   */
  function normalizeOptions(opts) {
    let tilt = opts && typeof opts.cageSize === 'number' && isFinite(opts.cageSize) ? opts.cageSize : 0;
    tilt = Math.max(TILT_MIN, Math.min(TILT_MAX, Math.round(tilt)));
    return { cageSize: tilt };
  }

  /**
   * Builds the plain 9x9 board of Killer: rows, columns and 3x3 boxes, no cages. It remembers the variant
   * options for `postGenerate`, which receives this very model.
   * @param {Object} [opts]  Raw variant options (`{ cageSize }`).
   * @returns {PuzzleModel}
   */
  function buildBoard(opts) {
    const units = [];
    const unitMeta = [];
    const cellRow = new Int32Array(CELLS);
    const cellCol = new Int32Array(CELLS);
    const cellRegion = new Int32Array(CELLS);
    let r;
    let c;
    for (r = 0; r < DIGITS; r++) {
      for (c = 0; c < DIGITS; c++) {
        const cell = r * DIGITS + c;
        cellRow[cell] = r;
        cellCol[cell] = c;
        cellRegion[cell] = Math.floor(r / BOX) * BOX + Math.floor(c / BOX);
      }
    }
    for (r = 0; r < DIGITS; r++) {
      const cells = [];
      for (c = 0; c < DIGITS; c++) cells.push(r * DIGITS + c);
      units.push(cells);
      unitMeta.push({ kind: 'row', gridIndex: 0, label: 'R' + (r + 1) });
    }
    for (c = 0; c < DIGITS; c++) {
      const cells = [];
      for (r = 0; r < DIGITS; r++) cells.push(r * DIGITS + c);
      units.push(cells);
      unitMeta.push({ kind: 'col', gridIndex: 0, label: 'C' + (c + 1) });
    }
    for (let b = 0; b < DIGITS; b++) {
      const top = Math.floor(b / BOX) * BOX;
      const left = (b % BOX) * BOX;
      const cells = [];
      for (r = 0; r < BOX; r++) {
        for (c = 0; c < BOX; c++) cells.push((top + r) * DIGITS + left + c);
      }
      units.push(cells);
      unitMeta.push({ kind: 'box', gridIndex: 0, label: 'B' + (b + 1) });
    }
    const model = SG.model.create({
      variantId: ID,
      digits: DIGITS,
      cellCount: CELLS,
      units: units,
      unitMeta: unitMeta,
      layout: {
        rows: DIGITS,
        cols: DIGITS,
        cellRow: cellRow,
        cellCol: cellCol,
        cellRegion: cellRegion,
        subGrids: [{ gridIndex: 0, originRow: 0, originCol: 0 }]
      }
    });
    optionsOf.set(model, normalizeOptions(opts));
    return model;
  }

  /**
   * Full grid pre-fill (same idea as classic9): the three boxes on the main diagonal share no row or column,
   * so each can take an independent random permutation and the grid still completes.
   */
  function fastSeedDiagonalBoxes(model, state, rng) {
    const region = model.layout.cellRegion;
    const values = new Array(DIGITS);
    for (let k = 0; k < BOX; k++) {
      for (let i = 0; i < DIGITS; i++) values[i] = i + 1;
      rng.shuffle(values);
      let slot = 0;
      for (let cell = 0; cell < model.cellCount; cell++) {
        if (region[cell] === k * (BOX + 1)) {
          if (!SG.constraints.assign(model, state, cell, values[slot++])) return false;
        }
      }
    }
    return true;
  }

  // ---------------------------------------------------------------------------------------------
  // Geometry helpers
  // ---------------------------------------------------------------------------------------------

  /** Orthogonal neighbours of every cell. */
  const NEIGHBOURS = (function () {
    const out = [];
    for (let cell = 0; cell < CELLS; cell++) {
      const r = Math.floor(cell / DIGITS);
      const c = cell % DIGITS;
      const list = [];
      if (r > 0) list.push(cell - DIGITS);
      if (c > 0) list.push(cell - 1);
      if (c < DIGITS - 1) list.push(cell + 1);
      if (r < DIGITS - 1) list.push(cell + DIGITS);
      out.push(list);
    }
    return out;
  })();

  // ---------------------------------------------------------------------------------------------
  // Cage layout: growth
  // ---------------------------------------------------------------------------------------------

  /**
   * Share of each target size for a level, tilted by the slider: the weight of size s is multiplied by
   * exp(0.55 * tilt * (s - 3.5)), so a positive tilt favours large cages and a negative one small cages.
   * A floor keeps every size available, so that a slider position can add sizes the level itself does not
   * use.
   * @param {string} level
   * @param {number} tilt  -2 .. 2
   * @returns {{sizes: number[], weights: number[]}}
   */
  function sizeDistribution(level, tilt) {
    const shares = SIZE_SHARES[level] || SIZE_SHARES.normal;
    const sizes = [];
    const weights = [];
    for (let s = MIN_TARGET; s <= MAX_TARGET; s++) {
      let w = shares[s] || 0;
      if (tilt !== 0) {
        w += 2 * Math.abs(tilt);
        w *= Math.exp(0.55 * tilt * (s - 3.5));
      }
      if (w > 0) {
        sizes.push(s);
        weights.push(w);
      }
    }
    return { sizes: sizes, weights: weights };
  }

  /**
   * The tilt a level's cages are grown with: the user's slider, plus `LARGER_CAGES` for the hell tiers,
   * clamped to the slider's range (docs/report-v2/report-detailed.md section 5.7 (7)).
   * @param {string} level
   * @param {number} cageSize  The user's slider position, -2 .. 2.
   * @returns {number}
   */
  function tiltFor(level, cageSize) {
    const extra = Object.prototype.hasOwnProperty.call(LARGER_CAGES, level) ? LARGER_CAGES[level] : 0;
    return Math.max(TILT_MIN, Math.min(TILT_MAX, cageSize + extra));
  }

  function pickWeighted(rng, weights) {
    let total = 0;
    for (let i = 0; i < weights.length; i++) total += weights[i];
    let x = rng.next() * total;
    for (let i = 0; i < weights.length; i++) {
      x -= weights[i];
      if (x < 0) return i;
    }
    return weights.length - 1;
  }

  /**
   * Partitions the board into connected groups of cells with pairwise distinct solution values.
   * Cages are grown one after the other; the next one starts at the free cell with the fewest free
   * neighbours (so corners and pockets are used up first and no cell is stranded), and a cage prefers to
   * grow into cells that have few free neighbours for the same reason. A cell that ends up alone is merged
   * into a neighbouring cage when one has room and a digit that differs.
   * @param {ArrayLike<number>} solution
   * @param {Rng} rng
   * @param {{sizes: number[], weights: number[]}} dist
   * @returns {number[][]} Cages as ascending cell lists, ordered by their first cell.
   */
  function growCages(solution, rng, dist) {
    const owner = new Int32Array(CELLS).fill(-1);
    const free = new Int32Array(CELLS);
    for (let c = 0; c < CELLS; c++) free[c] = NEIGHBOURS[c].length;
    const cages = [];
    let assigned = 0;

    function take(cell, cage) {
      owner[cell] = cage;
      assigned++;
      const ns = NEIGHBOURS[cell];
      for (let i = 0; i < ns.length; i++) free[ns[i]]--;
    }

    while (assigned < CELLS) {
      // Start cell: fewest free neighbours, random among ties.
      let best = -1;
      let bestFree = 99;
      let ties = 0;
      for (let c = 0; c < CELLS; c++) {
        if (owner[c] !== -1) continue;
        if (free[c] < bestFree) {
          bestFree = free[c];
          best = c;
          ties = 1;
        } else if (free[c] === bestFree && rng.next() * ++ties < 1) {
          best = c;
        }
      }
      const index = cages.length;
      const cells = [best];
      let used = 1 << (solution[best] - 1);
      take(best, index);
      const target = dist.sizes[pickWeighted(rng, dist.weights)];

      while (cells.length < target) {
        const options = [];
        const weights = [];
        for (let i = 0; i < cells.length; i++) {
          const ns = NEIGHBOURS[cells[i]];
          for (let j = 0; j < ns.length; j++) {
            const nb = ns[j];
            if (owner[nb] !== -1 || (used & (1 << (solution[nb] - 1))) !== 0) continue;
            if (options.indexOf(nb) !== -1) continue;
            options.push(nb);
            weights.push(1 / ((1 + free[nb]) * (1 + free[nb])));
          }
        }
        if (options.length === 0) break;
        const pick = options[pickWeighted(rng, weights)];
        cells.push(pick);
        used |= 1 << (solution[pick] - 1);
        take(pick, index);
      }
      cages.push(cells);
    }

    absorbSingles(cages, owner, solution);
    return normalizeCages(cages);
  }

  /** Merges every one-cell cage into a neighbouring cage that has room and does not hold its digit. */
  function absorbSingles(cages, owner, solution) {
    for (let k = 0; k < cages.length; k++) {
      if (cages[k] === null || cages[k].length !== 1) continue;
      const cell = cages[k][0];
      const bit = 1 << (solution[cell] - 1);
      let target = -1;
      const ns = NEIGHBOURS[cell];
      for (let i = 0; i < ns.length; i++) {
        const other = owner[ns[i]];
        if (other === k || cages[other] === null || cages[other].length >= MAX_CAGE_CELLS) continue;
        if ((digitMask(cages[other], solution) & bit) !== 0) continue;
        if (target === -1 || cages[other].length < cages[target].length) target = other;
      }
      if (target !== -1) {
        cages[target].push(cell);
        owner[cell] = target;
        cages[k] = null;
      }
    }
  }

  function digitMask(cells, solution) {
    let mask = 0;
    for (let i = 0; i < cells.length; i++) mask |= 1 << (solution[cells[i]] - 1);
    return mask;
  }

  /** Drops removed cages, sorts every cage ascending and the cages by their first cell. */
  function normalizeCages(cages) {
    return cages.filter(function (c) { return c !== null; })
      .map(function (c) { return c.slice().sort(function (a, b) { return a - b; }); })
      .sort(function (a, b) { return a[0] - b[0]; });
  }

  // ---------------------------------------------------------------------------------------------
  // Colouring
  // ---------------------------------------------------------------------------------------------

  /**
   * Colours the cages so that cages sharing an edge never share a colour (DSATUR, then a bounded search when
   * the greedy result needs more colours than the palette). Depends on the cages only, so the colouring of a
   * model can always be recomputed.
   * @param {Array<ArrayLike<number>>} cages  Cell lists.
   * @param {number} [palette=4]  Number of colours to try first; the search widens it when it must.
   * @returns {Int32Array} Colour class (0, 1, ...) of every cage.
   */
  function colorCages(cages, palette) {
    const count = cages.length;
    const ownerOf = new Int32Array(CELLS).fill(-1);
    cages.forEach(function (cells, k) {
      for (let i = 0; i < cells.length; i++) ownerOf[cells[i]] = k;
    });
    const adjacent = [];
    for (let k = 0; k < count; k++) adjacent.push(new Set());
    for (let cell = 0; cell < CELLS; cell++) {
      const a = ownerOf[cell];
      if (a < 0) continue;
      const ns = NEIGHBOURS[cell];
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

    for (let colors = palette === undefined ? 4 : palette; colors <= count + 1; colors++) {
      const result = tryColoring(neighbours, colors);
      if (result !== null) return result;
    }
    return new Int32Array(count);
  }

  /** DSATUR with backtracking (bounded), or null when `colors` colours were not enough. */
  function tryColoring(neighbours, colors) {
    const count = neighbours.length;
    const color = new Int32Array(count).fill(-1);
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

  // ---------------------------------------------------------------------------------------------
  // The model with cages
  // ---------------------------------------------------------------------------------------------

  /**
   * Builds the puzzle model for cages with known sums.
   * @param {PuzzleModel} base  The board without cages.
   * @param {Array<{cells: ArrayLike<number>, sum: number}>} list  The cages, in the order they keep in the
   *        model (the colouring depends on it).
   * @returns {PuzzleModel}
   */
  function assemble(base, list) {
    // The first Killer model switches cage propagation on for every solver that works on it.
    SG.comboTable.enablePropagation(ID);
    const cages = list.map(function (cage) { return cage.cells; });
    const colors = colorCages(cages);
    const units = base.units.map(function (u) { return Array.from(u); });
    const unitMeta = base.unitMeta.slice();
    list.forEach(function (cage, k) {
      if (cage.cells.length >= 2) {
        units.push(cage.cells);
        unitMeta.push({ kind: 'cage', gridIndex: 0, label: 'K' + (k + 1), partial: true });
      }
    });
    let colorCount = 0;
    for (let k = 0; k < colors.length; k++) colorCount = Math.max(colorCount, colors[k] + 1);
    const overlays = [];
    for (let c = 0; c < colorCount; c++) {
      const cells = [];
      cages.forEach(function (members, k) {
        if (colors[k] === c) for (let i = 0; i < members.length; i++) cells.push(members[i]);
      });
      overlays.push({ kind: COLOR_KIND + c, cells: cells });
    }
    return SG.model.create({
      variantId: ID,
      digits: DIGITS,
      cellCount: CELLS,
      units: units,
      unitMeta: unitMeta,
      cages: list.map(function (cage) { return { cells: cage.cells, sum: cage.sum, distinct: true }; }),
      layout: {
        rows: base.layout.rows,
        cols: base.layout.cols,
        cellRow: base.layout.cellRow,
        cellCol: base.layout.cellCol,
        cellRegion: base.layout.cellRegion,
        overlays: overlays,
        subGrids: base.layout.subGrids
      }
    });
  }

  /**
   * Builds the puzzle model for a cage layout; each cage gets the sum of the solution over its cells.
   * @param {PuzzleModel} base      The board without cages.
   * @param {number[][]} cages      Cell lists.
   * @param {ArrayLike<number>} solution
   * @returns {PuzzleModel}
   */
  function modelWithCages(base, cages, solution) {
    return assemble(base, cages.map(function (cells) {
      let sum = 0;
      for (let i = 0; i < cells.length; i++) sum += solution[cells[i]];
      return { cells: cells, sum: sum };
    }));
  }

  /**
   * The model of a Killer puzzle whose cages are known: the way back from stored data (an imported puzzle)
   * to a model, with the same units, colours and propagation as a generated one. Cages keep their order, so
   * the colours come out the same as before.
   * @param {Array<{cells: ArrayLike<number>, sum: number}>} cages
   * @returns {PuzzleModel}
   */
  function modelFromCages(cages) {
    return assemble(buildBoard({}), cages.map(function (cage) {
      return { cells: Array.from(cage.cells), sum: cage.sum };
    }));
  }

  // ---------------------------------------------------------------------------------------------
  // Uniqueness check and repair (design.md section 8.2, steps 4 and 5)
  // ---------------------------------------------------------------------------------------------

  /** Search nodes one uniqueness check may use. Nodes, not milliseconds: the outcome stays reproducible. */
  const ANALYSIS_NODES = 30000;
  /** Search nodes all the checks of one layout may use together before the repairs stop. */
  const REPAIR_NODES = 250000;
  /** Layout repairs (split / merge) allowed per level; a level with 0 skips the check altogether. */
  const REPAIR_ATTEMPTS = { veryEasy: 0, easy: 0, normal: 0, hard: 12, expert: 12, master: 12, nightmare: 12,
    hell1: 12, hell2: 12 };
  /** Clues that step (c) may reveal at most. */
  const MAX_REVEALS = 24;
  const SLICE_CODE = 'killer.sliceExpired';

  /**
   * A budget that stops a single analysis after `limit` checks, counts every check in `meter.spent`, and
   * defers to the pipeline's budget (cancellation, time limit).
   */
  function nodeSlice(parent, limit, meter) {
    let used = 0;
    return {
      tick: function () {},
      check: function () {
        if (parent) parent.check();
        meter.spent++;
        if (++used > limit) throw new SG.errors.GenerationError(SLICE_CODE, { nodes: used });
      }
    };
  }

  function sameGrid(a, b) {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  /**
   * Is the puzzle made of the cages and the given clues unique? A second solution is looked for first (cheap
   * when there are many), and only when none turns up are the solutions counted. A generator: it yields
   * after each of its searches, the smallest piece of the work (a search is cut off at `ANALYSIS_NODES`).
   * @returns {Generator<undefined, {unique: boolean, unknown: boolean, alt: ?Int32Array}>}  `alt` is another
   *          solution when one was found, `unknown` is true when the node limit ended the search.
   */
  function* analyseSteps(model, solution, givens, rng, parent, meter) {
    try {
      let alt = null;
      for (let i = 0; i < 2 && alt === null; i++) {
        const slice = nodeSlice(parent, ANALYSIS_NODES, meter);
        const found = SG.dfs.solve(model, givens, rng.fork('alt' + i), slice);
        if (found !== null && !sameGrid(found, solution)) alt = found;
        yield;
      }
      if (alt !== null) return { unique: false, unknown: false, alt: alt };
      const count = SG.dfs.countSolutions(model, givens, 2, nodeSlice(parent, ANALYSIS_NODES, meter));
      yield;
      return { unique: count === 1, unknown: false, alt: null };
    } catch (err) {
      if (err instanceof SG.errors.GenerationError && err.code === SLICE_CODE) {
        return { unique: false, unknown: true, alt: null };
      }
      throw err;
    }
  }

  function isConnected(cells) {
    if (cells.length <= 1) return true;
    const seen = [cells[0]];
    for (let i = 0; i < seen.length; i++) {
      const ns = NEIGHBOURS[seen[i]];
      for (let j = 0; j < ns.length; j++) {
        if (cells.indexOf(ns[j]) !== -1 && seen.indexOf(ns[j]) === -1) seen.push(ns[j]);
      }
    }
    return seen.length === cells.length;
  }

  /** Every way to cut a cell set into two connected parts of at least two cells (cell 0 stays in part A). */
  function bipartitions(cells) {
    const m = cells.length;
    const out = [];
    for (let mask = 0; mask < (1 << (m - 1)); mask++) {
      const a = [cells[0]];
      const b = [];
      for (let i = 1; i < m; i++) (((mask >> (i - 1)) & 1) === 1 ? a : b).push(cells[i]);
      if (a.length >= 2 && b.length >= 2 && isConnected(a) && isConnected(b)) out.push([a, b]);
    }
    return out;
  }

  function sameSet(a, b) {
    return a.length === b.length && a.every(function (c) { return b.indexOf(c) !== -1; });
  }

  function countIn(cells, mask) {
    let n = 0;
    for (let i = 0; i < cells.length; i++) if (mask !== null && mask[cells[i]] === 1) n++;
    return n;
  }

  function differenceMask(alt, solution) {
    if (alt === null) return null;
    const mask = new Uint8Array(CELLS);
    for (let c = 0; c < CELLS; c++) mask[c] = alt[c] !== solution[c] ? 1 : 0;
    return mask;
  }

  /**
   * Repair (a): the cage of at least four cells that overlaps the ambiguous area most is cut into two.
   * Cutting only adds constraints, so the true solution stays valid and the set of solutions can only
   * shrink.
   * @returns {?number[][]} The new layout, or null when no cage has four cells.
   */
  function splitLargeCage(cages, diff, rng) {
    let pick = -1;
    let pickScore = -1;
    for (let k = 0; k < cages.length; k++) {
      if (cages[k].length < 4) continue;
      const score = countIn(cages[k], diff) * 10 + cages[k].length + rng.next();
      if (score > pickScore) {
        pickScore = score;
        pick = k;
      }
    }
    if (pick === -1) return null;
    const options = bipartitions(cages[pick]);
    if (options.length === 0) return null;
    let best = null;
    let bestScore = -1;
    options.forEach(function (parts) {
      const apart = countIn(parts[0], diff) > 0 && countIn(parts[1], diff) > 0 ? 1 : 0;
      const score = Math.min(parts[0].length, parts[1].length) * 2 + apart + rng.next();
      if (score > bestScore) {
        bestScore = score;
        best = parts;
      }
    });
    const next = cages.filter(function (_, k) { return k !== pick; }).concat(best);
    return normalizeCages(next);
  }

  /**
   * Repair (b): two small neighbouring cages in the ambiguous area are merged; the merged cells are then cut
   * again, differently, when that is possible, so that the local structure changes without losing much.
   * @returns {?number[][]} The new layout, or null when no such pair exists.
   */
  function mergeSmallCages(cages, solution, diff, rng) {
    const owner = new Int32Array(CELLS).fill(-1);
    cages.forEach(function (cells, k) { cells.forEach(function (c) { owner[c] = k; }); });
    const pairs = [];
    for (let k = 0; k < cages.length; k++) {
      if (cages[k].length > 3) continue;
      const touching = new Set();
      cages[k].forEach(function (c) {
        NEIGHBOURS[c].forEach(function (nb) { if (owner[nb] > k) touching.add(owner[nb]); });
      });
      touching.forEach(function (j) {
        const union = cages[k].concat(cages[j]);
        if (cages[j].length > 3 || union.length > MAX_CAGE_CELLS) return;
        if (popcountOf(digitMask(union, solution)) !== union.length) return;
        pairs.push({ i: k, j: j, union: union, hit: countIn(union, diff) });
      });
    }
    if (pairs.length === 0) return null;
    pairs.sort(function (a, b) { return b.hit - a.hit; });
    const top = pairs.filter(function (p) { return p.hit === pairs[0].hit; });
    const pair = top[rng.int(top.length)];
    const rest = cages.filter(function (_, k) { return k !== pair.i && k !== pair.j; });
    const cuts = bipartitions(pair.union).filter(function (parts) {
      return !(sameSet(parts[0], cages[pair.i]) || sameSet(parts[0], cages[pair.j]));
    });
    const next = cuts.length > 0 ? rest.concat(cuts[rng.int(cuts.length)]) : rest.concat([pair.union]);
    return normalizeCages(next);
  }

  function popcountOf(mask) {
    return SG.bits.popcount(mask);
  }

  /** The open cell with the most candidates after propagation: the best place for a clue. */
  function mostAmbiguousCell(model, givens) {
    const state = SG.model.initState(model);
    for (let c = 0; c < CELLS; c++) {
      if (givens[c] !== 0 && !SG.constraints.assign(model, state, c, givens[c])) break;
    }
    SG.constraints.propagate(model, state);
    let best = -1;
    let bestCount = 1;
    for (let c = 0; c < CELLS; c++) {
      if (state.value[c] !== 0) continue;
      const k = popcountOf(state.candidates[c]);
      if (k > bestCount) {
        bestCount = k;
        best = c;
      }
    }
    if (best !== -1) return best;
    for (let c = 0; c < CELLS; c++) if (givens[c] === 0) return c;
    return 0;
  }

  /**
   * What the repair of one cage layout did. Stored per model (`SG.killer.layoutInfo`).
   * @typedef {Object} LayoutInfo
   * @property {boolean} checked    False when the level skips the uniqueness check.
   * @property {?boolean} unique    The cages alone give a single solution (null when not checked; false
   *           also when the node limit ended the search).
   * @property {string[]} repairs   'split' | 'merge' per repair step, in order.
   * @property {number[]} revealed  Cells that step (c) revealed so that the layout plus these clues is
   *           unique. When the layout search of the levels from expert on moved cages, the cells of the
   *           clues it kept the moved layout unique with: these, completed to whole symmetry groups.
   * @property {number} nodes       Search nodes spent on the checks of this layout.
   * @property {number} [cageCount] Cages of the final layout (set by `postGenerate`).
   */

  /**
   * Checks that the cage layout alone has one solution and repairs it when it does not (design.md 8.2
   * step 5): (a) cut a large cage in the ambiguous area, else (b) merge small neighbours there, and when
   * that is exhausted or the attempts are used up, (c) reveal clues at the most ambiguous cells.
   * @param {PuzzleModel} base      The board without cages.
   * @param {ArrayLike<number>} solution
   * @param {number[][]} cages      The layout to check, as cell lists.
   * @param {string} level          Sets how many repairs are allowed (0 for the two easiest levels and
   *        normal, whose puzzles keep far more clues than any ambiguity needs, so the check is skipped).
   * @param {Rng} rng
   * @param {?Object} [parent]      The pipeline's budget.
   * @param {{repair: function(string, number, number): void}} [report]  Called once per repair step with
   *        (action, attempt, cage count).
   * @returns {{cages: number[][], info: LayoutInfo}}
   */
  function repairLayout(base, solution, cages, level, rng, parent, report) {
    return SG.budget.drive(repairLayoutSteps(base, solution, cages, level, rng, parent, report));
  }

  /**
   * The resumable form of `repairLayout`: a generator that returns what it returns. It yields after each
   * model it assembles and after each search of the uniqueness checks, the pieces of the work that cannot be
   * cut any finer (a search is limited to `ANALYSIS_NODES`). Same random draws, same result.
   * @returns {Generator<undefined, {cages: number[][], info: LayoutInfo}>}
   */
  function* repairLayoutSteps(base, solution, cages, level, rng, parent, report) {
    const notify = report || { repair: function () {} };
    const attempts = REPAIR_ATTEMPTS[level] || 0;
    const info = { checked: attempts > 0, unique: null, repairs: [], revealed: [], nodes: 0 };
    if (attempts === 0) return { cages: cages, info: info };

    const meter = { spent: 0 };
    const zero = new Int32Array(CELLS);
    let layout = cages;
    let model = modelWithCages(base, layout, solution);
    yield;
    let result = yield* analyseSteps(model, solution, zero, rng.fork('check0'), parent, meter);
    const scoreOf = function (r) { return r.unique ? -1 : r.alt ? differenceCount(r.alt, solution) : 1000; };
    let best = { cages: layout, model: model, result: result, score: scoreOf(result) };

    for (let attempt = 1; attempt <= attempts && !result.unique; attempt++) {
      if (meter.spent > REPAIR_NODES) break;
      const step = rng.fork('repair' + attempt);
      const diff = differenceMask(result.alt, solution);
      let next = splitLargeCage(layout, diff, step);
      let action = 'split';
      if (next === null) {
        next = mergeSmallCages(layout, solution, diff, step);
        action = 'merge';
      }
      if (next === null) break;
      layout = next;
      info.repairs.push(action);
      notify.repair(action, attempt, layout.length);
      model = modelWithCages(base, layout, solution);
      yield;
      result = yield* analyseSteps(model, solution, zero, step.fork('check'), parent, meter);
      const score = scoreOf(result);
      if (score <= best.score) best = { cages: layout, model: model, result: result, score: score };
    }

    layout = best.cages;
    model = best.model;
    info.unique = best.result.unique;
    if (!best.result.unique) {
      // (c) Reveal clues where the puzzle is most ambiguous until the cages plus the clues are unique.
      const givens = new Int32Array(CELLS);
      for (let r = 0; r < MAX_REVEALS; r++) {
        const check = yield* analyseSteps(model, solution, givens, rng.fork('reveal' + r), parent, meter);
        if (check.unique) break;
        const cell = mostAmbiguousCell(model, givens);
        givens[cell] = solution[cell];
        info.revealed.push(cell);
        notify.repair('reveal', info.repairs.length + info.revealed.length, layout.length);
      }
    }
    info.nodes = meter.spent;
    return { cages: layout, info: info };
  }

  function differenceCount(alt, solution) {
    let n = 0;
    for (let c = 0; c < CELLS; c++) if (alt[c] !== solution[c]) n++;
    return n;
  }

  // ---------------------------------------------------------------------------------------------
  // Structure search (rating v2, docs/report-v2/report-detailed.md section 5.7 (6))
  // ---------------------------------------------------------------------------------------------

  /** Proposed cage moves and full ratings the structure search of one attempt may use at most. */
  const SEARCH_PROPOSALS = 8192;
  const SEARCH_RATINGS = 256;

  function ownerOf(layout) {
    const owner = new Int32Array(CELLS).fill(-1);
    layout.forEach(function (cells, k) { cells.forEach(function (c) { owner[c] = k; }); });
    return owner;
  }

  /**
   * Local search on the cage layout, before the cells are dug (the structure phase, so the Generation Steps
   * replay digs on the final cages). Only for the levels from expert on, and only when the layout - with
   * the digits the repair had to reveal (`revealed`, none for a layout that is unique on its own), completed
   * to whole groups of the symmetry the dig uses, so that the dig can end on exactly these clues - is
   * unique, completely rated, and too easy for the band (score below its minimum): Killer's puzzles of those
   * levels end with a handful of clues, so a layout that is too easy cannot reach the band by digging. A move
   * merges two neighbouring cages or hands a boundary cell to the neighbouring cage (cages stay connected,
   * digit-distinct, of 2 to `MAX_CAGE_CELLS` cells); it is kept iff the puzzle (layout and those clues)
   * stays unique with a complete proof and its score does not decrease and stays below the band maximum. A
   * candidate is rated first: a complete proof that needs no technique assuming uniqueness proves uniqueness
   * by itself (`SG.difficulty.provesUniqueness`), so a solution count only runs for the rare proof that
   * does. Every rating and every count is one piece of at most `ANALYSIS_NODES` checks, like the searches
   * of the layout check: a candidate that needs more is dropped (2 to 3 % of them, nearly all far above the
   * band), which keeps the slices of a cooperative run short. The search stops on entering the band or when
   * its caps (`SEARCH_PROPOSALS`, `SEARCH_RATINGS`, and the caps of the attempt, `ctx.caps`) are used up.
   * Deterministic: counts, not time. The dig that follows starts from the full grid as always; when the
   * layout ends inside the band, the dig keeps those clues (`kept`, see `digKiller`), so it can end on the
   * puzzle the search rated instead of on other, usually easier clues. Every unique, completely rated layout
   * it meets - kept or not, above the band too - is offered to the keeper of the run (`ctx.keeper`, see
   * `SG.digger.generate`, which counts the solutions of a candidate before it keeps it, whatever its proof
   * claims) with a dig log that removes every other symmetry group from the solution, so the
   * generator can return the closest one when no sample reaches the band. Every rating goes through
   * `SG.digger.rateCounted`, which counts it toward the full-rating cap of the attempt.
   * @returns {Generator<undefined, {cages: number[][], kept: number[]}>} The layout to use, and the cells
   *          the dig keeps (empty unless the layout with its clues was rated inside the band); `clueCells`:
   *          the cells of those clues and `moved`: whether a move was kept (the layout is then unique with
   *          `clueCells`, which `postGenerate` records as the revealed cells of the layout).
   */
  function* searchCagesSteps(base, solution, cages, revealed, spec, rng, ctx, info) {
    const caps = ctx.caps;
    const from = SG.difficulty.bandOf('expert').min;
    if (!caps || !spec || !(spec.min >= from)) return { cages: cages, kept: [], clueCells: [], moved: false };
    const keeper = ctx.keeper || null;
    const clues = new Int32Array(CELLS);
    const clueCells = [];
    const groups = SG.symmetry.groups(base, ctx.symmetry || spec.symmetryDefault);
    const groupOf = new Int32Array(CELLS).fill(-1);
    groups.forEach(function (g, k) { g.forEach(function (c) { groupOf[c] = k; }); });
    for (let i = 0; i < revealed.length; i++) {
      groups[groupOf[revealed[i]]].forEach(function (c) {
        if (clues[c] !== 0) return;
        clues[c] = solution[c];
        clueCells.push(c);
      });
    }
    clueCells.sort(function (a, b) { return a - b; });
    function result(layout, rating) {
      const inBand = rating !== null && rating.solved === true && rating.score >= spec.min &&
        rating.score < spec.max;
      return { cages: layout, kept: inBand ? clueCells : [], clueCells: clueCells, moved: layout !== cages };
    }
    /** The dig log of a layout's puzzle: every symmetry group without a clue is removed from the solution. */
    function logOfClues() {
      const log = [{ op: 'pass', pass: 'random', clues: CELLS }];
      groups.forEach(function (g) {
        if (clues[g[0]] === 0) log.push({ op: 'accept', cells: Array.from(g) });
      });
      return log;
    }
    /** Offers the puzzle of a unique, completely rated layout to the keeper of the run. */
    function offer(model, layoutCells, r) {
      if (keeper === null) return;
      const kept = keeper.offer({
        model: model, givens: clues, solution: solution, rating: r, logOf: logOfClues
      });
      if (kept && info) {
        infoOf.set(model, Object.assign({}, info, {
          repairs: info.repairs.slice(),
          revealed: layoutCells !== cages && clueCells.length > 0 ? clueCells.slice() : info.revealed.slice(),
          cageCount: layoutCells.length
        }));
      }
    }
    const meter = { spent: 0 };
    /** Runs one guarded piece; null when it needed more than `ANALYSIS_NODES` checks. */
    function guarded(fn) {
      try {
        return fn(nodeSlice(ctx.budget, ANALYSIS_NODES, meter));
      } catch (err) {
        if (err instanceof SG.errors.GenerationError && err.code === SLICE_CODE) return null;
        throw err;
      }
    }
    /**
     * A full rating, counted toward the cap of the attempt; null when the cap is used up or the piece needed
     * more than `ANALYSIS_NODES` checks.
     */
    function rate(model) {
      return guarded(function (slice) { return SG.digger.rateCounted(model, clues, slice, caps); });
    }
    /** Unique by its own proof, or by a solution count (one more guarded piece, see `needsCount`). */
    function needsCount(r) {
      return !SG.difficulty.provesUniqueness(r);
    }
    function counted(model) {
      return guarded(function (slice) { return SG.dfs.countSolutions(model, clues, 2, slice); }) === 1;
    }
    function exhausted(proposals, ratings) {
      return proposals >= SEARCH_PROPOSALS || ratings >= SEARCH_RATINGS ||
        caps.proposals >= caps.maxProposals || caps.ratings >= caps.maxRatings;
    }
    let layout = cages;
    const start = modelWithCages(base, layout, solution);
    let rating = rate(start);
    let ratings = 1;
    let proposals = 0;
    yield;
    if (rating === null || rating.solved !== true) return result(layout, null);
    if (needsCount(rating)) {
      const unique = counted(start);
      yield;
      if (!unique) return result(layout, null);
    }
    offer(start, layout, rating);
    // Already inside the band (its clues are kept) or above it: nothing to search.
    if (rating.score >= spec.min) return result(layout, rating);
    while (rating.score < spec.min && !exhausted(proposals, ratings)) {
      proposals++;
      caps.proposals++;
      const owner = ownerOf(layout);
      const c = rng.int(CELLS);
      const nbrs = NEIGHBOURS[c].filter(function (d) { return owner[d] !== owner[c]; });
      if (nbrs.length === 0) continue;
      const d = nbrs[rng.int(nbrs.length)];
      const a = owner[c];
      const b = owner[d];
      let next;
      if (rng.next() < 0.5) {
        const merged = layout[a].concat(layout[b]);
        if (merged.length > MAX_CAGE_CELLS ||
            popcountOf(digitMask(merged, solution)) !== merged.length) continue;
        next = layout.filter(function (cells, k) { return k !== a && k !== b; }).concat([merged]);
      } else {
        const into = layout[a].concat([d]);
        const rest = layout[b].filter(function (x) { return x !== d; });
        if (rest.length < 2 || into.length > MAX_CAGE_CELLS ||
            popcountOf(digitMask(into, solution)) !== into.length || !isConnected(rest)) continue;
        next = layout.map(function (cells, k) { return k === a ? into : k === b ? rest : cells; });
      }
      next = normalizeCages(next);
      const model = modelWithCages(base, next, solution);
      ratings++;
      const r = rate(model);
      yield;
      if (r === null || r.solved !== true) continue;
      const move = r.score >= rating.score && r.score < spec.max;
      const closer = keeper !== null && keeper.closer(r);
      if (!move && !closer) continue;
      if (needsCount(r)) {
        const unique = counted(model);
        yield;
        if (!unique) continue;
      }
      if (closer) offer(model, next, r);
      if (!move) continue;
      layout = next;
      rating = r;
    }
    return result(layout, rating);
  }

  // ---------------------------------------------------------------------------------------------
  // Pipeline hook
  // ---------------------------------------------------------------------------------------------

  /** Event key of each repair step. */
  const REPAIR_EVENT = {
    split: 'extraStructure.repairSplit',
    merge: 'extraStructure.repairMerge',
    reveal: 'extraStructure.repairReveal'
  };

  /** What `postGenerate` found out per returned model. */
  const infoOf = new WeakMap();
  /** Per returned model: the cells its dig keeps (the clues the layout search rated inside the band). */
  const keepOf = new WeakMap();

  /**
   * Pipeline hook (step 4, 'extraStructure'): grows the cages from the full grid, checks and repairs the
   * layout, colours it, and returns the model that has the cages.
   *
   * It is `postGenerate.steps` driven to its end. `steps` is the resumable twin that
   * `SG.digger.generateSteps` uses when it runs in slices: a generator with the same argument and result
   * that yields between the pieces of the layout work (see `repairLayoutSteps`); the longest piece left is
   * one search of at most `ANALYSIS_NODES` nodes. Events, random draws and the model are the same.
   * @param {Object} ctx  `{ model, solution, rng, level, spec, attempt, budget, emit, variantId, caps,
   *        symmetry }`.
   * @returns {PuzzleModel} The model with cages.
   */
  function postGenerate(ctx) {
    return SG.budget.drive(postGenerateSteps(ctx));
  }

  function* postGenerateSteps(ctx) {
    const em = SG.events.toEmitter(ctx.emit);
    const base = ctx.model;
    const opts = optionsOf.get(base) || normalizeOptions({});
    let cages = growCages(ctx.solution, ctx.rng.fork('grow'),
      sizeDistribution(ctx.level, tiltFor(ctx.level, opts.cageSize)));
    yield;

    const report = {
      repair: function (action, attempt, count) {
        em.step('extraStructure', 'progress', REPAIR_EVENT[action], { attempt: attempt, cages: count });
      }
    };
    const repaired = yield* repairLayoutSteps(base, ctx.solution, cages, ctx.level, ctx.rng.fork('repair'),
      ctx.budget, report);
    // Rating v2: the levels from expert on search the layout itself before the cells are dug.
    const searched = yield* searchCagesSteps(base, ctx.solution, repaired.cages, repaired.info.revealed,
      ctx.spec, ctx.rng.fork('search'), ctx, repaired.info);
    cages = searched.cages;
    // The moved layout is unique with the revealed digits completed to whole symmetry groups.
    if (searched.moved && searched.clueCells.length > 0) repaired.info.revealed = searched.clueCells.slice();
    const model = modelWithCages(base, cages, ctx.solution);
    repaired.info.cageCount = cages.length;
    infoOf.set(model, repaired.info);
    if (searched.kept.length > 0) keepOf.set(model, searched.kept);

    let smallest = CELLS;
    let largest = 0;
    cages.forEach(function (c) {
      smallest = Math.min(smallest, c.length);
      largest = Math.max(largest, c.length);
    });
    em.step('extraStructure', 'progress', 'extraStructure.cages', {
      cages: cages.length, minSize: smallest, maxSize: largest, colors: model.layout.overlays.length
    });
    if (repaired.info.checked) {
      const repairs = repaired.info.repairs.length;
      if (repaired.info.unique) {
        em.step('extraStructure', 'progress', 'extraStructure.unique', { repairs: repairs });
      } else {
        em.step('extraStructure', 'progress', 'extraStructure.ambiguous', {
          repairs: repairs, revealed: repaired.info.revealed.length
        });
      }
    }
    return model;
  }

  postGenerate.steps = postGenerateSteps;

  /**
   * Clue floor of the digger per level, declared as the `clueFloor` of the variant so that
   * `spec().minClues` (and with it invariant I6) is the same number. Only 'veryEasy' has one: the score band
   * of that level is so low that a puzzle needs about 40 clues to stay inside it (singles are scored per
   * placement, and an empty cell adds to the score), so the digger must not dig below what the band allows.
   * Every other level digs as far as the score band and the techniques of the level permit, which leaves a
   * Killer puzzle with a handful of clues (floor 0).
   */
  const MIN_CLUES = Object.freeze({ veryEasy: 40 });

  /**
   * Dig strategy of Killer: the generic cell digger, tuned to cages. The clue floors of classic Sudoku (34
   * clues for 'easy', 2 clues per unit, ...) describe a Sudoku with no cages and are dropped (`clueFloor`,
   * `minCluesPerUnit: 0`); the guided stage runs at every level, because the score band is what stops the
   * dig at the two easiest levels. When the layout search rated the layout inside the band with a few clues
   * (`searchCagesSteps`), the dig keeps those clues (`rejected` of `SG.digger.digStage`), so it can end on
   * that puzzle.
   */
  function digKiller(model, solution, level, rng, options) {
    SG.comboTable.enablePropagation(ID);
    const settings = { minCluesPerUnit: 0, guided: true };
    if (keepOf.has(model)) {
      const keep = options && options.rejected ? Uint8Array.from(options.rejected) : new Uint8Array(CELLS);
      keepOf.get(model).forEach(function (c) { keep[c] = 1; });
      settings.rejected = keep;
    }
    return SG.digger.digStage(model, solution, level, rng, Object.assign({}, options, settings));
  }

  // ---------------------------------------------------------------------------------------------
  // Helpers for the renderer and the tests
  // ---------------------------------------------------------------------------------------------

  /**
   * Cage data in the form a renderer wants.
   * @param {PuzzleModel} model  A Killer model with cages.
   * @returns {Array<{index: number, cells: number[], sum: number, size: number, color: number,
   *          labelCell: number}>}  `labelCell` is the top-left cell, where the sum is written; `color` is the
   *          pale background class (0..4) from the `cageColor<k>` overlays, -1 when the model has none.
   */
  function describeCages(model) {
    const colorOf = new Int32Array(model.cellCount).fill(-1);
    model.layout.overlays.forEach(function (overlay) {
      const m = /^cageColor(\d+)$/.exec(overlay.kind);
      if (m === null) return;
      for (let i = 0; i < overlay.cells.length; i++) colorOf[overlay.cells[i]] = Number(m[1]);
    });
    const row = model.layout.cellRow;
    const col = model.layout.cellCol;
    return model.cages.map(function (cage, k) {
      let label = cage.cells[0];
      for (let i = 1; i < cage.cells.length; i++) {
        const c = cage.cells[i];
        if (row[c] < row[label] || (row[c] === row[label] && col[c] < col[label])) label = c;
      }
      return {
        index: k,
        cells: Array.from(cage.cells),
        sum: cage.sum,
        size: cage.cells.length,
        color: colorOf[label],
        labelCell: label
      };
    });
  }

  /**
   * What the cage layout repair did for a model that `postGenerate` returned.
   * @param {PuzzleModel} model
   * @returns {?LayoutInfo}  null for any other model.
   */
  function layoutInfo(model) {
    return infoOf.get(model) || null;
  }

  /** Schema of the variant options, for the generated control panel. */
  const OPTIONS = Object.freeze([Object.freeze({
    id: 'cageSize',
    type: 'slider',
    min: TILT_MIN,
    max: TILT_MAX,
    step: 1,
    default: 0,
    i18nKey: 'variant.killer.cageSize',
    hintKey: 'variant.killer.cageSize.hint',
    minLabelKey: 'variant.killer.cageSize.small',
    maxLabelKey: 'variant.killer.cageSize.large',
    defaultLabelKey: 'variant.killer.cageSize.auto'
  })]);

  SG.killer = {
    ID: ID,
    OPTIONS: OPTIONS,
    COLOR_KIND: COLOR_KIND,
    sizeDistribution: sizeDistribution,
    tiltFor: tiltFor,
    buildBoard: buildBoard,
    growCages: growCages,
    repairLayout: repairLayout,
    repairLayoutSteps: repairLayoutSteps,
    colorCages: colorCages,
    modelWithCages: modelWithCages,
    modelFromCages: modelFromCages,
    describeCages: describeCages,
    layoutInfo: layoutInfo
  };

  // ---------------------------------------------------------------------------------------------
  // Registration: dig strategy, event vocabulary, translations, variant
  // ---------------------------------------------------------------------------------------------

  try {
    SG.digger.getStrategy(ID);
  } catch (err) {
    SG.digger.registerStrategy(ID, digKiller);
  }

  // The variant adds events of its own to step 4. The core keeps the list of valid events in
  // SG.events.VOCABULARY, which is plain data meant to be read by the UI and the tests, so they are
  // listed there.
  [
    ['extraStructure.cages', ['cages', 'minSize', 'maxSize', 'colors']],
    ['extraStructure.repairSplit', ['attempt', 'cages']],
    ['extraStructure.repairMerge', ['attempt', 'cages']],
    ['extraStructure.repairReveal', ['attempt', 'cages']],
    ['extraStructure.unique', ['repairs']],
    ['extraStructure.ambiguous', ['repairs', 'revealed']]
  ].forEach(function (row) {
    const vocabulary = SG.events && SG.events.VOCABULARY;
    if (Array.isArray(vocabulary) && !vocabulary.some(function (v) { return v.key === row[0]; })) {
      vocabulary.push({
        type: 'step', stepId: 'extraStructure', phase: 'progress', key: row[0], level: 'summary',
        args: row[1], patch: []
      });
    }
  });

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'variant.killer': 'Killer Sudoku',
      'variant.killer.cageSize': 'Cage size',
      'variant.killer.cageSize.hint': 'Small cages are easier to read, large cages call for more ' +
        'reasoning.\n\n**By difficulty**: keeps the cage size of the chosen level.',
      'variant.killer.cageSize.small': 'Smaller',
      'variant.killer.cageSize.large': 'Larger',
      'variant.killer.cageSize.auto': 'By difficulty',
      'technique.cageCombo': 'Cage Sum Combination',
      'technique.cageCombo.step': 'A cage with sum {sum} over {size} cells ({cells}) can only be ' +
        'written with the digits {digits}. Every other candidate in it is impossible, and a digit that ' +
        'the cage must contain ({forced}) is removed from the other cells of any row, column or box ' +
        'that holds all of its possible places.',
      'technique.ruleOf45': 'Rule of 45',
      'technique.ruleOf45.step': 'Rule of 45 on {units}: every unit holds the digits 1 to 9 once, so ' +
        'after subtracting the cages that lie entirely inside, the cells {cells} must add up to {sum}. ' +
        'Candidates that cannot reach that sum are removed.',
      'technique.ruleOf45.place': 'Rule of 45 on {units}: after subtracting the cages that lie ' +
        'entirely inside, the last open cell {cell} has to make up the remaining {sum}, so it is ' +
        '{digit}.',
      'technique.cageSplit': 'Cage Splitting',
      'technique.cageSplit.step': 'The cage with sum {sum} sticks out of {units} and splits in two: ' +
        'the cells {part} (inside) add up to {partSum} and can only use the digits {partDigits}; the ' +
        'cells {rest} (outside) add up to {restSum} and can only use the digits {restDigits}. Other ' +
        'candidates are removed.',
      'extraStructure.cages': 'Cages built: {cages} cages of {minSize} to {maxSize} cells, painted ' +
        'with {colors} pale colours so that neighbouring cages differ.',
      'extraStructure.repairSplit': 'Repair {attempt}: a large cage is split in two where the puzzle ' +
        'is still ambiguous ({cages} cages now).',
      'extraStructure.repairMerge': 'Repair {attempt}: two small neighbouring cages are regrouped ' +
        '({cages} cages now).',
      'extraStructure.repairReveal': 'Repair {attempt}: one digit is revealed in the most ambiguous ' +
        'cell.',
      'extraStructure.unique': 'The cages alone leave a single solution ({repairs} repairs).',
      'extraStructure.ambiguous': 'The cages alone leave more than one solution; {revealed} digits ' +
        'are revealed to settle it ({repairs} repairs).'
    },
    vi: {
      'variant.killer': 'Sudoku Sát thủ',
      'variant.killer.cageSize': 'Cỡ lồng',
      'variant.killer.cageSize.hint': 'Lồng nhỏ dễ đọc hơn, lồng lớn đòi hỏi suy luận nhiều hơn.\n\n' +
        '**Theo độ khó**: giữ nguyên cỡ lồng của mức độ đã chọn.',
      'variant.killer.cageSize.small': 'Nhỏ hơn',
      'variant.killer.cageSize.large': 'Lớn hơn',
      'variant.killer.cageSize.auto': 'Theo độ khó',
      'technique.cageCombo': 'Tổ hợp tổng lồng',
      'technique.cageCombo.step': 'Lồng có tổng {sum} gồm {size} ô ({cells}) chỉ có thể viết bằng ' +
        'các chữ số {digits}. Mọi ứng viên khác trong lồng đều không thể xảy ra, và chữ số bắt buộc ' +
        'phải có trong lồng ({forced}) bị loại khỏi các ô còn lại của hàng, cột hoặc khối chứa toàn ' +
        'bộ vị trí khả dĩ của nó.',
      'technique.ruleOf45': 'Quy tắc 45',
      'technique.ruleOf45.step': 'Quy tắc 45 trên {units}: mỗi nhóm chứa đủ các chữ ' +
        'số từ 1 đến 9 (tổng 45), nên sau khi trừ các lồng nằm trọn bên trong, các ô {cells} phải có ' +
        'tổng bằng {sum}. Những ứng viên không thể đạt được tổng đó bị loại.',
      'technique.ruleOf45.place': 'Quy tắc 45 trên {units}: sau khi trừ các lồng nằm trọn bên trong, ' +
        'ô còn lại {cell} phải bù đúng phần còn thiếu là {sum}, nên ô này là {digit}.',
      'technique.cageSplit': 'Tách lồng',
      'technique.cageSplit.step': 'Lồng có tổng {sum} nhô ra khỏi {units} nên tách được làm hai ' +
        'phần: các ô {part} (bên trong) có tổng {partSum} và chỉ dùng được các chữ số {partDigits}; ' +
        'các ô {rest} (bên ngoài) có tổng {restSum} và chỉ dùng được các chữ số {restDigits}. Các ứng ' +
        'viên khác bị loại.',
      'extraStructure.cages': 'Đã dựng {cages} lồng, mỗi lồng từ {minSize} đến {maxSize} ô, tô ' +
        '{colors} màu nhạt sao cho các lồng kề nhau khác màu.',
      'extraStructure.repairSplit': 'Sửa lần {attempt}: tách một lồng lớn thành hai ở vùng còn nhiều ' +
        'đáp án ({cages} lồng).',
      'extraStructure.repairMerge': 'Sửa lần {attempt}: gộp lại hai lồng nhỏ kề nhau ({cages} lồng).',
      'extraStructure.repairReveal': 'Sửa lần {attempt}: lộ một chữ số ở ô còn nhiều khả năng nhất.',
      'extraStructure.unique': 'Chỉ riêng các lồng đã cho đúng một lời giải (sau {repairs} lần sửa).',
      'extraStructure.ambiguous': 'Chỉ riêng các lồng vẫn còn nhiều lời giải; cần lộ {revealed} chữ ' +
        'số để chốt đáp án (sau {repairs} lần sửa).'
    }
  });

  if (!SG.variants.has(ID)) {
    SG.variants.register({
      id: ID,
      i18nKey: 'variant.killer',
      group: 'killer',
      digits: DIGITS,
      // Measured (`node tests/qualify.js`, docs/report-v2/qualification.md): all nine levels.
      difficultySupport: ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1',
        'hell2'],
      defaultSymbolMode: 'digits',
      symbolModes: ['digits', 'letters', 'colors', 'shapes'],
      options: OPTIONS,
      clueFloor: MIN_CLUES,
      build: function build(opts) { return buildBoard(opts); },
      postGenerate: postGenerate,
      digStrategy: ID,
      fastSeed: fastSeedDiagonalBoxes
    });
  }
})(typeof self !== 'undefined' ? self : globalThis);
