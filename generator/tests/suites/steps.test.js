// Steps panel and explanation card (task T-4.5, reworked): the list of the replay steps (js/ui/step-view.js)
// on a small fake DOM, the chart model the result panel uses, and the view model of the explanation card
// (js/ui/explain.js), run against real results and traces of the pipeline.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var V = SG.stepView;
  var X = SG.explainCard;
  var NODE = SG.test.node;

  var STEP_IDS = ['configure', 'buildModel', 'fullGrid', 'extraStructure', 'dig', 'rate', 'tune'];

  var cache = {};

  function result(variantId, difficulty, seed) {
    var key = variantId + '/' + difficulty + '/' + seed;
    if (!cache[key]) {
      cache[key] = SG.pipeline.run({ variantId: variantId, difficulty: difficulty, seed: seed, trace: 'off' }, null);
    }
    return cache[key];
  }

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function packHas(pack, key) {
    return hasOwn(pack, key) || hasOwn(pack, key + '_other') || hasOwn(pack, key + '_one');
  }

  function inLocale(code, fn) {
    SG.i18n.setLocale(code);
    try {
      return fn();
    } finally {
      SG.i18n.setLocale('en');
    }
  }

  // ---------------------------------------------------------------------------------------------
  // A small fake DOM: elements, text, classes, attributes, listeners, '#id' lookups and `closest`
  // ---------------------------------------------------------------------------------------------

  function createFakeDocument() {
    var doc = {};

    function El(tag) {
      var el = this;
      this.tagName = String(tag).toUpperCase();
      this.attrs = {};
      this.children = [];
      this.parentNode = null;
      this.listeners = {};
      this.hidden = false;
      this.own = '';
      this.ownerDocument = doc;
      this.classList = {
        toggle: function (cls, on) {
          var list = el.classes();
          var has = list.indexOf(cls) !== -1;
          var want = on === undefined ? !has : Boolean(on);
          if (want && !has) list.push(cls);
          if (!want && has) list.splice(list.indexOf(cls), 1);
          el.attrs['class'] = list.join(' ');
          return want;
        },
        contains: function (cls) { return el.classes().indexOf(cls) !== -1; }
      };
    }
    El.prototype.classes = function () {
      return (this.attrs['class'] || '').split(' ').filter(Boolean);
    };
    El.prototype.setAttribute = function (name, value) {
      this.attrs[name] = String(value);
      if (name === 'hidden') this.hidden = true;
    };
    El.prototype.getAttribute = function (name) {
      return hasOwn(this.attrs, name) ? this.attrs[name] : null;
    };
    El.prototype.removeAttribute = function (name) {
      delete this.attrs[name];
      if (name === 'hidden') this.hidden = false;
    };
    El.prototype.appendChild = function (child) {
      if (child.parentNode) child.parentNode.removeChild(child);
      child.parentNode = this;
      this.children.push(child);
      return child;
    };
    El.prototype.insertBefore = function (child, ref) {
      if (child.parentNode) child.parentNode.removeChild(child);
      var at = ref ? this.children.indexOf(ref) : -1;
      child.parentNode = this;
      if (at === -1) this.children.push(child);
      else this.children.splice(at, 0, child);
      return child;
    };
    El.prototype.removeChild = function (child) {
      this.children = this.children.filter(function (c) { return c !== child; });
      child.parentNode = null;
      return child;
    };
    Object.defineProperty(El.prototype, 'firstChild', { get: function () { return this.children[0] || null; } });
    Object.defineProperty(El.prototype, 'nextSibling', {
      get: function () {
        if (!this.parentNode) return null;
        var list = this.parentNode.children;
        return list[list.indexOf(this) + 1] || null;
      }
    });
    Object.defineProperty(El.prototype, 'textContent', {
      get: function () { return this.own + this.children.map(function (c) { return c.textContent; }).join(''); },
      set: function (value) {
        this.children.forEach(function (c) { c.parentNode = null; });
        this.children = [];
        this.own = String(value);
      }
    });
    El.prototype.contains = function (node) {
      for (var n = node; n; n = n.parentNode) if (n === this) return true;
      return false;
    };
    El.prototype.closest = function (selector) {
      var attr = /^\[([\w-]+)\]$/.exec(selector);
      for (var n = this; n && n.getAttribute; n = n.parentNode) {
        if (attr && n.getAttribute(attr[1]) !== null) return n;
      }
      return null;
    };
    El.prototype.querySelector = function (selector) {
      var id = selector.charAt(0) === '#' ? selector.slice(1) : null;
      var found = null;
      (function walk(node) {
        node.children.forEach(function (c) {
          if (found || !c.attrs) return;
          if (id !== null && c.attrs.id === id) found = c;
          else walk(c);
        });
      })(this);
      return found;
    };
    El.prototype.addEventListener = function (type, fn) {
      (this.listeners[type] = this.listeners[type] || []).push(fn);
    };
    El.prototype.removeEventListener = function (type, fn) {
      this.listeners[type] = (this.listeners[type] || []).filter(function (f) { return f !== fn; });
    };
    /** Fires an event that bubbles from this element up to the root. */
    El.prototype.fire = function (type) {
      var event = { type: type, target: this };
      for (var n = this; n; n = n.parentNode) {
        (n.listeners[type] || []).slice().forEach(function (fn) { fn(event); });
      }
    };

    function Text(text) {
      this.own = String(text);
      this.children = [];
      this.parentNode = null;
    }
    Object.defineProperty(Text.prototype, 'textContent', { get: function () { return this.own; } });

    doc.createElement = function (tag) { return new El(tag); };
    doc.createTextNode = function (text) { return new Text(text); };
    doc.findAll = function (start, pred, out) {
      out = out || [];
      if (start.attrs && pred(start)) out.push(start);
      (start.children || []).forEach(function (c) { doc.findAll(c, pred, out); });
      return out;
    };
    return doc;
  }

  function panelFixture() {
    var doc = createFakeDocument();
    var rootEl = doc.createElement('aside');
    rootEl.setAttribute('id', 'steps-root');
    var toggle = doc.createElement('button');
    toggle.setAttribute('id', 'btn-steps-toggle');
    rootEl.appendChild(toggle);
    var list = doc.createElement('ol');
    list.setAttribute('id', 'steps-list');
    rootEl.appendChild(list);
    var explain = doc.createElement('section');
    rootEl.appendChild(explain);
    var picked = [];
    var view = V.create(rootEl, { onSelect: function (p) { picked.push(p); } });
    return { doc: doc, root: rootEl, list: list, toggle: toggle, explain: explain, view: view, picked: picked };
  }

  // ---------------------------------------------------------------------------------------------
  // The list of the replay steps
  // ---------------------------------------------------------------------------------------------

  describe('stepView: the list of the replay steps', function () {
    it('lists every step with its number, title and summary, and marks none until a position is set', function () {
      var fx = panelFixture();
      var steps = SG.player.buildSteps(result('classic9', 'medium', 3)).steps;
      inLocale('en', function () {
        fx.view.setSteps(steps);
        expect(fx.list.children.length).toBe(steps.length);
        fx.list.children.forEach(function (li, i) {
          expect(li.getAttribute('data-kind')).toBe(steps[i].kind);
          expect(li.getAttribute('data-position')).toBe(String(i + 1));
          var main = li.children[0];
          expect(main.tagName).toBe('BUTTON');
          expect(main.textContent).toContain(String(i + 1));
          expect(main.textContent).toContain(SG.player.stepTitle(steps[i]));
          expect(main.textContent).toContain(SG.player.stepMeta(steps[i]));
          expect(main.getAttribute('aria-current')).toBeNull();
          expect(li.children[1].hidden).toBe(true);
        });
        expect(fx.list.children[0].textContent).toContain('Full solution');
        expect(fx.view.getPosition()).toBe(0);
      });
    });

    it('marks the current step, shows its sentence and hides the one before', function () {
      var fx = panelFixture();
      var steps = SG.player.buildSteps(result('classic9', 'medium', 3)).steps;
      inLocale('en', function () {
        fx.view.setSteps(steps);
        fx.view.setPosition(3);
        var li = fx.list.children[2];
        expect(li.classList.contains('is-current')).toBe(true);
        expect(li.children[0].getAttribute('aria-current')).toBe('step');
        expect(li.children[1].hidden).toBe(false);
        expect(li.children[1].textContent).toBe(SG.player.describeStep(steps[2]));
        fx.view.setPosition(4);
        expect(li.classList.contains('is-current')).toBe(false);
        expect(li.children[0].getAttribute('aria-current')).toBeNull();
        expect(li.children[1].hidden).toBe(true);
        expect(fx.list.children[3].classList.contains('is-current')).toBe(true);
        fx.view.setPosition(0);
        expect(fx.doc.findAll(fx.list, function (el) { return el.classList.contains('is-current'); })).toEqual([]);
        fx.view.setPosition(999);
        expect(fx.view.getPosition()).toBe(0);
      });
    });

    it('tells the app which step was picked, from a click anywhere on it', function () {
      var fx = panelFixture();
      fx.view.setSteps(SG.player.buildSteps(result('classic9', 'easy', 3)).steps);
      fx.list.children[1].children[0].fire('click');
      fx.list.children[4].children[0].children[1].children[0].fire('click');
      fx.list.fire('click');
      expect(fx.picked).toEqual([2, 5]);
    });

    it('explains the frames it uses in a legend, and only those', function () {
      var fx = panelFixture();
      var legend = fx.list.nextSibling;
      expect(legend.hidden).toBe(true);
      inLocale('en', function () {
        fx.view.setSteps(SG.player.buildSteps(result('classic9', 'medium', 3)).steps);
        var marks = legend.children.map(function (li) { return li.getAttribute('data-mark'); });
        expect(marks).toEqual(['dug', 'kept']);
        expect(legend.hidden).toBe(false);
        expect(legend.textContent).toContain('Removed in this step');
        fx.view.setSteps(SG.player.buildSteps(result('greaterThan', 'medium', 4)).steps);
        var gtMarks = legend.children.map(function (li) { return li.getAttribute('data-mark'); });
        expect(gtMarks).toContain('revealed');
        expect(gtMarks).toContain('signRemoved');
        expect(gtMarks).not.toContain('dug');
        fx.view.clear();
        expect(legend.hidden).toBe(true);
        expect(fx.list.children.length).toBe(0);
      });
    });

    it('follows the language and keeps the current step', function () {
      var fx = panelFixture();
      var steps = SG.player.buildSteps(result('killer', 'medium', 2)).steps;
      fx.view.setSteps(steps);
      fx.view.setPosition(2);
      var en = fx.list.textContent;
      inLocale('vi', function () {
        expect(fx.list.textContent).not.toBe(en);
        expect(fx.list.children[1].textContent).toContain('Các lồng');
        expect(fx.list.children[1].classList.contains('is-current')).toBe(true);
      });
      expect(fx.list.textContent).toBe(en);
    });

    it('expands and collapses the stepper of narrow screens', function () {
      var fx = panelFixture();
      fx.view.setExpanded(true);
      expect(fx.root.classList.contains('is-expanded')).toBe(true);
      expect(fx.toggle.getAttribute('aria-expanded')).toBe('true');
      fx.view.setExpanded(false);
      expect(fx.root.classList.contains('is-expanded')).toBe(false);
      expect(fx.toggle.getAttribute('aria-expanded')).toBe('false');
    });

    it('builds its list when the page has none, and takes everything away on destroy', function () {
      var doc = createFakeDocument();
      var rootEl = doc.createElement('aside');
      var view = V.create(rootEl, {});
      var list = rootEl.querySelector('#steps-list');
      expect(list).not.toBeNull();
      view.setSteps(SG.player.buildSteps(result('classic4', 'easy', 2)).steps);
      expect(list.children.length).toBeGreaterThan(2);
      view.destroy();
      expect(rootEl.children.length).toBe(0);
      expect(function () { V.create(null); }).toThrow();
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Chart model (drawn by the result panel)
  // ---------------------------------------------------------------------------------------------

  describe('stepView: chartModel', function () {
    function ids(model) {
      return model.bars.map(function (b) { return b.id; });
    }

    it('orders the bars by the technique ladder, whatever the order of the counts', function () {
      var m = V.chartModel({ xWing: 1, nakedPair: 4, nakedSingle: 40, hiddenSingleBox: 7, pointing: 2 });
      expect(ids(m)).toEqual(['nakedSingle', 'hiddenSingleBox', 'pointing', 'nakedPair', 'xWing']);
      expect(m.total).toBe(54);
      expect(m.max).toBe(40);
    });

    it('draws the real counts of a puzzle, cage techniques included, simplest first', function () {
      [result('classic9', 'medium', 3), result('killer', 'medium', 2)].forEach(function (r) {
        var counts = r.rating.techniqueCounts;
        var m = V.chartModel(counts);
        var used = Object.keys(counts).filter(function (k) { return counts[k] > 0; }).sort();
        expect(ids(m).slice().sort()).toEqual(used);
        m.bars.forEach(function (bar) {
          expect(bar.count).toBe(counts[bar.id]);
          expect(bar.label).not.toBe(bar.key);
        });
        for (var i = 1; i < m.bars.length; i++) expect(m.bars[i - 1].order).toBeLessThan(m.bars[i].order);
      });
    });

    it('scales the bars to the largest count, with a minimum width, inside the track', function () {
      var m = V.chartModel({ nakedSingle: 50, hiddenSingleBox: 25, nakedPair: 1 }, { width: 200 });
      expect(m.width).toBe(200);
      expect(m.bars[0].barWidth).toBe(200);
      expect(m.bars[1].barWidth).toBe(100);
      expect(m.bars[2].barWidth).toBe(4);
      expect(V.chartModel({ nakedSingle: 1000, nakedPair: 1 }, { width: 200 }).bars[1].barWidth).toBe(3);
      expect(V.chartModel({ nakedSingle: 3 }, { width: 100, minBarWidth: 10 }).bars[0].barWidth).toBe(100);
    });

    it('lays the rows out one below the other, with the value at the right edge', function () {
      var m = V.chartModel({ nakedSingle: 5, hiddenSingleBox: 4, nakedPair: 3 }, { rowHeight: 20 });
      expect(m.height).toBe(60);
      m.bars.forEach(function (bar, i) {
        expect(bar.y).toBe(i * 20);
        expect(bar.labelY).toBeGreaterThan(bar.y);
        expect(bar.barY).toBeGreaterThan(bar.labelY);
        expect(bar.valueX).toBe(m.width);
      });
    });

    it('handles zero, negative, broken and missing counts as an empty chart', function () {
      [undefined, null, {}, { nakedSingle: 0 }, { nakedSingle: -2, xWing: NaN, nakedPair: 'x', swordfish: Infinity }]
        .forEach(function (counts) {
          var m = V.chartModel(counts);
          expect(m.empty).toBe(true);
          expect(m.bars).toEqual([]);
          expect(m.height).toBe(0);
        });
    });

    it('puts techniques the registry does not know last, by id, and labels with the language or a function',
      function () {
        var m = V.chartModel({ zeta: 1, nakedSingle: 2, alpha: 3, xWing: 1 });
        expect(ids(m)).toEqual(['nakedSingle', 'xWing', 'alpha', 'zeta']);
        expect(m.bars[2].label).toBe('alpha');
        var vi = inLocale('vi', function () { return V.chartModel({ nakedSingle: 3 }).bars[0].label; });
        expect(vi).toBe(SG.locales.vi['technique.nakedSingle']);
        var custom = function (id, key) { return id + '|' + key; };
        expect(V.chartModel({ nakedSingle: 3 }, { label: custom }).bars[0].label)
          .toBe('nakedSingle|technique.nakedSingle');
      });

    it('still names the seven pipeline steps for other modules', function () {
      expect(V.STEP_IDS).toEqual(STEP_IDS);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Explanation card
  // ---------------------------------------------------------------------------------------------

  describe('explainCard: viewModel', function () {
    it('gives all seven steps their title, the three parts and the pseudocode, translated', function () {
      STEP_IDS.forEach(function (id, i) {
        var data = SG.explain.get(id);
        var vm = X.viewModel(id);
        expect(vm.stepId).toBe(id);
        expect(vm.index).toBe(i + 1);
        expect(vm.titleKey).toBe('step.' + id + '.name');
        expect(vm.title).toBe(SG.locales.en['step.' + id + '.name']);
        ['what', 'why', 'how'].forEach(function (part) {
          expect(vm.keys[part]).toBe(data[part]);
          expect(vm[part]).toBe(SG.locales.en[data[part]]);
        });
        expect(vm.lines.length).toBe(data.pseudocode.length);
        expect(vm.activeLabel).toBeNull();
        expect(vm.live).toBeNull();
      });
    });

    it('highlights the line a replay step names, or the line of an event key', function () {
      var steps = SG.player.buildSteps(result('killer', 'medium', 2)).steps;
      steps.forEach(function (s) {
        var vm = X.viewModel(s.phase, { lineLabel: s.line, metrics: s.metrics });
        expect(vm).not.toBeNull();
        expect(vm.activeLabel).toBe(s.line);
        if (s.metrics) expect(vm.live.text).toContain(String(s.metrics.clues));
        else expect(vm.live).toBeNull();
      });
      var checked = 0;
      STEP_IDS.forEach(function (id) {
        var data = SG.explain.get(id);
        Object.keys(data.highlight).forEach(function (key) {
          expect(X.viewModel(id, { eventKey: key }).activeLabel).toBe(data.highlight[key]);
          checked++;
        });
      });
      expect(checked).toBeGreaterThan(25);
    });

    it('lets an explicit line label win over the event key, and null mean "none"', function () {
      expect(X.viewModel('dig', { eventKey: 'dig.try', lineLabel: 'verify' }).activeLabel).toBe('verify');
      expect(X.viewModel('dig', { eventKey: 'dig.try', lineLabel: null }).activeLabel).toBeNull();
      expect(X.viewModel('dig', { lineLabel: 'nope' }).activeLabel).toBeNull();
      expect(X.viewModel('rate', { eventKey: 'dig.try' }).activeLabel).toBeNull();
    });

    it('fills the status line from the metrics (zeros for missing ones), and has none without them', function () {
      var dig = X.viewModel('dig', { metrics: { attempts: 62, accepted: 26, rejected: 11, clues: 30 } });
      expect(dig.live.args).toEqual({ attempts: 62, accepted: 26, rejected: 11, clues: 30 });
      ['62', '26', '11', '30'].forEach(function (n) { expect(dig.live.text).toContain(n); });
      expect(X.viewModel('dig', { metrics: {} }).live.args).toEqual({ attempts: 0, accepted: 0, rejected: 0,
        clues: 0 });
      expect(X.viewModel('rate', { metrics: { clues: 30, score: 83.975 } }).live.text).toContain('84');
      expect(X.viewModel('dig').live).toBeNull();
      expect(X.viewModel('nope')).toBeNull();
    });

    it('follows the language: new text at once, same structure and same highlighted line', function () {
      var ctx = { lineLabel: 'accept', metrics: { attempts: 5, accepted: 3, rejected: 2, clues: 60 } };
      var en = X.viewModel('dig', ctx);
      var vi = inLocale('vi', function () { return X.viewModel('dig', ctx); });
      expect(vi.title).toBe(SG.locales.vi['step.dig.name']);
      ['what', 'why', 'how'].forEach(function (part) { expect(vi[part]).not.toBe(en[part]); });
      expect(vi.live.text).toContain('60');
      expect(vi.activeLabel).toBe('accept');
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Texts and style
  // ---------------------------------------------------------------------------------------------

  describe('steps panel and explanation card: texts and style', function () {
    function source(file) {
      if (!NODE) SG.test.skip('needs the Node runner to read the sources');
      return NODE.fs.readFileSync(NODE.path.join(NODE.root, file), 'utf8');
    }

    function fragmentWith(key) {
      return (SG.localeFragments || []).filter(function (fragment) { return hasOwn(fragment.en, key); })[0];
    }

    it('has every steps.* and explainCard.* key the two files use, in English and Vietnamese', function () {
      var used = [];
      ['js/ui/step-view.js', 'js/ui/explain.js'].forEach(function (file) {
        var re = /'((?:steps|explainCard)\.[A-Za-z0-9_.]+)'/g;
        var m;
        var text = source(file);
        while ((m = re.exec(text)) !== null) used.push(m[1]);
      });
      ['what', 'why', 'how'].forEach(function (part) { used.push('explainCard.' + part); });
      used = used.filter(function (key, i) { return used.indexOf(key) === i && key.slice(-1) !== '.'; });
      expect(used.length).toBeGreaterThan(10);
      ['en', 'vi'].forEach(function (code) {
        expect(used.filter(function (key) { return !packHas(SG.locales[code], key); })).toEqual([]);
      });
      expect(SG.i18n.conflicts.filter(function (c) { return /^(steps|explainCard)\./.test(c.key); })).toEqual([]);
    });

    it('keeps the two locale fragments identical in keys and placeholders, with no key outside the prefixes',
      function () {
        ['steps.legend.dug', 'explainCard.what'].forEach(function (probe) {
          var fragment = fragmentWith(probe);
          expect(fragment).toBeTruthy();
          var en = Object.keys(fragment.en).sort();
          expect(Object.keys(fragment.vi).sort()).toEqual(en);
          en.forEach(function (key) {
            expect(/^(steps|explainCard)\./.test(key)).toBe(true);
            var holes = function (text) { return (String(text).match(/\{[A-Za-z]+\}/g) || []).sort().join(); };
            expect(holes(fragment.vi[key])).toBe(holes(fragment.en[key]));
            expect(fragment.vi[key].trim()).not.toBe('');
          });
        });
      });

    it('uses only tokens and no colour literal in css/steps.css', function () {
      var css = source('css/steps.css').replace(/\/\*[\s\S]*?\*\//g, '');
      var tokens = source('css/tokens.css');
      var boardTokens = source('css/tokens-board.css');
      expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(css).not.toMatch(/\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\(/);
      expect(css).not.toMatch(/:\s*(?:white|black|red|green|blue|gray|grey|yellow|orange|purple)\b/);
      var used = css.match(/var\(--sg-[a-z0-9-]+/g) || [];
      expect(used.length).toBeGreaterThan(20);
      used.forEach(function (ref) {
        var name = ref.slice(4);
        if (/^--sg-color-/.test(name)) expect(tokens.indexOf(name + ':')).toBeGreaterThan(-1);
        if (/^--sg-board-/.test(name)) expect(boardTokens.indexOf(name + ':')).toBeGreaterThan(-1);
      });
    });

    it('loads without a DOM and refuses to build on nothing', function () {
      expect(typeof V.create).toBe('function');
      expect(typeof X.create).toBe('function');
      expect(function () { V.create(null); }).toThrow();
      expect(function () { X.create(null); }).toThrow();
    });
  });
})();
