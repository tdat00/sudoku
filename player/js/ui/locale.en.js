/**
 * English language pack: the shared strings of the player. Modules that own their strings add them through
 * `SG.localeFragments` instead (see js/ui/i18n.js). Keep the key set identical to locale.vi.js. Placeholders
 * are `{name}` (for a technique, the `i18nArgs` of its findings); plural forms use `_one` / `_other`.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};
  SG.locales = SG.locales || {};
  const pack = SG.locales.en = SG.locales.en || {};

  function add(section) {
    Object.keys(section).forEach(function (key) { pack[key] = section[key]; });
  }

  add({
    'app.title': 'Sudoku Player',
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
    'common.loading': 'Loading…',
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
    'unit.cell_one': '{count} cell',
    'unit.cell_other': '{count} cells',
    'unit.clue_one': '{count} clue',
    'unit.clue_other': '{count} clues',
    'duration.h': '{h} h',
    'duration.hMin': '{h} h {min} min',
    'duration.min': '{min} min',
    'duration.minSec': '{min} min {sec} s',
    'duration.ms': '{value} ms',
    'duration.s': '{value} s'
  });

  add({
    'variant.classic4': 'Classic Sudoku 4×4',
    'variant.classic4.desc': 'A small 4×4 grid with 2×2 boxes. Each row, column and box holds the digits ' +
      '1 to 4 once. A gentle start for beginners and children.',
    'variant.classic6': 'Classic Sudoku 6×6',
    'variant.classic6.desc': 'A 6×6 grid with boxes of 2 rows × 3 columns. Each row, column and box holds ' +
      'the digits 1 to 6 once.',
    'variant.classic9': 'Classic Sudoku 9×9',
    'variant.classic9.desc': 'The standard 9×9 grid with 3×3 boxes. Each row, column and box holds the ' +
      'digits 1 to 9 once.',
    'variant.diagonalX.desc': 'Classic 9×9 rules, and both long diagonals must also hold each digit from ' +
      '1 to 9 once.',
    'variant.hyper.desc': 'Classic 9×9 rules, and the four shaded 3×3 windows must also hold each digit ' +
      'from 1 to 9 once.',
    'variant.jigsaw9.desc': 'Like classic Sudoku, but the nine regions are irregular jigsaw-like shapes ' +
      'instead of 3×3 boxes.',
    'variant.killer.desc': 'Dashed cages show a target sum: the digits in a cage add up to it and never ' +
      'repeat. Hardly any digits are given.',
    'variant.greaterThan.desc': 'Signs between neighbouring cells show which of the two digits is larger. ' +
      'Combine them with the usual rules.',
    'variant.wordoku.desc': 'A 9×9 Sudoku played with nine letters instead of digits. A hidden ' +
      'nine-letter word appears when the puzzle is solved.',
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
    'difficulty.expert.desc': 'Typically uses a wing (XY-Wing, XYZ-Wing), a Jellyfish or several fish patterns.',
    'difficulty.master': 'Master',
    'difficulty.master.desc': 'Typically uses several wings, the W-Wing or Unique Rectangles, sometimes a short ' +
      'forcing chain.',
    'difficulty.nightmare': 'Nightmare',
    'difficulty.nightmare.desc': 'Typically uses forcing chains and trial and error (Nishio), with very few clues.',
    'difficulty.hell1': 'Hell 1',
    'difficulty.hell1.desc': 'Typically uses many forcing chains and trial-and-error steps.',
    'difficulty.hell2': 'Hell 2',
    'difficulty.hell2.desc': 'Highest score band; typically involves substantial advanced reasoning.',
    'variant.mega12': 'Mega Sudoku 12×12',
    'variant.mega12.desc': 'A 12×12 grid with boxes of 3 rows × 4 columns. Each row, column and box holds ' +
      'all 12 symbols once.',
    'variant.mega16': 'Monster Sudoku 16×16',
    'variant.mega16.desc': 'A 16×16 grid with 4×4 boxes. Each row, column and box holds all 16 symbols once.',
    'variant.diagonalX': 'Diagonal Sudoku (X)',
    'variant.hyper': 'Hyper Sudoku (Windoku)',
    'variant.jigsaw9': 'Jigsaw Sudoku',
    'variant.killer': 'Killer Sudoku',
    'variant.greaterThan': 'Greater-Than Sudoku',
    'variant.samurai': 'Samurai Sudoku',
    'variant.samurai.desc': 'Five overlapping 9×9 grids: the centre grid shares one 3×3 box with each ' +
      'corner grid (369 cells).',
    'variant.sohei': 'Sohei Sudoku',
    'variant.sohei.desc': 'Four 9×9 grids in a ring: each grid shares a 3×3 box with the two grids beside ' +
      'it (288 cells).',
    'variant.butterfly': 'Butterfly Sudoku',
    'variant.butterfly.desc': 'Four 9×9 grids, each shifted by one box, overlapping in a central 6×6 area ' +
      '(144 cells).',
    'variant.flower': 'Flower Sudoku',
    'variant.flower.desc': 'Five 9×9 grids: four petals around a centre grid, overlapping very densely ' +
      '(189 cells).',
    'variant.wordoku': 'Wordoku'
  });

  // Board vocabulary

  add({
    'unitKind.box': 'box',
    'unitKind.cage': 'cage',
    'unitKind.col': 'column',
    'unitKind.diag': 'diagonal',
    'unitKind.region': 'region',
    'unitKind.row': 'row',
    'unitKind.window': 'window',
    'symbolMode.digits': 'Digits',
    'symbolMode.letters': 'Letters',
    'symbolMode.colors': 'Colours',
    'symbolMode.shapes': 'Shapes',
    'symbolMode.word': 'Word letters'
  });

  // Techniques: names, descriptions and the sentence of one step

  add({
    'techniqueGroup.basic': 'Singles',
    'techniqueGroup.locked': 'Locked candidates',
    'techniqueGroup.subset': 'Pairs, triples and quads',
    'techniqueGroup.fish': 'Fish and colouring',
    'techniqueGroup.wing': 'Wings',
    'techniqueGroup.chain': 'Chains and trial and error',
    'techniqueGroup.cage': 'Cage rules',
    'techniqueGroup.ineq': 'Inequality rules',
    'technique.nakedSingle': 'Naked Single',
    'technique.nakedSingle.desc': 'A cell that has only one candidate left must hold that digit.',
    'technique.hiddenSingleBox': 'Hidden Single (box)',
    'technique.hiddenSingleBox.desc': 'When a digit can go in only one cell of a box (or region, ' +
      'diagonal, window), it belongs in that cell.',
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
    'technique.hiddenTriple': 'Hidden Triple',
    'technique.hiddenTriple.desc': 'Three digits that can only go in the same three cells of a unit must ' +
      'fill those cells, so every other candidate can be removed from them.',
    'technique.nakedQuad': 'Naked Quad',
    'technique.nakedQuad.desc': 'Four cells of a unit whose candidates are limited to the same four ' +
      'digits must hold them, so those digits can be removed from the other cells of the unit.',
    'technique.hiddenQuad': 'Hidden Quad',
    'technique.hiddenQuad.desc': 'Four digits that can only go in the same four cells of a unit must fill ' +
      'those cells, so every other candidate can be removed from them.',
    'technique.xWing': 'X-Wing',
    'technique.xWing.desc': 'When a digit has only two possible cells in each of two rows, and they lie ' +
      'in the same two columns, the digit can be removed from the rest of those columns (and the same ' +
      'with rows and columns swapped).',
    'technique.simpleColouring': 'Simple Colouring',
    'technique.simpleColouring.desc': 'Cells linked by "one or the other" for a single digit are painted ' +
      'in two colours. Exactly one colour is true, which exposes cells that cannot hold the digit.',
    'technique.swordfish': 'Swordfish',
    'technique.swordfish.desc': 'The three-line version of X-Wing: a digit confined to the same three ' +
      'columns in three rows can be removed from the rest of those columns.',
    'technique.xyWing': 'XY-Wing',
    'technique.xyWing.desc': 'A pivot cell with two candidates sees two pincer cells that each share one ' +
      'of them. Whichever way the pivot goes, one pincer holds the common digit, so it leaves every cell ' +
      'that sees both pincers.',
    'technique.xyzWing': 'XYZ-Wing',
    'technique.xyzWing.desc': 'Like XY-Wing, but the pivot has three candidates: the common digit is ' +
      'removed from every cell that sees the pivot and both pincers.',
    'technique.jellyfish': 'Jellyfish',
    'technique.jellyfish.desc': 'The four-line version of X-Wing: a digit confined to the same four ' +
      'columns in four rows can be removed from the rest of those columns.',
    'technique.wWing': 'W-Wing',
    'technique.wWing.desc': 'Two cells with the same two candidates, joined by a strong link on one of ' +
      'the digits: the other digit is removed from every cell that sees both cells.',
    'technique.uniqueRectangle': 'Unique Rectangle',
    'technique.uniqueRectangle.desc': 'A puzzle has exactly one solution, so four cells in two rows, two ' +
      'columns and two boxes can never be left with only the same two candidates. This forces a candidate ' +
      'out.',
    'technique.forcingChain': 'Forcing Chain',
    'technique.forcingChain.desc': 'A chain of "if this, then that" deductions that proves a candidate ' +
      'false (or a digit true).',
    'technique.nishio': 'Nishio (trial and error)',
    'technique.nishio.desc': 'Trial and error with a limit: assume a candidate is true; when simple ' +
      'deductions then lead to a contradiction, the candidate is false.',
    'technique.cageCombo.desc': 'The digits of a cage are all different and add up to its sum, which ' +
      'often leaves only a few possible combinations.',
    'technique.ruleOf45.desc': 'Every row, column and box adds up to 45, and so do several of them together ' +
      '(45 each). Cages that lie entirely inside such a group tell you the sum of its remaining cells; ' +
      'cages that stick out of it do the same for the cells just outside.',
    'technique.cageSplit.desc': 'A cage that sticks out of a row, column or box splits into an inside ' +
      'part and an outside part, each with a sum of its own.',
    'technique.nakedSingle.step': '{cell} has only one candidate left: {digit}. So {cell} must be {digit}.',
    'technique.hiddenSingleBox.step': 'In the {unitKind} {unit}, the digit {digit} fits in only one cell: ' +
      '{cell}. So {cell} must be {digit}.',
    'technique.hiddenSingleLine.step': 'In the {unitKind} {unit}, the digit {digit} fits in only one ' +
      'cell: {cell}. So {cell} must be {digit}.',
    'technique.pointing.step': 'In {box}, the digit {digit} can only go in {count} cells, and they all ' +
      'lie on {line}. So {digit} must be on {line} inside {box}, and it is removed from the other cells ' +
      'of {line}.',
    'technique.boxLine.step': 'On {line}, the digit {digit} can only go in {count} cells, and they all ' +
      'lie in {box}. So {digit} must be on {line} inside {box}, and it is removed from the other cells of ' +
      '{box}.',
    'technique.nakedPair.step': 'In the {unitKind} {unit}, the two cells {cells} can only hold the digits ' +
      '{digits} between them. Those digits belong to these cells, so they are removed from the other ' +
      'cells of {unit}.',
    'technique.nakedTriple.step': 'In the {unitKind} {unit}, the three cells {cells} can only hold the ' +
      'digits {digits} between them. Those digits belong to these cells, so they are removed from the ' +
      'other cells of {unit}.',
    'technique.nakedQuad.step': 'In the {unitKind} {unit}, the four cells {cells} can only hold the ' +
      'digits {digits} between them. Those digits belong to these cells, so they are removed from the ' +
      'other cells of {unit}.',
    'technique.hiddenPair.step': 'In the {unitKind} {unit}, the digits {digits} can only go in the two ' +
      'cells {cells}. These cells must hold exactly those digits, so every other candidate is removed ' +
      'from them.',
    'technique.hiddenTriple.step': 'In the {unitKind} {unit}, the digits {digits} can only go in the ' +
      'three cells {cells}. These cells must hold exactly those digits, so every other candidate is ' +
      'removed from them.',
    'technique.hiddenQuad.step': 'In the {unitKind} {unit}, the digits {digits} can only go in the four ' +
      'cells {cells}. These cells must hold exactly those digits, so every other candidate is removed ' +
      'from them.',
    'technique.xWing.step': 'X-Wing on {digit}: in {baseUnits}, the digit {digit} can only go in ' +
      '{coverUnits}. The two {digit}s of the base lines fill both cover lines, so {digit} is removed from ' +
      'every other cell of {coverUnits}.',
    'technique.swordfish.step': 'Swordfish on {digit}: in {baseUnits}, the digit {digit} can only go in ' +
      '{coverUnits}. The three {digit}s of the base lines fill all three cover lines, so {digit} is ' +
      'removed from every other cell of {coverUnits}.',
    'technique.jellyfish.step': 'Jellyfish on {digit}: in {baseUnits}, the digit {digit} can only go in ' +
      '{coverUnits}. The four {digit}s of the base lines fill all four cover lines, so {digit} is removed ' +
      'from every other cell of {coverUnits}.',
    'technique.simpleColouring.step': 'Simple Colouring on {digit}: cells linked by "one or the other" ' +
      'are painted in two colours. Colour 1: {colour1}. Colour 2: {colour2}. Exactly one colour holds the ' +
      'digit, which removes {digit} from the cells that cannot be it.',
    'technique.simpleColouring.step.wrap': 'Simple Colouring on {digit} (colour clash): colour 1 is ' +
      '{colour1}, colour 2 is {colour2}. Two cells of colour {falseColour} see each other ({witness}), so ' +
      'that colour cannot be the true one. {digit} is removed from every cell of colour {falseColour}.',
    'technique.simpleColouring.step.trap': 'Simple Colouring on {digit} (colour trap): colour 1 is ' +
      '{colour1}, colour 2 is {colour2}. One of the two colours holds the digit, and a cell outside the ' +
      'chain sees both colours, so it cannot be {digit}. {digit} is removed from such cells.',
    'technique.xyWing.step': 'XY-Wing: the pivot {pivot} holds {digitX} or {digitY}; the pincer {pincer1} ' +
      'holds {digitX} or {digit}; the pincer {pincer2} holds {digitY} or {digit}. Whichever digit the ' +
      'pivot takes, one of the pincers must be {digit}, so {digit} is removed from every cell that sees ' +
      'both pincers.',
    'technique.xyzWing.step': 'XYZ-Wing: the pivot {pivot} holds {digitX}, {digitY} or {digit}; the ' +
      'pincer {pincer1} holds {digitX} or {digit}; the pincer {pincer2} holds {digitY} or {digit}. One of ' +
      'these three cells must be {digit}, so {digit} is removed from every cell that sees all three.',
    'technique.wWing.step': 'W-Wing: {cell1} and {cell2} both hold only {digitX} or {digit} and do not ' +
      'see each other. A strong link on {digitX} in {unit} ({link1} and {link2}) joins them, so one of ' +
      'the two cells must be {digit}. {digit} is removed from every cell that sees both.',
    'technique.uniqueRectangle.type1.step': 'Unique Rectangle: three corners hold only {digitX} and ' +
      '{digitY}. If {cell} held only those two as well, the puzzle would have two solutions. So {digitX} ' +
      'and {digitY} are removed from {cell}.',
    'technique.uniqueRectangle.type2.step': 'Unique Rectangle: two corners hold only {digitX} and ' +
      '{digitY}; the other two, {roof1} and {roof2}, also hold {digit}. To avoid two solutions, one of ' +
      'those two must be {digit}, so {digit} is removed from every cell that sees both.',
    'technique.forcingChain.step.endpoints': 'Forcing chain of {length} links: {chains}. If the first ' +
      'candidate is false, the last one is true, so at least one end of the chain is true. Candidates ' +
      'that see both ends are removed.',
    'technique.forcingChain.step.contradiction': 'Forcing chain of {length} links: {chains}. If the first ' +
      'candidate were true, some candidate would be both true and false, which is impossible. So the ' +
      'first candidate is false and is removed.',
    'technique.forcingChain.step.forced': 'Forcing chain of {length} links: {chains}. If the first ' +
      'candidate were false, some candidate would be both true and false, which is impossible. So the ' +
      'first candidate is true and is placed.',
    'technique.nishio.step': 'Trial and error (depth {depth}): if {label} were {digit}, simple deductions ' +
      'would end in a contradiction. So {digit} is removed from {label}.',
    'technique.cageCombo': 'Cage Sum Combination',
    'technique.cageCombo.step': 'A cage with sum {sum} over {size} cells ({cells}) can only be written ' +
      'with the digits {digits}. Every other candidate in it is impossible. A digit that every ' +
      'combination needs ({forced}) must be somewhere in the cage: it is placed when only one cell can ' +
      'still hold it, and otherwise removed from the other cells of any row, column or box that holds ' +
      'all of its possible places.',
    'technique.cageCombo.step.noForced': 'A cage with sum {sum} over {size} cells ({cells}) can only be ' +
      'written with the digits {digits}. Every other candidate in it is impossible.',
    'technique.ruleOf45': 'Rule of 45',
    'technique.ruleOf45.step': 'Rule of 45 on {units}: every unit holds the digits 1 to 9 once, so after ' +
      'subtracting the cages that lie entirely inside, the cells {cells} must add up to {sum}. Candidates ' +
      'that cannot reach that sum are removed.',
    'technique.ruleOf45.step.outie': 'Rule of 45 on {units}: every unit holds the digits 1 to 9 once, ' +
      'so the cages that lie inside or stick out of them cover the units plus some cells outside. Those ' +
      'cells {cells} must add up to {sum}. Candidates that cannot reach that sum are removed.',
    'technique.ruleOf45.place': 'Rule of 45 on {units}: after subtracting the cages that lie entirely ' +
      'inside, the last open cell {cell} has to make up the remaining {sum}, so it is {digit}.',
    'technique.ruleOf45.place.outie': 'Rule of 45 on {units}: the cages that lie inside or stick out of ' +
      'them cover the units plus some cells outside. The last open cell {cell} of those has to make up ' +
      'the remaining {sum}, so it is {digit}.',
    'technique.cageSplit': 'Cage Splitting',
    'technique.cageSplit.step': 'The cage with sum {sum} sticks out of {units} and splits in two: the ' +
      'cells {part} (inside) add up to {partSum} and can only use the digits {partDigits}; the cells ' +
      '{rest} (outside) add up to {restSum} and can only use the digits {restDigits}. Both parts belong ' +
      'to one cage, so they share no digit. Other candidates are removed.'
  });

  // Errors (the code of a GenerationError is the key after `error.`)

  add({
    'error.unknown': 'Something went wrong ({code}).',
    'error.unexpected': 'An unexpected error occurred: {message}',
    'error.budget.exceeded': 'The operation took longer than allowed and was stopped.',
    'error.budget.cancelled': 'The operation was cancelled.',
    'error.constraints.invalidExtension': 'A constraint extension is not valid (id: {id}).',
    'error.constraints.duplicateExtension': 'The constraint extension "{id}" is registered twice.',
    'error.dfs.invalidGivens': 'The given digits do not fit this board.',
    'error.dfs.invalidLimit': 'The solution limit "{limit}" is not valid.',
    'error.model.invalidSpec': 'The definition of the board is not valid.',
    'error.solver.invalidFinding': 'The technique {technique} returned an invalid deduction.',
    'error.solver.invalidOption': 'The option "{option}" of the logical solver is not valid.',
    'error.solver.unknownTechnique': 'Unknown solving technique "{id}".',
    'error.solver.invalidGivens': 'The given digits are not valid for the logical solver.',
    'error.solver.emptyFinding': 'The technique {technique} returned a deduction that changes nothing.',
    'error.solver.stateMutated': 'The technique {technique} modified the board state, which it must not do.',
    'error.solver.noEffect': 'The technique {technique} returned a deduction that has no effect.',
    'error.technique.invalidDef': 'The definition of the technique "{id}" is not valid.',
    'error.technique.duplicate': 'The technique "{id}" is registered twice.',
    'error.technique.unknown': 'Unknown technique "{id}".',
    'error.exchange.invalidToken': 'This link or code is not a valid puzzle. It may be incomplete: copy ' +
      'it again in full.',
    'error.exchange.tooLarge': 'This puzzle is too large to open.',
    'error.exchange.unsupportedEncoding': 'This browser cannot unpack the compressed puzzle code. Use a ' +
      'current browser, or open the puzzle file instead.',
    'error.exchange.invalidJson': 'The puzzle code does not contain a readable puzzle.',
    'error.exchange.invalidUrl': 'This is not an address that can be used for a puzzle link.'
  });
})(typeof self !== 'undefined' ? self : globalThis);
