/**
 * Fixtures for the classic 9x9 core: puzzles with known solutions, puzzles with several solutions, puzzles
 * with none, and a builder for overlapping multi-grid models (used to test canvas based code).
 *
 * Puzzle strings have 81 characters, row by row; '0' or '.' marks an empty cell. Every solution below was
 * computed with an independent solver and every "unique" puzzle was confirmed to have exactly one solution.
 *
 * Exposed as SG.fixtures.classic and SG.fixtures.models.
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};
  SG.fixtures = SG.fixtures || {};

  /** @returns {Int32Array} 81 values, 0 for an empty cell. */
  function parse(text) {
    var out = new Int32Array(text.length);
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      out[i] = ch >= '1' && ch <= '9' ? ch.charCodeAt(0) - 48 : 0;
    }
    return out;
  }

  /** Puzzles with exactly one solution. */
  var UNIQUE = [
    {
      name: 'wikipedia-example',
      puzzle: '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
      solution: '534678912672195348198342567859761423426853791713924856961537284287419635345286179'
    },
    {
      name: 'escargot',
      puzzle: '1....7.9..3..2...8..96..5....53..9...1..8...26....4...3......1..4......7..7...3..',
      solution: '162857493534129678789643521475312986913586742628794135356478219241935867897261354'
    },
    {
      name: 'worlds-hardest-2012',
      puzzle: '800000000003600000070090200050007000000045700000100030001000068008500010090000400',
      solution: '812753649943682175675491283154237896369845721287169534521974368438526917796318452'
    },
    {
      name: 'classic-easy',
      puzzle: '003020600900305001001806400008102900700000008006708200002609500800203009005010300',
      solution: '483921657967345821251876493548132976729564138136798245372689514814253769695417382'
    },
    {
      name: 'classic-medium',
      puzzle: '200080300060070084030500209000105408000000000402706000301007040720040060004010003',
      solution: '245981376169273584837564219976125438513498627482736951391657842728349165654812793'
    },
    {
      name: 'classic-easy-2',
      puzzle: '000260701680070090190004500820100040004602900050003028009300074040050036703018000',
      solution: '435269781682571493197834562826195347374682915951743628519326874248957136763418259'
    },
    {
      name: 'hard-17-clues',
      puzzle: '000000010400000000020000000000050407008000300001090000300400200050100000000806000',
      solution: '693784512487512936125963874932651487568247391741398625319475268856129743274836159'
    },
    {
      name: 'hard-17-clues-b',
      puzzle: '4.....8.5.3..........7......2.....6.....8.4......1.......6.3.7.5..2.....1.4......',
      solution: '417369825632158947958724316825437169791586432346912758289643571573291684164875293'
    },
    {
      name: 'hard-platinum',
      puzzle: '000000012000000003002300400001800005060070800000009000008500000900040500470006000',
      solution: '839465712146782953752391486391824675564173829287659341628537194913248567475916238'
    },
    {
      name: 'hard-nugget',
      puzzle: '000000039000001005003050800008090006070002000100400000009080050020000600400700000',
      solution: '751846239892371465643259871238197546974562318165438927319684752527913684486725193'
    },
    {
      name: 'hard-a',
      puzzle: '85...24..72......9..4.........1.7..23.5...9...4...........8..7..17..........36.4.',
      solution: '859612437723854169164379528986147352375268914241593786432981675617425893598736241'
    },
    {
      name: 'hard-b',
      puzzle: '..53.....8......2..7..1.5..4....53...1..7...6..32...8..6.5....9..4....3......97..',
      solution: '145327698839654127672918543496185372218473956753296481367542819984761235521839764'
    },
    {
      name: 'hard-c',
      puzzle: '12.3....435....1....4........54..2..6...7.........8.9...31..5.......9.7.....6...8',
      solution: '126395784359847162874621953985416237631972845247538691763184529418259376592763418'
    }
  ];

  /** Puzzles with two or more solutions. */
  var MULTI = [
    {
      name: 'sparse-many-solutions',
      puzzle: '.....6....59.....82....8....45........3........6..3.54...325..6..................'
    },
    {
      name: 'deadly-rectangle',
      note: 'a full grid minus two rows of two cells that can be swapped; exactly 2 solutions',
      puzzle: '534008912672195348198342567859001423426853791713924856961537284287419635345286179'
    },
    {
      name: 'one-clue-too-few',
      note: 'a unique puzzle with one clue removed',
      puzzle: '003020000900305001001806400008102900700000008006708200002609500800203009005010300'
    },
    {
      name: 'empty-grid',
      puzzle: new Array(82).join('0')
    }
  ];

  /** Puzzles without any solution. */
  var CONTRADICTORY = [
    {
      name: 'duplicate-in-row',
      note: 'two 1s in the first row',
      puzzle: '11' + new Array(80).join('0')
    },
    {
      name: 'cell-without-candidates',
      note: 'no clash between clues, but R1C9 sees all of 1-9',
      puzzle: '123456780000000009' + new Array(64).join('0')
    },
    {
      name: 'wrong-clue',
      note: 'the first clue of the Wikipedia example changed from 5 to 1; no two clues clash directly',
      puzzle: '130070000600195000098000060800060003400803001700020006060000280000419005000080079'
    }
  ];

  SG.fixtures.classic = {
    parse: parse,
    unique: UNIQUE,
    multi: MULTI,
    contradictory: CONTRADICTORY
  };

  // -------------------------------------------------------------------------------------------------
  // Overlapping grids on a shared canvas
  // -------------------------------------------------------------------------------------------------

  /**
   * Builds a model out of 9x9 sub-grids placed on a square canvas. Cells at the same canvas position are one
   * cell, so the units of overlapping grids share cell indices. Standard 3x3 boxes.
   * @param {string} variantId
   * @param {number} canvas             Side of the square canvas.
   * @param {Array<[number, number]>} origins  [row, col] of each sub-grid.
   * @returns {PuzzleModel}
   */
  function buildMultiGrid(variantId, canvas, origins) {
    var D = 9;
    var cellAt = new Map();
    var cellRow = [];
    var cellCol = [];
    var units = [];
    var meta = [];
    var subGrids = [];

    function cellOf(r, c) {
      var key = r * canvas + c;
      if (!cellAt.has(key)) {
        cellAt.set(key, cellRow.length);
        cellRow.push(r);
        cellCol.push(c);
      }
      return cellAt.get(key);
    }

    origins.forEach(function (origin, g) {
      var r0 = origin[0];
      var c0 = origin[1];
      var i;
      var j;
      subGrids.push({ gridIndex: g, originRow: r0, originCol: c0 });
      for (i = 0; i < D; i++) {
        var row = [];
        var col = [];
        for (j = 0; j < D; j++) {
          row.push(cellOf(r0 + i, c0 + j));
          col.push(cellOf(r0 + j, c0 + i));
        }
        units.push(row);
        meta.push({ kind: 'row', gridIndex: g, label: 'G' + (g + 1) + '-R' + (i + 1) });
        units.push(col);
        meta.push({ kind: 'col', gridIndex: g, label: 'G' + (g + 1) + '-C' + (i + 1) });
      }
      for (var b = 0; b < D; b++) {
        var box = [];
        for (i = 0; i < 3; i++) {
          for (j = 0; j < 3; j++) box.push(cellOf(r0 + Math.floor(b / 3) * 3 + i, c0 + (b % 3) * 3 + j));
        }
        units.push(box);
        meta.push({ kind: 'box', gridIndex: g, label: 'G' + (g + 1) + '-B' + (b + 1) });
      }
    });

    return SG.model.create({
      variantId: variantId,
      digits: D,
      units: units,
      unitMeta: meta,
      layout: { rows: canvas, cols: canvas, cellRow: cellRow, cellCol: cellCol, subGrids: subGrids }
    });
  }

  SG.fixtures.models = {
    buildMultiGrid: buildMultiGrid,

    /**
     * A square grid with boxRows x boxCols boxes, built independently of the classic variants so that the
     * engine can be tested at digit counts the registry does not offer yet (12 and 16).
     */
    boxGrid: function boxGrid(variantId, boxRows, boxCols) {
      var D = boxRows * boxCols;
      var cellRow = [];
      var cellCol = [];
      var cellRegion = [];
      var units = [];
      var meta = [];
      var r;
      var c;
      for (r = 0; r < D; r++) {
        for (c = 0; c < D; c++) {
          cellRow.push(r);
          cellCol.push(c);
          cellRegion.push(Math.floor(r / boxRows) * (D / boxCols) + Math.floor(c / boxCols));
        }
      }
      for (r = 0; r < D; r++) {
        units.push(cellCol.slice(0, D).map(function (col) { return r * D + col; }));
        meta.push({ kind: 'row', label: 'R' + (r + 1) });
      }
      for (c = 0; c < D; c++) {
        units.push(cellCol.slice(0, D).map(function (row) { return row * D + c; }));
        meta.push({ kind: 'col', label: 'C' + (c + 1) });
      }
      for (var b = 0; b < D; b++) {
        var top = Math.floor(b / (D / boxCols)) * boxRows;
        var left = (b % (D / boxCols)) * boxCols;
        var box = [];
        for (r = 0; r < boxRows; r++) {
          for (c = 0; c < boxCols; c++) box.push((top + r) * D + left + c);
        }
        units.push(box);
        meta.push({ kind: 'box', label: 'B' + (b + 1) });
      }
      return SG.model.create({
        variantId: variantId,
        digits: D,
        units: units,
        unitMeta: meta,
        layout: { rows: D, cols: D, cellRow: cellRow, cellCol: cellCol, cellRegion: cellRegion }
      });
    },

    /** Five 9x9 grids on a 21x21 canvas, as in Samurai Sudoku: 369 cells, 135 units. */
    samurai: function samurai() {
      return buildMultiGrid('test-samurai', 21, [[0, 0], [0, 12], [12, 0], [12, 12], [6, 6]]);
    },

    /** Samurai without its bottom-right grid: the canvas is no longer symmetric under rotation. */
    lShape: function lShape() {
      return buildMultiGrid('test-l-shape', 21, [[0, 0], [0, 12], [12, 0], [6, 6]]);
    }
  };
})();
