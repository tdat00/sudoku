/**
 * Steps panel: the description of the replay step on show. Each step is a change the board shows (full solution,
 * cages or signs, a batch of removals, a "hardest removal" round, the finished puzzle; see `SG.player.buildSteps`);
 * technical work is not listed. The replay controls under the board move through the steps; the panel shows the
 * number, title, summary and sentence of the current step and a legend of the board frames.
 * Pure: `chartModel(counts, options)` (technique-frequency bar chart geometry, kept for callers) and `STEP_IDS`.
 * DOM: `create(rootEl)` renders into `#step-detail` of `#steps-root`.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.stepView && typeof SG.stepView.create === 'function') return;

  // Same list as `SG.events.STEP_IDS`.
  const STEP_IDS = Object.freeze(['configure', 'buildModel', 'fullGrid', 'extraStructure', 'dig', 'rate',
    'tune']);

  const CHART_WIDTH = 300;
  const CHART_ROW = 32;
  const CHART_BAR = 8;
  const CHART_LABEL_Y = 13;
  const CHART_BAR_Y = 19;
  const CHART_MIN_BAR = 3;

  /** [frame of a step's `marks` (or sign mark of `signs`), translation key] */
  const LEGEND = Object.freeze([['dug', 'steps.legend.dug'], ['kept', 'steps.legend.kept'],
    ['revealed', 'steps.legend.revealed'], ['signRemoved', 'steps.legend.signRemoved'],
    ['signKept', 'steps.legend.signKept']]);

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

  // Tokens of a formula (`scoreTip`): a string is plain text, { v } a variable (italic), { b } a result (bold),
  // { sub: [tokens] } a subscript, { frac: [[tokens], [tokens]] } a fraction.
  function V(x) { return { v: x }; }
  function B(x) { return { b: x }; }
  function SUB() { return { sub: Array.prototype.slice.call(arguments) }; }
  function FRAC(top, bottom) { return { frac: [top, bottom] }; }

  /**
   * The model of a score tooltip: how a whole number of the Difficulty Score table comes from the exact numbers of
   * `SG.difficulty.scoreTable`, as formulas with the real values:
   * { lines: [{ label, math: [tokens], then: [tokens] }], notes: [text] } (`then` is the same formula with the
   * numbers put in). The hardest technique also gets P in full, the empty cells V, and the work term R is shared
   * among the techniques in proportion to their work. `prefix` is the locale prefix ('...tip.'), `kind` is
   * 'technique' (with its `row`), 'empties' or 'total'. Pure data; `renderScoreTip` draws it and `scoreTipText`
   * flattens it.
   */
  function scoreTip(prefix, kind, table, row) {
    const f = function (n) {
      return SG.i18n && typeof SG.i18n.formatNumber === 'function'
        ? SG.i18n.formatNumber(n, { maximumFractionDigits: 2 }) : String(round2(n));
    };
    const k = function (key) { return translate(prefix + key); };
    const shown = { label: k('shown'), math: ['≈ ', B(f(kind === 'empties' ? table.emptyTotal
      : kind === 'total' ? table.total : row.total))] };
    if (kind === 'total') {
      return {
        lines: [{ label: k('total'), math: [V('S'), ' = ', V('V'), ' + ', V('P'), ' + ', V('R')],
          then: ['= ', f(table.emptyShare), ' + ', f(table.peak), ' + ', f(table.workTerm), ' = ',
            B(f(table.unrounded))] },
        shown],
        notes: [k('where.total'), k('rounding')]
      };
    }
    if (kind === 'empties') {
      const e = f(table.empties);
      return {
        lines: [{ label: k('empties'), math: [V('V'), ' = 80 × ', FRAC([V('E')], [V('E'), ' + 40'])],
          then: ['= 80 × ', FRAC([e], [e, ' + 40']), ' = ', B(f(table.emptyShare))] }, shown],
        notes: [k('where.empties'), k('rounding')]
      };
    }
    const Wt = [V('W'), SUB(V('t'))];
    const part = FRAC([f(row.work)], [f(table.work)]);
    const log = function (top, bottom) { return ['(1 + ', FRAC(top, bottom), ')']; };
    return {
      lines: [
        { label: k('work'), math: Wt.concat([' = ', V('n'), SUB(V('t')), ' × ', V('w'), SUB(V('t'))]),
          then: ['= ', f(row.uses), ' × ', f(row.points), ' = ', B(f(row.work))] },
        { label: k('all'), math: [V('W'), ' = Σ '].concat(Wt, [' = ', B(f(table.work))]) },
        { label: k('term'),
          math: [V('R'), ' = ' + f(0.25) + ' × ', V('P'), ' × log', SUB('2')].concat(log([V('W')], [V('P')])),
          then: ['= ' + f(0.25) + ' × ', f(table.peak), ' × log', SUB('2')].concat(
            log([f(table.work)], [f(table.peak)]), [' = ', B(f(table.workTerm))]) },
        row.hardest
          ? { label: k('hardest'), math: [V('P'), ' + ', V('R'), ' × ', FRAC(Wt, [V('W')])],
            then: ['= ', f(table.peak), ' + ', f(table.workTerm), ' × ', part, ' = ', B(f(row.share))] }
          : { label: k('share'), math: [V('R'), ' × ', FRAC(Wt, [V('W')])],
            then: ['= ', f(table.workTerm), ' × ', part, ' = ', B(f(row.share))] },
        shown],
      notes: [k('where.technique'), k('rounding')]
    };
  }

  function tipTokens(tokens) {
    return tokens.map(function (t) {
      if (typeof t === 'string') return t;
      if (t.v !== undefined) return t.v;
      if (t.b !== undefined) return t.b;
      if (t.sub !== undefined) return '_' + tipTokens(t.sub);
      return tipTokens(t.frac[0]) + ' / ' + tipTokens(t.frac[1]);
    }).join('');
  }

  /** The plain text of a tip model (one line per formula, then the notes): for tests and text-only readers. */
  function scoreTipText(model) {
    if (model === null || typeof model !== 'object') return '';
    return model.lines.map(function (line) {
      return line.label + ': ' + tipTokens(line.math) + (line.then ? ' ' + tipTokens(line.then) : '');
    }).concat(model.notes).join('\n');
  }

  function mathNodes(doc, tokens) {
    return tokens.map(function (t) {
      if (typeof t === 'string') return doc.createTextNode(t);
      if (t.v !== undefined) return html(doc, 'var', {}, [doc.createTextNode(t.v)]);
      if (t.b !== undefined) return html(doc, 'strong', {}, [doc.createTextNode(t.b)]);
      if (t.sub !== undefined) return html(doc, 'sub', {}, mathNodes(doc, t.sub));
      return html(doc, 'span', { class: 'math-frac' }, [
        html(doc, 'span', { class: 'math-frac__top' }, mathNodes(doc, t.frac[0])),
        html(doc, 'span', { class: 'visually-hidden' }, [doc.createTextNode(' / ')]),
        html(doc, 'span', { class: 'math-frac__bottom' }, mathNodes(doc, t.frac[1]))
      ]);
    });
  }

  /** The nodes of a tip model: each formula under its label, then the notes. */
  function renderScoreTip(doc, model) {
    return model.lines.map(function (line, i) {
      const last = i === model.lines.length - 1;
      const rows = [html(doc, 'div', { class: 'score-tip__label' }, [doc.createTextNode(line.label)]),
        html(doc, 'div', { class: 'score-tip__math' }, mathNodes(doc, line.math))];
      if (line.then) rows.push(html(doc, 'div', { class: 'score-tip__math' }, mathNodes(doc, line.then)));
      return html(doc, 'div', { class: 'score-tip__line' + (last ? ' score-tip__line--result' : '') }, rows);
    }).concat(model.notes.map(function (note) {
      return html(doc, 'div', { class: 'score-tip__note' }, [doc.createTextNode(note)]);
    }));
  }

  /**
   * Geometry of the technique-frequency bar chart: one row per technique (name left, count right above a thin bar, so
   * long names never collide with the bar). Ordered by the technique ladder (`SG.techniques` `order`); unknown
   * techniques come last, by id. Counts that are zero, negative or not numbers are dropped.
   * `options.label(id, i18nKey)` overrides the translated label.
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

  /**
   * Shows the description of the replay step on show inside `#steps-root` (`#step-detail`, created when missing), with
   * a legend of the board frames after it. `options.stats(position)` gives the techniques the puzzle of a step needs
   * (`SG.player` `rateStep`: { counts, before, empties, score }); without it, or when it returns null, the step shows
   * no technique table. Returns { setSteps(steps) (none on show until `setPosition`), setPosition(p) (0: none, a hint
   * to use the replay controls), clear(), getPosition(), refresh() (also done on `SG.i18n.onChange`), destroy() }.
   */
  function create(rootEl, options) {
    if (!rootEl || typeof rootEl.querySelector !== 'function') {
      throw new TypeError('SG.stepView.create needs the #steps-root element');
    }
    const opts = options || {};
    const doc = rootEl.ownerDocument;
    const created = [];

    let detailEl = rootEl.querySelector('#step-detail');
    if (detailEl === null) {
      detailEl = html(doc, 'div', { id: 'step-detail', class: 'step-detail' });
      rootEl.appendChild(detailEl);
      created.push(detailEl);
    }
    const legendEl = html(doc, 'ul', { class: 'steps-legend', hidden: true });
    detailEl.parentNode.insertBefore(legendEl, detailEl.nextSibling);
    created.push(legendEl);
    detailEl.textContent = '';
    const headingEl = rootEl.querySelector('#steps-heading');

    let steps = [];
    let position = 0;

    function player() {
      return SG.player || null;
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

    function renderHeading() {
      if (headingEl === null) return;
      const step = steps[position - 1];
      const p = player();
      const text = step
        ? translate('steps.title', { number: String(position), title: p ? p.stepTitle(step) : step.kind })
        : translate('shell.steps.heading');
      if (headingEl.textContent !== text) headingEl.textContent = text;
    }

    function formatNumber(n, options) {
      return SG.i18n && typeof SG.i18n.formatNumber === 'function' ? SG.i18n.formatNumber(n, options) : String(n);
    }

    function cell(tag, text, cls) {
      return html(doc, tag, cls ? { class: cls } : {}, [doc.createTextNode(text)]);
    }

    /** The "?" next to a name: opens on hover, focus and click; Esc closes it. `content` is text or an array of nodes. */
    function helpTip(popId, content, label) {
      if (typeof doc.createElementNS !== 'function') return null;
      const svgNs = 'http://www.w3.org/2000/svg';
      const use = doc.createElementNS(svgNs, 'use');
      use.setAttribute('href', '#ic-help');
      const svg = doc.createElementNS(svgNs, 'svg');
      svg.setAttribute('class', 'icon');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      svg.appendChild(use);
      const pop = html(doc, 'div', { class: 'help-tip__pop', id: popId, role: 'tooltip' },
        typeof content === 'string' ? [doc.createTextNode(content)] : content);
      const button = html(doc, 'button', {
        type: 'button', class: 'help-tip__btn', 'aria-describedby': popId, 'aria-label': label
      }, [svg]);
      const wrap = html(doc, 'span', { class: 'help-tip help-tip--inline' }, [button, pop]);
      button.addEventListener('click', function () {
        if (wrap.getAttribute('data-open') === null) wrap.setAttribute('data-open', '');
        else wrap.removeAttribute('data-open');
      });
      wrap.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') wrap.removeAttribute('data-open');
      });
      wrap.addEventListener('focusout', function () { wrap.removeAttribute('data-open'); });
      return wrap;
    }

    function techniqueHelp(id, name) {
      const key = 'technique.' + id + '.desc';
      if (!hasText(key)) return null;
      return helpTip('step-tech-' + id + '-help', translate(key),
        translate('steps.techniques.help', { name: name }));
    }

    function partHelp(part, name) {
      return helpTip('step-part-' + part + '-help', translate('steps.techniques.' + part + '.desc'),
        translate('steps.techniques.help', { name: name }));
    }

    function nameCell(text, help) {
      const label = html(doc, 'span', { class: 'result-table__name' }, [doc.createTextNode(text)]);
      if (help !== null) label.appendChild(help);
      return html(doc, 'th', { scope: 'row' }, [label]);
    }

    /** A score cell: the whole number (`data-role="score"`) and a help icon whose tooltip shows how it is calculated
     * (`tip` is a `scoreTip` model; null: no icon). */
    function scoreCell(part, name, value, tip) {
      const children = [html(doc, 'span', { 'data-role': 'score' }, [doc.createTextNode(value)])];
      const help = tip === null ? null : helpTip('step-score-' + part + '-help', renderScoreTip(doc, tip),
        translate('steps.techniques.help.score', { name: name }));
      if (help !== null) {
        help.setAttribute('class', 'help-tip help-tip--inline help-tip--end');
        help.setAttribute('data-role', 'score-help');
        children.push(help);
      }
      return html(doc, 'td', { class: 'result-table__num' },
        [html(doc, 'span', { class: 'result-table__score' }, children)]);
    }

    /**
     * The techniques the puzzle of a step needs with uses and share of the score. The total is the difficulty
     * score of the puzzle of that step (the one the summary shows at the end): the technique shares plus that of the
     * empty cells (`SG.difficulty.scoreTable`). Each score has a help icon that explains how it was calculated. Empty
     * when the page cannot tell for this step.
     */
    function techniquesBlock(position) {
      const info = typeof opts.stats === 'function' ? opts.stats(position) : null;
      if (!info) return null;
      const bars = chartModel(info.counts).bars;
      const box = html(doc, 'div', { class: 'step-detail__techniques' }, [
        html(doc, 'h3', { class: 'step-detail__subtitle' },
          [doc.createTextNode(translate('steps.techniques.title'))])
      ]);
      if (bars.length === 0) {
        box.appendChild(html(doc, 'p', { class: 'step-detail__empty' },
          [doc.createTextNode(translate('steps.techniques.none'))]));
        return box;
      }
      const empties = Number.isFinite(info.empties) && info.empties > 0 ? info.empties : 0;
      let table = null;
      if (SG.difficulty && typeof SG.difficulty.scoreTable === 'function') {
        try {
          table = SG.difficulty.scoreTable(info.counts, empties);
        } catch (err) {
          table = null;
        }
      }
      const byId = {};
      if (table !== null) table.rows.forEach(function (row) { byId[row.id] = row; });
      const hasEmpties = table !== null && table.empties > 0;
      const total = table !== null ? table.total
        : typeof info.score === 'number' && isFinite(info.score) ? info.score : 0;

      const rows = bars.map(function (bar) {
        const previous = (info.before && info.before[bar.id]) || 0;
        const more = bar.count - previous;
        const label = html(doc, 'span', { class: 'result-table__name' }, [doc.createTextNode(bar.label)]);
        const help = techniqueHelp(bar.id, bar.label);
        if (help !== null) label.appendChild(help);
        const name = html(doc, 'th', { scope: 'row' }, [label]);
        const row = byId[bar.id] || null;
        return html(doc, 'tr', { 'data-technique': bar.id }, [
          name,
          cell('td', formatNumber(bar.count) + (more > 0 ? ' (+' + formatNumber(more) + ')' : ''),
            'result-table__num'),
          row !== null
            ? scoreCell(bar.id, bar.label, formatNumber(row.total),
              scoreTip('steps.techniques.tip.', 'technique', table, row))
            : cell('td', '', 'result-table__num')
        ]);
      });
      if (hasEmpties) {
        rows.push(html(doc, 'tr', { 'data-part': 'empties' }, [
          nameCell(translate('steps.techniques.empties'),
            partHelp('empties', translate('steps.techniques.empties'))),
          cell('td', formatNumber(table.empties), 'result-table__num'),
          scoreCell('empties', translate('steps.techniques.empties'), formatNumber(table.emptyTotal),
            scoreTip('steps.techniques.tip.', 'empties', table, null))
        ]));
      }
      const other = rows.slice(bars.length);
      const head = html(doc, 'tr', {}, [
        html(doc, 'th', {}, [html(doc, 'span', { class: 'visually-hidden' },
          [doc.createTextNode(translate('steps.techniques.col.name'))])]),
        cell('th', translate('steps.techniques.col.count'), 'result-table__num'),
        cell('th', translate('steps.techniques.col.score'), 'result-table__num')
      ]);
      const foot = html(doc, 'tr', { class: 'step-table__total' }, [
        cell('th', translate('steps.techniques.total')),
        cell('td', '', 'result-table__num'),
        scoreCell('total', translate('steps.techniques.total'), formatNumber(Math.round(total)),
          table !== null ? scoreTip('steps.techniques.tip.', 'total', table, null) : null)
      ]);
      const section = function (key) {
        return html(doc, 'tr', { class: 'result-table__section', 'data-section-row': key }, [
          html(doc, 'th', { scope: 'colgroup', colspan: '3' },
            [doc.createTextNode(translate('steps.techniques.section.' + key))])
        ]);
      };
      const groups = [
        html(doc, 'tbody', { 'data-group': 'technique' }, [section('technique')].concat(rows.slice(0, bars.length)))
      ];
      if (other.length > 0) {
        groups.push(html(doc, 'tbody', { 'data-group': 'other' }, [section('other')].concat(other)));
      }
      box.appendChild(html(doc, 'table', { class: 'result-table' },
        [html(doc, 'thead', {}, [head])].concat(groups, [html(doc, 'tfoot', {}, [foot])])));
      return box;
    }

    function render() {
      detailEl.textContent = '';
      const step = steps[position - 1];
      if (steps.length === 0) {
        detailEl.removeAttribute('data-kind');
      } else if (!step) {
        detailEl.removeAttribute('data-kind');
        detailEl.appendChild(html(doc, 'p', { class: 'step-detail__empty' },
          [doc.createTextNode(translate('steps.detail.empty'))]));
      } else {
        const p = player();
        detailEl.setAttribute('data-kind', step.kind);
        detailEl.appendChild(html(doc, 'p', { class: 'step-detail__meta' },
          [doc.createTextNode(p ? p.stepMeta(step) : '')]));
        detailEl.appendChild(html(doc, 'p', { class: 'step-detail__text' },
          [doc.createTextNode(p ? p.describeStep(step) : '')]));
        const block = techniquesBlock(position);
        if (block !== null) detailEl.appendChild(block);
      }
      renderHeading();
      renderLegend();
    }

    const unsubscribeLocale = SG.i18n && typeof SG.i18n.onChange === 'function'
      ? SG.i18n.onChange(render) : null;
    render();

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
        render();
      },
      clear: function clear() {
        steps = [];
        position = 0;
        render();
      },
      getPosition: function getPosition() {
        return position;
      },
      refresh: render,
      destroy: function destroy() {
        if (unsubscribeLocale !== null) unsubscribeLocale();
        detailEl.textContent = '';
        created.forEach(function (node) {
          if (node.parentNode) node.parentNode.removeChild(node);
        });
        steps = [];
      }
    };
  }

  /**
   * Whole numbers for the parts of a total that add up to the rounded total (largest remainders get the extra
   * points), so a table of scores can be added up by hand. Used by the summary and the steps.
   */
  function roundToTotal(values, total) {
    const target = Math.round(total);
    const out = values.map(function (v) { return Math.floor(v); });
    let left = target - out.reduce(function (sum, v) { return sum + v; }, 0);
    const order = values.map(function (v, i) { return i; }).sort(function (a, b) {
      return (values[b] - Math.floor(values[b])) - (values[a] - Math.floor(values[a])) || a - b;
    });
    for (let k = 0; k < order.length && left > 0; k++, left--) out[order[k]] += 1;
    return out;
  }

  SG.stepView = {
    STEP_IDS: STEP_IDS,
    chartModel: chartModel,
    scoreTip: scoreTip,
    scoreTipText: scoreTipText,
    renderScoreTip: renderScoreTip,
    roundToTotal: roundToTotal,
    create: create
  };

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'steps.title': 'Step {number} - {title}',
      'steps.techniques.title': 'Techniques needed at this step',
      'steps.techniques.none': 'No solving technique is needed yet.',
      'steps.techniques.col.name': 'Item',
      'steps.techniques.col.count': 'Uses',
      'steps.techniques.col.score': 'Score',
      'steps.techniques.empties': 'Empty cells',
      'steps.techniques.section.technique': 'Technique',
      'steps.techniques.section.other': 'Other',
      'steps.techniques.empties.desc': 'Empty cells add 80 × E ÷ (E + 40) points, at most 80.',
      'steps.techniques.total': 'Total',
      'steps.techniques.help': 'About \u201c{name}\u201d',
      'steps.techniques.help.score': 'How the score of \u201c{name}\u201d is calculated',
      'steps.techniques.tip.work': 'Work of this technique',
      'steps.techniques.tip.all': 'All the work of the puzzle',
      'steps.techniques.tip.term': 'Work term of the score',
      'steps.techniques.tip.share': 'Its share of the work term',
      'steps.techniques.tip.hardest': 'Hardest technique: its points in full + its share of the work term',
      'steps.techniques.tip.empties': 'Empty cells',
      'steps.techniques.tip.total': 'Score',
      'steps.techniques.tip.shown': 'Shown as (rounded)',
      'steps.techniques.tip.where.technique': 'n = uses, w = points per use, P = points of the hardest technique.',
      'steps.techniques.tip.where.empties': 'E = number of empty cells.',
      'steps.techniques.tip.where.total': 'V = empty cells, P = hardest technique, R = work term.',
      'steps.techniques.tip.rounding': 'The rows are rounded together, so they add up to the total.',
      'steps.detail.empty': 'Use the replay controls under the board to go through the steps of how the ' +
        'puzzle was made. The description of each step shows here.',
      'steps.legend.label': 'Frames on the board',
      'steps.legend.dug': 'Removed in this step',
      'steps.legend.kept': 'Tried, but put back',
      'steps.legend.revealed': 'Clue shown in this step',
      'steps.legend.signRemoved': 'Sign taken away in this step',
      'steps.legend.signKept': 'Sign tried, but kept'
    },
    vi: {
      'steps.title': 'Bước {number} - {title}',
      'steps.techniques.title': 'Kỹ thuật cần dùng ở bước này',
      'steps.techniques.none': 'Chưa cần kỹ thuật giải nào.',
      'steps.techniques.col.name': 'Mục',
      'steps.techniques.col.count': 'Lần dùng',
      'steps.techniques.col.score': 'Điểm',
      'steps.techniques.empties': 'Ô trống',
      'steps.techniques.section.technique': 'Kỹ thuật',
      'steps.techniques.section.other': 'Khác',
      'steps.techniques.empties.desc': 'Các ô trống cộng 80 × E ÷ (E + 40) điểm, tối đa 80.',
      'steps.techniques.total': 'Tổng',
      'steps.techniques.help': 'Giải thích về \u201c{name}\u201d',
      'steps.techniques.help.score': 'Cách tính điểm của \u201c{name}\u201d',
      'steps.techniques.tip.work': 'Khối lượng của kỹ thuật này',
      'steps.techniques.tip.all': 'Toàn bộ khối lượng của đề',
      'steps.techniques.tip.term': 'Phần khối lượng của điểm số',
      'steps.techniques.tip.share': 'Phần của nó trong phần khối lượng',
      'steps.techniques.tip.hardest': 'Kỹ thuật khó nhất: đủ điểm của nó + phần của nó trong phần khối lượng',
      'steps.techniques.tip.empties': 'Ô trống',
      'steps.techniques.tip.total': 'Điểm số',
      'steps.techniques.tip.shown': 'Hiển thị (đã làm tròn)',
      'steps.techniques.tip.where.technique': 'n = số lần dùng, w = điểm mỗi lần, P = điểm của kỹ thuật khó nhất.',
      'steps.techniques.tip.where.empties': 'E = số ô trống.',
      'steps.techniques.tip.where.total': 'V = ô trống, P = kỹ thuật khó nhất, R = phần khối lượng.',
      'steps.techniques.tip.rounding': 'Các dòng được làm tròn cùng nhau nên cộng lại đúng bằng tổng.',
      'steps.detail.empty': 'Dùng các nút phát lại dưới bảng để xem từng bước tạo ra đề. Mô tả của mỗi bước ' +
        'hiện ở đây.',
      'steps.legend.label': 'Các khung trên bảng',
      'steps.legend.dug': 'Bị xóa ở bước này',
      'steps.legend.kept': 'Đã thử nhưng trả lại',
      'steps.legend.revealed': 'Số cho sẵn được hiện ở bước này',
      'steps.legend.signRemoved': 'Dấu bị bỏ ở bước này',
      'steps.legend.signKept': 'Dấu đã thử nhưng giữ lại'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
