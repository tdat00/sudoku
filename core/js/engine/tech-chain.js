/**
 * Chain techniques (group `chain`): the restricted XY-chain, Forcing Chain / X-Cycle and Nishio, each chain
 * in a short and a long window and Nishio in a shallow and a deep one; these are the most expensive
 * techniques, so all honour `ctx.check()` and turn a `budget.exceeded` into "nothing found" (other errors,
 * e.g. `budget.cancelled`, propagate).
 *
 *   id                baseCost  order  window of the shortest proof
 *   xyChain               82     186   1 .. 12 edges over the RESTRICTED edges (3, 5 .. 11 occur)
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
 * xyChain (difficulty v3, R15, MS12): the same search over a RESTRICTED graph, chosen by the explicit edge
 * filters of the shared builder (below), so that every step of its proof is a bivalue-only inference:
 *   strong link  "at least one of the two is true": ONLY the two candidates of a bivalue cell (never the two
 *                places of a digit in a unit, however complete the unit is, and never a cell with more
 *                candidates);
 *   weak link    "at most one of the two is true": ONLY the same digit in two distinct cells that see each
 *                other (`model.peers`, partial units included; never two candidates of one cell).
 * The only proof is `endpoints`: from "s is false" to "t is true", where s and t are the same digit in two
 * DISTINCT cells. The edges alternate from a strong one to a strong one, so a proof has 3, 5, ... edges.
 * At least one of s and t is true, so that digit is eliminated from every candidate that sees both cells
 * (the cells of the chain included). No placement and no contradiction is searched: a start that is "true"
 * has no use and the two polarities of one node are not compared. The search keeps the shortest proof of
 * the whole scan (ties: the lowest start node, then the order of the breadth first search) up to 12 edges,
 * and the caller's maxChainLength can only narrow that. The restricted graph does not consult the contents
 * of `ctx.completeUnits` or use unit-conjugate strong links. A path may visit a cell twice (soundness never
 * depends on the chain being simple); it is still a path of restricted edges. i18nKey
 * 'technique.xyChain.step'; i18nArgs { digit, kind: 'endpoints', length, chains } with one chain of
 * [cell, digit, truth] triples as above and `digit` the digit of both ends; `cells` are the distinct cells of
 * the chain, ascending; eliminations ascending by cell.
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
 * The caller's options. `ctx.options.maxChainLength` (xyChain, forcingChain, forcingChainLong) and
 * `ctx.options.maxNishioDepth` (nishio, nishioDeep) only narrow the window of an ID: absent, not a number or
 * NaN is the ID's own default maximum; a number is floored and clamped to the ID's ceiling (12, C, 12, 1
 * and 3, so Infinity reaches the ceiling and not the default 2 of nishioDeep); 0 or less, or a maximum
 * below the ID's minimum, is an empty window (null, never a raised maximum). C is read from
 * `SG.chainSearch.SHORT_MAX` at every call. Every registered finder hands the seam below its ID, both
 * bounds and its work limit explicitly: forcingChain and nishio none (their accepted unbounded work
 * policy; the parent budget and cancellation still apply), the three new IDs 50000 (R10's starting limit
 * of a new pattern finder, `NEW_FINDER_WORK_LIMIT`; for xyChain the unit is the edge expansion of the
 * restricted graph).
 *
 * The seam. The two searches are also a parameterised, unregistered seam (difficulty v3, MS07a):
 *
 *   SG.chainSearch.forcing(model, state, ctx, { id, minLength, maxLength, workLimit, edges })
 *   SG.chainSearch.nishio(model, state, ctx, { id, minDepth, maxDepth, workLimit })
 *
 * `edges` (forcing only) is the explicit edge mode of the shared builder: 'general' (the default: the graph
 * and the three proofs described above, unchanged) or 'restricted' (the xyChain graph and its only proof);
 * anything else is `solver.invalidOption`. A restricted call returns the xyChain Finding under the given
 * `id`. The registered xyChain asks for it explicitly; no general finder reads it.
 * `id` becomes Finding.technique and the prefix of its i18nKey ('technique.' + id + '.step[.kind]'; a
 * restricted call has no kind suffix). The inclusive range [min, max] is applied to the SHORTEST proof of
 * the whole search: the search always starts at length (depth) 1 and runs up to max, and a minimum below
 * min is rejected (null), so a longer or deeper technique called alone never relabels a proof that a
 * shorter one owns. Nothing is clamped here (the seam serves tests of chains longer than 12 edges).
 * Defaults of the seam only: min 1, max 12 edges / depth 2. The tie order and the iterative deepening are
 * those of the registered finders.
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
 *
 * The canonical grouped graph (difficulty v3, R16, MS13a). INACTIVE: no registered finder and no seam call
 * reads it; the finders above keep the singleton graph and its arithmetic nodes (cell * digits + digit).
 * It is the internal `SG.chainGraph.build(model, state, ctx[, { groupLimit, workLimit }])`, for tests and
 * for the later activation of grouped forcing chains (MS13c), and it returns
 *
 *   { nodes, weak, strong, complete, work, capHit }
 *
 * Node = { cells, digit }: `cells` ascending, distinct, non-empty, each an open cell that still holds the
 * candidate `digit` (1-based, as in a Finding); a node is true when at least one listed cell holds the digit,
 * so a true group is no permission to place one arbitrary member. `nodes` lists the singletons, one per open
 * candidate in ascending (cell, digit) order, then the additional nodes (the groups): for every complete unit
 * of kind 'box' or 'region' and every complete 'row' or 'col' unit that shares at least two cells with it,
 * and every digit, the open cells of that intersection that still hold the digit, when there are at least
 * two. Other complete units (windows, diagonals) generate no group of their own, but they still give strong
 * links and all their peers give weak links. Groups are deduplicated by their key [digit, ...cells] and
 * sorted by it numerically, element by element (a shorter prefix first, not decimal-string order), so they
 * follow the singletons. Nothing about the state is cached between calls: the node order is a function of
 * the state alone. `weak[i]` and `strong[i]` list the nodes joined to node i, ascending, without duplicates,
 * symmetric:
 *   weak (at most one is true)      same digit: the nodes are disjoint and EVERY cross pair of cells sees
 *                                   each other (`model.peers`, partial units included); never one convenient
 *                                   pair and never overlapping nodes. Different digits: two singletons of
 *                                   one cell.
 *   strong (at least one is true)   same digit: two disjoint nodes whose cells are exactly all the open
 *                                   occurrences of the digit in one COMPLETE unit (`ctx.completeUnits`)
 *                                   where the digit is not placed (one more occurrence, or a partial unit,
 *                                   gives no link). Different digits: the two singletons of a bivalue cell.
 * Work: one unit is one tested combination, three kinds: a group candidate (a (box or region, row or
 * column, digit) intersection with at least two open occurrences, charged before deduplication), a pair of
 * candidates of one open cell, and EVERY pair of nodes of one digit, charged before the test that their
 * first cells see each other (a sound prefilter: all cross pairs in conflict imply it, and two nodes of a
 * strong link lie in one unit) and before the disjointness and edge tests. The limits are `GROUP_NODE_LIMIT`
 * (4096 additional nodes) and `GRAPH_WORK_LIMIT` (50000 units); the option argument replaces either (a
 * finite number of at least 0, floored, else `solver.invalidOption`; no unbounded mode). The quota counts
 * distinct groups and is enforced while they are collected: a duplicate attempt spends work and no slot,
 * exactly the limit is allowed and the next distinct group refuses the build. The parent budget is checked
 * at entry, after the model-only set-up (the geometry, cached per model, whether or not it was built by this
 * call), once per 256 steps of the uncharged per-call scans (the cells, the cells of the group
 * intersections, the cells of the complete units) and so that no more than 256 charged units pass between
 * two checks of the charged loops. A graph that cannot be completed is `complete: false` with EMPTY
 * `nodes`, `weak` and `strong`, never a partial graph: `capHit` is 'work' (the unit limit was reached;
 * `work` equals the limit), 'nodes' (more additional nodes than the quota) or null (a spent budget,
 * 'budget.exceeded': the caller checks its own budget); cancellation and every other error propagate and
 * the builder publishes no observer record. Empty arrays mean no usable graph, not no work done and not no
 * proof possible: a later search must not use an incomplete graph, and `work` counts the units charged
 * either way.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first registration on repeated loads.
  if (['xyChain', 'forcingChain', 'forcingChainLong', 'nishio', 'nishioDeep'].some(function (id) {
    return SG.techniques.has(id);
  })) return;

  // R9: the short window of forcingChain is 1..C links (C is `SG.chainSearch.SHORT_MAX`, read at every call,
  // initially 4, selected by MS07c: 36 of 36 Nightmare requests exact against 24 of 36 for 6) and
  // forcingChainLong takes C + 1 up to the old ceiling of 12.
  const INITIAL_SHORT_MAX = 4;
  const LONG_MAX_CHAIN_LENGTH = 12;

  // R15: an XY-chain has at most 12 edges, which the caller's maxChainLength can only narrow. Its edges
  // alternate and it starts and ends with a strong edge, so it has an odd number of edges: at most 11 occur.
  const XY_MAX_CHAIN_LENGTH = 12;

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

  // The explicit edge filters of the shared graph search (difficulty v3, MS12). `general` is the graph of the
  // header with its three proofs. `restricted` (the XY-chain) keeps only the strong edges of a bivalue cell
  // (`unitStrong`: false, no conjugate pair of a unit), only the weak edges between the same digit of two
  // distinct cells (`cellWeak`: false, none between two candidates of one cell), only an `endpoints` proof
  // whose two ends are the same digit (`sameDigitEnds`), and no comparison of the two polarities of a node
  // (`polarityProofs`: false, so no contradiction and no forced placement).
  const EDGE_FILTERS = Object.freeze({
    general: Object.freeze({ unitStrong: true, cellWeak: true, sameDigitEnds: false, polarityProofs: true }),
    restricted: Object.freeze({
      unitStrong: false, cellWeak: false, sameDigitEnds: true, polarityProofs: false
    })
  });

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

  // The edge mode of a forcing seam call: absent is 'general'; anything but the two modes is refused.
  function edgeFilters(seam, value) {
    if (value === undefined) return EDGE_FILTERS.general;
    if (typeof value !== 'string' || !Object.prototype.hasOwnProperty.call(EDGE_FILTERS, value)) {
      throw invalidOption(seam, 'edges', 'must be "general" or "restricted"');
    }
    return EDGE_FILTERS[value];
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
  // `sTo`, compressed rows) in a fixed order: cell links by cell, then unit links by unit (the latter only
  // with the `unitStrong` filter).
  function buildStrongLinks(model, state, completeUnits, s, unitStrong) {
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

    for (let u = 0; unitStrong && u < model.units.length; u++) {
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
  // returns how many. The other candidates of its own cell only count with the `cellWeak` filter.
  function collectWeak(r, node, buf) {
    const digits = r.digits;
    const cell = (node / digits) | 0;
    const d0 = node - cell * digits;
    const bit = 1 << d0;
    const cand = r.cand;
    const val = r.val;
    let count = 0;
    let others = r.edges.cellWeak ? cand[cell] & ~bit : 0;
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
  // polarities of one node in the same search are a contradiction of the start assumption (only with the
  // `polarityProofs` filter). With `sameDigitEnds` the only proof is "s is false, t is true" with t the same
  // digit as s in a higher cell (the lower of the two ends starts the search, as in the general mode).
  function visit(r, next, from, nd) {
    const s = r.s;
    if (s.stamp[next] === r.stampId) return false;
    s.stamp[next] = r.stampId;
    s.parent[next] = from;
    s.dist[next] = nd;
    if (r.edges.polarityProofs && s.stamp[next ^ 1] === r.stampId) {
      return record(r, r.startTruth === 1 ? KIND_CONTRADICTION : KIND_FORCED, next, nd, null);
    }
    const node = next >> 1;
    if ((next & 1) === 1) {
      // Starting from "false", every true literal t gives "start or t". Pairs are looked at from their
      // lower node only: the search from the other end meets the same pair at the same length.
      if (r.startTruth === 0 && node > r.startNode &&
          (!r.edges.sameDigitEnds || (node - r.startNode) % r.digits === 0)) {
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

  // The Finding of a restricted (XY-chain) proof: one chain, the digit of both ends, the distinct cells of
  // the chain and every candidate of that digit that sees both ends, ascending; all arrays are new.
  function buildRestrictedFinding(model, best, id) {
    const digits = model.digits;
    const chain = pathData(digits, best.path);
    const cells = [];
    chain.forEach(function (step) {
      if (cells.indexOf(step[0]) === -1) cells.push(step[0]);
    });
    cells.sort(function (a, b) { return a - b; });
    const eliminations = best.eliminated.slice().sort(function (a, b) { return a - b; }).map(function (node) {
      const cell = (node / digits) | 0;
      return [cell, node - cell * digits + 1];
    });
    return {
      technique: id,
      cells: cells,
      placements: [],
      eliminations: eliminations,
      i18nKey: 'technique.' + id + '.step',
      i18nArgs: { digit: chain[0][1], kind: KIND_ENDPOINTS, length: best.length, chains: [chain] }
    };
  }

  function findingOf(model, r, id) {
    return r.edges.sameDigitEnds ? buildRestrictedFinding(model, r.best, id)
      : buildChainFinding(model, r.best, id);
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
    buildStrongLinks(model, state, ctx.completeUnits, s, r.edges.unitStrong);
    r.s = s;

    const digits = r.digits;
    // A start that is "true" can only prove a contradiction, which the restricted edges do not search for.
    const lastTruth = r.edges.polarityProofs ? 1 : 0;
    for (let node = 0; node < s.nodes; node++) {
      const cell = (node / digits) | 0;
      if (r.val[cell] !== 0 || (r.cand[cell] & (1 << (node - cell * digits))) === 0) continue;
      for (let truth = 0; truth <= lastTruth; truth++) {
        if (truth === 0 && s.sStart[node + 1] === s.sStart[node]) continue;
        const limit = Math.min(maxLength, r.bestLength - 1);
        if (limit < 1) return findingOf(model, r, spec.id);
        ctx.check();
        r.checkedAt = r.work;
        search(r, node, truth, limit);
        if (r.capped) return null;
        // The minimum can only fall from here, so a proof below the window is the answer: nothing.
        if (r.best !== null && r.bestLength < spec.min) return null;
      }
    }
    return r.best === null ? null : findingOf(model, r, spec.id);
  }

  // The search of a spec { id, min, max, limit, edges? }: the seam checks one from its options, the
  // registered finders build theirs with their old defaults (the general edges unless they ask for others).
  function forcingWith(model, state, ctx, spec) {
    const r = {
      model: model,
      s: null,
      n: model.cellCount,
      digits: model.digits,
      cand: state.candidates,
      val: state.value,
      peers: model.peers,
      edges: spec.edges === undefined ? EDGE_FILTERS.general : spec.edges,
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
    const spec = seamOptions('forcing', opts, 'minLength', 'maxLength', SEAM_DEFAULT_MAX_CHAIN_LENGTH);
    spec.edges = edgeFilters('forcing', opts.edges);
    return forcingWith(model, state, ctx, spec);
  }

  // xyChain: the shortest restricted proof when it has up to 12 edges, R10's work limit of a new finder. The
  // caller's maxChainLength can only narrow the range of edges.
  function findXyChain(model, state, ctx) {
    return forcingWith(model, state, ctx, {
      id: 'xyChain',
      min: 1,
      max: Math.min(XY_MAX_CHAIN_LENGTH, callerMax(ctx, 'maxChainLength', XY_MAX_CHAIN_LENGTH)),
      limit: NEW_FINDER_WORK_LIMIT,
      edges: EDGE_FILTERS.restricted
    });
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

  // The canonical grouped graph (MS13a, R16; see the header). R10's limits of its construction: the
  // additional (multi-cell) nodes and the tested combinations of one call. The fourth argument of `build`
  // replaces either.
  const GROUP_NODE_LIMIT = 4096;
  const GRAPH_WORK_LIMIT = 50000;

  // Thrown through the phases of a graph build whose number of additional nodes would pass the quota.
  const GROUP_CAP = Object.freeze({ capHit: 'nodes' });

  const graphGeometries = new WeakMap();

  function ascending(a, b) {
    return a - b;
  }

  // What a model fixes once, whatever the state: the peer matrix (n * n bytes) and every pair of a unit of
  // kind 'box' or 'region' and a unit of kind 'row' or 'col' that share at least two cells, with the shared
  // cells, ascending. Whether both units are complete is asked of `ctx` per call.
  function graphGeometryOf(model) {
    let geometry = graphGeometries.get(model);
    if (geometry !== undefined) return geometry;
    const n = model.cellCount;
    const peerMatrix = new Uint8Array(n * n);
    for (let c = 0; c < n; c++) {
      const ps = model.peers[c];
      for (let i = 0; i < ps.length; i++) peerMatrix[c * n + ps[i]] = 1;
    }
    const unitCount = model.units.length;
    const role = new Uint8Array(unitCount); // 1: row or col, 2: box or region
    for (let u = 0; u < unitCount; u++) {
      const meta = model.unitMeta[u];
      const kind = meta === undefined || meta === null ? '' : meta.kind;
      role[u] = kind === 'row' || kind === 'col' ? 1 : kind === 'box' || kind === 'region' ? 2 : 0;
    }
    const pairs = [];
    for (let b = 0; b < unitCount; b++) {
      if (role[b] !== 2) continue;
      const sharedBy = new Map();
      const cells = model.units[b];
      for (let i = 0; i < cells.length; i++) {
        const us = model.cellUnits[cells[i]];
        for (let k = 0; k < us.length; k++) {
          if (role[us[k]] !== 1) continue;
          const shared = sharedBy.get(us[k]);
          if (shared === undefined) sharedBy.set(us[k], [cells[i]]);
          else shared.push(cells[i]);
        }
      }
      Array.from(sharedBy.keys()).sort(ascending).forEach(function (line) {
        const shared = sharedBy.get(line);
        if (shared.length >= 2) pairs.push({ box: b, line: line, cells: shared.sort(ascending) });
      });
    }
    geometry = { peerMatrix: peerMatrix, pairs: pairs };
    graphGeometries.set(model, geometry);
    return geometry;
  }

  // The key order of the nodes: the digit, then the cells element by element, a shorter prefix first.
  function compareNodes(a, b) {
    if (a.digit !== b.digit) return a.digit - b.digit;
    const shorter = Math.min(a.cells.length, b.cells.length);
    for (let i = 0; i < shorter; i++) {
      if (a.cells[i] !== b.cells[i]) return a.cells[i] - b.cells[i];
    }
    return a.cells.length - b.cells.length;
  }

  function graphInvalid(key, reason) {
    const err = new SG.errors.GenerationError('solver.invalidOption', { option: 'chainGraph.build.' + key });
    err.message = 'solver.invalidOption: chainGraph.build ' + key + ' ' + reason;
    return err;
  }

  // The limits of a build call: the defaults, or the finite numbers of at least 0 (floored) of `options`.
  function graphLimits(options) {
    const limits = { groups: GROUP_NODE_LIMIT, work: GRAPH_WORK_LIMIT };
    if (options === undefined) return limits;
    if (options === null || typeof options !== 'object') throw graphInvalid('options', 'must be an object');
    [['groupLimit', 'groups'], ['workLimit', 'work']].forEach(function (pair) {
      const value = options[pair[0]];
      if (value === undefined) return;
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw graphInvalid(pair[0], 'must be a number of at least 0');
      }
      limits[pair[1]] = Math.floor(value);
    });
    return limits;
  }

  // One tested combination: refused once the limit is spent, and the parent budget is checked before the unit
  // that would carry the gap since the last charged check (the entry included) over 256 units.
  function chargeGraph(run) {
    if (run.work >= run.limit) throw WORK_CAP;
    if (run.work + 1 - run.checkedAt > WORK_CHECK_UNITS) {
      run.ctx.check();
      run.checkedAt = run.work;
    }
    run.work++;
  }

  // One step of an uncharged scan of this call (a cell of the state, of an intersection, of a complete unit):
  // the parent budget is checked at every 256th step, whatever the charged work is, so zero charge is not
  // zero cost.
  function tickGraph(run) {
    if (++run.ticks % WORK_CHECK_UNITS === 0) run.ctx.check();
  }

  function linkNodes(lists, a, b) {
    lists[a].push(b);
    lists[b].push(a);
  }

  // Whether the sorted cell lists have no cell in common.
  function disjointCells(a, b) {
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) return false;
      if (a[i] < b[j]) i++;
      else j++;
    }
    return true;
  }

  // Whether every cell of `a` sees every cell of `b`: all cross pairs, not one convenient pair.
  function seeEachOther(peerMatrix, n, a, b) {
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b.length; j++) {
        if (peerMatrix[a[i] * n + b[j]] === 0) return false;
      }
    }
    return true;
  }

  function allIn(model, unit, cells) {
    for (let i = 0; i < cells.length; i++) {
      const us = model.cellUnits[cells[i]];
      let found = false;
      for (let k = 0; k < us.length && !found; k++) found = us[k] === unit;
      if (!found) return false;
    }
    return true;
  }

  // Whether the disjoint nodes x and y (of one digit, all cells open candidates) are exactly all the open
  // occurrences of that digit in one complete unit where it is not placed: the occurrences are counted per
  // unit, so equal counts and both nodes inside the unit leave no other occurrence.
  function coverUnit(model, complete, occ, placed, digits, x, y) {
    const total = x.cells.length + y.cells.length;
    const d0 = x.digit - 1;
    const us = model.cellUnits[x.cells[0]];
    for (let k = 0; k < us.length; k++) {
      const u = us[k];
      if (complete[u] !== 1 || occ[u * digits + d0] !== total || (placed[u] & (1 << d0)) !== 0) continue;
      if (allIn(model, u, x.cells) && allIn(model, u, y.cells)) return true;
    }
    return false;
  }

  // The graph of `state` or one of the three exceptions of `buildGraph` (the two caps and a spent budget).
  function constructGraph(model, state, ctx, groupLimit, run) {
    ctx.check();
    const n = model.cellCount;
    const digits = model.digits;
    const cand = state.candidates;
    const val = state.value;
    const complete = ctx.completeUnits;
    const geometry = graphGeometryOf(model);
    ctx.check();
    let i;
    let c;

    // The singletons: every open candidate, by cell and digit; runs[2k], runs[2k + 1] are the first node and
    // the number of candidates of the k-th open cell that has at least two.
    const nodes = [];
    const runs = [];
    for (c = 0; c < n; c++) {
      tickGraph(run);
      if (val[c] !== 0) continue;
      const first = nodes.length;
      let rest = cand[c];
      while (rest !== 0) {
        const low = rest & -rest;
        rest ^= low;
        nodes.push({ cells: [c], digit: 32 - Math.clz32(low) });
      }
      if (nodes.length - first >= 2) runs.push(first, nodes.length - first);
    }

    // The groups: the open cells of a box-line intersection that hold a digit, when at least two do. The
    // quota of distinct groups is enforced as they are collected; a duplicate spends its work and no slot.
    const collected = new Map();
    for (let p = 0; p < geometry.pairs.length; p++) {
      const pair = geometry.pairs[p];
      if (complete[pair.box] !== 1 || complete[pair.line] !== 1) continue;
      const shared = pair.cells;
      let once = 0;
      let twice = 0;
      for (i = 0; i < shared.length; i++) {
        tickGraph(run);
        c = shared[i];
        if (val[c] !== 0) continue;
        twice |= once & cand[c];
        once |= cand[c];
      }
      while (twice !== 0) {
        const bit = twice & -twice;
        twice ^= bit;
        chargeGraph(run);
        const members = [];
        for (i = 0; i < shared.length; i++) {
          c = shared[i];
          if (val[c] === 0 && (cand[c] & bit) !== 0) members.push(c);
        }
        const key = bit + ':' + members.join(',');
        if (collected.has(key)) continue;
        if (collected.size >= groupLimit) throw GROUP_CAP;
        collected.set(key, { cells: members, digit: 32 - Math.clz32(bit) });
      }
    }
    Array.from(collected.values()).sort(compareNodes).forEach(function (group) { nodes.push(group); });

    const byDigit = [];
    for (i = 0; i <= digits; i++) byDigit.push([]);
    for (i = 0; i < nodes.length; i++) byDigit[nodes[i].digit].push(i);

    // Per complete unit: the digits already placed in it and the number of open occurrences of each digit.
    const unitCount = model.units.length;
    const occ = new Uint8Array(unitCount * digits);
    const placed = new Int32Array(unitCount);
    for (let u = 0; u < unitCount; u++) {
      if (complete[u] !== 1) continue;
      const cells = model.units[u];
      for (i = 0; i < cells.length; i++) {
        tickGraph(run);
        c = cells[i];
        if (val[c] !== 0) {
          placed[u] |= 1 << (val[c] - 1);
          continue;
        }
        let rest = cand[c];
        while (rest !== 0) {
          const low = rest & -rest;
          rest ^= low;
          occ[u * digits + 31 - Math.clz32(low)]++;
        }
      }
    }

    const weak = nodes.map(function () { return []; });
    const strong = nodes.map(function () { return []; });
    for (let k = 0; k < runs.length; k += 2) {
      const first = runs[k];
      const count = runs[k + 1];
      for (let a = 0; a < count; a++) {
        for (let b = a + 1; b < count; b++) {
          chargeGraph(run);
          linkNodes(weak, first + a, first + b);
          if (count === 2) linkNodes(strong, first + a, first + b);
        }
      }
    }
    const peerMatrix = geometry.peerMatrix;
    for (let d = 1; d <= digits; d++) {
      const list = byDigit[d];
      for (let a = 0; a < list.length; a++) {
        const x = nodes[list[a]];
        const rowStart = x.cells[0] * n;
        for (let b = a + 1; b < list.length; b++) {
          chargeGraph(run);
          const y = nodes[list[b]];
          if (peerMatrix[rowStart + y.cells[0]] === 0) continue;
          if (!disjointCells(x.cells, y.cells)) continue;
          if (seeEachOther(peerMatrix, n, x.cells, y.cells)) linkNodes(weak, list[a], list[b]);
          if (coverUnit(model, complete, occ, placed, digits, x, y)) linkNodes(strong, list[a], list[b]);
        }
      }
    }
    for (i = 0; i < nodes.length; i++) {
      weak[i].sort(ascending);
      strong[i].sort(ascending);
    }
    return { nodes: nodes, weak: weak, strong: strong };
  }

  function buildGraph(model, state, ctx, options) {
    const limits = graphLimits(options);
    const run = { ctx: ctx, limit: limits.work, work: 0, checkedAt: 0, ticks: 0 };
    try {
      const built = constructGraph(model, state, ctx, limits.groups, run);
      return { nodes: built.nodes, weak: built.weak, strong: built.strong, complete: true, work: run.work,
        capHit: null };
    } catch (err) {
      let capHit = null;
      if (err === WORK_CAP) capHit = 'work';
      else if (err === GROUP_CAP) capHit = 'nodes';
      else if (!(err && err.code === 'budget.exceeded')) throw err;
      return { nodes: [], weak: [], strong: [], complete: false, work: run.work, capHit: capHit };
    }
  }

  SG.chainGraph = {
    build: buildGraph,
    LIMITS: Object.freeze({ groups: GROUP_NODE_LIMIT, work: GRAPH_WORK_LIMIT })
  };

  SG.chainSearch = { forcing: chainForcing, nishio: chainNishio, SHORT_MAX: INITIAL_SHORT_MAX };

  SG.techniques.register({
    id: 'xyChain',
    group: 'chain',
    baseCost: 82,
    order: 186,
    i18nKey: 'technique.xyChain',
    variantScope: null,
    assumesUniqueness: false,
    find: findXyChain
  });

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
