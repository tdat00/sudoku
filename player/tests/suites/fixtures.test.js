// The puzzle documents of tests/fixtures/puzzles/ (made by the generator, see docs/fixtures.md): each one is a
// well-formed document whose `model` block builds a valid model with exactly one solution, independent of the
// importer, so a broken fixture is found here and not through a confusing importer failure.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var K = SG.testkit;

  var EXPECTED = {
    classic4: [4, 16], classic6: [6, 36], classic9: [9, 81], mega12: [12, 144], mega16: [16, 256],
    diagonalX: [9, 81], hyper: [9, 81], jigsaw9: [9, 81], killer: [9, 81], greaterThan: [9, 81],
    samurai: [9, 369], sohei: [9, 288], butterfly: [9, 144], flower: [9, 189], wordoku: [9, 81]
  };

  describe('puzzle fixtures', function () {
    it('cover the 15 variants and three Vietnamese documents', function () {
      var names = K.documentNames();
      expect(names).toHaveLength(18);
      expect(K.VARIANT_IDS.slice().sort()).toEqual(Object.keys(EXPECTED).sort());
      expect(names.filter(function (n) { return /\.vi$/.test(n); })).toEqual(['classic9.vi', 'killer.vi', 'wordoku.vi']);
    });

    K.documentNames().forEach(function (name) {
      it(name + ' is a document with a model that builds, validates and has one solution', function () {
        var doc = K.document(name);
        if (doc === null) SG.test.skip('the puzzle fixtures cannot be read here (a browser on file://)');
        var want = EXPECTED[doc.variantId];
        expect(SG.exchange.isDocument(doc)).toBe(true);
        expect(doc.digits).toBe(want[0]);
        expect(doc.cellCount).toBe(want[1]);
        expect(doc.givens).toHaveLength(want[1]);
        expect(doc.solution).toHaveLength(want[1]);
        expect(doc.locale).toBe(/\.vi$/.test(name) ? 'vi' : 'en');
        expect(doc.model.variantId).toBe(doc.variantId);
        var model = SG.model.create(doc.model);
        if (model.cages.length > 0) SG.comboTable.enablePropagation(model.variantId);
        if (model.inequalities.length > 0) {
          if (!SG.ineq) SG.test.skip('needs js/core/tech-ineq.js (the Greater-Than propagation extension)');
          SG.ineq.ensureExtension();
        }
        expect(model.cellCount).toBe(want[1]);
        expect(SG.model.validate(model, { solve: false }).ok).toBe(true);
        var givens = Int32Array.from(doc.givens);
        expect(SG.dfs.countSolutions(model, givens, 2)).toBe(1);
        expect(SG.model.isSolution(model, Int32Array.from(doc.solution))).toBe(true);
        for (var c = 0; c < givens.length; c++) if (givens[c] > 0) expect(doc.solution[c]).toBe(givens[c]);
      });
    });

    it('carry a rating, a seed and the generator labels in the language of the document', function () {
      var doc = K.document('killer.vi');
      if (doc === null) SG.test.skip('the puzzle fixtures cannot be read here (a browser on file://)');
      expect(doc.difficulty.requested).toBe('normal');
      expect(typeof doc.seed).toBe('number');
      expect(doc.labels.variant).toBe('Sudoku Sát thủ');
      expect(doc.labels.requested).toBe('Trung bình');
      expect(K.document('killer').labels.variant).toBe('Killer Sudoku');
    });

    it('include signs, cages and a key word where the variant has them', function () {
      if (K.document('killer') === null) SG.test.skip('the puzzle fixtures cannot be read here');
      expect(K.document('killer').model.cages.length).toBeGreaterThan(10);
      expect(K.document('greaterThan').model.inequalities.length).toBeGreaterThan(5);
      expect(K.document('wordoku').wordoku.word).toHaveLength(9);
      expect(K.document('samurai').model.layout.subGrids).toHaveLength(5);
    });
  });
})();
