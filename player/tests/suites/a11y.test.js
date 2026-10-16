// Accessibility: the pure parts of SG.a11y, checked on Node with the real fixture models: the accessible
// name of a cell in both languages (values, grids, cage sums, signs), the keyboard navigation over the
// geometry of every board shape (holes of multi-grid canvases are skipped) and the Settings choices. The DOM
// part (roles, observers, dialog) is verified in the browser run (docs/qa.md).
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var A = SG.a11y;
  var NODE = SG.test.node;

  function ready() {
    if (!A || !SG.i18n || !SG.boardView || !SG.testkit) SG.test.skip('SG.a11y is not loaded here');
  }

  function inLocale(code, fn) {
    SG.i18n.setLocale(code);
    try {
      return fn();
    } finally {
      SG.i18n.setLocale('en');
    }
  }

  function emptyModel(variantId) {
    return SG.testkit.model(variantId);
  }

  function geometryOf(variantId) {
    return SG.boardView.geometry(emptyModel(variantId));
  }

  function info(geo, i, extra) {
    return Object.assign(A.cellPosition(geo, i), extra);
  }

  // ---------------------------------------------------------------------------------------------
  // Labels
  // ---------------------------------------------------------------------------------------------

  describe('a11y: where a cell is', function () {
    it('names the row and column (1-based) of a single board', function () {
      ready();
      var geo = geometryOf('classic9');
      expect(A.cellPosition(geo, 0)).toEqual({ grid: 0, row: 1, col: 1, shared: [] });
      expect(A.cellPosition(geo, 3 * 9 + 6)).toEqual({ grid: 0, row: 4, col: 7, shared: [] });
      expect(A.cellPosition(geo, 80)).toEqual({ grid: 0, row: 9, col: 9, shared: [] });
    });

    it('agrees with SG.model.cellLabel (G2-R4C7) on every cell of samurai, and lists the shared grids', function () {
      ready();
      var model = emptyModel('samurai');
      var geo = SG.boardView.geometry(model);
      var sharedCells = 0;
      for (var i = 0; i < model.cellCount; i++) {
        var p = A.cellPosition(geo, i);
        expect(SG.model.cellLabel(model, i)).toBe('G' + p.grid + '-R' + p.row + 'C' + p.col);
        if (p.shared.length > 0) sharedCells++;
        p.shared.forEach(function (g) { expect(g).not.toBe(p.grid); });
      }
      // The overlap of the centre grid with the four corner grids: 4 boxes of 9 cells.
      expect(sharedCells).toBe(36);
    });
  });

  describe('a11y: the accessible name of a cell', function () {
    it('reads like the design example in English and in Vietnamese', function () {
      ready();
      var geo = geometryOf('classic9');
      var base = info(geo, 3 * 9 + 6, { state: 'value', value: '5' });
      expect(inLocale('en', function () { return A.cellLabel(base); })).toBe('Row 4, column 7, value 5');
      expect(inLocale('vi', function () { return A.cellLabel(base); })).toBe('Hàng 4, cột 7, giá trị 5');
    });

    it('says empty, given and solution cells apart', function () {
      ready();
      var geo = geometryOf('classic9');
      var states = {
        empty: info(geo, 0, { state: 'empty', value: '' }),
        given: info(geo, 0, { state: 'given', value: '7' }),
        solution: info(geo, 0, { state: 'solution', value: '7' })
      };
      expect(inLocale('en', function () { return A.cellLabel(states.empty); })).toBe('Row 1, column 1, empty');
      expect(inLocale('vi', function () { return A.cellLabel(states.empty); })).toBe('Hàng 1, cột 1, trống');
      expect(inLocale('en', function () { return A.cellLabel(states.given); })).toBe('Row 1, column 1, value 7, given');
      expect(inLocale('en', function () { return A.cellLabel(states.solution); })).toBe('Row 1, column 1, solution 7');
      expect(inLocale('vi', function () { return A.cellLabel(states.given); })).toContain('số đã cho');
    });

    it('names the grid of a multi-grid cell and the grids it shares', function () {
      ready();
      var model = emptyModel('samurai');
      var geo = SG.boardView.geometry(model);
      var plain = A.cellPosition(geo, 0);
      expect(plain.grid).toBe(1);
      expect(inLocale('en', function () { return A.cellLabel(Object.assign({}, plain, { state: 'empty', value: '' })); }))
        .toBe('Grid 1, row 1, column 1, empty');
      var shared = -1;
      for (var i = 0; i < model.cellCount && shared < 0; i++) if (A.cellPosition(geo, i).shared.length > 0) shared = i;
      var label = inLocale('en', function () {
        return A.cellLabel(Object.assign(A.cellPosition(geo, shared), { state: 'value', value: '4' }));
      });
      expect(label).toMatch(/^Grid 1, row \d, column \d, value 4, also in grid 5$/);
      expect(inLocale('vi', function () {
        return A.cellLabel(Object.assign(A.cellPosition(geo, shared), { state: 'value', value: '4' }));
      })).toMatch(/^Lưới 1, hàng \d, cột \d, giá trị 4, cũng thuộc lưới 5$/);
    });

    it('adds the cage sum of a Killer cell', function () {
      ready();
      // Built by hand: a Killer model would register the cage extension of the solver for the whole run.
      var base = geometryOf('classic9');
      var cages = [];
      for (var r = 0; r < 9; r++) cages.push({ cells: [r * 9, r * 9 + 1, r * 9 + 2], sum: 10 + r });
      var geo = Object.assign({}, base, { cages: cages });
      var extras = A.cellExtras(geo);
      cages.forEach(function (cage) {
        cage.cells.forEach(function (cell) { expect(extras.cage.get(cell)).toBe(cage.sum); });
      });
      expect(extras.cage.has(3)).toBe(false);
      var label = inLocale('en', function () {
        return A.cellLabel(info(geo, 10, { state: 'empty', value: '', cageSum: extras.cage.get(10) }));
      });
      expect(label).toBe('Row 2, column 2, empty, cage sum 11');
      expect(inLocale('vi', function () {
        return A.cellLabel(info(geo, 10, { state: 'given', value: '4', cageSum: 11 }));
      })).toBe('Hàng 2, cột 2, giá trị 4, số đã cho, tổng nhóm ô 11');
    });

    it('tells the signs of a Greater-Than cell: smaller or greater than which neighbour', function () {
      ready();
      var base = geometryOf('classic9');
      // value[a] < value[b]: cell 0 < cell 1 (right), cell 10 < cell 1 (above), cell 40 < cell 31 (above).
      var signs = [{ a: 0, b: 1 }, { a: 10, b: 1 }, { a: 40, b: 31 }, { a: 5, b: 50 }];
      var geo = Object.assign({}, base, { signs: signs });
      var extras = A.cellExtras(geo);
      expect(extras.relations.get(0)).toEqual([{ rel: 'less', dir: 'right' }]);
      expect(extras.relations.get(1)).toEqual([{ rel: 'greater', dir: 'left' }, { rel: 'greater', dir: 'down' }]);
      expect(extras.relations.get(10)).toEqual([{ rel: 'less', dir: 'up' }]);
      expect(extras.relations.get(40)).toEqual([{ rel: 'less', dir: 'up' }]);
      expect(extras.relations.get(31)).toEqual([{ rel: 'greater', dir: 'down' }]);
      // Two cells that are not neighbours have no direction to name: nothing is said.
      expect(extras.relations.has(5)).toBe(false);
      expect(extras.relations.has(50)).toBe(false);
      var label = inLocale('en', function () {
        return A.cellLabel(info(geo, 1, { state: 'empty', value: '', relations: extras.relations.get(1) }));
      });
      expect(label).toBe('Row 1, column 2, empty, greater than the cell to the left, ' +
        'greater than the cell below');
      expect(inLocale('vi', function () {
        return A.cellLabel(info(geo, 0, { state: 'empty', value: '', relations: extras.relations.get(0) }));
      })).toBe('Hàng 1, cột 1, trống, nhỏ hơn ô bên phải');
    });
  });

  describe('a11y: what a cell shows, read back from the board', function () {
    it('takes digits and letters as they are and sorts given, placed and solution values', function () {
      ready();
      expect(A.valueInfo({ text: '', kind: 'placed', colorIndex: null, shape: null })).toEqual({ state: 'empty', value: '' });
      expect(A.valueInfo({ text: '5', kind: 'placed', colorIndex: null, shape: null })).toEqual({ state: 'value', value: '5' });
      expect(A.valueInfo({ text: 'E', kind: 'given', colorIndex: null, shape: null })).toEqual({ state: 'given', value: 'E' });
      expect(A.valueInfo({ text: '9', kind: 'solution', colorIndex: null, shape: null }))
        .toEqual({ state: 'solution', value: '9' });
    });

    it('names the colour and the shape of colour mode, and the shape alone in shapes mode', function () {
      ready();
      var coloured = inLocale('en', function () {
        return A.valueInfo({ text: '', kind: 'placed', colorIndex: 2, shape: 'triangle' }).value;
      });
      expect(coloured).toBe(SG.symbols.glyph('colors', 3, null, { colorAuxSymbol: true }).label);
      expect(coloured).toContain('triangle');
      var colourOnly = A.valueInfo({ text: '', kind: 'placed', colorIndex: 2, shape: null }).value;
      expect(colourOnly).toBe(SG.symbols.glyph('colors', 3, null, { colorAuxSymbol: false }).label);
      expect(colourOnly).not.toContain('triangle');
      var star = A.valueInfo({ text: '', kind: 'given', colorIndex: null, shape: 'star' });
      expect(star.state).toBe('given');
      expect(star.value).toBe(SG.i18n.t('symbols.shape.star'));
      inLocale('vi', function () {
        expect(A.valueInfo({ text: '', kind: 'placed', colorIndex: null, shape: 'star' }).value).toBe('ngôi sao');
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------------------------

  describe('a11y: keyboard navigation over the geometry', function () {
    it('moves by one cell with the arrow keys and stays at the edge (no wrap)', function () {
      ready();
      var geo = geometryOf('classic9');
      var mid = 4 * 9 + 4;
      expect(A.moveTarget(geo, mid, 'ArrowRight')).toBe(mid + 1);
      expect(A.moveTarget(geo, mid, 'ArrowLeft')).toBe(mid - 1);
      expect(A.moveTarget(geo, mid, 'ArrowDown')).toBe(mid + 9);
      expect(A.moveTarget(geo, mid, 'ArrowUp')).toBe(mid - 9);
      expect(A.moveTarget(geo, 0, 'ArrowLeft')).toBe(0);
      expect(A.moveTarget(geo, 0, 'ArrowUp')).toBe(0);
      expect(A.moveTarget(geo, 80, 'ArrowRight')).toBe(80);
      expect(A.moveTarget(geo, 8, 'ArrowRight')).toBe(8);
      expect(A.moveTarget(geo, 9, 'ArrowLeft')).toBe(9);
    });

    it('Home and End go to the ends of the row, Ctrl+Home and Ctrl+End to the ends of the board', function () {
      ready();
      var geo = geometryOf('classic9');
      var mid = 4 * 9 + 4;
      expect(A.moveTarget(geo, mid, 'Home')).toBe(36);
      expect(A.moveTarget(geo, mid, 'End')).toBe(44);
      expect(A.moveTarget(geo, mid, 'Home', true)).toBe(0);
      expect(A.moveTarget(geo, mid, 'End', true)).toBe(80);
    });

    it('Page Up and Page Down move by a box height and stop at the last row', function () {
      ready();
      var geo = geometryOf('classic9');
      expect(A.pageStep(geo)).toBe(3);
      expect(A.moveTarget(geo, 4, 'PageDown')).toBe(4 + 27);
      expect(A.moveTarget(geo, 4 + 27, 'PageDown')).toBe(4 + 54);
      expect(A.moveTarget(geo, 4 + 54, 'PageDown')).toBe(4 + 72);
      expect(A.moveTarget(geo, 4 + 72, 'PageUp')).toBe(4 + 45);
      expect(A.moveTarget(geo, 4, 'PageUp')).toBe(4);
    });

    it('a step of Page Up / Page Down is the box size of each board', function () {
      ready();
      expect(A.pageStep(geometryOf('classic4'))).toBe(2);
      expect(A.pageStep(geometryOf('classic6'))).toBe(2);
      expect(A.pageStep(geometryOf('mega16'))).toBe(4);
      expect(A.pageStep(geometryOf('samurai'))).toBe(3);
    });

    it('ignores keys that are not navigation keys', function () {
      ready();
      var geo = geometryOf('classic9');
      expect(A.moveTarget(geo, 10, 'a')).toBe(10);
      expect(A.moveTarget(geo, 10, 'Tab')).toBe(10);
      expect(A.NAV_KEYS).toContain('PageDown');
    });

    ['samurai', 'sohei', 'flower', 'butterfly'].forEach(function (variantId) {
      it(variantId + ': an arrow key always lands on the nearest real cell in that direction (holes are skipped)',
        function () {
          ready();
          var geo = geometryOf(variantId);
          var dirs = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] };
          var skipped = 0;
          for (var i = 0; i < geo.cellCount; i++) {
            Object.keys(dirs).forEach(function (key) {
              var d = dirs[key];
              var r = geo.cellRow[i] + d[0];
              var c = geo.cellCol[i] + d[1];
              var expected = i;
              var jumped = false;
              while (r >= 0 && c >= 0 && r < geo.rows && c < geo.cols) {
                if (geo.at[r * geo.cols + c] >= 0) {
                  expected = geo.at[r * geo.cols + c];
                  break;
                }
                jumped = true;
                r += d[0];
                c += d[1];
              }
              if (expected !== i && jumped) skipped++;
              expect(A.moveTarget(geo, i, key)).toBe(expected);
            });
          }
          // Samurai and Sohei have gaps between their grids: some moves must cross a hole.
          if (variantId === 'samurai' || variantId === 'sohei') expect(skipped).toBeGreaterThan(0);
        });
    });

    it('every key gives a real cell of the board, on every cell of samurai', function () {
      ready();
      var geo = geometryOf('samurai');
      for (var i = 0; i < geo.cellCount; i++) {
        A.NAV_KEYS.forEach(function (key) {
          [false, true].forEach(function (ctrl) {
            var to = A.moveTarget(geo, i, key, ctrl);
            expect(to >= 0 && to < geo.cellCount).toBe(true);
          });
        });
      }
    });

    it('Ctrl+Home and Ctrl+End reach the first and the last cell of a canvas with holes', function () {
      ready();
      var geo = geometryOf('flower');
      var first = A.moveTarget(geo, 100, 'Home', true);
      var last = A.moveTarget(geo, 100, 'End', true);
      for (var i = 0; i < geo.cellCount; i++) {
        var order = geo.cellRow[i] * geo.cols + geo.cellCol[i];
        expect(order >= geo.cellRow[first] * geo.cols + geo.cellCol[first]).toBe(true);
        expect(order <= geo.cellRow[last] * geo.cols + geo.cellCol[last]).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Settings choices and strings
  // ---------------------------------------------------------------------------------------------

  describe('a11y: the Settings dialog data', function () {
    it('offers exactly the values of the store for language, theme, text size and check mode', function () {
      ready();
      if (!SG.store) SG.test.skip('SG.store is not loaded here');
      var values = function (list) { return list.map(function (c) { return c.value; }); };
      expect(values(A.LANG_CHOICES)).toEqual(Array.from(SG.store.LANGS));
      expect(values(A.THEME_CHOICES)).toEqual(Array.from(SG.store.THEMES));
      expect(values(A.FONT_CHOICES)).toEqual(Array.from(SG.store.FONT_SIZES));
      expect(values(A.CHECK_CHOICES)).toEqual(Array.from(SG.store.CHECK_MODES));
    });

    it('every choice has a translated label in both languages', function () {
      ready();
      if (!SG.play) SG.test.skip('the check mode labels belong to play.js, which is not loaded here');
      [A.LANG_CHOICES, A.THEME_CHOICES, A.FONT_CHOICES, A.CHECK_CHOICES].forEach(function (list) {
        list.forEach(function (choice) {
          expect(typeof SG.locales.en[choice.key]).toBe('string');
          expect(typeof SG.locales.vi[choice.key]).toBe('string');
        });
      });
    });

    it('uses only keys of the store (no new storage key): the module never touches localStorage itself', function () {
      ready();
      if (!NODE || !NODE.fs) SG.test.skip('needs the Node file system');
      var text = NODE.fs.readFileSync(NODE.path.join(NODE.root, 'js/ui/a11y.js'), 'utf8');
      expect(/localStorage|sessionStorage|document\.cookie/.test(text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ''))).toBe(false);
    });

    it('every a11y key used by the code exists in English and Vietnamese with the same placeholders', function () {
      ready();
      if (!NODE || !NODE.fs) SG.test.skip('needs the Node file system');
      var text = NODE.fs.readFileSync(NODE.path.join(NODE.root, 'js/ui/a11y.js'), 'utf8');
      var used = {};
      (text.match(/'(a11y\.[A-Za-z.]+)'/g) || []).forEach(function (s) { used[s.slice(1, -1)] = true; });
      // Keys built at run time: 'a11y.cell.' + state / relation and 'a11y.dir.' + direction.
      ['value', 'given', 'solution', 'less', 'greater'].forEach(function (s) { used['a11y.cell.' + s] = true; });
      ['up', 'down', 'left', 'right'].forEach(function (s) { used['a11y.dir.' + s] = true; });
      var keys = Object.keys(used).filter(function (k) { return !/\.$/.test(k); });
      expect(keys.length).toBeGreaterThan(30);
      keys.forEach(function (key) {
        var en = SG.locales.en[key];
        var vi = SG.locales.vi[key];
        expect(typeof en).toBe('string');
        expect(typeof vi).toBe('string');
        expect(en.length).toBeGreaterThan(0);
        expect(vi.length).toBeGreaterThan(0);
        var holes = function (s) { return (s.match(/\{\w+\}/g) || []).sort().join(','); };
        expect(holes(vi)).toBe(holes(en));
      });
      // And nothing is left over: every a11y.* key of the pack is used.
      Object.keys(SG.locales.en).filter(function (k) { return /^a11y\./.test(k); }).forEach(function (key) {
        expect(used[key] === true).toBe(true);
      });
    });
  });

  describe('a11y: without a DOM', function () {
    it('init does nothing and reports that it is not running', function () {
      ready();
      expect(A.init({})).toBe(false);
      expect(A.init(null)).toBe(false);
      expect(A.getGrid()).toBeNull();
      expect(A.openSettings()).toBeNull();
      expect(function () { A.destroy(); }).not.toThrow();
    });
  });
})();
