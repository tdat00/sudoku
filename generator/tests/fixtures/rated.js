/**
 * Puzzles with a known difficulty, for validating `SG.difficulty.classify` (task T-2.9). Exposed as
 * SG.fixtures.rated = { entries, published, constructed }. Every puzzle has exactly one solution.
 *
 * Entry: { name, puzzle (81 chars, '.' = empty), label (a level of SG.difficulty.LEVELS), basis, note,
 *          solvableWith?, notSolvableWith? (technique ids) }
 *
 * Two kinds of labels, kept apart on purpose:
 *
 *  basis 'published'    Puzzles from tests/fixtures/classic.js whose difficulty is known from outside
 *                       this project: the example of the Wikipedia article, the famous "hardest sudoku"
 *                       puzzles of Arto Inkala and the Sudoku Players' Forum, and puzzles that the classic
 *                       fixtures name "easy" / "normal". The labels come from that outside knowledge, not
 *                       from this project's scorer, and were not changed to suit its output (the scorer
 *                       rates "classic-medium" one level below its name). A scorer is expected to land
 *                       within one level of them, not exactly on them, since no two raters agree on a
 *                       name like "hard".
 *
 *  basis 'constructed'  Puzzles made by SG.digger.generate and then frozen. The label is the level of
 *                       their score (rating v2, docs/report-v2/report-detailed.md section 4.3). Each one
 *                       also carries a certificate about techniques that holds whatever the scores, weights
 *                       and level bands are: `solvableWith` names a set of technique ids (`TECHNIQUE_SETS`)
 *                       that solves the puzzle and `notSolvableWith` a set that gets stuck (the solver is
 *                       run with exactly those techniques and `assumeUniqueness: false`, like the digging
 *                       oracle). A normal puzzle, for instance, is solved with singles, locked candidates
 *                       and subsets but not with singles and locked candidates alone; an nightmare one is not
 *                       solved without chains. The scorer must reproduce the label from the puzzle alone,
 *                       so these fixtures also catch a calibration that drifts away from the techniques.
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};
  SG.fixtures = SG.fixtures || {};

  /** Puzzle string of a puzzle in tests/fixtures/classic.js (loaded before this file). */
  function classic(name) {
    var found = SG.fixtures.classic.unique.filter(function (p) { return p.name === name; })[0];
    if (!found) throw new Error('rated fixtures: no classic puzzle named ' + name);
    return found.puzzle.replace(/0/g, '.');
  }

  var PUBLISHED = [
    {
      name: 'wikipedia-example',
      puzzle: classic('wikipedia-example'),
      label: 'easy',
      note: 'The example puzzle of the Wikipedia article on Sudoku; it falls to naked and hidden singles.'
    },
    {
      name: 'classic-easy',
      puzzle: classic('classic-easy'),
      label: 'easy',
      note: 'Named "classic-easy" in tests/fixtures/classic.js.'
    },
    {
      name: 'classic-easy-2',
      puzzle: classic('classic-easy-2'),
      label: 'easy',
      note: 'Named "classic-easy-2" in tests/fixtures/classic.js.'
    },
    {
      name: 'classic-medium',
      puzzle: classic('classic-medium'),
      label: 'normal',
      note: 'Named "classic-medium" in tests/fixtures/classic.js.'
    },
    {
      name: 'escargot',
      puzzle: classic('escargot'),
      label: 'hell2',
      note: 'Arto Inkala, "Escargot" (2006), published as one of the hardest puzzles of its time.'
    },
    {
      name: 'worlds-hardest-2012',
      puzzle: classic('worlds-hardest-2012'),
      label: 'hell2',
      note: 'Arto Inkala, the 2012 "world\'s hardest sudoku".'
    },
    {
      name: 'platinum-blonde',
      puzzle: classic('hard-platinum'),
      label: 'hell2',
      note: '"Platinum Blonde" of the Sudoku Players\' Forum, a standard benchmark for expert puzzles.'
    },
    {
      name: 'golden-nugget',
      puzzle: classic('hard-nugget'),
      label: 'hell2',
      note: '"Golden Nugget" of the Sudoku Players\' Forum, a standard benchmark for expert puzzles.'
    }
  ].map(function (p) {
    p.basis = 'published';
    return p;
  });

  /**
   * The technique sets of the certificates, each one the previous plus a family: explicit ids, so that a
   * certificate does not move when the weights or the level bands change.
   */
  var SINGLES = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine'];
  var LOCKED = SINGLES.concat(['pointing', 'boxLine']);
  var SUBSETS = LOCKED.concat(['nakedPair', 'hiddenPair', 'nakedTriple', 'hiddenTriple', 'nakedQuad',
    'hiddenQuad']);
  var FISH = SUBSETS.concat(['xWing', 'simpleColouring', 'swordfish', 'jellyfish']);
  var WINGS = FISH.concat(['xyWing', 'xyzWing', 'wWing', 'uniqueRectangle']);
  var CHAINS = WINGS.concat(['forcingChain', 'nishio']);
  var TECHNIQUE_SETS = { singles: SINGLES, locked: LOCKED, subsets: SUBSETS, fish: FISH, wings: WINGS,
    chains: CHAINS };

  /**
   * [level, puzzle, solvableWith, notSolvableWith] (names of TECHNIQUE_SETS). The level is the one of the
   * score (rating v2, docs/report-v2/report-detailed.md section 4.3): the puzzles that `generate` made for
   * 'master' with one wing each now score 879 to 940 and are labelled expert. The certificates are those
   * the puzzles were made with: a normal puzzle needs a subset (stuck with singles and locked candidates),
   * a hard one a fish, an expert one a wing, a nightmare one a chain.
   */
  var CONSTRUCTED_ROWS = [
    ['veryEasy', '...1...7.7....28.1.937..62591..7.532.5.9.6.4.847.2..69628..791.4.96....7.7...3...',
      'singles', null],
    ['veryEasy', '.64.58...7..91.86.98142.5...96.3.7.....5.9.....3.7.18...5.64398.38.97..2...38.61.',
      'singles', null],
    ['veryEasy', '45.8.932798...6.54.2..7..6.6.....215...6.1...145.....3.3..6..8.51.9...368691.3.72',
      'singles', null],
    ['easy', '31..7...8.28..154....95..1359...4...6.......4...7...5924..93....592..13.7...6..92',
      'locked', null],
    ['easy', '.1.9..8.......8153..2.1..9.3785.4..1...3.9...9..6.1385.4..3.7..8314.......7..5.3.',
      'locked', null],
    ['easy', '.23.....7.5.281..3..87.....84..1.96.2.1...4.8.35.4..71.....67..1..927.5.3.....82.',
      'locked', null],
    ['normal', '....25.7....3....6381...2....785.93.9.......5.38.496....9...5612....1....1.58....',
      'subsets', 'locked'],
    ['normal', '69....8.1...8....685..1.49....7...6.9.7.3.5.8.1...5....86.9..755....8...1.9....83',
      'subsets', 'locked'],
    ['normal', '..3.4.2...4......78..23...6..1..3.78.2.7.1.9.37.9..6..1...98..57......6...6.7.3..',
      'subsets', 'locked'],
    ['hard', '4.6..5..9.5.4.93....3........129..3...25.38...3..461........6....46.8.2.6..9..5.3',
      'fish', 'subsets'],
    ['hard', '...5.82....8.6..5..61.2.87...5..4..8..7.5.3..4..3..7...24.9.68..5..3.4....92.6...',
      'fish', 'subsets'],
    ['hard', '4....65...623.......38..2......47.8..1.....4..7.53......9..81.......349...72....3',
      'fish', 'subsets'],
    ['expert', '..8.....97..84....54.71.8...5..74......1.2......56..2...1.57.42....36..16.....3..',
      'wings', 'fish'],
    ['expert', '.5..19..61..8..2....9......37.1.....24..5..31.....4.67......7....1..5..37..42..9.',
      'wings', 'fish'],
    ['expert', '....25.6...46.73.....84..7.4.5...681.9.....4.768...9.3.4..81.....69.28...7.45....',
      'wings', 'fish'],
    ['nightmare', '.19.7....7....85..6..5.....1.59....8.84...96.9....32.5.....7..9..76....4....5.78.',
      'chains', 'wings'],
    ['nightmare', '..3....9.5..6..1...97.8...2....74..67..9.8..18..16....3...1.56...6..3..9.1....8..',
      'chains', 'wings'],
    ['nightmare', '.7..2..4.3..1.......16...57....5..9...2...5...1..6....56...87.......4..3.4..1..2.',
      'chains', 'wings']
  ];

  var counters = {};
  var CONSTRUCTED = CONSTRUCTED_ROWS.map(function (row) {
    counters[row[0]] = (counters[row[0]] || 0) + 1;
    return {
      name: 'constructed-' + row[0] + '-' + counters[row[0]],
      puzzle: row[1],
      label: row[0],
      basis: 'constructed',
      note: 'Made by SG.digger.generate and frozen; certificate: solved with the ' + row[2] + ' set' +
        (row[3] === null ? '' : ', stuck with the ' + row[3] + ' set') + '.',
      solvableWith: TECHNIQUE_SETS[row[2]].slice(),
      notSolvableWith: row[3] === null ? null : TECHNIQUE_SETS[row[3]].slice()
    };
  });

  SG.fixtures.rated = {
    entries: PUBLISHED.concat(CONSTRUCTED),
    published: PUBLISHED,
    constructed: CONSTRUCTED,
    techniqueSets: TECHNIQUE_SETS
  };
})();
