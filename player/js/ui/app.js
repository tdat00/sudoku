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
 *   openOpenDialog()                the Open puzzle dialog.
 *   clearSavedData()                forgets the saved puzzles and progress (not the preferences).
 *   saveNow()                       writes the progress of the game on the board at once.
 *
 * Events (`on(name, fn)`; `fn(payload, name)`):
 *   'result'     a puzzle is on the board: `{ result: puzzle, trace: [] }`
 *   'settings'   a preference changed: `{ state, keys, source }`
 *   'locale'     the language changed: `{ locale }`
 *   'theme'      the theme preference changed: `{ theme }`
 *   'action'     a header button was used: `{ id: 'open' | 'settings' | 'help' }`
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
  const RECENT_SHOWN = 10;
  const MOBILE_QUERY = '(max-width: 767.98px)';
  const DEFAULT_GENERATOR_URL = 'https://tdat00.github.io/sudoku-generator/';
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
    'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const SOURCES = Object.freeze(['link', 'file', 'drop', 'paste', 'recent', 'restore', 'text']);

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
  // The page: heading, info card, recent list
  // ---------------------------------------------------------------------------------------------

  function showLayout(hasPuzzle) {
    els.welcome.hidden = hasPuzzle;
    els.layout.hidden = !hasPuzzle;
  }

  function infoRow(labelKey, value) {
    return [
      make('dt', { class: 'info-list__term', text: t(labelKey) }),
      make('dd', { class: 'info-list__value', text: value })
    ];
  }

  function progressBar(percent) {
    const bar = make('span', { class: 'progress__bar' });
    bar.style.width = percent + '%';
    return make('span', {
      class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100',
      'aria-valuenow': String(percent), 'aria-label': t('player.info.progress')
    }, [bar]);
  }

  function sourceName(source) {
    return SOURCES.indexOf(source) !== -1 ? t('player.source.' + source) : t('player.source.file');
  }

  function difficultyText(d) {
    const achieved = levelName(d.achieved) || String(d.achieved);
    const asked = levelName(d.requested);
    let text = achieved;
    if (asked !== '' && asked !== achieved) {
      text = t('player.info.difficulty.asked', { achieved: achieved, requested: asked });
    }
    if (typeof d.score === 'number') {
      text += ' · ' + t('player.info.score', { score: SG.i18n.formatNumber(Math.round(d.score)) });
    }
    return text;
  }

  function renderInfo() {
    if (els === null || els.info === null) return;
    els.info.textContent = '';
    if (current === null) return;
    const info = current.info || {};
    const d = info.difficulty || null;
    const list = make('dl', { class: 'info-list' });
    const add = function (pair) { pair.forEach(function (node) { list.appendChild(node); }); };
    add(infoRow('player.info.variant', variantName(current.variantId)));
    if (d !== null) {
      add(infoRow('player.info.difficulty', difficultyText(d)));
      if (d.hardestTechnique && SG.i18n.has('technique.' + d.hardestTechnique)) {
        add(infoRow('player.info.hardest', t('technique.' + d.hardestTechnique)));
      }
    }
    const clues = t('player.info.clues.value', { clues: info.clues, cells: info.cellCount });
    add(infoRow('player.info.clues', clues));
    if (info.seed !== undefined && info.seed !== null) add(infoRow('player.info.seed', String(info.seed)));
    if (info.generatedAt) {
      const when = formatDate(info.generatedAt);
      if (when !== '') add(infoRow('player.info.generated', when));
    }
    add(infoRow('player.info.source', sourceName(info.source)));
    els.info.appendChild(list);

    const percent = game !== null ? percentOf(game) : 0;
    const done = game !== null && game.status() === 'solved';
    const bar = make('div', { class: 'info-progress', 'data-role': 'info-progress' }, [
      make('span', {
        class: 'info-progress__label',
        text: done ? t('player.info.solved') : t('player.info.progress.value', { percent: percent })
      }),
      progressBar(done ? 100 : percent)
    ]);
    els.info.appendChild(bar);

    const notes = [];
    if (current.uniqueness === 'multiple') notes.push('player.info.notes.multiple');
    if (current.uniqueness === 'unknown') notes.push('player.info.notes.unverified');
    if (current.solutionSource === 'computed') notes.push('player.info.notes.computed');
    if (info.wordoku) notes.push('player.info.wordoku');
    if (d === null) notes.push('player.info.notes.noDifficulty');
    notes.forEach(function (key) { els.info.appendChild(make('p', { class: 'info-note', text: t(key) })); });
  }

  /** The progress bar of the info card follows the game without rebuilding the card. */
  function updateInfoProgress() {
    if (els === null || els.info === null || current === null || game === null) return;
    const holder = els.info.querySelector('[data-role="info-progress"]');
    if (holder === null) return;
    const done = game.status() === 'solved';
    const percent = done ? 100 : percentOf(game);
    holder.querySelector('.info-progress__label').textContent = done ? t('player.info.solved') :
      t('player.info.progress.value', { percent: percent });
    const bar = holder.querySelector('.progress');
    bar.setAttribute('aria-valuenow', String(percent));
    bar.firstChild.style.width = percent + '%';
  }

  function heading() {
    if (current === null) return '';
    const d = current.info && current.info.difficulty;
    const level = d ? levelName(d.achieved) : '';
    return level === '' ? variantName(current.variantId) :
      t('player.heading.level', { variant: variantName(current.variantId), level: level });
  }

  function renderHeading() {
    if (els === null) return;
    els.heading.textContent = heading();
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

  function recentItem(item) {
    const meta = item.meta || {};
    const name = variantName(meta.variantId || item.id.split('-')[0]);
    const details = recentDetails(item);
    const isCurrent = current !== null && current.id === item.id;
    const open = make('button', {
      type: 'button', class: 'recent-item__open', 'data-id': item.id,
      'aria-label': t('player.recent.open', { name: name, details: details })
    }, [
      make('span', { class: 'recent-item__name', text: name }),
      make('span', { class: 'recent-item__meta', text: details })
    ]);
    if (isCurrent) open.setAttribute('aria-current', 'true');
    open.addEventListener('click', function () { safely(function () { openStored(item.id); }); });
    const removeLabel = t('player.recent.remove', { name: name });
    const remove = make('button', {
      type: 'button', class: 'btn btn--ghost btn--icon btn--sm recent-item__remove',
      'aria-label': removeLabel, title: removeLabel
    }, [icon('trash')]);
    remove.addEventListener('click', function () {
      saved.forget(item.id);
      if (isCurrent) hasSavedProgress = false;
      renderRecent();
      announce(t('player.recent.removed'));
    });
    return make('li', { class: 'recent-item' + (isCurrent ? ' is-current' : '') }, [open, remove]);
  }

  function recentList() {
    const items = saved.recent(RECENT_SHOWN);
    if (items.length === 0) return make('p', { class: 'recent-empty', text: t('player.recent.empty') });
    const ul = make('ul', { class: 'recent-list', role: 'list' });
    items.forEach(function (item) { ul.appendChild(recentItem(item)); });
    return ul;
  }

  function renderRecent() {
    if (els === null) return;
    if (els.recent !== null) {
      els.recent.textContent = '';
      els.recent.appendChild(recentList());
    }
    if (els.welcomeRecent !== null) {
      els.welcomeRecent.textContent = '';
      if (saved.recent(1).length > 0) {
        els.welcomeRecent.appendChild(make('h3', {
          class: 'welcome__recent-title', text: t('shell.recent.title')
        }));
        els.welcomeRecent.appendChild(recentList());
      }
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Putting a puzzle on the board
  // ---------------------------------------------------------------------------------------------

  function placePuzzle(puzzle, options) {
    const o = options || {};
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
    if (o.collapseInfo !== false && typeof root.matchMedia === 'function' &&
        root.matchMedia(MOBILE_QUERY).matches) {
      els.infoDetails.open = false;
    }
    if (SG.play) {
      SG.play.attach(puzzle, { state: o.state, symbolMode: o.symbolMode, focus: o.focus === true });
    }
    saved.savePuzzle(puzzle.id, puzzle.document, metaOf(puzzle));
    saved.setLast(puzzle.id);
    if (o.state) hasSavedProgress = true;
    renderHeading();
    renderInfo();
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

  function open(input, options) {
    const o = options || {};
    const seq = ++openSeq;
    const isFile = input !== null && typeof input === 'object' && typeof input.size === 'number';
    const source = o.source || (isFile ? 'file' : 'paste');
    const textPromise = isFile ? readFile(input) : Promise.resolve(input);
    return textPromise.then(function (text) {
      return SG.importer.open(text, { source: source });
    }).then(function (outcome) {
      if (seq !== openSeq) return false;
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
  // The Open dialog
  // ---------------------------------------------------------------------------------------------

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
        body.appendChild(make('p', { class: 'modal__lead', i18n: 'player.open.intro' }));
        const picker = make('input', {
          type: 'file', class: 'visually-hidden', id: 'open-file', tabindex: '-1',
          accept: '.json,.txt,.puzzle,application/json,text/plain'
        });
        picker.addEventListener('change', function () {
          const file = picker.files && picker.files[0];
          if (file) submit(file, 'file');
          picker.value = '';
        });
        const choose = make('button', { type: 'button', class: 'btn btn--primary', id: 'open-choose' }, [
          icon('upload'), make('span', { class: 'btn__label', i18n: 'player.open.file' })
        ]);
        choose.addEventListener('click', function () { picker.click(); });
        body.appendChild(make('div', { class: 'open-file' }, [
          choose, picker, make('p', { class: 'field__hint', i18n: 'player.open.file.hint' })
        ]));
        body.appendChild(make('p', { class: 'open-drop', i18n: 'player.open.drop' }));
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
        const hint = make('p', {
          class: 'field__hint', id: 'open-text-hint', i18n: 'player.open.paste.hint'
        });
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
    return modal;
  }

  // ---------------------------------------------------------------------------------------------
  // Page-wide drop and paste
  // ---------------------------------------------------------------------------------------------

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
      if (text && !isTextField(event.target) && SG.importer.detect(text).kind !== 'unknown') {
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

  function openFragment() {
    const token = fragmentToken();
    if (token === null) return Promise.resolve(false);
    removeFragment();
    return open(token, { source: 'link', focus: false });
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
    renderInfo();
    renderRecent();
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
      svg: byId('board-svg'),
      info: byId('info-root'),
      infoDetails: byId('info-details'),
      recent: byId('recent-root'),
      status: byId('status-line'),
      drop: byId('drop-overlay'),
      generatorLink: byId('link-generator')
    };
  }

  function wireButtons() {
    [['btn-open', 'open'], ['btn-welcome-open', 'open'], ['btn-settings', 'settings'], ['btn-help', 'help']]
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
      focus: false,
      collapseInfo: false
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

    cleanup.push(on('play:change', function () {
      scheduleSave();
      updateInfoProgress();
    }));
    cleanup.push(on('play:game', function (payload) {
      game = payload.game;
      updateInfoProgress();
    }));
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
      'player.open.title': 'Open a puzzle',
      'player.open.intro': 'Choose a puzzle file, or paste a puzzle below.',
      'player.open.file': 'Choose a file…',
      'player.open.file.hint': 'A puzzle file from Sudoku Generator (.json), or a text file with one ' +
        'puzzle line.',
      'player.open.drop': 'You can also drop a file anywhere on this page.',
      'player.open.paste.label': 'Paste a puzzle',
      'player.open.paste.hint': 'The text of a puzzle file, a “Play online” link, a puzzle code, or one ' +
        'line of 81 (9×9), 36 (6×6) or 16 (4×4) characters where . 0 - _ mean an empty cell. Ctrl+Enter ' +
        'opens it.',
      'player.open.submit': 'Open',
      'player.error.title': 'This puzzle could not be opened',
      'player.error.lead': 'Nothing was changed on the board. What went wrong:',
      'player.error.again': 'Open another puzzle',
      'player.error.nothing': 'There is nothing to open.',
      'player.error.fileTooLarge': 'This file is too large to be a puzzle (over 8 MB).',
      'player.continue.title': 'Continue this puzzle?',
      'player.continue.title.solved': 'You already solved this puzzle',
      'player.continue.body': 'You played this puzzle before: {percent}% filled, {time} played, last on ' +
        '{date}.',
      'player.continue.solved': 'You solved this puzzle in {time} (on {date}).',
      'player.continue.note': 'Starting over deletes the saved progress of this puzzle.',
      'player.continue.yes': 'Continue',
      'player.continue.show': 'Show it',
      'player.continue.no': 'Start over',
      'player.info.variant': 'Variant',
      'player.info.difficulty': 'Difficulty',
      'player.info.difficulty.asked': '{achieved} (asked for {requested})',
      'player.info.score': 'score {score}',
      'player.info.hardest': 'Hardest technique',
      'player.info.clues': 'Clues',
      'player.info.clues.value': '{clues} of {cells} cells',
      'player.info.seed': 'Seed',
      'player.info.generated': 'Generated',
      'player.info.source': 'Opened from',
      'player.info.progress': 'Progress',
      'player.info.progress.value': '{percent}% filled',
      'player.info.solved': 'Solved',
      'player.info.notes.multiple': 'This puzzle has more than one solution. Any grid that follows the ' +
        'rules counts as solved.',
      'player.info.notes.unverified': 'The solution could not be checked in time.',
      'player.info.notes.computed': 'The file had no solution; this page worked it out.',
      'player.info.notes.noDifficulty': 'No difficulty information came with this puzzle.',
      'player.info.wordoku': 'The key word appears when you solve the puzzle.',
      'player.source.link': 'a link',
      'player.source.file': 'a file',
      'player.source.drop': 'a dropped file',
      'player.source.paste': 'pasted text',
      'player.source.text': 'a puzzle line',
      'player.source.recent': 'the recent list',
      'player.source.restore': 'your last visit',
      'player.recent.empty': 'No recent puzzles yet. Puzzles you open are listed here.',
      'player.recent.open': 'Open {name}: {details}',
      'player.recent.remove': 'Remove {name} from the list',
      'player.recent.removed': 'Removed from the list.',
      'player.recent.clues_one': '{count} clue',
      'player.recent.clues_other': '{count} clues',
      'player.recent.progress': '{percent}% filled',
      'player.recent.solved': 'Solved',
      'player.recent.new': 'Not started',
      'player.clear.done': 'Saved puzzles and progress were deleted from this browser.'
    },
    vi: {
      'player.heading.level': '{variant} · {level}',
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
      'player.open.title': 'Mở một đề',
      'player.open.intro': 'Chọn một tệp đề, hoặc dán đề vào ô bên dưới.',
      'player.open.file': 'Chọn tệp…',
      'player.open.file.hint': 'Tệp đề của Trình sinh đề Sudoku (.json), hoặc tệp văn bản có một dòng đề.',
      'player.open.drop': 'Bạn cũng có thể thả tệp vào bất kỳ đâu trên trang này.',
      'player.open.paste.label': 'Dán đề',
      'player.open.paste.hint': 'Nội dung tệp đề, liên kết “Chơi trực tuyến”, mã đề, hoặc một dòng gồm 81 ' +
        '(9×9), 36 (6×6) hay 16 (4×4) ký tự, trong đó . 0 - _ là ô trống. Nhấn Ctrl+Enter để mở.',
      'player.open.submit': 'Mở',
      'player.error.title': 'Không mở được đề này',
      'player.error.lead': 'Bàn cờ không bị thay đổi. Đã xảy ra lỗi:',
      'player.error.again': 'Mở đề khác',
      'player.error.nothing': 'Không có gì để mở.',
      'player.error.fileTooLarge': 'Tệp này quá lớn để là một đề (hơn 8 MB).',
      'player.continue.title': 'Tiếp tục đề này?',
      'player.continue.title.solved': 'Bạn đã giải đề này rồi',
      'player.continue.body': 'Bạn đã chơi đề này: đã điền {percent}%, chơi {time}, lần cuối vào {date}.',
      'player.continue.solved': 'Bạn đã giải đề này trong {time} (vào {date}).',
      'player.continue.note': 'Chơi lại từ đầu sẽ xóa tiến độ đã lưu của đề này.',
      'player.continue.yes': 'Tiếp tục',
      'player.continue.show': 'Xem lại',
      'player.continue.no': 'Chơi lại từ đầu',
      'player.info.variant': 'Biến thể',
      'player.info.difficulty': 'Độ khó',
      'player.info.difficulty.asked': '{achieved} (yêu cầu {requested})',
      'player.info.score': 'điểm {score}',
      'player.info.hardest': 'Kỹ thuật khó nhất',
      'player.info.clues': 'Số cho sẵn',
      'player.info.clues.value': '{clues} trên {cells} ô',
      'player.info.seed': 'Seed',
      'player.info.generated': 'Ngày tạo',
      'player.info.source': 'Mở từ',
      'player.info.progress': 'Tiến độ',
      'player.info.progress.value': 'đã điền {percent}%',
      'player.info.solved': 'Đã giải',
      'player.info.notes.multiple': 'Đề này có nhiều hơn một lời giải. Mọi lưới đúng luật đều được tính là ' +
        'đã giải.',
      'player.info.notes.unverified': 'Chưa kiểm tra xong lời giải trong thời gian cho phép.',
      'player.info.notes.computed': 'Tệp không có lời giải; trang này đã tự tìm ra.',
      'player.info.notes.noDifficulty': 'Đề này không kèm thông tin về độ khó.',
      'player.info.wordoku': 'Từ khóa sẽ hiện ra khi bạn giải xong đề.',
      'player.source.link': 'một liên kết',
      'player.source.file': 'một tệp',
      'player.source.drop': 'một tệp được thả vào',
      'player.source.paste': 'văn bản đã dán',
      'player.source.text': 'một dòng đề',
      'player.source.recent': 'danh sách gần đây',
      'player.source.restore': 'lần truy cập trước',
      'player.recent.empty': 'Chưa có đề nào gần đây. Các đề bạn mở sẽ được liệt kê ở đây.',
      'player.recent.open': 'Mở {name}: {details}',
      'player.recent.remove': 'Xóa {name} khỏi danh sách',
      'player.recent.removed': 'Đã xóa khỏi danh sách.',
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
