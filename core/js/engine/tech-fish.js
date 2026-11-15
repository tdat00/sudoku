/**
 * Fish techniques (group `fish`): X-Wing, Skyscraper, Swordfish, Jellyfish and Simple Colouring; registers
 * itself in SG.techniques.
 *
 *   id               baseCost  order
 *   xWing                32     110     basic fish of size 2
 *   skyscraper           33     112     two lines with two candidates each, one end pair in a common line
 *   simpleColouring      36     120     chains of strong links, two colours
 *   swordfish            42     130     basic fish of size 3
 *   jellyfish            56     137     basic fish of size 4 (before the wings: weight 520 < xyWing 650)
 *
 * Basic fish (ONE routine, `findFish`, size n = 2, 3, 4): for a digit d pick n "base" lines of one
 * orientation such that d's candidate cells of every base line all lie in the same n "cover" lines of the
 * other orientation. Every base line holds d exactly once (it is a complete unit), so the n placements sit in
 * n different cover lines, and as a cover line holds d at most once, each cover line gets exactly one of
 * them. So d is removed from every cell of the cover lines that is not part of a base line. Both orientations
 * are searched. Lines are the units whose `unitMeta.kind` is 'row' or 'col'; nothing is computed from cell
 * indices. Only complete units (`ctx.completeUnits[u] === 1`) are used. A base line is skipped for a digit
 * when
 *   - the digit is already placed in it,
 *   - it has fewer than 2 candidate cells (a hidden single, a cheaper technique),
 *   - a candidate cell lies in several lines of its own kind (overlapping sub-grids: the base lines would not
 *     be disjoint) or in no line of the other kind.
 * Skipping a line only ever makes the technique find less, never something wrong.
 *
 * Simple Colouring: for a digit d, a complete unit with no d placed and exactly two cells that can still be d
 * is a strong link (exactly one of the two is d). Cells joined by strong links form components, two-coloured
 * by walking the links (the start cell, the lowest index, gets colour 1); all cells of one colour are d and
 * none of the other. Two rules per component, the first one wins:
 *   - wrap: two cells of the SAME colour see each other (are peers). That colour cannot be true, so d is
 *     removed from every cell of that colour.
 *   - trap: a candidate cell outside the component that sees a cell of each colour sees a d either way, so it
 *     cannot be d itself.
 * A component whose two-colouring fails (an odd cycle of strong links) or in which both colours wrap is
 * contradictory and ignored.
 *
 * Skyscraper (rating v3, R11): for a digit d take two base lines of one orientation (complete units,
 * disjoint: no cell of either lies in another line of its kind) that each have exactly two cells that can
 * still be d. Each line holds d exactly once, so one of its two cells is d. The four cells are distinct and
 * each has one cover line (the owner line of the other orientation). Exactly ONE cover line holds a cell of
 * each base line: those two cells (the roots) see each other, so they cannot both be d, and at least one of
 * the other two cells (the ends) is d. d is removed from every other cell that sees both ends (real peers,
 * so any unit shape and extra regions count). Two shared cover lines are an X-Wing, which belongs to
 * xWing; no shared cover line is no pattern. A skyscraper is looked for in the order digit, rows then
 * columns as base lines, line pair; the first pattern with an elimination is returned, with the four cells
 * in `cells`.
 *
 * Skyscraper work (R10). One unit is one tested pair of base lines (the second line extending the first),
 * limit 50000 per call (`SG.fishSearch.SKYSCRAPER_WORK_LIMIT`); a spent limit ends the call with null (a lost
 * deduction, never an invented one). The parent budget is checked at entry and before the pair that would
 * carry the work done since the last check over 256 units; the counter is local to the call. A spent budget
 * ('budget.exceeded') is "nothing found" as for the chain finders, cancellation and every other error
 * propagate. `ctx.options.onPatternWork(record)` observes each call and never selects its result:
 * { id, work, limit, capHit (null | 'work'), retained (null) }, a fresh object per call.
 *
 * Performance: per model data (the lines, the owner line of every cell, all scratch buffers) is built once in
 * a WeakMap, so `find` allocates only the Finding it returns. The fish search is a depth-first selection of
 * base lines that drops a branch as soon as its covers outnumber n. `find` is not re-entrant (it shares the
 * scratch buffers).
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  const ROW = 0;
  const COL = 1;
  const ORIENTATION_NAMES = ['row', 'col'];
  /** Largest fish size (Jellyfish); sizes the per-line cover lists. */
  const MAX_FISH = 4;

  // R10 work policy of the Skyscraper: the units one call may spend (tested pairs of base lines) and how many
  // may pass between two checks of the parent budget.
  const SKYSCRAPER_WORK_LIMIT = 50000;
  const WORK_CHECK_UNITS = 256;

  // Thrown through the pair loops of a skyscraper call whose work limit is spent.
  const WORK_CAP = Object.freeze({ capHit: 'work' });

  const infos = new WeakMap();

  // cell -> unit table of one orientation: the complete unit of that kind holding the cell, or -1 when it
  // lies in none or in more than one.
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

  // unit -> 1 for a line none of whose cells lies in another line of its kind (a disjoint line), else 0.
  function disjointTable(model, lineUnits, owner, disjoint) {
    for (let i = 0; i < lineUnits.length; i++) {
      const u = lineUnits[i];
      const cells = model.units[u];
      let alone = 1;
      for (let k = 0; k < cells.length; k++) {
        if (owner[cells[k]] !== u) alone = 0;
      }
      disjoint[u] = alone;
    }
  }

  // Builds (once per model and `completeUnits` table) the lines and every scratch buffer; `ctx.completeUnits`
  // decides which units count as lines.
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
    const lineOf = [ownerTable(model, rows), ownerTable(model, cols)];
    const disjoint = new Uint8Array(nUnits);
    disjointTable(model, rows, lineOf[ROW], disjoint);
    disjointTable(model, cols, lineOf[COL], disjoint);

    info = {
      complete: ctx.completeUnits,
      lines: [Int32Array.from(rows), Int32Array.from(cols)],
      lineOf: lineOf,
      disjoint: disjoint,

      // Skyscraper: the base lines of the current digit and orientation (their two cells and the cover
      // line of each), and the peers of the second end.
      skyUnit: new Int32Array(maxLines),
      skyCell: new Int32Array(maxLines * 2),
      skyCover: new Int32Array(maxLines * 2),
      peerMark: new Uint8Array(nCells),

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

  // Eliminations and Finding for the base lines in `info.sel` (the covers are `info.union[0 .. size - 1]`);
  // null when the pattern removes nothing.
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

  // Depth-first choice of `size` base lines out of the eligible ones (indices ascending, so every combination
  // is visited once); `depth` are chosen already, `from` is the first index to try. Branches whose covers
  // outnumber the fish size are cut. Returns true once `f.result` is set.
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

  // Lists the eligible base lines of one digit and orientation into the scratch buffers; returns how many
  // there are.
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

  // The generic fish (size 2 = X-Wing, 3 = Swordfish, 4 = Jellyfish): every digit, rows as base lines then
  // columns, first pattern found.
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

  // Lists the lines of one orientation that hold the digit in exactly two cells (the base lines of a
  // skyscraper) into the scratch buffers, with the cover line of each of the two cells; returns how many
  // there are. A line is skipped when it is not disjoint from the other lines of its kind, already has the
  // digit placed, holds it in another number of cells, or one of its cells has no cover line of its own.
  function collectLinkedLines(model, state, info, digit, orient) {
    const cand = state.candidates;
    const val = state.value;
    const bit = 1 << (digit - 1);
    const lines = info.lines[orient];
    const coverOf = info.lineOf[1 - orient];
    let count = 0;

    for (let li = 0; li < lines.length; li++) {
      const u = lines[li];
      if (info.disjoint[u] === 0) continue;
      const cells = model.units[u];
      const slot = count * 2;
      let positions = 0;
      let eligible = true;
      for (let k = 0; k < cells.length && eligible; k++) {
        const c = cells[k];
        if (val[c] !== 0) {
          if (val[c] === digit) eligible = false;
          continue;
        }
        if ((cand[c] & bit) === 0) continue;
        if (positions === 2 || coverOf[c] === -1) {
          eligible = false;
        } else {
          info.skyCell[slot + positions] = c;
          info.skyCover[slot + positions] = coverOf[c];
          positions++;
        }
      }
      if (eligible && positions === 2) info.skyUnit[count++] = u;
    }
    return count;
  }

  // The skyscraper of the linked lines i < j (indices of the scratch lists) or null: exactly one cover line
  // holds a cell of each line (the roots); the other two cells are the ends, and every other cell that still
  // has the digit and sees both ends loses it.
  function skyscraperOf(model, state, info, digit, i, j) {
    const a = 2 * i;
    const b = 2 * j;
    let rootA = 0;
    let rootB = 0;
    let shared = 0;
    for (let p = 0; p < 2; p++) {
      for (let q = 0; q < 2; q++) {
        if (info.skyCover[a + p] === info.skyCover[b + q]) {
          shared++;
          rootA = p;
          rootB = q;
        }
      }
    }
    // Two shared cover lines are an X-Wing, none is no pattern.
    if (shared !== 1) return null;
    const roots = [info.skyCell[a + rootA], info.skyCell[b + rootB]];
    const endA = info.skyCell[a + 1 - rootA];
    const endB = info.skyCell[b + 1 - rootB];
    const cand = state.candidates;
    const val = state.value;
    const bit = 1 << (digit - 1);

    const peersB = model.peers[endB];
    for (let k = 0; k < peersB.length; k++) info.peerMark[peersB[k]] = 1;
    const targets = [];
    const peersA = model.peers[endA];
    for (let k = 0; k < peersA.length; k++) {
      const c = peersA[k];
      if (info.peerMark[c] === 1 && val[c] === 0 && (cand[c] & bit) !== 0 && c !== roots[0] &&
          c !== roots[1] && c !== endB) {
        targets.push(c);
      }
    }
    for (let k = 0; k < peersB.length; k++) info.peerMark[peersB[k]] = 0;
    if (targets.length === 0) return null;

    targets.sort(byNumber);
    const eliminations = [];
    for (let k = 0; k < targets.length; k++) {
      if (k === 0 || targets[k] !== targets[k - 1]) eliminations.push([targets[k], digit]);
    }
    const ends = endA < endB ? [endA, endB] : [endB, endA];
    return {
      technique: 'skyscraper',
      cells: [roots[0], roots[1], endA, endB].sort(byNumber),
      placements: [],
      eliminations: eliminations,
      i18nKey: 'technique.skyscraper.step',
      i18nArgs: {
        digit: digit,
        lines: unitLabels(model, [info.skyUnit[i], info.skyUnit[j]]),
        ends: cellsToLabels(model, ends)
      }
    };
  }

  // One tested pair of base lines is one work unit. The parent budget is checked before the unit that would
  // carry the work done since the last check over WORK_CHECK_UNITS; a spent limit throws WORK_CAP.
  function spend(run) {
    if (run.work >= run.limit) throw WORK_CAP;
    if (run.work + 1 - run.checkedAt > WORK_CHECK_UNITS) {
      run.ctx.check();
      run.checkedAt = run.work;
    }
    run.work++;
  }

  // Every digit, rows then columns as base lines, line pairs in line order: the first skyscraper that removes
  // something.
  function scanSkyscraper(model, state, info, run) {
    for (let digit = 1; digit <= model.digits; digit++) {
      for (let orient = ROW; orient <= COL; orient++) {
        const count = collectLinkedLines(model, state, info, digit, orient);
        for (let i = 0; i < count - 1; i++) {
          for (let j = i + 1; j < count; j++) {
            spend(run);
            const found = skyscraperOf(model, state, info, digit, i, j);
            if (found !== null) return found;
          }
        }
      }
    }
    return null;
  }

  // A skyscraper call with its own work counter. A spent work limit and a spent budget are "nothing found"
  // (the logical solver notices the budget at its next check); cancellation and every other error propagate.
  // The work goes to the optional observer, which never selects the result.
  function findSkyscraper(model, state, ctx, workLimit) {
    const info = infoFor(model, ctx);
    const run = { ctx: ctx, limit: workLimit, work: 0, checkedAt: 0, capped: false };
    let found = null;
    try {
      ctx.check();
      found = scanSkyscraper(model, state, info, run);
    } catch (err) {
      if (err === WORK_CAP) run.capped = true;
      else if (!(err && err.code === 'budget.exceeded')) throw err;
    }
    const observer = ctx.options ? ctx.options.onPatternWork : undefined;
    if (typeof observer === 'function') {
      observer({
        id: 'skyscraper',
        work: run.work,
        limit: workLimit,
        capHit: run.capped ? 'work' : null,
        retained: null
      });
    }
    return found;
  }

  // The seam of the tests: the same search with an explicit work limit (absent = SKYSCRAPER_WORK_LIMIT).
  function skyscraperSeam(model, state, ctx, opts) {
    let limit = SKYSCRAPER_WORK_LIMIT;
    const given = opts === undefined || opts === null ? undefined : opts.workLimit;
    if (given !== undefined) {
      if (typeof given !== 'number' || !Number.isFinite(given) || given < 0) {
        const err = new SG.errors.GenerationError('solver.invalidOption',
          { option: 'fishSearch.skyscraper.workLimit' });
        err.message = 'solver.invalidOption: fishSearch.skyscraper workLimit must be a number of at least 0';
        throw err;
      }
      limit = Math.floor(given);
    }
    return findSkyscraper(model, state, ctx, limit);
  }

  // Fills unitCount / unitA / unitB for one digit: 2 for a strong link (unitA, unitB are its cells),
  // otherwise -1 for a unit that cannot give one (incomplete, digit placed) or the candidate count capped at
  // 3. Returns the number of links.
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

  function hasStrongLink(model, info, c) {
    const cu = model.cellUnits[c];
    for (let k = 0; k < cu.length; k++) {
      if (info.unitCount[cu[k]] === 2) return true;
    }
    return false;
  }

  // Walks the strong links from `start`, writes the colours (1 / 2) and the component id, and queues the
  // component's cells in `info.queue`.
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

  // Rule "wrap" for the component in `info.queue[0 .. size - 1]`: the cells to clear, or null; `info.witness`
  // receives two same-coloured cells that see each other.
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

  function findSimpleColouring(model, state, ctx) {
    const info = infoFor(model, ctx);
    for (let digit = 1; digit <= model.digits; digit++) {
      ctx.check();
      const finding = colourDigit(model, state, ctx, info, digit);
      if (finding !== null) return finding;
    }
    return null;
  }

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
  define('skyscraper', 33, 112, function (model, state, ctx) {
    return findSkyscraper(model, state, ctx, SKYSCRAPER_WORK_LIMIT);
  });
  define('simpleColouring', 36, 120, findSimpleColouring);
  define('swordfish', 42, 130, function (model, state, ctx) {
    return findFish(model, state, ctx, 3, 'swordfish');
  });
  define('jellyfish', 56, 137, function (model, state, ctx) {
    return findFish(model, state, ctx, 4, 'jellyfish');
  });

  // The parameterised search behind skyscraper, for tests (explicit work limit); not a registered technique.
  if (!SG.fishSearch) {
    SG.fishSearch = Object.freeze({
      SKYSCRAPER_WORK_LIMIT: SKYSCRAPER_WORK_LIMIT,
      skyscraper: skyscraperSeam
    });
  }
})(typeof self !== 'undefined' ? self : globalThis);
