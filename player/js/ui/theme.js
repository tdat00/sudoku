/**
 * Themes and the look of the page (design.md 8.5): `SG.theme`.
 *
 * WHO APPLIES WHAT (single source of truth)
 *   - index.html runs a tiny inline script before the stylesheets paint: it reads the stored preferences
 *     (`sg.player.prefs.v1`, the key of js/ui/store.js) and sets `data-theme`, `data-motion` and the font
 *     size, so the first paint already has the right look (no flash). Nothing but that script runs without
 *     this file.
 *   - this module applies the preferences to the document whenever the store changes: `data-theme` (removed
 *     for 'auto', so `prefers-color-scheme` rules), `data-motion`, `--sg-font-size-base`, the `aria-pressed`
 *     of the header theme buttons (which it also wires to the store), the `<meta name="theme-color">` of
 *     the effective theme, a smooth colour transition on a theme change (class `is-theming`, colours only,
 *     never under reduced motion), and the tracking of the operating-system colour scheme while the
 *     preference is 'auto'.
 *
 * Pure part (runs in Node, see tests/suites/theme.test.js): `resolveTheme`, `attributeFor`, `nextTheme`,
 * `fontSizeValue`.
 *
 * PUBLIC API (`SG.theme`)
 *   init(app)         idempotent; called by app.js at start-up. Returns true when it is running.
 *   destroy()         removes listeners and the attributes added by `init`.
 *   get()             the theme preference: 'auto' | 'light' | 'dark' | 'high-contrast'.
 *   set(theme)        stores a preference; returns it.
 *   cycle()           the next preference (auto -> light -> dark -> high-contrast -> auto); returns it.
 *   apply(state)      brings the document in line with a store state; returns the effective theme.
 *   effective()       the theme in use right now (resolves 'auto' with the operating-system scheme).
 *   Pure helpers listed above, plus `THEMES` and `FONT_SIZES`.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first instance on repeated loads: the running page must survive.
  if (SG.theme && typeof SG.theme.init === 'function') return;

  const THEMES = Object.freeze(['auto', 'light', 'dark', 'high-contrast']);

  /** The font-size setting as the value of `--sg-font-size-base` (also written by the inline script). */
  const FONT_SIZES = Object.freeze({ small: '87.5%', normal: '100%', large: '125%' });

  const TRANSITION_MS = 400;

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

  // ---------------------------------------------------------------------------------------------
  // DOM
  // ---------------------------------------------------------------------------------------------

  const ctx = {
    app: null,
    off: [],
    colorQuery: null,
    onColorChange: null,
    transitionTimer: null,
    clicks: []
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
   * Brings the document in line with a store state; writes only what differs.
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
   * Chooses a theme (stored in the preferences; the store change applies it).
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

  function onSettings(payload) {
    if (payload && payload.state) apply(payload.state);
  }

  /** Removes everything `init` added. */
  function destroy() {
    ctx.off.splice(0).forEach(function (off) { off(); });
    ctx.clicks.splice(0).forEach(function (off) { off(); });
    if (ctx.colorQuery !== null && ctx.onColorChange !== null &&
        typeof ctx.colorQuery.removeEventListener === 'function') {
      ctx.colorQuery.removeEventListener('change', ctx.onColorChange);
    }
    if (typeof document !== 'undefined') document.documentElement.classList.remove('is-theming');
    root.clearTimeout(ctx.transitionTimer);
    ctx.app = null;
    ctx.colorQuery = null;
    ctx.onColorChange = null;
  }

  /** The header buttons `[data-theme-value]` choose a theme. */
  function wireButtons() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-theme-value]'), function (button) {
      const onClick = function () { set(button.getAttribute('data-theme-value')); };
      button.addEventListener('click', onClick);
      ctx.clicks.push(function () { button.removeEventListener('click', onClick); });
    });
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
    ctx.off.push(app.on('settings', onSettings));
    wireButtons();
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
    resolveTheme: resolveTheme,
    attributeFor: attributeFor,
    nextTheme: nextTheme,
    fontSizeValue: fontSizeValue,
    init: init,
    destroy: destroy,
    get: get,
    set: set,
    cycle: cycle,
    apply: apply,
    effective: effective
  };
})(typeof self !== 'undefined' ? self : globalThis);
