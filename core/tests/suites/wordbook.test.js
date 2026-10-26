// SG.wordbook (../core/js/ui/wordbook.js) and its data (core/assets/wordbook): what a solved Wordoku tells
// about its key word.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var B = SG.wordbook;
  var DATA = SG.wordbookData;

  function nineDistinct(key) {
    return /^[A-Z]{9}$/.test(key) && new Set(key).size === 9;
  }

  function strip(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0111/g, 'd').toUpperCase()
      .replace(/[^A-Z]/g, '');
  }

  describe('wordbook: data', function () {
    it('has both languages, with hundreds of English and over a hundred Vietnamese words', function () {
      expect(Object.keys(DATA.en).length).toBeGreaterThanOrEqual(250);
      expect(Object.keys(DATA.vi).length).toBeGreaterThanOrEqual(100);
    });

    it('every key is nine distinct letters and every entry is complete', function () {
      Object.keys(DATA.en).forEach(function (key) {
        var row = DATA.en[key];
        expect(nineDistinct(key)).toBe(true);
        expect(row).toHaveLength(4);
        expect(row[0].toUpperCase()).toBe(key);
        expect('nvado'.indexOf(row[1]) !== -1 && row[1].length === 1).toBe(true);
        expect(row[2].length).toBeGreaterThan(5);
        expect(row[3].length).toBeGreaterThan(5);
      });
      Object.keys(DATA.vi).forEach(function (key) {
        var row = DATA.vi[key];
        expect(nineDistinct(key)).toBe(true);
        expect(row).toHaveLength(3);
        expect(strip(row[0])).toBe(key);
        expect(row[0].split(' ').length).toBeLessThanOrEqual(3);
        expect('nvado'.indexOf(row[1]) !== -1 && row[1].length === 1).toBe(true);
        expect(row[2].length).toBeGreaterThan(5);
      });
    });

    it('a Vietnamese word is spelled with its diacritics', function () {
      var withMarks = Object.keys(DATA.vi).filter(function (key) {
        return DATA.vi[key][0] !== DATA.vi[key][0].normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      });
      expect(withMarks.length).toBeGreaterThan(Object.keys(DATA.vi).length * 0.9);
    });
  });

  describe('wordbook: lookup', function () {
    it('gives the Vietnamese spelling and meaning of a Vietnamese word', function () {
      var found = B.lookup('CHUYENGIA', 'vi');
      expect(found).toHaveLength(1);
      expect(found[0].language).toBe('vi');
      expect(found[0].text).toBe('chuyên gia');
      expect(found[0].pos).toBe('n');
      expect(found[0].meaning.length).toBeGreaterThan(5);
      expect(found[0].other).toBe('');
      expect(B.lookup('CHUYENGIA', 'en')[0].meaning).toBe(found[0].meaning);
    });

    it('gives the meaning of an English word in the language of the page, and the other one beside it', function () {
      var en = B.lookup('EDUCATION', 'en')[0];
      var vi = B.lookup('EDUCATION', 'vi')[0];
      expect(en.language).toBe('en');
      expect(en.text).toBe('education');
      expect(vi.meaning).toBe(en.other);
      expect(vi.other).toBe(en.meaning);
      expect(vi.meaning).not.toBe(en.meaning);
    });

    it('finds nothing for a word of the player\'s own, a bad key or a missing argument', function () {
      expect(B.lookup('ABCDEFGHI', 'en')).toEqual([]);
      expect(B.lookup('', 'en')).toEqual([]);
      expect(B.lookup(null, 'vi')).toEqual([]);
      expect(B.lookup('toString', 'en')).toEqual([]);
    });

    it('accepts the key in lower case', function () {
      expect(B.lookup('education', 'en')).toHaveLength(1);
    });
  });
})();
