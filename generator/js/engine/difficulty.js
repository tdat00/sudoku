/**
 * Difficulty model, rating v2: the nine levels, the specification the hole digger works to for a level, and
 * the rating of a finished puzzle (docs/difficulty-rating/report-detailed.md sections 4-5).
 *
 * Score: one formula for every variant and board size. Its only inputs are the number of cells empty at the
 * start (E) and how often each technique was applied in the logical solve (n_t):
 *
 *   P     = max { w_t : n_t > 0 }             the weight of the hardest technique used (0: none)
 *   W     = sum over t of w_t * n_t           the work: points x uses
 *   V     = 80 * E / (E + 40)                 the empty cells, bounded by 80 (40 at E = 40)
 *   R     = 0.25 * P * log2(1 + W / P)        the repeated work, logarithmic (0 when P = 0)
 *   score = Math.round(V + P + R)             ONE rounding of the unrounded sum
 *   level = the level whose band [min, max) contains the score
 *
 * The weights w_t are the table `WEIGHTS`; a technique without a weight is an error, never a guessed cost.
 * Nothing else enters the score (not the requested level, variant, board size or clue density): a large board
 * does not become harder through its singles (V is bounded, the work counts logarithmically) and one
 * expensive step counts in full on any board (through P). The score never decreases when a count, E or the
 * hardest weight grows, but it is NOT monotone under the removal of a clue (the proof changes), so the digger
 * never assumes that.
 *
 * A rating is published only for a complete logical proof (`report.solved`); otherwise level and score are
 * null.
 *
 * Bands: one table (`TABLE`) for every variant, not scaled by board size. A band is [min, max); `max` of a
 * level is `min` of the next one (hell2 has no upper bound), so the level is a pure function of the score.
 *
 * Clue floor (invariant I6): `spec(level, model).minClues` is the number every "at least minClues givens"
 * check uses. Default: the classic9 floor of the level (`TABLE[i].minClues`) times cellCount / 81 (at least
 * 1). A variant whose board does not follow that proportion declares in `SG.variants.register`, optionally:
 *   clueFloorScale  { level: factor } multiplying the derived floor (missing level: 1); the calibration knob
 *                   of the hybrid and multi-grid boards. expert takes the factor of hard, hell1/2 that of
 *                   nightmare.
 *   clueFloor       { level: clues } absolute floors (missing level: 0), or a function
 *                   (level, model, derivedFloor) => clues; `derivedFloor` already includes `clueFloorScale`.
 * Killer: { veryEasy: 40 } (the other levels dig down to a handful of clues). Only `spec` reads these fields.
 *
 * Calibration: the weights and band edges come from docs/difficulty-rating/report-detailed.md; the edges keep
 * the reference puzzles of tests/fixtures/rated.js in their levels. The weights are engineering priors, not
 * human measurements. Which levels a variant offers is measured by `tests/qualify.js`, not assumed.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};
  const hasOwn = Object.prototype.hasOwnProperty;

  // Easiest first; mirrors the list SG.variants validates `difficultySupport` against.
  const LEVELS = Object.freeze(['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare',
    'hell1', 'hell2']);

  // Technique groups, simplest first. Descriptive only (help catalogue, score table order): no group owns a
  // level.
  const BASE_GROUPS = Object.freeze(['basic', 'locked', 'subset', 'fish', 'wing', 'chain']);

  const VARIANT_GROUPS = Object.freeze(['cage', 'ineq']);

  const RATING_VERSION = 2;

  // Reference size of the clue floors (classic9); the score bands are not scaled.
  const REFERENCE_CELLS = 81;

  // Constants of the score: V = emptyCellMax * E / (E + emptyCellHalf), R = workFactor * P * log2(1 + W / P).
  // `peakBound` is the factor of the lower bound of the technique part of a puzzle using a technique of
  // weight w (R >= 0.25 P because W >= P), which `spec` uses to prune the techniques of a band.
  const SCORING = Object.freeze({ emptyCellMax: 80, emptyCellHalf: 40, workFactor: 0.25, peakBound: 1.25 });

  // Weight of each technique. Replaces the registered `baseCost` in the rating only (the solver's order and
  // raw score are unchanged). A new technique needs an entry (`weightOf` throws without one). Not frozen, so
  // a test can change a weight for its duration; nothing else writes it.
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

  // Bands and clue ranges, easiest first. `min` is the inclusive lower score bound (the upper one is the next
  // level's `min`). Clue ranges are classic9's: minClues is a floor for the digger, scaled by cellCount / 81;
  // maxClues is informative. expert has the floors of hard, hell1 and hell2 those of nightmare. Rows are not
  // frozen, so tests/soak.js can try other bands for a calibration run.
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

  // The top tiers: their digs may also start from the fast uniqueness-based proposal.
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

  function scaleOf(model) {
    return model && model.cellCount > 0 ? model.cellCount / REFERENCE_CELLS : 1;
  }

  function variantOf(model) {
    if (!model || !SG.variants || !SG.variants.has(model.variantId)) return null;
    return SG.variants.get(model.variantId);
  }

  // Clue range of a level on one board: the classic9 numbers scaled by cellCount / 81, times the variant's
  // `clueFloorScale` for the level, then replaced by its `clueFloor` (see "Clue floor" in the file header).
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

  function bandMin(i) {
    return TABLE[i].min;
  }

  // Exclusive; Infinity for the top level.
  function bandMax(i) {
    return i + 1 < TABLE.length ? TABLE[i + 1].min : Infinity;
  }

  function bandOf(level) {
    const i = levelIndex(level);
    return { min: bandMin(i), max: bandMax(i) };
  }

  function levelOfScore(score) {
    if (typeof score !== 'number' || !isFinite(score)) return null;
    let found = 0;
    for (let i = 1; i < TABLE.length; i++) {
      if (score >= bandMin(i)) found = i;
    }
    return LEVELS[found];
  }

  // Models of variants that are not registered (test boards) support every level.
  function isSupported(level, model) {
    levelIndex(level);
    if (!model || !SG.variants || !SG.variants.has(model.variantId)) return true;
    return SG.variants.get(model.variantId).difficultySupport.indexOf(level) !== -1;
  }

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

  // Does `a` outrank `b` as the hardest technique: larger weight, then larger registration `order`, then
  // smaller id.
  function outranks(a, b) {
    const wa = WEIGHTS[a];
    const wb = WEIGHTS[b];
    if (wa !== wb) return wa > wb;
    const oa = orderOf(a);
    const ob = orderOf(b);
    if (oa !== ob) return oa > ob;
    return a < b;
  }

  // ScoreRow: { id, uses (n_t), weight (w_t), work (w_t * n_t), share (R * w_t * n_t / W, plus P on the
  // hardest row; unrounded), hardest } ScoreBreakdown: { rows (techniques used, solver order), empties (E),
  // empty (V, unrounded), peak (P), work (W), workTerm (R), hardest (provides P; null when no technique was
  // used), unrounded (V + P + R), score (rounded) }


  // Score of a technique count and an empty-cell count, with its exact apportionment: every technique row
  // gets R * w_t * n_t / W, the hardest row also P, the empty cells V; the shares add up to the unrounded
  // sum, whose single rounding is the score. Summary and Generation Steps use this one helper.
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

  function scoreOf(counts, empties) {
    return breakdown(counts, empties).score;
  }

  // Whole numbers for parts of a rounded total: every part is rounded down and the missing points go to the
  // largest remainders (earlier part first on a tie); same rule as `SG.stepView.roundToTotal`.
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

  // ScoreTable: { rows [{ id, uses, points (the weight), work (points x uses), share (exact, unrounded),
  // total (whole share), hardest }], empties (E), emptyPoints (V / E; 0 when E = 0), emptyShare (V, exact),
  // emptyTotal, peak (P), work (W), workTerm (R), unrounded (V + P + R), total (the score: row totals and
  // emptyTotal add up to it) }. The exact numbers let the UI explain every whole number it shows.

  // The Difficulty Score table of Summary and Generation Steps: the exact shares of `breakdown` (techniques,
  // then empty cells) are rounded once together with `apportion`, so the whole numbers add up to the score.
  function scoreTable(counts, empties) {
    const parts = breakdown(counts, empties);
    const values = parts.rows.map(function (row) { return row.share; });
    if (parts.empties > 0) values.push(parts.empty);
    const whole = apportion(values, parts.score);
    return {
      rows: parts.rows.map(function (row, i) {
        return {
          id: row.id, uses: row.uses, points: row.weight, work: row.work, share: row.share, total: whole[i],
          hardest: row.hardest
        };
      }),
      empties: parts.empties,
      emptyPoints: parts.empties > 0 ? parts.empty / parts.empties : 0,
      emptyShare: parts.empties > 0 ? parts.empty : 0,
      emptyTotal: parts.empties > 0 ? whole[whole.length - 1] : 0,
      peak: parts.peak,
      work: parts.work,
      workTerm: parts.workTerm,
      unrounded: parts.unrounded,
      total: parts.score
    };
  }

  // DifficultySpec: { level, min (inclusive, not scaled), max (exclusive; Infinity for hell2), minClues (the
  // digger never goes below it, invariant I6: classic9 floor scaled by cellCount / 81 unless the variant
  // declares `clueFloor`; may be 0), maxClues (informative), minCluesPerUnit (every unit keeps at least this
  // many givens while digging), allowedGroups, allowedTechniques (registered ids that apply to the variant
  // and can occur in the band: 1.25 * w_t < max, all for hell2, in loop order; the oracle runs them with
  // assumeUniqueness: false, so uniqueRectangle is listed but never used there), symmetryDefault, extraPasses
  // (unused), oracle ('techniques': a complete proof at every level), proposal (top tier: the digger may also
  // start from the fast uniqueness-based proposal dig), scale (cellCount / 81, the scale of the clue floors)
  // }

  // The specification the hole digger works to for one level on one board: score band, clue range and
  // technique set. Throws 'difficulty.unknownLevel', or 'difficulty.unsupportedLevel' when the variant's
  // `difficultySupport` lacks it.
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

  // Cells empty at the start of a solver report: what is left of its own score after its technique part.
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

  // Rating: { level (null without a complete proof), score (integer; null likewise), rawScore (= score; kept
  // for exported files), hardestTechnique (largest weight; ties: larger registration `order`, then id; null
  // when no step was needed), hardestGroup, confidence (0..1: how deep inside its band the score lies; 0 on
  // an edge or without a proof), solved, empties, techniqueCounts, ratingVersion (2) }

  // Rates the result of `SG.logicalSolver.solve`; only the technique counts are used, so `collectSteps` may
  // be on or off. Solve with every technique and `assumeUniqueness: true` (what `rate` does) so the rating
  // does not depend on a restricted technique set.
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

  // Does a rating prove by itself that the puzzle has exactly one solution? A complete proof whose techniques
  // never assume uniqueness does: sound deductions never remove a candidate of any solution, so a
  // two-solution puzzle can never be finished. With an `assumesUniqueness` technique (Unique Rectangle) it
  // proves nothing; count solutions.
  function provesUniqueness(rating) {
    if (!rating || rating.solved !== true) return false;
    const counts = rating.techniqueCounts || {};
    return !Object.keys(counts).some(function (id) {
      return counts[id] > 0 && SG.techniques.has(id) && SG.techniques.get(id).assumesUniqueness === true;
    });
  }

  // Solves with every registered technique (uniqueness assumed) and classifies; `collectSteps` keeps
  // `rating.steps`.
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
