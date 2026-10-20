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
    doc.createElementNS = function (ns, tag) { return new El(tag); };
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
    var detail = doc.createElement('div');
    detail.setAttribute('id', 'step-detail');
    var heading = doc.createElement('h2');
    heading.setAttribute('id', 'steps-heading');
    rootEl.appendChild(heading);
    rootEl.appendChild(detail);
    var view = V.create(rootEl);
    return { doc: doc, root: rootEl, detail: detail, view: view };
  }

  function part(fx, cls) {
    return fx.doc.findAll(fx.detail, function (el) { return el.classes().indexOf(cls) !== -1; })[0] || null;
  }

  // ---------------------------------------------------------------------------------------------
  // The description of the step on show
  // ---------------------------------------------------------------------------------------------

  describe('stepView: the description of the step on show', function () {
    it('shows nothing without steps, and a hint to use the replay controls at position 0', function () {
      var fx = panelFixture();
      inLocale('en', function () {
        expect(fx.detail.textContent).toBe('');
        fx.view.setSteps(SG.player.buildSteps(result('classic9', 'normal', 3)).steps);
        expect(part(fx, 'step-detail__empty')).not.toBeNull();
        expect(fx.detail.textContent).toContain('replay controls');
        expect(fx.view.getPosition()).toBe(0);
      });
    });

    it('shows the number, title, summary and sentence of the current step only', function () {
      var fx = panelFixture();
      var steps = SG.player.buildSteps(result('classic9', 'normal', 3)).steps;
      inLocale('en', function () {
        fx.view.setSteps(steps);
        fx.view.setPosition(3);
        expect(fx.detail.getAttribute('data-kind')).toBe(steps[2].kind);
        expect(fx.root.querySelector('#steps-heading').textContent)
          .toBe('Step 3 - ' + SG.player.stepTitle(steps[2]));
        expect(part(fx, 'step-detail__meta').textContent).toBe(SG.player.stepMeta(steps[2]));
        expect(part(fx, 'step-detail__text').textContent).toBe(SG.player.describeStep(steps[2]));
        expect(part(fx, 'step-detail__empty')).toBeNull();
        fx.view.setPosition(4);
        expect(fx.root.querySelector('#steps-heading').textContent)
          .toBe('Step 4 - ' + SG.player.stepTitle(steps[3]));
        expect(part(fx, 'step-detail__text').textContent).toBe(SG.player.describeStep(steps[3]));
        fx.view.setPosition(0);
        expect(fx.root.querySelector('#steps-heading').textContent).toBe('Step description');
        expect(part(fx, 'step-detail__text')).toBeNull();
        expect(part(fx, 'step-detail__empty')).not.toBeNull();
        fx.view.setPosition(999);
        expect(fx.view.getPosition()).toBe(0);
      });
    });

    it('explains the frames it uses in a legend, and only those', function () {
      var fx = panelFixture();
      var legend = fx.detail.nextSibling;
      expect(legend.hidden).toBe(true);
      inLocale('en', function () {
        fx.view.setSteps(SG.player.buildSteps(result('classic9', 'normal', 3)).steps);
        var marks = legend.children.map(function (li) { return li.getAttribute('data-mark'); });
        expect(marks).toEqual(['dug', 'kept']);
        expect(legend.hidden).toBe(false);
        expect(legend.textContent).toContain('Removed in this step');
        fx.view.setSteps(SG.player.buildSteps(result('greaterThan', 'normal', 4)).steps);
        var gtMarks = legend.children.map(function (li) { return li.getAttribute('data-mark'); });
        expect(gtMarks).toContain('revealed');
        expect(gtMarks).toContain('signRemoved');
        expect(gtMarks).not.toContain('dug');
        fx.view.clear();
        expect(legend.hidden).toBe(true);
        expect(fx.detail.textContent).toBe('');
      });
    });

    it('follows the language and keeps the current step', function () {
      var fx = panelFixture();
      var steps = SG.player.buildSteps(result('killer', 'normal', 2)).steps;
      fx.view.setSteps(steps);
      fx.view.setPosition(2);
      var en = fx.detail.textContent;
      inLocale('vi', function () {
        expect(fx.detail.textContent).not.toBe(en);
        expect(fx.root.querySelector('#steps-heading').textContent).toContain('Các lồng');
        expect(fx.root.querySelector('#steps-heading').textContent).toContain('Bước 2 - ');
      });
      expect(fx.detail.textContent).toBe(en);
    });

    it('rates the puzzle of each step: nothing before the dig, the rating of the result at the end', function () {
      var res = result('classic9', 'normal', 3);
      var player = SG.player.create({});
      player.load(res);
      var steps = player.getSteps();
      expect(player.rateStep(0)).toBeNull();
      expect(player.rateStep(steps.length + 1)).toBeNull();
      expect(player.rateStep(1).counts).toEqual({});
      expect(player.rateStep(steps.length).counts).toEqual(res.rating.techniqueCounts);
      var rated = 0;
      steps.forEach(function (step, i) {
        var info = player.rateStep(i + 1);
        if (info === null) return;
        rated++;
        var previous = i === 0 ? { counts: {} } : player.rateStep(i);
        if (previous !== null) expect(info.before).toEqual(previous.counts);
      });
      expect(rated).toBe(steps.length);
      player.destroy();
    });

    it('shows the techniques a step needs, with the uses and score each step added', function () {
      var fx = panelFixture();
      var res = result('classic9', 'normal', 3);
      var player = SG.player.create({});
      player.load(res);
      var rootEl = fx.root;
      var view = V.create(rootEl, { stats: function (p) { return player.rateStep(p); } });
      var steps = player.getSteps();
      inLocale('en', function () {
        view.setSteps(steps);
        view.setPosition(steps.length);
        var rows = fx.doc.findAll(fx.detail, function (el) { return el.getAttribute('data-technique') !== null; });
        expect(rows.map(function (r) { return r.getAttribute('data-technique'); }))
          .toEqual(Object.keys(res.rating.techniqueCounts).sort(function (a, b) {
            return SG.techniques.get(a).order - SG.techniques.get(b).order;
          }));
        expect(fx.detail.textContent).toContain('Techniques needed at this step');
        // Every technique with a description has a help button that carries it, as in the summary tab; its score has
        // a second one that explains the calculation.
        rows.forEach(function (row) {
          var id = row.getAttribute('data-technique');
          var pops = fx.doc.findAll(row, function (el) { return el.getAttribute('role') === 'tooltip'; });
          expect(pops.length).toBe(2);
          expect(pops[0].textContent).toBe(SG.i18n.t('technique.' + id + '.desc'));
          expect(pops[1].textContent).toContain('Work of this technique');
          expect(pops[1].textContent).toContain('Shown as (rounded)');
          var fractions = fx.doc.findAll(pops[1], function (el) { return el.getAttribute('class') === 'math-frac'; });
          expect(fractions.length).toBeGreaterThan(0);
          var buttons = fx.doc.findAll(row, function (el) { return el.tagName === 'BUTTON'; });
          expect(buttons[0].getAttribute('aria-label')).toBe('About \u201c' + SG.i18n.t('technique.' + id) + '\u201d');
          expect(buttons[1].getAttribute('aria-label')).toContain('How the score of');
        });
        view.setPosition(1);
        expect(fx.detail.textContent).toContain('No solving technique is needed yet.');
      });
      view.destroy();
      player.destroy();
    });

    it('shows the same total at the last step as the score of the summary, whatever its parts', function () {
      var fx = panelFixture();
      var res = result('classic9', 'normal', 3);
      var player = SG.player.create({});
      player.load(res);
      var view = V.create(fx.root, { stats: function (p) { return player.rateStep(p); } });
      var steps = player.getSteps();
      var info = player.rateStep(steps.length);
      expect(info.score).toBe(res.rating.score);
      expect(info.empties).toBe(res.rating.empties);
      inLocale('en', function () {
        view.setSteps(steps);
        view.setPosition(steps.length);
        var total = fx.doc.findAll(fx.detail, function (el) { return /step-table__total/.test(el.getAttribute('class') || ''); });
        expect(total.length).toBe(1);
        expect(total[0].textContent).toContain(String(Math.round(res.rating.score)));
        var totalTip = fx.doc.findAll(total[0], function (el) { return el.getAttribute('role') === 'tooltip'; });
        expect(totalTip.length).toBe(1);
        expect(totalTip[0].textContent).toContain('≈ ' + Math.round(res.rating.score));
        var empties = fx.doc.findAll(fx.detail, function (el) { return el.getAttribute('data-part') === 'empties'; });
        expect(empties.length).toBe(1);
        var tip = fx.doc.findAll(empties[0], function (el) { return el.getAttribute('role') === 'tooltip'; });
        expect(tip.length).toBe(2);
        expect(tip[0].textContent).toContain('80 × E ÷ (E + 40)');
        expect(tip[1].textContent).toContain('80 × ' + res.rating.empties);
        expect(SG.i18n.has('steps.techniques.floor')).toBe(false);
        // The rows add up to the total, as they are written.
        var parts = fx.doc.findAll(fx.detail, function (el) {
          return el.tagName === 'TR' && (el.getAttribute('data-technique') !== null || el.getAttribute('data-part') !== null);
        });
        var sum = 0;
        parts.forEach(function (row) {
          var score = fx.doc.findAll(row, function (el) { return el.getAttribute('data-role') === 'score'; });
          expect(score.length).toBe(1);
          sum += Number(score[0].textContent.replace(/[^0-9.]/g, ''));
        });
        expect(sum).toBe(Math.round(res.rating.score));
        // Columns: name, uses, points per use and score (no "Added" column).
        expect(fx.detail.textContent).not.toContain('Added');
        expect(fx.detail.textContent).toContain('Points per use');
        var heads = fx.doc.findAll(fx.detail, function (el) { return el.getAttribute('class') === 'result-table__short'; });
        expect(heads.map(function (el) { return el.textContent; })).toEqual(['n', 'w', 'W', 'q']);
        expect(fx.detail.textContent).toContain('n = uses');
        expect(fx.detail.textContent).not.toContain('hardest technique counts');
        var head = fx.doc.findAll(fx.detail, function (el) { return el.tagName === 'TH' && el.getAttribute('scope') === null; });
        expect(head.length).toBeGreaterThan(0);
      });
      view.destroy();
      player.destroy();
    });

    it('builds its container when the page has none, and takes everything away on destroy', function () {
      var doc = createFakeDocument();
      var rootEl = doc.createElement('aside');
      var view = V.create(rootEl);
      var detail = rootEl.querySelector('#step-detail');
      expect(detail).not.toBeNull();
      view.setSteps(SG.player.buildSteps(result('classic4', 'veryEasy', 2)).steps);
      view.setPosition(2);
      expect(detail.children.length).toBeGreaterThan(1);
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
      [result('classic9', 'normal', 3), result('killer', 'normal', 2)].forEach(function (r) {
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
      var steps = SG.player.buildSteps(result('killer', 'normal', 2)).steps;
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
      var tokens = source('../core/css/tokens.css');
      var boardTokens = source('../core/css/tokens-board.css');
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
