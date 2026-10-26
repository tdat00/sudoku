/**
 * Test-only toolkit shared by the suites of core/tests (never loaded by a page): what the engine suites need
 * to make boards and puzzles with a KNOWN UNIQUE SOLUTION without depending on the generator. Exposed as
 * SG.testkit; loaded by the node runners (every fixtures/*.js is) and by tests.html.
 *
 *   SG.testkit.rng.create(seed)              seeded stream: next int pick shuffle fork (mulberry32, the same
 *                                            stream as the generator's SG.rng)
 *   SG.testkit.randomSolution(model, rng)    a random complete grid (the DFS solver with a random value
 *                                            order)
 *   SG.testkit.dig(model, solution, rng, { minClues })   -> { givens, clues }: clues removed in random order
 *                                            while the puzzle keeps exactly one solution
 *   SG.testkit.model(id)                     the model of a variant id, built once: the classic ids come from
 *                                            SG.classicModel, any other id from the provider of the project
 *   SG.testkit.hasVariant(id)                true when model(id) can be built here
 *
 * A project that runs these suites registers where its other boards come from:
 *   SG.testkit.provider = { has(id) -> boolean, build(id) -> PuzzleModel }
 * (the generator builds them from its variant registry, the player from its puzzle fixtures).
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};

  var TWO_POW_32 = 4294967296;
  var CLASSIC_DIGITS = { classic4: 4, classic6: 6, classic9: 9 };

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

  var models = new Map();

  function hasVariant(id) {
    if (Object.prototype.hasOwnProperty.call(CLASSIC_DIGITS, id)) return true;
    var provider = SG.testkit.provider;
    return !!provider && provider.has(id) === true;
  }

  function modelOf(id) {
    if (models.has(id)) return models.get(id);
    var model;
    if (Object.prototype.hasOwnProperty.call(CLASSIC_DIGITS, id)) {
      model = SG.classicModel.build(CLASSIC_DIGITS[id]);
    } else {
      if (!hasVariant(id)) throw new Error('testkit: no way to build the model of ' + id);
      model = SG.testkit.provider.build(id);
    }
    models.set(id, model);
    return model;
  }

  SG.testkit = Object.assign(SG.testkit || {}, {
    rng: { create: createRng },
    randomSolution: randomSolution,
    dig: dig,
    hasVariant: hasVariant,
    model: modelOf
  });
})();
