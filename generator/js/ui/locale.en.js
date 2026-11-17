/**
 * English language pack: shared strings (steps, explanations, techniques, difficulty, symmetry, variants,
 * events, errors, generic words). Modules that own their strings add them through `SG.localeFragments` (see
 * js/ui/i18n.js). Keep the key set identical to locale.vi.js. Placeholders are `{name}` (the `i18nArgs` of
 * technique findings and events, see `SG.events.VOCABULARY`); plural forms use the suffixes `_one` /
 * `_other`.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};
  SG.locales = SG.locales || {};
  const pack = SG.locales.en = SG.locales.en || {};

  function add(section) {
    Object.keys(section).forEach(function (key) { pack[key] = section[key]; });
  }

  // General words, units and durations

  add({
    'app.title': 'Sudoku Generator',

    'common.apply': 'Apply',
    'common.auto': 'Automatic',
    'common.back': 'Back',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.copied': 'Copied',
    'common.copy': 'Copy',
    'common.default': 'Default',
    'common.delete': 'Delete',
    'common.download': 'Download',
    'common.error': 'Error',
    'common.less': 'Less',
    'common.loading': 'Loading\u2026',
    'common.more': 'More',
    'common.next': 'Next',
    'common.no': 'No',
    'common.none': 'None',
    'common.off': 'Off',
    'common.ok': 'OK',
    'common.on': 'On',
    'common.previous': 'Previous',
    'common.random': 'Random',
    'common.reset': 'Reset',
    'common.retry': 'Try again',
    'common.save': 'Save',
    'common.unknown': 'Unknown',
    'common.warning': 'Warning',
    'common.yes': 'Yes',

    'unit.attempt_one': '{count} attempt',
    'unit.attempt_other': '{count} attempts',
    'unit.cell_one': '{count} cell',
    'unit.cell_other': '{count} cells',
    'unit.clue_one': '{count} clue',
    'unit.clue_other': '{count} clues',
    'unit.step_one': '{count} step',
    'unit.step_other': '{count} steps',

    'unitKind.box': 'box',
    'unitKind.cage': 'cage',
    'unitKind.col': 'column',
    'unitKind.diag': 'diagonal',
    'unitKind.region': 'region',
    'unitKind.row': 'row',
    'unitKind.window': 'window',

    'duration.h': '{h} h',
    'duration.hMin': '{h} h {min} min',
    'duration.min': '{min} min',
    'duration.minSec': '{min} min {sec} s',
    'duration.ms': '{value} ms',
    'duration.s': '{value} s'
  });

  // Variants, difficulty, symmetry, symbol sets, dig orders, technique groups, trace levels

  add({
    'variant.classic4': 'Classic Sudoku 4\u00d74',
    'variant.classic4.desc': 'A small 4\u00d74 grid with 2\u00d72 boxes. Each row, column and box holds ' +
      'the digits 1 to 4 once. A gentle start for beginners and children.',
    'variant.classic6': 'Classic Sudoku 6\u00d76',
    'variant.classic6.desc': 'A 6\u00d76 grid with boxes of 2 rows \u00d7 3 columns. Each row, column and ' +
      'box holds the digits 1 to 6 once.',
    'variant.classic9': 'Classic Sudoku 9\u00d79',
    'variant.classic9.desc': 'The standard 9\u00d79 grid with 3\u00d73 boxes. Each row, column and box ' +
      'holds the digits 1 to 9 once.',
    'variant.diagonalX.desc': 'Classic 9\u00d79 rules, and both long diagonals must also hold each digit ' +
      'from 1 to 9 once.',
    'variant.hyper.desc': 'Classic 9\u00d79 rules, and the four shaded 3\u00d73 windows must also hold ' +
      'each digit from 1 to 9 once.',
    'variant.jigsaw9.desc': 'Like classic Sudoku, but the nine regions are irregular jigsaw-like shapes ' +
      'instead of 3\u00d73 boxes.',
    'variant.killer.desc': 'Dashed cages show a target sum: the digits in a cage add up to it and never ' +
      'repeat. Hardly any digits are given.',
    'variant.greaterThan.desc': 'Signs between neighbouring cells show which of the two digits is larger. ' +
      'Combine them with the usual rules.',
    'variant.wordoku.desc': 'A 9\u00d79 Sudoku played with nine letters instead of digits. A hidden ' +
      'nine-letter word appears when the puzzle is solved.',

    'group.classic': 'Classic',
    'group.extraRegions': 'Extra regions',
    'group.inequality': 'Inequalities',
    'group.killer': 'Killer',
    'group.mega': 'Large grids',
    'group.multigrid': 'Overlapping grids',
    'group.regions': 'Irregular regions',
    'group.wordoku': 'Wordoku',

    'difficulty.veryEasy': 'Very easy',
    'difficulty.veryEasy.desc': 'Many clues. Only single-digit moves are needed: naked and hidden singles.',
    'difficulty.easy': 'Easy',
    'difficulty.easy.desc': 'Slightly fewer clues. Adds locked candidates: pointing pairs and box/line ' +
      'reduction.',
    'difficulty.normal': 'Normal',
    'difficulty.normal.desc': 'Typically uses pairs and triples of candidates (naked and hidden subsets).',
    'difficulty.hard': 'Hard',
    'difficulty.hard.desc': 'Typically uses quads, fish patterns (X-Wing, Swordfish) and simple colouring.',
    'difficulty.expert': 'Expert',
    'difficulty.expert.desc': 'Typically uses a wing (XY-Wing, XYZ-Wing), a Jellyfish or several fish ' +
      'patterns.',
    'difficulty.master': 'Master',
    'difficulty.master.desc': 'Typically uses several wings, the W-Wing or Unique Rectangles, sometimes a ' +
      'short forcing chain.',
    'difficulty.nightmare': 'Nightmare',
    'difficulty.nightmare.desc': 'Typically uses forcing chains and trial and error (Nishio), with very few ' +
      'clues.',
    'difficulty.hell1': 'Hell 1',
    'difficulty.hell1.desc': 'Typically uses many forcing chains and trial-and-error steps.',
    'difficulty.hell2': 'Hell 2',
    'difficulty.hell2.desc': 'Highest score band; typically involves substantial advanced reasoning.',

    'symmetry.none': 'No symmetry',
    'symmetry.rotational180': 'Rotational 180\u00b0',
    'symmetry.rotational90': 'Rotational 90\u00b0',
    'symmetry.mirrorH': 'Mirror top\u2013bottom',
    'symmetry.mirrorV': 'Mirror left\u2013right',
    'symmetry.mirrorBoth': 'Mirror both ways',
    'symmetry.diagonal': 'Main diagonal',
    'symmetry.antiDiagonal': 'Anti-diagonal',

    'symbolMode.digits': 'Digits',
    'symbolMode.letters': 'Letters',
    'symbolMode.colors': 'Colours',
    'symbolMode.shapes': 'Shapes',
    'symbolMode.word': 'Word letters',

    'digOrder.random': 'Random',
    'digOrder.rowByRow': 'Row by row',
    'digOrder.snake': 'Snake (zig-zag)',
    'digOrder.spiral': 'Spiral',
    'digOrder.jumpOne': 'Every other cell',

    'techniqueGroup.basic': 'Singles',
    'techniqueGroup.locked': 'Locked candidates',
    'techniqueGroup.subset': 'Pairs, triples and quads',
    'techniqueGroup.fish': 'Fish and colouring',
    'techniqueGroup.wing': 'Wings',
    'techniqueGroup.chain': 'Chains and trial and error',
    'techniqueGroup.cage': 'Cage rules',
    'techniqueGroup.ineq': 'Inequality rules',

    'traceLevel.off': 'Off (result only)',
    'traceLevel.summary': 'Summary',
    'traceLevel.full': 'Full detail'
  });

  // The seven steps and their explanation cards (SG.explain.keys())

  add({
    'step.configure.name': 'Prepare the settings',
    'step.buildModel.name': 'Build the board model',
    'step.fullGrid.name': 'Generate a full solution',
    'step.extraStructure.name': 'Build the extra structure',
    'step.dig.name': 'Dig holes and check each one',
    'step.rate.name': 'Rate the difficulty',
    'step.tune.name': 'Tune and finish',

    'explain.configure.what': 'Check the settings you chose, fill in the defaults and fix the seed.',
    'explain.configure.why': 'The same seed with the same settings always gives exactly the same puzzle, ' +
      'so any puzzle can be shared and reproduced.',
    'explain.configure.how': 'The options are normalised, the variant, the level, the symmetry and the dig ' +
      'order are validated, and a random seed is drawn when you did not give one.',
    'explain.configure.live': 'Preparing the settings\u2026',
    'explain.configure.code.normalize': 'config \u2190 normalize(options)',
    'explain.configure.code.validate': 'check the variant, the level, the symmetry and the dig order',
    'explain.configure.code.seed': 'seed \u2190 config.seed, or a random seed when it is missing',

    'explain.buildModel.what': 'Create the empty board: its cells, its rows, columns and regions, and ' +
      'which cells see each other.',
    'explain.buildModel.why': 'Every rule of a variant is a group of cells that must all differ. Once the ' +
      'board is described as data, one solver works for every variant.',
    'explain.buildModel.how': 'The variant builds the cells and the layout (Jigsaw first grows its ' +
      'regions, multi-grid boards place their sub-grids). Then the units (rows, columns, regions) and the ' +
      'peers of every cell are listed, and the clue floors of the level are scaled to the size of the board.',
    'explain.buildModel.live': 'Board with {cells} cells and {units} units',
    'explain.buildModel.code.build': 'model \u2190 variant.build(options, rng)',
    'explain.buildModel.code.units': 'units \u2190 rows + columns + regions of every grid',
    'explain.buildModel.code.peers': 'peers[c] \u2190 the cells that share a unit with c',
    'explain.buildModel.code.spec': 'spec \u2190 difficultySpec(level), scaled to the number of cells',

    'explain.fullGrid.what': 'Fill the whole board with one valid solution.',
    'explain.fullGrid.why': 'Every good Sudoku starts from a complete solution, so we always know that an ' +
      'answer exists.',
    'explain.fullGrid.how': 'A backtracking search fills the cells in random order, always taking the cell ' +
      'with the fewest candidates. After every placement the consequences are propagated; when a cell has ' +
      'no candidate left, the search undoes the last move and tries the next digit. Too many dead ends ' +
      'restart the search with a new random order.',
    'explain.fullGrid.live': '{placed} cells placed \u00b7 {backtracks} backtracks \u00b7 ' +
      '{restarts} restarts',
    'explain.fullGrid.code.fixed': 'state \u2190 the fixed cells of the variant, then propagate()',
    'explain.fullGrid.code.seed': 'prefill the state with variant.fastSeed(state) when the variant has one',
    'explain.fullGrid.code.pick': 'cell \u2190 the open cell with the fewest candidates',
    'explain.fullGrid.code.loop': 'for value in shuffle(candidates(cell)):',
    'explain.fullGrid.code.place': 'place(cell, value) and propagate()',
    'explain.fullGrid.code.descend': 'if no cell is left without a candidate: continue with the next cell',
    'explain.fullGrid.code.backtrack': 'otherwise undo the placement and try the next value',
    'explain.fullGrid.code.restart': 'too many failed guesses: start over with a new random stream',

    'explain.extraStructure.what': 'Build what the variant needs on top of the full grid: cages, signs or ' +
      'a key word.',
    'explain.extraStructure.why': 'Killer cages, Greater-Than signs and the Wordoku word are derived from ' +
      'the solution, so they always agree with it. Classic variants need nothing here.',
    'explain.extraStructure.how': 'The variant reads the solution and builds the structure (Killer: cages ' +
      'and their sums; Greater-Than: the signs; Wordoku: the key word). The step is skipped when there is ' +
      'nothing to build.',
    'explain.extraStructure.live': 'Building the extra structure\u2026',
    'explain.extraStructure.code.hook': 'if the variant defines postGenerate:',
    'explain.extraStructure.code.build': 'build the extra structure (cages, signs, key word) from the ' +
      'solution',
    'explain.extraStructure.code.none': 'otherwise there is nothing to do',

    'explain.dig.what': 'Remove numbers from the full grid, one group of cells at a time.',
    'explain.dig.why': 'Every removed cell makes the puzzle harder, but the puzzle must keep exactly one ' +
      'solution and must stay solvable with the techniques allowed for the level.',
    'explain.dig.how': 'Cells are removed in symmetric groups. After each removal the logical solver ' +
      'checks that the puzzle can still be solved with the allowed techniques, which also proves that the ' +
      'solution is unique; if not, the group is put back. A second, guided pass then rates several ' +
      'removals and takes the one that suits the puzzle\'s target score best: one whose solution uses a ' +
      'technique of the level, with the score nearest the target inside the level\'s band (the highest ' +
      'score where the level has no upper bound). Once the solution uses such a technique, the pass stops ' +
      'when no removal brings the puzzle nearer. A last check confirms that exactly one solution is left.',
    'explain.dig.live': 'Tried {attempts} \u00b7 accepted {accepted} \u00b7 rejected {rejected} \u00b7 ' +
      '{clues} clues left',
    'explain.dig.code.order': 'order \u2190 shuffle(symmetric cell groups)',
    'explain.dig.code.loop': 'for group in order:',
    'explain.dig.code.filter': 'skip the group when the clues, a row, a column or a region would run too low',
    'explain.dig.code.try': 'remove the group from the puzzle',
    'explain.dig.code.check': 'if the puzzle can still be solved with the allowed techniques:',
    'explain.dig.code.accept': 'keep the group removed',
    'explain.dig.code.reject': 'otherwise put the group back',
    'explain.dig.code.deeper': 'then dig deeper: keep the removal that brings the puzzle nearest to its ' +
      'target score',
    'explain.dig.code.verify': 'verify that exactly one solution is left',

    'explain.rate.what': 'Measure how hard the puzzle is.',
    'explain.rate.why': 'Difficulty is measured by what a person needs in order to solve the puzzle, not ' +
      'guessed from the number of clues. That is what lets us guarantee the level you asked for.',
    'explain.rate.how': 'The logical solver solves the puzzle step by step with human techniques, tried ' +
      'in a fixed technique-priority order, and counts how often each technique was needed. The score is ' +
      'the points of the hardest technique, plus a part that grows with the logarithm of all the work, ' +
      'plus at most 80 for the empty cells; the score decides the level.',
    'explain.rate.live': '{clues} clues \u00b7 score {score}',
    'explain.rate.code.solve': 'report \u2190 solve the puzzle by logic, with every technique',
    'explain.rate.code.count': 'count how often each technique was needed',
    'explain.rate.code.score': 'score \u2190 hardest technique + log of the total work + empty cells',
    'explain.rate.code.classify': 'level \u2190 the difficulty band that contains the score',

    'explain.tune.what': 'Compare the result with the level you asked for, and finish.',
    'explain.tune.why': 'Digging is random, so the first puzzle may be a little too easy or too hard. ' +
      'Checking and trying again is what guarantees the level.',
    'explain.tune.how': 'When the puzzle has a complete proof in the requested band and needs a technique ' +
      'of the requested tier, it is accepted. Otherwise another dig is tried on the same grid, or a new ' +
      'grid is drawn. When the attempts run out, the closest puzzle is used and marked as approximate; if ' +
      'it lies in the band but does not need the tier, the notice says so. Finally the result is packaged ' +
      'with its statistics.',
    'explain.tune.live': '{clues} clues \u00b7 score {score}',
    'explain.tune.code.compare': 'if the puzzle has a complete proof, its score is in the requested ' +
      'band and it needs a technique of the requested tier:',
    'explain.tune.code.accept': 'accept the puzzle',
    'explain.tune.code.retry': 'otherwise dig another puzzle, or draw a new grid',
    'explain.tune.code.best': 'when the attempts run out, use the closest puzzle',
    'explain.tune.code.package': 'package the result'
  });

  // Techniques (cageCombo, ruleOf45, cageSplit, ineqChain, minMaxForcing are named in tech-ineq.js and
  // killer.js)

  add({
    'technique.nakedSingle': 'Naked Single',
    'technique.nakedSingle.desc': 'A cell that has only one candidate left must hold that digit.',
    'technique.hiddenSingleBox': 'Hidden Single (box)',
    'technique.hiddenSingleBox.desc': 'When a digit can go in only one cell of a box (or region, diagonal, ' +
      'window), it belongs in that cell.',
    'technique.hiddenSingleLine': 'Hidden Single (row/column)',
    'technique.hiddenSingleLine.desc': 'When a digit can go in only one cell of a row or a column, it ' +
      'belongs in that cell.',
    'technique.pointing': 'Pointing Pair/Triple',
    'technique.pointing.desc': 'When a digit in a box can only go in one row or column, it can be removed ' +
      'from the rest of that row or column.',
    'technique.boxLine': 'Box/Line Reduction',
    'technique.boxLine.desc': 'When a digit in a row or column can only go in one box, it can be removed ' +
      'from the rest of that box.',
    'technique.nakedPair': 'Naked Pair',
    'technique.nakedPair.desc': 'Two cells of a unit that share the same two candidates must hold those ' +
      'two digits, so the digits can be removed from the other cells of the unit.',
    'technique.hiddenPair': 'Hidden Pair',
    'technique.hiddenPair.desc': 'Two digits that can only go in the same two cells of a unit must fill ' +
      'those cells, so every other candidate can be removed from them.',
    'technique.nakedTriple': 'Naked Triple',
    'technique.nakedTriple.desc': 'Three cells of a unit whose candidates are limited to the same three ' +
      'digits must hold them, so those digits can be removed from the other cells of the unit.',
    'technique.lawOfLeftovers': 'Law of Leftovers',
    'technique.lawOfLeftovers.desc': 'In a Jigsaw, one or two whole rows (or columns) that share no cell hold ' +
      'every digit once per row, and so do the same number of whole regions that share no cell. Set aside the ' +
      'cells that the rows and the regions share: the cells left over in the rows and the cells left over in ' +
      'the regions (one to four on each side) must hold the same digits, repeats and placed digits counted. ' +
      'A candidate that no way of filling the two sides alike uses is removed.',
    'technique.hiddenTriple': 'Hidden Triple',
    'technique.hiddenTriple.desc': 'Three digits that can only go in the same three cells of a unit must ' +
      'fill those cells, so every other candidate can be removed from them.',
    'technique.nakedQuad': 'Naked Quad',
    'technique.nakedQuad.desc': 'Four cells of a unit whose candidates are limited to the same four digits ' +
      'must hold them, so those digits can be removed from the other cells of the unit.',
    'technique.hiddenQuad': 'Hidden Quad',
    'technique.hiddenQuad.desc': 'Four digits that can only go in the same four cells of a unit must fill ' +
      'those cells, so every other candidate can be removed from them.',
    'technique.xWing': 'X-Wing',
    'technique.xWing.desc': 'When a digit has only two possible cells in each of two rows, and they lie in ' +
      'the same two columns, the digit can be removed from the rest of those columns (and the same with ' +
      'rows and columns swapped).',
    'technique.skyscraper': 'Skyscraper',
    'technique.skyscraper.desc': 'Two rows (or two columns) in which a digit has only two possible cells each, ' +
      'and one cell of each lies in the same column (or row). Those two cells see each other, so they cannot ' +
      'both hold the digit: at least one of the other two does, and the digit is removed from every cell ' +
      'that sees both of them.',
    'technique.twoStringKite': 'Two-String Kite',
    'technique.twoStringKite.desc': 'A row and a column in which a digit has only two possible cells each, ' +
      'and one cell of the row and one cell of the column lie in the same box (or region). Those two cells ' +
      'see each other, so they cannot both hold the digit: at least one of the other two does, and the ' +
      'digit is removed from every cell that sees both of them.',
    'technique.simpleColouring': 'Simple Colouring',
    'technique.simpleColouring.desc': 'Cells linked by "one or the other" for a single digit are painted ' +
      'in two colours. Exactly one colour is true, which exposes cells that cannot hold the digit.',
    'technique.emptyRectangle': 'Empty Rectangle',
    'technique.emptyRectangle.desc': 'In a box (or region) a digit can only go in one row and one column of the ' +
      'box, in two parts that share no cell. A pair of cells outside the box that are the only two cells for ' +
      'the digit in their unit decides: if the end that sees every digit of one part holds it, that part loses ' +
      'it and the other part holds it; otherwise the other end holds it. Either way the digit is removed from ' +
      'every cell that sees the whole other part and the other end.',
    'technique.finnedXWing': 'Finned X-Wing',
    'technique.finnedXWing.desc': 'An X-Wing whose base lines hold extra cells for the digit, the fins, all in one ' +
      'box or region and outside the two cover lines. If no fin holds the digit, the base lines fill the cover ' +
      'lines as in an X-Wing; if a fin does, it removes the digit from every cell that sees it. Either way the ' +
      'digit is removed from every cell of a cover line, outside the base lines, that sees all the fins. A base ' +
      'line with only one cell on the cover lines (a sashimi) works the same way. The same holds with rows and ' +
      'columns swapped.',
    'technique.swordfish': 'Swordfish',
    'technique.swordfish.desc': 'The three-line version of X-Wing: a digit confined to the same three ' +
      'columns in three rows can be removed from the rest of those columns.',
    'technique.finnedSwordfish': 'Finned Swordfish',
    'technique.finnedSwordfish.desc': 'A Swordfish whose base lines hold extra cells for the digit, the fins, all ' +
      'in one box or region and outside the three cover lines. If no fin holds the digit, the base lines fill ' +
      'the three cover lines as in a Swordfish; if a fin does, it removes the digit from every cell that sees ' +
      'it. Either way the digit is removed from every cell of a cover line, outside the base lines, that sees ' +
      'all the fins. A base line may have fewer than three cells on the cover lines, as long as it has at ' +
      'least one. The same holds with rows and columns swapped.',
    'technique.remotePairs': 'Remote Pairs',
    'technique.remotePairs.desc': 'A chain of cells that all hold the same two candidates, each cell seeing the ' +
      'next. Neighbours in the chain take different digits, so the two digits alternate along it. When the ' +
      'chain has an odd number of links, at least three, its two ends hold different digits, so between them ' +
      'they use both digits, and both are removed from every other cell that sees both ends.',
    'technique.xyWing': 'XY-Wing',
    'technique.xyWing.desc': 'A pivot cell with two candidates sees two pincer cells that each share one ' +
      'of them. Whichever way the pivot goes, one pincer holds the common digit, so it leaves every cell ' +
      'that sees both pincers.',
    'technique.xyzWing': 'XYZ-Wing',
    'technique.xyzWing.desc': 'Like XY-Wing, but the pivot has three candidates: the common digit is ' +
      'removed from every cell that sees the pivot and both pincers.',
    'technique.wxyzWing': 'WXYZ-Wing',
    'technique.wxyzWing.desc': 'Four cells that hold only four digits between them. Three of the digits are ' +
      'restricted: the cells that hold one of them all see each other, so it can go in only one of the four ' +
      'cells. The fourth digit is the only one that two of the cells hold without seeing each other. The three ' +
      'restricted digits fill at most three of the four cells, so the fourth digit must be in one of them, and ' +
      'it is removed from every other cell that sees all the cells that hold it.',
    'technique.jellyfish': 'Jellyfish',
    'technique.jellyfish.desc': 'The four-line version of X-Wing: a digit confined to the same four ' +
      'columns in four rows can be removed from the rest of those columns.',
    'technique.wWing': 'W-Wing',
    'technique.wWing.desc': 'Two cells with the same two candidates, joined by a strong link on one of the ' +
      'digits: the other digit is removed from every cell that sees both cells.',
    'technique.uniqueRectangle': 'Unique Rectangle',
    'technique.uniqueRectangle.desc': 'A puzzle has exactly one solution, so four cells in two rows, two ' +
      'columns and two boxes can never be left with only the same two candidates. This forces a ' +
      'candidate out.',
    'technique.bugPlusOne': 'BUG+1',
    'technique.bugPlusOne.desc': 'Every empty cell has two candidates except one, which has three, and every ' +
      'digit that is still to be placed in a row, a column, a box or any other unit has exactly two cells ' +
      'for it, once the extra candidate of the cell with three is left out. Such a position has no solution ' +
      'or at least two solutions. A puzzle has exactly one solution, so the cell with three candidates must ' +
      'be that extra digit.',
    'technique.xyChain': 'XY-Chain',
    'technique.xyChain.desc': 'A chain of cells that each have exactly two candidates. Neighbouring cells of ' +
      'the chain see each other and share a digit, so if one end of the chain is not that digit, the other ' +
      'end must be. At least one end holds the digit, and a cell that sees both ends cannot hold it.',
    'technique.forcingChain': 'Forcing Chain',
    'technique.forcingChain.desc': 'A chain of "if this, then that" deductions that proves a candidate ' +
      'false (or a digit true). If a proof step represents a group, it lists the cells that can still hold ' +
      'one digit where a box (or region) meets a row or column. A group is true when at least one of its ' +
      'cells holds the digit, written (R1C1=5 \u2228 R1C2=5), and false when none of them does, written ' +
      '(R1C1\u22605 \u2227 R1C2\u22605); a true group never says which of its cells holds the digit. ' +
      'Any candidate removed by the endpoint rule must conflict with every candidate represented by each ' +
      'end. Chains are searched up to a limited length, so a hint does not promise to find every chain.',
    'technique.alsXz': 'ALS-XZ (almost locked sets)',
    'technique.alsXz.desc': 'An almost locked set is some cells of one unit that have exactly one more ' +
      'candidate digit between them than they have cells, so they hold all of those digits but one. Take two ' +
      'such sets that share no cell, and a digit X that both can hold and where every X of one set sees ' +
      'every X of the other. The two sets cannot both hold X, so one of them lacks X and holds all of its ' +
      'other digits. A digit Z that both sets can hold is therefore in one of them, and a cell that sees ' +
      'every Z of both sets cannot hold Z.',
    'technique.forcingChainLong': 'Long Forcing Chain',
    'technique.forcingChainLong.desc': 'The same kind of chain as the Forcing Chain, but one that is too ' +
      'long for it: the shortest chain that works has more links than the plain Forcing Chain allows (up ' +
      'to 12 links). If a proof step represents a group, its truth and falsehood have the same meaning as ' +
      'in a Forcing Chain. Any candidate removed by the endpoint rule must conflict with every candidate ' +
      'represented by each end. A hint does not promise to find every chain.',
    'technique.nishio': 'Nishio (trial and error)',
    'technique.nishio.desc': 'Trial and error with a limit: assume a candidate is true; when simple ' +
      'deductions then lead to a contradiction, the candidate is false.',
    'technique.nishioDeep': 'Deep Nishio (a guess inside a guess)',
    'technique.nishioDeep.desc': 'Trial and error on two levels: assume a candidate is true; when simple ' +
      'deductions, helped by one more trial inside that assumption, lead to a contradiction, the ' +
      'candidate is false. It is only used when a plain trial is not enough.',
    'technique.cageCombo.desc': 'The digits of a cage are all different and add up to its sum, which often ' +
      'leaves only a few possible combinations.',
    'technique.ruleOf45.desc': 'Every row, column and box adds up to 45, and so do several of them together ' +
      '(45 each). Cages that lie entirely inside such a group tell you the sum of its remaining cells; ' +
      'cages that stick out of it do the same for the cells just outside.',
    'technique.cageSplit.desc': 'A cage that sticks out of a row, column or box splits into an inside part ' +
      'and an outside part, each with a sum of its own.'
  });

  // Solving-step texts, one per `i18nKey` of a technique finding; placeholders are its `i18nArgs` ({unit},
  // {box}, {line} are unit labels such as R4, C2, B3; {cell...} are cell labels).

  add({
    'technique.nakedSingle.step': '{cell} has only one candidate left: {digit}. So {cell} must be {digit}.',
    'technique.hiddenSingleBox.step': 'In the {unitKind} {unit}, the digit {digit} fits in only one cell: ' +
      '{cell}. So {cell} must be {digit}.',
    'technique.hiddenSingleLine.step': 'In the {unitKind} {unit}, the digit {digit} fits in only one cell: ' +
      '{cell}. So {cell} must be {digit}.',
    'technique.pointing.step': 'In {box}, the digit {digit} can only go in {count} cells, and they all lie ' +
      'on {line}. So {digit} must be on {line} inside {box}, and it is removed from the other cells of ' +
      '{line}.',
    'technique.boxLine.step': 'On {line}, the digit {digit} can only go in {count} cells, and they all ' +
      'lie in {box}. So {digit} must be on {line} inside {box}, and it is removed from the other cells ' +
      'of {box}.',
    'technique.nakedPair.step': 'In the {unitKind} {unit}, the two cells {cells} can only hold the digits ' +
      '{digits} between them. Those digits belong to these cells, so they are removed from the other cells ' +
      'of {unit}.',
    'technique.nakedTriple.step': 'In the {unitKind} {unit}, the three cells {cells} can only hold the ' +
      'digits {digits} between them. Those digits belong to these cells, so they are removed from the ' +
      'other cells of {unit}.',
    'technique.lawOfLeftovers.step': 'Law of Leftovers: the lines {lines} and the regions {regions} are ' +
      'complete and, inside each group, share no cell, so each group holds every digit as many times as it ' +
      'has units. Set aside the cells that the lines and the regions share. The cells left over, {cells}, ' +
      'form two sides, one from the lines and one from the regions, that must hold the same digits, ' +
      'repeats counted. Wherever no way of filling both sides alike puts one of the digits {digits} in a ' +
      'cell, that digit is removed from the cell.',
    'technique.nakedQuad.step': 'In the {unitKind} {unit}, the four cells {cells} can only hold the digits ' +
      '{digits} between them. Those digits belong to these cells, so they are removed from the other cells ' +
      'of {unit}.',
    'technique.hiddenPair.step': 'In the {unitKind} {unit}, the digits {digits} can only go in the two ' +
      'cells {cells}. These cells must hold exactly those digits, so every other candidate is removed ' +
      'from them.',
    'technique.hiddenTriple.step': 'In the {unitKind} {unit}, the digits {digits} can only go in the three ' +
      'cells {cells}. These cells must hold exactly those digits, so every other candidate is removed ' +
      'from them.',
    'technique.hiddenQuad.step': 'In the {unitKind} {unit}, the digits {digits} can only go in the four ' +
      'cells {cells}. These cells must hold exactly those digits, so every other candidate is removed ' +
      'from them.',
    'technique.xWing.step': 'X-Wing on {digit}: in {baseUnits}, the digit {digit} can only go in ' +
      '{coverUnits}. The two {digit}s of the base lines fill both cover lines, so {digit} is removed from ' +
      'every other cell of {coverUnits}.',
    'technique.skyscraper.step': 'Skyscraper on {digit}: in {lines}, the digit {digit} can only go in two ' +
      'cells each, and one cell of each lies on a common line, so those two cannot both be {digit}. At ' +
      'least one of the other two cells, {ends}, is {digit}, so {digit} is removed from every other cell ' +
      'that sees both of them.',
    'technique.twoStringKite.step': 'Two-String Kite on {digit}: in {lines}, the digit {digit} can only go in two ' +
      'cells each, and the cells {bridge} (the bridge) lie in the same box or region, so they cannot both be ' +
      '{digit}. At least one of the other two cells, {ends}, is {digit}, so {digit} is removed from every ' +
      'other cell that sees both of them.',
    'technique.emptyRectangle.step': 'Empty Rectangle on {digit}: in {box}, the digit {digit} can only go in the ' +
      'cells of {lines}, in two parts that share no cell. {ends} are the only two cells for {digit} in their ' +
      'unit, so one of them is {digit}. If the end that sees every {digit} of one part is {digit}, that part ' +
      'loses it and the other part holds it; if it is not, the other end is {digit}. Either way {digit} is ' +
      'removed from every other cell that sees the whole other part and the other end.',
    'technique.finnedXWing.step': 'Finned X-Wing on {digit}: in {bases}, the digit {digit} can only go in ' +
      '{covers}, apart from the fin cells {fins}, which all lie in one box or region. If none of the fins is ' +
      '{digit}, the two {digit}s of the base lines fill both cover lines; if one is, it removes {digit} from ' +
      'every cell it sees. Either way {digit} is removed from every cell of {covers}, outside the base lines ' +
      '{bases}, that sees all the fins.',
    'technique.swordfish.step': 'Swordfish on {digit}: in {baseUnits}, the digit {digit} can only go in ' +
      '{coverUnits}. The three {digit}s of the base lines fill all three cover lines, so {digit} is ' +
      'removed from every other cell of {coverUnits}.',
    'technique.finnedSwordfish.step': 'Finned Swordfish on {digit}: in {bases}, the digit {digit} can only go ' +
      'in {covers}, apart from the fin cells {fins}, which all lie in one box or region. If none of the fins ' +
      'is {digit}, the three {digit}s of the base lines fill all three cover lines; if one is, it removes ' +
      '{digit} from every cell it sees. Either way {digit} is removed from every cell of {covers}, outside ' +
      'the base lines {bases}, that sees all the fins.',
    'technique.jellyfish.step': 'Jellyfish on {digit}: in {baseUnits}, the digit {digit} can only go in ' +
      '{coverUnits}. The four {digit}s of the base lines fill all four cover lines, so {digit} is removed ' +
      'from every other cell of {coverUnits}.',
    'technique.simpleColouring.step': 'Simple Colouring on {digit}: cells linked by "one or the other" are ' +
      'painted in two colours. Colour 1: {colour1}. Colour 2: {colour2}. Exactly one colour holds the ' +
      'digit, which removes {digit} from the cells that cannot be it.',
    'technique.simpleColouring.step.wrap': 'Simple Colouring on {digit} (colour clash): colour 1 is ' +
      '{colour1}, colour 2 is {colour2}. Two cells of colour {falseColour} see each other ({witness}), so ' +
      'that colour cannot be the true one. {digit} is removed from every cell of colour {falseColour}.',
    'technique.simpleColouring.step.trap': 'Simple Colouring on {digit} (colour trap): colour 1 is ' +
      '{colour1}, colour 2 is {colour2}. One of the two colours holds the digit, and a cell outside the ' +
      'chain sees both colours, so it cannot be {digit}. {digit} is removed from such cells.',
    'technique.remotePairs.step': 'Remote pair {digits}: a chain of {length} links joins {ends}, and every cell of ' +
      'the chain holds only {digits}. Cells next to each other in the chain take different digits, so the digits ' +
      'alternate along it; with an odd number of links the two ends take different digits, so between them ' +
      'they use both digits ({digits}). Both digits are removed from every other cell that sees both ends ({ends}).',
    'technique.xyWing.step': 'XY-Wing: the pivot {pivot} holds {digitX} or {digitY}; the pincer {pincer1} ' +
      'holds {digitX} or {digit}; the pincer {pincer2} holds {digitY} or {digit}. Whichever digit the ' +
      'pivot takes, one of the pincers must be {digit}, so {digit} is removed from every cell that sees ' +
      'both pincers.',
    'technique.xyzWing.step': 'XYZ-Wing: the pivot {pivot} holds {digitX}, {digitY} or {digit}; the pincer ' +
      '{pincer1} holds {digitX} or {digit}; the pincer {pincer2} holds {digitY} or {digit}. One of these ' +
      'three cells must be {digit}, so {digit} is removed from every cell that sees all three.',
    'technique.wxyzWing.step': 'WXYZ-Wing on {digits}: the cells {cells} hold no other digit. Every digit ' +
      'except {digit} appears only in cells that see each other, so it can be placed in at most one of the ' +
      'four cells. Three digits fill at most three cells, so one of the cells that hold {digit} must be ' +
      '{digit}. {digit} is removed from every other cell that sees all the cells of the pattern that hold it.',
    'technique.wWing.step': 'W-Wing: {cell1} and {cell2} both hold only {digitX} or {digit} and do not see ' +
      'each other. A strong link on {digitX} in {unit} ({link1} and {link2}) joins them, so one of the two ' +
      'cells must be {digit}. {digit} is removed from every cell that sees both.',
    'technique.uniqueRectangle.type1.step': 'Unique Rectangle: three corners hold only {digitX} and ' +
      '{digitY}. If {cell} held only those two as well, the puzzle would have two solutions. So {digitX} ' +
      'and {digitY} are removed from {cell}.',
    'technique.uniqueRectangle.type2.step': 'Unique Rectangle: two corners hold only {digitX} and ' +
      '{digitY}; the other two, {roof1} and {roof2}, also hold {digit}. To avoid two solutions, one of ' +
      'those two must be {digit}, so {digit} is removed from every cell that sees both.',
    'technique.uniqueRectangle.type3.step': 'Unique Rectangle: the two corners other than {roof1} and {roof2} ' +
      'hold only {digits}. To avoid two solutions, {roof1} or {roof2} must hold a digit that is not in ' +
      '{digits}, and every such digit is one of {partDigits}. In {unit}, that cell and the cells {cells}, which ' +
      'can only hold digits of {partDigits}, are as many cells as there are digits in {partDigits}, so they use ' +
      'up all of them. {partDigits} are removed from the cells of {unit} outside both {roof1} and {roof2} ' +
      'and the cells {cells}.',
    'technique.uniqueRectangle.type4.step': 'Unique Rectangle: the two corners other than {roof1} and {roof2} ' +
      'hold only {digits}. In {unit}, {roof1} and {roof2} are the only cells that can still be the digit of ' +
      '{digits} that is not {digit}, so one of them is that digit. The other one cannot be {digit} either: all ' +
      'four corners would then hold only {digits} and the puzzle would have two solutions. So {digit} is ' +
      'removed from both {roof1} and {roof2}.',
    'technique.uniqueRectangle.hidden.step': 'Unique Rectangle, hidden form: the corners {cells} all hold {digits}, ' +
      'and at least one of them holds only {digits}. In the row and in the column of the corner opposite to that one, ' +
      '{digit} has just two places: the opposite corner itself and one of the other two corners. If the ' +
      'opposite corner were the digit of {digits} that is not {digit}, both other corners would have to be ' +
      '{digit}, and the corner that holds only {digits} would be that other digit too. The four corners would ' +
      'then hold {digits} in two interchangeable ways and the puzzle would have two solutions. So the digit of ' +
      '{digits} other than {digit} is removed from the opposite corner.',
    'technique.bugPlusOne.step': 'BUG+1: every empty cell has two candidates except {label}, which has three. ' +
      'Without {digit} in {label}, every digit that is still to be placed in a row, a column, a box or any ' +
      'other unit would have exactly two cells for it. Such a position has no solution or at least two ' +
      'solutions. The puzzle has just one solution, so {label} is {digit}.',
    'technique.xyChain.step': 'XY-chain on {digit} of {length} links: {chains}. Every cell of the chain has ' +
      'exactly two candidates, and each link joins two cells that see each other through the same digit. If ' +
      'the first end is not {digit}, the links force the last end to be {digit}, so at least one end of the ' +
      'chain is {digit}. A candidate {digit} that sees both ends is removed.',
    'technique.forcingChain.step.endpoints': 'Forcing chain of {length} links: {chains}. If the first end ' +
      'is false, the last end is true, so at least one end is true. Candidates that conflict with every ' +
      'candidate represented by each end are removed.',
    'technique.forcingChain.step.contradiction': 'Forcing chain of {length} links: {chains}. If the first ' +
      'candidate were true, a statement about a candidate or group would be both true and false, which is ' +
      'impossible. So the first candidate is false and is removed.',
    'technique.forcingChain.step.forced': 'Forcing chain of {length} links: {chains}. If the first ' +
      'candidate were false, a statement about a candidate or group would be both true and false, which is ' +
      'impossible. So the first candidate is true and is placed.',
    'technique.alsXz.step': 'ALS-XZ on {digitX} and {digitY}: the cells {cells} form two almost locked ' +
      'sets that share no cell, and both sets can hold {digitX} and {digitY}. Every {digitX} of one set sees ' +
      'every {digitX} of the other, so at most one of the sets holds {digitX}. The other set then holds all ' +
      'of its other digits, so one of the two sets holds {digitY}. A candidate {digitY} that sees every ' +
      '{digitY} of both sets is removed.',
    'technique.nishio.step': 'Trial and error (depth {depth}): if {label} were {digit}, simple deductions ' +
      'would end in a contradiction. So {digit} is removed from {label}.',
    'technique.forcingChainLong.step.endpoints': 'Long forcing chain of {length} links: {chains}. If the ' +
      'first end is false, the last end is true, so at least one end is true. Candidates that conflict ' +
      'with every candidate represented by each end are removed.',
    'technique.forcingChainLong.step.contradiction': 'Long forcing chain of {length} links: {chains}. If ' +
      'the first candidate were true, a statement about a candidate or group would be both true and false, ' +
      'which is impossible. So the first candidate is false and is removed.',
    'technique.forcingChainLong.step.forced': 'Long forcing chain of {length} links: {chains}. If the ' +
      'first candidate were false, a statement about a candidate or group would be both true and false, ' +
      'which is impossible. So the first candidate is true and is placed.',
    'technique.nishioDeep.step': 'Deep trial and error (depth {depth}): if {label} were {digit}, simple ' +
      'deductions together with a second trial inside that assumption would end in a contradiction. So ' +
      '{digit} is removed from {label}.'
  });

  // Event log lines, one per key of SG.events.vocabularyKeys() (killer, wordoku, jigsaw and multigrid add
  // their own)

  add({
    'configure.start': 'Reading the settings.',
    'configure.config': 'Settings \u2014 variant: {variantId} \u00b7 level: {difficulty} \u00b7 seed: ' +
      '{seed} \u00b7 symmetry: {symmetry} \u00b7 symbols: {symbolMode} \u00b7 dig order: {digOrder} \u00b7 ' +
      'up to {maxAttempts} attempts.',
    'configure.end': 'The settings are ready.',

    'buildModel.start': 'Building the board: {variantId}.',
    'buildModel.model': 'Board built: {cellCount} cells, {digits} symbols, {units} units (rows, columns, ' +
      'regions).',
    'buildModel.spec': 'Target level: {level} \u2014 score from {scoreMin} to {scoreMax}, at least ' +
      '{minClues} clues.',
    'buildModel.traceDowngraded': 'The board has {cellCount} cells, too many for a full replay: the detail ' +
      'level is reduced from "{requested}" to "{applied}".',
    'buildModel.end': 'The board is ready.',

    'fullGrid.start': 'Attempt {attempt} of {maxAttempts}: filling the whole grid.',
    'fullGrid.clear_one': 'The board is cleared ({count} cell).',
    'fullGrid.clear_other': 'The board is cleared ({count} cells).',
    'fullGrid.fixed_one': '{count} cell is fixed by the variant.',
    'fullGrid.fixed_other': '{count} cells are fixed by the variant.',
    'fullGrid.seed_one': 'A quick start fills {count} cell.',
    'fullGrid.seed_other': 'A quick start fills {count} cells.',
    'fullGrid.place': 'Try {value} in {cell} (guess depth {depth}).',
    'fullGrid.conflict': '{value} in {cell} leads to a dead end.',
    'fullGrid.backtrack': 'Dead end: take {value} back from {cell} and try the next digit.',
    'fullGrid.restart_one': 'Too many dead ends ({backtracks} of {limit}): restart {restart}, {count} cell ' +
      'cleared.',
    'fullGrid.restart_other': 'Too many dead ends ({backtracks} of {limit}): restart {restart}, {count} ' +
      'cells cleared.',
    'fullGrid.end': 'The full grid is complete.',

    'extraStructure.start': 'Building the extra structure: {variantId}.',
    'extraStructure.none': '{variantId} has no extra structure to build.',
    'extraStructure.built': 'The extra structure of {variantId} is built.',
    'extraStructure.end': 'The extra structure step is finished.',

    'dig.start': 'Digging holes \u2014 symmetry: {symmetry} \u00b7 dig order: {order} \u00b7 at least ' +
      '{minClues} clues stay.',
    'dig.restore_one': 'The full grid is shown again ({count} cell).',
    'dig.restore_other': 'The full grid is shown again ({count} cells).',
    'dig.pass.start': 'Start of the {pass} pass: {clues} clues on the board.',
    'dig.skip': 'Skip {cells}: {reason}.',
    'dig.try': 'Try removing {cells}.',
    'dig.accept': 'Removed {cells}: the puzzle can still be solved with the allowed techniques.',
    'dig.reject': 'Put {cells} back: {reason}.',
    'dig.keep': 'The removal of {cells} is possible (score {score}).',
    'dig.pass.end': 'End of the {pass} pass: {clues} clues left.',
    'dig.verify': 'Checking that the puzzle has exactly one solution.',
    'dig.verify.yes': 'Checked: the puzzle has exactly one solution.',
    'dig.verify.no': 'Checked: the puzzle has more than one solution!',
    'dig.unsound': 'A technique gave an ambiguous puzzle, so a safe plain dig replaces it.',
    'dig.end': 'Digging is finished.',
    'dig.reason.rejected': 'a cell of it was already refused',
    'dig.reason.minClues': 'the puzzle would fall below its minimum number of clues',
    'dig.reason.unitMinimum': 'a row, column or region would run too low on clues',
    'dig.reason.ambiguous': 'the puzzle would no longer have exactly one solution',
    'dig.reason.techniques': 'the allowed techniques could no longer finish the puzzle',
    'dig.reason.tooHard': 'the puzzle would become harder than the requested level',
    'digPass.random': 'random',
    'digPass.guided': 'guided',
    'digPass.fallback': 'safe fallback',

    'rate.start': 'Rating the puzzle with the logical solver.',
    'rate.technique_one': '{technique} ({group}) was needed {count} time.',
    'rate.technique_other': '{technique} ({group}) was needed {count} times.',
    'rate.result': 'Rating: {level}, score {score}, hardest technique: {hardestTechnique}.',
    'rate.end': 'The rating is finished.',

    'tune.start': 'Comparing the puzzle with the requested level (attempt {attempt} of {maxAttempts}).',
    'tune.hit': 'Level reached: "{achieved}" (score {score}, band {scoreMin} to {scoreMax}).',
    'tune.miss': 'Missed the level: wanted "{requested}", got "{achieved}" (score {score}). Trying again ' +
      '(sample {sample} of {maxSamples}).',
    'tune.shallow': 'The score {score} is inside the "{requested}" band ({scoreMin} to {scoreMax}), but ' +
      'the puzzle does not need a "{requested}" technique, so it does not count as reached. Trying again ' +
      '(sample {sample} of {maxSamples}).',
    'tune.best': 'Out of attempts. The closest puzzle is "{achieved}" (wanted "{requested}", score {score}).',
    'tune.final_one': 'The final puzzle is shown on the board ({count} cell changed).',
    'tune.final_other': 'The final puzzle is shown on the board ({count} cells changed).',
    'tune.end': 'Tuning is finished.',

    'retry.difficulty': 'Attempt {attempt} of {maxAttempts} gave "{achieved}" instead of "{requested}".',
    'retry.difficulty.yes': 'Attempt {attempt} of {maxAttempts} gave "{achieved}" instead of ' +
      '"{requested}". A new grid is drawn.',
    'retry.difficulty.no': 'Attempt {attempt} of {maxAttempts} gave "{achieved}" instead of ' +
      '"{requested}". No attempts are left.',
    'retry.reason.difficulty': 'the difficulty did not match',

    'done': 'Generation finished.',
    'done.yes': 'Done: a "{achieved}" puzzle with {clues} clues (seed {seed}).',
    'done.no': 'Done: the closest puzzle is "{achieved}" (requested "{requested}") with {clues} clues ' +
      '(seed {seed}).',

    'trace.coalesced_one': 'The log skips {dropped} detailed step here.',
    'trace.coalesced_other': 'The log skips {dropped} detailed steps here.'
  });

  // Warnings of a finished puzzle (PuzzleResult.warnings) and error messages (error.<code>)

  add({
    'difficulty.approximate': 'The generator could not hit the requested level exactly, so this is the ' +
      'closest puzzle it found.',
    'difficulty.shallow': 'The puzzle is in the requested score band but does not need a technique from ' +
      'the {level} tier.',
    'digger.unsoundTechnique': 'A solving technique produced an ambiguous puzzle. A safe plain dig was ' +
      'used instead, so the difficulty may differ from the rating.',
    'trace.downgraded': 'The board is too large for a full step-by-step replay, so the detail level was ' +
      'reduced to a summary.',

    'error.unknown': 'Something went wrong ({code}).',
    'error.unexpected': 'An unexpected error stopped the generator: {message}',
    'error.budget.exceeded': 'Generation took longer than allowed and was stopped. Try again, use another ' +
      'seed, or pick an easier level.',
    'error.budget.cancelled': 'Generation was cancelled.',
    'error.constraints.invalidExtension': 'A constraint extension is not valid (id: {id}).',
    'error.constraints.duplicateExtension': 'The constraint extension "{id}" is registered twice.',
    'error.dfs.invalidGivens': 'The given digits do not fit this board.',
    'error.dfs.invalidLimit': 'The solution limit "{limit}" is not valid.',
    'error.difficulty.unknownLevel': 'Unknown difficulty level "{level}".',
    'error.difficulty.unknownTechnique': 'The solving technique "{technique}" has no difficulty points.',
    'error.difficulty.unsupportedLevel': '{variantId} cannot be generated at the level "{level}". Please ' +
      'choose another level.',
    'error.digger.invalidOption': 'The value "{value}" is not valid for the option "{option}".',
    'error.digger.noRatedPuzzle': 'No puzzle of {variantId} could be rated completely by logic. Try again ' +
      'with another seed.',
    'error.digger.objectiveGuard': 'A solve of the guided dig ran out of its work limit.',
    'error.digger.uniqueGuard': 'A uniqueness check of the search ran out of its work limit.',
    'error.digger.invalidSolution': 'The solution handed to the digger is not valid.',
    'error.digger.notUnique': 'The dug puzzle of {variantId} does not have exactly one solution.',
    'error.digger.invalidStrategy': 'The dig strategy "{id}" is not valid.',
    'error.digger.unknownStrategy': 'Unknown dig strategy "{id}".',
    'error.digger.invalidPostGenerate': 'The extra-structure hook of {variantId} returned a board that ' +
      'cannot be used.',
    'error.events.invalidPatch': 'A board update in the step log is not valid.',
    'error.events.invalidVerbosity': 'Unknown detail level "{verbosity}" for the step log.',
    'error.events.invalidSink': 'The receiver of the step log is not valid.',
    'error.events.invalidEvent': 'An event in the step log is not valid.',
    'error.events.invalidLimit': 'The size limit "{maxEvents}" of the step log is not valid.',
    'error.exchange.invalidToken': 'The puzzle link code is not valid or was cut short. Copy the whole ' +
      'link again.',
    'error.exchange.tooLarge': 'This puzzle is too large to travel in a link.',
    'error.exchange.unsupportedEncoding': 'This browser cannot unpack puzzle links. Try a newer browser.',
    'error.exchange.invalidJson': 'The content of the puzzle link is not valid JSON.',
    'error.exchange.invalidUrl': 'The address of the player is not valid. It must be an http or https ' +
      'address.',
    'error.fullGrid.invalidFixedCells': 'The fixed cells of the board contradict each other.',
    'error.fullGrid.unsatisfiable': 'No solution exists for the board of {variantId}.',
    'error.killer.sliceExpired': 'The cage search ran out of its time slice.',
    'error.model.invalidSpec': 'The definition of the board is not valid.',
    'error.pipeline.invalidOption': 'The option "{option}" is not valid.',
    'error.pipeline.invalidModel': 'The variant {variantId} built a board that cannot be used.',
    'error.rng.invalidSeed': 'The seed "{seed}" is not valid. Use a whole number.',
    'error.rng.invalidRange': 'The random range "{n}" is not valid.',
    'error.solver.invalidFinding': 'The technique {technique} returned an invalid deduction.',
    'error.solver.invalidOption': 'The option "{option}" of the logical solver is not valid.',
    'error.solver.unknownTechnique': 'Unknown solving technique "{id}".',
    'error.solver.invalidGivens': 'The given digits are not valid for the logical solver.',
    'error.solver.emptyFinding': 'The technique {technique} returned a deduction that changes nothing.',
    'error.solver.stateMutated': 'The technique {technique} modified the board state, which it must not do.',
    'error.solver.noEffect': 'The technique {technique} returned a deduction that has no effect.',
    'error.symmetry.unknownKind': 'Unknown symmetry "{kind}".',
    'error.symmetry.needsSquareCanvas': 'The symmetry "{kind}" needs a square board, but this one is ' +
      '{rows}\u00d7{cols}.',
    'error.technique.invalidDef': 'The definition of the technique "{id}" is not valid.',
    'error.technique.duplicate': 'The technique "{id}" is registered twice.',
    'error.technique.unknown': 'Unknown technique "{id}".',
    'error.variant.invalidDef': 'The definition of the variant "{id}" is not valid.',
    'error.variant.duplicate': 'The variant "{id}" is registered twice.',
    'error.variant.unknown': 'Unknown variant "{id}".'
  });

  if (SG.i18n && typeof SG.i18n.mergeFragments === 'function') SG.i18n.mergeFragments();
})(typeof self !== 'undefined' ? self : globalThis);
