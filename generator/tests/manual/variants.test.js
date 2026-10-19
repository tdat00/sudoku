// Variant test suite (task T-5.10): ONE sweep that runs over SG.variants.list(), so a variant added later
// is tested without editing this file. It applies the acceptance criteria CV1-CV7 of task.md section P5 to
// every registered variant (CV8 is the sweep itself):
//
//   CV0  the definition and its difficulty spec are sound (levels, symbol modes, options, clue floor)
//   CV1  every model the variant builds passes SG.model.validate (default options and every option value)
//   CV2  full grids are valid for N seeds
//   CV3  puzzles at EVERY level of difficultySupport, and the other levels are refused
//   CV4  invariants I1-I7 (design.md section 15.3); I6 uses the variant's own floor (spec().minClues)
//   CV5  the same seed gives the same puzzle
//   CV6  soft only: no generation may hang (the milestones of design.md 9.1 are asserted by perf.test.js)
//   CV7  the variant name, its option labels / hints / choices and difficulty.<level> exist in both locale
//        packs (skipped while SG.i18n / SG.locales do not exist)
//
// The checks are plain functions of (definition, context): `SG.test.variantSweep.sweepVariant(def)` runs
// all of them on any definition, registered or not, and reports pass / fail / skip per check. Default
// volume: 5 grid seeds and 3 puzzles per level (3 and 2 for the heavy boards); SG_DEEP=1 (Node) or
// SG.test.deep = true (browser) gives the full 50 seeds and 20 puzzles per level.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;

  var DEEP = (typeof process !== 'undefined' && process.env && process.env.SG_DEEP === '1') ||
    (SG.test && SG.test.deep === true);

  /** Boards whose puzzles take a second or more: they get the smaller default volume. */
  var HEAVY = ['samurai', 'sohei', 'flower', 'mega16', 'butterfly'];

  /** The 15 variants of the project: the sweep must cover each of them (a removed one is a regression). */
  var EXPECTED_IDS = ['classic4', 'classic6', 'classic9', 'mega12', 'mega16', 'diagonalX', 'hyper',
    'jigsaw9', 'killer', 'greaterThan', 'samurai', 'sohei', 'butterfly', 'flower', 'wordoku'];

  var SLOW = 900000;
  var SANITY_MS = 60000;
  var LEVELS = SG.difficulty.LEVELS;

  function now() {
    return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  }

  function volumeOf(def) {
    var heavy = HEAVY.indexOf(def.id) !== -1;
    return {
      gridSeeds: DEEP ? 50 : (heavy ? 3 : 5),
      perLevel: DEEP ? 20 : (heavy ? 2 : 3)
    };
  }

  function clueCount(givens) {
    var n = 0;
    for (var i = 0; i < givens.length; i++) if (givens[i] !== 0) n++;
    return n;
  }

  function same(a, b) {
    return Array.from(a).join(',') === Array.from(b).join(',');
  }

  function isCode(thrown, code) {
    return thrown instanceof SG.errors.GenerationError && thrown.code === code;
  }

  /** The error that fn throws, or null. */
  function thrownBy(fn) {
    try { fn(); } catch (e) { return e; }
    return null;
  }

  // ===========================================================================================
  // Corpus: the puzzles every check of one variant shares (generated once, on first use)
  // ===========================================================================================

  var contexts = new WeakMap();

  function generate(def, level, seed) {
    var started = now();
    var result = SG.pipeline.run({ variantId: def.id, difficulty: level, seed: seed, trace: 'off' }, null,
      SG.budget.create({ ms: 240000 }));
    return { level: level, seed: seed, result: result, ms: now() - started };
  }

  /** Per-definition state of the sweep. `corpus()` generates perLevel puzzles for each supported level. */
  function contextOf(def) {
    var ctx = contexts.get(def);
    if (ctx !== undefined) return ctx;
    var volume = volumeOf(def);
    var corpus = null;
    ctx = {
      volume: volume,
      corpus: function () {
        if (corpus === null) {
          corpus = {};
          def.difficultySupport.forEach(function (level) {
            corpus[level] = [];
            for (var seed = 1; seed <= volume.perLevel; seed++) {
              corpus[level].push(generate(def, level, seed));
            }
          });
        }
        return corpus;
      }
    };
    contexts.set(def, ctx);
    return ctx;
  }

  // ===========================================================================================
  // The checks. Each one throws on failure (expect() or Error) and returns normally on success.
  // ===========================================================================================

  function buildModel(def, options, seed) {
    return def.build(options || {}, SG.rng.create(seed || 1).fork('model'));
  }

  /** Values worth building a model with: both ends of a slider, every choice, both booleans. */
  function alternativesOf(option) {
    if (option.type === 'slider') return [option.min, option.max];
    if (option.type === 'select') return option.choices.map(function (c) { return c.value; });
    if (option.type === 'boolean') return [false, true];
    return [];
  }

  function checkDefinition(def) {
    expect(typeof def.id).toBe('string');
    expect(def.group).toMatch(/\S/);
    expect(def.difficultySupport.length).toBeGreaterThan(0);
    var ranks = def.difficultySupport.map(function (l) { return SG.difficulty.levelIndex(l); });
    expect(ranks).toEqual(ranks.slice().sort(function (a, b) { return a - b; }));
    expect(new Set(def.difficultySupport).size).toBe(def.difficultySupport.length);
    expect(def.symbolModes).toContain(def.defaultSymbolMode);

    var model = buildModel(def);
    expect(model.variantId).toBe(def.id);
    expect(model.digits).toBe(def.digits);
    SG.variants.optionsOf(def);

    LEVELS.forEach(function (level) {
      var supported = def.difficultySupport.indexOf(level) !== -1;
      expect(SG.difficulty.isSupported(level, model)).toBe(supported);
      if (!supported) return;
      var spec = SG.difficulty.spec(level, model);
      expect(spec.level).toBe(level);
      expect(Number.isInteger(spec.minClues) && spec.minClues >= 0).toBe(true);
      expect(spec.maxClues).toBeGreaterThanOrEqual(spec.minClues);
      expect(spec.minClues).toBeLessThanOrEqual(model.cellCount);
      expect(spec.min).toBeLessThan(spec.max);
      expect(spec.allowedTechniques.length).toBeGreaterThan(0);
    });
  }

  function checkModels(def) {
    var model = buildModel(def);
    var report = SG.model.validate(model);
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
    expect(model.variantId).toBe(def.id);
    expect(model.digits).toBe(def.digits);

    // Every value of every option builds a valid model too (text options keep their default).
    var defaults = SG.variants.defaultOptions(def);
    SG.variants.optionsOf(def).forEach(function (option) {
      alternativesOf(option).forEach(function (value) {
        var options = Object.assign({}, defaults);
        options[option.id] = value;
        var built = buildModel(def, options);
        var verdict = SG.model.validate(built);
        if (!verdict.ok) {
          throw new Error(def.id + ' with ' + option.id + '=' + value + ': ' + verdict.errors.join('; '));
        }
        expect(built.variantId).toBe(def.id);
      });
    });
  }

  function checkFullGrids(def, ctx) {
    var seen = {};
    for (var seed = 1; seed <= ctx.volume.gridSeeds; seed++) {
      var rng = SG.rng.create(seed);
      var model = def.build({}, rng.fork('model'));
      var grid = SG.fullGrid.generate(model, rng.fork('grid#1'), SG.budget.create({ ms: 120000 }));
      if (!SG.model.isSolution(model, grid)) {
        throw new Error(def.id + ': seed ' + seed + ' gave an invalid grid');
      }
      expect(grid).toHaveLength(model.cellCount);
      seen[Array.from(grid).join('')] = true;
    }
    // Seeds must matter, except on the tiny boards that have only a few hundred grids.
    if (ctx.volume.gridSeeds >= 3 && def.digits >= 6) expect(Object.keys(seen).length).toBeGreaterThan(1);
  }

  function checkLevels(def, ctx) {
    var corpus = ctx.corpus();
    def.difficultySupport.forEach(function (level) {
      var puzzles = corpus[level];
      expect(puzzles).toHaveLength(ctx.volume.perLevel);
      var exact = 0;
      puzzles.forEach(function (p) {
        var r = p.result;
        expect(r.config.difficulty).toBe(level);
        expect(r.config.variantId).toBe(def.id);
        expect(r.givens).toHaveLength(r.model.cellCount);
        expect(r.solution).toHaveLength(r.model.cellCount);
        expect(LEVELS).toContain(r.rating.level);
        var hit = r.rating.level === level;
        if (hit) exact++;
        // A miss is never silent: the closest puzzle comes with 'difficulty.approximate'.
        expect(r.warnings.indexOf('difficulty.approximate') !== -1).toBe(!hit);
      });
      if (exact === 0) {
        throw new Error(def.id + ' ' + level + ': none of ' + puzzles.length + ' puzzles hit it');
      }
      if (DEEP) expect(exact / puzzles.length).toBeGreaterThanOrEqual(0.5);
    });

    // A level the variant does not list is refused up front.
    LEVELS.forEach(function (level) {
      if (def.difficultySupport.indexOf(level) !== -1) return;
      var thrown = thrownBy(function () {
        SG.pipeline.run({ variantId: def.id, difficulty: level, seed: 1, trace: 'off' }, null);
      });
      expect(isCode(thrown, 'difficulty.unsupportedLevel')).toBe(true);
    });
  }

  /** I7: every deduction the oracle's techniques make on this puzzle agrees with the solution. */
  function checkSoundness(result, level) {
    var spec = SG.difficulty.spec(level, result.model);
    var report = SG.logicalSolver.solve(result.model, result.givens, {
      allowedTechniques: spec.allowedTechniques, collectSteps: true, assumeUniqueness: false
    });
    report.steps.forEach(function (step) {
      step.placements.forEach(function (p) {
        if (result.solution[p[0]] !== p[1]) throw new Error(step.technique + ' placed a wrong value');
      });
      step.eliminations.forEach(function (e) {
        if (result.solution[e[0]] === e[1]) throw new Error(step.technique + ' removed the true value');
      });
    });
  }

  function checkInvariants(def, ctx) {
    var corpus = ctx.corpus();
    def.difficultySupport.forEach(function (level) {
      corpus[level].forEach(function (p, index) {
        var r = p.result;
        var m = r.model;
        var where = def.id + ' ' + level + ' seed ' + p.seed;
        var spec = SG.difficulty.spec(level, m);

        // I1: exactly one solution.
        if (SG.dfs.countSolutions(m, r.givens, 2) !== 1) throw new Error(where + ': not unique (I1)');
        // I2: the givens are a subset of the solution.
        for (var c = 0; c < m.cellCount; c++) {
          var g = r.givens[c];
          if (g < 0 || g > m.digits || (g !== 0 && g !== r.solution[c])) {
            throw new Error(where + ': cell ' + c + ' contradicts the solution (I2)');
          }
        }
        // I3: the solution satisfies every unit, cage and inequality.
        if (!SG.model.isSolution(m, r.solution)) throw new Error(where + ': invalid solution (I3)');
        // I5: a puzzle rated as requested has its score in the band and a hardest group of the level.
        if (r.rating.level === level) {
          if (!(r.rating.score >= spec.min && r.rating.score < spec.max)) {
            throw new Error(where + ': score ' + r.rating.score + ' outside [' + spec.min + ', ' +
              spec.max + ') (I5)');
          }
          var group = r.rating.hardestGroup === null ? 'basic' : r.rating.hardestGroup;
          if (spec.allowedGroups.indexOf(group) === -1) {
            throw new Error(where + ': group ' + group + ' (I5)');
          }
        }
        // I6: at least the clue floor of the variant.
        if (clueCount(r.givens) < spec.minClues) {
          throw new Error(where + ': ' + clueCount(r.givens) + ' clues < ' + spec.minClues + ' (I6)');
        }
        // I7 (soundness) on the first puzzle of each level.
        if (index === 0) checkSoundness(r, level);
      });
    });
  }

  function checkDeterminism(def, ctx) {
    var corpus = ctx.corpus();
    def.difficultySupport.forEach(function (level) {
      var first = corpus[level][0];
      var again = generate(def, level, first.seed).result;
      var a = first.result;
      if (!same(again.givens, a.givens)) throw new Error(def.id + ' ' + level + ': the givens differ (I4)');
      expect(same(again.solution, a.solution)).toBe(true);
      expect(again.seed).toBe(a.seed);
      expect(again.rating.level).toBe(a.rating.level);
    });
  }

  function checkSanity(def, ctx) {
    var corpus = ctx.corpus();
    def.difficultySupport.forEach(function (level) {
      corpus[level].forEach(function (p) {
        if (p.ms > SANITY_MS) {
          throw new Error(def.id + ' ' + level + ' seed ' + p.seed + ': ' + Math.round(p.ms) + ' ms');
        }
      });
    });
  }

  // ---- CV7 ----------------------------------------------------------------------------------

  /** { en: Object, vi: Object } of the merged locale packs, or null while they do not exist. */
  function localePacks() {
    if (!SG.i18n || typeof SG.i18n.keys !== 'function' || !SG.locales) return null;
    var en = SG.i18n.keys('en');
    var vi = SG.i18n.keys('vi');
    if (en.length === 0 || vi.length === 0) return null;
    return { en: SG.locales.en, vi: SG.locales.vi };
  }

  function hasKey(pack, key) {
    var own = Object.prototype.hasOwnProperty;
    return own.call(pack, key) || own.call(pack, key + '_other');
  }

  function placeholders(text) {
    return (String(text).match(/\{[A-Za-z0-9_]+\}/g) || []).sort().join(',');
  }

  /** Every translation key the UI reads for this variant. */
  function keysOf(def) {
    var keys = [def.i18nKey];
    SG.variants.optionsOf(def).forEach(function (o) {
      [o.labelKey, o.hintKey, o.minLabelKey, o.maxLabelKey, o.defaultLabelKey, o.placeholderKey]
        .forEach(function (k) { if (k !== null) keys.push(k); });
      o.choices.forEach(function (c) { if (c.labelKey !== null) keys.push(c.labelKey); });
    });
    def.difficultySupport.forEach(function (level) { keys.push('difficulty.' + level); });
    return keys.filter(function (k, i) { return keys.indexOf(k) === i; });
  }

  function checkLocales(def) {
    var packs = localePacks();
    if (packs === null) SG.test.skip('the locale packs (SG.i18n / SG.locales) do not exist yet');
    var missing = [];
    var mismatched = [];
    keysOf(def).forEach(function (key) {
      var inEn = hasKey(packs.en, key);
      var inVi = hasKey(packs.vi, key);
      if (!inEn || !inVi) missing.push(key + (inEn ? ' (vi)' : inVi ? ' (en)' : ' (en, vi)'));
      else if (placeholders(packs.en[key]) !== placeholders(packs.vi[key])) mismatched.push(key);
    });
    expect(missing).toEqual([]);
    expect(mismatched).toEqual([]);
  }

  var CHECKS = [
    { id: 'CV0', title: 'the definition and its difficulty spec are sound', run: checkDefinition },
    { id: 'CV1', title: 'every model passes model.validate (all option values too)', run: checkModels },
    { id: 'CV2', title: 'full grids are valid for every seed', run: checkFullGrids },
    { id: 'CV3', title: 'puzzles at every supported level; other levels are refused', run: checkLevels },
    { id: 'CV4', title: 'invariants I1-I7 hold (I6 with the variant\'s clue floor)', run: checkInvariants },
    { id: 'CV5', title: 'the same seed gives the same puzzle', run: checkDeterminism },
    { id: 'CV6', title: 'soft: generation never hangs (milestones: perf.test.js)', run: checkSanity },
    { id: 'CV7', title: 'name, options and levels exist in both locale packs', run: checkLocales }
  ];

  /**
   * Runs every check on one variant definition (registered or not) and reports instead of throwing.
   * @param {VariantDef} def
   * @param {{only: string[]}} [options]  Check ids to run (default: all).
   * @returns {{id: string, results: Object<string, {status: string, message: string}>, failures: string[]}}
   */
  function sweepVariant(def, options) {
    var only = options && options.only ? options.only : null;
    var ctx = contextOf(def);
    var results = {};
    var failures = [];
    CHECKS.forEach(function (check) {
      if (only !== null && only.indexOf(check.id) === -1) return;
      try {
        check.run(def, ctx);
        results[check.id] = { status: 'pass', message: '' };
      } catch (err) {
        if (err && err.name === 'SkipSignal') {
          results[check.id] = { status: 'skip', message: err.reason };
        } else {
          results[check.id] = { status: 'fail', message: err && err.message ? err.message : String(err) };
          failures.push(check.id + ': ' + results[check.id].message);
        }
      }
    });
    return { id: def.id, results: results, failures: failures };
  }

  /** The variants the sweep covers: whatever is registered right now. */
  function variantsUnderTest() {
    return SG.variants.list();
  }

  SG.test.variantSweep = {
    CHECKS: CHECKS,
    sweepVariant: sweepVariant,
    variantsUnderTest: variantsUnderTest,
    volumeOf: volumeOf
  };

  // ===========================================================================================
  // The sweep itself (CV8): one describe per registered variant
  // ===========================================================================================

  var covered = variantsUnderTest().map(function (def) { return def.id; });

  variantsUnderTest().forEach(function (def) {
    describe('variants: ' + def.id, function () {
      CHECKS.forEach(function (check) {
        it(check.id + ' ' + check.title, function () {
          check.run(def, contextOf(def));
        }, SLOW);
      });
    });
  });

  // ===========================================================================================
  // CV8: variants that are added later are covered automatically
  // ===========================================================================================

  describe('variants: the sweep covers every registered variant', function () {
    function fakeDef(id, overrides) {
      return Object.assign({
        id: id, i18nKey: 'variant.' + id, group: 'test', digits: 4,
        difficultySupport: ['veryEasy'], defaultSymbolMode: 'digits', symbolModes: ['digits'],
        options: [],
        build: function () { return SG.fixtures.models.boxGrid(id, 2, 2); }
      }, overrides);
    }

    function withRegistered(def, fn) {
      SG.variants.register(def);
      try {
        return fn();
      } finally {
        SG.variants.unregister(def.id);
      }
    }

    it('has a describe block for each of the 15 variants, found through SG.variants.list()', function () {
      EXPECTED_IDS.forEach(function (id) { expect(covered).toContain(id); });
      expect(covered.length).toBeGreaterThanOrEqual(15);
    });

    it('lists a variant registered later, and the sweep runs every check on it', function () {
      var def = fakeDef('sweepProbe');
      withRegistered(def, function () {
        expect(variantsUnderTest().map(function (d) { return d.id; })).toContain('sweepProbe');
        var report = sweepVariant(SG.variants.get('sweepProbe'));
        expect(Object.keys(report.results)).toEqual(CHECKS.map(function (c) { return c.id; }));
        var hard = report.failures.filter(function (f) { return f.indexOf('CV7') !== 0; });
        expect(hard).toEqual([]);
        // The probe has no translations: CV7 must notice, or skip while there are no locale packs.
        expect(report.results.CV7.status).toBe(localePacks() === null ? 'skip' : 'fail');
      });
      expect(variantsUnderTest().map(function (d) { return d.id; })).not.toContain('sweepProbe');
    }, SLOW);

    it('checks I6 against the clue floor the variant declares', function () {
      var def = fakeDef('sweepFloor', { clueFloor: { veryEasy: 3, easy: 2 }, difficultySupport: ['veryEasy', 'easy'] });
      withRegistered(def, function () {
        var report = sweepVariant(SG.variants.get('sweepFloor'), { only: ['CV0', 'CV4'] });
        expect(report.failures).toEqual([]);
        var model = def.build();
        expect(SG.difficulty.spec('veryEasy', model).minClues).toBe(3);
        expect(SG.difficulty.spec('easy', model).minClues).toBe(2);
      });
    }, SLOW);

    it('has teeth: an invalid model fails CV1, and puzzles below the declared floor fail CV4', function () {
      var broken = fakeDef('sweepBroken', {
        build: function () {
          // No unit lists cell 0 any more: model.validate reports V3.
          var m = SG.fixtures.models.boxGrid('sweepBroken', 2, 2);
          return Object.assign({}, m, {
            units: m.units.filter(function (u) { return Array.prototype.indexOf.call(u, 0) === -1; })
          });
        }
      });
      withRegistered(broken, function () {
        var report = sweepVariant(SG.variants.get('sweepBroken'), { only: ['CV1'] });
        expect(report.results.CV1.status).toBe('fail');
      });

      // The floor is read at check time: puzzles generated under a floor of 0 break a floor of 16.
      var floor = { value: 0 };
      var moving = fakeDef('sweepMoving', {
        clueFloor: function () { return floor.value; }
      });
      withRegistered(moving, function () {
        contextOf(SG.variants.get('sweepMoving')).corpus();
        floor.value = 16;
        var report = sweepVariant(SG.variants.get('sweepMoving'), { only: ['CV4'] });
        expect(report.results.CV4.status).toBe('fail');
        expect(report.results.CV4.message).toMatch('I6');
      });
    }, SLOW);
  });

  // ===========================================================================================
  // D5: the normalised option schema (SG.variants.optionsOf / defaultOptions / sanitizeOptions)
  // ===========================================================================================

  describe('variants: the normalised option schema', function () {
    var V = SG.variants;
    var KEYS = ['id', 'type', 'labelKey', 'hintKey', 'default', 'min', 'max', 'step', 'minLabelKey',
      'maxLabelKey', 'defaultLabelKey', 'choices', 'advanced', 'visibleWhen', 'maxLength', 'placeholderKey'];
    var TYPES = ['slider', 'select', 'boolean', 'text'];

    var JUNK = [undefined, null, NaN, Infinity, -Infinity, '', '   ', 'abc', 'true', 'false', '0', '1',
      '2.5', 0, 1, -1, 3.14159, 1e9, -1e9, true, false, {}, [], [1], { a: 1 }, new Array(60).join('x'),
      '\u0007bell ', ' pad '];

    function isValid(option, value) {
      if (option.type === 'slider') {
        return typeof value === 'number' && value >= option.min && value <= option.max;
      }
      if (option.type === 'select') {
        return option.choices.some(function (c) { return c.value === value; });
      }
      if (option.type === 'boolean') return typeof value === 'boolean';
      return typeof value === 'string' && (option.maxLength === null || value.length <= option.maxLength) &&
        value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value);
    }

    function throwsInvalidDef(fn) {
      expect(isCode(thrownBy(fn), 'variant.invalidDef')).toBe(true);
    }

    variantsUnderTest().forEach(function (def) {
      describe(def.id + ' options', function () {
        var options = V.optionsOf(def.id);

        it('normalises every option declared by the variant, in declaration order', function () {
          expect(options).toHaveLength(def.options.length);
          options.forEach(function (o, i) {
            expect(o.id).toBe(def.options[i].id);
            expect(Object.keys(o).sort()).toEqual(KEYS.slice().sort());
            expect(TYPES).toContain(o.type);
            expect(typeof o.labelKey).toBe('string');
            expect(o.labelKey).toMatch(/\S/);
            expect(o.hintKey === null || typeof o.hintKey === 'string').toBe(true);
            expect(typeof o.advanced).toBe('boolean');
            expect(Array.isArray(o.choices)).toBe(true);
            if (o.type === 'slider') {
              expect(o.min).toBeLessThanOrEqual(o.max);
              expect(o.step).toBeGreaterThan(0);
            } else {
              expect([o.min, o.max, o.step]).toEqual([null, null, null]);
            }
            if (o.type === 'select') {
              expect(o.choices.length).toBeGreaterThan(0);
              o.choices.forEach(function (c) { expect(typeof c.labelKey).toBe('string'); });
            } else {
              expect(o.choices).toEqual([]);
            }
            if (o.type !== 'text') expect([o.maxLength, o.placeholderKey]).toEqual([null, null]);
          });
        });

        it('has defaults that are valid values, and defaultOptions lists them all', function () {
          var defaults = V.defaultOptions(def.id);
          expect(Object.keys(defaults)).toEqual(options.map(function (o) { return o.id; }));
          options.forEach(function (o) {
            expect(defaults[o.id]).toBe(o.default);
            expect(isValid(o, o.default)).toBe(true);
          });
          expect(V.sanitizeOptions(def.id, defaults)).toEqual(defaults);
        });

        it('sanitizes any value to a valid one, idempotently, and drops unknown ids', function () {
          options.forEach(function (o) {
            JUNK.forEach(function (junk) {
              var raw = {};
              raw[o.id] = junk;
              var once = V.sanitizeOptions(def.id, raw);
              if (!isValid(o, once[o.id])) {
                throw new Error(o.id + ': ' + String(junk) + ' became ' + JSON.stringify(once[o.id]));
              }
              expect(V.sanitizeOptions(def.id, once)).toEqual(once);
            });
            alternativesOf(o).forEach(function (value) {
              var raw = {};
              raw[o.id] = value;
              expect(V.sanitizeOptions(def.id, raw)).toEqual(raw);
            });
          });
          var unknown = { notAnOption: 1, constructor: 2, __proto__: { x: 1 } };
          expect(V.sanitizeOptions(def.id, unknown)).toEqual({});
          [null, undefined, 7, 'text', [], true].forEach(function (raw) {
            expect(V.sanitizeOptions(def.id, raw)).toEqual({});
          });
          expect(V.sanitizeOptions(def.id, {})).toEqual({});
        });

        it('only hands build() options it can build a valid model with', function () {
          var raw = {};
          options.forEach(function (o) {
            if (o.type !== 'text') raw[o.id] = JUNK[(o.id.length * 7) % JUNK.length];
          });
          var clean = Object.assign(V.defaultOptions(def.id), V.sanitizeOptions(def.id, raw));
          expect(SG.model.validate(def.build(clean, SG.rng.create(3).fork('model'))).ok).toBe(true);
        });

        it('returns fresh objects each time (the caller cannot change the definition)', function () {
          var a = V.optionsOf(def.id);
          var b = V.optionsOf(def.id);
          expect(a).toEqual(b);
          if (a.length === 0) return;
          expect(a[0]).not.toBe(b[0]);
          a[0].labelKey = 'changed';
          a[0].choices.push({ value: 'x', labelKey: 'y' });
          expect(V.optionsOf(def.id)[0].labelKey).not.toBe('changed');
          expect(V.optionsOf(def.id)[0].choices).toEqual(b[0].choices);
        });
      });
    });

    it('knows the differences between the declaring variants: aliases and shapes', function () {
      var gt = V.optionsOf('greaterThan')[0];
      expect(gt.type).toBe('boolean');
      expect(gt.hintKey).toBe(V.get('greaterThan').options[0].hintI18nKey);
      expect(gt.labelKey).toBe('option.futoshiki');

      var mega = V.optionsOf('mega12')[0];
      expect(mega.type).toBe('select');
      expect(mega.choices.map(function (c) { return c.value; }))
        .toEqual(V.get('mega12').options[0].choices.map(function (c) { return c.value; }));
      expect(mega.choices[0].labelKey).toBe(V.get('mega12').options[0].choices[0].i18nKey);
      expect(mega.hintKey).toBe(V.get('mega12').options[0].hintKey);

      var killer = V.optionsOf('killer')[0];
      expect([killer.type, killer.step, killer.default]).toEqual(['slider', 1, 0]);
      expect(killer.minLabelKey).toBe('variant.killer.cageSize.small');
      expect(killer.maxLabelKey).toBe('variant.killer.cageSize.large');
      expect(killer.defaultLabelKey).toBe('variant.killer.cageSize.auto');

      var hyper = V.optionsOf('hyper')[0];
      expect([hyper.type, hyper.advanced]).toEqual(['boolean', true]);

      var wordoku = V.optionsOf('wordoku');
      var line = wordoku.filter(function (o) { return o.id === 'line'; })[0];
      var word = wordoku.filter(function (o) { return o.id === 'word'; })[0];
      expect(line.advanced).toBe(true);
      expect(line.visibleWhen).toBe(V.get('wordoku').options[1].visibleWhen);
      expect(word.type).toBe('text');
      expect([word.maxLength, word.placeholderKey]).toEqual([24, 'variant.wordoku.word.placeholder']);
      expect(V.optionsOf('classic9')).toEqual([]);
      expect(V.defaultOptions('classic9')).toEqual({});
    });

    it('clamps, snaps and coerces the way the controls need', function () {
      var killer = V.optionsOf('killer')[0];
      expect(V.sanitizeOptions('killer', { cageSize: 99 })).toEqual({ cageSize: killer.max });
      expect(V.sanitizeOptions('killer', { cageSize: -99 })).toEqual({ cageSize: killer.min });
      expect(V.sanitizeOptions('killer', { cageSize: 1.4 })).toEqual({ cageSize: 1 });
      expect(V.sanitizeOptions('killer', { cageSize: '1' })).toEqual({ cageSize: 1 });
      expect(V.sanitizeOptions('killer', { cageSize: 'many' })).toEqual({ cageSize: killer.default });

      expect(V.sanitizeOptions('jigsaw9', { compactness: 0.123 })).toEqual({ compactness: 0.1 });
      expect(V.sanitizeOptions('jigsaw9', { compactness: 0.35 })).toEqual({ compactness: 0.35 });
      expect(V.sanitizeOptions('jigsaw9', { compactness: 7 })).toEqual({ compactness: 1 });

      ['true', 1, true, 'yes', 'on'].forEach(function (v) {
        expect(V.sanitizeOptions('greaterThan', { futoshiki: v })).toEqual({ futoshiki: true });
      });
      ['false', 0, false, 'no', 'off', ''].forEach(function (v) {
        expect(V.sanitizeOptions('greaterThan', { futoshiki: v })).toEqual({ futoshiki: false });
      });
      expect(V.sanitizeOptions('greaterThan', { futoshiki: { a: 1 } })).toEqual({ futoshiki: false });

      var mega = V.optionsOf('mega16')[0];
      expect(V.sanitizeOptions('mega16', { symbolSet: 'klingon' })).toEqual({ symbolSet: mega.default });
      expect(V.sanitizeOptions('mega16', { symbolSet: mega.choices[1].value }))
        .toEqual({ symbolSet: mega.choices[1].value });

      expect(V.sanitizeOptions('wordoku', { word: '  GEOMETRIC  ' })).toEqual({ word: 'GEOMETRIC' });
      expect(V.sanitizeOptions('wordoku', { word: new Array(40).join('A') }).word).toHaveLength(24);
      expect(V.sanitizeOptions('wordoku', { word: 'AB\u0001CD' })).toEqual({ word: 'ABCD' });
      expect(V.sanitizeOptions('wordoku', { word: 12345 })).toEqual({ word: '12345' });
      expect(V.sanitizeOptions('wordoku', { placement: 'diagonal', language: 'xx' }))
        .toEqual({ placement: 'diagonal', language: V.defaultOptions('wordoku').language });
    });

    it('accepts a definition object as well as an id, and rejects unknown ids', function () {
      var def = V.get('killer');
      expect(V.optionsOf(def)).toEqual(V.optionsOf('killer'));
      expect(V.defaultOptions(def)).toEqual(V.defaultOptions('killer'));
      expect(isCode(thrownBy(function () { V.optionsOf('nope'); }), 'variant.unknown')).toBe(true);
      expect(isCode(thrownBy(function () { V.optionsOf(null); }), 'variant.invalidDef')).toBe(true);
    });

    describe('declarations in other spellings, and malformed ones', function () {
      function declare(options) {
        return {
          id: 'optionProbe', i18nKey: 'variant.optionProbe', group: 'test', digits: 4,
          difficultySupport: ['easy'], defaultSymbolMode: 'digits', symbolModes: ['digits'],
          options: options, build: function () { return null; }
        };
      }

      it('reads labelKey / hintKey / hintI18nKey / i18nKey and plain-value choices', function () {
        var items = V.optionsOf(declare([
          { id: 'a', type: 'boolean', labelKey: 'l.a', hintI18nKey: 'h.a' },
          { id: 'b', type: 'select', i18nKey: 'l.b', hintKey: 'h.b',
            choices: ['x', { value: 'y', labelKey: 'c.y' }] },
          { id: 'c', type: 'slider', i18nKey: 'l.c', min: 2, max: 8 },
          { id: 'd', type: 'text', i18nKey: 'l.d' }
        ]));
        expect([items[0].labelKey, items[0].hintKey, items[0].default]).toEqual(['l.a', 'h.a', false]);
        expect(items[1].choices).toEqual([{ value: 'x', labelKey: null }, { value: 'y', labelKey: 'c.y' }]);
        expect([items[1].labelKey, items[1].default, items[1].hintKey]).toEqual(['l.b', 'x', 'h.b']);
        expect([items[2].min, items[2].max, items[2].step, items[2].default]).toEqual([2, 8, 1, 2]);
        expect([items[3].default, items[3].maxLength]).toEqual(['', null]);
      });

      it('snaps a slider to its step from the minimum', function () {
        var def = declare([
          { id: 's', type: 'slider', i18nKey: 'l.s', min: 1, max: 10, step: 3, default: 4 }
        ]);
        expect(V.sanitizeOptions(def, { s: 5 })).toEqual({ s: 4 });
        expect(V.sanitizeOptions(def, { s: 6 })).toEqual({ s: 7 });
        expect(V.sanitizeOptions(def, { s: 100 })).toEqual({ s: 10 });
      });

      it('refuses a malformed option when it is registered, and when it is read', function () {
        [
          [{ type: 'boolean', i18nKey: 'k' }],
          [{ id: 'x', type: 'knob', i18nKey: 'k' }],
          [{ id: 'x', type: 'boolean' }],
          [{ id: 'x', type: 'slider', i18nKey: 'k' }],
          [{ id: 'x', type: 'slider', i18nKey: 'k', min: 5, max: 1 }],
          [{ id: 'x', type: 'slider', i18nKey: 'k', min: 0, max: 1, default: 2 }],
          [{ id: 'x', type: 'select', i18nKey: 'k' }],
          [{ id: 'x', type: 'select', i18nKey: 'k', choices: ['a'], default: 'b' }],
          [{ id: 'x', type: 'boolean', i18nKey: 'k', default: 'no' }],
          [{ id: 'x', type: 'text', i18nKey: 'k', maxLength: 2, default: 'long' }],
          [{ id: 'x', type: 'boolean', i18nKey: 'k' }, { id: 'x', type: 'boolean', i18nKey: 'k2' }],
          ['not an object']
        ].forEach(function (options) {
          var def = declare(options);
          throwsInvalidDef(function () { V.optionsOf(def); });
          throwsInvalidDef(function () { V.register(def); });
          expect(V.has('optionProbe')).toBe(false);
        });
      });
    });
  });
})();
