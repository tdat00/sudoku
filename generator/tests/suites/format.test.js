// The puzzle document: the JSON of design.md 14.1 as `SG.exportUi.toJson` writes it, with its `model` block,
// which rebuilds the board for the player (sudoku-player) with no variant code, also after the token round
// trip of the player link (`SG.exchange.encode / decode`).
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var E = SG.exportUi;

  function ready() {
    if (!E || !SG.pipeline || !SG.i18n || !SG.exchange) {
      SG.test.skip('SG.exportUi / SG.exchange are not loaded here');
    }
  }

  var cache = {};

  /** A real result, generated once per test run. */
  function realResult(variantId, difficulty, seed) {
    var key = variantId + '/' + difficulty + '/' + seed;
    if (!cache[key]) {
      cache[key] = SG.pipeline.run(
        { variantId: variantId, difficulty: difficulty, seed: seed, trace: 'off' }, null);
    }
    return cache[key];
  }

  /** The JSON document of a result as a fresh object (so a test can damage it). */
  function documentOf(result) {
    return JSON.parse(JSON.stringify(E.toJson(result, { generatedAt: '2026-01-01T00:00:00.000Z' })));
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
      cages: model.cages.map(function (c) {
        return { cells: arr(c.cells), sum: c.sum, distinct: c.distinct };
      }),
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

    it('is exactly the plain-data form of the wire model, and round-trips through JSON.stringify',
      function () {
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

    it('keeps the options of the variant that the form had (Greater-Than futoshiki, mega symbol set)',
      function () {
        ready();
        var gt = SG.pipeline.run({ variantId: 'greaterThan', difficulty: 'easy', seed: 4, trace: 'off',
          variantOptions: { futoshiki: true } }, null);
        var gtDoc = documentOf(gt);
        expect(gtDoc.variantOptions).toEqual({ futoshiki: true });
        expect(gtDoc.model.inequalities.length).toBe(gt.model.inequalities.length);
        var mega = SG.pipeline.run({ variantId: 'mega12', difficulty: 'easy', seed: 4, trace: 'off',
          variantOptions: { symbolSet: 'numbers' } }, null);
        var megaDoc = documentOf(mega);
        expect(megaDoc.symbols.labels).toEqual(arr(mega.model.symbols.labels));
        expect(megaDoc.model.symbols.labels).toEqual(arr(mega.model.symbols.labels));
        expect(megaDoc.variantOptions).toEqual({ symbolSet: 'numbers' });
      });

    it('a Killer or Greater-Than model rebuilt from the block solves with its cage sums and signs',
      function () {
        ready();
        var killer = SG.model.create(documentOf(realResult('killer', 'easy', 11)).model);
        SG.comboTable.enablePropagation(killer.variantId);
        var solved = SG.dfs.solve(killer, new Int32Array(killer.cellCount));
        killer.cages.forEach(function (cage) {
          var sum = 0;
          for (var i = 0; i < cage.cells.length; i++) sum += solved[cage.cells[i]];
          expect(sum).toBe(cage.sum);
        });
        var gt = SG.model.create(documentOf(realResult('greaterThan', 'easy', 11)).model);
        SG.ineq.ensureExtension();
        var grid = SG.dfs.solve(gt, new Int32Array(gt.cellCount));
        gt.inequalities.forEach(function (q) { expect(grid[q.a] < grid[q.b]).toBe(true); });
      });
  });
})();
