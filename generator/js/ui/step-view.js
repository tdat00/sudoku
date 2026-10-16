/**
 * Steps panel (task T-4.5; design.md sections 7.1, 7.3, 10.1 and 10.5): the seven generation steps with
 * their status, real-time metrics and time, the "Attempt n/m" and sample counters, a collapsible detail per
 * step and the technique-frequency bar chart (plain SVG, no library).
 *
 * Everything is a PURE reducer first and DOM second, so Node tests need no DOM:
 *   `initialState()`, `reduce(state, event)`, `statusesAt(events, uptoSeq)` and `statuses(state)` derive the
 *   panel from the event stream (any verbosity: 'off', 'summary' or 'full'); `chartModel(counts, options)`
 *   computes the geometry of the chart; `create(rootEl, options)` renders a state into `#steps-root`.
 *
 * Panel state (plain data, safe to clone):
 *   steps[id]  { id, index (1..7), status 'pending' | 'running' | 'done' | 'error' | 'skipped', ms (time
 *              spent, summed over runs), startT, runs, firstSeq / startSeq / endSeq (positions in the
 *              trace), metrics (latest numbers of the current run), notes [{key, args}] (latest messages) }
 *   current    id of the step whose start event came last (null before the first and after `done`)
 *   attempt    { n, max } from fullGrid.start / retry.difficulty;  sample  { n, max } from dig.start
 *   misses     samples of the current grid that missed the level;  retries  grids given up so far
 *   techniqueCounts  what the latest rate step counted;  finished / result  the `done` event
 *   error      { stepId, key, args } of an `error` event;  seq / t  position and time of the last event
 *
 * Rules the reducer follows: a step start event sets the step running and puts every LATER step back to
 * pending (a new dig sample redoes rate and tune, a new grid redoes everything after fullGrid), so the panel
 * always shows the pipeline as it is being re-run; time and run counts keep adding up across runs, like
 * `PuzzleResult.timings`. A step is 'skipped' when extraStructure ends with `skipped: true` (or says
 * 'extraStructure.none'). An `error` event marks the step it names (or the running one) as 'error'.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.stepView && typeof SG.stepView.create === 'function') return;

  const SVG_NS = 'http://www.w3.org/2000/svg';

  /** The seven steps in pipeline order (the same list as `SG.events.STEP_IDS`). */
  const STEP_IDS = Object.freeze(['configure', 'buildModel', 'fullGrid', 'extraStructure', 'dig', 'rate',
    'tune']);

  const STATUSES = Object.freeze(['pending', 'running', 'done', 'error', 'skipped']);

  /** Steps that repeat once per dig sample. */
  const SAMPLE_STEPS = Object.freeze(['dig', 'rate', 'tune']);

  /** Messages kept per step. */
  const MAX_NOTES = 4;

  /** Default geometry of the chart, in SVG units. */
  const CHART_WIDTH = 300;
    const CHART_ROW = 32;
  const CHART_BAR = 8;
    const CHART_LABEL_Y = 13;
    const CHART_BAR_Y = 19;
  const CHART_MIN_BAR = 3;

  let instances = 0;

  // ---------------------------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------------------------

  function isNum(x) {
    return typeof x === 'number' && isFinite(x);
  }

  function round2(x) {
    return Math.round(x * 100) / 100;
  }

  function translate(key, args) {
    if (SG.i18n && typeof SG.i18n.t === 'function') return SG.i18n.t(key, args);
    return key;
  }

  function hasText(key) {
    return !!(SG.i18n && typeof SG.i18n.has === 'function' && SG.i18n.has(key));
  }

  function currentLocale() {
    return SG.i18n ? SG.i18n.current : 'en';
  }

  function formatDuration(ms) {
    if (SG.i18n && typeof SG.i18n.formatDuration === 'function') return SG.i18n.formatDuration(ms);
    return Math.round(ms) + ' ms';
  }

  /** Numbers of a live status line, formatted for the language (at most one decimal). */
  function liveArgs(args) {
    const out = {};
    Object.keys(args).forEach(function (name) {
      const value = args[name];
      if (typeof value !== 'number') out[name] = value;
      else if (SG.i18n && typeof SG.i18n.formatNumber === 'function') {
        out[name] = SG.i18n.formatNumber(value, { maximumFractionDigits: 1 });
      } else out[name] = String(round2(value));
    });
    return out;
  }

  function eventText(key, args) {
    if (SG.i18n && typeof SG.i18n.eventText === 'function') {
      return SG.i18n.eventText({ i18nKey: key, i18nArgs: args });
    }
    return key;
  }

  // ---------------------------------------------------------------------------------------------
  // Reducer
  // ---------------------------------------------------------------------------------------------

  function newStep(id) {
    return {
      id: id,
      index: STEP_IDS.indexOf(id) + 1,
      status: 'pending',
      ms: 0,
      startT: null,
      runs: 0,
      firstSeq: null,
      startSeq: null,
      endSeq: null,
      metrics: {},
      notes: []
    };
  }

  /**
   * The state before any event: all seven steps pending.
   * @returns {Object} A new state object (see the file header).
   */
  function initialState() {
    const steps = {};
    STEP_IDS.forEach(function (id) { steps[id] = newStep(id); });
    return {
      seq: -1,
      t: 0,
      current: null,
      attempt: null,
      sample: null,
      misses: 0,
      retries: 0,
      lastRetry: null,
      techniqueCounts: {},
      finished: false,
      result: null,
      error: null,
      event: null,
      steps: steps
    };
  }

  function copyOrNull(obj) {
    return obj === null ? null : Object.assign({}, obj);
  }

  function cloneState(s) {
    const steps = {};
    STEP_IDS.forEach(function (id) {
      const p = s.steps[id];
      steps[id] = Object.assign({}, p, { metrics: Object.assign({}, p.metrics), notes: p.notes.slice() });
    });
    return Object.assign({}, s, {
      attempt: copyOrNull(s.attempt),
      sample: copyOrNull(s.sample),
      lastRetry: copyOrNull(s.lastRetry),
      techniqueCounts: Object.assign({}, s.techniqueCounts),
      result: copyOrNull(s.result),
      error: copyOrNull(s.error),
      event: copyOrNull(s.event),
      steps: steps
    });
  }

  function mergeMetrics(step, metrics) {
    if (metrics === null || typeof metrics !== 'object') return;
    Object.keys(metrics).forEach(function (name) {
      if (isNum(metrics[name])) step.metrics[name] = metrics[name];
    });
  }

  function pushNote(step, key, args) {
    step.notes.push({ key: key, args: args });
    if (step.notes.length > MAX_NOTES) step.notes.shift();
  }

  /** Back to pending, keeping the time and run count that add up over the whole generation. */
  function resetStep(step) {
    if (step.status === 'pending' && step.startT === null) return;
    step.status = 'pending';
    step.startT = null;
    step.startSeq = null;
    step.endSeq = null;
    step.metrics = {};
    step.notes = [];
  }

  function closeRun(state, step, t) {
    if (step.startT !== null) {
      const end = isNum(t) ? t : state.t;
      step.ms = round2(step.ms + Math.max(0, end - step.startT));
    }
    step.startT = null;
  }

  function startStep(state, step, ev, args) {
    step.status = 'running';
    step.startT = isNum(ev.t) ? ev.t : state.t;
    step.runs++;
    step.startSeq = state.seq;
    step.endSeq = null;
    if (step.firstSeq === null) step.firstSeq = state.seq;
    step.metrics = {};
    step.notes = [];
    state.current = step.id;
    for (let i = step.index; i < STEP_IDS.length; i++) resetStep(state.steps[STEP_IDS[i]]);
    if (step.id === 'fullGrid') {
      state.sample = null;
      state.misses = 0;
    }
    if (step.id === 'rate') state.techniqueCounts = {};
    if (isNum(args.attempt)) {
      const known = state.attempt ? state.attempt.max : args.attempt;
      state.attempt = { n: args.attempt, max: isNum(args.maxAttempts) ? args.maxAttempts : known };
    }
    if (isNum(args.sample) && isNum(args.maxSamples)) {
      state.sample = { n: args.sample, max: args.maxSamples };
    }
  }

  function endStep(state, step, ev, args) {
    closeRun(state, step, ev.t);
    step.endSeq = state.seq;
    step.status = step.id === 'extraStructure' && args.skipped === true ? 'skipped' : 'done';
    mergeMetrics(step, ev.metrics);
  }

  function progressStep(state, step, ev, key, args) {
    mergeMetrics(step, ev.metrics);
    if (key === null) return;
    if (key === 'buildModel.model') {
      if (isNum(args.cellCount)) step.metrics.cells = args.cellCount;
      if (isNum(args.units)) step.metrics.units = args.units;
    } else if (key === 'extraStructure.none') {
      if (step.status === 'running') step.status = 'skipped';
    } else if (key === 'rate.technique') {
      if (typeof args.technique === 'string' && isNum(args.count)) {
        state.techniqueCounts[args.technique] = args.count;
      }
      return;
    } else if (key === 'tune.miss') {
      state.misses++;
    }
    pushNote(step, key, args);
  }

  function stepEvent(state, step, ev, key, args) {
    if (step === null) return;
    if (ev.phase === 'start') startStep(state, step, ev, args);
    else if (ev.phase === 'end') endStep(state, step, ev, args);
    else progressStep(state, step, ev, key, args);
  }

  function retryEvent(state, args) {
    state.retries++;
    state.lastRetry = Object.assign({}, args);
    if (args.willRetry === true && isNum(args.attempt) && isNum(args.maxAttempts)) {
      state.attempt = { n: args.attempt + 1, max: args.maxAttempts };
    }
  }

  function doneEvent(state, ev, args) {
    state.finished = true;
    state.current = null;
    state.result = Object.assign({}, args);
    if (ev.metrics && isNum(ev.metrics.elapsedMs)) state.result.elapsedMs = ev.metrics.elapsedMs;
  }

  function errorEvent(state, step, ev, key, args) {
    state.error = { stepId: ev.stepId, key: key !== null ? key : 'error.unexpected', args: args };
    let target = step;
    if (target === null && state.current !== null) target = state.steps[state.current];
    if (target !== null && (target.status === 'running' || target.status === 'pending')) {
      closeRun(state, target, ev.t);
      target.status = 'error';
      target.endSeq = state.seq;
    }
  }

  /** Applies one event to a state IN PLACE (the private core of `reduce` and `statusesAt`). */
  function apply(state, ev) {
    if (ev === null || typeof ev !== 'object') return state;
    if (isNum(ev.seq)) state.seq = ev.seq;
    if (isNum(ev.t)) state.t = ev.t;
    const key = typeof ev.i18nKey === 'string' && ev.i18nKey !== '' ? ev.i18nKey : null;
    const args = ev.i18nArgs !== null && typeof ev.i18nArgs === 'object' ? ev.i18nArgs : {};
    const step = STEP_IDS.indexOf(ev.stepId) === -1 ? null : state.steps[ev.stepId];
    if (key !== null) state.event = { seq: state.seq, stepId: ev.stepId, key: key };
    switch (ev.type) {
      case 'step':
        stepEvent(state, step, ev, key, args);
        break;
      case 'micro':
      case 'metric':
        if (step !== null) mergeMetrics(step, ev.metrics);
        break;
      case 'retry':
        retryEvent(state, args);
        break;
      case 'done':
        doneEvent(state, ev, args);
        break;
      case 'error':
        errorEvent(state, step, ev, key, args);
        break;
      default:
        break;
    }
    return state;
  }

  /**
   * Feeds one event to the panel state. Pure: the given state is not modified. Unknown events are ignored.
   * @param {Object} state  A state from `initialState()`, `reduce` or `statusesAt`.
   * @param {Object} event  A `GenerationEvent` of any verbosity.
   * @returns {Object} The new state.
   */
  function reduce(state, event) {
    return apply(cloneState(state), event);
  }

  /**
   * The whole panel state at a position of the trace: the events with `seq <= uptoSeq` applied in order
   * (for an uncapped trace `seq` equals the array index; a capped trace repeats the `seq` of the event after
   * a synthesized one, so both count). Equal to feeding the same events one by one to `reduce`, so the
   * player can use it to seek in either direction.
   * @param {Object[]} events  The recorded trace.
   * @param {number} [uptoSeq=Infinity]  Inclusive; -1 gives the initial state.
   * @returns {Object} A new state.
   */
  function statusesAt(events, uptoSeq) {
    const state = initialState();
    const limit = isNum(uptoSeq) ? uptoSeq : Infinity;
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (ev && isNum(ev.seq) && ev.seq > limit) break;
      apply(state, ev);
    }
    return state;
  }

  /**
   * @param {Object} state
   * @returns {Object<string, string>} Step id -> status.
   */
  function statuses(state) {
    const out = {};
    STEP_IDS.forEach(function (id) { out[id] = state.steps[id].status; });
    return out;
  }

  /**
   * Milliseconds a step has taken so far: finished runs plus the run in progress (up to the time of the last
   * event).
   * @param {Object} state
   * @param {string} stepId
   * @returns {number}
   */
  function elapsedMs(state, stepId) {
    const step = state.steps[stepId];
    if (step.status === 'running' && step.startT !== null) {
      return round2(step.ms + Math.max(0, state.t - step.startT));
    }
    return step.ms;
  }

  /**
   * Replaces the times of a state by the authoritative `PuzzleResult.timings`.
   * @param {Object} state
   * @param {Object<string, number>} timings  Step id -> milliseconds.
   * @returns {Object} A new state.
   */
  function applyTimings(state, timings) {
    const next = cloneState(state);
    STEP_IDS.forEach(function (id) {
      if (timings && isNum(timings[id])) next.steps[id].ms = round2(timings[id]);
    });
    return next;
  }

  // ---------------------------------------------------------------------------------------------
  // Chart model
  // ---------------------------------------------------------------------------------------------

  function techniqueInfo(id) {
    const reg = SG.techniques;
    if (reg && typeof reg.has === 'function' && reg.has(id)) {
      const def = reg.get(id);
      return { order: def.order, group: def.group, key: def.i18nKey || 'technique.' + id };
    }
    return { order: null, group: null, key: 'technique.' + id };
  }

  function techniqueLabel(id, key) {
    return hasText(key) ? translate(key) : id;
  }

  /**
   * Geometry of the technique-frequency bar chart. Each technique is one row: its name on the left and its
   * count on the right above a thin bar, so long names (and Vietnamese) never collide with the bar. Bars are
   * ordered by the technique ladder (`SG.techniques` `order`, simplest first); techniques the registry does
   * not know come last, by id. Counts that are zero, negative or not numbers are dropped.
   * @param {Object<string, number>} counts  `rating.techniqueCounts`.
   * @param {Object} [options]
   * @param {number} [options.width=300]  Width of the viewBox.
   * @param {number} [options.rowHeight=32]
   * @param {number} [options.barHeight=8]
   * @param {number} [options.minBarWidth=3]  Narrowest bar of a technique that was used.
   * @param {function(string, string): string} [options.label]  `(id, i18nKey) -> text` (default: translated).
   * @returns {{width: number, height: number, rowHeight: number, max: number, total: number, empty: boolean,
   *   bars: Object[]}} Each bar: `{id, key, label, group, order, count, ratio, y, labelY, valueX, barY,
   *   barHeight, barWidth, trackWidth}`.
   */
  function chartModel(counts, options) {
    const o = options || {};
    const width = isNum(o.width) && o.width > 0 ? o.width : CHART_WIDTH;
    const rowHeight = isNum(o.rowHeight) && o.rowHeight > 0 ? o.rowHeight : CHART_ROW;
    const barHeight = isNum(o.barHeight) && o.barHeight > 0 ? o.barHeight : CHART_BAR;
    const minBar = isNum(o.minBarWidth) && o.minBarWidth >= 0 ? o.minBarWidth : CHART_MIN_BAR;
    const labelOf = typeof o.label === 'function' ? o.label : techniqueLabel;

    const entries = [];
    Object.keys(counts || {}).forEach(function (id) {
      const count = counts[id];
      if (!isNum(count) || count <= 0) return;
      const info = techniqueInfo(id);
      entries.push({ id: id, count: count, order: info.order, group: info.group, key: info.key });
    });
    entries.sort(function (a, b) {
      if (a.order !== b.order) {
        if (a.order === null) return 1;
        if (b.order === null) return -1;
        return a.order - b.order;
      }
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

    let max = 0;
    let total = 0;
    entries.forEach(function (e) {
      if (e.count > max) max = e.count;
      total += e.count;
    });
    const bars = entries.map(function (e, i) {
      const y = i * rowHeight;
      const ratio = max > 0 ? e.count / max : 0;
      return {
        id: e.id,
        key: e.key,
        label: labelOf(e.id, e.key),
        group: e.group,
        order: e.order,
        count: e.count,
        ratio: round2(ratio),
        y: y,
        labelY: y + CHART_LABEL_Y,
        valueX: width,
        barY: y + CHART_BAR_Y,
        barHeight: barHeight,
        barWidth: round2(Math.min(width, Math.max(minBar, ratio * width))),
        trackWidth: width
      };
    });
    return {
      width: width,
      height: bars.length * rowHeight,
      rowHeight: rowHeight,
      max: max,
      total: total,
      empty: bars.length === 0,
      bars: bars
    };
  }

  /**
   * The text alternative of the chart (the `<desc>` of the SVG): every technique with its count, simplest
   * first.
   * @param {Object} model  From `chartModel`.
   * @returns {string}
   */
  function chartSummary(model) {
    if (model.empty) return translate('steps.chart.empty');
    const list = model.bars.map(function (bar) {
      return translate('steps.chart.item', { name: bar.label, count: bar.count });
    }).join('; ');
    return translate('steps.chart.summary', { list: list });
  }

  // ---------------------------------------------------------------------------------------------
  // DOM helpers
  // ---------------------------------------------------------------------------------------------

  function build(doc, ns, tag, attrs, children) {
    const el = ns ? doc.createElementNS(ns, tag) : doc.createElement(tag);
    Object.keys(attrs || {}).forEach(function (name) {
      const value = attrs[name];
      if (value === null || value === undefined || value === false) return;
      el.setAttribute(name, value === true ? '' : String(value));
    });
    (children || []).forEach(function (child) { el.appendChild(child); });
    return el;
  }

  function html(doc, tag, attrs, children) {
    return build(doc, null, tag, attrs, children);
  }

  function svg(doc, tag, attrs, children) {
    return build(doc, SVG_NS, tag, attrs, children);
  }

  function setText(node, text) {
    if (node.textContent !== text) node.textContent = text;
  }

  function setAttr(node, name, value) {
    if (node.getAttribute(name) !== value) node.setAttribute(name, value);
  }

  function setHidden(node, hidden) {
    if (hidden) {
      if (!node.hasAttribute('hidden')) node.setAttribute('hidden', '');
    } else if (node.hasAttribute('hidden')) node.removeAttribute('hidden');
  }

  const STATUS_SHAPES = {
    pending: [['circle', { cx: 12, cy: 12, r: 8.5 }]],
    running: [['circle', { cx: 12, cy: 12, r: 8.5, 'stroke-dasharray': '38 16' }]],
    done: [['path', { d: 'M5 12.5l4.5 4.5L19 7.5' }]],
    error: [['path', { d: 'M6 6l12 12M18 6L6 18' }]],
    skipped: [['circle', { cx: 12, cy: 12, r: 8.5, 'stroke-dasharray': '3 3.5' }],
      ['path', { d: 'M8 12h8' }]]
  };

  function statusIcon(doc, status) {
    const shapes = STATUS_SHAPES[status].map(function (shape) {
      return svg(doc, shape[0], shape[1]);
    });
    return svg(doc, 'svg', {
      class: 'step__ic step__ic--' + status,
      viewBox: '0 0 24 24',
      focusable: 'false',
      'aria-hidden': 'true'
    }, shapes);
  }

  function chevronIcon(doc) {
    return svg(doc, 'svg', { class: 'step__chevron', viewBox: '0 0 24 24', focusable: 'false',
      'aria-hidden': 'true' }, [svg(doc, 'path', { d: 'M6 9l6 6 6-6' })]);
  }

  // ---------------------------------------------------------------------------------------------
  // The panel
  // ---------------------------------------------------------------------------------------------

  /**
   * Builds the panel inside `#steps-root`: the summary line (attempt, sample, last notice) before the list,
   * the seven steps in `#steps-list` and the chart in `#steps-chart` (created when they are missing). The DOM
   * is built once and only patched afterwards, so keyboard focus survives every update.
   *
   * @param {Element} rootEl  `#steps-root`.
   * @param {Object} [options]
   * @param {function(string, Object): void} [options.onSelect]  Same as `onSelect()` below.
   * @returns {{
   *   reset: function(): void,
   *   handleEvent: function(Object): void,
   *   setState: function(?Object): void,
   *   getState: function(): Object,
   *   showChart: function(?Object<string, number>): void,
   *   setTimings: function(?Object<string, number>): void,
   *   setActive: function(?string): void,
   *   setExpanded: function(boolean): void,
   *   onSelect: function(function(string, Object): void): function(): void,
   *   refreshLabels: function(): void,
   *   destroy: function(): void
   * }}
   *   `reset()` back to the initial state (details stay as they are);
   *   `handleEvent(ev)` reduces one event and patches the DOM;
   *   `setState(state)` shows a state computed elsewhere (`statusesAt`), e.g. after a seek; null = reset;
   *   `getState()` a copy of the current state;
   *   `showChart(counts)` shows `rating.techniqueCounts` (null goes back to what the events counted; `{}`
   *     shows the "nothing counted" text);
   *   `setTimings(timings)` shows `PuzzleResult.timings` once the generation has finished;
   *   `setActive(stepId)` marks the step the replay is in (`aria-current="step"`); null follows the running
   *     step;
   *   `setExpanded(on)` expands or collapses the stepper of narrow screens (`#steps-root.is-expanded` and
   *     the `aria-expanded` of `#btn-steps-toggle`);
   *   `onSelect(fn)` registers `fn(stepId, info)` for a click, Enter or Space on a step that has started
   *     (`info`: `{status, firstSeq, startSeq, endSeq}`, the trace positions of that step) and returns the
   *     unsubscribe function;
   *   `refreshLabels()` re-translates everything (done by itself on `SG.i18n.onChange`);
   *   `destroy()` removes the listeners and the DOM it built.
   */
  function create(rootEl, options) {
    if (!rootEl || typeof rootEl.querySelector !== 'function') {
      throw new TypeError('SG.stepView.create needs the #steps-root element');
    }
    const opts = options || {};
    const doc = rootEl.ownerDocument;
    const uid = 'sg-steps-' + (++instances);
    const created = [];

    function mount(selector, tag, attrs, before) {
      let node = rootEl.querySelector(selector);
      if (node === null) {
        node = html(doc, tag, attrs);
        (before ? before.parentNode : rootEl).insertBefore(node, before || null);
        created.push(node);
      }
      return node;
    }

    const listEl = mount('#steps-list', 'ol', { id: 'steps-list', class: 'steps-list' });
    const chartEl = mount('#steps-chart', 'div', { id: 'steps-chart', class: 'steps-chart' });
    const summaryEl = mount('.steps-summary', 'div', { class: 'steps-summary', role: 'group', hidden: true },
      listEl);
    listEl.textContent = '';
    summaryEl.textContent = '';

    let state = initialState();
    let view = state;
    let explicitCounts = null;
    let timings = null;
    let activeOverride = null;
    let chartSignature = null;
    let activeShown = null;
    let listeners = [];

    // -- summary --------------------------------------------------------------------------------
    const attemptEl = html(doc, 'span', { class: 'badge badge--accent steps-summary__attempt',
      hidden: true });
    const sampleEl = html(doc, 'span', { class: 'badge steps-summary__sample', hidden: true });
    const missesEl = html(doc, 'span', { class: 'badge badge--warning steps-summary__misses', hidden: true });
    const noteEl = html(doc, 'p', { class: 'steps-summary__note', hidden: true });
    [attemptEl, sampleEl, missesEl, noteEl].forEach(function (node) { summaryEl.appendChild(node); });

    // -- steps ----------------------------------------------------------------------------------
    const parts = {};

    function fact(name) {
      const dt = html(doc, 'dt', { class: 'step__fact-name' });
      const dd = html(doc, 'dd', { class: 'step__fact-value' });
      const row = html(doc, 'div', { class: 'step__fact', 'data-fact': name, hidden: true }, [dt, dd]);
      return { row: row, dt: dt, dd: dd };
    }

    function buildItem(id, index) {
      const detailId = uid + '-detail-' + id;
      const num = html(doc, 'span', { class: 'step__num', 'aria-hidden': 'true' });
      num.textContent = String(index);
      const name = html(doc, 'span', { class: 'step__name' });
      const icon = html(doc, 'span', { class: 'step__icon', 'aria-hidden': 'true' },
        STATUSES.map(function (status) { return statusIcon(doc, status); }));
      const status = html(doc, 'span', { class: 'step__status' });
      const time = html(doc, 'span', { class: 'step__time' });
      const sample = html(doc, 'span', { class: 'step__sample' });
      const meta = html(doc, 'span', { class: 'step__meta' }, [status, time, sample]);
      const main = html(doc, 'button', { type: 'button', class: 'step__main', 'data-step': id,
        disabled: true }, [num, name, icon, meta]);
      const toggle = html(doc, 'button', { type: 'button', class: 'step__toggle', 'aria-expanded': 'false',
        'aria-controls': detailId, 'data-step': id }, [chevronIcon(doc)]);
      const row = html(doc, 'div', { class: 'step__row' }, [main, toggle]);
      const live = html(doc, 'p', { class: 'step__live', hidden: true });
      const progressFact = fact('progress');
      const runsFact = fact('runs');
      const notesFact = fact('notes');
      const notes = html(doc, 'ul', { class: 'step__notes' });
      notesFact.dd.appendChild(notes);
      const empty = html(doc, 'p', { class: 'step__empty' });
      const facts = html(doc, 'dl', { class: 'step__facts' },
        [progressFact.row, runsFact.row, notesFact.row]);
      const detail = html(doc, 'div', { class: 'step__detail', id: detailId, hidden: true }, [facts, empty]);
      const li = html(doc, 'li', { class: 'step', 'data-step': id, 'data-status': 'pending' },
        [row, live, detail]);
      return {
        li: li, main: main, toggle: toggle, name: name, status: status, time: time, sample: sample,
        live: live, detail: detail, progressFact: progressFact, runsFact: runsFact, notesFact: notesFact,
        notes: notes, empty: empty, notesSignature: null
      };
    }

    STEP_IDS.forEach(function (id, i) {
      parts[id] = buildItem(id, i + 1);
      listEl.appendChild(parts[id].li);
    });

    /** The metrics line of a step; '' when the step has nothing to report. */
    function liveText(id, step) {
      const data = SG.explain && typeof SG.explain.get === 'function' ? SG.explain.get(id) : null;
      if (data === null || step.status === 'pending') return '';
      const names = data.liveArgs;
      const reported = names.some(function (name) {
        return Object.prototype.hasOwnProperty.call(step.metrics, name);
      });
      if (names.length > 0 ? !reported : step.status !== 'running') return '';
      const live = data.live(step.metrics);
      return translate(live.key, liveArgs(live.args));
    }

    function renderNotes(p, step) {
      const signature = currentLocale() + JSON.stringify(step.notes);
      if (p.notesSignature === signature) return;
      p.notesSignature = signature;
      p.notes.textContent = '';
      step.notes.forEach(function (note) {
        const item = html(doc, 'li', { class: 'step__note' });
        item.textContent = eventText(note.key, note.args);
        p.notes.appendChild(item);
      });
    }

    function renderStep(id) {
      const p = parts[id];
      const step = view.steps[id];
      const status = step.status;
      const started = status !== 'pending';
      const name = translate('step.' + id + '.name');
      setAttr(p.li, 'data-status', status);
      setText(p.name, name);
      setText(p.status, translate('steps.status.' + status));
      const timed = started && status !== 'skipped';
      setText(p.time, timed ? formatDuration(elapsedMs(view, id)) : '');
      setHidden(p.time, !timed);
      const showSample = status === 'running' && view.sample !== null && SAMPLE_STEPS.indexOf(id) !== -1;
      setText(p.sample, showSample ? translate('steps.sample', view.sample) : '');
      setHidden(p.sample, !showSample);
      const live = liveText(id, step);
      const inline = status === 'running' || status === 'error';
      setText(p.live, inline ? live : '');
      setHidden(p.live, !inline || live === '');
      p.main.disabled = !started;
      p.toggle.disabled = !started && p.detail.hasAttribute('hidden');
      if (started) setAttr(p.main, 'title', translate('steps.select.title'));
      else if (p.main.hasAttribute('title')) p.main.removeAttribute('title');
      setAttr(p.toggle, 'aria-label', translate('steps.detail.toggle', { name: name }));

      setText(p.progressFact.dt, translate('steps.detail.progress'));
      setText(p.progressFact.dd, live);
      setHidden(p.progressFact.row, live === '');
      setText(p.runsFact.dt, translate('steps.detail.runs'));
      setText(p.runsFact.dd, translate('steps.runs', { count: step.runs }));
      setHidden(p.runsFact.row, step.runs === 0);
      setText(p.notesFact.dt, translate('steps.detail.notes'));
      renderNotes(p, step);
      setHidden(p.notesFact.row, step.notes.length === 0);
      setText(p.empty, translate('steps.detail.empty'));
      setHidden(p.empty, started);
    }

    function activeId() {
      return activeOverride !== null ? activeOverride : view.current;
    }

    function renderActive() {
      const id = activeId();
      STEP_IDS.forEach(function (stepId) {
        const on = stepId === id;
        const main = parts[stepId].main;
        parts[stepId].li.classList.toggle('is-active', on);
        if (on) setAttr(main, 'aria-current', 'step');
        else if (main.hasAttribute('aria-current')) main.removeAttribute('aria-current');
      });
      if (id !== activeShown && id !== null && parts[id]) scrollToStep(parts[id].li);
      activeShown = id;
    }

    // The strip of narrow layouts scrolls sideways: keep the step that is running in view.
    function scrollToStep(li) {
      if (listEl.scrollWidth <= listEl.clientWidth) return;
      const box = li.getBoundingClientRect();
      const frame = listEl.getBoundingClientRect();
      if (box.left < frame.left || box.right > frame.right) {
        listEl.scrollLeft += box.left - frame.left - 8;
      }
    }

    function renderSummary() {
      const attempt = view.attempt;
      setText(attemptEl, attempt ? translate('steps.attempt', attempt) : '');
      setHidden(attemptEl, !attempt);
      const sample = view.sample;
      setText(sampleEl, sample ? translate('steps.sample', sample) : '');
      setHidden(sampleEl, !sample);
      setText(missesEl, view.misses > 0 ? translate('steps.missed', { count: view.misses }) : '');
      setHidden(missesEl, view.misses === 0);

      let kind = '';
      let text = '';
      if (view.error !== null) {
        kind = 'error';
        text = translate('steps.note.error', { message: eventText(view.error.key, view.error.args) });
      } else if (view.finished && view.result !== null) {
        kind = view.result.exact === false ? 'warning' : 'done';
        text = eventText('done', view.result);
      } else if (view.lastRetry !== null) {
        kind = 'retry';
        text = eventText('retry.difficulty', view.lastRetry);
      }
      setText(noteEl, text);
      setAttr(noteEl, 'data-kind', kind);
      setHidden(noteEl, text === '');
      setHidden(summaryEl, !attempt && !sample && view.misses === 0 && text === '');
      setAttr(summaryEl, 'aria-label', translate('steps.summary.label'));
    }

    // -- chart ----------------------------------------------------------------------------------
    function currentCounts() {
      if (explicitCounts !== null) return explicitCounts;
      return Object.keys(view.techniqueCounts).length > 0 ? view.techniqueCounts : null;
    }

    function renderChart() {
      const counts = currentCounts();
      const signature = counts === null ? '' : currentLocale() + JSON.stringify(counts);
      if (signature === chartSignature) return;
      chartSignature = signature;
      chartEl.textContent = '';
      chartEl.removeAttribute('role');
      chartEl.removeAttribute('aria-labelledby');
      if (counts === null) return;

      const model = chartModel(counts, { width: CHART_WIDTH });
      const titleId = uid + '-chart-title';
      const title = html(doc, 'h3', { class: 'panel__subtitle steps-chart__title', id: titleId });
      title.textContent = translate('steps.chart.title');
      chartEl.setAttribute('role', 'group');
      chartEl.setAttribute('aria-labelledby', titleId);
      chartEl.appendChild(title);
      if (model.empty) {
        const empty = html(doc, 'p', { class: 'steps-chart__empty' });
        empty.textContent = translate('steps.chart.empty');
        chartEl.appendChild(empty);
        return;
      }

      const svgTitle = svg(doc, 'title', { id: uid + '-chart-svg-title' });
      svgTitle.textContent = translate('steps.chart.title');
      const svgDesc = svg(doc, 'desc', { id: uid + '-chart-svg-desc' });
      svgDesc.textContent = chartSummary(model);
      const rows = model.bars.map(function (bar) {
        const tip = svg(doc, 'title');
        tip.textContent = translate('steps.chart.bar', { name: bar.label, count: bar.count });
        const label = svg(doc, 'text', { class: 'steps-chart__label', x: 0, y: bar.labelY });
        label.textContent = bar.label;
        const value = svg(doc, 'text', { class: 'steps-chart__value', x: bar.valueX, y: bar.labelY,
          'text-anchor': 'end' });
        value.textContent = String(bar.count);
        return svg(doc, 'g', { class: 'steps-chart__row', 'data-technique': bar.id }, [
          tip,
          label,
          value,
          svg(doc, 'rect', { class: 'steps-chart__track', x: 0, y: bar.barY, width: bar.trackWidth,
            height: bar.barHeight, rx: 2 }),
          svg(doc, 'rect', { class: 'steps-chart__bar', x: 0, y: bar.barY, width: bar.barWidth,
            height: bar.barHeight, rx: 2 })
        ]);
      });
      chartEl.appendChild(svg(doc, 'svg', {
        class: 'steps-chart__svg',
        viewBox: '0 0 ' + model.width + ' ' + model.height,
        role: 'img',
        focusable: 'false',
        'aria-labelledby': uid + '-chart-svg-title ' + uid + '-chart-svg-desc'
      }, [svgTitle, svgDesc].concat(rows)));
    }

    // -- rendering ------------------------------------------------------------------------------
    function refreshView() {
      view = timings !== null && state.finished ? applyTimings(state, timings) : state;
    }

    function renderAll() {
      refreshView();
      STEP_IDS.forEach(renderStep);
      renderSummary();
      renderChart();
      renderActive();
    }

    function select(id) {
      const step = state.steps[id];
      if (!step || step.status === 'pending') return;
      const info = { status: step.status, firstSeq: step.firstSeq, startSeq: step.startSeq,
        endSeq: step.endSeq };
      listeners.slice().forEach(function (fn) {
        try {
          fn(id, info);
        } catch (err) {
          if (typeof console !== 'undefined' && typeof console.error === 'function') console.error(err);
        }
      });
    }

    function toggleDetail(id) {
      const p = parts[id];
      const open = p.detail.hasAttribute('hidden');
      setHidden(p.detail, !open);
      p.toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      p.li.classList.toggle('is-open', open);
    }

    function onClick(ev) {
      const target = ev.target;
      const button = target && typeof target.closest === 'function' ? target.closest('button') : null;
      if (button === null || !listEl.contains(button)) return;
      const id = button.getAttribute('data-step');
      if (STEP_IDS.indexOf(id) === -1) return;
      if (button.classList.contains('step__toggle')) toggleDetail(id);
      else select(id);
    }
    listEl.addEventListener('click', onClick);

    const unsubscribeLocale = SG.i18n && typeof SG.i18n.onChange === 'function'
      ? SG.i18n.onChange(function () { refreshLabels(); }) : null;

    function refreshLabels() {
      STEP_IDS.forEach(function (id) { parts[id].notesSignature = null; });
      chartSignature = null;
      renderAll();
    }

    function handleEvent(ev) {
      apply(state, ev);
      refreshView();
      if (ev && ev.type === 'step' && ev.phase === 'start') {
        STEP_IDS.forEach(renderStep);
      } else if (ev && STEP_IDS.indexOf(ev.stepId) !== -1) {
        renderStep(ev.stepId);
      } else {
        STEP_IDS.forEach(renderStep);
      }
      renderSummary();
      if (ev && (ev.stepId === 'rate' || ev.stepId === 'fullGrid')) renderChart();
      renderActive();
    }

    listeners = opts.onSelect ? [opts.onSelect] : [];
    renderAll();

    return {
      reset: function reset() {
        state = initialState();
        explicitCounts = null;
        timings = null;
        activeOverride = null;
        renderAll();
      },
      handleEvent: handleEvent,
      setState: function setState(next) {
        state = next ? cloneState(next) : initialState();
        renderAll();
      },
      getState: function getState() {
        return cloneState(state);
      },
      showChart: function showChart(counts) {
        explicitCounts = counts ? Object.assign({}, counts) : null;
        renderChart();
      },
      setTimings: function setTimings(next) {
        timings = next ? Object.assign({}, next) : null;
        renderAll();
      },
      setActive: function setActive(stepId) {
        activeOverride = STEP_IDS.indexOf(stepId) === -1 ? null : stepId;
        renderActive();
      },
      setExpanded: function setExpanded(on) {
        const flag = on !== false;
        rootEl.classList.toggle('is-expanded', flag);
        const button = rootEl.querySelector('#btn-steps-toggle');
        if (button) button.setAttribute('aria-expanded', flag ? 'true' : 'false');
      },
      onSelect: function onSelect(fn) {
        if (typeof fn !== 'function') throw new TypeError('onSelect needs a function');
        listeners.push(fn);
        return function unsubscribe() {
          listeners = listeners.filter(function (other) { return other !== fn; });
        };
      },
      refreshLabels: refreshLabels,
      destroy: function destroy() {
        if (unsubscribeLocale !== null) unsubscribeLocale();
        listEl.removeEventListener('click', onClick);
        listeners = [];
        listEl.textContent = '';
        chartEl.textContent = '';
        summaryEl.textContent = '';
        created.forEach(function (node) {
          if (node.parentNode) node.parentNode.removeChild(node);
        });
      }
    };
  }

  SG.stepView = {
    STEP_IDS: STEP_IDS,
    STATUSES: STATUSES,
    initialState: initialState,
    reduce: reduce,
    statusesAt: statusesAt,
    statuses: statuses,
    elapsedMs: elapsedMs,
    applyTimings: applyTimings,
    chartModel: chartModel,
    chartSummary: chartSummary,
    create: create
  };

  // ---------------------------------------------------------------------------------------------
  // Locale fragment
  // ---------------------------------------------------------------------------------------------

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'steps.status.pending': 'Pending',
      'steps.status.running': 'Running',
      'steps.status.done': 'Done',
      'steps.status.error': 'Error',
      'steps.status.skipped': 'Skipped',

      'steps.summary.label': 'Generation progress',
      'steps.attempt': 'Attempt {n}/{max}',
      'steps.sample': 'Sample {n}/{max}',
      'steps.missed_one': '{count} sample missed the level',
      'steps.missed_other': '{count} samples missed the level',
      'steps.note.error': 'Error: {message}',

      'steps.select.title': 'Go to this step in the replay',
      'steps.detail.toggle': 'Details: {name}',
      'steps.detail.progress': 'Progress',
      'steps.detail.runs': 'Runs',
      'steps.detail.notes': 'Messages',
      'steps.detail.empty': 'Nothing has happened in this step yet.',
      'steps.runs_one': 'Ran {count} time',
      'steps.runs_other': 'Ran {count} times',

      'steps.chart.title': 'Techniques used',
      'steps.chart.empty': 'No solving techniques have been counted yet.',
      'steps.chart.summary': 'Bar chart of how many times each solving technique was needed, simplest ' +
        'first: {list}.',
      'steps.chart.item': '{name}: {count}',
      'steps.chart.bar_one': '{name}: needed {count} time',
      'steps.chart.bar_other': '{name}: needed {count} times'
    },
    vi: {
      'steps.status.pending': 'Đang chờ',
      'steps.status.running': 'Đang chạy',
      'steps.status.done': 'Xong',
      'steps.status.error': 'Lỗi',
      'steps.status.skipped': 'Bỏ qua',

      'steps.summary.label': 'Tiến trình tạo đề',
      'steps.attempt': 'Lần thử {n}/{max}',
      'steps.sample': 'Mẫu {n}/{max}',
      'steps.missed_one': '{count} mẫu chưa đạt mức yêu cầu',
      'steps.missed_other': '{count} mẫu chưa đạt mức yêu cầu',
      'steps.note.error': 'Lỗi: {message}',

      'steps.select.title': 'Chuyển đến bước này trong phần phát lại',
      'steps.detail.toggle': 'Chi tiết: {name}',
      'steps.detail.progress': 'Tiến độ',
      'steps.detail.runs': 'Số lần chạy',
      'steps.detail.notes': 'Thông báo',
      'steps.detail.empty': 'Bước này chưa có gì để hiển thị.',
      'steps.runs_one': 'Đã chạy {count} lần',
      'steps.runs_other': 'Đã chạy {count} lần',

      'steps.chart.title': 'Kỹ thuật đã dùng',
      'steps.chart.empty': 'Chưa ghi nhận kỹ thuật giải nào.',
      'steps.chart.summary': 'Biểu đồ cột số lần cần dùng mỗi kỹ thuật giải, từ dễ đến khó: {list}.',
      'steps.chart.item': '{name}: {count}',
      'steps.chart.bar_one': '{name}: cần dùng {count} lần',
      'steps.chart.bar_other': '{name}: cần dùng {count} lần'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
