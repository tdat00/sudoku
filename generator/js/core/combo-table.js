/**
 * Cage sum combinations and the cage propagation extension (rule P4).
 *
 * 1. Combination table: `SG.comboTable.table[size][sum]` lists, as bit masks, every set of `size` pairwise
 *   distinct
 *    digits from 1..9 with that sum. Built once on load (512 masks, a few KB); this is what makes Killer
 *    affordable: a
 *    cage is reduced to a handful of digit sets, and a cage cell can only hold a digit occurring in one of
 *    them.
 * 2. Extension: `SG.comboTable.enablePropagation(variantId)` registers it with
 *   `SG.constraints.registerExtension`, so
 *    cage sums work in the DFS solver and the digger without constraints.js knowing about Killer. Per cage,
 *    until
 *    nothing changes:
 *      - bounds:        sum - (largest the others can be) <= cell <= sum - (smallest the others can be);
 *      - combinations:  only table sets that fit the cells' candidates survive; the cells keep the union of
 *        those sets
 *                       (digits already fixed in the cage leave the other cells);
 *      - forced digits: a digit in every surviving set that fits one cell only is placed there.
 *    Registered on demand (first Killer model with cages) and acting only on models of variants that asked
 *    for it:
 *    other models (even a plain board that carries a `cages` list) pay nothing and are unaffected.
 *
 * Soundness: every rule only removes digits that no assignment satisfying the cage can use, and a complete
 * assignment
 * passes only when each cage sum is exact and (distinct cage) no digit repeats, so the DFS counts solutions
 * correctly
 * even when the cage cells are not peers of each other.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first instance on repeated loads so that the extension is registered only once.
  if (SG.comboTable && typeof SG.comboTable.masks === 'function') return;

  const popcount = SG.bits.popcount;

  // Digits the table covers; a cage of a bigger board falls back to bounds only.
  const TABLE_DIGITS = 9;
  const MAX_SUM = 45;

  const EMPTY = Object.freeze([]);

  // comboTable[size][sum] = frozen ascending masks; sizes 0..9, sums 0..45; an impossible pair holds an empty
  // array.
  const comboTable = (function build() {
    const lists = [];
    for (let size = 0; size <= TABLE_DIGITS; size++) {
      const row = [];
      for (let sum = 0; sum <= MAX_SUM; sum++) row.push([]);
      lists.push(row);
    }
    for (let mask = 0; mask < (1 << TABLE_DIGITS); mask++) {
      let sum = 0;
      for (let d = 1; d <= TABLE_DIGITS; d++) if ((mask & (1 << (d - 1))) !== 0) sum += d;
      lists[popcount(mask)][sum].push(mask);
    }
    return Object.freeze(lists.map(function (row) {
      return Object.freeze(row.map(function (list) { return Object.freeze(list); }));
    }));
  })();

  /** Tables restricted to the digits 1..D, built on demand for a board with D < 9. */
  const restricted = new Map();

  function tableFor(digits) {
    if (digits >= TABLE_DIGITS) return comboTable;
    let t = restricted.get(digits);
    if (t === undefined) {
      const limit = 1 << digits;
      t = comboTable.map(function (row) {
        return row.map(function (list) {
          return Object.freeze(list.filter(function (mask) { return mask < limit; }));
        });
      });
      restricted.set(digits, t);
    }
    return t;
  }

  // Masks (bit v - 1 = digit v, ascending) of the digit sets making `sum` out of `size` distinct digits from
  // 1..digits
  // (default 9); empty when impossible.
  function masks(size, sum, digits) {
    if (!(size >= 0 && size <= TABLE_DIGITS && sum >= 0 && sum <= MAX_SUM)) return EMPTY;
    return tableFor(digits === undefined ? TABLE_DIGITS : digits)[size][sum];
  }

  // Mask of every digit that occurs in at least one combination (0 when there is none).
  function union(size, sum, digits) {
    const list = masks(size, sum, digits);
    let u = 0;
    for (let i = 0; i < list.length; i++) u |= list[i];
    return u;
  }

  // Mask of the digits that occur in every combination (0 when there is none).
  function common(size, sum, digits) {
    const list = masks(size, sum, digits);
    if (list.length === 0) return 0;
    let c = list[0];
    for (let i = 1; i < list.length; i++) c &= list[i];
    return c;
  }

  function minSum(size) {
    return size * (size + 1) / 2;
  }

  function maxSum(size, digits) {
    const d = digits === undefined ? TABLE_DIGITS : digits;
    return size * d - size * (size - 1) / 2;
  }

  // CageIndex: flat typed-array view of `model.cages`: count, cageOf (per cell; -1 outside every cage), start
  // (count + 1
  // offsets into `cells`), cells (all cages back to back), size, sum, distinct (1 when the digits must all
  // differ).

  const indexes = new WeakMap();

  // Cached per model (models are immutable); do not modify the arrays.
  function cageIndex(model) {
    let index = indexes.get(model);
    if (index !== undefined) return index;
    const cages = model.cages || [];
    const count = cages.length;
    const start = new Int32Array(count + 1);
    let total = 0;
    let k;
    for (k = 0; k < count; k++) {
      start[k] = total;
      total += cages[k].cells.length;
    }
    start[count] = total;
    const cells = new Int32Array(total);
    const cageOf = new Int32Array(model.cellCount).fill(-1);
    const size = new Int32Array(count);
    const sum = new Int32Array(count);
    const distinct = new Uint8Array(count);
    for (k = 0; k < count; k++) {
      const list = cages[k].cells;
      size[k] = list.length;
      sum[k] = cages[k].sum;
      distinct[k] = cages[k].distinct ? 1 : 0;
      for (let i = 0; i < list.length; i++) {
        cells[start[k] + i] = list[i];
        if (cageOf[list[i]] === -1) cageOf[list[i]] = k;
      }
    }
    index = {
      count: count, cageOf: cageOf, start: start, cells: cells, size: size, sum: sum, distinct: distinct
    };
    indexes.set(model, index);
    return index;
  }

  function lowDigit(m) {
    return 32 - Math.clz32(m & -m);
  }

  function highDigit(m) {
    return 32 - Math.clz32(m);
  }

  function propagateCage(data, cand, k, ctx) {
    const index = data.index;
    const cells = index.cells;
    const s = index.start[k];
    const e = index.start[k + 1];
    const target = index.sum[k];
    const distinct = index.distinct[k] === 1;
    let lo = 0;
    let hi = 0;
    let i;
    let m;
    for (i = s; i < e; i++) {
      m = cand[cells[i]];
      lo += lowDigit(m);
      hi += highDigit(m);
    }
    if (target < lo || target > hi) return false;

    // Bounds: a cell cannot exceed what is left when the others are as small as possible, and the other way.
    const n = e - s;
    if (n === 1) return ctx.restrict(cells[s], 1 << (target - 1));
    for (i = s; i < e; i++) {
      const c = cells[i];
      m = cand[c];
      let minV = target - (hi - highDigit(m));
      let maxV = target - (lo - lowDigit(m));
      if (minV < 1) minV = 1;
      if (maxV > data.digits) maxV = data.digits;
      if (minV > maxV) return false;
      if (minV > 1 || maxV < data.digits) {
        if (!ctx.restrict(c, ((1 << maxV) - 1) & ~((1 << (minV - 1)) - 1))) return false;
      }
    }

    const list = data.masks[k];
    if (list === null) return true;

    // Combinations that still fit the candidates; `fixed` holds the digits of cells that are already decided.
    let unionMask = 0;
    let fixed = 0;
    for (i = s; i < e; i++) {
      m = cand[cells[i]];
      unionMask |= m;
      if ((m & (m - 1)) === 0) {
        if ((fixed & m) !== 0) return false;
        fixed |= m;
      }
    }
    let valid = 0;
    let always = -1;
    for (let j = 0; j < list.length; j++) {
      const cm = list[j];
      if ((cm & ~unionMask) !== 0 || (cm & fixed) !== fixed) continue;
      let fits = true;
      for (i = s; i < e; i++) {
        if ((cand[cells[i]] & cm) === 0) {
          fits = false;
          break;
        }
      }
      if (fits) {
        valid |= cm;
        always &= cm;
      }
    }
    if (valid === 0) return false;
    for (i = s; i < e; i++) {
      const c = cells[i];
      m = cand[c];
      if (!ctx.restrict(c, (m & (m - 1)) === 0 ? valid : valid & ~fixed)) return false;
    }

    // A digit that every combination needs, and that only one cell can still take, goes into that cell.
    let needed = always & ~fixed;
    while (needed !== 0) {
      const bit = needed & -needed;
      needed ^= bit;
      let at = -1;
      let places = 0;
      for (i = s; i < e; i++) {
        if ((cand[cells[i]] & bit) !== 0) {
          at = cells[i];
          places++;
        }
      }
      if (places === 0) return false;
      if (places === 1 && !ctx.restrict(at, bit)) return false;
    }
    return true;
  }

  const cageExtension = {
    id: 'cage',

    prepare: function prepare(model) {
      if (!model.cages || model.cages.length === 0 || !variantUsesCages(model)) return null;
      const index = cageIndex(model);
      const digits = model.digits;
      const tables = new Array(index.count);
      for (let k = 0; k < index.count; k++) {
        tables[k] = index.distinct[k] === 1 && digits <= TABLE_DIGITS
          ? masks(index.size[k], index.sum[k], digits) : null;
      }
      return {
        index: index,
        digits: digits,
        masks: tables,
        // Scratch of one propagate call; always left clean, so a state still carries all there is to know.
        dirty: new Uint8Array(index.count),
        queue: new Int32Array(index.count)
      };
    },

    propagate: function propagate(model, state, data, ctx) {
      const cageOf = data.index.cageOf;
      const dirty = data.dirty;
      const queue = data.queue;
      const cand = state.candidates;
      let count = 0;
      let i;
      for (i = 0; i < ctx.changedCount; i++) {
        const k = cageOf[ctx.changed[i]];
        if (k >= 0 && dirty[k] === 0) {
          dirty[k] = 1;
          queue[count++] = k;
        }
      }
      for (i = 0; i < count; i++) {
        dirty[queue[i]] = 0;
        if (!propagateCage(data, cand, queue[i], ctx)) {
          for (let j = i + 1; j < count; j++) dirty[queue[j]] = 0;
          return false;
        }
      }
      return true;
    }
  };

  function variantUsesCages(model) {
    return enabledVariants.has(model.variantId);
  }

  const enabledVariants = new Set();

  // Registers the cage propagation with `SG.constraints` and switches it on for the models of one variant.
  // Nothing is
  // registered until a variant asks (Killer does when it builds a model with cages); models of other variants
  // (e.g. a
  // test board that merely carries `cages`) are left alone. Idempotent per variant. Code that builds a Killer
  // model by
  // other means must call it before solving with `SG.dfs` (`SG.killer.modelFromCages` does). True when it
  // changed anything.
  function enablePropagation(variantId) {
    if (enabledVariants.has(variantId)) return false;
    enabledVariants.add(variantId);
    // Models prepared before may have been skipped; registering again makes the engine prepare them anew.
    SG.constraints.unregisterExtension(cageExtension.id);
    SG.constraints.registerExtension(cageExtension);
    return true;
  }

  // Removes the cage propagation and forgets every variant (for tests).
  function disablePropagation() {
    enabledVariants.clear();
    return SG.constraints.unregisterExtension(cageExtension.id);
  }

  SG.comboTable = {
    DIGITS: TABLE_DIGITS,
    table: comboTable,
    masks: masks,
    union: union,
    common: common,
    minSum: minSum,
    maxSum: maxSum,
    cageIndex: cageIndex,
    enablePropagation: enablePropagation,
    disablePropagation: disablePropagation,
    extension: cageExtension
  };
})(typeof self !== 'undefined' ? self : globalThis);
