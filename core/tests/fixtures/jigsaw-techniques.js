/**
 * Fixtures for the techniques that only some variants have and that need a board of their own (rating v3, MS14b):
 * today the Jigsaw technique `lawOfLeftovers`. Exposed as SG.fixtures.jigsawTechniques and exercised by
 * core/tests/suites/tech-subset.test.js (every case), core/tests/suites/techniques.test.js (the soundness sweep) and
 * the pattern-cost tool (generator/tests/fixtures/pattern-cost.js). The classic fixtures of techniques.js are 9x9 boxes
 * boards described by a puzzle string only; a Jigsaw board is described by its region map, so an entry here is:
 *
 *   { name, cellRegion, givens, after, propagate, expect }
 *
 *   cellRegion  the 81 region numbers (0-8) of the puzzle, row by row: the layout of the board, copied from the
 *               puzzle (the way a Jigsaw export or a help snapshot carries it), never the regular boxes;
 *   givens      the puzzle as a string of 81 characters ('.' = empty). Every puzzle here has exactly one solution (it was
 *               dug from a seeded random solution of its own layout with SG.testkit.dig);
 *   after       the explicit list of registered ids that H.stateAfter may use: the position is the first one in which the
 *               registry reaches lawOfLeftovers (every technique before it that applies to jigsaw9, and never the id
 *               itself), or the list through it for a position where it has nothing left to do; null = the position
 *               straight after entering the clues (H.makeState with `propagate`);
 *   expect      for a positive fixture the exact deduction { placements, eliminations [[cell, digit]...] } and the
 *               fields of the Finding that it must have: cells (ascending) and i18nArgs { lines, regions, cells, digits }.
 *
 * Where the positions come from. The layouts `wavy` and `crossed` are two of the test layouts of
 * core/tests/fixtures/jigsaw-models.js (found by a seeded search, then fixed), `boxes` is the ordinary 3x3 layout. A
 * puzzle is the minimal puzzle that SG.testkit.dig leaves of a solution found by J.solve for the seeds named in its
 * entry; the second positive of each pair is the exact transpose (rows and columns exchanged, layout and clues) of the
 * first, so that one position is seen with rows and with columns as the lines. The expected Findings were recorded
 * when the fixtures were made, then checked by the independent enumeration of the suite (built from model.units only)
 * and against the unique solution.
 *
 * `supplements` are further real positions of the same kind for the soundness sweep of techniques.test.js, appended
 * to its seeded random population and never replacing it.
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};
  SG.fixtures = SG.fixtures || {};

  var SIZE = 9;

  /** Nine strings of nine digits (a row each) -> the 81 region numbers. */
  function layoutOf(rows) {
    var out = [];
    rows.forEach(function (row) {
      for (var c = 0; c < SIZE; c++) out.push(row.charCodeAt(c) - 48);
    });
    return out;
  }

  function transposeLayout(cellRegion) {
    var out = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) out.push(cellRegion[c * SIZE + r]);
    }
    return out;
  }

  function transposeText(text) {
    var out = '';
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) out += text.charAt(c * SIZE + r);
    }
    return out;
  }

  var WAVY = layoutOf([
    '000222222', '000002212', '011111111', '333335555', '333355545', '644444445', '666668848', '766768888',
    '777777788'
  ]);
  var CROSSED = layoutOf([
    '000011112', '300001112', '330444512', '333345512', '663345552', '666444452', '676688552', '776778882',
    '777788882'
  ]);
  var STAGGERED = layoutOf([
    '000002222', '002222211', '001111111', '333555555', '333454455', '366444444', '336888888', '666668887',
    '677777777'
  ]);
  var MIXED = layoutOf([
    '000000022', '001222222', '111111112', '666647885', '644447855', '633347855', '633447885', '633347885',
    '637777855'
  ]);
  var ORDERED = layoutOf([
    '000011112', '300001112', '330444512', '334445512', '333445222', '663455272', '668885577', '668885777',
    '666888777'
  ]);
  var BOXES = layoutOf([
    '000111222', '000111222', '000111222', '333444555', '333444555', '333444555', '666777888', '666777888',
    '666777888'
  ]);

  // The techniques before lawOfLeftovers in the registry of rating v3 that apply to jigsaw9 (cageCombo, ineqChain and
  // minMaxForcing are scoped to other variants).
  var BELOW_LEFTOVERS = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'pointing', 'boxLine', 'nakedPair',
    'hiddenPair', 'nakedTriple'];
  var THROUGH_LEFTOVERS = BELOW_LEFTOVERS.concat(['lawOfLeftovers']);

  // seeded puzzles (SG.testkit.rng seed = n * 7919 for the n of the name, plus 1 when the name says
  // "transposed layout": the puzzle is dug on the transpose of the named layout; solution from
  // J.solve(model, rng.fork('grid')), clues removed by SG.testkit.dig(model, solution, rng.fork('dig'),
  // { minClues: 0 }))
  var WAVY_3 = '.8...7..4....1.........97..............5..1....4.8...3....5...1.6.2..4.59...6.5..';
  var CROSSED_2 = '....71...27.......1...5.8....8...........4....4.....9.7..86..1.......5..6...2....';
  var BOXES_2 = '....96...........589..2.3....5.....27....35...2..7..69...8.1.........6.13.7.4....';

  var BY_ID = {
    lawOfLeftovers: {
      scope: ['jigsaw9'],
      positive: [
        {
          name: 'lawOfLeftovers on R7 with J7: the cells of R7 outside J7 against those of J7 outside R7 (wavy, seed 3)',
          cellRegion: WAVY,
          givens: WAVY_3,
          after: BELOW_LEFTOVERS,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[67, 7]],
            cells: [45, 59, 60, 61, 62, 64, 65, 67],
            args: {
              lines: ['R7'], regions: ['J7'],
              cells: ['R6C1', 'R7C6', 'R7C7', 'R7C8', 'R7C9', 'R8C2', 'R8C3', 'R8C5'], digits: [7]
            }
          }
        },
        {
          name: 'lawOfLeftovers on C7 with J7: the same position with rows and columns exchanged (wavy, seed 3, ' +
            'transposed)',
          cellRegion: transposeLayout(WAVY),
          givens: transposeText(WAVY_3),
          after: BELOW_LEFTOVERS,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[43, 7]],
            cells: [5, 16, 25, 43, 51, 60, 69, 78],
            args: {
              lines: ['C7'], regions: ['J7'],
              cells: ['R1C6', 'R2C8', 'R3C8', 'R5C8', 'R6C7', 'R7C7', 'R8C7', 'R9C7'], digits: [7]
            }
          }
        },
        {
          name: 'lawOfLeftovers on R1+R2 with J1+J2: two rows and two regions, the 8 removed twice (crossed, seed 2)',
          cellRegion: CROSSED,
          givens: CROSSED_2,
          after: BELOW_LEFTOVERS,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[8, 8], [17, 8]],
            cells: [8, 9, 17, 20, 25, 34],
            args: {
              lines: ['R1', 'R2'], regions: ['J1', 'J2'],
              cells: ['R1C9', 'R2C1', 'R2C9', 'R3C3', 'R3C8', 'R4C8'], digits: [8]
            }
          }
        },
        {
          name: 'lawOfLeftovers on C1+C2 with J1+J2: the same position with rows and columns exchanged (crossed, ' +
            'seed 2, transposed)',
          cellRegion: transposeLayout(CROSSED),
          givens: transposeText(CROSSED_2),
          after: BELOW_LEFTOVERS,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[72, 8], [73, 8]],
            cells: [1, 20, 65, 66, 72, 73],
            args: {
              lines: ['C1', 'C2'], regions: ['J1', 'J2'],
              cells: ['R1C2', 'R3C3', 'R8C3', 'R8C4', 'R9C1', 'R9C2'], digits: [8]
            }
          }
        }
      ],
      negative: [
        {
          name: 'lawOfLeftovers has nothing left to do once it has run on the rows position (wavy, seed 3)',
          cellRegion: WAVY,
          givens: WAVY_3,
          after: THROUGH_LEFTOVERS,
          propagate: true
        },
        {
          name: 'lawOfLeftovers has nothing left to do once it has run on the columns position (wavy, seed 3, ' +
            'transposed)',
          cellRegion: transposeLayout(WAVY),
          givens: transposeText(WAVY_3),
          after: THROUGH_LEFTOVERS,
          propagate: true
        },
        {
          name: 'lawOfLeftovers finds nothing on the ordinary 3x3 boxes, where no choice of units leaves at most four ' +
            'cells (boxes, seed 2)',
          cellRegion: BOXES,
          givens: BOXES_2,
          after: BELOW_LEFTOVERS,
          propagate: true
        }
      ]
    }
  };

  /**
   * Supplemental real positions for the soundness sweep (the shape of the positive fixtures, without `expect`): one
   * or two positions on each of five more test layouts, all at the position where the registry reaches lawOfLeftovers
   * and all with a Finding there; three of them have columns as the lines.
   */
  var SUPPLEMENTS = {
    lawOfLeftovers: [
      { name: 'lawOfLeftovers on R4+R5 with J4+J6, one removal (staggered, seed 4)',
        cellRegion: STAGGERED,
        givens: '.........5.61...2..4.5...3..81.............8.4....7..53..8..1.9..4.......9....3..',
        after: BELOW_LEFTOVERS, propagate: true },
      { name: 'lawOfLeftovers on C4 with J6, five removals (staggered, transposed layout, seed 3)',
        cellRegion: transposeLayout(STAGGERED),
        givens: '..21....7.1.....4.4.5....63.5....4.8............8........2....9.....4.1.9....18..',
        after: BELOW_LEFTOVERS, propagate: true },
      { name: 'lawOfLeftovers on C4+C5 with J4+J6, one removal (staggered, transposed layout, seed 2)',
        cellRegion: transposeLayout(STAGGERED),
        givens: '...9.....2...3..78..7..1.9..4.....3......3..9..3...7..9.6....1........6..15..8...',
        after: BELOW_LEFTOVERS, propagate: true },
      { name: 'lawOfLeftovers on R8+R9 with J3+J6, one removal (mixed, transposed layout, seed 1)',
        cellRegion: transposeLayout(MIXED),
        givens: '6.13...7...7...4...5......6.3.9............3......4.1.4..5.31.2........5.......23',
        after: BELOW_LEFTOVERS, propagate: true },
      { name: 'lawOfLeftovers on R1+R2 with J1+J2, three removals of one digit (ordered, seed 3)',
        cellRegion: ORDERED,
        givens: '..6.....................7.57...........4..1..5.9.4...7.....2..3.6.9..4..1...8.5..',
        after: BELOW_LEFTOVERS, propagate: true },
      { name: 'lawOfLeftovers on R1+R2 with J1+J2, four removals (crossed, seed 4)',
        cellRegion: CROSSED,
        givens: '...........84...1.41.5...6.835..1............3...6.2.99..2..8.4..................',
        after: BELOW_LEFTOVERS, propagate: true },
      { name: 'lawOfLeftovers on C1+C2 with J1+J2, one removal (crossed, transposed layout, seed 3)',
        cellRegion: transposeLayout(CROSSED),
        givens: '..2...5.7.6.........5...9...16.....2............8........4..........7.8.2..6..41.',
        after: BELOW_LEFTOVERS, propagate: true }
    ]
  };

  var models = {};

  /** The PuzzleModel of the actual region map of a fixture (SG.fixtures.jigsawModels.build), built once per map. */
  function modelOf(fixture) {
    var key = fixture.cellRegion.join('');
    if (!models[key]) models[key] = SG.fixtures.jigsawModels.build(fixture.cellRegion);
    return models[key];
  }

  /** The position of a fixture, built like the classic fixtures are (techniques.test.js): on its own board. */
  function stateOf(fixture) {
    var H = SG.techHelper;
    var model = modelOf(fixture);
    return fixture.after !== null
      ? H.stateAfter(model, fixture.givens, fixture.after)
      : H.makeState(model, fixture.givens, { propagate: fixture.propagate });
  }

  SG.fixtures.jigsawTechniques = {
    ids: Object.keys(BY_ID),
    byId: BY_ID,
    supplements: SUPPLEMENTS,
    modelOf: modelOf,
    stateOf: stateOf,
    below: { lawOfLeftovers: BELOW_LEFTOVERS },
    layouts: { wavy: WAVY, crossed: CROSSED, staggered: STAGGERED, mixed: MIXED, ordered: ORDERED, boxes: BOXES }
  };
})();
