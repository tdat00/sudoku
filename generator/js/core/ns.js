/**
 * Core namespace: creates the global `SG` and its constants. Idempotent (never replaces an existing member)
 * and relies only on the `root` passed to the IIFE, so it runs in a page, a Worker and Node (vm).
 * The core never reads the URL or environment; host settings such as the debug flag come in via `SG.setDebug`.
 */
(function (root) {
  'use strict';

  var SG = root.SG = root.SG || {};

  function define(name, value) {
    if (SG[name] === undefined) SG[name] = value;
  }

  define('VERSION', '0.1.0');

  // Largest supported digit count D (candidate masks must fit in 16 bits).
  define('MAX_DIGITS', 16);

  define('DEBUG', false);

  define('setDebug', function setDebug(flag) {
    SG.DEBUG = !!flag;
    return SG.DEBUG;
  });
})(typeof self !== 'undefined' ? self : globalThis);
