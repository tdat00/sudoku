/**
 * Small readers of a rebuilt `PuzzleModel` that the generator's variant code used to provide and the
 * player's screens still need. Everything is derived from the model itself, so it works on a model that
 * came out of a puzzle document without any variant code.
 *
 *   signEdges(model)     where and how to draw each Greater-Than sign (board view, cell labels)
 *   describeWord(model)  the key word line of a Wordoku board: which cells, which letters, the word
 *   readWord(model, values, blank?)  spells that line for a (partial) board
 *   isWordSolved(model, values)      true when the line of the board spells the key word
 *   symbolModes(model)   the symbol sets a board can be shown in (the first is the default)
 *
 * Pure data, no DOM.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first definition on repeated loads.
  if (SG.modelAids && typeof SG.modelAids.signEdges === 'function') return;

  /** Length of the word line of a Wordoku board (a 9x9 grid). */
  const WORD_LENGTH = 9;

  /**
   * Where and how to draw each sign of a model. Cells are on the canvas grid, so `(midRow, midCol)` is the
   * midpoint of the two cell centres, in cell units (a cell centre has integer coordinates).
   *
   * `direction` runs from the smaller cell a to the greater cell b: 'right', 'left', 'down' or 'up'. The
   * glyph is the sign as it reads in that direction: '<' when a is left of b, '>' when a is right of b, and
   * for the vertical case the apex points at the smaller cell, '\u2227' when a is above b and '\u2228' when
   * below.
   * @param {PuzzleModel} model
   * @returns {Array<{index: number, a: number, b: number, midRow: number, midCol: number,
   *          direction: string, glyph: string}>}
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
   * @property {string} placement  'diagonal' | 'row' | 'column'.
   * @property {?number} line      1-based number of the row or column; null for the diagonal.
   * @property {number[]} cells    The nine cells of the line in reading order (top to bottom for a column).
   * @property {string[]} letters  The letter of each of those cells.
   * @property {string} word       The key word: `letters` joined. Keep it hidden until the puzzle is solved.
   */

  /**
   * Describes the word line of a Wordoku model, from `fixedCells` and the symbol labels.
   * @param {PuzzleModel} model
   * @returns {?WordLine}  null when the model has no complete word line.
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

  /**
   * Spells the word line of a board.
   * @param {PuzzleModel} model
   * @param {ArrayLike<number>} values  One value per cell, 0 = empty (a solution, or the player's board).
   * @param {string} [blank='_']  What stands for an empty cell.
   * @returns {?string}  Nine characters, or null when the model has no word line.
   */
  function readWord(model, values, blank) {
    const info = describeWord(model);
    if (info === null) return null;
    const fill = blank === undefined ? '_' : blank;
    return info.cells.map(function (c) {
      const v = values[c];
      return v >= 1 && v <= WORD_LENGTH ? model.symbols.labels[v - 1] : fill;
    }).join('');
  }

  /**
   * @param {PuzzleModel} model
   * @param {ArrayLike<number>} values  One value per cell, 0 = empty.
   * @returns {boolean} True when the word line of the board spells the key word.
   */
  function isWordSolved(model, values) {
    const info = describeWord(model);
    return info !== null && readWord(model, values) === info.word;
  }

  /**
   * The symbol sets a board can be shown in: a Wordoku board its key-word letters (or plain digits), a board
   * with more than nine values (Mega) its own digits only, every other board digits, letters, colours and
   * shapes. The first entry is the default.
   * @param {PuzzleModel} model
   * @returns {string[]}
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
