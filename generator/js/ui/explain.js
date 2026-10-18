/**
 * Explanation card (task T-4.5; design.md section 7.4): for the phase of the replay step on show (full
 * solution, extra structure, dig), the three fixed parts What / Why / How, the pseudocode of the phase with
 * the line that the step corresponds to highlighted, and a status line with the running dig counters. The
 * data comes from `SG.explain` (js/core/explain-data.js, keys only); the texts are in the locale packs. This
 * file exports `SG.explainCard` (NOT `SG.explain`).
 *
 * Pure part (runs in Node): `viewModel(stepId, ctx)` resolves everything the card shows, in the current
 * language. DOM part: `create(rootEl, options)` renders a view model into an element and re-renders it when
 * the language changes, keeping the step, the line and the metrics. The Help dialog (js/ui/help.js, tab "How
 * it works") makes one compact card per step; the one of the replay step on show gets the highlighted line
 * and the dig counters (`SG.app.getExplainContext()`).
 *
 * How the host drives it: for the replay step on show call
 * `card.show(step.phase, { lineLabel: step.line, metrics: step.metrics })`; without metrics (the full
 * solution, the extra structure) the status line is hidden. `eventKey` still picks a line from an event key
 * (`SG.explain.lineFor`) for callers that have events.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.explainCard && typeof SG.explainCard.create === 'function') return;

  /** The classes of the code listing never indent deeper than this (the data stays within 2). */
  const MAX_INDENT = 6;

  function translate(key, args) {
    if (SG.i18n && typeof SG.i18n.t === 'function') return SG.i18n.t(key, args);
    return key;
  }

  /** Numbers of the status line, formatted for the language (at most one decimal). */
  function formatArgs(args) {
    const out = {};
    Object.keys(args).forEach(function (name) {
      const value = args[name];
      if (typeof value !== 'number') out[name] = value;
      else if (SG.i18n && typeof SG.i18n.formatNumber === 'function') {
        out[name] = SG.i18n.formatNumber(value, { maximumFractionDigits: 1 });
      } else out[name] = String(Math.round(value * 10) / 10);
    });
    return out;
  }

  /**
   * Everything the card shows for a step, in the current language.
   * @param {string} stepId  One of the seven step ids.
   * @param {Object} [ctx]
   * @param {Object} [ctx.metrics]  Numbers for the status line (`event.metrics`); missing ones read as 0.
   *        Without metrics there is no status line (`live` is null).
   * @param {string} [ctx.eventKey]  `i18nKey` of the event being replayed; picks the highlighted line.
   * @param {?string} [ctx.lineLabel]  The line to highlight, overriding `eventKey` (null = none).
   * @returns {?{stepId: string, index: number, total: number, titleKey: string, title: string,
   *   keys: {what: string, why: string, how: string}, what: string, why: string, how: string,
   *   lines: Array<{label: string, indent: number, key: string, text: string, active: boolean}>,
   *   activeLabel: ?string, live: ?{key: string, args: Object, text: string}}}
   *   `null` for an unknown step id. `activeLabel` is the label of the highlighted line (null when none).
   */
  function viewModel(stepId, ctx) {
    const data = SG.explain && typeof SG.explain.get === 'function' ? SG.explain.get(stepId) : null;
    if (data === null) return null;
    const c = ctx || {};
    let label = null;
    if (c.lineLabel !== undefined) label = c.lineLabel;
    else if (typeof c.eventKey === 'string') label = SG.explain.lineFor(stepId, c.eventKey);
    let activeLabel = null;
    const lines = data.pseudocode.map(function (line) {
      const active = label !== null && line.label === label;
      if (active) activeLabel = line.label;
      return { label: line.label, indent: line.indent, key: line.key, text: translate(line.key),
        active: active };
    });
    const live = c.metrics ? data.live(c.metrics) : null;
    return {
      stepId: stepId,
      index: data.index,
      total: SG.explain.STEP_IDS.length,
      titleKey: data.name,
      title: translate(data.name),
      keys: { what: data.what, why: data.why, how: data.how },
      what: translate(data.what),
      why: translate(data.why),
      how: translate(data.how),
      lines: lines,
      activeLabel: activeLabel,
      live: live === null ? null
        : { key: live.key, args: live.args, text: translate(live.key, formatArgs(live.args)) }
    };
  }

  // ---------------------------------------------------------------------------------------------
  // DOM
  // ---------------------------------------------------------------------------------------------

  function html(doc, tag, attrs, children) {
    const el = doc.createElement(tag);
    Object.keys(attrs || {}).forEach(function (name) {
      const value = attrs[name];
      if (value === null || value === undefined || value === false) return;
      el.setAttribute(name, value === true ? '' : String(value));
    });
    (children || []).forEach(function (child) { el.appendChild(child); });
    return el;
  }

  function withText(el, text) {
    el.textContent = text;
    return el;
  }

  function setText(node, text) {
    if (node.textContent !== text) node.textContent = text;
  }

  /**
   * Renders the card into `rootEl`. It owns the content of that element.
   * @param {Element} rootEl  The element that holds the card (a step of the Help dialog).
   * @param {{compact?: boolean}} [options]  `compact`: no kicker and no title (the host has its own heading).
   * @returns {{
   *   show: function(string, Object=): void,
   *   setLine: function(?string): void,
   *   setMetrics: function(?Object): void,
   *   clear: function(): void,
   *   getStepId: function(): ?string,
   *   refresh: function(): void,
   *   destroy: function(): void
   * }}
   *   `show(stepId, ctx)` shows a step with the context of `viewModel` (`metrics`, `eventKey`, `lineLabel`);
   *   `setLine(label)` highlights one pseudocode line (null: none) without touching the rest;
   *   `setMetrics(metrics)` updates only the status line;
   *   `clear()` goes back to the "start a generation" text;
   *   `getStepId()` the step on show (null when cleared);
   *   `refresh()` re-translates and redraws (done by itself on `SG.i18n.onChange`);
   *   `destroy()` removes the listener and the card.
   */
  function create(rootEl, options) {
    if (!rootEl || typeof rootEl.appendChild !== 'function') {
      throw new TypeError('SG.explainCard.create needs the element to render into');
    }
    const compact = !!(options && options.compact);
    const doc = rootEl.ownerDocument;
    let stepId = null;
    let metrics = null;
    let eventKey = null;
    let lineLabel;
    let card = null;
    let shownStep = null;

    function context() {
      return { metrics: metrics, eventKey: eventKey === null ? undefined : eventKey, lineLabel: lineLabel };
    }

    function buildCard(vm) {
      const kicker = html(doc, 'p', { class: 'explain-card__kicker' });
      const title = html(doc, 'h4', { class: 'explain-card__title' });
      const liveLabel = html(doc, 'span', { class: 'explain-card__live-label' });
      const liveText = html(doc, 'span', { class: 'explain-card__live-text' });
      const live = html(doc, 'p', { class: 'explain-card__live' }, [liveLabel, liveText]);

      const parts = ['what', 'why', 'how'].map(function (name) {
        const dt = html(doc, 'dt', { class: 'explain-card__label' });
        const dd = html(doc, 'dd', { class: 'explain-card__text' });
        return { name: name, dt: dt, dd: dd,
          row: html(doc, 'div', { class: 'explain-card__part', 'data-part': name }, [dt, dd]) };
      });
      const dl = html(doc, 'dl', { class: 'explain-card__parts' }, parts.map(function (p) { return p.row; }));

      const codeTitle = html(doc, 'h5', { class: 'explain-card__subtitle' });
      const lineEls = vm.lines.map(function (line) {
        const text = html(doc, 'code', { class: 'explain-code__text' });
        const marker = html(doc, 'span', { class: 'visually-hidden', hidden: true });
        const li = html(doc, 'li', { class: 'explain-code__line', 'data-line': line.label }, [text, marker]);
        li.style.setProperty('--indent', String(Math.min(line.indent, MAX_INDENT)));
        return { li: li, text: text, marker: marker };
      });
      const list = html(doc, 'ol', { class: 'explain-code', role: 'list' },
        lineEls.map(function (l) { return l.li; }));
      const code = html(doc, 'section', { class: 'explain-card__code' }, [codeTitle, list]);

      const el = html(doc, 'article', {
        class: 'card card--flat explain-card' + (compact ? ' explain-card--compact' : ''),
        'data-step': vm.stepId
      }, compact ? [live, dl, code] : [kicker, title, live, dl, code]);
      return { el: el, kicker: kicker, title: title, live: live, liveLabel: liveLabel, liveText: liveText,
        parts: parts, codeTitle: codeTitle, list: list, lines: lineEls };
    }

    function fill(vm) {
      setText(card.kicker, translate('explainCard.kicker'));
      setText(card.title, vm.title);
      card.live.hidden = vm.live === null;
      setText(card.liveLabel, translate('explainCard.live'));
      setText(card.liveText, vm.live === null ? '' : vm.live.text);
      card.parts.forEach(function (p) {
        setText(p.dt, translate('explainCard.' + p.name));
        setText(p.dd, vm[p.name]);
      });
      setText(card.codeTitle, translate('explainCard.code'));
      card.list.setAttribute('aria-label', translate('explainCard.code.label', { name: vm.title }));
      vm.lines.forEach(function (line, i) {
        const l = card.lines[i];
        setText(l.text, line.text);
        l.li.classList.toggle('is-active', line.active);
        if (line.active) l.li.setAttribute('aria-current', 'true');
        else l.li.removeAttribute('aria-current');
        setText(l.marker, line.active ? translate('explainCard.line.active') : '');
        if (line.active) l.marker.removeAttribute('hidden');
        else l.marker.setAttribute('hidden', '');
      });
    }

    function render() {
      const vm = stepId === null ? null : viewModel(stepId, context());
      if (vm === null) {
        card = null;
        shownStep = null;
        rootEl.textContent = '';
        rootEl.appendChild(withText(html(doc, 'p', { class: 'explain-card__empty' }),
          translate('explainCard.empty')));
        return;
      }
      if (card === null || shownStep !== stepId) {
        card = buildCard(vm);
        shownStep = stepId;
        rootEl.textContent = '';
        rootEl.appendChild(card.el);
      }
      fill(vm);
    }

    const unsubscribe = SG.i18n && typeof SG.i18n.onChange === 'function'
      ? SG.i18n.onChange(function () { render(); }) : null;
    render();

    return {
      show: function show(id, ctx) {
        const c = ctx || {};
        stepId = SG.explain && SG.explain.get(id) ? id : null;
        metrics = c.metrics || null;
        eventKey = typeof c.eventKey === 'string' ? c.eventKey : null;
        lineLabel = c.lineLabel;
        render();
      },
      setLine: function setLine(label) {
        lineLabel = typeof label === 'string' ? label : null;
        if (stepId !== null) render();
      },
      setMetrics: function setMetrics(next) {
        metrics = next || null;
        if (stepId !== null) render();
      },
      clear: function clear() {
        stepId = null;
        metrics = null;
        eventKey = null;
        lineLabel = undefined;
        render();
      },
      getStepId: function getStepId() {
        return stepId;
      },
      refresh: render,
      destroy: function destroy() {
        if (unsubscribe !== null) unsubscribe();
        rootEl.textContent = '';
        card = null;
      }
    };
  }

  SG.explainCard = {
    viewModel: viewModel,
    create: create
  };

  // ---------------------------------------------------------------------------------------------
  // Locale fragment
  // ---------------------------------------------------------------------------------------------

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'explainCard.kicker': 'How it works',
      'explainCard.what': 'What',
      'explainCard.why': 'Why',
      'explainCard.how': 'How',
      'explainCard.live': 'Now',
      'explainCard.code': 'Pseudocode',
      'explainCard.code.label': 'Pseudocode of the step "{name}"',
      'explainCard.line.active': '(running line)',
      'explainCard.empty': 'Start a generation to see how each step works.'
    },
    vi: {
      'explainCard.kicker': 'Cách hoạt động',
      'explainCard.what': 'Làm gì',
      'explainCard.why': 'Tại sao',
      'explainCard.how': 'Bằng cách nào',
      'explainCard.live': 'Hiện tại',
      'explainCard.code': 'Mã giả',
      'explainCard.code.label': 'Mã giả của bước "{name}"',
      'explainCard.line.active': '(dòng đang chạy)',
      'explainCard.empty': 'Hãy bắt đầu tạo đề để xem từng bước hoạt động thế nào.'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
