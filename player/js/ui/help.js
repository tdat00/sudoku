/**
 * Help (design.md section 8.3): `SG.help`, the page `help.html` that the Help button of the player opens in a
 * new tab (there is no dialog).
 *
 * The page has four sections: the basics of playing, how the hints work (the hints are part of the guide), the
 * techniques that solve harder puzzles - each with a REAL example - and the keyboard. The techniques are in
 * groups, and each group has a tab for every technique: the tab shows what the technique says and a board drawn
 * the way the hint card of the player draws it. The table of contents on the side lists the sections, the groups
 * and the names of the techniques.
 *
 * The examples are fixed data, not computed when the page opens: `SG.helpExamples[id]` (js/ui/help-examples.js,
 * made by tests/tools/make-technique-examples.js) is a snapshot of a puzzle partway through, with the notes of the
 * cells that matter and what the player's own hint said at that moment. `buildExample` turns it into a board and a
 * hint, `drawExample` draws it with `SG.play.renderSnapshot` and the words of `SG.play.describeHint`, so the text
 * is the hint's, in either language.
 *
 * PUBLIC API (`SG.help`)
 *   SECTION_IDS            the sections, in order.
 *   BASIC_STEPS            the steps of the basics.
 *   SHORTCUTS              the rows of the keyboard section.
 *   buildExample(id)       -> { id, variantId, model, givens, values, notes, hint } | null. Pure (no DOM).
 *   drawExample(el, id)    draws the example of a technique, its explanation and a legend into `el`.
 *   selectTechnique(id)    shows the tab of a technique (and draws its example); false when it is not on the page.
 *   render(rootEl?)        builds the sections into `#help-root` (and the contents into `#help-toc`).
 *   start()                what help.html calls at load: language and theme from the stored preferences, the
 *                          header switches, the first render; returns false on a page without `#help-root`.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first instance on repeated loads.
  if (SG.help && typeof SG.help.start === 'function') return;

  const SECTION_IDS = Object.freeze(['how', 'hints', 'techniques', 'keys']);

  /** The steps of "the basics", in order: the texts are `help.how.<id>.title` and `.text`. */
  const BASIC_STEPS = Object.freeze(['get', 'select', 'enter', 'notes', 'check', 'hint', 'play', 'symbols',
    'save', 'solved']);

  /** The keyboard section: the keys of each row and the key of its description. */
  const SHORTCUTS = Object.freeze([
    Object.freeze({ id: 'move',
      keys: Object.freeze([['←', '→', '↑', '↓'], ['Home', 'End'], ['Page Up', 'Page Down']]) }),
    Object.freeze({ id: 'enter', keys: Object.freeze([['1…9', 'A…Z']]) }),
    Object.freeze({ id: 'erase', keys: Object.freeze([['Backspace'], ['Delete'], ['Space']]) }),
    Object.freeze({ id: 'notes', keys: Object.freeze([['N'], ['`']]) }),
    Object.freeze({ id: 'hint', keys: Object.freeze([['H']]) }),
    Object.freeze({ id: 'undo', keys: Object.freeze([['Ctrl', 'Z']]) }),
    Object.freeze({ id: 'redo', keys: Object.freeze([['Ctrl', 'Y'], ['Ctrl', 'Shift', 'Z']]) }),
    Object.freeze({ id: 'escape', keys: Object.freeze([['Esc']]) }),
    Object.freeze({ id: 'tab', keys: Object.freeze([['Tab']]) }),
    Object.freeze({ id: 'paste', keys: Object.freeze([['Ctrl', 'V']]) }),
    Object.freeze({ id: 'openBox', keys: Object.freeze([['Ctrl', 'Enter']]) })
  ]);

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const WIDE_QUERY = '(min-width: 60rem)';

  /** Where each technique's tab and panel are, by technique id (rebuilt by every render). */
  const tabs = new Map();

  function t(key, args) {
    return SG.i18n.t(key, args);
  }

  function logError(err) {
    if (typeof console !== 'undefined' && typeof console.error === 'function') console.error(err);
  }

  function h(tag, attrs, children) {
    const node = root.document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (name) {
      const value = attrs[name];
      if (value === null || value === undefined || value === false) return;
      if (name === 'class') node.className = value;
      else if (name === 'text') node.textContent = value;
      else node.setAttribute(name, value === true ? '' : String(value));
    });
    (children || []).forEach(function (child) { if (child) node.appendChild(child); });
    return node;
  }

  // ---------------------------------------------------------------------------------------------
  // The examples
  // ---------------------------------------------------------------------------------------------

  /** The cell digits of a snapshot string (81 characters, '.' for an empty cell). */
  function digitsOf(text) {
    return Array.from(text).map(function (ch) { return ch === '.' ? 0 : Number(ch); });
  }

  /** The board of a snapshot: a plain 9x9, or a Killer or Greater-Than board from its cages or signs. */
  function modelOf(ex) {
    if (ex.variant === 'killer' && Array.isArray(ex.cages)) {
      return SG.textBoards.create(SG.textBoards.killerSpec(ex.cages));
    }
    if (ex.variant === 'greaterThan' && Array.isArray(ex.signs)) {
      return SG.textBoards.create(SG.textBoards.greaterThanSpec(ex.signs));
    }
    if (ex.variant === 'classic9') return SG.classicModel.build(9);
    return SG.textBoards.DERIVED.indexOf(ex.variant) !== -1 ? SG.textBoards.buildVariant(ex.variant) : null;
  }

  /**
   * The example of a technique, ready to draw: nothing is played, it is the snapshot of `SG.helpExamples`.
   * @param {string} id  A technique id of `SG.techniques`.
   * @returns {?{id: string, variantId: string, model: Object, givens: number[], values: number[],
   *   notes: number[], hint: Object}} null for an unknown technique or a board it cannot build.
   */
  function buildExample(id) {
    const ex = SG.helpExamples && Object.prototype.hasOwnProperty.call(SG.helpExamples, id)
      ? SG.helpExamples[id] : null;
    if (ex === null || !SG.classicModel || !SG.textBoards) return null;
    const model = modelOf(ex);
    if (model === null) return null;
    const notes = new Array(model.cellCount).fill(0);
    Object.keys(ex.notes).forEach(function (cell) { notes[Number(cell)] = ex.notes[cell]; });
    const hint = Object.assign({ ok: true, step: 0, steps: 1, level: 3, ignored: 0 }, ex.hint);
    return { id: id, variantId: ex.variant, model: model, givens: digitsOf(ex.givens), values: digitsOf(ex.values),
      notes: notes, hint: hint };
  }

  const LEGEND = Object.freeze([
    Object.freeze({ id: 'region', key: 'help.example.legend.region' }),
    Object.freeze({ id: 'cell', key: 'help.example.legend.cells' }),
    Object.freeze({ id: 'target', key: 'help.example.legend.target' }),
    Object.freeze({ id: 'elim', key: 'help.example.legend.elim' }),
    Object.freeze({ id: 'keep', key: 'help.example.legend.keep' })
  ]);

  function legend(hint) {
    const list = h('ul', { class: 'help-legend', role: 'list' });
    LEGEND.forEach(function (item) {
      if (item.id === 'region' && !hint.region) return;
      if (item.id === 'elim' && hint.eliminations.length === 0) return;
      if (item.id === 'keep' && hint.placements.length === 0) return;
      list.appendChild(h('li', { class: 'help-legend__item' }, [
        h('span', { class: 'help-swatch help-swatch--' + item.id, 'aria-hidden': 'true' }),
        h('span', { text: t(item.key) })
      ]));
    });
    return list;
  }

  /**
   * Draws the example of a technique into `container`: the board with the marks of the hint, what the hint says
   * and a legend of the marks.
   * @param {Element} container
   * @param {string} id  A technique id.
   * @returns {boolean} Whether the example could be drawn.
   */
  function drawExample(container, id) {
    container.textContent = '';
    let example = null;
    try {
      example = buildExample(id);
    } catch (err) {
      logError(err);
    }
    if (example === null) {
      container.appendChild(h('p', { class: 'field__hint', text: t('help.example.unavailable') }));
      return false;
    }
    const model = example.model;
    const said = SG.play.describeHint(model, example.hint, { mode: 'digits' });
    const svg = root.document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'board-svg help-example__svg');
    const frame = h('div', { class: 'help-example__board' }, [svg]);
    const board = SG.boardView.create(svg, model, { symbolMode: 'digits', showCoords: false,
      colorAuxSymbol: false, animate: false });
    board.setValues(example.givens);
    board.setGivens(example.givens);
    SG.play.renderSnapshot(board, svg, model, { values: example.values, notes: example.notes, hint: example.hint,
      mode: 'digits' });
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', said.title + '. ' + said.explanation);

    const facts = h('dl', { class: 'help-example__facts' }, [
      h('dt', { text: t('help.example.region') }), h('dd', { text: said.region }),
      h('dt', { text: t('help.example.cells') }), h('dd', { text: said.cells }),
      h('dt', { text: t('help.example.move') }), h('dd', { text: said.action })
    ]);
    const name = SG.i18n.has('variant.' + example.variantId) ? t('variant.' + example.variantId) : example.variantId;
    container.appendChild(h('figure', { class: 'help-example' }, [
      frame,
      h('figcaption', { class: 'help-example__text' }, [
        h('p', { class: 'help-example__source', text: t('help.example.source', { variant: name }) }),
        h('p', { class: 'help-example__explanation', text: said.explanation }),
        facts,
        legend(example.hint)
      ])
    ]));
    return true;
  }

  // ---------------------------------------------------------------------------------------------
  // The sections
  // ---------------------------------------------------------------------------------------------

  function paragraph(key, cls) {
    return h('p', { class: cls || null, text: t(key) });
  }

  function section(id, children) {
    const title = h('h2', { class: 'help__title', id: 'help-' + id + '-title', text: t('help.section.' + id) });
    return h('section', { class: 'help-section', id: 'help-' + id, 'aria-labelledby': 'help-' + id + '-title' },
      [title].concat(children));
  }

  function renderHow() {
    const list = h('ol', { class: 'help-steps' });
    BASIC_STEPS.forEach(function (id) {
      list.appendChild(h('li', {}, [
        h('strong', { class: 'help-steps__title', text: t('help.how.' + id + '.title') + ' ' }),
        root.document.createTextNode(t('help.how.' + id + '.text'))
      ]));
    });
    return section('how', [paragraph('help.how.intro', 'help__lead'), list, paragraph('help.how.checkModes', 'help__tip')]);
  }

  function renderHints() {
    const levels = h('ol', { class: 'help-steps' });
    ['level1', 'level2', 'level3'].forEach(function (id) {
      levels.appendChild(h('li', {}, [
        h('strong', { class: 'help-steps__title', text: t('help.hints.' + id + '.title') + ' ' }),
        root.document.createTextNode(t('help.hints.' + id + '.text'))
      ]));
    });
    return section('hints', [paragraph('help.hints.intro', 'help__lead'), levels,
      paragraph('help.hints.sound', 'help__tip')]);
  }

  /** Shows the tab of a technique, hides the others of its group and draws its example the first time. */
  function selectTechnique(id, focus) {
    const entry = tabs.get(id);
    if (entry === undefined) return false;
    tabs.forEach(function (other) {
      if (other.group !== entry.group) return;
      const on = other === entry;
      other.tab.setAttribute('aria-selected', on ? 'true' : 'false');
      other.tab.setAttribute('tabindex', on ? '0' : '-1');
      other.panel.hidden = !on;
    });
    if (!entry.drawn) {
      entry.drawn = true;
      drawExample(entry.example, id);
    }
    if (focus === true) entry.tab.focus();
    return true;
  }

  function onTabKey(event, ids) {
    const at = ids.indexOf(event.currentTarget.getAttribute('data-technique'));
    let next = -1;
    if (event.key === 'ArrowRight') next = (at + 1) % ids.length;
    else if (event.key === 'ArrowLeft') next = (at + ids.length - 1) % ids.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = ids.length - 1;
    if (next === -1) return;
    event.preventDefault();
    selectTechnique(ids[next], true);
  }

  /** One technique of a group: its tab, and its panel (what it says, and the example). */
  function techniquePanel(tech, group, ids) {
    const nameKey = tech.i18nKey || 'technique.' + tech.id;
    const description = SG.i18n.has('technique.' + tech.id + '.desc') ? t('technique.' + tech.id + '.desc') : '';
    const tab = h('button', { type: 'button', class: 'help-tab', role: 'tab', id: 'tab-' + tech.id,
      'aria-controls': 'tech-' + tech.id, 'aria-selected': 'false', tabindex: '-1', 'data-technique': tech.id,
      text: t(nameKey) });
    tab.addEventListener('click', function () { selectTechnique(tech.id, false); });
    tab.addEventListener('keydown', function (event) { onTabKey(event, ids); });
    const head = h('div', { class: 'help-technique__head' }, [h('h4', { class: 'help-technique__name', text: t(nameKey) })]);
    if (Array.isArray(tech.variantScope) && tech.variantScope.length > 0) {
      const scope = tech.variantScope.map(function (variant) {
        return SG.i18n.has('variant.' + variant) ? t('variant.' + variant) : variant;
      }).join(', ');
      head.appendChild(h('span', { class: 'badge badge--accent', text: scope }));
    }
    const example = h('div', { class: 'help-technique__example' });
    const panel = h('div', { class: 'help-technique', role: 'tabpanel', id: 'tech-' + tech.id,
      'aria-labelledby': 'tab-' + tech.id, tabindex: '0', hidden: true, 'data-technique': tech.id }, [
      head,
      h('p', { class: 'help-technique__desc', text: description }),
      example
    ]);
    tabs.set(tech.id, { group: group, tab: tab, panel: panel, example: example, drawn: false });
    return { tab: tab, panel: panel };
  }

  function renderTechniques() {
    const children = [paragraph('help.techniques.intro', 'help__lead')];
    const techs = SG.techniques && typeof SG.techniques.list === 'function' ? SG.techniques.list() : [];
    const groups = SG.techniques && SG.techniques.GROUPS ? SG.techniques.GROUPS : [];
    groups.forEach(function (group) {
      const members = techs.filter(function (tech) { return tech.group === group; })
        .sort(function (a, b) { return a.order - b.order; });
      if (members.length === 0) return;
      const ids = members.map(function (tech) { return tech.id; });
      const list = h('div', { class: 'help-tabs', role: 'tablist', 'aria-label': t('techniqueGroup.' + group) });
      const panels = h('div', { class: 'help-group__panels' });
      members.forEach(function (tech) {
        const made = techniquePanel(tech, group, ids);
        list.appendChild(made.tab);
        panels.appendChild(made.panel);
      });
      children.push(h('div', { class: 'help-group', id: 'group-' + group, 'data-group': group }, [
        h('h3', { class: 'help-group__title', text: t('techniqueGroup.' + group) }),
        list,
        panels
      ]));
    });
    return section('techniques', children);
  }

  function renderKeys() {
    const list = h('dl', { class: 'help-keys' });
    SHORTCUTS.forEach(function (row) {
      const combos = h('dt', { class: 'help-keys__combos' });
      row.keys.forEach(function (combo, index) {
        if (index > 0) combos.appendChild(root.document.createTextNode(' / '));
        combo.forEach(function (name, at) {
          if (at > 0) combos.appendChild(root.document.createTextNode('+'));
          combos.appendChild(h('kbd', { text: name }));
        });
      });
      list.appendChild(combos);
      list.appendChild(h('dd', { class: 'help-keys__text', text: t('help.keys.' + row.id) }));
    });
    return section('keys', [paragraph('help.keys.intro', 'help__lead'), list]);
  }

  const RENDERERS = { how: renderHow, hints: renderHints, techniques: renderTechniques, keys: renderKeys };

  // ---------------------------------------------------------------------------------------------
  // The table of contents
  // ---------------------------------------------------------------------------------------------

  /** Scrolls to the group of a technique after its tab was shown. */
  function goToTechnique(id) {
    if (!selectTechnique(id, false)) return false;
    const group = root.document.getElementById('group-' + tabs.get(id).group);
    if (group !== null && typeof group.scrollIntoView === 'function') group.scrollIntoView();
    return true;
  }

  function techniqueLink(tech) {
    const link = h('a', { href: '#tech-' + tech.id, class: 'help-toc__tech', text: t(tech.i18nKey || 'technique.' + tech.id) });
    link.addEventListener('click', function (event) {
      if (!goToTechnique(tech.id)) return;
      event.preventDefault();
      if (root.history && typeof root.history.replaceState === 'function') {
        root.history.replaceState(null, '', '#tech-' + tech.id);
      }
    });
    return link;
  }

  /** The contents: the sections, and under the techniques their groups with the name of every technique. */
  function renderToc(nav) {
    nav.textContent = '';
    nav.setAttribute('aria-labelledby', 'help-toc-title');
    const body = h('div', { class: 'help-toc__body' });
    const wide = typeof root.matchMedia === 'function' && root.matchMedia(WIDE_QUERY).matches;
    const details = h('details', { class: 'help-toc__details', open: wide }, [
      h('summary', { class: 'help-toc__title', id: 'help-toc-title', text: t('help.page.toc') }),
      body
    ]);
    const list = h('ul', { class: 'help-toc__list', role: 'list' });
    const techs = SG.techniques && typeof SG.techniques.list === 'function' ? SG.techniques.list() : [];
    const groups = SG.techniques && SG.techniques.GROUPS ? SG.techniques.GROUPS : [];
    SECTION_IDS.forEach(function (id) {
      const item = h('li', { class: 'help-toc__item' }, [
        h('a', { href: '#help-' + id, class: 'help-toc__section', 'data-section': id,
          text: t('help.section.' + id) })
      ]);
      if (id === 'techniques') {
        const sub = h('ul', { class: 'help-toc__groups', role: 'list' });
        groups.forEach(function (group) {
          const members = techs.filter(function (tech) { return tech.group === group; })
            .sort(function (a, b) { return a.order - b.order; });
          if (members.length === 0) return;
          const names = h('ul', { class: 'help-toc__techs', role: 'list' });
          members.forEach(function (tech) { names.appendChild(h('li', {}, [techniqueLink(tech)])); });
          sub.appendChild(h('li', { class: 'help-toc__group' }, [
            h('span', { class: 'help-toc__group-name', text: t('techniqueGroup.' + group) }),
            names
          ]));
        });
        item.appendChild(sub);
      }
      list.appendChild(item);
    });
    body.appendChild(list);
    nav.appendChild(details);
  }

  /** Marks the section on screen in the contents. */
  function watchSections() {
    if (typeof root.IntersectionObserver !== 'function') return;
    const links = {};
    Array.prototype.forEach.call(root.document.querySelectorAll('.help-toc__section'), function (link) {
      links[link.getAttribute('data-section')] = link;
    });
    const visible = new Set();
    const observer = new root.IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        const id = entry.target.id.replace(/^help-/, '');
        if (entry.isIntersecting) visible.add(id);
        else visible.delete(id);
      });
      const first = SECTION_IDS.filter(function (id) { return visible.has(id); })[0];
      Object.keys(links).forEach(function (id) {
        if (id === first) links[id].setAttribute('aria-current', 'location');
        else links[id].removeAttribute('aria-current');
      });
    }, { rootMargin: '0px 0px -60% 0px' });
    SECTION_IDS.forEach(function (id) {
      const el = root.document.getElementById('help-' + id);
      if (el !== null) observer.observe(el);
    });
    watchSections.observer = observer;
  }

  /** Shows the technique that the address names (`help.html#tech-xWing`) and scrolls to it. */
  function openFromHash() {
    const hash = root.location ? root.location.hash : '';
    const found = /^#tech-([A-Za-z0-9]+)$/.exec(hash);
    if (found !== null) goToTechnique(found[1]);
  }

  /**
   * Builds the sections in the current language (and the contents).
   * @param {Element} [rootEl]  Default: `#help-root`.
   */
  function render(rootEl) {
    const host = rootEl || root.document.getElementById('help-root');
    if (!host) return;
    const shown = [];
    tabs.forEach(function (entry, id) { if (entry.tab.getAttribute('aria-selected') === 'true') shown.push(id); });
    tabs.clear();
    if (watchSections.observer) watchSections.observer.disconnect();
    host.textContent = '';
    SECTION_IDS.forEach(function (id) { host.appendChild(RENDERERS[id]()); });
    // The first technique of every group is shown at first; what the reader chose stays chosen.
    const groups = {};
    tabs.forEach(function (entry, id) { if (groups[entry.group] === undefined) groups[entry.group] = id; });
    Object.keys(groups).forEach(function (group) { selectTechnique(groups[group], false); });
    shown.forEach(function (id) { selectTechnique(id, false); });
    const nav = root.document.getElementById('help-toc');
    if (nav !== null) renderToc(nav);
    watchSections();
    root.document.title = t('help.page.title') + ' - ' + t('app.title');
  }

  // ---------------------------------------------------------------------------------------------
  // The page
  // ---------------------------------------------------------------------------------------------

  /** Tells the CSS how tall the floating header is, so the contents and the anchors sit below it. */
  function measureHeader() {
    const header = root.document.querySelector('.app-header');
    if (header === null) return;
    root.document.body.style.setProperty('--help-header-height', header.offsetHeight + 'px');
  }

  function syncLang(lang) {
    Array.prototype.forEach.call(root.document.querySelectorAll('[data-lang]'), function (button) {
      button.setAttribute('aria-pressed', button.getAttribute('data-lang') === lang ? 'true' : 'false');
    });
  }

  /**
   * Starts the page: the language and the theme of the player's stored preferences, the switches of the header
   * (they change the same preferences) and the first render.
   * @returns {boolean} False on a page without `#help-root`.
   */
  function start() {
    if (typeof document === 'undefined' || document.getElementById('help-root') === null) return false;
    const store = SG.store.instance();
    const state = store.load({ search: root.location ? root.location.search : '', navigator: root.navigator });
    SG.i18n.setLocale(state.lang);
    SG.theme.apply(state);
    syncLang(SG.i18n.current);
    Array.prototype.forEach.call(document.querySelectorAll('[data-lang]'), function (button) {
      button.addEventListener('click', function () {
        store.set({ lang: button.getAttribute('data-lang') }, { source: 'help' });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-theme-value]'), function (button) {
      button.addEventListener('click', function () {
        store.set({ theme: button.getAttribute('data-theme-value') }, { source: 'help' });
      });
    });
    store.subscribe(function (next, keys) {
      if (keys.indexOf('lang') !== -1) SG.i18n.setLocale(next.lang);
      if (keys.some(function (key) { return key === 'theme' || key === 'fontSize' || key === 'reducedMotion'; })) {
        SG.theme.apply(next);
      }
    });
    SG.i18n.onChange(function (code) {
      syncLang(code);
      SG.i18n.applyTo(document);
      render();
      measureHeader();
    });
    SG.i18n.applyTo(document);
    render();
    measureHeader();
    root.addEventListener('resize', measureHeader);
    openFromHash();
    root.addEventListener('hashchange', openFromHash);
    return true;
  }

  SG.help = {
    SECTION_IDS: SECTION_IDS,
    SHORTCUTS: SHORTCUTS,
    BASIC_STEPS: BASIC_STEPS,
    buildExample: buildExample,
    drawExample: drawExample,
    selectTechnique: selectTechnique,
    render: render,
    start: start
  };

  // ---------------------------------------------------------------------------------------------
  // Strings
  // ---------------------------------------------------------------------------------------------

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'help.page.title': 'How to play',
      'help.page.lead': 'Everything you need to play: the basics, how the hints work, and the techniques that ' +
        'solve harder puzzles, each one with a real example.',
      'help.page.back': 'Back to the player',
      'help.page.skip': 'Skip to the guide',
      'help.page.toc': 'On this page',
      'help.section.how': 'The basics',
      'help.section.hints': 'Using hints',
      'help.section.techniques': 'Techniques for harder puzzles',
      'help.section.keys': 'Keyboard',
      'help.how.intro': 'Every Sudoku puzzle has one rule at its heart: fill the grid so that no symbol ' +
        'repeats inside a row, a column or a region. Some variants add rules of their own (cages with a ' +
        'sum, signs between cells, extra regions); the board shows them. This is how to play here.',
      'help.how.get.title': 'Get a puzzle.',
      'help.how.get.text': 'In Sudoku Generator press Play: every puzzle of its list arrives here, and the ' +
        'one you were looking at opens first. Or press Import and paste the text of the generator’s ' +
        'Export box. The puzzles you have imported are listed on the left.',
      'help.how.select.title': 'Select a cell.',
      'help.how.select.text': 'Click or tap it, or move with the arrow keys. The clues are fixed and ' +
        'cannot be changed.',
      'help.how.enter.title': 'Enter a symbol.',
      'help.how.enter.text': 'Type it, or press a key of the pad under the board (on a wide screen a pad ' +
        'also pops up next to the cell). Press the same symbol again to clear the cell.',
      'help.how.notes.title': 'Use notes.',
      'help.how.notes.text': 'Switch on Notes (N) to mark the symbols a cell may still hold; they are ' +
        'drawn small inside the cell. “More actions” under the pad can fill in all the notes for you. A ' +
        'symbol you enter is removed from the notes of the cells that see it, unless you switch that off ' +
        'in the Options frame.',
      'help.how.check.title': 'Check your work.',
      'help.how.check.text': 'Mistakes can be marked as you type (see Options) or only when you press ' +
        'Check. Undo and Redo (Ctrl+Z, Ctrl+Y) are exact: a value and the notes it cleared come back ' +
        'together.',
      'help.how.hint.title': 'Ask for a hint.',
      'help.how.hint.text': 'Press Hint (H) when you are stuck. It names the logical technique that ' +
        'applies; each press shows more, down to the move itself. Hints are always correct. The next ' +
        'sections explain them.',
      'help.how.play.title': 'Play, Pause, Reset.',
      'help.how.play.text': 'The clock starts with your first move, or when you press Play. Pause stops it ' +
        'and hides the board; leaving the tab, or opening another puzzle, pauses it too. While a game is ' +
        'paused, or solved, Reset starts it over.',
      'help.how.symbols.title': 'Change how symbols look.',
      'help.how.symbols.text': 'Where the board allows it, Options lets you switch between digits, ' +
        'letters, colours and shapes. Colours always carry a small shape as well, so they can be told ' +
        'apart without seeing colour.',
      'help.how.save.title': 'Come back later.',
      'help.how.save.text': 'Your progress is saved automatically on this device, and nothing is sent ' +
        'anywhere. Open the same puzzle again, from the list on the left, and you can continue.',
      'help.how.solved.title': 'Finish.',
      'help.how.solved.text': 'When the grid is complete and correct, a message shows your time, and a ' +
        'tick appears next to the puzzle in the list.',
      'help.how.checkModes': 'Tip: a Killer cage whose sum can no longer be reached, or a Greater-Than ' +
        'sign that is broken, is flagged as a rule conflict.',
      'help.hints.intro': 'A hint finds the next logical step from your current grid and names the ' +
        'technique behind it. It never guesses and never suggests a wrong value. Notes help it: with all ' +
        'the notes filled in, you see exactly what each technique sees.',
      'help.hints.level1.title': 'First: the technique.',
      'help.hints.level1.text': 'Its name, what it means, and the region (row, column, box, cage…) to ' +
        'look at.',
      'help.hints.level2.title': 'Then: the cells.',
      'help.hints.level2.text': 'Press Show more to see the cells that take part in the step.',
      'help.hints.level3.title': 'Finally: the move.',
      'help.hints.level3.text': 'The next press shows the placement, or the symbols to remove, with an ' +
        'explanation. “Fill it in” enters a placement for you; “Remove from my notes” applies an ' +
        'elimination.',
      'help.hints.sound': 'Wrong entries are ignored when a hint is worked out (and counted). If no known ' +
        'technique applies from here, the hint says so and offers to reveal one cell.',
      'help.techniques.intro': 'When no simple move is left, look for one of these, from the easiest to the ' +
        'hardest; the last ones are rare, and some only apply to Killer or Greater-Than puzzles. Pick a ' +
        'technique in a group to see a real example: a puzzle partway through, with its notes filled in, ' +
        'at the moment the hint names that technique.',
      'help.example.source': 'From a {variant} puzzle, as the hint shows it.',
      'help.example.region': 'Where to look',
      'help.example.cells': 'The cells',
      'help.example.move': 'The move',
      'help.example.unavailable': 'The example could not be built.',
      'help.example.legend.region': 'Area to look at',
      'help.example.legend.cells': 'Cells that make it work',
      'help.example.legend.target': 'Cells that change',
      'help.example.legend.elim': 'Note to remove',
      'help.example.legend.keep': 'Digit to place',
      'help.keys.intro': 'Everything can be done from the keyboard.',
      'help.keys.move': 'Move between cells. Home and End go to the ends of the row, Page Up and Page ' +
        'Down move a box up or down. On boards with several grids the keys skip the gaps.',
      'help.keys.enter': 'Enter a symbol in the selected cell: digits and letters as the board shows ' +
        'them. Symbols with two characters (10 to 12 on Mega 12×12) take two keystrokes.',
      'help.keys.erase': 'Erase the selected cell: its value, then its notes.',
      'help.keys.notes': 'Switch between entering values and entering notes.',
      'help.keys.hint': 'Ask for a hint, and again for more detail.',
      'help.keys.undo': 'Undo.',
      'help.keys.redo': 'Redo.',
      'help.keys.escape': 'Close the hint card, a pop-up or a dialog.',
      'help.keys.tab': 'Move between the areas of the page (header, board, tools, pad, side panel). ' +
        'The skip link at the top jumps to the puzzle.',
      'help.keys.paste': 'Paste a puzzle anywhere on the page to open it: a link, the text of a ' +
        'puzzle file, or a line of 81, 36 or 16 characters.',
      'help.keys.openBox': 'In the text box of the Import dialog: import the pasted puzzles.'
    },
    vi: {
      'help.page.title': 'Hướng dẫn chơi',
      'help.page.lead': 'Mọi thứ bạn cần để chơi: những điều cơ bản, cách hoạt động của gợi ý, và các kỹ ' +
        'thuật giải đề khó, mỗi kỹ thuật kèm một ví dụ thật.',
      'help.page.back': 'Quay lại trình chơi',
      'help.page.skip': 'Chuyển tới hướng dẫn',
      'help.page.toc': 'Trong trang này',
      'help.section.how': 'Những điều cơ bản',
      'help.section.hints': 'Dùng gợi ý',
      'help.section.techniques': 'Kỹ thuật cho đề khó',
      'help.section.keys': 'Bàn phím',
      'help.how.intro': 'Mọi câu đố Sudoku đều có một luật cốt lõi: điền vào lưới sao cho không ký hiệu ' +
        'nào lặp lại trong một hàng, một cột hay một vùng. Một số biến thể có thêm luật riêng (lồng có ' +
        'tổng, dấu so sánh giữa các ô, vùng phụ); bảng đã vẽ sẵn chúng. Đây là cách chơi ở đây.',
      'help.how.get.title': 'Lấy một đề.',
      'help.how.get.text': 'Trong Trình sinh đề Sudoku, bấm Chơi: mọi đề trong danh sách của nó được chuyển ' +
        'sang đây, và đề bạn đang xem được mở trước. Hoặc bấm Nhập đề rồi dán nội dung ô Xuất của trình ' +
        'sinh đề. Các đề đã nhập được liệt kê ở bên trái.',
      'help.how.select.title': 'Chọn một ô.',
      'help.how.select.text': 'Nhấp hoặc chạm vào ô, hoặc di chuyển bằng các phím mũi tên. Các ô cho sẵn ' +
        'là cố định và không đổi được.',
      'help.how.enter.title': 'Điền một ký hiệu.',
      'help.how.enter.text': 'Gõ ký hiệu, hoặc bấm một phím trên bàn phím số dưới bảng (trên màn hình rộng, ' +
        'một bàn phím nhỏ còn hiện ngay cạnh ô). Bấm lại cùng ký hiệu để xóa ô.',
      'help.how.notes.title': 'Dùng ghi chú.',
      'help.how.notes.text': 'Bật Ghi chú (N) để đánh dấu các ký hiệu mà ô còn có thể nhận; chúng được vẽ ' +
        'nhỏ trong ô. “Thêm thao tác” dưới bàn phím số có thể điền sẵn mọi ghi chú giúp bạn. Ký hiệu bạn ' +
        'điền sẽ tự biến mất khỏi ghi chú của các ô nhìn thấy nó, trừ khi bạn tắt tùy chọn này trong khung ' +
        'Tùy chọn.',
      'help.how.check.title': 'Kiểm tra bài làm.',
      'help.how.check.text': 'Lỗi có thể được đánh dấu ngay khi bạn gõ (xem Tùy chọn) hoặc chỉ khi bạn bấm ' +
        'Kiểm tra. Hoàn tác và Làm lại (Ctrl+Z, Ctrl+Y) chính xác tuyệt đối: một giá trị và các ghi chú ' +
        'nó đã xóa cùng quay lại.',
      'help.how.hint.title': 'Xin gợi ý.',
      'help.how.hint.text': 'Bấm Gợi ý (H) khi bạn bí. Gợi ý nêu tên kỹ thuật suy luận có thể dùng; mỗi ' +
        'lần bấm cho thấy thêm, cho đến chính nước đi. Gợi ý luôn đúng. Các mục sau giải thích chúng.',
      'help.how.play.title': 'Chơi, Tạm dừng, Đặt lại.',
      'help.how.play.text': 'Đồng hồ chạy từ nước đi đầu tiên của bạn, hoặc khi bạn bấm Chơi. Tạm dừng làm ' +
        'đồng hồ dừng và ẩn bảng; rời khỏi tab hay mở đề khác cũng tự tạm dừng. Khi ván đang tạm dừng ' +
        'hoặc đã giải xong, Đặt lại cho chơi lại từ đầu.',
      'help.how.symbols.title': 'Đổi cách hiển thị ký hiệu.',
      'help.how.symbols.text': 'Khi bảng cho phép, Tùy chọn cho bạn chuyển giữa chữ số, chữ cái, màu và ' +
        'hình. Màu luôn kèm một hình nhỏ, nên vẫn phân biệt được mà không cần nhìn màu.',
      'help.how.save.title': 'Quay lại sau.',
      'help.how.save.text': 'Tiến độ được tự động lưu trên thiết bị này, và không có gì được gửi đi đâu ' +
        'cả. Mở lại đúng đề đó từ danh sách bên trái là bạn có thể chơi tiếp.',
      'help.how.solved.title': 'Hoàn thành.',
      'help.how.solved.text': 'Khi lưới đầy đủ và đúng, một thông báo cho biết thời gian của bạn, và một ' +
        'dấu tích hiện cạnh đề trong danh sách.',
      'help.how.checkModes': 'Mẹo: một lồng Sát thủ không thể đạt tổng nữa, hay một dấu so sánh bị vi ' +
        'phạm, sẽ được đánh dấu là vi phạm luật.',
      'help.hints.intro': 'Gợi ý tìm bước suy luận tiếp theo từ lưới hiện tại của bạn và nêu tên kỹ thuật ' +
        'đứng sau nó. Gợi ý không bao giờ đoán mò và không bao giờ đề xuất giá trị sai. Ghi chú giúp ích ' +
        'cho nó: khi đã điền sẵn mọi ghi chú, bạn thấy đúng những gì từng kỹ thuật nhìn thấy.',
      'help.hints.level1.title': 'Trước hết: kỹ thuật.',
      'help.hints.level1.text': 'Tên kỹ thuật, ý nghĩa của nó và vùng (hàng, cột, khối, lồng…) cần nhìn ' +
        'vào.',
      'help.hints.level2.title': 'Tiếp theo: các ô.',
      'help.hints.level2.text': 'Bấm Xem thêm để thấy các ô tham gia vào bước này.',
      'help.hints.level3.title': 'Cuối cùng: nước đi.',
      'help.hints.level3.text': 'Lần bấm tiếp theo cho thấy ô cần điền, hoặc các ký hiệu cần loại, kèm lời ' +
        'giải thích. “Điền giúp tôi” sẽ điền ô đó; “Xóa khỏi ghi chú của tôi” áp dụng một phép loại trừ.',
      'help.hints.sound': 'Các ô điền sai bị bỏ qua khi tìm gợi ý (và được đếm). Nếu từ đây không kỹ thuật ' +
        'nào đã biết áp dụng được, gợi ý sẽ nói rõ và đề nghị hiện một ô.',
      'help.techniques.intro': 'Khi không còn nước đi đơn giản, hãy tìm một trong các kỹ thuật này, từ dễ ' +
        'nhất đến khó nhất; những kỹ thuật cuối rất hiếm, và một số chỉ áp dụng cho đề Sát thủ hoặc So ' +
        'sánh. Chọn một kỹ thuật trong nhóm để xem ví dụ thật: một đề đang chơi dở, đã điền sẵn ghi chú, ' +
        'đúng lúc gợi ý nêu tên kỹ thuật đó.',
      'help.example.source': 'Từ một đề {variant}, đúng như gợi ý hiển thị.',
      'help.example.region': 'Nhìn ở đâu',
      'help.example.cells': 'Các ô',
      'help.example.move': 'Nước đi',
      'help.example.unavailable': 'Không dựng được ví dụ.',
      'help.example.legend.region': 'Vùng cần nhìn',
      'help.example.legend.cells': 'Các ô làm nên kỹ thuật',
      'help.example.legend.target': 'Các ô thay đổi',
      'help.example.legend.elim': 'Ghi chú cần xóa',
      'help.example.legend.keep': 'Số cần điền',
      'help.keys.intro': 'Mọi thao tác đều làm được bằng bàn phím.',
      'help.keys.move': 'Di chuyển giữa các ô. Home và End đến hai đầu hàng, Page Up và Page Down nhảy lên ' +
        'hoặc xuống một khối. Trên bảng nhiều lưới, các phím bỏ qua các khoảng trống.',
      'help.keys.enter': 'Điền ký hiệu vào ô đang chọn: chữ số và chữ cái như bảng hiển thị. Ký hiệu hai ký ' +
        'tự (10 đến 12 trên Mega 12×12) cần gõ hai phím.',
      'help.keys.erase': 'Xóa ô đang chọn: giá trị trước, rồi đến ghi chú.',
      'help.keys.notes': 'Chuyển giữa điền giá trị và ghi chú.',
      'help.keys.hint': 'Xin gợi ý, và bấm lại để xem chi tiết hơn.',
      'help.keys.undo': 'Hoàn tác.',
      'help.keys.redo': 'Làm lại.',
      'help.keys.escape': 'Đóng thẻ gợi ý, bàn phím nhỏ hoặc một hộp thoại.',
      'help.keys.tab': 'Chuyển giữa các vùng của trang (đầu trang, bảng, công cụ, bàn phím số, bảng bên). ' +
        'Liên kết bỏ qua ở đầu trang nhảy thẳng tới đề.',
      'help.keys.paste': 'Dán một đề vào bất kỳ đâu trên trang để mở nó: liên kết, nội dung tệp đề, hoặc ' +
        'một dòng 81, 36 hay 16 ký tự.',
      'help.keys.openBox': 'Trong ô văn bản của hộp thoại Nhập đề: nhập các đề vừa dán.'
    }
  });

  // help.html starts the page once every script has loaded (the strings above included).
  if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
    const run = function () { start(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
  }
})(typeof self !== 'undefined' ? self : globalThis);
