/**
 * Test-only loader of the puzzle documents of tests/fixtures/puzzles/ and of the text exports of
 * tests/fixtures/exports/ (never loaded by index.html). It extends the SG.testkit of
 * ../core/tests/fixtures/testkit.js:
 *
 *   SG.testkit.documentNames()               the file names (without .json) of the puzzle fixtures
 *   SG.testkit.exportText(name)              the text of tests/fixtures/exports/<name>.txt (real output of the
 *                                            generator's Export box, made by tests/tools/make-exports.js)
 *   SG.testkit.document(name)                the parsed document, or null when it cannot be read here (a
 *                                            browser on file://; the suites then skip themselves)
 *   SG.testkit.VARIANT_IDS                   the variant ids that have a document
 *
 * It is also the provider that lets the shared suites build the non-classic boards: the `model` block of the
 * fixture, with the lazy propagation extensions switched on.
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};

  // ---------------------------------------------------------------------------------------------
  // Puzzle documents
  // ---------------------------------------------------------------------------------------------

  var DOCUMENT_NAMES = ['classic4', 'classic6', 'classic9', 'mega12', 'mega16', 'diagonalX', 'hyper', 'jigsaw9',
    'killer', 'greaterThan', 'samurai', 'sohei', 'butterfly', 'flower', 'wordoku', 'classic9.vi', 'killer.vi',
    'wordoku.vi'];
  var VARIANT_IDS = DOCUMENT_NAMES.filter(function (name) { return name.indexOf('.') === -1; });

  var documents = new Map();

  function readDocument(name) {
    var env = SG.test && SG.test.node;
    var rel = 'tests/fixtures/puzzles/' + name + '.json';
    try {
      if (env) return JSON.parse(env.fs.readFileSync(env.path.join(env.root, rel), 'utf8'));
      if (typeof XMLHttpRequest !== 'undefined') {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', rel, false);
        xhr.send(null);
        if (xhr.status === 200 || (xhr.status === 0 && xhr.responseText)) return JSON.parse(xhr.responseText);
      }
    } catch (err) {
      return null;
    }
    return null;
  }

  function documentOf(name) {
    if (!documents.has(name)) documents.set(name, readDocument(name));
    var doc = documents.get(name);
    return doc === null ? null : JSON.parse(JSON.stringify(doc));
  }

  /** The text of tests/fixtures/exports/<name>.txt: real output of Sudoku Generator's "Export" box; null if unreadable. */
  function exportText(name) {
    var env = SG.test && SG.test.node;
    var rel = 'tests/fixtures/exports/' + name + '.txt';
    try {
      if (env) return env.fs.readFileSync(env.path.join(env.root, rel), 'utf8');
      if (typeof XMLHttpRequest !== 'undefined') {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', rel, false);
        xhr.send(null);
        if (xhr.status === 200 || (xhr.status === 0 && xhr.responseText)) return xhr.responseText;
      }
    } catch (err) {
      return null;
    }
    return null;
  }

  function buildModel(id) {
    var doc = documentOf(id);
    if (doc === null) throw new Error('testkit: no puzzle document for ' + id);
    var model = SG.model.create(doc.model);
    if (model.cages.length > 0) SG.comboTable.enablePropagation(model.variantId);
    if (model.inequalities.length > 0) {
      if (!SG.ineq) SG.test.skip('needs ../core/js/engine/tech-ineq.js (the Greater-Than propagation extension)');
      SG.ineq.ensureExtension();
    }
    return model;
  }

  SG.testkit = Object.assign(SG.testkit || {}, {
    VARIANT_IDS: VARIANT_IDS,
    documentNames: function documentNames() { return DOCUMENT_NAMES.slice(); },
    document: documentOf,
    exportText: exportText,
    provider: {
      has: function has(id) { return VARIANT_IDS.indexOf(id) !== -1 && documentOf(id) !== null; },
      build: buildModel
    }
  });
})();
