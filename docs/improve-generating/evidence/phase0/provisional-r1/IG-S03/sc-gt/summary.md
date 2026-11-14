# IG-S03 / sc-gt (provisional-r1, a1)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**.
Command status: **complete** (exit 0). Estimate verdict: provisional; judged in the task summary against IG-S02's matched baselines.

## Coverage

| planned | completed | censored | errors | unstarted | coverage complete |
|---|---|---|---|---|---|
| 3 | 3 | 0 | 0 | 0 | true |

Exclusions: the baselines are IG-S02's records (not rerun here); audited wall time is not a speed measurement; the unmeasured catalogue probe and the independent audit are outside every generation time; a censored or unverified arm proves neither identity nor speed

## Sources

| item | value |
|---|---|
| runtime label (supplied) | 1c042ad (label supplied by the pack; runtime f7be90f, unchanged by ef8a9cc) |
| runtime fingerprint | 36b2b8327f348fc6fc39471f34608c6679b9f3fc34e48178563cc4424173b50a |
| runtime files | 63 |
| harness fingerprint | baeb9ea2c1ae6477e2b9a83efc57d73975a204b450b95f7b80e76f1706a20944 |
| adapters | attempt-pool, scoped-solver |
| sources stable | true |
| firewall clean | true |

CPU: process.cpuUsage (user+system of the host process, worker threads included; read once at the host); observed quantum 16 ms. A value below the quantum is unresolved and gives no rate or factor.

## Paired rows (before = reference, after = prototype)

| pair | ref ready ms | ref cold ms | ref cpu ms | proto ready ms | proto cold ms | proto cpu ms | cpu factor | ready factor | cold factor |
|---|---|---|---|---|---|---|---|---|---|
| greaterThan:nightmare:1 | n/a | n/a | n/a | 1119.206 | 1245.201 | 6859 | n/a | n/a | n/a |
| greaterThan:nightmare:2 | n/a | n/a | n/a | 7115.565 | 7231.606 | 35610 | n/a | n/a | n/a |
| greaterThan:nightmare:3 | n/a | n/a | n/a | 4724.265 | 4848.598 | 26781 | n/a | n/a | n/a |

## Arm: prototype

| metric | n | p50 | p95 | max | upper median |
|---|---|---|---|---|---|
| ready wall ms | 3 | 4724.265 | 7115.565 | 7115.565 | 4724.265 |
| cold wall ms | 3 | 4848.598 | 7231.606 | 7231.606 | 4848.598 |
| cpu total ms | 3 | 26781 | 35610 | 35610 | 26781 |

Requests 3, complete 3, censored 0, errors 0, validation unknown 0, unstarted 0. Verified hits 3; per CPU second 0.043 (all spent CPU 69250 ms, resolved); per cold wall second 0.220 (all spent wall 13629.463 ms). With few requests p95 is the observed maximum.

Spent generation work behind the rates (completed, censored, error and validation-unknown requests all count):

| category | requests | cpu ms | wall ms (cold + cleanup) |
|---|---|---|---|
| complete | 3 | 69250 | 13629.463 |
| censored | 0 | 0 | 0 |
| errors | 0 | 0 | 0 |
| validationUnknown | 0 | 0 | 0 |
| total | 3 | 69250 | 13629.463 |

## Task details

```json
{
  "arms": {
    "prototype": "S3 prototype (scoped negative scans of singles and subsets) with the harness paths of IG-S02",
    "audit": "three engine instances: plain native, native with audit annotations, scoped with audit annotations"
  },
  "identity": {
    "pairs": [
      {
        "pairId": "IG-S03/sc-gt/greaterThan:nightmare:1/scoped-attempts-w4",
        "baselineKey": "IG-S02/gt/greaterThan:nightmare:1/native-w1",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "puzzleHash": "43209b9cdb1435d74a599787b90ba8a51b69dff73bc7872f6a86a72e054959d9",
        "baselinePuzzleHash": "43209b9cdb1435d74a599787b90ba8a51b69dff73bc7872f6a86a72e054959d9",
        "scopedDigest": "a21aef370b17a6c4a37629be101c95086beb1f86587533360553331eb6a3a1d9",
        "baselineDigest": "a21aef370b17a6c4a37629be101c95086beb1f86587533360553331eb6a3a1d9"
      },
      {
        "pairId": "IG-S03/sc-gt/greaterThan:nightmare:2/scoped-attempts-w4",
        "baselineKey": "IG-S02/gt/greaterThan:nightmare:2/native-w1",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "puzzleHash": "eef4d6bf7ecd527e0ce83f9fdc21f378fddc394ccf7a6e88c1ac56927aafe0ae",
        "baselinePuzzleHash": "eef4d6bf7ecd527e0ce83f9fdc21f378fddc394ccf7a6e88c1ac56927aafe0ae",
        "scopedDigest": "176853e01327994cde504323ace124788f7260cdfb739f31d580fba9c547c6f3",
        "baselineDigest": "176853e01327994cde504323ace124788f7260cdfb739f31d580fba9c547c6f3"
      },
      {
        "pairId": "IG-S03/sc-gt/greaterThan:nightmare:3/scoped-attempts-w4",
        "baselineKey": "IG-S02/gt/greaterThan:nightmare:3/native-w1",
        "verdict": "identity-ok",
        "problems": [],
        "differing": [],
        "puzzleHash": "cab90de52117228a5b8d93f65313701c5820a06b033ba596f32cbb19c2ecb46d",
        "baselinePuzzleHash": "cab90de52117228a5b8d93f65313701c5820a06b033ba596f32cbb19c2ecb46d",
        "scopedDigest": "a75550bfe613914f81487b35f446a774b22899c6b09953870d5c25fe661b45e9",
        "baselineDigest": "a75550bfe613914f81487b35f446a774b22899c6b09953870d5c25fe661b45e9"
      }
    ],
    "failed": 0,
    "ok": 3,
    "notComparable": 0,
    "deferred": 0,
    "complete": true
  },
  "scoped": [
    {
      "key": "IG-S03/sc-gt/greaterThan:nightmare:1/scoped-attempts-w4",
      "stats": {
        "messages": 2,
        "solve": {
          "solvesBegun": 960,
          "stepsApplied": 99415,
          "cellsInvalidated": 1316811,
          "unitsInvalidated": 1502997,
          "applyCalls": 0
        },
        "finders": {
          "nakedSingle": {
            "calls": 99418,
            "scopesVisited": 6387000,
            "realScopes": 1116086,
            "negativeRecorded": 1074183,
            "positiveScopes": 41903,
            "skippedScopes": 5270914,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleBox": {
            "calls": 57515,
            "scopesVisited": 460258,
            "realScopes": 150547,
            "negativeRecorded": 136304,
            "positiveScopes": 14243,
            "skippedScopes": 309711,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleLine": {
            "calls": 43272,
            "scopesVisited": 742915,
            "realScopes": 280960,
            "negativeRecorded": 277602,
            "positiveScopes": 3358,
            "skippedScopes": 461955,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "nakedPair": {
            "calls": 3932,
            "scopesVisited": 100738,
            "realScopes": 42162,
            "negativeRecorded": 41842,
            "positiveScopes": 320,
            "skippedScopes": 58576,
            "enumNodesReal": 85393,
            "enumNodesSkipped": 132960,
            "realEntryChecks": 42162,
            "virtualEntryChecks": 58576,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenPair": {
            "calls": 3612,
            "scopesVisited": 94818,
            "realScopes": 40113,
            "negativeRecorded": 39955,
            "positiveScopes": 158,
            "skippedScopes": 54705,
            "enumNodesReal": 104452,
            "enumNodesSkipped": 147872,
            "realEntryChecks": 40113,
            "virtualEntryChecks": 54705,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "nakedTriple": {
            "calls": 3454,
            "scopesVisited": 92326,
            "realScopes": 39053,
            "negativeRecorded": 38985,
            "positiveScopes": 68,
            "skippedScopes": 53273,
            "enumNodesReal": 169013,
            "enumNodesSkipped": 223251,
            "realEntryChecks": 39053,
            "virtualEntryChecks": 53273,
            "realNodeChecks": 50,
            "virtualNodeChecks": 25,
            "nativeFallbackCalls": 0
          },
          "hiddenTriple": {
            "calls": 3166,
            "scopesVisited": 85216,
            "realScopes": 37111,
            "negativeRecorded": 37089,
            "positiveScopes": 22,
            "skippedScopes": 48105,
            "enumNodesReal": 168735,
            "enumNodesSkipped": 216813,
            "realEntryChecks": 37111,
            "virtualEntryChecks": 48105,
            "realNodeChecks": 21,
            "virtualNodeChecks": 24,
            "nativeFallbackCalls": 0
          },
          "nakedQuad": {
            "calls": 3144,
            "scopesVisited": 84848,
            "realScopes": 37010,
            "negativeRecorded": 37006,
            "positiveScopes": 4,
            "skippedScopes": 47838,
            "enumNodesReal": 240644,
            "enumNodesSkipped": 283508,
            "realEntryChecks": 37010,
            "virtualEntryChecks": 47838,
            "realNodeChecks": 94,
            "virtualNodeChecks": 146,
            "nativeFallbackCalls": 0
          },
          "hiddenQuad": {
            "calls": 3140,
            "scopesVisited": 84780,
            "realScopes": 36942,
            "negativeRecorded": 36942,
            "positiveScopes": 0,
            "skippedScopes": 47838,
            "enumNodesReal": 194076,
            "enumNodesSkipped": 227238,
            "realEntryChecks": 36942,
            "virtualEntryChecks": 47838,
            "realNodeChecks": 40,
            "virtualNodeChecks": 78,
            "nativeFallbackCalls": 0
          }
        },
        "fallbackReasons": {},
        "violations": 0
      },
      "note": "summed over the pipeline runs that finished in the pool workers (consumed and speculative completed attempts); an attempt terminated before its end reports none"
    },
    {
      "key": "IG-S03/sc-gt/greaterThan:nightmare:2/scoped-attempts-w4",
      "stats": {
        "messages": 7,
        "solve": {
          "solvesBegun": 7718,
          "stepsApplied": 762226,
          "cellsInvalidated": 10433210,
          "unitsInvalidated": 11867888,
          "applyCalls": 0
        },
        "finders": {
          "nakedSingle": {
            "calls": 762281,
            "scopesVisited": 48254473,
            "realScopes": 8896215,
            "negativeRecorded": 8555240,
            "positiveScopes": 340975,
            "skippedScopes": 39358258,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleBox": {
            "calls": 421306,
            "scopesVisited": 3347823,
            "realScopes": 1165305,
            "negativeRecorded": 1057409,
            "positiveScopes": 107896,
            "skippedScopes": 2182518,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleLine": {
            "calls": 313410,
            "scopesVisited": 5395598,
            "realScopes": 2206520,
            "negativeRecorded": 2182057,
            "positiveScopes": 24463,
            "skippedScopes": 3189078,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "nakedPair": {
            "calls": 28439,
            "scopesVisited": 721059,
            "realScopes": 302322,
            "negativeRecorded": 299469,
            "positiveScopes": 2853,
            "skippedScopes": 418737,
            "enumNodesReal": 668533,
            "enumNodesSkipped": 933303,
            "realEntryChecks": 302322,
            "virtualEntryChecks": 418737,
            "realNodeChecks": 11,
            "virtualNodeChecks": 10,
            "nativeFallbackCalls": 0
          },
          "hiddenPair": {
            "calls": 25586,
            "scopesVisited": 664717,
            "realScopes": 280706,
            "negativeRecorded": 279069,
            "positiveScopes": 1637,
            "skippedScopes": 384011,
            "enumNodesReal": 715313,
            "enumNodesSkipped": 954533,
            "realEntryChecks": 280706,
            "virtualEntryChecks": 384011,
            "realNodeChecks": 3,
            "virtualNodeChecks": 15,
            "nativeFallbackCalls": 0
          },
          "nakedTriple": {
            "calls": 23949,
            "scopesVisited": 639675,
            "realScopes": 270338,
            "negativeRecorded": 269842,
            "positiveScopes": 496,
            "skippedScopes": 369337,
            "enumNodesReal": 1268519,
            "enumNodesSkipped": 1616904,
            "realEntryChecks": 270338,
            "virtualEntryChecks": 369337,
            "realNodeChecks": 151,
            "virtualNodeChecks": 400,
            "nativeFallbackCalls": 0
          },
          "hiddenTriple": {
            "calls": 21715,
            "scopesVisited": 583798,
            "realScopes": 254689,
            "negativeRecorded": 254459,
            "positiveScopes": 230,
            "skippedScopes": 329109,
            "enumNodesReal": 1203701,
            "enumNodesSkipped": 1493234,
            "realEntryChecks": 254689,
            "virtualEntryChecks": 329109,
            "realNodeChecks": 179,
            "virtualNodeChecks": 384,
            "nativeFallbackCalls": 0
          },
          "nakedQuad": {
            "calls": 21485,
            "scopesVisited": 579645,
            "realScopes": 253322,
            "negativeRecorded": 253279,
            "positiveScopes": 43,
            "skippedScopes": 326323,
            "enumNodesReal": 1764684,
            "enumNodesSkipped": 2089029,
            "realEntryChecks": 253322,
            "virtualEntryChecks": 326323,
            "realNodeChecks": 1083,
            "virtualNodeChecks": 2025,
            "nativeFallbackCalls": 0
          },
          "hiddenQuad": {
            "calls": 21442,
            "scopesVisited": 578934,
            "realScopes": 253059,
            "negativeRecorded": 253059,
            "positiveScopes": 0,
            "skippedScopes": 325875,
            "enumNodesReal": 1629535,
            "enumNodesSkipped": 1968554,
            "realEntryChecks": 253059,
            "virtualEntryChecks": 325875,
            "realNodeChecks": 833,
            "virtualNodeChecks": 1753,
            "nativeFallbackCalls": 0
          }
        },
        "fallbackReasons": {},
        "violations": 0
      },
      "note": "summed over the pipeline runs that finished in the pool workers (consumed and speculative completed attempts); an attempt terminated before its end reports none"
    },
    {
      "key": "IG-S03/sc-gt/greaterThan:nightmare:3/scoped-attempts-w4",
      "stats": {
        "messages": 5,
        "solve": {
          "solvesBegun": 5224,
          "stepsApplied": 520538,
          "cellsInvalidated": 7102365,
          "unitsInvalidated": 8081891,
          "applyCalls": 0
        },
        "finders": {
          "nakedSingle": {
            "calls": 520567,
            "scopesVisited": 33097752,
            "realScopes": 6064946,
            "negativeRecorded": 5834893,
            "positiveScopes": 230053,
            "skippedScopes": 27032806,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleBox": {
            "calls": 290514,
            "scopesVisited": 2306919,
            "realScopes": 801873,
            "negativeRecorded": 726951,
            "positiveScopes": 74922,
            "skippedScopes": 1505046,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "hiddenSingleLine": {
            "calls": 215592,
            "scopesVisited": 3707756,
            "realScopes": 1514334,
            "negativeRecorded": 1497226,
            "positiveScopes": 17108,
            "skippedScopes": 2193422,
            "enumNodesReal": 0,
            "enumNodesSkipped": 0,
            "realEntryChecks": 0,
            "virtualEntryChecks": 0,
            "realNodeChecks": 0,
            "virtualNodeChecks": 0,
            "nativeFallbackCalls": 0
          },
          "nakedPair": {
            "calls": 20752,
            "scopesVisited": 530949,
            "realScopes": 214519,
            "negativeRecorded": 212553,
            "positiveScopes": 1966,
            "skippedScopes": 316430,
            "enumNodesReal": 440519,
            "enumNodesSkipped": 639811,
            "realEntryChecks": 214519,
            "virtualEntryChecks": 316430,
            "realNodeChecks": 1,
            "virtualNodeChecks": 24,
            "nativeFallbackCalls": 0
          },
          "hiddenPair": {
            "calls": 18786,
            "scopesVisited": 488927,
            "realScopes": 198889,
            "negativeRecorded": 197790,
            "positiveScopes": 1099,
            "skippedScopes": 290038,
            "enumNodesReal": 474566,
            "enumNodesSkipped": 654890,
            "realEntryChecks": 198889,
            "virtualEntryChecks": 290038,
            "realNodeChecks": 18,
            "virtualNodeChecks": 5,
            "nativeFallbackCalls": 0
          },
          "nakedTriple": {
            "calls": 17687,
            "scopesVisited": 474023,
            "realScopes": 193592,
            "negativeRecorded": 193312,
            "positiveScopes": 280,
            "skippedScopes": 280431,
            "enumNodesReal": 823064,
            "enumNodesSkipped": 1080442,
            "realEntryChecks": 193592,
            "virtualEntryChecks": 280431,
            "realNodeChecks": 76,
            "virtualNodeChecks": 109,
            "nativeFallbackCalls": 0
          },
          "hiddenTriple": {
            "calls": 16113,
            "scopesVisited": 433326,
            "realScopes": 184134,
            "negativeRecorded": 184023,
            "positiveScopes": 111,
            "skippedScopes": 249192,
            "enumNodesReal": 810456,
            "enumNodesSkipped": 1021365,
            "realEntryChecks": 184134,
            "virtualEntryChecks": 249192,
            "realNodeChecks": 69,
            "virtualNodeChecks": 187,
            "nativeFallbackCalls": 0
          },
          "nakedQuad": {
            "calls": 16002,
            "scopesVisited": 431984,
            "realScopes": 183523,
            "negativeRecorded": 183517,
            "positiveScopes": 6,
            "skippedScopes": 248461,
            "enumNodesReal": 1132019,
            "enumNodesSkipped": 1351388,
            "realEntryChecks": 183523,
            "virtualEntryChecks": 248461,
            "realNodeChecks": 388,
            "virtualNodeChecks": 871,
            "nativeFallbackCalls": 0
          },
          "hiddenQuad": {
            "calls": 15996,
            "scopesVisited": 431892,
            "realScopes": 183496,
            "negativeRecorded": 183496,
            "positiveScopes": 0,
            "skippedScopes": 248396,
            "enumNodesReal": 1034136,
            "enumNodesSkipped": 1257623,
            "realEntryChecks": 183496,
            "virtualEntryChecks": 248396,
            "realNodeChecks": 280,
            "virtualNodeChecks": 706,
            "nativeFallbackCalls": 0
          }
        },
        "fallbackReasons": {},
        "violations": 0
      },
      "note": "summed over the pipeline runs that finished in the pool workers (consumed and speculative completed attempts); an attempt terminated before its end reports none"
    }
  ],
  "audits": [],
  "catalogueProbe": {
    "wallMs": 107.37689999999998,
    "cpuMs": 110,
    "note": "unmeasured: loads the engine once per command so no arm carries the catalogue discovery"
  },
  "chain": {
    "attempts": [
      "a1"
    ],
    "resumed": false,
    "startedBefore": [],
    "startedHere": [
      "IG-S03/sc-gt/greaterThan:nightmare:1/scoped-attempts-w4",
      "IG-S03/sc-gt/greaterThan:nightmare:2/scoped-attempts-w4",
      "IG-S03/sc-gt/greaterThan:nightmare:3/scoped-attempts-w4"
    ],
    "rerunKeys": [],
    "noRerun": true,
    "unstartedAfter": []
  }
}
```
