/**
 * Core error types. Errors thrown by the core carry a machine readable `code` (for example
 * 'budget.exceeded') so that the UI can translate them through the i18n layer.
 */
(function (root) {
  'use strict';

  var SG = root.SG = root.SG || {};
  var errors = SG.errors = SG.errors || {};

  // Keep the first class on repeated loads so that older instances still pass `instanceof`.
  if (errors.GenerationError) return;

  /**
   * Error raised by generation, solving and budget code.
   * @property {string} code      Stable dotted identifier, used as i18n key suffix, e.g. 'budget.exceeded'.
   * @property {Object} i18nArgs  Named values for the translated message template.
   */
  class GenerationError extends Error {
    /**
     * @param {string} code Dotted error code, e.g. 'x.y'.
     * @param {Object} [i18nArgs] Arguments for the translated message; defaults to an empty object.
     */
    constructor(code, i18nArgs) {
      super(code);
      this.name = 'GenerationError';
      this.code = code;
      this.i18nArgs = i18nArgs || {};
    }
  }

  errors.GenerationError = GenerationError;
})(typeof self !== 'undefined' ? self : globalThis);
