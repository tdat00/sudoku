// Fish techniques: X-Wing, Skyscraper, Two-string kite, Simple Colouring, Swordfish, Jellyfish
// (../core/js/engine/tech-fish.js).
//
// Fixtures: the published positions are the example boards of the SudokuWiki strategy pages (X-Wing,
// Swordfish, Jellyfish, Simple Colouring). Each one is the puzzle plus the candidate grid the page shows when
// the pattern applies, typed in as digit strings per cell (a solved cell is a one digit string). The page
// descriptions (digit, rows, columns, shape, the cells named in the text) are asserted, so a fixture is
// checked against what the source says, not only against the code under test.
// Every other check is built from the model's own units or from a solved grid, never from a published
// board, so it holds for any digit count. The Skyscraper and the Two-string kite (R11) have no published board
// in this suite: their geometry vectors are digit maps, every claim is also checked against an independent
// enumeration (`referenceSkyscrapers`, `referenceKites`) and their positions are the real unique puzzles of
// core/tests/fixtures/techniques.js.
(function () {
  'use strict';

  const root = typeof self !== 'undefined' ? self : globalThis;
  const SG = root.SG;
  const H = SG.techHelper;
  const model9 = H.model('classic9');

  const ALL_IDS = ['xWing', 'skyscraper', 'twoStringKite', 'simpleColouring', 'swordfish', 'jellyfish'];
  // The techniques that scan every digit and orientation with a budget check of their own.
  const SCAN_IDS = ['xWing', 'simpleColouring', 'swordfish', 'jellyfish'];
  const FISH_IDS = ['xWing', 'swordfish', 'jellyfish'];
  const FISH_SIZE = { xWing: 2, swordfish: 3, jellyfish: 4 };

  // Published positions
  const PUBLISHED = {
    xWing1: {
      puzzle: '100000569402000008050009040000640801000010000208035000040500010900000402621000005',
      grid: [
        '1 378 37 23478 278 23478 5 6 9',
        '4 9 2 37 5 6 1 37 8',
        '378 5 6 1 78 9 2 4 37',
        '357 37 9 6 4 27 8 25 1',
        '57 6 4 2789 1 278 379 25 37',
        '2 1 8 79 3 5 6 79 4',
        '378 4 37 5 2789 2378 379 1 6',
        '9 378 5 378 6 1 4 378 2',
        '6 2 1 3478 789 3478 379 3789 5'
      ]
    },
    xWing2: {
      puzzle: '000000004760010050090002081070050010000709000080030060240100070010090045900000000',
      grid: [
        '1358 235 12358 3568 678 35678 67 9 4',
        '7 6 48 9 1 48 23 5 23',
        '345 9 345 3456 467 2 67 8 1',
        '346 7 23469 2468 5 468 23489 1 2389',
        '13456 235 123456 7 2468 9 23458 23 238',
        '45 8 2459 24 3 1 2459 6 7',
        '2 4 3568 1 68 3568 389 7 3689',
        '368 1 3678 2368 9 3678 238 4 5',
        '9 35 35678 234568 24678 345678 1 23 2368'
      ]
    },
    xWing3: {
      puzzle: '000000004760010050090002081070050010000709000080030060240100070010090045900000000',
      grid: [
        '1358 2 1358 3568 678 35678 67 9 4',
        '7 6 48 9 1 48 23 5 23',
        '345 9 345 3456 467 2 67 8 1',
        '346 7 29 2468 5 468 23489 1 2389',
        '13456 35 13456 7 2468 9 3458 23 38',
        '45 8 29 24 3 1 2459 6 7',
        '2 4 3568 1 68 3568 389 7 3689',
        '368 1 3678 2368 9 3678 238 4 5',
        '9 35 35678 34568 24678 345678 1 23 368'
      ]
    },
    swordfish333: {
      puzzle: '500010003006003002003200000002300076000050000190007500000009400200800600900040005',
      grid: [
        '5 2 9 4 1 68 7 68 3',
        '478 148 6 59 789 3 18 14589 2',
        '478 148 3 2 789 56 189 56 1489',
        '48 5 2 3 89 148 189 7 6',
        '6 3 7 19 5 148 2 1489 1489',
        '1 9 48 6 2 7 5 3 48',
        '3 78 158 15 6 9 4 2 178',
        '2 47 145 8 3 15 6 19 179',
        '9 6 18 7 4 2 3 18 5'
      ]
    },
    swordfish222: {
      puzzle: '900000000037010420840000603000034810000060000068120000102000084085070360000000001',
      grid: [
        '9 2 6 3458 48 3578 1 57 578',
        '5 3 7 689 1 689 4 2 89',
        '8 4 1 259 59 2579 6 579 3',
        '2 5 9 7 3 4 8 1 6',
        '7 1 4 589 6 589 259 3 259',
        '3 6 8 1 2 59 579 4 579',
        '1 79 2 36 59 36 579 8 4',
        '4 8 5 29 7 1 3 6 29',
        '6 79 3 24589 48 2589 2579 579 1'
      ]
    },
    swordfish323: {
      puzzle: '020040069003806200060020000890500010000000000030001026000010070009604300270050090',
      grid: [
        '157 2 1578 17 4 3 1578 6 9',
        '1457 145 3 8 9 6 2 45 1457',
        '9 6 1478 17 2 5 1478 3 1478',
        '8 9 247 5 6 27 47 1 3',
        '6 145 12457 249 3 279 45789 458 4578',
        '457 3 457 49 8 1 4579 2 6',
        '3 458 456 29 1 29 4568 7 458',
        '15 158 9 6 7 4 3 58 2',
        '2 7 46 3 5 8 146 9 14'
      ]
    },
    jellyfish: {
      puzzle: '000060500040308000009004000024000910030000060081000200000900600000401050007030080',
      grid: [
        '1238 17 238 127 6 279 5 2349 12348',
        '125 4 26 3 12579 8 17 29 167',
        '12358 167 9 1257 1257 4 1378 237 123678',
        '67 2 4 8 57 356 9 1 357',
        '79 3 5 12 1249 29 478 6 478',
        '679 8 1 567 49 356 2 347 345',
        '14 5 238 9 278 27 6 2347 1247',
        '238 69 2368 4 278 1 37 5 279',
        '124 19 7 56 3 56 14 8 29'
      ]
    },
    jellyfishPerfect: {
      puzzle: '050740080089003000600001300040007060000000809000000000060004010500200007010005030',
      grid: [
        '123 5 123 7 4 9 126 8 126',
        '124 8 9 56 256 3 47 257 1245',
        '6 27 247 58 258 1 3 9 245',
        '2389 4 2358 13589 3589 7 125 6 1235',
        '1237 237 123567 4 356 26 8 257 9',
        '23789 2379 235678 135689 35689 268 47 257 12345',
        '2789 6 278 389 3789 4 259 1 258',
        '5 39 38 2 1 68 69 4 7',
        '24789 1 2478 689 6789 5 269 3 268'
      ]
    },
    // "20 eliminations" and "18 elimination Jellyfish": only the puzzles are published, no candidate grid.
    // They are taken to the position where the singles are used up, which is where the page needs them.
    jellyfish20: {
      puzzle: '000000000017020803003000204084053706000000000072010005048071502035040601000000000',
      grid: null
    },
    jellyfish18: {
      puzzle: '000000000070030920019025630004000210000000000057090460095140370000000000042367590',
      grid: null
    },
    colourWrap: {
      puzzle: '000000030002090500080706004900054006030000070600380009300601020007020600060000000',
      grid: [
        '17 9 6 5 4 2 178 3 178',
        '147 14 2 8 9 3 5 6 17',
        '5 8 3 7 1 6 2 9 4',
        '9 7 18 2 5 4 3 18 6',
        '48 3 5 1 6 9 48 7 2',
        '6 2 14 3 8 7 14 5 9',
        '3 45 489 6 7 1 89 2 58',
        '18 15 7 9 2 58 6 4 3',
        '2 6 89 4 3 58 1789 18 1578'
      ]
    },
    colourTrap1: {
      puzzle: '000000050050409000008060400860010500001040700009050083006090300000108090040000000',
      grid: [
        '67 1 4 3 278 27 9 5 68',
        '367 5 237 4 78 9 28 13 168',
        '23 9 8 5 6 1 4 23 7',
        '8 6 37 9 1 37 5 4 2',
        '5 23 1 8 4 23 7 6 9',
        '4 27 9 27 5 6 1 8 3',
        '1 8 6 27 9 4 3 27 5',
        '237 37 5 1 237 8 6 9 4',
        '9 4 237 6 37 5 28 17 18'
      ]
    },
    colourTrap2: {
      puzzle: '000000050050409000008060400860010500001040700009050083006090300000108090040000000',
      grid: [
        '67 1 4 3 278 27 9 5 68',
        '367 5 237 4 78 9 28 13 168',
        '23 9 8 5 6 1 4 23 7',
        '8 6 37 9 1 37 5 4 2',
        '5 23 1 8 4 23 7 6 9',
        '4 27 9 27 5 6 1 8 3',
        '1 8 6 27 9 4 3 27 5',
        '237 37 5 1 23 8 6 9 4',
        '9 4 23 6 37 5 28 17 18'
      ]
    }
  };

  /** What the page says (and the code must find) for each published position. */
  const SPECS = {
    xWing1: {
      id: 'xWing', digit: 7, orientation: 'row', base: ['R2', 'R6'], cover: ['C4', 'C8'],
      cells: ['R2C4', 'R2C8', 'R6C4', 'R6C8'],
      eliminations: ['R1C4', 'R5C4', 'R8C4', 'R8C8', 'R9C4', 'R9C8']
    },
    // "Example 2": candidate 2 in columns 5 and 8, rows E and J; "six other 2s in the rows can be removed".
    xWing2: {
      id: 'xWing', digit: 2, orientation: 'col', base: ['C5', 'C8'], cover: ['R5', 'R9'],
      cells: ['R5C5', 'R9C5', 'R5C8', 'R9C8'],
      eliminations: ['R5C2', 'R5C3', 'R5C7', 'R5C9', 'R9C4', 'R9C9']
    },
    // "Example 3": candidate 3, rows E and J (5 and 9), columns 2 and 8.
    xWing3: {
      id: 'xWing', digit: 3, orientation: 'col', base: ['C2', 'C8'], cover: ['R5', 'R9'],
      cells: ['R5C2', 'R9C2', 'R5C8', 'R9C8'],
      eliminations: ['R5C1', 'R5C3', 'R5C7', 'R5C9', 'R9C3', 'R9C4', 'R9C6', 'R9C9']
    },
    // "Perfect 3-3-3 Swordfish": candidate 8, all three candidates present in each of three columns.
    swordfish333: {
      id: 'swordfish', digit: 8, orientation: 'col', base: ['C1', 'C5', 'C7'], cover: ['R2', 'R3', 'R4'],
      cells: ['R2C1', 'R3C1', 'R4C1', 'R2C5', 'R3C5', 'R4C5', 'R2C7', 'R3C7', 'R4C7'],
      eliminations: ['R2C2', 'R2C8', 'R3C2', 'R3C9', 'R4C6']
    },
    // "Swordfish Example 1": a 2-2-2 formation in columns, "six 9s that can go in one swoop".
    swordfish222: {
      id: 'swordfish', digit: 9, orientation: 'col', base: ['C2', 'C5', 'C8'], cover: ['R3', 'R7', 'R9'],
      cells: ['R7C2', 'R9C2', 'R3C5', 'R7C5', 'R3C8', 'R9C8'],
      eliminations: ['R3C4', 'R3C6', 'R7C7', 'R9C4', 'R9C6', 'R9C7']
    },
    // "Swordfish example 2": the opposite orientation, rows C, D, J and columns 3, 7, 9 (3-2-3). The board
    // also holds a column based Swordfish of the same digit, which the turned board meets first (noFlip).
    swordfish323: {
      id: 'swordfish', digit: 4, orientation: 'row', base: ['R3', 'R4', 'R9'], cover: ['C3', 'C7', 'C9'],
      noFlip: true,
      cells: ['R3C3', 'R3C7', 'R3C9', 'R4C3', 'R4C7', 'R9C3', 'R9C7', 'R9C9'],
      eliminations: ['R2C9', 'R5C3', 'R5C7', 'R5C9', 'R6C3', 'R6C7', 'R7C3', 'R7C7', 'R7C9']
    },
    // "Example Jellyfish": candidate 7 in rows B, D, E, H on columns 1, 5, 7, 9. The board also holds a
    // column based Jellyfish of the same digit, which the turned board meets first (noFlip).
    jellyfish: {
      id: 'jellyfish', digit: 7, orientation: 'row', base: ['R2', 'R4', 'R5', 'R8'],
      cover: ['C1', 'C5', 'C7', 'C9'], noFlip: true,
      cells: ['R2C5', 'R2C7', 'R2C9', 'R4C1', 'R4C5', 'R4C9', 'R5C1', 'R5C7', 'R5C9', 'R8C5', 'R8C7', 'R8C9'],
      eliminations: ['R3C5', 'R3C7', 'R3C9', 'R6C1', 'R7C5', 'R7C9']
    },
    // "Perfect Jellyfish": candidate 2 still present in all sixteen cells of the pattern. The board also
    // holds a column based Jellyfish of the same digit, which the turned board meets first (noFlip).
    jellyfishPerfect: {
      id: 'jellyfish', digit: 2, orientation: 'row', base: ['R1', 'R4', 'R7', 'R9'],
      cover: ['C1', 'C3', 'C7', 'C9'], noFlip: true,
      cells: ['R1C1', 'R1C3', 'R1C7', 'R1C9', 'R4C1', 'R4C3', 'R4C7', 'R4C9', 'R7C1', 'R7C3', 'R7C7', 'R7C9',
        'R9C1', 'R9C3', 'R9C7', 'R9C9'],
      eliminations: ['R2C1', 'R2C9', 'R3C3', 'R3C9', 'R5C1', 'R5C3', 'R6C1', 'R6C3', 'R6C9']
    },
    // "20 eliminations": a maximal Jellyfish "taking off all twenty 9s" (5 rows x 4 columns), reached from
    // the start with singles only. Same noFlip reason as above.
    jellyfish20: {
      id: 'jellyfish', digit: 9, orientation: 'row', base: ['R2', 'R4', 'R7', 'R8'],
      cover: ['C1', 'C4', 'C6', 'C8'], noFlip: true,
      cells: ['R2C1', 'R2C4', 'R2C6', 'R2C8', 'R4C1', 'R4C4', 'R4C8', 'R7C1', 'R7C4', 'R7C8', 'R8C1', 'R8C4',
        'R8C6', 'R8C8'],
      eliminations: ['R1C1', 'R1C4', 'R1C6', 'R1C8', 'R3C1', 'R3C4', 'R3C6', 'R3C8', 'R5C1', 'R5C4', 'R5C6',
        'R5C8', 'R6C1', 'R6C4', 'R6C6', 'R6C8', 'R9C1', 'R9C4', 'R9C6', 'R9C8']
    },
    // "Rule 2": candidate 8, two cells of one colour in row J (J6 and J8); all of that colour go.
    colourWrap: {
      id: 'simpleColouring', digit: 8, rule: 'wrap',
      cells: ['R4C3', 'R4C8', 'R5C1', 'R5C7', 'R8C1', 'R8C6', 'R9C6', 'R9C8'],
      eliminations: ['R4C3', 'R5C7', 'R8C1', 'R9C6', 'R9C8']
    },
    // "Rule 4": candidate 7, J3 sees both ends of the chain (H2 and J8), and so does H5.
    colourTrap1: {
      id: 'simpleColouring', digit: 7, rule: 'trap',
      cells: ['R1C6', 'R4C3', 'R4C6', 'R6C2', 'R6C4', 'R7C4', 'R7C8', 'R8C2', 'R9C8'],
      eliminations: ['R8C5', 'R9C3']
    },
    // The next position of that page, "a couple more candidates with the same rule".
    colourTrap2: {
      id: 'simpleColouring', digit: 7, rule: 'trap',
      cells: ['R1C6', 'R2C3', 'R4C3', 'R4C6', 'R6C2', 'R6C4', 'R7C4', 'R7C8', 'R8C1', 'R8C2', 'R9C5', 'R9C8'],
      eliminations: ['R1C1', 'R2C5']
    }
  };

  function candidateTokens(fixture) {
    return fixture.grid === null ? undefined : fixture.grid.join(' ').split(' ');
  }

  function publishedState(key) {
    const fixture = PUBLISHED[key];
    return H.makeState(model9, fixture.puzzle, { candidates: candidateTokens(fixture) });
  }

  function pairs(digit, labels) {
    return labels.map(function (label) { return [label, digit]; });
  }

  function expectedOf(spec) {
    const expected = { cells: spec.cells, eliminations: pairs(spec.digit, spec.eliminations), args: {} };
    expected.args.digit = spec.digit;
    if (spec.rule) {
      expected.args.rule = spec.rule;
    } else {
      expected.args.size = FISH_SIZE[spec.id];
      expected.args.orientation = spec.orientation;
      expected.args.baseUnits = spec.base;
      expected.args.coverUnits = spec.cover;
    }
    return expected;
  }

  // Transposition: a published board turned on its diagonal is a valid board that swaps rows and columns
  function transposeRef(ref) {
    const m = /^R(\d+)C(\d+)$/.exec(ref);
    return 'R' + m[2] + 'C' + m[1];
  }

  function transposeUnit(label) {
    return (label.charAt(0) === 'R' ? 'C' : 'R') + label.slice(1);
  }

  function transposeCells(text, wrap) {
    const out = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) out[c * 9 + r] = text[r * 9 + c];
    }
    return wrap(out);
  }

  function transposedState(key) {
    const fixture = PUBLISHED[key];
    const puzzle = transposeCells(fixture.puzzle, function (cells) { return cells.join(''); });
    const tokens = candidateTokens(fixture);
    const grid = tokens === undefined ? undefined : transposeCells(tokens, function (cells) {
      return cells;
    });
    return H.makeState(model9, puzzle, { candidates: grid });
  }

  function transposedSpec(spec) {
    const out = Object.assign({}, spec);
    out.cells = spec.cells.map(transposeRef);
    out.eliminations = spec.eliminations.map(transposeRef);
    if (spec.rule === undefined) {
      out.orientation = spec.orientation === 'row' ? 'col' : 'row';
      out.base = spec.base.map(transposeUnit);
      out.cover = spec.cover.map(transposeUnit);
    }
    return out;
  }

  // Models for the generic tests
  /**
   * A classic style grid: rows, columns and boxes of boxRows x boxCols cells (digits = boxRows * boxCols).
   * `extraRows` adds more units of kind 'row' (lists of cells) to imitate overlapping sub-grids. `options`:
   * `extraBoxes` lists box numbers (0-based) whose cells are listed once more as a second unit of kind 'box'
   * (an overlapped box of a multi-grid board belongs to two grids); `extraRegions` lists them as a second unit
   * of kind 'region' (a box-like unit of the other kind: the owners are counted over both kinds); `columnsFirst`
   * puts the columns before the rows in the unit list (the unit order of a multi-grid board does not keep rows
   * first); `noBoxes` leaves the boxes out (a Latin square: only rows and columns).
   */
  function buildGridModel(variantId, boxRows, boxCols, extraRows, options) {
    const opts = options || {};
    const D = boxRows * boxCols;
    const n = D * D;
    const cellRow = new Int32Array(n);
    const cellCol = new Int32Array(n);
    const cellRegion = new Int32Array(n);
    const units = [];
    const unitMeta = [];
    for (let r = 0; r < D; r++) {
      for (let c = 0; c < D; c++) {
        cellRow[r * D + c] = r;
        cellCol[r * D + c] = c;
        cellRegion[r * D + c] = Math.floor(r / boxRows) * (D / boxCols) + Math.floor(c / boxCols);
      }
    }
    const rowUnits = [];
    const rowMeta = [];
    for (let r = 0; r < D; r++) {
      rowUnits.push(Array.from({ length: D }, function (_, c) { return r * D + c; }));
      rowMeta.push({ kind: 'row', gridIndex: 0, label: 'R' + (r + 1) });
    }
    const colUnits = [];
    const colMeta = [];
    for (let c = 0; c < D; c++) {
      colUnits.push(Array.from({ length: D }, function (_, r) { return r * D + c; }));
      colMeta.push({ kind: 'col', gridIndex: 0, label: 'C' + (c + 1) });
    }
    const first = opts.columnsFirst ? [colUnits, colMeta] : [rowUnits, rowMeta];
    const second = opts.columnsFirst ? [rowUnits, rowMeta] : [colUnits, colMeta];
    units.push.apply(units, first[0]);
    unitMeta.push.apply(unitMeta, first[1]);
    units.push.apply(units, second[0]);
    unitMeta.push.apply(unitMeta, second[1]);
    const boxCells = [];
    for (let b = 0; b < D; b++) {
      const top = Math.floor(b / (D / boxCols)) * boxRows;
      const left = (b % (D / boxCols)) * boxCols;
      const cells = [];
      for (let r = 0; r < boxRows; r++) {
        for (let c = 0; c < boxCols; c++) cells.push((top + r) * D + left + c);
      }
      boxCells.push(cells);
      if (opts.noBoxes) continue;
      units.push(cells);
      unitMeta.push({ kind: 'box', gridIndex: 0, label: 'B' + (b + 1) });
    }
    (extraRows || []).forEach(function (cells, i) {
      units.push(cells);
      unitMeta.push({ kind: 'row', gridIndex: 1, label: 'X' + (i + 1) });
    });
    (opts.extraBoxes || []).forEach(function (b) {
      units.push(boxCells[b].slice());
      unitMeta.push({ kind: 'box', gridIndex: 1, label: 'G2-B' + (b + 1) });
    });
    (opts.extraRegions || []).forEach(function (b) {
      units.push(boxCells[b].slice());
      unitMeta.push({ kind: 'region', gridIndex: 1, label: 'G2-J' + (b + 1) });
    });
    return SG.model.create({
      variantId: variantId, digits: D, cellCount: n, units: units, unitMeta: unitMeta,
      layout: { rows: D, cols: D, cellRow: cellRow, cellCol: cellCol, cellRegion: cellRegion }
    });
  }

  const gridModels = {};

  /** classic4/6/9 from the registry, 12 and 16 digit grids built here (those variants come later). */
  function modelOfDigits(D) {
    if (D === 4 || D === 6 || D === 9) return H.model('classic' + D);
    if (!gridModels[D]) {
      gridModels[D] = D === 12 ? buildGridModel('fishTest12', 3, 4) : buildGridModel('fishTest16', 4, 4);
    }
    return gridModels[D];
  }

  // The regions of the registry's jigsaw9 board of the Generator (nine irregular regions, '1' to '9', and no box),
  // written out so that the positions and the counts of the tests do not depend on the layout that an
  // environment's own jigsaw9 model has (the Player's is another one).
  const JIGSAW_LAYOUT = ['111222233', '112224443', '152244463', '155544463', '155566663', '155666733',
    '888997773', '888999777', '888999977'];

  /** A board of rows, columns and the regions of a layout of D rows of D digits, in that unit order. */
  function regionBoard(variantId, layout) {
    const D = layout.length;
    const n = D * D;
    const units = [];
    const unitMeta = [];
    const cellRow = new Int32Array(n);
    const cellCol = new Int32Array(n);
    const cellRegion = new Int32Array(n);
    for (let c = 0; c < n; c++) {
      cellRow[c] = Math.floor(c / D);
      cellCol[c] = c % D;
    }
    for (let r = 0; r < D; r++) {
      units.push(Array.from({ length: D }, function (_, c) { return r * D + c; }));
      unitMeta.push({ kind: 'row', gridIndex: 0, label: 'R' + (r + 1) });
    }
    for (let c = 0; c < D; c++) {
      units.push(Array.from({ length: D }, function (_, r) { return r * D + c; }));
      unitMeta.push({ kind: 'col', gridIndex: 0, label: 'C' + (c + 1) });
    }
    for (let k = 0; k < D; k++) {
      const cells = [];
      for (let c = 0; c < n; c++) {
        if (layout[Math.floor(c / D)].charAt(c % D) === String(k + 1)) cells.push(c);
      }
      cells.forEach(function (c) { cellRegion[c] = k; });
      units.push(cells);
      unitMeta.push({ kind: 'region', gridIndex: 0, label: 'J' + (k + 1) });
    }
    return SG.model.create({
      variantId: variantId, digits: D, cellCount: n, units: units, unitMeta: unitMeta,
      layout: { rows: D, cols: D, cellRow: cellRow, cellCol: cellCol, cellRegion: cellRegion }
    });
  }

  const regionBoards = {};

  /**
   * The jigsaw board of JIGSAW_LAYOUT or, with `turned`, the same board turned on its diagonal: rows and columns
   * swap and every region is turned with them, which gives another irregular layout.
   */
  function jigsawBoard(turned) {
    const key = turned ? 'jigsawLayoutTurned' : 'jigsawLayout';
    if (!regionBoards[key]) {
      regionBoards[key] = regionBoard(key, turned ? JIGSAW_LAYOUT.map(function (_, r) {
        return JIGSAW_LAYOUT.map(function (row) { return row.charAt(r); }).join('');
      }) : JIGSAW_LAYOUT);
    }
    return regionBoards[key];
  }

  const solutions = {};

  function solutionOf(model) {
    if (!solutions[model.variantId]) {
      solutions[model.variantId] = SG.testkit.randomSolution(model, SG.testkit.rng.create(4242));
    }
    return solutions[model.variantId];
  }

  function blankPuzzle(model) {
    return '.'.repeat(model.cellCount);
  }

  // Helpers that read units from the model
  function unitsOfKind(model, kind) {
    const out = [];
    model.unitMeta.forEach(function (meta, u) {
      if (meta.kind === kind) out.push(u);
    });
    return out;
  }

  /** The unit of the given kind that holds the cell (rows and columns: exactly one in these models). */
  function crossUnit(model, cell, kind) {
    for (let i = 0; i < model.cellUnits[cell].length; i++) {
      const u = model.cellUnits[cell][i];
      if (model.unitMeta[u].kind === kind) return u;
    }
    return -1;
  }

  function unitLabel(model, u) {
    return model.unitMeta[u].label;
  }

  function check(condition, message) {
    if (!condition) throw new SG.test.AssertionError(message);
  }

  function runFind(id, model, state, ctxOptions) {
    return SG.techniques.get(id).find(model, state, SG.techniques.createContext(model, ctxOptions || {}));
  }

  /**
   * The "18 elimination" puzzle holds a row Jellyfish and a column Jellyfish on digit 8. The row one is
   * found first; once it is applied, the column one (columns C2 C5 C7 C8 on rows 1 4 5 8) is what is left.
   */
  function expectColumnJellyfishOf18() {
    const state = publishedState('jellyfish18');
    const first = runFind('jellyfish', model9, state);
    expect(first.i18nArgs.orientation).toBe('row');
    first.eliminations.forEach(function (e) { SG.constraints.eliminate(model9, state, e[0], e[1]); });
    H.expectFinding(SG.test, 'jellyfish', state, {
      cells: ['R1C2', 'R4C2', 'R5C2', 'R8C2', 'R1C5', 'R4C5', 'R5C5', 'R8C5', 'R1C7', 'R5C7', 'R8C7', 'R1C8',
        'R5C8', 'R8C8'],
      eliminations: [['R1C3', 8], ['R5C3', 8], ['R8C3', 8]],
      args: { digit: 8, size: 4, orientation: 'col', baseUnits: ['C2', 'C5', 'C7', 'C8'],
        coverUnits: ['R1', 'R4', 'R5', 'R8'] }
    });
  }

  // Fish built from a solved grid: the digit is removed from base-line cells that the pattern does not use
  /**
   * A state with every candidate of the solved grid except for one digit, which is cut down in `size`
   * base lines to a fish pattern that contains the true cells. Base lines are spread over the board.
   * @returns {{state, cells: number[], eliminations: Array, args: Object, solution: Int32Array}}
   */
  function buildFish(model, orientation, size, options) {
    const opts = options || {};
    const solution = solutionOf(model);
    const D = model.digits;
    const digit = orientation === 'row' ? D : 1;
    const coverKind = orientation === 'row' ? 'col' : 'row';
    const lines = unitsOfKind(model, orientation);
    const baseUnits = [];
    for (let i = 0; i < size; i++) baseUnits.push(lines[Math.floor(i * D / size)]);
    const covers = baseUnits.map(function (u) {
      const own = Array.from(model.units[u]).filter(function (c) { return solution[c] === digit; })[0];
      return crossUnit(model, own, coverKind);
    });

    const keep = new Set();
    baseUnits.forEach(function (u, i) {
      const wanted = i === size - 1 ? covers : [covers[i], covers[(i + 1) % size]];
      Array.from(model.units[u]).forEach(function (c) {
        if (wanted.indexOf(crossUnit(model, c, coverKind)) !== -1) keep.add(c);
      });
    });

    const inBase = new Set();
    baseUnits.forEach(function (u) { Array.from(model.units[u]).forEach(function (c) { inBase.add(c); }); });
    const removed = [];
    inBase.forEach(function (c) { if (!keep.has(c)) removed.push([c, digit]); });
    const eliminated = [];
    covers.forEach(function (u) {
      Array.from(model.units[u]).forEach(function (c) {
        if (!inBase.has(c)) eliminated.push([c, digit]);
      });
    });
    if (opts.clean) eliminated.forEach(function (pair) { removed.push(pair); });

    return {
      state: H.makeState(model, blankPuzzle(model), { eliminate: removed, propagate: false }),
      cells: Array.from(keep),
      eliminations: eliminated,
      solution: solution,
      args: {
        digit: digit,
        size: size,
        orientation: orientation,
        baseUnits: baseUnits.map(function (u) { return unitLabel(model, u); }),
        coverUnits: covers.slice().sort(function (a, b) { return a - b; }).map(function (u) {
          return unitLabel(model, u);
        })
      }
    };
  }

  // Synthetic digit maps (Simple Colouring): the digit stays only on the listed cells
  function digitMap(model, digit, labels) {
    const keep = new Set(labels.map(function (label) { return H.cell(model, label); }));
    const eliminate = [];
    for (let c = 0; c < model.cellCount; c++) {
      if (!keep.has(c)) eliminate.push([c, digit]);
    }
    return H.makeState(model, blankPuzzle(model), { eliminate: eliminate, propagate: false });
  }

  // Brute-force references
  function combinations(list, k) {
    const out = [];
    (function pick(start, chosen) {
      if (chosen.length === k) {
        out.push(chosen.slice());
        return;
      }
      for (let i = start; i < list.length; i++) {
        chosen.push(list[i]);
        pick(i + 1, chosen);
        chosen.pop();
      }
    })(0, []);
    return out;
  }

  /** Every elimination ('cell:digit') of every basic fish of this size, by plain enumeration. */
  function referenceFish(model, state, size) {
    const found = new Set();
    const cand = state.candidates;
    const val = state.value;
    for (let d = 1; d <= model.digits; d++) {
      const bit = 1 << (d - 1);
      ['row', 'col'].forEach(function (kind) {
        const coverKind = kind === 'row' ? 'col' : 'row';
        const bases = [];
        unitsOfKind(model, kind).forEach(function (u) {
          const cells = Array.from(model.units[u]);
          if (cells.some(function (c) { return val[c] === d; })) return;
          const open = cells.filter(function (c) { return val[c] === 0 && (cand[c] & bit) !== 0; });
          if (open.length < 2) return;
          bases.push({
            cells: new Set(cells),
            covers: new Set(open.map(function (c) { return crossUnit(model, c, coverKind); }))
          });
        });
        combinations(bases, size).forEach(function (combo) {
          const covers = new Set();
          combo.forEach(function (b) { b.covers.forEach(function (u) { covers.add(u); }); });
          if (covers.size !== size) return;
          covers.forEach(function (u) {
            Array.from(model.units[u]).forEach(function (c) {
              const inBase = combo.some(function (b) { return b.cells.has(c); });
              if (val[c] === 0 && (cand[c] & bit) !== 0 && !inBase) found.add(c + ':' + d);
            });
          });
        });
      });
    }
    return found;
  }

  /**
   * Every elimination of Simple Colouring, derived from what each component allows: a colour that puts two
   * true cells into one unit is impossible (the other colour is true and the impossible colour is cleared);
   * when both colours are possible, a cell outside the component that sees both colours cannot be the digit.
   */
  function referenceColouring(model, state) {
    const found = new Set();
    const cand = state.candidates;
    const val = state.value;
    for (let d = 1; d <= model.digits; d++) {
      const bit = 1 << (d - 1);
      const open = [];
      for (let c = 0; c < model.cellCount; c++) {
        if (val[c] === 0 && (cand[c] & bit) !== 0) open.push(c);
      }
      const adjacent = new Map();
      model.units.forEach(function (cells) {
        if (cells.length !== model.digits) return;
        const list = Array.from(cells);
        if (list.some(function (c) { return val[c] === d; })) return;
        const here = list.filter(function (c) { return val[c] === 0 && (cand[c] & bit) !== 0; });
        if (here.length !== 2) return;
        [[here[0], here[1]], [here[1], here[0]]].forEach(function (link) {
          if (!adjacent.has(link[0])) adjacent.set(link[0], []);
          adjacent.get(link[0]).push(link[1]);
        });
      });
      const colour = new Map();
      open.forEach(function (start) {
        if (!adjacent.has(start) || colour.has(start)) return;
        const comp = [start];
        let consistent = true;
        colour.set(start, 0);
        for (let head = 0; head < comp.length; head++) {
          adjacent.get(comp[head]).forEach(function (next) {
            if (!colour.has(next)) {
              colour.set(next, 1 - colour.get(comp[head]));
              comp.push(next);
            } else if (colour.get(next) === colour.get(comp[head])) {
              consistent = false;
            }
          });
        }
        if (!consistent) return;
        const sides = [0, 1].map(function (k) {
          return comp.filter(function (c) { return colour.get(c) === k; });
        });
        const sees = function (a, b) { return Array.from(model.peers[a]).indexOf(b) !== -1; };
        const possible = sides.map(function (side) {
          return !side.some(function (a) {
            return side.some(function (b) { return a !== b && sees(a, b); });
          });
        });
        if (possible[0] !== possible[1]) {
          sides[possible[0] ? 1 : 0].forEach(function (c) { found.add(c + ':' + d); });
        } else if (possible[0]) {
          open.forEach(function (z) {
            if (comp.indexOf(z) !== -1) return;
            if (sides[0].some(function (a) { return sees(a, z); }) &&
                sides[1].some(function (b) { return sees(b, z); })) {
              found.add(z + ':' + d);
            }
          });
        }
      });
    }
    return found;
  }

  function strongLinkCount(model, state) {
    let count = 0;
    for (let d = 1; d <= model.digits; d++) {
      const bit = 1 << (d - 1);
      model.units.forEach(function (cells) {
        if (cells.length !== model.digits) return;
        let placed = false;
        let open = 0;
        for (let i = 0; i < cells.length; i++) {
          if (state.value[cells[i]] === d) placed = true;
          else if (state.value[cells[i]] === 0 && (state.candidates[cells[i]] & bit) !== 0) open++;
        }
        if (!placed && open === 2) count++;
      });
    }
    return count;
  }

  const peerSets = new WeakMap();

  /** model.peers as Sets, made once per model. */
  function peerSetsOf(model) {
    let sets = peerSets.get(model);
    if (!sets) {
      sets = Array.from(model.peers, function (list) { return new Set(list); });
      peerSets.set(model, sets);
    }
    return sets;
  }

  /**
   * Every skyscraper of a state (R11) by plain enumeration from the model's units, with none of the tables of
   * tech-fish.js. A base line is a complete unit of the kind ('row' or 'col') none of whose cells lies in another
   * complete unit of that kind, in which the digit is not placed and exactly two open cells can still be the
   * digit, each in exactly one complete unit of the other kind (its cover line). Two base lines are a skyscraper
   * when exactly one cover line holds a cell of each: those two cells are the roots, the other two the ends (two
   * shared cover lines are an X-Wing, none is no pattern). The targets are the open cells that still have the
   * digit, are none of the four cells and see both ends.
   * @returns {Array<{digit, kind, lines, roots, ends, targets}>} patterns without a target included, in the
   *   order digit, rows then columns, line pair
   */
  function referenceSkyscrapers(model, state) {
    const found = [];
    const cand = state.candidates;
    const val = state.value;
    const peers = peerSetsOf(model);
    const isComplete = function (u) {
      return model.units[u].length === model.digits && !(model.unitMeta[u] && model.unitMeta[u].partial);
    };
    const linesOf = function (cell, kind) {
      return Array.from(model.cellUnits[cell]).filter(function (u) {
        return model.unitMeta[u].kind === kind && isComplete(u);
      });
    };
    for (let d = 1; d <= model.digits; d++) {
      const bit = 1 << (d - 1);
      ['row', 'col'].forEach(function (kind) {
        const other = kind === 'row' ? 'col' : 'row';
        const bases = [];
        unitsOfKind(model, kind).forEach(function (u) {
          if (!isComplete(u)) return;
          const cells = Array.from(model.units[u]);
          if (cells.some(function (c) { return linesOf(c, kind).length !== 1; })) return;
          if (cells.some(function (c) { return val[c] === d; })) return;
          const open = cells.filter(function (c) { return val[c] === 0 && (cand[c] & bit) !== 0; });
          if (open.length !== 2) return;
          const covers = open.map(function (c) { return linesOf(c, other); });
          if (covers.some(function (list) { return list.length !== 1; })) return;
          bases.push({ unit: u, cells: open, covers: covers.map(function (list) { return list[0]; }) });
        });
        for (let i = 0; i < bases.length; i++) {
          for (let j = i + 1; j < bases.length; j++) {
            const shared = [];
            for (let p = 0; p < 2; p++) {
              for (let q = 0; q < 2; q++) {
                if (bases[i].covers[p] === bases[j].covers[q]) shared.push([p, q]);
              }
            }
            if (shared.length !== 1) continue;
            const roots = [bases[i].cells[shared[0][0]], bases[j].cells[shared[0][1]]];
            const ends = [bases[i].cells[1 - shared[0][0]], bases[j].cells[1 - shared[0][1]]];
            const targets = [];
            for (let c = 0; c < model.cellCount; c++) {
              if (roots.indexOf(c) !== -1 || ends.indexOf(c) !== -1) continue;
              if (val[c] === 0 && (cand[c] & bit) !== 0 && peers[ends[0]].has(c) && peers[ends[1]].has(c)) {
                targets.push(c);
              }
            }
            found.push({ digit: d, kind: kind, lines: [bases[i].unit, bases[j].unit], roots: roots, ends: ends,
              targets: targets });
          }
        }
      });
    }
    return found;
  }

  /** The skyscrapers that remove something. */
  function removingSkyscrapers(model, state) {
    return referenceSkyscrapers(model, state).filter(function (p) { return p.targets.length > 0; });
  }

  /** 'cell:digit' of every elimination of a list of reference patterns. */
  function eliminationKeys(patterns) {
    const keys = new Set();
    patterns.forEach(function (p) {
      p.targets.forEach(function (c) { keys.add(c + ':' + p.digit); });
    });
    return keys;
  }

  /**
   * Every two-string kite of a state (R11) by plain enumeration from the model's units, with none of the tables
   * of tech-fish.js. A line is a complete unit of kind 'row' or 'col' none of whose cells lies in another
   * complete unit of that kind, in which the digit is not placed and exactly two open cells can still be the
   * digit. A cell has a box when exactly one complete box-like unit (kind 'box' or 'region', counted over both
   * kinds) holds it. For a row and a column of that kind with four distinct cells, a bridge is one cell of
   * each in the same box; the other two cells are the ends. The targets are the open cells that still have the
   * digit, are none of the four cells and see both ends.
   * @returns {Array<{digit, lines, bridge, ends, targets}>} every pattern, with or without a target, in the
   *   order digit, row, column, cell of the row, cell of the column (the cells of a line ascending)
   */
  function referenceKites(model, state) {
    const found = [];
    const cand = state.candidates;
    const val = state.value;
    const peers = peerSetsOf(model);
    const isComplete = function (u) {
      return model.units[u].length === model.digits && !(model.unitMeta[u] && model.unitMeta[u].partial);
    };
    const holders = function (cell, kind) {
      return Array.from(model.cellUnits[cell]).filter(function (u) {
        return model.unitMeta[u].kind === kind && isComplete(u);
      });
    };
    const boxLike = function (cell) {
      return Array.from(model.cellUnits[cell]).filter(function (u) {
        const kind = model.unitMeta[u].kind;
        return (kind === 'box' || kind === 'region') && isComplete(u);
      });
    };
    const pairsOf = function (kind, d, bit) {
      const out = [];
      unitsOfKind(model, kind).forEach(function (u) {
        if (!isComplete(u)) return;
        const cells = Array.from(model.units[u]);
        if (cells.some(function (c) { return holders(c, kind).length !== 1; })) return;
        if (cells.some(function (c) { return val[c] === d; })) return;
        const open = cells.filter(function (c) { return val[c] === 0 && (cand[c] & bit) !== 0; });
        if (open.length === 2) out.push({ unit: u, cells: open.sort(function (a, b) { return a - b; }) });
      });
      return out;
    };
    for (let d = 1; d <= model.digits; d++) {
      const bit = 1 << (d - 1);
      const rows = pairsOf('row', d, bit);
      const cols = pairsOf('col', d, bit);
      rows.forEach(function (row) {
        cols.forEach(function (col) {
          if (new Set(row.cells.concat(col.cells)).size !== 4) return;
          row.cells.forEach(function (a) {
            col.cells.forEach(function (b) {
              const boxA = boxLike(a);
              const boxB = boxLike(b);
              if (boxA.length !== 1 || boxB.length !== 1 || boxA[0] !== boxB[0]) return;
              const ends = [row.cells[0] === a ? row.cells[1] : row.cells[0],
                col.cells[0] === b ? col.cells[1] : col.cells[0]];
              const four = [a, b].concat(ends);
              const targets = [];
              for (let c = 0; c < model.cellCount; c++) {
                if (four.indexOf(c) !== -1) continue;
                if (val[c] === 0 && (cand[c] & bit) !== 0 && peers[ends[0]].has(c) && peers[ends[1]].has(c)) {
                  targets.push(c);
                }
              }
              found.push({ digit: d, lines: [row.unit, col.unit], bridge: [a, b], ends: ends, targets: targets });
            });
          });
        });
      });
    }
    return found;
  }

  /** The kites that remove something. */
  function removingKites(model, state) {
    return referenceKites(model, state).filter(function (p) { return p.targets.length > 0; });
  }

  /** A blank-board state in which each listed digit stays only on its listed cells (all else is open). */
  function digitsMap(model, spec) {
    const eliminate = [];
    Object.keys(spec).forEach(function (key) {
      const keep = new Set(spec[key].map(function (label) { return H.cell(model, label); }));
      for (let c = 0; c < model.cellCount; c++) {
        if (!keep.has(c)) eliminate.push([c, Number(key)]);
      }
    });
    return H.makeState(model, blankPuzzle(model), { eliminate: eliminate, propagate: false });
  }

  function describeItem(model, item, index) {
    return 'state #' + index + ' (' + item.kind + ')\n  puzzle: ' + H.puzzleString(model, item.givens);
  }

  describe('fish techniques: registration', function () {
    const EXPECTED = {
      xWing: { baseCost: 32, order: 110 },
      skyscraper: { baseCost: 33, order: 112 },
      twoStringKite: { baseCost: 34, order: 114 },
      simpleColouring: { baseCost: 36, order: 120 },
      swordfish: { baseCost: 42, order: 130 },
      jellyfish: { baseCost: 56, order: 137 }
    };

    ALL_IDS.forEach(function (id) {
      it(id + ' is registered in group fish with its ladder cost and order', function () {
        const def = SG.techniques.get(id);
        expect(def.group).toBe('fish');
        expect(def.baseCost).toBe(EXPECTED[id].baseCost);
        expect(def.order).toBe(EXPECTED[id].order);
        expect(def.i18nKey).toBe('technique.' + id);
        expect(def.variantScope).toBeNull();
        expect(def.assumesUniqueness).toBe(false);
      });
    });

    it('runs in ladder order: xWing, skyscraper, twoStringKite, simpleColouring, swordfish, jellyfish', function () {
      const order = SG.techniques.list().map(function (def) { return def.id; });
      const at = ALL_IDS.map(function (id) { return order.indexOf(id); });
      at.forEach(function (index) { expect(index).toBeGreaterThanOrEqual(0); });
      expect(at.slice().sort(function (a, b) { return a - b; })).toEqual(at);
    });

    it('puts jellyfish after swordfish and cageSplit and before the wings, as its weight says (rating v3)',
      function () {
        const order = SG.techniques.list().map(function (def) { return def.id; });
        const at = function (id) { return order.indexOf(id); };
        expect(at('jellyfish')).toBeGreaterThan(at('swordfish'));
        expect(at('jellyfish')).toBeGreaterThan(at('cageSplit'));
        expect(at('jellyfish')).toBeLessThan(at('xyWing'));
        expect(at('jellyfish')).toBeLessThan(at('xyzWing'));
      });
  });

  describe('xWing', function () {
    it('finds the published X-Wing with rows as base lines (SudokuWiki example 1, digit 7)', function () {
      H.expectFinding(SG.test, 'xWing', publishedState('xWing1'), expectedOf(SPECS.xWing1));
    });

    it('finds the published X-Wing with columns as base lines (example 2, digit 2)', function () {
      H.expectFinding(SG.test, 'xWing', publishedState('xWing2'), expectedOf(SPECS.xWing2));
    });

    it('finds the second published X-Wing of that puzzle (example 3, digit 3)', function () {
      H.expectFinding(SG.test, 'xWing', publishedState('xWing3'), expectedOf(SPECS.xWing3));
    });

    it('does not report a fish again once its eliminations are applied', function () {
      const state = publishedState('xWing1');
      const finding = runFind('xWing', model9, state);
      finding.eliminations.forEach(function (e) {
        SG.constraints.eliminate(model9, state, e[0], e[1]);
      });
      H.expectNoFinding(SG.test, 'xWing', state);
    });

    it('is not fooled by a Swordfish or a Jellyfish: those boards contain no X-Wing', function () {
      const others = ['swordfish333', 'swordfish222', 'swordfish323', 'jellyfish', 'jellyfishPerfect'];
      others.forEach(function (key) {
        H.expectNoFinding(SG.test, 'xWing', publishedState(key));
      });
    });

    it('finds nothing on the Simple Colouring boards', function () {
      ['colourWrap', 'colourTrap1', 'colourTrap2'].forEach(function (key) {
        H.expectNoFinding(SG.test, 'xWing', publishedState(key));
      });
    });

    it('ignores two lines whose candidates need three covers (3 columns are not an X-Wing)', function () {
      const f = buildFish(model9, 'row', 3);
      H.expectNoFinding(SG.test, 'xWing', f.state);
    });

    it('ignores a rectangle that has nothing to remove', function () {
      const f = buildFish(model9, 'row', 2, { clean: true });
      H.expectNoFinding(SG.test, 'xWing', f.state);
    });
  });

  describe('swordfish', function () {
    it('finds the published perfect 3-3-3 Swordfish (columns as base lines, digit 8)', function () {
      H.expectFinding(SG.test, 'swordfish', publishedState('swordfish333'), expectedOf(SPECS.swordfish333));
    });

    it('finds the published 2-2-2 Swordfish (columns as base lines, digit 9, six eliminations)', function () {
      H.expectFinding(SG.test, 'swordfish', publishedState('swordfish222'), expectedOf(SPECS.swordfish222));
    });

    it('finds the published 3-2-3 Swordfish in the other direction (rows C, D, J; digit 4)', function () {
      H.expectFinding(SG.test, 'swordfish', publishedState('swordfish323'), expectedOf(SPECS.swordfish323));
    });

    it('does not report an X-Wing, a Jellyfish or a colouring board as a Swordfish', function () {
      ['xWing3', 'jellyfish', 'jellyfishPerfect', 'colourWrap', 'colourTrap1', 'colourTrap2']
        .forEach(function (key) {
          H.expectNoFinding(SG.test, 'swordfish', publishedState(key));
        });
    });

    it('ignores a three line pattern that has nothing to remove', function () {
      const f = buildFish(model9, 'col', 3, { clean: true });
      H.expectNoFinding(SG.test, 'swordfish', f.state);
    });

    it('ignores four lines that need four covers (that is a Jellyfish, not a Swordfish)', function () {
      const f = buildFish(model9, 'row', 4);
      H.expectNoFinding(SG.test, 'swordfish', f.state);
    });
  });

  describe('jellyfish', function () {
    it('finds the published Jellyfish (candidate 7, rows B D E H on columns 1 5 7 9)', function () {
      H.expectFinding(SG.test, 'jellyfish', publishedState('jellyfish'), expectedOf(SPECS.jellyfish));
    });

    it('finds the published perfect 4-4-4-4 Jellyfish (all sixteen cells of digit 2)', function () {
      H.expectFinding(SG.test, 'jellyfish', publishedState('jellyfishPerfect'),
        expectedOf(SPECS.jellyfishPerfect));
    });

    it('finds the published 20-elimination Jellyfish: all twenty 9s go', function () {
      const finding = H.expectFinding(SG.test, 'jellyfish', publishedState('jellyfish20'),
        expectedOf(SPECS.jellyfish20));
      expect(finding.eliminations).toHaveLength(20);
    });

    it('finds the published 18-elimination Jellyfish (a column pattern, shown as rows on the turned board)',
      function () {
        const finding = H.expectFinding(SG.test, 'jellyfish', transposedState('jellyfish18'), {
          cells: ['R2C1', 'R2C4', 'R2C5', 'R2C8', 'R5C1', 'R5C4', 'R5C5', 'R5C8', 'R7C1', 'R7C5', 'R7C8',
            'R8C1', 'R8C5', 'R8C8'],
          eliminations: pairs(8, ['R1C1', 'R1C4', 'R1C5', 'R3C1', 'R3C5', 'R3C8', 'R4C1', 'R4C4', 'R4C5',
            'R4C8', 'R6C1', 'R6C4', 'R6C5', 'R6C8', 'R9C1', 'R9C4', 'R9C5', 'R9C8']),
          args: { digit: 8, size: 4, orientation: 'row', baseUnits: ['R2', 'R5', 'R7', 'R8'],
            coverUnits: ['C1', 'C4', 'C5', 'C8'] }
        });
        expect(finding.eliminations).toHaveLength(18);
      });

    it('finds that column Jellyfish on the board as printed, after the row Jellyfish before it', function () {
      expectColumnJellyfishOf18();
    });

    it('finds nothing on the X-Wing board of the second step and on the colouring boards', function () {
      ['xWing3', 'colourWrap', 'colourTrap1', 'colourTrap2'].forEach(function (key) {
        H.expectNoFinding(SG.test, 'jellyfish', publishedState(key));
      });
    });

    it('ignores a four line pattern that has nothing to remove', function () {
      const f = buildFish(model9, 'row', 4, { clean: true });
      H.expectNoFinding(SG.test, 'jellyfish', f.state);
    });

    it('ignores a Swordfish', function () {
      const f = buildFish(model9, 'col', 3);
      H.expectNoFinding(SG.test, 'jellyfish', f.state);
    });
  });

  describe('generic fish: sizes 2-4, rows and columns as base lines', function () {
    FISH_IDS.forEach(function (id) {
      ['row', 'col'].forEach(function (orientation) {
        it(id + ' (n=' + FISH_SIZE[id] + ') with ' + orientation + 's as base lines, 9 digits', function () {
          const f = buildFish(model9, orientation, FISH_SIZE[id]);
          const finding = H.expectFinding(SG.test, id, f.state,
            { cells: f.cells, eliminations: f.eliminations, args: f.args }, { solution: f.solution });
          expect(finding.eliminations).toHaveLength((9 - FISH_SIZE[id]) * FISH_SIZE[id]);
          FISH_IDS.forEach(function (other) {
            if (other !== id) H.expectNoFinding(SG.test, other, f.state);
          });
        });
      });
    });

    FISH_IDS.forEach(function (id) {
      ['row', 'col'].forEach(function (orientation) {
        it(id + ' with ' + orientation + 's as base lines on the published boards, as printed and turned',
          function () {
            let checked = 0;
            if (id === 'jellyfish' && orientation === 'col') {
              expectColumnJellyfishOf18();
              checked++;
            }
            Object.keys(SPECS).forEach(function (key) {
              const spec = SPECS[key];
              if (spec.id !== id) return;
              if (spec.orientation === orientation) {
                H.expectFinding(SG.test, id, publishedState(key), expectedOf(spec));
                checked++;
              }
              const flipped = transposedSpec(spec);
              if (!spec.noFlip && flipped.orientation === orientation) {
                H.expectFinding(SG.test, id, transposedState(key), expectedOf(flipped));
                checked++;
              }
            });
            expect(checked).toBeGreaterThanOrEqual(1);
          });
      });
    });

    [4, 6, 9, 12, 16].forEach(function (D) {
      FISH_IDS.forEach(function (id) {
        const size = FISH_SIZE[id];
        // With 2n lines the complementary fish of the other direction is found first, so it is skipped.
        if (size >= D || 2 * size === D) return;
        ['row', 'col'].forEach(function (orientation) {
          it(id + ' with ' + orientation + 's as base lines on ' + D + ' digits', function () {
            const model = modelOfDigits(D);
            const f = buildFish(model, orientation, size);
            const finding = H.expectFinding(SG.test, id, f.state,
              { cells: f.cells, eliminations: f.eliminations, args: f.args }, { solution: f.solution });
            expect(finding.eliminations).toHaveLength((D - size) * size);
          });
        });
      });
    });
  });

  describe('fish: what the routine must not use', function () {
    it('honours ctx.completeUnits: with no complete line there is no fish', function () {
      const none = new Uint8Array(model9.units.length);
      const base = SG.techniques.createContext(model9, {});
      const ctx = Object.assign({}, base, { completeUnits: none });
      [['xWing', 'xWing1'], ['swordfish', 'swordfish333'], ['jellyfish', 'jellyfish']].forEach(function (p) {
        const state = publishedState(p[1]);
        expect(SG.techniques.get(p[0]).find(model9, state, base)).not.toBeNull();
        expect(SG.techniques.get(p[0]).find(model9, state, ctx)).toBeNull();
      });
    });

    it('honours ctx.completeUnits for one line: an incomplete base row breaks the pattern', function () {
      const complete = Uint8Array.from(SG.techniques.createContext(model9, {}).completeUnits);
      complete[unitsOfKind(model9, 'row')[1]] = 0;
      const ctx = Object.assign({}, SG.techniques.createContext(model9, {}), { completeUnits: complete });
      expect(SG.techniques.get('xWing').find(model9, publishedState('xWing1'), ctx)).toBeNull();
    });

    it('skips base lines whose cells lie in two lines of their kind (overlapping sub-grids)', function () {
      // Row R1 and the extra row X1 share R1C4 (index 3). Both hold the digit only in columns C1 and C4,
      // so a naive fish would clear C1 and C4 although a single digit on R1C4 satisfies both lines.
      const model = buildGridModel('fishTestOverlap', 2, 2, [[3, 4, 9, 14]]);
      const removed = ['R1C2', 'R1C3', 'R3C2', 'R4C3'].map(function (ref) { return [ref, 1]; });
      const state = H.makeState(model, blankPuzzle(model), { eliminate: removed, propagate: false });
      ['R1C1', 'R1C4', 'R2C1'].forEach(function (ref) {
        expect(state.candidates[H.cell(model, ref)] & 1).toBe(1);
      });
      H.expectNoFinding(SG.test, 'xWing', state);
    });

    it('calls ctx.check() while it scans', function () {
      const empty = H.makeState(model9, blankPuzzle(model9), { propagate: false });
      SCAN_IDS.forEach(function (id) {
        let calls = 0;
        const ctx = SG.techniques.createContext(model9, { budget: { check: function () { calls++; } } });
        SG.techniques.get(id).find(model9, empty, ctx);
        expect(calls).toBeGreaterThanOrEqual(model9.digits);
      });
    });

    it('does not modify the state and is deterministic', function () {
      const state = publishedState('jellyfish');
      const before = SG.model.cloneState(state);
      const first = JSON.stringify(runFind('jellyfish', model9, state));
      expect(JSON.stringify(runFind('jellyfish', model9, state))).toBe(first);
      expect(state.candidates).toEqual(before.candidates);
      expect(state.value).toEqual(before.value);
    });

    it('takes the first combination in line order when all 16 rows of a 16 digit board qualify', function () {
      const model = modelOfDigits(16);
      // Digit 1 only in columns C1-C4, in every row: all 16 rows are base lines with the same four covers.
      const eliminate = [];
      for (let c = 0; c < model.cellCount; c++) {
        if (model.layout.cellCol[c] > 3) eliminate.push([c, 1]);
      }
      const state = H.makeState(model, blankPuzzle(model), { eliminate: eliminate, propagate: false });
      const finding = runFind('jellyfish', model, state);
      expect(H.findingProblems(model, state, finding, { technique: 'jellyfish' })).toEqual([]);
      expect(finding.i18nArgs.digit).toBe(1);
      expect(finding.i18nArgs.orientation).toBe('row');
      expect(finding.i18nArgs.baseUnits).toEqual(['R1', 'R2', 'R3', 'R4']);
      expect(finding.i18nArgs.coverUnits).toEqual(['C1', 'C2', 'C3', 'C4']);
      expect(finding.eliminations).toHaveLength(12 * 4);
      H.expectNoFinding(SG.test, 'swordfish', state);
      H.expectNoFinding(SG.test, 'xWing', state);
    });

    it('prunes a 16 digit board where all rows qualify but no four of them share four columns', function () {
      const model = modelOfDigits(16);
      // Row r keeps digit 1 only in columns r and r+1 (mod 16): any four rows span at least five columns.
      const eliminate = [];
      for (let c = 0; c < model.cellCount; c++) {
        const r = model.layout.cellRow[c];
        const col = model.layout.cellCol[c];
        if (col !== r && col !== (r + 1) % 16) eliminate.push([c, 1]);
      }
      const state = H.makeState(model, blankPuzzle(model), { eliminate: eliminate, propagate: false });
      const ctx = SG.techniques.createContext(model, {});
      const started = Date.now();
      FISH_IDS.forEach(function (id) {
        expect(SG.techniques.get(id).find(model, state, ctx)).toBeNull();
      });
      expect(Date.now() - started).toBeLessThan(500);
    });
  });

  describe('simpleColouring', function () {
    it('finds the published colour wrap: two cells of one colour in row J (digit 8)', function () {
      const finding = H.expectFinding(SG.test, 'simpleColouring', publishedState('colourWrap'),
        expectedOf(SPECS.colourWrap), {});
      expect(finding.i18nArgs.falseColour).toBe(1);
      expect(finding.i18nArgs.witness.slice().sort()).toEqual(['R9C6', 'R9C8']);
      expect(finding.i18nArgs.colour1).toEqual(['R4C3', 'R5C7', 'R8C1', 'R9C6', 'R9C8']);
      expect(finding.i18nArgs.colour2).toEqual(['R4C8', 'R5C1', 'R8C6']);
    });

    it('finds the published colour trap: J3 and H5 see both ends of the chain (digit 7)', function () {
      H.expectFinding(SG.test, 'simpleColouring', publishedState('colourTrap1'),
        expectedOf(SPECS.colourTrap1));
    });

    it('finds the follow-up trap of that page', function () {
      H.expectFinding(SG.test, 'simpleColouring', publishedState('colourTrap2'),
        expectedOf(SPECS.colourTrap2));
    });

    it('finds the same eliminations when the published boards are turned on the diagonal', function () {
      ['colourWrap', 'colourTrap1', 'colourTrap2'].forEach(function (key) {
        const flipped = transposedSpec(SPECS[key]);
        const finding = H.expectFinding(SG.test, 'simpleColouring', transposedState(key),
          { cells: flipped.cells, eliminations: pairs(flipped.digit, flipped.eliminations) });
        expect(finding.i18nArgs.rule).toBe(SPECS[key].rule);
      });
    });

    it('reports nothing on the X-Wing, Swordfish and Jellyfish boards', function () {
      ['xWing2', 'xWing3', 'swordfish333', 'swordfish222', 'swordfish323', 'jellyfish', 'jellyfishPerfect']
        .forEach(function (key) {
          H.expectNoFinding(SG.test, 'simpleColouring', publishedState(key));
        });
    });

    it('wrap: two cells of one colour in a box clear that colour (minimal chain, digit 1)', function () {
      // R1C1 - R1C2 (row 1) and R1C2 - R2C2 (column 2) are the only strong links; R1C1 and R2C2 share box 1.
      const state = digitMap(model9, 1, ['R1C1', 'R1C2', 'R2C2']);
      const finding = H.expectFinding(SG.test, 'simpleColouring', state, {
        cells: ['R1C1', 'R1C2', 'R2C2'],
        eliminations: [['R1C1', 1], ['R2C2', 1]],
        args: { digit: 1, rule: 'wrap', falseColour: 1, colour1: ['R1C1', 'R2C2'], colour2: ['R1C2'] }
      });
      expect(finding.i18nArgs.witness.slice().sort()).toEqual(['R1C1', 'R2C2']);
    });

    // Chain P1 - P2 (column 1), P2 - Q1 (row 5), Q1 - Q2 (column 5): P1 and Q2 have different colours.
    // R3C2 and R2C8 are fillers that keep box 1 and row 2 from becoming strong links.
    const CHAIN = ['R1C1', 'R5C1', 'R5C5', 'R2C5'];
    const FILLERS = ['R3C2', 'R2C8'];

    it('trap: a cell that sees both colours of the chain loses the digit (R2C3 sees P1 and Q2)', function () {
      const state = digitMap(model9, 1, CHAIN.concat(FILLERS, ['R2C3']));
      H.expectFinding(SG.test, 'simpleColouring', state, {
        cells: CHAIN, eliminations: [['R2C3', 1]], args: { digit: 1, rule: 'trap' }
      });
    });

    it('trap: a chain without a cell that sees both colours gives nothing', function () {
      H.expectNoFinding(SG.test, 'simpleColouring', digitMap(model9, 1, CHAIN));
    });

    it('trap: a cell that sees only one colour is left alone', function () {
      H.expectNoFinding(SG.test, 'simpleColouring', digitMap(model9, 1, CHAIN.concat(FILLERS)));
    });

    it('colours of different components are unrelated: no wrap between them', function () {
      // Component {R1C1, R1C5} and component {R2C2, R2C8}: R1C1 and R2C2 both get "colour 1" from their own
      // start cell and share box 1, but neither component has two cells of one colour in a unit.
      const state = digitMap(model9, 1, ['R1C1', 'R1C5', 'R2C2', 'R2C8', 'R3C3']);
      H.expectNoFinding(SG.test, 'simpleColouring', state);
    });

    it('colours of different components are unrelated: no trap between them', function () {
      // R8C1 sees R1C1 (component A, colour 1) and R8C9 (component B, colour 2) but is no trap for either.
      const state = digitMap(model9, 1,
        ['R1C1', 'R1C5', 'R5C9', 'R8C9', 'R4C1', 'R8C1', 'R8C4']);
      H.expectNoFinding(SG.test, 'simpleColouring', state);
    });

    it('is silent on a grid with no strong link at all (every candidate everywhere)', function () {
      ['classic4', 'classic6', 'classic9'].forEach(function (variant) {
        const model = H.model(variant);
        const state = H.makeState(model, blankPuzzle(model), { propagate: false });
        expect(strongLinkCount(model, state)).toBe(0);
        H.expectNoFinding(SG.test, 'simpleColouring', state);
      });
    });

    it('is silent on every random state without a strong link', function () {
      const items = H.randomStatesWithKnownSolution(model9, SG.testkit.rng.create(31337), 400);
      let silent = 0;
      items.forEach(function (item) {
        if (strongLinkCount(model9, item.state) !== 0) return;
        silent++;
        H.expectNoFinding(SG.test, 'simpleColouring', item.state);
      });
      expect(silent).toBeGreaterThan(0);
    });

    it('does not build links from units that are not complete', function () {
      const base = SG.techniques.createContext(model9, {});
      const ctx = Object.assign({}, base, { completeUnits: new Uint8Array(model9.units.length) });
      const state = publishedState('colourWrap');
      expect(SG.techniques.get('simpleColouring').find(model9, state, base)).not.toBeNull();
      expect(SG.techniques.get('simpleColouring').find(model9, state, ctx)).toBeNull();
    });

    it('ignores a component whose links form an odd cycle (a contradictory position)', function () {
      // Three cells, three units of two cells each: every unit is a strong link, the links form a triangle.
      const model = SG.model.create({
        variantId: 'fishTestTriangle', digits: 2, cellCount: 3,
        units: [[0, 1], [1, 2], [0, 2]],
        layout: { rows: 2, cols: 2, cellRow: [0, 0, 1], cellCol: [0, 1, 0] }
      });
      const state = H.makeState(model, '...', { propagate: false });
      expect(strongLinkCount(model, state)).toBe(6);
      H.expectNoFinding(SG.test, 'simpleColouring', state);
    });

    it('a colouring Finding only removes the digit it colours', function () {
      ['colourWrap', 'colourTrap1', 'colourTrap2'].forEach(function (key) {
        const finding = runFind('simpleColouring', model9, publishedState(key));
        finding.eliminations.forEach(function (e) { expect(e[1]).toBe(SPECS[key].digit); });
        expect(finding.placements).toEqual([]);
      });
    });
  });

  describe('skyscraper (R11): geometry', function () {
    // The vector of R11: digit 5 in the rows R1 {C2, C8} and R4 {C2, C7}. The roots R1C2 and R4C2 share C2, the
    // ends R1C8 and R4C7 differ, and R2C7 sees both (R1C8 through box 3, R4C7 through C7). R6C7 only keeps C7
    // from being a conjugate column as well, so that the vector holds exactly one skyscraper.
    const VECTOR = ['R1C2', 'R1C8', 'R4C2', 'R4C7', 'R2C7', 'R6C7'];
    const WANT = {
      cells: ['R1C2', 'R1C8', 'R4C2', 'R4C7'],
      eliminations: [['R2C7', 5]],
      args: { digit: 5, lines: ['R1', 'R4'], ends: ['R1C8', 'R4C7'] }
    };

    function skyState(labels) {
      return digitsMap(model9, { 5: labels });
    }

    function cellsOf(model, labels) {
      return labels.map(function (label) { return H.cell(model, label); }).sort(function (a, b) { return a - b; });
    }

    function unitIndex(model, label) {
      return model.unitMeta.findIndex(function (meta) { return meta.label === label; });
    }

    it('removes the digit from the cell that sees both ends (the vector of R11)', function () {
      const state = skyState(VECTOR);
      const patterns = removingSkyscrapers(model9, state);
      expect(patterns.length).toBe(1);
      expect(patterns[0].targets).toEqual([H.cell(model9, 'R2C7')]);
      const finding = H.expectFinding(SG.test, 'skyscraper', state, WANT);
      expect(finding.technique).toBe('skyscraper');
      expect(finding.i18nKey).toBe('technique.skyscraper.step');
      expect(finding.placements).toEqual([]);
      expect(finding.cells).toEqual(cellsOf(model9, WANT.cells));
      expect(finding.eliminations).toEqual([[H.cell(model9, 'R2C7'), 5]]);
    });

    it('finds the transposed vector: columns C1 and C4 sharing R2, R7C2 loses the digit', function () {
      const state = skyState(VECTOR.map(transposeRef));
      const patterns = removingSkyscrapers(model9, state);
      expect(patterns.length).toBe(1);
      expect(patterns[0].kind).toBe('col');
      H.expectFinding(SG.test, 'skyscraper', state, {
        cells: WANT.cells.map(transposeRef),
        eliminations: [['R7C2', 5]],
        args: { digit: 5, lines: ['C1', 'C4'], ends: ['R7C4', 'R8C1'] }
      });
    });

    it('finds a skyscraper whose ends lie in one box (a target inside that box)', function () {
      const state = skyState(['R1C2', 'R1C4', 'R3C2', 'R3C5', 'R2C5']);
      const finding = H.expectFinding(SG.test, 'skyscraper', state, {
        cells: ['R1C2', 'R1C4', 'R3C2', 'R3C5'],
        eliminations: [['R2C5', 5]],
        args: { digit: 5, lines: ['R1', 'R3'], ends: ['R1C4', 'R3C5'] }
      });
      expect(finding.eliminations).toHaveLength(1);
    });

    // Each of these has the look of the vector but is no skyscraper that removes anything. They are checked
    // against the independent enumeration first, so that a mistake of the construction cannot hide a bug.
    const NEAR_MISSES = [
      ['a third candidate in the first base row (R1 is no conjugate pair)', VECTOR.concat(['R1C5'])],
      ['a third candidate in the second base row (R4 is no conjugate pair)', VECTOR.concat(['R4C9'])],
      ['no shared column: the roots lie in C2 and C3', ['R1C2', 'R1C8', 'R4C3', 'R4C7', 'R2C7', 'R6C7']],
      ['both ends share a column too: an X-Wing, not a skyscraper', ['R1C2', 'R1C8', 'R4C2', 'R4C8', 'R2C8']],
      ['a target that sees only the end R1C8', ['R1C2', 'R1C8', 'R4C2', 'R4C7', 'R2C8']],
      ['a target that sees only the end R4C7', ['R1C2', 'R1C8', 'R4C2', 'R4C7', 'R5C7']],
      ['a root that sees both ends is no external candidate', ['R1C2', 'R1C5', 'R2C2', 'R2C3']],
      ['a base row with a single candidate (R4 is no conjugate pair)', ['R1C2', 'R1C8', 'R4C2', 'R2C7', 'R6C7']]
    ];

    NEAR_MISSES.forEach(function (miss) {
      [['as listed', miss[1]], ['transposed', miss[1].map(transposeRef)]].forEach(function (variant) {
        it('does not authorize an elimination: ' + miss[0] + ' (' + variant[0] + ')', function () {
          const state = skyState(variant[1]);
          expect(removingSkyscrapers(model9, state)).toEqual([]);
          H.expectNoFinding(SG.test, 'skyscraper', state);
        });
      });
    });

    it('leaves the X-Wing near miss to xWing, in both orientations', function () {
      const rows = ['R1C2', 'R1C8', 'R4C2', 'R4C8', 'R2C8'];
      [rows, rows.map(transposeRef)].forEach(function (labels) {
        const state = skyState(labels);
        H.expectNoFinding(SG.test, 'skyscraper', state);
        const finding = runFind('xWing', model9, state);
        expect(finding).not.toBeNull();
        expect(finding.eliminations).toHaveLength(1);
      });
    });

    it('needs complete lines: an incomplete base row, base column or shared line gives nothing', function () {
      const state = skyState(VECTOR);
      ['R1', 'R4', 'C2'].forEach(function (label) {
        const complete = Uint8Array.from(SG.techniques.createContext(model9, {}).completeUnits);
        complete[unitIndex(model9, label)] = 0;
        const ctx = Object.assign({}, SG.techniques.createContext(model9, {}), { completeUnits: complete });
        expect([label, SG.techniques.get('skyscraper').find(model9, state, ctx)]).toEqual([label, null]);
      });
      expect(runFind('skyscraper', model9, state)).not.toBeNull();
      const none = new Uint8Array(model9.units.length);
      const ctx = Object.assign({}, SG.techniques.createContext(model9, {}), { completeUnits: none });
      expect(SG.techniques.get('skyscraper').find(model9, state, ctx)).toBeNull();
    });

    it('needs disjoint lines: rows that share a cell are no base lines, however the candidates lie', function () {
      // On the plain 4 x 4 board the digit map holds a skyscraper (R1 and R3 sharing C1, R2C3 sees both ends;
      // R4C1 only keeps C1 from being a conjugate column). The extra row X1 shares one cell with each of R1 to R4
      // (it is a row for the model), so none of them is a disjoint line any more.
      const plain = buildGridModel('fishTestPlain', 2, 2);
      const overlapping = buildGridModel('fishTestOverlap', 2, 2, [[3, 4, 9, 14]]);
      const labels = ['R1C1', 'R1C4', 'R3C1', 'R3C3', 'R2C3', 'R4C1'];
      H.expectFinding(SG.test, 'skyscraper', digitsMap(plain, { 1: labels }), {
        cells: ['R1C1', 'R1C4', 'R3C1', 'R3C3'],
        eliminations: [['R2C3', 1]],
        args: { digit: 1, lines: ['R1', 'R3'], ends: ['R1C4', 'R3C3'] }
      });
      const crossed = digitsMap(overlapping, { 1: labels });
      expect(removingSkyscrapers(overlapping, crossed)).toEqual([]);
      H.expectNoFinding(SG.test, 'skyscraper', crossed);
    });

    it('takes the lowest digit first, then rows before columns', function () {
      const both = digitsMap(model9, { 3: VECTOR, 2: VECTOR });
      expect(runFind('skyscraper', model9, both).i18nArgs.digit).toBe(2);
      // Without R6C7 the vector holds a row skyscraper (R2C7 loses 5) and a column one (R1C8 loses 5).
      const state = skyState(VECTOR.slice(0, 5));
      const keys = eliminationKeys(removingSkyscrapers(model9, state));
      expect(keys.size).toBe(2);
      expect(keys.has(H.cell(model9, 'R2C7') + ':5')).toBe(true);
      expect(keys.has(H.cell(model9, 'R1C8') + ':5')).toBe(true);
      H.expectFinding(SG.test, 'skyscraper', state, WANT);
    });

    it('gives the same answer for the same state after a call on another state', function () {
      const a = skyState(VECTOR);
      const b = skyState(VECTOR.map(transposeRef));
      const first = JSON.stringify(runFind('skyscraper', model9, a));
      runFind('skyscraper', model9, b);
      expect(JSON.stringify(runFind('skyscraper', model9, a))).toBe(first);
    });

    it('hands out its own data: changing a Finding changes neither the next call nor the state', function () {
      const state = skyState(VECTOR);
      const before = SG.model.cloneState(state);
      const first = runFind('skyscraper', model9, state);
      const copy = JSON.parse(JSON.stringify(first));
      first.cells.push(99);
      first.eliminations.push([1, 1]);
      first.eliminations[0][0] = 77;
      first.i18nArgs.lines.push('X');
      first.i18nArgs.ends.length = 0;
      first.i18nArgs.digit = 1;
      expect(runFind('skyscraper', model9, state)).toEqual(copy);
      expect(state.candidates).toEqual(before.candidates);
      expect(state.value).toEqual(before.value);
    });
  });

  describe('skyscraper (R11): real positions', function () {
    const entry = SG.fixtures.techniques.byId.skyscraper;

    // The exact Findings of the two real positive fixtures (core/tests/fixtures/techniques.js).
    const REAL = [
      { cells: ['R1C2', 'R1C8', 'R8C2', 'R8C9'], eliminations: [['R2C9', 1], ['R7C8', 1], ['R9C8', 1]],
        args: { digit: 1, lines: ['R1', 'R8'], ends: ['R1C8', 'R8C9'] } },
      { cells: ['R1C5', 'R2C7', 'R8C5', 'R8C7'], eliminations: [['R1C8', 5]],
        args: { digit: 5, lines: ['C5', 'C7'], ends: ['R1C5', 'R2C7'] } }
    ];

    function positionOf(fixture) {
      return H.stateAfter(model9, fixture.puzzle, fixture.after);
    }

    it('has two positive and two negative fixtures, positions listed explicitly (no ladder helper)', function () {
      expect(entry.positive).toHaveLength(2);
      expect(entry.negative).toHaveLength(2);
      entry.positive.concat(entry.negative).forEach(function (fixture) {
        expect(Array.isArray(fixture.after)).toBe(true);
      });
      entry.positive.forEach(function (fixture) { expect(fixture.after).not.toContain('skyscraper'); });
      // nothing left after skyscraper itself; the X-Wing position is the one before xWing (no skyscraper there)
      expect(entry.negative[0].after).toContain('skyscraper');
      expect(entry.negative[1].after).not.toContain('skyscraper');
      expect(entry.negative[1].after).not.toContain('xWing');
    });

    REAL.forEach(function (want, i) {
      it('finds the exact Finding of real position ' + (i + 1) + ', sound against an independent completion',
        function () {
          const fixture = entry.positive[i];
          const givens = H.parsePuzzle(model9, fixture.puzzle);
          // the puzzle has exactly one solution (plain depth first search, no technique)
          expect(SG.dfs.countSolutions(model9, givens, 2)).toBe(1);
          const solution = SG.dfs.solve(model9, givens);
          const state = positionOf(fixture);
          const finding = H.expectFinding(SG.test, 'skyscraper', state, want);
          expect(finding.eliminations.length).toBe(want.eliminations.length);
          finding.eliminations.forEach(function (e) { expect(solution[e[0]]).not.toBe(e[1]); });
          // the position without the eliminated candidates still completes, and only to that solution
          const reduced = SG.model.cloneState(state);
          finding.eliminations.forEach(function (e) {
            expect(SG.constraints.eliminate(model9, reduced, e[0], e[1])).toBe(true);
          });
          const done = SG.dfs.searchFrom(model9, reduced, { limit: 2 });
          expect(done.found).toBe(1);
          expect(Array.from(done.solution)).toEqual(Array.from(solution));
          // the first skyscraper in order is the Finding (the independent enumeration agrees)
          const first = removingSkyscrapers(model9, state)[0];
          expect(first.targets).toEqual(finding.eliminations.map(function (e) { return e[0]; }));
        });

      it('finds the transposed real position ' + (i + 1) + ' with the transposed eliminations', function () {
        const fixture = entry.positive[i];
        const turned = transposeCells(fixture.puzzle, function (cells) { return cells.join(''); });
        const state = H.stateAfter(model9, turned, fixture.after);
        const wanted = new Set(want.eliminations.map(function (e) {
          return H.cell(model9, transposeRef(e[0])) + ':' + e[1];
        }));
        const keys = eliminationKeys(removingSkyscrapers(model9, state));
        wanted.forEach(function (key) { expect(keys.has(key)).toBe(true); });
        const finding = runFind('skyscraper', model9, state);
        expect(finding).not.toBeNull();
        expect(H.findingProblems(model9, state, finding, { technique: 'skyscraper',
          solution: SG.dfs.solve(model9, H.parsePuzzle(model9, turned)) })).toEqual([]);
      });
    });

    it('finds nothing at the negative positions: nothing left after it, and an X-Wing is no skyscraper', function () {
      entry.negative.forEach(function (fixture) {
        const state = positionOf(fixture);
        H.expectNoFinding(SG.test, 'skyscraper', state);
        expect(removingSkyscrapers(model9, state)).toEqual([]);
      });
      const xWing = positionOf(entry.negative[1]);
      expect(runFind('xWing', model9, xWing)).not.toBeNull();
    });
  });

  describe('skyscraper (R11): work limit, budget and cancellation', function () {
    // The digit d may only go in the columns d - 1 and d (mod 16) of every row of a 16 digit board. All 16 rows
    // are conjugate pairs with the same two cover lines, so each of the 120 pairs of rows is an X-Wing (no
    // skyscraper): a call tests 16 digits x 120 pairs = 1920 pairs and finds nothing.
    const FLOOD_WORK = 1920;
    let flood = null;

    function floodState() {
      if (flood === null) {
        const model = modelOfDigits(16);
        const eliminate = [];
        for (let c = 0; c < model.cellCount; c++) {
          const col = model.layout.cellCol[c];
          for (let d = 1; d <= 16; d++) {
            if (col !== d - 1 && col !== d % 16) eliminate.push([c, d]);
          }
        }
        flood = { model: model, state: H.makeState(model, blankPuzzle(model), { eliminate: eliminate,
          propagate: false }) };
      }
      return flood;
    }

    const VECTOR = ['R1C2', 'R1C8', 'R4C2', 'R4C7', 'R2C7', 'R6C7'];

    function caught(fn) {
      try {
        fn();
      } catch (err) {
        return err;
      }
      return null;
    }

    function observed(model, state, options, ctxOptions) {
      const records = [];
      const ctx = SG.techniques.createContext(model, Object.assign({
        onPatternWork: function (r) { records.push(r); }
      }, ctxOptions));
      const finding = SG.fishSearch.skyscraper(model, state, ctx, options);
      return { finding: finding, records: records, record: records[0] };
    }

    it('has R10\'s limit of 50000 tested pairs, and the registered finder reports it', function () {
      expect(SG.fishSearch.SKYSCRAPER_WORK_LIMIT).toBe(50000);
      const state = digitsMap(model9, { 5: VECTOR });
      const records = [];
      const ctx = SG.techniques.createContext(model9, { onPatternWork: function (r) { records.push(r); } });
      expect(SG.techniques.get('skyscraper').find(model9, state, ctx)).not.toBeNull();
      expect(records).toEqual([{ id: 'skyscraper', work: 1, limit: 50000, capHit: null, retained: null }]);
    });

    it('counts one unit per tested pair of base lines, from a fresh counter on every call', function () {
      const f = floodState();
      const first = observed(f.model, f.state);
      expect(first.finding).toBeNull();
      expect(first.record).toEqual({ id: 'skyscraper', work: FLOOD_WORK, limit: 50000, capHit: null,
        retained: null });
      const second = observed(f.model, f.state);
      expect(second.record).toEqual(first.record);
      expect(second.record).not.toBe(first.record);
      // a position without a conjugate pair costs nothing; a finding stops the count where it is found
      const empty = H.makeState(model9, blankPuzzle(model9), { propagate: false });
      expect(observed(model9, empty).record.work).toBe(0);
      const found = observed(model9, digitsMap(model9, { 5: VECTOR }));
      expect(found.finding).not.toBeNull();
      expect(found.record.work).toBe(1);
    });

    it('ends a call whose limit is spent with nothing found (never a finding), and says so', function () {
      const f = floodState();
      [0, 1, 100, FLOOD_WORK - 1].forEach(function (limit) {
        const out = observed(f.model, f.state, { workLimit: limit });
        expect(out.finding).toBeNull();
        expect(out.record).toEqual({ id: 'skyscraper', work: limit, limit: limit, capHit: 'work',
          retained: null });
      });
      const exact = observed(f.model, f.state, { workLimit: FLOOD_WORK });
      expect(exact.record.capHit).toBeNull();
      expect(exact.record.work).toBe(FLOOD_WORK);
      // a limit of 0 loses the vector's deduction; the first tested pair finds it with a limit of 1
      const state = digitsMap(model9, { 5: VECTOR });
      const lost = observed(model9, state, { workLimit: 0 });
      expect(lost.finding).toBeNull();
      expect(lost.record.capHit).toBe('work');
      const kept = observed(model9, state, { workLimit: 1 });
      expect(kept.finding).toEqual(observed(model9, state).finding);
      expect(kept.record.capHit).toBeNull();
    });

    it('floors a fractional limit and rejects an invalid one with solver.invalidOption', function () {
      const f = floodState();
      expect(observed(f.model, f.state, { workLimit: 2.9 }).record.work).toBe(2);
      [-1, NaN, Infinity, '5', null].forEach(function (workLimit) {
        const err = caught(function () { observed(f.model, f.state, { workLimit: workLimit }); });
        expect([String(workLimit), err && err.code]).toEqual([String(workLimit), 'solver.invalidOption']);
      });
    });

    /**
     * The work done at each check of the parent budget: a context whose k-th check throws a spent budget lets the
     * record of the (swallowed) call tell how many pairs were tested at that check.
     */
    function checkWorks(model, state, options) {
      const base = SG.techniques.createContext(model, {});
      function attempt(target) {
        let k = 0;
        let record = null;
        const ctx = Object.assign({}, base, {
          options: { onPatternWork: function (r) { record = r; } },
          check: function () {
            k++;
            if (k === target) throw new SG.errors.GenerationError('budget.exceeded', { reason: 'nodes' });
          }
        });
        const finding = SG.fishSearch.skyscraper(model, state, ctx, options);
        return { checks: k, record: record, finding: finding };
      }
      const free = attempt(0);
      const works = [];
      for (let target = 1; target <= free.checks; target++) {
        const spent = attempt(target);
        expect(spent.finding).toBeNull();
        expect(spent.record.capHit).toBeNull();
        works.push(spent.record.work);
      }
      const gaps = works.map(function (w, i) { return w - (i === 0 ? 0 : works[i - 1]); });
      gaps.push(free.record.work - works[works.length - 1]);
      return { works: works, gaps: gaps, max: Math.max.apply(null, gaps), free: free };
    }

    it('checks the parent budget at entry and so that at most 256 pairs pass between two checks', function () {
      const f = floodState();
      const out = checkWorks(f.model, f.state);
      expect(out.works[0]).toBe(0);
      expect(out.works).toEqual([0, 256, 512, 768, 1024, 1280, 1536, 1792]);
      expect(out.max).toBeLessThanOrEqual(256);
      expect(out.free.checks).toBe(8);
      // a call that ends at its limit keeps the same cadence
      const capped = checkWorks(f.model, f.state, { workLimit: 1000 });
      expect(capped.works).toEqual([0, 256, 512, 768]);
      // a small call has only the entry check
      expect(checkWorks(model9, digitsMap(model9, { 5: VECTOR })).works).toEqual([0]);
    });

    it('reports a spent budget as nothing found and lets cancellation and other errors through', function () {
      const f = floodState();
      const parent = SG.budget.create({ nodes: 3 });
      const spent = observed(f.model, f.state, undefined, { budget: parent });
      expect(spent.finding).toBeNull();
      expect(spent.records).toHaveLength(1);
      expect(spent.record.capHit).toBeNull();
      expect(spent.record.work).toBeLessThan(FLOOD_WORK);
      // capHit null is no proof of a complete scan: the caller's budget still fails after the call
      expect(caught(function () { parent.check(); }).code).toBe('budget.exceeded');

      const budget = SG.budget.create({});
      budget.cancel();
      const records = [];
      const err = caught(function () {
        SG.techniques.get('skyscraper').find(f.model, f.state, SG.techniques.createContext(f.model, {
          budget: budget, onPatternWork: function (r) { records.push(r); } }));
      });
      expect(err.code).toBe('budget.cancelled');
      expect(records).toEqual([]);

      // cancellation in the middle of the scan, and an error that is not a budget error
      [['budget.cancelled', true], ['boom', false]].forEach(function (kind) {
        let k = 0;
        const ctx = Object.assign({}, SG.techniques.createContext(f.model, {}), {
          check: function () {
            if (++k === 3) {
              throw kind[1] ? new SG.errors.GenerationError(kind[0], { reason: 'cancelled' }) : new Error(kind[0]);
            }
          }
        });
        const thrown = caught(function () { SG.techniques.get('skyscraper').find(f.model, f.state, ctx); });
        expect(thrown).toBeTruthy();
        expect(kind[1] ? thrown.code : thrown.message).toBe(kind[0]);
        expect(k).toBe(3);
      });
    });

    it('is not fooled by a hostile or absent observer', function () {
      const state = digitsMap(model9, { 5: VECTOR });
      const plain = JSON.stringify(runFind('skyscraper', model9, state));
      ['not a function', null, 7].forEach(function (observer) {
        const ctx = SG.techniques.createContext(model9, { onPatternWork: observer });
        expect(JSON.stringify(SG.techniques.get('skyscraper').find(model9, state, ctx))).toBe(plain);
      });
    });
  });

  describe('skyscraper (R11): agreement with an independent enumeration', function () {
    const cache = {};

    function itemsOf(model, count, seed) {
      const key = model.variantId + '/' + model.digits + '/' + seed;
      if (!cache[key]) {
        cache[key] = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), count);
      }
      return cache[key];
    }

    /** The Finding is the first pattern of the enumeration that removes something, field by field. */
    function agree(model, item, index) {
      const patterns = removingSkyscrapers(model, item.state);
      const finding = runFind('skyscraper', model, item.state);
      check((finding !== null) === (patterns.length > 0), 'skyscraper ' + (finding !== null
        ? 'reported a pattern that the enumeration does not know' : 'missed a pattern the enumeration found') +
        '\n  ' + describeItem(model, item, index));
      if (finding === null) return false;
      const first = patterns[0];
      check(finding.i18nArgs.digit === first.digit, 'digit ' + finding.i18nArgs.digit + ' is not the first ' +
        'pattern\'s ' + first.digit + '\n  ' + describeItem(model, item, index));
      check(JSON.stringify(finding.eliminations) === JSON.stringify(first.targets.map(function (c) {
        return [c, first.digit];
      })), 'the eliminations are not those of the first pattern\n  ' + describeItem(model, item, index));
      check(JSON.stringify(finding.cells) === JSON.stringify(first.roots.concat(first.ends)
        .sort(function (a, b) { return a - b; })), 'the cells are not the four cells of the first pattern\n  ' +
        describeItem(model, item, index));
      check(JSON.stringify(finding.i18nArgs.lines) === JSON.stringify(first.lines.map(function (u) {
        return unitLabel(model, u);
      })), 'the base lines are not those of the first pattern\n  ' + describeItem(model, item, index));
      check(JSON.stringify(finding.i18nArgs.ends) === JSON.stringify(first.ends.slice()
        .sort(function (a, b) { return a - b; }).map(function (c) { return H.label(model, c); })),
      'the ends are not those of the first pattern\n  ' + describeItem(model, item, index));
      return true;
    }

    [['classic9', 400, 777, 50], ['classic9', 400, 99, 50], ['classic6', 400, 777, 50],
      ['classic4', 300, 777, 3]].forEach(function (setup) {
      it('finds a skyscraper exactly when one exists and removes exactly its candidates on ' + setup[0] +
        ' (seed ' + setup[2] + ')', function () {
        const model = H.model(setup[0]);
        let withPattern = 0;
        itemsOf(model, setup[1], setup[2]).forEach(function (item, index) {
          if (agree(model, item, index)) withPattern++;
        });
        expect(withPattern).toBeGreaterThanOrEqual(setup[3]);
      });
    });

    [12, 16].forEach(function (D) {
      it('agrees on ' + D + ' digits (box shapes of 3 x 4 and 4 x 4, no 9 x 9 arithmetic)', function () {
        const model = modelOfDigits(D);
        let withPattern = 0;
        itemsOf(model, D === 12 ? 60 : 32, 2026).forEach(function (item, index) {
          if (agree(model, item, index)) withPattern++;
        });
        expect(withPattern).toBeGreaterThanOrEqual(D === 12 ? 10 : 5);
      });
    });

    ['diagonalX', 'hyper', 'jigsaw9'].forEach(function (variant) {
      it('agrees on ' + variant + ' (extra regions or irregular regions are real peers)', function () {
        if (!SG.testkit.hasVariant(variant)) SG.test.skip('no board of ' + variant + ' can be built here');
        const model = H.model(variant);
        let withPattern = 0;
        itemsOf(model, 120, 4242).forEach(function (item, index) {
          if (agree(model, item, index)) withPattern++;
        });
        expect(withPattern).toBeGreaterThanOrEqual(10);
      });
    });
  });

  describe('twoStringKite (R11): geometry', function () {
    // The vector of R11: digit 5 in the row R2 {C1, C8} and the column C2 {R1, R7}. The bridge is R2C1 and R1C2
    // (box 1): they see each other, so R2C8 or R7C2 is a 5, and R7C8 sees both (R7C2 along R7, R2C8 along C8).
    // R7C8 also makes R7 and C8 conjugate pairs, but each of them shares a cell with the row or the column of
    // the vector, so that the vector holds exactly one kite.
    const VECTOR = ['R2C1', 'R2C8', 'R1C2', 'R7C2', 'R7C8'];
    const WANT = {
      cells: ['R1C2', 'R2C1', 'R2C8', 'R7C2'],
      eliminations: [['R7C8', 5]],
      args: { digit: 5, lines: ['R2', 'C2'], bridge: ['R1C2', 'R2C1'], ends: ['R2C8', 'R7C2'] }
    };

    function kiteState(labels) {
      return digitsMap(model9, { 5: labels });
    }

    function unitIndex(model, label) {
      return model.unitMeta.findIndex(function (meta) { return meta.label === label; });
    }

    it('removes the digit from the cell that sees both ends (the vector of R11)', function () {
      const state = kiteState(VECTOR);
      const patterns = removingKites(model9, state);
      expect(patterns.length).toBe(1);
      expect(patterns[0].targets).toEqual([H.cell(model9, 'R7C8')]);
      const finding = H.expectFinding(SG.test, 'twoStringKite', state, WANT);
      expect(finding.technique).toBe('twoStringKite');
      expect(finding.i18nKey).toBe('technique.twoStringKite.step');
      expect(finding.placements).toEqual([]);
      expect(finding.cells).toEqual(['R1C2', 'R2C1', 'R2C8', 'R7C2'].map(function (ref) {
        return H.cell(model9, ref);
      }));
      expect(finding.eliminations).toEqual([[H.cell(model9, 'R7C8'), 5]]);
    });

    it('finds the transposed vector: the row R2 {C1, C7}, the column C2 {R1, R8}, R8C7 loses the digit',
      function () {
        const state = kiteState(VECTOR.map(transposeRef));
        const patterns = removingKites(model9, state);
        expect(patterns.length).toBe(1);
        H.expectFinding(SG.test, 'twoStringKite', state, {
          cells: ['R1C2', 'R2C1', 'R2C7', 'R8C2'],
          eliminations: [['R8C7', 5]],
          args: { digit: 5, lines: ['R2', 'C2'], bridge: ['R1C2', 'R2C1'], ends: ['R2C7', 'R8C2'] }
        });
      });

    // The bridge cell of the row is the lower or the higher cell of its pair, and so is the bridge cell of the
    // column: box 5 holds R5C4 (row R5) and R4C6 (column C6), the partner of the row lies left or right of the
    // box, the partner of the column above or below it. The target is where the lines of the two ends meet.
    const BRIDGE = ['R4C6', 'R5C4'];
    const FOUR = [
      { name: 'row partner left, column partner above', ends: ['R1C6', 'R5C1'], target: 'R1C1' },
      { name: 'row partner left, column partner below', ends: ['R5C1', 'R9C6'], target: 'R9C1' },
      { name: 'row partner right, column partner above', ends: ['R1C6', 'R5C9'], target: 'R1C9' },
      { name: 'row partner right, column partner below', ends: ['R5C9', 'R9C6'], target: 'R9C9' }
    ];

    function inCellOrder(labels) {
      return labels.slice().sort(function (a, b) { return H.cell(model9, a) - H.cell(model9, b); });
    }

    function fourLabels(item) {
      return BRIDGE.concat(item.ends, [item.target]);
    }

    FOUR.forEach(function (item) {
      it('finds the kite with the ' + item.name + ' (the bridge in box 5), as listed and transposed', function () {
        [['as listed', function (ref) { return ref; }, ['R5', 'C6']],
          ['transposed', transposeRef, ['R6', 'C5']]].forEach(function (variant) {
          const turn = variant[1];
          const state = kiteState(fourLabels(item).map(turn));
          const patterns = removingKites(model9, state);
          expect(patterns.length).toBe(1);
          expect(patterns[0].targets).toEqual([H.cell(model9, turn(item.target))]);
          const ends = inCellOrder(item.ends.map(turn));
          H.expectFinding(SG.test, 'twoStringKite', state, {
            cells: BRIDGE.concat(item.ends).map(turn),
            eliminations: [[turn(item.target), 5]],
            args: { digit: 5, lines: variant[2], bridge: inCellOrder(BRIDGE.map(turn)), ends: ends }
          });
        });
      });
    });

    it('finds a kite whose four cells lie in one box: the first bridge in order is the one named', function () {
      // Row R2 {C1, C2} and column C3 {R1, R3} are all in box 1, so every one of the four bridges is a bridge.
      const state = kiteState(['R2C1', 'R2C2', 'R1C3', 'R3C3', 'R3C1']);
      const patterns = removingKites(model9, state);
      expect(patterns.length).toBeGreaterThanOrEqual(2);
      expect(patterns[0].bridge).toEqual([H.cell(model9, 'R2C1'), H.cell(model9, 'R1C3')]);
      H.expectFinding(SG.test, 'twoStringKite', state, {
        cells: ['R1C3', 'R2C1', 'R2C2', 'R3C3'],
        eliminations: [['R3C1', 5]],
        args: { digit: 5, lines: ['R2', 'C3'], bridge: ['R1C3', 'R2C1'], ends: ['R2C2', 'R3C3'] }
      });
    });

    // Each of these has the look of the vector but is no kite that removes anything. They are checked against
    // the independent enumeration first, so that a mistake of the construction cannot hide a bug.
    const NEAR_MISSES = [
      ['a third candidate in the row (R2 is no conjugate pair)', VECTOR.concat(['R2C5'])],
      ['a third candidate in the column (C2 is no conjugate pair)', VECTOR.concat(['R4C2'])],
      ['a shared endpoint: the row and the column meet in R2C2, a cell of both pairs (three distinct cells)',
        ['R2C2', 'R2C8', 'R7C2', 'R7C8', 'R7C5', 'R5C8']],
      ['no box link: the cells R2C4 and R1C2 lie in different boxes', ['R2C4', 'R2C8', 'R1C2', 'R7C2', 'R7C8']],
      ['a target that sees only the end R2C8', ['R2C1', 'R2C8', 'R1C2', 'R7C2', 'R5C8']],
      ['a target that sees only the end R7C2', ['R2C1', 'R2C8', 'R1C2', 'R7C2', 'R7C5']],
      ['a bridge cell that sees both ends is no external candidate', ['R2C1', 'R2C8', 'R1C2', 'R3C2']],
      ['a skyscraper (two rows with a common cover column) is no kite',
        ['R1C2', 'R1C8', 'R4C2', 'R4C7', 'R2C7', 'R6C7']],
      ['an X-Wing (two rows on two columns) is no kite', ['R2C2', 'R2C8', 'R7C2', 'R7C8', 'R5C8']],
      ['a row with a single candidate (R2 is no conjugate pair)', ['R2C1', 'R1C2', 'R7C2', 'R7C8']]
    ];

    NEAR_MISSES.forEach(function (miss) {
      [['as listed', miss[1]], ['transposed', miss[1].map(transposeRef)]].forEach(function (variant) {
        it('does not authorize an elimination: ' + miss[0] + ' (' + variant[0] + ')', function () {
          const state = kiteState(variant[1]);
          expect(removingKites(model9, state)).toEqual([]);
          H.expectNoFinding(SG.test, 'twoStringKite', state);
        });
      });
    });

    it('leaves the skyscraper and the X-Wing near misses to skyscraper and xWing', function () {
      [[NEAR_MISSES[7][1], 'skyscraper'], [NEAR_MISSES[8][1], 'xWing']].forEach(function (p) {
        [p[0], p[0].map(transposeRef)].forEach(function (labels) {
          const finding = runFind(p[1], model9, kiteState(labels));
          expect([p[1], finding !== null]).toEqual([p[1], true]);
        });
      });
    });

    it('needs complete lines and a complete box: an incomplete row, column or box gives nothing', function () {
      const state = kiteState(VECTOR);
      ['R2', 'C2', 'B1'].forEach(function (label) {
        const complete = Uint8Array.from(SG.techniques.createContext(model9, {}).completeUnits);
        complete[unitIndex(model9, label)] = 0;
        const ctx = Object.assign({}, SG.techniques.createContext(model9, {}), { completeUnits: complete });
        expect([label, SG.techniques.get('twoStringKite').find(model9, state, ctx)]).toEqual([label, null]);
      });
      expect(runFind('twoStringKite', model9, state)).not.toBeNull();
      const none = new Uint8Array(model9.units.length);
      const ctx = Object.assign({}, SG.techniques.createContext(model9, {}), { completeUnits: none });
      expect(SG.techniques.get('twoStringKite').find(model9, state, ctx)).toBeNull();
    });

    it('skips a row whose digit is already placed, however many candidates the digit still has in it', function () {
      const state = SG.model.cloneState(kiteState(VECTOR));
      const placed = H.cell(model9, 'R2C5');
      state.value[placed] = 5;
      state.candidates[placed] = 1 << 4;
      expect(removingKites(model9, state)).toEqual([]);
      H.expectNoFinding(SG.test, 'twoStringKite', state, { model: model9 });
    });

    it('needs disjoint lines: rows that share a cell are no conjugate rows, however the candidates lie', function () {
      // On the plain 4 x 4 board the digit map holds a kite: the row R2 {C1, C4}, the column C2 {R1, R4}, the
      // bridge R2C1 - R1C2 in box 1, and R4C4 sees both ends (R2C4 along C4, R4C2 along R4). The extra row X1
      // shares one cell with each of R1 to R4 (it is a row for the model), so none of them is a disjoint line.
      const plain = buildGridModel('fishTestPlain', 2, 2);
      const overlapping = buildGridModel('fishTestOverlap', 2, 2, [[3, 4, 9, 14]]);
      const labels = ['R2C1', 'R2C4', 'R1C2', 'R4C2', 'R4C4'];
      H.expectFinding(SG.test, 'twoStringKite', digitsMap(plain, { 1: labels }), {
        cells: ['R1C2', 'R2C1', 'R2C4', 'R4C2'],
        eliminations: [['R4C4', 1]],
        args: { digit: 1, lines: ['R2', 'C2'], bridge: ['R1C2', 'R2C1'], ends: ['R2C4', 'R4C2'] }
      });
      const crossed = digitsMap(overlapping, { 1: labels });
      expect(removingKites(overlapping, crossed)).toEqual([]);
      H.expectNoFinding(SG.test, 'twoStringKite', crossed);
    });

    it('needs a box that is the only box of both bridge cells (an overlapped box has two owners)', function () {
      // The same position with box 1 listed twice, as an overlapped box of a multi-grid board is: its cells have
      // no single box, so R2C1 and R1C2 bridge nothing.
      const labels = ['R2C1', 'R2C4', 'R1C2', 'R4C2', 'R4C4'];
      const doubled = buildGridModel('fishTestBoxes', 2, 2, undefined, { extraBoxes: [0] });
      const crossed = digitsMap(doubled, { 1: labels });
      expect(removingKites(doubled, crossed)).toEqual([]);
      H.expectNoFinding(SG.test, 'twoStringKite', crossed);
      // another box doubled leaves the bridge alone
      const other = buildGridModel('fishTestBoxes2', 2, 2, undefined, { extraBoxes: [3] });
      expect(removingKites(other, digitsMap(other, { 1: labels }))).toHaveLength(1);
      H.expectFinding(SG.test, 'twoStringKite', digitsMap(other, { 1: labels }), {
        eliminations: [['R4C4', 1]]
      });
    });

    it('lists the two lines in unit order, whichever kind comes first in the model', function () {
      const labels = ['R2C1', 'R2C4', 'R1C2', 'R4C2', 'R4C4'];
      const columnsFirst = buildGridModel('fishTestColumnsFirst', 2, 2, undefined, { columnsFirst: true });
      const state = digitsMap(columnsFirst, { 1: labels });
      const finding = H.expectFinding(SG.test, 'twoStringKite', state, {
        eliminations: [['R4C4', 1]],
        args: { digit: 1, lines: ['C2', 'R2'], bridge: ['R1C2', 'R2C1'], ends: ['R2C4', 'R4C2'] }
      });
      expect(finding.i18nArgs.lines).toEqual(['C2', 'R2']);
      expect(removingKites(columnsFirst, state)[0].lines).toEqual([unitIndex(columnsFirst, 'R2'),
        unitIndex(columnsFirst, 'C2')]);
    });

    it('takes the lowest digit first, then the rows and the columns in line order', function () {
      const both = digitsMap(model9, { 3: VECTOR, 2: VECTOR });
      expect(runFind('twoStringKite', model9, both).i18nArgs.digit).toBe(2);
      // Two kites of the digit 5: the one of the row R2 comes before the one of the row R5.
      const rows = kiteState(VECTOR.concat(fourLabels(FOUR[0])));
      const patterns = removingKites(model9, rows);
      expect(patterns.length).toBe(2);
      expect(patterns.map(function (p) { return unitLabel(model9, p.lines[0]); })).toEqual(['R2', 'R5']);
      H.expectFinding(SG.test, 'twoStringKite', rows, WANT);
      // Two kites on one row: the column C2 comes before the column C3, and once the first has been applied
      // the second is what is left.
      const columns = kiteState(['R2C1', 'R2C8', 'R1C2', 'R7C2', 'R3C3', 'R9C3', 'R7C8', 'R9C8']);
      const listed = removingKites(model9, columns);
      expect(listed.map(function (p) { return [unitLabel(model9, p.lines[0]), unitLabel(model9, p.lines[1])]; }))
        .toEqual([['R2', 'C2'], ['R2', 'C3']]);
      H.expectFinding(SG.test, 'twoStringKite', columns, WANT);
      SG.constraints.eliminate(model9, columns, H.cell(model9, 'R7C8'), 5);
      H.expectFinding(SG.test, 'twoStringKite', columns, {
        cells: ['R2C1', 'R2C8', 'R3C3', 'R9C3'],
        eliminations: [['R9C8', 5]],
        args: { digit: 5, lines: ['R2', 'C3'], bridge: ['R2C1', 'R3C3'], ends: ['R2C8', 'R9C3'] }
      });
    });

    it('gives the same answer for the same state after a call on another state', function () {
      const a = kiteState(VECTOR);
      const b = kiteState(VECTOR.map(transposeRef));
      const first = JSON.stringify(runFind('twoStringKite', model9, a));
      runFind('twoStringKite', model9, b);
      expect(JSON.stringify(runFind('twoStringKite', model9, a))).toBe(first);
    });

    it('hands out its own data: changing a Finding changes neither the next call nor the state', function () {
      const state = kiteState(VECTOR);
      const before = SG.model.cloneState(state);
      const first = runFind('twoStringKite', model9, state);
      const copy = JSON.parse(JSON.stringify(first));
      first.cells.push(99);
      first.eliminations.push([1, 1]);
      first.eliminations[0][0] = 77;
      first.i18nArgs.lines.push('X');
      first.i18nArgs.bridge.push('X');
      first.i18nArgs.ends.length = 0;
      first.i18nArgs.digit = 1;
      expect(runFind('twoStringKite', model9, state)).toEqual(copy);
      expect(state.candidates).toEqual(before.candidates);
      expect(state.value).toEqual(before.value);
    });
  });

  describe('twoStringKite (R11): real positions', function () {
    const entry = SG.fixtures.techniques.byId.twoStringKite;

    // The exact Findings of the two real positive fixtures (core/tests/fixtures/techniques.js).
    const REAL = [
      { cells: ['R5C8', 'R6C2', 'R6C9', 'R9C8'], eliminations: [['R9C2', 5]],
        args: { digit: 5, lines: ['R6', 'C8'], bridge: ['R5C8', 'R6C9'], ends: ['R6C2', 'R9C8'] } },
      { cells: ['R4C2', 'R8C2', 'R9C1', 'R9C8'], eliminations: [['R4C8', 5]],
        args: { digit: 5, lines: ['R9', 'C2'], bridge: ['R8C2', 'R9C1'], ends: ['R4C2', 'R9C8'] } }
    ];

    function positionOf(fixture) {
      return H.stateAfter(model9, fixture.puzzle, fixture.after);
    }

    it('has two positive and three negative fixtures, positions listed explicitly (no ladder helper)', function () {
      expect(entry.positive).toHaveLength(2);
      expect(entry.negative).toHaveLength(3);
      entry.positive.concat(entry.negative).forEach(function (fixture) {
        expect(Array.isArray(fixture.after)).toBe(true);
      });
      entry.positive.forEach(function (fixture) { expect(fixture.after).not.toContain('twoStringKite'); });
      entry.positive.forEach(function (fixture) { expect(fixture.after).toContain('skyscraper'); });
      // nothing left after the kite itself (two positions); the skyscraper position is the one before skyscraper
      expect(entry.negative[0].after).toContain('twoStringKite');
      expect(entry.negative[1].after).toContain('twoStringKite');
      expect(entry.negative[2].after).not.toContain('skyscraper');
      expect(entry.negative[2].after).toContain('xWing');
    });

    REAL.forEach(function (want, i) {
      it('finds the exact Finding of real position ' + (i + 1) + ', sound against an independent completion',
        function () {
          const fixture = entry.positive[i];
          const givens = H.parsePuzzle(model9, fixture.puzzle);
          // the puzzle has exactly one solution (plain depth first search, no technique)
          expect(SG.dfs.countSolutions(model9, givens, 2)).toBe(1);
          const solution = SG.dfs.solve(model9, givens);
          const state = positionOf(fixture);
          const finding = H.expectFinding(SG.test, 'twoStringKite', state, want);
          expect(finding.eliminations.length).toBe(want.eliminations.length);
          finding.eliminations.forEach(function (e) { expect(solution[e[0]]).not.toBe(e[1]); });
          // the position without the eliminated candidates still completes, and only to that solution
          const reduced = SG.model.cloneState(state);
          finding.eliminations.forEach(function (e) {
            expect(SG.constraints.eliminate(model9, reduced, e[0], e[1])).toBe(true);
          });
          const done = SG.dfs.searchFrom(model9, reduced, { limit: 2 });
          expect(done.found).toBe(1);
          expect(Array.from(done.solution)).toEqual(Array.from(solution));
          // the first kite in order is the Finding (the independent enumeration agrees)
          const first = removingKites(model9, state)[0];
          expect(first.targets).toEqual(finding.eliminations.map(function (e) { return e[0]; }));
        });

      it('finds the transposed real position ' + (i + 1) + ' with the transposed eliminations', function () {
        const fixture = entry.positive[i];
        const turned = transposeCells(fixture.puzzle, function (cells) { return cells.join(''); });
        const state = H.stateAfter(model9, turned, fixture.after);
        const wanted = new Set(want.eliminations.map(function (e) {
          return H.cell(model9, transposeRef(e[0])) + ':' + e[1];
        }));
        const keys = eliminationKeys(removingKites(model9, state));
        wanted.forEach(function (key) { expect(keys.has(key)).toBe(true); });
        const finding = runFind('twoStringKite', model9, state);
        expect(finding).not.toBeNull();
        expect(H.findingProblems(model9, state, finding, { technique: 'twoStringKite',
          solution: SG.dfs.solve(model9, H.parsePuzzle(model9, turned)) })).toEqual([]);
      });
    });

    it('finds nothing at the negative positions: nothing left after it, a shared cell, a skyscraper', function () {
      entry.negative.forEach(function (fixture) {
        const state = positionOf(fixture);
        H.expectNoFinding(SG.test, 'twoStringKite', state);
        expect(removingKites(model9, state)).toEqual([]);
      });
      const skyscraper = positionOf(entry.negative[2]);
      expect(runFind('skyscraper', model9, skyscraper)).not.toBeNull();
    });

    it('has a negative whose near kite shares a cell and would remove the solution of R6C8', function () {
      const fixture = entry.negative[1];
      const state = positionOf(fixture);
      const solution = SG.dfs.solve(model9, H.parsePuzzle(model9, fixture.puzzle));
      const row = unitsOfKind(model9, 'row')[4];
      const col = unitsOfKind(model9, 'col')[2];
      const open = function (u) {
        return Array.from(model9.units[u]).filter(function (c) {
          return state.value[c] === 0 && (state.candidates[c] & 4) !== 0;
        });
      };
      // R5 holds the digit 3 only in R5C3 and R5C8, C3 only in R5C3 and R6C3: they share R5C3
      expect(open(row)).toEqual([H.cell(model9, 'R5C3'), H.cell(model9, 'R5C8')]);
      expect(open(col)).toEqual([H.cell(model9, 'R5C3'), H.cell(model9, 'R6C3')]);
      // R6C8 sees the two free ends R5C8 and R6C3, and it is where the digit 3 goes
      const peers = peerSetsOf(model9);
      expect(peers[H.cell(model9, 'R5C8')].has(H.cell(model9, 'R6C8'))).toBe(true);
      expect(peers[H.cell(model9, 'R6C3')].has(H.cell(model9, 'R6C8'))).toBe(true);
      expect(solution[H.cell(model9, 'R6C8')]).toBe(3);
      expect(state.candidates[H.cell(model9, 'R6C8')] & 4).toBe(4);
    });
  });

  describe('twoStringKite (R11): work limit, budget and cancellation', function () {
    // Digits 1 to 8 may only go in one horizontal domino of every box of a 16 digit board (box (rb, cb) holds
    // its domino in the row 4 rb + (rb + cb) mod 4, in the columns 4 cb and 4 cb + 1 for rb < 2 and 4 cb + 2 and
    // 4 cb + 3 for rb >= 2). Every row and every column holds a digit in exactly two cells, so each digit has 16
    // conjugate rows and 16 conjugate columns; the two cells of a row lie in one box, and the only cells of a
    // conjugate column in that box are those of the domino, so no pair of a row and a column has four distinct
    // cells and a bridge: a call tests 8 digits x 16 x 16 = 2048 pairs and finds nothing.
    const FLOOD_WORK = 2048;
    let flood = null;

    function floodState() {
      if (flood === null) {
        const model = modelOfDigits(16);
        const domino = new Set();
        for (let rb = 0; rb < 4; rb++) {
          for (let cb = 0; cb < 4; cb++) {
            const r = 4 * rb + (rb + cb) % 4;
            const c = 4 * cb + (rb >= 2 ? 2 : 0);
            domino.add(r * 16 + c);
            domino.add(r * 16 + c + 1);
          }
        }
        const eliminate = [];
        for (let c = 0; c < model.cellCount; c++) {
          if (domino.has(c)) continue;
          for (let d = 1; d <= 8; d++) eliminate.push([c, d]);
        }
        flood = { model: model, state: H.makeState(model, blankPuzzle(model), { eliminate: eliminate,
          propagate: false }) };
      }
      return flood;
    }

    const VECTOR = ['R2C1', 'R2C8', 'R1C2', 'R7C2', 'R7C8'];

    function caught(fn) {
      try {
        fn();
      } catch (err) {
        return err;
      }
      return null;
    }

    function observed(model, state, options, ctxOptions) {
      const records = [];
      const ctx = SG.techniques.createContext(model, Object.assign({
        onPatternWork: function (r) { records.push(r); }
      }, ctxOptions));
      const finding = SG.fishSearch.twoStringKite(model, state, ctx, options);
      return { finding: finding, records: records, record: records[0] };
    }

    it('has no kite in the flood position, which a plain enumeration confirms', function () {
      const f = floodState();
      expect(referenceKites(f.model, f.state)).toEqual([]);
      H.expectNoFinding(SG.test, 'twoStringKite', f.state);
    });

    it('has R10\'s limit of 50000 tested pairs, and the registered finder reports it', function () {
      expect(SG.fishSearch.KITE_WORK_LIMIT).toBe(50000);
      const state = digitsMap(model9, { 5: VECTOR });
      const records = [];
      const ctx = SG.techniques.createContext(model9, { onPatternWork: function (r) { records.push(r); } });
      expect(SG.techniques.get('twoStringKite').find(model9, state, ctx)).not.toBeNull();
      expect(records).toEqual([{ id: 'twoStringKite', work: 1, limit: 50000, capHit: null, retained: null }]);
    });

    it('counts one unit per tested pair of a row and a column, from a fresh counter on every call', function () {
      const f = floodState();
      const first = observed(f.model, f.state);
      expect(first.finding).toBeNull();
      expect(first.record).toEqual({ id: 'twoStringKite', work: FLOOD_WORK, limit: 50000, capHit: null,
        retained: null });
      const second = observed(f.model, f.state);
      expect(second.record).toEqual(first.record);
      expect(second.record).not.toBe(first.record);
      // a position without a conjugate pair costs nothing; a finding stops the count where it is found
      const empty = H.makeState(model9, blankPuzzle(model9), { propagate: false });
      expect(observed(model9, empty).record.work).toBe(0);
      const found = observed(model9, digitsMap(model9, { 5: VECTOR }));
      expect(found.finding).not.toBeNull();
      expect(found.record.work).toBe(1);
      // the rows R2 and R7 and the column C2 are conjugate: two tested pairs, and R7C5 sees only one end
      const noKite = observed(model9, digitsMap(model9, { 5: ['R2C1', 'R2C8', 'R1C2', 'R7C2', 'R7C5'] }));
      expect(noKite.finding).toBeNull();
      expect(noKite.record.work).toBe(2);
    });

    it('has no kite and costs no work on a board without boxes (a Latin square), unlike the same position with them',
      function () {
        const labels = ['R2C1', 'R2C4', 'R1C2', 'R4C2', 'R4C4'];
        const plain = buildGridModel('fishTestPlain', 2, 2);
        const square = buildGridModel('fishTestLatin', 2, 2, undefined, { noBoxes: true });
        expect(unitsOfKind(square, 'box')).toEqual([]);
        const state = digitsMap(square, { 1: labels });
        expect(referenceKites(square, state)).toEqual([]);
        const out = observed(square, state);
        expect(out.finding).toBeNull();
        expect(out.record.work).toBe(0);
        const control = observed(plain, digitsMap(plain, { 1: labels }));
        expect(control.finding).not.toBeNull();
        expect(control.record.work).toBe(1);
      });

    it('ends a call whose limit is spent with nothing found (never a finding), and says so', function () {
      const f = floodState();
      [0, 1, 100, FLOOD_WORK - 1].forEach(function (limit) {
        const out = observed(f.model, f.state, { workLimit: limit });
        expect(out.finding).toBeNull();
        expect(out.record).toEqual({ id: 'twoStringKite', work: limit, limit: limit, capHit: 'work',
          retained: null });
      });
      const exact = observed(f.model, f.state, { workLimit: FLOOD_WORK });
      expect(exact.record.capHit).toBeNull();
      expect(exact.record.work).toBe(FLOOD_WORK);
      // a limit of 0 loses the vector's deduction; the first tested pair finds it with a limit of 1
      const state = digitsMap(model9, { 5: VECTOR });
      const lost = observed(model9, state, { workLimit: 0 });
      expect(lost.finding).toBeNull();
      expect(lost.record.capHit).toBe('work');
      const kept = observed(model9, state, { workLimit: 1 });
      expect(kept.finding).toEqual(observed(model9, state).finding);
      expect(kept.record.capHit).toBeNull();
    });

    it('floors a fractional limit and rejects an invalid one with solver.invalidOption', function () {
      const f = floodState();
      expect(observed(f.model, f.state, { workLimit: 2.9 }).record.work).toBe(2);
      [-1, NaN, Infinity, '5', null].forEach(function (workLimit) {
        const err = caught(function () { observed(f.model, f.state, { workLimit: workLimit }); });
        expect([String(workLimit), err && err.code]).toEqual([String(workLimit), 'solver.invalidOption']);
        expect(err.message).toContain('fishSearch.twoStringKite');
      });
    });

    /**
     * The work done at each check of the parent budget: a context whose k-th check throws a spent budget lets the
     * record of the (swallowed) call tell how many pairs were tested at that check.
     */
    function checkWorks(model, state, options) {
      const base = SG.techniques.createContext(model, {});
      function attempt(target) {
        let k = 0;
        let record = null;
        const ctx = Object.assign({}, base, {
          options: { onPatternWork: function (r) { record = r; } },
          check: function () {
            k++;
            if (k === target) throw new SG.errors.GenerationError('budget.exceeded', { reason: 'nodes' });
          }
        });
        const finding = SG.fishSearch.twoStringKite(model, state, ctx, options);
        return { checks: k, record: record, finding: finding };
      }
      const free = attempt(0);
      const works = [];
      for (let target = 1; target <= free.checks; target++) {
        const spent = attempt(target);
        expect(spent.finding).toBeNull();
        expect(spent.record.capHit).toBeNull();
        works.push(spent.record.work);
      }
      const gaps = works.map(function (w, i) { return w - (i === 0 ? 0 : works[i - 1]); });
      gaps.push(free.record.work - works[works.length - 1]);
      return { works: works, gaps: gaps, max: Math.max.apply(null, gaps), free: free };
    }

    it('checks the parent budget at entry and so that at most 256 pairs pass between two checks', function () {
      const f = floodState();
      const out = checkWorks(f.model, f.state);
      expect(out.works[0]).toBe(0);
      expect(out.works).toEqual([0, 256, 512, 768, 1024, 1280, 1536, 1792]);
      expect(out.max).toBeLessThanOrEqual(256);
      expect(out.free.checks).toBe(8);
      // a call that ends at its limit keeps the same cadence
      const capped = checkWorks(f.model, f.state, { workLimit: 1000 });
      expect(capped.works).toEqual([0, 256, 512, 768]);
      // a small call has only the entry check
      expect(checkWorks(model9, digitsMap(model9, { 5: VECTOR })).works).toEqual([0]);
    });

    it('reports a spent budget as nothing found and lets cancellation and other errors through', function () {
      const f = floodState();
      const parent = SG.budget.create({ nodes: 3 });
      const spent = observed(f.model, f.state, undefined, { budget: parent });
      expect(spent.finding).toBeNull();
      expect(spent.records).toHaveLength(1);
      expect(spent.record.capHit).toBeNull();
      expect(spent.record.work).toBeLessThan(FLOOD_WORK);
      // capHit null is no proof of a complete scan: the caller's budget still fails after the call
      expect(caught(function () { parent.check(); }).code).toBe('budget.exceeded');

      const budget = SG.budget.create({});
      budget.cancel();
      const records = [];
      const err = caught(function () {
        SG.techniques.get('twoStringKite').find(f.model, f.state, SG.techniques.createContext(f.model, {
          budget: budget, onPatternWork: function (r) { records.push(r); } }));
      });
      expect(err.code).toBe('budget.cancelled');
      expect(records).toEqual([]);

      // cancellation in the middle of the scan, and an error that is not a budget error
      [['budget.cancelled', true], ['boom', false]].forEach(function (kind) {
        let k = 0;
        const ctx = Object.assign({}, SG.techniques.createContext(f.model, {}), {
          check: function () {
            if (++k === 3) {
              throw kind[1] ? new SG.errors.GenerationError(kind[0], { reason: 'cancelled' }) : new Error(kind[0]);
            }
          }
        });
        const thrown = caught(function () { SG.techniques.get('twoStringKite').find(f.model, f.state, ctx); });
        expect(thrown).toBeTruthy();
        expect(kind[1] ? thrown.code : thrown.message).toBe(kind[0]);
        expect(k).toBe(3);
      });
    });

    it('is not fooled by a hostile or absent observer', function () {
      const state = digitsMap(model9, { 5: VECTOR });
      const plain = JSON.stringify(runFind('twoStringKite', model9, state));
      ['not a function', null, 7].forEach(function (observer) {
        const ctx = SG.techniques.createContext(model9, { onPatternWork: observer });
        expect(JSON.stringify(SG.techniques.get('twoStringKite').find(model9, state, ctx))).toBe(plain);
      });
    });
  });

  describe('twoStringKite (R11): a region as the box, and the ownership on multi-grid boards', function () {
    // A region of a jigsaw board is a box-like unit: a bridge may lie in it. J4 of JIGSAW_LAYOUT holds R3C5 (row
    // R3) and R4C7 (column C7), the other cells of the two lines are R3C9 and R8C7, and R8C9 sees both (R3C9 along
    // C9, R8C7 along R8). R8 and C9 are conjugate pairs too, but each of them shares a cell with the row or the
    // column of the vector, so that the vector holds exactly one kite.
    const JIGSAW = ['R3C5', 'R3C9', 'R4C7', 'R8C7', 'R8C9'];

    function inCellOrderOf(model, labels) {
      return labels.slice().sort(function (a, b) { return H.cell(model, a) - H.cell(model, b); });
    }

    it('has no box on the jigsaw board: its nine regions are the box-like units', function () {
      const board = jigsawBoard(false);
      [board, jigsawBoard(true)].concat(SG.testkit.hasVariant('jigsaw9') ? [H.model('jigsaw9')] : [])
        .forEach(function (model) {
          expect(unitsOfKind(model, 'box')).toEqual([]);
          expect(unitsOfKind(model, 'region')).toHaveLength(9);
        });
      expect(unitLabel(board, crossUnit(board, H.cell(board, 'R3C5'), 'region'))).toBe('J4');
    });

    it('bridges through a region: the vector on the jigsaw board (J4 holds R3C5 and R4C7)', function () {
      const board = jigsawBoard(false);
      const state = digitsMap(board, { 5: JIGSAW });
      const patterns = removingKites(board, state);
      expect(patterns.length).toBe(1);
      expect(patterns[0].targets).toEqual([H.cell(board, 'R8C9')]);
      expect(unitLabel(board, crossUnit(board, H.cell(board, 'R3C5'), 'region'))).toBe('J4');
      expect(unitLabel(board, crossUnit(board, H.cell(board, 'R4C7'), 'region'))).toBe('J4');
      const finding = H.expectFinding(SG.test, 'twoStringKite', state, {
        cells: ['R3C5', 'R3C9', 'R4C7', 'R8C7'],
        eliminations: [['R8C9', 5]],
        args: { digit: 5, lines: ['R3', 'C7'], bridge: ['R3C5', 'R4C7'], ends: ['R3C9', 'R8C7'] }
      });
      expect(finding.placements).toEqual([]);
    });

    it('finds the transposed vector on the transposed jigsaw board (J4 holds R5C3 and R7C4)', function () {
      const turned = jigsawBoard(true);
      const labels = JIGSAW.map(transposeRef);
      const state = digitsMap(turned, { 5: labels });
      const patterns = removingKites(turned, state);
      expect(patterns.length).toBe(1);
      expect(patterns[0].targets).toEqual([H.cell(turned, 'R9C8')]);
      expect(unitLabel(turned, crossUnit(turned, H.cell(turned, 'R5C3'), 'region'))).toBe('J4');
      expect(unitLabel(turned, crossUnit(turned, H.cell(turned, 'R7C4'), 'region'))).toBe('J4');
      H.expectFinding(SG.test, 'twoStringKite', state, {
        cells: inCellOrderOf(turned, ['R3C5', 'R3C9', 'R4C7', 'R8C7'].map(transposeRef)),
        eliminations: [['R9C8', 5]],
        args: { digit: 5, lines: ['R7', 'C3'], bridge: inCellOrderOf(turned, ['R3C5', 'R4C7'].map(transposeRef)),
          ends: inCellOrderOf(turned, ['R3C9', 'R8C7'].map(transposeRef)) }
      });
    });

    // Near misses on the jigsaw board: they look like the vector, checked first against the independent
    // enumeration. The bridge cells lie in different regions, or in the same 3 x 3 block but in different regions
    // (a block is no box of this board), or one of them lies in a region together with a third candidate line.
    const JIGSAW_MISSES = [
      ['the bridge cells lie in different regions (R3C4 is in J2, R4C7 in J4)', ['R3C4', 'R3C9', 'R4C7', 'R8C7', 'R8C9']],
      ['the bridge cells lie in one 3 x 3 block but in different regions (R2C3 is in J2, R3C2 in J5)',
        ['R2C3', 'R2C9', 'R3C2', 'R7C2', 'R7C9']],
      ['a third candidate in the row (R3 is no conjugate pair)', JIGSAW.concat(['R3C1'])],
      ['a target that sees only the end R3C9', ['R3C5', 'R3C9', 'R4C7', 'R8C7', 'R1C9']]
    ];

    JIGSAW_MISSES.forEach(function (miss) {
      [['as listed', false], ['transposed', true]].forEach(function (variant) {
        it('does not authorize an elimination on the jigsaw board: ' + miss[0] + ' (' + variant[0] + ')',
          function () {
            const board = jigsawBoard(variant[1]);
            const state = digitsMap(board, { 5: variant[1] ? miss[1].map(transposeRef) : miss[1] });
            expect(removingKites(board, state)).toEqual([]);
            H.expectNoFinding(SG.test, 'twoStringKite', state);
          });
      });
    });

    it('counts the owners of a cell over both kinds: a box and a region over the same cells bridge nothing',
      function () {
        // The 4 x 4 position of "needs disjoint lines": R2C1 and R1C2 bridge through box 1. With a region listed
        // over box 1 as well, those two cells have two box-like owners (one of each kind), as an overlapped box
        // has; a region over another box leaves the bridge alone.
        const labels = ['R2C1', 'R2C4', 'R1C2', 'R4C2', 'R4C4'];
        const both = buildGridModel('fishTestBoxAndRegion', 2, 2, undefined, { extraRegions: [0] });
        const crossed = digitsMap(both, { 1: labels });
        expect(removingKites(both, crossed)).toEqual([]);
        H.expectNoFinding(SG.test, 'twoStringKite', crossed);
        const other = buildGridModel('fishTestBoxAndRegion2', 2, 2, undefined, { extraRegions: [3] });
        expect(removingKites(other, digitsMap(other, { 1: labels }))).toHaveLength(1);
        H.expectFinding(SG.test, 'twoStringKite', digitsMap(other, { 1: labels }), {
          eliminations: [['R4C4', 1]]
        });
      });

    it('has a region as the only box-like unit of a board of rows, columns and regions (the jigsaw layout)',
      function () {
        // The 4 x 4 grid with its boxes taken out and listed as regions instead: the same kite as on the plain board.
        const labels = ['R2C1', 'R2C4', 'R1C2', 'R4C2', 'R4C4'];
        const plain = buildGridModel('fishTestPlainRegions', 2, 2);
        const regions = SG.model.create({
          variantId: 'fishTestRegions', digits: 4, cellCount: 16,
          units: plain.units.map(function (cells) { return Array.from(cells); }),
          unitMeta: plain.unitMeta.map(function (meta) {
            return meta.kind === 'box' ? { kind: 'region', gridIndex: 0, label: meta.label.replace('B', 'J') } : meta;
          }),
          layout: plain.layout
        });
        expect(unitsOfKind(regions, 'box')).toEqual([]);
        const state = digitsMap(regions, { 1: labels });
        expect(removingKites(regions, state)).toHaveLength(1);
        H.expectFinding(SG.test, 'twoStringKite', state, {
          cells: ['R1C2', 'R2C1', 'R2C4', 'R4C2'],
          eliminations: [['R4C4', 1]],
          args: { digit: 1, lines: ['R2', 'C2'], bridge: ['R1C2', 'R2C1'], ends: ['R2C4', 'R4C2'] }
        });
      });

    // The Samurai: the center grid G5 shares its four corner boxes with the corner grids, so a cell of such a
    // box has two boxes and lies in a row and a column of two grids. Nothing of this board is excluded wholesale:
    // a kite inside the middle band of the center grid is found, and the same digit map moved onto an overlapped
    // box is not.
    function samurai() {
      if (!SG.testkit.hasVariant('samurai')) SG.test.skip('no board of samurai can be built here');
      return H.model('samurai');
    }

    function boxesOf(model, label) {
      return Array.from(model.cellUnits[H.cell(model, label)]).filter(function (u) {
        return model.unitMeta[u].kind === 'box';
      });
    }

    it('finds a kite in the middle band of the Samurai center grid (rows and columns of one grid only)',
      function () {
        const board = samurai();
        // G5 row 5 {C4, C8} and column 5 {R6, R9}: the bridge G5-R5C4 and G5-R6C5 lie in the box G5-B5, and
        // G5-R9C8 (listed as G4-R3C2, a cell of an overlapped box) sees both ends along its column and its row.
        const labels = ['G5-R5C4', 'G5-R5C8', 'G5-R6C5', 'G5-R9C5', 'G4-R3C2'];
        expect(boxesOf(board, 'G5-R5C4')).toHaveLength(1);
        expect(boxesOf(board, 'G5-R6C5')).toHaveLength(1);
        const state = digitsMap(board, { 5: labels });
        expect(removingKites(board, state)).toHaveLength(1);
        H.expectFinding(SG.test, 'twoStringKite', state, {
          cells: ['G5-R5C4', 'G5-R5C8', 'G5-R6C5', 'G5-R9C5'],
          eliminations: [['G4-R3C2', 5]],
          args: { digit: 5, lines: ['G5-R5', 'G5-C5'], bridge: ['G5-R5C4', 'G5-R6C5'], ends: ['G5-R5C8', 'G5-R9C5'] }
        });
      });

    it('finds nothing through an overlapped box of the Samurai: its bridge cells have two boxes', function () {
      const board = samurai();
      // The same shape on the corner of the center grid: G5 row 2 {C1, C5} and column 2 {R3, R5}, the bridge
      // G1-R8C7 (= G5-R2C1) and G1-R9C8 (= G5-R3C2) in the box G1-B9 = G5-B1. Both bridge cells have two boxes
      // and the two lines pass through overlapped cells, so no kite is a kite of one grid.
      const labels = ['G1-R8C7', 'G5-R2C5', 'G1-R9C8', 'G5-R5C2', 'G5-R5C5'];
      expect(boxesOf(board, 'G1-R8C7')).toHaveLength(2);
      expect(boxesOf(board, 'G1-R9C8')).toHaveLength(2);
      expect(boxesOf(board, 'G1-R8C7')).toEqual(boxesOf(board, 'G1-R9C8'));
      const state = digitsMap(board, { 5: labels });
      expect(removingKites(board, state)).toEqual([]);
      H.expectNoFinding(SG.test, 'twoStringKite', state);
    });
  });

  describe('twoStringKite (R11): agreement with an independent enumeration', function () {
    const cache = {};

    function itemsOf(model, count, seed) {
      const key = model.variantId + '/' + model.digits + '/' + seed;
      if (!cache[key]) {
        cache[key] = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), count);
      }
      return cache[key];
    }

    function ascending(list) {
      return list.slice().sort(function (a, b) { return a - b; });
    }

    /** The Finding is the first pattern of the enumeration that removes something, field by field. */
    function agree(model, item, index) {
      const patterns = removingKites(model, item.state);
      const finding = runFind('twoStringKite', model, item.state);
      check((finding !== null) === (patterns.length > 0), 'twoStringKite ' + (finding !== null
        ? 'reported a pattern that the enumeration does not know' : 'missed a pattern the enumeration found') +
        '\n  ' + describeItem(model, item, index));
      if (finding === null) return false;
      const first = patterns[0];
      check(finding.i18nArgs.digit === first.digit, 'digit ' + finding.i18nArgs.digit + ' is not the first ' +
        'pattern\'s ' + first.digit + '\n  ' + describeItem(model, item, index));
      check(JSON.stringify(finding.eliminations) === JSON.stringify(first.targets.map(function (c) {
        return [c, first.digit];
      })), 'the eliminations are not those of the first pattern\n  ' + describeItem(model, item, index));
      check(JSON.stringify(finding.cells) === JSON.stringify(ascending(first.bridge.concat(first.ends))),
        'the cells are not the four cells of the first pattern\n  ' + describeItem(model, item, index));
      check(JSON.stringify(finding.i18nArgs.lines) === JSON.stringify(ascending(first.lines).map(function (u) {
        return unitLabel(model, u);
      })), 'the lines are not those of the first pattern\n  ' + describeItem(model, item, index));
      check(JSON.stringify(finding.i18nArgs.bridge) === JSON.stringify(ascending(first.bridge).map(function (c) {
        return H.label(model, c);
      })), 'the bridge is not that of the first pattern\n  ' + describeItem(model, item, index));
      check(JSON.stringify(finding.i18nArgs.ends) === JSON.stringify(ascending(first.ends).map(function (c) {
        return H.label(model, c);
      })), 'the ends are not those of the first pattern\n  ' + describeItem(model, item, index));
      return true;
    }

    [['classic9', 400, 777, 100], ['classic9', 400, 99, 100], ['classic6', 400, 777, 100],
      ['classic4', 300, 777, 15]].forEach(function (setup) {
      it('finds a kite exactly when one exists and removes exactly its candidates on ' + setup[0] +
        ' (seed ' + setup[2] + ')', function () {
        const model = H.model(setup[0]);
        let withPattern = 0;
        itemsOf(model, setup[1], setup[2]).forEach(function (item, index) {
          if (agree(model, item, index)) withPattern++;
        });
        expect(withPattern).toBeGreaterThanOrEqual(setup[3]);
      });
    });

    [12, 16].forEach(function (D) {
      it('agrees on ' + D + ' digits (box shapes of 3 x 4 and 4 x 4, no 9 x 9 arithmetic)', function () {
        const model = modelOfDigits(D);
        let withPattern = 0;
        itemsOf(model, D === 12 ? 60 : 32, 2026).forEach(function (item, index) {
          if (agree(model, item, index)) withPattern++;
        });
        expect(withPattern).toBeGreaterThanOrEqual(D === 12 ? 20 : 12);
      });
    });

    [['diagonalX', 20], ['hyper', 20]].forEach(function (setup) {
      it('agrees on ' + setup[0] + ' (extra regions are real peers of the targets, not bridges)', function () {
        if (!SG.testkit.hasVariant(setup[0])) SG.test.skip('no board of ' + setup[0] + ' can be built here');
        const model = H.model(setup[0]);
        let withPattern = 0;
        itemsOf(model, 120, 4242).forEach(function (item, index) {
          if (agree(model, item, index)) withPattern++;
        });
        expect(withPattern).toBeGreaterThanOrEqual(setup[1]);
      });
    });

    it('agrees on the jigsaw board and on its transpose, where the irregular regions are the bridges', function () {
      [jigsawBoard(false), jigsawBoard(true)].forEach(function (model) {
        let withPattern = 0;
        itemsOf(model, 120, 4242).forEach(function (item, index) {
          if (agree(model, item, index)) withPattern++;
        });
        expect([model.variantId, withPattern >= 20]).toEqual([model.variantId, true]);
      });
    });

    it('agrees on the jigsaw9 board of the environment, whatever its layout (no minimum: the layouts differ)',
      function () {
        if (!SG.testkit.hasVariant('jigsaw9')) SG.test.skip('no board of jigsaw9 can be built here');
        const model = H.model('jigsaw9');
        expect(unitsOfKind(model, 'box')).toEqual([]);
        itemsOf(model, 120, 4242).forEach(function (item, index) { agree(model, item, index); });
      });

    it('stays sound on the irregular jigsaw boards: every kite removes only candidates that are not the solution',
      function () {
        [jigsawBoard(false), jigsawBoard(true)].forEach(function (model) {
          const stats = H.assertSound(SG.test, 'twoStringKite',
            { model: model, states: itemsOf(model, 120, 4242), minFirings: 20 });
          expect([model.variantId, stats.firings >= 20]).toEqual([model.variantId, true]);
        });
        if (SG.testkit.hasVariant('jigsaw9')) {
          const own = H.model('jigsaw9');
          H.assertSound(SG.test, 'twoStringKite', { model: own, states: itemsOf(own, 120, 4242), minFirings: 0 });
        }
      });

    it('agrees on the multi-grid boards (overlapped boxes and lines have no single owner)', function () {
      const minimum = { samurai: 2, sohei: 3, butterfly: 0, flower: 0 };
      const boards = Object.keys(minimum).filter(function (variant) { return SG.testkit.hasVariant(variant); });
      if (boards.length === 0) SG.test.skip('no multi-grid board can be built here');
      boards.forEach(function (variant) {
        const model = H.model(variant);
        let withPattern = 0;
        itemsOf(model, 12, 4242).forEach(function (item, index) {
          if (agree(model, item, index)) withPattern++;
        });
        expect([variant, withPattern >= minimum[variant]]).toEqual([variant, true]);
      });
    });
  });

  describe('fish: agreement with brute-force references', function () {
    const SETUPS = [['classic9', 400, 10], ['classic6', 400, 0], ['classic4', 300, 0]];
    const cache = {};

    /** Random states with a known solution per variant, made when first needed and shared by the tests. */
    function itemsOf(variant, count, seed) {
      const key = variant + '/' + seed;
      if (!cache[key]) {
        cache[key] = H.randomStatesWithKnownSolution(H.model(variant), SG.testkit.rng.create(seed), count);
      }
      return cache[key];
    }

    SETUPS.forEach(function (setup) {
      const variant = setup[0];

      FISH_IDS.forEach(function (id) {
        it(id + ' on ' + variant + ': finds a fish exactly when one exists and removes only its candidates',
          function () {
            const model = H.model(variant);
            const size = FISH_SIZE[id];
            let withFish = 0;
            itemsOf(variant, setup[1], 777).forEach(function (item, index) {
              const finding = runFind(id, model, item.state);
              const reference = referenceFish(model, item.state, size);
              check((finding !== null) === (reference.size > 0), id + ' ' +
                (finding !== null ? 'reported a fish that the reference does not know' :
                  'missed a fish the reference found (' + reference.size + ' eliminations)') +
                '\n  ' + describeItem(model, item, index));
              if (finding === null) return;
              withFish++;
              finding.eliminations.forEach(function (e) {
                check(reference.has(e[0] + ':' + e[1]), id + ' removed ' + H.label(model, e[0]) + '-' + e[1] +
                  ', which no fish of this size removes\n  ' + describeItem(model, item, index));
              });
            });
            expect(withFish).toBeGreaterThanOrEqual(setup[2]);
          });
      });
    });

    it('simpleColouring on classic9/6/4: finds a deduction exactly when the reference does', function () {
      let withColouring = 0;
      SETUPS.forEach(function (setup) {
        const model = H.model(setup[0]);
        itemsOf(setup[0], setup[1], 778).forEach(function (item, index) {
          const finding = runFind('simpleColouring', model, item.state);
          const reference = referenceColouring(model, item.state);
          check((finding !== null) === (reference.size > 0), 'simpleColouring ' +
            (finding !== null ? 'reported a deduction the reference does not know' :
              'missed a deduction the reference found') + '\n  ' + describeItem(model, item, index));
          if (finding === null) return;
          withColouring++;
          finding.eliminations.forEach(function (e) {
            check(reference.has(e[0] + ':' + e[1]), 'simpleColouring removed ' + H.label(model, e[0]) + '-' +
              e[1] + ', which the reference does not\n  ' + describeItem(model, item, index));
          });
        });
      });
      expect(withColouring).toBeGreaterThan(10);
    });
  });

  // The 300 classic9 states of the default seed are in the sweep of techniques.test.js.
  describe('soundness (invariant I7)', function () {
    ALL_IDS.forEach(function (id) {
      it(id + ' stays sound on 1200 more states of another seed', function () {
        H.assertSound(SG.test, id, { count: 1200, seed: 99, minFirings: 3 });
      });
    });

    ['classic6', 'classic4'].forEach(function (variant) {
      it('every fish technique and colouring stay sound on ' + variant, function () {
        const model = H.model(variant);
        ALL_IDS.forEach(function (id) {
          H.assertSound(SG.test, id, { model: model, count: 400 });
        });
      });
    });

    [12, 16].forEach(function (D) {
      it('every fish technique and colouring stay sound on ' + D + ' digits', function () {
        const model = modelOfDigits(D);
        const states = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(2026), D === 12 ? 60 : 32);
        let firings = 0;
        ALL_IDS.forEach(function (id) {
          firings += H.assertSound(SG.test, id, { model: model, states: states }).firings;
        });
        expect(firings).toBeGreaterThan(0);
      });
    });

    it('fish built from a solved grid are sound for every size, orientation and digit count', function () {
      [9, 12, 16].forEach(function (D) {
        const model = modelOfDigits(D);
        FISH_IDS.forEach(function (id) {
          ['row', 'col'].forEach(function (orientation) {
            const f = buildFish(model, orientation, FISH_SIZE[id]);
            const finding = runFind(id, model, f.state);
            const problems = H.findingProblems(model, f.state, finding,
              { technique: id, solution: f.solution });
            expect(problems).toEqual([]);
          });
        });
      });
    });
  });
})();
