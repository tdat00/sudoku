// Symbols: how a value 1..D is shown per symbol mode, the legend and the shape paths. Pure, runs on Node.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var S = SG.symbols;

  function ready() {
    if (!S || !SG.testkit) SG.test.skip('SG.symbols is not loaded here');
  }

  function inLocale(code, fn) {
    SG.i18n.setLocale(code);
    try {
      return fn();
    } finally {
      SG.i18n.setLocale('en');
    }
  }

  describe('symbols: modes offered by a board', function () {
    it('classic and every 9-symbol variant offer digits, letters, colours and shapes', function () {
      ready();
      ['classic4', 'classic6', 'classic9', 'diagonalX', 'hyper', 'jigsaw9', 'killer', 'greaterThan', 'samurai',
        'sohei', 'butterfly', 'flower'].forEach(function (id) {
        expect(S.modesFor(SG.testkit.model(id))).toEqual(['digits', 'letters', 'colors', 'shapes']);
      });
    });

    it('mega boards keep hexadecimal digits only; wordoku offers the word and the digits', function () {
      ready();
      expect(S.modesFor(SG.testkit.model('mega12'))).toEqual(['digits']);
      expect(S.modesFor(SG.testkit.model('mega16'))).toEqual(['digits']);
      expect(S.modesFor(SG.testkit.model('wordoku'))).toEqual(['digits', 'word']);
    });

    it('anything unknown falls back to digits', function () {
      ready();
      expect(S.modesFor(null)).toEqual(['digits']);
    });
  });

  describe('symbols: glyphs', function () {
    it('digits follow the labels of the model (hex on mega16, plain on classic)', function () {
      ready();
      var mega = SG.testkit.model('mega16');
      expect(S.glyph('digits', 1, mega).text).toBe(mega.symbols.labels[0]);
      expect(S.glyph('digits', 16, mega).text).toBe(mega.symbols.labels[15]);
      expect(S.glyph('digits', 7, SG.testkit.model('classic9')).text).toBe('7');
    });

    it('letters and the word mode', function () {
      ready();
      expect(S.glyph('letters', 3, SG.testkit.model('classic9')).text).toBe('C');
      var word = SG.testkit.model('wordoku');
      expect(S.glyph('word', 2, word).text).toBe(word.symbols.labels[1]);
      // In digits mode a wordoku board shows the plain value, not a letter.
      expect(S.glyph('digits', 2, word).text).toBe('2');
    });

    it('colour mode carries a shape as well, unless the auxiliary symbol is switched off', function () {
      ready();
      var g = S.glyph('colors', 5, null);
      expect(g.colorIndex).toBe(4);
      expect(g.shape).toBe(S.DEFAULT_AUX_SHAPES[4]);
      expect(g.text).toBeNull();
      var plain = S.glyph('colors', 5, null, { colorAuxSymbol: false });
      expect(plain.shape).toBeNull();
      expect(plain.colorIndex).toBe(4);
    });

    it('shapes mode uses the shape of the value and no colour', function () {
      ready();
      var g = S.glyph('shapes', 2, null);
      expect(g.shape).toBe(S.DEFAULT_AUX_SHAPES[1]);
      expect(g.colorIndex).toBeNull();
    });

    it('an empty cell has no text, shape or colour and the translated "empty" label', function () {
      ready();
      var g = S.glyph('digits', 0, null);
      expect([g.text, g.shape, g.colorIndex]).toEqual([null, null, null]);
      expect(g.label.length).toBeGreaterThan(0);
      expect(inLocale('vi', function () { return S.glyph('digits', 0, null).label; })).not.toBe(g.label);
      expect(S.glyph('digits', 3, null, { label: false }).label).toBe('');
    });

    it('the labels are translated: a colour and its shape in both languages', function () {
      ready();
      var en = S.glyph('colors', 1, null).label;
      var vi = inLocale('vi', function () { return S.glyph('colors', 1, null).label; });
      expect(en).not.toBe(vi);
      expect(en).toContain(S.glyph('shapes', 1, null).label);
    });
  });

  describe('symbols: legend and shapes', function () {
    it('the legend lists every value of the board once', function () {
      ready();
      [['classic9', 'digits', 9], ['mega12', 'digits', 12], ['classic6', 'colors', 6], ['wordoku', 'word', 9]]
        .forEach(function (c) {
          var items = S.legend(c[1], SG.testkit.model(c[0]));
          expect(items.length).toBe(c[2]);
          expect(items.map(function (item) { return item.value; })).toEqual(
            items.map(function (item, i) { return i + 1; }));
        });
    });

    it('the 16 shapes are distinct closed paths', function () {
      ready();
      var seen = {};
      S.DEFAULT_AUX_SHAPES.forEach(function (id) {
        var d = S.shapePath(id, 0, 0);
        expect(/^M[-0-9.,a-zA-Z ]+$/.test(d)).toBe(true);
        expect(d.charAt(d.length - 1)).toBe('Z');
        expect(seen[d]).toBeUndefined();
        seen[d] = true;
      });
      expect(Object.keys(seen).length).toBe(16);
    });

    it('legend markup escapes its texts and keeps an accessible name on every item', function () {
      ready();
      var html = S.legendMarkup('colors', SG.testkit.model('classic9'));
      expect((html.match(/<li /g) || []).length).toBe(9);
      expect(html).toContain('role="list"');
      expect(/<script|onerror=/i.test(html)).toBe(false);
      expect((html.match(/title="[^"]+"/g) || []).length).toBe(9);
    });
  });
})();
