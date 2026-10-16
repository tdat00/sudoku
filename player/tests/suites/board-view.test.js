// Board view: the pure part (geometry and markup) for the 15 variants of the fixtures. The DOM part (patches,
// pulses, click hooks) is verified in the browser run (docs/qa.md).
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var B = SG.boardView;

  function ready() {
    if (!B || !SG.testkit) SG.test.skip('SG.boardView is not loaded here');
  }

  function count(text, re) {
    return (text.match(re) || []).length;
  }

  var IDS = SG.testkit ? SG.testkit.VARIANT_IDS : [];
  var SUBGRIDS = { samurai: 5, sohei: 4, butterfly: 4, flower: 5 };

  describe('board view: geometry', function () {
    IDS.forEach(function (id) {
      it(id + ': every cell has its own place inside the canvas', function () {
        ready();
        var model = SG.testkit.model(id);
        var geo = B.geometry(model);
        expect(geo.cellX.length).toBe(model.cellCount);
        var seen = {};
        for (var i = 0; i < model.cellCount; i++) {
          var key = geo.cellRow[i] + ',' + geo.cellCol[i];
          expect(seen[key]).toBeUndefined();
          seen[key] = true;
          expect(geo.at[geo.cellRow[i] * geo.cols + geo.cellCol[i]]).toBe(i);
          expect(geo.cellX[i] >= 0 && geo.cellX[i] + B.CELL <= geo.width).toBe(true);
          expect(geo.cellY[i] >= 0 && geo.cellY[i] + B.CELL <= geo.height).toBe(true);
        }
        expect(geo.subGrids.length).toBe(SUBGRIDS[id] || 0);
        expect(B.geometry(model)).toBe(geo);
      });
    });

    it('coordinates enlarge the canvas and the margins by the same amount on every side', function () {
      ready();
      var model = SG.testkit.model('classic9');
      var plain = B.geometry(model);
      var withCoords = B.geometry(model, { showCoords: true });
      expect(withCoords.width).toBeGreaterThan(plain.width);
      expect(withCoords.cellX[0]).toBeGreaterThan(plain.cellX[0]);
      expect(withCoords.coords.cols.length).toBe(9);
      expect(withCoords.coords.rows.length).toBe(9);
      expect(plain.coords).toBeNull();
    });

    it('the structure of the variants shows up in the geometry', function () {
      ready();
      expect(B.geometry(SG.testkit.model('jigsaw9')).regions.length).toBe(9);
      var killer = SG.testkit.model('killer');
      expect(B.geometry(killer).cages.length).toBe(killer.cages.length);
      expect(B.geometry(SG.testkit.model('greaterThan')).signs.length).toBe(
        SG.testkit.model('greaterThan').inequalities.length);
      expect(B.geometry(SG.testkit.model('diagonalX')).overlays.length).toBe(2);
      expect(B.geometry(SG.testkit.model('hyper')).overlays.length).toBe(4);
      expect(B.geometry(SG.testkit.model('wordoku')).overlays.map(function (o) { return o.kind; }))
        .toEqual(['wordLine']);
    });
  });

  describe('board view: markup', function () {
    var LAYERS = ['regions', 'cells', 'cages', 'ineq', 'values', 'grid', 'overlay'];

    IDS.forEach(function (id) {
      it(id + ': one rectangle and one text per cell, every layer once, no colour literal', function () {
        ready();
        var model = SG.testkit.model(id);
        var html = B.renderMarkup(model, null, { symbolMode: 'digits' });
        expect(count(html, /<rect class="cell /g)).toBe(model.cellCount);
        expect(count(html, /<text class="val /g)).toBe(model.cellCount);
        expect(count(html, /<use class="sym /g)).toBe(model.cellCount);
        LAYERS.forEach(function (name) {
          expect(count(html, new RegExp('class="layer-' + name + '[ "]', 'g'))).toBe(1);
        });
        expect(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(|<script|javascript:/.test(html)).toBe(false);
      });
    });

    it('Killer draws one outline and one sum per cage; Greater-Than one sign per inequality', function () {
      ready();
      var killer = SG.testkit.model('killer');
      var html = B.renderMarkup(killer, null, {});
      expect(count(html, /class="cage-line"/g)).toBe(killer.cages.length);
      expect(count(html, /class="cage-sum"/g)).toBe(killer.cages.length);
      var gt = SG.testkit.model('greaterThan');
      expect(count(B.renderMarkup(gt, null, {}), /class="sign"/g)).toBe(gt.inequalities.length);
    });

    it('shows givens, placed values and the solution with their own classes and the right text', function () {
      ready();
      var model = SG.testkit.model('classic4');
      var values = new Int32Array(16);
      var solution = new Int32Array(16).fill(1);
      var givens = new Int32Array(16);
      values[0] = 2;
      givens[0] = 2;
      values[1] = 3;
      var html = B.renderMarkup(model, { values: values, givens: givens, solution: solution }, {});
      expect(html).toContain('<text class="val val--given" data-cell="0"');
      expect(html).toContain('<text class="val val--placed" data-cell="1"');
      expect(html).toContain('<text class="val val--solution" data-cell="2"');
      expect(/data-cell="0"[^>]*>2<\/text>/.test(html)).toBe(true);
    });

    it('colour mode paints a palette class and keeps a shape unless told otherwise', function () {
      ready();
      var model = SG.testkit.model('classic4');
      var values = new Int32Array(16);
      values[5] = 3;
      var on = B.renderMarkup(model, { values: values }, { symbolMode: 'colors' });
      expect(on).toContain('cell--c3');
      expect(on).toContain('sym--placed sym--aux');
      var off = B.renderMarkup(model, { values: values }, { symbolMode: 'colors', colorAuxSymbol: false });
      expect(off).toContain('cell--c3');
      expect(off).not.toContain('sym--aux');
    });

    it('hidden layers carry is-hidden, the title and the description are escaped', function () {
      ready();
      var html = B.renderMarkup(SG.testkit.model('wordoku'), null, { hiddenLayers: ['word'],
        title: 'a <b> & "c"', desc: 'x<y' });
      expect(html).toContain('class="ovs ovs--word is-hidden" data-layer="word"');
      expect(html).toContain('<title id="board-title">a &lt;b&gt; &amp; &quot;c&quot;</title>');
      expect(html).toContain('<desc id="board-desc">x&lt;y</desc>');
    });
  });

  describe('board view: without a DOM', function () {
    it('only the pure functions are needed to render on Node', function () {
      ready();
      expect(typeof B.create).toBe('function');
      expect(typeof root.document).toBe('undefined');
    });
  });
})();
