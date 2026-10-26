// Difficulty scoring (rating v2, docs/difficulty-rating/report-detailed.md section 5) and the
// difficulty-bounded digger. Covers the score formula and its properties, the nine levels
// and their bands, the level specification, the clue floors, the reference puzzles, and the invariants I1-I6
// of design.md section 15.3 on generated puzzles (I7, the soundness of every technique, is swept over the
// registry in techniques.test.js and once more on every generated puzzle here).
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var D = SG.difficulty;
  var LEVELS = D.LEVELS;
  var model9 = SG.variants.get('classic9').build({}, null);
  var model6 = SG.variants.get('classic6').build({}, null);
  var model4 = SG.variants.get('classic4').build({}, null);
  /** 9x9 and 4x4 boards of an unregistered variant: they support every level. */
  var board9 = SG.fixtures.models.boxGrid('boxGrid9', 3, 3);
  var board4 = SG.fixtures.models.boxGrid('boxGrid4', 2, 2);
  var BANDS = [0, 45, 180, 400, 700, 1000, 1500, 2400, 3600];

  function expectCode(fn, code) {
    var thrown = null;
    try { fn(); } catch (e) { thrown = e; }
    expect(thrown).toBeTruthy();
    expect(thrown instanceof SG.errors.GenerationError).toBe(true);
    expect(thrown.code).toBe(code);
  }

  function idx(level) {
    return D.levelIndex(level);
  }

  function clueCount(givens) {
    var n = 0;
    for (var i = 0; i < givens.length; i++) if (givens[i] !== 0) n++;
    return n;
  }

  function parse(text) {
    return SG.fixtures.classic.parse(text.replace(/\./g, '0'));
  }

  /**
   * Does the technique set of a level solve the puzzle? By default with the uniqueness-free solver of the
   * digger; `assumeUniqueness` lets a puzzle that is known to be unique use the techniques that assume it,
   * as its rating does.
   */
  function solvesWithin(model, givens, level, assumeUniqueness) {
    return SG.logicalSolver.solve(model, givens, {
      allowedTechniques: D.spec(level, model).allowedTechniques,
      collectSteps: false,
      assumeUniqueness: assumeUniqueness === true
    }).solved;
  }

  /** A solver report as SG.logicalSolver would build it, for given counts and empty cells. */
  function fakeReport(counts, empties, solved) {
    var scoring = SG.logicalSolver.SCORING;
    var score = empties * scoring.emptyCellBonus;
    Object.keys(counts).forEach(function (id) {
      score += SG.techniques.get(id).baseCost * (counts[id] - 1 + scoring.firstUseMultiplier);
    });
    return {
      solved: solved !== false,
      status: solved === false ? 'stuck' : 'solved',
      techniqueCounts: counts,
      score: score
    };
  }

  /** The score of section 5.1, computed here independently of the engine. */
  function expectedScore(counts, empties) {
    var peak = 0;
    var work = 0;
    Object.keys(counts).forEach(function (id) {
      if (!(counts[id] > 0)) return;
      peak = Math.max(peak, D.WEIGHTS[id]);
      work += D.WEIGHTS[id] * counts[id];
    });
    var v = 80 * empties / (empties + 40);
    var r = peak > 0 ? 0.25 * peak * Math.log2(1 + work / peak) : 0;
    return Math.round(v + peak + r);
  }

  /** Runs fn with weight overrides and always restores the table. */
  function withWeights(overrides, fn) {
    var saved = {};
    Object.keys(overrides).forEach(function (id) {
      saved[id] = Object.prototype.hasOwnProperty.call(D.WEIGHTS, id) ? D.WEIGHTS[id] : undefined;
      if (overrides[id] === undefined) delete D.WEIGHTS[id];
      else D.WEIGHTS[id] = overrides[id];
    });
    try {
      return fn();
    } finally {
      Object.keys(saved).forEach(function (id) {
        if (saved[id] === undefined) delete D.WEIGHTS[id];
        else D.WEIGHTS[id] = saved[id];
      });
    }
  }

  describe('difficulty: levels', function () {
    it('lists the nine levels, easiest first, and rejects anything else', function () {
      expect(LEVELS).toEqual(['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1',
        'hell2']);
      LEVELS.forEach(function (level, i) { expect(idx(level)).toBe(i); });
      ['impossible', 'hell', 'hell-1', 'hell3'].forEach(function (bad) {
        expectCode(function () { D.levelIndex(bad); }, 'difficulty.unknownLevel');
      });
      expectCode(function () { D.spec('impossible', model9); }, 'difficulty.unknownLevel');
    });

    it('agrees with the list that the variant registry validates difficultySupport against', function () {
      SG.variants.list().forEach(function (def) {
        def.difficultySupport.forEach(function (level) { expect(LEVELS).toContain(level); });
        var order = def.difficultySupport.map(idx);
        expect(order.slice().sort(function (a, b) { return a - b; })).toEqual(order);
      });
      expectCode(function () {
        SG.variants.register({
          id: 'levelProbe', i18nKey: 'variant.levelProbe', group: 'test', digits: 9,
          difficultySupport: ['easy', 'hell'], defaultSymbolMode: 'digits', symbolModes: ['digits'],
          options: [], build: function () { return null; }
        });
      }, 'variant.invalidDef');
      expect(SG.variants.has('levelProbe')).toBe(false);
    });

    it('has one band table: [min, max) bands that tile the scale from 0, with an open top', function () {
      expect(D.TABLE.map(function (row) { return row.min; })).toEqual(BANDS);
      LEVELS.forEach(function (level, i) {
        var band = D.bandOf(level);
        expect(band.min).toBe(BANDS[i]);
        expect(band.max).toBe(i + 1 < BANDS.length ? BANDS[i + 1] : Infinity);
      });
    });

    it('gives every score exactly one level, edges included', function () {
      BANDS.forEach(function (edge, i) {
        expect(D.levelOfScore(edge)).toBe(LEVELS[i]);
        if (i > 0) expect(D.levelOfScore(edge - 1)).toBe(LEVELS[i - 1]);
      });
      expect(D.levelOfScore(0)).toBe('veryEasy');
      expect(D.levelOfScore(1e9)).toBe('hell2');
      [null, undefined, NaN, Infinity, '45'].forEach(function (bad) {
        expect(D.levelOfScore(bad)).toBeNull();
      });
    });
  });

  describe('difficulty: spec(level, model) on a 9x9 board', function () {
    var specs = LEVELS.map(function (level) { return D.spec(level, board9); });

    it('returns the fields of design.md section 13.7', function () {
      specs.forEach(function (spec, i) {
        expect(spec.level).toBe(LEVELS[i]);
        var numbers = ['min', 'max', 'minClues', 'maxClues', 'minCluesPerUnit', 'extraPasses', 'scale'];
        numbers.forEach(function (key) {
          expect(typeof spec[key]).toBe('number');
        });
        expect(Array.isArray(spec.allowedTechniques)).toBe(true);
        expect(Array.isArray(spec.allowedGroups)).toBe(true);
        expect(SG.symmetry.KINDS).toContain(spec.symmetryDefault);
      });
      expect(specs[0].symmetryDefault).toBe('rotational180');
    });

    it('has the bands of the table, not scaled', function () {
      specs.forEach(function (spec, i) {
        expect(spec.min).toBe(BANDS[i]);
        expect(spec.max).toBe(i + 1 < BANDS.length ? BANDS[i + 1] : Infinity);
      });
    });

    it('keeps the clue ranges of section 5.7 (expert as hard, the hell levels as nightmare)', function () {
      var ranges = [[40, 50], [34, 40], [29, 34], [25, 30], [25, 30], [22, 27], [17, 24], [17, 24], [17, 24]];
      specs.forEach(function (spec, i) {
        expect([spec.minClues, spec.maxClues]).toEqual(ranges[i]);
      });
    });

    it('allows exactly the techniques with 1.25 x weight below the band maximum, in ladder order',
      function () {
        specs.forEach(function (spec) {
          var expected = SG.techniques.list().filter(function (t) {
            return SG.techniques.appliesTo(t, 'boxGrid9') &&
              (spec.max === Infinity || 1.25 * D.WEIGHTS[t.id] < spec.max);
          }).map(function (t) { return t.id; });
          expect(spec.allowedTechniques).toEqual(expected);
        });
        expect(specs[0].allowedTechniques).toEqual(['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine']);
        // The edges of the pruning rule: 1.25 x weight against the band maximum.
        var firsts = { easy: ['pointing', 'boxLine', 'nakedPair'], normal: ['hiddenPair', 'hiddenQuad'],
          hard: ['xWing', 'jellyfish'], expert: ['xyWing', 'xyzWing'], master: ['wWing', 'forcingChain'],
          nightmare: ['nishio'] };
        Object.keys(firsts).forEach(function (level) {
          var i = idx(level);
          firsts[level].forEach(function (id) {
            expect(specs[i].allowedTechniques).toContain(id);
            expect(specs[i - 1].allowedTechniques).not.toContain(id);
          });
        });
        expect(specs[1].allowedTechniques).not.toContain('hiddenPair');
        expect(specs[2].allowedTechniques).not.toContain('xWing');
        expect(specs[7].allowedTechniques).toEqual(specs[8].allowedTechniques);
      });

    it('derives the allowed groups from the allowed techniques; no group owns a level', function () {
      specs.forEach(function (spec) {
        var groups = [];
        spec.allowedTechniques.forEach(function (id) {
          var g = SG.techniques.get(id).group;
          if (groups.indexOf(g) === -1) groups.push(g);
        });
        expect(spec.allowedGroups.slice().sort()).toEqual(groups.sort());
      });
      expect(specs[1].allowedGroups).toContain('subset');
      expect(specs[8].allowedGroups).toContain('chain');
    });

    it('uses the technique oracle at every level and the proposal dig from nightmare on', function () {
      expect(specs.map(function (s) { return s.oracle; })).toEqual(LEVELS.map(function () {
        return 'techniques';
      }));
      expect(specs.map(function (s) { return s.proposal; })).toEqual(
        [false, false, false, false, false, false, true, true, true]);
    });

    it('never offers a technique that is scoped to another variant', function () {
      var temp = SG.techniques.register({
        id: 'testKillerOnly', group: 'basic', baseCost: 2, order: 15, i18nKey: 'technique.testKillerOnly',
        variantScope: ['killer'], find: function () { return null; }
      });
      try {
        withWeights({ testKillerOnly: 1 }, function () {
          expect(temp.id).toBe('testKillerOnly');
          expect(D.spec('veryEasy', board9).allowedTechniques).not.toContain('testKillerOnly');
          expect(D.spec('hell2', board9).allowedTechniques).not.toContain('testKillerOnly');
        });
      } finally {
        SG.techniques.unregister('testKillerOnly');
      }
    });

    it('asks for fewer clues per unit on boards with fewer digits, never for more', function () {
      expect(specs.map(function (s) { return s.minCluesPerUnit; })).toEqual([2, 2, 1, 1, 1, 0, 0, 0, 0]);
      var board6 = SG.fixtures.models.boxGrid('boxGrid6', 2, 3);
      LEVELS.forEach(function (level, i) {
        expect(D.spec(level, board6).minCluesPerUnit).toBeLessThanOrEqual(specs[i].minCluesPerUnit);
      });
    });
  });

  describe('difficulty: spec on other boards, and difficultySupport', function () {
    it('keeps the bands on every board and scales only the clue range by cellCount / 81', function () {
      var board6 = SG.fixtures.models.boxGrid('boxGrid6', 2, 3);
      var samurai = SG.fixtures.models.samurai();
      [[board6, 36], [samurai, 369], [board4, 16]].forEach(function (pair) {
        var board = pair[0];
        var scale = pair[1] / 81;
        LEVELS.forEach(function (level) {
          var base = D.spec(level, board9);
          var spec = D.spec(level, board);
          expect(spec.min).toBe(base.min);
          expect(spec.max).toBe(base.max);
          expect(spec.scale).toBeCloseTo(scale, 12);
          expect(spec.minClues).toBe(Math.max(1, Math.floor(base.minClues * scale)));
          expect(spec.maxClues).toBe(Math.max(1, Math.round(base.maxClues * scale)));
        });
      });
    });

    it('throws for a level the variant does not support', function () {
      LEVELS.forEach(function (level) {
        [model4, model6, model9].forEach(function (model) {
          var def = SG.variants.get(model.variantId);
          if (def.difficultySupport.indexOf(level) !== -1) {
            expect(D.spec(level, model).level).toBe(level);
          } else {
            expectCode(function () { D.spec(level, model); }, 'difficulty.unsupportedLevel');
          }
        });
      });
      expectCode(function () { D.spec('nightmare', model4); }, 'difficulty.unsupportedLevel');
    });

    it('isSupported follows the variant definition; unknown variants support every level', function () {
      LEVELS.forEach(function (level) {
        var offered = SG.variants.get('classic4').difficultySupport.indexOf(level) !== -1;
        expect(D.isSupported(level, model4)).toBe(offered);
        expect(D.isSupported(level, board9)).toBe(true);
        expect(D.isSupported(level, SG.fixtures.models.samurai())).toBe(true);
      });
    });

    it('offers in every variant exactly the levels the qualification published ' +
      '(docs/difficulty-rating/qualification.md)',
      function () {
        var node = SG.test.node;
        if (!node) SG.test.skip('needs the file system (Node only)');
        var text = node.fs.readFileSync(
          node.path.join(node.root, '..', 'docs', 'difficulty-rating', 'qualification.md'), 'utf8');
        var offered = {};
        var rows = 0;
        text.replace(/\r\n/g, '\n').split('\n').forEach(function (line) {
          var m = /^\| (\w+) \| (\w+) \| \d+ \| \d+ \|.*\| (offered|hidden)[^|]*\|$/.exec(line);
          if (!m) return;
          rows++;
          offered[m[1]] = offered[m[1]] || [];
          if (m[3] === 'offered') offered[m[1]].push(m[2]);
        });
        var ids = SG.variants.list().map(function (def) { return def.id; });
        expect(rows).toBe(ids.length * LEVELS.length);
        ids.forEach(function (id) {
          var published = (offered[id] || []).slice().sort(function (a, b) { return idx(a) - idx(b); });
          expect(Array.from(SG.variants.get(id).difficultySupport)).toEqual(published);
        });
      });
  });

  describe('qualification: tests/qualify.js counts every request (Node only, fake workers)', function () {
    /**
     * Runs the scheduler of tests/qualify.js for one fake level (classic4 / veryEasy) on fake workers.
     * `answer(task)` gives the outcome of a request, or one of 'crash' (the worker exits with code 1),
     * 'exit0' (it exits cleanly with the request in flight), 'error' (its IPC channel fails) and 'stray' (it
     * answers for another request). Resolves with the published summary, or rejects with the failure.
     */
    function runScheduler(answer, jobs) {
      var q = loadQualify(answer);
      var ctx = q.ctx;
      ctx.opts = { variants: null, levels: null, jobs: jobs || 1, json: 'summary.json', markdown: null,
        earlyStop: true, quiet: true, probe: 0 };
      return SG.test.node.vm.runInContext('parent(opts)', ctx).then(function () {
        return JSON.parse(q.written['summary.json']).cells[0].summary;
      }, function (err) {
        expect(Object.keys(q.written)).toEqual([]);
        throw err;
      });
    }

    /** tests/qualify.js in a context of its own, with fake workers (see `runScheduler`) and a fake engine. */
    function loadQualify(answer) {
      var node = SG.test.node;
      if (!node || typeof process === 'undefined') SG.test.skip('needs Node');
      var file = node.path.join(node.root, 'tests', 'qualify.js');
      var written = {};
      function fork() {
        var handlers = {};
        var w = {
          on: function (name, fn) {
            (handlers[name] = handlers[name] || []).push(fn);
            return w;
          },
          emit: function (name, a, b) {
            (handlers[name] || []).forEach(function (fn) { fn(a, b); });
          },
          send: function (task) {
            setTimeout(function () {
              if (task === 'exit') return w.emit('exit', 0, null);
              var what = answer(task);
              if (what === 'crash') return w.emit('exit', 1, null);
              if (what === 'exit0') return w.emit('exit', 0, null);
              if (what === 'error') return w.emit('error', new Error('channel closed'));
              if (what === 'stray') return w.emit('message', { key: task.key, index: task.index + 1, ms: 1 });
              return w.emit('message', Object.assign({ key: task.key, index: task.index, seed: task.seed,
                valid: true, solved: true, approximate: false, ms: 1 }, what));
            }, 0);
          },
          kill: function () { setTimeout(function () { w.emit('exit', null, 'SIGTERM'); }, 0); }
        };
        setTimeout(function () { w.emit('message', { ready: true }); }, 0);
        return w;
      }
      var modules = {
        fs: {
          readFileSync: node.fs.readFileSync, existsSync: node.fs.existsSync,
          writeFileSync: function (name, text) { written[name] = text; }
        },
        path: node.path, vm: node.vm, child_process: { fork: fork }, crypto: {},
        os: { cpus: function () { return []; }, totalmem: function () { return 0; } }
      };
      var silent = { log: function () {}, error: function () {} };
      var ctx = node.vm.createContext({
        require: function (name) { return modules[name]; }, module: { exports: {} }, process: process,
        __filename: file, __dirname: node.path.dirname(file), console: silent
      });
      node.vm.runInContext(node.fs.readFileSync(file, 'utf8'), ctx, { filename: file });
      ctx.fakeSG = {
        difficulty: { LEVELS: ['veryEasy'] },
        variants: {
          list: function () { return [{ id: 'classic4', build: function () { return { cellCount: 16 }; } }]; }
        },
        rng: { create: function () { return { fork: function () { return {}; } }; } }
      };
      node.vm.runInContext('loadSources = function () { return fakeSG; };' +
        'engineInfo = function () { return { sources: "test" }; };' +
        'machineInfo = function (jobs) { return { cpu: "test", jobs: jobs }; };', ctx);
      return { ctx: ctx, written: written };
    }

    it('never offers a level on an incomplete round (39 or 99 outcomes)', function () {
      var ctx = loadQualify(function () { return { hit: true }; }).ctx;
      [39, 99, 41].forEach(function (n) {
        ctx.cell = { done: [], budget: 2000, stopped: null };
        for (var i = 0; i < n; i++) ctx.cell.done.push({ index: i, hit: true, ms: 1 });
        var s = SG.test.node.vm.runInContext('decide(cell, false)', ctx);
        expect([s.n, s.verdict, s.stopped]).toEqual([n, 'hidden', 'incomplete']);
      });
    });

    function hit() { return { hit: true }; }

    function fails(promise) {
      return promise.then(function () { throw new Error('the run was published'); },
        function (err) { return err.message; });
    }

    it('publishes a complete first round: 40 outcomes, offered', function () {
      return runScheduler(hit, 2).then(function (s) {
        expect([s.n, s.hits, s.verdict, s.stopped]).toEqual([40, 40, 'offered', null]);
      });
    });

    it('decides a borderline level on exactly 100 outcomes', function () {
      return runScheduler(function (task) { return { hit: task.index >= 7 }; }).then(function (s) {
        expect([s.n, s.hits, s.verdict]).toEqual([100, 93, 'offered']);
      });
    });

    it('fails the run when a worker dies on the last request of the first round', function () {
      return fails(runScheduler(function (task) { return task.index === 39 ? 'crash' : hit(); }))
        .then(function (message) { expect(message).toMatch(/stopped unexpectedly.*#39 in flight/); });
    });

    it('fails the run when a worker dies on the last request of the second round', function () {
      return fails(runScheduler(function (task) {
        if (task.index === 99) return 'crash';
        return { hit: task.index >= 7 };
      })).then(function (message) { expect(message).toMatch(/#99 in flight/); });
    });

    it('fails the run on a clean exit with a request in flight, an IPC error or a stray answer', function () {
      return Promise.all(['exit0', 'error', 'stray'].map(function (what) {
        return fails(runScheduler(function (task) { return task.index === 20 ? what : hit(); }, 2));
      })).then(function (messages) {
        expect(messages[0]).toMatch(/stopped unexpectedly/);
        expect(messages[1]).toMatch(/worker error/);
        expect(messages[2]).toMatch(/not given/);
      });
    });
  });

  describe('difficulty: the clue floor of a variant (clueFloor)', function () {
    var TEMP_ID = 'floorProbe';

    /** Registers a throw-away classic-shaped variant, runs fn(model) and removes the variant again. */
    function withFloor(clueFloor, fn, extra) {
      var def = {
        id: TEMP_ID, i18nKey: 'variant.' + TEMP_ID, group: 'test', digits: 9,
        difficultySupport: LEVELS.slice(), defaultSymbolMode: 'digits', symbolModes: ['digits'], options: [],
        build: function () { return SG.fixtures.models.boxGrid(TEMP_ID, 3, 3); }
      };
      if (clueFloor !== undefined) def.clueFloor = clueFloor;
      Object.assign(def, extra);
      SG.variants.register(def);
      try {
        return fn(def.build());
      } finally {
        SG.variants.unregister(TEMP_ID);
      }
    }

    it('without a declaration the floor is the classic9 floor scaled by cellCount / 81', function () {
      withFloor(undefined, function (model) {
        LEVELS.forEach(function (level) {
          expect(D.spec(level, model).minClues).toBe(D.spec(level, board9).minClues);
        });
      });
    });

    it('a table gives absolute floors; a level that is missing has no floor (0)', function () {
      withFloor({ veryEasy: 33, hard: 7 }, function (model) {
        var floors = LEVELS.map(function (level) { return D.spec(level, model).minClues; });
        expect(floors).toEqual([33, 0, 0, 7, 0, 0, 0, 0, 0]);
        LEVELS.forEach(function (level) {
          var spec = D.spec(level, model);
          expect(spec.maxClues).toBeGreaterThanOrEqual(spec.minClues);
        });
      });
    });

    it('a function gets (level, model, the derived floor) and may scale it; nonsense falls back',
      function () {
        var seen = [];
        withFloor(function (level, model, derived) {
          seen.push([level, model.variantId, derived]);
          if (level === 'master') return NaN;
          if (level === 'nightmare') return -4;
          return derived * 0.5 + 0.9;
        }, function (model) {
          LEVELS.forEach(function (level) {
            var derived = D.spec(level, board9).minClues;
            var floor = D.spec(level, model).minClues;
            var kept = level === 'master' || level === 'nightmare';
            expect(floor).toBe(kept ? derived : Math.floor(derived * 0.5 + 0.9));
          });
        });
        expect(seen).toHaveLength(LEVELS.length);
        expect(seen[0]).toEqual(['veryEasy', TEMP_ID, 40]);
      });

    it('spec(level, null) and boards of unregistered variants keep working', function () {
      expect(D.spec('easy', null).minClues).toBe(Math.max(1, Math.floor(34 * 1)));
      expect(D.spec('veryEasy', SG.fixtures.models.samurai()).minClues).toBe(Math.floor(40 * 369 / 81));
    });

    it('Killer declares 40 clues for veryEasy and none for the levels above', function () {
      if (!SG.variants.has('killer')) SG.test.skip('the Killer variant is not loaded');
      var def = SG.variants.get('killer');
      var killer = def.build({}, SG.rng.create(1));
      def.difficultySupport.forEach(function (level) {
        expect(D.spec(level, killer).minClues).toBe(level === 'veryEasy' ? 40 : 0);
      });
    });

    it('Greater-Than and the 9x9 hybrids keep the derived floor of veryEasy and easy and scale the rest',
      function () {
        var ids = ['greaterThan', 'diagonalX', 'hyper', 'jigsaw9'];
        if (!ids.every(function (id) { return SG.variants.has(id); })) {
          SG.test.skip('variants are not loaded');
        }
        var expected = { veryEasy: 40, easy: 34, normal: 24, hard: 20, expert: 20, master: 17, nightmare: 17,
          hell1: 17, hell2: 17 };
        ids.forEach(function (id) {
          var board = SG.variants.get(id).build({}, SG.rng.create(1));
          SG.variants.get(id).difficultySupport.forEach(function (level) {
            expect(D.spec(level, board).minClues).toBe(expected[level]);
          });
        });
      });

    it('a clueFloorScale multiplies the derived floor of its levels; a missing level keeps it', function () {
      withFloor(undefined, function (model) {
        var floors = LEVELS.map(function (level) { return D.spec(level, model).minClues; });
        expect(floors).toEqual([40, 34, 14, 25, 25, 22, 17, 17, 17]);
        LEVELS.forEach(function (level) {
          var spec = D.spec(level, model);
          expect(spec.maxClues).toBeGreaterThanOrEqual(spec.minClues);
        });
      }, { clueFloorScale: { normal: 0.5, easy: 1 } });
      // 25 * 0.8 is 19.999999999999996 in floating point and must still give 20.
      withFloor(undefined, function (model) {
        expect(D.spec('hard', model).minClues).toBe(20);
        expect(D.spec('expert', model).minClues).toBe(25);
      }, { clueFloorScale: { hard: 0.8 } });
    });

    it('clueFloor sees the scaled floor as the derived one, and has the last word', function () {
      var seen = {};
      withFloor(function (level, model, derived) {
        seen[level] = derived;
        return level === 'hard' ? 3 : derived;
      }, function (model) {
        expect(D.spec('normal', model).minClues).toBe(14);
        expect(D.spec('hard', model).minClues).toBe(3);
        expect(D.spec('veryEasy', model).minClues).toBe(40);
      }, { clueFloorScale: { normal: 0.5, hard: 0.5 } });
      expect(seen).toEqual({ normal: 14, hard: 12, veryEasy: 40 });
    });

    it('a registration with a malformed clueFloor, clueFloorScale or restartThreshold is refused',
      function () {
        [{ clueFloor: { nope: 3 } }, { clueFloor: { easy: -1 } }, { clueFloor: { easy: 2.5 } },
          { clueFloor: [1, 2] }, { clueFloor: 7 }, { restartThreshold: 0 }, { restartThreshold: 1.5 },
          { restartThreshold: '300' }, { clueFloorScale: { nope: 1 } }, { clueFloorScale: { easy: -0.5 } },
          { clueFloorScale: { easy: '0.5' } }, { clueFloorScale: { easy: NaN } },
          { clueFloorScale: { easy: Infinity } }, { clueFloorScale: [0.5] }, { clueFloorScale: 0.5 },
          { clueFloorScale: null }].forEach(function (extra) {
          var def = Object.assign({
            id: TEMP_ID, i18nKey: 'variant.' + TEMP_ID, group: 'test', digits: 9, difficultySupport: ['easy'],
            defaultSymbolMode: 'digits', symbolModes: ['digits'], options: [],
            build: function () { return null; }
          }, extra);
          expectCode(function () { SG.variants.register(def); }, 'variant.invalidDef');
          expect(SG.variants.has(TEMP_ID)).toBe(false);
        });
      });
  });

  describe('difficulty: the score of rating v2', function () {
    var RANDOM_IDS = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'pointing', 'boxLine',
      'nakedPair', 'hiddenTriple', 'xWing', 'swordfish', 'xyWing', 'forcingChain', 'nishio', 'cageCombo',
      'ruleOf45', 'ineqChain'];

    function randomCase(rng) {
      var counts = {};
      RANDOM_IDS.forEach(function (id) {
        if (rng.next() < 0.4) counts[id] = 1 + rng.int(id.indexOf('Single') !== -1 ? 60 : 6);
      });
      return { counts: counts, empties: rng.int(300) };
    }

    it('is round(80E/(E+40) + P + 0.25 P log2(1 + W/P)) with the weights of section 5.2', function () {
      var rng = SG.rng.create(4242);
      for (var i = 0; i < 300; i++) {
        var c = randomCase(rng);
        expect(D.scoreOf(c.counts, c.empties)).toBe(expectedScore(c.counts, c.empties));
      }
      expect(D.scoreOf({}, 0)).toBe(0);
      expect(D.scoreOf({}, 40)).toBe(40);
      expect(D.scoreOf({ nakedSingle: 0 }, 0)).toBe(0);
    });

    it('has the weight table of section 5.2, and a technique without a weight is an error', function () {
      expect(D.WEIGHTS).toEqual({
        nakedSingle: 1, hiddenSingleBox: 1.25, hiddenSingleLine: 1.5, pointing: 40, boxLine: 50,
        nakedPair: 120, hiddenPair: 145, nakedTriple: 180, hiddenTriple: 220, nakedQuad: 260, hiddenQuad: 300,
        xWing: 320, simpleColouring: 360, swordfish: 420, jellyfish: 520, xyWing: 650, xyzWing: 750,
        wWing: 850, uniqueRectangle: 900, forcingChain: 1100, nishio: 1700, cageCombo: 40, ruleOf45: 260,
        cageSplit: 520, ineqChain: 40, minMaxForcing: 180
      });
      SG.techniques.list().forEach(function (t) { expect(D.weightOf(t.id)).toBe(D.WEIGHTS[t.id]); });
      expectCode(function () { D.weightOf('noSuchTechnique'); }, 'difficulty.unknownTechnique');
      expectCode(function () { D.scoreOf({ noSuchTechnique: 1 }, 10); }, 'difficulty.unknownTechnique');
    });

    it('reproduces the worked examples: classic9 499 and Samurai 633', function () {
      var classic = { nakedSingle: 29, hiddenSingleBox: 19, hiddenSingleLine: 5, pointing: 5, nakedPair: 1,
        xWing: 1 };
      var parts = D.breakdown(classic, 53);
      expect(parts.peak).toBe(320);
      expect(parts.work).toBeCloseTo(700.25, 9);
      expect(parts.empty).toBeCloseTo(45.59, 2);
      expect(parts.workTerm).toBeCloseTo(133.82, 2);
      expect(parts.score).toBe(499);
      expect(D.levelOfScore(parts.score)).toBe('hard');
      var samurai = { nakedSingle: 204, hiddenSingleBox: 42, hiddenSingleLine: 17, pointing: 6, boxLine: 1,
        nakedPair: 1, xWing: 1, simpleColouring: 1 };
      var big = D.breakdown(samurai, 263);
      expect(big.peak).toBe(360);
      expect(big.work).toBeCloseTo(1372, 9);
      expect(big.empty).toBeCloseTo(69.44, 2);
      expect(big.score).toBe(633);
      // The same puzzles rated from their givens (the solver path of the report).
      var rated = D.rate(model9, parse('4037105000170000208000001000004900100006030000900850000090000010' +
        '50000640001056208'));
      expect(rated.techniqueCounts).toEqual(classic);
      expect(rated.empties).toBe(53);
      expect(rated.score).toBe(499);
      expect(rated.level).toBe('hard');
      if (SG.variants.has('samurai')) {
        var samuraiModel = SG.variants.get('samurai').build({}, SG.rng.create(1));
        var text = '00503000000080040007600923020700006000050000805100000200008000942000000000070400000900' +
          '70400000002006001000000709000060000100020050784301000900650002000070000060000001000003000' +
          '05000560070001093840100600030000200009030000004008002000000070300900000106000000000093200' +
          '07000080000064090000200002000090503690085000800300000008030000000908051007200000010600000' +
          '0950014020500000';
        var givens = Int32Array.from(text.split('').map(Number));
        expect(givens.length).toBe(samuraiModel.cellCount);
        var r = D.rate(samuraiModel, givens);
        expect(r.techniqueCounts).toEqual(samurai);
        expect(r.score).toBe(633);
        expect(r.level).toBe('hard');
      }
    });

    it('is pure: the same empty cells and technique counts give the same score on every board', function () {
      var cases = [[{ nakedSingle: 30, pointing: 2, xWing: 1 }, 45], [{ nakedSingle: 10 }, 12],
        [{ hiddenSingleBox: 40, cageCombo: 9, ruleOf45: 2 }, 70], [{ nakedSingle: 200, nishio: 3 }, 260]];
      var boards = [model4, model6, model9, board9, SG.fixtures.models.samurai()];
      if (SG.variants.has('killer')) boards.push(SG.variants.get('killer').build({}, SG.rng.create(2)));
      cases.forEach(function (c) {
        var scores = boards.map(function (board) { return D.classify(fakeReport(c[0], c[1]), board).score; });
        scores.forEach(function (s) { expect(s).toBe(expectedScore(c[0], c[1])); });
      });
    });

    it('never decreases when a count, the empty cells or the weight of the hardest technique grows',
      function () {
        var rng = SG.rng.create(4343);
        for (var i = 0; i < 300; i++) {
          var c = randomCase(rng);
          var base = D.scoreOf(c.counts, c.empties);
          expect(D.scoreOf(c.counts, c.empties + 1 + rng.int(20))).toBeGreaterThanOrEqual(base);
          var id = RANDOM_IDS[rng.int(RANDOM_IDS.length)];
          var more = Object.assign({}, c.counts);
          more[id] = (more[id] || 0) + 1 + rng.int(3);
          expect(D.scoreOf(more, c.empties)).toBeGreaterThanOrEqual(base);
          var parts = D.breakdown(c.counts, c.empties);
          if (parts.hardest !== null) {
            var heavier = {};
            heavier[parts.hardest] = parts.peak + 1 + rng.int(500);
            var score = withWeights(heavier, function () { return D.scoreOf(c.counts, c.empties); });
            expect(score).toBeGreaterThanOrEqual(base);
          }
        }
      });

    it('does not depend on the order of the steps, only on how often each technique was used', function () {
      var a = D.classify(fakeReport({ nakedSingle: 20, pointing: 3, xWing: 1 }, 50), model9);
      var b = D.classify(fakeReport({ xWing: 1, pointing: 3, nakedSingle: 20 }, 50), model9);
      expect(b).toEqual(a);
    });

    it('rates a puzzle that needs only singles by its empty cells: at most easy on any board', function () {
      var dense = D.classify(fakeReport({ nakedSingle: 41 }, 41), model9);
      var sparse = D.classify(fakeReport({ nakedSingle: 47 }, 47), model9);
      expect(dense.level).toBe('veryEasy');
      expect(sparse.level).toBe('easy');
      expect(dense.hardestTechnique).toBe('nakedSingle');
      expect(dense.hardestGroup).toBe('basic');
      expect(dense.score).toBeLessThan(sparse.score);
      // Singles only on 369 cells: still below about 77, never past easy.
      var huge = D.classify(fakeReport({ nakedSingle: 200, hiddenSingleBox: 100, hiddenSingleLine: 69 }, 369),
        model9);
      expect(huge.score).toBeLessThan(80);
      expect(huge.level).toBe('easy');
    });

    it('counts one expensive step in full on any board (no technique floor, no size scaling)', function () {
      [['pointing', 'easy'], ['nakedPair', 'easy'], ['xWing', 'hard'], ['xyWing', 'expert'],
        ['forcingChain', 'master'], ['nishio', 'nightmare']].forEach(function (c) {
        var counts = { nakedSingle: 3 };
        counts[c[0]] = 1;
        var rating = D.classify(fakeReport(counts, 4), model9);
        expect(rating.score).toBe(expectedScore(counts, 4));
        expect(rating.score).toBe(rating.rawScore);
        expect(rating.level).toBe(c[1]);
        expect(rating.hardestTechnique).toBe(c[0]);
        expect(D.classify(fakeReport(counts, 4), model4).score).toBe(rating.score);
      });
    });

    it('picks the hardest technique by weight, then by the larger registration order, then by id',
      function () {
        var report = fakeReport({ nakedSingle: 5, xWing: 1, nakedQuad: 6 }, 20);
        expect(D.classify(report, model9).hardestTechnique).toBe('xWing');
        expect(D.breakdown({ nakedQuad: 1, ruleOf45: 1 }, 10).hardest).toBe('nakedQuad');
        expect(D.breakdown({ jellyfish: 1, cageSplit: 1 }, 10).hardest).toBe('jellyfish');
        expect(D.breakdown({ ineqChain: 1, pointing: 1 }, 10).hardest).toBe('ineqChain');
        var r = D.classify(fakeReport({ pointing: 2, ineqChain: 1 }, 10), model9);
        expect(r.hardestTechnique).toBe('ineqChain');
        expect(r.hardestGroup).toBe(SG.techniques.get('ineqChain').group);
        expect(D.classify(fakeReport({}, 0), model9).hardestTechnique).toBeNull();
        expect(D.classify(fakeReport({}, 0), model9).hardestGroup).toBeNull();
      });

    it('gives a puzzle without a complete proof no level and no score (it is never a hit)', function () {
      var rating = D.classify(fakeReport({ nakedSingle: 20, xWing: 1 }, 60, false), model9);
      expect(rating.solved).toBe(false);
      expect(rating.level).toBeNull();
      expect(rating.score).toBeNull();
      expect(rating.rawScore).toBeNull();
      expect(rating.confidence).toBe(0);
      expect(rating.empties).toBe(60);
      expect(rating.techniqueCounts).toEqual({ nakedSingle: 20, xWing: 1 });
      expect(rating.hardestTechnique).toBe('xWing');
      expect(rating.ratingVersion).toBe(2);
    });

    it('carries the metadata of section 5.4: rawScore = score, ratingVersion 2, the counts', function () {
      var rating = D.classify(fakeReport({ nakedSingle: 30, hiddenSingleBox: 4, nakedPair: 2 }, 50), model9);
      expect(rating.rawScore).toBe(rating.score);
      expect(Number.isInteger(rating.score)).toBe(true);
      expect(rating.ratingVersion).toBe(D.RATING_VERSION);
      expect(D.RATING_VERSION).toBe(2);
      expect(rating.empties).toBe(50);
      expect(rating.solved).toBe(true);
      expect(rating.techniqueCounts).toEqual({ nakedSingle: 30, hiddenSingleBox: 4, nakedPair: 2 });
      expect(rating.level).toBe(D.levelOfScore(rating.score));
    });

    it('returns a confidence between 0 and 1: 0 on a band edge, high deep inside the band', function () {
      // 45 empty cells of singles only: 80 * 45 / 85 = 42.35, plus the singles.
      var edge = null;
      for (var e = 30; e < 80 && edge === null; e++) {
        var r = D.classify(fakeReport({ nakedSingle: e }, e), model9);
        if (r.score === 45) edge = r;
      }
      expect(edge).toBeTruthy();
      expect(edge.level).toBe('easy');
      expect(edge.confidence).toBe(0);
      var middle = D.classify(fakeReport({ nakedSingle: 30, nakedPair: 1, hiddenPair: 1 }, 45), model9);
      expect(middle.level).toBe('normal');
      expect(middle.confidence).toBeGreaterThan(0.3);
      [fakeReport({ nakedSingle: 30 }, 40), fakeReport({ xWing: 2, forcingChain: 7 }, 50),
        fakeReport({ nishio: 9, forcingChain: 9 }, 60)].forEach(function (rep) {
        var c = D.classify(rep, model9).confidence;
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      });
    });

    it('does not depend on whether the solver collected its steps', function () {
      SG.fixtures.rated.entries.slice(0, 6).forEach(function (entry) {
        var givens = parse(entry.puzzle);
        var lean = D.rate(model9, givens);
        var full = D.rate(model9, givens, { collectSteps: true });
        expect(full.score).toBe(lean.score);
        expect(full.level).toBe(lean.level);
        expect(full.steps.length).toBeGreaterThan(0);
      });
    });

    it('rates the same report the same whichever way it is classified', function () {
      var givens = parse(SG.fixtures.rated.entries[0].puzzle);
      var report = SG.logicalSolver.solve(model9, givens, { collectSteps: false });
      expect(D.classify(report, model9)).toEqual(D.rate(model9, givens));
    });

    it('proves uniqueness only with a complete proof that assumes none', function () {
      expect(D.provesUniqueness(D.classify(fakeReport({ nakedSingle: 30, xWing: 1 }, 40), model9)))
        .toBe(true);
      expect(D.provesUniqueness(D.classify(fakeReport({ nakedSingle: 30, uniqueRectangle: 1 }, 40), model9)))
        .toBe(false);
      expect(D.provesUniqueness(D.classify(fakeReport({ nakedSingle: 30 }, 40, false), model9))).toBe(false);
    });
  });

  describe('difficulty: the Difficulty Score table (section 5.6)', function () {
    it('shares the score among the rows exactly: the hardest row also carries P, the empty cells V',
      function () {
        var counts = { nakedSingle: 29, hiddenSingleBox: 19, hiddenSingleLine: 5, pointing: 5, nakedPair: 1,
          xWing: 1 };
        var parts = D.breakdown(counts, 53);
        var sum = parts.empty;
        parts.rows.forEach(function (row) {
          sum += row.share;
          var expected = parts.workTerm * row.weight * row.uses / parts.work + (row.hardest ? parts.peak : 0);
          expect(row.share).toBeCloseTo(expected, 9);
          expect(row.hardest).toBe(row.id === 'xWing');
        });
        expect(sum).toBeCloseTo(parts.unrounded, 9);
        expect(parts.rows.map(function (row) { return row.id; })).toEqual(Object.keys(counts));
      });

    it('rounds the shares once, to whole numbers that add up to the score (the worked example)', function () {
      var table = D.scoreTable({ nakedSingle: 29, hiddenSingleBox: 19, hiddenSingleLine: 5, pointing: 5,
        nakedPair: 1, xWing: 1 }, 53);
      expect(table.rows.map(function (row) { return [row.id, row.uses, row.points, row.total]; })).toEqual([
        ['nakedSingle', 29, 1, 6], ['hiddenSingleBox', 19, 1.25, 4], ['hiddenSingleLine', 5, 1.5, 1],
        ['pointing', 5, 40, 38], ['nakedPair', 1, 120, 23], ['xWing', 1, 320, 381]
      ]);
      expect(table.empties).toBe(53);
      expect(table.emptyPoints).toBeCloseTo(45.5914 / 53, 4);
      expect(table.emptyTotal).toBe(46);
      expect(table.total).toBe(499);
    });

    it('adds up to the score for any counts, also without empty cells or without techniques', function () {
      var rng = SG.rng.create(4444);
      var ids = Object.keys(D.WEIGHTS);
      for (var i = 0; i < 300; i++) {
        var counts = {};
        ids.forEach(function (id) { if (rng.next() < 0.25) counts[id] = 1 + rng.int(30); });
        var empties = rng.next() < 0.1 ? 0 : rng.int(400);
        var table = D.scoreTable(counts, empties);
        var sum = table.emptyTotal;
        table.rows.forEach(function (row) {
          expect(Number.isInteger(row.total)).toBe(true);
          expect(row.total).toBeGreaterThanOrEqual(0);
          sum += row.total;
        });
        expect(sum).toBe(table.total);
        expect(table.total).toBe(D.scoreOf(counts, empties));
        if (empties === 0) expect(table.emptyTotal).toBe(0);
      }
      expect(D.scoreTable({}, 0)).toEqual({
        rows: [], empties: 0, emptyPoints: 0, emptyShare: 0, emptyTotal: 0, peak: 0, work: 0, workTerm: 0,
        unrounded: 0, total: 0
      });
      expect(D.scoreTable({}, 40).emptyTotal).toBe(40);
    });

    it('exposes the exact numbers behind every whole number of the table', function () {
      var counts = { nakedSingle: 44, hiddenSingleBox: 8, pointing: 2, hiddenPair: 1, simpleColouring: 2 };
      var table = D.scoreTable(counts, 52);
      var parts = D.breakdown(counts, 52);
      expect(table.peak).toBe(360);
      expect(table.work).toBe(999);
      expect(table.workTerm).toBeCloseTo(172.4829, 4);
      expect(table.emptyShare).toBeCloseTo(45.2174, 4);
      expect(table.unrounded).toBe(parts.unrounded);
      var exact = table.emptyShare;
      table.rows.forEach(function (row) {
        expect(row.work).toBe(row.points * row.uses);
        exact += row.share;
      });
      expect(exact).toBeCloseTo(table.unrounded, 9);
      expect(table.rows[0].share).toBeCloseTo(172.4829 * 44 / 999, 3);
    });
  });

  describe('difficulty: labelled puzzles (fixtures/rated.js)', function () {
    var entries = SG.fixtures.rated.entries;

    it('has at least 20 labelled puzzles, each with exactly one solution', function () {
      expect(entries.length).toBeGreaterThanOrEqual(20);
      entries.forEach(function (entry) {
        expect(entry.puzzle).toHaveLength(81);
        expect(LEVELS).toContain(entry.label);
        expect(SG.dfs.countSolutions(model9, parse(entry.puzzle), 2)).toBe(1);
      });
    });

    it('classify matches every label within one level', function () {
      entries.forEach(function (entry) {
        var rating = D.rate(model9, parse(entry.puzzle));
        var gap = Math.abs(idx(rating.level) - idx(entry.label));
        if (gap > 1) {
          throw new Error(entry.name + ' is labelled ' + entry.label + ' but rated ' + rating.level +
            ' (score ' + rating.score + ', hardest ' + rating.hardestTechnique + ')');
        }
      });
    });

    it('classify reproduces the level of every constructed puzzle exactly', function () {
      SG.fixtures.rated.constructed.forEach(function (entry) {
        var rating = D.rate(model9, parse(entry.puzzle));
        expect(rating.level).toBe(entry.label);
      });
    });

    it('the certificate of a constructed puzzle is about techniques, not a score', function () {
      function solvesWith(givens, ids) {
        return SG.logicalSolver.solve(board9, givens, {
          allowedTechniques: ids, collectSteps: false, assumeUniqueness: false
        }).solved;
      }
      var sets = SG.fixtures.rated.techniqueSets;
      // Score-independent facts: a normal puzzle needs a subset, a nightmare one a chain.
      expect(sets.locked.indexOf('nakedPair')).toBe(-1);
      var chains = sets.wings.filter(function (id) { return SG.techniques.get(id).group === 'chain'; });
      expect(chains).toEqual([]);
      SG.fixtures.rated.constructed.forEach(function (entry) {
        var givens = parse(entry.puzzle);
        expect(solvesWith(givens, entry.solvableWith)).toBe(true);
        if (entry.notSolvableWith !== null) expect(solvesWith(givens, entry.notSolvableWith)).toBe(false);
      });
      var stuck = function (label, set) {
        return SG.fixtures.rated.constructed.filter(function (e) { return e.label === label; })
          .every(function (e) {
            return e.notSolvableWith !== null && e.notSolvableWith.join() === set.join();
          });
      };
      expect(stuck('normal', sets.locked)).toBe(true);
      expect(stuck('nightmare', sets.wings)).toBe(true);
    });

    it('rates the famous hardest puzzles hell2, with a Nishio step and a complete proof', function () {
      ['escargot', 'worlds-hardest-2012', 'platinum-blonde', 'golden-nugget'].forEach(function (name) {
        var entry = entries.filter(function (e) { return e.name === name; })[0];
        var rating = D.rate(model9, parse(entry.puzzle));
        expect(rating.level).toBe('hell2');
        expect(rating.hardestTechnique).toBe('nishio');
        expect(rating.solved).toBe(true);
      });
    });

    it('puts every label in order: harder labels never rate lower on average', function () {
      var sum = {};
      var count = {};
      SG.fixtures.rated.constructed.forEach(function (entry) {
        var s = D.rate(model9, parse(entry.puzzle)).score;
        sum[entry.label] = (sum[entry.label] || 0) + s;
        count[entry.label] = (count[entry.label] || 0) + 1;
      });
      var previous = -1;
      LEVELS.forEach(function (level) {
        if (!count[level]) return;
        var mean = sum[level] / count[level];
        expect(mean).toBeGreaterThan(previous);
        previous = mean;
      });
    });
  });

  describe('difficulty: removing a clue (the score is not monotone under clue removal, section 5.1)',
    function () {
      /** A puzzle dug to `clues` clues, and the same puzzle with one more clue removed (null: none can go).
       */
      function pair(seed, minClues) {
        var rng = SG.rng.create(seed);
        var solution = SG.fullGrid.generate(model9, rng.fork('grid'), null);
        var dug = SG.digger.dig(model9, solution, rng.fork('dig'), { symmetry: 'none', minClues: minClues });
        var givens = dug.givens;
        var before = D.rate(model9, givens);
        var cells = [];
        for (var c = 0; c < givens.length; c++) if (givens[c] !== 0) cells.push(c);
        rng.fork('pick').shuffle(cells);
        for (var i = 0; i < cells.length; i++) {
          var cell = cells[i];
          var value = givens[cell];
          givens[cell] = 0;
          if (SG.dfs.stillUnique(model9, givens, cell, value)) {
            return { before: before, after: D.rate(model9, givens) };
          }
          givens[cell] = value;
        }
        return null;
      }

      it('rarely lowers the score: at most 5 of 100 puzzles of 30 to 50 clues', function () {
        var checked = 0;
        var lower = 0;
        for (var i = 0; i < 100; i++) {
          var rng = SG.rng.create(31000 + i);
          var p = pair(31000 + i, 30 + rng.int(21));
          if (p === null) continue;
          checked++;
          if (p.after.score < p.before.score) lower++;
        }
        expect(checked).toBeGreaterThanOrEqual(95);
        expect(lower).toBeLessThanOrEqual(5);
      });

      it('rarely lowers the level, and never by more than one: 300 puzzles of 22 to 50 clues', function () {
        var checked = 0;
        var lower = 0;
        for (var i = 0; i < 300; i++) {
          var rng = SG.rng.create(41000 + i);
          var p = pair(41000 + i, 22 + rng.int(29));
          if (p === null) continue;
          checked++;
          var drop = idx(p.before.level) - idx(p.after.level);
          if (drop > 1) {
            throw new Error('case ' + i + ': level fell from ' + p.before.level + ' to ' + p.after.level);
          }
          if (drop === 1) lower++;
        }
        expect(checked).toBeGreaterThanOrEqual(250);
        expect(lower).toBeLessThanOrEqual(3);
      });
    });

  describe('digger: technique-bounded oracle', function () {
    var SINGLES = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine'];

    function makeSolution(seed) {
      var rng = SG.rng.create(seed);
      return { rng: rng, solution: SG.fullGrid.generate(model9, rng.fork('grid'), null) };
    }

    it('keeps the puzzle solvable with the allowed techniques only, which also makes it unique', function () {
      for (var i = 0; i < 30; i++) {
        var s = makeSolution(5100 + i);
        var dug = SG.digger.dig(model9, s.solution, s.rng.fork('dig'), { allowedTechniques: SINGLES });
        var report = SG.logicalSolver.solve(model9, dug.givens, {
          allowedTechniques: SINGLES, collectSteps: false, assumeUniqueness: false
        });
        expect(report.solved).toBe(true);
        expect(SG.dfs.countSolutions(model9, dug.givens, 2)).toBe(1);
        expect(dug.clues).toBeGreaterThan(21);
      }
    });

    it('stops at the upper edge of a band: no accepted removal takes the score to maxScore', function () {
      var bounded = 0;
      var free = 0;
      for (var i = 0; i < 20; i++) {
        var s = makeSolution(5150 + i);
        var dug = SG.digger.dig(model9, s.solution, s.rng.fork('dig'), {
          allowedTechniques: SINGLES, maxScore: 45, symmetry: 'none'
        });
        expect(D.rate(model9, dug.givens).score).toBeLessThan(45);
        bounded += dug.clues;
        free += SG.digger.dig(model9, s.solution, s.rng.fork('dig'), {
          allowedTechniques: SINGLES, symmetry: 'none'
        }).clues;
      }
      expect(free).toBeLessThan(bounded);
    });

    it('digs less deep with fewer techniques: singles only never beats more techniques', function () {
      var singles = 0;
      var more = 0;
      for (var i = 0; i < 30; i++) {
        var s = makeSolution(5200 + i);
        var narrow = SG.digger.dig(model9, s.solution, s.rng.fork('dig'), { allowedTechniques: SINGLES });
        singles += narrow.clues;
        var wide = SG.digger.dig(model9, s.solution, s.rng.fork('dig'), {
          allowedTechniques: D.spec('master', board9).allowedTechniques
        });
        more += wide.clues;
      }
      expect(more).toBeLessThanOrEqual(singles);
    });

    it('never uses a technique that assumes uniqueness: it is listed, but the oracle skips it', function () {
      var allowed = D.spec('master', board9).allowedTechniques;
      expect(allowed).toContain('uniqueRectangle');
      for (var i = 0; i < 15; i++) {
        var s = makeSolution(5300 + i);
        var dug = SG.digger.dig(model9, s.solution, s.rng.fork('dig'), { allowedTechniques: allowed });
        expect(SG.dfs.countSolutions(model9, dug.givens, 2)).toBe(1);
        var report = SG.logicalSolver.solve(model9, dug.givens, {
          allowedTechniques: allowed, collectSteps: false, assumeUniqueness: false
        });
        expect(report.solved).toBe(true);
        expect(report.techniqueCounts.uniqueRectangle).toBeUndefined();
      }
    });

    it('reports the groups it removed, in order, and they account for every removed clue', function () {
      var s = makeSolution(5400);
      var dug = SG.digger.dig(model9, s.solution, s.rng.fork('dig'), { allowedTechniques: SINGLES });
      var removed = 0;
      dug.removedGroups.forEach(function (group) {
        removed += group.length;
        group.forEach(function (cell) { expect(dug.givens[cell]).toBe(0); });
      });
      expect(removed).toBe(81 - dug.clues);
      expect(dug.removedGroups).toHaveLength(dug.stats.accepted);
    });

    it('continues a dug puzzle from startGivens without touching the clues that were kept', function () {
      var s = makeSolution(5500);
      var first = SG.digger.dig(model9, s.solution, s.rng.fork('a'), { minClues: 45 });
      var second = SG.digger.dig(model9, s.solution, s.rng.fork('b'), { startGivens: first.givens });
      expect(second.clues).toBeLessThan(first.clues);
      for (var c = 0; c < 81; c++) {
        if (second.givens[c] !== 0) expect(first.givens[c]).toBe(s.solution[c]);
        if (first.givens[c] === 0) expect(second.givens[c]).toBe(0);
      }
      expect(SG.dfs.countSolutions(model9, second.givens, 2)).toBe(1);
    });

    it('rejects options it cannot use', function () {
      var s = makeSolution(5600);
      expectCode(function () {
        SG.digger.dig(model9, s.solution, s.rng.fork('x'), { allowedTechniques: 'nakedSingle' });
      }, 'digger.invalidOption');
      expectCode(function () {
        SG.digger.dig(model9, s.solution, s.rng.fork('x'), { startGivens: new Int32Array(10) });
      }, 'digger.invalidOption');
      var wrong = Int32Array.from(s.solution);
      wrong[0] = wrong[0] === 9 ? 1 : wrong[0] + 1;
      expectCode(function () {
        SG.digger.dig(model9, s.solution, s.rng.fork('x'), { startGivens: wrong });
      }, 'digger.invalidOption');
      expect(function () {
        SG.digger.dig(model9, s.solution, s.rng.fork('x'), { allowedTechniques: ['noSuchTechnique'] });
      }).toThrow('noSuchTechnique');
    });
  });

  describe('digger.generate: classic9 puzzles per level (hit rate, invariants I1-I7, time)', function () {
    /** Puzzles per level: 100, fewer for the slow top levels. */
    var PER_LEVEL = { hell1: 20, hell2: 20 };
    /** Median generation time in ms that a level must stay under (design.md section 9.1 budgets). */
    var BUDGET_MS = {
      veryEasy: 60, easy: 150, normal: 150, hard: 400, expert: 600, master: 900, nightmare: 2500, hell1: 5000,
      hell2: 10000
    };
    var OFFERED = SG.variants.get('classic9').difficultySupport;
    var batches = {};

    function countOf(level) {
      return PER_LEVEL[level] || 100;
    }

    function batch(level) {
      if (batches[level]) return batches[level];
      var puzzles = [];
      var times = [];
      for (var i = 0; i < countOf(level); i++) {
        var rng = SG.rng.create(7000 + i);
        var started = Date.now();
        puzzles.push(SG.digger.generate(model9, level, rng, {}));
        times.push(Date.now() - started);
      }
      batches[level] = { puzzles: puzzles, times: times };
      return batches[level];
    }

    OFFERED.forEach(function (level) {
      var spec = D.spec(level, model9);

      describe(level, function () {
        it('hits the requested level in at least 90 % of the puzzles', function () {
          var hits = batch(level).puzzles.filter(function (p) { return p.achieved === level; }).length;
          expect(hits).toBeGreaterThanOrEqual(0.9 * countOf(level));
        });

        it('I1: every puzzle has exactly one solution (checked with the DFS, not the oracle)', function () {
          batch(level).puzzles.forEach(function (p, i) {
            if (SG.dfs.countSolutions(model9, p.givens, 2) !== 1) {
              throw new Error('puzzle ' + i + ' is not unique');
            }
            expect(p.warnings).not.toContain('digger.unsoundTechnique');
          });
        });

        it('I2, I3, I6: givens belong to the solution they determine; at least minClues', function () {
          batch(level).puzzles.forEach(function (p, i) {
            expect(SG.model.isSolution(model9, p.solution)).toBe(true);
            for (var c = 0; c < 81; c++) {
              if (p.givens[c] !== 0 && p.givens[c] !== p.solution[c]) {
                throw new Error('puzzle ' + i + ' cell ' + c);
              }
            }
            expect(clueCount(p.givens)).toBe(p.clues);
            expect(p.clues).toBeGreaterThanOrEqual(spec.minClues);
            expect(SG.dfs.solve(model9, p.givens)).toEqual(p.solution);
          });
        });

        it('I5: every puzzle has a complete proof; an exact one has its score in the band', function () {
          batch(level).puzzles.forEach(function (p) {
            expect(p.rating.solved).toBe(true);
            expect(p.exact).toBe(p.achieved === level);
            if (!p.exact) return;
            var rating = D.rate(model9, p.givens);
            expect(rating.score).toBe(p.rating.score);
            expect(rating.score).toBeGreaterThanOrEqual(spec.min);
            expect(rating.score).toBeLessThan(spec.max);
          });
        });

        it('stays within the technique set of the level below nightmare (the proof uses the allowed ' +
          'techniques only)',
          function () {
            if (spec.proposal) return;
            batch(level).puzzles.forEach(function (p, i) {
              if (!p.exact) return;
              // A score below the band maximum keeps every technique of the proof inside the set (score >=
              // 1.25 x the peak weight). The puzzle is unique (I1), so its proof may use a uniqueness
              // technique, as the rating does: a puzzle the local search found is accepted on its rating, not
              // on the dig oracle.
              if (!solvesWithin(model9, p.givens, level, true)) {
                throw new Error('puzzle ' + i + ' needs more than ' + level);
              }
            });
          });

        it('I7: every deduction on the way to the solution is sound', function () {
          batch(level).puzzles.forEach(function (p, i) {
            var report = SG.logicalSolver.solve(model9, p.givens, { collectSteps: true });
            expect(report.solved).toBe(true);
            report.steps.forEach(function (step) {
              step.placements.forEach(function (pl) {
                if (p.solution[pl[0]] !== pl[1]) {
                  throw new Error('puzzle ' + i + ': ' + step.technique + ' places wrongly');
                }
              });
              step.eliminations.forEach(function (el) {
                if (p.solution[el[0]] === el[1]) {
                  throw new Error('puzzle ' + i + ': ' + step.technique + ' is unsound');
                }
              });
            });
          });
        });

        it('has the pattern of empty cells that the default symmetry asks for (rotational 180)', function () {
          batch(level).puzzles.forEach(function (p, i) {
            for (var c = 0; c < 81; c++) {
              if ((p.givens[c] === 0) !== (p.givens[80 - c] === 0)) {
                throw new Error('puzzle ' + i + ' cell ' + c);
              }
            }
          });
        });

        it('is generated well inside the budget of design.md section 9.1 (median time)', function () {
          var times = batch(level).times.slice().sort(function (a, b) { return a - b; });
          expect(times[times.length >> 1]).toBeLessThan(SG.test.timeLimit(BUDGET_MS[level]));
        });
      });
    });

    it('is a confusion matrix with its diagonal as the most common cell of every row', function () {
      OFFERED.forEach(function (level) {
        var row = {};
        batch(level).puzzles.forEach(function (p) { row[p.achieved] = (row[p.achieved] || 0) + 1; });
        LEVELS.forEach(function (other) {
          if (other !== level) expect(row[other] || 0).toBeLessThanOrEqual(row[level] || 0);
        });
      });
    });
  });

  describe('digger.generate: guarantees', function () {
    it('I4: the same seed gives the same puzzle, another seed another one', function () {
      ['normal', 'hard', 'nightmare'].forEach(function (level) {
        var a = SG.digger.generate(model9, level, SG.rng.create(8100), {});
        var b = SG.digger.generate(model9, level, SG.rng.create(8100), {});
        var c = SG.digger.generate(model9, level, SG.rng.create(8101), {});
        expect(Array.from(b.givens)).toEqual(Array.from(a.givens));
        expect(b.rating.score).toBe(a.rating.score);
        expect(b.samples).toBe(a.samples);
        expect(Array.from(c.givens)).not.toEqual(Array.from(a.givens));
      });
    });

    it('is independent of the emit callback', function () {
      var plain = SG.digger.generate(model9, 'hard', SG.rng.create(8200), {});
      var seen = 0;
      var loud = SG.digger.generate(model9, 'hard', SG.rng.create(8200), { emit: function () { seen++; } });
      expect(seen).toBeGreaterThan(0);
      expect(Array.from(loud.givens)).toEqual(Array.from(plain.givens));
    });

    it('returns the documented fields', function () {
      var p = SG.digger.generate(model9, 'normal', SG.rng.create(8300), {});
      expect(p.requested).toBe('normal');
      expect(p.achieved).toBe(p.rating.level);
      expect(p.exact).toBe(true);
      expect(p.attempts).toBeGreaterThanOrEqual(1);
      expect(p.samples).toBeGreaterThanOrEqual(p.attempts);
      expect(p.warnings).toEqual([]);
      expect(p.givens).toHaveLength(81);
      expect(p.solution).toHaveLength(81);
      expect(typeof p.stats.oracleCalls).toBe('number');
      expect(p.rating.ratingVersion).toBe(2);
    });

    it('honours minClues and the unit floor of the spec on every level', function () {
      SG.variants.get('classic9').difficultySupport.forEach(function (level) {
        var spec = D.spec(level, model9);
        for (var i = 0; i < 3; i++) {
          var p = SG.digger.generate(model9, level, SG.rng.create(8400 + i), {});
          expect(p.clues).toBeGreaterThanOrEqual(spec.minClues);
          model9.units.forEach(function (unit) {
            var n = 0;
            unit.forEach(function (cell) { if (p.givens[cell] !== 0) n++; });
            expect(n).toBeGreaterThanOrEqual(spec.minCluesPerUnit);
          });
        }
      });
    });

    it('works with other symmetries and with none', function () {
      ['none', 'mirrorH', 'rotational90'].forEach(function (symmetry) {
        var p = SG.digger.generate(model9, 'normal', SG.rng.create(8500), { symmetry: symmetry });
        expect(SG.dfs.countSolutions(model9, p.givens, 2)).toBe(1);
        var groups = SG.symmetry.groups(model9, symmetry);
        groups.forEach(function (group) {
          for (var i = 1; i < group.length; i++) {
            expect(p.givens[group[i]] === 0).toBe(p.givens[group[0]] === 0);
          }
        });
      });
    });

    it('keeps the configured symmetry on the top tiers too (proposals and their refinement)', function () {
      ['nightmare', 'hell1'].forEach(function (level) {
        for (var i = 0; i < 3; i++) {
          var p = SG.digger.generate(model9, level, SG.rng.create(8550 + i), {});
          for (var c = 0; c < 81; c++) {
            expect(p.givens[c] === 0).toBe(p.givens[80 - c] === 0);
          }
        }
      });
    });

    it('digLevel makes one attempt from a given solution and says whether it hit the level', function () {
      var rng = SG.rng.create(8600);
      var solution = SG.fullGrid.generate(model9, rng.fork('grid'), null);
      var puzzle = SG.digger.digLevel(model9, solution, 'easy', rng.fork('dig'), {});
      expect(puzzle.requested).toBe('easy');
      expect(puzzle.exact).toBe(puzzle.achieved === 'easy');
      expect(puzzle.unsound).toBe(false);
      expect(SG.dfs.countSolutions(model9, puzzle.givens, 2)).toBe(1);
      expect(puzzle.removed).toBe(81 - puzzle.clues);
      expect(Array.from(puzzle.solution)).toEqual(Array.from(solution));
      // The stage B switch changes the way the puzzle is dug, not what a puzzle is.
      var plain = SG.digger.digLevel(model9, solution, 'hard', rng.fork('dig2'), { guided: false });
      var guided = SG.digger.digLevel(model9, solution, 'hard', rng.fork('dig2'), { guided: true });
      [plain, guided].forEach(function (p) {
        expect(SG.dfs.countSolutions(model9, p.givens, 2)).toBe(1);
      });
    });

    it('works on the smaller boards for the levels they support', function () {
      [model4, model6].forEach(function (model) {
        SG.variants.get(model.variantId).difficultySupport.forEach(function (level) {
          var hits = 0;
          for (var i = 0; i < 20; i++) {
            var p = SG.digger.generate(model, level, SG.rng.create(8700 + i), {});
            expect(SG.dfs.countSolutions(model, p.givens, 2)).toBe(1);
            if (p.exact) hits++;
          }
          expect(hits).toBeGreaterThanOrEqual(18);
        });
      });
    });

    it('rejects a level the variant does not support and options that make no sense', function () {
      expectCode(function () { SG.digger.generate(model4, 'nightmare', SG.rng.create(1), {}); },
        'difficulty.unsupportedLevel');
      expectCode(function () { SG.digger.generate(model9, 'hell', SG.rng.create(1), {}); },
        'difficulty.unknownLevel');
      [0, -1, 1.5, 'x'].forEach(function (bad) {
        expectCode(function () {
          SG.digger.generate(model9, 'easy', SG.rng.create(1), { maxAttempts: bad });
        },
          'digger.invalidOption');
        expectCode(function () { SG.digger.generate(model9, 'easy', SG.rng.create(1), { digTries: bad }); },
          'digger.invalidOption');
      });
    });

    it('propagates a budget that runs out instead of swallowing it', function () {
      expectCode(function () {
        SG.digger.generate(model9, 'hard', SG.rng.create(8800), { budget: SG.budget.create({ nodes: 30 }) });
      }, 'budget.exceeded');
    });
  });

  describe('digger.generate: the full-rating cap of an attempt (section 5.7 (9))', function () {
    /**
     * Generates through `SG.digger.generate` with the variant's own hook and strategy, one attempt, and the
     * given cap; every `SG.difficulty.rate` call is recorded with the phase that made it.
     */
    function capped(variantId, level, seed, maxRatings, digTries) {
      var def = SG.variants.get(variantId);
      var support = def.difficultySupport;
      def.difficultySupport = LEVELS.slice();
      var rate = D.rate;
      var origins = [];
      D.rate = function () {
        var stack = String(new Error().stack);
        origins.push(/refineDown/.test(stack) ? 'refine' : /localSearchSteps/.test(stack) ? 'search'
          : /searchCagesSteps/.test(stack) ? 'cages' : /digSignsSteps/.test(stack) ? 'signs' : 'sample');
        return rate.apply(this, arguments);
      };
      try {
        var model = def.build(SG.variants.defaultOptions(variantId), SG.rng.create(seed).fork('model'));
        var p = null;
        var error = null;
        try {
          p = SG.digger.generate(model, level, SG.rng.create(seed), {
            maxAttempts: 1, digTries: digTries, maxRatings: maxRatings,
            postGenerate: def.postGenerate || null,
            strategy: SG.digger.getStrategy(def.digStrategy || 'cells'),
            strategyId: def.digStrategy || 'cells'
          });
        } catch (err) {
          error = err;
        }
        return { puzzle: p, error: error, origins: origins };
      } finally {
        D.rate = rate;
        def.difficultySupport = support;
      }
    }

    /** Every rating is counted, none goes past the cap, and a returned puzzle is completely rated. */
    function expectAccounted(run, maxRatings) {
      if (run.error !== null) {
        expect(run.error.code).toBe('digger.noRatedPuzzle');
        expect(run.origins.length).toBeLessThan(maxRatings + 1);
        return;
      }
      var counted = run.puzzle.work.reduce(function (sum, w) { return sum + w.ratings; }, 0);
      expect(run.origins.length).toBe(counted);
      run.puzzle.work.forEach(function (w) { expect(w.ratings).toBeLessThan(w.maxRatings + 1); });
      expect(run.puzzle.rating.solved).toBe(true);
      var model = run.puzzle.model;
      expect(SG.dfs.countSolutions(model, run.puzzle.givens, 2)).toBe(1);
      expect(D.rate(model, run.puzzle.givens).score).toBe(run.puzzle.rating.score);
    }

    /** Finds a seed whose cap runs out inside `phase`, checking the accounting of every seed tried. */
    function exhaustedIn(variantId, level, maxRatings, phase, digTries) {
      for (var seed = 1; seed <= 12; seed++) {
        var run = capped(variantId, level, seed, maxRatings, digTries);
        expectAccounted(run, maxRatings);
        if (run.origins.length === maxRatings && run.origins[maxRatings - 1] === phase) return run;
      }
      throw new Error(variantId + ' ' + level + ': no seed ran out of ratings inside ' + phase);
    }

    it('counts every full rating at the default cap: classic9 top tier, Greater-Than, Killer', function () {
      [['classic9', 'hell2', 3], ['greaterThan', 'expert', 4], ['killer', 'expert', 5]]
        .forEach(function (c) {
          var run = capped(c[0], c[1], c[2], undefined);
          expectAccounted(run, SG.digger.CAP_RATINGS);
          expect(run.puzzle.work[0].maxRatings).toBe(SG.digger.CAP_RATINGS);
        });
    }, 120000);

    it('runs out inside the downward refinement without passing the cap', function () {
      exhaustedIn('classic9', 'nightmare', 3, 'refine', 1);
    }, 60000);

    it('runs out inside the local search, and hands on the rating it has instead of rating again',
      function () {
        var run = exhaustedIn('classic9', 'hard', 3, 'search', 1);
        expect(run.origins.filter(function (o) { return o === 'sample'; })).toHaveLength(1);
      }, 60000);

    it('runs out inside a variant strategy: Greater-Than tuning and the Killer layout search', function () {
      exhaustedIn('greaterThan', 'hard', 2, 'signs');
      exhaustedIn('killer', 'expert', 6, 'cages');
    }, 120000);

    it('a cap of nothing at all ends with the error path, never with an unrated puzzle', function () {
      var run = capped('classic9', 'hard', 1, 0, 1);
      expect(run.origins).toEqual([]);
      expect(run.error.code).toBe('digger.noRatedPuzzle');
    });
  });

  describe('digger.generate: when the level cannot be reached', function () {
    // A 4x4 board never needs more than singles, so every level from easy up is out of reach.
    it('returns the closest completely rated puzzle with difficulty.approximate and does not throw',
      function () {
        var events = [];
        var result = SG.digger.generate(board4, 'nightmare', SG.rng.create(9000), {
          maxAttempts: 3,
          digTries: 2,
          emit: function (e) { if (e.type === 'retry') events.push(e); }
        });
        expect(result.exact).toBe(false);
        expect(result.warnings).toContain('difficulty.approximate');
        expect(result.achieved).toBe('veryEasy');
        expect(result.rating.solved).toBe(true);
        expect(result.requested).toBe('nightmare');
        expect(result.attempts).toBe(3);
        expect(result.samples).toBe(6);
        expect(events).toHaveLength(3);
        expect(events[0].i18nArgs.attempt).toBe(1);
        expect(SG.dfs.countSolutions(board4, result.givens, 2)).toBe(1);
      });

    it('prefers the closest result: a puzzle one level off beats one several levels off', function () {
      var board6 = SG.fixtures.models.boxGrid('boxGrid6', 2, 3);
      var result = SG.digger.generate(board6, 'normal', SG.rng.create(9100), { maxAttempts: 2, digTries: 2 });
      if (!result.exact) {
        expect(result.warnings).toContain('difficulty.approximate');
        expect(Math.abs(idx(result.achieved) - idx('normal'))).toBeLessThanOrEqual(2);
      }
      expect(SG.dfs.countSolutions(board6, result.givens, 2)).toBe(1);
    });

    it('stops after maxAttempts x digTries dig samples and never more', function () {
      var result = SG.digger.generate(board4, 'hard', SG.rng.create(9200), { maxAttempts: 2, digTries: 5 });
      expect(result.samples).toBe(10);
      expect(result.attempts).toBe(2);
    });

    it('tries more dig samples per grid when the symmetry digs in groups of four', function () {
      var pairs = SG.digger.generate(board4, 'hard', SG.rng.create(9210), { maxAttempts: 1 });
      var fours = SG.digger.generate(board4, 'hard', SG.rng.create(9210),
        { maxAttempts: 1, symmetry: 'mirrorBoth' });
      expect(pairs.samples).toBe(12);
      expect(fours.samples).toBe(30);
    });

    it('throws digger.noRatedPuzzle when not one sample has a complete proof', function () {
      var rate = D.rate;
      D.rate = function () {
        var r = rate.apply(this, arguments);
        return Object.assign({}, r,
          { solved: false, level: null, score: null, rawScore: null, confidence: 0 });
      };
      try {
        expectCode(function () {
          SG.digger.generate(board4, 'veryEasy', SG.rng.create(9300), { maxAttempts: 2, digTries: 2 });
        }, 'digger.noRatedPuzzle');
      } finally {
        D.rate = rate;
      }
    });
  });

  describe('digger.generate: safety net against a technique bug (risk R3)', function () {
    /**
     * A technique that guesses: in the first open cell it places the value of one solution of the position
     * (the first the DFS finds), whether or not the position has other solutions. It is registered as the
     * cheapest technique of the basic group (with a weight of 1), so the oracle of every level uses it, and
     * it "solves" puzzles that have many solutions. Its placements always lead to a solution, so a rating
     * with it is complete: without the final DFS check the generator would return ambiguous puzzles.
     */
    function withGuesser(fn) {
      SG.techniques.register({
        id: 'testGuesser',
        group: 'basic',
        baseCost: 1,
        order: 5,
        i18nKey: 'technique.testGuesser',
        find: function (model, state) {
          var givens = new Int32Array(model.cellCount);
          var open = -1;
          for (var c = 0; c < model.cellCount; c++) {
            givens[c] = state.value[c];
            if (open === -1 && state.value[c] === 0) open = c;
          }
          if (open === -1) return null;
          var solved = SG.dfs.solve(model, givens);
          if (solved === null || (state.candidates[open] & (1 << (solved[open] - 1))) === 0) return null;
          return {
            technique: 'testGuesser', cells: [open], placements: [[open, solved[open]]], eliminations: [],
            i18nKey: 'technique.testGuesser.step', i18nArgs: {}
          };
        }
      });
      try {
        return withWeights({ testGuesser: 1 }, fn);
      } finally {
        SG.techniques.unregister('testGuesser');
      }
    }

    it('never returns an ambiguous puzzle, reports the bug and still delivers a unique puzzle', function () {
      withGuesser(function () {
        var unsound = 0;
        for (var i = 0; i < 12; i++) {
          var p = SG.digger.generate(model9, 'veryEasy', SG.rng.create(9300 + i),
            { maxAttempts: 1, digTries: 1 });
          expect(SG.dfs.countSolutions(model9, p.givens, 2)).toBe(1);
          expect(SG.model.isSolution(model9, p.solution)).toBe(true);
          expect(p.rating.solved).toBe(true);
          if (p.warnings.indexOf('digger.unsoundTechnique') !== -1) unsound++;
        }
        // The bug must have been caught at least once, or this test proves nothing.
        expect(unsound).toBeGreaterThan(0);
      });
    });

    it('digLevel marks the puzzle it had to replace', function () {
      withGuesser(function () {
        var flagged = 0;
        for (var i = 0; i < 12; i++) {
          var rng = SG.rng.create(9400 + i);
          var solution = SG.fullGrid.generate(model9, rng.fork('grid'), null);
          var p = SG.digger.digLevel(model9, solution, 'veryEasy', rng.fork('dig'), {});
          expect(SG.dfs.countSolutions(model9, p.givens, 2)).toBe(1);
          if (p.unsound) flagged++;
        }
        expect(flagged).toBeGreaterThan(0);
      });
    });

    /**
     * A technique that guesses only where it matters: on a model whose first position has more than one
     * solution it places the values of one of them, cell by cell, so a puzzle with two solutions gets a
     * complete proof that claims uniqueness (it does not declare `assumesUniqueness`). Weight 350, so the
     * oracles from hard on use it.
     */
    function withAmbiguityGuesser(fn) {
      var ambiguous = new WeakMap();
      SG.techniques.register({
        id: 'testAmbiguityGuesser',
        group: 'basic',
        baseCost: 1,
        order: 5,
        i18nKey: 'technique.testAmbiguityGuesser',
        find: function (model, state, ctx) {
          var givens = Int32Array.from(state.value);
          if (!ambiguous.has(model)) {
            ambiguous.set(model, SG.dfs.countSolutions(model, givens, 2, ctx && ctx.budget) === 2);
          }
          if (!ambiguous.get(model)) return null;
          var open = Array.prototype.indexOf.call(givens, 0);
          if (open === -1) return null;
          var solved = SG.dfs.solve(model, givens, null, ctx && ctx.budget);
          if (!solved || (state.candidates[open] & (1 << (solved[open] - 1))) === 0) return null;
          return {
            technique: 'testAmbiguityGuesser', cells: [open], placements: [[open, solved[open]]],
            eliminations: [], i18nKey: 'technique.testAmbiguityGuesser.step', i18nArgs: {}
          };
        }
      });
      try {
        return withWeights({ testAmbiguityGuesser: 350 }, fn);
      } finally {
        SG.techniques.unregister('testAmbiguityGuesser');
      }
    }

    it('never returns an ambiguous candidate of a search either: the keeper counts before it keeps',
      function () {
        withAmbiguityGuesser(function () {
          // Killer's layout search offers its layouts to the keeper on the strength of their proofs; with
          // this seed one of them has two solutions and must not come back as the closest puzzle (score 945).
          var config = {
            variantId: 'killer', difficulty: 'master', seed: 61843, symmetry: 'diagonal', maxAttempts: 1,
            trace: 'off'
          };
          var r = null;
          try {
            r = SG.pipeline.run(config);
          } catch (err) {
            // The one permitted alternative: no completely rated, verified puzzle at all.
            expect(err.code).toBe('digger.noRatedPuzzle');
          }
          if (r !== null) {
            expect(SG.dfs.countSolutions(r.model, r.givens, 2)).toBe(1);
            expect(r.rating.solved).toBe(true);
            // The contradicted proof is reported as a technique bug.
            expect(r.warnings).toContain('digger.unsoundTechnique');
          }
        });
      });
  });
})();
