/**
 * Projection, canonical text and command line of the replay golden recorders (difficulty v3, MS03a).
 * Exposed as SG.fixtures.replayRecording; test tooling used by tests/replay-goldens.js and
 * tests/replay-fixtures.js, pure apart from the `env` that the tools pass in (files, clock, git, hashes).
 *
 *  - goldenOf(entry, analysis, model)   the golden record { id, request, today, counts, board, rows, details,
 *                                       alive, folds, jumps } of SG.fixtures.replayGoldens, projected from
 *                                       an SG.replay.analyse result. `entry` is { id, request, today }: the
 *                                       recipe and the historical annotation are kept, every other field is
 *                                       read from the analysis, with the comparisons of the golden tests of
 *                                       replay.test.js as the field specification. Timings and the work
 *                                       counts `checks` are no part of the record, as the `stable` helper of
 *                                       that suite leaves them out.
 *  - renderGoldens(records)             the canonical text of tests/fixtures/replay-goldens.js (CRLF)
 *  - runCli(env, spec, argv)            the bounded modes --check, --write, --ids, --record, --merge, --out
 *                                       and --list
 *
 * Projection conventions: absent display fields are the dash U+2014; the delta of the first step is 0 and
 * the delta of a step without a score is null; F and N come from the tiers `first` and `newPeak` of the
 * transition into the step; the terms P, W, R and V of a jump have six decimals (the precision of the
 * fixture, no new rounding of the scoring); a choice is recorded only for kind `guided` (the other kinds
 * are the suite's table of unrecorded candidates).
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};
  SG.fixtures = SG.fixtures || {};

  var NONE = '\u2014';
  var WIRE_IDS = ['G09', 'G10', 'G11', 'G12', 'G13'];
  var FIELDS = ['id', 'request', 'today', 'counts', 'board', 'rows', 'details', 'alive', 'folds', 'jumps'];
  // What no comparison reads: the timings of a result and the work counts of the analysis.
  var EXCLUDED = ['timings', 'ratings[].checks', 'stats.checks'];
  // The long number lists of the fixture are filled to this line length (the hand-wrapped baseline varies).
  var FILL_WIDTH = 117;

  function isScore(value) {
    return typeof value === 'number' && isFinite(value);
  }

  function sixDecimals(value) {
    return isScore(value) ? Number(value.toFixed(6)) : value;
  }

  function termsOf(t) {
    return {
      P: sixDecimals(t.P), W: sixDecimals(t.W), R: sixDecimals(t.R), V: sixDecimals(t.V), E: t.E,
      level: t.level
    };
  }

  /** The record of one golden request, projected from its analysis (see the file header). */
  function goldenOf(entry, analysis, model) {
    var R = SG.replay;
    var ratings = analysis.ratings;
    var moves = analysis.moves;
    var compact = analysis.views.compact.steps;
    var details = analysis.views.details.steps;
    var signs = analysis.signs;

    function labelOf(cell) {
      return SG.model.cellLabel(model, cell);
    }

    function frameLabel(frame) {
      if (frame === null || frame === undefined) return NONE;
      if (frame.kind === 'cell') return labelOf(frame.cell);
      var pair = signs[frame.sign];
      return 's' + frame.sign + '(' + labelOf(pair[0]) + '<' + labelOf(pair[1]) + ')';
    }

    function transitionInto(k) {
      return analysis.transitions[compact[k].transition];
    }

    var rows = compact.map(function (step, k) {
      var rating = ratings[step.position];
      var t = k === 0 ? null : transitionInto(k);
      var tier = t === null ? null : t.tier;
      var before = k === 0 ? null : ratings[compact[k - 1].position].score;
      var delta = k === 0 ? 0 : (isScore(rating.score) && isScore(before) ? rating.score - before : null);
      return [k + 1, step.position, R.phaseCode(step, analysis.structure), rating.empties, rating.score,
        delta, rating.hardest || NONE, tier === 'jump' ? 'Y' : NONE,
        t !== null && t.cause ? frameLabel(t.cause.frame) : NONE,
        tier === 'first' ? 'F' : tier === 'newPeak' ? 'N' : NONE];
    });

    var folds = [];
    var jumps = [];
    compact.forEach(function (step, k) {
      if (k === 0) return;
      var t = transitionInto(k);
      if (t.folded.peak !== null) {
        var opening = step.phases.indexOf('clues') !== -1;
        var removed = 0;
        for (var i = step.first; i <= step.last; i++) removed += moves[i].removed.length;
        var from = moves[step.first - 1].alive;
        var to = moves[step.position].alive;
        folds.push({
          step: k + 1, peak: t.folded.peak, end: ratings[step.position].score,
          removed: opening ? null : removed, restored: opening ? null : t.folded.revealed,
          signs: from && to ? from.length - to.length : 0, opening: opening
        });
      }
      if (t.tier === 'jump') jumps.push(jumpOf(k, t));
    });

    function jumpOf(k, t) {
      var cause = t.cause || null;
      var choice = t.choice || null;
      var proof = analysis.proofs ? analysis.proofs[t.to] : null;
      var use = proof ? proof.firstUse || null : null;
      var frame = cause ? frameLabel(cause.frame) : NONE;
      return {
        step: k + 1, from: t.before.total, to: t.after.total, before: termsOf(t.before),
        after: termsOf(t.after),
        choice: choice !== null && choice.kind === 'guided' ? {
          chosen: choice.chosen, others: choice.others, nulls: choice.nulls, max: choice.max, at: choice.at,
          rated: choice.rated, refused: choice.refused
        } : null,
        singles: cause ? cause.singles.map(function (s) {
          return { op: s.action, cell: labelOf(s.cell), score: s.score };
        }) : [],
        cause: cause ? cause.class : null,
        frame: frame === NONE ? null : frame,
        firstUse: use ? { k: use.k, n: use.n, technique: use.technique } : null,
        key: use ? use.i18nKey : null,
        effects: use ? 'remove candidate ' + (use.eliminations || []).map(function (p) {
          return p[1] + '@' + labelOf(p[0]);
        }).join(', ') : null
      };
    }

    var alive = null;
    if (compact.every(function (step) { return Array.isArray(moves[step.position].alive); })) {
      alive = compact.map(function (step) { return moves[step.position].alive.length; });
    }

    return {
      id: entry.id,
      request: entry.request,
      today: entry.today,
      counts: { compact: compact.length, details: details.length },
      board: {
        cells: model.cellCount, cages: model.cages.length, signsFrom: signs ? signs.length : 0,
        signsTo: signs ? model.inequalities.length : 0,
        log: analysis.fallback === null ? 'normal' : String(analysis.fallback)
      },
      rows: rows,
      details: details.map(function (step) { return ratings[step.position].score; }),
      alive: alive,
      folds: folds,
      jumps: jumps
    };
  }

  // ---------------------------------------------------------------------------------------------
  // The canonical text of tests/fixtures/replay-goldens.js
  // ---------------------------------------------------------------------------------------------

  var HEADER = [
    '/**',
    ' * Golden data of the Generation Steps replay: 14 requests of docs/generation-steps/gpt-6-astra/',
    ' * 4-acceptance-data.md.',
    ' * Generated by tests/replay-goldens.js (the analysis recorder of tests/fixtures/replay-recording.js):',
    ' * regenerate it with that tool when the generator changes on purpose, and check it with --check.',
    ' * SG.fixtures.replayGoldens = [{ id, request, today, counts, board, rows, details, alive, folds, ' +
      'jumps }].',
    ' * rows: [step, m, phase, E, score, delta, hardest, J, culprit, line] of the compact view.',
    ' * G09-G13 are read from SG.fixtures.replayWire (tests/fixtures/replay-wire.js); the others are ' +
      'generated.',
    ' * Only `id` and `request` (the recipe) and `today` are kept from the researchers. `today` is their',
    ' * historical annotation, not freshly verified output, and no suite reads it. Every other field is',
    ' * projected from the analysis of a freshly generated result; the fold fields removed, signs and',
    ' * opening are projected too, but no suite asserts them. Timings and the work counts `checks` are no',
    ' * part of the data.',
    ' */',
    '(function () {',
    "  'use strict';",
    '',
    "  var root = typeof self !== 'undefined' ? self : globalThis;",
    '  var SG = root.SG = root.SG || {};',
    '  SG.fixtures = SG.fixtures || {};',
    '',
    '  var GOLDENS = ['
  ];

  var FOOTER = [
    '  ];',
    '',
    '  SG.fixtures.replayGoldens = GOLDENS;',
    '})();',
    ''
  ];

  function quote(text) {
    if (/[\u0000-\u001f]/.test(text)) throw new Error('renderGoldens: a control character in a string');
    return "'" + text.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  }

  function literal(value) {
    if (value === null) return 'null';
    if (typeof value === 'number') {
      if (!isFinite(value)) throw new Error('renderGoldens: a number is not finite');
      return String(value);
    }
    if (typeof value === 'boolean') return String(value);
    if (typeof value === 'string') return quote(value);
    if (Array.isArray(value)) return '[' + value.map(literal).join(', ') + ']';
    if (typeof value === 'object') {
      var keys = Object.keys(value);
      if (keys.length === 0) return '{}';
      return '{ ' + keys.map(function (key) {
        return (/^[A-Za-z_$][\w$]*$/.test(key) ? key : quote(key)) + ': ' + literal(value[key]);
      }).join(', ') + ' }';
    }
    throw new Error('renderGoldens: not plain data (' + typeof value + ')');
  }

  // `name: [` + a list of numbers filled into lines of at most FILL_WIDTH characters, continued by 8 spaces.
  function filled(name, list) {
    if (list === null) return ['      ' + name + ': null,'];
    var first = '      ' + name + ': [';
    var lines = [];
    var line = first;
    var count = 0;
    list.forEach(function (item, i) {
      var text = literal(item) + (i < list.length - 1 ? ',' : '],');
      if (count > 0 && (line + ' ' + text).length > FILL_WIDTH) {
        lines.push(line);
        line = '        ' + text;
      } else {
        line += (count > 0 ? ' ' : '') + text;
      }
      count++;
    });
    if (list.length === 0) line += '],';
    lines.push(line);
    return lines;
  }

  function listOf(name, indent, items, last) {
    if (items.length === 0) return [indent + name + ': []' + (last ? '' : ',')];
    var lines = [indent + name + ': ['];
    items.forEach(function (item, i) {
      lines.push(indent + '  ' + literal(item) + (i < items.length - 1 ? ',' : ''));
    });
    lines.push(indent + ']' + (last ? '' : ','));
    return lines;
  }

  function jumpLines(j) {
    var lines = ['        {', '          step: ' + literal(j.step) + ', from: ' + literal(j.from) + ', to: ' +
      literal(j.to) + ',',
    '          before: ' + literal(j.before) + ',', '          after: ' + literal(j.after) + ',',
    '          choice: ' + literal(j.choice) + ','];
    if (j.singles.length <= 2) lines.push('          singles: ' + literal(j.singles) + ',');
    else lines = lines.concat(listOf('singles', '          ', j.singles, false));
    lines.push('          cause: ' + literal(j.cause) + ', frame: ' + literal(j.frame) + ',',
      '          firstUse: ' + literal(j.firstUse) + ', key: ' + literal(j.key) + ',',
      '          effects: ' + literal(j.effects), '        }');
    return lines;
  }

  function recordLines(g) {
    var lines = ['    {',
      '      id: ' + literal(g.id) + ', request: ' + literal(g.request) + ',',
      '      today: ' + literal(g.today) + ', counts: ' + literal(g.counts) + ',',
      '      board: ' + literal(g.board) + ',',
      '      // [#, m, phase, E, score, delta, hardest, J, culprit, line]'];
    lines = lines.concat(listOf('rows', '      ', g.rows, false));
    lines = lines.concat(filled('details', g.details), filled('alive', g.alive));
    lines = lines.concat(listOf('folds', '      ', g.folds, false));
    if (g.jumps.length === 0) {
      lines.push('      jumps: []');
    } else {
      lines.push('      jumps: [');
      g.jumps.forEach(function (j, i) {
        var own = jumpLines(j);
        if (i < g.jumps.length - 1) own[own.length - 1] += ',';
        lines = lines.concat(own);
      });
      lines.push('      ]');
    }
    lines.push('    }');
    return lines;
  }

  /** The canonical text of the golden fixture of records [{ key, request, value }] (a golden record each). */
  function renderGoldens(records) {
    var lines = HEADER.slice();
    records.forEach(function (record, i) {
      var own = recordLines(record.value);
      if (i < records.length - 1) own[own.length - 1] += ',';
      lines = lines.concat(own);
    });
    return lines.concat(FOOTER).join('\r\n');
  }

  // ---------------------------------------------------------------------------------------------
  // The command line: modes, conflicts, ledgers, merge (no file system: the tool passes `env`)
  // ---------------------------------------------------------------------------------------------

  function usageOf(spec) {
    var count = spec.manifest.length;
    var ids = spec.manifest[0].key + '..' + spec.manifest[count - 1].key;
    return [
      'Usage: node ' + spec.tool + ' [options]',
      '',
      '  (no option)           ' + (spec.defaultMode === 'write' ?
        'generate the ' + count + ' requests and write ' + spec.fixture : 'same as --check'),
      '  --check               generate the selected records in memory and compare them with',
      '                        ' + spec.fixture + '; no writes; exit 1, with the ID and the fields',
      '                        that differ, on a difference',
      '  --write               generate every record and write the complete ' + spec.fixture,
      '                        (a partial selection is refused)',
      '  --ids=G01,G02         only these records of the manifest (' + ids + '); an unknown or',
      '                        duplicate ID is an error',
      '  --record=<file.json>  generate the selected records into a ledger and write only that file',
      '                        (never a fixture)',
      '  --merge=<directory>   read the ledgers of a directory, require every key of the manifest',
      '                        exactly once from the current sources, then --check (the default) or',
      '                        --write, without generating',
      '  --out=<file.js>       with --write: write this project-relative file instead of',
      '                        ' + spec.fixture,
      '  --list                show the manifest and the identity of the sources, no generation',
      '  --help                show this help'
    ].join('\n');
  }

  function parseOptions(argv) {
    var opts = { check: false, write: false, list: false, help: false, ids: null, record: null, merge: null,
      out: null };
    argv.forEach(function (arg) {
      var m;
      if (arg === '--check') opts.check = true;
      else if (arg === '--write') opts.write = true;
      else if (arg === '--list') opts.list = true;
      else if (arg === '--help' || arg === '-h') opts.help = true;
      else if ((m = /^--(ids|record|merge|out)=(.*)$/.exec(arg))) {
        if (m[2] === '') throw new Error('--' + m[1] + ' needs a value');
        if (opts[m[1]] !== null) throw new Error('--' + m[1] + ' is given twice');
        opts[m[1]] = m[2];
      } else throw new Error('Unknown argument: ' + arg);
    });
    return opts;
  }

  /** The mode of a command line, or an Error for options that conflict (decided before any generation). */
  function planOf(opts, spec, argv) {
    var T = SG.fixtures.toolRecords;
    var alone = argv.length === 1;
    if (opts.help || opts.list) {
      if (!alone) {
        throw new Error('--' + (opts.help ? 'help' : 'list') + ' cannot be combined with other options');
      }
      return { mode: opts.help ? 'help' : 'list' };
    }
    var selected = function () {
      return opts.ids === null ? T.keysOf(spec.manifest) : T.selectKeys(spec.manifest, opts.ids);
    };
    if (opts.check && opts.write) throw new Error('--check and --write conflict: choose one');
    if (opts.record !== null) {
      var clash = opts.check ? 'check' : opts.write ? 'write' : opts.merge !== null ? 'merge' :
        opts.out !== null ? 'out' : null;
      if (clash !== null) throw new Error('--record cannot be combined with --' + clash);
      return { mode: 'record', keys: selected() };
    }
    if (opts.merge !== null && opts.ids !== null) {
      throw new Error('--merge reads the complete manifest and cannot be combined with --ids');
    }
    var mode = opts.check ? 'check' : opts.write ? 'write' : opts.merge !== null ? 'check' : spec.defaultMode;
    if (opts.out !== null && mode !== 'write') throw new Error('--out only goes with --write');
    var keys = selected();
    if (mode === 'write' && keys.length !== spec.manifest.length) {
      throw new Error('a write needs the complete manifest, not the partial selection ' + keys.join(',') +
        '; use --record for a shard');
    }
    return { mode: mode, keys: keys, merge: opts.merge, out: opts.out };
  }

  function sourcesOf(env, spec) {
    var T = SG.fixtures.toolRecords;
    var identity = env.identity(spec.extraFiles);
    return {
      kind: spec.kind, sourceHash: identity.sourceHash,
      manifestHash: env.sha256(T.manifestText(spec.manifest)),
      node: identity.node, commit: identity.commit, dirty: identity.dirty
    };
  }

  function cloneJson(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  /** Runs a recorder tool; returns the exit code. See usageOf for the options. */
  function runCli(env, spec, argv) {
    var T = SG.fixtures.toolRecords;
    var plan;
    var opts;
    try {
      opts = parseOptions(argv);
      plan = planOf(opts, spec, argv);
      if (plan.mode === 'record') env.checkPath(opts.record, { extension: '.json', notIn: 'tests/fixtures' });
      if (plan.out) env.checkPath(plan.out, { extension: '.js' });
      if (plan.merge) env.checkDirectory(plan.merge);
    } catch (err) {
      env.err(err.message + '\n\n' + usageOf(spec));
      return 1;
    }
    if (plan.mode === 'help') {
      env.out(usageOf(spec));
      return 0;
    }
    var fixtureName = spec.fixture.replace(/^.*\//, '');

    function entryOf(key) {
      return spec.manifest.filter(function (m) { return m.key === key; })[0];
    }

    // The differences of one fresh record with its saved one, printed; true when they agree.
    function compareOne(key, value) {
      var saved = cloneJson(spec.saved(key));
      if (saved === undefined) {
        env.out(key + ': no saved record in ' + spec.fixture);
        return false;
      }
      var diffs = T.diffValues(saved, cloneJson(value));
      if (diffs.length === 0) {
        env.out(key + ': matches ' + fixtureName);
        return true;
      }
      env.out(key + ': ' + diffs.length + ' field' + (diffs.length === 1 ? '' : 's') + ' differ from ' +
        fixtureName);
      diffs.slice(0, 25).forEach(function (diff) { env.out('  ' + T.diffLine(diff)); });
      if (diffs.length > 25) env.out('  ... and ' + (diffs.length - 25) + ' more');
      return false;
    }

    // The end of a check: the text of a complete corpus must be the file's too, when the tool says so.
    function finishCheck(records, ok) {
      var complete = records.length === spec.manifest.length;
      if (ok && complete && spec.compareText) {
        var fresh = spec.render(records).split('\r\n');
        var saved = (env.readText(spec.fixture, 'root') || '').split('\r\n');
        for (var i = 0; i < Math.max(fresh.length, saved.length); i++) {
          if (fresh[i] === saved[i]) continue;
          var id = /^ {4}(G\d+):/.exec(fresh[i] !== undefined ? fresh[i] : saved[i]);
          env.out(fixtureName + ' differs at line ' + (i + 1) + (id ? ' (request ' + id[1] + ')' : '') +
            '; regenerate it with node ' + spec.tool + ' if the generator changed on purpose');
          return 1;
        }
      }
      if (!ok) {
        env.out(fixtureName + ' differs; regenerate it with node ' + spec.tool +
          ' --write only if the generator changed on purpose');
        return 1;
      }
      env.out(complete ? fixtureName + ' is up to date' : fixtureName + ': ' + records.length + ' of ' +
        spec.manifest.length + ' records checked (' + records.map(function (r) { return r.key; }).join(', ') +
        '), all match; a partial check is no check of the complete fixture');
      return 0;
    }

    function writeFixture(records, out, from) {
      var text = spec.render(records);
      var base = out ? 'cwd' : 'root';
      var target = out || spec.fixture;
      env.writeText(target, text, base);
      env.out('wrote ' + env.show(target, base) + ' (' + (text.split('\r\n').length - 1) + ' lines)' + from);
    }

    if (plan.mode === 'list') {
      var ids = sourcesOf(env, spec);
      env.out(spec.tool + ': ' + spec.manifest.length + ' records, kind ' + spec.kind + ', fixture ' +
        spec.fixture);
      spec.manifest.forEach(function (entry) {
        env.out('  ' + entry.key + ' ' + spec.describe(entry));
      });
      env.out('manifestHash ' + ids.manifestHash);
      env.out('sourceHash   ' + ids.sourceHash);
      return 0;
    }

    if (plan.merge) {
      var expect = sourcesOf(env, spec);
      expect.manifest = spec.manifest;
      var files = env.readLedgers(plan.merge).map(function (file) {
        if (file.error !== undefined) return file;
        try {
          return { name: file.name, ledger: JSON.parse(file.text) };
        } catch (err) {
          return { name: file.name, error: 'not valid JSON (' + err.message + ')' };
        }
      });
      var merged = T.merge(files, expect);
      if (!merged.ok) {
        merged.problems.forEach(function (problem) { env.out('  ' + problem); });
        env.err('merge refused: ' + merged.problems.length + ' problem' +
          (merged.problems.length === 1 ? '' : 's') + '; nothing was written');
        return 1;
      }
      env.out('merged ' + files.length + ' ledger' + (files.length === 1 ? '' : 's') + ': all ' +
        spec.manifest.length + ' keys exactly once, recorded from the current sources');
      if (plan.mode === 'write') {
        writeFixture(merged.records, plan.out, ' from the merged ledgers');
        return 0;
      }
      var good = true;
      merged.records.forEach(function (record) {
        if (!compareOne(record.key, record.value)) good = false;
      });
      return finishCheck(merged.records, good);
    }

    // The routes that generate
    var stamp = env.now();
    var records = [];
    var ok = true;
    env.engine();
    for (var i = 0; i < plan.keys.length; i++) {
      var entry = entryOf(plan.keys[i]);
      var started = env.clock();
      var made;
      try {
        made = spec.generate(entry);
      } catch (err) {
        env.err(entry.key + ': generation failed: ' + (err && err.message ? err.message : err) +
          '; nothing was written');
        return 1;
      }
      var ms = Math.round(env.clock() - started);
      env.out(entry.key + ' ' + spec.describe(entry) + ': ' + (ms / 1000).toFixed(1) + ' s' +
        (made.overrides.length > 0 ? ' (level offered for this request only: ' +
          made.overrides.join(', ') + ')' : ''));
      records.push({ key: entry.key, request: entry.request, value: made.value, ms: ms,
        overrides: made.overrides });
      if (plan.mode === 'check' && !compareOne(entry.key, made.value)) ok = false;
    }
    if (plan.mode === 'check') return finishCheck(records, ok);
    if (plan.mode === 'write') {
      writeFixture(records, plan.out, '');
      return 0;
    }
    var meta = sourcesOf(env, spec);
    meta.generatedAt = stamp;
    meta.argv = argv.slice();
    env.writeText(opts.record, T.ledgerText(T.ledgerOf(meta, records)), 'cwd');
    env.out('recorded ' + records.length + ' of ' + spec.manifest.length + ' keys (' + plan.keys.join(', ') +
      ') in ' + env.show(opts.record, 'cwd') + '; a ledger is one shard, merge them all with --merge');
    return 0;
  }

  SG.fixtures.replayRecording = {
    NONE: NONE,
    WIRE_IDS: WIRE_IDS,
    FIELDS: FIELDS,
    EXCLUDED: EXCLUDED,
    goldenOf: goldenOf,
    renderGoldens: renderGoldens,
    parseOptions: parseOptions,
    planOf: planOf,
    usageOf: usageOf,
    runCli: runCli
  };
})();
