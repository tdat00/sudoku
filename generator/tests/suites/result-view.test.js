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

  var BASE = 'file:///Q:/app/index.html?old=1#frag';

  describe('result view: values of a result', function () {
    it('shows the numbers of a real classic9 result', function () {
      ready();
      var r = realResult('classic9', 'easy', 3);
      var vm = R.viewModel(r, { state: SG.store.defaults(), baseUrl: BASE });
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
      expect(vm.hardest).toBe(r.rating.hardestTechnique);
      expect(vm.hardestName).toBe(SG.i18n.t('technique.' + r.rating.hardestTechnique));
      expect(vm.attempts).toBe(r.attempts);
      expect(vm.attemptsText).toBe(SG.i18n.t('unit.attempt', { count: r.attempts }));
      expect(vm.seed).toBe('3');
    });

    it('lists the time of the seven steps and their total, and the technique chart', function () {
      ready();
      var r = realResult('classic9', 'easy', 3);
      var vm = R.viewModel(r, {});
      expect(vm.steps.map(function (s) { return s.id; })).toEqual(SG.stepView.STEP_IDS);
      vm.steps.forEach(function (s) {
        expect(s.name).toBe(SG.i18n.t('step.' + s.id + '.name'));
        expect(s.ms).toBe(r.timings[s.id]);
        expect(s.text).toBe(SG.i18n.formatDuration(r.timings[s.id]));
        expect(s.ratio).toBeGreaterThanOrEqual(0);
        expect(s.ratio).toBeLessThanOrEqual(1);
      });
      expect(Math.max.apply(null, vm.steps.map(function (s) { return s.ratio; }))).toBe(1);
      var sum = 0;
      Object.keys(r.timings).forEach(function (id) { sum += r.timings[id]; });
      expect(vm.totalMs).toBeCloseTo(sum, 6);
      expect(vm.totalText).toBe(SG.i18n.formatDuration(vm.totalMs));
      var chart = SG.stepView.chartModel(r.rating.techniqueCounts);
      expect(vm.chart.bars.map(function (b) { return b.id; })).toEqual(chart.bars.map(function (b) { return b.id; }));
      expect(vm.chart.empty).toBe(false);
      expect(vm.techniqueCounts).toEqual(r.rating.techniqueCounts);
    });

    it('shows a killer result with its own name and board size', function () {
      ready();
      var r = realResult('killer', 'easy', 3);
      var vm = R.viewModel(r, {});
      expect(vm.variantId).toBe('killer');
      expect(vm.variantName).toBe(SG.i18n.t('variant.killer'));
      expect(vm.cells).toBe(r.model.cellCount);
      expect(vm.clues).toBe(clueCount(r.givens));
      expect(vm.requested).toBe('easy');
      expect(vm.previewAlt).toContain(vm.variantName);
    });

    it('does not change the result it describes, and says nothing about a missing result', function () {
      ready();
      var r = realResult('classic9', 'easy', 3);
      var before = JSON.stringify([Array.from(r.givens), r.rating, r.timings, r.warnings, r.config]);
      R.viewModel(r, { state: SG.store.defaults(), baseUrl: BASE, showSolution: true });
      expect(JSON.stringify([Array.from(r.givens), r.rating, r.timings, r.warnings, r.config])).toBe(before);
      expect(R.viewModel(null, {})).toBeNull();
      expect(R.viewModel(undefined)).toBeNull();
    });

    it('reports the solution switch from the context', function () {
      ready();
      var r = realResult('classic9', 'easy', 3);
      expect(R.viewModel(r, { showSolution: true }).solutionShown).toBe(true);
      expect(R.viewModel(r, {}).solutionShown).toBe(false);
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

  describe('result view: share link', function () {
    function parse(link) {
      return SG.store.parseUrl(link.slice(link.indexOf('?')));
    }

    it('reproduces the configuration of the result, generates on load and drops the old query', function () {
      ready();
      var r = realResult('classic9', 'easy', 3);
      var vm = R.viewModel(r, { state: SG.store.defaults(), baseUrl: BASE });
      expect(vm.shareUrl.indexOf('file:///Q:/app/index.html?')).toBe(0);
      expect(vm.shareUrl).not.toContain('old=1');
      expect(vm.shareUrl).not.toContain('#frag');
      expect(vm.shareUrl).toContain('auto=1');
      expect(vm.shareUrl).toContain('seed=3');
      expect(vm.shareUrl).not.toContain('trace=');
      var parsed = parse(vm.shareUrl);
      expect(parsed.auto).toBe(true);
      var config = SG.store.toConfig(parsed);
      ['variantId', 'difficulty', 'seed', 'symbolMode', 'symmetry', 'digOrder', 'maxAttempts', 'variantOptions']
        .forEach(function (key) { expect(config[key]).toEqual(r.config[key]); });
      expect(R.shareLink(r, { state: SG.store.defaults(), baseUrl: BASE })).toBe(vm.shareUrl);
    });

    it('carries the seed that was used even when the seed field was blank', function () {
      ready();
      var random = SG.pipeline.run({ variantId: 'classic4', difficulty: 'easy', trace: 'off' }, null);
      var state = Object.assign({}, SG.store.defaults(), { variantId: 'classic4', difficulty: 'easy', seed: '' });
      var vm = R.viewModel(random, { state: state, baseUrl: BASE });
      expect(vm.seed).toBe(String(random.seed));
      expect(SG.store.toConfig(parse(vm.shareUrl)).seed).toBe(random.seed);
    });

    it('opens THIS puzzle, whatever the form says now', function () {
      ready();
      var r = realResult('classic9', 'easy', 3);
      var other = Object.assign({}, SG.store.defaults(), { variantId: 'killer', difficulty: 'hard', seed: '99' });
      var vm = R.viewModel(r, { state: other, baseUrl: BASE });
      var config = SG.store.toConfig(parse(vm.shareUrl));
      expect(config.variantId).toBe('classic9');
      expect(config.difficulty).toBe('easy');
      expect(config.seed).toBe(3);
    });

    it('keeps the variant options of the puzzle', function () {
      ready();
      var def = SG.variants.get('killer');
      var item = SG.variants.optionsOf(def).filter(function (o) { return o.type !== 'text'; })[0];
      var values = SG.variants.defaultOptions(def);
      var other = item.type === 'boolean' ? !item.default
        : (item.choices.length > 0 ? item.choices.map(function (c) { return c.value; })
          .filter(function (v) { return v !== item.default; })[0] : item.max);
      var options = {};
      options[item.id] = other;
      var r = Object.assign({}, realResult('killer', 'easy', 3), {
        config: Object.assign({}, realResult('killer', 'easy', 3).config, { variantOptions: Object.assign(values, options) })
      });
      var vm = R.viewModel(r, { state: SG.store.defaults(), baseUrl: BASE });
      expect(vm.shareUrl).toContain('o.' + item.id + '=');
      expect(SG.store.toConfig(parse(vm.shareUrl)).variantOptions[item.id]).toEqual(other);
    });

    it('has no link for an imported puzzle, with or without a seed (the form seed would open another one)',
      function () {
        ready();
        var r = realResult('classic9', 'easy', 3);
        var state = Object.assign({}, SG.store.defaults(), { seed: '777' });
        var noSeed = Object.assign({}, r, { seed: null, source: 'import' });
        noSeed.config = Object.assign({}, r.config, { seed: null });
        var vm = R.viewModel(noSeed, { state: state, baseUrl: BASE });
        expect(vm.imported).toBe(true);
        expect(vm.shareUrl).toBe('');
        expect(vm.seed).toBe('');
        expect(R.shareLink(noSeed, { state: state, baseUrl: BASE })).toBe('');
        expect(R.shareLink(Object.assign({}, r, { source: 'import' }), { state: state, baseUrl: BASE })).toBe('');
        // The app says so through the context as well.
        var flagged = R.viewModel(r, { state: state, baseUrl: BASE, imported: true });
        expect(flagged.imported).toBe(true);
        expect(flagged.shareUrl).toBe('');
        // A generated puzzle keeps its link.
        var generated = R.viewModel(r, { state: state, baseUrl: BASE });
        expect(generated.imported).toBe(false);
        expect(generated.shareUrl).toContain('seed=3');
      });

    it('leaves the link empty when there is no store, and handles a missing context', function () {
      ready();
      var r = realResult('classic9', 'easy', 3);
      expect(R.shareState(r, null).seed).toBe('3');
      expect(R.shareState(r, { theme: 'dark' }).theme).toBe('dark');
      expect(typeof R.viewModel(r).shareUrl).toBe('string');
    });
  });

  describe('result view: language', function () {
    it('translates every label and unit, and formats numbers for the language', function () {
      ready();
      var r = withWarnings(realResult('classic9', 'easy', 3), ['difficulty.approximate'],
        { level: 'medium', score: 1234.4 }, 'hard');
      r.timings = { configure: 100, buildModel: 0, fullGrid: 0, extraStructure: 0, dig: 1400, rate: 0, tune: 0 };
      var en = inLocale('en', function () { return R.viewModel(r, {}); });
      var vi = inLocale('vi', function () { return R.viewModel(r, {}); });
      ['achievedName', 'requestedName', 'hardestName', 'attemptsText', 'cluesText', 'previewAlt', 'variantName']
        .forEach(function (key) { expect(vi[key]).not.toBe(en[key]); });
      expect(vi.warnings[0].text).not.toBe(en.warnings[0].text);
      expect(vi.steps[0].name).not.toBe(en.steps[0].name);
      expect(en.totalText).toBe('1.5 s');
      expect(vi.totalText).toBe('1,5 giây');
      expect(en.scoreText).toBe('1,234');
      expect(vi.scoreText).toBe('1.234');
      expect(en.warnings[0].kind).toBe(vi.warnings[0].kind);
      expect(en.shareUrl).toBe(vi.shareUrl);
      expect(en.seed).toBe(vi.seed);
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
          var fragment = fragmentOf(prefix === 'result' ? 'result.title' : 'app.status.ready');
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
