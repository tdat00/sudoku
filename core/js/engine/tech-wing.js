/**
 * Wing techniques (group `wing`): Remote Pairs, XY-Wing, XYZ-Wing, WXYZ-Wing, W-Wing and Unique Rectangle
 * (types 1, 2).
 *
 *   id               baseCost  order  assumesUniqueness
 *   remotePairs          35     116   false
 *   xyWing               48     140   false
 *   xyzWing              54     150   false
 *   wxyzWing             57     155   false
 *   wWing                60     170   false
 *   uniqueRectangle      66     180   true
 *
 * Everything here is generic: "sees" means "shares at least one unit" (`model.peers`), so any digit count and
 * unit shape works. Eliminations are only taken from unsolved cells. `state` is read, never written; one call
 * returns at most one deduction (the first in a fixed scan order: cells and peers ascending).
 *
 * Translation keys (i18nKey -> i18nArgs; values are numbers or strings, cells are 'R4C7' labels):
 *   technique.remotePairs.step          { digits, ends, length }
 *   technique.xyWing.step               { pivot, pincer1, pincer2, digitX, digitY, digit }
 *   technique.xyzWing.step              { pivot, pincer1, pincer2, digitX, digitY, digit }
 *   technique.wxyzWing.step             { digits, digit, cells }
 *   technique.wWing.step                { cell1, cell2, link1, link2, unit, digitX, digit }
 *   technique.uniqueRectangle.type1.step  { cell, digitX, digitY }
 *   technique.uniqueRectangle.type2.step  { roof1, roof2, digitX, digitY, digit }
 * `digit` is always the digit that gets eliminated, `digitX` / `digitY` the other digits of the pattern.
 *
 * W-Wing: two bi-value cells with the same pair {X, Y} that do not see each other, joined by a strong link
 * on X (a COMPLETE unit where X has exactly two candidate cells P and Q, P seeing one wing cell and Q the
 * other). If wing cell 1 is X then P is not X, so Q is X, so wing cell 2 is Y; otherwise wing cell 1 is Y.
 * Either way one of the wing cells is Y, so Y goes from every cell that sees both. A partial unit is no
 * strong link: X does not have to occur in it.
 *
 * Remote Pairs (rating v3, R13): the open cells with exactly the same two candidates {X, Y} form a graph
 * whose edges are real peers (`model.peers`: any unit, so rows, columns, boxes, regions, diagonals and
 * windows all count, and a unit that is not complete still holds different digits). Peers take different
 * digits of the pair, so along a path the two digits alternate. The cells are two-coloured from the lowest
 * cell of their component by a breadth-first walk, and a component with an odd cycle (a peer edge between
 * two cells of one colour, a triple of the same pair in a unit among them) is inconsistent: no deduction is
 * taken from it. Two cells of opposite colours are joined by a path with an odd number of EDGES (cells do
 * not count), 1 when they are peers and at least 3 otherwise. The shortest path between the selected
 * visible opposite-colour ends must have at least three edges: adjacent ends alone do not qualify, and
 * another adjacent-pair justification of the same target does not invalidate a genuine remote witness (the
 * two cells of an adjacent pair use both digits too, so the removal is sound either way). The ends of such a
 * path hold X and Y in one order or the other, so together they use both digits and X and Y go from every
 * open cell that sees both ends. A target is never a cell of its component (it would see both ends only by
 * being adjacent to both, which parity forbids), so the proving cells never lose a digit. Two cells of the
 * same colour, or of different components, prove nothing. The pattern is looked for in the order component
 * (by its lowest cell), lower end, higher end (cell order); the first pair of ends with a target is
 * returned, with the cells of one shortest path between those ends (a breadth-first search from the lower
 * end, peers ascending; shortest for the chosen ends, not claimed shortest among all justifications of the
 * target) in `cells` (cell order), the pair in `digits`, the ends in `ends` (cell order) and the number of
 * edges of that path in `length` (3, 5, 7, ...). A pair of digits held by fewer than four open cells has no
 * nontrivial pair of ends and its cells are never walked.
 *
 * Work (R10) of Remote Pairs: a unit is one edge extension, a same-pair peer found while a cell of a
 * component is expanded (in the colouring walk and in the walk for the witness path), or one tested pair of
 * ends (opposite colours, not peers). The limit is 50000 per call (`SG.wingSearch.REMOTE_PAIRS_WORK_LIMIT`);
 * a spent limit ends the call with null (a lost deduction, never an invented one: a component is used only
 * after its colouring is complete, so null with `capHit: 'work'` proves no absence, while a finding made
 * before the limit is spent is complete). The parent budget is checked at entry and before the unit that
 * would carry the work done since the last check over 256 units; the counter is local to the call. A spent
 * budget ('budget.exceeded') is "nothing found" as for the other bounded finders, cancellation and every
 * other error propagate. `ctx.options.onPatternWork(record)` observes each call and never selects its
 * result: { id, work, limit, capHit (null | 'work'), retained (null) }, a fresh object per call.
 *
 * WXYZ-Wing (rating v3, R13): four open cells whose candidates together are exactly four digits. A digit of
 * the four is RESTRICTED when every pair of its occurrences in the four cells sees each other (`model.peers`:
 * two cells that see each other cannot both hold it, so the digit is held at most once; a digit that occurs
 * in one cell only is restricted too), and non-restricted when two of its occurrences do not see each other.
 * Exactly one digit z must be non-restricted. The other three digits are restricted, so together they fill at
 * most three of the four cells; every cell holds one of the four digits, so at least one cell holds z, and z
 * goes from every open cell that sees ALL the cells of the quartet that have z: a z cell that is overlooked
 * could be the one that holds it. A cell of the quartet never is a target (a cell does not see itself, and a
 * quartet cell without z has nothing to lose). Nothing else is asked of the quartet: no pivot cell, no
 * connected shape, no unit shape and no number of candidates per cell (one to four; XY-Wing, XYZ-Wing and a
 * naked quad are other patterns or leave no non-restricted digit). Fewer or more than four digits, no
 * non-restricted digit, or two of them, prove nothing. The quartets are looked for in ascending cell order
 * (the lowest cell, then the next one above it, and so on); the first quartet with a target is returned with
 * all its targets: `cells` (the four cells, ascending), the eliminations (cell ascending, the digit z) and
 * the arguments `digits` (the four digits, ascending), `digit` (z) and `cells` (their four labels, cell
 * order).
 *
 * Work (R10) of WXYZ-Wing: a unit is one tested combination extension, an open cell of at most four
 * candidates tried as the next member of a partial quartet (the empty one included, so the first cell of a
 * quartet is a unit as well). A cell that would bring the union above four digits, or a second non-restricted
 * digit, costs its unit and is not extended further; a cell that completes a quartet also covers the target
 * scan of that quartet (one pass over the peers of one cell). The limit is 50000 per call
 * (`SG.wingSearch.WXYZ_WORK_LIMIT`); a spent limit ends the call with null (a lost deduction, never an
 * invented one: a quartet is used as soon as it is complete, so a finding made before the limit is spent is
 * complete, and null with `capHit: 'work'` proves no absence). The parent budget, cancellation and the
 * observer are those of Remote Pairs, the observer's id is 'wxyzWing'.
 *
 * Unique Rectangle (assumesUniqueness: true) is valid only because a puzzle has ONE solution, so the logical
 * solver skips it with `assumeUniqueness: false` (how uniqueness is verified without circular reasoning);
 * find() also returns null on its own then.
 *   The "deadly pattern": four cells that all hold only {X, Y}. If every unit touching the four cells holds
 *   exactly two of them, swapping X and Y in them turns one solution into another, which a unique puzzle
 *   cannot have. So detection needs, for a model without cages and inequalities (their sums and signs are not
 *   invariant under the swap, so UR is never used there):
 *     - exactly two row units, two column units and two box-like units (kind 'box' or 'region') touch the
 *       four cells, each holding exactly two of them, and every cell lies in some box-like unit;
 *     - every other unit touching them (diagonal, window, ...) holds exactly two of them as well.
 *   On a classic grid this is the textbook "2 rows, 2 columns, 2 boxes"; on a Jigsaw board the "boxes" are
 *   the irregular regions, so a rectangle over three or four regions, or with three corners in one region,
 *   never fires. Type 1: three cells hold exactly {X, Y}, the fourth holds more: X and Y leave the fourth
 *   cell. Type 2: two cells hold exactly {X, Y}, the other two (sharing a side) hold {X, Y, Z}: Z is in one
 *   of them, so Z leaves every cell that sees both.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  const popcount = SG.bits.popcount;

  const KIND_ROW = 1;
  const KIND_COL = 2;
  const KIND_BOX = 3;

  // R10 work policy of Remote Pairs: the units one call may spend (edge extensions and tested pairs of ends)
  // and how many may pass between two checks of the parent budget.
  const REMOTE_PAIRS_WORK_LIMIT = 50000;
  const WORK_CHECK_UNITS = 256;

  // R10 work policy of WXYZ-Wing: the combination extensions one call may spend (the parent budget is checked
  // as for Remote Pairs, every WORK_CHECK_UNITS).
  const WXYZ_WORK_LIMIT = 50000;

  // Thrown through the walks of a Remote Pairs call whose work limit is spent.
  const WORK_CAP = Object.freeze({ capHit: 'work' });

  const infoCache = new WeakMap();

  function infoFor(model) {
    let info = infoCache.get(model);
    if (info === undefined) {
      const n = model.cellCount;
      const adj = new Uint8Array(n * n);
      for (let a = 0; a < n; a++) {
        const ps = model.peers[a];
        for (let i = 0; i < ps.length; i++) adj[a * n + ps[i]] = 1;
      }
      info = {
        n: n,
        adj: adj,
        bi: new Int32Array(n),
        listA: new Int32Array(n),
        listB: new Int32Array(n),
        elim: new Int32Array(n),
        link: new Int32Array(3),
        quad: new Int32Array(4),
        masks: new Int32Array(4),
        rects: null,
        // Remote Pairs: the call that reached a cell, its colour (1 / 2), the walk queue, the component in
        // cell order, the walk's distance and predecessor, and the number of open cells per pair of digits.
        rpStamp: 0,
        rpMark: new Int32Array(n),
        rpColour: new Uint8Array(n),
        rpQueue: new Int32Array(n),
        rpComp: new Int32Array(n),
        rpDist: new Int32Array(n),
        rpFrom: new Int32Array(n),
        rpGroup: new Int32Array(model.digits * model.digits),
        // WXYZ-Wing: the open cells of at most four candidates, the quartet being built, and the union and
        // the non-restricted digits of its first 0..3 cells (index = number of cells).
        wxPool: new Int32Array(n),
        wxQuad: new Int32Array(4),
        wxUnion: new Int32Array(4),
        wxNon: new Int32Array(4),
        wxHolders: new Int32Array(4)
      };
      infoCache.set(model, info);
    }
    return info;
  }

  function digitOf(bit) {
    return 32 - Math.clz32(bit);
  }

  function byNumber(a, b) {
    return a - b;
  }

  function label(model, cell) {
    return SG.model.cellLabel(model, cell);
  }

  /** Fills `info.bi` with the unsolved cells that have exactly two candidates; returns how many. */
  function collectBivalue(info, state) {
    const cand = state.candidates;
    const value = state.value;
    const bi = info.bi;
    let count = 0;
    for (let c = 0; c < info.n; c++) {
      if (value[c] === 0 && popcount(cand[c]) === 2) bi[count++] = c;
    }
    return count;
  }

  /**
   * Fills `info.elim` with the unsolved cells that see `a`, `b` and (when >= 0) `third` and still have one
   * of the digits in `bits`; returns how many.
   */
  function collectCommon(model, state, info, a, b, third, bits) {
    const n = info.n;
    const adj = info.adj;
    const cand = state.candidates;
    const value = state.value;
    const elim = info.elim;
    const ps = model.peers[a];
    let count = 0;
    for (let i = 0; i < ps.length; i++) {
      const c = ps[i];
      if (adj[b * n + c] === 0 || (third >= 0 && adj[third * n + c] === 0)) continue;
      if (value[c] === 0 && (cand[c] & bits) !== 0) elim[count++] = c;
    }
    return count;
  }

  function eliminationsOf(info, count, digit) {
    const out = [];
    for (let i = 0; i < count; i++) out.push([info.elim[i], digit]);
    return out;
  }

  // Pivot {X, Y} seeing pincers {X, Z} and {Y, Z}: Z leaves every cell that sees both pincers.
  function findXyWing(model, state, ctx) {
    const info = infoFor(model);
    const cand = state.candidates;
    const value = state.value;
    const listA = info.listA;
    const listB = info.listB;

    for (let p = 0; p < info.n; p++) {
      if (value[p] !== 0) continue;
      const pm = cand[p];
      if (popcount(pm) !== 2) continue;
      ctx.check();
      const xBit = pm & -pm;
      const yBit = pm ^ xBit;
      const ps = model.peers[p];
      let na = 0;
      let nb = 0;
      for (let i = 0; i < ps.length; i++) {
        const c = ps[i];
        if (value[c] !== 0 || popcount(cand[c]) !== 2) continue;
        const shared = cand[c] & pm;
        if (shared === xBit) listA[na++] = c;
        else if (shared === yBit) listB[nb++] = c;
      }
      for (let i = 0; i < na; i++) {
        const a = listA[i];
        const zBit = cand[a] ^ xBit;
        const bMask = yBit | zBit;
        for (let j = 0; j < nb; j++) {
          const b = listB[j];
          if (cand[b] !== bMask) continue;
          const count = collectCommon(model, state, info, a, b, -1, zBit);
          if (count === 0) continue;
          const digit = digitOf(zBit);
          return {
            technique: 'xyWing',
            cells: [p, a, b],
            placements: [],
            eliminations: eliminationsOf(info, count, digit),
            i18nKey: 'technique.xyWing.step',
            i18nArgs: {
              pivot: label(model, p),
              pincer1: label(model, a),
              pincer2: label(model, b),
              digitX: digitOf(xBit),
              digitY: digitOf(yBit),
              digit: digit
            }
          };
        }
      }
    }
    return null;
  }

  // Pivot {X, Y, Z} seeing pincers {X, Z} and {Y, Z}: Z leaves every cell that sees the pivot and both
  // pincers.
  function findXyzWing(model, state, ctx) {
    const info = infoFor(model);
    const cand = state.candidates;
    const value = state.value;
    const subs = info.listA;

    for (let p = 0; p < info.n; p++) {
      if (value[p] !== 0) continue;
      const pm = cand[p];
      if (popcount(pm) !== 3) continue;
      ctx.check();
      const ps = model.peers[p];
      let ns = 0;
      for (let i = 0; i < ps.length; i++) {
        const c = ps[i];
        if (value[c] === 0 && (cand[c] & ~pm) === 0 && popcount(cand[c]) === 2) subs[ns++] = c;
      }
      for (let i = 0; i < ns; i++) {
        const a = subs[i];
        for (let j = i + 1; j < ns; j++) {
          const b = subs[j];
          if (cand[a] === cand[b]) continue;
          // Two different pairs inside a triple share exactly one digit: the Z of the wing.
          const zBit = cand[a] & cand[b];
          const count = collectCommon(model, state, info, a, b, p, zBit);
          if (count === 0) continue;
          const xBit = cand[a] ^ zBit;
          const yBit = cand[b] ^ zBit;
          const digit = digitOf(zBit);
          return {
            technique: 'xyzWing',
            cells: [p, a, b],
            placements: [],
            eliminations: eliminationsOf(info, count, digit),
            i18nKey: 'technique.xyzWing.step',
            i18nArgs: {
              pivot: label(model, p),
              pincer1: label(model, a),
              pincer2: label(model, b),
              digitX: digitOf(xBit),
              digitY: digitOf(yBit),
              digit: digit
            }
          };
        }
      }
    }
    return null;
  }

  // The other X cell of a strong link (`unit` is complete and holds `bit` in exactly two unsolved cells, one
  // of them `cell`), or -1.
  function strongLinkMate(model, state, unit, cell, bit) {
    const cells = model.units[unit];
    const cand = state.candidates;
    const value = state.value;
    let mate = -1;
    let count = 0;
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if ((cand[c] & bit) === 0) continue;
      if (value[c] !== 0 || ++count > 2) return -1;
      if (c !== cell) mate = c;
    }
    return count === 2 ? mate : -1;
  }

  // Looks for a strong link on `bit` whose cells P and Q are seen by wing cells `a` and `b`; writes P, Q and
  // the unit into `info.link`.
  function findStrongLink(model, state, ctx, info, a, b, bit) {
    const n = info.n;
    const adj = info.adj;
    const cand = state.candidates;
    const value = state.value;
    const ps = model.peers[a];
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (value[p] !== 0 || (cand[p] & bit) === 0) continue;
      const us = model.cellUnits[p];
      for (let j = 0; j < us.length; j++) {
        const u = us[j];
        if (ctx.completeUnits[u] !== 1) continue;
        const q = strongLinkMate(model, state, u, p, bit);
        if (q >= 0 && adj[b * n + q] === 1) {
          info.link[0] = p;
          info.link[1] = q;
          info.link[2] = u;
          return true;
        }
      }
    }
    return false;
  }

  // Two {X, Y} cells that do not see each other, joined by a strong link on X: Y leaves every cell that sees
  // both.
  function findWWing(model, state, ctx) {
    const info = infoFor(model);
    const n = info.n;
    const adj = info.adj;
    const cand = state.candidates;
    const bi = info.bi;
    const count = collectBivalue(info, state);

    for (let i = 0; i < count; i++) {
      const a = bi[i];
      const mask = cand[a];
      const low = mask & -mask;
      for (let j = i + 1; j < count; j++) {
        const b = bi[j];
        if (cand[b] !== mask || adj[a * n + b] === 1) continue;
        ctx.check();
        for (let k = 0; k < 2; k++) {
          const linkBit = k === 0 ? low : mask ^ low;
          const elimBit = mask ^ linkBit;
          const found = collectCommon(model, state, info, a, b, -1, elimBit);
          if (found === 0 || !findStrongLink(model, state, ctx, info, a, b, linkBit)) continue;
          const digit = digitOf(elimBit);
          return {
            technique: 'wWing',
            cells: [a, b, info.link[0], info.link[1]],
            placements: [],
            eliminations: eliminationsOf(info, found, digit),
            i18nKey: 'technique.wWing.step',
            i18nArgs: {
              cell1: label(model, a),
              cell2: label(model, b),
              link1: label(model, info.link[0]),
              link2: label(model, info.link[1]),
              unit: model.unitMeta[info.link[2]].label,
              digitX: digitOf(linkBit),
              digit: digit
            }
          };
        }
      }
    }
    return null;
  }

  function unitKinds(model) {
    const kinds = new Uint8Array(model.units.length);
    for (let u = 0; u < kinds.length; u++) {
      const kind = model.unitMeta[u].kind;
      if (kind === 'row') kinds[u] = KIND_ROW;
      else if (kind === 'col') kinds[u] = KIND_COL;
      else if (kind === 'box' || kind === 'region') kinds[u] = KIND_BOX;
    }
    return kinds;
  }

  function sharesKind(model, kinds, c, d, kind) {
    const uc = model.cellUnits[c];
    const ud = model.cellUnits[d];
    for (let i = 0; i < uc.length; i++) {
      if (kinds[uc[i]] !== kind) continue;
      for (let j = 0; j < ud.length; j++) {
        if (ud[j] === uc[i]) return true;
      }
    }
    return false;
  }

  // The geometry rule of the file header. `hits` is a zeroed scratch array over the units and is left zeroed.
  function isDeadlyGeometry(model, kinds, hits, quad) {
    let k;
    let j;
    for (k = 0; k < 4; k++) {
      const us = model.cellUnits[quad[k]];
      for (j = 0; j < us.length; j++) hits[us[j]]++;
    }
    let ok = true;
    let rows = 0;
    let cols = 0;
    let boxes = 0;
    for (k = 0; k < 4; k++) {
      const us = model.cellUnits[quad[k]];
      let inBox = false;
      for (j = 0; j < us.length; j++) {
        const u = us[j];
        if (kinds[u] === KIND_BOX) inBox = true;
        const h = hits[u];
        if (h === 0) continue;
        hits[u] = 0;
        if (h !== 2) ok = false;
        else if (kinds[u] === KIND_ROW) rows++;
        else if (kinds[u] === KIND_COL) cols++;
        else if (kinds[u] === KIND_BOX) boxes++;
      }
      if (!inBox) ok = false;
    }
    return ok && rows === 2 && cols === 2 && boxes === 2;
  }

  // All candidate rectangles as [a, b, c, d]: a, b share a row, c, d another row, a, c share a column, b, d
  // another one. Empty for a model with cages or inequalities. Computed once per model.
  function buildRectangles(model) {
    if (model.cages.length > 0 || model.inequalities.length > 0) return new Int32Array(0);
    const kinds = unitKinds(model);
    const hits = new Int32Array(model.units.length);
    const quad = new Int32Array(4);
    const sorted = new Int32Array(4);
    const seen = new Set();
    const n = model.cellCount;
    const out = [];

    function consider(a, b, c, d) {
      quad[0] = a;
      quad[1] = b;
      quad[2] = c;
      quad[3] = d;
      if (!isDeadlyGeometry(model, kinds, hits, quad)) return;
      sorted.set(quad);
      sorted.sort();
      const key = ((sorted[0] * n + sorted[1]) * n + sorted[2]) * n + sorted[3];
      if (seen.has(key)) return;
      seen.add(key);
      out.push(a, b, c, d);
    }

    function fromRowPair(a, b) {
      const ua = model.cellUnits[a];
      const ub = model.cellUnits[b];
      for (let i = 0; i < ua.length; i++) {
        if (kinds[ua[i]] !== KIND_COL) continue;
        const colA = model.units[ua[i]];
        for (let x = 0; x < colA.length; x++) {
          const c = colA[x];
          if (c === a || c === b) continue;
          for (let j = 0; j < ub.length; j++) {
            if (kinds[ub[j]] !== KIND_COL || ub[j] === ua[i]) continue;
            const colB = model.units[ub[j]];
            for (let y = 0; y < colB.length; y++) {
              const d = colB[y];
              if (d === a || d === b || d === c) continue;
              if (sharesKind(model, kinds, c, d, KIND_ROW)) consider(a, b, c, d);
            }
          }
        }
      }
    }

    for (let u = 0; u < kinds.length; u++) {
      if (kinds[u] !== KIND_ROW) continue;
      const row = model.units[u];
      for (let i = 0; i < row.length; i++) {
        for (let j = i + 1; j < row.length; j++) fromRowPair(row[i], row[j]);
      }
    }
    return Int32Array.from(out);
  }

  function rectanglesOf(model, info) {
    if (info.rects === null) info.rects = buildRectangles(model);
    return info.rects;
  }

  function uniqueRectangleType1(model, a, b, c, d, target, common) {
    const xBit = common & -common;
    const yBit = common ^ xBit;
    return {
      technique: 'uniqueRectangle',
      cells: [a, b, c, d],
      placements: [],
      eliminations: [[target, digitOf(xBit)], [target, digitOf(yBit)]],
      i18nKey: 'technique.uniqueRectangle.type1.step',
      i18nArgs: { cell: label(model, target), digitX: digitOf(xBit), digitY: digitOf(yBit) }
    };
  }

  function uniqueRectangleType2(model, info, quad, roof1, roof2, count, common, zBit) {
    const xBit = common & -common;
    const yBit = common ^ xBit;
    return {
      technique: 'uniqueRectangle',
      cells: [quad[0], quad[1], quad[2], quad[3]],
      placements: [],
      eliminations: eliminationsOf(info, count, digitOf(zBit)),
      i18nKey: 'technique.uniqueRectangle.type2.step',
      i18nArgs: {
        roof1: label(model, roof1),
        roof2: label(model, roof2),
        digitX: digitOf(xBit),
        digitY: digitOf(yBit),
        digit: digitOf(zBit)
      }
    };
  }

  // Unique Rectangle types 1 and 2; skipped when the caller does not assume a unique solution.
  function findUniqueRectangle(model, state, ctx) {
    if (ctx.assumeUniqueness === false) return null;
    const info = infoFor(model);
    const rects = rectanglesOf(model, info);
    const cand = state.candidates;
    const value = state.value;
    const quad = info.quad;
    const masks = info.masks;

    for (let r = 0; r < rects.length; r += 4) {
      if ((r & 255) === 0) ctx.check();
      let open = true;
      for (let k = 0; k < 4; k++) {
        quad[k] = rects[r + k];
        masks[k] = cand[quad[k]];
        if (value[quad[k]] !== 0) open = false;
      }
      if (!open) continue;
      const common = masks[0] & masks[1] & masks[2] & masks[3];
      if (popcount(common) !== 2) continue;

      let exact = 0;
      let first = -1;
      let second = -1;
      for (let k = 0; k < 4; k++) {
        if (masks[k] === common) exact++;
        else if (first < 0) first = k;
        else second = k;
      }

      if (exact === 3) {
        return uniqueRectangleType1(model, quad[0], quad[1], quad[2], quad[3], quad[first], common);
      }
      // Roofs on opposite corners (indices 0+3 or 1+2) are not a type 2 rectangle.
      if (exact === 2 && first + second !== 3 && masks[first] === masks[second] &&
          popcount(masks[first]) === 3) {
        const zBit = masks[first] ^ common;
        const count = collectCommon(model, state, info, quad[first], quad[second], -1, zBit);
        if (count > 0) {
          return uniqueRectangleType2(model, info, quad, quad[first], quad[second], count, common, zBit);
        }
      }
    }
    return null;
  }

  // One work unit is one edge extension or one tested pair of ends. The parent budget is checked before the
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

  // The slot of the pair of digits of a two-candidate mask in `info.rpGroup`.
  function pairSlot(model, mask) {
    return (digitOf(mask & -mask) - 1) * model.digits + digitOf(mask) - 1;
  }

  // The Finding of the ends x < y (opposite colours, not peers) of a component with `size` cells in
  // `info.rpComp`: `found` targets are in `info.elim`. One shortest path from x to y gives `cells` and
  // `length`.
  function remotePairsFinding(model, state, info, run, size, x, y, mask, found) {
    const cand = state.candidates;
    const value = state.value;
    const comp = info.rpComp;
    const dist = info.rpDist;
    const from = info.rpFrom;
    const queue = info.rpQueue;
    for (let i = 0; i < size; i++) dist[comp[i]] = -1;
    dist[x] = 0;
    queue[0] = x;
    let tail = 1;
    for (let head = 0; head < tail && dist[y] < 0; head++) {
      const u = queue[head];
      const ps = model.peers[u];
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        if (value[p] !== 0 || cand[p] !== mask) continue;
        spend(run);
        if (dist[p] < 0) {
          dist[p] = dist[u] + 1;
          from[p] = u;
          queue[tail++] = p;
        }
      }
    }
    const path = [];
    for (let c = y; c !== x; c = from[c]) path.push(c);
    path.push(x);
    path.sort(byNumber);
    const lowBit = mask & -mask;
    const eliminations = [];
    for (let i = 0; i < found; i++) {
      const c = info.elim[i];
      if ((cand[c] & lowBit) !== 0) eliminations.push([c, digitOf(lowBit)]);
      if ((cand[c] & (mask ^ lowBit)) !== 0) eliminations.push([c, digitOf(mask)]);
    }
    return {
      technique: 'remotePairs',
      cells: path,
      placements: [],
      eliminations: eliminations,
      i18nKey: 'technique.remotePairs.step',
      i18nArgs: { digits: [digitOf(lowBit), digitOf(mask)], ends: [label(model, x), label(model, y)],
        length: dist[y] }
    };
  }

  // Colours the component of `root` (open cells with the same two candidates, joined by real peers) by a
  // breadth-first walk and returns the Finding of its first pair of ends that has a target, or null. Every
  // cell of the component is marked with `stamp` whatever the outcome, so a component is looked at once.
  function remotePairsComponent(model, state, info, run, root, stamp) {
    const cand = state.candidates;
    const value = state.value;
    const mark = info.rpMark;
    const colour = info.rpColour;
    const queue = info.rpQueue;
    const mask = cand[root];
    let size = 0;
    let consistent = true;
    queue[size++] = root;
    mark[root] = stamp;
    colour[root] = 1;
    for (let head = 0; head < size; head++) {
      const x = queue[head];
      const ps = model.peers[x];
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        if (value[p] !== 0 || cand[p] !== mask) continue;
        spend(run);
        if (mark[p] !== stamp) {
          mark[p] = stamp;
          colour[p] = 3 - colour[x];
          queue[size++] = p;
        } else if (colour[p] === colour[x]) {
          consistent = false;
        }
      }
    }
    if (!consistent || size < 4) return null;

    const comp = info.rpComp;
    for (let i = 0; i < size; i++) comp[i] = queue[i];
    comp.subarray(0, size).sort();
    const n = info.n;
    const adj = info.adj;
    for (let i = 0; i < size - 1; i++) {
      const x = comp[i];
      for (let j = i + 1; j < size; j++) {
        const y = comp[j];
        if (colour[y] === colour[x] || adj[x * n + y] === 1) continue;
        spend(run);
        const found = collectCommon(model, state, info, x, y, -1, mask);
        if (found > 0) return remotePairsFinding(model, state, info, run, size, x, y, mask, found);
      }
    }
    return null;
  }

  // Components in the order of their lowest cell. A pair of digits held by fewer than four open cells has no
  // path of three edges, so its cells are never walked.
  function scanRemotePairs(model, state, info, run) {
    const cand = state.candidates;
    const bi = info.bi;
    const count = collectBivalue(info, state);
    if (count < 4) return null;
    const group = info.rpGroup;
    group.fill(0);
    for (let i = 0; i < count; i++) group[pairSlot(model, cand[bi[i]])]++;
    if (info.rpStamp >= 0x7ffffff0) {
      info.rpMark.fill(0);
      info.rpStamp = 0;
    }
    const stamp = ++info.rpStamp;
    for (let i = 0; i < count; i++) {
      const a = bi[i];
      if (info.rpMark[a] === stamp || group[pairSlot(model, cand[a])] < 4) continue;
      const found = remotePairsComponent(model, state, info, run, a, stamp);
      if (found !== null) return found;
    }
    return null;
  }

  // A Remote Pairs call with its own work counter (`workLimit` is the default except in the tests' seam). A
  // spent work limit and a spent budget are "nothing found" (the logical solver notices the budget at its
  // next check); cancellation and every other error propagate. The work goes to the optional observer, which
  // never selects the result.
  function findRemotePairsBounded(model, state, ctx, workLimit) {
    const info = infoFor(model);
    const run = { ctx: ctx, limit: workLimit, work: 0, checkedAt: 0, capped: false };
    let found = null;
    try {
      ctx.check();
      found = scanRemotePairs(model, state, info, run);
    } catch (err) {
      if (err === WORK_CAP) run.capped = true;
      else if (!(err && err.code === 'budget.exceeded')) throw err;
    }
    const observer = ctx.options ? ctx.options.onPatternWork : undefined;
    if (typeof observer === 'function') {
      observer({
        id: 'remotePairs',
        work: run.work,
        limit: workLimit,
        capHit: run.capped ? 'work' : null,
        retained: null
      });
    }
    return found;
  }

  function findRemotePairs(model, state, ctx) {
    return findRemotePairsBounded(model, state, ctx, REMOTE_PAIRS_WORK_LIMIT);
  }

  // The Finding of a complete quartet `info.wxQuad` with the digits `union` (four bits) and the one
  // non-restricted digit `zBit`: every open cell that sees all the quartet cells with z loses z (the peers of
  // a cell ascend, so the targets do too). Null without a target.
  function wxyzFinding(model, state, info, union, zBit) {
    const n = info.n;
    const adj = info.adj;
    const cand = state.candidates;
    const value = state.value;
    const quad = info.wxQuad;
    const holders = info.wxHolders;
    let held = 0;
    for (let k = 0; k < 4; k++) {
      if ((cand[quad[k]] & zBit) !== 0) holders[held++] = quad[k];
    }
    const digit = digitOf(zBit);
    const eliminations = [];
    const ps = model.peers[holders[0]];
    for (let i = 0; i < ps.length; i++) {
      const t = ps[i];
      if (value[t] !== 0 || (cand[t] & zBit) === 0) continue;
      let seesAll = true;
      for (let k = 1; k < held && seesAll; k++) seesAll = adj[holders[k] * n + t] === 1;
      if (seesAll) eliminations.push([t, digit]);
    }
    if (eliminations.length === 0) return null;
    const digits = [];
    for (let bits = union; bits !== 0; bits &= bits - 1) digits.push(digitOf(bits & -bits));
    const cells = [quad[0], quad[1], quad[2], quad[3]];
    return {
      technique: 'wxyzWing',
      cells: cells,
      placements: [],
      eliminations: eliminations,
      i18nKey: 'technique.wxyzWing.step',
      i18nArgs: {
        digits: digits,
        digit: digit,
        cells: cells.map(function (c) { return label(model, c); })
      }
    };
  }

  // Extends the partial quartet of `depth` cells (`info.wxQuad`, the union and the non-restricted digits of
  // its cells in `info.wxUnion` / `info.wxNon`) by one pool cell above position `from`, in ascending order,
  // and returns the Finding of the first complete quartet with a target, or null. Every tested cell is one
  // unit.
  function wxyzExtend(model, state, info, run, depth, from, size) {
    const n = info.n;
    const adj = info.adj;
    const cand = state.candidates;
    const pool = info.wxPool;
    const quad = info.wxQuad;
    for (let i = from; i <= size - (4 - depth); i++) {
      spend(run);
      const c = pool[i];
      const union = info.wxUnion[depth] | cand[c];
      if (popcount(union) > 4) continue;
      let non = info.wxNon[depth];
      for (let k = 0; k < depth; k++) {
        if (adj[quad[k] * n + c] === 0) non |= cand[quad[k]] & cand[c];
      }
      if (popcount(non) > 1) continue;
      quad[depth] = c;
      if (depth === 3) {
        if (non !== 0 && popcount(union) === 4) {
          const found = wxyzFinding(model, state, info, union, non);
          if (found !== null) return found;
        }
        continue;
      }
      info.wxUnion[depth + 1] = union;
      info.wxNon[depth + 1] = non;
      const found = wxyzExtend(model, state, info, run, depth + 1, i + 1, size);
      if (found !== null) return found;
    }
    return null;
  }

  function scanWxyz(model, state, info, run) {
    const cand = state.candidates;
    const value = state.value;
    const pool = info.wxPool;
    let size = 0;
    for (let c = 0; c < info.n; c++) {
      if (value[c] !== 0) continue;
      const count = popcount(cand[c]);
      if (count >= 1 && count <= 4) pool[size++] = c;
    }
    if (size < 4) return null;
    info.wxUnion[0] = 0;
    info.wxNon[0] = 0;
    return wxyzExtend(model, state, info, run, 0, 0, size);
  }

  // A WXYZ-Wing call with its own work counter (`workLimit` is the default except in the tests' seam); the
  // limit, budget, cancellation and observer rules are those of findRemotePairsBounded.
  function findWxyzBounded(model, state, ctx, workLimit) {
    const info = infoFor(model);
    const run = { ctx: ctx, limit: workLimit, work: 0, checkedAt: 0, capped: false };
    let found = null;
    try {
      ctx.check();
      found = scanWxyz(model, state, info, run);
    } catch (err) {
      if (err === WORK_CAP) run.capped = true;
      else if (!(err && err.code === 'budget.exceeded')) throw err;
    }
    const observer = ctx.options ? ctx.options.onPatternWork : undefined;
    if (typeof observer === 'function') {
      observer({
        id: 'wxyzWing',
        work: run.work,
        limit: workLimit,
        capHit: run.capped ? 'work' : null,
        retained: null
      });
    }
    return found;
  }

  function findWxyzWing(model, state, ctx) {
    return findWxyzBounded(model, state, ctx, WXYZ_WORK_LIMIT);
  }

  const DEFINITIONS = [
    {
      id: 'remotePairs',
      group: 'wing',
      baseCost: 35,
      order: 116,
      i18nKey: 'technique.remotePairs',
      variantScope: null,
      assumesUniqueness: false,
      find: findRemotePairs
    },
    {
      id: 'xyWing',
      group: 'wing',
      baseCost: 48,
      order: 140,
      i18nKey: 'technique.xyWing',
      variantScope: null,
      assumesUniqueness: false,
      find: findXyWing
    },
    {
      id: 'xyzWing',
      group: 'wing',
      baseCost: 54,
      order: 150,
      i18nKey: 'technique.xyzWing',
      variantScope: null,
      assumesUniqueness: false,
      find: findXyzWing
    },
    {
      id: 'wxyzWing',
      group: 'wing',
      baseCost: 57,
      order: 155,
      i18nKey: 'technique.wxyzWing',
      variantScope: null,
      assumesUniqueness: false,
      find: findWxyzWing
    },
    {
      id: 'wWing',
      group: 'wing',
      baseCost: 60,
      order: 170,
      i18nKey: 'technique.wWing',
      variantScope: null,
      assumesUniqueness: false,
      find: findWWing
    },
    {
      id: 'uniqueRectangle',
      group: 'wing',
      baseCost: 66,
      order: 180,
      i18nKey: 'technique.uniqueRectangle',
      variantScope: null,
      assumesUniqueness: true,
      find: findUniqueRectangle
    }
  ];

  DEFINITIONS.forEach(function (def) {
    if (!SG.techniques.has(def.id)) SG.techniques.register(def);
  });

  // The parameterised searches behind remotePairs and wxyzWing, for tests (explicit work limit); not
  // registered techniques.
  function seamLimit(opts, fallback, name) {
    const given = opts === undefined || opts === null ? undefined : opts.workLimit;
    if (given === undefined) return fallback;
    if (typeof given !== 'number' || !Number.isFinite(given) || given < 0) {
      const err = new SG.errors.GenerationError('solver.invalidOption',
        { option: 'wingSearch.' + name + '.workLimit' });
      err.message = 'solver.invalidOption: wingSearch.' + name + ' workLimit must be a number of at least 0';
      throw err;
    }
    return Math.floor(given);
  }

  if (!SG.wingSearch) {
    SG.wingSearch = Object.freeze({
      REMOTE_PAIRS_WORK_LIMIT: REMOTE_PAIRS_WORK_LIMIT,
      WXYZ_WORK_LIMIT: WXYZ_WORK_LIMIT,
      remotePairs: function (model, state, ctx, opts) {
        let limit = REMOTE_PAIRS_WORK_LIMIT;
        const given = opts === undefined || opts === null ? undefined : opts.workLimit;
        if (given !== undefined) {
          if (typeof given !== 'number' || !Number.isFinite(given) || given < 0) {
            const err = new SG.errors.GenerationError('solver.invalidOption',
              { option: 'wingSearch.remotePairs.workLimit' });
            err.message = 'solver.invalidOption: wingSearch.remotePairs workLimit must be a number of ' +
              'at least 0';
            throw err;
          }
          limit = Math.floor(given);
        }
        return findRemotePairsBounded(model, state, ctx, limit);
      },
      wxyzWing: function (model, state, ctx, opts) {
        return findWxyzBounded(model, state, ctx, seamLimit(opts, WXYZ_WORK_LIMIT, 'wxyzWing'));
      }
    });
  }
})(typeof self !== 'undefined' ? self : globalThis);
