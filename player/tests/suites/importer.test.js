// Opening a puzzle (js/ui/importer.js): the documents of tests/fixtures/puzzles/ (made by the generator),
// link tokens, links, text lines, and a pile of damaged and hostile input. Nothing may throw; every failure
// is a translatable issue.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var I = SG.importer;
  var K = SG.testkit;

  var NAMES = K.documentNames();
  var KNOWN_KEYS = I.ERROR_KEYS.concat(I.WARNING_KEYS);
  var available = K.document('classic9') !== null;

  function need() {
    if (!available) SG.test.skip('the puzzle fixtures cannot be read here (a browser on file://)');
  }

  function keys(list) {
    return list.map(function (item) { return item.key; });
  }

  function open(doc, options) {
    return I.openDocument(JSON.parse(JSON.stringify(doc)), options);
  }

  function assertKnown(outcome) {
    expect(outcome.ok).toBe(false);
    expect(outcome.puzzle).toBeNull();
    expect(outcome.errors.length).toBeGreaterThan(0);
    outcome.errors.forEach(function (e) {
      expect(KNOWN_KEYS).toContain(e.key);
      expect(typeof e.args).toBe('object');
    });
  }

  function expectError(outcome, key) {
    assertKnown(outcome);
    expect(keys(outcome.errors)).toContain(key);
  }

  function line(model, givens) {
    return Array.from(givens).map(function (v) { return v === 0 ? '.' : String(v); }).join('');
  }

  // ---------------------------------------------------------------------------------------------
  describe('importer: the generator documents', function () {
    NAMES.forEach(function (name) {
      it('opens ' + name + ': a valid model, one solution, a consistent solution', function () {
        need();
        var doc = K.document(name);
        var outcome = open(doc);
        expect(outcome.ok).toBe(true);
        expect(outcome.errors).toEqual([]);
        expect(outcome.kind).toBe('json');
        var puzzle = outcome.puzzle;
        expect(puzzle.variantId).toBe(doc.variantId);
        expect(puzzle.model.variantId).toBe(doc.variantId);
        expect(puzzle.model.cellCount).toBe(doc.cellCount);
        expect(puzzle.model.digits).toBe(doc.digits);
        expect(SG.model.validate(puzzle.model).ok).toBe(true);
        expect(SG.dfs.countSolutions(puzzle.model, puzzle.givens, 2)).toBe(1);
        expect(puzzle.uniqueness).toBe('unique');
        expect(puzzle.solutionSource).toBe('stored');
        expect(Array.from(puzzle.givens)).toEqual(doc.givens);
        expect(Array.from(puzzle.solution)).toEqual(doc.solution);
        expect(SG.model.isSolution(puzzle.model, puzzle.solution)).toBe(true);
        for (var c = 0; c < doc.givens.length; c++) {
          if (doc.givens[c] > 0) expect(puzzle.solution[c]).toBe(doc.givens[c]);
        }
        expect(puzzle.info.clues).toBe(doc.stats.clues);
        expect(puzzle.info.seed).toBe(doc.seed);
        expect(puzzle.info.difficulty.requested).toBe(doc.difficulty.requested);
        expect(puzzle.info.difficulty.achieved).toBe(doc.difficulty.achieved);
        expect(puzzle.symbolMode).toBe(doc.symbolMode);
        expect(outcome.warnings).toEqual([]);
      });
    });

    it('rebuilds the cages and signs of the board and switches their propagation on', function () {
      need();
      var killer = open(K.document('killer')).puzzle.model;
      expect(killer.cages.length).toBe(K.document('killer').cages.length);
      var covered = new Set();
      killer.cages.forEach(function (cage) { Array.from(cage.cells).forEach(function (c) { covered.add(c); }); });
      expect(covered.size).toBe(81);
      var gt = open(K.document('greaterThan')).puzzle.model;
      expect(gt.inequalities.length).toBe(K.document('greaterThan').inequalities.length);
      // Without the extensions the solver would count solutions of a different puzzle.
      var puzzle = open(K.document('killer')).puzzle;
      expect(SG.dfs.countSolutions(puzzle.model, puzzle.givens, 2)).toBe(1);
    });

    it('keeps the key word of a Wordoku out of the information it hands to the screens', function () {
      need();
      var doc = K.document('wordoku');
      var puzzle = open(doc).puzzle;
      expect(puzzle.info.wordoku).toEqual({ placement: doc.wordoku.placement, line: doc.wordoku.line });
      expect(JSON.stringify(puzzle.info).indexOf(doc.wordoku.word)).toBe(-1);
      expect(SG.modelAids.describeWord(puzzle.model).word).toBe(doc.wordoku.word);
    });

    it('gives the same puzzle the same id, and different puzzles different ids', function () {
      need();
      var ids = NAMES.map(function (name) { return open(K.document(name)).puzzle.id; });
      expect(new Set(ids).size).toBe(NAMES.length);
      expect(open(K.document('killer')).puzzle.id).toBe(ids[NAMES.indexOf('killer')]);
      ids.forEach(function (id) { expect(id).toMatch(/^[A-Za-z0-9]+-[0-9a-f]{16}$/); });
    });

    it('stores a smaller document that opens as the same puzzle', function () {
      need();
      NAMES.forEach(function (name) {
        var first = open(K.document(name)).puzzle;
        var text = JSON.stringify(first.document);
        expect(text.length).toBeLessThan(JSON.stringify(K.document(name)).length + 1);
        var again = I.openDocument(JSON.parse(text), { source: 'recent' });
        expect(again.ok).toBe(true);
        expect(again.puzzle.id).toBe(first.id);
        expect(Array.from(again.puzzle.solution)).toEqual(Array.from(first.solution));
        expect(again.puzzle.symbolMode).toBe(first.symbolMode);
        expect(again.puzzle.info.source).toBe('recent');
        expect(again.puzzle.info.clues).toBe(first.info.clues);
      });
    });

    it('opens a classic document without the model block, on the classic builder', function () {
      need();
      var doc = K.document('classic9');
      delete doc.model;
      var outcome = I.openDocument(doc);
      expect(outcome.ok).toBe(true);
      expect(outcome.puzzle.id).toBe(open(K.document('classic9')).puzzle.id);
    });

    it('asks for a current generator when a variant document has no model block', function () {
      need();
      NAMES.filter(function (n) { return !/^classic\d(\.|$)/.test(n); }).forEach(function (name) {
        var doc = K.document(name);
        delete doc.model;
        expectError(I.openDocument(doc), 'import.error.noModel');
      });
    });

    it('ignores a symbol mode the board cannot show and a rating it cannot read', function () {
      need();
      var doc = K.document('mega16');
      doc.symbolMode = 'shapes';
      doc.difficulty = { requested: 'impossible', achieved: 7, score: 'high' };
      var puzzle = open(doc).puzzle;
      expect(puzzle.symbolMode).toBe('digits');
      expect(puzzle.info.difficulty).toBeNull();
    });

    it('accepts a document without a rating, a seed or a date', function () {
      need();
      var doc = K.document('classic6');
      delete doc.difficulty;
      delete doc.seed;
      delete doc.generatedAt;
      delete doc.locale;
      var puzzle = open(doc).puzzle;
      expect(puzzle.info.difficulty).toBeNull();
      expect(puzzle.info.seed).toBeNull();
      expect(puzzle.info.generatedAt).toBeNull();
    });

    it('computes the solution of a document that has none', function () {
      need();
      var doc = K.document('hyper');
      var solution = doc.solution;
      doc.solution = null;
      var outcome = open(doc);
      expect(outcome.ok).toBe(true);
      expect(outcome.puzzle.solutionSource).toBe('computed');
      expect(Array.from(outcome.puzzle.solution)).toEqual(solution);
    });
  });

  // ---------------------------------------------------------------------------------------------
  describe('importer: tokens, links, JSON text', function () {
    it('opens a document from a compressed token, a plain token, a link and a bare fragment', function () {
      need();
      var doc = K.document('jigsaw9');
      var expected = open(doc).puzzle.id;
      return SG.exchange.encode(doc).then(function (token) {
        return SG.exchange.encode(doc, { compress: false }).then(function (plain) {
          expect(token.slice(0, 2)).toBe('z.');
          expect(plain.slice(0, 2)).toBe('j.');
          var inputs = [token, plain, 'https://tdat00.github.io/sudoku-player/#puzzle=' + token,
            '#puzzle=' + token, '  ' + token + '\n', token.slice(0, 20) + '\n' + token.slice(20),
            'http://127.0.0.1:8000/?lang=vi#puzzle=' + plain];
          return Promise.all(inputs.map(function (input) { return I.open(input); }));
        });
      }).then(function (outcomes) {
        outcomes.forEach(function (outcome) {
          expect(outcome.ok).toBe(true);
          expect(outcome.puzzle.id).toBe(expected);
        });
        expect(outcomes.map(function (o) { return o.kind; }))
          .toEqual(['token', 'token', 'link', 'link', 'token', 'token', 'link']);
      });
    });

    it('opens the JSON text of a document, with a BOM and spaces around it', function () {
      need();
      var text = '\uFEFF  ' + JSON.stringify(K.document('samurai'), null, 2) + '\n';
      return I.open(text).then(function (outcome) {
        expect(outcome.ok).toBe(true);
        expect(outcome.kind).toBe('json');
        expect(outcome.puzzle.variantId).toBe('samurai');
        expect(outcome.puzzle.model.cellCount).toBe(369);
      });
    });

    it('reports a damaged token as a translatable exchange error', function () {
      need();
      var doc = K.document('classic9');
      return SG.exchange.encode(doc).then(function (token) {
        var cases = [
          [token.slice(0, token.length - 7), 'error.exchange.invalidToken'],
          ['z.' + token.slice(2, 40) + '*' + token.slice(41), null],
          ['j.' + 'e30', 'import.error.noFormat'],
          ['j.bm90IGpzb24', 'error.exchange.invalidJson'],
          ['q.abcd', 'import.error.unrecognised']
        ];
        return Promise.all(cases.map(function (c) { return I.open(c[0]); })).then(function (outcomes) {
          outcomes.forEach(function (outcome, i) {
            assertKnown(outcome);
            if (cases[i][1] !== null) expect(keys(outcome.errors)).toContain(cases[i][1]);
          });
        });
      });
    });

    it('reports an oversized and an empty input', function () {
      return Promise.all([
        I.open(''), I.open('   \n'), I.open(null), I.open(undefined), I.open(42),
        I.open('j.' + new Array(4 * 1024 * 1024 + 10).join('A')), I.open('{' + new Array(100).join('"x":1,') + '}')
      ]).then(function (outcomes) {
        outcomes.forEach(assertKnown);
        expect(keys(outcomes[0].errors)).toEqual(['import.error.empty']);
        expect(keys(outcomes[3].errors)).toEqual(['import.error.empty']);
        expect(keys(outcomes[5].errors)).toEqual(['error.exchange.tooLarge']);
      });
    });

    it('classifies the input', function () {
      expect(I.detect('').kind).toBe('empty');
      expect(I.detect('{"a":1}').kind).toBe('json');
      expect(I.detect('[1]').kind).toBe('json');
      expect(I.detect('z.abc-_').kind).toBe('token');
      expect(I.detect('j.abc').value).toBe('j.abc');
      expect(I.detect('https://x.y/#puzzle=z.abc').kind).toBe('link');
      expect(I.detect('https://x.y/#puzzle=z.abc').value).toBe('z.abc');
      expect(I.detect('https://x.y/#a=1&puzzle=j.abc&b=2').value).toBe('j.abc');
      expect(I.detect('123.456.789').kind).toBe('text');
      expect(I.detect('hello world').kind).toBe('unknown');
      expect(I.detect('https://example.com/').kind).toBe('unknown');
    });
  });

  // ---------------------------------------------------------------------------------------------
  describe('importer: text lines', function () {
    var P81 = '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79';
    var S81 = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

    it('opens an 81 character line as a classic 9x9 board with its solution computed', function () {
      var outcome = I.openText(P81);
      expect(outcome.ok).toBe(true);
      expect(outcome.kind).toBe('text');
      expect(outcome.puzzle.variantId).toBe('classic9');
      expect(outcome.puzzle.solutionSource).toBe('computed');
      expect(outcome.puzzle.uniqueness).toBe('unique');
      expect(line(outcome.puzzle.model, outcome.puzzle.solution)).toBe(S81);
      expect(outcome.puzzle.info.clues).toBe(30);
      expect(outcome.puzzle.info.source).toBe('text');
      expect(outcome.puzzle.info.difficulty).toBeNull();
      expect(outcome.warnings).toEqual([]);
    });

    it('treats . 0 - _ as empty cells and ignores spaces and line breaks', function () {
      var variants = [P81, P81.replace(/\./g, '0'), P81.replace(/\./g, '-'), P81.replace(/\./g, '_')];
      variants.push(P81.match(/.{9}/g).join('\n'));
      variants.push(P81.match(/.{3}/g).join(' '));
      return Promise.all(variants.map(function (v) { return I.open(v); })).then(function (outcomes) {
        var ids = outcomes.map(function (o) { expect(o.ok).toBe(true); return o.puzzle.id; });
        expect(new Set(ids).size).toBe(1);
        expect(outcomes[0].kind).toBe('text');
      });
    });

    it('opens 36 and 16 character lines as 6x6 and 4x4 boards', function () {
      var six = I.openText('1.....' + '.2....' + '..3...' + '...4..' + '....5.' + '.....6');
      expect(six.ok).toBe(true);
      expect(six.puzzle.variantId).toBe('classic6');
      expect(six.puzzle.model.cellCount).toBe(36);
      expect(six.puzzle.uniqueness).toBe('multiple');
      expect(keys(six.warnings)).toEqual(['import.warn.severalSolutions']);
      var four = I.openText('1...' + '..1.' + '.1..' + '...1');
      expect(four.ok).toBe(true);
      expect(four.puzzle.variantId).toBe('classic4');
      expect(SG.model.isSolution(four.puzzle.model, four.puzzle.solution)).toBe(true);
    });

    it('gives the same id to the text of a board and to the document of the same board', function () {
      need();
      var doc = K.document('classic9');
      var fromText = I.openText(line(null, doc.givens));
      expect(fromText.ok).toBe(true);
      expect(fromText.puzzle.id).toBe(open(doc).puzzle.id);
      ['classic4', 'classic6'].forEach(function (name) {
        var d = K.document(name);
        expect(I.openText(line(null, d.givens)).puzzle.id).toBe(open(d).puzzle.id);
      });
    });

    it('says when a board has no solution (refused) or several (playable, with a warning)', function () {
      var clash = I.openText('11' + new Array(80).join('.'));
      expectError(clash, 'import.error.noSolution');
      var stuck = I.openText('123' + new Array(6).join('.') + '4' + new Array(2).join('.') + '4' +
        new Array(73).join('.'));
      assertKnown(stuck);
      var empty = I.openText(new Array(82).join('.'));
      expect(empty.ok).toBe(true);
      expect(empty.puzzle.uniqueness).toBe('multiple');
      expect(SG.model.isSolution(empty.puzzle.model, empty.puzzle.solution)).toBe(true);
    });

    it('refuses a board without enough clues of the right kind with a clear reason', function () {
      expectError(I.openText(new Array(81).join('.')), 'import.error.textLength');
      expectError(I.openText(P81.replace('5', '5') + '1'), 'import.error.textLength');
      expectError(I.openText('x' + P81.slice(1)), 'import.error.textChars');
      expectError(I.openText('5' + P81.slice(1, 80) + '*'), 'import.error.textChars');
      expectError(I.openText('1.....' + '.2....' + '..3...' + '...4..' + '....7.' + '.....6'),
        'import.error.textChars');
      expectError(I.openText(''), 'import.error.empty');
      expectError(I.openText(12), 'import.error.empty');
    });
  });

  // ---------------------------------------------------------------------------------------------
  describe('importer: damaged and hostile documents', function () {
    function mutate(name, fn) {
      var doc = K.document(name);
      fn(doc);
      return open(doc);
    }

    it('refuses what is not a document', function () {
      ['null', '[]', '"text"', '7', 'true', '{}', '{"format":3}', '{"format":null}'].forEach(function (text) {
        assertKnown(I.openDocument(JSON.parse(text)));
      });
      expectError(I.openDocument([]), 'import.error.notObject');
      expectError(I.openDocument({}), 'import.error.noFormat');
      expectError(I.openDocument({ format: 'nope' }), 'import.error.wrongFormat');
      expectError(I.openDocument({ format: 'sudoku-generator/v2' }), 'import.error.wrongVersion');
      expectError(I.openDocument({ format: 'sudoku-generator/v1' }), 'import.error.missingField');
      expectError(I.openDocument({ format: 'sudoku-generator/v1', variantId: 'chess' }),
        'import.error.unknownVariant');
      expectError(I.openDocument({ format: 'sudoku-generator/v1', variantId: '__proto__' }),
        'import.error.unknownVariant');
      expectError(I.openDocument({ format: 'sudoku-generator/v1', variantId: 'toString' }),
        'import.error.unknownVariant');
    });

    it('refuses a wrong version and a foreign format with their own messages', function () {
      need();
      expectError(mutate('classic9', function (d) { d.format = 'sudoku-generator/v7'; }),
        'import.error.wrongVersion');
      expectError(mutate('classic9', function (d) { d.format = 'other/v1'; }), 'import.error.wrongFormat');
    });

    it('refuses givens and solutions of the wrong shape', function () {
      need();
      expectError(mutate('classic9', function (d) { d.givens = d.givens.slice(1); }), 'import.error.badLength');
      expectError(mutate('classic9', function (d) { d.givens[3] = 10; }), 'import.error.badDigit');
      expectError(mutate('classic9', function (d) { d.givens[3] = -1; }), 'import.error.badDigit');
      expectError(mutate('classic9', function (d) { d.givens[3] = 1.5; }), 'import.error.badDigit');
      expectError(mutate('classic9', function (d) { d.givens[3] = '4'; }), 'import.error.badDigit');
      expectError(mutate('classic9', function (d) { d.givens = 'x'; }), 'import.error.badType');
      expectError(mutate('classic9', function (d) { delete d.givens; }), 'import.error.missingField');
      expectError(mutate('classic9', function (d) { d.solution = d.solution.slice(1); }),
        'import.error.badLength');
      expectError(mutate('classic9', function (d) { d.solution[0] = 0; }), 'import.error.badDigit');
      expectError(mutate('classic9', function (d) { d.digits = 6; }), 'import.error.badDigits');
      expectError(mutate('classic9', function (d) { d.cellCount = 82; }), 'import.error.badCellCount');
    });

    it('refuses a solution that breaks the rules or disagrees with the clues', function () {
      need();
      expectError(mutate('classic9', function (d) {
        var s = d.solution;
        var t = s[0];
        s[0] = s[1];
        s[1] = t;
        d.givens = d.givens.map(function () { return 0; });
      }), 'import.error.solutionUnit');
      expectError(mutate('classic9', function (d) {
        var at = d.givens.findIndex(function (g) { return g > 0; });
        d.givens[at] = d.givens[at] % 9 + 1;
      }), 'import.error.givenMismatch');
      expectError(mutate('killer', function (d) { d.solution[0] = d.solution[0] % 9 + 1; d.givens[0] = 0; }),
        'import.error.solutionUnit');
      expectError(mutate('wordoku', function (d) {
        var cells = [];
        d.model.fixedCells.forEach(function (v, i) { if (v > 0) cells.push(i); });
        var a = d.solution[cells[0]];
        var b = d.solution[cells[1]];
        // Swap two letters of the word line in every row and column to keep the units valid is not possible;
        // a plain swap of two values of the line breaks a unit or the word, either is refused.
        d.givens = d.givens.map(function () { return 0; });
        d.solution[cells[0]] = b;
        d.solution[cells[1]] = a;
      }), 'import.error.solutionUnit');
    });

    it('refuses a puzzle with no solution and accepts one with several, with a warning', function () {
      need();
      expectError(mutate('classic9', function (d) {
        var empties = [];
        d.givens.forEach(function (g, i) { if (g === 0) empties.push(i); });
        // Two equal clues in a row.
        var row = Math.floor(empties[0] / 9);
        var spots = empties.filter(function (i) { return Math.floor(i / 9) === row; });
        d.givens[spots[0]] = 1;
        d.givens[spots[1]] = 1;
        d.solution = null;
      }), 'import.error.noSolution');
      var many = mutate('classic9', function (d) {
        d.givens = d.givens.map(function (g, i) { return i < 3 ? g : 0; });
        d.solution = null;
      });
      expect(many.ok).toBe(true);
      expect(many.puzzle.uniqueness).toBe('multiple');
      expect(keys(many.warnings)).toEqual(['import.warn.severalSolutions']);
    });

    it('refuses a model block that is damaged', function () {
      need();
      var bad = function (fn) { return mutate('classic9', fn); };
      expectError(bad(function (d) { d.model = 5; }), 'import.error.badModel');
      expectError(bad(function (d) { d.model = []; }), 'import.error.badModel');
      expectError(bad(function (d) { d.model.variantId = 'samurai'; }), 'import.error.badModel');
      expectError(bad(function (d) { d.model.digits = 4; }), 'import.error.badModel');
      expectError(bad(function (d) { d.model.cellCount = 80; }), 'import.error.badModel');
      expectError(bad(function (d) { delete d.model.units; }), 'import.error.badModel');
      expectError(bad(function (d) { d.model.units = 'x'; }), 'import.error.badModel');
      expectError(bad(function (d) { d.model.units[0][0] = 81; }), 'import.error.badModel');
      expectError(bad(function (d) { d.model.units[0][0] = -1; }), 'import.error.badModel');
      expectError(bad(function (d) { d.model.units[0] = []; }), 'import.error.badModel');
      expectError(bad(function (d) { d.model.units.push(d.model.units[0]); }), 'import.error.badModel');
      expectError(bad(function (d) { d.model.unitMeta = []; }), 'import.error.badModel');
      expectError(bad(function (d) { d.model.unitMeta[0].label = ''; }), 'import.error.badModel');
      expectError(bad(function (d) { d.model.layout = null; }), 'import.error.badModel');
      expectError(bad(function (d) { d.model.layout.rows = 1e9; }), 'import.error.badModel');
      expectError(bad(function (d) { d.model.layout.cellRow = d.model.layout.cellRow.slice(1); }),
        'import.error.badModel');
      expectError(bad(function (d) { d.model.layout.cellCol[0] = 99; }), 'import.error.badModel');
      expectError(bad(function (d) { d.model.layout.cellRegion[0] = -5; }), 'import.error.badModel');
      expectError(bad(function (d) { d.model.layout.overlays = [{ kind: 'x', cells: [1000] }]; }),
        'import.error.badModel');
      expectError(bad(function (d) { d.model.symbols.labels = ['1', '2']; }), 'import.error.badModel');
      expectError(bad(function (d) { d.model.symbols.labels[1] = d.model.symbols.labels[0]; }),
        'import.error.badModel');
      expectError(bad(function (d) { d.model.symbols = null; }), 'import.error.badModel');
      expectError(bad(function (d) { d.model.fixedCells = [1, 2]; }), 'import.error.badModel');
    });

    it('refuses a board that is not a valid Sudoku board', function () {
      need();
      expectError(mutate('classic9', function (d) {
        d.model.units[0].pop();
        d.model.units[0].push(d.model.units[0][0]);
      }), 'import.error.badStructure');
      expectError(mutate('classic9', function (d) { d.model.layout.cellCol[1] = d.model.layout.cellCol[0]; d.model.layout.cellRow[1] = d.model.layout.cellRow[0]; }),
        'import.error.badStructure');
      expectError(mutate('classic9', function (d) { d.layout.cellRegion[0] = 5; }), 'import.error.badLayout');
      expectError(mutate('classic9', function (d) { d.symbols.labels[0] = 'Q'; }), 'import.error.badLayout');
    });

    it('refuses damaged cages and signs', function () {
      need();
      expectError(mutate('killer', function (d) { d.model.cages[0].cells = [0, 0]; }), 'import.error.cageBadCells');
      expectError(mutate('killer', function (d) { d.model.cages[0].sum = 999; }), 'import.error.cageBadSum');
      expectError(mutate('killer', function (d) { d.model.cages[1].cells.push(d.model.cages[0].cells[0]); }),
        'import.error.cageOverlap');
      expectError(mutate('killer', function (d) { d.model.cages.pop(); }), 'import.error.cageNotCovered');
      expectError(mutate('killer', function (d) { delete d.model.cages; }), 'import.error.badModel');
      expectError(mutate('killer', function (d) { d.cages[0].sum += 1; }), 'import.error.badLayout');
      expectError(mutate('killer', function (d) { d.model.cages = new Array(500).fill(d.model.cages[0]); }),
        'import.error.badModel');
      expectError(mutate('greaterThan', function (d) { d.model.inequalities[0].a = 81; }),
        'import.error.ineqBadIndex');
      expectError(mutate('greaterThan', function (d) { d.model.inequalities[0].b = d.model.inequalities[0].a; }),
        'import.error.ineqSelf');
      expectError(mutate('greaterThan', function (d) { d.model.inequalities.push(d.model.inequalities[0]); }),
        'import.error.ineqDuplicate');
      expectError(mutate('greaterThan', function (d) {
        d.model.inequalities[0] = { a: 0, b: 40 };
      }), 'import.error.ineqNotAdjacent');
      expectError(mutate('greaterThan', function (d) {
        var q = d.model.inequalities[0];
        d.model.inequalities.push({ a: q.b, b: q.a });
      }), 'import.error.ineqCycle');
      expectError(mutate('greaterThan', function (d) { d.inequalities[0].a = d.inequalities[0].b; }),
        'import.error.badLayout');
    });

    it('is not fooled by prototype keys, huge numbers or deep nesting', function () {
      need();
      var polluted = JSON.parse('{"__proto__": {"polluted": 1}, "format": "sudoku-generator/v1", ' +
        '"variantId": "classic9", "givens": []}');
      expectError(I.openDocument(polluted), 'import.error.badLength');
      expect(({}).polluted).toBeUndefined();
      var doc = K.document('classic9');
      doc.givens = new Array(1e6).fill(0);
      expectError(I.openDocument(doc), 'import.error.badLength');
      var deep = '[';
      for (var i = 0; i < 100; i++) deep += '[';
      return I.open(deep).then(function (outcome) {
        assertKnown(outcome);
        return I.open('{"a":' + new Array(5000).join('[') + new Array(5000).join(']') + '}');
      }).then(assertKnown);
    });

    it('survives random damage to every fixture: a known issue or a valid puzzle, never an exception', function () {
      need();
      var rng = K.rng.create(424242);
      var started = Date.now();
      var refused = 0;
      var accepted = 0;
      NAMES.forEach(function (name) {
        for (var round = 0; round < 12; round++) {
          var doc = K.document(name);
          var r = rng.fork(name + round);
          for (var k = 0; k < 1 + r.int(3); k++) damage(doc, r);
          var outcome;
          expect(function () { outcome = I.openDocument(doc); }).not.toThrow();
          if (outcome.ok) {
            accepted++;
            expect(SG.model.validate(outcome.puzzle.model, { solve: false }).ok).toBe(true);
          } else {
            refused++;
            assertKnown(outcome);
          }
        }
      });
      expect(refused).toBeGreaterThan(accepted);
      expect(Date.now() - started).toBeLessThan(60000);
    });

    /** One random change to a random place of a document: a value, a list, a type or a deletion. */
    function damage(doc, r) {
      var paths = [['givens'], ['solution'], ['model', 'units'], ['model', 'unitMeta'], ['model', 'layout'],
        ['model', 'layout', 'cellRow'], ['model', 'layout', 'cellRegion'], ['model', 'symbols'],
        ['model', 'cages'], ['model', 'inequalities'], ['model', 'fixedCells'], ['layout'], ['symbols'],
        ['digits'], ['cellCount'], ['variantId'], ['symbolMode'], ['difficulty'], ['seed'], ['format']];
      var path = r.pick(paths);
      var holder = doc;
      for (var i = 0; i < path.length - 1; i++) {
        if (holder === null || typeof holder !== 'object') return;
        holder = holder[path[i]];
      }
      if (holder === null || typeof holder !== 'object') return;
      var key = path[path.length - 1];
      var value = holder[key];
      switch (r.int(6)) {
        case 0: delete holder[key]; break;
        case 1: holder[key] = null; break;
        case 2: holder[key] = r.pick(['x', 7, -3, 1e12, {}, [], true]); break;
        case 3:
          if (Array.isArray(value) && value.length > 0) value.splice(r.int(value.length), 1);
          break;
        case 4:
          if (Array.isArray(value) && value.length > 0) value[r.int(value.length)] = r.pick([-1, 0, 99, 1.5, 'a', null]);
          break;
        default:
          if (Array.isArray(value)) value.push(r.pick([0, 1, 100, 'z']));
      }
    }
  });
})();
