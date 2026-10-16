/**
 * Result panel (task T-4.8; design.md section 10.5): `SG.resultView`. What the user wants to know once a
 * puzzle is finished: a preview of the puzzle, the number of clues, the score and the level reached next to
 * the one that was asked for, the hardest technique, the technique chart, the time (total and per step),
 * the attempts, the seed and a share link that restores exactly this puzzle, and the solution switch. A
 * result that is only the closest puzzle found (warning `difficulty.approximate`) gets a yellow alert and a
 * "Retry with a different seed" button; the other warnings are listed, translated. No warning, no warning UI.
 *
 * Two layers, so everything that matters runs in Node:
 *  - `viewModel(result, ctx)` and `shareState(result, state)` are PURE: every displayed value (already
 *    formatted for the current language) and the warning keys, no DOM.
 *  - `create(rootEl, options)` renders a view model into `#result-root` and keeps it in step with the
 *    language.
 *
 * Context (`ctx`, plain data owned by the caller):
 *   state       the store state; the share link starts from it (`showSolution`, ...) and the puzzle's own
 *               configuration is laid over it, so the link always opens THIS puzzle, whatever the form
 *               says now
 *   baseUrl     the page address, `location.href` (query and fragment are dropped)
 *   showSolution  position of the solution switch
 *   imported    the puzzle was loaded, not generated (`result.source === 'import'` too): it has no share
 *               link, the form's seed would open a different puzzle
 * Strings are keys of `SG.i18n` (`result.*` fragment at the bottom of this file, plus the base packs).
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first definition on repeated loads.
  if (SG.resultView && typeof SG.resultView.create === 'function') return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SVG_DATA_URL = 'data:image/svg+xml;charset=utf-8,';
  const FALLBACK_STEPS = ['configure', 'buildModel', 'fullGrid', 'extraStructure', 'dig', 'rate', 'tune'];

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

  function formatDuration(ms) {
    return SG.i18n && typeof SG.i18n.formatDuration === 'function' ? SG.i18n.formatDuration(ms)
      : Math.round(ms) + ' ms';
  }

  function stepIds() {
    return SG.stepView && Array.isArray(SG.stepView.STEP_IDS) ? SG.stepView.STEP_IDS : FALLBACK_STEPS;
  }

  // ---------------------------------------------------------------------------------------------
  // Pure part
  // ---------------------------------------------------------------------------------------------

  function countClues(givens) {
    let n = 0;
    if (givens) for (let i = 0; i < givens.length; i++) if (givens[i] > 0) n++;
    return n;
  }

  /**
   * The store state that reproduces a result: the state of the form with the configuration that was really
   * used (including the seed, even when the seed field was blank) laid over it. The trace detail is a viewing
   * preference, not part of the puzzle, so the state keeps its own.
   * @param {Object} result  A `PuzzleResult`.
   * @param {Object} [state]  The current store state (its preferences and `showSolution` are kept).
   * @returns {Object}
   */
  function shareState(result, state) {
    const config = result && result.config ? result.config : {};
    const next = Object.assign({}, state || {});
    ['variantId', 'difficulty', 'symmetry', 'symbolMode', 'digOrder', 'maxAttempts']
      .forEach(function (key) {
        if (config[key] !== undefined) next[key] = config[key];
      });
    if (config.variantOptions !== undefined) next.variantOptions = Object.assign({}, config.variantOptions);
    if (result && result.seed !== undefined && result.seed !== null) next.seed = String(result.seed);
    return next;
  }

  /**
   * Whether a puzzle was loaded (import) and not generated here: no seed reproduces it, so there is no link.
   * @param {Object} result
   * @param {Object} [ctx]  `imported` (the app sets it for a puzzle it did not generate).
   * @returns {boolean}
   */
  function isImported(result, ctx) {
    return !!((result && result.source === 'import') || (ctx && ctx.imported === true));
  }

  /**
   * The link that opens a result again and generates it on load.
   * @param {Object} result
   * @param {Object} [ctx]  `state`, `baseUrl`, `imported`.
   * @returns {string} '' when `SG.store` is not loaded or the puzzle was imported.
   */
  function shareLink(result, ctx) {
    if (!SG.store || typeof SG.store.shareUrl !== 'function') return '';
    const c = ctx || {};
    if (isImported(result, c)) return '';
    return SG.store.shareUrl(shareState(result, c.state), c.baseUrl === undefined ? '' : c.baseUrl,
      { auto: true });
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

  function stepName(id) {
    const key = 'step.' + id + '.name';
    return hasText(key) ? t(key) : id;
  }

  /** Time per step; `ratio` is the share of the slowest step (0..1), for the bars. */
  function stepTimes(timings) {
    const source = timings && typeof timings === 'object' ? timings : {};
    const rows = stepIds().map(function (id) {
      const ms = typeof source[id] === 'number' && isFinite(source[id]) ? Math.max(0, source[id]) : 0;
      return { id: id, name: stepName(id), ms: ms };
    });
    let max = 0;
    rows.forEach(function (row) { if (row.ms > max) max = row.ms; });
    rows.forEach(function (row) {
      row.text = formatDuration(row.ms);
      row.ratio = max > 0 ? Math.round(row.ms / max * 1000) / 1000 : 0;
    });
    return rows;
  }

  /**
   * Everything the panel shows for a result, in the current language.
   * @param {Object} result  A `PuzzleResult`.
   * @param {Object} [ctx]  See the file header.
   * @returns {?{variantId: string, variantName: string, requested: string, requestedName: string,
   *   achieved: string, achievedName: string, exact: boolean, clues: number, cells: number,
   *   cluesText: string, score: number, scoreText: string, hardest: ?string, hardestName: string,
   *   techniqueCounts: Object<string, number>, chart: ?Object, totalMs: number, totalText: string,
   *   steps: Array<{id: string, name: string, ms: number, text: string, ratio: number}>, attempts: number,
   *   attemptsText: string, seed: string, shareUrl: string, imported: boolean,
   *   warnings: Array<{key: string, kind: string, text: string}>, warningKeys: string[],
   *   approximate: boolean, retryAvailable: boolean,
   *   solutionShown: boolean, previewAlt: string}} `null` for a missing result.
   */
  function viewModel(result, ctx) {
    if (result === null || typeof result !== 'object') return null;
    const c = ctx || {};
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
    const hardest = typeof rating.hardestTechnique === 'string' ? rating.hardestTechnique : null;
    const steps = stepTimes(result.timings);
    let totalMs = 0;
    steps.forEach(function (row) { totalMs += row.ms; });
    const warnings = warningModels(result);
    const approximate = warnings.some(function (w) { return w.kind === 'approximate'; });
    const attempts = typeof result.attempts === 'number' ? result.attempts : 1;
    const variantName = nameOf('variant.', variantId);
    const achievedName = nameOf('difficulty.', achieved);
    return {
      variantId: variantId,
      variantName: variantName,
      requested: requested,
      requestedName: nameOf('difficulty.', requested),
      achieved: achieved,
      achievedName: achievedName,
      exact: requested === achieved,
      clues: clues,
      cells: cells,
      cluesText: t('result.clues.of', { cells: formatNumber(cells) }),
      score: score,
      scoreText: formatNumber(Math.round(score)),
      hardest: hardest,
      hardestName: hardest === null ? t('result.hardest.none') : nameOf('technique.', hardest),
      techniqueCounts: Object.assign({}, counts),
      chart: SG.stepView && typeof SG.stepView.chartModel === 'function'
        ? SG.stepView.chartModel(counts) : null,
      totalMs: totalMs,
      totalText: formatDuration(totalMs),
      steps: steps,
      attempts: attempts,
      attemptsText: t('unit.attempt', { count: attempts }),
      seed: result.seed === undefined || result.seed === null ? '' : String(result.seed),
      shareUrl: shareLink(result, c),
      imported: isImported(result, c),
      warnings: warnings,
      warningKeys: warnings.map(function (w) { return w.key; }),
      approximate: approximate,
      retryAvailable: approximate,
      solutionShown: c.showSolution === true,
      previewAlt: t('result.preview.alt', { variant: variantName, level: achievedName })
    };
  }

  // ---------------------------------------------------------------------------------------------
  // DOM
  // ---------------------------------------------------------------------------------------------

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
   * @property {function(Object): ?string} [thumbnail]  `(result) -> standalone SVG text` of the puzzle.
   * @property {function(): void} [onRetry]  The "Retry with a different seed" button.
   * @property {function(): void} [onPlayOnline]  The "Play online" button (opens the puzzle in sudoku-player);
   *   without it there is no such button.
   * @property {function(boolean): void} [onToggleSolution]  The solution switch.
   * @property {function(string, string, Object=): void} [notify]  `(kind, messageKey, args)`: feedback of
   *   the copy buttons ('success' | 'danger').
   * @property {function(string): Promise<boolean>} [copy]  Writes text to the clipboard; default
   *   `SG.controls.copyText`.
   */

  /**
   * Renders the panel into `#result-root` (the element is emptied first and keeps nothing else).
   * @param {Element} rootEl
   * @param {ResultViewOptions} [options]
   * @returns {{show: function(Object, Object=): void, clear: function(): void,
   *   refresh: function(Object=): void, destroy: function(): void, isShown: function(): boolean}}
   *   `show(result, ctx)` replaces the panel; `clear()` empties it; `refresh(patch)` re-translates and
   *   redraws, after merging `patch` into the context (the solution switch and the link follow it without a
   *   rebuild); `destroy()` removes the listener and the panel.
   */
  function create(rootEl, options) {
    if (!rootEl || typeof rootEl.appendChild !== 'function') {
      throw new TypeError('SG.resultView.create needs the #result-root element');
    }
    const opts = options || {};
    const doc = rootEl.ownerDocument;
    let result = null;
    let ctx = {};
    let parts = null;
    let destroyed = false;

    function notify(kind, key, args) {
      if (typeof opts.notify === 'function') opts.notify(kind, key, args || {});
    }

    function copy(text, okKey, failKey) {
      const write = typeof opts.copy === 'function' ? opts.copy
        : (SG.controls && typeof SG.controls.copyText === 'function' ? SG.controls.copyText : null);
      const done = function (ok) {
        if (destroyed) return;
        if (ok) notify('success', okKey);
        else notify('danger', failKey);
      };
      if (write === null) {
        done(false);
        return;
      }
      Promise.resolve(write(text, doc)).then(done, function () { done(false); });
    }

    function stat(role, label, value, sub) {
      const dd = make(doc, 'dd', { class: 'stat__value', text: value });
      const children = [make(doc, 'dt', { class: 'stat__label', text: label }), dd];
      if (sub) children.push(make(doc, 'dd', { class: 'stat__sub', text: sub }));
      return make(doc, 'div', { class: 'stat', 'data-stat': role }, children);
    }

    function barRow(kind, id, label, valueText, ratio) {
      const bar = make(doc, 'span', { class: 'result-bars__bar' });
      bar.style.setProperty('--ratio', String(ratio));
      const attrs = { class: 'result-bars__row' };
      attrs['data-' + kind] = id;
      return make(doc, 'li', attrs, [
        make(doc, 'span', { class: 'result-bars__label', text: label }),
        make(doc, 'span', { class: 'result-bars__value', text: valueText }),
        make(doc, 'span', { class: 'result-bars__track', 'aria-hidden': 'true' }, [bar])
      ]);
    }

    function copyRow(role, label, control, buttonKey, onCopy) {
      const button = make(doc, 'button', {
        type: 'button', class: 'btn btn--secondary btn--sm', 'data-role': role + '-copy'
      }, [icon(doc, 'copy'), make(doc, 'span', { class: 'btn__label', text: t(buttonKey) })]);
      button.addEventListener('click', onCopy);
      return make(doc, 'div', { class: 'result__field', 'data-field': role }, [
        make(doc, 'span', { class: 'result__field-label', text: label }),
        make(doc, 'div', { class: 'input-group' }, [control, button])
      ]);
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

    function techniques(vm) {
      const box = make(doc, 'section', { class: 'result__section', 'data-section': 'techniques' }, [
        make(doc, 'h3', { class: 'panel__subtitle', text: t('result.techniques.title') })
      ]);
      if (vm.chart === null || vm.chart.empty) {
        box.appendChild(make(doc, 'p', { class: 'text-muted', text: t('result.techniques.none') }));
        return box;
      }
      const rows = vm.chart.bars.map(function (bar) {
        return barRow('technique', bar.id, bar.label, formatNumber(bar.count), bar.ratio);
      });
      box.appendChild(make(doc, 'ul', { class: 'result-bars', role: 'list' }, rows));
      return box;
    }

    function times(vm) {
      return make(doc, 'section', { class: 'result__section', 'data-section': 'times' }, [
        make(doc, 'h3', { class: 'panel__subtitle', text: t('result.times.title') }),
        make(doc, 'ul', { class: 'result-bars', role: 'list' }, vm.steps.map(function (row) {
          return barRow('step', row.id, row.name, row.text, row.ratio);
        }))
      ]);
    }

    function build(vm) {
      const seed = make(doc, 'input', {
        class: 'input mono', type: 'text', readonly: true, value: vm.seed, 'data-role': 'seed',
        'aria-label': t('result.seed.label')
      });
      const link = vm.imported ? null : make(doc, 'input', {
        class: 'input', type: 'text', readonly: true, value: vm.shareUrl, 'data-role': 'link',
        'aria-label': t('result.link.label')
      });
      [seed, link].forEach(function (input) {
        if (input) input.addEventListener('focus', function () { input.select(); });
      });
      const solutionInput = make(doc, 'input', {
        class: 'switch__input', type: 'checkbox', role: 'switch', id: 'result-solution',
        'data-role': 'solution'
      });
      solutionInput.checked = vm.solutionShown;
      solutionInput.addEventListener('change', function () {
        ctx.showSolution = solutionInput.checked;
        if (typeof opts.onToggleSolution === 'function') opts.onToggleSolution(solutionInput.checked);
      });

      const header = make(doc, 'header', { class: 'result__header' }, [
        make(doc, 'h2', { class: 'card__title', id: 'result-title', text: t('result.title') })
      ]);
      if (vm.approximate) {
        header.appendChild(make(doc, 'span', { class: 'badge badge--warning', 'data-role': 'badge' }, [
          icon(doc, 'alert'), make(doc, 'span', { text: t('result.warning.approximate.badge') })
        ]));
      }

      const levelSub = t('result.requested', { level: vm.requestedName });
      const stats = make(doc, 'dl', { class: 'stat-grid' }, [
        stat('level', t('result.stat.level'), vm.achievedName, levelSub),
        stat('clues', t('result.stat.clues'), formatNumber(vm.clues), vm.cluesText),
        stat('score', t('result.stat.score'), vm.scoreText),
        stat('hardest', t('result.stat.hardest'), vm.hardestName),
        stat('time', t('result.stat.time'), vm.totalText),
        stat('attempts', t('result.stat.attempts'), vm.attemptsText)
      ]);

      const mainRows = [stats];
      // An imported puzzle without a seed has nothing to copy, and no link either.
      if (vm.seed !== '') {
        mainRows.push(copyRow('seed', t('result.seed.label'), seed, 'result.seed.copy', function () {
          copy(vm.seed, 'result.seed.copied', 'result.seed.copyFailed');
        }));
      }
      mainRows.push(link === null
        ? make(doc, 'p', { class: 'result__field text-muted', 'data-field': 'link-unavailable',
          text: t('result.link.unavailable') })
        : copyRow('link', t('result.link.label'), link, 'result.link.copy', function () {
          copy(link.value, 'result.link.copied', 'result.link.copyFailed');
        }));
      if (typeof opts.onPlayOnline === 'function') {
        const playOnline = make(doc, 'button', {
          type: 'button', class: 'btn btn--secondary btn--sm', 'data-role': 'play-online',
          title: t('result.playOnline.title')
        }, [icon(doc, 'play'), make(doc, 'span', { class: 'btn__label', text: t('result.playOnline') })]);
        playOnline.addEventListener('click', function () { opts.onPlayOnline(); });
        mainRows.push(make(doc, 'div', { class: 'result__field', 'data-field': 'play-online' }, [
          make(doc, 'div', { class: 'cluster' }, [playOnline])
        ]));
      }
      mainRows.push(make(doc, 'label', { class: 'switch', for: 'result-solution' }, [
        solutionInput,
        make(doc, 'span', { class: 'switch__track', 'aria-hidden': 'true' }),
        make(doc, 'span', { class: 'switch__text', text: t('result.solution.toggle') })
      ]));
      const main = make(doc, 'div', { class: 'result__main stack' }, mainRows);

      const body = make(doc, 'div', { class: 'result__body' });
      const svg = typeof opts.thumbnail === 'function' ? opts.thumbnail(result) : null;
      if (typeof svg === 'string' && svg !== '') {
        body.appendChild(make(doc, 'figure', { class: 'result__preview' }, [
          make(doc, 'img', {
            class: 'result__preview-img', src: SVG_DATA_URL + encodeURIComponent(svg), alt: vm.previewAlt,
            'data-role': 'preview'
          })
        ]));
      }
      body.appendChild(main);

      const card = make(doc, 'article', {
        class: 'card result', 'aria-labelledby': 'result-title',
        'data-approximate': vm.approximate ? 'true' : 'false'
      }, [header]);
      warningBlock(vm).forEach(function (node) { card.appendChild(node); });
      card.appendChild(body);
      card.appendChild(make(doc, 'div', { class: 'result__sections' }, [techniques(vm), times(vm)]));
      return { card: card, solution: solutionInput, link: link, vm: vm };
    }

    function render() {
      const active = doc.activeElement && doc.activeElement.getAttribute && rootEl.contains(doc.activeElement)
        ? doc.activeElement.getAttribute('data-role') : null;
      if (result === null) {
        parts = null;
        rootEl.textContent = '';
        return;
      }
      const vm = viewModel(result, ctx);
      parts = build(vm);
      rootEl.textContent = '';
      rootEl.appendChild(parts.card);
      if (active !== null) {
        const again = rootEl.querySelector('[data-role="' + active + '"]');
        if (again && typeof again.focus === 'function') again.focus();
      }
    }

    const unsubscribe = SG.i18n && typeof SG.i18n.onChange === 'function' ? SG.i18n.onChange(function () {
      if (!destroyed && result !== null) render();
    }) : null;

    return {
      show: function show(next, nextCtx) {
        if (destroyed) return;
        result = next && typeof next === 'object' ? next : null;
        ctx = Object.assign({}, nextCtx || {});
        render();
      },
      clear: function clear() {
        result = null;
        ctx = {};
        render();
      },
      refresh: function refresh(patch) {
        if (destroyed || result === null) return;
        if (patch && typeof patch === 'object') {
          Object.assign(ctx, patch);
          if (parts !== null) {
            parts.solution.checked = ctx.showSolution === true;
            if (parts.link !== null) parts.link.value = shareLink(result, ctx);
            return;
          }
        }
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
        parts = null;
        rootEl.textContent = '';
      }
    };
  }

  SG.resultView = {
    WARNING_KINDS: WARNING_KINDS,
    viewModel: viewModel,
    shareState: shareState,
    shareLink: shareLink,
    create: create
  };

  // ---------------------------------------------------------------------------------------------
  // Strings of the panel
  // ---------------------------------------------------------------------------------------------

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'result.title': 'Result',
      'result.preview.alt': 'Preview of the generated puzzle: {variant}, {level}',
      'result.stat.level': 'Level reached',
      'result.requested': 'Requested: {level}',
      'result.stat.clues': 'Clues',
      'result.clues.of': 'of {cells} cells',
      'result.stat.score': 'Difficulty score',
      'result.stat.hardest': 'Hardest technique',
      'result.hardest.none': 'None needed',
      'result.stat.time': 'Total time',
      'result.stat.attempts': 'Attempts',
      'result.seed.label': 'Seed',
      'result.seed.copy': 'Copy seed',
      'result.seed.copied': 'Seed copied.',
      'result.seed.copyFailed': 'Could not copy the seed. Select it and copy it by hand.',
      'result.link.label': 'Share link',
      'result.link.copy': 'Copy link',
      'result.link.copied': 'Link copied.',
      'result.link.copyFailed': 'Could not copy the link. Select it and copy it by hand.',
      'result.link.unavailable': 'No share link: an imported puzzle cannot be rebuilt from a seed.',
      'result.playOnline': 'Play online',
      'result.playOnline.title': 'Open this puzzle in sudoku-player, in a new tab',
      'result.solution.toggle': 'Show the solution',
      'result.techniques.title': 'Techniques used',
      'result.techniques.none': 'No solving techniques were needed.',
      'result.times.title': 'Time per step',
      'result.warning.approximate.badge': 'Closest puzzle found',
      'result.warning.approximate.levels': 'Requested: {requested}. Reached: {achieved}.',
      'result.warning.retry': 'Retry with a different seed',
      'result.warning.unknown': 'Notice from the generator: {code}'
    },
    vi: {
      'result.title': 'Kết quả',
      'result.preview.alt': 'Ảnh xem trước đề vừa tạo: {variant}, {level}',
      'result.stat.level': 'Mức độ đạt được',
      'result.requested': 'Đã chọn: {level}',
      'result.stat.clues': 'Số cho sẵn',
      'result.clues.of': 'trên {cells} ô',
      'result.stat.score': 'Điểm độ khó',
      'result.stat.hardest': 'Kỹ thuật khó nhất',
      'result.hardest.none': 'Không cần kỹ thuật nào',
      'result.stat.time': 'Tổng thời gian',
      'result.stat.attempts': 'Số lần thử',
      'result.seed.label': 'Seed',
      'result.seed.copy': 'Sao chép seed',
      'result.seed.copied': 'Đã sao chép seed.',
      'result.seed.copyFailed': 'Không sao chép được seed. Hãy bôi đen và sao chép thủ công.',
      'result.link.label': 'Liên kết chia sẻ',
      'result.link.copy': 'Sao chép liên kết',
      'result.link.copied': 'Đã sao chép liên kết.',
      'result.link.copyFailed': 'Không sao chép được liên kết. Hãy bôi đen và sao chép thủ công.',
      'result.link.unavailable':
        'Không có liên kết chia sẻ: không thể dựng lại một đề đã nhập từ hạt giống (seed).',
      'result.playOnline': 'Chơi trực tuyến',
      'result.playOnline.title': 'Mở đề này trong sudoku-player, ở một thẻ mới',
      'result.solution.toggle': 'Hiện lời giải',
      'result.techniques.title': 'Kỹ thuật đã dùng',
      'result.techniques.none': 'Không cần kỹ thuật giải nào.',
      'result.times.title': 'Thời gian từng bước',
      'result.warning.approximate.badge': 'Đề gần nhất tìm được',
      'result.warning.approximate.levels': 'Mức đã chọn: {requested}. Mức đạt được: {achieved}.',
      'result.warning.retry': 'Thử lại với seed khác',
      'result.warning.unknown': 'Lưu ý từ bộ tạo đề: {code}'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
