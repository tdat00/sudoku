// Replay player: the summarized replay steps built from `PuzzleResult.digLog`
// (`buildSteps`, pure), the board at a position (`viewAt`), the texts of a step, and the manual player with a
// fake board and a tiny fake DOM, so everything runs on Node. Real results come from the pipeline.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var P = SG.player;

  var resultCache = {};

  /** A real result (memoised). */
  function realResult(variantId, difficulty, seed) {
    var key = [variantId, difficulty, seed].join('/');
    if (!resultCache[key]) {
      resultCache[key] = SG.pipeline.run(
        { variantId: variantId, difficulty: difficulty, seed: seed, trace: 'off' }, null);
    }
    return resultCache[key];
  }

  function stepsOf(result) {
    return P.buildSteps(result).steps;
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

  function rig(cells) {
    var board = fakeBoard(cells);
    var positions = [];
    var states = [];
    var player = P.create({
      board: board,
      onPosition: function (info) { positions.push(info); },
      onStateChange: function (s) { states.push(s); }
    });
    return { player: player, board: board, positions: positions, states: states };
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
      '#btn-last': fakeEl('last'), '#scrubber': fakeEl('scrubber'), '#player-time': fakeEl('time')
    };
    return { root: { querySelector: function (sel) { return els[sel] || null; } }, els: els };
  }

  describe('player: the replay steps of a result', function () {
    var CASES = [['classic9', 'easy', 3], ['classic9', 'normal', 3], ['classic9', 'nightmare', 5],
      ['classic4', 'veryEasy', 2], ['killer', 'normal', 2], ['greaterThan', 'normal', 4],
      ['jigsaw9', 'easy', 6], ['wordoku', 'easy', 1], ['mega12', 'easy', 2]];

    CASES.forEach(function (c) {
      it(c[0] + ' ' + c[1] + ': starts from the full solution and ends on the puzzle, every step a visible ' +
        'change',
        function () {
          var result = realResult(c[0], c[1], c[2]);
          var steps = stepsOf(result);
          expect(steps.length).toBeGreaterThan(2);
          expect(steps[0].kind).toBe('solution');
          expect(Array.from(steps[0].values)).toEqual(Array.from(result.solution));
          var last = steps[steps.length - 1];
          expect(last.kind).toBe('final');
          expect(Array.from(last.values)).toEqual(Array.from(result.givens));
          steps.forEach(function (s, i) {
            expect(s.index).toBe(i + 1);
            expect(P.KINDS).toContain(s.kind);
            expect(['fullGrid', 'extraStructure', 'dig']).toContain(s.phase);
            if (i === 0) return;
            var before = steps[i - 1];
            var changed = !sameValues(s.values, before.values) || s.structure !== before.structure ||
              s.marks.dug.length + s.marks.kept.length + s.marks.revealed.length > 0 ||
              (s.signs !== null && s.signs.removed.length + s.signs.kept.length > 0) || s.kind === 'final';
            expect(changed).toBe(true);
          });
        }, 60000);
    });

    it('frames what each dig step did: removed cells are empty, put-back cells keep their value',
      function () {
        var result = realResult('classic9', 'normal', 3);
        var steps = stepsOf(result);
        var dig = steps.filter(function (s) { return s.kind === 'random' || s.kind === 'guided'; });
        expect(dig.length).toBeGreaterThan(3);
        dig.forEach(function (s) {
          var before = steps[s.index - 2];
          expect(s.marks.dug.length).toBeGreaterThan(0);
          s.marks.dug.forEach(function (cell) {
            expect(s.values[cell]).toBe(0);
            expect(before.values[cell]).toBe(result.solution[cell]);
          });
          s.marks.kept.forEach(function (cell) { expect(s.values[cell]).toBe(result.solution[cell]); });
          expect(clues(before.values) - clues(s.values)).toBe(s.marks.dug.length);
          expect(s.args.removed).toBe(s.marks.dug.length);
          expect(s.args.clues).toBe(clues(s.values));
          expect(s.metrics.clues).toBe(clues(s.values));
        });
      });

    it('counts the cells (or signs) the steps removed and put back, so the counters add up with the list',
      function () {
        var cases = [['classic9', 'easy', 3], ['classic9', 'normal', 3], ['greaterThan', 'normal', 4]];
        cases.forEach(function (c) {
          var result = realResult(c[0], c[1], c[2]);
          var steps = stepsOf(result);
          var removed = 0;
          var kept = 0;
          steps.forEach(function (s) {
            removed += s.marks.dug.length + (s.signs !== null ? s.signs.removed.length : 0);
            kept += s.marks.kept.length + (s.signs !== null ? s.signs.kept.length : 0);
            if (s.metrics === null) return;
            expect(s.metrics.accepted).toBe(removed);
            expect(s.metrics.rejected).toBe(kept);
            expect(s.metrics.attempts).toBe(s.metrics.accepted + s.metrics.rejected);
          });
          var m = steps[steps.length - 1].metrics;
          expect(m.accepted).toBeGreaterThan(0);
          if (c[0] === 'classic9' && kinds(steps).indexOf('restart') === -1) {
            expect(m.accepted).toBe(result.model.cellCount - clues(result.givens));
          }
        });
      }, 60000);

    it('summarizes the random removals in batches of about a ninth of the board', function () {
      var steps = stepsOf(realResult('classic9', 'easy', 3));
      var random = steps.filter(function (s) { return s.kind === 'random'; });
      expect(random.length).toBeGreaterThan(2);
      expect(random.length).toBeLessThan(12);
      random.slice(0, -1).forEach(function (s) {
        expect(s.args.tried).toBeGreaterThan(P.batchCells(81) - 1);
      });
      expect(random[0].key).toBe('replay.random.all');
      var withRefusals = random.filter(function (s) { return s.args.kept > 0; });
      withRefusals.forEach(function (s) {
        expect(s.key).toBe('replay.random.some');
        expect(['ambiguous', 'techniques', 'tooHard', 'mixed']).toContain(s.args.reason);
        expect(s.args.tried).toBe(s.args.removed + s.args.kept);
      });
    });

    it('shows one guided round per step on a 9x9 board, with the candidates rated and refused', function () {
      var steps = stepsOf(realResult('classic9', 'normal', 3));
      var guided = steps.filter(function (s) { return s.kind === 'guided'; });
      expect(guided.length).toBeGreaterThan(0);
      guided.forEach(function (s) {
        expect(s.line).toBe('deeper');
        expect(s.args.rated).toBeGreaterThan(0);
        expect(s.args.refused).toBeLessThan(s.args.rated + 1);
        expect(s.args.cellList).toEqual(s.marks.dug);
        expect(s.args.rounds === undefined || s.args.rounds === 1).toBe(true);
      });
      // Guided rounds come after the random batches.
      var firstGuided = kinds(steps).indexOf('guided');
      expect(kinds(steps).slice(firstGuided).indexOf('random')).toBe(-1);
    });

    it('Killer: the cages appear in the step after the solution', function () {
      var steps = stepsOf(realResult('killer', 'normal', 2));
      expect(kinds(steps).slice(0, 2)).toEqual(['solution', 'cages']);
      expect(steps[0].structure).toBe(false);
      steps.slice(1).forEach(function (s) { expect(s.structure).toBe(true); });
      expect(steps[1].args.count).toBe(realResult('killer', 'normal', 2).model.cages.length);
      expect(sameValues(steps[1].values, steps[0].values)).toBe(true);
    });

    it('Greater-Than: every sign, then the starting clues, then the signs taken away batch by batch',
      function () {
        var result = realResult('greaterThan', 'normal', 4);
        var built = P.buildSteps(result);
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
          expect(s.signs.removed.length).toBe(s.args.removed);
          hidden += s.signs.removed.length;
          expect(s.args.signs).toBe(built.signs.length - hidden);
        });
        var last = steps[steps.length - 1];
        expect(built.signs.length - last.signs.hidden.length).toBe(result.model.inequalities.length);
        expect(last.key).toBe('replay.final.signs');
      });

    it('without a dig log the replay is the solution, the structure and the puzzle; without a solution ' +
      'only the puzzle',
      function () {
        var result = realResult('killer', 'easy', 1);
        var bare = Object.assign({}, result, { digLog: undefined });
        expect(kinds(stepsOf(bare))).toEqual(['solution', 'cages', 'final']);
        expect(kinds(stepsOf(Object.assign({}, bare, { solution: null })))).toEqual(['final']);
        var classic = Object.assign({}, realResult('classic9', 'easy', 3), { digLog: [] });
        expect(kinds(stepsOf(classic))).toEqual(['solution', 'final']);
      });

    it('is deterministic and plain data', function () {
      var result = realResult('classic9', 'normal', 3);
      var plain = function (k, v) { return v instanceof Int32Array ? Array.from(v) : v; };
      var a = JSON.stringify(P.buildSteps(result), plain);
      var b = JSON.stringify(P.buildSteps(result), plain);
      expect(a).toBe(b);
    });

    it('sizes its batches by the board', function () {
      expect(P.batchCells(81)).toBe(9);
      expect(P.batchCells(16)).toBe(2);
      expect(P.batchCells(256)).toBe(28);
      expect(P.roundsPerStep(81)).toBe(1);
      expect(P.roundsPerStep(256)).toBe(3);
      expect(P.batchSigns(108)).toBe(14);
      expect(P.batchSigns(10)).toBe(4);
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

    it('closes a batch of removals before the clues of a reveal come back (the batch shows its own board)',
      function () {
        var base = realResult('classic9', 'veryEasy', 1);
        var givens = Int32Array.from(base.solution);
        var synthetic = Object.assign({}, base, { givens: givens, digLog: [
          { op: 'pass', pass: 'random', clues: 81 },
          { op: 'accept', cells: [0, 80] },
          { op: 'reveal', cells: [0, 80] }
        ] });
        var steps = stepsOf(synthetic);
        expect(kinds(steps)).toEqual(['solution', 'random', 'reveal', 'final']);
        expect([steps[1].values[0], steps[1].values[80]]).toEqual([0, 0]);
        expect([steps[2].values[0], steps[2].values[80]]).toEqual([base.solution[0], base.solution[80]]);
        expect(steps[1].metrics.clues).toBe(79);
        expect(steps[2].args.clues).toBe(81);
        expectFaithful(steps);
      });

    it('on a large board, where several guided rounds share a step, a reveal still follows the whole batch',
      function () {
        var base = realResult('mega16', 'veryEasy', 1);
        var n = base.model.cellCount;
        expect(P.roundsPerStep(n)).toBeGreaterThan(2);
        var givens = Int32Array.from(base.solution);
        [1, n - 2].forEach(function (c) { givens[c] = 0; });
        var synthetic = Object.assign({}, base, { givens: givens, digLog: [
          { op: 'pass', pass: 'guided', clues: n },
          { op: 'accept', cells: [0, n - 1] },
          { op: 'accept', cells: [1, n - 2] },
          { op: 'reveal', cells: [0, n - 1], reason: 'search' }
        ] });
        var steps = stepsOf(synthetic);
        expect(kinds(steps)).toEqual(['solution', 'guided', 'reveal', 'final']);
        [0, n - 1, 1, n - 2].forEach(function (c) { expect(steps[1].values[c]).toBe(0); });
        expect(steps[1].args.rounds).toBe(2);
        expect(steps[2].key).toBe('replay.reveal.search');
        [0, n - 1].forEach(function (c) { expect(steps[2].values[c]).toBe(base.solution[c]); });
        [1, n - 2].forEach(function (c) { expect(steps[2].values[c]).toBe(0); });
        expect(sameValues(steps[2].values, givens)).toBe(true);
        expect(sameValues(steps[steps.length - 1].values, givens)).toBe(true);
        expectFaithful(steps);
      });

    it('real top-level results with clues shown again replay faithfully (mega16, classic9)', function () {
      [['mega16', 'nightmare', 478576959], ['mega16', 'hell1', 2422420669], ['classic9', 'hell1', 3]]
        .forEach(function (c) {
          var result = realResult(c[0], c[1], c[2]);
          var steps = stepsOf(result);
          expectFaithful(steps);
          expect(sameValues(steps[steps.length - 1].values, result.givens)).toBe(true);
        });
    }, 60000);
  });

  describe('player: the board at a position', function () {
    it('is the empty grid at 0, the step after, clamped at both ends', function () {
      var built = P.buildSteps(realResult('killer', 'normal', 2));
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
    it('describes every step in English and Vietnamese with no placeholder left, naming the cells',
      function () {
        ['classic9/normal/3', 'greaterThan/normal/4', 'killer/normal/2'].forEach(function (id) {
          var parts = id.split('/');
          var result = realResult(parts[0], parts[1], Number(parts[2]));
          var steps = stepsOf(result);
          withLabels(result, function () {
            ['en', 'vi'].forEach(function (code) {
              inLocale(code, function () {
                steps.forEach(function (s) {
                  [P.describeStep(s), P.stepTitle(s), P.stepMeta(s)].forEach(function (text) {
                    expect(text.length).toBeGreaterThan(0);
                    expect(/[{}]/.test(text)).toBe(false);
                    expect(/^replay\./.test(text)).toBe(false);
                  });
                });
                expect(P.describeStep(null).length).toBeGreaterThan(10);
              });
            });
            var guided = steps.filter(function (s) { return s.kind === 'guided'; })[0];
            if (guided) {
              inLocale('en', function () { expect(P.describeStep(guided)).toMatch(/R\dC\d/); });
            }
          });
        });
        inLocale('en', function () {
          expect(P.positionText(0, 12)).toBe('Start');
          expect(P.positionText(3, 12)).toBe('Step 3 of 12');
        });
      });

    it('has a title for every kind of step and a label for every control', function () {
      P.KINDS.forEach(function (kind) { expect(SG.i18n.has('replay.title.' + kind)).toBe(true); });
      var controls = ['player.first', 'player.prev', 'player.next', 'player.last', 'player.scrubber'];
      controls.forEach(function (key) { expect(SG.i18n.has(key)).toBe(true); });
    });
  });

  describe('player: manual navigation', function () {
    it('shows the finished puzzle at once after load, with every layer and no frame', function () {
      var result = realResult('killer', 'normal', 2);
      var r = rig(81);
      r.player.load(result);
      var s = r.player.state();
      expect(s.loaded).toBe(true);
      expect(s.finished).toBe(true);
      expect(s.position).toBe(s.length);
      expect(Array.from(r.board.values)).toEqual(Array.from(result.givens));
      expect(r.board.givens).toEqual(Array.from(result.givens));
      expect(r.board.frames).toEqual({});
      P.LAYER_NAMES.forEach(function (name) { expect(r.board.layers[name]).toBe(true); });
      expect(r.positions.length).toBe(1);
      expect(r.positions[0].direction).toBe('seek');
      expect(r.positions[0].step.kind).toBe('final');
      expect(r.states[r.states.length - 1]).toEqual(s);
    });

    it('moves step by step, by jumps and by position, and the board follows', function () {
      var result = realResult('killer', 'normal', 2);
      var r = rig(81);
      r.player.load(result);
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

    it('describes the position for the status line', function () {
      var result = realResult('classic9', 'easy', 3);
      var r = rig(81);
      r.player.load(result);
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
        var r = rig(81);
        r.player.load(result);
        expect(r.board.models.length).toBe(0);
        r.player.seek(2);
        expect(r.board.model.inequalities.length).toBe(P.buildSteps(result).signs.length);
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
      var r = rig(81);
      r.player.load(realResult('classic9', 'easy', 3));
      r.player.reset();
      expect(r.player.state()).toEqual({ position: 0, length: 0, finished: false, loaded: false });
      expect(r.player.getSteps()).toEqual([]);
      expect(r.player.describe()).toEqual({ text: '', step: null });
      expect(r.states[r.states.length - 1].loaded).toBe(false);
      var before = r.positions.length;
      r.player.next();
      expect(r.positions.length).toBe(before);
      r.player.destroy();
      r.player.load(realResult('classic9', 'easy', 3));
      expect(r.player.state().loaded).toBe(false);
    });
  });

  describe('player: controls', function () {
    it('wires first / previous / next / last and the slider, disabled while nothing is loaded', function () {
      var c = fakeControls();
      var r = rig(81);
      var unbind = r.player.bindControls(c.root);
      ['#btn-first', '#btn-prev', '#btn-next', '#btn-last', '#scrubber'].forEach(function (sel) {
        expect(c.els[sel].disabled).toBe(true);
      });
      expect(c.els['#player-time'].textContent).toBe('');
      r.player.load(realResult('classic9', 'easy', 3));
      var n = r.player.state().length;
      ['#btn-first', '#btn-prev', '#btn-next', '#btn-last', '#scrubber'].forEach(function (sel) {
        expect(c.els[sel].disabled).toBe(false);
      });
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
  });
})();
