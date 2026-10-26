// Fish techniques: X-Wing, Simple Colouring, Swordfish, Jellyfish (../core/js/engine/tech-fish.js).
//
// Fixtures: the published positions are the example boards of the SudokuWiki strategy pages (X-Wing,
// Swordfish, Jellyfish, Simple Colouring). Each one is the puzzle plus the candidate grid the page shows when
// the pattern applies, typed in as digit strings per cell (a solved cell is a one digit string). The page
// descriptions (digit, rows, columns, shape, the cells named in the text) are asserted, so a fixture is
// checked against what the source says, not only against the code under test.
// Every other check is built from the model's own units or from a solved grid, never from a published
// board, so it holds for any digit count.
(function () {
  'use strict';

  const root = typeof self !== 'undefined' ? self : globalThis;
  const SG = root.SG;
  const H = SG.techHelper;
  const model9 = H.model('classic9');

  const ALL_IDS = ['xWing', 'simpleColouring', 'swordfish', 'jellyfish'];
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
   * `extraRows` adds more units of kind 'row' (lists of cells) to imitate overlapping sub-grids.
   */
  function buildGridModel(variantId, boxRows, boxCols, extraRows) {
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
    for (let r = 0; r < D; r++) {
      units.push(Array.from({ length: D }, function (_, c) { return r * D + c; }));
      unitMeta.push({ kind: 'row', gridIndex: 0, label: 'R' + (r + 1) });
    }
    for (let c = 0; c < D; c++) {
      units.push(Array.from({ length: D }, function (_, r) { return r * D + c; }));
      unitMeta.push({ kind: 'col', gridIndex: 0, label: 'C' + (c + 1) });
    }
    for (let b = 0; b < D; b++) {
      const top = Math.floor(b / (D / boxCols)) * boxRows;
      const left = (b % (D / boxCols)) * boxCols;
      const cells = [];
      for (let r = 0; r < boxRows; r++) {
        for (let c = 0; c < boxCols; c++) cells.push((top + r) * D + left + c);
      }
      units.push(cells);
      unitMeta.push({ kind: 'box', gridIndex: 0, label: 'B' + (b + 1) });
    }
    (extraRows || []).forEach(function (cells, i) {
      units.push(cells);
      unitMeta.push({ kind: 'row', gridIndex: 1, label: 'X' + (i + 1) });
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

  function describeItem(model, item, index) {
    return 'state #' + index + ' (' + item.kind + ')\n  puzzle: ' + H.puzzleString(model, item.givens);
  }

  describe('fish techniques: registration', function () {
    const EXPECTED = {
      xWing: { baseCost: 32, order: 110 },
      simpleColouring: { baseCost: 36, order: 120 },
      swordfish: { baseCost: 42, order: 130 },
      jellyfish: { baseCost: 56, order: 160 }
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

    it('runs in ladder order: xWing, simpleColouring, swordfish, jellyfish', function () {
      const order = SG.techniques.list().map(function (def) { return def.id; });
      const at = ALL_IDS.map(function (id) { return order.indexOf(id); });
      at.forEach(function (index) { expect(index).toBeGreaterThanOrEqual(0); });
      expect(at.slice().sort(function (a, b) { return a - b; })).toEqual(at);
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
      ALL_IDS.forEach(function (id) {
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
