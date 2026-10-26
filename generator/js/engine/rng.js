/**
 * Seeded RNG (mulberry32): same seed => same sequence on every platform. `fork(tag)` derives an independent
 * stream from (seed, tag) only, so a stage can change how many numbers it draws without disturbing other
 * stages.
 */
(function (root) {
  'use strict';

  var SG = root.SG = root.SG || {};

  var TWO_POW_32 = 4294967296;

  // Rng: seed (normalised uint32), next() in [0, 1), int(n) in [0, n), pick(arr), shuffle(arr) (in place),
  // fork(tag).

  function hashString(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  // Murmur3 finaliser; for a fixed seed, tag hash -> child seed is a bijection, so tags never collide.
  function mixSeed(seed, tagHash) {
    var h = (seed ^ Math.imul(tagHash, 0x9e3779b1)) | 0;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  }

  function randomSeed() {
    return (Date.now() ^ (Math.random() * TWO_POW_32)) >>> 0;
  }

  function normalizeSeed(seed) {
    if (seed === undefined || seed === null) return randomSeed();
    if (typeof seed !== 'number' || !isFinite(seed)) {
      throw new SG.errors.GenerationError('rng.invalidSeed', { seed: String(seed) });
    }
    return seed >>> 0;
  }

  function create(seed) {
    var seed32 = normalizeSeed(seed);
    var state = seed32 | 0;

    function next() {
      state = (state + 0x6d2b79f5) | 0;
      var t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / TWO_POW_32;
    }

    function int(n) {
      if (!(n >= 1)) {
        throw new SG.errors.GenerationError('rng.invalidRange', { n: String(n) });
      }
      return Math.floor(next() * n);
    }

    function pick(arr) {
      return arr.length === 0 ? undefined : arr[Math.floor(next() * arr.length)];
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

    function fork(tag) {
      return create(mixSeed(seed32, hashString(String(tag))));
    }

    return { seed: seed32, next: next, int: int, pick: pick, shuffle: shuffle, fork: fork };
  }

  SG.rng = { create: create, randomSeed: randomSeed };
})(typeof self !== 'undefined' ? self : globalThis);
