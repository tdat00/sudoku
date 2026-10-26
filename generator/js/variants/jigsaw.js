/**
 * Jigsaw (irregular / nonomino) Sudoku: `jigsaw9`. A normal 9x9 Sudoku whose boxes are replaced by nine
 * connected regions of nine cells. A region is just another unit of the model, so no solver, technique or
 * digger knows about this variant; this file only produces a good partition and wraps it into a model.
 *
 * Layout generation: seeded growth with backtracking.
 *   1. One seed per row, in distinct columns and spread evenly (one in each 3x3 box of the classic layout).
 *   2. Repeatedly the smallest region takes one free neighbour cell. A move is legal only when the remaining
 *      free space can still be absorbed by the unfinished regions (`isFeasible`). Among the legal moves one
 *      is drawn with a weight that favours cells with few free neighbours (no isolated pockets) and, through
 *      the `compactness` option, cells that touch the region on many sides.
 *   3. When the smallest region has no legal move the last move is undone and its next candidate tried; after
 *      `maxBacktracks` undone moves the attempt is dropped and a new one starts from fresh seeds.
 *   4. A finished partition must have nine connected regions of nine cells (none a bare row or column) and
 *      the board must have a solution: `SG.fullGrid.generate` runs with a small node budget. Not every
 *      partition has a solution, so this check is mandatory; failing it (or exhausting the budget) is a dead
 *      end. A partition that the plain search of `SG.model.validate` cannot solve within 5000 nodes is
 *      dropped too (`solvesPlainly`).
 *
 * Everything is driven by the rng and by node counts only, never the clock, so a seed gives the same layout
 * on every machine.
 *
 * Renderer note: `model.layout.cellRegion[c]` is the region number (0..8, in reading order of the first cell)
 * of cell c; a thick border belongs on every edge between different regions and on the grid's outer edge.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  const SIZE = 9;

  const DEFAULT_COMPACTNESS = 0.6;

  /** Undone moves per growth attempt before the attempt is dropped and the seeds are drawn again. */
  const DEFAULT_MAX_BACKTRACKS = 60;

  /** Growth attempts before `generateRegions` gives up with 'jigsaw.layoutFailed'. */
  const DEFAULT_MAX_ATTEMPTS = 200;

  /**
   * Budget of the solvability check: search nodes, and failed guesses per restart. Small restarts matter: a
   * solvable layout can trap one unlucky search for a long time but nearly always yields to a fresh start
   * (on 400 layouts: 6 % out of nodes with the full grid generator's restart size, under 1 % with this one).
   */
  const SOLVE_NODES = 4000;
  const SOLVE_RESTART = 200;

  /** Node budget of the plain depth-first search that a layout must also pass (see `solvesPlainly`). */
  const PLAIN_SOLVE_NODES = 5000;

  /** Rng used when `build` gets no rng at all, so that a bare `build({})` is reproducible. */
  const FALLBACK_SEED = 0x4a16;

  /** Random seed placements tried before the even spread is given up (about 1 in 8 qualifies for 9x9). */
  const SEED_TRIES = 200;

  /** `isFeasible` runs its (dear) end game matching only when at most this many cells per `size` are free. */
  const MATCH_FREE_PER_SIZE = 4;

  /** `isFeasible` checks every group of free fragments (Hall's condition) up to this many fragments. */
  const HALL_MAX_FRAGMENTS = 10;

  /**
   * Weight of a candidate cell: exp(shape * touch) * POCKET_PENALTY^(free neighbours), where `touch` is the
   * number of neighbours already in the growing region plus DIAGONAL_WEIGHT per owned diagonal neighbour, and
   * shape = SHAPE_GAIN * (compactness - SHAPE_NEUTRAL). Above the neutral compactness cells touching the
   * region on many sides win (rounded regions); below it they lose (winding regions). Calibrated so the mean
   * region perimeter falls steadily from compactness 0 to 1 (about 17 to 15 on 9x9; a 3x3 block has 12).
   */
  const SHAPE_GAIN = 4;
  const SHAPE_NEUTRAL = 0.2;
  const DIAGONAL_WEIGHT = 0.5;

  /** Weight factor per free neighbour of a candidate: cells with few free neighbours go first. */
  const POCKET_PENALTY = 0.7;

  function fail(code, args) {
    return new SG.errors.GenerationError(code, args);
  }

  /**
   * Checks that `cellRegion` partitions a size x size grid into `size` connected regions of `size` cells,
   * none of which is a bare row or column (it would only repeat a row or column unit).
   * @returns {string[]} Problems found; empty when the layout is well formed.
   */
  function checkRegions(cellRegion, size) {
    size = size === undefined ? SIZE : size;
    const n = size * size;
    const problems = [];
    if (cellRegion.length !== n) return ['expected ' + n + ' cells, got ' + cellRegion.length];

    const count = new Array(size).fill(0);
    const minRow = new Array(size).fill(size);
    const maxRow = new Array(size).fill(-1);
    const minCol = new Array(size).fill(size);
    const maxCol = new Array(size).fill(-1);
    let c;
    for (c = 0; c < n; c++) {
      const g = cellRegion[c];
      if (!(Number.isInteger(g) && g >= 0 && g < size)) {
        problems.push('cell ' + c + ' has the invalid region ' + g);
        return problems;
      }
      const r = Math.floor(c / size);
      const col = c % size;
      count[g]++;
      if (r < minRow[g]) minRow[g] = r;
      if (r > maxRow[g]) maxRow[g] = r;
      if (col < minCol[g]) minCol[g] = col;
      if (col > maxCol[g]) maxCol[g] = col;
    }
    for (let g = 0; g < size; g++) {
      if (count[g] !== size) problems.push('region ' + g + ' has ' + count[g] + ' cells, expected ' + size);
      else if (minRow[g] === maxRow[g] || minCol[g] === maxCol[g]) {
        problems.push('region ' + g + ' is a bare row or column');
      }
    }
    if (problems.length > 0) return problems;

    // Connectivity: flood fill from the first cell of each region.
    const seen = new Uint8Array(n);
    const stack = new Int32Array(n);
    for (let g = 0; g < size; g++) {
      let start = 0;
      while (cellRegion[start] !== g) start++;
      let top = 0;
      let reached = 0;
      stack[top++] = start;
      seen[start] = 1;
      while (top > 0) {
        const cell = stack[--top];
        reached++;
        const r = Math.floor(cell / size);
        const col = cell % size;
        if (r > 0) top = visit(cell - size, g, cellRegion, seen, stack, top);
        if (r < size - 1) top = visit(cell + size, g, cellRegion, seen, stack, top);
        if (col > 0) top = visit(cell - 1, g, cellRegion, seen, stack, top);
        if (col < size - 1) top = visit(cell + 1, g, cellRegion, seen, stack, top);
      }
      if (reached !== size) {
        problems.push('region ' + g + ' is not connected (' + reached + ' of ' + size + ')');
      }
    }
    return problems;
  }

  function visit(cell, g, cellRegion, seen, stack, top) {
    if (seen[cell] === 0 && cellRegion[cell] === g) {
      seen[cell] = 1;
      stack[top++] = cell;
    }
    return top;
  }

  /**
   * Mean perimeter of the regions (unit cell edges that separate a region from another one or from the
   * outside). A 3x3 square has 12, the most compact shape of nine cells; a snake up to 20. For `compactness`.
   */
  function meanPerimeter(cellRegion, size) {
    size = size === undefined ? SIZE : size;
    let edges = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const g = cellRegion[r * size + c];
        if (r === 0 || cellRegion[(r - 1) * size + c] !== g) edges++;
        if (r === size - 1 || cellRegion[(r + 1) * size + c] !== g) edges++;
        if (c === 0 || cellRegion[r * size + c - 1] !== g) edges++;
        if (c === size - 1 || cellRegion[r * size + c + 1] !== g) edges++;
      }
    }
    return edges / size;
  }

  /**
   * Builds the growth engine for a size x size grid; buffers are allocated once and reused by every attempt.
   */
  function createGrower(size) {
    const n = size * size;
    const steps = n - size;
    const owner = new Int8Array(n);
    const regionSize = new Int8Array(size);
    const members = new Int16Array(n);
    const nbr = new Int16Array(n * 4).fill(-1);
    const nbrCount = new Uint8Array(n);

    for (let c = 0; c < n; c++) {
      const r = Math.floor(c / size);
      const col = c % size;
      if (r > 0) nbr[c * 4 + nbrCount[c]++] = c - size;
      if (r < size - 1) nbr[c * 4 + nbrCount[c]++] = c + size;
      if (col > 0) nbr[c * 4 + nbrCount[c]++] = c - 1;
      if (col < size - 1) nbr[c * 4 + nbrCount[c]++] = c + 1;
    }

    // Scratch buffers of isFeasible.
    const matchLimit = MATCH_FREE_PER_SIZE * size;
    const fragment = new Int16Array(n);
    const queue = new Int16Array(n);
    const fragSize = new Int16Array(n);
    const fragAdj = new Int32Array(n);
    const subsetSupply = new Int16Array(1 << HALL_MAX_FRAGMENTS);
    const subsetAdj = new Int32Array(1 << HALL_MAX_FRAGMENTS);
    const reach = new Int32Array(n);
    const reachSeen = new Int32Array(n);
    const reachDist = new Int8Array(n);
    const slotBase = new Int16Array(size + 1);
    const slotCell = new Int16Array(n);
    const slotSeen = new Int32Array(n);
    let reachNo = 0;
    let slotStamp = 0;
    let assigned = 0;

    // One level per move: the region that grows, its legal cells in the order to try them, the next one.
    const lvlRegion = new Int8Array(steps);
    const lvlCell = new Int16Array(steps);
    const lvlCount = new Int16Array(steps);
    const lvlIdx = new Int16Array(steps);
    const lvlReady = new Uint8Array(steps);
    const lvlCands = new Int16Array(steps * n);
    const candStamp = new Int32Array(n);
    let stampNo = 0;
    const tieList = new Int8Array(size);
    const weights = new Float64Array(n);

    function assign(cell, g) {
      owner[cell] = g;
      members[g * size + regionSize[g]] = cell;
      regionSize[g]++;
      assigned++;
    }

    function unassign(cell, g) {
      owner[cell] = -1;
      regionSize[g]--;
      assigned--;
    }

    /**
     * Can the unfinished regions still absorb the free cells? The free cells fall apart into (4-connected)
     * fragments. Every fragment needs an unfinished region next to it, and for every group of fragments
     * their cell total must not exceed the number of cells the touching regions still lack (Hall's
     * condition for the transport of cells to regions; free and missing totals are equal, so it is also
     * sufficient for the flow).
     */
    function fragmentsFeasible() {
      fragment.fill(-1);
      let frags = 0;
      for (let start = 0; start < n; start++) {
        if (owner[start] !== -1 || fragment[start] !== -1) continue;
        let head = 0;
        let tail = 0;
        let cells = 0;
        let adj = 0;
        queue[tail++] = start;
        fragment[start] = frags;
        while (head < tail) {
          const cell = queue[head++];
          cells++;
          const base = cell * 4;
          for (let k = 0; k < nbrCount[cell]; k++) {
            const y = nbr[base + k];
            const o = owner[y];
            if (o === -1) {
              if (fragment[y] === -1) {
                fragment[y] = frags;
                queue[tail++] = y;
              }
            } else if (regionSize[o] < size) {
              adj |= 1 << o;
            }
          }
        }
        if (adj === 0) return false;
        fragSize[frags] = cells;
        fragAdj[frags] = adj;
        frags++;
      }
      if (frags === 0) return true;

      let g;
      let demandAll = 0;
      for (g = 0; g < size; g++) demandAll += size - regionSize[g];
      if (frags === 1) return fragSize[0] <= demandAll;

      const limit = frags < HALL_MAX_FRAGMENTS ? frags : HALL_MAX_FRAGMENTS;
      // Every single fragment, also beyond the Hall limit.
      for (let f = 0; f < frags; f++) {
        let demand = 0;
        for (g = 0; g < size; g++) if ((fragAdj[f] & (1 << g)) !== 0) demand += size - regionSize[g];
        if (fragSize[f] > demand) return false;
      }
      subsetSupply[0] = 0;
      subsetAdj[0] = 0;
      for (let s = 1; s < (1 << limit); s++) {
        const low = 31 - Math.clz32(s & -s);
        const rest = s & (s - 1);
        const supply = subsetSupply[rest] + fragSize[low];
        const adj = subsetAdj[rest] | fragAdj[low];
        subsetSupply[s] = supply;
        subsetAdj[s] = adj;
        let demand = 0;
        for (g = 0; g < size; g++) if ((adj & (1 << g)) !== 0) demand += size - regionSize[g];
        if (supply > demand) return false;
      }
      return true;
    }

    /** Kuhn's augmenting path: gives `cell` a slot of a region that can reach it, moving others if needed. */
    function matchCell(cell) {
      const mask = reach[cell];
      for (let g = 0; g < size; g++) {
        if ((mask & (1 << g)) === 0) continue;
        for (let s = slotBase[g]; s < slotBase[g + 1]; s++) {
          if (slotSeen[s] === slotStamp) continue;
          slotSeen[s] = slotStamp;
          if (slotCell[s] === -1 || matchCell(slotCell[s])) {
            slotCell[s] = cell;
            return true;
          }
        }
      }
      return false;
    }

    /**
     * Sharper end game test: a region lacking d cells can only take free cells within d steps of it (through
     * free cells), and every free cell goes to exactly one region, each taking exactly what it lacks: a
     * perfect matching of free cells to missing-cell slots.
     */
    function reachMatches() {
      let free = 0;
      for (let c = 0; c < n; c++) {
        if (owner[c] === -1) {
          reach[c] = 0;
          free++;
        }
      }
      slotBase[0] = 0;
      for (let g = 0; g < size; g++) slotBase[g + 1] = slotBase[g] + size - regionSize[g];

      for (let g = 0; g < size; g++) {
        const deficit = size - regionSize[g];
        if (deficit === 0) continue;
        reachNo++;
        let head = 0;
        let tail = 0;
        for (let i = 0; i < regionSize[g]; i++) {
          const cell = members[g * size + i];
          for (let k = 0; k < nbrCount[cell]; k++) {
            const y = nbr[cell * 4 + k];
            if (owner[y] === -1 && reachSeen[y] !== reachNo) {
              reachSeen[y] = reachNo;
              reachDist[y] = 1;
              queue[tail++] = y;
            }
          }
        }
        while (head < tail) {
          const cell = queue[head++];
          reach[cell] |= 1 << g;
          if (reachDist[cell] >= deficit) continue;
          for (let k = 0; k < nbrCount[cell]; k++) {
            const y = nbr[cell * 4 + k];
            if (owner[y] === -1 && reachSeen[y] !== reachNo) {
              reachSeen[y] = reachNo;
              reachDist[y] = reachDist[cell] + 1;
              queue[tail++] = y;
            }
          }
        }
      }

      for (let s = 0; s < free; s++) slotCell[s] = -1;
      for (let c = 0; c < n; c++) {
        if (owner[c] !== -1) continue;
        slotStamp++;
        if (!matchCell(c)) return false;
      }
      return true;
    }

    /**
     * Can the move just tried still lead to a complete partition? Necessary only (the search still
     * backtracks): the free fragments must be absorbable (Hall), and in the end game the free cells must be
     * matchable to the regions that can reach them.
     */
    function isFeasible() {
      if (!fragmentsFeasible()) return false;
      return n - assigned > matchLimit || reachMatches();
    }

    /** The unfinished region with the fewest cells; ties are broken at random. */
    function hungriest(rng) {
      let best = size;
      let ties = 0;
      for (let g = 0; g < size; g++) {
        const s = regionSize[g];
        if (s >= size) continue;
        if (s < best) {
          best = s;
          ties = 0;
        }
        if (s === best) tieList[ties++] = g;
      }
      return tieList[ties === 1 ? 0 : rng.int(ties)];
    }

    /** Fills level `d` with the legal cells of the hungriest region in a weighted random order. */
    function openLevel(d, rng, shape) {
      const g = hungriest(rng);
      lvlRegion[d] = g;
      const list = d * n;
      let count = 0;
      stampNo++;
      for (let i = 0; i < regionSize[g]; i++) {
        const cell = members[g * size + i];
        const base = cell * 4;
        for (let k = 0; k < nbrCount[cell]; k++) {
          const y = nbr[base + k];
          if (owner[y] !== -1 || candStamp[y] === stampNo) continue;
          candStamp[y] = stampNo;
          assign(y, g);
          const legal = isFeasible();
          unassign(y, g);
          if (!legal) continue;
          let own = 0;
          let free = 0;
          const yb = y * 4;
          for (let j = 0; j < nbrCount[y]; j++) {
            const o = owner[nbr[yb + j]];
            if (o === g) own++;
            else if (o === -1) free++;
          }
          const yr = Math.floor(y / size);
          const yc = y % size;
          let touch = own;
          if (yr > 0) {
            if (yc > 0 && owner[y - size - 1] === g) touch += DIAGONAL_WEIGHT;
            if (yc < size - 1 && owner[y - size + 1] === g) touch += DIAGONAL_WEIGHT;
          }
          if (yr < size - 1) {
            if (yc > 0 && owner[y + size - 1] === g) touch += DIAGONAL_WEIGHT;
            if (yc < size - 1 && owner[y + size + 1] === g) touch += DIAGONAL_WEIGHT;
          }
          lvlCands[list + count] = y;
          weights[count] = Math.exp(shape * touch) * Math.pow(POCKET_PENALTY, free);
          count++;
        }
      }
      // Weighted draw without replacement: the order in which the candidates will be tried.
      for (let i = 0; i < count - 1; i++) {
        let total = 0;
        for (let j = i; j < count; j++) total += weights[j];
        let ticket = rng.next() * total;
        let pick = i;
        for (let j = i; j < count; j++) {
          ticket -= weights[j];
          if (ticket < 0) {
            pick = j;
            break;
          }
          pick = j;
        }
        const cell = lvlCands[list + pick];
        lvlCands[list + pick] = lvlCands[list + i];
        lvlCands[list + i] = cell;
        const w = weights[pick];
        weights[pick] = weights[i];
        weights[i] = w;
      }
      lvlCount[d] = count;
      lvlIdx[d] = 0;
      lvlReady[d] = 1;
    }

    /**
     * Draws one seed per row, in distinct columns. For square boxes (4, 9, 16 cells wide) the seeds are also
     * spread evenly: every box of the classic layout holds exactly one.
     */
    function placeSeeds(rng) {
      const cols = new Array(size);
      const box = Math.round(Math.sqrt(size));
      const evenSpread = box * box === size && box > 1;
      const taken = new Uint8Array(size);
      for (let tries = 0; ; tries++) {
        for (let i = 0; i < size; i++) cols[i] = i;
        rng.shuffle(cols);
        if (!evenSpread || tries >= SEED_TRIES) break;
        taken.fill(0);
        let ok = true;
        for (let r = 0; r < size && ok; r++) {
          const b = Math.floor(r / box) * box + Math.floor(cols[r] / box);
          ok = taken[b] === 0;
          taken[b] = 1;
        }
        if (ok) break;
      }
      owner.fill(-1);
      regionSize.fill(0);
      assigned = 0;
      for (let r = 0; r < size; r++) assign(r * size + cols[r], r);
    }

    /**
     * One growth attempt. `shape`: exponent of the weight per touching neighbour (from `compactness`);
     * `counters.backtracks` is increased by the undone moves.
     * @returns {boolean} True when every cell is assigned (`owner` holds the partition).
     */
    function grow(rng, shape, maxBacktracks, counters) {
      placeSeeds(rng);
      let depth = 0;
      let undone = 0;
      lvlReady[0] = 0;
      while (depth < steps) {
        if (lvlReady[depth] === 0) openLevel(depth, rng, shape);
        if (lvlIdx[depth] < lvlCount[depth]) {
          const cell = lvlCands[depth * n + lvlIdx[depth]++];
          lvlCell[depth] = cell;
          assign(cell, lvlRegion[depth]);
          depth++;
          if (depth < steps) lvlReady[depth] = 0;
        } else {
          undone++;
          counters.backtracks++;
          if (undone > maxBacktracks || depth === 0) return false;
          depth--;
          unassign(lvlCell[depth], lvlRegion[depth]);
        }
      }
      return true;
    }

    return { grow: grow, owner: owner };
  }

  /** Region numbers in reading order of their first cell, so that region 0 always holds cell 0. */
  function canonicalRegions(owner, size) {
    const n = size * size;
    const out = new Int32Array(n);
    const renumber = new Int32Array(size).fill(-1);
    let next = 0;
    for (let c = 0; c < n; c++) {
      const g = owner[c];
      if (renumber[g] === -1) renumber[g] = next++;
      out[c] = renumber[g];
    }
    return out;
  }

  /** Wraps a partition into a model: rows, then columns, then the regions (27 units for 9x9). */
  function modelFromRegions(variantId, size, cellRegion) {
    const n = size * size;
    const units = [];
    const unitMeta = [];
    const cellRow = new Int32Array(n);
    const cellCol = new Int32Array(n);
    let r;
    let c;

    for (r = 0; r < size; r++) {
      for (c = 0; c < size; c++) {
        cellRow[r * size + c] = r;
        cellCol[r * size + c] = c;
      }
    }
    for (r = 0; r < size; r++) {
      const cells = [];
      for (c = 0; c < size; c++) cells.push(r * size + c);
      units.push(cells);
      unitMeta.push({ kind: 'row', gridIndex: 0, label: 'R' + (r + 1) });
    }
    for (c = 0; c < size; c++) {
      const cells = [];
      for (r = 0; r < size; r++) cells.push(r * size + c);
      units.push(cells);
      unitMeta.push({ kind: 'col', gridIndex: 0, label: 'C' + (c + 1) });
    }
    for (let g = 0; g < size; g++) {
      const cells = [];
      for (let cell = 0; cell < n; cell++) if (cellRegion[cell] === g) cells.push(cell);
      units.push(cells);
      unitMeta.push({ kind: 'region', gridIndex: 0, label: 'J' + (g + 1) });
    }

    return SG.model.create({
      variantId: variantId,
      digits: size,
      cellCount: n,
      units: units,
      unitMeta: unitMeta,
      layout: {
        rows: size,
        cols: size,
        cellRow: cellRow,
        cellCol: cellCol,
        cellRegion: cellRegion,
        subGrids: [{ gridIndex: 0, originRow: 0, originCol: 0 }]
      }
    });
  }

  /**
   * Does a board built on this partition have a solution? Runs the full grid generator with a node budget;
   * a layout that exhausts the budget counts as unsolvable, which is safe: it is merely dropped.
   */
  function hasSolution(model, rng) {
    const budget = SG.budget.create({ nodes: SOLVE_NODES });
    try {
      SG.fullGrid.generate(model, rng, budget, { stepEvents: false, restartThreshold: SOLVE_RESTART });
      return true;
    } catch (err) {
      if (err instanceof SG.errors.GenerationError &&
          (err.code === 'fullGrid.unsatisfiable' || err.code === 'budget.exceeded')) {
        return false;
      }
      throw err;
    }
  }

  /**
   * Does the plain depth-first search that `SG.model.validate` uses (fixed value order, no restarts) find a
   * solution within `PLAIN_SOLVE_NODES` nodes? About one layout in four does not: it has solutions, but such
   * a search can wander for millions of nodes in it, and these layouts also gave slower puzzles. They are
   * dropped, so every model built here validates conclusively.
   */
  function solvesPlainly(model) {
    const budget = SG.budget.create({ nodes: PLAIN_SOLVE_NODES });
    try {
      return SG.dfs.solve(model, model.fixedCells, null, budget) !== null;
    } catch (err) {
      if (err instanceof SG.errors.GenerationError && err.code === 'budget.exceeded') return false;
      throw err;
    }
  }

  /**
   * @typedef {Object} JigsawLayoutStats
   * @property {number} attempts    Growth attempts made (1 when the first one succeeded).
   * @property {number} reseeds     attempts - 1.
   * @property {number} backtracks  Moves undone in total.
   * @property {number} unsolvable  Partitions dropped because the full grid generator found no solution.
   * @property {number} hard        Partitions dropped because the plain search needed too long.
   */

  /**
   * Generates a valid Jigsaw partition: `size` connected regions of `size` cells each, whose board has a
   * solution. The same rng state and options always give the same partition.
   * @param {Object} [options]  `compactness` (default 0.6; 1 gives rounded regions, 0 winding ones), `size`
   *        (default 9; others are for tests), `maxBacktracks` (60), `maxAttempts` (200), `stats`
   *        (a JigsawLayoutStats filled in).
   * @returns {Int32Array} cellRegion: the region number (0..size-1) of every cell, row-major.
   * @throws {SG.errors.GenerationError} 'jigsaw.layoutFailed' when `maxAttempts` attempts all failed.
   */
  function generateRegions(rng, options) {
    options = options || {};
    const size = options.size === undefined ? SIZE : options.size;
    if (!(Number.isInteger(size) && size >= 2 && size <= SG.MAX_DIGITS)) {
      throw fail('pipeline.invalidOption', { option: 'size', value: String(size) });
    }
    const compactness = readCompactness(options);
    const maxBacktracks = options.maxBacktracks === undefined
      ? DEFAULT_MAX_BACKTRACKS : options.maxBacktracks;
    const maxAttempts = options.maxAttempts === undefined ? DEFAULT_MAX_ATTEMPTS : options.maxAttempts;
    const stats = options.stats || {};
    stats.attempts = 0;
    stats.reseeds = 0;
    stats.backtracks = 0;
    stats.unsolvable = 0;
    stats.hard = 0;

    const shape = SHAPE_GAIN * (compactness - SHAPE_NEUTRAL);
    const grower = createGrower(size);
    const counters = { backtracks: 0 };
    const variantId = 'jigsaw' + size;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const attemptRng = rng.fork('layout#' + attempt);
      stats.attempts++;
      counters.backtracks = 0;
      const grown = grower.grow(attemptRng, shape, maxBacktracks, counters);
      stats.backtracks += counters.backtracks;
      if (grown) {
        const cellRegion = canonicalRegions(grower.owner, size);
        if (checkRegions(cellRegion, size).length === 0) {
          const model = modelFromRegions(variantId, size, cellRegion);
          if (!hasSolution(model, attemptRng.fork('solve'))) {
            stats.unsolvable++;
          } else if (!solvesPlainly(model)) {
            stats.hard++;
          } else {
            stats.reseeds = stats.attempts - 1;
            return cellRegion;
          }
        }
      }
    }
    stats.reseeds = stats.attempts - 1;
    throw fail('jigsaw.layoutFailed', { attempts: maxAttempts });
  }

  function readCompactness(opts) {
    const value = opts ? opts.compactness : undefined;
    if (value === undefined || value === null) return DEFAULT_COMPACTNESS;
    if (typeof value !== 'number' || !(value >= 0 && value <= 1)) {
      throw fail('pipeline.invalidOption', { option: 'compactness', value: String(value) });
    }
    return value;
  }

  /**
   * Builds a jigsaw9 model with a fresh partition; without an rng a fixed seed gives the same layout every
   * time.
   */
  function buildJigsaw(opts, rng) {
    const compactness = readCompactness(opts);
    const cellRegion = generateRegions(rng || SG.rng.create(FALLBACK_SEED), { compactness: compactness });
    return modelFromRegions('jigsaw9', SIZE, cellRegion);
  }

  const DEFINITION = {
    id: 'jigsaw9',
    i18nKey: 'variant.jigsaw9',
    group: 'regions',
    digits: SIZE,
    difficultySupport: ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1',
      'hell2'],
    // The classic9 floors (29 / 25 / 22) kept the dig from reaching normal; 83 % / 80 % / 80 % of them
    // (24 / 20 / 17) do not. Same calibration as extra-regions.js; expert takes the factor of hard.
    clueFloorScale: Object.freeze({ normal: 0.83, hard: 0.8, expert: 0.8, master: 0.8 }),
    defaultSymbolMode: 'digits',
    symbolModes: ['digits', 'letters', 'colors', 'shapes'],
    options: Object.freeze([Object.freeze({
      id: 'compactness',
      type: 'slider',
      min: 0,
      max: 1,
      step: 0.05,
      default: DEFAULT_COMPACTNESS,
      i18nKey: 'option.compactness',
      hintKey: 'option.compactness.hint',
      minLabelKey: 'option.compactness.min',
      maxLabelKey: 'option.compactness.max'
    })]),
    build: buildJigsaw
  };

  // Skipping a known id keeps a second load harmless (no second set of locale strings either).
  if (!SG.variants.has(DEFINITION.id)) {
    SG.variants.register(DEFINITION);

    // Locale strings, merged into the language packs by the UI layer.
    SG.localeFragments = SG.localeFragments || [];
    SG.localeFragments.push({
      en: {
        'variant.jigsaw9': 'Jigsaw Sudoku',
        'option.compactness': 'Region compactness',
        'option.compactness.hint': 'How regular the regions look.\n\n**Compact** (high values): rounded, ' +
          'compact regions.\n\n**Winding** (low values): winding, snake-like regions that are harder to ' +
          'read.',
        'option.compactness.min': 'Winding',
        'option.compactness.max': 'Compact',
        'error.jigsaw.layoutFailed': 'Could not build a valid Jigsaw layout after {attempts} attempts. ' +
          'Please try another seed.'
      },
      vi: {
        'variant.jigsaw9': 'Sudoku Ghép hình',
        'option.compactness': 'Độ gọn của vùng',
        'option.compactness.hint': 'Mức độ đều đặn của các vùng.\n\n**Gọn gàng** (giá trị cao): các vùng ' +
          'tròn trịa, gọn gàng.\n\n**Uốn lượn** (giá trị thấp): các vùng uốn lượn như con rắn, khó nhìn ' +
          'hơn.',
        'option.compactness.min': 'Uốn lượn',
        'option.compactness.max': 'Gọn gàng',
        'error.jigsaw.layoutFailed': 'Không tạo được bố cục Ghép hình hợp lệ sau {attempts} lần thử. ' +
          'Hãy thử một seed khác.'
      }
    });
  }

  /** Layout tools of the Jigsaw variant, exposed for tests and tooling. */
  SG.jigsaw = SG.jigsaw || {
    DEFAULT_COMPACTNESS: DEFAULT_COMPACTNESS,
    generateRegions: generateRegions,
    checkRegions: checkRegions,
    meanPerimeter: meanPerimeter,
    modelFromRegions: modelFromRegions,
    hasSolution: hasSolution,
    solvesPlainly: solvesPlainly
  };
})(typeof self !== 'undefined' ? self : globalThis);
