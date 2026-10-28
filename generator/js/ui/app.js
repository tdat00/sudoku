/**
 * `SG.app`: application wiring. It owns the page: reads the URL and the stored preferences, builds the board,
 * the controls, the replay player, the steps panel and the result panel, runs a generation, and replays how
 * the puzzle was made (from `PuzzleResult.digLog`). Every other UI module is a self-contained building block;
 * this file only connects them. It starts by itself when the DOM is ready (nothing happens without a DOM or
 * without the mount points of index.html, so the file also loads in Node and in tests.html).
 *
 * PUBLIC API (later modules - export, a11y, theme, help, cache - use only this)
 *   getStore()   the shared `SG.store` instance.
 *   getBoard()   the CURRENT `SG.boardView` view (null before start). The same view lives for the whole
 *                session; a new puzzle is installed with `board.setModel`. Do not keep a model of your own:
 *                read `getResult()`.
 *   getPlayer() / getStepView()   the replay player / the steps panel (null before start).
 *   getExplainContext()   `{ stepId, lineLabel, metrics, position, length }` or null (no replay): what the
 *                Help dialog explains as the current step. `stepId` is the pipeline step ('fullGrid',
 *                'extraStructure' or 'dig') of the replay step on show, `lineLabel` the pseudocode line,
 *                `metrics` the dig counters (null outside the dig).
 *   getResult()   `{ result, trace }` of the last successful generation, or null while nothing is shown
 *                (before the first run, during a run, after an error or a cancel).
 *   generate(overrides?, options?) -> Promise<?PuzzleResult>. Starts a generation from the store state.
 *                `overrides` is a partial store state (e.g. `{ seed: '42' }`) written to the store first, so
 *                the form shows what is being generated. A run that is replaced, cancelled or fails resolves
 *                with null (failures go to the 'generate:error' event and a toast, never a rejection).
 *                `options.random` (true for `regenerate()`) tells the client that any random puzzle of the
 *                same configuration will do (the cache serves a pre-generated one); it reaches the client as
 *                `client.generate(config, onEvent, { random })`.
 *   regenerate() -> Promise<?PuzzleResult>. Writes a new random seed to the store, then `generate()`.
 *   getClient() / setClient(next)   the generation client in use / replaces it (a wrapper with the same
 *                interface; null restores the default). Call it between runs.
 *   attachTrace(trace, digLog?) -> boolean. Gives the puzzle on screen what arrived after it was shown (a
 *                result served from the cache has no dig log and `getResult().trace === []`): the trace, and
 *                the dig log when the result had none. The player then loads the replay at its END. False
 *                when nothing is shown, a run is in progress or there is still no dig log. Fires 'trace'.
 *   cancel() -> boolean. Stops the running generation (see the limit of the main-thread client below).
 *   showResult(result, { trace }) -> boolean. Shows a `PuzzleResult` that this page did not generate: the
 *                board shows its clues, the result panel what it can, the replay is built when the result has
 *                a `digLog`; `trace` (default none) is kept as its events. A running generation is replaced.
 *                Fires 'result' with `{ result, trace, imported: true }` (and not 'generate:end').
 *   toast(kind, key, args?) -> { close() }. `kind`: 'success' | 'warning' | 'danger' | 'info'.
 *   openModal({ titleKey, titleArgs, body, footer, wide, onClose }) -> { el, panel, body, footer, close(),
 *                setTitle(key, args) }. A `<dialog class="modal">` in `#modal-root`; `body` / `footer` are a
 *                Node or `function (container)` that fills it (and may return a Node). Esc, the backdrop and
 *                the close button close it, the focus goes back, `body.is-modal-open` is set while one is
 *                open. `onClose()` runs once.
 *   announce(text)   writes `text` to the polite live region `#a11y-live`.
 *   on(name, fn) -> off(); `emit(name, payload)` (modules may emit their own events). Events of the app:
 *       'generate:start'     { config }
 *       'generate:progress'  one `GenerationEvent` (worker: while the run goes on; main thread: at the end)
 *       'generate:end'       the `PuzzleResult`
 *       'generate:error'     the error (a `GenerationError` or any `Error`)
 *       'generate:cancel'    null
 *       'result'             `{ result, trace }`, after the board shows the new puzzle
 *       'trace'              `{ result, trace }`, after `attachTrace` gave the puzzle its replay
 *       'position'           `{ position, length, step, direction }` after every move of the replay
 *                            (`step` is a step of `SG.player.buildSteps`, null at position 0)
 *       'locale' { locale } | 'theme' { theme } | 'settings' { state, keys, meta }   every store change
 *       'action'             { id }: a click on `#btn-export` ('export': Print), `#btn-export-code`
 *                            ('exportCode'), `#btn-play-online` ('play'), `#btn-settings` ('settings'),
 *                            `#btn-help` ('help') or `#btn-explain` ('help' with `tab: 'generation'`); when
 *                            nobody listens the user gets an "unavailable" toast
 *   start() / destroy()   idempotent; `start` runs automatically on DOMContentLoaded.
 *
 * OPTIONAL MODULES: at the end of start-up the app calls `init(SG.app)` on each of `SG.exportUi`, `SG.a11y`,
 * `SG.theme`, `SG.help`, `SG.cache`, `SG.history` that exists, in this order, each in its own try/catch (a
 * module that throws is logged and skipped). `#btn-export`, `#btn-export-code` and `#btn-play-online` are
 * enabled once a puzzle is shown AND somebody listens to 'action'.
 *
 * Generation client: `SG.workerClient || directClient`; a client is `{ generate(config, onEvent) ->
 * Promise<PuzzleResult>, cancel(), replay(result, { onProgress }) -> Promise<Analysis>, cancelReplay(),
 * mode: 'worker' | 'main', ready()? }`. The internal `directClient` runs `SG.pipeline.run` on the main
 * thread. LIMIT: that pipeline is synchronous and cannot yield, so the page cannot respond while it runs and
 * `cancel()` (or a newer `generate`) only takes effect while the client is still waiting to paint the busy
 * state; a run that has started always finishes (or hits its time budget) and its result is then dropped by
 * the session token of the app. `SG.workerClient` removes the limit.
 * `replay` (the analysis behind the replay's score tables, `SG.replay.prepare`) never starts by itself: the
 * page asks for it, and on the main thread only with `allowMain: true`, the user's explicit consent.
 *
 * Replay contract: the board is built from the FINAL model of the result and shows the finished puzzle at
 * once; nothing plays by itself. The player builds the replay steps from `result.digLog` (not from the trace)
 * and its `onPosition` is the one place that drives the steps panel.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.app && typeof SG.app.generate === 'function') return;

  const SVG_NS = 'http://www.w3.org/2000/svg';

  const FONT_SIZES = Object.freeze({ small: '87.5%', normal: '100%', large: '125%' });

  const TOAST_KINDS = Object.freeze(['success', 'warning', 'danger', 'info']);
  const TOAST_MS = Object.freeze({ success: 3500, info: 5000, warning: 7000, danger: 10000 });
  const MAX_TOASTS = 4;

  const MOBILE_QUERY = '(max-width: 767.98px)';

  /** Time limit of a run on the main thread (the page cannot respond while it runs). */
  const MAIN_THREAD_LIMIT_MS = 120000;

  /** Length of a slice of the replay analysis on the page; the page gets its turn between two slices. */
  const REPLAY_SLICE_MS = 12;

  /** The busy state is painted after two animation frames; this timer covers a tab that paints no frames. */
  const PAINT_FALLBACK_MS = 150;

  const OPTIONAL_MODULES = Object.freeze(['exportUi', 'a11y', 'theme', 'help', 'cache', 'history']);

  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
    'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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

  function make(tag, attrs, children) {
    const node = document.createElement(tag);
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

  function requestFrame(fn) {
    if (typeof root.requestAnimationFrame === 'function') return root.requestAnimationFrame(fn);
    return root.setTimeout(fn, 16);
  }

  function cancelFrame(id) {
    if (typeof root.cancelAnimationFrame === 'function') root.cancelAnimationFrame(id);
    else root.clearTimeout(id);
  }

  function fontSizeValue(size) {
    return Object.prototype.hasOwnProperty.call(FONT_SIZES, size) ? FONT_SIZES[size] : FONT_SIZES.normal;
  }

  /**
   * The `data-theme` value of a theme setting; null for 'auto' (no attribute: `prefers-color-scheme` rules).
   */
  function themeAttribute(theme) {
    return theme === 'light' || theme === 'dark' || theme === 'high-contrast' ? theme : null;
  }

  function cancelledError() {
    return new SG.errors.GenerationError('budget.cancelled', {});
  }

  /**
   * Calls `run` after the next paint (two frames, then a zero timeout; a timer covers a hidden tab). Returns
   * cancel.
   */
  function waitForPaint(run) {
    let frame1 = null;
    let frame2 = null;
    let timer = null;
    let fallback = null;
    let done = false;
    function clearAll() {
      if (frame1 !== null) cancelFrame(frame1);
      if (frame2 !== null) cancelFrame(frame2);
      if (timer !== null) root.clearTimeout(timer);
      if (fallback !== null) root.clearTimeout(fallback);
      frame1 = frame2 = timer = fallback = null;
    }
    function fire() {
      if (done) return;
      done = true;
      clearAll();
      run();
    }
    frame1 = requestFrame(function () {
      frame1 = null;
      frame2 = requestFrame(function () {
        frame2 = null;
        timer = root.setTimeout(fire, 0);
      });
    });
    fallback = root.setTimeout(fire, PAINT_FALLBACK_MS);
    return function cancelWait() {
      done = true;
      clearAll();
    };
  }

  /**
   * The main-thread client (interface of `SG.workerClient`): waits for the busy state to paint, runs
   * `SG.pipeline.run` synchronously and hands the buffered events to `onEvent` at the end. See LIMIT above.
   * `replay` runs `SG.replay.prepare` on the page in slices of about REPLAY_SLICE_MS, only inside that call
   * and only with the explicit consent `allowMain: true` (the same contract as the worker client).
   */
  const directClient = (function () {
    let token = 0;
    let abort = null;
    let replayToken = 0;
    let replayStop = null;

    function deliver(events, onEvent) {
      if (typeof onEvent !== 'function') return;
      for (let i = 0; i < events.length; i++) safely(onEvent, events[i]);
    }

    function cancel() {
      token++;
      if (abort !== null) {
        const stop = abort;
        abort = null;
        stop();
      }
    }

    function cancelReplay() {
      if (replayStop === null) return false;
      const stop = replayStop;
      replayStop = null;
      stop();
      return true;
    }

    function clockMs() {
      return typeof root.performance !== 'undefined' && typeof root.performance.now === 'function'
        ? root.performance.now() : Date.now();
    }

    function replay(result, options) {
      const o = options !== null && typeof options === 'object' ? options : {};
      if (o.allowMain !== true) {
        return Promise.reject(
          new SG.errors.GenerationError('budget.cancelled', { reason: 'replayConsentRequired' })
        );
      }
      cancelReplay();
      if (abort !== null) {
        return Promise.reject(new SG.errors.GenerationError('unexpected', { message: 'busy' }));
      }
      return new Promise(function (resolve, reject) {
        let iterator;
        try {
          iterator = SG.replay.prepare(result);
        } catch (err) {
          reject(err);
          return;
        }
        const mine = ++replayToken;
        let lastDone = -1;

        function report(done, total) {
          if (typeof done !== 'number' || done === lastDone) return;
          lastDone = done;
          if (typeof o.onProgress === 'function') safely(o.onProgress, { done: done, total: total });
        }

        function slice() {
          if (mine !== replayToken) return;
          const began = clockMs();
          let step;
          let latest = null;
          try {
            do {
              step = iterator.next();
              if (!step.done) latest = step.value;
            } while (!step.done && clockMs() - began < REPLAY_SLICE_MS);
          } catch (err) {
            replayStop = null;
            reject(err);
            return;
          }
          if (latest !== null) report(latest.done, latest.total);
          if (step.done) {
            const stats = step.value !== null && typeof step.value === 'object' ? step.value.stats : null;
            if (stats && typeof stats.positions === 'number') report(stats.positions, stats.positions);
            if (mine !== replayToken) return;
            replayStop = null;
            resolve(step.value);
            return;
          }
          if (mine !== replayToken) return;
          root.setTimeout(slice, 0);
        }

        replayStop = function stop() {
          replayToken++;
          try {
            iterator.return();
          } catch (err) {
            // The generator is abandoned either way.
          }
          reject(cancelledError());
        };
        root.setTimeout(slice, 0);
      });
    }

    function generate(config, onEvent) {
      cancelReplay();
      cancel();
      const mine = token;
      return new Promise(function (resolve, reject) {
        function run() {
          if (mine !== token) return;
          abort = null;
          const events = [];
          let result;
          try {
            const budget = SG.budget.create({ ms: MAIN_THREAD_LIMIT_MS });
            result = SG.pipeline.run(config, function (event) { events.push(event); }, budget);
          } catch (err) {
            deliver(events, onEvent);
            reject(err);
            return;
          }
          deliver(events, onEvent);
          resolve(result);
        }
        const stopWaiting = waitForPaint(run);
        abort = function () {
          stopWaiting();
          reject(cancelledError());
        };
      });
    }

    return { generate: generate, cancel: cancel, replay: replay, cancelReplay: cancelReplay, mode: 'main' };
  })();

  const listeners = {};
  const toasts = [];
  const modals = [];
  const cleanups = [];

  let started = false;
  let els = null;
  let store = null;
  let board = null;
  let player = null;
  let stepView = null;
  let resultView = null;
  let controls = null;
  let client = null;

  let session = 0;
  let busy = false;
  let current = null;
  let live = null;
  let boardModel = null;
  let symbolMode = 'digits';
  let solutionOn = false;
  let announceTimer = null;
  let modalCounter = 0;
  let focusInControls = false;

  function listenerCount(name) {
    return listeners[name] ? listeners[name].length : 0;
  }

  /** A throwing listener is logged. Returns the function that removes the listener. */
  function on(name, fn) {
    if (typeof name !== 'string' || typeof fn !== 'function') {
      throw new TypeError('SG.app.on needs an event name and a function');
    }
    (listeners[name] = listeners[name] || []).push(fn);
    if (started && name === 'action') updateButtons();
    return function off() {
      if (!listeners[name]) return;
      listeners[name] = listeners[name].filter(function (other) { return other !== fn; });
      if (started && name === 'action') updateButtons();
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

  function announce(text) {
    const host = byId('a11y-live');
    if (host === null) return;
    root.clearTimeout(announceTimer);
    host.textContent = '';
    // A short pause makes a repeated text count as a change.
    announceTimer = root.setTimeout(function () { host.textContent = String(text); }, 60);
  }

  function toast(kind, key, args) {
    const host = byId('toast-root');
    const none = { close: function () {} };
    if (host === null) return none;
    const type = TOAST_KINDS.indexOf(kind) === -1 ? 'info' : kind;
    const closeButton = make('button', {
      type: 'button', class: 'btn btn--ghost btn--icon btn--sm toast__close', 'aria-label': t('common.close')
    }, [icon('x')]);
    const node = make('div', { class: 'toast toast--' + type, 'data-kind': type }, [
      make('span', { class: 'toast__message', text: t(key, args) }),
      closeButton
    ]);
    const entry = { node: node, timer: null };
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

  /** See the file header; null without a DOM. */
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
    record.close = close;
    closeButton.addEventListener('click', close);
    el.addEventListener('click', onBackdrop);
    el.addEventListener('cancel', onCancel);

    fill(bodyEl, o.body);
    if (footerEl !== null) fill(footerEl, o.footer);
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

  function setPressed(buttons, test) {
    buttons.forEach(function (button) {
      button.setAttribute('aria-pressed', test(button) ? 'true' : 'false');
    });
  }

  function syncLangButtons(lang) {
    setPressed(els.langButtons, function (b) { return b.getAttribute('data-lang') === lang; });
  }

  function syncThemeButtons(theme) {
    setPressed(els.themeButtons, function (b) { return b.getAttribute('data-theme-value') === theme; });
  }

  function applyPrefs(state, keys) {
    const html = document.documentElement;
    const has = function (key) { return keys === null || keys.indexOf(key) !== -1; };
    if (has('lang')) {
      if (SG.i18n.current !== state.lang) SG.i18n.setLocale(state.lang);
      syncLangButtons(state.lang);
    }
    if (has('theme')) {
      const attr = themeAttribute(state.theme);
      if (attr === null) html.removeAttribute('data-theme');
      else html.setAttribute('data-theme', attr);
      syncThemeButtons(state.theme);
      emit('theme', { theme: state.theme });
    }
    if (has('fontSize')) html.style.setProperty('--sg-font-size-base', fontSizeValue(state.fontSize));
    if (has('reducedMotion')) {
      if (state.reducedMotion) html.setAttribute('data-motion', 'off');
      else html.removeAttribute('data-motion');
    }
  }

  function variantName(variantId) {
    const key = 'variant.' + variantId;
    return SG.i18n.has(key) ? t(key) : String(variantId);
  }

  function levelName(level) {
    const key = 'difficulty.' + level;
    return SG.i18n.has(key) ? t(key) : String(level);
  }

  /**
   * "<variant> - <difficulty> (Seed: <seed>)" of the puzzle on screen, or of the form while there is none.
   */
  function updateHeading() {
    if (els === null || els.heading === null || store === null) return;
    const state = store.get();
    const r = current !== null ? current.result : null;
    const variantId = r ? r.config.variantId : state.variantId;
    const level = r ? r.rating.level : state.difficulty;
    const typed = String(state.seed).trim();
    const seed = r ? String(r.seed) : (typed !== '' ? typed : t('common.random'));
    const text = variantName(variantId) + ' - ' + levelName(level) + ' (' +
      t('app.heading.seed', { seed: seed }) + ')';
    const key = 'variant.' + variantId + '.desc';
    const description = SG.i18n.has(key) ? t(key) : '';
    if (els.heading.textContent !== text) els.heading.textContent = text;
    if (els.subheading.textContent !== description) els.subheading.textContent = description;
  }

  function updateTitle() {
    updateHeading();
    if (current === null) {
      document.title = t('app.title');
      return;
    }
    const r = current.result;
    document.title = t('app.title.result', {
      variant: variantName(r.config.variantId), level: levelName(r.rating.level), app: t('app.title')
    });
  }

  function updateButtons() {
    if (els === null) return;
    updateHeading();
    els.generate.classList.toggle('is-busy', busy);
    els.generate.setAttribute('aria-busy', busy ? 'true' : 'false');
    els.cancel.hidden = !busy;
    els.regenerate.disabled = busy;
    els.exportBtn.disabled = busy || current === null || listenerCount('action') === 0;
    if (els.playBtn) els.playBtn.disabled = els.exportBtn.disabled;
    if (els.exportCodeBtn) els.exportCodeBtn.disabled = els.exportBtn.disabled;
    els.form.classList.toggle('is-busy', busy);
    els.form.setAttribute('aria-busy', busy ? 'true' : 'false');
    if (els.frame) els.frame.classList.toggle('is-busy', busy);
    els.main.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  function setBusy(flag) {
    busy = flag;
    updateButtons();
  }

  function modeForModel(model, state, fallback) {
    const def = SG.variants.get(model.variantId);
    const modes = SG.symbols.modesFor(def);
    if (state.variantId === model.variantId && modes.indexOf(state.symbolMode) !== -1) {
      return state.symbolMode;
    }
    if (fallback && modes.indexOf(fallback) !== -1) return fallback;
    return def.defaultSymbolMode;
  }

  function renderLegend() {
    if (els === null || els.legend === null) return;
    const aux = store.get().colorAuxSymbol;
    if (boardModel !== null && (symbolMode === 'colors' || symbolMode === 'shapes')) {
      SG.symbols.renderLegend(els.legend, symbolMode, boardModel, { colorAuxSymbol: aux });
    } else {
      els.legend.textContent = '';
    }
  }

  function showAllLayers() {
    SG.player.LAYER_NAMES.forEach(function (name) { board.setLayerVisible(name, true); });
  }

  function installModel(model, state, mode) {
    board.setModel(model);
    board.setGivens(null);
    board.showSolution(null);
    board.clearHighlights();
    board.setValues(new Int32Array(model.cellCount));
    board.setSymbolMode(mode);
    board.setColorAuxSymbol(state.colorAuxSymbol);
    boardModel = model;
    symbolMode = mode;
    solutionOn = false;
    renderLegend();
  }

  function previewModel(state) {
    try {
      const def = SG.variants.get(state.variantId);
      return def.build(Object.assign({}, state.variantOptions), SG.rng.create(1).fork('model'));
    } catch (err) {
      return null;
    }
  }

  /** The empty board of the selected variant, shown while no puzzle is on screen (or a run is starting). */
  function showPreview(force) {
    if (board === null || (force !== true && (current !== null || busy))) return;
    const state = store.get();
    const model = previewModel(state);
    if (model === null) return;
    installModel(model, state, modeForModel(model, state, null));
    showAllLayers();
    board.refreshText();
  }

  /** The solution is drawn in the empty cells of the finished puzzle (the last position of the replay). */
  function syncSolution() {
    if (board === null) return;
    const s = player.state();
    const want = current !== null && store.get().showSolution && (s.finished || !s.loaded);
    if (want === solutionOn) return;
    solutionOn = want;
    board.showSolution(want ? current.result.solution : null);
  }

  function loadReplay(result) {
    player.load(result);
    stepView.setSteps(player.getSteps());
    stepView.setPosition(player.state().position);
  }

  function showFinished(result) {
    player.reset();
    stepView.clear();
    showAllLayers();
    board.setValues(result.givens);
    board.setGivens(result.givens);
    board.refreshText();
  }

  function explainContext() {
    if (current === null || player === null) return null;
    const s = player.state();
    if (!s.loaded) return null;
    // At the start (the empty grid) the first step is the one that comes next.
    const step = s.position === 0 ? player.getStep(1) : player.getStep(s.position);
    if (!step) return null;
    const started = s.position > 0;
    return { stepId: step.phase, lineLabel: started ? step.line : null,
      metrics: started ? step.metrics : null, position: s.position, length: s.length };
  }

  /** The single place that drives the steps panel. */
  function handlePosition(info) {
    if (current === null) return;
    stepView.setPosition(info.position);
    syncSolution();
    board.refreshText();
    emit('position', info);
  }

  function handlePlayerState() {
    updateButtons();
    syncSolution();
  }

  function onEvent(token, buffer, event) {
    if (token !== session) return;
    buffer.push(event);
    emit('generate:progress', event);
  }

  function closeDrawerOnMobile() {
    if (els.controlsRoot.classList.contains('is-open') && typeof root.matchMedia === 'function' &&
        root.matchMedia(MOBILE_QUERY).matches) {
      const hadFocus = els.controlsRoot.contains(document.activeElement);
      setDrawer(false, hadFocus);
    }
  }

  function beginRun(token, state, config, buffer) {
    current = null;
    live = { token: token };
    showTab('result');
    SG.i18n.setCellLabeler(null);
    player.reset();
    stepView.clear();
    resultView.clear();
    document.title = t('app.title');
    setBusy(true);
    closeDrawerOnMobile();
    emit('generate:start', { config: config });
  }

  function announceReady(result) {
    const key = result.warnings.indexOf('difficulty.approximate') !== -1 ? 'app.announce.approximate'
      : 'app.announce.ready';
    let clues = 0;
    for (let i = 0; i < result.givens.length; i++) if (result.givens[i] > 0) clues++;
    announce(t(key, { level: levelName(result.rating.level), clues: t('unit.clue', { count: clues }) }));
  }

  function succeed(token, result, buffer, imported) {
    const state = store.get();
    const trace = buffer.events();
    live = null;
    current = imported ? { result: result, trace: trace, imported: true } : { result: result, trace: trace };
    try {
      installModel(result.model, state, modeForModel(result.model, state, result.config.symbolMode));
      SG.i18n.setCellLabeler(function (cell) { return SG.model.cellLabel(result.model, cell); });
      setBusy(false);
      resultView.show(result);
      showTab('result');
      // The finished puzzle is shown at once; the replay steps come from the dig log of the result.
      if (Array.isArray(result.digLog)) loadReplay(result);
      else showFinished(result);
    } catch (err) {
      return fail(err, buffer);
    }
    updateTitle();
    updateButtons();
    if (!imported) announceReady(result);
    restoreFocus();
    emit('result', current);
    if (!imported) emit('generate:end', result);
    return result;
  }

  function fail(err) {
    live = null;
    current = null;
    setBusy(false);
    safely(function () { player.reset(); });
    stepView.clear();
    if (SG.DEBUG) logError(err);
    showPreview();
    toast('danger', 'app.status.failed', { message: SG.i18n.tError(err) });
    updateTitle();
    updateButtons();
    restoreFocus();
    emit('generate:error', err);
    return null;
  }

  function generate(overrides, options) {
    if (!started) return Promise.resolve(null);
    if (overrides && typeof overrides === 'object') store.set(overrides, { source: 'app' });
    focusInControls = els.controlsRoot.contains(document.activeElement);
    const token = ++session;
    if (busy) safely(function () { client.cancel(); });
    const state = store.get();
    const config = SG.store.toConfig(state);
    const buffer = SG.events.createTraceBuffer();
    beginRun(token, state, config, buffer);
    let promise;
    try {
      promise = client.generate(config, function (event) { onEvent(token, buffer, event); },
        { random: Boolean(options && options.random) });
    } catch (err) {
      promise = Promise.reject(err);
    }
    const chained = promise.then(
      function (result) { return token === session ? succeed(token, result, buffer) : null; },
      function (err) { return token === session ? fail(err, buffer) : null; }
    );
    // The empty board of the run is drawn after a synchronous answer (a cache hit) has had its turn: that
    // answer replaces the board anyway, and building the board twice costs tens of ms on a big variant.
    // The answer comes first because its callback was queued before this one; any later one (the worker,
    // the main-thread run) finds the preview in place before the browser paints.
    Promise.resolve().then(function () {
      if (token === session && busy && live !== null && live.token === token) showPreview(true);
    });
    return chained;
  }

  function regenerate() {
    if (!started) return Promise.resolve(null);
    store.newSeed();
    return generate(undefined, { random: true });
  }

  function showResult(result, options) {
    if (!started || result === null || typeof result !== 'object' || !result.model || !result.givens) {
      return false;
    }
    const opts = options || {};
    const token = ++session;
    if (busy) safely(function () { client.cancel(); });
    const buffer = SG.events.createTraceBuffer();
    (Array.isArray(opts.trace) ? opts.trace : []).forEach(function (event) { buffer.push(event); });
    focusInControls = false;
    current = null;
    live = null;
    player.reset();
    stepView.clear();
    resultView.clear();
    setBusy(false);
    return succeed(token, result, buffer, true) !== null;
  }

  function cancel() {
    if (!started || !busy) return false;
    focusInControls = els.controlsRoot.contains(document.activeElement);
    session++;
    safely(function () { client.cancel(); });
    live = null;
    current = null;
    setBusy(false);
    player.reset();
    stepView.clear();
    showPreview();
    updateTitle();
    updateButtons();
    announce(t('app.status.cancelled'));
    restoreFocus();
    emit('generate:cancel', null);
    return true;
  }

  /**
   * Chooses another variant while a puzzle is on screen: the puzzle of the old variant goes (board, replay,
   * steps, explanation, result panel) and the board shows the empty layout of the new variant.
   */
  function discardPuzzle() {
    session++;
    current = null;
    live = null;
    SG.i18n.setCellLabeler(null);
    player.reset();
    stepView.clear();
    resultView.clear();
    showPreview();
    syncSolution();
    updateTitle();
    updateButtons();
  }

  function getClient() {
    return client;
  }

  /**
   * For a module that wraps the client (the cache); null or undefined restores the default. Call it between
   * runs.
   */
  function setClient(next) {
    client = next || SG.workerClient || directClient;
  }

  function attachTrace(trace, digLog) {
    if (!started || busy || current === null || !Array.isArray(trace)) return false;
    const result = current.result;
    if (!Array.isArray(result.digLog) && Array.isArray(digLog)) result.digLog = digLog;
    if (!Array.isArray(result.digLog)) return false;
    current.trace = trace;
    try {
      loadReplay(result);
    } catch (err) {
      logError(err);
      safely(function () { showFinished(result); });
      return false;
    }
    emit('trace', current);
    return true;
  }

  /** Moves the focus into the opened drawer; a closed drawer is not focusable for a few frames. */
  function focusDrawer(framesLeft) {
    requestFrame(function () {
      if (!started || !els.controlsRoot.classList.contains('is-open')) return;
      controls.focusFirst();
      if (!els.controlsRoot.contains(document.activeElement) && framesLeft > 0) focusDrawer(framesLeft - 1);
    });
  }

  function setDrawer(open, restoreFocusToToggle) {
    els.controlsRoot.classList.toggle('is-open', open);
    els.drawer.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) focusDrawer(20);
    else if (restoreFocusToToggle) els.drawer.focus();
  }

  /** The Generate or Cancel button may have been inside a drawer that closed: keep the focus on the page. */
  function restoreFocus() {
    if (!focusInControls) return;
    const active = document.activeElement;
    if (!active || active === document.body || !active.isConnected) {
      if (els.drawer.offsetParent !== null) els.drawer.focus();
      else els.generate.focus();
    }
  }

  function listen(target, type, fn) {
    if (!target) return;
    target.addEventListener(type, fn);
    cleanups.push(function () { target.removeEventListener(type, fn); });
  }

  function findElements() {
    const q = function (selector) { return document.querySelector(selector); };
    const found = {
      board: byId('board-svg'),
      boardRoot: byId('board-root'),
      frame: q('#board-root .board-frame'),
      controlsRoot: byId('controls-root'),
      form: byId('controls-form'),
      generate: byId('btn-generate'),
      regenerate: byId('btn-regenerate'),
      cancel: byId('btn-cancel'),
      exportBtn: byId('btn-export'),
      playBtn: byId('btn-play-online'),
      exportCodeBtn: byId('btn-export-code'),
      heading: byId('puzzle-heading'),
      subheading: byId('puzzle-subheading'),
      settings: byId('btn-settings'),
      help: byId('btn-help'),
      drawer: byId('btn-drawer'),
      backdrop: q('.drawer-backdrop'),
      stepsRoot: byId('steps-root'),
      explainBtn: byId('btn-explain'),
      playerRoot: byId('player-root'),
      resultRoot: byId('result-root'),
      tabs: Array.prototype.slice.call(document.querySelectorAll('.player__tabs [role="tab"]')),
      main: byId('main'),
      langButtons: Array.prototype.slice.call(document.querySelectorAll('[data-lang]')),
      themeButtons: Array.prototype.slice.call(document.querySelectorAll('[data-theme-value]')),
      legend: null
    };
    const required = ['board', 'boardRoot', 'controlsRoot', 'form', 'generate', 'regenerate', 'cancel',
      'exportBtn', 'drawer', 'stepsRoot', 'playerRoot', 'resultRoot', 'main'];
    for (let i = 0; i < required.length; i++) if (!found[required[i]]) return null;
    return found;
  }

  /** Adds the small container that index.html does not have: the symbol legend. */
  function addContainers() {
    els.legend = make('div', { id: 'board-legend', class: 'board-legend' });
    els.boardRoot.appendChild(els.legend);
    cleanups.push(function () {
      if (els.legend && els.legend.parentNode) els.legend.parentNode.removeChild(els.legend);
    });
  }

  function showTab(name) {
    if (els === null) return;
    els.tabs.forEach(function (tab) {
      const selected = tab.getAttribute('data-tab') === name;
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.tabIndex = selected ? 0 : -1;
      const panel = byId(tab.getAttribute('aria-controls'));
      if (panel) panel.hidden = !selected;
    });
  }

  function wireTabs() {
    els.tabs.forEach(function (tab, i) {
      listen(tab, 'click', function () { showTab(tab.getAttribute('data-tab')); });
      listen(tab, 'keydown', function (event) {
        const last = els.tabs.length - 1;
        const to = event.key === 'ArrowRight' ? (i === last ? 0 : i + 1)
          : event.key === 'ArrowLeft' ? (i === 0 ? last : i - 1)
            : event.key === 'Home' ? 0 : event.key === 'End' ? last : -1;
        if (to === -1) return;
        event.preventDefault();
        showTab(els.tabs[to].getAttribute('data-tab'));
        els.tabs[to].focus();
      });
    });
  }

  function wireHeader() {
    els.langButtons.forEach(function (button) {
      listen(button, 'click', function () { store.set({ lang: button.getAttribute('data-lang') }); });
    });
    els.themeButtons.forEach(function (button) {
      listen(button, 'click', function () { store.set({ theme: button.getAttribute('data-theme-value') }); });
    });
    const action = function (id, extra) {
      if (listenerCount('action') === 0) toast('info', 'app.action.unavailable');
      else emit('action', Object.assign({ id: id }, extra));
    };
    listen(els.exportBtn, 'click', function () { action('export'); });
    if (els.playBtn) listen(els.playBtn, 'click', function () { action('play'); });
    if (els.exportCodeBtn) listen(els.exportCodeBtn, 'click', function () { action('exportCode'); });
    if (els.explainBtn) listen(els.explainBtn, 'click', function () { action('help', { tab: 'generation' }); });
    listen(els.settings, 'click', function () { action('settings'); });
    listen(els.help, 'click', function () { action('help'); });

    listen(els.drawer, 'click', function () {
      setDrawer(!els.controlsRoot.classList.contains('is-open'), true);
    });
    listen(els.backdrop, 'click', function () { setDrawer(false, true); });
    listen(document, 'keydown', function (event) {
      if (event.key !== 'Escape') return;
      if (modals.length > 0) {
        if (typeof root.HTMLDialogElement !== 'function') modals[modals.length - 1].close();
        return;
      }
      if (els.controlsRoot.classList.contains('is-open')) setDrawer(false, true);
    });
  }

  function wireActions() {
    listen(els.generate, 'click', function () { generate(); });
    listen(els.regenerate, 'click', function () { regenerate(); });
    listen(els.cancel, 'click', function () { cancel(); });
    listen(els.form, 'submit', function (event) {
      event.preventDefault();
      generate();
    });
  }

  function onStoreChange(state, keys, meta) {
    applyPrefs(state, keys);
    updateHeading();
    const sameVariant = boardModel !== null && boardModel.variantId === state.variantId;
    if (keys.indexOf('symbolMode') !== -1 && sameVariant && symbolMode !== state.symbolMode) {
      symbolMode = state.symbolMode;
      board.setSymbolMode(symbolMode);
      renderLegend();
    }
    if (keys.indexOf('colorAuxSymbol') !== -1) {
      board.setColorAuxSymbol(state.colorAuxSymbol);
      renderLegend();
    }
    if (keys.indexOf('showSolution') !== -1) {
      syncSolution();
      if (resultView !== null) resultView.refresh();
    }
    if (keys.indexOf('variantId') !== -1 && current !== null && !busy && !(meta && meta.source === 'app')) {
      discardPuzzle();
    } else if (current === null && !busy &&
        (keys.indexOf('variantId') !== -1 || keys.indexOf('variantOptions') !== -1)) {
      showPreview();
    }
    emit('settings', { state: state, keys: keys, meta: meta });
  }

  function onLocaleChange(locale) {
    syncLangButtons(locale);
    updateTitle();
    renderLegend();
    emit('locale', { locale: locale });
  }

  function initOptionalModules() {
    OPTIONAL_MODULES.forEach(function (name) {
      const mod = SG[name];
      if (mod && typeof mod.init === 'function') safely(function () { mod.init(SG.app); });
    });
  }

  function start() {
    if (started) return true;
    if (typeof document === 'undefined') return false;
    els = findElements();
    if (els === null) return false;
    started = true;
    client = SG.workerClient || directClient;
    store = SG.store.instance();
    const state = store.load();
    SG.i18n.setLocale(state.lang);
    addContainers();
    applyPrefs(state, null);

    const seedModel = previewModel(state) ||
      SG.variants.get('classic9').build({}, SG.rng.create(1).fork('model'));
    board = SG.boardView.create(els.board, seedModel, {
      symbolMode: modeForModel(seedModel, state, null), colorAuxSymbol: state.colorAuxSymbol, animate: true
    });
    boardModel = seedModel;
    symbolMode = modeForModel(seedModel, state, null);
    renderLegend();

    stepView = SG.stepView.create(els.stepsRoot, {
      stats: function (position) { return player !== null ? player.rateStep(position) : null; }
    });
    resultView = SG.resultView.create(els.resultRoot, {
      onRetry: function () { regenerate(); },
      showWord: function () { return store.get().showSolution === true; }
    });
    player = SG.player.create({ board: board, onPosition: handlePosition, onStateChange: handlePlayerState });
    player.bindControls(els.playerRoot);
    controls = SG.controls.mount(els.form, store, {
      notify: function (key, args, kind) { toast(kind, key, args); },
      onSubmit: function () { generate(); }
    });

    wireHeader();
    wireTabs();
    wireActions();
    cleanups.push(store.subscribe(onStoreChange));
    cleanups.push(SG.i18n.onChange(onLocaleChange));

    updateButtons();
    updateTitle();
    initOptionalModules();
    // A seed in the address (a refreshed or shared link) is a puzzle to rebuild, not only a form value.
    const url = SG.store.readUrl(root.location ? root.location.search : '');
    const hasSeed = Boolean(url && url.patch && typeof url.patch.seed === 'string' && url.patch.seed !== '');
    if (state.auto || hasSeed) generate();
    return true;
  }

  function destroy() {
    if (!started) return;
    session++;
    if (busy && client) safely(function () { client.cancel(); });
    started = false;
    busy = false;
    current = null;
    live = null;
    modals.slice().forEach(function (m) { m.close(); });
    toasts.slice().forEach(function (entry) {
      root.clearTimeout(entry.timer);
      if (entry.node.parentNode) entry.node.parentNode.removeChild(entry.node);
    });
    toasts.length = 0;
    root.clearTimeout(announceTimer);
    cleanups.splice(0).forEach(function (fn) { safely(fn); });
    [controls, resultView, stepView, player, board].forEach(function (part) {
      if (part && typeof part.destroy === 'function') safely(function () { part.destroy(); });
    });
    controls = resultView = stepView = player = board = null;
    boardModel = null;
    els = null;
    solutionOn = false;
    focusInControls = false;
    symbolMode = 'digits';
  }

  const app = {
    FONT_SIZES: FONT_SIZES,
    MAIN_THREAD_LIMIT_MS: MAIN_THREAD_LIMIT_MS,
    directClient: directClient,
    fontSizeValue: fontSizeValue,
    themeAttribute: themeAttribute,
    getStore: function getStore() { return SG.store.instance(); },
    getBoard: function getBoard() { return board; },
    getPlayer: function getPlayer() { return player; },
    getStepView: function getStepView() { return stepView; },
    getExplainContext: explainContext,
    getResult: function getResult() { return current; },
    getClient: getClient,
    setClient: setClient,
    attachTrace: attachTrace,
    generate: generate,
    regenerate: regenerate,
    showResult: showResult,
    cancel: cancel,
    toast: toast,
    openModal: openModal,
    announce: announce,
    on: on,
    emit: emit,
    start: start,
    destroy: destroy
  };

  SG.app = app;

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'app.heading.seed': 'Seed: {seed}',
      'app.status.cancelled': 'Generation cancelled.',
      'app.status.failed': 'Could not generate the puzzle: {message}',
      'app.announce.ready': 'Puzzle ready: {level}, {clues}.',
      'app.announce.approximate': 'Puzzle ready: {level}, {clues}. It is the closest puzzle found to the ' +
        'requested level.',
      'app.title.result': '{variant} ({level}) \u2014 {app}',
      'app.mode.worker': 'Background thread',
      'app.mode.main': 'Main thread',
      'app.action.unavailable': 'This feature is not available yet.'
    },
    vi: {
      'app.heading.seed': 'Seed: {seed}',
      'app.status.cancelled': 'Đã hủy việc tạo đề.',
      'app.status.failed': 'Không tạo được đề: {message}',
      'app.announce.ready': 'Đề đã sẵn sàng: {level}, {clues}.',
      'app.announce.approximate': 'Đề đã sẵn sàng: {level}, {clues}. Đây là đề gần nhất với mức độ đã chọn.',
      'app.title.result': '{variant} (mức {level}) \u2014 {app}',
      'app.mode.worker': 'Luồng nền',
      'app.mode.main': 'Luồng chính',
      'app.action.unavailable': 'Tính năng này chưa có.'
    }
  });

  // Self start (browser only), after the strings above, which start-up already needs.

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }
})(typeof self !== 'undefined' ? self : globalThis);
