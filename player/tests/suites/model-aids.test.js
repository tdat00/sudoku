// SG.modelAids (../core/js/engine/model-aids.js): what the screens read from a rebuilt model that the generator's
// variant code used to provide: the sign edges of Greater-Than, the word line of Wordoku, the symbol sets.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var A = SG.modelAids;
  var K = SG.testkit;

  function need(name) {
    if (K.document(name) === null) SG.test.skip('the puzzle fixtures cannot be read here (a browser on file://)');
  }

  describe('modelAids: sign edges', function () {
    it('places every sign of the Greater-Than fixture between two neighbouring cells', function () {
      need('greaterThan');
      var model = K.model('greaterThan');
      var doc = K.document('greaterThan');
      var edges = A.signEdges(model);
      expect(edges).toHaveLength(model.inequalities.length);
      expect(edges.length).toBeGreaterThan(0);
      edges.forEach(function (edge, i) {
        expect(edge.index).toBe(i);
        var dr = model.layout.cellRow[edge.b] - model.layout.cellRow[edge.a];
        var dc = model.layout.cellCol[edge.b] - model.layout.cellCol[edge.a];
        expect(Math.abs(dr) + Math.abs(dc)).toBe(1);
        expect(edge.midRow).toBe((model.layout.cellRow[edge.a] + model.layout.cellRow[edge.b]) / 2);
        expect(edge.midCol).toBe((model.layout.cellCol[edge.a] + model.layout.cellCol[edge.b]) / 2);
        // The solution honours the sign: the apex points at the smaller cell, a.
        expect(doc.solution[edge.a]).toBeLessThan(doc.solution[edge.b]);
      });
    });

    it('names the direction from the smaller cell to the greater one', function () {
      var model = SG.model.create({
        variantId: 'sign-test', digits: 4, units: [[0, 1, 2, 3]],
        inequalities: [{ a: 0, b: 1 }, { a: 1, b: 0 }, { a: 0, b: 2 }, { a: 2, b: 0 }],
        layout: { rows: 2, cols: 2, cellRow: [0, 0, 1, 1], cellCol: [0, 1, 0, 1] }
      });
      var edges = A.signEdges(model);
      expect(edges.map(function (e) { return e.direction; })).toEqual(['right', 'left', 'down', 'up']);
      expect(edges.map(function (e) { return e.glyph; })).toEqual(['<', '>', '\u2227', '\u2228']);
    });

    it('has no signs on a model without inequalities', function () {
      expect(A.signEdges(SG.classicModel.build(9))).toEqual([]);
    });
  });

  describe('modelAids: the Wordoku word line', function () {
    it('finds the line, the letters and the key word of both Wordoku fixtures', function () {
      ['wordoku', 'wordoku.vi'].forEach(function (name) {
        need(name);
        var doc = K.document(name);
        var model = SG.model.create(doc.model);
        var info = A.describeWord(model);
        expect(info).not.toBeNull();
        expect(info.cells).toHaveLength(9);
        expect(info.letters).toHaveLength(9);
        expect(info.word).toBe(doc.wordoku.word);
        expect(info.placement).toBe(doc.wordoku.placement);
        expect(info.line).toBe(doc.wordoku.line);
        expect(new Set(info.letters).size).toBe(9);
      });
    });

    it('reads the line from a board: letters where it is filled, the blank where it is not', function () {
      need('wordoku');
      var doc = K.document('wordoku');
      var model = SG.model.create(doc.model);
      var word = A.describeWord(model).word;
      expect(A.readWord(model, doc.solution)).toBe(word);
      expect(A.readWord(model, new Array(81).fill(0))).toBe('_________');
      expect(A.readWord(model, new Array(81).fill(0), '.')).toBe('.........');
      expect(A.isWordSolved(model, doc.solution)).toBe(true);
      expect(A.isWordSolved(model, new Array(81).fill(0))).toBe(false);
      var swapped = doc.solution.slice();
      var cells = A.describeWord(model).cells;
      var t = swapped[cells[0]];
      swapped[cells[0]] = swapped[cells[1]];
      swapped[cells[1]] = t;
      expect(A.isWordSolved(model, swapped)).toBe(false);
    });

    it('is null for a board without a word line', function () {
      expect(A.describeWord(SG.classicModel.build(9))).toBeNull();
      expect(A.readWord(SG.classicModel.build(9), new Array(81).fill(0))).toBeNull();
      expect(A.isWordSolved(SG.classicModel.build(9), new Array(81).fill(1))).toBe(false);
      expect(A.describeWord(null)).toBeNull();
    });
  });

  describe('modelAids: symbol modes', function () {
    it('offers four sets on the 9-value boards, one on Mega and the word on Wordoku', function () {
      expect(A.symbolModes(SG.classicModel.build(9))).toEqual(['digits', 'letters', 'colors', 'shapes']);
      expect(A.symbolModes(SG.classicModel.build(4))).toEqual(['digits', 'letters', 'colors', 'shapes']);
      need('wordoku');
      expect(A.symbolModes(SG.model.create(K.document('wordoku').model))).toEqual(['word', 'digits']);
      expect(A.symbolModes(K.model('mega12'))).toEqual(['digits']);
      expect(A.symbolModes(K.model('mega16'))).toEqual(['digits']);
    });
  });
})();
