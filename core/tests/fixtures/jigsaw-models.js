/**
 * Builder of 9x9 Jigsaw boards for the core suites, with no Generator or Player code: the model of a layout, a
 * check of the layout, its transposition and a few named layouts. Exposed as SG.fixtures.jigsawModels.
 *
 * A layout (`cellRegion`) lists, for each of the 81 cells row by row, the index 0-8 of its region. The text
 * form is nine strings of nine digits, one per row ("011222333" is row 1).
 *
 *   build(cellRegion)       the PuzzleModel of the board, the way the variant builds it: variantId 'jigsaw9', the
 *                           nine rows (kind 'row', R1-R9), the nine columns ('col', C1-C9), then the nine regions
 *                           ('region', J1-J9 by region index) as units, and `layout.cellRegion`.
 *   problems(cellRegion)    [] for a valid layout: 81 cells, nine regions of nine cells, each in one orthogonal piece
 *   transpose(cellRegion)   the layout with rows and columns exchanged (cell (r, c) takes the region of (c, r))
 *   solve(model, rng)       a random solution of a board built here, deterministic for the seed of `rng`
 *   parse(rows)             nine strings of nine digits -> a layout
 *   LAYOUTS                 named layouts in text form, each valid (see the suite that uses them)
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};
  SG.fixtures = SG.fixtures || {};

  var SIZE = 9;
  var CELLS = SIZE * SIZE;

  function parse(rows) {
    if (!Array.isArray(rows) || rows.length !== SIZE) throw new Error('a layout has ' + SIZE + ' rows');
    var out = [];
    rows.forEach(function (row) {
      if (typeof row !== 'string' || row.length !== SIZE) throw new Error('a layout row has ' + SIZE + ' digits');
      for (var c = 0; c < SIZE; c++) out.push(row.charCodeAt(c) - 48);
    });
    return out;
  }

  function problems(cellRegion) {
    var found = [];
    if (!cellRegion || cellRegion.length !== CELLS) return ['a layout lists ' + CELLS + ' cells'];
    var members = [];
    var g;
    for (g = 0; g < SIZE; g++) members.push([]);
    for (var cell = 0; cell < CELLS; cell++) {
      var region = cellRegion[cell];
      if (!(Number.isInteger(region) && region >= 0 && region < SIZE)) {
        return ['cell ' + cell + ' has the region ' + region];
      }
      members[region].push(cell);
    }
    for (g = 0; g < SIZE; g++) {
      if (members[g].length !== SIZE) found.push('region ' + g + ' has ' + members[g].length + ' cells');
      else if (reach(members[g], cellRegion, g) !== SIZE) found.push('region ' + g + ' is not in one piece');
    }
    return found;
  }

  /** Cells of region g reached from its first cell through orthogonal neighbours inside the region. */
  function reach(cells, cellRegion, g) {
    var seen = {};
    var queue = [cells[0]];
    seen[cells[0]] = true;
    var count = 0;
    while (queue.length > 0) {
      var cell = queue.pop();
      count++;
      var r = Math.floor(cell / SIZE);
      var c = cell % SIZE;
      [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(function (p) {
        if (p[0] < 0 || p[0] >= SIZE || p[1] < 0 || p[1] >= SIZE) return;
        var next = p[0] * SIZE + p[1];
        if (cellRegion[next] === g && !seen[next]) {
          seen[next] = true;
          queue.push(next);
        }
      });
    }
    return count;
  }

  function build(cellRegion) {
    var bad = problems(cellRegion);
    if (bad.length > 0) throw new Error('not a Jigsaw layout: ' + bad.join('; '));
    var cellRow = [];
    var cellCol = [];
    var units = [];
    var meta = [];
    var r;
    var c;
    for (r = 0; r < SIZE; r++) {
      for (c = 0; c < SIZE; c++) {
        cellRow.push(r);
        cellCol.push(c);
      }
    }
    for (r = 0; r < SIZE; r++) {
      var row = [];
      for (c = 0; c < SIZE; c++) row.push(r * SIZE + c);
      units.push(row);
      meta.push({ kind: 'row', gridIndex: 0, label: 'R' + (r + 1) });
    }
    for (c = 0; c < SIZE; c++) {
      var col = [];
      for (r = 0; r < SIZE; r++) col.push(r * SIZE + c);
      units.push(col);
      meta.push({ kind: 'col', gridIndex: 0, label: 'C' + (c + 1) });
    }
    for (var g = 0; g < SIZE; g++) {
      var cells = [];
      for (var cell = 0; cell < CELLS; cell++) if (cellRegion[cell] === g) cells.push(cell);
      units.push(cells);
      meta.push({ kind: 'region', gridIndex: 0, label: 'J' + (g + 1) });
    }
    return SG.model.create({
      variantId: 'jigsaw9',
      digits: SIZE,
      cellCount: CELLS,
      units: units,
      unitMeta: meta,
      layout: {
        rows: SIZE,
        cols: SIZE,
        cellRow: cellRow,
        cellCol: cellCol,
        cellRegion: cellRegion.slice(),
        subGrids: [{ gridIndex: 0, originRow: 0, originCol: 0 }]
      }
    });
  }

  function transpose(cellRegion) {
    var out = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) out.push(cellRegion[c * SIZE + r]);
    }
    return out;
  }

  var SOLVE_NODES = 2000;
  var SOLVE_RESTARTS = 400;

  /**
   * A random solution of a board of this builder, the same for the same `rng`: the depth-first search of the core
   * with a random order of digits, restarted with a fresh fork of `rng` whenever a try of SOLVE_NODES nodes runs
   * dry (an irregular board can send one search into a long dead end). Every unit of the board holds each digit once.
   */
  function solve(model, rng) {
    for (var attempt = 0; attempt < SOLVE_RESTARTS; attempt++) {
      var found = null;
      try {
        found = SG.dfs.solve(model, Int32Array.from(model.fixedCells), rng.fork('restart' + attempt),
          SG.budget.create({ nodes: SOLVE_NODES }));
      } catch (err) {
        if (!(err && err.code === 'budget.exceeded')) throw err;
      }
      if (found !== null) return found;
    }
    throw new Error('no solution found');
  }

  var LAYOUTS = {
    // The ordinary 3x3 boxes: a valid layout on which no choice of units leaves at most four cells over.
    boxes: [
      '000111222',
      '000111222',
      '000111222',
      '333444555',
      '333444555',
      '333444555',
      '666777888',
      '666777888',
      '666777888'
    ],
    // Regions that run along rows (found by a seeded search, then fixed): with rows as the lines, 18 choices of one
    // or two units leave one to four cells over on each side, among them singletons and sides whose cells can repeat.
    staggered: [
      '000002222',
      '002222211',
      '001111111',
      '333555555',
      '333454455',
      '366444444',
      '336888888',
      '666668887',
      '677777777'
    ],
    // A second layout of that kind (17 such choices with rows as the lines): single cells left over, and sides of
    // up to four cells that do not all see each other.
    wavy: [
      '000222222',
      '000002212',
      '011111111',
      '333335555',
      '333355545',
      '644444445',
      '666668848',
      '766768888',
      '777777788'
    ],
    // Rows near the top and columns near the right follow regions: 6 choices with rows as the lines and 6 with columns.
    mixed: [
      '000000022',
      '001222222',
      '111111112',
      '666647885',
      '644447855',
      '633347855',
      '633447885',
      '633347885',
      '637777855'
    ],
    // Exactly one choice with rows as the lines (the pair R1+R2 with J1+J2 of `crossed`), none of one row and one
    // region, but two choices of one column and one region (C6 with J6, C9 with J3) and two of two columns (C1+C2 with
    // J4+J7, C8+C9 with J3+J8): the order in which choices are tried (one unit before two, rows before columns) shows.
    ordered: [
      '000011112',
      '300001112',
      '330444512',
      '334445512',
      '333445222',
      '663455272',
      '668885577',
      '668885777',
      '666888777'
    ],
    // Exactly two choices, both of two rows and two regions (R1+R2 with J1+J2, R8+R9 with J8+J9), none of one unit
    // each, none with columns. The first leaves R1C9, R2C1, R2C9 and R3C3, R3C8, R4C8 over: on each side two cells do
    // not see each other, so a digit can occur twice.
    crossed: [
      '000011112',
      '300001112',
      '330444512',
      '333345512',
      '663345552',
      '666444452',
      '676688552',
      '776778882',
      '777788882'
    ]
  };

  SG.fixtures.jigsawModels = {
    SIZE: SIZE,
    parse: parse,
    problems: problems,
    build: build,
    transpose: transpose,
    solve: solve,
    LAYOUTS: LAYOUTS
  };
})();
