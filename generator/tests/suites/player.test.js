// Replay player: the two views built from the analysis of a result (`buildViews`, pure), the table models of the
// steps, the board at a position (`viewAt`), the texts of a step, the preparation controller (fake clients), and
// the manual player with a fake board and a tiny fake DOM, so everything runs on Node. Real results come from the
// pipeline or from the golden requests of tests/fixtures/replay-goldens.js; analyses from `SG.replay.analyse`.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var P = SG.player;
  var R = SG.replay;
  var GOLDENS = SG.fixtures.replayGoldens;
  var WIRE = SG.fixtures.replayWire;

  var resultCache = {};
  var analysisCache = [];

  /** A real result (memoised). */
  function realResult(variantId, difficulty, seed) {
    var key = [variantId, difficulty, seed].join('/');
    if (!resultCache[key]) {
      resultCache[key] = SG.pipeline.run(
        { variantId: variantId, difficulty: difficulty, seed: seed, trace: 'off' }, null);
    }
    return resultCache[key];
  }

  /** The result of a golden request (read from the saved data for the slow ones), memoised. */
  function goldenResult(id) {
    var key = 'golden/' + id;
    if (!resultCache[key]) {
      var g = GOLDENS.filter(function (x) { return x.id === id; })[0];
      resultCache[key] = WIRE[id] ? R.fromPlainWire(WIRE[id])
        : SG.pipeline.run(SG.store.toConfig(g.request), null, SG.budget.create({ ms: 120000 }));
    }
    return resultCache[key];
  }

  /** The analysis of a result (memoised per result). */
  function analysisOf(result) {
    for (var i = 0; i < analysisCache.length; i++) {
      if (analysisCache[i].result === result) return analysisCache[i].analysis;
    }
    var analysis = R.analyse(result);
    analysisCache.push({ result: result, analysis: analysis });
    return analysis;
  }

  function viewsOf(result) {
    return P.buildViews(result, analysisOf(result));
  }

  /** The steps of the details view (one per complete move), unless a test asks for the compact view. */
  function stepsOf(result) {
    return viewsOf(result).details.steps;
  }

  function compactOf(result) {
    return viewsOf(result).compact.steps;
  }

  function kinds(steps) {
    return steps.map(function (s) { return s.kind; });
  }

  function clues(values) {
    var n = 0;
    for (var i = 0; i < values.length; i++) if (values[i] > 0) n++;
    return n;
  }

  function sameValues(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function inLocale(code, fn) {
    var before = SG.i18n.current;
    SG.i18n.setLocale(code);
    try {
      return fn();
    } finally {
      SG.i18n.setLocale(before);
    }
  }

  function withLabels(result, fn) {
    SG.i18n.setCellLabeler(function (c) { return SG.model.cellLabel(result.model, c); });
    try {
      return fn();
    } finally {
      SG.i18n.setCellLabeler(null);
    }
  }

  /** Fake board: keeps what the real one would show, and logs the calls. */
  function fakeBoard(n) {
    var board = {
      values: new Int32Array(n),
      givens: null,
      frames: {},
      layers: {},
      signMarks: null,
      model: null,
      models: [],
      calls: [],
      setValues: function (values) {
        board.calls.push('setValues');
        board.values = Int32Array.from(values);
      },
      setGivens: function (givens) {
        board.calls.push('setGivens');
        board.givens = givens ? Array.from(givens) : null;
      },
      highlight: function (cells, cls) {
        board.calls.push('highlight');
        board.frames[cls] = (board.frames[cls] || []).concat(Array.from(cells));
      },
      clearHighlights: function () {
        board.calls.push('clearHighlights');
        board.frames = {};
      },
      setLayerVisible: function (name, flag) { board.layers[name] = flag; },
      setSignMarks: function (marks) { board.signMarks = marks; },
      setModel: function (model) {
        board.model = model;
        board.models.push(model);
      }
    };
    return board;
  }

  /** A player with a fake board that has its analysis loaded (the finished puzzle on show). */
  function rig(cells) {
    var board = fakeBoard(cells);
    var positions = [];
    var states = [];
    var steps = [];
    var prepares = [];
    var player = P.create({
      board: board,
      onPosition: function (info) { positions.push(info); },
      onStateChange: function (s) { states.push(s); },
      onSteps: function (info) { steps.push(info); },
      onPrepare: function () { prepares.push(true); }
    });
    return { player: player, board: board, positions: positions, states: states, steps: steps,
      prepares: prepares };
  }

  /** A rig with the result loaded and its analysis set: both views exist, the last step is on show. */
  function loadedRig(result, cells) {
    var r = rig(cells || result.model.cellCount);
    r.player.load(result);
    r.player.setAnalysis(analysisOf(result));
    return r;
  }

  /** Just enough DOM for `bindControls`: elements with attributes, properties and listeners. */
  function fakeEl(name) {
    var el = {
      name: name,
      attrs: {},
      listeners: {},
      disabled: true,
      textContent: '',
      value: '0',
      max: '0',
      setAttribute: function (key, value) { el.attrs[key] = String(value); },
      getAttribute: function (key) { return el.attrs[key] === undefined ? null : el.attrs[key]; },
      addEventListener: function (type, fn) { (el.listeners[type] = el.listeners[type] || []).push(fn); },
      removeEventListener: function (type, fn) {
        el.listeners[type] = (el.listeners[type] || []).filter(function (other) { return other !== fn; });
      },
      fire: function (type) {
        (el.listeners[type] || []).slice().forEach(function (fn) { fn({ type: type }); });
      },
      listenerCount: function () {
        return Object.keys(el.listeners).reduce(function (sum, type) {
          return sum + el.listeners[type].length;
        }, 0);
      }
    };
    return el;
  }

  function fakeControls() {
    var els = {
      '#btn-first': fakeEl('first'), '#btn-prev': fakeEl('prev'), '#btn-next': fakeEl('next'),
      '#btn-last': fakeEl('last'), '#scrubber': fakeEl('scrubber'), '#player-time': fakeEl('time'),
      '#replay-view-details': fakeEl('toggle'), '#replay-status': fakeEl('status'),
      '#replay-status-text': fakeEl('statusText'), '#btn-prepare-replay': fakeEl('prepare')
    };
    els['#replay-view-details'].checked = false;
    return { root: { querySelector: function (sel) { return els[sel] || null; } }, els: els };
  }

  describe('player: the replay steps of a result', function () {
    var CASES = [['classic9', 'easy', 3], ['classic9', 'normal', 3], ['classic9', 'nightmare', 5],
      ['classic4', 'veryEasy', 2], ['killer', 'normal', 2], ['greaterThan', 'normal', 4],
      ['jigsaw9', 'easy', 6], ['wordoku', 'easy', 1], ['mega12', 'easy', 2]];

    CASES.forEach(function (c) {
      it(c[0] + ' ' + c[1] + ': both views start from the full solution and end on the puzzle, every step ' +
        'a visible change',
        function () {
          var result = realResult(c[0], c[1], c[2]);
          var views = viewsOf(result);
          expect(views.cellCount).toBe(result.model.cellCount);
          ['compact', 'details'].forEach(function (name) {
            var steps = views[name].steps;
            expect(views[name].name).toBe(name);
            expect(steps.length).toBeGreaterThan(2);
            expect(steps[0].kind).toBe('solution');
            expect(Array.from(steps[0].values)).toEqual(Array.from(result.solution));
            var last = steps[steps.length - 1];
            expect(last.kind).toBe('final');
            expect(Array.from(last.values)).toEqual(Array.from(result.givens));
            steps.forEach(function (s, i) {
              expect(s.index).toBe(i + 1);
              expect(s.view).toBe(name);
              expect(P.KINDS).toContain(s.kind);
              expect(['fullGrid', 'extraStructure', 'dig']).toContain(s.phase);
              expect(s.parts.length).toBeGreaterThan(0);
              expect([s.key, s.args]).toEqual([s.parts[0].key, s.parts[0].args]);
              expect(s.table).toBeTruthy();
              if (i === 0) return;
              var before = steps[i - 1];
              var changed = !sameValues(s.values, before.values) || s.structure !== before.structure ||
                s.marks.dug.length + s.marks.kept.length + s.marks.revealed.length > 0 ||
                (s.signs !== null && s.signs.removed.length + s.signs.kept.length > 0) || s.kind === 'final';
              expect(changed).toBe(true);
            });
          });
        }, 60000);
    });

    it('has the 13 kinds of title, each with a title text, and every kind of the views is one of them',
      function () {
        expect(P.KINDS).toEqual(['solution', 'cages', 'signs', 'clues', 'random', 'dig', 'guided', 'search',
          'signDig', 'reveal', 'mixed', 'restart', 'final']);
        var seen = {};
        CASES.concat([['classic9', 'hell1', 3]]).forEach(function (c) {
          var views = viewsOf(realResult(c[0], c[1], c[2]));
          kinds(views.compact.steps).concat(kinds(views.details.steps)).forEach(function (k) { seen[k] = true; });
        });
        Object.keys(seen).forEach(function (k) { expect(P.KINDS).toContain(k); });
        expect(seen.random && seen.guided && seen.signDig && seen.cages && seen.signs).toBe(true);
      }, 60000);

    it('frames what each dig step did (details view): removed cells are empty and were clues, put-back ' +
      'cells keep their value',
      function () {
        var result = realResult('classic9', 'normal', 3);
        var steps = stepsOf(result);
        var dig = steps.filter(function (s) { return s.kind === 'random' || s.kind === 'guided'; });
        expect(dig.length).toBeGreaterThan(3);
        dig.forEach(function (s) {
          var before = steps[s.index - 2];
          // The one clue that causes a score jump is framed as the cause, not as a plain removal.
          var cleared = s.marks.dug.concat(s.marks.cause);
          expect(cleared.length).toBeGreaterThan(0);
          cleared.forEach(function (cell) {
            expect(s.values[cell]).toBe(0);
            expect(before.values[cell]).toBe(result.solution[cell]);
          });
          s.marks.kept.forEach(function (cell) { expect(s.values[cell]).toBe(result.solution[cell]); });
          expect(clues(before.values) - clues(s.values)).toBe(cleared.length);
          if (s.kind === 'random') expect(s.args.removed).toBe(cleared.length);
          expect(s.metrics.clues).toBe(clues(s.values));
        });
      });

    it('counts the removals and refusals of the moves up to each step, as the metrics (details view)',
      function () {
        var cases = [['classic9', 'easy', 3], ['classic9', 'normal', 3], ['greaterThan', 'normal', 4]];
        cases.forEach(function (c) {
          var result = realResult(c[0], c[1], c[2]);
          var analysis = analysisOf(result);
          var steps = stepsOf(result);
          var accepted = 0;
          var rejected = 0;
          var next = 1;
          steps.forEach(function (s) {
            if (s.metrics === null) return;
            for (; next <= s.last; next++) {
              var m = analysis.moves[next];
              if (['random', 'guided', 'searchRemove', 'exchange'].indexOf(m.kind) !== -1) accepted += m.removed.length;
              if (m.kind === 'sign') accepted++;
              [m.span, m.span && m.span.trail].forEach(function (part) {
                if (part) rejected += part.rejected.length + part.rejectedSigns.length;
              });
            }
            expect(s.metrics.accepted).toBe(accepted);
            expect(s.metrics.rejected).toBe(rejected);
            expect(s.metrics.attempts).toBe(accepted + rejected);
            expect(s.metrics.clues).toBe(clues(s.values));
          });
          var m = steps[steps.length - 1].metrics;
          expect(m.accepted).toBeGreaterThan(0);
          expect(steps[0].metrics).toBeNull();
        });
      }, 60000);

    it('the compact view never goes down, every step is scored and the last is the finished puzzle; the ' +
      'details view has one step per move',
      function () {
        [['classic9', 'easy', 3], ['classic9', 'normal', 3], ['classic9', 'nightmare', 5], ['jigsaw9', 'easy', 6]]
          .forEach(function (c) {
            var result = realResult(c[0], c[1], c[2]);
            var analysis = analysisOf(result);
            var views = viewsOf(result);
            var scores = views.compact.steps.map(function (s) { return s.table.score; });
            scores.forEach(function (score, i) {
              expect(typeof score).toBe('number');
              if (i > 0) expect(score).toBeGreaterThan(scores[i - 1] - 1);
            });
            var last = views.compact.steps[views.compact.steps.length - 1];
            expect(last.kind).toBe('final');
            expect(last.table.state).toBe('final');
            expect(last.table.score).toBe(result.rating.score);
            expect(views.details.steps.length).toBe(analysis.moves.length + 1);
            expect(views.compact.steps.length).toBeLessThan(views.details.steps.length);
          });
      }, 60000);

    it('a guided step takes its rated and refused counts from the spans of its moves, in move order',
      function () {
        var result = goldenResult('G01');
        var steps = compactOf(result);
        var four = steps[3];
        var five = steps[4];
        expect([four.kind, four.line, four.key]).toEqual(['guided', 'deeper', 'replay.guided']);
        expect([four.args.rated, four.args.refused]).toEqual([15, 5]);
        expect([five.key, five.args.rounds, five.args.rated, five.args.refused]).toEqual(
          ['replay.guided.rounds', 3, 17, 6]);
        var analysis = analysisOf(result);
        var removed = [];
        for (var i = five.first; i <= five.last; i++) removed = removed.concat(analysis.moves[i].removed);
        expect(five.args.cellList).toEqual(removed);
        stepsOf(result).filter(function (s) { return s.kind === 'guided'; }).forEach(function (s) {
          expect(s.line).toBe('deeper');
          expect(s.args.cellList).toEqual(analysis.moves[s.position].removed);
          expect(s.args.rated).toBeGreaterThan(0);
        });
      }, 60000);

    it('random runs say how many cells were tried, cleared and put back, and why', function () {
      var steps = compactOf(realResult('classic9', 'easy', 3));
      var random = steps.filter(function (s) { return s.kind === 'random'; });
      expect(random.length).toBeGreaterThan(2);
      expect(random[0].key).toBe('replay.random.all');
      random.forEach(function (s) {
        if (s.key !== 'replay.random.some') return;
        expect(['ambiguous', 'techniques', 'tooHard', 'mixed']).toContain(s.args.reason);
        expect(s.args.tried).toBe(s.args.removed + s.args.kept);
      });
      var detailed = stepsOf(realResult('classic9', 'normal', 3)).filter(function (s) {
        return s.key === 'replay.random.some';
      });
      expect(detailed.length).toBeGreaterThan(0);
    });

    it('an exchange step counts its moves, the cells it cleared and the clues it restored (gross)', function () {
      var step = compactOf(goldenResult('G01'))[5];
      expect(step.kind).toBe('search');
      expect(step.key).toBe('replay.exchange');
      expect([step.args.count, step.args.removed, step.args.revealed]).toEqual([5, 10, 10]);
    });

    it('Killer: the cages appear in the step after the solution', function () {
      var steps = stepsOf(realResult('killer', 'normal', 2));
      expect(kinds(steps).slice(0, 2)).toEqual(['solution', 'cages']);
      expect(steps[0].structure).toBe(false);
      steps.slice(1).forEach(function (s) { expect(s.structure).toBe(true); });
      expect(steps[1].args.count).toBe(realResult('killer', 'normal', 2).model.cages.length);
      expect(sameValues(steps[1].values, steps[0].values)).toBe(true);
    });

    it('Greater-Than: every sign, then the starting clues, then the signs taken away one move at a time',
      function () {
        var result = realResult('greaterThan', 'normal', 4);
        var built = viewsOf(result).details;
        var steps = built.steps;
        expect(kinds(steps).slice(0, 3)).toEqual(['solution', 'signs', 'clues']);
        expect(built.signs.length).toBe(steps[1].args.signs);
        expect(built.signs.length).toBeGreaterThan(result.model.inequalities.length);
        expect(steps[1].signs.hidden).toEqual([]);
        steps[2].marks.revealed.forEach(function (c) {
          expect(steps[2].values[c]).toBe(result.solution[c]);
        });
        expect(clues(steps[2].values)).toBe(steps[2].marks.revealed.length);
        var signSteps = steps.filter(function (s) { return s.kind === 'signDig'; });
        expect(signSteps.length).toBeGreaterThan(2);
        var hidden = 0;
        signSteps.forEach(function (s) {
          expect(s.signs.hidden.length).toBe(hidden);
          expect(s.signs.removed.length).toBe(1);
          expect(s.args.removed).toBe(1);
          hidden += s.signs.removed.length;
          expect(s.args.signs).toBe(built.signs.length - hidden);
        });
        var last = steps[steps.length - 1];
        expect(built.signs.length - last.signs.hidden.length).toBe(result.model.inequalities.length);
        expect(last.key).toBe('replay.final.signs');
        expect(last.args.signs).toBe(result.model.inequalities.length);
      });

    it('Greater-Than, compact view: the sign frames follow the alive signs of the moves', function () {
      var result = goldenResult('G12');
      var analysis = analysisOf(result);
      var compact = P.buildViews(result, analysis).compact;
      compact.steps.forEach(function (s) {
        if (s.role !== 'moves') return;
        var start = analysis.moves[s.first - 1].alive;
        var end = analysis.moves[s.last].alive;
        expect(s.signs.removed).toEqual(start.filter(function (i) { return end.indexOf(i) === -1; }));
        expect(s.signs.hidden.length).toBe(compact.signs.length - start.length);
        s.signs.kept.forEach(function (i) { expect(end).toContain(i); });
      });
    }, 60000);

    it('without a dig log the replay is the solution, the structure and the puzzle; without a solution ' +
      'only the puzzle',
      function () {
        var result = realResult('killer', 'easy', 1);
        var bare = Object.assign({}, result, { digLog: undefined });
        var fallbackViews = function (r) { return P.buildViews(r, R.fallback(r, 'noLog')); };
        ['compact', 'details'].forEach(function (name) {
          expect(kinds(fallbackViews(bare)[name].steps)).toEqual(['solution', 'cages', 'final']);
          expect(kinds(fallbackViews(Object.assign({}, bare, { solution: null }))[name].steps)).toEqual(['final']);
        });
        var classic = Object.assign({}, realResult('classic9', 'easy', 3), { digLog: [] });
        expect(kinds(fallbackViews(classic).details.steps)).toEqual(['solution', 'final']);
        fallbackViews(bare).details.steps.forEach(function (s) { expect(s.metrics).toBeNull(); });
      });

    it('is deterministic and plain data (the shared context is one frozen object per call)', function () {
      var result = realResult('classic9', 'normal', 3);
      var plain = function (k, v) { return v instanceof Int32Array ? Array.from(v) : k === 'context' ? undefined : v; };
      var a = JSON.stringify(viewsOf(result), plain);
      var b = JSON.stringify(P.buildViews(result, analysisOf(result)), plain);
      expect(a).toBe(b);
      var views = viewsOf(result);
      var context = views.compact.steps[0].context;
      expect(Object.isFrozen(context)).toBe(true);
      expect(context.moves).toBe(analysisOf(result).moves);
      views.compact.steps.concat(views.details.steps).forEach(function (s) { expect(s.context).toBe(context); });
      expect(views.compact.steps[0].table.counts).not.toBe(analysisOf(result).ratings[0].counts);
    });

    it('one complete move per details step: no position shows half of an exchange', function () {
      var result = goldenResult('G01');
      var analysis = analysisOf(result);
      var steps = stepsOf(result);
      expect(steps.length).toBe(33);
      var exchanges = steps.filter(function (s) { return s.role === 'moves' && analysis.moves[s.position].kind === 'exchange'; });
      expect(exchanges.length).toBe(5);
      exchanges.forEach(function (s) {
        var move = analysis.moves[s.position];
        expect(s.kind).toBe('search');
        expect(s.key).toBe('replay.exchange');
        expect(s.args.count).toBe(1);
        move.removed.forEach(function (c) { expect(s.values[c]).toBe(0); });
        move.restored.forEach(function (c) { expect(s.values[c]).toBe(result.solution[c]); });
      });
    });

    /** Every step's clue count agrees with its board, and a reveal never shows up in the step before it. */
    function expectFaithful(steps) {
      steps.forEach(function (s, i) {
        if (s.metrics !== null) expect(s.metrics.clues).toBe(clues(s.values));
        if (s.kind !== 'reveal') return;
        s.marks.revealed.forEach(function (c) {
          if (steps[i - 1].values[c] !== 0) {
            throw new Error('step ' + s.index + ': cell ' + c + ' is already shown in step ' +
              steps[i - 1].index);
          }
          expect(s.values[c]).not.toBe(0);
        });
      });
    }

    /** A synthetic result with the rating of its own final board (the supplied rating is the final row). */
    function withRating(result) {
      return Object.assign({}, result, { rating: SG.difficulty.rate(result.model, result.givens) });
    }

    it('closes a batch of removals before the clues of a reveal come back (the removal shows its own board)',
      function () {
        var base = realResult('classic9', 'veryEasy', 1);
        var givens = Int32Array.from(base.solution);
        var synthetic = withRating(Object.assign({}, base, { givens: givens, digLog: [
          { op: 'pass', pass: 'random', clues: 81 },
          { op: 'accept', cells: [0, 80] },
          { op: 'reveal', cells: [0, 80] }
        ] }));
        var steps = stepsOf(synthetic);
        expect(kinds(steps)).toEqual(['solution', 'random', 'reveal', 'final']);
        expect([steps[1].values[0], steps[1].values[80]]).toEqual([0, 0]);
        expect([steps[2].values[0], steps[2].values[80]]).toEqual([base.solution[0], base.solution[80]]);
        expect(steps[1].metrics.clues).toBe(79);
        expect(steps[2].args.clues).toBe(81);
        expectFaithful(steps);
      });

    it('a guided accept without a candidate compared is a search move: it merges with the clues shown again ' +
      'right after it (an exchange)',
      function () {
        var base = realResult('mega16', 'veryEasy', 1);
        var n = base.model.cellCount;
        var givens = Int32Array.from(base.solution);
        [1, n - 2].forEach(function (c) { givens[c] = 0; });
        var synthetic = withRating(Object.assign({}, base, { givens: givens, digLog: [
          { op: 'pass', pass: 'guided', clues: n },
          { op: 'accept', cells: [0, n - 1] },
          { op: 'accept', cells: [1, n - 2] },
          { op: 'reveal', cells: [0, n - 1], reason: 'search' }
        ] }));
        var analysis = analysisOf(synthetic);
        expect(analysis.moves.map(function (m) { return m.kind; })).toEqual(
          ['solution', 'searchRemove', 'exchange']);
        var steps = stepsOf(synthetic);
        expect(kinds(steps)).toEqual(['solution', 'search', 'search', 'final']);
        [0, n - 1].forEach(function (c) { expect(steps[1].values[c]).toBe(0); });
        expect(steps[1].key).toBe('replay.searchRemove');
        expect(steps[2].key).toBe('replay.exchange');
        expect(steps[2].args.count).toBe(1);
        expect(analysis.moves[2].restored).toEqual([0, n - 1]);
        expect(analysis.moves[2].removed).toEqual([1, n - 2]);
        [0, n - 1].forEach(function (c) { expect(steps[2].values[c]).toBe(base.solution[c]); });
        [1, n - 2].forEach(function (c) { expect(steps[2].values[c]).toBe(0); });
        expect(steps[2].marks.dug).toEqual([1, n - 2]);
        expect(steps[2].marks.revealed).toEqual([0, n - 1]);
        expect(sameValues(steps[2].values, givens)).toBe(true);
        expect(sameValues(steps[steps.length - 1].values, givens)).toBe(true);
        expectFaithful(steps);
      });

    it('real top-level results with clues shown again replay faithfully (mega16, classic9)', function () {
      [['mega16', 'nightmare', 478576959], ['mega16', 'hell1', 2422420669], ['classic9', 'hell1', 3]]
        .forEach(function (c) {
          var result = realResult(c[0], c[1], c[2]);
          var analysis = analysisOf(result);
          var steps = stepsOf(result);
          expectFaithful(steps);
          steps.forEach(function (s) {
            if (s.role === 'final') expect(sameValues(s.values, result.givens)).toBe(true);
            else expect(sameValues(s.values, analysis.moves[s.position].values)).toBe(true);
          });
        });
    }, 60000);
  });

  describe('player: the board at a position', function () {
    it('is the empty grid at 0, the step after, clamped at both ends', function () {
      var built = viewsOf(realResult('killer', 'normal', 2)).details;
      var start = P.viewAt(built, 0);
      expect(start.step).toBeNull();
      expect(clues(start.values)).toBe(0);
      expect(start.structure).toBe(false);
      expect(P.viewAt(built, -4).position).toBe(0);
      var end = P.viewAt(built, 999);
      expect(end.position).toBe(built.steps.length);
      expect(end.final).toBe(true);
      expect(P.viewAt(built, 2).step).toBe(built.steps[1]);
    });
  });

  describe('player: texts of the steps', function () {
    var EXAMPLE = {
      en: [
        ['Full solution', 'Fill the whole grid with a random solution that follows every rule (81 cells).'],
        ['Random removals', 'Clear 14 cells chosen at random: the puzzle can still be solved without their clues.'],
        ['Random removals', 'Try to clear 35 cells chosen at random: 29 cells cleared, 6 cells put back because ' +
          'without their clues, the solver did not finish the puzzle with the techniques of this level.'],
        ['Choosing clues to remove', 'Compare 15 possible removals (5 rejected) and choose the removal ' +
          'preferred by the generator\'s check: R1C2 and R9C8.'],
        ['Choosing clues to remove', 'Across 3 accepted removals, compare 17 possible removals (6 rejected); ' +
          'the removed clues are at R3C3, R7C7, R3C9, R7C1, R4C1 and R6C9.'],
        ['Adjusting the puzzle', 'Across 5 complete changes, clear 10 cells and restore 10 clues while looking ' +
          'for a higher-scoring puzzle.'],
        ['Finished puzzle', 'The finished puzzle: 30 clues.']
      ],
      vi: [
        ['Lời giải đầy đủ', 'Điền kín lưới bằng một lời giải ngẫu nhiên tuân theo mọi luật (81 ô).'],
        ['Xóa ngẫu nhiên', 'Bỏ số ở 14 ô được chọn ngẫu nhiên: đề vẫn giải được khi thiếu các số đó.'],
        ['Xóa ngẫu nhiên', 'Thử bỏ số ở 35 ô được chọn ngẫu nhiên: bỏ được số ở 29 ô và khôi phục số ở 6 ô, vì ' +
          'bộ giải chưa giải xong đề bằng các kỹ thuật của mức này khi thiếu các số đó.'],
        ['Chọn số cho sẵn để bỏ', 'Xét 15 cách bỏ số (5 bị loại) và chọn phương án được ưu tiên theo phép ' +
          'kiểm tra của trình sinh đề: bỏ số ở R1C2 và R9C8.'],
        ['Chọn số cho sẵn để bỏ', 'Qua 3 lần chọn phương án bỏ số, đã xét 17 cách bỏ số (6 bị loại); các ô ' +
          'được bỏ số là R3C3, R7C7, R3C9, R7C1, R4C1 và R6C9.'],
        ['Điều chỉnh đề', 'Qua 5 thay đổi trọn vẹn nhằm tìm đề có điểm cao hơn, tổng cộng bỏ số ở 10 ô và khôi ' +
          'phục 10 số cho sẵn.'],
        ['Đề hoàn chỉnh', 'Đề hoàn chỉnh: 30 số cho sẵn.']
      ]
    };

    function expectClean(text) {
      expect(text.length).toBeGreaterThan(0);
      expect(/[{}]/.test(text)).toBe(false);
      expect(/^replay\./.test(text)).toBe(false);
      expect(/undefined|NaN|\[object/.test(text)).toBe(false);
    }

    it('describes every step of both views in English and Vietnamese with no placeholder left, naming the ' +
      'cells (the 14 goldens and real puzzles)',
      function () {
        var results = GOLDENS.map(function (g) { return goldenResult(g.id); }).concat([
          realResult('classic9', 'normal', 3), realResult('greaterThan', 'normal', 4), realResult('killer', 'normal', 2)
        ]);
        results.forEach(function (result) {
          var views = viewsOf(result);
          withLabels(result, function () {
            ['en', 'vi'].forEach(function (code) {
              inLocale(code, function () {
                ['compact', 'details'].forEach(function (name) {
                  views[name].steps.forEach(function (s) {
                    [P.describeStep(s), P.stepTitle(s), P.stepMeta(s)].forEach(expectClean);
                  });
                });
                expect(P.describeStep(null).length).toBeGreaterThan(10);
              });
            });
            var guided = views.details.steps.filter(function (s) { return s.kind === 'guided'; })[0];
            if (guided) inLocale('en', function () { expect(P.describeStep(guided)).toMatch(/R\dC\d/); });
          });
        });
        inLocale('en', function () {
          expect(P.positionText(0, 12)).toBe('Start');
          expect(P.positionText(3, 12)).toBe('Step 3 of 12');
        });
      }, 120000);

    it('the seven compact steps of the example read as specified, in English and Vietnamese', function () {
      var result = goldenResult('G01');
      var steps = compactOf(result);
      expect(steps.length).toBe(7);
      withLabels(result, function () {
        ['en', 'vi'].forEach(function (code) {
          inLocale(code, function () {
            steps.forEach(function (s, i) {
              expect([P.stepTitle(s), P.describeStep(s)]).toEqual(EXAMPLE[code][i]);
            });
          });
        });
        inLocale('en', function () {
          expect(P.stepMeta(steps[5])).toBe('10 cells cleared \u00b7 10 clues restored \u00b7 30 clues left');
          expect(P.stepMeta(steps[3])).toBe('2 cells removed \u00b7 10 cells put back \u00b7 36 clues left');
          expect(P.stepMeta(steps[0])).toBe('81 cells');
          expect(P.stepMeta(steps[6])).toBe('30 clues');
        });
      });
      expect(steps.map(function (s) { return s.table.score; })).toEqual([0, 23, 44, 551, 568, 992, 992]);
      expect(steps.map(function (s) { return s.table.change; })).toEqual([null, 23, 21, 507, 17, 424, 0]);
    }, 60000);

    it('the example of the guides: Classic 9x9 easy, seed 3, replays in 7 steps (26 with every move shown)',
      function () {
        var views = viewsOf(realResult('classic9', 'easy', 3));
        expect(views.compact.steps.map(function (s) { return s.table.score; })).toEqual(
          [0, 14, 24, 34, 44, 46, 46]);
        expect(kinds(views.compact.steps)).toEqual(
          ['solution', 'random', 'random', 'random', 'random', 'guided', 'final']);
        expect(views.details.steps.length).toBe(26);
        expect(views.compact.steps[6].args.clues).toBe(34);
      });

    it('tells what a compact step folds: the inner peak (above the level with clues restored, or plain) ' +
      'and nothing for a step that folds nothing',
      function () {
        [['G06', 5], ['G07', 7], ['G10', 7]].forEach(function (c) {
          var step = compactOf(goldenResult(c[0]))[c[1]];
          var folded = step.parts[step.parts.length - 1];
          expect(folded.key).toBe('replay.folded.reveal');
          inLocale('en', function () {
            expect(P.describeStep(step)).toMatch(
              /the score reached [\d,]+, above the chosen level, and \d+ clues? were restored/);
          });
        });
        var g06 = compactOf(goldenResult('G06'));
        expect(g06[5].parts[g06[5].parts.length - 1].args.peak).toBe(2967);
        inLocale('en', function () { expect(P.describeStep(g06[5])).toContain('the score reached 2,967'); });
        var plain = compactOf(goldenResult('G11'))[2];
        expect(plain.parts[plain.parts.length - 1].key).toBe('replay.folded.peak');
        expect(plain.parts[plain.parts.length - 1].args.peak).toBe(275);
        g06.slice(0, 4).forEach(function (s) {
          s.parts.forEach(function (part) { expect(part.key).not.toMatch(/^replay\.folded/); });
        });
        viewsOf(goldenResult('G06')).details.steps.forEach(function (s) {
          s.parts.forEach(function (part) { expect(part.key).not.toMatch(/^replay\.folded/); });
        });
      }, 60000);

    it('folds a restart into "Starting again": the abandoned peak and the moves are told in the compact step',
      function () {
        var model = SG.variants.get('classic4').build({}, null);
        var solution = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1];
        var givens = Int32Array.from(solution);
        [0, 15].forEach(function (c) { givens[c] = 0; });
        var result = {
          model: model, givens: givens, solution: Int32Array.from(solution),
          config: { difficulty: 'normal', digOrder: 'random', symmetry: 'rotational180' },
          digLog: [
            { op: 'pass', pass: 'random', clues: 16 },
            { op: 'accept', cells: [0, 15] },
            { op: 'restart' },
            { op: 'pass', pass: 'fallback', clues: 16 },
            { op: 'accept', cells: [0, 15] },
            { op: 'reject', cells: [1, 14], reason: 'ambiguous' }
          ]
        };
        result.rating = SG.difficulty.rate(model, givens);
        var analysis = analysisOf(result);
        var views = P.buildViews(result, analysis);
        var restart = views.compact.steps[1];
        expect([restart.role, restart.kind, restart.phase, restart.line]).toEqual(['restart', 'restart', 'dig', 'verify']);
        expect(restart.parts.map(function (p) { return p.key; })).toEqual(['replay.restart', 'replay.restart.folded']);
        expect(restart.parts[1].args).toEqual({ peak: analysis.ratings[1].score, moves: 1 });
        inLocale('en', function () {
          expect(P.describeStep(restart)).toContain('Before starting again, generation reached ' +
            analysis.ratings[1].score + ' points after 1 move.');
        });
        expect(restart.table.state).toBe('zero');
        expect(restart.table.change).toBeNull();
        var detailed = views.details.steps[2];
        expect(detailed.role).toBe('restart');
        expect(detailed.parts.map(function (p) { return p.key; })).toEqual(['replay.restart']);
        expect(detailed.table.state).toBe('zero');
        expect(detailed.table.change).toBe(-analysis.ratings[1].score);
        expect(detailed.table.score).toBe(0);
      });

    it('a rebuilt Killer log says "Clear {removed}." and carries the note, under the title "Removing clues"',
      function () {
        var g09 = goldenResult('G09');
        var groups = SG.symmetry.groups(g09.model, g09.config.symmetry).filter(function (group) {
          return Array.from(group).every(function (c) { return g09.givens[c] === 0; });
        });
        var log = [{ op: 'pass', pass: 'random', clues: 81 }].concat(groups.map(function (group) {
          return { op: 'accept', cells: Array.from(group) };
        }));
        var rebuilt = Object.assign({}, g09, { digLog: log });
        expect(analysisOf(rebuilt).rebuilt).toBe(true);
        var steps = compactOf(rebuilt).filter(function (s) { return s.role === 'moves'; });
        expect(steps.length).toBeGreaterThan(3);
        steps.forEach(function (s) {
          expect(s.kind).toBe('dig');
          expect(s.parts[0].key).toBe('replay.dig.rebuilt');
          expect(s.parts[s.parts.length - 1].key).toBe('replay.rebuilt');
        });
        stepsOf(rebuilt).filter(function (s) { return s.role === 'moves'; }).forEach(function (s) {
          expect(s.parts.map(function (p) { return p.key; })).toEqual(['replay.dig.rebuilt', 'replay.rebuilt']);
        });
        inLocale('en', function () {
          expect(P.stepTitle(steps[0])).toBe('Removing clues');
          expect(P.describeStep(steps[0])).toMatch(/^Clear \d+ cells\. This replay is reconstructed from the /);
        });
      }, 60000);

    it('a dig order that is not random gets the order-neutral texts and the title "Removing clues"',
      function () {
        var g01 = goldenResult('G01');
        var snake = Object.assign({}, g01, { config: Object.assign({}, g01.config, { digOrder: 'snake' }) });
        expect(analysisOf(snake).randomOrder).toBe(false);
        var steps = compactOf(snake);
        expect(kinds(steps).slice(0, 3)).toEqual(['solution', 'dig', 'dig']);
        expect(steps[1].key).toBe('replay.dig.all');
        expect(steps[2].key).toBe('replay.dig.some');
        inLocale('en', function () {
          expect(P.stepTitle(steps[1])).toBe('Removing clues');
          expect(P.describeStep(steps[1])).toBe(
            'Clear 14 cells: the puzzle can still be solved without their clues.');
        });
        expect(compactOf(g01)[1].kind).toBe('random');
      }, 60000);

    it('has a title for every kind of step and a label for every control', function () {
      P.KINDS.forEach(function (kind) { expect(SG.i18n.has('replay.title.' + kind)).toBe(true); });
      var controls = ['player.first', 'player.prev', 'player.next', 'player.last', 'player.scrubber'];
      controls.forEach(function (key) { expect(SG.i18n.has(key)).toBe(true); });
    });
  });

  describe('player: the table models', function () {
    it('has a numerical model on every step of both views of the 14 goldens', function () {
      GOLDENS.forEach(function (g) {
        var views = viewsOf(goldenResult(g.id));
        ['compact', 'details'].forEach(function (name) {
          views[name].steps.forEach(function (s) {
            expect(s.table).toBeTruthy();
            expect(['zero', 'scored', 'final']).toContain(s.table.state);
            expect(typeof s.table.score).toBe('number');
            expect(s.table.position).toBe(s.position);
          });
        });
      });
    }, 120000);

    it('example: start at 0, zero for the solution, scored with change and before, final at the end', function () {
      var result = goldenResult('G01');
      var analysis = analysisOf(result);
      var r = loadedRig(result);
      expect(r.player.tableAt(0)).toEqual({ state: 'start', status: null, reasons: [], counts: {}, before: null,
        empties: 0, score: null, change: null, transition: null, proof: null, position: null });
      var steps = r.player.getSteps();
      var one = steps[0].table;
      expect([one.state, one.score, one.empties, one.change, one.before]).toEqual(['zero', 0, 0, null, null]);
      expect(one.counts).toEqual({});
      var two = r.player.tableAt(2);
      expect([two.state, two.score, two.change, two.empties]).toEqual(['scored', 23, 23, 14]);
      expect(two.before).toEqual({});
      expect(two.counts).toEqual(analysis.ratings[7].counts);
      var four = r.player.tableAt(4);
      expect([four.state, four.score, four.change]).toEqual(['scored', 551, 507]);
      expect(four.before).toEqual(r.player.tableAt(3).counts);
      expect(four.transition).toBe(analysis.transitions[analysis.views.compact.steps[3].transition]);
      expect(four.proof).toBe(analysis.proofs[23]);
      expect(four.proof).not.toBeNull();
      var seven = r.player.tableAt(7);
      expect([seven.state, seven.score, seven.change]).toEqual(['final', 992, 0]);
      expect(seven.counts).toEqual(result.rating.techniqueCounts);
      expect(r.player.tableAt(8)).toBeNull();
      expect(r.player.tableAt(-1)).toBeNull();
      expect(rig(81).player.tableAt(0)).toBeNull();
    }, 60000);

    it('a step that cannot be rated has a status and no score, no change, no "before"; the next step has ' +
      'no change',
      function () {
        var result = goldenResult('G01');
        var analysis = analysisOf(result);
        var ratings = analysis.ratings.slice();
        ratings[10] = Object.assign({}, ratings[10], { status: 'stuck', reasons: ['stuck', 'ambiguous'],
          score: null, P: null, W: null, R: null, V: null, level: null, counts: { nakedSingle: 3 } });
        var changed = Object.assign({}, analysis, { ratings: ratings });
        changed = Object.assign(changed, R.buildViews(changed));
        var steps = P.buildViews(result, changed).details.steps;
        var status = steps[10].table;
        expect([status.state, status.status, status.reasons, status.score, status.change, status.before]).toEqual(
          ['status', 'stuck', ['stuck', 'ambiguous'], null, null, null]);
        expect(status.counts).toEqual({ nakedSingle: 3 });
        expect(status.empties).toBe(ratings[10].empties);
        var next = steps[11].table;
        expect([next.state, next.change, next.before]).toEqual(['scored', null, null]);
        var after = steps[12].table;
        expect(typeof after.change).toBe('number');
        expect(after.before).not.toBeNull();
      });

    it('tells a compact step that folds a position without a score, and only in the compact view', function () {
      var result = goldenResult('G01');
      var analysis = analysisOf(result);
      var ratings = analysis.ratings.slice();
      ratings[25] = Object.assign({}, ratings[25], { status: 'capped', reasons: [], score: null, P: null, W: null,
        R: null, V: null, level: null });
      var changed = Object.assign({}, analysis, { ratings: ratings });
      changed = Object.assign(changed, R.buildViews(changed));
      var views = P.buildViews(result, changed);
      var folding = views.compact.steps.filter(function (s) {
        return s.parts.some(function (p) { return p.key === 'replay.folded.unscored'; });
      });
      expect(folding.length).toBe(1);
      var part = folding[0].parts.filter(function (p) { return p.key === 'replay.folded.unscored'; })[0];
      expect(part.args).toEqual({ count: 1 });
      inLocale('en', function () {
        expect(P.describeStep(folding[0])).toContain('1 position within this step could not be rated.');
      });
      inLocale('vi', function () {
        expect(P.describeStep(folding[0])).toContain('Có 1 trạng thái trong bước này không chấm được điểm.');
      });
      views.details.steps.forEach(function (s) {
        s.parts.forEach(function (p) { expect(p.key).not.toBe('replay.folded.unscored'); });
      });
    }, 60000);
  });

  describe('player: the frame of the one clue or sign that causes a score jump', function () {
    function cellNamed(result, name) {
      for (var c = 0; c < result.model.cellCount; c++) if (SG.model.cellLabel(result.model, c) === name) return c;
      return -1;
    }

    /** The analysis of `result` with the cause of the transition `table.transition` replaced. */
    function withCause(result, transition, cause) {
      var analysis = analysisOf(result);
      return Object.assign({}, analysis, { transitions: analysis.transitions.map(function (t) {
        return t === transition ? Object.assign({}, t, { cause: cause }) : t;
      }) });
    }

    it('example: compact step 4 frames R1C2 as the cause, keeps R9C8 as removed, and the board gets the frame',
      function () {
        var result = goldenResult('G01');
        var r = loadedRig(result);
        var steps = r.player.getSteps();
        var r1c2 = cellNamed(result, 'R1C2');
        var r9c8 = cellNamed(result, 'R9C8');
        expect([steps[3].marks.cause, steps[3].marks.dug, steps[3].marks.causeRestore]).toEqual(
          [[r1c2], [r9c8], []]);
        steps.forEach(function (s, i) {
          if (i === 3) return;
          expect(s.marks.cause).toEqual([]);
          expect(s.marks.causeRestore).toEqual([]);
        });
        r.player.seek(4);
        expect(r.board.frames['cell--cause']).toEqual([r1c2]);
        expect(r.board.frames['cell--dug']).toEqual([r9c8]);
        r.player.seek(3);
        expect(r.board.frames['cell--cause']).toBeUndefined();
        r.player.seek(0);
        expect(r.board.frames).toEqual({});
        var start = P.viewAt(viewsOf(result).compact, 0);
        expect([start.marks.cause, start.marks.causeRestore]).toEqual([[], []]);
        expect(P.viewAt(viewsOf(result).compact, 4).marks.cause).toEqual([r1c2]);
      }, 60000);

    it('Greater-Than: the sign that causes the jump keeps its removed mark and also gets the frame', function () {
      var result = goldenResult('G11');
      var r = loadedRig(result);
      var steps = r.player.getSteps();
      var step = steps[6];
      expect(step.table.transition.cause.class).toBe('single-sign');
      expect(step.signs.cause).toEqual([6]);
      expect(step.signs.removed).toContain(6);
      expect(step.marks.cause).toEqual([]);
      expect(step.marks.causeRestore).toEqual([]);
      steps.forEach(function (s, i) {
        if (i !== 6) expect(s.signs.cause).toEqual([]);
      });
      r.player.seek(7);
      expect(r.board.signMarks.cause).toEqual([6]);
      expect(r.board.signMarks.removed).toContain(6);
      expect(r.board.signMarks.removed).toEqual(step.signs.removed);
      expect(r.board.frames['cell--cause']).toBeUndefined();
      r.player.seek(6);
      expect(r.board.signMarks.cause).toEqual([]);
      r.player.last();
      expect(r.board.signMarks).toBeNull();
    }, 60000);

    it('frames exactly the jumps that one clue or one sign causes (the 14 goldens, both views)', function () {
      var jumps = 0;
      var framed = 0;
      GOLDENS.forEach(function (g) {
        var views = viewsOf(goldenResult(g.id));
        ['compact', 'details'].forEach(function (name) {
          views[name].steps.forEach(function (s) {
            var t = s.table.transition;
            expect(Array.isArray(s.marks.cause) && Array.isArray(s.marks.causeRestore)).toBe(true);
            if (s.signs !== null) expect(Array.isArray(s.signs.cause)).toBe(true);
            var count = s.marks.cause.length + s.marks.causeRestore.length + (s.signs !== null ? s.signs.cause.length : 0);
            var frame = t !== null && t.tier === 'jump' && t.cause ? t.cause.frame : null;
            expect(count).toBe(frame ? 1 : 0);
            if (t === null || t.tier !== 'jump') return;
            jumps++;
            if (['together', 'mixed', 'multi-move', 'unavailable'].indexOf(t.cause.class) !== -1) {
              expect(frame).toBeNull();
            }
            if (frame === null) return;
            framed++;
            if (frame.kind === 'cell' && frame.action === 'remove') {
              expect(s.marks.cause).toEqual([frame.cell]);
              expect(s.marks.dug).not.toContain(frame.cell);
              expect(s.values[frame.cell]).toBe(0);
            } else if (frame.kind === 'cell') {
              expect(s.marks.causeRestore).toEqual([frame.cell]);
              expect(s.marks.revealed).not.toContain(frame.cell);
              expect(s.values[frame.cell]).not.toBe(0);
            } else {
              expect(s.signs.cause).toEqual([frame.sign]);
              expect(s.signs.removed).toContain(frame.sign);
            }
          });
        });
      });
      expect(jumps).toBe(29);
      expect(framed).toBeGreaterThan(8);
      expect(framed).toBeLessThan(jumps);
    }, 120000);

    it('a restored culprit is framed as causeRestore and leaves the revealed clues; an unavailable cause has no ' +
      'frame, and the removed cells stay as they were',
      function () {
        var result = goldenResult('G05');
        var base = viewsOf(result).compact.steps[4];
        var transition = base.table.transition;
        expect(transition.tier).toBe('jump');
        var cell = base.marks.revealed[0];
        var frame = { kind: 'cell', cell: cell, action: 'restore' };
        var cause = Object.assign({}, transition.cause, { class: 'single-culprit', frame: frame,
          culprit: { cell: cell, action: 'restore', score: 49, otherScore: 50 } });
        var r = rig(81);
        r.player.load(result);
        r.player.setAnalysis(withCause(result, transition, cause));
        var step = r.player.getSteps()[4];
        expect([step.marks.causeRestore, step.marks.cause]).toEqual([[cell], []]);
        expect(step.marks.revealed).toEqual(base.marks.revealed.filter(function (c) { return c !== cell; }));
        expect(step.marks.dug).toEqual(base.marks.dug);
        r.player.seek(5);
        expect(r.board.frames['cell--cause']).toEqual([cell]);
        expect(r.board.frames['cell--revealed'] || []).not.toContain(cell);

        var one = goldenResult('G01');
        var jump = viewsOf(one).compact.steps[3].table.transition;
        var none = rig(81);
        none.player.load(one);
        none.player.setAnalysis(withCause(one, jump, Object.assign({}, jump.cause, { class: 'unavailable',
          frame: null })));
        var plain = none.player.getSteps()[3];
        expect([plain.marks.cause, plain.marks.causeRestore]).toEqual([[], []]);
        expect(plain.marks.dug.length).toBe(2);
      }, 60000);
  });

  describe('player: manual navigation', function () {
    it('shows the finished puzzle at once after load, with every layer and no frame, and nothing to browse ' +
      'until the analysis comes',
      function () {
        var result = realResult('killer', 'normal', 2);
        var r = rig(81);
        r.player.load(result);
        var s = r.player.state();
        expect(s).toEqual({ position: 0, length: 0, finished: false, loaded: false });
        expect(Array.from(r.board.values)).toEqual(Array.from(result.givens));
        expect(r.board.givens).toEqual(Array.from(result.givens));
        expect(r.board.frames).toEqual({});
        P.LAYER_NAMES.forEach(function (name) { expect(r.board.layers[name]).toBe(true); });
        expect(r.board.signMarks).toBeNull();
        expect(r.player.getView()).toBeNull();
        expect(r.player.getSteps()).toEqual([]);
        expect(r.positions.length).toBe(0);
        r.player.next();
        r.player.seek(2);
        expect(r.positions.length).toBe(0);
        r.player.setAnalysis(analysisOf(result));
        s = r.player.state();
        expect(s.loaded).toBe(true);
        expect(s.finished).toBe(true);
        expect(s.position).toBe(s.length);
        expect(Array.from(r.board.values)).toEqual(Array.from(result.givens));
        expect(r.board.frames).toEqual({});
        expect(r.positions.length).toBe(1);
        expect(r.positions[0].direction).toBe('seek');
        expect(r.positions[0].step.kind).toBe('final');
        expect(r.states[r.states.length - 1]).toEqual(s);
        expect(r.steps.length).toBe(1);
        expect(r.steps[0].view).toBe('compact');
        expect(r.steps[0].position).toBe(s.length);
        expect(r.steps[0].steps).toBe(r.player.getSteps());
        expect(r.player.getView()).toBe('compact');
      });

    it('moves step by step, by jumps and by position, and the board follows (both views)', function () {
      var result = realResult('killer', 'normal', 2);
      ['compact', 'details'].forEach(function (name) {
        var r = loadedRig(result);
        r.player.setView(name);
        var steps = r.player.getSteps();
        r.player.first();
        expect(r.player.state().position).toBe(0);
        expect(clues(r.board.values)).toBe(0);
        expect(r.board.givens).toBeNull();
        expect(r.board.layers.cages).toBe(false);
        expect(r.board.layers.regions).toBe(true);
        r.player.next();
        expect(r.positions[r.positions.length - 1].direction).toBe('forward');
        expect(Array.from(r.board.values)).toEqual(Array.from(result.solution));
        expect(r.board.layers.cages).toBe(false);
        r.player.next();
        expect(r.board.layers.cages).toBe(true);
        r.player.seek(4);
        var step = steps[3];
        expect(Array.from(r.board.values)).toEqual(Array.from(step.values));
        expect((r.board.frames['cell--dug'] || []).slice().sort()).toEqual(step.marks.dug.slice().sort());
        r.player.prev();
        expect(r.player.state().position).toBe(3);
        expect(r.positions[r.positions.length - 1].direction).toBe('backward');
        r.player.last();
        expect(r.player.state().finished).toBe(true);
        expect(r.board.frames).toEqual({});
        r.player.next();
        expect(r.player.state().position).toBe(steps.length);
        r.player.seek(-3);
        expect(r.player.state().position).toBe(0);
        r.player.prev();
        expect(r.player.state().position).toBe(0);
      });
    });

    it('describes the position for the status line', function () {
      var result = realResult('classic9', 'easy', 3);
      var r = loadedRig(result);
      inLocale('en', function () {
        expect(r.player.describe(0).step).toBeNull();
        expect(r.player.describe(0).text).toMatch(/empty grid/);
        expect(r.player.describe(1).text).toMatch(/solution/);
        expect(r.player.describe().step.kind).toBe('final');
      });
      expect(r.player.getStep(0)).toBeNull();
      expect(r.player.getStep(1).kind).toBe('solution');
    });

    it('Greater-Than: draws every sign during the replay and the puzzle\'s own model at the end',
      function () {
        var result = realResult('greaterThan', 'normal', 4);
        var r = loadedRig(result);
        r.player.setView('details');
        expect(r.board.models.length).toBe(0);
        r.player.seek(2);
        expect(r.board.model.inequalities.length).toBe(viewsOf(result).signs.length);
        expect(r.board.signMarks.hidden).toEqual([]);
        var steps = r.player.getSteps();
        var signStep = steps.filter(function (s) { return s.kind === 'signDig'; })[1];
        r.player.seek(signStep.index);
        expect(r.board.signMarks.removed).toEqual(signStep.signs.removed);
        expect(r.board.signMarks.hidden).toEqual(signStep.signs.hidden);
        r.player.last();
        expect(r.board.model).toBe(result.model);
        expect(r.board.signMarks).toBeNull();
        expect(r.board.models.length).toBe(2);
      });

    it('reset forgets the puzzle and tells the app; destroy lets go', function () {
      var r = loadedRig(realResult('classic9', 'easy', 3));
      r.player.setView('details');
      r.player.reset();
      expect(r.player.state()).toEqual({ position: 0, length: 0, finished: false, loaded: false });
      expect(r.player.getSteps()).toEqual([]);
      expect(r.player.getView()).toBeNull();
      expect(r.player.tableAt(0)).toBeNull();
      expect(r.player.describe()).toEqual({ text: '', step: null });
      expect(r.states[r.states.length - 1].loaded).toBe(false);
      var before = r.positions.length;
      r.player.next();
      expect(r.positions.length).toBe(before);
      r.player.destroy();
      r.player.load(realResult('classic9', 'easy', 3));
      expect(r.player.state().loaded).toBe(false);
      r.player.setAnalysis(analysisOf(realResult('classic9', 'easy', 3)));
      expect(r.player.state().loaded).toBe(false);
    });

    it('load(result, { analysis, position }) builds the views at once and starts where asked; a new load ' +
      'goes back to the compact view and forgets the steps',
      function () {
        var result = realResult('classic9', 'easy', 3);
        var r = rig(81);
        r.player.load(result, { analysis: analysisOf(result), position: 3 });
        expect(r.player.state().position).toBe(3);
        expect(r.player.getView()).toBe('compact');
        r.player.setView('details');
        expect(r.player.getView()).toBe('details');
        r.player.load(result);
        expect(r.player.getView()).toBeNull();
        expect(r.player.state().loaded).toBe(false);
        r.player.setAnalysis(analysisOf(result), { position: 2 });
        expect(r.player.getView()).toBe('compact');
        expect(r.player.state().position).toBe(2);
      });
  });

  describe('player: the two views and the toggle', function () {
    it('maps the place when the view changes (the example: compact step 4 is details step 24)', function () {
      var result = goldenResult('G01');
      var r = loadedRig(result);
      expect(r.player.getView()).toBe('compact');
      var compact = r.player.getSteps();
      var calls = r.steps.length;
      r.player.seek(4);
      expect(compact[3].position).toBe(23);
      r.player.setView('details');
      expect(r.player.getView()).toBe('details');
      expect(r.player.state().position).toBe(24);
      expect(r.player.getStep(24).position).toBe(23);
      expect(r.steps.length).toBe(calls + 1);
      expect(r.steps[r.steps.length - 1].view).toBe('details');
      expect(r.steps[r.steps.length - 1].position).toBe(24);
      expect(r.positions[r.positions.length - 1].direction).toBe('seek');
      expect(r.player.tableAt(24)).toBe(r.player.getStep(24).table);
      expect(r.player.state().length).toBe(33);
      r.player.setView('compact');
      expect(r.player.state().position).toBe(4);
      expect(r.player.state().length).toBe(7);
      expect(r.steps[r.steps.length - 1].view).toBe('compact');
      r.player.setView('details');
      r.player.seek(26);
      expect(r.player.getStep(26).position).toBe(25);
      r.player.setView('compact');
      expect(r.player.state().position).toBe(5);
      r.player.first();
      r.player.setView('details');
      expect(r.player.state().position).toBe(0);
      r.player.setView('compact');
      r.player.last();
      r.player.setView('details');
      expect(r.player.state().position).toBe(33);
      expect(r.player.getStep(33).role).toBe('final');
      r.player.setView('compact');
      expect(r.player.state().position).toBe(7);
      var count = r.steps.length;
      r.player.setView('compact');
      r.player.setView('nonsense');
      expect(r.steps.length).toBe(count);
      expect(rig(81).player.getView()).toBeNull();
    }, 60000);

    it('keeps the solution and the structure steps when the view changes, and the restart in the details', function () {
      var result = goldenResult('G09');
      var r = loadedRig(result);
      [1, 2].forEach(function (p) {
        r.player.seek(p);
        var role = r.player.getStep(p).role;
        r.player.setView('details');
        expect(r.player.getStep(r.player.state().position).role).toBe(role);
        expect(r.player.state().position).toBe(p);
        r.player.setView('compact');
        expect(r.player.state().position).toBe(p);
      });
      expect(r.player.getStep(2).role).toBe('structure');
    }, 60000);

    it('changing the view and navigating never rates anything, and neither does a change of language',
      function () {
        var result = goldenResult('G01');
        var analysis = analysisOf(result);
        var spied = [[SG.logicalSolver, 'solve'], [SG.difficulty, 'rate'], [SG.replay, 'prepare'],
          [SG.replay, 'rateBoard'], [SG.dfs, 'countSolutions']];
        var saved = spied.map(function (p) { return p[0][p[1]]; });
        var calls = 0;
        spied.forEach(function (p, i) {
          p[0][p[1]] = function () { calls++; return saved[i].apply(this, arguments); };
        });
        try {
          var c = fakeControls();
          var r = rig(81);
          r.player.bindControls(c.root);
          r.player.load(result);
          r.player.setPreparation({ status: 'consent' });
          r.player.setAnalysis(analysis);
          r.player.setView('details');
          r.player.first();
          r.player.next();
          r.player.last();
          r.player.setView('compact');
          r.player.seek(3);
          inLocale('vi', function () { r.player.describe(); });
          r.player.tableAt(3);
          r.player.setPreparation({ status: 'ready' });
          r.player.destroy();
        } finally {
          spied.forEach(function (p, i) { p[0][p[1]] = saved[i]; });
        }
        expect(calls).toBe(0);
      }, 60000);
  });

  describe('player: controls', function () {
    var CONTROLS = ['#btn-first', '#btn-prev', '#btn-next', '#btn-last', '#scrubber', '#replay-view-details'];

    function expectDisabled(c, flag) {
      CONTROLS.forEach(function (sel) { expect([sel, c.els[sel].disabled]).toEqual([sel, flag]); });
    }

    it('wires first / previous / next / last and the slider, disabled while there are no views', function () {
      var c = fakeControls();
      var r = rig(81);
      var unbind = r.player.bindControls(c.root);
      expectDisabled(c, true);
      expect(c.els['#player-time'].textContent).toBe('');
      var result = realResult('classic9', 'easy', 3);
      r.player.load(result);
      expectDisabled(c, true);
      r.player.setAnalysis(analysisOf(result));
      var n = r.player.state().length;
      expectDisabled(c, false);
      expect(c.els['#scrubber'].max).toBe(String(n));
      expect(c.els['#scrubber'].value).toBe(String(n));
      inLocale('en', function () {
        r.player.seek(n);
        expect(c.els['#player-time'].textContent).toBe('Step ' + n + ' of ' + n);
        c.els['#btn-first'].fire('click');
        expect(c.els['#player-time'].textContent).toBe('Start');
        expect(c.els['#scrubber'].getAttribute('aria-valuetext')).toBe('Start');
        c.els['#btn-next'].fire('click');
        expect(r.player.state().position).toBe(1);
        expect(c.els['#scrubber'].getAttribute('aria-valuetext')).toBe('Step 1 of ' + n + ': Full solution');
        c.els['#btn-last'].fire('click');
        expect(r.player.state().position).toBe(n);
        c.els['#btn-prev'].fire('click');
        expect(r.player.state().position).toBe(n - 1);
        c.els['#scrubber'].value = '2';
        c.els['#scrubber'].fire('input');
        expect(r.player.state().position).toBe(2);
        expect(c.els['#scrubber'].value).toBe('2');
      });
      unbind();
      Object.keys(c.els).forEach(function (sel) { expect(c.els[sel].listenerCount()).toBe(0); });
      r.player.destroy();
    });

    it('the toggle "Show all moves" follows the view, switches it, and is disabled without views', function () {
      var result = goldenResult('G01');
      var c = fakeControls();
      var r = rig(81);
      r.player.bindControls(c.root);
      var toggle = c.els['#replay-view-details'];
      expect([toggle.disabled, toggle.checked]).toEqual([true, false]);
      r.player.load(result);
      r.player.setAnalysis(analysisOf(result));
      expect([toggle.disabled, toggle.checked]).toEqual([false, false]);
      toggle.checked = true;
      toggle.fire('change');
      expect(r.player.getView()).toBe('details');
      expect(toggle.checked).toBe(true);
      expect(r.player.state().length).toBe(33);
      toggle.checked = false;
      toggle.fire('change');
      expect(r.player.getView()).toBe('compact');
      expect(toggle.checked).toBe(false);
      r.player.setView('details');
      expect(toggle.checked).toBe(true);
      r.player.load(result);
      expect([toggle.disabled, toggle.checked]).toEqual([true, false]);
      r.player.destroy();
    }, 60000);

    it('shows the notice and the button while it waits for the user, the progress and the failures, and ' +
      'keeps browsing off until the tables are ready',
      function () {
        var result = goldenResult('G01');
        var c = fakeControls();
        var r = rig(81);
        r.player.bindControls(c.root);
        var status = c.els['#replay-status'];
        var text = c.els['#replay-status-text'];
        var button = c.els['#btn-prepare-replay'];
        r.player.load(result);
        ['idle', 'waiting', 'ready'].forEach(function (name) {
          r.player.setPreparation({ status: name, done: 0, total: 0 });
          expect([name, status.hidden, button.hidden]).toEqual([name, true, true]);
        });
        inLocale('en', function () {
          r.player.setPreparation({ status: 'consent', done: 0, total: 0 });
          expect([status.hidden, button.hidden, button.disabled]).toEqual([false, false, false]);
          expect(text.textContent).toBe('This page has no background worker. Press \'Prepare score tables\' to ' +
            'calculate the score tables on this page; the page may stop responding briefly while it works.');
          expectDisabled(c, true);
          button.fire('click');
          expect(r.prepares.length).toBe(1);
          r.player.setPreparation({ status: 'preparing', done: 3, total: 32 });
          expect([status.hidden, button.hidden]).toEqual([false, true]);
          expect(text.textContent).toBe('Preparing the score tables\u2026 3 of 32');
          r.player.setPreparation({ status: 'trace', done: 0, total: 0 });
          expect(text.textContent).toBe('Preparing the score tables: rebuilding the generation record\u2026');
          expect(button.hidden).toBe(true);
          r.player.setPreparation({ status: 'unavailable', done: 0, total: 0 });
          expect(text.textContent).toContain('The full generation record of this puzzle is not available');
          r.player.setPreparation({ status: 'error', done: 0, total: 0 });
          expect(text.textContent).toContain('The replay could not be fully prepared.');
          expect([status.hidden, button.hidden]).toEqual([false, true]);
          r.player.setPreparation({ status: 'preparing', done: 1234, total: 5678 });
          expect(text.textContent).toBe('Preparing the score tables\u2026 1,234 of 5,678');
        });
        r.player.setPreparation({ status: 'consent' });
        inLocale('vi', function () {
          expect(text.textContent).toContain('Nhấn \'Chuẩn bị bảng điểm\'');
        });
        r.player.setPreparation({ status: 'ready' });
        r.player.setAnalysis(analysisOf(result));
        expectDisabled(c, false);
        expect(status.hidden).toBe(true);
        r.player.setPreparation({ status: 'consent' });
        expectDisabled(c, true);
        r.player.setPreparation({ status: 'unavailable' });
        expectDisabled(c, false);
        r.player.setPreparation({ status: 'error' });
        expectDisabled(c, false);
        r.player.reset();
        expect(status.hidden).toBe(true);
        r.player.destroy();
      }, 60000);
  });

  describe('player: the preparation of the score tables (fake clients)', function () {
    function flush() {
      return new Promise(function (resolve) { setTimeout(resolve, 0); });
    }

    function cancelled(reason) {
      return new SG.errors.GenerationError('budget.cancelled', reason ? { reason: reason } : {});
    }

    /** A client whose replays finish when the test says so. */
    function fakeClient(mode, options) {
      var o = options || {};
      var c = {
        mode: mode, readyCalls: 0, cancels: 0, calls: [], failReady: false,
        ready: function () {
          c.readyCalls++;
          return c.failReady ? Promise.reject(new Error('no worker')) : Promise.resolve(c.mode);
        },
        replay: function (result, opts) {
          var job = { result: result, options: opts };
          job.promise = new Promise(function (resolve, reject) {
            job.resolve = resolve;
            job.reject = reject;
          });
          c.calls.push(job);
          return job.promise;
        },
        cancelReplay: function () {
          c.cancels++;
          var job = c.calls[c.calls.length - 1];
          if (job && o.ignoreCancel !== true) job.reject(cancelled());
          return Boolean(job);
        }
      };
      return c;
    }

    function setup(client, extra) {
      var log = { states: [], analyses: [], emits: [], fallbacks: [] };
      var prep = P.createPreparation(Object.assign({
        getClient: function () { return client; },
        onState: function (s) { log.states.push(s.status); },
        onAnalysis: function (analysis, result) { log.analyses.push({ analysis: analysis, result: result }); },
        emit: function (name, payload) { log.emits.push({ name: name, payload: payload }); },
        fallback: function (result, reason) {
          log.fallbacks.push(reason);
          return { fallback: reason, marker: true };
        }
      }, extra));
      return { prep: prep, log: log };
    }

    function withoutLog(extra) {
      return Object.assign({}, goldenResult('G01'), { digLog: undefined }, extra);
    }

    it('worker mode: prepares by itself, only once ready() confirmed the worker, and publishes once',
      async function () {
        var client = fakeClient('worker');
        var t = setup(client);
        var result = goldenResult('G01');
        t.prep.start(result);
        expect(t.prep.state().status).toBe('waiting');
        expect(client.calls.length).toBe(0);
        await flush();
        expect(client.readyCalls).toBe(1);
        expect(client.calls.length).toBe(1);
        expect(client.calls[0].result).toBe(result);
        expect(client.calls[0].options.allowMain).toBe(false);
        expect(t.prep.state()).toEqual({ status: 'preparing', done: 0, total: 32 });
        client.calls[0].options.onProgress({ done: 5, total: 32 });
        expect(t.prep.state()).toEqual({ status: 'preparing', done: 5, total: 32 });
        var analysis = { marker: 'analysis' };
        client.calls[0].resolve(analysis);
        await flush();
        expect(t.log.states).toEqual(['waiting', 'preparing', 'preparing', 'ready']);
        expect(t.log.analyses.length).toBe(1);
        expect(t.log.analyses[0].analysis).toBe(analysis);
        expect(t.log.analyses[0].result).toBe(result);
        expect(t.prep.state().status).toBe('ready');
        expect(t.log.fallbacks).toEqual([]);
      });

    it('main mode: waits for the press (no replay call), and a press only counts in the consent state',
      async function () {
        var client = fakeClient('main');
        var t = setup(client);
        var result = goldenResult('G01');
        expect(t.prep.press()).toBe(false);
        t.prep.start(result);
        expect(t.prep.press()).toBe(false);
        await flush();
        expect(t.prep.state().status).toBe('consent');
        expect(client.calls.length).toBe(0);
        expect(t.log.states).toEqual(['waiting', 'consent']);
        expect(t.prep.press()).toBe(true);
        expect(client.calls.length).toBe(1);
        expect(client.calls[0].options.allowMain).toBe(true);
        expect(t.prep.state().status).toBe('preparing');
        expect(t.prep.press()).toBe(false);
        client.calls[0].resolve({ marker: 1 });
        await flush();
        expect(t.prep.state().status).toBe('ready');
        expect(t.log.analyses.length).toBe(1);
        expect(client.calls.length).toBe(1);
      });

    it('a client that cannot tell, or whose ready() fails, counts as a main-thread client', async function () {
      var failing = fakeClient('worker');
      failing.failReady = true;
      var a = setup(failing);
      a.prep.start(goldenResult('G01'));
      await flush();
      expect(a.prep.state().status).toBe('consent');
      expect(failing.calls.length).toBe(0);
      var plain = { mode: 'main', replay: failing.replay, cancelReplay: failing.cancelReplay, calls: [] };
      var b = setup(plain);
      b.prep.start(goldenResult('G01'));
      await flush();
      expect(b.prep.state().status).toBe('consent');
      var none = setup(null);
      none.prep.start(goldenResult('G01'));
      await flush();
      expect(none.prep.state().status).toBe('consent');
    });

    it('a puzzle from the cache without its record waits for the record (worker mode): no replay, no ' +
      'consent event; the record starts the replay',
      async function () {
        var client = fakeClient('worker');
        var t = setup(client);
        var cached = withoutLog({ fromCache: true });
        t.prep.start(cached);
        await flush();
        expect(t.prep.state().status).toBe('trace');
        expect(client.calls.length).toBe(0);
        expect(t.log.emits).toEqual([]);
        expect(t.log.fallbacks).toEqual([]);
        cached.digLog = goldenResult('G01').digLog;
        t.prep.start(cached);
        await flush();
        expect(client.calls.length).toBe(1);
        expect(client.calls[0].options.allowMain).toBe(false);
        expect(t.prep.state().status).toBe('preparing');
      });

    it('a puzzle from the cache without its record (main mode): the press asks for the record once, and ' +
      'the replay then starts without a second press',
      async function () {
        var client = fakeClient('main');
        var t = setup(client);
        var cached = withoutLog({ fromCache: true });
        t.prep.start(cached);
        await flush();
        expect(t.prep.state().status).toBe('consent');
        expect(t.log.emits).toEqual([]);
        expect(t.prep.press()).toBe(true);
        expect(t.prep.state().status).toBe('trace');
        expect(t.log.emits).toEqual([{ name: 'replay:consent', payload: { result: cached } }]);
        expect(client.calls.length).toBe(0);
        cached.digLog = goldenResult('G01').digLog;
        t.prep.start(cached);
        await flush();
        expect(client.calls.length).toBe(1);
        expect(client.calls[0].options.allowMain).toBe(true);
        expect(t.prep.state().status).toBe('preparing');
        // Another puzzle needs its own press.
        t.prep.start(Object.assign({}, cached));
        expect(client.cancels).toBe(1);
        await flush();
        expect(t.prep.state().status).toBe('consent');
        expect(client.calls.length).toBe(1);
      });

    it('an imported puzzle without a record shows the fallback (in main mode after the press), with a real ' +
      'fallback analysis',
      async function () {
        var worker = fakeClient('worker');
        var w = setup(worker);
        var imported = withoutLog();
        w.prep.start(imported);
        await flush();
        expect(w.prep.state().status).toBe('unavailable');
        expect(w.log.fallbacks).toEqual(['noLog']);
        expect(w.log.analyses[0].result).toBe(imported);
        expect(worker.calls.length).toBe(0);
        var main = fakeClient('main');
        var m = setup(main);
        m.prep.start(imported);
        await flush();
        expect(m.prep.state().status).toBe('consent');
        expect(m.log.fallbacks).toEqual([]);
        m.prep.press();
        expect(m.prep.state().status).toBe('unavailable');
        expect(m.log.fallbacks).toEqual(['noLog']);
        expect(main.calls.length).toBe(0);
        var real = setup(fakeClient('worker'), { fallback: undefined });
        real.prep.start(imported);
        await flush();
        var analysis = real.log.analyses[0].analysis;
        expect(analysis.fallback).toBe('noLog');
        expect(analysis.views.compact.steps.map(function (s) { return s.role; })).toEqual(['solution', 'final']);
      });

    it('a failing replay shows the fallback with the reason "error"; any failure other than a ' +
      'cancellation is one',
      async function () {
        var errors = [new Error('boom'), new SG.errors.GenerationError('unexpected', { message: 'busy' })];
        for (var i = 0; i < errors.length; i++) {
          var client = fakeClient('worker');
          var t = setup(client);
          t.prep.start(goldenResult('G01'));
          await flush();
          client.calls[0].reject(errors[i]);
          await flush();
          expect(t.prep.state().status).toBe('error');
          expect(t.log.fallbacks).toEqual(['error']);
          expect(t.log.analyses.length).toBe(1);
        }
        var throwing = fakeClient('worker');
        throwing.replay = function () { throw new Error('synchronous'); };
        var s = setup(throwing);
        s.prep.start(goldenResult('G01'));
        await flush();
        expect(s.prep.state().status).toBe('error');
        expect(s.log.fallbacks).toEqual(['error']);
      });

    it('a replay that needs the page asks for the consent again; any other cancellation goes idle',
      async function () {
        var client = fakeClient('worker');
        var t = setup(client);
        t.prep.start(goldenResult('G01'));
        await flush();
        client.calls[0].reject(cancelled('replayConsentRequired'));
        await flush();
        expect(t.prep.state().status).toBe('consent');
        expect(t.log.analyses.length).toBe(0);
        expect(t.prep.press()).toBe(true);
        expect(client.calls.length).toBe(2);
        expect(client.calls[1].options.allowMain).toBe(true);
        client.calls[1].reject(cancelled());
        await flush();
        expect(t.prep.state().status).toBe('idle');
        expect(t.log.analyses.length).toBe(0);
        expect(t.log.fallbacks).toEqual([]);
      });

    it('a new puzzle cancels the replay on the client of the old one, and a late answer is ignored',
      async function () {
        for (var round = 0; round < 2; round++) {
          var client = fakeClient('worker', { ignoreCancel: round === 1 });
          var t = setup(client);
          var first = goldenResult('G01');
          var second = Object.assign({}, first);
          t.prep.start(first);
          await flush();
          var job = client.calls[0];
          t.prep.start(second);
          expect(client.cancels).toBe(1);
          job.resolve({ marker: 'old' });
          await flush();
          expect(client.calls.length).toBe(2);
          expect(t.log.analyses.length).toBe(0);
          client.calls[1].options.onProgress({ done: 2, total: 32 });
          job.options.onProgress({ done: 30, total: 32 });
          expect(t.prep.state().done).toBe(2);
          client.calls[1].resolve({ marker: 'new' });
          await flush();
          expect(t.log.analyses.map(function (a) { return a.analysis.marker; })).toEqual(['new']);
          expect(t.log.analyses[0].result).toBe(second);
        }
      });

    it('cancel() stops the job on its client, forgets the consent and goes idle; nothing is published later',
      async function () {
        var client = fakeClient('main', { ignoreCancel: true });
        var t = setup(client);
        var result = goldenResult('G01');
        t.prep.start(result);
        await flush();
        t.prep.press();
        expect(client.calls.length).toBe(1);
        t.prep.cancel();
        expect(client.cancels).toBe(1);
        expect(t.prep.state().status).toBe('idle');
        client.calls[0].resolve({ marker: 'late' });
        await flush();
        expect(t.log.analyses.length).toBe(0);
        expect(t.prep.state().status).toBe('idle');
        t.prep.start(result);
        await flush();
        expect(t.prep.state().status).toBe('consent');
        expect(client.calls.length).toBe(1);
        t.prep.cancel();
        await flush();
        expect(t.prep.state().status).toBe('idle');
        expect(t.prep.press()).toBe(false);
      });

    it('unavailable(result) is latched until the client is ready and, in main mode, until the press; for ' +
      'another result it does nothing',
      async function () {
        var imported = withoutLog({ fromCache: true });
        var client = fakeClient('worker');
        var t = setup(client);
        expect(t.prep.unavailable(imported)).toBe(false);
        t.prep.start(imported);
        expect(t.prep.unavailable(Object.assign({}, imported))).toBe(false);
        expect(t.prep.unavailable(imported)).toBe(true);
        expect(t.log.fallbacks).toEqual([]);
        expect(t.prep.state().status).toBe('waiting');
        await flush();
        expect(t.prep.state().status).toBe('unavailable');
        expect(t.log.fallbacks).toEqual(['noLog']);
        expect(t.log.emits).toEqual([]);
        var main = fakeClient('main');
        var m = setup(main);
        m.prep.start(imported);
        await flush();
        expect(m.prep.unavailable(imported)).toBe(true);
        expect(m.prep.state().status).toBe('consent');
        expect(m.log.fallbacks).toEqual([]);
        m.prep.press();
        expect(m.prep.state().status).toBe('unavailable');
        expect(m.log.fallbacks).toEqual(['noLog']);
        expect(m.log.emits).toEqual([]);
        expect(main.calls.length).toBe(0);
      });

    it('unavailable(result) while the replay runs stops it and shows the fallback', async function () {
      var client = fakeClient('worker', { ignoreCancel: true });
      var t = setup(client);
      var result = goldenResult('G01');
      t.prep.start(result);
      await flush();
      expect(t.prep.unavailable(result)).toBe(true);
      expect(client.cancels).toBe(1);
      expect(t.prep.state().status).toBe('unavailable');
      client.calls[0].resolve({ marker: 'late' });
      await flush();
      expect(t.log.analyses.length).toBe(1);
      expect(t.log.analyses[0].analysis.fallback).toBe('noLog');
      expect(t.prep.state().status).toBe('unavailable');
    });

    it('a client that turned out to run on the page after answering "worker" needs the consent again, ' +
      'also for a puzzle without a record',
      async function () {
        function flipping() {
          var c = fakeClient('worker');
          c.ready = function () {
            return Promise.resolve('worker').then(function (mode) {
              c.mode = 'main';
              return mode;
            });
          };
          return c;
        }
        var client = flipping();
        var t = setup(client);
        t.prep.start(goldenResult('G01'));
        await flush();
        expect(t.prep.state().status).toBe('consent');
        expect(client.calls.length).toBe(0);
        var missing = flipping();
        var m = setup(missing);
        var imported = withoutLog();
        m.prep.start(imported);
        await flush();
        expect(m.prep.state().status).toBe('consent');
        expect(m.log.fallbacks).toEqual([]);
        expect(m.prep.unavailable(imported)).toBe(true);
        expect(m.prep.state().status).toBe('consent');
        expect(m.log.fallbacks).toEqual([]);
        m.prep.press();
        expect(m.prep.state().status).toBe('unavailable');
        expect(missing.calls.length).toBe(0);
      });

    it('callbacks that throw do not stop it, and a main-mode start, a language change and a navigation call ' +
      'neither the solver nor the analysis',
      async function () {
        var spied = [[SG.logicalSolver, 'solve'], [SG.replay, 'prepare']];
        var saved = spied.map(function (p) { return p[0][p[1]]; });
        var calls = 0;
        var logError = console.error;
        console.error = function () {};
        spied.forEach(function (p, i) {
          p[0][p[1]] = function () { calls++; return saved[i].apply(this, arguments); };
        });
        try {
          var client = fakeClient('main');
          var t = setup(client, {
            onAnalysis: function () { throw new Error('listener'); },
            emit: function () { throw new Error('listener'); }
          });
          var result = goldenResult('G01');
          var r = rig(81);
          r.player.load(result);
          t.prep.start(result);
          await flush();
          r.player.setPreparation(t.prep.state());
          inLocale('vi', function () { r.player.setPreparation(t.prep.state()); });
          r.player.next();
          expect(t.prep.state().status).toBe('consent');
          t.prep.press();
          client.calls[0].resolve({ marker: 1 });
          await flush();
          expect(t.prep.state().status).toBe('ready');
        } finally {
          console.error = logError;
          spied.forEach(function (p, i) { p[0][p[1]] = saved[i]; });
        }
        expect(calls).toBe(0);
      });
  });
})();
