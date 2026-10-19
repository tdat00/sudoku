/**
 * Readers of a rebuilt `PuzzleModel` that the player's screens need: `signEdges` (where to draw each Greater-Than
 * sign), `describeWord` / `readWord` / `isWordSolved` (the Wordoku key-word line) and `symbolModes`.
 * Everything is derived from the model itself, so it works without any variant code. Pure data, no DOM.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.modelAids && typeof SG.modelAids.signEdges === 'function') return;

  const WORD_LENGTH = 9;

  /**
   * Where and how to draw each sign. `(midRow, midCol)` is the midpoint of the two cell centres in cell units
   * (a centre has integer coordinates). `direction` runs from the smaller cell a to the greater cell b; the glyph
   * reads in that direction: '<' / '>' horizontally, and vertically the apex points at the smaller cell
   * ('\u2227' when a is above b, '\u2228' when below).
   */
  function signEdges(model) {
    const row = model.layout.cellRow;
    const col = model.layout.cellCol;
    return model.inequalities.map(function (q, index) {
      const dr = row[q.b] - row[q.a];
      const dc = col[q.b] - col[q.a];
      let direction = 'right';
      let glyph = '<';
      if (dc === -1 && dr === 0) {
        direction = 'left';
        glyph = '>';
      } else if (dr === 1 && dc === 0) {
        direction = 'down';
        glyph = '\u2227';
      } else if (dr === -1 && dc === 0) {
        direction = 'up';
        glyph = '\u2228';
      }
      return {
        index: index,
        a: q.a,
        b: q.b,
        midRow: (row[q.a] + row[q.b]) / 2,
        midCol: (col[q.a] + col[q.b]) / 2,
        direction: direction,
        glyph: glyph
      };
    });
  }

  /**
   * @typedef {Object} WordLine
   * `placement` is 'diagonal' | 'row' | 'column'; `line` the 1-based row/column (null for the diagonal); `cells`
   * the nine cells in reading order. `word` is the letters joined: keep it hidden until the puzzle is solved.
   */

  function describeWord(model) {
    if (model === null || typeof model !== 'object' || !model.fixedCells || !model.symbols) return null;
    const cells = [];
    for (let c = 0; c < model.fixedCells.length; c++) if (model.fixedCells[c] !== 0) cells.push(c);
    if (cells.length !== WORD_LENGTH) return null;

    const row = model.layout.cellRow;
    const col = model.layout.cellCol;
    const sameRow = cells.every(function (c) { return row[c] === row[cells[0]]; });
    const sameCol = cells.every(function (c) { return col[c] === col[cells[0]]; });
    let placement = 'diagonal';
    let line = null;
    if (sameRow) {
      placement = 'row';
      line = row[cells[0]] + 1;
      cells.sort(function (a, b) { return col[a] - col[b]; });
    } else if (sameCol) {
      placement = 'column';
      line = col[cells[0]] + 1;
      cells.sort(function (a, b) { return row[a] - row[b]; });
    } else {
      cells.sort(function (a, b) { return row[a] - row[b]; });
    }
    const letters = cells.map(function (c) { return model.symbols.labels[model.fixedCells[c] - 1]; });
    return { placement: placement, line: line, cells: cells, letters: letters, word: letters.join('') };
  }

  function readWord(model, values, blank) {
    const info = describeWord(model);
    if (info === null) return null;
    const fill = blank === undefined ? '_' : blank;
    return info.cells.map(function (c) {
      const v = values[c];
      return v >= 1 && v <= WORD_LENGTH ? model.symbols.labels[v - 1] : fill;
    }).join('');
  }

  function isWordSolved(model, values) {
    const info = describeWord(model);
    return info !== null && readWord(model, values) === info.word;
  }

  /**
   * The symbol sets a board can be shown in (the first is the default): a Wordoku board its key-word letters or
   * plain digits, a board with more than nine values (Mega) its own digits only, any other board digits, letters,
   * colours and shapes.
   */
  function symbolModes(model) {
    if (model.symbols && model.symbols.mode === 'word') return ['word', 'digits'];
    if (model.digits > 9) return ['digits'];
    return ['digits', 'letters', 'colors', 'shapes'];
  }

  SG.modelAids = {
    WORD_LENGTH: WORD_LENGTH,
    signEdges: signEdges,
    describeWord: describeWord,
    readWord: readWord,
    isWordSolved: isWordSolved,
    symbolModes: symbolModes
  };
})(typeof self !== 'undefined' ? self : globalThis);
