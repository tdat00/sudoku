// The variant registry (SG.variants) and the classic variants. The model itself, and the classic boards that
// the variants build (SG.classicModel), are tested by core/tests/suites/model.test.js.
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
    it('build the classic board of their declared digit count, which validates (V1-V8)', function () {
      var expected = { classic4: [4, 16, 12], classic6: [6, 36, 18], classic9: [9, 81, 27] };
      Object.keys(expected).forEach(function (id) {
        var model = build(id);
        expect(model.variantId).toBe(id);
        expect(SG.model.validate(model).ok).toBe(true);
        expect(model.digits).toBe(expected[id][0]);
        expect(SG.variants.get(id).digits).toBe(expected[id][0]);
        expect(model.cellCount).toBe(expected[id][1]);
        expect(model.units).toHaveLength(expected[id][2]);
      });
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
