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
        expect(outcome.kind).toBe('document');
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

    it('opens a document without the model block when the board follows from the variant', function () {
      need();
      ['classic4', 'classic6', 'classic9', 'diagonalX', 'hyper', 'mega12', 'mega16', 'samurai', 'sohei', 'butterfly',
        'flower'].forEach(function (name) {
        var doc = K.document(name);
        delete doc.model;
        var outcome = I.openDocument(doc);
        expect(keys(outcome.errors)).toEqual([]);
        expect(outcome.ok).toBe(true);
        expect(outcome.puzzle.id).toBe(open(K.document(name)).puzzle.id);
      });
    });

    it('asks for a current generator when a variant document has no model block and no variant rebuilds it', function () {
      need();
      ['jigsaw9', 'killer', 'greaterThan', 'wordoku'].forEach(function (name) {
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

    it('no longer opens the JSON text of a document (the import takes the generator\'s exported text)', function () {
      need();
      var text = '\uFEFF  ' + JSON.stringify(K.document('samurai'), null, 2) + '\n';
      return I.open(text).then(function (outcome) {
        expect(outcome.ok).toBe(false);
        expect(keys(outcome.errors)).toEqual(['import.error.unrecognised']);
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
      expect(I.detect('{"a":1}').kind).toBe('unknown');
      expect(I.detect('[1]').kind).toBe('unknown');
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
  describe('importer: the text of the generator\'s Export box (one or many puzzles)', function () {
    function text(name) {
      var t = K.exportText(name);
      if (t === null) SG.test.skip('the export fixtures cannot be read here (a browser on file://)');
      return t;
    }

    function gridOf(block) {
      return block.rows.join('').split('').map(function (c) { return c === '.' ? 0 : Number(c); });
    }

    ['en', 'vi'].forEach(function (code) {
      it('imports every classic puzzle of a real export in ' + code + ': clues, level and seed', function () {
        var input = text('classic-mixed.' + code);
        var blocks = I.exportBlocks(input);
        expect(blocks.length).toBe(4);
        return I.openMany(input, { source: 'file' }).then(function (result) {
          expect(result.items.length).toBe(4);
          var variants = ['classic9', 'classic4', 'classic6', 'classic9'];
          var levels = ['easy', 'easy', 'easy', 'hard'];
          var seeds = [3, 2, 7, 4];
          result.items.forEach(function (item, k) {
            expect(item.index).toBe(k + 1);
            expect(item.outcome.ok).toBe(true);
            var puzzle = item.outcome.puzzle;
            expect(puzzle.variantId).toBe(variants[k]);
            expect(Array.from(puzzle.givens)).toEqual(gridOf(blocks[k]));
            expect(puzzle.info.difficulty.achieved).toBe(levels[k]);
            expect(puzzle.info.seed).toBe(seeds[k]);
            expect(puzzle.info.source).toBe('file');
            expect(puzzle.uniqueness).toBe('unique');
            expect(SG.model.isSolution(puzzle.model, puzzle.solution)).toBe(true);
          });
        });
      });
    });

    it('gives the same puzzle as the player link of that puzzle (same id for the same clues)', function () {
      var input = text('single.en');
      return I.openMany(input).then(function (result) {
        expect(result.items.length).toBe(1);
        var puzzle = result.items[0].outcome.puzzle;
        expect(puzzle.id).toBe(I.puzzleId(puzzle.model, puzzle.givens));
        expect(I.openDocument(puzzle.document).puzzle.id).toBe(puzzle.id);
      });
    });

    var SETS = {
      'classic-mixed': ['classic9', 'classic4', 'classic6', 'classic9'],
      structured: ['jigsaw9', 'killer', 'greaterThan', 'wordoku'],
      derived: ['diagonalX', 'hyper', 'mega12', 'mega16'],
      multigrid: ['samurai', 'sohei', 'butterfly', 'flower']
    };

    ['en', 'vi'].forEach(function (code) {
      Object.keys(SETS).forEach(function (name) {
        it('imports every variant of the export "' + name + '" in ' + code + ' as the board it is', function () {
          var input = text(name + '.' + code);
          var blocks = I.exportBlocks(input);
          expect(blocks.length).toBe(4);
          return I.openMany(input).then(function (result) {
            expect(result.items.length).toBe(4);
            result.items.forEach(function (item, k) {
              expect(keys(item.outcome.errors)).toEqual([]);
              expect(item.outcome.ok).toBe(true);
              var puzzle = item.outcome.puzzle;
              expect(puzzle.variantId).toBe(SETS[name][k]);
              expect(puzzle.model.variantId).toBe(SETS[name][k]);
              expect(SG.model.validate(puzzle.model, { solve: false }).ok).toBe(true);
              expect(SG.model.isSolution(puzzle.model, puzzle.solution)).toBe(true);
              for (var c = 0; c < puzzle.givens.length; c++) {
                if (puzzle.givens[c] > 0) expect(puzzle.solution[c]).toBe(puzzle.givens[c]);
              }
              expect(puzzle.info.clues).toBe(Array.from(puzzle.givens).filter(function (v) { return v > 0; }).length);
              expect(puzzle.info.difficulty.achieved).not.toBeNull();
              // What was stored for the list of puzzles opens again, as the same puzzle.
              var again = I.openDocument(puzzle.document);
              expect(again.ok).toBe(true);
              expect(again.puzzle.id).toBe(puzzle.id);
            });
          });
        });
      });
    });

    it('rebuilds the structured boards of a real export: regions, cages, signs, and a wordoku with its word', function () {
      var input = text('structured.en');
      var blocks = I.exportBlocks(input);
      expect(Object.keys(blocks[0].extras)).toEqual(['regions']);
      expect(Object.keys(blocks[1].extras)).toEqual(['cages']);
      expect(Object.keys(blocks[2].extras)).toEqual(['signs']);
      expect(Object.keys(blocks[3].extras)).toEqual(['letters', 'word-line']);
      return I.openMany(input).then(function (result) {
        var jigsaw = result.items[0].outcome.puzzle;
        var killer = result.items[1].outcome.puzzle;
        var signs = result.items[2].outcome.puzzle;
        var word = result.items[3].outcome.puzzle;
        expect(jigsaw.model.units.length).toBe(27);
        expect(killer.model.cages.length).toBeGreaterThan(10);
        expect(killer.model.cages.reduce(function (n, c) { return n + c.cells.length; }, 0)).toBe(81);
        expect(signs.model.inequalities.length).toBeGreaterThan(0);
        expect(word.model.symbols.mode).toBe('word');
        expect(word.info.wordoku).not.toBeNull();
        expect(word.info.wordoku.placement).toBe('diagonal');
        // The word is what the solution spells on the line: nine distinct letters of the `letters` line.
        var spelled = SG.modelAids.describeWord(word.model);
        expect(spelled.word.length).toBe(9);
        expect(new Set(spelled.word.split('')).size).toBe(9);
        expect(input.indexOf(spelled.word)).toBe(-1);
      });
    });

    it('makes a share link of every imported puzzle that opens as the very same puzzle', function () {
      var base = 'https://tdat00.github.io/sudoku-player/';
      var names = ['classic-mixed.en', 'structured.en', 'derived.vi', 'multigrid.en'];
      return Promise.all(names.map(function (name) { return I.openMany(text(name)); })).then(function (all) {
        var puzzles = [];
        all.forEach(function (result) {
          result.items.forEach(function (item) {
            expect(item.outcome.ok).toBe(true);
            puzzles.push(item.outcome.puzzle);
          });
        });
        expect(puzzles.length).toBe(16);
        return Promise.all(puzzles.map(function (puzzle) {
          return SG.exchange.encode(puzzle.document).then(function (token) {
            var url = SG.exchange.playerUrl(base, token);
            expect(url.indexOf(base + '#puzzle=')).toBe(0);
            return I.open(url, { source: 'link' }).then(function (outcome) {
              expect(keys(outcome.errors)).toEqual([]);
              expect(outcome.ok).toBe(true);
              expect(outcome.puzzle.id).toBe(puzzle.id);
              expect(outcome.puzzle.variantId).toBe(puzzle.variantId);
              expect(Array.from(outcome.puzzle.solution)).toEqual(Array.from(puzzle.solution));
            });
          });
        }));
      });
    });

    it('says what is missing when a puzzle that needs structure lines has none (an older export)', function () {
      var killer = text('structured.en').trim().split('\n\n')[1].split('\n').filter(function (l) {
        return l.indexOf('cages:') !== 0;
      }).join('\n');
      var jigsaw = text('structured.en').trim().split('\n\n')[0].split('\n').filter(function (l) {
        return l.indexOf('regions:') !== 0;
      }).join('\n');
      return I.openMany(killer + '\n\n' + jigsaw.replace('#1', '#2')).then(function (result) {
        result.items.forEach(function (item) {
          assertKnown(item.outcome);
          expect(keys(item.outcome.errors)).toEqual(['import.error.exportStructure']);
        });
        expect(result.items[0].outcome.errors[0].args.field).toBe('cages');
        expect(result.items[1].outcome.errors[0].args.field).toBe('regions');
      });
    });

    it('refuses damaged structure lines: bad regions, cages, signs, letters and word line', function () {
      var blocks = text('structured.en').trim().split('\n\n');
      function damaged(block, key, value) {
        return block.split('\n').map(function (l) { return l.indexOf(key + ':') === 0 ? key + ': ' + value : l; })
          .join('\n');
      }
      var inputs = [
        damaged(blocks[0], 'regions', '111111111 222222222'),
        damaged(blocks[1], 'cages', '5=r1c1; x=r9c9'),
        damaged(blocks[1], 'cages', '5=r1c1,r1c1'),
        damaged(blocks[2], 'signs', 'r1c1>r1c2'),
        damaged(blocks[3], 'letters', 'A B C'),
        damaged(blocks[3], 'word-line', 'row 12')
      ];
      return Promise.all(inputs.map(function (text) { return I.openMany(text); })).then(function (all) {
        all.forEach(function (result) { assertKnown(result.items[0].outcome); });
        expect(keys(all[0].items[0].outcome.errors)).toEqual(['import.error.exportStructure']);
        expect(keys(all[1].items[0].outcome.errors)).toEqual(['import.error.exportStructure']);
        expect(keys(all[3].items[0].outcome.errors)).toEqual(['import.error.exportStructure']);
        expect(keys(all[4].items[0].outcome.errors)).toEqual(['import.error.exportStructure']);
        expect(keys(all[5].items[0].outcome.errors)).toEqual(['import.error.exportStructure']);
      });
    });

    it('rejects a wrong cage sum or a repeated cage cell through the board checks, not an exception', function () {
      var killer = text('structured.en').trim().split('\n\n')[1].split('\n').map(function (l) {
        return l.indexOf('cages:') === 0 ? l.replace(/^cages: \d+=/, 'cages: 99=') : l;
      }).join('\n');
      return I.openMany(killer).then(function (result) {
        assertKnown(result.items[0].outcome);
      });
    });

    it('names a variant the player does not have, or a grid that is no board of its own', function () {
      var rows = text('single.en').trim().split('\n').slice(1);
      return I.openMany('#1,Hexagon Sudoku,Easy,1\n' + rows.slice(0, 7).map(function (r) { return r.slice(0, 7); })
        .join('\n')).then(function (result) {
        expect(keys(result.items[0].outcome.errors)).toEqual(['import.error.exportVariant']);
      });
    });

    it('reads a board without the name of the variant from the grid alone', function () {
      var derived = text('derived.en').trim().split('\n\n');
      var bare = derived.map(function (block) { return block.replace(/^(#\d+),[^,]*,/, '$1,Unknown,'); });
      return I.openMany(bare.join('\n\n')).then(function (result) {
        // 9x9 grids without a structure line are classic (the diagonals and windows are not in the clues);
        // 12 and 16 rows are the Mega boards.
        expect(result.items.map(function (i) { return i.outcome.ok && i.outcome.puzzle.variantId; }))
          .toEqual(['classic9', 'classic9', 'mega12', 'mega16']);
      });
    });

    it('reads a puzzle whose header is in the other language, and a text saved with Windows line breaks', function () {
      var input = text('classic-mixed.vi').replace(/\n/g, '\r\n');
      return I.openMany(input).then(function (result) {
        expect(result.items.length).toBe(4);
        expect(result.items.every(function (item) { return item.outcome.ok; })).toBe(true);
        expect(result.items[3].outcome.puzzle.info.difficulty.achieved).toBe('hard');
      });
    });

    it('reports a header without a grid, a grid that is not square and a character that is not a clue', function () {
      var good = text('single.en').trim().split('\n');
      var rows = good.slice(1);
      var input = ['#1,Classic Sudoku 9x9,Easy,1'].join('\n') + '\n\n' +
        ['#2,Classic Sudoku 9x9,Easy,2'].concat(rows.map(function (r, i) { return i === 3 ? r.slice(0, 8) : r; }))
          .join('\n') + '\n\n' +
        ['#3,Classic Sudoku 9x9,Easy,3'].concat(rows.map(function (r, i) { return i === 0 ? 'x' + r.slice(1) : r; }))
          .join('\n') + '\n\n' + good.join('\n').replace('#1', '#4') + '\n';
      return I.openMany(input).then(function (result) {
        expect(result.items.length).toBe(4);
        expect(keys(result.items[0].outcome.errors)).toEqual(['import.error.exportNoGrid']);
        expect(keys(result.items[1].outcome.errors)).toEqual(['import.error.exportGrid']);
        expect(keys(result.items[2].outcome.errors)).toEqual(['import.error.textChars']);
        expect(result.items[3].outcome.ok).toBe(true);
      });
    });

    it('does not take a puzzle whose name says another size than its grid', function () {
      var rows = text('single.en').trim().split('\n').slice(1);
      return I.openMany('#1,Classic Sudoku 4x4,Easy,1\n' + rows.join('\n')).then(function (result) {
        expect(keys(result.items[0].outcome.errors)).toEqual(['import.error.exportShape']);
      });
    });

    it('keeps a seed that is not a number out of the puzzle, and a level it does not know', function () {
      var rows = text('single.en').trim().split('\n').slice(1);
      return I.openMany('#1,Classic Sudoku 9x9,Whatever,abc-1\n' + rows.join('\n')).then(function (result) {
        var puzzle = result.items[0].outcome.puzzle;
        expect(puzzle.info.seed).toBeNull();
        expect(puzzle.info.difficulty).toBeNull();
      });
    });

    it('hands any other input to the single-puzzle reader, and never throws on junk', function () {
      var P81 = '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79';
      return Promise.all([I.openMany(P81), I.openMany(''), I.openMany(null), I.openMany('#1,'),
        I.openMany('#1,Classic Sudoku 9x9,Easy,1\n\n#2,a,b,c\n123')]).then(function (all) {
        expect(all[0].items.length).toBe(1);
        expect(all[0].items[0].outcome.ok).toBe(true);
        expect(all[0].items[0].outcome.kind).toBe('text');
        expect(keys(all[1].items[0].outcome.errors)).toEqual(['import.error.empty']);
        expect(all[2].items[0].outcome.ok).toBe(false);
        all[3].items.concat(all[4].items).forEach(function (item) { assertKnown(item.outcome); });
        expect(all[4].items.length).toBe(2);
      });
    });

    it('refuses an export of more puzzles than a person can have made', function () {
      var rows = text('single.en').trim().split('\n').slice(1).join('\n');
      var big = [];
      for (var k = 1; k <= 201; k++) big.push('#' + k + ',Classic Sudoku 9x9,Easy,' + k + '\n' + rows);
      return I.openMany(big.join('\n\n')).then(function (result) {
        expect(result.items.length).toBe(1);
        expect(keys(result.items[0].outcome.errors)).toEqual(['import.error.tooLarge']);
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  describe('importer: the Play button of the generator (every puzzle of the list in one token)', function () {
    var BASE = 'https://tdat00.github.io/sudoku-player/';

    function text(name) {
      var t = K.exportText(name);
      if (t === null) SG.test.skip('the export fixtures cannot be read here (a browser on file://)');
      return t;
    }

    function idsOf(result) {
      return result.items.map(function (item) { return item.outcome.ok ? item.outcome.puzzle.id : null; });
    }

    it('tells a text token and its link from the token of one document', function () {
      return Promise.all([SG.exchange.encodeText(text('structured.en')), SG.exchange.encode({ format: SG.exchange.FORMAT })])
        .then(function (tokens) {
          var bundle = I.detect(tokens[0]);
          expect(bundle.kind).toBe('bundle');
          expect(bundle.value).toBe(tokens[0]);
          expect(I.detect('  ' + tokens[0] + '\n').kind).toBe('bundle');
          var link = I.detect(SG.exchange.playerUrl(BASE, tokens[0], { active: 3 }));
          expect(link.kind).toBe('bundle');
          expect(link.value).toBe(tokens[0]);
          expect(link.active).toBe(3);
          expect(I.detect(SG.exchange.playerUrl(BASE, tokens[0])).active).toBeUndefined();
          expect(I.detect(tokens[1]).kind).toBe('token');
          expect(I.detect(SG.exchange.playerUrl(BASE, tokens[1])).kind).toBe('link');
        });
    });

    ['t', 's'].forEach(function (kind) {
      it('opens every puzzle of a ' + (kind === 't' ? 'compressed' : 'plain') + ' text token, as pasted text would', function () {
        var input = text('structured.en');
        return SG.exchange.encodeText(input, { compress: kind === 't' }).then(function (token) {
          expect(token.slice(0, 2)).toBe(kind + '.');
          return Promise.all([I.openMany(token), I.openMany(input)]);
        }).then(function (both) {
          expect(both[0].items.length).toBe(4);
          expect(both[0].active).toBeUndefined();
          expect(idsOf(both[0])).toEqual(idsOf(both[1]));
          expect(idsOf(both[0]).every(function (id) { return typeof id === 'string'; })).toBe(true);
          expect(both[0].items.map(function (item) { return item.index; })).toEqual([1, 2, 3, 4]);
        });
      });
    });

    it('a link carries the number of the puzzle to show first', function () {
      var input = text('multigrid.en');
      return SG.exchange.encodeText(input).then(function (token) {
        return I.openMany(SG.exchange.playerUrl(BASE, token, { active: 3 }));
      }).then(function (result) {
        expect(result.items.length).toBe(4);
        expect(result.active).toBe(3);
        expect(result.items[2].outcome.puzzle.variantId).toBe('butterfly');
      });
    });

    it('open (one puzzle) answers with the first puzzle of a bundle', function () {
      return SG.exchange.encodeText(text('derived.en')).then(function (token) {
        return Promise.all([I.open(token), I.openMany(text('derived.en'))]);
      }).then(function (both) {
        expect(both[0].ok).toBe(true);
        expect(both[0].puzzle.id).toBe(both[1].items[0].outcome.puzzle.id);
      });
    });

    it('refuses a damaged bundle with the message of the token, and never a token inside a token', function () {
      return SG.exchange.encodeText(text('single.en')).then(function (inner) {
        return SG.exchange.encodeText(inner).then(function (outer) {
          return Promise.all([I.openMany('s.%%%'), I.openMany('t.AAAAAAAA'), I.openMany(outer),
            I.openMany('s.' + btoa(String.fromCharCode(0xff, 0xfe, 0x41)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''))]);
        });
      }).then(function (all) {
        all.forEach(function (result) {
          expect(result.items.length).toBe(1);
          expect(result.items[0].outcome.ok).toBe(false);
          assertKnown(result.items[0].outcome);
        });
        expect(keys(all[0].items[0].outcome.errors)).toEqual(['import.error.unrecognised']);
        expect(keys(all[1].items[0].outcome.errors)).toEqual(['error.exchange.invalidToken']);
        expect(keys(all[2].items[0].outcome.errors)).toEqual(['import.error.unrecognised']);
        expect(keys(all[3].items[0].outcome.errors)).toEqual(['error.exchange.invalidJson']);
      });
    });

    it('keeps the old link of one puzzle working (a document token)', function () {
      var doc = K.document('classic9');
      return SG.exchange.encode(doc).then(function (token) {
        return I.openMany(SG.exchange.playerUrl(BASE, token));
      }).then(function (result) {
        expect(result.items.length).toBe(1);
        expect(result.items[0].outcome.ok).toBe(true);
        expect(result.items[0].outcome.kind).toBe('link');
        expect(result.active).toBeUndefined();
      });
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
