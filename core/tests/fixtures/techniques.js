/**
 * Fixtures for the logical techniques: for every technique of the classic ladder, two positions
 * where it fires (with the exact Finding) and positions where it must find nothing. Exposed as
 * SG.fixtures.techniques and exercised by tests/suites/techniques.test.js.
 *
 * Where the positions come from. They are real positions, not hand written ones. Each puzzle has exactly one
 * solution (it was dug from a random full grid with SG.digger.dig). A position is described the way
 * SG.techHelper builds it:
 *   after: [ids]  the position where the logical solver gets stuck when it may only use those techniques
 *                 (H.stateAfter). before(id) lists every technique that the ladder tries before id, so the
 *                 position is the first one in which id is reached; through(id) lists the techniques up to
 *                 and including id, so id has nothing left to do there.
 *   after: null   the position straight after entering the clues (peer elimination only), with the singles
 *                 still open when propagate is false (H.makeState). That is where the rare techniques (quads,
 *                 jellyfish, ...) have their patterns; they are almost never reached by a real solving path.
 * The expected Finding was recorded when the fixture was made and is compared exactly (as sets of
 * [cell, value] pairs, cells are indices 0..80). The assertions of SG.techHelper also check that the Finding
 * never contradicts the solution, so a fixture cannot "teach" a wrong deduction.
 *
 * Adding a technique to the ladder: add an entry for it here (2 positions where it fires, 1 where it finds
 * nothing), or the registry test of techniques.test.js says so. The LADDER list below is frozen on purpose:
 * a technique registered later must not silently change these positions, and a position must never be built
 * with `before` / `through` for an ID that is not in LADDER.
 *
 * Rating v3 history. The positions below are rating v2's: `historyV2.byId` keeps them as they were, with the
 * v2 `ladder` (jellyfish after the wings). The registry of rating v3 runs jellyfish before xyWing, so the
 * current order is its own list, `registryOrder`, which the registry test compares with the real registry.
 * `byId` (and `ids`) is the ACTIVE map: the historical one plus the explicit `CURRENT` entries, which replace
 * an ID's fixtures from now on without touching a v2 position. A later technique adds its entry to CURRENT,
 * built from explicit `after` lists or an initial real puzzle state. MS07b replaces the four chain IDs
 * (forcingChain 1..C links, forcingChainLong, nishio depth 1, nishioDeep) this way; MS08a adds skyscraper,
 * MS08b twoStringKite, MS08c emptyRectangle, MS09a finnedXWing, MS09b finnedSwordfish, MS10a remotePairs, MS10b
 * wxyzWing, MS11c bugPlusOne, MS12 xyChain, MS15b alsXz and MS16 sueDeCoq (MS11a and MS11b replace the
 * uniqueRectangle entry).
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};
  SG.fixtures = SG.fixtures || {};

  /** The ladder at the time the fixtures were made, cheapest technique first (frozen on purpose). */
  var LADDER = [
    'nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'pointing', 'boxLine', 'nakedPair', 'hiddenPair',
    'nakedTriple', 'hiddenTriple', 'nakedQuad', 'hiddenQuad', 'xWing', 'simpleColouring', 'swordfish',
    'xyWing', 'xyzWing', 'jellyfish', 'wWing', 'uniqueRectangle', 'forcingChain', 'nishio'
  ];

  /**
   * The 34 classic techniques in the order of the registry of rating v3 (cheapest first). The scoped cage and
   * inequality techniques are not classic. Differs from LADDER in the place of jellyfish and in the thirteen
   * techniques added since: skyscraper (MS08a), twoStringKite (MS08b), emptyRectangle (MS08c), finnedXWing
   * (MS09a), remotePairs (MS10a), finnedSwordfish (MS09b), wxyzWing (MS10b), bugPlusOne (MS11c), xyChain (MS12),
   * alsXz (MS15b), sueDeCoq (MS16) and the two chain windows forcingChainLong and nishioDeep (MS07b).
   */
  var REGISTRY_ORDER = [
    'nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'pointing', 'boxLine', 'nakedPair', 'hiddenPair',
    'nakedTriple', 'hiddenTriple', 'nakedQuad', 'hiddenQuad', 'xWing', 'skyscraper', 'twoStringKite', 'remotePairs',
    'simpleColouring', 'emptyRectangle', 'finnedXWing', 'swordfish', 'finnedSwordfish', 'jellyfish', 'xyWing',
    'xyzWing', 'wxyzWing', 'wWing', 'uniqueRectangle', 'bugPlusOne', 'xyChain', 'forcingChain', 'alsXz',
    'sueDeCoq', 'forcingChainLong', 'nishio', 'nishioDeep'
  ];

  /** The techniques the ladder tries before `id`: the position after them is where `id` is reached. */
  function before(id) {
    return LADDER.slice(0, LADDER.indexOf(id));
  }

  /** The techniques up to and including `id`: nothing is left for `id` to do after them. */
  function through(id) {
    return LADDER.slice(0, LADDER.indexOf(id) + 1);
  }

  var HISTORY_BY_ID = {
    nakedSingle: {
      positive: [
        {
          name: 'first nakedSingle on puzzle 1',
          puzzle: '4...528.6.5...4.1..7...895............7...3...1..29.6.....3.2.1..58.6............',
          after: before('nakedSingle'),
          propagate: true,
          expect: {
            placements: [[15, 7]],
            eliminations: []
          }
        },
        {
          name: 'first nakedSingle on puzzle 2',
          puzzle: '.4...........7.3.4..6.81....57..2...91....73......9..1..283..6......5...7...6..2.',
          after: before('nakedSingle'),
          propagate: true,
          expect: {
            placements: [[14, 6]],
            eliminations: []
          }
        }
      ],
      negative: [
        {
          name: 'nakedSingle has nothing left to do once the ladder through it is exhausted',
          puzzle: '2.18...69.......4.67....8...1..97...3....24....5....7....64....76..1832..3.......',
          after: through('nakedSingle'),
          propagate: true
        }
      ]
    },
    hiddenSingleBox: {
      positive: [
        {
          name: 'first hiddenSingleBox on puzzle 1',
          puzzle: '2.18...69.......4.67....8...1..97...3....24....5....7....64....76..1832..3.......',
          after: before('hiddenSingleBox'),
          propagate: true,
          expect: {
            placements: [[38, 7]],
            eliminations: []
          }
        },
        {
          name: 'first hiddenSingleBox on puzzle 2',
          puzzle: '4...528.6.5...4.1..7...895............7...3...1..29.6.....3.2.1..58.6............',
          after: before('hiddenSingleBox'),
          propagate: true,
          expect: {
            placements: [[75, 2]],
            eliminations: []
          }
        }
      ],
      negative: [
        {
          name: 'hiddenSingleBox has nothing left to do once the ladder through it is exhausted',
          puzzle: '2.18...69.......4.67....8...1..97...3....24....5....7....64....76..1832..3.......',
          after: through('hiddenSingleBox'),
          propagate: true
        }
      ]
    },
    hiddenSingleLine: {
      positive: [
        {
          name: 'first hiddenSingleLine on puzzle 1',
          puzzle: '2.18...69.......4.67....8...1..97...3....24....5....7....64....76..1832..3.......',
          after: before('hiddenSingleLine'),
          propagate: true,
          expect: {
            placements: [[4, 3]],
            eliminations: []
          }
        },
        {
          name: 'first hiddenSingleLine on puzzle 2',
          puzzle: '4...528.6.5...4.1..7...895............7...3...1..29.6.....3.2.1..58.6............',
          after: before('hiddenSingleLine'),
          propagate: true,
          expect: {
            placements: [[53, 7]],
            eliminations: []
          }
        }
      ],
      negative: [
        {
          name: 'hiddenSingleLine has nothing left to do once the ladder through it is exhausted',
          puzzle: '5.4...7...3..2.9489..........71....21...92......87..6.....5..9.2.84........2.1..4',
          after: through('hiddenSingleLine'),
          propagate: true
        }
      ]
    },
    pointing: {
      positive: [
        {
          name: 'first pointing on puzzle 1',
          puzzle: '5.4...7...3..2.9489..........71....21...92......87..6.....5..9.2.84........2.1..4',
          after: before('pointing'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[21, 5], [23, 5]]
          }
        },
        {
          name: 'first pointing on puzzle 2',
          puzzle: '....154........2..1.62..7...52..8.....79.23......54..8..3....9.5......6.7.......2',
          after: before('pointing'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[79, 8]]
          }
        }
      ],
      negative: [
        {
          name: 'pointing has nothing left to do once the ladder through it is exhausted',
          puzzle: '8......1.52......646.18.5.2...........32.916...2..3.94.............25..1..4.16..7',
          after: through('pointing'),
          propagate: true
        }
      ]
    },
    boxLine: {
      positive: [
        {
          name: 'first boxLine on puzzle 1',
          puzzle: '8......1.52......646.18.5.2...........32.916...2..3.94.............25..1..4.16..7',
          after: before('boxLine'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[33, 8], [34, 8], [51, 8]]
          }
        },
        {
          name: 'first boxLine on puzzle 2',
          puzzle: '..8...2...7.........1....84..6..254.....5.3...2.8...167.24..9...5...6.3.....3....',
          after: before('boxLine'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[67, 8], [77, 8]]
          }
        }
      ],
      negative: [
        {
          name: 'boxLine has nothing left to do once the ladder through it is exhausted',
          puzzle: '8......1.52......646.18.5.2...........32.916...2..3.94.............25..1..4.16..7',
          after: through('boxLine'),
          propagate: true
        }
      ]
    },
    nakedPair: {
      positive: [
        {
          name: 'first nakedPair on puzzle 1',
          puzzle: '8......1.52......646.18.5.2...........32.916...2..3.94.............25..1..4.16..7',
          after: before('nakedPair'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[57, 3], [57, 9], [66, 3], [66, 9]]
          }
        },
        {
          name: 'first nakedPair on puzzle 2',
          puzzle: '..8...2...7.........1....84..6..254.....5.3...2.8...167.24..9...5...6.3.....3....',
          after: before('nakedPair'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[11, 4], [47, 4], [47, 9]]
          }
        }
      ],
      negative: [
        {
          name: 'nakedPair has nothing left to do once the ladder through it is exhausted',
          puzzle: '8......1.52......646.18.5.2...........32.916...2..3.94.............25..1..4.16..7',
          after: through('nakedPair'),
          propagate: true
        }
      ]
    },
    hiddenPair: {
      positive: [
        {
          name: 'first hiddenPair on puzzle 1',
          puzzle: '8......1.52......646.18.5.2...........32.916...2..3.94.............25..1..4.16..7',
          after: before('hiddenPair'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[73, 9], [79, 2]]
          }
        },
        {
          name: 'first hiddenPair on puzzle 2',
          puzzle: '..785.1....4..1.8.1.2.4.3.6..1..5...9..4.6.....3...6.8...7..9........8.37.......1',
          after: before('hiddenPair'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[40, 2], [40, 7], [43, 2]]
          }
        }
      ],
      negative: [
        {
          name: 'hiddenPair has nothing left to do once the ladder through it is exhausted',
          puzzle: '8......1.52......646.18.5.2...........32.916...2..3.94.............25..1..4.16..7',
          after: through('hiddenPair'),
          propagate: true
        }
      ]
    },
    nakedTriple: {
      positive: [
        {
          name: 'first nakedTriple on puzzle 1',
          puzzle: '..8...2...7.........1....84..6..254.....5.3...2.8...167.24..9...5...6.3.....3....',
          after: before('nakedTriple'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[9, 3], [9, 5], [12, 3], [12, 5], [12, 9], [13, 9], [14, 3], [14, 5], [14, 9]]
          }
        },
        {
          name: 'first nakedTriple on puzzle 2',
          puzzle: '6..3.4.7.7...9.3.24.....9.....7.8.....4.5.......6.9.1...3............28.5124.....',
          after: before('nakedTriple'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[43, 2], [43, 3], [44, 3]]
          }
        }
      ],
      negative: [
        {
          name: 'nakedTriple has nothing left to do once the ladder through it is exhausted',
          puzzle: '8......1.52......646.18.5.2...........32.916...2..3.94.............25..1..4.16..7',
          after: through('nakedTriple'),
          propagate: true
        }
      ]
    },
    hiddenTriple: {
      positive: [
        {
          name: 'first hiddenTriple on puzzle 1',
          puzzle: '..19.2.3.93..6.7..5.4.......1.7.4..9...18...53...............7.6.2........3...64.',
          after: before('hiddenTriple'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[46, 5], [46, 9], [51, 2], [52, 2], [52, 6]]
          }
        },
        {
          name: 'first hiddenTriple on puzzle 2',
          puzzle: '............67..21.25...4.3.6.3.5.42..........3...81..9..........8..3.751..2..3..',
          after: before('hiddenTriple'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[57, 7], [58, 6], [76, 9]]
          }
        }
      ],
      negative: [
        {
          name: 'hiddenTriple has nothing left to do once the ladder through it is exhausted',
          puzzle: '8......1.52......646.18.5.2...........32.916...2..3.94.............25..1..4.16..7',
          after: through('hiddenTriple'),
          propagate: true
        }
      ]
    },
    nakedQuad: {
      positive: [
        {
          name: 'first nakedQuad on puzzle 1',
          puzzle: '.4....91.85...2..4..14.....18....4.....15.83.7...9....37...6......9.57....6......',
          after: before('nakedQuad'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[26, 2], [26, 8], [53, 2], [53, 6]]
          }
        },
        {
          name: 'first nakedQuad on puzzle 2',
          puzzle: '..3.4.....19.56...2...1.5.632..........6.1...75..9..........2.94...85.......67..4',
          after: before('nakedQuad'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[16, 3], [16, 7], [52, 8]]
          }
        }
      ],
      negative: [
        {
          name: 'nakedQuad has nothing left to do once the ladder through it is exhausted',
          puzzle: '8......1.52......646.18.5.2...........32.916...2..3.94.............25..1..4.16..7',
          after: through('nakedQuad'),
          propagate: true
        }
      ]
    },
    hiddenQuad: {
      positive: [
        {
          name: 'first hiddenQuad on puzzle 1',
          puzzle: '67.539....4....9.8.1.......3..8.1.......52.93..4...2...96.45...4321....5.....7.3.',
          after: null,
          propagate: false,
          expect: {
            placements: [],
            eliminations: [[76, 8], [78, 1], [78, 8], [80, 1]]
          }
        },
        {
          name: 'first hiddenQuad on puzzle 2',
          puzzle: '..3....65.6.3..2....4.9.1..9..2..6..72..8...9..........7...6..3.....4...64.51....',
          after: null,
          propagate: false,
          expect: {
            placements: [],
            eliminations: [[67, 2], [77, 2]]
          }
        }
      ],
      negative: [
        {
          name: 'hiddenQuad has nothing left to do once the ladder through it is exhausted',
          puzzle: '8......1.52......646.18.5.2...........32.916...2..3.94.............25..1..4.16..7',
          after: through('hiddenQuad'),
          propagate: true
        }
      ]
    },
    xWing: {
      positive: [
        {
          name: 'first xWing on puzzle 1',
          puzzle: '9.2.....8......1..41.85..39.....8.....3.....78..6.45.2...29..1..5...........614..',
          after: before('xWing'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[5, 7]]
          }
        },
        {
          name: 'first xWing on puzzle 2',
          puzzle: '..4.9...6.....52...3..1..78...6.3..49.6..1..7...7.....5....8.3..4.........1...6.2',
          after: before('xWing'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[9, 6]]
          }
        }
      ],
      negative: [
        {
          name: 'xWing has nothing left to do once the ladder through it is exhausted',
          puzzle: '8......1.52......646.18.5.2...........32.916...2..3.94.............25..1..4.16..7',
          after: through('xWing'),
          propagate: true
        }
      ]
    },
    simpleColouring: {
      positive: [
        {
          name: 'first simpleColouring on puzzle 1',
          puzzle: '8......1.52......646.18.5.2...........32.916...2..3.94.............25..1..4.16..7',
          after: before('simpleColouring'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[34, 5], [62, 5]]
          }
        },
        {
          name: 'first simpleColouring on puzzle 2',
          puzzle: '...8..9.1.....52..4.396.....1.......6.8.1...77.....4..85........7......9...7..835',
          after: before('simpleColouring'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[76, 4]]
          }
        }
      ],
      negative: [
        {
          name: 'simpleColouring has nothing left to do once the ladder through it is exhausted',
          puzzle: '....154........2..1.62..7...52..8.....79.23......54..8..3....9.5......6.7.......2',
          after: through('simpleColouring'),
          propagate: true
        }
      ]
    },
    swordfish: {
      positive: [
        {
          name: 'first swordfish on puzzle 1',
          puzzle: '........6.1.672..4....39871..2....4.......1..34..61.28....8.53.93.......6........',
          after: before('swordfish'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[1, 5], [3, 5], [11, 5], [30, 5], [37, 5], [38, 5], [39, 5], [66, 5]]
          }
        },
        {
          name: 'first swordfish on puzzle 2',
          puzzle: '..4...87...1.65...9.......2..9.2...3....5...4458..7.9.2.5..9.4.............14....',
          after: before('swordfish'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[63, 8], [68, 8]]
          }
        }
      ],
      negative: [
        {
          name: 'swordfish has nothing left to do once the ladder through it is exhausted',
          puzzle: '....154........2..1.62..7...52..8.....79.23......54..8..3....9.5......6.7.......2',
          after: through('swordfish'),
          propagate: true
        }
      ]
    },
    xyWing: {
      positive: [
        {
          name: 'first xyWing on puzzle 1',
          puzzle: '....154........2..1.62..7...52..8.....79.23......54..8..3....9.5......6.7.......2',
          after: before('xyWing'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[26, 9]]
          }
        },
        {
          name: 'first xyWing on puzzle 2',
          puzzle: '....34..2...5....8.8471.....1....5....3....71.7.....6..4..25...73...6.8.16.....2.',
          after: before('xyWing'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[24, 9]]
          }
        }
      ],
      negative: [
        {
          name: 'xyWing has nothing left to do once the ladder through it is exhausted',
          puzzle: '2.6...8.......357...59....1...2..41..5..8.3..1...4...6.2..157...8..........7...6.',
          after: through('xyWing'),
          propagate: true
        }
      ]
    },
    xyzWing: {
      positive: [
        {
          name: 'first xyzWing on puzzle 1',
          puzzle: '3.1..7..8.....6.......4..958.2.3..5..5.6.......38.......45...67.......4.9...1.8..',
          after: before('xyzWing'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[42, 1], [51, 1]]
          }
        },
        {
          name: 'first xyzWing on puzzle 2',
          puzzle: '.1...5...6..93.1...7......3.2.....48..5...9...3..8.7..7.4..8...2..69....3..57.6..',
          after: before('xyzWing'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[80, 1]]
          }
        }
      ],
      negative: [
        {
          name: 'xyzWing has nothing left to do once the ladder through it is exhausted',
          puzzle: '2.6...8.......357...59....1...2..41..5..8.3..1...4...6.2..157...8..........7...6.',
          after: through('xyzWing'),
          propagate: true
        }
      ]
    },
    jellyfish: {
      positive: [
        {
          name: 'first jellyfish on puzzle 1',
          puzzle: '....64.38...3..5.6.....2..73.7...1......4....6.1.8....1..7...5...6.5.781.........',
          after: before('jellyfish'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[9, 2], [11, 2], [72, 2], [74, 2], [75, 2]]
          }
        },
        {
          name: 'first jellyfish on puzzle 2',
          puzzle: '63..9..1.......4.3........5.5.963.7...357......7..1...7.1.......8.2..1..4...58...',
          after: null,
          propagate: false,
          expect: {
            placements: [],
            eliminations: [[12, 1], [21, 1]]
          }
        }
      ],
      negative: [
        {
          name: 'jellyfish has nothing left to do once the ladder through it is exhausted',
          puzzle: '2.6...8.......357...59....1...2..41..5..8.3..1...4...6.2..157...8..........7...6.',
          after: through('jellyfish'),
          propagate: true
        }
      ]
    },
    wWing: {
      positive: [
        {
          name: 'first wWing on puzzle 1',
          puzzle: '...........4..7.8..7.93...5...2...43..3...7.21....8.....7.6.9...3...1.58........6',
          after: before('wWing'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[9, 5]]
          }
        },
        {
          name: 'first wWing on puzzle 2',
          puzzle: '3.1..7..8.....6.......4..958.2.3..5..5.6.......38.......45...67.......4.9...1.8..',
          after: before('wWing'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[33, 1]]
          }
        }
      ],
      negative: [
        {
          name: 'wWing has nothing left to do once the ladder through it is exhausted',
          puzzle: '2.6...8.......357...59....1...2..41..5..8.3..1...4...6.2..157...8..........7...6.',
          after: through('wWing'),
          propagate: true
        }
      ]
    },
    uniqueRectangle: {
      positive: [
        {
          name: 'first uniqueRectangle on puzzle 1',
          puzzle: '....84...7.81.3......5...3...........4.2...18..7.6..59.....6.942....5..641.......',
          after: before('uniqueRectangle'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[33, 4], [33, 6]]
          }
        },
        {
          name: 'first uniqueRectangle on puzzle 2',
          puzzle: '.63.1....8.....69..4.3...5.....8....3.61.......4...7....9.....5...27.9..42593...8',
          after: before('uniqueRectangle'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[32, 4], [32, 7]]
          }
        }
      ],
      negative: [
        {
          name: 'uniqueRectangle has nothing left to do once the ladder through it is exhausted',
          puzzle: '2.6...8.......357...59....1...2..41..5..8.3..1...4...6.2..157...8..........7...6.',
          after: through('uniqueRectangle'),
          propagate: true
        }
      ]
    },
    forcingChain: {
      positive: [
        {
          name: 'first forcingChain on puzzle 1',
          puzzle: '2.6...8.......357...59....1...2..41..5..8.3..1...4...6.2..157...8..........7...6.',
          after: before('forcingChain'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[70, 9]]
          }
        },
        {
          name: 'first forcingChain on puzzle 2',
          puzzle: '.6125...3..5.......9...81.....8...469....672.....3..8..7.3......5....6..6.....234',
          after: before('forcingChain'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[12, 7]]
          }
        }
      ],
      negative: [
        {
          name: 'forcingChain has nothing left to do once the ladder through it is exhausted',
          puzzle: '2.6...8.......357...59....1...2..41..5..8.3..1...4...6.2..157...8..........7...6.',
          after: through('forcingChain'),
          propagate: true
        }
      ]
    },
    nishio: {
      positive: [
        {
          name: 'first nishio on puzzle 1',
          puzzle: '2.6...8.......357...59....1...2..41..5..8.3..1...4...6.2..157...8..........7...6.',
          after: before('nishio'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[4, 7]]
          }
        },
        {
          name: 'first nishio on puzzle 2',
          puzzle: '.6125...3..5.......9...81.....8...469....672.....3..8..7.3......5....6..6.....234',
          after: before('nishio'),
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[6, 4]]
          }
        }
      ],
      negative: [
        {
          name: 'nishio finds nothing on a board where every candidate is still possible (the empty board)',
          puzzle: '.................................................................................',
          after: null,
          propagate: false
        }
      ]
    }
  };

  /** Positions where no technique of the ladder finds anything. */
  var NOTHING_TO_FIND = [
    { name: 'the empty board', puzzle: new Array(82).join('.'), after: null, propagate: false }
  ];

  /**
   * Explicit positions of the chain IDs under rating v3 (MS07b). The arrays are copied lists of registered ids,
   * so that a technique registered later cannot move a position: the techniques below the chain group (in the
   * order of the registry) and xyChain (MS12, order 186), then forcingChain, alsXz (MS15b, order 194),
   * sueDeCoq (MS16, order 196), forcingChainLong and nishio, one after the other. Each position is where the
   * solver, allowed only the ids of its list, gets stuck, which is where the next ID is reached.
   */
  var BELOW_CHAINS = [
    'nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'pointing', 'boxLine', 'nakedPair', 'hiddenPair',
    'nakedTriple', 'hiddenTriple', 'nakedQuad', 'hiddenQuad', 'xWing', 'skyscraper', 'twoStringKite', 'remotePairs',
    'simpleColouring', 'emptyRectangle', 'finnedXWing', 'swordfish', 'finnedSwordfish', 'jellyfish', 'xyWing',
    'xyzWing', 'wxyzWing', 'wWing', 'uniqueRectangle', 'bugPlusOne', 'xyChain'
  ];
  var THROUGH_SHORT_CHAIN = BELOW_CHAINS.concat(['forcingChain']);
  var THROUGH_ALS = THROUGH_SHORT_CHAIN.concat(['alsXz']);
  var THROUGH_SDC = THROUGH_ALS.concat(['sueDeCoq']);
  var THROUGH_LONG_CHAIN = THROUGH_SDC.concat(['forcingChainLong']);
  var THROUGH_NISHIO = THROUGH_LONG_CHAIN.concat(['nishio']);

  // Where skyscraper is reached under rating v3 (MS08a): the techniques before it in the registry, and the same
  // plus itself. Explicit copies, so that a technique registered later cannot move a position.
  var BELOW_SKYSCRAPER = [
    'nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'pointing', 'boxLine', 'nakedPair', 'hiddenPair',
    'nakedTriple', 'hiddenTriple', 'nakedQuad', 'hiddenQuad', 'xWing'
  ];
  var THROUGH_SKYSCRAPER = BELOW_SKYSCRAPER.concat(['skyscraper']);
  // The position where xWing itself is reached (a copy of the ids before it).
  var BEFORE_XWING = BELOW_SKYSCRAPER.slice(0, BELOW_SKYSCRAPER.indexOf('xWing'));

  // Where twoStringKite is reached (MS08b): the techniques before it in the registry (through skyscraper), and
  // the same plus itself.
  var BELOW_KITE = THROUGH_SKYSCRAPER.slice();
  var THROUGH_KITE = BELOW_KITE.concat(['twoStringKite']);

  // Where remotePairs is reached (MS10a, order 116 under RP-01): the techniques before it in the registry (through
  // twoStringKite), and the same plus itself.
  var BELOW_RP = THROUGH_KITE.slice();
  var THROUGH_RP = BELOW_RP.concat(['remotePairs']);

  // Where emptyRectangle is reached (MS08c): the techniques before it in the registry (through simpleColouring,
  // which follows remotePairs since MS10a), and the same plus itself.
  var BELOW_ER = THROUGH_RP.concat(['simpleColouring']);
  var THROUGH_ER = BELOW_ER.concat(['emptyRectangle']);

  // Where finnedXWing is reached (MS09a): the techniques before it in the registry (through emptyRectangle), and
  // the same plus itself.
  var BELOW_FIN = THROUGH_ER.slice();
  var THROUGH_FIN = BELOW_FIN.concat(['finnedXWing']);

  // Where finnedSwordfish is reached (MS09b): the techniques before it in the registry (through swordfish), and the
  // same plus itself. The position through finnedXWing is where swordfish is reached.
  var BELOW_FSF = THROUGH_FIN.concat(['swordfish']);
  var THROUGH_FSF = BELOW_FSF.concat(['finnedSwordfish']);

  // Where wxyzWing is reached (MS10b, order 155): the techniques before it in the registry (through xyzWing), and
  // the same plus itself. Explicit lists, so that a technique registered later cannot move a position.
  var BELOW_WXYZ = THROUGH_FSF.concat(['jellyfish', 'xyWing', 'xyzWing']);
  var THROUGH_WXYZ = BELOW_WXYZ.concat(['wxyzWing']);

  // Where uniqueRectangle is reached (MS11a): the techniques before it in the registry (through wWing), and the same
  // plus itself. Explicit lists, so that a technique registered later cannot move a position.
  var BELOW_UR = THROUGH_WXYZ.concat(['wWing']);
  var THROUGH_UR = BELOW_UR.concat(['uniqueRectangle']);

  // Where bugPlusOne is reached (MS11c, order 182): the techniques before it in the registry (through
  // uniqueRectangle, whose four subtypes keep their priority), and the same plus itself. Explicit lists, so that a
  // technique registered later cannot move a position.
  var BELOW_BUG = THROUGH_UR.slice();
  var THROUGH_BUG = BELOW_BUG.concat(['bugPlusOne']);

  // Where xyChain is reached (MS12, order 186): the techniques before it in the registry (through bugPlusOne, which
  // runs on its own uniqueness assumption), and the same plus itself. Explicit lists, so that a technique registered
  // later cannot move a position.
  var BELOW_XY = THROUGH_BUG.slice();
  var THROUGH_XY = BELOW_XY.concat(['xyChain']);

  // Real unique puzzles. The first two are the puzzles of the v2 chain fixtures; the next three are famous
  // puzzles of tests/fixtures/classic.js; the last three are minimal puzzles dug by SG.testkit.dig from the
  // seeded stream 161 (fork 'minimal.<i>'): #24, #730 and #155. Under the selected C = 4 the position where
  // forcingChain (grouped since MS13c) is stuck has a first long chain of 5 (#24 and #155, the latter with
  // groups) and 6 links (#730), which are the first proofs of forcingChainLong. #379 (8 links once forcingChain
  // had exhausted every chain of up to 6 links, until MS13c) is solved by the grouped ladder before it is stuck:
  // #730 is the lowest index of the stream whose stuck position has a 6-link proof of forcingChainLong with
  // no group and no cap (`fixture-scan.js` of the MS13c evidence, indices 0 to 3999).
  var V2_PUZZLE_1 = '2.6...8.......357...59....1...2..41..5..8.3..1...4...6.2..157...8..........7...6.';
  var V2_PUZZLE_2 = '.6125...3..5.......9...81.....8...469....672.....3..8..7.3......5....6..6.....234';
  var ESCARGOT = '1....7.9..3..2...8..96..5....53..9...1..8...26....4...3......1..4......7..7...3..';
  var HARD_B = '..53.....8......2..7..1.5..4....53...1..7...6..32...8..6.5....9..4....3......97..';
  var PLATINUM = '.......12........3..23..4....18....5.6..7.8.......9.....85.....9...4.5..47...6...';
  var WORLDS_HARDEST = '8..........36......7..9.2...5...7.......457.....1...3...1....68..85...1..9....4..';
  var NUGGET = '.......39.....1..5..3.5.8....8.9...6.7...2...1..4.......9.8..5..2....6..4..7.....';
  var DUG_24 = '..7..1..6.8....1..5..6.78.3..65..7.......8..2.9..6....459........2...5......1..9.';
  var DUG_730 = '.98....2......1.8..4..7.3..3.5.....8..98.3......2.45.........526..4...7..3....1..';
  var DUG_155 = '...284.....51..83.....53....9.........8.....6.6..351.437.....6....4.2..88.......7';

  // Real unique puzzles of the skyscraper fixtures (MS08a). SKY_ROWS is 'constructed-hard-1' of
  // tests/fixtures/rated.js (dug by SG.digger.generate, then frozen): two rows with two candidates of digit 1.
  // SKY_COLS is puzzle 26 (counting from 0) of the seeded corpus of H.randomStatesWithKnownSolution(classic9,
  // seed 20260101), the one of the states #104-#107 of the sweep of techniques.test.js: two columns with two
  // candidates of digit 5. SKY_SPARE is 'constructed-hard-3', a third real position for the soundness
  // supplements. X_WING is the puzzle of the first v2 xWing fixture (its position holds a genuine X-Wing) and
  // COLOURING that of the v2 simpleColouring negative.
  var SKY_ROWS = '4.6..5..9.5.4.93....3........129..3...25.38...3..461........6....46.8.2.6..9..5.3';
  var SKY_COLS = '.374.12...4...3........91.3..4...915...........27.........6.7..82........592...8.';
  var SKY_SPARE = '4....65...623.......38..2......47.8..1.....4..7.53......9..81.......349...72....3';
  var X_WING = '9.2.....8......1..41.85..39.....8.....3.....78..6.45.2...29..1..5...........614..';
  var COLOURING = '....154........2..1.62..7...52..8.....79.23......54..8..3....9.5......6.7.......2';

  // Real unique puzzles of the twoStringKite fixtures (MS08b). The kite positives are HARD_B (a famous puzzle
  // of tests/fixtures/classic.js, digit 5, row R6 and column C8 bridged in box 6) and KITE_SEEDED, state #232
  // (puzzle 58) of the seeded corpus of H.randomStatesWithKnownSolution(classic9, seed 99), which the 1200-state
  // sweep of tech-fish.test.js shares (digit 5, row R9 and column C2 bridged in box 7). KITE_SPARE is state #48
  // (puzzle 12) of the corpus of seed 20260101, a third real position for the soundness supplements. ESCARGOT
  // (a famous puzzle) is the negative where a row pair and a column pair share the cell R5C3: the cell R6C8 sees
  // both free ends, and it holds the digit 3. SKY_ONLY is state #168 (puzzle 42) of the corpus of seed 20260101:
  // its position before skyscraper has a skyscraper (rows R3 and R4) and no kite.
  var KITE_SEEDED = '........4.76....8...51...2.6..39....2..6....3.3......28....4.363...7......9.1.4..';
  var KITE_SPARE = '76.....8.........4.....32...5....8.6...1..97...15.....4...8.69.82..9.4.....7.....';
  var SKY_ONLY = '......6..8.21.....3.7..8..9.314.6..........5...47..163..6..........12.7.4..8..5.2';

  // Real unique puzzles of the emptyRectangle fixtures (MS08c). ER_RATED is 'constructed-nightmare-2' of
  // tests/fixtures/rated.js (digit 5, box 7, its row arm R8C2 and column arm R9C3, the pair of row R4). ER_SEEDED
  // is state #512 (puzzle 128) of the seeded corpus of H.randomStatesWithKnownSolution(classic9, seed 99), which
  // the 1200-state sweep of tech-fish.test.js shares (digit 6, box 1, the arms R2C3 and R3C1, the pair of column
  // C8). ER_SPARE is state #608 (puzzle 152) of the same corpus, a third real position for the soundness
  // supplements. ER_GENERAL is state #280 (puzzle 70) of the corpus of seed 20260101: its position has a general
  // empty rectangle (digit 1, box 5, a candidate at the intersection R6C6) that removes R9C6, which the
  // restricted form does not know. KITE_ONLY is puzzle 1 of the v2 swordfish fixture: its position before
  // twoStringKite has a kite and no empty rectangle.
  var ER_RATED = '..3....9.5..6..1...97.8...2....74..67..9.8..18..16....3...1.56...6..3..9.1....8..';
  var ER_SEEDED = '..92......1......8.7..9.24..8.....53....386..5.....1.......2...1.2..583.8....4..1';
  var ER_SPARE = '.....1.7.25.......17...5......9....6.96.8...7.......2.....678..4...2..5..8.5..6.9';
  var ER_GENERAL = '48..1....5....7.....125..9....7.84.....9..5.6.7........12....47......86.894....3.';
  var KITE_ONLY = '........6.1.672..4....39871..2....4.......1..34..61.28....8.53.93.......6........';

  // Real unique puzzles of the finnedXWing fixtures (MS09a). FIN_RATED is 'constructed-nightmare-1' of
  // tests/fixtures/rated.js (digit 2, rows R5 and R8, covers C1 and C5, the fin R8C6). FIN_SASHIMI is state #48
  // (puzzle 12) of the seeded corpus of H.randomStatesWithKnownSolution(classic9, seed 20260101), which is also
  // KITE_SPARE (digit 5, columns C1 and C7 on the covers R1 and R9: the column C1 has only the cell R9C1 on the
  // covers, so it is a sashimi, and the two fins R2C1 and R3C1 lie in box 1). FIN_SPARE is state #16 (puzzle 4) of the
  // same corpus, a third real position for the soundness supplements (digit 3, rows R5 and R7, two fins in box 9).
  // FIN_ORDINARY is state #32 (puzzle 8) of that corpus: its position before xWing has an ordinary X-Wing (digit 6,
  // rows R2 and R7 on the covers C1 and C4) and no finned fish, the neighbour boundary: an ordinary fish is no finned
  // fish. KITE_ONLY (above) is the negative with a genuine kite and no finned fish.
  var FIN_RATED = '.19.7....7....85..6..5.....1.59....8.84...96.9....32.5.....7..9..76....4....5.78.';
  var FIN_SASHIMI = '76.....8.........4.....32...5....8.6...1..97...15.....4...8.69.82..9.4.....7.....';
  var FIN_SPARE = '....41.9...29...5.........87.5..9.4.....7...693...4....4.8.........25.17..6.....9';
  var FIN_ORDINARY = '.....3.......89172.......3.4....7...81....75..6.9....4..2.31....83.9..61.7.4.....';

  // Real unique puzzles of the finnedSwordfish fixtures (MS09b). The first positive is ER_RATED, the puzzle of
  // 'constructed-nightmare-2' of tests/fixtures/rated.js: its position through swordfish has a finned Swordfish
  // (digit 3, rows R2, R5 and R9 on the covers C5, C8 and C9, the fin R5C7, two targets). FSF_SPARSE is state #512
  // (puzzle 128) of the seeded corpus of H.randomStatesWithKnownSolution(classic9, seed 4242): digit 9, rows R1, R2
  // and R5 on the covers C1, C6 and C9, the row R1 has a single body cell (R1C9) and the fin R1C4; FSF_SPARE is
  // state #160 (puzzle 40) of the corpus of seed 99, a third real position for the soundness supplements (digit 9,
  // columns C3, C5 and C7). FSF_ORDINARY is state #416 (puzzle 104) of the corpus of seed 777: its position through
  // finnedXWing has a genuine ordinary Swordfish (digit 2, rows R3, R6 and R8 on the covers C6, C7 and C8) and no
  // finned Swordfish, the neighbour boundary: an ordinary fish is no finned fish. FIN_SPARE (above) is the negative
  // whose position before finnedXWing has a finned X-Wing and no finned Swordfish.
  var FSF_SPARSE = '.3.....2..7.4....8..853.7....715......5...2......9..17...62...5...8.1..416.......';
  var FSF_SPARE = '.6.8..2....36...8.9....3.4.5.278........6.59.7.......2.3.5......57.1.6.....3.7...';
  var FSF_ORDINARY = '32.7.......6219..5..9.8..........1.6......87.8...5..3..7.8.5...5.896.....3.......';
  // Two real puzzles of the Player's help catalogue sources (classic 9 x 9, unique solution), used as
  // sueDeCoq supplements at their first positions (MS16).
  var SDC_HELP_PAIR = '6....2..4......9....3.7521..9.1.48....4...1....58.7.3..6142.5....2......9..5....2';
  var SDC_HELP_QUAD = '3..7.5....5.....6.72...8.5.2..9...1.61..5..98.7...1..6.9.4...71.6.....3....3.9..5';

  // Real unique puzzles of the remotePairs fixtures (MS10a), the puzzles of the seeded corpus of
  // H.randomStatesWithKnownSolution(classic9, seed 777) (dug by SG.testkit.dig, unique by construction), named by
  // their index in it. The positives are first positions (after: null, singles used up), like the rare quads and the
  // jellyfish of the v2 fixtures: they are direct-finder evidence. At the registered order 116 (RP-01 / S-OD9) the
  // registry does reach a remote pair, but rarely: 51 of 30,000 dug puzzles of seed 4242 hold one at the position below
  // it and 45 of 20,000 complete solves use it (the normal-hint example of the help catalogue is the first of them,
  // MS10a evidence). RP_FIRST is puzzle 12 (digit pair 4 and 6, the chain R5C2, R5C3, R9C3, R9C6 of three edges, R5C6
  // has no 6 and loses the 4); RP_LONG is puzzle 512 (digit pair 6 and 7, six cells and five edges R3C7 ... R7C4,
  // R7C7 loses both). RP_SECOND, RP_THIRD and RP_FOURTH (puzzles 774, 22 and 100) are three more
  // real positions for the soundness supplements (a chain of five edges and two of three). V2_PUZZLE_1 (above) is the
  // negative whose position before nakedPair has a naked pair and no remote pair; COLOURING (above) the negative whose
  // position through remotePairs has nothing left for it.
  var RP_FIRST = '..5..9..2.8.....4.4..8..76.327..8.9....9..81.......6......1....1.25.....95.3.....';
  var RP_LONG = '..5.6..2.24...1....134.9......5..3....127..6.....1.5..4....8..1......8..9....5...';
  var RP_SECOND = '....149....6.2.75....8......4.7.....3............8..6.2....3.18.9.2..4...7.....3.';
  var RP_THIRD = '......4.9.76.9.......84.7....2......3...69..4....1568..8.5..1..6.9......1....8...';
  var RP_FOURTH = '..8....1.3...12..5..5...874...48...3.9.1..5..4.6.7.....8...7.2.1........7.3......';
  // The position before nakedPair: the singles and the locked candidates.
  var BEFORE_NAKED_PAIR = BELOW_SKYSCRAPER.slice(0, BELOW_SKYSCRAPER.indexOf('nakedPair'));

  // Real unique puzzles of the wxyzWing fixtures (MS10b), the puzzles of the seeded corpus of
  // H.randomStatesWithKnownSolution(classic9, seed 4242) (dug by SG.testkit.dig, unique by construction; the puzzle
  // of index i is the state #4i), named by their index. The positives are the positions where the registry reaches
  // wxyzWing (after: BELOW_WXYZ, every technique before it exhausted): it is reached often, 3,522 of 30,000 dug
  // puzzles of seed 4242 hold one there and 3,323 of 20,000 complete solves use it (MS10b evidence). WX_FIRST is
  // puzzle 140 (the digits 3, 4, 7 and 9 in R1C2, R1C3, R1C9 and R2C8, only the 4 is not restricted, held by R1C2 and
  // R2C8; R2C1 and R2C2 lose it); WX_THREE is puzzle 187 (the digits 1, 4, 7 and 9 in R2C7, R6C7, R8C7 and R8C9, the
  // 4 held by three cells, R9C7 sees all three). WX_SECOND, WX_THIRD and WX_FOURTH (puzzles 161, 105 and 232) are three
  // more real positions for the soundness supplements. WX_OPEN (puzzle 30) is the negative whose position through
  // wxyzWing still has 47 open cells and nothing left for it. WX_QUAD (puzzle 116) is the neighbour's negative: its
  // position before nakedQuad has a genuine naked quad (four digits that are all restricted, so no digit is left to
  // remove) and no WXYZ-Wing.
  var WX_FIRST = '6..5.2.1...5..69.2.7........6...4.58......2......3...4..2.8..3..1.....8...4.5.7.9';
  var WX_THREE = '46.1..59....6.5.2.....7....6..8......397...58..5..9..62.4.6.8...8.21.....96.8....';
  var WX_SECOND = '9..28.3.6...5.........962..6...7....2...1459..95...7..5...2...3...3..9...83......';
  var WX_THIRD = '..6.87...79.5.1......4..2..54.6.938.....4..9..13..54...75..28.........2...9.6..3.';
  var WX_FOURTH = '..23.6....5.1..4..8........1.5.....79...2.1.....8...4...3..5.9..8..9..15.7....6..';
  var WX_OPEN = '.4..76...8........2..9......8......1...3....4..5.2..69......6326.1..5....9...4.8.';
  var WX_QUAD = '2..5..6.94..6.........2...4..78.3.2.1........62...9...5...8.4....8.1...7.6......8';
  // The position before nakedQuad: the singles, the locked candidates, the naked and hidden pairs and triples.
  var BEFORE_NAKED_QUAD = BELOW_SKYSCRAPER.slice(0, BELOW_SKYSCRAPER.indexOf('nakedQuad'));

  // Real unique puzzles of the uniqueRectangle fixtures (MS11a), the puzzles of the seeded corpus of
  // H.randomStatesWithKnownSolution(classic9, seed 4242) (dug by SG.testkit.dig, unique by construction; the puzzle
  // of index i is the state #4i), named by their index. The positions are where the registry reaches uniqueRectangle
  // (after: BELOW_UR, every technique before it exhausted) and its first Finding there is the subtype named: of 30,000
  // dug puzzles of seed 4242 the position has a Unique Rectangle in 1,025 (types 1, 2, 3 and 4: 452, 95, 146 and 332) and
  // 152 and 321 of 20,000 complete solves use a type 3 and a type 4 step (MS11a evidence). UR_TYPE3 is puzzle 637 (the
  // floors R9C8 and R9C9 {2,3}, the roofs R4C8 {2,3,5,9} and R4C9 {2,3,6}, whose extras 5, 6 and 9 fill the real cells
  // R4C5 {6,9} and R4C6 {5,9} of row 4: R4C1 loses 5 and 6); UR_TYPE4 is puzzle 596 (the floors R3C7 and R3C9 {1,9}, the
  // roofs R6C7 and R6C9, the 1 held only by them in row 6: both lose it). UR_TYPE1 and UR_TYPE2 (puzzles 0 and 152) are
  // the older subtypes at the same position, where they keep their priority. UR_TRIPLE, UR_BOX and UR_COLUMN (puzzles
  // 310, 2140 and 156) are three more real positions for the soundness supplements: a type 3 of three real cells in
  // column 9, a type 3 of three real cells in box 9 and a type 4 in column 4. UR_WWING (puzzle 42) is the neighbour's
  // negative: its position through wxyzWing has a genuine W-Wing and no rectangle.
  var UR_TYPE1 = '2.....7...31...5..7.6..82..3......9....41.......7.2.....8.6..1..4...5........382.';
  var UR_TYPE2 = '.1.......4...2........5.86...5.4.61...75.8...1..2..3..7...8...3..9..62.1...4.....';
  var UR_TYPE3 = '...6.........2.7.8..8.57..9.17...4...........4....38...4.9..17..25.3....8..5.69..';
  var UR_TYPE4 = '9...1.....1..9..4......4.7..49.6.....51..9.683..2.............3..7...59...61.5...';
  var UR_TRIPLE = '....9..1......4.3..12...8..6...27.....3...12.5.....4.......8....9.5.....34....6.8';
  var UR_BOX = '....812....7.........9.734.3...7.4.2..5.6........5..761.9......8....37...2....8..';
  var UR_COLUMN = '...6.9....73....6.29............6.928....5.......1.53.6.27...8991...8.5..8.1....7';
  var UR_WWING = '...9....8.6.....3..7.8..4.......12.3.43.7..5.1...2.6....6.45......2..16.3.8......';
  // MS11b: the hidden form, puzzles 138, 272 and 244 of the same corpus. Of the 5,118 positions that 30,000 dug puzzles
  // leave open below uniqueRectangle, 992 have a hidden form as the first Unique Rectangle deduction (MS11b evidence).
  // UR_HIDDEN is puzzle 138 (the floor R6C9 {4,9}, the target R5C1 {2,4,6,9}: the 9 is held only by R5C1 and R5C9 in row 5
  // and by R5C1 and R6C1 in column 1, so R5C1 loses the 4); UR_HIDDEN_BOX and UR_HIDDEN_ROW (puzzles 272 and 244) are two
  // more real positions for the soundness supplements: the rectangle R1C1, R1C2, R4C1, R4C2 whose upper corners share box 1
  // (the 7 only at R1C1 and R1C2 in row 1 and at R1C1 and R4C1 in column 1: R1C1 loses the 5), and the rectangle R4C6,
  // R4C8, R6C6, R6C8 (the 9 only at R6C8 and R6C6 in row 6 and at R4C8 and R6C8 in column 8: R6C8 loses the 8).
  var UR_HIDDEN = '.1...7.327...9...5.....1..65......7..3...51....87.3.5.8....93.....8.....19.2...6.';
  var UR_HIDDEN_BOX = '..6138....9...58....2.9.7.......4.21...2.1.........3..2.5....489........38.......';
  var UR_HIDDEN_ROW = '5...42.....4.......7..9...84...7.6.5.9......16..13.7....28.4.............1.75.4..';

  // Real unique puzzles of the bugPlusOne fixtures (MS11c), puzzles 14, 1814, 720, 903 and 3456 of the same seeded corpus
  // (seed 4242; the puzzle of index i is the state #4i). They are positions where the registry reaches bugPlusOne
  // (after: BELOW_BUG, every technique before it exhausted): exactly one open cell has three candidates and every other
  // open cell two, and every unit then has each unplaced digit twice once the digit of the answer is left out. Of 30,000
  // dug puzzles of seed 4242 the position has a BUG+1 in 62 (MS11c evidence). BUG_LOW is puzzle 14 (17 open cells; R9C8
  // {2,7,8} is the 2, the lowest of its candidates) and BUG_HIGH puzzle 1814 (21 open cells; R6C7 {3,4,9} is the 9, the
  // highest); BUG_MID, BUG_MID2 and BUG_WIDE (puzzles 720, 903 and 3456) are three more real positions for the soundness
  // supplements: R4C2 {2,4,7} is the 7 (a middle candidate), R8C2 {1,3,5} the 3 and R5C6 {2,6,7} the 2 of a position with
  // 42 open cells. The negatives use real positions of other entries: WX_OPEN, whose position through bugPlusOne has
  // 47 open cells and nothing for it, and UR_TYPE1, whose position below uniqueRectangle holds a Unique Rectangle that
  // keeps its priority.
  var BUG_LOW = '.12843...3.......2...2....7.24.7.........9..8.7...2.3.....1..6...9..64........1.9';
  var BUG_HIGH = '..32.4.6.....5.8..6...93....2......74.........6.1.........4..9....31.2...12..97.3';
  var BUG_MID = '...8.3164.9..26......1..9..........3..8..1.2....289..781.6...5.3.....6.8..4......';
  var BUG_MID2 = '...3..4.8..9.4.1.38...9.7..1..2.....68...5.2....4....1..685.........9..4.7.6...1.';
  var BUG_WIDE = '.51.....7.9.3...6.28....3......5.6.........4....9.1.5..3..2.9.19.86........7...3.';

  // Real unique puzzles of the xyChain fixtures (MS12), puzzles of the same seeded corpus (seed 4242; the puzzle of
  // index i is the state #4i). They are positions where the registry reaches xyChain (after: BELOW_XY, every technique
  // before it exhausted); the shortest restricted chain there has 9 or 11 edges (the shorter chains are the XY-Wings,
  // Remote Pairs and W-Wings that the registry tries first). XY_NINE is puzzle 24 (the digit 8, from R3C7 through R5C4,
  // R7C1, R7C4 to R7C7 in 9 edges: R5C7 loses the 8) and XY_ELEVEN puzzle 186 (the digit 8, from R1C6 through R7C6,
  // R9C1, R9C6, R9C8 to R9C9 in 11 edges: R7C7 and R9C5 lose it). XY_SECOND, XY_THIRD and XY_FOURTH (puzzles 148, 78 and
  // 114) are three more real positions for the soundness supplements.
  var XY_NINE = '.785....2...3...7.3...6.......1.4.5.........1...279.....4....986.....2..2..9..73.';
  var XY_ELEVEN = '.82....15...4..93.....5.....9...5........6.87.2.8416...17.....9..8..4....4.2..1..';
  var XY_SECOND = '2.....7..1......656..1.74...7.3...4...9.....8..6...3.1..38....791..5.....8...1.2.';
  var XY_THIRD = '4.38..5...5.....4.......2.938..17.....65.3....1....9.7.....6......94..5.....2.7.6';
  var XY_FOURTH = '7.39...4....4..8....9.87...5...2......4.79..1.6.....5.62....7.......512..9.......';

  /**
   * Current fixtures that replace a historical entry or belong to an ID registered since (skyscraper, MS08a;
   * twoStringKite, MS08b; emptyRectangle, MS08c; finnedXWing, MS09a; finnedSwordfish, MS09b; remotePairs, MS10a;
   * wxyzWing, MS10b; uniqueRectangle, MS11a and MS11b), in the shape of the
   * entries of the map. The short chain fixtures have at most 4 links, so that they are forcingChain's under C = 4
   * and C = 6 alike. The long ones are the 5- and 6-link shortest proofs of two dug puzzles: forcingChainLong's
   * under the selected C = 4 (MS07c; under C = 6 they would be forcingChain's). The negatives include positions
   * where a shorter ID owns the proof, one of them at the window boundary: a chain of 5 links is not
   * forcingChain's. The uniqueRectangle entry replaces the v2 one (kept in `historyV2`, positions untouched) with one
   * real positive per subtype (types 1 to 4, and the hidden form) at the position where the registry reaches it. The
   * bugPlusOne entry (MS11c) has two real positives, a BUG+1 whose answer is the lowest and one whose answer is the
   * highest candidate of the trivalue cell, and two negatives.
   */
  var CURRENT = {
    alsXz: {
      positive: [
        {
          name: 'alsXz on the 9 and the 7, two almost locked sets, R2C8 loses the 7 (the puzzle of the ' +
            'forcingChain fixture)',
          puzzle: V2_PUZZLE_2,
          after: THROUGH_SHORT_CHAIN,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[16, 7]]
          }
        },
        {
          name: 'alsXz on the 8 and the 2, two almost locked sets, R5C8 and R8C7 lose the 2 (a puzzle of the ' +
            'hidden rectangle fixtures)',
          puzzle: UR_HIDDEN,
          after: THROUGH_SHORT_CHAIN,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[43, 2], [69, 2]]
          }
        }
      ],
      negative: [
        {
          name: 'alsXz has nothing left to do once the techniques through it are exhausted',
          puzzle: PLATINUM,
          after: THROUGH_ALS,
          propagate: true
        },
        {
          name: 'alsXz leaves a chain of 5 links to forcingChainLong (116 almost locked sets, no pair removes ' +
            'anything)',
          puzzle: DUG_24,
          after: THROUGH_SHORT_CHAIN,
          propagate: true
        }
      ]
    },
    sueDeCoq: {
      positive: [
        {
          name: 'sueDeCoq in row 8 and box 8: R8C4 and R8C5 hold 6, 7, 3, 4 and 9 with R8C3 {6,7} in the ' +
            'row and R7C5 and R9C5 {3,4,9} in the box, so R8C2, R8C8 and R8C9 lose the 6 and the 7 (a ' +
            'puzzle of the remotePairs fixtures, first position)',
          puzzle: RP_LONG,
          after: null,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[64, 6], [64, 7], [70, 7], [71, 6], [71, 7]]
          }
        },
        {
          name: 'sueDeCoq in row 4 and box 6 with the digit 3 left over: R4C7, R4C8 and R4C9 hold 2, 7, 1, ' +
            '5 and 3 with R4C1 {2,7} in the row and R6C8 {1,5} in the box, so the 3 is removed elsewhere ' +
            'in both units (a puzzle of the unique rectangle fixtures, first position)',
          puzzle: UR_TYPE4,
          after: null,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[30, 3], [30, 7], [32, 3], [32, 7], [42, 3], [51, 1], [53, 1], [53, 5]]
          }
        }
      ],
      negative: [
        {
          name: 'sueDeCoq has nothing left to do once the techniques through it are exhausted',
          puzzle: PLATINUM,
          after: THROUGH_SDC,
          propagate: true
        },
        {
          name: 'sueDeCoq leaves a chain of 5 links to forcingChainLong (the techniques before it are ' +
            'exhausted, and no crossing holds two almost locked sets)',
          puzzle: DUG_24,
          after: THROUGH_ALS,
          propagate: true
        }
      ]
    },
    xyChain: {
      positive: [
        {
          name: 'xyChain on the 8, a chain of 9 edges R3C7 ... R7C7 of bivalue cells, R5C7 loses the 8 (a seeded dug ' +
            'puzzle)',
          puzzle: XY_NINE,
          after: BELOW_XY,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[42, 8]]
          }
        },
        {
          name: 'xyChain on the 8, a chain of 11 edges R1C6 ... R9C9 of bivalue cells, R7C7 and R9C5 lose the 8 (a ' +
            'second seeded dug puzzle)',
          puzzle: XY_ELEVEN,
          after: BELOW_XY,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[60, 8], [76, 8]]
          }
        }
      ],
      negative: [
        {
          name: 'xyChain has nothing left to do once the techniques through it are exhausted',
          puzzle: WX_OPEN,
          after: THROUGH_XY,
          propagate: true
        },
        {
          name: 'xyChain leaves a chain of unit-conjugate links (a forcing chain of 4 links) to forcingChain',
          puzzle: V2_PUZZLE_2,
          after: BELOW_XY,
          propagate: true
        }
      ]
    },
    bugPlusOne: {
      positive: [
        {
          name: 'bugPlusOne at R9C8 {2,7,8}: every other open cell has two candidates and every unit has each digit ' +
            'twice without the 2, so R9C8 is 2 (a seeded dug puzzle, 17 open cells)',
          puzzle: BUG_LOW,
          after: BELOW_BUG,
          propagate: true,
          expect: {
            placements: [[79, 2]],
            eliminations: []
          }
        },
        {
          name: 'bugPlusOne at R6C7 {3,4,9}, the answer is the highest candidate: R6C7 is 9 (a second seeded dug ' +
            'puzzle, 21 open cells)',
          puzzle: BUG_HIGH,
          after: BELOW_BUG,
          propagate: true,
          expect: {
            placements: [[51, 9]],
            eliminations: []
          }
        }
      ],
      negative: [
        {
          name: 'bugPlusOne has nothing left to do once the techniques through it are exhausted',
          puzzle: WX_OPEN,
          after: THROUGH_BUG,
          propagate: true
        },
        {
          name: 'bugPlusOne leaves a Unique Rectangle (a position with many trivalue cells) to uniqueRectangle',
          puzzle: UR_TYPE1,
          after: BELOW_UR,
          propagate: true
        }
      ]
    },
    uniqueRectangle: {
      positive: [
        {
          name: 'uniqueRectangle type 3 on 2 and 3, the extras 5, 6 and 9 of the roofs R4C8 and R4C9 with R4C5 and R4C6 ' +
            'in row 4, R4C1 loses 5 and 6 (a seeded dug puzzle)',
          puzzle: UR_TYPE3,
          after: BELOW_UR,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[27, 5], [27, 6]]
          }
        },
        {
          name: 'uniqueRectangle type 4 on 1 and 9, the 1 only in the roofs R6C7 and R6C9 of row 6, both lose it ' +
            '(a seeded dug puzzle)',
          puzzle: UR_TYPE4,
          after: BELOW_UR,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[51, 1], [53, 1]]
          }
        },
        {
          name: 'uniqueRectangle type 1 on 5 and 9, R1C2 loses both (a seeded dug puzzle)',
          puzzle: UR_TYPE1,
          after: BELOW_UR,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[1, 5], [1, 9]]
          }
        },
        {
          name: 'uniqueRectangle type 2 on 6 and 8 with the extra 3 in the roofs R1C3 and R2C3, R3C3 loses it ' +
            '(a seeded dug puzzle)',
          puzzle: UR_TYPE2,
          after: BELOW_UR,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[20, 3]]
          }
        },
        {
          name: 'uniqueRectangle hidden form on 4 and 9, the 9 only at R5C1 and R5C9 in row 5 and at R5C1 and R6C1 in ' +
            'column 1 with the floor R6C9, R5C1 loses the 4 (a seeded dug puzzle)',
          puzzle: UR_HIDDEN,
          after: BELOW_UR,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[36, 4]]
          }
        }
      ],
      negative: [
        {
          name: 'uniqueRectangle has nothing left to do once the techniques through it are exhausted',
          puzzle: UR_TYPE3,
          after: THROUGH_UR,
          propagate: true
        },
        {
          name: 'uniqueRectangle leaves a genuine W-Wing (no rectangle) to wWing',
          puzzle: UR_WWING,
          after: THROUGH_WXYZ,
          propagate: true
        }
      ]
    },
    wxyzWing: {
      positive: [
        {
          name: 'wxyzWing on 3, 4, 7 and 9 in R1C2, R1C3, R1C9 and R2C8, only the 4 is not restricted, R2C1 and R2C2 ' +
            'lose it (a seeded dug puzzle)',
          puzzle: WX_FIRST,
          after: BELOW_WXYZ,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[9, 4], [10, 4]]
          }
        },
        {
          name: 'wxyzWing on 1, 4, 7 and 9 in R2C7, R6C7, R8C7 and R8C9, the 4 is held by three cells, R9C7 sees all ' +
            'of them and loses it (a seeded dug puzzle)',
          puzzle: WX_THREE,
          after: BELOW_WXYZ,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[78, 4]]
          }
        }
      ],
      negative: [
        {
          name: 'wxyzWing has nothing left to do once the techniques through it are exhausted',
          puzzle: WX_OPEN,
          after: THROUGH_WXYZ,
          propagate: true
        },
        {
          name: 'wxyzWing leaves a naked quad (four digits that are all restricted) to nakedQuad',
          puzzle: WX_QUAD,
          after: BEFORE_NAKED_QUAD,
          propagate: true
        }
      ]
    },
    remotePairs: {
      positive: [
        {
          name: 'remotePairs on 4 and 6, a chain of three edges R5C2 ... R9C6, R5C6 loses the 4 (a seeded dug puzzle, ' +
            'first position)',
          puzzle: RP_FIRST,
          after: null,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[41, 4]]
          }
        },
        {
          name: 'remotePairs on 6 and 7, a chain of five edges R3C7 ... R7C4, R7C7 loses both (a seeded dug puzzle, ' +
            'first position)',
          puzzle: RP_LONG,
          after: null,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[60, 6], [60, 7]]
          }
        }
      ],
      negative: [
        {
          name: 'remotePairs has nothing left to do once the techniques through it are exhausted',
          puzzle: COLOURING,
          after: THROUGH_RP,
          propagate: true
        },
        {
          name: 'remotePairs leaves a naked pair (two cells of a pair in one unit) to nakedPair',
          puzzle: V2_PUZZLE_1,
          after: BEFORE_NAKED_PAIR,
          propagate: true
        }
      ]
    },
    skyscraper: {
      positive: [
        {
          name: 'skyscraper on digit 1, rows R1 and R8 sharing C2 (constructed-hard-1)',
          puzzle: SKY_ROWS,
          after: BELOW_SKYSCRAPER,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[17, 1], [61, 1], [79, 1]]
          }
        },
        {
          name: 'skyscraper on digit 5, columns C5 and C7 sharing R8 (a seeded dug puzzle)',
          puzzle: SKY_COLS,
          after: BELOW_SKYSCRAPER,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[7, 5]]
          }
        }
      ],
      negative: [
        {
          name: 'skyscraper has nothing left to do once the techniques through it are exhausted',
          puzzle: COLOURING,
          after: THROUGH_SKYSCRAPER,
          propagate: true
        },
        {
          name: 'skyscraper leaves a genuine X-Wing (two shared covers) to xWing',
          puzzle: X_WING,
          after: BEFORE_XWING,
          propagate: true
        }
      ]
    },
    twoStringKite: {
      positive: [
        {
          name: 'twoStringKite on digit 5, row R6 and column C8 bridged in box 6 (a famous puzzle)',
          puzzle: HARD_B,
          after: BELOW_KITE,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[73, 5]]
          }
        },
        {
          name: 'twoStringKite on digit 5, row R9 and column C2 bridged in box 7 (a seeded dug puzzle)',
          puzzle: KITE_SEEDED,
          after: BELOW_KITE,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[34, 5]]
          }
        }
      ],
      negative: [
        {
          name: 'twoStringKite has nothing left to do once the techniques through it are exhausted',
          puzzle: COLOURING,
          after: THROUGH_KITE,
          propagate: true
        },
        {
          name: 'twoStringKite is no row pair and column pair that share a cell (R6C8 holds the 3)',
          puzzle: ESCARGOT,
          after: THROUGH_KITE,
          propagate: true
        },
        {
          name: 'twoStringKite leaves a genuine skyscraper (two rows with a common cover column) to skyscraper',
          puzzle: SKY_ONLY,
          after: BELOW_SKYSCRAPER,
          propagate: true
        }
      ]
    },
    emptyRectangle: {
      positive: [
        {
          name: 'emptyRectangle on digit 5 in box 7, arms R8C2 and R9C3, the pair of row R4 (a constructed puzzle)',
          puzzle: ER_RATED,
          after: BELOW_ER,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[75, 5]]
          }
        },
        {
          name: 'emptyRectangle on digit 6 in box 1, arms R2C3 and R3C1, the pair of column C8 (a seeded dug puzzle)',
          puzzle: ER_SEEDED,
          after: BELOW_ER,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[54, 6]]
          }
        }
      ],
      negative: [
        {
          name: 'emptyRectangle has nothing left to do once the techniques through it are exhausted',
          puzzle: COLOURING,
          after: THROUGH_ER,
          propagate: true
        },
        {
          name: 'emptyRectangle is no rectangle with a candidate at the intersection (R6C6 holds the 1)',
          puzzle: ER_GENERAL,
          after: BELOW_ER,
          propagate: true
        },
        {
          name: 'emptyRectangle leaves a genuine two-string kite to twoStringKite',
          puzzle: KITE_ONLY,
          after: BELOW_KITE,
          propagate: true
        }
      ]
    },
    finnedXWing: {
      positive: [
        {
          name: 'finnedXWing on digit 2, rows R5 and R8 on the covers C1 and C5, the fin R8C6 (a constructed puzzle)',
          puzzle: FIN_RATED,
          after: BELOW_FIN,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[58, 2]]
          }
        },
        {
          name: 'finnedXWing sashimi on digit 5, columns C1 and C7 on the covers R1 and R9, the fins R2C1 and R3C1 ' +
            '(a seeded dug puzzle)',
          puzzle: FIN_SASHIMI,
          after: BELOW_FIN,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[2, 5]]
          }
        }
      ],
      negative: [
        {
          name: 'finnedXWing has nothing left to do once the techniques through it are exhausted',
          puzzle: COLOURING,
          after: THROUGH_FIN,
          propagate: true
        },
        {
          name: 'finnedXWing leaves a genuine ordinary X-Wing (no fin) to xWing',
          puzzle: FIN_ORDINARY,
          after: BEFORE_XWING,
          propagate: true
        },
        {
          name: 'finnedXWing leaves a genuine two-string kite to twoStringKite',
          puzzle: KITE_ONLY,
          after: BELOW_KITE,
          propagate: true
        }
      ]
    },
    finnedSwordfish: {
      positive: [
        {
          name: 'finnedSwordfish on digit 3, rows R2, R5 and R9 on the covers C5, C8 and C9, the fin R5C7 ' +
            '(constructed-nightmare-2)',
          puzzle: ER_RATED,
          after: BELOW_FSF,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[52, 3], [53, 3]]
          }
        },
        {
          name: 'finnedSwordfish on digit 9, rows R1, R2 and R5 on the covers C1, C6 and C9, a single body cell in R1 ' +
            'and the fin R1C4 (a seeded dug puzzle)',
          puzzle: FSF_SPARSE,
          after: BELOW_FSF,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[23, 9]]
          }
        }
      ],
      negative: [
        {
          name: 'finnedSwordfish has nothing left to do once the techniques through it are exhausted',
          puzzle: COLOURING,
          after: THROUGH_FSF,
          propagate: true
        },
        {
          name: 'finnedSwordfish leaves a genuine ordinary Swordfish (no fin) to swordfish',
          puzzle: FSF_ORDINARY,
          after: THROUGH_FIN,
          propagate: true
        },
        {
          name: 'finnedSwordfish leaves a genuine finned X-Wing to finnedXWing',
          puzzle: FIN_SPARE,
          after: BELOW_FIN,
          propagate: true
        }
      ]
    },
    forcingChain: {
      positive: [
        {
          name: 'forcingChain contradiction of 4 links on puzzle 2',
          puzzle: V2_PUZZLE_2,
          after: BELOW_CHAINS,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[12, 7]]
          }
        },
        {
          name: 'forcingChain contradiction of 3 links on the first position of hard-b',
          puzzle: HARD_B,
          after: null,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[29, 2]]
          }
        }
      ],
      negative: [
        {
          name: 'forcingChain has nothing left to do once the techniques through it are exhausted',
          puzzle: V2_PUZZLE_1,
          after: THROUGH_SHORT_CHAIN,
          propagate: true
        },
        {
          name: 'forcingChain leaves a chain of 5 links to forcingChainLong (the window ends at C = 4)',
          puzzle: DUG_24,
          after: THROUGH_SHORT_CHAIN,
          propagate: true
        }
      ]
    },
    forcingChainLong: {
      positive: [
        {
          name: 'forcingChainLong contradiction of 5 links on a dug puzzle',
          puzzle: DUG_24,
          after: THROUGH_SDC,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[14, 3]]
          }
        },
        {
          name: 'forcingChainLong contradiction of 6 links on a dug puzzle',
          puzzle: DUG_730,
          after: THROUGH_SDC,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[77, 9]]
          }
        }
      ],
      negative: [
        {
          name: 'forcingChainLong finds nothing on the stuck position of hard-platinum (no chain at all)',
          puzzle: PLATINUM,
          after: THROUGH_SDC,
          propagate: true
        },
        {
          name: 'forcingChainLong leaves a chain of 4 links to forcingChain (the shortest proof is not its own)',
          puzzle: V2_PUZZLE_2,
          after: BELOW_CHAINS,
          propagate: true
        }
      ]
    },
    nishio: {
      positive: [
        {
          name: 'nishio depth 1 on puzzle 1',
          puzzle: V2_PUZZLE_1,
          after: THROUGH_LONG_CHAIN,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[4, 7]]
          }
        },
        {
          name: 'nishio depth 1 on puzzle 2',
          puzzle: V2_PUZZLE_2,
          after: THROUGH_LONG_CHAIN,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[6, 4]]
          }
        }
      ],
      negative: [
        {
          name: 'nishio finds nothing on a board where every candidate is still possible (the empty board)',
          puzzle: '.................................................................................',
          after: null,
          propagate: false
        },
        {
          name: 'nishio leaves the refutation of hard-platinum, which needs a guess inside a guess, to nishioDeep',
          puzzle: PLATINUM,
          after: THROUGH_LONG_CHAIN,
          propagate: true
        }
      ]
    },
    nishioDeep: {
      positive: [
        {
          name: 'nishioDeep depth 2 on hard-platinum',
          puzzle: PLATINUM,
          after: THROUGH_NISHIO,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[23, 8]]
          }
        },
        {
          name: 'nishioDeep depth 2 on the 2012 puzzle',
          puzzle: WORLDS_HARDEST,
          after: THROUGH_NISHIO,
          propagate: true,
          expect: {
            placements: [],
            eliminations: [[21, 3]]
          }
        }
      ],
      negative: [
        // ESCARGOT until MS09b: with finnedSwordfish before it, its position through forcingChainLong has no
        // depth 1 refutation left (nishioDeep finds depth 2 there), so the first v2 puzzle, whose position has one
        // and whose nishioDeep finds nothing, is the first qualifying puzzle of a scan of the listed ones.
        {
          name: 'nishioDeep leaves the depth 1 refutation of the first v2 puzzle to nishio (the shortest proof is ' +
            'not its own)',
          puzzle: V2_PUZZLE_1,
          after: THROUGH_LONG_CHAIN,
          propagate: true
        }
      ]
    }
  };

  /**
   * Supplemental soundness positions per technique id (rating v3, MS07a). The sweep of techniques.test.js always
   * runs the complete seeded random population of its call site first (120 states for the chain group, 300 for
   * the others, seed 20260101, minFirings 3) and these positions after it, so that a rare pattern gets real
   * positions without weakening or replacing the random ones. An entry is a list of positions in the shape of
   * the positive fixtures above ({ name, puzzle, after, propagate }): a real puzzle with exactly one solution,
   * and an explicit `after` array of registered ids (or null), never the `before(id)` / `through(id)` of an id
   * that is not in LADDER. MS07b (measured at C = 6): the random population never reaches a chain of 7 or more
   * links nor a guess inside a guess (0 firings in 120 states), so the two new chain IDs get three real
   * positions each. The dug puzzles are the stuck positions of forcingChain under the selected C = 4: the
   * shortest chains of the first two have 5 and 6 links (MS13c: the second is #730 now, as #379 is solved by the
   * grouped forcingChain; 7 and 8 links once forcingChain had exhausted every chain of up to 6 links, as the
   * long-chain list of tech-chain.test.js has them). MS08a: skyscraper is not rare (65 firings in the 300
   * random states), so its three real
   * positions, the two positive fixtures and 'constructed-hard-3', only add deterministic states on top of the
   * unchanged random population and its minimum of 3 firings. MS08b: twoStringKite is not rare either (114
   * firings in the 300 random states), so its three real positions, the two positive fixtures and a third
   * puzzle, are added on top in the same way. MS08c: emptyRectangle fires in about half of the random states
   * (144 firings in the 300 of the sweep), so its three real positions are added on top in the same way. MS09a:
   * finnedXWing fires in more than half of them, so its three real positions (two positives and a spare) are added
   * on top in the same way. MS09b: finnedSwordfish fires in nearly all of them (281 of the 300), and its three real
   * positions are added on top in the same way. MS10a: remotePairs is rare (6 firings in the 300 random states,
   * against the minimum of 3), so its three real positions, all first positions, are added on top, and its fixtures
   * are explicit first positions too. MS10b: wxyzWing is not rare (375 firings in the 300 random states), so its three
   * real positions, at the position where the registry reaches it, are added on top in the same way. MS11a:
   * uniqueRectangle fires in the random states (24 firings in the 300 of the sweep, 8 of them type 3 and 7 type 4), so
   * its three real positions, a type 3 of three real cells in a column, one in a box and a type 4 in a column, are added
   * on top in the same way. MS11b: the hidden form fires often in the random states, so two more real positions of it
   * (a rectangle whose upper corners share a box, and the target R6C8) are added on top in the same way. MS11c:
   * bugPlusOne is rare (62 of 30,000 dug puzzles have it at the position where the registry reaches it, and the 300
   * random states of the sweep give it no firing at all), so its three real positions, all at that position, give the
   * sweep its minimum of 3 firings on top of the unchanged random population (an exact fit: one supplement fewer would
   * fail the minimum, which stays as it is): the answer is a middle candidate in two of them and the lowest in a
   * position with 42 open cells. MS16: sueDeCoq fires in some of the random states of the sweep and is hardly
   * ever the first deduction of a real position (every position of the agreement populations of the tech-als
   * suite where it fires has an ALS-XZ deduction too), so its four real positions, all first positions, are
   * added on top in the same way.
   */
  var SUPPLEMENTS = {
    alsXz: [
      { name: 'alsXz on a real position (the open puzzle of the wxyzWing fixtures)',
        puzzle: WX_OPEN, after: THROUGH_SHORT_CHAIN, propagate: true },
      { name: 'alsXz on a real position (a puzzle of the emptyRectangle fixtures)',
        puzzle: ER_RATED, after: THROUGH_SHORT_CHAIN, propagate: true },
      { name: 'alsXz on a real position (a third seeded dug puzzle of the xyChain fixtures)',
        puzzle: XY_THIRD, after: THROUGH_SHORT_CHAIN, propagate: true },
      { name: 'alsXz on a real position (a puzzle of the unique rectangle fixtures)',
        puzzle: UR_COLUMN, after: THROUGH_SHORT_CHAIN, propagate: true }
    ],
    sueDeCoq: [
      { name: 'sueDeCoq on a real position (the second puzzle of the wxyzWing fixtures, first position, ' +
        'singles still open)', puzzle: WX_SECOND, after: null, propagate: false },
      { name: 'sueDeCoq on a real position (the sparse puzzle of the finnedSwordfish fixtures, first ' +
        'position)', puzzle: FSF_SPARSE, after: null, propagate: true },
      { name: 'sueDeCoq on a real position (the source of the hiddenPair help example, singles still ' +
        'open): a B side of two cells, one digit left over', puzzle: SDC_HELP_PAIR, after: null,
        propagate: false },
      { name: 'sueDeCoq on a real position (the source of the nakedQuad help example, singles still ' +
        'open)', puzzle: SDC_HELP_QUAD, after: null, propagate: false }
    ],
    xyChain: [
      { name: 'xyChain on the 8, a chain of 9 edges (a third seeded dug puzzle)', puzzle: XY_THIRD,
        after: BELOW_XY, propagate: true },
      { name: 'xyChain on the 5, a chain of 11 edges (a fourth seeded dug puzzle)', puzzle: XY_SECOND,
        after: BELOW_XY, propagate: true },
      { name: 'xyChain on the 3, a chain of 9 edges (a fifth seeded dug puzzle)', puzzle: XY_FOURTH,
        after: BELOW_XY, propagate: true }
    ],
    bugPlusOne: [
      { name: 'bugPlusOne at R4C2 {2,4,7}, a middle candidate (a third seeded dug puzzle)',
        puzzle: BUG_MID, after: BELOW_BUG, propagate: true },
      { name: 'bugPlusOne at R8C2 {1,3,5}, a middle candidate (a fourth seeded dug puzzle)',
        puzzle: BUG_MID2, after: BELOW_BUG, propagate: true },
      { name: 'bugPlusOne at R5C6 {2,6,7} with 42 open cells (a fifth seeded dug puzzle)',
        puzzle: BUG_WIDE, after: BELOW_BUG, propagate: true }
    ],
    uniqueRectangle: [
      { name: 'uniqueRectangle type 3 of three real cells in column 9 (a seeded dug puzzle)',
        puzzle: UR_TRIPLE, after: BELOW_UR, propagate: true },
      { name: 'uniqueRectangle type 3 of three real cells in box 9 (a second seeded dug puzzle)',
        puzzle: UR_BOX, after: BELOW_UR, propagate: true },
      { name: 'uniqueRectangle type 4 in column 4 (a third seeded dug puzzle)',
        puzzle: UR_COLUMN, after: BELOW_UR, propagate: true },
      { name: 'uniqueRectangle hidden form in a rectangle whose upper corners share box 1 (a fourth seeded dug puzzle)',
        puzzle: UR_HIDDEN_BOX, after: BELOW_UR, propagate: true },
      { name: 'uniqueRectangle hidden form with the target R6C8 (a fifth seeded dug puzzle)',
        puzzle: UR_HIDDEN_ROW, after: BELOW_UR, propagate: true }
    ],
    wxyzWing: [
      { name: 'wxyzWing on 1, 4, 5 and 7 in R1C2, R1C6, R1C8 and R7C8 (a seeded dug puzzle)',
        puzzle: WX_SECOND, after: BELOW_WXYZ, propagate: true },
      { name: 'wxyzWing on 1, 2, 5 and 7, the 7 held by three cells (a second seeded dug puzzle)',
        puzzle: WX_THIRD, after: BELOW_WXYZ, propagate: true },
      { name: 'wxyzWing on 3, 5, 6 and 8 in R1C7, R4C7, R5C8 and R5C9, three eliminations (a third seeded dug puzzle)',
        puzzle: WX_FOURTH, after: BELOW_WXYZ, propagate: true }
    ],
    remotePairs: [
      { name: 'remotePairs on 5 and 6, a chain of five edges (a seeded dug puzzle, first position)',
        puzzle: RP_SECOND, after: null, propagate: true },
      { name: 'remotePairs on 2 and 5, a chain of three edges (a second seeded dug puzzle, first position)',
        puzzle: RP_THIRD, after: null, propagate: true },
      { name: 'remotePairs on 6 and 9, a chain of three edges (a third seeded dug puzzle, first position)',
        puzzle: RP_FOURTH, after: null, propagate: true }
    ],
    skyscraper: [
      { name: 'skyscraper on rows (constructed-hard-1)', puzzle: SKY_ROWS, after: BELOW_SKYSCRAPER,
        propagate: true },
      { name: 'skyscraper on columns (a seeded dug puzzle)', puzzle: SKY_COLS, after: BELOW_SKYSCRAPER,
        propagate: true },
      { name: 'skyscraper on rows (constructed-hard-3)', puzzle: SKY_SPARE, after: BELOW_SKYSCRAPER,
        propagate: true }
    ],
    twoStringKite: [
      { name: 'twoStringKite bridged in box 6 (a famous puzzle)', puzzle: HARD_B, after: BELOW_KITE,
        propagate: true },
      { name: 'twoStringKite bridged in box 7 (a seeded dug puzzle)', puzzle: KITE_SEEDED, after: BELOW_KITE,
        propagate: true },
      { name: 'twoStringKite on digit 1 (a second seeded dug puzzle)', puzzle: KITE_SPARE, after: BELOW_KITE,
        propagate: true }
    ],
    emptyRectangle: [
      { name: 'emptyRectangle on digit 5 in box 7 (a constructed puzzle)', puzzle: ER_RATED, after: BELOW_ER,
        propagate: true },
      { name: 'emptyRectangle on digit 6 in box 1 (a seeded dug puzzle)', puzzle: ER_SEEDED, after: BELOW_ER,
        propagate: true },
      { name: 'emptyRectangle on digit 1 in box 8 (a second seeded dug puzzle)', puzzle: ER_SPARE, after: BELOW_ER,
        propagate: true }
    ],
    finnedXWing: [
      { name: 'finnedXWing on rows with one fin (a constructed puzzle)', puzzle: FIN_RATED, after: BELOW_FIN,
        propagate: true },
      { name: 'finnedXWing sashimi on columns with two fins (a seeded dug puzzle)', puzzle: FIN_SASHIMI,
        after: BELOW_FIN, propagate: true },
      { name: 'finnedXWing on rows with two fins (a second seeded dug puzzle)', puzzle: FIN_SPARE, after: BELOW_FIN,
        propagate: true }
    ],
    finnedSwordfish: [
      { name: 'finnedSwordfish on rows with one fin (constructed-nightmare-2)', puzzle: ER_RATED, after: BELOW_FSF,
        propagate: true },
      { name: 'finnedSwordfish on rows with a single body cell (a seeded dug puzzle)', puzzle: FSF_SPARSE,
        after: BELOW_FSF, propagate: true },
      { name: 'finnedSwordfish on columns (a second seeded dug puzzle)', puzzle: FSF_SPARE, after: BELOW_FSF,
        propagate: true }
    ],
    forcingChainLong: [
      { name: 'a long chain of 5 links (dug puzzle)', puzzle: DUG_24, after: THROUGH_SDC, propagate: true },
      { name: 'a long chain of 6 links (dug puzzle)', puzzle: DUG_730, after: THROUGH_SDC, propagate: true },
      { name: 'a second long chain (dug puzzle)', puzzle: DUG_155, after: THROUGH_SDC, propagate: true }
    ],
    nishioDeep: [
      { name: 'depth 2 on hard-platinum', puzzle: PLATINUM, after: THROUGH_NISHIO, propagate: true },
      { name: 'depth 2 on the 2012 puzzle', puzzle: WORLDS_HARDEST, after: THROUGH_NISHIO, propagate: true },
      { name: 'depth 2 on golden nugget', puzzle: NUGGET, after: THROUGH_NISHIO, propagate: true }
    ]
  };

  var BY_ID = Object.assign({}, HISTORY_BY_ID, CURRENT);

  SG.fixtures.techniques = {
    ids: Object.keys(BY_ID),
    byId: BY_ID,
    historyV2: { ladder: LADDER, byId: HISTORY_BY_ID },
    registryOrder: REGISTRY_ORDER,
    nothingToFind: NOTHING_TO_FIND,
    supplements: SUPPLEMENTS,
    ladder: LADDER
  };
})();
