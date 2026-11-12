/**
 * Helpers of the performance and regression checks (design.md sections 9.1 and 15), shared by
 * tests/perf.js (a Node script), tests/manual/perf.test.js and the browser test page. Exposed as
 * SG.fixtures.perfTools.
 *
 *  - PERF_TARGETS    the p95 budgets of design.md section 9.1 in milliseconds, by variant and level.
 *  - measure()       p50 / p95 / max of the generation time of one (variant, level) cell.
 *  - SEEDS, COMBOS, hashOf(), recordAll(), render()   the regression hashes of tests/fixtures/regression.js.
 *  - hashManifest(), planHashSelection(), planHashRun(), hashRecord(), hashLedger(), mergeHashLedgers(),
 *    tableOf(), compareHashes(), toCrlf()   the bounded modes of `node tests/perf.js` (--hash-key,
 *    --hash-record, --hash-merge, ...): the fixed list of the 520 (combination, seed) records, the validation
 *    of a selection and of a command line, ledgers of selected records and their complete merge. Pure, no
 *    file system.
 *
 * Regression hashes. What is hashed is everything that makes up the puzzle a person gets, so that a change
 * of any part shows: the givens and the solution, the cages and signs of Killer / Greater-Than (the model
 * of the returned puzzle), the region of every cell (jigsaw boards differ per seed) and the symbols of
 * Wordoku. Not hashed: the rating, the timings and the trace, which a change of the cost table or of the
 * event wording may move without changing the puzzle. Performance work may only change how fast a puzzle
 * is made, never which puzzle a (configuration, seed) pair gives; `node tests/perf.js
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

  /** The columns of the table of section 9.1: the nine levels of rating v2. */
  var TARGET_LEVELS = ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1',
    'hell2'];

  function row() {
    var r = {};
    Array.prototype.slice.call(arguments).forEach(function (ms, i) {
      if (ms !== null) r[TARGET_LEVELS[i]] = ms;
    });
    return r;
  }

  /**
   * p95 budgets in milliseconds, one per level a variant offers (null: not offered). Rating v2: a target the
   * table had before is kept while the qualification (`node tests/qualify.js`) meets it; easy takes the one
   * of normal; a new cell, or one whose old target the qualification's p95 exceeds, is three times that p95
   * rounded up, never below the target of the level before and never above the budget of the qualification
   * (2 s for 4x4 and 6x6, 10 s up to 81 cells, 30 s above).
   */
  var PERF_TARGETS = {
    classic4: row(10, null, null, null, null, null, null, null, null),
    classic6: row(10, null, null, 350, null, null, null, null, null),
    classic9: row(60, 150, 150, 400, 400, 900, 2500, 2500, null),
    diagonalX: row(80, 200, 200, 500, 500, 1200, 3000, 3000, 3000),
    hyper: row(80, 200, 200, 500, 500, 1200, 3000, 3000, 5000),
    jigsaw9: row(150, 350, 350, 900, 900, 2000, 5000, 5000, 5000),
    wordoku: row(100, 250, 250, 600, 600, 1500, 1500, 2500, null),
    killer: row(300, 700, 700, 1800, 10000, 10000, 10000, 10000, 10000),
    greaterThan: row(300, 700, 700, 6000, 10000, 10000, 10000, 10000, 10000),
    mega12: row(400, 1000, 1000, 3000, 3000, 3000, 3000, 4500, 16000),
    mega16: row(1500, 4000, 4000, 10000, 10000, 10000, 10000, 10000, 10000),
    butterfly: row(1000, 3000, 3000, 8000, 8000, 8000, 8000, 8000, 15000),
    samurai: row(3000, 8000, 8000, 20000, 20000, 20000, 20000, 20000, 30000),
    flower: row(3000, 8000, 8000, 20000, 20000, 20000, 20000, 20000, 20000),
    sohei: row(3000, 8000, 8000, 20000, 20000, 20000, 20000, 20000, 20000)
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
    ['classic4', 'veryEasy'], ['classic6', 'veryEasy'], ['classic6', 'hard'],
    ['classic9', 'veryEasy'], ['classic9', 'easy'], ['classic9', 'normal'], ['classic9', 'hard'],
    ['classic9', 'expert'], ['classic9', 'master'], ['classic9', 'nightmare'],
    ['mega12', 'normal'], ['mega16', 'easy'],
    ['diagonalX', 'easy'], ['diagonalX', 'nightmare'], ['hyper', 'hard'],
    ['jigsaw9', 'normal'], ['jigsaw9', 'master'],
    ['killer', 'easy'], ['killer', 'hard'],
    ['greaterThan', 'normal'], ['greaterThan', 'hard'],
    ['samurai', 'easy'], ['sohei', 'veryEasy'], ['butterfly', 'normal'], ['flower', 'normal'],
    ['wordoku', 'normal']
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

  /**
   * Generates the puzzle of one (variant, level, seed) through the pipeline and returns its hash and whether
   * the level had to be offered for it. The hash corpus is fixed even where the qualification hides a level:
   * `SG.fixtures.toolRecords.withRequestedLevel` offers the missing level to this one call and puts the exact
   * original support array back in `finally`. A diagnostic of the test tools only: no production support list
   * changes, and it does not mean that the level is offered.
   */
  function hashRecord(variant, level, seed) {
    var records = SG.fixtures.toolRecords;
    if (!records) throw new Error('hashOf needs tests/fixtures/tool-records.js (the hidden-level guard)');
    var run = records.withRequestedLevel(variant, level, function () {
      return SG.pipeline.run({ variantId: variant, difficulty: level, seed: seed, trace: 'off' }, null);
    });
    return { hash: hash64(serialize(run.value)), overridden: run.overridden };
  }

  /** Generates the puzzle of one (variant, level, seed) through the pipeline and returns its hash. */
  function hashOf(variant, level, seed) {
    return hashRecord(variant, level, seed).hash;
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
    lines.push(' * of the puzzle that the pipeline gives for each of the 20 fixed seeds ' +
      '(see perf-helper.js).');
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

  // ---------------------------------------------------------------------------------------------
  // Bounded hash records (difficulty v3, MS03d): selection, command-line plan, ledgers, complete merge
  // ---------------------------------------------------------------------------------------------

  var HASH_KIND = 'regression-hashes';
  /** Where a hash record keeps its identity and its data (see SG.fixtures.toolRecords). */
  var HASH_SHAPE = { request: ['variant', 'level', 'seed'], value: ['hash'] };

  /**
   * The 520 records of the corpus in table order, combination by combination and seed by seed:
   * { key: 'variant/level#seed', request: { variant, level, seed } }. It follows COMBOS and SEEDS, never the
   * expected hashes of the fixture.
   */
  function hashManifest() {
    var out = [];
    COMBOS.forEach(function (combo) {
      SEEDS.forEach(function (seed) {
        out.push({ key: combo.key + '#' + seed,
          request: { variant: combo.variant, level: combo.level, seed: seed } });
      });
    });
    return out;
  }

  function given(value) {
    return value !== null && value !== undefined;
  }

  function wholeNumber(flag, text) {
    if (!/^\d+$/.test(String(text))) throw new Error(flag + '=' + text + ' is not a whole number');
    return parseInt(text, 10);
  }

  /**
   * The records picked by --hash-key, --hash-from and --hash-count (their raw texts, or null/undefined when
   * not given): one exact combination of COMBOS, or all of them, and `count` consecutive seed indexes from
   * `from` (default 0; default count: up to the last seed). A selection keeps the manifest order.
   * @returns {{ entries: Array, complete: boolean, total: number, label: string }}
   * @throws {Error} for an unknown key, a non-numeric value or a range outside the 20 seed indexes
   */
  function planHashSelection(sel) {
    var key = given(sel.key) ? String(sel.key) : null;
    var last = SEEDS.length - 1;
    var combos = COMBOS;
    if (key !== null) {
      combos = COMBOS.filter(function (combo) { return combo.key === key; });
      if (combos.length === 0) {
        throw new Error('--hash-key=' + key + ' is not a combination of the corpus (known: ' +
          COMBOS.map(function (combo) { return combo.key; }).join(', ') + ')');
      }
    }
    var from = given(sel.from) ? wholeNumber('--hash-from', sel.from) : 0;
    if (from > last) throw new Error('--hash-from=' + from + ' is outside the seed indexes 0..' + last);
    var count = given(sel.count) ? wholeNumber('--hash-count', sel.count) : SEEDS.length - from;
    if (count < 1) throw new Error('--hash-count=' + count + ' is not a positive number');
    if (from + count > SEEDS.length) {
      throw new Error('--hash-count=' + count + ' from index ' + from + ' goes past the last seed index ' +
        last + ' (at most ' + (SEEDS.length - from) + ')');
    }
    var entries = hashManifest().filter(function (entry) {
      var index = SEEDS.indexOf(entry.request.seed);
      return index >= from && index < from + count &&
        combos.some(function (combo) { return combo.variant === entry.request.variant &&
          combo.level === entry.request.level; });
    });
    var seeds = from === 0 && count === SEEDS.length ? 'all ' + SEEDS.length + ' seeds' :
      'seed indexes ' + from + (count > 1 ? '-' + (from + count - 1) : '') + ' (seeds ' +
      SEEDS.slice(from, from + count).join(', ') + ')';
    return {
      entries: entries,
      complete: entries.length === COMBOS.length * SEEDS.length,
      total: COMBOS.length * SEEDS.length,
      label: (key !== null ? key : 'all ' + COMBOS.length + ' combinations') + ', ' + seeds
    };
  }

  /**
   * The mode of a perf.js command line, decided before anything is generated or written. `o` has the options
   * as given: check, update, list (booleans), key, from, count, record, merge, out (texts or null), alloc
   * (boolean) and `timing`, the names of the timing options present (--variant, --runs, ...).
   *   { mode: 'timing' }                         no hash option: the measurement as before
   *   { mode: 'check' | 'update', from: 'generate' | 'merge', selection, directory, out }
   *   { mode: 'record', selection, file }        the selected records into a ledger, nothing else
   *   { mode: 'list', selection }                the selected identities, without generation
   * Without a hash selector, --check-hashes and --update-hashes mean what they always meant (every record,
   * generated), and the timing options are ignored as before.
   * @throws {Error} for options that conflict, a selection outside the corpus or a partial canonical update
   */
  function planHashRun(o) {
    var selecting = given(o.key) || given(o.from) || given(o.count);
    var on = { check: o.check === true, update: o.update === true, record: given(o.record),
      merge: given(o.merge), out: given(o.out), list: o.list === true };
    var named = { check: '--check-hashes', update: '--update-hashes', record: '--hash-record',
      merge: '--hash-merge', out: '--hash-out', list: '--hash-list' };
    var explicit = selecting || on.record || on.merge || on.out || on.list;
    if (!explicit && !on.check && !on.update) return { mode: 'timing' };
    if (o.alloc) throw new Error('--alloc cannot be combined with the hash modes (--check-hashes, ' +
      '--update-hashes, --hash-*)');
    var timing = o.timing || [];
    if (explicit && timing.length > 0) {
      throw new Error('the timing options (' + timing.join(', ') + ') do not pick hash records; the hash ' +
        'modes take --hash-key, --hash-from and --hash-count');
    }
    if (on.check && on.update) throw new Error('--check-hashes and --update-hashes conflict: choose one');
    var refuse = function (flag, names) {
      var other = names.filter(function (name) { return on[name]; })[0];
      if (other) throw new Error(flag + ' cannot be combined with ' + named[other]);
    };
    var path = given(o.out) ? o.out : null;
    if (on.list) {
      refuse('--hash-list', ['check', 'update', 'record', 'merge', 'out']);
      return { mode: 'list', selection: planHashSelection(o) };
    }
    if (on.record) {
      refuse('--hash-record', ['check', 'update', 'merge', 'out']);
      return { mode: 'record', selection: planHashSelection(o), file: o.record };
    }
    if (on.out && !on.update) throw new Error('--hash-out only goes with --update-hashes');
    if (on.merge) {
      if (selecting) {
        throw new Error('--hash-merge needs the complete corpus and cannot be combined with --hash-key, ' +
          '--hash-from or --hash-count');
      }
      return { mode: on.update ? 'update' : 'check', from: 'merge', selection: planHashSelection({}),
        directory: o.merge, out: path };
    }
    if (!on.check && !on.update) {
      throw new Error('--hash-key, --hash-from and --hash-count need --check-hashes, --hash-record or ' +
        '--hash-list');
    }
    var selection = planHashSelection(o);
    if (on.update && !selection.complete) {
      throw new Error('a canonical update needs the complete corpus of ' + selection.total + ' records, ' +
        'not the partial selection ' + selection.label + '; record shards with --hash-record and merge ' +
        'them with --hash-merge');
    }
    return { mode: on.update ? 'update' : 'check', from: 'generate', selection: selection, out: path };
  }

  /**
   * A ledger of generated records: `meta` has sourceHash, manifestHash, node, commit, dirty (and generatedAt,
   * argv); `results` is [{ variant, level, seed, hash, ms, overrides }] in any order. The record of the
   * ledger is { key: 'variant/level#seed', variant, level, seed, hash, ms, overrides }.
   */
  function hashLedger(meta, results) {
    var info = { kind: HASH_KIND, sourceHash: meta.sourceHash, manifestHash: meta.manifestHash,
      node: meta.node, commit: meta.commit, dirty: meta.dirty, generatedAt: meta.generatedAt,
      argv: meta.argv };
    return SG.fixtures.toolRecords.ledgerOf(info, results.map(function (r) {
      return { key: r.variant + '/' + r.level + '#' + r.seed,
        request: { variant: r.variant, level: r.level, seed: r.seed }, value: { hash: r.hash },
        ms: r.ms, overrides: r.overrides };
    }), HASH_SHAPE);
  }

  /** The table { 'variant/level': [hash per seed] } of complete merged records, in COMBOS and SEEDS order. */
  function tableOf(records) {
    var byKey = {};
    records.forEach(function (record) { byKey[record.key] = record.value.hash; });
    var table = {};
    COMBOS.forEach(function (combo) {
      table[combo.key] = SEEDS.map(function (seed) {
        var hash = byKey[combo.key + '#' + seed];
        if (hash === undefined) {
          throw new Error(combo.key + '#' + seed + ' has no record: the merge is not complete');
        }
        return hash;
      });
    });
    return table;
  }

  /**
   * Merges hash ledgers ([{ name, ledger }] or { name, error }) against the current identity ({ sourceHash,
   * manifestHash }). Valid only when every ledger is of kind 'regression-hashes' from the current sources and
   * the current manifest and every one of the 520 keys has exactly one well-formed record.
   * @returns {{ ok: boolean, problems: string[], records: Array|null, table: Object|null }}
   */
  function mergeHashLedgers(files, identity) {
    var merged = SG.fixtures.toolRecords.merge(files, {
      kind: HASH_KIND, sourceHash: identity.sourceHash, manifestHash: identity.manifestHash,
      manifest: hashManifest(), shape: HASH_SHAPE,
      checkValue: function (value) {
        return typeof value.hash === 'string' && /^[0-9a-f]{16}$/.test(value.hash) ? null :
          'has a hash that is not 16 hexadecimal digits';
      }
    });
    return { ok: merged.ok, problems: merged.problems, records: merged.records,
      table: merged.ok ? tableOf(merged.records) : null };
  }

  /**
   * Compares generated or merged records ([{ variant, level, seed, hash }]) with a recorded table
   * ({ hashes: { 'variant/level': [hash per seed] } } or null): how many were checked, how many differ, the
   * seeds that changed per combination and the combinations the table does not have at all.
   */
  function compareHashes(recorded, results) {
    var groups = {};
    var order = [];
    results.forEach(function (r) {
      var key = r.variant + '/' + r.level;
      var group = groups[key];
      if (!group) {
        group = groups[key] = { key: key, seeds: [], total: 0, saved: recorded && recorded.hashes ?
          recorded.hashes[key] : undefined };
        order.push(group);
      }
      group.total++;
      if (group.saved && group.saved[SEEDS.indexOf(r.seed)] !== r.hash) group.seeds.push(r.seed);
    });
    var out = { checked: results.length, bad: 0, changed: [], missing: [] };
    order.forEach(function (group) {
      if (!group.saved) {
        out.missing.push(group.key);
        out.bad += group.total;
      } else if (group.seeds.length > 0) {
        out.changed.push({ key: group.key, seeds: group.seeds });
        out.bad += group.seeds.length;
      }
    });
    return out;
  }

  /** The text with CRLF line ends (the form of every file of the repository), whatever it had. */
  function toCrlf(text) {
    return text.replace(/\r?\n/g, '\r\n');
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
    render: render,
    HASH_KIND: HASH_KIND,
    HASH_SHAPE: HASH_SHAPE,
    hashManifest: hashManifest,
    planHashSelection: planHashSelection,
    planHashRun: planHashRun,
    hashRecord: hashRecord,
    hashLedger: hashLedger,
    mergeHashLedgers: mergeHashLedgers,
    tableOf: tableOf,
    compareHashes: compareHashes,
    toCrlf: toCrlf
  };
})();
