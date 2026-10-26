/**
 * Core error types: errors carry a machine readable `code` (e.g. 'budget.exceeded') that the UI translates
 * via i18n.
 */
(function (root) {
  'use strict';

  var SG = root.SG = root.SG || {};
  var errors = SG.errors = SG.errors || {};

  // Keep the first class on repeated loads so that older instances still pass `instanceof`.
  if (errors.GenerationError) return;

  /** `code` is a stable dotted id used as i18n key suffix; `i18nArgs` fills the message template. */
  class GenerationError extends Error {
    constructor(code, i18nArgs) {
      super(code);
      this.name = 'GenerationError';
      this.code = code;
      this.i18nArgs = i18nArgs || {};
    }
  }

  errors.GenerationError = GenerationError;
})(typeof self !== 'undefined' ? self : globalThis);
