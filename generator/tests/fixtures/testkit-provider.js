/**
 * Lets the shared suites of core/tests build every board of the generator: the non-classic models come from the
 * variant registry. Extends the SG.testkit of ../core/tests/fixtures/testkit.js (see there for the provider contract).
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};

  SG.testkit = Object.assign(SG.testkit || {}, {
    provider: {
      has: function has(id) { return SG.variants.has(id); },
      build: function build(id) { return SG.variants.get(id).build({}, null); }
    }
  });
})();
