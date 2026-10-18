/**
 * Difficulty model (design.md sections 6.6 and 6.7, API of section 13.7): the six levels, the specification
 * the hole digger works to for a level, and the rating of a finished puzzle.
 *
 * Score and level
 * ---------------
 *   rawScore = sum over techniques of cost(t) x (uses of t + FIRST_USE_BONUS)   // first use costs 1.5x
 *              + (cells empty at the start) x EMPTY_CELL_BONUS
 *   score    = max(rawScore, floor of the hardest technique's group)            // see "Technique floor"
 *   level    = the level whose band [min, max) contains the score
 *
 * Cost overrides (decision, please keep)
 *   The cost of a technique is declared in its own tech-*.js file (`baseCost`), which another task owns.
 *   All calibration therefore lives HERE: `COSTS[id]` replaces the registered cost, a technique without an
 *   entry keeps `baseCost`. The logical solver is deliberately not told about the table; it reports
 *   `techniqueCounts` (also with collectSteps: false), and `classify` re-scores from those counts. The empty
 *   cell count is recovered exactly from the solver's own score, so `classify(report, model)` needs nothing
 *   but the report. Consequence: `report.score` of the solver is the UNCALIBRATED design score; always use
 *   `SG.difficulty.classify(...).score` (or `rate`) as the score of a puzzle.
 *
 * Technique floor
 *   A puzzle that needs a technique of group G is at least as hard as the easiest puzzle of the level that
 *   introduces G, however few steps it takes. Its score is raised to that level's band minimum. This keeps
 *   the two conditions of design.md section 6.6 (score inside the band, hardest technique inside the allowed
 *   groups) from contradicting each other, so invariant I5 holds by construction: a rating of level L always
 *   has score in [min, max) of L and a hardest technique from the groups of L. The unfloored value stays
 *   available as `rawScore`.
 *
 * Bands
 *   A band is half open, [min, max), and `max` of a level is `min` of the next one (the top level has no
 *   upper bound), so every score belongs to exactly one level. The numbers are for classic9; other variants
 *   multiply bands and clue counts by cellCount / 81. Section "Calibration log" below records every change
 *   from the starting values of design.md.
 *
 * Clue floor per variant (invariant I6)
 *   `spec(level, model).minClues` is the one number every check of invariant I6 ("a puzzle has at least
 *   `minClues` givens") uses, whatever the variant. By default it is the classic9 floor of the level times
 *   cellCount / 81 (at least 1). A variant whose board does not follow that proportion declares its own in
 *   its definition (`SG.variants.register`), with up to two optional fields:
 *     clueFloorScale  an object { level: factor }: the derived floor of that level is multiplied by the
 *                     factor (a level that is missing has factor 1). This is the calibration knob of the
 *                     hybrid and multi-grid boards (diagonalX, hyper, jigsaw9, samurai, sohei, butterfly,
 *                     flower, greaterThan): their extra rules let the digger stop earlier, and the classic9
 *                     numbers keep it from needing a pair technique, so medium and hard were hit by 1-20 %
 *                     of the dug puzzles (see "Calibration of the other variants" below).
 *     clueFloor       an object { level: clues } with absolute floors (a level that is missing has no floor,
 *                     0), or a function (level, model, derivedFloor) => clues, which can scale the default;
 *                     `derivedFloor` already includes `clueFloorScale`.
 *   Killer: { veryEasy: 40 } (the other levels dig down to a handful of clues).
 *   Only `spec` reads the fields, so a variant that does not declare them is rated and dug exactly as before.
 *   The digger, the pipeline, `tests/soak.js` and the variants test sweep take the floor from `spec`.
 *
 * Calibration of the other variants (task T-7.7; the costs and bands above are those of classic9 and stay)
 *   The hit rate of a variant (share of generated puzzles rated exactly the requested level) was already 95 -
 *   100 % everywhere, because `generate` digs up to 12 puzzles per grid and 8 grids. What differed was how
 *   many it needed: the share of ONE dug puzzle that lands on the level (first sample) was only 1 - 14 % for
 *   medium on the hybrids and the multi-grid boards (hyper 1 %, butterfly 2 %, diagonalX 14 %, the others
 *   8 - 9 %), 13 % for hard and 11 % for expert on greaterThan. A level that needs 12 - 38 digs per puzzle is
 *   slow (hyper medium p95 296 ms against 200 ms) and, with a hit rate per dig of 3 %, misses the level for
 *   5 - 11 % of the puzzles (hyper 89 %, butterfly 95 % of 150). The cause is the clue floor: the classic9
 *   numbers (29 / 25 / 22 clues for medium / hard / expert, scaled by cellCount / 81) stop the guided dig
 *   before the puzzle needs a pair technique, while the dig of these boards ends by itself at 21 - 24 clues
 *   (hybrids) or at 63 - 83 % of the scaled floor of medium (multi-grid). Per-variant `clueFloorScale`,
 *   measured with a one-grid-one-dig probe (150 - 200 puzzles; first-sample hit rate, before -> after):
 *
 *     variant       scale (medium / hard / expert)   medium         hard           expert
 *     diagonalX     0.83 / 0.80 / 0.80  (24/20/17)   14 -> 36 %      68 -> 73 %     90 -> 89 %
 *     hyper         0.83 / 0.80 / 0.80               1 -> 32 %      19 -> 31 %     35 -> 39 %
 *     jigsaw9       0.83 / 0.80 / 0.80               8 -> 50 %      39 -> 49 %     49 -> 51 %
 *     greaterThan   0.83 / 0.80 / 0.80               49 -> 76 %     13 -> 44 %     11 -> 16 %
 *     samurai       0.60 / 0.60 / -                  8 -> 40 %      29 -> 31 %     (not offered)
 *     sohei         0.60 / 0.60 / -                  8 -> 38 %      24 -> 30 %
 *     butterfly     0.60 / 0.60 / -                  2 -> 49 %      22 -> 41 %
 *     flower        0.60 / 0.60 / -  (easy 0.80)     9 -> 49 %      31 -> 36 %
 *
 *   The 9x9 boards keep their floors above the natural stop of the dig (hyper 22, diagonalX 24, jigsaw9 23
 *   clues) on purpose: with no floor at all medium, hard and expert end at about the same number of clues,
 *   and the suites of those variants require the mean clue count to fall with the level (as the table of
 *   design.md section 6.7 has it). The multi-grid boards have no such check and sit below their natural stop
 *   (butterfly 34 of 144 cells, sohei 81 of 288, samurai 109 of 369, flower 42 of 189 clues), so the dig is
 *   bounded by the techniques alone. veryEasy and, but for flower, easy keep the derived floor: the score
 *   band of those levels is so low that the puzzle needs the clues. The classic boards, the mega boards,
 *   killer and the word board are untouched (their puzzles are byte-identical to before): classic9 is the
 *   reference, the others were already at 73 - 98 % of the digs on medium (mega) or have no floor problem
 *   (the rest).
 *   Exact-level rates over 150 puzzles per level (seed 424242), before -> after: butterfly medium 95 -> 100
 *   %, hyper medium 89 -> 100 %, jigsaw9 medium 99 -> 100 % (measured through the pipeline, which draws a
 *   per puzzle; 100 puzzles per level on a second seed, 909090, are 100 % in every cell of every variant);
 *   every other cell was 100 % and stays there. Dug puzzles per medium puzzle: hyper 38 -> 3.2, butterfly
 *   31 -> 2.1, sohei 21 -> 2.9, samurai 9.5 -> 2.8, flower 9.7 -> 2.0, diagonalX 7.2 -> 2.6; p95 of the
 *   generation time on medium: hyper 296 -> 46 ms, butterfly 807 -> 177 ms, sohei 1585 -> 391 ms, samurai
 *   989 -> 587 ms, flower 800 -> 244 ms.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  /** Difficulty levels, easiest first. Mirrors the list SG.variants validates `difficultySupport` against. */
  const LEVELS = Object.freeze(['veryEasy', 'easy', 'medium', 'hard', 'expert', 'evil']);

  /** Technique groups of the classic ladder; level i may use BASE_GROUPS[0..i]. */
  const BASE_GROUPS = Object.freeze(['basic', 'locked', 'subset', 'fish', 'wing', 'chain']);

  /**
   * Groups that only exist for one variant family (killer cages, greater-than signs). Their techniques are
   * the only way to use those rules at all, so every level may use them; `variantScope` of each technique
   * decides which variant they apply to. Tuning them per level is a task of the variant phase.
   */
  const VARIANT_GROUPS = Object.freeze(['cage', 'ineq']);

  /** Reference size of the bands: classic9. */
  const REFERENCE_CELLS = 81;

  /** Technique cost multiplier of the first use of a technique, and score of one empty cell. */
  const SCORING = { firstUseMultiplier: 1.5, emptyCellBonus: 0.6 };

  /**
   * Cost overrides: score of one application of a technique. An id that is missing here costs its registered
   * `baseCost` (design.md section 6.6). Mutable on purpose, so that tooling (tests/soak.js) can try values.
   *
   * CALIBRATION LOG (task T-2.10). Design value -> calibrated value, measured on classic9 with
   * `node tests/soak.js` and the throwaway scripts that fed it (uncapped dig samples, about 2700 puzzles).
   *
   *   technique          design -> now      technique          design -> now
   *   nakedSingle           1 ->    1       xWing                32 ->  190
   *   hiddenSingleBox       2 -> 1.25       simpleColouring      36 ->  215
   *   hiddenSingleLine      3 ->  1.5       swordfish            42 ->  250
   *   pointing              7 ->    7       jellyfish            56 ->  335
   *   boxLine               7 ->    8       xyWing               48 ->  480
   *   nakedPair             9 ->   63       xyzWing              54 ->  540
   *   hiddenPair           11 ->   77       wWing                60 ->  600
   *   nakedTriple          15 ->  105       uniqueRectangle      66 ->  660
   *   hiddenTriple         18 ->  126       forcingChain         90 ->  720
   *   nakedQuad            24 ->  168       nishio              140 -> 1120
   *   hiddenQuad           24 ->  182
   *
   * Why the groups were scaled (subset x7, fish x6, wing x10, chain x8; locked unchanged).
   *   The 40 or so singles of any puzzle add up to about 90 points and drown a handful of technique steps, so
   *   with the design costs the groups overlap. Median score by hardest group, design -> calibrated, next to
   *   the band the group belongs to:
   *     locked  121 -> 106   band [72, 180)      subset  146 -> 223   band [180, 400)
   *     fish    203 -> 588   band [400, 800)     wing    279 -> 1418  band [800, 1500)
   *     chain   736 -> 4968  band [1500, inf)
   *   Share of puzzles whose score is inside the band of their hardest group, design -> calibrated:
   *     subset 6% -> 94%, fish 0% -> 80%, wing 0% -> 55%, chain 10% -> 95%. (Wing stays the weakest: its own
   *     counts vary widely, and a long wing solution is correctly rated evil.)
   *   Seen from the generator (200 puzzles per level), the share of puzzles whose raw score is inside the
   *   band of the requested level went from medium 5%, hard 0%, expert 0%, evil 9% to 98%, 100%, 100%, 96%.
   *   The hit rate was 100% both times, because of the technique floor; before the calibration that was only
   *   because 91-100% of the puzzles of those levels had their score raised TO the band minimum (nearly all
   *   medium puzzles scored exactly 180, all hard 400, ...), a score that says nothing. Now the floor is
   *   binding for 2% (medium), 0% (hard), 0% (expert) and 5% (evil) of the puzzles.
   *   The factors were found by a grid search over the multipliers of the design costs for the share inside
   *   the band; subset went from x5 (23% of medium puzzles floor-bound) to x7 (2%).
   *
   * Why the singles were pulled together (design 1 / 2 / 3, now 1 / 1.25 / 1.5).
   *   Monotonicity (removing a clue must not lower the score) fails when a naked single turns into a hidden
   *   single elsewhere and the difference in cost outweighs the extra empty cell. With 1 / 2 / 3 the score
   *   fell in 1.05% of 3508 single-clue removals (7 of 2848 puzzles of 30 clues or more); with 1 / 1.25 / 1.5
   *   in 0 of 2848 above 30 clues. Below 30 clues a count based score is path dependent whatever the costs
   *   (a different chain of deductions uses one pointing more or less): 0.26% of all removals still
   *   lower it, never the level. See difficulty.test.js.
   *
   * Other decisions.
   *   Ties of the design are broken: boxLine 8 > pointing 7 and hiddenQuad 182 > nakedQuad 168, because the
   *   second of each pair is the harder one for a person (the registry breaks the tie by `order` anyway).
   *   The cost of a chain does not depend on its length. That keeps the rating independent of `collectSteps`
   *   (the digger solves with it off), and a chain puzzle is at least 1500 whatever its chains look like.
   *   Jellyfish was never used on the solving path of any of 3000 natural classic9 puzzles, so its cost only
   *   follows the fish factor and is not backed by data; it is 335 so that the groups stay in cost order
   *   (fish 190-335, wing 480-660).
   * @type {Object<string, number>}
   */
  const COSTS = {
    nakedSingle: 1,
    hiddenSingleBox: 1.25,
    hiddenSingleLine: 1.5,
    pointing: 7,
    boxLine: 8,
    nakedPair: 63,
    hiddenPair: 77,
    nakedTriple: 105,
    hiddenTriple: 126,
    nakedQuad: 168,
    hiddenQuad: 182,
    xWing: 190,
    simpleColouring: 215,
    swordfish: 250,
    jellyfish: 335,
    xyWing: 480,
    xyzWing: 540,
    wWing: 600,
    uniqueRectangle: 660,
    forcingChain: 720,
    nishio: 1120
  };

  /**
   * Bands and clue ranges of classic9, easiest first. `min` is the inclusive lower score bound; the upper
   * bound is the `min` of the next level. The clue ranges are those of design.md section 6.7 (`minClues` is a
   * floor for the digger, `maxClues` is informative only), and so are the band edges except the veryEasy/easy
   * one, calibrated from 80 to 72: singles-only puzzles of 40 clues (veryEasy) score 64.5-69 and those of 34
   * clues (easy) 74-92 over 2000 puzzles each, so 80 rated nearly every easy puzzle veryEasy (with the design
   * singles costs the generator needed 5.5 samples per easy puzzle instead of 1).
   */
  const TABLE = [
    { level: 'veryEasy', min: 0, minClues: 40, maxClues: 50, minCluesPerUnit: 2, extraPasses: 1 },
    { level: 'easy', min: 72, minClues: 34, maxClues: 40, minCluesPerUnit: 2, extraPasses: 1 },
    { level: 'medium', min: 180, minClues: 29, maxClues: 34, minCluesPerUnit: 1, extraPasses: 1 },
    { level: 'hard', min: 400, minClues: 25, maxClues: 30, minCluesPerUnit: 1, extraPasses: 1 },
    { level: 'expert', min: 800, minClues: 22, maxClues: 27, minCluesPerUnit: 0, extraPasses: 1 },
    { level: 'evil', min: 1500, minClues: 17, maxClues: 24, minCluesPerUnit: 0, extraPasses: 1 }
  ];

  const DEFAULT_SYMMETRY = 'rotational180';

  function fail(code, args, text) {
    const err = new SG.errors.GenerationError(code, args);
    err.message = code + ': ' + text;
    return err;
  }

  function levelIndex(level) {
    const i = LEVELS.indexOf(level);
    if (i === -1) {
      throw fail('difficulty.unknownLevel', { level: String(level) },
        '"' + String(level) + '" is not a difficulty level (' + LEVELS.join(', ') + ')');
    }
    return i;
  }

  function scaleOf(model) {
    return model && model.cellCount > 0 ? model.cellCount / REFERENCE_CELLS : 1;
  }

  /** The registered definition of the model's variant, or null (a test board, or no model at all). */
  function variantOf(model) {
    if (!model || !SG.variants || !SG.variants.has(model.variantId)) return null;
    return SG.variants.get(model.variantId);
  }

  /**
   * Clue range of a level on one board: the classic9 numbers scaled by cellCount / 81, multiplied by the
   * variant's `clueFloorScale` for the level, then replaced by what the variant declares as `clueFloor` (see
   * "Clue floor per variant" in the file header).
   * @returns {{minClues: number, maxClues: number}}
   */
  function clueRange(level, row, model, scale) {
    const def = variantOf(model);
    const factors = def === null ? undefined : def.clueFloorScale;
    const factor = factors && Object.prototype.hasOwnProperty.call(factors, level) ? factors[level] : 1;
    let standard = Math.max(1, Math.floor(row.minClues * scale));
    // Rounded to 6 places first, so that 25 * 0.8 is 20 and not 19.999999999999996.
    if (factor !== 1) standard = Math.max(1, Math.floor(Math.round(standard * factor * 1e6) / 1e6));
    let minClues = standard;
    const declared = def === null ? undefined : def.clueFloor;
    if (typeof declared === 'function') {
      const value = Math.floor(declared(level, model, standard));
      if (Number.isFinite(value) && value >= 0) minClues = value;
    } else if (declared !== undefined && declared !== null && typeof declared === 'object') {
      const value = Object.prototype.hasOwnProperty.call(declared, level) ? Math.floor(declared[level]) : 0;
      minClues = Number.isFinite(value) && value >= 0 ? value : 0;
    }
    return {
      minClues: minClues,
      maxClues: Math.max(minClues, Math.max(1, Math.round(row.maxClues * scale)))
    };
  }

  /** Lower score bound of level index `i` for a board of the given scale. */
  function bandMin(i, scale) {
    return TABLE[i].min * scale;
  }

  /** Exclusive upper score bound of level index `i`. */
  function bandMax(i, scale) {
    return i + 1 < TABLE.length ? TABLE[i + 1].min * scale : Infinity;
  }

  /**
   * Is the level on the variant's `difficultySupport` list? Models of variants that are not registered (test
   * boards) support every level.
   * @param {string} level
   * @param {PuzzleModel} model
   * @returns {boolean}
   */
  function isSupported(level, model) {
    levelIndex(level);
    if (!model || !SG.variants || !SG.variants.has(model.variantId)) return true;
    return SG.variants.get(model.variantId).difficultySupport.indexOf(level) !== -1;
  }

  /**
   * Cost of one application of a technique: the override in `COSTS`, else the registered `baseCost`.
   * @param {string} id  A registered technique id.
   * @returns {number}
   */
  function costOf(id) {
    if (Object.prototype.hasOwnProperty.call(COSTS, id)) return COSTS[id];
    return SG.techniques.get(id).baseCost;
  }

  /**
   * What a technique adds to the score of a puzzle that applies it `count` times: the first use weighs
   * `SCORING.firstUseMultiplier` costs, every further use one cost (the same sum `classify` takes).
   * @param {string} id  A registered technique id.
   * @param {number} count  Applications of the technique.
   * @returns {number}
   */
  function techniqueScore(id, count) {
    return count > 0 ? costOf(id) * (count - 1 + SCORING.firstUseMultiplier) : 0;
  }

  /** Groups that level index `i` may use on this model's variant. */
  function groupsFor(i) {
    return BASE_GROUPS.slice(0, i + 1).concat(VARIANT_GROUPS);
  }

  /**
   * @typedef {Object} DifficultySpec
   * @property {string} level
   * @property {number} min              Lower score bound (inclusive), scaled to the board.
   * @property {number} max              Upper score bound (exclusive); Infinity for 'evil'.
   * @property {number} minClues         The digger never goes below this many givens (invariant I6): the
   *           classic9 floor scaled by cellCount / 81, unless the variant declares its own `clueFloor` (file
   *           header, "Clue floor per variant"); 0 is possible for such a variant.
   * @property {number} maxClues         Upper end of the clue range (a puzzle with more is "too easy").
   * @property {number} minCluesPerUnit  Every unit keeps at least this many givens while digging.
   * @property {string[]} allowedGroups  Technique groups the puzzle may need.
   * @property {string[]} allowedTechniques  Registered ids of those groups that apply to the variant, in
   *           loop order. The oracle uses them with `assumeUniqueness: false`, so a technique that relies on
   *           uniqueness (uniqueRectangle) is listed but never used there.
   * @property {string} symmetryDefault
   * @property {number} extraPasses      Kept for the contract of design.md section 13.7 and not used by the
   *           digger: its guided stage runs until nothing can be removed, so there is no pass to add.
   * @property {string} oracle           'techniques' (bounded logical oracle) or 'unique' (DFS, for 'evil').
   * @property {number} scale            cellCount / 81.
   */

  /**
   * The specification the hole digger works to for one level on one board: score band, clue range and the
   * technique set, scaled by `model.cellCount / 81` (design.md section 6.7) and the variant's own clue floor
   * (`clueFloor` of its definition).
   * @param {string} level  One of `SG.difficulty.LEVELS`.
   * @param {PuzzleModel} model
   * @returns {DifficultySpec}
   * @throws {SG.errors.GenerationError} 'difficulty.unknownLevel', or 'difficulty.unsupportedLevel' when the
   *         variant's `difficultySupport` does not list the level (for example 'evil' on classic4).
   */
  function spec(level, model) {
    const i = levelIndex(level);
    if (!isSupported(level, model)) {
      throw fail('difficulty.unsupportedLevel', { level: level, variantId: model.variantId },
        'variant "' + model.variantId + '" does not support the level "' + level + '"');
    }
    const row = TABLE[i];
    const scale = scaleOf(model);
    const groups = groupsFor(i);
    const variantId = model ? model.variantId : null;
    const allowed = SG.techniques.list().filter(function (tech) {
      return groups.indexOf(tech.group) !== -1 &&
        (variantId === null || SG.techniques.appliesTo(tech, variantId));
    }).map(function (tech) { return tech.id; });
    const digits = model && model.digits ? model.digits : 9;
    const clues = clueRange(level, row, model, scale);
    return {
      level: level,
      min: bandMin(i, scale),
      max: bandMax(i, scale),
      minClues: clues.minClues,
      maxClues: clues.maxClues,
      minCluesPerUnit: Math.floor(row.minCluesPerUnit * digits / 9),
      allowedGroups: groups,
      allowedTechniques: allowed,
      symmetryDefault: DEFAULT_SYMMETRY,
      extraPasses: row.extraPasses,
      oracle: level === 'evil' ? 'unique' : 'techniques',
      scale: scale
    };
  }

  /** Level index of a score on a board of the given scale. */
  function levelOfScore(score, scale) {
    let found = 0;
    for (let i = 1; i < TABLE.length; i++) {
      if (score >= bandMin(i, scale)) found = i;
    }
    return found;
  }

  /** Position of a technique's group on the ladder (0 for groups that exist for one variant family only). */
  function tierOf(def) {
    const t = BASE_GROUPS.indexOf(def.group);
    return t === -1 ? 0 : t;
  }

  /**
   * Re-scores a solver report with the calibrated costs.
   * @returns {{technique: number, empties: number, hardest: ?Object}}
   */
  function scoreParts(report) {
    const counts = report.techniqueCounts || {};
    const solverScoring = SG.logicalSolver.SCORING;
    let technique = 0;
    let uncalibrated = 0;
    let hardest = null;
    Object.keys(counts).forEach(function (id) {
      const def = SG.techniques.get(id);
      const n = counts[id];
      const cost = costOf(id);
      technique += cost * (n - 1 + SCORING.firstUseMultiplier);
      uncalibrated += def.baseCost * (n - 1 + solverScoring.firstUseMultiplier);
      const tier = tierOf(def);
      if (hardest === null || tier > hardest.tier || (tier === hardest.tier &&
          (cost > hardest.cost || (cost === hardest.cost && def.order > hardest.order)))) {
        hardest = { id: id, group: def.group, tier: tier, cost: cost, order: def.order };
      }
    });
    // The solver scored the empty cells itself; what is left of its score after its technique part is theirs.
    const empties = Math.max(0, Math.round((report.score - uncalibrated) / solverScoring.emptyCellBonus));
    return { technique: technique, empties: empties, hardest: hardest };
  }

  /**
   * @typedef {Object} Rating
   * @property {string} level              The level the puzzle belongs to.
   * @property {number} score              Calibrated score, raised to the floor of the hardest technique.
   * @property {number} rawScore           The score before that floor.
   * @property {?string} hardestTechnique  Used technique of the highest group (ties: highest cost, then
   *           latest in the ladder); null when no step was needed.
   * @property {?string} hardestGroup      Group of `hardestTechnique`.
   * @property {number} confidence         0..1, how deep inside its band the score lies (0 = on an edge).
   * @property {boolean} solved            The logical solver finished the grid. False means the puzzle needs
   *           more than every registered technique; it is then rated as the hardest level.
   * @property {number} empties            Cells empty at the start.
   * @property {Object<string, number>} techniqueCounts
   */

  /**
   * Rates the result of `SG.logicalSolver.solve`. Works with `collectSteps` on or off, since only the
   * technique counts are used. Run the solver with every technique and `assumeUniqueness: true` (that is
   * what `rate` does) so that the rating does not depend on a restricted ladder.
   * @param {SolveReport} report
   * @param {PuzzleModel} model  Gives the scale of the bands (cellCount / 81).
   * @returns {Rating}
   */
  function classify(report, model) {
    const scale = scaleOf(model);
    const parts = scoreParts(report);
    const rawScore = parts.technique + parts.empties * SCORING.emptyCellBonus;
    const solved = report.solved === true;
    let floorLevel = parts.hardest === null ? 0 : parts.hardest.tier;
    if (!solved) floorLevel = TABLE.length - 1;
    const score = Math.max(rawScore, bandMin(floorLevel, scale));
    const i = levelOfScore(score, scale);
    const lo = bandMin(i, scale);
    const hi = bandMax(i, scale);

    // Distance to the nearest edge that borders another level, in units of half the band width. The lowest
    // band has no lower edge, and the top band (no upper edge) is measured against its own minimum.
    const width = i === 0 ? hi : hi === Infinity ? lo : hi - lo;
    let confidence = 1;
    if (i > 0) confidence = Math.min(confidence, (score - lo) / (width / 2));
    if (hi !== Infinity) confidence = Math.min(confidence, (hi - score) / (width / 2));
    confidence = Math.max(0, Math.min(1, confidence));

    return {
      level: LEVELS[i],
      score: score,
      rawScore: rawScore,
      hardestTechnique: parts.hardest === null ? null : parts.hardest.id,
      hardestGroup: parts.hardest === null ? null : parts.hardest.group,
      confidence: confidence,
      solved: solved,
      empties: parts.empties,
      techniqueCounts: Object.assign({}, report.techniqueCounts)
    };
  }

  /**
   * Rates a puzzle: solves it with every registered technique (uniqueness assumed, which is right for a
   * finished puzzle) and classifies the report.
   * @param {PuzzleModel} model
   * @param {ArrayLike<number>} givens
   * @param {Object} [options]
   * @param {Object} [options.budget]
   * @param {boolean} [options.collectSteps=false]  Also keep the steps, available as `rating.steps`.
   * @returns {Rating}
   */
  function rate(model, givens, options) {
    const opts = options || {};
    const report = SG.logicalSolver.solve(model, givens, {
      allowedTechniques: null,
      collectSteps: opts.collectSteps === true,
      assumeUniqueness: true,
      budget: opts.budget || null
    });
    const rating = classify(report, model);
    if (opts.collectSteps === true) rating.steps = report.steps;
    return rating;
  }

  SG.difficulty = {
    LEVELS: LEVELS,
    BASE_GROUPS: BASE_GROUPS,
    SCORING: SCORING,
    COSTS: COSTS,
    TABLE: TABLE,
    spec: spec,
    isSupported: isSupported,
    classify: classify,
    rate: rate,
    costOf: costOf,
    techniqueScore: techniqueScore,
    levelIndex: levelIndex
  };
})(typeof self !== 'undefined' ? self : globalThis);
