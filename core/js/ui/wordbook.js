/**
 * Word book of the Wordoku key words: what a word means, shown when the puzzle is solved. Tables live in
 * assets/wordbook (`SG.wordbookData.en|vi`), keyed by the board word (upper-case A-Z, no diacritics):
 *   en  KEY -> [spelling, pos, English definition, Vietnamese explanation]
 *   vi  KEY -> [spelling with diacritics, pos, Vietnamese definition]
 * `pos` is 'n', 'v', 'a', 'd' (adverb) or 'o'. Tables are read lazily, so files may load in any order.
 * `lookup` is pure: the UI decides how to show the data.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.wordbook && typeof SG.wordbook.lookup === 'function') return;

  const LANGUAGES = Object.freeze(['vi', 'en']);

  /**
   * @typedef {Object} WordEntry  `language` ('en'|'vi') is that of the word itself, `text` its spelling.
   * @property {string} pos      'n' | 'v' | 'a' | 'd' | 'o'.
   * @property {string} meaning  The explanation in the requested locale (the other language when missing).
   * @property {string} other    The explanation in the other language for an English word, else ''.
   */

  function tables() {
    return SG.wordbookData || {};
  }

  /**
   * Every entry with this key (usually one, none for a word of the player's own); `locale` is 'en' or 'vi'.
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
