// The variant registry (SG.variants) and the classic variants (tasks T-1.1 and T-1.2). The model itself, and the
// classic boards that the variants build, are tested by core/tests/suites/model.test.js.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;

  function build(id) {
    return SG.variants.get(id).build({}, null);
  }

  function expectCode(fn, code) {
    var thrown = null;
    try { fn(); } catch (e) { thrown = e; }
    expect(thrown).toBeTruthy();
    expect(thrown instanceof SG.errors.GenerationError).toBe(true);
    expect(thrown.code).toBe(code);
  }
  describe('variants: registry', function () {
    function fakeDef(overrides) {
      return Object.assign({
        id: 'fake-variant',
        i18nKey: 'variant.fake',
        group: 'test',
        digits: 4,
        difficultySupport: ['veryEasy'],
        defaultSymbolMode: 'digits',
        symbolModes: ['digits'],
        options: [],
        build: function () { return build('classic4'); }
      }, overrides);
    }

    afterEach(function () {
      SG.variants.unregister('fake-variant');
      SG.variants.unregister('fake-variant-2');
    });

    it('lists exactly the three classic variants, in order', function () {
      var classic = SG.variants.list().filter(function (d) { return d.group === 'classic'; });
      expect(classic.map(function (d) { return d.id; })).toEqual(['classic4', 'classic6', 'classic9']);
      expect(SG.variants.list().length).toBeGreaterThan(2);
    });

    it('get returns the definition, has reports presence, unknown ids throw variant.unknown', function () {
      expect(SG.variants.get('classic9').digits).toBe(9);
      expect(SG.variants.has('classic9')).toBe(true);
      expect(SG.variants.has('nope')).toBe(false);
      expectCode(function () { SG.variants.get('nope'); }, 'variant.unknown');
    });

    it('registering a duplicate id throws variant.duplicate and keeps the first definition', function () {
      var before = SG.variants.get('classic9');
      expectCode(function () { SG.variants.register(fakeDef({ id: 'classic9' })); }, 'variant.duplicate');
      expect(SG.variants.get('classic9')).toBe(before);
      SG.variants.register(fakeDef());
      expectCode(function () { SG.variants.register(fakeDef()); }, 'variant.duplicate');
    });

    it('list returns a fresh array each time and shows registered variants in order', function () {
      var count = SG.variants.list().length;
      SG.variants.register(fakeDef());
      SG.variants.register(fakeDef({ id: 'fake-variant-2' }));
      var list = SG.variants.list();
      expect(list).toHaveLength(count + 2);
      expect(list[list.length - 2].id).toBe('fake-variant');
      list.pop();
      expect(SG.variants.list()).toHaveLength(count + 2);
      expect(SG.variants.unregister('fake-variant')).toBe(true);
      expect(SG.variants.unregister('fake-variant')).toBe(false);
    });

    it('rejects a definition with a missing or malformed required field (variant.invalidDef)', function () {
      var broken = [
        { id: undefined }, { id: '' }, { i18nKey: undefined }, { group: undefined }, { digits: undefined },
        { digits: 0 }, { digits: 17 }, { digits: 4.5 }, { difficultySupport: undefined },
        { difficultySupport: [] }, { difficultySupport: ['impossible'] }, { defaultSymbolMode: undefined },
        { symbolModes: undefined }, { symbolModes: ['letters'] }, { options: undefined }, { options: 'x' },
        { build: undefined }, { build: 'not a function' }, { fastSeed: 5 }, { postGenerate: 'x' },
        { digStrategy: 3 }
      ];
      broken.forEach(function (change) {
        expectCode(function () { SG.variants.register(fakeDef(change)); }, 'variant.invalidDef');
      });
      expectCode(function () { SG.variants.register(null); }, 'variant.invalidDef');
      expect(SG.variants.has('fake-variant')).toBe(false);
    });

    it('accepts the optional hooks when they are functions', function () {
      SG.variants.register(fakeDef({
        fastSeed: function () { return true; },
        postGenerate: function () {},
        digStrategy: 'signs'
      }));
      expect(SG.variants.get('fake-variant').digStrategy).toBe('signs');
    });
  });

  describe('variants: classic4, classic6, classic9', function () {
    it('all build a model that passes validate (V1-V8)', function () {
      ['classic4', 'classic6', 'classic9'].forEach(function (id) {
        var model = build(id);
        expect(model.variantId).toBe(id);
        expect(SG.model.validate(model).ok).toBe(true);
      });
    });

    it('have the expected sizes and the declared digit count', function () {
      var expected = { classic4: [4, 16, 12], classic6: [6, 36, 18], classic9: [9, 81, 27] };
      Object.keys(expected).forEach(function (id) {
        var model = build(id);
        expect(model.digits).toBe(expected[id][0]);
        expect(SG.variants.get(id).digits).toBe(expected[id][0]);
        expect(model.cellCount).toBe(expected[id][1]);
        expect(model.units).toHaveLength(expected[id][2]);
      });
    });

    it('classic4 has 2x2 boxes', function () {
      var model = build('classic4');
      expect(Array.from(model.layout.cellRegion)).toEqual([0, 0, 1, 1, 0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 3, 3]);
    });

    it('classic6 has boxes of 2 rows x 3 columns, not 3 rows x 2 columns', function () {
      var model = build('classic6');
      var region = model.layout.cellRegion;
      function at(r, c) { return region[r * 6 + c]; }
      expect(at(0, 0)).toBe(at(0, 2));
      expect(at(0, 0)).toBe(at(1, 2));
      expect(at(0, 0)).not.toBe(at(2, 0));
      expect(at(0, 0)).not.toBe(at(0, 3));
      expect(at(2, 0)).toBe(2);
      expect(at(0, 3)).toBe(1);
      var boxes = model.units.filter(function (u, i) { return model.unitMeta[i].kind === 'box'; });
      expect(boxes).toHaveLength(6);
      expect(Array.from(boxes[0])).toEqual([0, 1, 2, 6, 7, 8]);
      expect(Array.from(boxes[1])).toEqual([3, 4, 5, 9, 10, 11]);
      // Every box spans exactly 2 distinct rows and 3 distinct columns.
      boxes.forEach(function (box) {
        var rows = new Set(Array.from(box).map(function (c) { return Math.floor(c / 6); }));
        var cols = new Set(Array.from(box).map(function (c) { return c % 6; }));
        expect(rows.size).toBe(2);
        expect(cols.size).toBe(3);
      });
    });

    it('classic9 has 3x3 boxes numbered row by row', function () {
      var model = build('classic9');
      expect(model.layout.cellRegion[0]).toBe(0);
      expect(model.layout.cellRegion[3]).toBe(1);
      expect(model.layout.cellRegion[27]).toBe(3);
      expect(model.layout.cellRegion[80]).toBe(8);
    });

    it('build returns an independent model on every call', function () {
      var def = SG.variants.get('classic9');
      expect(def.build({}, null)).not.toBe(def.build({}, null));
    });

    it('declare the difficulty levels they support and a symbol mode', function () {
      expect(SG.variants.get('classic4').difficultySupport).toEqual(['veryEasy']);
      expect(SG.variants.get('classic6').difficultySupport).toEqual(['veryEasy', 'hard']);
      expect(SG.variants.get('classic9').difficultySupport)
        .toEqual(['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1']);
      ['classic4', 'classic6', 'classic9'].forEach(function (id) {
        var def = SG.variants.get(id);
        expect(def.defaultSymbolMode).toBe('digits');
        expect(def.i18nKey).toBe('variant.' + id);
        expect(def.options).toEqual([]);
      });
    });

    it('only classic9 registers the fastSeed hook', function () {
      expect(typeof SG.variants.get('classic9').fastSeed).toBe('function');
      expect(SG.variants.get('classic4').fastSeed).toBeUndefined();
      expect(SG.variants.get('classic6').fastSeed).toBeUndefined();
    });
  });
})();
