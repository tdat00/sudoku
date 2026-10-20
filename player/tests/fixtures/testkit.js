/**
 * Test-only toolkit (not part of the player, never loaded by index.html): the few pieces of the generator
 * that the ported solver and technique suites need to make puzzles with a KNOWN UNIQUE SOLUTION, plus the
 * loader of the puzzle documents of tests/fixtures/puzzles/. Exposed as SG.testkit; loaded by
 * tests/node-runner.js (every tests/fixtures/*.js is) and by tests.html.
 *
 *   SG.testkit.rng.create(seed)              seeded stream: next int pick shuffle fork (mulberry32)
 *   SG.testkit.randomSolution(model, rng)    a random complete grid (the DFS solver with a random value order)
 *   SG.testkit.dig(model, solution, rng, { minClues })   -> { givens, clues }: clues removed in random order
 *                                            while the puzzle keeps exactly one solution
 *   SG.testkit.documentNames()               the file names (without .json) of the puzzle fixtures
 *   SG.testkit.exportText(name)              the text of tests/fixtures/exports/<name>.txt (real output of the
 *                                            generator's Export box, made by tests/tools/make-exports.js)
 *   SG.testkit.document(name)                the parsed document, or null when it cannot be read here (a
 *                                            browser on file://; the suites then skip themselves)
 *   SG.testkit.model(id)                     the model of a variant id (classic ids from the classic
 *                                            builder, the others from the `model` block of their fixture,
 *                                            with the lazy propagation extensions switched on)
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};

  var TWO_POW_32 = 4294967296;

  function hashString(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  function mixSeed(seed, tagHash) {
    var h = (seed ^ Math.imul(tagHash, 0x9e3779b1)) | 0;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  }

  function createRng(seed) {
    var seed32 = seed >>> 0;
    var state = seed32 | 0;

    function next() {
      state = (state + 0x6d2b79f5) | 0;
      var t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / TWO_POW_32;
    }

    function shuffle(arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(next() * (i + 1));
        var tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
      return arr;
    }

    return {
      seed: seed32,
      next: next,
      int: function int(n) { return Math.floor(next() * n); },
      pick: function pick(arr) { return arr.length === 0 ? undefined : arr[Math.floor(next() * arr.length)]; },
      shuffle: shuffle,
      fork: function fork(tag) { return createRng(mixSeed(seed32, hashString(String(tag)))); }
    };
  }

  function randomSolution(model, rng) {
    var start = Int32Array.from(model.fixedCells);
    var solution = SG.dfs.solve(model, start, rng);
    if (solution === null) throw new Error('testkit: the model has no solution');
    return solution;
  }

  function dig(model, solution, rng, options) {
    var minClues = options && options.minClues > 0 ? options.minClues : 0;
    var givens = Int32Array.from(solution);
    var order = [];
    for (var c = 0; c < model.cellCount; c++) order.push(c);
    rng.shuffle(order);
    var clues = model.cellCount;
    for (var k = 0; k < order.length && clues > minClues; k++) {
      var cell = order[k];
      if (SG.dfs.stillUnique(model, givens, cell, solution[cell])) {
        givens[cell] = 0;
        clues--;
      }
    }
    return { givens: givens, clues: clues };
  }

  // ---------------------------------------------------------------------------------------------
  // Puzzle documents
  // ---------------------------------------------------------------------------------------------

  var DOCUMENT_NAMES = ['classic4', 'classic6', 'classic9', 'mega12', 'mega16', 'diagonalX', 'hyper', 'jigsaw9',
    'killer', 'greaterThan', 'samurai', 'sohei', 'butterfly', 'flower', 'wordoku', 'classic9.vi', 'killer.vi',
    'wordoku.vi'];
  var VARIANT_IDS = DOCUMENT_NAMES.filter(function (name) { return name.indexOf('.') === -1; });

  var documents = new Map();
  var models = new Map();

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

  function modelOf(id) {
    if (models.has(id)) return models.get(id);
    var model = null;
    var digits = { classic4: 4, classic6: 6, classic9: 9 }[id];
    if (digits !== undefined && SG.classicModel) {
      model = SG.classicModel.build(digits);
    } else {
      var doc = documentOf(id);
      if (doc === null) throw new Error('testkit: no puzzle document for ' + id);
      model = SG.model.create(doc.model);
      if (model.cages.length > 0) SG.comboTable.enablePropagation(model.variantId);
      if (model.inequalities.length > 0) {
        if (!SG.ineq) SG.test.skip('needs ../core/js/engine/tech-ineq.js (the Greater-Than propagation extension)');
        SG.ineq.ensureExtension();
      }
    }
    models.set(id, model);
    return model;
  }

  SG.testkit = {
    rng: { create: createRng },
    randomSolution: randomSolution,
    dig: dig,
    VARIANT_IDS: VARIANT_IDS,
    documentNames: function documentNames() { return DOCUMENT_NAMES.slice(); },
    document: documentOf,
    exportText: exportText,
    model: modelOf
  };
})();
