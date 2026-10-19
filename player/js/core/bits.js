/** Bit-mask helpers: digit v (1-based) is bit (v - 1), so masks fit in the low 16 bits of an int32. */
(function (root) {
  'use strict';

  var SG = root.SG = root.SG || {};

  // Hamming weight, branch free, valid for any 32-bit pattern.
  function popcount(mask) {
    mask = mask - ((mask >>> 1) & 0x55555555);
    mask = (mask & 0x33333333) + ((mask >>> 2) & 0x33333333);
    mask = (mask + (mask >>> 4)) & 0x0f0f0f0f;
    return Math.imul(mask, 0x01010101) >>> 24;
  }

  // mask & -mask isolates the lowest set bit; Math.clz32(0) is 32, so an empty mask yields -1.
  function lowestBitIndex(mask) {
    return 31 - Math.clz32(mask & -mask);
  }

  /** Calls fn with the 1-based value of each set bit, lowest first. */
  function forEach(mask, fn) {
    mask = mask | 0;
    while (mask !== 0) {
      var low = mask & -mask;
      fn(32 - Math.clz32(low));
      mask ^= low;
    }
  }

  function toArray(mask) {
    var out = [];
    mask = mask | 0;
    while (mask !== 0) {
      var low = mask & -mask;
      out.push(32 - Math.clz32(low));
      mask ^= low;
    }
    return out;
  }

  function full(digits) {
    return (1 << digits) - 1;
  }

  function maskOf(value) {
    return 1 << (value - 1);
  }

  SG.bits = {
    popcount: popcount,
    lowestBitIndex: lowestBitIndex,
    forEach: forEach,
    toArray: toArray,
    full: full,
    maskOf: maskOf
  };
})(typeof self !== 'undefined' ? self : globalThis);
