/**
 * One real Jigsaw puzzle for the help tests (difficulty v3, MS03c): `SG.fixtures.jigsawHelpSource`, the text of
 * the generator's Export box exactly as the bounded discovery of tests/tools/make-technique-examples.js made
 * it (jigsaw9, hard, seed 1, the first request of):
 *
 *   node tests\tools\make-technique-examples.js ..\generator --ids=nakedSingle --discover
 *     --variants=jigsaw9 --levels=hard --max-puzzles=1 --max-hints=400 --write
 *     --out=tests\artifacts\difficulty-v3\MS03c\help-examples.js
 *
 * Its nine regions are irregular (not the 3x3 boxes). The tests open it as the Player does, fill in the notes
 * and ask for hints with the current hint code; no hint, note or step is stored here, so a change of the hints
 * cannot make this file stale. Only for tests: it is not a script of either application.
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};
  SG.fixtures = SG.fixtures || {};

  SG.fixtures.jigsawHelpSource = Object.freeze({
    variantId: 'jigsaw9',
    level: 'hard',
    seed: '1',
    text: [
      '#1,Jigsaw Sudoku,Hard,1',
      '...1.4..2',
      '..38.....',
      '....5....',
      '.9...271.',
      '83.....64',
      '.746...3.',
      '....2....',
      '.....81..',
      '4..3.5...',
      'regions: 111223333 114223333 114222223 144444455 166645557 666668557 996888557 999888777 999988777'
    ].join('\n')
  });
})();
