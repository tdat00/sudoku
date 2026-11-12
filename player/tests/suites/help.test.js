// Help: the guide (help.html, js/ui/help.js): its sections and texts in both languages, the examples of the
// techniques (every one replayed with the player's own hint code), the shortcuts it names, and the claims of
// the Player part of the user and developer guides (../USERGUIDE.md, ../USERGUIDE.vn.md, ../DEVELOPERGUIDE.md,
// ../DEVELOPERGUIDE.vn.md), all checked against the code they
// describe.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var H = SG.help;
  var NODE = SG.test.node;

  function ready() {
    if (!H || !SG.i18n || !SG.importer || !SG.techniques || !SG.play || !SG.helpExamples) {
      SG.test.skip('SG.help is not loaded here');
    }
  }

  function needNode() {
    if (!NODE || !NODE.fs) SG.test.skip('needs the Node file system; skipped in the browser');
    return NODE;
  }

  function read(rel) {
    var env = needNode();
    return env.fs.readFileSync(env.path.join(env.root, rel), 'utf8').replace(/^\uFEFF/, '');
  }

  function placeholders(text) {
    var found = {};
    String(text).replace(/\{(\w+)\}/g, function (m, name) { found[name] = true; return m; });
    return Object.keys(found).sort();
  }

  function bothLanguages(key) {
    ['en', 'vi'].forEach(function (code) {
      expect(typeof SG.locales[code][key]).toBe('string');
      expect(SG.locales[code][key].trim().length).toBeGreaterThan(0);
    });
    expect(placeholders(SG.locales.vi[key])).toEqual(placeholders(SG.locales.en[key]));
  }

  function inLocale(code, fn) {
    SG.i18n.setLocale(code);
    try {
      return fn();
    } finally {
      SG.i18n.setLocale('en');
    }
  }

  describe('help: the sections of the guide', function () {
    it('has the basics, the hints, the techniques and the keyboard, and no About or Variants', function () {
      ready();
      expect(H.SECTION_IDS).toEqual(['how', 'hints', 'techniques', 'keys']);
      H.SECTION_IDS.forEach(function (id) { bothLanguages('help.section.' + id); });
      ['help.page.title', 'help.page.lead', 'help.page.back', 'help.page.toc', 'help.page.skip']
        .forEach(bothLanguages);
      Object.keys(SG.locales.en).forEach(function (key) {
        expect(/^help\.(tab|about|variants?)\b/.test(key)).toBe(false);
      });
    });

    it('every step of the basics, every level of the hints and the technique texts exist in both languages', function () {
      ready();
      H.BASIC_STEPS.forEach(function (id) {
        bothLanguages('help.how.' + id + '.title');
        bothLanguages('help.how.' + id + '.text');
      });
      ['help.how.intro', 'help.how.checkModes', 'help.hints.intro', 'help.hints.sound', 'help.techniques.intro',
        'help.example.source', 'help.example.region', 'help.example.cells',
        'help.example.move', 'help.example.unavailable', 'help.example.legend.region', 'help.example.legend.cells',
        'help.example.legend.target', 'help.example.legend.elim', 'help.example.legend.keep'].forEach(bothLanguages);
      ['level1', 'level2', 'level3'].forEach(function (id) {
        bothLanguages('help.hints.' + id + '.title');
        bothLanguages('help.hints.' + id + '.text');
      });
    });

    it('the basics tell about the play controls of the page: Play, Pause, Reset, More actions, Options', function () {
      ready();
      var how = SG.locales.en;
      expect(how['help.how.play.text']).toContain('Reset');
      expect(how['help.how.notes.text']).toContain('More actions');
      expect(how['help.how.check.text']).toContain('Options');
      expect(how['help.how.get.text']).toContain('Play');
      expect(how['help.how.get.text']).toContain('Import');
      expect(SG.locales.vi['help.how.get.text']).toContain('Nhập đề');
    });

    it('every technique has a translated name and description, and so has its group', function () {
      ready();
      var list = SG.techniques.list();
      expect(list.length).toBe(26);
      list.forEach(function (tech) {
        bothLanguages('technique.' + tech.id);
        bothLanguages('technique.' + tech.id + '.desc');
      });
      SG.techniques.GROUPS.forEach(function (group) { bothLanguages('techniqueGroup.' + group); });
    });

    it('lists the shortcuts with texts in both languages, and they are the keys the play module handles', function () {
      ready();
      H.SHORTCUTS.forEach(function (row) {
        bothLanguages('help.keys.' + row.id);
        expect(row.keys.length).toBeGreaterThan(0);
      });
      var play = read('js/ui/play.js');
      expect(play).toMatch(/lower === 'n'/);
      expect(play).toMatch(/lower === 'h'/);
      expect(play).toContain("key === '`'");
      expect(play).toContain("'Backspace'");
      expect(play).toContain("'Delete'");
      expect(play).toContain("key === 'Escape'");
      expect(play).toMatch(/lower === 'z'/);
      expect(play).toMatch(/lower === 'y'/);
      var named = H.SHORTCUTS.map(function (row) { return row.id; });
      ['move', 'enter', 'erase', 'notes', 'hint', 'undo', 'redo', 'escape'].forEach(function (id) {
        expect(named).toContain(id);
      });
    });
  });

  describe('help: an example for every technique', function () {
    it('has an example for exactly the techniques of the registry, as a fixed snapshot', function () {
      ready();
      var ids = SG.techniques.list().map(function (tech) { return tech.id; }).sort();
      expect(Object.keys(SG.helpExamples).sort()).toEqual(ids);
      ids.forEach(function (id) {
        var ex = SG.helpExamples[id];
        expect(typeof ex.variant).toBe('string');
        expect(ex.givens.length).toBe(ex.values.length);
        expect(ex.hint.technique).toBe(id);
        expect(ex.source.puzzle.indexOf('#1,')).toBe(0);
        expect(Number.isInteger(ex.source.step) && ex.source.step >= 0).toBe(true);
      });
    });

    it('builds every example without playing: the board, the notes of the cells shown and the hint', function () {
      ready();
      SG.techniques.list().forEach(function (tech) {
        var ex = H.buildExample(tech.id);
        expect(ex === null ? 'no example for ' + tech.id : '').toBe('');
        expect(ex.hint.ok).toBe(true);
        expect(ex.hint.technique).toBe(tech.id);
        expect(ex.values.length).toBe(ex.model.cellCount);
        expect(ex.notes.length).toBe(ex.model.cellCount);
        expect(ex.hint.placements.length + ex.hint.eliminations.length).toBeGreaterThan(0);
        // The move is a real one: the digit to place and the notes to remove are still among the notes shown.
        ex.hint.placements.forEach(function (p) { expect((ex.notes[p[0]] >> (p[1] - 1)) & 1).toBe(1); });
        // (a hint can name a candidate that an earlier hint already took out of the notes, but not all of
        // them).
        if (ex.hint.eliminations.length > 0) {
          expect(ex.hint.eliminations.some(function (e) { return ((ex.notes[e[0]] >> (e[1] - 1)) & 1) === 1; })).toBe(true);
        }
        ex.hint.targets.forEach(function (c) { expect(ex.values[c]).toBe(0); });
      });
    });

    it('replaying the puzzle of an example with the hint code of the player gives the same hint', function () {
      ready();
      SG.techniques.list().forEach(function (tech) {
        var ex = SG.helpExamples[tech.id];
        var block = SG.importer.exportBlocks(ex.source.puzzle);
        var parsed = SG.importer.parseExportBlock(block[0], 1);
        expect(parsed.ok).toBe(true);
        var puzzle = SG.importer.openDocument(parsed.data, { kind: 'export' }).puzzle;
        var game = SG.play.createGame(puzzle.model, puzzle.givens, puzzle.solution, { now: function () { return 0; } });
        game.fillNotes();
        for (var k = 0; k < ex.source.step; k++) {
          game.clearHint();
          expect(game.hint().ok).toBe(true);
          game.applyHint();
        }
        game.clearHint();
        var hint = game.hint();
        expect(hint.technique).toBe(tech.id);
        ['cells', 'targets', 'placements', 'eliminations'].forEach(function (field) {
          expect(JSON.stringify(hint[field])).toBe(JSON.stringify(ex.hint[field]));
        });
        var built = H.buildExample(tech.id);
        for (var c = 0; c < built.values.length; c++) expect(game.userValue(c)).toBe(built.values[c]);
        Object.keys(ex.notes).forEach(function (cell) { expect(game.getNotes(Number(cell))).toBe(ex.notes[cell]); });
      });
    });

    it('a technique that only some variants have is shown on such a variant', function () {
      ready();
      SG.techniques.list().forEach(function (tech) {
        if (!tech.variantScope) return;
        var ex = H.buildExample(tech.id);
        expect(tech.variantScope).toContain(ex.variantId);
      });
    });

    it('the hint of each example reads in both languages, with the cells and the move named', function () {
      ready();
      SG.techniques.list().forEach(function (tech) {
        var ex = H.buildExample(tech.id);
        ['en', 'vi'].forEach(function (code) {
          inLocale(code, function () {
            var said = SG.play.describeHint(ex.model, ex.hint, { mode: 'digits' });
            expect(said.ok).toBe(true);
            expect(said.title).toBe(SG.i18n.t('technique.' + tech.id));
            ['explanation', 'cells', 'action', 'region'].forEach(function (field) {
              expect(said[field].trim().length).toBeGreaterThan(0);
              expect(said[field]).not.toMatch(/\{\w+\}/);
            });
          });
        });
      });
    });

    it('an unknown technique has no example, and a damaged one is not an exception', function () {
      ready();
      expect(H.buildExample('nope')).toBe(null);
      expect(H.buildExample('')).toBe(null);
    });

    it('the examples come from the tool that makes them, and the page draws them with the player code', function () {
      ready();
      var examples = read('js/ui/help-examples.js');
      expect(examples).toContain('GENERATED by tests/tools/make-technique-examples.js');
      expect(read('tests/tools/make-technique-examples.js')).toContain('help-examples.js');
      var code = read('js/ui/help.js');
      expect(code).not.toContain('createGame');
      expect(code).toContain('SG.play.describeHint');
      expect(code).toContain('SG.play.renderSnapshot');
    });
  });

  describe('help: an example on a Jigsaw board', function () {
    var T = SG.fixtures && SG.fixtures.helpExampleTools;
    var JIGSAW = SG.fixtures && SG.fixtures.jigsawHelpSource;

    function jigsawReady() {
      ready();
      if (!T || !JIGSAW) SG.test.skip('the Jigsaw source fixture is not loaded here');
    }

    function item() {
      return { variantId: JIGSAW.variantId, level: JIGSAW.level, seed: JIGSAW.seed, text: JIGSAW.text };
    }

    function plain(value) {
      return JSON.parse(JSON.stringify(value, function (key, v) {
        return ArrayBuffer.isView(v) ? Array.from(v) : v;
      }));
    }

    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    /** The parts of a model that must agree, as plain data. */
    function shape(model) {
      var layout = plain(model.layout);
      return {
        variantId: model.variantId, digits: model.digits, cellCount: model.cellCount, units: plain(model.units),
        unitMeta: plain(model.unitMeta), cages: plain(model.cages), inequalities: plain(model.inequalities),
        symbols: plain(model.symbols), fixedCells: plain(model.fixedCells),
        layout: { rows: layout.rows, cols: layout.cols, cellRow: layout.cellRow, cellCol: layout.cellCol,
          cellRegion: layout.cellRegion, overlays: layout.overlays, subGrids: layout.subGrids }
      };
    }

    /** The real source played the way the player does, up to the first hint that `wanted` accepts. */
    function reach(wanted) {
      var opened = T.openSource(SG, item());
      expect(opened.ok).toBe(true);
      var puzzle = opened.puzzle;
      var game = SG.play.createGame(puzzle.model, puzzle.givens, puzzle.solution,
        { now: function () { return 0; } });
      game.fillNotes();
      for (var k = 0; k < 400 && !game.isSolved(); k++) {
        game.clearHint();
        var hint = game.hint();
        expect(hint !== null && hint.ok === true).toBe(true);
        if (wanted(hint)) return { puzzle: puzzle, game: game, hint: hint, step: k };
        game.applyHint();
      }
      throw new Error('the Jigsaw source has no such hint within 400 hints');
    }

    /** Supplies the snapshot as the example of its technique for the call, and puts the catalogue back. */
    function using(entry, fn) {
      var saved = SG.helpExamples;
      var id = entry.hint.technique;
      var next = Object.assign({}, saved);
      next[id] = entry;
      SG.helpExamples = next;
      try {
        return fn(id);
      } finally {
        SG.helpExamples = saved;
      }
    }

    /** The snapshot as the catalogue stores it: plain data that shares nothing with the game. */
    function snapshotOf(run) {
      return clone(T.snapshot(SG, run.game, run.puzzle, run.hint, item(), run.step));
    }

    var SCENES = [
      ['the first hint', function () { return true; }],
      ['the first hint that looks into a region', function (hint) {
        return hint.region !== null && hint.region.kind === 'region';
      }]
    ];

    SCENES.forEach(function (scene) {
      it('rebuilds the regions, the notes shown and the move of ' + scene[0] + ' of a real puzzle', function () {
        jigsawReady();
        var run = reach(scene[1]);
        var game = run.game;
        var model = run.puzzle.model;
        var before = {};
        for (var c = 0; c < model.cellCount; c++) before[c] = game.getNotes(c);
        using(snapshotOf(run), function (id) {
          var built = H.buildExample(id);
          expect(built === null ? 'no example' : '').toBe('');
          expect(built.variantId).toBe('jigsaw9');

          var want = shape(model);
          var got = shape(built.model);
          Object.keys(want).forEach(function (key) {
            expect(JSON.stringify(got[key])).toBe(JSON.stringify(want[key]));
          });
          expect(got.layout.cellRegion).not.toEqual(shape(SG.classicModel.build(9)).layout.cellRegion);
          expect(got.units.length).toBe(27);
          expect(got.unitMeta.slice(18).map(function (m) { return m.kind; })).toEqual(
            ['region', 'region', 'region', 'region', 'region', 'region', 'region', 'region', 'region']);

          expect(built.givens).toEqual(Array.from(run.puzzle.givens));
          for (var cell = 0; cell < model.cellCount; cell++) {
            expect(built.values[cell]).toBe(game.userValue(cell));
          }

          // Only the cells the page draws keep their notes; the others are empty, not the full fill of the game.
          var shown = T.shownCells(run.hint);
          var kept = 0;
          for (var i = 0; i < model.cellCount; i++) {
            var show = shown.indexOf(i) !== -1 && game.userValue(i) === 0;
            expect(built.notes[i]).toBe(show ? before[i] : 0);
            if (!show && before[i] !== 0) kept++;
          }
          expect(kept).toBeGreaterThan(0);

          ['cells', 'targets', 'placements', 'eliminations', 'region'].forEach(function (field) {
            expect(JSON.stringify(built.hint[field])).toBe(JSON.stringify(run.hint[field]));
          });
          game.applyHint();
          built.hint.placements.forEach(function (p) {
            expect(built.values[p[0]]).toBe(0);
            expect(game.userValue(p[0])).toBe(p[1]);
          });
          built.hint.eliminations.forEach(function (e) {
            expect((before[e[0]] >> (e[1] - 1)) & 1).toBe(1);
            expect((game.getNotes(e[0]) >> (e[1] - 1)) & 1).toBe(0);
          });
          expect(built.hint.placements.length + built.hint.eliminations.length).toBeGreaterThan(0);
        });
      });
    });

    it('draws the region a hint looks into with its own cells, and names it in both languages', function () {
      jigsawReady();
      var run = reach(SCENES[1][1]);
      using(snapshotOf(run), function (id) {
        var built = H.buildExample(id);
        var region = built.hint.region;
        var unit = built.model.unitMeta.findIndex(function (m) {
          return m.kind === 'region' && m.label === region.label;
        });
        expect(unit).toBeGreaterThan(17);
        var cells = region.cells.slice().sort(function (a, b) { return a - b; });
        expect(Array.from(built.model.units[unit])).toEqual(cells);
        var map = built.model.layout.cellRegion;
        expect(new Set(cells.map(function (cell) { return map[cell]; })).size).toBe(1);
        ['en', 'vi'].forEach(function (code) {
          inLocale(code, function () {
            var said = SG.play.describeHint(built.model, built.hint, { mode: 'digits' });
            expect(said.ok).toBe(true);
            expect(said.region).toContain(region.label);
          });
        });
      });
    });

    it('builds a board of its own: a later change of the example or of the board leaves the other as it was',
      function () {
        jigsawReady();
        var snap = snapshotOf(reach(SCENES[0][1]));
        using(snap, function (id) {
          var built = H.buildExample(id);
          var kept = Array.from(built.model.layout.cellRegion);
          var units = plain(built.model.units);
          snap.cellRegion[0] = 8;
          snap.cellRegion[80] = 8;
          expect(Array.from(built.model.layout.cellRegion)).toEqual(kept);
          expect(plain(built.model.units)).toEqual(units);
          built.model.layout.cellRegion[1] = 7;
          expect(snap.cellRegion[1]).toBe(kept[1]);
        });
      });

    it('gives no board, and never the regular boxes, for a missing or malformed map', function () {
      jigsawReady();
      var good = snapshotOf(reach(SCENES[0][1]));
      var cases = [
        ['no map', function (ex) { delete ex.cellRegion; }],
        ['a null map', function (ex) { ex.cellRegion = null; }],
        ['an empty map', function (ex) { ex.cellRegion = []; }],
        ['80 entries', function (ex) { ex.cellRegion.pop(); }],
        ['82 entries', function (ex) { ex.cellRegion.push(0); }],
        ['a string', function (ex) { ex.cellRegion = ex.cellRegion.join(''); }],
        ['a typed array', function (ex) { ex.cellRegion = Int32Array.from(ex.cellRegion); }],
        ['a region number above the last region', function (ex) { ex.cellRegion[0] = 9; }],
        ['a negative region number', function (ex) { ex.cellRegion[0] = -1; }],
        ['a fractional region number', function (ex) { ex.cellRegion[0] = 0.5; }],
        ['a region number as text', function (ex) { ex.cellRegion[0] = String(ex.cellRegion[0]); }],
        ['regions of 8 and 10 cells', function (ex) { ex.cellRegion[ex.cellRegion.indexOf(0)] = 1; }]
      ];
      var saved = SG.helpExamples;
      cases.forEach(function (one) {
        var ex = clone(good);
        one[1](ex);
        using(ex, function (id) {
          expect(H.buildExample(id) === null ? '' : one[0] + ' gave a board').toBe('');
        });
      });
      expect(SG.helpExamples).toBe(saved);
      using(good, function (id) { expect(H.buildExample(id)).not.toBe(null); });
    });
  });

  describe('help: the page and the Help button', function () {
    it('the page markup has the mount points, and the player links to it in a new tab', function () {
      ready();
      var page = read('help.html');
      ['id="help-root"', 'id="help-toc"', 'data-lang="en"', 'data-lang="vi"', 'data-theme-value="dark"']
        .forEach(function (part) { expect(page).toContain(part); });
      var index = read('index.html');
      expect(index).toMatch(/<a id="btn-help"[^>]*href="help\.html"[^>]*target="_blank"[^>]*rel="noopener"/);
      expect(index).not.toContain('js/ui/help.js');
    });

    it('does not start on a page without #help-root (a Node run, or the page of the player)', function () {
      ready();
      expect(H.start()).toBe(false);
    });
  });

  describe('help: what the user guide claims', function () {
    var USER_GUIDES = ['../USERGUIDE.md', '../USERGUIDE.vn.md'];
    var DEV_GUIDES = ['../DEVELOPERGUIDE.md', '../DEVELOPERGUIDE.vn.md'];
    var GUIDES = USER_GUIDES.concat(DEV_GUIDES);

    /** The "Sudoku Player" part of a guide: from its heading to the end of the file. */
    function playerPart(rel) {
      var text = read(rel);
      var start = text.indexOf('\n# Sudoku Player');
      expect(start).toBeGreaterThan(-1);
      return text.slice(start);
    }

    it('has a user and a developer guide in English and Vietnamese, each with a Player part, linked to each other',
      function () {
        ready();
        GUIDES.forEach(function (rel) {
          var text = read(rel);
          expect(text).toContain('\n# Sudoku Generator');
          expect(text).toContain('\n# Sudoku Player');
          expect(text.indexOf('\n# Sudoku Generator')).toBeLessThan(text.indexOf('\n# Sudoku Player'));
        });
        expect(read('../USERGUIDE.md')).toContain('[Tiếng Việt](USERGUIDE.vn.md)');
        expect(read('../USERGUIDE.vn.md')).toContain('[English](USERGUIDE.md)');
        expect(read('../DEVELOPERGUIDE.md')).toContain('[Tiếng Việt](DEVELOPERGUIDE.vn.md)');
        expect(read('../DEVELOPERGUIDE.vn.md')).toContain('[English](DEVELOPERGUIDE.md)');
        expect(read('../USERGUIDE.md')).toContain('](DEVELOPERGUIDE.md)');
        expect(read('../USERGUIDE.vn.md')).toContain('](DEVELOPERGUIDE.vn.md)');
        expect(read('../DEVELOPERGUIDE.md')).toContain('](USERGUIDE.md)');
        expect(read('../DEVELOPERGUIDE.vn.md')).toContain('](USERGUIDE.vn.md)');
        expect(needNode().fs.existsSync(needNode().path.join(needNode().root, 'README.md'))).toBe(false);
      });

    it('has a table of contents, the links to the live apps, and every #anchor it uses exists', function () {
      ready();
      GUIDES.forEach(function (rel) {
        var text = read(rel);
        expect(text).toContain('- [Sudoku Player](#sudoku-player)');
        expect(text).toContain('https://tdat00.github.io/sudoku/player/');
        expect(text).toContain('https://tdat00.github.io/sudoku/generator/');
        // GitHub's slug of a heading: lower case, spaces to hyphens, punctuation dropped.
        var anchors = { top: true };
        (text.match(/<a id="([\w-]+)"><\/a>/g) || []).forEach(function (a) { anchors[/id="([\w-]+)"/.exec(a)[1]] = true; });
        (text.replace(/```[\s\S]*?```/g, '').match(/^#{1,6} .+$/gm) || []).forEach(function (line) {
          anchors[line.replace(/^#+ /, '').trim().toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, '').replace(/ /g, '-')] = true;
        });
        (text.match(/\]\(#([^)]+)\)/g) || []).forEach(function (link) {
          var id = /\(#([^)]+)\)/.exec(link)[1];
          expect(anchors[id] ? '' : rel + ': #' + id + ' has no target').toBe('');
        });
      });
    });

    it('names the 15 variants in both guides, as the app does', function () {
      ready();
      var en = playerPart('../USERGUIDE.md');
      var vi = playerPart('../USERGUIDE.vn.md');
      expect(en).toContain('15 variants');
      expect(vi).toContain('15 biến thể');
      // The guide uses the short names; every variant has one word of its English name in the list.
      ['Classic', 'Mega', 'Monster', 'Diagonal', 'Hyper', 'Windoku', 'Jigsaw', 'Killer', 'Greater-Than',
        'Samurai', 'Sohei', 'Butterfly', 'Flower', 'Wordoku'].forEach(function (name) {
        expect(en).toContain(name);
      });
      ['Cổ điển', 'Khổng lồ', 'Quái vật', 'Đường chéo', 'Siêu vùng', 'Ghép hình', 'Sát thủ', 'So sánh',
        'Samurai', 'Sohei', 'Cánh bướm', 'Bông hoa', 'Wordoku'].forEach(function (name) {
        expect(vi).toContain(name);
      });
      expect(SG.importer.VARIANTS).toBeDefined();
      expect(Object.keys(SG.importer.VARIANTS).length).toBe(15);
    });

    it('its numbers are the numbers of the code: 26 techniques, 100 + 100 puzzles, 8 MB files', function () {
      ready();
      var en = playerPart('../USERGUIDE.md');
      var vi = playerPart('../USERGUIDE.vn.md');
      expect(en).toContain('one of 26 techniques');
      expect(vi).toContain('một trong 26 kỹ thuật');
      expect(SG.techniques.list().length).toBe(26);
      expect(en).toContain('the last 100 puzzles');
      expect(en).toContain('the last 100 imported puzzles');
      expect(vi).toContain('100 đề gần nhất');
      expect(vi).toContain('100 đề đã nhập gần nhất');
      expect(read('js/ui/app.js')).toContain('MAX_FILE_BYTES = 8 * 1024 * 1024');
    });

    it('lists the storage keys of the code once per language, and the address format of the link', function () {
      ready();
      var en = playerPart('../USERGUIDE.md');
      var vi = playerPart('../USERGUIDE.vn.md');
      // The keys are listed in one place per language, user and developer guide together.
      var enAll = en + playerPart('../DEVELOPERGUIDE.md');
      var viAll = vi + playerPart('../DEVELOPERGUIDE.vn.md');
      var K = SG.progress.KEYS;
      [SG.store.KEY, K.progress, K.puzzles, K.last].forEach(function (key) {
        expect(enAll.split(key).length - 1).toBe(1);
        expect(viAll.split(key).length - 1).toBe(1);
      });
      expect(en).toContain('#puzzle=<token>');
      expect(vi).toContain('#puzzle=<mã>');
      var dev = playerPart('../DEVELOPERGUIDE.md');
      expect(dev).toContain('sg-generator-url');
      expect(dev).toContain('../generator/index.html');
    });

    it('says how to run, test and deploy it, and every file it links to exists', function () {
      ready();
      var env = needNode();
      var dev = playerPart('../DEVELOPERGUIDE.md');
      ['node tests/node-runner.js', 'file://', 'python -m http.server', 'GitHub Pages', 'GitHub Actions']
        .forEach(function (part) { expect(dev).toContain(part); });
      // The guides sit at the root of the repository, one level above this app.
      GUIDES.forEach(function (rel) {
        (read(rel).replace(/```[\s\S]*?```/g, '').match(/\]\([^)#\s]+(?:#[^)\s]*)?\)/g) || []).forEach(function (link) {
          var target = /\(([^)#\s]+)/.exec(link)[1];
          if (/^https?:/.test(target)) return;
          expect(env.fs.existsSync(env.path.join(env.root, '..', target)) ? '' : rel + ': ' + target).toBe('');
        });
      });
    });

    it('describes the guide: a page in a new tab, with an example for every technique', function () {
      ready();
      var en = playerPart('../USERGUIDE.md');
      expect(en).toContain('help.html');
      expect(en).toContain('example');
    });

    it('promises no feature the player does not have: no export, no print, no generation', function () {
      ready();
      // The Import takes the text of the generator's Export box; the player has no export of its own.
      GUIDES.forEach(function (rel) {
        var text = playerPart(rel).toLowerCase().replace(/\*\*export\*\* box/g, '').replace(/\*\*xuất\*\*/g, '');
        expect(/\bexport\b|\bprint\b|generate a puzzle here|in-browser generation/.test(text)).toBe(false);
      });
    });
  });
})();
