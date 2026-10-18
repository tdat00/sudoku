/**
 * Help (design.md section 8.3): `SG.help`.
 *
 * The Help dialog (`action {id: 'help'}` -> `open()`) has five tabs: how to play, the rules of the 15
 * variants (static texts: the player has no variants registry), the hints and the ladder of techniques they
 * can name (read from `SG.techniques`), the keyboard shortcuts, and about / privacy (what is stored and how
 * to delete it).
 *
 * PUBLIC API (`SG.help`)
 *   init(app)            idempotent; called by app.js at start-up. Returns true when it is running.
 *   destroy()            removes the listeners and closes the dialog.
 *   open(options?)       opens the Help dialog; `{ tab }` picks a tab (see `TAB_IDS`); returns the modal.
 *   close()              closes it.
 *   TAB_IDS, VARIANT_RULES (the id, name key, rules key and tip key of the 15 variants),
 *   SHORTCUTS (the rows of the keyboard tab).
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first instance on repeated loads: the running page must survive.
  if (SG.help && typeof SG.help.init === 'function') return;

  const TAB_IDS = Object.freeze(['how', 'variants', 'hints', 'keys', 'about']);

  const VARIANT_IDS = Object.freeze(['classic4', 'classic6', 'classic9', 'mega12', 'mega16', 'diagonalX',
    'hyper', 'jigsaw9', 'killer', 'greaterThan', 'samurai', 'sohei', 'butterfly', 'flower', 'wordoku']);

  /** The static help entry of every variant: where its texts are. */
  const VARIANT_RULES = Object.freeze(VARIANT_IDS.map(function (id) {
    return Object.freeze({
      id: id,
      nameKey: 'variant.' + id,
      descKey: 'variant.' + id + '.desc',
      rulesKey: 'help.variant.' + id + '.rules',
      tipKey: 'help.variant.' + id + '.tip'
    });
  }));

  /** The keyboard tab: the keys of each row and the key of its description. */
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

  const REPOSITORY_URL = 'https://github.com/tdat00/sudoku-player';

  function t(key, args) {
    return SG.i18n.t(key, args);
  }

  function logError(err) {
    if (typeof console !== 'undefined' && typeof console.error === 'function') console.error(err);
  }

  function safely(fn) {
    try {
      return fn();
    } catch (err) {
      logError(err);
      return undefined;
    }
  }

  function h(tag, attrs, children) {
    const node = root.document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (name) {
      const value = attrs[name];
      if (value === null || value === undefined || value === false) return;
      if (name === 'class') node.className = value;
      else if (name === 'text') node.textContent = value;
      else if (name === 'i18n') node.setAttribute('data-i18n', value);
      else node.setAttribute(name, value === true ? '' : String(value));
    });
    (children || []).forEach(function (child) { if (child) node.appendChild(child); });
    return node;
  }

  const ctx = {
    app: null,
    off: [],
    modal: null,
    tab: 'how',
    panels: {},
    tabs: {},
    deleteTimer: null
  };

  // ---------------------------------------------------------------------------------------------
  // Help dialog: panels
  // ---------------------------------------------------------------------------------------------

  function paragraph(key, cls) {
    return h('p', { class: cls || null, text: t(key) });
  }

  function renderHow(panel) {
    panel.appendChild(paragraph('help.how.intro', 'help__lead'));
    const list = h('ol', { class: 'help-steps' });
    ['select', 'enter', 'notes', 'check', 'hint', 'symbols', 'save', 'solved'].forEach(function (id) {
      list.appendChild(h('li', {}, [
        h('strong', { text: t('help.how.' + id + '.title') + ' ' }),
        document.createTextNode(t('help.how.' + id + '.text'))
      ]));
    });
    panel.appendChild(list);
    panel.appendChild(paragraph('help.how.checkModes', 'field__hint'));
  }

  function variantDetails(entry) {
    const details = h('details', { class: 'disclosure help-variant', id: 'help-variant-' + entry.id });
    details.appendChild(h('summary', {}, [
      h('span', { class: 'help-variant__name', text: t(entry.nameKey) })
    ]));
    details.appendChild(h('div', { class: 'disclosure__body' }, [
      paragraph(entry.descKey, 'help-variant__desc'),
      h('h4', { class: 'help__small-title', text: t('help.variant.rules.title') }),
      paragraph(entry.rulesKey),
      h('h4', { class: 'help__small-title', text: t('help.variant.tip.title') }),
      paragraph(entry.tipKey)
    ]));
    return details;
  }

  function renderVariants(panel) {
    panel.appendChild(paragraph('help.variants.intro', 'help__lead'));
    VARIANT_RULES.forEach(function (entry) { panel.appendChild(variantDetails(entry)); });
  }

  function techniqueItem(tech) {
    const nameKey = 'technique.' + tech.id;
    const description = SG.i18n.has(nameKey + '.desc') ? t(nameKey + '.desc') : '';
    const item = h('li', { class: 'help-technique', 'data-technique': tech.id }, [
      h('span', { class: 'help-technique__name', text: t(nameKey) }),
      h('span', { class: 'help-technique__desc', text: description })
    ]);
    if (Array.isArray(tech.variantScope) && tech.variantScope.length > 0) {
      const scope = tech.variantScope.map(function (id) {
        return SG.i18n.has('variant.' + id) ? t('variant.' + id) : id;
      }).join(', ');
      item.appendChild(h('span', { class: 'badge help-technique__scope', text: scope }));
    }
    return item;
  }

  function renderHints(panel) {
    panel.appendChild(paragraph('help.hints.intro', 'help__lead'));
    const levels = h('ol', { class: 'help-steps' });
    [['help.hints.level1.title', 'help.hints.level1.text'],
      ['help.hints.level2.title', 'help.hints.level2.text'],
      ['help.hints.level3.title', 'help.hints.level3.text']].forEach(function (pair) {
      levels.appendChild(h('li', {}, [
        h('strong', { text: t(pair[0]) + ' ' }),
        document.createTextNode(t(pair[1]))
      ]));
    });
    panel.appendChild(levels);
    panel.appendChild(paragraph('help.hints.sound', 'field__hint'));
    panel.appendChild(h('h3', { class: 'help__title', text: t('help.ladder.title') }));
    panel.appendChild(paragraph('help.ladder.intro', 'field__hint'));
    const techs = SG.techniques && typeof SG.techniques.list === 'function' ? SG.techniques.list() : [];
    const groups = SG.techniques && SG.techniques.GROUPS ? SG.techniques.GROUPS : [];
    groups.forEach(function (group) {
      const members = techs.filter(function (tech) { return tech.group === group; })
        .sort(function (a, b) { return a.order - b.order; });
      if (members.length === 0) return;
      const section = h('section', { class: 'help-group', 'data-group': group });
      section.appendChild(h('h4', { class: 'help__small-title', text: t('techniqueGroup.' + group) }));
      const list = h('ul', { class: 'help-techniques', role: 'list' });
      members.forEach(function (tech) { list.appendChild(techniqueItem(tech)); });
      section.appendChild(list);
      panel.appendChild(section);
    });
  }

  function renderKeys(panel) {
    panel.appendChild(paragraph('help.keys.intro', 'help__lead'));
    const list = h('dl', { class: 'help-keys' });
    SHORTCUTS.forEach(function (row) {
      const combos = h('dt', { class: 'help-keys__combos' });
      row.keys.forEach(function (combo, index) {
        if (index > 0) combos.appendChild(document.createTextNode(' / '));
        combo.forEach(function (name, at) {
          if (at > 0) combos.appendChild(document.createTextNode('+'));
          combos.appendChild(h('kbd', { text: name }));
        });
      });
      list.appendChild(combos);
      list.appendChild(h('dd', { class: 'help-keys__text', text: t('help.keys.' + row.id) }));
    });
    panel.appendChild(list);
  }

  function storedKeys() {
    const rows = [];
    if (SG.store) rows.push([SG.store.KEY, 'help.about.key.prefs']);
    if (SG.progress) {
      rows.push([SG.progress.KEYS.progress, 'help.about.key.progress']);
      rows.push([SG.progress.KEYS.puzzles, 'help.about.key.puzzles']);
      rows.push([SG.progress.KEYS.last, 'help.about.key.last']);
    }
    return rows;
  }

  function resetDeleteButton(button) {
    root.clearTimeout(ctx.deleteTimer);
    ctx.deleteTimer = null;
    button.textContent = t('help.about.delete');
  }

  function renderAbout(panel) {
    panel.appendChild(h('h3', { class: 'help__title', text: t('help.about.privacy.title') }));
    panel.appendChild(paragraph('help.about.privacy.text'));
    const keys = h('dl', { class: 'help-storage' });
    storedKeys().forEach(function (row) {
      keys.appendChild(h('dt', {}, [h('code', { text: row[0] })]));
      keys.appendChild(h('dd', { text: t(row[1]) }));
    });
    panel.appendChild(keys);

    const actions = h('div', { class: 'help-actions' });
    const remove = h('button', { type: 'button', class: 'btn btn--secondary', id: 'help-delete',
      text: t('help.about.delete') });
    remove.addEventListener('click', function () {
      if (ctx.deleteTimer === null) {
        remove.textContent = t('help.about.delete.confirm');
        ctx.deleteTimer = root.setTimeout(function () { resetDeleteButton(remove); }, 4000);
        return;
      }
      resetDeleteButton(remove);
      if (ctx.app && typeof ctx.app.clearSavedData === 'function') ctx.app.clearSavedData();
    });
    actions.appendChild(remove);
    panel.appendChild(actions);

    panel.appendChild(h('h3', { class: 'help__title', text: t('help.about.a11y.title') }));
    panel.appendChild(paragraph('help.about.a11y.text'));
    panel.appendChild(h('h3', { class: 'help__title', text: t('help.about.links.title') }));
    const links = h('ul', { class: 'help-links', role: 'list' });
    const meta = root.document.querySelector('meta[name="sg-generator-url"]');
    const generator = meta ? meta.getAttribute('content') : null;
    if (generator && /^https?:\/\//i.test(generator)) {
      links.appendChild(h('li', {}, [h('a', { href: generator, target: '_blank', rel: 'noopener',
        text: t('help.about.link.generator') })]));
    }
    links.appendChild(h('li', {}, [h('a', { href: REPOSITORY_URL, target: '_blank', rel: 'noopener',
      text: t('help.about.link.repo') })]));
    panel.appendChild(links);
    panel.appendChild(paragraph('help.about.licence', 'field__hint'));
  }

  const RENDERERS = {
    how: renderHow,
    variants: renderVariants,
    hints: renderHints,
    keys: renderKeys,
    about: renderAbout
  };

  // ---------------------------------------------------------------------------------------------
  // Help dialog: tabs
  // ---------------------------------------------------------------------------------------------

  function renderPanel(id) {
    const panel = ctx.panels[id];
    if (!panel) return;
    panel.textContent = '';
    safely(function () { RENDERERS[id](panel); });
    panel.setAttribute('data-rendered', SG.i18n.current);
  }

  function selectTab(id, focus) {
    if (TAB_IDS.indexOf(id) === -1) return;
    ctx.tab = id;
    TAB_IDS.forEach(function (name) {
      const selected = name === id;
      ctx.tabs[name].setAttribute('aria-selected', selected ? 'true' : 'false');
      ctx.tabs[name].setAttribute('tabindex', selected ? '0' : '-1');
      ctx.panels[name].hidden = !selected;
    });
    if (ctx.panels[id].getAttribute('data-rendered') !== SG.i18n.current) renderPanel(id);
    if (focus) ctx.tabs[id].focus();
  }

  function onTabKey(event) {
    const at = TAB_IDS.indexOf(ctx.tab);
    let next = -1;
    if (event.key === 'ArrowRight') next = (at + 1) % TAB_IDS.length;
    else if (event.key === 'ArrowLeft') next = (at + TAB_IDS.length - 1) % TAB_IDS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TAB_IDS.length - 1;
    if (next === -1) return;
    event.preventDefault();
    selectTab(TAB_IDS[next], true);
  }

  function buildBody(container) {
    const list = h('div', { class: 'help-tabs', role: 'tablist' });
    list.setAttribute('aria-label', t('help.title'));
    const body = h('div', { class: 'help-panels' });
    TAB_IDS.forEach(function (id) {
      const tab = h('button', { type: 'button', class: 'help-tab', role: 'tab', id: 'help-tab-' + id,
        'aria-controls': 'help-panel-' + id, 'aria-selected': 'false', tabindex: '-1', 'data-tab': id,
        'data-i18n': 'help.tab.' + id });
      tab.addEventListener('click', function () { selectTab(id, false); });
      tab.addEventListener('keydown', onTabKey);
      const panel = h('div', { class: 'help-panel', role: 'tabpanel', id: 'help-panel-' + id,
        'aria-labelledby': 'help-tab-' + id, tabindex: '0', hidden: true, 'data-panel': id });
      ctx.tabs[id] = tab;
      ctx.panels[id] = panel;
      list.appendChild(tab);
      body.appendChild(panel);
    });
    container.appendChild(list);
    container.appendChild(body);
  }

  function buildFooter(container) {
    const closeButton = h('button', {
      type: 'button', class: 'btn btn--primary', 'data-i18n': 'common.close'
    });
    closeButton.addEventListener('click', close);
    container.appendChild(closeButton);
  }

  function relocalise() {
    if (ctx.modal === null) return;
    TAB_IDS.forEach(function (id) { ctx.panels[id].removeAttribute('data-rendered'); });
    selectTab(ctx.tab, false);
  }

  /**
   * Opens the Help dialog (or returns the one that is open).
   * @param {{tab?: string}} [options]
   * @returns {?Object} The modal of `SG.app.openModal`; null without a DOM or before `init`.
   */
  function open(options) {
    if (ctx.app === null || typeof document === 'undefined') return null;
    const wanted = options && TAB_IDS.indexOf(options.tab) !== -1 ? options.tab : null;
    if (ctx.modal !== null) {
      if (wanted !== null) selectTab(wanted, false);
      return ctx.modal;
    }
    const modal = ctx.app.openModal({
      titleKey: 'help.title',
      wide: true,
      body: buildBody,
      footer: buildFooter,
      onClose: function () {
        root.clearTimeout(ctx.deleteTimer);
        ctx.deleteTimer = null;
        ctx.modal = null;
      }
    });
    if (modal === null) return null;
    ctx.modal = modal;
    selectTab(wanted || ctx.tab, false);
    return modal;
  }

  function close() {
    if (ctx.modal !== null) ctx.modal.close();
  }

  // ---------------------------------------------------------------------------------------------
  // Start-up
  // ---------------------------------------------------------------------------------------------

  function destroy() {
    ctx.off.splice(0).forEach(function (off) { off(); });
    if (ctx.modal !== null) ctx.modal.close();
    ctx.app = null;
    ctx.modal = null;
    ctx.panels = {};
    ctx.tabs = {};
  }

  /**
   * Starts the module (called by app.js at start-up; safe to call again).
   * @param {Object} app  `SG.app`.
   * @returns {boolean} Whether the module is running (false without a DOM).
   */
  function init(app) {
    if (typeof document === 'undefined' || !app) return false;
    if (ctx.app === app) return true;
    destroy();
    ctx.app = app;
    ctx.off.push(app.on('action', function (payload) {
      if (payload && payload.id === 'help') open();
    }));
    ctx.off.push(app.on('locale', relocalise));
    return true;
  }

  SG.help = {
    TAB_IDS: TAB_IDS,
    VARIANT_RULES: VARIANT_RULES,
    SHORTCUTS: SHORTCUTS,
    init: init,
    destroy: destroy,
    open: open,
    close: close
  };

  // ---------------------------------------------------------------------------------------------
  // Strings
  // ---------------------------------------------------------------------------------------------

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'help.title': 'Help',
      'help.tab.how': 'How to play',
      'help.tab.variants': 'Variants',
      'help.tab.hints': 'Hints',
      'help.tab.keys': 'Keyboard',
      'help.tab.about': 'About',
      'help.how.intro': 'Every Sudoku puzzle has one rule at its heart: fill the grid so that no ' +
        'symbol repeats inside a row, a column or a region. Each variant adds rules of its own (see ' +
        'Variants). This is how to play here.',
      'help.how.select.title': 'Select a cell.',
      'help.how.select.text': 'Click or tap it, or move with the arrow keys. The clues are fixed and ' +
        'cannot be changed.',
      'help.how.enter.title': 'Enter a symbol.',
      'help.how.enter.text': 'Type it, or press a key of the pad under the board. Press the same ' +
        'symbol again to clear the cell.',
      'help.how.notes.title': 'Use notes.',
      'help.how.notes.text': 'Switch on Notes (N) to mark the symbols a cell may still hold; they are ' +
        'drawn small inside the cell. A symbol you enter is removed from the notes of the cells that ' +
        'see it, unless you switch that off in Settings.',
      'help.how.check.title': 'Check your work.',
      'help.how.check.text': 'Mistakes can be marked as you type (see Settings) or only when you ' +
        'press Check. Undo and Redo (Ctrl+Z, Ctrl+Y) are exact: a value and the notes it cleared come ' +
        'back together.',
      'help.how.hint.title': 'Ask for a hint.',
      'help.how.hint.text': 'Press Hint (H). It names the logical technique that applies; each press ' +
        'shows more, down to the move itself. Hints are always correct.',
      'help.how.symbols.title': 'Change how symbols look.',
      'help.how.symbols.text': 'Where the board allows it, you can switch between digits, letters, ' +
        'colours and shapes. Colours always carry a small shape as well, so they can be told apart ' +
        'without seeing colour.',
      'help.how.save.title': 'Come back later.',
      'help.how.save.text': 'Your progress is saved automatically on this device. Open the same ' +
        'puzzle again and you can continue; the Recent puzzles list brings it back at once.',
      'help.how.solved.title': 'Finish.',
      'help.how.solved.text': 'When the grid is complete and correct, a message shows your time. The ' +
        'timer pauses when you leave the tab or press Pause. “Reveal the solution” (under Options) ' +
        'shows the answer, but then the puzzle does not count as solved.',
      'help.how.checkModes': 'Tip: a Killer cage whose sum can no longer be reached, or a ' +
        'Greater-Than sign that is broken, is flagged as a rule conflict.',
      'help.variants.intro': 'All 15 variants of Sudoku Generator can be played here. Each entry ' +
        'gives the rules and a tip for playing it.',
      'help.variant.rules.title': 'Rules',
      'help.variant.tip.title': 'Tip for playing',
      'help.hints.intro': 'A hint finds the next logical step from your current grid and names the ' +
        'technique behind it. It never guesses and never suggests a wrong value.',
      'help.hints.level1.title': 'First: the technique.',
      'help.hints.level1.text': 'Its name, what it means, and the region (row, column, box, cage…) to ' +
        'look at.',
      'help.hints.level2.title': 'Then: the cells.',
      'help.hints.level2.text': 'Press Show more to see the cells that take part in the step.',
      'help.hints.level3.title': 'Finally: the move.',
      'help.hints.level3.text': 'The next press shows the placement, or the symbols to remove, with ' +
        'an explanation. “Fill it in” enters a placement for you; “Remove from my notes” applies an ' +
        'elimination.',
      'help.hints.sound': 'Wrong entries are ignored when a hint is worked out (and counted). If no ' +
        'known technique applies from here, the hint says so and offers to reveal one cell.',
      'help.ladder.title': 'The techniques hints can name',
      'help.ladder.intro': 'From the easiest to the hardest. The last ones are rare. Some only apply ' +
        'to Killer or Greater-Than puzzles.',
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
      'help.keys.escape': 'Close the hint card, or a dialog.',
      'help.keys.tab': 'Move between the areas of the page (header, board, tools, pad, side panel). ' +
        'The skip link at the top jumps to the puzzle.',
      'help.keys.paste': 'Paste a puzzle anywhere on the page to open it: a link, the text of a ' +
        'puzzle file, or a line of 81, 36 or 16 characters.',
      'help.keys.openBox': 'In the text box of the Open dialog: open the pasted puzzle.',
      'help.about.privacy.title': 'Privacy: everything stays here',
      'help.about.privacy.text': 'Sudoku Player runs entirely in your browser. Puzzles are read on ' +
        'your own device and nothing is sent to a server; there are no accounts, no trackers and no ' +
        'cookies. It only keeps the small items listed below in the local storage of this browser, so ' +
        'that you can carry on where you stopped.',
      'help.about.key.prefs': 'Your language, theme, text size and the other settings.',
      'help.about.key.progress': 'Your progress on the last 20 puzzles you played.',
      'help.about.key.puzzles': 'The last 10 puzzles you opened (for the Recent puzzles list).',
      'help.about.key.last': 'Which puzzle was on the board when you left.',
      'help.about.delete': 'Delete saved puzzles and progress',
      'help.about.delete.confirm': 'Press again to delete',
      'help.about.a11y.title': 'Accessibility',
      'help.about.a11y.text': 'The board is a grid you can move through with the keyboard, every cell ' +
        'has a spoken label, there are light, dark and high-contrast themes, and animations can be ' +
        'switched off. It has been checked with an automated browser, but not yet with a real screen ' +
        'reader.',
      'help.about.links.title': 'Links',
      'help.about.link.generator': 'Sudoku Generator: make a puzzle',
      'help.about.link.repo': 'Source code and documentation',
      'help.about.licence': 'Sudoku Player is open source (MIT licence).',
      'help.variant.classic4.rules': 'Fill the 4×4 grid so that every row, every column and every 2×2 ' +
        'box contains each of the digits 1 to 4 exactly once. Some digits are given; you work out the ' +
        'others by logic alone, and there is always exactly one solution.',
      'help.variant.classic4.tip': 'The smallest board is a good place to learn how notes and hints ' +
        'work.',
      'help.variant.classic6.rules': 'Fill the 6×6 grid so that every row, every column and every box ' +
        'contains each of the digits 1 to 6 exactly once. The boxes are 2 rows high and 3 columns ' +
        'wide.',
      'help.variant.classic6.tip': 'Boxes are 2 rows high and 3 columns wide, so a box and a row ' +
        'overlap differently from 9×9.',
      'help.variant.classic9.rules': 'The classic puzzle. Fill the 9×9 grid so that every row, every ' +
        'column and every 3×3 box contains each of the digits 1 to 9 exactly once. The given digits ' +
        'are enough to make the solution unique.',
      'help.variant.classic9.tip': 'The reference board. Hints can name any of the techniques listed ' +
        'under Hints.',
      'help.variant.mega12.rules': 'Fill the 12×12 grid so that every row, every column and every box ' +
        'contains each of the 12 symbols exactly once. The boxes are 3 rows high and 4 columns wide. ' +
        'The symbols are the digits 1 to 9 followed by A, B and C, or the numbers 1 to 12.',
      'help.variant.mega12.tip': 'The grid is wide, so it is small on a phone: turn the phone ' +
        'sideways or zoom the page. Symbols such as 10 to 12 take two keystrokes: type both ' +
        'characters.',
      'help.variant.mega16.rules': 'Fill the 16×16 grid so that every row, every column and every 4×4 ' +
        'box contains each of the 16 symbols exactly once. The symbols are the hexadecimal digits 0 ' +
        'to 9 and A to F (or 1 to 9 and A to G, depending on how the puzzle was made).',
      'help.variant.mega16.tip': 'Symbols are the hexadecimal digits, so press the key of the symbol: ' +
        '0 to 9, then A to F. The cells are small; use a large screen or zoom the page.',
      'help.variant.diagonalX.rules': 'Classic 9×9 rules, plus one more: each of the two long ' +
        'diagonals, from corner to corner, must also contain each of the digits 1 to 9 exactly once.',
      'help.variant.diagonalX.tip': 'Both diagonals are tinted. A cell on a diagonal sees four groups ' +
        'at once (row, column, box and diagonal), which gives more deductions.',
      'help.variant.hyper.rules': 'Classic 9×9 rules, plus four extra 3×3 windows, drawn shaded. Each ' +
        'window must also contain each of the digits 1 to 9 exactly once. The windows sit one cell in ' +
        'from the corners of the grid: rows and columns 2 to 4 and 6 to 8.',
      'help.variant.hyper.tip': 'The shaded windows overlap the normal boxes, so a symbol often has ' +
        'fewer places to go. This variant is also known as Windoku.',
      'help.variant.jigsaw9.rules': 'The nine 3×3 boxes are replaced by nine irregular regions of ' +
        'nine cells each, drawn with thick borders. Every row, every column and every region contains ' +
        'each of the digits 1 to 9 exactly once.',
      'help.variant.jigsaw9.tip': 'There are no 3×3 boxes: read the thick borders. Notes help to keep ' +
        'track of the odd shapes.',
      'help.variant.killer.rules': 'The cells are grouped into cages, drawn with dashed outlines, and ' +
        'the small number in the corner of a cage is its sum. The digits in a cage must add up to ' +
        'that sum and may not repeat inside the cage. The usual row, column and box rules apply as ' +
        'well. Few or no digits are given.',
      'help.variant.killer.tip': 'Work out which digits can make the sum of a cage (the hint names ' +
        'the technique, such as Cage Sum Combination or the Rule of 45). Digits never repeat inside a ' +
        'cage.',
      'help.variant.greaterThan.rules': 'Signs between neighbouring cells tell which of the two ' +
        'digits is larger. The point of a < or > sign is on the side of the smaller digit, and it ' +
        'opens towards the larger one. The usual row, column and box rules apply as well.',
      'help.variant.greaterThan.tip': 'A sign points towards the smaller symbol. Signs limit both ' +
        'cells they touch, so a 1 or a 9 next to a sign is often a quick win.',
      'help.variant.samurai.rules': 'Five 9×9 grids overlap in an X shape: four corner grids and one ' +
        'in the middle. The middle grid shares one 3×3 box with each corner grid. Every grid follows ' +
        'the classic rules, and a shared box counts for both of its grids at once. 369 cells in all.',
      'help.variant.samurai.tip': 'A cell in an overlap belongs to two grids at once. The arrow keys ' +
        'skip the gaps between grids.',
      'help.variant.sohei.rules': 'Four 9×9 grids are arranged in a ring around an empty middle. Each ' +
        'grid shares one 3×3 box with each of its two neighbours. Every grid follows the classic ' +
        'rules, and a shared box counts for both of its grids at once. 288 cells in all.',
      'help.variant.sohei.tip': 'The empty middle belongs to no grid. A symbol placed in a shared box ' +
        'helps two grids at once.',
      'help.variant.butterfly.rules': 'Four 9×9 grids, each shifted by three cells from the next, ' +
        'overlap in a central 6×6 area (144 cells in all). Every grid follows the classic rules, and ' +
        'a cell in an overlap must satisfy every grid it belongs to.',
      'help.variant.butterfly.tip': 'The middle 6×6 area belongs to all four grids, so a symbol ' +
        'placed there is checked against four grids.',
      'help.variant.flower.rules': 'Five 9×9 grids: a centre grid and four petals above, below, left ' +
        'and right of it, each shifted by three cells. A petal overlaps the centre in a band of 6×9 ' +
        'cells, and the petals overlap one another near the corners of the centre. 189 cells in all; ' +
        'every grid follows the classic rules.',
      'help.variant.flower.tip': 'The densest overlap of all: many cells belong to two or three ' +
        'grids, so every entry has far-reaching consequences.',
      'help.variant.wordoku.rules': 'A 9×9 Sudoku played with nine letters instead of digits: every ' +
        'row, column and 3×3 box contains each of the nine letters exactly once. The nine letters are ' +
        'those of a hidden key word, written along one line of the solution: the main diagonal by ' +
        'default, or a row or a column.',
      'help.variant.wordoku.tip': 'Nine letters replace the digits. The key word is hidden along one ' +
        'line of the solution and appears when you solve the puzzle. Switch the symbol set to digits ' +
        'if you prefer numbers.'
    },
    vi: {
      'help.title': 'Trợ giúp',
      'help.tab.how': 'Cách chơi',
      'help.tab.variants': 'Biến thể',
      'help.tab.hints': 'Gợi ý',
      'help.tab.keys': 'Bàn phím',
      'help.tab.about': 'Giới thiệu',
      'help.how.intro': 'Mọi câu đố Sudoku đều có một luật cốt lõi: điền vào lưới sao cho không ký ' +
        'hiệu nào lặp lại trong một hàng, một cột hay một vùng. Mỗi biến thể có thêm luật riêng (xem ' +
        'mục Biến thể). Đây là cách chơi ở đây.',
      'help.how.select.title': 'Chọn một ô.',
      'help.how.select.text': 'Nhấp hoặc chạm vào ô, hoặc di chuyển bằng các phím mũi tên. Các ô cho ' +
        'sẵn là cố định và không đổi được.',
      'help.how.enter.title': 'Điền một ký hiệu.',
      'help.how.enter.text': 'Gõ ký hiệu, hoặc bấm một phím trên bàn phím số dưới bảng. Bấm lại cùng ' +
        'ký hiệu để xóa ô.',
      'help.how.notes.title': 'Dùng ghi chú.',
      'help.how.notes.text': 'Bật Ghi chú (N) để đánh dấu các ký hiệu mà ô còn có thể nhận; chúng ' +
        'được vẽ nhỏ trong ô. Ký hiệu bạn điền sẽ tự biến mất khỏi ghi chú của các ô nhìn thấy nó, ' +
        'trừ khi bạn tắt tùy chọn này trong Cài đặt.',
      'help.how.check.title': 'Kiểm tra bài làm.',
      'help.how.check.text': 'Lỗi có thể được đánh dấu ngay khi bạn gõ (xem Cài đặt) hoặc chỉ khi bạn ' +
        'bấm Kiểm tra. Hoàn tác và Làm lại (Ctrl+Z, Ctrl+Y) chính xác tuyệt đối: một giá trị và các ' +
        'ghi chú nó đã xóa cùng quay lại.',
      'help.how.hint.title': 'Xin gợi ý.',
      'help.how.hint.text': 'Bấm Gợi ý (H). Gợi ý nêu tên kỹ thuật suy luận có thể dùng; mỗi lần bấm ' +
        'cho thấy thêm, cho đến chính nước đi. Gợi ý luôn đúng.',
      'help.how.symbols.title': 'Đổi cách hiển thị ký hiệu.',
      'help.how.symbols.text': 'Khi bảng cho phép, bạn có thể chuyển giữa chữ số, chữ cái, màu và ' +
        'hình. Màu luôn kèm một hình nhỏ, nên vẫn phân biệt được mà không cần nhìn màu.',
      'help.how.save.title': 'Quay lại sau.',
      'help.how.save.text': 'Tiến độ được tự động lưu trên thiết bị này. Mở lại đúng đề đó là bạn có ' +
        'thể chơi tiếp; danh sách Đề gần đây đưa đề trở lại ngay.',
      'help.how.solved.title': 'Hoàn thành.',
      'help.how.solved.text': 'Khi lưới đầy đủ và đúng, một thông báo cho biết thời gian của bạn. ' +
        'Đồng hồ tạm dừng khi bạn rời tab hoặc bấm Tạm dừng. “Hiện đáp án” (trong Tùy chọn) cho xem ' +
        'lời giải, nhưng khi đó đề không được tính là đã giải.',
      'help.how.checkModes': 'Mẹo: một lồng Killer không thể đạt tổng nữa, hay một dấu so sánh bị vi ' +
        'phạm, sẽ được đánh dấu là vi phạm luật.',
      'help.variants.intro': 'Cả 15 biến thể của Trình sinh đề Sudoku đều chơi được ở đây. Mỗi mục ' +
        'nêu luật chơi và một mẹo khi chơi.',
      'help.variant.rules.title': 'Luật chơi',
      'help.variant.tip.title': 'Mẹo khi chơi',
      'help.hints.intro': 'Gợi ý tìm bước suy luận tiếp theo từ lưới hiện tại của bạn và nêu tên kỹ ' +
        'thuật đứng sau nó. Gợi ý không bao giờ đoán mò và không bao giờ đề xuất giá trị sai.',
      'help.hints.level1.title': 'Trước hết: kỹ thuật.',
      'help.hints.level1.text': 'Tên kỹ thuật, ý nghĩa của nó và vùng (hàng, cột, khối, lồng…) cần ' +
        'nhìn vào.',
      'help.hints.level2.title': 'Tiếp theo: các ô.',
      'help.hints.level2.text': 'Bấm Xem thêm để thấy các ô tham gia vào bước này.',
      'help.hints.level3.title': 'Cuối cùng: nước đi.',
      'help.hints.level3.text': 'Lần bấm tiếp theo cho thấy ô cần điền, hoặc các ký hiệu cần loại, ' +
        'kèm lời giải thích. “Điền giúp tôi” sẽ điền ô đó; “Xóa khỏi ghi chú của tôi” áp dụng một ' +
        'phép loại trừ.',
      'help.hints.sound': 'Các ô điền sai bị bỏ qua khi tìm gợi ý (và được đếm). Nếu từ đây không kỹ ' +
        'thuật nào đã biết áp dụng được, gợi ý sẽ nói rõ và đề nghị hiện một ô.',
      'help.ladder.title': 'Các kỹ thuật mà gợi ý có thể nêu',
      'help.ladder.intro': 'Từ dễ nhất đến khó nhất. Những kỹ thuật cuối rất hiếm. Một số chỉ áp dụng ' +
        'cho đề Killer hoặc Greater-Than.',
      'help.keys.intro': 'Mọi thao tác đều làm được bằng bàn phím.',
      'help.keys.move': 'Di chuyển giữa các ô. Home và End đến hai đầu hàng, Page Up và Page Down ' +
        'nhảy lên hoặc xuống một khối. Trên bảng nhiều lưới, các phím bỏ qua các khoảng trống.',
      'help.keys.enter': 'Điền ký hiệu vào ô đang chọn: chữ số và chữ cái như bảng hiển thị. Ký hiệu ' +
        'hai ký tự (10 đến 12 trên Mega 12×12) cần gõ hai phím.',
      'help.keys.erase': 'Xóa ô đang chọn: giá trị trước, rồi đến ghi chú.',
      'help.keys.notes': 'Chuyển giữa điền giá trị và ghi chú.',
      'help.keys.hint': 'Xin gợi ý, và bấm lại để xem chi tiết hơn.',
      'help.keys.undo': 'Hoàn tác.',
      'help.keys.redo': 'Làm lại.',
      'help.keys.escape': 'Đóng thẻ gợi ý, hoặc một hộp thoại.',
      'help.keys.tab': 'Chuyển giữa các vùng của trang (đầu trang, bảng, công cụ, bàn phím số, bảng ' +
        'bên). Liên kết bỏ qua ở đầu trang nhảy thẳng tới đề.',
      'help.keys.paste': 'Dán một đề vào bất kỳ đâu trên trang để mở nó: liên kết, nội dung tệp đề, ' +
        'hoặc một dòng 81, 36 hay 16 ký tự.',
      'help.keys.openBox': 'Trong ô văn bản của hộp thoại Mở đề: mở đề vừa dán.',
      'help.about.privacy.title': 'Riêng tư: mọi thứ ở lại đây',
      'help.about.privacy.text': 'Trình chơi Sudoku chạy hoàn toàn trong trình duyệt của bạn. Đề được ' +
        'đọc ngay trên thiết bị của bạn và không có gì được gửi tới máy chủ; không có tài khoản, ' +
        'không theo dõi, không cookie. Trang chỉ lưu vài mục nhỏ liệt kê dưới đây trong bộ nhớ cục bộ ' +
        'của trình duyệt này, để bạn chơi tiếp được từ chỗ đã dừng.',
      'help.about.key.prefs': 'Ngôn ngữ, giao diện, cỡ chữ và các cài đặt khác của bạn.',
      'help.about.key.progress': 'Tiến độ của 20 đề bạn chơi gần nhất.',
      'help.about.key.puzzles': '10 đề bạn mở gần nhất (cho danh sách Đề gần đây).',
      'help.about.key.last': 'Đề nào đang trên bàn cờ khi bạn rời đi.',
      'help.about.delete': 'Xóa các đề và tiến độ đã lưu',
      'help.about.delete.confirm': 'Nhấn lần nữa để xóa',
      'help.about.a11y.title': 'Khả năng tiếp cận',
      'help.about.a11y.text': 'Bảng là một lưới bạn có thể di chuyển bằng bàn phím, mỗi ô có nhãn đọc ' +
        'được, có giao diện sáng, tối và tương phản cao, và có thể tắt hiệu ứng chuyển động. Trang đã ' +
        'được kiểm tra bằng trình duyệt tự động, nhưng chưa được thử với trình đọc màn hình thật.',
      'help.about.links.title': 'Liên kết',
      'help.about.link.generator': 'Trình sinh đề Sudoku: tạo một đề',
      'help.about.link.repo': 'Mã nguồn và tài liệu',
      'help.about.licence': 'Trình chơi Sudoku là phần mềm mã nguồn mở (giấy phép MIT).',
      'help.variant.classic4.rules': 'Điền vào lưới 4×4 sao cho mỗi hàng, mỗi cột và mỗi khối 2×2 đều ' +
        'chứa các chữ số từ 1 đến 4, mỗi số đúng một lần. Một số ô đã được cho sẵn; bạn chỉ dùng suy ' +
        'luận để tìm các ô còn lại, và luôn chỉ có đúng một lời giải.',
      'help.variant.classic4.tip': 'Bảng nhỏ nhất là nơi tốt để làm quen với ghi chú và gợi ý.',
      'help.variant.classic6.rules': 'Điền vào lưới 6×6 sao cho mỗi hàng, mỗi cột và mỗi khối đều ' +
        'chứa các chữ số từ 1 đến 6, mỗi số đúng một lần. Mỗi khối cao 2 hàng và rộng 3 cột.',
      'help.variant.classic6.tip': 'Mỗi khối cao 2 hàng và rộng 3 cột, nên khối và hàng chồng lên ' +
        'nhau khác với bảng 9×9.',
      'help.variant.classic9.rules': 'Câu đố kinh điển. Điền vào lưới 9×9 sao cho mỗi hàng, mỗi cột ' +
        'và mỗi khối 3×3 đều chứa các chữ số từ 1 đến 9, mỗi số đúng một lần. Các số cho sẵn vừa đủ ' +
        'để lời giải là duy nhất.',
      'help.variant.classic9.tip': 'Bảng chuẩn. Gợi ý có thể nêu bất kỳ kỹ thuật nào trong danh sách ' +
        'ở mục Gợi ý.',
      'help.variant.mega12.rules': 'Điền vào lưới 12×12 sao cho mỗi hàng, mỗi cột và mỗi khối đều ' +
        'chứa đủ 12 ký hiệu, mỗi ký hiệu đúng một lần. Mỗi khối cao 3 hàng và rộng 4 cột. Các ký hiệu ' +
        'là chữ số từ 1 đến 9 rồi đến A, B, C, hoặc các số từ 1 đến 12.',
      'help.variant.mega12.tip': 'Lưới rộng nên trên điện thoại sẽ nhỏ: hãy xoay ngang điện thoại ' +
        'hoặc phóng to trang. Các ký hiệu như 10 đến 12 cần gõ hai phím: gõ cả hai ký tự.',
      'help.variant.mega16.rules': 'Điền vào lưới 16×16 sao cho mỗi hàng, mỗi cột và mỗi khối 4×4 đều ' +
        'chứa đủ 16 ký hiệu, mỗi ký hiệu đúng một lần. Các ký hiệu là chữ số hệ thập lục phân từ 0 ' +
        'đến 9 và từ A đến F (hoặc từ 1 đến 9 và từ A đến G, tùy cách đề được tạo).',
      'help.variant.mega16.tip': 'Các ký hiệu là chữ số hệ thập lục phân, nên hãy bấm phím của ký ' +
        'hiệu: 0 đến 9, rồi A đến F. Các ô nhỏ; hãy dùng màn hình lớn hoặc phóng to trang.',
      'help.variant.diagonalX.rules': 'Luật Sudoku 9×9 cổ điển, thêm một luật nữa: mỗi đường chéo ' +
        'dài, từ góc này sang góc đối diện, cũng phải chứa các chữ số từ 1 đến 9, mỗi số đúng một ' +
        'lần.',
      'help.variant.diagonalX.tip': 'Cả hai đường chéo được tô màu. Một ô trên đường chéo thuộc bốn ' +
        'nhóm cùng lúc (hàng, cột, khối và đường chéo), nên có thêm nhiều suy luận.',
      'help.variant.hyper.rules': 'Luật Sudoku 9×9 cổ điển, thêm bốn cửa sổ 3×3 được tô bóng. Mỗi cửa ' +
        'sổ cũng phải chứa các chữ số từ 1 đến 9, mỗi số đúng một lần. Các cửa sổ nằm lùi vào một ô ' +
        'so với các góc của lưới: hàng và cột 2 đến 4 và 6 đến 8.',
      'help.variant.hyper.tip': 'Các cửa sổ tô bóng chồng lên các khối thường, nên một ký hiệu thường ' +
        'có ít chỗ hơn để đặt. Biến thể này còn gọi là Windoku.',
      'help.variant.jigsaw9.rules': 'Chín khối 3×3 được thay bằng chín vùng không đều, mỗi vùng gồm ' +
        'chín ô và có viền đậm. Mỗi hàng, mỗi cột và mỗi vùng đều chứa các chữ số từ 1 đến 9, mỗi số ' +
        'đúng một lần.',
      'help.variant.jigsaw9.tip': 'Không có khối 3×3: hãy đọc các viền đậm. Ghi chú giúp theo dõi ' +
        'những hình dạng kỳ lạ.',
      'help.variant.killer.rules': 'Các ô được gom thành những lồng viền nét đứt, và con số nhỏ ở góc ' +
        'lồng là tổng của nó. Các chữ số trong một lồng phải cộng lại bằng tổng đó và không được lặp ' +
        'lại trong lồng. Các luật hàng, cột và khối thông thường vẫn áp dụng. Hầu như không có chữ số ' +
        'cho sẵn.',
      'help.variant.killer.tip': 'Hãy tìm xem những chữ số nào có thể tạo nên tổng của một lồng (gợi ' +
        'ý nêu tên kỹ thuật, như Tổ hợp tổng của lồng hay Quy tắc 45). Chữ số không bao giờ lặp lại ' +
        'trong một lồng.',
      'help.variant.greaterThan.rules': 'Các dấu giữa hai ô cạnh nhau cho biết chữ số nào lớn hơn. ' +
        'Đầu nhọn của dấu < hoặc > hướng về phía chữ số nhỏ hơn và mở ra phía chữ số lớn hơn. Các ' +
        'luật hàng, cột và khối thông thường vẫn áp dụng.',
      'help.variant.greaterThan.tip': 'Dấu hướng về phía ký hiệu nhỏ hơn. Mỗi dấu ràng buộc cả hai ô ' +
        'nó chạm tới, nên số 1 hoặc 9 cạnh một dấu thường là nước đi nhanh.',
      'help.variant.samurai.rules': 'Năm lưới 9×9 chồng lên nhau theo hình chữ X: bốn lưới ở góc và ' +
        'một lưới ở giữa. Lưới giữa dùng chung một khối 3×3 với từng lưới góc. Mỗi lưới theo luật cổ ' +
        'điển, và khối dùng chung được tính cho cả hai lưới cùng lúc. Tổng cộng 369 ô.',
      'help.variant.samurai.tip': 'Một ô trong vùng chồng thuộc hai lưới cùng lúc. Các phím mũi tên ' +
        'bỏ qua khoảng trống giữa các lưới.',
      'help.variant.sohei.rules': 'Bốn lưới 9×9 xếp thành một vòng quanh một khoảng trống ở giữa. Mỗi ' +
        'lưới dùng chung một khối 3×3 với từng lưới trong hai lưới bên cạnh. Mỗi lưới theo luật cổ ' +
        'điển, và khối dùng chung được tính cho cả hai lưới cùng lúc. Tổng cộng 288 ô.',
      'help.variant.sohei.tip': 'Khoảng trống ở giữa không thuộc lưới nào. Một ký hiệu đặt trong khối ' +
        'dùng chung giúp hai lưới cùng lúc.',
      'help.variant.butterfly.rules': 'Bốn lưới 9×9, mỗi lưới lệch ba ô so với lưới kế tiếp, chồng ' +
        'lên nhau ở một vùng 6×6 ở giữa (tổng cộng 144 ô). Mỗi lưới theo luật cổ điển, và một ô nằm ' +
        'trong vùng chồng phải thỏa mãn mọi lưới chứa nó.',
      'help.variant.butterfly.tip': 'Vùng 6×6 ở giữa thuộc cả bốn lưới, nên ký hiệu đặt ở đó được ' +
        'kiểm tra với bốn lưới.',
      'help.variant.flower.rules': 'Năm lưới 9×9: một lưới ở giữa và bốn cánh hoa ở phía trên, dưới, ' +
        'trái, phải của nó, mỗi cánh lệch ba ô. Một cánh chồng lên lưới giữa ở một dải 6×9 ô, và các ' +
        'cánh còn chồng lên nhau gần các góc của lưới giữa. Tổng cộng 189 ô; mỗi lưới theo luật cổ ' +
        'điển.',
      'help.variant.flower.tip': 'Vùng chồng dày đặc nhất: nhiều ô thuộc hai hoặc ba lưới, nên mỗi ' +
        'lần điền đều có hệ quả rất xa.',
      'help.variant.wordoku.rules': 'Một câu Sudoku 9×9 chơi bằng chín chữ cái thay cho chữ số: mỗi ' +
        'hàng, cột và khối 3×3 đều chứa đủ chín chữ cái, mỗi chữ đúng một lần. Chín chữ cái là các ' +
        'chữ của một từ khóa ẩn, được viết dọc theo một đường của lời giải: mặc định là đường chéo ' +
        'chính, hoặc một hàng hay một cột.',
      'help.variant.wordoku.tip': 'Chín chữ cái thay cho chữ số. Từ khóa ẩn dọc một đường của lời ' +
        'giải và hiện ra khi bạn giải xong. Hãy chuyển bộ ký hiệu sang chữ số nếu bạn thích dùng số.'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
