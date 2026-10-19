/**
 * Core namespace: creates the global `SG`. Idempotent (never replaces an existing member) and must run
 * unchanged in a page, a Web Worker and Node, so it relies only on the `root` passed to the IIFE.
 * The core never reads the URL or environment; host-dependent state such as the debug flag comes via `SG.setDebug`.
 */
(function (root) {
  'use strict';

  var SG = root.SG = root.SG || {};

  function define(name, value) {
    if (SG[name] === undefined) SG[name] = value;
  }

  define('VERSION', '1.0.0');

  /** Largest supported digit count D (candidate masks must fit in 16 bits). */
  define('MAX_DIGITS', 16);

  define('DEBUG', false);

  /** Called by the UI after it has parsed `?debug=1`. */
  define('setDebug', function setDebug(flag) {
    SG.DEBUG = !!flag;
    return SG.DEBUG;
  });
})(typeof self !== 'undefined' ? self : globalThis);
