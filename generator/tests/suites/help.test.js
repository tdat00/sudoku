// Help and tour (task T-7.6): everything in js/ui/help.js that runs without a DOM, plus the documentation. The
// dialog and the tour themselves are DOM code and are covered by the browser run of the task; what is checked
// here is what keeps them honest: every registered variant has a help entry (a variant added later makes this
// suite fail until it has one), the texts exist in both languages, the ladder follows the technique registry,
// the tour decides correctly with any storage, and README.md is accurate (every variant, URL parameter, script,
// link, command and API name it mentions exists, and its two worked examples run).
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var H = SG.help;
  var NODE = SG.test.node;

  function ready() {
    if (!H || !SG.i18n || !SG.variants || !SG.difficulty) SG.test.skip('SG.help is not loaded here');
  }

  function needNode() {
    ready();
    if (!NODE) SG.test.skip('needs the file system (Node only)');
  }

  function packs() {
    SG.i18n.mergeFragments();
    return SG.locales;
  }

  function missingIn(code, keys) {
    var pack = packs()[code];
    return keys.filter(function (key) { return !Object.prototype.hasOwnProperty.call(pack, key); });
  }

  function placeholders(text) {
    var found = [];
    String(text).replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, function (all, name) { found.push(name); return all; });
    return found.sort();
  }

  function helpFragments() {
    return (SG.localeFragments || []).filter(function (fragment) {
      return Object.keys(fragment.en || {}).some(function (key) { return /^help\./.test(key); });
    });
  }

  function readText(rel) {
    return NODE.fs.readFileSync(NODE.path.join(NODE.root, rel), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  }

  function exists(rel) {
    return NODE.fs.existsSync(NODE.path.join(NODE.root, rel));
  }

  var FAKE = {
    id: 'fake99', i18nKey: 'variant.fake99', group: 'classic', digits: 9, difficultySupport: ['easy'],
    symbolModes: ['digits'], options: []
  };

  // ---------------------------------------------------------------------------------------------
  // 1. The variant help registry
  // ---------------------------------------------------------------------------------------------

  describe('help: the variant registry', function () {
    it('has a hand-written entry for every registered variant', function () {
      ready();
      var list = H.entries();
      expect(list.length).toBe(SG.variants.list().length);
      expect(list.map(function (e) { return e.id; })).toEqual(SG.variants.list().map(function (d) { return d.id; }));
      expect(list.filter(function (e) { return e.generic; }).map(function (e) { return e.id; })).toEqual([]);
    });

    it('notices a variant without a help entry (an injected list with a fake variant)', function () {
      ready();
      var withFake = H.entries(SG.variants.list().concat([FAKE]));
      var generic = withFake.filter(function (e) { return e.generic; });
      expect(generic.map(function (e) { return e.id; })).toEqual(['fake99']);
      expect(generic[0].rulesKey).toBeNull();
      expect(withFake.length).toBe(SG.variants.list().length + 1);
    });

    it('sees a variant that is registered later, as a generic entry until its help is written', function () {
      ready();
      var def = {
        id: 'helpProbe', i18nKey: 'variant.helpProbe', group: 'classic', digits: 4, difficultySupport: ['easy'],
        defaultSymbolMode: 'digits', symbolModes: ['digits'], options: [],
        build: function () { return SG.variants.get('classic4').build({}, null); }
      };
      SG.variants.register(def);
      try {
        var generic = H.entries().filter(function (e) { return e.generic; });
        expect(generic.map(function (e) { return e.id; })).toEqual(['helpProbe']);
      } finally {
        SG.variants.unregister('helpProbe');
      }
      expect(H.entries().filter(function (e) { return e.generic; })).toEqual([]);
    });

    it('survives an odd definition without throwing', function () {
      ready();
      var odd = H.entries([{ id: 'odd' }, { id: 'odd2', options: 'no' }]);
      expect(odd.length).toBe(2);
      expect(odd[0].generic).toBe(true);
      expect(odd[0].options).toEqual([]);
    });

    it('has every key of every entry in both language packs', function () {
      ready();
      H.entries().forEach(function (entry) {
        expect(entry.keys.length).toBeGreaterThan(5);
        expect(missingIn('en', entry.keys)).toEqual([]);
        expect(missingIn('vi', entry.keys)).toEqual([]);
      });
    });

    it('follows the registry: options, levels, symbol sets and group are read, not copied', function () {
      ready();
      H.entries().forEach(function (entry) {
        var def = SG.variants.get(entry.id);
        expect(entry.options.map(function (o) { return o.id; })).toEqual(
          SG.variants.optionsOf(def).map(function (o) { return o.id; }));
        expect(entry.levels).toEqual(def.difficultySupport);
        expect(entry.symbolModes).toEqual(def.symbolModes);
        expect(entry.digits).toBe(def.digits);
        expect(entry.groupKey).toBe('group.' + def.group);
        entry.options.forEach(function (o) {
          expect(entry.keys.indexOf(o.labelKey)).toBeGreaterThan(-1);
        });
      });
    });

    it('draws a picture of every registered variant', function () {
      ready();
      if (!SG.boardView) SG.test.skip('SG.boardView is not loaded here');
      H.entries().forEach(function (entry) {
        var art = H.illustration(entry.id);
        expect(art).toBeTruthy();
        expect(art.viewBox).toBe('0 0 ' + art.width + ' ' + art.height);
        expect(art.markup).toContain('layer-cells');
        var rects = art.markup.split('<rect').length - 1;
        expect(rects).toBeGreaterThan(art.cells - 1);
        expect(rects).toBeLessThan(art.cells + 10);
      });
      expect(H.illustration('noSuchVariant')).toBeNull();
    });

    it('shows what is special: cages for Killer, signs for Greater-Than, the key word for Wordoku', function () {
      ready();
      if (!SG.boardView) SG.test.skip('SG.boardView is not loaded here');
      var killer = H.illustration('killer');
      expect(killer.markup).toContain('cage-sum');
      expect(killer.width).toBeLessThan(H.illustration('classic9').width);
      expect(H.illustration('greaterThan').markup).toContain('class="sign"');
      var word = H.illustration('wordoku').markup;
      'SUNFLOWER'.split('').forEach(function (letter) {
        expect(word).toContain('>' + letter + '<');
      });
      expect(H.illustration('classic4').cells).toBe(16);
      expect(H.illustration('samurai').cells).toBe(369);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // 2. Difficulty ladder, steps, shortcuts, controls
  // ---------------------------------------------------------------------------------------------

  describe('help: the ladder, the steps and the shortcuts', function () {
    it('lists the six levels in order, each adding its technique group', function () {
      ready();
      var lad = H.ladder();
      expect(lad.levels.map(function (r) { return r.level; })).toEqual(SG.difficulty.LEVELS);
      lad.levels.forEach(function (row, i) {
        expect(row.group).toBe(SG.difficulty.BASE_GROUPS[i]);
        expect(row.techniques.length).toBeGreaterThan(0);
        row.techniques.forEach(function (x) {
          expect(x.group).toBe(row.group);
          expect(x.variants).toEqual([]);
        });
        var orders = row.techniques.map(function (x) { return x.order; });
        expect(orders).toEqual(orders.slice().sort(function (a, b) { return a - b; }));
        expect(row.minClues).toBeGreaterThan(0);
        expect(row.maxClues).toBeGreaterThan(row.minClues - 1);
        if (i > 0) expect(row.maxClues).toBeLessThan(lad.levels[i - 1].maxClues + 1);
        if (i < 5) expect(row.maxScore).toBe(lad.levels[i + 1].minScore);
      });
      expect(lad.levels[5].maxScore).toBe(Infinity);
      expect(lad.levels[0].minScore).toBe(0);
    });

    it('lists every registered technique exactly once: by level, or under the variant it belongs to', function () {
      ready();
      var lad = H.ladder();
      var listed = [];
      lad.levels.forEach(function (row) { row.techniques.forEach(function (x) { listed.push(x.id); }); });
      lad.variantGroups.forEach(function (g) {
        g.techniques.forEach(function (x) {
          listed.push(x.id);
          expect(x.variants.length).toBeGreaterThan(0);
          x.variants.forEach(function (id) { expect(SG.variants.has(id)).toBe(true); });
        });
      });
      var registered = SG.techniques.list().map(function (t) { return t.id; });
      expect(listed.slice().sort()).toEqual(registered.slice().sort());
      expect(lad.variantGroups.map(function (g) { return g.group; }).sort()).toEqual(['cage', 'ineq']);
    });

    it('lists a technique that is registered later, at the level of its group', function () {
      ready();
      SG.techniques.register({
        id: 'helpProbeTechnique', group: 'subset', baseCost: 10, order: 61, i18nKey: 'technique.helpProbeTechnique',
        find: function () { return null; }
      });
      try {
        var lad = H.ladder();
        var medium = lad.levels.filter(function (r) { return r.level === 'medium'; })[0];
        expect(medium.techniques.map(function (x) { return x.id; })).toContain('helpProbeTechnique');
      } finally {
        SG.techniques.unregister('helpProbeTechnique');
      }
    });

    it('has the seven generation steps, in the pipeline order, with their texts', function () {
      ready();
      var list = H.steps();
      expect(list.map(function (s) { return s.id; })).toEqual(SG.events.STEP_IDS);
      expect(list.length).toBe(7);
      list.forEach(function (s) {
        var keys = [s.nameKey, s.whatKey, s.whyKey];
        expect(missingIn('en', keys)).toEqual([]);
        expect(missingIn('vi', keys)).toEqual([]);
      });
    });

    it('describes the shortcuts: keycaps for every row, a text in both languages', function () {
      ready();
      var ids = [];
      H.shortcuts().forEach(function (group) {
        expect(group.rows.length).toBeGreaterThan(0);
        expect(missingIn('en', [group.titleKey])).toEqual([]);
        if (group.noteKey !== null) expect(missingIn('vi', [group.noteKey])).toEqual([]);
        group.rows.forEach(function (row) {
          ids.push(row.id);
          expect(row.keys.length).toBeGreaterThan(0);
          row.keys.forEach(function (combo) {
            expect(combo.length).toBeGreaterThan(0);
            combo.forEach(function (cap) { expect(typeof cap === 'string' && cap !== '').toBe(true); });
          });
          expect(missingIn('en', [row.textKey])).toEqual([]);
          expect(missingIn('vi', [row.textKey])).toEqual([]);
        });
      });
      expect(ids.filter(function (id, i) { return ids.indexOf(id) !== i; })).toEqual([]);
      var flat = JSON.stringify(H.shortcuts());
      ['Esc', 'Tab', 'Ctrl', 'Home', 'PageUp'].forEach(function (cap) {
        expect(flat).toContain('"' + cap + '"');
      });
      // The generator has no play mode: no digit entry, notes, hint or undo keys.
      ['play', 'digit', 'notes', 'hint', 'undo', 'redo'].forEach(function (id) {
        expect(ids).not.toContain(id);
      });
    });

    it('reuses the labels and hints of the controls', function () {
      ready();
      H.controlsGlossary().forEach(function (c) {
        expect(missingIn('en', [c.labelKey, c.textKey])).toEqual([]);
        expect(missingIn('vi', [c.labelKey, c.textKey])).toEqual([]);
      });
      expect(H.controlsGlossary().length).toBeGreaterThan(10);
    });

    it('needs only keys that exist in both packs (own and foreign)', function () {
      ready();
      var keys = H.requiredKeys();
      expect(keys).toContain('technique.xWing');
      expect(keys).toContain('help.title');
      expect(keys.length).toBeGreaterThan(300);
      expect(missingIn('en', keys)).toEqual([]);
      expect(missingIn('vi', keys)).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // 3. Locale fragment
  // ---------------------------------------------------------------------------------------------

  describe('help: the strings', function () {
    var ARGS = {
      'help.variants.intro': ['count'],
      'help.variant.facts': ['digits', 'levels', 'modes'],
      'help.variant.wordoku.figure': ['word'],
      'help.difficulty.score': ['bonus', 'multiplier'],
      'help.difficulty.scoreOpen': ['min'],
      'help.difficulty.level.adds': ['group'],
      'help.difficulty.variant.for': ['variants'],
      'help.difficulty.closest.text': ['badge', 'retry'],
      'help.generation.worker': ['main', 'worker'],
      'help.tour.progress': ['n', 'total']
    };

    it('has the same keys in English and Vietnamese, none empty, the same placeholders', function () {
      ready();
      var fragments = helpFragments();
      expect(fragments.length).toBe(1);
      var f = fragments[0];
      expect(Object.keys(f.en).sort()).toEqual(Object.keys(f.vi).sort());
      Object.keys(f.en).forEach(function (key) {
        expect(/^help\.[A-Za-z0-9.]+$/.test(key)).toBe(true);
        expect(typeof f.en[key] === 'string' && f.en[key].trim() !== '').toBe(true);
        expect(typeof f.vi[key] === 'string' && f.vi[key].trim() !== '').toBe(true);
        expect(placeholders(f.vi[key])).toEqual(placeholders(f.en[key]));
        expect(placeholders(f.en[key])).toEqual(ARGS[key] || []);
      });
    });

    it('owns every key it uses, defines no key of another file and leaves no key unused', function () {
      ready();
      packs();
      var own = Object.keys(helpFragments()[0].en).sort();
      var needed = H.requiredKeys().filter(function (key) { return /^help\./.test(key); });
      expect(own).toEqual(needed);
      expect(SG.i18n.conflicts.filter(function (c) { return /^help\./.test(c.key); })).toEqual([]);
    });

    it('writes natural Vietnamese: long texts carry diacritics and differ from the English', function () {
      ready();
      var f = helpFragments()[0];
      Object.keys(f.vi).forEach(function (key) {
        var text = f.vi[key].replace(/\{[^}]*\}/g, '');
        if (text.trim().split(/\s+/).length >= 4) {
          expect(/[^\x00-\x7f]/.test(text)).toBe(true);
          expect(f.vi[key]).not.toBe(f.en[key]);
        }
      });
    });

    it('renders every text in both languages without a placeholder left over', function () {
      ready();
      var sample = {
        count: 15, digits: 9, levels: 'Easy', modes: 'Digits', word: 'SUNFLOWER', multiplier: '1.5', bonus: '0.6',
        min: '1,500', group: 'Singles', variants: 'Killer', badge: 'Closest', retry: 'Retry', main: 'Main',
        worker: 'Worker', n: 1, total: 4
      };
      var before = SG.i18n.current;
      try {
        ['en', 'vi'].forEach(function (code) {
          SG.i18n.setLocale(code);
          Object.keys(helpFragments()[0].en).forEach(function (key) {
            var text = SG.i18n.t(key, sample);
            expect(text).not.toBe(key);
            expect(/[{}]/.test(text)).toBe(false);
          });
        });
      } finally {
        SG.i18n.setLocale(before);
      }
    });
  });

  // ---------------------------------------------------------------------------------------------
  // 4. The tour
  // ---------------------------------------------------------------------------------------------

  describe('help: the first-time tour', function () {
    function storageWith(value) {
      return { getItem: function (key) { return key === H.TOUR_KEY ? value : null; } };
    }

    it('has three or four steps over elements that exist in index.html', function () {
      needNode();
      var steps = H.tourSteps();
      expect(steps.length).toBeGreaterThan(2);
      expect(steps.length).toBeLessThan(5);
      var html = readText('index.html');
      var wanted = {};
      steps.forEach(function (step) {
        expect(step.targets.length).toBeGreaterThan(0);
        step.targets.forEach(function (alternative) {
          alternative.forEach(function (selector) {
            expect(/^#[A-Za-z][\w-]*$/.test(selector)).toBe(true);
            wanted[selector.slice(1)] = true;
            expect(html).toContain('id="' + selector.slice(1) + '"');
          });
        });
        expect(missingIn('en', [step.titleKey, step.textKey])).toEqual([]);
        expect(missingIn('vi', [step.titleKey, step.textKey])).toEqual([]);
      });
      ['controls-root', 'btn-generate', 'board-root', 'player-root', 'steps-root'].forEach(function (id) {
        expect(wanted[id]).toBe(true);
      });
    });

    it('is shown to a first-time visitor and never twice when the storage works', function () {
      ready();
      expect(H.TOUR_KEY).toBe('sg.tour.v1');
      expect(H.shouldShowTour(storageWith(null), '')).toBe(true);
      expect(H.shouldShowTour(storageWith(undefined), '?v=killer')).toBe(true);
      expect(H.shouldShowTour(storageWith(''), '')).toBe(true);
      expect(H.shouldShowTour(storageWith('1'), '')).toBe(false);
      expect(H.shouldShowTour(storageWith('seen'), '?lang=vi')).toBe(false);
    });

    it('is shown once per page load when the storage is blocked, missing or throws', function () {
      ready();
      var throwing = { getItem: function () { throw new Error('SecurityError'); } };
      expect(H.shouldShowTour(throwing, '')).toBe(true);
      expect(H.shouldShowTour(null, '')).toBe(true);
      expect(H.shouldShowTour(undefined, '')).toBe(true);
      expect(H.shouldShowTour({}, '')).toBe(true);
      expect(H.shouldShowTour(throwing, '?auto=1')).toBe(false);
    });

    it('is never shown for an automated or shared link (auto=1), whatever the storage says', function () {
      ready();
      var fresh = storageWith(null);
      ['?auto=1', '?v=classic9&d=hard&auto=1', '?auto=true', '?auto=ON', '?seed=1&auto=yes&lang=vi',
        'file:///x/index.html?auto=1#top', 'https://example.org/app/?v=killer&auto=1'].forEach(function (url) {
        expect(H.shouldShowTour(fresh, url)).toBe(false);
      });
      ['?auto=0', '?auto=false', '?auto=', '?automatic=1', '?x=auto=1', '', '?v=killer#auto=1',
        'https://example.org/auto=1'].forEach(function (url) {
        expect(H.shouldShowTour(fresh, url)).toBe(true);
      });
      expect(H.shouldShowTour(fresh, { search: '?auto=1' })).toBe(false);
      expect(H.shouldShowTour(fresh, { search: '' })).toBe(true);
      expect(H.shouldShowTour(fresh)).toBe(true);
      expect(H.shouldShowTour(fresh, 42)).toBe(true);
    });

    it('puts the card beside the target, inside the viewport, preferring the right side', function () {
      ready();
      var card = { width: 352, height: 220 };
      var desktop = { width: 1440, height: 900 };
      var left = H.placeCard({ left: 10, top: 45, right: 302, bottom: 900 }, card, desktop);
      expect(left.side).toBe('right');
      expect(left.left).toBeGreaterThan(301);
      var beside = H.placeCard({ left: 600, top: 20, right: 900, bottom: 80 }, card, { width: 1000, height: 900 });
      expect(beside.side).toBe('left');
      var below = H.placeCard({ left: 20, top: 20, right: 980, bottom: 80 }, card, { width: 1000, height: 900 });
      expect(below.side).toBe('bottom');
      expect(below.top).toBeGreaterThan(80);
      var onTheEdge = H.placeCard({ left: 1100, top: 100, right: 1430, bottom: 300 }, card, desktop);
      expect(onTheEdge.side).toBe('left');
      expect(onTheEdge.left + card.width).toBeLessThan(1101);
      [{ left: 0, top: 0, right: 1440, bottom: 900 }, { left: 5, top: 5, right: 40, bottom: 40 },
        { left: 1400, top: 860, right: 1440, bottom: 900 }, null].forEach(function (rect) {
        var at = H.placeCard(rect, card, desktop);
        expect(at.left).toBeGreaterThan(11);
        expect(at.top).toBeGreaterThan(11);
        expect(at.left + card.width).toBeLessThan(desktop.width - 11);
        expect(at.top + card.height).toBeLessThan(desktop.height - 11);
      });
    });

    it('goes above a bar at the bottom of a phone, and covers the least of a target that fills the screen', function () {
      ready();
      var phone = { width: 375, height: 667 };
      var card = { width: 351, height: 230 };
      var bar = H.placeCard({ left: 0, top: 614, right: 375, bottom: 667 }, card, phone);
      expect(bar.side).toBe('top');
      expect(bar.top + card.height).toBeLessThan(614);
      var big = H.placeCard({ left: 0, top: 0, right: 375, bottom: 400 }, card, phone);
      expect(big.side).toBe('bottom');
      var centre = H.placeCard(null, card, phone);
      expect(centre.side).toBe('center');
    });

    it('joins rectangles', function () {
      ready();
      var u = H.unionRect([{ left: 10, top: 20, right: 30, bottom: 40 }, { left: 5, top: 25, right: 50, bottom: 35 }]);
      expect(u.left).toBe(5);
      expect(u.top).toBe(20);
      expect(u.right).toBe(50);
      expect(u.bottom).toBe(40);
      expect(u.width).toBe(45);
      expect(u.height).toBe(20);
      expect(H.unionRect([])).toBeNull();
      expect(H.unionRect([{ left: 0, top: 0, right: 0, bottom: 10 }, null])).toBeNull();
    });
  });

  describe('help: the module hook', function () {
    function fakeApp() {
      var app = { subscribed: [], off: 0, state: { auto: false } };
      app.on = function (name, fn) {
        app.subscribed.push({ name: name, fn: fn });
        return function () { app.off++; };
      };
      app.getStore = function () { return { get: function () { return app.state; } }; };
      return app;
    }

    it('subscribes once to the action event, whatever the number of init calls', function () {
      ready();
      var app = fakeApp();
      try {
        expect(H.init(app)).toBe(true);
        expect(H.init(app)).toBe(true);
        expect(app.subscribed.map(function (s) { return s.name; })).toEqual(['action']);
        app.subscribed[0].fn({ id: 'help' });
        app.subscribed[0].fn({ id: 'export' });
        app.subscribed[0].fn(null);
        expect(H.isTourActive()).toBe(false);
      } finally {
        H.destroy();
      }
      expect(app.off).toBe(1);
    });

    it('refuses something that is not the app, and does nothing without a DOM', function () {
      ready();
      expect(H.init(null)).toBe(false);
      expect(H.init({})).toBe(false);
      expect(H.open()).toBeNull();
      expect(H.startTour()).toBe(false);
      expect(H.stopTour('skip')).toBe(false);
      H.close();
    });
  });

  // ---------------------------------------------------------------------------------------------
  // 5. README.md and docs/
  // ---------------------------------------------------------------------------------------------

  describe('help: README.md', function () {
    var LEVELS = ['veryEasy', 'easy', 'medium', 'hard', 'expert', 'evil'];

    function readme() {
      return readText('README.md');
    }

    function levelRange(levels) {
      var first = LEVELS.indexOf(levels[0]);
      var last = LEVELS.indexOf(levels[levels.length - 1]);
      return first === last ? levels[0] : levels[0] + '\u2013' + levels[levels.length - 1];
    }

    function withoutFences(text) {
      return text.replace(/```[\s\S]*?```/g, '');
    }

    function slug(heading) {
      return heading.replace(/`/g, '').toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s+/g, '-');
    }

    function anchors(text) {
      var found = {};
      withoutFences(text).split('\n').forEach(function (line) {
        var m = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
        if (m) found[slug(m[1])] = true;
      });
      (text.match(/<a (?:id|name)="([^"]+)"/g) || []).forEach(function (tag) {
        found[/"([^"]+)"/.exec(tag)[1]] = true;
      });
      return found;
    }

    function fencedBlocks(text) {
      var out = [];
      text.replace(/```(\w*)\n([\s\S]*?)```/g, function (all, lang, code) {
        out.push({ lang: lang, code: code });
        return all;
      });
      return out;
    }

    function sandbox() {
      var runner = readText('tests/node-runner.js');
      var list = /const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner)[1].split('\n').map(function (line) {
        var m = /'([^']+)'/.exec(line);
        return m ? m[1] : null;
      }).filter(Boolean);
      var ctx = NODE.vm.createContext({ console: console });
      list.forEach(function (rel) {
        if (/^js\/(ui|worker)\//.test(rel) || !exists(rel)) return;
        NODE.vm.runInContext(readText(rel), ctx, { filename: rel });
      });
      return ctx;
    }

    function evaluate(ctx, code) {
      return NODE.vm.runInContext(code, ctx);
    }

    it('exists and has an English half and a Vietnamese half with a menu', function () {
      needNode();
      var text = readme();
      expect(text).toContain('<a id="english"></a>');
      expect(text).toContain('<a id="tieng-viet"></a>');
      expect(text.indexOf('# English')).toBeLessThan(text.indexOf('# Ti\u1ebfng Vi\u1ec7t'));
      expect(text).toContain('[English](#english)');
      expect(text).toContain('[Ti\u1ebfng Vi\u1ec7t](#tieng-viet)');
    });

    it('mentions every registered variant id, with its digits, cell count and levels right', function () {
      needNode();
      var text = readme();
      var rows = {};
      text.split('\n').forEach(function (line) {
        var m = /^\|\s*`(\w+)`\s*\|[^|]*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*$/.exec(line);
        if (m) rows[m[1]] = { digits: Number(m[2]), cells: Number(m[3]), levels: m[4] };
      });
      SG.variants.list().forEach(function (def) {
        expect(text).toContain('`' + def.id + '`');
        var row = rows[def.id];
        expect(row).toBeTruthy();
        var model = def.build(SG.variants.defaultOptions(def.id), SG.rng.create(1).fork('model'));
        expect(row.digits).toBe(def.digits);
        expect(row.cells).toBe(model.cellCount);
        expect(row.levels).toBe(levelRange(def.difficultySupport));
      });
      expect(Object.keys(rows).length).toBe(SG.variants.list().length);
    });

    it('documents every URL parameter the page can write', function () {
      needNode();
      var d = SG.store.defaults();
      var all = Object.assign({}, d, {
        variantId: 'wordoku', difficulty: 'hard', seed: '42', symmetry: 'mirrorH', symbolMode: 'digits',
        digOrder: 'snake', maxAttempts: 3, trace: 'off', showSolution: true, lang: 'vi', speed: 'manual',
        auto: true, variantOptions: { placement: 'row', line: 3 }
      });
      var params = Object.keys(SG.store.toUrlParams(all, { full: true }));
      expect(params).toContain('order');
      expect(params).toContain('attempts');
      expect(params).toContain('trace');
      expect(params).toContain('sol');
      expect(params).toContain('o.placement');
      var text = readme();
      params.forEach(function (name) {
        var shown = /^o\./.test(name) ? 'o.<id>' : name;
        expect(text).toContain('| `' + shown + '` |');
      });
    });

    it('lists every script of index.html, and every one of them is on disk', function () {
      needNode();
      var html = readText('index.html');
      var text = readme();
      var scripts = [];
      html.replace(/<script\s+src="([^"]+)"/g, function (all, src) { scripts.push(src); return all; });
      expect(scripts.length).toBeGreaterThan(50);
      var missing = scripts.filter(function (src) { return !exists(src); });
      expect(missing).toEqual([]);
      var unmentioned = scripts.filter(function (src) {
        return text.indexOf(NODE.path.posix.basename(src)) === -1;
      });
      expect(unmentioned).toEqual([]);
      ['help.js', 'help.css', 'gen.worker.js', 'node-runner.js'].forEach(function (name) {
        expect(text).toContain(name);
      });
    });

    it('links only to places that exist: files, images (small PNGs) and its own headings', function () {
      needNode();
      var text = readme();
      var found = anchors(text);
      var links = [];
      withoutFences(text).replace(/!?\[[^\]]*\]\(([^)\s]+)\)/g, function (all, target) {
        links.push({ image: all.charAt(0) === '!', target: target });
        return all;
      });
      expect(links.length).toBeGreaterThan(20);
      var images = 0;
      links.forEach(function (link) {
        var target = link.target;
        if (/^https?:/.test(target)) return;
        if (target.charAt(0) === '#') {
          expect(found[decodeURIComponent(target.slice(1))]).toBe(true);
          return;
        }
        var file = target.split('#')[0];
        expect(exists(file)).toBe(true);
        if (link.image) {
          images++;
          expect(/\.png$/.test(file)).toBe(true);
          var bytes = NODE.fs.readFileSync(NODE.path.join(NODE.root, file));
          expect(bytes.length).toBeLessThan(300 * 1024);
          expect(bytes.slice(1, 4).toString('ascii')).toBe('PNG');
        }
      });
      expect(images).toBeGreaterThan(2);
      expect(exists('docs')).toBe(true);
    });

    it('uses only real commands: the scripts exist and know every option it shows', function () {
      needNode();
      var commands = 0;
      fencedBlocks(readme()).forEach(function (block) {
        block.code.split('\n').forEach(function (line) {
          var m = /\bnode\s+(tests\/[\w.-]+\.js)([^#\n]*)/.exec(line);
          if (!m) return;
          commands++;
          expect(exists(m[1])).toBe(true);
          var source = readText(m[1]);
          (m[2].match(/--[a-z][\w-]*/g) || []).forEach(function (flag) {
            expect(source).toContain(flag);
          });
        });
      });
      expect(commands).toBeGreaterThan(7);
      expect(readme()).toContain('SG_DEEP');
      expect(readText('tests/suites/multigrid.test.js') + readText('tests/suites/mega.test.js')).toContain('SG_DEEP');
      expect(readme()).toContain('python -m http.server');
    });

    it('names only APIs that exist (every SG.x.y it mentions resolves)', function () {
      needNode();
      var names = {};
      readme().replace(/\bSG\.[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9_]*)*/g, function (name) {
        names[name] = true;
        return name;
      });
      var allowed = { 'SG.something': true };
      var unresolved = Object.keys(names).filter(function (name) {
        if (allowed[name]) return false;
        var value = SG;
        var parts = name.split('.').slice(1);
        for (var i = 0; i < parts.length; i++) {
          if (value === null || value === undefined || !(parts[i] in Object(value))) return true;
          value = value[parts[i]];
        }
        return false;
      });
      expect(unresolved).toEqual([]);
      ['SG.variants.register', 'SG.pipeline.run', 'SG.events.VOCABULARY', 'SG.workerClient.generate',
        'SG.techniques.register', 'SG.difficulty.BASE_GROUPS', 'SG.localeFragments', 'SG.app'].forEach(function (name) {
        expect(names[name]).toBe(true);
      });
    });

    it('has a worked variant example that registers, validates and generates', function () {
      needNode();
      var block = fencedBlocks(readme()).filter(function (b) {
        return b.code.indexOf('// js/variants/disjoint.js') === 0;
      })[0];
      expect(block).toBeTruthy();
      var ctx = sandbox();
      evaluate(ctx, block.code);
      var report = JSON.parse(evaluate(ctx, '(function () {' +
        'var def = SG.variants.get("disjoint9");' +
        'var model = def.build({}, SG.rng.create(1));' +
        'var check = SG.model.validate(model);' +
        'var run = SG.pipeline.run({ variantId: "disjoint9", difficulty: "easy", seed: 3, trace: "off" }, null);' +
        'var givens = 0; for (var i = 0; i < run.givens.length; i++) if (run.givens[i] > 0) givens++;' +
        'var last = SG.localeFragments[SG.localeFragments.length - 1];' +
        'return JSON.stringify({ ok: check.ok, units: model.units.length, level: run.rating.level,' +
        ' solutions: SG.dfs.countSolutions(run.model, run.givens, 2), givens: givens,' +
        ' en: Object.keys(last.en), vi: Object.keys(last.vi) });' +
        '})()'));
      expect(report.ok).toBe(true);
      expect(report.units).toBe(36);
      expect(report.level).toBe('easy');
      expect(report.solutions).toBe(1);
      expect(report.givens).toBeGreaterThan(20);
      expect(report.en).toEqual(['variant.disjoint9', 'variant.disjoint9.desc']);
      expect(report.vi).toEqual(report.en);
    });

    it('has a worked technique example that registers and solves soundly', function () {
      needNode();
      var block = fencedBlocks(readme()).filter(function (b) {
        return b.code.indexOf('// js/core/tech-fullhouse.js') === 0;
      })[0];
      expect(block).toBeTruthy();
      var ctx = sandbox();
      evaluate(ctx, 'var puzzle = SG.pipeline.run({ variantId: "classic9", difficulty: "veryEasy", seed: 3,' +
        ' trace: "off" }, null);');
      evaluate(ctx, block.code);
      var report = JSON.parse(evaluate(ctx, '(function () {' +
        'var report = SG.logicalSolver.solve(puzzle.model, puzzle.givens, { collectSteps: true });' +
        'var same = true;' +
        'for (var i = 0; i < puzzle.solution.length; i++) if (report.state.value[i] !== puzzle.solution[i]) same = false;' +
        'var first = report.steps.filter(function (s) { return s.technique === "fullHouse"; })[0];' +
        'return JSON.stringify({ solved: report.solved, same: same, used: report.techniqueCounts.fullHouse || 0,' +
        ' registered: SG.techniques.has("fullHouse"), key: first ? first.i18nKey : null,' +
        ' args: first ? Object.keys(first.i18nArgs) : [] });' +
        '})()'));
      expect(report.registered).toBe(true);
      expect(report.solved).toBe(true);
      expect(report.same).toBe(true);
      expect(report.used).toBeGreaterThan(0);
      expect(report.key).toBe('technique.fullHouse.step');
      expect(report.args.sort()).toEqual(['cell', 'digit', 'unit']);
    });
  });
})();
