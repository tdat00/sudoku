// Import and export of puzzles (tasks T-7.1, T-7.2 and T-7.8): the JSON of design.md 14.1 and the plain text line.
// The round trip (generate -> export -> import) must lose nothing, for every registered variant; a damaged,
// foreign or unsupported file must give a translated error, never an exception; the analysis of an imported
// puzzle must give the rating the generator stored; the `model` block of the document rebuilds the board for
// the player. Pure functions only (no DOM): `SG.exportUi.toJson / toText`
// and `SG.importUi.parseJson / parseText / validate / buildModel / importText / toResult / analyse`.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var E = SG.exportUi;
  var I = SG.importUi;

  function ready() {
    if (!E || !I || !SG.pipeline || !SG.i18n) SG.test.skip('SG.exportUi / SG.importUi are not loaded here');
  }

  var cache = {};

  /** A real result, generated once per test run. */
  function realResult(variantId, difficulty, seed) {
    var key = variantId + '/' + difficulty + '/' + seed;
    if (!cache[key]) {
      cache[key] = SG.pipeline.run({ variantId: variantId, difficulty: difficulty, seed: seed, trace: 'off' }, null);
    }
    return cache[key];
  }

  /** The JSON document of a result as a fresh object (so a test can damage it). */
  function documentOf(result) {
    return JSON.parse(E.formatJson(E.toJson(result, { generatedAt: '2026-01-01T00:00:00.000Z' })));
  }

  function keysOf(list) {
    return list.map(function (item) { return item.key; });
  }

  function arr(list) {
    return Array.from(list);
  }

  /** Everything a model is made of, as plain data. */
  function modelData(model) {
    return {
      variantId: model.variantId,
      digits: model.digits,
      cellCount: model.cellCount,
      units: model.units.map(arr),
      unitMeta: model.unitMeta.map(function (m) { return Object.assign({}, m); }),
      cages: model.cages.map(function (c) { return { cells: arr(c.cells), sum: c.sum, distinct: c.distinct }; }),
      inequalities: model.inequalities.map(function (q) { return { a: q.a, b: q.b }; }),
      layout: {
        rows: model.layout.rows,
        cols: model.layout.cols,
        cellRow: arr(model.layout.cellRow),
        cellCol: arr(model.layout.cellCol),
        cellRegion: arr(model.layout.cellRegion),
        overlays: model.layout.overlays.map(function (o) { return { kind: o.kind, cells: arr(o.cells) }; }),
        subGrids: model.layout.subGrids.map(function (g) { return Object.assign({}, g); })
      },
      symbols: { mode: model.symbols.mode, labels: arr(model.symbols.labels) },
      fixedCells: arr(model.fixedCells)
    };
  }

  function configData(config) {
    var copy = Object.assign({}, config);
    delete copy.trace;
    return copy;
  }

  /** Imports a result through its JSON text and returns what `importText` found. */
  function roundTrip(result) {
    return I.importText(E.formatJson(E.toJson(result, { generatedAt: '2026-01-01T00:00:00.000Z' })));
  }

  function inLocale(code, fn) {
    SG.i18n.setLocale(code);
    try {
      return fn();
    } finally {
      SG.i18n.setLocale('en');
    }
  }

  function translated(item, code) {
    return inLocale(code, function () {
      var text = I.issueText(item);
      expect(text).not.toBe(item.key);
      expect(text.trim() === '').toBe(false);
      return text;
    });
  }

  // ---------------------------------------------------------------------------------------------
  // The round trip
  // ---------------------------------------------------------------------------------------------

  describe('format: JSON round trip, every variant', function () {
    var variants = SG.variants ? SG.variants.list() : [];

    it('registers the 15 variants of the project (the loop below is not empty)', function () {
      ready();
      expect(variants.length).toBe(15);
    });

    variants.forEach(function (def) {
      def.difficultySupport.slice(0, 2).forEach(function (level) {
        it(def.id + ' / ' + level + ': export then import gives the identical puzzle', function () {
          ready();
          var result = realResult(def.id, level, 11);
          var built = roundTrip(result);
          expect(keysOf(built.errors)).toEqual([]);
          expect(built.ok).toBe(true);
          expect(built.kind).toBe('json');
          expect(built.variantId).toBe(def.id);
          expect(built.uniqueness).toBe('unique');
          expect(built.solutionSource).toBe('stored');
          expect(built.warnings).toEqual([]);

          var back = I.toResult(built);
          expect(modelData(back.model)).toEqual(modelData(result.model));
          expect(arr(back.givens)).toEqual(arr(result.givens));
          expect(arr(back.solution)).toEqual(arr(result.solution));
          expect(back.rating).toEqual(result.rating);
          expect(back.seed).toBe(result.seed);
          expect(configData(back.config)).toEqual(configData(result.config));
          expect(back.timings).toEqual(result.timings);
          expect(back.attempts).toBe(result.attempts);
          expect(back.warnings).toEqual(result.warnings);
          expect(back.source).toBe('import');
          // the rebuilt model is a real one: the solver sees the same puzzle (cage sums, signs, the word line)
          expect(SG.dfs.countSolutions(back.model, back.givens, 2)).toBe(1);
          expect(arr(SG.dfs.solve(back.model, back.givens))).toEqual(arr(result.solution));
          expect(SG.model.validate(back.model, { solve: false }).ok).toBe(true);
        });
      });
    });

    [['classic9', 'hard', 5], ['jigsaw9', 'medium', 7], ['killer', 'hard', 3], ['greaterThan', 'medium', 9],
      ['wordoku', 'medium', 2]].forEach(function (row) {
      it(row[0] + ' / ' + row[1] + ': a harder puzzle round-trips too', function () {
        ready();
        var result = realResult(row[0], row[1], row[2]);
        var built = roundTrip(result);
        expect(keysOf(built.errors)).toEqual([]);
        var back = I.toResult(built);
        expect(modelData(back.model)).toEqual(modelData(result.model));
        expect(arr(back.givens)).toEqual(arr(result.givens));
        expect(back.rating).toEqual(result.rating);
        expect(built.uniqueness).toBe('unique');
      });
    });

    it('keeps the options of the variant that the form had (Greater-Than futoshiki, mega symbol set)', function () {
      ready();
      var gt = SG.pipeline.run({ variantId: 'greaterThan', difficulty: 'easy', seed: 4, trace: 'off',
        variantOptions: { futoshiki: true } }, null);
      var built = roundTrip(gt);
      expect(built.ok).toBe(true);
      expect(I.toResult(built).config.variantOptions).toEqual({ futoshiki: true });
      expect(I.toResult(built).model.inequalities.length).toBe(gt.model.inequalities.length);
      var mega = SG.pipeline.run({ variantId: 'mega12', difficulty: 'easy', seed: 4, trace: 'off',
        variantOptions: { symbolSet: 'numbers' } }, null);
      var again = I.toResult(roundTrip(mega));
      expect(arr(again.model.symbols.labels)).toEqual(arr(mega.model.symbols.labels));
      expect(again.config.variantOptions).toEqual({ symbolSet: 'numbers' });
    });

    it('the JSON text parses back to the same data (formatJson only changes the layout of the text)', function () {
      ready();
      var result = realResult('samurai', 'veryEasy', 11);
      var data = E.toJson(result, { generatedAt: '2026-01-01T00:00:00.000Z' });
      expect(JSON.parse(E.formatJson(data))).toEqual(JSON.parse(JSON.stringify(data)));
    });

    it('accepts the file with a byte order mark and with extra, unknown fields', function () {
      ready();
      var doc = documentOf(realResult('classic9', 'easy', 11));
      doc.somethingNew = { later: true };
      var built = I.importText('\uFEFF' + JSON.stringify(doc));
      expect(built.ok).toBe(true);
    });

    it('computes the solution when the file has none, and says so', function () {
      ready();
      var result = realResult('classic9', 'easy', 11);
      var doc = documentOf(result);
      delete doc.solution;
      var built = I.importText(JSON.stringify(doc));
      expect(built.ok).toBe(true);
      expect(built.solutionSource).toBe('computed');
      expect(arr(built.solution)).toEqual(arr(result.solution));
      doc.solution = null;
      expect(I.importText(JSON.stringify(doc)).solutionSource).toBe('computed');
    });

    it('a Killer or Greater-Than puzzle imported in a fresh page solves with its cage sums and signs', function () {
      ready();
      // The lazy extensions (memory.md 6.5) must be switched on by the import itself.
      var killer = I.toResult(roundTrip(realResult('killer', 'easy', 11)));
      var empty = new Int32Array(killer.model.cellCount);
      var solved = SG.dfs.solve(killer.model, empty);
      killer.model.cages.forEach(function (cage) {
        var sum = 0;
        for (var i = 0; i < cage.cells.length; i++) sum += solved[cage.cells[i]];
        expect(sum).toBe(cage.sum);
      });
      var gt = I.toResult(roundTrip(realResult('greaterThan', 'easy', 11)));
      var grid = SG.dfs.solve(gt.model, new Int32Array(gt.model.cellCount));
      gt.model.inequalities.forEach(function (q) { expect(grid[q.a] < grid[q.b]).toBe(true); });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // The `model` block of the document (hand-off to sudoku-player)
  // ---------------------------------------------------------------------------------------------

  describe('format: the model block (what sudoku-player rebuilds the board from)', function () {
    var variants = SG.variants ? SG.variants.list() : [];

    variants.forEach(function (def) {
      it(def.id + ': SG.model.create(doc.model) rebuilds the model, also through a link token',
        async function () {
          ready();
          var result = realResult(def.id, def.difficultySupport[0], 11);
          var doc = documentOf(result);
          expect(SG.exchange.isDocument(doc)).toBe(true);
          expect(doc.model.variantId).toBe(def.id);
          var carried = await SG.exchange.decode(await SG.exchange.encode(doc));
          expect(carried).toEqual(doc);
          var model = SG.model.create(carried.model);
          expect(modelData(model)).toEqual(modelData(result.model));
          expect(SG.model.validate(model, { solve: false }).ok).toBe(true);
          if (model.cages.length > 0) SG.comboTable.enablePropagation(model.variantId);
          if (model.inequalities.length > 0) SG.ineq.ensureExtension();
          expect(SG.dfs.countSolutions(model, carried.givens, 2)).toBe(1);
          expect(arr(SG.dfs.solve(model, carried.givens))).toEqual(arr(result.solution));
        });
    });

    it('is exactly the plain-data form of the wire model, and round-trips through JSON.stringify', function () {
      ready();
      var result = realResult('killer', 'easy', 11);
      var data = E.toJson(result, { generatedAt: '2026-01-01T00:00:00.000Z' });
      expect(data.model).toEqual(SG.exchange.plain(SG.pipeline.toWire(result).model));
      expect(Object.keys(data.model).sort()).toEqual(['cages', 'cellCount', 'digits', 'fixedCells',
        'inequalities', 'layout', 'symbols', 'unitMeta', 'units', 'variantId']);
      expect(JSON.parse(JSON.stringify(data))).toEqual(data);
      expect(data.model.cages.length).toBe(result.model.cages.length);
      expect(Array.isArray(data.model.layout.cellRow)).toBe(true);
    });

    it('the import ignores it: the same puzzle comes back with the block, without it, or damaged', function () {
      ready();
      var result = realResult('jigsaw9', 'easy', 11);
      var doc = documentOf(result);
      var withBlock = I.importText(JSON.stringify(doc));
      delete doc.model;
      var without = I.importText(JSON.stringify(doc));
      doc.model = { units: 'nonsense', layout: null };
      var damaged = I.importText(JSON.stringify(doc));
      [withBlock, without, damaged].forEach(function (built) {
        expect(keysOf(built.errors)).toEqual([]);
        expect(built.ok).toBe(true);
        expect(modelData(I.toResult(built).model)).toEqual(modelData(result.model));
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // The text line
  // ---------------------------------------------------------------------------------------------

  describe('format: text round trip', function () {
    [['classic4', 16], ['classic6', 36], ['classic9', 81], ['mega12', 144], ['mega16', 256]].forEach(function (row) {
      it(row[0] + ': a line of ' + row[1] + ' characters comes back as the same puzzle', function () {
        ready();
        var result = realResult(row[0], 'veryEasy', 3);
        var line = E.toText(result);
        expect(line.length).toBe(row[1]);
        var built = I.importText(line);
        expect(keysOf(built.errors)).toEqual([]);
        expect(built.kind).toBe('text');
        expect(built.variantId).toBe(row[0]);
        expect(arr(built.givens)).toEqual(arr(result.givens));
        expect(built.uniqueness).toBe('unique');
        expect(arr(built.solution)).toEqual(arr(result.solution));
        expect(built.rating).toBeNull();
        expect(SG.dfs.countSolutions(built.model, built.givens, 2)).toBe(1);
        var shown = I.toResult(built);
        expect(shown.seed).toBeNull();
        expect(shown.source).toBe('import');
      });
    });

    it('ignores spaces and line breaks, and reads . 0 - and _ as an empty cell', function () {
      ready();
      var result = realResult('classic9', 'easy', 3);
      var line = E.toText(result);
      var rows = [];
      for (var r = 0; r < 9; r++) rows.push(line.slice(r * 9, r * 9 + 9).replace(/\./g, r % 2 ? '0' : '_'));
      var built = I.importText(rows.join('\r\n') + '\n');
      expect(built.ok).toBe(true);
      expect(arr(built.givens)).toEqual(arr(result.givens));
      expect(arr(I.importText(line.replace(/\./g, '-')).givens)).toEqual(arr(result.givens));
    });

    it('an 81 character line can mean Diagonal X or Hyper when the rules are chosen', function () {
      ready();
      var x = realResult('diagonalX', 'easy', 3);
      var line = E.toText(x);
      var plain = I.importText(line);
      expect(plain.variantId).toBe('classic9');
      var chosen = I.importText(line, { variantId: 'diagonalX' });
      expect(chosen.ok).toBe(true);
      expect(chosen.variantId).toBe('diagonalX');
      expect(chosen.uniqueness).toBe('unique');
      expect(arr(chosen.solution)).toEqual(arr(x.solution));
      expect(I.importText(line, { variantId: 'killer' }).ok).toBe(false);
    });

    it('a line of letters: values above 9 are A, B, C (mega16 uses up to G)', function () {
      ready();
      var result = realResult('mega16', 'veryEasy', 3);
      var line = E.toText(result, { solution: true });
      expect(/[A-G]/.test(line)).toBe(true);
      expect(/[H-Z]/.test(line)).toBe(false);
      var built = I.importText(line);
      expect(built.ok).toBe(true);
      expect(built.uniqueness).toBe('unique');
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Errors
  // ---------------------------------------------------------------------------------------------

  describe('format: damaged, foreign and unsupported input', function () {
    function firstError(text, options) {
      var built = I.importText(text, options);
      expect(built.ok).toBe(false);
      expect(built.errors.length).toBeGreaterThan(0);
      return built.errors[0];
    }

    function expectKey(item, key) {
      expect(item.key).toBe(key);
      ['en', 'vi'].forEach(function (code) { translated(item, code); });
    }

    it('every message key exists in both language packs', function () {
      ready();
      var keys = I.ERROR_KEYS.concat(I.WARNING_KEYS);
      expect(keys.length).toBeGreaterThan(40);
      ['en', 'vi'].forEach(function (code) {
        inLocale(code, function () {
          var missing = keys.filter(function (key) { return !SG.i18n.has(key); });
          expect(missing).toEqual([]);
        });
      });
    });

    it('empty input, a truncated file and text that is neither give their own messages', function () {
      ready();
      expectKey(firstError(''), 'import.error.empty');
      expectKey(firstError('   \n '), 'import.error.empty');
      var json = E.formatJson(E.toJson(realResult('classic9', 'easy', 11)));
      expectKey(firstError(json.slice(0, json.length >> 1)), 'import.error.badJson');
      expectKey(firstError('{ not json'), 'import.error.badJson');
      expectKey(firstError('hello world'), 'import.error.unsupportedText');
      expectKey(firstError('[1, 2, 3]'), 'import.error.notObject');
      expectKey(firstError('123'), 'import.error.unsupportedText');
      expectKey(firstError(new Array(5000).join('x')), 'import.error.unsupportedText');
    });

    it('never throws, whatever the input', function () {
      ready();
      [undefined, null, 5, {}, [], '{}', '[]', 'null', '{"format":null}', '{"format":"sudoku-generator/v1"}',
        '{"format":"sudoku-generator/v1","variantId":"nope"}', '\u0000\u0001', '{"__proto__":{}}']
        .forEach(function (input) {
          var built = I.importText(input);
          expect(built.ok).toBe(false);
          expect(built.errors.length).toBeGreaterThan(0);
        });
      expect(I.validate(undefined).ok).toBe(false);
      expect(I.validate(null).ok).toBe(false);
      expect(I.parseJson(undefined).ok).toBe(false);
      expect(I.parseText(undefined).ok).toBe(false);
    });

    it('checks the format and its version', function () {
      ready();
      var doc = documentOf(realResult('classic9', 'easy', 11));
      var other = Object.assign({}, doc, { format: 'sudoku-generator/v2' });
      expectKey(firstError(JSON.stringify(other)), 'import.error.wrongVersion');
      expectKey(firstError(JSON.stringify(Object.assign({}, doc, { format: 'someone-else/v1' }))),
        'import.error.wrongFormat');
      var noFormat = Object.assign({}, doc);
      delete noFormat.format;
      expectKey(firstError(JSON.stringify(noFormat)), 'import.error.noFormat');
      expectKey(firstError(JSON.stringify(Object.assign({}, doc, { format: 7 }))), 'import.error.wrongFormat');
    });

    it('reports missing fields', function () {
      ready();
      var doc = documentOf(realResult('classic9', 'easy', 11));
      ['givens', 'variantId'].forEach(function (field) {
        var copy = Object.assign({}, doc);
        delete copy[field];
        var err = firstError(JSON.stringify(copy));
        expectKey(err, 'import.error.missingField');
        expect(err.args.field).toBe(field);
      });
      expectKey(firstError(JSON.stringify(Object.assign({}, doc, { variantId: 'sudoku-xyz' }))),
        'import.error.unknownVariant');
      expectKey(firstError(JSON.stringify(Object.assign({}, doc, { givens: 'abc' }))), 'import.error.badType');
      expectKey(firstError(JSON.stringify(Object.assign({}, doc, { variantOptions: [] }))), 'import.error.badType');
    });

    it('rejects digits outside 0..D and values that are not whole numbers', function () {
      ready();
      var doc = documentOf(realResult('classic9', 'easy', 11));
      [10, -1, 2.5, '5', null].forEach(function (bad) {
        var copy = JSON.parse(JSON.stringify(doc));
        copy.givens[7] = bad;
        var err = firstError(JSON.stringify(copy));
        expectKey(err, 'import.error.badDigit');
        expect(err.args.cell).toBe(8);
        expect(err.args.field).toBe('givens');
      });
      var copy2 = JSON.parse(JSON.stringify(doc));
      copy2.solution[0] = 0;
      expect(firstError(JSON.stringify(copy2)).args.field).toBe('solution');
      expectKey(firstError(JSON.stringify(Object.assign({}, doc, { digits: 12 }))), 'import.error.badDigits');
      var copy3 = JSON.parse(JSON.stringify(doc));
      copy3.givens[0] = 10;
      expectKey(firstError(JSON.stringify(copy3)), 'import.error.badDigit');
    });

    it('rejects a wrong number of cells', function () {
      ready();
      var doc = documentOf(realResult('classic9', 'easy', 11));
      var short = JSON.parse(JSON.stringify(doc));
      short.givens.pop();
      expectKey(firstError(JSON.stringify(short)), 'import.error.badCellCount');
      delete short.cellCount;
      expectKey(firstError(JSON.stringify(short)), 'import.error.badLength');
      var solutionShort = JSON.parse(JSON.stringify(doc));
      solutionShort.solution.pop();
      expectKey(firstError(JSON.stringify(solutionShort)), 'import.error.badLength');
      var layoutShort = JSON.parse(JSON.stringify(doc));
      layoutShort.layout.cellRegion.pop();
      expectKey(firstError(JSON.stringify(layoutShort)), 'import.error.badLength');
      var samurai = documentOf(realResult('samurai', 'veryEasy', 11));
      samurai.givens = samurai.givens.slice(0, 81);
      delete samurai.cellCount;
      expectKey(firstError(JSON.stringify(samurai)), 'import.error.badLength');
    });

    it('a stored layout, symbol set or solution that contradicts the variant is refused', function () {
      ready();
      var doc = documentOf(realResult('classic9', 'easy', 11));
      var layout = JSON.parse(JSON.stringify(doc));
      layout.layout.cellRegion[0] = 5;
      expectKey(firstError(JSON.stringify(layout)), 'import.error.badLayout');
      var symbols = JSON.parse(JSON.stringify(doc));
      symbols.symbols.labels[0] = 'Z';
      expectKey(firstError(JSON.stringify(symbols)), 'import.error.badSymbols');
      var clash = JSON.parse(JSON.stringify(doc));
      var c = clash.givens.findIndex(function (v) { return v > 0; });
      clash.givens[c] = (clash.solution[c] % 9) + 1;
      expectKey(firstError(JSON.stringify(clash)), 'import.error.givenMismatch');
      var rules = JSON.parse(JSON.stringify(doc));
      var t0 = rules.solution[0];
      rules.solution[0] = rules.solution[1];
      rules.solution[1] = t0;
      rules.givens = rules.givens.map(function () { return 0; });
      expectKey(firstError(JSON.stringify(rules)), 'import.error.solutionUnit');
    });

    it('Killer: a cage sum that cannot be, overlapping cages and cells without a cage', function () {
      ready();
      var doc = documentOf(realResult('killer', 'easy', 11));
      var sum = JSON.parse(JSON.stringify(doc));
      sum.cages[0].sum = 99;
      expectKey(firstError(JSON.stringify(sum)), 'import.error.cageBadSum');
      var overlap = JSON.parse(JSON.stringify(doc));
      overlap.cages[1].cells.push(overlap.cages[0].cells[0]);
      expectKey(firstError(JSON.stringify(overlap)), 'import.error.cageOverlap');
      var hole = JSON.parse(JSON.stringify(doc));
      hole.cages.pop();
      expectKey(firstError(JSON.stringify(hole)), 'import.error.cageNotCovered');
      var outside = JSON.parse(JSON.stringify(doc));
      outside.cages[0].cells[0] = 400;
      expectKey(firstError(JSON.stringify(outside)), 'import.error.cageBadCells');
      var repeated = JSON.parse(JSON.stringify(doc));
      repeated.cages[0].cells = [1, 1];
      expectKey(firstError(JSON.stringify(repeated)), 'import.error.cageBadCells');
      var loose = JSON.parse(JSON.stringify(doc));
      loose.cages[0].distinct = false;
      expectKey(firstError(JSON.stringify(loose)), 'import.error.cageDistinct');
      var none = JSON.parse(JSON.stringify(doc));
      delete none.cages;
      expectKey(firstError(JSON.stringify(none)), 'import.error.missingField');
      // A sum that is possible for the cage but not the one of the stored solution.
      var wrong = JSON.parse(JSON.stringify(doc));
      var cage = wrong.cages.filter(function (k) { return k.cells.length === 2; })[0];
      cage.sum = cage.sum === 17 ? 16 : cage.sum + 1;
      expectKey(firstError(JSON.stringify(wrong)), 'import.error.solutionCage');
    });

    it('Greater-Than: signs that point nowhere, between cells that are not neighbours, or in a cycle', function () {
      ready();
      var doc = documentOf(realResult('greaterThan', 'easy', 11));
      expect(doc.inequalities.length).toBeGreaterThan(0);
      var bad = JSON.parse(JSON.stringify(doc));
      bad.inequalities[0] = { a: 0, b: 81 };
      expectKey(firstError(JSON.stringify(bad)), 'import.error.ineqBadIndex');
      var self = JSON.parse(JSON.stringify(doc));
      self.inequalities[0] = { a: 4, b: 4 };
      expectKey(firstError(JSON.stringify(self)), 'import.error.ineqSelf');
      var far = JSON.parse(JSON.stringify(doc));
      far.inequalities[0] = { a: 0, b: 40 };
      expectKey(firstError(JSON.stringify(far)), 'import.error.ineqNotAdjacent');
      var twice = JSON.parse(JSON.stringify(doc));
      twice.inequalities.push(Object.assign({}, twice.inequalities[0]));
      expectKey(firstError(JSON.stringify(twice)), 'import.error.ineqDuplicate');
      var cycle = JSON.parse(JSON.stringify(doc));
      cycle.inequalities = [{ a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 0 }];
      expectKey(firstError(JSON.stringify(cycle)), 'import.error.ineqCycle');
      var broken = JSON.parse(JSON.stringify(doc));
      var q = broken.inequalities[0];
      broken.inequalities[0] = { a: q.b, b: q.a };
      expectKey(firstError(JSON.stringify(broken)), 'import.error.solutionSign');
      var flipped = JSON.parse(JSON.stringify(doc));
      delete flipped.inequalities;
      expectKey(firstError(JSON.stringify(flipped)), 'import.error.missingField');
    });

    it('Jigsaw: regions that are not nine connected regions of nine cells', function () {
      ready();
      var doc = documentOf(realResult('jigsaw9', 'easy', 11));
      var big = JSON.parse(JSON.stringify(doc));
      big.layout.cellRegion[big.layout.cellRegion.indexOf(1)] = 0;
      expectKey(firstError(JSON.stringify(big)), 'import.error.badRegions');
      var none = JSON.parse(JSON.stringify(doc));
      delete none.layout;
      expectKey(firstError(JSON.stringify(none)), 'import.error.missingField');
      var rows = JSON.parse(JSON.stringify(doc));
      rows.layout.cellRegion = rows.layout.cellRegion.map(function (v, i) { return Math.floor(i / 9); });
      expectKey(firstError(JSON.stringify(rows)), 'import.error.badRegions');
    });

    it('Wordoku: a key word that is not nine different letters, or that the solution does not spell', function () {
      ready();
      var doc = documentOf(realResult('wordoku', 'easy', 11));
      expect(doc.wordoku.word.length).toBe(9);
      var bad = JSON.parse(JSON.stringify(doc));
      bad.wordoku.word = 'AABBCCDDE';
      expectKey(firstError(JSON.stringify(bad)), 'import.error.badWord');
      var swapped = JSON.parse(JSON.stringify(doc));
      swapped.wordoku.word = doc.wordoku.word.split('').reverse().join('');
      var err = firstError(JSON.stringify(swapped));
      expect(['import.error.solutionWord', 'import.error.badSymbols']).toContain(err.key);
    });

    it('a text line: unknown size, a character that is not allowed, a digit above the grid', function () {
      ready();
      expectKey(firstError('1234'), 'import.error.unsupportedText');
      expectKey(firstError(new Array(82).join('?')), 'import.error.textChars');
      expectKey(firstError(new Array(82).join('A')), 'import.error.badDigit');
      expectKey(firstError(new Array(17).join('5'), { variantId: 'classic9' }), 'import.error.textLength');
      var err = firstError(new Array(82).join('.').replace('.', '*'));
      expect(err.key).toBe('import.error.textChars');
      expect(err.args.position).toBe(1);
    });

    it('a puzzle with no solution or with several is still imported, with a warning', function () {
      ready();
      var result = realResult('classic9', 'easy', 11);
      var line = E.toText(result);
      // two equal clues in a row: no solution
      var clash = line.split('');
      var cells = [];
      for (var i = 0; i < 9; i++) if (clash[i] === '.') cells.push(i);
      var given = clash.filter(function (ch, k) { return k < 9 && ch !== '.'; })[0] || '1';
      clash[cells[0]] = given;
      clash[cells[1]] = given;
      var none = I.importText(clash.join(''));
      expect(none.ok).toBe(true);
      expect(none.uniqueness).toBe('none');
      expect(keysOf(none.warnings)).toEqual(['import.warn.noSolution']);
      expect(arr(none.solution).every(function (v) { return v === 0; })).toBe(true);
      // far too few clues: several solutions
      var sparse = '1' + new Array(81).join('.');
      var many = I.importText(sparse);
      expect(many.ok).toBe(true);
      expect(many.uniqueness).toBe('multiple');
      expect(keysOf(many.warnings)).toEqual(['import.warn.severalSolutions']);
      expect(arr(many.solution).every(function (v) { return v > 0; })).toBe(true);
      ['en', 'vi'].forEach(function (code) {
        translated(none.warnings[0], code);
        translated(many.warnings[0], code);
      });
    });

    it('structure that the variant does not use is ignored with a warning, not silently', function () {
      ready();
      var doc = documentOf(realResult('classic9', 'easy', 11));
      doc.cages = [{ cells: [0, 1], sum: 3, distinct: true }];
      var built = I.importText(JSON.stringify(doc));
      expect(built.ok).toBe(true);
      expect(keysOf(built.warnings)).toEqual(['import.warn.ignoredStructure']);
      translated(built.warnings[0], 'vi');
    });

    it('a search that runs out of budget is reported as unverified; the puzzle is still shown', function () {
      ready();
      var real = SG.budget.create;
      SG.budget.create = function () {
        return { tick: function () {}, check: function () {
          throw new SG.errors.GenerationError('budget.exceeded', {});
        }, cancel: function () {}, elapsedMs: function () { return 0; }, isCancelled: false, nodes: 0 };
      };
      try {
        var built = I.importText('1' + new Array(81).join('.'));
        expect(built.ok).toBe(true);
        expect(built.uniqueness).toBe('unknown');
        expect(keysOf(built.warnings)).toEqual(['import.warn.unverified']);
        expect(arr(built.solution).every(function (v) { return v === 0; })).toBe(true);
        ['en', 'vi'].forEach(function (code) { translated(built.warnings[0], code); });
      } finally {
        SG.budget.create = real;
      }
    });

    it('the messages read well in both languages: every argument of every produced error is filled in', function () {
      ready();
      var doc = documentOf(realResult('killer', 'easy', 11));
      doc.cages[0].sum = 99;
      var err = firstError(JSON.stringify(doc));
      ['en', 'vi'].forEach(function (code) {
        expect(translated(err, code)).not.toContain('{');
      });
      var gt = documentOf(realResult('greaterThan', 'easy', 11));
      gt.inequalities[0] = { a: 0, b: 40 };
      var err2 = firstError(JSON.stringify(gt));
      ['en', 'vi'].forEach(function (code) { expect(translated(err2, code)).not.toContain('{'); });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // The analysis of an imported puzzle
  // ---------------------------------------------------------------------------------------------

  describe('format: analyse difficulty of an imported puzzle', function () {
    [['classic9', 'veryEasy', 21], ['classic9', 'easy', 22], ['classic9', 'medium', 23], ['classic9', 'hard', 24],
      ['killer', 'medium', 25], ['greaterThan', 'easy', 26], ['jigsaw9', 'medium', 27], ['classic6', 'easy', 28],
      ['samurai', 'easy', 29]].forEach(function (row) {
      it(row[0] + ' / ' + row[1] + ': the analysis gives the rating that the generator stored', function () {
        ready();
        var result = realResult(row[0], row[1], row[2]);
        var built = roundTrip(result);
        expect(built.ok).toBe(true);
        expect(built.rating).toEqual(result.rating);
        var analysis = I.analyse(built.model, built.givens);
        expect(analysis.ok).toBe(true);
        expect(analysis.rating).toEqual(result.rating);
        expect(analysis.rating.level).toBe(result.rating.level);
      });
    });

    it('a text line has no rating until it is analysed, then the result panel gets all of it', function () {
      ready();
      var result = realResult('classic9', 'hard', 24);
      var built = I.importText(E.toText(result));
      expect(built.rating).toBeNull();
      var before = I.toResult(built);
      expect(before.rating.unrated).toBe(true);
      var analysis = I.analyse(built.model, built.givens);
      expect(analysis.ok).toBe(true);
      expect(analysis.rating).toEqual(result.rating);
      var after = I.toResult(built, { rating: analysis.rating });
      expect(after.rating.level).toBe(result.rating.level);
      expect(after.config.difficulty).toBe(result.rating.level);
      expect(after.rating.techniqueCounts).toEqual(result.rating.techniqueCounts);
    });

    it('a stored rating is used as it is (no work is done on import)', function () {
      ready();
      var result = realResult('classic9', 'medium', 23);
      var doc = documentOf(result);
      doc.difficulty.score = 4321;
      var built = I.importText(JSON.stringify(doc));
      expect(built.rating.score).toBe(4321);
      expect(I.toResult(built).rating.score).toBe(4321);
    });

    it('a budget that runs out gives a translated error, not an exception', function () {
      ready();
      var built = roundTrip(realResult('classic9', 'hard', 24));
      var real = SG.budget.create;
      SG.budget.create = function () {
        return { tick: function () {}, check: function () {
          throw new SG.errors.GenerationError('budget.exceeded', {});
        }, cancel: function () {}, elapsedMs: function () { return 0; }, isCancelled: false, nodes: 0 };
      };
      try {
        var analysis = I.analyse(built.model, built.givens);
        expect(analysis.ok).toBe(false);
        expect(analysis.rating).toBeNull();
        expect(analysis.errors[0].key).toBe('import.error.analyseTooLong');
        ['en', 'vi'].forEach(function (code) { translated(analysis.errors[0], code); });
      } finally {
        SG.budget.create = real;
      }
    });
  });
})();
