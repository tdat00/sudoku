/**
 * Themes and the look of the page: `SG.theme`.
 *   - index.html runs a tiny inline script before the stylesheets paint: it reads the stored preferences
 *     (`sg.player.prefs.v1`, the key of js/ui/store.js) and sets `data-theme`, `data-motion` and the font size, so
 *     the first paint already has the right look (no flash). Nothing but that script runs without this file.
 *   - this module applies the preferences whenever the store changes: `data-theme` (removed for 'auto', so
 *     `prefers-color-scheme` rules), `data-motion`, `--sg-font-size-base`, the `aria-pressed` of the header theme
 *     buttons (which it also wires to the store), `<meta name="theme-color">`, a colours-only transition on a
 *     theme change (class `is-theming`, never under reduced motion), and the operating-system colour scheme
 *     while the preference is 'auto'.
 * Pure part (runs in Node, see tests/suites/theme.test.js): `resolveTheme`, `attributeFor`, `nextTheme`,
 * `fontSizeValue`. `init(app)` is idempotent; `cycle()` goes auto -> light -> dark -> high-contrast -> auto.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.theme && typeof SG.theme.init === 'function') return;

  const THEMES = Object.freeze(['auto', 'light', 'dark', 'high-contrast']);

  /** The font-size setting as the value of `--sg-font-size-base` (also written by the inline script). */
  const FONT_SIZES = Object.freeze({ small: '87.5%', normal: '100%', large: '125%' });

  const TRANSITION_MS = 400;

  function resolveTheme(pref, prefersDark) {
    if (pref === 'light' || pref === 'dark' || pref === 'high-contrast') return pref;
    return prefersDark === true ? 'dark' : 'light';
  }

  function attributeFor(pref) {
    return pref === 'light' || pref === 'dark' || pref === 'high-contrast' ? pref : null;
  }

  function nextTheme(pref) {
    const at = THEMES.indexOf(pref);
    return THEMES[(at + 1) % THEMES.length];
  }

  function fontSizeValue(size) {
    return Object.prototype.hasOwnProperty.call(FONT_SIZES, size) ? FONT_SIZES[size] : FONT_SIZES.normal;
  }

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

  function get() {
    const state = storeState();
    return state ? state.theme : 'auto';
  }

  function set(theme) {
    if (!ctx.app || THEMES.indexOf(theme) === -1) return get();
    ctx.app.getStore().set({ theme: theme }, { source: 'theme' });
    return get();
  }

  function cycle() {
    return set(nextTheme(get()));
  }

  function onSettings(payload) {
    if (payload && payload.state) apply(payload.state);
  }

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

  function wireButtons() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-theme-value]'), function (button) {
      const onClick = function () { set(button.getAttribute('data-theme-value')); };
      button.addEventListener('click', onClick);
      ctx.clicks.push(function () { button.removeEventListener('click', onClick); });
    });
  }

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
