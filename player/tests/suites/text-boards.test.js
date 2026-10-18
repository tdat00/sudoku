// The boards rebuilt from the generator's text export (js/core/text-boards.js): each one must equal the model the
// generator itself built for the fixture documents of tests/fixtures/puzzles/ (units in the same order, labels,
// layout, overlays, cages, signs, symbols, fixed cells), so that an imported puzzle plays like a linked one.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var T = SG.textBoards;
  var K = SG.testkit;

  var available = K.document('classic9') !== null;

  function need() {
    if (!available) SG.test.skip('the puzzle fixtures cannot be read here (a browser on file://)');
  }

  /** The parts of a model that must agree, as plain data. */
  function shape(model) {
    var plain = function (value) {
      return JSON.parse(JSON.stringify(value, function (key, v) {
        return ArrayBuffer.isView(v) ? Array.from(v) : v;
      }));
    };
    var layout = plain(model.layout);
    return {
      variantId: model.variantId, digits: model.digits, cellCount: model.cellCount,
      units: plain(model.units), unitMeta: plain(model.unitMeta), cages: plain(model.cages || []),
      inequalities: plain(model.inequalities || []), symbols: plain(model.symbols),
      fixedCells: plain(model.fixedCells || []),
      layout: { rows: layout.rows, cols: layout.cols, cellRow: layout.cellRow, cellCol: layout.cellCol,
        cellRegion: layout.cellRegion, overlays: layout.overlays || [], subGrids: layout.subGrids || [] }
    };
  }

  function fixtureModel(name) {
    return SG.model.create(K.document(name).model);
  }

  function expectSame(built, name) {
    var want = shape(fixtureModel(name));
    var got = shape(built);
    Object.keys(want).forEach(function (key) {
      expect(JSON.stringify(got[key])).toBe(JSON.stringify(want[key]));
    });
  }

  describe('text boards: the boards the variant alone fixes', function () {
    T.DERIVED.forEach(function (id) {
      it('builds ' + id + ' exactly like the generator', function () {
        need();
        expectSame(T.buildVariant(id), id);
      });
    });

    it('says which boards it can build without a model block', function () {
      ['classic4', 'classic6', 'classic9', 'samurai', 'sohei', 'butterfly', 'flower', 'diagonalX', 'hyper', 'mega12',
        'mega16'].forEach(function (id) { expect(T.buildable(id)).toBe(true); });
      ['jigsaw9', 'killer', 'greaterThan', 'wordoku', 'nope'].forEach(function (id) {
        expect(T.buildable(id)).toBe(false);
      });
      expect(function () { T.buildVariant('killer'); }).toThrow();
    });

    ['samurai', 'sohei', 'butterfly', 'flower'].forEach(function (id) {
      it('builds the overlapping board ' + id + ' exactly like the generator', function () {
        need();
        expectSame(T.buildVariant(id), id);
      });
    });
  });

  describe('text boards: the boards that need structure lines', function () {
    it('builds the jigsaw board from the region of every cell', function () {
      need();
      var spec = K.document('jigsaw9').model;
      expectSame(SG.model.create(T.jigsawSpec(spec.layout.cellRegion)), 'jigsaw9');
      expect(function () { T.jigsawSpec([0, 1]); }).toThrow();
    });

    it('builds the killer board from its cages, with the colouring of the generator', function () {
      need();
      var spec = K.document('killer').model;
      var cages = spec.cages.map(function (c) { return { cells: c.cells, sum: c.sum }; });
      expectSame(T.create(T.killerSpec(cages)), 'killer');
    });

    it('builds the greater-than board from its signs', function () {
      need();
      var spec = K.document('greaterThan').model;
      expectSame(T.create(T.greaterThanSpec(spec.inequalities)), 'greaterThan');
    });

    it('builds the wordoku board from the letters, the word line and the values of the word', function () {
      need();
      var spec = K.document('wordoku').model;
      var cells = spec.layout.overlays[0].cells;
      var fixed = cells.map(function (cell) { return spec.fixedCells[cell]; });
      expectSame(SG.model.create(T.wordokuSpec(spec.symbols.labels, cells, fixed)), 'wordoku');
      expect(T.wordLineCells('diagonal', 0)).toEqual(cells);
      expect(T.wordLineCells('row', 2)).toEqual([18, 19, 20, 21, 22, 23, 24, 25, 26]);
      expect(T.wordLineCells('column', 4)).toEqual([4, 13, 22, 31, 40, 49, 58, 67, 76]);
    });
  });
})();
