/**
 * Fish techniques (group `fish`): X-Wing, Swordfish, Jellyfish and Simple Colouring. Registers itself in
 * SG.techniques (techniques.js, which defines the contract every `find` obeys).
 *
 *   id               baseCost  order
 *   xWing                32     110     basic fish of size 2
 *   simpleColouring      36     120     chains of strong links, two colours
 *   swordfish            42     130     basic fish of size 3
 *   jellyfish            56     160     basic fish of size 4
 *
 * ---- Basic fish (ONE routine, `findFish`, parameterised by the size n = 2, 3, 4) -------------------
 * For a digit d pick n "base" lines of one orientation (rows, or columns) such that d's candidate cells of
 * every base line all lie in the same n "cover" lines of the other orientation. Every base line holds d
 * exactly once (it is a complete unit), so the n placements of d sit in n different cover lines, and as a
 * cover line holds d at most once each cover line gets exactly one of them. So d is removed from every
 * cell of the cover lines that is not part of a base line. Both orientations are searched.
 *
 * Lines are the units whose `unitMeta.kind` is 'row' or 'col'; nothing is computed from cell indices, so
 * the routine works for any digit count and any model that has such units. Only complete units
 * (`ctx.completeUnits[u] === 1`) are used. A base line is skipped for a digit when
 *   - the digit is already placed in it (nothing left to decide there),
 *   - it has fewer than 2 candidate cells (that is a hidden single, a cheaper technique),
 *   - one of its candidate cells lies in several lines of its own kind (overlapping sub-grids of a
 *     multi-grid variant: the base lines would not be disjoint) or in no line of the other kind.
 * Skipping a line only ever makes the technique find less, never something wrong.
 *
 * ---- Simple Colouring ---------------------------------------------------------------------------
 * For a digit d, a unit that is complete, has no d placed and has exactly two cells that can still be d is
 * a strong link: exactly one of the two cells is d. Cells joined by strong links form connected
 * components; each is two-coloured by walking the links (the start cell, the lowest index, gets colour 1).
 * In a component all cells of one colour are d and all of the other are not. Two rules, both applied per
 * component, the first one wins:
 *   - wrap: two cells of the SAME colour of the SAME component see each other (are peers). That colour
 *     cannot be the true one, so d is removed from every cell of that colour.
 *   - trap: a candidate cell outside the component that sees a cell of each colour. One colour is true,
 *     so the cell sees a d either way and cannot be d itself.
 * A component whose two-colouring fails (an odd cycle of strong links) or in which both colours wrap
 * belongs to a contradictory position: it is ignored, nothing is deduced from it.
 *
 * ---- Performance -----------------------------------------------------------------------------------
 * Per model data (the lines, the owner line of every cell, all scratch buffers) is built once and kept in
 * a WeakMap, so `find` allocates only the Finding it returns. The fish search is a depth-first selection
 * of base lines that drops a branch as soon as its covers outnumber n. `find` is not re-entrant (it shares
 * the scratch buffers), which the solver never needs.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  const ROW = 0;
  const COL = 1;
  const ORIENTATION_NAMES = ['row', 'col'];
  /** Largest fish size (Jellyfish); sizes the per-line cover lists. */
  const MAX_FISH = 4;

  /** Per model data, see infoFor. */
  const infos = new WeakMap();

  // ---------------------------------------------------------------------------------------------
  // Per model data
  // ---------------------------------------------------------------------------------------------

  /**
   * For one orientation: the cell -> unit table. A cell maps to the complete unit of that kind that holds
   * it, or to -1 when it lies in none or in more than one.
   */
  function ownerTable(model, lineUnits) {
    const owner = new Int32Array(model.cellCount).fill(-1);
    const seen = new Uint8Array(model.cellCount);
    for (let i = 0; i < lineUnits.length; i++) {
      const u = lineUnits[i];
      const cells = model.units[u];
      for (let k = 0; k < cells.length; k++) {
        const c = cells[k];
        owner[c] = seen[c] === 0 ? u : -1;
        seen[c] = 1;
      }
    }
    return owner;
  }

  /**
   * Builds (once per model and per `completeUnits` table) the lines and every scratch buffer.
   * @param {PuzzleModel} model
   * @param {Object} ctx  Technique context; `ctx.completeUnits` decides which units count as lines.
   * @returns {Object}
   */
  function infoFor(model, ctx) {
    let info = infos.get(model);
    if (info !== undefined && info.complete === ctx.completeUnits) return info;

    const nUnits = model.units.length;
    const nCells = model.cellCount;
    const rows = [];
    const cols = [];
    for (let u = 0; u < nUnits; u++) {
      if (ctx.completeUnits[u] !== 1) continue;
      const kind = model.unitMeta[u].kind;
      if (kind === 'row') rows.push(u);
      else if (kind === 'col') cols.push(u);
    }
    const maxLines = Math.max(rows.length, cols.length, 1);

    info = {
      complete: ctx.completeUnits,
      lines: [Int32Array.from(rows), Int32Array.from(cols)],
      lineOf: [ownerTable(model, rows), ownerTable(model, cols)],

      // Fish search: eligible base lines of the current digit and the depth-first selection state.
      baseUnit: new Int32Array(maxLines),
      baseCovers: new Int32Array(maxLines * MAX_FISH),
      baseCoverCount: new Uint8Array(maxLines),
      coverMark: new Uint8Array(nUnits),
      isBase: new Uint8Array(nUnits),
      sel: new Int32Array(MAX_FISH),
      union: new Int32Array(2 * MAX_FISH),
      unionSize: 0,
      elimSeen: new Uint8Array(nCells),
      frame: null,

      // Simple Colouring: strong links per unit, colours, components and the breadth-first queue.
      unitCount: new Int8Array(nUnits),
      unitA: new Int32Array(nUnits),
      unitB: new Int32Array(nUnits),
      colour: new Uint8Array(nCells),
      comp: new Int32Array(nCells),
      queue: new Int32Array(nCells),
      seen: new Uint8Array(nCells),
      touched: new Int32Array(nCells),
      witness: new Int32Array(4)
    };
    infos.set(model, info);
    return info;
  }

  function cellsToLabels(model, cells) {
    const out = [];
    for (let i = 0; i < cells.length; i++) out.push(SG.model.cellLabel(model, cells[i]));
    return out;
  }

  function unitLabels(model, units) {
    const out = [];
    for (let i = 0; i < units.length; i++) out.push(model.unitMeta[units[i]].label);
    return out;
  }

  function byNumber(a, b) {
    return a - b;
  }

  // ---------------------------------------------------------------------------------------------
  // Basic fish (X-Wing, Swordfish, Jellyfish)
  // ---------------------------------------------------------------------------------------------

  /**
   * Eliminations and Finding for the base lines chosen in `info.sel`; null when the pattern removes
   * nothing. The covers are `info.union[0 .. size - 1]`.
   */
  function fishFinding(info) {
    const f = info.frame;
    const model = f.model;
    const cand = f.state.candidates;
    const val = f.state.value;
    const bit = f.bit;
    const size = f.size;
    const baseOf = info.lineOf[f.orient];
    let s;

    for (s = 0; s < size; s++) info.isBase[info.baseUnit[info.sel[s]]] = 1;
    const eliminations = [];
    for (s = 0; s < size; s++) {
      const cells = model.units[info.union[s]];
      for (let k = 0; k < cells.length; k++) {
        const c = cells[k];
        if (val[c] !== 0 || (cand[c] & bit) === 0) continue;
        const owner = baseOf[c];
        if ((owner !== -1 && info.isBase[owner] === 1) || info.elimSeen[c] === 1) continue;
        info.elimSeen[c] = 1;
        eliminations.push([c, f.digit]);
      }
    }
    for (s = 0; s < eliminations.length; s++) info.elimSeen[eliminations[s][0]] = 0;
    const baseUnits = [];
    for (s = 0; s < size; s++) {
      const u = info.baseUnit[info.sel[s]];
      baseUnits.push(u);
      info.isBase[u] = 0;
    }
    if (eliminations.length === 0) return null;

    const cells = [];
    for (s = 0; s < size; s++) {
      const members = model.units[baseUnits[s]];
      for (let k = 0; k < members.length; k++) {
        const c = members[k];
        if (val[c] === 0 && (cand[c] & bit) !== 0) cells.push(c);
      }
    }
    const coverUnits = Array.prototype.slice.call(info.union, 0, size).sort(byNumber);
    eliminations.sort(function (a, b) { return a[0] - b[0]; });
    return {
      technique: f.id,
      cells: cells,
      placements: [],
      eliminations: eliminations,
      i18nKey: 'technique.' + f.id + '.step',
      i18nArgs: {
        digit: f.digit,
        size: size,
        orientation: ORIENTATION_NAMES[f.orient],
        baseUnits: unitLabels(model, baseUnits),
        coverUnits: unitLabels(model, coverUnits)
      }
    };
  }

  /**
   * Depth-first choice of `size` base lines out of the eligible ones (indices ascending, so every
   * combination is visited once). `depth` lines are chosen already, `from` is the first index to try.
   * Branches whose covers outnumber the fish size are cut. Returns true once `f.result` is set.
   */
  function extendBases(info, depth, from) {
    const f = info.frame;
    const size = f.size;
    const last = f.baseCount - (size - depth);
    for (let i = from; i <= last; i++) {
      const savedUnion = info.unionSize;
      const slot = i * MAX_FISH;
      const k = info.baseCoverCount[i];
      let j;
      for (j = 0; j < k; j++) {
        const cover = info.baseCovers[slot + j];
        if (info.coverMark[cover]++ === 0) info.union[info.unionSize++] = cover;
      }
      info.sel[depth] = i;
      let found = false;
      if (info.unionSize <= size) {
        if (depth + 1 < size) {
          found = extendBases(info, depth + 1, i + 1);
        } else if (info.unionSize === size) {
          f.result = fishFinding(info);
          found = f.result !== null;
        }
      }
      for (j = 0; j < k; j++) info.coverMark[info.baseCovers[slot + j]]--;
      info.unionSize = savedUnion;
      if (found) return true;
    }
    return false;
  }

  /**
   * Lists the eligible base lines of one digit and orientation into the scratch buffers.
   * @returns {number} How many there are.
   */
  function collectBases(model, state, info, size, digit, orient) {
    const cand = state.candidates;
    const val = state.value;
    const bit = 1 << (digit - 1);
    const lines = info.lines[orient];
    const baseOf = info.lineOf[orient];
    const coverOf = info.lineOf[1 - orient];
    let count = 0;

    for (let li = 0; li < lines.length; li++) {
      const u = lines[li];
      const cells = model.units[u];
      const slot = count * MAX_FISH;
      let positions = 0;
      let covers = 0;
      let eligible = true;
      for (let k = 0; k < cells.length && eligible; k++) {
        const c = cells[k];
        if (val[c] !== 0) {
          if (val[c] === digit) eligible = false;
          continue;
        }
        if ((cand[c] & bit) === 0) continue;
        const cover = coverOf[c];
        if (cover === -1 || baseOf[c] !== u) {
          eligible = false;
          continue;
        }
        positions++;
        let known = false;
        for (let j = 0; j < covers; j++) {
          if (info.baseCovers[slot + j] === cover) known = true;
        }
        if (!known) {
          if (covers === size) eligible = false;
          else info.baseCovers[slot + covers++] = cover;
        }
      }
      if (eligible && positions >= 2) {
        info.baseUnit[count] = u;
        info.baseCoverCount[count] = covers;
        count++;
      }
    }
    return count;
  }

  /**
   * The generic fish: every digit, rows as base lines then columns as base lines, first pattern found.
   * @param {PuzzleModel} model
   * @param {SolveState} state
   * @param {Object} ctx
   * @param {number} size  2 = X-Wing, 3 = Swordfish, 4 = Jellyfish.
   * @param {string} id    Technique id for the Finding.
   * @returns {?Finding}
   */
  function findFish(model, state, ctx, size, id) {
    const info = infoFor(model, ctx);
    const frame = { model: model, state: state, size: size, id: id, digit: 0, bit: 0, orient: ROW,
      baseCount: 0, result: null };
    info.frame = frame;
    info.unionSize = 0;
    for (let digit = 1; digit <= model.digits; digit++) {
      for (let orient = ROW; orient <= COL; orient++) {
        ctx.check();
        const count = collectBases(model, state, info, size, digit, orient);
        if (count < size) continue;
        frame.digit = digit;
        frame.bit = 1 << (digit - 1);
        frame.orient = orient;
        frame.baseCount = count;
        if (extendBases(info, 0, 0)) {
          info.frame = null;
          return frame.result;
        }
      }
    }
    info.frame = null;
    return null;
  }

  // ---------------------------------------------------------------------------------------------
  // Simple Colouring
  // ---------------------------------------------------------------------------------------------

  /**
   * Fills unitCount / unitA / unitB for one digit: 2 for a strong link (then unitA, unitB are its cells),
   * otherwise -1 for a unit that cannot give one (incomplete, digit placed) or the candidate count capped
   * at 3.
   * @returns {number} How many strong links there are.
   */
  function findStrongLinks(model, state, ctx, info, digit) {
    const cand = state.candidates;
    const val = state.value;
    const bit = 1 << (digit - 1);
    const nUnits = model.units.length;
    let links = 0;
    for (let u = 0; u < nUnits; u++) {
      let count = -1;
      if (ctx.completeUnits[u] === 1) {
        const cells = model.units[u];
        count = 0;
        for (let k = 0; k < cells.length; k++) {
          const c = cells[k];
          if (val[c] !== 0) {
            if (val[c] === digit) {
              count = -1;
              break;
            }
            continue;
          }
          if ((cand[c] & bit) === 0) continue;
          if (count === 0) info.unitA[u] = c;
          else if (count === 1) info.unitB[u] = c;
          if (++count > 2) break;
        }
      }
      info.unitCount[u] = count;
      if (count === 2) links++;
    }
    return links;
  }

  /** Whether the open cell `c` (a candidate for the digit) is an end of some strong link. */
  function hasStrongLink(model, info, c) {
    const cu = model.cellUnits[c];
    for (let k = 0; k < cu.length; k++) {
      if (info.unitCount[cu[k]] === 2) return true;
    }
    return false;
  }

  /**
   * Walks the strong links from `start`, writes the colours (1 / 2) and the component id, and queues the
   * component's cells in `info.queue`.
   * @returns {{size: number, consistent: boolean}}
   */
  function colourComponent(model, info, start, compId) {
    const queue = info.queue;
    const colour = info.colour;
    let size = 0;
    let consistent = true;
    queue[size++] = start;
    colour[start] = 1;
    info.comp[start] = compId;
    for (let head = 0; head < size; head++) {
      const x = queue[head];
      const cu = model.cellUnits[x];
      for (let k = 0; k < cu.length; k++) {
        const u = cu[k];
        if (info.unitCount[u] !== 2) continue;
        const y = info.unitA[u] === x ? info.unitB[u] : info.unitA[u];
        if (colour[y] === 0) {
          colour[y] = 3 - colour[x];
          info.comp[y] = compId;
          queue[size++] = y;
        } else if (colour[y] === colour[x]) {
          consistent = false;
        }
      }
    }
    return { size: size, consistent: consistent };
  }

  function colouringFinding(model, info, size, digit, rule, falseColour, targets, witness) {
    const chain = Array.prototype.slice.call(info.queue, 0, size).sort(byNumber);
    const one = [];
    const two = [];
    for (let i = 0; i < chain.length; i++) (info.colour[chain[i]] === 1 ? one : two).push(chain[i]);
    const args = {
      digit: digit,
      rule: rule,
      colour1: cellsToLabels(model, one),
      colour2: cellsToLabels(model, two)
    };
    if (rule === 'wrap') {
      args.falseColour = falseColour;
      args.witness = cellsToLabels(model, witness);
    }
    return {
      technique: 'simpleColouring',
      cells: chain,
      placements: [],
      eliminations: targets.sort(byNumber).map(function (c) { return [c, digit]; }),
      i18nKey: 'technique.simpleColouring.step',
      i18nArgs: args
    };
  }

  /**
   * Rule "wrap" for the component in `info.queue[0 .. size - 1]`: the cells to clear, or null.
   * `info.witness` receives two same-coloured cells that see each other.
   */
  function wrapTargets(model, info, size, compId) {
    const queue = info.queue;
    let wrapped = 0;
    for (let i = 0; i < size; i++) {
      const x = queue[i];
      const colourX = info.colour[x];
      const ps = model.peers[x];
      for (let j = 0; j < ps.length; j++) {
        const p = ps[j];
        if (info.comp[p] === compId && info.colour[p] === colourX) {
          if ((wrapped & colourX) === 0) {
            info.witness[2 * (colourX - 1)] = x;
            info.witness[2 * (colourX - 1) + 1] = p;
          }
          wrapped |= colourX;
          break;
        }
      }
    }
    if (wrapped !== 1 && wrapped !== 2) return null;
    const targets = [];
    for (let i = 0; i < size; i++) {
      if (info.colour[queue[i]] === wrapped) targets.push(queue[i]);
    }
    return { colour: wrapped, targets: targets };
  }

  /** Rule "trap": candidate cells outside the component that see both colours (ascending), or null. */
  function trapTargets(model, state, info, size, compId, bit) {
    const queue = info.queue;
    const cand = state.candidates;
    const val = state.value;
    let touchedCount = 0;
    for (let i = 0; i < size; i++) {
      const x = queue[i];
      const colourX = info.colour[x];
      const ps = model.peers[x];
      for (let j = 0; j < ps.length; j++) {
        const p = ps[j];
        if (info.comp[p] === compId || val[p] !== 0 || (cand[p] & bit) === 0) continue;
        if (info.seen[p] === 0) info.touched[touchedCount++] = p;
        info.seen[p] |= colourX;
      }
    }
    const targets = [];
    for (let t = 0; t < touchedCount; t++) {
      const p = info.touched[t];
      if (info.seen[p] === 3) targets.push(p);
      info.seen[p] = 0;
    }
    return targets.length > 0 ? targets : null;
  }

  function colourDigit(model, state, ctx, info, digit) {
    if (findStrongLinks(model, state, ctx, info, digit) === 0) return null;
    const cand = state.candidates;
    const val = state.value;
    const bit = 1 << (digit - 1);
    info.colour.fill(0);
    info.comp.fill(-1);
    let compId = 0;
    for (let c = 0; c < model.cellCount; c++) {
      if (info.colour[c] !== 0 || val[c] !== 0 || (cand[c] & bit) === 0) continue;
      if (!hasStrongLink(model, info, c)) continue;
      const component = colourComponent(model, info, c, compId);
      if (component.consistent) {
        const wrap = wrapTargets(model, info, component.size, compId);
        if (wrap !== null) {
          const w = 2 * (wrap.colour - 1);
          return colouringFinding(model, info, component.size, digit, 'wrap', wrap.colour, wrap.targets,
            [info.witness[w], info.witness[w + 1]]);
        }
        const trap = trapTargets(model, state, info, component.size, compId, bit);
        if (trap !== null) {
          return colouringFinding(model, info, component.size, digit, 'trap', 0, trap, null);
        }
      }
      compId++;
    }
    return null;
  }

  /**
   * Simple Colouring: wrap and trap on the strong-link components of every digit, first one found.
   * @param {PuzzleModel} model
   * @param {SolveState} state
   * @param {Object} ctx
   * @returns {?Finding}
   */
  function findSimpleColouring(model, state, ctx) {
    const info = infoFor(model, ctx);
    for (let digit = 1; digit <= model.digits; digit++) {
      ctx.check();
      const finding = colourDigit(model, state, ctx, info, digit);
      if (finding !== null) return finding;
    }
    return null;
  }

  // ---------------------------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------------------------

  function define(id, baseCost, order, find) {
    if (SG.techniques.has(id)) return;
    SG.techniques.register({
      id: id,
      group: 'fish',
      baseCost: baseCost,
      order: order,
      i18nKey: 'technique.' + id,
      variantScope: null,
      assumesUniqueness: false,
      find: find
    });
  }

  define('xWing', 32, 110, function (model, state, ctx) {
    return findFish(model, state, ctx, 2, 'xWing');
  });
  define('simpleColouring', 36, 120, findSimpleColouring);
  define('swordfish', 42, 130, function (model, state, ctx) {
    return findFish(model, state, ctx, 3, 'swordfish');
  });
  define('jellyfish', 56, 160, function (model, state, ctx) {
    return findFish(model, state, ctx, 4, 'jellyfish');
  });
})(typeof self !== 'undefined' ? self : globalThis);
