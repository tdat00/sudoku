/**
 * Steps panel (task T-4.5, reworked; design.md sections 7.3 and 10.5): the list of the replay steps of the
 * puzzle on show. Each step is a change the board shows (the full solution, the cages or signs, a batch of
 * removals, a "hardest removal" round, the finished puzzle; see `SG.player.buildSteps`); technical work is
 * not listed. A click (or Enter / Space) on a step moves the replay there; the current step is marked
 * (`aria-current="step"`) and shows its full sentence; a small legend explains the frames of the board.
 *
 * Pure part (runs in Node): `chartModel(counts, options)`, the geometry of the technique-frequency bar chart
 * that the result panel draws, and `STEP_IDS`, the seven pipeline steps (for other modules' texts).
 * DOM part: `create(rootEl, options)` renders the list into `#steps-list` of `#steps-root`.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.stepView && typeof SG.stepView.create === 'function') return;

  /** The seven pipeline steps in order (the same list as `SG.events.STEP_IDS`). */
  const STEP_IDS = Object.freeze(['configure', 'buildModel', 'fullGrid', 'extraStructure', 'dig', 'rate',
    'tune']);

  /** Default geometry of the chart, in SVG units. */
  const CHART_WIDTH = 300;
  const CHART_ROW = 32;
  const CHART_BAR = 8;
  const CHART_LABEL_Y = 13;
  const CHART_BAR_Y = 19;
  const CHART_MIN_BAR = 3;

  /** The legend entries: a frame of a step's `marks` (or a sign mark of `signs`) -> translation key. */
  const LEGEND = Object.freeze([['dug', 'steps.legend.dug'], ['kept', 'steps.legend.kept'],
    ['revealed', 'steps.legend.revealed'], ['signRemoved', 'steps.legend.signRemoved'],
    ['signKept', 'steps.legend.signKept']]);

  /** Whether a step uses a legend entry. */
  function usesMark(step, name) {
    if (name === 'signRemoved') return !!(step.signs && step.signs.removed.length > 0);
    if (name === 'signKept') return !!(step.signs && step.signs.kept.length > 0);
    return !!(step.marks && step.marks[name] && step.marks[name].length > 0);
  }

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

  // ---------------------------------------------------------------------------------------------
  // Chart model (used by the result panel)
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

  // ---------------------------------------------------------------------------------------------
  // DOM helpers
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

  function setText(node, text) {
    if (node.textContent !== text) node.textContent = text;
  }

  /** Scrolls `container` (never the page) so that `item` is inside it. */
  function keepVisible(container, item) {
    if (!container || typeof item.getBoundingClientRect !== 'function' ||
        typeof container.getBoundingClientRect !== 'function') {
      return;
    }
    const c = container.getBoundingClientRect();
    const r = item.getBoundingClientRect();
    if (container.scrollHeight > container.clientHeight + 1) {
      if (r.top < c.top) container.scrollTop -= c.top - r.top;
      else if (r.bottom > c.bottom) container.scrollTop += Math.min(r.bottom - c.bottom, r.top - c.top);
    }
    if (container.scrollWidth > container.clientWidth + 1) {
      if (r.left < c.left) container.scrollLeft -= c.left - r.left;
      else if (r.right > c.right) container.scrollLeft += Math.min(r.right - c.right, r.left - c.left);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // The panel
  // ---------------------------------------------------------------------------------------------

  /**
   * Builds the list of the replay steps inside `#steps-root` (`#steps-list`, created when missing) and a
   * legend of the board frames after it.
   *
   * @param {Element} rootEl  `#steps-root`.
   * @param {Object} [options]
   * @param {function(number): void} [options.onSelect]  Called with the position of a step that was picked.
   * @returns {{
   *   setSteps: function(Object[]): void,
   *   setPosition: function(number): void,
   *   clear: function(): void,
   *   getPosition: function(): number,
   *   setExpanded: function(boolean): void,
   *   refresh: function(): void,
   *   destroy: function(): void
   * }}
   *   `setSteps(steps)` shows the steps of `SG.player` (nothing is current until `setPosition`);
   *   `setPosition(p)` marks step p (0: none) and keeps it in view inside the panel (the page never
   *     scrolls);
   *   `clear()` empties the list (nothing on show);
   *   `setExpanded(on)` expands or collapses the stepper of narrow screens (`#steps-root.is-expanded` and
   *     the `aria-expanded` of `#btn-steps-toggle`);
   *   `refresh()` re-translates everything (done by itself on `SG.i18n.onChange`);
   *   `destroy()` removes the listeners and what it built.
   */
  function create(rootEl, options) {
    if (!rootEl || typeof rootEl.querySelector !== 'function') {
      throw new TypeError('SG.stepView.create needs the #steps-root element');
    }
    const opts = options || {};
    const doc = rootEl.ownerDocument;
    const created = [];

    let listEl = rootEl.querySelector('#steps-list');
    if (listEl === null) {
      listEl = html(doc, 'ol', { id: 'steps-list', class: 'steps-list' });
      rootEl.appendChild(listEl);
      created.push(listEl);
    }
    const legendEl = html(doc, 'ul', { class: 'steps-legend', hidden: true });
    listEl.parentNode.insertBefore(legendEl, listEl.nextSibling);
    created.push(legendEl);
    listEl.textContent = '';

    let steps = [];
    let items = [];
    let position = 0;

    function player() {
      return SG.player || null;
    }

    function titleOf(step) {
      const p = player();
      return p ? p.stepTitle(step) : step.kind;
    }

    function metaOf(step) {
      const p = player();
      return p ? p.stepMeta(step) : '';
    }

    function textOf(step) {
      const p = player();
      return p ? p.describeStep(step) : '';
    }

    function buildItem(step) {
      const num = html(doc, 'span', { class: 'rstep__num' });
      const title = html(doc, 'span', { class: 'rstep__title' });
      const meta = html(doc, 'span', { class: 'rstep__meta' });
      const main = html(doc, 'button', { type: 'button', class: 'rstep__main', 'data-position': step.index },
        [num, html(doc, 'span', { class: 'rstep__body' }, [title, meta])]);
      const text = html(doc, 'p', { class: 'rstep__text', hidden: true });
      const li = html(doc, 'li', { class: 'rstep', 'data-kind': step.kind, 'data-position': step.index },
        [main, text]);
      return { step: step, li: li, main: main, num: num, title: title, meta: meta, text: text };
    }

    function fillItem(item) {
      setText(item.num, String(item.step.index));
      setText(item.title, titleOf(item.step));
      setText(item.meta, metaOf(item.step));
      item.main.setAttribute('title', translate('steps.select.title'));
      if (!item.text.hidden) setText(item.text, textOf(item.step));
    }

    function renderLegend() {
      legendEl.textContent = '';
      LEGEND.forEach(function (entry) {
        if (!steps.some(function (s) { return usesMark(s, entry[0]); })) return;
        legendEl.appendChild(html(doc, 'li', { class: 'steps-legend__item', 'data-mark': entry[0] }, [
          html(doc, 'span', { class: 'steps-legend__swatch steps-legend__swatch--' + entry[0],
            'aria-hidden': 'true' }),
          html(doc, 'span', {}, [doc.createTextNode(translate(entry[1]))])
        ]));
      });
      legendEl.hidden = legendEl.firstChild === null;
      legendEl.setAttribute('aria-label', translate('steps.legend.label'));
    }

    function markCurrent(scroll) {
      items.forEach(function (item) {
        const current = item.step.index === position;
        item.li.classList.toggle('is-current', current);
        if (current) item.main.setAttribute('aria-current', 'step');
        else item.main.removeAttribute('aria-current');
        if (current) {
          setText(item.text, textOf(item.step));
          item.text.hidden = false;
        } else if (!item.text.hidden) {
          item.text.hidden = true;
        }
      });
      const item = items[position - 1];
      if (scroll && item) {
        keepVisible(listEl, item.li);
        keepVisible(rootEl, item.li);
      } else if (scroll && position === 0) {
        listEl.scrollTop = 0;
        listEl.scrollLeft = 0;
      }
    }

    function render() {
      listEl.textContent = '';
      items = steps.map(buildItem);
      items.forEach(function (item) {
        fillItem(item);
        listEl.appendChild(item.li);
      });
      renderLegend();
      markCurrent(false);
    }

    function onClick(event) {
      const target = event.target && typeof event.target.closest === 'function'
        ? event.target.closest('[data-position]') : null;
      if (!target || !listEl.contains(target)) return;
      const p = Number(target.getAttribute('data-position'));
      if (Number.isInteger(p) && typeof opts.onSelect === 'function') opts.onSelect(p);
    }

    function refresh() {
      items.forEach(fillItem);
      renderLegend();
      markCurrent(false);
    }

    listEl.addEventListener('click', onClick);
    const unsubscribeLocale = SG.i18n && typeof SG.i18n.onChange === 'function'
      ? SG.i18n.onChange(refresh) : null;

    return {
      setSteps: function setSteps(next) {
        steps = Array.isArray(next) ? next.slice() : [];
        position = 0;
        render();
      },
      setPosition: function setPosition(p) {
        const next = Number.isInteger(p) && p >= 0 && p <= steps.length ? p : 0;
        if (next === position) return;
        position = next;
        markCurrent(true);
      },
      clear: function clear() {
        steps = [];
        position = 0;
        render();
      },
      getPosition: function getPosition() {
        return position;
      },
      setExpanded: function setExpanded(on) {
        const flag = on !== false;
        rootEl.classList.toggle('is-expanded', flag);
        const button = rootEl.querySelector('#btn-steps-toggle');
        if (button) button.setAttribute('aria-expanded', flag ? 'true' : 'false');
      },
      refresh: refresh,
      destroy: function destroy() {
        if (unsubscribeLocale !== null) unsubscribeLocale();
        listEl.removeEventListener('click', onClick);
        listEl.textContent = '';
        created.forEach(function (node) {
          if (node.parentNode) node.parentNode.removeChild(node);
        });
        steps = [];
        items = [];
      }
    };
  }

  SG.stepView = {
    STEP_IDS: STEP_IDS,
    chartModel: chartModel,
    create: create
  };

  // ---------------------------------------------------------------------------------------------
  // Locale fragment
  // ---------------------------------------------------------------------------------------------

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'steps.select.title': 'Show this step on the board',
      'steps.legend.label': 'Frames on the board',
      'steps.legend.dug': 'Removed in this step',
      'steps.legend.kept': 'Tried, but put back',
      'steps.legend.revealed': 'Clue shown in this step',
      'steps.legend.signRemoved': 'Sign taken away in this step',
      'steps.legend.signKept': 'Sign tried, but kept'
    },
    vi: {
      'steps.select.title': 'Hiện bước này trên bảng',
      'steps.legend.label': 'Các khung trên bảng',
      'steps.legend.dug': 'Bị xóa ở bước này',
      'steps.legend.kept': 'Đã thử nhưng trả lại',
      'steps.legend.revealed': 'Số cho sẵn được hiện ở bước này',
      'steps.legend.signRemoved': 'Dấu bị bỏ ở bước này',
      'steps.legend.signKept': 'Dấu đã thử nhưng giữ lại'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
