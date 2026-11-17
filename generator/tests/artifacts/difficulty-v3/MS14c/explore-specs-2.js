'use strict';
module.exports = [
  { name: 'C1-2 sum 9 with a 4 in the row: {2,3,4} dies, 1 is forced again',
    cages: [{ cells: ['R1C2', 'R1C3', 'R1C4'], sum: 9 }],
    fix: { R1C2: 1, R1C3: 2, R1C4: 6, R1C8: 4, R5C4: 1 }, givens: { R1C8: 4, R5C4: 1 } },
  { name: 'N1 sum 9, the same positions without the 4',
    cages: [{ cells: ['R1C2', 'R1C3', 'R1C4'], sum: 9 }],
    fix: { R1C2: 1, R1C3: 2, R1C4: 6, R5C4: 1 }, givens: { R5C4: 1 } },
  { name: 'C1-4 L inside box 5, sum 8',
    cages: [{ cells: ['R4C4', 'R4C5', 'R5C5'], sum: 8 }],
    fix: { R4C4: 2, R4C5: 1, R5C5: 5 }, givens: {} },
  { name: 'C2-3 pair 10 in a row narrowed to {4,6} by the candidates of one cell',
    cages: [{ cells: ['R5C3', 'R5C4'], sum: 10 }],
    fix: { R5C3: 4, R5C4: 6 }, givens: {}, candidates: { R5C4: '46' } },
  { name: 'C2-4 pair 3 in a row and box',
    cages: [{ cells: ['R1C1', 'R1C2'], sum: 3 }],
    fix: { R1C1: 1, R1C2: 2 }, givens: {} }
];
