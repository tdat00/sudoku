/**
 * Wing techniques (group `wing`): XY-Wing, XYZ-Wing, W-Wing and Unique Rectangle (types 1 and 2).
 *
 *   id               baseCost  order  assumesUniqueness
 *   xyWing               48     140   false
 *   xyzWing              54     150   false
 *   wWing                60     170   false
 *   uniqueRectangle      66     180   true
 *
 * Everything here is generic: "sees" means "shares at least one unit" (`model.peers`), so any digit count and unit
 * shape works. Eliminations are only taken from unsolved cells. `state` is read, never written; one call returns at
 * most one deduction (the first in a fixed scan order: cells and peers ascending).
 *
 * Translation keys (i18nKey -> i18nArgs; values are numbers or strings, cells are 'R4C7' labels):
 *   technique.xyWing.step               { pivot, pincer1, pincer2, digitX, digitY, digit }
 *   technique.xyzWing.step              { pivot, pincer1, pincer2, digitX, digitY, digit }
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
 * Unique Rectangle (assumesUniqueness: true) is valid only because a puzzle has ONE solution, so the logical solver
 * skips it with `assumeUniqueness: false` (how uniqueness is verified without circular reasoning); find() also returns
 * null on its own then.
 *   The "deadly pattern": four cells that all hold only {X, Y}. If every unit touching the four cells holds exactly two
 *   of them, swapping X and Y in them turns one solution into another, which a unique puzzle cannot have. So detection
 *   needs, for a model without cages and inequalities (their sums and signs are not invariant under the swap, so UR is
 *   never used there):
 *     - exactly two row units, two column units and two box-like units (kind 'box' or 'region') touch the four cells,
 *       each holding exactly two of them, and every cell lies in some box-like unit;
 *     - every other unit touching them (diagonal, window, ...) holds exactly two of them as well.
 *   On a classic grid this is the textbook "2 rows, 2 columns, 2 boxes"; on a Jigsaw board the "boxes" are the irregular
 *   regions, so a rectangle over three or four regions, or with three corners in one region, never fires.
 *   Type 1: three cells hold exactly {X, Y}, the fourth holds more: X and Y leave the fourth cell.
 *   Type 2: two cells hold exactly {X, Y}, the other two (sharing a side) hold {X, Y, Z}: Z is in one of them, so Z
 *   leaves every cell that sees both.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  const popcount = SG.bits.popcount;

  const KIND_ROW = 1;
  const KIND_COL = 2;
  const KIND_BOX = 3;

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
        rects: null
      };
      infoCache.set(model, info);
    }
    return info;
  }

  function digitOf(bit) {
    return 32 - Math.clz32(bit);
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

  // Pivot {X, Y, Z} seeing pincers {X, Z} and {Y, Z}: Z leaves every cell that sees the pivot and both pincers.
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

  // The other X cell of a strong link (`unit` is complete and holds `bit` in exactly two unsolved cells, one of them
  // `cell`), or -1.
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

  // Looks for a strong link on `bit` whose cells P and Q are seen by wing cells `a` and `b`; writes P, Q and the unit
  // into `info.link`.
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

  // Two {X, Y} cells that do not see each other, joined by a strong link on X: Y leaves every cell that sees both.
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

  // All candidate rectangles as [a, b, c, d]: a, b share a row, c, d another row, a, c share a column, b, d another one.
  // Empty for a model with cages or inequalities. Computed once per model.
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

  const DEFINITIONS = [
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
})(typeof self !== 'undefined' ? self : globalThis);
