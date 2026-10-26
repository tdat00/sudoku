// Generation control panel (design.md 10.4): SG.controls. Most of the logic is the pure form model
// `SG.controls.describe`, tested directly; `mount` is exercised on a small fake DOM. `SG.i18n` is switched in
// some tests, so they put English back.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var C = SG.controls;
  var S = SG.store;
  var I = SG.i18n;

  function ready() {
    if (!C || !S || !I || !SG.locales || !SG.locales.en) {
      SG.test.skip('SG.controls / SG.store are not loaded');
    }
    I.mergeFragments();
  }

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function packHas(pack, key) {
    return hasOwn(pack, key) || hasOwn(pack, key + '_other') || hasOwn(pack, key + '_one');
  }

  function withEnglish(fn) {
    var result;
    try {
      result = fn();
    } catch (err) {
      I.setLocale('en');
      throw err;
    }
    if (result && typeof result.then === 'function') {
      return result.then(function (value) { I.setLocale('en'); return value; }, function (err) {
        I.setLocale('en');
        throw err;
      });
    }
    I.setLocale('en');
    return result;
  }

  function model(search, ctx) {
    return C.describe(S.parseUrl(search), ctx);
  }

  function field(m, id) {
    return m.fields.filter(function (f) { return f.id === id; })[0];
  }

  function values(f) {
    return f.choices.map(function (c) { return c.value; });
  }

  function variantIds() {
    return SG.variants.list().map(function (def) { return def.id; });
  }

  function memoryStore(options) {
    var data = {};
    return S.create(Object.assign({
      storage: {
        getItem: function (k) { return hasOwn(data, k) ? data[k] : null; },
        setItem: function (k, v) { data[k] = String(v); },
        removeItem: function (k) { delete data[k]; }
      },
      location: null, history: null, navigator: { languages: [] }
    }, options));
  }

  describe('controls: the form model', function () {
    it('lists the basic, option and advanced fields in order for classic9', function () {
      ready();
      var m = model('');
      expect(m.variantId).toBe('classic9');
      expect(m.fields.map(function (f) { return f.id; })).toEqual(['variant', 'difficulty', 'symbolMode',
        'seed', 'symmetry', 'digOrder', 'maxAttempts', 'showSolution']);
      expect(m.fields.map(function (f) { return f.section; })).toEqual(['basic', 'basic', 'basic', 'basic',
        'advanced', 'advanced', 'advanced', 'advanced']);
      expect(m.notes).toEqual([]);
      expect(m.warnings).toEqual([]);
    });

    it('offers only the difficulty levels of the variant', function () {
      ready();
      expect(values(field(model('?v=classic4'), 'difficulty'))).toEqual(['veryEasy']);
      expect(values(field(model('?v=classic6'), 'difficulty'))).toEqual(['veryEasy', 'hard']);
      expect(values(field(model('?v=classic9'), 'difficulty'))).toEqual(SG.difficulty.LEVELS.slice(0, 8));
      expect(values(field(model('?v=killer'), 'difficulty'))).toEqual(SG.difficulty.LEVELS);
      expect(values(field(model('?v=samurai'), 'difficulty'))).toEqual(SG.difficulty.LEVELS);
      variantIds().forEach(function (id) {
        var f = field(model('?v=' + id), 'difficulty');
        expect(values(f).indexOf(f.value)).not.toBe(-1);
        expect(values(f)).toEqual(SG.difficulty.LEVELS.filter(function (level) {
          return SG.variants.get(id).difficultySupport.indexOf(level) !== -1;
        }));
      });
    });

    it('moves a selection the variant cannot offer to a level it can', function () {
      ready();
      var f = field(model('?v=classic6&d=nightmare'), 'difficulty');
      expect(f.value).toBe('hard');
      expect(f.hintKey).toBe('difficulty.hard.desc');
      var g = field(model('?v=classic6&d=easy'), 'difficulty');
      expect(g.value).toBe('veryEasy');
    });

    it('filters the symbol sets by the variant', function () {
      ready();
      expect(values(field(model('?v=classic9'), 'symbolMode')))
        .toEqual(['digits', 'letters', 'colors', 'shapes']);
      expect(values(field(model('?v=wordoku'), 'symbolMode'))).toEqual(['word', 'digits']);
      var mega = field(model('?v=mega16'), 'symbolMode');
      expect(values(mega)).toEqual(['digits']);
      expect(mega.disabled).toBe(true);
      expect(mega.visible).toBe(false);
      expect(field(model('?v=classic9'), 'symbolMode').disabled).toBe(false);
      expect(field(model('?v=classic9'), 'symbolMode').visible).toBe(true);
      expect(field(model('?v=wordoku'), 'symbolMode').value).toBe('word');
      expect(field(model('?v=classic9&mode=colors'), 'symbolMode').value).toBe('colors');
    });

    it('shows the cage size only for killer', function () {
      ready();
      var killer = field(model('?v=killer'), 'opt.cageSize');
      expect(killer.type).toBe('slider');
      expect(killer.section).toBe('options');
      expect(killer.visible).toBe(true);
      expect([killer.min, killer.max, killer.step, killer.value, killer.defaultValue])
        .toEqual([-2, 2, 1, 0, 0]);
      expect(killer.defaultLabelKey).toBe('variant.killer.cageSize.auto');
      expect(field(model('?v=classic9'), 'opt.cageSize')).toBeUndefined();
      var store = memoryStore();
      store.set({ variantId: 'killer' });
      expect(field(C.describe(store.get()), 'opt.cageSize')).toBeDefined();
      store.set({ variantId: 'classic9' });
      expect(field(C.describe(store.get()), 'opt.cageSize')).toBeUndefined();
    });

    it('shows the compactness only for jigsaw9 and the other options where they belong', function () {
      ready();
      var jigsaw = field(model('?v=jigsaw9'), 'opt.compactness');
      expect([jigsaw.type, jigsaw.min, jigsaw.max, jigsaw.value]).toEqual(['slider', 0, 1, 0.6]);
      variantIds().forEach(function (id) {
        var m = model('?v=' + id);
        expect(field(m, 'opt.compactness') !== undefined).toBe(id === 'jigsaw9');
        expect(field(m, 'opt.cageSize') !== undefined).toBe(id === 'killer');
        expect(field(m, 'opt.futoshiki') !== undefined).toBe(id === 'greaterThan');
      });
      expect(field(model('?v=greaterThan'), 'opt.futoshiki').type).toBe('boolean');
      expect(field(model('?v=mega12'), 'opt.symbolSet').type).toBe('select');
      expect(values(field(model('?v=mega12'), 'opt.symbolSet'))).toEqual(['letters', 'numbers']);
    });

    it('puts advanced variant options into the advanced section', function () {
      ready();
      var hyper = field(model('?v=diagonalX'), 'opt.withHyper');
      expect(hyper.section).toBe('advanced');
      expect(hyper.type).toBe('boolean');
      var ids = model('?v=wordoku').fields.map(function (f) { return f.id + '/' + f.section; });
      expect(ids.indexOf('opt.placement/options')).not.toBe(-1);
      expect(ids.indexOf('opt.language/options')).not.toBe(-1);
      expect(ids.indexOf('opt.word/advanced')).not.toBe(-1);
      expect(ids.indexOf('opt.line/advanced')).not.toBe(-1);
      expect(ids.indexOf('showSolution/advanced')).toBeLessThan(ids.indexOf('opt.line/advanced'));
    });

    it('evaluates the visibleWhen of the wordoku line option', function () {
      ready();
      expect(field(model('?v=wordoku'), 'opt.line').visible).toBe(false);
      expect(field(model('?v=wordoku&o.placement=row'), 'opt.line').visible).toBe(true);
      expect(field(model('?v=wordoku&o.placement=column&o.line=3'), 'opt.line').value).toBe(3);
      expect(field(model('?v=wordoku&o.placement=diagonal&o.line=3'), 'opt.line').visible).toBe(false);
      expect(field(model('?v=wordoku&o.placement=diagonal&o.line=3'), 'opt.line').value).toBe(0);
      expect(field(model('?v=wordoku'), 'opt.word').visible).toBe(true);
      expect(field(model('?v=wordoku'), 'opt.word').maxLength).toBe(24);
      expect(field(model('?v=wordoku'), 'opt.word').type).toBe('text');
    });

    it('groups the variants by family, every variant exactly once, with a description', function () {
      ready();
      var f = field(model(''), 'variant');
      var seen = [];
      f.groups.forEach(function (g) {
        expect(g.labelKey).toBe('group.' + g.id);
        g.choices.forEach(function (c) {
          expect(SG.variants.get(c.value).group).toBe(g.id);
          seen.push(c.value);
        });
      });
      expect(seen.slice().sort()).toEqual(variantIds().sort());
      expect(f.choices.length).toBe(seen.length);
      expect(f.groups.length).toBeGreaterThan(3);
      expect(field(model('?v=killer'), 'variant').hintKey).toBe('variant.killer.desc');
      expect(field(model('?v=killer'), 'variant').value).toBe('killer');
    });

    it('has the advanced fields with their limits', function () {
      ready();
      var m = model('?attempts=5&sol=1&order=spiral');
      var attempts = field(m, 'maxAttempts');
      expect([attempts.type, attempts.min, attempts.max, attempts.value]).toEqual(['number', 1, 20, 5]);
      expect(values(field(m, 'digOrder'))).toEqual(SG.digger.ORDERS);
      expect(field(m, 'digOrder').value).toBe('spiral');
      expect(field(m, 'showSolution').type).toBe('boolean');
      expect(field(m, 'showSolution').value).toBe(true);
    });

    it('describes the seed field and explains a text seed', function () {
      ready();
      var blank = field(model(''), 'seed');
      expect(blank.seed.kind).toBe('random');
      expect(blank.info).toEqual([]);
      expect(field(model('?seed=42'), 'seed').info).toEqual([]);
      var text = field(model('?seed=hello'), 'seed');
      expect(text.seed.kind).toBe('text');
      expect(text.info[0].messageKey).toBe('controls.seed.hashed');
      expect(text.info[0].args.seed).toBe(String(S.seedInfo('hello').value));
      expect(text.maxLength).toBe(S.SEED_MAX_LENGTH);
    });

    it('survives a junk state', function () {
      ready();
      var m = C.describe({ variantId: 'nope', difficulty: 7, variantOptions: [] });
      expect(m.variantId).toBe('classic9');
      expect(field(m, 'difficulty').value).toBe('normal');
      expect(function () { C.describe(null); }).not.toThrow();
    });

    it('produces a complete, consistent model for every variant', function () {
      ready();
      variantIds().forEach(function (id) {
        var m = model('?v=' + id);
        var ids = m.fields.map(function (f) { return f.id; });
        expect(ids.filter(function (x, i) { return ids.indexOf(x) !== i; })).toEqual([]);
        m.fields.forEach(function (f) {
          expect(typeof f.labelKey).toBe('string');
          expect(['select', 'slider', 'number', 'boolean', 'text', 'seed'].indexOf(f.type)).not.toBe(-1);
          expect(['basic', 'options', 'advanced'].indexOf(f.section)).not.toBe(-1);
          if (f.type === 'select') {
            expect(f.choices.length).toBeGreaterThan(0);
            expect(values(f).indexOf(f.value)).not.toBe(-1);
          }
          if (f.type === 'slider') expect(f.value >= f.min && f.value <= f.max).toBe(true);
          if (f.optionId !== null) expect(f.id).toBe('opt.' + f.optionId);
        });
        expect(m.fields.filter(function (f) { return f.optionId !== null; }).length)
          .toBe(SG.variants.optionsOf(id).length);
      });
    });

    it('only uses i18n keys that exist in both language packs', function () {
      ready();
      var queries = variantIds().map(function (id) { return '?v=' + id; })
        .concat(['?v=wordoku&o.placement=row', '?sym=rotational90&d=master&seed=abc',
          '?v=classic9&sym=mirrorBoth&d=nightmare']);
      var adjustments = [{ key: 'difficulty', from: 'nightmare', to: 'easy' },
        { key: 'symbolMode', from: 'letters', to: 'word' }];
      var missing = [];
      queries.forEach(function (search) {
        var m = model(search, { adjustments: adjustments });
        var keys = [];
        function add(key) { if (typeof key === 'string') keys.push(key); }
        function addMessage(msg) {
          add(msg.messageKey);
          Object.keys(msg.argKeys || {}).forEach(function (name) { add(msg.argKeys[name]); });
        }
        m.fields.forEach(function (f) {
          add(f.labelKey);
          add(f.hintKey);
          add(f.minLabelKey);
          add(f.maxLabelKey);
          add(f.defaultLabelKey);
          add(f.placeholderKey);
          f.choices.forEach(function (c) { if (c.labelKey) add(c.labelKey); });
          (f.groups || []).forEach(function (g) { add(g.labelKey); });
          f.warnings.forEach(addMessage);
          (f.info || []).forEach(addMessage);
        });
        m.notes.forEach(addMessage);
        keys.forEach(function (key) {
          ['en', 'vi'].forEach(function (code) {
            if (!packHas(SG.locales[code], key)) missing.push(code + ':' + key + ' (' + search + ')');
          });
        });
      });
      expect(missing).toEqual([]);
    });
  });

  describe('controls: symmetry', function () {
    it('warns about a four-way symmetry together with a high difficulty', function () {
      ready();
      var w = C.strictSymmetryWarning('rotational90', 'master');
      expect(w.id).toBe('strictSymmetry');
      expect(w.messageKey).toBe('controls.warn.strictSymmetry');
      expect(w.argKeys).toEqual({ symmetry: 'symmetry.rotational90', difficulty: 'difficulty.master',
        alternative: 'symmetry.rotational180' });
      expect(C.strictSymmetryWarning('mirrorBoth', 'nightmare')).not.toBeNull();
      expect(C.strictSymmetryWarning('rotational90', 'hard')).toBeNull();
      expect(C.strictSymmetryWarning('rotational90', 'veryEasy')).toBeNull();
    });

    it('never warns for the gentle symmetries', function () {
      ready();
      ['none', 'rotational180', 'mirrorH', 'mirrorV', 'diagonal', 'antiDiagonal'].forEach(function (kind) {
        SG.difficulty.LEVELS.forEach(function (level) {
          expect(C.strictSymmetryWarning(kind, level)).toBeNull();
        });
      });
    });

    it('keeps the rule in data that names real symmetries and levels', function () {
      ready();
      Object.keys(C.STRICT_SYMMETRY).forEach(function (kind) {
        expect(SG.symmetry.KINDS.indexOf(kind)).not.toBe(-1);
        expect(SG.difficulty.LEVELS.indexOf(C.STRICT_SYMMETRY[kind])).not.toBe(-1);
      });
    });

    it('puts the warning on the symmetry field and in the model warnings', function () {
      ready();
      var hot = model('?sym=rotational90&d=master');
      expect(field(hot, 'symmetry').warnings.length).toBe(1);
      expect(hot.warnings.length).toBe(1);
      expect(model('?sym=rotational90&d=normal').warnings).toEqual([]);
      expect(model('?sym=rotational180&d=nightmare').warnings).toEqual([]);
    });

    it('writes the warning in both languages with the translated names', function () {
      ready();
      withEnglish(function () {
        var warning = model('?sym=mirrorBoth&d=nightmare').warnings[0];
        var en = C.messageText(warning);
        expect(en).toMatch(/Mirror both ways/);
        expect(en).toMatch(/Nightmare/);
        expect(en).toMatch(/Rotational 180/);
        expect(en).not.toMatch(/[{}]/);
        I.setLocale('vi');
        var vi = C.messageText(warning);
        expect(vi).toMatch(/Ác mộng/);
        expect(vi).not.toMatch(/[{}]/);
        expect(vi).not.toBe(en);
      });
    });

    it('draws a preview of every symmetry kind', function () {
      ready();
      var expectedCells = { none: 1, rotational180: 2, rotational90: 4, mirrorH: 2, mirrorV: 2, mirrorBoth: 4,
        diagonal: 2, antiDiagonal: 2 };
      SG.symmetry.KINDS.forEach(function (kind) {
        var p = C.symmetryPreview(kind);
        expect(p.kind).toBe(kind);
        expect(p.size).toBe(9);
        expect(p.marked.length).toBe(expectedCells[kind]);
        p.marked.forEach(function (cell) {
          expect(cell.row >= 0 && cell.row < 9 && cell.col >= 0 && cell.col < 9).toBe(true);
        });
        expect(field(model('?sym=' + kind), 'symmetry').preview.kind).toBe(kind);
      });
      expect(C.symmetryPreview('mirrorH').axes.length).toBe(1);
      expect(C.symmetryPreview('mirrorBoth').axes.length).toBe(2);
      expect(C.symmetryPreview('rotational180').centre).toBe(true);
      expect(C.symmetryPreview('none').axes).toEqual([]);
    });
  });

  describe('controls: notes about automatic changes', function () {
    it('turns the corrections of the store into notes', function () {
      ready();
      withEnglish(function () {
        var store = memoryStore();
        var heard = null;
        store.subscribe(function (state, keys, meta) { heard = meta.adjustments; });
        store.set({ difficulty: 'nightmare' });
        store.set({ variantId: 'classic6' });
        var m = C.describe(store.get(), { adjustments: heard });
        expect(m.notes.length).toBe(1);
        expect(m.notes[0].id).toBe('difficultyChanged');
        var text = C.messageText(m.notes[0]);
        expect(text).toMatch(/Classic Sudoku 6/);
        expect(text).toMatch(/Nightmare/);
        expect(text).toMatch(/Hard/);
        expect(text).not.toMatch(/[{}]/);
      });
    });

    it('also explains a symbol set that had to change, and ignores unknown keys', function () {
      ready();
      withEnglish(function () {
        var m = C.describe(S.parseUrl('?v=wordoku'), { adjustments: [
          { key: 'symbolMode', from: 'letters', to: 'word' }, { key: 'trace', from: 'x', to: 'y' }, null] });
        expect(m.notes.length).toBe(1);
        expect(m.notes[0].id).toBe('symbolModeChanged');
        expect(C.messageText(m.notes[0])).toMatch(/Letters/);
      });
    });
  });

  // A small fake DOM for mount()

  function createFakeDom() {
    var doc = { activeElement: null, executed: [], execResult: true };

    function El(tag) {
      this.tagName = String(tag).toUpperCase();
      this.children = [];
      this.attrs = {};
      this.listeners = {};
      this.parentNode = null;
      this.ownerDocument = doc;
      this.own = '';
      this.value = '';
      this.checked = false;
      this.disabled = false;
      this.hidden = false;
      this.open = false;
    }
    Object.defineProperty(El.prototype, 'id', { get: function () { return this.attrs.id || ''; } });
    Object.defineProperty(El.prototype, 'className', {
      get: function () { return this.attrs['class'] || ''; },
      set: function (v) { this.attrs['class'] = v; }
    });
    Object.defineProperty(El.prototype, 'firstChild', {
      get: function () { return this.children[0] || null; }
    });
    Object.defineProperty(El.prototype, 'textContent', {
      get: function () {
        return this.own + this.children.map(function (c) { return c.textContent; }).join('');
      },
      set: function (v) {
        this.children.forEach(function (c) { c.parentNode = null; });
        this.children = [];
        this.own = String(v);
      }
    });
    El.prototype.setAttribute = function (name, value) { this.attrs[name] = String(value); };
    El.prototype.getAttribute = function (name) {
      return hasOwn(this.attrs, name) ? this.attrs[name] : null;
    };
    El.prototype.removeAttribute = function (name) { delete this.attrs[name]; };
    El.prototype.appendChild = function (child) {
      if (child.parentNode) child.parentNode.removeChild(child);
      child.parentNode = this;
      this.children.push(child);
      return child;
    };
    El.prototype.removeChild = function (child) {
      this.children = this.children.filter(function (c) { return c !== child; });
      child.parentNode = null;
      return child;
    };
    El.prototype.addEventListener = function (type, fn) {
      (this.listeners[type] = this.listeners[type] || []).push(fn);
    };
    El.prototype.removeEventListener = function (type, fn) {
      this.listeners[type] = (this.listeners[type] || []).filter(function (f) { return f !== fn; });
    };
    El.prototype.fire = function (type, extra) {
      var event = Object.assign({ type: type, target: this, defaultPrevented: false,
        preventDefault: function () { this.defaultPrevented = true; } }, extra);
      (this.listeners[type] || []).slice().forEach(function (fn) { fn(event); });
      return event;
    };
    El.prototype.focus = function () { doc.activeElement = this; };
    El.prototype.select = function () {};

    doc.createElement = function (tag) { return new El(tag); };
    doc.createElementNS = function (ns, tag) { return new El(tag); };
    doc.body = new El('body');
    doc.documentElement = doc.body;
    doc.getElementById = function (id) { return doc.find(doc.body, function (el) { return el.id === id; }); };
    doc.execCommand = function (cmd) { doc.executed.push(cmd); return doc.execResult; };
    doc.find = function (start, pred) {
      if (pred(start)) return start;
      for (var i = 0; i < start.children.length; i++) {
        var hit = doc.find(start.children[i], pred);
        if (hit) return hit;
      }
      return null;
    };
    doc.findAll = function (start, pred, out) {
      out = out || [];
      if (pred(start)) out.push(start);
      start.children.forEach(function (c) { doc.findAll(c, pred, out); });
      return out;
    };
    doc.El = El;
    return doc;
  }

  function mountFixture(storeOptions, mountOptions) {
    var doc = createFakeDom();
    var form = doc.createElement('form');
    form.setAttribute('id', 'controls-form');
    doc.body.appendChild(form);
    var toast = doc.createElement('div');
    toast.setAttribute('id', 'toast-root');
    doc.body.appendChild(toast);
    var store = memoryStore(storeOptions);
    var notes = [];
    var view = C.mount(form, store, Object.assign({
      notify: function (key, args, kind) { notes.push([key, args, kind]); }
    }, mountOptions));
    return {
      doc: doc, form: form, store: store, view: view, notes: notes,
      byId: function (id) { return doc.getElementById(id); },
      texts: function (el) { return el.children.map(function (c) { return c.textContent; }); }
    };
  }

  function pick(select, value) {
    select.value = value;
    select.fire('change');
  }

  function action(fx, name) {
    return fx.doc.find(fx.form, function (el) { return el.getAttribute('data-action') === name; });
  }

  function tick() {
    return new Promise(function (resolve) { setTimeout(resolve, 0); });
  }

  /** Runs `fn` (which may return a promise) with `navigator` replaced; the original comes back afterwards. */
  function withNavigator(value, fn) {
    var descriptor = Object.getOwnPropertyDescriptor(root, 'navigator');
    function restore() {
      if (descriptor) Object.defineProperty(root, 'navigator', descriptor);
      else delete root.navigator;
    }
    Object.defineProperty(root, 'navigator', { configurable: true, value: value });
    var result;
    try {
      result = fn();
    } catch (err) {
      restore();
      throw err;
    }
    return Promise.resolve(result).then(function (v) { restore(); return v; }, function (err) {
      restore();
      throw err;
    });
  }

  describe('controls: mount (fake DOM)', function () {
    it('builds the whole form from the schema with a label for every control', function () {
      ready();
      withEnglish(function () {
        var fx = mountFixture();
        ['ctl-variant', 'ctl-difficulty', 'ctl-symbolMode', 'ctl-symmetry', 'ctl-seed', 'ctl-digOrder',
          'ctl-maxAttempts', 'ctl-showSolution'].forEach(function (id) {
          expect(fx.byId(id)).not.toBeNull();
        });
        expect(fx.byId('ctl-trace')).toBeNull();
        var labels = fx.doc.findAll(fx.form, function (el) { return el.tagName === 'LABEL'; });
        expect(labels.length).toBeGreaterThan(7);
        labels.forEach(function (label) {
          expect(fx.byId(label.getAttribute('for'))).not.toBeNull();
          expect(label.textContent).not.toBe('');
        });
        expect(fx.byId('ctl-variant').children.length).toBeGreaterThan(3);
        expect(fx.byId('ctl-variant').children[0].tagName).toBe('OPTGROUP');
        expect(fx.byId('ctl-variant').children[0].getAttribute('label')).toBe('Classic');
        expect(fx.byId('ctl-difficulty').children.length)
          .toBe(SG.variants.get('classic9').difficultySupport.length);
        expect(fx.byId('ctl-difficulty').children[0].textContent).toBe('Very easy');
        expect(fx.byId('ctl-advanced').tagName).toBe('DETAILS');
        expect(fx.byId('ctl-variant-hint').textContent).toMatch(/9×9/);
      });
    });

    it('shows the description of a field in a help tooltip next to its label, not under the control',
      function () {
        ready();
        withEnglish(function () {
          var fx = mountFixture();
          var hints = fx.doc.findAll(fx.form, function (el) {
            return /(^| )field__hint( |$)/.test(el.className) && el.id !== 'ctl-seed-info';
          });
          expect(hints).toEqual([]);
          ['variant', 'difficulty', 'symbolMode', 'seed', 'symmetry', 'digOrder', 'maxAttempts',
            'showSolution'].forEach(function (name) {
            var pop = fx.byId('ctl-' + name + '-hint');
            expect(pop.getAttribute('role')).toBe('tooltip');
            expect(pop.textContent).not.toBe('');
            var tip = pop.parentNode;
            expect(tip.className).toBe('help-tip');
            expect(tip.hidden).toBe(false);
            expect(tip.parentNode.className).toMatch(/field__head/);
            expect(tip.children[0].getAttribute('aria-label')).toMatch(/^About /);
            expect(fx.byId('ctl-' + name).getAttribute('aria-describedby'))
              .toMatch(new RegExp('ctl-' + name + '-hint'));
          });
          var symmetry = fx.byId('ctl-symmetry-hint');
          expect(symmetry.children.length).toBe(2);
          expect(symmetry.children[1].children[1].tagName).toBe('STRONG');
          expect(symmetry.children[1].children[1].textContent).toBe('stricter symmetry');
        });
      });

    it('opens the tooltip on click, closes it on Escape and on a second click', function () {
      ready();
      var fx = mountFixture();
      var tip = fx.byId('ctl-seed-hint').parentNode;
      var button = tip.children[0];
      expect(tip.getAttribute('data-open')).toBeNull();
      button.fire('click');
      expect(tip.getAttribute('data-open')).not.toBeNull();
      var esc = tip.fire('keydown', { key: 'Escape', stopPropagation: function () { this.stopped = true; } });
      expect(tip.getAttribute('data-open')).toBeNull();
      expect(tip.getAttribute('data-dismissed')).not.toBeNull();
      expect(esc.stopped).toBe(true);
      tip.fire('mouseenter');
      expect(tip.getAttribute('data-dismissed')).toBeNull();
      button.fire('click');
      button.fire('click');
      expect(tip.getAttribute('data-open')).toBeNull();
    });

    it('keeps symmetry inside the advanced options', function () {
      ready();
      var fx = mountFixture();
      var advanced = fx.byId('ctl-advanced');
      var inside = fx.doc.find(advanced, function (el) { return el === fx.byId('ctl-symmetry'); });
      expect(inside).not.toBeNull();
      var wrapper = fx.byId('ctl-symmetry').parentNode;
      expect(wrapper.getAttribute('data-field') || wrapper.parentNode.getAttribute('data-field'))
        .toBe('symmetry');
    });

    it('describes every control with existing elements', function () {
      ready();
      var fx = mountFixture();
      var described = fx.doc.findAll(fx.form, function (el) { return el.getAttribute('aria-describedby'); });
      expect(described.length).toBeGreaterThan(5);
      described.forEach(function (el) {
        el.getAttribute('aria-describedby').split(' ').forEach(function (id) {
          expect(fx.byId(id)).not.toBeNull();
        });
      });
    });

    it('writes a change of a control to the store, without generating anything', function () {
      ready();
      var fx = mountFixture();
      pick(fx.byId('ctl-difficulty'), 'hard');
      expect(fx.store.get().difficulty).toBe('hard');
      pick(fx.byId('ctl-symmetry'), 'mirrorV');
      expect(fx.store.get().symmetry).toBe('mirrorV');
      pick(fx.byId('ctl-digOrder'), 'snake');
      expect(fx.store.get().digOrder).toBe('snake');
      var sol = fx.byId('ctl-showSolution');
      sol.checked = true;
      sol.fire('change');
      expect(fx.store.get().showSolution).toBe(true);
      var seed = fx.byId('ctl-seed');
      seed.value = 'my seed';
      seed.fire('input');
      expect(fx.store.get().seed).toBe('my seed');
      expect(fx.byId('ctl-seed-info').hidden).toBe(false);
      expect(fx.byId('ctl-seed-info').textContent).toMatch(String(S.seedInfo('my seed').value));
      seed.value = '42';
      seed.fire('input');
      expect(fx.byId('ctl-seed-info').hidden).toBe(true);
    });

    it('commits the maximum attempts clamped and restores a cleared field on change', function () {
      ready();
      var fx = mountFixture();
      var input = fx.byId('ctl-maxAttempts');
      expect(input.value).toBe('8');
      input.value = '99';
      input.fire('input');
      expect(fx.store.get().maxAttempts).toBe(20);
      expect(input.value).toBe('20');
      input.value = '';
      input.fire('input');
      expect(fx.store.get().maxAttempts).toBe(20);
      expect(input.value).toBe('');
      input.fire('change');
      expect(input.value).toBe('8');
      expect(fx.store.get().maxAttempts).toBe(8);
    });

    it('re-filters difficulty and symbol sets when the variant changes and says so politely', function () {
      ready();
      withEnglish(function () {
        var fx = mountFixture();
        pick(fx.byId('ctl-difficulty'), 'nightmare');
        pick(fx.byId('ctl-variant'), 'classic6');
        expect(fx.store.get().difficulty).toBe('hard');
        expect(fx.texts(fx.byId('ctl-difficulty'))).toEqual(['Very easy', 'Hard']);
        expect(fx.byId('ctl-difficulty').value).toBe('hard');
        var notes = fx.byId('ctl-notes');
        expect(notes.hidden).toBe(false);
        expect(notes.textContent).toMatch(/does not offer “Nightmare”/);
        expect(fx.byId('ctl-variant').getAttribute('aria-describedby')).toMatch(/ctl-notes/);
        pick(fx.byId('ctl-variant'), 'wordoku');
        expect(fx.texts(fx.byId('ctl-symbolMode'))).toEqual(['Word letters', 'Digits']);
        expect(fx.byId('ctl-symbolMode').value).toBe('word');
        expect(fx.byId('ctl-notes').hidden).toBe(true);
        pick(fx.byId('ctl-difficulty'), 'hard');
        expect(fx.byId('ctl-notes').hidden).toBe(true);
      });
    });

    it('shows the cage size for killer only and the wordoku line only for rows and columns', function () {
      ready();
      var fx = mountFixture();
      expect(fx.byId('ctl-opt-cageSize')).toBeNull();
      pick(fx.byId('ctl-variant'), 'killer');
      var slider = fx.byId('ctl-opt-cageSize');
      expect(slider).not.toBeNull();
      expect(slider.getAttribute('min')).toBe('-2');
      expect(fx.byId('ctl-opt-cageSize-value').textContent).toBe(I.t('variant.killer.cageSize.auto'));
      slider.value = '1';
      slider.fire('input');
      expect(fx.store.get().variantOptions.cageSize).toBe(1);
      expect(fx.byId('ctl-opt-cageSize-value').textContent).toBe('1');
      pick(fx.byId('ctl-variant'), 'classic9');
      expect(fx.byId('ctl-opt-cageSize')).toBeNull();

      pick(fx.byId('ctl-variant'), 'wordoku');
      var lineField = function () {
        return fx.doc.find(fx.form, function (el) { return el.getAttribute('data-field') === 'opt.line'; });
      };
      expect(lineField().hidden).toBe(true);
      pick(fx.byId('ctl-opt-placement'), 'row');
      expect(lineField().hidden).toBe(false);
      pick(fx.byId('ctl-opt-placement'), 'diagonal');
      expect(lineField().hidden).toBe(true);
      var word = fx.byId('ctl-opt-word');
      word.value = 'plane ';
      word.fire('input');
      expect(fx.store.get().variantOptions.word).toBe('plane');
      expect(word.value).toBe('plane ');
      word.fire('change');
      expect(word.value).toBe('plane');
      expect(word.getAttribute('maxlength')).toBe('24');
    });

    it('shows the strict symmetry warning next to the symmetry and removes it again', function () {
      ready();
      withEnglish(function () {
        var fx = mountFixture();
        pick(fx.byId('ctl-difficulty'), 'master');
        expect(fx.byId('ctl-symmetry-warn').hidden).toBe(true);
        pick(fx.byId('ctl-symmetry'), 'rotational90');
        var warn = fx.byId('ctl-symmetry-warn');
        expect(warn.hidden).toBe(false);
        expect(warn.textContent).toMatch(/Rotational 90°/);
        expect(fx.byId('ctl-symmetry').getAttribute('aria-describedby')).toMatch(/ctl-symmetry-warn/);
        pick(fx.byId('ctl-symmetry'), 'rotational180');
        expect(fx.byId('ctl-symmetry-warn').hidden).toBe(true);
      });
    });

    it('draws the symmetry preview', function () {
      ready();
      var fx = mountFixture();
      var svg = fx.doc.find(fx.form, function (el) { return el.getAttribute('role') === 'img'; });
      expect(svg.getAttribute('data-kind')).toBe('rotational180');
      expect(svg.getAttribute('aria-label')).toMatch(/Rotational 180/);
      var before = svg.children.length;
      pick(fx.byId('ctl-symmetry'), 'mirrorBoth');
      expect(svg.getAttribute('data-kind')).toBe('mirrorBoth');
      expect(svg.children.length).toBeGreaterThan(before - 1);
    });

    it('copies the seed with the fallback and says when there is nothing to copy', function () {
      ready();
      var fx = mountFixture();
      var copy = action(fx, 'copy-seed');
      copy.fire('click');
      expect(fx.notes[0][0]).toBe('controls.seed.nothingToCopy');
      fx.store.set({ seed: '123' });
      copy.fire('click');
      return tick().then(function () {
        expect(fx.doc.executed).toEqual(['copy']);
        expect(fx.notes[1][0]).toBe('controls.seed.copied');
        fx.doc.execResult = false;
        copy.fire('click');
        return tick();
      }).then(function () {
        expect(fx.notes[2][0]).toBe('controls.seed.copyFailed');
        expect(fx.notes[2][2]).toBe('danger');
      });
    });

    it('copies through navigator.clipboard when there is one', function () {
      ready();
      var written = [];
      var clipboard = { writeText: function (text) { written.push(text); return Promise.resolve(); } };
      var doc = createFakeDom();
      return withNavigator({ clipboard: clipboard }, function () {
        return C.copyText('seed-9', doc).then(function (ok) {
          expect(ok).toBe(true);
          expect(written).toEqual(['seed-9']);
          expect(doc.executed).toEqual([]);
        });
      });
    });

    it('falls back to the textarea when the clipboard refuses', function () {
      ready();
      var refusing = { writeText: function () { return Promise.reject(new Error('denied')); } };
      var doc = createFakeDom();
      return withNavigator({ clipboard: refusing }, function () {
        return C.copyText('s', doc).then(function (ok) {
          expect(ok).toBe(true);
          expect(doc.executed).toEqual(['copy']);
          expect(doc.body.children.length).toBe(0);
        });
      });
    });

    it('shows a toast in #toast-root when no notify callback is given', function () {
      ready();
      var fx = mountFixture(undefined, { notify: null });
      expect(action(fx, 'new-seed')).toBeNull();
      action(fx, 'copy-seed').fire('click');
      var toast = fx.byId('toast-root').children[0];
      expect(toast.className).toBe('toast toast--warning');
      expect(toast.textContent).toBe('There is no seed to copy yet. Type a seed or generate a puzzle first.');
      fx.view.destroy();
      expect(fx.byId('toast-root').children.length).toBe(0);
    });

    it('relabels itself when the language changes and keeps its state and focus', function () {
      ready();
      withEnglish(function () {
        var fx = mountFixture();
        pick(fx.byId('ctl-variant'), 'killer');
        pick(fx.byId('ctl-difficulty'), 'master');
        fx.byId('ctl-advanced').open = true;
        fx.byId('ctl-seed').value = '77';
        fx.byId('ctl-seed').fire('input');
        fx.byId('ctl-seed').focus();
        I.setLocale('vi');
        var label = fx.doc.find(fx.form, function (el) { return el.getAttribute('for') === 'ctl-variant'; });
        expect(label.textContent).toBe('Biến thể');
        expect(fx.byId('ctl-difficulty').children[0].textContent).toBe('Rất dễ');
        expect(fx.byId('ctl-difficulty').value).toBe('master');
        expect(fx.byId('ctl-variant').value).toBe('killer');
        expect(fx.byId('ctl-seed').value).toBe('77');
        expect(fx.byId('ctl-advanced').open).toBe(true);
        expect(fx.doc.activeElement).toBe(fx.byId('ctl-seed'));
        expect(fx.byId('ctl-opt-cageSize-value').textContent).toBe(I.t('variant.killer.cageSize.auto'));
        expect(I.current).toBe('vi');
        I.setLocale('en');
        expect(fx.byId('ctl-variant').children[0].getAttribute('label')).toBe('Classic');
      });
    });

    it('follows changes made to the store from outside', function () {
      ready();
      var fx = mountFixture();
      fx.store.set({ variantId: 'jigsaw9', difficulty: 'master', seed: '9',
        variantOptions: { compactness: 0.9 } });
      expect(fx.byId('ctl-variant').value).toBe('jigsaw9');
      expect(fx.byId('ctl-difficulty').value).toBe('master');
      expect(fx.byId('ctl-seed').value).toBe('9');
      expect(fx.byId('ctl-opt-compactness').value).toBe('0.9');
      fx.store.reset();
      expect(fx.byId('ctl-variant').value).toBe('classic9');
      expect(fx.byId('ctl-opt-compactness')).toBeNull();
    });

    it('never submits the form, offers Enter in the seed field to the app and focuses first', function () {
      ready();
      var submitted = 0;
      var fx = mountFixture(null, { onSubmit: function () { submitted++; } });
      expect(fx.form.fire('submit').defaultPrevented).toBe(true);
      var enter = fx.byId('ctl-seed').fire('keydown', { key: 'Enter' });
      expect(enter.defaultPrevented).toBe(true);
      expect(submitted).toBe(1);
      fx.byId('ctl-seed').fire('keydown', { key: 'a' });
      expect(submitted).toBe(1);
      fx.view.focusFirst();
      expect(fx.doc.activeElement).toBe(fx.byId('ctl-variant'));
    });

    it('stops listening and clears the form when destroyed', function () {
      ready();
      var fx = mountFixture();
      fx.view.destroy();
      expect(fx.form.children.length).toBe(0);
      expect(function () {
        fx.store.set({ difficulty: 'hard' });
        I.setLocale('vi');
        I.setLocale('en');
      }).not.toThrow();
      expect(fx.form.children.length).toBe(0);
      expect(function () { fx.view.destroy(); fx.view.refresh(); }).not.toThrow();
    });

    it('refuses to mount without a root or a store', function () {
      ready();
      expect(function () { C.mount(null, memoryStore()); }).toThrow();
      expect(function () { C.mount(createFakeDom().createElement('form'), null); }).toThrow();
    });
  });
})();
