/**
 * Themes and visual polish (task T-7.4, design.md 10.3 and 10.8): `SG.theme`.
 *
 * WHO APPLIES WHAT (single source of truth)
 *   - index.html runs a tiny inline script before the stylesheets paint: it reads the stored preferences
 *     (`sg.prefs.v1`, the key of js/ui/store.js) and sets `data-theme`, `data-motion` and the font size, so
 *     the first paint already has the right look (no flash). Nothing but that script runs without this file.
 *   - js/ui/app.js (`applyPrefs`) applies the store to the document whenever it changes: `data-theme`
 *     (removed for 'auto', so `prefers-color-scheme` rules), `--sg-font-size-base`, `data-motion`, the
 *     `aria-pressed` of the header buttons. It must work without this module and keeps doing so.
 *   - this module adds what app.js does not: the `<meta name="theme-color">` of the effective theme, the
 *     smooth colour transition of a theme change (class `is-theming`, colours only, never under reduced
 *     motion), the tracking of the operating-system colour scheme while the preference is 'auto', the run
 *     state `data-run` on `#app-layout` with the empty / busy / error hints of the panels, and the
 *     programmatic API below. `apply(state)` is idempotent and writes only what differs, so it can run
 *     after app.js without any visible effect (a drift guard in tests/suites/theme.test.js keeps the font
 *     size table of both files equal).
 *
 * Pure part (runs in Node, see tests/suites/theme.test.js): `resolveTheme`, `attributeFor`, `nextTheme`,
 * `fontSizeValue`, `nextRunState`, `hintKey`.
 *
 * PUBLIC API (`SG.theme`)
 *   init(app)         idempotent; called by app.js at start-up. Returns true when it is running.
 *   destroy()         removes listeners, hints and attributes added by `init`.
 *   get()             the theme preference: 'auto' | 'light' | 'dark' | 'high-contrast'.
 *   set(theme)        stores a preference (the store notifies app.js, which applies it); returns it.
 *   cycle()           the next preference (auto -> light -> dark -> high-contrast -> auto); returns it.
 *   apply(state)      brings the document in line with a store state (theme, motion, font size, header
 *                     buttons, theme-color); returns the effective theme ('light' | 'dark' |
 *                     'high-contrast').
 *   effective()       the theme in use right now (resolves 'auto' with the operating-system scheme).
 *   Pure helpers listed above, plus `THEMES` and `FONT_SIZES`.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first instance on repeated loads: the running page must survive.
  if (SG.theme && typeof SG.theme.init === 'function') return;

  const THEMES = Object.freeze(['auto', 'light', 'dark', 'high-contrast']);

  /** The font-size setting as the value of `--sg-font-size-base` (equal to the table of app.js). */
  const FONT_SIZES = Object.freeze({ small: '87.5%', normal: '100%', large: '125%' });

  /** Run states of the page, set on `#app-layout` as `data-run`. */
  const RUN_STATES = Object.freeze(['idle', 'busy', 'ready', 'error', 'cancelled']);
  const RUN_EVENTS = Object.freeze({
    'generate:start': 'busy',
    result: 'ready',
    'generate:error': 'error',
    'generate:cancel': 'cancelled'
  });

  /** Translation key of the hint a panel shows in a run state (`result` panel: no puzzle on screen). */
  const HINT_KEYS = Object.freeze({
    result: Object.freeze({
      idle: 'theme.empty.result',
      busy: 'theme.busy.result',
      error: 'theme.error.result',
      cancelled: 'theme.cancelled.result'
    }),
    steps: Object.freeze({ idle: 'theme.empty.steps' })
  });

  const TRANSITION_MS = 400;

  function t(key, args) {
    return SG.i18n.t(key, args);
  }

  // ---------------------------------------------------------------------------------------------
  // Pure helpers
  // ---------------------------------------------------------------------------------------------

  /**
   * The theme that is on screen for a preference.
   * @param {string} pref  'auto' | 'light' | 'dark' | 'high-contrast' (anything else counts as 'auto').
   * @param {boolean} [prefersDark]  The operating-system colour scheme, used only for 'auto'.
   * @returns {string} 'light' | 'dark' | 'high-contrast'.
   */
  function resolveTheme(pref, prefersDark) {
    if (pref === 'light' || pref === 'dark' || pref === 'high-contrast') return pref;
    return prefersDark === true ? 'dark' : 'light';
  }

  /**
   * The `data-theme` attribute of a preference.
   * @param {string} pref
   * @returns {?string} The attribute value; null for 'auto' (no attribute: `prefers-color-scheme` rules).
   */
  function attributeFor(pref) {
    return pref === 'light' || pref === 'dark' || pref === 'high-contrast' ? pref : null;
  }

  /**
   * The preference after `pref` in the order of `THEMES`.
   * @param {string} pref
   * @returns {string}
   */
  function nextTheme(pref) {
    const at = THEMES.indexOf(pref);
    return THEMES[(at + 1) % THEMES.length];
  }

  /**
   * The font-size setting as a value for `--sg-font-size-base`.
   * @param {string} size  'small' | 'normal' | 'large'.
   * @returns {string} '87.5%' | '100%' | '125%'; the normal size for anything else.
   */
  function fontSizeValue(size) {
    return Object.prototype.hasOwnProperty.call(FONT_SIZES, size) ? FONT_SIZES[size] : FONT_SIZES.normal;
  }

  /**
   * The run state after an app event.
   * @param {string} state  One of `RUN_STATES`.
   * @param {string} eventName  An event of `SG.app`.
   * @returns {string}
   */
  function nextRunState(state, eventName) {
    return Object.prototype.hasOwnProperty.call(RUN_EVENTS, eventName) ? RUN_EVENTS[eventName] : state;
  }

  /**
   * The translation key of the hint of a panel in a run state.
   * @param {string} panel  'result' | 'steps'.
   * @param {string} state  One of `RUN_STATES`.
   * @returns {?string} null when the panel shows no hint in that state.
   */
  function hintKey(panel, state) {
    const table = HINT_KEYS[panel];
    return table && Object.prototype.hasOwnProperty.call(table, state) ? table[state] : null;
  }

  // ---------------------------------------------------------------------------------------------
  // DOM
  // ---------------------------------------------------------------------------------------------

  const ctx = {
    app: null,
    off: [],
    run: 'idle',
    colorQuery: null,
    onColorChange: null,
    transitionTimer: null,
    hints: []
  };

  function matches(query) {
    return typeof root.matchMedia === 'function' && root.matchMedia(query).matches;
  }

  function prefersDark() {
    return matches('(prefers-color-scheme: dark)');
  }

  function motionAllowed() {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute('data-motion') !== 'off' &&
      !matches('(prefers-reduced-motion: reduce)');
  }

  function storeState() {
    return ctx.app ? ctx.app.getStore().get() : null;
  }

  /**
   * The theme in use right now.
   * @returns {string} 'light' | 'dark' | 'high-contrast'.
   */
  function effective() {
    const state = storeState();
    return resolveTheme(state ? state.theme : 'auto', prefersDark());
  }

  /** Lets the colours of the whole page fade for a moment (class `is-theming`, see css/base.css). */
  function markTransition() {
    if (!motionAllowed()) return;
    const html = document.documentElement;
    html.classList.add('is-theming');
    root.clearTimeout(ctx.transitionTimer);
    ctx.transitionTimer = root.setTimeout(function () {
      html.classList.remove('is-theming');
      ctx.transitionTimer = null;
    }, TRANSITION_MS);
  }

  /** `<meta name="theme-color">` follows the surface colour of the header. */
  function updateThemeColor() {
    const head = document.head;
    if (!head || typeof root.getComputedStyle !== 'function') return;
    const style = root.getComputedStyle(document.documentElement);
    const value = style.getPropertyValue('--sg-color-surface').trim();
    if (value === '') return;
    let meta = head.querySelector('meta[name="theme-color"]');
    if (meta === null) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      head.appendChild(meta);
    }
    if (meta.getAttribute('content') !== value) meta.setAttribute('content', value);
  }

  function setIfDifferent(el, name, value) {
    if (value === null) {
      if (el.hasAttribute(name)) el.removeAttribute(name);
    } else if (el.getAttribute(name) !== value) {
      el.setAttribute(name, value);
    }
  }

  /**
   * Brings the document in line with a store state; writes only what differs (app.js has normally done
   * it already). See the file header for the split.
   * @param {Object} [state]  A store state (`theme`, `fontSize`, `reducedMotion`); default: the store's.
   * @returns {?string} The effective theme; null without a DOM or a state.
   */
  function apply(state) {
    if (typeof document === 'undefined') return null;
    const s = state || storeState();
    if (!s) return null;
    const html = document.documentElement;
    const attr = attributeFor(s.theme);
    if ((html.getAttribute('data-theme') || null) !== attr) {
      markTransition();
      setIfDifferent(html, 'data-theme', attr);
    }
    setIfDifferent(html, 'data-motion', s.reducedMotion ? 'off' : null);
    const size = fontSizeValue(s.fontSize);
    if (html.style.getPropertyValue('--sg-font-size-base') !== size) {
      html.style.setProperty('--sg-font-size-base', size);
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-theme-value]'), function (button) {
      const pressed = button.getAttribute('data-theme-value') === s.theme;
      setIfDifferent(button, 'aria-pressed', pressed ? 'true' : 'false');
    });
    updateThemeColor();
    return resolveTheme(s.theme, prefersDark());
  }

  /**
   * The current theme preference.
   * @returns {string} 'auto' | 'light' | 'dark' | 'high-contrast'.
   */
  function get() {
    const state = storeState();
    return state ? state.theme : 'auto';
  }

  /**
   * Chooses a theme (stored in the preferences; app.js applies it).
   * @param {string} theme  One of `THEMES`; anything else is ignored.
   * @returns {string} The preference after the call.
   */
  function set(theme) {
    if (!ctx.app || THEMES.indexOf(theme) === -1) return get();
    ctx.app.getStore().set({ theme: theme }, { source: 'theme' });
    return get();
  }

  /**
   * Moves to the next theme preference.
   * @returns {string} The new preference.
   */
  function cycle() {
    return set(nextTheme(get()));
  }

  // ---------------------------------------------------------------------------------------------
  // Run state and hints
  // ---------------------------------------------------------------------------------------------

  function hintParagraph(id, panel, states) {
    const p = document.createElement('p');
    p.id = id;
    p.className = 'empty-hint';
    p.setAttribute('data-hint', panel);
    states.forEach(function (state) {
      const span = document.createElement('span');
      span.setAttribute('data-state', state);
      span.setAttribute('data-i18n', hintKey(panel, state));
      p.appendChild(span);
    });
    return p;
  }

  function addHints() {
    const result = document.getElementById('result-root');
    if (result !== null && document.getElementById('result-hint') === null) {
      const p = hintParagraph('result-hint', 'result', Object.keys(HINT_KEYS.result));
      result.parentNode.insertBefore(p, result.nextSibling);
      ctx.hints.push(p);
    }
    const steps = document.getElementById('steps-list');
    if (steps !== null && document.getElementById('steps-hint') === null) {
      const p = hintParagraph('steps-hint', 'steps', Object.keys(HINT_KEYS.steps));
      steps.parentNode.insertBefore(p, steps);
      ctx.hints.push(p);
    }
    ctx.hints.forEach(function (p) { SG.i18n.applyTo(p); });
  }

  function setRun(state) {
    ctx.run = state;
    const layout = document.getElementById('app-layout');
    if (layout !== null) layout.setAttribute('data-run', state);
  }

  function onRunEvent(name) {
    return function () { setRun(nextRunState(ctx.run, name)); };
  }

  function onTheme() {
    markTransition();
    apply();
  }

  function onSettings(payload) {
    if (payload && payload.keys && payload.keys.some(function (key) {
      return key === 'fontSize' || key === 'reducedMotion';
    })) apply(payload.state);
  }

  /** Removes everything `init` added. */
  function destroy() {
    ctx.off.splice(0).forEach(function (off) { off(); });
    if (ctx.colorQuery !== null && ctx.onColorChange !== null) {
      if (typeof ctx.colorQuery.removeEventListener === 'function') {
        ctx.colorQuery.removeEventListener('change', ctx.onColorChange);
      }
    }
    ctx.hints.splice(0).forEach(function (p) {
      if (p.parentNode) p.parentNode.removeChild(p);
    });
    if (typeof document !== 'undefined') {
      const layout = document.getElementById('app-layout');
      if (layout !== null) layout.removeAttribute('data-run');
      document.documentElement.classList.remove('is-theming');
    }
    root.clearTimeout(ctx.transitionTimer);
    ctx.app = null;
    ctx.colorQuery = null;
    ctx.onColorChange = null;
    ctx.run = 'idle';
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
    addHints();
    setRun(app.getResult() !== null ? 'ready' : 'idle');
    ['generate:start', 'result', 'generate:error', 'generate:cancel'].forEach(function (name) {
      ctx.off.push(app.on(name, onRunEvent(name)));
    });
    ctx.off.push(app.on('theme', onTheme));
    ctx.off.push(app.on('settings', onSettings));
    if (typeof root.matchMedia === 'function') {
      ctx.colorQuery = root.matchMedia('(prefers-color-scheme: dark)');
      ctx.onColorChange = function () {
        if (get() === 'auto') {
          markTransition();
          updateThemeColor();
        }
      };
      if (typeof ctx.colorQuery.addEventListener === 'function') {
        ctx.colorQuery.addEventListener('change', ctx.onColorChange);
      }
    }
    apply();
    return true;
  }

  SG.theme = {
    THEMES: THEMES,
    FONT_SIZES: FONT_SIZES,
    RUN_STATES: RUN_STATES,
    resolveTheme: resolveTheme,
    attributeFor: attributeFor,
    nextTheme: nextTheme,
    fontSizeValue: fontSizeValue,
    nextRunState: nextRunState,
    hintKey: hintKey,
    init: init,
    destroy: destroy,
    get: get,
    set: set,
    cycle: cycle,
    apply: apply,
    effective: effective
  };

  // ---------------------------------------------------------------------------------------------
  // Strings
  // ---------------------------------------------------------------------------------------------

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'theme.empty.result': 'Your puzzle summary appears here after you generate a puzzle: difficulty, ' +
        'clues, techniques and a link to share.',
      'theme.busy.result': 'Generating the puzzle\u2026',
      'theme.error.result': 'The last run failed, so there is no puzzle to summarise. Change the options ' +
        'and try again.',
      'theme.cancelled.result': 'Generation was cancelled. Press Generate to start again.',
      'theme.empty.steps': 'Once a puzzle is made, the steps that built it are listed here: the full ' +
        'solution, then the cells dug out of it. Pick one to see it on the board.'
    },
    vi: {
      'theme.empty.result': 'Bản tóm tắt đề sẽ hiện ở đây sau khi bạn tạo đề: độ khó, số ô cho sẵn, các kỹ ' +
        'thuật dùng và liên kết để chia sẻ.',
      'theme.busy.result': 'Đang tạo đề\u2026',
      'theme.error.result': 'Lần tạo vừa rồi bị lỗi nên chưa có đề để tóm tắt. Hãy đổi tùy chọn rồi thử lại.',
      'theme.cancelled.result': 'Đã hủy việc tạo đề. Bấm Tạo đề để bắt đầu lại.',
      'theme.empty.steps': 'Khi đề được tạo xong, các bước dựng nên nó sẽ hiện ở đây: lời giải đầy đủ, rồi ' +
        'các ô lần lượt bị xóa. Chọn một bước để xem trên bảng.'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
