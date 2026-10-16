// Internationalisation (task T-4.1 / T-4.9, design.md section 11): SG.i18n and the two language packs.
// Everything runs on Node without a DOM (a tiny fake DOM stands in where the DOM is the subject). The
// coverage tests are computed from the code (explain data, event vocabulary, variant registry, technique
// registry, error codes thrown in js/core and js/variants, data-i18n attributes of index.html), so a key
// that a later change needs but does not define makes a test fail here.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var I = SG.i18n;
  var NODE = SG.test.node;

  var LOCALES = ['en', 'vi'];

  function packsReady() {
    if (!I || !SG.locales || !SG.locales.en || !SG.locales.vi) {
      SG.test.skip('SG.i18n or the language packs are not loaded here');
    }
  }

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  /** Whether a pack has a text for `key`, a plural form counting as one (the same rule as SG.i18n.has). */
  function packHas(pack, key) {
    return hasOwn(pack, key) || hasOwn(pack, key + '_other') || hasOwn(pack, key + '_one');
  }

  /** Names of the {placeholders} of a text, sorted, without duplicates. */
  function placeholders(text) {
    var found = [];
    String(text).replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, function (whole, name) {
      if (found.indexOf(name) === -1) found.push(name);
      return whole;
    });
    return found.sort();
  }

  /** What is left of a text after its placeholders are taken out (a stray brace shows up here). */
  function withoutPlaceholders(text) {
    return String(text).replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, '');
  }

  /** Keys that `a` has and `b` lacks. */
  function onlyIn(a, b) {
    return Object.keys(a).filter(function (key) { return !hasOwn(b, key); }).sort();
  }

  function missingFrom(required, pack) {
    return required.filter(function (key) { return !packHas(pack, key); });
  }

  function unique(list) {
    return list.filter(function (item, i) { return list.indexOf(item) === i; });
  }

  /** Runs `fn` with the given language active and puts English back afterwards. */
  function inLocale(code, fn) {
    I.setLocale(code);
    try {
      return fn();
    } finally {
      I.setLocale('en');
    }
  }

  /** Adds temporary keys to the live packs for one test and removes them again. */
  function withKeys(en, vi, fn) {
    var added = [];
    Object.keys(en).forEach(function (key) { SG.locales.en[key] = en[key]; added.push(['en', key]); });
    Object.keys(vi).forEach(function (key) { SG.locales.vi[key] = vi[key]; added.push(['vi', key]); });
    try {
      return fn();
    } finally {
      added.forEach(function (pair) { delete SG.locales[pair[0]][pair[1]]; });
      I.setLocale('en');
    }
  }

  function readSources(dir, pattern) {
    var folder = NODE.path.join(NODE.root, dir);
    return NODE.fs.readdirSync(folder).filter(function (name) {
      return pattern.test(name);
    }).map(function (name) {
      return { name: name, text: NODE.fs.readFileSync(NODE.path.join(folder, name), 'utf8') };
    });
  }

  function allMatches(text, pattern, group) {
    var out = [];
    var re = new RegExp(pattern.source, 'g');
    var m;
    while ((m = re.exec(text)) !== null) out.push(m[group === undefined ? 1 : group]);
    return out;
  }

  // ---------------------------------------------------------------------------------------------
  // A tiny fake DOM: elements with attributes, children and textContent
  // ---------------------------------------------------------------------------------------------

  function fakeEl(attrs, children) {
    var el = {
      attrs: Object.assign({}, attrs),
      children: children || [],
      textContent: '',
      getAttribute: function (name) { return hasOwn(this.attrs, name) ? this.attrs[name] : null; },
      setAttribute: function (name, value) { this.attrs[name] = String(value); },
      querySelectorAll: function () {
        var out = [];
        (function walk(node) {
          node.children.forEach(function (child) {
            if (hasOwn(child.attrs, 'data-i18n') || hasOwn(child.attrs, 'data-i18n-attr')) out.push(child);
            walk(child);
          });
        })(this);
        return out;
      }
    };
    return el;
  }

  // ---------------------------------------------------------------------------------------------
  // The packs themselves
  // ---------------------------------------------------------------------------------------------

  describe('i18n: language packs', function () {
    it('offers English and Vietnamese and starts in English', function () {
      packsReady();
      expect(I.available).toEqual(['en', 'vi']);
      expect(I.current).toBe('en');
    });

    it('has the same key set in both languages', function () {
      packsReady();
      var en = SG.locales.en;
      var vi = SG.locales.vi;
      expect(onlyIn(en, vi)).toEqual([]);
      expect(onlyIn(vi, en)).toEqual([]);
      expect(I.keys('en')).toEqual(I.keys('vi'));
    });

    it('has no empty value', function () {
      packsReady();
      LOCALES.forEach(function (code) {
        var pack = SG.locales[code];
        var empty = Object.keys(pack).filter(function (key) {
          return typeof pack[key] !== 'string' || pack[key].trim() === '';
        });
        expect(empty).toEqual([]);
      });
    });

    it('uses the same {placeholders} in both languages for every key', function () {
      packsReady();
      var differ = Object.keys(SG.locales.en).filter(function (key) {
        return hasOwn(SG.locales.vi, key) &&
          placeholders(SG.locales.en[key]).join() !== placeholders(SG.locales.vi[key]).join();
      });
      expect(differ).toEqual([]);
    });

    it('has no stray brace: every { and } belongs to a {name} placeholder', function () {
      packsReady();
      LOCALES.forEach(function (code) {
        var pack = SG.locales[code];
        var bad = Object.keys(pack).filter(function (key) {
          return /[{}]/.test(withoutPlaceholders(pack[key]));
        });
        expect(bad).toEqual([]);
      });
    });

    it('does not leave Vietnamese texts in English (identical values only for one-word texts and code)',
      function () {
        packsReady();
        var copied = Object.keys(SG.locales.en).filter(function (key) {
          if (!hasOwn(SG.locales.vi, key) || SG.locales.en[key] !== SG.locales.vi[key]) return false;
          if (/\.code\./.test(key) || /\.lang\./.test(key)) return false;
          return withoutPlaceholders(SG.locales.en[key]).trim().split(/\s+/).length > 1;
        });
        expect(copied).toEqual([]);
      });

    it('writes plural forms in pairs: _one always comes with _other, in both languages', function () {
      packsReady();
      LOCALES.forEach(function (code) {
        var pack = SG.locales[code];
        var lonely = Object.keys(pack).filter(function (key) {
          return /_one$/.test(key) && !hasOwn(pack, key.replace(/_one$/, '_other'));
        });
        expect(lonely).toEqual([]);
      });
    });

    it('writes natural Vietnamese: every sentence of five words or more carries diacritics', function () {
      packsReady();
      var plain = Object.keys(SG.locales.vi).filter(function (key) {
        var text = withoutPlaceholders(SG.locales.vi[key]).trim();
        return text.split(/\s+/).length >= 5 && !/\.code\./.test(key) && !/[^\x00-\x7f]/.test(text);
      });
      expect(plain).toEqual([]);
    });

    it('detects a deleted key (self-test of the checks above)', function () {
      packsReady();
      var vi = Object.assign({}, SG.locales.vi);
      delete vi['technique.xWing.desc'];
      expect(onlyIn(SG.locales.en, vi)).toEqual(['technique.xWing.desc']);
      expect(missingFrom(['technique.xWing.desc', 'difficulty.hard'], vi)).toEqual(['technique.xWing.desc']);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Fragments
  // ---------------------------------------------------------------------------------------------

  describe('i18n: locale fragments', function () {
    it('has no key defined twice (base pack against fragments, or two fragments)', function () {
      packsReady();
      expect(I.conflicts).toEqual([]);
    });

    it('gives every fragment the same keys in English and Vietnamese, none empty', function () {
      packsReady();
      (SG.localeFragments || []).forEach(function (fragment, index) {
        expect(typeof fragment.en).toBe('object');
        expect(typeof fragment.vi).toBe('object');
        expect(onlyIn(fragment.en, fragment.vi)).toEqual([]);
        expect(onlyIn(fragment.vi, fragment.en)).toEqual([]);
        LOCALES.forEach(function (code) {
          Object.keys(fragment[code]).forEach(function (key) {
            expect(typeof fragment[code][key] === 'string' && fragment[code][key].trim() !== '').toBe(true);
            if (code === 'vi') {
              expect(placeholders(fragment.vi[key])).toEqual(placeholders(fragment.en[key]));
            }
          });
        });
        expect(index).toBeGreaterThan(-1);
      });
    });

    it('has merged every fragment into the live packs', function () {
      packsReady();
      I.mergeFragments();
      (SG.localeFragments || []).forEach(function (fragment) {
        LOCALES.forEach(function (code) {
          Object.keys(fragment[code]).forEach(function (key) {
            expect(hasOwn(SG.locales[code], key)).toBe(true);
          });
        });
      });
    });

    it('mergeInto: the base pack wins, a redefined key is a reported conflict, not an override', function () {
      packsReady();
      var locales = { en: { a: 'base', keep: 'base' }, vi: { a: 'nền', keep: 'nền' } };
      var report = I.mergeInto(locales, [
        { en: { a: 'fragment', b: 'one' }, vi: { a: 'mảnh', b: 'một' } },
        { en: { b: 'again', c: 'three' }, vi: { b: 'lại', c: 'ba' } }
      ]);
      expect(locales.en.a).toBe('base');
      expect(locales.vi.a).toBe('nền');
      expect(locales.en.b).toBe('one');
      expect(locales.en.c).toBe('three');
      expect(report.count).toBe(2);
      expect(report.conflicts).toEqual([
        { locale: 'en', key: 'a', fragment: 0 },
        { locale: 'vi', key: 'a', fragment: 0 },
        { locale: 'en', key: 'b', fragment: 1 },
        { locale: 'vi', key: 'b', fragment: 1 }
      ]);
    });

    it('mergeInto: starts at the given fragment, so a grown array is merged without repeating', function () {
      packsReady();
      var locales = { en: {}, vi: {} };
      var fragments = [{ en: { a: '1' }, vi: { a: '1' } }];
      I.mergeInto(locales, fragments, 0);
      fragments.push({ en: { b: '2' }, vi: { b: '2' } });
      var report = I.mergeInto(locales, fragments, 1);
      expect(report.count).toBe(1);
      expect(report.conflicts).toEqual([]);
      expect(Object.keys(locales.en).sort()).toEqual(['a', 'b']);
    });

    it('merges a fragment pushed later into the live packs at once, without a conflict', function () {
      packsReady();
      var fragments = SG.localeFragments;
      var before = fragments.length;
      var conflictsBefore = I.conflicts.length;
      var fragment = {
        en: { 'test.i18n.merge': 'merged {n}' },
        vi: { 'test.i18n.merge': 'đã gộp {n}' }
      };
      try {
        fragments.push(fragment);
        expect(SG.locales.en['test.i18n.merge']).toBe('merged {n}');
        expect(inLocale('vi', function () { return I.t('test.i18n.merge', { n: 2 }); })).toBe('đã gộp 2');
        expect(I.conflicts.length).toBe(conflictsBefore);
      } finally {
        fragments.splice(before, fragments.length - before);
        delete SG.locales.en['test.i18n.merge'];
        delete SG.locales.vi['test.i18n.merge'];
        I.mergeFragments();
      }
      expect(fragments.length).toBe(before);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // t(), has(), plural forms
  // ---------------------------------------------------------------------------------------------

  describe('i18n: t()', function () {
    it('inserts {name} parameters, also when a name repeats', function () {
      packsReady();
      withKeys({ 'test.t.a': '{x} + {x} = {y}' }, { 'test.t.a': '{x} cộng {x} bằng {y}' }, function () {
        expect(I.t('test.t.a', { x: 2, y: 4 })).toBe('2 + 2 = 4');
        expect(inLocale('vi', function () { return I.t('test.t.a', { x: 2, y: 4 }); }))
          .toBe('2 cộng 2 bằng 4');
      });
    });

    it('writes 0, joins lists with ", ", turns booleans into yes / no and null into nothing', function () {
      packsReady();
      var text = '[{n}] [{list}] [{flag}] [{nothing}]';
      withKeys({ 'test.t.b': text }, { 'test.t.b': text }, function () {
        var args = { n: 0, list: ['R1C1', 'R2C2', 3], flag: true, nothing: null };
        expect(I.t('test.t.b', args)).toBe('[0] [R1C1, R2C2, 3] [Yes] []');
        expect(inLocale('vi', function () { return I.t('test.t.b', args); }))
          .toBe('[0] [R1C1, R2C2, 3] [Có] []');
      });
    });

    it('leaves a placeholder alone when its argument is missing, and keeps the arguments', function () {
      packsReady();
      withKeys({ 'test.t.c': 'a {x} b {y}' }, { 'test.t.c': 'a {x} b {y}' }, function () {
        var args = { x: 1 };
        expect(I.t('test.t.c', args)).toBe('a 1 b {y}');
        expect(args).toEqual({ x: 1 });
        expect(I.t('test.t.c')).toBe('a {x} b {y}');
      });
    });

    it('picks _one / _other with args.count in English', function () {
      packsReady();
      withKeys({ 'test.t.p_one': '{count} apple', 'test.t.p_other': '{count} apples' },
        { 'test.t.p_one': '{count} quả', 'test.t.p_other': '{count} quả' }, function () {
          expect(I.t('test.t.p', { count: 1 })).toBe('1 apple');
          expect(I.t('test.t.p', { count: 0 })).toBe('0 apples');
          expect(I.t('test.t.p', { count: 2 })).toBe('2 apples');
          expect(I.has('test.t.p')).toBe(true);
        });
    });

    it('has no plural form in Vietnamese: _other is used for every count, then the plain key', function () {
      packsReady();
      withKeys({ 'test.t.q_one': 'one', 'test.t.q_other': 'many', 'test.t.r': 'plain {count}' },
        { 'test.t.q_one': 'một', 'test.t.q_other': 'nhiều', 'test.t.r': 'thường {count}' }, function () {
          inLocale('vi', function () {
            expect(I.t('test.t.q', { count: 1 })).toBe('nhiều');
            expect(I.t('test.t.q', { count: 5 })).toBe('nhiều');
            expect(I.t('test.t.r', { count: 1 })).toBe('thường 1');
          });
        });
    });

    it('falls back to the plain key without plural forms, and ignores a count that is no number',
      function () {
      packsReady();
      withKeys({ 'test.t.s': 'plain {count}' }, { 'test.t.s': 'thường {count}' }, function () {
        expect(I.t('test.t.s', { count: 3 })).toBe('plain 3');
        expect(I.t('test.t.s', { count: 'many' })).toBe('plain many');
      });
    });

    it('chooses the text <key>.<rule> when args.rule names one, else the key itself', function () {
      packsReady();
      withKeys({ 'test.t.u': 'neutral', 'test.t.u.wrap': 'wrapped' },
        { 'test.t.u': 'trung tính', 'test.t.u.wrap': 'bọc' }, function () {
          expect(I.t('test.t.u', { rule: 'wrap' })).toBe('wrapped');
          expect(I.t('test.t.u', { rule: 'other' })).toBe('neutral');
          expect(I.t('test.t.u')).toBe('neutral');
        });
    });

    it('translates unitKind and orientation arguments', function () {
      packsReady();
      withKeys({ 'test.t.k': 'in the {unitKind}' }, { 'test.t.k': 'trong {unitKind}' }, function () {
        expect(I.t('test.t.k', { unitKind: 'col' })).toBe('in the column');
        expect(inLocale('vi', function () { return I.t('test.t.k', { unitKind: 'box' }); }))
          .toBe('trong khối');
        expect(I.t('test.t.k', { unitKind: 'mystery' })).toBe('in the mystery');
      });
    });

    it('returns the key itself for a missing key, and warns only in debug mode', function () {
      packsReady();
      var warn = console.warn;
      var calls = [];
      console.warn = function (text) { calls.push(String(text)); };
      try {
        SG.setDebug(false);
        expect(I.t('test.no.such.key')).toBe('test.no.such.key');
        expect(calls.length).toBe(0);
        SG.setDebug(true);
        expect(I.t('test.no.such.key')).toBe('test.no.such.key');
        expect(calls.length).toBe(1);
        expect(calls[0]).toContain('test.no.such.key');
        expect(I.has('test.no.such.key')).toBe(false);
      } finally {
        SG.setDebug(false);
        console.warn = warn;
      }
    });

    it('never returns an empty string, even for odd input', function () {
      packsReady();
      expect(I.t('x')).toBe('x');
      expect(I.t('')).toBe('');
      expect(I.t(undefined)).toBe('');
    });

    it('falls back to the English text when the current language lacks the key', function () {
      packsReady();
      withKeys({ 'test.t.only.en': 'only in English' }, {}, function () {
        expect(inLocale('vi', function () { return I.t('test.t.only.en'); })).toBe('only in English');
        expect(inLocale('vi', function () { return I.has('test.t.only.en'); })).toBe(false);
      });
    });

    it('lists the merged keys of a language, sorted', function () {
      packsReady();
      var keys = I.keys('vi');
      expect(keys).toEqual(Object.keys(SG.locales.vi).sort());
      expect(I.keys()).toEqual(I.keys('en'));
      expect(I.keys('xx')).toEqual(I.keys('en'));
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Switching the language
  // ---------------------------------------------------------------------------------------------

  describe('i18n: setLocale, onChange and the document', function () {
    it('switches the language without a DOM and tells the listeners (new, old) once', function () {
      packsReady();
      if (typeof root.document !== 'undefined') SG.test.skip('this run has a real DOM');
      var seen = [];
      var off = I.onChange(function (next, previous) { seen.push(next + '<' + previous); });
      try {
        expect(I.setLocale('vi')).toBe('vi');
        expect(I.current).toBe('vi');
        expect(I.t('common.close')).toBe('Đóng');
        I.setLocale('vi');
        expect(seen).toEqual(['vi<en']);
        I.setLocale('en');
        expect(seen).toEqual(['vi<en', 'en<vi']);
        expect(I.t('common.close')).toBe('Close');
      } finally {
        off();
        I.setLocale('en');
      }
    });

    it('stops calling an unsubscribed listener, and survives a listener that throws', function () {
      packsReady();
      var calls = 0;
      var after = 0;
      var error = console.error;
      console.error = function () {};
      var offA = I.onChange(function () { calls++; });
      var offBad = I.onChange(function () { throw new Error('listener failure'); });
      var offB = I.onChange(function () { after++; });
      try {
        I.setLocale('vi');
        expect(calls).toBe(1);
        expect(after).toBe(1);
        offA();
        offA();
        I.setLocale('en');
        expect(calls).toBe(1);
        expect(after).toBe(2);
      } finally {
        offBad();
        offB();
        console.error = error;
        I.setLocale('en');
      }
    });

    it('accepts tags such as vi-VN and ignores a language it does not offer', function () {
      packsReady();
      try {
        expect(I.setLocale('vi-VN')).toBe('vi');
        expect(I.setLocale('fr')).toBe('vi');
        expect(I.setLocale(undefined)).toBe('vi');
        expect(I.current).toBe('vi');
        expect(I.normalize('EN_us')).toBe('en');
        expect(I.normalize('de')).toBe(null);
      } finally {
        I.setLocale('en');
      }
    });

    it('rejects a listener that is not a function', function () {
      packsReady();
      expect(function () { I.onChange(null); }).toThrow();
    });

    it('updates <html lang>, translates the document and dispatches localechange', function () {
      packsReady();
      if (typeof root.document !== 'undefined') SG.test.skip('this run has a real DOM');
      var html = fakeEl({});
      var label = fakeEl({ 'data-i18n': 'common.close' });
      var events = [];
      var doc = {
        documentElement: html,
        querySelectorAll: function () { return [label]; },
        dispatchEvent: function (event) { events.push(event.type); return true; }
      };
      root.document = doc;
      try {
        I.setLocale('vi');
        expect(html.attrs.lang).toBe('vi');
        expect(label.textContent).toBe('Đóng');
        if (typeof CustomEvent !== 'undefined') expect(events).toEqual(['localechange']);
        I.setLocale('en');
        expect(html.attrs.lang).toBe('en');
        expect(label.textContent).toBe('Close');
      } finally {
        delete root.document;
        I.setLocale('en');
      }
    });
  });

  // ---------------------------------------------------------------------------------------------
  // applyTo
  // ---------------------------------------------------------------------------------------------

  describe('i18n: applyTo', function () {
    function tree() {
      var title = fakeEl({ 'data-i18n': 'common.close' });
      var button = fakeEl({ 'data-i18n-attr': 'title:common.cancel,aria-label:common.ok' });
      var both = fakeEl({ 'data-i18n': 'common.yes', 'data-i18n-attr': 'title:common.no' });
      var counted = fakeEl({ 'data-i18n': 'unit.cell', 'data-i18n-args': '{"count":3}' });
      var plain = fakeEl({ id: 'untouched' });
      var nested = fakeEl({}, [fakeEl({ 'data-i18n': 'common.next' })]);
      var rootEl = fakeEl({}, [title, button, both, counted, plain, nested]);
      return { rootEl: rootEl, title: title, button: button, both: both, counted: counted, plain: plain,
        nested: nested.children[0] };
    }

    it('sets the text of data-i18n elements and the attributes of data-i18n-attr elements', function () {
      packsReady();
      var t = tree();
      var count = I.applyTo(t.rootEl);
      expect(count).toBe(5);
      expect(t.title.textContent).toBe('Close');
      expect(t.button.attrs.title).toBe('Cancel');
      expect(t.button.attrs['aria-label']).toBe('OK');
      expect(t.both.textContent).toBe('Yes');
      expect(t.both.attrs.title).toBe('No');
      expect(t.nested.textContent).toBe('Next');
      expect(t.plain.textContent).toBe('');
      expect(hasOwn(t.plain.attrs, 'title')).toBe(false);
    });

    it('gives data-i18n-args to the translation (plural form included)', function () {
      packsReady();
      var t = tree();
      I.applyTo(t.rootEl);
      expect(t.counted.textContent).toBe('3 cells');
      inLocale('vi', function () {
        I.applyTo(t.rootEl);
        expect(t.counted.textContent).toBe('3 ô');
      });
    });

    it('translates again after the language changed, with no reload', function () {
      packsReady();
      var t = tree();
      I.applyTo(t.rootEl);
      inLocale('vi', function () {
        I.applyTo(t.rootEl);
        expect(t.title.textContent).toBe('Đóng');
        expect(t.button.attrs.title).toBe('Hủy');
        expect(t.both.attrs.title).toBe('Không');
      });
    });

    it('also handles the root element itself, and shows the key of an unknown key', function () {
      packsReady();
      var rootEl = fakeEl({ 'data-i18n': 'test.applyTo.unknown' });
      expect(I.applyTo(rootEl)).toBe(1);
      expect(rootEl.textContent).toBe('test.applyTo.unknown');
    });

    it('survives broken arguments, an attribute list without keys, and nothing at all', function () {
      packsReady();
      var broken = fakeEl({ 'data-i18n': 'common.close', 'data-i18n-args': '{nope',
        'data-i18n-attr': 'title,:x,y:' });
      expect(function () { I.applyTo(broken); }).not.toThrow();
      expect(broken.textContent).toBe('Close');
      expect(I.applyTo(null)).toBe(0);
      expect(I.applyTo({})).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // detect
  // ---------------------------------------------------------------------------------------------

  describe('i18n: detect (the start language, rule L4)', function () {
    it('takes the URL language first, then the stored one, then the browser, then English', function () {
      packsReady();
      expect(I.detect({ urlLang: 'vi', stored: 'en', navigator: 'en-US' })).toBe('vi');
      expect(I.detect({ urlLang: 'en', stored: 'vi', navigator: 'vi-VN' })).toBe('en');
      expect(I.detect({ stored: 'vi', navigator: 'en-US' })).toBe('vi');
      expect(I.detect({ navigator: 'vi-VN' })).toBe('vi');
      expect(I.detect({})).toBe('en');
      expect(I.detect()).toBe('en');
    });

    it('skips a source that names a language it does not offer', function () {
      packsReady();
      expect(I.detect({ urlLang: 'fr', stored: 'vi' })).toBe('vi');
      expect(I.detect({ urlLang: 'xx', stored: 'yy', navigator: 'vi' })).toBe('vi');
      expect(I.detect({ urlLang: 'fr', stored: 'de', navigator: 'ja-JP' })).toBe('en');
    });

    it('ignores case, region and underscores', function () {
      packsReady();
      expect(I.detect({ urlLang: 'VI' })).toBe('vi');
      expect(I.detect({ stored: 'vi_VN' })).toBe('vi');
      expect(I.detect({ navigator: 'EN-gb' })).toBe('en');
    });

    it('reads a navigator object: the first supported entry of languages, else language', function () {
      packsReady();
      expect(I.detect({ navigator: { languages: ['fr-FR', 'vi', 'en'], language: 'fr-FR' } })).toBe('vi');
      expect(I.detect({ navigator: { language: 'vi-VN' } })).toBe('vi');
      expect(I.detect({ navigator: ['de', 'vi-VN'] })).toBe('vi');
      expect(I.detect({ navigator: { languages: [] } })).toBe('en');
    });

    it('does not change the current language and does not need a DOM or a storage', function () {
      packsReady();
      I.detect({ urlLang: 'vi' });
      expect(I.current).toBe('en');
    });

    it('survives values of the wrong type', function () {
      packsReady();
      expect(I.detect({ urlLang: 5, stored: {}, navigator: 7 })).toBe('en');
      expect(I.detect({ urlLang: null, stored: null, navigator: null })).toBe('en');
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Numbers and durations
  // ---------------------------------------------------------------------------------------------

  describe('i18n: formatNumber and formatDuration', function () {
    it('formats numbers with the separators of the language', function () {
      packsReady();
      expect(I.formatNumber(1234.5)).toBe('1,234.5');
      expect(inLocale('vi', function () { return I.formatNumber(1234.5); })).toBe('1.234,5');
      expect(I.formatNumber(0.256, { style: 'percent' })).toBe('26%');
      expect(I.formatNumber(Infinity)).toBe('Infinity');
    });

    it('writes durations: milliseconds, seconds with one decimal, minutes and hours', function () {
      packsReady();
      expect(I.formatDuration(412)).toBe('412 ms');
      expect(I.formatDuration(0)).toBe('0 ms');
      expect(I.formatDuration(999.6)).toBe('1 s');
      expect(I.formatDuration(1000)).toBe('1 s');
      expect(I.formatDuration(2500)).toBe('2.5 s');
      expect(I.formatDuration(12040)).toBe('12 s');
      expect(I.formatDuration(65000)).toBe('1 min 5 s');
      expect(I.formatDuration(120000)).toBe('2 min');
      expect(I.formatDuration(3720000)).toBe('1 h 2 min');
      expect(I.formatDuration(7200000)).toBe('2 h');
    });

    it('writes durations in the Vietnamese format', function () {
      packsReady();
      inLocale('vi', function () {
        expect(I.formatDuration(412)).toBe('412 ms');
        expect(I.formatDuration(2500)).toBe('2,5 giây');
        expect(I.formatDuration(65000)).toBe('1 phút 5 giây');
        expect(I.formatDuration(3720000)).toBe('1 giờ 2 phút');
      });
    });

    it('shows a dash for a duration that makes no sense', function () {
      packsReady();
      expect(I.formatDuration(-1)).toBe('\u2013');
      expect(I.formatDuration(NaN)).toBe('\u2013');
      expect(I.formatDuration(undefined)).toBe('\u2013');
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Error messages
  // ---------------------------------------------------------------------------------------------

  describe('i18n: tError', function () {
    it('translates a GenerationError with its own arguments', function () {
      packsReady();
      var err = new SG.errors.GenerationError('digger.invalidOption',
        { option: 'digOrder', value: 'zigzag' });
      expect(I.tError(err)).toBe('The value "zigzag" is not valid for the option "digOrder".');
      expect(inLocale('vi', function () { return I.tError(err); }))
        .toBe('Giá trị “zigzag” không hợp lệ cho tùy chọn “digOrder”.');
    });

    it('accepts a plain {code, i18nArgs} copy (what postMessage delivers) and a bare code', function () {
      packsReady();
      expect(I.tError({ code: 'budget.cancelled', i18nArgs: {} })).toBe('Generation was cancelled.');
      expect(I.tError('budget.cancelled')).toBe('Generation was cancelled.');
      expect(I.tError('rng.invalidSeed', { seed: 'abc' })).toContain('"abc"');
    });

    it('names the level and the variant of difficulty.unsupportedLevel in the current language', function () {
      packsReady();
      var err = new SG.errors.GenerationError('difficulty.unsupportedLevel',
        { level: 'evil', variantId: 'classic4' });
      expect(I.tError(err)).toBe('Classic Sudoku 4\u00d74 cannot be generated at the level "Evil". ' +
        'Please choose another level.');
      expect(inLocale('vi', function () { return I.tError(err); }))
        .toBe('Sudoku cổ điển 4×4 không sinh được ở mức “Địa ngục”. Hãy chọn mức khác.');
    });

    it('gives a generic message for an unknown code, and the message of a plain Error', function () {
      packsReady();
      expect(I.tError('no.such.code')).toBe('Something went wrong (no.such.code).');
      expect(I.tError(new Error('boom'))).toBe('An unexpected error stopped the generator: boom');
      expect(I.tError({ code: 'unexpected', i18nArgs: { message: 'boom' } })).toContain('boom');
      expect(I.tError(null)).toContain('unexpected');
    });

    it('does not leave a placeholder behind when the error carries all its arguments', function () {
      packsReady();
      var err = new SG.errors.GenerationError('symmetry.needsSquareCanvas',
        { kind: 'rotational90', rows: 3, cols: 5 });
      LOCALES.forEach(function (code) {
        expect(inLocale(code, function () { return I.tError(err); })).toContain('3');
        expect(inLocale(code, function () { return I.tError(err); })).not.toContain('{');
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // eventText
  // ---------------------------------------------------------------------------------------------

  describe('i18n: eventText', function () {
    function event(key, args, type) {
      return { type: type || 'step', stepId: 'dig', phase: 'progress', t: 0, seq: 0, i18nKey: key,
        i18nArgs: args };
    }

    it('writes cells as labels of the model, of a function, or as #n without either', function () {
      packsReady();
      var e = event('dig.try', { cells: [0, 10], pass: 'guided' }, 'micro');
      var model = SG.variants.get('classic9').build({}, null);
      expect(I.eventText(e, { model: model })).toBe('Try removing R1C1, R2C2.');
      expect(I.eventText(e, { cellLabel: function (i) { return 'c' + i; } })).toBe('Try removing c0, c10.');
      expect(I.eventText(e)).toBe('Try removing #1, #11.');
      I.setCellLabeler(function (i) { return 'x' + i; });
      try {
        expect(I.eventText(e)).toBe('Try removing x0, x10.');
        expect(I.cellLabel('R4C7')).toBe('R4C7');
        expect(I.cellLabel(3, function () { return 'own'; })).toBe('own');
      } finally {
        I.setCellLabeler(null);
      }
      expect(I.cellLabel(3)).toBe('#4');
    });

    it('writes ids as their translated names', function () {
      packsReady();
      var e = event('configure.config', { variantId: 'killer', difficulty: 'veryEasy', seed: 42,
        symbolMode: 'letters', symmetry: 'mirrorH', digOrder: 'spiral', maxAttempts: 8, trace: 'summary' });
      var en = I.eventText(e);
      expect(en).toContain('Killer Sudoku');
      expect(en).toContain('Very easy');
      expect(en).toContain('Mirror top\u2013bottom');
      expect(en).toContain('Spiral');
      expect(en).toContain('42');
      var vi = inLocale('vi', function () { return I.eventText(e); });
      expect(vi).toContain('Sudoku Sát thủ');
      expect(vi).toContain('Rất dễ');
      expect(vi).toContain('Xoắn ốc');
    });

    it('chooses the plural form from count (and from dropped for trace.coalesced)', function () {
      packsReady();
      var fixed = function (count) {
        return I.eventText(event('fullGrid.fixed', { count: count }, 'micro'));
      };
      expect(fixed(1)).toBe('1 cell is fixed by the variant.');
      expect(fixed(4)).toBe('4 cells are fixed by the variant.');
      expect(I.eventText(event('trace.coalesced', { dropped: 1 }, 'micro'))).toContain('1 detailed step ');
      expect(I.eventText(event('trace.coalesced', { dropped: 9 }, 'micro'))).toContain('9 detailed steps');
      expect(I.eventText(event('rate.technique', { technique: 'xWing', count: 2, group: 'fish' })))
        .toBe('X-Wing (Fish and colouring) was needed 2 times.');
    });

    it('has a second text for a yes / no argument: dig.verify, retry.difficulty, done', function () {
      packsReady();
      expect(I.eventText(event('dig.verify', { unique: true }))).toContain('exactly one solution');
      expect(I.eventText(event('dig.verify', { unique: false }))).toContain('more than one');
      var retry = { attempt: 1, maxAttempts: 8, requested: 'hard', achieved: 'easy', reason: 'difficulty' };
      expect(I.eventText(event('retry.difficulty', Object.assign({ willRetry: true }, retry), 'retry')))
        .toContain('A new grid is drawn');
      expect(I.eventText(event('retry.difficulty', Object.assign({ willRetry: false }, retry), 'retry')))
        .toContain('No attempts are left');
      var done = { requested: 'hard', achieved: 'medium', attempts: 8, clues: 30, seed: 5, warnings: [] };
      var finished = function (exact) {
        return I.eventText(event('done', Object.assign({ exact: exact }, done), 'done'));
      };
      expect(finished(true)).toContain('Done: a "Medium"');
      expect(finished(false)).toContain('closest');
    });

    it('shows a dash for a missing value and the infinity sign for an open score band', function () {
      packsReady();
      var spec = I.eventText(event('buildModel.spec',
        { level: 'evil', scoreMin: 1500, scoreMax: null, minClues: 17 }));
      expect(spec).toContain('1500 to \u221e');
      var rated = I.eventText(event('rate.result', { level: 'veryEasy', score: 20, hardestTechnique: null,
        requested: 'veryEasy', solved: true }));
      expect(rated).toContain('hardest technique: \u2013');
    });

    it('turns an error event into the message of its code, and a metric (no key) into nothing', function () {
      packsReady();
      var failed = event('error.budget.exceeded', { code: 'budget.exceeded', reason: 'time' }, 'error');
      expect(I.eventText(failed)).toBe(I.tError('budget.exceeded'));
      var unexpected = event('error.unexpected', { code: 'unexpected', message: 'kaput' }, 'error');
      expect(I.eventText(unexpected)).toContain('kaput');
      var metric = { type: 'metric', stepId: 'dig', phase: 'progress', metrics: { clues: 40 } };
      expect(I.eventText(metric)).toBe('');
      expect(I.eventText(null)).toBe('');
    });

    it('renders every event of the vocabulary with its documented arguments, in both languages', function () {
      packsReady();
      var seen = {};
      SG.events.VOCABULARY.forEach(function (entry) {
        if (entry.key === null || entry.key === 'error.*' || seen[entry.key]) return;
        seen[entry.key] = true;
        var args = {};
        entry.args.forEach(function (name) { args[name] = sampleArgument(entry.key, name); });
        LOCALES.forEach(function (code) {
          var text = inLocale(code, function () {
            return I.eventText(event(entry.key, args, entry.type));
          });
          expect(text.length).toBeGreaterThan(0);
          expect(text).not.toBe(entry.key);
          expect(/[{}]|undefined|NaN|\[object/.test(text)).toBe(false);
        });
      });
      expect(Object.keys(seen).length).toBeGreaterThan(40);
    });

    it('uses no placeholder that the vocabulary does not list for the event', function () {
      packsReady();
      var allowed = {};
      SG.events.VOCABULARY.forEach(function (entry) {
        if (entry.key === null) return;
        var list = allowed[entry.key] = allowed[entry.key] || ['count', 'part', 'parts'];
        entry.args.forEach(function (name) { if (list.indexOf(name) === -1) list.push(name); });
      });
      var wrong = [];
      Object.keys(allowed).forEach(function (key) {
        if (key === 'error.*') return;
        ['', '_one', '_other', '.yes', '.no'].forEach(function (suffix) {
          LOCALES.forEach(function (code) {
            var text = SG.locales[code][key + suffix];
            if (text === undefined) return;
            placeholders(text).forEach(function (name) {
              if (allowed[key].indexOf(name) === -1) {
                wrong.push(code + ':' + key + suffix + ' {' + name + '}');
              }
            });
          });
        });
      });
      expect(wrong).toEqual([]);
    });

    it('renders every event of a real generation (classic 4x4, full trace), in both languages', function () {
      packsReady();
      var events = [];
      SG.pipeline.run({ variantId: 'classic4', difficulty: 'veryEasy', seed: 7, trace: 'full' },
        function (e) { events.push(e); });
      var model = SG.variants.get('classic4').build({}, null);
      var withKey = events.filter(function (e) { return typeof e.i18nKey === 'string'; });
      expect(withKey.length).toBeGreaterThan(30);
      LOCALES.forEach(function (code) {
        inLocale(code, function () {
          withKey.forEach(function (e) {
            var text = I.eventText(e, { model: model });
            expect(text.length).toBeGreaterThan(0);
            if (/[{}]|undefined|NaN|\[object/.test(text) || text === e.i18nKey) {
              throw new Error('event ' + e.i18nKey + ' renders as "' + text + '" in ' + code + ', args ' +
                JSON.stringify(e.i18nArgs));
            }
          });
        });
      });
    });

    /** A value for a documented event argument, of the kind the core sends. */
    function sampleArgument(key, name) {
      var levels = ['difficulty', 'level', 'requested', 'achieved'];
      if (levels.indexOf(name) !== -1) return 'hard';
      if (name === 'applied') return 'summary';
      if (name === 'variantId') return 'classic9';
      if (name === 'symbolMode') return 'digits';
      if (name === 'symmetry') return 'rotational180';
      if (name === 'digOrder' || name === 'order') return 'snake';
      if (name === 'technique' || name === 'hardestTechnique') return 'xWing';
      if (name === 'group') return 'fish';
      if (name === 'pass') return 'guided';
      if (name === 'trace') return 'full';
      if (name === 'strategy') return 'cells';
      if (name === 'cell') return 12;
      if (name === 'cells') return [3, 4];
      if (name === 'warnings') return ['difficulty.approximate'];
      if (name === 'code') return 'budget.exceeded';
      if (name === 'message') return 'boom';
      if (name === 'reason') {
        return key === 'retry.difficulty' ? 'difficulty' : (key === 'dig.skip' ? 'minClues' : 'ambiguous');
      }
      if (['unique', 'exact', 'willRetry', 'solved', 'forced', 'finalize', 'skipped'].indexOf(name) !== -1) {
        return true;
      }
      return 7;
    }
  });

  // ---------------------------------------------------------------------------------------------
  // Coverage, computed from the code
  // ---------------------------------------------------------------------------------------------

  describe('i18n: every key the code needs exists in both languages', function () {
    function checkBoth(title, required) {
      LOCALES.forEach(function (code) {
        var missing = missingFrom(unique(required), SG.locales[code]);
        if (missing.length > 0) throw new Error(title + ': missing in "' + code + '": ' + missing.join(', '));
      });
    }

    function optionKeys(option, out) {
      Object.keys(option).forEach(function (name) {
        var value = option[name];
        if (/Key$/.test(name) && typeof value === 'string') out.push(value);
        if (name === 'choices' && Array.isArray(value)) value.forEach(function (c) { optionKeys(c, out); });
      });
      return out;
    }

    it('has the texts of the explanation cards (SG.explain.keys())', function () {
      packsReady();
      var keys = SG.explain.keys();
      expect(keys.length).toBeGreaterThan(60);
      checkBoth('explain', keys);
    });

    it('has the name of each of the seven steps', function () {
      packsReady();
      checkBoth('steps', SG.explain.STEP_IDS.map(function (id) { return 'step.' + id + '.name'; }));
    });

    it('has a line for every key of the event vocabulary (error.* expands to the error codes)', function () {
      packsReady();
      var keys = SG.events.vocabularyKeys().filter(function (key) { return key !== 'error.*'; });
      expect(keys.length).toBeGreaterThan(40);
      checkBoth('events', keys);
    });

    it('has the name of every registered variant, its group, symbol sets and description', function () {
      packsReady();
      var defs = SG.variants.list();
      expect(defs.length).toBeGreaterThanOrEqual(15);
      var required = [];
      defs.forEach(function (def) {
        required.push(def.i18nKey, def.i18nKey + '.desc', 'group.' + def.group);
        def.symbolModes.forEach(function (mode) { required.push('symbolMode.' + mode); });
      });
      checkBoth('variants', required);
    });

    it('has every key that a variant option names (label, hint, min/max/default label, choices)',
      function () {
        packsReady();
        var required = [];
        SG.variants.list().forEach(function (def) {
          def.options.forEach(function (option) { optionKeys(option, required); });
        });
        expect(required.length).toBeGreaterThan(20);
        checkBoth('variant options', required);
      });

    it('has a name and a description for every difficulty level', function () {
      packsReady();
      var required = [];
      SG.difficulty.LEVELS.forEach(function (level) {
        required.push('difficulty.' + level, 'difficulty.' + level + '.desc');
      });
      checkBoth('difficulty', required);
    });

    it('has a name for every symmetry kind, dig order, technique group and trace level', function () {
      packsReady();
      var required = [];
      SG.symmetry.KINDS.forEach(function (kind) { required.push('symmetry.' + kind); });
      SG.digger.ORDERS.forEach(function (order) { required.push('digOrder.' + order); });
      SG.techniques.GROUPS.forEach(function (group) { required.push('techniqueGroup.' + group); });
      SG.events.VERBOSITIES.forEach(function (level) { required.push('traceLevel.' + level); });
      expect(required.length).toBeGreaterThan(20);
      checkBoth('names', required);
    });

    it('has the names of the replay speeds and the generic words', function () {
      packsReady();
      var required = ['instant', 'fast', 'step', 'manual'].map(function (speed) { return 'speed.' + speed; });
      ['yes', 'no', 'ok', 'cancel', 'close', 'loading'].forEach(function (word) {
        required.push('common.' + word);
      });
      required.push('app.title');
      checkBoth('words', required);
      expect(SG.locales.en['app.title']).toBe('Sudoku Generator');
      expect(SG.locales.vi['app.title']).toBe('Trình sinh Sudoku');
    });

    it('has the reasons and pass names that the dig events carry', function () {
      packsReady();
      var required = ['rejected', 'minClues', 'unitMinimum', 'ambiguous', 'techniques', 'tooHard']
        .map(function (reason) { return 'dig.reason.' + reason; });
      ['random', 'guided', 'fallback'].forEach(function (pass) { required.push('digPass.' + pass); });
      required.push('retry.reason.difficulty');
      checkBoth('dig events', required);
    });

    it('has the name and a plain description of every registered technique', function () {
      packsReady();
      var list = SG.techniques.list();
      expect(list.length).toBeGreaterThanOrEqual(26);
      var required = [];
      list.forEach(function (tech) { required.push(tech.i18nKey, tech.i18nKey + '.desc'); });
      checkBoth('techniques', required);
    });

    it('has the unit kinds that technique steps and the board name', function () {
      packsReady();
      var kinds = ['row', 'col', 'box', 'region', 'diag', 'window', 'cage'];
      var used = [];
      SG.variants.list().forEach(function (def) {
        var model = null;
        try {
          model = def.build({}, null);
        } catch (err) {
          return; // a variant whose build needs a random stream: its units are rows, columns and boxes
        }
        model.unitMeta.forEach(function (meta) { used.push(meta.kind); });
      });
      unique(used).forEach(function (kind) { expect(kinds).toContain(kind); });
      checkBoth('unit kinds', kinds.map(function (kind) { return 'unitKind.' + kind; }));
    });

    it('has the text of every solving step a technique can produce (read from js/core/tech-*.js)',
      function () {
      if (!NODE) SG.test.skip('needs the Node runner to read the sources');
      packsReady();
      var required = [];
      var sources = readSources('js/core', /^tech-.*\.js$/);
      expect(sources.length).toBeGreaterThan(5);
      sources.forEach(function (source) {
        var kinds = allMatches(source.text, /\bKIND_[A-Z_]+ = '([A-Za-z]+)'/);
        allMatches(source.text, /'(technique\.[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*\.?)'/).forEach(function (key) {
          if (key.charAt(key.length - 1) !== '.') required.push(key);
          else if (key !== 'technique.') kinds.forEach(function (kind) { required.push(key + kind); });
        });
        // simpleColouring is one key with two texts, chosen by args.rule
        allMatches(source.text, /colouringFinding\([^;]*?digit, '([A-Za-z]+)'/).forEach(function (rule) {
          required.push('technique.simpleColouring.step.' + rule);
        });
      });
      // The techniques that build their step key from their id have a plain `.step` key.
      SG.techniques.list().forEach(function (tech) {
        var own = required.filter(function (key) { return key.indexOf(tech.i18nKey + '.') === 0; });
        var hasStep = own.some(function (key) { return /step/.test(key); });
        if (!hasStep) required.push(tech.i18nKey + '.step');
      });
      expect(unique(required).length).toBeGreaterThan(30);
      checkBoth('technique steps', required);
      expect(unique(required)).toContain('technique.simpleColouring.step.wrap');
      expect(unique(required)).toContain('technique.simpleColouring.step.trap');
      expect(unique(required)).toContain('technique.forcingChain.step.contradiction');
    });

    it('has a message for every error code thrown in js/core, js/variants and the exchange, and the generic ones',
      function () {
      if (!NODE) SG.test.skip('needs the Node runner to read the sources');
      packsReady();
      var codes = [];
      readSources('js/core', /\.js$/).concat(readSources('js/variants', /\.js$/))
        .concat(readSources('js/ui', /^exchange\.js$/)).forEach(function (source) {
        allMatches(source.text, /(?:GenerationError\(|\bfail\(|\berror\()\s*'([A-Za-z]+\.[A-Za-z]+)'/)
          .forEach(function (code) { codes.push(code); });
        allMatches(source.text, /_CODE\s*=\s*'([A-Za-z]+\.[A-Za-z]+)'/).forEach(function (code) {
          codes.push(code);
        });
      });
      codes = unique(codes).sort();
      expect(codes.length).toBeGreaterThan(40);
      expect(codes).toContain('budget.exceeded');
      expect(codes).toContain('wordoku.noWordList');
      ['invalidToken', 'tooLarge', 'unsupportedEncoding', 'invalidJson', 'invalidUrl'].forEach(function (name) {
        expect(codes).toContain('exchange.' + name);
      });
      var required = codes.map(function (code) { return 'error.' + code; });
      required.push('error.unknown', 'error.unexpected');
      checkBoth('error codes', required);
    });

    it('has the warnings that PuzzleResult.warnings can hold, and the notices of the pipeline', function () {
      if (!NODE) SG.test.skip('needs the Node runner to read the sources');
      packsReady();
      var warnings = [];
      readSources('js/core', /\.js$/).forEach(function (source) {
        allMatches(source.text, /warnings\.push\('([A-Za-z]+\.[A-Za-z]+)'\)/).forEach(function (key) {
          warnings.push(key);
        });
      });
      warnings = unique(warnings);
      expect(warnings).toContain('difficulty.approximate');
      expect(warnings).toContain('digger.unsoundTechnique');
      expect(warnings).toContain('trace.downgraded');
      checkBoth('warnings', warnings.concat(['extraStructure.wordFallback', 'retry.difficulty']));
    });
  });

  // ---------------------------------------------------------------------------------------------
  // The texts of real solving steps and errors, rendered with the arguments the code provides
  // ---------------------------------------------------------------------------------------------

  describe('i18n: solving steps of the classic ladder', function () {
    var F = SG.fixtures && SG.fixtures.techniques;
    var H = SG.techHelper;

    function stateOf(model, fixture) {
      return fixture.after !== null
        ? H.stateAfter(model, fixture.puzzle, fixture.after)
        : H.makeState(model, fixture.puzzle, { propagate: fixture.propagate });
    }

    it('renders the step of every technique with exactly the arguments its finding provides', function () {
      packsReady();
      if (!F || !H) SG.test.skip('the technique fixtures are not loaded');
      var model = H.model('classic9');
      var ctx = SG.techniques.createContext(model);
      I.setCellLabeler(function (i) { return SG.model.cellLabel(model, i); });
      var kinds = {};
      try {
        F.ids.forEach(function (id) {
          var tech = SG.techniques.get(id);
          F.byId[id].positive.slice(0, 1).forEach(function (fixture) {
            var finding = tech.find(model, stateOf(model, fixture), ctx);
            if (finding === null) throw new Error('fixture "' + fixture.name + '" found nothing');
            kinds[finding.i18nKey + (finding.i18nArgs.rule ? '/' + finding.i18nArgs.rule : '')] = true;
            LOCALES.forEach(function (code) {
              var text = inLocale(code, function () { return I.t(finding.i18nKey, finding.i18nArgs); });
              var problem = /[{}]|undefined|NaN|\[object/.test(text) || text === finding.i18nKey;
              if (problem) {
                throw new Error(finding.i18nKey + ' renders as "' + text + '" in ' + code + ' with args ' +
                  JSON.stringify(finding.i18nArgs));
              }
              var names = placeholders(SG.locales[code][finding.i18nKey + (finding.i18nArgs.rule ? '.' +
                finding.i18nArgs.rule : '')] || '');
              names.forEach(function (name) { expect(hasOwn(finding.i18nArgs, name)).toBe(true); });
            });
          });
        });
      } finally {
        I.setCellLabeler(null);
      }
      expect(Object.keys(kinds).length).toBeGreaterThanOrEqual(F.ids.length);
    }, 30000);

    it('picks the colouring text that matches args.rule', function () {
      packsReady();
      var args = { digit: 4, colour1: ['R1C1'], colour2: ['R2C2'], falseColour: 1,
        witness: ['R1C1', 'R1C9'] };
      var wrap = I.t('technique.simpleColouring.step', Object.assign({ rule: 'wrap' }, args));
      var trap = I.t('technique.simpleColouring.step', Object.assign({ rule: 'trap' }, args));
      var plain = I.t('technique.simpleColouring.step', args);
      expect(wrap).toContain('colour clash');
      expect(trap).toContain('colour trap');
      expect(plain).not.toBe(wrap);
      expect(plain).not.toBe(trap);
    });

    it('writes a forcing chain with the labels of the board', function () {
      packsReady();
      var model = H ? H.model('classic9') : SG.variants.get('classic9').build({}, null);
      I.setCellLabeler(function (i) { return SG.model.cellLabel(model, i); });
      try {
        var chains = [[[0, 5, 0], [1, 5, 1], [10, 5, 0]], [[0, 5, 1], [9, 5, 0]]];
        var text = I.t('technique.forcingChain.step.contradiction',
          { kind: 'contradiction', length: 3, chains: chains });
        expect(text).toContain('R1C1\u22605 \u21d2 R1C2=5 \u21d2 R2C2\u22605 | R1C1=5 \u21d2 R2C1\u22605');
        expect(text).toContain('3 links');
      } finally {
        I.setCellLabeler(null);
      }
    });
  });

  // ---------------------------------------------------------------------------------------------
  // index.html
  // ---------------------------------------------------------------------------------------------

  describe('i18n: index.html', function () {
    function readIndex() {
      if (!NODE) SG.test.skip('needs the Node runner to read index.html');
      var file = NODE.path.join(NODE.root, 'index.html');
      if (!NODE.fs.existsSync(file)) SG.test.skip('index.html does not exist yet');
      return NODE.fs.readFileSync(file, 'utf8');
    }

    function usedKeys(html) {
      var keys = [];
      allMatches(html, /\sdata-i18n=(["'])(.*?)\1/, 2).forEach(function (key) { keys.push(key.trim()); });
      allMatches(html, /\sdata-i18n-attr=(["'])(.*?)\1/, 2).forEach(function (list) {
        list.split(',').forEach(function (pair) {
          var cut = pair.lastIndexOf(':');
          if (cut > 0) keys.push(pair.slice(cut + 1).trim());
        });
      });
      return unique(keys);
    }

    it('translates every data-i18n and data-i18n-attr key of the page, in both languages', function () {
      packsReady();
      var keys = usedKeys(readIndex());
      expect(keys.length).toBeGreaterThan(10);
      LOCALES.forEach(function (code) {
        var missing = missingFrom(keys, SG.locales[code]);
        if (missing.length > 0) {
          throw new Error('index.html uses keys missing in "' + code + '": ' + missing.join(', '));
        }
      });
    });

    it('writes no attribute list without a key, and no empty data-i18n', function () {
      packsReady();
      var html = readIndex();
      allMatches(html, /\sdata-i18n-attr=(["'])(.*?)\1/, 2).forEach(function (list) {
        list.split(',').forEach(function (pair) {
          expect(/^\s*[A-Za-z][\w:-]*:[A-Za-z][\w.]*\s*$/.test(pair)).toBe(true);
        });
      });
      allMatches(html, /\sdata-i18n=(["'])(.*?)\1/, 2).forEach(function (key) {
        expect(key.trim()).not.toBe('');
      });
    });
  });
})();
