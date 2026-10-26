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
 * a technique registered later must not silently change these positions.
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

  /** The techniques the ladder tries before `id`: the position after them is where `id` is reached. */
  function before(id) {
    return LADDER.slice(0, LADDER.indexOf(id));
  }

  /** The techniques up to and including `id`: nothing is left for `id` to do after them. */
  function through(id) {
    return LADDER.slice(0, LADDER.indexOf(id) + 1);
  }

  var BY_ID = {
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

  SG.fixtures.techniques = {
    ids: Object.keys(BY_ID),
    byId: BY_ID,
    nothingToFind: NOTHING_TO_FIND,
    ladder: LADDER
  };
})();
