/**
 * Chain techniques (group `chain`): Forcing Chain / X-Cycle and Nishio, each in a short and a long (shallow
 * and deep) window; these are the most expensive techniques, so all honour `ctx.check()` and turn a
 * `budget.exceeded` into "nothing found" (other errors, e.g. `budget.cancelled`, propagate).
 *
 *   id                baseCost  order  window of the shortest proof
 *   forcingChain          90     190   1 .. C links (C = SG.chainSearch.SHORT_MAX, 4)
 *   forcingChainLong     118     198   C + 1 .. 12 links
 *   nishio               140     200   depth 1
 *   nishioDeep           210     202   depth 2 (default maximum) .. 3 (explicit maximum)
 *
 * Difficulty v3 (R9): every window is applied to the SHORTEST proof of the whole search, so a proof belongs
 * to exactly one ID and a longer or deeper technique called alone never relabels a proof that a shorter one
 * owns. The registered finders are thin wrappers of the parameterised seam described below.
 *
 * forcingChain: alternating inference chains over a strong / weak link graph.
 * A node is a candidate (cell, digit) of an open cell. Links, defined on the current state:
 *   weak link   "at most one of the two is true": same cell and different digits, or the same digit in two
 *               cells that share a unit (`model.peers`). Valid for every unit shape, partial units included.
 *   strong link "at least one of the two is true": the only two candidates of a cell, or the only two
 *               cells of a COMPLETE unit (`ctx.completeUnits`) that still allow a digit (a partial unit
 *               never yields one: a digit may be absent from it).
 * Every link is an implication between literals ("node is true" / "node is false"):
 *   weak(a, b):    a is true  =>  b is false
 *   strong(a, b):  a is false =>  b is true
 * so the graph over LITERALS has two kinds of edges: true -> false (weak) and false -> true (strong). The
 * polarity of a literal decides which kind of link may leave it, which guarantees alternation, and a chain is
 * just a path. Implications compose, so a path "A => B" is a proof whatever nodes it revisits (soundness
 * never depends on the chain being simple).
 *
 * Search: breadth first from every literal, at most as many links deep as the window allows (12 at most; the
 * caller's `ctx.options.maxChainLength` can only narrow it). Every literal is visited once per search (so it
 * terminates on cyclic graphs). The search from a start literal stops at its first proof, and the whole scan
 * keeps the SHORTEST proof found (ties: first in scan order).
 *   endpoints      Start "s is false", reach "t is true": at least one of s, t is true, so every candidate
 *                  weakly linked to both is eliminated. Covers X-chains, alternating inference chains, W-wing
 *                  like patterns and every elimination of a continuous nice loop.
 *   contradiction  Start "s is true", reach both "m is true" and "m is false" for some node m: s is
 *                  eliminated (a loop back to s is the case m = s).
 *   forced         Start "s is false", reach both polarities of some node: s is placed.
 * A search only PROVES things; cutting it short (length limit, budget) can only lose deductions, never
 * produce a wrong one. Finding.i18nArgs: { kind, length, chains }; `chains` are paths of [cell, digit, truth]
 * (truth 1 = candidate true, 0 = false), start literal first. `endpoints` has one chain, `contradiction` and
 * `forced` two, ending in both polarities of the same node. `length` counts edges; for the two chains of a
 * `contradiction` or `forced` proof it is the longer one, not the sum (their lengths differ by an odd number:
 * the literals of one node have opposite polarity, and every edge changes the polarity).
 * i18nKey: 'technique.forcingChain.step.' + kind and 'technique.forcingChainLong.step.' + kind, with kind
 * 'endpoints' | 'contradiction' | 'forced'.
 *
 * nishio: controlled trial and error. For every open cell (fewest candidates first) and each of its
 * candidates, assume it true on a COPY of the state and run `SG.constraints.place` (peer elimination,
 * singles, registered extensions); a contradiction eliminates the candidate. The first one found is returned;
 * the state passed to find() is never written. The guess is bounded, which keeps it a technique and not a
 * search: the window gives the deepest nesting (nishio 1; nishioDeep 2 by default and 3 at most, only when
 * the caller's `ctx.options.maxNishioDepth` asks for it). Depth 2 also lets the trial refute candidates of
 * its cells with at most 3 candidates by a depth 1 trial of their own, remove them from the COPY, propagate
 * and repeat; a contradiction anywhere refutes the assumption (limiting nested guesses to such cells keeps
 * 12x12 and 16x16 boards below a second). The scan runs level by level, so a deduction never needs a deeper
 * guess than necessary. Everything derived inside a trial holds under its assumption only and only the final
 * contradiction leaves it, so nesting is sound. `maxChainLength` does not apply. Finding: i18nKey
 * 'technique.nishio.step' ('technique.nishioDeep.step' for nishioDeep), i18nArgs { cell, label, digit,
 * depth } (the nesting of the guess needed).
 *
 * The caller's options. `ctx.options.maxChainLength` (forcingChain, forcingChainLong) and
 * `ctx.options.maxNishioDepth` (nishio, nishioDeep) only narrow the window of an ID: absent, not a number or
 * NaN is the ID's own default maximum; a number is floored and clamped to the ID's ceiling (C, 12, 1 and 3,
 * so Infinity reaches the ceiling and not the default 2 of nishioDeep); 0 or less, or a maximum below the
 * ID's minimum, is an empty window (null, never a raised maximum). C is read from `SG.chainSearch.SHORT_MAX`
 * at every call. Every registered finder hands the seam below its ID, both bounds and its work limit
 * explicitly: forcingChain and nishio none (their accepted unbounded work policy; the parent budget and
 * cancellation still apply), the two new IDs 50000 (R10's starting limit of a new pattern finder,
 * `NEW_FINDER_WORK_LIMIT`).
 *
 * The seam. The two searches are also a parameterised, unregistered seam (difficulty v3, MS07a):
 *
 *   SG.chainSearch.forcing(model, state, ctx, { id, minLength, maxLength, workLimit })
 *   SG.chainSearch.nishio(model, state, ctx, { id, minDepth, maxDepth, workLimit })
 *
 * `id` becomes Finding.technique and the prefix of its i18nKey ('technique.' + id + '.step[.kind]'). The
 * inclusive range [min, max] is applied to the SHORTEST proof of the whole search: the search always starts
 * at length (depth) 1 and runs up to max, and a minimum below min is rejected (null), so a longer or deeper
 * technique called alone never relabels a proof that a shorter one owns. Nothing is clamped here (the seam
 * serves tests of chains longer than 12 edges). Defaults of the seam only: min 1, max 12 edges / depth 2.
 * The tie order and the iterative deepening are those of the registered finders.
 *
 * Work. A forcing unit is one edge expansion of the breadth first search, a nishio unit one trial (one
 * assumption entered on a copy). `workLimit` is a whole number: absent = DEFAULT_WORK_LIMIT (50000, R10),
 * null = unbounded. The counter is reset per call. A bounded call checks the parent budget at entry and
 * before every root of a forcing scan, and so often between that no more than 256 work units pass between
 * two checks (R10): the run remembers its work at the last check (`checkedAt`) and checks again before a
 * batch of edges that would carry the gap over 256, splitting an expansion of more than 256 edges into
 * pieces of at most 256 (every edge is visited and counted once, in the order of the search, also for a
 * Finding in the middle of a piece, a cut by the work limit or a budget that runs out). A nishio trial
 * always checks, bounded or not. The unbounded legacy calls of forcingChain and nishio keep their accepted
 * cadence: no entry check and no periodic check (the root checks of forcingChain and the trial checks of
 * nishio were always there). A spent limit ends the call with null, never with the best proof so far: a
 * proof is published only when its minimum is established. A spent budget ('budget.exceeded') is "nothing
 * found" as for the registered finders (so the record of such a call has capHit null, like a complete scan:
 * a consumer checks its own budget after the call); cancellation and every other error propagate. An
 * optional `ctx.options.onPatternWork(record)` observes the call and never selects its result: record =
 * { id, work, limit (null = unbounded), capHit (null | 'work'), retained (null) }, a fresh object per call.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first registration on repeated loads.
  if (['forcingChain', 'forcingChainLong', 'nishio', 'nishioDeep'].some(function (id) {
    return SG.techniques.has(id);
  })) return;

  // R9: the short window of forcingChain is 1..C links (C is `SG.chainSearch.SHORT_MAX`, read at every call,
  // initially 4, selected by MS07c: 36 of 36 Nightmare requests exact against 24 of 36 for 6) and
  // forcingChainLong takes C + 1 up to the old ceiling of 12.
  const INITIAL_SHORT_MAX = 4;
  const LONG_MAX_CHAIN_LENGTH = 12;

  // Windows of nishio (depth 1) and nishioDeep (from 2, default maximum 2, explicit maximum at most 3);
  // every level multiplies the work.
  const SHALLOW_NISHIO_DEPTH = 1;
  const DEEP_NISHIO_MIN_DEPTH = 2;
  const DEFAULT_DEEP_NISHIO_DEPTH = 2;
  const NISHIO_DEPTH_CEILING = 3;

  /** A nested guess is only tried in cells that have at most this many candidates left. */
  const NESTED_MAX_CANDIDATES = 3;

  // R10: the work units one call of a bounded kernel may spend, and how often it checks its parent budget.
  // DEFAULT_WORK_LIMIT is only the default of the seam; the registered finders never rely on it:
  // NEW_FINDER_WORK_LIMIT is the starting limit of the two new IDs, and forcingChain and nishio pass none.
  const DEFAULT_WORK_LIMIT = 50000;
  const NEW_FINDER_WORK_LIMIT = 50000;
  const NO_WORK_LIMIT = Infinity;
  const WORK_CHECK_UNITS = 256;

  // The seam's own default of the longest chain and of the deepest nesting.
  const SEAM_DEFAULT_MAX_CHAIN_LENGTH = 12;
  const SEAM_DEFAULT_MAX_NISHIO_DEPTH = 2;

  const ID_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

  // Thrown through the nested trials of a nishio call whose work limit is spent.
  const WORK_CAP = Object.freeze({ capHit: 'work' });

  const KIND_ENDPOINTS = 'endpoints';
  const KIND_CONTRADICTION = 'contradiction';
  const KIND_FORCED = 'forced';

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

  // The caller's maximum, `ctx.options[key]`: a number (floored; Infinity and values below 1 included), or
  // `fallback` (the default maximum of the ID) when it is absent, not a number or NaN.
  function callerMax(ctx, key, fallback) {
    const raw = ctx.options ? ctx.options[key] : undefined;
    if (typeof raw !== 'number' || Number.isNaN(raw)) return fallback;
    return Math.floor(raw);
  }

  // C, the longest chain of forcingChain and one below the shortest of forcingChainLong: read from
  // `SG.chainSearch.SHORT_MAX` at every call.
  function shortMax() {
    const value = SG.chainSearch.SHORT_MAX;
    if (typeof value !== 'number' || Number.isNaN(value)) {
      const err = new SG.errors.GenerationError('solver.invalidOption', { option: 'chainSearch.SHORT_MAX' });
      err.message = 'solver.invalidOption: chainSearch.SHORT_MAX must be a number';
      throw err;
    }
    return Math.floor(value);
  }

  function invalidOption(seam, key, reason) {
    const err = new SG.errors.GenerationError('solver.invalidOption',
      { option: 'chainSearch.' + seam + '.' + key });
    err.message = 'solver.invalidOption: chainSearch.' + seam + ' ' + key + ' ' + reason;
    return err;
  }

  // A window bound of the seam: a number (Infinity included), floored.
  function bound(seam, key, value, fallback) {
    if (value === undefined) return fallback;
    if (typeof value !== 'number' || Number.isNaN(value)) throw invalidOption(seam, key, 'must be a number');
    return Math.floor(value);
  }

  // The options of a seam call: { id, min, max, limit } with the work limit Infinity when unbounded.
  function seamOptions(seam, opts, minKey, maxKey, defaultMax) {
    if (opts === null || typeof opts !== 'object') throw invalidOption(seam, 'options', 'must be an object');
    if (typeof opts.id !== 'string' || !ID_PATTERN.test(opts.id)) {
      throw invalidOption(seam, 'id', 'must be a technique id');
    }
    let limit = DEFAULT_WORK_LIMIT;
    if (opts.workLimit === null) {
      limit = Infinity;
    } else if (opts.workLimit !== undefined) {
      if (typeof opts.workLimit !== 'number' || Number.isNaN(opts.workLimit) || opts.workLimit < 0) {
        throw invalidOption(seam, 'workLimit', 'must be null or a number of at least 0');
      }
      limit = Math.floor(opts.workLimit);
    }
    return {
      id: opts.id,
      min: Math.max(1, bound(seam, minKey, opts[minKey], 1)),
      max: bound(seam, maxKey, opts[maxKey], defaultMax),
      limit: limit
    };
  }

  // A finder call: a spent budget is "no result" (the logical solver notices the spent budget on its own at
  // the next check); cancellation and every other error propagate. The work goes to the optional observer.
  function measured(model, state, ctx, spec, run, scan) {
    let found = null;
    try {
      found = scan(model, state, ctx, spec, run);
    } catch (err) {
      if (err === WORK_CAP) run.capped = true;
      else if (!(err && err.code === 'budget.exceeded')) throw err;
    }
    const observer = ctx.options ? ctx.options.onPatternWork : undefined;
    if (typeof observer === 'function') {
      observer({
        id: spec.id,
        work: run.work,
        limit: spec.limit === Infinity ? null : spec.limit,
        capHit: run.capped ? 'work' : null,
        retained: null
      });
    }
    return found;
  }

  // A bounded call checks its parent budget before a batch of `n` edges that would carry the work done since
  // its last check (`checkedAt`: the entry check, a root check or the previous gate check) over 256 units, so
  // that no more than 256 units pass between two checks, whatever the sizes of the expansions are.
  function gate(run, n) {
    if (run.work + n - run.checkedAt > WORK_CHECK_UNITS) {
      run.ctx.check();
      run.checkedAt = run.work;
    }
  }

  // Collects the strong links of `state` as pairs of nodes and lays them out as adjacency lists (`sStart` /
  // `sTo`, compressed rows) in a fixed order: cell links by cell, then unit links by unit.
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

  // Writes the weak neighbours of `node` (open candidates that cannot be true together with it) into `buf`;
  // returns how many.
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

  function isWeak(r, a, b) {
    const digits = r.digits;
    const ca = (a / digits) | 0;
    const cb = (b / digits) | 0;
    if (ca === cb) return a !== b;
    return a - ca * digits === b - cb * digits && r.s.peerMatrix[ca * r.n + cb] === 1;
  }

  // The candidates weakly linked to both the start node and `t`, which "at least one of them is true" rules
  // out; null when there are none.
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

  // Visits a literal reached from `from` after `nd` links; true when this proves something. Opposite
  // polarities of one node in the same search are a contradiction of the start assumption.
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

  // Visits the edges of one expansion in order: the first `count` of `edges` from `first`, as literals of
  // polarity `tbit`, reached from `lit` after `nd` links. Returns true when an edge proves something (the
  // search ends). Every visited edge is counted once, also the one that proves something; a bounded call
  // visits no more than its work limit still allows (a cut sets `capped`) and goes in pieces of at most 256
  // edges, each behind the gate, so that an oversized expansion cannot exceed the gap between two checks.
  function expand(r, lit, nd, edges, first, count) {
    let todo = count;
    if (r.bounded && r.workLimit - r.work < count) todo = r.workLimit - r.work;
    const tbit = (lit & 1) ^ 1;
    let i = 0;
    while (i < todo) {
      let end = todo;
      if (r.bounded) {
        end = Math.min(todo, i + WORK_CHECK_UNITS);
        gate(r, end - i);
      }
      const from = i;
      for (; i < end; i++) {
        if (visit(r, edges[first + i] * 2 + tbit, lit, nd)) {
          r.work += i - from + 1;
          return true;
        }
      }
      r.work += end - from;
    }
    if (todo < count) r.capped = true;
    return false;
  }

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
      // A true literal follows its weak links (to false ones), a false literal its strong links (to true).
      if ((lit & 1) === 1) {
        if (expand(r, lit, d + 1, expanded, 0, collectWeak(r, node, expanded))) return;
      } else {
        const first = s.sStart[node];
        if (expand(r, lit, d + 1, s.sTo, first, s.sStart[node + 1] - first)) return;
      }
      if (r.capped) return;
    }
  }

  function pathData(digits, path) {
    return path.map(function (lit) {
      const node = lit >> 1;
      const cell = (node / digits) | 0;
      return [cell, node - cell * digits + 1, lit & 1];
    });
  }

  function buildChainFinding(model, best, id) {
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
      technique: id,
      cells: cells,
      placements: placements,
      eliminations: eliminations,
      i18nKey: 'technique.' + id + '.step.' + best.kind,
      i18nArgs: { kind: best.kind, length: best.length, chains: chains }
    };
  }

  // The forcing chain search of the seam: the shortest proof of the whole scan up to `spec.max` links, kept
  // only when it has at least `spec.min` links. `r` is the search state with the counters of the call.
  function scanForcing(model, state, ctx, spec, r) {
    const maxLength = spec.max;
    if (maxLength < 1 || maxLength < spec.min) return null;
    if (r.bounded) ctx.check();
    const s = scratchFor(model);
    if (s.stampId > 2000000000) {
      s.stamp.fill(0);
      s.stampId = 0;
    }
    buildStrongLinks(model, state, ctx.completeUnits, s);
    r.s = s;

    const digits = r.digits;
    for (let node = 0; node < s.nodes; node++) {
      const cell = (node / digits) | 0;
      if (r.val[cell] !== 0 || (r.cand[cell] & (1 << (node - cell * digits))) === 0) continue;
      for (let truth = 0; truth <= 1; truth++) {
        if (truth === 0 && s.sStart[node + 1] === s.sStart[node]) continue;
        const limit = Math.min(maxLength, r.bestLength - 1);
        if (limit < 1) return buildChainFinding(model, r.best, spec.id);
        ctx.check();
        r.checkedAt = r.work;
        search(r, node, truth, limit);
        if (r.capped) return null;
        // The minimum can only fall from here, so a proof below the window is the answer: nothing.
        if (r.best !== null && r.bestLength < spec.min) return null;
      }
    }
    return r.best === null ? null : buildChainFinding(model, r.best, spec.id);
  }

  // The search of a spec { id, min, max, limit }: the seam checks one from its options, the registered
  // finders build theirs with their old defaults.
  function forcingWith(model, state, ctx, spec) {
    const r = {
      model: model,
      s: null,
      n: model.cellCount,
      digits: model.digits,
      cand: state.candidates,
      val: state.value,
      peers: model.peers,
      ctx: ctx,
      bounded: spec.limit !== Infinity,
      work: 0,
      workLimit: spec.limit,
      checkedAt: 0,
      capped: false,
      stampId: 0,
      startNode: 0,
      startTruth: 0,
      startWeakCount: 0,
      tail: 0,
      best: null,
      bestLength: Infinity
    };
    return measured(model, state, ctx, spec, r, scanForcing);
  }

  function chainForcing(model, state, ctx, opts) {
    return forcingWith(model, state, ctx,
      seamOptions('forcing', opts, 'minLength', 'maxLength', SEAM_DEFAULT_MAX_CHAIN_LENGTH));
  }

  // forcingChain: the shortest proof when it has 1 to C links; no work limit (its accepted policy, the parent
  // budget and cancellation still apply). The caller's maxChainLength can only narrow the range of links.
  function findForcingChain(model, state, ctx) {
    const c = shortMax();
    return forcingWith(model, state, ctx, {
      id: 'forcingChain',
      min: 1,
      max: Math.min(c, callerMax(ctx, 'maxChainLength', c)),
      limit: NO_WORK_LIMIT
    });
  }

  // forcingChainLong: the shortest proof when it has C + 1 to 12 links, R10's work limit of a new finder.
  function findForcingChainLong(model, state, ctx) {
    return forcingWith(model, state, ctx, {
      id: 'forcingChainLong',
      min: shortMax() + 1,
      max: Math.min(LONG_MAX_CHAIN_LENGTH, callerMax(ctx, 'maxChainLength', LONG_MAX_CHAIN_LENGTH)),
      limit: NEW_FINDER_WORK_LIMIT
    });
  }

  // Whether assuming `digit` in `cell` on top of `base` (not modified) leads to a contradiction; with `depth`
  // > 1 nested guesses of `depth - 1` are tried inside the copy. `level` selects the scratch state of this
  // nesting level. One call is one work unit; a spent work limit unwinds all the levels with WORK_CAP.
  function refutes(r, base, cell, digit, depth, level) {
    const model = r.model;
    let trial = r.pool[level];
    if (trial === undefined) {
      trial = SG.model.cloneState(base);
      r.pool[level] = trial;
    }
    r.ctx.check();
    if (r.work >= r.workLimit) throw WORK_CAP;
    r.work++;
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

  // The nishio search of the seam: iterative deepening from depth 1, so the first refutation is at the least
  // depth; it is accepted only when that depth is at least `spec.min` and at most `spec.max`.
  function scanNishio(model, state, ctx, spec, r) {
    // A guess is made in an open cell and settles it: no refutation nests deeper than there are cells.
    const maxDepth = Math.min(spec.max, model.cellCount);
    if (maxDepth < 1 || maxDepth < spec.min) return null;
    if (r.bounded) ctx.check();
    const n = model.cellCount;
    const cand = state.candidates;
    const val = state.value;
    const popcount = r.popcount;

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
              // The depth only grows from here: a refutation below the window is the answer, nothing.
              if (depth < spec.min) return null;
              return {
                technique: spec.id,
                cells: [cell],
                placements: [],
                eliminations: [[cell, digit]],
                i18nKey: 'technique.' + spec.id + '.step',
                i18nArgs: { cell: cell, label: SG.model.cellLabel(model, cell), digit: digit, depth: depth }
              };
            }
          }
        }
      }
    }
    return null;
  }

  function nishioWith(model, state, ctx, spec) {
    const r = {
      model: model,
      ctx: ctx,
      budget: ctx.budget,
      n: model.cellCount,
      digits: model.digits,
      popcount: SG.bits.popcount,
      pool: [],
      bounded: spec.limit !== Infinity,
      work: 0,
      workLimit: spec.limit,
      capped: false
    };
    return measured(model, state, ctx, spec, r, scanNishio);
  }

  function chainNishio(model, state, ctx, opts) {
    return nishioWith(model, state, ctx,
      seamOptions('nishio', opts, 'minDepth', 'maxDepth', SEAM_DEFAULT_MAX_NISHIO_DEPTH));
  }

  // nishio: the first refutation when its depth is 1; no work limit (its accepted policy, the parent budget
  // and cancellation still apply). The caller's maxNishioDepth can only narrow the window (0 or less: off).
  function findNishio(model, state, ctx) {
    return nishioWith(model, state, ctx, {
      id: 'nishio',
      min: SHALLOW_NISHIO_DEPTH,
      max: Math.min(SHALLOW_NISHIO_DEPTH, callerMax(ctx, 'maxNishioDepth', SHALLOW_NISHIO_DEPTH)),
      limit: NO_WORK_LIMIT
    });
  }

  // nishioDeep: the first refutation when its depth is at least 2, by default at most 2 and, when the
  // caller's maxNishioDepth asks for it, at most 3; R10's work limit of a new finder.
  function findNishioDeep(model, state, ctx) {
    return nishioWith(model, state, ctx, {
      id: 'nishioDeep',
      min: DEEP_NISHIO_MIN_DEPTH,
      max: Math.min(NISHIO_DEPTH_CEILING, callerMax(ctx, 'maxNishioDepth', DEFAULT_DEEP_NISHIO_DEPTH)),
      limit: NEW_FINDER_WORK_LIMIT
    });
  }

  SG.chainSearch = { forcing: chainForcing, nishio: chainNishio, SHORT_MAX: INITIAL_SHORT_MAX };

  SG.techniques.register({
    id: 'forcingChain',
    group: 'chain',
    baseCost: 90,
    order: 190,
    i18nKey: 'technique.forcingChain',
    variantScope: null,
    assumesUniqueness: false,
    find: findForcingChain
  });

  SG.techniques.register({
    id: 'forcingChainLong',
    group: 'chain',
    baseCost: 118,
    order: 198,
    i18nKey: 'technique.forcingChainLong',
    variantScope: null,
    assumesUniqueness: false,
    find: findForcingChainLong
  });

  SG.techniques.register({
    id: 'nishio',
    group: 'chain',
    baseCost: 140,
    order: 200,
    i18nKey: 'technique.nishio',
    variantScope: null,
    assumesUniqueness: false,
    find: findNishio
  });

  SG.techniques.register({
    id: 'nishioDeep',
    group: 'chain',
    baseCost: 210,
    order: 202,
    i18nKey: 'technique.nishioDeep',
    variantScope: null,
    assumesUniqueness: false,
    find: findNishioDeep
  });
})(typeof self !== 'undefined' ? self : globalThis);
