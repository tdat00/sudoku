/**
 * Helpers of the performance and regression checks (design.md sections 9.1 and 15, task T-6.2), shared by
 * tests/perf.js (a Node script), tests/suites/perf.test.js and the browser test page. Exposed as
 * SG.fixtures.perfTools.
 *
 *  - PERF_TARGETS    the p95 budgets of design.md section 9.1 in milliseconds, by variant and level.
 *  - measure()       p50 / p95 / max of the generation time of one (variant, level) cell.
 *  - SEEDS, COMBOS, hashOf(), recordAll(), render()   the regression hashes of tests/fixtures/regression.js.
 *
 * Regression hashes. What is hashed is everything that makes up the puzzle a person gets, so that a change
 * of any part shows: the givens and the solution, the cages and signs of Killer / Greater-Than (the model
 * of the returned puzzle), the region of every cell (jigsaw boards differ per seed) and the symbols of
 * Wordoku. Not hashed: the rating, the timings and the trace, which a change of the cost table or of the
 * event wording may move without changing the puzzle. The performance work of task T-6.2 may only change how
 * fast a puzzle is made, never which puzzle a (configuration, seed) pair gives; `node tests/perf.js
 * --update-hashes` (or `SG_UPDATE_HASHES=1 node tests/node-runner.js --suite=perf`) records the hashes of the
 * current code on purpose, after a change that is meant to alter puzzles (a calibration, a new dig rule).
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};
  SG.fixtures = SG.fixtures || {};

  // ---------------------------------------------------------------------------------------------
  // Performance targets (design.md section 9.1: p95 over 50 runs, trace 'summary')
  // ---------------------------------------------------------------------------------------------

  /** The columns of the table of section 9.1. */
  var TARGET_LEVELS = ['veryEasy', 'medium', 'hard', 'expert', 'evil'];

  function row(veryEasy, medium, hard, expert, evil) {
    var r = {};
    [veryEasy, medium, hard, expert, evil].forEach(function (ms, i) {
      if (ms !== null) r[TARGET_LEVELS[i]] = ms;
    });
    return r;
  }

  /**
   * p95 budgets in milliseconds. A level that is missing has no cell in the table (the variant does not offer
   * it). classic4 and classic6 offer 'easy' where the table has a 'medium' column, so that column is read as
   * their 'easy' target (as tests/soak.js does).
   */
  var PERF_TARGETS = {
    classic4: { veryEasy: 10, easy: 20 },
    classic6: { veryEasy: 10, easy: 20 },
    classic9: row(60, 150, 400, 900, 2500),
    diagonalX: row(80, 200, 500, 1200, 3000),
    hyper: row(80, 200, 500, 1200, 3000),
    jigsaw9: row(150, 350, 900, 2000, 5000),
    wordoku: row(100, 250, 600, 1500, null),
    killer: row(300, 700, 1800, 4000, null),
    greaterThan: row(300, 700, 1800, 4000, null),
    mega12: row(400, 1000, 3000, null, null),
    mega16: row(1500, 4000, 10000, null, null),
    butterfly: row(1000, 3000, 8000, null, null),
    samurai: row(3000, 8000, 20000, null, null),
    flower: row(3000, 8000, 20000, null, null),
    sohei: row(3000, 8000, 20000, null, null)
  };

  /**
   * The cells of the table: every { variant, level, target } the variant really offers
   * (`difficultySupport`), in table order.
   * @returns {Array<{variant: string, level: string, target: number, key: string}>}
   */
  function cells() {
    var out = [];
    Object.keys(PERF_TARGETS).forEach(function (variant) {
      var support = SG.variants.has(variant) ? SG.variants.get(variant).difficultySupport : [];
      Object.keys(PERF_TARGETS[variant]).forEach(function (level) {
        if (support.indexOf(level) === -1) return;
        out.push({
          variant: variant, level: level, target: PERF_TARGETS[variant][level], key: variant + '/' + level
        });
      });
    });
    return out;
  }

  /** Nearest-rank percentile of a sorted array. */
  function percentile(sorted, p) {
    if (sorted.length === 0) return 0;
    return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))];
  }

  function nowMs() {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now() : Date.now();
  }

  /**
   * Times `runs` generations of one cell: `SG.pipeline.run` with trace 'summary' and a sink that drops every
   * event, on seeds that depend only on `seedBase` (so two measurements make the same puzzles).
   * @param {string} variant
   * @param {string} level
   * @param {number} runs
   * @param {Object} [options]
   * @param {number} [options.seedBase=7000]
   * @param {string} [options.trace='summary']
   * @returns {{runs: number, p50: number, p95: number, max: number, mean: number, times: number[]}}
   */
  function measure(variant, level, runs, options) {
    var opts = options || {};
    var seedBase = opts.seedBase !== undefined ? opts.seedBase : 7000;
    var trace = opts.trace !== undefined ? opts.trace : 'summary';
    var sink = function () {};
    var times = [];
    for (var i = 0; i < runs; i++) {
      var t0 = nowMs();
      SG.pipeline.run({ variantId: variant, difficulty: level, seed: seedBase + i * 101, trace: trace },
        sink);
      times.push(nowMs() - t0);
    }
    var sorted = times.slice().sort(function (a, b) { return a - b; });
    var sum = times.reduce(function (a, b) { return a + b; }, 0);
    return {
      runs: runs,
      p50: percentile(sorted, 0.5),
      p95: percentile(sorted, 0.95),
      max: sorted[sorted.length - 1],
      mean: sum / Math.max(1, runs),
      times: times
    };
  }

  // ---------------------------------------------------------------------------------------------
  // Regression hashes
  // ---------------------------------------------------------------------------------------------

  /** 20 fixed seeds (the Fibonacci numbers), the same for every combination. */
  var SEEDS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946];

  /**
   * The combinations that are pinned: every variant at least once, the classic boards and the variants with
   * their own dig strategy or structure (killer, greaterThan, jigsaw9, wordoku) at several levels. Heavy
   * boards use an easier level, so that the whole check stays within a few seconds.
   */
  var COMBOS = [
    ['classic4', 'veryEasy'], ['classic4', 'easy'], ['classic6', 'easy'],
    ['classic9', 'veryEasy'], ['classic9', 'easy'], ['classic9', 'medium'], ['classic9', 'hard'],
    ['classic9', 'expert'], ['classic9', 'evil'],
    ['mega12', 'medium'], ['mega16', 'easy'],
    ['diagonalX', 'easy'], ['diagonalX', 'evil'], ['hyper', 'hard'],
    ['jigsaw9', 'medium'], ['jigsaw9', 'expert'],
    ['killer', 'easy'], ['killer', 'hard'],
    ['greaterThan', 'medium'], ['greaterThan', 'hard'],
    ['samurai', 'easy'], ['sohei', 'veryEasy'], ['butterfly', 'medium'], ['flower', 'medium'],
    ['wordoku', 'medium']
  ].map(function (pair) { return { variant: pair[0], level: pair[1], key: pair[0] + '/' + pair[1] }; });

  var HASH_OFFSETS = [0x811c9dc5, 0x2545f491];

  /** Two FNV-1a 32-bit hashes with different offsets, as 16 hex digits (64 bits; no dependency needed). */
  function hash64(text) {
    var out = '';
    for (var p = 0; p < HASH_OFFSETS.length; p++) {
      var h = HASH_OFFSETS[p] >>> 0;
      for (var i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
      }
      out += ('00000000' + h.toString(16)).slice(-8);
    }
    return out;
  }

  /** The text that is hashed for a PuzzleResult (see the file header). */
  function serialize(result) {
    var model = result.model;
    var parts = [
      'g:' + Array.prototype.join.call(result.givens, ','),
      's:' + Array.prototype.join.call(result.solution, ','),
      'r:' + Array.prototype.join.call(model.layout.cellRegion, ',')
    ];
    parts.push('c:' + model.cages.map(function (cage) {
      return Array.prototype.join.call(cage.cells, '.') + '=' + cage.sum;
    }).join(';'));
    parts.push('q:' + model.inequalities.map(function (q) { return q.a + '<' + q.b; }).join(';'));
    parts.push('y:' + (model.symbols && model.symbols.labels ? model.symbols.labels.join('') : ''));
    return parts.join('|');
  }

  /** Generates the puzzle of one (variant, level, seed) through the pipeline and returns its hash. */
  function hashOf(variant, level, seed) {
    var result = SG.pipeline.run({ variantId: variant, difficulty: level, seed: seed, trace: 'off' }, null);
    return hash64(serialize(result));
  }

  /** Hashes of every seed of one combination. */
  function hashesOf(combo) {
    return SEEDS.map(function (seed) { return hashOf(combo.variant, combo.level, seed); });
  }

  /** Hashes of every combination: { 'variant/level': [hash per seed] }. */
  function recordAll(onProgress) {
    var table = {};
    COMBOS.forEach(function (combo) {
      table[combo.key] = hashesOf(combo);
      if (onProgress) onProgress(combo);
    });
    return table;
  }

  /** The source text of tests/fixtures/regression.js for a { 'variant/level': [hashes] } table. */
  function render(table) {
    var lines = [];
    lines.push('/**');
    lines.push(' * Regression hashes of generated puzzles: for each (variant, level) combination the hash');
    lines.push(' * of the puzzle that the pipeline gives for each of the 20 fixed seeds (see perf-helper.js).');
    lines.push(' * GENERATED FILE - never edit by hand. Record the hashes of the current code on purpose');
    lines.push(' * with');
    lines.push(' *   node tests/perf.js --update-hashes');
    lines.push(' * or SG_UPDATE_HASHES=1 node tests/node-runner.js --suite=perf');
    lines.push(' * after a change that is meant to alter puzzles (a calibration, a new dig rule). A change');
    lines.push(' * that must not alter them (an optimisation) leaves this file as it is: the suite "perf"');
    lines.push(' * fails when a puzzle of a recorded (configuration, seed) pair differs.');
    lines.push(' */');
    lines.push('(function () {');
    lines.push('  \'use strict\';');
    lines.push('');
    lines.push('  var root = typeof self !== \'undefined\' ? self : globalThis;');
    lines.push('  var SG = root.SG = root.SG || {};');
    lines.push('  SG.fixtures = SG.fixtures || {};');
    lines.push('');
    lines.push('  SG.fixtures.regression = {');
    lines.push('    version: 1,');
    lines.push('    seeds: [' + SEEDS.join(', ') + '],');
    lines.push('    hashes: {');
    var keys = Object.keys(table);
    keys.forEach(function (key, k) {
      lines.push('      \'' + key + '\': [');
      var list = table[key];
      for (var i = 0; i < list.length; i += 4) {
        var chunk = list.slice(i, i + 4).map(function (h) { return '\'' + h + '\''; }).join(', ');
        lines.push('        ' + chunk + (i + 4 < list.length ? ',' : ''));
      }
      lines.push('      ]' + (k + 1 < keys.length ? ',' : ''));
    });
    lines.push('    }');
    lines.push('  };');
    lines.push('})();');
    return lines.join('\n') + '\n';
  }

  SG.fixtures.perfTools = {
    PERF_TARGETS: PERF_TARGETS,
    TARGET_LEVELS: TARGET_LEVELS,
    cells: cells,
    percentile: percentile,
    measure: measure,
    SEEDS: SEEDS,
    COMBOS: COMBOS,
    hash64: hash64,
    serialize: serialize,
    hashOf: hashOf,
    hashesOf: hashesOf,
    recordAll: recordAll,
    render: render
  };
})();
