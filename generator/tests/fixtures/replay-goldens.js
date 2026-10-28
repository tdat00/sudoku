/**
 * Golden data of the Generation Steps replay: 14 requests of docs/generation-steps/gpt-6-astra/
 * 4-acceptance-data.md (generated again and checked field by field by both researchers).
 * SG.fixtures.replayGoldens = [{ id, request, today, counts, board, rows, details, alive, folds, jumps }].
 * rows: [step, m, phase, E, score, delta, hardest, J, culprit, line] of the compact view.
 * G09-G12 are read from SG.fixtures.replayWire (tests/fixtures/replay-wire.js); the others are generated.
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};
  SG.fixtures = SG.fixtures || {};

  var GOLDENS = [
    {
      id: 'G01', request: { variantId: 'classic9', difficulty: 'expert', seed: '3275974478' },
      today: { steps: 21, missing: 10 }, counts: { compact: 7, details: 33 },
      board: { cells: 81, cages: 0, signsFrom: 0, signsTo: 0, log: 'normal' },
      // [#, m, phase, E, score, delta, hardest, J, culprit, line]
      rows: [
        [1, 0, 'S/Sol', 0, 0, 0, '—', '—', '—', '—'],
        [2, 7, 'D/Dig', 14, 23, 23, 'nakedSingle', '—', '—', 'F'],
        [3, 22, 'D/Dig', 43, 44, 21, 'nakedSingle', '—', '—', '—'],
        [4, 23, 'G/Choose', 45, 551, 507, 'simpleColouring', 'Y', 'R1C2', '—'],
        [5, 26, 'G/Choose', 51, 568, 17, 'simpleColouring', '—', '—', '—'],
        [6, 31, 'X/Adjust', 51, 992, 424, 'xyzWing', '—', '—', 'N'],
        [7, 31, 'F/Final', 51, 992, 0, 'xyzWing', '—', '—', '—']
      ],
      details: [0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 28, 30, 31, 33, 34, 36, 37, 38, 40, 41, 42, 43, 44, 551, 557,
        567, 568, 568, 568, 568, 568, 992, 992],
      alive: null,
      folds: [],
      jumps: [
        {
          step: 4, from: 44, to: 551,
          before: { P: 1, W: 43, R: 1.364858, V: 41.445783, E: 43, level: 'veryEasy' },
          after: { P: 360, W: 768.25, R: 148.321617, V: 42.352941, E: 45, level: 'hard' },
          choice: { chosen: 551, others: 9, nulls: 0, max: 45, at: 42, rated: 15, refused: 5 },
          singles: [{ op: 'remove', cell: 'R1C2', score: 550 }, { op: 'remove', cell: 'R9C8', score: 44 }],
          cause: 'single-culprit', frame: 'R1C2',
          firstUse: { k: 32, n: 47, technique: 'simpleColouring' }, key: 'technique.simpleColouring.step',
          effects: 'remove candidate 3@R5C2, 3@R8C3'
        }
      ]
    },
    {
      id: 'G02', request: { variantId: 'classic9', difficulty: 'veryEasy', seed: '1' },
      today: { steps: 7, missing: 1 }, counts: { compact: 5, details: 23 },
      board: { cells: 81, cages: 0, signsFrom: 0, signsTo: 0, log: 'normal' },
      // [#, m, phase, E, score, delta, hardest, J, culprit, line]
      rows: [
        [1, 0, 'S/Sol', 0, 0, 0, '—', '—', '—', '—'],
        [2, 4, 'D/Dig', 8, 15, 15, 'nakedSingle', '—', '—', 'F'],
        [3, 8, 'D/Dig', 16, 25, 10, 'nakedSingle', '—', '—', '—'],
        [4, 21, 'D/Dig', 41, 43, 18, 'nakedSingle', '—', '—', '—'],
        [5, 21, 'F/Final', 41, 43, 0, 'nakedSingle', '—', '—', '—']
      ],
      details: [0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 29, 31, 32, 34, 35, 37, 38, 39, 40, 41, 42, 43, 43],
      alive: null,
      folds: [],
      jumps: []
    },
    {
      id: 'G03', request: { variantId: 'classic9', difficulty: 'nightmare', seed: '42' },
      today: { steps: 12, missing: 1 }, counts: { compact: 6, details: 29 },
      board: { cells: 81, cages: 0, signsFrom: 0, signsTo: 0, log: 'normal' },
      // [#, m, phase, E, score, delta, hardest, J, culprit, line]
      rows: [
        [1, 0, 'S/Sol', 0, 0, 0, '—', '—', '—', '—'],
        [2, 8, 'D/Dig', 16, 25, 25, 'nakedSingle', '—', '—', 'F'],
        [3, 22, 'D/Dig', 43, 44, 19, 'nakedSingle', '—', '—', '—'],
        [4, 23, 'G/Choose', 45, 870, 826, 'xyWing', 'Y', '—', '—'],
        [5, 27, 'G/Choose', 53, 1572, 702, 'forcingChain', '—', '—', 'N'],
        [6, 27, 'F/Final', 53, 1572, 0, 'forcingChain', '—', '—', '—']
      ],
      details: [0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 28, 30, 31, 33, 34, 36, 37, 38, 40, 41, 42, 43, 44, 870, 1234,
        1570, 1571, 1572, 1572],
      alive: null,
      folds: [],
      jumps: [
        {
          step: 4, from: 44, to: 870,
          before: { P: 1, W: 43, R: 1.364858, V: 41.445783, E: 43, level: 'veryEasy' },
          after: { P: 650, W: 737.25, R: 177.728879, V: 42.352941, E: 45, level: 'expert' },
          choice: { chosen: 870, others: 11, nulls: 0, max: 45, at: 43, rated: 18, refused: 6 },
          singles: [{ op: 'remove', cell: 'R2C3', score: 45 }, { op: 'remove', cell: 'R8C7', score: 44 }],
          cause: 'together', frame: null,
          firstUse: { k: 17, n: 47, technique: 'xyWing' }, key: 'technique.xyWing.step',
          effects: 'remove candidate 9@R9C9'
        }
      ]
    },
    {
      id: 'G04', request: { variantId: 'classic9', difficulty: 'hell1', seed: '2400651925' },
      today: { steps: 39, missing: 19 }, counts: { compact: 7, details: 43 },
      board: { cells: 81, cages: 0, signsFrom: 0, signsTo: 0, log: 'normal' },
      // [#, m, phase, E, score, delta, hardest, J, culprit, line]
      rows: [
        [1, 0, 'S/Sol', 0, 0, 0, '—', '—', '—', '—'],
        [2, 9, 'D/Dig', 18, 27, 27, 'nakedSingle', '—', '—', 'F'],
        [3, 22, 'D/Dig', 43, 44, 17, 'nakedSingle', '—', '—', '—'],
        [4, 25, 'G/Choose', 49, 47, 3, 'hiddenSingleBox', '—', '—', 'N'],
        [5, 26, 'G/Choose', 51, 1206, 1159, 'wWing', 'Y', 'R6C5', '—'],
        [6, 41, 'X/Adjust', 52, 2879, 1673, 'nishio', '—', '—', 'N'],
        [7, 41, 'F/Final', 52, 2879, 0, 'nishio', '—', '—', '—']
      ],
      details: [0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 29, 31, 32, 34, 35, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
        1206, 1206, 1206, 1964, 1964, 1964, 1964, 1964, 1964, 1964, 1964, 1964, 2279, 2294, 2346, 2879, 2879],
      alive: null,
      folds: [],
      jumps: [
        {
          step: 5, from: 47, to: 1206,
          before: { P: 1.25, W: 49.75, R: 1.67203, V: 44.044944, E: 49, level: 'easy' },
          after: { P: 850, W: 1493, R: 310.849719, V: 44.835165, E: 51, level: 'master' },
          choice: { chosen: 1206, others: 1, nulls: 0, max: 48, at: 66, rated: 4, refused: 2 },
          singles: [{ op: 'remove', cell: 'R4C5', score: 47 }, { op: 'remove', cell: 'R6C5', score: 1205 }],
          cause: 'single-culprit', frame: 'R6C5',
          firstUse: { k: 22, n: 60, technique: 'wWing' }, key: 'technique.wWing.step',
          effects: 'remove candidate 2@R2C2, 2@R8C1, 2@R9C1'
        }
      ]
    },
    {
      id: 'G05', request: { variantId: 'classic9', difficulty: 'hell1', seed: '2299986211' },
      today: { steps: 106, missing: 50 }, counts: { compact: 7, details: 77 },
      board: { cells: 81, cages: 0, signsFrom: 0, signsTo: 0, log: 'normal' },
      // [#, m, phase, E, score, delta, hardest, J, culprit, line]
      rows: [
        [1, 0, 'S/Sol', 0, 0, 0, '—', '—', '—', '—'],
        [2, 9, 'D/Dig', 18, 27, 27, 'nakedSingle', '—', '—', 'F'],
        [3, 22, 'D/Dig', 43, 44, 17, 'nakedSingle', '—', '—', '—'],
        [4, 28, 'G/Choose', 55, 50, 6, 'hiddenSingleLine', '—', '—', 'N'],
        [5, 29, 'X/Adjust', 55, 2010, 1960, 'forcingChain', 'Y', '—', '—'],
        [6, 75, 'X/Adjust', 53, 3274, 1264, 'nishio', '—', '—', 'N'],
        [7, 75, 'F/Final', 53, 3274, 0, 'nishio', '—', '—', '—']
      ],
      details: [0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 29, 31, 32, 33, 34, 36, 37, 38, 40, 41, 42, 43, 44, 45, 46, 47,
        48, 49, 50, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010,
        2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010,
        2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2281, 2377, 3274, 3274],
      alive: null,
      folds: [],
      jumps: [
        {
          step: 5, from: 50, to: 2010,
          before: { P: 1.5, W: 60.5, R: 2.013463, V: 46.315789, E: 55, level: 'easy' },
          after: { P: 1100, W: 8591.75, R: 863.294758, V: 46.315789, E: 55, level: 'nightmare' },
          choice: null,
          singles: [
            { op: 'remove', cell: 'R2C1', score: 50 },
            { op: 'remove', cell: 'R8C9', score: 50 },
            { op: 'restore', cell: 'R4C6', score: 49 },
            { op: 'restore', cell: 'R6C4', score: 49 }
          ],
          cause: 'together', frame: null,
          firstUse: { k: 12, n: 75, technique: 'forcingChain' }, key: 'technique.forcingChain.step.contradiction',
          effects: 'remove candidate 6@R4C2'
        }
      ]
    },
    {
      id: 'G06', request: { variantId: 'jigsaw9', difficulty: 'nightmare', seed: '42' },
      today: { steps: 16, missing: 2 }, counts: { compact: 7, details: 33 },
      board: { cells: 81, cages: 0, signsFrom: 0, signsTo: 0, log: 'normal' },
      // [#, m, phase, E, score, delta, hardest, J, culprit, line]
      rows: [
        [1, 0, 'S/Sol', 0, 0, 0, '—', '—', '—', '—'],
        [2, 8, 'D/Dig', 16, 25, 25, 'nakedSingle', '—', '—', 'F'],
        [3, 22, 'D/Dig', 43, 44, 19, 'nakedSingle', '—', '—', '—'],
        [4, 27, 'G/Choose', 53, 49, 5, 'hiddenSingleBox', '—', '—', 'N'],
        [5, 28, 'G/Choose', 55, 138, 89, 'boxLine', '—', '—', 'N'],
        [6, 31, 'G+A/Mixed', 57, 1678, 1540, 'forcingChain', 'Y', '—', '—'],
        [7, 31, 'F/Final', 57, 1678, 0, 'forcingChain', '—', '—', '—']
      ],
      details: [0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 29, 31, 32, 34, 35, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
        48, 49, 138, 1778, 2967, 1678, 1678],
      alive: null,
      folds: [
        { step: 6, peak: 2967, end: 1678, removed: 4, restored: 2, signs: 0, opening: false }
      ],
      jumps: [
        {
          step: 6, from: 138, to: 1678,
          before: { P: 50, W: 449.5, R: 41.506058, V: 46.315789, E: 55, level: 'easy' },
          after: { P: 1100, W: 3099.25, R: 531.472743, V: 47.010309, E: 57, level: 'nightmare' },
          choice: null,
          singles: [],
          cause: 'multi-move', frame: null,
          firstUse: { k: 16, n: 71, technique: 'forcingChain' }, key: 'technique.forcingChain.step.endpoints',
          effects: 'remove candidate 5@R7C5'
        }
      ]
    },
    {
      id: 'G07', request: { variantId: 'jigsaw9', difficulty: 'nightmare', seed: '3962167687' },
      today: { steps: 17, missing: 2 }, counts: { compact: 9, details: 33 },
      board: { cells: 81, cages: 0, signsFrom: 0, signsTo: 0, log: 'normal' },
      // [#, m, phase, E, score, delta, hardest, J, culprit, line]
      rows: [
        [1, 0, 'S/Sol', 0, 0, 0, '—', '—', '—', '—'],
        [2, 8, 'D/Dig', 16, 25, 25, 'nakedSingle', '—', '—', 'F'],
        [3, 21, 'D/Dig', 42, 43, 18, 'nakedSingle', '—', '—', '—'],
        [4, 23, 'G/Choose', 46, 46, 3, 'hiddenSingleLine', '—', '—', 'N'],
        [5, 24, 'G/Choose', 48, 252, 206, 'nakedPair', 'Y', '—', '—'],
        [6, 28, 'G/Choose', 56, 666, 414, 'simpleColouring', '—', '—', 'N'],
        [7, 29, 'G/Choose', 58, 1938, 1272, 'forcingChain', '—', '—', 'N'],
        [8, 31, 'G+A/Mixed', 58, 1938, 0, 'forcingChain', '—', '—', '—'],
        [9, 31, 'F/Final', 58, 1938, 0, 'forcingChain', '—', '—', '—']
      ],
      details: [0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 29, 31, 32, 34, 35, 37, 38, 39, 40, 41, 42, 43, 45, 46, 252,
        288, 305, 591, 666, 1938, 2515, 1938, 1938],
      alive: null,
      folds: [
        { step: 8, peak: 2515, end: 1938, removed: 2, restored: 2, signs: 0, opening: false }
      ],
      jumps: [
        {
          step: 5, from: 46, to: 252,
          before: { P: 1.5, W: 49, R: 1.902468, V: 42.790698, E: 46, level: 'easy' },
          after: { P: 120, W: 798.75, R: 88.099138, V: 43.636364, E: 48, level: 'normal' },
          choice: { chosen: 252, others: 12, nulls: 0, max: 47, at: 73, rated: 13, refused: 0 },
          singles: [{ op: 'remove', cell: 'R1C4', score: 136 }, { op: 'remove', cell: 'R9C6', score: 47 }],
          cause: 'mixed', frame: null,
          firstUse: { k: 21, n: 63, technique: 'nakedPair' }, key: 'technique.nakedPair.step',
          effects: 'remove candidate 3@R5C8'
        }
      ]
    },
    {
      id: 'G08', request: { variantId: 'killer', difficulty: 'veryEasy', seed: '1' },
      today: { steps: 8, missing: 2 }, counts: { compact: 6, details: 24 },
      board: { cells: 81, cages: 31, signsFrom: 0, signsTo: 0, log: 'normal' },
      // [#, m, phase, E, score, delta, hardest, J, culprit, line]
      rows: [
        [1, 0, 'S/Sol', 0, 0, 0, '—', '—', '—', '—'],
        [2, 0, 'S/Cag', 0, 0, 0, '—', '—', '—', '—'],
        [3, 4, 'D/Dig', 8, 15, 15, 'nakedSingle', '—', '—', 'F'],
        [4, 8, 'D/Dig', 16, 25, 10, 'nakedSingle', '—', '—', '—'],
        [5, 21, 'D/Dig', 41, 43, 18, 'nakedSingle', '—', '—', '—'],
        [6, 21, 'F/Final', 41, 43, 0, 'nakedSingle', '—', '—', '—']
      ],
      details: [0, 0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 29, 31, 32, 34, 35, 37, 38, 39, 40, 41, 42, 43, 43],
      alive: null,
      folds: [],
      jumps: []
    },
    {
      id: 'G09', request: { variantId: 'killer', difficulty: 'expert', seed: '3514204290' },
      today: { steps: 24, missing: 2 }, counts: { compact: 10, details: 41 },
      board: { cells: 81, cages: 15, signsFrom: 0, signsTo: 0, log: 'normal' },
      // [#, m, phase, E, score, delta, hardest, J, culprit, line]
      rows: [
        [1, 0, 'S/Sol', 0, 0, 0, '—', '—', '—', '—'],
        [2, 0, 'S/Cag', 0, 0, 0, '—', '—', '—', '—'],
        [3, 7, 'D/Dig', 14, 23, 23, 'nakedSingle', '—', '—', 'F'],
        [4, 20, 'D/Dig', 39, 42, 19, 'nakedSingle', '—', '—', '—'],
        [5, 21, 'D/Dig', 41, 96, 54, 'cageCombo', '—', '—', 'N'],
        [6, 22, 'D/Dig', 43, 98, 2, 'cageCombo', '—', '—', '—'],
        [7, 36, 'G/Choose', 71, 168, 70, 'boxLine', '—', '—', 'N'],
        [8, 37, 'G/Choose', 73, 533, 365, 'ruleOf45', 'Y', '—', '—'],
        [9, 38, 'G/Choose', 75, 968, 435, 'cageSplit', '—', '—', 'N'],
        [10, 38, 'F/Final', 75, 968, 0, 'cageSplit', '—', '—', '—']
      ],
      details: [0, 0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 29, 31, 32, 34, 35, 36, 37, 38, 40, 41, 42, 96, 98, 124,
        129, 137, 145, 149, 152, 156, 158, 161, 162, 163, 165, 165, 168, 533, 968, 968],
      alive: null,
      folds: [],
      jumps: [
        {
          step: 8, from: 168, to: 533,
          before: { P: 50, W: 1975.75, R: 66.754803, V: 51.171171, E: 71, level: 'easy' },
          after: { P: 260, W: 2485, R: 221.01447, V: 51.681416, E: 73, level: 'hard' },
          choice: { chosen: 533, others: 2, nulls: 0, max: 169, at: 203, rated: 3, refused: 0 },
          singles: [{ op: 'remove', cell: 'R3C6', score: 167 }, { op: 'remove', cell: 'R7C4', score: 340 }],
          cause: 'mixed', frame: null,
          firstUse: { k: 17, n: 116, technique: 'ruleOf45' }, key: 'technique.ruleOf45.step',
          effects: 'remove candidate 2@R7C5, 5@R7C5'
        }
      ]
    },
    {
      id: 'G10', request: { variantId: 'killer', difficulty: 'nightmare', seed: '42' },
      today: { steps: 28, missing: 5 }, counts: { compact: 9, details: 45 },
      board: { cells: 81, cages: 19, signsFrom: 0, signsTo: 0, log: 'normal' },
      // [#, m, phase, E, score, delta, hardest, J, culprit, line]
      rows: [
        [1, 0, 'S/Sol', 0, 0, 0, '—', '—', '—', '—'],
        [2, 0, 'S/Cag', 0, 0, 0, '—', '—', '—', '—'],
        [3, 8, 'D/Dig', 16, 25, 25, 'nakedSingle', '—', '—', 'F'],
        [4, 22, 'D/Dig', 43, 98, 73, 'cageCombo', '—', '—', 'N'],
        [5, 35, 'G/Choose', 69, 168, 70, 'boxLine', '—', '—', 'N'],
        [6, 36, 'G/Choose', 71, 529, 361, 'ruleOf45', 'Y', '—', '—'],
        [7, 38, 'G/Choose', 75, 607, 78, 'ruleOf45', '—', '—', '—'],
        [8, 42, 'G+A/Mixed', 71, 1940, 1333, 'forcingChain', 'Y', '—', '—'],
        [9, 42, 'F/Final', 71, 1940, 0, 'forcingChain', '—', '—', '—']
      ],
      details: [0, 0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 29, 31, 32, 34, 35, 37, 38, 39, 40, 41, 96, 97, 98, 116,
        132, 137, 144, 148, 151, 154, 160, 162, 164, 165, 165, 168, 529, 568, 607, 2997, 2780, 2788, 1940, 1940],
      alive: null,
      folds: [
        { step: 8, peak: 2997, end: 1940, removed: 2, restored: 6, signs: 0, opening: false }
      ],
      jumps: [
        {
          step: 6, from: 168, to: 529,
          before: { P: 50, W: 1998.75, R: 66.958401, V: 50.642202, E: 69, level: 'easy' },
          after: { P: 260, W: 2392.75, R: 217.808837, V: 51.171171, E: 71, level: 'hard' },
          choice: { chosen: 529, others: 3, nulls: 0, max: 170, at: 208, rated: 4, refused: 0 },
          singles: [{ op: 'remove', cell: 'R3C7', score: 168 }, { op: 'remove', cell: 'R7C3', score: 168 }],
          cause: 'together', frame: null,
          firstUse: { k: 28, n: 113, technique: 'ruleOf45' }, key: 'technique.ruleOf45.step',
          effects: 'remove candidate 1@R7C1, 6@R7C1, 7@R7C1, 9@R7C1'
        },
        {
          step: 8, from: 607, to: 1940,
          before: { P: 260, W: 5783.5, R: 295.022051, V: 52.173913, E: 75, level: 'hard' },
          after: { P: 1100, W: 6942.25, R: 789.276307, V: 51.171171, E: 71, level: 'nightmare' },
          choice: null,
          singles: [],
          cause: 'multi-move', frame: null,
          firstUse: { k: 39, n: 127, technique: 'forcingChain' }, key: 'technique.forcingChain.step.contradiction',
          effects: 'remove candidate 5@R1C2'
        }
      ]
    },
    {
      id: 'G11', request: { variantId: 'greaterThan', difficulty: 'expert', seed: '42' },
      today: { steps: 23, missing: 22 }, counts: { compact: 9, details: 114 },
      board: { cells: 81, cages: 0, signsFrom: 108, signsTo: 3, log: 'normal' },
      // [#, m, phase, E, score, delta, hardest, J, culprit, line]
      rows: [
        [1, 0, 'S/Sol', 0, 0, 0, '—', '—', '—', '—'],
        [2, 0, 'S/Sig', 0, 0, 0, '—', '—', '—', '—'],
        [3, 24, 'C+I/Mixed', 60, 135, 135, 'ineqChain', '—', '—', 'F'],
        [4, 35, 'I/Signs', 60, 135, 0, 'ineqChain', '—', '—', '—'],
        [5, 108, 'I+A+IM/Mixed', 50, 242, 107, 'nakedPair', '—', '—', 'N'],
        [6, 109, 'I/Signs', 50, 242, 0, 'nakedPair', '—', '—', '—'],
        [7, 110, 'I/Signs', 50, 973, 731, 'xyWing', 'Y', 's6(R2C4<R1C4)', '—'],
        [8, 111, 'I/Signs', 50, 973, 0, 'xyWing', '—', '—', '—'],
        [9, 111, 'F/Final', 50, 973, 0, 'xyWing', '—', '—', '—']
      ],
      details: [0, 0, 274, 274, 274, 274, 274, 274, 275, 274, 274, 274, 274, 274, 274, 271, 271, 270, 270, 270, 270,
        273, 273, 273, 272, 135, 135, 135, 135, 135, 135, 135, 135, 135, 135, 135, 135, 274, 273, 273, 273, 270,
        271, 271, 271, 271, 271, 271, 271, 271, 271, 271, 271, 271, 271, 271, 270, 270, 270, 270, 270, 281, 1049,
        1049, 1046, 1046, 1046, 1043, 1039, 1039, 1039, 1039, 1039, 1039, 1046, 1065, 1065, 1065, 1065, 1065, 1065,
        1065, 1071, 1065, 1065, 1062, 1062, 1119, 1114, 1112, 1112, 1109, 1109, 1109, 1107, 1104, 1104, 1104, 1104,
        1109, 1107, 1032, 552, 552, 1967, 1264, 250, 995, 1017, 242, 242, 973, 973, 973],
      alive: [108, 108, 85, 74, 6, 5, 4, 3, 3],
      folds: [
        { step: 3, peak: 275, end: 135, removed: null, restored: null, signs: 23, opening: true },
        { step: 5, peak: 1967, end: 242, removed: 0, restored: 10, signs: 68, opening: false }
      ],
      jumps: [
        {
          step: 7, from: 242, to: 973,
          before: { P: 120, W: 593.25, R: 77.141203, V: 44.444444, E: 50, level: 'normal' },
          after: { P: 650, W: 1484.25, R: 278.722853, V: 44.444444, E: 50, level: 'expert' },
          choice: null,
          singles: [],
          cause: 'single-sign', frame: 's6(R2C4<R1C4)',
          firstUse: { k: 25, n: 61, technique: 'xyWing' }, key: 'technique.xyWing.step',
          effects: 'remove candidate 5@R5C1'
        }
      ]
    },
    {
      id: 'G12', request: { variantId: 'greaterThan', difficulty: 'hard', seed: '3115968914' },
      today: { steps: 12, missing: 11 }, counts: { compact: 5, details: 106 },
      board: { cells: 81, cages: 0, signsFrom: 108, signsTo: 6, log: 'normal' },
      // [#, m, phase, E, score, delta, hardest, J, culprit, line]
      rows: [
        [1, 0, 'S/Sol', 0, 0, 0, '—', '—', '—', '—'],
        [2, 0, 'S/Sig', 0, 0, 0, '—', '—', '—', '—'],
        [3, 92, 'C+I/Mixed', 57, 130, 130, 'ineqChain', '—', '—', 'F'],
        [4, 103, 'I/Signs', 57, 638, 508, 'simpleColouring', 'Y', '—', '—'],
        [5, 103, 'F/Final', 57, 638, 0, 'simpleColouring', '—', '—', '—']
      ],
      details: [0, 0, 149, 149, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 149, 149, 149, 148, 148, 148,
        148, 148, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 148, 148, 148, 148, 148, 148, 148, 146,
        146, 146, 146, 146, 146, 146, 146, 146, 146, 146, 146, 148, 148, 148, 148, 148, 148, 148, 154, 154, 154,
        154, 154, 134, 134, 134, 134, 152, 152, 152, 152, 152, 152, 152, 152, 152, 152, 156, 154, 154, 153, 153,
        152, 152, 152, 152, 152, 152, 152, 151, 151, 130, 649, 649, 647, 647, 647, 647, 647, 647, 647, 642, 638, 638],
      alive: [108, 108, 17, 6, 6],
      folds: [
        { step: 3, peak: 156, end: 130, removed: null, restored: null, signs: 91, opening: true },
        { step: 4, peak: 649, end: 638, removed: 0, restored: 0, signs: 11, opening: false }
      ],
      jumps: [
        {
          step: 4, from: 130, to: 638,
          before: { P: 40, W: 741, R: 42.872506, V: 47.010309, E: 57, level: 'easy' },
          after: { P: 360, W: 1765.5, R: 230.55601, V: 47.010309, E: 57, level: 'hard' },
          choice: null,
          singles: [],
          cause: 'multi-move', frame: null,
          firstUse: { k: 47, n: 75, technique: 'simpleColouring' }, key: 'technique.simpleColouring.step',
          effects: 'remove candidate 4@R7C4, 4@R8C3'
        }
      ]
    },
    {
      id: 'G13', request: { variantId: 'samurai', difficulty: 'nightmare', seed: '42' },
      today: { steps: 14, missing: 1 }, counts: { compact: 8, details: 134 },
      board: { cells: 369, cages: 0, signsFrom: 0, signsTo: 0, log: 'normal' },
      // [#, m, phase, E, score, delta, hardest, J, culprit, line]
      rows: [
        [1, 0, 'S/Sol', 0, 0, 0, '—', '—', '—', '—'],
        [2, 8, 'D/Dig', 16, 25, 25, 'nakedSingle', '—', '—', 'F'],
        [3, 47, 'D/Dig', 94, 59, 34, 'nakedSingle', '—', '—', '—'],
        [4, 98, 'D/Dig', 195, 69, 10, 'nakedSingle', '—', '—', '—'],
        [5, 113, 'G/Choose', 225, 72, 3, 'hiddenSingleLine', '—', '—', 'N'],
        [6, 114, 'G/Choose', 227, 1483, 1411, 'forcingChain', 'Y', 'G2-R8C9', '—'],
        [7, 132, 'G/Choose', 263, 1637, 154, 'forcingChain', '—', '—', '—'],
        [8, 132, 'F/Final', 263, 1637, 0, 'forcingChain', '—', '—', '—']
      ],
      details: [0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 29, 31, 32, 34, 35, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
        48, 48, 49, 50, 50, 51, 52, 52, 53, 53, 54, 54, 55, 55, 56, 56, 57, 57, 58, 58, 58, 59, 59, 59, 60, 60, 60,
        61, 61, 61, 62, 62, 62, 62, 63, 63, 63, 63, 64, 64, 64, 64, 65, 65, 65, 65, 65, 66, 66, 66, 66, 66, 66, 67,
        67, 67, 67, 67, 67, 68, 68, 68, 68, 68, 68, 68, 69, 69, 69, 69, 69, 69, 69, 69, 70, 70, 70, 70, 71, 71, 71,
        71, 71, 71, 71, 72, 72, 72, 1483, 1483, 1484, 1484, 1485, 1618, 1618, 1618, 1619, 1619, 1619, 1620, 1620,
        1620, 1621, 1621, 1622, 1623, 1637, 1637],
      alive: null,
      folds: [],
      jumps: [
        {
          step: 6, from: 72, to: 1483,
          before: { P: 1.5, W: 229.5, R: 2.725045, V: 67.924528, E: 225, level: 'easy' },
          after: { P: 1100, W: 1332, R: 314.775919, V: 68.014981, E: 227, level: 'master' },
          choice: { chosen: null, others: 6, nulls: 0, max: 72, at: 229, rated: 7, refused: 0 },
          singles: [{ op: 'remove', cell: 'G2-R8C9', score: 1483 }, { op: 'remove', cell: 'G3-R2C1', score: 72 }],
          cause: 'single-culprit', frame: 'G2-R8C9',
          firstUse: { k: 209, n: 228, technique: 'forcingChain' }, key: 'technique.forcingChain.step.contradiction',
          effects: 'remove candidate 1@G2-R1C2'
        }
      ]
    },
    {
      id: 'G14', request: { variantId: 'mega16', difficulty: 'hell2', seed: '12' },
      today: { steps: 11, missing: 1 }, counts: { compact: 6, details: 79 },
      board: { cells: 256, cages: 0, signsFrom: 0, signsTo: 0, log: 'normal' },
      // [#, m, phase, E, score, delta, hardest, J, culprit, line]
      rows: [
        [1, 0, 'S/Sol', 0, 0, 0, '—', '—', '—', '—'],
        [2, 10, 'D/Dig', 20, 29, 29, 'nakedSingle', '—', '—', 'F'],
        [3, 68, 'D/Dig', 136, 65, 36, 'hiddenSingleBox', '—', '—', 'N'],
        [4, 69, 'G/Choose', 138, 1646, 1581, 'forcingChain', 'Y', 'R8C4', '—'],
        [5, 77, 'G/Choose', 154, 4476, 2830, 'nishio', '—', '—', 'N'],
        [6, 77, 'F/Final', 154, 4476, 0, 'nishio', '—', '—', '—']
      ],
      details: [0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 29, 31, 32, 34, 35, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
        48, 48, 49, 50, 50, 51, 52, 52, 53, 53, 54, 54, 55, 55, 56, 56, 57, 57, 58, 58, 58, 59, 59, 59, 60, 60, 60,
        61, 61, 61, 62, 62, 62, 62, 63, 64, 64, 64, 64, 65, 65, 65, 65, 1646, 1660, 2111, 3587, 3853, 4225, 4375,
        4458, 4476, 4476],
      alive: null,
      folds: [],
      jumps: [
        {
          step: 4, from: 65, to: 1646,
          before: { P: 1.25, W: 143, R: 2.140781, V: 61.818182, E: 136, level: 'easy' },
          after: { P: 1100, W: 2628.75, R: 484.326851, V: 62.022472, E: 138, level: 'nightmare' },
          choice: { chosen: null, others: 6, nulls: 0, max: 66, at: 84, rated: 10, refused: 3 },
          singles: [{ op: 'remove', cell: 'R8C4', score: 1652 }, { op: 'remove', cell: 'R9C13', score: 65 }],
          cause: 'single-culprit', frame: 'R8C4',
          firstUse: { k: 84, n: 146, technique: 'forcingChain' }, key: 'technique.forcingChain.step.contradiction',
          effects: 'remove candidate 12@R13C14'
        }
      ]
    }
  ];

  SG.fixtures.replayGoldens = GOLDENS;
})();
