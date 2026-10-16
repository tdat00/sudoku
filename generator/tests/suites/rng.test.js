(function () {
  'use strict';

  var SG = (typeof self !== 'undefined' ? self : globalThis).SG;
  var rng = SG.rng;

  function draw(r, count) {
    var out = [];
    for (var i = 0; i < count; i++) out.push(r.next());
    return out;
  }

  /** Textbook mulberry32, kept separate from the implementation under test. */
  function referenceMulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  describe('SG.rng.create', function () {
    it('returns the Rng contract', function () {
      var r = rng.create(7);
      expect(r.seed).toBe(7);
      ['next', 'int', 'pick', 'shuffle', 'fork'].forEach(function (name) {
        expect(typeof r[name]).toBe('function');
      });
    });

    it('normalises the seed to an unsigned 32-bit integer', function () {
      expect(rng.create(-1).seed).toBe(4294967295);
      expect(rng.create(4294967296 + 5).seed).toBe(5);
      expect(rng.create(7.9).seed).toBe(7);
      expect(rng.create(0).seed).toBe(0);
    });

    it('rejects seeds that are not finite numbers', function () {
      ['abc', NaN, Infinity, {}].forEach(function (bad) {
        expect(function () { rng.create(bad); }).toThrow({ code: 'rng.invalidSeed' });
      });
    });

    it('draws a random uint32 seed when none is given', function () {
      var seed = rng.create().seed;
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThan(-1);
      expect(seed).toBeLessThan(4294967296);
      var extra = rng.randomSeed();
      expect(Number.isInteger(extra) && extra >= 0 && extra < 4294967296).toBe(true);
    });
  });

  describe('SG.rng determinism', function () {
    it('same seed gives an identical 1000 number sequence', function () {
      expect(draw(rng.create(12345), 1000)).toEqual(draw(rng.create(12345), 1000));
    });

    it('different seeds give different sequences', function () {
      expect(draw(rng.create(1), 20)).not.toEqual(draw(rng.create(2), 20));
    });

    it('matches a reference mulberry32 implementation', function () {
      [0, 1, 42, 0xdeadbeef, 4294967295].forEach(function (seed) {
        var ref = referenceMulberry32(seed);
        var expected = [];
        for (var i = 0; i < 1000; i++) expected.push(ref());
        expect(draw(rng.create(seed), 1000)).toEqual(expected);
      });
    });

    it('produces known values for seed 42 (guards against accidental changes)', function () {
      expect(draw(rng.create(42), 5)).toEqual([
        0.6011037519201636, 0.44829055899754167, 0.8524657934904099, 0.6697340414393693, 0.17481389874592423
      ]);
    });
  });

  describe('SG.rng.next', function () {
    it('stays within [0, 1) and is roughly uniform', function () {
      var values = draw(rng.create(99), 100000);
      var sum = 0;
      var out = 0;
      for (var i = 0; i < values.length; i++) {
        sum += values[i];
        if (!(values[i] >= 0 && values[i] < 1)) out++;
      }
      expect(out).toBe(0);
      expect(sum / values.length).toBeCloseTo(0.5, 2);
    });
  });

  describe('SG.rng.int', function () {
    it('always returns an integer in [0, n) for n = 1..1000', function () {
      var r = rng.create(2024);
      var bad = [];
      for (var n = 1; n <= 1000; n++) {
        for (var k = 0; k < 50; k++) {
          var v = r.int(n);
          if (!Number.isInteger(v) || v < 0 || v >= n) bad.push(n + ':' + v);
        }
      }
      expect(bad).toEqual([]);
    });

    it('returns 0 for n = 1', function () {
      var r = rng.create(5);
      for (var i = 0; i < 100; i++) expect(r.int(1)).toBe(0);
    });

    it('reaches every value of a small range', function () {
      var r = rng.create(8);
      var seen = {};
      for (var i = 0; i < 1000; i++) seen[r.int(6)] = true;
      expect(Object.keys(seen).sort()).toEqual(['0', '1', '2', '3', '4', '5']);
    });

    it('rejects ranges smaller than 1 and NaN', function () {
      var r = rng.create(1);
      [0, -3, NaN, undefined].forEach(function (bad) {
        expect(function () { r.int(bad); }).toThrow({ code: 'rng.invalidRange' });
      });
    });
  });

  describe('SG.rng.pick', function () {
    it('returns elements of the array and eventually all of them', function () {
      var r = rng.create(3);
      var items = ['a', 'b', 'c', 'd'];
      var seen = {};
      for (var i = 0; i < 200; i++) {
        var v = r.pick(items);
        expect(items).toContain(v);
        seen[v] = true;
      }
      expect(Object.keys(seen).length).toBe(4);
    });

    it('returns undefined for an empty array', function () {
      expect(rng.create(3).pick([])).toBeUndefined();
    });

    it('is deterministic for a seed', function () {
      var items = [10, 20, 30, 40, 50];
      var a = rng.create(77);
      var b = rng.create(77);
      for (var i = 0; i < 50; i++) expect(a.pick(items)).toBe(b.pick(items));
    });
  });

  describe('SG.rng.shuffle', function () {
    it('shuffles in place, returns the same array and keeps all elements', function () {
      var arr = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      var out = rng.create(11).shuffle(arr);
      expect(out).toBe(arr);
      expect(arr.slice().sort(function (a, b) { return a - b; })).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('is deterministic for a seed and actually reorders', function () {
      var a = rng.create(31).shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      var b = rng.create(31).shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(a).toEqual(b);
      expect(a).not.toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it('works on typed arrays and trivial inputs', function () {
      var typed = Int32Array.from([5, 6, 7, 8]);
      var out = rng.create(1).shuffle(typed);
      expect(out).toBe(typed);
      expect(Array.from(typed).sort()).toEqual([5, 6, 7, 8]);
      expect(rng.create(1).shuffle([])).toEqual([]);
      expect(rng.create(1).shuffle([42])).toEqual([42]);
    });

    it('is unbiased: 8 elements, 100000 runs, every element at every position within 3%', function () {
      var N = 8;
      var RUNS = 100000;
      var expected = RUNS / N;
      var counts = new Int32Array(N * N);
      var r = rng.create(20240607);
      for (var run = 0; run < RUNS; run++) {
        var arr = [0, 1, 2, 3, 4, 5, 6, 7];
        r.shuffle(arr);
        for (var pos = 0; pos < N; pos++) counts[arr[pos] * N + pos]++;
      }
      var maxDeviation = 0;
      var chiSquare = 0;
      for (var i = 0; i < counts.length; i++) {
        maxDeviation = Math.max(maxDeviation, Math.abs(counts[i] - expected) / expected);
        chiSquare += (counts[i] - expected) * (counts[i] - expected) / expected;
      }
      expect(maxDeviation).toBeLessThan(0.03);
      // Each of the 8 elements contributes a chi-square with 7 degrees of freedom (mean 56 in total).
      // 100 is far beyond that (p < 0.0001), so only real bias can trip it.
      expect(chiSquare).toBeLessThan(100);
    });
  });

  describe('SG.rng.fork', function () {
    it('is a pure function of (seed, tag): same tag gives the same stream', function () {
      var parent = rng.create(500);
      expect(draw(parent.fork('dig'), 100)).toEqual(draw(parent.fork('dig'), 100));
      expect(draw(rng.create(500).fork('dig'), 100)).toEqual(draw(rng.create(500).fork('dig'), 100));
    });

    it("fork('a') and fork('b') give different streams", function () {
      var parent = rng.create(500);
      expect(draw(parent.fork('a'), 20)).not.toEqual(draw(parent.fork('b'), 20));
      expect(draw(parent.fork('a'), 20)).not.toEqual(draw(parent.fork('A'), 20));
      expect(draw(parent.fork(''), 20)).not.toEqual(draw(parent.fork('a'), 20));
    });

    it('does not depend on how much the parent has already consumed', function () {
      var fresh = rng.create(500);
      var used = rng.create(500);
      draw(used, 777);
      expect(draw(used.fork('x'), 50)).toEqual(draw(fresh.fork('x'), 50));
    });

    it('consuming a child does not affect the parent', function () {
      var parent = rng.create(500);
      var child = parent.fork('x');
      draw(child, 5000);
      expect(draw(parent, 100)).toEqual(draw(rng.create(500), 100));
    });

    it('forking does not consume the parent', function () {
      var parent = rng.create(500);
      parent.fork('a');
      parent.fork('b');
      expect(draw(parent, 50)).toEqual(draw(rng.create(500), 50));
    });

    it('children of different parents differ, and a child differs from its parent', function () {
      expect(rng.create(1).fork('x').seed).not.toBe(rng.create(2).fork('x').seed);
      expect(rng.create(1).fork('x').seed).not.toBe(1);
      expect(draw(rng.create(1).fork('x'), 20)).not.toEqual(draw(rng.create(1), 20));
    });

    it('supports nesting', function () {
      var a = rng.create(9).fork('x').fork('y');
      var b = rng.create(9).fork('x').fork('y');
      expect(draw(a, 30)).toEqual(draw(b, 30));
      expect(draw(rng.create(9).fork('x').fork('y'), 30)).not.toEqual(draw(rng.create(9).fork('y'), 30));
    });

    it('gives distinct child seeds for 1000 different tags', function () {
      var parent = rng.create(2025);
      var seeds = {};
      var distinct = 0;
      for (var i = 0; i < 1000; i++) {
        var s = parent.fork('tag' + i).seed;
        if (!seeds[s]) { seeds[s] = true; distinct++; }
      }
      expect(distinct).toBe(1000);
    });
  });
})();
