/**
 * Bit-mask helpers for candidate sets. A mask holds digit v (1-based) in bit (v - 1), so every digit
 * count up to `SG.MAX_DIGITS` fits in the low 16 bits of an int32.
 */
(function (root) {
  'use strict';

  var SG = root.SG = root.SG || {};

  /**
   * Number of set bits (Hamming weight), branch free. Correct for any 32-bit pattern.
   * @param {number} mask
   * @returns {number} 0..32
   */
  function popcount(mask) {
    mask = mask - ((mask >>> 1) & 0x55555555);
    mask = (mask & 0x33333333) + ((mask >>> 2) & 0x33333333);
    mask = (mask + (mask >>> 4)) & 0x0f0f0f0f;
    return Math.imul(mask, 0x01010101) >>> 24;
  }

  /**
   * Index of the lowest set bit. `mask & -mask` isolates that bit, and for an empty mask
   * `Math.clz32(0)` is 32, which conveniently yields -1.
   * @param {number} mask
   * @returns {number} 0-based bit index, or -1 when mask is 0
   */
  function lowestBitIndex(mask) {
    return 31 - Math.clz32(mask & -mask);
  }

  /**
   * Calls `fn` for every set bit, from the lowest to the highest.
   * @param {number} mask
   * @param {function(number): void} fn Receives the 1-based value (bit index + 1).
   */
  function forEach(mask, fn) {
    mask = mask | 0;
    while (mask !== 0) {
      var low = mask & -mask;
      fn(32 - Math.clz32(low));
      mask ^= low;
    }
  }

  /**
   * @param {number} mask
   * @returns {number[]} The 1-based values present in the mask, ascending.
   */
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

  /**
   * Mask with all of the digits 1..digits set.
   * @param {number} digits 0..30
   * @returns {number} (1 << digits) - 1
   */
  function full(digits) {
    return (1 << digits) - 1;
  }

  /**
   * Mask holding the single 1-based value.
   * @param {number} value 1..31
   * @returns {number}
   */
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
