/**
 * Inequality rules of Greater-Than Sudoku: the propagation extension and the two human techniques of the
 * `ineq` group: `ineqChain` (baseCost 12, order 65: bounds travelling along a chain a < b < c < ...) and
 * `minMaxForcing` (22, 85: signs combined with all-different units; a cell above k cells of one unit is at
 * least k + 1, below k cells at most D - k).
 *
 * A model states its signs as `model.inequalities = [{ a, b }]` (value[a] < value[b]). Nothing here looks at
 * the variant id: any model with inequalities is propagated; the techniques are offered per their
 * `variantScope`.
 *
 * Extension: for `a < b` both bound rules are applied until nothing changes (cand[a] loses values >=
 * max(cand[b]), cand[b] loses values <= min(cand[a])). Along a chain the bounds are carried in one call (one
 * sweep in topological order for the minima, one backwards for the maxima). Registering is LAZY, by
 * `SG.ineq.ensureExtension()`, which the Greater-Than variant calls when it builds a model: a plain page load
 * must not touch the engine (its own tests assume an empty extension registry).
 *
 * The techniques are the attributable, "by hand" version of the same rule (the logical solver never runs the
 * extensions), so `ineqChain` finds exactly what the extension would remove, with the justifying chain.
 * `minMaxForcing` goes beyond bound propagation and is only asked once the chain bounds are exhausted.
 *
 * i18nArgs of the Findings (cells are `SG.model.cellLabel` texts):
 *   ineqChain       { cell, bound, chain, count, direction }   chain 'R1C1 < R1C2 < R1C3', smaller first;
 *                   direction 'min' (cell >= bound) or 'max' (cell <= bound); count = cells in the chain
 *   minMaxForcing   { cell, bound, count, unit, others, direction }
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.ineq && SG.techniques.has('ineqChain')) return;

  const EXTENSION_ID = 'ineq';

  const analyses = new WeakMap();

  /**
   * @typedef {Object} SignGraph
   * `order`: cells touching a sign, smaller first (topological); `asc`: the same by index; `cyclic`: the
   * signs cannot all hold. predStart/predList and succStart/succList are CSR lists of the smaller / greater
   * neighbours. need/from/eff (min sweep) and lim/fromHi/effHi (max sweep) are scratch; `rank` is built
   * lazily by `minMaxForcing`.
   */

  function graphOf(model) {
    let g = analyses.get(model);
    if (g !== undefined) return g;
    const list = model.inequalities;
    if (!list || list.length === 0) {
      analyses.set(model, null);
      return null;
    }
    const n = model.cellCount;
    let cyclic = false;
    const edgeA = [];
    const edgeB = [];
    for (let k = 0; k < list.length; k++) {
      const a = list[k].a;
      const b = list[k].b;
      if (!(Number.isInteger(a) && a >= 0 && a < n && Number.isInteger(b) && b >= 0 && b < n) || a === b) {
        cyclic = true;
        continue;
      }
      edgeA.push(a);
      edgeB.push(b);
    }
    const m = edgeA.length;
    const predStart = new Int32Array(n + 1);
    const succStart = new Int32Array(n + 1);
    let i;
    for (i = 0; i < m; i++) {
      predStart[edgeB[i] + 1]++;
      succStart[edgeA[i] + 1]++;
    }
    for (i = 0; i < n; i++) {
      predStart[i + 1] += predStart[i];
      succStart[i + 1] += succStart[i];
    }
    const predList = new Int32Array(m);
    const succList = new Int32Array(m);
    const predFill = predStart.slice(0, n);
    const succFill = succStart.slice(0, n);
    for (i = 0; i < m; i++) {
      predList[predFill[edgeB[i]]++] = edgeA[i];
      succList[succFill[edgeA[i]]++] = edgeB[i];
    }

    const indegree = new Int32Array(n);
    const involved = [];
    for (let c = 0; c < n; c++) {
      indegree[c] = predStart[c + 1] - predStart[c];
      if (indegree[c] > 0 || succStart[c + 1] > succStart[c]) involved.push(c);
    }
    const queue = [];
    for (i = 0; i < involved.length; i++) if (indegree[involved[i]] === 0) queue.push(involved[i]);
    for (let head = 0; head < queue.length; head++) {
      const c = queue[head];
      for (let e = succStart[c]; e < succStart[c + 1]; e++) {
        if (--indegree[succList[e]] === 0) queue.push(succList[e]);
      }
    }
    if (queue.length < involved.length) cyclic = true;

    g = {
      n: n,
      digits: model.digits,
      cyclic: cyclic,
      order: Int32Array.from(cyclic ? involved : queue),
      asc: Int32Array.from(involved),
      predStart: predStart,
      predList: predList,
      succStart: succStart,
      succList: succList,
      need: new Int32Array(n),
      from: new Int32Array(n),
      eff: new Int32Array(n),
      lim: new Int32Array(n),
      fromHi: new Int32Array(n),
      effHi: new Int32Array(n),
      rank: null
    };
    analyses.set(model, g);
    return g;
  }

  function lowestValue(mask) {
    return 32 - Math.clz32(mask & -mask);
  }

  function highestValue(mask) {
    return 32 - Math.clz32(mask);
  }

  function upTo(v) {
    return (1 << v) - 1;
  }

  /**
   * Minimum sweep. For every sign cell, in topological order, `need[c]` is the lowest value it can take
   * because of the cells below it and `from[c]` the cell that sets it; `eff[c]` is its lowest candidate at or
   * above `need[c]`. The state is only read. Returns false on a contradiction (no candidate left at or above
   * the bound).
   */
  function sweepMin(g, cand) {
    const order = g.order;
    const need = g.need;
    const from = g.from;
    const eff = g.eff;
    for (let k = 0; k < order.length; k++) {
      const c = order[k];
      let nd = 1;
      let fr = -1;
      for (let e = g.predStart[c]; e < g.predStart[c + 1]; e++) {
        const a = g.predList[e];
        if (eff[a] + 1 > nd) {
          nd = eff[a] + 1;
          fr = a;
        }
      }
      need[c] = nd;
      from[c] = fr;
      const rest = cand[c] & ~upTo(nd - 1);
      if (rest === 0) return false;
      eff[c] = lowestValue(rest);
    }
    return true;
  }

  /** Maximum sweep, the mirror image of `sweepMin` (greater cells first). */
  function sweepMax(g, cand) {
    const order = g.order;
    const lim = g.lim;
    const fromHi = g.fromHi;
    const effHi = g.effHi;
    for (let k = order.length - 1; k >= 0; k--) {
      const c = order[k];
      let top = g.digits;
      let fr = -1;
      for (let e = g.succStart[c]; e < g.succStart[c + 1]; e++) {
        const s = g.succList[e];
        if (effHi[s] - 1 < top) {
          top = effHi[s] - 1;
          fr = s;
        }
      }
      lim[c] = top;
      fromHi[c] = fr;
      const rest = cand[c] & upTo(top);
      if (rest === 0) return false;
      effHi[c] = highestValue(rest);
    }
    return true;
  }

  const extension = {
    id: EXTENSION_ID,
    prepare: function prepare(model) {
      return graphOf(model);
    },
    propagate: function propagate(model, state, g, ctx) {
      if (g.cyclic) return false;
      const cand = state.candidates;
      const order = g.order;
      let k;
      if (!sweepMin(g, cand)) return false;
      for (k = 0; k < order.length; k++) {
        const c = order[k];
        if (g.need[c] > 1 && (cand[c] & upTo(g.need[c] - 1)) !== 0) {
          if (!ctx.restrict(c, ~upTo(g.need[c] - 1))) return false;
        }
      }
      // Restricting from below never touches the highest candidate, so the maximum sweep can use the
      // candidates as they were.
      if (!sweepMax(g, cand)) return false;
      for (k = 0; k < order.length; k++) {
        const c = order[k];
        if (g.lim[c] < g.digits && (cand[c] & ~upTo(g.lim[c])) !== 0) {
          if (!ctx.restrict(c, upTo(g.lim[c]))) return false;
        }
      }
      return true;
    }
  };

  /**
   * Registers the inequality propagation with `SG.constraints` unless it already is (idempotent); true when
   * this call registered it.
   */
  function ensureExtension() {
    if (SG.constraints.listExtensions().indexOf(EXTENSION_ID) !== -1) return false;
    SG.constraints.registerExtension(extension);
    return true;
  }

  function labelsOf(model, cells) {
    return cells.map(function (c) { return SG.model.cellLabel(model, c); });
  }

  function pairsOf(cell, mask, out) {
    for (let m = mask; m !== 0; m &= m - 1) out.push([cell, lowestValue(m)]);
  }

  /**
   * I1: a bound travels along a chain of signs (a cell above a chain of k cells is at least k + 1, more when
   * a chain cell is known larger; likewise from above). One Finding is one chain: the first cell (lowest
   * index) whose candidates break a bound, the cells of the chain that gives it, and every candidate it rules
   * out.
   */
  function findChain(model, state, ctx) {
    const g = graphOf(model);
    if (g === null || g.cyclic) return null;
    ctx.check();
    const cand = state.candidates;
    if (!sweepMin(g, cand) || !sweepMax(g, cand)) return null;

    const asc = g.asc;
    for (let k = 0; k < asc.length; k++) {
      const c = asc[k];
      if (state.value[c] !== 0) continue;
      if (g.need[c] > 1 && (cand[c] & upTo(g.need[c] - 1)) !== 0) return lowerChain(model, state, g, c);
      if (g.lim[c] < g.digits && (cand[c] & ~upTo(g.lim[c])) !== 0) return upperChain(model, state, g, c);
    }
    return null;
  }

  function lowerChain(model, state, g, target) {
    const cand = state.candidates;
    // Walk down the chain while the cell is pushed up by the cell below it.
    const path = [target];
    let x = target;
    while (g.from[x] !== -1 && lowestValue(cand[x]) < g.need[x]) {
      x = g.from[x];
      path.push(x);
    }
    path.reverse();
    const eliminations = [];
    path.forEach(function (c) {
      if (g.need[c] > 1) pairsOf(c, cand[c] & upTo(g.need[c] - 1), eliminations);
    });
    return {
      technique: 'ineqChain',
      cells: path,
      placements: [],
      eliminations: eliminations,
      i18nKey: 'technique.ineqChain.step.min',
      i18nArgs: {
        cell: SG.model.cellLabel(model, target),
        bound: g.need[target],
        chain: labelsOf(model, path).join(' < '),
        count: path.length,
        direction: 'min'
      }
    };
  }

  function upperChain(model, state, g, target) {
    const cand = state.candidates;
    const path = [target];
    let x = target;
    while (g.fromHi[x] !== -1 && highestValue(cand[x]) > g.lim[x]) {
      x = g.fromHi[x];
      path.push(x);
    }
    const eliminations = [];
    path.forEach(function (c) {
      if (g.lim[c] < g.digits) pairsOf(c, cand[c] & ~upTo(g.lim[c]), eliminations);
    });
    return {
      technique: 'ineqChain',
      cells: path,
      placements: [],
      eliminations: eliminations,
      i18nKey: 'technique.ineqChain.step.max',
      i18nArgs: {
        cell: SG.model.cellLabel(model, target),
        bound: g.lim[target],
        chain: labelsOf(model, path).join(' < '),
        count: path.length,
        direction: 'max'
      }
    };
  }

  /**
   * Static data of `minMaxForcing`: for every cell x and unit U, the cells of U (through a chain of signs)
   * below x, when at least two, and likewise above x. Cells of one unit are pairwise different, so k of them
   * below x push x past the k-th smallest digit they can still take together.
   */
  function rankOf(model, g) {
    if (g.rank !== null) return g.rank;
    const n = g.n;
    const W = (n + 31) >>> 5;
    const anc = new Int32Array(n * W);
    const desc = new Int32Array(n * W);
    let k;
    let e;
    let w;
    for (k = 0; k < g.order.length; k++) {
      const x = g.order[k];
      for (e = g.predStart[x]; e < g.predStart[x + 1]; e++) {
        const a = g.predList[e];
        anc[x * W + (a >>> 5)] |= 1 << (a & 31);
        for (w = 0; w < W; w++) anc[x * W + w] |= anc[a * W + w];
      }
    }
    for (k = g.order.length - 1; k >= 0; k--) {
      const x = g.order[k];
      for (e = g.succStart[x]; e < g.succStart[x + 1]; e++) {
        const b = g.succList[e];
        desc[x * W + (b >>> 5)] |= 1 << (b & 31);
        for (w = 0; w < W; w++) desc[x * W + w] |= desc[b * W + w];
      }
    }

    function cases(sets) {
      const target = [];
      const unit = [];
      const start = [0];
      const members = [];
      for (let i = 0; i < g.asc.length; i++) {
        const x = g.asc[i];
        for (let u = 0; u < model.units.length; u++) {
          const cells = model.units[u];
          const found = [];
          for (let j = 0; j < cells.length; j++) {
            const y = cells[j];
            if ((sets[x * W + (y >>> 5)] & (1 << (y & 31))) !== 0) found.push(y);
          }
          if (found.length >= 2) {
            target.push(x);
            unit.push(u);
            for (let j = 0; j < found.length; j++) members.push(found[j]);
            start.push(members.length);
          }
        }
      }
      return {
        count: target.length,
        target: Int32Array.from(target),
        unit: Int32Array.from(unit),
        start: Int32Array.from(start),
        members: Int32Array.from(members)
      };
    }

    g.rank = { below: cases(anc), above: cases(desc) };
    return g.rank;
  }

  function kthSmallest(mask, k) {
    let t = mask;
    for (let i = 1; i < k && t !== 0; i++) t &= t - 1;
    return t === 0 ? 0 : lowestValue(t);
  }

  function kthLargest(mask, k) {
    let t = mask;
    for (let i = 1; i < k && t !== 0; i++) t &= ~(1 << (highestValue(t) - 1));
    return t === 0 ? 0 : highestValue(t);
  }

  function rankFinding(model, cases, index, cell, bound, eliminations, direction) {
    const members = [];
    for (let j = cases.start[index]; j < cases.start[index + 1]; j++) members.push(cases.members[j]);
    return {
      technique: 'minMaxForcing',
      cells: [cell].concat(members),
      placements: [],
      eliminations: eliminations,
      i18nKey: 'technique.minMaxForcing.step.' + direction,
      i18nArgs: {
        cell: SG.model.cellLabel(model, cell),
        bound: bound,
        count: members.length,
        unit: model.unitMeta[cases.unit[index]].label,
        others: labelsOf(model, members).join(', '),
        direction: direction
      }
    };
  }

  /**
   * I2: if k cells of one unit are below x, x is larger than the k-th smallest digit they can take between
   * them; if k are above x it is smaller than their k-th largest. The first pruned cell gives the Finding.
   * Plain chains are `ineqChain`'s job, which the ladder asks first.
   */
  function findMinMax(model, state, ctx) {
    const g = graphOf(model);
    if (g === null || g.cyclic) return null;
    const cand = state.candidates;
    const rank = rankOf(model, g);
    const below = rank.below;
    const above = rank.above;
    let i = 0;
    let j = 0;
    while (i < below.count || j < above.count) {
      ctx.check();
      const lowFirst = j >= above.count || (i < below.count && below.target[i] <= above.target[j]);
      if (lowFirst) {
        const x = below.target[i];
        if (state.value[x] === 0) {
          let union = 0;
          const k = below.start[i + 1] - below.start[i];
          for (let s = below.start[i]; s < below.start[i + 1]; s++) union |= cand[below.members[s]];
          const v = kthSmallest(union, k);
          if (v !== 0 && (cand[x] & upTo(v)) !== 0) {
            const out = [];
            pairsOf(x, cand[x] & upTo(v), out);
            return rankFinding(model, below, i, x, v + 1, out, 'min');
          }
        }
        i++;
      } else {
        const x = above.target[j];
        if (state.value[x] === 0) {
          let union = 0;
          const k = above.start[j + 1] - above.start[j];
          for (let s = above.start[j]; s < above.start[j + 1]; s++) union |= cand[above.members[s]];
          const v = kthLargest(union, k);
          if (v !== 0 && (cand[x] & ~upTo(v - 1)) !== 0) {
            const out = [];
            pairsOf(x, cand[x] & ~upTo(v - 1), out);
            return rankFinding(model, above, j, x, v - 1, out, 'max');
          }
        }
        j++;
      }
    }
    return null;
  }

  SG.techniques.register({
    id: 'ineqChain',
    group: 'ineq',
    baseCost: 12,
    order: 65,
    i18nKey: 'technique.ineqChain',
    variantScope: ['greaterThan'],
    find: findChain
  });

  SG.techniques.register({
    id: 'minMaxForcing',
    group: 'ineq',
    baseCost: 22,
    order: 85,
    i18nKey: 'technique.minMaxForcing',
    variantScope: ['greaterThan'],
    find: findMinMax
  });

  /** Inequality tools, exposed for the Greater-Than variant, tests and tooling. */
  SG.ineq = {
    EXTENSION_ID: EXTENSION_ID,
    ensureExtension: ensureExtension
  };

  // Locale strings, merged into the language packs by the UI layer.
  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'technique.ineqChain': 'Inequality Chain',
      'technique.ineqChain.desc': 'Signs link cells into a chain a < b < c. Each step up the chain costs ' +
        'at least one digit, so the bottom of the chain cannot be too high and the top cannot be too low.',
      'technique.ineqChain.step.min': 'Along the chain {chain} every cell is larger than the one before ' +
        'it, so {cell} cannot be less than {bound}.',
      'technique.ineqChain.step.max': 'Along the chain {chain} every cell is smaller than the one after ' +
        'it, so {cell} cannot be more than {bound}.',
      'technique.minMaxForcing': 'Min/Max Forcing',
      'technique.minMaxForcing.desc': 'The cells of one unit all hold different digits. A cell that is ' +
        'larger (or smaller) than k of them is pushed past the k-th smallest (or largest) digit that ' +
        'they can take together.',
      'technique.minMaxForcing.step.min': '{cell} is larger than {count} cells of {unit} ({others}). ' +
        'They hold different digits, so {cell} cannot be less than {bound}.',
      'technique.minMaxForcing.step.max': '{cell} is smaller than {count} cells of {unit} ({others}). ' +
        'They hold different digits, so {cell} cannot be more than {bound}.'
    },
    vi: {
      'technique.ineqChain': 'Chuỗi bất đẳng thức',
      'technique.ineqChain.desc': 'Các dấu so sánh nối các ô thành một chuỗi a < b < c. Mỗi bước đi lên ' +
        'trong chuỗi cần thêm ít nhất một chữ số, nên ô thấp nhất của chuỗi không thể quá lớn và ô cao ' +
        'nhất không thể quá nhỏ.',
      'technique.ineqChain.step.min': 'Dọc theo chuỗi {chain}, mỗi ô đều lớn hơn ô đứng trước nó, nên ' +
        '{cell} không thể nhỏ hơn {bound}.',
      'technique.ineqChain.step.max': 'Dọc theo chuỗi {chain}, mỗi ô đều nhỏ hơn ô đứng sau nó, nên ' +
        '{cell} không thể lớn hơn {bound}.',
      'technique.minMaxForcing': 'Ép biên min/max',
      'technique.minMaxForcing.desc': 'Các ô trong cùng một vùng đều chứa chữ số khác nhau. Một ô lớn ' +
        'hơn k ô của vùng đó thì phải lớn hơn chữ số nhỏ nhất thứ k mà các ô ấy có thể nhận (tương tự ' +
        'với nhỏ hơn và chữ số lớn nhất thứ k).',
      'technique.minMaxForcing.step.min': '{cell} lớn hơn {count} ô của {unit} ({others}). Các ô này ' +
        'chứa chữ số khác nhau, nên {cell} không thể nhỏ hơn {bound}.',
      'technique.minMaxForcing.step.max': '{cell} nhỏ hơn {count} ô của {unit} ({others}). Các ô này ' +
        'chứa chữ số khác nhau, nên {cell} không thể lớn hơn {bound}.'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
