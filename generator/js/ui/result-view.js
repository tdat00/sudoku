/**
 * Result panel `SG.resultView`: two cards (level reached with its difficulty score, number of clues) and a table of
 * the techniques used (uses, points per use and share of the score; a help icon next to each score explains how it is calculated).
 * A Wordoku result also gets a card with its key word and
 * meaning while "Show the solution" is on. An approximate result (warning `difficulty.approximate`) gets a yellow
 * alert and a "Retry with a different seed" button; other warnings are listed, translated; no warning, no UI.
 * `viewModel(result)` is pure (displayed values already formatted, plus the warning keys); `create(rootEl, options)`
 * renders it into `#result-root` and follows the language. Strings: `result.*` fragment at the bottom + base packs.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.resultView && typeof SG.resultView.create === 'function') return;

  const SVG_NS = 'http://www.w3.org/2000/svg';

  const POS_KEYS = Object.freeze({
    n: 'result.word.pos.n', v: 'result.word.pos.v', a: 'result.word.pos.a', d: 'result.word.pos.d',
    o: 'result.word.pos.o'
  });

  const WARNING_KINDS = Object.freeze({
    'difficulty.approximate': 'approximate',
    'digger.unsoundTechnique': 'unsound',
    'trace.downgraded': 'downgraded'
  });

  function t(key, args) {
    return SG.i18n && typeof SG.i18n.t === 'function' ? SG.i18n.t(key, args) : key;
  }

  function hasText(key) {
    return !!(SG.i18n && typeof SG.i18n.has === 'function' && SG.i18n.has(key));
  }

  function nameOf(prefix, id) {
    return hasText(prefix + id) ? t(prefix + id) : String(id);
  }

  function formatNumber(n, options) {
    return SG.i18n && typeof SG.i18n.formatNumber === 'function' ? SG.i18n.formatNumber(n, options)
      : String(n);
  }

  function countClues(givens) {
    let n = 0;
    if (givens) for (let i = 0; i < givens.length; i++) if (givens[i] > 0) n++;
    return n;
  }

  function warningModels(result) {
    const seen = {};
    const list = [];
    (Array.isArray(result.warnings) ? result.warnings : []).forEach(function (key) {
      if (typeof key !== 'string' || seen[key] === true) return;
      seen[key] = true;
      const kind = Object.prototype.hasOwnProperty.call(WARNING_KINDS, key) ? WARNING_KINDS[key] : 'other';
      list.push({
        key: key,
        kind: kind,
        text: hasText(key) ? t(key) : t('result.warning.unknown', { code: key })
      });
    });
    return list;
  }

  /**
   * The model of a score tooltip (`SG.stepView.scoreTip`, shared with the step table; formulas with the real
   * values); null when the step view is not loaded.
   */
  function scoreTip(kind, table, row) {
    return SG.stepView && typeof SG.stepView.scoreTip === 'function'
      ? SG.stepView.scoreTip('result.techniques.tip.', kind, table, row) : null;
  }

  /**
   * The techniques the puzzle needs, simplest first (technique ladder order), each with uses and share of the
   * score (`SG.difficulty.scoreTable`: the hardest technique counts its points once in full, the rest of the
   * technique part of the score is shared in proportion to points x uses). `tip` explains the share.
   */
  function techniqueRows(counts, table) {
    const chart = SG.stepView && typeof SG.stepView.chartModel === 'function'
      ? SG.stepView.chartModel(counts) : null;
    const ids = chart !== null ? chart.bars.map(function (bar) { return bar.id; })
      : Object.keys(counts).filter(function (id) { return counts[id] > 0; }).sort();
    const byId = {};
    if (table !== null) table.rows.forEach(function (row) { byId[row.id] = row; });
    return ids.map(function (id) {
      const count = counts[id];
      const row = byId[id] || null;
      const unit = row !== null ? row.points : 0;
      const score = row !== null ? row.total : 0;
      const descKey = 'technique.' + id + '.desc';
      return {
        id: id,
        name: nameOf('technique.', id),
        summary: hasText(descKey) ? t(descKey) : '',
        count: count,
        countText: formatNumber(count),
        unitScore: unit,
        unitScoreText: formatNumber(unit, { maximumFractionDigits: 2 }),
        work: row !== null ? row.work : 0,
        workText: formatNumber(row !== null ? row.work : 0, { maximumFractionDigits: 2 }),
        score: score,
        scoreText: formatNumber(score),
        tip: row !== null ? scoreTip('technique', table, row) : null
      };
    });
  }

  function scoreTableOf(counts, rating) {
    if (!SG.difficulty || typeof SG.difficulty.scoreTable !== 'function') return null;
    const empties = typeof rating.empties === 'number' && rating.empties > 0 ? rating.empties : 0;
    try {
      return SG.difficulty.scoreTable(counts, empties);
    } catch (err) {
      return null;
    }
  }

  /**
   * How the score adds up: the technique rows (see `techniqueRows`) and the empty cells (count and 80 x E / (E + 40)
   * in all). Every part is a whole number and the parts add up to the score (one rounding); `emptyTip` and `totalTip`
   * explain the empty cells and the total.
   */
  function scoreBreakdown(table, score) {
    const empties = table !== null ? table.empties : 0;
    return {
      empties: empties,
      emptyText: empties > 0 ? formatNumber(table.emptyTotal) : '',
      emptyTip: empties > 0 ? scoreTip('empties', table, null) : null,
      workText: table !== null ? formatNumber(table.work, { maximumFractionDigits: 2 }) : '',
      totalText: formatNumber(Math.round(score)),
      totalTip: table !== null ? scoreTip('total', table, null) : null
    };
  }

  /** Everything the panel shows for a result in the current language; null for a missing result. */
  function viewModel(result) {
    if (result === null || typeof result !== 'object') return null;
    const config = result.config || {};
    const rating = result.rating || {};
    const variantId = config.variantId || (result.model ? result.model.variantId : '');
    const requested = config.difficulty || rating.level || '';
    const achieved = rating.level || requested;
    const clues = countClues(result.givens);
    const cells = result.model && result.model.cellCount > 0 ? result.model.cellCount
      : (result.givens ? result.givens.length : 0);
    const score = typeof rating.score === 'number' && isFinite(rating.score) ? rating.score : 0;
    const counts = rating.techniqueCounts && typeof rating.techniqueCounts === 'object'
      ? rating.techniqueCounts : {};
    const table = scoreTableOf(counts, rating);
    const techniques = techniqueRows(counts, table);
    const breakdown = scoreBreakdown(table, score);
    const warnings = warningModels(result);
    const approximate = warnings.some(function (w) { return w.kind === 'approximate'; });
    return {
      variantId: variantId,
      variantName: nameOf('variant.', variantId),
      requested: requested,
      requestedName: nameOf('difficulty.', requested),
      achieved: achieved,
      achievedName: nameOf('difficulty.', achieved),
      exact: requested === achieved,
      clues: clues,
      cells: cells,
      cluesText: t('result.clues.of', { cells: formatNumber(cells) }),
      score: score,
      scoreText: formatNumber(Math.round(score)),
      techniqueCounts: Object.assign({}, counts),
      techniques: techniques,
      parts: breakdown,
      warnings: warnings,
      warningKeys: warnings.map(function (w) { return w.key; }),
      approximate: approximate,
      retryAvailable: approximate
    };
  }

  /** Key word of a Wordoku result and its meaning; null when not a Wordoku. A word missing from the word book (typed by the user) gives its letters and no meaning. */
  function wordInfo(result) {
    if (result === null || typeof result !== 'object' || !result.model || result.model.variantId !== 'wordoku' ||
        !SG.wordoku || typeof SG.wordoku.describe !== 'function') {
      return null;
    }
    const line = SG.wordoku.describe(result.model);
    if (line === null) return null;
    const entry = SG.wordbook && typeof SG.wordbook.lookup === 'function'
      ? SG.wordbook.lookup(line.word, SG.i18n && SG.i18n.current)[0] : undefined;
    if (entry === undefined) {
      return { word: line.word, text: line.word, language: '', posName: '', meaning: '', other: '' };
    }
    const posKey = POS_KEYS[entry.pos] || POS_KEYS.o;
    return {
      word: line.word, text: entry.text, language: entry.language, posName: t(posKey),
      meaning: entry.meaning, other: entry.other
    };
  }

  function make(doc, tag, attrs, children) {
    const node = doc.createElement(tag);
    Object.keys(attrs || {}).forEach(function (name) {
      const value = attrs[name];
      if (value === null || value === undefined || value === false) return;
      if (name === 'class') node.className = value;
      else if (name === 'text') node.textContent = value;
      else node.setAttribute(name, value === true ? '' : String(value));
    });
    (children || []).forEach(function (child) { node.appendChild(child); });
    return node;
  }

  function icon(doc, name) {
    const use = doc.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#ic-' + name);
    const svg = doc.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.appendChild(use);
    return svg;
  }

  /**
   * @typedef {Object} ResultViewOptions
   * @property {function(): void} [onRetry]  The "Retry with a different seed" button.
   * @property {function(): boolean} [showWord]  Whether a Wordoku result gets the key-word card ("Show the solution").
   */

  /** Renders the panel into `#result-root` (emptied first). Returns { show(result), clear(), refresh(), destroy(), isShown() }. */
  function create(rootEl, options) {
    if (!rootEl || typeof rootEl.appendChild !== 'function') {
      throw new TypeError('SG.resultView.create needs the #result-root element');
    }
    const opts = options || {};
    const doc = rootEl.ownerDocument;
    let result = null;
    let destroyed = false;

    function stat(role, label, value, sub) {
      const dd = make(doc, 'dd', { class: 'stat__value', text: value });
      const children = [make(doc, 'dt', { class: 'stat__label', text: label }), dd];
      if (sub) children.push(make(doc, 'dd', { class: 'stat__sub', text: sub }));
      return make(doc, 'div', { class: 'stat stat--sm', 'data-stat': role }, children);
    }

    function warningBlock(vm) {
      return vm.warnings.map(function (w) {
        const body = [make(doc, 'p', { class: 'result__warning-text', text: w.text })];
        if (w.kind === 'approximate') {
          body.push(make(doc, 'p', {
            class: 'result__warning-detail',
            text: t('result.warning.approximate.levels', {
              requested: vm.requestedName, achieved: vm.achievedName
            })
          }));
          const retry = make(doc, 'button', {
            type: 'button', class: 'btn btn--secondary btn--sm', 'data-role': 'retry'
          }, [
            icon(doc, 'dice'),
            make(doc, 'span', { class: 'btn__label', text: t('result.warning.retry') })
          ]);
          retry.addEventListener('click', function () {
            if (typeof opts.onRetry === 'function') opts.onRetry();
          });
          body.push(retry);
        }
        return make(doc, 'div', {
          class: 'alert alert--warning result__warning', role: 'status', 'data-warning': w.key
        }, [icon(doc, 'alert'), make(doc, 'div', { class: 'stack result__warning-body' }, body)]);
      });
    }

    /** The "?" next to a name: opens on hover, focus and click; Esc closes it. `content` is text or an array of nodes. */
    function helpTip(popId, content, name, labelKey) {
      const pop = make(doc, 'div', {
        class: 'help-tip__pop', id: popId, role: 'tooltip', text: typeof content === 'string' ? content : null
      }, typeof content === 'string' ? [] : content);
      const button = make(doc, 'button', {
        type: 'button', class: 'help-tip__btn', 'aria-describedby': popId,
        'aria-label': t(labelKey || 'result.techniques.help', { name: name })
      }, [icon(doc, 'help')]);
      const wrap = make(doc, 'span', { class: 'help-tip help-tip--inline' }, [button, pop]);
      const place = SG.stepView && typeof SG.stepView.placeTip === 'function' ? SG.stepView.placeTip : null;
      if (place !== null) {
        ['mouseenter', 'focusin'].forEach(function (name) {
          wrap.addEventListener(name, function () { place(wrap); });
        });
      }
      button.addEventListener('click', function () {
        if (wrap.getAttribute('data-open') === null) {
          if (place !== null) place(wrap);
          wrap.setAttribute('data-open', '');
        } else {
          wrap.removeAttribute('data-open');
        }
      });
      wrap.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') wrap.removeAttribute('data-open');
      });
      wrap.addEventListener('focusout', function () { wrap.removeAttribute('data-open'); });
      return wrap;
    }

    function techniqueHelp(row) {
      return helpTip('result-tech-' + row.id + '-help', row.summary, row.name);
    }

    function partHeader(part, name, text) {
      return make(doc, 'th', { scope: 'row' }, [make(doc, 'span', { class: 'result-table__name' }, [
        make(doc, 'span', { text: name }), helpTip('result-part-' + part + '-help', text, name)
      ])]);
    }

    /** A score cell: the whole number (`data-role="score"`) and a help icon whose tooltip shows how it is calculated. */
    function scoreCell(part, name, value, tip) {
      const children = [make(doc, 'span', { 'data-role': 'score', text: value })];
      if (tip !== null && SG.stepView && typeof SG.stepView.renderScoreTip === 'function') {
        const help = helpTip('result-score-' + part + '-help', SG.stepView.renderScoreTip(doc, tip), name,
          'result.techniques.help.score');
        help.className = 'help-tip help-tip--inline help-tip--end';
        help.setAttribute('data-role', 'score-help');
        children.push(help);
      }
      return make(doc, 'td', { class: 'result-table__num' }, [
        make(doc, 'span', { class: 'result-table__score' }, children)
      ]);
    }

    function extraRows(vm) {
      const out = [];
      if (vm.parts.empties > 0) {
        out.push(make(doc, 'tr', { 'data-part': 'empties' }, [
          partHeader('empties', t('result.techniques.empties'), t('result.techniques.empties.desc')),
          make(doc, 'td', { class: 'result-table__num', text: formatNumber(vm.parts.empties) }),
          make(doc, 'td', { class: 'result-table__num', text: '' }),
          make(doc, 'td', { class: 'result-table__num', text: '' }),
          scoreCell('empties', t('result.techniques.empties'), vm.parts.emptyText, vm.parts.emptyTip)
        ]));
      }
      return out;
    }

    function sectionRow(key) {
      return make(doc, 'tr', { class: 'result-table__section', 'data-section-row': key }, [
        make(doc, 'th', { scope: 'colgroup', colspan: '5', text: t('result.techniques.section.' + key) })
      ]);
    }

    function techniques(vm) {
      const box = make(doc, 'section', { class: 'result__section', 'data-section': 'techniques' }, [
        make(doc, 'h3', { class: 'panel__subtitle', text: t('result.techniques.title') })
      ]);
      if (vm.techniques.length === 0) {
        box.appendChild(make(doc, 'p', { class: 'text-muted', text: t('result.techniques.none') }));
        return box;
      }
      const num = function (key) {
        return make(doc, 'th', { scope: 'col', class: 'result-table__num' }, [
          make(doc, 'span', { class: 'result-table__full', text: t(key) }),
          make(doc, 'span', { class: 'result-table__short', 'aria-hidden': 'true', text: t(key + '.short') })
        ]);
      };
      const head = make(doc, 'tr', {}, [
        make(doc, 'th', { scope: 'col' }, [
          make(doc, 'span', { class: 'visually-hidden', text: t('result.techniques.col.name') })
        ]),
        num('result.techniques.col.count'),
        num('result.techniques.col.unit'),
        num('result.techniques.col.work'),
        num('result.techniques.col.score')
      ]);
      const rows = vm.techniques.map(function (row) {
        const name = [make(doc, 'span', { text: row.name })];
        if (row.summary !== '') name.push(techniqueHelp(row));
        return make(doc, 'tr', { 'data-technique': row.id }, [
          make(doc, 'th', { scope: 'row' }, [make(doc, 'span', { class: 'result-table__name' }, name)]),
          make(doc, 'td', { class: 'result-table__num', text: row.countText }),
          make(doc, 'td', { class: 'result-table__num', text: row.unitScoreText }),
          make(doc, 'td', { class: 'result-table__num', 'data-role': 'work', text: row.workText }),
          scoreCell(row.id, row.name, row.scoreText, row.tip)
        ]);
      });
      const other = extraRows(vm);
      const groups = [
        make(doc, 'tbody', { 'data-group': 'technique' }, [sectionRow('technique')].concat(rows))
      ];
      if (other.length > 0) {
        groups.push(make(doc, 'tbody', { 'data-group': 'other' }, [sectionRow('other')].concat(other)));
      }
      box.appendChild(make(doc, 'table', { class: 'result-table' }, [
        make(doc, 'thead', {}, [head])
      ].concat(groups, [
        make(doc, 'tfoot', {}, [make(doc, 'tr', { class: 'result-table__total', 'data-part': 'total' }, [
          make(doc, 'th', { scope: 'row', text: t('result.techniques.total') }),
          make(doc, 'td', { class: 'result-table__num', text: '' }),
          make(doc, 'td', { class: 'result-table__num', text: '' }),
          make(doc, 'td', { class: 'result-table__num', 'data-role': 'work', text: vm.parts.workText }),
          scoreCell('total', t('result.techniques.total'), vm.parts.totalText, vm.parts.totalTip)
        ])])
      ])));
      box.appendChild(make(doc, 'p', { class: 'text-muted result__note result-table__legend', 'data-role': 'legend' }, [
        make(doc, 'span', { text: t('result.techniques.legend.1') }),
        make(doc, 'span', { text: t('result.techniques.legend.2') })
      ]));
      return box;
    }

    function wordCard(info) {
      const children = [
        make(doc, 'dt', { class: 'stat__label', text: t('result.word.title') }),
        make(doc, 'dd', { class: 'stat__value', 'data-role': 'word-text', lang: info.language || null,
          text: info.posName === '' ? info.text : info.text + ' (' + info.posName + ')' })
      ];
      [info.meaning, info.other].forEach(function (line) {
        if (line !== '') children.push(make(doc, 'dd', { class: 'stat__sub', text: line }));
      });
      if (info.meaning === '') children.push(make(doc, 'dd', { class: 'stat__sub', text: t('result.word.unknown') }));
      return make(doc, 'div', { class: 'stat stat--sm stat--wide', 'data-stat': 'word' }, children);
    }

    function build(vm) {
      const header = make(doc, 'header', { class: 'result__header' }, [
        make(doc, 'h2', { class: 'card__title visually-hidden', id: 'result-title', text: t('result.title') })
      ]);
      if (vm.approximate) {
        header.appendChild(make(doc, 'span', { class: 'badge badge--warning', 'data-role': 'badge' }, [
          icon(doc, 'alert'), make(doc, 'span', { text: t('result.warning.approximate.badge') })
        ]));
      }

      const stats = make(doc, 'dl', { class: 'stat-grid stat-grid--sm' }, [
        stat('difficulty', t('result.stat.difficulty'), vm.achievedName,
          t('result.score.sub', { score: vm.scoreText })),
        stat('clues', t('result.stat.clues'), formatNumber(vm.clues), vm.cluesText)
      ]);
      const info = typeof opts.showWord === 'function' && opts.showWord() ? wordInfo(result) : null;
      if (info !== null) {
        stats.classList.add('stat-grid--word');
        stats.appendChild(wordCard(info));
      }

      const card = make(doc, 'article', {
        class: 'card result', 'aria-labelledby': 'result-title',
        'data-approximate': vm.approximate ? 'true' : 'false'
      }, [header]);
      warningBlock(vm).forEach(function (node) { card.appendChild(node); });
      card.appendChild(stats);
      card.appendChild(techniques(vm));
      return card;
    }

    function render() {
      const active = doc.activeElement && doc.activeElement.getAttribute && rootEl.contains(doc.activeElement)
        ? doc.activeElement.getAttribute('data-role') : null;
      rootEl.textContent = '';
      if (result === null) return;
      rootEl.appendChild(build(viewModel(result)));
      if (active !== null) {
        const again = rootEl.querySelector('[data-role="' + active + '"]');
        if (again && typeof again.focus === 'function') again.focus();
      }
    }

    const unsubscribe = SG.i18n && typeof SG.i18n.onChange === 'function' ? SG.i18n.onChange(function () {
      if (!destroyed && result !== null) render();
    }) : null;

    return {
      show: function show(next) {
        if (destroyed) return;
        result = next && typeof next === 'object' ? next : null;
        render();
      },
      clear: function clear() {
        result = null;
        render();
      },
      refresh: function refresh() {
        if (destroyed || result === null) return;
        render();
      },
      isShown: function isShown() {
        return result !== null;
      },
      destroy: function destroy() {
        if (destroyed) return;
        destroyed = true;
        if (unsubscribe !== null) unsubscribe();
        result = null;
        rootEl.textContent = '';
      }
    };
  }

  SG.resultView = {
    WARNING_KINDS: WARNING_KINDS,
    viewModel: viewModel,
    wordInfo: wordInfo,
    create: create
  };

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'result.title': 'Result',
      'result.word.title': 'Key word',
      'result.word.unknown': 'This word is not in the word book, so it has no meaning to show.',
      'result.word.pos.n': 'noun',
      'result.word.pos.v': 'verb',
      'result.word.pos.a': 'adjective',
      'result.word.pos.d': 'adverb',
      'result.word.pos.o': 'word',
      'result.stat.difficulty': 'Difficulty',
      'result.score.sub': 'Score: {score}',
      'result.stat.clues': 'Clues',
      'result.clues.of': 'of {cells} cells',
      'result.techniques.title': 'Difficulty Score',
      'result.techniques.section.technique': 'Technique',
      'result.techniques.section.other': 'Other',
      'result.techniques.none': 'No solving techniques were needed.',
      'result.techniques.col.name': 'Item',
      'result.techniques.col.count': 'Uses',
      'result.techniques.col.unit': 'Points per use',
      'result.techniques.col.work': 'Work',
      'result.techniques.col.score': 'Score',
      'result.techniques.col.count.short': 'n',
      'result.techniques.col.unit.short': 'w',
      'result.techniques.col.work.short': 'W',
      'result.techniques.col.score.short': 'q',
      'result.techniques.legend.1': 'n = uses, w = points per use',
      'result.techniques.legend.2': 'W = work (n × w), q = score',
      'result.techniques.empties': 'Empty cells',
      'result.techniques.empties.desc': 'Empty cells add 80 × E ÷ (E + 40) points, at most 80.',
      'result.techniques.total': 'Total',
      'result.techniques.help': 'About “{name}”',
      'result.techniques.help.score': 'How the score of “{name}” is calculated',
      'result.techniques.tip.work': 'Work of this technique',
      'result.techniques.tip.all': 'All the work of the puzzle',
      'result.techniques.tip.term': 'Work term of the score',
      'result.techniques.tip.share': 'Its share of the work term',
      'result.techniques.tip.hardest': 'Hardest technique: its points in full + its share of the work term',
      'result.techniques.tip.empties': 'Empty cells',
      'result.techniques.tip.total': 'Score',
      'result.techniques.tip.shown': 'Shown as (rounded)',
      'result.techniques.tip.where.technique': 'n = uses, w = points per use, P = points of the hardest technique.',
      'result.techniques.tip.where.empties': 'E = number of empty cells.',
      'result.techniques.tip.where.total': 'V = empty cells, P = hardest technique, R = work term.',
      'result.techniques.tip.rounding': 'The rows are rounded together, so they add up to the total.',
      'result.warning.approximate.badge': 'Closest puzzle found',
      'result.warning.approximate.levels': 'Requested: {requested}. Reached: {achieved}.',
      'result.warning.retry': 'Retry with a different seed',
      'result.warning.unknown': 'Notice from the generator: {code}'
    },
    vi: {
      'result.title': 'Kết quả',
      'result.word.title': 'Từ khóa',
      'result.word.unknown': 'Từ này không có trong từ điển của trò chơi nên chưa có giải nghĩa.',
      'result.word.pos.n': 'danh từ',
      'result.word.pos.v': 'động từ',
      'result.word.pos.a': 'tính từ',
      'result.word.pos.d': 'trạng từ',
      'result.word.pos.o': 'từ',
      'result.stat.difficulty': 'Độ khó',
      'result.score.sub': 'Điểm: {score}',
      'result.stat.clues': 'Số cho sẵn',
      'result.clues.of': 'trên {cells} ô',
      'result.techniques.title': 'Điểm độ khó',
      'result.techniques.section.technique': 'Kỹ thuật',
      'result.techniques.section.other': 'Khác',
      'result.techniques.none': 'Không cần kỹ thuật giải nào.',
      'result.techniques.col.name': 'Mục',
      'result.techniques.col.count': 'Lần dùng',
      'result.techniques.col.unit': 'Điểm mỗi lần',
      'result.techniques.col.work': 'Khối lượng',
      'result.techniques.col.score': 'Điểm',
      'result.techniques.col.count.short': 'n',
      'result.techniques.col.unit.short': 'w',
      'result.techniques.col.work.short': 'W',
      'result.techniques.col.score.short': 'q',
      'result.techniques.legend.1': 'n = lần dùng, w = điểm mỗi lần',
      'result.techniques.legend.2': 'W = khối lượng (n × w), q = điểm',
      'result.techniques.empties': 'Ô trống',
      'result.techniques.empties.desc': 'Các ô trống cộng 80 × E ÷ (E + 40) điểm, tối đa 80.',
      'result.techniques.total': 'Tổng',
      'result.techniques.help': 'Giải thích về “{name}”',
      'result.techniques.help.score': 'Cách tính điểm của “{name}”',
      'result.techniques.tip.work': 'Khối lượng của kỹ thuật này',
      'result.techniques.tip.all': 'Toàn bộ khối lượng của đề',
      'result.techniques.tip.term': 'Phần khối lượng của điểm số',
      'result.techniques.tip.share': 'Phần của nó trong phần khối lượng',
      'result.techniques.tip.hardest': 'Kỹ thuật khó nhất: đủ điểm của nó + phần của nó trong phần khối lượng',
      'result.techniques.tip.empties': 'Ô trống',
      'result.techniques.tip.total': 'Điểm số',
      'result.techniques.tip.shown': 'Hiển thị (đã làm tròn)',
      'result.techniques.tip.where.technique': 'n = số lần dùng, w = điểm mỗi lần, P = điểm của kỹ thuật khó nhất.',
      'result.techniques.tip.where.empties': 'E = số ô trống.',
      'result.techniques.tip.where.total': 'V = ô trống, P = kỹ thuật khó nhất, R = phần khối lượng.',
      'result.techniques.tip.rounding': 'Các dòng được làm tròn cùng nhau nên cộng lại đúng bằng tổng.',
      'result.warning.approximate.badge': 'Đề gần nhất tìm được',
      'result.warning.approximate.levels': 'Mức đã chọn: {requested}. Mức đạt được: {achieved}.',
      'result.warning.retry': 'Thử lại với seed khác',
      'result.warning.unknown': 'Lưu ý từ bộ tạo đề: {code}'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
