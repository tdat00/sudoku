// Result panel (task T-4.8): SG.resultView.viewModel is pure, so every displayed value, the warning logic, the
// share link and the translations are checked here on Node with real pipeline results (and results that are
// changed on purpose to force a warning). The DOM part (create) is covered by the browser run of T-4.7.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var R = SG.resultView;
  var NODE = SG.test.node;

  function ready() {
    if (!R || !SG.i18n || !SG.store || !SG.pipeline) SG.test.skip('SG.resultView is not loaded here');
  }

  function inLocale(code, fn) {
    SG.i18n.setLocale(code);
    try {
      return fn();
    } finally {
      SG.i18n.setLocale('en');
    }
  }

  var cache = {};

  /** A real result, generated once per test run. */
  function realResult(variantId, difficulty, seed) {
    var key = variantId + '/' + difficulty + '/' + seed;
    if (!cache[key]) {
      cache[key] = SG.pipeline.run({ variantId: variantId, difficulty: difficulty, seed: seed, trace: 'off' }, null);
    }
    return cache[key];
  }

  function withWarnings(result, warnings, rating, difficulty) {
    var copy = Object.assign({}, result, { warnings: warnings });
    if (rating) copy.rating = Object.assign({}, result.rating, rating);
    if (difficulty) copy.config = Object.assign({}, result.config, { difficulty: difficulty });
    return copy;
  }

  function clueCount(givens) {
    var n = 0;
    for (var i = 0; i < givens.length; i++) if (givens[i] > 0) n++;
    return n;
  }

  describe('result view: values of a result', function () {
    it('shows the numbers of a real classic9 result', function () {
      ready();
      var r = realResult('classic9', 'easy', 3);
      var vm = R.viewModel(r);
      expect(vm.variantId).toBe('classic9');
      expect(vm.variantName).toBe(SG.i18n.t('variant.classic9'));
      expect(vm.clues).toBe(clueCount(r.givens));
      expect(vm.cells).toBe(81);
      expect(vm.cluesText).toBe('of 81 cells');
      expect(vm.score).toBe(r.rating.score);
      expect(vm.scoreText).toBe(SG.i18n.formatNumber(Math.round(r.rating.score)));
      expect(vm.requested).toBe('easy');
      expect(vm.achieved).toBe(r.rating.level);
      expect(vm.achievedName).toBe(SG.i18n.t('difficulty.' + r.rating.level));
      expect(vm.requestedName).toBe('Easy');
      expect(vm.exact).toBe(r.rating.level === 'easy');
    });

    it('lists the techniques used with their uses and score, simplest first', function () {
      ready();
      var r = realResult('classic9', 'easy', 3);
      var vm = R.viewModel(r);
      var chart = SG.stepView.chartModel(r.rating.techniqueCounts);
      expect(vm.techniques.map(function (row) { return row.id; }))
        .toEqual(chart.bars.map(function (b) { return b.id; }));
      expect(vm.techniques.length).toBeGreaterThan(0);
      var sum = 0;
      vm.techniques.forEach(function (row) {
        var count = r.rating.techniqueCounts[row.id];
        expect(row.name).toBe(SG.i18n.t('technique.' + row.id));
        expect(row.summary).toBe(SG.i18n.has('technique.' + row.id + '.desc')
          ? SG.i18n.t('technique.' + row.id + '.desc') : '');
        expect(row.count).toBe(count);
        expect(row.countText).toBe(SG.i18n.formatNumber(count));
        expect(row.unitScore).toBe(SG.difficulty.costOf(row.id));
        expect(row.score).toBeCloseTo(row.unitScore *
          (count - 1 + SG.difficulty.SCORING.firstUseMultiplier), 6);
        // The rows are whole numbers that add up to the total (see the "parts" test below).
        expect(Math.abs(Number(row.scoreText.replace(/[^0-9]/g, '')) - Math.round(row.score))).toBeLessThan(2);
        sum += row.score;
      });
      // The technique scores are the technique part of the rating (the empty-cell bonus and the technique
      // floor come on top).
      expect(sum).toBeLessThan(r.rating.score + 1e-6);
      expect(vm.techniqueCounts).toEqual(r.rating.techniqueCounts);
    });

    it('adds the techniques, the empty cells and the raise up to the score, as written in the table', function () {
      ready();
      var withTip = realResult('classic9', 'easy', 3);
      var vmTip = R.viewModel(withTip);
      expect(vmTip.parts.empties).toBeGreaterThan(0);
      ['empties', 'floor'].forEach(function (part) {
        expect(SG.i18n.has('result.techniques.' + part + '.desc')).toBe(true);
      });
      ['easy', 'medium', 'hard'].forEach(function (level) {
        var r = realResult('classic9', level, 3);
        var vm = R.viewModel(r);
        var num = function (text) { return Number(String(text).replace(/[^0-9]/g, '')); };
        var sum = vm.techniques.reduce(function (n, row) { return n + num(row.scoreText); }, 0);
        sum += num(vm.parts.emptyText) + num(vm.parts.raisedText);
        expect(sum).toBe(Math.round(r.rating.score));
        expect(vm.parts.totalText).toBe(vm.scoreText);
        expect(vm.parts.empties).toBe(r.rating.empties);
      });
    });

    it('has no technique row for a puzzle that needs none', function () {
      ready();
      var r = withWarnings(realResult('classic9', 'easy', 3), [], { techniqueCounts: {} });
      expect(R.viewModel(r).techniques).toEqual([]);
    });

    it('shows a killer result with its own name and board size', function () {
      ready();
      var r = realResult('killer', 'easy', 3);
      var vm = R.viewModel(r);
      expect(vm.variantId).toBe('killer');
      expect(vm.variantName).toBe(SG.i18n.t('variant.killer'));
      expect(vm.cells).toBe(r.model.cellCount);
      expect(vm.clues).toBe(clueCount(r.givens));
      expect(vm.requested).toBe('easy');
    });

    it('does not change the result it describes, and says nothing about a missing result', function () {
      ready();
      var r = realResult('classic9', 'easy', 3);
      var before = JSON.stringify([Array.from(r.givens), r.rating, r.timings, r.warnings, r.config]);
      R.viewModel(r);
      expect(JSON.stringify([Array.from(r.givens), r.rating, r.timings, r.warnings, r.config])).toBe(before);
      expect(R.viewModel(null)).toBeNull();
      expect(R.viewModel(undefined)).toBeNull();
    });

    it('creating the panel needs an element', function () {
      ready();
      expect(function () { R.create(null); }).toThrow(TypeError);
    });
  });

  describe('result view: warnings', function () {
    it('has no warning at all for a result without warnings', function () {
      ready();
      var r = realResult('classic9', 'easy', 3);
      [r, withWarnings(r, [])].forEach(function (result) {
        var vm = R.viewModel(result, {});
        expect(vm.warnings).toEqual([]);
        expect(vm.warningKeys).toEqual([]);
        expect(vm.approximate).toBe(false);
        expect(vm.retryAvailable).toBe(false);
      });
      var noList = Object.assign({}, r);
      delete noList.warnings;
      expect(R.viewModel(noList, {}).warnings).toEqual([]);
    });

    it('a forced difficulty.approximate result is flagged and offers the retry', function () {
      ready();
      var forced = withWarnings(realResult('classic9', 'easy', 3), ['difficulty.approximate'],
        { level: 'medium' }, 'hard');
      var vm = R.viewModel(forced, {});
      expect(vm.approximate).toBe(true);
      expect(vm.retryAvailable).toBe(true);
      expect(vm.exact).toBe(false);
      expect(vm.requested).toBe('hard');
      expect(vm.achieved).toBe('medium');
      expect(vm.requestedName).toBe('Hard');
      expect(vm.achievedName).toBe('Medium');
      expect(vm.warningKeys).toEqual(['difficulty.approximate']);
      expect(vm.warnings[0].kind).toBe('approximate');
      expect(vm.warnings[0].text).toBe(SG.i18n.t('difficulty.approximate'));
    });

    it('lists the other warnings translated, each once, without a retry for them', function () {
      ready();
      var r = withWarnings(realResult('classic9', 'easy', 3), ['digger.unsoundTechnique', 'trace.downgraded',
        'extraStructure.wordFallback', 'trace.downgraded', 'made.up.warning']);
      ['en', 'vi'].forEach(function (code) {
        inLocale(code, function () {
          var vm = R.viewModel(r, {});
          expect(vm.warningKeys).toEqual(['digger.unsoundTechnique', 'trace.downgraded',
            'extraStructure.wordFallback', 'made.up.warning']);
          expect(vm.warnings.map(function (w) { return w.kind; })).toEqual(['unsound', 'downgraded', 'other', 'other']);
          vm.warnings.slice(0, 3).forEach(function (w) {
            expect(w.text).toBe(SG.i18n.t(w.key));
            expect(w.text).not.toBe(w.key);
          });
          expect(vm.warnings[3].text).toContain('made.up.warning');
          expect(vm.approximate).toBe(false);
          expect(vm.retryAvailable).toBe(false);
        });
      });
    });
  });

  describe('result view: language', function () {
    it('translates every label and unit, and formats numbers for the language', function () {
      ready();
      var r = withWarnings(realResult('classic9', 'easy', 3), ['difficulty.approximate'],
        { level: 'medium', score: 1234.4, techniqueCounts: { nakedSingle: 3, xWing: 1 } }, 'hard');
      var en = inLocale('en', function () { return R.viewModel(r); });
      var vi = inLocale('vi', function () { return R.viewModel(r); });
      ['achievedName', 'requestedName', 'cluesText', 'variantName']
        .forEach(function (key) { expect(vi[key]).not.toBe(en[key]); });
      expect(vi.warnings[0].text).not.toBe(en.warnings[0].text);
      expect(vi.techniques[0].name).not.toBe(en.techniques[0].name);
      expect(en.scoreText).toBe('1,234');
      expect(vi.scoreText).toBe('1.234');
      expect(en.warnings[0].kind).toBe(vi.warnings[0].kind);
    });

    function fragmentOf(key) {
      return (SG.localeFragments || []).filter(function (f) { return f.en && f.en[key] !== undefined; })[0];
    }

    function holes(text) {
      return (String(text).match(/\{[A-Za-z]+\}/g) || []).sort().join();
    }

    ['result', 'app'].forEach(function (prefix) {
      it('the ' + prefix + '.* fragment has the same keys, placeholders and no empty text in en and vi',
        function () {
          ready();
          var fragment = fragmentOf(prefix === 'result' ? 'result.title' : 'app.status.failed');
          expect(fragment).toBeTruthy();
          var keys = Object.keys(fragment.en).sort();
          expect(Object.keys(fragment.vi).sort()).toEqual(keys);
          expect(keys.length).toBeGreaterThan(8);
          keys.forEach(function (key) {
            expect(key.indexOf(prefix + '.')).toBe(0);
            expect(String(fragment.en[key]).trim()).not.toBe('');
            expect(String(fragment.vi[key]).trim()).not.toBe('');
            expect(holes(fragment.vi[key])).toBe(holes(fragment.en[key]));
          });
          var clashes = SG.i18n.conflicts.filter(function (c) { return c.key.indexOf(prefix + '.') === 0; });
          expect(clashes).toEqual([]);
        });
    });

    ['js/ui/result-view.js', 'js/ui/app.js'].forEach(function (rel) {
      it(rel + ' only asks for keys that exist in both languages', function () {
        ready();
        if (!NODE || !NODE.fs) SG.test.skip('needs the Node file system');
        var text = NODE.fs.readFileSync(NODE.path.join(NODE.root, rel), 'utf8');
        var code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
        var keys = {};
        (code.match(/'((?:app|result|common|unit|variant|difficulty|step|technique|shell|player)\.[A-Za-z0-9_.]*[A-Za-z0-9_])'/g) || [])
          .forEach(function (quoted) { keys[quoted.slice(1, -1)] = true; });
        var list = Object.keys(keys);
        expect(list.length).toBeGreaterThan(3);
        ['en', 'vi'].forEach(function (code2) {
          inLocale(code2, function () {
            var missing = list.filter(function (key) { return !SG.i18n.has(key); });
            expect(missing).toEqual([]);
          });
        });
      });
    });
  });
})();
