/**
 * Pure helpers of the help-example tool (difficulty v3, MS03b): tests/tools/make-technique-examples.js reads
 * and writes the files, loads the sources and runs the child process; everything it decides is here, as
 * SG.fixtures.helpExampleTools, so that a quick suite can test it without generating a puzzle. It is test
 * tooling, not part of any application script list, and knows no file system, clock or process: the tool
 * passes those in (`now`, `env`). The functions that replay a puzzle take the Player's `SG` as an argument.
 *
 *  - parseOptions(argv), parseChildOptions(argv)   the command line and the one of the generator child
 *  - checkProjectPath(path, rules)                 the shape of a project-relative output or input path
 *  - selectIds(registry, list)                     the exact IDs asked for, in registry order
 *  - parseSources(text), validateSources(data, registry), defaultSources(examples, ids), assignSources(...)
 *    admit(ids, assigned, cap)                     the sources, and the puzzles that fit the cap
 *  - openSource(SG, item), replayPuzzle(SG, item, wanted, limits), winners(ids, plan, results)
 *    snapshot(SG, game, puzzle, hint, item, step)  the Player's own hints, and the data of one example
 *  - difficulty, shownCells, popcount, eligible    the clarity score and the rules of an occurrence
 *  - planDiscovery(supportOf, filters), runDiscovery(...), runStage1(env, ...)   the bounded generation
 *  - catalogueOf(text), render(ids, byId), mergeCatalogue(...), validateSnapshot(id, ex), compare(...)
 *  - recordedSources(ids, found), sourcesText(data), combineSources(list)   the source files
 *  - makeDeadline(now, startedAt, limitMs)         the tool-level deadline
 * MS03c extends `snapshot` (Jigsaw regions); nothing else in the Player's data changes here.
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};
  SG.fixtures = SG.fixtures || {};

  var SOURCE_SCHEMA = 1;
  var DEFAULT_MAX_PUZZLES = 64;
  var DEFAULT_MAX_HINTS = 400;
  var DEADLINE_MS = 8 * 60 * 1000;
  var REQUEST_BUDGET_MS = 120000;
  var DEFAULT_WORK_DIR = 'tests/artifacts/difficulty-v3/help';

  /** [variantId, preferred levels, number of seeds, optional 'highest' supported level only]. */
  var PLAN = [
    ['classic9', ['easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1', 'hell2'], 120],
    ['killer', ['easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1', 'hell2'], 60],
    ['greaterThan', ['easy', 'normal', 'hard'], 12],
    ['jigsaw9', ['hard', 'expert', 'master'], 40],
    ['diagonalX', ['hard', 'expert', 'master', 'nightmare'], 40],
    ['hyper', ['hard', 'expert', 'master', 'nightmare'], 40],
    // The rarest techniques (Jellyfish) need many hard puzzles to turn up.
    ['classic9', ['nightmare', 'hell1', 'hell2'], 1500, 'highest'],
    ['diagonalX', ['nightmare', 'hell1', 'hell2'], 600, 'highest'],
    ['hyper', ['nightmare', 'hell1', 'hell2'], 600, 'highest']
  ];

  var FLAGS = ['check', 'write', 'discover', 'help'];
  var VALUES = ['ids', 'sources', 'max-puzzles', 'puzzles', 'max-hints', 'record-sources', 'variants',
    'levels', 'out', 'work-dir'];

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function failure(name, message, flag) {
    var err = new Error(message);
    err.name = name;
    err[flag] = true;
    return err;
  }

  /** A wrong command line: the tool prints the usage text after it. */
  function usageError(message) {
    return failure('UsageError', message, 'usage');
  }

  /** A run that could not finish in its bound (deadline, child timeout): never a partial result. */
  function incompleteError(message) {
    return failure('IncompleteError', message, 'incomplete');
  }

  // ---------------------------------------------------------------------------------------------
  // The command line
  // ---------------------------------------------------------------------------------------------

  function positive(name, text, digits) {
    if (!new RegExp('^[1-9]\\d{0,' + ((digits || 7) - 1) + '}$').test(text)) {
      throw usageError('--' + name + ' needs a positive whole number (up to ' + (digits || 7) + ' digits), got "' +
        text + '"');
    }
    return Number(text);
  }

  function nameList(name, text, shape) {
    var list = text.split(',');
    list.forEach(function (entry, i) {
      if (!shape.test(entry)) throw usageError('--' + name + ': "' + entry + '" is not a valid name');
      if (list.indexOf(entry) !== i) throw usageError('--' + name + ': "' + entry + '" is given twice');
    });
    return list;
  }

  /** Splits the arguments into the generator folder and the named options (a repeated one is an error). */
  function splitArguments(argv, allowed) {
    var given = {};
    var generator = null;
    argv.forEach(function (arg) {
      var text = String(arg);
      var m = text === '-h' ? ['-h', 'help', undefined] : /^--([a-z0-9-]+)(?:=([\s\S]*))?$/.exec(text);
      if (m === null) {
        if (text !== '' && text.charAt(0) !== '-' && generator === null) generator = text;
        else throw usageError('Unknown argument: ' + text);
        return;
      }
      var name = m[1];
      var value = m[2];
      var isFlag = FLAGS.indexOf(name) !== -1;
      if (allowed.indexOf(name) === -1) throw usageError('Unknown argument: ' + text);
      if (isFlag && value !== undefined) throw usageError('--' + name + ' takes no value');
      if (!isFlag && (value === undefined || value === '')) throw usageError('--' + name + ' needs a value');
      if (hasOwn(given, name)) throw usageError('--' + name + ' is given twice');
      given[name] = isFlag ? true : value;
    });
    return { given: given, generator: generator };
  }

  /**
   * The options of the tool, validated before any work: { help } alone, or { generator, ids, sources,
   * maxPuzzles, maxHints, mode ('check', 'write' or 'record'), discover, variants, levels, out,
   * recordSources, workDir }. An option that was not given is null (the tool resolves the default paths).
   * @throws UsageError
   */
  function parseOptions(argv) {
    var split = splitArguments(argv, FLAGS.concat(VALUES));
    var given = split.given;
    if (given.help) {
      if (argv.length !== 1) throw usageError('--help takes no other argument');
      return { help: true };
    }
    var recording = hasOwn(given, 'record-sources');
    if (given.check && given.write) throw usageError('--check and --write exclude each other');
    if (recording && (given.check || given.write)) {
      throw usageError('--record-sources saves sources, not a catalogue: it excludes --check and --write');
    }
    if (given.discover) {
      if (given.check) {
        throw usageError('--discover generates puzzles: it excludes --check (a check never generates)');
      }
      if (!given.write && !recording) throw usageError('--discover needs --write or --record-sources');
      if (hasOwn(given, 'sources')) throw usageError('--sources and --discover exclude each other');
    } else if (hasOwn(given, 'variants') || hasOwn(given, 'levels')) {
      throw usageError('--variants and --levels only filter a --discover run');
    }
    if (recording && hasOwn(given, 'out')) {
      throw usageError('--out names a catalogue: it excludes --record-sources');
    }
    var limit = null;
    ['max-puzzles', 'puzzles'].forEach(function (name) {
      if (!hasOwn(given, name)) return;
      var value = positive(name, given[name]);
      if (limit !== null && limit !== value) {
        throw usageError('--max-puzzles=' + limit + ' and --puzzles=' + value + ' (its alias) disagree');
      }
      limit = value;
    });
    var variants = hasOwn(given, 'variants') ? nameList('variants', given.variants, /^[A-Za-z0-9]+$/) : null;
    var levels = hasOwn(given, 'levels') ? nameList('levels', given.levels, /^[A-Za-z0-9]+$/) : null;
    var planVariants = [];
    var planLevels = [];
    PLAN.forEach(function (row) {
      if (planVariants.indexOf(row[0]) === -1) planVariants.push(row[0]);
      row[1].forEach(function (level) { if (planLevels.indexOf(level) === -1) planLevels.push(level); });
    });
    (variants || []).forEach(function (id) {
      if (planVariants.indexOf(id) === -1) {
        throw usageError('--variants: "' + id + '" is not in the plan (' + planVariants.join(', ') + ')');
      }
    });
    (levels || []).forEach(function (id) {
      if (planLevels.indexOf(id) === -1) {
        throw usageError('--levels: "' + id + '" is not in the plan (' + planLevels.join(', ') + ')');
      }
    });
    var opts = {
      help: false,
      generator: split.generator,
      ids: hasOwn(given, 'ids') ? nameList('ids', given.ids, /^[A-Za-z][A-Za-z0-9]*$/) : null,
      sources: hasOwn(given, 'sources') ? given.sources : null,
      maxPuzzles: limit === null ? DEFAULT_MAX_PUZZLES : limit,
      maxHints: hasOwn(given, 'max-hints') ? positive('max-hints', given['max-hints']) : DEFAULT_MAX_HINTS,
      mode: recording ? 'record' : given.write ? 'write' : 'check',
      discover: given.discover === true,
      variants: variants,
      levels: levels,
      out: hasOwn(given, 'out') ? given.out : null,
      recordSources: recording ? given['record-sources'] : null,
      workDir: hasOwn(given, 'work-dir') ? given['work-dir'] : null
    };
    checkProjectPath(opts.sources, { extension: '.json', flag: '--sources', optional: true });
    checkProjectPath(opts.out, { extension: '.js', flag: '--out', optional: true });
    checkProjectPath(opts.recordSources, { extension: '.json', flag: '--record-sources', optional: true });
    checkProjectPath(opts.workDir, { flag: '--work-dir', optional: true });
    return opts;
  }

  /**
   * The command line of the generator child that the tool starts for a discovery: a folder, then
   * --stage1=<file> (the intermediate it writes), --max-puzzles, --deadline-at=<epoch ms> and optional
   * --variants and --levels. @throws UsageError
   */
  function parseChildOptions(argv) {
    var split = splitArguments(argv, ['stage1', 'max-puzzles', 'deadline-at', 'variants', 'levels']);
    var given = split.given;
    ['stage1', 'max-puzzles', 'deadline-at'].forEach(function (name) {
      if (!hasOwn(given, name)) throw usageError('the generator child needs --' + name);
    });
    if (split.generator === null) throw usageError('the generator child needs the generator folder');
    return {
      generator: split.generator,
      stage1: given.stage1,
      maxPuzzles: positive('max-puzzles', given['max-puzzles']),
      deadlineAt: positive('deadline-at', given['deadline-at'], 16),
      variants: hasOwn(given, 'variants') ? given.variants.split(',') : null,
      levels: hasOwn(given, 'levels') ? given.levels.split(',') : null
    };
  }

  /** A path the tool is given: relative (no machine path in a command or a log), with its extension. */
  function checkProjectPath(value, rules) {
    if (value === null && rules.optional) return;
    var label = rules.flag || 'path';
    if (typeof value !== 'string' || value === '') throw usageError(label + ' needs a path');
    if (/^([A-Za-z]:|[\\/])/.test(value)) {
      throw usageError(label + ': give a project-relative path, not an absolute one (' + value + ')');
    }
    if (rules.extension && value.slice(-rules.extension.length) !== rules.extension) {
      throw usageError(label + ': the file needs the extension ' + rules.extension + ' (' + value + ')');
    }
  }

  /** The IDs of `list` in registry order (all when `list` is null). @throws UsageError for an unknown ID */
  function selectIds(registry, list) {
    if (list === null) return registry.slice();
    var unknown = list.filter(function (id) { return registry.indexOf(id) === -1; });
    if (unknown.length > 0) {
      throw usageError('--ids: unknown technique ID ' + unknown.join(', ') + ' (not in the registry)');
    }
    return registry.filter(function (id) { return list.indexOf(id) !== -1; });
  }

  // ---------------------------------------------------------------------------------------------
  // The Player's hints and the snapshot of one example
  // ---------------------------------------------------------------------------------------------

  function popcount(mask) {
    var n = 0;
    for (var m = mask; m !== 0; m &= m - 1) n++;
    return n;
  }

  /** The cells whose notes the Help page draws: the region, the cells of the hint and the ones it changes. */
  function shownCells(hint) {
    var set = new Set(hint.region ? hint.region.cells : []);
    hint.cells.forEach(function (c) { set.add(c); });
    hint.targets.forEach(function (c) { set.add(c); });
    return Array.from(set).sort(function (a, b) { return a - b; });
  }

  /**
   * How hard an example is to read: the fewer cells, removals and candidates on show the clearer it is, and a
   * plain 9x9 board is clearer than one with extra regions.
   */
  function difficulty(SGx, game, hint, puzzle) {
    var scope = SGx.techniques.get(hint.technique).variantScope;
    var extra = scope === null && puzzle.variantId !== 'classic9' ? 8 : 0;
    var clutter = 0;
    shownCells(hint).forEach(function (c) {
      if (game.userValue(c) === 0) clutter += popcount(game.getNotes(c));
    });
    return hint.cells.length + hint.eliminations.length + hint.placements.length + clutter / 4 + extra;
  }

  /** A cage of one cell is no example of a combination of digits: wait for a cage with at least two. */
  function eligible(hint) {
    return !(hint.technique === 'cageCombo' && hint.stepArgs && hint.stepArgs.size < 2);
  }

  /** What the page needs to draw an example without playing anything: the board, the notes, the hint. */
  function snapshot(SGx, game, puzzle, hint, item, step) {
    var model = puzzle.model;
    var n = model.cellCount;
    var notes = {};
    shownCells(hint).forEach(function (c) {
      if (game.userValue(c) === 0 && game.getNotes(c) !== 0) notes[c] = game.getNotes(c);
    });
    var digitsOf = function (list) {
      return Array.from(list).map(function (v) { return v > 0 ? String(v) : '.'; }).join('');
    };
    var values = [];
    for (var i = 0; i < n; i++) values.push(game.userValue(i));
    var out = {
      variant: puzzle.variantId,
      givens: digitsOf(puzzle.givens),
      values: digitsOf(values),
      notes: notes
    };
    if (model.cages.length > 0) {
      out.cages = model.cages.map(function (cage) {
        return { cells: Array.from(cage.cells), sum: cage.sum };
      });
    }
    if (model.inequalities.length > 0) {
      out.signs = model.inequalities.map(function (sign) { return { a: sign.a, b: sign.b }; });
    }
    out.hint = {
      technique: hint.technique, nameKey: hint.nameKey, descKey: hint.descKey, stepKey: hint.stepKey,
      stepArgs: hint.stepArgs, kind: hint.kind, cells: hint.cells, targets: hint.targets,
      placements: hint.placements, eliminations: hint.eliminations, region: hint.region
    };
    out.source = { puzzle: item.text.trim(), step: step };
    return out;
  }

  // ---------------------------------------------------------------------------------------------
  // Sources: the files, the defaults, and what fits the cap
  // ---------------------------------------------------------------------------------------------

  function parseSources(text) {
    try {
      return JSON.parse(String(text).replace(/^\uFEFF/, ''));
    } catch (err) {
      throw new Error('not valid JSON (' + err.message + ')');
    }
  }

  function sameKeys(object, keys) {
    var own = Object.keys(object);
    return own.length === keys.length && keys.every(function (key) { return hasOwn(object, key); });
  }

  /** The assigned-source entries of one source file, as { problems, sources } (texts trimmed). */
  function validateSources(data, registry) {
    var problems = [];
    var sources = {};
    if (!isObject(data) || !sameKeys(data, ['schema', 'sources'])) {
      return { problems: ['expected {"schema":' + SOURCE_SCHEMA + ',"sources":{...}} and nothing else'],
        sources: null };
    }
    if (data.schema !== SOURCE_SCHEMA) {
      problems.push('schema ' + JSON.stringify(data.schema) + ' is not ' + SOURCE_SCHEMA);
    }
    if (!isObject(data.sources)) {
      return { problems: problems.concat('sources is not an object'), sources: null };
    }
    Object.keys(data.sources).forEach(function (id) {
      var list = data.sources[id];
      if (registry.indexOf(id) === -1) {
        problems.push('sources.' + id + ': not a registered technique ID');
        return;
      }
      if (!Array.isArray(list) || list.length === 0) {
        problems.push('sources.' + id + ': needs a non-empty list of sources');
        return;
      }
      sources[id] = [];
      list.forEach(function (entry, i) {
        var label = 'sources.' + id + '[' + i + ']';
        if (!isObject(entry) || !sameKeys(entry, ['variantId', 'level', 'seed', 'text'])) {
          problems.push(label + ': expected exactly variantId, level, seed and text');
          return;
        }
        var ok = true;
        if (typeof entry.variantId !== 'string' || entry.variantId === '') {
          problems.push(label + '.variantId: not a non-empty string');
          ok = false;
        }
        ['level', 'seed'].forEach(function (name) {
          if (entry[name] !== null && (typeof entry[name] !== 'string' || entry[name] === '')) {
            problems.push(label + '.' + name + ': not null or a non-empty string');
            ok = false;
          }
        });
        if (typeof entry.text !== 'string' || entry.text.trim() === '') {
          problems.push(label + '.text: not a puzzle text');
          ok = false;
        }
        if (ok) {
          sources[id].push({ variantId: entry.variantId, level: entry.level, seed: entry.seed,
            text: entry.text.trim() });
        }
      });
    });
    return { problems: problems, sources: problems.length === 0 ? sources : null };
  }

  /** The source of each saved example: the puzzle of its `source`. A missing one is named. @throws Error */
  function defaultSources(examples, ids) {
    var sources = {};
    var missing = [];
    ids.forEach(function (id) {
      var ex = examples && hasOwn(examples, id) ? examples[id] : null;
      var puzzle = ex && ex.source ? ex.source.puzzle : undefined;
      if (typeof puzzle !== 'string' || puzzle === '') missing.push(id);
      else sources[id] = [{ variantId: ex.variant, level: null, seed: null, text: puzzle }];
    });
    if (missing.length > 0) {
      throw new Error('no source for ' + missing.join(', ') + ': it has no saved example; give ' +
        '--sources=<file.json> or use --discover with --write or --record-sources');
    }
    return sources;
  }

  /** The sources of the requested IDs out of a source file; an ID without one is named. @throws Error */
  function assignSources(ids, fileSources) {
    var missing = ids.filter(function (id) { return !hasOwn(fileSources, id); });
    if (missing.length > 0) throw new Error('no source for ' + missing.join(', ') + ' in the sources file');
    var assigned = {};
    ids.forEach(function (id) { assigned[id] = fileSources[id]; });
    return assigned;
  }

  /**
   * The puzzles to replay: the assigned sources of the IDs in registry order and listed order, each distinct
   * text once, at most `cap` of them. A source beyond the cap is not replayed; an ID left without any source
   * is an error of the caller (`missing`).
   * @returns {{ puzzles: { item, ids: string[] }[], byId: Object, skipped: number, missing: string[],
   *   cap: number }}
   */
  function admit(ids, assigned, cap) {
    var puzzles = [];
    var index = new Map();
    var byId = {};
    var skipped = 0;
    ids.forEach(function (id) {
      byId[id] = [];
      assigned[id].forEach(function (item) {
        var at = index.get(item.text);
        if (at === undefined) {
          if (puzzles.length >= cap) {
            skipped++;
            return;
          }
          at = puzzles.length;
          index.set(item.text, at);
          puzzles.push({ item: item, ids: [] });
        }
        if (puzzles[at].ids.indexOf(id) === -1) puzzles[at].ids.push(id);
        if (byId[id].indexOf(at) === -1) byId[id].push(at);
      });
    });
    var missing = ids.filter(function (id) { return byId[id].length === 0; });
    return { puzzles: puzzles, byId: byId, skipped: skipped, missing: missing, cap: cap };
  }

  /** The source files of the requested IDs as one file: { schema, sources } with one real source per ID. */
  function recordedSources(ids, found) {
    var sources = {};
    ids.forEach(function (id) {
      var item = found[id].item;
      sources[id] = [{ variantId: item.variantId, level: item.level, seed: item.seed, text: item.text }];
    });
    return { schema: SOURCE_SCHEMA, sources: sources };
  }

  /** The text of a source file: UTF-8 without BOM, CRLF, one line per source, a final line end. */
  function sourcesText(data) {
    var lines = ['{', '  "schema": ' + SOURCE_SCHEMA + ',', '  "sources": {'];
    var ids = Object.keys(data.sources);
    ids.forEach(function (id, i) {
      lines.push('    ' + JSON.stringify(id) + ': [');
      var list = data.sources[id];
      list.forEach(function (entry, j) {
        var plain = { variantId: entry.variantId, level: entry.level, seed: entry.seed, text: entry.text };
        lines.push('      ' + JSON.stringify(plain) + (j < list.length - 1 ? ',' : ''));
      });
      lines.push('    ]' + (i < ids.length - 1 ? ',' : ''));
    });
    lines.push('  }', '}');
    return lines.join('\r\n') + '\r\n';
  }

  /**
   * Combines the per-ID source files [{ name, data }] of several recordings, without changing a puzzle text.
   * An ID in two files is refused. @returns {{ ok: boolean, problems: string[], data: (object|null) }}
   */
  function combineSources(list) {
    var problems = [];
    var owner = {};
    var sources = {};
    list.forEach(function (file) {
      var own = isObject(file.data) && isObject(file.data.sources) ? Object.keys(file.data.sources) : [];
      var checked = validateSources(file.data, own);
      checked.problems.forEach(function (problem) { problems.push(file.name + ': ' + problem); });
      if (checked.sources === null) return;
      Object.keys(checked.sources).forEach(function (id) {
        if (hasOwn(owner, id)) {
          problems.push(id + ': in both ' + owner[id] + ' and ' + file.name);
          return;
        }
        owner[id] = file.name;
        sources[id] = checked.sources[id];
      });
    });
    if (list.length === 0) problems.push('no source file to combine');
    return { ok: problems.length === 0, problems: problems,
      data: problems.length === 0 ? { schema: SOURCE_SCHEMA, sources: sources } : null };
  }

  // ---------------------------------------------------------------------------------------------
  // Stage 2: the player replays a puzzle with hints
  // ---------------------------------------------------------------------------------------------

  /** The puzzle of one source as the Player opens it: { ok, error, puzzle }. */
  function openSource(SGx, item) {
    var no = function (error) { return { ok: false, error: error, puzzle: null }; };
    var keys = function (errors) { return errors.map(function (e) { return e.key; }).join(', '); };
    var blocks = SGx.importer.exportBlocks(item.text);
    if (blocks === null || blocks.length !== 1) {
      return no('the text is not exactly one puzzle block of the generator (' +
        (blocks === null ? 'none' : blocks.length) + ' found)');
    }
    var parsed = SGx.importer.parseExportBlock(blocks[0], 1);
    if (!parsed.ok) return no('the player cannot read it (' + keys(parsed.errors) + ')');
    var outcome = SGx.importer.openDocument(parsed.data, { kind: 'export' });
    if (!outcome.ok) return no('the player cannot open it (' + keys(outcome.errors) + ')');
    if (item.variantId && item.variantId !== outcome.puzzle.variantId) {
      return no('it declares the variant ' + item.variantId + ' but the puzzle is ' +
        outcome.puzzle.variantId);
    }
    return { ok: true, error: '', puzzle: outcome.puzzle };
  }

  /**
   * Plays one puzzle the way a person who keeps asking for hints would: fill in all the notes, ask for a
   * hint, apply it, and so on until it is solved, the game is stuck or `limits.maxHints` hints were used. The
   * first hint of a wanted technique is a candidate; the clearest occurrence wins (the earliest on a tie).
   * `limits.check()` (optional) is called before every hint and may throw.
   * @returns {{ ok: boolean, error: string, hints: number, stop: string, found: string[], best: Object }}
   */
  function replayPuzzle(SGx, item, wanted, limits) {
    var opened = openSource(SGx, item);
    if (!opened.ok) {
      return { ok: false, error: opened.error, hints: 0, stop: 'unreadable', found: [], best: {} };
    }
    var puzzle = opened.puzzle;
    var game = SGx.play.createGame(puzzle.model, puzzle.givens, puzzle.solution,
      { now: function () { return 0; } });
    game.fillNotes();
    var best = {};
    var found = [];
    var k = 0;
    var stop = 'solved';
    for (; k < limits.maxHints; k++) {
      if (game.isSolved()) break;
      if (limits.check) limits.check();
      game.clearHint();
      var hint = game.hint();
      if (!hint || hint.ok !== true) {
        stop = 'stuck';
        break;
      }
      if (found.indexOf(hint.technique) === -1) found.push(hint.technique);
      if (wanted.indexOf(hint.technique) !== -1 && eligible(hint)) {
        var score = difficulty(SGx, game, hint, puzzle);
        var old = best[hint.technique];
        if (old === undefined || score < old.score) {
          best[hint.technique] = { score: score, data: snapshot(SGx, game, puzzle, hint, item, k) };
        }
      }
      game.applyHint();
    }
    if (k >= limits.maxHints && !game.isSolved()) stop = 'limit';
    return { ok: true, error: '', hints: k, stop: stop, found: found, best: best };
  }

  /**
   * The winning occurrence of each ID over its own puzzles, in listed order; the first one on a tie.
   * @returns {{ found: Object, missing: string[] }} found[id] = { score, data, item, at }
   */
  function winners(ids, plan, results) {
    var found = {};
    var missing = [];
    ids.forEach(function (id) {
      var best;
      plan.byId[id].forEach(function (at) {
        var result = results[at];
        var candidate = result && result.ok ? result.best[id] : undefined;
        if (candidate !== undefined && (best === undefined || candidate.score < best.score)) {
          best = { score: candidate.score, data: candidate.data, item: plan.puzzles[at].item, at: at };
        }
      });
      if (best === undefined) missing.push(id);
      else found[id] = best;
    });
    return { found: found, missing: missing };
  }

  // ---------------------------------------------------------------------------------------------
  // The catalogue (js/ui/help-examples.js): text, merge, comparison
  // ---------------------------------------------------------------------------------------------

  // The lines of the generated file's header, verbatim (some are longer than the usual 110 columns).
  var HEADER = [
    '/**',
    ' * A concrete example for every technique of the guide (help.html): `SG.helpExamples[id]`. The data is a',
    ' * snapshot, so the page draws it at once and plays nothing:',
    ' *   variant   \'classic9\', \'diagonalX\', \'hyper\', \'killer\' (with `cages`) or \'greaterThan\' (with `signs`): the board to build;',
    ' *   givens, values   81 characters each, \'.\' for an empty cell: the clues, and what the hints entered so far;',
    ' *   notes     { cell: bit mask } of the cells that are drawn with their candidates;',
    ' *   hint      what `game.hint()` said at that moment (technique, text key and arguments, cells, the cells and',
    ' *             candidates it changes, the area to look at);',
    ' *   source    the puzzle (the text of the generator\'s Export box) and the number of hints applied (with all the',
    ' *             notes filled in first) before this one: only the tests use it, to check that the snapshot is still',
    ' *             what the player\'s own hint says.',
    ' *',
    ' * GENERATED by tests/tools/make-technique-examples.js: do not edit by hand.',
    ' */',
    '(function (root) {',
    '  \'use strict\';',
    '',
    '  const SG = root.SG = root.SG || {};',
    '',
    '  SG.helpExamples = Object.freeze({'
  ];

  var FOOTER = [
    '  });',
    '})(typeof self !== \'undefined\' ? self : globalThis);',
    ''
  ];

  /** The text of the catalogue: the registry's IDs in registry order, CRLF, no BOM, a final line end. */
  function render(ids, byId) {
    var body = ids.map(function (id) { return '    ' + id + ': ' + JSON.stringify(byId[id]); }).join(',\r\n');
    return HEADER.concat(body, FOOTER).join('\r\n');
  }

  /** The `SG.helpExamples` a catalogue text defines (evaluated against a private root). @throws Error */
  function catalogueOf(text) {
    var fake = {};
    try {
      new Function('self', String(text).replace(/^\uFEFF/, ''))(fake);
    } catch (err) {
      throw new Error('not a catalogue script (' + err.message + ')');
    }
    if (!fake.SG || !isObject(fake.SG.helpExamples)) throw new Error('the script defines no SG.helpExamples');
    return fake.SG.helpExamples;
  }

  /** The problems of one example against the contract of the registry and of help.test.js. */
  function validateSnapshot(id, ex) {
    var problems = [];
    var say = function (text) { problems.push(id + ': ' + text); };
    if (!isObject(ex)) {
      say('no example object');
      return problems;
    }
    if (typeof ex.variant !== 'string' || ex.variant === '') say('variant is not a string');
    var same = typeof ex.givens === 'string' && typeof ex.values === 'string' &&
      ex.givens.length === ex.values.length;
    if (!same) say('givens and values are not strings of the same length');
    if (!isObject(ex.notes)) say('notes is not an object');
    if (!isObject(ex.hint) || ex.hint.technique !== id) say('its hint is not a hint of ' + id);
    var puzzle = isObject(ex.source) ? ex.source.puzzle : undefined;
    if (typeof puzzle !== 'string' || puzzle.indexOf('#1,') !== 0) {
      say('source.puzzle is not the text of a puzzle block');
    } else if (!Number.isInteger(ex.source.step) || ex.source.step < 0) {
      say('source.step is not a whole number of hints');
    }
    return problems;
  }

  /**
   * The complete catalogue after a write: the selected examples replace their own, every other ID of the
   * registry keeps its saved one, the order is the registry's. Complete and valid or not at all.
   * @returns {{ ok: boolean, problems: string[], dropped: string[], catalogue: (object|null) }}
   */
  function mergeCatalogue(registry, saved, selectedIds, fresh) {
    var problems = [];
    var catalogue = {};
    selectedIds.forEach(function (id) {
      if (!hasOwn(fresh, id)) problems.push(id + ': no example was found');
    });
    registry.forEach(function (id) {
      var ex;
      if (selectedIds.indexOf(id) !== -1) ex = fresh[id];
      else if (saved && hasOwn(saved, id)) ex = saved[id];
      else {
        problems.push(id + ': not selected and not in the saved catalogue');
        return;
      }
      if (ex === undefined) return;
      problems = problems.concat(validateSnapshot(id, ex));
      catalogue[id] = ex;
    });
    var dropped = Object.keys(saved || {}).filter(function (id) { return registry.indexOf(id) === -1; });
    return { ok: problems.length === 0, problems: problems, dropped: dropped,
      catalogue: problems.length === 0 ? catalogue : null };
  }

  function show(value) {
    var text = value === undefined ? 'undefined' : JSON.stringify(value);
    return text.length > 60 ? text.slice(0, 57) + '...' : text;
  }

  /** The field differences between two plain values: [{ path, saved, fresh }] in a fixed order. */
  function diffValues(saved, fresh, path, out) {
    var diffs = out || [];
    var here = path || '';
    if (Array.isArray(saved) && Array.isArray(fresh)) {
      if (saved.length !== fresh.length) {
        diffs.push({ path: here + '.length', saved: saved.length, fresh: fresh.length });
      }
      for (var i = 0; i < Math.min(saved.length, fresh.length); i++) {
        diffValues(saved[i], fresh[i], here + '[' + i + ']', diffs);
      }
    } else if (isObject(saved) && isObject(fresh)) {
      var keys = Object.keys(saved);
      Object.keys(fresh).forEach(function (key) { if (keys.indexOf(key) === -1) keys.push(key); });
      keys.forEach(function (key) {
        var inSaved = hasOwn(saved, key);
        var inFresh = hasOwn(fresh, key);
        var child = here === '' ? key : here + '.' + key;
        if (inSaved && inFresh) {
          diffValues(saved[key], fresh[key], child, diffs);
        } else {
          diffs.push({ path: child, saved: inSaved ? saved[key] : undefined,
            fresh: inFresh ? fresh[key] : undefined });
        }
      });
    } else if (saved !== fresh) {
      diffs.push({ path: here, saved: saved, fresh: fresh });
    }
    return diffs;
  }

  /** One line for a difference of `diffValues`. */
  function diffLine(diff) {
    return diff.path + ': saved ' + show(diff.saved) + ', fresh ' + show(diff.fresh);
  }

  /**
   * Compares the fresh examples of the selected IDs with a saved catalogue, field by field (data only: no
   * time or tool timing is part of an example). Each result: { id, status: 'match'|'differs'|'new', diffs }.
   */
  function compare(ids, saved, fresh) {
    return ids.map(function (id) {
      if (!saved || !hasOwn(saved, id)) return { id: id, status: 'new', diffs: [] };
      var diffs = diffValues(JSON.parse(JSON.stringify(saved[id])), JSON.parse(JSON.stringify(fresh[id])));
      return { id: id, status: diffs.length === 0 ? 'match' : 'differs', diffs: diffs };
    });
  }

  // ---------------------------------------------------------------------------------------------
  // Discovery: bounded, explicit, and never in a check
  // ---------------------------------------------------------------------------------------------

  /**
   * The (variant, level) combinations of the plan, in plan order, after the filters and before any puzzle is
   * made. A combination that two rows of the plan name once keeps the larger number of seeds.
   * `supportOf(variantId)` gives the levels the generator offers for a variant.
   * @returns {{ variantId: string, level: string, seeds: number }[]}
   */
  function planDiscovery(supportOf, filters) {
    var combos = [];
    var at = {};
    PLAN.forEach(function (row) {
      if (filters.variants && filters.variants.indexOf(row[0]) === -1) return;
      var supported = supportOf(row[0]);
      var levels = row[1].filter(function (level) { return supported.indexOf(level) !== -1; });
      if (row[3] === 'highest') levels = levels.slice(-1);
      levels.forEach(function (level) {
        if (filters.levels && filters.levels.indexOf(level) === -1) return;
        var key = row[0] + '/' + level;
        if (at[key] === undefined) {
          at[key] = combos.length;
          combos.push({ variantId: row[0], level: level, seeds: row[2] });
        } else if (row[2] > combos[at[key]].seeds) {
          combos[at[key]].seeds = row[2];
        }
      });
    });
    return combos;
  }

  /**
   * Generates at most `cap` puzzles of the combinations, seed 1 up, one request after the other: the loop
   * stops before request cap+1 is made, a failed request counts as made and is never retried.
   * `generate(variantId, level, seed)` returns the item { variantId, level, seed, text }. An expired
   * `deadline` ends the run unfinished.
   * @returns {{ complete: boolean, attempted: number, items: object[], failures: object[] }}
   */
  function runDiscovery(combos, cap, generate, deadline, log) {
    var items = [];
    var failures = [];
    var attempted = 0;
    var result = function (complete) {
      return { complete: complete, attempted: attempted, items: items, failures: failures };
    };
    for (var c = 0; c < combos.length; c++) {
      for (var seed = 1; seed <= combos[c].seeds; seed++) {
        if (attempted >= cap) return result(true);
        if (deadline.expired()) return result(false);
        attempted++;
        var label = 'request ' + attempted + '/' + cap + ' ' + combos[c].variantId + ' ' + combos[c].level +
          ' ' + seed + ': ';
        try {
          items.push(generate(combos[c].variantId, combos[c].level, seed));
          if (log) log(label + 'made');
        } catch (err) {
          var why = String(err && err.message ? err.message : err);
          failures.push({ variantId: combos[c].variantId, level: combos[c].level, seed: String(seed),
            error: why });
          if (log) log(label + 'failed (' + why + ')');
        }
      }
    }
    return result(true);
  }

  /** The intermediate of the child, checked: schema 1, complete, at most `cap` requests, items are sources. */
  function readStage1(text, cap) {
    var data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      throw new Error('the generator child left no valid result (' + err.message + ')');
    }
    var bad = function (why) {
      return new Error('the generator child left a damaged result (' + why + ')');
    };
    if (!isObject(data) || data.schema !== SOURCE_SCHEMA || data.complete !== true) {
      throw bad('not a complete result');
    }
    if (!Array.isArray(data.items) || !Array.isArray(data.failures)) throw bad('no item list');
    if (data.items.length + data.failures.length !== data.attempted || data.attempted > cap) {
      throw bad(data.attempted + ' requests against the cap of ' + cap);
    }
    data.items.forEach(function (item, i) {
      var text = ['variantId', 'level', 'seed', 'text'];
      if (!isObject(item) || text.some(function (name) { return typeof item[name] !== 'string'; })) {
        throw bad('item ' + i);
      }
    });
    return data;
  }

  /**
   * The arguments of the generator child after its folder (the tool prepends the script and the folder).
   * `file` is the intermediate it writes, `deadlineAt` the epoch millisecond at which it must stop.
   */
  function childArguments(opts, file, deadlineAt) {
    var args = ['--stage1=' + file, '--max-puzzles=' + opts.maxPuzzles, '--deadline-at=' + deadlineAt];
    if (opts.variants) args.push('--variants=' + opts.variants.join(','));
    if (opts.levels) args.push('--levels=' + opts.levels.join(','));
    return args;
  }

  /**
   * Runs the generator child under the deadline and returns what it generated. The child's own intermediate
   * is the only file removed (always), and the work directory only when this run created it. `env`:
   * { file, args, ensureDir() -> token, release(token), spawn(args, timeoutMs) -> { status, signal, error },
   *   readText(file) -> string|null, remove(file) }.
   * @throws IncompleteError when the deadline or the child's timeout ended it, Error when the child failed
   */
  function runStage1(env, opts, deadline) {
    var made = env.ensureDir();
    try {
      deadline.check('before the generator child started');
      var run = env.spawn(env.args, Math.max(1000, deadline.remaining()));
      var timedOut = run.error && run.error.code === 'ETIMEDOUT';
      var killed = timedOut || (run.signal !== null && run.signal !== undefined);
      if (killed) {
        throw incompleteError('incomplete: the generator child did not finish in the time left to the ' +
          'tool; nothing was written');
      }
      if (run.error) {
        throw new Error('the generator child could not run (' + (run.error.code || run.error.message) + ')');
      }
      if (run.status === 3) {
        throw incompleteError('incomplete: the generator child stopped at the deadline; nothing was written');
      }
      if (run.status !== 0) throw new Error('the generator child failed (exit ' + run.status + ')');
      var text = env.readText(env.file);
      if (text === null) throw new Error('the generator child left no result');
      return readStage1(text, opts.maxPuzzles);
    } finally {
      env.remove(env.file);
      env.release(made);
    }
  }

  /** A deadline of `limitMs` from `startedAt`, read with the clock `now`. */
  function makeDeadline(now, startedAt, limitMs) {
    var at = startedAt + limitMs;
    return {
      at: at,
      remaining: function () { return at - now(); },
      expired: function () { return now() >= at; },
      check: function (what) {
        if (now() >= at) {
          throw incompleteError('incomplete: the ' + Math.round(limitMs / 1000) +
            '-second deadline of the tool was reached ' + what + '; nothing was written');
        }
      }
    };
  }

  SG.fixtures.helpExampleTools = {
    SOURCE_SCHEMA: SOURCE_SCHEMA,
    DEFAULT_MAX_PUZZLES: DEFAULT_MAX_PUZZLES,
    DEFAULT_MAX_HINTS: DEFAULT_MAX_HINTS,
    DEADLINE_MS: DEADLINE_MS,
    REQUEST_BUDGET_MS: REQUEST_BUDGET_MS,
    DEFAULT_WORK_DIR: DEFAULT_WORK_DIR,
    PLAN: PLAN,
    usageError: usageError,
    incompleteError: incompleteError,
    parseOptions: parseOptions,
    parseChildOptions: parseChildOptions,
    checkProjectPath: checkProjectPath,
    selectIds: selectIds,
    popcount: popcount,
    shownCells: shownCells,
    difficulty: difficulty,
    eligible: eligible,
    snapshot: snapshot,
    parseSources: parseSources,
    validateSources: validateSources,
    defaultSources: defaultSources,
    assignSources: assignSources,
    admit: admit,
    recordedSources: recordedSources,
    sourcesText: sourcesText,
    combineSources: combineSources,
    openSource: openSource,
    replayPuzzle: replayPuzzle,
    winners: winners,
    render: render,
    catalogueOf: catalogueOf,
    validateSnapshot: validateSnapshot,
    mergeCatalogue: mergeCatalogue,
    diffValues: diffValues,
    diffLine: diffLine,
    compare: compare,
    planDiscovery: planDiscovery,
    runDiscovery: runDiscovery,
    readStage1: readStage1,
    childArguments: childArguments,
    runStage1: runStage1,
    makeDeadline: makeDeadline
  };
})();
