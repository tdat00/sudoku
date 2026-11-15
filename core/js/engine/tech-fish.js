/**
 * Fish techniques (group `fish`): X-Wing, Skyscraper, Two-string kite, Empty Rectangle, Finned X-Wing,
 * Swordfish, Jellyfish and Simple Colouring; registers itself in SG.techniques.
 *
 *   id               baseCost  order
 *   xWing                32     110     basic fish of size 2
 *   skyscraper           33     112     two lines with two candidates each, one end pair in a common line
 *   twoStringKite        34     114     a row pair and a column pair, one cell of each in the same box
 *   simpleColouring      36     120     chains of strong links, two colours
 *   emptyRectangle       38     124     a box with a row arm and a column arm of a digit, and a strong link
 *   finnedXWing          40     126     an X-Wing with fins in one box, sashimi included
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
 * Two-string kite (rating v3, R11): for a digit d take a row and a column (complete units, each disjoint from
 * the other lines of its kind) that each have exactly two cells that can still be d, with d not placed in
 * them. Each holds d once, so one of its two cells is d. The four cells must be distinct (a row and a column
 * meet in one cell, which must not be a cell of both pairs). One cell of the row and one of the column, the
 * bridge, lie in the same box: a unit of kind 'box' or 'region' (a region of a jigsaw board is a box-like
 * unit) that is complete and is the only box-like unit holding either cell (an overlapped box of a
 * multi-grid board belongs to two grids, so its cells have no single owner and bridge nothing; a diagonal or
 * a window is no box). A board without a complete box-like unit has no kite and costs no work. The bridge
 * cells see each other, so they cannot both be d: at least one of the other two cells, the ends, is d. d is
 * removed from every other cell that sees both ends (real peers, so any unit shape and extra regions
 * count); a bridge cell or an end is never a target. A kite is looked for in the order digit, row pair (line
 * order), column pair (line order), bridge cell of the row (cell order), bridge cell of the column (cell
 * order); the first pattern with an elimination is returned, with the four cells in `cells`, the row and the
 * column in `lines` (unit order), the two bridge cells in `bridge` and the two ends in `ends` (cell order).
 *
 * Empty Rectangle (rating v3, R11, restricted form): for a digit d take a complete box-like unit U (kind
 * 'box' or 'region') that does not hold d yet. The cells of U that can still be d (its candidates) must
 * split into a row arm, the candidates in one row r, and a column arm, those in one column c, both nonempty
 * and with no candidate at the cell where r and c meet (the empty intersection). A candidate in a third
 * line, or at the intersection, gives no rectangle. Every candidate needs a single owner: U is the only
 * box-like unit holding it and it has one complete row and one complete column (candidate ownership as in
 * the fish search), so an overlapped box of a multi-grid board spoils the rectangle, as it does for the
 * skyscraper and the kite. U holds d exactly once. An external conjugate pair is a complete unit V (any kind,
 * like the strong links of Simple Colouring) with exactly two cells p and q that can still be d, both outside
 * U: one of them is d.
 * Call A an arm whose every cell p sees (real peers), and B the other arm. If p is d, d leaves all of A, so a
 * cell of B is d. If q is d, q is d. So B or q holds d, and d is removed from every cell that sees all of B
 * and sees q. The candidates of U, p and q are never targets. Both arms are tried as A, and both cells of
 * the pair as p. A rectangle is looked for in the order digit, box (unit order), pair unit (unit order),
 * arm lines (the one or two rectangles of the box in (row, column) unit order), A = the row arm then the
 * column arm, p = the lower cell then the higher cell of the pair; the first pattern with an elimination is
 * returned, with the candidates of U and the two cells of the pair in `cells` (cell order), the box label in
 * `box`, the row and the column in `lines` (unit order) and the two cells of the pair in `ends` (cell order).
 *
 * Finned fish (rating v3, R12; one routine for n = 2, the registered Finned X-Wing, and n = 3, which the
 * finned Swordfish registers later): for a digit d pick n base lines of one orientation (rows or columns,
 * complete units in which d is not placed and that have at least two cells that can still be d, the
 * candidates of the line) and n cover lines, complete units of the other orientation. Every candidate of a
 * base line has that line as its only line of its kind and exactly one cover line (candidate ownership as in
 * the fish search, never weaker), so two base lines share no candidate. A candidate on a chosen cover is a
 * body cell, one outside every chosen cover is a fin. A pattern needs at least one fin (without one it is the
 * ordinary fish, left to xWing and swordfish), all fins in one box (a complete box-like unit, kind 'box' or
 * 'region', that is the only box-like unit holding each fin: an overlapped box of a multi-grid board has no
 * owner and a board without a complete box-like unit has no finned fish), and a body cell in every base line
 * (a line that has only fins is a box/line reduction) and in every cover. At n = 2, one body cell in a base
 * line gives the missing-corner sashimi form; at n = 3, sparse bodies are also permitted by the same proof
 * (an ordinary Swordfish can already have two body cells per base line). Each base line holds d once. If no
 * fin is d, the n placements are body cells of n different base lines; each cover holds d at most once and
 * together the covers hold all n placements, so each cover holds exactly one and d leaves every other cell
 * of the covers.
 * If a fin is d, d leaves every cell that sees it. So d is removed from every cell that lies on a chosen
 * cover, outside the base lines, can still be d and sees every fin (real peers, so the box of the fins, extra
 * regions and any unit shape count); a body cell or a fin is never a target. Looked for in the order digit,
 * rows then columns as base lines, base lines in unit order (every combination once), covers in unit order
 * (every combination of the covers that hold a candidate of the base lines); the first pattern with an
 * elimination is returned, with the candidates of the base lines in `cells` (cell order), the base lines in
 * `bases` and the covers in `covers` (unit order) and the fins in `fins` (cell order).
 *
 * Work (R10), the same for the four patterns. A work unit of the skyscraper is one tested pair of base lines
 * (the second line extending the first), one of the kite is one tested pair of a row and a column of a digit
 * (every one of its up to four bridges is tested inside the unit), one of the empty rectangle is one tested
 * pair of a box and a conjugate unit of a digit, and inside the unit at most eight trials are made (two
 * rectangles of the box, two choices of A, two choices of p), and one of the finned fish is one tested
 * combination of n base lines of a digit and orientation, inside which every choice of n covers is tried
 * (at most one per combination of the covers that hold a candidate of the lines). The limit is 50000 per
 * call (`SG.fishSearch.SKYSCRAPER_WORK_LIMIT`, `KITE_WORK_LIMIT`, `EMPTY_RECTANGLE_WORK_LIMIT`,
 * `FINNED_X_WING_WORK_LIMIT`); a spent limit ends the call with null (a lost deduction, never an invented
 * one). The parent budget is checked at entry and before the unit that would carry the work done since the
 * last check over 256 units; the counter is local to the call. A spent budget ('budget.exceeded') is
 * "nothing found" as for the chain finders, cancellation and every other error propagate.
 * `ctx.options.onPatternWork(record)` observes each call and never selects its result:
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

  // R10 work policy of the Skyscraper, the Two-string kite, the Empty Rectangle and the finned fish: the
  // units one call may spend (tested pairs of base lines, of a row and a column, of a box and a conjugate
  // unit, tested combinations of base lines) and how many may pass between two checks of the parent budget.
  const SKYSCRAPER_WORK_LIMIT = 50000;
  const KITE_WORK_LIMIT = 50000;
  const EMPTY_RECTANGLE_WORK_LIMIT = 50000;
  const FINNED_X_WING_WORK_LIMIT = 50000;
  const WORK_CHECK_UNITS = 256;

  // Thrown through the unit loops of a pattern call whose work limit is spent.
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
    const boxLike = [];
    for (let u = 0; u < nUnits; u++) {
      if (ctx.completeUnits[u] !== 1) continue;
      const kind = model.unitMeta[u].kind;
      if (kind === 'row') rows.push(u);
      else if (kind === 'col') cols.push(u);
      else if (kind === 'box' || kind === 'region') boxLike.push(u);
    }
    const maxLines = Math.max(rows.length, cols.length, 1);
    let maxBox = 1;
    for (let i = 0; i < boxLike.length; i++) maxBox = Math.max(maxBox, model.units[boxLike[i]].length);
    let maxLine = 1;
    for (let i = 0; i < rows.length; i++) maxLine = Math.max(maxLine, model.units[rows[i]].length);
    for (let i = 0; i < cols.length; i++) maxLine = Math.max(maxLine, model.units[cols[i]].length);
    const lineOf = [ownerTable(model, rows), ownerTable(model, cols)];
    const disjoint = new Uint8Array(nUnits);
    disjointTable(model, rows, lineOf[ROW], disjoint);
    disjointTable(model, cols, lineOf[COL], disjoint);

    info = {
      complete: ctx.completeUnits,
      lines: [Int32Array.from(rows), Int32Array.from(cols)],
      lineOf: lineOf,
      disjoint: disjoint,
      // cell -> the one complete box-like unit (kind 'box' or 'region') holding it, counted over both kinds;
      // -1 for a cell in none or in several (overlapped boxes)
      boxOf: ownerTable(model, boxLike),
      hasBox: boxLike.length > 0,
      boxUnits: Int32Array.from(boxLike),

      // Empty Rectangle: the candidates of the current box (a mark per cell too), the one or two arm lines of
      // the box (row unit, column unit) and the row arm and the column arm of each of them, and the peer
      // table (built on the first use).
      erCell: new Int32Array(maxBox),
      erMark: new Uint8Array(nCells),
      erLine: new Int32Array(4),
      erArm: [new Int32Array(maxBox), new Int32Array(maxBox), new Int32Array(maxBox), new Int32Array(maxBox)],
      erArmSize: new Int32Array(4),
      erConfigs: 0,
      erCount: 0,
      peerAt: null,

      // Skyscraper: the base lines of the current digit and orientation (their two cells and the cover
      // line of each), and the peers of the second end.
      skyUnit: new Int32Array(maxLines),
      skyCell: new Int32Array(maxLines * 2),
      skyCover: new Int32Array(maxLines * 2),
      peerMark: new Uint8Array(nCells),

      // Two-string kite: the conjugate rows and columns of the current digit with their two cells each.
      kiteRowUnit: new Int32Array(maxLines),
      kiteRowCell: new Int32Array(maxLines * 2),
      kiteColUnit: new Int32Array(maxLines),
      kiteColCell: new Int32Array(maxLines * 2),

      // Finned fish: the eligible base lines of the current digit and orientation (the unit, and the open
      // cells of the digit with the cover line of each, `finStride` slots per line), the chosen base lines
      // and covers, the covers of the chosen base lines, the fins of the tested selection and the marks of
      // the covers of the pool and of the chosen covers and base lines.
      finStride: maxLine,
      finUnit: new Int32Array(maxLines),
      finCount: new Int32Array(maxLines),
      finCell: new Int32Array(maxLines * maxLine),
      finCover: new Int32Array(maxLines * maxLine),
      finPick: new Int32Array(MAX_FISH),
      finPool: new Int32Array(maxLines),
      finPoolMark: new Uint8Array(nUnits),
      finCoverPick: new Int32Array(MAX_FISH),
      finCoverMark: new Uint8Array(nUnits),
      finBaseMark: new Uint8Array(nUnits),
      finFin: new Int32Array(MAX_FISH * maxLine),

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

  // The eliminations of a pattern whose two ends are endA and endB: every open cell that still has the digit,
  // sees both ends and is none of the four cells of the pattern loses it. Null when there is none.
  function endEliminations(model, state, info, digit, endA, endB, pattern) {
    const cand = state.candidates;
    const val = state.value;
    const bit = 1 << (digit - 1);

    const peersB = model.peers[endB];
    for (let k = 0; k < peersB.length; k++) info.peerMark[peersB[k]] = 1;
    const targets = [];
    const peersA = model.peers[endA];
    for (let k = 0; k < peersA.length; k++) {
      const c = peersA[k];
      if (info.peerMark[c] === 1 && val[c] === 0 && (cand[c] & bit) !== 0 && pattern.indexOf(c) === -1) {
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
    return eliminations;
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
    const cells = [roots[0], roots[1], endA, endB];
    const eliminations = endEliminations(model, state, info, digit, endA, endB, cells);
    if (eliminations === null) return null;

    const ends = endA < endB ? [endA, endB] : [endB, endA];
    return {
      technique: 'skyscraper',
      cells: cells.sort(byNumber),
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

  // Lists the disjoint lines of one orientation that hold the digit in exactly two open cells (the conjugate
  // pairs of a kite) into `units` and `pairCells` (two cells per line, ascending); returns their number.
  // A line is skipped when it is not disjoint from the other lines of its kind, already has the digit placed
  // or holds it in another number of cells.
  function collectConjugateLines(model, state, info, digit, orient, units, pairCells) {
    const cand = state.candidates;
    const val = state.value;
    const bit = 1 << (digit - 1);
    const lines = info.lines[orient];
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
        if (positions === 2) eligible = false;
        else pairCells[slot + positions++] = c;
      }
      if (eligible && positions === 2) {
        if (pairCells[slot] > pairCells[slot + 1]) {
          const lower = pairCells[slot + 1];
          pairCells[slot + 1] = pairCells[slot];
          pairCells[slot] = lower;
        }
        units[count++] = u;
      }
    }
    return count;
  }

  // The kite of the conjugate row i and column j (indices of the scratch lists) or null: the four cells are
  // distinct, and a bridge is one cell of each pair in the same single box-like unit (box or region); the
  // other two cells are the ends. The bridges are tried row cell first, lower cell first; the first that
  // removes something decides.
  function kiteOf(model, state, info, digit, i, j) {
    const a = 2 * i;
    const b = 2 * j;
    const rowCell = info.kiteRowCell;
    const colCell = info.kiteColCell;
    for (let p = 0; p < 2; p++) {
      for (let q = 0; q < 2; q++) {
        if (rowCell[a + p] === colCell[b + q]) return null;
      }
    }
    for (let p = 0; p < 2; p++) {
      const box = info.boxOf[rowCell[a + p]];
      if (box === -1) continue;
      for (let q = 0; q < 2; q++) {
        if (info.boxOf[colCell[b + q]] !== box) continue;
        const bridge = [rowCell[a + p], colCell[b + q]];
        const endA = rowCell[a + 1 - p];
        const endB = colCell[b + 1 - q];
        const cells = [bridge[0], bridge[1], endA, endB];
        const eliminations = endEliminations(model, state, info, digit, endA, endB, cells);
        if (eliminations === null) continue;

        const ends = endA < endB ? [endA, endB] : [endB, endA];
        const rowUnit = info.kiteRowUnit[i];
        const colUnit = info.kiteColUnit[j];
        return {
          technique: 'twoStringKite',
          cells: cells.sort(byNumber),
          placements: [],
          eliminations: eliminations,
          i18nKey: 'technique.twoStringKite.step',
          i18nArgs: {
            digit: digit,
            lines: unitLabels(model, rowUnit < colUnit ? [rowUnit, colUnit] : [colUnit, rowUnit]),
            bridge: cellsToLabels(model, bridge[0] < bridge[1] ? bridge : [bridge[1], bridge[0]]),
            ends: cellsToLabels(model, ends)
          }
        };
      }
    }
    return null;
  }

  // One work unit is one tested combination of the pattern (a pair of base lines, of a row and a column, of a
  // box and a conjugate unit, or the n base lines of a finned fish). The parent budget is checked before the
  // unit that would carry the work done since the last check over WORK_CHECK_UNITS; a spent limit throws
  // WORK_CAP.
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

  // Every digit, conjugate rows in line order, conjugate columns in line order: the first kite that removes
  // something. A board without a complete box-like unit has no bridge, so it has no kite and costs nothing.
  function scanKite(model, state, info, run) {
    if (!info.hasBox) return null;
    for (let digit = 1; digit <= model.digits; digit++) {
      const rows = collectConjugateLines(model, state, info, digit, ROW, info.kiteRowUnit, info.kiteRowCell);
      if (rows === 0) continue;
      const cols = collectConjugateLines(model, state, info, digit, COL, info.kiteColUnit, info.kiteColCell);
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          spend(run);
          const found = kiteOf(model, state, info, digit, i, j);
          if (found !== null) return found;
        }
      }
    }
    return null;
  }

  // The candidates of the digit in the complete box-like unit u go to `info.erCell` (and the count is
  // returned) when the box can hold an empty rectangle of the digit, else 0: the digit is not placed in the
  // box, there are at least two candidates, and every candidate has a single box (this one), row and column.
  function collectBoxCells(model, state, info, digit, u) {
    const cand = state.candidates;
    const val = state.value;
    const bit = 1 << (digit - 1);
    const cells = model.units[u];
    let count = 0;
    for (let k = 0; k < cells.length; k++) {
      const c = cells[k];
      if (val[c] !== 0) {
        if (val[c] === digit) return 0;
        continue;
      }
      if ((cand[c] & bit) === 0) continue;
      if (info.boxOf[c] !== u || info.lineOf[ROW][c] === -1 || info.lineOf[COL][c] === -1) return 0;
      info.erCell[count++] = c;
    }
    return count >= 2 ? count : 0;
  }

  // Tests the arm lines (row unit r, column unit c) against the `count` candidates of `info.erCell`: each
  // lies in the row r or in the column c, none in both (the intersection is no candidate), and both arms are
  // nonempty. On success the lines and the two arms go to slot `slot` of the scratch buffers.
  function armsOf(info, count, r, c, slot) {
    const rowArm = info.erArm[2 * slot];
    const colArm = info.erArm[2 * slot + 1];
    let rows = 0;
    let cols = 0;
    for (let i = 0; i < count; i++) {
      const s = info.erCell[i];
      const inRow = info.lineOf[ROW][s] === r;
      if (inRow === (info.lineOf[COL][s] === c)) return false;
      if (inRow) rowArm[rows++] = s;
      else colArm[cols++] = s;
    }
    if (rows === 0 || cols === 0) return false;
    info.erArmSize[2 * slot] = rows;
    info.erArmSize[2 * slot + 1] = cols;
    info.erLine[2 * slot] = r;
    info.erLine[2 * slot + 1] = c;
    return true;
  }

  // The empty rectangles of the box whose candidates are in `info.erCell[0 .. count - 1]`: the first
  // candidate is in the row arm (the column is then that of the first candidate outside its row) or in the
  // column arm (the row is then that of the first candidate outside its column), so there are at most
  // two, and two only for a pair of candidates in different rows and columns. They go to the scratch slots
  // in (row, column) unit order; returns how many.
  function rectanglesOf(info, count) {
    const first = info.erCell[0];
    const row = info.lineOf[ROW][first];
    const col = info.lineOf[COL][first];
    let otherCol = -1;
    let otherRow = -1;
    for (let i = 0; i < count && (otherCol === -1 || otherRow === -1); i++) {
      const s = info.erCell[i];
      if (otherCol === -1 && info.lineOf[ROW][s] !== row) otherCol = info.lineOf[COL][s];
      if (otherRow === -1 && info.lineOf[COL][s] !== col) otherRow = info.lineOf[ROW][s];
    }
    let found = 0;
    if (otherCol !== -1 && armsOf(info, count, row, otherCol, found)) found++;
    if (otherRow !== -1 && armsOf(info, count, otherRow, col, found)) found++;
    if (found === 2 && (info.erLine[2] < info.erLine[0] ||
      (info.erLine[2] === info.erLine[0] && info.erLine[3] < info.erLine[1]))) {
      for (let k = 0; k < 2; k++) {
        const arm = info.erArm[k];
        info.erArm[k] = info.erArm[2 + k];
        info.erArm[2 + k] = arm;
        const size = info.erArmSize[k];
        info.erArmSize[k] = info.erArmSize[2 + k];
        info.erArmSize[2 + k] = size;
        const line = info.erLine[k];
        info.erLine[k] = info.erLine[2 + k];
        info.erLine[2 + k] = line;
      }
    }
    return found;
  }

  // The cells of the tested rectangle: every cell that still has the digit, sees q and sees every cell of the
  // arm B, and is neither a candidate of the box nor p. Null when there is none.
  function rectangleEliminations(model, state, info, digit, armB, sizeB, p, q) {
    const cand = state.candidates;
    const val = state.value;
    const bit = 1 << (digit - 1);
    const n = model.cellCount;
    const at = info.peerAt;
    const peersQ = model.peers[q];
    const targets = [];
    for (let k = 0; k < peersQ.length; k++) {
      const t = peersQ[k];
      if (t === p || val[t] !== 0 || (cand[t] & bit) === 0 || info.erMark[t] === 1) continue;
      let seesB = true;
      for (let i = 0; i < sizeB && seesB; i++) seesB = at[t * n + armB[i]] === 1;
      if (seesB) targets.push(t);
    }
    if (targets.length === 0) return null;

    targets.sort(byNumber);
    const eliminations = [];
    for (let k = 0; k < targets.length; k++) {
      if (k === 0 || targets[k] !== targets[k - 1]) eliminations.push([targets[k], digit]);
    }
    return eliminations;
  }

  // The empty rectangle of the box u (the scratch buffers hold its candidates, rectangles and arms) with the
  // conjugate pair of the unit v, or null: for each rectangle, the row arm then the column arm as A, the
  // lower cell then the higher cell of the pair as p; the first test that removes something decides.
  function emptyRectangleOf(model, state, info, digit, u, v) {
    const n = model.cellCount;
    const low = info.unitA[v] < info.unitB[v] ? info.unitA[v] : info.unitB[v];
    const high = info.unitA[v] < info.unitB[v] ? info.unitB[v] : info.unitA[v];
    if (info.erMark[low] === 1 || info.erMark[high] === 1) return null;
    for (let k = 0; k < info.erConfigs; k++) {
      for (let side = 0; side < 2; side++) {
        const armA = info.erArm[2 * k + side];
        const sizeA = info.erArmSize[2 * k + side];
        const armB = info.erArm[2 * k + 1 - side];
        const sizeB = info.erArmSize[2 * k + 1 - side];
        for (let role = 0; role < 2; role++) {
          const p = role === 0 ? low : high;
          const q = role === 0 ? high : low;
          let seesA = true;
          for (let i = 0; i < sizeA && seesA; i++) seesA = info.peerAt[p * n + armA[i]] === 1;
          if (!seesA) continue;
          const eliminations = rectangleEliminations(model, state, info, digit, armB, sizeB, p, q);
          if (eliminations === null) continue;

          const cells = [p, q];
          for (let i = 0; i < info.erCount; i++) cells.push(info.erCell[i]);
          const rowUnit = info.erLine[2 * k];
          const colUnit = info.erLine[2 * k + 1];
          return {
            technique: 'emptyRectangle',
            cells: cells.sort(byNumber),
            placements: [],
            eliminations: eliminations,
            i18nKey: 'technique.emptyRectangle.step',
            i18nArgs: {
              digit: digit,
              box: model.unitMeta[u].label,
              lines: unitLabels(model, rowUnit < colUnit ? [rowUnit, colUnit] : [colUnit, rowUnit]),
              ends: cellsToLabels(model, [low, high])
            }
          };
        }
      }
    }
    return null;
  }

  // The peer table of the model (1 where two cells see each other), built on the first use.
  function peerTable(model, info) {
    if (info.peerAt === null) {
      const n = model.cellCount;
      const at = new Uint8Array(n * n);
      for (let c = 0; c < n; c++) {
        const ps = model.peers[c];
        for (let k = 0; k < ps.length; k++) at[c * n + ps[k]] = 1;
      }
      info.peerAt = at;
    }
  }

  // Every digit, boxes in unit order, conjugate units in unit order: the first empty rectangle that removes
  // something. A board without a complete box-like unit has no rectangle and costs nothing. The marks of the
  // candidates of a box are cleared when its pairs are done; a call that ends inside a box (a finding, a
  // spent limit or a spent budget) leaves them, so the scan clears them at its start.
  function scanEmptyRectangle(model, state, info, run) {
    if (info.boxUnits.length === 0) return null;
    peerTable(model, info);
    info.erMark.fill(0);
    const nUnits = model.units.length;
    for (let digit = 1; digit <= model.digits; digit++) {
      if (findStrongLinks(model, state, run.ctx, info, digit) === 0) continue;
      for (let b = 0; b < info.boxUnits.length; b++) {
        const u = info.boxUnits[b];
        const count = collectBoxCells(model, state, info, digit, u);
        if (count === 0) continue;
        info.erConfigs = rectanglesOf(info, count);
        if (info.erConfigs === 0) continue;
        info.erCount = count;
        for (let i = 0; i < count; i++) info.erMark[info.erCell[i]] = 1;
        for (let v = 0; v < nUnits; v++) {
          if (info.unitCount[v] !== 2) continue;
          spend(run);
          const found = emptyRectangleOf(model, state, info, digit, u, v);
          if (found !== null) return found;
        }
        for (let i = 0; i < count; i++) info.erMark[info.erCell[i]] = 0;
      }
    }
    return null;
  }

  // Lists the eligible base lines of one digit and orientation of the finned fish into the scratch buffers
  // and returns how many there are. A line is eligible when it is a complete line in which the digit is not
  // placed, it has at least two cells that can still be the digit, and every such cell (the candidates) has
  // the line as its only line of its kind and exactly one cover line. The cells and their cover lines go to
  // `finCell` / `finCover` (`finStride` slots per line, in cell order).
  function collectFinnedLines(model, state, info, digit, orient) {
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
      const slot = count * info.finStride;
      let positions = 0;
      let eligible = true;
      for (let k = 0; k < cells.length && eligible; k++) {
        const c = cells[k];
        if (val[c] !== 0) {
          if (val[c] === digit) eligible = false;
          continue;
        }
        if ((cand[c] & bit) === 0) continue;
        if (baseOf[c] !== u || coverOf[c] === -1) {
          eligible = false;
        } else {
          info.finCell[slot + positions] = c;
          info.finCover[slot + positions] = coverOf[c];
          positions++;
        }
      }
      if (eligible && positions >= 2) {
        info.finUnit[count] = u;
        info.finCount[count] = positions;
        count++;
      }
    }
    return count;
  }

  // The finned fish of the chosen base lines (`info.finPick`, indices of the scratch lists) and the chosen
  // covers (`info.finCoverPick`) or null: the fins (the candidates outside the covers) are nonempty, all in
  // one single-owner box-like unit, and every base line has a body cell. The targets are the open cells of
  // the covers that can still be the digit, lie in no base line and see every fin; null when there is none.
  function finnedFindingOf(model, state, info, f) {
    const size = f.size;
    const stride = info.finStride;
    let fins = 0;
    let finBox = -1;
    for (let s = 0; s < size; s++) {
      const i = info.finPick[s];
      const slot = i * stride;
      let body = 0;
      for (let k = 0; k < info.finCount[i]; k++) {
        const c = info.finCell[slot + k];
        if (info.finCoverMark[info.finCover[slot + k]] === 1) {
          body++;
          continue;
        }
        const box = info.boxOf[c];
        if (box === -1 || (fins > 0 && box !== finBox)) return null;
        finBox = box;
        info.finFin[fins++] = c;
      }
      if (body === 0) return null;
    }
    if (fins === 0) return null;

    const n = model.cellCount;
    const at = info.peerAt;
    const cand = state.candidates;
    const val = state.value;
    const bit = f.bit;
    const owner = info.lineOf[f.orient];
    const targets = [];
    for (let s = 0; s < size; s++) {
      const cells = model.units[info.finCoverPick[s]];
      for (let k = 0; k < cells.length; k++) {
        const c = cells[k];
        if (val[c] !== 0 || (cand[c] & bit) === 0 || info.elimSeen[c] === 1) continue;
        if (owner[c] !== -1 && info.finBaseMark[owner[c]] === 1) continue;
        let sees = true;
        for (let j = 0; j < fins && sees; j++) sees = at[c * n + info.finFin[j]] === 1;
        if (!sees) continue;
        info.elimSeen[c] = 1;
        targets.push(c);
      }
    }
    for (let k = 0; k < targets.length; k++) info.elimSeen[targets[k]] = 0;
    if (targets.length === 0) return null;

    targets.sort(byNumber);
    const cells = [];
    const baseUnits = [];
    for (let s = 0; s < size; s++) {
      const i = info.finPick[s];
      baseUnits.push(info.finUnit[i]);
      for (let k = 0; k < info.finCount[i]; k++) cells.push(info.finCell[i * stride + k]);
    }
    const finCells = Array.prototype.slice.call(info.finFin, 0, fins).sort(byNumber);
    const coverUnits = Array.prototype.slice.call(info.finCoverPick, 0, size);
    return {
      technique: f.id,
      cells: cells.sort(byNumber),
      placements: [],
      eliminations: targets.map(function (c) { return [c, f.digit]; }),
      i18nKey: 'technique.' + f.id + '.step',
      i18nArgs: {
        digit: f.digit,
        bases: unitLabels(model, baseUnits),
        covers: unitLabels(model, coverUnits),
        fins: cellsToLabels(model, finCells)
      }
    };
  }

  // Chooses the covers, `from` being the first pool index to try at `depth` (every combination once, in unit
  // order, as the pool is in unit order), and tests each combination of `size` covers.
  function extendCovers(model, state, info, f, poolSize, depth, from) {
    const size = f.size;
    const last = poolSize - (size - depth);
    for (let j = from; j <= last; j++) {
      info.finCoverPick[depth] = info.finPool[j];
      let found = null;
      if (depth + 1 < size) {
        found = extendCovers(model, state, info, f, poolSize, depth + 1, j + 1);
      } else {
        for (let s = 0; s < size; s++) info.finCoverMark[info.finCoverPick[s]] = 1;
        found = finnedFindingOf(model, state, info, f);
        for (let s = 0; s < size; s++) info.finCoverMark[info.finCoverPick[s]] = 0;
      }
      if (found !== null) return found;
    }
    return null;
  }

  // The finned fish of the chosen base lines (`info.finPick`) or null: every combination of covers among the
  // covers of the candidates of the lines, in unit order (a cover without a candidate of a base line would
  // have no body cell).
  function finnedOf(model, state, info, f) {
    const size = f.size;
    const stride = info.finStride;
    let pool = 0;
    for (let s = 0; s < size; s++) {
      const i = info.finPick[s];
      for (let k = 0; k < info.finCount[i]; k++) {
        const cover = info.finCover[i * stride + k];
        if (info.finPoolMark[cover] === 0) {
          info.finPoolMark[cover] = 1;
          info.finPool[pool++] = cover;
        }
      }
    }
    for (let k = 0; k < pool; k++) info.finPoolMark[info.finPool[k]] = 0;
    if (pool < size) return null;
    for (let k = 1; k < pool; k++) {
      const u = info.finPool[k];
      let m = k - 1;
      while (m >= 0 && info.finPool[m] > u) {
        info.finPool[m + 1] = info.finPool[m];
        m--;
      }
      info.finPool[m + 1] = u;
    }
    for (let s = 0; s < size; s++) info.finBaseMark[info.finUnit[info.finPick[s]]] = 1;
    const found = extendCovers(model, state, info, f, pool, 0, 0);
    for (let s = 0; s < size; s++) info.finBaseMark[info.finUnit[info.finPick[s]]] = 0;
    return found;
  }

  // Chooses the base lines (every combination of the `f.count` eligible lines once, in line order); each
  // complete combination is one work unit.
  function extendFinnedBases(model, state, info, run, f, depth, from) {
    const last = f.count - (f.size - depth);
    for (let i = from; i <= last; i++) {
      info.finPick[depth] = i;
      let found = null;
      if (depth + 1 < f.size) {
        found = extendFinnedBases(model, state, info, run, f, depth + 1, i + 1);
      } else {
        spend(run);
        found = finnedOf(model, state, info, f);
      }
      if (found !== null) return found;
    }
    return null;
  }

  // Every digit, rows then columns as base lines, base combinations in line order, cover combinations in unit
  // order: the first finned fish of `size` lines that removes something. A board without a complete box-like
  // unit has no fin box, so it has no finned fish and costs nothing.
  function scanFinned(model, state, info, run, size, id) {
    if (info.boxUnits.length === 0) return null;
    peerTable(model, info);
    const frame = { size: size, id: id, digit: 0, bit: 0, orient: ROW, count: 0 };
    for (let digit = 1; digit <= model.digits; digit++) {
      for (let orient = ROW; orient <= COL; orient++) {
        const count = collectFinnedLines(model, state, info, digit, orient);
        if (count < size) continue;
        frame.digit = digit;
        frame.bit = 1 << (digit - 1);
        frame.orient = orient;
        frame.count = count;
        const found = extendFinnedBases(model, state, info, run, frame, 0, 0);
        if (found !== null) return found;
      }
    }
    return null;
  }

  function scanFinnedXWing(model, state, info, run) {
    return scanFinned(model, state, info, run, 2, 'finnedXWing');
  }

  // The shared enumeration at n = 3: not registered here, the finned Swordfish uses it.
  function scanFinnedSwordfish(model, state, info, run) {
    return scanFinned(model, state, info, run, 3, 'finnedSwordfish');
  }

  // A pattern call (`scan` is scanSkyscraper, scanKite, scanEmptyRectangle or scanFinnedXWing) with its own
  // work counter. A spent work limit and a spent budget are "nothing found" (the logical solver notices the
  // budget at its next check); cancellation and every other error propagate. The work goes to the optional
  // observer, which never selects the result.
  function findBounded(id, scan, model, state, ctx, workLimit) {
    const info = infoFor(model, ctx);
    const run = { ctx: ctx, limit: workLimit, work: 0, checkedAt: 0, capped: false };
    let found = null;
    try {
      ctx.check();
      found = scan(model, state, info, run);
    } catch (err) {
      if (err === WORK_CAP) run.capped = true;
      else if (!(err && err.code === 'budget.exceeded')) throw err;
    }
    const observer = ctx.options ? ctx.options.onPatternWork : undefined;
    if (typeof observer === 'function') {
      observer({
        id: id,
        work: run.work,
        limit: workLimit,
        capHit: run.capped ? 'work' : null,
        retained: null
      });
    }
    return found;
  }

  // The seam of the tests: the same search with an explicit work limit (absent = the pattern's default).
  function seamOf(id, scan, defaultLimit) {
    return function (model, state, ctx, opts) {
      let limit = defaultLimit;
      const given = opts === undefined || opts === null ? undefined : opts.workLimit;
      if (given !== undefined) {
        if (typeof given !== 'number' || !Number.isFinite(given) || given < 0) {
          const err = new SG.errors.GenerationError('solver.invalidOption',
            { option: 'fishSearch.' + id + '.workLimit' });
          err.message = 'solver.invalidOption: fishSearch.' + id +
            ' workLimit must be a number of at least 0';
          throw err;
        }
        limit = Math.floor(given);
      }
      return findBounded(id, scan, model, state, ctx, limit);
    };
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
    return findBounded('skyscraper', scanSkyscraper, model, state, ctx, SKYSCRAPER_WORK_LIMIT);
  });
  define('twoStringKite', 34, 114, function (model, state, ctx) {
    return findBounded('twoStringKite', scanKite, model, state, ctx, KITE_WORK_LIMIT);
  });
  define('simpleColouring', 36, 120, findSimpleColouring);
  define('emptyRectangle', 38, 124, function (model, state, ctx) {
    return findBounded('emptyRectangle', scanEmptyRectangle, model, state, ctx, EMPTY_RECTANGLE_WORK_LIMIT);
  });
  define('finnedXWing', 40, 126, function (model, state, ctx) {
    return findBounded('finnedXWing', scanFinnedXWing, model, state, ctx, FINNED_X_WING_WORK_LIMIT);
  });
  define('swordfish', 42, 130, function (model, state, ctx) {
    return findFish(model, state, ctx, 3, 'swordfish');
  });
  define('jellyfish', 56, 137, function (model, state, ctx) {
    return findFish(model, state, ctx, 4, 'jellyfish');
  });

  // The parameterised searches behind skyscraper, twoStringKite, emptyRectangle and finnedXWing, for tests
  // (explicit work limit); not registered techniques. `finnedFish` is the shared enumeration of the finned
  // fish with an explicit size: 2 is the finned X-Wing, 3 the finned Swordfish, which no technique registers
  // yet.
  if (!SG.fishSearch) {
    const finnedSwordfishSeam = seamOf('finnedSwordfish', scanFinnedSwordfish, FINNED_X_WING_WORK_LIMIT);
    const finnedXWingSeam = seamOf('finnedXWing', scanFinnedXWing, FINNED_X_WING_WORK_LIMIT);
    SG.fishSearch = Object.freeze({
      SKYSCRAPER_WORK_LIMIT: SKYSCRAPER_WORK_LIMIT,
      KITE_WORK_LIMIT: KITE_WORK_LIMIT,
      EMPTY_RECTANGLE_WORK_LIMIT: EMPTY_RECTANGLE_WORK_LIMIT,
      FINNED_X_WING_WORK_LIMIT: FINNED_X_WING_WORK_LIMIT,
      skyscraper: seamOf('skyscraper', scanSkyscraper, SKYSCRAPER_WORK_LIMIT),
      twoStringKite: seamOf('twoStringKite', scanKite, KITE_WORK_LIMIT),
      emptyRectangle: seamOf('emptyRectangle', scanEmptyRectangle, EMPTY_RECTANGLE_WORK_LIMIT),
      finnedXWing: finnedXWingSeam,
      finnedFish: function (model, state, ctx, opts) {
        const size = opts === undefined || opts === null ? undefined : opts.size;
        if (size !== 2 && size !== 3) {
          const err = new SG.errors.GenerationError('solver.invalidOption',
            { option: 'fishSearch.finnedFish.size' });
          err.message = 'solver.invalidOption: fishSearch.finnedFish size must be 2 or 3';
          throw err;
        }
        return (size === 2 ? finnedXWingSeam : finnedSwordfishSeam)(model, state, ctx, opts);
      }
    });
  }
})(typeof self !== 'undefined' ? self : globalThis);
