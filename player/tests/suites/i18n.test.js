// Internationalisation (task T-4.1 / T-4.9, design.md section 11): SG.i18n and the two language packs.
// Everything runs on Node without a DOM (a tiny fake DOM stands in where the DOM is the subject). The
// coverage tests are computed from the code (explain data, event vocabulary, variant registry, technique
// registry, error codes thrown in the engines and js/variants, data-i18n attributes of index.html), so a key
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
      var err = new SG.errors.GenerationError('technique.unknown', { id: 'zigzag' });
      expect(I.tError(err)).toBe('Unknown technique "zigzag".');
      expect(inLocale('vi', function () { return I.tError(err); })).toContain('zigzag');
      expect(inLocale('vi', function () { return I.tError(err); })).not.toBe(I.tError(err));
    });

    it('accepts a plain {code, i18nArgs} copy and a bare code', function () {
      packsReady();
      expect(I.tError({ code: 'budget.cancelled', i18nArgs: {} })).toBe('The operation was cancelled.');
      expect(I.tError('budget.cancelled')).toBe('The operation was cancelled.');
      expect(I.tError('dfs.invalidLimit', { limit: 'abc' })).toContain('"abc"');
    });

    it('says what is wrong with a link or a code (the exchange errors), in both languages', function () {
      packsReady();
      ['invalidToken', 'tooLarge', 'unsupportedEncoding', 'invalidJson', 'invalidUrl'].forEach(function (code) {
        var err = new SG.errors.GenerationError('exchange.' + code);
        LOCALES.forEach(function (locale) {
          var text = inLocale(locale, function () { return I.tError(err); });
          expect(text).not.toBe('');
          expect(text).not.toContain('error.exchange');
          expect(text).not.toContain('Something went wrong');
        });
        expect(inLocale('vi', function () { return I.tError(err); })).not.toBe(I.tError(err));
      });
    });

    it('gives a generic message for an unknown code, and the message of a plain Error', function () {
      packsReady();
      expect(I.tError('no.such.code')).toBe('Something went wrong (no.such.code).');
      expect(I.tError(new Error('boom'))).toBe('An unexpected error occurred: boom');
      expect(I.tError({ code: 'unexpected', i18nArgs: { message: 'boom' } })).toContain('boom');
      expect(I.tError(null)).toContain('unexpected');
    });

    it('does not leave a placeholder behind when the error carries all its arguments', function () {
      packsReady();
      var err = new SG.errors.GenerationError('technique.duplicate', { id: 'xWing' });
      LOCALES.forEach(function (code) {
        expect(inLocale(code, function () { return I.tError(err); })).toContain('xWing');
        expect(inLocale(code, function () { return I.tError(err); })).not.toContain('{');
      });
    });
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

    it('uses the canonical v2 difficulty names and descriptions in both languages', function () {
      packsReady();
      var names = [
        ['veryEasy', 'Very easy', 'Rất dễ'], ['easy', 'Easy', 'Dễ'],
        ['normal', 'Normal', 'Trung bình'], ['hard', 'Hard', 'Khó'],
        ['expert', 'Expert', 'Chuyên gia'], ['master', 'Master', 'Bậc thầy'],
        ['nightmare', 'Nightmare', 'Ác mộng'], ['hell1', 'Hell 1', 'Địa ngục 1'],
        ['hell2', 'Hell 2', 'Địa ngục 2']
      ];
      var descriptions = [
        ['normal', 'Typically uses pairs and triples of candidates (naked and hidden subsets).',
          'Thường dùng các cặp và bộ ba ứng viên (tập con trần và ẩn).'],
        ['hard', 'Typically uses quads, fish patterns (X-Wing, Swordfish) and simple colouring.',
          'Thường dùng bộ bốn ứng viên, các mẫu “cá” (X-Wing, Swordfish) và tô màu đơn giản.'],
        ['expert', 'Typically uses a wing (XY-Wing, XYZ-Wing), a Jellyfish or several fish patterns.',
          'Thường dùng một kỹ thuật cánh (XY-Wing, XYZ-Wing), Jellyfish hoặc nhiều mẫu “cá”.'],
        ['master', 'Typically uses several wings, the W-Wing or Unique Rectangles, sometimes a short forcing chain.',
          'Thường dùng nhiều kỹ thuật cánh, W-Wing hoặc Unique Rectangle, đôi khi một chuỗi suy luận ngắn.'],
        ['nightmare', 'Typically uses forcing chains and trial and error (Nishio), with very few clues.',
          'Thường dùng chuỗi suy luận và thử–sai (Nishio), với rất ít số cho sẵn.'],
        ['hell1', 'Typically uses many forcing chains and trial-and-error steps.',
          'Thường dùng nhiều chuỗi suy luận và bước thử–sai.'],
        ['hell2', 'Highest score band; typically involves substantial advanced reasoning.',
          'Khoảng điểm cao nhất; thường cần nhiều suy luận nâng cao.']
      ];
      expect(names.map(function (row) { return row[0]; })).toEqual(SG.importer.LEVELS);
      names.forEach(function (row) {
        expect(SG.locales.en['difficulty.' + row[0]]).toBe(row[1]);
        expect(SG.locales.vi['difficulty.' + row[0]]).toBe(row[2]);
      });
      descriptions.forEach(function (row) {
        expect(SG.locales.en['difficulty.' + row[0] + '.desc']).toBe(row[1]);
        expect(SG.locales.vi['difficulty.' + row[0] + '.desc']).toBe(row[2]);
      });
    });

    it('has the name, the description and the group of every variant and difficulty level', function () {
      packsReady();
      var ids = Object.keys(SG.importer.VARIANTS);
      expect(ids).toHaveLength(15);
      var required = [];
      ids.forEach(function (id) { required.push('variant.' + id, 'variant.' + id + '.desc'); });
      SG.importer.LEVELS.forEach(function (level) {
        required.push('difficulty.' + level, 'difficulty.' + level + '.desc');
      });
      ['digits', 'letters', 'colors', 'shapes', 'word'].forEach(function (mode) {
        required.push('symbolMode.' + mode);
      });
      SG.techniques.GROUPS.forEach(function (group) { required.push('techniqueGroup.' + group); });
      checkBoth('variants and levels', required);
    });

    it('has the generic words, the units, the durations and the title of the app', function () {
      packsReady();
      var required = ['yes', 'no', 'ok', 'cancel', 'close', 'loading', 'copy', 'copied', 'delete', 'more', 'less']
        .map(function (word) { return 'common.' + word; });
      required.push('app.title', 'unit.clue', 'unit.cell', 'duration.s', 'duration.min', 'duration.minSec',
        'duration.h', 'duration.hMin', 'duration.ms');
      checkBoth('words', required);
      expect(SG.locales.en['app.title']).toBe('Sudoku Player');
      expect(SG.locales.vi['app.title']).toBe('Trình chơi Sudoku');
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
      SG.testkit.documentNames().forEach(function (name) {
        var doc = SG.testkit.document(name);
        if (doc !== null) doc.model.unitMeta.forEach(function (meta) { used.push(meta.kind); });
      });
      unique(used).forEach(function (kind) { expect(kinds).toContain(kind); });
      checkBoth('unit kinds', kinds.map(function (kind) { return 'unitKind.' + kind; }));
    });

    it('has the text of every solving step a technique can produce (read from core/js/engine/tech-*.js)',
      function () {
      if (!NODE) SG.test.skip('needs the Node runner to read the sources');
      packsReady();
      var required = [];
      var sources = readSources('js/engine', /^tech-.*\.js$/).concat(readSources('../core/js/engine', /^tech-.*\.js$/));
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

    it('has a message for every error code thrown in the engines and js/ui, and the generic ones',
      function () {
      if (!NODE) SG.test.skip('needs the Node runner to read the sources');
      packsReady();
      var codes = [];
      readSources('js/engine', /\.js$/).concat(readSources('../core/js/engine', /\.js$/)).concat(readSources('js/ui', /\.js$/))
        .concat(readSources('../core/js/ui', /\.js$/)).forEach(function (source) {
        allMatches(source.text, /(?:GenerationError\(|\bfail\(|\berror\()\s*'([A-Za-z]+\.[A-Za-z]+)'/)
          .forEach(function (code) { codes.push(code); });
        allMatches(source.text, /_CODE\s*=\s*'([A-Za-z]+\.[A-Za-z]+)'/).forEach(function (code) {
          codes.push(code);
        });
      });
      codes = unique(codes).sort();
      expect(codes.length).toBeGreaterThan(20);
      expect(codes).toContain('budget.exceeded');
      expect(codes).toContain('exchange.invalidToken');
      var required = codes.map(function (code) { return 'error.' + code; });
      required.push('error.unknown', 'error.unexpected');
      checkBoth('error codes', required);
    });

    it('has every issue the importer can report, every key a module of js/ui names, and the exchange errors',
      function () {
        if (!NODE) SG.test.skip('needs the Node runner to read the sources');
        packsReady();
        checkBoth('importer', SG.importer.ERROR_KEYS.concat(SG.importer.WARNING_KEYS));
        ['invalidToken', 'tooLarge', 'unsupportedEncoding', 'invalidJson', 'invalidUrl'].forEach(function (code) {
          expect(SG.importer.ERROR_KEYS).toContain('error.exchange.' + code);
        });
        // Every literal key passed to the translation helpers of the UI files: t('a.b'), tr('a.b'), titleKey,
        // toast(kind, 'a.b'), the key attributes of data-i18n.
        var used = [];
        readSources('js/ui', /\.js$/).concat(readSources('../core/js/ui', /\.js$/)).forEach(function (source) {
          allMatches(source.text, /\b(?:t|tr|translate|tx|hasText)\(\s*'([a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9_]+)+)'/)
            .forEach(function (key) { used.push(key); });
          allMatches(source.text, /\b(?:titleKey|labelKey|textKey|hintKey|i18n):\s*'([a-z][A-Za-z0-9]*\.[A-Za-z0-9_.]+)'/)
            .forEach(function (key) { used.push(key); });
          allMatches(source.text, /\btoast\(\s*'[a-z]+',\s*'([a-z][A-Za-z0-9]*\.[A-Za-z0-9_.]+)'/)
            .forEach(function (key) { used.push(key); });
        });
        // Keys written as prefixes that a loop completes ('play.hint.' + reason) are not literals: skipped here.
        used = unique(used).filter(function (key) { return key.charAt(key.length - 1) !== '.'; });
        expect(used.length).toBeGreaterThan(0);
        checkBoth('keys used by js/ui', used);
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
