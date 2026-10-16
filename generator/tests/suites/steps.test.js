// Steps panel and explanation card (task T-4.5): the pure parts of js/ui/step-view.js and js/ui/explain.js,
// run against REAL event traces of the pipeline. No DOM is needed: the reducer, statusesAt, the chart model
// and the card's view model are plain functions. The DOM parts are checked in a browser.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var V = SG.stepView;
  var X = SG.explainCard;
  var NODE = SG.test.node;

  var STEP_IDS = ['configure', 'buildModel', 'fullGrid', 'extraStructure', 'dig', 'rate', 'tune'];

  var CONFIGS = {
    classic: { variantId: 'classic9', difficulty: 'medium', seed: 1, trace: 'summary' },
    classicFull: { variantId: 'classic9', difficulty: 'medium', seed: 1, trace: 'full' },
    classicOff: { variantId: 'classic9', difficulty: 'medium', seed: 1, trace: 'off' },
    killer: { variantId: 'killer', difficulty: 'medium', seed: 3, trace: 'summary' },
    // Row-by-row digging cannot reach the hard level, so every sample misses and the attempts run out.
    exhausted: { variantId: 'classic9', difficulty: 'hard', seed: 1, trace: 'summary', maxAttempts: 2,
      digOrder: 'rowByRow' },
    // The first grid misses, the second one hits.
    recovered: { variantId: 'hyper', difficulty: 'expert', seed: 1, trace: 'summary', maxAttempts: 2,
      digOrder: 'rowByRow' }
  };

  var cache = {};

  /** The recorded events and the result of a real pipeline run (run once per name). */
  function trace(name) {
    if (!cache[name]) {
      var events = [];
      var result = SG.pipeline.run(CONFIGS[name], function (e) { events.push(e); });
      cache[name] = { events: events, result: result };
    }
    return cache[name];
  }

  function stateAfter(events, count) {
    var state = V.initialState();
    for (var i = 0; i < count; i++) state = V.reduce(state, events[i]);
    return state;
  }

  function isStart(e) {
    return e.type === 'step' && e.phase === 'start';
  }

  function isEnd(e) {
    return e.type === 'step' && e.phase === 'end';
  }

  function indexOfEvent(events, test, from) {
    for (var i = from || 0; i < events.length; i++) if (test(events[i])) return i;
    return -1;
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

  /** A hand-made event, for the cases a real run cannot produce. */
  var seqCounter = 0;
  function ev(type, stepId, phase, t, key, args, metrics) {
    var e = { type: type, stepId: stepId, phase: phase, t: t, seq: seqCounter++ };
    if (key !== undefined) e.i18nKey = key;
    if (args !== undefined) e.i18nArgs = args;
    if (metrics !== undefined) e.metrics = metrics;
    return e;
  }

  /** A hand-made `error` event for the given step and error code. */
  function failure(stepId, code, t) {
    return ev('error', stepId, 'end', t, 'error.' + code, { code: code });
  }

  // ---------------------------------------------------------------------------------------------
  // Reducer
  // ---------------------------------------------------------------------------------------------

  describe('stepView: reducer', function () {
    it('starts with the seven steps pending, in pipeline order, and a fresh state each time', function () {
      var s = V.initialState();
      expect(V.STEP_IDS).toEqual(SG.events.STEP_IDS);
      expect(Object.keys(s.steps)).toEqual(STEP_IDS);
      STEP_IDS.forEach(function (id, i) {
        expect(s.steps[id].status).toBe('pending');
        expect(s.steps[id].index).toBe(i + 1);
        expect(s.steps[id].ms).toBe(0);
      });
      expect(s.current).toBeNull();
      expect(s.attempt).toBeNull();
      expect(s.sample).toBeNull();
      s.steps.dig.status = 'done';
      expect(V.initialState().steps.dig.status).toBe('pending');
    });

    it('shows a finished classic9 run: everything done, extraStructure skipped, result known', function () {
      var t = trace('classic');
      var s = V.statusesAt(t.events);
      expect(V.statuses(s)).toEqual({
        configure: 'done', buildModel: 'done', fullGrid: 'done', extraStructure: 'skipped', dig: 'done',
        rate: 'done', tune: 'done'
      });
      expect(s.finished).toBe(true);
      expect(s.current).toBeNull();
      expect(s.error).toBeNull();
      expect(s.result.achieved).toBe(t.result.rating.level);
      expect(s.result.attempts).toBe(t.result.attempts);
      expect(s.result.seed).toBe(t.result.seed);
      expect(s.seq).toBe(t.events[t.events.length - 1].seq);
    });

    it('does not skip extraStructure of a variant that builds something (killer)', function () {
      var s = V.statusesAt(trace('killer').events);
      expect(s.steps.extraStructure.status).toBe('done');
      expect(s.steps.extraStructure.notes.length).toBeGreaterThan(0);
      expect(V.statuses(s).tune).toBe('done');
    });

    it('gives the same statuses for the three verbosity levels', function () {
      var expected = V.statuses(V.statusesAt(trace('classic').events));
      expect(V.statuses(V.statusesAt(trace('classicOff').events))).toEqual(expected);
      expect(V.statuses(V.statusesAt(trace('classicFull').events))).toEqual(expected);
    });

    it('takes metrics of the three levels: final numbers, and live numbers from micro events', function () {
      var full = V.statusesAt(trace('classicFull').events);
      expect(full.steps.fullGrid.metrics.placed).toBe(81);
      expect(full.steps.fullGrid.metrics.backtracks).toBeGreaterThanOrEqual(0);
      expect(full.steps.buildModel.metrics.cells).toBe(81);
      expect(full.steps.buildModel.metrics.units).toBe(27);
      var summary = V.statusesAt(trace('classic').events);
      expect(summary.steps.dig.metrics.clues).toBe(trace('classic').result.givens.filter(Boolean).length);
      expect(summary.steps.rate.metrics.score).toBeGreaterThan(0);
      var off = V.statusesAt(trace('classicOff').events);
      expect(off.steps.fullGrid.metrics.placed).toBe(81);

      var events = trace('classicFull').events;
      var mid = indexOfEvent(events, function (e) { return e.i18nKey === 'dig.accept'; });
      var s = stateAfter(events, mid + 1);
      expect(s.steps.dig.status).toBe('running');
      expect(s.steps.dig.metrics.accepted).toBe(1);
      expect(s.steps.dig.metrics.attempts).toBe(1);
    });

    it('sets the step that starts to running and every later step back to pending, at every start and end',
      function () {
        ['classic', 'killer', 'exhausted', 'recovered'].forEach(function (name) {
          var events = trace(name).events;
          var state = V.initialState();
          events.forEach(function (e) {
            state = V.reduce(state, e);
            if (!isStart(e) && !isEnd(e)) return;
            var at = STEP_IDS.indexOf(e.stepId);
            var status = state.steps[e.stepId].status;
            if (isStart(e)) {
              expect(status).toBe('running');
              expect(state.current).toBe(e.stepId);
              STEP_IDS.slice(at + 1).forEach(function (id) {
                expect(state.steps[id].status).toBe('pending');
              });
            } else {
              expect(status === 'done' || (status === 'skipped' && e.stepId === 'extraStructure')).toBe(true);
            }
            STEP_IDS.slice(0, at).forEach(function (id) {
              expect(state.steps[id].status === 'done' || state.steps[id].status === 'skipped').toBe(true);
            });
          });
        });
      });

    it('counts attempts and samples and the samples that missed the level', function () {
      var events = trace('classic').events;
      var firstGrid = indexOfEvent(events, function (e) { return e.i18nKey === 'fullGrid.start'; });
      var s = stateAfter(events, firstGrid + 1);
      expect(s.attempt).toEqual({ n: 1, max: 8 });
      expect(s.sample).toBeNull();
      var digStarts = events.filter(function (e) { return e.i18nKey === 'dig.start'; });
      var misses = events.filter(function (e) { return e.i18nKey === 'tune.miss'; });
      expect(digStarts.length).toBeGreaterThan(1);
      var end = V.statusesAt(events);
      expect(end.sample).toEqual({ n: digStarts.length, max: 12 });
      expect(end.misses).toBe(misses.length);
      expect(end.steps.dig.runs).toBe(digStarts.length);
      expect(end.steps.rate.runs).toBe(digStarts.length);
      expect(end.steps.fullGrid.runs).toBe(1);
      var secondDig = indexOfEvent(events, function (e) { return e.i18nKey === 'dig.start'; },
        indexOfEvent(events, function (e) { return e.i18nKey === 'dig.start'; }) + 1);
      var s2 = stateAfter(events, secondDig + 1);
      expect(s2.sample).toEqual({ n: 2, max: 12 });
      expect(s2.misses).toBe(1);
      expect(s2.steps.rate.status).toBe('pending');
      expect(s2.steps.tune.status).toBe('pending');
    });

    it('shows the retry: a new attempt resets the steps after fullGrid and the sample counters', function () {
      var events = trace('exhausted').events;
      var retries = events.filter(function (e) { return e.type === 'retry'; });
      expect(retries.length).toBe(2);
      var first = indexOfEvent(events, function (e) { return e.type === 'retry'; });
      var s = stateAfter(events, first + 1);
      expect(s.retries).toBe(1);
      expect(s.lastRetry.attempt).toBe(1);
      expect(s.lastRetry.willRetry).toBe(true);
      expect(s.attempt).toEqual({ n: 2, max: 2 });
      var grid2 = indexOfEvent(events, function (e) {
        return e.i18nKey === 'fullGrid.start' && e.i18nArgs.attempt === 2;
      });
      var before = stateAfter(events, grid2);
      var after = stateAfter(events, grid2 + 1);
      expect(V.statuses(after)).toEqual({
        configure: 'done', buildModel: 'done', fullGrid: 'running', extraStructure: 'pending', dig: 'pending',
        rate: 'pending', tune: 'pending'
      });
      expect(after.sample).toBeNull();
      expect(after.misses).toBe(0);
      expect(after.steps.fullGrid.runs).toBe(2);
      expect(after.steps.dig.ms).toBe(before.steps.dig.ms);
      expect(after.steps.dig.runs).toBe(before.steps.dig.runs);
    });

    it('ends an exhausted run on the closest puzzle: tune.best, not exact, all steps done', function () {
      var t = trace('exhausted');
      var s = V.statusesAt(t.events);
      expect(s.retries).toBe(2);
      expect(s.lastRetry.willRetry).toBe(false);
      expect(s.attempt).toEqual({ n: 2, max: 2 });
      expect(s.result.exact).toBe(false);
      expect(t.result.warnings).toContain('difficulty.approximate');
      expect(s.steps.tune.notes.some(function (n) { return n.key === 'tune.best'; })).toBe(true);
      expect(STEP_IDS.every(function (id) {
        return s.steps[id].status !== 'pending' && s.steps[id].status !== 'running';
      })).toBe(true);
    });

    it('recovers after a miss: one retry, the second attempt hits', function () {
      var t = trace('recovered');
      var s = V.statusesAt(t.events);
      expect(s.retries).toBe(1);
      expect(s.attempt.n).toBe(2);
      expect(s.result.exact).toBe(true);
      expect(s.steps.fullGrid.runs).toBe(2);
      expect(s.error).toBeNull();
    });

    it('keeps each step time close to PuzzleResult.timings and can take the timings over', function () {
      ['classic', 'exhausted', 'killer'].forEach(function (name) {
        var t = trace(name);
        var s = V.statusesAt(t.events);
        var before = JSON.stringify(s);
        STEP_IDS.forEach(function (id) {
          var want = t.result.timings[id];
          expect(Math.abs(s.steps[id].ms - want)).toBeLessThan(10 + want * 0.2);
        });
        var set = V.applyTimings(s, t.result.timings);
        STEP_IDS.forEach(function (id) {
          expect(set.steps[id].ms).toBeCloseTo(t.result.timings[id], 1);
        });
        expect(JSON.stringify(s)).toBe(before);
        expect(V.applyTimings(s, null)).toEqual(s);
      });
    });

    it('measures a running step up to the last event', function () {
      seqCounter = 0;
      var s = V.reduce(V.initialState(), ev('step', 'dig', 'start', 10, 'dig.start', { attempt: 1 }));
      expect(V.elapsedMs(s, 'dig')).toBe(0);
      s = V.reduce(s, ev('metric', 'dig', 'progress', 35, undefined, undefined, { clues: 70 }));
      expect(V.elapsedMs(s, 'dig')).toBe(25);
      s = V.reduce(s, ev('step', 'dig', 'end', 40, 'dig.end', undefined, { clues: 30 }));
      expect(V.elapsedMs(s, 'dig')).toBe(30);
      s = V.reduce(s, ev('step', 'dig', 'start', 50, 'dig.start', { attempt: 1 }));
      s = V.reduce(s, ev('metric', 'dig', 'progress', 60, undefined, undefined, { clues: 70 }));
      expect(V.elapsedMs(s, 'dig')).toBe(40);
      expect(s.steps.dig.runs).toBe(2);
    });

    it('skips extraStructure from either sign: the "none" notice or the end event', function () {
      seqCounter = 0;
      var begin = ev('step', 'extraStructure', 'start', 1, 'extraStructure.start', {});
      var start = V.reduce(V.initialState(), begin);
      expect(start.steps.extraStructure.status).toBe('running');
      var none = V.reduce(start, ev('step', 'extraStructure', 'progress', 2, 'extraStructure.none', {}));
      expect(none.steps.extraStructure.status).toBe('skipped');
      var ended = function (skipped) {
        var end = ev('step', 'extraStructure', 'end', 3, 'extraStructure.end', { skipped: skipped });
        return V.reduce(start, end).steps.extraStructure.status;
      };
      expect(ended(true)).toBe('skipped');
      expect(ended(false)).toBe('done');
    });

    it('marks the step of an error event, or the running one for a pipeline-level error', function () {
      seqCounter = 0;
      var run = V.reduce(V.initialState(), ev('step', 'configure', 'start', 1, 'configure.start', {}));
      run = V.reduce(run, ev('step', 'configure', 'end', 2, 'configure.end'));
      run = V.reduce(run, ev('step', 'dig', 'start', 5, 'dig.start', { attempt: 1, maxAttempts: 8 }));
      var named = V.reduce(run, failure('dig', 'budget.exceeded', 9));
      expect(named.steps.dig.status).toBe('error');
      expect(named.steps.dig.ms).toBe(4);
      expect(named.error).toEqual({ stepId: 'dig', key: 'error.budget.exceeded',
        args: { code: 'budget.exceeded' } });
      expect(named.steps.configure.status).toBe('done');
      var general = V.reduce(run, failure('pipeline', 'budget.cancelled', 9));
      expect(general.steps.dig.status).toBe('error');
      expect(general.finished).toBe(false);
      var late = V.reduce(V.initialState(), failure('pipeline', 'unexpected', 1));
      expect(V.statuses(late)).toEqual(V.statuses(V.initialState()));
      expect(late.error.key).toBe('error.unexpected');
    });

    it('ignores events it does not understand', function () {
      var base = JSON.stringify(V.initialState());
      [null, undefined, 7, 'x', {}, { type: 'weird', stepId: 'dig' },
        { type: 'step', stepId: 'bogus', phase: 'start' },
        { type: 'micro', stepId: 'nowhere', phase: 'progress', metrics: { clues: 1 } }].forEach(function (e) {
        expect(JSON.stringify(V.reduce(V.initialState(), e))).toBe(base);
      });
    });

    it('does not modify the state it is given', function () {
      var events = trace('classic').events;
      var state = stateAfter(events, 14);
      var snapshot = JSON.stringify(state);
      var next = V.reduce(state, events[14]);
      expect(JSON.stringify(state)).toBe(snapshot);
      expect(next).not.toBe(state);
      expect(next.steps.dig).not.toBe(state.steps.dig);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // statusesAt
  // ---------------------------------------------------------------------------------------------

  describe('stepView: statusesAt', function () {
    function checkEveryPosition(events, stride) {
      var state = V.initialState();
      expect(V.statusesAt(events, -1)).toEqual(state);
      for (var k = 0; k < events.length; k++) {
        state = V.reduce(state, events[k]);
        if (k % stride === 0 || k === events.length - 1) {
          expect(V.statusesAt(events, events[k].seq)).toEqual(state);
        }
      }
    }

    it('equals feeding the events one by one, at every position of a summary trace', function () {
      checkEveryPosition(trace('classic').events, 1);
      checkEveryPosition(trace('killer').events, 1);
    });

    it('equals feeding the events one by one on traces with retries and with full detail', function () {
      checkEveryPosition(trace('exhausted').events, 7);
      checkEveryPosition(trace('recovered').events, 5);
      checkEveryPosition(trace('classicFull').events, 3);
    });

    it('treats the position as inclusive and defaults to the whole trace', function () {
      var events = trace('classic').events;
      expect(V.statusesAt(events)).toEqual(V.statusesAt(events, 1e9));
      expect(V.statusesAt(events, 0).steps.configure.status).toBe('running');
      expect(V.statusesAt(events, 2).steps.configure.status).toBe('done');
      expect(V.statusesAt([], 5)).toEqual(V.initialState());
    });

    it('records where each step started and ended in the trace, for seeking', function () {
      var events = trace('exhausted').events;
      var s = V.statusesAt(events);
      STEP_IDS.forEach(function (id) {
        var step = s.steps[id];
        expect(events[step.firstSeq].stepId).toBe(id);
        expect(isStart(events[step.firstSeq])).toBe(true);
        expect(events[step.startSeq].stepId).toBe(id);
        expect(isStart(events[step.startSeq])).toBe(true);
        expect(events[step.endSeq].stepId).toBe(id);
        expect(isEnd(events[step.endSeq])).toBe(true);
        expect(step.firstSeq).toBeLessThan(step.startSeq + 1);
      });
      expect(s.steps.dig.firstSeq).toBeLessThan(s.steps.dig.startSeq);
      expect(s.steps.configure.firstSeq).toBe(0);
    });

    it('copes with a capped trace (a repeated seq) and ends on the same statuses', function () {
      var full = trace('classicFull').events;
      var capped = SG.events.capTrace(full, Math.floor(full.length / 2));
      expect(capped.length).toBeLessThan(full.length);
      expect(V.statuses(V.statusesAt(capped))).toEqual(V.statuses(V.statusesAt(full)));
      var state = V.initialState();
      capped.forEach(function (e) { state = V.reduce(state, e); });
      expect(V.statusesAt(capped)).toEqual(state);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Chart
  // ---------------------------------------------------------------------------------------------

  describe('stepView: chartModel', function () {
    function ids(model) {
      return model.bars.map(function (b) { return b.id; });
    }

    it('orders the bars by the technique ladder, whatever the order of the counts', function () {
      var m = V.chartModel({ xWing: 1, nakedPair: 4, nakedSingle: 40, hiddenSingleBox: 7, pointing: 2 });
      expect(ids(m)).toEqual(['nakedSingle', 'hiddenSingleBox', 'pointing', 'nakedPair', 'xWing']);
      var orders = m.bars.map(function (b) { return b.order; });
      expect(orders).toEqual(orders.slice().sort(function (a, b) { return a - b; }));
      expect(m.total).toBe(54);
      expect(m.max).toBe(40);
    });

    it('draws the real counts of a puzzle, cage techniques included, simplest first', function () {
      [trace('classic'), trace('killer')].forEach(function (t) {
        var counts = t.result.rating.techniqueCounts;
        var m = V.chartModel(counts);
        var used = Object.keys(counts).filter(function (k) { return counts[k] > 0; }).sort();
        expect(ids(m).slice().sort()).toEqual(used);
        m.bars.forEach(function (bar) {
          expect(bar.count).toBe(counts[bar.id]);
          expect(bar.label).not.toBe(bar.key);
          expect(bar.label.length).toBeGreaterThan(2);
        });
        for (var i = 1; i < m.bars.length; i++) expect(m.bars[i - 1].order).toBeLessThan(m.bars[i].order);
      });
      expect(ids(V.chartModel(trace('killer').result.rating.techniqueCounts))).toContain('cageCombo');
    });

    it('scales the bars to the largest count, with a minimum width, inside the track', function () {
      var m = V.chartModel({ nakedSingle: 50, hiddenSingleBox: 25, nakedPair: 1 }, { width: 200 });
      expect(m.width).toBe(200);
      expect(m.bars[0].barWidth).toBe(200);
      expect(m.bars[1].barWidth).toBe(100);
      expect(m.bars[2].barWidth).toBe(4);
      expect(V.chartModel({ nakedSingle: 1000, nakedPair: 1 }, { width: 200 }).bars[1].barWidth).toBe(3);
      m.bars.forEach(function (bar) {
        expect(bar.barWidth).toBeLessThan(bar.trackWidth + 0.001);
        expect(bar.ratio).toBeGreaterThan(0);
        expect(bar.ratio).toBeLessThan(1.0001);
      });
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
        expect(isFinite(bar.barWidth) && isFinite(bar.barY)).toBe(true);
      });
    });

    it('handles zero, negative, broken and missing counts as an empty chart', function () {
      [undefined, null, {}, { nakedSingle: 0 },
        { nakedSingle: -2, xWing: NaN, nakedPair: 'x', swordfish: Infinity }]
        .forEach(function (counts) {
          var m = V.chartModel(counts);
          expect(m.empty).toBe(true);
          expect(m.bars).toEqual([]);
          expect(m.height).toBe(0);
          expect(m.max).toBe(0);
          expect(m.total).toBe(0);
        });
      var mixed = V.chartModel({ nakedSingle: 0, xWing: 2, nakedPair: -1 });
      expect(ids(mixed)).toEqual(['xWing']);
      expect(mixed.bars[0].barWidth).toBe(mixed.width);
    });

    it('puts techniques the registry does not know last, by id, labelled with their id', function () {
      var m = V.chartModel({ zeta: 1, nakedSingle: 2, alpha: 3, xWing: 1 });
      expect(ids(m)).toEqual(['nakedSingle', 'xWing', 'alpha', 'zeta']);
      expect(m.bars[2].label).toBe('alpha');
      expect(m.bars[2].order).toBeNull();
    });

    it('labels with the current language, or with a given function', function () {
      var en = V.chartModel({ nakedSingle: 3 }).bars[0].label;
      var vi = inLocale('vi', function () { return V.chartModel({ nakedSingle: 3 }).bars[0].label; });
      expect(en).toBe(SG.locales.en['technique.nakedSingle']);
      expect(vi).toBe(SG.locales.vi['technique.nakedSingle']);
      expect(vi).not.toBe(en);
      var custom = function (id, key) { return id + '|' + key; };
      expect(V.chartModel({ nakedSingle: 3 }, { label: custom }).bars[0].label)
        .toBe('nakedSingle|technique.nakedSingle');
    });

    it('describes the chart in words: every technique and its count, in order', function () {
      var m = V.chartModel({ hiddenSingleBox: 7, nakedSingle: 40 });
      var text = V.chartSummary(m);
      expect(text.indexOf(m.bars[0].label)).toBeGreaterThan(-1);
      expect(text.indexOf(m.bars[0].label)).toBeLessThan(text.indexOf(m.bars[1].label));
      expect(text).toContain('40');
      expect(text).toContain('7');
      expect(text).not.toMatch(/[{}]/);
      expect(V.chartSummary(V.chartModel({}))).toBe(SG.locales.en['steps.chart.empty']);
      var vi = inLocale('vi', function () { return V.chartSummary(m); });
      expect(vi).not.toBe(text);
      expect(vi).toContain('40');
    });

    it('takes its counts from the rate events of the trace', function () {
      var t = trace('killer');
      var s = V.statusesAt(t.events);
      expect(s.techniqueCounts).toEqual(t.result.rating.techniqueCounts);
      var rateStart = indexOfEvent(t.events, function (e) { return e.i18nKey === 'rate.start'; });
      expect(stateAfter(t.events, rateStart + 1).techniqueCounts).toEqual({});
      var all = V.statusesAt(trace('exhausted').events);
      expect(all.techniqueCounts).toEqual(trace('exhausted').result.rating.techniqueCounts);
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
        expect(vm.total).toBe(7);
        expect(vm.titleKey).toBe('step.' + id + '.name');
        expect(vm.title).toBe(SG.locales.en['step.' + id + '.name']);
        ['what', 'why', 'how'].forEach(function (part) {
          expect(vm.keys[part]).toBe(data[part]);
          expect(vm[part]).toBe(SG.locales.en[data[part]]);
          expect(vm[part]).not.toMatch(/[{}]/);
        });
        expect(vm.lines.length).toBe(data.pseudocode.length);
        vm.lines.forEach(function (line, k) {
          expect(line.label).toBe(data.pseudocode[k].label);
          expect(line.indent).toBe(data.pseudocode[k].indent);
          expect(line.key).toBe(data.pseudocode[k].key);
          expect(line.text).toBe(SG.locales.en[line.key]);
          expect(line.active).toBe(false);
        });
        expect(vm.activeLabel).toBeNull();
        expect(vm.live.key).toBe(data.liveKey);
        expect(vm.live.text).not.toMatch(/[{}]/);
      });
    });

    it('highlights exactly the line of every highlight key of every step', function () {
      var checked = 0;
      STEP_IDS.forEach(function (id) {
        var data = SG.explain.get(id);
        var labels = data.pseudocode.map(function (line) { return line.label; });
        Object.keys(data.highlight).forEach(function (key) {
          var vm = X.viewModel(id, { eventKey: key });
          var active = vm.lines.filter(function (line) { return line.active; });
          expect(active.length).toBe(1);
          expect(active[0].label).toBe(data.highlight[key]);
          expect(active[0].label).toBe(SG.explain.lineFor(id, key));
          expect(labels).toContain(active[0].label);
          expect(vm.activeLabel).toBe(data.highlight[key]);
          checked++;
        });
      });
      expect(checked).toBeGreaterThan(25);
    });

    it('highlights nothing for an event that executes no particular line', function () {
      var keys = ['dig.end', 'dig.start', 'fullGrid.end', 'rate.start', 'tune.end', 'no.such.key'];
      keys.forEach(function (key) {
        var id = key.indexOf('.') > 0 ? key.split('.')[0] : 'dig';
        var vm = X.viewModel(STEP_IDS.indexOf(id) === -1 ? 'dig' : id, { eventKey: key });
        expect(vm.activeLabel).toBeNull();
        expect(vm.lines.some(function (line) { return line.active; })).toBe(false);
      });
      expect(X.viewModel('dig', { metrics: { clues: 3 } }).activeLabel).toBeNull();
    });

    it('lets an explicit line label win over the event key, and null mean "none"', function () {
      expect(X.viewModel('dig', { eventKey: 'dig.try', lineLabel: 'verify' }).activeLabel).toBe('verify');
      expect(X.viewModel('dig', { eventKey: 'dig.try', lineLabel: null }).activeLabel).toBeNull();
      expect(X.viewModel('dig', { lineLabel: 'nope' }).activeLabel).toBeNull();
      expect(X.viewModel('tune', { eventKey: 'retry.difficulty' }).activeLabel).toBe('retry');
    });

    it('keeps the key of an event of another step from lighting a line of this one', function () {
      expect(X.viewModel('rate', { eventKey: 'dig.try' }).activeLabel).toBeNull();
    });

    it('fills the status line from the metrics, with zeros for the missing ones', function () {
      var dig = X.viewModel('dig', { metrics: { attempts: 62, accepted: 26, rejected: 11, clues: 30 } });
      expect(dig.live.args).toEqual({ attempts: 62, accepted: 26, rejected: 11, clues: 30 });
      ['62', '26', '11', '30'].forEach(function (n) { expect(dig.live.text).toContain(n); });
      expect(X.viewModel('dig').live.args).toEqual({ attempts: 0, accepted: 0, rejected: 0, clues: 0 });
      var rate = X.viewModel('rate', { metrics: { clues: 30, score: 83.975 } });
      expect(rate.live.text).toContain('84');
      expect(rate.live.text).not.toContain('83.975');
      expect(X.viewModel('fullGrid', { metrics: { placed: 54, backtracks: 12 } }).live.text).toContain('54');
      expect(X.viewModel('configure').live.text).toBe(SG.locales.en['explain.configure.live']);
    });

    it('returns null for an unknown step', function () {
      expect(X.viewModel('nope')).toBeNull();
      expect(X.viewModel(undefined)).toBeNull();
    });

    it('follows the language: new text at once, same structure and same highlighted line', function () {
      var ctx = { eventKey: 'dig.accept', metrics: { attempts: 5, accepted: 3, rejected: 2, clues: 60 } };
      var en = X.viewModel('dig', ctx);
      var vi = inLocale('vi', function () { return X.viewModel('dig', ctx); });
      expect(vi.title).toBe(SG.locales.vi['step.dig.name']);
      expect(vi.title).not.toBe(en.title);
      ['what', 'why', 'how'].forEach(function (part) { expect(vi[part]).not.toBe(en[part]); });
      expect(vi.live.text).not.toBe(en.live.text);
      expect(vi.live.text).toContain('60');
      expect(vi.lines.map(function (l) { return l.label + l.indent + l.active; }))
        .toEqual(en.lines.map(function (l) { return l.label + l.indent + l.active; }));
      expect(vi.activeLabel).toBe('accept');
      expect(vi.lines.some(function (l, i) { return l.text !== en.lines[i].text; })).toBe(true);
      expect(X.viewModel('dig', ctx).title).toBe(en.title);
    });

    it('can replay a whole trace through the card: every event with a key gives a legal line', function () {
      var events = trace('classicFull').events;
      var lit = 0;
      events.forEach(function (e) {
        if (!e.i18nKey || STEP_IDS.indexOf(e.stepId) === -1) return;
        var vm = X.viewModel(e.stepId, { eventKey: e.i18nKey, metrics: e.metrics });
        var active = vm.lines.filter(function (line) { return line.active; });
        expect(active.length <= 1).toBe(true);
        if (active.length === 1) lit++;
      });
      expect(lit).toBeGreaterThan(20);
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
      V.STATUSES.forEach(function (status) { used.push('steps.status.' + status); });
      ['what', 'why', 'how'].forEach(function (part) { used.push('explainCard.' + part); });
      // 'steps.status.' alone is the prefix of the dynamic keys added just above.
      used = used.filter(function (key, i) { return used.indexOf(key) === i && key.slice(-1) !== '.'; });
      expect(used.length).toBeGreaterThan(25);
      ['en', 'vi'].forEach(function (code) {
        var missing = used.filter(function (key) { return !packHas(SG.locales[code], key); });
        expect(missing).toEqual([]);
      });
      var clashes = SG.i18n.conflicts.filter(function (c) { return /^(steps|explainCard)\./.test(c.key); });
      expect(clashes).toEqual([]);
    });

    it('keeps the two locale fragments identical in keys and placeholders, with no key outside the prefixes',
      function () {
        ['steps.status.pending', 'explainCard.what'].forEach(function (probe) {
          var fragment = fragmentWith(probe);
          expect(fragment).toBeTruthy();
          var en = Object.keys(fragment.en).sort();
          expect(Object.keys(fragment.vi).sort()).toEqual(en);
          en.forEach(function (key) {
            expect(/^(steps|explainCard)\./.test(key)).toBe(true);
            var holes = function (text) {
              return (String(text).match(/\{[A-Za-z]+\}/g) || []).sort().join();
            };
            expect(holes(fragment.vi[key])).toBe(holes(fragment.en[key]));
            expect(fragment.vi[key].trim()).not.toBe('');
          });
        });
      });

    it('names every status, in both languages, with different words', function () {
      V.STATUSES.forEach(function (status) {
        var en = SG.locales.en['steps.status.' + status];
        var vi = SG.locales.vi['steps.status.' + status];
        expect(en.length).toBeGreaterThan(1);
        expect(vi).not.toBe(en);
      });
    });

    it('uses only tokens of css/tokens.css and no colour literal in css/steps.css', function () {
      var css = source('css/steps.css').replace(/\/\*[\s\S]*?\*\//g, '');
      var tokens = source('css/tokens.css');
      expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(css).not.toMatch(/\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\(/);
      expect(css).not.toMatch(/:\s*(?:white|black|red|green|blue|gray|grey|yellow|orange|purple)\b/);
      var used = css.match(/var\(--sg-[a-z0-9-]+/g) || [];
      expect(used.length).toBeGreaterThan(30);
      used.forEach(function (ref) {
        var name = ref.slice(4);
        if (/^--sg-color-/.test(name)) expect(tokens.indexOf(name + ':')).toBeGreaterThan(-1);
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
