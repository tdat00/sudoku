/**
 * Chain techniques (group `chain`, design.md section 6.6): Forcing Chain / X-Cycle and Nishio. They are the
 * most expensive techniques of the ladder, so both honour `ctx.check()` and turn a `budget.exceeded` into
 * "nothing found" (any other error, such as `budget.cancelled`, still propagates).
 *
 *   id            baseCost  order
 *   forcingChain      90     190
 *   nishio           140     200
 *
 * ===========================================================================================
 * forcingChain: alternating inference chains over a strong / weak link graph
 * ===========================================================================================
 * A node is a candidate (cell, digit) of an open cell. Two kinds of links, defined on the current state:
 *
 *   weak link   "at most one of the two is true":  same cell and different digits, or the same digit in two
 *               cells that share a unit (`model.peers`). Valid for every unit shape, partial units included.
 *   strong link "at least one of the two is true": the only two candidates of a cell, or the only two cells
 *               of a COMPLETE unit (`ctx.completeUnits`) that still allow a digit. A partial unit never
 *               yields a strong link: a digit may be absent from it.
 *
 * Every link is an implication between literals ("node is true" / "node is false"):
 *
 *   weak(a, b):    a is true  =>  b is false
 *   strong(a, b):  a is false =>  b is true
 *
 * so the graph over LITERALS has exactly two kinds of edges: true -> false through a weak link and
 * false -> true through a strong link. That is how alternation is guaranteed: the polarity of a literal
 * decides which kind of link may leave it, there is no way to follow two strong or two weak links in a row,
 * and a chain is just a path in this graph. Each edge is a valid implication, and implications compose, so
 * a path "A => B" is a proof whatever nodes it revisits (soundness never depends on the chain being simple).
 *
 * Search: a breadth first search from every literal, at most `maxChainLength` links deep (default 12,
 * `ctx.options.maxChainLength`; the length of a chain is its number of links). Every literal is visited
 * once per search, which is what makes it terminate on a graph full of cycles. It stops as soon as the
 * search from one start literal proves something, and the whole scan keeps the SHORTEST proof found
 * (ties: first in scan order), so a deduction never needs a longer chain than necessary.
 *
 *   endpoints      Start "s is false" and reach "t is true": at least one of s, t is true, so every
 *                  candidate that is weakly linked to both is eliminated. Covers X-chains, alternating
 *                  inference chains, W-wing like patterns and every elimination of a continuous nice loop.
 *   contradiction  Start "s is true" and reach both "m is true" and "m is false" for some node m: s is
 *                  eliminated. A loop back to s itself is the case m = s.
 *   forced         Start "s is false" and reach both polarities of some node: s is placed.
 *
 * A search only ever PROVES things; nothing is concluded from the absence of a chain, so cutting the search
 * short (length limit, budget) can only lose deductions, never produce a wrong one.
 *
 * Finding.i18nArgs: { kind, length, chains } where `chains` lists the paths as arrays of
 * [cell, digit, truth] (truth 1 = the candidate is true, 0 = false), start literal first. `endpoints` has one
 * chain; `contradiction` and `forced` have two, ending in the two polarities of the same node.
 * Finding.i18nKey: 'technique.forcingChain.step.endpoints' | '.contradiction' | '.forced'.
 *
 * ===========================================================================================
 * nishio: controlled trial and error
 * ===========================================================================================
 * For every open cell (fewest candidates first) and every candidate of it, assume the candidate is true on a
 * COPY of the state and run the incremental propagation engine (`SG.constraints.place`: peer elimination,
 * naked and hidden singles and the registered constraint extensions). A contradiction eliminates the
 * candidate. The first one found is returned. The state passed to find() is never written to.
 *
 * The guess is bounded, which is what keeps it a technique and not a search: `ctx.options.maxNishioDepth`
 * (default 2, at most 3) is the deepest nesting of guesses. Depth 1 is the plain trial above. Depth 2 also
 * lets the trial refute candidates of its cells with at most 3 candidates by a depth 1 trial of their own,
 * remove them from the COPY, propagate, and repeat until nothing more falls out; a contradiction anywhere
 * in the trial refutes the assumption. (Limiting the nested guesses to such cells keeps a position where
 * nothing can be refuted cheap: 12x12 and 16x16 boards stay below a second.)
 * The scan runs level by level (all depth 1 trials, then all depth 2 trials), so a deduction never needs a
 * deeper guess than necessary. Everything derived inside a trial holds under that trial's assumption only,
 * and only the final contradiction leaves the trial, so nesting cannot make it unsound.
 * `maxChainLength` does not apply to it.
 *
 * Finding.i18nKey 'technique.nishio.step', i18nArgs { cell, label, digit, depth } (depth = the nesting of
 * the guess that was needed, 1 or more).
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first registration on repeated loads.
  if (SG.techniques.has('forcingChain') || SG.techniques.has('nishio')) return;

  /** Default of `ctx.options.maxChainLength`. */
  const DEFAULT_MAX_CHAIN_LENGTH = 12;

  /** Default and ceiling of `ctx.options.maxNishioDepth`; every level multiplies the work. */
  const DEFAULT_MAX_NISHIO_DEPTH = 2;
  const NISHIO_DEPTH_CEILING = 3;

  /** A nested guess is only tried in cells that have at most this many candidates left. */
  const NESTED_MAX_CANDIDATES = 3;

  const KIND_ENDPOINTS = 'endpoints';
  const KIND_CONTRADICTION = 'contradiction';
  const KIND_FORCED = 'forced';

  /** Per model scratch buffers (rule R2). The models are immutable, so they never go stale. */
  const scratches = new WeakMap();

  /**
   * Buffers of the link graph search. Literal ids: node * 2 + truth, where node = cell * digits + (digit - 1)
   * and truth is 1 for "the candidate is true" and 0 for "false"; `lit ^ 1` is the opposite literal.
   */
  function scratchFor(model) {
    let s = scratches.get(model);
    if (s !== undefined) return s;
    const n = model.cellCount;
    const digits = model.digits;
    const nodes = n * digits;
    const maxPairs = n + model.units.length * digits;
    const peerMatrix = new Uint8Array(n * n);
    let maxWeak = digits;
    for (let c = 0; c < n; c++) {
      const ps = model.peers[c];
      for (let i = 0; i < ps.length; i++) peerMatrix[c * n + ps[i]] = 1;
      if (ps.length + digits > maxWeak) maxWeak = ps.length + digits;
    }
    s = {
      nodes: nodes,
      peerMatrix: peerMatrix,
      pairA: new Int32Array(maxPairs),
      pairB: new Int32Array(maxPairs),
      sStart: new Int32Array(nodes + 1),
      sCursor: new Int32Array(nodes),
      sTo: new Int32Array(maxPairs * 2),
      stamp: new Int32Array(nodes * 2),
      parent: new Int32Array(nodes * 2),
      dist: new Int32Array(nodes * 2),
      queue: new Int32Array(nodes * 2),
      weakOfStart: new Int32Array(maxWeak),
      weakOfExpanded: new Int32Array(maxWeak),
      stampId: 0
    };
    scratches.set(model, s);
    return s;
  }

  /**
   * @param {Object} ctx
   * @returns {number} The chain length limit: ctx.options.maxChainLength when it is a number (Infinity and
   *          values below 1 included), else the default.
   */
  function chainLimit(ctx) {
    const raw = ctx.options ? ctx.options.maxChainLength : undefined;
    if (typeof raw !== 'number' || Number.isNaN(raw)) return DEFAULT_MAX_CHAIN_LENGTH;
    return raw === Infinity ? Infinity : Math.floor(raw);
  }

  /**
   * @param {Object} ctx
   * @returns {number} The Nishio depth: ctx.options.maxNishioDepth as a whole number in 0..3 (0 or less
   *          turns the technique off), else the default.
   */
  function nishioDepth(ctx) {
    const raw = ctx.options ? ctx.options.maxNishioDepth : undefined;
    if (typeof raw !== 'number' || Number.isNaN(raw)) return DEFAULT_MAX_NISHIO_DEPTH;
    return Math.min(Math.floor(raw), NISHIO_DEPTH_CEILING);
  }

  /**
   * Runs a search and treats a spent budget as "no result". Only 'budget.exceeded' is swallowed; the caller
   * (the logical solver) notices the spent budget on its own at the next check.
   */
  function withBudget(search) {
    return function find(model, state, ctx) {
      try {
        return search(model, state, ctx);
      } catch (err) {
        if (err && err.code === 'budget.exceeded') return null;
        throw err;
      }
    };
  }

  // ---------------------------------------------------------------------------------------------
  // Link graph
  // ---------------------------------------------------------------------------------------------

  /**
   * Collects the strong links of `state` as pairs of nodes and lays them out as adjacency lists
   * (`sStart` / `sTo`, compressed rows) in a fixed order: cell links by cell, then unit links by unit.
   */
  function buildStrongLinks(model, state, completeUnits, s) {
    const digits = model.digits;
    const cand = state.candidates;
    const val = state.value;
    const pairA = s.pairA;
    const pairB = s.pairB;
    let pairs = 0;
    let i;

    for (let c = 0; c < model.cellCount; c++) {
      if (val[c] !== 0) continue;
      const m = cand[c];
      const rest = m & (m - 1);
      if (rest !== 0 && (rest & (rest - 1)) === 0) {
        pairA[pairs] = c * digits + (31 - Math.clz32(m & -m));
        pairB[pairs] = c * digits + (31 - Math.clz32(rest));
        pairs++;
      }
    }

    for (let u = 0; u < model.units.length; u++) {
      if (completeUnits[u] === 0) continue;
      const cells = model.units[u];
      let once = 0;
      let twice = 0;
      let thrice = 0;
      let placed = 0;
      for (i = 0; i < cells.length; i++) {
        const c = cells[i];
        if (val[c] !== 0) {
          placed |= 1 << (val[c] - 1);
          continue;
        }
        const m = cand[c];
        thrice |= twice & m;
        twice |= once & m;
        once |= m;
      }
      // Digits that fit in exactly two cells (a digit that is already placed here never counts).
      let exactlyTwo = twice & ~thrice & ~placed;
      while (exactlyTwo !== 0) {
        const bit = exactlyTwo & -exactlyTwo;
        exactlyTwo ^= bit;
        const d0 = 31 - Math.clz32(bit);
        let first = -1;
        for (i = 0; i < cells.length; i++) {
          const c = cells[i];
          if (val[c] !== 0 || (cand[c] & bit) === 0) continue;
          if (first < 0) {
            first = c;
          } else {
            pairA[pairs] = first * digits + d0;
            pairB[pairs] = c * digits + d0;
            pairs++;
            break;
          }
        }
      }
    }

    const sStart = s.sStart;
    const sCursor = s.sCursor;
    const sTo = s.sTo;
    sStart.fill(0);
    for (i = 0; i < pairs; i++) {
      sStart[pairA[i] + 1]++;
      sStart[pairB[i] + 1]++;
    }
    for (i = 0; i < s.nodes; i++) {
      sStart[i + 1] += sStart[i];
      sCursor[i] = sStart[i];
    }
    for (i = 0; i < pairs; i++) {
      sTo[sCursor[pairA[i]]++] = pairB[i];
      sTo[sCursor[pairB[i]]++] = pairA[i];
    }
  }

  /**
   * Writes the weak neighbours of `node` (open candidates that cannot be true together with it) into `buf`.
   * @returns {number} How many were written.
   */
  function collectWeak(r, node, buf) {
    const digits = r.digits;
    const cell = (node / digits) | 0;
    const d0 = node - cell * digits;
    const bit = 1 << d0;
    const cand = r.cand;
    const val = r.val;
    let count = 0;
    let others = cand[cell] & ~bit;
    while (others !== 0) {
      const low = others & -others;
      others ^= low;
      buf[count++] = cell * digits + (31 - Math.clz32(low));
    }
    const ps = r.peers[cell];
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (val[p] === 0 && (cand[p] & bit) !== 0) buf[count++] = p * digits + d0;
    }
    return count;
  }

  /** Whether two open candidates are weakly linked (a node is never linked to itself). */
  function isWeak(r, a, b) {
    const digits = r.digits;
    const ca = (a / digits) | 0;
    const cb = (b / digits) | 0;
    if (ca === cb) return a !== b;
    return a - ca * digits === b - cb * digits && r.s.peerMatrix[ca * r.n + cb] === 1;
  }

  /**
   * The candidates weakly linked to both the start node and `t`, which "at least one of them is true" rules
   * out. @returns {?number[]} Nodes, or null when there are none.
   */
  function commonWeak(r, t) {
    let out = null;
    const list = r.s.weakOfStart;
    for (let i = 0; i < r.startWeakCount; i++) {
      if (isWeak(r, list[i], t)) {
        if (out === null) out = [];
        out.push(list[i]);
      }
    }
    return out;
  }

  // ---------------------------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------------------------

  function pathTo(s, lit) {
    const out = [];
    for (let x = lit; x !== -1; x = s.parent[x]) out.push(x);
    return out.reverse();
  }

  /** Remembers a proof that is strictly shorter than the best one so far. Returns true (stop this search). */
  function record(r, kind, endLit, length, eliminated) {
    r.best = {
      kind: kind,
      length: length,
      path: pathTo(r.s, endLit),
      other: kind === KIND_ENDPOINTS ? null : pathTo(r.s, endLit ^ 1),
      eliminated: eliminated
    };
    r.bestLength = length;
    return true;
  }

  /**
   * Visits a literal reached from `from` after `nd` links. Returns true when this proves something.
   * Opposite polarities of one node in the same search are a contradiction of the start assumption.
   */
  function visit(r, next, from, nd) {
    const s = r.s;
    if (s.stamp[next] === r.stampId) return false;
    s.stamp[next] = r.stampId;
    s.parent[next] = from;
    s.dist[next] = nd;
    if (s.stamp[next ^ 1] === r.stampId) {
      return record(r, r.startTruth === 1 ? KIND_CONTRADICTION : KIND_FORCED, next, nd, null);
    }
    const node = next >> 1;
    if ((next & 1) === 1) {
      // Starting from "false", every true literal t gives "start or t". Pairs are looked at from their
      // lower node only: the search from the other end meets the same pair at the same length.
      if (r.startTruth === 0 && node > r.startNode) {
        const eliminated = commonWeak(r, node);
        if (eliminated !== null) return record(r, KIND_ENDPOINTS, next, nd, eliminated);
      }
      s.queue[r.tail++] = next;
    } else if (s.sStart[node + 1] > s.sStart[node]) {
      s.queue[r.tail++] = next;
    }
    return false;
  }

  /** Breadth first search from one literal, at most `limit` links deep. */
  function search(r, startNode, startTruth, limit) {
    const s = r.s;
    s.stampId++;
    r.stampId = s.stampId;
    r.startNode = startNode;
    r.startTruth = startTruth;
    const startLit = startNode * 2 + startTruth;
    s.stamp[startLit] = r.stampId;
    s.parent[startLit] = -1;
    s.dist[startLit] = 0;
    if (startTruth === 0) r.startWeakCount = collectWeak(r, startNode, s.weakOfStart);
    r.tail = 0;
    s.queue[r.tail++] = startLit;
    const expanded = s.weakOfExpanded;
    let head = 0;
    while (head < r.tail) {
      const lit = s.queue[head++];
      const d = s.dist[lit];
      if (d >= limit) return;
      const node = lit >> 1;
      if ((lit & 1) === 1) {
        const count = collectWeak(r, node, expanded);
        for (let i = 0; i < count; i++) {
          if (visit(r, expanded[i] * 2, lit, d + 1)) return;
        }
      } else {
        for (let k = s.sStart[node]; k < s.sStart[node + 1]; k++) {
          if (visit(r, s.sTo[k] * 2 + 1, lit, d + 1)) return;
        }
      }
    }
  }

  function pathData(digits, path) {
    return path.map(function (lit) {
      const node = lit >> 1;
      const cell = (node / digits) | 0;
      return [cell, node - cell * digits + 1, lit & 1];
    });
  }

  function buildChainFinding(model, best) {
    const digits = model.digits;
    const chains = [pathData(digits, best.path)];
    if (best.other !== null) chains.push(pathData(digits, best.other));
    const cells = [];
    chains.forEach(function (chain) {
      chain.forEach(function (step) {
        if (cells.indexOf(step[0]) === -1) cells.push(step[0]);
      });
    });
    const start = chains[0][0];
    let placements = [];
    let eliminations = [];
    if (best.kind === KIND_ENDPOINTS) {
      eliminations = best.eliminated.slice().sort(function (a, b) { return a - b; }).map(function (node) {
        const cell = (node / digits) | 0;
        return [cell, node - cell * digits + 1];
      });
    } else if (best.kind === KIND_CONTRADICTION) {
      eliminations = [[start[0], start[1]]];
    } else {
      placements = [[start[0], start[1]]];
    }
    return {
      technique: 'forcingChain',
      cells: cells,
      placements: placements,
      eliminations: eliminations,
      i18nKey: 'technique.forcingChain.step.' + best.kind,
      i18nArgs: { kind: best.kind, length: best.length, chains: chains }
    };
  }

  /**
   * Forcing chain / X-cycle: the shortest alternating inference chain (at most `maxChainLength` links) that
   * proves an elimination or a placement. See the file header.
   * @param {PuzzleModel} model
   * @param {SolveState} state  Read only.
   * @param {Object} ctx
   * @returns {?Finding}
   */
  function findForcingChain(model, state, ctx) {
    const maxLength = chainLimit(ctx);
    if (maxLength < 1) return null;
    const s = scratchFor(model);
    if (s.stampId > 2000000000) {
      s.stamp.fill(0);
      s.stampId = 0;
    }
    buildStrongLinks(model, state, ctx.completeUnits, s);

    const digits = model.digits;
    const r = {
      model: model,
      s: s,
      n: model.cellCount,
      digits: digits,
      cand: state.candidates,
      val: state.value,
      peers: model.peers,
      stampId: 0,
      startNode: 0,
      startTruth: 0,
      startWeakCount: 0,
      tail: 0,
      best: null,
      bestLength: Infinity
    };

    for (let node = 0; node < s.nodes; node++) {
      const cell = (node / digits) | 0;
      if (r.val[cell] !== 0 || (r.cand[cell] & (1 << (node - cell * digits))) === 0) continue;
      for (let truth = 0; truth <= 1; truth++) {
        if (truth === 0 && s.sStart[node + 1] === s.sStart[node]) continue;
        const limit = Math.min(maxLength, r.bestLength - 1);
        if (limit < 1) return buildChainFinding(model, r.best);
        ctx.check();
        search(r, node, truth, limit);
      }
    }
    return r.best === null ? null : buildChainFinding(model, r.best);
  }

  // ---------------------------------------------------------------------------------------------
  // Nishio
  // ---------------------------------------------------------------------------------------------

  /**
   * Whether assuming `digit` in `cell` on top of `base` (which is not modified) leads to a contradiction.
   * With `depth` > 1 the assumption is also tested by nested guesses of `depth - 1` inside the copy.
   * `level` selects the scratch state of this nesting level.
   */
  function refutes(r, base, cell, digit, depth, level) {
    const model = r.model;
    let trial = r.pool[level];
    if (trial === undefined) {
      trial = SG.model.cloneState(base);
      r.pool[level] = trial;
    }
    r.ctx.check();
    SG.model.cloneState(base, trial);
    if (!SG.constraints.place(model, trial, cell, digit, r.budget)) return true;
    if (depth <= 1) return false;

    const cand = trial.candidates;
    const val = trial.value;
    const widest = Math.min(r.digits, NESTED_MAX_CANDIDATES);
    for (;;) {
      let progress = false;
      for (let size = 2; size <= widest; size++) {
        for (let c = 0; c < r.n; c++) {
          if (val[c] !== 0 || r.popcount(cand[c]) !== size) continue;
          let rest = cand[c];
          while (rest !== 0) {
            const low = rest & -rest;
            rest ^= low;
            if (val[c] !== 0 || (cand[c] & low) === 0) continue;
            const nested = 32 - Math.clz32(low);
            if (refutes(r, trial, c, nested, depth - 1, level + 1)) {
              if (!SG.constraints.eliminate(model, trial, c, nested)) return true;
              if (!SG.constraints.propagate(model, trial, r.budget)) return true;
              progress = true;
            }
          }
        }
      }
      if (!progress) return false;
    }
  }

  /**
   * Nishio: assume a candidate on a copy of the state, propagate, and eliminate it on a contradiction.
   * Depth 1 trials of every candidate come first, then nested ones up to `maxNishioDepth`.
   * @param {PuzzleModel} model
   * @param {SolveState} state  Read only; every trial runs on a copy.
   * @param {Object} ctx
   * @returns {?Finding}
   */
  function findNishio(model, state, ctx) {
    const maxDepth = nishioDepth(ctx);
    if (maxDepth < 1) return null;
    const n = model.cellCount;
    const cand = state.candidates;
    const val = state.value;
    const popcount = SG.bits.popcount;
    const r = {
      model: model,
      ctx: ctx,
      budget: ctx.budget,
      n: n,
      digits: model.digits,
      popcount: popcount,
      pool: []
    };

    for (let depth = 1; depth <= maxDepth; depth++) {
      // Cells with two candidates first: their trials are the cheapest to understand and to apply.
      for (let size = 2; size <= model.digits; size++) {
        for (let cell = 0; cell < n; cell++) {
          if (val[cell] !== 0 || popcount(cand[cell]) !== size) continue;
          let rest = cand[cell];
          while (rest !== 0) {
            const low = rest & -rest;
            rest ^= low;
            const digit = 32 - Math.clz32(low);
            if (refutes(r, state, cell, digit, depth, 0)) {
              return {
                technique: 'nishio',
                cells: [cell],
                placements: [],
                eliminations: [[cell, digit]],
                i18nKey: 'technique.nishio.step',
                i18nArgs: { cell: cell, label: SG.model.cellLabel(model, cell), digit: digit, depth: depth }
              };
            }
          }
        }
      }
    }
    return null;
  }

  SG.techniques.register({
    id: 'forcingChain',
    group: 'chain',
    baseCost: 90,
    order: 190,
    i18nKey: 'technique.forcingChain',
    variantScope: null,
    assumesUniqueness: false,
    find: withBudget(findForcingChain)
  });

  SG.techniques.register({
    id: 'nishio',
    group: 'chain',
    baseCost: 140,
    order: 200,
    i18nKey: 'technique.nishio',
    variantScope: null,
    assumesUniqueness: false,
    find: withBudget(findNishio)
  });
})(typeof self !== 'undefined' ? self : globalThis);
