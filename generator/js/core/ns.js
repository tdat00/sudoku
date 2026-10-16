/**
 * Core namespace: creates the single global object `SG` and its constants.
 *
 * This file is idempotent: loading it again (or after other modules) never replaces a member that
 * already exists on `SG`. It must run unchanged in a page, in a Web Worker (importScripts) and in Node
 * (vm.runInThisContext), so it only relies on the `root` object passed to the IIFE.
 *
 * The core layer never reads the URL or the environment. Anything that depends on the host (for
 * instance the debug flag) is handed in from outside, see `SG.setDebug`.
 */
(function (root) {
  'use strict';

  var SG = root.SG = root.SG || {};

  /** Defines `SG[name]` only when it is still missing, which keeps repeated loads harmless. */
  function define(name, value) {
    if (SG[name] === undefined) SG[name] = value;
  }

  /** @type {string} Semantic version of the code base. */
  define('VERSION', '0.1.0');

  /** @type {number} Largest supported digit count D (candidate masks must fit in 16 bits). */
  define('MAX_DIGITS', 16);

  /** @type {boolean} Debug flag. Read it for optional diagnostics; change it only via `setDebug`. */
  define('DEBUG', false);

  /**
   * Turns debug mode on or off. The UI layer calls this after it has parsed `?debug=1`.
   * @param {*} flag Truthy enables debug mode.
   * @returns {boolean} The new value of `SG.DEBUG`.
   */
  define('setDebug', function setDebug(flag) {
    SG.DEBUG = !!flag;
    return SG.DEBUG;
  });
})(typeof self !== 'undefined' ? self : globalThis);
