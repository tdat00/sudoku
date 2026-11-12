/**
 * Pure helpers of the baseline diagnostics of `node tests/soak.js --json=<file>` (difficulty v3,
 * docs/difficulty-v3/report-detailed.md R23 and the accepted clarification AC01). Exposed as
 * SG.fixtures.difficultyDiagnostics; they are test tooling, not part of any application script list.
 *
 *  - positionOf(input)        the raw and the "attainable" position of a score in its band, with a reason
 *                             when the adjusted one is undefined. Formula (no rounding, no clamping):
 *                               lower = max(min, 1.25 * wMin + V)   (wMin: the smallest weight of the tier)
 *                               raw = (score - min) / (max - min)
 *                               adjusted = (score - lower) / (max - lower)
 *                             `lower` is an analytic lower bound of the attainable range, not a proof that
 *                             the search reaches it.
 *  - summaryOf(rows)          counts, hits and their denominators, shallow share, histograms and the position
 *                             deciles of the exact and of the all-in-band cohorts of the rows of a ledger.
 *  - rowOf(input)             one ledger row (a request: its puzzle or its error, hits, position, counters).
 *  - diagnose(entry, env)     the deferred solves of one request (the reference floor of the requested level,
 *                             the final path rated again with steps), after every generation and check of the
 *                             run has finished: the subset finder of the engine keeps a check-spacing counter
 *                             across solves, so a diagnostic solve between two generations could change a
 *                             later puzzle.
 *  - ledgerOf, ledgerText, summaryLines   the ledger (schema 1), its text (UTF-8, CRLF) and a text report.
 *
 * A row has these fields (null where something is not exposed or not known, never 0 for unknown work):
 *   variant, requested, index, tag, pipelineSeed (null on the direct route), outcome ('ok' | 'error'), error
 *   ({ code, message } | null), achieved (a level | null), solved, score, ratingVersion, techniqueCounts,
 *   empties, scoreHit (solved and in the band of `requested`), generationExact (the old hit of the soak),
 *   qualifiedHit (scoreHit and the reference says the tier is required), required (true | false | null),
 *   referenceStatus ('not-run' | 'ok' | 'vacuous' | 'error' | 'skipped-not-unique': uniqueness was not
 *   proved), referenceError, shallow (true | false | null: only a solved in-band puzzle with a reference
 *   verdict has one), position ({ raw, adjusted, lower, reason, inputs }), generationMs, diagnosticMs (null
 *   until measured), fullRatings (calls of `SG.difficulty.rate` during the generation), proposals /
 *   shallowRatings / capHits / target (null: not exposed at this baseline), chainLengths / nishioDepths (of
 *   the final path), puzzleHash (identity of the puzzle) and pathCheck ({ status: 'not-run' | 'ok' |
 *   'mismatch' | 'error', error }).
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};
  SG.fixtures = SG.fixtures || {};

  var SCHEMA = 1;
  // The factor of the accepted formula (SG.difficulty.SCORING.peakBound; a test keeps the two equal).
  var PEAK_BOUND = 1.25;
  // The budget of the diagnostic solves of one request, in milliseconds (reference floor, then final path).
  var REFERENCE_BUDGET_MS = 120000;
  var DECILES = 10;
  var REASONS = ['unrated', 'non-finite-band', 'non-positive-width', 'off-band', 'empty-tier',
    'vacuous-tier'];

  function finite(x) {
    return typeof x === 'number' && isFinite(x);
  }

  function share(count, denominator) {
    return denominator > 0 ? count / denominator : null;
  }

  // ---------------------------------------------------------------------------------------------
  // Positions
  // ---------------------------------------------------------------------------------------------

  /**
   * { raw, adjusted, lower, reason } of a result in the band [min, max). `tierWeights` are the weights of the
   * tier techniques, `vacuous` says whether the tier needs no certificate. `adjusted` is null with a reason,
   * in this order: unrated, non-finite-band, non-positive-width (of the band), off-band, empty-tier,
   * vacuous-tier, non-positive-width (of the adjusted interval). `raw` is computed for every solved result
   * with a finite band of positive width, an off-band one included (a diagnostic; callers keep it out of
   * spread histograms). `lower` is null until the tier is not vacuous and its bound is defined.
   */
  function positionOf(input) {
    var min = input.min;
    var max = input.max;
    var score = input.score;
    var tier = Array.isArray(input.tierWeights) ? input.tierWeights : [];
    var rated = input.solved === true && finite(score);
    var bandFinite = finite(min) && finite(max);
    var weightsOk = tier.length > 0 && tier.every(finite);
    var lower = null;
    if (input.vacuous !== true && weightsOk && finite(input.V) && finite(min)) {
      lower = Math.max(min, PEAK_BOUND * Math.min.apply(null, tier) + input.V);
    }
    var raw = rated && bandFinite && max > min ? (score - min) / (max - min) : null;

    var reason = null;
    if (!rated) reason = 'unrated';
    else if (!bandFinite) reason = 'non-finite-band';
    else if (!(max > min)) reason = 'non-positive-width';
    else if (score < min || score >= max) reason = 'off-band';
    else if (tier.length === 0) reason = 'empty-tier';
    else if (input.vacuous === true) reason = 'vacuous-tier';
    else if (lower === null) reason = weightsOk ? 'unrated' : 'empty-tier';
    else if (!(max > lower)) reason = 'non-positive-width';
    return {
      raw: raw,
      adjusted: reason === null ? (score - lower) / (max - lower) : null,
      lower: lower,
      reason: reason
    };
  }

  // ---------------------------------------------------------------------------------------------
  // Statistics
  // ---------------------------------------------------------------------------------------------

  function sortedNumbers(values) {
    return values.slice().sort(function (a, b) { return a - b; });
  }

  /** The element at sorted index floor(n / 2) (the upper median); null for no values. */
  function upperMedianOf(values) {
    if (values.length === 0) return null;
    return sortedNumbers(values)[Math.floor(values.length / 2)];
  }

  /**
   * The values at p = 0, 0.1, ..., 1 (eleven: the minimum, nine deciles, the maximum), each at sorted index
   * min(n - 1, floor(p * n)); null for no values.
   */
  function decilesOf(values) {
    if (values.length === 0) return null;
    var sorted = sortedNumbers(values);
    var n = sorted.length;
    var out = [];
    for (var k = 0; k <= DECILES; k++) out.push(sorted[Math.min(n - 1, Math.floor(k * n / DECILES))]);
    return out;
  }

  /** { n, deciles, upperMedian }; the statistics of no values are null, never 0. */
  function statsOf(values) {
    return { n: values.length, deciles: decilesOf(values), upperMedian: upperMedianOf(values) };
  }

  function bump(table, key) {
    table[key] = (table[key] || 0) + 1;
  }

  // ---------------------------------------------------------------------------------------------
  // Summary of a set of rows
  // ---------------------------------------------------------------------------------------------

  function positionOfRow(row) {
    return row.position && typeof row.position === 'object' ? row.position : { raw: null, adjusted: null };
  }

  /** The hardest technique of a solved row, 'none' when it needed no step; derived with `SG.difficulty`. */
  function peakOfRow(row) {
    var parts = SG.difficulty.breakdown(row.techniqueCounts || {}, row.empties);
    return parts.hardest === null ? 'none' : parts.hardest;
  }

  function peaksOf(rows) {
    var table = {};
    rows.forEach(function (row) { if (row.solved === true) bump(table, peakOfRow(row)); });
    return table;
  }

  function cohortOf(rows) {
    var rawValues = [];
    var adjustedValues = [];
    var nullReasons = {};
    rows.forEach(function (row) {
      var position = positionOfRow(row);
      if (finite(position.raw) && position.reason !== 'off-band') rawValues.push(position.raw);
      if (finite(position.adjusted)) adjustedValues.push(position.adjusted);
      else bump(nullReasons, position.reason || 'unknown');
    });
    return { n: rows.length, peaks: peaksOf(rows), raw: statsOf(rawValues), adjusted: statsOf(adjustedValues),
      nullReasons: nullReasons };
  }

  function seriesOf(rows, field) {
    var steps = {};
    var maxima = {};
    var puzzles = 0;
    var total = 0;
    rows.forEach(function (row) {
      var list = Array.isArray(row[field]) ? row[field] : [];
      if (list.length === 0) return;
      puzzles++;
      total += list.length;
      list.forEach(function (value) { bump(steps, value); });
      bump(maxima, Math.max.apply(null, list));
    });
    return { puzzles: puzzles, steps: total, stepHistogram: steps, maxHistogram: maxima };
  }

  function measured(row) {
    return !!row.pathCheck && (row.pathCheck.status === 'ok' || row.pathCheck.status === 'mismatch');
  }

  function hitOf(count, denominator) {
    return { count: count, denominator: denominator, share: share(count, denominator) };
  }

  /**
   * The summary of ledger rows (any mix of variants and levels). Every request stays in the denominators of
   * the hits, a failed one included; the shallow share is over the solved in-band rows (`checked` of them
   * have a reference verdict; a row whose reference failed or did not run is never called shallow).
   */
  function summaryOf(rows) {
    var matrix = {};
    var references = { ok: 0, vacuous: 0, error: 0, skipped: 0, notRun: 0 };
    var paths = { ok: 0, mismatch: 0, error: 0, notRun: 0 };
    var errors = 0;
    var unrated = 0;
    var inBand = 0;
    var oldHits = 0;
    var qualified = 0;
    var shallow = 0;
    var checked = 0;
    rows.forEach(function (row) {
      var key = row.outcome === 'error' ? 'error' : row.achieved === null || row.achieved === undefined ?
        'unrated' : row.achieved;
      matrix[row.requested] = matrix[row.requested] || {};
      bump(matrix[row.requested], key);
      if (row.outcome === 'error') errors++;
      else if (row.solved !== true) unrated++;
      if (row.scoreHit === true) inBand++;
      if (row.generationExact === true) oldHits++;
      if (row.qualifiedHit === true) qualified++;
      var verdictKnown = row.referenceStatus === 'ok' || row.referenceStatus === 'vacuous';
      if (row.scoreHit === true && verdictKnown) checked++;
      if (row.scoreHit === true && row.shallow === true) shallow++;
      var status = row.referenceStatus;
      if (status === 'ok' || status === 'vacuous' || status === 'error') references[status]++;
      else if (status === 'skipped-not-unique') references.skipped++;
      else references.notRun++;
      var path = row.pathCheck ? row.pathCheck.status : 'not-run';
      if (path === 'ok' || path === 'mismatch' || path === 'error') paths[path]++;
      else paths.notRun++;
    });
    var measuredRows = rows.filter(measured);
    return {
      requests: rows.length,
      matrix: matrix,
      errors: errors,
      unrated: unrated,
      inBand: inBand,
      oldHits: hitOf(oldHits, rows.length),
      qualifiedHits: hitOf(qualified, rows.length),
      shallow: { count: shallow, denominator: inBand, checked: checked, share: share(shallow, inBand) },
      references: references,
      pathChecks: paths,
      peaks: peaksOf(rows),
      cohorts: {
        exact: cohortOf(rows.filter(function (row) { return row.generationExact === true; })),
        inBand: cohortOf(rows.filter(function (row) { return row.scoreHit === true; }))
      },
      chains: {
        measured: measuredRows.length,
        forcingChain: seriesOf(measuredRows, 'chainLengths'),
        nishio: seriesOf(measuredRows, 'nishioDepths')
      }
    };
  }

  /** { 'variant/level': summaryOf(its rows) }, in the order the cells first appear. */
  function cellsOf(rows) {
    var groups = {};
    var order = [];
    rows.forEach(function (row) {
      var key = row.variant + '/' + row.requested;
      if (!groups[key]) {
        groups[key] = [];
        order.push(key);
      }
      groups[key].push(row);
    });
    var out = {};
    order.forEach(function (key) { out[key] = summaryOf(groups[key]); });
    return out;
  }

  // ---------------------------------------------------------------------------------------------
  // Rows
  // ---------------------------------------------------------------------------------------------

  /** { code, message } of a caught value (a GenerationError has a code). */
  function errorOf(err) {
    var code = err && err.code ? String(err.code) : err && err.name ? String(err.name) : 'Error';
    var message = err && err.message ? String(err.message) : String(err);
    return { code: code, message: message };
  }

  function emptyPosition() {
    return { raw: null, adjusted: null, lower: null, reason: 'unrated', inputs: null };
  }

  /**
   * One ledger row. input: { variant, requested, index, tag, pipelineSeed, puzzle (null for a failed request:
   * { achieved, exact, rating }), error, band: { min, max }, tierWeights, vacuous, puzzleHash, generationMs,
   * fullRatings }. The reference and path fields start as not run.
   */
  function rowOf(input) {
    var puzzle = input.puzzle || null;
    var rating = puzzle ? puzzle.rating : null;
    var solved = !!rating && rating.solved === true;
    var score = solved && finite(rating.score) ? rating.score : null;
    var counts = rating && rating.techniqueCounts ? Object.assign({}, rating.techniqueCounts) : {};
    var empties = rating && finite(rating.empties) ? rating.empties : null;
    var band = input.band;
    var tierWeights = input.tierWeights || [];
    var scoreHit = score !== null && score >= band.min && score < band.max;
    var position = emptyPosition();
    if (puzzle) {
      var V = empties === null ? null : SG.difficulty.breakdown(counts, empties).empty;
      position = positionOf({ score: score, solved: solved, V: V, min: band.min, max: band.max,
        tierWeights: tierWeights, vacuous: input.vacuous === true });
      position.inputs = { score: score, V: V, min: band.min, max: band.max,
        wMin: tierWeights.length > 0 ? Math.min.apply(null, tierWeights) : null, tierSize: tierWeights.length,
        vacuous: input.vacuous === true };
    }
    return {
      variant: input.variant,
      requested: input.requested,
      index: input.index,
      tag: input.tag,
      pipelineSeed: input.pipelineSeed === undefined ? null : input.pipelineSeed,
      outcome: puzzle ? 'ok' : 'error',
      error: puzzle ? null : errorOf(input.error),
      achieved: puzzle && typeof puzzle.achieved === 'string' ? puzzle.achieved : null,
      solved: solved,
      score: score,
      ratingVersion: rating && rating.ratingVersion !== undefined ? rating.ratingVersion : null,
      techniqueCounts: counts,
      empties: empties,
      scoreHit: scoreHit,
      generationExact: !!puzzle && puzzle.exact === true,
      qualifiedHit: false,
      required: null,
      referenceStatus: 'not-run',
      referenceError: null,
      shallow: null,
      position: position,
      generationMs: Math.round(input.generationMs * 1000) / 1000,
      diagnosticMs: null,
      fullRatings: input.fullRatings,
      proposals: null,
      shallowRatings: null,
      capHits: null,
      chainLengths: [],
      nishioDepths: [],
      target: null,
      puzzleHash: input.puzzleHash === undefined ? null : input.puzzleHash,
      pathCheck: { status: 'not-run', error: null }
    };
  }

  // ---------------------------------------------------------------------------------------------
  // The reference floor of a row
  // ---------------------------------------------------------------------------------------------

  /**
   * Runs a reference check and reports it: { status, required, error }. 'ok' and 'vacuous' carry a verdict;
   * an error, a cancellation or a result that is not a verdict is status 'error' with required null.
   */
  function referenceOf(run) {
    var result;
    try {
      result = run();
    } catch (err) {
      return { status: 'error', required: null, error: errorOf(err) };
    }
    if (!result || typeof result.required !== 'boolean') {
      return { status: 'error', required: null,
        error: { code: 'diagnostic.badReference', message: 'the reference returned no verdict' } };
    }
    return { status: result.vacuous === true ? 'vacuous' : 'ok', required: result.required, error: null };
  }

  /**
   * { qualifiedHit, shallow } of a request: a qualified hit is solved in-band with the tier required, shallow
   * is solved in-band with the tier not required; neither when the reference failed or did not run.
   */
  function verdictOf(scoreHit, status, required) {
    var verdict = status === 'ok' || status === 'vacuous';
    return {
      qualifiedHit: scoreHit === true && verdict && required === true,
      shallow: scoreHit === true && verdict && typeof required === 'boolean' ? required === false : null
    };
  }

  function sameCounts(a, b) {
    var left = a || {};
    var right = b || {};
    var ids = Object.keys(left).concat(Object.keys(right));
    return ids.every(function (id) { return (left[id] || 0) === (right[id] || 0); });
  }

  /** The lengths of the forcing-chain steps and the depths of the Nishio steps of a list of steps. */
  function chainsOf(steps) {
    var lengths = [];
    var depths = [];
    (steps || []).forEach(function (step) {
      var args = step.i18nArgs || {};
      if (step.technique === 'forcingChain' && finite(args.length)) lengths.push(args.length);
      else if (step.technique === 'nishio' && finite(args.depth)) depths.push(args.depth);
    });
    return { lengths: lengths, depths: depths };
  }

  /**
   * The deferred diagnostics of one request: the reference floor of the requested level, then the final path
   * rated again with steps, both under ONE budget made here for this request (not renewed in between).
   * entry: { row, model, givens, rating, requested, unique } with the givens, the rating and the exact model
   * the generation returned (none of them is changed). env: { difficulty, makeBudget(ms), now() }. Nothing
   * throws: a failure is recorded on the row (status 'error', required null) and never replaces the
   * generation outcome.
   */
  function diagnose(entry, env) {
    var row = entry.row;
    var D = env.difficulty;
    var started = env.now();
    if (entry.unique !== true) {
      row.referenceStatus = 'skipped-not-unique';
    } else {
      var budget = env.makeBudget(REFERENCE_BUDGET_MS);
      var reference = referenceOf(function () {
        return D.certifyFloor(entry.model, entry.givens, entry.requested, budget);
      });
      var verdict = verdictOf(row.scoreHit, reference.status, reference.required);
      row.referenceStatus = reference.status;
      row.required = reference.required;
      row.referenceError = reference.error;
      row.qualifiedHit = verdict.qualifiedHit;
      row.shallow = verdict.shallow;
      if (entry.rating && entry.rating.solved === true) {
        try {
          var again = D.rate(entry.model, entry.givens, { collectSteps: true, budget: budget });
          var chains = chainsOf(again.steps);
          row.chainLengths = chains.lengths;
          row.nishioDepths = chains.depths;
          var returned = entry.rating;
          var same = again.solved === returned.solved && again.score === returned.score &&
            again.empties === returned.empties && sameCounts(again.techniqueCounts, returned.techniqueCounts);
          row.pathCheck = same ? { status: 'ok', error: null } : { status: 'mismatch', error: {
            code: 'diagnostic.pathMismatch',
            message: 'the final path rates ' + again.score + ' where the generation returned ' +
              entry.rating.score + ' (or its technique counts differ)' } };
        } catch (err) {
          row.pathCheck = { status: 'error', error: errorOf(err) };
        }
      }
    }
    row.diagnosticMs = Math.round((env.now() - started) * 1000) / 1000;
  }

  // ---------------------------------------------------------------------------------------------
  // Ledger and text
  // ---------------------------------------------------------------------------------------------

  /** The ledger (schema 1) of the rows so far; `complete` is true only when the run has finished. */
  function ledgerOf(parts) {
    return {
      schema: SCHEMA,
      complete: parts.complete === true,
      meta: parts.meta,
      rows: parts.rows,
      summary: { all: summaryOf(parts.rows), cells: cellsOf(parts.rows), checks: parts.checks || null }
    };
  }

  /** The text of a ledger: two-space JSON, CRLF line ends and a final newline. */
  function ledgerText(ledger) {
    return JSON.stringify(ledger, null, 2).replace(/\n/g, '\r\n') + '\r\n';
  }

  function pct(value) {
    return value === null ? '-' : (value * 100).toFixed(0) + '%';
  }

  function num(value) {
    return value === null || value === undefined ? '-' : (Math.round(value * 1000) / 1000).toString();
  }

  function listOf(table) {
    var keys = Object.keys(table);
    return keys.length === 0 ? '-' : keys.map(function (key) { return key + ' ' + table[key]; }).join(', ');
  }

  function statsLine(label, stats) {
    if (stats.n === 0) return '    ' + label + ': no value';
    var d = stats.deciles;
    return '    ' + label + ' (n=' + stats.n + '): min ' + num(d[0]) + ', p10 ' + num(d[1]) + ', p50 ' +
      num(d[5]) + ', p90 ' + num(d[9]) + ', max ' + num(d[10]) + ', upper median ' + num(stats.upperMedian);
  }

  /** The text report of the cells of a ledger summary, for the soak output. */
  function summaryLines(summary) {
    var lines = [];
    Object.keys(summary.cells).forEach(function (key) {
      var cell = summary.cells[key];
      var chains = cell.chains;
      lines.push('');
      lines.push('== ' + key + ': ' + cell.requests + ' requests, ' + cell.errors + ' errors, ' +
        cell.unrated + ' unrated, ' + cell.inBand + ' solved in band ==');
      lines.push('  old hits ' + cell.oldHits.count + '/' + cell.oldHits.denominator + ' (' +
        pct(cell.oldHits.share) + '), qualified hits ' + cell.qualifiedHits.count + '/' +
        cell.qualifiedHits.denominator + ' (' + pct(cell.qualifiedHits.share) + '), shallow ' +
        cell.shallow.count + '/' + cell.shallow.denominator + ' (' + pct(cell.shallow.share) + '; ' +
        cell.shallow.checked + ' with a reference verdict)');
      lines.push('  reference: ' + listOf(cell.references) + '; final path: ' + listOf(cell.pathChecks));
      ['exact', 'inBand'].forEach(function (name) {
        var cohort = cell.cohorts[name];
        lines.push('  cohort ' + (name === 'exact' ? 'exact (old hits)' : 'all in band') + ': ' + cohort.n +
          ' puzzles, peak ' + listOf(cohort.peaks));
        lines.push(statsLine('raw position', cohort.raw));
        lines.push(statsLine('adjusted position', cohort.adjusted));
        lines.push('    adjusted undefined: ' + listOf(cohort.nullReasons));
      });
      lines.push('  forcing-chain steps (' + chains.forcingChain.puzzles + ' of ' + chains.measured +
        ' rated paths): length ' + listOf(chains.forcingChain.stepHistogram) + '; per-puzzle maximum ' +
        listOf(chains.forcingChain.maxHistogram));
      lines.push('  nishio steps (' + chains.nishio.puzzles + ' of ' + chains.measured +
        ' rated paths): depth ' + listOf(chains.nishio.stepHistogram) + '; per-puzzle maximum ' +
        listOf(chains.nishio.maxHistogram));
    });
    return lines;
  }

  SG.fixtures.difficultyDiagnostics = {
    SCHEMA: SCHEMA,
    PEAK_BOUND: PEAK_BOUND,
    REFERENCE_BUDGET_MS: REFERENCE_BUDGET_MS,
    REASONS: REASONS.slice(),
    positionOf: positionOf,
    upperMedianOf: upperMedianOf,
    decilesOf: decilesOf,
    statsOf: statsOf,
    summaryOf: summaryOf,
    cellsOf: cellsOf,
    errorOf: errorOf,
    rowOf: rowOf,
    referenceOf: referenceOf,
    verdictOf: verdictOf,
    chainsOf: chainsOf,
    diagnose: diagnose,
    ledgerOf: ledgerOf,
    ledgerText: ledgerText,
    summaryLines: summaryLines
  };
})();
