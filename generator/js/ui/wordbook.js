/**
 * Word book of the Wordoku key words: what a word means, shown when the puzzle is solved.
 *
 * The data are plain tables in assets/wordbook (`SG.wordbookData.en`, `SG.wordbookData.vi`), keyed by the
 * word as it is on the board (upper-case A-Z, no diacritics):
 *   en  KEY -> [spelling, pos, English definition, Vietnamese explanation]
 *   vi  KEY -> [spelling with diacritics ('bạch dương'), pos, Vietnamese definition]
 * `pos` is 'n' (noun), 'v' (verb), 'a' (adjective), 'd' (adverb) or 'o' (other). The tables are read lazily, so
 * the files may load in any order.
 *
 * `lookup` is pure: it reads the tables and returns data, the UI decides how to show it.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.wordbook && typeof SG.wordbook.lookup === 'function') return;

  const LANGUAGES = Object.freeze(['vi', 'en']);

  /**
   * @typedef {Object} WordEntry
   * @property {string} language  'en' or 'vi': the language of the word itself.
   * @property {string} text      The word as it is spelled (Vietnamese with its diacritics).
   * @property {string} pos      'n' | 'v' | 'a' | 'd' | 'o' (noun, verb, adjective, adverb, other).
   * @property {string} meaning   The explanation in the requested locale (the other language when missing).
   * @property {string} other     The explanation in the other language for an English word, else ''.
   */

  function tables() {
    return SG.wordbookData || {};
  }

  /**
   * @param {string} word    The key word as on the board, upper-case A-Z.
   * @param {string} locale  Language of the explanation: 'en' or 'vi'.
   * @returns {WordEntry[]}  Every entry that has this key (usually one, none for a word of the player's own).
   */
  function lookup(word, locale) {
    const out = [];
    if (typeof word !== 'string' || word === '') return out;
    const key = word.toUpperCase();
    const wantVi = locale === 'vi';
    const data = tables();
    LANGUAGES.forEach(function (language) {
      const table = data[language];
      if (!table || !Object.prototype.hasOwnProperty.call(table, key)) return;
      const row = table[key];
      if (language === 'vi') {
        out.push({ language: 'vi', text: row[0], pos: row[1], meaning: row[2], other: '' });
      } else {
        out.push({
          language: 'en', text: row[0], pos: row[1],
          meaning: wantVi ? row[3] : row[2],
          other: wantVi ? row[2] : row[3]
        });
      }
    });
    return out;
  }

  SG.wordbook = Object.freeze({ lookup: lookup });
})(typeof self !== 'undefined' ? self : globalThis);
