/**
 * Difficulty model, rating v2 (docs/report-v2/report-detailed.md section 5; design.md sections 6.6 and 6.7;
 * API of section 13.7): the nine levels, the specification the hole digger works to for a level, and the
 * rating of a finished puzzle.
 *
 * Score
 * -----
 * One formula for every variant and every board size. Its only inputs are the number of cells that are
 * empty at the start (E) and how often each technique was applied in the logical solve (n_t):
 *
 *   P     = max { w_t : n_t > 0 }             the weight of the hardest technique used (0: none)
 *   W     = sum over t of w_t * n_t           the work: points x uses
 *   V     = 80 * E / (E + 40)                 the empty cells, bounded by 80 (40 at E = 40)
 *   R     = 0.25 * P * log2(1 + W / P)        the repeated work, logarithmic (0 when P = 0)
 *   score = Math.round(V + P + R)             ONE rounding of the unrounded sum
 *   level = the level whose band [min, max) contains the score
 *
 * The weights `w_t` are the table `WEIGHTS` below; a technique without a weight is an error, never a
 * guessed cost. Nothing else enters the score: not the requested level, not the variant, not the board
 * size, not the clue density. A puzzle on a large board does not become harder through its singles (V is
 * bounded and the work only counts logarithmically), and one expensive step counts in full on any board
 * (through P). The score never decreases when a count, E or the weight of the hardest technique grows; it
 * is NOT monotone under the removal of a clue (the proof changes), so the digger never assumes that.
 *
 * Complete proofs only
 *   A rating is published only for a complete logical proof (`report.solved === true`). Without one the
 *   rating has no level and no score (`level: null`, `score: null`): it is never a hit of the generator and
 *   no score is ever derived from the cells left open.
 *
 * Bands
 *   One table for every variant, not scaled by the board size (`TABLE`): a band is half open, [min, max),
 *   and `max` of a level is `min` of the next one (hell2 has no upper bound), so every score belongs to
 *   exactly one level. There is no technique floor any more: the level is a pure function of the score.
 *
 * Clue floor per variant (invariant I6)
 *   `spec(level, model).minClues` is the one number every check of invariant I6 ("a puzzle has at least
 *   `minClues` givens") uses, whatever the variant. By default it is the classic9 floor of the level
 *   (`TABLE[i].minClues`) times cellCount / 81 (at least 1). A variant whose board does not follow that
 *   proportion declares its own in its definition (`SG.variants.register`), with up to two optional fields:
 *     clueFloorScale  an object { level: factor }: the derived floor of that level is multiplied by the
 *                     factor (a level that is missing has factor 1). The calibration knob of the hybrid and
 *                     multi-grid boards (diagonalX, hyper, jigsaw9, samurai, sohei, butterfly, flower,
 *                     greaterThan). expert takes the factor of hard, hell1/2 that of nightmare.
 *     clueFloor       an object { level: clues } with absolute floors (a level that is missing has no floor,
 *                     0), or a function (level, model, derivedFloor) => clues, which can scale the default;
 *                     `derivedFloor` already includes `clueFloorScale`.
 *   Killer: { veryEasy: 40 } (the other levels dig down to a handful of clues).
 *   Only `spec` reads the fields. The digger, the pipeline, `tests/soak.js` and `tests/qualify.js` take the
 *   floor from `spec`.
 *
 * Calibration
 *   The weights and the band edges are those agreed in docs/report-v2/report-detailed.md (sections 4 and 5):
 *   the shape (peak + logarithmic work + bounded empty cells) was chosen over a square-root sum on a common
 *   corpus of about 8,300 generated puzzles of every variant (cross-size consistency, robustness to the
 *   solver path, stability under clue removal, separation of the technique tiers); the edges keep the
 *   reference puzzles of tests/fixtures/rated.js where they belong (one-wing certificates expert, the
 *   constructed nightmare certificates nightmare, the four famous hardest 9x9 puzzles hell2). The weights are
 *   engineering priors, not human measurements; Killer's ruleOf45 and cageSplit are the first targets of a
 *   human calibration. Which levels each variant offers is measured, not assumed: `tests/qualify.js`
 *   (docs/report-v2/qualification.md).
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};
  const hasOwn = Object.prototype.hasOwnProperty;

  /** Difficulty levels, easiest first. Mirrors the list SG.variants validates `difficultySupport` against. */
  const LEVELS = Object.freeze(['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare',
    'hell1', 'hell2']);

  /**
   * Technique groups of the classic techniques, simplest first. Descriptive only (the help's catalogue, the
   * order of the score table): no group owns a level any more.
   */
  const BASE_GROUPS = Object.freeze(['basic', 'locked', 'subset', 'fish', 'wing', 'chain']);

  /** Groups that only exist for one variant family (Killer cages, Greater-Than signs). */
  const VARIANT_GROUPS = Object.freeze(['cage', 'ineq']);

  /** Version of the rating (weights, bands, formula); exported with every rating. */
  const RATING_VERSION = 2;

  /** Reference size of the clue floors: classic9. The score bands are not scaled. */
  const REFERENCE_CELLS = 81;

  /**
   * Constants of the score (see the file header): the empty-cell term is `emptyCellMax * E / (E +
   * emptyCellHalf)`, the work term `workFactor * P * log2(1 + W / P)`; `peakBound` is the factor of the lower
   * bound `peakBound * w` of the technique part of any puzzle that uses a technique of weight w
   * (R >= 0.25 P because W >= P), which `spec` uses to prune the techniques of a band.
   */
  const SCORING = Object.freeze({ emptyCellMax: 80, emptyCellHalf: 40, workFactor: 0.25, peakBound: 1.25 });

  /**
   * Weight of each technique (docs/report-v2/report-detailed.md section 5.2). The weights replace the
   * registered `baseCost` in the rating only; the solver's order and its own raw score are unchanged. A new
   * technique needs an entry here (`weightOf` throws without one). Not frozen, like the cost table it
   * replaces, so that a test can change a weight for its duration; nothing else writes it.
   * @type {Object<string, number>}
   */
  const WEIGHTS = {
    nakedSingle: 1,
    hiddenSingleBox: 1.25,
    hiddenSingleLine: 1.5,
    pointing: 40,
    boxLine: 50,
    nakedPair: 120,
    hiddenPair: 145,
    nakedTriple: 180,
    hiddenTriple: 220,
    nakedQuad: 260,
    hiddenQuad: 300,
    xWing: 320,
    simpleColouring: 360,
    swordfish: 420,
    jellyfish: 520,
    xyWing: 650,
    xyzWing: 750,
    wWing: 850,
    uniqueRectangle: 900,
    forcingChain: 1100,
    nishio: 1700,
    cageCombo: 40,
    ruleOf45: 260,
    cageSplit: 520,
    ineqChain: 40,
    minMaxForcing: 180
  };

  /**
   * Bands and clue ranges, easiest first. `min` is the inclusive lower score bound; the upper bound is the
   * `min` of the next level (hell2: none). The clue ranges are those of classic9 (`minClues` is a floor
   * for the digger, scaled by cellCount / 81; `maxClues` is informative only); expert has the floors of
   * hard, hell1 and hell2 those of nightmare. The rows are not frozen, like the weights, so that
   * tests/soak.js can try other bands for a calibration run; nothing else writes them.
   */
  const TABLE = Object.freeze([
    { level: 'veryEasy', min: 0, minClues: 40, maxClues: 50, minCluesPerUnit: 2, extraPasses: 1 },
    { level: 'easy', min: 45, minClues: 34, maxClues: 40, minCluesPerUnit: 2, extraPasses: 1 },
    { level: 'normal', min: 180, minClues: 29, maxClues: 34, minCluesPerUnit: 1, extraPasses: 1 },
    { level: 'hard', min: 400, minClues: 25, maxClues: 30, minCluesPerUnit: 1, extraPasses: 1 },
    { level: 'expert', min: 700, minClues: 25, maxClues: 30, minCluesPerUnit: 1, extraPasses: 1 },
    { level: 'master', min: 1000, minClues: 22, maxClues: 27, minCluesPerUnit: 0, extraPasses: 1 },
    { level: 'nightmare', min: 1500, minClues: 17, maxClues: 24, minCluesPerUnit: 0, extraPasses: 1 },
    { level: 'hell1', min: 2400, minClues: 17, maxClues: 24, minCluesPerUnit: 0, extraPasses: 1 },
    { level: 'hell2', min: 3600, minClues: 17, maxClues: 24, minCluesPerUnit: 0, extraPasses: 1 }
  ]);

  /** The top tiers: their digs may also start from the fast uniqueness-based proposal (design.md 6.8). */
  const PROPOSAL_FROM = 'nightmare';

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

  /** Clue scale of a board: cellCount / 81 (1 without a model). */
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
    const factor = factors && hasOwn.call(factors, level) ? factors[level] : 1;
    let standard = Math.max(1, Math.floor(row.minClues * scale));
    // Rounded to 6 places first, so that 25 * 0.8 is 20 and not 19.999999999999996.
    if (factor !== 1) standard = Math.max(1, Math.floor(Math.round(standard * factor * 1e6) / 1e6));
    let minClues = standard;
    const declared = def === null ? undefined : def.clueFloor;
    if (typeof declared === 'function') {
      const value = Math.floor(declared(level, model, standard));
      if (Number.isFinite(value) && value >= 0) minClues = value;
    } else if (declared !== undefined && declared !== null && typeof declared === 'object') {
      const value = hasOwn.call(declared, level) ? Math.floor(declared[level]) : 0;
      minClues = Number.isFinite(value) && value >= 0 ? value : 0;
    }
    return {
      minClues: minClues,
      maxClues: Math.max(minClues, Math.max(1, Math.round(row.maxClues * scale)))
    };
  }

  /** Lower score bound of level index `i`. */
  function bandMin(i) {
    return TABLE[i].min;
  }

  /** Exclusive upper score bound of level index `i` (Infinity for the top level). */
  function bandMax(i) {
    return i + 1 < TABLE.length ? TABLE[i + 1].min : Infinity;
  }

  /**
   * The score band of a level.
   * @param {string} level
   * @returns {{min: number, max: number}} `max` is Infinity for hell2.
   */
  function bandOf(level) {
    const i = levelIndex(level);
    return { min: bandMin(i), max: bandMax(i) };
  }

  /**
   * The level of a score (`null` for a missing or non-finite score).
   * @param {?number} score
   * @returns {?string}
   */
  function levelOfScore(score) {
    if (typeof score !== 'number' || !isFinite(score)) return null;
    let found = 0;
    for (let i = 1; i < TABLE.length; i++) {
      if (score >= bandMin(i)) found = i;
    }
    return LEVELS[found];
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
   * Weight of one technique (`WEIGHTS`).
   * @param {string} id
   * @returns {number}
   * @throws {SG.errors.GenerationError} 'difficulty.unknownTechnique' for a technique without a weight.
   */
  function weightOf(id) {
    if (!hasOwn.call(WEIGHTS, id)) {
      throw fail('difficulty.unknownTechnique', { technique: String(id) },
        'the technique "' + String(id) + '" has no weight in SG.difficulty.WEIGHTS');
    }
    return WEIGHTS[id];
  }

  /** Registration order of a technique, for the tie rule of the hardest technique (0 when unknown). */
  function orderOf(id) {
    return SG.techniques && SG.techniques.has && SG.techniques.has(id) ? SG.techniques.get(id).order : 0;
  }

  /**
   * Does technique `a` outrank `b` as the hardest one: the larger weight, then the larger registration
   * `order`, then the id that comes first in ascending code-unit order.
   */
  function outranks(a, b) {
    const wa = WEIGHTS[a];
    const wb = WEIGHTS[b];
    if (wa !== wb) return wa > wb;
    const oa = orderOf(a);
    const ob = orderOf(b);
    if (oa !== ob) return oa > ob;
    return a < b;
  }

  /**
   * @typedef {Object} ScoreRow
   * @property {string} id
   * @property {number} uses     n_t
   * @property {number} weight   w_t
   * @property {number} work     w_t * n_t
   * @property {number} share    The row's allocated share of the score: R * w_t * n_t / W, plus P on the
   *           row of the hardest technique. Unrounded.
   * @property {boolean} hardest This row carries P.
   */

  /**
   * @typedef {Object} ScoreBreakdown
   * @property {ScoreRow[]} rows   The techniques used, in the solver's order (registration `order`).
   * @property {number} empties    E
   * @property {number} empty      V, the empty cells' share (unrounded).
   * @property {number} peak       P
   * @property {number} work       W
   * @property {number} workTerm   R
   * @property {?string} hardest   The technique that provides P (null when no technique was used).
   * @property {number} unrounded  V + P + R
   * @property {number} score      Math.round(V + P + R)
   */

  /**
   * The score of a technique count and an empty-cell count, with its exact apportionment over the rows of
   * the Difficulty Score table (docs/report-v2/report-detailed.md section 5.6): every technique row gets
   * `R * w_t * n_t / W`, the row of the hardest technique also `P`, the empty cells `V`; the shares add up to
   * the unrounded sum, whose single rounding is the score. Summary and Generation Steps use this one helper.
   * @param {Object<string, number>} counts  Technique id -> uses (ids with 0 uses are ignored).
   * @param {number} empties  Cells empty at the start.
   * @returns {ScoreBreakdown}
   * @throws {SG.errors.GenerationError} 'difficulty.unknownTechnique' for a technique without a weight.
   */
  function breakdown(counts, empties) {
    const ids = Object.keys(counts || {}).filter(function (id) { return counts[id] > 0; });
    ids.forEach(weightOf);
    ids.sort(function (a, b) { return orderOf(a) - orderOf(b) || (a < b ? -1 : a > b ? 1 : 0); });
    let hardest = null;
    let work = 0;
    ids.forEach(function (id) {
      work += WEIGHTS[id] * counts[id];
      if (hardest === null || outranks(id, hardest)) hardest = id;
    });
    const peak = hardest === null ? 0 : WEIGHTS[hardest];
    const workTerm = peak > 0 ? SCORING.workFactor * peak * Math.log2(1 + work / peak) : 0;
    const e = empties > 0 ? empties : 0;
    const empty = SCORING.emptyCellMax * e / (e + SCORING.emptyCellHalf);
    const rows = ids.map(function (id) {
      const w = WEIGHTS[id];
      const n = counts[id];
      return {
        id: id,
        uses: n,
        weight: w,
        work: w * n,
        share: (work > 0 ? workTerm * w * n / work : 0) + (id === hardest ? peak : 0),
        hardest: id === hardest
      };
    });
    const unrounded = empty + peak + workTerm;
    return {
      rows: rows,
      empties: e,
      empty: empty,
      peak: peak,
      work: work,
      workTerm: workTerm,
      hardest: hardest,
      unrounded: unrounded,
      score: Math.round(unrounded)
    };
  }

  /**
   * The score of a technique count and an empty-cell count (see the file header).
   * @param {Object<string, number>} counts
   * @param {number} empties
   * @returns {number} An integer.
   */
  function scoreOf(counts, empties) {
    return breakdown(counts, empties).score;
  }

  /**
   * Whole numbers for parts that add up to a rounded total: every part is rounded down and the points still
   * missing go to the largest remainders (the earlier part first on a tie). The same rule as
   * `SG.stepView.roundToTotal`.
   * @param {number[]} values  The exact parts.
   * @param {number} total  The exact total.
   * @returns {number[]}
   */
  function apportion(values, total) {
    const target = Math.round(total);
    const out = values.map(function (v) { return Math.floor(v); });
    let left = target - out.reduce(function (sum, v) { return sum + v; }, 0);
    const order = values.map(function (v, i) { return i; }).sort(function (a, b) {
      return (values[b] - Math.floor(values[b])) - (values[a] - Math.floor(values[a])) || a - b;
    });
    for (let k = 0; k < order.length && left > 0; k++, left--) out[order[k]] += 1;
    return out;
  }

  /**
   * @typedef {Object} ScoreTable
   * @property {Array<{id: string, uses: number, points: number, total: number, hardest: boolean}>} rows
   *           One row per technique used, in the solver's order: its uses, its points (the weight) and its
   *           whole share of the score.
   * @property {number} empties     E (0: the table has no empty-cell row).
   * @property {number} emptyPoints V / E, the average points of an empty cell (0 when E = 0).
   * @property {number} emptyTotal  The whole share of the empty cells.
   * @property {number} total       The score; the row totals and `emptyTotal` add up to it.
   */

  /**
   * The Difficulty Score table of the Summary and the Generation Steps (docs/report-v2/report-detailed.md
   * section 5.6), the one allocation helper both use: the exact shares of `breakdown` (techniques, then the
   * empty cells) are rounded once together with `apportion`, so the whole numbers add up to the score.
   * @param {Object<string, number>} counts
   * @param {number} empties
   * @returns {ScoreTable}
   */
  function scoreTable(counts, empties) {
    const parts = breakdown(counts, empties);
    const values = parts.rows.map(function (row) { return row.share; });
    if (parts.empties > 0) values.push(parts.empty);
    const whole = apportion(values, parts.score);
    return {
      rows: parts.rows.map(function (row, i) {
        return { id: row.id, uses: row.uses, points: row.weight, total: whole[i], hardest: row.hardest };
      }),
      empties: parts.empties,
      emptyPoints: parts.empties > 0 ? parts.empty / parts.empties : 0,
      emptyTotal: parts.empties > 0 ? whole[whole.length - 1] : 0,
      total: parts.score
    };
  }

  /**
   * @typedef {Object} DifficultySpec
   * @property {string} level
   * @property {number} min              Lower score bound (inclusive). Not scaled.
   * @property {number} max              Upper score bound (exclusive); Infinity for hell2.
   * @property {number} minClues         The digger never goes below this many givens (invariant I6): the
   *           classic9 floor scaled by cellCount / 81, unless the variant declares its own `clueFloor` (file
   *           header, "Clue floor per variant"); 0 is possible for such a variant.
   * @property {number} maxClues         Upper end of the clue range (informative).
   * @property {number} minCluesPerUnit  Every unit keeps at least this many givens while digging.
   * @property {string[]} allowedGroups  Groups of `allowedTechniques`.
   * @property {string[]} allowedTechniques  Registered ids that apply to the variant and can occur in a
   *           puzzle of the band: `1.25 * w_t < max` (every technique for hell2), in loop order. The
   *           oracle uses them with `assumeUniqueness: false`, so a technique that relies on uniqueness
   *           (uniqueRectangle) is listed but never used there.
   * @property {string} symmetryDefault
   * @property {number} extraPasses      Kept for the contract of design.md section 13.7; not used.
   * @property {string} oracle           'techniques': the technique oracle (a complete proof) at every level.
   * @property {boolean} proposal        A top tier (nightmare, hell1, hell2): the digger may also start
   *           from the fast uniqueness-based proposal dig (design.md section 6.8).
   * @property {number} scale            cellCount / 81, the scale of the clue floors (not of the bands).
   */

  /**
   * The specification the hole digger works to for one level on one board: score band, clue range and the
   * technique set (docs/report-v2/report-detailed.md section 5.7).
   * @param {string} level  One of `SG.difficulty.LEVELS`.
   * @param {PuzzleModel} model
   * @returns {DifficultySpec}
   * @throws {SG.errors.GenerationError} 'difficulty.unknownLevel', or 'difficulty.unsupportedLevel' when the
   *         variant's `difficultySupport` does not list the level.
   */
  function spec(level, model) {
    const i = levelIndex(level);
    if (!isSupported(level, model)) {
      throw fail('difficulty.unsupportedLevel', { level: level, variantId: model.variantId },
        'variant "' + model.variantId + '" does not support the level "' + level + '"');
    }
    const row = TABLE[i];
    const scale = scaleOf(model);
    const max = bandMax(i);
    const variantId = model ? model.variantId : null;
    const techniques = SG.techniques.list().filter(function (tech) {
      return hasOwn.call(WEIGHTS, tech.id) &&
        (variantId === null || SG.techniques.appliesTo(tech, variantId)) &&
        (max === Infinity || SCORING.peakBound * WEIGHTS[tech.id] < max);
    });
    const groups = [];
    BASE_GROUPS.concat(VARIANT_GROUPS).forEach(function (g) {
      if (techniques.some(function (tech) { return tech.group === g; })) groups.push(g);
    });
    const digits = model && model.digits ? model.digits : 9;
    const clues = clueRange(level, row, model, scale);
    return {
      level: level,
      min: bandMin(i),
      max: max,
      minClues: clues.minClues,
      maxClues: clues.maxClues,
      minCluesPerUnit: Math.floor(row.minCluesPerUnit * digits / 9),
      allowedGroups: groups,
      allowedTechniques: techniques.map(function (tech) { return tech.id; }),
      symmetryDefault: DEFAULT_SYMMETRY,
      extraPasses: row.extraPasses,
      oracle: 'techniques',
      proposal: i >= LEVELS.indexOf(PROPOSAL_FROM),
      scale: scale
    };
  }

  /**
   * Cells empty at the start of a solver report. The solver scores the empty cells itself; what is left of
   * its (uncalibrated) score after its technique part is theirs.
   */
  function emptiesOf(report) {
    const counts = report.techniqueCounts || {};
    const solverScoring = SG.logicalSolver.SCORING;
    let uncalibrated = 0;
    Object.keys(counts).forEach(function (id) {
      const n = counts[id];
      if (n > 0) uncalibrated += SG.techniques.get(id).baseCost * (n - 1 + solverScoring.firstUseMultiplier);
    });
    return Math.max(0, Math.round((report.score - uncalibrated) / solverScoring.emptyCellBonus));
  }

  /**
   * @typedef {Object} Rating
   * @property {?string} level             The level of the score; null without a complete proof.
   * @property {?number} score             The score (an integer); null without a complete proof.
   * @property {?number} rawScore          Equal to `score` (kept so that exported files keep their format).
   * @property {?string} hardestTechnique  The used technique of the largest weight (ties: the larger
   *           registration `order`, then the id first in code-unit order); null when no step was needed.
   * @property {?string} hardestGroup      Group of `hardestTechnique`.
   * @property {number} confidence         0..1, how deep inside its band the score lies (0 = on an edge, or
   *           no complete proof).
   * @property {boolean} solved            The logical solver finished the grid (a complete proof).
   * @property {number} empties            Cells empty at the start.
   * @property {Object<string, number>} techniqueCounts
   * @property {number} ratingVersion      2.
   */

  /**
   * Rates the result of `SG.logicalSolver.solve`. Works with `collectSteps` on or off, since only the
   * technique counts are used. Run the solver with every technique and `assumeUniqueness: true` (that is
   * what `rate` does) so that the rating does not depend on a restricted technique set.
   * @param {SolveReport} report
   * @param {PuzzleModel} [model]  Not used by the score (kept for the API of section 13.7).
   * @returns {Rating}
   */
  function classify(report, model) {
    const empties = emptiesOf(report);
    const counts = report.techniqueCounts || {};
    const parts = breakdown(counts, empties);
    const solved = report.solved === true;
    const hardest = parts.hardest;
    const base = {
      hardestTechnique: hardest,
      hardestGroup: hardest === null ? null : SG.techniques.get(hardest).group,
      solved: solved,
      empties: empties,
      techniqueCounts: Object.assign({}, report.techniqueCounts),
      ratingVersion: RATING_VERSION
    };
    if (!solved) {
      return Object.assign({ level: null, score: null, rawScore: null, confidence: 0 }, base);
    }
    const score = parts.score;
    const i = levelIndex(levelOfScore(score));
    const lo = bandMin(i);
    const hi = bandMax(i);
    // Distance to the nearest edge that borders another level, in units of half the band width. The lowest
    // band has no lower edge, and the top band (no upper edge) is measured against its own minimum.
    const width = i === 0 ? hi : hi === Infinity ? lo : hi - lo;
    let confidence = 1;
    if (i > 0) confidence = Math.min(confidence, (score - lo) / (width / 2));
    if (hi !== Infinity) confidence = Math.min(confidence, (hi - score) / (width / 2));
    confidence = Math.max(0, Math.min(1, confidence));
    return Object.assign({
      level: LEVELS[i],
      score: score,
      rawScore: score,
      confidence: confidence
    }, base);
  }

  /**
   * Does a rating prove by itself that its puzzle has exactly one solution? A complete logical proof whose
   * techniques never assume uniqueness does: sound deductions never remove a candidate of any solution, so a
   * puzzle with two solutions can never be finished. A proof that used a technique with `assumesUniqueness`
   * (Unique Rectangle) proves nothing about uniqueness; the caller checks with a solution count.
   * @param {Rating} rating
   * @returns {boolean}
   */
  function provesUniqueness(rating) {
    if (!rating || rating.solved !== true) return false;
    const counts = rating.techniqueCounts || {};
    return !Object.keys(counts).some(function (id) {
      return counts[id] > 0 && SG.techniques.has(id) && SG.techniques.get(id).assumesUniqueness === true;
    });
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
    VARIANT_GROUPS: VARIANT_GROUPS,
    RATING_VERSION: RATING_VERSION,
    SCORING: SCORING,
    WEIGHTS: WEIGHTS,
    TABLE: TABLE,
    spec: spec,
    isSupported: isSupported,
    classify: classify,
    rate: rate,
    provesUniqueness: provesUniqueness,
    breakdown: breakdown,
    scoreOf: scoreOf,
    scoreTable: scoreTable,
    apportion: apportion,
    weightOf: weightOf,
    bandOf: bandOf,
    levelOfScore: levelOfScore,
    levelIndex: levelIndex
  };
})(typeof self !== 'undefined' ? self : globalThis);
