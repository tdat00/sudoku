/**
 * The player app (design.md sections 2.3, 7, 8): `SG.app`. Starts the page, opens puzzles, keeps the progress
 * and wires the other modules. Everything the reused modules (`play.js`, `a11y.js`, `theme.js`, `help.js`)
 * need from the app is the small surface below (the one the generator's app offered them).
 *
 * Opening a puzzle (every way ends in `openPuzzle`):
 *   - `#puzzle=<token>` in the address (the generator's "Play online" link): checked at start-up and on
 *     `hashchange`; the fragment is removed with `history.replaceState` as soon as it was read
 *   - the Open dialog (file picker, paste box), a file dropped anywhere on the page, a paste on the page
 *   - the recent list, and a reload without a fragment (the puzzle that was on the board)
 *   All of them go through `SG.importer.open`; an opened puzzle with saved progress asks "Continue" or "Start
 *   over" (the recent list and a reload continue without asking).
 *
 * PUBLIC API (`SG.app`)
 *   start()                         starts the app; idempotent; returns true when it is running (false
 *                                   without a DOM). Called by the last script of index.html.
 *   getStore()                      the preferences store (`SG.store`).
 *   getBoard()                      the board view (`SG.boardView`), null before `start`.
 *   getResult()                     `{ result: puzzle, trace: [] }` for the puzzle on the board, else null
 *                                   ("result" is the opened puzzle: `model`, `givens`, `solution`, ...).
 *   getPuzzle()                     the puzzle on the board, or null.
 *   toast(kind, key, args)          a translated toast ('success' | 'warning' | 'danger' | 'info').
 *   openModal({titleKey, titleArgs, body, footer, wide, onClose})  a modal dialog in `#modal-root`; returns
 *                                   `{ el, panel, body, footer, close(), setTitle(key, args) }` (null without
 *                                   a DOM). Focus goes to the first control and comes back on close.
 *   announce(text)                  says something to screen readers (`#a11y-live`).
 *   on(name, fn) / emit(name, payload)  events, see below; `on` returns the function that unsubscribes.
 *   showResult(puzzle, options)     puts a puzzle on the board, no questions asked: `{ state, symbolMode,
 *                                   focus, source }`; returns a Promise of true.
 *   open(input, options)            opens text (JSON, token, link, 16 / 36 / 81 characters) or a File / Blob
 *                                   through the importer: Promise of true when a puzzle is on the board.
 *   openPuzzle(puzzle, options)     a puzzle from `SG.importer`; `options.resume`: 'ask' (default),
 *                                   'continue' or 'fresh'; Promise of whether the puzzle is on the board.
 *   openOpenDialog()                the Import dialog.
 *   openShareDialog()               the Share dialog: the link that opens the puzzle on the board in the player
 *                                   (the same kind of link as the generator's Play button); null without a puzzle.
 *   clearSavedData()                forgets the saved puzzles and progress (not the preferences).
 *   saveNow()                       writes the progress of the game on the board at once.
 *
 * Events (`on(name, fn)`; `fn(payload, name)`):
 *   'result'     a puzzle is on the board: `{ result: puzzle, trace: [] }`
 *   'settings'   a preference changed: `{ state, keys, source }`
 *   'locale'     the language changed: `{ locale }`
 *   'theme'      the theme preference changed: `{ theme }`
 *   'action'     a button was used: `{ id: 'open' | 'share' | 'settings' | 'help' }`
 *   'play:game'  a game was attached to the board: `{ game, puzzle }` (emitted by play.js)
 *   'play:change' the game changed (emitted by play.js); the progress is saved shortly after
 *   'data:cleared' the saved data were deleted
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first instance on repeated loads: the running page must survive.
  if (SG.app && typeof SG.app.start === 'function') return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const TOAST_KINDS = Object.freeze(['success', 'warning', 'danger', 'info']);
  const TOAST_MS = Object.freeze({ success: 3500, info: 5000, warning: 7000, danger: 10000 });
  const MAX_TOASTS = 4;
  const MAX_FILE_BYTES = 8 * 1024 * 1024;
  const SAVE_DELAY_MS = 400;
  const RECENT_SHOWN = 100;
  const REPORT_SHOWN = 8;
  const LONG_LINK_CHARS = 100000;
  const DEFAULT_PLAYER_URL = 'https://tdat00.github.io/sudoku-player/';
  const DEFAULT_GENERATOR_URL = 'https://tdat00.github.io/sudoku-generator/';
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
    'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  // ---------------------------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------------------------

  function t(key, args) {
    return SG.i18n.t(key, args);
  }

  function logError(err) {
    if (typeof console !== 'undefined' && typeof console.error === 'function') console.error(err);
  }

  function safely(fn, arg) {
    try {
      return fn(arg);
    } catch (err) {
      logError(err);
      return undefined;
    }
  }

  function byId(id) {
    return typeof document !== 'undefined' ? document.getElementById(id) : null;
  }

  /** Creates an element; attribute values of null / undefined / false are skipped, `true` gives ''. */
  function make(tag, attrs, children) {
    const node = document.createElement(tag);
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

  function icon(name) {
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#ic-' + name);
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.appendChild(use);
    return svg;
  }

  function isTextField(node) {
    if (!node || typeof node.tagName !== 'string') return false;
    const tag = node.tagName.toUpperCase();
    return tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable === true ||
      (tag === 'INPUT' && ['button', 'checkbox', 'radio', 'submit', 'file'].indexOf(node.type) === -1);
  }

  function formatDate(value) {
    const date = typeof value === 'number' ? new Date(value) : new Date(String(value));
    if (isNaN(date.getTime())) return '';
    try {
      return date.toLocaleDateString(SG.i18n.current, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (err) {
      return date.toISOString().slice(0, 10);
    }
  }

  function variantName(id) {
    const key = 'variant.' + id;
    return SG.i18n.has(key) ? t(key) : String(id);
  }

  function levelName(level) {
    const key = 'difficulty.' + level;
    return typeof level === 'string' && SG.i18n.has(key) ? t(key) : '';
  }

  /** The generator's address from `<meta name="sg-generator-url">`; http(s) only. */
  function generatorUrl() {
    const meta = typeof document !== 'undefined' ?
      document.querySelector('meta[name="sg-generator-url"]') : null;
    const value = meta ? meta.getAttribute('content') : null;
    return typeof value === 'string' && /^https?:\/\/[^\s]+$/i.test(value) ? value : DEFAULT_GENERATOR_URL;
  }

  // ---------------------------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------------------------

  const listeners = {};
  const toasts = [];
  const modals = [];
  const cleanup = [];
  let started = false;
  let els = null;
  let store = null;
  let saved = null;
  let board = null;
  let current = null;
  let game = null;
  let saveTimer = null;
  let announceTimer = null;
  let modalCounter = 0;
  let openSeq = 0;
  let dragDepth = 0;
  let storageWarned = false;
  let hasSavedProgress = false;
  let openDialog = null;
  let shareDialog = null;

  // ---------------------------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------------------------

  function on(name, fn) {
    if (typeof name !== 'string' || typeof fn !== 'function') {
      throw new TypeError('SG.app.on needs an event name and a function');
    }
    (listeners[name] = listeners[name] || []).push(fn);
    return function off() {
      if (!listeners[name]) return;
      listeners[name] = listeners[name].filter(function (other) { return other !== fn; });
    };
  }

  function emit(name, payload) {
    (listeners[name] || []).slice().forEach(function (fn) {
      try {
        fn(payload, name);
      } catch (err) {
        logError(err);
      }
    });
  }

  // ---------------------------------------------------------------------------------------------
  // Live region, toasts, modals
  // ---------------------------------------------------------------------------------------------

  function announce(text) {
    const host = byId('a11y-live');
    if (host === null) return;
    root.clearTimeout(announceTimer);
    host.textContent = '';
    // A short pause makes a repeated text count as a change.
    announceTimer = root.setTimeout(function () { host.textContent = String(text); }, 60);
  }

  function toastText(kind, text) {
    const host = byId('toast-root');
    const none = { close: function () {} };
    if (host === null) return none;
    const type = TOAST_KINDS.indexOf(kind) === -1 ? 'info' : kind;
    for (let i = 0; i < toasts.length; i++) {
      // The same message twice (the same warning for two puzzles) is shown once, with a fresh timer.
      if (toasts[i].text === text && toasts[i].type === type) {
        toasts[i].arm();
        return { close: toasts[i].close };
      }
    }
    const closeButton = make('button', {
      type: 'button', class: 'btn btn--ghost btn--icon btn--sm toast__close', 'aria-label': t('common.close')
    }, [icon('x')]);
    const node = make('div', { class: 'toast toast--' + type, 'data-kind': type }, [
      make('span', { class: 'toast__message', text: text }),
      closeButton
    ]);
    const entry = { node: node, timer: null, text: text, type: type, arm: null, close: null };
    function close() {
      root.clearTimeout(entry.timer);
      const at = toasts.indexOf(entry);
      if (at !== -1) toasts.splice(at, 1);
      if (node.parentNode) node.parentNode.removeChild(node);
    }
    function arm() {
      root.clearTimeout(entry.timer);
      entry.timer = root.setTimeout(close, TOAST_MS[type]);
    }
    entry.arm = arm;
    entry.close = close;
    closeButton.addEventListener('click', close);
    node.addEventListener('mouseenter', function () { root.clearTimeout(entry.timer); });
    node.addEventListener('mouseleave', arm);
    node.addEventListener('focusin', function () { root.clearTimeout(entry.timer); });
    node.addEventListener('focusout', arm);
    host.appendChild(node);
    toasts.push(entry);
    while (toasts.length > MAX_TOASTS) {
      const oldest = toasts[0];
      root.clearTimeout(oldest.timer);
      toasts.shift();
      if (oldest.node.parentNode) oldest.node.parentNode.removeChild(oldest.node);
    }
    arm();
    return { close: close };
  }

  function toast(kind, key, args) {
    return toastText(kind, t(key, args));
  }

  function fill(container, spec) {
    if (typeof spec === 'function') {
      const made = spec(container);
      if (made && made.nodeType === 1 && made.parentNode !== container) container.appendChild(made);
    } else if (spec && spec.nodeType === 1) {
      container.appendChild(spec);
    } else if (typeof spec === 'string') {
      container.textContent = spec;
    }
  }

  function openModal(options) {
    const host = byId('modal-root');
    if (host === null) return null;
    const o = options || {};
    const previous = document.activeElement;
    const nativeDialog = typeof root.HTMLDialogElement === 'function';
    const id = 'modal-title-' + (++modalCounter);
    let titleKey = o.titleKey;
    let titleArgs = o.titleArgs;
    const title = make('h2', { class: 'modal__title', id: id, text: t(titleKey, titleArgs) });
    const closeButton = make('button', {
      type: 'button', class: 'btn btn--ghost btn--icon btn--sm', 'data-role': 'modal-close',
      'aria-label': t('common.close'), title: t('common.close')
    }, [icon('x')]);
    const bodyEl = make('div', { class: 'modal__body' });
    const footerEl = o.footer ? make('div', { class: 'modal__footer' }) : null;
    const panel = make('div', { class: 'modal__panel' + (o.wide ? ' modal__panel--wide' : '') }, [
      make('header', { class: 'modal__header' }, [title, closeButton]),
      bodyEl
    ]);
    if (footerEl !== null) panel.appendChild(footerEl);
    const el = make(nativeDialog ? 'dialog' : 'div', { class: 'modal', 'aria-labelledby': id });
    if (!nativeDialog) {
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
    }
    el.appendChild(panel);
    host.appendChild(el);

    let closed = false;
    const record = { el: el, close: null };
    const unsubscribe = SG.i18n.onChange(function () {
      title.textContent = t(titleKey, titleArgs);
      closeButton.setAttribute('aria-label', t('common.close'));
      closeButton.setAttribute('title', t('common.close'));
    });

    function close() {
      if (closed) return;
      closed = true;
      unsubscribe();
      el.removeEventListener('click', onBackdrop);
      el.removeEventListener('cancel', onCancel);
      el.removeEventListener('keydown', onKeyDown);
      const at = modals.indexOf(record);
      if (at !== -1) modals.splice(at, 1);
      if (nativeDialog && el.open && typeof el.close === 'function') safely(function () { el.close(); });
      if (el.parentNode) el.parentNode.removeChild(el);
      if (modals.length === 0 && document.body) document.body.classList.remove('is-modal-open');
      if (previous && previous.isConnected && typeof previous.focus === 'function') previous.focus();
      if (typeof o.onClose === 'function') safely(o.onClose);
    }
    function onBackdrop(event) {
      if (event.target === el) close();
    }
    function onCancel(event) {
      event.preventDefault();
      close();
    }
    // Without <dialog> there is no built-in Esc and no focus trap.
    function onKeyDown(event) {
      if (nativeDialog) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      } else if (event.key === 'Tab') {
        const items = Array.prototype.filter.call(el.querySelectorAll(FOCUSABLE),
          function (node) { return node.offsetParent !== null; });
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    record.close = close;
    closeButton.addEventListener('click', close);
    el.addEventListener('click', onBackdrop);
    el.addEventListener('cancel', onCancel);
    el.addEventListener('keydown', onKeyDown);

    fill(bodyEl, o.body);
    if (footerEl !== null) fill(footerEl, o.footer);
    SG.i18n.applyTo(el);
    modals.push(record);
    document.body.classList.add('is-modal-open');
    if (nativeDialog && typeof el.showModal === 'function') el.showModal();
    else el.setAttribute('open', '');
    const first = bodyEl.querySelector(FOCUSABLE) || (footerEl && footerEl.querySelector(FOCUSABLE)) ||
      closeButton;
    first.focus();

    return {
      el: el,
      panel: panel,
      body: bodyEl,
      footer: footerEl,
      close: close,
      setTitle: function setTitle(key, args) {
        titleKey = key;
        titleArgs = args;
        title.textContent = t(titleKey, titleArgs);
      }
    };
  }

  function closeAllModals() {
    modals.slice().forEach(function (record) { record.close(); });
  }

  // ---------------------------------------------------------------------------------------------
  // Progress: saving and the storage warnings
  // ---------------------------------------------------------------------------------------------

  function setStatus(key, args) {
    if (els !== null && els.status !== null) els.status.textContent = key === null ? '' : t(key, args);
  }

  function noteStorage(status) {
    if (status === 'ok') {
      setStatus('player.status.saved');
      return;
    }
    if (status === 'invalid' || status === 'tooLarge') return;
    setStatus(status === 'quota' ? 'player.status.full' : 'player.status.notSaved');
    if (!storageWarned) {
      storageWarned = true;
      toast('warning', status === 'quota' ? 'player.storage.quota' : 'player.storage.blocked');
    }
  }

  function percentOf(g) {
    const p = g.progress();
    const open = g.cellCount - p.givens;
    return open <= 0 ? 100 : Math.max(0, Math.min(100, Math.round(100 * p.filled / open)));
  }

  /** Writes the progress of the game on the board (nothing for a puzzle nobody touched). */
  function saveNow() {
    root.clearTimeout(saveTimer);
    saveTimer = null;
    if (current === null || game === null) return false;
    if (game.status() === 'idle') {
      if (hasSavedProgress) {
        saved.removeProgress(current.id);
        hasSavedProgress = false;
        renderRecent();
      }
      return false;
    }
    const status = saved.saveProgress(current.id, {
      symbolMode: SG.play ? SG.play.getSymbolMode() : 'digits',
      percent: percentOf(game),
      solved: game.status() === 'solved',
      state: game.serialize()
    });
    if (status === 'ok') hasSavedProgress = true;
    noteStorage(status);
    return status === 'ok';
  }

  function scheduleSave() {
    root.clearTimeout(saveTimer);
    saveTimer = root.setTimeout(function () {
      saveTimer = null;
      safely(function () {
        saveNow();
        renderRecent();
      });
    }, SAVE_DELAY_MS);
  }

  function metaOf(puzzle) {
    const info = puzzle.info || {};
    const d = info.difficulty || null;
    return {
      variantId: puzzle.variantId,
      requested: d ? d.requested : null,
      achieved: d ? d.achieved : null,
      clues: info.clues,
      cellCount: info.cellCount,
      seed: info.seed === undefined ? null : info.seed,
      generatedAt: info.generatedAt || null,
      source: info.source || null
    };
  }

  // ---------------------------------------------------------------------------------------------
  // The page: heading, recent list
  // ---------------------------------------------------------------------------------------------

  function showLayout(hasPuzzle) {
    els.welcome.hidden = hasPuzzle;
    els.layout.hidden = !hasPuzzle;
  }

  function heading() {
    if (current === null) return '';
    const d = current.info && current.info.difficulty;
    const level = d ? levelName(d.achieved) : '';
    return level === '' ? variantName(current.variantId) :
      t('player.heading.level', { variant: variantName(current.variantId), level: level });
  }

  /** "<variant> - <level> (Seed: <seed>)"; the level and the seed are left out when the puzzle has none. */
  function summaryTitle() {
    if (current === null) return '';
    const d = current.info && current.info.difficulty;
    const level = d ? levelName(d.achieved) : '';
    const seed = current.info ? current.info.seed : null;
    let text = variantName(current.variantId);
    if (level !== '') text += ' - ' + level;
    if (seed !== undefined && seed !== null && String(seed) !== '') {
      text += ' (' + t('player.heading.seed', { seed: String(seed) }) + ')';
    }
    return text;
  }

  function summaryDescription() {
    if (current === null) return '';
    const key = 'variant.' + current.variantId + '.desc';
    return SG.i18n.has(key) ? t(key) : '';
  }

  function renderHeading() {
    if (els === null) return;
    els.heading.textContent = summaryTitle();
    if (els.subheading !== null) els.subheading.textContent = summaryDescription();
    document.title = current === null ? t('app.title') : t('player.title.puzzle', { name: heading() });
  }

  function recentDetails(item) {
    const meta = item.meta || {};
    const parts = [];
    const level = levelName(meta.achieved);
    if (level !== '') parts.push(level);
    if (typeof meta.clues === 'number') parts.push(t('player.recent.clues', { count: meta.clues }));
    parts.push(item.solved ? t('player.recent.solved') :
      item.hasProgress ? t('player.recent.progress', { percent: item.percent }) : t('player.recent.new'));
    return parts.join(' · ');
  }

  /** "<Level>: 30 clues, 45% filled" with the level in bold, as in the generator's list. */
  function recentMetaNodes(item) {
    const meta = item.meta || {};
    const rest = [];
    if (typeof meta.clues === 'number') rest.push(t('player.recent.clues', { count: meta.clues }));
    rest.push(item.solved ? t('player.recent.solved') :
      item.hasProgress ? t('player.recent.progress', { percent: item.percent }) : t('player.recent.new'));
    const level = levelName(meta.achieved);
    const nodes = [];
    if (level !== '') nodes.push(make('strong', { class: 'history-item__level', text: level }));
    nodes.push(document.createTextNode((level !== '' ? ': ' : '') + rest.join(', ')));
    return nodes;
  }

  // Same markup as the generator's list of puzzles (js/ui/history.js there), so both pages share one style.
  function recentItem(item) {
    const meta = item.meta || {};
    const name = variantName(meta.variantId || item.id.split('-')[0]);
    const details = recentDetails(item);
    const isCurrent = current !== null && current.id === item.id;
    const title = make('span', { class: 'history-item__title', text: name });
    const statusKey = item.solved ? 'solved' : item.hasProgress ? 'progress' : 'new';
    // Only a solved puzzle and one in progress get an icon; a new one has none.
    const status = statusKey === 'new' ? null : make('span', {
      class: 'history-item__status', 'data-status': statusKey, 'aria-hidden': 'true'
    }, [icon('status-' + statusKey)]);
    const open = make('button', {
      type: 'button', class: 'history-item__open', 'data-role': 'open', 'data-id': item.id,
      'aria-label': t('player.recent.open', { name: name, details: details })
    }, [
      title,
      make('span', { class: 'history-item__meta' }, recentMetaNodes(item))
    ]);
    if (isCurrent) open.setAttribute('aria-current', 'true');
    open.addEventListener('click', function () { safely(function () { openStored(item.id); }); });
    const removeLabel = t('player.recent.remove', { name: name });
    const remove = make('button', {
      type: 'button', class: 'btn btn--ghost btn--icon btn--sm history-item__remove', 'data-role': 'remove',
      'aria-label': removeLabel, title: removeLabel
    }, [icon('x')]);
    remove.addEventListener('click', function () {
      saved.forget(item.id);
      if (isCurrent) hasSavedProgress = false;
      renderRecent();
      announce(t('player.recent.removed'));
    });
    return make('li', { class: 'history-item', 'data-id': item.id, 'data-status': statusKey }, [open, status, remove]);
  }

  /** The items of the list, one `li` each (the left panel and the welcome screen both use them). */
  function fillRecent(list, items) {
    items.forEach(function (item) { list.appendChild(recentItem(item)); });
    return list;
  }

  function renderRecent() {
    if (els === null) return;
    const items = saved.recent(RECENT_SHOWN);
    if (els.recent !== null) {
      els.recent.textContent = '';
      fillRecent(els.recent, items);
      els.recent.hidden = items.length === 0;
      if (els.recentEmpty !== null) els.recentEmpty.hidden = items.length > 0;
      if (els.recentClear !== null) els.recentClear.disabled = items.length === 0;
    }
    if (els.welcomeRecent !== null) {
      els.welcomeRecent.textContent = '';
      if (items.length > 0) {
        els.welcomeRecent.appendChild(make('h3', {
          class: 'welcome__recent-title', text: t('shell.recent.title')
        }));
        els.welcomeRecent.appendChild(fillRecent(make('ul', { class: 'history-list', role: 'list' }), items));
      }
    }
  }

  function clearRecent() {
    saved.clear();
    hasSavedProgress = false;
    renderRecent();
    toast('info', 'player.recent.cleared');
  }

  // ---------------------------------------------------------------------------------------------
  // Putting a puzzle on the board
  // ---------------------------------------------------------------------------------------------

  function placePuzzle(puzzle, options) {
    const o = options || {};
    // Leaving a running game pauses it, so it comes back paused (Resume) and its clock does not run on.
    if (SG.play && SG.play.pauseGame) SG.play.pauseGame();
    saveNow();
    closeAllModals();
    if (SG.play) SG.play.detach();
    current = puzzle;
    game = null;
    hasSavedProgress = false;
    board.setModel(puzzle.model);
    // Put the grid semantics back now (the observer would do it a moment later): play focuses a cell below.
    if (SG.a11y && SG.a11y.getGrid()) SG.a11y.getGrid().apply();
    showLayout(true);
    if (SG.play) {
      SG.play.attach(puzzle, { state: o.state, symbolMode: o.symbolMode, focus: o.focus === true });
    }
    saved.savePuzzle(puzzle.id, puzzle.document, metaOf(puzzle));
    saved.setLast(puzzle.id);
    if (o.state) hasSavedProgress = true;
    renderHeading();
    renderRecent();
    setStatus(o.state ? 'player.status.restored' : null);
    announce(t(o.state ? 'player.opened.restored' : 'player.opened',
      { variant: variantName(puzzle.variantId) }));
    emit('result', { result: puzzle, trace: [] });
  }

  function askContinue(entry) {
    return new Promise(function (resolve) {
      let choice = null;
      const elapsed = entry.state && entry.state.timer ? Number(entry.state.timer.elapsed) || 0 : 0;
      const args = {
        percent: entry.percent, time: SG.i18n.formatDuration(elapsed), date: formatDate(entry.at)
      };
      const modal = openModal({
        titleKey: entry.solved ? 'player.continue.title.solved' : 'player.continue.title',
        body: function (body) {
          const key = entry.solved ? 'player.continue.solved' : 'player.continue.body';
          body.appendChild(make('p', { class: 'modal__lead', text: t(key, args) }));
          body.appendChild(make('p', { class: 'field__hint', i18n: 'player.continue.note' }));
        },
        footer: function (footer) {
          const keep = make('button', {
            type: 'button', class: 'btn btn--primary', 'data-role': 'continue',
            i18n: entry.solved ? 'player.continue.show' : 'player.continue.yes'
          });
          const fresh = make('button', {
            type: 'button', class: 'btn btn--secondary', 'data-role': 'fresh', i18n: 'player.continue.no'
          });
          const cancel = make('button', { type: 'button', class: 'btn btn--ghost', i18n: 'common.cancel' });
          keep.addEventListener('click', function () {
            choice = 'continue';
            modal.close();
          });
          fresh.addEventListener('click', function () {
            choice = 'fresh';
            modal.close();
          });
          cancel.addEventListener('click', function () { modal.close(); });
          footer.appendChild(cancel);
          footer.appendChild(fresh);
          footer.appendChild(keep);
        },
        onClose: function () { resolve(choice); }
      });
      if (modal === null) resolve('continue');
    });
  }

  function openPuzzle(puzzle, options) {
    const o = options || {};
    if (!puzzle || !puzzle.model || !puzzle.givens) return Promise.resolve(false);
    if (current !== null && current.id === puzzle.id && o.source !== 'restore') {
      toast('info', 'player.already');
      return Promise.resolve(true);
    }
    const entry = saved.loadProgress(puzzle.id);
    const apply = function (choice) {
      if (choice === null) return false;
      if (choice === 'fresh' && entry !== null) saved.removeProgress(puzzle.id);
      const keep = choice === 'continue' && entry !== null;
      placePuzzle(puzzle, {
        state: keep ? entry.state : null,
        symbolMode: keep ? entry.symbolMode : o.symbolMode,
        focus: o.focus !== false
      });
      return true;
    };
    if (entry === null) return Promise.resolve(apply('fresh'));
    if ((o.resume || 'ask') === 'ask') return askContinue(entry).then(apply);
    return Promise.resolve(apply(o.resume === 'fresh' ? 'fresh' : 'continue'));
  }

  function showResult(puzzle, options) {
    if (!puzzle || !puzzle.model || !puzzle.givens) return Promise.resolve(false);
    placePuzzle(puzzle, options);
    return Promise.resolve(true);
  }

  /** Opens a puzzle of the recent list: the stored document, its progress, no questions. */
  function openStored(id) {
    const entry = saved.loadPuzzle(id);
    if (entry === null) {
      saved.forget(id);
      renderRecent();
      return Promise.resolve(false);
    }
    const outcome = SG.importer.openDocument(entry.doc, { source: 'recent' });
    if (!outcome.ok) {
      saved.forget(id);
      renderRecent();
      showErrors(outcome.errors);
      return Promise.resolve(false);
    }
    return openPuzzle(outcome.puzzle, { resume: 'continue', source: 'recent', focus: true });
  }

  // ---------------------------------------------------------------------------------------------
  // Errors
  // ---------------------------------------------------------------------------------------------

  function issueTexts(issues) {
    return (issues || []).map(function (issue) {
      return issue.key.indexOf('player.') === 0 ? t(issue.key, issue.args) : SG.importer.issueText(issue);
    });
  }

  function showErrors(issues) {
    const texts = issueTexts(issues);
    if (texts.length === 0) texts.push(t('player.error.nothing'));
    if (openDialog !== null) {
      openDialog.showErrors(texts);
      return null;
    }
    closeAllModals();
    const modal = openModal({
      titleKey: 'player.error.title',
      body: function (body) {
        body.appendChild(make('p', { class: 'modal__lead', i18n: 'player.error.lead' }));
        const ul = make('ul', { class: 'error-list', role: 'list' });
        texts.slice(0, 6).forEach(function (text) { ul.appendChild(make('li', { text: text })); });
        body.appendChild(ul);
      },
      footer: function (footer) {
        const again = make('button', {
          type: 'button', class: 'btn btn--primary', i18n: 'player.error.again'
        });
        again.addEventListener('click', function () {
          modal.close();
          openOpenDialog();
        });
        const close = make('button', { type: 'button', class: 'btn btn--secondary', i18n: 'common.close' });
        close.addEventListener('click', function () { modal.close(); });
        footer.appendChild(close);
        footer.appendChild(again);
      }
    });
    announce(texts[0]);
    return modal;
  }

  // ---------------------------------------------------------------------------------------------
  // Opening from text and files
  // ---------------------------------------------------------------------------------------------

  function failure(issue) {
    return Object.assign(new Error(issue.key), { issue: issue });
  }

  function readFile(file) {
    if (file.size > MAX_FILE_BYTES) {
      return Promise.reject(failure({ key: 'player.error.fileTooLarge', args: {} }));
    }
    const unreadable = function () { return failure({ key: 'import.error.readFailed', args: {} }); };
    if (typeof file.text === 'function') return file.text().catch(function () { throw unreadable(); });
    return new Promise(function (resolve, reject) {
      const reader = new root.FileReader();
      reader.onload = function () { resolve(String(reader.result)); };
      reader.onerror = function () { reject(unreadable()); };
      reader.readAsText(file);
    });
  }

  /** The first error of a skipped puzzle, with its place in the text ("#3 Killer Sudoku: ..."). */
  function skippedText(item) {
    const first = issueTexts(item.outcome.errors)[0] || t('player.error.nothing');
    return item.label === '' ? first : item.label + ': ' + first;
  }

  function showSkipped(imported, skipped) {
    const shown = skipped.slice(0, REPORT_SHOWN);
    const modal = openModal({
      titleKey: 'player.import.report.title',
      body: function (body) {
        body.appendChild(make('p', {
          class: 'modal__lead',
          text: t('player.import.report.lead', { imported: imported, skipped: skipped.length })
        }));
        const ul = make('ul', { class: 'error-list', role: 'list' });
        shown.forEach(function (item) { ul.appendChild(make('li', { text: skippedText(item) })); });
        if (skipped.length > shown.length) {
          ul.appendChild(make('li', {
            text: t('player.import.report.more', { count: skipped.length - shown.length })
          }));
        }
        body.appendChild(ul);
      },
      footer: function (footer) {
        const close = make('button', { type: 'button', class: 'btn btn--primary', i18n: 'common.close' });
        close.addEventListener('click', function () { modal.close(); });
        footer.appendChild(close);
      }
    });
    return modal;
  }

  /**
   * Several puzzles came in (the text of the generator's Export box, or a bundle of the Play button): every
   * good one goes into the list of puzzles, the one on screen in the generator (`o.active`, the number of the
   * puzzle in the text) or else the first one is put on the board, and the ones that cannot be played are
   * listed.
   * @returns {Promise<boolean>} Whether a puzzle is on the board.
   */
  function importBatch(items, source, o) {
    const good = items.filter(function (item) { return item.outcome.ok; });
    const skipped = items.filter(function (item) { return !item.outcome.ok; });
    if (good.length === 0) {
      const lines = skipped.slice(0, REPORT_SHOWN).map(function (item) {
        return { key: 'player.import.line', args: { text: skippedText(item) } };
      });
      showErrors(lines);
      return Promise.resolve(false);
    }
    // Saved last to first, so that the first puzzle of the text is the newest one of the list.
    good.slice().reverse().forEach(function (item) {
      const puzzle = item.outcome.puzzle;
      saved.savePuzzle(puzzle.id, puzzle.document, metaOf(puzzle));
    });
    const warned = good.filter(function (item) { return item.outcome.warnings.length > 0; }).length;
    // The puzzle that was on screen in the generator (its number in the text), else the first one.
    const wanted = good.filter(function (item) { return item.index === o.active; });
    const first = wanted.length > 0 ? wanted[0] : good[0];
    return openPuzzle(first.outcome.puzzle, { resume: 'continue', source: source, focus: o.focus !== false })
      .then(function (shown) {
        renderRecent();
        toast('success', 'player.import.done', { count: good.length });
        if (warned > 0) toast('warning', 'player.import.warned', { count: warned });
        if (skipped.length > 0) showSkipped(good.length, skipped);
        return shown;
      });
  }

  function open(input, options) {
    const o = options || {};
    const seq = ++openSeq;
    const isFile = input !== null && typeof input === 'object' && typeof input.size === 'number';
    const source = o.source || (isFile ? 'file' : 'paste');
    const textPromise = isFile ? readFile(input) : Promise.resolve(input);
    return textPromise.then(function (text) {
      return SG.importer.openMany(text, { source: source });
    }).then(function (result) {
      if (seq !== openSeq) return false;
      const active = typeof o.active === 'number' ? o.active : result.active;
      if (result.items.length !== 1) return importBatch(result.items, source, Object.assign({}, o, { active: active }));
      const outcome = result.items[0].outcome;
      if (!outcome.ok) {
        showErrors(outcome.errors);
        return false;
      }
      const options = { resume: o.resume || 'ask', source: source, focus: o.focus !== false };
      return openPuzzle(outcome.puzzle, options)
        .then(function (shown) {
          if (shown) issueTexts(outcome.warnings).forEach(function (text) { toastText('warning', text); });
          return shown;
        });
    }).catch(function (err) {
      if (seq !== openSeq) return false;
      if (err && err.issue) {
        showErrors([err.issue]);
      } else {
        logError(err);
        showErrors([{ key: 'import.error.readFailed', args: {} }]);
      }
      return false;
    });
  }

  // ---------------------------------------------------------------------------------------------
  // The Share dialog: the link that opens this puzzle in the player (the generator's "Play" link)
  // ---------------------------------------------------------------------------------------------

  /** The player's address from `<meta name="sg-player-url">` (http(s) only), else the default. */
  function playerBase() {
    const meta = typeof document !== 'undefined' ?
      document.querySelector('meta[name="sg-player-url"]') : null;
    const value = meta ? meta.getAttribute('content') : null;
    return typeof value === 'string' && value.trim() !== '' && SG.exchange.isAllowedBase(value) ?
      value.trim() : DEFAULT_PLAYER_URL;
  }

  /** The link of the puzzle on the board: the puzzle document in the fragment, as `buildPlayLink` of the generator. */
  function buildShareLink() {
    return Promise.resolve().then(function () {
      if (current === null) throw failure({ key: 'player.error.nothing', args: {} });
      return SG.exchange.encode(current.document);
    }).then(function (token) {
      const url = SG.exchange.playerUrl(playerBase(), token);
      return { url: url, long: url.length > LONG_LINK_CHARS };
    });
  }

  /** Copies text to the clipboard; the promise tells whether it worked. `field` is selected as a fallback. */
  function copyText(text, field) {
    if (root.navigator && root.navigator.clipboard && typeof root.navigator.clipboard.writeText === 'function') {
      return root.navigator.clipboard.writeText(text).then(function () { return true; }, function () {
        return copyFromField(field);
      });
    }
    return Promise.resolve(copyFromField(field));
  }

  function copyFromField(field) {
    if (!field || typeof document.execCommand !== 'function') return false;
    try {
      field.focus();
      field.select();
      return document.execCommand('copy') === true;
    } catch (err) {
      return false;
    }
  }

  function openShareDialog() {
    if (current === null) return null;
    if (shareDialog !== null) return shareDialog;
    const refs = { box: null, copy: null, hint: null };
    const modal = openModal({
      titleKey: 'player.share.title',
      wide: true,
      body: function (body) {
        body.appendChild(make('p', { class: 'modal__lead', i18n: 'player.share.lead' }));
        refs.box = make('textarea', {
          class: 'textarea share-link', id: 'share-link', rows: '5', readonly: true, spellcheck: 'false',
          autocomplete: 'off', autocapitalize: 'off', 'aria-label': t('player.share.label')
        });
        refs.box.addEventListener('focus', function () { refs.box.select(); });
        refs.hint = make('p', { class: 'field__hint', id: 'share-hint', hidden: true });
        body.appendChild(make('div', { class: 'field' }, [refs.box, refs.hint]));
      },
      footer: function (footer) {
        refs.copy = make('button', {
          type: 'button', class: 'btn btn--primary', id: 'share-copy', disabled: true
        }, [icon('copy'), make('span', { class: 'btn__label', i18n: 'player.share.copy' })]);
        refs.copy.addEventListener('click', function () {
          copyText(refs.box.value, refs.box).then(function (ok) {
            toast(ok ? 'success' : 'danger', ok ? 'player.share.copied' : 'player.share.copyFailed');
          });
        });
        const close = make('button', { type: 'button', class: 'btn btn--secondary', i18n: 'common.close' });
        close.addEventListener('click', function () { modal.close(); });
        footer.appendChild(close);
        footer.appendChild(refs.copy);
      },
      onClose: function () { shareDialog = null; }
    });
    if (modal === null) return null;
    shareDialog = modal;
    buildShareLink().then(function (info) {
      if (shareDialog !== modal) return;
      refs.box.value = info.url;
      refs.copy.disabled = false;
      if (info.long) {
        refs.hint.textContent = t('player.share.long', { size: SG.i18n.formatNumber(Math.round(info.url.length / 1000)) });
        refs.hint.hidden = false;
      }
      refs.box.focus();
    }, function (err) {
      const code = err && typeof err.code === 'string' ? 'error.' + err.code : '';
      refs.box.value = '';
      refs.hint.textContent = t('player.share.error', {
        message: code !== '' && SG.i18n.has(code) ? t(code) : (err && err.message ? err.message : '')
      });
      refs.hint.hidden = false;
    });
    return modal;
  }

  // ---------------------------------------------------------------------------------------------
  // The Open dialog
  // ---------------------------------------------------------------------------------------------

  /**
   * An element whose text has `{generator}` in it (player.open.intro ...): the placeholder becomes a link to
   * Sudoku Generator (`generatorUrl()`, a new tab). It is drawn again on a language change.
   */
  const generatorTexts = [];

  function renderGeneratorText(entry) {
    const text = t(entry.key);
    const at = text.indexOf('{generator}');
    entry.node.textContent = '';
    if (at === -1) {
      entry.node.textContent = text;
      return;
    }
    entry.node.appendChild(document.createTextNode(text.slice(0, at)));
    entry.node.appendChild(make('a', {
      href: generatorUrl(), target: '_blank', rel: 'noopener', class: 'generator-link',
      text: t('player.generator.name')
    }));
    entry.node.appendChild(document.createTextNode(text.slice(at + '{generator}'.length)));
  }

  function generatorText(tag, attrs, key) {
    const entry = { node: make(tag, attrs), key: key };
    generatorTexts.push(entry);
    renderGeneratorText(entry);
    return entry.node;
  }

  function refreshGeneratorTexts() {
    for (let i = generatorTexts.length - 1; i >= 0; i--) {
      const entry = generatorTexts[i];
      if (entry.node.isConnected) {
        entry.seen = true;
        renderGeneratorText(entry);
      } else if (entry.seen === true) {
        generatorTexts.splice(i, 1);
      }
    }
  }

  function openOpenDialog() {
    if (openDialog !== null) return openDialog.modal;
    const refs = { errors: null, text: null };
    let modal = null;
    function showDialogErrors(texts) {
      refs.errors.textContent = '';
      texts.slice(0, 4).forEach(function (text) {
        refs.errors.appendChild(make('p', { class: 'field__error', text: text }));
      });
      refs.errors.hidden = false;
      refs.text.setAttribute('aria-invalid', 'true');
      announce(texts[0]);
    }
    function submit(input, source) {
      refs.errors.hidden = true;
      refs.text.removeAttribute('aria-invalid');
      open(input, { source: source }).then(function (shown) {
        if (shown && modal !== null) modal.close();
      });
    }
    modal = openModal({
      titleKey: 'player.open.title',
      wide: true,
      body: function (body) {
        body.appendChild(generatorText('p', { class: 'modal__lead' }, 'player.open.intro'));
        refs.text = make('textarea', {
          class: 'textarea open-text', id: 'open-text', rows: '5', spellcheck: 'false', autocomplete: 'off',
          autocapitalize: 'off', 'aria-describedby': 'open-text-hint open-errors'
        });
        refs.text.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            submit(refs.text.value, 'paste');
          }
        });
        const label = make('label', {
          class: 'field__label', for: 'open-text', i18n: 'player.open.paste.label'
        });
        const hint = generatorText('p', { class: 'field__hint', id: 'open-text-hint' }, 'player.open.paste.hint');
        refs.errors = make('div', { class: 'open-errors', id: 'open-errors', role: 'alert', hidden: true });
        body.appendChild(make('div', { class: 'field' }, [label, refs.text, hint, refs.errors]));
      },
      footer: function (footer) {
        const go = make('button', {
          type: 'button', class: 'btn btn--primary', id: 'open-submit', i18n: 'player.open.submit'
        });
        go.addEventListener('click', function () { submit(refs.text.value, 'paste'); });
        const cancel = make('button', { type: 'button', class: 'btn btn--secondary', i18n: 'common.cancel' });
        cancel.addEventListener('click', function () { modal.close(); });
        footer.appendChild(cancel);
        footer.appendChild(go);
      },
      onClose: function () { openDialog = null; }
    });
    if (modal === null) return null;
    openDialog = { modal: modal, showErrors: showDialogErrors };
    // The first focusable thing is now the link to the generator in the lead: the text box is what is wanted.
    if (refs.text !== null) refs.text.focus();
    return modal;
  }

  // ---------------------------------------------------------------------------------------------
  // Page-wide drop and paste
  // ---------------------------------------------------------------------------------------------

  /** Whether text dropped on the page is worth importing: the generator's export text, or a puzzle line / link. */
  function looksImportable(text) {
    return SG.importer.exportBlocks(text) !== null || SG.importer.detect(text).kind !== 'unknown';
  }

  function hasFiles(event) {
    const types = event.dataTransfer && event.dataTransfer.types;
    return !!types && Array.prototype.indexOf.call(types, 'Files') !== -1;
  }

  function showDropOverlay(visible) {
    if (els.drop !== null) els.drop.hidden = !visible;
  }

  function listen(target, type, fn) {
    target.addEventListener(type, fn);
    cleanup.push(function () { target.removeEventListener(type, fn); });
  }

  function wireDropAndPaste() {
    listen(document, 'dragenter', function (event) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth++;
      showDropOverlay(true);
    });
    listen(document, 'dragover', function (event) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    });
    listen(document, 'dragleave', function (event) {
      if (!hasFiles(event)) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) showDropOverlay(false);
    });
    listen(document, 'drop', function (event) {
      dragDepth = 0;
      showDropOverlay(false);
      const data = event.dataTransfer;
      if (!data) return;
      if (hasFiles(event) && data.files && data.files.length > 0) {
        event.preventDefault();
        open(data.files[0], { source: 'drop' });
        return;
      }
      // Dropped text opens only when it looks like a puzzle (selected page text dragged around does not).
      const text = typeof data.getData === 'function' ? data.getData('text/plain') : '';
      if (text && !isTextField(event.target) && looksImportable(text)) {
        event.preventDefault();
        open(text, { source: 'drop' });
      }
    });
    // A paste outside a text field opens the pasted puzzle (the Open dialog has its own text box).
    listen(document, 'paste', function (event) {
      if (isTextField(event.target) || modals.length > 0) return;
      const data = event.clipboardData;
      const text = data && typeof data.getData === 'function' ? data.getData('text') : '';
      if (!text || text.trim() === '') return;
      event.preventDefault();
      open(text, { source: 'paste' });
    });
  }

  // ---------------------------------------------------------------------------------------------
  // The address: #puzzle=<token>
  // ---------------------------------------------------------------------------------------------

  function removeFragment() {
    try {
      if (root.history && typeof root.history.replaceState === 'function') {
        root.history.replaceState(null, '', root.location.pathname + root.location.search);
      }
    } catch (err) {
      logError(err);
    }
  }

  function fragmentToken() {
    const hash = root.location ? root.location.hash : '';
    return hash && SG.exchange ? SG.exchange.tokenFromHash(hash) : null;
  }

  function fragmentActive() {
    const hash = root.location ? root.location.hash : '';
    return hash && SG.exchange ? SG.exchange.activeFromHash(hash) : null;
  }

  function openFragment() {
    const token = fragmentToken();
    if (token === null) return Promise.resolve(false);
    const active = fragmentActive();
    removeFragment();
    return open(token, { source: 'link', focus: false, active: active === null ? undefined : active });
  }

  // ---------------------------------------------------------------------------------------------
  // Preferences -> page
  // ---------------------------------------------------------------------------------------------

  function syncLangButtons(lang) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-lang]'), function (button) {
      button.setAttribute('aria-pressed', button.getAttribute('data-lang') === lang ? 'true' : 'false');
    });
  }

  function onStoreChange(state, keys, meta) {
    if (keys.indexOf('lang') !== -1) SG.i18n.setLocale(state.lang);
    if (board !== null) {
      if (keys.indexOf('showCoords') !== -1) board.setShowCoords(state.showCoords);
      if (keys.indexOf('reducedMotion') !== -1) board.setAnimate(!state.reducedMotion);
    }
    emit('settings', { state: state, keys: keys, source: meta && meta.source ? meta.source : 'store' });
    if (keys.indexOf('theme') !== -1) emit('theme', { theme: state.theme });
  }

  function onLocaleChange(code) {
    syncLangButtons(code);
    renderHeading();
    renderRecent();
    refreshGeneratorTexts();
    if (board !== null) board.refreshText();
    emit('locale', { locale: code });
  }

  // ---------------------------------------------------------------------------------------------
  // Start-up
  // ---------------------------------------------------------------------------------------------

  function lookup() {
    return {
      welcome: byId('welcome'),
      welcomeRecent: byId('welcome-recent'),
      layout: byId('player-layout'),
      heading: byId('board-heading'),
      subheading: byId('board-subheading'),
      svg: byId('board-svg'),
      recent: byId('recent-root'),
      recentEmpty: byId('recent-empty'),
      recentClear: byId('recent-clear'),
      status: byId('status-line'),
      drop: byId('drop-overlay'),
      generatorLink: byId('link-generator')
    };
  }

  function wireButtons() {
    if (els.recentClear !== null) {
      listen(els.recentClear, 'click', function () { safely(clearRecent); });
    }
    [['btn-open', 'open'], ['btn-welcome-open', 'open'], ['btn-share', 'share'], ['btn-settings', 'settings'],
      ['btn-help', 'help']]
      .forEach(function (pair) {
        const node = byId(pair[0]);
        if (node === null) return;
        listen(node, 'click', function () { emit('action', { id: pair[1] }); });
      });
    Array.prototype.forEach.call(document.querySelectorAll('[data-lang]'), function (button) {
      listen(button, 'click', function () {
        store.set({ lang: button.getAttribute('data-lang') }, { source: 'header' });
      });
    });
    cleanup.push(on('action', function (payload) {
      if (payload && payload.id === 'open') openOpenDialog();
      if (payload && payload.id === 'share') openShareDialog();
    }));
  }

  function wireLifecycle() {
    listen(document, 'visibilitychange', function () {
      if (document.visibilityState === 'hidden') safely(saveNow);
    });
    listen(root, 'pagehide', function () { safely(saveNow); });
    listen(root, 'hashchange', function () { safely(openFragment); });
  }

  /** The puzzle of the last visit, with its progress. */
  function restoreLast() {
    const id = saved.getLast();
    if (id === null) return false;
    const entry = saved.loadPuzzle(id);
    if (entry === null) return false;
    const outcome = SG.importer.openDocument(entry.doc, { source: 'restore' });
    if (!outcome.ok) {
      saved.forget(id);
      return false;
    }
    const progress = saved.loadProgress(id);
    placePuzzle(outcome.puzzle, {
      state: progress === null ? null : progress.state,
      symbolMode: progress === null ? undefined : progress.symbolMode,
      focus: false
    });
    return true;
  }

  function start() {
    if (started) return true;
    if (typeof document === 'undefined' || byId('board-svg') === null) return false;
    started = true;
    els = lookup();
    store = SG.store.instance();
    saved = SG.progress.instance();
    const state = store.load({
      search: root.location ? root.location.search : '', navigator: root.navigator
    });
    SG.i18n.setLocale(state.lang);
    syncLangButtons(SG.i18n.current);
    if (els.generatorLink !== null) els.generatorLink.setAttribute('href', generatorUrl());
    cleanup.push(SG.i18n.onChange(onLocaleChange));
    cleanup.push(store.subscribe(onStoreChange));

    // The board exists from the start (a placeholder 9x9 under the welcome screen) so that the grid
    // semantics are attached once; the first puzzle replaces its model.
    board = SG.boardView.create(els.svg, SG.classicModel.build(9), {
      symbolMode: 'digits', showCoords: state.showCoords, colorAuxSymbol: state.colorAuxSymbol,
      animate: !state.reducedMotion
    });

    cleanup.push(on('play:change', function () { scheduleSave(); }));
    cleanup.push(on('play:game', function (payload) { game = payload.game; }));
    ['theme', 'a11y', 'play', 'help'].forEach(function (name) {
      if (SG[name] && typeof SG[name].init === 'function') safely(function () { SG[name].init(api); });
    });
    wireButtons();
    wireDropAndPaste();
    wireLifecycle();
    showLayout(false);
    renderRecent();

    if (fragmentToken() !== null) safely(openFragment);
    else safely(restoreLast);
    return true;
  }

  function clearSavedData() {
    saved.clear();
    hasSavedProgress = false;
    storageWarned = false;
    renderRecent();
    setStatus(null);
    emit('data:cleared', {});
    toast('success', 'player.clear.done');
  }

  const api = {
    start: start,
    getStore: function getStore() { return store; },
    getBoard: function getBoard() { return board; },
    getResult: function getResult() { return current === null ? null : { result: current, trace: [] }; },
    getPuzzle: function getPuzzle() { return current; },
    toast: toast,
    openModal: openModal,
    announce: announce,
    on: on,
    emit: emit,
    showResult: showResult,
    open: open,
    openPuzzle: openPuzzle,
    openOpenDialog: openOpenDialog,
    openShareDialog: openShareDialog,
    clearSavedData: clearSavedData,
    saveNow: saveNow
  };

  SG.app = api;

  // ---------------------------------------------------------------------------------------------
  // Strings
  // ---------------------------------------------------------------------------------------------

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'player.heading.level': '{variant} · {level}',
      'player.heading.seed': 'Seed: {seed}',
      'player.title.puzzle': '{name} – Sudoku Player',
      'player.opened': 'Puzzle opened: {variant}.',
      'player.opened.restored': 'Welcome back. Your progress on {variant} was restored.',
      'player.already': 'This puzzle is already on the board.',
      'player.status.saved': 'Progress is saved on this device.',
      'player.status.restored': 'Your saved progress was restored.',
      'player.status.notSaved': 'Progress is not saved: this browser blocks storage. Keep this tab open.',
      'player.status.full': 'Progress could not be saved: the browser storage is full.',
      'player.storage.blocked': 'This browser blocks local storage, so your progress is lost when you ' +
        'close this tab.',
      'player.storage.quota': 'The browser storage is full, so some progress could not be saved. Delete ' +
        'saved puzzles in Help to make room.',
      'player.open.title': 'Import puzzles',
      'player.open.intro': 'Paste the puzzles you exported from {generator}.',
      'player.generator.name': 'Sudoku Generator',
      'player.open.paste.label': 'Paste puzzles',
      'player.open.paste.hint': 'The text of the “Export” box of {generator}, with one or many puzzles ' +
        'of any variant. A “Play online” link or a line of 81 (9×9), 36 (6×6) or 16 (4×4) characters where ' +
        '. 0 - _ mean an empty cell also works. Ctrl+Enter imports it.',
      'player.open.submit': 'Import',
      'player.error.title': 'Nothing could be imported',
      'player.error.lead': 'Nothing was changed on the board. What went wrong:',
      'player.error.again': 'Import again',
      'player.error.nothing': 'There is nothing to import.',
      'player.error.fileTooLarge': 'This file is too large to be a puzzle (over 8 MB).',
      'player.import.done_one': '1 puzzle imported.',
      'player.import.done_other': '{count} puzzles imported.',
      'player.import.warned_one': '1 puzzle has more than one solution or could not be fully checked.',
      'player.import.warned_other': '{count} puzzles have more than one solution or could not be fully ' +
        'checked.',
      'player.import.report.title': 'Some puzzles were not imported',
      'player.import.report.lead': '{imported} imported, {skipped} skipped. What went wrong:',
      'player.import.report.more': 'And {count} more.',
      'player.import.line': '{text}',
      'player.continue.title': 'Continue this puzzle?',
      'player.continue.title.solved': 'You already solved this puzzle',
      'player.continue.body': 'You played this puzzle before: {percent}% filled, {time} played, last on ' +
        '{date}.',
      'player.continue.solved': 'You solved this puzzle in {time} (on {date}).',
      'player.continue.note': 'Starting over deletes the saved progress of this puzzle.',
      'player.continue.yes': 'Continue',
      'player.continue.show': 'Show it',
      'player.continue.no': 'Start over',
      'player.recent.empty': 'No recent puzzles yet. Puzzles you open are listed here.',
      'player.share.title': 'Share this puzzle',
      'player.share.lead': 'Send this link to anyone: it opens this puzzle in Sudoku Player, without your ' +
        'progress. The puzzle travels inside the link; nothing is uploaded.',
      'player.share.label': 'Link to this puzzle',
      'player.share.copy': 'Copy link',
      'player.share.copied': 'Link copied to the clipboard.',
      'player.share.copyFailed': 'Could not copy the link. Select it and copy it by hand.',
      'player.share.long': 'This link is long (about {size} kB), and some apps and servers cut long links.',
      'player.share.error': 'The link could not be made: {message}',
      'player.recent.open': 'Open {name}: {details}',
      'player.recent.remove': 'Remove {name} from the list',
      'player.recent.removed': 'Removed from the list.',
      'player.recent.clear': 'Remove all',
      'player.recent.clear.title': 'Remove every puzzle and its saved progress from the list',
      'player.recent.cleared': 'The list of puzzles was cleared.',
      'player.recent.clues_one': '{count} clue',
      'player.recent.clues_other': '{count} clues',
      'player.recent.progress': '{percent}% filled',
      'player.recent.solved': 'Solved',
      'player.recent.new': 'Not started',
      'player.clear.done': 'Saved puzzles and progress were deleted from this browser.'
    },
    vi: {
      'player.heading.level': '{variant} · {level}',
      'player.heading.seed': 'Seed: {seed}',
      'player.title.puzzle': '{name} – Trình chơi Sudoku',
      'player.opened': 'Đã mở đề: {variant}.',
      'player.opened.restored': 'Chào mừng bạn quay lại. Tiến độ của {variant} đã được khôi phục.',
      'player.already': 'Đề này đang có trên bàn cờ.',
      'player.status.saved': 'Tiến độ được lưu trên thiết bị này.',
      'player.status.restored': 'Đã khôi phục tiến độ đã lưu của bạn.',
      'player.status.notSaved': 'Tiến độ không được lưu: trình duyệt này chặn việc lưu trữ. Hãy giữ nguyên ' +
        'tab này.',
      'player.status.full': 'Không lưu được tiến độ: bộ nhớ của trình duyệt đã đầy.',
      'player.storage.blocked': 'Trình duyệt này chặn lưu trữ cục bộ, nên tiến độ sẽ mất khi bạn đóng tab.',
      'player.storage.quota': 'Bộ nhớ của trình duyệt đã đầy nên một số tiến độ không được lưu. Hãy xóa ' +
        'các đề đã lưu trong phần Trợ giúp để lấy chỗ.',
      'player.open.title': 'Nhập đề',
      'player.open.intro': 'Dán các đề bạn đã xuất từ {generator}.',
      'player.generator.name': 'Trình sinh đề Sudoku',
      'player.open.paste.label': 'Dán đề',
      'player.open.paste.hint': 'Nội dung ô “Xuất” của {generator}, một hay nhiều đề thuộc mọi ' +
        'biến thể. Liên kết “Chơi trực tuyến” hoặc một dòng 81 (9×9), 36 ' +
        '(6×6), 16 (4×4) ký tự, trong đó . 0 - _ là ô trống, cũng dùng được. Nhấn Ctrl+Enter để nhập.',
      'player.open.submit': 'Nhập',
      'player.error.title': 'Không nhập được đề nào',
      'player.error.lead': 'Bàn cờ không bị thay đổi. Đã xảy ra lỗi:',
      'player.error.again': 'Nhập lại',
      'player.error.nothing': 'Không có gì để nhập.',
      'player.error.fileTooLarge': 'Tệp này quá lớn để là một đề (hơn 8 MB).',
      'player.import.done_one': 'Đã nhập 1 đề.',
      'player.import.done_other': 'Đã nhập {count} đề.',
      'player.import.warned_one': '1 đề có nhiều hơn một lời giải hoặc chưa kiểm tra xong.',
      'player.import.warned_other': '{count} đề có nhiều hơn một lời giải hoặc chưa kiểm tra xong.',
      'player.import.report.title': 'Một số đề chưa được nhập',
      'player.import.report.lead': 'Đã nhập {imported}, bỏ qua {skipped}. Đã xảy ra lỗi:',
      'player.import.report.more': 'Và {count} đề nữa.',
      'player.import.line': '{text}',
      'player.continue.title': 'Tiếp tục đề này?',
      'player.continue.title.solved': 'Bạn đã giải đề này rồi',
      'player.continue.body': 'Bạn đã chơi đề này: đã điền {percent}%, chơi {time}, lần cuối vào {date}.',
      'player.continue.solved': 'Bạn đã giải đề này trong {time} (vào {date}).',
      'player.continue.note': 'Chơi lại từ đầu sẽ xóa tiến độ đã lưu của đề này.',
      'player.continue.yes': 'Tiếp tục',
      'player.continue.show': 'Xem lại',
      'player.continue.no': 'Chơi lại từ đầu',
      'player.recent.empty': 'Chưa có đề nào gần đây. Các đề bạn mở sẽ được liệt kê ở đây.',
      'player.share.title': 'Chia sẻ đề này',
      'player.share.lead': 'Gửi liên kết này cho bất kỳ ai: nó mở đề này trong Trình chơi Sudoku, không kèm ' +
        'tiến độ của bạn. Đề nằm ngay trong liên kết; không có gì được tải lên.',
      'player.share.label': 'Liên kết tới đề này',
      'player.share.copy': 'Sao chép liên kết',
      'player.share.copied': 'Đã sao chép liên kết vào bộ nhớ tạm.',
      'player.share.copyFailed': 'Không sao chép được liên kết. Hãy chọn và sao chép thủ công.',
      'player.share.long': 'Liên kết này dài (khoảng {size} kB), và một số ứng dụng, máy chủ sẽ cắt bớt liên ' +
        'kết dài.',
      'player.share.error': 'Không tạo được liên kết: {message}',
      'player.recent.open': 'Mở {name}: {details}',
      'player.recent.remove': 'Xóa {name} khỏi danh sách',
      'player.recent.removed': 'Đã xóa khỏi danh sách.',
      'player.recent.clear': 'Xóa hết',
      'player.recent.clear.title': 'Xóa mọi đề cùng tiến độ đã lưu khỏi danh sách',
      'player.recent.cleared': 'Đã xóa danh sách các đề.',
      'player.recent.clues_one': '{count} số cho sẵn',
      'player.recent.clues_other': '{count} số cho sẵn',
      'player.recent.progress': 'đã điền {percent}%',
      'player.recent.solved': 'Đã giải',
      'player.recent.new': 'Chưa chơi',
      'player.clear.done': 'Đã xóa các đề và tiến độ đã lưu khỏi trình duyệt này.'
    }
  });

  // The scripts sit at the end of index.html, so the page is parsed: start at once (a page without the
  // board, such as tests.html, makes `start` return false).
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }
})(typeof self !== 'undefined' ? self : globalThis);
