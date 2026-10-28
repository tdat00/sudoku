// Steps panel and explanation card: the list of the replay steps (js/ui/step-view.js)
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
      cache[key] = SG.pipeline.run(
        { variantId: variantId, difficulty: difficulty, seed: seed, trace: 'off' }, null);
    }
    return cache[key];
  }

  var analyses = [];

  /** The analysis of a result (memoised), as the app gets it from the client. */
  function analysisOf(res) {
    for (var i = 0; i < analyses.length; i++) if (analyses[i].result === res) return analyses[i].analysis;
    var analysis = SG.replay.analyse(res);
    analyses.push({ result: res, analysis: analysis });
    return analysis;
  }

  var GOLDENS = SG.fixtures.replayGoldens;
  var WIRE = SG.fixtures.replayWire;
  var goldens = {};

  /** The result of a golden request (read from the saved data for the slow ones), memoised. */
  function golden(id) {
    if (!goldens[id]) {
      var g = GOLDENS.filter(function (x) { return x.id === id; })[0];
      goldens[id] = WIRE[id] ? SG.replay.fromPlainWire(WIRE[id])
        : SG.pipeline.run(SG.store.toConfig(g.request), null, SG.budget.create({ ms: 120000 }));
    }
    return goldens[id];
  }

  function viewsOf(res) {
    return SG.player.buildViews(res, analysisOf(res));
  }

  /** `fn` with the cell labeler of the model of `res` (multigrid cells read `G2-R8C9`). */
  function withLabels(res, fn) {
    SG.i18n.setCellLabeler(function (c) { return SG.model.cellLabel(res.model, c); });
    try {
      return fn();
    } finally {
      SG.i18n.setCellLabeler(null);
    }
  }

  /** The texts of a step of a golden: `SG.stepView.explain` of its table. */
  function textOfStep(step) {
    return V.explain(step.table, step);
  }

  function stepAt(steps, position) {
    return steps.filter(function (s) { return s.position === position; })[0];
  }

  /** The steps of the compact view, which the panel shows by default. */
  function compactSteps(res) {
    return SG.player.buildViews(res, analysisOf(res)).compact.steps;
  }

  /** A player with the analysis of the result loaded (no board needed). */
  function loadedPlayer(res) {
    var player = SG.player.create({});
    player.load(res);
    player.setAnalysis(analysisOf(res));
    return player;
  }

  /** The `table` option of the panel, as `SG.app` gives it: the table model of the player at a position. */
  function tableOf(player) {
    return function (p) { return player.tableAt(p); };
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

  // A small fake DOM: elements, text, classes, attributes, listeners, '#id' lookups and `closest`

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
    Object.defineProperty(El.prototype, 'firstChild', {
      get: function () { return this.children[0] || null; }
    });
    Object.defineProperty(El.prototype, 'nextSibling', {
      get: function () {
        if (!this.parentNode) return null;
        var list = this.parentNode.children;
        return list[list.indexOf(this) + 1] || null;
      }
    });
    Object.defineProperty(El.prototype, 'textContent', {
      get: function () {
        return this.own + this.children.map(function (c) { return c.textContent; }).join('');
      },
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

  function panelFixture(options) {
    var doc = createFakeDocument();
    var rootEl = doc.createElement('aside');
    rootEl.setAttribute('id', 'steps-root');
    var detail = doc.createElement('div');
    detail.setAttribute('id', 'step-detail');
    var heading = doc.createElement('h2');
    heading.setAttribute('id', 'steps-heading');
    rootEl.appendChild(heading);
    rootEl.appendChild(detail);
    var view = V.create(rootEl, options);
    return { doc: doc, root: rootEl, detail: detail, view: view };
  }

  function part(fx, cls) {
    return fx.doc.findAll(fx.detail, function (el) { return el.classes().indexOf(cls) !== -1; })[0] || null;
  }

  function allParts(fx, cls) {
    return fx.doc.findAll(fx.detail, function (el) { return el.classes().indexOf(cls) !== -1; });
  }

  describe('stepView: the description of the step on show', function () {
    it('shows nothing without steps, and a hint to use the replay controls at position 0', function () {
      var fx = panelFixture();
      inLocale('en', function () {
        expect(fx.detail.textContent).toBe('');
        fx.view.setSteps(compactSteps(result('classic9', 'normal', 3)));
        expect(part(fx, 'step-detail__empty')).not.toBeNull();
        expect(fx.detail.textContent).toContain('replay controls');
        expect(fx.view.getPosition()).toBe(0);
      });
    });

    it('shows the number, title, summary and sentence of the current step only', function () {
      var fx = panelFixture();
      var steps = compactSteps(result('classic9', 'normal', 3));
      inLocale('en', function () {
        fx.view.setSteps(steps);
        fx.view.setPosition(3);
        expect(fx.detail.getAttribute('data-kind')).toBe(steps[2].kind);
        expect(fx.root.querySelector('#steps-heading').textContent)
          .toBe('Step 3 – ' + SG.player.stepTitle(steps[2]));
        expect(part(fx, 'step-detail__meta').textContent).toBe(SG.player.stepMeta(steps[2]));
        expect(part(fx, 'step-detail__text').textContent).toBe(SG.player.describeStep(steps[2]));
        expect(part(fx, 'step-detail__empty')).toBeNull();
        fx.view.setPosition(4);
        expect(fx.root.querySelector('#steps-heading').textContent)
          .toBe('Step 4 – ' + SG.player.stepTitle(steps[3]));
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
      function used(steps) {
        return ['dug', 'kept', 'revealed', 'cause', 'causeRestore'].filter(function (name) {
          return steps.some(function (s) { return s.marks[name].length > 0; });
        });
      }
      inLocale('en', function () {
        var classic = compactSteps(result('classic9', 'normal', 3));
        fx.view.setSteps(classic);
        var marks = legend.children.map(function (li) { return li.getAttribute('data-mark'); });
        expect(marks).toEqual(used(classic));
        expect(marks).toContain('dug');
        expect(marks).toContain('kept');
        expect(legend.hidden).toBe(false);
        expect(legend.textContent).toContain('Removed in this step');
        var gtSteps = compactSteps(result('greaterThan', 'normal', 4));
        fx.view.setSteps(gtSteps);
        var gtMarks = legend.children.map(function (li) { return li.getAttribute('data-mark'); });
        expect(gtMarks).toContain('revealed');
        expect(gtMarks).toContain('signRemoved');
        expect(gtMarks).not.toContain('dug');
        expect(gtMarks.filter(function (name) {
          return name !== 'signRemoved' && name !== 'signKept' && name !== 'signCause';
        })).toEqual(used(gtSteps));
        fx.view.clear();
        expect(legend.hidden).toBe(true);
        expect(fx.detail.textContent).toBe('');
      });
    });

    it('follows the language and keeps the current step', function () {
      var fx = panelFixture();
      var steps = compactSteps(result('killer', 'normal', 2));
      fx.view.setSteps(steps);
      fx.view.setPosition(2);
      var en = fx.detail.textContent;
      inLocale('vi', function () {
        expect(fx.detail.textContent).not.toBe(en);
        expect(fx.root.querySelector('#steps-heading').textContent).toContain('Các lồng');
        expect(fx.root.querySelector('#steps-heading').textContent).toContain('Bước 2 – ');
      });
      expect(fx.detail.textContent).toBe(en);
    });

    it('has a table model for every step: start at 0, zero for the solution, the rating of the result at ' +
      'the end, "before" the counts of the step shown before',
      function () {
        var res = result('classic9', 'normal', 3);
        var player = loadedPlayer(res);
        var steps = player.getSteps();
        expect(player.tableAt(0).state).toBe('start');
        expect(player.tableAt(steps.length + 1)).toBeNull();
        expect(player.tableAt(1).state).toBe('zero');
        expect(player.tableAt(1).counts).toEqual({});
        var last = player.tableAt(steps.length);
        expect(last.state).toBe('final');
        expect(last.counts).toEqual(res.rating.techniqueCounts);
        expect(last.score).toBe(res.rating.score);
        steps.forEach(function (step, i) {
          var info = player.tableAt(i + 1);
          expect(info).toBe(step.table);
          expect(['zero', 'scored', 'final']).toContain(info.state);
          if (i > 0 && info.state !== 'zero') expect(info.before).toEqual(player.tableAt(i).counts);
        });
        // What the app gives the panel: the table models themselves (the start and a status included).
        var table = tableOf(player);
        expect(table(0).state).toBe('start');
        expect(table(steps.length).counts).toEqual(res.rating.techniqueCounts);
        expect(table(steps.length).score).toBe(res.rating.score);
        player.destroy();
      });

    it('shows the techniques a step needs, with the uses and score each step added', function () {
      var fx = panelFixture();
      var res = result('classic9', 'normal', 3);
      var player = loadedPlayer(res);
      var rootEl = fx.root;
      var view = V.create(rootEl, { table: tableOf(player) });
      var steps = player.getSteps();
      inLocale('en', function () {
        view.setSteps(steps);
        view.setPosition(steps.length);
        var rows = fx.doc.findAll(fx.detail, function (el) {
          return el.getAttribute('data-technique') !== null;
        });
        expect(rows.map(function (r) { return r.getAttribute('data-technique'); }))
          .toEqual(Object.keys(res.rating.techniqueCounts).sort(function (a, b) {
            return SG.techniques.get(a).order - SG.techniques.get(b).order;
          }));
        expect(fx.detail.textContent).toContain('Techniques needed at this step');
        // Every technique with a description has a help button that carries it, as in the summary tab; its
        // score has a second one that explains the calculation.
        rows.forEach(function (row) {
          var id = row.getAttribute('data-technique');
          var pops = fx.doc.findAll(row, function (el) { return el.getAttribute('role') === 'tooltip'; });
          expect(pops.length).toBe(2);
          expect(pops[0].textContent).toBe(SG.i18n.t('technique.' + id + '.desc'));
          expect(pops[1].textContent).toContain('Work of this technique');
          expect(pops[1].textContent).toContain('Shown as (rounded)');
          var fractions = fx.doc.findAll(pops[1], function (el) {
            return el.getAttribute('class') === 'math-frac';
          });
          expect(fractions.length).toBeGreaterThan(0);
          var buttons = fx.doc.findAll(row, function (el) { return el.tagName === 'BUTTON'; });
          expect(buttons[0].getAttribute('aria-label'))
            .toBe('About \u201c' + SG.i18n.t('technique.' + id) + '\u201d');
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
      var player = loadedPlayer(res);
      var view = V.create(fx.root, { table: tableOf(player) });
      var steps = player.getSteps();
      var info = tableOf(player)(steps.length);
      expect(info.score).toBe(res.rating.score);
      expect(info.empties).toBe(res.rating.empties);
      inLocale('en', function () {
        view.setSteps(steps);
        view.setPosition(steps.length);
        var total = fx.doc.findAll(fx.detail, function (el) {
          return /step-table__total/.test(el.getAttribute('class') || '');
        });
        expect(total.length).toBe(1);
        expect(total[0].textContent).toContain(String(Math.round(res.rating.score)));
        var totalTip = fx.doc.findAll(total[0], function (el) {
          return el.getAttribute('role') === 'tooltip';
        });
        expect(totalTip.length).toBe(1);
        expect(totalTip[0].textContent).toContain('≈ ' + Math.round(res.rating.score));
        var empties = fx.doc.findAll(fx.detail, function (el) {
          return el.getAttribute('data-part') === 'empties';
        });
        expect(empties.length).toBe(1);
        var tip = fx.doc.findAll(empties[0], function (el) { return el.getAttribute('role') === 'tooltip'; });
        expect(tip.length).toBe(2);
        expect(tip[0].textContent).toContain('80 × E ÷ (E + 40)');
        expect(tip[1].textContent).toContain('80 × ' + res.rating.empties);
        // The rows add up to the total, as they are written.
        var parts = fx.doc.findAll(fx.detail, function (el) {
          return el.tagName === 'TR' &&
            (el.getAttribute('data-technique') !== null || el.getAttribute('data-part') !== null);
        });
        var sum = 0;
        parts.forEach(function (row) {
          var score = fx.doc.findAll(row, function (el) { return el.getAttribute('data-role') === 'score'; });
          expect(score.length).toBe(1);
          sum += Number(score[0].textContent.replace(/[^0-9.]/g, ''));
        });
        expect(sum).toBe(Math.round(res.rating.score));
        // Columns: name, uses, points per use and score.
        expect(fx.detail.textContent).toContain('Points per use');
        var heads = fx.doc.findAll(fx.detail, function (el) {
          return el.getAttribute('class') === 'result-table__short';
        });
        expect(heads.map(function (el) { return el.textContent; })).toEqual(['n', 'w', 'W', 'q']);
        expect(fx.detail.textContent).toContain('n = uses');
        var head = fx.doc.findAll(fx.detail, function (el) {
          return el.tagName === 'TH' && el.getAttribute('scope') === null;
        });
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
      view.setSteps(compactSteps(result('classic4', 'veryEasy', 2)));
      view.setPosition(2);
      expect(detail.children.length).toBeGreaterThan(1);
      view.destroy();
      expect(rootEl.children.length).toBe(0);
      expect(function () { V.create(null); }).toThrow();
    });
  });

  // ---- The texts of the score tables and of the jumps (SG.stepView.explain) ----

  var CONTROL_COUNTS = { nakedSingle: 2, hiddenSingleBox: 15, pointing: 6, boxLine: 1, nakedPair: 2,
    hiddenPair: 2, wWing: 2, uniqueRectangle: 1, forcingChain: 4 };

  function terms(total, extra) {
    return Object.assign({ P: 1, W: 43, E: 43, V: 41.445783, R: 1.364858, total: total, level: 'veryEasy',
      hardest: 'nakedSingle', counts: { nakedSingle: 43 } }, extra || {});
  }

  /** A scored table model with the transition of a jump (plain data in the shapes of `player.tableAt`). */
  function jumpModel(before, after, options) {
    var o = options || {};
    var afterTerms = terms(after, { P: 360, W: 768.25, E: 45, V: 42.352941, R: 148.321617, level: 'hard',
      hardest: 'simpleColouring', counts: { nakedSingle: 43, simpleColouring: 2 } });
    var transition = Object.assign({
      view: 'compact', step: 4, from: 22, to: 23, role: 'step', change: after - before, tier: 'jump',
      ratio: SG.replay.badgeRatio(before, after), newHardest: true, auditScope: null,
      folded: {}, before: terms(before), after: afterTerms, cause: null, choice: null
    }, o.transition || {});
    return { state: 'scored', status: null, reasons: [], counts: afterTerms.counts,
      before: transition.before.counts, empties: 45, score: after, change: after - before,
      transition: transition, proof: o.proof || null, position: 23 };
  }

  /** A step of one move (a removal of two cells) with the context the explanations read. */
  function oneMoveStep(move) {
    var moves = [];
    for (var i = 0; i < 4; i++) moves.push({ removed: [], restored: [], sign: null });
    moves[3] = Object.assign({ removed: [10, 20], restored: [], sign: null }, move || {});
    return { first: 3, last: 3, position: 3, context: { moves: moves, signs: null } };
  }

  function statusModel(status, reasons, counts) {
    return { state: 'status', status: status, reasons: reasons, counts: counts, before: null, empties: 53,
      score: null, change: null, transition: null, proof: null, position: 3 };
  }

  /** The "Why?" lines of a synthetic jump (after the seven terms: the choice, the proof and the scope). */
  function whyOf(model, step) {
    return V.explain(model, step || oneMoveStep()).callout.why;
  }

  describe('stepView: the score table of every step', function () {
    it('draws the start, the steps before the first score, the scored steps and the final one (the example)',
      function () {
        var res = golden('G01');
        var player = loadedPlayer(res);
        var fx = panelFixture({ table: tableOf(player) });
        fx.view.setSteps(player.getSteps());
        inLocale('en', function () {
          fx.view.setPosition(0);
          expect(fx.detail.textContent).toContain('replay controls');
          expect(fx.detail.textContent).toContain('No score yet: this is not a puzzle yet.');
          expect(fx.detail.textContent).toContain('Techniques needed at this step');
          expect(allParts(fx, 'result-table').length).toBe(0);
          expect(part(fx, 'step-detail__techniques').getAttribute('data-state')).toBe('start');

          fx.view.setPosition(1);
          var zero = part(fx, 'step-detail__techniques');
          expect(zero.getAttribute('data-state')).toBe('zero');
          expect(fx.detail.textContent).toContain('No solving technique is needed yet.');
          var rows = fx.doc.findAll(zero, function (el) { return el.tagName === 'TR'; });
          var empties = fx.doc.findAll(zero, function (el) { return el.getAttribute('data-part') === 'empties'; });
          expect(empties.length).toBe(1);
          expect(empties[0].textContent).toContain('Empty cells');
          expect(fx.doc.findAll(empties[0], function (el) { return el.tagName === 'TD'; })
            .map(function (td) { return td.textContent; }).filter(Boolean)).toEqual(['0', '0']);
          expect(fx.doc.findAll(zero, function (el) { return el.getAttribute('data-technique') !== null; }).length)
            .toBe(0);
          expect(fx.doc.findAll(zero, function (el) { return el.getAttribute('data-group') === 'technique'; })
            .length).toBe(0);
          expect(rows.length).toBeGreaterThan(3);
          var scores = fx.doc.findAll(zero, function (el) { return el.getAttribute('data-role') === 'score'; });
          expect(scores.map(function (el) { return el.textContent; })).toEqual(['0', '0']);

          fx.view.setPosition(4);
          var total4 = fx.doc.findAll(fx.detail, function (el) {
            return /step-table__total/.test(el.getAttribute('class') || '');
          })[0];
          expect(fx.doc.findAll(total4, function (el) { return el.getAttribute('data-role') === 'score'; })[0]
            .textContent).toBe('551 (+507)');
          fx.view.setPosition(7);
          var total7 = fx.doc.findAll(fx.detail, function (el) {
            return /step-table__total/.test(el.getAttribute('class') || '');
          })[0];
          expect(fx.doc.findAll(total7, function (el) { return el.getAttribute('data-role') === 'score'; })[0]
            .textContent).toBe('992 (unchanged)');
          expect(part(fx, 'step-detail__techniques').getAttribute('data-state')).toBe('final');
        });
        inLocale('vi', function () {
          expect(fx.detail.textContent).toContain('992 (không đổi)');
        });
        fx.view.destroy();
        player.destroy();
      }, 60000);

    it('has a table on every step of the details view, real decreases included', function () {
      var res = golden('G01');
      var player = loadedPlayer(res);
      player.setView('details');
      var steps = player.getSteps();
      expect(steps.length).toBe(33);
      var fx = panelFixture({ table: tableOf(player) });
      fx.view.setSteps(steps);
      inLocale('en', function () {
        steps.forEach(function (step, i) {
          expect(player.tableAt(i + 1)).not.toBeNull();
          fx.view.setPosition(i + 1);
          var box = part(fx, 'step-detail__techniques');
          expect(['zero', 'scored', 'final']).toContain(box.getAttribute('data-state'));
          var total = fx.doc.findAll(box, function (el) { return el.getAttribute('data-role') === 'score'; });
          expect(total[total.length - 1].textContent).toBe(V.explain(step.table, step).total);
        });
      });
      fx.view.destroy();
      player.destroy();
    }, 60000);

    it('writes the Total from the score and its change: none, unchanged, a rise or a fall (U+2212)', function () {
      var zero = { state: 'zero', status: null, reasons: [], counts: {}, before: null, empties: 0, score: 0,
        change: null, transition: null, proof: null, position: 1 };
      inLocale('en', function () {
        expect(V.explain(zero, null).total).toBe('0');
        expect(V.explain(Object.assign({}, zero, { change: -551 }), null).total).toBe('0 (\u2212551)');
        expect(V.explain(Object.assign({}, zero, { score: 1940, change: -848 }), null).total)
          .toBe('1,940 (\u2212848)');
        expect(V.explain(Object.assign({}, zero, { score: 992, change: 0 }), null).total).toBe('992 (unchanged)');
        expect(V.explain(Object.assign({}, zero, { score: 551, change: 507 }), null).total).toBe('551 (+507)');
      });
      inLocale('vi', function () {
        expect(V.explain(Object.assign({}, zero, { score: 992, change: 0 }), null).total).toBe('992 (không đổi)');
        expect(V.explain(Object.assign({}, zero, { score: 1940, change: -848 }), null).total)
          .toBe('1.940 (\u2212848)');
      });
      expect(V.explain(null, null)).toEqual({ total: null, badge: null, line: null, rowLabel: null,
        totalHighlight: false, callout: null, status: null });
      expect(V.explain({ state: 'start' }, null).total).toBeNull();
    });
  });

  describe('stepView: a board that cannot be rated', function () {
    function panelWith(models) {
      var res = golden('G01');
      var player = loadedPlayer(res);
      var fx = panelFixture({ table: function (p) { return models[p] || player.tableAt(p); } });
      fx.view.setSteps(player.getSteps());
      return { fx: fx, player: player };
    }

    function statusRows(fx) {
      return fx.doc.findAll(fx.detail, function (el) { return el.getAttribute('data-technique') !== null; });
    }

    it('says why and lists what the solver attempted: no points, work, score, Total or tooltip', function () {
      var set = panelWith({ 3: statusModel('stuck', ['stuck', 'ambiguous'], CONTROL_COUNTS) });
      var fx = set.fx;
      inLocale('en', function () {
        fx.view.setPosition(3);
        expect(allParts(fx, 'step-status').map(function (p) { return p.textContent; })).toEqual([
          'Not rated: this solver stopped before completing the board.',
          'Not rated: this board has at least two solutions.'
        ]);
        expect(part(fx, 'step-status__attempted').textContent)
          .toBe('The rows show techniques the solver applied, not a validated difficulty rating.');
        expect(statusRows(fx).length).toBe(9);
        expect(fx.doc.findAll(fx.detail, function (el) { return el.getAttribute('data-role') === 'score'; })
          .length).toBe(0);
        expect(fx.detail.textContent).not.toContain('Total');
        expect(fx.doc.findAll(fx.detail, function (el) {
          return el.tagName === 'BUTTON' || el.getAttribute('role') === 'tooltip';
        }).length).toBe(0);
        expect(allParts(fx, 'step-table__total').length).toBe(0);
        var first = statusRows(fx)[0];
        expect(first.children.length).toBe(2);
        expect(first.textContent).toContain('Naked Single');
        expect(first.textContent).toContain('2');
        expect(part(fx, 'step-detail__techniques').getAttribute('data-state')).toBe('status');
      });
      inLocale('vi', function () {
        expect(part(fx, 'step-status__attempted').textContent)
          .toBe('Các dòng chỉ ghi những kỹ thuật bộ giải đã áp dụng, không phải kết quả chấm độ khó.');
      });
      fx.view.destroy();
      set.player.destroy();
    }, 60000);

    it('capped has one sentence and no rows; unverified, ambiguous and the others keep their rows', function () {
      var set = panelWith({
        2: statusModel('capped', ['capped'], {}),
        3: statusModel('unverified', ['unverified'], { nakedSingle: 3 }),
        4: statusModel('ambiguous', ['ambiguous'], { nakedSingle: 3, pointing: 1 }),
        5: statusModel('stuck', ['stuck'], { nakedSingle: 1 }),
        6: statusModel('capped', ['capped'], { nakedSingle: 3 })
      });
      var fx = set.fx;
      inLocale('en', function () {
        fx.view.setPosition(2);
        expect(allParts(fx, 'step-status').map(function (p) { return p.textContent; })).toEqual(
          ['Not rated: the computational limit for this rating was reached.']);
        expect(part(fx, 'step-status__attempted')).toBeNull();
        expect(statusRows(fx).length).toBe(0);
        expect(allParts(fx, 'result-table').length).toBe(0);
        fx.view.setPosition(3);
        expect(allParts(fx, 'step-status')[0].textContent)
          .toBe('Not rated: the page could not confirm a unique solution for this board.');
        expect(statusRows(fx).length).toBe(1);
        fx.view.setPosition(4);
        expect(allParts(fx, 'step-status').map(function (p) { return p.textContent; })).toEqual(
          ['Not rated: this board has at least two solutions.']);
        expect(statusRows(fx).length).toBe(2);
        fx.view.setPosition(5);
        expect(allParts(fx, 'step-status').length).toBe(1);
        fx.view.setPosition(6);
        expect(statusRows(fx).length).toBe(0);
      });
      fx.view.destroy();
      set.player.destroy();
    }, 60000);

    it('a missing final rating and a contradiction have their own sentences; the ambiguity is not repeated',
      function () {
        var set = panelWith({});
        inLocale('en', function () {
          var missing = V.explain(statusModel('unverified', ['missingRating'], {}), null).status;
          expect(missing.sentences).toEqual(['Not rated: no verified final rating is available.']);
          expect(missing.attempted).toBeNull();
          var clash = V.explain(statusModel('stuck', ['stuck', 'contradiction'], { nakedSingle: 1 }), null).status;
          expect(clash.sentences).toEqual(['Not rated: the board or deduction trace contains a contradiction.']);
          expect(clash.attempted).not.toBeNull();
          var both = V.explain(statusModel('stuck', ['contradiction', 'ambiguous'], {}), null).status;
          expect(both.sentences).toEqual([
            'Not rated: the board or deduction trace contains a contradiction.',
            'Not rated: this board has at least two solutions.'
          ]);
          expect(V.explain(statusModel('ambiguous', ['ambiguous'], {}), null).status.sentences.length).toBe(1);
        });
        inLocale('vi', function () {
          expect(V.explain(statusModel('capped', ['capped'], {}), null).status.sentences)
            .toEqual(['Chưa chấm điểm: đã đạt giới hạn tính toán cho lần chấm này.']);
        });
        set.player.destroy();
      });

    it('never asks for a score table of partial counts, and a result without a rating runs no solver',
      function () {
        var res = golden('G01');
        var bare = Object.assign({}, res, { rating: undefined });
        var calls = { scoreTable: 0, solve: 0 };
        var scoreTable = SG.difficulty.scoreTable;
        var solve = SG.logicalSolver.solve;
        SG.difficulty.scoreTable = function () { calls.scoreTable++; return scoreTable.apply(this, arguments); };
        SG.logicalSolver.solve = function () { calls.solve++; return solve.apply(this, arguments); };
        try {
          var views = SG.player.buildViews(bare, SG.replay.fallback(bare, 'error'));
          var fallback = SG.player.create({});
          fallback.load(bare);
          fallback.setAnalysis(SG.replay.fallback(bare, 'error'));
          var fx = panelFixture({ table: tableOf(fallback) });
          fx.view.setSteps(fallback.getSteps());
          var last = fallback.getSteps().length;
          expect(views.compact.steps[last - 1].table.state).toBe('status');
          inLocale('en', function () {
            fx.view.setPosition(last);
            expect(allParts(fx, 'step-status').map(function (p) { return p.textContent; })).toEqual(
              ['Not rated: no verified final rating is available.']);
            expect(statusRows(fx).length).toBe(0);
          });
          var model = statusModel('stuck', ['stuck', 'ambiguous'], CONTROL_COUNTS);
          var other = panelFixture({ table: function () { return model; } });
          other.view.setSteps(compactSteps(res));
          other.view.setPosition(3);
          expect(statusRows(other).length).toBe(9);
          expect(calls.scoreTable).toBe(0);
          expect(calls.solve).toBe(0);
          other.view.destroy();
          fx.view.destroy();
          fallback.destroy();
        } finally {
          SG.difficulty.scoreTable = scoreTable;
          SG.logicalSolver.solve = solve;
        }
      }, 60000);
  });

  describe('stepView: the tiers, the badge and the lines', function () {
    it('rounds the ratio of the badge down to one decimal, in the format of the language', function () {
      inLocale('en', function () {
        expect(V.explain(jumpModel(100, 300), oneMoveStep()).badge)
          .toEqual({ kind: 'jump', text: 'Score jump \u00d73.0' });
        expect(V.explain(jumpModel(300, 1000), oneMoveStep()).badge.text).toBe('Score jump \u00d73.3');
        expect(V.explain(jumpModel(44, 551), oneMoveStep()).badge.text).toBe('Score jump \u00d712.5');
      });
      inLocale('vi', function () {
        expect(V.explain(jumpModel(100, 300), oneMoveStep()).badge.text).toBe('Điểm tăng vọt \u00d73,0');
        expect(V.explain(jumpModel(44, 551), oneMoveStep()).badge.text).toBe('Điểm tăng vọt \u00d712,5');
      });
    });

    it('marks 13 compact and 16 details jumps over the 14 goldens, and one first rated puzzle per view',
      function () {
        var jumps = { compact: 0, details: 0 };
        inLocale('en', function () {
          GOLDENS.forEach(function (g) {
            var res = golden(g.id);
            var views = viewsOf(res);
            withLabels(res, function () {
              ['compact', 'details'].forEach(function (name) {
                var firsts = 0;
                views[name].steps.forEach(function (step) {
                  var text = textOfStep(step);
                  var t = step.table.transition;
                  if (text.badge !== null && text.badge.kind === 'jump') {
                    jumps[name]++;
                    expect(t.tier).toBe('jump');
                    expect(SG.replay.isJump(t.before.total, t.after.total)).toBe(true);
                    expect(text.badge.text).toMatch(/^Score jump \u00d7\d+\.\d$/);
                    expect(text.line).toBeNull();
                    expect(text.callout).not.toBeNull();
                  } else {
                    expect(text.callout).toBeNull();
                  }
                  if (text.badge !== null && text.badge.kind === 'first') {
                    firsts++;
                    expect(text.badge.text).toBe('First rated puzzle');
                    expect(text.badge.text).not.toMatch(/\u00d7/);
                    expect(text.line).toMatch(/^First rated puzzle: score [\d,]+\. /);
                  }
                });
                expect(firsts).toBe(1);
              });
            });
          });
        });
        expect(jumps).toEqual({ compact: 13, details: 16 });
      }, 120000);

    it('the example: the first rated puzzle, the new hardest technique without a badge, an unchanged total',
      function () {
        var res = golden('G01');
        var steps = viewsOf(res).compact.steps;
        withLabels(res, function () {
          inLocale('en', function () {
            var one = textOfStep(steps[0]);
            expect([one.total, one.badge, one.line]).toEqual(['0', null, null]);
            var two = textOfStep(steps[1]);
            expect(two.badge).toEqual({ kind: 'first', text: 'First rated puzzle' });
            expect(two.line).toBe('First rated puzzle: score 23. The generator\'s solution uses Naked Single as ' +
              'its hardest technique.');
            expect(two.callout).toBeNull();
            var six = textOfStep(steps[5]);
            expect(six.badge).toBeNull();
            expect(six.line).toBe('The generator\'s solution now uses XYZ-Wing (weight 750) as its hardest ' +
              'technique, instead of Simple Colouring (weight 360).');
            expect(six.rowLabel).toEqual({ technique: 'xyzWing', text: 'New hardest technique' });
            var seven = textOfStep(steps[6]);
            expect([seven.total, seven.badge, seven.line, seven.rowLabel]).toEqual(
              ['992 (unchanged)', null, null, null]);
          });
          inLocale('vi', function () {
            var two = textOfStep(steps[1]);
            expect(two.badge.text).toBe('Đề đầu tiên được chấm điểm');
            expect(two.line).toBe('Đề đầu tiên được chấm điểm: 23 điểm. Trong lời giải mà trình sinh đề tìm ' +
              'được, kỹ thuật khó nhất là Ô một ứng viên (Naked Single).');
            expect(textOfStep(steps[5]).line).toBe('Trong lời giải mới của trình sinh đề, kỹ thuật khó nhất là ' +
              'XYZ-Wing (trọng số 750), thay cho Tô màu đơn giản (Simple Colouring) (trọng số 360).');
            expect(textOfStep(steps[5]).rowLabel.text).toBe('Kỹ thuật khó nhất mới');
            expect(textOfStep(steps[6]).total).toBe('992 (không đổi)');
          });
        });
      }, 60000);

    it('also tells a new hardest technique when the score is flat or falls (details view)', function () {
      var flat = viewsOf(golden('G13')).details.steps;
      var fall = viewsOf(golden('G10')).details.steps;
      inLocale('en', function () {
        var a = stepAt(flat, 101);
        var text = textOfStep(a);
        expect(a.table.transition.before.total).toBe(70);
        expect(a.table.transition.after.total).toBe(70);
        expect(text.badge).toBeNull();
        expect(text.callout).toBeNull();
        expect(text.total).toBe('70 (unchanged)');
        expect(text.line).toMatch(/^The generator's solution now uses .* \(weight [\d.,]+\) as its hardest technique, instead of /);
        expect(text.rowLabel.technique).toBe(a.table.transition.after.hardest);
        var b = stepAt(fall, 42);
        var drop = textOfStep(b);
        expect(b.table.transition.before.total).toBe(2788);
        expect(b.table.transition.after.total).toBe(1940);
        expect(drop.badge).toBeNull();
        expect(drop.total).toBe(SG.i18n.formatNumber(1940) + ' (\u2212848)');
        expect(drop.total).toBe('1,940 (\u2212848)');
        expect(drop.line).toContain('now uses Forcing Chain (weight 1,100)');
        expect(drop.rowLabel.technique).toBe('forcingChain');
        expect(drop.totalHighlight).toBe(false);
      });
    }, 120000);

    it('a jump whose hardest technique was already used has no row label and highlights its Total', function () {
      var res = golden('G01');
      var player = loadedPlayer(res);
      var real = player.tableAt(4);
      var plain = Object.assign({}, real, { transition: Object.assign({}, real.transition, { newHardest: false }) });
      var steps = player.getSteps();
      inLocale('en', function () {
        var text = V.explain(plain, steps[3]);
        expect(text.rowLabel).toBeNull();
        expect(text.totalHighlight).toBe(true);
        expect(text.badge.kind).toBe('jump');
        expect(V.explain(real, steps[3]).totalHighlight).toBe(false);
        var fx = panelFixture({ table: function (p) { return p === 4 ? plain : player.tableAt(p); } });
        fx.view.setSteps(steps);
        fx.view.setPosition(4);
        expect(allParts(fx, 'step-table__label').length).toBe(0);
        expect(allParts(fx, 'step-table__total--jump').length).toBe(1);
        fx.view.setPosition(5);
        expect(allParts(fx, 'step-table__total--jump').length).toBe(0);
        fx.view.destroy();
      });
      player.destroy();
    }, 60000);
  });

  describe('stepView: the callout of a score jump', function () {
    var EXAMPLE = {
      en: {
        badge: 'Score jump \u00d712.5',
        heading: 'Score jump: 44 \u2192 551 (+507)',
        sentences: [
          'After the clues at R1C2 and R9C8 are removed, the generator\'s solution uses Simple Colouring 2 ' +
            'times; previously, its hardest technique was Naked Single.',
          'The largest technique weight, 360, contributes in full as the P term of the score (P = 360).',
          'Removing the clue at R1C2 alone gives 550; removing the clue at R9C8 alone gives 44.'
        ],
        why: [
          'P, peak technique weight: 1 \u2192 360 (+359)',
          'W, weighted sum of technique uses: 43 \u2192 768.25',
          'R = 0.25 \u00d7 P \u00d7 log\u2082(1 + W \u00f7 P): 1.36 \u2192 148.32 (+146.96)',
          'E, number of empty cells: 43 \u2192 45',
          'V = 80 \u00d7 E \u00f7 (E + 40): 41.45 \u2192 42.35 (+0.91)',
          'Score = V + P + R, rounded: 44 \u2192 551 (+507)',
          'Level: Very easy \u2192 Hard',
          'The log records 15 candidates before this accepted removal, with 5 rejected; the other 9 ' +
            'candidates with completed scores reached at most 45 by the generator\'s limited check.',
          'In a separate check, this solver stopped before completing the board using only techniques with ' +
            'weights below 360.',
          'First use in the generator\'s solution: logical deduction 32 of 47.',
          null,
          'In that deduction, candidate 3 is removed from R5C2 and R8C3.',
          'These numbers describe the generator\'s solution, not every way to solve the puzzle.'
        ]
      },
      vi: {
        badge: 'Điểm tăng vọt \u00d712,5',
        heading: 'Điểm tăng vọt: 44 \u2192 551 (+507)',
        sentences: [
          'Sau khi bỏ số cho sẵn ở R1C2 và R9C8, lời giải mà trình sinh đề tìm được dùng Tô màu đơn giản ' +
            '(Simple Colouring) 2 lần; trước đó, kỹ thuật khó nhất là Ô một ứng viên (Naked Single).',
          'Trọng số cao nhất 360 được tính toàn bộ vào điểm ở thành phần P (P = 360).',
          'Chỉ bỏ số ở R1C2 cho 550 điểm; chỉ bỏ số ở R9C8 cho 44 điểm.'
        ],
        why: [
          'P, trọng số cao nhất: 1 \u2192 360 (+359)',
          'W, tổng trọng số các lần áp dụng kỹ thuật: 43 \u2192 768,25',
          'R = 0,25 \u00d7 P \u00d7 log\u2082(1 + W \u00f7 P): 1,36 \u2192 148,32 (+146,96)',
          'E, số ô trống: 43 \u2192 45',
          'V (điểm của ô trống) = 80 \u00d7 E \u00f7 (E + 40): 41,45 \u2192 42,35 (+0,91)',
          'Điểm = V + P + R, làm tròn: 44 \u2192 551 (+507)',
          'Mức độ: Rất dễ \u2192 Khó',
          'Bản ghi có 15 phương án trước lần bỏ số được chọn này, trong đó 5 bị loại; 9 phương án khác có ' +
            'điểm sau phép kiểm tra giới hạn của trình sinh đề đạt cao nhất 45 điểm.',
          'Trong một lần kiểm tra riêng, bộ giải này chỉ dùng các kỹ thuật có trọng số dưới 360 và đã dừng ' +
            'khi chưa giải xong đề.',
          'Lần dùng đầu tiên trong lời giải của trình sinh đề: bước suy luận 32/47.',
          null,
          'Ở bước suy luận đó, loại ứng viên 3 khỏi R5C2 và R8C3.',
          'Các con số này mô tả cách giải mà trình sinh đề tìm được, không đại diện cho mọi cách giải đề.'
        ]
      }
    };

    it('the example (Classic 9x9 expert, step 4) reads as specified, in English and Vietnamese', function () {
      var res = golden('G01');
      var step = viewsOf(res).compact.steps[3];
      var proof = step.table.proof;
      expect(step.table.transition.tier).toBe('jump');
      withLabels(res, function () {
        ['en', 'vi'].forEach(function (code) {
          inLocale(code, function () {
            var text = textOfStep(step);
            var want = EXAMPLE[code];
            expect(text.total).toBe('551 (+507)');
            expect(text.badge).toEqual({ kind: 'jump', text: want.badge });
            expect(text.line).toBeNull();
            expect(text.callout.heading).toBe(want.heading);
            expect(text.callout.sentences).toEqual(want.sentences);
            expect(text.callout.why.length).toBe(13);
            want.why.forEach(function (line, i) {
              if (line !== null) expect(text.callout.why[i]).toBe(line);
            });
            // The solver's own paragraph of the first use, as it wrote it.
            expect(text.callout.why[10]).toBe(SG.i18n.t(proof.firstUse.i18nKey, proof.firstUse.i18nArgs));
            expect(text.callout.why[10]).toContain(code === 'en' ? 'colour 1 is R2C4, R6C6, R8C5, R9C2'
              : 'màu 1 là R2C4, R6C6, R8C5, R9C2');
            expect(text.rowLabel.technique).toBe('simpleColouring');
            expect(text.rowLabel.text).toBe(code === 'en' ? 'New hardest technique' : 'Kỹ thuật khó nhất mới');
            expect(text.totalHighlight).toBe(false);
          });
        });
      });
    }, 60000);

    function causeOf(options) {
      return Object.assign({ class: 'unavailable', changes: [], singles: [], culprit: null, largest: null,
        sign: null, k: null, n: null, kMove: null, verifiedOnly: false, frame: null }, options);
    }

    function sentenceOf(cause, step, extra) {
      var model = jumpModel(100, 800, { transition: Object.assign({ cause: cause }, extra || {}) });
      return V.explain(model, step || oneMoveStep()).callout.sentences;
    }

    it('names the cause of a move per class, on the goldens', function () {
      var results = {};
      ['G03', 'G05', 'G07', 'G11', 'G13'].forEach(function (id) { results[id] = golden(id); });
      function third(id, position, view) {
        var res = results[id];
        var step = stepAt(viewsOf(res)[view || 'compact'].steps, position);
        return withLabels(res, function () {
          return inLocale('en', function () {
            var text = textOfStep(step);
            return { sentences: text.callout.sentences, step: step };
          });
        });
      }
      expect(third('G03', 23).sentences[2])
        .toBe('Removing each clue alone gives 45 and 44; removing the whole group gives 870.');
      expect(third('G05', 29).sentences[2])
        .toBe('The separate changes give 50, 50, 49 and 49; the combined change gives 2,010.');
      expect(third('G07', 24).sentences[2]).toBe('Removing the clue at R1C4 alone gives 136, versus 252 for the ' +
        'whole symmetric group, which is always displayed as one complete change.');
      var sign = third('G11', 110);
      expect(sign.sentences[0]).toContain('After the sign between R2C4 and R1C4 is removed, ');
      expect(sign.sentences[2]).toBe('This step removes one sign; there is no smaller sign-removal move to show.');
      expect(third('G13', 114).sentences[2])
        .toBe('Removing the clue at G2-R8C9 alone gives 1,483; removing the clue at G3-R2C1 alone gives 72.');
    }, 120000);

    function fragmentEn(move) {
      var join = function (names) {
        return names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
      };
      var removed = move.removed.map(function (c) { return SG.i18n.cellLabel(c); });
      var restored = move.restored.map(function (c) { return SG.i18n.cellLabel(c); });
      if (removed.length > 0 && restored.length > 0) {
        return 'the clues at ' + join(removed) + ' are removed and those at ' + join(restored) + ' are restored';
      }
      var list = removed.length > 0 ? removed : restored;
      return (list.length === 1 ? 'the clue at ' : 'the clues at ') + join(list) +
        (list.length === 1 ? ' is ' : ' are ') + (removed.length > 0 ? 'removed' : 'restored');
    }

    it('a jump over several moves says in which complete change the new technique first appears', function () {
      [['G06', 31, 'compact'], ['G10', 42, 'compact'], ['G12', 103, 'compact']].forEach(function (c) {
        var res = golden(c[0]);
        var analysis = analysisOf(res);
        var step = stepAt(viewsOf(res)[c[2]].steps, c[1]);
        var cause = step.table.transition.cause;
        expect(cause.class).toBe('multi-move');
        expect(cause.verifiedOnly).toBe(false);
        expect(cause.frame).toBeNull();
        withLabels(res, function () {
          inLocale('en', function () {
            var hardest = SG.i18n.t('technique.' + step.table.transition.after.hardest);
            var fragment = analysis.moves[cause.kMove].sign !== null ? null : fragmentEn(analysis.moves[cause.kMove]);
            var text = textOfStep(step).callout.sentences;
            if (fragment !== null) {
              expect(text[2]).toBe('Within this step, ' + hardest + ' first appears after complete change ' +
                cause.k + ' of ' + cause.n + ' (' + fragment + ').');
            } else {
              expect(text[2]).toContain(' first appears after complete change ' + cause.k + ' of ' + cause.n);
              expect(text[2]).toContain('the sign between');
            }
            expect(text[0]).toContain('After the ' + cause.n + ' changes in this step');
          });
        });
      });
    }, 120000);

    it('the sentences of every class of cause, with the variants of an exchange and a restore', function () {
      var removeTwo = [{ cell: 10, action: 'remove' }, { cell: 20, action: 'remove' }];
      var exchange = [{ cell: 10, action: 'remove' }, { cell: 20, action: 'restore' }];
      var step = oneMoveStep();
      inLocale('en', function () {
        var culprit = { cell: 10, action: 'remove', score: 550, otherScore: 44 };
        expect(sentenceOf(causeOf({ class: 'single-culprit', changes: removeTwo, culprit: culprit }))[2])
          .toBe('Removing the clue at #11 alone gives 550; removing the clue at #21 alone gives 44.');
        expect(sentenceOf(causeOf({ class: 'single-culprit', changes: removeTwo.concat([{ cell: 30,
          action: 'remove' }, { cell: 40, action: 'remove' }]), culprit: culprit }))[2])
          .toBe('Removing the clue at #11 alone gives 550; removing the other 3 clues without it gives 44.');
        expect(sentenceOf(causeOf({ class: 'single-culprit', changes: exchange, culprit: culprit }))[2])
          .toBe('Removing the clue at #11 alone gives 550; the rest of this change without it gives 44.');
        expect(sentenceOf(causeOf({ class: 'single-culprit', changes: exchange,
          culprit: { cell: 20, action: 'restore', score: 500, otherScore: 90 } }))[2])
          .toBe('Restoring the clue at #21 alone gives 500; the rest of this change without it gives 90.');
        var singles = [{ cell: 10, action: 'remove', score: 150 }, { cell: 20, action: 'remove', score: 160 }];
        expect(sentenceOf(causeOf({ class: 'together', changes: removeTwo, singles: singles }))[2])
          .toBe('Removing each clue alone gives 150 and 160; removing the whole group gives 800.');
        expect(sentenceOf(causeOf({ class: 'together', changes: exchange, singles: singles }))[2])
          .toBe('The separate changes give 150 and 160; the combined change gives 800.');
        var largest = { cell: 20, action: 'remove', score: 400 };
        expect(sentenceOf(causeOf({ class: 'mixed', changes: removeTwo, singles: singles, largest: largest }))[2])
          .toBe('Removing the clue at #21 alone gives 400, versus 800 for the whole symmetric group, which is ' +
            'always displayed as one complete change.');
        expect(sentenceOf(causeOf({ class: 'mixed', changes: exchange, singles: singles, largest: largest }))[2])
          .toBe('On its own, the change at #21 gives 400, versus 800 for the whole change, which is always ' +
            'displayed as one complete change.');
        expect(sentenceOf(causeOf({ class: 'single-sign', sign: 0 }))[2])
          .toBe('This step removes one sign; there is no smaller sign-removal move to show.');
        expect(sentenceOf(causeOf({ class: 'single-cell', changes: [{ cell: 10, action: 'remove' }] }))[2])
          .toBe('This step removes one clue; there is no smaller clue-removal move to show.');
        expect(sentenceOf(causeOf({ class: 'single-cell', changes: [{ cell: 10, action: 'restore' }] }))[2])
          .toBe('This step restores one clue; there is no smaller clue-restoring move to show.');
        expect(sentenceOf(causeOf({ class: 'unavailable', changes: removeTwo }))[2])
          .toBe('The parts of this change could not all be rated, so no single cause is named.');
        expect(sentenceOf(null).length).toBe(2);
        expect(step.first).toBe(3);
      });
    });

    it('a work-only jump over several moves names no single cause; an unrated position qualifies the claim',
      function () {
        var moves = [];
        for (var i = 0; i < 8; i++) moves.push({ removed: [i * 2], restored: [], sign: null });
        var step = { first: 4, last: 6, position: 6, context: { moves: moves, signs: null } };
        inLocale('en', function () {
          expect(sentenceOf(causeOf({ class: 'multi-move', k: null, n: 3 }), step)[2])
            .toBe('This step combines 3 complete changes; no single cause is named.');
          expect(sentenceOf(causeOf({ class: 'multi-move', k: 2, n: 3, kMove: 5 }), step)[2])
            .toBe('Within this step, Simple Colouring first appears after complete change 2 of 3 (the clue at ' +
              '#11 is removed).');
          expect(sentenceOf(causeOf({ class: 'multi-move', k: 2, n: 3, kMove: 5, verifiedOnly: true }), step)[2])
            .toBe('The first rated position using Simple Colouring within this step follows change 2 of 3 ' +
              '(the clue at #11 is removed).');
          expect(sentenceOf(causeOf({ class: 'unavailable' }), step)[0]).toContain('After the 3 changes in this step');
        });
      });

    it('describes what the move did: signs, an exchange, clues restored, with the plural of the language',
      function () {
        var signsStep = oneMoveStep({ removed: [], restored: [], sign: 1 });
        signsStep.context.signs = [[1, 2], [3, 4]];
        inLocale('en', function () {
          expect(sentenceOf(null, signsStep)[0]).toContain('After the sign between #4 and #5 is removed, ');
          expect(sentenceOf(null, oneMoveStep({ removed: [10], restored: [20, 30] }))[0])
            .toContain('After the clues at #11 are removed and those at #21 and #31 are restored, ');
          expect(sentenceOf(null, oneMoveStep({ removed: [], restored: [10] }))[0])
            .toContain('After the clue at #11 is restored, ');
          expect(sentenceOf(null, oneMoveStep({ removed: [], restored: [10, 20] }))[0])
            .toContain('After the clues at #11 and #21 are restored, ');
          expect(sentenceOf(null, oneMoveStep({ removed: [10], restored: [] }))[0])
            .toContain('After the clue at #11 is removed, ');
        });
        inLocale('vi', function () {
          expect(sentenceOf(null, oneMoveStep({ removed: [], restored: [10, 20] }))[0])
            .toContain('Sau khi khôi phục số cho sẵn ở #11 và #21, ');
        });
      });

    it('says the work grew when the hardest technique did not change, and uses once / n times', function () {
      inLocale('en', function () {
        var same = jumpModel(100, 800, { transition: { after: terms(800, { P: 360, W: 900, hardest: 'nakedSingle',
          counts: { nakedSingle: 43 } }), newHardest: false } });
        var text = V.explain(same, oneMoveStep()).callout.sentences;
        expect(text[0]).toBe('After the clues at #11 and #21 are removed, the weighted sum of technique uses in ' +
          'the generator\'s solution grew from 43 to 900.');
        expect(text[1]).toBe('The largest technique weight, 360, contributes in full as the P term of the ' +
          'score (P = 360).');
        var once = jumpModel(100, 800, { transition: { after: terms(800, { P: 360, hardest: 'simpleColouring',
          counts: { simpleColouring: 1 } }) } });
        expect(V.explain(once, oneMoveStep()).callout.sentences[0]).toContain('uses Simple Colouring once;');
      });
    });
  });

  describe('stepView: "Why?" lines: the choice, the proof and the effects', function () {
    var SEVEN = 7;

    function choiceLinesOf(choice, extra) {
      var model = jumpModel(100, 800, { transition: Object.assign({ choice: choice }, extra || {}) });
      return V.explain(model, oneMoveStep()).callout.why.slice(SEVEN, -1);
    }

    function guided(options) {
      return Object.assign({ kind: 'guided', count: null, chosen: 800, at: 5, rated: 4, refused: 2, others: 1,
        nulls: 0, max: 48 }, options);
    }

    it('tells what the log records about the candidates compared, by kind of choice', function () {
      inLocale('en', function () {
        expect(choiceLinesOf(guided({ others: 1 }))).toEqual(['The log records 4 candidates before this ' +
          'accepted removal, with 2 rejected; the other candidate with a completed score reached 48 by the ' +
          'generator\'s limited check.']);
        expect(choiceLinesOf(guided({ others: 9, rated: 15, refused: 5, max: 1234 }))).toEqual(['The log records ' +
          '15 candidates before this accepted removal, with 5 rejected; the other 9 candidates with completed ' +
          'scores reached at most 1,234 by the generator\'s limited check.']);
        expect(choiceLinesOf(guided({ others: 2, nulls: 1 })).slice(1)).toEqual(['The limited check did not ' +
          'finish the board for 1 other retained candidate, so it has no numerical check score.']);
        expect(choiceLinesOf(guided({ others: 2, nulls: 3 })).slice(1)).toEqual(['The limited check did not ' +
          'finish the boards for 3 other retained candidates, so they have no numerical check score.']);
        expect(choiceLinesOf(guided({ others: 0, nulls: 2, rated: 16, refused: 3, max: null }))).toEqual([
          'The log records 16 candidates before this accepted removal, with 3 rejected.',
          'No numerical score from the limited check is available for the other candidates.']);
        expect(choiceLinesOf(guided({ others: 0, nulls: 0, rated: 1, refused: 0 }))).toEqual([
          'The log records no other retained removal candidate for this choice.']);
        expect(choiceLinesOf(guided({ others: 0, nulls: 0, rated: 2, refused: 1 }))).toEqual([
          'The log records 2 candidates before this accepted removal, with 1 rejected.',
          'The log records no other retained removal candidate for this choice.']);
        var unscored = choiceLinesOf(guided({ chosen: null }));
        expect(unscored.length).toBe(2);
        expect(unscored[1]).toBe('The generator\'s limited check did not finish the board after the chosen ' +
          'removal; its objective ranks such a removal above every removal it could finish.');
        expect(choiceLinesOf({ kind: 'random' })).toEqual(['This group was picked at random.']);
        expect(choiceLinesOf({ kind: 'checked' }))
          .toEqual(['The log contains no comparable-candidate scores for this change.']);
        expect(choiceLinesOf({ kind: 'combined', count: 3 })).toEqual(['This step combines 3 changes; it is not a ' +
          'single candidate-comparison round.']);
        expect(choiceLinesOf({ kind: 'none' })).toEqual([]);
        expect(choiceLinesOf(null)).toEqual([]);
      });
      inLocale('vi', function () {
        // Vietnamese has no plural form: the _other text is used for one candidate too.
        expect(choiceLinesOf(guided({ others: 1 }))[0]).toContain('1 phương án khác có điểm sau phép kiểm tra ' +
          'giới hạn của trình sinh đề đạt cao nhất 48 điểm.');
        expect(choiceLinesOf({ kind: 'random' })).toEqual(['Nhóm này được chọn ngẫu nhiên.']);
      });
    });

    it('the goldens whose chosen removal the limited check could not finish say so (Samurai, Mega 16x16)',
      function () {
        [['G13', 114], ['G14', 69]].forEach(function (c) {
          var res = golden(c[0]);
          var step = stepAt(viewsOf(res).compact.steps, c[1]);
          expect(step.table.transition.choice.chosen).toBeNull();
          withLabels(res, function () {
            inLocale('en', function () {
              var why = textOfStep(step).callout.why;
              expect(why.filter(function (line) { return /did not finish the board after the chosen removal/.test(line); })
                .length).toBe(1);
              expect(why.filter(function (line) { return /^The log records \d+ candidates/.test(line); }).length).toBe(1);
            });
          });
        });
      }, 120000);

    it('the lighter-techniques sentence only follows a stuck restricted check; the audit scope only ratedOnly',
      function () {
        function whyWith(restricted, scope) {
          var proof = { firstUse: null, restricted: restricted };
          return whyOf(jumpModel(100, 800, { proof: proof, transition: { auditScope: scope } }));
        }
        inLocale('en', function () {
          var lighter = 'In a separate check, this solver stopped before completing the board using only ' +
            'techniques with weights below 360.';
          expect(whyWith('stuck', null)).toContain(lighter);
          expect(whyWith('complete', null)).not.toContain(lighter);
          expect(whyWith('unavailable', null)).not.toContain(lighter);
          expect(whyOf(jumpModel(100, 800))).not.toContain(lighter);
          var scope = 'Only the recorded boards that could be rated were searched for smaller steps.';
          expect(whyWith('stuck', 'ratedOnly')).toContain(scope);
          expect(whyWith('stuck', 'complete')).not.toContain(scope);
          expect(whyWith('stuck', null)).not.toContain(scope);
          var why = whyWith('stuck', 'ratedOnly');
          expect(why[why.length - 1]).toBe('These numbers describe the generator\'s solution, not every way to ' +
            'solve the puzzle.');
          expect(why.indexOf(lighter)).toBeLessThan(why.indexOf(scope));
          expect(whyOf(jumpModel(100, 800)).length).toBe(8);
        });
      });

    it('groups the effects of the first use by cell and candidates, then the digits placed', function () {
      SG.i18n.setCellLabeler(function (c) { return 'c' + c; });
      try {
        inLocale('en', function () {
          var use = { k: 3, n: 9, technique: 'simpleColouring', i18nKey: 'technique.simpleColouring.desc',
            i18nArgs: {}, eliminations: [[1, 3], [5, 3], [2, 4], [2, 3], [7, 4], [1, 3]], placements: [[8, 6], [9, 2]] };
          var lines = whyOf(jumpModel(100, 800, { proof: { firstUse: use, restricted: 'complete' } }));
          var at = lines.indexOf('First use in the generator\'s solution: logical deduction 3 of 9.');
          expect(at).toBeGreaterThan(6);
          expect(lines[at + 1]).toBe(SG.i18n.t('technique.simpleColouring.desc'));
          expect(lines.slice(at + 2, -1)).toEqual([
            'In that deduction, candidate 3 is removed from c1 and c5.',
            'In that deduction, candidates 3 and 4 are removed from c2.',
            'In that deduction, candidate 4 is removed from c7.',
            'In that deduction, 6 is placed in c8.',
            'In that deduction, 2 is placed in c9.'
          ]);
        });
        inLocale('vi', function () {
          var use = { k: 3, n: 9, technique: 'xWing', i18nKey: 'technique.xWing.desc', i18nArgs: {},
            eliminations: [[1, 3], [5, 3]], placements: [] };
          var lines = whyOf(jumpModel(100, 800, { proof: { firstUse: use, restricted: 'complete' } }));
          expect(lines).toContain('Lần dùng đầu tiên trong lời giải của trình sinh đề: bước suy luận 3/9.');
          expect(lines).toContain('Ở bước suy luận đó, loại ứng viên 3 khỏi c1 và c5.');
        });
      } finally {
        SG.i18n.setCellLabeler(null);
      }
    });

    it('the first deductions of the goldens: Killer candidates 2 and 5 in one cell, 1, 6, 7 and 9 in another',
      function () {
        var nine = golden('G09');
        var ten = golden('G10');
        withLabels(nine, function () {
          inLocale('en', function () {
            var why = textOfStep(stepAt(viewsOf(nine).compact.steps, 37)).callout.why;
            expect(why).toContain('In that deduction, candidates 2 and 5 are removed from R7C5.');
          });
        });
        withLabels(ten, function () {
          inLocale('en', function () {
            var why = textOfStep(stepAt(viewsOf(ten).compact.steps, 36)).callout.why;
            expect(why).toContain('In that deduction, candidates 1, 6, 7 and 9 are removed from R7C1.');
          });
        });
      }, 120000);
  });

  describe('stepView: no overclaim and no placeholder in the texts of the goldens', function () {
    it('never says a puzzle "cannot be solved without" or "must use", and "at random" only for a random order',
      function () {
        var seen = { random: 0, lines: 0 };
        GOLDENS.forEach(function (g) {
          var res = golden(g.id);
          var views = viewsOf(res);
          withLabels(res, function () {
            ['en', 'vi'].forEach(function (code) {
              inLocale(code, function () {
                ['compact', 'details'].forEach(function (name) {
                  views[name].steps.forEach(function (step) {
                    var text = textOfStep(step);
                    var lines = [text.total, text.line, text.badge && text.badge.text,
                      text.rowLabel && text.rowLabel.text];
                    if (text.callout !== null) {
                      lines = lines.concat([text.callout.heading], text.callout.sentences, text.callout.why);
                    }
                    if (text.status !== null) lines = lines.concat(text.status.sentences, [text.status.attempted]);
                    lines.filter(function (line) { return typeof line === 'string'; }).forEach(function (line) {
                      seen.lines++;
                      expect(/cannot be solved without|must use/i.test(line)).toBe(false);
                      expect(/[{}]|undefined|NaN|\[object|^steps\.|^replay\.|^technique\./.test(line)).toBe(false);
                      var random = /at random|ngẫu nhiên/.test(line);
                      if (random) {
                        seen.random++;
                        expect(step.table.transition.choice.kind).toBe('random');
                      }
                    });
                  });
                });
              });
            });
          });
        });
        expect(seen.lines).toBeGreaterThan(500);
      }, 120000);
  });

  describe('stepView: the callout, the badge and the legend on the page', function () {
    it('puts the callout between the sentence and the table; "Why?" is a closed details with a summary',
      function () {
        var res = golden('G01');
        var player = loadedPlayer(res);
        var fx = panelFixture({ table: tableOf(player) });
        var steps = player.getSteps();
        fx.view.setSteps(steps);
        withLabels(res, function () {
          inLocale('en', function () {
            fx.view.setPosition(4);
            expect(fx.detail.children.map(function (el) { return el.getAttribute('class'); })).toEqual(
              ['step-detail__meta', 'step-detail__text', 'step-callout', 'step-detail__techniques']);
            var callout = fx.detail.children[2];
            expect(callout.tagName).toBe('DIV');
            expect(callout.getAttribute('data-role')).toBe('jump');
            expect(callout.children.map(function (el) { return el.getAttribute('class'); })).toEqual(
              ['step-callout__heading', 'step-callout__text', 'step-callout__text', 'step-callout__text',
                'step-why']);
            expect(callout.children[0].textContent).toBe('Score jump: 44 \u2192 551 (+507)');
            var why = callout.children[4];
            expect(why.tagName).toBe('DETAILS');
            expect(why.getAttribute('open')).toBeNull();
            expect(why.children[0].tagName).toBe('SUMMARY');
            expect(why.children[0].textContent).toBe('Why?');
            expect(why.children[1].tagName).toBe('UL');
            expect(why.children[1].getAttribute('class')).toBe('step-why__list');
            expect(why.children[1].children.length).toBe(13);
            expect(why.children[1].children.every(function (li) { return li.tagName === 'LI'; })).toBe(true);

            var heading = fx.root.querySelector('#steps-heading');
            var badge = fx.doc.findAll(heading, function (el) { return el.classes().indexOf('step-badge') !== -1; });
            expect(badge.length).toBe(1);
            expect(badge[0].tagName).toBe('SPAN');
            expect(badge[0].classes()).toContain('step-badge--jump');
            expect(badge[0].textContent).toBe('Score jump \u00d712.5');
            expect(heading.textContent).toBe('Step 4 \u2013 ' + SG.player.stepTitle(steps[3]) + ' Score jump \u00d712.5');

            fx.view.setPosition(2);
            expect(part(fx, 'step-callout')).toBeNull();
            expect(part(fx, 'step-tier').textContent).toBe('First rated puzzle: score 23. The generator\'s solution ' +
              'uses Naked Single as its hardest technique.');
            var first = fx.doc.findAll(heading, function (el) { return el.classes().indexOf('step-badge') !== -1; });
            expect(first[0].classes()).toContain('step-badge--first');
            expect(first[0].textContent).toBe('First rated puzzle');

            fx.view.setPosition(3);
            expect(fx.doc.findAll(heading, function (el) { return el.tagName === 'SPAN'; }).length).toBe(0);
            expect(heading.textContent).toBe('Step 3 \u2013 ' + SG.player.stepTitle(steps[2]));
            expect(part(fx, 'step-tier')).toBeNull();

            fx.view.setPosition(6);
            expect(part(fx, 'step-tier').textContent).toContain('now uses XYZ-Wing (weight 750)');
            var labels = allParts(fx, 'step-table__label');
            expect(labels.length).toBe(1);
            expect(labels[0].getAttribute('data-role')).toBe('new-hardest');
            expect(labels[0].textContent).toBe('New hardest technique');
            var row = labels[0].parentNode.parentNode.parentNode;
            expect(row.getAttribute('data-technique')).toBe('xyzWing');
            expect(allParts(fx, 'step-table__total--jump').length).toBe(0);
          });
          // A change of language re-draws the heading, the badge and the callout.
          fx.view.setPosition(4);
          inLocale('vi', function () {
            var heading = fx.root.querySelector('#steps-heading');
            expect(heading.textContent).toContain('Điểm tăng vọt \u00d712,5');
            expect(part(fx, 'step-callout__heading').textContent).toBe('Điểm tăng vọt: 44 \u2192 551 (+507)');
            expect(fx.detail.textContent).toContain('Vì sao?');
          });
          expect(part(fx, 'step-callout__heading').textContent).toBe('Score jump: 44 \u2192 551 (+507)');
        });
        fx.view.destroy();
        player.destroy();
      }, 60000);

    it('explains the frames of a jump in the legend only when the view uses them', function () {
      var res = golden('G01');
      var player = loadedPlayer(res);
      var fx = panelFixture({ table: tableOf(player) });
      var legend = fx.detail.nextSibling;
      inLocale('en', function () {
        fx.view.setSteps(player.getSteps());
        var marks = legend.children.map(function (li) { return li.getAttribute('data-mark'); });
        expect(marks).toContain('cause');
        expect(marks).not.toContain('causeRestore');
        expect(marks).not.toContain('signCause');
        expect(legend.textContent).toContain('Removing this clue causes the score jump');
      });
      inLocale('vi', function () {
        expect(legend.textContent).toContain('Bỏ số cho sẵn này làm điểm tăng vọt');
      });
      fx.view.destroy();
      player.destroy();

      var gt = golden('G11');
      var gtPlayer = loadedPlayer(gt);
      var gtFx = panelFixture({ table: tableOf(gtPlayer) });
      var gtLegend = gtFx.detail.nextSibling;
      inLocale('en', function () {
        gtFx.view.setSteps(gtPlayer.getSteps());
        var marks = gtLegend.children.map(function (li) { return li.getAttribute('data-mark'); });
        expect(marks).toContain('signCause');
        expect(marks).not.toContain('cause');
        expect(gtLegend.textContent).toContain('Removing this sign causes the score jump');
      });
      gtFx.view.destroy();
      gtPlayer.destroy();

      var none = golden('G03');
      var nonePlayer = loadedPlayer(none);
      var noneFx = panelFixture({ table: tableOf(nonePlayer) });
      noneFx.view.setSteps(nonePlayer.getSteps());
      var noneMarks = noneFx.detail.nextSibling.children.map(function (li) { return li.getAttribute('data-mark'); });
      expect(noneMarks.filter(function (m) { return /cause/i.test(m); })).toEqual([]);
      noneFx.view.destroy();
      nonePlayer.destroy();
    }, 120000);

    it('a restored culprit gets the restore legend and the restore sentence, never the removal legend', function () {
      var res = golden('G05');
      var analysis = analysisOf(res);
      var base = viewsOf(res).compact.steps[4];
      expect(base.table.transition.tier).toBe('jump');
      var cell = base.marks.revealed[0];
      var transitions = analysis.transitions.map(function (t) {
        if (t !== base.table.transition) return t;
        return Object.assign({}, t, { cause: Object.assign({}, t.cause, {
          class: 'single-culprit', culprit: { cell: cell, action: 'restore', score: 49, otherScore: 50 },
          frame: { kind: 'cell', cell: cell, action: 'restore' } }) });
      });
      var changed = Object.assign({}, analysis, { transitions: transitions });
      var player = SG.player.create({});
      player.load(res);
      player.setAnalysis(changed);
      var step = player.getSteps()[4];
      expect(step.marks.causeRestore).toEqual([cell]);
      expect(step.marks.cause).toEqual([]);
      expect(step.marks.revealed).not.toContain(cell);
      var fx = panelFixture({ table: tableOf(player) });
      var legend = fx.detail.nextSibling;
      withLabels(res, function () {
        inLocale('en', function () {
          fx.view.setSteps(player.getSteps());
          var marks = legend.children.map(function (li) { return li.getAttribute('data-mark'); });
          expect(marks).toContain('causeRestore');
          expect(marks).not.toContain('cause');
          expect(legend.textContent).toContain('Restoring this clue causes the score jump');
          expect(legend.textContent).not.toContain('Removing this clue causes the score jump');
          fx.view.setPosition(5);
          expect(allParts(fx, 'step-callout__text')[2].textContent).toBe('Restoring the clue at ' +
            SG.model.cellLabel(res.model, cell) + ' alone gives 49; the rest of this change without it gives 50.');
        });
      });
      fx.view.destroy();
      player.destroy();
    }, 60000);

    it('has every new string in both languages with the same placeholders', function () {
      var keys = ['steps.techniques.change', 'steps.techniques.unchanged', 'steps.techniques.newPeak',
        'steps.status.capped', 'steps.status.stuck', 'steps.status.ambiguous', 'steps.status.unverified',
        'steps.status.attempted', 'steps.status.missingRating', 'steps.status.contradiction', 'steps.first.label',
        'steps.first', 'steps.newPeak', 'steps.jump.badge', 'steps.jump.heading', 'steps.jump.change.remove',
        'steps.jump.change.restore', 'steps.jump.change.sign', 'steps.jump.change.exchange',
        'steps.jump.change.moves', 'steps.jump.uses', 'steps.jump.work', 'steps.jump.full',
        'steps.jump.cause.culprit', 'steps.jump.cause.culpritGroup', 'steps.jump.cause.culpritExchange',
        'steps.jump.cause.culpritRestore', 'steps.jump.cause.together', 'steps.jump.cause.togetherExchange',
        'steps.jump.cause.parts', 'steps.jump.cause.partsExchange', 'steps.jump.cause.sign',
        'steps.jump.cause.cell', 'steps.jump.cause.cellRestore', 'steps.jump.cause.grouped',
        'steps.jump.cause.groupedRated', 'steps.jump.cause.combined', 'steps.jump.cause.unavailable',
        'steps.jump.why', 'steps.jump.p', 'steps.jump.w', 'steps.jump.r', 'steps.jump.e', 'steps.jump.v',
        'steps.jump.total', 'steps.jump.level', 'steps.jump.choice.guided', 'steps.jump.choice.span',
        'steps.jump.choice.nulls', 'steps.jump.choice.noScores', 'steps.jump.choice.only',
        'steps.jump.choice.chosenUnscored', 'steps.jump.choice.random', 'steps.jump.choice.checked',
        'steps.jump.choice.none', 'steps.jump.lighter', 'steps.jump.auditScope', 'steps.jump.firstUse',
        'steps.jump.removedHere', 'steps.jump.placedHere', 'steps.jump.scope', 'replay.start.noScore',
        'replay.legend.cause.cell', 'replay.legend.cause.sign', 'replay.legend.cause.restore', 'replay.sign'];
      var holders = function (text) {
        var found = [];
        String(text).replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, function (whole, name) {
          if (found.indexOf(name) === -1) found.push(name);
          return whole;
        });
        return found.sort().join();
      };
      var plural = /^steps\.jump\.(change\.(remove|restore)|uses|choice\.(guided|nulls)|removedHere)$/;
      keys.forEach(function (key) {
        var forms = plural.test(key) ? [key + '_one', key + '_other'] : [key];
        forms.forEach(function (form) {
          expect(typeof SG.locales.en[form]).toBe('string');
          expect(typeof SG.locales.vi[form]).toBe('string');
          expect(holders(SG.locales.vi[form])).toBe(holders(SG.locales.en[form]));
        });
      });
      expect(SG.locales.vi['steps.jump.v']).not.toBe(SG.locales.en['steps.jump.v']);
      expect(SG.locales.en['steps.jump.v']).toContain('V = 80');
    });
  });

  describe('stepView: placeTip', function () {
    function fakeTip(iconBottom, popHeight, windowHeight) {
      var attrs = {};
      var pop = { offsetHeight: popHeight };
      return {
        attrs: attrs,
        ownerDocument: { defaultView: { innerHeight: windowHeight } },
        querySelector: function () { return pop; },
        setAttribute: function (name, value) { attrs[name] = value; },
        removeAttribute: function (name) { delete attrs[name]; },
        getBoundingClientRect: function () { return { top: iconBottom - 24, bottom: iconBottom }; }
      };
    }

    it('keeps the pop-up below the icon when it fits', function () {
      var tip = fakeTip(200, 150, 800);
      V.placeTip(tip);
      expect(tip.attrs['data-above']).toBeUndefined();
      expect(tip.attrs['data-measure']).toBeUndefined();
    });

    it('opens it above the icon when it does not fit below and there is more room above', function () {
      var tip = fakeTip(700, 300, 800);
      V.placeTip(tip);
      expect(tip.attrs['data-above']).toBe('');
      expect(tip.attrs['data-measure']).toBeUndefined();
    });

    it('stays below when there is no more room above (a tall pop-up near the top)', function () {
      var tip = fakeTip(120, 500, 400);
      V.placeTip(tip);
      expect(tip.attrs['data-above']).toBeUndefined();
    });

    it('forgets an earlier choice when the room changes, and ignores a stand-in without layout', function () {
      var tip = fakeTip(700, 300, 800);
      V.placeTip(tip);
      expect(tip.attrs['data-above']).toBe('');
      tip.getBoundingClientRect = function () { return { top: 50, bottom: 74 }; };
      V.placeTip(tip);
      expect(tip.attrs['data-above']).toBeUndefined();
      expect(function () { V.placeTip({ querySelector: function () { return null; } }); }).not.toThrow();
    });
  });

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
      var junk = { nakedSingle: -2, xWing: NaN, nakedPair: 'x', swordfish: Infinity };
      [undefined, null, {}, { nakedSingle: 0 }, junk]
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
      var killer = result('killer', 'normal', 2);
      var steps = SG.player.buildViews(killer, analysisOf(killer)).details.steps;
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

    it('fills the status line from the metrics (zeros for missing ones), and has none without them',
      function () {
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

  describe('steps panel and explanation card: texts and style', function () {
    function source(file) {
      if (!NODE) SG.test.skip('needs the Node runner to read the sources');
      return NODE.fs.readFileSync(NODE.path.join(NODE.root, file), 'utf8');
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
    });

    it('uses only colour and board tokens that the token files define in css/steps.css', function () {
      var css = source('css/steps.css').replace(/\/\*[\s\S]*?\*\//g, '');
      var tokens = source('../core/css/tokens.css');
      var boardTokens = source('../core/css/tokens-board.css');
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
