/**
 * Result panel (task T-4.8; design.md section 10.5): `SG.resultView`. What the user wants to know once a
 * puzzle is finished: two small cards (the level reached with its difficulty score, and the number of
 * clues) and a table of the techniques used with how often each was applied and what each adds to the
 * score. A Wordoku result also gets a card with its key word and what the word means, while the "Show the
 * solution" setting is on. A result that is only the closest puzzle found (warning `difficulty.approximate`) gets a yellow
 * alert and a "Retry with a different seed" button; the other warnings are listed, translated. No warning,
 * no warning UI.
 *
 * Two layers, so everything that matters runs in Node:
 *  - `viewModel(result)` is PURE: every displayed value (already formatted for the current language) and
 *    the warning keys, no DOM.
 *  - `create(rootEl, options)` renders a view model into `#result-root` and keeps it in step with the
 *    language.
 *
 * Strings are keys of `SG.i18n` (`result.*` fragment at the bottom of this file, plus the base packs).
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first definition on repeated loads.
  if (SG.resultView && typeof SG.resultView.create === 'function') return;

  const SVG_NS = 'http://www.w3.org/2000/svg';

  /** Word-book part of speech -> key of its name. */
  const POS_KEYS = Object.freeze({
    n: 'result.word.pos.n', v: 'result.word.pos.v', a: 'result.word.pos.a', d: 'result.word.pos.d',
    o: 'result.word.pos.o'
  });

  /** Warning key -> kind; any other key is listed as 'other'. */
  const WARNING_KINDS = Object.freeze({
    'difficulty.approximate': 'approximate',
    'digger.unsoundTechnique': 'unsound',
    'trace.downgraded': 'downgraded'
  });

  // ---------------------------------------------------------------------------------------------
  // Texts
  // ---------------------------------------------------------------------------------------------

  function t(key, args) {
    return SG.i18n && typeof SG.i18n.t === 'function' ? SG.i18n.t(key, args) : key;
  }

  function hasText(key) {
    return !!(SG.i18n && typeof SG.i18n.has === 'function' && SG.i18n.has(key));
  }

  /** The translated name of an id (`difficulty.hard`, `technique.xWing`), the id itself when unknown. */
  function nameOf(prefix, id) {
    return hasText(prefix + id) ? t(prefix + id) : String(id);
  }

  function formatNumber(n, options) {
    return SG.i18n && typeof SG.i18n.formatNumber === 'function' ? SG.i18n.formatNumber(n, options)
      : String(n);
  }

  // ---------------------------------------------------------------------------------------------
  // Pure part
  // ---------------------------------------------------------------------------------------------

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
   * The techniques the puzzle needs, simplest first (the order of the technique ladder), each with the number
   * of times it was applied and what it adds to the difficulty score.
   */
  function techniqueRows(counts) {
    const chart = SG.stepView && typeof SG.stepView.chartModel === 'function'
      ? SG.stepView.chartModel(counts) : null;
    const ids = chart !== null ? chart.bars.map(function (bar) { return bar.id; })
      : Object.keys(counts).filter(function (id) { return counts[id] > 0; }).sort();
    return ids.map(function (id) {
      const count = counts[id];
      const score = SG.difficulty && typeof SG.difficulty.techniqueScore === 'function'
        ? SG.difficulty.techniqueScore(id, count) : 0;
      const unit = SG.difficulty && typeof SG.difficulty.costOf === 'function' ? SG.difficulty.costOf(id) : 0;
      const descKey = 'technique.' + id + '.desc';
      return {
        id: id,
        name: nameOf('technique.', id),
        summary: hasText(descKey) ? t(descKey) : '',
        count: count,
        countText: formatNumber(count),
        unitScore: unit,
        unitScoreText: formatNumber(unit, { maximumFractionDigits: 2 }),
        score: score,
        scoreText: formatNumber(Math.round(score))
      };
    });
  }

  /**
   * How the score of the puzzle adds up: the techniques, the empty cells (the bonus of each) and what the
   * hardest technique raises the score to when that is higher. Every part is a whole number and the parts add
   * up to the rounded score (`SG.stepView.roundToTotal`); the technique rows get their `scoreText` from here.
   * @returns {{empties: number, emptyUnit: number, emptyText: string, raised: number, raisedText: string,
   *   totalText: string}}
   */
  function scoreBreakdown(rows, rating, score) {
    const bonus = SG.difficulty && SG.difficulty.SCORING && typeof SG.difficulty.SCORING.emptyCellBonus === 'number'
      ? SG.difficulty.SCORING.emptyCellBonus : 0;
    const empties = typeof rating.empties === 'number' && rating.empties > 0 ? rating.empties : 0;
    const emptyPoints = empties * bonus;
    const techniqueTotal = rows.reduce(function (sum, row) { return sum + row.score; }, 0);
    const raised = Math.max(0, score - (techniqueTotal + emptyPoints));
    const hasRaised = raised >= 0.5;
    const values = rows.map(function (row) { return row.score; });
    if (emptyPoints > 0) values.push(emptyPoints);
    if (hasRaised) values.push(raised);
    const whole = SG.stepView && typeof SG.stepView.roundToTotal === 'function'
      ? SG.stepView.roundToTotal(values, score) : values.map(Math.round);
    rows.forEach(function (row, i) { row.scoreText = formatNumber(whole[i]); });
    let next = rows.length;
    return {
      empties: emptyPoints > 0 ? empties : 0,
      emptyUnit: bonus,
      emptyText: emptyPoints > 0 ? formatNumber(whole[next++]) : '',
      raised: hasRaised ? raised : 0,
      raisedText: hasRaised ? formatNumber(whole[next++]) : '',
      totalText: formatNumber(Math.round(score))
    };
  }

  /**
   * Everything the panel shows for a result, in the current language.
   * @param {Object} result  A `PuzzleResult`.
   * @returns {?{variantId: string, variantName: string, requested: string, requestedName: string,
   *   achieved: string, achievedName: string, exact: boolean, clues: number, cells: number,
   *   cluesText: string, score: number, scoreText: string, techniqueCounts: Object<string, number>,
   *   techniques: Array<{id: string, name: string, summary: string, count: number, countText: string,
   *   unitScore: number, unitScoreText: string, score: number, scoreText: string}>,
   *   warnings: Array<{key: string, kind: string, text: string}>,
   *   warningKeys: string[], approximate: boolean, retryAvailable: boolean}} `null` for a missing result.
   */
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
    const techniques = techniqueRows(counts);
    const breakdown = scoreBreakdown(techniques, rating, score);
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

  // ---------------------------------------------------------------------------------------------
  // DOM
  // ---------------------------------------------------------------------------------------------

  /**
   * The key word of a Wordoku result and what it means, for the card of the panel.
   * @param {Object} result  A `PuzzleResult`.
   * @returns {?{word: string, text: string, language: string, posName: string, meaning: string,
   *   other: string}} `null` when the puzzle is not a Wordoku. A word without an entry in the word book
   *   (one the user typed) gives its letters and no meaning.
   */
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

  /** Creates an element; attribute values of null / undefined / false are skipped, `true` gives ''. */
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
   * @property {function(): boolean} [showWord]  Whether a Wordoku result gets the card with its key word and
   *   the meaning (the "Show the solution" setting); without it there is no such card.
   */

  /**
   * Renders the panel into `#result-root` (the element is emptied first and keeps nothing else).
   * @param {Element} rootEl
   * @param {ResultViewOptions} [options]
   * @returns {{show: function(Object): void, clear: function(): void, refresh: function(): void,
   *   destroy: function(): void, isShown: function(): boolean}}
   *   `show(result)` replaces the panel; `clear()` empties it; `refresh()` re-translates and redraws;
   *   `destroy()` removes the listener and the panel.
   */
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

    /** The small "?" next to a name: its text opens on hover, focus and click; Esc closes it. */
    function helpTip(popId, text, name) {
      const pop = make(doc, 'div', {
        class: 'help-tip__pop', id: popId, role: 'tooltip', text: text
      });
      const button = make(doc, 'button', {
        type: 'button', class: 'help-tip__btn', 'aria-describedby': popId,
        'aria-label': t('result.techniques.help', { name: name })
      }, [icon(doc, 'help')]);
      const wrap = make(doc, 'span', { class: 'help-tip help-tip--inline' }, [button, pop]);
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

    function techniqueHelp(row) {
      return helpTip('result-tech-' + row.id + '-help', row.summary, row.name);
    }

    /** A row header of a row that is not a technique: the name and its "?". */
    function partHeader(part, name, text) {
      return make(doc, 'th', { scope: 'row' }, [make(doc, 'span', { class: 'result-table__name' }, [
        make(doc, 'span', { text: name }), helpTip('result-part-' + part + '-help', text, name)
      ])]);
    }

    /** The rows that complete the technique rows to the score: the empty cells, and the raise to the level. */
    function extraRows(vm) {
      const out = [];
      const blank = function () { return make(doc, 'td', { class: 'result-table__num', text: '' }); };
      if (vm.parts.empties > 0) {
        const unit = formatNumber(vm.parts.emptyUnit, { maximumFractionDigits: 2 });
        out.push(make(doc, 'tr', { 'data-part': 'empties' }, [
          partHeader('empties', t('result.techniques.empties'), t('result.techniques.empties.desc', { points: unit })),
          make(doc, 'td', { class: 'result-table__num', text: formatNumber(vm.parts.empties) }),
          make(doc, 'td', { class: 'result-table__num', text: unit }),
          make(doc, 'td', { class: 'result-table__num', text: vm.parts.emptyText })
        ]));
      }
      if (vm.parts.raised > 0) {
        out.push(make(doc, 'tr', { 'data-part': 'floor' }, [
          partHeader('floor', t('result.techniques.floor'), t('result.techniques.floor.desc')),
          blank(),
          blank(),
          make(doc, 'td', { class: 'result-table__num', text: vm.parts.raisedText })
        ]));
      }
      return out;
    }

    /** A heading row that opens a group of rows of the table ("Technique", "Other"). */
    function sectionRow(key) {
      return make(doc, 'tr', { class: 'result-table__section', 'data-section-row': key }, [
        make(doc, 'th', { scope: 'colgroup', colspan: '4', text: t('result.techniques.section.' + key) })
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
        return make(doc, 'th', { scope: 'col', class: 'result-table__num', text: t(key) });
      };
      const head = make(doc, 'tr', {}, [
        make(doc, 'th', { scope: 'col' }, [
          make(doc, 'span', { class: 'visually-hidden', text: t('result.techniques.col.name') })
        ]),
        num('result.techniques.col.count'),
        num('result.techniques.col.unit'),
        num('result.techniques.col.score')
      ]);
      const rows = vm.techniques.map(function (row) {
        const name = [make(doc, 'span', { text: row.name })];
        if (row.summary !== '') name.push(techniqueHelp(row));
        return make(doc, 'tr', { 'data-technique': row.id }, [
          make(doc, 'th', { scope: 'row' }, [make(doc, 'span', { class: 'result-table__name' }, name)]),
          make(doc, 'td', { class: 'result-table__num', text: row.countText }),
          make(doc, 'td', { class: 'result-table__num', text: row.unitScoreText }),
          make(doc, 'td', { class: 'result-table__num', text: row.scoreText })
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
          make(doc, 'td', { class: 'result-table__num', text: vm.parts.totalText })
        ])])
      ])));
      box.appendChild(make(doc, 'p', { class: 'text-muted result__note', text: t('result.techniques.note') }));
      return box;
    }

    /** The key word as a stat box like Difficulty and Clues: label, word, then the meaning in small print. */
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

  // ---------------------------------------------------------------------------------------------
  // Strings of the panel
  // ---------------------------------------------------------------------------------------------

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
      'result.techniques.col.unit': 'Points',
      'result.techniques.col.score': 'Total',
      'result.techniques.empties': 'Empty cells',
      'result.techniques.empties.desc': 'Every cell that is empty at the start adds {points} points: the fewer clues ' +
        'a puzzle gives, the more there is to solve.',
      'result.techniques.floor': 'Bonus points for difficult techniques',
      'result.techniques.floor.desc': 'Every level has a minimum score. When the hardest technique the puzzle needs ' +
        'belongs to a higher level than the points above give, bonus points bring the score up to the minimum of ' +
        'that level.',
      'result.techniques.total': 'Total',
      'result.techniques.note': 'The first use of a technique counts 1.5 times.',
      'result.techniques.help': 'About “{name}”',
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
      'result.techniques.col.unit': 'Điểm',
      'result.techniques.col.score': 'Tổng',
      'result.techniques.empties': 'Ô trống',
      'result.techniques.empties.desc': 'Mỗi ô trống ban đầu cộng thêm {points} điểm: đề càng ít số cho sẵn thì càng ' +
        'còn nhiều việc phải giải.',
      'result.techniques.floor': 'Điểm thưởng cho kỹ thuật khó',
      'result.techniques.floor.desc': 'Mỗi độ khó có một điểm tối thiểu. Khi kỹ thuật khó nhất mà đề cần thuộc về ' +
        'một độ khó cao hơn so với số điểm ở trên, điểm thưởng được cộng thêm để đạt mức tối thiểu của độ khó đó.',
      'result.techniques.total': 'Tổng',
      'result.techniques.note': 'Lần dùng đầu tiên của mỗi kỹ thuật được tính 1,5 lần.',
      'result.techniques.help': 'Giải thích về “{name}”',
      'result.warning.approximate.badge': 'Đề gần nhất tìm được',
      'result.warning.approximate.levels': 'Mức đã chọn: {requested}. Mức đạt được: {achieved}.',
      'result.warning.retry': 'Thử lại với seed khác',
      'result.warning.unknown': 'Lưu ý từ bộ tạo đề: {code}'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
